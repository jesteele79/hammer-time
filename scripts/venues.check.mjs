import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { createCast, CAST } from "../src/sim/cast.ts";
import { createCart } from "../src/sim/targets.ts";
import { createSwingDoors, stepSwingDoors, SWING } from "../src/sim/hazards.ts";
import { HEAT } from "../src/sim/moves.ts";
import { pitsOf, stageOf } from "../src/sim/level.ts";
import { createGame } from "../src/sim/game.ts";
import { hintOf } from "../src/render/hud.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = (extra = {}) => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 }, ...extra });
const worldWith = (spawns, hero = { x: 100, y: 0 }, opts = {}, carts = [], stage = flat()) => {
  const targets = carts.map((x, i) => createCart(i + 1, x));
  const w = createWorld(stage, hero, { ...opts, targets });
  w.cast = createCast({ cast: spawns, carts }, targets);
  for (let i = 0; i < 6; i++) w.step(input());
  return w;
};
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const of = (evs, type) => evs.filter((e) => e.type === type);
const npc = (w, spawn) => w.cast.find((n) => n.spawn === spawn);
/** A level shaped like the lobby's tests' mini level, for the Game. */
const levelOf = (extra = {}) => ({
  id: "restaurant", name: "Mini", world: "1-2", length: 6000, spawn: { x: 200, y: 0 }, time: 420,
  floor: [{ x0: -400, x1: 6400, y0: 0, y1: 0, kind: "quarry" }], platforms: [], solids: [], passes: [],
  bounds: { x: -400, y: -1600, w: 6800, h: 2200 }, crates: [], doors: [{ id: "out", kind: "exit", x: 5900, y: 0, label: "OUT" }],
  checkpoints: [], signs: [], furniture: [], carts: [], lights: [], camera: { zones: [] }, rewards: { count: 4, bucees: 1, nuts: 1 }, routes: [], music: "day",
  ...extra,
});

test("a flat-top heats him while he stands on it and the freezer cools him; beside them or in the air, nothing", () => {
  const heat = [{ x0: 1000, x1: 1400, y: -180, rate: 20, kind: "flattop" }, { x0: 2000, x1: 2500, y: 0, rate: -30, kind: "freezer" }];
  const w = createWorld(flat({ platforms: [{ x0: 900, x1: 1500, y: -180 }], heat }), { x: 1200, y: -180 });
  const on = steps(w, 0.2);
  assert.deepEqual(of(on, "heatZone").map((e) => e.kind), ["flattop"], "one event stepping on");
  w.hero.heat = 40;
  assert.equal(of(steps(w, 1), "heatZone").length, 0, "none while he stays");
  assert.ok(Math.abs(w.hero.heat - (40 + 20 - HEAT.rest)) < 0.5, `on the flat-top: ${w.hero.heat}`);
  Object.assign(w.hero, { x: 1450, heat: 40 });
  steps(w, 1);
  assert.ok(Math.abs(w.hero.heat - (40 - HEAT.rest)) < 0.5, `beside it on the steel: ${w.hero.heat}`);
  Object.assign(w.hero, { x: 2200, y: 0, onGround: true, heat: 60 });
  const cold = steps(w, 1);
  assert.equal(of(cold, "heatZone")[0]?.kind, "freezer");
  assert.ok(Math.abs(w.hero.heat - (60 - 30 - HEAT.rest)) < 0.5, `in the freezer: ${w.hero.heat}`);
  Object.assign(w.hero, { x: 2200, y: -300, vy: 0, onGround: false, heat: 60 });
  w.step(input());
  assert.ok(Math.abs(w.hero.heat - 60) < 0.2, "in the air over it, nothing");
});

const doorsOf = () => createSwingDoors([{ id: "kitchen", x: 1200, y: 0, server: "k" }]);
const doorWorld = (heroX, spawns) => {
  const w = worldWith(spawns, { x: heroX, y: 0 });
  w.swingDoors = doorsOf();
  return w;
};
const through = (n, x, vx, act = "attack") => Object.assign(n, { x, vx, act, actT: 0 });

