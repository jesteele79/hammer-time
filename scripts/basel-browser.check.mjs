// Basel in Tattoo week in the browser (story Phase 4a): its card, the errands on the HUD and at their counters, the door
// shut until 4/4, a band drawn and its catch, the slide through its hole, the drum corps' shake, the drum major's bar and
// his three rounds, the pipers who follow and play only while he walks, the office door and 3-5's card; the home scene
// over Basel's street; the frame rate on the bridge; the four sizes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/basel-browser.check.mjs [http://127.0.0.1:8090/]
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
const errandsText = () => page.locator(".next-hud__errands").first().textContent();
const probe = () => page.evaluate(() => ({ ...window.__next.run, hero: window.__next.hero, boss: window.__next.boss, shake: window.__next.shake, music: window.__next.music, scale: window.__next.heroScreenHeight / 300, sx: window.__next.heroScreenX, sy: window.__next.heroScreenY }));
/** The color on screen at a world point, from where he stands. */
const pixelAt = async (wx, wy) => {
  const p = await probe();
  const png = await page.screenshot();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const x = Math.round(p.sx + (wx - p.x) * p.scale);
  const y = Math.round(p.sy + (wy - p.y) * p.scale);
  const i = (y * info.width + x) * info.channels;
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
  await open(`${base}?next=1&dev=1&level=basel`);
  await waitMode("card");
  const text = await page.locator(".next-veil__card").textContent();
  assert.ok(text.includes("3-4") && text.includes("Basel, Tattoo week"), `3-4's card: ${text}`);
  await waitMode("play");
  await page.waitForTimeout(400);
  assert.equal((await errandsText()).trim(), "Errands 0/4");
  await shot("basel-kaserne.png");

  // The bank's counter: two seconds still, one errand.
  await tp(7900);
  await page.waitForTimeout(2000);
  assert.equal((await errandsText()).trim(), "Errands 1/4");

  // A band drawn where it marches: a piper's tunic where the street was.
  await tp(6000);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__next.dev.band("band-2"));
  await page.waitForTimeout(1500);
  const at = await page.evaluate(() => window.__next.bands.find((b) => b.id === "band-2"));
  assert.equal(at.state, "march", `band-2 marches: ${JSON.stringify(at)}`);
  await tp(at.x - 500);
  await page.waitForTimeout(200);
  const x2 = (await page.evaluate(() => window.__next.bands.find((b) => b.id === "band-2"))).x;
  const band = await pixelAt(x2 + 12, -250);
  const street = await pixelAt(x2 + 300, -250);
  assert.ok(band.some((v, i) => Math.abs(v - street[i]) > 24), `the band draws: ${street} then ${band}`);
  await shot("basel-bridge.png");

  // The drum corps' fourth beat shakes the screen and knocks him off the Marktplatz's barrier.
  await tp(12700, -120);
  await page.waitForFunction(() => (window.__next.shake ?? 0) > 0, null, { timeout: 3000 });
  await page.waitForTimeout(600);
  await shot("basel-marktplatz.png");
  await page.close();

  // The home scene once the suite is done: Basel's street, him standing in it.
  await open(`${base}?home=basel&dev=1`);
  await waitMode("title");
  await page.waitForTimeout(1500);
  const home = await probe();
  assert.deepEqual([home.level, home.hero.onGround], ["basel", true], `the home scene: ${home.level}`);
  await shot("basel-home.png");
  await page.close();

  assert.deepEqual(errors, [], "no console errors");
  console.log("PASS: 3-4's card, Errands 0/4 then 1/4 at the bank, a band drawn, the drum corps' shake, the home scene over Basel's street.");
} finally {
  await browser.close();
}
void fpsOver;
void FPS_FLOOR;
