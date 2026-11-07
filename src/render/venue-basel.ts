import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ART_BASE, BASEL_PIECES, type BaselPiece, type Piece, type Registry } from "../art/registry";
import type { Boss } from "../sim/boss";
import type { Level, LevelPlatform } from "../sim/level";
import { leapY, type Mover } from "../sim/movers";
import type { ParadeState } from "../sim/parade";
import { SCENERY_Z } from "./backdrop";
import { INK, THIN } from "./ink";
import { PALETTE } from "./palette";

/** Basel's materials, until the sheet is in. */
const C = { steel: "#9aa3ab", rail: "#6d757d", wood: "#9a6a3e", woodDark: "#6e4728", seat: "#3d5a8a", canvas: "#f2efe6", stripe: "#c0392b", counter: "#7a4f2e", top: "#a87a4f", hull: "#6b4a2e", cable: "#3a3a3a", paper: "#f08a24", paperOff: "#e9d8b8", skin: "#e2b48f", hose: "#f4f3ee", shoe: "#141414", sporran: "#f4f3ee", silver: "#d9dde2" } as const;
/** How tall the sheet's pieces stand, in game px. */
const HEIGHTS = { barrier: 120, bleacher: 520, tent: 300, ferry: 120, lantern: 46, mace: 120 } as const;
/** The ferry's crossing behind the bridge: between these x, its waterline, how long a crossing and its rest take. */
export const FERRY = { x0: 3500, x1: 7500, y: -140, every: 40, cross: 24 } as const;
/** The lanterns' strings over the old town: their run, height and spacing. */
export const LANTERNS = { x0: 7700, x1: 15400, y: -470, every: 160, post: 960 } as const;
/** A band's ranks in depth: how much smaller and higher each one back is drawn; the nearest is the missing one. */
const DEPTH = { step: 0.08, up: 22, ranks: 5 } as const;

export type BaselPieces = Partial<Record<BaselPiece, { texture: Texture; piece: Piece }>>;

/** The sheet's pieces, or none while it is not in (the drawn stand-ins stand); one that fails is left out. */
export async function loadBaselPieces(registry: Registry): Promise<BaselPieces> {
  const listed = registry.basel?.pieces;
  const out: BaselPieces = {};
  if (!listed) return out;
  await Promise.all(
    BASEL_PIECES.map(async (name) => {
      const piece = listed[name];
      if (!piece) return;
      try {
        out[name] = { texture: await Assets.load<Texture>(ART_BASE + piece.file), piece };
      } catch (err) {
        console.warn(`basel piece ${name}: the stand-in draws (${(err as Error).message})`);
      }
    }),
  );
  return out;
}

function standing(art: NonNullable<BaselPieces[BaselPiece]>, height: number, width?: number): Sprite {
  const s = new Sprite(art.texture);
  s.anchor.set(art.piece.base.x / art.piece.width, art.piece.base.y / art.piece.height);
  const k = height / art.piece.height;
  s.scale.set(width ? width / art.piece.width : k, k);
  return s;
}

/** Basel's platforms the venue draws itself: the bleachers and their tiers, the tents (the barriers stand in front of the crowd, in the view). */
export const baselPlatform = (p: LevelPlatform): boolean => p.kind === "bleacher" || p.kind === "tier" || p.kind === "tent" || p.kind === "barrier";

function drawBleacher(g: Graphics, p: LevelPlatform) {
  const w = p.x1 - p.x0;
  g.rect(p.x0, p.y, w, -p.y).fill(C.steel).rect(p.x0, p.y, w, -p.y).stroke(THIN);
  for (let x = p.x0 + 60; x < p.x1 - 20; x += 200) g.rect(x, p.y, 12, -p.y).fill(C.rail);
  for (let k = 0; k < 3; k++) g.rect(p.x0, p.y + k * 26, w, 18).fill(C.seat).rect(p.x0, p.y + k * 26, w, 18).stroke(THIN);
  g.rect(p.x0, p.y - 60, w, 8).fill(C.rail).rect(p.x0, p.y - 60, 8, 60).fill(C.rail).rect(p.x1 - 8, p.y - 60, 8, 60).fill(C.rail);
}