test("the kitchen server's rush bangs the door open her way: a pip inside its swing, none outside it or in grace", () => {
  for (const [heroX, invuln, pip] of [[1050, 0, true], [900, 0, false], [1050, 1, false]]) {
    const w = doorWorld(heroX, [{ id: "k", person: "server-1", x: 1400, y: 0 }]);
    w.hero.invuln = invuln;
    through(npc(w, "k"), 1198, -CAST.server.rush);
    const evs = [];
    stepSwingDoors(w, STEP, evs);
    const swing = of(evs, "doorSwing")[0];
    assert.ok(swing?.hard && swing.dir === -1, `${heroX}: a bang toward the dining side`);
    assert.equal(w.hits.length, heroX === 1050 ? 1 : 0, `${heroX}: inside the swing (${SWING.reach} px) only`);
    w.step(input());
    assert.equal(w.hero.patience < 3, pip, `${heroX} in grace ${invuln}`);
    assert.ok(w.swingDoors[0].t > 0, "the door still swings");
  }
});

test("anyone else through the door swings it softly, him included, and nobody is hurt", () => {
  const w = doorWorld(600, [{ id: "o", person: "office-1", x: 1400, y: 0 }, { id: "k", person: "server-1", x: 1600, y: 0 }]);
  through(npc(w, "o"), 1199, -160, "walk");
  const a = [];
  stepSwingDoors(w, STEP, a);
  assert.deepEqual(of(a, "doorSwing").map((e) => [e.hard, e.dir]), [[false, -1]]);
  w.swingDoors = doorsOf();
  npc(w, "o").vx = 0;
  through(npc(w, "k"), 1201, 200, "walk");
  const b = [];
  stepSwingDoors(w, STEP, b);
  assert.deepEqual(of(b, "doorSwing").map((e) => e.hard), [false], "her walk is not her rush");
  w.swingDoors = doorsOf();
  npc(w, "k").vx = 0;
  Object.assign(w.hero, { x: 1203, vx: 400 });
  const c = [];
  stepSwingDoors(w, STEP, c);
  assert.deepEqual(of(c, "doorSwing").map((e) => [e.hard, e.dir]), [[false, 1]]);
  assert.equal(w.hits.length, 0);
});

test("the mallet on a door at rest slams it away from him into whoever stands in its swing beyond; with nobody there it just swings", () => {
  const w = doorWorld(1080, [{ id: "k", person: "server-1", x: 1350, y: 0 }, { id: "far", person: "server-2", x: 1600, y: 0 }]);
  w.swing = [{ x: 1180, y: -150 }];
  const evs = [];
  stepSwingDoors(w, STEP, evs);
  assert.deepEqual(of(evs, "doorSwing").map((e) => [e.hard, e.dir]), [[true, 1]]);
  assert.equal(npc(w, "k").act, "fly", "in its swing: knocked flying");
  assert.notEqual(npc(w, "far").act, "fly", "past its reach: untouched");
  assert.deepEqual(of(evs, "chain").map((e) => [e.count, e.points]), [[1, 100]]);
  const empty = doorWorld(1080, []);
  empty.swing = [{ x: 1180, y: -150 }];
  const lone = [];
  stepSwingDoors(empty, STEP, lone);
  assert.deepEqual([of(lone, "doorSwing").length, of(lone, "chain").length], [1, 0]);
});

test("a cart rolling into a pit is gone, and the one who pushed it stands idle", () => {
  const pit = flat({ floor: [{ x0: -2000, x1: 1500, y0: 0, y1: 0 }, { x0: 1830, x1: 20000, y0: 0, y1: 0 }], bounds: { x: -2000, y: -3000, w: 22000, h: 3600 } });
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1000, y: 0, cart: 850 }], { x: -1500, y: 0 }, {}, [850], pit);
  Object.assign(w.targets[0], { x: 1400, vx: 900 });
  steps(w, 2);
  assert.equal(w.targets.length, 0, "down the pit and gone");
  steps(w, 1);
  const b = npc(w, "b");
  assert.ok(b.alive && b.act === "idle" && b.vx === 0, `${b.act} ${b.vx}`);
});

test("a dish cart's dishes crash once, on its first knock; a cart of cases never does", () => {
  const w = worldWith([], { x: -1500, y: 0 }, {}, [1000, 2000]);
  w.targets[0].load = "dishes";
  w.targets[0].flash = 0.06;
  w.targets[1].flash = 0.06;
  const evs = steps(w, 0.1);
  assert.deepEqual(of(evs, "dishes").length, 1);
  assert.ok(w.targets[0].spilled && !w.targets[1].spilled);
  w.targets[0].flash = 0.06;
  assert.equal(of(steps(w, 0.1), "dishes").length, 0, "once");
});

