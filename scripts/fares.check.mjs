import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { MAP, CITY_CODES, cityAt, polygon, TAGS, endIn9, fareFor, classOf, pointsFor } from "../src/sim/quests/fares/board.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const near = (a, b, what, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not ${b}`);

test("the map: 23 cities in a 1080 by 600 rectangle, San Antonio at (493.6, 481.8), the cartoon US's 30 points", () => {
  assert.deepEqual([MAP.w, MAP.h, CITY_CODES.length, polygon().length], [1080, 600, 23, 30]);
  near(cityAt("SAT").x, 493.56, "SAT x");
  near(cityAt("SAT").y, 481.8, "SAT y");
  for (const c of CITY_CODES) assert.ok(cityAt(c).x > 0 && cityAt(c).x < MAP.w && cityAt(c).y > 0 && cityAt(c).y < MAP.h, c);
});

test("fares by the design's formula: Austin, Houston, Dallas and New Orleans Wanna Get Away, Seattle and Boston Business Select; a flash sale halves", () => {
  assert.deepEqual(["AUS", "HOU", "DAL", "MSY", "OKC", "PHX", "DEN", "SLC", "BWI", "BOS", "SEA"].map((c) => fareFor(c, false)), [49, 59, 79, 79, 109, 119, 159, 179, 189, 229, 249]);
  assert.deepEqual(["AUS", "DAL", "OKC", "SLC", "BOS", "SEA"].map((c) => fareFor(c, true)), [49, 49, 59, 99, 119, 129]);
  for (const c of CITY_CODES.filter((c) => c !== "SAT"))
    for (const flash of [false, true]) {
      const f = fareFor(c, flash);
      assert.ok(f >= 49 && f <= 249 && f % 10 === 9, `${c} ${flash}: ${f}`);
    }
  assert.deepEqual(CITY_CODES.filter((c) => c !== "SAT" && classOf(fareFor(c, false)) === "wga"), ["DAL", "HOU", "AUS", "MSY"]);
  assert.deepEqual(CITY_CODES.filter((c) => classOf(fareFor(c, false)) === "business"), ["SEA", "BOS"]);
  assert.deepEqual([endIn9(48), endIn9(49), endIn9(54), endIn9(140), endIn9(221)], [49, 49, 59, 149, 229]);
});

test("classes, tags and points: $49 pays 402 and $79 pays 342 Wanna Get Away; Anytime 150; Business Select 60", () => {
  assert.deepEqual([classOf(99), classOf(100), classOf(199), classOf(200)], ["wga", "anytime", "anytime", "business"]);
  assert.deepEqual([pointsFor("wga", 49), pointsFor("wga", 79), pointsFor("anytime", 149), pointsFor("business", 229)], [402, 342, 150, 60]);
  assert.deepEqual([TAGS.wga.w, TAGS.wga.h, TAGS.anytime.w, TAGS.anytime.h, TAGS.business.w, TAGS.business.h], [90, 50, 120, 60, 150, 70]);
});

import { FARES, createFares, stepFares, crosshair, aimOf, addTag, tagRect, tagAt, groupOf, gradeOf } from "../src/sim/quests/fares/fares.ts";

/** A round with nothing on its own: no tags, hazards or insults unless a test adds them. */
const quiet = (seed = 1, o = {}) => createFares(seed, { practice: true, tags: false, hazards: false, mouth: false, ...o });
const stepsF = (q, seconds, held = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    stepFares(q, input(held), STEP);
    out.push(...q.events);
  }
  return out;
};
/** Holds the crosshair on `p` (a city or a map point), presses Space once and waits for the scalpel to stick. */
const throwAt = (q, p) => {
  q.pin = typeof p === "string" ? cityAt(p) : p;
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  const out = [...q.events];
  out.push(...stepsF(q, FARES.windup + FARES.flight + STEP));
  return out;
};
const OCEAN = { x: 20, y: 580 };

// Measured along the path, so the tuning's speed does not move it: a minute and a tag's life at the design's 1.4 rad/s.
test("the crosshair's figure never closes: along its path every city's smallest tag is crossed within a minute's worth, and during a tag's life's worth at least one time in seven", () => {
  const d = 1.4 / 120;
  const minute = 60 * 1.4, life = FARES.tags.life * 1.4;
  for (const c of CITY_CODES.filter((c) => c !== "SAT")) {
    const p = cityAt(c);
    const hits = [];
    for (let th = 0; th < 1200; th += d) {
      const a = crosshair(th);
      if (Math.abs(a.x - p.x) <= 47 && Math.abs(a.y - p.y) <= 27) hits.push(th);
    }
    const gaps = [hits[0], ...hits.slice(1).map((t, i) => t - hits[i])];
    assert.ok(Math.max(...gaps) <= minute, `${c}: a stretch of ${Math.max(...gaps).toFixed(1)} rad`);
    let ok = 0, n = 0;
    for (let t0 = 0; t0 < 1200 - life; t0 += 0.35, n++) if (hits.some((t) => t >= t0 && t <= t0 + life)) ok++;
    assert.ok(ok / n >= 1 / 7, `${c}: crossed in ${(100 * ok / n).toFixed(0)}% of a tag's lives`);
  }
});

