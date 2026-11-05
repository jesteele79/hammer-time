// The hall in the browser (story Phase 2b): a second canvas over the game's, inked and lit, at speed, with the HUD over it;
// flat with no second canvas on &flat=1.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/hallway-browser.check.mjs [http://127.0.0.1:8090/]
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
const errors = [];
let page;
const open = async (url) => {
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("console", (m) => {
    if (m.type() === "error" && !/404/.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const waitMode = (m, timeout = 60000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const canvases = () => page.locator(".next-stage canvas").count();
/** From in front of 1417: three swings of the mallet and the level is over. */
const openTheDoor = async () => {
  await page.evaluate(() => window.__next.dev.teleport(7850, 0));
  await page.waitForTimeout(400);
  for (let i = 0; i < 3 && (await page.evaluate(() => window.__next.run.mode)) === "play"; i++) {
    await page.keyboard.press("KeyH");
    await page.waitForTimeout(800);
    if (i < 2) assert.equal(await page.evaluate(() => window.__next.run.events.keyFail), i + 1, `the reader fails ${i + 1}`);
  }
  assert.equal(await page.evaluate(() => window.__next.run.events.keyOpen), 1, "the door gives on the third");
  await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
};

try {
  await open(`${base}?next=1&dev=1&level=hallway`);
  await page.waitForFunction(() => document.querySelectorAll(".next-stage canvas").length === 2 && window.__next?.three?.canvas, null, { timeout: 15000 });
  await waitMode("play");
  assert.equal(await canvases(), 2, "two canvases");
  // Its governor has a few seconds to settle on a tier this card holds.
  await page.waitForTimeout(9000);
  const rates = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    rates.push(await page.evaluate(() => window.__next.three.fps));
  }
  assert.ok(Math.min(...rates) >= 55, `the hall holds 55 fps at 1920 by 1080: ${rates}`);
  const three = await page.evaluate(() => window.__next.three);
  assert.equal(three.drawing, true, "the 3D view is drawing");
  assert.ok(await page.locator(".next-hud__hint").isVisible(), "the HUD over it");
  await shot("hallway-first.png");
  // His back, walking and swinging, with no face to keep clear; his profile when he is hit, on the screen.
  await page.evaluate(() => window.__next.dev.teleport(2200, 0));
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.__next.hero.clip === "walk", null, { timeout: 3000 });
  assert.equal(await page.evaluate(() => window.__next.faceScreen), null, "no face while walking");
  await shot("hallway-walk.png");
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyH");
  await page.waitForFunction(() => window.__next.hero.clip === "swing", null, { timeout: 3000, polling: 10 });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    window.__next.dev.heal();
    window.__next.dev.hit();
  });
  await page.waitForFunction(() => !!window.__next.faceScreen, null, { timeout: 2000, polling: 10 });
  const face = await page.evaluate(() => window.__next.faceScreen);
  assert.ok(face.x >= 0 && face.y >= 0 && face.x + face.w <= 1920 && face.y + face.h <= 1080, `his face on the screen: ${JSON.stringify(face)}`);
  await shot("hallway-hurt.png");
  await page.waitForTimeout(1500);
  await openTheDoor();
  await page.close();

  await open(`${base}?next=1&dev=1&level=hallway&flat=1`);
  await waitMode("play");
  assert.equal(await canvases(), 1, "one canvas when flat");
  assert.equal(await page.evaluate(() => window.__next.three), undefined, "no 3D view when flat");
  await shot("hallway-flat.png");
  await page.evaluate(() => window.__next.dev.teleport(2700, 0));
  await page.waitForTimeout(600);
  await shot("hallway-flat-2.png");
  await openTheDoor();
  await page.close();

  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: the hall's two canvases, ${JSON.stringify(rates)} fps at ${three.quality}, density ${three.density}, the HUD over it; flat with one canvas.`);
} catch (err) {
  if (page && !page.isClosed()) await shot("hallway-fail.png").catch(() => undefined);
  console.error(`errors: ${errors.join("; ")}`);
  throw err;
} finally {
  await browser.close();
}
