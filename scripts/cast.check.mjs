import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { createCast, CAST, CAST_ID } from "../src/sim/cast.ts";
import { createCart } from "../src/sim/targets.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = (extra = {}) => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 }, ...extra });
/** A level with only what createCast reads: the cast list and, for bellhops, the carts. */
const levelWith = (cast, carts = []) => ({ cast, carts });
/** A world with a cast: `spawns` are CastSpawn records; carts come from `carts` (x values). */
const worldWith = (spawns, hero = { x: 100, y: 0 }, opts = {}, carts = [], stage = flat()) => {
  const targets = carts.map((x, i) => createCart(i + 1, x));
  const w = createWorld(stage, hero, { ...opts, targets });
  w.cast = createCast(levelWith(spawns, carts), targets);
  for (let i = 0; i < 6; i++) w.step(input());
  return w;
};
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const press = (w, key, held = {}) => { w.step(input({ ...held, [key]: true }, { [key]: true })); return w.events; };
const until = (w, done, seconds = 10, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(w); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const of = (evs, type) => evs.filter((e) => e.type === type);
const npc = (w, spawn) => w.cast.find((n) => n.spawn === spawn);
void press;
void until;

test("the cast spawns from the level data with the role's size, a bellhop tied to his cart, ids past the carts", () => {
  const w = worldWith(
    [{ id: "b", person: "bellhop-1", x: 1250, y: 0, cart: 1250 }, { id: "s", person: "server-2", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "k", person: "student-1", x: 2000, y: -520, sit: true }],
    { x: -1500, y: 0 }, {}, [1250],
  );
  assert.equal(w.cast.length, 3);
  const b = npc(w, "b");
  assert.deepEqual([b.role, b.w, b.h, b.cart, b.hat, b.act], ["bellhop", 100, 330, 1, true, "idle"]);
  assert.equal(npc(w, "s").x1, 1100);
  assert.ok(npc(w, "k").sit && npc(w, "k").id >= CAST_ID);
  assert.deepEqual(w.snapshot().cast.map((n) => n.spawn), ["b", "s", "k"]);
});

test("a server patrols her stretch at a walk and turns at its ends; a bellhop stands by his cart", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "b", person: "bellhop-1", x: 3000, y: 0, cart: 3000 }], { x: -1500, y: 0 }, {}, [3000]);
  const xs = [];
  for (let i = 0; i < 6; i++) { steps(w, 0.5); xs.push(npc(w, "s").x); }
  assert.ok(xs.every((x) => x >= 700 - 1 && x <= 1100 + 1), `inside the patrol: ${xs}`);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 200, "she walks it");
  assert.ok(Math.abs(npc(w, "s").vx) <= CAST.server.walk + 1e-9);
  assert.equal(npc(w, "b").x, 3000, "the bellhop stays put");
});

test("they notice him once per life: a double-take with a line, facing him; office workers only mutter", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 2000, y: 0 }, { id: "o", person: "office-1", x: 2600, y: 0 }], { x: 1000, y: 0 });
  w.hero.facing = 1;
  const evs = steps(w, 0.5);
  assert.equal(of(evs, "castNotice").length, 0, "too far");
  w.hero.x = 1400;
  const seen = steps(w, 0.3);
  const n = of(seen, "castNotice");
  assert.deepEqual(n.map((e) => e.id), [npc(w, "s").id], "the server noticed, the office worker is still out of range");
  assert.equal(npc(w, "s").facing, -1, "facing him");
  assert.ok(of(seen, "castLine").some((e) => e.id === npc(w, "s").id), "with a line");
  assert.equal(npc(w, "s").act, "notice");
  w.hero.x = 2300;
  const again = steps(w, 0.6);
  assert.equal(of(again, "castNotice").filter((e) => e.id === npc(w, "s").id).length, 0, "once");
  assert.ok(of(again, "castLine").some((e) => e.id === npc(w, "o").id), "the office worker mutters");
  assert.equal(of(again, "castNotice").filter((e) => e.id === npc(w, "o").id).length, 0, "without looking up");
});

test("they never notice him from another floor, except students, who see the whole lobby", () => {
  const stage = flat({ platforms: [{ x0: 1500, x1: 3000, y: -520 }] });
  const w = worldWith([{ id: "s", person: "server-1", x: 2000, y: 0 }, { id: "k", person: "student-2", x: 2200, y: -520 }], { x: -1500, y: 0 }, {}, [], stage);
  // Up onto the balcony beside them, once they have settled.
  Object.assign(w.hero, { x: 2600, y: -520 });
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "castNotice").map((e) => e.id), [npc(w, "k").id]);
});

test("stepping the cast is deterministic", () => {
  const spawns = [{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "k", person: "student-1", x: 2000, y: -520 }];
  const a = worldWith(spawns);
  const b = worldWith(spawns);
  steps(a, 3, { right: true });
  steps(b, 3, { right: true });
  assert.deepEqual(a.snapshot().cast, b.snapshot().cast);
});
