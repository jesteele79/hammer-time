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
/** The colors along a world row from `x0` to `x1`, in one screenshot: a band that walks on while it is taken is still in it. */
const rowAt = async (x0, x1, wy) => {
  const p = await probe();
  const png = await page.screenshot();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const y = Math.round(p.sy + (wy - p.y) * p.scale);
  const out = [];
  for (let wx = x0; wx <= x1; wx += 4) {
    const x = Math.round(p.sx + (wx - p.x) * p.scale);
    const i = (y * info.width + x) * info.channels;
    out.push([data[i], data[i + 1], data[i + 2]]);
  }
  return out;
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

  // The bank's counter: still there, ducked under whatever comes, one errand (the hold is 1.5 s of the game's clock).
  await tp(7900);
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => window.__next.errands >= 1, null, { timeout: 6000 });
  await page.keyboard.up("KeyS");
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
  const street = await pixelAt(x2 + 400, -250);
  const row = await rowAt(x2 - 80, x2 + 80, -250);
  const most = Math.max(...row.map((c) => Math.max(...c.map((v, i) => Math.abs(v - street[i])))));
  assert.ok(most > 40, `the band draws over the street: ${street}, the most a piper differs ${most}`);
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

  // The four errands by hand (with nobody about: the drummers march at whoever stands at the pharmacy, as a player bonks
  // them on the way); ducked at each counter, so a band that rises as he comes passes over him; again if a bike throws him off.
  await open(`${base}?next=1&dev=1&nocast=1&level=basel`);
  await waitMode("play");
  // The drum major holds the Marktplatz while he stands, so the courier's counter is past him: he is down for this.
  await page.evaluate(() => window.__next.dev.boss({ state: "down" }));
  for (const [k, x] of [7900, 9800, 11500, 14800].entries()) {
    for (let tries = 0; tries < 4 && (await page.evaluate(() => window.__next.errands)) <= k; tries++) {
      await tp(x);
      await page.keyboard.down("KeyS");
      await page.waitForFunction((n) => window.__next.errands > n, k, { timeout: 2600 }).catch(() => null);
      await page.keyboard.up("KeyS");
    }
  }
  assert.equal((await errandsText()).trim(), "Errands 4/4");
  await page.close();

  // The office door shut at three, said once, and open at four; walked to before the first bikes come by.
  await open(`${base}?next=1&dev=1&nocast=1&level=basel`);
  await waitMode("play");
  await page.evaluate(() => {
    for (const id of ["bank", "printer", "pharmacy"]) window.__next.dev.errand(id);
    window.__next.dev.boss({ state: "down" });
  });
  await tp(15500);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1000);
  await page.keyboard.up("KeyD");
  const shut = await probe();
  assert.deepEqual([shut.mode, shut.events.errandsShut ?? 0], ["play", 1], `shut at 3/4, and he says so once: ${JSON.stringify({ x: shut.x, mode: shut.mode, shut: shut.events.errandsShut })}`);
  await page.evaluate(() => window.__next.dev.errand("courier"));
  await tp(15500);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
  await page.keyboard.up("KeyD");
  assert.ok(["walkoff", "tally"].includes((await probe()).mode), "open at 4/4");
  await page.close();

  // A band's catch: a pip, and carried back; then the slide under its hole: past it, no pip.
  await open(`${base}?next=1&dev=1&level=basel`);
  await waitMode("play");
  await tp(6000);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__next.dev.band("band-2"));
  await page.waitForFunction(() => window.__next.bands.find((b) => b.id === "band-2")?.state === "march", null, { timeout: 4000 });
  const b2 = (await page.evaluate(() => window.__next.bands.find((b) => b.id === "band-2"))).x;
  await tp(b2 - 400);
  await page.waitForTimeout(100);
  const before = await probe();
  await page.waitForFunction(() => (window.__next.run.events.dropped ?? 0) > 0, null, { timeout: 6000 });
  const after = await probe();
  assert.ok(after.patience < before.patience && before.x - after.x >= 300, `caught and carried: ${before.x} to ${after.x}, ${before.patience} to ${after.patience}`);
  await page.waitForTimeout(1600);
  const b3 = (await page.evaluate(() => window.__next.bands.find((b) => b.id === "band-2"))).x;
  await tp(b3 - 500);
  await page.waitForTimeout(100);
  const pips = (await probe()).patience;
  await page.keyboard.down("KeyS");
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => window.__next.run.x > window.__next.bands.find((b) => b.id === "band-2").x + 80, null, { timeout: 8000 });
  await page.keyboard.up("KeyD");
  await page.keyboard.up("KeyS");
  assert.equal((await probe()).patience, pips, "under the hole, no pip");
  await page.close();

  // The drum major: his bar, a hit while the mace is up, the last round's handover, the pipers who follow and play while he
  // walks; clocked in from the strip, so the office door goes home to 3-5 coming.
  await openStop("basel");
  await waitMode("play");
  await tp(11650);
  await page.waitForSelector(".next-hud__boss", { timeout: 5000 });
  assert.equal((await page.locator(".next-hud__boss-name").textContent()).trim(), "The drum major");
  assert.equal(await page.locator(".next-hud__boss-bar i[data-on='true']").count(), 3, "three pips");
  const swing = async () => {
    await page.keyboard.down("KeyH");
    await page.waitForTimeout(120);
    await page.keyboard.up("KeyH");
  };
  await tp(12150);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__next.dev.boss({ state: "throw" }));
  await swing();
  await page.waitForFunction(() => window.__next.boss.hp === 2, null, { timeout: 3000 });
  assert.equal(await page.locator(".next-hud__boss-bar i[data-on='true']").count(), 2, "two pips");
  await page.waitForFunction(() => !["hurt", "throw"].includes(window.__next.boss.state), null, { timeout: 4000 });
  await page.evaluate(() => window.__next.dev.boss({ hp: 1, state: "throw" }));
  await swing();
  await page.waitForFunction(() => window.__next.boss.state === "down", null, { timeout: 5000 });
  assert.ok(((await probe()).events.follow ?? 0) > 0, "the pipers fall in");
  await page.waitForTimeout(800);
  assert.equal((await probe()).music.lead, 0, "the chanter holds while he stands");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(500);
  assert.equal((await probe()).music.lead, 1, "and plays while he walks");
  await page.keyboard.up("KeyD");
  await shot("basel-handover.png");

  // The office door with the errands done: the tally, then the strip with 3-5 coming.
  await page.evaluate(() => {
    for (const id of ["bank", "printer", "pharmacy", "courier"]) window.__next.dev.errand(id);
  });
  await tp(15500);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => ["story", "title"].includes(window.__next.run.mode), null, { timeout: 30000 });
  await page.keyboard.up("KeyD");
  if ((await probe()).mode === "story") await page.keyboard.press("Enter");
  await waitMode("title", 20000);
  assert.ok(await page.getByRole("button", { name: "The Basel office is coming" }).isDisabled(), "3-5 is coming");
  await page.close();

  // The frame rate on the bridge with a band marching.
  await open(`${base}?next=1&dev=1&level=basel`);
  await waitMode("play");
  await tp(4300);
  await page.evaluate(() => window.__next.dev.band("band-1"));
  await page.waitForTimeout(3000);
  const bridge = await fpsOver(5);
  assert.ok(Math.min(...bridge) >= FPS_FLOOR, `${FPS_FLOOR} fps at 1920 by 1080 on the bridge: ${bridge}`);
  await page.close();

  // The four sizes.
  for (const [w, h] of [[1920, 1080], [1280, 800], [390, 844], [844, 390]]) {
    await open(`${base}?next=1&dev=1&level=basel`, [w, h]);
    await waitMode("play");
    await tp(4300);
    await page.waitForTimeout(1500);
    const wide = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(wide <= w, `no sideways scroll at ${w}: ${wide}`);
    await shot(`basel-${w}x${h}.png`);
    await page.close();
  }

  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: 3-4's card, the errands at their counters and the door shut until 4/4, a band drawn, caught and slid under, the drum corps' shake, the drum major's bar and his rounds, the pipers who play while he walks, the office door and 3-5 coming, the home scene over Basel's street, the four sizes; the bridge ${bridge} fps.`);

} finally {
  await browser.close();
}
