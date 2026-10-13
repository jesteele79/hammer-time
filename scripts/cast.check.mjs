import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { createCast, CAST, CAST_ID, hittable } from "../src/sim/cast.ts";
import { attackers } from "../src/sim/cast-behavior.ts";
import { launchPlane, stepMissiles, PLANE } from "../src/sim/missiles.ts";
import { createCart } from "../src/sim/targets.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { castPose, castGround, ACT_SECONDS } from "../src/sim/rig/cast.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { JOINT_NAMES } from "../src/sim/rig/skeleton.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = (extra = {}) => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 }, ...extra });
/** A level with only what createCast reads: the cast list and, for bellhops, the carts. */
const levelWith = (cast, carts = []) => ({ cast, carts });
/** A world with a cast: `spawns` are CastSpawn records; carts come from `carts` (x values). */
const worldWith = (spawns, hero = { x: 100, y: 0 }, opts = {}, carts = [], stage = flat()) => {
  const targets = carts.map((x, i) => createCart(i + 1, x));
  const w = createWorld(stage, hero, { ...opts, targets });
  w.cast = createCast(levelWith(spawns, carts), targets);
  for (let i = 0; i < 6; i++) w.step(input());
  return w;
};
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const press = (w, key, held = {}) => { w.step(input({ ...held, [key]: true }, { [key]: true })); return w.events; };
const until = (w, done, seconds = 10, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(w); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const of = (evs, type) => evs.filter((e) => e.type === type);
const npc = (w, spawn) => w.cast.find((n) => n.spawn === spawn);

test("the cast spawns from the level data with the role's size, a bellhop tied to his cart, ids past the carts", () => {
  const w = worldWith(
    [{ id: "b", person: "bellhop-1", x: 1250, y: 0, cart: 1250 }, { id: "s", person: "server-2", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "k", person: "student-1", x: 2000, y: -520, sit: true }],
    { x: -1500, y: 0 }, {}, [1250],
  );
  assert.equal(w.cast.length, 3);
  const b = npc(w, "b");
  assert.deepEqual([b.role, b.w, b.h, b.cart, b.hat, b.act], ["bellhop", 100, 330, 1, true, "idle"]);
  assert.equal(npc(w, "s").x1, 1100);
  assert.ok(npc(w, "k").sit && npc(w, "k").id >= CAST_ID);
  assert.deepEqual(w.snapshot().cast.map((n) => n.spawn), ["b", "s", "k"]);
});

test("a server patrols her stretch at a walk and turns at its ends; a bellhop stands by his cart", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "b", person: "bellhop-1", x: 3000, y: 0, cart: 3000 }], { x: -1500, y: 0 }, {}, [3000]);
  const xs = [];
  for (let i = 0; i < 6; i++) { steps(w, 0.5); xs.push(npc(w, "s").x); }
  assert.ok(xs.every((x) => x >= 700 - 1 && x <= 1100 + 1), `inside the patrol: ${xs}`);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 200, "she walks it");
  assert.ok(Math.abs(npc(w, "s").vx) <= CAST.server.walk + 1e-9);
  assert.equal(npc(w, "b").x, 3000, "the bellhop stays put");
});

test("they notice him once per life: a double-take with a line, facing him; office workers only mutter", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 2000, y: 0 }, { id: "o", person: "office-1", x: 2600, y: 0 }], { x: 1000, y: 0 });
  w.hero.facing = 1;
  const evs = steps(w, 0.5);
  assert.equal(of(evs, "castNotice").length, 0, "too far");
  w.hero.x = 1400;
  const seen = steps(w, 0.3);
  const n = of(seen, "castNotice");
  assert.deepEqual(n.map((e) => e.id), [npc(w, "s").id], "the server noticed, the office worker is still out of range");
  assert.equal(npc(w, "s").facing, -1, "facing him");
  assert.ok(of(seen, "castLine").some((e) => e.id === npc(w, "s").id), "with a line");
  assert.equal(npc(w, "s").act, "notice");
  w.hero.x = 2300;
  const again = steps(w, 0.6);
  assert.equal(of(again, "castNotice").filter((e) => e.id === npc(w, "s").id).length, 0, "once");
  assert.ok(of(again, "castLine").some((e) => e.id === npc(w, "o").id), "the office worker mutters");
  assert.equal(of(again, "castNotice").filter((e) => e.id === npc(w, "o").id).length, 0, "without looking up");
});

test("they never notice him from another floor, except students, who see the whole lobby", () => {
  const stage = flat({ platforms: [{ x0: 1500, x1: 3000, y: -520 }] });
  const w = worldWith([{ id: "s", person: "server-1", x: 2000, y: 0 }, { id: "k", person: "student-2", x: 2200, y: -520 }], { x: -1500, y: 0 }, {}, [], stage);
  // Up onto the balcony beside them, once they have settled.
  Object.assign(w.hero, { x: 2600, y: -520 });
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "castNotice").map((e) => e.id), [npc(w, "k").id]);
});

test("stepping the cast is deterministic", () => {
  const spawns = [{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "k", person: "student-1", x: 2000, y: -520 }];
  const a = worldWith(spawns);
  const b = worldWith(spawns);
  steps(a, 3, { right: true });
  steps(b, 3, { right: true });
  assert.deepEqual(a.snapshot().cast, b.snapshot().cast);
});

test("the mallet knocks a server down in one: she flies, lands, lies dazed, gets up and walks off, and the tray leaves a wet floor", () => {
  for (const facing of [1, -1]) {
    const w = worldWith([{ id: "s", person: "server-1", x: 300 + facing * 230, y: 0 }], { x: 300, y: 0 });
    w.hero.facing = facing;
    press(w, "hammer");
    const evs = steps(w, 0.4);
    const hit = of(evs, "castHit");
    assert.equal(hit.length, 1, `one hit (facing ${facing})`);
    assert.deepEqual([hit[0].by, hit[0].down, hit[0].points, hit[0].dir], ["mallet", true, 100, facing]);
    assert.ok(of(evs, "hit").some((e) => e.by === "mallet" && e.target === npc(w, "s").id), "the bonk event for the feel");
    const s = npc(w, "s");
    assert.ok(s.act === "fly" && s.vx * facing > 0 && !s.prop && s.out, `flying away without her tray: ${s.act}`);
    until(w, () => npc(w, "s").act === "down", 3);
    assert.equal(s.act, "down");
    assert.ok(w.puddles.some((p) => p.kind === "water" && Math.abs(p.x - s.x) < 60), "a wet floor where she landed");
    until(w, () => npc(w, "s").act === "leave", 5);
    assert.ok(s.act === "leave" && s.vx * facing > 0, "leaving, away from him");
    until(w, () => !npc(w, "s").alive, 12);
    assert.equal(s.alive, false, "gone once far away");
  }
});

