// Music everywhere (story spec §13): a song for every place in the side quests' form, each level naming its own, the
// boarding chime at SAT every eight bars, the music quiet under the cards and full in play.
import test from "node:test";
import assert from "node:assert/strict";
import { SONGS, AudioBus } from "../src/game/audio.ts";
import { CUES, musicFor, questMusic } from "../src/render/sound.ts";
import { LOBBY_NIGHT } from "../src/sim/levels/lobby-night.ts";
import { TOWER } from "../src/sim/levels/tower.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { RESTAURANT } from "../src/sim/levels/restaurant.ts";
import { CAMPUS } from "../src/sim/levels/campus.ts";
import { GIFTSHOP } from "../src/sim/levels/giftshop.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { SAT } from "../src/sim/levels/sat.ts";
import { FLIGHT } from "../src/sim/levels/flight.ts";
import { PARIS } from "../src/sim/levels/paris.ts";

const IDS = ["title", "sat", "lobby", "restaurant", "campus", "arena", "cellar", "banquet", "gate", "lobby-night", "lounge", "tower", "hallway", "suite", "flight", "paris", "french", "train", "basel", "lab", "replacement"];
test("every place has a song in the side quests' form", () => {
  assert.deepEqual(Object.keys(SONGS).sort(), [...IDS].sort());
  for (const id of IDS) {
    const s = SONGS[id];
    assert.ok(s.step >= 0.07 && s.step <= 0.24, `${id} step ${s.step}`);
    assert.ok(s.lead.length % 16 === 0 && s.bass.length % 16 === 0, `${id} bars`);
    assert.ok(s.kick.length === s.snare.length && s.hat.length === s.kick.length, `${id} drum rows`);
  }
});
test("the night's songs: each level names its own, the elevator chimes through the tower every bar, the climb goes up a step a bar, the lounge's quest plays its piano", () => {
  assert.deepEqual([LOBBY_NIGHT, TOWER].map((l) => l.music), ["lobby-night", "tower"]);
  const chimes = Object.entries(SONGS.tower.gags).filter(([, g]) => g === "chime").map(([k]) => Number(k));
  assert.ok(chimes.length >= 2 && chimes.every((k) => k % 16 === 0), "the elevator");
  assert.equal(SONGS.tower.lead.length, 14 * 16, "fourteen bars");
  const first = (bar) => SONGS.tower.lead[bar * 16];
  for (let bar = 1; bar < 14; bar++) assert.ok(first(bar) > first(bar - 1), `bar ${bar} climbs`);
  assert.equal(questMusic({ id: "hungry", menu: "lounge", time: 0 }).theme, "lounge");
  assert.equal(questMusic({ id: "hungry", menu: "banquet", time: 0 }).theme, "banquet");
  assert.equal(SONGS.lounge.kick + SONGS.lounge.snare + SONGS.lounge.hat, ".".repeat(48), "no drums at the piano");
  assert.ok(SONGS.lounge.double, "two hands");
  assert.ok(SONGS.hallway.bass.some(Boolean) && SONGS.hallway.lead.slice(0, 48).every((n) => n === 0), "the hum, and a note only every fourth bar");
  assert.equal(SONGS.suite.kick, "x...x...x...x...", "four on the floor");
});
test("the night's cues: the keycard's chime, the tier's fanfare, the chute's slide, her carts' rattle, the torch's glint, the stun's bump", () => {
  assert.ok(CUES.keycard.includes("chime"));
  assert.ok(CUES.tier.includes("fanfare"));
  assert.ok(CUES.chute.includes("slide"));
  assert.ok(CUES.bossWave.includes("rattle"));
  assert.ok(CUES.flash.includes("glint"));
  assert.ok(CUES.stunned.includes("bump"));
  assert.equal(typeof new AudioBus().rattle, "function");
});
test("every level names its song; the boarding chime comes every eight bars at SAT", () => {
  assert.deepEqual([LOBBY, RESTAURANT, CAMPUS, GIFTSHOP, STASH, SAT].map((l) => l.music), ["lobby", "restaurant", "campus", "arena", "cellar", "sat"]);
  const chimes = Object.entries(SONGS.sat.gags).filter(([, g]) => g === "chime").map(([k]) => Number(k));
  assert.ok(chimes.length >= 2 && chimes.every((k) => k % 128 === 0));
});
test("the music by mode: the title tune, the level's song quiet under its cards and full in play, the round's, silence on Hammer down", () => {
  assert.deepEqual(musicFor("title", "lobby", null), { theme: "title", quiet: false });
  for (const mode of ["card", "story", "walkoff", "tally", "clear", "pause"]) assert.deepEqual(musicFor(mode, "lobby", null), { theme: "lobby", quiet: true }, mode);
  for (const mode of ["play", "dying"]) assert.deepEqual(musicFor(mode, "sat", null), { theme: "sat", quiet: false }, mode);
  assert.deepEqual(musicFor("over", "lobby", null), { theme: null, quiet: false });
  for (const mode of ["questCard", "questTally", "pause"]) assert.deepEqual(musicFor(mode, "lobby", "gate"), { theme: "gate", quiet: true }, mode);
  assert.deepEqual(musicFor("quest", "lobby", "banquet"), { theme: "banquet", quiet: false });
});
test("quiet music is 0.4 of its level, and back up when the cards go", () => {
  const bus = new AudioBus();
  bus.startMusic("lobby", true);
  assert.ok(Math.abs(bus.musicLevel - 0.07 * 0.4) < 1e-9, `${bus.musicLevel}`);
  bus.setQuiet(false);
  assert.ok(Math.abs(bus.musicLevel - 0.07) < 1e-9, `${bus.musicLevel}`);
});

