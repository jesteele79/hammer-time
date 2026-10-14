import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { PIG, PIG_ID, createPig, hitPig, stepPig } from "../src/sim/pig.ts";
import { STOMP } from "../src/sim/cast.ts";
import { CHARGE_MAX } from "../src/sim/moves.ts";
import { feelOf } from "../src/sim/feel.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const ARENA = [600, 3900];
const flat = () => ({ floor: [{ x0: -400, x1: 4800, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -400, y: -1600, w: 5200, h: 2200 } });
/** Him at `hero` with two pips (as a run starts him), the pig asleep at `x` in an arena from 600 to 3900: inside it, the first step wakes it. */
const fight = (hero = 300, x = 2600) => createWorld(flat(), { x: hero, y: 0 }, { patience: 2, pig: createPig({ x, arena: ARENA }) });
/** The pig awake and resting for a long while: a still target. */
const still = (w) => Object.assign(w.pig, { state: "recover", timer: 99 });
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const press = (w, key) => { w.step(input({ [key]: true }, { [key]: true })); return [...w.events]; };
const of = (evs, type) => evs.filter((e) => e.type === type);
/** Every change of the pig's state for `seconds`: the state, when, and where the pig was. */
const record = (w, seconds) => {
  const out = [];
  let t = 0, last = w.pig.state, top = 0, landT = null;
  while (t < seconds) {
    w.step(input());
    t += STEP;
    top = Math.min(top, w.pig.y);
    if (of(w.events, "pigLand").length) landT = t;
    if (w.pig.state !== last) out.push({ s: (last = w.pig.state), t, x: w.pig.x });
  }
  return { states: out, top, landT };
};
const near = (a, b, what) => assert.ok(Math.abs(a - b) <= 2 * STEP + 1e-9, `${what}: ${a} not ${b}`);

test("the pig sleeps until he crosses into the arena, then winds up facing him for 1.1 s", () => {
  const w = fight(300);
  assert.equal(of(steps(w, 1), "pigWake").length, 0);
  assert.equal(w.pig.state, "asleep");
  w.hero.x = 610;
  const evs = steps(w, STEP);
  assert.equal(of(evs, "pigWake").length, 1);
  assert.deepEqual([w.pig.state, w.pig.facing, of(evs, "pigWindup")[0]?.hop], ["windup", -1, false]);
  assert.ok(Math.abs(w.pig.timer - PIG.windupFirst) < 1e-9, `a fresh 1.1 s: ${w.pig.timer}`);
});

test("its pattern: the first wind-up 1.1 s, a charge at 880 for 0.85 s, a 1.35 s rest, wind-ups of 0.9 s, and every third attack a hop", () => {
  // Him far to the right, the pig on his side of the middle: every attack goes his way and none reaches an edge.
  const { states, top, landT } = record(fight(3700, 1500), 10.5);
  assert.deepEqual(states.slice(0, 10).map((s) => s.s), ["windup", "charge", "recover", "windup", "charge", "recover", "windup", "hop", "recover", "windup"]);
  const dur = (i) => states[i + 1].t - states[i].t;
  near(dur(0), PIG.windupFirst, "the first wind-up");
  near(dur(1), PIG.chargeT, "a charge");
  near(dur(2), PIG.recover, "the rest");
  near(dur(3), PIG.windup, "a later wind-up");
  near(dur(7), PIG.hopT, "a hop");
  assert.ok(Math.abs(states[2].x - states[1].x - PIG.charge * PIG.chargeT) < 15, `880 px/s for 0.85 s: ${states[2].x - states[1].x}`);
  assert.ok(Math.abs(states[8].x - states[7].x - PIG.hopVx * PIG.hopAir) < 15, `forward while in the air: ${states[8].x - states[7].x}`);
  assert.ok(Math.abs(-top - PIG.hopHigh) < 8, `260 high: ${-top}`);
  near(landT - states[7].t, PIG.hopAir, "0.6 s in the air");
});

test("at half its HP or below it winds up in 0.7 s and charges at 1040", () => {
  const w = fight(3700, 1500);
  w.pig.hp = 6;
  const { states } = record(w, 6);
  near(states[3].t - states[2].t, PIG.recover, "the rest");
  near(states[4].t - states[3].t, PIG.windupHalf, "the wind-up at half HP");
  assert.ok(Math.abs(states[2].x - states[1].x - PIG.chargeHalf * PIG.chargeT) < 15, `1040 px/s: ${states[2].x - states[1].x}`);
});

test("it locks its direction when the wind-up starts: he can run behind it and it charges the way it faced", () => {
  const w = fight(3000, 2000);
  w.step(input());
  assert.equal(w.pig.facing, 1);
  w.hero.x = 1500;
  while (w.pig.state === "windup") w.step(input());
  assert.deepEqual([w.pig.state, w.pig.facing, Math.sign(w.pig.vx)], ["charge", 1, 1]);
});

test("near the arena's left edge it faces right and near its right edge left, whichever side he is on", () => {
  const left = fight(700, 1400);
  left.step(input());
  assert.equal(left.pig.facing, 1, "800 px from the left edge, him on its left");
  const right = fight(3800, 3500);
  right.step(input());
  assert.equal(right.pig.facing, -1, "400 px from the right edge, him on its right");
});

test("a charge that reaches its limit ends there, 540 px inside the left edge, and it rests: him in the corner, untouched", () => {
  const w = fight(700, 1900);
  while (w.pig.state !== "recover") w.step(input());
  assert.ok(Math.abs(w.pig.x - (ARENA[0] + PIG.keepLeft + PIG.w / 2)) < 1e-6, `stopped at ${w.pig.x}`);
  assert.equal(w.pig.vx, 0);
  assert.equal(w.hero.patience, 2);
});

test("12 HP: a hit takes its amount and counts as a bonk or a snot; another within 0.38 s does not count; asleep it takes none", () => {
  const p = createPig({ x: 2000, arena: ARENA });
  const evs = [];
  assert.equal(hitPig(p, "bonk", 1, 0, 0, evs), false, "asleep");
  Object.assign(p, { state: "recover", timer: 9 });
  assert.equal(hitPig(p, "bonk", 1, 0, 0, evs), true);
  assert.equal(hitPig(p, "snot", 1, 0, 0, evs), false, "inside the gap");
  assert.deepEqual([p.hp, p.bonks, p.snots, p.hurtT], [11, 1, 0, PIG.gap]);
  p.hurtT = 0;
  assert.equal(hitPig(p, "bonk", 2, 0, 0, evs), true, "the super smash's two");
  assert.deepEqual([p.hp, p.bonks], [9, 2]);
  assert.deepEqual(of(evs, "pigHit").map((e) => [e.by, e.hp, e.bonks, e.snots]), [["bonk", 11, 1, 0], ["bonk", 9, 2, 0]]);
});

test("at least 3 bonks and 3 snots: a hit that would end it short holds it at 1 HP, MORE BONKS before MORE SNOT; then it goes down for 3000", () => {
  const p = Object.assign(createPig({ x: 2000, arena: ARENA }), { state: "recover", timer: 9, hp: 1, bonks: 1, snots: 1 });
  const evs = [];
  hitPig(p, "snot", 1, 0, 0, evs);
  assert.deepEqual([p.hp, of(evs, "pigHold").map((e) => e.word)], [1, ["MORE BONKS"]]);
  Object.assign(p, { hurtT: 0, bonks: 3 });
  hitPig(p, "bonk", 1, 0, 0, evs);
  assert.deepEqual([p.hp, p.state, of(evs, "pigHold").map((e) => e.word)], [1, "recover", ["MORE BONKS", "MORE SNOT"]]);
  Object.assign(p, { hurtT: 0, snots: 2 });
  hitPig(p, "snot", 1, 0, 0, evs);
  assert.deepEqual([p.hp, p.state, of(evs, "pigDown").map((e) => e.points)], [0, "defeated", [PIG.points]]);
  p.hurtT = 0;
  assert.equal(hitPig(p, "bonk", 1, 0, 0, evs), false, "nothing counts once it is down");
});

test("the mallet bonks it once a swing", () => {
  const w = fight(1500, 1700);
  still(w);
  w.hero.facing = 1;
  const evs = [...press(w, "hammer"), ...steps(w, 1)];
  assert.deepEqual(of(evs, "pigHit").map((e) => e.by), ["bonk"]);
  assert.equal(w.pig.hp, 11);
  const again = [...press(w, "hammer"), ...steps(w, 1)];
  assert.equal(of(again, "pigHit").length, 1, "the next swing counts again");
  assert.equal(w.pig.hp, 10);
});

test("a swing that meets it inside the gap is not spent: a later sample of that swing counts once the gap is over", () => {
  const pig = Object.assign(createPig({ x: 2000, arena: ARENA }), { state: "recover", timer: 99, hurtT: 0.05 });
  const hero = { x: 1700, y: 0, w: 110, h: 300, vx: 0, vy: 0, invuln: 0, onGround: true, move: { kind: "swing", victims: [] } };
  // The mallet head inside the pig's body this step, as `swingContact` leaves its path in `world.swing`.
  const w = { pig, hero, swing: [{ x: 1900, y: -200 }], hits: [] };
  const evs = [];
  stepPig(w, STEP, 0, false, evs);
  assert.deepEqual([of(evs, "pigHit").length, hero.move.victims], [0, []], "inside the gap: nothing, and the swing not spent");
  pig.hurtT = 0;
  stepPig(w, STEP, 0, false, evs);
  assert.deepEqual([of(evs, "pigHit").length, hero.move.victims], [1, [PIG_ID]]);
  stepPig(w, STEP, 0, false, evs);
  assert.equal(of(evs, "pigHit").length, 1, "then spent: once a swing");
});

test("a snot, hot or not, takes 1 and ends on it: nothing goes through or past", () => {
  for (const hot of [false, true]) {
    const w = fight(1300, 1900);
    still(w);
    Object.assign(w.hero, { facing: 1, hot });
    const evs = [...press(w, "fire"), ...steps(w, 1.5)];
    assert.deepEqual(of(evs, "pigHit").map((e) => e.by), ["snot"], `hot ${hot}`);
    assert.equal(w.pig.hp, 11);
    assert.equal(of(evs, "splat").filter((e) => e.floor).length, 0, `hot ${hot}: no puddle beyond it`);
    assert.equal(w.snot.length, 0);
  }
});

test("the super smash takes 2 and counts as a bonk", () => {
  const w = fight(1500, 1800);
  still(w);
  Object.assign(w.hero, { facing: 1, charge: CHARGE_MAX });
  const evs = [...press(w, "super"), ...steps(w, 2)];
  assert.deepEqual(of(evs, "pigHit").map((e) => [e.by, e.hp, e.bonks]), [["bonk", 10, 1]]);
});

test("landing on it from above bounces him off, no harm either way; walking into it costs a pip, but not in grace or under a Buc-ee's", () => {
  const w = fight(1000, 1600);
  still(w);
  // Falling 1200 px/s from just above its top: this step his feet sink into it.
  Object.assign(w.hero, { x: 1600, y: -402, vx: 0, vy: 1200, onGround: false });
  const evs = steps(w, STEP, { jump: true });
  assert.equal(of(evs, "pigBounce").length, 1);
  assert.ok(Math.abs(w.hero.vy + STOMP.held) < 1, `bounced: ${w.hero.vy}`);
  assert.deepEqual([w.hero.patience, w.pig.hp], [2, 12]);
  Object.assign(w.hero, { x: 1450, y: 0, vx: 0, vy: 0, onGround: true, invuln: 3 });
  steps(w, 0.2);
  assert.deepEqual([w.hero.patience, w.pig.hp], [2, 12], "in grace (a Buc-ee's keeps him in it): nothing either way");
  Object.assign(w.hero, { x: 1450, y: 0, vx: 0, vy: 0, onGround: true, invuln: 0 });
  steps(w, 0.2);
  assert.equal(w.hero.patience, 1, "walking into it");
});

test("the lecture does nothing to it but a shrug", () => {
  const w = fight(1500, 1750);
  still(w);
  w.hero.facing = 1;
  // A lecture needs his feet on the floor: one step lands him.
  w.step(input());
  const evs = [...press(w, "lecture"), ...steps(w, 2)];
  assert.equal(of(evs, "pigShrug").length, 1);
  assert.equal(w.pig.hp, 12);
});

test("while the fight is on he is held between the arena's edges; once it is down he may leave", () => {
  const w = fight(700, 2600);
  steps(w, 2, { left: true, run: true });
  assert.ok(Math.abs(w.hero.x - (ARENA[0] + w.hero.w / 2)) < 1e-6, `held at ${w.hero.x}`);
  w.pig.state = "defeated";
  steps(w, 1, { left: true, run: true });
  assert.ok(w.hero.x < ARENA[0], `free to go: ${w.hero.x}`);
});

test("a pig beaten in the air comes down to the floor and stays there, harmless", () => {
  const w = fight(3700, 1500);
  Object.assign(w.pig, { state: "hop", timer: 1, vy: -800, vx: 520, onGround: false, y: -100, hp: 1, bonks: 3, snots: 3 });
  hitPig(w.pig, "bonk", 1, 0, 0, []);
  steps(w, 1);
  assert.deepEqual([w.pig.state, w.pig.y, w.pig.onGround, w.pig.vx], ["defeated", 0, true, 0]);
  Object.assign(w.hero, { x: w.pig.x - 100, y: 0, invuln: 0 });
  steps(w, 0.2);
  assert.equal(w.hero.patience, 2, "a deflated pig does no harm");
});

test("the snapshot carries a copy of the pig", () => {
  const w = fight(700);
  w.step(input());
  const s = w.snapshot();
  s.pig.x = -1;
  assert.notEqual(w.pig.x, -1);
  assert.equal(createWorld(flat(), { x: 0, y: 0 }).snapshot().pig, null);
});

test("the fight's feel: a hit pushes the camera in, the defeat slows time to 0.6 for 0.3 s, a landing shakes it", () => {
  assert.deepEqual(feelOf({ type: "pigHit", by: "snot", x: 0, y: 0, hp: 11, bonks: 0, snots: 1 }).zoom, { amount: 1.12, seconds: 0.4 });
  assert.deepEqual(feelOf({ type: "pigDown", x: 0, y: 0, points: 3000 }).slowmo, { scale: 0.6, seconds: 0.3 });
  assert.equal(feelOf({ type: "pigLand", x: 0, y: 0 }).trauma, 0.5);
});
