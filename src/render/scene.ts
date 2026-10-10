import { Container } from "pixi.js";
import { HERO_HEIGHT } from "../sim/rig/skeleton";
import type { Point, Rect } from "../sim/types";
import type { RenderApp } from "./app";

export type LayerName = "sky" | "far" | "mid" | "play" | "light" | "fx" | "fore" | "post";
export const LAYER_ORDER: LayerName[] = ["sky", "far", "mid", "play", "light", "fx", "fore", "post"];
/** How far each plane scrolls per world px of camera travel; 0 is screen space. */
export const PARALLAX: Record<LayerName, number> = {
  sky: 0,
  far: 0.25,
  mid: 0.55,
  play: 1,
  light: 1,
  fx: 1,
  fore: 1.35,
  post: 0,
};

/** Hammer's height as a fraction of the screen, on any landscape aspect. */
export const HERO_SCREEN_FRACTION = 0.315;
/** A phone in portrait shows the world smaller (spec §5.2). */
export const PORTRAIT_ZOOM = 0.75;
/** The look-ahead never pushes him past this fraction of the half-width. */
const LOOK_AHEAD_MAX_FRACTION = 0.35;
const SPRING_X = 7;
const SPRING_Y = 5;
const SPRING_Y_FALLING = 12;
const LOOK_AHEAD = 260;
const LOOK_IN = 0.5;
const LOOK_OUT = 0.8;
const DEAD_ZONE_Y = 110;
const SHAKE_PX = 18;
const SHAKE_ROT = (0.6 * Math.PI) / 180;
const TRAUMA_DECAY = 2.5;

export type Camera = {
  x: number;
  y: number;
  zoom: number;
  /** The feet point followed; null holds still. */
  target: Point | null;
  facing: 1 | -1;
  moving: boolean;
  falling: boolean;
  lookAhead: number;
  trauma: number;
  bounds: Rect | null;
  focusY: number;
  shake: { x: number; y: number; rot: number };
};

export type Scene = {
  layers: Record<LayerName, Container>;
  camera: Camera;
  /** Screen px per world px. */
  scale: number;
  /** The venue's ambient light as a tint, applied to scenery and body parts, never to a head plate. */
  ambient: number;
  width: number;
  height: number;
  resize(): void;
  update(dt: number): void;
  /** Positions every layer for the camera; called by update and resize. */
  fit(): void;
  toScreen(p: Point): Point;
  destroy(): void;
};

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export function createScene(render: RenderApp): Scene {
  const { app } = render;
  const layers = {} as Record<LayerName, Container>;
  for (const name of LAYER_ORDER) {
    const c = new Container({ label: name });
    layers[name] = c;
    app.stage.addChild(c);
  }
  layers.play.sortableChildren = true;
  layers.fx.sortableChildren = true;

  const camera: Camera = {
    x: 0,
    y: 0,
    zoom: 1,
    target: null,
    facing: 1,
    moving: false,
    falling: false,
    lookAhead: 0,
    trauma: 0,
    bounds: null,
    focusY: 0,
    shake: { x: 0, y: 0, rot: 0 },
  };
  let seed = 1;
  // A cheap deterministic noise for the shake.
  const noise = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647 - 0.5;
  };

  const scene: Scene = {
    layers,
    camera,
    scale: 1,
    ambient: 0xffffff,
    width: app.screen.width,
    height: app.screen.height,
    resize() {
      scene.width = app.screen.width;
      scene.height = app.screen.height;
      scene.fit();
    },
    update(dt) {
      const c = camera;
      if (c.target) {
        const reach = Math.min(LOOK_AHEAD, (LOOK_AHEAD_MAX_FRACTION * scene.width) / (2 * scene.scale));
        const want = c.moving ? reach * c.facing : 0;
        c.lookAhead += (want - c.lookAhead) * ease(c.moving ? 1 / LOOK_IN : 1 / LOOK_OUT, dt);
        const wantX = c.target.x + c.lookAhead;
        c.x += (wantX - c.x) * ease(SPRING_X, dt);
        // The chest sits at the screen center; the focus moves only past the dead zone.
        const chest = c.target.y - HERO_HEIGHT * 0.55;
        if (chest < c.focusY - DEAD_ZONE_Y) c.focusY = chest + DEAD_ZONE_Y;
        else if (chest > c.focusY + DEAD_ZONE_Y) c.focusY = chest - DEAD_ZONE_Y;
        c.y += (c.focusY - c.y) * ease(c.falling ? SPRING_Y_FALLING : SPRING_Y, dt);
      }
      c.trauma = Math.max(0, c.trauma - TRAUMA_DECAY * dt);
      const shake = c.trauma * c.trauma;
      c.shake.x = noise() * 2 * SHAKE_PX * shake;
      c.shake.y = noise() * 2 * SHAKE_PX * shake;
      c.shake.rot = noise() * 2 * SHAKE_ROT * shake;
      if (c.bounds) {
        const halfW = scene.width / (2 * scene.scale);
        const halfH = scene.height / (2 * scene.scale);
        const b = c.bounds;
        c.x = Math.min(b.x + b.w - halfW, Math.max(b.x + halfW, c.x));
        c.y = Math.min(b.y + b.h - halfH, Math.max(b.y + halfH, c.y));
      }
      scene.fit();
    },
    fit() {
      const { width, height } = scene;
      const portrait = width < height ? PORTRAIT_ZOOM : 1;
      scene.scale = (HERO_SCREEN_FRACTION * height * camera.zoom * portrait) / HERO_HEIGHT;
      for (const name of LAYER_ORDER) {
        const layer = layers[name];
        const f = PARALLAX[name];
        if (f === 0) {
          layer.position.set(0, 0);
          layer.scale.set(1);
          layer.rotation = 0;
          continue;
        }
        layer.scale.set(scene.scale);
        layer.pivot.set(camera.x * f + camera.shake.x, camera.y + camera.shake.y);
        layer.position.set(width / 2, height / 2);
        layer.rotation = camera.shake.rot;
      }
    },
    toScreen(p) {
      return {
        x: scene.width / 2 + (p.x - camera.x - camera.shake.x) * scene.scale,
        y: scene.height / 2 + (p.y - camera.y - camera.shake.y) * scene.scale,
      };
    },
    destroy() {
      app.renderer.off("resize", scene.resize);
      for (const name of LAYER_ORDER) layers[name].destroy({ children: true });
    },
  };
  app.renderer.on("resize", scene.resize);
  scene.resize();
  return scene;
}
