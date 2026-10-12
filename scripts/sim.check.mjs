import test from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../src/sim/world.ts";
import { HERO_H, HERO_CROUCH_H, MAX_FALL, RUN, STEP } from "../src/sim/constants.ts";
import { HERO_HEIGHT } from "../src/sim/rig/skeleton.ts";

const NONE = {
  left: false,
  right: false,
  jump: false,
  run: false,
  down: false,
  fire: false,
  towel: false,
  hammer: false,
  super: false,
  lecture: false,
};
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = (extra = {}) => ({
  floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }],
  platforms: [],
  solids: [],
  passes: [],
  bounds: { x: -2000, y: -3000, w: 22000, h: 4000 },
  ...extra,
});
const run = (w, seconds, held = {}, pressedOnce = {}) => {
  let first = true;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.step(input(held, first ? pressedOnce : {}));
    first = false;
  }
};

test("a jump clears 1.15 Hammer heights and a cut jump about half", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  run(w, 0.05);
  let apex = 0;
  w.step(input({ jump: true }, { jump: true }));
  for (let i = 0; i < 240; i++) {
    w.step(input({ jump: true }));
    apex = Math.min(apex, w.hero.y);
  }
  assert.ok(-apex >= 1.15 * HERO_HEIGHT && -apex < 1.25 * HERO_HEIGHT, `apex ${-apex}`);
  const c = createWorld(flat(), { x: 100, y: 0 });
  run(c, 0.05);
  c.step(input({ jump: true }, { jump: true }));
  let cutApex = 0;
  for (let i = 0; i < 240; i++) {
    c.step(input());
    cutApex = Math.min(cutApex, c.hero.y);
  }
  assert.ok(-cutApex < 0.7 * HERO_HEIGHT, `cut apex ${-cutApex}`);
});

test("running reaches 640 px/s and stops within 0.2 s on release", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  run(w, 1.0, { right: true, run: true });
  assert.ok(Math.abs(w.hero.vx - RUN) < 1, `vx ${w.hero.vx}`);
  assert.equal(w.hero.state, "run");
  run(w, 0.2);
  assert.equal(w.hero.vx, 0, "stopped");
  assert.equal(w.hero.facing, 1);
});

test("coyote time and the jump buffer each allow a late or early jump", () => {
  const edge = flat({
    floor: [
      { x0: -2000, x1: 500, y0: 0, y1: 0 },
      { x0: 900, x1: 20000, y0: 0, y1: 0 },
    ],
  });
  const w = createWorld(edge, { x: 440, y: 0 });
  run(w, 0.05, { right: true, run: true });
  while (w.hero.onGround) w.step(input({ right: true, run: true }));
  run(w, 0.06, { right: true, run: true });
  w.step(input({ right: true, run: true, jump: true }, { jump: true }));
  assert.ok(w.hero.vy < -1000, "coyote jump fired");
  // Press within the last 30 px of a fall (about 0.03 s out), then let go before landing.
  const b = createWorld(flat(), { x: 100, y: -200 });
  while (b.hero.y < -30) b.step(input());
  b.step(input({ jump: true }, { jump: true }));
  while (!b.hero.onGround) b.step(input());
  b.step(input());
  assert.ok(b.hero.vy < -1000, "buffered jump fired on landing");
});

test("holding a direction while landing on a platform edge keeps him running", () => {
  const st = flat({ platforms: [{ x0: 700, x1: 1400, y: -220 }] });
  const w = createWorld(st, { x: 420, y: 0 });
  run(w, 0.1, { right: true, run: true });
  w.step(input({ right: true, run: true, jump: true }, { jump: true }));
  let landedOn = null;
  for (let i = 0; i < 360; i++) {
    w.step(input({ right: true, run: true, jump: true }));
    if (w.hero.onGround && w.hero.y <= -219 && landedOn === null) landedOn = i;
  }
  assert.ok(landedOn !== null, "landed on the platform");
  assert.ok(w.hero.vx > RUN - 40, `kept running: ${w.hero.vx}`);
  assert.ok(w.hero.x > 1200, `kept going: ${w.hero.x}`);
});

