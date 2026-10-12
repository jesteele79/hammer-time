import { GRAVITY_DOWN } from "./constants";
import { CRATE } from "./crates";
import type { GameEvent } from "./events";
import { rewardAnchors, type Level, type RewardRoute } from "./level";
import { moveBody, type Body } from "./physics";
import type { HeroState, Point, Stage } from "./types";

export type PickupKind = "can" | "nuts" | "bucees" | "pepper";
/** A pickup: seeded ones stand still; one that came out of a crate has a body and moves. */
export type Pickup = {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  taken: boolean;
  /** `top` is where its rise out of the crate ends: the crate's top. */
  body?: Body & { emerge: number; dir: number; top: number };
};

/** The shipped generator (mulberry32), so a seed lays a run out the same way every time. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inRoute = (a: Point, r: RewardRoute) => a.x >= r.x0 && a.x <= r.x1 && a.y >= r.y0 && a.y <= r.y1;

/**
 * The shipped placement: shuffle the anchors, then Buc-ee's, nuts and cans in that order. Each of
 * the level's routes first takes one of each kind from its own shuffled anchors, so no seed leaves
 * a route without one; the totals stay the level's.
 */
export function seedRewards(level: Level, seed: number): Pickup[] {
  const anchors = rewardAnchors(level);
  const rng = seededRandom(seed);
  for (let i = anchors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [anchors[i], anchors[j]] = [anchors[j], anchors[i]];
  }
  const n = Math.min(anchors.length, level.rewards.count);
  const bucees = Math.min(n, level.rewards.bucees);
  const nuts = Math.min(n - bucees, level.rewards.nuts);
  const left: Record<PickupKind, number> = { bucees, nuts, can: n - bucees - nuts, pepper: 0 };
  const out: Pickup[] = [];
  const place = (kind: PickupKind, a: Point) => {
    out.push({ id: out.length + 1, kind, x: a.x, y: a.y, taken: false });
    left[kind]--;
  };
  for (const r of level.routes)
    for (const kind of ["bucees", "nuts", "can"] as const) {
      const i = anchors.findIndex((a) => inRoute(a, r));
      if (i >= 0 && left[kind] > 0) place(kind, anchors.splice(i, 1)[0]);
    }
  for (const kind of ["bucees", "nuts", "can"] as const)
    while (left[kind] > 0 && anchors.length) place(kind, anchors.shift()!);
  return out;
}

/** An item out of a crate rises clear of it, then slides away under gravity and turns back off walls. */
export function stepPickups(pickups: Pickup[], stage: Stage, dt: number): void {
  for (const p of pickups) {
    const b = p.body;
    if (!b || p.taken) continue;
    if (b.emerge > 0) {
      b.emerge = Math.max(0, b.emerge - dt);
      // Ends exactly on the crate's top: a hair inside it and the crate's side would shove it off backward.
      b.y = b.top + (CRATE.size * b.emerge) / CRATE.emerge;
    } else {
      b.vx = CRATE.slide * b.dir;
      b.vy += GRAVITY_DOWN * dt;
      moveBody(b, stage, dt);
      if (b.vx === 0) b.dir = -b.dir;
    }
    p.x = b.x;
    p.y = b.y - b.h / 2;
  }
}

/** Everything his body overlaps is his, once an item is fully out of its crate. Returns the kinds taken. */
export function collectPickups(h: Pick<HeroState, "x" | "y" | "w" | "h">, pickups: Pickup[], events: GameEvent[]): PickupKind[] {
  const got: PickupKind[] = [];
  const half = 35;
  for (const p of pickups) {
    if (p.taken || (p.body && p.body.emerge > 0)) continue;
    if (p.x + half < h.x - h.w / 2 || p.x - half > h.x + h.w / 2 || p.y + half < h.y - h.h || p.y - half > h.y) continue;
    p.taken = true;
    got.push(p.kind);
    events.push({ type: "pickup", kind: p.kind, x: p.x, y: p.y });
  }
  return got;
}
