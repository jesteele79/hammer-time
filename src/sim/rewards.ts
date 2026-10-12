import { rewardAnchors, type Level, type RewardRoute } from "./level";
import type { Body } from "./physics";
import type { Point } from "./types";

export type PickupKind = "can" | "nuts" | "bucees" | "pepper";
/** A pickup: seeded ones stand still; one that came out of a crate has a body and moves. */
export type Pickup = {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  taken: boolean;
  body?: Body & { emerge: number; dir: number };
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
