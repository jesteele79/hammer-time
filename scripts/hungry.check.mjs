import test from "node:test";
import assert from "node:assert/strict";
import { CHUTE, FOODS, TABLE, makeFood, onTable, stepFood } from "../src/game/quests/food.ts";

const run = (f, seconds, blockers = []) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepFood(f, 1 / 60, blockers);
};

test("food falls from the chute, bounces once, then slides and slows", () => {
  const f = makeFood(1, "ribeye", CHUTE.x, CHUTE.y, 0, 0);
  let landings = 0,
    wasUp = true;
  for (let i = 0; i < 180; i++) {
    stepFood(f, 1 / 60, []);
    if (f.y >= TABLE.top && wasUp) landings++;
    wasUp = f.y < TABLE.top;
  }
  assert.equal(landings, 2, "one bounce, then it settles");
  assert.ok(onTable(f));
  assert.equal(f.value, FOODS.ribeye.value);
  const s = makeFood(2, "pie", 150, TABLE.top, 100, 0);
  s.bounced = true;
  run(s, 1);
  assert.ok(Math.abs(s.vx - 88) < 1, `friction keeps 88% a second: ${s.vx}`);
});

test("food bounces off the table ends and off a suitcase", () => {
  const f = makeFood(1, "bread", TABLE.right - 20, TABLE.top, 200, 0);
  f.bounced = true;
  run(f, 0.3);
  assert.ok(f.vx < 0 && f.x <= TABLE.right - 6, "off the right end");
  const g = makeFood(2, "bread", 100, TABLE.top, 150, 0);
  g.bounced = true;
  run(g, 0.5, [{ x0: 140, x1: 156 }]);
  assert.ok(g.vx < 0 && g.x <= 140 - 6, "off the suitcase");
});