test("a swing hits each cast member once, never one behind him, and a knocked-out one cannot be hit again", () => {
  const w = worldWith([{ id: "a", person: "office-1", x: 520, y: 0 }, { id: "b", person: "office-2", x: 80, y: 0 }], { x: 300, y: 0 });
  w.hero.facing = 1;
  press(w, "hammer");
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "castHit").map((e) => e.id), [npc(w, "a").id]);
  until(w, () => npc(w, "a").act === "down", 3);
  npc(w, "a").x = 520;
  press(w, "hammer");
  assert.equal(of(steps(w, 0.5), "castHit").length, 0, "down and out: unhittable");
});

test("snot knocks staff down and slimes them; hot snot goes through one; students run off gagging", () => {
  const w = worldWith([{ id: "a", person: "server-1", x: 700, y: 0 }, { id: "b", person: "office-1", x: 1000, y: 0 }, { id: "k", person: "student-1", x: 1300, y: 0 }], { x: 300, y: 0 }, { hot: true });
  w.hero.facing = 1;
  press(w, "fire");
  const evs = steps(w, 1.2);
  // (The office worker, flying, may bowl the student on his way: a hit of its own.)
  const hits = of(evs, "castHit").filter((e) => e.by === "snot");
  assert.deepEqual(hits.map((e) => [e.id, e.by]), [[npc(w, "a").id, "snot"], [npc(w, "b").id, "snot"]], "through the first, into the second");
  assert.ok(npc(w, "a").slimed && npc(w, "b").slimed);
  const cold = worldWith([{ id: "k", person: "student-1", x: 700, y: 0 }], { x: 300, y: 0 });
  cold.hero.facing = 1;
  press(cold, "fire");
  const fled = steps(cold, 1);
  assert.ok(of(fled, "castFlee").length === 1 && of(fled, "castFlee")[0].points === 100);
  assert.equal(npc(cold, "k").act, "flee");
  assert.equal(cold.snot.length, 0, "the blob is spent on him");
});

test("landing on a staffer from above stomps him and bounces Hammer; a student sidesteps", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 500, y: 0 }], { x: 500, y: -600 });
  w.hero.onGround = false;
  const evs = until(w, (x) => x.hero.vy < 0 || x.hero.onGround, 2);
  const st = of(evs, "stomp");
  assert.equal(st.length, 1);
  assert.ok(st[0].landed && w.hero.vy < -800 && w.hero.vy > -1000, `bounced: ${w.hero.vy}`);
  assert.equal(of(evs, "castHit")[0].by, "stomp");
  const k = worldWith([{ id: "k", person: "student-2", x: 500, y: 0 }], { x: 500, y: -600 });
  k.hero.onGround = false;
  const ke = until(k, (x) => x.events.some((e) => e.type === "stomp"), 2);
  assert.equal(of(ke, "castHit").length, 0);
  assert.ok(of(ke, "stomp").some((e) => !e.landed) && npc(k, "k").act === "hop", "sidestepped");
});

test("students duck the mallet", () => {
  const w = worldWith([{ id: "k", person: "student-1", x: 520, y: 0 }], { x: 300, y: 0 });
  w.hero.facing = 1;
  press(w, "hammer");
  const evs = steps(w, 0.5);
  assert.equal(of(evs, "castHit").length, 0);
  assert.ok(of(evs, "castLine").some((e) => e.text === "lol"));
  assert.ok(["duck", "idle"].includes(npc(w, "k").act));
});

test("the super burst and the Buc-ee's shield send everyone they touch flying, students included", () => {
  const w = worldWith([{ id: "a", person: "server-1", x: 500, y: 0 }, { id: "k", person: "student-1", x: 600, y: 0 }, { id: "far", person: "office-1", x: 1500, y: 0 }], { x: 300, y: 0 }, { charge: 10 });
  w.hero.facing = 1;
  press(w, "super");
  // Right at the slam: a big knock lands and bounces within half a second.
  const evs = until(w, (x) => x.events.some((e) => e.type === "burst"), 1);
  assert.deepEqual(of(evs, "castHit").map((e) => [e.id, e.by]).sort(), [[npc(w, "a").id, "burst"], [npc(w, "k").id, "burst"]].sort());
  assert.ok(npc(w, "a").act === "fly" && npc(w, "k").act === "fly" && npc(w, "far").act !== "fly");
});

test("a staffer walking into a puddle slips, feet out, and goes down for 150; students do not slip", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 1200, y: 0, x0: 600, x1: 1400 }, { id: "k", person: "student-1", x: 1000, y: 0, x0: 600, x1: 1400 }], { x: -1500, y: 0 });
  w.puddles.push({ x: 1000, y: 0, w: 120, life: 7, max: 7, kind: "snot" });
  const evs = until(w, (x) => x.events.some((e) => e.type === "castHit"), 4);
  assert.ok(w.puddles[0].life <= 1.2, "the puddle is used up");
  evs.push(...steps(w, 2));
  const slips = of(evs, "castHit").filter((e) => e.by === "puddle");
  assert.deepEqual(slips.map((e) => [e.id, e.points]), [[npc(w, "s").id, 150]]);
});

test("knocked below the level, a cast member is gone: OUT OF ORDER, 500", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 500, y: 0 }], { x: 300, y: 0 });
  const o = npc(w, "o");
  Object.assign(o, { act: "fly", actT: 0, vx: 0, vy: 900, onGround: false, y: 3000 });
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "castFell").map((e) => [e.id, e.points]), [[o.id, 500]]);
  assert.equal(o.alive, false);
});

test("a server warns for 0.45 s, then rushes at 420 for up to 2 s or 1000 px, skids, rests, and only the rush hurts", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }], { x: 300, y: 0 });
  const evs = until(w, () => npc(w, "s").act === "windup", 2);
  const s = npc(w, "s");
  assert.equal(s.act, "windup");
  assert.ok(of(evs, "castWindup").some((e) => e.id === s.id && e.role === "server"), "the ! burst");
  assert.ok(of(evs, "castLine").some((e) => e.text.includes("waters") || e.text === "Order up!" || e.text.includes("Be right")));
  assert.equal(w.hits.length, 0, "nothing hurts during the warning");
  const t0 = s.actT;
  until(w, () => npc(w, "s").act === "attack", 1);
  assert.ok(CAST.server.windup - t0 <= 0.46 && s.act === "attack" && Math.abs(s.vx) === CAST.server.rush && s.facing === -1);
  const start = s.x;
  until(w, () => npc(w, "s").act !== "attack", 3);
  assert.equal(s.act, "recover");
  assert.ok(Math.abs(s.x - start) <= CAST.server.rushPx + 20, `no further than 1000: ${Math.abs(s.x - start)}`);
  until(w, () => npc(w, "s").act !== "recover", 3);
  assert.ok(["idle", "walk"].includes(s.act), "back to work");
});

