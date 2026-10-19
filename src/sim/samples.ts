import { freezeNpc, npcRect, standing, type Npc } from "./cast";
import { HEAD_SCALE } from "./constants";
import type { GameEvent } from "./events";
import { overlapsRect } from "./geometry";
import { sweptHeadHits } from "./hits";
import { LOB_COOLDOWN, moveU } from "./moves";
import { floorAt } from "./physics";
import { pigRect, type Pig } from "./pig";
import { ACTIONS, LOB_RELEASE } from "./rig/actions";
import { solve } from "./rig/fk";
import type { HeroState, Point, Stage, Target } from "./types";

/**
 * A box of #15 blades lobbed underhand (R5 §9): a light box, a free sample nobody wanted. It freezes the first staffer or
 * student on their feet it meets, birds round their head; the pig, a cart and a wall stop it with no effect.
 */
export const SAMPLE = { vx: 620, vy: -650, gravity: 1800, r: 22, cd: LOB_COOLDOWN, freeze: 1.5, points: 50, fade: 0.6 } as const;
/** Lower than this a box has fallen out of the level (down the shaft): it is gone. */
const GONE = 2000;
/** `landed` -1 in the air, else seconds lying on the floor; `hit` once it has met anything: it only falls after that. */
export type Sample = { id: number; x: number; y: number; vx: number; vy: number; landed: number; hit: boolean };

/** At the lob's release, once: a box leaves his free hand. */
export function fireSample(h: HeroState, w: { samples: Sample[]; nextSample: number }, events: GameEvent[]): void {
  const m = h.move;
  if (m?.kind !== "lob" || m.fired || moveU(m) < LOB_RELEASE) return;
  m.fired = true;
  if (h.boxes <= 0) return;
  const hand = solve(ACTIONS.lob(moveU(m)), h.facing, HEAD_SCALE).joints.handFar;
  const x = h.x + hand.x;
  const y = h.y + hand.y;
  h.boxes--;
  w.samples.push({ id: ++w.nextSample, x, y, vx: h.facing * SAMPLE.vx, vy: SAMPLE.vy, landed: -1, hit: false });
  events.push({ type: "sampleThrow", x, y });
}

function stop(b: Sample, on: "pig" | "cart" | "wall", events: GameEvent[]) {
  b.hit = true;
  b.vx = 0;
  events.push({ type: "sampleStop", x: b.x, y: b.y, on });
}

/** Flight, the first thing it meets, and the floor; a box lies a moment, then it is gone. */
export function stepSamples(w: { stage: Stage; samples: Sample[]; targets: Target[]; cast: Npc[]; pig?: Pig | null }, dt: number, events: GameEvent[]): void {
  const r = SAMPLE.r;
  for (const b of w.samples) {
    if (b.landed >= 0) {
      b.landed += dt;
      continue;
    }
    const a: Point = { x: b.x, y: b.y };
    b.vy += SAMPLE.gravity * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (!b.hit) {
      const box = { x: b.x - r, y: b.y - r, w: 2 * r, h: 2 * r };
      const pig = w.pig;
      if ([...w.stage.solids, ...w.stage.passes].some((s) => overlapsRect(box, s))) stop(b, "wall", events);
      else if (w.targets.some((t) => sweptHeadHits(a, b, r, { x: t.x - t.w / 2, y: t.y - t.h, w: t.w, h: t.h }))) stop(b, "cart", events);
      else if (pig && sweptHeadHits(a, b, r, pigRect(pig))) stop(b, "pig", events);
      else {
        const n = w.cast.find((n) => standing(n) && sweptHeadHits(a, b, r, npcRect(n)));
        if (n) {
          b.hit = true;
          b.vx = 0;
          freezeNpc(n, SAMPLE.freeze, true, a);
          events.push({ type: "sampleHit", id: n.id, role: n.role, x: b.x, y: b.y, points: SAMPLE.points });
        }
      }
    }
    const floor = floorAt(w.stage, b.x, a.y);
    if (floor !== null && b.y >= floor) {
      b.y = floor;
      b.vx = b.vy = 0;
      b.landed = 0;
      events.push({ type: "sampleStop", x: b.x, y: floor, on: "floor" });
    }
  }
  w.samples = w.samples.filter((b) => b.landed < SAMPLE.fade && b.y < GONE);
}
