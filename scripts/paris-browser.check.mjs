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

  // The rest of 3-2 (Task 9) goes below this line.
  assert.deepEqual(errors, [], "no console errors");
  console.log("PASS: Paris: the card, the gate, the lift, the window, the street.");
} finally {
  await browser.close();
}
void SIZES;
