import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ART_BASE, TOWER_PIECES, type Piece, type Registry, type TowerPiece } from "../art/registry";
import type { Level, LevelFloor, LevelPlatform } from "../sim/level";
import type { Mover } from "../sim/movers";
import { INK, THIN } from "./ink";
import { PALETTE, tones } from "./palette";

/** The stairwell's materials: grey carpet, painted steel, a rubber tread, the walls past its ends. */
const C = { carpet: "#74767e", nosing: "#a9abb3", slab: "#55575f", deep: "#3c3d44", steel: "#8d939c", rail: "#c9a24a", concrete: "#6f7078", tread: "#3a3c44", tube: "#4c4f58", tubeIn: "#2c2e35", stripe: "#d8b13c", wall: "#3a3a42", machine: "#2b2e35", glass: "#f2e6c4", shelf: "#6b5a3a" } as const;
/** The snacks behind a vending machine's glass, a row at a time. */
const SNACKS = ["#c8452f", "#e0a92e", "#3f7fb5", "#5f9e4f", "#c8452f", "#8a5aa8", "#e0a92e", "#3f7fb5"] as const;
/** A landing's slab, and how many steps a flight draws. */
const SLAB = 34;
const STEPS = 14;
/** How tall a flight's rail stands off the steps. */
const RAIL_UP = 130;

/** The tower's sheet's pieces, loaded: each with its registry entry. */
export type TowerPieces = Partial<Record<TowerPiece, { texture: Texture; piece: Piece }>>;

/** The sheet's pieces, or none while it is not in (the drawn stand-ins stand); one that fails is left out. */
export async function loadTowerPieces(registry: Registry): Promise<TowerPieces> {
  const listed = registry.tower?.pieces;
  const out: TowerPieces = {};
  if (!listed) return out;
  await Promise.all(
    TOWER_PIECES.map(async (name) => {
      const piece = listed[name];
      if (!piece) return;
      try {
        out[name] = { texture: await Assets.load<Texture>(ART_BASE + piece.file), piece };
      } catch (err) {
        console.warn(`tower piece ${name}: the stand-in draws (${(err as Error).message})`);
      }
    }),
  );
  return out;
}

/** Draws a piece `w` wide with its base point at (x, y). */
function stand(g: Graphics, p: { texture: Texture; piece: Piece }, x: number, y: number, w: number) {
  const s = w / p.piece.width;
  g.texture(p.texture, 0xffffff, x - p.piece.base.x * s, y - p.piece.base.y * s, w, p.piece.height * s);
}

/** A landing's slab: grey carpet over a painted edge, the nosing where he walks; a flight's steps under the slope, their noses on his feet's line, and a rail above. */
export function towerFloor(g: Graphics, f: LevelFloor): boolean {
  if (f.kind === "carpet") {
    g.rect(f.x0, f.y0, f.x1 - f.x0, SLAB).fill(C.slab);
    g.rect(f.x0, f.y0, f.x1 - f.x0, 12).fill(C.carpet);
    g.rect(f.x0, f.y0, f.x1 - f.x0, 3).fill(C.nosing);
    g.rect(f.x0, f.y0, f.x1 - f.x0, SLAB).stroke(THIN);
    return true;
  }
  if (f.kind !== "stairs") return false;
  const slope = (f.y1 - f.y0) / (f.x1 - f.x0);
  const at = (x: number) => f.y0 + slope * (x - f.x0);
  const run = (f.x1 - f.x0) / STEPS;
  const rising = f.y1 < f.y0;
  // The stringer under the steps: as deep as a slab where it lands on the foot's floor, deeper up the run.
  const under = (x: number) => at(x) + (rising ? x === f.x0 ? SLAB : 70 : x === f.x1 ? SLAB : 70);
  g.poly([f.x0, at(f.x0), f.x1, at(f.x1), f.x1, under(f.x1), f.x0, under(f.x0)]).fill(C.concrete);
  g.poly([f.x0, under(f.x0) - 20, f.x1, under(f.x1) - 20, f.x1, under(f.x1), f.x0, under(f.x0)]).fill(tones(C.concrete).shadow);
  // The treads: the feet line runs through their noses.
  const teeth: number[] = [f.x0, at(f.x0)];
  for (let i = 0; i < STEPS; i++) {
    const x0 = f.x0 + i * run;
    const x1 = x0 + run;
    if (rising) teeth.push(x0, at(x1), x1, at(x1));
    else teeth.push(x1, at(x0), x1, at(x1));
  }
  teeth.push(f.x1, under(f.x1) - 20, f.x0, under(f.x0) - 20);
  g.poly(teeth).fill(tones(C.concrete).base);
  for (let i = 0; i < STEPS; i++) {
    const x0 = f.x0 + i * run;
    const x1 = x0 + run;
    const y = at(rising ? x1 : x0);
    g.rect(x0, y - 2, run, 7).fill(C.tread);
  }
  g.poly(teeth).stroke(THIN);
  // The rail along the far side: posts and a rounded bar over the slope.
  const rail = { width: 8, color: C.rail, cap: "round" as const };
  for (let i = 0; i <= 4; i++) {
    const x = f.x0 + ((f.x1 - f.x0) * i) / 4;
    g.moveTo(x, at(x)).lineTo(x, at(x) - RAIL_UP).stroke({ width: 7, color: C.steel });
  }
  g.moveTo(f.x0, at(f.x0) - RAIL_UP).lineTo(f.x1, at(f.x1) - RAIL_UP).stroke(rail);
  g.moveTo(f.x0, at(f.x0) - RAIL_UP).lineTo(f.x1, at(f.x1) - RAIL_UP).stroke({ width: 2, color: PALETTE.outline, alpha: 0.5 });
  return true;
}

