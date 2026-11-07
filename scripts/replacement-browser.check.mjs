// The training room in the browser (story Phase 4c): its card, the bar of fifteen with its two notches, him in scrubs, the
// beam's light on the floor and never on his face, the kid on a row with the drone up in round two, the video looping on the
// screen in round three, the song's section by round; the three frames of the room. Then the fight by hand from the strip:
// the stand turned and the kid hit in the dark, "Like and subscribe." and the residents in the rows, the lecture's freeze, the
// IFU, three smashes on the screen, the last hit's recording, the carry-out, the administrator, the two cards and home with
// the epilogue coming; a lost life and Try again back to fifteen; the frame rate in round two; the four sizes.
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
// 55 on mains; a laptop on battery in its Silent plan holds every screen near 43, so a run there names its own.
const FPS_FLOOR = Number(process.env.FPS_FLOOR ?? 55);
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
const press = async (key, ms = 110) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
/** The bar's pips that are lit. */
const pips = () => page.locator('.next-hud__boss-bar i[data-on="true"]').count();
/** He stands `gap` px to the kid's left facing him (a tap of D turns him), healed. */
const besideKid = async (gap = 130) => {
  const kx = await page.evaluate(() => window.__next.boss.x);
  await tp(kx - gap, 0);
  await press("KeyD", 60);
  await page.evaluate(() => window.__next.dev.heal());
};
const tintOk = async (when) => assert.equal(await page.evaluate(() => window.__next.headTintChain), 0xffffff, `his face as painted ${when}`);

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
  await page.close();

  // The fight by hand, clocked in from the strip. Round one: the stand turned from its far side, then the kid in the dark.
  await openStop("replacement");
  await waitMode("card");
  await waitMode("play");
  // Clocked in from Basel's street at home, the training room is drawn, not just him.
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.__next.venues?.replacement?.visible), true, "the room drawn after the home screen");
  await tp(2300);
  await page.waitForFunction(() => window.__next.boss?.state === "edge", null, { timeout: 10000 });
  await tp(3420);
  await press("KeyA", 60);
  await page.evaluate(() => window.__next.dev.heal());
  await press("KeyH");
  await page.waitForFunction(() => window.__next.boss?.state === "dark", null, { timeout: 5000 });
  await besideKid();
  await press("KeyH");
  await page.waitForFunction(() => window.__next.boss?.hp === 14, null, { timeout: 5000 });
  assert.equal(await pips(), 14, "fourteen pips");
  await tintOk("in round one");

  // Round two: the last hit of round one, "Like and subscribe.", the residents in the rows, the drone over the hall.
  await page.evaluate(() => window.__next.dev.boss({ hp: 11, state: "dark", timer: 3 }));
  await besideKid();
  await press("KeyH");
  await page.waitForFunction(() => window.__next.lines?.say === "Like and subscribe.", null, { timeout: 5000 });
  const seated = () => page.evaluate(() => Object.entries(window.__next.cast.positions).filter(([k, p]) => k.startsWith("resident-call") && Math.abs(p.y + 150) < 2).length);
  for (let i = 0; i < 30 && (await seated()) < 4; i++) {
    await page.evaluate(() => window.__next.dev.heal());
    await page.waitForTimeout(500);
  }
  assert.equal(await seated(), 4, "four residents in the rows");
  assert.equal((await probe()).training.drone !== null, true, "the drone over the hall");
  // The frame rate in round two, with the drone and the residents.
  const rates = [];
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.__next.dev.heal());
    await page.waitForTimeout(1000);
    rates.push(await page.evaluate(() => window.__next.fps));
  }
  assert.ok(Math.min(...rates) >= FPS_FLOOR, `${FPS_FLOOR} fps at 1920 by 1080 in round two: ${rates}`);
  await shot("training-round-two.png");
  // The lecture in reach freezes him; his figure is still.
  await page.evaluate(() => window.__next.dev.boss({ state: "film" }));
  const kx2 = await page.evaluate(() => window.__next.boss.x);
  await tp(kx2 - 450, 0);
  await press("KeyD", 60);
  await press("KeyE");
  await page.waitForFunction(() => window.__next.boss?.state === "frozen", null, { timeout: 3000 });
  const f0 = (await probe()).boss;
  await page.waitForTimeout(1500);
  const f1 = (await probe()).boss;
  assert.deepEqual([f1.state, f1.x, f1.y], ["frozen", f0.x, f0.y], "frozen still");
  // The IFU: picked up from the lectern, thrown with B, the birds and READ THE IFU.
  await page.waitForFunction(() => window.__next.boss?.state !== "frozen", null, { timeout: 5000 });
  await tp(3000, -140);
  await page.waitForFunction(() => window.__next.hero?.boxes === 1, null, { timeout: 3000 });
  await page.evaluate(() => window.__next.dev.boss({ state: "film", x: 2200, y: 0 }));
  await tp(1850, 0);
  await press("KeyD", 60);
  await press("KeyB");
  await page.waitForFunction(() => window.__next.lines?.think === "READ THE IFU.", null, { timeout: 4000 });
  assert.equal((await probe()).boss.state, "frozen", "the IFU freezes him");
  await tintOk("in round two");

  // Round three: the screen plays; three full smashes near it crack it and put it dark.
  await page.evaluate(() => window.__next.dev.boss({ hp: 6, state: "frozen", timer: 3 }));
  await besideKid();
  await press("KeyH");
  await page.waitForFunction(() => window.__next.training?.playing === true, null, { timeout: 15000 });
  for (let k = 1; k <= 3; k++) {
    await page.waitForFunction(() => window.__next.boss?.state === "hide", null, { timeout: 15000 });
    await tp(3000, 0);
    await page.evaluate(() => {
      window.__next.dev.charge();
      window.__next.dev.heal();
    });
    await press("KeyQ");
    await page.waitForFunction((n) => window.__next.training?.cracks === n, k, { timeout: 4000 });
    if (k < 3) await page.waitForTimeout(2600);
  }
  assert.equal((await probe()).training.playing, false, "the screen dark");
  await shot("training-screen-dark.png");
  await tintOk("in round three");

  // The last hit: the recording, the carry-out and the administrator, the tally, the two cards, home.
  await page.evaluate(() => window.__next.dev.boss({ hp: 1, state: "frozen", timer: 6 }));
  await besideKid();
  await press("KeyH");
  await page.waitForFunction(() => window.__next.voice === "fired", null, { timeout: 5000 });
  await page.waitForTimeout(2500);
  await shot("training-carry-out.png");
  await page.waitForTimeout(2600);
  await shot("training-admin.png");
  await waitMode("story", 30000);
  const card = await page.locator(".next-veil__card").textContent();
  assert.ok(card.includes("As Trainer for Life.") && card.includes("Obviously."), card);
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Act 3 · The Last Tour · complete" }).waitFor({ timeout: 10000 });
  await page.keyboard.press("Enter");
  await waitMode("title", 20000);
  assert.ok(await page.getByRole("button", { name: "The epilogue is coming" }).isDisabled(), "home with the epilogue coming");
  await page.close();

  // A lost life mid-fight: the card again and fifteen pips; Hammer down and Try again: the same.
  await openStop("replacement");
  await waitMode("play");
  await tp(2300);
  await page.waitForFunction(() => window.__next.boss?.state === "edge", null, { timeout: 10000 });
  await page.evaluate(() => window.__next.dev.boss({ hp: 9 }));
  await page.evaluate(() => window.__next.dev.hit());
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.__next.dev.hit());
  await waitMode("card", 15000);
  await waitMode("play", 20000);
  await tp(2300);
  await page.waitForFunction(() => window.__next.boss?.awake !== false && window.__next.boss?.state === "edge", null, { timeout: 10000 });
  assert.deepEqual([(await probe()).boss.hp, await pips()], [15, 15], "the whole fight again");
  for (let i = 0; i < 6 && (await page.evaluate(() => window.__next.run.mode)) !== "over"; i++) {
    await page.evaluate(() => window.__next.dev.hit());
    await page.waitForTimeout(1600);
    await page.evaluate(() => window.__next.dev.hit());
    await page.waitForFunction(() => ["card", "over"].includes(window.__next.run.mode), null, { timeout: 8000 }).catch(() => null);
    if ((await page.evaluate(() => window.__next.run.mode)) === "card") await waitMode("play", 20000);
  }
  await waitMode("over", 20000);
  await page.getByRole("button", { name: /Try again/ }).click();
  await waitMode("play", 20000);
  await tp(2300);
  await page.waitForFunction(() => window.__next.boss?.state === "edge", null, { timeout: 10000 });
  assert.equal((await probe()).boss.hp, 15, "Try again at fifteen");
  await page.close();

  // The four sizes.
  for (const [w, h] of [[1920, 1080], [1280, 800], [390, 844], [844, 390]]) {
    await open(`${base}?next=1&dev=1&level=replacement`, [w, h]);
    await waitMode("play");
    await tp(2300);
    await page.waitForTimeout(1200);
    assert.ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= w, `no sideways scroll at ${w}x${h}`);
    await shot(`replacement-${w}x${h}.png`);
    await page.close();
  }
  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: the training room's card, bar and notches, scrubs and his face as painted through every round, the beam on the floor, the rows and the drone, the screen's loop, the sections; the stand and the dark, Like and subscribe and four residents, the lecture's freeze, the IFU, three smashes, fired, the carry-out and the administrator, the two cards and the epilogue coming; a lost life and Try again at fifteen; ${rates} fps in round two; the four sizes.`);
} finally {
  await browser.close();
}
