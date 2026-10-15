// The six recordings in the game, heard in a real browser: the five taunts each play their decoded clip at once with
// its caption, the damage line its own; a thought waits while a caption is up; a break and mute stop the recording and
// take its caption (spec §13). Taunts come from besting someone; the check sends those events through the look itself
// (`__next.dev.event`) with the chance rolls forced, as the shipped game's voice check forced them.
// Usage: node scripts/voice-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync("public/voice/manifest.json", "utf8"));
const CAPTIONS = {
  fired: "They need to get fired.",
  feedback: "They can't take feedback.",
  problem: "They got a problem.",
  "man-balls": "Go grow some man balls.",
  "butt-hurt": "They get all butt hurt.",
};
/** A WAV's length from its header: the data chunk's bytes over the format's byte rate. */
const wavSeconds = (file) => {
  const b = readFileSync(file);
  let at = 12,
    rate = 0;
  while (at + 8 <= b.length) {
    const id = b.toString("ascii", at, at + 4),
      size = b.readUInt32LE(at + 4);
    if (id === "fmt ") rate = b.readUInt32LE(at + 16);
    if (id === "data") return size / rate;
    at += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${file}`);
};
const DAMAGE = wavSeconds("public/damage-voice.wav");
const clipOf = (duration) => manifest.clips.find((c) => Math.abs(c.durationSeconds - duration) < 0.003)?.id ?? null;
const isVoice = (duration) => clipOf(duration) !== null || Math.abs(duration - DAMAGE) < 0.003;

const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
const requests = new Set();
let page;
const bubble = () => page.evaluate(() => window.__next.moves?.bubble ?? null);
const voices = () => page.evaluate(() => ({ starts: window.__voiceStarts.slice(), stops: window.__voiceStops.slice() }));
const voiceStops = async () => (await voices()).stops.filter(isVoice).length;
/** Sends the event until a recording starts (the bus keeps 3.5 s or more between taunts); the start it made. */
const spoken = async (event, ms = 9000) => {
  const before = (await voices()).starts.length;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await page.evaluate((e) => {
      const m = window.__next.moves;
      window.__next.dev.event({ ...e, x: m.heroX ?? 0, y: m.heroY ?? 0 });
    }, event);
    await page.waitForTimeout(120);
    const fresh = (await voices()).starts.slice(before).filter((s) => isVoice(s.duration));
    if (fresh.length) return fresh[0];
    await page.waitForTimeout(250);
  }
  throw new Error(`no recording started for ${event.type}`);
};
const STAFF = { type: "castHit", id: 9001, role: "server", job: "server", by: "stomp", dir: 1, down: true, points: 100, drops: false };
const STUDENT = { type: "castFlee", id: 9002, points: 100 };

try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith("/voice/") || path === "/damage-voice.wav") requests.add(path);
  });
  await page.addInitScript(() => {
    // Every chance roll passes in this check only; play rolls them.
    Math.random = () => 0.25;
    window.__voiceStarts = [];
    window.__voiceStops = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer?.duration > 0.5) window.__voiceStarts.push({ at: args[0] ?? this.context.currentTime, now: this.context.currentTime, duration: this.buffer.duration });
      return start.apply(this, args);
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...args) {
      if (this.buffer?.duration > 0.5) window.__voiceStops.push(this.buffer.duration);
      return stop.apply(this, args);
    };
  });
  await page.goto(`${base}?next=1&nocast=1&dev=1`);
  await page.waitForFunction(() => window.__next?.moves && window.__next?.dev && window.__next?.run?.mode === "play", {}, { timeout: 30000 });
  // Sound starts from a key.
  await page.keyboard.down("ShiftLeft");
  await page.waitForTimeout(60);
  await page.keyboard.up("ShiftLeft");
  const wanted = [...manifest.clips.map((c) => c.file), "/damage-voice.wav"];
  for (let i = 0; i < 100 && !wanted.every((f) => requests.has(f)); i++) await page.waitForTimeout(100);
  for (const f of wanted) assert.ok(requests.has(f), `${f} preloaded on the first key`);
  await page.waitForTimeout(1500);

  const heard = [];
  const hear = async (event, what) => {
    const s = await spoken(event);
    const id = clipOf(s.duration);
    assert.ok(id, `${what}: one of the owner's five clips plays, decoded (${s.duration.toFixed(3)} s)`);
    assert.ok(Math.abs(s.at - s.now) < 0.02, `${what}: the recording starts at once`);
    assert.equal(await bubble(), CAPTIONS[id], `${what}: its caption is the recording's words`);
    heard.push(id);
    return id;
  };

  await hear(STAFF, "a staffer put out");
  // A thought waits while the caption is up.
  await page.evaluate(() => window.__next.dev.event({ type: "lectureStart" }));
  await page.waitForTimeout(100);
  assert.equal(await bubble(), CAPTIONS[heard[0]], "a thought does not talk over the recording");
  await hear(STAFF, "a second staffer");
  await hear(STAFF, "a third staffer");
  await hear(STUDENT, "a student run off");

  // A break stops the recording and takes its caption.
  const second = await spoken(STUDENT);
  heard.push(clipOf(second.duration));
  let stops = await voiceStops();
  await page.keyboard.press("KeyP");
  await page.waitForFunction(() => window.__next.run?.mode === "pause");
  await page.waitForTimeout(100);
  assert.ok((await voiceStops()) > stops, "the break stops the recording");
  assert.equal(await bubble(), null, "and its caption goes with it");
  await page.keyboard.press("KeyP");
  await page.waitForFunction(() => window.__next.run?.mode === "play");
  assert.deepEqual([...new Set(heard)].sort(), Object.keys(CAPTIONS).sort(), `all five heard: ${heard.join(", ")}`);

  // Mute stops it too.
  const third = await spoken(STAFF);
  assert.ok(clipOf(third.duration), "a recording plays again after the break");
  stops = await voiceStops();
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.waitForTimeout(100);
  assert.ok((await voiceStops()) > stops, "mute stops the recording");
  assert.equal(await bubble(), null, "and its caption goes with it");
  await page.getByRole("button", { name: "Sound on", exact: true }).click();

  // The damage line is its own recording, and it cuts in at once.
  const before = (await voices()).starts.length;
  await page.evaluate(() => window.__next.dev.hit());
  await page.waitForFunction((n) => window.__voiceStarts.length > n, before, { timeout: 5000 });
  const hurt = (await voices()).starts.slice(before).find((s) => isVoice(s.duration));
  assert.ok(hurt && Math.abs(hurt.duration - DAMAGE) < 0.003, `the damage recording plays (${hurt?.duration})`);
  assert.ok(Math.abs(hurt.at - hurt.now) < 0.02, "at once");
  assert.equal(await bubble(), "ABSOLUTE BULLSHIT", "with its caption");

  assert.deepEqual(errors, []);
  writeFileSync(resolve(out, "voice-browser.json"), JSON.stringify({ ok: true, heard, damage: DAMAGE, errors }, null, 2));
  console.log(`PASS: the five recordings preload on the first key and each plays at once with its caption (${heard.join(", ")}); a thought waits for a caption; a break and mute stop the recording and its caption; the damage line has its own.`);
} catch (e) {
  if (page) await page.screenshot({ path: resolve(out, "voice-browser-fail.png") }).catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
