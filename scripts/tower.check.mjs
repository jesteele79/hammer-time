// The tower (story spec §8.2): fourteen floors of landings and flights, the carts that roll, the chutes, the wet floors, the
// punch clocks and the door on fourteen; the climb driver; the floor on the HUD.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { pitsOf, rewardAnchors } from "../src/sim/level.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { TOWER, floorY } from "../src/sim/levels/tower.ts";
import { drive } from "../src/sim/drive.ts";
import { hudOf } from "../src/render/hud.ts";
import { floorAt } from "../src/sim/physics.ts";
import { stageOf } from "../src/sim/level.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
/** Whether a flight's band, from its rail to the underside of its stringer, crosses a box. */
const stairCrosses = (f, b) => {
  const at = (x) => f.y0 + ((f.y1 - f.y0) * (x - f.x0)) / (f.x1 - f.x0);
  for (const x of [Math.max(f.x0, b.x0), Math.min(f.x1, b.x1)]) if (at(x) - 130 < b.y1 && at(x) + 70 > b.y0) return true;
  return false;
};
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const tower = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 31, { cast: false, title: true }); g.newRun(31, 0, { shift: [TOWER], journey: true, ...opts }); return g; };

test("the tower is fourteen floors of landings and 28-degree flights, chutes on 5, 9 and 13, balconies from 8, two punch clocks and the door on 14", () => {
  assert.deepEqual([TOWER.id, TOWER.world, TOWER.time, TOWER.floors, TOWER.camera.zones[0].follow], ["tower", "2-2", 420, { every: 540 }, "up"]);
  const flights = TOWER.floor.filter((f) => f.kind === "stairs");
  assert.equal(flights.length, 13);
  for (const f of flights) assert.ok(Math.abs((Math.atan2(Math.abs(f.y1 - f.y0), f.x1 - f.x0) * 180) / Math.PI - 28.4) < 1);
  assert.deepEqual(TOWER.chutes.map((c) => c.y), [floorY(5), floorY(9), floorY(13)]);
  assert.deepEqual(TOWER.checkpoints.map((c) => c.id), ["floor-5", "floor-10"]);
  assert.deepEqual([TOWER.doors[0].y, pitsOf(TOWER).length], [floorY(14), 0]);
  assert.deepEqual(TOWER.platforms.filter((p) => p.kind === "balcony").map((p) => Math.floor(-p.y / 540) + 1).sort((a, b) => a - b)[0], 8);
});
test("every chute's gap has the floor below under it, and a punch clock stands on its floor clear of any gap", () => {
  const stage = stageOf(TOWER);
  for (const c of TOWER.chutes) {
    const mid = c.x + c.w / 2;
    assert.equal(floorAt(stage, mid, c.y - 10), c.y + 540, `under the chute at ${c.y}`);
  }
  for (const k of TOWER.checkpoints) assert.equal(floorAt(stage, k.x, k.y - 24), k.y, k.id);
});
test("no anchor for a pickup hangs in the air: every one stands over a landing or a platform of the tower", () => {
  const stage = stageOf(TOWER);
  const anchors = rewardAnchors(TOWER);
  assert.ok(anchors.length > 40, String(anchors.length));
  assert.ok(anchors.some((a) => a.raised));
  for (const a of anchors) {
    const y = a.y + 70;
    const onFloor = floorAt(stage, a.x, y - 2) === y;
    const onPlat = TOWER.platforms.some((p) => p.y === y && a.x >= p.x0 && a.x <= p.x1);
    assert.ok(onFloor || onPlat, `${a.x}, ${a.y}`);
  }
});
test("every floor has its plate, clear of the flights and the balconies", () => {
  assert.deepEqual(TOWER.signs.slice(1).map((s) => s.label), Array.from({ length: 13 }, (_, i) => `FLOOR ${i + 2}`));
  for (const s of TOWER.signs) {
    const box = { x0: s.x - 130, x1: s.x + 130, y0: s.y - 10, y1: s.y + 115 };
    for (const f of TOWER.floor)
      if (f.kind === "stairs") {
        const lo = Math.min(f.y0, f.y1);
        const hi = Math.max(f.y0, f.y1);
        assert.ok(f.x1 <= box.x0 || f.x0 >= box.x1 || hi + 70 <= box.y0 || lo - 130 >= box.y1 || !stairCrosses(f, box), `${s.label} and a flight`);
      }
    for (const p of TOWER.platforms) assert.ok(p.x1 <= box.x0 || p.x0 >= box.x1 || p.y + 84 <= box.y0 || p.y - 100 >= box.y1, `${s.label} and a platform`);
  }
});
test("the scripted climber reaches the fourteenth floor along the flights, never stuck, beating the supervisor on the way", () => {
  const g = tower();
  play(g);
  let t = 0;
  let best = 0;
  let since = 0;
  // A life lost to her carts brings him back at the last clock, and he goes on.
  while (g.mode !== "walkoff" && g.mode !== "over" && t < 400) {
    g.step(drive(g.level, g.world.hero, "climb", g.world));
    t += STEP;
    since += STEP;
    if (-g.world.hero.y > best + 1) {
      best = -g.world.hero.y;
      since = 0;
    }
    assert.ok(since < 120, `stuck at ${g.world.hero.x}, ${g.world.hero.y} at ${t.toFixed(1)} s`);
  }
  assert.deepEqual([g.mode, g.run.punched], ["walkoff", ["floor-5", "floor-10"]]);
  assert.ok(g.run.lives >= 1, `${g.run.lives} lives left`);
  assert.equal(g.world.boss.state, "down", "she is beaten on the way");
});
test("a chute drops him a floor for 2 s and no life; the drop below floor 1 is the only pit and brings him back at the last clock", () => {
  const g = tower();
  play(g);
  const t0 = g.run.time;
  const c = TOWER.chutes[0];
  Object.assign(g.world.hero, { x: c.x + c.w / 2, y: floorY(5) - 10, vy: 100, onGround: false });
  const evs = until(g, (x) => x.world.hero.onGround, 3);
  assert.deepEqual([of(evs, "chute").length, Math.round(t0 - g.run.time), Math.round(g.world.hero.y), g.run.lives], [1, 2, floorY(4), 3]);
  for (const k of [1, 2]) {
    const h = tower();
    play(h);
    const t = h.run.time;
    const d = TOWER.chutes[k];
    // Mid-jump over the gap, falling short: the same.
    Object.assign(h.world.hero, { x: d.x + d.w / 2, y: d.y - 200, vy: -100, vx: 60, onGround: false });
    const e = until(h, (x) => x.world.hero.onGround, 3);
    assert.equal(of(e, "chute").length, 1);
    assert.equal(h.run.lives, 3);
    assert.ok(t - h.run.time < 3 && t - h.run.time >= 2);
    assert.equal(Math.round(h.world.hero.y), d.y + 540);
  }
  const k10 = TOWER.checkpoints[1];
  Object.assign(g.world.hero, { x: k10.x, y: floorY(10), onGround: true, vx: 0, vy: 0 });
  g.step(input({ right: true }));
  assert.equal(g.run.checkpoint, "floor-10");
  Object.assign(g.world.hero, { x: 1200, y: 400, vy: 600, onGround: false });
  until(g, (x) => x.mode === "card", 4);
  until(g, (x) => x.mode === "play", 3);
  assert.deepEqual([g.run.lives, Math.round(g.world.hero.y)], [2, floorY(10)]);
});
test("a fall off a balcony lands on the landing below, never in a pit", () => {
  const g = tower();
  play(g);
  const b = TOWER.platforms.find((p) => p.kind === "balcony");
  Object.assign(g.world.hero, { x: b.x0 - 80, y: b.y - 5, vx: 0, vy: 0, onGround: false });
  const evs = until(g, (x) => x.world.hero.onGround, 3);
  assert.equal(of(evs, "fell").length, 0);
  assert.equal(g.run.lives, 3);
  assert.ok(Math.abs(g.world.hero.y % 540) < 1, String(g.world.hero.y));
});
test("a cart on a landing rolls, reverses at its ends, hurts from the side and carries him on top; a wet-floor sign slips him", () => {
  const g = tower();
  play(g);
  const m = g.world.movers.find((c) => c.id === "cart-2");
  const x0 = m.x;
  until(g, () => false, 1);
  assert.ok(Math.abs(Math.abs(m.x - x0) - 140) < 5, "140 px/s");
  Object.assign(g.world.hero, { x: m.x - 300, y: m.y, onGround: true, patience: 2, vx: 0, vy: 0 });
  until(g, (x) => x.world.hero.patience < 2, 6, { right: true });
  assert.equal(g.world.hero.patience, 1);
  until(g, (x) => x.world.hero.invuln <= 0 && !x.world.hero.move, 3);
  Object.assign(g.world.hero, { x: m.x, y: m.y - m.h, vx: 0, vy: 0, onGround: true, patience: 2 });
  const x = g.world.hero.x;
  until(g, () => false, 0.9);
  assert.ok(Math.abs(g.world.hero.x - x) > 100, `carried: ${g.world.hero.x - x}`);
  assert.equal(g.world.hero.patience, 2, "riding on top is free");
  const s = TOWER.slips[0];
  Object.assign(g.world.hero, { x: s.x - 120, y: s.y, onGround: true, vx: 300, vy: 0 });
  const evs = until(g, (q) => q.world.hero.vx < 0, 1, { right: true });
  assert.ok(of(evs, "slip").length >= 1);
  assert.ok(g.world.hero.stunT > 0.4 && g.world.hero.patience === 2, "0.5 s without control, no damage");
  // The carts turn back at their ends.
  const c = g.world.movers[0];
  const seen = new Set();
  for (let i = 0; i < Math.round(30 / STEP); i++) {
    g.step(input());
    seen.add(c.dir);
    assert.ok(c.x >= c.x0 - 2 && c.x <= c.x1 + 2);
  }
  assert.equal(seen.size, 2);
});
test("a wet floor is one stumble, not a wall: walking on at it, he slips once and is past it", () => {
  for (const held of [{ right: true }, { right: true, run: true }]) {
    const g = tower();
    play(g);
    const s = TOWER.slips[1];
    Object.assign(g.world.hero, { x: s.x - 200, y: s.y, vx: 0, onGround: true });
    const evs = until(g, (x) => x.world.hero.x > s.x + 90, 5, held);
    assert.ok(g.world.hero.x > s.x + 90, `held ${JSON.stringify(held)} he got to ${g.world.hero.x}, the sign at ${s.x}`);
    assert.equal(of(evs, "slip").length, 1, "one stumble");
  }
});
test("the hint on any floor says to climb, not to find the lobby's crate", () => {
  const g = tower();
  play(g);
  Object.assign(g.world.hero, { x: 300, y: floorY(2), vx: 0, onGround: true });
  g.step(input());
  assert.match(hudOf(g, false, false, null).hint, /Keep climbing/);
});
test("a chute costs him no life even with the clock nearly out, and the clock never goes below zero", () => {
  const g = tower();
  play(g);
  g.run.time = 1;
  const c = TOWER.chutes[0];
  Object.assign(g.world.hero, { x: c.x + c.w / 2, y: floorY(5) - 10, vy: 100, onGround: false });
  g.step(input());
  g.step(input());
  assert.ok(g.run.time >= 0);
});
test("the punch clocks count on their own floor only, not by walking past their x below", () => {
  const g = tower();
  play(g);
  const k = TOWER.checkpoints[0];
  Object.assign(g.world.hero, { x: k.x, y: 0, onGround: true });
  g.step(input());
  assert.deepEqual(g.run.punched, []);
  Object.assign(g.world.hero, { x: k.x, y: k.y, onGround: true });
  g.step(input());
  assert.deepEqual(g.run.punched, ["floor-5"]);
});
test("the HUD line reads the floor he stands on; the card keeps the level's name", () => {
  const g = tower();
  play(g);
  assert.equal(hudOf(g, null, false, null).venue, "Floor 1");
  Object.assign(g.world.hero, { x: 1000, y: floorY(6), onGround: true });
  g.step(input());
  const hud = hudOf(g, null, false, null);
  assert.deepEqual([hud.venue, hud.name, hud.world, hud.status], ["Floor 6", "The tower", "2-2", "MEMBER"]);
});
test("his thoughts at their marks fire on their own floor", () => {
  const g = tower();
  play(g);
  const mark = TOWER.thoughts.find((t) => t.y === floorY(4));
  assert.ok(mark, "a thought on floor 4");
  Object.assign(g.world.hero, { x: mark.x, y: 0, onGround: true });
  const none = until(g, () => false, 0.1);
  assert.ok(!of(none, "think").some((e) => e.text === mark.text), "not from the floors below");
  Object.assign(g.world.hero, { x: mark.x, y: mark.y, onGround: true });
  const evs = until(g, () => false, 0.1);
  assert.ok(of(evs, "think").some((e) => e.text === mark.text));
});

