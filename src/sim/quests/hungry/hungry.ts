import { STEP } from "../../constants";
import type { Input } from "../../input";
import { MOVE_SECONDS, SWING_ACTIVE } from "../../moves";
import { seededRandom } from "../../rewards";
import type { Point } from "../../types";
import type { HungryEvent } from "./events";
import { COURSES, DISH, FOODS, SPECIALS, settled, stepDishes, type Box, type Course, type Dish, type FoodKind } from "./food";
import { RIVALS, SEATS, TABLE, dirOf, dist, screenDeg, sub, type EaterId, type RivalId } from "./table";

const DEG = Math.PI / 180;

/** The round's numbers (R4 design §3 to §6): world px on the table top, seconds. */
export const HUNGRY = {
  round: 60,
  reach: { base: 520, step: 10, max: 760, charged: 1180 },
  /** A press let go by now is a tap. */
  tap: 0.12,
  /** Held this long, it goes out at full charge. */
  charge: 0.5,
  /** The hand out (520 px in 0.14 s) and back (520 px in 0.10 s). */
  out: 520 / 0.14,
  back: 520 / 0.1,
  hold: 0.04,
  cadence: 0.3,
  /** Half the hand's 110 px sweep. */
  sweep: 55,
  fly: 0.25,
  aim: 30,
  /** How fast ← and → swing his line, degrees a second. */
  aimRate: 90,
  /** A rival's plate is reached within this of its middle. */
  plate: 60,
  rob: 100,
  combo: { window: 1.2, double: 5, triple: 10 },
  togo: 5,
  bonk: { reach: 300, push: 500 },
  dump: { min: 300, max: 700, pour: 0.03, jitter: 20 },
  cart: { at: 42, speed: 900, count: 14 },
  frenzy: { from: 52, every: 1 / 3 },
  specials: { from: 5, to: 50 },
  /** His swing at the table is the shift's: the strike lands a third of the way in. */
  swing: MOVE_SECONDS.swing,
  strike: SWING_ACTIVE[0],
  rival: { range: 400, cone: 50, burst: [2, 4] as const, calm: 8, floor: 0.15, quicker: 0.8, stun: 2 },
  slap: { zone: 300, stun: 1 },
  plane: { windup: 0.6, speed: 650, hit: 150 },
  suitcase: { t: 4, out: 250, w: 120, h: 80 },
  clash: { reach: 110, scatter: 150, speed: 400 },
  /** The server's walk behind the far side: from 15 degrees round the table to 170 (his corner) and back. */
  server: { trip: 18, from: 15, to: 170, radius: 830, linger: 1.5, bus: 150, reach: 260, quiet: 6, away: 15, tray: 4 },
} as const;

/** The waves from the chute (R4 §5); the cart's desserts and the frenzy come apart. */
export const WAVES: readonly { at: number; course: Exclude<Course, "special">; count: number }[] = [
  { at: 0, course: "appetizer", count: 24 },
  { at: 10, course: "appetizer", count: 12 },
  { at: 20, course: "appetizer", count: 12 },
  { at: 25, course: "entree", count: 16 },
  { at: 35, course: "entree", count: 10 },
  { at: 50, course: "dessert", count: 10 },
];
const ALL_COURSES: FoodKind[] = [...COURSES.appetizer, ...COURSES.entree, ...COURSES.dessert];
/** The cart comes in from off the right along the near side and crashes into the rim 35 degrees below the right end. */
const CART_FROM: Point = { x: 1500, y: -760 };
const CART_TO: Point = { x: Math.cos(-35 * DEG) * TABLE.r, y: Math.sin(-35 * DEG) * TABLE.r };

/** The shipped grade lines, scaled together by the scripted rounds (R4 §6; Task 5 sets it). */
export const GRADE_SCALE = 8.25;
export type Grade = "COMPED" | "GOOD TIPPER" | "SPLIT THE CHECK" | "WATER ONLY";
export const GRADES: readonly (readonly [number, Grade])[] = (
  [
    [3000, "COMPED"],
    [2000, "GOOD TIPPER"],
    [1200, "SPLIT THE CHECK"],
    [0, "WATER ONLY"],
  ] as const
).map(([n, g]) => [Math.round(n * GRADE_SCALE), g] as const);
export const gradeFor = (score: number): Grade => GRADES.find(([min]) => score >= min)![1];

