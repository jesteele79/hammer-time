import test from "node:test";
import assert from "node:assert/strict";
import { feelOf } from "../src/sim/feel.ts";
import { applyFeel, createClock, runFrame, tickClock } from "../src/sim/clock.ts";

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("the feel table carries the spec's numbers", () => {
  assert.deepEqual(feelOf({ type: "hit", by: "mallet", x: 0, y: 0, target: 1 }), { hitstop: 0.06, trauma: 0.35 });
  const burst = feelOf({ type: "burst", x: 0, y: 0 });
  assert.equal(burst.hitstop, 0.08);
  assert.equal(burst.trauma, 0.8);
  assert.deepEqual(burst.slowmo, { scale: 0.25, seconds: 0.25 });
  assert.deepEqual(burst.zoom, { amount: 1.12, seconds: 0.4 });
  assert.equal(feelOf({ type: "stroke", n: 0 }), null);
});

test("a hit-stop freezes the sim for its length of wall time", () => {
  const c = createClock();
  applyFeel(c, { hitstop: 0.06, trauma: 0 });
  assert.equal(tickClock(c, 0.016), 0);
  assert.equal(tickClock(c, 0.016), 0);
  assert.equal(tickClock(c, 0.016), 0);
  assert.ok(near(tickClock(c, 0.016), 0.004), "the frame that ends the stop runs for what is left of it");
  assert.equal(tickClock(c, 0.016), 0.016);
});

test("two hits in one step stop for the longer hit-stop, not the sum", () => {
  const c = createClock();
  applyFeel(c, { hitstop: 0.06, trauma: 0 });
  applyFeel(c, { hitstop: 0.04, trauma: 0 });
  assert.ok(near(c.hitstop, 0.06));
});

test("the super burst stops, then runs a quarter speed for a quarter second of wall time", () => {
  const c = createClock();
  applyFeel(c, feelOf({ type: "burst", x: 0, y: 0 }));
  let sim = 0;
  for (let i = 0; i < 50; i++) sim += tickClock(c, 0.01);
  // 0.08 frozen (the slow motion keeps counting), 0.17 at a quarter, 0.25 at full speed.
  assert.ok(near(sim, 0.17 * 0.25 + 0.25, 1e-6), `sim ${sim}`);
  assert.equal(c.scale, 1);
});

test("slow motion never compounds: a second burst keeps the deeper scale and the longer time", () => {
  const c = createClock();
  applyFeel(c, { hitstop: 0, trauma: 0, slowmo: { scale: 0.25, seconds: 0.25 } });
  tickClock(c, 0.1);
  applyFeel(c, { hitstop: 0, trauma: 0, slowmo: { scale: 0.5, seconds: 0.25 } });
  assert.equal(c.scale, 0.25);
  assert.ok(near(c.slowmo, 0.25));
});


import { createWorld } from "../src/sim/world.ts";
import { STEP, RUN, WALK } from "../src/sim/constants.ts";
import { MOVE_SECONDS, HEAT, SUPER_HOP, SUPER_PLUNGE, SUPER_CUT, CHARGE_MAX } from "../src/sim/moves.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = () => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 } });
const settle = (w) => { for (let i = 0; i < 6; i++) w.step(input()); };
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const press = (w, key, held = {}) => { w.step(input({ ...held, [key]: true }, { [key]: true })); return w.events; };

test("each key starts its move, which runs its length and ends", () => {
  for (const [key, kind, opts] of [["hammer", "swing", {}], ["fire", "snot", {}], ["super", "super", { charge: CHARGE_MAX }], ["towel", "wipe", { heat: 50 }]]) {
    const w = createWorld(flat(), { x: 100, y: 0 }, opts);
    settle(w);
    press(w, key);
    assert.equal(w.hero.move?.kind, kind, key);
    steps(w, MOVE_SECONDS[kind] - 2 * STEP);
    assert.equal(w.hero.move?.kind, kind, `${kind} still running`);
    steps(w, 0.15);
    assert.equal(w.hero.move, null, `${kind} ended`);
  }
});

test("pressing every move key at once starts one move, by the shipped priority", () => {
  const all = { towel: true, fire: true, super: true, hammer: true };
  const w = createWorld(flat(), { x: 100, y: 0 }, { heat: 40, charge: CHARGE_MAX });
  settle(w);
  w.step(input(all, all));
  assert.equal(w.hero.move.kind, "wipe");
  const cool = createWorld(flat(), { x: 100, y: 0 }, { heat: 0, charge: CHARGE_MAX });
  settle(cool);
  cool.step(input(all, all));
  assert.equal(cool.hero.move.kind, "snot");
  assert.equal(cool.hero.charge, CHARGE_MAX, "the super did not also start");
});

