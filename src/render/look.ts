import { Sprite, Texture, type Ticker } from "pixi.js";
import { loadRegistry, type Expression, type Registry } from "../art/registry";
import { LAND_T, RUN, STEP } from "../sim/constants";
import { KEY_BINDINGS, emptyInput, inputFromKeys, type Action } from "../sim/input";
import { floorAt } from "../sim/physics";
import { CLIPS, type ClipCtx, type ClipName } from "../sim/rig/clips";
import { solve } from "../sim/rig/fk";
import { blend, type Pose } from "../sim/rig/pose";
import { HERO_HEIGHT } from "../sim/rig/skeleton";
import type { HeroState, Stage } from "../sim/types";
import { createWorld } from "../sim/world";
import type { RenderApp } from "./app";
import { loadBackdrop } from "./backdrop";
import { createBoards } from "./boards";
import { createCharacter } from "./character";
import { createLighting, type Light } from "./lighting";
import { PALETTE } from "./palette";
import { Particles } from "./particles";
import { createScene } from "./scene";
import { installFonts, label } from "./text";

/** The lobby's first stretch: the floor, two counters, a balcony and a service pass. */
export const LOBBY_STAGE: Stage = {
  floor: [{ x0: -1000, x1: 14000, y0: 0, y1: 0 }],
  platforms: [
    { x0: 1500, x1: 2000, y: -180 },
    { x0: 3200, x1: 3700, y: -180 },
    { x0: 4400, x1: 5600, y: -520 },
  ],
  solids: [],
  passes: [{ x: 2200, y: -1000, w: 500, h: 780 }],
  bounds: { x: -1000, y: -2200, w: 15000, h: 3000 },
};
const LOBBY_LIGHTS: Light[] = [800, 3400, 6000, 8600, 11200].map((x) => ({
  x,
  y: -560,
  radius: 560,
  color: PALETTE.lampGlow,
  intensity: 0.55,
  flicker: 0.04,
}));
/** Head height as a fraction of HERO_HEIGHT; the owner picks between 0.22, 0.26 and 0.30 from the boards. */
export const HEAD_SCALE = 0.26;
/** World px one walk or run cycle covers, so the feet don't skate. */
const STRIDE = 280;
const BLEND_T = 0.1;
const DUST_EVERY = 0.12;

export type Look = { stop(): void };

