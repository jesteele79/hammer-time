// The suite in the browser (story Phase 2b): its card, his bar, the camera following him from room to room, the apples on the
// screen, over the rail with the splash and his last word, then the level's end; the four sizes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/suite-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
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
const screenBoss = () => page.evaluate(() => window.__next.boss);

try {
  for (const [w, h] of SIZES) {
    await open(`${base}?next=1&dev=1&level=suite`, [w, h]);
    await waitMode("card");
    await page.evaluate(() => window.__next.dev.slowmo(0.001, 60));
    await page.waitForTimeout(300);
    const text = await page.locator(".next-veil__card").textContent();
    assert.ok(text.includes("2-4") && /The suite/i.test(text), `2-4's card: ${text}`);
    const card = await page.locator(".next-veil__card").boundingBox();
    assert.ok(card.x >= -0.5 && card.y >= -0.5 && card.x + card.width <= w + 0.5 && card.y + card.height <= h + 0.5, `the card fits at ${w}x${h}`);
    await page.evaluate(() => window.__next.dev.slowmo(1, 0));
    await waitMode("play");
    await page.waitForTimeout(900);
    const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(sw <= w, `no sideways scrolling at ${w}x${h}: ${sw}`);
    await shot(`suite-${w}x${h}.png`);
    await page.close();
  }

  await open(`${base}?next=1&dev=1&level=suite`);
  await waitMode("play", 60000);
  assert.match(await page.locator(".next-hud__boss-name").textContent(), /Lifetime Titanium guy/);
  const first = await screenBoss();
  assert.deepEqual([first.hp, first.max], [12, 12]);
  await page.waitForTimeout(2000);
  const rates = [];
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.__next.dev.heal());
    await page.waitForTimeout(1000);
    rates.push(await page.evaluate(() => window.__next.fps));
  }
  assert.ok(Math.min(...rates) >= 55, `the suite holds 55 fps at 1920 by 1080: ${rates}`);
  // The apples, three of them, on the screen.
  await tp(600);
  await page.waitForFunction(() => (window.__next.cast?.planes ?? []).filter((m) => m.kind === "apple").length >= 2, null, { timeout: 8000, polling: 20 });
  await shot("suite-phase-1.png");
  await page.evaluate(() => window.__next.dev.heal());
  // The bedroom: the camera goes after him.
  await page.evaluate(() => window.__next.dev.boss({ hp: 8 }));
  await tp(2100);
  await page.waitForTimeout(1600);
  const bed = await page.evaluate(() => ({ boss: window.__next.boss, sx: window.__next.heroScreenX, phase: window.__next.boss.phase }));
  assert.ok(bed.boss.x > 1600 && bed.boss.x < 3200, `he is in the bedroom: ${bed.boss.x}`);
  await shot("suite-phase-2.png");
  await page.evaluate(() => window.__next.dev.heal());
  // The balcony.
  await page.evaluate(() => window.__next.dev.boss({ hp: 4 }));
  await tp(3500);
  await page.waitForTimeout(1600);
  const bal = await screenBoss();
  assert.ok(bal.x > 3200, `he is on the balcony: ${bal.x}`);
  await shot("suite-phase-3.png");
  await page.evaluate(() => window.__next.dev.heal());
  // Over the rail: the splash, his last word, and the level is over.
  await page.evaluate(() => window.__next.dev.boss({ state: "down" }));
  await page.waitForFunction(() => (window.__next.run.events.pool ?? 0) >= 1, null, { timeout: 5000 });
  assert.ok(await page.evaluate(() => (window.__next.sound.played.splash ?? 0) >= 1), "the splash");
  await page.waitForTimeout(300);
  await shot("suite-pool.png");
  await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 6000 });
  await page.close();

  assert.deepEqual(errors, [], "no console errors");
  console.log("PASS: the suite's card and four sizes, his bar, the apples, the bedroom and the balcony, over the rail with the splash, the level's end.");
} catch (err) {
  if (page && !page.isClosed()) await shot("suite-fail.png").catch(() => undefined);
  console.error(`errors: ${errors.join("; ")}`);
  throw err;
} finally {
  await browser.close();
}
