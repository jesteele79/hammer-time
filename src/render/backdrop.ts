import { Assets, Graphics, Sprite, Texture, TilingSprite } from "pixi.js";
import { ART_BASE, type Registry } from "../art/registry";
import type { Platform, Stage } from "../sim/types";
import { PALETTE, shadowOf, highlightOf, tones } from "./palette";
import type { Scene } from "./scene";
import { label } from "./text";

/** Where the floor meets the wall in the lobby's far plate, in plate px. */
const FAR_FLOOR_LINE = 700;
const FAR_SCALE = 1.4;
const FLOOR_DEPTH = 120;
const FLOOR_TOP = 26;
const OUTLINE = 4;
const MID_OUTLINE = 3;

function gradientTexture(stops: [number, string][], vertical = true): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = vertical ? 2 : 256;
  canvas.height = vertical ? 256 : 2;
  const ctx = canvas.getContext("2d")!;
  const g = vertical ? ctx.createLinearGradient(0, 0, 0, 256) : ctx.createLinearGradient(0, 0, 256, 0);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return Texture.from(canvas);
}

/** The venue's planes: sky, the inked far plate, mid scenery, and the floors Hammer stands on. */
export async function loadBackdrop(scene: Scene, venue: string, stage: Stage, registry: Registry): Promise<void> {
  const sky = new Sprite(gradientTexture([
    [0, "#1c1512"],
    [0.6, "#3a2a22"],
    [1, "#5b4536"],
  ]));
  sky.width = 4096;
  sky.height = 2304;
  scene.layers.sky.addChild(sky);

  const far = registry.backdrops[venue]?.far;
  if (far) {
    const texture = await Assets.load<Texture>(ART_BASE + far);
    const tile = new TilingSprite({ texture, width: texture.width * 3, height: texture.height });
    tile.scale.set(FAR_SCALE);
    tile.position.set(-1500, -FAR_FLOOR_LINE * FAR_SCALE);
    tile.tint = "#c4b9ad";
    scene.layers.far.addChild(tile);
  }

  drawMid(scene);
  const floor = new Graphics();
  floor.zIndex = -1;
  drawFloors(floor, stage);
  drawPlatforms(floor, stage.platforms);
  scene.layers.play.addChild(floor);
  drawPasses(scene, stage);
}

function drawFloors(g: Graphics, stage: Stage) {
  const marble = tones(PALETTE.marbleFront);
  for (const f of stage.floor) {
    g.poly([f.x0, f.y0 + FLOOR_TOP, f.x1, f.y1 + FLOOR_TOP, f.x1, f.y1 + FLOOR_DEPTH, f.x0, f.y0 + FLOOR_DEPTH]).fill(
      marble.base,
    );
    g.poly([f.x0, f.y0, f.x1, f.y1, f.x1, f.y1 + FLOOR_TOP, f.x0, f.y0 + FLOOR_TOP]).fill(PALETTE.marbleTop);
    // Hard-edged shadow under the lip, as if lit from the upper left.
    g.poly([f.x0, f.y0 + FLOOR_TOP, f.x1, f.y1 + FLOOR_TOP, f.x1, f.y1 + FLOOR_TOP + 10, f.x0, f.y0 + FLOOR_TOP + 10]).fill(
      marble.shadow,
    );
    g.poly([f.x0, f.y0 + 6, f.x1, f.y1 + 6, f.x1, f.y1 + 11, f.x0, f.y0 + 11]).fill({ color: "#ffffff", alpha: 0.4 });
    g.poly([f.x0, f.y0, f.x1, f.y1, f.x1, f.y1 + FLOOR_DEPTH, f.x0, f.y0 + FLOOR_DEPTH]).stroke({
      width: OUTLINE,
      color: PALETTE.outline,
      join: "round",
    });
    // Marble veins on the front face.
    for (let x = f.x0 + 160; x < f.x1; x += 420) {
      const y = f.y0 + FLOOR_TOP + 30;
      g.moveTo(x, y)
        .quadraticCurveTo(x + 90, y + 40, x + 200, y + 20)
        .quadraticCurveTo(x + 260, y + 10, x + 320, y + 55)
        .stroke({ width: 3, color: marble.shadow, cap: "round" });
    }
  }
}

