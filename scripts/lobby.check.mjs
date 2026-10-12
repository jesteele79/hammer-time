import test from "node:test";
import assert from "node:assert/strict";
import { rewardAnchors, stageOf, ANCHOR_STEP } from "../src/sim/level.ts";
import { seedRewards, seededRandom } from "../src/sim/rewards.ts";
import { floorAt } from "../src/sim/physics.ts";

/** A small level for the rules: a floor with a gap, a desk, a pass, a shelf, a door. */
const mini = () => ({
  id: "lobby", name: "Mini", world: "1-1", length: 6000, spawn: { x: 200, y: 0 }, time: 420,
  floor: [{ x0: -400, x1: 2500, y0: 0, y1: 0, kind: "marble" }, { x0: 2830, x1: 6400, y0: 0, y1: 0, kind: "marble" }],
  platforms: [{ x0: 4000, x1: 4600, y: -300, kind: "shelf" }],
  solids: [{ x: 1000, y: -180, w: 600, h: 180 }],
  passes: [{ x: 3500, y: -1000, w: 400, h: 780 }],
  bounds: { x: -400, y: -1600, w: 6800, h: 2200 },
  crates: [{ id: "c1", kind: "pepper", x: 760, y: -435 }],
  doors: [{ id: "d1", kind: "stash", x: 5200, y: 0, label: "STAFF ONLY" }],
  checkpoints: [{ id: "k1", x: 3000, y: 0 }],
  signs: [], furniture: [], carts: [5600], lights: [], camera: { zones: [] },
  rewards: { count: 12, bucees: 3, nuts: 7 }, routes: [], music: "day",
});

test("reward anchors stand on floors and shelves, never in a gap, a solid, a door's doorway or on a cart", () => {
  const level = mini();
  const anchors = rewardAnchors(level);
  const stage = stageOf(level);
  assert.ok(anchors.length >= 12);
  for (const a of anchors) {
    const onShelf = level.platforms.some((p) => a.x >= p.x0 && a.x <= p.x1 && Math.abs(a.y - (p.y - 70)) < 1e-9);
    const f = floorAt(stage, a.x, -Infinity);
    assert.ok(onShelf || (f !== null && Math.abs(a.y - (f - 70)) < 1e-9), `anchor ${JSON.stringify(a)} floats`);
    assert.ok(!(a.x > 2500 && a.x < 2830), `anchor over the gap at ${a.x}`);
    assert.ok(!(a.x > 1000 && a.x < 1600 && a.y > -180), `anchor inside the desk at ${a.x}`);
    assert.ok(Math.abs(a.x - 5200) > 150 && Math.abs(a.x - 5600) > 150, `anchor at a door or a cart: ${a.x}`);
  }
  const xs = anchors.filter((a) => a.y === -70).map((a) => a.x).sort((p, q) => p - q);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= ANCHOR_STEP - 1e-9, "anchors are spread");
});

test("the seeding places the level's count: its Buc-ee's and nuts first, the rest cans, the same every time for a seed", () => {
  const level = mini();
  for (let seed = 1; seed <= 24; seed++) {
    const a = seedRewards(level, seed);
    assert.equal(a.length, 12);
    const kinds = (k) => a.filter((p) => p.kind === k).length;
    assert.deepEqual([kinds("bucees"), kinds("nuts"), kinds("can")], [3, 7, 2], `seed ${seed}`);
    assert.deepEqual(seedRewards(level, seed), a, "deterministic");
  }
  const one = JSON.stringify(seedRewards(level, 1).map((p) => [p.x, p.kind]));
  const two = JSON.stringify(seedRewards(level, 2).map((p) => [p.x, p.kind]));
  assert.notEqual(one, two, "a new run lays them out differently");
  const r = seededRandom(0xc0ffee);
  assert.ok(Math.abs(r() - seededRandom(0xc0ffee)()) < 1e-12);
});

