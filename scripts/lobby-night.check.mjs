// The lobby at night (story spec §8.1): 2-1 relit from the lobby, the night crew, the keycards and the five tiers, the doors by tier.
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createGame } from "../src/sim/game.ts";
import { STOP_LEVELS } from "../src/sim/levels/index.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { LOBBY_NIGHT } from "../src/sim/levels/lobby-night.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { newJourney, playableNext } from "../src/sim/journey.ts";
import { builtStops } from "../src/sim/story.ts";
import { STATUS_TIERS, tierOf } from "../src/sim/status.ts";
import { hudOf } from "../src/render/hud.ts";

const NONE = { left: false, right: false, up: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const play = (g) => { while (g.mode === "card") g.step(input()); };
const until = (g, done, seconds = 10, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const knockOut = (g) => { g.world.hero.patience = 1; g.world.hit(g.world.hero.x + 100); };

test("2-1 is the lobby relit: the same walls, furniture and routes under a night ambient, its own name, code and card", () => {
  assert.deepEqual([LOBBY_NIGHT.id, LOBBY_NIGHT.world, LOBBY_NIGHT.ambient, LOBBY_NIGHT.card], ["lobby-night", "2-1", "night", "Front desk has you as MEMBER. System error."]);
  assert.deepEqual([LOBBY_NIGHT.backdrop, LOBBY_NIGHT.furniture, LOBBY_NIGHT.routes, LOBBY_NIGHT.floor, LOBBY_NIGHT.home], [LOBBY.backdrop, LOBBY.furniture, LOBBY.routes, LOBBY.floor, LOBBY.home]);
  assert.deepEqual(LOBBY_NIGHT.thoughts, [{ x: 1100, text: "TITANIUM. Look again." }]);
  assert.ok(builtStops(STOP_LEVELS).includes("lobby-night"));
});
test("2-1 is the next stop Clock in plays once Act 1 is done, and the home scene is the night lobby then", () => {
  const j = { ...newJourney(), next: "lobby-night", done: ["sat", "lobby", "restaurant", "campus", "arena"] };
  assert.equal(playableNext(j, builtStops(STOP_LEVELS)), "lobby-night");
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [LOBBY_NIGHT] }, 5, { cast: false, title: true, home: "lobby-night" });
  assert.equal(g.level.id, "lobby-night");
  const day = createGame({ lobby: LOBBY, stash: STASH, venues: [LOBBY_NIGHT] }, 5, { cast: false, title: true });
  assert.equal(day.level.id, "lobby");
});
test("the night lobby can be the home scene without joining Work the whole shift, and the home spot follows the save", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, homes: [LOBBY_NIGHT] }, 5, { cast: false, title: true, home: "lobby-night" });
  assert.deepEqual([g.level.id, g.world.hero.x, g.mode, g.shift.map((l) => l.id)], ["lobby-night", LOBBY.home.x, "title", ["lobby-night"]]);
  g.newRun(5);
  assert.deepEqual(g.shift.map((l) => l.id), ["lobby"]);
  g.toTitle();
  assert.equal(g.level.id, "lobby-night");
  g.setHome(undefined);
  g.toTitle();
  assert.equal(g.level.id, "lobby");
  g.setHome("lobby-night");
  g.toTitle();
  assert.equal(g.level.id, "lobby-night");
});