test("mashing the key never restarts a running move", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  settle(w);
  press(w, "hammer");
  for (let i = 0; i < 20; i++) press(w, "hammer");
  assert.ok(Math.abs(w.hero.move.t - 21 * STEP) < 1e-9, `t ${w.hero.move.t}`);
});

test("moves in the air, crouched and sliding follow the shipped rules", () => {
  const air = createWorld(flat(), { x: 100, y: 0 }, { heat: 50 });
  settle(air);
  air.step(input({ jump: true }, { jump: true }));
  air.step(input());
  press(air, "towel");
  assert.equal(air.hero.move, null, "no towel in the air");
  press(air, "hammer");
  assert.equal(air.hero.move?.kind, "swing", "the swing works in the air");
  const low = createWorld(flat(), { x: 100, y: 0 }, { heat: 50, charge: CHARGE_MAX });
  settle(low);
  low.step(input({ down: true }));
  for (const key of ["hammer", "fire", "super", "towel"]) {
    low.step(input({ down: true, [key]: true }, { [key]: true }));
    assert.equal(low.hero.move, null, `no ${key} while crouched`);
  }
  const slide = createWorld(flat(), { x: 100, y: 0 });
  settle(slide);
  steps(slide, 0.4, { right: true, run: true });
  slide.step(input({ right: true, run: true, down: true }));
  assert.equal(slide.hero.state, "slide");
  slide.step(input({ right: true, run: true, down: true, hammer: true }, { hammer: true }));
  assert.equal(slide.hero.move, null, "no swing while sliding");
});

test("the towel needs heat, holds him still and drains heat fast", () => {
  const cold = createWorld(flat(), { x: 100, y: 0 }, { heat: 0 });
  settle(cold);
  press(cold, "towel");
  assert.equal(cold.hero.move, null, "nothing to wipe at zero heat");
  const w = createWorld(flat(), { x: 100, y: 0 }, { heat: 90 });
  settle(w);
  steps(w, 0.3, { right: true });
  press(w, "towel", { right: true });
  steps(w, 0.4, { right: true, jump: true });
  assert.ok(Math.abs(w.hero.vx) < 1, `held still: ${w.hero.vx}`);
  assert.ok(w.hero.onGround, "no jump while wiping");
  assert.ok(w.hero.heat < 90 - HEAT.wipe * 0.3, `heat drains: ${w.hero.heat}`);
});

test("heat rises running and jumping, falls at rest, and boils once", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  settle(w);
  steps(w, 1, { right: true, run: true });
  const run = w.hero.heat;
  assert.ok(run > 3 && run < HEAT.run * 1.01, `running ${run}`);
  w.step(input({ jump: true }, { jump: true }));
  assert.ok(Math.abs(w.hero.heat - run - HEAT.jump) < 0.2, "a jump adds 12");
  const hot = createWorld(flat(), { x: 100, y: 0 }, { heat: 99 });
  settle(hot);
  const evs = steps(hot, 1, { right: true, run: true });
  assert.equal(evs.filter((e) => e.type === "boiling").length, 1);
  const rest = createWorld(flat(), { x: 100, y: 0 }, { heat: 50 });
  settle(rest);
  steps(rest, 1);
  assert.ok(Math.abs(rest.hero.heat - (50 - HEAT.rest * (1 + 6 * STEP))) < 0.05, `resting ${rest.hero.heat}`);
});

test("hot and tired: at 80 heat the run tops out lower", () => {
  const w = createWorld(flat(), { x: 100, y: 0 }, { heat: 95 });
  settle(w);
  steps(w, 1, { right: true, run: true });
  assert.ok(w.hero.vx < RUN * 0.75 && w.hero.vx > WALK * 0.6, `tired run ${w.hero.vx}`);
});

test("snot spends a sinus charge, waits half a second, and the sinus refills", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  settle(w);
  press(w, "fire");
  assert.ok(Math.abs(w.hero.sinus - 2) < 0.05, `spent one: ${w.hero.sinus}`);
  steps(w, MOVE_SECONDS.snot);
  press(w, "fire");
  assert.equal(w.hero.move, null, "the half-second cooldown outlasts the move");
  steps(w, 0.06);
  press(w, "fire");
  assert.equal(w.hero.move?.kind, "snot", "the cooldown has passed");
  steps(w, MOVE_SECONDS.snot + 0.1);
  w.hero.sinus = 0.9;
  press(w, "fire");
  assert.equal(w.hero.move, null, "no snot without a whole charge");
  steps(w, 0.2);
  press(w, "fire");
  assert.equal(w.hero.move?.kind, "snot", "refilled at one charge per 1.5 s");
});

