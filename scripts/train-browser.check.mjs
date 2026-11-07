// The 14:02 in the browser (story Phase 3b): its card, the station's two-minute clock and the train leaving without him, the
// venue's line on board, the tucked rack, the countryside in the windows and the tunnel; boarding's bonus, Try again, the
// bistro's clock, the conductor's bar and his door, the seat and Basel; the frame rate; the four sizes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/train-browser.check.mjs [http://127.0.0.1:8090/]
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
const STOPS = ["sat", "lobby", "restaurant", "campus", "arena", "lobby-night", "tower", "hallway", "suite", "flight", "paris", "train", "basel", "lab", "replacement"];
const openStop = async (stop) => {
  await open(`${base}?dev=1`);
  const done = STOPS.slice(0, STOPS.indexOf(stop));
  await page.evaluate((j) => localStorage.setItem("hammer-time-journey", JSON.stringify(j)), { v: 1, next: stop, done, best: {}, bonked: 0, run: null, carry: null, credits: 0 });
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

  await page.close();

  // Boarding with time to spare: the leftover paid once, and the station's clock is done with.
  await open(`${base}?next=1&dev=1&level=train`);
  await waitMode("play");
  await page.evaluate(() => window.__next.dev.stretch(30));
  const before = await page.evaluate(() => window.__next.run.score);
  await tp(3990);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => /Coach 18/i.test(document.querySelector(".next-hud__venue")?.textContent ?? ""), null, { timeout: 5000 });
  await page.keyboard.up("KeyD");
  const bonus = (await page.evaluate(() => window.__next.run.score)) - before;
  assert.ok(bonus >= 1400 && bonus <= 1500, `the leftover paid: ${bonus}`);
  await page.evaluate(() => window.__next.dev.stretch(5));
  await page.waitForTimeout(300);
  assert.ok(parseInt((await hudTime()).trim(), 10) >= 6, `the stretch is over: ${await hudTime()}`);

  // The bistro's clock: a life lost past it comes back there.
  await tp(coachX(10) + 160);
  await page.waitForFunction(() => (window.__next.run.events.checkpoint ?? 0) > 0, null, { timeout: 4000 });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    window.__next.dev.patience(1);
    window.__next.dev.hit();
  });
  await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
  await waitMode("play", 15000);
  const back = await page.evaluate(() => window.__next.hero.x);
  assert.ok(Math.abs(back - (coachX(10) + 100)) < 80, `back at the bistro: ${back}`);

  // The conductor: his bar, and his door.
  await tp(coachX(13) - 500);
  await page.waitForFunction(() => /The conductor/i.test(document.querySelector(".next-hud")?.textContent ?? ""), null, { timeout: 4000 });
  assert.deepEqual(await page.evaluate(() => [window.__next.boss.hp, window.__next.boss.max]), [9, 9], "nine pips");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1500);
  await page.keyboard.up("KeyD");
  assert.ok((await page.evaluate(() => window.__next.hero.x)) < coachX(13), "his door holds him");
  await page.evaluate(() => window.__next.dev.boss({ door: 1 }));
  await page.waitForTimeout(100);
  await page.keyboard.down("KeyD");
  await page.waitForFunction((x) => window.__next.hero.x > x, coachX(13) + 40, { timeout: 4000 });
  await page.keyboard.up("KeyD");
  await page.close();

  // Hammer down on board, Try again: the whole level from its card.
  await openStop("train");
  await waitMode("play");
  await tp(coachX(16));
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(i ? 2600 : 300);
    await page.evaluate(() => {
      window.__next.dev.patience(1);
      window.__next.dev.hit();
    });
    await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
    await page.waitForFunction(() => ["play", "over"].includes(window.__next.run.mode), null, { timeout: 15000 });
  }
  await waitMode("over");
  await page.getByRole("button", { name: "Try again" }).click();
  await waitMode("card");
  assert.equal((await hudTime()).trim(), "2:00", "Try again: the station's clock as at the card");
  assert.equal(await page.evaluate(() => Math.round(window.__next.hero.x)), 150, "Try again: from the hall");
  await waitMode("play");

  // The seat: the level ends in coach 1, once the last door is his.
  await page.evaluate(() => window.__next.dev.boss({ door: 3 }));
  await tp(coachX(1) + 550);
  await page.keyboard.down("KeyD");
  await waitMode("story", 30000);
  await page.keyboard.up("KeyD");
  assert.match(await page.locator(".next-veil__card").textContent(), /Basel SBB\. 17:06\. On time\. They always are\./);
  await page.keyboard.press("Enter");
  // Basel is built: the run goes on to its card.
  await waitMode("card", 20000);
  assert.match(await page.locator(".next-veil__card").textContent(), /Basel, Tattoo week/);
  await page.close();

  // The frame rate, in the hall and in a coach.
  await open(`${base}?next=1&dev=1&level=train`, [1920, 1080]);
  await waitMode("play");
  await tp(1100);
  await page.waitForTimeout(3000);
  const hall = await fpsOver(5);
  await tp(coachX(16) + 300);
  await page.waitForTimeout(2000);
  const coach = await fpsOver(5);
  assert.ok(Math.min(...hall) >= FPS_FLOOR && Math.min(...coach) >= FPS_FLOOR, `${FPS_FLOOR} fps at 1920 by 1080: hall ${hall}, coach ${coach}`);
  await page.close();

  // The four sizes.
  for (const [w, h] of [[1920, 1080], [1280, 800], [390, 844], [844, 390]]) {
    await open(`${base}?next=1&dev=1&level=train`, [w, h]);
    await waitMode("play");
    await tp(coachX(16) + 300);
    await page.waitForTimeout(1500);
    const wide = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(wide <= w, `no sideways scroll at ${w}: ${wide}`);
    await shot(`train-${w}x${h}.png`);
    await page.close();
  }

  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: the station's clock and the train leaving, boarding's bonus, the tuck, the countryside and the tunnel, the bistro's clock, the conductor's bar and door, Try again, the seat and Basel, the four sizes; hall ${hall} fps, coach ${coach} fps.`);
} finally {
  await browser.close();
}