export type DivePhase = "coil" | "out" | "hold" | "back";
export type Dive = {
  phase: DivePhase;
  /** Seconds in this phase. */
  t: number;
  /** The coil: seconds the key has been held. */
  held: number;
  /** Which way the hand goes: a unit on the table top. */
  dir: Point;
  /** Where the hand stops, px from the plate. */
  reach: number;
  /** How far out the hand is now. */
  ext: number;
  charged: boolean;
  /** The rival whose plate a charged dive ends on. */
  rob: RivalId | null;
  /** What the hand swept up on the way out: it flies home at full stretch. */
  haul: { kind: FoodKind; bonus: number }[];
  /** Where the hand was over the last 0.1 s: the clash. */
  trail: Point[];
};
export type Eater = {
  id: EaterId;
  dive: Dive | null;
  /** Seconds since the last dive started. */
  since: number;
  /** Seconds left of a stun: the bonk's, the nurse's slap. */
  stun: number;
  /** What is on their plate, the top last. */
  plate: FoodKind[];
};
export type Hammer = Eater & { id: "hammer"; aim: number; duck: boolean; swing: number; bonked: boolean };
/** `asleep` (the tests' quiet table): there, plate and all, never diving. */
export type Rival = Eater & { id: RivalId; base: number; anger: number; calm: number; wait: number; target: number | null; burst: number; asleep: boolean };
export type Flight = { kind: FoodKind; to: EaterId; from: Point; t: number; bonus: number };
export type Plane = { from: Point; to: Point; d: number; wait: number; done: boolean; hit: boolean };
export type Suitcase = Box & { t: number };
/** `s` 0 at the right end, 1 at his corner; `wait` lingering at an end. */
export type Server = { s: number; dir: 1 | -1; away: number; quiet: number; wait: number };
export type Cart = { x: number; y: number; crashed: boolean };
export type Score = { plate: number; bonus: number; chain: number; best: number; last: number; togo: number; eaten: number; robbed: number; paper: number; specials: FoodKind[]; bill: boolean };
export type HungryResult = {
  score: number;
  grade: Grade;
  /** GOOD TIPPER or better: the pepper on the way back. */
  full: boolean;
  plate: number;
  grabs: number;
  comboBonus: number;
  bestCombo: number;
  robbed: number;
  paper: number;
  specials: FoodKind[];
  bill: boolean;
  cans: number;
  nuts: boolean;
  bucees: boolean;
  hot: boolean;
};
/** The tests' switches: no waves, specials, cart or frenzy; the rivals asleep; the server away for good. */
export type HungryOptions = { practice?: boolean; schedule?: boolean; rivals?: boolean; server?: boolean };
export type Hungry = {
  rng: () => number;
  practice: boolean;
  time: number;
  dishes: Dish[];
  nextId: number;
  hammer: Hammer;
  rivals: Record<RivalId, Rival>;
  flights: Flight[];
  planes: Plane[];
  suitcases: Suitcase[];
  server: Server;
  cart: Cart | null;
  /** Which of WAVES has poured. */
  poured: boolean[];
  specials: { at: number; kind: FoodKind; done: boolean }[];
  scheduled: boolean;
  frenzyT: number;
  score: Score;
  /** His thoughts this round: each once. */
  said: Set<string>;
  events: HungryEvent[];
  result: HungryResult | null;
};

const RIVAL_BASE: Record<RivalId, number> = { student: 0.55, bellhop: 0.4, nurse: 0.28 };
function eater<I extends EaterId>(id: I): Eater & { id: I } {
  return { id, dive: null, since: HUNGRY.cadence, stun: 0, plate: [] };
}

export function createHungry(seed: number, opts: HungryOptions = {}): Hungry {
  const rng = seededRandom(seed);
  const scheduled = opts.schedule !== false;
  const rival = (id: RivalId): Rival => ({ ...eater(id), base: RIVAL_BASE[id], anger: 0, calm: 0, wait: -1, target: null, burst: 0, asleep: opts.rivals === false });
  const { from, to } = HUNGRY.specials;
  return {
    rng,
    practice: !!opts.practice,
    time: 0,
    dishes: [],
    nextId: 1,
    hammer: { ...eater("hammer"), aim: 0, duck: false, swing: 0, bonked: false },
    rivals: { student: rival("student"), bellhop: rival("bellhop"), nurse: rival("nurse") },
    flights: [],
    planes: [],
    suitcases: [],
    server: { s: 0, dir: 1, away: opts.server === false ? Infinity : 0, quiet: 0, wait: 0 },
    cart: null,
    poured: WAVES.map(() => !scheduled),
    specials: scheduled ? SPECIALS.map((kind) => ({ at: from + rng() * (to - from), kind, done: false })) : [],
    scheduled,
    frenzyT: 0,
    score: { plate: 0, bonus: 0, chain: 0, best: 0, last: -99, togo: 0, eaten: 0, robbed: 0, paper: 0, specials: [], bill: false },
    said: new Set(),
    events: [],
    result: null,
  };
}

