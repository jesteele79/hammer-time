// Paris in the browser (story Phase 3a): its card, the gate and the lecture, the lift, the window, the scooters and the shutters'
// signs; the brasserie, its tally and its best; home with the Side quests' fourth card; Try again; the four sizes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/paris-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const SIZES = [[1920, 1080], [1280, 800], [390, 844], [844, 390]];
const errors = [];
let page;
const open = async (url, size = [1920, 1080]) => {
  page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  page.on("console", (m) => {
    if (m.type() === "error" && !/404/.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const waitMode = (m, timeout = 60000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
/** Clocked in at a stop on a saved journey: the shell's cards and its way home are in play. */
const STOPS = ["sat", "lobby", "restaurant", "campus", "arena", "lobby-night", "tower", "hallway", "suite", "flight", "paris", "train", "basel", "lab", "replacement"];
const openStop = async (stop, extra = "") => {
  await open(`${base}?dev=1${extra}`);
  const done = STOPS.slice(0, STOPS.indexOf(stop));
  await page.evaluate((j) => localStorage.setItem("hammer-time-journey", JSON.stringify(j)), { v: 1, next: stop, done, best: {}, bonked: 0, run: null, carry: null, credits: 0 });
  await page.goto(`${base}?dev=1${extra}`);
  await waitMode("title", 60000);
  await page.getByRole("button", { name: "Clock in" }).click();
};
const hero = () => page.evaluate(() => window.__next.hero);

try {
  await open(`${base}?next=1&dev=1&level=paris`);
  await waitMode("card");
  const text = await page.locator(".next-veil__card").textContent();
  assert.ok(text.includes("3-2") && text.includes("Paris") && text.includes("13 July. 06:40. The hotel has one lift."), `3-2's card: ${text}`);
  await waitMode("play");
  await page.waitForTimeout(500);
  await shot("paris-first.png");

  // The gate: a wall until E in front of her.
  await tp(450);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1000);
  await page.keyboard.up("KeyD");
  assert.ok((await hero()).x < 700, "the gate holds him");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => (window.__next.run.events.bonjour ?? 0) > 0, null, { timeout: 3000 });
  await page.waitForTimeout(900);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1200);
  await page.keyboard.up("KeyD");
  assert.ok((await hero()).x > 730, "it opens");

  // The lift, crouched.
  await tp(1030);
  await page.waitForTimeout(300);
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => window.__next.hero.y <= -538, null, { timeout: 3000 });
  await page.keyboard.up("KeyS");
  await page.waitForTimeout(300);
  await shot("paris-upstairs.png");

  // The window.
  await tp(480, -800);
  await page.waitForFunction(() => (window.__next.run.events.tip ?? 0) > 0, null, { timeout: 2000 });

  // The street: a scooter on screen within ten seconds, the signs' labels.
  await tp(6000);
  await page.waitForFunction(() => (window.__next.movers ?? []).some((m) => m.id.startsWith("scooter") && m.live), null, { timeout: 12000 });
  await page.waitForTimeout(300);
  await shot("paris-street.png");
  const signs = await page.evaluate(() => window.__next.level.signs.map((s) => s.label));
  assert.equal(signs.filter((l) => l === "Fermé · 14 juillet").length, 3);
  await page.close();

  // The brasserie: the door, the round, its tally line, its own best; then home: 3-3 coming, the fourth card.
  await openStop("paris");
  await waitMode("play");
  await tp(10200);
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowDown");
  await waitMode("questCard", 8000);
  assert.match(await page.locator(".next-veil").textContent(), /The brasserie/);
  await waitMode("quest", 8000);
  await page.evaluate(() => {
    window.__next.dev.quest({ eat: ["steakfrites", "moules", "cremebrulee"] });
    window.__next.dev.questSkip();
  });
  await waitMode("questTally", 8000);
  const round = await page.evaluate(() => window.__next.quest.result.score);
  assert.ok(round > 0, "the round scored");
  await page.waitForFunction((want) => Number(localStorage.getItem("hammer-time-best-french")) === want, round, { timeout: 4000 });
  assert.notEqual(round, 0);
  await page.getByRole("button", { name: /Continue|Back|On/ }).first().click();
  await waitMode("tally", 8000);
  assert.match(await page.locator(".next-veil").textContent(), /Lunch took three hours\. It is 13:40\. The train leaves at 14:02\./);
  const best = await page.evaluate(() => Number(localStorage.getItem("hammer-time-best-french")));
  assert.equal(best, round, "the best holds the round's score alone");
  // 3-3 is built: on to its card; home by a fresh page.
  await waitMode("card", 30000);
  assert.equal(await page.evaluate(() => window.__next.run.level), "train", "on to 3-3's card");
  await page.goto(`${base}?dev=1`);
  await waitMode("title", 60000);
  assert.ok(await page.getByRole("button", { name: "Clock in" }).isEnabled(), "3-3 is built: Clock in plays it");
  assert.equal(await page.locator(".next-start__quest").count(), 4, "four side quests");
  assert.ok(await page.getByRole("button", { name: "Play The brasserie" }).isVisible());
  await page.close();

  // Try again after Hammer down at the terrace: the gate stands again, as at the card.
  await openStop("paris");
  await waitMode("play");
  await tp(450);
  await page.waitForTimeout(500);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => (window.__next.run.events.bonjour ?? 0) > 0, null, { timeout: 3000 });
  await tp(3000);
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      window.__next.dev.patience(1);
      window.__next.dev.hit();
    });
    await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
    await page.waitForFunction(() => ["play", "over"].includes(window.__next.run.mode), null, { timeout: 12000 });
    // Past the grace he comes back with.
    await page.waitForTimeout(2600);
  }
  await waitMode("over");
  await page.getByRole("button", { name: "Try again" }).click();
  await waitMode("play", 20000);
  await tp(450);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1000);
  await page.keyboard.up("KeyD");
  assert.ok((await hero()).x < 700, "the gate stands again");
  await page.close();

  // The four sizes.
  for (const [w, h] of SIZES) {
    await open(`${base}?next=1&dev=1&level=paris`, [w, h]);
    await waitMode("card");
    await page.evaluate(() => window.__next.dev.slowmo(0.001, 60));
    await page.waitForTimeout(300);
    const card = await page.locator(".next-veil__card").boundingBox();
    assert.ok(card.x >= -0.5 && card.y >= -0.5 && card.x + card.width <= w + 0.5 && card.y + card.height <= h + 0.5, `the card fits at ${w}x${h}: ${JSON.stringify(card)}`);
    await page.evaluate(() => window.__next.dev.slowmo(1, 0));
    await waitMode("play");
    await tp(6000);
    await page.waitForTimeout(500);
    assert.ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= w, `no sideways scrolling at ${w}x${h}`);
    await shot(`paris-${w}x${h}.png`);
    await page.close();
  }

  // The rest of 3-2 is above this line.
  assert.deepEqual(errors, [], "no console errors");
  console.log("PASS: Paris: the card, the gate, the lift, the window, the street.");
} finally {
  await browser.close();
}
