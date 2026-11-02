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