/** A dish on the cloth, or `fall` seconds above it. */
export function addDish(q: Hungry, kind: FoodKind, x: number, y: number, vx = 0, vy = 0, fall = 0): Dish {
  const d: Dish = { id: q.nextId++, kind, x, y, vx, vy, r: FOODS[kind].r, fall };
  q.dishes.push(d);
  return d;
}

/** His tap's reach: the hungrier he gets, the farther he stretches (R4 §3). */
export const baseReach = (q: Hungry) => Math.min(HUNGRY.reach.max, HUNGRY.reach.base + HUNGRY.reach.step * q.score.eaten);

/** Where an eater's hand is on the table top: on their plate, or out along their dive. */
export function handOf(e: Eater): Point {
  const p = SEATS[e.id].plate;
  const d = e.dive;
  return d ? { x: p.x + d.dir.x * d.ext, y: p.y + d.dir.y * d.ext } : { x: p.x, y: p.y };
}

function think(q: Hungry, text: string, seconds = 1.8) {
  if (q.said.has(text)) return;
  q.said.add(text);
  q.events.push({ type: "hhThink", text, seconds });
}
function say(q: Hungry, who: RivalId | "server", text: string, seconds = 1.4) {
  q.events.push({ type: "hhSay", who, text, seconds });
}

/** Pours `count` dishes: from the chute every way, or from a tray or the cart inward, within 40 degrees of `inward`. */
function dump(q: Hungry, kinds: readonly FoodKind[], count: number, at: Point = { x: 0, y: 0 }, inward: Point | null = null, cart = false) {
  const made: FoodKind[] = [];
  const j = HUNGRY.dump.jitter;
  for (let i = 0; i < count; i++) {
    const kind = kinds[Math.floor(q.rng() * kinds.length)];
    const speed = HUNGRY.dump.min + q.rng() * (HUNGRY.dump.max - HUNGRY.dump.min);
    const a = inward ? Math.atan2(inward.y, inward.x) + (q.rng() - 0.5) * 80 * DEG : q.rng() * Math.PI * 2;
    addDish(q, kind, at.x + (q.rng() - 0.5) * j, at.y + (q.rng() - 0.5) * j, Math.cos(a) * speed, Math.sin(a) * speed, DISH.fall + i * HUNGRY.dump.pour);
    made.push(kind);
  }
  q.events.push({ type: "hhDump", x: at.x, y: at.y, count, kinds: made, cart });
}

function schedule(q: Hungry, dt: number) {
  WAVES.forEach((w, i) => {
    if (q.poured[i] || q.time < w.at) return;
    q.poured[i] = true;
    dump(q, COURSES[w.course], w.count);
    if (w.at === 0) think(q, "I didn't order this. I'm eating it anyway.", 2.2);
  });
  for (const s of q.specials)
    if (!s.done && q.time >= s.at) {
      s.done = true;
      dump(q, [s.kind], 1);
    }
  if (!q.scheduled) return;
  if (!q.cart && q.time >= HUNGRY.cart.at) q.cart = { x: CART_FROM.x, y: CART_FROM.y, crashed: false };
  if (q.time >= HUNGRY.frenzy.from) {
    q.frenzyT -= dt;
    while (q.frenzyT <= 1e-9) {
      q.frenzyT += HUNGRY.frenzy.every;
      dump(q, ALL_COURSES, 1);
    }
  }
}

/** The dessert cart rolls in and crashes into the rim, spilling its desserts inward. */
function stepCart(q: Hungry, dt: number) {
  const c = q.cart;
  if (!c || c.crashed) return;
  const v = sub(CART_TO, c);
  const n = Math.hypot(v.x, v.y);
  const step = HUNGRY.cart.speed * dt;
  if (n > step) {
    c.x += (v.x / n) * step;
    c.y += (v.y / n) * step;
    return;
  }
  c.x = CART_TO.x;
  c.y = CART_TO.y;
  c.crashed = true;
  const at = { x: CART_TO.x * 0.9, y: CART_TO.y * 0.9 };
  dump(q, COURSES.dessert, HUNGRY.cart.count, at, { x: -at.x, y: -at.y }, true);
  q.events.push({ type: "hhCart", x: at.x, y: at.y });
  think(q, "Bring the cart back.");
}

const newDive = (dir: Point, reach: number, phase: DivePhase): Dive => ({ phase, t: 0, held: 0, dir, reach, ext: 0, charged: false, rob: null, haul: [], trail: [] });

/**
 * Where a coiling dive will stop: his tap reach, or the charge so far (linear from the tap's reach to 1180 between 0.12
 * and 0.5 s); and a charged line ends on the first rival plate along it that has something on it.
 */
