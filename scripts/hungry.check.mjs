import test from "node:test";
import assert from "node:assert/strict";
import {
  APPETIZERS,
  CHUTE,
  DESSERTS,
  ENTREES,
  FOODS,
  SPECIALS,
  TABLE,
  makeFood,
  onTable,
  stepFood,
} from "../src/game/quests/food.ts";

import {
  HungryQuest,
  HAND0,
  REACH_BASE,
  REACH_MAX,
  ROUND_SECONDS,
  TAP_SECONDS,
  CHARGE_SECONDS,
  gradeFor,
} from "../src/game/quests/hungry.ts";
import { seededRandom } from "../src/game/levels.ts";
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
const input = (held = {}, pressed = {}) => ({
  held: { ...NONE, ...held },
  pressed: { ...NONE, ...pressed },
});
function quest(seed = 7) {
  const said = [],
    comics = [];
  const q = new HungryQuest();
  const audio = new Proxy({}, { get: () => () => {} });
  q.enter(
    {
      audio,
      images: {},
      drawHero() {},
      rng: seededRandom(seed),
      say: (t) => said.push(t),
      comic: (x, y, t) => comics.push(t),
      reduced: false,
    },
    { table: "banquet", practice: true },
  );
  return { q, said, comics };
}
/** No dumps, specials, cart, server or rival reactions: only what a test places. */
function quiet(seed) {
  const t = quest(seed);
  t.q.schedule = [];
  t.q.specialsAt = [];
  t.q.cartAt = Infinity;
  t.q.server.away = 1e9;
  for (const r of t.q.rivals) r.base = 1e9;
  return t;
}
const steps = (q, n, inp = input()) => {
  for (let i = 0; i < n; i++) q.step(1 / 60, inp);
};
/** Press, hold for `seconds`, release, and let the dive spring back. */
function dive(q, seconds) {
  q.step(1 / 60, input({ jump: true }, { jump: true }));
  for (let i = 1; i < Math.round(seconds * 60); i++) q.step(1 / 60, input({ jump: true }));
  steps(q, 32);
}
const place = (q, kind, x) => {
  const f = makeFood(q.food.length + 100, kind, x, TABLE.top, 0, 0);
  f.bounced = true;
  q.food.push(f);
  return f;
};

test("a tap dives to the base reach; reach grows 10 px per item and caps at 250", () => {
  const { q } = quiet();
  assert.equal(q.reach(), REACH_BASE);
  place(q, "bread", HAND0 + REACH_BASE);
  dive(q, 0.05);
  assert.equal(q.eaten, 1);
  assert.equal(q.plateTotal, FOODS.bread.value);
  assert.equal(q.reach(), REACH_BASE + 10);
  q.eaten = 40;
  assert.equal(q.reach(), REACH_MAX);
});

test("holding charges the dive from the base reach to 250 by half a second", () => {
  const { q } = quiet();
  place(q, "ribeye", HAND0 + REACH_MAX);
  dive(q, CHARGE_SECONDS + 0.05);
  assert.equal(q.eaten, 1, "a full charge reaches 250 px");
  const short = quiet().q;
  place(short, "ribeye", HAND0 + REACH_MAX);
  dive(short, TAP_SECONDS);
  assert.equal(short.eaten, 0, "a tap does not");
});

test("holding the button never repeats the dive; presses mid-dive, ducking or stunned are ignored", () => {
  const { q } = quiet();
  let dives = 0,
    was = false;
  const count = () => {
    const out = q.lunge?.phase === "out";
    if (out && !was) dives++;
    was = out;
  };
  q.step(1 / 60, input({ jump: true }, { jump: true }));
  for (let i = 0; i < 240; i++) {
    q.step(1 / 60, input({ jump: true }));
    count();
  }
  assert.equal(dives, 1, "a held button charges once, dives once at full charge, then waits");
  const m = quiet().q;
  m.step(1 / 60, input({}, { jump: true }));
  m.step(1 / 60, input());
  for (let i = 0; i < 20; i++) m.step(1 / 60, input({}, { jump: true }));
  steps(m, 20);
  assert.equal(m.lunge, null, "presses during the dive and spring-back start nothing");
  const d = quiet().q;
  d.step(1 / 60, input({ down: true }, { jump: true, down: true }));
  assert.equal(d.lunge, null, "no dive while ducking");
  d.stun = 1;
  d.step(1 / 60, input({}, { jump: true }));
  assert.equal(d.lunge, null, "no dive while stunned");
});