const night = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true }); g.newRun(21, 0, { shift: [LOBBY_NIGHT, STASH], journey: true, ...opts }); return g; };
const give = (g, n) => { for (let i = 0; i < n; i++) { const p = g.pickups.find((p) => p.kind === "keycard" && !p.taken); Object.assign(g.world.hero, { x: p.x, y: p.y, onGround: true }); g.step(input()); } };
test("eight keycards stand at the spec's spots and read as +1 keycard; the tiers come at 2, 4, 6, 8 and 10 with 500 points, a word and a thought", () => {
  const g = night(); play(g);
  assert.equal(g.pickups.filter((p) => p.kind === "keycard").length, 7);
  assert.equal(g.levels.stash.keycards.length, 1);
  const before = g.run.score; give(g, 2);
  const tiers = of(g.events, "tier");
  assert.deepEqual([g.run.keycards, tiers.map((e) => e.name), g.run.score - before >= 500], [2, ["SILVER"], true]);
  assert.ok(of(g.events, "think").some((e) => e.text === "Silver gets you nothing. Everyone knows that."));
  assert.deepEqual(STATUS_TIERS.map((t) => t.at), [2, 4, 6, 8, 10]);
  assert.deepEqual([tierOf(1), tierOf(5)?.name, tierOf(10)?.name], [null, "GOLD", "AMBASSADOR"]);
});
test("a seeded pickup never stands on a keycard's spot", () => {
  for (const seed of [1, 21, 77, 1234]) {
    const g = createGame({ lobby: LOBBY, stash: STASH }, seed, { cast: false, title: true }); g.newRun(seed, 0, { shift: [LOBBY_NIGHT], journey: true });
    const cards = g.pickups.filter((p) => p.kind === "keycard");
    for (const p of g.pickups.filter((p) => p.kind !== "keycard")) assert.ok(!cards.some((k) => Math.hypot(k.x - p.x, k.y - p.y) < 100), `${p.kind} at ${p.x}, ${p.y}`);
  }
});
test("Gold adds 60 s once; Titanium a life; Ambassador a checkpoint where he stands and a Buc-ee's; a tier is never granted twice in a run", () => {
  const g = night(); play(g); const t0 = g.run.time;
  g.run.keycards = 3; give(g, 1); assert.equal(Math.round(g.run.time - t0), 60);
  g.run.keycards = 7; const lives = g.run.lives; give(g, 1); assert.equal(g.run.lives, lives + 1);
  g.run.keycards = 9; give(g, 1); assert.deepEqual([g.run.checkpoint, g.pickups.some((p) => p.kind === "bucees" && !p.taken)], ["ambassador", true]);
  const perks = [...g.run.perks]; const t1 = g.run.time; g.run.keycards = 3; g.pickups.push({ id: 99999, kind: "keycard", x: 300, y: 0, taken: false }); Object.assign(g.world.hero, { x: 300, y: 0, onGround: true }); g.step(input());
  assert.deepEqual(g.run.perks, perks);
  assert.ok(g.run.time <= t1, "Gold's minute is not given twice");
});
test("the stairs are the exit on ↓, never by walking past; the elevator opens on ↓ at Titanium", () => {
  const g = night(); play(g);
  Object.assign(g.world.hero, { x: 6300, y: 0, onGround: true, vx: 0 }); until(g, (x) => x.mode !== "play", 1, { right: true });
  assert.equal(g.mode, "play");
  Object.assign(g.world.hero, { x: 6300, y: 0, onGround: true, vx: 0, move: null }); g.step(input({ down: true })); g.step(input({ down: true }));
  assert.equal(g.mode, "walkoff");
  const h = night(); play(h); Object.assign(h.world.hero, { x: 5700, y: 0, onGround: true, vx: 0, move: null });
  h.step(input({ down: true })); h.step(input({ down: true })); assert.equal(h.mode, "play");
  assert.match(hudOf(h, null, false, null).hint, /Reserved for Titanium members/);
  h.run.keycards = 8; h.step(input({ down: true })); h.step(input({ down: true })); assert.equal(h.mode, "walkoff");
});
test("Try again brings back the keycards, the perks and the clock as they stood at the card; a replay starts at MEMBER", () => {
  const g = night(); play(g); give(g, 4); assert.equal(g.run.keycards, 4);
  Object.assign(g.world.hero, { x: 6300, y: 0, onGround: true, vx: 0, move: null }); g.step(input({ down: true })); g.step(input({ down: true }));
  until(g, (x) => x.mode === "story", 12); // 2-1 done; on from the hold to the next level's card
  g.continueStory();
  const snap = structuredClone(g.snapshot);
  assert.deepEqual([snap.run.keycards, snap.run.perks], [4, ["SILVER", "GOLD"]]);
  play(g);
  for (let i = 0; i < 40000 && g.mode !== "over"; i++) { if (g.mode === "play") knockOut(g); g.step(input()); }
  assert.equal(g.mode, "over");
  g.run.keycards = 99;
  g.newRun(21, g.venue, { snapshot: g.snapshot }); play(g);
  assert.deepEqual([g.run.keycards, g.run.perks, g.run.time], [snap.run.keycards, snap.run.perks, snap.run.time]);
  const r = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true }); r.newRun(21, 0, { shift: [LOBBY_NIGHT], journey: true }); play(r);
  assert.deepEqual([r.run.keycards, hudOf(r, null, false, null).status], [0, "MEMBER"]);
});
test("a life lost keeps what he earned: the keycards he took stay taken, the late checkout stays on the clock, nothing is granted twice", () => {
  const g = night(); play(g); give(g, 4);
  const left = g.pickups.filter((p) => p.kind === "keycard" && !p.taken).length;
  knockOut(g);
  until(g, (x) => x.mode === "card", 4);
  assert.deepEqual([g.run.keycards, g.pickups.filter((p) => p.kind === "keycard" && !p.taken).length, Math.round(g.run.time)], [4, left, LOBBY_NIGHT.time + 60]);
});
test("the stash's keycard is there only at night, on its shelf, and counts; the day's stash has none", () => {
  const g = night(); play(g);
  const door = LOBBY_NIGHT.doors.find((d) => d.kind === "stash");
  Object.assign(g.world.hero, { x: door.x, y: 0, onGround: true, vx: 0, move: null }); g.step(input({ down: true })); g.step(input({ down: true }));
  assert.equal(g.level.id, "stash");
  const p = g.pickups.find((p) => p.kind === "keycard"); assert.ok(p);
  Object.assign(g.world.hero, { x: p.x, y: p.y, onGround: true }); g.step(input());
  assert.equal(g.run.keycards, 1);
  const day = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true }); day.newRun(21, 0);
  play(day);
  Object.assign(day.world.hero, { x: 9700, y: 0, onGround: true, vx: 0, move: null }); day.step(input({ down: true })); day.step(input({ down: true }));
  assert.deepEqual([day.level.id, day.pickups.some((p) => p.kind === "keycard")], ["stash", false]);
});
test("the HUD and the cards read his status through the act, and not in Act 1", () => {
  const g = night(); play(g); give(g, 2);
  assert.equal(hudOf(g, null, false, null).status, "SILVER");
  const day = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true }); day.newRun(21, 0); play(day);
  assert.equal(hudOf(day, null, false, null).status, null);
});
test("Ambassador's checkpoint is where he stood: a life lost brings him back there, on the mezzanine too", () => {
  const g = night(); play(g);
  Object.assign(g.world.hero, { x: 8300, y: -520, vx: 0, vy: 0, onGround: true }); g.step(input()); // past the desk's clock
  g.run.keycards = 9;
  g.pickups.push({ id: 99998, kind: "keycard", x: 8300, y: -590, taken: false });
  g.step(input());
  assert.equal(g.run.checkpoint, "ambassador");
  knockOut(g);
  until(g, (x) => x.mode === "card", 4);
  assert.deepEqual([Math.round(g.world.hero.x), g.world.hero.y], [8300, -520]);
});
