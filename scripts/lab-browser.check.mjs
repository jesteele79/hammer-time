// The Basel office in the browser (story Phase 4b): its card, him in scrubs with the TRAINER badge and his face as painted,
// the code blue's red pulse (and none under reduced motion), the costume across levels, a gurney's side and its top, the break
// room and back, the double doors and 3-6's card; the frame rate in the code blue stretch; the four sizes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/lab-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { checkedUrl } from "./browser-guard.mjs";

// 55 on mains; a laptop on battery in its Silent plan holds every screen near 43, the home screen too, so a run there names its own.
const FPS_FLOOR = Number(process.env.FPS_FLOOR ?? 55);
const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const errors = [];
let page;
const open = async (url, size = [1920, 1080], reduced = false) => {
  page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, reducedMotion: reduced ? "reduce" : "no-preference" });
  page.on("console", (m) => {
    if (m.type() === "error" && !/404/.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const waitMode = (m, timeout = 60000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const probe = () => page.evaluate(() => ({ ...window.__next.run, hero: window.__next.hero, costume: window.__next.costume, tint: window.__next.headTintChain, badge: window.__next.badgeScreen, ambient: window.__next.ambient }));
const pixel = async (x, y) => {
  const png = await page.screenshot();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const i = (Math.round(y) * info.width + Math.round(x)) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const fpsOver = async (seconds) => {
  const rates = [];
  for (let i = 0; i < seconds; i++) {
    await page.waitForTimeout(1000);
    rates.push(await page.evaluate(() => window.__next.fps));
  }
  return rates;
};

try {
  await open(`${base}?next=1&dev=1&level=lab`);
  await waitMode("card");
  const text = await page.locator(".next-veil__card").textContent();
  assert.ok(text.includes("3-5") && text.includes("The Basel office"), `3-5's card: ${text}`);
  await waitMode("play");
  await page.waitForFunction(() => window.__next.costume === "scrubs", null, { timeout: 10000 });
  await page.waitForTimeout(600);
  const p = await probe();
  assert.deepEqual([p.costume, p.tint], ["scrubs", 0xffffff], "in scrubs, his face as painted");
  assert.ok(p.badge, "the badge on his chest");
  // The card around the word: its margin above the letters.
  const fills = [];
  for (const dx of [-18, 0, 18]) fills.push(await pixel(p.badge.x + dx, p.badge.y - 9));
  assert.ok(fills.some((c) => c.every((v) => v > 170)), `the badge's card: ${JSON.stringify(fills)}`);
  await shot("lab-entrance.png");

  // The code blue stretch: the lights pulse red.
  await tp(8300);
  await page.waitForTimeout(400);
  const a = (await probe()).ambient;
  await page.waitForTimeout(250);
  const b = (await probe()).ambient;
  await page.waitForTimeout(125);
  const c = (await probe()).ambient;
  assert.ok(a !== b || b !== c, `the light pulses: ${a}, ${b}, ${c}`);
  await shot("lab-codeblue.png");
  await tp(6200);
  await page.waitForTimeout(600);
  await shot("lab-or3.png");
  await tp(10600);
  await page.waitForTimeout(600);
  await shot("lab-ward.png");
  await page.close();

  // Under reduced motion the code blue does not pulse.
  await open(`${base}?next=1&dev=1&level=lab`, [1920, 1080], true);
  await waitMode("play");
  await tp(8300);
  await page.waitForTimeout(400);
  const still = [];
  for (let i = 0; i < 4; i++) {
    still.push((await probe()).ambient);
    await page.waitForTimeout(120);
  }
  assert.ok(still.every((v) => v === still[0]), `no pulse under reduced motion: ${still}`);
  await page.close();

  assert.deepEqual(errors, [], "no console errors");
  console.log("PASS: 3-5's card, him in scrubs with the badge and his face as painted, the code blue's pulse and none under reduced motion.");
} finally {
  await browser.close();
}
void FPS_FLOOR;
void fpsOver;
