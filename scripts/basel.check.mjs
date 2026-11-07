// 3-4 Basel in Tattoo week (story spec §10.1): the street from the Kaserne to the office's door, the four errands held at
// their counters, the door that needs them, the crowd behind the barriers, the bikes over the ramp; the parade's bands, the
// drum corps and the drill team; the drum major and the pipers who follow; the scripted walker and the masher.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { BASEL } from "../src/sim/levels/basel.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { hudOf } from "../src/render/hud.ts";
import { PARADE } from "../src/sim/parade.ts";
import { flies } from "../src/sim/missiles.ts";
import { MAJOR } from "../src/sim/major.ts";
import { hitBoss, BOSS_NAMES } from "../src/sim/boss.ts";
import { drive } from "../src/sim/drive.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
/** `each` runs after every step, with its events still the step's. */
const until = (g, done, seconds = 10, held = {}, each) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); each?.(g); evs.push(...g.events); } return evs; };
const knockOut = (g) => { g.world.hero.patience = 1; g.world.hero.invuln = 0; g.world.hit(g.world.hero.x + 100); };
const basel = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 81, { cast: true, title: true }); g.newRun(81, 0, { shift: [BASEL], journey: true, ...opts }); return g; };

test("Basel's street: 16,000 px, two punch clocks, four errands at their counters, a door that needs them", () => {
  assert.deepEqual([BASEL.length, BASEL.time, BASEL.music, BASEL.checkpoints.map((c) => c.x), BASEL.errands.map((e) => e.id), BASEL.doors[0].errands], [16000, 420, "basel", [5600, 11000], ["bank", "printer", "pharmacy", "courier"], true]);
  assert.deepEqual([BASEL.platforms.filter((p) => p.kind === "barrier").length, BASEL.platforms.filter((p) => p.kind === "bleacher").every((p) => p.y === -520), BASEL.home], [5, true, { x: 900, cx: 1400 }]);
  assert.deepEqual([BASEL.world, BASEL.name, BASEL.card, STOP_LEVELS.get("basel")], ["3-4", "Basel, Tattoo week", "14 July. 18:10. Four errands and a meeting.", BASEL]);
});
test("an errand counts after 1.5 s standing at its counter, says its line, and the HUD counts it; walking away resets the hold", () => {
  const g = basel(); play(g); const h = g.world.hero; Object.assign(h, { x: 7900, y: 0 });
  until(g, () => false, 1); assert.deepEqual([g.run.errands, hudOf(g).errands], [[], { n: 0, of: 4 }]);
  Object.assign(h, { x: 8200 }); until(g, () => false, 0.2); Object.assign(h, { x: 7900, vx: 0 });
  const evs = until(g, (x) => x.run.errands.length > 0, 2); assert.deepEqual([g.run.errands, of(evs, "errand")[0].n, of(evs, "think").some((e) => e.text === "Francs. Not euros. Not dollars. FRANCS."), hudOf(g).errands], [["bank"], 1, true, { n: 1, of: 4 }]);
  assert.ok(until(g, (x) => x.run.errands.length > 1, 3).length > 0 && g.run.errands.length === 1, "once");
});
test("the office door stays shut until 4/4 and says why; at 4/4 it ends the level; errands survive a lost life and not Try again", () => {
  const g = basel(); play(g); const h = g.world.hero; Object.assign(h, { x: 15600, y: 0 });
  const shut = until(g, () => false, 1, { right: true }); assert.deepEqual([g.mode, of(shut, "errandsShut").length >= 1, of(shut, "think").filter((e) => e.text === "I have four errands and a meeting.").length], ["play", true, 1]);
  for (const id of ["bank", "printer", "pharmacy"]) g.dev.errand(id); knockOut(g); until(g, (x) => of(x.events, "respawn").length > 0, 4); assert.deepEqual(g.run.errands, ["bank", "printer", "pharmacy"]);
  g.dev.errand("courier"); play(g); Object.assign(h, { x: 15600, y: 0 }); until(g, (x) => x.mode !== "play", 2, { right: true }); assert.equal(g.mode, "walkoff");
  const t = basel(); play(t); t.dev.errand("bank"); t.world.hero.patience = 1; t.run.lives = 1; knockOut(t); until(t, (x) => x.mode === "over", 4); t.newRun(81, t.venue, { snapshot: t.snapshot }); play(t); assert.deepEqual(t.run.errands, []);
});
test("the crowd cheers and is bonked once with Prost!, never solid; the bikes come in pairs and jump the ramp", () => {
  const g = basel(); play(g); const h = g.world.hero; const fan = g.world.cast.find((n) => n.trick === "cheer"); Object.assign(h, { x: fan.x - 200, y: 0 });
  until(g, () => false, 1, { right: true }); assert.ok(h.x > fan.x, "walked through");
  Object.assign(h, { x: fan.x - 150 }); const evs = until(g, (x) => !x.world.cast.find((n) => n.id === fan.id).alive, 2, {}, (x) => x.step(input({}, { hammer: true }))); assert.ok(of(evs, "castLine").some((e) => e.text === "Prost!"));
  const bikes = g.world.movers.filter((m) => m.id.startsWith("bike")); assert.deepEqual([bikes.length, bikes[1].first - bikes[0].first, bikes[0].jump], [2, 0.5, { x: 11000, d: 700, h: 320 }]);
  until(g, (x) => x.world.movers.some((m) => m.id === "bike-1" && m.live && m.x < 10700 && m.x > 10400), 20); assert.ok(bikes[0].y < -200, "in the air over the ramp");
});
test("the ramp is a floor he walks up from the old town's side, and a face he jumps from the bridge's", () => {
  const g = basel(); play(g); const h = g.world.hero; g.world.movers.length = 0; g.world.cast.length = 0; g.world.parade = null; Object.assign(h, { x: 11300, y: 0, facing: -1 });
  until(g, (x) => x.world.hero.x < 10750, 3, { left: true }); assert.ok(h.y < -150 && h.onGround, `up the ramp at ${h.y}`);
  Object.assign(h, { x: 10350, y: 0, vx: 0, vy: 0, onGround: true }); until(g, () => false, 1, { right: true }); assert.ok(h.x < 10600, "the face stops a walk");
});
test("a band waits for him, rises a second, marches at 200 px/s and is gone at its end; standing in its way is caught, carried 400 px and dropped for a hit", () => {
  const g = basel(); play(g); const h = g.world.hero; const band = () => g.world.parade.bands[0];
  assert.deepEqual([band().state, band().x, PARADE.speed, PARADE.carry], ["wait", 3200, 200, 400]);
  Object.assign(h, { x: 1100, y: 0 }); const rise = until(g, (x) => x.world.parade.bands[0].state === "march", 2); assert.deepEqual([of(rise, "bandRise").length, of(rise, "bandStep").length], [1, 1]);
  const x0 = band().x; until(g, () => false, 1); assert.ok(Math.abs(band().x - (x0 - 200)) < 2);
  Object.assign(h, { x: band().x - 300, y: 0, invuln: 0, patience: 2 }); const hx = h.x; const caught = until(g, (x) => of(x.events, "dropped").length > 0, 4);
  assert.deepEqual([of(caught, "caught").length, of(caught, "dropped").length, h.patience, Math.round((hx - h.x) / 50) * 50 >= 350], [1, 1, 1, true]);
  until(g, (x) => x.world.parade.bands[0].state === "gone", 20); assert.equal(band().state, "gone");
});
test("a slide goes through the hole; a jump into the rank is caught; a band that has gone catches nothing; the bleachers stand above the pipes", () => {
  const g = basel(); play(g); const h = g.world.hero; g.dev.band("band-1"); until(g, (x) => x.world.parade.bands[0].state === "march", 2); const b = g.world.parade.bands[0];
  Object.assign(h, { x: b.x - 500, y: 0, vx: 0 }); until(g, () => false, 0.4, { right: true, run: true }); const slid = until(g, (x) => x.world.hero.x > b.x + 100, 1.5, { right: true, run: true, down: true });
  assert.deepEqual([of(slid, "caught").length, h.x > b.x], [0, true]);
  Object.assign(h, { x: b.x - 900, y: 0 }); const jumped = until(g, (x) => of(x.events, "caught").length > 0, 3, { right: true }, (x) => { if (Math.abs(x.world.hero.x - b.x) < 250 && x.world.hero.onGround) x.step(input({ right: true }, { jump: true })); });
  assert.equal(of(jumped, "caught").length, 1);
  assert.ok(BASEL.platforms.filter((p) => p.kind === "bleacher").every((p) => -p.y > PARADE.h));
  const k = basel(); play(k); k.dev.band("band-1"); const kb = k.world.parade.bands[0]; until(k, (x) => x.world.parade.bands[0].state === "gone", 20);
  Object.assign(k.world.hero, { x: kb.x, y: 0, invuln: 0 }); assert.equal(of(until(k, () => false, 1), "caught").length, 0, "gone");
});
test("the drum corps shakes every 2.5 s within hearing and knocks him off a barrier near them, no pip; the drill team's rifles fly on an arc, swatted or ducked", () => {
  const g = basel(); play(g); const h = g.world.hero; Object.assign(h, { x: 12700, y: -120, onGround: true, patience: 2 });
  const hits = until(g, (x) => of(x.events, "knocked").length > 0, 3); assert.deepEqual([of(hits, "drumHit").length >= 1, h.onGround, h.patience], [true, false, 2]);
  until(g, () => false, 0.6); assert.deepEqual([h.y, h.patience], [0, 2], "off the barrier, on the floor");
  Object.assign(h, { x: 9000, y: 0 }); assert.equal(until(g, (x) => of(x.events, "drumHit").length > 0, 3).some((e) => e.type === "drumHit"), false, "out of hearing");
  const m = basel(); play(m); const d = m.world.cast.find((n) => n.job === "drill"); Object.assign(m.world.hero, { x: d.x - 500, y: 0 });
  const thrown = until(m, (x) => x.world.missiles.some((r) => r.kind === "rifle"), 4); const r = m.world.missiles.find((q) => q.kind === "rifle"); assert.deepEqual([of(thrown, "castThrow").length >= 1, r.vy < 0, flies("rifle")], [true, true, true]);
  const ducked = until(m, (x) => !x.world.missiles.some((q) => q.kind === "rifle"), 3, { down: true }); assert.equal(of(ducked, "missileHit").filter((e) => e.hero).length, 0);
});
test("a carried hero never goes through a wall or past the level's start; a catch in grace is none", () => {
  const g = basel(); play(g); const h = g.world.hero; g.dev.band("band-1"); until(g, (x) => x.world.parade.bands[0].state === "march", 2); const b = g.world.parade.bands[0];
  Object.assign(b, { x: 400, x1: -600 }); Object.assign(h, { x: 250, y: 0, invuln: 0, patience: 2 }); const evs = until(g, (x) => of(x.events, "dropped").length > 0, 3);
  assert.deepEqual([of(evs, "caught").length, of(evs, "dropped").length, h.x >= h.w / 2 - 1], [1, 1, true]);
  const k = basel(); play(k); k.dev.band("band-1"); until(k, (x) => x.world.parade.bands[0].state === "march", 2); const kb = k.world.parade.bands[0];
  Object.assign(k.world.hero, { x: kb.x - 200, y: 0, invuln: 3 }); assert.equal(of(until(k, () => false, 1.5), "caught").length, 0);
});
test("the drum major wakes within 700 px, whistles up a rank of four that marches the arena, throws the mace two seconds high and is hit only while it is up; the mace landing on Hammer is a hit", () => {
  const g = basel(); play(g); const h = g.world.hero; const m = g.world.boss; assert.deepEqual([m.kind, m.hp, m.state, BOSS_NAMES.major], ["major", 3, "wait", "The drum major"]);
  for (const id of BASEL.errands.map((e) => e.id)) g.dev.errand(id); Object.assign(h, { x: 11650, y: 0 });
  const w = until(g, (x) => x.world.boss.state === "rank", 2); assert.deepEqual([of(w, "whistle").length, of(w, "bossSay").some((e) => e.text === "Stand clear!"), g.world.parade.bands.some((b) => b.id.startsWith("rank") && b.state !== "wait")], [1, true, true]);
  assert.equal(hitBoss(m, "bonk", g.events), false);
  until(g, (x) => x.world.boss.state === "throw", 12); const up = m.mace; assert.deepEqual([up.vy, MAJOR.air], [-1960, 2.0]);
  assert.equal(hitBoss(m, "bonk", g.events), true); assert.deepEqual([m.hp, m.state], [2, "hurt"]);
  const t = basel(); play(t); const th = t.world.hero; const tm = t.world.boss; Object.assign(th, { x: 11650, y: 0 }); until(t, (x) => x.world.boss.state === "throw", 14);
  Object.assign(th, { x: tm.x, y: 0, patience: 2, invuln: 0 }); const land = until(t, (x) => of(x.events, "maceLand").length > 0, 3); assert.deepEqual([of(land, "maceLand")[0].hit, th.patience], [true, 1]);
});
test("three hits over three rounds, one whistle a round; Carry on, sir., 1,000 points, and four pipers fall in behind him at his walk and stop when he stops", () => {
  const g = basel(); play(g); const h = g.world.hero; const m = g.world.boss; g.world.movers.length = 0; Object.assign(h, { x: 11650, y: 0 });
  let whistles = 0; const hitUp = () => { const evs = until(g, (x) => x.world.boss.state === "throw", 14, { down: true }); whistles += of(evs, "whistle").length; hitBoss(m, "bonk", g.events); until(g, (x) => x.world.boss.state !== "hurt" && x.world.boss.state !== "throw", 2); };
  hitUp(); hitUp(); hitUp(); const win = until(g, (x) => x.world.boss.state === "down", 3);
  assert.deepEqual([whistles, m.hp, of(win, "bossSay").some((e) => e.text === "Carry on, sir."), of(win, "bossDown")[0].points, of(win, "follow")[0].n, g.world.parade.followers.length], [3, 0, true, 0, 4, 4], "the 1,000 came with the third hit");
  const fx = g.world.parade.followers.map((f) => f.x); until(g, () => false, 1, { right: true }); const moved = g.world.parade.followers.map((f) => f.x);
  assert.ok(moved.every((x, i) => x > fx[i] && x < h.x - 100), `they follow behind: ${fx} -> ${moved}, him at ${h.x}`); until(g, () => false, 0.5); assert.deepEqual(g.world.parade.followers.map((f) => f.x), moved, "they stop with him");
});
test("while the drum major stands he holds the Marktplatz: no way past him to the office", () => {
  const g = basel(); play(g); const h = g.world.hero; Object.assign(h, { x: 11650, y: 0 }); until(g, (x) => x.world.boss.awake, 1);
  Object.assign(h, { x: 12900, y: 0, invuln: 99 }); until(g, () => false, 2, { right: true, run: true }); assert.ok(h.x <= BASEL.boss.arena[1] + 1, `held at ${h.x}`);
});
test("the scripted walker runs the errands, slides the bands and beats the drum major to the office door; a masher who never slides is finished by the bands", () => {
  const g = basel(); play(g); let t = 0; while (g.mode === "play" && t < 410) { g.step(drive(g.level, g.world.hero, "basel", g.world)); t += STEP; }
  assert.deepEqual([g.run.errands.length, g.world.boss.state, g.mode], [4, "down", "walkoff"]);
  const m = basel(); play(m); until(m, (x) => x.mode === "over", 420, { right: true, run: true, hammer: true }); assert.equal(m.mode, "over");
});
test("a beaten drum major stays beaten across a lost life, his pipers with him; Try again brings him back", () => {
  const g = basel(); play(g); const h = g.world.hero; g.world.movers.length = 0; Object.assign(h, { x: 11650, y: 0 }); until(g, (x) => x.world.boss.awake, 1);
  g.dev.boss({ hp: 1, state: "throw" }); assert.equal(hitBoss(g.world.boss, "bonk", g.events), true); until(g, (x) => x.world.boss.state === "down", 3);
  knockOut(g); until(g, (x) => of(x.events, "respawn").length > 0, 4);
  assert.deepEqual([g.world.boss.state, g.world.parade.followers.length], ["down", 4]);
  g.run.lives = 1; knockOut(g); play(g); knockOut(g); until(g, (x) => x.mode === "over", 6); g.newRun(81, g.venue, { snapshot: g.snapshot }); play(g);
  assert.deepEqual([g.world.boss.state, g.world.boss.hp, g.world.parade.followers.length], ["wait", 3, 0]);
});
import { hintOf, hudKey } from "../src/render/hud.ts";
test("the drum major's win counts with the third hit: a knockdown in the handover keeps it and its 1,000 points; the mace is his to hand over, not to drop on him", () => {
  const g = basel(); play(g); const h = g.world.hero; g.world.movers.length = 0; Object.assign(h, { x: 11650, y: 0 }); until(g, (x) => x.world.boss.awake, 1);
  Object.assign(h, { x: 12150, facing: 1, vx: 0 }); until(g, () => false, 0.2); g.dev.boss({ hp: 1, state: "throw" }); const s = g.run.score;
  const hit = [];
  for (let i = 0; i < 120 && g.world.boss.hp > 0; i++) { g.step(input({ hammer: true }, { hammer: i % 30 === 0 })); hit.push(...g.events); }
  assert.deepEqual([g.world.boss.hp, of(hit, "bossHit").at(-1)?.points], [0, 1000], "the 1,000 with the third hit");
  assert.deepEqual([g.world.boss.state, g.world.boss.mace, g.run.bossDoors], ["handover", null, 1], "the win is banked at once, the mace in his hand");
  Object.assign(h, { patience: 1, invuln: 0 }); g.world.hit(h.x + 100); until(g, (x) => of(x.events, "respawn").length > 0, 4);
  assert.deepEqual([g.world.boss.state, g.run.score - s >= 1000], ["down", true]);
});
test("the office door says how many errands are left, never to walk in while it is shut; the HUD's key moves with the count", () => {
  const g = basel(); play(g); const h = g.world.hero; g.world.boss.state = "down"; g.dev.errand("bank"); g.dev.errand("printer"); Object.assign(h, { x: 15650, y: 0 });
  until(g, () => false, 0.1); assert.equal(hintOf(g), "BASEL OFFICE · errands 2/4");
  const k = hudKey(hudOf(g, null, false, "a note")); g.dev.errand("pharmacy"); assert.notEqual(hudKey(hudOf(g, null, false, "a note")), k, "the count alone moves the key");
});
test("the tellers take no part: standing at a counter for its errand is never a bump or a line from them", () => {
  const g = basel(); play(g); const h = g.world.hero; Object.assign(h, { x: 9800, y: 0 });
  const evs = until(g, () => false, 3); const teller = g.world.cast.find((n) => n.spawn === "teller-copy");
  assert.deepEqual([of(evs, "castBump").filter((e) => e.id === teller.id).length, of(evs, "castLine").filter((e) => e.id === teller.id).length, g.run.errands], [0, 0, ["printer"]]);
});
