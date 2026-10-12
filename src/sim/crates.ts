import type { GameEvent } from "./events";
import type { CrateKind, Level } from "./level";
import type { Pickup } from "./rewards";
import type { Rect } from "./types";

/** The shipped 16 px crates at the new scale; a case's cans; an item's rise and slide. */
export const CRATE = { size: 110, bumpLock: 0.16, caseCans: 5, emerge: 0.5, slide: 286 } as const;

export type Crate = {
  id: string;
  kind: CrateKind;
  x: number;
  y: number;
  used: boolean;
  broken: boolean;
  cans: number;
  lock: number;
};
export type CrateHit = "bump" | "mallet" | "burst";
export type CrateContext = { patience: number; star: boolean; hot: boolean };
export type CrateOut = { pickups: Pickup[]; events: GameEvent[]; nextId: () => number };

export const cratesOf = (level: Level): Crate[] =>
  level.crates.map((c) => ({ ...c, used: false, broken: false, cans: 0, lock: 0 }));
export const crateRect = (c: Crate): Rect => ({ x: c.x - CRATE.size / 2, y: c.y - CRATE.size, w: CRATE.size, h: CRATE.size });
/** Every crate stays solid once spent; a broken case is gone. */
export const crateSolids = (crates: Crate[]): Rect[] => crates.filter((c) => !c.broken).map(crateRect);

/** One hit on a crate (the shipped hitBlock): what comes out, whether it is spent, whether a case breaks. */
export function hitCrate(c: Crate, how: CrateHit, ctx: CrateContext, out: CrateOut): void {
  if (c.broken || c.lock > 0) return;
  const top = { x: c.x, y: c.y - CRATE.size };
  if (c.kind === "case") {
    c.lock = CRATE.bumpLock;
    c.cans++;
    out.events.push({ type: "canPop", x: top.x, y: top.y });
    if (c.cans >= CRATE.caseCans || how !== "bump" || ctx.star || ctx.patience >= 2) {
      c.broken = true;
      out.events.push({ type: "caseBreak", x: c.x, y: c.y - CRATE.size / 2 });
    }
    return;
  }
  if (c.used) return;
  c.used = true;
  c.lock = CRATE.bumpLock;
  out.events.push({ type: "crate", id: c.id, kind: c.kind, x: c.x, y: c.y });
  if (c.kind === "can") {
    out.events.push({ type: "canPop", x: top.x, y: top.y });
    return;
  }
  const kind = c.kind === "bucees" ? "bucees" : ctx.hot ? "nuts" : "pepper";
  // It starts inside the crate (bottoms level) and rises out of the top.
  out.pickups.push({
    id: out.nextId(),
    kind,
    x: c.x,
    y: c.y - 35,
    taken: false,
    body: { x: c.x, y: c.y, w: 60, h: 70, vx: 0, vy: 0, onGround: false, emerge: CRATE.emerge, dir: 1 },
  });
}

/** A hit crate's lock runs down, so mashing jump under a case pays at most one can per lock. */
export function stepCrates(crates: Crate[], dt: number): void {
  for (const c of crates) c.lock = Math.max(0, c.lock - dt);
}
