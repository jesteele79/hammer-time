import test from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../src/sim/world.ts";
import { STEP } from "../src/sim/constants.ts";
import { CHARGE_MAX, LECTURE, MOVE_SECONDS } from "../src/sim/moves.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = () => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 } });
const settle = (w) => {
  for (let i = 0; i < 6; i++) w.step(input());
};
const steps = (w, seconds, held = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.step(input(held));
    out.push(...w.events);
  }
  return out;
};
const press = (w, key, held = {}) => {
  w.step(input({ ...held, [key]: true }, { [key]: true }));
  return w.events;
};

test("E lectures: held still, delivered a fifth of the way in, in front of him, and cools him 15", () => {
  for (const facing of [1, -1]) {
    const w = createWorld(flat(), { x: 500, y: 0 }, { heat: 50 });
    w.hero.facing = facing;
    settle(w);
    assert.ok(press(w, "lecture").some((e) => e.type === "lectureStart"));
    assert.equal(w.hero.move?.kind, "lecture");
    const x0 = w.hero.x;
    const evs = steps(w, MOVE_SECONDS.lecture - 2 * STEP, { right: true, jump: true });
    assert.ok(Math.abs(w.hero.x - x0) < 1 && w.hero.onGround, "planted: no walking, no jump");
    const delivered = evs.filter((e) => e.type === "lecture");
    assert.equal(delivered.length, 1, "delivered once");
    const r = delivered[0].reach;
    assert.ok(facing > 0 ? r.x < x0 && r.x + r.w > x0 + 700 : r.x + r.w > x0 && r.x < x0 - 700, `in front: ${JSON.stringify(r)}`);
    assert.ok(w.hero.heat < 50 - LECTURE.cool + 0.5 && w.hero.heat > 50 - LECTURE.cool - 4, `cooled: ${w.hero.heat}`);
  }
});

test("one lecture per 1.4 s, never in the air or crouched, and snot outranks it while it outranks the smash", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  settle(w);
  press(w, "lecture");
  steps(w, MOVE_SECONDS.lecture + 0.1);
  press(w, "lecture");
  assert.equal(w.hero.move, null, "still cooling down");
  steps(w, LECTURE.cooldown - MOVE_SECONDS.lecture);
  press(w, "lecture");
  assert.equal(w.hero.move?.kind, "lecture", "ready again");
  const air = createWorld(flat(), { x: 100, y: 0 });
  settle(air);
  air.step(input({ jump: true }, { jump: true }));
  press(air, "lecture");
  assert.equal(air.hero.move, null, "not in the air");
  const low = createWorld(flat(), { x: 100, y: 0 });
  settle(low);
  low.step(input({ down: true }));
  low.step(input({ down: true, lecture: true }, { lecture: true }));
  assert.equal(low.hero.move, null, "not crouched");
  const all = { lecture: true, fire: true, super: true, hammer: true };
  const a = createWorld(flat(), { x: 100, y: 0 }, { charge: CHARGE_MAX });
  settle(a);
  a.step(input(all, all));
  assert.equal(a.hero.move.kind, "snot");
  const b = createWorld(flat(), { x: 100, y: 0 }, { charge: CHARGE_MAX });
  settle(b);
  b.hero.sinus = 0;
  b.step(input(all, all));
  assert.equal(b.hero.move.kind, "lecture");
  assert.equal(b.hero.charge, CHARGE_MAX, "the smash did not also start");
});

import { IDLE } from "../src/sim/moves.ts";

const at = (evs, type) => evs.filter((e) => e.type === type);

test("standing still he checks his watch at 2.5 s, taps his foot from 5 s, harrumphs at 8 s, and goes round again", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  settle(w);
  const seen = [];
  for (let i = 0; i < Math.round(17 / STEP); i++) {
    w.step(input());
    for (const e of w.events) if (["watch", "tap", "harrumph"].includes(e.type)) seen.push([e.type, +(i * STEP).toFixed(2)]);
  }
  assert.deepEqual(seen.map(([k]) => k), ["watch", "tap", "harrumph", "watch", "tap", "harrumph"]);
  for (const [k, t] of seen.slice(0, 3)) {
    const want = { watch: IDLE.watchAt, tap: IDLE.tapAt, harrumph: IDLE.harrumphAt }[k];
    assert.ok(Math.abs(t - want) < 0.06, `${k} at ${t}`);
  }
});

test("bored from the watch check until he does anything", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  settle(w);
  steps(w, 2.4);
  assert.equal(w.hero.bored, false);
  steps(w, 0.2);
  assert.equal(w.hero.bored, true);
  assert.equal(w.hero.move?.kind, "watch");
  steps(w, 6);
  assert.equal(w.hero.bored, true, "still bored after the harrumph");
  w.step(input({ right: true }));
  assert.equal(w.hero.bored, false);
});

test("a key pressed in the watch check or the tap starts its move that step; a held direction walks", () => {
  for (const [wait, act] of [
    [2.7, "watch"],
    [5.3, "tap"],
  ]) {
    const w = createWorld(flat(), { x: 100, y: 0 });
    settle(w);
    steps(w, wait);
    assert.equal(w.hero.move?.kind, act);
    press(w, "hammer");
    assert.equal(w.hero.move?.kind, "swing", `a swing out of the ${act}`);
    const v = createWorld(flat(), { x: 100, y: 0 });
    settle(v);
    steps(v, wait);
    v.step(input({ right: true }));
    assert.equal(v.hero.move, null, `walking ends the ${act}`);
    steps(v, 0.3, { right: true });
    assert.ok(v.hero.vx > 300, "and he walks");
  }
});

test("nothing idles in the air, crouched or mid-move", () => {
  // A fall from 8000 px lasts about 3.4 s at the terminal speed.
  const air = createWorld({ ...flat(), bounds: { x: -2000, y: -9000, w: 22000, h: 10000 } }, { x: 100, y: -8000 });
  steps(air, 3);
  assert.ok(!air.hero.onGround && air.hero.idleT === 0, "still falling, not idling");
  const low = createWorld(flat(), { x: 100, y: 0 });
  settle(low);
  const evs = steps(low, 3, { down: true });
  assert.equal(at(evs, "watch").length, 0, "no watch while crouched");
});