function aimDive(q: Hungry, d: Dive) {
  const base = baseReach(q);
  const k = Math.min(1, Math.max(0, (d.held - HUNGRY.tap) / (HUNGRY.charge - HUNGRY.tap)));
  let reach = d.charged ? base + (HUNGRY.reach.charged - base) * k : base;
  reach = Math.min(reach, caseStop(q, SEATS.hammer.plate, d.dir));
  d.rob = null;
  if (d.charged) {
    const p = SEATS.hammer.plate;
    const on = RIVALS.map((id) => {
      const v = sub(SEATS[id].plate, p);
      return { id, along: v.x * d.dir.x + v.y * d.dir.y, off: Math.abs(v.x * d.dir.y - v.y * d.dir.x) };
    })
      .filter((o) => o.along > 0 && o.off <= HUNGRY.plate && o.along <= reach + HUNGRY.plate && q.rivals[o.id].plate.length > 0)
      .sort((a, b) => a.along - b.along)[0];
    if (on) {
      reach = on.along;
      d.rob = on.id;
    }
  }
  d.reach = reach;
}

function stepHammer(q: Hungry, input: Input, dt: number) {
  const h = q.hammer;
  h.stun = Math.max(0, h.stun - dt);
  h.since += dt;
  // ← swings his line toward the far side, → toward the near side, as he would steer from where he stands.
  if (input.held.left !== input.held.right) h.aim = Math.min(HUNGRY.aim, Math.max(-HUNGRY.aim, h.aim + (input.held.left ? 1 : -1) * HUNGRY.aimRate * dt));
  h.duck = input.held.down && !h.dive && h.swing <= 0;
  const free = !h.duck && h.stun <= 0;
  if (input.pressed.hammer && !h.dive && h.swing <= 0 && free) {
    h.swing = HUNGRY.swing;
    h.bonked = false;
    q.events.push({ type: "hhSwing" });
  }
  if (h.swing > 0) {
    h.swing = Math.max(0, h.swing - dt);
    if (!h.bonked && 1 - h.swing / HUNGRY.swing >= HUNGRY.strike) {
      h.bonked = true;
      bonk(q);
    }
  }
  if (!h.dive) {
    if (!(input.pressed.jump || input.pressed.fire) || h.swing > 0 || !free || h.since < HUNGRY.cadence) return;
    h.dive = newDive(dirOf(1, h.aim), baseReach(q), "coil");
    h.since = 0;
  }
  const d = h.dive;
  if (d.phase === "coil") {
    d.held += dt;
    d.dir = dirOf(1, h.aim);
    d.charged = d.held > HUNGRY.tap;
    aimDive(q, d);
    if (!(input.held.jump || input.held.fire) || d.held >= HUNGRY.charge - 1e-9) {
      d.phase = "out";
      d.t = 0;
      q.events.push({ type: "hhDive", who: "hammer", charged: d.charged });
    }
    return;
  }
  advance(q, h, dt);
}

/** A dive along its phases: out (sweeping), the hold at full stretch, back to the plate. */
function advance(q: Hungry, e: Eater, dt: number) {
  const d = e.dive!;
  d.t += dt;
  if (d.phase === "out") {
    const from = d.ext;
    d.ext = Math.min(d.reach, d.ext + HUNGRY.out * dt);
    if (e.id === "hammer" && slapped(q)) return;
    sweep(q, e, from, d.ext);
    if (d.ext >= d.reach - 1e-9) {
      d.phase = "hold";
      d.t = 0;
      stretch(q, e);
    }
  } else if (d.phase === "hold") {
    if (d.t >= HUNGRY.hold - 1e-9) {
      d.phase = "back";
      d.t = 0;
    }
  } else if (d.phase === "back") {
    d.ext = Math.max(0, d.ext - HUNGRY.back * dt);
    if (d.ext <= 0) e.dive = null;
  }
  if (e.dive) {
    e.dive.trail.push(handOf(e));
    if (e.dive.trail.length > Math.round(0.1 / STEP)) e.dive.trail.shift();
  }
}

/** The hand moved out from `from` to `to`: every dish on the cloth whose plate it crossed goes into the haul. */
function sweep(q: Hungry, e: Eater, from: number, to: number) {
  const d = e.dive!;
  const p = SEATS[e.id].plate;
  const took = q.dishes.filter((x) => {
    if (x.fall > 0) return false;
    const v = sub(x, p);
    const along = v.x * d.dir.x + v.y * d.dir.y;
    return along >= from && along <= to && Math.abs(v.x * d.dir.y - v.y * d.dir.x) <= HUNGRY.sweep + x.r;
  });
  if (!took.length) return;
  q.dishes = q.dishes.filter((x) => !took.includes(x));
  for (const x of took) d.haul.push({ kind: x.kind, bonus: 0 });
  const hand = handOf(e);
  q.events.push({ type: "hhChomp", who: e.id, x: hand.x, y: hand.y, count: took.length });
}

