import type { Input } from "../../input";
import { seededRandom } from "../../rewards";
import type { Point, Rect } from "../../types";
import { CITY_CODES, HOME, MAP, PAD, TAGS, cityAt, classOf, fareFor, pointsFor, type CityCode, type FareClass, type TagKind } from "./board";
import type { FaresEvent } from "./events";

/** The round's numbers (R5 design §3 to §7): map px and seconds. */
export const FARES = {
  throws: 10,
  /** The crosshair: `x = 540 + ax sin θ`, `y = 300 + ay sin(ratio θ + phase)`, θ at `w` rad/s, `w` × `rise` a throw. */
  aim: { w: 1.4, rise: 1.08, ratio: 1.618, phase: 0.7, ax: 540, ay: 300 },
  steady: { factor: 0.35, budget: 2.5, refill: 0.2 },
  tags: { every: 0.9, max: 4, life: 2.6, flicker: 0.6, flash: 0.2 },
  /** The throw clip, the scalpel's flight, and the beat after the tenth before the tally. */
  windup: 0.3,
  flight: 0.22,
  end: 1,
  ladder: { start: 179, book: 20, streak: 30, miss: 60 },
  /** The streak begins at this many bookings in a row. */
  streak: 3,
  cloud: { after: [2, 6], t: 3 },
  stop: { t: 2, cost: 200, from: 2, to: 8 },
  agent: { t: 1.4, from: 4, to: 8, band: 160, w: 150 },
  seating: { points: 500, life: 1.6, from: 5, to: 9 },
  fee: { points: 300 },
  mouth: { every: 6, streak: 3, again: 1.2, angry: 2, bubble: 1.4 },
} as const;

export type Traveler = "office" | "student" | "prof" | "nurse";
export const TRAVELERS: readonly Traveler[] = ["office", "student", "prof", "nurse"];

export type Outcome = "book" | "miss" | "cloud" | "stop" | "agent";
/** `t` seconds alive; `stopped` seconds left of a ground stop's X. */
export type Tag = { id: number; city: CityCode; kind: TagKind; fare: number; flash: boolean; t: number; life: number; stopped: number };
/** A boarding pass: `position` his boarding position after it; `cls` null for the bonus tags. */
export type Booking = { city: CityCode; kind: TagKind; cls: FareClass | null; fare: number; points: number; companion: boolean; position: number };
/** A scalpel thrown: where it lands and what it does there, decided at the press. */
export type Shot = { at: Point; t: number; phase: "windup" | "flight"; outcome: Outcome; tag: Tag | null };
export type FaresGrade = "A-LIST PREFERRED" | "A-LIST" | "B GROUP" | "C GROUP";
export type FaresResult = {
  score: number;
  grade: FaresGrade;
  bookings: Booking[];
  booked: number;
  /** Wanna Get Away fares booked: three cans each from the door. */
  wga: number;
  companions: number;
  seating: boolean;
  fee: boolean;
  cancelled: number;
  misses: number;
  bestStreak: number;
  preferred: boolean;
  /** What the door brings home: a box of #15 blades a booking, the cans, a full smash from B GROUP, a life at A1. */
  boxes: number;
  cans: number;
  nuts: boolean;
  lives: number;
};
/** The tests' switches: `false` turns off the tags spawning on their own, the hazards and the insults on their own. */
export type FaresOptions = { practice?: boolean; tags?: boolean; hazards?: boolean; mouth?: boolean };
export type Fares = {
  id: "fares";
  rng: () => number;
  practice: boolean;
  /** The options as live switches, which a test may flip on a round the door made. */
  spawning: boolean;
  hazards: boolean;
  mouth: boolean;
  time: number;
  theta: number;
  w: number;
  /** Seconds left of the steady hand. */
  steady: number;
  thrown: number;
  stuck: number;
  shot: Shot | null;
  stuckAt: Point[];
  tags: Tag[];
  spawnT: number;
  nextId: number;
  position: number;
  streak: number;
  bestStreak: number;
  preferred: boolean;
  score: number;
  bookings: Booking[];
  misses: number;
  cancelled: number;
  cloud: { third: 0 | 1 | 2; t: number } | null;
  agent: { t: number } | null;
  /** The tests' and the dev hook's held crosshair. */
  pin: Point | null;
  /** His thoughts this round: each once. */
  said: Set<string>;
  /** Seconds left of the beat after the tenth, or -1. */
  endT: number;
  events: FaresEvent[];
  result: FaresResult | null;
};