test("a rushing server who reaches him costs one pip; walking into one who is not attacking only bumps her with a line", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 700, y: 0 }], { x: 300, y: 0 });
  until(w, () => npc(w, "s").act === "attack", 3);
  const evs = until(w, (x) => x.hero.patience < 3, 2);
  assert.equal(w.hero.patience, 2, "one pip");
  assert.ok(of(evs, "hurt").length === 1);
  const calm = worldWith([{ id: "s", person: "server-1", x: 700, y: 0 }], { x: 300, y: 0 });
  calm.cast[0].noticed = true;
  calm.cast[0].rest = 99;
  const bumped = until(calm, (x) => x.hero.x > 650, 3, { right: true, run: true });
  assert.equal(calm.hero.patience, 3, "no pip");
  assert.ok(of(bumped, "castBump").length >= 1 && of(bumped, "castLine").length >= 1, "a nudge and a line");
  assert.ok(["bumped", "idle", "walk"].includes(calm.cast[0].act));
});

test("at most two attack at once: a third waits for a ticket", () => {
  const w = worldWith(
    [{ id: "a", person: "server-1", x: 600, y: 0 }, { id: "b", person: "server-2", x: 650, y: 0 }, { id: "c", person: "server-1", x: 700, y: 0 }],
    { x: 300, y: 0 },
  );
  let most = 0;
  for (let i = 0; i < Math.round(4 / STEP); i++) { w.step(input()); most = Math.max(most, attackers(w.cast)); }
  assert.equal(most, 2);
  assert.ok(w.cast.some((n) => n.act === "windup" || n.act === "attack" || n.rest > 0), "the third got its turn once a ticket came back");
});

test("an office worker marches head-down at 160, chimes at 400 px, hits once on contact and spills coffee, then rests 2 s", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 1200, y: 0, x0: 600, x1: 1400 }], { x: 300, y: 0 });
  const o = npc(w, "o");
  assert.ok(Math.abs(o.vx) === CAST.office.march);
  const evs = until(w, (x) => x.hero.patience < 3, 8, { right: true });
  assert.ok(of(evs, "chime").length === 1, "one chime on the approach");
  assert.equal(w.hero.patience, 2);
  assert.ok(of(evs, "castSplash").length === 1 && of(evs, "castLine").some((e) => e.text === "Oh. Were you standing there?"));
  assert.ok(o.rest > 1.5 && o.act === "bumped", "he staggers and rests");
  const more = steps(w, 1.6);
  assert.equal(of(more, "hurt").length, 0, "not twice inside his rest and Hammer's grace");
});

test("her rush landing on him in the step his mallet lands on her: one pip, one knockdown, the attack over", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 760, y: 0 }], { x: 300, y: 0 });
  const s = npc(w, "s");
  until(w, () => npc(w, "s").act === "attack", 3);
  w.hero.facing = 1;
  // Swing as she arrives: the strike window opens 0.14 s in, about when she reaches him.
  until(w, () => Math.abs(npc(w, "s").x - w.hero.x) < 320, 2);
  press(w, "hammer");
  const evs = steps(w, 0.6);
  assert.equal(of(evs, "castHit").length, 1);
  assert.ok(w.hero.patience >= 2, `at most one pip: ${w.hero.patience}`);
  assert.ok(["fly", "down"].includes(s.act));
  assert.equal(attackers(w.cast), 0, "the ticket is back");
});

test("a bellhop grips his cart, winds up 0.7 s, shoves it at 650 toward him, follows it, and wheels it home", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1400, y: 0, cart: 1250 }], { x: -1500, y: 0 }, {}, [1250]);
  Object.assign(w.hero, { x: 600, invuln: 99 });
  const b = npc(w, "b");
  const cart = w.targets[0];
  const evs = until(w, () => npc(w, "b").act === "windup", 3);
  assert.ok(of(evs, "castNotice").length === 1 && b.act === "windup", "the double-take, then the wind-up");
  assert.ok(Math.abs(cart.x - (b.x - CAST.bellhop.hold)) < 2, "the cart in his hands, on Hammer's side");
  const t0 = w.time;
  const shoved = until(w, () => npc(w, "b").act === "chase", 2);
  assert.ok(w.time - t0 >= CAST.bellhop.windup - 2 * STEP && of(shoved, "castAttack").length === 1);
  assert.equal(cart.vx, -CAST.bellhop.shove);
  // Hammer out of the way: the cart rolls, he fetches it and wheels it home in peace.
  w.hero.x = -1500;
  until(w, () => Math.abs(w.targets[0].vx) < 10, 6);
  assert.ok(cart.x < 1250 - 600, `it rolled a long way: ${cart.x}`);
  until(w, () => npc(w, "b").act === "return", 6);
  assert.equal(b.act, "return");
  until(w, () => npc(w, "b").act === "idle" && Math.abs(npc(w, "b").x - 1400) < 10, 12);
  assert.ok(Math.abs(b.x - 1400) < 10 && Math.abs(cart.x - (b.x - CAST.bellhop.hold)) < 2, "home with the cart");
  assert.ok(b.rest > 0, "a rest before the next shove");
});

test("a cart rolling at him costs a pip; one rolling away or standing still does not", () => {
  const w = worldWith([], { x: 300, y: 0 }, {}, [700]);
  w.targets[0].vx = -650;
  const evs = until(w, (x) => x.hero.patience < 3, 2);
  assert.equal(w.hero.patience, 2);
  assert.equal(of(evs, "hurt").length, 1);
  const still = worldWith([], { x: 300, y: 0 }, {}, [320]);
  steps(still, 0.5);
  assert.equal(still.hero.patience, 3, "standing in a parked cart is harmless");
});

test("a bonked cart reverses and bowls over the bellhop behind it, for the chain's first 100", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1400, y: 0, cart: 1250 }], { x: 300, y: 0 }, {}, [1250]);
  const b = npc(w, "b");
  b.noticed = true;
  b.rest = 99;
  w.hero.x = 1020;
  w.hero.facing = 1;
  press(w, "hammer");
  const evs = steps(w, 1.5);
  assert.ok(of(evs, "hit").some((e) => e.by === "mallet" && e.target === 1), "the cart is bonked");
  const hits = of(evs, "castHit");
  assert.deepEqual(hits.map((e) => [e.id, e.by]), [[b.id, "cart"]]);
  assert.deepEqual(of(evs, "chain").map((e) => [e.count, e.points, e.oneUp]), [[1, 100, false]]);
  assert.ok(b.hat === false && b.hits === 1 && !b.out, "hat off, down but not out");
});

