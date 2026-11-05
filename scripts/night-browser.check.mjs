// The night in the browser (story Phase 2a): 2-1's card and status on the HUD, the keycards and their tiers, the guard's
// flash and stun, the servers' ice water, the M CLUB's card and tally, the stairs out to 2-2's card, Try again after Gold,
// the night darker than the day; 2-2's card, Floor on the HUD, a chute's drop, the supervisor's bar, the door on fourteen;
// the frame rate in both; the four sizes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/night-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const SIZES = [[1920, 1080], [1280, 800], [390, 844], [844, 390]];
const ACT_ONE = { v: 1, next: "lobby-night", done: ["sat", "lobby", "restaurant", "campus", "arena"], best: { sat: 900, lobby: 4000, restaurant: 4000, campus: 4000, arena: 4000 }, bonked: 7, run: null, carry: null, credits: false };
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
const run = () => page.evaluate(() => window.__next.run);
const waitMode = (m, timeout = 30000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const veil = () => page.locator(".next-veil__card").textContent();
const hud = () => page.locator(".next-hud__venue").textContent();
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const enter = async () => {
  await page.waitForTimeout(350);
  await page.keyboard.press("Enter");
};
const give = async (n) => {
  const before = (await run()).keycards;
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => window.__next.dev.give("keycard"));
    await page.waitForFunction((w) => window.__next.run.keycards >= w, before + i + 1, { timeout: 4000 });
  }
};
/** Every size, with the shot its name asks for. */
const sizes = async (name, each) => {
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(600);
    const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(sw <= w, `${name} at ${w}x${h}: no sideways scrolling (${sw})`);
    await each?.(w, h);
    await shot(`${name}-${w}x${h}.png`);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
};
/** A timed card held still for its four sizes (the clock all but stopped), and let go. */
const cardFits = async (name) => {
  await page.evaluate(() => window.__next.dev.slowmo(0.001, 60));
  await sizes(name, async (w, h) => {
    const b = await page.locator(".next-veil__card").boundingBox();
    assert.ok(b && b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= w + 0.5 && b.y + b.height <= h + 0.5, `${name} at ${w}x${h}: on the screen ${JSON.stringify(b)}`);
  });
  await page.evaluate(() => window.__next.dev.slowmo(1, 0));
};
const fps = async (name) => {
  // The counter's first reading covers the load.
  await page.waitForTimeout(2000);
  const rates = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    rates.push(await page.evaluate(() => window.__next.fps));
  }
  assert.ok(Math.min(...rates) >= 55, `${name} holds 55 fps at 1920x1080: ${rates}`);
  return rates;
};
/** How bright a stretch of the screen is: a wall high on the screen, clear of his head and the HUD. */
const brightness = async () => {
  const png = await page.screenshot({ clip: { x: 760, y: 170, width: 400, height: 120 } });
  const { channels } = await sharp(png).stats();
  return (channels[0].mean * 0.299 + channels[1].mean * 0.587 + channels[2].mean * 0.114) | 0;
};