function drawTier(g: Graphics, p: LevelPlatform) {
  g.rect(p.x0, p.y, p.x1 - p.x0, -p.y).fill(C.steel).rect(p.x0, p.y, p.x1 - p.x0, -p.y).stroke(THIN);
  g.rect(p.x0, p.y, p.x1 - p.x0, 18).fill(C.seat).rect(p.x0, p.y, p.x1 - p.x0, 18).stroke(THIN);
}

function drawTent(g: Graphics, p: LevelPlatform) {
  const w = p.x1 - p.x0;
  g.rect(p.x0 + 20, p.y, 14, -p.y).fill(C.rail).rect(p.x1 - 34, p.y, 14, -p.y).fill(C.rail);
  g.poly([p.x0 - 20, p.y, p.x0 + w / 2, p.y - 120, p.x1 + 20, p.y]).fill(C.canvas).poly([p.x0 - 20, p.y, p.x0 + w / 2, p.y - 120, p.x1 + 20, p.y]).stroke(INK);
  for (let x = p.x0 - 20; x < p.x1 + 20; x += 60) g.rect(x, p.y, 30, 24).fill(C.stripe);
  g.rect(p.x0 - 20, p.y, w + 40, 24).stroke(THIN);
  g.rect(p.x0 + 60, -110, w - 120, 110).fill(C.wood).rect(p.x0 + 60, -110, w - 120, 110).stroke(THIN);
}

/** The ramp at the Marktplatz: its high end a face over the flat, down to the floor on the old town's side. */
function drawRamp(root: Container, g: Graphics, level: Level, pieces: BaselPieces) {
  const slope = level.floor.filter((f) => f.kind === "ramp");
  if (!slope.length) return;
  const x0 = Math.min(...slope.map((f) => f.x0));
  const x1 = Math.max(...slope.map((f) => f.x1));
  const top = Math.min(...slope.map((f) => Math.min(f.y0, f.y1)));
  if (pieces.ramp) {
    const s = standing(pieces.ramp, -top, x1 - x0);
    s.position.set((x0 + x1) / 2, 0);
    root.addChild(s);
    return;
  }
  const pts: number[] = [x0, 0];
  for (const f of [...slope].sort((a, b) => a.x0 - b.x0)) pts.push(f.x0, f.y0, f.x1, f.y1);
  pts.push(x1, 0);
  g.poly(pts).fill(C.wood).poly(pts).stroke(INK);
  for (let x = x0 + 40; x < x1; x += 60) g.moveTo(x, 0).lineTo(x, top * (x < x0 + 100 ? 1 : (x1 - x) / (x1 - x0 - 100))).stroke({ width: 2, color: C.woodDark });
}

/** What the venue draws behind Hammer and the crowd: the bleachers, the tents, the ramp, the lanterns' posts and strings. */
export function drawBasel(level: Level, pieces: BaselPieces): Container {
  const root = new Container({ label: "basel" });
  const g = new Graphics();
  root.addChild(g);
  for (const p of level.platforms) {
    const art = p.kind === "bleacher" ? pieces.bleacher : p.kind === "tent" ? pieces.tent : undefined;
    if (art && (p.kind === "bleacher" || p.kind === "tent")) {
      const s = standing(art, -p.y + (p.kind === "tent" ? 120 : 60), p.x1 - p.x0 + (p.kind === "tent" ? 40 : 0));
      s.position.set((p.x0 + p.x1) / 2, 0);
      root.addChild(s);
    } else if (p.kind === "bleacher") drawBleacher(g, p);
    else if (p.kind === "tier") drawTier(g, p);
    else if (p.kind === "tent") drawTent(g, p);
  }
  drawRamp(root, g, level, pieces);
  for (let x = LANTERNS.x0; x <= LANTERNS.x1; x += LANTERNS.post) g.rect(x - 6, LANTERNS.y - 20, 12, -LANTERNS.y + 20).fill(C.rail).rect(x - 6, LANTERNS.y - 20, 12, -LANTERNS.y + 20).stroke(THIN);
  for (let x = LANTERNS.x0; x < LANTERNS.x1; x += LANTERNS.post) g.moveTo(x, LANTERNS.y - 14).quadraticCurveTo(x + LANTERNS.post / 2, LANTERNS.y + 30, x + LANTERNS.post, LANTERNS.y - 14).stroke({ width: 3, color: C.cable });
  return root;
}