test("a belt rising to the right carries him up from its low end; on the floor in front of it he walks past", () => {
  const stage = flat({
    floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }, { x0: 1000, x1: 1900, y0: -120, y1: -520, belt: 220 }],
    platforms: [{ x0: 750, x1: 1000, y: -120 }, { x0: 1900, x1: 3000, y: -520 }],
  });
  const w = createWorld(stage, { x: 900, y: -120 });
  steps(w, 0.2);
  steps(w, 0.3, { right: true });
  steps(w, 4.5);
  assert.ok(Math.abs(w.hero.y + 520) < 2 && w.hero.x > 1900, `carried up onto the deck: ${w.hero.x}, ${w.hero.y}`);
  const floor = createWorld(stage, { x: 600, y: 0 });
  steps(floor, 0.1);
  steps(floor, 3, { right: true, run: true });
  assert.ok(floor.hero.y === 0 && floor.hero.x > 1900, `walked past under it: ${floor.hero.x}, ${floor.hero.y}`);
});

test("a patrol walks up and down a 30-degree flight; a 120 px drop still turns it", () => {
  const stairs = flat({ floor: [{ x0: -2000, x1: 1000, y0: 0, y1: 0 }, { x0: 1000, x1: 1520, y0: 0, y1: -300 }, { x0: 1520, x1: 2200, y0: -300, y1: -300 }] });
  const w = worldWith([{ id: "p", person: "office-1", x: 1250, y: -144, x0: 900, x1: 2000 }], { x: -1500, y: 0 }, {}, [], stairs);
  const ys = [];
  for (let i = 0; i < 40; i++) { steps(w, 0.25); ys.push(npc(w, "p").y); }
  assert.ok(Math.min(...ys) < -290 && Math.max(...ys) > -10, `up and down the flight: ${Math.min(...ys)} to ${Math.max(...ys)}`);
  const ledge = flat({ floor: [{ x0: -2000, x1: 1000, y0: -120, y1: -120 }, { x0: 1000, x1: 20000, y0: 0, y1: 0 }] });
  const l = worldWith([{ id: "p", person: "server-1", x: 800, y: -120, x0: 400, x1: 1400 }], { x: -1500, y: 0 }, {}, [], ledge);
  const xs = [];
  for (let i = 0; i < 30; i++) { steps(l, 0.25); xs.push(npc(l, "p").x); }
  assert.ok(Math.max(...xs) < 1000, `turned at the drop: ${Math.max(...xs)}`);
});

test("the pits are the gaps between two floors at one height that nothing else covers", () => {
  assert.deepEqual(pitsOf(LOBBY), [{ x0: 5900, x1: 6230, y: 0 }]);
  const floor = [
    { x0: 0, x1: 1000, y0: 0, y1: 0 },
    { x0: 1000, x1: 1600, y0: 0, y1: -200 },
    { x0: 1600, x1: 2000, y0: -200, y1: -200 },
    { x0: 2330, x1: 3000, y0: -200, y1: -200 },
    { x0: 3000, x1: 4000, y0: 0, y1: 0 },
  ];
  assert.deepEqual(pitsOf({ floor }), [{ x0: 2000, x1: 2330, y: -200 }]);
});

test("a cart stands on the floor under it, a raised dock included; the level's doors and heat come with it", () => {
  const level = levelOf({
    floor: [{ x0: -400, x1: 1000, y0: 0, y1: 0, kind: "quarry" }, { x0: 1000, x1: 6400, y0: -200, y1: -200, kind: "concrete" }],
    carts: [600, 3000],
    heat: [{ x0: 2000, x1: 2400, y: -200, rate: 20, kind: "flattop" }],
    swingDoors: [{ id: "kitchen", x: 800, y: 0, server: "k" }],
  });
  const g = createGame({ lobby: level, stash: STASH }, 7);
  assert.deepEqual(g.world.targets.map((t) => t.y), [0, -200]);
  assert.equal(g.world.swingDoors.length, 1);
  assert.equal(stageOf(level).heat.length, 1);
});

test("the hint names the hazard he is at: the flat-top, the freezer, the swinging door", () => {
  const level = levelOf({
    platforms: [{ x0: 1000, x1: 1400, y: -180, kind: "flattop" }],
    heat: [{ x0: 1000, x1: 1400, y: -180, rate: 20, kind: "flattop" }, { x0: 2000, x1: 2500, y: 0, rate: -30, kind: "freezer" }],
    swingDoors: [{ id: "kitchen", x: 3500, y: 0, server: "k" }],
  });
  const g = createGame({ lobby: level, stash: STASH }, 7);
  while (g.mode === "card") g.step(input());
  Object.assign(g.world.hero, { x: 1200, y: -180, onGround: true });
  assert.match(hintOf(g), /Flat-top/);
  Object.assign(g.world.hero, { x: 2200, y: 0 });
  assert.match(hintOf(g), /freezer/i);
  Object.assign(g.world.hero, { x: 3300 });
  assert.match(hintOf(g), /Swinging door/);
});

