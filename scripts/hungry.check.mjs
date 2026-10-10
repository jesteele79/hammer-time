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
  reactionFor,
} from "../src/game/quests/hungry.ts";
import { seededRandom } from "../src/game/levels.ts";
import { game } from "./game-harness.mjs";
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

test("rivals take food that settles within 45 px after their reaction, with a lean", () => {
  const { q } = quiet();
  const student = q.rivals[0];
  student.base = 0.55;
  const f = place(q, "ribeye", student.x - 20);
  steps(q, Math.floor(0.55 * 60) - 2);
  assert.ok(q.food.includes(f), "still on the cloth before the reaction");
  steps(q, 4);
  assert.ok(!q.food.includes(f) && student.plate.includes(f), "on the student's plate");
  assert.ok(student.lean > 0);
});

test("a charged dive robs a plate a tap cannot reach; anger rises, reactions shorten, then cool off", () => {
  const { q } = quiet();
  const bellhop = q.rivals[1];
  bellhop.base = 0.4;
  bellhop.plate.push(makeFood(900, "brisket", bellhop.x, TABLE.top, 0, 0));
  dive(q, 0.05);
  assert.equal(bellhop.plate.length, 1, "a tap cannot reach the plate");
  const reach = bellhop.x - HAND0;
  const hold =
    TAP_SECONDS + (CHARGE_SECONDS - TAP_SECONDS) * ((reach - q.reach()) / (REACH_MAX - q.reach()));
  dive(q, hold);
  assert.equal(bellhop.plate.length, 0, "a charged dive robs it");
  assert.equal(q.steals, 1);
  assert.equal(q.plateTotal, FOODS.brisket.value + 100, "YOINK bonus");
  assert.equal(bellhop.anger, 1);
  assert.ok(Math.abs(reactionFor(bellhop) - 0.32) < 1e-9);
  steps(q, 8 * 60 + 2);
  assert.equal(bellhop.anger, 0, "anger falls one level per 8 s");
  bellhop.anger = 20;
  assert.equal(reactionFor(bellhop), 0.15, "never faster than 0.15 s");
});

test("the server buses food unless he is bonked; a bonk dumps his tray and sends him off for 15 s", () => {
  const { q } = quiet();
  q.server = { ...q.server, x: 230, dir: -1, away: 0 };
  const f = place(q, "club", 200);
  steps(q, 90);
  assert.ok(!q.food.includes(f), "bused");
  const b = quiet().q;
  b.server = { ...b.server, x: TABLE.left + 60, dir: -1, away: 0 };
  const keep = place(b, "club", 200);
  b.step(1 / 60, input({}, { hammer: true }));
  steps(b, 30);
  assert.ok(b.server.away > 14, "he leaves");
  assert.equal(b.food.length, 5, "the tray spills four extra plates");
  steps(b, 10 * 60);
  assert.ok(b.food.includes(keep), "nobody buses while he is away");
});

test("a bonk stuns a rival leaning into range for 2 s and slams suitcases off the table", () => {
  const { q } = quiet();
  const student = q.rivals[0];
  student.lean = 0.2;
  student.leanX = TABLE.left + 80;
  q.suitcases.push({ x0: 190, x1: 206, t: 4 });
  q.step(1 / 60, input({}, { hammer: true }));
  steps(q, 30);
  assert.ok(student.stun > 1.4 && student.stun <= 2);
  assert.equal(q.suitcases.length, 0);
});

test("robbing the student brings paper: ducking lets it pass, H swats it, a hit costs 150", () => {
  for (const defend of ["duck", "swat", "none"]) {
    const { q } = quiet();
    const student = q.rivals[0];
    student.plate.push(makeFood(901, "pie", student.x, TABLE.top, 0, 0));
    const reach = student.x - HAND0;
    dive(
      q,
      TAP_SECONDS +
        (CHARGE_SECONDS - TAP_SECONDS) * ((reach - q.reach()) / (REACH_MAX - q.reach())),
    );
    assert.equal(q.planes.length, 1, "a plane comes down the table");
    const before = q.plateTotal;
    for (let i = 0; i < 120; i++) {
      const near = q.planes[0] && q.planes[0].x < HAND0 + 60;
      q.step(
        1 / 60,
        input({ down: defend === "duck" }, { hammer: defend === "swat" && near && i % 20 === 0 }),
      );
    }
    assert.equal(q.planes.length, 0);
    assert.equal(q.plateTotal - before, defend === "none" ? -150 : 0, defend);
  }
});