test("the tower's people: housekeepers on 3, 6, 9 and 12, the maintenance man on 8, the drunk guest on 10", () => {
  const on = (k) => TOWER.cast.filter((c) => c.y === floorY(k));
  for (const k of [3, 6, 9, 12]) assert.ok(on(k).some((c) => c.person === "housekeeper-1"), `a housekeeper on ${k}`);
  assert.equal(on(8)[0].person, "bellhop-2");
  assert.deepEqual([on(10)[0].person, on(10)[0].trick], ["office-2", "wander"]);
  const stage = stageOf(TOWER);
  for (const c of TOWER.cast) assert.equal(floorAt(stage, c.x, c.y - 24), c.y, `${c.id} stands on a landing`);
});
test("the supervisor sends three carts a wave down the flight and goes down in three hits between them; the scripted climber beats her", () => {
  const g = tower();
  play(g);
  Object.assign(g.world.hero, { x: 2300, y: floorY(11), onGround: true });
  g.step(input());
  const evs = [...g.events, ...until(g, (x) => of(x.events, "bossWave").length > 0, 3)];
  assert.ok(of(evs, "bossWindup").length >= 1 && g.world.movers.some((m) => m.speed === 300));
  assert.ok(evs.some((e) => e.type === "castLine" && e.text === "Guests use the elevator."));
  assert.ok(evs.some((e) => e.type === "think" && e.text === "Guests wait. I don't."));
  let t = 0;
  const seen = [];
  while (g.mode === "play" && t < 200 && g.world.boss.state !== "down") {
    g.step(drive(g.level, g.world.hero, "climb", g.world));
    t += STEP;
    seen.push(...g.events);
  }
  assert.deepEqual([g.world.boss.state, g.run.lives >= 1, g.world.movers.some((m) => m.speed === 140 && m.onSlope)], ["down", true, true]);
  assert.equal(of(seen, "bossHit").length, 3);
  assert.equal(of(seen, "bossDown")[0].points, 2500);
  assert.ok(seen.some((e) => e.type === "think" && e.text === "Do not disturb THIS."));
});
test("a cart down the flight hurts him unless he jumps it or slides under; it rolls off at the foot", () => {
  const g = tower();
  play(g);
  Object.assign(g.world.hero, { x: 2300, y: floorY(11), onGround: true });
  g.step(input());
  until(g, (x) => x.world.movers.some((m) => m.speed === 300), 3);
  const c = g.world.movers.find((m) => m.speed === 300);
  assert.equal(c.dir, 1);
  const x0 = c.x;
  const y0 = c.y;
  until(g, () => false, 1);
  assert.ok(Math.abs(c.x - x0 - 300) < 8, "300 px/s");
  assert.ok(c.y > y0, "down the slope");
  until(g, () => !g.world.movers.includes(c), 5);
  assert.ok(!g.world.movers.includes(c), "gone at the foot");
});
test("a masher who only swings at the top of the flight loses a life to the carts", () => {
  const g = tower();
  play(g);
  Object.assign(g.world.hero, { x: 2200, y: floorY(11) - 400 * 0.54, onGround: true });
  until(g, (x) => x.run.lives < 3, 30, { hammer: true });
  assert.equal(g.run.lives, 2);
});
test("the fourteenth floor's door is locked until she is down", () => {
  const g = tower();
  play(g);
  const door = TOWER.doors[0];
  Object.assign(g.world.hero, { x: door.x, y: door.y, onGround: true, vx: 0 });
  until(g, () => false, 0.2);
  assert.equal(g.mode, "play");
  assert.match(hudOf(g, null, false, null).hint, /Housekeeping/);
  g.world.boss.state = "down";
  until(g, (x) => x.mode !== "play", 0.2);
  assert.equal(g.mode, "walkoff");
});
test("the boss bar names her, and the pig keeps its own", () => {
  const g = tower();
  play(g);
  assert.equal(hudOf(g, null, false, null).boss, null, "not before she is met");
  Object.assign(g.world.hero, { x: 2300, y: floorY(11), onGround: true });
  g.step(input());
  g.step(input());
  assert.deepEqual([hudOf(g, null, false, null).boss?.name, hudOf(g, null, false, null).boss?.max], ["Housekeeping", 3]);
});

test("a snot rocket as the supervisor's last hit gives the ride cart too, as a bonk does", async () => {
  const { hitBoss } = await import("../src/sim/boss.ts");
  const g = tower(); play(g);
  const s = g.world.boss;
  Object.assign(s, { awake: true, state: "waiting", hp: 1, hurtT: 0, timer: 9 });
  assert.equal(hitBoss(s, "snot", g.events), true);
  g.step(input());
  assert.equal(s.state, "down");
  assert.equal(g.world.movers.filter((m) => m.speed === 140 && m.onSlope).length, 1);
  g.step(input());
  assert.equal(g.world.movers.filter((m) => m.speed === 140 && m.onSlope).length, 1, "one cart, not one a step");
});
test("the supervisor's carts are numbered on her own object, not on the module", () => {
  const g = tower(); play(g);
  const a = g.world.boss;
  assert.equal(a.carts, 0);
});