test("a bellhop takes two: dazed four seconds and up again after the first; sliding along the floor when hit while down, bowling what he meets", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 530, y: 0 }], { x: 300, y: 0 });
  const b = npc(w, "b");
  w.hero.facing = 1;
  press(w, "hammer");
  until(w, (x) => x.events.some((e) => e.type === "castHit"), 1);
  assert.ok(b.act === "fly" && b.hits === 1 && !b.out);
  until(w, () => npc(w, "b").act === "down", 3);
  const t0 = w.time;
  until(w, () => npc(w, "b").act === "getup", 6);
  assert.ok(w.time - t0 >= CAST.bellhop.daze - STEP, "dazed the full four seconds");
  until(w, () => npc(w, "b").act === "idle", 2);
  assert.ok(b.act === "idle" && hittable(b), "up and back in the fight");
  // Hit while he is down: the slide, through whoever stands in its way.
  const s = worldWith([{ id: "b", person: "bellhop-1", x: 530, y: 0 }, { id: "o", person: "office-1", x: 1300, y: 0 }], { x: 300, y: 0 });
  const sb = npc(s, "b");
  s.hero.facing = 1;
  press(s, "hammer");
  until(s, () => npc(s, "b").act === "down", 3);
  sb.x = 530;
  press(s, "hammer");
  const evs = steps(s, 2.5);
  assert.ok(of(evs, "castHit").some((e) => e.id === sb.id) && sb.out, "out after the second");
  const bowled = of(evs, "castHit").find((e) => e.id === npc(s, "o").id);
  assert.ok(bowled && bowled.by === "slide", "the office worker in his path went down");
  assert.ok(of(evs, "chain").some((e) => e.count === 1 && e.points === 100));
});

test("a chain climbs 100, 200, 400 ... and the eighth is a life; two things reaching one staffer in a step count once", () => {
  const spawns = Array.from({ length: 8 }, (_, i) => ({ id: `o${i}`, person: "office-1", x: 900 + i * 120, y: 0 }));
  const w = worldWith(spawns, { x: 300, y: 0 }, {}, [700]);
  w.targets[0].vx = 1100;
  const evs = steps(w, 3);
  const chain = of(evs, "chain");
  assert.deepEqual(chain.map((e) => e.points), [100, 200, 400, 800, 1000, 2000, 4000, 8000]);
  assert.ok(chain[7].oneUp && !chain[6].oneUp);
  const twice = worldWith([{ id: "o", person: "office-1", x: 900, y: 0 }], { x: 300, y: 0 }, {}, [700, 1100]);
  twice.targets[0].vx = 1100;
  twice.targets[1].vx = -1100;
  const both = steps(twice, 1);
  assert.equal(of(both, "castHit").length, 1, "one knockdown");
  assert.equal(of(both, "chain").length, 1, "one chain entry");
});

test("a student folds a plane for 0.65 s, throws it toward him, rests 4 to 5.8 s, and never has more than three in the air", () => {
  const stage = flat({ platforms: [{ x0: 1500, x1: 3000, y: -520 }] });
  const w = worldWith([{ id: "k", person: "student-1", x: 2000, y: -520 }], { x: 1000, y: 0 }, {}, [], stage);
  const k = npc(w, "k");
  const evs = until(w, () => npc(w, "k").act === "windup", 8);
  assert.equal(k.act, "windup");
  assert.ok(of(evs, "castWindup").some((e) => e.role === "student") && of(evs, "castLine").some((e) => e.text === "Heads up!"));
  const t0 = w.time;
  const thrown = until(w, (x) => x.missiles.length > 0, 2);
  assert.ok(w.time - t0 >= CAST.student.windup - 2 * STEP && of(thrown, "missile").length === 1);
  const p = w.missiles[0];
  assert.ok(p.kind === "plane" && p.vx < 0 && Math.abs(p.vx) === PLANE.speed, "toward him at launch speed");
  assert.ok(k.rest >= CAST.student.restMin && k.rest <= CAST.student.restMin + 3 * CAST.student.restStep + 1e-9);
  const three = worldWith(
    [0, 1, 2, 3, 4].map((i) => ({ id: `k${i}`, person: "student-2", x: 2000 + i * 100, y: -520 })),
    { x: 1000, y: 0 }, {}, [], stage,
  );
  let most = 0;
  for (let i = 0; i < Math.round(12 / STEP); i++) { three.step(input()); most = Math.max(most, three.missiles.length); }
  assert.ok(most <= CAST.student.planes && most >= 2, `at most three planes up: ${most}`);
});

test("a plane glides on a deterministic path: level at first, dipping as it slows, and it dies on the floor", () => {
  const from = { id: 1001, x: 2000, y: -520, h: 310, facing: -1 };
  const a = launchPlane(1, from, { x: 1000, y: -150 });
  const b = launchPlane(1, from, { x: 1000, y: -150 });
  assert.deepEqual(a, b);
  const w = { stage: flat(), hero: { x: -1000, y: 0, w: 110, h: 300, invuln: 0, move: null }, missiles: [a], hits: [], puddles: [] };
  const ys = [];
  for (let i = 0; i < Math.round(2.4 / STEP) && w.missiles.length; i++) { stepMissiles(w, STEP, []); ys.push(a.y); }
  assert.ok(ys[12] - ys[0] < 40, "nearly level over the first tenth of a second");
  assert.ok(ys[ys.length - 1] > ys[0] + 300, `it came down: ${ys[0]} to ${ys[ys.length - 1]}`);
  assert.ok(a.x < 1600, "it travelled");
  const floorWorld = { ...w, missiles: [launchPlane(2, { ...from, y: 0 }, { x: 1000, y: 300 })] };
  const evs = [];
  for (let i = 0; i < 240 && floorWorld.missiles.length; i++) stepMissiles(floorWorld, STEP, evs);
  assert.ok(evs.some((e) => e.type === "missileHit" && e.floor), "down on the floor, gone");
});

test("a plane costs a pip when it reaches him, passes through him in grace, and stops at a wall", () => {
  const w = worldWith([], { x: 1000, y: 0 });
  w.missiles.push(launchPlane(1, { id: 1001, x: 1500, y: -100, h: 310, facing: -1 }, { x: 1000, y: -150 }));
  // The hit queues the damage; it lands the step after.
  const evs = until(w, (x) => x.hero.patience < 3, 3);
  assert.equal(w.hero.patience, 2);
  assert.ok(of(evs, "missileHit").some((e) => e.hero));
  const grace = worldWith([], { x: 1000, y: 0 });
  grace.hero.invuln = 3;
  grace.missiles.push(launchPlane(1, { id: 1001, x: 1500, y: -100, h: 310, facing: -1 }, { x: 1000, y: -150 }));
  const through = until(grace, (x) => x.missiles.length === 0, 3);
  assert.equal(grace.hero.patience, 3);
  assert.ok(!of(through, "missileHit").some((e) => e.hero) && of(through, "missileHit").some((e) => e.floor), "it flew on through him and came down");
  const walled = worldWith([], { x: -1000, y: 0 }, {}, [], flat({ solids: [{ x: 1200, y: -600, w: 100, h: 600 }] }));
  walled.missiles.push(launchPlane(1, { id: 1001, x: 1500, y: -100, h: 310, facing: -1 }, { x: 800, y: -150 }));
  const hit = until(walled, (x) => x.missiles.length === 0, 2);
  assert.ok(of(hit, "missileHit").some((e) => !e.floor && !e.hero) && walled.missiles.length === 0, "stopped by the wall");
});

