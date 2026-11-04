// The M CLUB lounge table (story spec §8.1): the banquet's rules whole on the lounge's evening spread, its sixteen tiles in
// the sheet's order, Lifetime Titanium guy walking behind the table to split his plate, the door by tier, the best and the card.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { RUN } from "../src/sim/run.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { LOBBY_NIGHT } from "../src/sim/levels/lobby-night.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { FOODS, coursesOf } from "../src/sim/quests/hungry/food.ts";
import { GRADES, createHungry, stepHungry, walkerAt, hungryHint } from "../src/sim/quests/hungry/hungry.ts";
import { playRound, sharpPlayer, steadyPlayer } from "../src/sim/quests/hungry/drive.ts";
import { QUEST_NAMES, questIdOf } from "../src/sim/quests/quest.ts";
import { SEATS, dist } from "../src/sim/quests/hungry/table.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };

const LOUNGE_ORDER = ["cheese", "crudites", "meatballs", "sliders", "hotdish", "hummus", "crackers", "cookies", "brownies", "fruitcup", "parfait", "nycheesecake", "pretzels", "water", "togo", "wine"];
test("the lounge's sixteen tiles in the spec's order with its values; the banquet's menu is untouched", () => {
  assert.deepEqual(LOUNGE_ORDER.map((k) => FOODS[k].sheet), [...Array(16).keys()]);
  assert.deepEqual(LOUNGE_ORDER.map((k) => FOODS[k].value), [100, 50, 200, 300, 250, 100, 50, 150, 200, 100, 150, 300, 100, 0, 0, -100]);
  assert.deepEqual(coursesOf("banquet").appetizer, coursesOf("banquet").appetizer.filter((k) => FOODS[k].menu !== "lounge"));
  assert.ok(coursesOf("lounge").special.includes("wine") && !coursesOf("lounge").special.includes("check"));
  assert.deepEqual(coursesOf("lounge").entree, ["meatballs", "sliders", "hotdish"]);
  assert.deepEqual(coursesOf("lounge").dessert, ["cookies", "brownies", "fruitcup", "parfait", "nycheesecake"]);
  assert.deepEqual(coursesOf("lounge").appetizer, ["cheese", "crudites", "hummus", "crackers", "pretzels", "water"]);
});
test("a lounge round serves only the lounge's dishes and the products, and grades as the banquet", () => {
  const q = createHungry(3, { practice: true, menu: "lounge" });
  const served = new Set();
  for (let i = 0; i < Math.round(60 / STEP) + 1; i++) {
    stepHungry(q, input(), STEP);
    for (const d of q.dishes) served.add(d.kind);
  }
  for (const k of served) assert.ok(FOODS[k].menu !== "banquet", k);
  assert.ok(served.has("meatballs") || served.has("sliders") || served.has("hotdish"), "the entrees come");
  assert.ok(q.result && GRADES.some(([, g]) => g === q.result.grade));
  assert.equal(q.menu, "lounge");
  assert.equal(createHungry(3, { practice: true }).menu, "banquet");
  assert.equal(createHungry(3, { practice: true }).walker, null);
});
test("the water is worth nothing and says so; the wine costs him and he says why", () => {
  const q = createHungry(5, { practice: true, menu: "lounge", schedule: false, rivals: false, server: false });
  const evs = [];
  q.flights.push({ kind: "water", to: "hammer", from: SEATS.hammer.plate, t: 1, bonus: 0 }, { kind: "wine", to: "hammer", from: SEATS.hammer.plate, t: 1, bonus: 0 });
  stepHungry(q, input(), STEP);
  evs.push(...q.events);
  assert.ok(evs.some((e) => e.type === "hhThink" && e.text === "Points. Not the water."));
  assert.ok(evs.some((e) => e.type === "hhThink" && e.text === "I drink Coke Zero."));
  assert.equal(q.score.plate, -100);
});
test("Lifetime Titanium guy walks behind the table and splits the plate evenly at his end; a bonk sends him off for 8 s", () => {
  const q = createHungry(4, { practice: true, menu: "lounge", rivals: false, server: false, schedule: false });
  q.hammer.plate = ["sliders", "meatballs", "cheese"];
  q.score.plate = 600;
  q.walker.s = 0.95;
  q.walker.dir = 1;
  const evs = [];
  for (let i = 0; i < 240; i++) {
    stepHungry(q, input(), STEP);
    evs.push(...q.events);
  }
  assert.deepEqual([q.hammer.plate.length, q.score.plate, q.score.split], [1, 100, 2]);
  assert.ok(evs.some((e) => e.type === "hhSay" && e.who === "walker" && e.text === "Let's split it evenly."));
  assert.ok(evs.some((e) => e.type === "hhSay" && e.who === "walker" && e.text === "I was here first. Ambassador."));
  assert.ok(evs.some((e) => e.type === "hhThink" && e.text === "Ambassador of WHAT?"));
  // Within the mallet's reach of his seat a bonk catches him.
  q.walker.s = 0.99;
  assert.ok(dist(walkerAt(q), SEATS.hammer.plate) <= 420, "he is in reach at his end");
  q.walker.s = 0.9;
  assert.ok(dist(walkerAt(q), SEATS.hammer.plate) <= 420, "and a moment before he gets there, so a bonk can beat him to the plate");
  q.walker.dir = 1;
  stepHungry(q, input({ hammer: true }, { hammer: true }), STEP);
  for (let i = 0; i < 60 && q.walker.away <= 0; i++) stepHungry(q, input(), STEP);
  assert.ok(q.walker.away > 7.5, String(q.walker.away));
  assert.equal(q.walker.s, 0);
  // Away he takes nothing, and is back walking when it runs out.
  q.hammer.plate = ["sliders", "meatballs"];
  for (let i = 0; i < Math.round(9 / STEP); i++) stepHungry(q, input(), STEP);
  assert.deepEqual([q.hammer.plate.length, q.walker.away], [2, 0]);
  assert.ok(q.walker.s > 0);
});
test("with fewer than two dishes on his plate he only walks back; the split never leaves the plate below what it was worth", () => {
  const q = createHungry(4, { practice: true, menu: "lounge", rivals: false, server: false, schedule: false });
  q.hammer.plate = ["sliders"];
  q.score.plate = 300;
  q.walker.s = 0.95;
  for (let i = 0; i < 120; i++) stepHungry(q, input(), STEP);
  assert.deepEqual([q.hammer.plate.length, q.score.plate, q.score.split], [1, 300, 0]);
  assert.ok(hungryHint({ ...q, walker: { ...q.walker, s: 0.9, dir: 1 }, hammer: { ...q.hammer, plate: ["sliders", "cheese"] } }).includes("Lifetime Titanium guy"));
});
test("the lounge's names: the door's quest, the practice link and the best's key", () => {
  assert.equal(QUEST_NAMES.lounge, "The M CLUB");
  assert.equal(questIdOf(createHungry(1, { menu: "lounge" })), "lounge");
  assert.equal(questIdOf(createHungry(1)), "hungry");
  const g = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true });
  g.newQuest(9, "lounge");
  assert.deepEqual([g.mode, g.quest.id, g.quest.menu, g.questDoor], ["questCard", "hungry", "lounge", null]);
});
test("the M CLUB door opens the lounge once a level at Platinum, and its tally pays into the run like the buffet's", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true });
  g.newRun(21, 0, { shift: [LOBBY_NIGHT, STASH], journey: true });
  play(g);
  Object.assign(g.world.hero, { x: 8800, y: -520, onGround: true, vx: 0, move: null });
  g.step(input({ down: true }));
  g.step(input({ down: true }));
  assert.equal(g.mode, "play");
  g.run.keycards = 6;
  g.step(input({ down: true }));
  g.step(input({ down: true }));
  assert.deepEqual([g.mode, g.quest?.id, g.quest?.menu], ["questCard", "hungry", "lounge"]);
  until(g, (x) => x.mode === "quest", RUN.cardT + 0.2);
  const q = g.quest;
  q.score.plate = 500;
  q.time = 60 - STEP / 2;
  g.step(input());
  assert.equal(g.mode, "questTally");
  const s = g.run.score;
  g.finishQuest();
  assert.ok(g.run.score >= s + q.result.score);
  assert.equal(g.mode, "play");
  Object.assign(g.world.hero, { x: 8800, y: -520, onGround: true, vx: 0, move: null });
  g.step(input());
  g.step(input({ down: true }));
  g.step(input({ down: true }));
  assert.equal(g.mode, "play", "once a level");
});
test("the lounge's scripted players: the sharp one beats the steady one and reaches the banquet's scale", () => {
  const steady = playRound(7, steadyPlayer(), { menu: "lounge" }).score;
  const sharp = playRound(7, sharpPlayer(), { menu: "lounge" }).score;
  assert.ok(sharp > steady && sharp > 12000, `${steady} ${sharp}`);
  assert.ok(steady < 30000, `${steady}`);
});
