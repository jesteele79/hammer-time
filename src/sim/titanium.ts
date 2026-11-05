import { JUMP_V0 } from "./constants";
import type { GameEvent } from "./events";
import { overlapsRect, sweptHeadHits } from "./geometry";
import { BURST_R, MALLET_R } from "./hits";
import type { BossSpec } from "./level";
import type { Missile } from "./missiles";
import { BOSS_ID } from "./supervisor";
import type { HeroState, Point, Rect, Stage } from "./types";

export type TitaniumState = "idle" | "windup" | "swing" | "throw" | "bounce" | "grab" | "lunge" | "pool" | "down";
/** Lifetime Titanium guy (story spec §8.4): `x` his middle, `y` his feet; twelve health in three phases, a room each. */
export type Titanium = {
  kind: "titanium";
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 1 | -1;
  state: TitaniumState;
  hp: number;
  max: number;
  phase: 1 | 2 | 3;
  room: 0 | 1 | 2;
  hurtT: number;
  flinch: number;
  timer: number;
  /** Apples, or a bottle, on their own clock. */
  throwT: number;
  thrown: number;
  /** The bellhops' clock, and the grab's. */
  bellhopT: number;
  grabT: number;
  /** Cans he has taken and owes, and those a hit this step has him give back. */
  owed: number;
  pay: number;
  awake: boolean;
  /** His first line said. */
  said: boolean;
};

export const TITANIUM = {
  hp: 12,
  w: 110,
  h: 350,
  gap: 0.45,
  flinch: 0.25,
  walk: 150,
  reach: 300,
  briefcase: { windup: 0.4, swing: 0.3, rest: 1.2 },
  apples: { every: 3, count: 3, gap: 0.25, gravity: 1400, up: -600, most: 720, air: 1.05, points: 100 },
  bed: { every: 2.2, bounce: 1.3, gravity: 3300, x: 2340, y: -150, top: -500 },
  bellhops: { every: 10, first: 3 },
  bottles: { every: 2.4, speed: 760, up: -180 },
  grab: { windup: 0.6, lunge: 540, time: 0.5, reach: 160, takes: 10, every: 7, rest: 1.1 },
  balcony: { x: 3900 },
  phases: { two: 8, three: 4 },
  grace: 1.2,
  moved: 2,
  points: 5000,
  pool: { t: 1.2, vx: 400, vy: -500, gravity: 1500 },
} as const;

export const createTitanium = (b: BossSpec): Titanium => ({
  kind: "titanium",
  x: b.x,
  y: b.y ?? 0,
  w: TITANIUM.w,
  h: TITANIUM.h,
  vx: 0,
  vy: 0,
  onGround: true,
  facing: -1,
  state: "idle",
  hp: TITANIUM.hp,
  max: TITANIUM.hp,
  phase: 1,
  room: 0,
  hurtT: 0,
  flinch: 0,
  timer: 1,
  throwT: TITANIUM.apples.every,
  thrown: 0,
  bellhopT: TITANIUM.bellhops.first,
  grabT: TITANIUM.grab.every,
  owed: 0,
  pay: 0,
  awake: true,
  said: false,
});

export const titaniumRect = (t: Titanium): Rect => ({ x: t.x - t.w / 2, y: t.y - t.h, w: t.w, h: t.h });

/** Each phase's own place and words; he moves there at once, the camera pans after him, and the fight gives Hammer a moment. */
function enterPhase(t: Titanium, phase: 2 | 3, events: GameEvent[]) {
  t.phase = phase;
  t.room = phase === 2 ? 1 : 2;
  t.timer = 0.6;
  t.thrown = 0;
  // He cannot be hit while he gets there and says his piece.
  t.hurtT = TITANIUM.moved;
  if (phase === 2) {
    t.state = "bounce";
    t.x = TITANIUM.bed.x;
    t.y = TITANIUM.bed.y;
    t.vx = t.vy = 0;
    t.onGround = true;
    t.bellhopT = TITANIUM.bellhops.first;
  } else {
    t.state = "idle";
    t.x = TITANIUM.balcony.x;
    t.y = 0;
    t.vx = t.vy = 0;
    t.onGround = true;
    t.throwT = TITANIUM.bottles.every;
    t.grabT = TITANIUM.grab.every;
  }
  events.push({ type: "bossPhase", phase, room: t.room });
  events.push({ type: "castLine", id: BOSS_ID, text: phase === 2 ? "We're out of suites." : "The lounge is closed for renovation.", seconds: 2.4 });
  events.push({ type: "think", text: phase === 2 ? "I've had status since '98." : "Ambassador of WHAT?", seconds: 2.4 });
}