/** A piper drawn as a stand-in, facing left: hose, kilt, tunic, the pipes' drones over the shoulder, a glengarry. `rise` 0 to 1 lifts the pipes. */
function drawPiper(g: Graphics, color: string, rise: number, step: number) {
  const swing = Math.sin(step) * 16;
  g.rect(-22 + swing, -120, 18, 120).fill(C.hose).rect(-22 + swing, -120, 18, 120).stroke(THIN);
  g.rect(4 - swing, -120, 18, 120).fill(C.hose).rect(4 - swing, -120, 18, 120).stroke(THIN);
  g.rect(-30, -10, 26, 10).fill(C.shoe).rect(0, -10, 26, 10).fill(C.shoe);
  g.rect(-34, -200, 68, 84).fill("#2f6b4f").rect(-34, -200, 68, 84).stroke(THIN);
  for (let x = -30; x < 30; x += 14) g.rect(x, -200, 4, 84).fill({ color: "#1b1b1b", alpha: 0.35 });
  g.rect(-12, -196, 24, 30).fill(C.sporran);
  g.roundRect(-36, -330, 72, 134, 14).fill(color).roundRect(-36, -330, 72, 134, 14).stroke(INK);
  g.circle(-4, -364, 34).fill(C.skin).circle(-4, -364, 34).stroke(INK);
  g.rect(-34, -404, 62, 22).fill("#1b2033").rect(-34, -404, 62, 22).stroke(THIN);
  // The bag under the far arm, the chanter down in front, the drones up over the shoulder.
  g.ellipse(14, -270, 30, 22).fill("#4b2a5c").stroke(THIN);
  g.moveTo(-30, -280).lineTo(-52, -200).stroke({ width: 7, color: "#1b1b1b" });
  const lift = 0.35 + 0.65 * rise;
  for (let k = 0; k < 3; k++) {
    const len = (70 + k * 18) * lift;
    g.moveTo(20 + k * 6, -284).lineTo(34 + k * 14, -284 - len).stroke({ width: 6, color: "#1b1b1b" });
    g.circle(34 + k * 14, -284 - len, 6).fill(C.silver);
  }
}

/** A drummer of the corps, sticks up on the beat. */
function drawDrummer(g: Graphics, hit: number) {
  g.rect(-20, -120, 16, 120).fill(C.hose).rect(4, -120, 16, 120).fill(C.hose);
  g.rect(-32, -200, 64, 84).fill("#2f4f7f").rect(-32, -200, 64, 84).stroke(THIN);
  g.roundRect(-34, -320, 68, 126, 14).fill("#b8282e").roundRect(-34, -320, 68, 126, 14).stroke(INK);
  g.circle(-2, -352, 32).fill(C.skin).circle(-2, -352, 32).stroke(INK);
  g.rect(-32, -390, 60, 20).fill("#141414");
  g.ellipse(-34, -214, 38, 22).fill(C.silver).ellipse(-34, -214, 38, 22).stroke(INK);
  const up = 60 + hit * 80;
  g.moveTo(-10, -260).lineTo(-40, -260 - up).stroke({ width: 5, color: "#3a2312" });
  g.moveTo(16, -260).lineTo(-6, -260 - up * 0.8).stroke({ width: 5, color: "#3a2312" });
}

