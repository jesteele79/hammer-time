// The story and the journey (story Phase 1): the stops in order with their acts and cards, the save and its snapshot,
// the Game's journey run, the home screen's insults.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { STORY, ACTS, STRAIGHT_BUILT, stopOf, nextOf, actOf, firstOfAct, builtStops, shiftFrom, comingLabel } from "../src/sim/story.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { RESTAURANT } from "../src/sim/levels/restaurant.ts";
import { CAMPUS } from "../src/sim/levels/campus.ts";
import { GIFTSHOP } from "../src/sim/levels/giftshop.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const stepsG = (g, seconds, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
/** Steps until `done(g)` (or the time runs out) and returns every event on the way. */
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };

test("the story is fifteen stops in the spec's order with their codes", () => {
  assert.deepEqual(STORY.map((s) => s.code), ["SAT", "1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2", "3-3", "3-4", "3-5", "3-6"]);
  assert.deepEqual([nextOf("sat"), nextOf("arena"), nextOf("replacement")], ["lobby", "lobby-night", null]);
  assert.deepEqual([actOf("sat"), actOf("arena"), actOf("suite"), actOf("flight")], ["prologue", "act1", "act2", "act3"]);
  assert.deepEqual(["sat", "lobby", "lobby-night", "flight", "paris"].map(firstOfAct), [true, false, true, true, false]);
});
test("the cards: the email before SAT, the hotel after it, the phone and the act card after the pig", () => {
  assert.deepEqual(stopOf("sat").before, [{ kind: "email" }]);
  assert.deepEqual(stopOf("sat").after, [{ kind: "caption", text: "Three hours later. The hotel." }]);
  assert.deepEqual(stopOf("arena").after, [{ kind: "phone", app: "Marriott Bonvoy", text: "Your status has been reviewed.", thought: "Reviewed." }, { kind: "act", act: "act1" }]);
  assert.equal(stopOf("lobby").after, undefined);
  assert.deepEqual([ACTS.act1.straight, ACTS.act1.straightKey, ACTS.prologue.straight], ["Work the whole shift", "hammer-time-best-next", null]);
});
test("the built stops and the shift from a stop run to the end of the act", () => {
  const levels = new Map([LOBBY, RESTAURANT, CAMPUS, GIFTSHOP].map((l) => [l.id, l]));
  assert.deepEqual(builtStops(levels), ["lobby", "restaurant", "campus", "arena"]);
  assert.deepEqual(shiftFrom("campus", levels).map((l) => l.id), ["campus", "arena"]);
  assert.deepEqual(shiftFrom("arena", levels).map((l) => l.id), ["arena"]);
});

import { JOURNEY_KEY, newJourney, parseJourney, serializeJourney, finishLevel, stopState, actTotal, journeyTotal, migrateJourney, skipTo } from "../src/sim/journey.ts";
import { createRun } from "../src/sim/run.ts";