test("the crosshair moves smoothly and the same way every round; each throw speeds it 8 percent", () => {
  const a = quiet(3), b = quiet(3);
  stepsF(a, 2); stepsF(b, 2);
  assert.equal(a.theta, b.theta);
  near(a.theta, FARES.aim.w * 2, "theta", 1e-6);
  const q = quiet(4);
  let last = aimOf(q), worst = 0;
  for (let k = 0; k < 10; k++) {
    throwAt(q, OCEAN);
    q.pin = null;
    last = aimOf(q);
    for (let i = 0; i < 60; i++) {
      stepFares(q, input(), STEP);
      const p = aimOf(q);
      worst = Math.max(worst, Math.hypot(p.x - last.x, p.y - last.y));
      last = p;
    }
  }
  assert.ok(worst < 20, `a jump of ${worst} px`);
  near(q.w, FARES.aim.w * FARES.aim.rise ** 10, "w after ten", 1e-9);
  near(quiet(5).w, FARES.aim.w, "w");
});

test("the steady hand: Run slows the sweep to 0.35 while its 2.5 s drain; empty, it slows nothing; a booking gives back 0.2", () => {
  const q = quiet();
  stepsF(q, 1, { run: true });
  near(q.theta, FARES.aim.w * FARES.steady.factor, "slowed", 1e-6);
  near(q.steady, 1.5, "drained", 1e-6);
  stepsF(q, 2, { run: true });
  assert.equal(q.steady, 0);
  const t = q.theta;
  stepsF(q, 1, { run: true });
  near(q.theta - t, FARES.aim.w, "no longer slowed", 1e-6);
  addTag(q, "DAL");
  throwAt(q, "DAL");
  near(q.steady, 0.2, "refilled", 1e-9);
});

test("tags: one every 0.9 s on an untagged city, never San Antonio, four at most, each 2.6 s; about a fifth are flash sales", () => {
  const q = createFares(7, { practice: true, hazards: false, mouth: false });
  const evs = stepsF(q, 0.9 + STEP);
  assert.equal(of(evs, "fdTag").length, 1);
  let flash = 0, total = 0;
  for (let i = 0; i < 400 / STEP; i++) {
    stepFares(q, input(), STEP);
    for (const e of of(q.events, "fdTag")) {
      total++;
      if (e.flash) flash++;
      assert.notEqual(e.city, "SAT");
    }
    assert.ok(q.tags.filter((t) => t.kind === "fare").length <= 4);
    assert.equal(new Set(q.tags.map((t) => t.city)).size, q.tags.length, "one tag a city");
    for (const t of q.tags) assert.ok(t.t <= t.life + STEP);
  }
  assert.ok(flash / total > 0.12 && flash / total < 0.28, `${flash} of ${total}`);
});

test("a throw at a live tag books it at the press, even if the tag runs out while the scalpel flies; elsewhere it misses", () => {
  const q = quiet();
  const tag = addTag(q, "DAL");
  q.pin = cityAt("DAL");
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  assert.equal(of(q.events, "fdThrow").length, 1);
  tag.life = tag.t + 0.05;
  const evs = stepsF(q, FARES.windup + FARES.flight + STEP);
  const stick = of(evs, "fdStick")[0];
  assert.deepEqual([stick.outcome, stick.points, q.score, q.bookings.length, q.position], ["book", 342, 342, 1, 159]);
  assert.equal(of(evs, "fdRelease").length, 1);
  const miss = throwAt(q, OCEAN);
  assert.equal(of(miss, "fdStick")[0].outcome, "miss");
  assert.deepEqual([q.misses, q.streak, q.position], [1, 0, 179]);
  assert.ok(of(miss, "fdThink").some((e) => e.text === "That's a $400 demo unit."));
});

test("where two tags overlap, the one whose city is nearest the point books; a tag's rect is centered on its city with a 2 px pad", () => {
  const q = quiet();
  addTag(q, "AUS");
  addTag(q, "HOU");
  const r = tagRect(q.tags[0]);
  assert.deepEqual([r.w, r.h], [94, 54]);
  near(r.x + r.w / 2, cityAt("AUS").x, "centered");
  const p = { x: cityAt("AUS").x + 5, y: cityAt("AUS").y + 20 };
  assert.equal(tagAt(q, p).city, "AUS");
  const h = { x: cityAt("HOU").x - 20, y: cityAt("HOU").y - 5 };
  assert.equal(tagAt(q, h).city, "HOU");
});

test("a city booked twice is a Companion Pass: double, and his thought", () => {
  const q = quiet();
  addTag(q, "DAL");
  throwAt(q, "DAL");
  addTag(q, "DAL");
  const evs = throwAt(q, "DAL");
  const b = of(evs, "fdStick")[0].booking;
  assert.deepEqual([b.points, b.companion], [684, true]);
  assert.ok(of(evs, "fdThink").some((e) => e.text === "Companion Pass? I fly alone."));
});

