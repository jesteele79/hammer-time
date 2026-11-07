import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ART_BASE, LAB_PIECES, type LabPiece, type Piece, type Registry } from "../art/registry";
import { zoneOn } from "../sim/hazards";
import type { Level } from "../sim/level";
import type { Mover } from "../sim/movers";
import { INK, THIN } from "./ink";

/** The office's materials, until the sheet is in. */
const C = { steel: "#c9cfd4", rail: "#8d939c", sheet: "#f4f3ee", mattress: "#9fc3d8", bag: "#e8f2f7", base: "#5a6068", yellow: "#f2c14e", red: "#c0392b", vend: "#b8282e", glass: "#2a3a4a", can: "#d7263d", autoclave: "#aab1b8", door: "#6f8fa8", window: "#cde6f2" } as const;
/** How tall the sheet's pieces stand, in game px. */
const HEIGHTS = { vending: 240, autoclave: 220, sharps: 90 } as const;
/** The autoclave's cabinet stands at the steam patch; its puff and a spray's mist, in seconds. */
const STEAM = { puff: 0.15 } as const;
const MIST = { life: 0.45, r: 70 } as const;

export type LabPieces = Partial<Record<LabPiece, { texture: Texture; piece: Piece }>>;

/** The sheet's pieces, or none while it is not in (the drawn stand-ins stand); one that fails is left out. */
export async function loadLabPieces(registry: Registry): Promise<LabPieces> {
  const listed = registry.lab?.pieces;
  const out: LabPieces = {};
  if (!listed) return out;
  await Promise.all(
    LAB_PIECES.map(async (name) => {
      const piece = listed[name];
      if (!piece) return;
      try {
        out[name] = { texture: await Assets.load<Texture>(ART_BASE + piece.file), piece };
      } catch (err) {
        console.warn(`lab piece ${name}: the stand-in draws (${(err as Error).message})`);
      }
    }),
  );
  return out;
}

function standing(art: NonNullable<LabPieces[LabPiece]>, height: number, width?: number): Sprite {
  const s = new Sprite(art.texture);
  s.anchor.set(art.piece.base.x / art.piece.width, art.piece.base.y / art.piece.height);
  const k = height / art.piece.height;
  s.scale.set(width ? width / art.piece.width : k, k);
  return s;
}

/** A vending machine against the wall: red, a glass front with rows of cans, its slot; dimmed once it has paid. */
export function drawVending(g: Graphics, used: boolean) {
  const w = 150;
  const h = HEIGHTS.vending;
  g.roundRect(-w / 2, -h, w, h, 8).fill(used ? "#7a3a3a" : C.vend).roundRect(-w / 2, -h, w, h, 8).stroke(INK);
  g.rect(-w / 2 + 14, -h + 20, w - 54, h - 70).fill(C.glass).rect(-w / 2 + 14, -h + 20, w - 54, h - 70).stroke(THIN);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.roundRect(-w / 2 + 22 + c * 28, -h + 32 + r * 40, 18, 30, 4).fill(used ? "#5a2a2a" : C.can);
  g.rect(w / 2 - 34, -h + 40, 22, 60).fill(C.base);
  g.rect(-w / 2 + 14, -38, w - 28, 22).fill("#1b1b1b");
}

/** What the office draws behind him: the gurney bays' frames, the autoclave's cabinet, the sharps bins on the counters. */
export function drawLab(level: Level, pieces: LabPieces): Container {
  const root = new Container({ label: "lab" });
  const g = new Graphics();
  root.addChild(g);
  for (const m of (level.movers ?? []).filter((x) => x.id.startsWith("gurney"))) {
    const x0 = m.x0 - m.w / 2 - 20;
    const x1 = m.x1 + m.w / 2 + 20;
    g.rect(x0, -8, x1 - x0, 8).fill({ color: C.yellow, alpha: 0.6 });
    for (const x of [x0, x1]) g.rect(x - 8, -320, 16, 320).fill(C.rail).rect(x - 8, -320, 16, 320).stroke(THIN);
    g.rect(x0, -330, x1 - x0, 14).fill(C.rail);
  }
  for (const z of level.heat ?? []) {
    if (z.kind !== "steam") continue;
    const x = (z.x0 + z.x1) / 2;
    if (pieces.autoclave) {
      const s = standing(pieces.autoclave, HEIGHTS.autoclave);
      s.position.set(x, 0);
      root.addChild(s);
    } else {
      g.roundRect(x - 110, -HEIGHTS.autoclave, 220, HEIGHTS.autoclave, 10).fill(C.autoclave).roundRect(x - 110, -HEIGHTS.autoclave, 220, HEIGHTS.autoclave, 10).stroke(INK);
      g.circle(x - 20, -120, 62).fill("#8d939c").circle(x - 20, -120, 62).stroke(INK).circle(x - 20, -120, 40).fill("#c9cfd4");
      g.circle(x + 70, -170, 16).fill("#f4f3ee").circle(x + 70, -170, 16).stroke(THIN);
    }
    g.rect(z.x0, -6, z.x1 - z.x0, 6).fill({ color: "#9fd6ff", alpha: 0.5 });
  }
  for (const s of level.sharps ?? []) {
    if (pieces.sharps) {
      const sp = standing(pieces.sharps, s.h);
      sp.position.set(s.x + s.w / 2, s.y + s.h);
      root.addChild(sp);
      continue;
    }
    g.roundRect(s.x, s.y + 16, s.w, s.h - 16, 8).fill(C.yellow).roundRect(s.x, s.y + 16, s.w, s.h - 16, 8).stroke(INK);
    g.rect(s.x - 4, s.y + 4, s.w + 8, 16).fill(C.red).rect(s.x - 4, s.y + 4, s.w + 8, 16).stroke(THIN);
  }
  return root;
}

