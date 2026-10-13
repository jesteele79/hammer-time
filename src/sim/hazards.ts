import { CHAIN, hittable, strikeNpc, type Npc } from "./cast";
import type { GameEvent } from "./events";
import type { Puddle } from "./snot";
import type { HeroState, Point, Stage } from "./types";

/** A stretch of counter or floor that heats him (a flat-top) or cools him (the walk-in freezer) while he stands on it: heat a second. */
export type HeatZone = { x0: number; x1: number; y: number; rate: number; kind: "flattop" | "freezer" };
/** How far his feet may be from a zone's surface and still be on it. */
const ON = 4;

/** The zone he stands on now, or null: standing on it counts, passing over it in the air does not. */
export function heatZoneAt(stage: Pick<Stage, "heat">, h: Pick<HeroState, "x" | "y" | "onGround">): HeatZone | null {
  if (!h.onGround) return null;
  return stage.heat?.find((z) => h.x >= z.x0 && h.x <= z.x1 && Math.abs(h.y - z.y) <= ON) ?? null;
}

/** Heat on or off at the zone's rate, kept within 0 and 100, with a `heatZone` event as he steps onto one. Returns the zone he is on. */
export function stepHeatZones(h: HeroState, stage: Stage, dt: number, was: HeatZone | null, events: GameEvent[]): HeatZone | null {
  const z = heatZoneAt(stage, h);
  if (z) h.heat = Math.min(100, Math.max(0, h.heat + z.rate * dt));
  if (z && z !== was) events.push({ type: "heatZone", kind: z.kind, x: h.x, y: h.y });
  return z;
}

/** The kitchen's swinging door: at rest, banging open the way its server rushes through, or slammed away from him by the mallet. */
export type SwingDoor = {
  id: string;
  x: number;
  y: number;
  /** The spawn id of the server whose rush bangs it open. */
  server: string;
  /** Seconds left of a swing; 0 at rest. */
  t: number;
  /** The way it swings, toward +x or -x. */
  dir: 1 | -1;
  /** A bang or a slam, which hurts and knocks; a soft swing does neither. */
  hard: boolean;
  /** How many this slam has bowled over: the chain. */
  chain: number;
};
/** Its swing reaches this far on the side it opens to, lasts `swing` seconds, and the mallet meets it within `hit` of the panel, up to `h` above its floor. */
export const SWING = { reach: 240, swing: 0.4, hit: 90, h: 380 } as const;

export function createSwingDoors(specs: readonly { id: string; x: number; y: number; server: string }[]): SwingDoor[] {
  return specs.map((s) => ({ id: s.id, x: s.x, y: s.y, server: s.server, t: 0, dir: -1, hard: false, chain: 0 }));
}

export type DoorWorld = { hero: HeroState; cast: Npc[]; swing: Point[]; hits: number[]; puddles: Puddle[]; stage: Stage; swingDoors: SwingDoor[] };

/** Whether `before` and `after` lie on opposite sides of the door. */
const crossed = (d: SwingDoor, before: number, after: number) => (before - d.x) * (after - d.x) < 0;
/** Inside the swing on side `dir`: within its reach, on its floor. */
const inSwing = (d: SwingDoor, dir: 1 | -1, x: number, y: number) => (x - d.x) * dir > 0 && Math.abs(x - d.x) <= SWING.reach && Math.abs(y - d.y) < 60;

/**
 * One step of the doors, after the cast has moved. The named server's rush through a door bangs it open her way, and him
 * inside its swing on that side takes a pip (his grace holds as for any hit). Anyone else through it, him included, swings
 * it softly. The mallet meeting a door at rest slams it away from him, knocking down whoever stands in its swing beyond:
 * a chain, like a thrown body.
 */
export function stepSwingDoors(w: DoorWorld, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  for (const d of w.swingDoors) {
    d.t = Math.max(0, d.t - dt);
    if (d.t <= 0) d.hard = false;
    const open = (dir: 1 | -1, hard: boolean) => {
      d.t = SWING.swing;
      d.dir = dir;
      d.hard = hard;
      d.chain = 0;
      events.push({ type: "doorSwing", id: d.id, x: d.x, y: d.y, dir, hard });
    };
    if (d.t <= 0 && w.swing.some((p) => Math.abs(p.x - d.x) <= SWING.hit && p.y <= d.y && p.y >= d.y - SWING.h)) {
      const dir: 1 | -1 = h.x < d.x ? 1 : -1;
      open(dir, true);
      for (const n of w.cast) {
        if (!hittable(n) || n.act === "down" || !inSwing(d, dir, n.x, n.y)) continue;
        if (!strikeNpc(n, "body", dir, w, events, d.chain + 1)) continue;
        d.chain++;
        events.push({ type: "chain", x: n.x, y: n.y - n.h, count: d.chain, points: CHAIN[Math.min(d.chain, CHAIN.length) - 1], oneUp: d.chain >= CHAIN.length });
      }
      continue;
    }
    for (const n of w.cast) {
      if (!n.alive || !crossed(d, n.x - n.vx * dt, n.x)) continue;
      const bang = n.spawn === d.server && n.act === "attack";
      if (d.t > 0 && !bang) continue;
      const dir: 1 | -1 = n.vx > 0 ? 1 : -1;
      open(dir, bang);
      if (bang && inSwing(d, dir, h.x, h.y)) w.hits.push(d.x);
    }
    if (d.t <= 0 && crossed(d, h.x - h.vx * dt, h.x)) open(h.vx > 0 ? 1 : -1, false);
  }
}