test("a held key never throws twice; presses during a windup or a flight are dropped; ten scalpels, then a beat, then the result once", () => {
  const q = quiet();
  q.pin = OCEAN;
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  stepsF(q, 1, { jump: true });
  assert.equal(q.thrown, 1, "held");
  stepFares(q, input({ fire: true }, { fire: true }), STEP);
  assert.equal(q.thrown, 2, "a new press after it stuck");
  stepFares(q, input({ hammer: true }, { hammer: true }), STEP);
  assert.equal(q.thrown, 2, "dropped mid-windup");
  while (q.thrown < 10) throwAt(q, OCEAN);
  throwAt(q, OCEAN);
  assert.deepEqual([q.thrown, q.stuck], [10, 10], "no eleventh");
  assert.equal(q.result, null, "the beat");
  const evs = stepsF(q, FARES.end + STEP);
  assert.equal(of(evs, "fdEnd").length, 1);
  assert.equal(q.result.grade, "C GROUP");
  assert.equal(of(stepsF(q, 2), "fdEnd").length, 0, "once");
});

test("the ladder: up 20, 30 from the third booking in a row; seven in a row reach A1; a miss drops 60, never past C60", () => {
  const q = quiet();
  const seen = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, i % 2 ? "HOU" : "AUS");
    throwAt(q, i % 2 ? "HOU" : "AUS");
    seen.push(q.position);
  }
  assert.deepEqual(seen, [159, 139, 109, 79, 49, 19, 0]);
  assert.equal(q.preferred, true);
  assert.deepEqual([groupOf(0), groupOf(15), groupOf(59), groupOf(60), groupOf(72), groupOf(179)], ["A1", "A16", "A60", "B1", "B13", "C60"]);
  const s = quiet();
  for (let i = 0; i < 6; i++) {
    addTag(s, "AUS");
    throwAt(s, "AUS");
  }
  assert.equal(s.position, 19, "six are not enough");
  throwAt(s, OCEAN);
  assert.deepEqual([s.position, s.streak], [79, 0]);
});

test("A1 once: the rest of the tray scores double, stacking with a Companion Pass; the agent's line and a boom-worthy event, once", () => {
  const q = quiet();
  const evs = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, "AUS");
    evs.push(...throwAt(q, "AUS"));
  }
  assert.equal(of(evs, "fdPreferred").length, 1);
  assert.ok(of(evs, "fdSay").some((e) => e.who === "agent" && e.text === "Now boarding... just Mr. Hammer."));
  addTag(q, "DAL");
  assert.equal(of(throwAt(q, "DAL"), "fdStick")[0].points, 684);
  addTag(q, "DAL");
  assert.equal(of(throwAt(q, "DAL"), "fdStick")[0].points, 1368);
});

test("the grades and the prize: boxes per booking, three cans per Wanna Get Away, a smash from B GROUP, a life at A1", () => {
  assert.deepEqual([gradeOf(2, true), gradeOf(7, false), gradeOf(6, false), gradeOf(4, false), gradeOf(3, false)], ["A-LIST PREFERRED", "A-LIST", "B GROUP", "B GROUP", "C GROUP"]);
  const q = quiet();
  for (const c of ["DAL", "OKC", "BOS", "AUS"]) {
    addTag(q, c);
    throwAt(q, c);
  }
  for (let i = 0; i < 6; i++) throwAt(q, OCEAN);
  stepsF(q, FARES.end + STEP);
  const r = q.result;
  assert.deepEqual([r.booked, r.boxes, r.wga, r.cans, r.nuts, r.lives, r.grade], [4, 4, 2, 6, true, 0, "B GROUP"]);
});

test("his lines on the way: leaving group C, passing A16, a third booking in a row, Business Select; each once a round", () => {
  const q = quiet();
  const evs = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, "AUS");
    evs.push(...throwAt(q, "AUS"));
  }
  const thoughts = of(evs, "fdThink").map((e) => e.text);
  for (const line of ["I don't do group C.", "A16. Right where I belong.", "Rapid Rewards. Rapidly."]) assert.equal(thoughts.filter((t) => t === line).length, 1, line);
  addTag(q, "BOS");
  assert.ok(of(throwAt(q, "BOS"), "fdThink").some((e) => e.text === "I don't PAY Business Select. I AM business select."));
});

import { TRAVELERS, faresHint } from "../src/sim/quests/fares/fares.ts";

/** Throws at the bare map every `gap` seconds, recording how many had stuck when each hazard came. */
const patient = (seed, gap = 2) => {
  const q = createFares(seed, { practice: true, mouth: false });
  const at = { cloud: [], stop: [], agent: [], seating: [], fee: [] };
  for (let s = 0; s < 400 / STEP && !q.result; s++) {
    const press = q.shot === null && s % Math.round(gap / STEP) === 0;
    q.pin = OCEAN;
    stepFares(q, press ? input({ jump: true }, { jump: true }) : input(), STEP);
    for (const e of q.events) {
      if (e.type === "fdCloud" && e.on) at.cloud.push(q.stuck);
      if (e.type === "fdStop" && e.on) at.stop.push(q.stuck);
      if (e.type === "fdAgent" && e.on) at.agent.push(q.stuck);
      if (e.type === "fdTag" && e.kind !== "fare") at[e.kind].push(q.stuck);
    }
  }
  return at;
};

