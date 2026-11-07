// The training room in the browser (story Phase 4c): its card, the bar of fifteen with its two notches, him in scrubs, the
// beam's light on the floor and never on his face, the kid on a row with the drone up in round two, the video looping on the
// screen in round three, the song's section by round; the three frames of the room.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/replacement-browser.check.mjs [http://127.0.0.1:8090/]
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
const probe = () => page.evaluate(() => ({ boss: window.__next.boss, costume: window.__next.costume, tint: window.__next.headTintChain, training: window.__next.training, music: window.__next.music }));
const pixel = async (x, y) => {
  const png = await page.screenshot();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const i = (Math.round(y) * info.width + Math.round(x)) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const light = (c) => c[0] + c[1] + c[2];

try {
  await open(`${base}?next=1&dev=1&level=replacement`);
  await waitMode("card");
  const text = await page.locator(".next-veil__card").textContent();
  assert.ok(text.includes("3-6") && text.includes("The replacement"), `3-6's card: ${text}`);
  await waitMode("play");
  await page.waitForFunction(() => window.__next.costume === "scrubs", null, { timeout: 10000 });
  await shot("training-doors.png");

  // Up close the kid wakes: his bar of fifteen with a notch at ten and at five, the section of the song for round one.
  await tp(2300);
  await page.waitForFunction(() => window.__next.boss?.state === "edge", null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const bar = page.locator(".next-hud__boss");
  assert.match(await bar.textContent(), /The replacement/);
  assert.deepEqual([await bar.locator(".next-hud__boss-bar i").count(), await bar.locator('.next-hud__boss-bar i[data-mark="true"]').count()], [15, 2], "fifteen pips, two notches");
  let p = await probe();
  assert.deepEqual([p.costume, p.tint, p.music.section], ["scrubs", 0xffffff, 0], "in scrubs, his face as painted, round one's section");
  // The beam: the floor in its middle brighter than the floor out of it; nothing of it on his face. He stands off its near
  // side, so its middle and the dark beyond him are both on screen and clear of him.
  const beamX = await page.evaluate(() => window.__next.training && window.__next.boss && window.__next.boss.x);
  await tp(Math.max(700, beamX - 900));
  await page.waitForTimeout(500);
  p = await probe();
  assert.ok(p.training.beam, "the beam on the floor");
  const heroX = await page.evaluate(() => window.__next.heroScreenX);
  const lit = await pixel(p.training.beam.x, p.training.beam.y);
  const dark = await pixel(heroX - 300, p.training.beam.y);
  assert.ok(light(lit) > light(dark) + 30, `the beam's floor ${lit} against ${dark}`);
  assert.equal(p.tint, 0xffffff, "the beam is no light on his face");
  await shot("training-rows.png");

  // Round two: the kid hops onto a row as he comes near, the drone is up, the section turns.
  await page.evaluate(() => window.__next.dev.boss({ hp: 10 }));
  await page.waitForFunction(() => window.__next.training?.drone === "circle", null, { timeout: 5000 });
  const kx = (await probe()).boss.x;
  await tp(kx - 200);
  await page.waitForFunction(() => Math.abs((window.__next.boss?.y ?? 0) + 150) < 2, null, { timeout: 5000 });
  p = await probe();
  assert.deepEqual([p.training.drone, p.music.section], ["circle", 1], "the drone up, round two's section");

  // Round three: he hides and the video loops on the screen.
  await tp(2600);
  await page.evaluate(() => window.__next.dev.boss({ hp: 5 }));
  await page.waitForFunction(() => window.__next.boss?.state === "hide", null, { timeout: 15000 });
  await page.waitForTimeout(400);
  p = await probe();
  // The loop's frames, read across two seconds: the demo unit sways in and out of the spot.
  const reads = [];
  for (let k = 0; k < 6; k++) {
    reads.push((await pixel(p.training.screen.x, p.training.screen.y)).join(","));
    await page.waitForTimeout(300);
  }
  assert.ok(new Set(reads).size > 1, `the screen's loop moves: ${reads.join(" ")}`);
  assert.equal(p.music.section, 2, "round three's section");
  await shot("training-front.png");
  assert.deepEqual(errors, [], "no console errors");
  console.log("replacement browser check: ok");
} finally {
  await browser.close();
}
