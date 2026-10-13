import { Assets, BlurFilter, Container, Graphics, Sprite, Texture, TilingSprite } from "pixi.js";
import { ART_BASE, type Rect, type Registry, type Wall } from "../art/registry";
import type { Level } from "../sim/level";
import type { FloorSegment } from "../sim/types";
import { FLOOR } from "./ink";
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

/** The far plane's walls are drawn at most at this scale, at least at WALL_MIN; the mid plane's pieces at MID_SCALE, the fore plane's at full size. */
export const WALL_SCALE = 1.4;
const WALL_MIN = 0.9;
export const MID_SCALE = 0.6;
/** How fast the painted planes follow the ground he stands on, per second. */
const GROUND_EASE = 4;
/** Half the widest view the camera shows (21:9 at zoom 0.88), so the far plane never runs out at a level's ends. */
const VIEW_HALF = 1400;
/** The fore pieces: darker, a little blurred, and set this far in front of the floor line. */
const FORE = { tint: 0xb3b3b3, blur: 2, down: 60, faded: 0.2, ease: 6 } as const;
const WALL_TINT = "#c4b9ad";
/** The solid ground under a painted venue's floors, so no wall's painted floor shows beneath the game's. */
const GROUND = "#1d1714";
const MID_TINT = "#b8ad9f";

/** A venue's walls in order, all registered, or null: a venue with any wall missing draws its photo, never a partial row. */
export function wallsFor(level: Pick<Level, "backdrop">, registry: Pick<Registry, "walls">): Wall[] | null {
  const names = level.backdrop?.walls ?? [];
  if (!names.length) return null;
  const walls = names.map((n) => registry.walls?.[n]);
  return walls.every((w): w is Wall => !!w) ? walls : null;
}

/**
 * One scale per venue: its walls side by side span its length in the far plane, so each stands behind its own stretch
 * in walking order (the dining room's wall behind the dining room); a short arena keeps WALL_MIN and centres them.
 */
export function wallScale(walls: Pick<Wall, "width">[], level: Pick<Level, "bounds">): number {
  const total = walls.reduce((a, w) => a + w.width, 0);
  return Math.min(WALL_SCALE, Math.max(WALL_MIN, (level.bounds.w * PARALLAX.far) / total));
}

/** The ground at x: the lowest floor there (a belt or a stair over the floor is not the ground), or null over a pit. */
export function groundAt(floor: readonly Pick<FloorSegment, "x0" | "x1" | "y0" | "y1">[], x: number): number | null {
  let ground: number | null = null;
  for (const f of floor) {
    if (x < f.x0 || x > f.x1) continue;
    const y = f.y0 + ((f.y1 - f.y0) * (x - f.x0)) / (f.x1 - f.x0 || 1);
    ground = ground === null ? y : Math.max(ground, y);
  }
  return ground;
}

/** Where each wall stands in the far plane: side by side at `scale`, the row centred on `center`, the first and last walls repeated outward until `extent` is covered. */
export function layWalls(walls: Pick<Wall, "width">[], scale: number, center: number, extent: [number, number]): { index: number; x: number }[] {
  const widths = walls.map((w) => w.width * scale);
  const total = widths.reduce((a, b) => a + b, 0);
  const out: { index: number; x: number }[] = [];
  let x = center - total / 2;
  walls.forEach((_, i) => {
    out.push({ index: i, x });
    x += widths[i];
  });
  for (let right = x; right < extent[1]; right += widths[walls.length - 1]) out.push({ index: walls.length - 1, x: right });
  for (let left = center - total / 2; left > extent[0]; ) {
    left -= widths[0];
    out.unshift({ index: 0, x: left });
  }
  return out;
}

export type Backdrop = { setVisible(on: boolean): void; update(face: Rect | null, dt: number, ground: number | null): void };

/**
 * A level's planes behind and in front of the play: the sky; its painted walls side by side (or its inked photo while
 * any wall is missing); its painted mid pieces against them (or the code-drawn columns and palms); its fore pieces,
 * darkened and blurred, fading while his head is behind one. The stash has its block wall. The painted walls and pieces
 * stand on the ground he stands on, rising with him up the library steps and onto the dock; each wall's painted floor
 * carries on below it in its bottom row's color, and solid ground fills in under the game's floors.
 */
