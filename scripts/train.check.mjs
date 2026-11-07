// The 14:02 (story spec §9.3): the station on its own two-minute clock, the barrier, the crowd, the board, boarding; the eighteen
// coaches as rooms; the conductor at three doors; the scripted rider and the masher.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { TRAIN, coachX } from "../src/sim/levels/train.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { drive } from "../src/sim/drive.ts";
import { hudOf, hintOf } from "../src/render/hud.ts";
import { strikeNpc } from "../src/sim/cast.ts";
import { hitBoss, BOSS_NAMES } from "../src/sim/boss.ts";
import { CONDUCTOR, conductorWall } from "../src/sim/conductor.ts";

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

test("eighteen coaches as rooms at half scale from three paintings, the station's two before them; the HUD counts the coaches down", () => {
  assert.deepEqual([TRAIN.rooms.length, TRAIN.coaches, TRAIN.rooms[2], TRAIN.rooms[10].wall, TRAIN.rooms[19]], [20, { from: 4000, every: 768, count: 18 }, { id: "coach-18", x0: 4000, x1: 4768, wall: "train-far-1" }, "train-far-2", { id: "coach-1", x0: 17056, x1: 17824, wall: "train-far-3" }]);
  assert.deepEqual(TRAIN.rooms.slice(0, 2).map((r) => r.wall), ["station-1", "station-2"]);
  const g = train(); play(g); const h = g.world.hero; Object.assign(h, { x: 4100, y: 0 }); g.run.stretch = null; g.step(input()); assert.equal(hudOf(g).venue, "Coach 18");
  Object.assign(h, { x: coachX(14) + 10 }); g.step(input()); assert.equal(hudOf(g).venue, "Coach 14"); Object.assign(h, { x: coachX(1) + 10 }); g.step(input()); assert.equal(hudOf(g).venue, "Coach 1");
});
test("the racks are a crouched route under the ceiling, the seat backs are platforms, a traveler stands up into him, a kid shoves without a pip, the stroller is a cart", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null;
  Object.assign(h, { x: coachX(17) + 200, y: -170, onGround: true }); until(g, () => false, 0.5, { right: true }); assert.ok(h.crouch && h.y <= -168);
  assert.equal(TRAIN.platforms.filter((p) => p.kind === "seat").length, 4 * 17);
  const s = g.world.cast.find((n) => n.trick === "stand"); Object.assign(h, { x: s.x - 300, y: 0, patience: 2, invuln: 0, crouch: false, h: 300 }); until(g, (x) => x.world.hero.patience < 2, 3, { right: true }); assert.equal(h.patience, 1);
  const k = g.world.cast.find((n) => n.person === "kid-1"); assert.equal(k.size, 0.6); Object.assign(h, { x: k.x - 400, y: 0, patience: 2, invuln: 0 }); const sh = until(g, (x) => of(x.events, "shoved").length > 0, 4); assert.deepEqual([sh.length > 0, h.patience, of(sh, "castLine").filter((e) => e.id === k.id).length], [true, 2, 0]);
  const st = g.world.movers.find((m) => m.id === "stroller"); Object.assign(h, { x: st.x - 200, y: 0, patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.patience < 2, 6); assert.equal(h.patience, 1);
});
test("a jump in a coach tucks under the ceiling, far enough to reach a rack or clear the stroller, and he stands again on the floor; he walks the aisle under the door frames", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null;
  Object.assign(h, { x: coachX(16) + 200, y: 0, onGround: true, vx: 0 });
  g.step(input({ jump: true }, { jump: true }));
  let top = 0;
  until(g, (x) => { top = Math.min(top, x.world.hero.y); return x.world.hero.onGround; }, 2, { jump: true });
  assert.ok(top <= -170 && top >= -190, `up to ${top}`);
  assert.ok(h.y <= -168 || h.y === 0);
  Object.assign(h, { x: coachX(16) + 700, y: 0, onGround: true, vx: 0, vy: 0, crouch: false, h: 300 });
  until(g, () => false, 0.5, { right: true });
  assert.ok(h.x > coachX(16) + 768 && h.y === 0 && !h.crouch, `through the door at ${h.x}, ${h.crouch}`);
  // Off the coaches a jump is a jump.
  const a = train(); play(a); const k = a.world.hero; Object.assign(k, { x: 700, y: 0, onGround: true, vx: 0 });
  a.step(input({ jump: true }, { jump: true }));
  let high = 0;
  until(a, (x) => { high = Math.min(high, x.world.hero.y); return x.world.hero.onGround; }, 2, { jump: true });
  assert.ok(high < -350, `up to ${high}`);
});
test("from a rack he can hop back up, and step off it to the aisle", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null;
  Object.assign(h, { x: coachX(17) + 560, y: -170, onGround: true, vx: 0 });
  until(g, () => false, 0.1);
  assert.ok(h.crouch);
  g.step(input({ jump: true }, { jump: true }));
  assert.ok(h.vy < 0 && h.crouch, "a hop, still tucked");
  until(g, (x) => x.world.hero.onGround, 1, { jump: true });
  assert.ok(h.y === -170 || h.y === -110);
  until(g, (x) => x.world.hero.y === 0, 3, { right: true });
  assert.equal(h.y, 0);
  until(g, () => false, 0.2);
  assert.equal(h.crouch, false, "he stands on the floor");
});
test("the bistro car has the punch clock and the fridge, the quiet car its sign, the tunnel and the bogies fire once each, and coach 1's seat ends the level", () => {
  assert.deepEqual([TRAIN.checkpoints[1], TRAIN.crates.find((c) => c.id === "fridge").look, TRAIN.quiet, TRAIN.signs.find((s) => s.label === "Shh").x, TRAIN.tunnel, TRAIN.seat], [{ id: "bistro", x: coachX(10) + 100, y: 0 }, "fridge", { x0: coachX(14), x1: coachX(14) + 768 }, coachX(14) + 384, { x: coachX(12) }, { x: coachX(1) + 600 }]);
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null; Object.assign(h, { x: coachX(12) - 100, y: 0 });
  const evs = until(g, (x) => x.world.hero.x > coachX(12) + 50, 2, { right: true }); assert.deepEqual([of(evs, "tunnel").length, of(evs, "bogie").length], [1, 1]);
  const back = until(g, () => false, 0.1); assert.equal(of(back, "tunnel").length, 0);
  if (g.world.boss) g.world.boss.door = 3;
  Object.assign(h, { x: coachX(1) + 550, y: 0 }); const end = until(g, (x) => x.mode !== "play", 2, { right: true }); assert.deepEqual([of(end, "sit").length, g.mode], [1, "walkoff"]);
});
test("the fridge stands behind the aisle: he walks past it, and the mallet opens it", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null; const f = g.crates.find((c) => c.id === "fridge");
  Object.assign(h, { x: f.x - 300, y: 0, patience: 2, invuln: 0, onGround: true });
  until(g, (x) => x.world.hero.x > f.x + 100, 3, { right: true });
  assert.ok(h.x > f.x + 100);
  Object.assign(h, { x: f.x - 140, y: 0, vx: 0, facing: 1, onGround: true, move: null });
  const evs = [...(g.step(input({ hammer: true }, { hammer: true })), g.events), ...until(g, () => f.used, 1)];
  assert.ok(f.used && of(evs, "canPop").length > 0);
});
test("in the quiet car a swing draws a Shh!; two sit there, taking no other part", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null;
  const quiet = g.world.cast.filter((n) => n.spawn.startsWith("quiet"));
  assert.equal(quiet.length, 2);
  Object.assign(h, { x: coachX(14) + 200, y: 0, onGround: true, vx: 0, move: null });
  const evs = [...(g.step(input({ hammer: true }, { hammer: true })), g.events), ...until(g, () => false, 0.2)];
  assert.ok(of(evs, "castLine").some((e) => e.text === "Shh!"));
  Object.assign(h, { x: coachX(16) + 200, move: null });
  const far = [...(g.step(input({ hammer: true }, { hammer: true })), g.events), ...until(g, () => false, 0.2)];
  assert.ok(!of(far, "castLine").some((e) => e.text === "Shh!"));
});
test("a kid who is bonked runs off and is back; a traveler who is bonked walks off", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null;
  Object.assign(h, { x: coachX(3), y: 0 });
  const k = g.world.cast.find((n) => n.person === "kid-1");
  assert.equal(k.role !== "student", true, "the mallet reaches a kid");
  const hit = strikeNpc(k, "mallet", 1, g.world, g.events);
  assert.equal(hit, true);
  assert.ok(k.out);
  until(g, () => !k.out && k.alive, 12);
  assert.deepEqual([k.out, k.alive], [false, true]);
});

