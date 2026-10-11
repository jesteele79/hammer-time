import { GRAVITY_DOWN } from "./constants";
import { moveBody } from "./physics";
import type { Stage, Target } from "./types";

/** A hotel luggage cart: its brass arch stands a little taller than Hammer, so snot and the mallet both find it. */
export const CART = { w: 200, h: 340, friction: 900 } as const;

/** A brass luggage cart stacked with cases: the lobby's practice target. */
export function createCart(id: number, x: number, y = 0): Target {
  return { id, kind: "cart", x, y, w: CART.w, h: CART.h, vx: 0, vy: 0, onGround: true, flash: 0, spin: 0 };
}

/** Sent flying: the spec's staff knockback is 1100 px/s and 600 up. */
export function knock(t: Target, dir: 1 | -1, speed: number, lift: number): void {
  t.vx = dir * speed;
  t.vy = -lift;
  t.onGround = false;
  t.flash = 0.06;
  t.spin = dir * 6;
}

export function stepTargets(targets: Target[], stage: Stage, dt: number): void {
  for (const t of targets) {
    t.flash = Math.max(0, t.flash - dt);
    if (!t.onGround) t.vy += GRAVITY_DOWN * dt;
    else {
      const f = CART.friction * dt;
      t.vx = Math.abs(t.vx) <= f ? 0 : t.vx - Math.sign(t.vx) * f;
      t.spin *= Math.max(0, 1 - 8 * dt);
    }
    moveBody(t, stage, dt);
  }
}
