// Drives the lobby look test at /?next=1 through the idle acts, the lecture, hurt, tumble and the ramp.
// Usage: node scripts/acts-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const errors = [];
let page;
const moves = () => page.evaluate(() => window.__next.moves);
const tap = async (key, ms = 80) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
const waitFor = async (pred, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const m = await moves();
    if (pred(m)) return m;
    await page.waitForTimeout(30);
  }
  return moves();
};
const shot = (name) => page.screenshot({ path: resolve(out, name) });
const LECTURE_LINES = [
  "Let me explain this slowly.",
  "Back in my day, we read the syllabus.",
  "When I was your age, I had two jobs.",
  "Look at me when I'm talking to you.",
  "A participation trophy is not an achievement.",
  "Sit up straight. Both feet on the floor.",
  "That is not a real major.",
];
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&dev=1`);
  await page.waitForFunction(() => window.__next?.moves && window.__next?.run?.mode === "play", {}, { timeout: 30000 });

  let m = await waitFor((x) => x.move === "watch", 4000);
  assert.equal(m.move, "watch", "the watch check after 2.5 s");
  await page.waitForTimeout(500);
  m = await moves();
  assert.equal(m.expression, "bored", "bored from the watch check");
  await shot("acts-watch.png");
  m = await waitFor((x) => x.move === "tap", 3500);
  assert.equal(m.move, "tap", "then the foot tap");
  await shot("acts-tap.png");
  m = await waitFor((x) => (x.events.harrumph ?? 0) >= 1, 4000);
  assert.equal(m.bubble, "Any day now.", "the harrumph's aside");

  await tap("KeyE");
  m = await waitFor((x) => x.move === "lecture", 600);
  assert.equal(m.expression, "angry", "angry while he lectures");
  assert.ok(LECTURE_LINES.includes(m.bubble), `a lecture line: ${m.bubble}`);
  await page.waitForTimeout(250);
  await shot("acts-lecture.png");
  await waitFor((x) => x.move === null, 1500);

  // A run starts with two pips: one hit hurts, the next knocks him flat and costs a life.
  await tap("KeyG");
  m = await waitFor((x) => x.move === "hurt", 600);
  assert.equal(m.expression, "hurt");
  assert.equal(m.patience, 1);
  assert.equal(m.bubble, "ABSOLUTE BULLSHIT", "the damage line's caption");
  await shot("acts-hurt.png");
  const sound = await page.evaluate(() => window.__next.sound);
  assert.ok((sound.played.curse ?? 0) >= 1, "the damage recording plays");
  await page.waitForTimeout(1600);
  await tap("KeyG");
  m = await waitFor((x) => x.move === "tumble", 600);
  assert.equal(m.move, "tumble", "the last pip knocks him flat");
  await page.waitForTimeout(700);
  await shot("acts-tumble.png");
  const run = await page.evaluate(async () => {
    const end = Date.now() + 6000;
    while (Date.now() < end && window.__next.run.mode !== "play") await new Promise((r) => setTimeout(r, 30));
    while (Date.now() < end && window.__next.run.mode === "play" && !window.__next.run.events.lifeLost) await new Promise((r) => setTimeout(r, 30));
    while (Date.now() < end && window.__next.run.mode !== "play") await new Promise((r) => setTimeout(r, 30));
    return window.__next.run;
  });
  assert.deepEqual([run.events.lifeLost, run.lives, run.patience, run.mode], [1, 2, 2, "play"], "a life lost, back with two pips");

  // Up the grand staircase from its landing: his soles lie along the 30-degree steps.
  await page.evaluate(() => window.__next.dev.teleport(6650, -140));
  await page.waitForTimeout(400);
  await page.keyboard.down("ArrowRight");
  await waitFor((x) => x.heroX > 7050, 4000);
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(700);
  m = await moves();
  assert.ok(m.heroY < -200 && m.heroX < 7493, `on the stairs: ${m.heroX}, ${m.heroY}`);
  assert.ok(m.feetGap <= 2, `both soles on the stairs: ${m.feetGap}`);
  await shot("acts-stairs.png");

  assert.deepEqual(errors, []);
  writeFileSync(resolve(out, "acts-check.json"), JSON.stringify({ moves: await moves(), errors }, null, 2));
  console.log("PASS: watch, tap, harrumph, lecture, hurt, the knockdown's lost life and the grand staircase in the lobby, no errors.");
} catch (err) {
  console.error("Acts check failure", errors);
  await page?.screenshot({ path: resolve(out, "acts-failure.png") });
  throw err;
} finally {
  await browser.close();
}
