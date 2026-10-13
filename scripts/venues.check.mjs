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
