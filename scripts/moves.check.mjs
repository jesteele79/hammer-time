import test from "node:test";
import assert from "node:assert/strict";
import { feelOf } from "../src/sim/feel.ts";
import { applyFeel, createClock, tickClock } from "../src/sim/clock.ts";

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
