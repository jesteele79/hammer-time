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
