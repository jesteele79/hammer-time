// Row 52 (story spec §9.1): the cabin's run: three snapped lanes, forward without a key, W the sprint; the cart's shove and
// its tray, the turbulence and its bags, the reclined seats, the legs, the queue at row 30, the bin, the purser at the
// curtain, the seat in row 1; the scripted flyer and the masher; Try again.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { FLIGHT, rowX } from "../src/sim/levels/flight.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { drive } from "../src/sim/drive.ts";
import { hitBoss, BOSS_NAMES } from "../src/sim/boss.ts";
import { strikeNpc } from "../src/sim/cast.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
/** `each` runs after every step, with its events still the step's. */
const until = (g, done, seconds = 10, held = {}, each) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); each?.(g); evs.push(...g.events); } return evs; };
const flight = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 61, { cast: true, title: true }); g.newRun(61, 0, { shift: [FLIGHT], journey: true, ...opts }); return g; };
/** The cabin with nothing in the rows and only the crew in it: for what a stretch of the level does alone. */
const CLEAR = { ...FLIGHT, flight: { ...FLIGHT.flight, recliners: [], legs: [] }, cast: FLIGHT.cast.filter((c) => c.person === "attendant-1") };
const clear = () => flight({ shift: [CLEAR] });
/** Lives gone one at a time, until Hammer down. */
const toOver = (g) => { for (let i = 0; i < 40000 && g.mode !== "over"; i++) { if (g.mode === "play") { g.world.hero.patience = 1; g.world.hero.invuln = 0; g.world.hit(g.world.hero.x + 100); } g.step(input()); } };