test("down crouches to 200 px, run + down slides under a pass, and he stands only when clear", () => {
  // A low ceiling: solid from far above down to 220 px over the floor.
  const st = flat({ passes: [{ x: 900, y: -1000, w: 500, h: 780 }] });
  const w = createWorld(st, { x: 600, y: 0 });
  run(w, 0.4, { right: true, run: true });
  run(w, 0.05, { right: true, run: true, down: true });
  assert.equal(w.hero.state, "slide");
  assert.equal(w.hero.h, HERO_CROUCH_H);
  run(w, 0.5, { right: true, down: true });
  assert.ok(w.hero.x > 900 && w.hero.x < 1400, `under the pass: ${w.hero.x}`);
  run(w, 0.3, {});
  assert.ok(w.hero.crouch, "stays low under the ceiling with nothing held");
  run(w, 1.5, { right: true });
  assert.equal(w.hero.h, HERO_H);
  assert.equal(w.hero.crouch, false);
});

test("a mezzanine floor overhead does not swallow the floor he walks on", () => {
  const st = flat({
    floor: [
      { x0: -2000, x1: 20000, y0: 0, y1: 0 },
      { x0: 1000, x1: 3000, y0: -520, y1: -520 },
    ],
  });
  const w = createWorld(st, { x: 500, y: 0 });
  run(w, 2, { right: true, run: true });
  assert.equal(w.hero.y, 0, `still on the lobby floor: ${w.hero.y}`);
  assert.ok(w.hero.x > 1200 && w.hero.onGround, `walked under the mezzanine: ${w.hero.x}`);
  // And a small step up is climbed, a small drop walked down, both within the snap.
  const steps = flat({
    floor: [
      { x0: -2000, x1: 600, y0: 0, y1: 0 },
      { x0: 600, x1: 1200, y0: -20, y1: -20 },
      { x0: 1200, x1: 20000, y0: 0, y1: 0 },
    ],
  });
  const s = createWorld(steps, { x: 400, y: 0 });
  run(s, 1, { right: true });
  assert.ok(s.hero.x > 600 && s.hero.x < 1200 && s.hero.y === -20 && s.hero.onGround, `on the step: ${s.hero.x},${s.hero.y}`);
  run(s, 2, { right: true });
  assert.ok(s.hero.x > 1200 && s.hero.y === 0 && s.hero.onGround, `back down: ${s.hero.x},${s.hero.y}`);
});

test("a long fall never exceeds the terminal speed", () => {
  const w = createWorld(flat({ bounds: { x: -2000, y: -9000, w: 22000, h: 10000 } }), { x: 100, y: -8000 });
  let fastest = 0;
  for (let i = 0; i < 240; i++) {
    w.step(input());
    fastest = Math.max(fastest, w.hero.vy);
  }
  assert.ok(fastest <= MAX_FALL + 1e-9 && fastest > 2000, `fastest ${fastest}`);
});

