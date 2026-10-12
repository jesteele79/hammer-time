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
