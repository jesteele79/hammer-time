// The fourteenth floor (story spec §8.3): the sim with a lateral axis: W forward, S back without turning, A and D sidestep;
// what counts only within reach sideways; the carts across the hall, the doors that swing, the puddle, the key that fails
// three times, the scripted player.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { HALLWAY } from "../src/sim/levels/hallway.ts";
import { drive } from "../src/sim/drive.ts";
import { hudOf } from "../src/render/hud.ts";
import { KEY_BINDINGS } from "../src/sim/input.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const hall = (opts = {}, cast = false) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 41, { cast, title: true }); g.newRun(41, 0, { shift: [HALLWAY], journey: true, ...opts }); return g; };

test("the hall is 80 m long and 3 m wide: W walks him forward, S back without turning, A and D step him within 1.1 m of the middle", () => {
  assert.deepEqual([HALLWAY.id, HALLWAY.world, HALLWAY.length, HALLWAY.hall, HALLWAY.time], ["hallway", "2-3", 8000, { width: 3, keep: 0.4 }, 300]);
  const g = hall();
  play(g);
  const h = g.world.hero;
  until(g, () => false, 1, { up: true });
  assert.ok(h.x > 150 && h.facing === 1, `${h.x} ${h.facing}`);
  const x = h.x;
  until(g, () => false, 0.5, { down: true });
  assert.ok(h.x < x && h.facing === 1 && h.slideT === 0, `${h.x} ${h.facing} ${h.slideT}`);
  until(g, () => false, 1, { left: true });
  assert.ok(h.lx < -0.5 && h.lx >= -1.1, `${h.lx}`);
  until(g, () => false, 3, { right: true });
  assert.equal(h.lx, 1.1);
});
test("W and the up arrow are their own action; held through the card W is not a step on the level's first frame; up jumps in a 2D level", () => {
  assert.deepEqual([KEY_BINDINGS.KeyW, KEY_BINDINGS.ArrowUp, KEY_BINDINGS.Space], ["up", "up", "jump"]);
  const g = hall();
  while (g.mode === "card") g.step(input({ up: true }));
  const x = g.world.hero.x;
  g.step(input({ up: true }));
  assert.equal(g.world.hero.x, x);
  until(g, () => false, 0.2);
  until(g, () => false, 0.2, { up: true });
  assert.ok(g.world.hero.x > x, "let go and pressed again, he walks");
  const l = createGame({ lobby: LOBBY, stash: STASH }, 1, { cast: false, title: true });
  l.newRun(1);
  play(l);
  l.step(input({ up: true }, { up: true }));
  assert.ok(!l.world.hero.onGround || l.world.hero.vy < 0, "a jump");
});
test("the mallet, the snot and the pickups only count within 0.6 m sideways; a cart across the hall hurts only in his lane", () => {
  const g = hall({}, true);
  play(g);
  const h = g.world.hero;
  Object.assign(h, { x: 1400, lx: 1.0, onGround: true });
  const n = g.world.cast.find((c) => c.spawn === "guest-1");
  Object.assign(n, { x: 1630, lx: -1.0, act: "idle", actT: 0 });
  g.step(input({}, { hammer: true }));
  until(g, () => false, 0.6);
  assert.notEqual(n.act, "down", "too far to the side");
  assert.equal(n.hits, 0);
  h.move = null;
  Object.assign(n, { x: 1630, lx: 0.8 });
  g.step(input({}, { hammer: true }));
  until(g, () => n.hits > 0, 0.8);
  assert.ok(n.hits > 0, "in his lane");
  const p = g.pickups.find((q) => !q.taken);
  Object.assign(h, { x: p.x, y: p.y, lx: p.lx + 0.9, onGround: true });
  g.step(input());
  assert.equal(p.taken, false, "the pickup is out of reach sideways");
  h.lx = p.lx;
  g.step(input());
  assert.equal(p.taken, true);
  Object.assign(h, { x: 1200, lx: -1.0, y: 0, onGround: true, patience: 2, invuln: 0, vx: 0 });
  until(g, (x) => x.world.hallCarts.some((c) => c.live && c.z === 12), 8);
  const c = g.world.hallCarts.find((q) => q.live && q.z === 12);
  until(g, () => Math.abs(c.lx - h.lx) < 0.3 && Math.abs(c.z * 100 - h.x) < 60, 4);
  until(g, () => h.patience === 1, 0.5);
  assert.equal(h.patience, 1);
});
test("a door swings open ahead after its handle turns and stops him for 1.5 s; the key fails twice and opens on the third swing, then the level ends", () => {
  const g = hall();
  play(g);
  const h = g.world.hero;
  Object.assign(h, { x: 850, lx: 0.8, onGround: true });
  const evs = until(g, (x) => of(x.events, "hallDoor").some((e) => e.phase === "open"), 30);
  assert.ok(evs.some((e) => e.type === "hallDoor" && e.phase === "handle"));
  until(g, () => false, 0.5, { up: true });
  assert.ok(h.x < 900, `stopped by the door at ${h.x}`);
  Object.assign(h, { x: 7850, lx: 0, onGround: true, move: null });
  const fails = [];
  for (let i = 0; i < 3; i++) {
    g.step(input({}, { hammer: true }));
    fails.push(...until(g, (x) => x.mode !== "play", 0.8));
  }
  assert.deepEqual(of(fails, "keyFail").map((e) => e.n), [1, 2]);
  assert.deepEqual([of(fails, "keyOpen").length, g.mode], [1, "walkoff"]);
  assert.deepEqual(of(fails, "think").map((e) => e.text), ["Mobile key failed.", "Mobile key failed AGAIN.", "Elite members don't wait."]);
});
test("a door's leaf only stops him on its own side of the hall", () => {
  const g = hall();
  play(g);
  const h = g.world.hero;
  Object.assign(h, { x: 850, lx: -0.8, onGround: true });
  until(g, (x) => of(x.events, "hallDoor").some((e) => e.phase === "open"), 30);
  until(g, () => false, 0.5, { up: true, run: true });
  assert.ok(h.x > 950, `past it on the far side at ${h.x}`);
});
test("the puddle at the alcove slips him once, and he is past it", () => {
  const g = hall();
  play(g);
  const h = g.world.hero;
  Object.assign(h, { x: 2700, lx: 0, onGround: true });
  const evs = until(g, () => h.x > 3150, 8, { up: true });
  assert.ok(h.x > 3150, `at ${h.x}`);
  assert.equal(of(evs, "slip").length, 1);
});
test("the hall's hints say its own keys", () => {
  const g = hall();
  play(g);
  assert.match(hudOf(g, false, false, null).hint, /W forward · A D sidestep/);
});
test("the hall's thoughts, its punch clock at the lobby and a cast that keeps to him when it attacks", () => {
  const g = hall({}, true);
  play(g);
  assert.deepEqual(HALLWAY.checkpoints.map((c) => c.id), ["elevators"]);
  assert.deepEqual(HALLWAY.thoughts.map((t) => t.x), [600, 3000, 5000]);
  const n = g.world.cast.find((c) => c.spawn === "guest-1");
  const h = g.world.hero;
  Object.assign(h, { x: n.x - 300, lx: 1.0, onGround: true });
  n.lx = -1.0;
  until(g, () => Math.abs(n.lx - h.lx) <= 0.4 || !n.alive, 4);
  assert.ok(Math.abs(n.lx - h.lx) <= 0.4, `${n.lx} against ${h.lx}`);
});
test("the scripted player walks the hall to 1417, sidestepping and jumping the carts, and opens the door", () => {
  const g = hall({}, true);
  play(g);
  let t = 0;
  while (g.mode === "play" && t < 200) {
    g.step(drive(g.level, g.world.hero, "hall", g.world));
    t += STEP;
  }
  assert.deepEqual([g.mode, g.run.lives >= 2, g.run.punched], ["walkoff", true, ["elevators"]]);
});
