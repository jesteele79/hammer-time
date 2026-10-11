import { HEAD_SCALE } from "./constants";
import type { GameEvent } from "./events";
import { SWING_ACTIVE, moveU, type Move } from "./moves";
import { ACTIONS } from "./rig/actions";
import { solve } from "./rig/fk";
import { knock } from "./targets";
import type { HeroState, Point, Rect, Target } from "./types";

/** The mallet head's reach for contact, world px. */
export const MALLET_R = 36;
/** The super burst's radius (54 px at 50 tall, scaled by HERO_HEIGHT). */
export const BURST_R = 367;

/** A head of radius r moving from a to b touches the rect anywhere along the way (slab test on the grown rect). */
export function sweptHeadHits(a: Point, b: Point, r: number, rect: Rect): boolean {
  let lo = 0;
  let hi = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - rect.x + r],
    [dx, rect.x + rect.w + r - a.x],
    [-dy, a.y - rect.y + r],
    [dy, rect.y + rect.h + r - a.y],
  ]) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return false;
  }
  return true;
}

/** Where the mallet head is at move fraction u, in world px, from the same rig the renderer draws. */
export function malletAt(
  h: Pick<HeroState, "x" | "y" | "facing"> & { move: Pick<Move, "kind"> | null },
  u: number,
): Point {
  const kind = h.move?.kind ?? "swing";
  const j = solve(ACTIONS[kind](u), h.facing, HEAD_SCALE).joints.malletHead;
  return { x: h.x + j.x, y: h.y + j.y };
}

const rectOf = (t: Target): Rect => ({ x: t.x - t.w / 2, y: t.y - t.h, w: t.w, h: t.h });

/** The swing's contact: the arc since the last check, sampled finely, against every cart not yet hit. */
export function swingContact(h: HeroState, targets: Target[], events: GameEvent[]): void {
  const m = h.move;
  if (m?.kind !== "swing") return;
  const u = moveU(m);
  const last = m.lastU < 0 || m.lastU > u ? u : m.lastU;
  m.lastU = u;
  const [lo, hi] = SWING_ACTIVE;
  if (u < lo || last > hi) return;
  const from = Math.max(last, lo);
  const to = Math.min(u, hi);
  const n = Math.max(1, Math.ceil((to - from) / 0.008));
  const path: Point[] = [];
  for (let k = 0; k <= n; k++) path.push(malletAt(h, from + ((to - from) * k) / n));
  // Only the arc in front of him lands: the windmill passes over his head and behind him on the way.
  const ahead = (p: Point) => (p.x - h.x) * h.facing > 0;
  for (const t of targets) {
    if (m.victims.includes(t.id)) continue;
    const r = rectOf(t);
    for (let k = 1; k < path.length; k++)
      if (ahead(path[k]) && sweptHeadHits(path[k - 1], path[k], MALLET_R, r)) {
        m.victims.push(t.id);
        knock(t, h.facing, 1100, 600);
        events.push({ type: "hit", by: "mallet", x: path[k].x, y: path[k].y, target: t.id });
        h.charge = Math.min(10, h.charge + 1);
        break;
      }
  }
}

/** The slam: once, where the mallet meets the floor; every cart within the radius flies away from him, as in the shipped game. */
export function superBurst(h: HeroState, targets: Target[], events: GameEvent[]): void {
  const m = h.move;
  if (m?.kind !== "super" || !m.burst || m.fired) return;
  m.fired = true;
  const head = malletAt(h, Math.max(moveU(m), 0.56));
  const at = { x: head.x, y: h.y };
  events.push({ type: "burst", x: at.x, y: at.y });
  for (const t of targets) {
    const cx = t.x;
    const cy = t.y - t.h / 2;
    if (Math.hypot(cx - at.x, cy - at.y) > BURST_R) continue;
    // Away from Hammer, not from the impact: a cart between him and the mallet must not fly into him.
    const dir = (cx - h.x) * h.facing >= 0 ? h.facing : h.facing === 1 ? -1 : 1;
    knock(t, dir, 1100, 600);
    events.push({ type: "hit", by: "burst", x: cx, y: cy, target: t.id });
  }
}
