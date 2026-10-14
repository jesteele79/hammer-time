import { STOMP } from "./cast";
import type { GameEvent } from "./events";
import { bodyRect, overlapsRect, sweptHeadHits } from "./geometry";
import { BURST_R, MALLET_R } from "./hits";
import type { BossSpec } from "./level";
import type { HeroState, Point, Rect } from "./types";

export type PigState = "asleep" | "windup" | "charge" | "hop" | "recover" | "defeated";

/** The pink menace (R3 §5): `x` its middle, `y` its feet, as the cast's. */
export type Pig = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** The floor it stands on. */
  floor: number;
  w: number;
  h: number;
  state: PigState;
  /** Seconds left of a wind-up, charge, hop or rest; seconds since it went down once defeated. */
  timer: number;
  facing: 1 | -1;
  hp: number;
  max: number;
  bonks: number;
  snots: number;
  /** Seconds before another hit counts. */
  hurtT: number;
  attacks: number;
  /** Seconds to the next pepper refill (the Game lays the pepper). */
  refill: number;
  arena: [number, number];
};

/** The shipped fight's numbers at the new scale (R3 §5.2), its limits in the arena (the shipped 80 and 8 px) and its size. */
export const PIG = {
  hp: 12,
  need: 3,
  gap: 0.38,
  w: 240,
  h: 400,
  windupFirst: 1.1,
  windup: 0.9,
  windupHalf: 0.7,
  charge: 880,
  chargeHalf: 1040,
  chargeT: 0.85,
  hopVx: 520,
  hopHigh: 260,
  hopAir: 0.6,
  hopT: 1.15,
  recover: 1.35,
  /** Within this of the arena's left edge it winds up facing right; within `faceLeft` of the right edge, left. */
  faceRight: 900,
  faceLeft: 450,
  /** Its body keeps this far inside the arena's edges: the left corner, where the pepper refills, is out of its reach. */
  keepLeft: 540,
  keepRight: 50,
  refill: 3,
  refillAt: 150,
  points: 3000,
  /** The grace he gets as it wakes. */
  grace: 1.2,
} as const;

/** The pig's id among the mallet's victims: clear of the carts' and the cast's. */
export const PIG_ID = 900;

const HOP_VY = (4 * PIG.hopHigh) / PIG.hopAir;
const HOP_G = (8 * PIG.hopHigh) / PIG.hopAir ** 2;

export const createPig = (b: BossSpec, floor = 0): Pig => ({
  x: b.x,
  y: floor,
  vx: 0,
  vy: 0,
  onGround: true,
  floor,
  w: PIG.w,
  h: PIG.h,
  state: "asleep",
  timer: 0,
  facing: -1,
  hp: PIG.hp,
  max: PIG.hp,
  bonks: 0,
  snots: 0,
  hurtT: 0,
  attacks: 0,
  refill: 0,
  arena: [b.arena[0], b.arena[1]],
});

export const pigRect = (p: Pig): Rect => bodyRect(p);
const halfHp = (p: Pig) => p.hp <= p.max / 2;
const fighting = (p: Pig) => p.state !== "asleep" && p.state !== "defeated";

/** The way it winds up: toward him, but out of the arena's ends (the shipped rule). */
export function lockFacing(p: Pig, heroX: number): 1 | -1 {
  const [x0, x1] = p.arena;
  if (p.x - x0 < PIG.faceRight) return 1;
  if (x1 - p.x < PIG.faceLeft) return -1;
  return heroX < p.x ? -1 : 1;
}

/**
 * A hit on the pig; true when it counts. One in 0.38 s counts. It ends short of 3 bonks or 3 snots held at 1 HP with
 * the word for what it still needs, the bonks first; otherwise at 0 it goes down for 3000.
 */
export function hitPig(p: Pig, by: "bonk" | "snot", amount: number, x: number, y: number, events: GameEvent[]): boolean {
  if (!fighting(p) || p.hurtT > 0) return false;
  p.hurtT = PIG.gap;
  if (by === "bonk") p.bonks++;
  else p.snots++;
  p.hp = Math.max(0, p.hp - amount);
  events.push({ type: "pigHit", by, x, y, hp: p.hp, bonks: p.bonks, snots: p.snots });
  if (p.hp > 0) return true;
  if (p.bonks < PIG.need || p.snots < PIG.need) {
    p.hp = 1;
    events.push({ type: "pigHold", word: p.bonks < PIG.need ? "MORE BONKS" : "MORE SNOT", x: p.x, y: p.y - p.h });
    return true;
  }
  p.state = "defeated";
  p.timer = 0;
  p.vx = 0;
  events.push({ type: "pigDown", x: p.x, y: p.y, points: PIG.points });
  return true;
}

function windup(p: Pig, heroX: number, seconds: number, events: GameEvent[]) {
  p.state = "windup";
  p.timer = seconds;
  p.vx = 0;
  p.facing = lockFacing(p, heroX);
  events.push({ type: "pigWindup", x: p.x, y: p.y - p.h, hop: (p.attacks + 1) % 3 === 0 });
}

function rest(p: Pig) {
  p.state = "recover";
  p.timer = PIG.recover;
  p.vx = 0;
}