test("the bellhop's suitcase stops sliding food and dives for 4 s", () => {
  const { q } = quiet();
  const bellhop = q.rivals[1];
  bellhop.plate.push(makeFood(902, "pie", bellhop.x, TABLE.top, 0, 0));
  const reach = bellhop.x - HAND0;
  dive(
    q,
    TAP_SECONDS + (CHARGE_SECONDS - TAP_SECONDS) * ((reach - q.reach()) / (REACH_MAX - q.reach())),
  );
  assert.equal(q.suitcases.length, 1);
  const s = q.suitcases[0];
  assert.ok(s.x1 < bellhop.x && s.x0 > HAND0);
  const beyond = place(q, "ribeye", s.x1 + 10);
  q.eaten = 30;
  dive(q, CHARGE_SECONDS + 0.05);
  assert.ok(q.food.includes(beyond), "the dive stops at the suitcase");
  steps(q, 4 * 60);
  assert.equal(q.suitcases.length, 0, "gone after 4 s");
});

test("an angry nurse slaps a hand in her zone: nothing eaten, a 1 s stun", () => {
  const { q, said } = quiet();
  const nurse = q.rivals[2];
  nurse.anger = 1;
  q.eaten = 30;
  const f = place(q, "ribeye", HAND0 + REACH_MAX);
  assert.ok(Math.abs(f.x - nurse.x) <= 45, "a full-reach tap lands in her zone");
  dive(q, 0.05);
  assert.ok(q.food.includes(f), "nothing eaten");
  assert.ok(q.stun > 0.4, "stunned for about a second");
  assert.ok(said.includes("I've HAD my shots."));
  assert.equal(nurse.line, "Sanitize!");
});

function questStep(g, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    g.clock += 1 / 60;
    g.step(1 / 60);
  }
}

test("the BUFFET door runs the quest, pays out, returns him to the door and is spent", () => {
  const g = game();
  g.visualsReady = () => true;
  g.audio.ready = true;
  const door = g.level.doors.find((d) => d.quest === "hungry");
  assert.ok(door && door.label === "BUFFET");
  const p = g.player;
  g.enemies = [];
  g.students = [];
  p.x = door.x * 16 + 12;
  p.onGround = true;
  g.actions = { down: true };
  questStep(g, 1 / 60);
  assert.equal(g.mode, "card");
  g.actions = {};
  questStep(g, 2);
  assert.equal(g.mode, "quest");
  const q = g.quest;
  const before = { score: g.score, coins: g.coins, charge: g.charge };
  q.plateTotal = 2600;
  q.coins = 2;
  q.charge = 3;
  q.time = 59.99;
  questStep(g, 2 / 60);
  assert.equal(g.mode, "questTally");
  assert.equal(g.hud().questResult.grade, "GOOD TIPPER");
  g.finishQuest();
  assert.equal(g.mode, "play");
  assert.equal(g.score - before.score, 2600);
  assert.equal(g.coins - before.coins, 2);
  assert.equal(g.charge - before.charge, 3);
  assert.equal(g.player.form, 2, "full belly: patience back to 3");
  assert.ok(Math.abs(g.player.x - (door.x * 16 + 12)) < 1, "back at the door");
  assert.equal(g.player.crouch, false);
  assert.ok(g.player.invuln > 0);
  g.actions = { down: true };
  questStep(g, 0.2);
  assert.equal(g.mode, "play", "a spent door stays shut");
});

