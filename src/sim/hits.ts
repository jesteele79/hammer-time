import { POINTS, hittable, npcRect, strikeNpc, type Npc } from "./cast";
import { HEAD_SCALE } from "./constants";
import type { GameEvent } from "./events";
import { SWING_ACTIVE, moveU, type Move } from "./moves";
import { ACTIONS } from "./rig/actions";
import { solve } from "./rig/fk";
import { sweptHeadHits } from "./geometry";
import { COFFEE, PLANE, type Missile } from "./missiles";
import type { Puddle } from "./snot";
import { knock } from "./targets";
import type { HeroState, Point, Rect, Stage, Target } from "./types";

/** The mallet head's reach for contact, world px. */
export const MALLET_R = 36;
/** The super burst's radius (54 px at 50 tall, scaled by HERO_HEIGHT). */
export const BURST_R = 367;
/**
 * The belly-flop's reach, world px: flat on his belly he is drawn out to the middle of the mallet's head `ahead` of the
 * feet point and `tall` off the floor (the `flop` board), so whoever that touches is flopped into; behind him only his
 * own collider's half, so nobody at his trailing feet is thrown the way he slides (owner, 2026-10-18).
 */
export const FLOP_REACH = { ahead: 300, behind: 55, tall: 150 } as const;

/** Belly-flopping: the banquet's move, in the slide it turns into. */
export const flopping = (h: Pick<HeroState, "flop" | "slideT">): boolean => h.flop && h.slideT > 0;
/** What the flop knocks over: the length of him on the floor, the way he slides. */
export const flopRect = (h: Pick<HeroState, "x" | "y" | "facing">): Rect => ({
  x: h.facing === 1 ? h.x - FLOP_REACH.behind : h.x - FLOP_REACH.ahead,
  y: h.y - FLOP_REACH.tall,
  w: FLOP_REACH.ahead + FLOP_REACH.behind,
  h: FLOP_REACH.tall,
});

export { sweptHeadHits } from "./geometry";

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

export type SwingWorld = { targets: Target[]; cast: Npc[]; missiles: Missile[]; puddles: Puddle[]; stage: Stage };

/**
 * The swing's contact: the arc since the last check, sampled finely, against every cart and cast member
 * not yet hit. Returns the part of this step's arc in front of him, for whatever else the mallet can meet.
 */
export function swingContact(h: HeroState, w: SwingWorld, events: GameEvent[]): Point[] {
  const m = h.move;
  if (m?.kind !== "swing") return [];
  const u = moveU(m);
  const last = m.lastU < 0 || m.lastU > u ? u : m.lastU;
  m.lastU = u;
  const [lo, hi] = SWING_ACTIVE;
  if (u < lo || last > hi) return [];
  const from = Math.max(last, lo);
  const to = Math.min(u, hi);
  const n = Math.max(1, Math.ceil((to - from) / 0.008));
  const path: Point[] = [];
  for (let k = 0; k <= n; k++) path.push(malletAt(h, from + ((to - from) * k) / n));
  // Only the arc in front of him lands: the windmill passes over his head and behind him on the way.
  const ahead = (p: Point) => (p.x - h.x) * h.facing > 0;
  for (const t of w.targets) {
    if (m.victims.includes(t.id)) continue;
    const r = rectOf(t);
    for (let k = 1; k < path.length; k++)
      if (ahead(path[k]) && sweptHeadHits(path[k - 1], path[k], MALLET_R, r)) {
        m.victims.push(t.id);
        knock(t, h.facing, 1100, 600);
        events.push({ type: "hit", by: "mallet", x: path[k].x, y: path[k].y, target: t.id });
        break;
      }
  }
  // Staff go down; a student ducks it, and the swing is done with him either way.
  for (const n of w.cast) {
    if (m.victims.includes(n.id) || !hittable(n)) continue;
    const r = npcRect(n);
    for (let k = 1; k < path.length; k++)
      if (ahead(path[k]) && sweptHeadHits(path[k - 1], path[k], MALLET_R, r)) {
        m.victims.push(n.id);
        if (strikeNpc(n, "mallet", h.facing, w, events)) events.push({ type: "hit", by: "mallet", x: path[k].x, y: path[k].y, target: n.id });
        break;
      }
  }
  // A plane in the arc is swatted into confetti; a flung cup is batted down.
  for (const m of w.missiles) {
    if (m.life <= 0) continue;
    const r = m.kind === "plane" ? PLANE.r : COFFEE.r;
    const box = { x: m.x - r, y: m.y - r, w: 2 * r, h: 2 * r };
    for (let k = 1; k < path.length; k++)
      if (ahead(path[k]) && sweptHeadHits(path[k - 1], path[k], MALLET_R, box)) {
        m.life = 0;
        events.push({ type: "swat", kind: m.kind, x: m.x, y: m.y, points: m.kind === "plane" ? POINTS.swat : 0 });
        break;
      }
  }
  return path.filter(ahead);
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