/** The checks' way to a phase or to the end: his health set, and what that health means, as a hit would have it. */
export function setTitanium(t: Titanium, o: { hp?: number; state?: string }, events: GameEvent[]) {
  if (o.hp !== undefined) {
    t.hp = o.hp;
    if (t.phase === 1 && t.hp <= TITANIUM.phases.two) enterPhase(t, 2, events);
    if (t.phase === 2 && t.hp <= TITANIUM.phases.three) enterPhase(t, 3, events);
    t.hurtT = 0;
  }
  if (o.state === "down") {
    t.hp = 0;
    t.state = "pool";
    t.timer = TITANIUM.pool.t;
    t.vx = TITANIUM.pool.vx;
    t.vy = TITANIUM.pool.vy;
    t.onGround = false;
  }
}

/** A hit on him: one in 0.45 s, what he owes coming back; at each threshold he moves on, and at the last he goes over the rail. */
export function hitTitanium(t: Titanium, by: "bonk" | "snot", events: GameEvent[]): boolean {
  if (t.state === "pool" || t.state === "down" || t.hurtT > 0) return false;
  t.hurtT = TITANIUM.gap;
  t.flinch = TITANIUM.flinch;
  t.hp = Math.max(0, t.hp - 1);
  events.push({ type: "bossHit", by, x: t.x, y: t.y - t.h * 0.6, hp: t.hp });
  // Every hit gives back what he took, ten at a time; the game hands it over on its next step.
  const back = Math.min(TITANIUM.grab.takes, t.owed);
  t.owed -= back;
  t.pay += back;
  if (t.hp <= 0) {
    t.state = "pool";
    t.timer = TITANIUM.pool.t;
    t.vx = TITANIUM.pool.vx;
    t.vy = TITANIUM.pool.vy;
    t.onGround = false;
    return true;
  }
  if (t.phase === 1 && t.hp <= TITANIUM.phases.two) enterPhase(t, 2, events);
  else if (t.phase === 2 && t.hp <= TITANIUM.phases.three) enterPhase(t, 3, events);
  else events.push({ type: "castLine", id: BOSS_ID, text: "Lifetime. Look it up.", seconds: 1.4 });
  return true;
}

export type TitaniumWorld = { hero: HeroState; missiles: Missile[]; nextMissile: number; stage: Stage; swing: Point[]; hits: number[] };

const inFront = (t: Titanium, h: HeroState, reach: number) => (h.x - t.x) * t.facing >= -20 && Math.abs(h.x - t.x) <= reach && Math.abs(h.y - t.y) < t.h;
const faceHim = (t: Titanium, h: HeroState) => {
  t.facing = h.x >= t.x ? 1 : -1;
};

function lobApple(t: Titanium, w: TitaniumWorld) {
  const a = TITANIUM.apples;
  const y = t.y - t.h * 0.7;
  const vx = Math.max(-a.most, Math.min(a.most, (w.hero.x - t.x) / a.air));
  w.missiles.push({ id: ++w.nextMissile, kind: "apple", x: t.x + t.facing * 40, y, vx, vy: a.up, gravity: a.gravity, spin: 0, life: 3, phase: 0, from: BOSS_ID });
}

function throwBottle(t: Titanium, w: TitaniumWorld) {
  const b = TITANIUM.bottles;
  w.missiles.push({ id: ++w.nextMissile, kind: "bottle", x: t.x + t.facing * 40, y: t.y - t.h * 0.7, vx: t.facing * b.speed, vy: b.up, spin: 0, life: 2.4, phase: 0, from: BOSS_ID });
}

/** The living room: walks at him, the briefcase's wind-up and swing, and three apples every three seconds. */
function stepOne(t: Titanium, w: TitaniumWorld, dt: number, events: GameEvent[]) {
  const h = w.hero;
  const c = TITANIUM.briefcase;
  t.throwT -= dt;
  if (t.throwT <= 0) {
    if (t.thrown < TITANIUM.apples.count) {
      faceHim(t, h);
      lobApple(t, w);
      events.push({ type: "missile", kind: "apple", x: t.x, y: t.y - t.h * 0.7 });
      t.thrown++;
      t.throwT = TITANIUM.apples.gap;
    } else {
      t.thrown = 0;
      t.throwT = TITANIUM.apples.every;
    }
  }
  if (t.state === "windup") {
    if (t.timer <= 0) {
      t.state = "swing";
      t.timer = c.swing;
      events.push({ type: "castAttack", id: BOSS_ID, role: "office", x: t.x, y: t.y - t.h * 0.5 });
      if (inFront(t, h, TITANIUM.reach) && h.invuln <= 0 && h.move?.kind !== "tumble") w.hits.push(t.x);
    }
    return;
  }
  if (t.state === "swing") {
    if (t.timer <= 0) {
      t.state = "idle";
      t.timer = c.rest;
    }
    return;
  }
  if (t.timer > 0) return;
  faceHim(t, h);
  if (Math.abs(h.x - t.x) <= TITANIUM.reach) {
    t.state = "windup";
    t.timer = c.windup;
    events.push({ type: "bossWindup", x: t.x, y: t.y - t.h });
  } else t.x += t.facing * TITANIUM.walk * dt;
}