/** The band's ranks behind the missing nearest one, five deep: the floor shows through the hole. Built once a band, its pipes at `rise`. */
function bandFigure(color: string, rise: number): Container {
  const c = new Container();
  for (let k = DEPTH.ranks; k >= 1; k--) {
    const piper = new Graphics();
    drawPiper(piper, color, rise, k);
    piper.scale.set(1 - DEPTH.step * k);
    piper.position.set(k * 6, -DEPTH.up * k);
    piper.alpha = 1 - 0.06 * k;
    c.addChild(piper);
  }
  return c;
}

type BandFigure = { node: Container; rise: boolean };

/**
 * Basel's moving parts in the play layer: the bands marching, six deep with the nearest piper missing; the drum corps on its
 * beat; the pipers who follow him; the drum major's mace in the air and its shadow on the floor; the barriers and the counters
 * in front of the crowd and the tellers; the errand's fill; the ferry on its cable behind the bridge; the lanterns lit at dusk.
 * Every figure is built once and moved after.
 */
export class BaselView {
  /** Behind him and the cast: the bands, the corps, the followers, the mace. */
  readonly back = new Container({ label: "basel-back" });
  /** In front of the crowd and the tellers, behind him: the barriers and the counters. */
  readonly front = new Container({ label: "basel-front" });
  /** Behind the venue: the ferry, far off on the river, and the lanterns. */
  readonly far = new Container({ label: "basel-far" });
  private readonly bands = new Map<string, BandFigure>();
  private readonly fixed = new Graphics();
  private readonly fill = new Graphics();
  private readonly ferry = new Container();
  private readonly cable = new Graphics();
  private readonly lanterns = new Graphics();
  private readonly corps: { down: Graphics; up: Graphics }[] = [];
  private readonly followers: Graphics[] = [];
  private readonly mace = new Container();
  private readonly shadow = new Graphics();
  private built: string | null = null;
  private beatT = 9;
  private lastBeat = -1;
  private lit = -1;

  constructor(parent: Container) {
    this.front.addChild(this.fixed);
    this.back.addChild(this.shadow, this.mace, this.fill);
    this.far.addChild(this.cable, this.ferry, this.lanterns);
    this.far.zIndex = SCENERY_Z + 0.5;
    parent.addChild(this.back, this.front, this.far);
    for (let k = 0; k < 4; k++) {
      const down = new Graphics();
      const up = new Graphics();
      drawDrummer(down, 0);
      drawDrummer(up, 1);
      for (const d of [down, up]) {
        d.scale.set(0.86);
        d.visible = false;
        this.back.addChild(d);
      }
      this.corps.push({ down, up });
    }
    for (let i = 0; i < 4; i++) {
      const f = new Graphics();
      drawPiper(f, "#7a1f2b", 1, i);
      f.scale.set(-0.92, 0.92);
      f.alpha = 1 - i * 0.04;
      f.visible = false;
      this.back.addChild(f);
      this.followers.push(f);
    }
    this.shadow.ellipse(0, -4, 46, 10).fill({ color: "#000000", alpha: 0.3 });
  }

  setVisible(on: boolean): void {
    this.back.visible = this.front.visible = this.far.visible = on;
  }

