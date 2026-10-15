// The start screen at `/?next=1&title=1`: it fits a laptop, a phone upright and a phone on its side without scrolling or
// anything off the screen; each start begins where it says (pig practice at the gift shop), "Start screen" comes back to
// it, the quality choice is kept, a start chosen while the game still loads begins once, and the side quest chosen while
// it loads opens the banquet on the same page with no errors.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/next-start.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const url = `${base}?next=1&title=1&dev=1`;
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const errors = [];
const fits = async (page, w, h) => {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const boxes = [...document.querySelectorAll(".next-start button, .next-start a, .next-start select, .next-start h1")].map((e) => e.getBoundingClientRect());
    // Clock in clear of the cards: a start screen too tall for the phone squeezes the hero until its button rides over them.
    const go = document.querySelector(".next-start__go").getBoundingClientRect();
    const over = [...document.querySelectorAll(".next-start__venue, .next-start__quest")].map((e) => e.getBoundingClientRect()).filter((b) => go.left < b.right && go.right > b.left && go.top < b.bottom && go.bottom > b.top).length;
    return { sw: doc.scrollWidth, sh: doc.scrollHeight, out: boxes.filter((b) => b.left < 0 || b.top < 0 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5).length, over };
  });
  assert.ok(r.sw <= w && r.sh <= h, `${w}x${h}: no scrolling (${r.sw}x${r.sh})`);
  assert.equal(r.out, 0, `${w}x${h}: everything on the screen`);
  assert.equal(r.over, 0, `${w}x${h}: Clock in over a card`);
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  // Chosen at once, while the game still loads: it starts once it is ready, and only once.
  await page.goto(url);
  await page.getByRole("button", { name: "Start at Restaurant" }).click();
  await page.getByRole("button", { name: /Clock in|Getting Hammer ready/ }).click();
  await page.waitForFunction(() => window.__next?.run?.mode === "play");
  assert.equal(await page.evaluate(() => window.__next.run.level), "restaurant");
  assert.equal(await page.evaluate(() => window.__next.run.events.venue ?? 0), 0, "started there, not walked there");
  assert.equal(await page.evaluate(() => window.__next.starts), 1, "the start chosen while it loaded began once");
  for (const [w, h] of [[1280, 800], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(url);
    await page.waitForSelector(".next-start__venue");
    await page.waitForFunction(() => window.__next?.run?.mode === "title");
    await page.waitForTimeout(300);
    await fits(page, w, h);
    await page.screenshot({ path: resolve(out, `start-${w}x${h}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url);
  await page.waitForFunction(() => window.__next?.run?.mode === "title");
  assert.equal(await page.evaluate(() => window.__next.drawing), false, "the canvas rests under the start screen");
  // The keyboard drives the start screen: the arrows move through the quality list, Space presses Clock in.
  await page.locator(".next-start__quality select").focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.locator(".next-start__quality select").inputValue(), "high");
  await page.locator(".next-start__quality select").selectOption("auto");
  await page.getByRole("button", { name: "Clock in" }).focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__next.run.mode === "card" || window.__next.run.mode === "play");
  assert.equal(await page.evaluate(() => window.__next.drawing), true);
  for (const [name, level] of [["Hotel lobby", "lobby"], ["Campus", "campus"], ["The Pink Menace", "arena"]]) {
    await page.goto(url);
    await page.waitForFunction(() => window.__next?.run?.mode === "title");
    await page.getByRole("button", { name: `Start at ${name}` }).click();
    await page.getByRole("button", { name: "Clock in" }).click();
    await page.waitForFunction(() => window.__next.run.mode === "play");
    assert.equal(await page.evaluate(() => window.__next.run.level), level);
    assert.deepEqual(await page.evaluate(() => [window.__next.run.lives, window.__next.run.patience, window.__next.run.hot]), [3, 2, false], `${name}: a fresh shift`);
  }
  // Pig practice ends on "Practice over", with no best kept, and "Start screen" goes back.
  await page.evaluate(() => localStorage.setItem("hammer-time-best-next", "0"));
  await page.evaluate(() => window.__next.dev.pig({ state: "defeated" }));
  await page.evaluate(() => window.__next.dev.teleport(3950, 0));
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__next.run.mode === "clear", null, { timeout: 20000 });
  await page.keyboard.up("ArrowRight");
  await page.getByRole("heading", { name: "Practice over" }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-best-next")), "0", "no best from practice");
  await page.screenshot({ path: resolve(out, "start-practice-over.png") });
  await page.getByRole("button", { name: "Start screen" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "title");
  // The quality choice is kept on the device.
  await page.locator(".next-start__quality select").selectOption("low");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-quality")), "low");
  await page.waitForFunction(() => window.__next.quality === "low", null, { timeout: 3000 });
  await page.locator(".next-start__quality select").selectOption("auto");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-quality")), null);
  await page.waitForFunction(() => window.__next.quality === "ultra", null, { timeout: 3000 });
  // The side quest, clicked while the game still loads: the banquet opens on this page once it is ready, and nothing errs.
  await page.goto(url);
  await page.getByRole("button", { name: "Play Hungry Hungry Hammer" }).click();
  await page.waitForFunction(() => window.__next?.run?.mode === "questCard" || window.__next?.run?.mode === "quest");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(out, "start-hungry.png") });
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: the start screen fits all three sizes, starts each place fresh, keeps practice out of the best, and leaves cleanly.");
} finally {
  await browser.close();
}
