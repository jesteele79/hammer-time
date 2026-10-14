// The pig fight in the browser: it wakes as he crosses into the arena, the bar and the hint show (and fit a phone), a lost
// life brings back a fresh pig, its defeat drops the chain and lets him clock out.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/pig-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}?next=1&dev=1&venue=arena`);
  await page.waitForFunction(() => window.__next?.run?.mode === "play" && window.__next.run.level === "arena");
  assert.equal(await page.evaluate(() => window.__next.pig.state), "asleep");
  await page.evaluate(() => window.__next.dev.teleport(700, 0));
  await page.waitForFunction(() => window.__next.pig.state !== "asleep");
  await page.waitForSelector(".next-hud__boss");
  assert.equal(await page.locator(".next-hud__boss-bar i").count(), 12);
  assert.match(await page.locator(".next-hud__hint").innerText(), /Pig fight/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(out, "pig-fight.png") });
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    const box = await page.locator(".next-hud__boss").boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= w && box.y + box.height <= h, `the bar fits ${w}x${h}: ${JSON.stringify(box)}`);
    await page.screenshot({ path: resolve(out, `pig-fight-${w}x${h}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  // A life lost mid-fight: a fresh pig, woken again at the arena's clock. The wake gave him the pepper's full three pips,
  // so he is hit until he goes down, each hit once his grace from the last has run out.
  await page.evaluate(() => window.__next.dev.pig({ hp: 4, bonks: 3, snots: 3 }));
  for (let i = 0; i < 8 && (await page.evaluate(() => window.__next.run.mode)) === "play"; i++) {
    const before = await page.evaluate(() => window.__next.run.patience);
    await page.evaluate(() => window.__next.dev.hit());
    await page.waitForFunction((b) => window.__next.run.patience < b || window.__next.run.mode !== "play", before, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1600);
  }
  await page.waitForFunction(() => window.__next.run.mode === "card");
  await page.waitForFunction(() => window.__next.run.mode === "play" && window.__next.pig.state !== "asleep");
  assert.equal(await page.evaluate(() => window.__next.pig.hp), 12);
  // The last hit: a snot at it from the corner, with it held still and short of nothing.
  await page.evaluate(() => window.__next.dev.pig({ hp: 1, bonks: 3, snots: 3, state: "recover" }));
  await page.evaluate(() => {
    const p = window.__next.pig;
    window.__next.dev.teleport(p.x - 500, 0);
  });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__next.pig.state === "defeated", null, { timeout: 5000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(out, "pig-down.png") });
  assert.equal(await page.locator(".next-hud__boss").count(), 0, "the bar is gone");
  await page.evaluate(() => window.__next.dev.teleport(3950, 0));
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => ["walkoff", "tally", "clear"].includes(window.__next.run.mode));
  await page.keyboard.up("ArrowRight");
  await page.waitForFunction(() => window.__next.run.mode === "clear", null, { timeout: 20000 });
  await page.screenshot({ path: resolve(out, "pig-clear.png") });
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: the pig fight wakes, fits a phone, comes back fresh after a lost life, and ends with the chain off and the shift over.");
} finally {
  await browser.close();
}