const snap = (score, boxes = 2) => ({ run: { ...createRun(7), score, cans: 12, spent: ["buffet"] }, carry: { charge: 4, patience: 2, hot: true, doggy: 1, flop: true, boxes } });
test("a new journey starts at SAT with nothing done", () => {
  assert.equal(JOURNEY_KEY, "hammer-time-journey");
  assert.deepEqual(newJourney(), { v: 1, next: "sat", done: [], best: {}, bonked: 0, run: null, carry: null, credits: false });
  assert.deepEqual(parseJourney(null), newJourney());
  assert.deepEqual(parseJourney("{not json"), newJourney());
});
test("finishing the next stop opens the one after it and keeps the snapshot; the prologue flows into Act 1", () => {
  let j = finishLevel(newJourney(), "sat", 3200, snap(3200));
  assert.deepEqual([j.next, j.done, j.best.sat, j.run.score, j.carry.boxes], ["lobby", ["sat"], 3200, 3200, 2]);
  j = finishLevel(j, "lobby", 9000, snap(12200));
  assert.deepEqual([j.next, j.done, j.best.lobby, j.run.score], ["restaurant", ["sat", "lobby"], 9000, 12200]);
  assert.deepEqual([stopState(j, "sat"), stopState(j, "restaurant"), stopState(j, "campus")], ["done", "next", "locked"]);
});
test("an act's end starts the next act clean", () => {
  let j = newJourney();
  for (const id of ["sat", "lobby", "restaurant", "campus"]) j = finishLevel(j, id, 1000, snap(1000));
  j = finishLevel(j, "arena", 5000, snap(9000));
  assert.deepEqual([j.next, j.run, j.carry, actTotal(j, "act1"), journeyTotal(j)], ["lobby-night", null, null, 8000, 9000]);
});
test("a replay sets a best but never moves next or the snapshot", () => {
  let j = finishLevel(newJourney(), "sat", 3200, snap(3200));
  const again = finishLevel(j, "sat", 4000, null);
  assert.deepEqual([again.next, again.best.sat, again.run.score], ["lobby", 4000, 3200]);
  const worse = finishLevel(again, "sat", 100, null);
  assert.equal(worse.best.sat, 4000);
});
test("a save from a later version, with unknown stops and garbage, is kept where it can be", () => {
  const raw = JSON.stringify({ v: 3, next: "moon", done: ["lobby", "sat", "mars"], best: { sat: 500, mars: 9, lobby: -2 }, bonked: 41.7, run: { nope: true }, carry: null, credits: "yes", extra: 1 });
  const j = parseJourney(raw);
  assert.deepEqual([j.v, j.next, j.done, j.best, j.bonked, j.run, j.carry, j.credits], [1, "restaurant", ["sat", "lobby"], { sat: 500 }, 0, null, null, false]);
  assert.deepEqual(parseJourney(serializeJourney(j)), j);
  assert.deepEqual(migrateJourney({ v: 2, next: "campus", done: ["sat", "lobby", "restaurant"], best: {}, bonked: 3, run: null, carry: null, credits: false }).next, "campus");
  assert.deepEqual([parseJourney("[1,2]"), parseJourney("42"), parseJourney('"text"')], [newJourney(), newJourney(), newJourney()]);
});
test("a snapshot saved by an earlier build, missing a newer run field, is kept; one with a field of the wrong type is not", () => {
  const { bonked: _b, flopped: _f, ...older } = { ...createRun(9), score: 4100, cans: 7 };
  const kept = parseJourney(JSON.stringify({ v: 1, next: "restaurant", done: ["sat", "lobby"], best: { lobby: 4100 }, bonked: 2, run: older, carry: { charge: 0, patience: 2, hot: false, doggy: 0, flop: false, boxes: 3 }, credits: false }));
  assert.deepEqual([kept.run?.score, kept.run?.bonked, kept.run?.flopped, kept.carry?.boxes], [4100, 0, false, 3]);
  const bad = parseJourney(JSON.stringify({ v: 1, next: "restaurant", done: ["sat", "lobby"], best: {}, bonked: 0, run: { ...createRun(9), lives: "three" }, carry: { charge: "x" }, credits: false }));
  assert.deepEqual([bad.run, bad.carry], [null, null]);
});
test("playing a built stop past unbuilt ones skips them: done with no best, the built stop next", () => {
  const j = skipTo(newJourney(), "lobby");
  assert.deepEqual([j.next, j.done, j.best], ["lobby", ["sat"], {}]);
  assert.deepEqual(skipTo(j, "lobby"), j);
  const after = finishLevel(j, "lobby", 5000, snap(5000));
  assert.deepEqual([after.next, after.done, after.best.lobby], ["restaurant", ["sat", "lobby"], 5000]);
});
test("the run counts the staff he bonked, from nothing", () => {
  assert.equal(createRun(1).bonked, 0);
});

import { createGame } from "../src/sim/game.ts";
import { STASH } from "../src/sim/levels/stash.ts";