try {
  // 2-1's card: its words and the phones.
  await open(`${base}?next=1&dev=1&level=lobby-night`);
  await waitMode("card", 60000);
  const card = await veil();
  for (const words of ["2-1", "The lobby, 11:40 pm", "Front desk has you as MEMBER. System error."]) assert.ok(card.includes(words), `2-1's card says ${words}: ${card}`);
  await cardFits("night-card");
  await waitMode("play");
  assert.match(await page.locator(".next-hud__mode").textContent(), /2-1 · MEMBER$/, "he starts a member");
  await sizes("night-lobby");

  // The keycards: Silver at two, the late checkout's minute at four.
  await give(2);
  await page.waitForFunction(() => /· SILVER$/.test(document.querySelector(".next-hud__mode")?.textContent ?? ""), null, { timeout: 4000 });
  const t0 = (await run()).time;
  await give(2);
  await page.waitForFunction(() => /Late checkout/.test(window.__next.moves.bubble ?? ""), null, { timeout: 4000 });
  assert.ok((await run()).time > t0 + 50, "Gold's minute on the clock");
  assert.ok(((await run()).events.tier ?? 0) === 2, "two tiers");
  assert.ok(await page.evaluate(() => (window.__next.sound.played.chime ?? 0) >= 4 && (window.__next.sound.played.fanfare ?? 0) >= 2), "the keycard's chime, the tier's fanfare");

  // The guard's flash on the mezzanine: he stops the hero once.
  await tp(8700, -520);
  await page.waitForFunction(() => (window.__next.run.events.flash ?? 0) >= 1, null, { timeout: 8000 });
  await page.waitForFunction(() => window.__next.hero.stunT > 0, null, { timeout: 4000, polling: 20 });
  await shot("night-guard.png");
  await page.evaluate(() => window.__next.dev.heal());

  // The servers' ice water in the conference wing.
  await page.waitForTimeout(1200);
  await tp(12900, 0);
  await page.waitForFunction(() => (window.__next.run.events.castThrow ?? 0) >= 1, null, { timeout: 12000 });
  await page.evaluate(() => window.__next.dev.heal());

  // The M CLUB at six: its card, the round, its own best, back on the mezzanine.
  await give(2);
  await page.waitForFunction(() => /· PLATINUM$/.test(document.querySelector(".next-hud__mode")?.textContent ?? ""), null, { timeout: 4000 });
  await tp(8800, -520);
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowDown");
  await waitMode("questCard", 8000);
  assert.match(await veil(), /The M CLUB/);
  await cardFits("night-mclub");
  await waitMode("quest", 8000);
  await page.evaluate(() => {
    window.__next.dev.quest({ eat: ["sliders", "meatballs", "cheese"] });
    window.__next.dev.questSkip();
  });
  await waitMode("questTally", 8000);
  const lounge = await page.evaluate(() => window.__next.quest.result.score);
  assert.ok(lounge > 0, "the round scored");
  await page.waitForFunction((want) => Number(localStorage.getItem("hammer-time-best-lounge")) === want, lounge, { timeout: 4000 });
  await enter();
  await waitMode("play", 8000);
  assert.equal((await run()).level, "lobby-night", "back in the lobby");

  // The elevator: Titanium only, shut with its card; the stairs: out to 2-2's card, Platinum on it.
  await tp(5700, 0);
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(500);
  assert.equal((await run()).level, "lobby-night", "the elevator stays shut");
  await page.evaluate(() => window.__next.dev.heal());
  await tp(6400, 0);
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => window.__next.run.level === "tower", null, { timeout: 30000, polling: 100 }).catch(() => undefined);
  for (let i = 0; i < 6 && (await run()).level !== "tower"; i++) {
    await enter();
    await page.waitForTimeout(700);
  }
  assert.equal((await run()).level, "tower", "on to 2-2");
  await waitMode("card");
  const two = await veil();
  assert.ok(two.includes("2-2") && two.includes("The elevator stops at every floor. I don't."), `2-2's card: ${two}`);
  assert.ok(/PLATINUM/.test(two) || /PLATINUM/.test(await page.locator(".next-veil").textContent()), `his status on the card: ${two}`);
  await cardFits("tower-card");
  await page.close();

  // Try again after Gold, on a saved journey: the card as it stood, its time and no keycards.
  await open(`${base}?dev=1`);
  await page.evaluate((j) => localStorage.setItem("hammer-time-journey", JSON.stringify(j)), ACT_ONE);
  await page.goto(`${base}?dev=1`);
  await waitMode("title", 60000);
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("story", 60000);
  assert.match(await veil(), /11:40 pm\. The same lobby\./);
  await enter();
  await waitMode("card", 60000);
  const atCard = await run();
  assert.deepEqual([atCard.level, atCard.keycards], ["lobby-night", 0]);
  await waitMode("play");
  await give(4);
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => window.__next.run.mode === "play", null, { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__next.dev.patience(1);
      window.__next.dev.hit();
    });
    await page.waitForFunction(() => window.__next.run.mode === "dying" || window.__next.run.mode === "over", null, { timeout: 8000 });
  }
  await waitMode("over");
  assert.match(await veil(), /Hammer down/);
  await page.getByRole("button", { name: "Try again" }).click();
  await waitMode("card");
  const again = await run();
  assert.deepEqual([again.level, again.keycards, again.lives, again.time], ["lobby-night", 0, 3, atCard.time], "Try again: the card as it stood");
  await page.close();

  // The night darker than the day, the same wall.
  await open(`${base}?next=1&dev=1&level=lobby`);
  await waitMode("play", 60000);
  await tp(2200, 0);
  await page.waitForTimeout(900);
  const day = await brightness();
  await page.close();
  await open(`${base}?next=1&dev=1&level=lobby-night`);
  await waitMode("play", 60000);
  await tp(2200, 0);
  await page.waitForTimeout(900);
  const night = await brightness();
  assert.ok(night <= day * 0.7, `the night is 30 percent darker: ${night} against ${day}`);
  const nightFps = await fps("2-1");
  await page.close();

  // The tower: its card, Floor on the HUD, a chute's drop for two seconds and no life.
  await open(`${base}?next=1&dev=1&level=tower`);
  await waitMode("card", 60000);
  assert.match(await veil(), /2-2/);
  await waitMode("play");
  assert.match(await hud(), /Floor 1/);
  await sizes("tower");
  const towerFps = await fps("the tower");
  const before = await run();
  await tp(1310, -2170);
  await page.waitForFunction(() => (window.__next.run.events.chute ?? 0) >= 1, null, { timeout: 4000 });
  await page.waitForFunction(() => window.__next.hero.onGround, null, { timeout: 4000 });
  const dropped = await run();
  assert.equal(dropped.lives, 3, "a chute takes no life");
  assert.ok(dropped.time <= before.time - 2, `a chute takes two seconds: ${before.time} to ${dropped.time}`);
  assert.equal(Math.round(dropped.y), -1620, "down a floor");
  assert.match(await hud(), /Floor 4/);
  // High up, the same four sizes: his feet on the floor line and no ground band.
  await sizes("tower-high", async (w, h) => {
    const y = await page.evaluate(() => window.__next.heroScreenY);
    assert.ok(y > h * 0.3 && y < h * 0.95, `at ${w}x${h} his feet at ${y}`);
  });
  assert.ok(await page.evaluate(() => (window.__next.sound.played.slide ?? 0) >= 1), "the chute's slide");

  // The supervisor: her bar on floor eleven, her first wave.
  await tp(2300, -5400);
  await page.waitForFunction(() => window.__next.boss?.state === "wave", null, { timeout: 8000 });
  assert.match(await page.locator(".next-hud__boss-name").textContent(), /Housekeeping/);
  await page.waitForTimeout(800);
  await shot("tower-supervisor.png");
  assert.ok(await page.evaluate(() => (window.__next.sound.played.rattle ?? 0) >= 1), "her carts' rattle");

  // The door on fourteen, locked until she is down, then out.
  await page.evaluate(() => window.__next.dev.heal());
  await tp(240, -7020);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowLeft");
  assert.equal((await run()).mode, "play", "locked until she is down");
  await page.evaluate(() => {
    window.__next.dev.boss({ state: "down" });
    window.__next.dev.heal();
  });
  await tp(240, -7020);
  await page.keyboard.down("ArrowLeft");
  await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
  await page.keyboard.up("ArrowLeft");
  await shot("tower-out.png");
  await page.close();

  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: the night plays: card, status, keycards, guard, water, M CLUB, the stairs, Try again, darker (${night} against ${day}), the tower, its chute, the supervisor, the door; fps ${JSON.stringify({ lobby: nightFps, tower: towerFps })}.`);
} catch (err) {
  if (page && !page.isClosed()) await shot("night-fail.png").catch(() => undefined);
  console.error(`errors: ${errors.join("; ")}`);
  throw err;
} finally {
  await browser.close();
}
