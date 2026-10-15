import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { TABLE, SEATS, RIVALS, onScreen, floorOf, dirOf, screenDeg, sub, dist } from "../src/sim/quests/hungry/table.ts";
import { DISH, FOODS, COURSES, SPECIALS, settled, stepDishes } from "../src/sim/quests/hungry/food.ts";

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
