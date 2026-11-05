// Paris (story spec §9.2): the concierge's gate opened by the lecture, the lift ridden crouched, the stairs, the window that
// tips, the baguette; the shut street with its terrace, its waiter, its scooters and its awning; the brasserie's door.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { PARIS } from "../src/sim/levels/paris.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { drive } from "../src/sim/drive.ts";
import { strikeNpc } from "../src/sim/cast.ts";
import { hintOf } from "../src/render/hud.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}, each) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); each?.(g); evs.push(...g.events); } return evs; };
const paris = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 71, { cast: true, title: true }); g.newRun(71, 0, { shift: [PARIS], journey: true, ...opts }); return g; };
/** ...Bonjour., from in front of her desk. */
const bonjour = (g) => { Object.assign(g.world.hero, { x: 450, y: 0, vx: 0, onGround: true, move: null }); return until(g, (x) => of(x.events, "bonjour").length > 0, 2, {}, (x) => x.step(input({}, { lecture: true }))); };

test("3-2 is the hotel on two floors and the street, with the brasserie's door ending the level", () => {
  assert.deepEqual([PARIS.id, PARIS.world, PARIS.time, PARIS.length, PARIS.canScale, PARIS.tally], ["paris", "3-2", 420, 10600, 0.7, "Lunch took three hours. It is 13:40. The train leaves at 14:02."]);
  assert.deepEqual(PARIS.doors, [{ id: "brasserie", kind: "quest", quest: "french", x: 10200, y: 0, label: "BRASSERIE", down: true, ends: true }]);
  assert.deepEqual(PARIS.bonjour, { x: 500, reach: 300, wall: { x: 700, y: -540, w: 30, h: 540 } });
  assert.equal(PARIS.backdrop.layout.length, 8); assert.equal(PARIS.signs.filter((s) => s.label === "Fermé · 14 juillet").length, 3);
  assert.equal(PARIS.card, "13 July. 06:40. The hotel has one lift.");
  assert.equal(STOP_LEVELS.get("paris"), PARIS);
});
test("the concierge's gate: a wall until the lecture is pressed in front of her, then his thought and her next line", () => {
  const g = paris(); play(g); const h = g.world.hero; Object.assign(h, { x: 450, y: 0 });
  const said = until(g, () => false, 1.5, { right: true }); assert.ok(h.x < 700);
  assert.ok(of(said, "castLine").some((e) => e.text === "Bonjour, monsieur."));
  const evs = bonjour(g);
  assert.deepEqual([of(evs, "bonjour").length, of(evs, "think").some((e) => e.text === "...Bonjour."), of(evs, "castLine").some((e) => e.text === "The lift takes one.")], [1, true, true]);
  until(g, () => false, 2, { right: true }); assert.ok(h.x > 800);
});
test("the lecture far from her desk opens nothing", () => {
  const g = paris(); play(g); const h = g.world.hero; Object.assign(h, { x: 100, y: 0 });
  assert.equal(g.world.bonjourDone, false);
  const evs = until(g, () => false, 1, {}, (x) => x.step(input({}, { lecture: true })));
  assert.equal(of(evs, "bonjour").length, 0);
  assert.equal(g.world.bonjourDone, false);
});
test("the lift takes one, crouched: it rises only while he crouches on it, at 800 px a second, one floor; the stairs are a 30-degree slope", () => {
  const g = paris(); play(g); bonjour(g); const h = g.world.hero; const lift = g.world.movers.find((m) => m.id === "lift");
  Object.assign(h, { x: 1030, y: 0, onGround: true }); until(g, () => false, 1); assert.equal(Math.round(lift.y), 0);
  until(g, (x) => x.world.hero.y <= -538, 1, { down: true }); assert.ok(h.y <= -538 && h.crouch);
  until(g, () => false, 0.3); assert.ok(h.y <= -538, "the floor holds him when he stands");
  Object.assign(h, { x: 1500 }); until(g, () => false, 1.2); assert.ok(lift.y > -5, "empty, it comes back down");
  Object.assign(h, { x: 1450, y: 0, onGround: true }); until(g, (x) => x.world.hero.x <= 520, 4, { left: true }); assert.ok(h.y <= -535, `up the stairs at ${h.y}`);
});
test("let go of the crouch halfway, and he is off the lift", () => {
  const g = paris(); play(g); bonjour(g); const h = g.world.hero; const lift = g.world.movers.find((m) => m.id === "lift");
  Object.assign(h, { x: 1030, y: 0, onGround: true });
  until(g, (x) => x.world.hero.y <= -120, 1, { down: true });
  until(g, () => false, 1.5);
  assert.ok(h.y > -520, `he fell at ${h.y}`);
  assert.ok(lift.y > -5);
});
test("the window tips him off after 0.4 s with the sign's slip; the baguette is 50 points with its thought; no ice is a thought", () => {
  const g = paris(); play(g); const h = g.world.hero; Object.assign(h, { x: 480, y: -800, onGround: true });
  const evs = until(g, (x) => of(x.events, "tip").length > 0, 1); assert.ok(evs.length > 0); assert.ok(h.vx > 0 && h.stunT > 0);
  assert.ok(!g.world.stage.platforms.some((p) => p.tip), "it hangs open a moment");
  until(g, () => false, 1.6);
  assert.ok(g.world.stage.platforms.some((p) => p.tip), "and swings back");
  const b = g.pickups.find((p) => p.kind === "bread"); const s = g.run.score; Object.assign(h, { x: b.x, y: b.y, vx: 0, stunT: 0 });
  const got = until(g, (x) => x.run.score > s, 1); assert.deepEqual([g.run.score - s, of(got, "think").some((e) => e.text === "That's breakfast? That's a baguette.")], [50, true]);
  assert.deepEqual([PARIS.thoughts[0].text, PARIS.thoughts[0].y], ["No ice. Of COURSE.", -540]);
});
test("the baguette is not there again after a lost life", () => {
  const g = paris(); play(g); const h = g.world.hero; const b = g.pickups.find((p) => p.kind === "bread");
  Object.assign(h, { x: b.x, y: b.y, vx: 0 }); until(g, (x) => x.run.score > 0, 1);
  h.patience = 1; g.world.hit(h.x + 100); until(g, (x) => of(x.events, "respawn").length > 0, 6);
  assert.equal(g.pickups.find((p) => p.kind === "bread").taken, true);
});
test("the street: the terrace's chairs are platforms, the waiter's pass knocks him, a scooter every 7 s along the gutter is jumped, the awning holds the Buc-ee's", () => {
  const g = paris(); play(g); const h = g.world.hero;
  assert.deepEqual([PARIS.platforms.filter((p) => p.kind === "chair").length, PARIS.platforms.filter((p) => p.kind === "awning").length, PARIS.crates[0]], [3, 1, { id: "awning", kind: "bucees", x: 10150, y: -560 }]);
  assert.ok(PARIS.platforms.filter((p) => p.kind === "chair" || p.kind === "table").every((p) => p.x0 > 2471 || p.y < -600), "the terrace clear of the back stair");
  const w = g.world.cast.find((n) => n.trick === "tray"); Object.assign(h, { x: w.x + 60 * w.facing, y: 0, patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.patience < 2, 2); assert.equal(h.patience, 1);
  Object.assign(h, { x: 6000, y: 0, patience: 2, invuln: 0 }); until(g, (x) => x.world.movers.some((m) => m.id.startsWith("scooter") && m.live && m.x < 8000), 12);
  until(g, (x) => x.world.hero.patience < 2, 4); assert.equal(h.patience, 1);
  Object.assign(h, { x: 6000, patience: 2, invuln: 0, onGround: true, y: 0, vy: 0, vx: 0, move: null }); until(g, (x) => x.world.movers.some((m) => m.id.startsWith("scooter") && m.live && Math.abs(m.x - 6000) < 260 && m.x > 6000), 12); g.step(input({ jump: true }, { jump: true }));
  until(g, () => false, 1, { jump: true }); assert.equal(h.patience, 2);
});
test("the waiter never notices him; bonked he walks off and is back after 8 s", () => {
  const g = paris(); play(g); const w = g.world.cast.find((n) => n.trick === "tray");
  const h = g.world.hero; Object.assign(h, { x: w.x + 600, y: 0 });
  const seen = until(g, () => false, 1);
  assert.equal(of(seen, "castWindup").length + of(seen, "castNotice").length, 0);
  assert.equal(strikeNpc(w, "mallet", 1, g.world, g.events), true);
  assert.ok(w.out, "one bonk");
  Object.assign(h, { x: 6000 });
  until(g, () => !w.out && w.alive, 12);
  assert.deepEqual([w.out, w.alive], [false, true]);
});
test("Coke Zero in France is the can at seventy percent with its thought once", () => {
  const g = paris(); play(g); const h = g.world.hero; const c = g.pickups.find((p) => p.kind === "can"); Object.assign(h, { x: c.x, y: c.y });
  const evs = until(g, (x) => x.run.cans > 0, 1); assert.ok(of(evs, "think").some((e) => e.text === "Thirty-three centiliters. That's a sample."));
  const d = g.pickups.find((p) => p.kind === "can" && !p.taken); Object.assign(h, { x: d.x, y: d.y }); const again = until(g, (x) => x.run.cans > 1, 1); assert.ok(!of(again, "think").some((e) => e.text.startsWith("Thirty")));
});
test("the pigeons scatter once as he comes", () => {
  const g = paris(); play(g); const h = g.world.hero; Object.assign(h, { x: PARIS.pigeons[0].x - 500, y: 0 });
  const far = until(g, () => false, 0.1); assert.equal(of(far, "pigeons").length, 0);
  Object.assign(h, { x: PARIS.pigeons[0].x - 250 });
  const near = until(g, () => false, 1); assert.equal(of(near, "pigeons").length, 1);
});
test("the scripted walker reaches the brasserie with time to spare; a masher who never jumps is finished by the scooters or the clock", () => {
  const g = paris(); play(g); let t = 0; while (!["questCard", "over"].includes(g.mode) && t < 400) { g.step(drive(g.level, g.world.hero, "paris", g.world)); t += STEP; }
  assert.deepEqual([g.mode, g.run.lives >= 1], ["questCard", true]);
  assert.ok(t < 200, `in ${t} s`);
  const m = paris(); play(m); Object.assign(m.world.hero, { x: 3200, y: 0 }); until(m, (x) => x.mode === "over", 420, { hammer: true, right: true }); assert.equal(m.mode, "over");
});

test("the hints say Paris's own business: her gate, the lift, the way out, the street", () => {
  const g = paris(); play(g); const h = g.world.hero;
  assert.match(hintOf(g), /E .*bonjour/i);
  bonjour(g);
  Object.assign(h, { x: 900, y: 0 });
  assert.match(hintOf(g), /lift/i);
  Object.assign(h, { x: 1200, y: -540 });
  assert.match(hintOf(g), /back stair/i);
  Object.assign(h, { x: 6000, y: 0 });
  assert.match(hintOf(g), /scooter/i);
});