test("the mallet swats a plane into confetti for 50", () => {
  const w = worldWith([], { x: 1000, y: 0 });
  w.hero.facing = 1;
  w.missiles.push({ id: 1, kind: "plane", x: 1230, y: -220, vx: -60, vy: 0, spin: 0, life: 3, phase: 0, from: 1001 });
  press(w, "hammer");
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "swat").map((e) => [e.kind, e.points]), [["plane", 50]]);
  assert.equal(w.missiles.length, 0);
  assert.equal(w.hero.patience, 3);
});

test("the office worker behind the screen rears back for half a second, leaps out and flings his coffee, which leaves a puddle", () => {
  const w = worldWith([{ id: "o", person: "office-2", x: 1400, y: 0, hide: true }], { x: 300, y: 0 });
  const o = npc(w, "o");
  assert.equal(o.act, "hide");
  steps(w, 0.5);
  assert.equal(o.act, "hide", "out of range, still hiding");
  w.hero.x = 1000;
  const evs = until(w, () => npc(w, "o").act === "windup", 1);
  assert.ok(of(evs, "castWindup").length === 1 && of(evs, "castLine").some((e) => e.text === "Got a minute?" || e.text === "Can we take this offline?"));
  const leapt = until(w, (x) => x.missiles.length > 0, 2);
  assert.ok(of(leapt, "castAttack").length === 1 && w.missiles[0].kind === "coffee" && w.missiles[0].vx < 0);
  assert.ok(!o.prop, "the cup left his hand");
  until(w, (x) => x.missiles.length === 0, 3);
  assert.ok(w.puddles.some((p) => p.kind === "coffee"), "coffee on the floor");
  until(w, () => npc(w, "o").act === "walk", 2);
  assert.equal(o.act, "walk", "then he marches like the other one");
});

test("a lecture freezes staff in reach for 1.8 s with a sigh (50) and sits students down to sulk for 9 s with a retort (150), no planes", () => {
  const w = worldWith(
    [{ id: "s", person: "server-1", x: 700, y: 0 }, { id: "k", person: "student-1", x: 900, y: 0 }, { id: "far", person: "office-1", x: 1800, y: 0 }],
    { x: 300, y: 0 },
  );
  w.hero.facing = 1;
  press(w, "lecture");
  const evs = until(w, (x) => x.events.some((e) => e.type === "lectureLand"), 1);
  const t0 = w.time;
  const land = of(evs, "lectureLand");
  assert.deepEqual(land.map((e) => [e.schooled, e.frozen]), [[1, 1]]);
  assert.deepEqual(of(evs, "castFreeze").map((e) => [e.id, e.points]), [[npc(w, "s").id, 50]]);
  assert.deepEqual(of(evs, "castSchooled").map((e) => [e.id, e.points]), [[npc(w, "k").id, 150]]);
  assert.ok(npc(w, "s").act === "frozen" && npc(w, "k").act === "schooled" && npc(w, "far").act !== "frozen");
  assert.ok(of(evs, "castLine").some((e) => e.id === npc(w, "s").id) && of(evs, "castLine").some((e) => e.id === npc(w, "k").id));
  until(w, () => npc(w, "s").act !== "frozen", 3);
  assert.ok(w.time - t0 >= 1.8 - 2 * STEP, "frozen the full 1.8 s");
  assert.equal(npc(w, "k").act, "schooled");
  assert.ok(npc(w, "k").rest >= CAST.student.schooled - (w.time - t0) - 2 * STEP, "no planes while schooled: the rest runs the whole sulk");
  const lonely = worldWith([], { x: 300, y: 0 });
  press(lonely, "lecture");
  assert.equal(of(steps(lonely, 0.3), "lectureLand").length, 0, "nothing to land on");
});

test("a lecture stops a rush and a wind-up where they stand, and the tickets come back", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 760, y: 0 }, { id: "b", person: "bellhop-1", x: 1000, y: 0, cart: 850 }], { x: 300, y: 0 }, {}, [850]);
  until(w, () => npc(w, "s").act === "attack" && npc(w, "b").act === "windup", 4);
  assert.ok(npc(w, "s").act === "attack" && npc(w, "b").act === "windup", "both on the attack");
  w.hero.facing = 1;
  w.hero.lectureCd = 0;
  press(w, "lecture");
  const evs = steps(w, 0.3);
  assert.equal(of(evs, "castFreeze").length, 2);
  assert.ok(npc(w, "s").act === "frozen" && npc(w, "b").act === "frozen" && npc(w, "s").vx === 0);
  assert.equal(attackers(w.cast), 0);
  assert.equal(w.targets[0].vx, 0, "the cart was never shoved");
});

test("a student hops back out of his reach when there is floor behind, ducks otherwise", () => {
  const stage = flat({ platforms: [{ x0: 1500, x1: 2300, y: -520 }] });
  const w = worldWith([{ id: "k", person: "student-1", x: 2000, y: -520 }], { x: 1750, y: -520 }, {}, [], stage);
  const k = npc(w, "k");
  steps(w, 0.75);
  assert.equal(k.act, "hop", "after the double-take");
  until(w, () => npc(w, "k").act === "idle", 1);
  assert.ok(k.x > 2150, `hopped back: ${k.x}`);
  const edge = worldWith([{ id: "k", person: "student-1", x: 2250, y: -520 }], { x: 2000, y: -520 }, {}, [], stage);
  steps(edge, 0.5);
  assert.ok(Math.abs(npc(edge, "k").x - 2250) < 30, "no floor behind: stays");
});

const play = (g) => { while (g.mode === "card") g.step(input()); };
const stepsG = (g, seconds, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const untilG = (g, done, seconds = 10, held = {}) => { for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) g.step(input(held)); };

test("the lobby's cast stands where the design puts them, every bellhop with his cart, nobody in the stash", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  const by = (id) => g.world.cast.find((n) => n.spawn === id);
  assert.equal(g.world.cast.length, 11);
  assert.ok(by("bellhop-desk").cart !== null && by("bellhop-floor").cart !== null);
  assert.deepEqual(LOBBY.cast.filter((s) => s.y === -520).map((s) => s.person.split("-")[0]), ["student", "student", "student"]);
  assert.ok(by("office-screen").hide && by("student-table").sit);
  assert.deepEqual(STASH.cast ?? [], []);
  const off = createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false });
  assert.equal(off.world.cast.length, 0);
});

test("a lost life brings the cast back as the run placed it, with no missile, ticket or line left over", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  play(g);
  const s = g.world.cast.find((n) => n.spawn === "server-buffet");
  Object.assign(g.world.hero, { x: 4700, y: 0 });
  untilG(g, (x) => x.world.cast.find((n) => n.spawn === "server-buffet").act === "attack", 4);
  assert.equal(s.act, "attack");
  g.world.missiles.push({ id: 9, kind: "plane", x: 4000, y: -200, vx: 100, vy: 0, spin: 0, life: 5, phase: 0, from: 0 });
  g.world.hero.patience = 1;
  g.world.hit(g.world.hero.x + 100);
  untilG(g, (x) => x.mode === "play" && x.run.lives === 2, 6);
  const fresh = g.world.cast.find((n) => n.spawn === "server-buffet");
  assert.notEqual(fresh, s, "a fresh cast");
  assert.deepEqual([fresh.act, fresh.x, fresh.noticed, fresh.hits], ["idle", 4900, false, 0]);
  assert.equal(g.world.missiles.length, 0);
  assert.equal(attackers(g.world.cast), 0);
});

