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
