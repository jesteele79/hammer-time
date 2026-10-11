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

import { IDLE, TAP_HARRUMPH } from "../src/sim/moves.ts";

const at = (evs, type) => evs.filter((e) => e.type === type);

test("standing still he checks his watch at 2.5 s, taps his foot from 5 s, harrumphs as the tap ends, and goes round again", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  settle(w);
  const seen = [];
  for (let i = 0; i < Math.round(17 / STEP); i++) {
    w.step(input());
    for (const e of w.events) if (["watch", "tap", "harrumph"].includes(e.type)) seen.push([e.type, +(i * STEP).toFixed(2)]);
  }
  assert.deepEqual(seen.map(([k]) => k), ["watch", "tap", "harrumph", "watch", "tap", "harrumph"]);
  for (const [k, t] of seen.slice(0, 3)) {
    // The harrumph sounds as his chest and chin come up, not after he has settled.
    const want = { watch: IDLE.watchAt, tap: IDLE.tapAt, harrumph: IDLE.tapAt + TAP_HARRUMPH }[k];
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

import { HURT, KNOCKDOWN, PATIENCE_MAX } from "../src/sim/damage.ts";
import { GRACE } from "../src/sim/moves.ts";

const hitFrom = (w, dx) => {
  w.hit(w.hero.x + dx);
  w.step(input());
  return w.events;
};

test("a hit costs a pip, turns him to face it, throws him 540 back and 500 up, shows the hurt face and drops hot snot", () => {
  for (const side of [1, -1]) {
    const w = createWorld(flat(), { x: 500, y: 0 }, { hot: true });
    w.hero.facing = -side;
    settle(w);
    const evs = hitFrom(w, side * 150);
    const e = evs.find((x) => x.type === "hurt");
    assert.ok(e && e.dir === -side, `thrown away from it (side ${side})`);
    assert.equal(w.hero.facing, side, "turned to face it");
    assert.equal(w.hero.patience, PATIENCE_MAX - 1);
    assert.equal(w.hero.move?.kind, "hurt");
    assert.ok(Math.abs(w.hero.vx + side * HURT.back) < 1 && w.hero.vy < -HURT.up + 60, `${w.hero.vx}, ${w.hero.vy}`);
    assert.ok(w.hero.hurtT > HURT.face - 0.02 && !w.hero.hot);
  }
});

test("in grace (1.45 s) a second hit does nothing; after it, the next costs another pip", () => {
  const w = createWorld(flat(), { x: 500, y: 0 });
  settle(w);
  hitFrom(w, 150);
  steps(w, 0.5);
  assert.equal(hitFrom(w, 150).filter((e) => e.type === "hurt").length, 0, "ignored in grace");
  steps(w, GRACE);
  hitFrom(w, 150);
  assert.equal(w.hero.patience, 1);
});

test("the last pip knocks him flat: he flies, holds the landing frame until he lands, lies, and gets up", () => {
  const w = createWorld(flat(), { x: 500, y: 0 }, { patience: 1 });
  settle(w);
  const evs = hitFrom(w, 150);
  assert.ok(evs.some((e) => e.type === "tumble"));
  assert.equal(w.hero.move?.kind, "tumble");
  assert.ok(w.hero.vy < -KNOCKDOWN.up + 60, "thrown higher");
  let landedAt = null,
    upAt = null;
  for (let i = 0; i < 600 && upAt === null; i++) {
    w.step(input({ right: true, hammer: true }, { hammer: true }));
    if (landedAt === null && w.hero.onGround) landedAt = i;
    if (w.events.some((e) => e.type === "getUp")) upAt = i;
    if (upAt === null) assert.equal(w.hero.move?.kind, "tumble", "nothing else starts while he is down");
  }
  assert.ok(landedAt !== null && upAt !== null && upAt > landedAt, "lands, then gets up");
  assert.equal(w.hero.move, null);
  assert.ok(w.hero.invuln > 1, "a moment's grace as he gets up");
});

test("knocked off a counter into a long drop, the tumble waits for the floor; hits while he is down do nothing", () => {
  const tall = { ...flat(), platforms: [{ x0: -400, x1: 600, y: -900 }], bounds: { x: -2000, y: -4000, w: 22000, h: 5000 } };
  const w = createWorld(tall, { x: 560, y: -900 }, { patience: 1 });
  settle(w);
  hitFrom(w, -150);
  let held = 0;
  while (!w.hero.onGround && held < 400) {
    w.step(input());
    held++;
    if (w.hero.move.t / MOVE_SECONDS.tumble > 0.3 + 0.02) assert.fail("the clip ran past the landing frame in the air");
    assert.equal(hitFrom(w, 100).filter((e) => e.type === "hurt" || e.type === "tumble").length, 0, "no hit while down");
  }
  assert.ok(w.hero.onGround && w.hero.y === 0, "landed on the floor below");
});

test("a hit mid-move ends that move: no burst after a hit in the smash, no stroke after one in the towel", () => {
  const s = createWorld(flat(), { x: 500, y: 0 }, { charge: CHARGE_MAX });
  settle(s);
  press(s, "super");
  steps(s, 0.2);
  hitFrom(s, 150);
  assert.equal(s.hero.move?.kind, "hurt");
  assert.equal(steps(s, 1).filter((e) => e.type === "burst").length, 0, "no burst");
  const t = createWorld(flat(), { x: 500, y: 0 }, { heat: 60 });
  settle(t);
  press(t, "towel");
  steps(t, 0.3);
  hitFrom(t, 150);
  assert.equal(steps(t, 1).filter((e) => e.type === "stroke" || e.type === "flick" || e.type === "shine").length, 0, "no more strokes");
  const i = createWorld(flat(), { x: 500, y: 0 });
  settle(i);
  steps(i, 2.7);
  assert.equal(i.hero.move?.kind, "watch");
  hitFrom(i, 150);
  assert.equal(i.hero.move?.kind, "hurt", "the watch check gives way to the hit");
});

test("the knockdown throws him its full height whether or not jump is held", () => {
  for (const held of [{}, { jump: true }]) {
    const w = createWorld(flat(), { x: 500, y: 0 }, { patience: 1 });
    settle(w);
    hitFrom(w, 150);
    let apex = 0;
    while (!w.hero.onGround) {
      w.step(input(held));
      apex = Math.min(apex, w.hero.y);
    }
    // 900 px/s up against 3300 px/s² rising: about 123 px.
    assert.ok(-apex > 110, `thrown ${(-apex).toFixed(0)} px high (jump held: ${!!held.jump})`);
  }
});