/** Full stretch: a charged dive on a rival's plate robs its top dish; then what the hand holds flies home. */
function stretch(q: Hungry, e: Eater) {
  const d = e.dive!;
  if (d.rob && e.id === "hammer") {
    const r = q.rivals[d.rob];
    const kind = r.plate.pop();
    if (kind) {
      d.haul.push({ kind, bonus: HUNGRY.rob });
      q.score.robbed++;
      const at = SEATS[d.rob].plate;
      q.events.push({ type: "hhRob", from: d.rob, kind, x: at.x, y: at.y });
      think(q, "That's MINE now.");
      robbed(q, r);
    }
  }
  const from = handOf(e);
  for (const h of d.haul) q.flights.push({ kind: h.kind, to: e.id, from, t: 0, bonus: h.bonus });
  d.haul = [];
}

/** He robbed `r`: angrier, and paying him back (R4 §4). */
function robbed(q: Hungry, r: Rival) {
  r.anger++;
  r.calm = 0;
  payback(q, r.id);
}

/** A robbed rival's payback: the student's paper, the bellhop's suitcase, the nurse's "Excuse me?" (her anger is the slap). */
export function payback(q: Hungry, id: RivalId): void {
  if (id === "student") {
    q.planes.push({ from: { ...SEATS.student.plate }, to: { ...SEATS.hammer.stand }, d: 0, wait: HUNGRY.plane.windup, done: false, hit: false });
    say(q, "student", "Heads up!");
  } else if (id === "bellhop") {
    const p = SEATS.hammer.plate;
    const dir = dirOf(1, q.hammer.aim);
    const { out, w, h, t } = HUNGRY.suitcase;
    const c = { x: p.x + dir.x * out, y: p.y + dir.y * out };
    q.suitcases.push({ x: c.x - w / 2, y: c.y - h / 2, w, h, t });
    q.events.push({ type: "hhSuitcase", x: c.x, y: c.y, on: true });
    say(q, "bellhop", "Your bag, sir.");
  } else say(q, "nurse", "Excuse me?");
}

/** A rival's reaction now: a fifth quicker each level of anger, never under 0.15 s (R4 §4). */
export const reactionFor = (r: Rival) => Math.max(HUNGRY.rival.floor, r.base * HUNGRY.rival.quicker ** r.anger);

/** A dish a rival goes for: at rest within 400 px of its plate, on a line within 50 degrees of level on screen, either way. */
function reachable(r: Rival, d: Dish): boolean {
  if (!settled(d)) return false;
  const v = sub(d, SEATS[r.id].plate);
  const n = Math.hypot(v.x, v.y);
  if (n < 1 || n > HUNGRY.rival.range) return false;
  const deg = Math.abs(screenDeg(1, v));
  return deg <= HUNGRY.rival.cone || deg >= 180 - HUNGRY.rival.cone;
}

function stepRival(q: Hungry, r: Rival, dt: number) {
  r.since += dt;
  if (r.anger > 0) {
    r.calm += dt;
    if (r.calm >= HUNGRY.rival.calm - 1e-9) {
      r.anger--;
      r.calm = 0;
    }
  }
  r.stun = Math.max(0, r.stun - dt);
  if (r.dive) return advance(q, r, dt);
  if (r.asleep || r.stun > 0) {
    r.wait = -1;
    r.target = null;
    r.burst = 0;
    return;
  }
  const p = SEATS[r.id].plate;
  if (r.wait < 0) {
    const t = q.dishes.filter((d) => reachable(r, d)).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (t) {
      // Within a burst the next dive comes as fast as it can; a fresh one waits out the reaction.
      r.wait = r.burst > 0 ? 0 : reactionFor(r);
      r.target = t.id;
    } else r.burst = 0;
    return;
  }
  r.wait -= dt;
  if (r.wait > 1e-9 || r.since < HUNGRY.cadence - 1e-9) return;
  r.wait = -1;
  const d = q.dishes.find((x) => x.id === r.target);
  r.target = null;
  if (!d || !reachable(r, d)) {
    r.burst = 0;
    return;
  }
  const [lo, hi] = HUNGRY.rival.burst;
  if (r.burst <= 0) r.burst = lo + Math.floor(q.rng() * (hi - lo + 1));
  r.burst--;
  const v = sub(d, p);
  const n = Math.hypot(v.x, v.y);
  r.dive = newDive({ x: v.x / n, y: v.y / n }, n + d.r, "out");
  r.since = 0;
  q.events.push({ type: "hhDive", who: r.id, charged: false });
}

