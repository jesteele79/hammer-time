import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { createCast, CAST, CAST_ID } from "../src/sim/cast.ts";
import { attackers } from "../src/sim/cast-behavior.ts";
import { createCart } from "../src/sim/targets.ts";

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
  const hits = of(evs, "castHit");
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