test("the stash has no cast, and the lobby's cast is exactly as he left it when he comes back", () => {
  // A twin run that never goes through the door: the same seed, the same steps, so its cast is what the lobby's should be.
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  const twin = createGame({ lobby: LOBBY, stash: STASH }, 3);
  for (const x of [g, twin]) {
    play(x);
    Object.assign(x.world.hero, { x: 9700, y: 0 });
    Object.assign(x.world.cast.find((n) => n.spawn === "bellhop-floor"), { act: "down", actT: 1, hits: 1, hat: false });
  }
  g.step(input({ down: true }, { down: true }));
  twin.step(input());
  assert.equal(g.level.id, "stash");
  assert.equal(g.world.cast.length, 0);
  stepsG(g, 2);
  Object.assign(g.world.hero, { x: 320, y: 0 });
  g.step(input());
  g.step(input({ down: true }, { down: true }));
  untilG(g, (x) => x.level.id === "lobby", 2, { down: true });
  assert.equal(g.level.id, "lobby");
  assert.equal(JSON.stringify(g.world.cast), JSON.stringify(twin.world.cast), "untouched while he was away");
});

test("the Game scores the cast: a knockdown 100, a chain's points, and the eighth bowl is a life", () => {
  const none = { count: 0, bucees: 0, nuts: 0 };
  const one = { ...LOBBY, cast: [{ id: "o", person: "office-1", x: 2930, y: 0 }], carts: [], crates: [], checkpoints: [], rewards: none };
  const g = createGame({ lobby: one, stash: STASH }, 3);
  play(g);
  Object.assign(g.world.hero, { x: 2700, y: 0, facing: 1 });
  g.step(input({ hammer: true }, { hammer: true }));
  stepsG(g, 0.5);
  assert.equal(g.run.score, 100, "the office worker went down");
  const row = { ...LOBBY, cast: Array.from({ length: 8 }, (_, i) => ({ id: `o${i}`, person: "office-1", x: 3000 + i * 120, y: 0 })), carts: [2700], crates: [], checkpoints: [], rewards: none };
  const c = createGame({ lobby: row, stash: STASH }, 3);
  play(c);
  Object.assign(c.world.hero, { x: 300, y: 0 });
  c.world.targets[0].vx = 1100;
  const lives = c.run.lives;
  stepsG(c, 3);
  assert.equal(c.run.score, 100 + 200 + 400 + 800 + 1000 + 2000 + 4000 + 8000, "one chain through the row");
  assert.equal(c.run.lives, lives + 1, "the eighth is a life");
});

test("the desk bellhop keeps his cart on the side with room: it never goes into the desk, and no ticket is left held", () => {
  // The desk: a solid from 1500 to 2400, 180 high, right beside his spot at 1400.
  const stage = flat({ solids: [{ x: 1500, y: -180, w: 900, h: 180 }] });
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1400, y: 0, cart: 1250 }], { x: -1500, y: 0 }, {}, [1250], stage);
  Object.assign(w.hero, { x: 600, invuln: 99 });
  const b = npc(w, "b");
  const cart = w.targets[0];
  until(w, () => npc(w, "b").act === "chase", 4);
  assert.equal(b.act, "chase", "shoved");
  // Hammer jumps it and runs on past the desk; the cart stops and he goes to fetch it.
  Object.assign(w.hero, { x: 2600, y: 0 });
  let jump = 0;
  let last = cart.x;
  for (let i = 0; i < Math.round(14 / STEP) && !(b.act === "idle" && Math.abs(b.x - 1400) < 10); i++) {
    w.step(input());
    jump = Math.max(jump, Math.abs(cart.x - last));
    last = cart.x;
  }
  assert.ok(b.act === "idle" && Math.abs(b.x - 1400) < 10, `home and idle: ${b.act} at ${b.x}`);
  assert.ok(cart.x < 1500 - cart.w / 2, `the cart stays clear of the desk: ${cart.x}`);
  assert.ok(jump <= 20, `the cart never jumps: ${jump} px in one step`);
  assert.equal(attackers(w.cast), 0, "no ticket held");
  // A cart that ends up beyond the desk is given up on: he stops at the desk, lets it go, and the ticket comes back.
  Object.assign(cart, { x: 2600, vx: 0, vy: 0, onGround: true });
  until(w, () => npc(w, "b").act === "chase", 1);
  assert.equal(b.act, "chase", "he goes after it");
  until(w, () => npc(w, "b").act !== "chase", 4);
  assert.ok(b.act === "idle" && b.x < 1500, `gave up at the desk: ${b.act} at ${b.x}`);
  const after = steps(w, 2);
  assert.equal(attackers(w.cast), 0, "no ticket held for a cart he cannot reach");
  assert.equal(of(after, "castWindup").length, 0, "and no shove without it");
});

test("the Game scores the shield's bowl: 200", () => {
  const none = { count: 0, bucees: 0, nuts: 0 };
  const one = { ...LOBBY, cast: [{ id: "o", person: "office-1", x: 2930, y: 0 }], carts: [], crates: [], checkpoints: [], rewards: none };
  const g = createGame({ lobby: one, stash: STASH }, 3);
  play(g);
  Object.assign(g.world.hero, { x: 2700, y: 0, facing: 1 });
  g.run.star = 10;
  const evs = stepsG(g, 2, { right: true, run: true });
  assert.ok(of(evs, "castHit").some((e) => e.by === "shield"), "he bowled the office worker");
  assert.equal(g.run.score, 200, "the shield's 200");
});

test("touching a student in his throw's follow-through costs nothing: only the plane hurts", () => {
  const w = worldWith([{ id: "k", person: "student-1", x: 700, y: 0 }], { x: 300, y: 0 });
  until(w, () => npc(w, "k").act === "windup", 8);
  until(w, () => npc(w, "k").act === "attack", 1);
  const k = npc(w, "k");
  assert.equal(k.act, "attack", "the follow-through");
  w.missiles.length = 0;
  Object.assign(w.hero, { x: k.x - 30, invuln: 0 });
  const evs = steps(w, 0.1);
  assert.equal(w.hero.patience, 3, "no pip");
  assert.equal(of(evs, "hurt").length, 0);
});

