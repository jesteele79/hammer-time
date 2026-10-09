import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const url = checkedUrl(process.argv[2] || "http://127.0.0.1:8080/");
const tag = new URL(url).port === "8081" ? "prod" : "dev";
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync("public/voice/manifest.json", "utf8"));
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
});
const errors = [],
  requests = new Set();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith("/voice/")) requests.add(path);
  });
  await page.addInitScript(() => {
    // Force eligible chance rolls in this test only; real gameplay uses random rolls.
    Math.random = () => 0.25;
    window.__voiceStarts = [];
    window.__voiceStops = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer?.duration > 0.5)
        window.__voiceStarts.push({
          at: args[0],
          now: this.context.currentTime,
          duration: this.buffer.duration,
        });
      return start.apply(this, args);
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...args) {
      if (this.buffer?.duration > 0.5) window.__voiceStops++;
      return stop.apply(this, args);
    };
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Start at Campus", exact: true }).click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__kiln?.mode === "play" && window.__kiln.tauntsReady);
  for (const clip of manifest.clips) assert.ok(requests.has(clip.file), clip.file + " preloaded");
  await page.evaluate(async () => {
    window.__controlsTest.setKeys(["ArrowRight"]);
    while (window.__kiln.x < 205) await new Promise(requestAnimationFrame);
    window.__controlsTest.setKeys([]);
    while (Math.abs(window.__controlsTest.getSpeed()) > 1) await new Promise(requestAnimationFrame);
  });
  await page.waitForFunction(() => window.__kiln.tauntCount > 0);
  const studentLine = await page.evaluate(() => window.__kiln.lastTaunt);
  assert.ok(["problem", "man-balls", "butt-hurt"].includes(studentLine));
  const voiceStart = await page.evaluate(() => window.__voiceStarts[0]);
  const clip = manifest.clips.find((c) => c.id === studentLine);
  assert.ok(
    Math.abs(voiceStart.duration - clip.durationSeconds) < 0.005,
    "actual decoded supplied clip plays",
  );
  assert.ok(Math.abs(voiceStart.at - voiceStart.now) < 0.02, "contact voice starts immediately");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.__kiln.mode), "pause");
  assert.ok(await page.evaluate(() => window.__voiceStops > 0), "pause stops speech");
  const pausedCount = await page.evaluate(() => window.__kiln.tauntCount);
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => window.__kiln.tauntCount),
    pausedCount,
    "no queued chatter during pause",
  );
  await page.getByRole("button", { name: "Back to work", exact: true }).click();

  // Stand in the first student's paper path and verify the original damage clip.
  await page.waitForFunction(() => window.__kiln.damageVoices > 0, {}, { timeout: 16000 });
  const damageDuration = await page.evaluate(() => window.__voiceStarts.at(-1).duration);
  assert.ok(
    !manifest.clips.some((c) => Math.abs(c.durationSeconds - damageDuration) < 0.005),
    "damage uses its dedicated recording",
  );

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Start at Pink pig", exact: true }).click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__kiln?.mode === "play" && window.__kiln.tauntsReady);
  await page.evaluate(async () => {
    window.__controlsTest.setKeys(["ArrowRight"]);
    while (window.__kiln.x < 132) await new Promise(requestAnimationFrame);
    window.__controlsTest.setKeys([]);
    while (Math.abs(window.__controlsTest.getSpeed()) > 1) await new Promise(requestAnimationFrame);
  });
  await page.evaluate(async () => {
    const start = performance.now();
    let nextFire = 0,
      nextBonk = 0;
    while (
      performance.now() - start < 40000 &&
      window.__kiln.tauntCount < 2 &&
      window.__kiln.mode === "play"
    ) {
      const p = window.__kiln,
        now = performance.now(),
        keys = [];
      if (p.x < 132) keys.push("ArrowRight");
      else if (p.x > 136) keys.push("ArrowLeft");
      else if (p.facing < 0) keys.push("ArrowRight");
      if (now >= nextFire && p.bossX > p.x && p.form === 2) {
        keys.push("KeyF");
        nextFire = now + 1100;
      }
      if (now >= nextBonk && p.bossX - p.x < 34 && p.snots >= 3) {
        keys.push("KeyH");
        nextBonk = now + 590;
      }
      window.__controlsTest.setKeys(keys);
      await new Promise(requestAnimationFrame);
    }
    window.__controlsTest.setKeys([]);
  });
  const pig = await page.evaluate(() => ({
    taunts: window.__kiln.tauntCount,
    last: window.__kiln.lastTaunt,
    starts: window.__voiceStarts,
  }));
  assert.ok(pig.taunts >= 2, JSON.stringify(pig));
  assert.ok(pig.starts.every((s) => Math.abs(s.at - s.now) < 0.02));
  const students = ["problem", "man-balls", "butt-hurt"];
  assert.ok(students.includes(pig.last), "pig includes the student lines as well as staff lines");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  assert.ok(await page.evaluate(() => window.__voiceStops > 0), "mute stops active pig speech");
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(out, `voice-${tag}.json`),
    JSON.stringify(
      { ok: true, allFiveDecoded: true, studentLine, damageDuration, pig, errors },
      null,
      2,
    ),
  );
  console.log(
    "PASS: five recordings preload/decode, actual student and pig reactions play immediately, damage keeps its recording, pause/mute stop speech; no page errors.",
  );
} finally {
  await browser.close();
}
