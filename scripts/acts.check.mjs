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