export function createFares(seed: number, opts: FaresOptions = {}): Fares {
  return {
    id: "fares",
    rng: seededRandom(seed),
    practice: !!opts.practice,
    spawning: opts.tags !== false,
    hazards: opts.hazards !== false,
    mouth: opts.mouth !== false,
    time: 0,
    theta: 0,
    w: FARES.aim.w,
    steady: FARES.steady.budget,
    thrown: 0,
    stuck: 0,
    shot: null,
    stuckAt: [],
    tags: [],
    spawnT: FARES.tags.every,
    nextId: 1,
    position: FARES.ladder.start,
    streak: 0,
    bestStreak: 0,
    preferred: false,
    score: 0,
    bookings: [],
    misses: 0,
    cancelled: 0,
    cloud: null,
    agent: null,
    pin: null,
    said: new Set(),
    endT: -1,
    events: [],
    result: null,
  };
}

/** Where the crosshair is on the map at θ: a looping figure whose second wave at 1.618 never lets it close. */
export function crosshair(theta: number): Point {
  const a = FARES.aim;
  return { x: MAP.w / 2 + a.ax * Math.sin(theta), y: MAP.h / 2 + a.ay * Math.sin(a.ratio * theta + a.phase) };
}
export const aimOf = (q: Fares): Point => q.pin ?? crosshair(q.theta);

