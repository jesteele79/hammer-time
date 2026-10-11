import { HEAD_SCALE } from "./constants";
import type { GameEvent } from "./events";
import { sweptHeadHits } from "./hits";
import { HEAT, SNOT_FIRE_U, moveU } from "./moves";
import { floorAt } from "./physics";
import { ACTIONS } from "./rig/actions";
import { solve } from "./rig/fk";
import { knock } from "./targets";
import type { HeroState, Stage, Target } from "./types";

/** `id` is unique in the world, so the renderer can match a blob across two steps. */
export type Snot = { id: number; x: number; y: number; vx: number; vy: number; life: number; hot: boolean; pierce: number; hit: number[] };
export type Puddle = { x: number; y: number; w: number; life: number; max: number };

/** The shipped embers (280/330 px/s, −40/−30 up, 1.15 s, puddles 15/22 wide for 7/9 s) at the new scale. */
export const SNOT = {
  speed: 1130,
  hotSpeed: 1340,
  vy: -160,
  hotVy: -120,
  gravity: 1215,
  life: 1.15,
  r: 14,
  hotR: 20,
  puddle: 102,
  hotPuddle: 150,
  puddleLife: 7,
  hotPuddleLife: 9,
  puddles: 6,
  /** How far ahead of the nose tip the blob is born, clear of the face. */
  ahead: 30,
} as const;

/** At the snap, once: a blob just ahead of the nose. */
export function fireSnot(h: HeroState, w: { snot: Snot[]; nextSnot: number }, events: GameEvent[]): void {
  const m = h.move;
  if (m?.kind !== "snot" || m.fired || moveU(m) < SNOT_FIRE_U) return;
  m.fired = true;
  const s = solve(ACTIONS.snot(moveU(m)), h.facing, HEAD_SCALE);
  const r = h.hot ? SNOT.hotR : SNOT.r;
  const x = h.x + s.nose.x + h.facing * (SNOT.ahead + r);
  const y = h.y + s.nose.y;
  w.snot.push({
    id: ++w.nextSnot,
    x,
    y,
    vx: h.facing * (h.hot ? SNOT.hotSpeed : SNOT.speed),
    vy: h.hot ? SNOT.hotVy : SNOT.vy,
    life: SNOT.life,
    hot: h.hot,
    pierce: h.hot ? 1 : 0,
    hit: [],
  });
  h.heat = Math.min(100, h.heat + HEAT.snot);
  events.push({ type: "fire", x, y, hot: h.hot });
}

/** Flight, hits on carts (hot snot goes through one), and puddles where it lands. */
export function stepSnot(
  w: { stage: Stage; snot: Snot[]; puddles: Puddle[]; targets: Target[] },
  dt: number,
  events: GameEvent[],
): void {
  for (const b of w.snot) {
    const a = { x: b.x, y: b.y };
    b.vy += SNOT.gravity * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const r = b.hot ? SNOT.hotR : SNOT.r;
    for (const t of w.targets) {
      if (b.life <= 0 || b.hit.includes(t.id)) continue;
      if (!sweptHeadHits(a, b, r, { x: t.x - t.w / 2, y: t.y - t.h, w: t.w, h: t.h })) continue;
      b.hit.push(t.id);
      knock(t, b.vx > 0 ? 1 : -1, 420, 180);
      events.push({ type: "hit", by: "snot", x: b.x, y: b.y, target: t.id });
      events.push({ type: "splat", x: b.x, y: b.y, floor: false, hot: b.hot });
      if (b.pierce > 0) b.pierce--;
      else b.life = 0;
    }
    const floor = floorAt(w.stage, b.x, a.y);
    if (b.life > 0 && floor !== null && b.y >= floor) {
      b.life = 0;
      const life = b.hot ? SNOT.hotPuddleLife : SNOT.puddleLife;
      w.puddles.push({ x: b.x, y: floor, w: b.hot ? SNOT.hotPuddle : SNOT.puddle, life, max: life });
      if (w.puddles.length > SNOT.puddles) w.puddles.shift();
      events.push({ type: "splat", x: b.x, y: floor, floor: true, hot: b.hot });
    }
  }
  w.snot = w.snot.filter((b) => b.life > 0);
  for (const p of w.puddles) p.life -= dt;
  w.puddles = w.puddles.filter((p) => p.life > 0);
}