test("the office worker's march hurts head-on, not walked into from behind", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 1000, y: 0, x0: 600, x1: 1400 }], { x: -1500, y: 0 });
  const o = npc(w, "o");
  until(w, () => npc(w, "o").facing === 1 && npc(w, "o").x > 900 && npc(w, "o").x < 1200, 6);
  // He has seen Hammer already (the first sighting turns him round); now dropped onto his back as he walks right.
  o.noticed = true;
  Object.assign(w.hero, { x: o.x - 60, y: 0, facing: 1, invuln: 0 });
  let evs = steps(w, 0.1);
  assert.equal(w.hero.patience, 3, "his back hurts nobody");
  assert.equal(of(evs, "hurt").length, 0);
  // In his path, once the nudge's stagger is over and he marches again, it is a pip.
  until(w, () => npc(w, "o").act === "walk" && npc(w, "o").facing === 1, 3);
  Object.assign(w.hero, { x: o.x + 60, y: 0, facing: -1, invuln: 0 });
  evs = steps(w, 0.1);
  assert.equal(w.hero.patience, 2, "head-on costs a pip");
});

test("a plane thrown at him under the balcony dies on the slab, and one thrown at him mid-tumble passes through", () => {
  const stage = flat({ platforms: [{ x0: 600, x1: 2000, y: -520 }] });
  const under = worldWith([], { x: 1400, y: 0 }, {}, [], stage);
  under.missiles.push(launchPlane(1, { id: 1001, x: 1500, y: -520, h: 310, facing: -1 }, { x: 1400, y: -180 }));
  const evs = until(under, (x) => x.missiles.length === 0, 3);
  assert.equal(under.hero.patience, 3, "never reached him");
  const died = of(evs, "missileHit");
  assert.ok(died.length === 1 && died[0].floor && !died[0].hero && Math.abs(died[0].y + 520) < 1, `it died on the slab: ${JSON.stringify(died)}`);
  const down = worldWith([], { x: 1000, y: 0 });
  down.hero.patience = 1;
  down.hit(down.hero.x + 10);
  until(down, (x) => x.hero.move?.kind === "tumble", 1);
  assert.equal(down.hero.move?.kind, "tumble");
  down.missiles.push(launchPlane(1, { id: 1001, x: 1300, y: -100, h: 310, facing: -1 }, { x: 1000, y: -150 }));
  const through = until(down, (x) => x.missiles.length === 0, 3);
  assert.ok(!of(through, "missileHit").some((e) => e.hero) && of(through, "missileHit").some((e) => e.floor), "through him and down on the floor");
});

test("whatever step her rush reaches him against the swing, it is one knockdown or one pip, never both, and the ticket comes back", () => {
  for (let d = 150; d <= 400; d += 10) {
    const w = worldWith([{ id: "s", person: "server-1", x: 900, y: 0 }], { x: 300, y: 0 });
    until(w, () => npc(w, "s").act === "attack", 3);
    assert.equal(npc(w, "s").act, "attack", `at ${d} px she rushes`);
    w.hero.facing = 1;
    until(w, () => npc(w, "s").x - w.hero.x <= d, 3);
    press(w, "hammer");
    const evs = steps(w, 0.8);
    const hits = of(evs, "castHit").length;
    const pips = 3 - w.hero.patience;
    assert.ok(hits + pips === 1, `at ${d} px: ${hits} knockdowns and ${pips} pips`);
    // Knocked down, her attack ends at once; past him, her rush runs its course (2 s or 1000 px) and then ends.
    until(w, (x) => attackers(x.cast) === 0, 3);
    assert.equal(attackers(w.cast), 0, `at ${d} px the ticket is back`);
  }
});

const ACTS = ["idle", "walk", "notice", "windup", "attack", "recover", "chase", "return", "hide", "bumped", "fly", "down", "getup", "leave", "slide", "slip", "frozen", "schooled", "duck", "hop", "flee"];
const ROLES = ["bellhop", "server", "office", "student"];
const ctx = (role, act, t, extra = {}) => ({ role, act, t, speed: 300, onGround: true, sit: false, spin: 0, hits: 0, ...extra });

test("every act of every role animates without a jump: no joint turns more than 9 degrees in one step", () => {
  const bad = [];
  for (const role of ROLES)
    for (const act of ACTS) {
      const seconds = ACT_SECONDS[act] || 2;
      let worst = 0;
      let last = castPose(ctx(role, act, 0));
      for (let t = STEP; t <= seconds; t += STEP) {
        const p = castPose(ctx(role, act, t));
        for (const j of JOINT_NAMES) worst = Math.max(worst, Math.abs(p.rot[j] - last.rot[j]));
        worst = Math.max(worst, Math.abs(p.lean - last.lean), Math.abs(p.headTilt - last.headTilt), Math.abs(p.root.y - last.root.y) / 4);
        last = p;
      }
      if (worst > 9) bad.push(`${role} ${act}: a step of ${worst.toFixed(1)}`);
    }
  assert.deepEqual(bad, []);
});

test("walking swings the hips and the arms, and the students sit when seated", () => {
  const hips = [];
  for (let t = 0; t < 1; t += 0.05) hips.push(castPose(ctx("server", "walk", t)).rot.hipNear);
  assert.ok(Math.max(...hips) - Math.min(...hips) >= 30, "the hips swing");
  const arms = [];
  for (let t = 0; t < 1; t += 0.05) arms.push(castPose(ctx("server", "walk", t)).rot.shoulderFar);
  assert.ok(Math.max(...arms) - Math.min(...arms) >= 15, "the free arm swings");
  const seated = castPose(ctx("student", "idle", 0, { sit: true }));
  assert.ok(seated.rot.hipNear > 70 && seated.rot.kneeNear < -70, "legs folded");
  assert.equal(castGround("idle", true, true), "body");
});

test("down, sliding, slipping and schooled rest on the body; flying is free; the rest stand on their feet", () => {
  assert.equal(castGround("down", true, false), "body");
  assert.equal(castGround("slide", true, false), "body");
  assert.equal(castGround("schooled", true, false), "body");
  assert.equal(castGround("fly", false, false), "none");
  assert.equal(castGround("walk", true, false), "planted");
  assert.equal(castGround("hop", false, false), "none");
});

test("a flying body turns with its spin and lies flat when down from a slide; a tray hand stays up at shoulder height", () => {
  const p = castPose(ctx("office", "fly", 0.3, { spin: 120 }));
  assert.equal(p.spin, 120);
  const slide = castPose(ctx("bellhop", "slide", 0.2));
  assert.ok(Math.abs(slide.spin) >= 80, "on his back");
  const s = solve(castPose(ctx("server", "idle", 0.4)), 1, 0.26);
  assert.ok(s.joints.wristNear.y < s.joints.shoulderNear.y + 30 && s.joints.wristNear.x > s.joints.shoulderNear.x, `the tray hand up in front: ${JSON.stringify(s.joints.wristNear)}`);
});

