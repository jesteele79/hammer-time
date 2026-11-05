// The French table (story spec §9.2): the banquet's engine on a third menu, sixteen tiles in the sheet's order, three Parisians,
// the waiter who clears the plate and spills his tray, OFFERT, and the brasserie's door ending 3-2 on its tally.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { RUN } from "../src/sim/run.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { PARIS } from "../src/sim/levels/paris.ts";
import { FOODS, coursesOf, settled } from "../src/sim/quests/hungry/food.ts";
import { HUNGRY, addDish, bonk, createHungry, gradeWord, land, stepHungry } from "../src/sim/quests/hungry/hungry.ts";
import { sharpPlayer } from "../src/sim/quests/hungry/drive.ts";
import { QUEST_NAMES, questIdOf } from "../src/sim/quests/quest.ts";
import { SEATS, dist } from "../src/sim/quests/hungry/table.ts";
import { hudOf } from "../src/render/hud.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const paris = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 71, { cast: true, title: true }); g.newRun(71, 0, { shift: [PARIS], journey: true, ...opts }); return g; };
const run = (q, seconds, evs) => { for (let t = 0; t < seconds; t += STEP) { stepHungry(q, input(), STEP); evs.push(...q.events); } };

test("the French table: sixteen kinds at their values in the sheet's order, three courses and the specials, no walker, a waiter", () => {
  const french = Object.entries(FOODS).filter(([, f]) => [f.menu].flat().includes("french"));
  assert.deepEqual(french.map(([k, f]) => [k, f.value, f.sheet]), [["baguette", 50, 0], ["escargots", 200, 1], ["steakfrites", 300, 2], ["moules", 250, 3], ["croque", 200, 4], ["camembert", 150, 5], ["comte", 200, 6], ["roquefort", 250, 7], ["cremebrulee", 300, 8], ["macarons", 150, 9], ["tartetatin", 250, 10], ["carafe", 0, 11], ["tinycoke", 0, null], ["breadbasket", 50, 13], ["cheesecart", 0, 14], ["bill", -100, 15]]);
  assert.deepEqual(coursesOf("french").appetizer, ["baguette", "escargots", "breadbasket"]);
  assert.deepEqual(coursesOf("french").entree, ["steakfrites", "moules", "croque"]);
  assert.deepEqual(coursesOf("french").special, ["carafe", "tinycoke", "cheesecart", "bill"]);
  const q = createHungry(7, { menu: "french" }); assert.deepEqual([q.menu, q.walker, q.waiter.phase, questIdOf(q), QUEST_NAMES.french], ["french", null, "idle", "french", "The brasserie"]);
  assert.equal(createHungry(7, { menu: "lounge" }).waiter, null);
  assert.equal(createHungry(7).waiter, null);
});
test("the other two tables are as they were: the products and the to-go box on the banquet and the lounge, none of the French", () => {
  for (const menu of ["banquet", "lounge"]) {
    const c = coursesOf(menu);
    const all = [...c.appetizer, ...c.entree, ...c.dessert, ...c.special];
    for (const k of ["coke", "nuts", "bucees", "togo"]) assert.ok(all.includes(k), `${menu} ${k}`);
    assert.ok(!all.includes("baguette") && !all.includes("bill"));
  }
});
test("every 12 s the waiter clears the plate Hammer reaches for, his hand on the rim for 0.6 s first; a bonk in that moment cancels it, and a bonk with dishes on the tray spills them onto Hammer's end", () => {
  const q = createHungry(7, { menu: "french" }); const evs = [];
  run(q, 11.9, evs);
  assert.equal(of(evs, "hhTray").length, 0);
  run(q, 0.2, evs);
  assert.deepEqual([of(evs, "hhTray")[0].phase, of(evs, "hhSay").some((e) => e.who === "server" && e.text === "C'est fini?")], ["hand", true]);
  run(q, 0.7, evs);
  assert.deepEqual([of(evs, "hhBus").length, q.waiter.held.length], [1, 1]);
  const before = q.dishes.length;
  q.events = [];
  bonk(q); evs.push(...q.events);
  assert.deepEqual([of(evs, "hhTray").some((e) => e.phase === "spill"), q.waiter.held.length, q.waiter.phase], [true, 0, "away"]);
  assert.equal(q.dishes.length, before + 1);
  const spilled = q.dishes[q.dishes.length - 1];
  assert.ok(settled(spilled) && dist(spilled, SEATS.hammer.plate) <= HUNGRY.reach.base, "within his reach");
});
test("a bonk while his hand is on the rim cancels it, the plate stays; the Non. if Hammer's hand is on it too", () => {
  const q = createHungry(7, { menu: "french", schedule: false, rivals: false }); const evs = [];
  const d = addDish(q, "steakfrites", SEATS.hammer.plate.x + 200, SEATS.hammer.plate.y - 200);
  q.waiter.t = HUNGRY.waiter.every - 0.05;
  run(q, 0.1, evs);
  assert.equal(q.waiter.phase, "hand");
  assert.equal(q.waiter.target, d.id);
  q.events = [];
  bonk(q);
  assert.equal(q.waiter.phase, "idle");
  run(q, 1, evs);
  assert.ok(q.dishes.includes(d), "the plate stays");
  assert.equal(of(evs, "hhBus").length, 0);
});
test("the tray holds four; a lecture stops his hand; after a spill he is away three seconds", () => {
  const q = createHungry(7, { menu: "french", schedule: false, rivals: false }); const evs = [];
  for (let i = 0; i < 6; i++) {
    addDish(q, "moules", SEATS.hammer.plate.x + 100 + i * 80, SEATS.hammer.plate.y - 300);
    q.waiter.t = HUNGRY.waiter.every;
    run(q, 0.8, evs);
  }
  assert.equal(q.waiter.held.length, HUNGRY.waiter.hold);
  q.events = [];
  bonk(q);
  assert.equal(q.waiter.held.length, 0);
  q.waiter.t = HUNGRY.waiter.every;
  const during = [];
  run(q, 2.5, during);
  assert.equal(of(during, "hhTray").filter((e) => e.phase === "hand").length, 0);
});
test("the carafe is nothing, the bill costs 100 with the waiter's line, COMPED reads OFFERT, and the round's end thinks of lunch", () => {
  assert.deepEqual([FOODS.carafe.value, FOODS.bill.value, gradeWord("french", "COMPED"), gradeWord("banquet", "COMPED"), gradeWord("french", "FULL")], [0, -100, "OFFERT", "COMPED", "FULL"]);
  const q = createHungry(7, { menu: "french", schedule: false, rivals: false }); q.events = [];
  land(q, "hammer", "carafe");
  assert.ok(of(q.events, "hhThink").some((e) => e.text === "Still? Sparkling? NEITHER."));
  assert.equal(q.score.plate, 0);
  q.events = [];
  land(q, "hammer", "bill");
  assert.equal(q.score.plate, -100);
  assert.ok(of(q.events, "hhThink").some((e) => e.text === "L'ADDITION.") && of(q.events, "hhSay").some((e) => e.text === "L'addition."));
  q.events = [];
  land(q, "hammer", "tinycoke");
  assert.deepEqual(q.score.specials, ["tinycoke"]);
  land(q, "hammer", "cheesecart");
  assert.equal(q.score.togo, HUNGRY.togo);
  const r = createHungry(7, { menu: "french" }); const p = sharpPlayer(); const evs = [];
  while (!r.result) { stepHungry(r, p(r), STEP); evs.push(...r.events); }
  assert.ok(r.result.grade);
  assert.ok(of(evs, "hhThink").some((e) => e.text === "Three hours. For LUNCH."));
});
test("a tiny Coke Zero pays the can's job at the end of the round", () => {
  const q = createHungry(7, { menu: "french", schedule: false, rivals: false, server: false });
  land(q, "hammer", "tinycoke");
  q.time = HUNGRY.round;
  stepHungry(q, input(), STEP);
  assert.equal(q.result.cans, 1);
});
test("the brasserie's door runs one round and then ends 3-2 on its tally, the round's points in the level's score once", () => {
  const g = paris(); play(g); const h = g.world.hero; Object.assign(h, { x: 10200, y: 0, onGround: true }); const s = g.run.score;
  g.step(input({ down: true })); assert.equal(g.mode, "questCard"); assert.equal(g.quest.menu, "french"); until(g, (x) => x.mode === "quest", 3);
  const p = sharpPlayer(); let t = 0; while (g.mode === "quest" && t < 70) { g.step(p(g.quest)); t += STEP; }
  assert.equal(g.mode, "questTally"); const r = g.quest.result; g.finishQuest();
  assert.deepEqual([g.mode, g.run.score - s], ["tally", r.score + r.cans * RUN.canPoints], "the round once; a tiny Coke Zero is a can's points as ever");
  assert.equal(hudOf(g, null, false, null).tally, "Lunch took three hours. It is 13:40. The train leaves at 14:02.");
  until(g, (x) => x.mode === "story" || x.mode === "clear", 40); assert.equal(g.run.spent.includes("brasserie"), true);
  assert.equal(g.mode, "story");
});
test("a round lost still ends the level; a Try again after an earlier Hammer down has the round unspent", () => {
  const g = paris(); play(g); const h = g.world.hero; Object.assign(h, { x: 10200, y: 0, onGround: true });
  g.step(input({ down: true })); until(g, (x) => x.mode === "quest", 3);
  let t = 0; while (g.mode === "quest" && t < 70) { g.step(input()); t += STEP; }
  assert.equal(g.quest.result.grade, "WATER ONLY");
  g.finishQuest();
  assert.equal(g.mode, "tally");
  const a = paris(); play(a); const k = a.world.hero;
  for (let i = 0; i < 40000 && a.mode !== "over"; i++) { if (a.mode === "play") { k.patience = 1; k.invuln = 0; a.world.hit(k.x + 100); } a.step(input()); }
  a.newRun(71, a.venue, { snapshot: a.snapshot }); play(a);
  Object.assign(k, { x: 10200, y: 0, onGround: true });
  a.step(input({ down: true }));
  assert.equal(a.mode, "questCard");
});
test("practice at the brasserie is a round of its own", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3, { title: true });
  g.newQuest(5, "french");
  assert.deepEqual([g.mode, g.quest.menu], ["questCard", "french"]);
});
