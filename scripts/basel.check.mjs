// 3-4 Basel in Tattoo week (story spec §10.1): the street from the Kaserne to the office's door, the four errands held at
// their counters, the door that needs them, the crowd behind the barriers, the bikes over the ramp; the parade's bands, the
// drum corps and the drill team; the drum major and the pipers who follow; the scripted walker and the masher.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { BASEL } from "../src/sim/levels/basel.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { hudOf } from "../src/render/hud.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
/** `each` runs after every step, with its events still the step's. */
const until = (g, done, seconds = 10, held = {}, each) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); each?.(g); evs.push(...g.events); } return evs; };
const knockOut = (g) => { g.world.hero.patience = 1; g.world.hero.invuln = 0; g.world.hit(g.world.hero.x + 100); };
const basel = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 81, { cast: true, title: true }); g.newRun(81, 0, { shift: [BASEL], journey: true, ...opts }); return g; };

test("Basel's street: 16,000 px, two punch clocks, four errands at their counters, a door that needs them", () => {
  assert.deepEqual([BASEL.length, BASEL.time, BASEL.music, BASEL.checkpoints.map((c) => c.x), BASEL.errands.map((e) => e.id), BASEL.doors[0].errands], [16000, 420, "basel", [5600, 11000], ["bank", "printer", "pharmacy", "courier"], true]);
  assert.deepEqual([BASEL.platforms.filter((p) => p.kind === "barrier").length, BASEL.platforms.filter((p) => p.kind === "bleacher").every((p) => p.y === -520), BASEL.home], [5, true, { x: 900, cx: 1400 }]);
  assert.deepEqual([BASEL.world, BASEL.name, BASEL.card, STOP_LEVELS.get("basel")], ["3-4", "Basel, Tattoo week", "14 July. 18:10. Four errands and a meeting.", BASEL]);
});
test("an errand counts after 1.5 s standing at its counter, says its line, and the HUD counts it; walking away resets the hold", () => {
  const g = basel(); play(g); const h = g.world.hero; Object.assign(h, { x: 7900, y: 0 });
  until(g, () => false, 1); assert.deepEqual([g.run.errands, hudOf(g).errands], [[], { n: 0, of: 4 }]);
  Object.assign(h, { x: 8200 }); until(g, () => false, 0.2); Object.assign(h, { x: 7900, vx: 0 });
  const evs = until(g, (x) => x.run.errands.length > 0, 2); assert.deepEqual([g.run.errands, of(evs, "errand")[0].n, of(evs, "think").some((e) => e.text === "Francs. Not euros. Not dollars. FRANCS."), hudOf(g).errands], [["bank"], 1, true, { n: 1, of: 4 }]);
  assert.ok(until(g, (x) => x.run.errands.length > 1, 3).length > 0 && g.run.errands.length === 1, "once");
});
test("the office door stays shut until 4/4 and says why; at 4/4 it ends the level; errands survive a lost life and not Try again", () => {
  const g = basel(); play(g); const h = g.world.hero; Object.assign(h, { x: 15600, y: 0 });
  const shut = until(g, () => false, 1, { right: true }); assert.deepEqual([g.mode, of(shut, "errandsShut").length >= 1, of(shut, "think").filter((e) => e.text === "I have four errands and a meeting.").length], ["play", true, 1]);
  for (const id of ["bank", "printer", "pharmacy"]) g.dev.errand(id); knockOut(g); until(g, (x) => of(x.events, "respawn").length > 0, 4); assert.deepEqual(g.run.errands, ["bank", "printer", "pharmacy"]);
  g.dev.errand("courier"); play(g); Object.assign(h, { x: 15600, y: 0 }); until(g, (x) => x.mode !== "play", 2, { right: true }); assert.equal(g.mode, "walkoff");
  const t = basel(); play(t); t.dev.errand("bank"); t.world.hero.patience = 1; t.run.lives = 1; knockOut(t); until(t, (x) => x.mode === "over", 4); t.newRun(81, t.venue, { snapshot: t.snapshot }); play(t); assert.deepEqual(t.run.errands, []);
});
test("the crowd cheers and is bonked once with Prost!, never solid; the bikes come in pairs and jump the ramp", () => {
  const g = basel(); play(g); const h = g.world.hero; const fan = g.world.cast.find((n) => n.trick === "cheer"); Object.assign(h, { x: fan.x - 200, y: 0 });
  until(g, () => false, 1, { right: true }); assert.ok(h.x > fan.x, "walked through");
  Object.assign(h, { x: fan.x - 150 }); const evs = until(g, (x) => !x.world.cast.find((n) => n.id === fan.id).alive, 2, {}, (x) => x.step(input({}, { hammer: true }))); assert.ok(of(evs, "castLine").some((e) => e.text === "Prost!"));
  const bikes = g.world.movers.filter((m) => m.id.startsWith("bike")); assert.deepEqual([bikes.length, bikes[1].first - bikes[0].first, bikes[0].jump], [2, 0.5, { x: 11000, d: 700, h: 320 }]);
  until(g, (x) => x.world.movers.some((m) => m.id === "bike-1" && m.live && m.x < 10700 && m.x > 10400), 20); assert.ok(bikes[0].y < -200, "in the air over the ramp");
});
test("the ramp is a floor he walks up from the old town's side, and a face he jumps from the bridge's", () => {
  const g = basel(); play(g); const h = g.world.hero; g.world.movers.length = 0; Object.assign(h, { x: 11300, y: 0, facing: -1 });
  until(g, (x) => x.world.hero.x < 10750, 3, { left: true }); assert.ok(h.y < -150 && h.onGround, `up the ramp at ${h.y}`);
  Object.assign(h, { x: 10350, y: 0, vx: 0, vy: 0, onGround: true }); until(g, () => false, 1, { right: true }); assert.ok(h.x < 10600, "the face stops a walk");
});