/** How far a dive along `dir` from `p` gets before a suitcase stops it: short of the box by half the hand. */
function caseStop(q: Hungry, p: Point, dir: Point): number {
  let stop = Infinity;
  for (const b of q.suitcases) {
    let t0 = 0;
    let t1 = Infinity;
    let hit = true;
    for (const [o, v, lo, hi] of [
      [p.x, dir.x, b.x, b.x + b.w],
      [p.y, dir.y, b.y, b.y + b.h],
    ] as const) {
      if (Math.abs(v) < 1e-12) {
        if (o < lo || o > hi) hit = false;
        continue;
      }
      const a = (lo - o) / v;
      const c = (hi - o) / v;
      t0 = Math.max(t0, Math.min(a, c));
      t1 = Math.min(t1, Math.max(a, c));
    }
    if (hit && t0 <= t1) stop = Math.min(stop, Math.max(0, t0 - HUNGRY.sweep));
  }
  return stop;
}

/** A hand lets go of what it holds: the dishes land on the cloth round where it is. */
function drop(q: Hungry, e: Eater, at: Point) {
  const d = e.dive;
  if (!d) return;
  for (const h of d.haul) addDish(q, h.kind, at.x + (q.rng() - 0.5) * 40, at.y + (q.rng() - 0.5) * 40);
  d.haul = [];
}

/** The angry nurse slaps a hand that comes into her zone: what it holds drops, he is stunned a second (R4 §4). */
function slapped(q: Hungry): boolean {
  const n = q.rivals.nurse;
  const h = q.hammer;
  if (n.anger <= 0 || n.stun > 0 || n.asleep || !h.dive) return false;
  const hand = handOf(h);
  if (dist(hand, SEATS.nurse.plate) > HUNGRY.slap.zone) return false;
  drop(q, h, hand);
  h.dive.phase = "back";
  h.dive.t = 0;
  h.stun = HUNGRY.slap.stun;
  q.events.push({ type: "hhSlap", x: hand.x, y: hand.y });
  say(q, "nurse", "Sanitize!");
  think(q, "I've HAD my shots.");
  return true;
}

/** Two hands out at once within 110 px of each other in the last 0.1 s (R4 §3): both back empty, the food near them scattered. */
function clashes(q: Hungry) {
  const h = q.hammer;
  if (h.dive?.phase !== "out") return;
  const a = handOf(h);
  for (const id of RIVALS) {
    const r = q.rivals[id];
    if (r.dive?.phase !== "out") continue;
    const b = handOf(r);
    const reach = HUNGRY.clash.reach;
    const met = dist(a, b) <= reach || r.dive.trail.some((p) => dist(p, a) <= reach) || h.dive.trail.some((p) => dist(p, b) <= reach);
    if (!met) continue;
    const at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    drop(q, h, a);
    drop(q, r, b);
    for (const e of [h.dive, r.dive]) {
      e.phase = "back";
      e.t = 0;
    }
    for (const d of q.dishes) {
      if (d.fall > 0) continue;
      const v = sub(d, at);
      const n = Math.hypot(v.x, v.y);
      if (n > HUNGRY.clash.scatter) continue;
      const k = n > 1e-6 ? 1 / n : 0;
      const a2 = q.rng() * Math.PI * 2;
      d.vx = (k ? v.x * k : Math.cos(a2)) * HUNGRY.clash.speed;
      d.vy = (k ? v.y * k : Math.sin(a2)) * HUNGRY.clash.speed;
    }
    q.events.push({ type: "hhClash", x: at.x, y: at.y });
    return;
  }
}

