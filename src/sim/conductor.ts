import type { GameEvent } from "./events";
import { sweptHeadHits } from "./geometry";
import { BURST_R, MALLET_R } from "./hits";
import type { BossSpec } from "./level";
import { BOSS_ID } from "./supervisor";
import type { HeroState, Point, Rect, Stage } from "./types";

export type ConductorState = "wait" | "block" | "windup" | "punch" | "stagger" | "rest" | "hurt" | "retreat" | "down";
/**
 * The conductor at three connecting doors (story spec §9.3): `door` the one he holds, 3 when all are won; `hp` over all of
 * them, three a door. His door is a wall while he holds it. He can be hit only when his punch misses: `stagger`.
 */
export type Conductor = {
  kind: "conductor";
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  state: ConductorState;
  hp: number;
  max: number;
  door: number;
  doors: number[];
  /** Seconds before another hit counts, and of his flinch for the view. */
  hurtT: number;
  flinch: number;
  timer: number;
  /** He has seen him: the HUD's bar. */
  awake: boolean;
  /** Brought to him by a lecture in the quiet car. */
  summoned: boolean;
  /** Which doors' lines he has said. */
  said: number;
  /** The punch under way met him. */
  landed: boolean;
};

export const CONDUCTOR = {
  hp: 9,
  perDoor: 3,
  wake: 800,
  notice: 400,
  reach: 150,
  windup: [0.4, 0.3, 0.2],
  punch: 0.25,
  stagger: [0.8, 0.6, 0.45],
  rest: [1.0, 0.8, 0.6],
  hurt: 0.45,
  retreat: 1.0,
  retreatSpeed: 400,
  walk: 200,
  points: 1000,
  wall: { w: 24, h: 404 },
  w: 100,
  h: 335,
  /** Over his fist: how far off the floor a jump must be. */
  over: 90,
} as const;

export const createConductor = (b: BossSpec): Conductor => ({ kind: "conductor", x: b.x, y: 0, w: CONDUCTOR.w, h: CONDUCTOR.h, facing: -1, state: "wait", hp: CONDUCTOR.hp, max: CONDUCTOR.hp, door: 0, doors: b.doors ?? [b.x], hurtT: 0, flinch: 0, timer: 0, awake: false, summoned: false, said: -1, landed: false });

/** Puts him at a door already won up to: a level laid out again after a lost life, or the checks. */
export function atDoor(c: Conductor, door: number): void {
  c.door = door;
  c.hp = CONDUCTOR.hp - CONDUCTOR.perDoor * door;
  c.summoned = false;
  c.timer = 0;
  c.hurtT = 0;
  if (door >= c.doors.length) {
    c.state = "down";
    return;
  }
  c.x = c.doors[door];
  c.state = "wait";
}

export const conductorRect = (c: Conductor): Rect => ({ x: c.x - c.w / 2, y: c.y - c.h, w: c.w, h: c.h });

/** His door, shut: a wall from floor to ceiling while he holds it. */
export function conductorWall(c: Conductor): Rect | null {
  if (c.door >= c.doors.length || c.state === "retreat" || c.state === "down") return null;
  return { x: c.doors[c.door] - CONDUCTOR.wall.w / 2, y: -CONDUCTOR.wall.h, w: CONDUCTOR.wall.w, h: CONDUCTOR.wall.h };
}

/** A hit on him: only while his missed punch has him off balance. */
export function hitConductor(c: Conductor, by: "bonk" | "snot", events: GameEvent[]): boolean {
  if (c.state !== "stagger" || c.hurtT > 0) return false;
  c.hurtT = CONDUCTOR.hurt;
  c.flinch = CONDUCTOR.hurt;
  c.hp = Math.max(0, c.hp - 1);
  c.state = "hurt";
  // The win is the ninth hit: its points come with it, so a knockdown in his walk away keeps them.
  events.push({ type: "bossHit", by, x: c.x, y: c.y - c.h * 0.6, hp: c.hp, ...(c.hp === 0 ? { points: CONDUCTOR.points } : {}) });
  return true;
}

export type ConductorWorld = { hero: HeroState; stage: Stage; swing: Point[] };

const BLOCK_LINES = ["Billet, s'il vous plaît.", "Monsieur. Your seat is in coach 18.", "Billet, s'il vous plaît."];

