// The 14:02 (story spec §9.3): the station on its own two-minute clock, the barrier, the crowd, the board, boarding; the eighteen
// coaches as rooms; the conductor at three doors; the scripted rider and the masher.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { TRAIN } from "../src/sim/levels/train.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { drive } from "../src/sim/drive.ts";
import { hudOf, hintOf } from "../src/render/hud.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}, each) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); each?.(g); evs.push(...g.events); } return evs; };
const knockOut = (g) => { g.world.hero.patience = 1; g.world.hero.invuln = 0; g.world.hit(g.world.hero.x + 100); };
const train = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 81, { cast: true, title: true }); g.newRun(81, 0, { shift: [TRAIN], journey: true, ...opts }); return g; };

test("3-3 starts in the station on its own two-minute clock while the level's clock waits", () => {
  assert.deepEqual([TRAIN.id, TRAIN.world, TRAIN.time, TRAIN.stretch, TRAIN.checkpoints[0]], ["train", "3-3", 420, { x1: 4000, time: 120, card: "The train left at 14:02. It always does.", bonus: 50 }, { id: "board", x: 4100, y: 0, auto: true }]);
  assert.equal(STOP_LEVELS.get("train"), TRAIN);
  assert.equal(TRAIN.card, "13:41. Gare de Lyon. Voie 23 is not on the board.");
  const g = train(); play(g); assert.equal(g.run.stretch, 120); until(g, () => false, 1); assert.deepEqual([Math.round(g.run.stretch), g.run.time, hudOf(g).stretch, hudOf(g).venue], [119, 420, true, "Gare de Lyon"]);
  assert.equal(hudOf(g).time, 120 - 1, "the HUD reads the stretch's clock");
});
test("at zero: the card's line, a life, the station again at 2:00; three times is Hammer down", () => {
  const g = train(); play(g); g.dev.stretch(0.02); const evs = until(g, (x) => x.mode === "card", 4);
  assert.deepEqual([of(evs, "stretchOut").length, g.run.lives, hudOf(g).card], [1, 2, "The train left at 14:02. It always does."]);
  play(g); assert.deepEqual([g.run.stretch, g.world.hero.x, g.run.time], [120, 150, 420]);
  assert.equal(hudOf(g).card, TRAIN.card, "the line was for that card only");
  g.dev.stretch(0.02); until(g, (x) => x.mode === "card", 4); play(g); g.dev.stretch(0.02); until(g, (x) => x.mode === "over", 4); assert.equal(g.mode, "over");
});
test("boarding pays the leftover at 50 a second once and starts the level's clock; a life lost on board returns him to coach 18, never the station", () => {
  const g = train(); play(g); const h = g.world.hero; g.dev.stretch(61.5); Object.assign(h, { x: 3990, y: 0 }); const s = g.run.score;
  const evs = until(g, (x) => of(x.events, "boarded").length > 0, 1, { right: true }); assert.deepEqual([of(evs, "boarded")[0].bonus, g.run.score - s, g.run.stretch, g.run.checkpoint], [3050, 3050, null, "board"]);
  assert.equal(of(evs, "checkpoint").length, 0, "no punch clock here");
  until(g, () => false, 1.1); assert.ok(g.run.time < 420);
  assert.ok(hudOf(g).time < 420 && hudOf(g).stretch === false);
  knockOut(g); until(g, (x) => of(x.events, "respawn").length > 0, 4); assert.deepEqual([h.x, g.run.stretch, g.run.lives, g.run.score - s], [4100, null, 2, 3050]);
  g.dev.stretch(5); assert.equal(g.run.stretch, null, "the lever is refused once boarded");
});
test("Hammer down on board then Try again replays the whole level from its card with the station at 2:00, the bonus unspent", () => {
  const g = train(); play(g); const h = g.world.hero; const s0 = g.run.score; g.dev.stretch(50); Object.assign(h, { x: 3990, y: 0 });
  until(g, (x) => of(x.events, "boarded").length > 0, 1, { right: true });
  for (let i = 0; i < 40000 && g.mode !== "over"; i++) { if (g.mode === "play") knockOut(g); g.step(input()); }
  assert.equal(g.mode, "over");
  g.newRun(81, g.venue, { snapshot: g.snapshot }); play(g);
  assert.deepEqual([g.run.stretch, h.x, g.run.time, g.run.score], [120, 150, 420, s0]);
});
test("the barrier is passed by a slide, the crowd shoves without a pip, the board lights Voie 23 at 1:00, the doors beep in the last twenty seconds", () => {
  const g = train(); play(g); const h = g.world.hero; Object.assign(h, { x: 1650, y: 0, onGround: true }); until(g, () => false, 1.5, { right: true }); assert.ok(h.x < 1800);
  Object.assign(h, { x: 1650 }); until(g, (x) => x.world.hero.x > 1950, 3, { right: true, run: true, down: true }); assert.ok(h.x > 1950);
  const n = g.world.cast.find((c) => c.trick === "shove"); Object.assign(h, { x: n.x + 40 * n.facing, y: 0, patience: 2 }); const sh = until(g, (x) => of(x.events, "shoved").length > 0, 3);
  assert.deepEqual([sh.length > 0, h.patience, of(sh, "castLine").some((e) => e.text === "Pardon.")], [true, 2, true]);
  g.step(input()); g.dev.stretch(60); const b = until(g, (x) => of(x.events, "board").length > 0, 0.5); assert.ok(of(b, "think").some((e) => e.text === "Voie 23. VOIE. 23."));
  g.dev.stretch(19); const beep = until(g, (x) => of(x.events, "doorsBeep").length > 0, 2.5); assert.ok(beep.length > 0);
  assert.equal(hudOf(g).hurry, true);
});
test("a shove never carries him through the barrier", () => {
  const g = train(); play(g); const h = g.world.hero; const n = g.world.cast.find((c) => c.trick === "shove" && c.x < 1800);
  Object.assign(n, { x: 1640, vx: 0, x0: 1500, x1: 1740, facing: 1 });
  Object.assign(h, { x: 1700, y: 0, patience: 2 });
  until(g, (x) => of(x.events, "shoved").length > 0, 3);
  until(g, () => false, 0.5);
  assert.ok(h.x < 1800, `at ${h.x}`);
});
test("the hint says what the station asks", () => {
  const g = train(); play(g);
  assert.match(hintOf(g), /barrier/i);
  Object.assign(g.world.hero, { x: 2500 });
  assert.match(hintOf(g), /door|platform|Voie/i);
});
test("the scripted runner boards with time to spare; a dawdler who never slides misses the train three times", () => {
  const g = train(); play(g); let t = 0; while (g.run.stretch !== null && g.mode === "play" && t < 119) { g.step(drive(g.level, g.world.hero, "train", g.world)); t += STEP; }
  assert.deepEqual([g.run.stretch, g.world.hero.x > 4000], [null, true]);
  const m = train(); play(m); until(m, (x) => x.mode === "over", 380, { right: true }); assert.equal(m.mode, "over");
});