test("the hazards come in their windows: the cloud after the 2nd and 6th, the stop once in 2..8, the agent once in 4..8, ASSIGNED SEATING once in 5..9, BAG FEE once", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const at = patient(seed);
    assert.deepEqual(at.cloud, [2, 6], `seed ${seed} cloud`);
    assert.ok(at.stop.length === 1 && at.stop[0] >= 1 && at.stop[0] <= 7, `seed ${seed} stop ${at.stop}`);
    assert.ok(at.agent.length === 1 && at.agent[0] >= 3 && at.agent[0] <= 7, `seed ${seed} agent ${at.agent}`);
    assert.ok(at.seating.length === 1 && at.seating[0] >= 4 && at.seating[0] <= 8, `seed ${seed} seating ${at.seating}`);
    assert.equal(at.fee.length, 1, `seed ${seed} fee`);
  }
});

test("under the cloud a tag can't be booked: the scalpel sticks, no points, a miss, and Denver", () => {
  const q = quiet();
  addTag(q, "DEN");
  q.cloud = { third: 1, t: 0 }; // the middle third, 360 to 720: Denver is at 373
  const evs = throwAt(q, "DEN");
  assert.deepEqual([of(evs, "fdStick")[0].outcome, q.score, q.misses], ["cloud", 0, 1]);
  assert.ok(of(evs, "fdThink").some((e) => e.text === "Denver. Of course."));
  assert.equal(faresHint(q), "Storm over the map · wait it out");
});

test("the cancelled flight costs 200 and is a miss; the agent's clipboard eats a scalpel; the bonus tags pay and are bookings", () => {
  const q = quiet();
  const t = addTag(q, "OKC");
  t.stopped = 2;
  assert.equal(faresHint(q), "Cancelled flight · don't hit the X");
  const stop = throwAt(q, "OKC");
  assert.deepEqual([of(stop, "fdStick")[0].outcome, q.score, q.cancelled, q.misses], ["stop", -200, 1, 1]);
  assert.ok(of(stop, "fdSay").some((e) => e.who === "agent" && e.text === "Sir, that flight is cancelled."));
  q.agent = { t: 0.7 };
  const clip = throwAt(q, { x: MAP.w / 2 + 10, y: MAP.h - 40 });
  assert.equal(of(clip, "fdStick")[0].outcome, "agent");
  assert.ok(of(clip, "fdSay").some((e) => e.text === "Sir, you can't do that here."));
  addTag(q, "MDW", "seating");
  const seat = throwAt(q, "MDW");
  assert.deepEqual([of(seat, "fdStick")[0].outcome, of(seat, "fdStick")[0].points, q.bookings.length], ["book", 500, 1]);
  assert.ok(of(seat, "fdThink").some((e) => e.text === "BRING BACK OPEN SEATING."));
  addTag(q, "STL", "fee");
  const fee = throwAt(q, "STL");
  assert.equal(of(fee, "fdStick")[0].points, 300);
  assert.ok(of(fee, "fdThink").some((e) => e.text === "Bags used to fly FREE."));
});

test("his mouth: an insult about every 6 s on its own, about every 3 on a streak, each answered", () => {
  const q = quiet(2, { mouth: true });
  const times = [];
  let answered = 0;
  for (let i = 0; i < 40 / STEP; i++) {
    stepFares(q, input(), STEP);
    if (of(q.events, "fdInsult").length) times.push(q.time);
    answered += of(q.events, "fdSay").length;
  }
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.ok(gaps.length >= 4 && gaps.every((g) => g >= 5 && g <= 7), `${gaps}`);
  assert.ok(answered >= times.length - 1, "answered");
  const s = quiet(3, { mouth: true });
  for (let i = 0; i < 3; i++) {
    addTag(s, "AUS");
    throwAt(s, "AUS");
  }
  const streak = [];
  for (let i = 0; i < 20 / STEP; i++) {
    stepFares(s, input(), STEP);
    if (of(s.events, "fdInsult").length) streak.push(s.time);
  }
  const sg = streak.slice(1).map((t, i) => t - streak[i]);
  assert.ok(sg.length >= 4 && sg.every((g) => g >= 2.5 && g <= 3.5), `${sg}`);
});

test("E mouths off at once, but not while a scalpel is in the air, nor over the last insult's bubble", () => {
  const q = quiet(5);
  stepsF(q, 0.5);
  stepFares(q, input({ lecture: true }, { lecture: true }), STEP);
  assert.equal(of(q.events, "fdInsult").length, 1, "E");
  stepFares(q, input({ lecture: true }, { lecture: true }), STEP);
  assert.equal(of(q.events, "fdInsult").length, 0, "the bubble is still up");
  q.pin = OCEAN;
  stepsF(q, 1.3);
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  stepFares(q, input({ lecture: true }, { lecture: true }), STEP);
  assert.equal(of(q.events, "fdInsult").length, 0, "not mid-throw");
});