test("every route gets a can, nuts and a Buc-ee's, whatever the seed", () => {
  const level = { ...mini(), routes: [{ id: "shelf", x0: 4000, x1: 4600, y0: -400, y1: -300 }, { id: "floor", x0: 500, x1: 2500, y0: -100, y1: 0 }] };
  for (let seed = 1; seed <= 24; seed++) {
    const p = seedRewards(level, seed);
    assert.equal(p.length, 12);
    for (const r of level.routes)
      for (const kind of ["can", "nuts", "bucees"])
        assert.ok(p.some((q) => q.kind === kind && q.x >= r.x0 && q.x <= r.x1 && q.y >= r.y0 && q.y <= r.y1), `seed ${seed}: ${kind} on the ${r.id}`);
    const kinds = (k) => p.filter((q) => q.kind === k).length;
    assert.deepEqual([kinds("bucees"), kinds("nuts"), kinds("can")], [3, 7, 2], "the totals still hold");
  }
});

import { CRATE, cratesOf, crateSolids, hitCrate } from "../src/sim/crates.ts";
import { collectPickups, stepPickups } from "../src/sim/rewards.ts";
import { createWorld } from "../src/sim/world.ts";
import { STEP } from "../src/sim/constants.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const ctxOf = (o = {}) => ({ patience: 2, star: false, hot: false, ...o });
const out = () => { let n = 100; return { pickups: [], events: [], nextId: () => ++n }; };

test("a pepper crate opens once and lets out a pepper, or nuts when he is already hot", () => {
  const [c] = cratesOf(mini());
  const o = out();
  hitCrate(c, "bump", ctxOf(), o);
  hitCrate(c, "mallet", ctxOf(), o);
  assert.equal(o.pickups.length, 1, "once, however it is hit");
  assert.equal(o.pickups[0].kind, "pepper");
  assert.ok(c.used && !c.broken);
  const [h] = cratesOf(mini());
  const p = out();
  hitCrate(h, "bump", ctxOf({ hot: true, patience: 3 }), p);
  assert.equal(p.pickups[0].kind, "nuts");
});

test("a delivery case pays a can per hit, one per 0.16 s, five at most, and breaks under the mallet", () => {
  const level = { ...mini(), crates: [{ id: "k", kind: "case", x: 900, y: 0 }] };
  const [c] = cratesOf(level);
  const o = out();
  hitCrate(c, "bump", ctxOf({ patience: 1 }), o);
  hitCrate(c, "bump", ctxOf({ patience: 1 }), o);
  assert.equal(o.events.filter((e) => e.type === "canPop").length, 1, "locked for 0.16 s");
  for (let i = 0; i < 10; i++) {
    c.lock = 0;
    hitCrate(c, "bump", ctxOf({ patience: 1 }), o);
  }
  assert.equal(o.events.filter((e) => e.type === "canPop").length, CRATE.caseCans);
  assert.ok(c.broken, "spent after five");
  const [m] = cratesOf(level);
  const q = out();
  hitCrate(m, "mallet", ctxOf({ patience: 1 }), q);
  assert.ok(m.broken && q.events.some((e) => e.type === "caseBreak"));
});

test("an emerging pepper rises, slides off and is his when he touches it", () => {
  const open = { ...mini(), solids: [] };
  const crates = cratesOf(open);
  const [c] = crates;
  const o = out();
  hitCrate(c, "bump", ctxOf(), o);
  const stage = stageOf(open, crateSolids(crates));
  const p = o.pickups[0];
  const y0 = p.y;
  for (let i = 0; i < 30; i++) stepPickups(o.pickups, stage, 1 / 120);
  assert.ok(p.y < y0 - 30, "rising out of the crate");
  for (let i = 0; i < 240; i++) stepPickups(o.pickups, stage, 1 / 120);
  assert.ok(Math.abs(p.x - c.x) > 300 && p.body.onGround, `slid off and landed: ${p.x}`);
  const hero = { x: p.x, y: p.y + 40, w: 110, h: 300 };
  const evs = [];
  assert.deepEqual(collectPickups(hero, o.pickups, evs), ["pepper"]);
  assert.ok(p.taken && evs.some((e) => e.type === "pickup" && e.kind === "pepper"));
  assert.deepEqual(collectPickups(hero, o.pickups, []), [], "taken once");
});

