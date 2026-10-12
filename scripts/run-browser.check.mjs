// Plays the lobby at /?next=1&dev=1: the early pepper crate, the desk's punch clock, a life lost in
// the shaft and back at the clock, pause, the stash and back, and the exit's tally to the clear.
// Usage: node scripts/run-browser.check.mjs [http://127.0.0.1:8090/]
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
const run = () => page.evaluate(() => window.__next.run);
const waitFor = async (pred, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await run();
    if (pred(r)) return r;
    await page.waitForTimeout(30);
  }
  return run();
};
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** The card on screen stays off his face on both phone shapes and the desktop; a screenshot of each. */
const cardClearOfFace = async (name) => {
  for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const b = document.querySelector(".next-veil__card").getBoundingClientRect();
      return { card: { x: b.x, y: b.y, w: b.width, h: b.height }, face: window.__next.faceScreen };
    });
    assert.ok(!hit(r.card, r.face), `${name} at ${w}x${h}: the card covers his face ${JSON.stringify(r)}`);
    await shot(`${name}-${w}x${h}.png`);
  }
};
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&dev=1`);
  await page.waitForFunction(() => window.__next?.run && window.__next?.dev, {}, { timeout: 30000 });
  let r = await waitFor((x) => x.mode === "play", 5000);
  assert.equal(r.mode, "play", "the start card gives way to play");
  assert.deepEqual([r.lives, r.patience, r.cans, r.level], [3, 2, 0, "lobby"]);
  await shot("run-start.png");

  // The real products, each with one clear job the hint line names for two seconds.
  assert.equal(await page.evaluate(() => window.__next.art.products), 3, "the Coke Zero, nuts and Buc-ee's pictures load");
  const hint = () => page.evaluate(() => document.querySelector(".next-hud__hint")?.textContent);
  await page.evaluate(() => window.__next.dev.give("can"));
  await page.waitForFunction(() => document.querySelector(".next-hud__hint")?.textContent === "Coke Zero · cooled down", {}, { timeout: 2000 });
  await page.evaluate(() => window.__next.dev.give("bucees"));
  r = await waitFor((x) => x.star > 9, 1000);
  assert.ok(r.star > 9 && r.shield, `the Buc-ee's shield is up and drawn: ${JSON.stringify({ star: r.star, shield: r.shield })}`);
  assert.equal(await hint(), "Buc-ee's · shield for 10 seconds");
  assert.ok(await page.evaluate(() => !!document.querySelector(".next-hud__star img")), "the HUD's shield countdown wears the beaver");
  await shot("run-shield.png");

  // The early pepper crate: stand under it and jump; the pepper slides off, off the desk and back to him.
  await tp(760);
  await page.waitForTimeout(250);
  await hold(["Space"], 300);
  r = await waitFor((x) => (x.events.crate ?? 0) >= 1, 1500);
  assert.ok((r.events.crate ?? 0) >= 1, "the ! crate opens");
  r = await waitFor((x) => x.hot, 8000);
  assert.ok(r.hot && r.patience === 3, `the pepper: hot, three pips (${JSON.stringify(r)})`);
  await shot("run-pepper.png");

  // The desk's punch clock (x 2650): walking past it punches the card.
  await tp(2700);
  r = await waitFor((x) => x.checkpoint === "desk", 1500);
  assert.equal(r.checkpoint, "desk");
  await page.waitForTimeout(200);
  await shot("run-clock.png");

  // The open shaft: a life, and back at the clock.
  await tp(6060, -40);
  r = await waitFor((x) => (x.events.lifeLost ?? 0) >= 1, 4000);
  assert.equal(r.lives, 2, "the shaft costs a life");
  r = await waitFor((x) => x.mode === "play", 5000);
  assert.ok(Math.abs(r.x - 2650) < 5, `back at the desk's clock: ${r.x}`);
  assert.equal(r.patience, 2, "back with two pips");

  // A break: the clock stops.
  await page.keyboard.press("KeyP");
  r = await waitFor((x) => x.mode === "pause", 1000);
  assert.equal(r.mode, "pause");
  const t = r.time;
  await page.waitForTimeout(800);
  assert.equal((await run()).time, t, "the clock stops on a break");
  await shot("run-pause.png");
  await page.keyboard.press("KeyP");
  await waitFor((x) => x.mode === "play", 1000);

  // The staff stash and back.
  await tp(9700);
  await page.waitForTimeout(250);
  await hold(["ArrowDown"], 300);
  r = await waitFor((x) => x.level === "stash", 1500);
  assert.equal(r.level, "stash");
  await page.waitForTimeout(500);
  await shot("run-stash.png");
  let played = await page.evaluate(() => window.__next.sound.played);
  assert.ok((played["music:cellar"] ?? 0) >= 1, `the stash plays the cellar music: ${JSON.stringify(played)}`);
  await tp(320);
  await page.waitForTimeout(250);
  await hold(["ArrowDown"], 300);
  r = await waitFor((x) => x.level === "lobby", 1500);
  assert.ok(r.level === "lobby" && Math.abs(r.x - 9700) < 5, `back at the staff door: ${r.level} ${r.x}`);
  await page.waitForTimeout(200);
  played = await page.evaluate(() => window.__next.sound.played);
  assert.ok((played["music:day"] ?? 0) >= 2, `the day music comes back in the lobby: ${JSON.stringify(played)}`);

  // The exit: walk in, the tally, the clear.
  await tp(15700);
  await page.waitForTimeout(250);
  await hold(["ArrowRight"], 900);
  r = await waitFor((x) => x.mode === "tally", 3000);
  await shot("run-tally.png");
  r = await waitFor((x) => x.mode === "clear", 14000);
  assert.equal(r.mode, "clear", "the lobby is cleared");
  assert.equal(r.time, 0);
  await page.waitForSelector(".next-veil__card", { timeout: 2000 });
  await shot("run-clear.png");
  await cardClearOfFace("veil-clear");

  // Play again: a fresh run from its card.
  await page.click("text=Play again");
  r = await waitFor((x) => x.mode === "play", 5000);
  assert.deepEqual([r.mode, r.lives, r.score, r.level], ["play", 3, 0, "lobby"], "a fresh run");

  // Two falls down the shaft and a knockdown: game over, and Try again starts over.
  for (let i = 0; i < 2; i++) {
    await tp(6060, -40);
    await waitFor((x) => x.mode !== "play", 3000);
    await waitFor((x) => x.mode === "play", 6000);
  }
  // Past his respawn grace, two practice hits: the first costs a pip, the last knocks him flat.
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__next.dev.hit());
  await page.waitForTimeout(1700);
  await page.evaluate(() => window.__next.dev.hit());
  r = await waitFor((x) => x.mode === "over", 6000);
  assert.deepEqual([r.mode, r.lives], ["over", 0], "hammer down");
  await page.waitForSelector("text=Hammer down", { timeout: 2000 });
  await shot("run-over.png");
  await cardClearOfFace("veil-over");
  await page.click("text=Try again");
  r = await waitFor((x) => x.mode === "play", 5000);
  assert.deepEqual([r.mode, r.lives], ["play", 3], "tried again");

  assert.deepEqual(errors, []);
  writeFileSync(resolve(out, "run-check.json"), JSON.stringify({ run: await run(), errors }, null, 2));
  console.log("PASS: start, the pepper, a punch clock, a life in the shaft, a break, the stash, the exit, the clear, play again, game over and try again; no errors.");
} catch (err) {
  console.error("Run check failure", errors);
  await page?.screenshot({ path: resolve(out, "run-failure.png") });
  throw err;
} finally {
  await browser.close();
}