/** A lecture in the quiet car brings him at once, before his first round only; the wall stays at his door. */
export function summonConductor(c: Conductor, h: Pick<HeroState, "x">, events: GameEvent[]): boolean {
  if (c.door !== 0 || c.state !== "wait") return false;
  c.x = h.x + 300;
  c.summoned = true;
  c.awake = true;
  c.state = "block";
  c.said = 0;
  events.push({ type: "summon" });
  events.push({ type: "bossSay", text: "This is the quiet car.", seconds: 2 });
  events.push({ type: "think", text: "Mobile ticket failed.", seconds: 2.4 });
  return true;
}

/** What his punch meets: him, in front and in reach, on his feet and not under it or over it. */
const punchMeets = (c: Conductor, h: HeroState): boolean => Math.abs(h.x - c.x) <= CONDUCTOR.reach && !h.crouch && h.y > c.y - CONDUCTOR.over;

export function stepConductor(c: Conductor, w: ConductorWorld, dt: number, events: GameEvent[]): void {
  c.hurtT = Math.max(0, c.hurtT - dt);
  c.flinch = Math.max(0, c.flinch - dt);
  if (c.state === "down") return;
  const h = w.hero;
  const d = Math.min(c.door, c.doors.length - 1);
  const gap = Math.abs(h.x - c.x);
  if (gap <= CONDUCTOR.wake) c.awake = true;
  c.facing = h.x < c.x ? -1 : 1;
  // The mallet's arc this step (once a swing), and the smash's burst.
  const r = conductorRect(c);
  const m = h.move;
  if (m?.kind === "swing" && !m.victims.includes(BOSS_ID))
    for (let k = 0; k < w.swing.length; k++) {
      if (!sweptHeadHits(w.swing[Math.max(0, k - 1)], w.swing[k], MALLET_R, r)) continue;
      if (hitConductor(c, "bonk", events)) m.victims.push(BOSS_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(c.x - burst.x, c.y - c.h / 2 - burst.y) <= BURST_R) hitConductor(c, "bonk", events);
  c.timer -= dt;
  switch (c.state) {
    case "wait":
      if (gap > CONDUCTOR.notice) return;
      c.state = "block";
      if (c.said < c.door) {
        c.said = c.door;
        events.push({ type: "bossSay", text: BLOCK_LINES[d], seconds: 2 });
        if (c.door === 0) events.push({ type: "think", text: "Mobile ticket failed.", seconds: 2.4 });
      }
      return;
    case "block":
      // Summoned to the quiet car he comes to him; at a door he holds it.
      if (c.summoned && gap > CONDUCTOR.reach) c.x += c.facing * CONDUCTOR.walk * dt;
      if (gap > CONDUCTOR.reach) return;
      c.state = "windup";
      c.timer = CONDUCTOR.windup[d];
      events.push({ type: "bossWindup", x: c.x, y: c.y - c.h });
      return;
    case "windup":
      if (c.timer > 0) return;
      c.state = "punch";
      c.timer = CONDUCTOR.punch;
      c.landed = punchMeets(c, h);
      if (c.landed) events.push({ type: "conductorPunch", fromX: c.x });
      return;
    case "punch":
      if (c.timer > 0) return;
      if (c.landed) {
        c.state = "rest";
        c.timer = CONDUCTOR.rest[d];
        return;
      }
      c.state = "stagger";
      c.timer = CONDUCTOR.stagger[d];
      events.push({ type: "bossStagger", x: c.x, y: c.y - c.h });
      return;
    case "stagger":
      if (c.timer > 0) return;
      c.state = "rest";
      c.timer = CONDUCTOR.rest[d];
      return;
    case "hurt":
      if (c.hurtT > 0) return;
      if (c.hp % CONDUCTOR.perDoor === 0) {
        c.state = "retreat";
        c.timer = CONDUCTOR.retreat;
      } else {
        c.state = "rest";
        c.timer = CONDUCTOR.rest[d];
      }
      return;
    case "rest":
      if (c.timer > 0) return;
      c.state = "block";
      return;
    case "retreat":
      // Back through the door he has lost, and on to the next.
      c.x += CONDUCTOR.retreatSpeed * dt;
      if (c.timer > 0) return;
      events.push({ type: "doorOpen", door: c.door });
      atDoor(c, c.door + 1);
      if (c.door >= c.doors.length) events.push({ type: "bossDown", x: c.x, y: c.y - c.h, points: 0 });
      return;
  }
}