export async function loadBackdrop(scene: Scene, level: Level, registry: Registry): Promise<Backdrop> {
  const planes = { sky: new Container(), far: new Container(), mid: new Container(), fore: new Container() };
  scene.layers.sky.addChild(planes.sky);
  scene.layers.far.addChild(planes.far);
  scene.layers.mid.addChild(planes.mid);
  scene.layers.fore.addChild(planes.fore);
  const sky = new Sprite(gradientTexture([
    [0, "#1c1512"],
    [0.6, "#3a2a22"],
    [1, "#5b4536"],
  ]));
  sky.width = 4096;
  sky.height = 2304;
  planes.sky.addChild(sky);

  const b = level.bounds;
  // The painted walls and pieces, each in a layer that stands on the ground.
  const grounded = { far: new Container(), mid: new Container(), fore: new Container() };
  planes.far.addChild(grounded.far);
  planes.mid.addChild(grounded.mid);
  planes.fore.addChild(grounded.fore);
  let groundY: number | null = null;
  const walls = wallsFor(level, registry);
  if (walls) {
    const textures = await Promise.all(walls.map((w) => Assets.load<Texture>(ART_BASE + w.file)));
    const scale = wallScale(walls, level);
    const extent: [number, number] = [b.x * PARALLAX.far - VIEW_HALF, (b.x + b.w) * PARALLAX.far + VIEW_HALF];
    for (const { index, x } of layWalls(walls, scale, (b.x + b.w / 2) * PARALLAX.far, extent)) {
      const w = walls[index];
      const top = -w.floor * scale;
      // The wall carries on above the painting in its top row's color.
      grounded.far.addChild(new Graphics().rect(x, -4000, w.width * scale, 4000 + top).fill(w.top));
      grounded.far.addChild(new Graphics().rect(x, top + w.height * scale - 2, w.width * scale, 4000).fill(w.bottom ?? w.top));
      const s = new Sprite(textures[index]);
      s.position.set(x, top);
      s.scale.set(scale);
      s.tint = WALL_TINT;
      grounded.far.addChild(s);
    }
    // In the mid plane, so it stands in front of the walls; it runs level, so the plane's slower pan never shows.
    planes.mid.addChild(new Graphics().rect(-20000, FLOOR.depth, 60000, 6000).fill(GROUND));
  } else {
    const far = registry.backdrops[level.id]?.far;
    if (far) {
      const texture = await Assets.load<Texture>(ART_BASE + far);
      const tile = new TilingSprite({ texture, width: texture.width * 3, height: texture.height });
      tile.scale.set(FAR_SCALE);
      tile.position.set(-1500, -FAR_FLOOR_LINE * FAR_SCALE);
      tile.tint = WALL_TINT;
      planes.far.addChild(tile);
    }
  }
  if (level.id === "stash") planes.far.addChild(blockWall(level.length));
  const piece = async (name: string): Promise<Sprite | null> => {
    const p = registry.pieces?.[name];
    if (!p) return null;
    const s = new Sprite(await Assets.load<Texture>(ART_BASE + p.file));
    s.anchor.set(p.base.x / p.width, p.base.y / p.height);
    return s;
  };
  let mids = 0;
  for (const m of level.backdrop?.mid ?? []) {
    const s = await piece(m.name);
    if (!s) continue;
    s.position.set(m.x * PARALLAX.mid, 0);
    s.scale.set(MID_SCALE);
    s.tint = MID_TINT;
    grounded.mid.addChild(s);
    mids++;
  }
  if (!mids && level.id !== "stash") planes.mid.addChild(drawMid(level.length));
  const fores: Sprite[] = [];
  for (const f of level.backdrop?.fore ?? []) {
    const s = await piece(f.name);
    if (!s) continue;
    s.position.set(f.x * PARALLAX.fore, FORE.down);
    s.tint = FORE.tint;
    s.filters = [new BlurFilter({ strength: FORE.blur })];
    grounded.fore.addChild(s);
    fores.push(s);
  }
  return {
    setVisible(on) {
      for (const c of Object.values(planes)) c.visible = on;
    },
    update(face, dt, ground) {
      if (ground !== null) {
        groundY = groundY === null ? ground : groundY + (ground - groundY) * Math.min(1, GROUND_EASE * dt);
        for (const c of Object.values(grounded)) c.y = groundY;
      }
      for (const s of fores) {
        const r = s.getBounds();
        const behind = !!face && r.x < face.x + face.w && r.x + r.width > face.x && r.y < face.y + face.h && r.y + r.height > face.y;
        s.alpha += ((behind ? FORE.faded : 1) - s.alpha) * Math.min(1, FORE.ease * dt);
      }
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