test("the check costs 400; the to-go box doubles the next five grabs", () => {
  const { q, said } = quiet();
  place(q, "check", HAND0 + REACH_BASE);
  dive(q, 0.05);
  assert.equal(q.plateTotal, -400);
  assert.ok(said.includes("YOU picked up the bill?"));
  const t = quiet().q;
  place(t, "togo", HAND0 + REACH_BASE);
  dive(t, 0.05);
  for (let i = 0; i < 6; i++) {
    place(t, "bread", HAND0 + t.reach());
    dive(t, 0.05);
  }
  assert.equal(t.plateTotal, 5 * 100 + 50, "five doubled breads, then a plain one");
});

test("grabs inside 1.2 s chain a combo: x2 from the fifth, x3 from the tenth", () => {
  const { q } = quiet();
  for (let i = 0; i < 10; i++) {
    place(q, "bread", HAND0 + q.reach());
    dive(q, 0.05);
  }
  assert.equal(q.combo, 10);
  assert.equal(q.comboBonus, 5 * 50 + 50 * 2, "grabs 5-9 add one extra, grab 10 adds two");
});

test("specials map to rewards and a big plate fills the belly", () => {
  const { q } = quiet();
  for (const kind of ["coke", "nuts", "buccees", "hotsauce"]) {
    place(q, kind, HAND0 + q.reach());
    dive(q, 0.05);
  }
  q.plateTotal += 2500;
  q.time = ROUND_SECONDS - 1 / 120;
  q.step(1 / 60, input());
  const r = q.result();
  assert.deepEqual(
    {
      coins: r.coins,
      charge: r.charge,
      star: r.star,
      hot: r.hot,
      lives: r.lives,
      fullBelly: r.fullBelly,
    },
    { coins: 1, charge: 3, star: true, hot: true, lives: 0, fullBelly: true },
  );
  assert.ok(r.lines.length >= 2);
});

test("the round ends at 60 s with a graded result", () => {
  const { q } = quest();
  steps(q, ROUND_SECONDS * 60 - 2);
  assert.equal(q.result(), null);
  steps(q, 3);
  const r = q.result();
  assert.ok(r && r.grade === gradeFor(r.score) && r.score >= 0);
  for (const [score, grade] of [
    [3000, "COMPED"],
    [2999, "GOOD TIPPER"],
    [2000, "GOOD TIPPER"],
    [1999, "SPLIT THE CHECK"],
    [1200, "SPLIT THE CHECK"],
    [1199, "WATER ONLY"],
    [0, "WATER ONLY"],
  ])
    assert.equal(gradeFor(score), grade);
});

test("the waves: 5 appetizers at once, 3 every 4 s, entrees from 20 s, the cart spills 8 at 42 s, specials once each", () => {
  const { q } = quest(3);
  q.server.away = 1e9;
  for (const r of q.rivals) r.base = 1e9;
  const seen = new Map();
  const spawnedBy = (t) => {
    while (q.time < t - 1e-9) {
      q.step(1 / 60, input());
      for (const f of q.food) if (!seen.has(f.id)) seen.set(f.id, { kind: f.kind, at: q.time });
    }
    return [...seen.values()];
  };
  assert.equal(spawnedBy(0.05).filter((f) => APPETIZERS.includes(f.kind)).length, 5);
  assert.equal(spawnedBy(4.05).filter((f) => APPETIZERS.includes(f.kind)).length, 8);
  assert.equal(spawnedBy(20.05).filter((f) => ENTREES.includes(f.kind)).length, 4);
  const beforeCart = spawnedBy(41.9).filter((f) => DESSERTS.includes(f.kind)).length;
  assert.equal(spawnedBy(43).filter((f) => DESSERTS.includes(f.kind)).length - beforeCart, 8);
  const specials = spawnedBy(59.9)
    .filter((f) => SPECIALS.includes(f.kind))
    .map((f) => f.kind);
  assert.deepEqual(specials.sort(), [...SPECIALS].sort());
});