const knockOut = (g) => { g.world.hero.patience = 1; g.world.hit(g.world.hero.x + 100); };
const shift = [LOBBY, RESTAURANT, CAMPUS, GIFTSHOP];
const journeyGame = (start = 0, opts = {}) => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT, CAMPUS, GIFTSHOP] }, 11, { cast: false, title: true });
  g.newRun(11, start, { shift, journey: true, ...opts });
  return g;
};
const exit = (g) => {
  g.world.hero.x = g.level.doors.find((d) => d.kind === "exit").x - 100;
  if (g.world.pig) g.world.pig.state = "defeated";
  return until(g, (x) => x.mode !== "play" && x.mode !== "walkoff" && x.mode !== "tally", 20, { right: true });
};
test("a journey run takes a snapshot at the card, holds in story after a level, and carries on", () => {
  const g = journeyGame(0);
  assert.deepEqual([g.mode, g.journey, g.snapshot.run.score, g.snapshot.carry.boxes], ["card", true, 0, 0]);
  play(g);
  g.run.score = 4000; g.world.hero.boxes = 3; g.run.spent.push("buffet");
  const evs = exit(g);
  const done = evs.find((e) => e.type === "levelDone");
  assert.equal(g.mode, "story");
  assert.deepEqual([done.id, done.last, done.score > 4000, g.levelScore()], ["lobby", false, true, done.score]);
  g.continueStory();
  assert.deepEqual([g.mode, g.level.id, g.snapshot.run.score, g.snapshot.carry.boxes, g.snapshot.run.spent], ["card", "restaurant", g.run.score, 3, ["buffet"]]);
});
test("three lives or more at every card; Try again restores the snapshot exactly", () => {
  const g = journeyGame(1, { snapshot: { run: { ...createRun(11), score: 7000, cans: 30, lives: 5, spent: ["shuttle"] }, carry: { charge: 8, patience: 2, hot: true, doggy: 1, flop: true, boxes: 4 } } });
  assert.deepEqual([g.level.id, g.run.score, g.run.lives, g.world.hero.boxes, g.world.hero.doggy, g.run.spent], ["restaurant", 7000, 5, 4, 1, ["shuttle"]]);
  play(g);
  g.run.score = 9999; g.world.hero.boxes = 0;
  const taken = g.pickups[0]; taken.taken = true;
  g.run.lives = 1; knockOut(g); until(g, (x) => x.mode === "over");
  g.newRun(11, g.venue, { snapshot: g.snapshot });
  assert.deepEqual([g.mode, g.run.score, g.run.lives, g.world.hero.boxes, g.pickups.every((p) => !p.taken)], ["card", 7000, 5, 4, true]);
  assert.deepEqual([g.journey, g.level.id], [true, "restaurant"], "Try again stays in the journey's shift");
  const low = journeyGame(0, { snapshot: { run: { ...createRun(11), lives: 1 }, carry: { charge: 0, patience: 2, hot: false, doggy: 0, flop: false, boxes: 0 } } });
  assert.equal(low.run.lives, 3);
});
test("the last level of the shift ends in story then clear; a one-level shift is a replay", () => {
  const g = journeyGame(0, { shift: [GIFTSHOP] });
  play(g);
  const evs = exit(g);
  assert.deepEqual([g.mode, evs.find((e) => e.type === "levelDone").last], ["story", true]);
  g.continueStory();
  assert.equal(g.mode, "clear");
});
test("a hold before the first level shows its cards first", () => {
  const g = journeyGame(0, { hold: true });
  assert.equal(g.mode, "story");
  for (let i = 0; i < 10; i++) g.step(input({}, { jump: true }));
  assert.equal(g.mode, "story");
  g.continueStory();
  assert.equal(g.mode, "card");
  play(g);
  g.step(input({ jump: true }));
  assert.equal(of(g.events, "jump").length, 0, "a key held through Continue is held, not pressed");
});
test("a plain new run is today's whole shift, never the journey's", () => {
  const g = journeyGame(2);
  g.newRun(5, 0);
  assert.deepEqual([g.journey, g.shift.map((l) => l.id), g.level.id, g.snapshot], [false, ["lobby", "restaurant", "campus", "arena"], "lobby", null]);
  play(g);
  exit(g);
  assert.equal(g.mode, "card", "Work the whole shift goes on to the next venue's card, no story hold");
});
test("a level's layout is its own in a journey, wherever the run started", () => {
  const whole = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT, CAMPUS, GIFTSHOP] }, 11, { cast: false, title: true });
  whole.newRun(11, 2);
  const fromCampus = journeyGame(0, { shift: [CAMPUS, GIFTSHOP] });
  assert.deepEqual(fromCampus.pickups.map((p) => [p.kind, p.x, p.y]), whole.pickups.map((p) => [p.kind, p.x, p.y]));
});
test("staff bonked are counted on the run, once each", () => {
  const none = { count: 0, bucees: 0, nuts: 0 };
  const one = { ...LOBBY, cast: [{ id: "o", person: "office-1", x: 2930, y: 0 }], carts: [], crates: [], checkpoints: [], rewards: none };
  const g = createGame({ lobby: one, stash: STASH }, 3);
  play(g);
  const evs = [];
  for (let k = 0; k < 8 && !evs.some((e) => e.type === "castHit" && e.down); k++) {
    const n = g.world.cast[0];
    Object.assign(g.world.hero, { x: n.x - 230, y: 0, vx: 0, facing: 1 });
    g.step(input({ hammer: true }, { hammer: true }));
    evs.push(...g.events, ...stepsG(g, 0.6));
  }
  assert.ok(evs.some((e) => e.type === "castHit" && e.down), "knocked out for good");
  assert.equal(g.run.bonked, 1);
  stepsG(g, 2);
  assert.equal(g.run.bonked, 1, "counted once");
});