/** Ducked under his punch: the stagger it leaves him in. */
const dodge = (g, seconds = 1.5) => until(g, (x) => x.world.boss.state === "stagger", seconds, { down: true });
test("the conductor waits at the door of coach 13 as a wall, blocks within 400 px with his line and Hammer's failed ticket, punches with a 0.4 s telegraph and staggers when it misses", () => {
  assert.equal(BOSS_NAMES.conductor, "The conductor");
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null; const c = g.world.boss;
  assert.deepEqual([c.kind, c.hp, c.door, c.x, conductorWall(c)], ["conductor", 9, 0, coachX(13), { x: coachX(13) - 12, y: -404, w: 24, h: 404 }]);
  Object.assign(h, { x: coachX(13) - 600, y: 0 });
  const seen = until(g, (x) => of(x.events, "bossWindup").length > 0, 5, { right: true });
  assert.ok(of(seen, "bossSay").some((e) => e.text === "Billet, s'il vous plaît.") && of(seen, "think").some((e) => e.text === "Mobile ticket failed."));
  assert.ok(h.x < coachX(13), "the door holds him");
  assert.equal(hitBoss(c, "bonk", g.events), false, "not while he winds up");
  Object.assign(h, { patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.patience < 2, 1); assert.equal(h.patience, 1);
  until(g, (x) => x.world.boss.state === "rest", 1); assert.equal(hitBoss(c, "bonk", g.events), false, "a punch that lands never staggers him");
  // The punch threw him back: up to the door again.
  Object.assign(h, { invuln: 9 }); until(g, (x) => x.world.boss.state === "windup", 3, { right: true });
  const st = dodge(g); assert.deepEqual([of(st, "bossStagger").length, h.patience, hitBoss(c, "bonk", g.events)], [1, 1, true]);
});
test("a jump over the punch, or stepping out of its reach, misses too; a punch in his grace still lands", () => {
  const over = train(); play(over); over.run.stretch = null; const h = over.world.hero; Object.assign(h, { x: coachX(13) - 120, y: 0, onGround: true, invuln: 0 });
  until(over, (x) => x.world.boss.state === "windup" && x.world.boss.timer < 0.12, 3);
  over.step(input({ jump: true }, { jump: true }));
  const st = until(over, (x) => x.world.boss.state === "stagger" || x.world.boss.state === "rest", 1, { jump: true });
  assert.equal(over.world.boss.state, "stagger", "over it");
  assert.equal(of(st, "hurt").length, 0);
  const back = train(); play(back); back.run.stretch = null; const k = back.world.hero; Object.assign(k, { x: coachX(13) - 120, y: 0, onGround: true, invuln: 0 });
  until(back, (x) => x.world.boss.state === "windup", 3);
  Object.assign(k, { x: coachX(13) - 400 });
  until(back, (x) => x.world.boss.state === "stagger" || x.world.boss.state === "rest", 1);
  assert.equal(back.world.boss.state, "stagger", "out of reach");
  const grace = train(); play(grace); grace.run.stretch = null; const g = grace.world.hero; Object.assign(g, { x: coachX(13) - 120, y: 0, onGround: true, invuln: 9 });
  until(grace, (x) => x.world.boss.state === "windup", 3);
  until(grace, (x) => x.world.boss.state === "stagger" || x.world.boss.state === "rest", 1.5);
  assert.equal(grace.world.boss.state, "rest", "standing there is no miss, whatever his grace");
});
test("three hits at a door send him back a coach and open it; a won door stays open across a lost life; he is quicker at each door; the ninth hit is the win", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null; const c = g.world.boss;
  // Boarded, for the checkpoint he comes back to.
  g.run.checkpoint = "board";
  Object.assign(h, { x: coachX(13) - 120, y: 0, invuln: 99 });
  const hitInStagger = (n) => { for (let i = 0; i < n; i++) { until(g, (x) => x.world.boss.state === "windup", 6); dodge(g); assert.equal(hitBoss(c, "bonk", g.events), true); if (i < n - 1) until(g, (x) => x.world.boss.hurtT <= 0 && x.world.boss.state !== "hurt", 2); } };
  hitInStagger(3); const r = until(g, (x) => x.world.boss.door === 1, 3); assert.deepEqual([of(r, "doorOpen")[0].door, c.hp, conductorWall(c).x], [0, 6, coachX(7) - 12]);
  until(g, () => false, 1, { right: true }); assert.ok(h.x > coachX(13));
  Object.assign(h, { invuln: 0, patience: 1 }); g.world.hit(h.x + 100); until(g, (x) => of(x.events, "respawn").length > 0, 4);
  assert.deepEqual([g.world.boss.door, g.world.boss.hp, conductorWall(g.world.boss).x], [1, 6, coachX(7) - 12]);
  assert.deepEqual([CONDUCTOR.windup, CONDUCTOR.stagger], [[0.4, 0.3, 0.2], [0.8, 0.6, 0.45]]);
  const d = g.world.boss;
  const again = (n) => { for (let i = 0; i < n; i++) { until(g, (x) => x.world.boss.state === "windup", 6); dodge(g); assert.equal(hitBoss(d, "bonk", g.events), true); if (i < n - 1) until(g, (x) => x.world.boss.hurtT <= 0 && x.world.boss.state !== "hurt", 2); } };
  Object.assign(h, { x: coachX(7) - 120, y: 0, invuln: 99 }); again(3); until(g, (x) => x.world.boss.door === 2, 3);
  Object.assign(h, { x: coachX(2) - 120, y: 0, invuln: 99 }); again(3); const win = until(g, (x) => x.world.boss.state === "down", 3); assert.deepEqual([of(win, "bossDown")[0].points, d.door, conductorWall(d)], [0, 3, null], "the 1,000 came with the ninth hit");
  assert.equal(g.run.bossDoors, 3);
});
test("Try again after Hammer down at the second door puts him back at the first", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null; g.run.checkpoint = "board";
  g.dev.bossDoor(1);
  assert.deepEqual([g.world.boss.door, g.world.boss.hp], [1, 6]);
  for (let i = 0; i < 40000 && g.mode !== "over"; i++) { if (g.mode === "play") knockOut(g); g.step(input()); }
  g.newRun(81, g.venue, { snapshot: g.snapshot }); play(g);
  assert.deepEqual([g.world.boss.door, g.world.boss.hp, g.run.bossDoors, g.run.stretch, h.x], [0, 9, 0, 120, 150]);
});
test("the level cannot end at the seat while a door stands", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null;
  g.dev.bossDoor(2);
  Object.assign(h, { x: coachX(1) + 550, y: 0 });
  const evs = until(g, () => false, 1.2, { right: true });
  assert.deepEqual([of(evs, "sit").length, g.mode], [0, "play"]);
});
test("a lecture in the quiet car brings him at once, only before his first round", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null; Object.assign(h, { x: coachX(14) + 200, y: 0, onGround: true });
  const evs = until(g, (x) => of(x.events, "summon").length > 0, 1, {}, (x) => x.step(input({}, { lecture: true })));
  assert.deepEqual([evs.length > 0, g.world.boss.state, g.world.boss.x, of(evs, "bossSay").some((e) => e.text === "This is the quiet car.")], [true, "block", h.x + 300, true]);
  assert.equal(conductorWall(g.world.boss).x, coachX(13) - 12, "the wall stays at his door");
  const later = train(); play(later); const k = later.world.hero; later.run.stretch = null; later.dev.bossDoor(1); Object.assign(k, { x: coachX(14) + 200, y: 0, onGround: true });
  const none = until(later, () => false, 1, {}, (x) => x.step(input({}, { lecture: true })));
  assert.equal(of(none, "summon").length, 0);
});
test("the scripted rider beats the conductor at all three doors and takes his seat; a masher who never jumps never lands a hit and is finished", () => {
  const g = train(); play(g); g.run.stretch = null; Object.assign(g.world.hero, { x: 4100 }); let t = 0; while (!["walkoff", "tally", "over"].includes(g.mode) && t < 410) { g.step(drive(g.level, g.world.hero, "train", g.world)); t += STEP; }
  assert.deepEqual([g.world.boss.door, g.mode, g.run.lives >= 1], [3, "walkoff", true]);
  const m = train(); play(m); m.run.stretch = null; Object.assign(m.world.hero, { x: coachX(13) - 300 }); until(m, (x) => x.mode === "over", 420, { hammer: true, right: true }); assert.deepEqual([m.mode, m.world.boss.hp], ["over", 9]);
});