function drawPlatforms(g: Graphics, platforms: Platform[]) {
  const marble = tones(PALETTE.marbleFront);
  const brass = tones(PALETTE.brass);
  for (const p of platforms) {
    const w = p.x1 - p.x0;
    if (p.y > -300) {
      // A counter: a marble body down to the floor with a brass trim.
      g.rect(p.x0, p.y, w, -p.y).fill(marble.base);
      g.rect(p.x0 + w - 60, p.y + 22, 60, -p.y - 22).fill(marble.shadow);
      g.rect(p.x0, p.y, w, 22).fill(PALETTE.marbleTop);
      g.rect(p.x0, p.y + 22, w, 8).fill(brass.base);
      g.rect(p.x0 + 24, p.y + 5, w - 48, 4).fill({ color: "#ffffff", alpha: 0.45 });
      g.rect(p.x0, p.y, w, -p.y).stroke({ width: OUTLINE, color: PALETTE.outline, join: "round" });
      // Panel lines on the front.
      for (let x = p.x0 + 90; x < p.x1 - 60; x += 160)
        g.roundRect(x, p.y + 60, 110, -p.y - 100, 8).stroke({ width: 3, color: marble.shadow });
    } else {
      // A balcony slab with a brass railing.
      g.rect(p.x0, p.y, w, 44).fill(marble.base);
      g.rect(p.x0, p.y, w, 14).fill(PALETTE.marbleTop);
      g.rect(p.x0, p.y + 30, w, 14).fill(marble.shadow);
      g.rect(p.x0, p.y, w, 44).stroke({ width: OUTLINE, color: PALETTE.outline, join: "round" });
      for (let x = p.x0 + 20; x <= p.x1 - 20; x += 140) {
        g.rect(x - 5, p.y - 100, 10, 100).fill(brass.base);
        g.rect(x - 5, p.y - 100, 10, 100).stroke({ width: 3, color: PALETTE.outline });
      }
      g.roundRect(p.x0, p.y - 112, w, 14, 6).fill(brass.highlight);
      g.roundRect(p.x0, p.y - 112, w, 14, 6).stroke({ width: 3, color: PALETTE.outline });
    }
  }
}

function drawPasses(scene: Scene, stage: Stage) {
  const wood = tones(PALETTE.wallWood);
  for (const p of stage.passes) {
    const g = new Graphics();
    g.zIndex = -1;
    g.rect(p.x, p.y, p.w, p.h).fill(wood.base);
    g.rect(p.x + 24, p.y + 24, p.w - 48, p.h - 48).fill(wood.highlight);
    g.rect(p.x + 24, p.y + p.h - 70, p.w - 48, 46).fill(wood.shadow);
    g.rect(p.x, p.y, p.w, p.h).stroke({ width: OUTLINE, color: PALETTE.outline, join: "round" });
    g.roundRect(p.x + p.w / 2 - 110, p.y + p.h - 120, 220, 44, 8).fill(PALETTE.brass);
    g.roundRect(p.x + p.w / 2 - 110, p.y + p.h - 120, 220, 44, 8).stroke({ width: 3, color: PALETTE.outline });
    const sign = label("SERVICE", "ui", 28);
    sign.tint = PALETTE.outline;
    sign.anchor.set(0.5);
    sign.position.set(p.x + p.w / 2, p.y + p.h - 98);
    scene.layers.play.addChild(g, sign);
    sign.zIndex = -1;
  }
}

/** Columns and palms against the wall, in a muted palette with thinner lines. */
function drawMid(scene: Scene) {
  const g = new Graphics();
  const stone = tones("#cfc6b8");
  const line = { width: MID_OUTLINE, color: PALETTE.outline, alpha: 0.75, join: "round" as const };
  for (const x of [1400, 4200, 7000, 9800, 12600]) {
    g.rect(x - 45, -980, 90, 980).fill(stone.base);
    g.rect(x + 15, -980, 30, 980).fill(stone.shadow);
    g.rect(x - 45, -980, 12, 980).fill(stone.highlight);
    g.rect(x - 62, -1010, 124, 40).fill(stone.base);
    g.rect(x - 62, -60, 124, 60).fill(stone.base);
    g.rect(x - 45, -980, 90, 980).stroke(line);
    g.rect(x - 62, -1010, 124, 40).stroke(line);
    g.rect(x - 62, -60, 124, 60).stroke(line);
  }
  const brass = tones(PALETTE.brass);
  const leaf = tones(PALETTE.leaf);
  for (const x of [2600, 5600, 8600, 11600]) {
    g.poly([x - 70, -150, x + 70, -150, x + 52, 0, x - 52, 0]).fill(brass.base);
    g.poly([x + 20, -150, x + 70, -150, x + 52, 0, x + 14, 0]).fill(brass.shadow);
    g.rect(x - 78, -170, 156, 24).fill(brass.highlight);
    g.poly([x - 70, -150, x + 70, -150, x + 52, 0, x - 52, 0]).stroke(line);
    g.rect(x - 78, -170, 156, 24).stroke(line);
    g.rect(x - 10, -330, 20, 170).fill(shadowOf("#6b4a2a"));
    g.rect(x - 10, -330, 20, 170).stroke(line);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
      const ex = x + Math.cos(a) * 190;
      const ey = -330 + Math.sin(a) * 120 + 60;
      const cx = x + Math.cos(a) * 90;
      const cy = -330 - 90 + Math.sin(a) * 30;
      g.moveTo(x, -330).quadraticCurveTo(cx, cy, ex, ey).stroke({ width: 26, color: PALETTE.outline, alpha: 0.75, cap: "round" });
      g.moveTo(x, -330).quadraticCurveTo(cx, cy, ex, ey).stroke({ width: 18, color: i % 2 ? leaf.base : leaf.shadow, cap: "round" });
      g.moveTo(x, -332).quadraticCurveTo(cx, cy - 4, ex - 10, ey - 6).stroke({ width: 5, color: highlightOf(PALETTE.leaf), cap: "round" });
    }
  }
  scene.layers.mid.addChild(g);
}