test("a miss: angry for 2 s, the crowd laughs, and he doubles down with two insults, the first at one who laughed", () => {
  const q = quiet(3, { mouth: true });
  stepsF(q, 1.5);
  const evs = throwAt(q, OCEAN);
  evs.push(...stepsF(q, 1.4));
  const mood = of(evs, "fdMood").find((e) => e.mood === "angry");
  assert.ok(mood && mood.seconds === 2);
  const laugh = of(evs, "fdCrowd").find((e) => e.kind === "laugh");
  assert.ok(laugh && laugh.who.length >= 1 && laugh.who.length <= 3);
  const pissed = of(evs, "fdInsult").filter((e) => e.mood === "pissed");
  assert.equal(pissed.length, 2);
  assert.ok(laugh.who.includes(pissed[0].at));
});

test("the crowd: one or two ooh at a booking, all four on a streak, all clap at A1; smug through the streak", () => {
  const q = quiet(4, { mouth: true });
  const evs = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, "AUS");
    evs.push(...throwAt(q, "AUS"));
  }
  const ooh = of(evs, "fdCrowd").filter((e) => e.kind === "ooh");
  assert.ok(ooh[0].who.length >= 1 && ooh[0].who.length <= 2);
  assert.equal(ooh[ooh.length - 1].who.length, TRAVELERS.length);
  assert.ok(of(evs, "fdCrowd").some((e) => e.kind === "clap" && e.who.length === 4));
  assert.ok(of(evs, "fdMood").some((e) => e.mood === "smug"));
});

test("never more than two travelers talking at once, whatever the crowd does", () => {
  const q = quiet(9, { mouth: true });
  const ends = [];
  let worst = 0;
  for (let i = 0; i < 30 / STEP; i++) {
    if (i % 60 === 0) addTag(q, i % 120 ? "AUS" : "HOU");
    q.pin = i % 240 < 120 ? cityAt(i % 120 ? "AUS" : "HOU") : OCEAN;
    stepFares(q, i % 60 === 1 ? input({ jump: true }, { jump: true }) : input(), STEP);
    for (const e of of(q.events, "fdSay")) if (e.who !== "agent") ends.push(q.time + e.seconds);
    worst = Math.max(worst, ends.filter((end) => end > q.time).length);
  }
  assert.ok(worst <= 2, `${worst} talking at once`);
});

import { masherPlayer, personPlayer, sharpPlayer, playRound } from "../src/sim/quests/fares/drive.ts";

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

test("the grade lines hold over ten seeds: a masher lands C GROUP, a person books four to six, a sharp player reaches A1 in seven or more", () => {
  const seeds = [...Array(10).keys()].map((i) => i + 1);
  const masher = seeds.map((s) => playRound(s, masherPlayer));
  assert.ok(masher.every((r) => r.grade === "C GROUP"), `${masher.map((r) => r.booked)}`);
  const person = seeds.map((s) => playRound(s, personPlayer(s)).booked);
  assert.ok(median(person) >= 4 && median(person) <= 6, `person ${person}`);
  const sharp = seeds.map((s) => playRound(s, sharpPlayer()));
  assert.ok(sharp.filter((r) => r.preferred).length >= 7, `sharp ${sharp.map((r) => r.booked)}`);
});

import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { RESTAURANT } from "../src/sim/levels/restaurant.ts";
import { RUN } from "../src/sim/run.ts";
import { CHARGE_MAX } from "../src/sim/moves.ts";
import { hintOf, hudOf } from "../src/render/hud.ts";

