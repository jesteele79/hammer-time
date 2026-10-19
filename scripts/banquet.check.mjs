import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { TABLE, SEATS, RIVALS, onScreen, floorOf, dirOf, screenDeg, sub, dist } from "../src/sim/quests/hungry/table.ts";
import { DISH, FOODS, COURSES, SPECIALS, settled, stepDishes } from "../src/sim/quests/hungry/food.ts";
import { HUNGRY, WAVES, GRADES, gradeFor, createHungry, stepHungry, addDish, baseReach, handOf, land, hungryHint, reactionFor, slapFor, plateDeg, serverAt, planeAt, payback, bonk, GRADE_SCALE } from "../src/sim/quests/hungry/hungry.ts";
import { idlePlayer, steadyPlayer, sharpPlayer, playRound, suggestScale } from "../src/sim/quests/hungry/drive.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { RUN } from "../src/sim/run.ts";
import { CHARGE_MAX } from "../src/sim/moves.ts";
import { PATIENCE_MAX, damage } from "../src/sim/damage.ts";
import { createHero } from "../src/sim/hero.ts";
import { hintOf } from "../src/render/hud.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const near = (a, b, what, tol = 2 * STEP + 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not ${b}`);
/** A dish at rest (or moving) on the cloth. */
const dish = (id, x, y, vx = 0, vy = 0, kind = "ribeye") => ({ id, kind, x, y, vx, vy, r: FOODS[kind].r, fall: 0 });
const slide = (dishes, seconds, boxes = []) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepDishes(dishes, STEP, boxes);
};
const overlapOf = (ds) => {
  let worst = 0;
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) worst = Math.max(worst, ds[i].r + ds[j].r - dist(ds[i], ds[j]));
  return worst;
};

test("the table is a circle of 750 squashed to a 1500 by 555 oval on screen, as painted; the floor is drawn 370 under any point of it", () => {
  assert.ok(Math.abs(onScreen({ x: 0, y: 750 }).y + 277.5) < 1e-9);
  assert.ok(Math.abs(onScreen({ x: 0, y: -750 }).y - 277.5) < 1e-9);
  assert.equal(onScreen({ x: 750, y: 0 }).x, 750);
  assert.equal(floorOf({ x: -860, y: 0 }).y, TABLE.height);
  assert.ok(Math.abs(floorOf({ x: 0, y: 750 }).y - (-277.5 + TABLE.height)) < 1e-9);
  assert.equal(TABLE.height, 370);
});

test("each plate sits where the design puts it: the nurse's 1160 from his, the student's 538, the bellhop's 912, all inside his 30 degrees", () => {
  const h = SEATS.hammer.plate;
  assert.ok(Math.abs(dist(h, SEATS.nurse.plate) - 1160) < 1);
  assert.ok(Math.abs(dist(h, SEATS.student.plate) - 538) < 1);
  assert.ok(Math.abs(dist(h, SEATS.bellhop.plate) - 912) < 1);
  for (const id of RIVALS) {
    const deg = screenDeg(1, sub(SEATS[id].plate, h));
    assert.ok(Math.abs(deg) <= 30, `${id} at ${deg.toFixed(1)} degrees`);
  }
  for (const id of ["student", "bellhop"]) assert.ok(Math.hypot(SEATS[id].stand.x, SEATS[id].stand.y) > TABLE.r, `${id} stands behind the far rim`);
  assert.deepEqual([SEATS.hammer.facing, SEATS.student.facing, SEATS.bellhop.facing, SEATS.nurse.facing], [1, 1, -1, -1]);
});

test("a line aimed n degrees up on screen looks n degrees up, and is a unit on the table top: 30 on screen is about 57 on the table", () => {
  for (const facing of [1, -1])
    for (let deg = -30; deg <= 30; deg += 5) {
      const d = dirOf(facing, deg);
      assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9);
      assert.ok(Math.abs(screenDeg(facing, d) - deg) < 1e-9, `facing ${facing}, ${deg}`);
    }
  const d = dirOf(1, 30);
  assert.ok(Math.abs((Math.atan2(d.y, d.x) * 180) / Math.PI - 57.3) < 0.5);
});

test("the dishes: the shipped values, radii 26 to 34, three courses and six specials, sixteen in the food sheet's order", () => {
  assert.deepEqual([FOODS.shrimp.value, FOODS.bread.value, FOODS.ribeye.value, FOODS.pudding.value, FOODS.check.value], [80, 50, 300, 160, -400]);
  for (const f of Object.values(FOODS)) assert.ok(f.r >= 26 && f.r <= 34, f.name);
  assert.deepEqual(COURSES.appetizer, ["shrimp", "bread", "eggs", "kolache", "nuggets"]);
  assert.deepEqual(COURSES.entree, ["ribeye", "chicken", "brisket", "grits", "club"]);
  assert.deepEqual(COURSES.dessert, ["pie", "cheesecake", "pudding"]);
  assert.deepEqual(SPECIALS, ["coke", "nuts", "bucees", "hotsauce", "togo", "check"]);
  assert.deepEqual(Object.values(FOODS).map((f) => f.sheet).filter((s) => s !== null), [...Array(16).keys()]);
});

test("a dish slides, slows at 2.4 a second and stops: from 500 px/s it travels about 208 px", () => {
  const d = dish(1, 0, 0, 500, 0);
  slide([d], 4);
  assert.deepEqual([d.vx, d.vy], [0, 0]);
  assert.ok(Math.abs(d.x - 500 / DISH.friction) < 8, `${d.x}`);
  assert.ok(settled(d));
});

test("two dishes meeting bounce apart, slower than they came; one dropped exactly on another is pushed apart, never NaN", () => {
  const a = dish(1, -100, 0, 400, 0);
  const b = dish(2, 100, 0, -400, 0);
  slide([a, b], 0.3);
  assert.ok(a.vx < 0 && b.vx > 0, "they bounced");
  assert.ok(Math.abs(a.vx) < 400 * DISH.restitution && Math.abs(b.vx) < 400 * DISH.restitution, `${a.vx} ${b.vx}`);
  const c = dish(3, 50, 50);
  const d = dish(4, 50, 50);
  slide([c, d], 0.2);
  assert.ok(Number.isFinite(c.x + c.y + d.x + d.y));
  assert.ok(dist(c, d) >= c.r + d.r - 1, `still ${c.r + d.r - dist(c, d)} px into each other`);
});

test("the rim sends a dish back at 0.7 of its speed", () => {
  const d = dish(1, TABLE.r - 40, 0, 1000, 0, "shrimp");
  stepDishes([d], STEP);
  stepDishes([d], STEP);
  assert.ok(d.vx < 0 && -d.vx > 640 && -d.vx <= 700 + 1e-9, `${d.vx}`);
  assert.ok(Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-9);
});

test("nothing leaves the table: a hundred dishes fired from the middle at 2000 px/s stay inside the rim, part and come to rest", () => {
  const ds = Array.from({ length: 100 }, (_, i) => {
    const a = (i / 100) * Math.PI * 2;
    return dish(i + 1, Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 2000, Math.sin(a) * 2000, i % 2 ? "ribeye" : "shrimp");
  });
  for (let s = 0; s < 6 / STEP; s++) {
    stepDishes(ds, STEP);
    if (s % 60 === 0) for (const d of ds) assert.ok(Number.isFinite(d.x + d.y + d.vx + d.vy), `dish ${d.id} went NaN`);
  }
  for (const d of ds) assert.ok(Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-6, `dish ${d.id} at ${Math.hypot(d.x, d.y)}`);
  assert.ok(overlapOf(ds) < 4, `overlap ${overlapOf(ds)}`);
  assert.ok(ds.every(settled));
});

test("a dish dropping from the chute is not on the cloth until it lands: it neither moves nor knocks anything", () => {
  const d = { ...dish(1, 0, 0, 300, 0), fall: 0.2 };
  const under = dish(2, 0, 0);
  slide([d, under], 0.1);
  assert.deepEqual([d.x, d.y, under.x, under.y], [0, 0, 0, 0]);
  assert.ok(d.fall > 0);
  slide([d], 0.15);
  assert.ok(d.fall === 0 && d.x > 0);
});

test("a dish bounces off a suitcase on the cloth", () => {
  const d = dish(1, -200, 0, 600, 0, "shrimp");
  slide([d], 1, [{ x: -50, y: -40, w: 120, h: 80 }]);
  assert.ok(d.x <= -50 - d.r + 1e-6, `kept out of the case: ${d.x}`);
});

/** A round with nothing scheduled, the rivals asleep and the server away: Hammer alone at the table. */
const alone = (seed = 1) => createHungry(seed, { practice: true, schedule: false, rivals: false, server: false });
const P = SEATS.hammer.plate;
const run = (q, seconds, held = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    stepHungry(q, input(held), STEP);
    out.push(...q.events);
  }
  return out;
};
const press = (q, key, held = {}) => {
  stepHungry(q, input({ ...held, [key]: true }, { [key]: true }), STEP);
  return [...q.events];
};
/** A tap: the key down one step and up the next. */
const tap = (q, key = "jump") => [...press(q, key), ...run(q, STEP)];
/** Every phase change of his dive until it is over: the phase and when. */
const phases = (q) => {
  const out = [];
  let t = 0;
  let last = q.hammer.dive?.phase ?? null;
  while (q.hammer.dive && t < 3) {
    stepHungry(q, input(), STEP);
    t += STEP;
    const now = q.hammer.dive?.phase ?? null;
    if (now !== last) out.push({ phase: (last = now), t });
  }
  return out;
};