/** The atrium's balcony: a slab and its rail, out over the drop; the vending nook's machine under its shelf. */
export function towerPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  if (p.kind === "balcony") {
    g.rect(p.x0, p.y, w, 22).fill(C.slab);
    g.rect(p.x0, p.y, w, 6).fill(C.nosing);
    g.rect(p.x0, p.y, w, 22).stroke(THIN);
    g.moveTo(p.x0, p.y - 100).lineTo(p.x1, p.y - 100).stroke({ width: 8, color: C.rail, cap: "round" });
    for (let x = p.x0; x <= p.x1 + 1; x += w / 4) g.moveTo(x, p.y).lineTo(x, p.y - 100).stroke({ width: 5, color: C.steel });
    // Held off the wall by two brackets.
    for (const x of [p.x0 + 40, p.x1 - 40]) g.poly([x - 6, p.y + 22, x + 6, p.y + 22, x + 6, p.y + 84, x - 6, p.y + 84]).fill(C.steel).poly([x - 6, p.y + 22, x + 6, p.y + 22, x + 6, p.y + 84, x - 6, p.y + 84]).stroke(THIN);
    return true;
  }
  if (p.kind === "vending") {
    // A squat machine tucked under the flight, its top the shelf he hops up on.
    const h = 160;
    g.roundRect(p.x0, p.y, w, h, 6).fill(C.machine);
    g.rect(p.x0 + 6, p.y + 6, 8, h - 12).fill(tones(C.machine).highlight);
    const glass = { x: p.x0 + 22, y: p.y + 14, w: w - 76, h: 88 };
    g.rect(glass.x, glass.y, glass.w, glass.h).fill(C.glass);
    for (let row = 0; row < 3; row++) {
      const y = glass.y + 6 + row * 28;
      for (let col = 0; col < 5; col++) g.rect(glass.x + 6 + col * ((glass.w - 12) / 5), y, (glass.w - 12) / 5 - 4, 18).fill(SNACKS[(row * 3 + col) % SNACKS.length]);
      g.rect(glass.x, y + 18, glass.w, 4).fill(C.shelf);
    }
    g.rect(glass.x, glass.y, glass.w, glass.h).stroke(THIN);
    g.rect(p.x1 - 44, p.y + 18, 30, 12).fill(C.tread);
    for (let i = 0; i < 6; i++) g.rect(p.x1 - 42 + (i % 3) * 10, p.y + 38 + Math.floor(i / 3) * 12, 7, 8).fill(C.steel);
    g.rect(p.x0 + 22, p.y + 118, w - 76, 26).fill(tones(C.machine).shadow).rect(p.x0 + 22, p.y + 118, w - 76, 26).stroke(THIN);
    g.roundRect(p.x0, p.y, w, h, 6).stroke(INK);
    return true;
  }
  return false;
}

/**
 * What stands round the climb: the walls past the stairwell's ends, each floor's number, each chute's tube down to the floor
 * below with its hatch over the gap, each wet floor's sign.
 */