test("3-1 is the cabin's run: three snapped lanes, forward without a key, W the sprint, the seat at row 1, the purser at the curtain", () => {
  assert.deepEqual([FLIGHT.id, FLIGHT.world, FLIGHT.time, FLIGHT.hall, FLIGHT.seat, FLIGHT.boss], ["flight", "3-1", 300, { width: 3.4, keep: 0.6, set: "cabin", lanes: [-0.9, 0, 0.9], run: true, pace: 0.5 }, { x: 3977 }, { kind: "purser", x: 3823, arena: [3592, 3823] }]);
  assert.equal(STOP_LEVELS.get("flight"), FLIGHT);
  const g = flight(); play(g); const h = g.world.hero; const x0 = h.x;
  until(g, () => false, 1); assert.ok(h.x - x0 > 150 && h.x - x0 < 250, `walks ${h.x - x0}`);
  // The longest clear stretch of a row lane, past the seat at row 38.
  Object.assign(h, { x: 1300, lane: 0, lx: -0.9 });
  const x1 = h.x; until(g, () => false, 1, { up: true }); assert.ok(h.x - x1 > 330, `runs ${h.x - x1}`);
  Object.assign(h, { lane: 1, lx: 0 });
  g.step(input({ right: true }, { right: true })); until(g, () => false, 0.3, { right: true }); assert.deepEqual([h.lane, Math.round(h.lx * 10) / 10], [2, 0.9]);
  g.step(input()); g.step(input({ left: true }, { left: true })); until(g, () => false, 0.3); g.step(input()); g.step(input({ left: true }, { left: true })); until(g, () => false, 0.3);
  assert.deepEqual([h.lane, Math.round(h.lx * 10) / 10], [0, -0.9]);
  g.step(input()); g.step(input({ left: true }, { left: true })); until(g, () => false, 0.3); assert.equal(h.lane, 0);
});
test("a tap mid-move never leaves him between lanes, and a held key moves one lane only", () => {
  const g = flight(); play(g); const h = g.world.hero;
  g.step(input({ right: true })); g.step(input());
  g.step(input({ left: true })); g.step(input()); g.step(input({ left: true })); g.step(input());
  until(g, () => false, 0.4);
  assert.deepEqual([h.lane, Math.round(h.lx * 10) / 10], [0, -0.9]);
  until(g, () => false, 0.5, { right: true });
  assert.deepEqual([h.lane, Math.round(h.lx * 10) / 10], [1, 0]);
});
test("a key held through the card is not a step sideways", () => {
  const g = flight();
  while (g.mode === "card") g.step(input({ left: true }));
  until(g, () => false, 0.3, { left: true });
  assert.equal(g.world.hero.lane, 1);
});
test("the cart every 20 s: in the aisle a shove back ten rows and a pip; in a row lane it passes and leaves a Coke Zero, then pretzels", () => {
  assert.deepEqual([FLIGHT.flight.cart.first, FLIGHT.flight.cart.every], [12, 20]);
  const g = clear(); play(g); const h = g.world.hero; Object.assign(h, { x: 2000, patience: 2 }); g.dev.cart();
  const start = until(g, (x) => of(x.events, "cartOut").length > 0, 1);
  assert.ok(start.some((e) => e.type === "castLine" && e.text === "Drinks?"));
  const at = h.x;
  const evs = until(g, (x) => of(x.events, "shove").length > 0, 15); assert.deepEqual([of(evs, "shove")[0].rows, h.patience], [10, 1]);
  assert.ok(h.x < at, "back down the aisle");
  g.step(input({ right: true }, { right: true })); until(g, () => false, 0.3); g.dev.cart();
  until(g, (x) => of(x.events, "tray").length > 0, 15); assert.equal(g.pickups.filter((p) => p.kind === "can").length, 1);
  g.step(input()); g.dev.cart(); until(g, (x) => of(x.events, "tray").length > 0, 15); assert.equal(g.pickups.filter((p) => p.kind === "nuts").length, 1);
  assert.equal(h.patience, 1, "a row lane costs nothing");
});
test("no drinks cart comes out once she has seen him, nor after she is down", () => {
  const g = clear(); play(g); const h = g.world.hero; Object.assign(h, { x: rowX(4), lane: 0, lx: -0.9 });
  until(g, (x) => x.world.boss.awake, 1);
  Object.assign(g.world.boss, { hp: 1, state: "rest", hurtT: 0 });
  hitBoss(g.world.boss, "bonk", g.events);
  g.dev.cart();
  Object.assign(h, { x: rowX(4) });
  const evs = until(g, () => false, 1);
  assert.deepEqual([of(evs, "cartOut").length, g.world.flight.cart.live], [0, false]);
});
test("the shove never takes him behind row 52", () => {
  const g = clear(); play(g); const h = g.world.hero; Object.assign(h, { x: 300, patience: 2 });
  Object.assign(g.world.flight.cart, { live: true, z: 4.5, next: 99 });
  until(g, (x) => of(x.events, "shove").length > 0, 2);
  assert.equal(h.x, rowX(52));
  until(g, () => false, 0.5);
  assert.ok(h.x >= rowX(52));
});
test("turbulence: the seatbelt chime, bags two seconds later into the lanes for four seconds, the sign lit for six", () => {
  assert.deepEqual(FLIGHT.flight.turbulence, { first: 30, every: 45, warn: 2, fall: 4, sign: 6, bagEvery: 0.5 });
  const g = flight(); play(g); g.dev.turbulence();
  const evs = until(g, (x) => of(x.events, "seatbelt").length > 0, 2); assert.ok(evs.length > 0); assert.equal(g.world.flight.sign, 6);
  until(g, (x) => x.world.missiles.some((m) => m.kind === "bag"), 2.3); assert.ok(g.world.missiles.some((m) => m.kind === "bag"));
  const h = g.world.hero; const b = g.world.missiles.find((m) => m.kind === "bag"); Object.assign(h, { lx: b.lx, lane: FLIGHT.hall.lanes.indexOf(b.lx), x: b.x, patience: 2, invuln: 0 });
  until(g, (x) => x.world.hero.patience < 2, 1.5); assert.equal(h.patience, 1);
  until(g, (x) => x.world.flight.sign === 0, 7); assert.equal(g.world.flight.sign, 0);
});
test("a bag in another lane passes him, and one lying on the floor is cleared by a jump", () => {
  const g = clear(); play(g); const h = g.world.hero; Object.assign(h, { patience: 2, invuln: 0, x: 900 });
  g.world.missiles.push({ id: 900, kind: "bag", x: 1100, y: -200, vx: 0, vy: 600, gravity: 0, spin: 0, life: 3, phase: 0, from: 0, lx: 0.9 });
  until(g, () => false, 1);
  assert.equal(h.patience, 2);
  g.world.missiles = [];
  g.world.missiles.push({ id: 901, kind: "bag", x: h.x + 100, y: -10, vx: 0, vy: 600, gravity: 0, spin: 0, life: 3, phase: 0, from: 0, lx: 0 });
  until(g, (x) => x.world.missiles[0]?.landed, 1);
  assert.ok(g.world.missiles[0]?.landed, "it lies where it fell");
  g.step(input({ jump: true }, { jump: true }));
  const past = h.x + 250;
  until(g, (x) => x.world.hero.x > past, 2, { up: true, jump: true });
  assert.ok(h.x > past);
  assert.equal(h.patience, 2);
});
test("the rows: a reclined seat is ducked or costs a pip and a step back, legs in the aisle are jumped, the queue at row 30 blocks the aisle until bonked", () => {
  const g = flight(); play(g); const h = g.world.hero;
  Object.assign(h, { x: rowX(48) - 200, lane: 0, lx: -0.9, patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.patience < 2, 2); assert.equal(h.patience, 1);
  Object.assign(h, { x: rowX(48) - 200, patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.x > rowX(48) + 100, 3.5, { down: true }); assert.equal(h.patience, 2);
  Object.assign(h, { x: rowX(41) - 200, lane: 1, lx: 0, patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.patience < 2, 2); assert.equal(h.patience, 1);
  Object.assign(h, { x: rowX(41) - 100, patience: 2, invuln: 0, onGround: true, y: 0, vy: 0, vx: 0, move: null, crouch: false, h: 300 }); g.step(input({ jump: true }, { jump: true })); until(g, (x) => x.world.hero.x > rowX(41) + 100, 2, { jump: true }); assert.equal(h.patience, 2);
  assert.equal(g.world.cast.filter((n) => n.trick === "queue").length, 3);
  Object.assign(h, { x: rowX(30) - 300, lane: 1, lx: 0, patience: 2, invuln: 0 }); until(g, () => false, 2); assert.ok(h.x < rowX(30));
  for (const n of g.world.cast.filter((c) => c.trick === "queue")) strikeNpc(n, "mallet", 1, g.world, g.events);
  until(g, (x) => x.world.hero.x > rowX(30) + 200, 4); assert.ok(h.x > rowX(30) + 200);
});
test("the queue says nothing until bonked; the row lanes go round it; the seated travelers neither move nor are hit", () => {
  const g = flight(); play(g); const h = g.world.hero; Object.assign(h, { x: rowX(30) - 300, lane: 1, lx: 0 });
  const ids = g.world.cast.filter((n) => n.trick === "queue").map((n) => n.id);
  const said = until(g, () => false, 1);
  assert.equal(of(said, "castLine").filter((e) => ids.includes(e.id)).length, 0);
  Object.assign(h, { lane: 0, lx: -0.9 }); until(g, (x) => x.world.hero.x > rowX(30) + 200, 5); assert.ok(h.x > rowX(30) + 200);
  const seated = g.world.cast.filter((n) => n.trick === "seated");
  assert.equal(seated.length, 8);
  assert.ok(seated.every((n) => n.sit && Math.abs(n.lx) === 1.3));
  const before = seated.map((n) => n.x);
  assert.equal(strikeNpc(seated[0], "mallet", 1, g.world, g.events), false);
  until(g, () => false, 0.5);
  assert.deepEqual(seated.map((n) => n.x), before);
});
test("the tablet at row 20 costs nothing but his thought; the bin at row 10 opens by a head's bump and not by the mallet", () => {
  const g = clear(); play(g); const h = g.world.hero;
  Object.assign(h, { x: rowX(20) - 250, patience: 2 });
  const evs = until(g, (x) => x.world.hero.x > rowX(20) + 60, 3);
  assert.ok(of(evs, "tablet").length === 1 && of(evs, "think").some((e) => e.text === "Headphones. HEAD PHONES."));
  assert.equal(h.patience, 2);
  const bin = g.crates.find((c) => c.look === "bin");
  assert.equal(bin.x, rowX(10));
  assert.ok(bin.y - 0 <= -310, "he walks under it");
  Object.assign(h, { x: bin.x - 120, y: 0, vx: 0, vy: 0, onGround: true, move: null, invuln: 0, lane: 1, lx: 0 });
  g.step(input({ hammer: true }, { hammer: true }));
  until(g, () => false, 0.4);
  assert.equal(bin.used, false, "the mallet leaves it");
  Object.assign(h, { x: bin.x, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  const up = [...(g.step(input({ jump: true }, { jump: true })), g.events), ...until(g, () => bin.used, 0.6, { jump: true })];
  assert.equal(bin.used, true);
  assert.ok(of(up, "crate").some((e) => e.kind === "bucees"));
  assert.ok(g.pickups.some((p) => p.kind === "bucees"));
});
test("the tray's Coke Zero and pretzels say their lines as he takes them", () => {
  const g = flight({ shift: [{ ...CLEAR, cast: [] }] }); play(g); const h = g.world.hero; Object.assign(h, { x: 2000, lane: 2, lx: 0.9 }); g.dev.cart();
  until(g, (x) => of(x.events, "tray").length > 0, 15);
  const can = until(g, (x) => x.run.cans > 0, 3);
  assert.ok(of(can, "think").some((e) => e.text === "No ice. Of course."));
  g.step(input()); g.dev.cart();
  until(g, (x) => of(x.events, "tray").length > 0, 15);
  const bag = until(g, (x) => of(x.events, "pickup").some((e) => e.kind === "nuts"), 3);
  assert.ok(of(bag, "think").some((e) => e.text === "Pretzels. PRETZELS."));
});
test("the purser pushes her cart, is hit between pushes, and after three hits the curtain opens and row 1 ends the level", () => {
  assert.equal(BOSS_NAMES.purser, "The purser");
  const g = clear(); play(g); const h = g.world.hero; const p = g.world.boss; Object.assign(h, { x: rowX(8), lane: 1, lx: 0, patience: 2 });
  const evs = until(g, (x) => of(x.events, "bossWave").length > 0, 6); assert.ok(evs.length > 0); assert.equal(hitBoss(p, "bonk", g.events), false);
  until(g, (x) => x.world.boss.state === "rest", 3); assert.equal(hitBoss(p, "bonk", g.events), true);
  until(g, (x) => x.world.boss.state === "rest" && x.world.boss.hurtT <= 0, 4); hitBoss(p, "bonk", g.events); until(g, (x) => x.world.boss.state === "rest" && x.world.boss.hurtT <= 0, 4);
  const down = until(g, (x) => of(x.events, "bossDown").length > 0, 1, {}, () => hitBoss(p, "bonk", g.events));
  assert.deepEqual([p.state, of(down, "curtain").length, of(down, "bossSay")[0].text], ["down", 1, "Sir... please."]);
  Object.assign(h, { x: rowX(1) - 50 }); const end = until(g, (x) => x.mode !== "play", 2); assert.deepEqual([of(end, "sit").length, g.mode], [1, "walkoff"]);
  assert.ok(of(end, "think").some((e) => e.text === "I AM business select."));
});
test("he never gets past the purser while she stands; her cart covers the aisle and passes a row lane", () => {
  const g = flight(); play(g); const h = g.world.hero; Object.assign(h, { x: rowX(4), lane: 0, lx: -0.9, patience: 2 });
  const evs = until(g, () => false, 3, { up: true });
  assert.ok(h.x < FLIGHT.boss.x, `at ${h.x}`);
  assert.equal(of(evs, "shove").length, 0, "the row lane is clear of her cart");
  assert.equal(of(evs, "sit").length, 0);
  Object.assign(h, { x: rowX(1) + 10 }); g.step(input()); assert.equal(g.mode, "play", "row 1 ends nothing while she stands");
  assert.ok(h.x < FLIGHT.boss.x);
});
test("the scripted flyer lands in row 1 with a life to spare; a masher who never changes lanes is finished by the carts and the bags", () => {
  const g = flight(); play(g); let t = 0; while (!["walkoff", "tally", "over"].includes(g.mode) && t < 295) { g.step(drive(g.level, g.world.hero, "flight", g.world)); t += STEP; }
  assert.deepEqual([g.world.boss.state, g.mode, g.run.lives >= 1], ["down", "walkoff", true]);
  const m = flight(); play(m); until(m, (x) => x.mode === "over", 300, { hammer: true }); assert.equal(m.mode, "over");
});
test("Try again after Hammer down brings back the clock, the lane and the pips as at the card", () => {
  const g = flight(); play(g); const h = g.world.hero; until(g, () => false, 20, { up: true }); g.step(input({ right: true }, { right: true })); until(g, () => false, 0.3);
  toOver(g); assert.equal(g.mode, "over");
  g.newRun(61, g.venue, { snapshot: g.snapshot }); play(g); assert.deepEqual([g.run.time, h.lane, h.patience, h.x], [300, 1, 2, 50]);
  assert.deepEqual([g.world.flight.sign, g.world.flight.cart.live, g.world.boss.hp], [0, false, 3]);
});
