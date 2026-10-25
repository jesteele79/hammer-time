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
  /** T towels off (owner, 2026-10-25): the shift's wipe, the steady hand full again at its end; two a round. */
  towel: { uses: 2, seconds: 0.95 },
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
  /** Towel-offs left this round, and seconds left of one under way (0: none). */
  towels: number;
  wipe: number;
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
  /** The hazards still to come (R5 §6). */
  due: Due[];
  /** Seconds to his next insult on its own; when the last came; seconds to a miss's second insult, or -1. */
  mouthT: number;
  insultAt: number;
  again: number;
  /** When each traveler's bubble now up comes down: never more than two at once. */
  talk: number[];
  /** Which reply comes next. */
  lines: number;
  /** The tests' and the dev hook's held crosshair. */
  pin: Point | null;
  /** His thoughts this round: each once. */
  said: Set<string>;
  /** Seconds left of the beat after the tenth, or -1. */
  endT: number;
  events: FaresEvent[];
  result: FaresResult | null;
};

/** A hazard to come: `after` that many scalpels have stuck, `delay` seconds later. */
export type Due = { what: "cloud" | "stop" | "agent" | "seating" | "fee"; after: number; delay: number; done: boolean };

export function createFares(seed: number, opts: FaresOptions = {}): Fares {
  const rng = seededRandom(seed);
  /** A hazard coming as he lines up throw k of from..to: after k - 1 have stuck. */
  const due = (what: Due["what"], from: number, to: number): Due => ({ what, after: from + Math.floor(rng() * (to - from + 1)) - 1, delay: rng() * 0.8, done: false });
  return {
    id: "fares",
    rng,
    practice: !!opts.practice,
    spawning: opts.tags !== false,
    hazards: opts.hazards !== false,
    mouth: opts.mouth !== false,
    time: 0,
    theta: 0,
    w: FARES.aim.w,
    steady: FARES.steady.budget,
    towels: FARES.towel.uses,
    wipe: 0,
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
    due: [due("cloud", 3, 3), due("cloud", 7, 7), due("stop", FARES.stop.from, FARES.stop.to), due("agent", FARES.agent.from, FARES.agent.to), due("seating", FARES.seating.from, FARES.seating.to), due("fee", 1, FARES.throws)],
    mouthT: FARES.mouth.every * (0.85 + 0.3 * rng()),
    insultAt: -Infinity,
    again: -1,
    talk: [],
    lines: 0,
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
/** Which third of the map, west to east, a point is in: the storm cloud covers one. */
const thirdOf = (x: number) => Math.min(2, Math.max(0, Math.floor((x / MAP.w) * 3))) as 0 | 1 | 2;

/** The gate agent crossing in front of the board: out from her podium to the map's middle and back, over its lowest band. */
export function agentBox(q: Fares): Rect | null {
  if (!q.agent) return null;
  const u = Math.min(1, q.agent.t / FARES.agent.t);
  const k = u < 0.5 ? 2 * u : 2 - 2 * u;
  const half = FARES.agent.w / 2;
  const x = MAP.w + half - (MAP.w / 2 + half) * k;
  return { x: x - half, y: MAP.h - FARES.agent.band, w: FARES.agent.w, h: FARES.agent.band };
}
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

/** What the travelers say back to him, what they say at a booking, at a streak and at a miss (R5 §7). */
const REPLIES = ["Okay, boomer.", "Sir, I'm on a call.", "...wow.", "I'm filming this.", "It's a free country.", "Did he just—"];
const OOH = ["Ooh!", "Ahh!", "Nice!"];
const LAUGHS = ["HA!", "Ha ha ha!", "Nice throw, grandpa."];

/** A line in a bubble: the agent always; a traveler only while fewer than two are talking. */
function say(q: Fares, who: Traveler | "agent", text: string, seconds: number = FARES.mouth.bubble) {
  if (who !== "agent") {
    q.talk = q.talk.filter((end) => end > q.time);
    if (q.talk.length >= 2) return;
    q.talk.push(q.time + seconds);
  }
  q.events.push({ type: "fdSay", who, text, seconds });
}
const pickOf = <T>(q: Fares, list: readonly T[]) => list[Math.floor(q.rng() * list.length)];
/** Between `min` and `max` of the travelers, at random. */
function someTravelers(q: Fares, min: number, max: number): Traveler[] {
  const left = [...TRAVELERS];
  const out: Traveler[] = [];
  for (let n = min + Math.floor(q.rng() * (max - min + 1)); n > 0; n--) out.push(left.splice(Math.floor(q.rng() * left.length), 1)[0]);
  return out;
}
/** Whom an insult is for: a traveler, or one time in six the agent. */
const targetOf = (q: Fares): Traveler | "agent" => (q.rng() < 1 / 6 ? "agent" : pickOf(q, TRAVELERS));

/** His outer monologue: an insult (the scene picks the line by its mood), and its answer. */
function insult(q: Fares, at: Traveler | "agent", mood: "calm" | "gloat" | "pissed") {
  q.events.push({ type: "fdInsult", at, mood });
  q.insultAt = q.time;
  q.mouthT = (q.streak >= FARES.streak ? FARES.mouth.streak : FARES.mouth.every) * (0.85 + 0.3 * q.rng());
  if (at === "agent") say(q, "agent", "Sir, please.");
  else say(q, at, REPLIES[q.lines++ % REPLIES.length]);
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
    if (t.stopped > 0) {
      t.stopped = Math.max(0, t.stopped - dt);
      if (t.stopped === 0 || t.t >= t.life) q.events.push({ type: "fdStop", tag: t.id, on: false });
    }
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
/** What a scalpel landing on `at` now would do: the agent's clipboard first, then the tag under it, cancelled or clouded or booked. */
export function outcomeAt(q: Fares, at: Point): { outcome: Outcome; tag: Tag | null } {
  const tag = tagAt(q, at);
  const agent = agentBox(q);
  if (agent && inside(at, agent)) return { outcome: "agent", tag };
  if (!tag) return { outcome: "miss", tag };
  return { outcome: tag.stopped > 0 ? "stop" : q.cloud && thirdOf(cityAt(tag.city).x) === q.cloud.third ? "cloud" : "book", tag };
}

function press(q: Fares) {
  const at = aimOf(q);
  const { outcome, tag } = outcomeAt(q, at);
  q.shot = { at, t: 0, phase: "windup", outcome, tag };
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
  if (tag.kind === "seating") think(q, "BRING BACK OPEN SEATING.");
  if (tag.kind === "fee") think(q, "Bags used to fly FREE.");
  const streaking = q.streak >= FARES.streak;
  if (q.streak === FARES.streak) q.events.push({ type: "fdMood", mood: "smug", seconds: 0 });
  if (q.mouth) {
    const who = streaking ? [...TRAVELERS] : someTravelers(q, 1, 2);
    q.events.push({ type: "fdCrowd", kind: "ooh", who });
    for (const t of who) say(q, t, streaking ? "OOOOH!" : pickOf(q, OOH));
    if (streaking) insult(q, pickOf(q, TRAVELERS), "gloat");
  }
  if (q.position === 0 && !q.preferred) {
    q.preferred = true;
    q.events.push({ type: "fdPreferred" });
    say(q, "agent", "Now boarding... just Mr. Hammer.", 2);
    if (q.mouth) q.events.push({ type: "fdCrowd", kind: "clap", who: [...TRAVELERS] });
  }
}

function miss(q: Fares, s: Shot) {
  q.misses++;
  q.streak = 0;
  const from = q.position;
  q.position = Math.min(FARES.ladder.start, from + FARES.ladder.miss);
  const cost = s.outcome === "stop" ? FARES.stop.cost : 0;
  q.score -= cost;
  q.events.push({ type: "fdStick", at: s.at, outcome: s.outcome, booking: null, points: -cost, tag: s.tag?.id ?? null });
  if (q.position !== from) q.events.push({ type: "fdLadder", from, to: q.position });
  if (s.outcome === "stop") {
    q.cancelled++;
    say(q, "agent", "Sir, that flight is cancelled.", 1.8);
  } else if (s.outcome === "agent") say(q, "agent", "Sir, you can't do that here.", 1.8);
  else if (s.outcome === "cloud") think(q, "Denver. Of course.");
  else think(q, "That's a $400 demo unit.");
  // A miss makes him pissed: the crowd laughs and he doubles down, the first insult at one who laughed.
  q.events.push({ type: "fdMood", mood: "angry", seconds: FARES.mouth.angry });
  if (!q.mouth) return;
  const who = someTravelers(q, 1, 3);
  q.events.push({ type: "fdCrowd", kind: "laugh", who });
  for (const t of who) say(q, t, pickOf(q, LAUGHS));
  insult(q, who[0], "pissed");
  q.again = FARES.mouth.again;
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

/** The dev hook's skip: the rest of the tray (one in the air too) goes as misses and the end's beat runs to the tally. */
export function skipFares(q: Fares): void {
  if (q.result || q.endT >= 0) return;
  q.misses += FARES.throws - q.stuck;
  q.thrown = q.stuck = FARES.throws;
  q.shot = null;
  q.endT = FARES.end;
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

/** A hazard begins; false while it has to wait (a ground stop needs a live fare to cancel). */
function start(q: Fares, what: Due["what"]): boolean {
  if (what === "cloud") {
    q.cloud = { third: Math.floor(q.rng() * 3) as 0 | 1 | 2, t: 0 };
    q.events.push({ type: "fdCloud", third: q.cloud.third, on: true });
  } else if (what === "stop") {
    const live = q.tags.filter((t) => t.kind === "fare" && t.stopped === 0 && t.life - t.t > 0.5);
    if (!live.length) return false;
    const t = pickOf(q, live);
    t.stopped = FARES.stop.t;
    q.events.push({ type: "fdStop", tag: t.id, on: true });
  } else if (what === "agent") {
    q.agent = { t: 0 };
    q.events.push({ type: "fdAgent", on: true });
  } else {
    const free = CITY_CODES.filter((c) => c !== HOME && !q.tags.some((t) => t.city === c));
    addTag(q, pickOf(q, free), what);
  }
  return true;
}

function stepHazards(q: Fares, dt: number) {
  if (q.cloud && (q.cloud.t += dt) >= FARES.cloud.t) {
    q.events.push({ type: "fdCloud", third: q.cloud.third, on: false });
    q.cloud = null;
  }
  if (q.agent && (q.agent.t += dt) >= FARES.agent.t) {
    q.events.push({ type: "fdAgent", on: false });
    q.agent = null;
  }
  if (!q.hazards) return;
  for (const d of q.due) {
    if (d.done || q.stuck < d.after) continue;
    d.delay -= dt;
    if (d.delay <= 0) d.done = start(q, d.what);
  }
}

function stepMouth(q: Fares, input: Input, dt: number) {
  if (q.again >= 0 && (q.again -= dt) <= 0) {
    q.again = -1;
    insult(q, pickOf(q, TRAVELERS), "pissed");
  }
  if (q.mouth && !q.shot && (q.mouthT -= dt) <= 0) insult(q, targetOf(q), "calm");
  if (input.pressed.lecture && !q.shot && q.time - q.insultAt >= FARES.mouth.again) insult(q, targetOf(q), "calm");
}

/** The hint line during the round (R5 §12), first match wins. */
export function faresHint(q: Fares): string {
  if (q.cloud) return "Storm over the map · wait it out";
  if (q.tags.some((t) => t.stopped > 0)) return "Cancelled flight · don't hit the X";
  if (q.steady <= 0 && q.towels > 0 && q.thrown < FARES.throws) return "Steady hand spent · T towels off";
  if (q.preferred) return "A-LIST PREFERRED · every scalpel counts double";
  return "Space throws · hold Shift to steady · T towels off · E mouths off";
}

/** One step of the round. */
export function stepFares(q: Fares, input: Input, dt: number): void {
  q.events = [];
  if (q.result) return;
  q.time += dt;
  // Mid-wipe his hand is on his face: no steadying, no throw, and the steady hand comes back full as it ends.
  const wiping = q.wipe > 0;
  const steadied = input.held.run && q.steady > 0 && !wiping;
  if (steadied) q.steady = Math.max(0, q.steady - dt);
  q.theta += q.w * (steadied ? FARES.steady.factor : 1) * dt;
  stepTags(q, dt);
  stepHazards(q, dt);
  if (wiping) {
    q.wipe = Math.max(0, q.wipe - dt);
    if (q.wipe <= 1e-9) {
      q.wipe = 0;
      q.steady = FARES.steady.budget;
      q.events.push({ type: "fdTowel", on: false });
    }
  }
  const s = q.shot;
  if (s) {
    s.t += dt;
    if (s.phase === "windup" && s.t >= FARES.windup - 1e-9) {
      s.phase = "flight";
      s.t -= FARES.windup;
      q.events.push({ type: "fdRelease", at: s.at });
    }
    if (s.phase === "flight" && s.t >= FARES.flight - 1e-9) stick(q, s);
  } else if (q.thrown < FARES.throws && q.wipe <= 0 && throwPressed(input)) press(q);
  if (input.pressed.towel && !q.shot && q.wipe <= 0 && q.towels > 0 && q.steady < FARES.steady.budget - 1e-9 && q.thrown < FARES.throws) {
    q.towels--;
    q.wipe = FARES.towel.seconds;
    q.events.push({ type: "fdTowel", on: true });
    think(q, "Sweat is for Group C.");
  }
  stepMouth(q, input, dt);
  if (q.endT >= 0) {
    q.endT -= dt;
    if (q.endT <= 1e-9) {
      q.result = resultOf(q);
      q.events.push({ type: "fdEnd", score: q.result.score, grade: q.result.grade });
    }
  }
}