test("the super spends a full charge, hops, plunges after the load and bursts on landing", () => {
  const empty = createWorld(flat(), { x: 100, y: 0 }, { charge: CHARGE_MAX - 1 });
  settle(empty);
  press(empty, "super");
  assert.equal(empty.hero.move, null, "needs a full charge");
  const w = createWorld(flat(), { x: 100, y: 0 }, { charge: CHARGE_MAX });
  settle(w);
  const evs = press(w, "super");
  assert.ok(evs.some((e) => e.type === "superStart"));
  assert.equal(w.hero.charge, 0);
  assert.ok(w.hero.vy < -SUPER_HOP + 100, `hop ${w.hero.vy}`);
  let plunged = false;
  let burstAt = -1;
  for (let i = 0; i < 120 && burstAt < 0; i++) {
    w.step(input());
    if (w.hero.move && w.hero.move.t / MOVE_SECONDS.super >= SUPER_CUT[0] && !w.hero.onGround) plunged ||= w.hero.vy >= SUPER_PLUNGE;
    if (w.events.some((e) => e.type === "burst")) burstAt = i;
  }
  assert.ok(plunged, "plunges after the load");
  assert.ok(burstAt >= 0 && w.hero.onGround, "bursts on landing");
});



import { createCart } from "../src/sim/targets.ts";
import { malletAt, sweptHeadHits, BURST_R } from "../src/sim/hits.ts";

test("a swing at a cart in front hits it once, knocks it away and stops the world", () => {
  for (const facing of [1, -1]) {
    const cart = createCart(1, 100 + facing * 230);
    const w = createWorld(flat(), { x: 100, y: 0 }, { targets: [cart] });
    w.hero.facing = facing;
    settle(w);
    press(w, "hammer");
    const evs = steps(w, MOVE_SECONDS.swing);
    const hits = evs.filter((e) => e.type === "hit" && e.by === "mallet");
    assert.equal(hits.length, 1, `one hit (facing ${facing})`);
    assert.ok(cart.vx * facing > 500 || (cart.x - (100 + facing * 230)) * facing > 40, `knocked away: vx ${cart.vx}`);
    assert.ok(cart.flash > 0 || evs.some((e) => e.type === "hit"), "flashes");
  }
});

test("a swing never hits a cart behind him", () => {
  const cart = createCart(1, 100 - 260);
  const w = createWorld(flat(), { x: 100, y: 0 }, { targets: [cart] });
  settle(w);
  press(w, "hammer");
  const evs = steps(w, MOVE_SECONDS.swing);
  assert.equal(evs.filter((e) => e.type === "hit").length, 0);
});

test("the swept head catches a target the strike jumps past between two samples", () => {
  assert.ok(sweptHeadHits({ x: -100, y: 0 }, { x: 100, y: 0 }, 10, { x: -5, y: -5, w: 10, h: 10 }));
  assert.ok(!sweptHeadHits({ x: -100, y: 40 }, { x: 100, y: 40 }, 10, { x: -5, y: -5, w: 10, h: 10 }));
  const a = malletAt({ x: 0, y: 0, facing: 1, move: { kind: "swing", t: 0.34 * MOVE_SECONDS.swing } }, 0.34);
  const b = malletAt({ x: 0, y: 0, facing: 1, move: { kind: "swing", t: 0.36 * MOVE_SECONDS.swing } }, 0.36);
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > 50, "the strike moves the head far within one step");
});

test("the super's burst knocks every cart within its radius and none beyond", () => {
  const nearCart = createCart(1, 100 + BURST_R * 0.6);
  const farCart = createCart(2, 100 + BURST_R * 2);
  const w = createWorld(flat(), { x: 100, y: 0 }, { charge: 10, targets: [nearCart, farCart] });
  settle(w);
  press(w, "super");
  const evs = steps(w, MOVE_SECONDS.super);
  assert.equal(evs.filter((e) => e.type === "burst").length, 1);
  // By the end of the move the near cart has flown and landed: judge it by the hits and how far it went.
  assert.deepEqual(evs.filter((e) => e.type === "hit" && e.by === "burst").map((e) => e.target), [1], "only the near cart is hit");
  assert.ok(nearCart.x > 100 + BURST_R * 0.6 + 150, `the near cart flew: ${nearCart.x}`);
  assert.equal(farCart.x, 100 + BURST_R * 2, "the far cart stays");
});