/** Where the server is on her walk behind the far side: `s` 0 at the right end, 1 at his corner. */
export function serverAt(q: Hungry): Point {
  const { from, to, radius } = HUNGRY.server;
  const a = (from + (to - from) * q.server.s) * DEG;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

function stepServer(q: Hungry, dt: number) {
  const s = q.server;
  const S = HUNGRY.server;
  s.quiet = Math.max(0, s.quiet - dt);
  if (s.away > 0) {
    s.away -= dt;
    // Back from the right end, where she lingers first.
    if (s.away <= 0) Object.assign(s, { away: 0, s: 0, dir: 1, wait: S.linger });
    return;
  }
  if (s.wait > 0) s.wait -= dt;
  else {
    s.s += (s.dir * dt) / (S.trip / 2);
    if (s.s >= 1) Object.assign(s, { s: 1, dir: -1, wait: S.linger });
    else if (s.s <= 0) Object.assign(s, { s: 0, dir: 1, wait: S.linger });
  }
  const at = serverAt(q);
  const bused = q.dishes.filter((d) => settled(d) && Math.hypot(d.x, d.y) >= TABLE.r - S.bus && dist(d, at) <= S.reach);
  if (!bused.length) return;
  q.dishes = q.dishes.filter((d) => !bused.includes(d));
  q.events.push({ type: "hhBus", x: at.x, y: at.y, count: bused.length });
  if (s.quiet <= 0) {
    say(q, "server", "Are we still working on that?", 1.6);
    s.quiet = S.quiet;
  }
}

/** Where a plane is on its way from the student's plate to his spot. */
export function planeAt(p: Plane): Point {
  const v = sub(p.to, p.from);
  const k = p.d / Math.hypot(v.x, v.y);
  return { x: p.from.x + v.x * k, y: p.from.y + v.y * k };
}

function stepPlanes(q: Hungry, dt: number) {
  const h = q.hammer;
  for (const p of q.planes) {
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.wait <= 0) q.events.push({ type: "hhPlane", ...planeAt(p) });
      continue;
    }
    p.d += HUNGRY.plane.speed * dt;
    if (p.done || p.d < dist(p.from, p.to)) continue;
    p.done = true;
    // It hits him only where he is: ducked under the edge, or out on the table, it sails on past.
    p.hit = !h.duck && !(h.dive && h.dive.ext > 100);
    if (p.hit) {
      q.score.plate -= HUNGRY.plane.hit;
      q.score.paper++;
    }
    q.events.push({ type: "hhPaper", x: p.to.x, y: p.to.y, hit: p.hit });
  }
  q.planes = q.planes.filter((p) => !p.done || (!p.hit && p.d < dist(p.from, p.to) + 400));
}

