// The cabin in the browser (story Phase 3a): its card and two canvases, 60 fps at ultra on the dev box, forward without a key,
// A a lane to the screen's left and D to its right at two sizes, the seatbelt sign, the purser's bar, the cart's shove, row 1's
// landing caption, flat with one canvas to the same caption, Try again as at the card, the four sizes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/flight-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

// 55 on mains; a laptop on battery in its Silent plan holds every screen near 43, the home screen too, so a run there names its own.
const FPS_FLOOR = Number(process.env.FPS_FLOOR ?? 55);
const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const SIZES = [[1920, 1080], [1280, 800], [390, 844], [844, 390]];
const rowX = (row) => Math.round(100 * (0.5 + (52 - row) * 0.77));
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
const canvases = () => page.locator(".next-stage canvas").count();
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const heroX = () => page.evaluate(() => window.__next.hero.x);
const screenX = () => page.evaluate(() => window.__next.heroScreenX / innerWidth);
const tap = async (key, wait = 400) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(60);
  await page.keyboard.up(key);
  await page.waitForTimeout(wait);
};
const startPlaying = async (url, size) => {
  await open(url, size);
  await waitMode("play");
};
/** On past a story caption or any card the shell holds up, to the mode wanted. */
const continueTo = async (want, timeout = 40000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if ((await page.evaluate(() => window.__next.run.mode)) === want) return;
    const go = page.getByRole("button", { name: /Continue|Next stop/ });
    if (await go.count()) await go.first().click({ timeout: 500 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  assert.fail(`never reached ${want}`);
};

try {
  // The four sizes: the card fits, two canvases, he moves without a key, the lanes go the screen's way.
  for (const [w, h] of SIZES) {
    await open(`${base}?next=1&dev=1&level=flight`, [w, h]);
    await waitMode("card");
    await page.evaluate(() => window.__next.dev.slowmo(0.001, 60));
    await page.waitForTimeout(300);
    const text = await page.locator(".next-veil__card").textContent();
    assert.ok(text.includes("3-1") && text.includes("Row 52") && text.includes("Seat 52E. Middle."), `3-1's card: ${text}`);
    const card = await page.locator(".next-veil__card").boundingBox();
    assert.ok(card.x >= -0.5 && card.y >= -0.5 && card.x + card.width <= w + 0.5 && card.y + card.height <= h + 0.5, `the card fits at ${w}x${h}: ${JSON.stringify(card)}`);
    await page.evaluate(() => window.__next.dev.slowmo(1, 0));
    await waitMode("play");
    await page.waitForFunction(() => window.__next?.three?.canvas, null, { timeout: 15000 });
    assert.equal(await canvases(), 2, "the 3D view under the game's canvas");
    const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(sw <= w, `no sideways scrolling at ${w}x${h}: ${sw}`);
    const x0 = await heroX();
    await page.waitForTimeout(1000);
    assert.ok((await heroX()) > x0 + 100, "forward without a key");
    const rest = await screenX();
    assert.ok(Math.abs(rest - 0.5) < 0.03, `he stands in the middle at ${w}x${h}: ${rest}`);
    await shot(`flight-${w}x${h}.png`);
    await tap("KeyA");
    const left = await screenX();
    assert.ok(left < 0.46, `A is a lane to the screen's left at ${w}x${h}: ${left}`);
    assert.equal(await page.evaluate(() => window.__next.flight.lane), 0);
    await tap("KeyD");
    await tap("KeyD");
    const right = await screenX();
    assert.ok(right > 0.54, `D is a lane to the screen's right at ${w}x${h}: ${right}`);
    assert.equal(await page.evaluate(() => window.__next.flight.lane), 2);
    await page.close();
  }

  // 60 fps at ultra, the sign lit, the purser's bar.
  await startPlaying(`${base}?next=1&dev=1&level=flight`);
  await page.waitForFunction(() => window.__next?.three?.drawing, null, { timeout: 15000 });
  // Its governor has a few seconds to settle on a tier this card holds; he is kept in the first rows meanwhile.
  const rates = [];
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1000);
    await tp(rowX(50));
    if (i >= 7) rates.push(await page.evaluate(() => window.__next.three.fps));
  }
  assert.ok(Math.min(...rates) >= FPS_FLOOR, `the cabin holds ${FPS_FLOOR} fps at 1920 by 1080: ${rates}`);
  await shot("flight-first.png");
  await page.evaluate(() => window.__next.dev.turbulence());
  await page.waitForFunction(() => window.__next.flight.sign > 0, null, { timeout: 2000 });
  await page.waitForTimeout(300);
  await shot("flight-sign.png");
  await tp(rowX(8));
  await page.waitForFunction(() => window.__next.boss?.state !== "wait", null, { timeout: 5000 });
  assert.match(await page.locator(".next-hud__boss-name").textContent(), /The purser/);
  assert.equal(await page.evaluate(() => window.__next.boss.max), 3);
  await page.waitForTimeout(600);
  await shot("flight-purser.png");
  await page.close();

  // The cart's shove: a pip gone, the row ten back.
  await startPlaying(`${base}?next=1&dev=1&level=flight`);
  await tp(2400);
  await page.evaluate(() => window.__next.dev.cart());
  const pipsBefore = await page.evaluate(() => window.__next.run.patience);
  await page.waitForFunction(() => (window.__next.run.events.shove ?? 0) > 0, null, { timeout: 15000 });
  assert.equal(await page.evaluate(() => window.__next.run.patience), pipsBefore - 1, "a pip");
  await page.close();

  // The purser down, row 1, the landing caption, then 3-2's card; in 3D, and flat with one canvas.
  for (const flat of [false, true]) {
    await openStop("flight", flat ? "&flat=1" : "");
    await waitMode("card");
    await waitMode("play");
    if (flat) {
      assert.equal(await canvases(), 1, "one canvas when flat");
      await page.waitForTimeout(300);
      await shot("flight-flat.png");
    }
    await tp(rowX(8));
    await page.waitForFunction(() => window.__next.boss?.state !== "wait", null, { timeout: 5000 });
    await page.evaluate(() => window.__next.dev.boss({ state: "down" }));
    await tp(rowX(1) - 50);
    await page.waitForFunction(() => (window.__next.run.events.sit ?? 0) > 0, null, { timeout: 5000 });
    await waitMode("story", 30000);
    const caption = "Paris. 13 July. 06:40. No Southwest, no A-List, no ice.";
    // The Clocked out card and the caption, in either order the journey shows them.
    const until = Date.now() + 40000;
    let sawCaption = false;
    while (Date.now() < until) {
      const text = (await page.locator(".next-veil").textContent().catch(() => "")) ?? "";
      if (text.includes(caption)) sawCaption = true;
      if ((await page.evaluate(() => window.__next.run.mode)) === "card" && (await page.evaluate(() => window.__next.run.level)) === "paris") break;
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
    }
    assert.ok(sawCaption, "the landing card");
    assert.equal(await page.evaluate(() => window.__next.run.level), "paris", "on to 3-2's card");
    await page.close();
  }

  // Try again after Hammer down at row 20: the clock and the lane as at the card.
  await openStop("flight");
  await waitMode("play");
  await tp(rowX(20));
  await tap("KeyD", 200);
  for (let i = 0; i < 3; i++) {
    // Past the grace he comes back with.
    await page.waitForTimeout(i ? 2600 : 300);
    await page.evaluate(() => {
      window.__next.dev.patience(1);
      window.__next.dev.hit();
    });
    await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
    await page.waitForFunction(() => ["play", "over"].includes(window.__next.run.mode), null, { timeout: 12000 });
  }
  await waitMode("over");
  await page.getByRole("button", { name: "Try again" }).click();
  await waitMode("card");
  const again = await page.evaluate(() => ({ time: window.__next.run.time, lane: window.__next.flight.lane, x: window.__next.hero.x }));
  assert.deepEqual(again, { time: 300, lane: 1, x: 50 }, "Try again: as at the card");
  await page.close();

  // The rest of 3-1 is above this line.
  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: the cabin at four sizes, forward without a key, A a lane left and D right, the sign, the purser's bar; ${JSON.stringify(rates)} fps.`);
} finally {
  await browser.close();
}
export { continueTo };