import { skipFares } from "../src/sim/quests/fares/fares.ts";

test("a gate door is walked into like an exit: Fare Darts as the set piece, its tally pays in and ends the level", () => {
  const gated = { ...LOBBY, doors: [...LOBBY.doors.filter((d) => d.kind !== "exit"), { id: "b7", kind: "gate", x: 3100, y: 0, label: "GATE B7" }] };
  const g = createGame({ lobby: gated, stash: STASH }, 11, { cast: false, title: true });
  g.newRun(11, 0, { shift: [gated, RESTAURANT], journey: true });
  play(g);
  Object.assign(g.world.hero, { x: 3090, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  g.step(input());
  assert.deepEqual([g.mode, g.quest?.id, g.questDoor?.id], ["questCard", "fares", "b7"]);
  until(g, (x) => x.mode === "quest", 3);
  skipFares(g.quest);
  until(g, (x) => x.mode === "questTally", 2);
  const before = g.run.score;
  const result = g.quest.result;
  g.finishQuest();
  assert.deepEqual([g.mode, g.quest, g.run.score >= before + result.score], ["tally", null, true]);
  const evs = until(g, (x) => x.mode === "story", 12);
  assert.ok(evs.some((e) => e.type === "levelDone" && e.id === "lobby" && !e.last));
});

import { playableNext } from "../src/sim/journey.ts";

test("a snapshot saved before keycards existed is kept with its status fresh", () => {
  const { keycards, perks, spots, ...older } = createRun(9);
  const j = parseJourney(JSON.stringify({ v: 1, next: "restaurant", done: ["sat", "lobby"], best: {}, bonked: 0, run: { ...older, score: 700 }, carry: null, credits: false }));
  assert.deepEqual([j.run.score, j.run.keycards, j.run.perks, j.run.spots, keycards, perks, spots], [700, 0, [], [], 0, [], []]);
});
test("a save whose done and next disagree is put right: next is the first stop not done", () => {
  const j = migrateJourney({ v: 1, next: "lobby", done: ["sat", "lobby", "restaurant"], best: {}, bonked: 0, run: null, carry: null, credits: false });
  assert.deepEqual([j.next, j.done], ["campus", ["sat", "lobby", "restaurant"]]);
  // A next past a stop that was never finished would leave that stop locked for good.
  const locked = migrateJourney({ v: 1, next: "campus", done: ["sat"], best: {}, bonked: 0, run: null, carry: null, credits: false });
  assert.deepEqual([locked.next, locked.done], ["lobby", ["sat"]]);
  // The story's last stop finished stays next: there is nothing after it.
  const all = migrateJourney({ v: 1, next: "replacement", done: STORY.map((s) => s.id), best: {}, bonked: 0, run: null, carry: null, credits: false });
  assert.equal(all.next, "replacement");
});

test("Clock in plays the next stop, or the first built one after it while it is not built; nothing past an act not built", () => {
  const built = ["lobby", "restaurant", "campus", "arena"];
  assert.equal(playableNext(newJourney(), built), "lobby");
  assert.equal(playableNext(newJourney(), ["sat", ...built]), "sat");
  assert.equal(playableNext({ ...newJourney(), next: "campus" }, built), "campus");
  assert.equal(playableNext({ ...newJourney(), next: "lobby-night" }, built), null);
});

import { HOME_INSULTS } from "../src/game/lines.ts";
import { shuffled } from "../src/sim/rewards.ts";

test("the home screen's insults: twelve, the helmet line among them, each once a visit, every eight seconds or so", () => {
  assert.equal(HOME_INSULTS.length, 12);
  assert.equal(HOME_INSULTS[0], "Did you play football without a helmet growing up?");
  assert.ok(HOME_INSULTS.includes("Absolute... no. I'll save it."));
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5, { cast: true, title: true });
  const acts = g.world.cast.map((n) => n.act);
  const where = g.world.cast.map((n) => n.x);
  const thinks = [];
  const snots = [];
  for (let t = 0; t < 3600; t += STEP) {
    g.titleStep();
    thinks.push(...of(g.events, "think"));
    snots.push(...of(g.events, "sniff"));
  }
  assert.equal(thinks.length, 12);
  assert.deepEqual(new Set(thinks.map((e) => e.text)).size, 12);
  assert.ok(thinks.every((e) => HOME_INSULTS.includes(e.text) && e.seconds === 3.2));
  assert.ok(snots.length >= 55 && snots.length <= 61, `a snot rocket a minute, saw ${snots.length}`);
  assert.deepEqual(g.world.cast.map((n) => n.act), acts, "the cast stands still");
  assert.deepEqual(g.world.cast.map((n) => n.x), where, "nobody moves");
  assert.ok(g.world.cast.every((n) => !n.noticed), "nobody notices him");
  assert.ok(g.world.targets.every((t) => t.vx === 0), "no snot moves a cart");
  assert.equal(g.mode, "title");
  assert.ok(Math.abs(g.titleT - 3600) < 0.01);
});
test("the first insult comes within ten seconds and the eighth-second rhythm holds; a new visit shuffles them again", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5, { cast: false, title: true });
  const at = [];
  const first = [];
  for (let t = 0; t < 100; t += STEP) {
    g.titleStep();
    for (const e of of(g.events, "think")) {
      at.push(Math.round(t));
      first.push(e.text);
    }
  }
  assert.ok(at[0] <= 10 && at.every((a, i) => i === 0 || a - at[i - 1] >= 7), JSON.stringify(at));
  g.newRun(6);
  g.toTitle();
  assert.equal(g.titleT, 0);
  const again = [];
  for (let t = 0; t < 100; t += STEP) {
    g.titleStep();
    again.push(...of(g.events, "think").map((e) => e.text));
  }
  assert.equal(again.length, 12, "the pool is full again on a new visit");
  assert.notDeepEqual(again, first, "in a new order");
});
test("the lobby has a home spot by the desk, where he stands on the home screen facing right", () => {
  assert.deepEqual(LOBBY.home, { x: 1100, cx: 1600 });
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT] }, 5, { cast: false, title: true });
  assert.deepEqual([g.level.id, Math.round(g.world.hero.x), g.world.hero.facing], ["lobby", 1100, 1]);
  g.newRun(5, 1);
  play(g);
  g.toTitle();
  assert.deepEqual([g.mode, g.level.id, Math.round(g.world.hero.x), g.world.hero.facing, g.journey], ["title", "lobby", 1100, 1, false]);
});
test("shuffled is a seeded permutation", () => {
  const pool = ["a", "b", "c", "d", "e", "f"];
  assert.deepEqual(shuffled(pool, 3), shuffled(pool, 3));
  assert.deepEqual([...shuffled(pool, 3)].sort(), pool);
  assert.deepEqual(pool, ["a", "b", "c", "d", "e", "f"], "the pool itself untouched");
});