test("a tap: the hand goes 520 px out in 0.14 s, holds 0.04 s and slides back in 0.10 s", () => {
  const q = alone();
  press(q, "jump");
  assert.equal(q.hammer.dive.phase, "coil");
  const evs = run(q, STEP);
  assert.deepEqual(of(evs, "hhDive").map((e) => [e.who, e.charged]), [["hammer", false]]);
  const marks = phases(q);
  assert.deepEqual(marks.map((m) => m.phase), ["hold", "back", null]);
  near(marks[0].t, 0.14, "out");
  near(marks[1].t - marks[0].t, HUNGRY.hold, "hold");
  near(marks[2].t - marks[1].t, 0.1, "back");
});

test("his reach grows 10 px for every dish he eats and stops at 760", () => {
  const q = alone();
  assert.equal(baseReach(q), 520);
  q.score.eaten = 10;
  assert.equal(baseReach(q), 620);
  q.score.eaten = 40;
  assert.equal(baseReach(q), 760);
});

test("the sweep takes what it crosses on the way out, carries it to full stretch and flies it home in 0.25 s; nothing past the hand or wide of it", () => {
  const q = alone();
  const on = addDish(q, "ribeye", P.x + 300, P.y + 40);
  // Wide of his hand on screen: 260 px of the cloth's depth is 96 px on screen, past the hand's 55 and the dish's 27.
  const wide = addDish(q, "shrimp", P.x + 300, P.y + 260);
  const past = addDish(q, "club", P.x + 600, P.y);
  const behind = addDish(q, "pie", P.x - 100, P.y);
  const evs = tap(q);
  let t = 0;
  let held = null;
  let landed = null;
  while (t < 1) {
    stepHungry(q, input(), STEP);
    t += STEP;
    evs.push(...q.events);
    if (held === null && q.hammer.dive?.phase === "hold") held = t;
    if (landed === null && of(q.events, "hhLand").length) landed = t;
  }
  const left = q.dishes.map((d) => d.id);
  assert.ok(!left.includes(on.id), "the ribeye on his line");
  for (const d of [wide, past, behind]) assert.ok(left.includes(d.id), `the ${d.kind} stays`);
  assert.deepEqual(of(evs, "hhChomp").map((e) => [e.who, e.count]), [["hammer", 1]]);
  assert.deepEqual(of(evs, "hhLand").map((e) => [e.who, e.kind, e.points]), [["hammer", "ribeye", 300]]);
  near(landed - held, HUNGRY.fly, "flies home in 0.25 s");
  assert.deepEqual([q.score.plate, q.score.eaten], [300, 1]);
});

test("one dive every 0.3 s at most; holding the key never starts another; nothing while ducked, slapped or swinging", () => {
  const mash = alone();
  let dives = 0;
  for (let i = 0; i < Math.round(3 / STEP); i++) {
    const down = i % 2 === 0;
    stepHungry(mash, input({ jump: down }, { jump: down }), STEP);
    dives += of(mash.events, "hhDive").length;
  }
  assert.ok(dives >= 8 && dives <= 11, `${dives} dives in 3 s`);
  const held = alone();
  press(held, "jump");
  assert.equal(of(run(held, 3, { jump: true }), "hhDive").length, 1, "one, at full charge, then nothing");
  const ducked = alone();
  press(ducked, "jump", { down: true });
  assert.equal(ducked.hammer.dive, null, "ducked");
  const slapped = alone();
  slapped.hammer.stun = 1;
  press(slapped, "jump");
  assert.equal(slapped.hammer.dive, null, "stunned");
  const swinging = alone();
  press(swinging, "hammer");
  run(swinging, 0.05);
  press(swinging, "jump");
  assert.equal(swinging.hammer.dive, null, "mid-swing");
});

test("← and → swing his line up to 30 degrees either way; it stays where it is left; a dive goes out along it", () => {
  const q = alone();
  run(q, 2, { left: true });
  assert.equal(q.hammer.aim, 30);
  run(q, 1);
  assert.equal(q.hammer.aim, 30, "left where it was");
  run(q, 0.5, { right: true });
  assert.ok(Math.abs(q.hammer.aim - (30 - HUNGRY.aimRate * 0.5)) < 1e-6, `${q.hammer.aim}`);
  tap(q);
  const d = q.hammer.dive.dir;
  assert.ok(Math.abs(screenDeg(1, d) - q.hammer.aim) < 1e-9);
  run(q, 0.1);
  const hand = handOf(q.hammer);
  assert.ok(Math.abs(screenDeg(1, sub(hand, P)) - q.hammer.aim) < 1e-6, "the hand is on the line");
});

test("a held press charges from his tap reach to 1180 at 0.5 s, and goes out by itself at 0.5", () => {
  const q = alone();
  press(q, "jump");
  run(q, 0.31 - STEP, { jump: true });
  const mid = 520 + (1180 - 520) * ((0.31 - HUNGRY.tap) / (HUNGRY.charge - HUNGRY.tap));
  assert.ok(Math.abs(q.hammer.dive.reach - mid) < 15, `${q.hammer.dive.reach} not about ${mid}`);
  assert.equal(q.hammer.dive.phase, "coil");
  const evs = run(q, 0.25, { jump: true });
  assert.deepEqual(of(evs, "hhDive").map((e) => e.charged), [true]);
  assert.equal(q.hammer.dive.reach, 1180);
});

test("a charged dive that ends on a rival's plate robs its top dish for its value plus 100; a tap never robs, even reaching over it", () => {
  const q = alone();
  q.rivals.bellhop.plate.push("pie", "ribeye");
  q.hammer.aim = screenDeg(1, sub(SEATS.bellhop.plate, P));
  tap(q);
  run(q, 1);
  assert.deepEqual(q.rivals.bellhop.plate, ["pie", "ribeye"], "a tap falls short");
  press(q, "jump");
  const evs = run(q, 1.5, { jump: true });
  assert.deepEqual(of(evs, "hhRob").map((e) => [e.from, e.kind]), [["bellhop", "ribeye"]]);
  assert.deepEqual(of(evs, "hhLand").map((e) => [e.kind, e.points]), [["ribeye", 400]]);
  assert.deepEqual([q.rivals.bellhop.plate, q.rivals.bellhop.anger, q.score.robbed], [["pie"], 1, 1]);
  const over = alone();
  over.score.eaten = 24;
  over.rivals.student.plate.push("club");
  over.hammer.aim = screenDeg(1, sub(SEATS.student.plate, P));
  tap(over);
  run(over, 1);
  assert.ok(baseReach(over) > dist(P, SEATS.student.plate));
  assert.deepEqual(over.rivals.student.plate, ["club"], "a grown tap passes over it and takes nothing");
});

test("a robbed special pays out as if eaten; a robbed check still costs 400, with no 100 for the rob", () => {
  const q = alone();
  q.rivals.nurse.plate.push("check");
  q.rivals.bellhop.plate.push("nuts");
  q.hammer.aim = screenDeg(1, sub(SEATS.bellhop.plate, P));
  press(q, "jump");
  run(q, 1.5, { jump: true });
  q.hammer.aim = 0;
  press(q, "jump");
  run(q, 1.5, { jump: true });
  assert.deepEqual([q.score.specials, q.score.bill, q.score.plate], [["nuts"], true, 100 + 100 - 400]);
});

test("grabs less than 1.2 s apart build a combo: double from the fifth, triple from the tenth, the bonus counted apart", () => {
  const q = alone();
  for (let i = 0; i < 12; i++) {
    q.time = i * 0.5;
    land(q, "hammer", "bread");
  }
  assert.deepEqual([q.score.plate, q.score.bonus, q.score.best], [600, 550, 12]);
  q.time = 20;
  land(q, "hammer", "bread");
  assert.equal(q.score.chain, 1, "a gap of more than 1.2 s starts over");
});

test("the to-go box doubles his next five grabs; the check costs 400", () => {
  const q = alone();
  land(q, "hammer", "togo");
  for (let i = 0; i < 6; i++) {
    q.time += 2;
    land(q, "hammer", "club");
  }
  assert.equal(q.score.plate, 300 * 5 + 150);
  q.time += 2;
  land(q, "hammer", "check");
  assert.deepEqual([q.score.plate, q.score.bill], [300 * 5 + 150 - 400, true]);
});

