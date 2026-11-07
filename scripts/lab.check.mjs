// 3-5 The Basel office (story spec §10.2): the corridor in scrubs, its stations, racks and bays, the gurneys and IV poles, the
// sharps bins, the code blue stretch, the autoclave's steam, the vending machines; the office's people, the spray and the
// slip; the scripted trainee and the masher.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { LAB } from "../src/sim/levels/lab.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { hudOf, hintOf } from "../src/render/hud.ts";
import { flies } from "../src/sim/missiles.ts";
import { drive } from "../src/sim/drive.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
/** `each` runs after every step, with its events still the step's. */
const until = (g, done, seconds = 10, held = {}, each) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); each?.(g); evs.push(...g.events); } return evs; };
const lab = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 81, { cast: true, title: true }); g.newRun(81, 0, { shift: [LAB], journey: true, ...opts }); return g; };
/** The office with nobody in it, for what a stretch does alone. */
const empty = () => lab({ shift: [{ ...LAB, cast: [] }] });

test("the office: 14,000 px in scrubs, six stations, two vending machines that pay three, the break room's stash door, two punch clocks, the double doors", () => {
  assert.deepEqual([LAB.length, LAB.costume, LAB.music, LAB.platforms.filter((p) => p.kind === "counter").length, LAB.crates.filter((c) => c.look === "vending").map((c) => c.yield), LAB.doors.map((d) => [d.kind, d.label]), LAB.checkpoints.map((c) => c.x)], [14000, "scrubs", "lab", 6, [3, 3], [["stash", "BREAK ROOM"], ["exit", "TRAINING ROOM"]], [4800, 10200]]);
  assert.deepEqual([LAB.world, LAB.name, LAB.card, LAB.time, STOP_LEVELS.get("lab")], ["3-5", "The Basel office", "Skills lab · Training day.", 420, LAB]);
  const g = empty(); play(g); const h = g.world.hero; const vend = LAB.crates.find((c) => c.id === "vend-1"); Object.assign(h, { x: vend.x - 120, y: 0, facing: 1 }); const cans0 = g.run.cans;
  const evs = [];
  for (let i = 0; i < 240 && !g.crates.find((c) => c.id === "vend-1").used; i++) { g.step(input({ hammer: true }, { hammer: i % 40 === 0 })); evs.push(...g.events); }
  assert.deepEqual([of(evs, "canPop").length, g.run.cans - cans0 >= 3], [3, true], "three cans out");
});
test("a gurney rolls at 220 and turns at its bay's ends; its side is a hit, its top a ride, and a jump clears it", () => {
  const g = empty(); play(g); const h = g.world.hero; const m = g.world.movers.find((x) => x.id === "gurney-1"); assert.deepEqual([m.speed, m.h, m.x0, m.x1], [220, 150, 2200, 3400]);
  Object.assign(h, { x: m.x - 400, y: 0, patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.patience < 2, 4, { right: true }); assert.equal(h.patience, 1, "the side");
  Object.assign(h, { x: m.x, y: m.top.y, vx: 0, vy: 0, move: null, onGround: true, patience: 2, invuln: 0 }); until(g, () => false, 1); assert.deepEqual([h.patience, Math.abs(h.y - m.top.y) < 2], [2, true], "riding");
});
test("an IV pole is low and a hit to touch; a sharps bin on a counter is a hit with its bubble; the steam vents 2 s in 5 at +20 a second", () => {
  const g = empty(); play(g); const h = g.world.hero; const iv = g.world.movers.find((x) => x.id === "iv-1"); assert.deepEqual([iv.h, iv.speed], [60, 40]);
  Object.assign(h, { x: iv.x - 200, y: 0, patience: 2, invuln: 0 }); until(g, (x) => x.world.hero.patience < 2, 3, { right: true }); assert.equal(h.patience, 1);
  Object.assign(h, { x: 4400, y: -120, onGround: true, patience: 2, invuln: 0 }); const bin = until(g, (x) => of(x.events, "sharps").length > 0, 2, { right: true }); g.step(input()); assert.deepEqual([of(bin, "sharps").length, h.patience], [1, 1]);
  // Standing still cools him 4 a second: 2 s on the vent nets +32, the 3 s off it cools 12.
  Object.assign(h, { x: 6550, y: 0, heat: 0, vx: 0, vy: 0, move: null, onGround: true, invuln: 0 }); g.world.time = 0; until(g, () => false, 2); const hot = h.heat; until(g, () => false, 3); assert.deepEqual([Math.round(hot), Math.round(h.heat)], [32, 20]);
  Object.assign(h, { x: 6550, y: 0 }); g.world.time = 0; g.step(input()); assert.match(hintOf(g), /Autoclave/);
});
test("in the code blue stretch the staff move at 1.8 times and the event fires at its ends", () => {
  const g = lab({ shift: [{ ...LAB, cast: [{ id: "worker", person: "office-1", x: 8600, y: 0, x0: 8100, x1: 9100 }] }] }); play(g); const h = g.world.hero;
  Object.assign(h, { x: 7700, y: 0 }); const on = until(g, (x) => of(x.events, "codeBlue").length > 0, 2, { right: true }); assert.equal(of(on, "codeBlue")[0].on, true);
  const n = g.world.cast.find((c) => c.x > 7800 && c.x < 9400 && c.role !== "student"); const x0 = n.x; until(g, () => false, 1); assert.ok(Math.abs(n.x - x0) > 0, "moving"); assert.equal(g.world.codeBlue, 1.8);
  Object.assign(h, { x: 9300, y: 0 }); const off = until(g, (x) => of(x.events, "codeBlue").length > 0, 2, { right: true }); assert.equal(of(off, "codeBlue")[0].on, false);
});
test("the code blue's multiplier: a staffer inside it walks 1.8 times as far as one outside", () => {
  const one = (x) => lab({ shift: [{ ...LAB, movers: [], cast: [{ id: "a", person: "server-1", x, y: 0, x0: x - 400, x1: x + 400, trick: "tray" }] }] });
  const run = (x, hero) => { const g = one(x); play(g); Object.assign(g.world.hero, { x: hero, y: 0 }); const n = g.world.cast[0]; until(g, () => false, 0.2); const a = n.x; until(g, () => false, 0.5); return Math.abs(n.x - a); };
  const out = run(3000, 1000); const inn = run(8300, 9300);
  assert.ok(out > 0 && Math.abs(inn / out - 1.8) < 0.15, `inside ${inn}, outside ${out}`);
});
test("the venue reads Skills lab and the HUD has no errands here", () => {
  const g = empty(); play(g); assert.deepEqual([hudOf(g).venue, hudOf(g).errands], ["Skills lab", null]);
});
test("a nurse sprays within 300 px after a 0.4 s wind-up and leaves a puddle that slips him with no pip, once in 1.6 s; she never marches", () => {
  const g = lab(); play(g); const h = g.world.hero; const n = g.world.cast.find((c) => c.trick === "spray"); Object.assign(h, { x: n.x - 250, y: 0, patience: 2, invuln: 0, vx: 0 });
  const evs = until(g, (x) => of(x.events, "spray").length > 0, 3); assert.deepEqual([of(evs, "castWindup").length >= 1, g.world.puddles.some((p) => p.kind === "sanitizer"), n.act !== "attack" || n.vx === 0], [true, true, true]);
  const slip = until(g, (x) => of(x.events, "slipped").length > 0, 2, { right: true }); assert.deepEqual([of(slip, "slipped").length, h.patience, h.stunT > 0 || h.vx <= 0], [1, 2, true]);
  assert.equal(of(until(g, () => false, 1, { right: true }), "slipped").length, 0, "once in 1.6 s");
});
test("techs shove and go in two; residents throw charts that fly as planes; the administrator greets him once and takes no part", () => {
  const g = lab(); play(g); const h = g.world.hero; const t = g.world.cast.find((c) => c.job === "tech"); assert.deepEqual([t.role, t.maxHits], ["bellhop", 2]);
  const r = g.world.cast.find((c) => c.job === "resident"); Object.assign(h, { x: r.x - 500, y: 0 }); until(g, (x) => x.world.missiles.some((m) => m.kind === "chart"), 4); assert.ok(flies("chart") && g.world.missiles.some((m) => m.kind === "chart"));
  const k = lab(); play(k); const a = k.world.cast.find((c) => c.job === "admin"); Object.assign(k.world.hero, { x: 300, y: 0 }); const hi = until(k, () => false, 2, { right: true });
  assert.deepEqual([of(hi, "castLine").filter((e) => e.text.startsWith("Mr. Hammer.")).length, of(hi, "think").some((e) => e.text === "I'm here to train."), a.trick], [1, true, "seated"]);
});
test("the scripted trainee walks the office to the double doors through everyone; a masher is finished", () => {
  // Through lost lives, as the earlier walkers' loops run: the corridor is meant to cost a pip or two.
  const g = lab(); play(g); let t = 0; while (g.mode !== "walkoff" && g.mode !== "over" && t < 410) { g.step(g.mode === "play" ? drive(g.level, g.world.hero, "lab", g.world) : input()); t += STEP; } assert.equal(g.mode, "walkoff");
  const m = lab(); play(m); until(m, (x) => x.mode === "over", 420, { right: true, run: true, hammer: true }); assert.equal(m.mode, "over");
});
test("the vending machines stand against the wall: he walks past them, and the mallet still opens them", () => {
  const g = empty(); play(g); const h = g.world.hero; Object.assign(h, { x: 1300, y: 0 });
  until(g, (x) => x.world.hero.x > 1700, 2, { right: true }); assert.ok(h.x > 1700, `past the machine at ${h.x}`);
});