test("a full jump from the floor clears a cart shoved at him: the cases pass under him, the frame hurts nobody", () => {
  const w = worldWith([], { x: 300, y: 0 }, {}, [700]);
  w.targets[0].vx = -650;
  // Jump late, as a player learns to: when the cart is 230 px off.
  until(w, (x) => x.targets[0].x - x.hero.x < 230, 2);
  w.step(input({ jump: true }, { jump: true }));
  const evs = steps(w, 1.2, { jump: true });
  assert.equal(w.hero.patience, 3, "cleared it");
  assert.equal(of(evs, "hurt").length, 0);
  assert.ok(w.targets[0].x < 300, "the cart passed under him");
});

test("a bonk on a cart in the bellhop's hands knocks it out of them: it flies back into him", () => {
  // Wheeling it home leftward, the cart ahead of him on Hammer's side.
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1400, y: 0, cart: 1250 }], { x: 1020, y: 0 }, {}, [1250]);
  const b = npc(w, "b");
  Object.assign(b, { noticed: true, rest: 99, act: "return", actT: 0, home: 1000, facing: -1 });
  w.hero.facing = 1;
  steps(w, 0.1);
  assert.ok(Math.abs(w.targets[0].x - (b.x - CAST.bellhop.hold)) < 2, "the cart in his hands as he wheels it");
  const x0 = w.targets[0].x;
  press(w, "hammer");
  const evs = until(w, (x) => x.events.some((e) => e.type === "hit"), 1);
  assert.ok(of(evs, "hit").some((e) => e.by === "mallet" && e.target === 1), "the swing meets the cart");
  const after = steps(w, 0.3);
  assert.ok(w.targets[0].x > x0 + 80, `the cart flew out of his hands: ${w.targets[0].x - x0}`);
  assert.ok(["chase", "fly", "down"].includes(b.act) && (b.act !== "chase" || of(after, "castHit").length === 0), `he let go, or it bowled him: ${b.act}`);
});

test("a knocked-out staffer walking off into a wall turns back on screen, and is gone at once off it", () => {
  const wall = flat({ solids: [{ x: 1500, y: -400, w: 100, h: 400 }] });
  const w = worldWith([{ id: "s", person: "server-1", x: 1300, y: 0 }], { x: 900, y: 0 }, {}, [], wall);
  const s = npc(w, "s");
  Object.assign(s, { out: true, facing: 1, act: "leave", actT: 0, noticed: true });
  steps(w, 1.2);
  assert.ok(s.alive && s.facing === -1, "in view of him, she turns back from the wall");
  // 1250 px off at the wall: past his view, short of the 1500 px that removes anyone walking off.
  const far = worldWith([{ id: "s", person: "server-1", x: 1300, y: 0 }], { x: 200, y: 0 }, {}, [], wall);
  const f = npc(far, "s");
  Object.assign(f, { out: true, facing: 1, act: "leave", actT: 0, noticed: true });
  steps(far, 1.2);
  assert.equal(f.alive, false, "out of his view and blocked, she is gone");
});

test("coffee that hits him in the air leaves its puddle on the floor under him", () => {
  const w = worldWith([], { x: 1000, y: 0 });
  Object.assign(w.hero, { y: -260, onGround: false, vy: 0, invuln: 0 });
  w.missiles.push({ id: 1, kind: "coffee", x: 1000, y: -400, vx: 0, vy: 0, spin: 0, life: 1, phase: 0, from: 0 });
  const evs = [];
  stepMissiles(w, STEP, evs);
  assert.ok(evs.some((e) => e.type === "missileHit" && e.hero), "it hit him");
  assert.equal(w.puddles.at(-1).y, 0, "on the marble, not in the air");
});

test("planes in the air and planes being folded count together against the cap of three", () => {
  const w = worldWith([{ id: "a", person: "student-1", x: 1400, y: 0 }, { id: "b", person: "student-2", x: 1600, y: 0 }], { x: 700, y: 0 });
  for (const n of w.cast) Object.assign(n, { noticed: true, rest: 0 });
  for (const id of [90, 91]) w.missiles.push({ id, kind: "plane", x: 5000 + id, y: -2600, vx: 0, vy: 0, spin: 0, life: 3, phase: 0, from: 0 });
  let worst = 0;
  for (let i = 0; i < Math.round(1 / STEP); i++) {
    w.step(input());
    const up = w.missiles.filter((m) => m.kind === "plane").length + w.cast.filter((n) => n.act === "windup").length;
    worst = Math.max(worst, up);
  }
  assert.ok(worst <= 3, `at most three, counted ${worst}`);
});

test("a lecture landing while the screen's office worker rears back brings him out to march, not idle and hidden", () => {
  const w = worldWith([{ id: "o", person: "office-2", x: 1400, y: 0, hide: true }], { x: 300, y: 0 });
  w.hero.x = 1000;
  until(w, () => npc(w, "o").act === "windup", 1);
  const o = npc(w, "o");
  assert.equal(o.act, "windup");
  w.hero.facing = 1;
  w.hero.lectureCd = 0;
  press(w, "lecture");
  until(w, (x) => x.events.some((e) => e.type === "castFreeze"), 1);
  assert.ok(o.act === "frozen" && !o.hide, "frozen in the open");
  until(w, () => o.act === "walk", 3);
  assert.equal(o.act, "walk", "he marches once the freeze ends");
});

test("an office worker marching into him in grace passes through: no coffee, no line, no stagger", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 1000, y: 0, x0: 600, x1: 1400 }], { x: -1500, y: 0 });
  const o = npc(w, "o");
  until(w, () => npc(w, "o").facing === 1 && npc(w, "o").x > 900 && npc(w, "o").x < 1200, 6);
  o.noticed = true;
  Object.assign(w.hero, { x: o.x + 60, y: 0, facing: -1, invuln: 1.4 });
  const evs = steps(w, 0.1);
  assert.equal(of(evs, "castSplash").length, 0, "no coffee over him in grace");
  assert.ok(!of(evs, "castLine").some((e) => e.text === "Oh. Were you standing there?"));
  assert.equal(o.act, "walk", "he marches on");
  assert.equal(w.hero.patience, 3);
});

test("a bellhop chasing his cart faces it, wherever it rolled", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1000, y: 0, cart: 850 }], { x: -1500, y: 0 }, {}, [850]);
  const b = npc(w, "b");
  Object.assign(w.targets[0], { x: 1700, vx: 0 });
  Object.assign(b, { noticed: true, act: "chase", actT: 0, facing: -1 });
  steps(w, 0.3);
  assert.equal(b.facing, 1, "turned to the cart behind him");
  assert.ok(b.vx > 0, "and walking forwards to it");
});

test("the recolored repeats are drawn within 4 percent of their painting's height, everyone else as painted", () => {
  const w = createGame({ lobby: LOBBY, stash: STASH }, 5).world;
  for (const n of w.cast) {
    const spawn = LOBBY.cast.find((s) => s.id === n.spawn);
    assert.equal(n.size, spawn.size ?? 1);
    assert.ok(Math.abs(n.size - 1) <= 0.04, `${n.spawn}: ${n.size}`);
    assert.ok(spawn.recolor ? n.size !== 1 : n.size === 1, `${n.spawn}: only the repeats are resized`);
  }
});