test("the waves: 24, 12 and 12 appetizers, 16 and 10 entrees, the cart's 14 desserts, 10 more, then three a second; each special once between 5 and 50 s", () => {
  const q = createHungry(3, { practice: true, rivals: false, server: false });
  const dumps = [];
  const carts = [];
  while (!q.result) {
    stepHungry(q, input(), STEP);
    for (const e of of(q.events, "hhDump")) dumps.push({ t: q.time, ...e });
    carts.push(...of(q.events, "hhCart").map(() => q.time));
    if (Math.round(q.time / STEP) % 60 === 0)
      for (const d of q.dishes) {
        assert.ok(Number.isFinite(d.x + d.y + d.vx + d.vy), "no NaN");
        assert.ok(d.fall > 0 || Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-6, `a dish off the table at ${q.time}`);
      }
  }
  const waves = dumps.filter((d) => d.count > 1 && !d.cart);
  assert.deepEqual(waves.map((d) => [Math.floor(d.t), d.count]), WAVES.map((w) => [w.at, w.count]));
  for (const [i, w] of WAVES.entries()) assert.ok(waves[i].kinds.every((k) => FOODS[k].course === w.course), `wave ${i}`);
  const cart = dumps.filter((d) => d.cart);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].count, 14);
  assert.ok(cart[0].kinds.every((k) => FOODS[k].course === "dessert"));
  assert.ok(carts[0] >= HUNGRY.cart.at && carts[0] < HUNGRY.cart.at + 2, `the cart crashed at ${carts[0]}`);
  const singles = dumps.filter((d) => d.count === 1);
  const specials = singles.filter((d) => FOODS[d.kinds[0]].course === "special");
  assert.deepEqual(specials.map((d) => d.kinds[0]).sort(), [...SPECIALS].sort());
  assert.ok(specials.every((d) => d.t >= 5 && d.t <= 50 + STEP));
  const frenzy = singles.filter((d) => d.t >= HUNGRY.frenzy.from);
  assert.ok(frenzy.length >= 23 && frenzy.length <= 25, `${frenzy.length} in the frenzy`);
  assert.ok(new Set(frenzy.map((d) => FOODS[d.kinds[0]].course)).size >= 2, "from all three courses");
  assert.ok(q.dishes.length > 100, `a crowded table: ${q.dishes.length}`);
  // The last of the frenzy has only just landed: let the table settle, then nothing is left sitting in anything else.
  slide(q.dishes, 2);
  assert.ok(overlapOf(q.dishes) < 6, `overlap ${overlapOf(q.dishes)}`);
  assert.ok(q.dishes.every((d) => Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-6));
});

test("a wave pours: its dishes drop from the chute 0.03 s apart and spread from the middle", () => {
  const q = createHungry(4, { practice: true, rivals: false, server: false });
  stepHungry(q, input(), STEP);
  const falls = q.dishes.map((d) => d.fall).sort((a, b) => a - b);
  assert.equal(falls.length, 24);
  for (let i = 1; i < falls.length; i++) assert.ok(Math.abs(falls[i] - falls[i - 1] - HUNGRY.dump.pour) < 1e-9);
  run(q, 2.5);
  const spread = q.dishes.reduce((s, d) => s + Math.hypot(d.x, d.y), 0) / q.dishes.length;
  assert.ok(spread > 150, `spread ${spread}`);
});

test("the round ends at 60 s with a graded result, then nothing more happens; standing still is WATER ONLY", () => {
  const q = createHungry(5, { practice: true });
  const evs = run(q, 61);
  assert.equal(of(evs, "hhEnd").length, 1);
  assert.ok(q.result);
  assert.deepEqual([q.result.score, q.result.grade, q.result.full], [0, "WATER ONLY", false]);
  const t = q.time;
  run(q, 1);
  assert.equal(q.time, t);
  assert.deepEqual(GRADES.map(([, g]) => g), ["COMPED", "GOOD TIPPER", "SPLIT THE CHECK", "WATER ONLY"]);
  assert.equal(gradeFor(GRADES[0][0]), "COMPED");
  assert.equal(gradeFor(GRADES[1][0] - 1), "SPLIT THE CHECK");
});

test("what he ate is in the result: a can for the Coke Zero, the nuts, the Buc-ee's, the hot sauce; a full belly from GOOD TIPPER", () => {
  const q = alone();
  for (const k of ["coke", "nuts", "bucees", "hotsauce"]) land(q, "hammer", k);
  q.score.plate = GRADES[1][0];
  q.time = HUNGRY.round - STEP / 2;
  stepHungry(q, input(), STEP);
  const r = q.result;
  assert.deepEqual([r.cans, r.nuts, r.bucees, r.hot, r.full, r.grade === "GOOD TIPPER" || r.grade === "COMPED"], [1, true, true, true, true, true]);
});

test("the hint names what matters most", () => {
  const q = alone();
  assert.equal(hungryHint(q), "Tap ← → to pick a plate · hold Space to grab · E lectures · H bonks the server");
  q.hammer.lock = "nurse";
  assert.equal(hungryHint(q), "Hold Space to grab from the nurse's plate · ← → picks another");
  q.rivals.student.frozen = 1;
  assert.equal(hungryHint(q), "Lectured · they're frozen, grab now");
  q.score.togo = 3;
  assert.equal(hungryHint(q), "To-go box · next 3 grabs double");
  q.hammer.stun = 0.5;
  assert.equal(hungryHint(q), "Slapped · wait a second");
});

/** A round with the rivals awake but nothing scheduled and the server away: dishes placed by hand. */
const table = (seed = 1) => createHungry(seed, { practice: true, schedule: false, server: false });
/** Only `id` of the rivals awake: the others would take a test's dish first. */
const only = (q, id) => {
  for (const o of RIVALS) q.rivals[o].asleep = o !== id;
  return q;
};
/** Every ribeye anywhere: on the cloth, on a plate, in the air, in a hand. */
const ribeyes = (q) =>
  q.dishes.filter((d) => d.kind === "ribeye").length +
  [q.hammer, ...RIVALS.map((id) => q.rivals[id])].reduce((n, e) => n + e.plate.filter((k) => k === "ribeye").length + (e.dive?.haul ?? []).filter((h) => h.kind === "ribeye").length, 0) +
  q.flights.filter((f) => f.kind === "ribeye").length;
/** Every dive start for `seconds`: who, and when. */
const diveTimes = (q, seconds, held = {}) => {
  const out = [];
  let t = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    stepHungry(q, input(held), STEP);
    t += STEP;
    for (const e of of(q.events, "hhDive")) out.push({ who: e.who, t });
  }
  return out;
};

test("a rival dives at food that comes to rest within 450 px of its plate after its reaction: the student 0.45 s, the bellhop 0.33, the nurse 0.24", () => {
  for (const [id, reaction] of [["student", 0.45], ["bellhop", 0.33], ["nurse", 0.24]]) {
    const q = only(table(), id);
    const p = SEATS[id].plate;
    const side = SEATS[id].facing;
    addDish(q, "club", p.x + side * 250, p.y);
    const first = diveTimes(q, 2).find((d) => d.who === id);
    assert.ok(first, `${id} dived`);
    near(first.t, reaction + STEP, `${id}'s reaction`, 3 * STEP);
  }
});

test("a rival mashes 2 to 5 dives in a burst, one every 0.3 s, then waits out its reaction again; the food goes to its plate", () => {
  const q = only(table(7), "nurse");
  const p = SEATS.nurse.plate;
  for (let i = 0; i < 8; i++) addDish(q, i % 2 ? "shrimp" : "club", p.x - 120 - i * 34, p.y + (i % 2 ? 50 : -50));
  const ts = diveTimes(q, 4).filter((d) => d.who === "nurse").map((d) => d.t);
  const gaps = ts.slice(1).map((t, i) => t - ts[i]);
  // Within a burst a dive starts every 0.3 s; after it, the dive back (about 0.12 s) and her 0.24 s reaction come first.
  const burst = gaps.findIndex((g) => g > 0.34);
  assert.ok(burst >= 1 && burst <= 4, `a burst of ${burst + 1}: gaps ${gaps.map((g) => g.toFixed(2))}`);
  for (const g of gaps.slice(0, burst)) near(g, HUNGRY.cadence, "within the burst", 3 * STEP);
  assert.ok(q.rivals.nurse.plate.length >= 2);
  assert.equal(q.hammer.plate.length, 0, "never his");
});

test("a rival dives only within 50 degrees of level on screen, either way, and turns to face it; straight down it lets food lie", () => {
  const q = only(table(), "student");
  const p = SEATS.student.plate;
  addDish(q, "club", p.x, p.y - 300);
  assert.equal(diveTimes(q, 2).filter((d) => d.who === "student").length, 0, "straight down the screen");
  const back = only(table(), "student");
  addDish(back, "club", p.x - 220, p.y - 250);
  assert.equal(diveTimes(back, 2).filter((d) => d.who === "student").length, 1, "down and back toward his end");
});

test("anger: a robbery makes a rival a fifth quicker a level, never under 0.12 s; 12 s without one calms it a level", () => {
  const q = table();
  const r = q.rivals.student;
  assert.equal(reactionFor(r), 0.45);
  r.anger = 1;
  assert.ok(Math.abs(reactionFor(r) - 0.36) < 1e-9);
  r.anger = 20;
  assert.equal(reactionFor(r), 0.12);
  r.anger = 2;
  run(q, 12 + STEP);
  assert.equal(r.anger, 1);
  run(q, 12);
  assert.equal(r.anger, 0);
});