/** The bed: a bounce every 2.2 s, out of reach at the top of it. */
function stepTwo(t: Titanium, w: TitaniumWorld, dt: number, events: GameEvent[]) {
  faceHim(t, w.hero);
  const b = TITANIUM.bed;
  if (t.onGround) {
    if (t.timer > 0) return;
    t.vy = -b.bounce * JUMP_V0;
    t.onGround = false;
    t.timer = b.every;
    events.push({ type: "bounce", x: t.x, y: t.y });
    return;
  }
  t.vy += b.gravity * dt;
  t.y += t.vy * dt;
  if (t.y >= b.y && t.vy > 0) {
    t.y = b.y;
    t.vy = 0;
    t.onGround = true;
  }
}

/** The balcony: bottles, and every seven seconds the lunge that takes his cans. */
function stepThree(t: Titanium, w: TitaniumWorld, dt: number, events: GameEvent[]) {
  const h = w.hero;
  const g = TITANIUM.grab;
  if (t.state === "grab") {
    if (t.timer <= 0) {
      t.state = "lunge";
      t.timer = g.time;
      t.vx = t.facing * (g.lunge / g.time);
    }
    return;
  }
  if (t.state === "lunge") {
    t.x += t.vx * dt;
    if (Math.abs(h.x - t.x) <= g.reach && Math.abs(h.y - t.y) < t.h) {
      // Only his cans: nothing of it costs a pip.
      events.push({ type: "grab", phase: "land", x: t.x, y: t.y - t.h * 0.6 });
      events.push({ type: "castLine", id: BOSS_ID, text: "Let's split it evenly.", seconds: 1.8 });
      t.state = "idle";
      t.timer = g.rest;
      t.vx = 0;
      return;
    }
    if (t.timer <= 0) {
      t.state = "idle";
      t.timer = g.rest;
      t.vx = 0;
    }
    return;
  }
  t.throwT -= dt;
  t.grabT -= dt;
  if (t.timer > 0) return;
  faceHim(t, h);
  if (t.grabT <= 0) {
    t.state = "grab";
    t.timer = g.windup;
    t.grabT = g.every;
    events.push({ type: "grab", phase: "windup", x: t.x, y: t.y - t.h });
    return;
  }
  if (t.throwT <= 0) {
    t.throwT = TITANIUM.bottles.every;
    throwBottle(t, w);
    events.push({ type: "missile", kind: "bottle", x: t.x, y: t.y - t.h * 0.7 });
  }
}

/** His step: the mallet and the slam on him, then whatever the phase has him do. */
export function stepTitanium(t: Titanium, w: TitaniumWorld, dt: number, events: GameEvent[]): void {
  t.hurtT = Math.max(0, t.hurtT - dt);
  t.flinch = Math.max(0, t.flinch - dt);
  t.timer -= dt;
  if (t.state === "down") return;
  if (t.state === "pool") {
    t.vy += TITANIUM.pool.gravity * dt;
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    if (t.timer > 0) return;
    t.state = "down";
    t.y = 4000;
    events.push({ type: "pool", x: t.x, y: 0 });
    events.push({ type: "castLine", id: BOSS_ID, text: "...Ambassador.", seconds: 2.4 });
    events.push({ type: "bossDown", x: t.x - 200, y: -t.h, points: TITANIUM.points });
    events.push({ type: "think", text: "Resort fee THIS.", seconds: 2.4 });
    return;
  }
  if (!t.said) {
    t.said = true;
    events.push({ type: "castLine", id: BOSS_ID, text: "I was here first. Ambassador.", seconds: 2.6 });
    events.push({ type: "think", text: "I've been Platinum since it was Platinum Premier.", seconds: 2.6 });
  }
  const h = w.hero;
  const r = titaniumRect(t);
  const m = h.move;
  if (m?.kind === "swing" && !m.victims.includes(BOSS_ID))
    for (let k = 0; k < w.swing.length; k++) {
      if (!sweptHeadHits(w.swing[Math.max(0, k - 1)], w.swing[k], MALLET_R, r)) continue;
      if (hitTitanium(t, "bonk", events)) m.victims.push(BOSS_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(t.x - burst.x, t.y - t.h / 2 - burst.y) <= BURST_R) hitTitanium(t, "bonk", events);
  const lecture = events.find((e) => e.type === "lecture") as Extract<GameEvent, { type: "lecture" }> | undefined;
  if (lecture && overlapsRect(lecture.reach, r)) events.push({ type: "castLine", id: BOSS_ID, text: "Lifetime. Look it up.", seconds: 1.6 });
  if ((t.state as TitaniumState) === "pool") return;
  if (t.phase === 1) stepOne(t, w, dt, events);
  else if (t.phase === 2) {
    stepTwo(t, w, dt, events);
    t.bellhopT -= dt;
    if (t.bellhopT <= 0) {
      t.bellhopT = TITANIUM.bellhops.every;
      events.push({ type: "bossCall" });
    }
  } else stepThree(t, w, dt, events);
}