const SHUTTLE = LOBBY.doors.find((d) => d.id === "shuttle");
const BUFFET = LOBBY.doors.find((d) => d.id === "buffet");
const lobbyGame = (opts = {}) => createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false, ...opts });
const until = (g, mode, seconds = 5, held = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP) && g.mode !== mode; i++) g.step(input(held));
  return g.mode;
};
const at = (g, door) => {
  until(g, "play");
  Object.assign(g.world.hero, { x: door.x, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  g.step(input());
  return g;
};
const downAt = (g) => {
  g.step(input({ down: true }, { down: true }));
  return [...g.events];
};
/** A gate round from the door (its hazards switched off, so a cloud or the agent can't eat a throw), `book` bookings at Austin then misses to the end, its tally up. */
const gateRound = (g, book = 0) => {
  downAt(g);
  until(g, "quest");
  const q = g.quest;
  q.hazards = false;
  for (let i = 0; i < 10; i++) {
    if (i < book) addTag(q, "AUS");
    q.pin = i < book ? cityAt("AUS") : OCEAN;
    g.step(input({ jump: true }, { jump: true }));
    for (let s = 0; s < Math.round((FARES.windup + FARES.flight) / STEP) + 2; s++) g.step(input());
  }
  until(g, "questTally", FARES.end + 0.5);
  return q;
};

test("↓ in front of the AIRPORT SHUTTLE door opens Fare Darts: its card, then the round; never from the air", () => {
  const g = at(lobbyGame(), SHUTTLE);
  assert.equal(hintOf(g), "↓ AIRPORT SHUTTLE · Fare Darts");
  downAt(g);
  assert.deepEqual([g.mode, g.quest.id, g.quest.practice, g.questDoor.id], ["questCard", "fares", false, "shuttle"]);
  assert.equal(until(g, "quest", RUN.cardT + 0.1), "quest");
  const air = at(lobbyGame(), SHUTTLE);
  Object.assign(air.world.hero, { y: -200, onGround: false });
  downAt(air);
  assert.equal(air.mode, "play");
});

test("a key held through the round's card throws nothing; only a fresh press does", () => {
  const g = at(lobbyGame(), SHUTTLE);
  downAt(g);
  until(g, "quest", RUN.cardT + 0.1, { jump: true });
  for (let i = 0; i < 30; i++) g.step(input({ jump: true }));
  assert.equal(g.quest.thrown, 0);
  g.step(input({ jump: true }, { jump: true }));
  assert.equal(g.quest.thrown, 1);
});

test("a break mid-throw holds the shot, the crosshair and the steady meter, and the shot lands once after", () => {
  const g = at(lobbyGame(), SHUTTLE);
  downAt(g);
  until(g, "quest");
  g.quest.hazards = false;
  addTag(g.quest, "AUS");
  g.quest.pin = cityAt("AUS");
  g.step(input({ jump: true, run: true }, { jump: true }));
  const { theta, steady } = g.quest;
  const t = g.quest.shot.t;
  g.togglePause();
  for (let i = 0; i < 120; i++) g.step(input({ run: true, jump: true }, { jump: true }));
  assert.deepEqual([g.quest.theta, g.quest.steady, g.quest.shot.t], [theta, steady, t]);
  g.togglePause();
  for (let i = 0; i < 80; i++) g.step(input());
  assert.deepEqual([g.quest.stuck, g.quest.bookings.length], [1, 1]);
});

test("Continue stands him at the shuttle door with grace and brings home the score, a box a booking, three cans a Wanna Get Away, the smash", () => {
  const g = at(lobbyGame(), SHUTTLE);
  Object.assign(g.world.hero, { charge: 0, boxes: 0 });
  const before = { score: g.run.score, cans: g.run.cans };
  const q = gateRound(g, 4);
  const r = q.result;
  assert.deepEqual([r.booked, r.boxes, r.cans, r.nuts, r.lives], [4, 4, 12, true, 0]);
  g.finishQuest();
  const h = g.world.hero;
  assert.deepEqual([g.mode, h.x, h.onGround, h.boxes, h.charge], ["play", SHUTTLE.x, true, 4, CHARGE_MAX]);
  assert.ok(h.invuln >= RUN.questGrace - 1e-9);
  assert.equal(g.run.cans, before.cans + 12);
  assert.equal(g.run.score, before.score + r.score + 12 * RUN.canPoints);
  const paid = of(g.events, "questPaid")[0];
  assert.deepEqual([paid.quest, paid.boxes, paid.cans, paid.lives], ["fares", 4, 12, 0]);
});

test("A-LIST PREFERRED from the door is an extra life", () => {
  const g = at(lobbyGame(), SHUTTLE);
  const lives = g.run.lives;
  gateRound(g, 7);
  assert.equal(g.quest.result.lives, 1);
  g.finishQuest();
  assert.equal(g.run.lives, lives + 1);
  assert.equal(of(g.events, "oneUp").length, 1);
});

test("the shuttle is spent once a shift, through a lost life, and apart from the BUFFET; a new shift opens it again", () => {
  const g = at(lobbyGame(), SHUTTLE);
  gateRound(g);
  g.finishQuest();
  for (let i = 0; i < 30; i++) g.step(input({ down: true }));
  g.step(input());
  downAt(g);
  assert.equal(g.mode, "play", "spent; the held key opened nothing");
  assert.equal(hintOf(g), "AIRPORT SHUTTLE · thank you, come again");
  g.world.hero.y = 99999;
  until(g, "dying", 1);
  until(g, "play", 8);
  at(g, SHUTTLE);
  downAt(g);
  assert.equal(g.mode, "play", "still spent after a lost life");
  at(g, BUFFET);
  downAt(g);
  assert.deepEqual([g.mode, g.quest.id], ["questCard", "hungry"], "the BUFFET is its own");
  g.newRun(9);
  at(g, SHUTTLE);
  downAt(g);
  assert.equal(g.mode, "questCard", "a new shift opens it");
});

test("the boxes ride with him through a lost life and into the next venue; a new shift has none", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT] }, 3, { cast: false });
  until(g, "play");
  g.world.hero.boxes = 3;
  g.world.hero.y = 99999;
  until(g, "dying", 1);
  until(g, "play", 8);
  assert.equal(g.world.hero.boxes, 3, "through a lost life");
  g.world.hero.x = 15800;
  for (let i = 0; i < Math.round(20 / STEP) && g.mode !== "card"; i++) g.step(input({ right: true }));
  assert.deepEqual([g.level.id, g.world.hero.boxes], ["restaurant", 3], "into the next venue");
  g.newRun(4);
  assert.equal(g.world.hero.boxes, 0);
});

