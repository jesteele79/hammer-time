// SAT, the prologue's level (story spec §6.2, §6.3): its shape, the scripted walk from the curb to gate B7, the gate's
// round ending the level, a life lost before the podium, the lessons that teach the moves and his thoughts at their marks.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { RUN } from "../src/sim/run.ts";
import { drive } from "../src/sim/drive.ts";
import { hintOf } from "../src/render/hud.ts";
import { SAT } from "../src/sim/levels/sat.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { masherPlayer } from "../src/sim/quests/fares/drive.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
/** Steps until `done(g)` (or the time runs out) and returns every event on the way. */
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const knockOut = (g) => { g.world.hero.patience = 1; g.world.hit(g.world.hero.x + 100); };

const satGame = (opts = {}) => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 11, { cast: false, title: true });
  g.newRun(11, 0, { shift: [SAT, LOBBY], journey: true, ...opts });
  return g;
};

test("SAT is a level of about 8,000 px with one punch clock and a gate door, no exit", () => {
  assert.deepEqual([SAT.id, SAT.world, SAT.length, SAT.time, SAT.music], ["sat", "SAT", 8000, 420, "sat"]);
  assert.deepEqual(SAT.doors.map((d) => d.kind), ["gate"]);
  assert.deepEqual(SAT.checkpoints.map((k) => k.id), ["concourse"]);
  assert.ok(SAT.floor.filter((f) => f.belt).length === 2 && SAT.passes.length === 1);
});
test("the scripted player walks SAT from the curb to gate B7 along the floor", () => {
  const g = satGame();
  play(g);
  let t = 0,
    last = g.world.hero.x,
    stuck = 0;
  while (g.mode === "play" && t < 150) {
    g.step(drive(g.level, g.world.hero, "floor", g.world));
    t += STEP;
    if (Math.floor(t * 2) !== Math.floor((t - STEP) * 2)) {
      stuck = g.world.hero.x <= last + 1 ? stuck + 1 : 0;
      last = g.world.hero.x;
      assert.ok(stuck < 6, `stuck at ${g.world.hero.x}, ${g.world.hero.y}`);
    }
  }
  assert.deepEqual([g.mode, g.quest?.id, g.questDoor?.id, g.run.punched], ["questCard", "fares", "b7", ["concourse"]]);
});
test("the gate's tally pays into the run and ends the level on the clock's tally, then the story hold", () => {
  const g = satGame();
  play(g);
  Object.assign(g.world.hero, { x: 7790, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  g.run.time = 100;
  until(g, (x) => x.mode === "questCard", 2, { right: true });
  until(g, (x) => x.mode === "quest", RUN.cardT + 0.2);
  const q = g.quest;
  for (let i = 0; i < 900 * 120 && !q.result; i++) g.step(masherPlayer(q));
  assert.equal(g.mode, "questTally");
  const before = g.run.score;
  g.finishQuest();
  assert.deepEqual([g.mode, g.run.score >= before + q.result.score, g.world.hero.boxes], ["tally", true, q.result.boxes]);
  const evs = until(g, (x) => x.mode === "story", 12);
  assert.ok(evs.some((e) => e.type === "levelDone" && e.id === "sat"));
  assert.ok(g.run.score > before + q.result.score, "the clock's leftover counted");
});
test("a life lost before the podium comes back at the concourse's punch clock; the gate stays ahead", () => {
  const g = satGame();
  play(g);
  Object.assign(g.world.hero, { x: 5350, y: 0, onGround: true });
  g.step(input({ right: true }));
  assert.deepEqual(g.run.punched, ["concourse"]);
  knockOut(g);
  until(g, (x) => x.mode === "card", 3);
  assert.deepEqual([g.run.lives, Math.round(g.world.hero.x), g.quest], [2, 5300, null]);
});
test("the lessons teach the moves in order and stop once each is done; the thoughts come once at their marks", () => {
  const g = satGame();
  play(g);
  assert.match(hintOf(g), /^Space jumps/);
  g.step(input({ jump: true }, { jump: true }));
  for (let i = 0; i < 60; i++) g.step(input());
  assert.doesNotMatch(hintOf(g), /^Space jumps/);
  Object.assign(g.world.hero, { x: 1500, y: 0, onGround: true, vx: 0 });
  g.step(input());
  assert.match(hintOf(g), /^Shift runs/);
  const thoughts = [];
  for (const x of [250, 350, 350, 5250, 5350]) {
    Object.assign(g.world.hero, { x, y: 0, onGround: true });
    g.step(input());
    thoughts.push(...of(g.events, "think").map((e) => e.text));
  }
  assert.deepEqual(thoughts, ["Pre-check. I AM pre-check.", "Seven minutes. Plenty."]);
});
test("at the gate the hint says to walk in and board, not that it is closed", () => {
  const g = satGame();
  play(g);
  Object.assign(g.world.hero, { x: 7700, y: 0, vx: 0, onGround: true });
  g.step(input());
  assert.equal(hintOf(g), "GATE B7 · walk in to board");
});

test("the lecture's hint beside the bartender speaks of his coasters, not of students and paper", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 11, { title: true });
  g.newRun(11, 0, { shift: [SAT, LOBBY], journey: true });
  play(g);
  const bartender = g.world.cast.find((n) => n.job === "bartender");
  g.world.hero.x = bartender.x - 120;
  g.world.hero.y = 0;
  assert.equal(hintOf(g), "E lectures them · a schooled bartender stops throwing coasters");
});

import { createCast } from "../src/sim/cast.ts";
import { createCart } from "../src/sim/targets.ts";
test("SAT's people: the skycap with his cart at the curb, two TSA agents in the line, the bartender on the bar", () => {
  const targets = SAT.carts.map((x, i) => createCart(i + 1, x));
  const cast = createCast(SAT, targets);
  assert.deepEqual(cast.map((n) => [n.spawn, n.job, n.role]), [["skycap-curb", "skycap", "bellhop"], ["tsa-1", "tsa", "bellhop"], ["tsa-2", "tsa", "bellhop"], ["bartender", "bartender", "student"]]);
  assert.deepEqual([cast[0].cart, cast[0].carry, cast[3].y, cast[3].carry, cast[2].recolor], [1, "nuts", -180, "can", "#2f3f63"]);
});
test("with its people in it the scripted player still walks SAT to gate B7", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 11, { title: true });
  g.newRun(11, 0, { shift: [SAT, LOBBY], journey: true });
  play(g);
  let t = 0;
  while (g.mode !== "questCard" && g.mode !== "over" && t < 240) {
    g.step(g.mode === "play" ? drive(g.level, g.world.hero, "floor", g.world) : input());
    t += STEP;
  }
  assert.equal(g.mode, "questCard", `at ${Math.round(g.world.hero.x)} with ${g.run.lives} lives`);
});
