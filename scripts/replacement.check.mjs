// 3-6 The replacement (story spec §11.1): the training room, the fight only, in scrubs; the kid's three rounds on one bar of
// fifteen: the ring light's beam and its stand, the residents, the drone, the IFU and the room's freeze, the video and the
// screen; "absolute bullshit" on his first hurt, "They need to get fired" on the last hit; a lost life is the whole fight again.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { REPLACEMENT } from "../src/sim/levels/replacement.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { BOSS_NAMES, hitBoss } from "../src/sim/boss.ts";
import { hudOf, hintOf } from "../src/render/hud.ts";
import { drive } from "../src/sim/drive.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
/** `each` runs after every step, with its events still the step's. */
const until = (g, done, seconds = 10, held = {}, each) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); each?.(g); evs.push(...g.events); } return evs; };
const knockOut = (g) => { g.world.hero.patience = 1; g.world.hero.invuln = 0; g.world.hit(g.world.hero.x + 100); };
/** The training room as a journey's stop, the fight only. */
const fight = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 91, { cast: true, title: true }); g.newRun(91, 0, { shift: [REPLACEMENT], journey: true, ...opts }); return g; };

test("the training room: the fight only, 360 s, in scrubs, the lectern with the IFU, four rows, the kid at 15 on one bar with marks at 5 and 10", () => {
  assert.deepEqual([REPLACEMENT.time, REPLACEMENT.costume, REPLACEMENT.platforms.filter((p) => p.kind === "seat").length, REPLACEMENT.ifu, REPLACEMENT.boss.kind, REPLACEMENT.doors.length], [360, "scrubs", 4, { x: 3000, y: -140 }, "replacement", 0]);
  assert.deepEqual([REPLACEMENT.world, REPLACEMENT.name, REPLACEMENT.card, REPLACEMENT.music, STOP_LEVELS.get("replacement")], ["3-6", "The replacement", "The training room. He has a ring light.", "replacement", REPLACEMENT]);
  const g = fight(); play(g); const r = g.world.boss; assert.deepEqual([r.hp, r.round, r.state, BOSS_NAMES.replacement, hudOf(g).boss], [15, 1, "wait", "The replacement", null]);
  Object.assign(g.world.hero, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2); assert.deepEqual(hudOf(g).boss.marks, [5, 10]);
  assert.match(hintOf(g), /ring light's stand/);
});
test("round one: the beam sweeps and heats him at 30 a second, never when off the floor; the kid keeps to its far edge and jabs in reach; a bonk on the stand turns the beam and leaves him in the dark 1.5 s, the hit", () => {
  const g = fight(); play(g); const h = g.world.hero; const r = g.world.boss; Object.assign(h, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2);
  // The stick reaches the beam's middle from its edge: he is untouchable for this second, so only the beam acts on him.
  Object.assign(h, { x: r.beam.x, y: 0, heat: 0, vx: 0, invuln: 2 }); until(g, () => false, 1); assert.ok(h.heat >= 25 && h.heat <= 35, `heat ${h.heat}`);
  Object.assign(h, { x: r.beam.x, y: -300, onGround: false, vy: 0, heat: 0 }); g.step(input()); assert.equal(h.heat, 0);
  assert.ok(Math.abs(r.x - (r.beam.x + 260 * r.beam.dir)) < 40 || r.state !== "edge", "at the edge");
  Object.assign(h, { x: r.x - 200, y: 0, patience: 2, invuln: 0 }); const jab = until(g, (x) => x.world.hero.patience < 2, 3); assert.deepEqual([of(jab, "bossWindup").length >= 1, h.patience], [true, 1]);
  assert.equal(hitBoss(r, "bonk", g.events), true); assert.deepEqual([r.hp, r.state], [14, "hurt"]);
  until(g, (x) => x.world.boss.state === "edge", 3); const bx = r.beam.x; Object.assign(h, { x: r.stand.x - 150, y: 0, facing: 1 });
  const turn = []; for (let i = 0; i < 240 && !of(g.events, "beamTurn").length; i++) { g.step(input({}, { hammer: i % 30 === 0 })); turn.push(...g.events); }
  assert.deepEqual([of(turn, "beamTurn").length, Math.abs(r.beam.x - bx) >= 600, r.state], [1, true, "dark"]);
});
test("absolute bullshit plays once, on his first hurt of the fight, and a lost life restarts the fight whole at 15", () => {
  const g = fight(); play(g); const h = g.world.hero; const r = g.world.boss; Object.assign(h, { x: 2300, y: 0, patience: 2, invuln: 0 }); until(g, (x) => x.world.boss.awake, 2);
  const first = until(g, (x) => of(x.events, "voiceLine").length > 0, 6, {}, (x) => { if (x.world.hero.invuln <= 0 && x.world.hero.patience === 2) x.world.hit(x.world.hero.x + 100); }); assert.deepEqual(of(first, "voiceLine").map((e) => e.id), ["curse"]);
  Object.assign(h, { patience: 2, invuln: 0 }); assert.equal(of(until(g, () => false, 1, {}, (x) => { if (x.world.hero.invuln <= 0) x.world.hit(x.world.hero.x + 100); }), "voiceLine").length, 0, "once");
  hitBoss(r, "bonk", g.events); until(g, () => false, 1); knockOut(g); until(g, (x) => of(x.events, "respawn").length > 0, 4); assert.deepEqual([g.world.boss.hp, g.world.boss.round, g.world.hero.x], [15, 1, 200]);
});
test("the scripted trainee takes round one: past the stick in its rest, the stand turned from its far side, the kid hit in the dark five times, no life lost", () => {
  const g = fight(); const all = []; for (let i = 0; i < Math.round(90 / STEP) && g.world.boss.round === 1; i++) { g.step(drive(g.level, g.world.hero, "replacement", g.world)); all.push(...g.events); }
  assert.deepEqual([g.world.boss.hp, g.world.boss.round, of(all, "lifeLost").length, of(all, "beamTurn").length >= 5], [10, 2, 0, true]);
});