test("the world reports this step's mallet path in front of him, for crates and the bell", () => {
  const w = createWorld(stageOf(mini()), { x: 100, y: 0 });
  for (let i = 0; i < 6; i++) w.step(input());
  w.step(input({ hammer: true }, { hammer: true }));
  let seen = 0;
  for (let i = 0; i < 60; i++) {
    w.step(input());
    if (w.swing.length) seen++;
    for (const p of w.swing) assert.ok(p.x > w.hero.x, "only in front");
  }
  assert.ok(seen > 5, `the path shows through the strike: ${seen} steps`);
});

import { createGame } from "../src/sim/game.ts";
import { RUN } from "../src/sim/run.ts";

const stashOf = () => ({ ...mini(), id: "stash", name: "Stash", length: 2400, time: 0, doors: [{ id: "back", kind: "return", x: 300, y: 0, label: "BACK" }], checkpoints: [], carts: [], crates: [], spawn: { x: 600, y: 0 }, rewards: { count: 4, bucees: 1, nuts: 1 }, music: "cellar", floor: [{ x0: -200, x1: 2600, y0: 0, y1: 0, kind: "marble" }], solids: [], passes: [], platforms: [] });
const play = (g) => { while (g.mode === "card") g.step(input()); };
const stepsG = (g, seconds, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
/** Steps until `done(g)` (or the time runs out) and returns every event on the way. */
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const knockOut = (g) => { g.world.hero.patience = 1; g.world.hit(g.world.hero.x + 100); };

test("a run starts on a card with three lives, two pips, no cans and the full clock", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  assert.equal(g.mode, "card");
  play(g);
  assert.equal(g.mode, "play");
  assert.deepEqual([g.run.lives, g.run.cans, g.run.score, g.world.hero.patience], [3, 0, 0, RUN.patience]);
  assert.ok(Math.abs(g.run.time - 420) < 0.01);
  stepsG(g, 2);
  assert.ok(Math.abs(g.run.time - 418) < 0.05, `the clock runs: ${g.run.time}`);
});

test("cans score 200 and cool him 10; the 100th is a life; nuts charge 3; Buc-ee's is ten seconds of nothing touching him", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  const h = g.world.hero;
  h.heat = 50;
  g.run.cans = 99;
  g.pickups.push({ id: 900, kind: "can", x: h.x, y: h.y - 100, taken: false });
  const evs = stepsG(g, STEP);
  assert.deepEqual([g.run.cans, g.run.lives], [0, 4]);
  assert.ok(evs.some((e) => e.type === "oneUp"));
  assert.ok(Math.abs(h.heat - 40) < 0.2 && g.run.score >= 200);
  g.pickups.push({ id: 901, kind: "nuts", x: h.x, y: h.y - 100, taken: false }, { id: 902, kind: "bucees", x: h.x, y: h.y - 100, taken: false });
  stepsG(g, STEP);
  assert.equal(h.charge, 3);
  assert.ok(g.run.star > 9.9);
  g.world.hit(h.x + 100);
  stepsG(g, STEP);
  assert.equal(h.patience, RUN.patience, "the boost ignores a hit");
});

test("the pepper makes him hot with three pips", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  const h = g.world.hero;
  g.pickups.push({ id: 903, kind: "pepper", x: h.x, y: h.y - 100, taken: false });
  stepsG(g, STEP);
  assert.deepEqual([h.patience, h.hot], [3, true]);
});