test("on the home screen his idle beats run, but his harrumph's line is the pool's: no harrumph every eight seconds", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5, { cast: false, title: true });
  const evs = [];
  for (let t = 0; t < 200; t += STEP) {
    g.titleStep();
    evs.push(...g.events);
  }
  assert.ok(of(evs, "watch").length >= 10 && of(evs, "tap").length >= 10, "the watch and the foot tap keep coming");
  assert.equal(of(evs, "harrumph").length, 0, "no harrumph to cut across the insults or repeat once they are spent");
});

import { bonkedCount } from "../src/sim/journey.ts";
test("lifetime staff bonked counts each bonk once, across levels, Hammer down, Try again and the whole shift", () => {
  // A journey: a level's tally adds its own; Hammer down adds what was bonked since; Try again counts from the card.
  let c = bonkedCount(0, 0, "start");
  let r = bonkedCount(c.counted, 4, "levelDone", 4);
  assert.deepEqual([r.add, r.counted], [4, 4]);
  r = bonkedCount(r.counted, 6, "over");
  assert.deepEqual([r.add, r.counted], [2, 6]);
  c = bonkedCount(r.counted, 4, "start");
  assert.equal(c.counted, 4, "Try again restores the card's run: its bonks already counted");
  r = bonkedCount(c.counted, 7, "levelDone", 3);
  assert.deepEqual([r.add, r.counted], [3, 7]);
  // The whole shift: nothing per venue, all of it at Shift over; a saved run's earlier bonks are not counted again.
  c = bonkedCount(r.counted, 0, "start");
  r = bonkedCount(c.counted, 9, "clear");
  assert.deepEqual([r.add, r.counted], [9, 9]);
  c = bonkedCount(r.counted, 12, "start");
  r = bonkedCount(c.counted, 12, "over");
  assert.equal(r.add, 0, "a resumed run's bonks were counted when they happened");
});