test("the camera stops at the hall's first wall and the end of coach 1: nothing past the rooms shows", () => {
  const rooms = TRAIN.rooms;
  assert.deepEqual([TRAIN.bounds.x, TRAIN.bounds.x + TRAIN.bounds.w], [rooms[0].x0, rooms[rooms.length - 1].x1]);
});

test("Hammer down from the station's clock, then Try again: the level's own card, not the train leaving", () => {
  const g = train(); play(g);
  for (let i = 0; i < 80000 && g.mode !== "over"; i++) { if (g.mode === "play" && g.run.stretch > 1) g.dev.stretch(0.5); g.step(input()); }
  assert.equal(g.mode, "over");
  g.newRun(81, g.venue, { snapshot: g.snapshot });
  assert.deepEqual([hudOf(g).card, hudOf(g).told], [TRAIN.card, false]);
});
test("the stroller never reaches through the second door's wall", () => {
  const st = TRAIN.movers.find((m) => m.id === "stroller");
  const wall = coachX(7) - 12;
  assert.ok(st.x0 - st.w / 2 > wall + 24, `the stroller's reach ${st.x0 - st.w / 2} against the door ${wall}`);
  const g = train(); play(g); g.run.stretch = null; g.dev.bossDoor(1);
  Object.assign(g.world.hero, { x: coachX(7) - 42, y: 0, onGround: true, patience: 2 });
  // Pressed against the door, down the whole time: every punch misses, so nothing here may touch him.
  const evs = until(g, () => false, 40, { right: true, down: true });
  assert.equal(of(evs, "hurt").length, 0);
});
test("a knockdown just after the third hit keeps the door: he saw him turn to go", () => {
  for (const wait of [0, 0.3, 0.6]) {
    const g = train(); play(g); const h = g.world.hero; g.run.stretch = null; g.run.checkpoint = "board"; const c = g.world.boss;
    Object.assign(h, { x: coachX(13) - 120, y: 0, invuln: 99 });
    for (let i = 0; i < 3; i++) { until(g, (x) => x.world.boss.state === "windup", 6); dodge(g); assert.equal(hitBoss(c, "bonk", g.events), true); if (i < 2) until(g, (x) => x.world.boss.hurtT <= 0 && x.world.boss.state !== "hurt", 2); }
    until(g, () => false, wait);
    Object.assign(h, { invuln: 0, patience: 1 });
    g.world.hit(h.x + 100);
    until(g, (x) => of(x.events, "respawn").length > 0, 5);
    assert.deepEqual([g.run.bossDoors, g.world.boss.door, g.world.boss.hp], [1, 1, 6], `${wait} s after the third hit`);
  }
});
test("the ninth hit pays the 1,000 as it lands, and a knockdown in his walk away keeps them", () => {
  const g = train(); play(g); const h = g.world.hero; g.run.stretch = null;
  g.run.checkpoint = "board"; g.dev.bossDoor(2);
  Object.assign(h, { x: coachX(2) - 300, y: 0, invuln: 99 });
  const evs = []; const s = g.run.score;
  for (let i = 0; i < 2400 && g.world.boss.state !== "retreat"; i++) { g.step(drive(g.level, h, "train", g.world)); evs.push(...g.events); }
  assert.deepEqual([g.world.boss.state, of(evs, "bossHit").map((e) => e.points ?? 0)], ["retreat", [0, 0, 1000]]);
  assert.ok(g.run.score - s >= 1000, `paid ${g.run.score - s}`);
  const paid = g.run.score; Object.assign(h, { invuln: 0, patience: 1 }); g.world.hit(h.x + 100);
  const down = until(g, (x) => of(x.events, "respawn").length > 0, 4);
  assert.deepEqual([g.run.score >= paid, of(down, "bossDown").length, g.world.boss.state], [true, 0, "down"]);
});