test("the door only opens from the floor in front of it, never mid-jump or mid-swing", () => {
  const g = game();
  const door = g.level.doors[0];
  g.enemies = [];
  g.students = [];
  const p = g.player;
  p.x = door.x * 16 - 40;
  p.onGround = true;
  g.actions = { down: true };
  questStep(g, 1 / 60);
  assert.equal(g.mode, "play", "beside it");
  p.x = door.x * 16 + 12;
  p.onGround = false;
  p.vy = -200;
  g.tryDoor();
  assert.equal(g.mode, "play", "in the air");
  p.onGround = true;
  g.swing = 0.3;
  g.tryDoor();
  assert.equal(g.mode, "play", "mid-swing");
});

test("practice quests start from the title, record a best and never touch a run", () => {
  const g = game();
  g.mode = "title";
  const records = [];
  g.hooks = { ...g.hooks, onQuestRecord: (id, score) => records.push([id, score]), onMode() {} };
  g.visualsReady = () => true;
  g.audio.ready = true;
  g.score = 0;
  g.lives = 3;
  g.newQuest("hungry");
  questStep(g, 2);
  assert.equal(g.mode, "quest");
  g.quest.plateTotal = 1500;
  g.quest.coins = 5;
  g.quest.time = 59.99;
  questStep(g, 2 / 60);
  g.finishQuest();
  assert.equal(g.mode, "title");
  assert.deepEqual(records, [["hungry", 1500]]);
  assert.equal(g.score, 0);
  assert.equal(g.coins, 0);
});

test("pause works inside a quest and resumes it without inventing a press", () => {
  const g = game();
  g.visualsReady = () => true;
  g.audio.ready = true;
  g.mode = "title";
  g.newQuest("hungry");
  questStep(g, 2);
  assert.equal(g.mode, "quest");
  g.actions = { jump: true };
  g.togglePause();
  assert.equal(g.mode, "pause");
  g.togglePause();
  assert.equal(g.mode, "quest");
  assert.equal(g.questPrev.jump, true, "a button held through the pause is not a fresh press");
});

test("the dive stops at the first food in reach, so nothing near him goes out of reach as he eats", () => {
  const { q } = quiet();
  q.eaten = 20;
  const near = place(q, "bread", HAND0 + 25);
  const far = place(q, "ribeye", HAND0 + 200);
  dive(q, 0.05);
  assert.ok(!q.food.includes(near) && q.food.includes(far), "a tap takes the nearest plate first");
  dive(q, 0.05);
  assert.ok(!q.food.includes(far), "then the next one along");
  const p = quiet().q;
  const student = p.rivals[0];
  student.plate.push(makeFood(950, "pie", student.x, TABLE.top, 0, 0));
  const inWay = place(p, "bread", HAND0 + 60);
  dive(p, CHARGE_SECONDS);
  assert.ok(!p.food.includes(inWay), "food in the way is taken first");
  assert.equal(student.plate.length, 1);
  dive(p, CHARGE_SECONDS);
  assert.equal(student.plate.length, 0, "with the path clear a charged dive robs the first plate");
});

test("specials robbed off a plate pay out like eaten ones; a robbed check still costs 400", () => {
  for (const [kind, check] of [
    ["coke", (q) => q.coins === 1],
    ["buccees", (q) => q.star],
    ["togo", (q) => q.togo === 5],
  ]) {
    const { q } = quiet();
    q.rivals[1].plate.push(makeFood(960, kind, q.rivals[1].x, TABLE.top, 0, 0));
    dive(q, CHARGE_SECONDS);
    assert.equal(q.steals, 1, kind);
    assert.ok(check(q) && q.specials.includes(kind), `${kind} pays out`);
  }
  const { q, said } = quiet();
  q.togo = 3;
  q.rivals[1].plate.push(makeFood(961, "check", q.rivals[1].x, TABLE.top, 0, 0));
  dive(q, CHARGE_SECONDS);
  assert.equal(q.plateTotal, -400, "no YOINK on the bill, and the to-go box does not double it");
  assert.equal(q.togo, 3);
  assert.ok(said.includes("YOU picked up the bill?"));
});