test("every run is told apart for the lifetime count: a fresh run, a replay and Try again each have a new id", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5, { cast: false });
  const ids = [g.runs];
  g.newRun(6);
  ids.push(g.runs);
  g.newRun(7, 0, { shift: [LOBBY], journey: true });
  ids.push(g.runs);
  g.newRun(8, 0, { snapshot: g.snapshot });
  ids.push(g.runs);
  assert.equal(new Set(ids).size, 4, `ids ${ids}`);
});

test("Act 2's cards: the night's caption before 2-1, the suite's after 2-3, the Bonvoy review and the act card after 2-4", () => {
  assert.deepEqual(stopOf("lobby-night").before, [{ kind: "caption", text: "11:40 pm. The same lobby." }]);
  assert.deepEqual(stopOf("hallway").after, [{ kind: "caption", text: "The suite. Someone is in it." }]);
  assert.deepEqual(stopOf("suite").after, [
    { kind: "phone", app: "Marriott Bonvoy", text: "Your status has been reviewed: TITANIUM. Lifetime.", thought: "Lifetime." },
    { kind: "act", act: "act2" },
  ]);
});
test("finishing 2-4 ends the act: the next stop is 3-1, the run cleared, the act's total the sum of its four bests", () => {
  let j = { ...newJourney(), next: "lobby-night", done: ["sat", "lobby", "restaurant", "campus", "arena"] };
  const snapshot = { run: { score: 1 }, carry: {} };
  for (const [id, score] of [["lobby-night", 1000], ["tower", 2000], ["hallway", 3000], ["suite", 4000]]) j = finishLevel(j, id, score, snapshot);
  assert.equal(j.next, "flight");
  assert.equal(j.run, null);
  assert.equal(actTotal(j, "act2"), 10000);
});
test("Act 2's header offers no straight-through run in this phase", () => {
  assert.deepEqual([...STRAIGHT_BUILT], ["act1"]);
});

test("the strip's label names the act until one of its stops is built, then the stop", () => {
  const act2 = ["sat", "lobby", "restaurant", "campus", "arena", "lobby-night", "tower", "hallway", "suite"];
  assert.equal(comingLabel("flight", act2), "Act 3 is coming");
  assert.equal(comingLabel("basel", [...act2, "flight", "paris", "train"]), "Basel is coming");
  assert.equal(comingLabel("paris", [...act2, "flight"]), "Paris is coming");
  assert.equal(comingLabel("train", [...act2, "flight", "paris"]), "The 14:02 is coming");
});

test("the landing card comes after 3-1; Paris has none, its tally line is the level's", () => {
  assert.deepEqual(stopOf("flight").after, [{ kind: "caption", text: "Paris. 13 July. 06:40. No Southwest, no A-List, no ice." }]);
  assert.equal(stopOf("paris").after, undefined);
});

