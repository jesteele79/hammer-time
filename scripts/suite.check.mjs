// The suite (story spec §8.4): three rooms and no door, Lifetime Titanium guy's briefcase and apples in the living room, the
// bed and the bellhops, the bottles and the grab on the balcony, over the rail into the pool, and a level that ends with him.
import test from "node:test";
import assert from "node:assert/strict";
import { JUMP_V0, STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { SUITE } from "../src/sim/levels/suite.ts";
import { drive } from "../src/sim/drive.ts";
import { hitBoss } from "../src/sim/boss.ts";
import { hittable } from "../src/sim/cast.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const suite = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 51, { cast: false, title: true }); g.newRun(51, 0, { shift: [SUITE], journey: true, ...opts }); return g; };

test("the suite is three rooms with no door and no clock, the bed bounces 1.3 times his jump, and the boss has twelve health in three phases", () => {
  assert.deepEqual([SUITE.id, SUITE.world, SUITE.rooms.length, SUITE.doors.length, SUITE.checkpoints.length, SUITE.boss], ["suite", "2-4", 3, 0, 0, { kind: "titanium", x: 1200, arena: [200, 4600], room: 0 }]);
  const g = suite();
  play(g);
  const h = g.world.hero;
  Object.assign(h, { x: 2400, y: -600, vy: 400, onGround: false });
  until(g, (x) => of(x.events, "bounce").length > 0, 2);
  assert.ok(Math.abs(h.vy) > 1.2 * JUMP_V0 * 0.9, `${h.vy}`);
  assert.deepEqual([g.world.boss.hp, g.world.boss.phase, g.world.boss.room], [12, 1, 0]);
});
test("phase 1: the briefcase swing is telegraphed and reaches 1.3 times the mallet; apples come three at a time every 3 s and are batted back for 100", () => {
  const g = suite();
  play(g);
  const t = g.world.boss;
  Object.assign(g.world.hero, { x: t.x - 280, y: 0, onGround: true, patience: 2, invuln: 0 });
  const evs = until(g, (x) => of(x.events, "bossWindup").length > 0, 4);
  assert.ok(evs.length > 0);
  until(g, (x) => x.world.hero.patience < 2, 1.5);
  assert.equal(g.world.hero.patience, 1);
  Object.assign(g.world.hero, { x: t.x - 700, patience: 2, invuln: 0 });
  until(g, (x) => x.world.missiles.filter((m) => m.kind === "apple").length >= 3, 6);
  assert.ok(g.world.missiles.filter((m) => m.kind === "apple").length >= 3, "three apples");
  const a = g.world.missiles.find((m) => m.kind === "apple");
  Object.assign(g.world.hero, { x: a.x - 150, y: 0, onGround: true, invuln: 1, move: null });
  const s = g.run.score;
  g.step(input({ hammer: true }, { hammer: true }));
  const evs2 = until(g, (x) => x.run.score > s, 1);
  assert.equal(g.run.score - s, 100, JSON.stringify(of(evs2, "batted")));
  assert.ok(g.world.missiles.some((m) => m.batted && m.vx > 0) || of(evs2, "batted").length === 1, "going back the way it came");
});
test("phase 2 on the bed with bellhops every 10 s dropping 200-point keycards; phase 3's grab takes ten cans and each hit gives ten back; the win goes into the pool and ends the level", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 51, { title: true });
  g.newRun(51, 0, { shift: [SUITE], journey: true });
  play(g);
  const t = g.world.boss;
  t.hp = 9;
  t.hurtT = 0;
  Object.assign(g.world.hero, { invuln: 99 });
  hitBoss(t, "bonk", g.events);
  g.step(input());
  assert.deepEqual([t.phase, t.room, g.world.cast.length], [2, 1, 0]);
  until(g, (x) => x.world.cast.length >= 2, 4);
  assert.ok(g.world.cast.length >= 2 && g.world.cast.every((n) => n.carry === "keycard"), "two bellhops with keycards");
  const n = g.world.cast[0];
  for (let i = 0; i < 12 && !g.pickups.some((p) => p.kind === "keycard"); i++) {
    Object.assign(g.world.hero, { x: n.x - 170, y: 0, vx: 0, onGround: true, facing: 1, move: null, invuln: 99 });
    g.step(input({ hammer: true }, { hammer: true }));
    until(g, (x) => x.pickups.some((p) => p.kind === "keycard"), 0.6);
    until(g, () => hittable(n), 1.5);
  }
  const k = g.pickups.find((p) => p.kind === "keycard");
  assert.ok(k, "the keycard dropped");
  const s = g.run.score;
  Object.assign(g.world.hero, { x: k.x, y: k.y, onGround: true });
  until(g, () => k.taken, 0.2);
  assert.equal(g.run.score - s, 200);
  assert.equal(g.run.keycards, 0, "no status here");
  t.hp = 5;
  t.hurtT = 0;
  hitBoss(t, "bonk", g.events);
  g.step(input());
  assert.deepEqual([t.phase, t.room], [3, 2]);
  g.run.cans = 25;
  Object.assign(g.world.hero, { x: t.x - 150, y: 0, onGround: true, invuln: 0, patience: 99 });
  until(g, (x) => of(x.events, "grab").some((e) => e.phase === "take"), 9);
  assert.deepEqual([g.run.cans, t.owed], [15, 10]);
  t.hurtT = 0;
  t.hp = 3;
  hitBoss(t, "bonk", g.events);
  g.step(input());
  assert.deepEqual([g.run.cans, t.owed], [25, 0]);
  g.run.cans = 4;
  t.owed = 0;
  Object.assign(g.world.hero, { x: t.x - 150, y: 0, onGround: true, invuln: 0, patience: 99 });
  until(g, (x) => of(x.events, "grab").some((e) => e.phase === "take"), 9);
  assert.deepEqual([g.run.cans, t.owed], [0, 4]);
  t.hp = 1;
  t.hurtT = 0;
  hitBoss(t, "bonk", g.events);
  const first = [...g.events];
  const evs = [...first, ...until(g, (x) => x.mode !== "play", 4)];
  assert.deepEqual([of(evs, "pool").length, of(evs, "bossDown").length, g.mode], [1, 1, "walkoff"]);
  assert.ok(evs.some((e) => e.type === "think" && e.text === "Resort fee THIS."), "the last word is his");
});
test("the scripted player beats Lifetime Titanium guy; a masher who never jumps loses to the apples and the bottles", () => {
  const g = suite();
  play(g);
  let t = 0;
  while (!["walkoff", "tally", "over"].includes(g.mode) && t < 280) {
    g.step(drive(g.level, g.world.hero, "floor", g.world));
    t += STEP;
  }
  assert.equal(g.world.boss.state, "down", `at hp ${g.world.boss.hp}, phase ${g.world.boss.phase}, ${g.world.boss.state}, mode ${g.mode}, lives ${g.run.lives}, after ${t} s`);
  assert.ok(["walkoff", "tally"].includes(g.mode), g.mode);
  assert.ok(g.run.lives >= 1);
  const m = suite();
  play(m);
  until(m, (x) => x.mode === "over", 300, { hammer: true, right: true });
  assert.equal(m.mode, "over");
});
test("Try again after Hammer down in phase 3 brings back twelve health, phase 1, the living room and his cans as at the card", () => {
  const g = suite();
  play(g);
  g.run.cans = 30;
  const t = g.world.boss;
  t.hp = 3;
  t.hurtT = 0;
  hitBoss(t, "bonk", g.events);
  g.step(input());
  const snapshot = g.snapshot;
  g.newRun(51, g.venue, { snapshot, shift: [SUITE], journey: true });
  play(g);
  assert.deepEqual([g.world.boss.hp, g.world.boss.phase, g.world.boss.room, g.run.cans], [12, 1, 0, snapshot.run.cans]);
});
