// The 14:02 in the browser (story Phase 3b): its card, the station's two-minute clock and the train leaving without him, the
// venue's line on board, the tucked rack, the countryside in the windows and the tunnel.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/train-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const coachX = (n) => 4000 + (18 - n) * 768;
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
const hudTime = () => page.locator(".next-hud__clock").first().textContent();
const venueLine = () => page.locator(".next-hud__venue").first().textContent();
/** The color at the middle of the first window on screen. */
const windowPixel = async () => {
  const at = await page.evaluate(() => window.__next.trainWindow());
  assert.ok(at, "a window on screen");
  const png = await page.screenshot();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const i = (Math.round(at.y) * info.width + Math.round(at.x)) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const PANE = [236, 241, 244];
const near = (a, b, by = 10) => a.every((v, i) => Math.abs(v - b[i]) <= by);

try {
  await open(`${base}?next=1&dev=1&level=train`);
  await waitMode("card");
  const text = await page.locator(".next-veil__card").textContent();
  assert.ok(text.includes("3-3") && text.includes("The 14:02"), `3-3's card: ${text}`);
  await waitMode("play");
  await page.waitForTimeout(400);
  const start = await hudTime();
  assert.ok(/^(2:00|1:5\d)$/.test(start.trim()), `the clock starts at two minutes: ${start}`);
  await page.waitForTimeout(1200);
  assert.notEqual((await hudTime()).trim(), "2:00", "it counts");
  await tp(1100);
  await page.waitForTimeout(400);
  await shot("train-hall.png");

  // The stretch runs out: the card, a life, two minutes again.
  const lives = await page.evaluate(() => window.__next.run.lives);
  await page.evaluate(() => window.__next.dev.stretch(1));
  await page.waitForFunction(() => (window.__next.run.events.stretchOut ?? 0) > 0, null, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector(".next-veil__card")?.textContent.includes("The train left at 14:02. It always does."), null, { timeout: 5000 });
  await waitMode("play");
  assert.equal(await page.evaluate(() => window.__next.run.lives), lives - 1);
  await page.waitForTimeout(300);
  assert.ok(/^(2:00|1:5\d)$/.test((await hudTime()).trim()), "two minutes again");

  // On board: the venue's line, the tuck on a rack, the windows.
  await tp(3990);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => window.__next.hero.x > 4010, null, { timeout: 4000 });
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(300);
  assert.ok((await venueLine()).includes("Coach 18"), `on board: ${await venueLine()}`);
  await tp(coachX(17) + 200, -170);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  assert.equal((await page.evaluate(() => window.__next.hero)).crouch, true, "tucked on the rack");
  await page.keyboard.up("KeyD");
  await tp(coachX(16) + 300);
  await page.waitForTimeout(500);
  const out1 = await windowPixel();
  assert.ok(!near(out1, PANE), `the countryside draws in the window: ${out1}`);
  await shot("train-coach.png");
  await tp(coachX(12) + 20);
  await page.waitForTimeout(700);
  const dark = await windowPixel();
  assert.ok(dark.every((v) => v < 40), `the tunnel darkens it: ${dark}`);
  await page.waitForTimeout(3200);
  const hills = await windowPixel();
  assert.ok(!hills.every((v) => v < 40), `out of the tunnel: ${hills}`);

  assert.deepEqual(errors, [], "no console errors");
  console.log("train-browser: all good");
} finally {
  await browser.close();
}