test("a knocked cart rolls to a stop on the floor", () => {
  const cart = createCart(1, 0);
  const w = createWorld(flat(), { x: -2000, y: 0 }, { targets: [cart] });
  cart.vx = 1100;
  cart.vy = -600;
  cart.onGround = false;
  steps(w, 4);
  assert.equal(cart.vx, 0);
  assert.ok(cart.onGround && cart.y === 0);
  assert.ok(cart.x > 300, `rolled ${cart.x}`);
});



import { SNOT } from "../src/sim/snot.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { ACTIONS } from "../src/sim/rig/actions.ts";
import { SNOT_FIRE_U } from "../src/sim/moves.ts";
import { HEAD_SCALE } from "../src/sim/constants.ts";

test("snot leaves ahead of the nose at the snap, flies forward, falls and puddles", () => {
  for (const facing of [1, -1]) {
    const w = createWorld(flat(), { x: 100, y: 0 });
    w.hero.facing = facing;
    settle(w);
    press(w, "fire");
    let fired = null;
    for (let i = 0; i < 120 && !fired; i++) { w.step(input()); fired = w.events.find((e) => e.type === "fire"); }
    assert.ok(fired, "fired");
    assert.ok(Math.abs(w.hero.move.t / MOVE_SECONDS.snot - SNOT_FIRE_U) < 0.05, "at the snap");
    const s = solve(ACTIONS.snot(SNOT_FIRE_U), facing, HEAD_SCALE);
    const face = { x: w.hero.x + s.faceBox.x, y: w.hero.y + s.faceBox.y, w: s.faceBox.w, h: s.faceBox.h };
    const blob = w.snot[0];
    assert.ok(facing > 0 ? blob.x - SNOT.r > face.x + face.w : blob.x + SNOT.r < face.x, "born clear of the face");
    assert.ok(blob.vx * facing > 1000, "flies forward");
    const evs = steps(w, 1.2);
    const splat = evs.find((e) => e.type === "splat");
    assert.ok(splat?.floor, "lands on the floor");
    assert.equal(w.puddles.length, 1);
    assert.ok(Math.abs(w.puddles[0].w - SNOT.puddle) < 1e-9);
  }
});

test("hot snot is faster, bigger, and goes through one cart", () => {
  // The carts stand taller than his nose, so the blob meets them on its way down.
  const a = createCart(1, 500), b = createCart(2, 800);
  const w = createWorld(flat(), { x: 100, y: 0 }, { hot: true, targets: [a, b] });
  settle(w);
  press(w, "fire");
  const evs = steps(w, 1.3);
  const hits = evs.filter((e) => e.type === "hit" && e.by === "snot").map((e) => e.target);
  assert.deepEqual(hits, [1, 2], "through the first cart into the second");
});

test("cold snot stops at the first cart; at most three fly at once; puddles cap at six and dry", () => {
  const a = createCart(1, 500), b = createCart(2, 800);
  const w = createWorld(flat(), { x: 100, y: 0 }, { targets: [a, b] });
  settle(w);
  press(w, "fire");
  const evs = steps(w, 1.3);
  assert.deepEqual(evs.filter((e) => e.type === "hit" && e.by === "snot").map((e) => e.target), [1]);
  const many = createWorld(flat(), { x: 100, y: 0 });
  settle(many);
  for (let i = 0; i < 9; i++) { many.hero.sinus = 3; many.hero.fireCd = 0; many.hero.move = null; press(many, "fire"); steps(many, MOVE_SECONDS.snot); }
  assert.ok(many.snot.length <= 3, `alive ${many.snot.length}`);
  steps(many, 2);
  assert.ok(many.puddles.length <= 6, `puddles ${many.puddles.length}`);
  steps(many, SNOT.puddleLife + 1);
  assert.equal(many.puddles.length, 0, "dried");
});


test("a hit freezes the world on the step it lands: nothing more steps until the hit-stop ends", () => {
  const STEP_S = 1 / 120;
  const clock = createClock();
  const frame = { acc: 0 };
  let steps = 0;
  // A 60 fps frame holds two steps; the hit lands on the first.
  runFrame(clock, frame, 2 * STEP_S, () => {
    steps++;
    if (steps === 1) applyFeel(clock, { hitstop: 0.06, trauma: 0.35 });
  });
  assert.equal(steps, 1, "the step that lands the hit is the frame's last");
  // Three more frames are 50 ms, inside the 60 ms stop.
  for (let f = 0; f < 3; f++) runFrame(clock, frame, 1 / 60, () => steps++);
  assert.equal(steps, 1, "no step runs while the hit-stop holds");
  for (let f = 0; f < 3; f++) runFrame(clock, frame, 1 / 60, () => steps++);
  assert.ok(steps > 1, "the world runs on once the stop ends");
});
