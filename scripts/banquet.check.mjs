import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { TABLE, SEATS, RIVALS, onScreen, floorOf, dirOf, screenDeg, sub, dist } from "../src/sim/quests/hungry/table.ts";
import { DISH, FOODS, COURSES, SPECIALS, settled, stepDishes } from "../src/sim/quests/hungry/food.ts";
import { HUNGRY, WAVES, GRADES, gradeFor, createHungry, stepHungry, addDish, baseReach, handOf, land, hungryHint } from "../src/sim/quests/hungry/hungry.ts";

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
  const wide = addDish(q, "shrimp", P.x + 300, P.y + 120);
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

test("the hint names what matters most, as shipped", () => {
  const q = alone();
  assert.equal(hungryHint(q), "Tap Space to dive · hold to reach farther and rob a plate · ← → aim · H bonks the server");
  q.score.togo = 3;
  assert.equal(hungryHint(q), "To-go box · next 3 grabs double");
  q.hammer.stun = 0.5;
  assert.equal(hungryHint(q), "Slapped · wait a second");
});