import { FLIGHT } from "../src/sim/levels/flight.ts";
import { PARIS } from "../src/sim/levels/paris.ts";
import { TRAIN } from "../src/sim/levels/train.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { drive } from "../src/sim/drive.ts";

test("the cards: the landing after 3-1, Basel after 3-3, none on Paris", () => {
  assert.deepEqual(stopOf("flight").after, [{ kind: "caption", text: "Paris. 13 July. 06:40. No Southwest, no A-List, no ice." }]);
  assert.deepEqual(stopOf("train").after, [{ kind: "caption", text: "Basel SBB. 17:06. On time. They always are." }]);
  assert.equal(stopOf("paris").after, undefined);
});
test("finishing 3-3 leaves Basel next and the act open", () => {
  let j = newJourney();
  for (const id of ["sat", "lobby", "restaurant", "campus", "arena", "lobby-night", "tower", "hallway", "suite", "flight", "paris", "train"]) j = finishLevel(j, id, 1000, snap(1000));
  assert.equal(j.next, "basel");
  assert.equal(playableNext(j, builtStops(STOP_LEVELS)), "basel");
  assert.equal(comingLabel("lab", builtStops(STOP_LEVELS)), "The Basel office is coming");
});
test("the three drivers play their levels start to finish", () => {
  const ride = (level, seconds) => {
    const g = createGame({ lobby: LOBBY, stash: STASH }, 81, { cast: true, title: true });
    g.newRun(81, 0, { shift: [level], journey: true });
    const evs = [];
    for (let t = 0; t < seconds && !["questCard", "story", "over"].includes(g.mode); t += STEP) {
      g.step(drive(g.level, g.world.hero, level.id, g.world));
      evs.push(...g.events);
    }
    return { g, evs };
  };
  const f = ride(FLIGHT, 320);
  assert.equal(of(f.evs, "levelDone")[0]?.id, "flight", `the flight ended in ${f.g.mode} at ${f.g.world.hero.x}`);
  const p = ride(PARIS, 420);
  assert.equal(p.g.mode, "questCard", `Paris ended in ${p.g.mode} at ${p.g.world.hero.x}`);
  const r = ride(TRAIN, 560);
  assert.equal(of(r.evs, "levelDone")[0]?.id, "train", `the train ended in ${r.g.mode} at ${r.g.world.hero.x}`);
  assert.equal(r.g.world.boss.door, 3);
});
test("a save at the 14:02's card keeps its run: the station's clock is a number", () => {
  const j = { ...newJourney(), next: "train", run: { ...createRun(7), score: 900, stretch: 120 } };
  const back = parseJourney(serializeJourney(j));
  assert.deepEqual([back.run?.score, back.run?.stretch], [900, 120]);
  assert.equal(parseJourney(serializeJourney({ ...j, run: { ...j.run, stretch: null } })).run.stretch, null);
  assert.equal(parseJourney(serializeJourney({ ...j, run: { ...j.run, stretch: "soon" } })).run, null);
});
test("the doors won on the train do not follow him: a level from a saved run starts with them shut", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 81, { cast: true, title: true });
  g.newRun(81, 0, { shift: [TRAIN], journey: true, snapshot: { run: { ...createRun(81), score: 5000, bossDoors: 3 }, carry: { charge: 0, patience: 2, hot: false, doggy: false, flop: false, boxes: 0 } } });
  play(g);
  assert.deepEqual([g.run.score, g.run.bossDoors, g.world.boss.door, g.world.boss.hp], [5000, 0, 0, 9]);
});
import { homeOf } from "../src/sim/journey.ts";
test("the home scene is the lobby at night once Act 1 is done and Basel's street once the suite is", () => {
  let j = newJourney(); assert.equal(homeOf(j), undefined);
  for (const id of ["sat", "lobby", "restaurant", "campus", "arena"]) j = finishLevel(j, id, 1000, null);
  assert.equal(homeOf(j), "lobby-night");
  for (const id of ["lobby-night", "tower", "hallway", "suite"]) j = finishLevel(j, id, 1000, null);
  assert.equal(homeOf(j), "basel");
});