test("robbed, the student winds up 0.6 s and throws paper at him: a hit costs 150; ducked it sails over; out on the table it misses; swatted it is gone", () => {
  const len = dist(SEATS.student.plate, SEATS.hammer.stand);
  const hitQ = table();
  payback(hitQ, "student");
  const evs = run(hitQ, 0.6 + len / HUNGRY.plane.speed + 0.1);
  assert.equal(of(evs, "hhPlane").length, 1);
  assert.deepEqual(of(evs, "hhPaper").map((e) => e.hit), [true]);
  assert.deepEqual([hitQ.score.plate, hitQ.score.paper], [-150, 1]);
  const duck = table();
  payback(duck, "student");
  assert.deepEqual(of(run(duck, 2.2, { down: true }), "hhPaper").map((e) => e.hit), [false]);
  const out = table();
  payback(out, "student");
  // A full charge pressed 0.65 s before the plane arrives is out on the table, well past 100 px, when it does.
  run(out, 0.6 + len / HUNGRY.plane.speed - 0.65);
  press(out, "jump");
  const outEvs = run(out, 1.2, { jump: true });
  assert.deepEqual(of(outEvs, "hhPaper").map((e) => e.hit), [false], "out on the table at a full charge");
  const swat = table();
  payback(swat, "student");
  run(swat, 0.6 + (len * 0.6) / HUNGRY.plane.speed);
  assert.ok(dist(planeAt(swat.planes[0]), P) <= HUNGRY.bonk.reach);
  bonk(swat);
  assert.equal(swat.planes.length, 0);
  assert.equal(of(swat.events, "hhSwat").length, 1);
  assert.equal(of(run(swat, 2), "hhPaper").length, 0);
});

test("robbed, the bellhop slides a suitcase 250 px out along his line for 4 s: his dives stop short of it, the bonk slams it off", () => {
  const q = table();
  payback(q, "bellhop");
  assert.equal(q.suitcases.length, 1);
  const s = q.suitcases[0];
  assert.ok(Math.abs(s.x + s.w / 2 - (P.x + HUNGRY.suitcase.out)) < 1e-6);
  tap(q);
  assert.ok(q.hammer.dive.reach < HUNGRY.suitcase.out - HUNGRY.suitcase.w / 2, `stopped at ${q.hammer.dive.reach}`);
  run(q, 1);
  bonk(q);
  assert.equal(q.suitcases.length, 0);
  const lasts = table();
  payback(lasts, "bellhop");
  run(lasts, HUNGRY.suitcase.t + STEP);
  assert.equal(lasts.suitcases.length, 0, "gone after 4 s");
});

/** His hand held out at `at` (table px) for good: a dive frozen at full stretch there. */
const handAt = (q, at) => {
  const v = sub(at, P);
  const n = Math.hypot(v.x, v.y);
  q.hammer.dive = { phase: "hold", t: -99, held: 0, dir: { x: v.x / n, y: v.y / n }, reach: n, ext: n, charged: true, rob: null, haul: [{ kind: "ribeye", bonus: 0 }], trail: [], slap: false };
};

test("every diner guards their plate: a hand still within 300 px of it when their slap comes is slapped", () => {
  for (const id of RIVALS) {
    const q = only(table(), id);
    q.rivals[id].wait = 99;
    const plate = SEATS[id].plate;
    handAt(q, { x: plate.x - 150, y: plate.y - 120 });
    const before = q.dishes.length;
    let t = 0;
    let evs = [];
    while (!evs.length && t < 1) {
      stepHungry(q, input(), STEP);
      t += STEP;
      evs = of(q.events, "hhSlap");
    }
    assert.deepEqual(evs.map((e) => e.who), [id], `${id} slapped him`);
    near(t, slapFor(q.rivals[id]) + STEP, `${id}'s slap`, 2 * STEP);
    assert.equal(q.dishes.length, before + 1, "what his hand held dropped on the cloth");
    assert.deepEqual([q.hammer.dive.phase, q.hammer.stun, q.score.plate, q.score.slapped], ["back", HUNGRY.guard.stun, -HUNGRY.guard.cost, 1]);
    assert.equal(of(q.events, "hhSay")[0].who, id, "and says so");
    const lunge = q.rivals[id].dive;
    assert.ok(lunge?.slap, "their hand lunges at his");
    assert.equal(q.hammer.dive.haul.length, 0);
    const dishes = q.dishes.length;
    run(q, 0.3);
    assert.equal(q.dishes.length, dishes, "a slap sweeps nothing up");
  }
});

test("the slap comes after a diner's reaction times 0.6: calm, a clean in-and-out beats the student and the bellhop; angry, they are quicker; the nurse is quickest", () => {
  const q = table();
  assert.deepEqual(RIVALS.map((id) => +slapFor(q.rivals[id]).toFixed(3)), [0.27, 0.198, 0.144]);
  q.rivals.student.anger = 2;
  assert.ok(Math.abs(slapFor(q.rivals.student) - 0.45 * 0.64 * 0.6) < 1e-9);
  q.rivals.nurse.anger = 4;
  assert.equal(slapFor(q.rivals.nurse), HUNGRY.guard.floor);
  // Locked on the bellhop's plate and charged till the hand gets there: in his zone and out again before his slap; two
  // robberies angrier, he gets there first.
  for (const [anger, slaps] of [[0, 0], [2, 1]]) {
    const rob = only(table(), "bellhop");
    Object.assign(rob.rivals.bellhop, { anger, wait: 99 });
    rob.rivals.bellhop.plate.push("ribeye");
    tap(rob, "left");
    assert.equal(rob.hammer.lock, "bellhop");
    press(rob, "jump");
    const evs = run(rob, 1, { jump: true });
    assert.equal(of(evs, "hhRob").length, 1, "the rob lands either way");
    assert.equal(of(evs, "hhSlap").length, slaps, `anger ${anger}`);
  }
});

test("slapped on the way back, what he took is knocked out of the air onto the cloth: the nurse's plate is no rob without a lecture", () => {
  const q = only(table(), "nurse");
  q.rivals.nurse.plate.push("ribeye");
  q.rivals.nurse.wait = 99;
  tap(q, "left");
  tap(q, "right");
  assert.equal(q.hammer.lock, "nurse");
  run(q, 0.3);
  press(q, "jump");
  const evs = run(q, 1.5, { jump: true });
  assert.deepEqual([of(evs, "hhRob").length, of(evs, "hhSlap").length], [1, 1], "robbed, then slapped");
  assert.equal(of(evs, "hhLand").filter((e) => e.who === "hammer").length, 0, "nothing reached his plate");
  assert.ok(q.dishes.some((d) => d.kind === "ribeye") || q.rivals.nurse.plate.includes("ribeye"), "the ribeye fell on the cloth (and she may have it back)");
  // Lectured first, she is frozen: the same rob lands.
  const calm = only(table(), "nurse");
  calm.rivals.nurse.plate.push("ribeye");
  press(calm, "lecture");
  run(calm, 0.8);
  tap(calm, "left");
  tap(calm, "right");
  press(calm, "jump");
  const ok = run(calm, 1.5, { jump: true });
  assert.deepEqual([of(ok, "hhRob").length, of(ok, "hhSlap").length], [1, 0]);
  assert.deepEqual(of(ok, "hhLand").filter((e) => e.who === "hammer").map((e) => e.kind), ["ribeye"]);
});

test("he says it on every third slap of the round, not on each", () => {
  const q = only(table(), "nurse");
  q.rivals.nurse.wait = 99;
  const curses = [];
  for (let i = 0; i < 6; i++) {
    handAt(q, { x: 450, y: 60 });
    q.hammer.stun = 0;
    let evs = [];
    for (let t = 0; t < 1 && !evs.length; t += STEP) {
      stepHungry(q, input(), STEP);
      evs = of(q.events, "hhSlap");
    }
    curses.push(evs[0].curse);
    q.rivals.nurse.dive = null;
  }
  assert.deepEqual(curses, [false, false, true, false, false, true]);
});

test("a lectured, bonked or sleeping diner slaps nothing", () => {
  for (const set of [{ frozen: 3 }, { stun: 3 }, { asleep: true }]) {
    const q = only(table(), "nurse");
    Object.assign(q.rivals.nurse, set, { wait: 99 });
    handAt(q, { x: 450, y: 60 });
    assert.equal(of(run(q, 1), "hhSlap").length, 0, JSON.stringify(set));
  }
});