import { RESTAURANT } from "../src/sim/levels/restaurant.ts";
import { seedRewards } from "../src/sim/rewards.ts";
import { drive } from "../src/sim/drive.ts";
import { floorAt } from "../src/sim/physics.ts";

/** His jump tops out near 398 px (the lobby's measure). */
const REACH = 398;
/** Where every spawn stands: on a floor or a platform at its y. */
const footed = (level) => {
  const stage = stageOf(level);
  for (const s of level.cast ?? []) {
    const f = floorAt(stage, s.x, s.y - 24);
    const onFloor = f !== null && Math.abs(f - s.y) < 2;
    const onPlat = level.platforms.some((p) => s.x >= p.x0 && s.x <= p.x1 && Math.abs(p.y - s.y) < 2);
    assert.ok(onFloor || onPlat, `${level.id}: ${s.id} floats at ${s.x}, ${s.y}`);
  }
};
/** Drives the scripted player from the venue's card to its exit; returns the game and the highest he climbed. */
const clear = (level, start, route, seed = 11) => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: level }, seed, { start });
  while (g.mode === "card") g.step(input());
  let t = 0, last = g.world.hero.x, stuck = 0, topY = 0;
  while (g.mode === "play" && t < 150) {
    g.step(drive(g.level, g.world.hero, route, g.world));
    t += STEP;
    topY = Math.min(topY, g.world.hero.y);
    if (Math.floor(t * 2) !== Math.floor((t - STEP) * 2)) {
      stuck = g.world.hero.x <= last + 1 ? stuck + 1 : 0;
      last = g.world.hero.x;
      assert.ok(stuck < 6, `${g.level.id} ${route}: stuck at ${g.world.hero.x}, ${g.world.hero.y}`);
    }
  }
  return { g, topY };
};

test("the restaurant keeps the spec's shape: its length, two clocks, the three bands, an early pepper, the truck well its only pit", () => {
  const R = RESTAURANT;
  assert.ok(R.length >= 14000 && R.length <= 18000);
  assert.equal(R.checkpoints.length, 2);
  assert.ok(R.platforms.some((p) => p.y === -180) && R.platforms.some((p) => p.y === -520), "counters at 180, the pot rack at 520");
  assert.deepEqual(pitsOf(R), [{ x0: 13600, x1: 13930, y: -200 }]);
  assert.ok(Math.min(...R.crates.filter((c) => c.kind === "pepper").map((c) => c.x)) < 1200, "an early pepper");
  assert.deepEqual(R.heat.map((z) => z.kind), ["flattop", "flattop", "freezer"]);
  for (const z of R.heat.filter((z) => z.kind === "flattop"))
    assert.ok(R.platforms.some((p) => p.kind === "flattop" && p.x0 === z.x0 && p.x1 === z.x1 && p.y === z.y), "each flat-top zone is a flat-top's top");
  const freezer = R.heat.find((z) => z.kind === "freezer");
  assert.ok(!R.platforms.some((p) => p.y === -180 && p.x1 > freezer.x0 && p.x0 < freezer.x1), "no counter in front of the walk-in's door");
  assert.equal(R.swingDoors[0].server, "server-kitchen");
  const k = R.cast.find((s) => s.id === "server-kitchen");
  assert.ok(k.x0 < R.swingDoors[0].x && k.x1 > R.swingDoors[0].x, "her patrol crosses the door");
  for (const d of ["PRIVATE DINING", "DELIVERIES"]) assert.ok(R.doors.some((x) => x.label === d), d);
  assert.equal(R.cast.length, 8);
  footed(R);
});

test("the pot rack is reached from the counters, never from the floor; no crate hangs under it", () => {
  const rack = RESTAURANT.platforms.find((p) => p.kind === "rack");
  const counters = RESTAURANT.platforms.filter((p) => (p.kind === "steel" || p.kind === "flattop") && p.x1 > rack.x0 && p.x0 < rack.x1);
  assert.ok(counters.length > 0 && counters.every((c) => c.y - rack.y < REACH), "a jump from a counter reaches it");
  assert.ok(0 - rack.y > REACH, "a jump from the floor does not");
  for (const c of RESTAURANT.crates) assert.ok(c.x < rack.x0 - 100 || c.x > rack.x1 + 100, `crate ${c.id} under the rack`);
});