/** Its pattern (the shipped `stepBoss`): wind-up, then a charge or every third attack a hop, then the rest. */
function pattern(p: Pig, heroX: number, dt: number, events: GameEvent[]) {
  p.timer -= dt;
  if (p.state === "windup" && p.timer <= 0) {
    p.attacks++;
    const hop = p.attacks % 3 === 0;
    p.state = hop ? "hop" : "charge";
    p.timer = hop ? PIG.hopT : PIG.chargeT;
    p.vx = p.facing * (hop ? PIG.hopVx : halfHp(p) ? PIG.chargeHalf : PIG.charge);
    if (hop) {
      p.vy = -HOP_VY;
      p.onGround = false;
    }
    events.push({ type: hop ? "pigHop" : "pigCharge", x: p.x, y: p.y, dir: p.facing });
  } else if ((p.state === "charge" || p.state === "hop") && p.timer <= 0) rest(p);
  else if (p.state === "recover" && p.timer <= 0) windup(p, heroX, halfHp(p) ? PIG.windupHalf : PIG.windup, events);
}

/** In the air it falls, and lands with its feet still; along the floor it is held inside its limits, and a charge that meets one ends. */
function move(p: Pig, dt: number, events: GameEvent[]) {
  if (!p.onGround) {
    p.vy += HOP_G * dt;
    p.y += p.vy * dt;
    if (p.y >= p.floor) {
      p.y = p.floor;
      p.vy = 0;
      p.vx = 0;
      p.onGround = true;
      events.push({ type: "pigLand", x: p.x, y: p.y });
    }
  }
  p.x += p.vx * dt;
  const lo = p.arena[0] + PIG.keepLeft + p.w / 2;
  const hi = p.arena[1] - PIG.keepRight - p.w / 2;
  if (p.x < lo || p.x > hi) {
    p.x = Math.min(hi, Math.max(lo, p.x));
    p.vx = 0;
    if (p.state === "charge") rest(p);
  }
}

/** The arena closes behind him: he is held between its edges while the fight is on. */
function holdIn(h: HeroState, [x0, x1]: [number, number]) {
  const lo = x0 + h.w / 2;
  const hi = x1 - h.w / 2;
  if (h.x < lo) {
    h.x = lo;
    h.vx = Math.max(0, h.vx);
  } else if (h.x > hi) {
    h.x = hi;
    h.vx = Math.min(0, h.vx);
  }
}

export type PigWorld = { pig: Pig | null; hero: HeroState; swing: Point[]; hits: number[] };

/** The mallet's arc this step (once a swing, and only a hit that counts spends it), the burst's two, and the lecture's shrug. */
function strikes(p: Pig, w: PigWorld, events: GameEvent[]) {
  const r = pigRect(p);
  const m = w.hero.move;
  if (m?.kind === "swing" && !m.victims.includes(PIG_ID))
    for (let k = 0; k < w.swing.length; k++) {
      const a = w.swing[Math.max(0, k - 1)];
      const b = w.swing[k];
      if (!sweptHeadHits(a, b, MALLET_R, r)) continue;
      if (hitPig(p, "bonk", 1, b.x, b.y, events)) m.victims.push(PIG_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(p.x - burst.x, p.y - p.h / 2 - burst.y) <= BURST_R) hitPig(p, "bonk", 2, p.x, p.y - p.h * 0.6, events);
  const lecture = events.find((e) => e.type === "lecture") as Extract<GameEvent, { type: "lecture" }> | undefined;
  if (lecture && overlapsRect(lecture.reach, r)) events.push({ type: "pigShrug", x: w.hero.x, y: w.hero.y - w.hero.h });
}

/** Landing on it from above bounces him off; walking into it costs a pip, unless he is in grace, down, or it is not fighting. */
function contact(p: Pig, w: PigWorld, prevY: number, jumpHeld: boolean, events: GameEvent[]) {
  const h = w.hero;
  const r = pigRect(p);
  if (!overlapsRect(bodyRect(h), r)) return;
  if (h.vy > 0 && prevY <= r.y + STOMP.tolerance) {
    h.vy = -(jumpHeld ? STOMP.held : STOMP.bounce);
    h.onGround = false;
    events.push({ type: "pigBounce", x: h.x, y: r.y });
    return;
  }
  if (!fighting(p) || h.invuln > 0 || h.move?.kind === "tumble") return;
  w.hits.push(p.x);
}

/** One step of the pig: asleep until he crosses into the arena; then its pattern, him held in, its hits, and touching it. */
export function stepPig(w: PigWorld, dt: number, prevY: number, jumpHeld: boolean, events: GameEvent[]): void {
  const p = w.pig;
  if (!p) return;
  const h = w.hero;
  p.hurtT = Math.max(0, p.hurtT - dt);
  if (p.state === "asleep" && h.x >= p.arena[0]) {
    events.push({ type: "pigWake", x: p.x, y: p.y - p.h });
    windup(p, h.x, PIG.windupFirst, events);
  } else if (p.state === "defeated") p.timer += dt;
  else if (p.state !== "asleep") {
    p.refill = Math.max(0, p.refill - dt);
    pattern(p, h.x, dt, events);
  }
  move(p, dt, events);
  if (fighting(p)) {
    holdIn(h, p.arena);
    strikes(p, w, events);
  }
  contact(p, w, prevY, jumpHeld, events);
}