test("a tap of ← or → hops his line onto the next plate that way and locks it; past the last it lets go; held, it sweeps on after 0.2 s", () => {
  const q = alone();
  const evs = tap(q, "left");
  assert.deepEqual([q.hammer.lock, q.hammer.aim], ["bellhop", plateDeg("bellhop")]);
  assert.deepEqual(of(evs, "hhLock").map((e) => e.who), ["bellhop"]);
  run(q, 0.3);
  tap(q, "left");
  assert.deepEqual([q.hammer.lock, q.hammer.aim], ["student", plateDeg("student")]);
  run(q, 0.3);
  tap(q, "right");
  tap(q, "right");
  assert.deepEqual([q.hammer.lock, q.hammer.aim], ["nurse", 0], "back across to the nurse, straight ahead");
  run(q, 0.3);
  tap(q, "right");
  assert.equal(q.hammer.lock, null, "no plate nearer: the lock lets go");
  assert.ok(q.hammer.aim < 0 && q.hammer.aim > -1, `and the key sweeps instead: ${q.hammer.aim}`);
  // Held from a hop, the line stays on the plate for 0.2 s, then sweeps from there and the lock lets go.
  const held = alone();
  press(held, "left");
  run(held, HUNGRY.hop - 2 * STEP, { left: true });
  assert.deepEqual([held.hammer.lock, held.hammer.aim], ["bellhop", plateDeg("bellhop")]);
  run(held, 0.1, { left: true });
  assert.equal(held.hammer.lock, null);
  assert.ok(held.hammer.aim > plateDeg("bellhop") + 4, `swept on to ${held.hammer.aim}`);
});

test("locked on a plate, a held press goes out as soon as its reach gets there, stops on the plate and robs its top dish", () => {
  const q = alone();
  q.rivals.bellhop.plate.push("pie", "ribeye");
  tap(q, "left");
  press(q, "jump");
  let t = STEP;
  while (q.hammer.dive?.phase === "coil" && t < 1) {
    stepHungry(q, input({ jump: true }), STEP);
    t += STEP;
  }
  const along = dist(SEATS.bellhop.plate, P);
  const due = HUNGRY.tap + (HUNGRY.charge - HUNGRY.tap) * ((along - 520) / (HUNGRY.reach.charged - 520));
  near(t, due, "out the moment it reaches the plate", 3 * STEP);
  assert.ok(t < HUNGRY.charge - 0.1, "well before a full charge");
  assert.ok(Math.abs(q.hammer.dive.reach - along) < 1e-6, "it stops on the plate");
  const evs = run(q, 1, { jump: true });
  assert.deepEqual(of(evs, "hhRob").map((e) => [e.from, e.kind]), [["bellhop", "ribeye"]]);
  // Grown past the student's plate, a tap locked on it stops there and robs it.
  const tapQ = alone();
  tapQ.score.eaten = 24;
  tapQ.rivals.student.plate.push("club");
  tap(tapQ, "left");
  tap(tapQ, "left");
  assert.equal(tapQ.hammer.lock, "student");
  run(tapQ, 0.3);
  tap(tapQ);
  assert.deepEqual(of(run(tapQ, 1), "hhRob").map((e) => e.from), ["student"]);
});

test("E lectures the table: a fifth of the way in every diner awake and the server freeze 2.2 s, a level angrier; 7 s till the next; no dive meanwhile", () => {
  const q = createHungry(2, { practice: true, schedule: false });
  q.server.s = 0.5;
  q.server.wait = 99;
  for (const id of RIVALS) addDish(q, "club", SEATS[id].plate.x + SEATS[id].facing * 200, SEATS[id].plate.y);
  const evs = press(q, "lecture");
  assert.equal(of(evs, "hhLecture").length, 1);
  assert.equal(q.hammer.lecture, HUNGRY.lecture.move);
  press(q, "jump");
  assert.equal(q.hammer.dive, null, "no dive while he lectures");
  const land = run(q, HUNGRY.lecture.move * HUNGRY.lecture.deliver);
  assert.deepEqual(of(land, "hhSchooled").map((e) => e.who).sort(), ["bellhop", "nurse", "server", "student"]);
  assert.deepEqual(of(land, "hhSay").map((e) => e.who).sort(), ["bellhop", "nurse", "server", "student"], "each says something back");
  for (const id of RIVALS) assert.deepEqual([q.rivals[id].frozen > 2, q.rivals[id].anger], [true, 1], id);
  assert.ok(q.server.frozen > 2);
  const during = run(q, 2);
  assert.equal(of(during, "hhDive").filter((e) => e.who !== "hammer").length, 0, "frozen, nobody dives");
  assert.equal(of(during, "hhBus").length, 0, "nor clears the rim");
  assert.ok(of(run(q, 1), "hhDive").some((e) => e.who !== "hammer"), "then they go again");
  assert.equal(of(press(q, "lecture"), "hhLecture").length, 0, "not again so soon");
  run(q, HUNGRY.lecture.cooldown - 3.1);
  assert.equal(of(press(q, "lecture"), "hhLecture").length, 1, "7 s on");
});

test("COMPED packs a doggy bag in the result; any lower grade does not", () => {
  const q = alone();
  q.score.plate = GRADES[0][0];
  q.time = HUNGRY.round - STEP / 2;
  stepHungry(q, input(), STEP);
  assert.deepEqual([q.result.grade, q.result.doggy], ["COMPED", true]);
  const low = alone();
  low.score.plate = GRADES[0][0] - 1;
  low.time = HUNGRY.round - STEP / 2;
  stepHungry(low, input(), STEP);
  assert.deepEqual([low.result.grade, low.result.doggy], ["GOOD TIPPER", false]);
});

test("a doggy bag catches the hit that would knock him flat: he is only hurt, back at full patience with the pepper, and the bag is gone", () => {
  const stage = { floor: [{ x0: -5000, x1: 5000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -5000, y: -3000, w: 10000, h: 4000 } };
  const h = createHero({ x: 0, y: 0 }, { patience: 1, doggy: 1 });
  h.onGround = true;
  const ev = [];
  assert.ok(damage(h, stage, 100, ev));
  assert.deepEqual([h.move.kind, h.patience, h.hot, h.doggy], ["hurt", PATIENCE_MAX, true, 0]);
  assert.deepEqual(ev.map((e) => e.type).sort(), ["doggyBag", "hurt"]);
  const next = createHero({ x: 0, y: 0 }, { patience: 1 });
  damage(next, stage, 100, []);
  assert.equal(next.move.kind, "tumble", "without one, the last pip knocks him flat");
  // The clock running out is no hit: it knocks him flat, bag or no bag, and the bag stays his.
  const g = atBuffet(lobbyGame());
  g.world.hero.doggy = 1;
  g.run.time = STEP / 2;
  g.step(input());
  assert.deepEqual([g.world.hero.move?.kind, g.world.hero.doggy], ["tumble", 1]);
});

test("the server walks behind the far side and clears food resting near the rim beside her, one line every 6 s at most", () => {
  const q = createHungry(2, { practice: true, schedule: false, rivals: false });
  q.server.s = 0.5;
  q.server.wait = 99;
  const at = serverAt(q);
  const u = { x: at.x / Math.hypot(at.x, at.y), y: at.y / Math.hypot(at.x, at.y) };
  const rim = addDish(q, "pie", u.x * 680, u.y * 680);
  const middle = addDish(q, "pie", 0, 0);
  const evs = run(q, 0.1);
  assert.ok(!q.dishes.includes(rim) && q.dishes.includes(middle));
  assert.deepEqual(of(evs, "hhSay").map((e) => e.text), ["Are we still working on that?"]);
  addDish(q, "pie", u.x * 680, u.y * 680);
  assert.equal(of(run(q, 1), "hhSay").length, 0, "quiet for a while");
});

test("the bonk: food near him jumps toward the middle; a rival's hand in reach is stunned 2 s; the server at his corner drops four dishes and leaves for 15 s", () => {
  const q = createHungry(2, { practice: true, schedule: false });
  const d = addDish(q, "club", P.x + 150, P.y + 50);
  const st = q.rivals.student;
  const target = { x: -450, y: 150 };
  const v = sub(target, SEATS.student.plate);
  const n = Math.hypot(v.x, v.y);
  st.dive = { phase: "hold", t: 0, held: 0, dir: { x: v.x / n, y: v.y / n }, reach: n, ext: n, charged: false, rob: null, haul: [{ kind: "pie", bonus: 0 }], trail: [] };
  q.server.s = 1;
  q.server.wait = 99;
  const before = q.dishes.length;
  bonk(q);
  assert.ok((d.vx * 150 + d.vy * 50) / Math.hypot(150, 50) > HUNGRY.bonk.push * 0.99, "away from him");
  assert.deepEqual([st.stun, st.dive.phase], [HUNGRY.rival.stun, "back"]);
  assert.deepEqual(of(q.events, "hhStun").map((e) => e.who), ["student"]);
  assert.equal(of(q.events, "hhTray").length, 1);
  assert.equal(q.dishes.length, before + 1 + HUNGRY.server.tray, "the pie it held and the tray's four");
  assert.equal(q.server.away, HUNGRY.server.away);
  assert.deepEqual(of(q.events, "hhBonk").map((e) => e.hit), [true]);
  run(q, HUNGRY.server.away + 0.1);
  assert.deepEqual([q.server.away, q.server.s], [0, 0], "back from the right end");
});

test("the clash: his hand and a rival's within 110 px while both are out bounce back empty and scatter the food near them", () => {
  const q = only(table(), "bellhop");
  q.rivals.bellhop.wait = 99;
  const meet = { x: 0, y: 100 };
  const hv = sub(meet, P);
  const hn = Math.hypot(hv.x, hv.y);
  q.hammer.dive = { phase: "out", t: 0, held: 0, dir: { x: hv.x / hn, y: hv.y / hn }, reach: 1000, ext: hn - 40, charged: true, rob: null, haul: [{ kind: "ribeye", bonus: 0 }], trail: [] };
  const bv = sub({ x: 40, y: 100 }, SEATS.bellhop.plate);
  const bn = Math.hypot(bv.x, bv.y);
  q.rivals.bellhop.dive = { phase: "out", t: 0, held: 0, dir: { x: bv.x / bn, y: bv.y / bn }, reach: 1000, ext: bn - 20, charged: false, rob: null, haul: [{ kind: "pie", bonus: 0 }], trail: [] };
  // Near the clash, but behind both hands as they come on, so neither sweeps it this step.
  const nearby = addDish(q, "shrimp", -60, 90);
  const evs = run(q, STEP);
  assert.equal(of(evs, "hhClash").length, 1);
  assert.deepEqual([q.hammer.dive.phase, q.rivals.bellhop.dive.phase], ["back", "back"]);
  assert.ok(Math.hypot(nearby.vx, nearby.vy) > 300, "the food near them flew");
  assert.ok(q.dishes.some((x) => x.kind === "ribeye") && q.dishes.some((x) => x.kind === "pie"), "what they held dropped");
  assert.equal(of(run(q, 1), "hhLand").length, 0, "nothing reached a plate");
});

test("two sweeps over one dish in one step: it goes to one of them or drops in their clash, never to both", () => {
  const q = only(table(), "student");
  const food = addDish(q, "ribeye", -200, 200);
  const hv = sub(food, P);
  const hn = Math.hypot(hv.x, hv.y);
  q.hammer.dive = { phase: "out", t: 0, held: 0, dir: { x: hv.x / hn, y: hv.y / hn }, reach: hn + 40, ext: hn - 20, charged: false, rob: null, haul: [], trail: [] };
  const sv = sub(food, SEATS.student.plate);
  const sn = Math.hypot(sv.x, sv.y);
  q.rivals.student.dive = { phase: "out", t: 0, held: 0, dir: { x: sv.x / sn, y: sv.y / sn }, reach: sn + 40, ext: sn - 20, charged: false, rob: null, haul: [], trail: [] };
  stepHungry(q, input(), STEP);
  assert.equal(ribeyes(q), 1, "one ribeye, wherever it is");
  const evs = run(q, 1);
  assert.ok(of(evs, "hhLand").filter((e) => e.kind === "ribeye").length <= 1);
  assert.equal(ribeyes(q), 1);
});

const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);
/** The upper median: the middle of ten is the sixth. */
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

