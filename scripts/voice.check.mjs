import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { AudioBus } from "../src/game/audio.ts";
import { TAUNT_FILES, TauntRotation } from "../src/game/taunts.ts";
import * as LINES from "../src/game/lines.ts";

// The shipped game's voice and picture checks, kept when it was deleted (R4 Task 12): the audio bus, the taunt pools,
// the lines table and the owner's files outside art/manifest.json are the game's own.

test("the shipped pictures, the towel and the voice stay byte-for-byte unchanged", () => {
  for (const file of ["hero-idle-calm.png", "hero-body.png", "hero-upper.png", "hero-fore.png", "hero-hand.png", "hero-reach.png", "absolute-bullshit.mp3"]) {
    assert.deepEqual(readFileSync(`public/${file}`), execFileSync("git", ["show", `ff02ee9:public/${file}`], { maxBuffer: 20 * 1024 * 1024 }), file);
  }
  for (const file of [
    "coke-zero.png",
    "coke-zero.webp",
    "nuts-bag.png",
    "nuts-bag.webp",
    "buccees-pickup.png",
    "buccees-pickup.webp",
    "towel-cloth.png",
    "towel-cloth.webp",
    "damage-voice.wav",
  ]) {
    assert.deepEqual(readFileSync(`public/${file}`), execFileSync("git", ["show", `b2cf5e9:public/${file}`], { maxBuffer: 20 * 1024 * 1024 }), file);
  }
});

test("decoded voice starts at current audio time with no timer or fetch at contact", () => {
  const a = new AudioBus(),
    starts = [];
  a.ctx = {
    currentTime: 4.25,
    createBufferSource() {
      return { connect() {}, disconnect() {}, start: (at) => starts.push(at), stop() {}, onended: null };
    },
  };
  a.master = { gain: { setTargetAtTime() {} } };
  a.yellBuf = { duration: 1.375 };
  a.musicGain = { gain: { cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {} } };
  a.curse();
  assert.deepEqual(starts, [4.25]);
  assert.equal(a.voiceCount, 1);
  assert.equal(a.lastVoiceAt, 4.25);
  a.setMuted(true);
  a.curse();
  assert.equal(a.voiceCount, 1);
});

test("provided taunts preserve their sources and use valid short PCM speech files", () => {
  const manifest = JSON.parse(readFileSync("public/voice/manifest.json", "utf8"));
  assert.equal(manifest.clips.length, 5);
  for (const clip of manifest.clips) {
    const source = readFileSync(`public${clip.source}`);
    const wav = readFileSync(`public${clip.file}`);
    assert.equal(createHash("sha256").update(source).digest("hex"), clip.sourceSha256);
    assert.equal(createHash("sha256").update(wav).digest("hex"), clip.sha256);
    assert.equal(TAUNT_FILES[clip.id], clip.file);
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.ok(clip.durationSeconds > 0.5 && clip.durationSeconds < 3);
  }
});

test("taunt bags cycle the staff and student pools separately and give the pig all five", () => {
  const staffLines = new Set(["fired", "feedback", "butt-hurt"]);
  const studentLines = new Set(["problem", "man-balls"]);
  for (const seed of [0.1, 0.25, 0.9]) {
    const staff = new TauntRotation(() => seed);
    const primary = Array.from({ length: 21 }, () => staff.next("staff"));
    for (let i = 0; i < primary.length; i += 3) assert.deepEqual(new Set(primary.slice(i, i + 3)), staffLines);
    for (let i = 1; i < primary.length; i++) assert.notEqual(primary[i], primary[i - 1]);
    const student = new TauntRotation(() => seed);
    const personal = Array.from({ length: 20 }, () => student.next("student"));
    for (let i = 0; i < personal.length; i += 2) assert.deepEqual(new Set(personal.slice(i, i + 2)), studentLines);
  }
  const pig = new TauntRotation(() => 0.25);
  const heard = Array.from({ length: 30 }, () => pig.next("pig"));
  for (let i = 0; i < heard.length; i += 5) assert.deepEqual(new Set(heard.slice(i, i + 5)), new Set(Object.keys(TAUNT_FILES)));
  for (let i = 1; i < heard.length; i++) assert.notEqual(heard[i], heard[i - 1]);
});

function voiceBus(random = () => 0.25) {
  const audio = new AudioBus(random),
    starts = [],
    stops = [];
  audio.ctx = {
    currentTime: 10,
    createBufferSource() {
      return {
        connect() {},
        disconnect() {},
        onended: null,
        start(at) {
          starts.push({ at, buffer: this.buffer });
        },
        stop() {
          stops.push(this.buffer);
        },
      };
    },
  };
  audio.master = { gain: { setTargetAtTime() {} } };
  audio.musicGain = { gain: { cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {} } };
  for (const id of Object.keys(TAUNT_FILES)) audio.tauntBuffers.set(id, { id, duration: 1.6 });
  audio.yellBuf = { id: "damage", duration: 1.375 };
  return { audio, starts, stops };
}

test("taunts are occasional, spaced, never overlap or queue; damage immediately interrupts them", () => {
  const { audio, starts, stops } = voiceBus();
  assert.ok(audio.taunt("staff"));
  assert.equal(starts.length, 1);
  assert.equal(audio.voiceCount, 0, "taunts do not count as damage");
  assert.equal(audio.taunt("pig"), null, "busy voice cannot overlap");
  audio.curse();
  assert.equal(stops.length, 1, "damage cuts off the taunt");
  assert.equal(starts[1].buffer.id, "damage");
  assert.equal(starts[1].at, audio.ctx.currentTime, "no damage delay");
  assert.equal(audio.voiceCount, 1);
  audio.yellSrc.onended();
  audio.ctx.currentTime = 12;
  assert.equal(audio.taunt("student"), null, "cooldown also protects the damage reaction");
  audio.ctx.currentTime = 14;
  assert.ok(audio.taunt("student"));
  audio.setMuted(true);
  assert.equal(stops.length, 2);
  audio.ctx.currentTime = 20;
  assert.equal(audio.taunt("pig"), null);
  audio.setMuted(false);
  assert.ok(audio.taunt("pig"));
  audio.stopVoice();
  assert.equal(stops.length, 3, "pause/stop ends a taunt");
  const skipped = voiceBus(() => 0.99);
  for (let i = 0; i < 30; i++) {
    skipped.audio.ctx.currentTime += 5;
    assert.equal(skipped.audio.taunt("staff"), null);
  }
  assert.equal(skipped.starts.length, 0, "a failed chance never schedules later speech");
});

test("only the six recordings are spoken lines; every other Hammer line is text", () => {
  const found = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if (typeof v.text === "string" && Object.keys(v).every((k) => k === "text" || k === "clip")) found.push(v);
      else Object.values(v).forEach(walk);
    }
  };
  walk(Object.values(LINES));
  const clips = found.filter((line) => line.clip).map((line) => line.clip);
  assert.deepEqual(clips.sort(), [...Object.keys(TAUNT_FILES), "damage"].sort());
  for (const [id, line] of Object.entries(LINES.TAUNT_LINES)) assert.equal(line.clip, id);
  assert.equal(LINES.DAMAGE_LINE.clip, "damage");
  assert.ok(found.length >= 35, "Hammer's written lines live in the table");
  assert.equal(LINES.pick(["a", "b"], NaN), "a", "a junk seed still picks a line");
});