/** What else the bonk catches (R4 §3): a rival's hand, the server, a suitcase, paper. True when it caught anything. */
function bonkOthers(q: Hungry): boolean {
  const p = SEATS.hammer.plate;
  const R = HUNGRY.bonk.reach;
  let hit = false;
  for (const id of RIVALS) {
    const r = q.rivals[id];
    if (!r.dive || r.dive.phase === "back" || dist(handOf(r), p) > R) continue;
    const at = handOf(r);
    drop(q, r, at);
    r.dive.phase = "back";
    r.dive.t = 0;
    r.stun = HUNGRY.rival.stun;
    q.events.push({ type: "hhStun", who: id, x: at.x, y: at.y });
    hit = true;
  }
  const s = serverAt(q);
  if (q.server.away <= 0 && dist(s, p) <= R) {
    const n = Math.hypot(s.x, s.y);
    const inside = { x: (s.x / n) * (TABLE.r - 80), y: (s.y / n) * (TABLE.r - 80) };
    const course: Exclude<Course, "special"> = q.time < 25 ? "appetizer" : q.time < 42 ? "entree" : "dessert";
    dump(q, COURSES[course], HUNGRY.server.tray, inside, { x: -inside.x, y: -inside.y });
    q.server.away = HUNGRY.server.away;
    q.events.push({ type: "hhTray", x: inside.x, y: inside.y });
    think(q, "Is Pepsi okay? NO.");
    hit = true;
  }
  const near = (b: Box) => dist({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, p) <= R;
  for (const b of q.suitcases.filter(near)) {
    q.events.push({ type: "hhSuitcase", x: b.x + b.w / 2, y: b.y + b.h / 2, on: false });
    hit = true;
  }
  q.suitcases = q.suitcases.filter((b) => !near(b));
  const swatted = q.planes.filter((pl) => pl.wait <= 0 && !pl.done && dist(planeAt(pl), p) <= R);
  for (const pl of swatted) q.events.push({ type: "hhSwat", ...planeAt(pl) });
  if (swatted.length) hit = true;
  q.planes = q.planes.filter((pl) => !swatted.includes(pl));
  return hit;
}

function stepFlights(q: Hungry, dt: number) {
  for (const f of q.flights) f.t += dt;
  const landed = q.flights.filter((f) => f.t >= HUNGRY.fly - 1e-9);
  if (!landed.length) return;
  q.flights = q.flights.filter((f) => !landed.includes(f));
  for (const f of landed) land(q, f.to, f.kind, f.bonus);
}

/** A dish lands on a plate: on his it scores (R4 §6); on a rival's it stacks. */
export function land(q: Hungry, to: EaterId, kind: FoodKind, bonus = 0): void {
  if (to !== "hammer") {
    q.rivals[to].plate.push(kind);
    q.events.push({ type: "hhLand", who: to, kind, points: 0 });
    think(q, "Are you going to finish that?");
    return;
  }
  const sc = q.score;
  q.hammer.plate.push(kind);
  if (kind === "check") {
    sc.plate += FOODS.check.value;
    sc.bill = true;
    q.events.push({ type: "hhLand", who: "hammer", kind, points: FOODS.check.value });
    think(q, "YOU picked up the bill?", 2);
    return;
  }
  let points = FOODS[kind].value;
  if (sc.togo > 0 && kind !== "togo") {
    points *= 2;
    sc.togo--;
  }
  sc.chain = q.time - sc.last <= HUNGRY.combo.window ? sc.chain + 1 : 1;
  sc.last = q.time;
  sc.best = Math.max(sc.best, sc.chain);
  const mult = sc.chain >= HUNGRY.combo.triple ? 3 : sc.chain >= HUNGRY.combo.double ? 2 : 1;
  sc.plate += points + bonus;
  sc.bonus += (points + bonus) * (mult - 1);
  sc.eaten++;
  if (FOODS[kind].course === "special") {
    sc.specials.push(kind);
    if (kind === "togo") sc.togo = HUNGRY.togo;
    else think(q, "Room charge.");
  }
  q.events.push({ type: "hhLand", who: "hammer", kind, points: (points + bonus) * mult });
}

/** The mallet on the rim in front of him (R4 §3): the food near him jumps toward the middle (Task 4 adds the rest). */
export function bonk(q: Hungry): void {
  const p = SEATS.hammer.plate;
  for (const d of q.dishes) {
    if (d.fall > 0 || dist(d, p) > HUNGRY.bonk.reach) continue;
    const v = sub(d, p);
    const n = Math.hypot(v.x, v.y);
    const u = n > 1e-6 ? { x: v.x / n, y: v.y / n } : { x: 1, y: 0 };
    d.vx = u.x * HUNGRY.bonk.push;
    d.vy = u.y * HUNGRY.bonk.push;
  }
  const hit = bonkOthers(q);
  q.events.push({ type: "hhBonk", x: -TABLE.r + 30, y: 0, hit });
}

function finish(q: Hungry) {
  // What is still in the air when the clock runs out lands first.
  for (const f of q.flights) land(q, f.to, f.kind, f.bonus);
  q.flights = [];
  const sc = q.score;
  const score = Math.max(0, Math.round(sc.plate + sc.bonus));
  const grade = gradeFor(score);
  q.result = {
    score,
    grade,
    full: score >= GRADES[1][0],
    plate: sc.plate,
    grabs: sc.eaten,
    comboBonus: sc.bonus,
    bestCombo: sc.best,
    robbed: sc.robbed,
    paper: sc.paper,
    specials: [...sc.specials],
    bill: sc.bill,
    cans: sc.specials.filter((k) => k === "coke").length,
    nuts: sc.specials.includes("nuts"),
    bucees: sc.specials.includes("bucees"),
    hot: sc.specials.includes("hotsauce"),
  };
  q.events.push({ type: "hhEnd", score, grade });
}

/** One step of the round. */
export function stepHungry(q: Hungry, input: Input, dt: number): void {
  q.events = [];
  if (q.result) return;
  q.time += dt;
  schedule(q, dt);
  stepCart(q, dt);
  stepServer(q, dt);
  for (const s of q.suitcases) s.t -= dt;
  for (const s of q.suitcases.filter((b) => b.t <= 0)) q.events.push({ type: "hhSuitcase", x: s.x + s.w / 2, y: s.y + s.h / 2, on: false });
  q.suitcases = q.suitcases.filter((b) => b.t > 0);
  stepDishes(q.dishes, dt, q.suitcases);
  stepHammer(q, input, dt);
  // His sweep goes first: a dish two hands cross in one step is his.
  for (const id of RIVALS) stepRival(q, q.rivals[id], dt);
  clashes(q);
  stepFlights(q, dt);
  stepPlanes(q, dt);
  if (q.time >= HUNGRY.round - 1e-9) finish(q);
}

/** The hint line during the round (R4 §9), first match wins. */
export function hungryHint(q: Hungry): string {
  if (q.planes.length) return "Paper incoming · ↓ ducks, H swats";
  if (q.suitcases.length) return "Suitcase on the table · H clears it";
  if (q.hammer.stun > 0) return "Slapped · wait a second";
  if (q.score.togo > 0) return `To-go box · next ${q.score.togo} grabs double`;
  if (q.rivals.nurse.anger > 0) return "The nurse is angry · keep your hand out of her zone";
  return "Tap Space to dive · hold to reach farther and rob a plate · ← → aim · H bonks the server";
}