const sizeOf = (t: Tag) => (t.kind === "fare" ? TAGS[classOf(t.fare)] : TAGS[t.kind]);
/** A tag on the map, centered on its city, with the 2 px pad. */
export function tagRect(t: Tag): Rect {
  const c = cityAt(t.city);
  const s = sizeOf(t);
  return { x: c.x - s.w / 2 - PAD, y: c.y - s.h / 2 - PAD, w: s.w + 2 * PAD, h: s.h + 2 * PAD };
}
const inside = (p: Point, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
/** The live tag a point books: of those whose rect holds it, the one whose city is nearest. */
export function tagAt(q: Fares, p: Point): Tag | null {
  let best: Tag | null = null;
  let bestD = Infinity;
  for (const t of q.tags) {
    if (t.t >= t.life || !inside(p, tagRect(t))) continue;
    const c = cityAt(t.city);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** A tag on a city (replacing a live one there): a fare, or one of the bonus tags. */
export function addTag(q: Fares, city: CityCode, kind: TagKind = "fare", flash = false): Tag {
  q.tags = q.tags.filter((t) => t.city !== city);
  const t: Tag = { id: q.nextId++, city, kind, fare: kind === "fare" ? fareFor(city, flash) : 0, flash, t: 0, life: kind === "seating" ? FARES.seating.life : FARES.tags.life, stopped: 0 };
  q.tags.push(t);
  q.events.push({ type: "fdTag", id: t.id, city, kind, fare: t.fare, flash });
  return t;
}

/** Boarding positions 0 to 179: A1 to A60, B1 to B60, C1 to C60. */
export const groupOf = (position: number) => `${"ABC"[Math.floor(position / 60)]}${(position % 60) + 1}`;
export const gradeOf = (booked: number, preferred: boolean): FaresGrade =>
  preferred ? "A-LIST PREFERRED" : booked >= 7 ? "A-LIST" : booked >= 4 ? "B GROUP" : "C GROUP";
/** Any action key throws: Space, F, H or Q (and their twins). */
export const throwPressed = (input: Input) => input.pressed.jump || input.pressed.fire || input.pressed.hammer || input.pressed.super;

function think(q: Fares, text: string, seconds = 1.8) {
  if (q.said.has(text)) return;
  q.said.add(text);
  q.events.push({ type: "fdThink", text, seconds });
}

function spawnTag(q: Fares) {
  const free = CITY_CODES.filter((c) => c !== HOME && !q.tags.some((t) => t.city === c));
  if (!free.length) return;
  const city = free[Math.floor(q.rng() * free.length)];
  addTag(q, city, "fare", q.rng() < FARES.tags.flash);
}

function stepTags(q: Fares, dt: number) {
  for (const t of q.tags) {
    t.t += dt;
    if (t.stopped > 0) t.stopped = Math.max(0, t.stopped - dt);
  }
  for (const t of q.tags.filter((t) => t.t >= t.life)) q.events.push({ type: "fdTagGone", id: t.id });
  q.tags = q.tags.filter((t) => t.t < t.life);
  if (!q.spawning) return;
  q.spawnT -= dt;
  while (q.spawnT <= 1e-9) {
    q.spawnT += FARES.tags.every;
    if (q.tags.filter((t) => t.kind === "fare").length < FARES.tags.max) spawnTag(q);
  }
}

/** The press: where the crosshair is now is where the scalpel lands, against the tags live now. */
function press(q: Fares) {
  const at = aimOf(q);
  const tag = tagAt(q, at);
  q.shot = { at, t: 0, phase: "windup", outcome: tag ? "book" : "miss", tag };
  q.thrown++;
  q.events.push({ type: "fdThrow", at });
}

function book(q: Fares, s: Shot, tag: Tag) {
  const cls = tag.kind === "fare" ? classOf(tag.fare) : null;
  const companion = q.bookings.some((b) => b.city === tag.city);
  const base = cls ? pointsFor(cls, tag.fare) : tag.kind === "seating" ? FARES.seating.points : FARES.fee.points;
  const points = base * (companion ? 2 : 1) * (q.preferred ? 2 : 1);
  q.score += points;
  q.streak++;
  q.bestStreak = Math.max(q.bestStreak, q.streak);
  const from = q.position;
  q.position = Math.max(0, from - (q.streak >= FARES.streak ? FARES.ladder.streak : FARES.ladder.book));
  q.steady = Math.min(FARES.steady.budget, q.steady + FARES.steady.refill);
  const booking: Booking = { city: tag.city, kind: tag.kind, cls, fare: tag.fare, points, companion, position: q.position };
  q.bookings.push(booking);
  q.tags = q.tags.filter((t) => t !== tag);
  q.events.push({ type: "fdStick", at: s.at, outcome: "book", booking, points, tag: tag.id });
  q.events.push({ type: "fdLadder", from, to: q.position });
  if (cls === "business") think(q, "I don't PAY Business Select. I AM business select.");
  if (companion) think(q, "Companion Pass? I fly alone.");
  if (from >= 120 && q.position < 120) think(q, "I don't do group C.");
  if (from > 15 && q.position <= 15) think(q, "A16. Right where I belong.");
  if (q.streak === FARES.streak) think(q, "Rapid Rewards. Rapidly.");
  if (q.position === 0 && !q.preferred) {
    q.preferred = true;
    q.events.push({ type: "fdPreferred" });
    q.events.push({ type: "fdSay", who: "agent", text: "Now boarding... just Mr. Hammer.", seconds: 2 });
  }
}

function miss(q: Fares, s: Shot) {
  q.misses++;
  q.streak = 0;
  const from = q.position;
  q.position = Math.min(FARES.ladder.start, from + FARES.ladder.miss);
  q.events.push({ type: "fdStick", at: s.at, outcome: s.outcome, booking: null, points: 0, tag: s.tag?.id ?? null });
  if (q.position !== from) q.events.push({ type: "fdLadder", from, to: q.position });
  think(q, "That's a $400 demo unit.");
}

function stick(q: Fares, s: Shot) {
  q.shot = null;
  q.stuck++;
  q.stuckAt.push(s.at);
  if (s.outcome === "book" && s.tag) book(q, s, s.tag);
  else miss(q, s);
  q.w *= FARES.aim.rise;
  if (q.stuck >= FARES.throws) q.endT = FARES.end;
}

function resultOf(q: Fares): FaresResult {
  const booked = q.bookings.length;
  const wga = q.bookings.filter((b) => b.kind === "fare" && b.cls === "wga").length;
  return {
    score: Math.max(0, q.score),
    grade: gradeOf(booked, q.preferred),
    bookings: q.bookings,
    booked,
    wga,
    companions: q.bookings.filter((b) => b.companion).length,
    seating: q.bookings.some((b) => b.kind === "seating"),
    fee: q.bookings.some((b) => b.kind === "fee"),
    cancelled: q.cancelled,
    misses: q.misses,
    bestStreak: q.bestStreak,
    preferred: q.preferred,
    boxes: booked,
    cans: 3 * wga,
    nuts: booked >= 4,
    lives: q.preferred ? 1 : 0,
  };
}

/** One step of the round. */
export function stepFares(q: Fares, input: Input, dt: number): void {
  q.events = [];
  if (q.result) return;
  q.time += dt;
  const steadied = input.held.run && q.steady > 0;
  if (steadied) q.steady = Math.max(0, q.steady - dt);
  q.theta += q.w * (steadied ? FARES.steady.factor : 1) * dt;
  stepTags(q, dt);
  const s = q.shot;
  if (s) {
    s.t += dt;
    if (s.phase === "windup" && s.t >= FARES.windup - 1e-9) {
      s.phase = "flight";
      s.t -= FARES.windup;
      q.events.push({ type: "fdRelease", at: s.at });
    }
    if (s.phase === "flight" && s.t >= FARES.flight - 1e-9) stick(q, s);
  } else if (q.thrown < FARES.throws && throwPressed(input)) press(q);
  if (q.endT >= 0) {
    q.endT -= dt;
    if (q.endT <= 1e-9) {
      q.result = resultOf(q);
      q.events.push({ type: "fdEnd", score: q.result.score, grade: q.result.grade });
    }
  }
}