/** The look test: Hammer in the lobby under the keyboard, no HUD, one label. */
export async function startLook(render: RenderApp, opts: { noart?: boolean; board?: boolean } = {}): Promise<Look> {
  const { app } = render;
  const scene = createScene(render);
  const world = createWorld(LOBBY_STAGE, { x: 400, y: 0 });
  scene.camera.bounds = LOBBY_STAGE.bounds;
  scene.camera.x = 400;
  scene.camera.focusY = scene.camera.y = -HERO_HEIGHT * 0.55;

  await installFonts();
  let registry = await loadRegistry();
  if (opts.noart) registry = stripped(registry);
  await loadBackdrop(scene, "lobby", LOBBY_STAGE, registry);
  const lighting = createLighting(scene, render.quality, LOBBY_LIGHTS);
  render.onQuality = (q) => lighting.setQuality(q);
  const particles = new Particles(scene.layers.fx, 600);
  const character = createCharacter(registry, opts.noart ? "scrubs" : "affliction", { noart: opts.noart });
  scene.layers.play.addChild(character.container);
  await character.ready;
  const headPlate = registry.hammer.heads.neutral!;

  const vignette = new Sprite(vignetteTexture());
  vignette.alpha = 1;
  const title = label("LOOK TEST · /?next=1", "display", 30);
  title.position.set(24, 14);
  title.alpha = 0.8;
  scene.layers.post.addChild(vignette, title);

  const down = new Set<string>();
  // A tap shorter than a frame still counts for the frame's steps.
  const tapped = new Set<string>();
  const onKey = (e: KeyboardEvent) => {
    if (e.code in KEY_BINDINGS) e.preventDefault();
    if (e.type === "keydown") {
      down.add(e.code);
      tapped.add(e.code);
    } else down.delete(e.code);
  };
  const onBlur = () => {
    down.clear();
    tapped.clear();
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", onBlur);

  let prevHeld: Record<Action, boolean> = emptyInput().held;
  let acc = 0;
  let prev = world.snapshot();
  let cur = prev;
  let clip: ClipName = "idle";
  let phase = 0;
  let lastPose: Pose | null = null;
  let fromPose: Pose | null = null;
  let blendT = 1;
  let lastState = cur.hero.state;
  let dustT = 0;
  let time = 0;

  const animate = (h: HeroState, dt: number): Pose => {
    const want = h.state as ClipName;
    if (want !== clip) {
      fromPose = lastPose;
      blendT = 0;
      clip = want;
      phase = 0;
    }
    const cycling = clip === "walk" || clip === "run";
    phase += cycling ? (Math.abs(h.vx) * dt) / STRIDE : dt;
    const u = cycling
      ? phase % 1
      : clip === "idle"
        ? (phase * 0.4) % 1
        : clip === "land"
          ? Math.min(1, phase / LAND_T)
          : clip === "jump"
            ? Math.min(1, phase / 0.35)
            : Math.min(1, phase / 0.3);
    const ctx: ClipCtx = { t: time, speed: Math.abs(h.vx), vy: h.vy, facing: h.facing };
    let pose = CLIPS[clip](u, ctx);
    // Lean into the motion on top of the clip's own lean.
    pose.lean += (6 * h.vx * h.facing) / RUN;
    if (fromPose && blendT < 1) {
      blendT = Math.min(1, blendT + dt / BLEND_T);
      pose = blend(fromPose, pose, blendT);
    }
    lastPose = pose;
    return pose;
  };

  const supportY = (x: number, y: number) => {
    let best = floorAt(LOBBY_STAGE, x) ?? y;
    for (const p of LOBBY_STAGE.platforms) if (x >= p.x0 && x <= p.x1 && p.y >= y - 1 && p.y < best) best = p.y;
    return best;
  };

  const tick = (t: Ticker) => {
    const dt = Math.min(t.deltaMS / 1000, 0.1);
    time += dt;
    acc += dt;
    let steps = 0;
    const keys = tapped.size ? new Set([...down, ...tapped]) : down;
    while (acc >= STEP && steps < 5) {
      const input = inputFromKeys(keys, prevHeld);
      prevHeld = input.held;
      prev = cur;
      world.step(input);
      cur = world.snapshot();
      acc -= STEP;
      steps++;
    }
    if (steps > 0) tapped.clear();
    if (steps === 5) acc = 0;
    const alpha = acc / STEP;
    const h = cur.hero;
    const x = prev.hero.x + (h.x - prev.hero.x) * alpha;
    const y = prev.hero.y + (h.y - prev.hero.y) * alpha;

    const pose = animate(h, dt);
    const solved = solve(pose, h.facing, HEAD_SCALE, headPlate);
    const floorY = supportY(x, y);
    const expression: Expression = h.state === "idle" && h.stateT > 4 ? "bored" : "neutral";
    character.container.position.set(x, y);
    character.container.zIndex = y;
    character.apply(solved, expression, h.facing, floorY - y);

    if (h.state !== lastState) {
      if (h.state === "land") particles.emit("dust", x, floorY, 10);
      lastState = h.state;
    }
    if (h.state === "run" && h.onGround) {
      dustT += dt;
      if (dustT >= DUST_EVERY) {
        dustT = 0;
        particles.emit("dust", x - h.facing * 30, floorY, 2);
      }
    }

    const cam = scene.camera;
    cam.target = { x, y };
    cam.facing = h.facing;
    cam.moving = Math.abs(h.vx) > 40;
    cam.falling = h.vy > 900;
    scene.update(dt);
    lighting.update(dt);
    particles.update(dt);
    vignette.width = scene.width;
    vignette.height = scene.height;

    if (window.__next) {
      window.__next.hero = { state: h.state, x: h.x, y: h.y, vx: h.vx, onGround: h.onGround };
      window.__next.heroScreenHeight = HERO_HEIGHT * scene.scale;
      window.__next.art = {
        heads: Object.keys(registry.hammer.heads).length,
        bodies: Object.keys(registry.hammer.bodies).length,
      };
    }
  };
  app.ticker.add(tick);
  if (opts.board) {
    // The boards move Hammer without stepping the sim; the next tick re-places him from the world.
    const placeHero = (x: number) => {
      world.hero.x = x;
      world.hero.vx = 0;
      cur = prev = world.snapshot();
      const solved = solve(CLIPS.idle(0, { t: 0, speed: 0, vy: 0, facing: 1 }), 1, HEAD_SCALE, headPlate);
      character.container.position.set(x, 0);
      character.apply(solved, "neutral", 1, 0);
    };
    window.__nextBoard = createBoards(render, scene, registry, particles, placeHero);
  }
  return {
    stop() {
      app.ticker.remove(tick);
      delete window.__nextBoard;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      scene.destroy();
    },
  };
}

/** The dev-only loader that forgets every plate but the neutral head and the Affliction body. */
function stripped(registry: Registry): Registry {
  return {
    ...registry,
    hammer: {
      ...registry.hammer,
      heads: { neutral: registry.hammer.heads.neutral },
      bodies: { affliction: registry.hammer.bodies.affliction },
    },
  };
}

let vignetteTex: Texture | null = null;
/** Clear in the middle, 18 percent black at the corners. */
function vignetteTexture(): Texture {
  if (vignetteTex) return vignetteTex;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  vignetteTex = Texture.from(canvas);
  return vignetteTex;
}
