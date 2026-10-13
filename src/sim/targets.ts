import { FALL_MARGIN, GRAVITY_DOWN } from "./constants";
import type { GameEvent } from "./events";
import { moveBody } from "./physics";
import type { CartLoad, Stage, Target } from "./types";

/**
 * A hotel luggage cart: its brass arch stands a little taller than Hammer, so snot and the mallet both find it.
 * A shoved or bonked cart rolls far on the marble: a runaway, not a bump (R2b).
 */
export const CART = { w: 200, h: 340, friction: 260 } as const;

/** A brass luggage cart stacked with cases: the lobby's practice target. */
export function createCart(id: number, x: number, y = 0, load: CartLoad = "cases"): Target {
  return { id, kind: "cart", x, y, w: CART.w, h: CART.h, vx: 0, vy: 0, onGround: true, flash: 0, spin: 0, chain: 0, load, spilled: false };
}

/** Sent flying: the spec's staff knockback is 1100 px/s and 600 up. */
export function knock(t: Target, dir: 1 | -1, speed: number, lift: number): void {
  t.vx = dir * speed;
  t.vy = -lift;
  t.onGround = false;
  t.flash = 0.06;
  t.spin = dir * 6;
  t.chain = 0;
}

export function stepTargets(targets: Target[], stage: Stage, dt: number, events: GameEvent[] = []): void {
  for (const t of targets) {
    // A dish cart's first knock (the knock's flash is this step's) sends its dishes flying, once.
    if (t.load === "dishes" && !t.spilled && t.flash > 0) {
      t.spilled = true;
      events.push({ type: "dishes", x: t.x, y: t.y - t.h / 2 });
    }
    t.flash = Math.max(0, t.flash - dt);
    if (!t.onGround) t.vy += GRAVITY_DOWN * dt;
    else {
      const f = CART.friction * dt;
      t.vx = Math.abs(t.vx) <= f ? 0 : t.vx - Math.sign(t.vx) * f;
      t.spin *= Math.max(0, 1 - 8 * dt);
    }
    moveBody(t, stage, dt);
  }
  // A cart down a pit is gone.
  const b = stage.bounds;
  for (let i = targets.length - 1; i >= 0; i--) if (targets[i].y > b.y + b.h - FALL_MARGIN) targets.splice(i, 1);
}