test("practice: newQuest(seed, 'fares') plays a round on its own that never touches a shift", () => {
  const g = lobbyGame({ title: true });
  g.newQuest(5, "fares");
  assert.deepEqual([g.mode, g.quest.id, g.quest.practice, g.questDoor], ["questCard", "fares", true, null]);
  g.newQuest(6);
  assert.equal(g.quest.id, "fares", "no new round over a running card");
});

test("the HUD in the gate's round: the score, the scalpels left, the steady hand, his position, the streak and its hint", () => {
  const g = lobbyGame({ title: true });
  g.newQuest(5, "fares");
  until(g, "quest");
  const q = g.quest;
  Object.assign(q, { score: 684, thrown: 3, stuck: 3, steady: 2.3, position: 72, streak: 3 });
  assert.deepEqual(hudOf(g, null).quest, { id: "fares", score: 684, left: 7, steady: 2.3, steadyMax: 2.5, position: "B13", streak: 3, door: false, result: null });
  assert.equal(hudOf(g, null).hint, "Space throws · hold Shift to steady your hand · E mouths off");
});

import { SAMPLE, stepSamples } from "../src/sim/samples.ts";
import { T } from "../src/sim/cast.ts";
import { newMove } from "../src/sim/moves.ts";
import { createCart } from "../src/sim/targets.ts";
import { createPig } from "../src/sim/pig.ts";
import { GIFTSHOP } from "../src/sim/levels/giftshop.ts";
import { cuesFor, tauntFor } from "../src/render/sound.ts";

/** Him on the flat floor route under the balcony (9300, between the shuttle and STAFF ONLY), facing right, with boxes; no carts in the way. */
const lobber = (boxes = 3, cast = false, x = 9300) => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3, { cast });
  until(g, "play");
  g.world.targets = [];
  Object.assign(g.world.hero, { x, y: 0, vx: 0, vy: 0, onGround: true, move: null, facing: 1, boxes });
  g.step(input());
  return g;
};
const lob = (g) => {
  g.step(input({ box: true }, { box: true }));
  const out = [...g.events];
  for (let i = 0; i < 60; i++) {
    g.step(input({ box: true }));
    out.push(...g.events);
  }
  return out;
};

test("B lobs one box from his free hand; held, it lobs one; one every 0.4 s; with none left, nothing", () => {
  const g = lobber(2);
  const evs = lob(g);
  assert.equal(of(evs, "sampleThrow").length, 1);
  assert.equal(g.world.hero.boxes, 1);
  for (let i = 0; i < 10; i++) g.step(input());
  lob(g);
  assert.equal(g.world.hero.boxes, 0);
  assert.equal(of(lob(g), "sampleThrow").length, 0, "none left");
  assert.ok(g.world.hero.boxes >= 0);
  const c = lobber(3);
  c.step(input({ box: true }, { box: true }));
  for (let i = 0; i < Math.round(0.37 / STEP); i++) c.step(input());
  c.step(input({ box: true }, { box: true }));
  for (let i = 0; i < 60; i++) c.step(input());
  assert.equal(c.world.hero.boxes, 2, "the lob is over but 0.4 s have not passed");
  for (let i = 0; i < Math.round(0.05 / STEP); i++) c.step(input());
  c.step(input({ box: true }, { box: true }));
  for (let i = 0; i < 60; i++) c.step(input());
  assert.equal(c.world.hero.boxes, 1);
});

test("from standing a box lands about 640 px ahead, either way he faces", () => {
  for (const facing of [1, -1]) {
    const g = lobber(1);
    g.world.hero.facing = facing;
    const x0 = g.world.hero.x;
    const evs = lob(g);
    for (let i = 0; i < 240; i++) {
      g.step(input());
      evs.push(...g.events);
    }
    const land = of(evs, "sampleStop").find((e) => e.on === "floor");
    assert.ok(land && Math.abs(land.x - x0) > 520 && Math.abs(land.x - x0) < 760 && Math.sign(land.x - x0) === facing, `${facing}: ${land?.x - x0}`);
  }
});

test("a box freezes a staffer or a student on their feet for 1.5 s with birds, 50 points, no damage; the lecture still freezes 1.8 s", () => {
  for (const role of ["server", "student"]) {
    const g = lobber(1, true);
    const n = g.world.cast.find((c) => c.role === role);
    Object.assign(n, { x: g.world.hero.x + 450, y: 0, vx: 0, act: "idle", actT: 0 });
    const score = g.run.score, hits = n.hits;
    const evs = lob(g);
    for (let i = 0; i < 120 && !of(evs, "sampleHit").length; i++) {
      g.step(input());
      evs.push(...g.events);
    }
    assert.equal(of(evs, "sampleHit").length, 1, role);
    assert.deepEqual([n.act, n.birds, n.hits], ["frozen", true, hits]);
    assert.equal(g.run.score, score + SAMPLE.points);
    const hit = g.world.time;
    while (g.world.time - hit < 1.4) g.step(input());
    assert.equal(n.act, "frozen", "still at 1.4 s");
    while (g.world.time - hit < 1.6) g.step(input());
    assert.notEqual(n.act, "frozen", "free by 1.6 s");
    assert.equal(n.birds, false);
  }
  assert.equal(T.freeze, 1.8);
});

