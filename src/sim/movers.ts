import type { GameEvent } from "./events";
import { bodyRect, overlapsRect } from "./geometry";
import type { HeroState, Platform, Stage } from "./types";

/** A housekeeping cart on its landing: `x` its middle, `y` the floor under it; `top` the platform he rides on. */
export type Mover = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dir: 1 | -1;
  speed: number;
  x0: number;
  x1: number;
  top: Platform;
  cool: number;
  /** Rolling along a flight: its height there. */
  onSlope?: { x0: number; x1: number; y0: number; y1: number };
  /** Gone once it reaches its far end. */
  once?: boolean;
};
export type MoverSpec = { id: string; x: number; y: number; x0: number; x1: number; w: number; h: number; speed: number };

/** A cart's side costs him a pip once in this long. */
export const MOVER = { hurtEvery: 1.2 } as const;

export const createMover = (s: MoverSpec): Mover => ({
  ...s,
  dir: 1,
  cool: 0,
  top: { x0: s.x - s.w / 2, x1: s.x + s.w / 2, y: s.y - s.h },
});

export type MoverWorld = { hero: HeroState; movers: Mover[]; hits: number[]; stage: Stage };

/**
 * One step of the carts: each rolls, reversing at its ends, carrying whoever stands on it; its side costs him a pip,
 * once in a while, unless he is riding it, in grace or already down.
 */
export function stepMovers(w: MoverWorld, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  for (const m of [...w.movers]) {
    m.cool = Math.max(0, m.cool - dt);
    const riding = h.onGround && Math.abs(h.y - m.top.y) < 2 && h.x >= m.top.x0 - 30 && h.x <= m.top.x1 + 30;
    m.x += m.dir * m.speed * dt;
    if (m.x >= m.x1) {
      m.x = m.x1;
      m.dir = -1;
      if (m.once) {
        w.movers = w.movers.filter((o) => o !== m);
        w.stage.platforms = w.stage.platforms.filter((p) => p !== m.top);
        continue;
      }
    } else if (m.x <= m.x0) {
      m.x = m.x0;
      m.dir = 1;
    }
    m.top.x0 = m.x - m.w / 2;
    m.top.x1 = m.x + m.w / 2;
    if (m.onSlope) {
      const s = m.onSlope;
      const k = Math.min(1, Math.max(0, (m.x - s.x0) / (s.x1 - s.x0)));
      m.y = s.y0 + (s.y1 - s.y0) * k;
      m.top.y = m.y - m.h;
    }
    if (riding) {
      h.x += m.dir * m.speed * dt;
      h.y = m.top.y;
      continue;
    }
    // A slide goes under a cart coming down the flight.
    if (m.onSlope && h.slideT > 0) continue;
    const feetAbove = h.y <= m.top.y + 8;
    const box = { x: m.x - m.w / 2, y: m.y - m.h, w: m.w, h: m.h };
    if (feetAbove || m.cool > 0 || h.invuln > 0 || h.move?.kind === "tumble" || !overlapsRect(bodyRect(h), box)) continue;
    m.cool = MOVER.hurtEvery;
    w.hits.push(m.x);
    events.push({ type: "hit", by: "cart", x: h.x, y: h.y - h.h / 2, target: 0 });
  }
}
