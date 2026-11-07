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
import { CHARGE_MAX } from "../src/sim/moves.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
/**
 * `each` runs after every step, with its events still the step's. An `each` that steps the game itself (a key pressed) keeps
 * both steps' events, and the loop stops at whichever step is done.
 */
const until = (g, done, seconds = 10, held = {}, each) => {
  const evs = [];
  for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) {
    g.step(input(held));
    const stepped = g.events;
    if (each && done(g)) return [...evs, ...stepped];
    each?.(g);
    evs.push(...(g.events === stepped ? stepped : [...stepped, ...g.events]));
  }
  return evs;
};
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
test("round two starts at hp 10 whatever landed the hit: residents four at a time, the drone that dives and is downed by a snot for 300 and FOOTAGE., a new one after 10 s", () => {
  const g = fight(); play(g); const h = g.world.hero; const r = g.world.boss; Object.assign(h, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2);
  for (let i = 0; i < 4; i++) { hitBoss(r, "bonk", g.events); until(g, (x) => x.world.boss.state !== "hurt", 1); } r.hp = 11; hitBoss(r, "snot", g.events); const two = until(g, (x) => x.world.boss.round === 2, 1);
  assert.deepEqual([r.round, of(two, "bossPhase")[0].phase, of(two, "bossSay").some((e) => e.text === "Like and subscribe.")], [2, 2, true]);
  // He stands among the residents' charts and the drone's dives for half a minute: untouchable, so the fight he is in stays the one under test.
  h.invuln = 99;
  until(g, (x) => x.world.cast.filter((c) => c.job === "resident" && c.alive).length === 4, 14); assert.equal(g.world.cast.filter((c) => c.job === "resident" && c.alive).length, 4);
  const dive = until(g, (x) => of(x.events, "droneDive").length > 0, 8); assert.ok(of(dive, "droneHover").length >= 1);
  until(g, (x) => x.world.boss.drone?.state === "hover", 8); const d = r.drone; g.world.snot.push({ id: 99, x: d.x, y: d.y + 5, vx: 0, vy: -1, life: 1, hit: [], hot: false, r: 20 }); const down = until(g, (x) => of(x.events, "droneDown").length > 0, 0.5);
  assert.deepEqual([of(down, "droneDown")[0].points, of(down, "think").some((e) => e.text === "FOOTAGE.")], [300, true]); until(g, (x) => x.world.boss.drone?.state === "circle", 12); assert.equal(r.drone.state, "circle");
});
test("the lecture freezes the kid 2.2 s and the residents with him; the IFU is picked from the lectern, thrown with B, freezes him with birds and READ THE IFU., and lies to be picked up again", () => {
  const g = fight(); play(g); const h = g.world.hero; const r = g.world.boss; Object.assign(h, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2); r.hp = 10; r.round = 2;
  Object.assign(h, { x: r.x - 400, y: 0, facing: 1, lectureCd: 0 }); const fz = until(g, (x) => of(x.events, "bossFreeze").length > 0, 1, {}, (x) => x.step(input({}, { lecture: true }))); assert.deepEqual([of(fz, "bossFreeze")[0].seconds, r.state, hitBoss(r, "bonk", g.events)], [2.2, "frozen", true]);
  Object.assign(h, { x: 3000, y: -140, onGround: true }); const took = until(g, (x) => of(x.events, "ifuTaken").length > 0, 1, { right: true }); assert.deepEqual([took.length > 0, h.boxes, g.world.ifu.state], [true, 1, "held"]);
  Object.assign(h, { x: r.x - 350, y: 0, facing: 1 }); until(g, (x) => x.world.boss.state !== "frozen" && x.world.boss.state !== "hurt", 3); const thrown = until(g, (x) => of(x.events, "bossFreeze").some((e) => e.birds), 2, {}, (x) => x.step(input({}, { box: true })));
  assert.deepEqual([of(thrown, "bossFreeze").find((e) => e.birds).seconds, of(thrown, "think").some((e) => e.text === "READ THE IFU."), h.boxes], [1.5, true, 0]);
  until(g, (x) => x.world.ifu.state === "lying", 3); Object.assign(h, { x: g.world.ifu.x, y: 0 }); until(g, (x) => x.world.ifu.state === "held", 1, { right: true }); assert.equal(h.boxes, 1);
});
test("round three at hp 5: he hides at the lectern and plays the video, the screen heats the front rows and nuts drop every 6 s; three full smashes crack it, he staggers out 2 s on each, the third leaves him in the open; the last hit plays fired and he is carried out", () => {
  const g = fight(); play(g); const h = g.world.hero; const r = g.world.boss; Object.assign(h, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2); r.hp = 6; r.round = 2; hitBoss(r, "bonk", g.events);
  const three = until(g, (x) => x.world.boss.state === "hide", 6); assert.deepEqual([r.round, of(three, "screenPlay").length, hitBoss(r, "bonk", g.events)], [3, 1, false]);
  Object.assign(h, { x: 2400, y: 0, heat: 0 }); until(g, () => false, 1); assert.ok(h.heat >= 25, "the screen's glow"); assert.ok(until(g, (x) => x.pickups.some((p) => p.kind === "nuts" && !p.taken), 7).length > 0);
  const smash = () => { Object.assign(h, { x: 3000, y: 0, charge: CHARGE_MAX }); return until(g, (x) => of(x.events, "screenCrack").length > 0, 2, {}, (x) => x.step(input({}, { super: true }))); };
  const c1 = smash(); assert.deepEqual([of(c1, "screenCrack")[0].n, r.state, hitBoss(r, "bonk", g.events)], [1, "out", true]); until(g, (x) => x.world.boss.state === "hide", 4);
  smash(); until(g, (x) => x.world.boss.state === "hide", 4); const c3 = smash(); assert.deepEqual([of(c3, "screenCrack")[0].n, of(c3, "screenDark").length, r.screen.playing, r.state], [3, 1, false, "open"]);
  r.hp = 1; const end = until(g, (x) => x.world.boss.state === "down", 3, {}, (x) => { if (hitBoss(x.world.boss, "bonk", x.events)) return; }); assert.deepEqual([of(end, "bossDown")[0].points, of(end, "voiceLine").map((e) => e.id), of(end, "carryOut").length], [5000, ["fired"], 1]);
});
test("the scripted trainer wins all three rounds; a masher who never smashes the screen is finished", () => {
  const g = fight(); play(g); let t = 0; while (g.mode === "play" && t < 350) { g.step(drive(g.level, g.world.hero, "replacement", g.world)); t += STEP; } assert.deepEqual([g.world.boss.state, g.mode !== "over"], ["down", true]);
  // The masher holds right and presses H four times a second, through every life: the kid is never down, and the run is over by its third clock.
  const m = fight(); play(m); Object.assign(m.world.hero, { x: 2300 }); let downed = false;
  for (let i = 0; i < Math.round(1200 / STEP) && m.mode !== "over"; i++) { m.step(input({ right: true }, { hammer: i % 30 === 0 })); downed ||= m.world.boss?.state === "down"; }
  assert.deepEqual([m.mode, downed], ["over", false]);
});
test("a round turns whatever he was doing: set to ten as he keeps to the beam, he takes up filming", () => {
  const g = fight(); play(g); const h = g.world.hero; const r = g.world.boss; Object.assign(h, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2);
  until(g, (x) => x.world.boss.state === "edge", 2); r.hp = 10; g.step(input());
  assert.deepEqual([r.round, ["film", "hop"].includes(r.state)], [2, true], r.state);
});
test("the fight's end walks the administrator in and ends the level on the tally", () => {
  const g = fight(); play(g); const r = g.world.boss; Object.assign(g.world.hero, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2); r.hp = 1; r.round = 3; r.state = "open"; r.screen = { playing: false, cracks: 3 };
  hitBoss(r, "bonk", g.events); const end = until(g, (x) => x.mode !== "play", 9); assert.deepEqual([of(end, "carryOut").length, of(end, "adminIn")[0].x, of(end, "exit").length, g.mode], [1, 800, 1, "walkoff"]);
});
test("round three's rules: a lecture at him hiding brings nothing out, no residents come and the drone stays down; an IFU gone out of the room is back on the lectern; a lost life brings back a whole screen", () => {
  const g = fight(); play(g); const h = g.world.hero; const r = g.world.boss; Object.assign(h, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2);
  r.hp = 6; r.round = 2; g.step(input()); const seated = () => g.world.cast.filter((c) => c.job === "resident" && c.alive).length; hitBoss(r, "bonk", g.events);
  until(g, (x) => x.world.boss.state === "hide", 6); const before = seated();
  Object.assign(h, { x: r.x - 300, y: 0, facing: 1, lectureCd: 0, invuln: 99 }); const lect = until(g, () => false, 1.5, {}, (x) => x.step(input({}, { lecture: true })));
  assert.deepEqual([of(lect, "lecture").length > 0, of(lect, "bossFreeze").length, r.state], [true, 0, "hide"]);
  until(g, () => false, 5); assert.deepEqual([seated() <= before, r.drone === null || r.drone.state === "down"], [true, true]);
  Object.assign(g.world.ifu, { state: "air", sample: 999 }); g.step(input()); assert.deepEqual([g.world.ifu.state, g.world.ifu.x, g.world.ifu.y], ["lectern", 3000, -140]);
  r.screen.cracks = 1; knockOut(g); until(g, (x) => of(x.events, "respawn").length > 0, 4); assert.deepEqual(g.world.boss.screen, { playing: false, cracks: 0 });
});
test("the hint stays the training room's once the kid is down", () => {
  const g = fight(); play(g); const r = g.world.boss; Object.assign(g.world.hero, { x: 2300, y: 0 }); until(g, (x) => x.world.boss.awake, 2); r.hp = 1; r.round = 3; r.state = "open";
  hitBoss(r, "bonk", g.events); until(g, () => false, 1); assert.match(hintOf(g), /The replacement/);
});