test("a wall, the pig and a cart stop a box with no effect; a staffer already down lets it pass; down the shaft it is gone; never NaN", () => {
  // Just short of the service corridor (its low ceiling from 14800, 220 up), the box's arc flies into its mouth.
  const wall = lobber(1, false, 14650);
  const evs = lob(wall);
  for (let i = 0; i < 120; i++) {
    wall.step(input());
    evs.push(...wall.events);
    for (const s of wall.world.samples) assert.ok(Number.isFinite(s.x + s.y + s.vx + s.vy));
  }
  assert.ok(of(evs, "sampleStop").some((e) => e.on === "wall"));
  const shaft = lobber(1, false, 5800);
  lob(shaft);
  for (let i = 0; i < 600; i++) shaft.step(input());
  assert.equal(shaft.world.samples.length, 0, "a box down the shaft is gone");
  const down = lobber(1, true);
  const n = down.world.cast.find((c) => c.role === "server");
  Object.assign(n, { x: down.world.hero.x + 450, y: 0, vx: 0, act: "down", actT: 0 });
  const passed = lob(down);
  for (let i = 0; i < 120; i++) {
    down.step(input());
    passed.push(...down.events);
  }
  assert.equal(of(passed, "sampleHit").length, 0, "over a staffer already down");
  const w = { stage: wall.world.stage, samples: [], targets: [{ ...createCart(1, 9500, 0) }], cast: [], pig: { ...createPig(GIFTSHOP.boss, 0), x: 9300, state: "recover" } };
  w.samples.push({ id: 1, x: 9000, y: -150, vx: 620, vy: 0, landed: -1, hit: false });
  const stops = [];
  for (let i = 0; i < 120; i++) stepSamples(w, STEP, stops);
  assert.ok(stops.some((e) => e.type === "sampleStop" && (e.on === "pig" || e.on === "cart")), "the pig or the cart stopped it");
  assert.equal(w.pig.hp, createPig(GIFTSHOP.boss, 0).hp, "the pig unhurt");
});

test("never from a crouch, a slide, a flop or a knockdown", () => {
  const g = lobber(3);
  Object.assign(g.world.hero, { crouch: true });
  assert.equal(of(lob(g), "sampleThrow").length, 0, "crouched");
  Object.assign(g.world.hero, { crouch: false, move: newMove("tumble") });
  g.step(input({ box: true }, { box: true }));
  assert.equal(of(g.events, "sampleThrow").length, 0, "knocked down");
});

test("a box in flight is gone when he walks into the stash; the boxes he carries come back with him", () => {
  const g = lobber(2);
  const staff = LOBBY.doors.find((d) => d.kind === "stash");
  Object.assign(g.world.hero, { x: staff.x - 40 });
  g.step(input({ box: true }, { box: true }));
  for (let i = 0; i < 40; i++) g.step(input());
  Object.assign(g.world.hero, { x: staff.x, y: 0, vx: 0, onGround: true, move: null });
  g.step(input());
  downAt(g);
  assert.equal(g.level.id, "stash");
  assert.equal(g.world.samples.length, 0);
  assert.equal(g.world.hero.boxes, 1);
});

test("the box's sounds and taunts: a swish, a thud and the birds' tweet; a student's or the staff's pool", () => {
  assert.deepEqual(cuesFor({ type: "sampleHit", id: 1, role: "server", x: 0, y: 0, points: 50 }), ["thud", "tweet"]);
  assert.equal(tauntFor({ type: "sampleHit", id: 1, role: "student", x: 0, y: 0, points: 50 }), "student");
  assert.equal(tauntFor({ type: "sampleHit", id: 1, role: "server", x: 0, y: 0, points: 50 }), "staff");
});

test("the hint teaches the boxes until the first is thrown, and the HUD counts them", () => {
  const g = lobber(2);
  assert.equal(hudOf(g, null).boxes, 2);
  assert.equal(hintOf(g), "Boxes of #15 blades · B lobs one · it freezes staff");
  lob(g);
  assert.notEqual(hintOf(g), "Boxes of #15 blades · B lobs one · it freezes staff");
});

import { skipFares } from "../src/sim/quests/fares/fares.ts";

test("the dev skip: the rest of the tray goes as misses and the end's beat runs to the tally", () => {
  const q = createFares(5, { practice: true, tags: false, hazards: false, mouth: false });
  const none = { held: {}, pressed: {} };
  skipFares(q);
  assert.equal(q.thrown, FARES.throws);
  assert.equal(q.stuck, FARES.throws);
  assert.equal(q.misses, FARES.throws);
  assert.equal(q.shot, null);
  for (let i = 0; i < Math.ceil((FARES.end + 0.1) / STEP); i++) stepFares(q, none, STEP);
  assert.ok(q.result, "the tally is up");
  assert.equal(q.result.booked, 0);
  assert.equal(q.result.grade, "C GROUP");
  skipFares(q);
  assert.equal(q.misses, FARES.throws, "a second skip does nothing");
});
