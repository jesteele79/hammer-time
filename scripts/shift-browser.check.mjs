// Plays the shift across its venues at /?next=1&dev=1: the lobby's exit into the restaurant's card, a flat-top, the
// walk-in and the swinging door, the restaurant's exit into the campus's card, the tray return's ride up, the library's
// doors into the gift shop's card, the pig down and CLOCK OUT into "Shift over", and play again from the lobby.
// Usage: node scripts/shift-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
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
const run = () => page.evaluate(() => window.__next.run);
const waitFor = async (pred, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await run();
    if (pred(r)) return r;
    await page.waitForTimeout(30);
  }
  return run();
};
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** The card stays off his face on both phone shapes and the desktop; a screenshot of each. */
const cardClearOfFace = async (name) => {
  for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const b = document.querySelector(".next-veil__card").getBoundingClientRect();
      return { card: { x: b.x, y: b.y, w: b.width, h: b.height }, face: window.__next.faceScreen };
    });
    assert.ok(!hit(r.card, r.face), `${name} at ${w}x${h}: the card covers his face ${JSON.stringify(r)}`);
    await shot(`${name}-${w}x${h}.png`);
  }
};
/** A card that holds only a moment, checked at the shape the page already has. */
const cardClearNow = async (name) => {
  const r = await page.evaluate(() => {
    const b = document.querySelector(".next-veil__card").getBoundingClientRect();
    return { card: { x: b.x, y: b.y, w: b.width, h: b.height }, face: window.__next.faceScreen, size: [innerWidth, innerHeight] };
  });
  assert.ok(!hit(r.card, r.face), `${name}: the card covers his face ${JSON.stringify(r)}`);
  await shot(`${name}-${r.size[0]}x${r.size[1]}.png`);
};
/**
 * Whoever is drawn is who the venue has: every cast view draws its id's person in its colors, and every cart view is a
 * cart the venue has, carrying its load. Waits a few frames for views of the newly seen to be made.
 */