test("the scale the rounds ask for puts sharp at COMPED and steady at SPLIT THE CHECK or GOOD TIPPER, or says none can", () => {
  assert.equal(suggestScale(2400, 6000), 1.9);
  const k = suggestScale(2400, 6000);
  assert.ok(2400 >= 1200 * k && 2400 < 3000 * k && 6000 >= 3000 * k);
  assert.equal(suggestScale(5000, 5000), null, "sharp no better than steady: no one scale does both");
});

test("the grade lines keep the shipped proportions, scaled together", () => {
  assert.deepEqual(GRADES.map(([n]) => n), [3000, 2000, 1200, 0].map((n) => Math.round(n * GRADE_SCALE)));
});

test("over ten rounds each: standing still is WATER ONLY, a steady tapper's median SPLIT THE CHECK or GOOD TIPPER, a sharp player's COMPED", () => {
  for (const s of SEEDS) assert.equal(playRound(s, idlePlayer).grade, "WATER ONLY", `seed ${s}`);
  const steady = median(SEEDS.map((s) => playRound(s, steadyPlayer()).score));
  assert.ok(["SPLIT THE CHECK", "GOOD TIPPER"].includes(gradeFor(steady)), `steady median ${steady}: ${gradeFor(steady)}`);
  const sharp = median(SEEDS.map((s) => playRound(s, sharpPlayer()).score));
  assert.equal(gradeFor(sharp), "COMPED", `sharp median ${sharp}`);
});

