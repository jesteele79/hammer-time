import { SPILL, type Npc } from "./cast";
import type { GameEvent } from "./events";
import { bodyRect, overlapsRect, sweptHeadHits } from "./geometry";
import { floorAt } from "./physics";
import { SNOT, type Puddle } from "./snot";
import type { HeroState, Point, Stage } from "./types";

export type MissileKind = "plane" | "coffee";
/** Something thrown at him: `phase` seeds a plane's wobble, `from` is the thrower. */
export type Missile = { id: number; kind: MissileKind; x: number; y: number; vx: number; vy: number; spin: number; life: number; phase: number; from: number };

/** A paper plane: launched level, held up by lift while it is fast, dipping as drag bleeds the speed. */
export const PLANE = { speed: 520, gravity: 900, lift: 900 / (520 * 520), drag: 0.35, life: 2.4, r: 22, wobble: 40, aimUp: -150, aimDown: 250, hand: 0.75 } as const;
/** The office worker's coffee: a hot arc from the hand. */
export const COFFEE = { speed: 700, up: -420, gravity: 2200, life: 1.5, r: 16, hand: 0.55 } as const;

export type MissileWorld = { stage: Stage; hero: HeroState; missiles: Missile[]; hits: number[]; puddles: Puddle[] };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
type Thrower = Pick<Npc, "id" | "x" | "y" | "h" | "facing">;

/** From the hand, aimed where he is now: a plane dips toward a target below and climbs a little to one above. */
export function launchPlane(id: number, from: Thrower, target: Point): Missile {
  const y = from.y - from.h * PLANE.hand;
  const dx = target.x - from.x;
  const dir = Math.sign(dx) || from.facing;
  const vy = clamp((PLANE.speed * (target.y - y)) / Math.max(200, Math.abs(dx)), PLANE.aimUp, PLANE.aimDown);
  return { id, kind: "plane", x: from.x + dir * 40, y, vx: dir * PLANE.speed, vy, spin: 0, life: PLANE.life, phase: id * 1.3, from: from.id };
}

export function launchCoffee(id: number, from: Thrower, target: Point): Missile {
  const dir = Math.sign(target.x - from.x) || from.facing;
  return { id, kind: "coffee", x: from.x + dir * 40, y: from.y - from.h * COFFEE.hand, vx: dir * COFFEE.speed, vy: COFFEE.up, spin: 0, life: COFFEE.life, phase: 0, from: from.id };
}

function puddleAt(w: MissileWorld, x: number, y: number) {
  const s = SPILL.coffee;
  w.puddles.push({ x, y, w: s.w, life: s.life, max: s.life, kind: "coffee" });
  if (w.puddles.length > SNOT.puddles) w.puddles.shift();
}

/** Flight, the floor and the walls, and him: a hit costs a pip unless he is in grace or down, when it passes through. */
export function stepMissiles(w: MissileWorld, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  const heroRect = bodyRect(h);
  const open = h.invuln <= 0 && h.move?.kind !== "tumble";
  for (const m of w.missiles) {
    const a = { x: m.x, y: m.y };
    if (m.kind === "plane") {
      // Lift holds it up while it is fast; drag bleeds the speed, so it dips as it goes.
      m.vy += (PLANE.gravity - PLANE.lift * m.vx * m.vx) * dt;
      m.vx *= Math.max(0, 1 - PLANE.drag * dt);
      m.phase += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt + Math.sin(m.phase * 9) * PLANE.wobble * dt;
      m.spin = Math.atan2(m.vy, m.vx);
    } else {
      m.vy += COFFEE.gravity * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.spin += 9 * dt;
    }
    m.life -= dt;
    const r = m.kind === "plane" ? PLANE.r : COFFEE.r;
    const b = w.stage.bounds;
    if (m.x < b.x || m.x > b.x + b.w || m.y > b.y + b.h) {
      m.life = 0;
      continue;
    }
    if (open && sweptHeadHits(a, m, r, heroRect)) {
      m.life = 0;
      w.hits.push(m.x);
      events.push({ type: "missileHit", kind: m.kind, x: m.x, y: m.y, floor: false, hero: true });
      if (m.kind === "coffee") puddleAt(w, h.x, h.y);
      continue;
    }
    const floor = floorAt(w.stage, m.x, a.y);
    const onFloor = floor !== null && m.y >= floor;
    const plat = w.stage.platforms.find((p) => m.x >= p.x0 && m.x <= p.x1 && a.y <= p.y && m.y >= p.y);
    const wall = [...w.stage.solids, ...w.stage.passes].find((s) => overlapsRect({ x: m.x - r, y: m.y - r, w: 2 * r, h: 2 * r }, s));
    if (onFloor || plat || wall) {
      m.life = 0;
      const y = onFloor ? floor! : plat ? plat.y : m.y;
      events.push({ type: "missileHit", kind: m.kind, x: m.x, y, floor: onFloor || !!plat, hero: false });
      if (m.kind === "coffee" && (onFloor || plat)) puddleAt(w, m.x, y);
    }
  }
  w.missiles = w.missiles.filter((m) => m.life > 0);
}
