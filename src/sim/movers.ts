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
  /** A lift between two heights: it rises only while he crouches on it, and comes back down empty. */
  y0?: number;
  y1?: number;
  ride?: "crouch";
  /** He is on it, going up. */
  riding?: boolean;
  /** One way: out from `x0` every `every` s from `first`, in at `x1`, gone between. */
  loop?: 1 | -1;
  every?: number;
  live?: boolean;
  t?: number;
  next?: number;
  first?: number;
  /** A one-way mover's leap: from `x` for `d` px its way it rides a half sine `h` high (3-4's bikes over the ramp). */
  jump?: { x: number; d: number; h: number };
  /** Its floor, the height it rolls at when not in the air. */
  base?: number;
};
export type MoverSpec = { id: string; x: number; y: number; x0: number; x1: number; w: number; h: number; speed: number; y0?: number; y1?: number; ride?: "crouch"; loop?: 1 | -1; every?: number; first?: number; jump?: { x: number; d: number; h: number } };

/** A cart's side costs him a pip once in this long. */
export const MOVER = { hurtEvery: 1.2, liftReach: 24 } as const;

export const createMover = (s: MoverSpec): Mover => ({
  ...s,
  dir: 1,
  cool: 0,
  // A lift's floor is flush with the floor he walks on to it from.
  top: { x0: s.x - s.w / 2, x1: s.x + s.w / 2, y: s.ride ? s.y : s.y - s.h },
  ...(s.loop ? { live: false, t: 0, next: s.first ?? 0 } : {}),
  ...(s.jump ? { base: s.y } : {}),
});

/** A leaping mover's height at `x`: its floor, or the half sine over its jump's stretch. */
export function leapY(m: Pick<Mover, "jump" | "loop" | "base" | "y">, x: number): number {
  const base = m.base ?? m.y;
  if (!m.jump || !m.loop) return base;
  const k = ((x - m.jump.x) * m.loop) / m.jump.d;
  return k > 0 && k < 1 ? base - m.jump.h * Math.sin(Math.PI * k) : base;
}

/** A lift: up while he crouches on it, a hair's reach of its floor; otherwise down to its foot. */
function stepLift(m: Mover, h: HeroState, dt: number): void {
  const on = h.x >= m.top.x0 && h.x <= m.top.x1 && Math.abs(h.y - m.y) <= MOVER.liftReach;
  m.riding = on && h.crouch && (h.onGround || !!m.riding);
  const want = m.riding ? (m.y1 ?? m.y) : (m.y0 ?? m.y);
  const most = m.speed * dt;
  m.y += Math.max(-most, Math.min(most, want - m.y));
  m.top.y = m.y;
  if (!m.riding) return;
  h.y = m.y;
  h.vy = 0;
  h.onGround = true;
}

export type MoverWorld = { hero: HeroState; movers: Mover[]; hits: number[]; stage: Stage };

/**
 * One step of the carts: each rolls, reversing at its ends, carrying whoever stands on it; its side costs him a pip,
 * once in a while, unless he is riding it, in grace or already down.
 */
export function stepMovers(w: MoverWorld, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  for (const m of [...w.movers]) {
    m.cool = Math.max(0, m.cool - dt);
    if (m.ride) {
      stepLift(m, h, dt);
      continue;
    }
    if (m.loop) {
      m.t = (m.t ?? 0) + dt;
      if (!m.live) {
        if (m.t < (m.next ?? 0)) continue;
        m.live = true;
        m.x = m.x0;
        m.next = m.t + (m.every ?? 0);
        events.push({ type: "scooter", id: m.id });
      }
      m.x += m.loop * m.speed * dt;
      m.top.x0 = m.x - m.w / 2;
      m.top.x1 = m.x + m.w / 2;
      if (m.jump) {
        m.y = leapY(m, m.x);
        m.top.y = m.y - m.h;
      }
      if ((m.x - m.x1) * m.loop >= 0) {
        m.live = false;
        m.x = m.x0;
        m.top.x0 = m.x - m.w / 2;
        m.top.x1 = m.x + m.w / 2;
        continue;
      }
    }
    const riding = h.onGround && Math.abs(h.y - m.top.y) < 2 && h.x >= m.top.x0 - 30 && h.x <= m.top.x1 + 30;
    if (!m.loop) m.x += m.dir * m.speed * dt;
    if (m.loop) {
      // Rolling one way, it carries him and hits him as a cart does, below.
    } else if (m.x >= m.x1) {
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
      h.x += (m.loop ?? m.dir) * m.speed * dt;
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