  /** The level's fixed parts, built once a level: the barriers and the errands' counters in front, the ferry and the mace. */
  private build(level: Level, pieces: BaselPieces) {
    if (this.built === level.id) return;
    this.built = level.id;
    const g = this.fixed.clear();
    for (const c of [...this.front.children]) if (c !== g) c.destroy();
    for (const p of level.platforms.filter((q) => q.kind === "barrier")) {
      if (pieces.barrier) {
        const s = standing(pieces.barrier, HEIGHTS.barrier, p.x1 - p.x0);
        s.position.set((p.x0 + p.x1) / 2, 0);
        this.front.addChild(s);
        continue;
      }
      g.rect(p.x0, p.y, p.x1 - p.x0, 10).fill(C.steel).rect(p.x0, p.y, p.x1 - p.x0, 10).stroke(THIN);
      for (let x = p.x0; x <= p.x1; x += 30) g.rect(x - 3, p.y, 6, -p.y).fill(C.rail);
      g.rect(p.x0, -26, p.x1 - p.x0, 8).fill(C.steel);
      g.rect(p.x0 - 10, -8, 40, 8).fill(C.rail).rect(p.x1 - 30, -8, 40, 8).fill(C.rail);
    }
    for (const e of level.errands ?? []) {
      g.rect(e.x - 130, -120, 260, 120).fill(C.counter).rect(e.x - 130, -120, 260, 120).stroke(INK);
      g.rect(e.x - 140, -132, 280, 14).fill(C.top).rect(e.x - 140, -132, 280, 14).stroke(THIN);
    }
    this.cable.clear().moveTo(FERRY.x0 - 400, FERRY.y - 110).lineTo(FERRY.x1 + 400, FERRY.y - 110).stroke({ width: 2, color: C.cable });
    for (const c of [...this.ferry.children]) c.destroy();
    if (pieces.ferry) this.ferry.addChild(standing(pieces.ferry, HEIGHTS.ferry));
    else {
      const f = new Graphics();
      f.poly([-90, -30, 90, -30, 70, 0, -70, 0]).fill(C.hull).poly([-90, -30, 90, -30, 70, 0, -70, 0]).stroke(THIN);
      f.rect(-4, -110, 8, 80).fill(C.rail);
      this.ferry.addChild(f);
    }
    for (const c of [...this.mace.children]) c.destroy();
    if (pieces.mace) {
      const s = standing(pieces.mace, HEIGHTS.mace);
      s.anchor.set(0.5);
      this.mace.addChild(s);
    } else this.mace.addChild(new Graphics().rect(-5, -60, 10, 120).fill("#3a2312").circle(0, -62, 14).fill(C.silver).circle(0, -62, 14).stroke(THIN));
  }

  sync(level: Level, pieces: BaselPieces, parade: ParadeState | null, boss: Boss | null, errand: { x: number; hold: number } | null, time: number, lit: number, dt: number): void {
    this.build(level, pieces);
    // The bands: a figure each, its pipes lifted once it marches; gone when it is.
    const live = new Set<string>();
    for (const b of parade?.bands ?? []) {
      if (b.state !== "rise" && b.state !== "march") continue;
      live.add(b.id);
      let f = this.bands.get(b.id);
      const up = b.state === "march";
      if (!f || f.rise !== up) {
        f?.node.destroy({ children: true });
        f = { node: bandFigure(b.color, up ? 1 : 0.2), rise: up };
        this.back.addChild(f.node);
        this.bands.set(b.id, f);
      }
      f.node.position.set(b.x, up ? -Math.abs(Math.sin(b.x / 40)) * 6 : 0);
    }
    for (const [id, f] of this.bands)
      if (!live.has(id)) {
        f.node.destroy({ children: true });
        this.bands.delete(id);
      }
    // The drum corps by the Rathaus, sticks up on each beat.
    const corps = parade?.corps;
    if (parade && parade.beat !== this.lastBeat) {
      this.lastBeat = parade.beat;
      this.beatT = 0;
    }
    this.beatT += dt;
    this.corps.forEach((d, k) => {
      const x = (corps?.x ?? 0) - 150 + k * 100;
      d.down.position.set(x, 0);
      d.up.position.set(x, 0);
      const hit = this.beatT < 0.25;
      d.up.visible = !!corps && hit;
      d.down.visible = !!corps && !hit;
    });
    // The pipers who follow him, in a file, bobbing as they walk.
    this.followers.forEach((f, i) => {
      const p = parade?.followers[i];
      f.visible = !!p;
      if (p) f.position.set(p.x, -Math.abs(Math.sin(p.walked / 60)) * 8);
    });
    // The drum major's mace, spinning in the air, and its shadow where it will come down.
    const m = boss?.kind === "major" ? boss.mace : null;
    this.mace.visible = this.shadow.visible = !!m;
    if (m) {
      this.mace.position.set(m.x, m.y);
      this.mace.rotation = time * 14;
      this.shadow.position.set(m.x, 0);
    }
    // The errand's fill over its counter while he holds still at it.
    const fill = this.fill.clear();
    if (errand && errand.hold > 0) {
      fill.roundRect(errand.x - 60, -190, 120, 16, 8).fill({ color: "#000000", alpha: 0.45 });
      fill.roundRect(errand.x - 58, -188, 116 * errand.hold, 12, 6).fill(PALETTE.lampGlow);
    }
    // The ferry's crossing on its cable, then its rest at the far bank.
    const t = time % FERRY.every;
    this.ferry.visible = t <= FERRY.cross;
    const k = (1 - Math.cos((Math.PI * Math.min(t, FERRY.cross)) / FERRY.cross)) / 2;
    this.ferry.position.set(FERRY.x0 + (FERRY.x1 - FERRY.x0) * k, FERRY.y);
    this.drawLanterns(lit);
  }