test("every run of the restaurant has a can, nuts and a Buc-ee's on the line's floor and up on the rack", () => {
  assert.deepEqual(RESTAURANT.routes.map((r) => r.id), ["line", "rack"]);
  for (let seed = 1; seed <= 24; seed++) {
    const p = seedRewards(RESTAURANT, seed);
    assert.equal(p.length, RESTAURANT.rewards.count);
    for (const r of RESTAURANT.routes)
      for (const kind of ["can", "nuts", "bucees"])
        assert.ok(p.some((q) => q.kind === kind && q.x >= r.x0 && q.x <= r.x1 && q.y >= r.y0 && q.y <= r.y1), `seed ${seed}: ${kind} on the ${r.id}`);
  }
});

test("a scripted player clears the restaurant by its floor route: alive, inside the clock, scoring on the cast", () => {
  const { g } = clear([RESTAURANT], 1, "floor");
  assert.equal(g.level.id, "restaurant");
  assert.equal(g.run.lives, 3, "no life lost");
  assert.ok(["walkoff", "tally", "clear"].includes(g.mode), `reached DELIVERIES (${g.mode} at ${g.world.hero.x})`);
  assert.ok(g.run.score > 0);
});

test("the lobby's exit now leads to the restaurant's card", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT] }, 7);
  while (g.mode === "card") g.step(input());
  g.world.hero.x = 15800;
  for (let i = 0; i < Math.round(20 / STEP) && g.mode !== "card"; i++) g.step(input({ right: true }));
  assert.deepEqual([g.mode, g.level.id], ["card", "restaurant"]);
});

import { CAMPUS } from "../src/sim/levels/campus.ts";

test("the campus keeps the spec's shape: its length, two clocks, the bands, an early pepper, no pit", () => {
  const K = CAMPUS;
  assert.ok(K.length >= 14000 && K.length <= 18000);
  assert.equal(K.checkpoints.length, 2);
  assert.deepEqual(pitsOf(K), []);
  assert.ok(Math.min(...K.crates.filter((c) => c.kind === "pepper").map((c) => c.x)) < 1200);
  assert.ok(K.platforms.some((p) => p.kind === "deck" && p.y === -520), "the deck at 520");
  const belt = K.floor.find((f) => f.kind === "belt");
  assert.ok(belt.belt > 0 && belt.y1 < belt.y0, "a belt rising to the right");
  for (const f of K.floor.filter((f) => f.kind === "steps")) {
    const deg = (Math.atan2(Math.abs(f.y1 - f.y0), f.x1 - f.x0) * 180) / Math.PI;
    assert.ok(Math.abs(deg - 30) < 0.5, `30-degree steps: ${deg}`);
  }
  for (const d of ["SKILLS LAB", "LIBRARY"]) assert.ok(K.doors.some((x) => x.label === d), d);
  assert.equal(K.cast.length, 12);
  footed(K);
});

test("the deck is out of reach from the floor and nothing under it reaches it; the fountain's top is reached from its rim, not the plaza", () => {
  const deck = CAMPUS.platforms.find((p) => p.kind === "deck");
  assert.ok(0 - deck.y > REACH, "not from the floor");
  for (const p of CAMPUS.platforms) if (p !== deck && p.x1 > deck.x0 && p.x0 < deck.x1) assert.ok(p.y - deck.y > 300 + 100, `${p.kind} at ${p.y} under the deck`);
  const tray = CAMPUS.platforms.find((p) => p.kind === "tray");
  const belt = CAMPUS.floor.find((f) => f.kind === "belt");
  assert.ok(tray.x1 === belt.x0 && tray.y === belt.y0 && -tray.y < REACH, "the tray counter, a hop up, feeds the belt");
  assert.ok(belt.x1 === deck.x0 && belt.y1 === deck.y, "the belt delivers onto the deck");
  const rim = CAMPUS.platforms.find((p) => p.kind === "fountain");
  const tier = CAMPUS.platforms.find((p) => p.kind === "tier");
  assert.ok(rim.y - tier.y < REACH && -200 - tier.y > REACH, "the tier from the rim, never from the plaza");
});

test("the library's ledges are each reached from the flight or landing beside them", () => {
  const stage = stageOf(CAMPUS);
  for (const l of CAMPUS.platforms.filter((p) => p.kind === "ledge")) {
    const near = Math.max(...[l.x0, l.x1, l.x1 + 100].map((x) => -(floorAt(stage, x, -2000) ?? 0)));
    assert.ok(-l.y - near < REACH, `ledge at ${l.x0}: ${-l.y - near} px above its footing`);
  }
});