const drawnAsTheyAre = async (where) => {
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ drawn: window.__next.castArt.drawn, carts: window.__next.castArt.carts, people: window.__next.cast.people, targets: window.__next.cast.targets }));
  for (const [id, d] of Object.entries(r.drawn)) {
    const n = r.people[id];
    if (n) assert.deepEqual(d, n, `${where}: cast view ${id} draws ${JSON.stringify(d)} for ${JSON.stringify(n)}`);
  }
  const loads = Object.fromEntries(r.targets.map((t) => [t.id, t.load]));
  for (const c of r.carts) assert.equal(c.load, loads[c.id], `${where}: cart view ${c.id} (${c.load}) is not one of this venue's carts ${JSON.stringify(r.targets)}`);
};
/** From just before a venue's exit, walks in and waits for the next venue's card, or the clear. */
const clockOut = async (x, y, next) => {
  await tp(x, y);
  await page.waitForTimeout(250);
  await hold(["ArrowRight"], 1200);
  return waitFor((r) => (next === "clear" ? r.mode === "clear" : r.mode === "card" && r.level === next), 16000);
};
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&dev=1`);
  await page.waitForFunction(() => window.__next?.run && window.__next?.dev, {}, { timeout: 30000 });
  let r = await waitFor((x) => x.mode === "play", 6000);
  assert.equal(r.level, "lobby");
  await page.evaluate(() => window.__next.dev.give("pepper"));
  await page.waitForTimeout(300);
  // A venue's card holds 1.6 s, too short to turn the phone: it is seen on the phone's tall shape, where his face sits
  // nearest the card. "Shift over" holds, and is seen on every shape.
  await page.setViewportSize({ width: 390, height: 844 });
  r = await clockOut(15800, 0, "restaurant");
  assert.deepEqual([r.mode, r.level, r.lives, r.hot], ["card", "restaurant", 3, true], "the restaurant's card; the pepper came along");
  assert.ok(r.score > 0, "the lobby's tally paid");
  await page.waitForSelector("text=Your shift goes on", { timeout: 2000 });
  // The camera is put on him where he arrives, not somewhere between the last venue's exit and here.
  r = await waitFor((x) => x.level === "restaurant" && x.shownX !== undefined, 4000);
  assert.ok(Math.abs(r.shownX - 300) < 1, `the restaurant comes on screen with him at its door: ${r.shownX}`);
  await cardClearNow("veil-restaurant");
  await waitFor((x) => x.mode === "play", 6000);
  await page.setViewportSize({ width: 1280, height: 800 });
  // The lobby's people and luggage carts stay in the lobby: the busser by his dish cart is the restaurant's.
  await tp(3500, 0);
  await drawnAsTheyAre("the restaurant's dining room");
  await tp(7900, -180);
  await drawnAsTheyAre("the restaurant's line");

  // A flat-top heats him; the walk-in cools him. The line cook marches the line and would knock him off either, so he
  // goes on his break first.
  await page.evaluate(() => window.__next.dev.dismiss("cook-line"));
  await tp(8500, -180);
  await page.evaluate(() => window.__next.dev.heat(30));
  await page.waitForTimeout(1500);
  let heat = await page.evaluate(() => window.__next.moves.heat);
  assert.ok(heat > 45, `the flat-top heats him: ${heat}`);
  await shot("shift-flattop.png");
  await tp(9250, 0);
  await page.evaluate(() => window.__next.dev.heat(80));
  await page.waitForTimeout(1500);
  heat = await page.evaluate(() => window.__next.moves.heat);
  assert.ok(heat < 50, `the walk-in cools him: ${heat}`);
  const played = await page.evaluate(() => window.__next.sound.played);
  assert.ok((played.sizzle ?? 0) >= 1 && (played.frost ?? 0) >= 1, `the sizzle and the frost: ${JSON.stringify(played)}`);

  // The kitchen server comes through the swinging door.
  await page.evaluate(() => window.__next.dev.heal());
  await tp(4700, 0);
  r = await waitFor((x) => (x.events.doorSwing ?? 0) > 0, 12000);
  assert.ok((r.events.doorSwing ?? 0) > 0, "the swinging door swung");
  await shot("shift-door.png");

  // On to the campus, and up the tray return's conveyor.
  r = await clockOut(15600, 0, "campus");
  assert.deepEqual([r.mode, r.level], ["card", "campus"]);
  await waitFor((x) => x.mode === "play", 6000);
  await tp(7450, -170);
  r = await waitFor((x) => x.y < -500, 8000);
  assert.ok(r.y < -500, `carried up the conveyor: ${r.y}`);
  await shot("shift-conveyor.png");
  await drawnAsTheyAre("the campus's deck");

  // The library's doors lead to the gift shop's card, seen on the phone's tall shape as the others are.
  await page.setViewportSize({ width: 390, height: 844 });
  r = await clockOut(15880, -900, "arena");
  assert.deepEqual([r.mode, r.level], ["card", "arena"]);
  for (const words of ["World 1-4", "The Pink Menace", "Your shift goes on"]) await page.waitForSelector(`.next-veil__card >> text=${words}`, { timeout: 2000 });
  await cardClearNow("veil-arena");
  await waitFor((x) => x.mode === "play", 6000);
  await page.setViewportSize({ width: 1280, height: 800 });

  // The pig down, CLOCK OUT ends the shift.
  await page.evaluate(() => window.__next.dev.pig({ state: "defeated" }));
  r = await clockOut(3950, 0, "clear");
  assert.equal(r.mode, "clear");
  await page.waitForSelector("text=Shift over", { timeout: 2000 });
  const scores = await page.locator(".next-veil__scores").innerText();
  assert.match(scores, /Score[\s\S]*\d{6}[\s\S]*Best[\s\S]*\d{6}/i, `the shift's score and the best: ${scores}`);
  await shot("shift-over.png");
  await cardClearOfFace("veil-shift-over");
  await page.click("text=Play again");
  r = await waitFor((x) => x.mode === "play", 6000);
  assert.deepEqual([r.level, r.lives, r.score], ["lobby", 3, 0], "a fresh shift from the lobby");
  await drawnAsTheyAre("the lobby after Play again");
  await tp(2000, 0);
  await drawnAsTheyAre("the lobby's desk after Play again");

  assert.deepEqual(errors, []);
  writeFileSync(resolve(out, "shift-check.json"), JSON.stringify({ run: await run(), errors }, null, 2));
  console.log("PASS: the lobby into the restaurant, a flat-top, the walk-in, the swinging door, into the campus, the conveyor, into the gift shop, the pig down, Shift over and play again; no errors.");
} catch (err) {
  console.error("Shift check failure", errors);
  await page?.screenshot({ path: resolve(out, "shift-failure.png") });
  throw err;
} finally {
  await browser.close();
}