test("the sharp player does what it says: dives, robs with a charge, and bonks the server", () => {
  // Seed 3 never puts an entree on top of a rival's plate once his hand sweeps what it passes over on screen: nothing to rob.
  const q = createHungry(1, { practice: true });
  const player = sharpPlayer();
  const counts = {};
  while (!q.result) {
    stepHungry(q, player(q), STEP);
    for (const e of q.events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  assert.ok((counts.hhDive ?? 0) > 40, `dives ${counts.hhDive}`);
  assert.ok((counts.hhRob ?? 0) >= 1, "a rob");
  assert.ok((counts.hhTray ?? 0) >= 1, "the server's tray");
});

const BUFFET = LOBBY.doors.find((d) => d.id === "buffet");
const lobbyGame = (opts = {}) => createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false, ...opts });
const until = (g, mode, seconds = 5, held = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP) && g.mode !== mode; i++) g.step(input(held));
  return g.mode;
};
const stepsG = (g, seconds, held = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    g.step(input(held));
    out.push(...g.events);
  }
  return out;
};
/** Him in play, standing on the floor in front of the BUFFET door. */
const atBuffet = (g) => {
  until(g, "play");
  Object.assign(g.world.hero, { x: BUFFET.x, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  g.step(input());
  return g;
};
const downAt = (g) => {
  g.step(input({ down: true }, { down: true }));
  return [...g.events];
};
/** The round's clock runs out on the next step. */
const endRound = (g) => {
  g.quest.time = HUNGRY.round - STEP / 2;
  g.step(input());
};

test("↓ on the floor in front of the BUFFET door opens the banquet: its card, then the round; never from the air or mid-swing", () => {
  const g = atBuffet(lobbyGame());
  assert.equal(hintOf(g), "↓ BUFFET · Hungry Hungry Hammer");
  const evs = downAt(g);
  assert.deepEqual(of(evs, "door").map((e) => [e.kind, e.id]), [["quest", "buffet"]]);
  assert.deepEqual([g.mode, g.quest.practice, g.questDoor.id], ["questCard", false, "buffet"]);
  assert.equal(until(g, "quest", RUN.cardT + 0.1), "quest");
  const air = atBuffet(lobbyGame());
  Object.assign(air.world.hero, { y: -200, onGround: false });
  downAt(air);
  assert.equal(air.mode, "play", "not in the air");
  const swing = atBuffet(lobbyGame());
  swing.step(input({ hammer: true }, { hammer: true }));
  downAt(swing);
  assert.equal(swing.mode, "play", "not mid-swing");
});

test("while he eats, the lobby waits: its clock, his heat, the shield and the pepper hold, and nobody moves", () => {
  const g = atBuffet(lobbyGame({ cast: true }));
  downAt(g);
  Object.assign(g.world.hero, { heat: 50, hot: true });
  g.run.star = 5;
  const time = g.run.time;
  const cast = g.world.cast.map((n) => [n.x, n.y]);
  stepsG(g, 6, { right: true, jump: true });
  assert.equal(g.mode, "quest");
  assert.deepEqual([g.run.time, g.run.star, g.world.hero.heat, g.world.hero.hot, g.world.hero.x], [time, 5, 50, true, BUFFET.x]);
  assert.deepEqual(g.world.cast.map((n) => [n.x, n.y]), cast);
});

test("the round's end waits on its tally; Continue stands him at the door with 0.6 s of grace and brings home the score, a can, a full smash, the shield and the pepper", () => {
  const g = atBuffet(lobbyGame());
  downAt(g);
  until(g, "quest");
  for (const k of ["coke", "nuts", "bucees", "hotsauce"]) land(g.quest, "hammer", k);
  g.quest.score.plate = 99999;
  Object.assign(g.world.hero, { charge: 0, hot: false, patience: 1 });
  const before = { score: g.run.score, cans: g.run.cans };
  endRound(g);
  assert.equal(g.mode, "questTally");
  const r = g.quest.result;
  stepsG(g, 3, { jump: true, down: true });
  assert.equal(g.mode, "questTally", "it waits");
  g.finishQuest();
  const h = g.world.hero;
  assert.equal(g.mode, "play");
  assert.deepEqual([h.x, h.y, h.onGround, h.move], [BUFFET.x, 0, true, null]);
  assert.ok(h.invuln >= RUN.questGrace - 1e-9);
  assert.equal(g.run.score, before.score + r.score + RUN.canPoints);
  assert.deepEqual([g.run.cans, h.charge, g.run.star, h.hot, h.patience], [before.cans + 1, CHARGE_MAX, RUN.star, true, PATIENCE_MAX]);
  assert.deepEqual(of(g.events, "questPaid").map((e) => e.score), [r.score]);
  assert.equal(g.quest, null);
});

test("COMPED from the BUFFET door sends him home with a doggy bag, kept through the next venue and a lost life; practice never does", () => {
  const g = atBuffet(lobbyGame());
  downAt(g);
  until(g, "quest");
  g.quest.score.plate = GRADES[0][0];
  endRound(g);
  assert.equal(g.mode, "questTally");
  g.finishQuest();
  assert.equal(g.world.hero.doggy, 1);
  assert.deepEqual(of(g.events, "questPaid").map((e) => e.doggy), [true]);
  // A pit or the clock (no hit for the bag to catch) costs a life: the bag comes back with him.
  g.world.hero.y = 99999;
  until(g, "dying", 1);
  until(g, "play", 8);
  assert.equal(g.run.lives, RUN.lives - 1, "a life was lost");
  assert.equal(g.world.hero.doggy, 1, "through a lost life");
  const pr = lobbyGame({ title: true });
  pr.newQuest(5);
  until(pr, "quest");
  pr.quest.score.plate = GRADES[0][0];
  endRound(pr);
  assert.equal(pr.quest.result.doggy, true, "the tally says what it would have won");
  assert.equal(pr.world.hero.doggy, 0, "but practice brings nothing home");
});

test("a full belly alone brings the pepper; a poor round brings its score and nothing else", () => {
  const full = atBuffet(lobbyGame());
  downAt(full);
  until(full, "quest");
  full.quest.score.plate = GRADES[1][0];
  Object.assign(full.world.hero, { hot: false, patience: 2 });
  endRound(full);
  full.finishQuest();
  assert.deepEqual([full.world.hero.hot, full.world.hero.patience], [true, PATIENCE_MAX]);
  const poor = atBuffet(lobbyGame());
  downAt(poor);
  until(poor, "quest");
  poor.quest.score.plate = 100;
  Object.assign(poor.world.hero, { hot: false, patience: 2, charge: 0 });
  const before = { score: poor.run.score, cans: poor.run.cans };
  endRound(poor);
  poor.finishQuest();
  assert.deepEqual([poor.run.score - before.score, poor.run.cans, poor.world.hero.hot, poor.world.hero.charge, poor.run.star], [100, before.cans, false, 0, 0]);
});

test("the door opens once a shift: shut through the stash and a lost life, open on a new shift; a key held from the tally opens nothing", () => {
  const g = atBuffet(lobbyGame());
  downAt(g);
  until(g, "quest");
  endRound(g);
  g.finishQuest();
  stepsG(g, 0.5, { down: true });
  assert.equal(g.mode, "play", "the held key opens nothing");
  g.step(input());
  downAt(g);
  assert.equal(g.mode, "play", "spent");
  assert.equal(hintOf(g), "BUFFET · thank you, come again");
  // To the stash and back.
  const staff = LOBBY.doors.find((d) => d.kind === "stash");
  Object.assign(g.world.hero, { x: staff.x, y: 0, vx: 0, onGround: true });
  g.step(input());
  downAt(g);
  assert.equal(g.level.id, "stash");
  g.step(input());
  const cart = STASH.doors.find((d) => d.kind === "return");
  Object.assign(g.world.hero, { x: cart.x, y: cart.y, vx: 0, onGround: true });
  g.step(input());
  downAt(g);
  assert.equal(g.level.id, "lobby");
  g.step(input());
  atBuffet(g);
  downAt(g);
  assert.equal(g.mode, "play", "still spent after the stash");
  // A lost life down the shaft.
  Object.assign(g.world.hero, { x: 6060, y: 0, vx: 0 });
  assert.equal(until(g, "card", 6), "card");
  atBuffet(g);
  downAt(g);
  assert.equal(g.mode, "play", "still spent after a lost life");
  g.newRun(9);
  atBuffet(g);
  downAt(g);
  assert.equal(g.mode, "questCard", "a new shift opens it again");
});

test("a break in the round stops its clock and its charge, and comes back to the round", () => {
  const g = atBuffet(lobbyGame());
  downAt(g);
  until(g, "quest");
  g.step(input({ jump: true }, { jump: true }));
  const t = g.quest.time;
  const held = g.quest.hammer.dive.held;
  g.togglePause();
  assert.equal(g.mode, "pause");
  stepsG(g, 1, { jump: true });
  assert.deepEqual([g.quest.time, g.quest.hammer.dive.held], [t, held]);
  g.togglePause();
  assert.equal(g.mode, "quest");
});

test("practice from the start screen: a round on its own that never touches a shift; its tally waits for Play again or the start screen", () => {
  const g = lobbyGame({ title: true });
  assert.equal(g.mode, "title");
  g.newQuest(5);
  assert.deepEqual([g.mode, g.quest.practice, g.questDoor], ["questCard", true, null]);
  until(g, "quest");
  endRound(g);
  assert.equal(g.mode, "questTally");
  g.finishQuest();
  assert.equal(g.mode, "questTally", "Continue is the door's: practice waits for Play again or the start screen");
  const first = g.quest;
  g.newQuest(6);
  assert.ok(g.mode === "questCard" && g.quest !== first, "Play again: a fresh round");
  until(g, "quest");
  endRound(g);
  g.toTitle();
  assert.deepEqual([g.mode, g.quest, g.run.score], ["title", null, 0]);
  const shift = atBuffet(lobbyGame());
  downAt(shift);
  until(shift, "quest");
  endRound(shift);
  shift.newQuest(7);
  assert.equal(shift.mode, "questTally", "no practice over a door's tally");
});

test("a robbery sets off the rival's payback: the bellhop's suitcase, the student's paper", () => {
  const b = alone();
  b.rivals.bellhop.plate.push("ribeye");
  b.hammer.aim = screenDeg(1, sub(SEATS.bellhop.plate, P));
  press(b, "jump");
  const bevs = run(b, 1.5, { jump: true });
  assert.equal(of(bevs, "hhRob").length, 1);
  assert.ok(of(bevs, "hhSuitcase").some((e) => e.on) && b.suitcases.length === 1, "his suitcase slides out");
  const s = alone();
  s.rivals.student.plate.push("club");
  s.hammer.aim = screenDeg(1, sub(SEATS.student.plate, P));
  press(s, "jump");
  const sevs = run(s, 3, { jump: true });
  assert.equal(of(sevs, "hhRob").length, 1);
  assert.equal(of(sevs, "hhPlane").length, 1, "the student throws paper");
});

test("the hand takes what it passes over on screen: the cloth's depth is drawn squashed, so 150 px beside his line on the table is under his hand", () => {
  // Straight along the table: 150 px of depth either side is 55 px on screen, inside the hand's 110 px sweep.
  const q = alone();
  const behindLine = addDish(q, "ribeye", P.x + 300, P.y + 150);
  const beforeLine = addDish(q, "club", P.x + 250, P.y - 150);
  const clear = addDish(q, "shrimp", P.x + 350, P.y + 260);
  tap(q);
  run(q, 1);
  const left = q.dishes.map((d) => d.id);
  assert.ok(!left.includes(behindLine.id) && !left.includes(beforeLine.id), "both dishes his hand passed over");
  assert.ok(left.includes(clear.id), "a dish clear of his hand on screen stays");
  // Aimed 20 degrees up the table: a dish 50 px beside the line on screen, either side of it, is his too.
  for (const side of [1, -1]) {
    const a = alone();
    a.hammer.aim = 20;
    const dir = dirOf(1, 20);
    const hand = { x: P.x + dir.x * 300, y: P.y + dir.y * 300 };
    const n = { x: -Math.sin((20 * Math.PI) / 180), y: Math.cos((20 * Math.PI) / 180) };
    const beside = addDish(a, "ribeye", hand.x + side * n.x * 50, hand.y + (side * n.y * 50) / TABLE.squash);
    tap(a);
    run(a, 1);
    assert.ok(!a.dishes.some((d) => d.id === beside.id), `aimed up, the dish 50 px ${side > 0 ? "above" : "below"} his line on screen`);
  }
});

// The belly-flop (owner, 2026-10-18): COMPED from the BUFFET door turns his slide into a belly-flop for the shift.
import { createWorld } from "../src/sim/world.ts";
import { createCast } from "../src/sim/cast.ts";
import { HERO_CROUCH_H, HERO_H, RUN as RUN_PX } from "../src/sim/constants.ts";
import { RESTAURANT } from "../src/sim/levels/restaurant.ts";
import { hudOf, FLOP_HINT } from "../src/render/hud.ts";

const bare = (extra = {}) => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 }, ...extra });
/** Him on a bare floor at `x`, with the belly-flop or not, and staff standing where `spawns` put them. */
const flopWorld = (flop, spawns = [], x = 0, stage = bare()) => {
  const w = createWorld(stage, { x, y: 0 }, { flop });
  w.cast = createCast({ cast: spawns, carts: [] }, []);
  w.step(input());
  return w;
};
const stepsW = (w, seconds, held = {}, pressed = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.step(input(held, i === 0 ? pressed : {}));
    out.push(...w.events);
  }
  return out;
};
/** At a full run to the right, ↓ goes down: a slide, or with the belly-flop a flop. */
const goDown = (w, seconds = 0.6) => {
  Object.assign(w.hero, { vx: RUN_PX, facing: 1, onGround: true });
  return stepsW(w, seconds, { right: true, run: true, down: true }, { down: true });
};
const npcOf = (w, spawn) => w.cast.find((n) => n.spawn === spawn);
/** COMPED from the BUFFET door, back in the lobby. */
const compedAtDoor = (g) => {
  atBuffet(g);
  downAt(g);
  until(g, "quest");
  g.quest.score.plate = GRADES[0][0];
  endRound(g);
  g.finishQuest();
  return g;
};