export function towerDressing(g: Graphics, level: Level, pieces: TowerPieces): void {
  const b = level.bounds;
  // Under the ground floor.
  g.rect(b.x - 900, SLAB, b.w + 1800, b.y + b.h - SLAB + 400).fill(C.deep);
  g.rect(b.x - 900, b.y - 400, 900, b.h + 800).fill(C.wall);
  g.rect(b.x + b.w, b.y - 400, 900, b.h + 800).fill(C.wall);
  g.rect(b.x - 30, b.y - 400, 30, b.h + 800).fill(tones(C.wall).shadow);
  g.rect(b.x + b.w, b.y - 400, 30, b.h + 800).fill(tones(C.wall).shadow);
  const every = level.floors?.every ?? 540;
  for (const c of level.chutes ?? []) {
    const mid = c.x + c.w / 2;
    // The chute: a riveted steel duct from the gap to the floor below, with its mouth there; stripes at the gap's lips.
    g.rect(c.x, c.y, c.w, every).fill(C.tube);
    g.rect(c.x + 26, c.y, c.w - 52, every).fill(C.tubeIn);
    for (let y = c.y + 90; y < c.y + every - 140; y += 110) {
      g.rect(c.x, y, c.w, 10).fill(tones(C.tube).highlight);
      for (const x of [c.x + 12, c.x + c.w - 12]) g.circle(x, y + 5, 3).fill(PALETTE.outline);
    }
    g.roundRect(c.x + 14, c.y + every - 130, c.w - 28, 130, 12).fill(C.steel);
    g.roundRect(c.x + 26, c.y + every - 118, c.w - 52, 118, 8).fill(PALETTE.outline);
    g.rect(c.x, c.y, c.w, every).stroke(THIN);
    for (const x of [c.x - 22, c.x + c.w]) g.rect(x, c.y, 22, SLAB).fill(C.stripe);
    if (pieces.chute) stand(g, pieces.chute, mid, c.y - 40, 190);
    else g.roundRect(mid - 90, c.y - 200, 180, 160, 8).fill(C.steel).roundRect(mid - 90, c.y - 200, 180, 160, 8).stroke(INK);
  }
  for (const s of level.slips ?? []) {
    if (pieces.sign) stand(g, pieces.sign, s.x, s.y, 96);
    else g.poly([s.x - 40, s.y, s.x, s.y - 110, s.x + 40, s.y]).fill(C.stripe).poly([s.x - 40, s.y, s.x, s.y - 110, s.x + 40, s.y]).stroke(INK);
    g.ellipse(s.x, s.y + 2, 74, 8).fill({ color: "#9fd6ff", alpha: 0.6 });
  }
}

/** The carts rolling along the landings and down the flight: the sheet's, or a stand-in; each turned the way it rolls, along any slope. */
export class TowerCarts {
  readonly container = new Container({ label: "tower-carts" });
  private readonly views = new Map<string, Container>();
  private art: { texture: Texture; piece: Piece } | null = null;

  constructor(parent: Container) {
    parent.addChild(this.container);
  }

  setArt(pieces: TowerPieces): void {
    this.art = pieces.cart ?? null;
  }

  private build(m: Mover): Container {
    const c = new Container();
    if (this.art) {
      const s = new Sprite(this.art.texture);
      const k = (m.h * 1.05) / this.art.piece.height;
      s.anchor.set(this.art.piece.base.x / this.art.piece.width, this.art.piece.base.y / this.art.piece.height);
      s.scale.set(k);
      c.addChild(s);
    } else {
      const g = new Graphics();
      g.roundRect(-m.w / 2, -m.h, m.w, m.h - 20, 10).fill(C.steel).roundRect(-m.w / 2, -m.h, m.w, m.h - 20, 10).stroke(INK);
      g.rect(-m.w / 2 + 16, -m.h - 26, m.w - 32, 30).fill("#f4f1ea").rect(-m.w / 2 + 16, -m.h - 26, m.w - 32, 30).stroke(THIN);
      for (const x of [-m.w / 2 + 26, m.w / 2 - 26]) g.circle(x, -12, 12).fill(PALETTE.outline);
      c.addChild(g);
    }
    this.container.addChild(c);
    return c;
  }

  sync(movers: readonly Mover[]): void {
    const seen = new Set<string>();
    for (const m of movers) {
      seen.add(m.id);
      let v = this.views.get(m.id);
      if (!v) {
        v = this.build(m);
        this.views.set(m.id, v);
      }
      v.position.set(m.x, m.y);
      // The sheet's cart faces left.
      v.scale.x = m.dir > 0 ? -1 : 1;
      const s = m.onSlope;
      v.rotation = s ? Math.atan2(s.y1 - s.y0, s.x1 - s.x0) : 0;
    }
    for (const [id, v] of this.views)
      if (!seen.has(id)) {
        v.destroy({ children: true });
        this.views.delete(id);
      }
  }

  clear(): void {
    for (const v of this.views.values()) v.destroy({ children: true });
    this.views.clear();
  }

  destroy(): void {
    this.clear();
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