import { SOUND_KEY, parseSound } from "../src/game/sound-settings.ts";
test("two volumes: the music's and the effects', each a share of its level, the quiet on top", () => {
  const bus = new AudioBus();
  bus.setVolumes(0.5, 1);
  assert.deepEqual(bus.volumes, { music: 0.5, effects: 1 });
  assert.ok(Math.abs(bus.musicLevel - 0.035) < 1e-9, `${bus.musicLevel}`);
  assert.ok(Math.abs(bus.effectsLevel - 0.14) < 1e-9, `${bus.effectsLevel}`);
  bus.setQuiet(true);
  assert.ok(Math.abs(bus.musicLevel - 0.035 * 0.4) < 1e-9, `${bus.musicLevel}`);
});
test("the sound settings: kept as hammer-time-sound, 80 and 80 unmuted at first, garbage read as that, out of range clamped", () => {
  assert.equal(SOUND_KEY, "hammer-time-sound");
  assert.deepEqual(parseSound(null), { music: 80, effects: 80, muted: false });
  assert.deepEqual(parseSound("{bad"), { music: 80, effects: 80, muted: false });
  assert.deepEqual(parseSound(JSON.stringify({ music: 30, effects: 0, muted: true })), { music: 30, effects: 0, muted: true });
  assert.deepEqual(parseSound(JSON.stringify({ music: 300, effects: -5, muted: "yes" })), { music: 100, effects: 0, muted: false });
});

import { hurryFor } from "../src/render/sound.ts";
test("the clock's hurry speeds the music only in play, never under the tally or the cards", () => {
  assert.equal(hurryFor("play", 420, 60), true);
  assert.equal(hurryFor("play", 420, 200), false);
  assert.equal(hurryFor("play", 0, 0), false, "no clock, no hurry");
  for (const mode of ["tally", "story", "card", "walkoff", "clear", "pause"]) assert.equal(hurryFor(mode, 420, 30), false, mode);
});
test("the act's fanfare plays at the music's full level, even under the card's quiet", () => {
  const bus = new AudioBus();
  assert.equal(bus.jingleLift, 1);
  bus.startMusic("lobby", true);
  assert.ok(Math.abs(bus.jingleLift * bus.musicLevel - 0.07) < 1e-9);
  bus.setQuiet(false);
  assert.equal(bus.jingleLift, 1);
});
test("back after a hidden tab (or the mute) the song picks up where the clock is, not with every missed note at once", () => {
  let notes = 0;
  const node = () => new Proxy(function () {}, { get: (_, k) => (k === "then" ? undefined : node()), apply: () => node(), set: () => true });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    createOscillator: () => (notes++, node()),
    createGain: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createBuffer: (_c, len) => ({ getChannelData: () => new Float32Array(len) }),
  };
  const bus = new AudioBus();
  Object.assign(bus, { ctx, master: node(), musicGain: node(), sfxGain: node(), musicOn: true, theme: "lobby", step: 0, nextAt: 0.05 });
  bus.tick();
  const first = notes;
  assert.ok(first > 0, "the song plays");
  ctx.currentTime = 600;
  bus.tick();
  assert.ok(notes - first < 20, `${notes - first} notes at once after ten minutes away`);
});

test("the way to Basel's songs: each place names its own, the French table its quick cousin, the musette in three, the cabin's hurry when the sign is on", () => {
  assert.deepEqual([FLIGHT.music, PARIS.music], ["flight", "paris"]);
  assert.equal(musicFor("play", "flight", null).theme, "flight");
  assert.equal(questMusic({ id: "hungry", menu: "french", time: 0 }).theme, "french");
  assert.equal(questMusic({ id: "hungry", menu: "lounge", time: 0 }).theme, "lounge");
  assert.equal(hurryFor("play", 300, 200, true), true);
  assert.equal(hurryFor("play", 300, 200), false);
  assert.equal(hurryFor("tally", 300, 200, true), false);
  assert.equal(SONGS.paris.kick.length, 12, "a waltz");
  assert.equal(SONGS.paris.lead.length % 12, 0);
  assert.ok(Math.abs(SONGS.paris.step / SONGS.french.step - 1.4) < 0.01, "1.4 times the tempo");
  assert.ok(SONGS.french.snareGain !== undefined, "a brush snare");
  assert.deepEqual(SONGS.french.lead, SONGS.paris.lead);
  assert.ok(Math.abs(60 / (SONGS.flight.step * 4) - 92) < 1, "92 bpm");
  assert.ok(Math.abs(60 / (SONGS.train.step * 4) - 128) < 1, "128 bpm");
  assert.ok(new Set(SONGS.train.lead.filter(Boolean).map((n) => n % 12)).size === 2, "a two-note lead");
});
test("the way to Basel's cues: the seatbelt chime, the cart's rattle, the tablet's tune, the scooter's buzz, the doors' beep, the horn", () => {
  assert.deepEqual(CUES.seatbelt, ["belt"]);
  assert.deepEqual(CUES.cartOut, ["rattle"]);
  assert.deepEqual(CUES.shove, ["rattle", "bump"]);
  assert.deepEqual(CUES.tablet, ["tune"]);
  assert.deepEqual(CUES.scooter, ["buzz"]);
  assert.deepEqual(CUES.pigeons, ["flutter"]);
  assert.deepEqual(CUES.doorsBeep, ["beep"]);
  assert.deepEqual(CUES.tunnel, ["horn"]);
  assert.deepEqual(CUES.boarded, ["beep", "coin"]);
  for (const k of ["belt", "tune", "buzz", "flutter", "beep", "horn"]) assert.equal(typeof AudioBus.prototype[k], "function", k);
});