test("COMPED's result teaches the belly-flop along with the doggy bag; any lower grade neither", () => {
  const q = alone();
  q.score.plate = GRADES[0][0];
  q.time = HUNGRY.round - STEP / 2;
  stepHungry(q, input(), STEP);
  assert.deepEqual([q.result.grade, q.result.doggy, q.result.flop], ["COMPED", true, true]);
  const low = alone();
  low.score.plate = GRADES[0][0] - 1;
  low.time = HUNGRY.round - STEP / 2;
  stepHungry(low, input(), STEP);
  assert.deepEqual([low.result.grade, low.result.flop], ["GOOD TIPPER", false]);
});

test("COMPED from the BUFFET door gives him the belly-flop for the shift: kept through a lost life and the next venue, gone with a new shift; practice never gives it", () => {
  const g = compedAtDoor(createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT] }, 3, { cast: false }));
  assert.equal(g.world.hero.flop, true);
  assert.deepEqual(of(g.events, "questPaid").map((e) => e.flop), [true]);
  assert.equal(hudOf(g, null).flop, true, "the HUD shows he has it");
  g.world.hero.y = 99999;
  until(g, "dying", 1);
  until(g, "play", 8);
  assert.equal(g.world.hero.flop, true, "through a lost life");
  g.world.hero.x = 15800;
  for (let i = 0; i < Math.round(20 / STEP) && g.mode !== "card"; i++) g.step(input({ right: true }));
  assert.deepEqual([g.mode, g.level.id, g.world.hero.flop], ["card", "restaurant", true], "into the next venue");
  g.newRun(4);
  assert.equal(g.world.hero.flop, false, "a new shift starts without it");
  const low = atBuffet(lobbyGame());
  downAt(low);
  until(low, "quest");
  low.quest.score.plate = GRADES[0][0] - 1;
  endRound(low);
  low.finishQuest();
  assert.equal(low.world.hero.flop, false, "short of COMPED, no flop");
  const pr = lobbyGame({ title: true });
  pr.newQuest(5);
  until(pr, "quest");
  pr.quest.score.plate = GRADES[0][0];
  endRound(pr);
  assert.equal(pr.quest.result.flop, true, "the tally says what it would have won");
  assert.equal(pr.world.hero.flop, false, "but practice teaches nothing");
});

test("with the belly-flop, run + ↓ flops: the same slide, its own event, as low as a slide", () => {
  const w = flopWorld(true);
  const evs = goDown(w, 0.05);
  assert.equal(w.hero.state, "slide");
  assert.equal(w.hero.h, HERO_CROUCH_H);
  assert.deepEqual([of(evs, "flop").length, of(evs, "slide").length], [1, 0]);
  const plain = flopWorld(false);
  const pevs = goDown(plain, 0.05);
  assert.deepEqual([of(pevs, "flop").length, of(pevs, "slide").length], [0, 1]);
  assert.equal(plain.hero.x, w.hero.x, "a flop slides exactly as far and as fast as a slide");
});

test("a belly-flop knocks over the staff it runs into, scored like a runaway cart's chain; a plain slide only bumps them", () => {
  const spawns = [
    { id: "a", person: "server-1", x: 520, y: 0 },
    { id: "b", person: "bellhop-1", x: 700, y: 0 },
  ];
  const w = flopWorld(true, spawns, 300);
  const before = w.hero.patience;
  const evs = goDown(w);
  const hits = of(evs, "castHit");
  assert.deepEqual([hits[0]?.id, hits[0]?.by], [npcOf(w, "a").id, "flop"], "the first one flopped into");
  assert.deepEqual(hits.map((e) => e.id).sort(), [npcOf(w, "a").id, npcOf(w, "b").id].sort(), "both go over");
  assert.deepEqual(of(evs, "chain").map((e) => [e.count, e.points]), [[1, 100], [2, 200]]);
  for (const s of ["a", "b"]) assert.ok(["fly", "down"].includes(npcOf(w, s).act), `${s} is off their feet: ${npcOf(w, s).act}`);
  assert.equal(w.hero.patience, before, "untouched");
  const plain = flopWorld(false, [{ id: "a", person: "server-1", x: 520, y: 0 }], 300);
  const pevs = goDown(plain);
  assert.equal(of(pevs, "castHit").length, 0, "a slide knocks nobody over");
  assert.notEqual(npcOf(plain, "a").act, "fly");
});

test("a staffer coming at him is flopped over too: the flop wins, and he keeps his patience", () => {
  const w = flopWorld(true, [{ id: "a", person: "server-1", x: 640, y: 0 }], 300);
  const s = npcOf(w, "a");
  Object.assign(s, { act: "attack", actT: 0, facing: -1, noticed: true, mark: s.x });
  const before = w.hero.patience;
  const evs = goDown(w);
  assert.deepEqual(of(evs, "castHit").map((e) => [e.by, e.id]), [["flop", s.id]]);
  assert.equal(of(evs, "hurt").length + of(evs, "tumble").length, 0, "no hit on him");
  assert.equal(w.hero.patience, before);
  // Without the flop the same rush costs him a pip.
  const p = flopWorld(false, [{ id: "a", person: "server-1", x: 640, y: 0 }], 300);
  Object.assign(npcOf(p, "a"), { act: "attack", actT: 0, facing: -1, noticed: true, mark: 640 });
  const pevs = goDown(p);
  assert.equal(of(pevs, "hurt").length, 1, "a slide into her rush is a hit");
});

test("the belly-flop still slides under a low ceiling, and he stands only when clear", () => {
  const w = flopWorld(true, [], 550, bare({ passes: [{ x: 900, y: -1000, w: 500, h: 780 }] }));
  stepsW(w, 0.4, { right: true, run: true });
  const evs = stepsW(w, 0.05, { right: true, run: true, down: true }, { down: true });
  assert.equal(of(evs, "flop").length, 1);
  assert.equal(w.hero.h, HERO_CROUCH_H);
  stepsW(w, 0.5, { right: true, down: true });
  assert.ok(w.hero.x > 900 && w.hero.x < 1400, `under the pass: ${w.hero.x}`);
  stepsW(w, 0.3);
  assert.ok(w.hero.crouch, "stays low under the ceiling");
  stepsW(w, 1.5, { right: true });
  assert.deepEqual([w.hero.h, w.hero.crouch], [HERO_H, false]);
});

test("the first time he has it the hint teaches the belly-flop, until his first flop", () => {
  const g = compedAtDoor(lobbyGame());
  Object.assign(g.world.hero, { x: BUFFET.x + 900, vx: 0, onGround: true });
  g.step(input());
  assert.equal(hintOf(g), FLOP_HINT);
  assert.equal(g.run.flopped, false);
  Object.assign(g.world.hero, { vx: RUN_PX, facing: 1 });
  g.step(input({ right: true, run: true, down: true }, { down: true }));
  assert.equal(g.run.flopped, true);
  stepsG(g, 1.5);
  assert.notEqual(hintOf(g), FLOP_HINT, "once he has flopped it is not taught again");
  const without = atBuffet(lobbyGame());
  Object.assign(without.world.hero, { x: BUFFET.x + 900 });
  without.step(input());
  assert.notEqual(hintOf(without), FLOP_HINT, "not without the move");
});

test("a flop past a door with ↓ held never opens it on the way: the STAFF ONLY door stays shut until he is up and asks", () => {
  const g = lobbyGame();
  until(g, "play");
  const staff = LOBBY.doors.find((d) => d.kind === "stash");
  g.world.hero.flop = true;
  Object.assign(g.world.hero, { x: staff.x - 250, y: 0, vx: RUN_PX, vy: 0, facing: 1, onGround: true, move: null });
  const evs = [];
  for (let i = 0; i < Math.round(0.45 / STEP); i++) {
    g.step(input({ right: true, run: true, down: true }, i === 0 ? { down: true } : {}));
    evs.push(...g.events);
  }
  assert.equal(of(evs, "flop").length, 1);
  assert.equal(of(evs, "door").length, 0, "not mid-flop");
  assert.equal(g.level.id, "lobby");
  // Up again in front of it, ↓ opens it as ever.
  for (let i = 0; i < Math.round(1 / STEP); i++) g.step(input());
  Object.assign(g.world.hero, { x: staff.x, vx: 0 });
  g.step(input());
  downAt(g);
  assert.equal(g.level.id, "stash");
});

test("the hint warns of paper only while a plane is still coming, not while a missed one sails past", () => {
  const q = createHungry(1, { schedule: false, rivals: false, server: false });
  q.planes.push({ from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, d: 0, wait: 0, done: false, hit: false });
  assert.equal(hungryHint(q), "Paper incoming · ↓ ducks, H swats");
  q.planes[0].done = true;
  assert.notEqual(hungryHint(q), "Paper incoming · ↓ ducks, H swats");
});
