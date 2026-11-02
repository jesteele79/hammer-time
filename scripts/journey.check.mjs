// The story and the journey (story Phase 1): the stops in order with their acts and cards, the save and its snapshot,
// the Game's journey run, the home screen's insults.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { STORY, ACTS, stopOf, nextOf, actOf, firstOfAct, builtStops, shiftFrom } from "../src/sim/story.ts";
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