test("a punch clock saves where he comes back; the last pip, the shaft and the clock each cost one life, once", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  g.world.hero.x = 3050;
  const evs = stepsG(g, 0.1);
  assert.ok(evs.some((e) => e.type === "checkpoint" && e.id === "k1"));
  // The last pip, well clear of the gap behind him: knocked flat, he lies, the run counts one life.
  g.world.hero.x = 3400;
  knockOut(g);
  const down = until(g, (x) => x.mode === "card");
  assert.ok(down.some((e) => e.type === "tumble"));
  assert.equal(down.filter((e) => e.type === "lifeLost").length, 1);
  assert.equal(g.run.lives, 2);
  play(g);
  assert.ok(Math.abs(g.world.hero.x - 3000) < 1 && g.world.hero.onGround, `back at the clock: ${g.world.hero.x}`);
  assert.equal(g.world.hero.patience, RUN.patience);
  assert.ok(Math.abs(g.run.time - 420) < 1e-9, "a full clock");
  // The shaft (the gap at 2500..2830), while still in respawn grace.
  assert.ok(g.world.hero.invuln > 0);
  g.world.hero.x = 2665;
  g.world.hero.y = -10;
  const fall = until(g, (x) => x.mode === "card");
  assert.equal(fall.filter((e) => e.type === "lifeLost").length, 1, "a fall counts once, grace or not");
  assert.equal(g.run.lives, 1);
  play(g);
  // The clock.
  g.run.time = 0.01;
  const late = until(g, (x) => x.mode === "over" || x.mode === "card");
  assert.ok(late.some((e) => e.type === "timeOut"));
  assert.equal(g.mode, "over");
  assert.equal(g.run.lives, 0);
});

test("the clock running out during a lethal knockdown still costs one life", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  knockOut(g);
  g.run.time = 0.05;
  const evs = until(g, (x) => x.mode === "card" || x.mode === "over");
  assert.equal(evs.filter((e) => e.type === "lifeLost").length, 1);
  assert.equal(g.run.lives, 2);
});

test("nothing is collected and the clock stops while he is dying", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  const h = g.world.hero;
  knockOut(g);
  until(g, (x) => x.mode === "dying");
  assert.equal(g.mode, "dying");
  const t = g.run.time;
  g.pickups.push({ id: 904, kind: "can", x: h.x, y: h.y - 100, taken: false });
  stepsG(g, 0.5);
  assert.equal(g.run.cans, 0, "no pickup while dying");
  assert.ok(Math.abs(g.run.time - t) < 1e-9, "the clock stands still");
});

test("respawn brings the level's pickups and crates back as the run laid them out", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  const layout = JSON.stringify(g.pickups.map((p) => [p.kind, p.x, p.y]));
  g.pickups.forEach((p) => (p.taken = true));
  g.crates[0].used = true;
  knockOut(g);
  until(g, (x) => x.mode === "card");
  play(g);
  assert.equal(JSON.stringify(g.pickups.map((p) => [p.kind, p.x, p.y])), layout);
  assert.ok(g.pickups.every((p) => !p.taken) && !g.crates[0].used);
});

test("pause stops the clock and the world; it comes back where it was", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  g.togglePause();
  assert.equal(g.mode, "pause");
  const before = [g.run.time, g.world.hero.x];
  stepsG(g, 1, { right: true });
  assert.deepEqual([g.run.time, g.world.hero.x], before);
  g.togglePause();
  assert.equal(g.mode, "play");
});

test("a head bump opens the crate above him once, and its pepper is his to catch", () => {
  const g = createGame({ lobby: { ...mini(), solids: [] }, stash: stashOf() }, 7);
  play(g);
  g.world.hero.x = 760;
  stepsG(g, 0.1);
  g.step(input({ jump: true }, { jump: true }));
  const evs = [...g.events, ...stepsG(g, 0.8, { jump: true })];
  assert.equal(evs.filter((e) => e.type === "crate").length, 1);
  assert.ok(g.crates[0].used);
  const got = until(g, (x) => x.world.hero.hot, 4, { right: true });
  assert.ok(got.some((e) => e.type === "pickup" && e.kind === "pepper"), "he catches the pepper");
});

