import { Assets, Container, Graphics, Sprite, Texture, TilingSprite } from "pixi.js";
import { ART_BASE, type Registry } from "../art/registry";
import { PALETTE, shadowOf, highlightOf, tones } from "./palette";
import { PARALLAX, type Scene } from "./scene";

/** Where the floor meets the wall in the lobby's far plate, in plate px. */
const FAR_FLOOR_LINE = 700;
const FAR_SCALE = 1.4;
/** The venue sorts behind everything that moves: Hammer, the carts and the snot. */
export const SCENERY_Z = -1e6;
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

export type Backdrop = { setVisible(on: boolean): void };

/**
 * A level's planes behind the play: sky, the inked far plate and the mid scenery, wide enough for
 * `length` px of level. The stash has no plate: a back-of-house block wall stands in for it.
 */
export async function loadBackdrop(scene: Scene, venue: string, length: number, registry: Registry): Promise<Backdrop> {
  const planes = { sky: new Container(), far: new Container(), mid: new Container() };
  scene.layers.sky.addChild(planes.sky);
  scene.layers.far.addChild(planes.far);
  scene.layers.mid.addChild(planes.mid);
  const sky = new Sprite(gradientTexture([
    [0, "#1c1512"],
    [0.6, "#3a2a22"],
    [1, "#5b4536"],
  ]));
  sky.width = 4096;
  sky.height = 2304;
  planes.sky.addChild(sky);

  const far = registry.backdrops[venue]?.far;
  if (far) {
    const texture = await Assets.load<Texture>(ART_BASE + far);
    const tile = new TilingSprite({ texture, width: texture.width * 3, height: texture.height });
    tile.scale.set(FAR_SCALE);
    tile.position.set(-1500, -FAR_FLOOR_LINE * FAR_SCALE);
    tile.tint = "#c4b9ad";
    planes.far.addChild(tile);
  }
  if (venue === "stash") planes.far.addChild(blockWall(length));
  else planes.mid.addChild(drawMid(length));
  return {
    setVisible(on) {
      for (const c of Object.values(planes)) c.visible = on;
    },
  };
}

/** The stash's back wall: painted block, a pipe run and a strip light, in the far plane. */
function blockWall(length: number): Graphics {
  const g = new Graphics();
  const block = tones("#5d6460");
  const w = length * PARALLAX.far + 2400;
  g.rect(-1200, -1400, w, 1400).fill(block.base);
  for (let y = -1400, row = 0; y < 0; y += 70, row++) {
    g.rect(-1200, y, w, 4).fill(block.shadow);
    for (let x = -1200 + (row % 2) * 70; x < w; x += 140) g.rect(x, y, 4, 70).fill(block.shadow);
  }
  // A sealed concrete floor running back to the wall, under the play floor's front edge.
  g.rect(-1200, 0, w, 900).fill(shadowOf("#4a4b47"));
  for (let x = -1200; x < w; x += 360) g.rect(x, 0, 3, 900).fill({ color: "#000000", alpha: 0.25 });
  g.rect(-1200, -980, w, 26).fill(tones("#8a8f93").base);
  g.rect(-1200, -980, w, 26).stroke({ width: MID_OUTLINE, color: PALETTE.outline, alpha: 0.75 });
  return g;
}

/** Columns and palms against the wall, in a muted palette with thinner lines, spread over the mid plane's share of the level. */
function drawMid(length: number): Graphics {
  const g = new Graphics();
  const span = length * PARALLAX.mid + 2400;
  const stone = tones("#cfc6b8");
  const line = { width: MID_OUTLINE, color: PALETTE.outline, alpha: 0.75, join: "round" as const };
  for (let x = 1400; x < span; x += 2800) {
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
  for (let x = 2800; x < span; x += 2800) {
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
  return g;
}