test("stepping is deterministic for the same inputs", () => {
  const a = createWorld(flat(), { x: 100, y: 0 });
  const b = createWorld(flat(), { x: 100, y: 0 });
  const seq = (i) => input({ right: i % 50 < 30, run: true, jump: i % 90 === 0 }, { jump: i % 90 === 0 });
  for (let i = 0; i < 600; i++) {
    a.step(seq(i));
    b.step(seq(i));
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test("a run from a standing start crosses a screen (1920 px at zoom 1) within 2.6 s", () => {
  const w = createWorld(flat(), { x: 0, y: 0 });
  run(w, 0.05);
  let t = 0;
  while (w.hero.x < 1920 && t < 5) {
    w.step(input({ right: true, run: true }));
    t += STEP;
  }
  assert.ok(t <= 2.6, `crossed in ${t.toFixed(3)} s`);
  assert.ok(t >= 2.3, `still a run, not a dash: ${t.toFixed(3)} s`);
});

test("a landing never holds him: full speed carries through, and a swing or a jump goes the step after", () => {
  for (const then of ["keep", "hammer", "jump"]) {
    const w = createWorld(flat(), { x: 100, y: 0 });
    run(w, 0.6, { right: true, run: true });
    w.step(input({ right: true, run: true, jump: true }, { jump: true }));
    let landed = null;
    // Jump held to the top, so it is a full jump and not a cut hop.
    for (let i = 0; i < 240 && !landed; i++) {
      w.step(input({ right: true, run: true, jump: true }));
      landed = w.events.find((e) => e.type === "land");
    }
    assert.ok(landed && landed.speed > 1400, `a real landing: ${landed?.speed}`);
    assert.ok(w.hero.vx > RUN - 1, `full speed through it: ${w.hero.vx}`);
    if (then === "hammer") {
      w.step(input({ right: true, run: true, hammer: true }, { hammer: true }));
      assert.equal(w.hero.move?.kind, "swing", "the swing starts at once");
    }
    if (then === "jump") {
      w.step(input({ right: true, run: true, jump: true }, { jump: true }));
      assert.ok(w.hero.vy < -1000, "he jumps again at once");
    }
  }
});

test("down and jump on a one-way platform drops through it; on the floor or a solid it does nothing of the kind", () => {
  // The platform sits above a jump's reach from the floor, so the crouch jump below cannot land on it.
  const st = flat({ platforms: [{ x0: 0, x1: 2000, y: -450 }], solids: [{ x: 3000, y: -180, w: 600, h: 180 }] });
  const w = createWorld(st, { x: 500, y: -450 });
  run(w, 0.1);
  assert.ok(w.hero.onGround && w.hero.y === -450, "standing on the platform");
  w.step(input({ down: true, jump: true }, { jump: true }));
  run(w, 0.6);
  assert.ok(w.hero.onGround && w.hero.y === 0, `dropped to the floor: ${w.hero.y}`);
  // On the floor or the desk, down + jump is the crouch jump it always was: he may go up, never through.
  for (const [x, top] of [[500, 0], [3300, -180]]) {
    const f = createWorld(st, { x, y: top });
    run(f, 0.1);
    f.step(input({ down: true, jump: true }, { jump: true }));
    let low = -Infinity;
    for (let i = 0; i < 180; i++) {
      f.step(input({ down: true }));
      low = Math.max(low, f.hero.y);
    }
    assert.ok(low <= top + 1e-6, `never through the surface at ${top}: ${low}`);
    assert.ok(f.hero.onGround && f.hero.y === top, `back on the surface at ${top}: ${f.hero.y}`);
  }
});

test("a belt carries him along it, and running against it still gets him off", () => {
  const st = flat({ floor: [{ x0: -2000, x1: 1000, y0: 0, y1: 0 }, { x0: 1000, x1: 1900, y0: -520, y1: 0, belt: 200 }, { x0: 1900, x1: 20000, y0: 0, y1: 0 }] });
  const ride = createWorld(st, { x: 1100, y: -470 });
  run(ride, 0.1);
  assert.ok(ride.hero.onGround, "standing on the escalator");
  const x0 = ride.hero.x;
  run(ride, 1);
  assert.ok(ride.hero.x - x0 > 150, `carried down: ${ride.hero.x - x0}`);
  const up = createWorld(st, { x: 1800, y: -60 });
  run(up, 0.1);
  run(up, 3, { left: true, run: true });
  assert.ok(up.hero.x < 1000, `ran up against it: ${up.hero.x}`);
});

test("jumping into the underside of a solid bumps it once, at the point he hit", () => {
  const st = flat({ solids: [{ x: 400, y: -545, w: 110, h: 110 }] });
  const w = createWorld(st, { x: 455, y: 0 });
  run(w, 0.1);
  w.step(input({ jump: true }, { jump: true }));
  const evs = [...w.events];
  for (let i = 0; i < 60; i++) {
    w.step(input({ jump: true }));
    evs.push(...w.events);
  }
  const bumps = evs.filter((e) => e.type === "bump");
  assert.equal(bumps.length, 1);
  assert.ok(Math.abs(bumps[0].y + 435) < 1 && bumps[0].x > 400 && bumps[0].x < 510, JSON.stringify(bumps[0]));
});

import { inputFrom } from "../src/sim/input.ts";

test("touch buttons and keys make one input: either holds an action, and a press is the step it first goes down", () => {
  const none = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
  const a = inputFrom(new Set(["ArrowRight"]), new Set(["jump"]), none);
  assert.ok(a.held.right && a.held.jump && a.pressed.right && a.pressed.jump);
  const b = inputFrom(new Set(), new Set(["jump", "right"]), a.held);
  assert.ok(b.held.right && b.held.jump && !b.pressed.right && !b.pressed.jump, "held from either source, pressed once");
  const c = inputFrom(new Set(["Space"]), new Set(), { ...b.held, jump: false });
  assert.ok(c.pressed.jump, "a key after the touch let go presses again");
});