  /** The paper lanterns on their strings: pale by day, orange as they come on (`lit` 0 to 1); redrawn as it changes. */
  private drawLanterns(lit: number) {
    const q = Math.round(lit * 10) / 10;
    if (q === this.lit) return;
    this.lit = q;
    const g = this.lanterns.clear();
    for (let x = LANTERNS.x0 + LANTERNS.every / 2; x < LANTERNS.x1; x += LANTERNS.every) {
      const along = ((x - LANTERNS.x0) % LANTERNS.post) / LANTERNS.post;
      const y = LANTERNS.y + 8 + 176 * along * (1 - along);
      g.circle(x, y, 18).fill(q > 0 ? PALETTE.lampGlow : C.paperOff).circle(x, y, 18).stroke(THIN);
      if (q > 0) g.circle(x, y, 30).fill({ color: C.paper, alpha: 0.35 * q });
    }
  }

  destroy(): void {
    for (const f of this.bands.values()) f.node.destroy({ children: true });
    this.bands.clear();
    if (!this.back.destroyed) this.back.destroy({ children: true });
    if (!this.front.destroyed) this.front.destroy({ children: true });
    if (!this.far.destroyed) this.far.destroy({ children: true });
  }
}

/** A display team's motorbike with its rider, facing left, tipped up its arc over the ramp. */
export function baselMover(m: Pick<Mover, "id" | "w" | "h" | "jump">, pieces: BaselPieces): Container | null {
  if (!m.jump) return null;
  if (pieces.bike) {
    const s = standing(pieces.bike, m.h * 1.9);
    return s;
  }
  const g = new Graphics();
  const w = m.w;
  for (const x of [-w / 2 + 30, w / 2 - 30]) g.circle(x, -28, 28).fill("#1d1d1f").circle(x, -28, 14).fill(C.silver);
  g.poly([-w / 2 + 20, -60, w / 2 - 10, -70, w / 2 - 30, -110, -w / 2 + 50, -100]).fill("#b8282e").poly([-w / 2 + 20, -60, w / 2 - 10, -70, w / 2 - 30, -110, -w / 2 + 50, -100]).stroke(INK);
  g.roundRect(-20, -200, 50, 96, 14).fill("#f4f3ee").roundRect(-20, -200, 50, 96, 14).stroke(THIN);
  g.circle(-2, -226, 26).fill("#f4f3ee").circle(-2, -226, 26).stroke(INK);
  g.rect(-28, -232, 22, 12).fill("#2a2a2e");
  g.moveTo(-14, -170).lineTo(-w / 2 + 40, -112).stroke({ width: 8, color: "#f4f3ee" });
  return g;
}

/** A leaping mover's tilt: the arc's slope where it is. */
export const leapTilt = (m: Pick<Mover, "jump" | "loop" | "base" | "y" | "x">): number => {
  if (!m.jump || !m.loop) return 0;
  const dy = leapY(m, m.x + m.loop * 10) - leapY(m, m.x - m.loop * 10);
  return Math.atan2(dy, 20 * m.loop) * 0.5;
};
