import { BURST_R, MALLET_R } from "./hits";
import { BOSS_ID } from "./supervisor";
import type { GameEvent } from "./events";
import { CABIN, shove } from "./flight";
import { laterallyNear, sideways, sweptHeadHits } from "./geometry";
import type { BossSpec } from "./level";
import type { HeroState, Point, Rect, Stage } from "./types";

export type PurserState = "wait" | "push" | "rest" | "hurt" | "down";
/** The purser at the curtain (story spec §9.1): `x` her middle at row 3; her cart, `z` meters down the cabin. */
export type Purser = {
  kind: "purser";
  x: number;
  y: number;
  lx: number;
  w: number;
  h: number;
  facing: -1;
  state: PurserState;
  hp: number;
  max: number;
  /** She has seen him. */
  awake: boolean;
  /** How many times she has pushed. */
  pushes: number;
  timer: number;
  /** Seconds before another hit counts. */
  hurtT: number;
  flinch: number;
  cart: { z: number; live: boolean };
};

export const PURSER = { hp: 3, notice: 6, push: { reach: 2, cover: 1.5, every: 4 }, rest: 2.5, flinch: 0.3, points: 1500, hurt: 0.45, w: 100, h: 330, block: 70, shove: 10, home: 0.7, roll: 5 } as const;

export const createPurser = (b: BossSpec): Purser => ({ kind: "purser", x: b.x, y: 0, lx: 0, w: PURSER.w, h: PURSER.h, facing: -1, state: "wait", hp: PURSER.hp, max: PURSER.hp, awake: false, pushes: 0, timer: 0, hurtT: 0, flinch: 0, cart: { z: b.x / 100 - PURSER.home, live: false } });

export const purserRect = (p: Purser): Rect => ({ x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h });

export type PurserWorld = { hero: HeroState; stage: Stage; swing: Point[] };

/** A hit on her: only between her pushes, one at a time; at the third she pulls the curtain back. */
export function hitPurser(p: Purser, by: "bonk" | "snot", events: GameEvent[]): boolean {
  if ((p.state !== "rest" && p.state !== "wait") || p.hurtT > 0) return false;
  p.awake = true;
  p.hurtT = PURSER.hurt;
  p.flinch = PURSER.flinch;
  p.hp = Math.max(0, p.hp - 1);
  events.push({ type: "bossHit", by, x: p.x, y: p.y - p.h * 0.6, hp: p.hp });
  if (p.hp > 0) {
    p.state = "hurt";
    return true;
  }
  p.state = "down";
  p.cart.live = false;
  events.push({ type: "bossSay", text: "Sir... please.", seconds: 2.4 });
  events.push({ type: "curtain" });
  events.push({ type: "bossDown", x: p.x, y: p.y - p.h, points: PURSER.points });
  return true;
}

function push(p: Purser, events: GameEvent[]) {
  p.state = "push";
  p.pushes++;
  p.timer = PURSER.push.cover;
  p.cart.live = true;
  events.push({ type: "bossWave", x: p.x, y: p.y - p.h / 2, n: p.pushes });
}

/** Her pushes and her rests; he is held on this side of the curtain until she is down. */
export function stepPurser(p: Purser, w: PurserWorld, dt: number, events: GameEvent[]): void {
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.flinch = Math.max(0, p.flinch - dt);
  if (p.state === "down") return;
  const h = w.hero;
  const stop = p.x - PURSER.block;
  if (h.x > stop) {
    h.x = stop;
    h.vx = Math.min(0, h.vx);
  }
  if (p.state === "wait") {
    if (p.x - h.x > PURSER.notice * 100) return;
    p.awake = true;
    push(p, events);
    return;
  }
  // The mallet's arc this step (once a swing), and the smash's burst.
  const r = purserRect(p);
  const m = h.move;
  if (m?.kind === "swing" && !m.victims.includes(BOSS_ID) && !sideways(w.stage, h, p))
    for (let k = 0; k < w.swing.length; k++) {
      if (!sweptHeadHits(w.swing[Math.max(0, k - 1)], w.swing[k], MALLET_R, r)) continue;
      if (hitPurser(p, "bonk", events)) m.victims.push(BOSS_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(p.x - burst.x, p.y - p.h / 2 - burst.y) <= BURST_R && !sideways(w.stage, h, p)) hitPurser(p, "bonk", events);
  if ((p.state as PurserState) === "down") return;
  p.timer -= dt;
  // Her cart rolls out to its reach while she pushes, and back to her hands.
  const homeZ = p.x / 100 - (p.state === "push" ? PURSER.push.reach : PURSER.home);
  p.cart.z += Math.max(-PURSER.roll * dt, Math.min(PURSER.roll * dt, homeZ - p.cart.z));
  if (p.state === "push") {
    // The cart stands across the aisle from its reach back to her: in a row lane it passes.
    const z = h.x / 100;
    if (z >= p.x / 100 - PURSER.push.reach - CABIN.cartReach && laterallyNear(h, { lx: 0 }, CABIN.cartLane)) shove(h, w.stage, PURSER.shove, events);
    if (p.timer > 0) return;
    p.cart.live = false;
    p.state = "rest";
    p.timer = PURSER.rest;
    return;
  }
  if (p.state === "hurt" && p.hurtT <= 0) p.state = "rest";
  if (p.state === "rest" && p.timer <= 0) push(p, events);
}
