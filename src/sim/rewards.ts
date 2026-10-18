import { GRAVITY_DOWN } from "./constants";
import { CRATE } from "./crates";
import type { GameEvent } from "./events";
import { PICKUP_SIZE, rewardAnchors, type Anchor, type Level, type RewardRoute } from "./level";
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

/** No stretch this long between his start and the exit lies bare, whatever the seed (owner, 2026-10-18). */
export const SPREAD = 1600;
/** What a beaten staffer drops jumps this fast out of them, then falls and stays where it lands. */
export const DROP = { pop: 1000 } as const;

/**
 * The shipped placement, made to take work (owner, 2026-10-18: "he should have to work for them"): shuffle the anchors;
 * Buc-ee's and nuts lie only up on platforms, a jump to reach, and any the platforms have no room for are cans. Each of
 * the level's routes first takes one of each kind that fits its own anchors; then the rest of the Buc-ee's and nuts; then
 * a can in every SPREAD-wide stretch from his start to the exit that is still bare; then the rest of the cans.
 */
export function seedRewards(level: Level, seed: number): Pickup[] {
  const anchors = rewardAnchors(level);
  const rng = seededRandom(seed);
  for (let i = anchors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [anchors[i], anchors[j]] = [anchors[j], anchors[i]];
  }
  const n = Math.min(anchors.length, level.rewards.count);
  const raised = anchors.filter((a) => a.raised).length;
  const bucees = Math.min(n, raised, level.rewards.bucees);
  const nuts = Math.min(n - bucees, raised - bucees, level.rewards.nuts);
  const left: Record<PickupKind, number> = { bucees, nuts, can: n - bucees - nuts, pepper: 0 };
  const out: Pickup[] = [];
  const fits = (kind: PickupKind, a: Anchor) => kind === "can" || a.raised;
  const take = (kind: PickupKind, where: (a: Anchor) => boolean) => {
    const i = left[kind] > 0 ? anchors.findIndex((a) => fits(kind, a) && where(a)) : -1;
    if (i < 0) return;
    const a = anchors.splice(i, 1)[0];
    out.push({ id: out.length + 1, kind, x: a.x, y: a.y, taken: false });
    left[kind]--;
  };
  const kinds = ["bucees", "nuts", "can"] as const;
  for (const r of level.routes) for (const kind of kinds) take(kind, (a) => inRoute(a, r));
  for (const kind of ["bucees", "nuts"] as const) while (left[kind] > 0 && anchors.some((a) => fits(kind, a))) take(kind, () => true);
  // A route's can may have taken the room a later bag needed: those are cans too.
  left.can += left.bucees + left.nuts;
  left.bucees = left.nuts = 0;
  const exit = level.doors.find((d) => d.kind === "exit");
  const end = exit ? exit.x : level.length;
  for (let x0 = level.spawn.x; x0 < end; x0 += SPREAD) {
    const x1 = Math.min(x0 + SPREAD, end);
    if (!out.some((p) => p.x >= x0 && p.x < x1)) take("can", (a) => a.x >= x0 && a.x < x1);
  }
  while (left.can > 0 && anchors.length) take("can", () => true);
  return out;
}

/** What a beaten staffer was carrying, jumping out of them at their middle: it falls and stays where it lands. */
export function dropPickup(id: number, kind: PickupKind, x: number, y: number): Pickup {
  const h = PICKUP_SIZE;
  return { id, kind, x, y, taken: false, body: { x, y: y + h / 2, w: 60, h, vx: 0, vy: -DROP.pop, onGround: false, emerge: 0, dir: 0, top: y + h / 2 } };
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
