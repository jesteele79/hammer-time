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
const STOPS = ["sat", "lobby", "restaurant", "campus", "arena", "lobby-night", "tower", "hallway", "suite", "flight", "paris", "train", "basel", "lab", "replacement"];
/** A saved journey at `stop`, clocked in from the home screen: the strip's own way in. */
const openStop = async (stop) => {
  await open(`${base}?dev=1`);
  const done = STOPS.slice(0, STOPS.indexOf(stop));
  await page.evaluate((j) => localStorage.setItem("hammer-time-journey", JSON.stringify(j)), { v: 1, next: stop, done, best: {}, bonked: 0, run: null, carry: null, credits: false });
  await page.goto(`${base}?dev=1`);
  await waitMode("title", 60000);
  await page.getByRole("button", { name: "Clock in" }).click();
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

  // The costume across levels: the Affliction on 3-4, scrubs on 3-5 through a lost life and Try again, the Affliction at home.
  await open(`${base}?next=1&dev=1&level=basel`);
  await waitMode("play");
  await page.waitForTimeout(600);
  assert.equal((await probe()).costume, "affliction", "3-4 in the Affliction");
  await page.close();
  await openStop("lab");
  await waitMode("play");
  await page.waitForFunction(() => window.__next.costume === "scrubs", null, { timeout: 10000 });
  // Two hits a grace apart: the second pip.
  await page.evaluate(() => window.__next.dev.hit());
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.__next.dev.hit());
  await page.waitForFunction(() => window.__next.run.mode === "card" || window.__next.run.mode === "dying", null, { timeout: 8000 });
  await waitMode("play", 20000);
  assert.equal((await probe()).costume, "scrubs", "a lost life: still in scrubs");
  // The break room, in scrubs.
  await tp(9000);
  await page.waitForTimeout(400);
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => window.__next.run.level === "stash", null, { timeout: 5000 });
  await page.keyboard.up("KeyS");
  await page.waitForTimeout(1200);
  assert.equal((await probe()).costume, "scrubs", "the break room in scrubs, no change of clothes");
  // The double doors: the tally, then home with 3-6 coming and the Affliction on.
  await page.goto(`${base}?dev=1`);
  await waitMode("title", 60000);
  assert.equal((await probe()).costume, "affliction", "home in the Affliction");
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("play");
  await page.waitForFunction(() => window.__next.costume === "scrubs", null, { timeout: 10000 });
  await tp(13600);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => ["story", "title"].includes(window.__next.run.mode), null, { timeout: 30000 });
  await page.keyboard.up("KeyD");
  if ((await probe()).mode === "story") await page.keyboard.press("Enter");
  await waitMode("title", 20000);
  assert.ok(await page.getByRole("button", { name: "The replacement is coming" }).isDisabled(), "3-6 is coming");
  // He changes as the home scene shows: the Affliction body loads, then takes the scrubs' place.
  await page.waitForFunction(() => window.__next.costume === "affliction", null, { timeout: 8000 });
  await page.close();

  // A gurney's side costs a pip (nobody about: a nurse's slip would turn him round).
  await open(`${base}?next=1&dev=1&nocast=1&level=lab`);
  await waitMode("play");
  await page.waitForTimeout(1500);
  await tp(1900);
  await page.waitForTimeout(300);
  const g0 = (await probe()).patience;
  await page.keyboard.down("KeyD");
  await page.waitForFunction((p) => window.__next.run.patience < p, g0, { timeout: 8000 });
  await page.keyboard.up("KeyD");
  await page.close();

  // Try again after Hammer down, clocked in from the strip: the lab's card again, in scrubs.
  await openStop("lab");
  await waitMode("play");
  for (let i = 0; i < 6 && (await probe()).mode !== "over"; i++) {
    await page.evaluate(() => window.__next.dev.hit());
    await page.waitForTimeout(1600);
    await page.evaluate(() => window.__next.dev.hit());
    await page.waitForFunction(() => ["card", "over"].includes(window.__next.run.mode), null, { timeout: 8000 }).catch(() => null);
    if ((await probe()).mode === "card") await waitMode("play", 20000);
  }
  await waitMode("over", 20000);
  await page.getByRole("button", { name: /Try again/ }).click();
  await waitMode("play", 20000);
  await page.waitForFunction(() => window.__next.costume === "scrubs", null, { timeout: 8000 });
  await page.close();

  // The frame rate in the code blue stretch.
  await open(`${base}?next=1&dev=1&level=lab`);
  await waitMode("play");
  await tp(8300);
  await page.waitForTimeout(3000);
  const blue = await fpsOver(5);
  assert.ok(Math.min(...blue) >= FPS_FLOOR, `${FPS_FLOOR} fps at 1920 by 1080 in the code blue: ${blue}`);
  await page.close();

  // The four sizes.
  for (const [w, h] of [[1920, 1080], [1280, 800], [390, 844], [844, 390]]) {
    await open(`${base}?next=1&dev=1&level=lab`, [w, h]);
    await waitMode("play");
    await tp(6200);
    await page.waitForTimeout(1500);
    const wide = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(wide <= w, `no sideways scroll at ${w}: ${wide}`);
    await shot(`lab-${w}x${h}.png`);
    await page.close();
  }

  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: 3-5's card, scrubs with the badge and his face as painted, the code blue's pulse and none under reduced motion, the costume across 3-4, a lost life, Try again and home, a gurney's side, the break room, the double doors and 3-6 coming, the four sizes; the code blue ${blue} fps.`);

} finally {
  await browser.close();
}