/** A gurney or an IV pole on its mover, facing the way it rolls: the sheet's, or drawn. Null for any other mover. */
export function labMover(m: Pick<Mover, "id" | "w" | "h">, pieces: LabPieces): Container | null {
  const gurney = m.id.startsWith("gurney");
  if (!gurney && !m.id.startsWith("iv")) return null;
  const art = gurney ? pieces.gurney : pieces.iv;
  if (art) return standing(art, gurney ? m.h * 1.1 : m.h * 4.2, gurney ? m.w * 1.05 : undefined);
  const g = new Graphics();
  if (gurney) {
    g.rect(-m.w / 2, -m.h, m.w, 26).fill(C.steel).rect(-m.w / 2, -m.h, m.w, 26).stroke(INK);
    g.roundRect(-m.w / 2 + 6, -m.h - 22, m.w - 12, 24, 8).fill(C.mattress).roundRect(-m.w / 2 + 6, -m.h - 22, m.w - 12, 24, 8).stroke(THIN);
    g.rect(-m.w / 2 + 10, -m.h - 26, m.w - 20, 8).fill(C.sheet);
    for (const x of [-m.w / 2 + 22, m.w / 2 - 22]) g.rect(x - 5, -m.h + 26, 10, m.h - 46).fill(C.rail).circle(x, -12, 12).fill("#1d1d1f");
    g.rect(-m.w / 2, -m.h - 60, 8, 40).fill(C.rail).rect(m.w / 2 - 8, -m.h - 60, 8, 40).fill(C.rail);
  } else {
    // A low wheeled base, the pole up from it, the bag hung at its top: only the base is in his way.
    for (let k = -2; k <= 2; k++) g.circle(k * 14, -8, 8).fill("#1d1d1f");
    g.rect(-m.w / 2, -m.h, m.w, 18).fill(C.base).rect(-m.w / 2, -m.h, m.w, 18).stroke(THIN);
    g.rect(-4, -m.h * 4, 8, m.h * 3).fill(C.rail);
    g.roundRect(-22, -m.h * 4 + 6, 44, 60, 10).fill(C.bag).roundRect(-22, -m.h * 4 + 6, 44, 60, 10).stroke(THIN);
  }
  return g;
}

/** The office's moving parts: the autoclave's puffs while it vents, the mist of a nurse's spray. */
export class LabView {
  readonly container = new Container({ label: "lab-view" });
  private readonly g = new Graphics();
  private puffT = 0;
  private mists: { x: number; y: number; t: number }[] = [];

  constructor(parent: Container) {
    this.container.addChild(this.g);
    parent.addChild(this.container);
  }

  setVisible(on: boolean): void {
    this.container.visible = on;
  }

  /** A nurse's sanitizer, sprayed at his feet. */
  spray(x: number, y: number): void {
    this.mists.push({ x, y, t: 0 });
  }

  sync(level: Level, time: number, dt: number): void {
    const g = this.g.clear();
    this.puffT += dt;
    for (const z of level.heat ?? []) {
      if (z.kind !== "steam" || !zoneOn(z, time)) continue;
      const x = (z.x0 + z.x1) / 2;
      for (let k = 0; k < 5; k++) {
        const up = ((this.puffT / STEAM.puff + k) % 5) / 5;
        g.circle(x - 60 + k * 30, -40 - up * 260, 26 + up * 40).fill({ color: "#ffffff", alpha: 0.35 * (1 - up) });
      }
    }
    this.mists = this.mists.filter((m) => (m.t += dt) < MIST.life);
    for (const m of this.mists) {
      const k = m.t / MIST.life;
      g.ellipse(m.x, m.y - 40, MIST.r * (0.6 + k), 40 * (0.6 + k)).fill({ color: "#cfeefa", alpha: 0.5 * (1 - k) });
    }
  }

  destroy(): void {
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