test("↓ at the staff door goes to the stash; ↓ at its cart comes back to the lobby as he left it", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  g.pickups[0].taken = true;
  const takenId = g.pickups[0].id;
  g.crates[0].used = true;
  g.world.hero.x = 5200;
  stepsG(g, 0.1);
  const t = g.run.time;
  const into = stepsG(g, 0.1, { down: true });
  assert.ok(into.some((e) => e.type === "door" && e.kind === "stash"));
  assert.equal(g.level.id, "stash");
  assert.equal(g.pickups.length, 4, "the stash's own pickups");
  stepsG(g, 3);
  assert.ok(Math.abs(g.run.time - t) < 0.02, "the stash's clock never ticks");
  g.world.hero.x = 300;
  stepsG(g, 0.1);
  stepsG(g, 0.1, { down: true });
  assert.equal(g.level.id, "lobby");
  assert.ok(Math.abs(g.world.hero.x - 5200) < 1, "standing at the staff door");
  assert.ok(g.pickups.find((p) => p.id === takenId).taken, "what he took stays taken");
  assert.ok(g.crates[0].used, "an opened crate stays open");
  g.world.hero.x = 5200;
  stepsG(g, 0.5);
  stepsG(g, 0.1, { down: true });
  assert.equal(g.pickups.filter((p) => !p.taken).length, 4, "the stash restocks every visit");
});

test("a closed door does nothing; the exit walks him in, counts the clock into points and clears the lobby", () => {
  const level = { ...mini(), doors: [{ id: "buffet", kind: "closed", x: 1800, y: 0, label: "BUFFET", opens: "Hungry Hungry Hammer" }, { id: "out", kind: "exit", x: 5900, y: 0, label: "CLOCK OUT" }] };
  const g = createGame({ lobby: level, stash: stashOf() }, 7);
  play(g);
  g.world.hero.x = 1800;
  stepsG(g, 0.1);
  stepsG(g, 0.2, { down: true });
  assert.equal(g.level.id, "lobby");
  g.world.hero.x = 5700;
  g.run.time = 100.5;
  const before = g.run.score;
  const evs = until(g, (x) => x.mode === "walkoff", 3, { right: true });
  assert.ok(evs.some((e) => e.type === "exit"));
  const [cans, lives] = [g.run.cans, g.run.lives];
  g.pickups.push({ id: 905, kind: "can", x: g.world.hero.x, y: g.world.hero.y - 100, taken: false });
  const rest = until(g, (x) => x.mode === "clear", 8, { right: true });
  assert.ok(rest.some((e) => e.type === "clear"));
  assert.equal(g.mode, "clear");
  assert.deepEqual([g.run.cans, g.run.lives], [cans, lives], "nothing is picked up after the exit");
  assert.equal(g.run.score - before, 100 * 50, "fifty a second");
  assert.equal(g.run.time, 0);
});

test("dying in the stash brings him back to the lobby at his last punch clock", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  g.world.hero.x = 3050;
  stepsG(g, 0.1);
  g.world.hero.x = 5200;
  stepsG(g, 0.5);
  stepsG(g, 0.1, { down: true });
  assert.equal(g.level.id, "stash");
  knockOut(g);
  const evs = until(g, (x) => x.mode === "card");
  assert.equal(evs.filter((e) => e.type === "lifeLost").length, 1);
  play(g);
  assert.equal(g.level.id, "lobby");
  assert.ok(Math.abs(g.world.hero.x - 3000) < 1, `at the clock: ${g.world.hero.x}`);
  assert.ok(Math.abs(g.run.time - 420) < 1e-9);
});