test("every run of the campus has a can, nuts and a Buc-ee's under the deck and on it", () => {
  assert.deepEqual(CAMPUS.routes.map((r) => r.id), ["floor", "deck"]);
  for (let seed = 1; seed <= 24; seed++) {
    const p = seedRewards(CAMPUS, seed);
    for (const r of CAMPUS.routes)
      for (const kind of ["can", "nuts", "bucees"])
        assert.ok(p.some((q) => q.kind === kind && q.x >= r.x0 && q.x <= r.x1 && q.y >= r.y0 && q.y <= r.y1), `seed ${seed}: ${kind} on the ${r.id}`);
  }
});

test("a scripted player clears the campus by the floor and by the deck: alive, inside the clock", () => {
  for (const route of ["floor", "balcony"]) {
    const { g, topY } = clear([RESTAURANT, CAMPUS], 2, route);
    assert.equal(g.level.id, "campus");
    assert.equal(g.run.lives, 3, `${route}: no life lost`);
    assert.ok(["walkoff", "tally", "clear"].includes(g.mode), `${route}: reached the LIBRARY (${g.mode} at ${g.world.hero.x})`);
    assert.ok(topY <= -880, `${route}: up the library steps`);
  }
});

test("the shift runs lobby, restaurant, campus, then it is over", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT, CAMPUS] }, 7);
  const seen = [g.level.id];
  for (let i = 0; i < 3; i++) {
    while (g.mode === "card") g.step(input());
    const exit = g.level.doors.find((d) => d.kind === "exit");
    Object.assign(g.world.hero, { x: exit.x - 120, y: exit.y, vx: 0, vy: 0 });
    for (let k = 0; k < Math.round(20 / STEP) && g.mode !== "card" && g.mode !== "clear"; k++) g.step(input({ right: true }));
    seen.push(g.mode === "clear" ? "clear" : g.level.id);
  }
  assert.deepEqual(seen, ["lobby", "restaurant", "campus", "clear"]);
});

test("the professor on the library stairs turns his page before he walks into Hammer on the landing below", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT, CAMPUS] }, 7, { start: 2 });
  while (g.mode === "card") g.step(input());
  // Only the professor: the students on the steps would throw.
  for (const n of g.world.cast) if (n.spawn !== "prof-steps") n.alive = false;
  Object.assign(g.world.hero, { x: 12700, y: -300, vx: 0, vy: 0 });
  const seen = [];
  for (let i = 0; i < Math.round(14 / STEP) && !seen.some((e) => e.type === "hurt"); i++) {
    g.world.hero.invuln = 0;
    g.step(input());
    seen.push(...g.events.filter((e) => (e.type === "chime" && e.job === "prof") || e.type === "hurt"));
  }
  const chime = seen.findIndex((e) => e.type === "chime");
  const hurt = seen.findIndex((e) => e.type === "hurt");
  assert.ok(hurt >= 0, "he marches into him");
  assert.ok(chime >= 0 && chime < hurt, `a page turns first: ${JSON.stringify(seen.map((e) => e.type))}`);
});

test("a hit that lands while he walks out of a venue is not carried into the next: he arrives with the pips he clocked out with", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT] }, 7);
  while (g.mode === "card") g.step(input());
  const exit = g.level.doors.find((d) => d.kind === "exit");
  Object.assign(g.world.hero, { x: exit.x - 120, y: exit.y, vx: 0, vy: 0 });
  for (let i = 0; i < Math.round(3 / STEP) && g.mode !== "walkoff"; i++) g.step(input({ right: true }));
  assert.equal(g.mode, "walkoff");
  const pips = g.world.hero.patience;
  const hurt = [];
  // A plane, a pan or a shoulder that reaches him as he goes: each queues a hit for the next step.
  for (let i = 0; i < Math.round(20 / STEP) && g.mode !== "card"; i++) {
    if (g.mode === "walkoff") g.world.hit(g.world.hero.x + 60);
    g.step(input());
    hurt.push(...g.events.filter((e) => e.type === "hurt" || e.type === "lifeLost"));
  }
  assert.deepEqual([g.mode, g.level.id], ["card", "restaurant"]);
  assert.deepEqual(hurt, [], "nothing hurts him on his way out");
  assert.equal(g.world.hero.patience, pips, "he arrives with the pips he clocked out with");
});
