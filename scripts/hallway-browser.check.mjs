// The hall in the browser (story Phase 2b): at four sizes its card and his place on the screen, A left and D right under the
// chase camera, W held through the card not a step, S back without turning, the controller's stick; the 3D view at speed
// with the HUD over it, stepping its own tier down and never up; a lost context falling back flat and the level still
// playable; the puddle, the bellhops at the elevators; his back with no face and his profile on a hit; flat with one canvas.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/hallway-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
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
const canvases = () => page.locator(".next-stage canvas").count();
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const heroX = () => page.evaluate(() => window.__next.hero.x);
const screenX = () => page.evaluate(() => window.__next.heroScreenX / innerWidth);
/** From in front of 1417: three swings of the mallet and the level is over. */
const openTheDoor = async () => {
  await tp(7850);
  await page.waitForTimeout(400);
  for (let i = 0; i < 3 && (await page.evaluate(() => window.__next.run.mode)) === "play"; i++) {
    await page.keyboard.press("KeyH");
    await page.waitForTimeout(800);
    if (i < 2) assert.equal(await page.evaluate(() => window.__next.run.events.keyFail), i + 1, `the reader fails ${i + 1}`);
  }
  assert.equal(await page.evaluate(() => window.__next.run.events.keyOpen), 1, "the door gives on the third");
  await page.waitForFunction(() => window.__next.run.mode !== "play", null, { timeout: 8000 });
};
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
};

try {
  // The four sizes: the card fits, he stands in the middle, A takes him left of it and D right of it.
  for (const [w, h] of SIZES) {
    await open(`${base}?next=1&dev=1&level=hallway`, [w, h]);
    await waitMode("card");
    await page.evaluate(() => window.__next.dev.slowmo(0.001, 60));
    await page.waitForTimeout(300);
    const text = await page.locator(".next-veil__card").textContent();
    assert.ok(text.includes("2-3") && /fourteenth floor/i.test(text), `2-3's card: ${text}`);
    const card = await page.locator(".next-veil__card").boundingBox();
    assert.ok(card.x >= -0.5 && card.y >= -0.5 && card.x + card.width <= w + 0.5 && card.y + card.height <= h + 0.5, `the card fits at ${w}x${h}: ${JSON.stringify(card)}`);
    await shot(`hallway-card-${w}x${h}.png`);
    await page.evaluate(() => window.__next.dev.slowmo(1, 0));
    await waitMode("play");
    await page.waitForFunction(() => window.__next?.three?.canvas, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(sw <= w, `no sideways scrolling at ${w}x${h}: ${sw}`);
    const rest = await screenX();
    assert.ok(Math.abs(rest - 0.5) < 0.02, `he stands in the middle at ${w}x${h}: ${rest}`);
    await shot(`hallway-${w}x${h}.png`);
    await hold("KeyA", 500);
    const left = await screenX();
    await page.keyboard.up("KeyA");
    assert.ok(left < 0.45, `A is the screen's left at ${w}x${h}: ${left}`);
    await page.waitForTimeout(100);
    await hold("KeyD", 1000);
    const right = await screenX();
    await page.keyboard.up("KeyD");
    assert.ok(right > 0.55, `D is the screen's right at ${w}x${h}: ${right}`);
    if (w < h) assert.ok(await page.locator('.next-touch__button[data-action="up"]').isVisible(), "the pad's forward button");
    await page.close();
  }

  // W held through the card is not a step; let go and pressed, he walks; S walks him back without turning him; the hint.
  await open(`${base}?next=1&dev=1&level=hallway`);
  await waitMode("card");
  await page.keyboard.down("KeyW");
  await waitMode("play");
  const start = await heroX();
  await page.waitForTimeout(250);
  assert.equal(await heroX(), start, "W held through the card is no step");
  await page.keyboard.up("KeyW");
  assert.match(await page.locator(".next-hud__hint").innerText(), /W forward · A D sidestep/);
  await page.waitForFunction(() => window.__next?.three?.canvas, null, { timeout: 15000 });
  await hold("KeyW", 600);
  await page.keyboard.up("KeyW");
  const walked = await heroX();
  assert.ok(walked > start + 50, `W walks him: ${start} to ${walked}`);
  await hold("KeyS", 300);
  await page.keyboard.up("KeyS");
  assert.ok((await heroX()) < walked, "S walks him back");
  assert.equal(await page.evaluate(() => window.__next.moves.facing), 1, "without turning him");
  // The controller's stick.
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__next.dev.pad({ axes: [-1, 0] }));
  await page.waitForTimeout(500);
  const padLeft = await screenX();
  await page.evaluate(() => window.__next.dev.pad(null));
  assert.ok(padLeft < 0.45, `the stick steps him left: ${padLeft}`);
  // Its governor has a few seconds to settle on a tier this card holds; then it holds it, at speed, the HUD over it.
  await page.waitForTimeout(9000);
  const rates = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    rates.push(await page.evaluate(() => window.__next.three.fps));
  }
  assert.ok(Math.min(...rates) >= 55, `the hall holds 55 fps at 1920 by 1080: ${rates}`);
  const three = await page.evaluate(() => window.__next.three);
  assert.equal(three.drawing, true, "the 3D view is drawing");
  assert.ok(await page.locator(".next-hud__hint").isVisible(), "the HUD over it");
  assert.equal(await canvases(), 2, "two canvases");
  await shot("hallway-first.png");

  // His back, walking and swinging, with no face to keep clear; his profile when he is hit, on the screen.
  await tp(2200);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.__next.hero.clip === "walk", null, { timeout: 3000 });
  assert.equal(await page.evaluate(() => window.__next.faceScreen), null, "no face while walking");
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyH");
  await page.waitForFunction(() => window.__next.hero.clip === "swing", null, { timeout: 3000, polling: 10 });
  await shot("hallway-swing.png");
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    window.__next.dev.heal();
    window.__next.dev.hit();
  });
  await page.waitForFunction(() => !!window.__next.faceScreen, null, { timeout: 2000, polling: 10 });
  const face = await page.evaluate(() => window.__next.faceScreen);
  assert.ok(face.x >= 0 && face.y >= 0 && face.x + face.w <= 1920 && face.y + face.h <= 1080, `his face on the screen: ${JSON.stringify(face)}`);
  await shot("hallway-hurt.png");
  await page.waitForTimeout(1500);

  // The puddle slips him at the alcove; a door swings; the bellhops shove at the elevators.
  await page.evaluate(() => window.__next.dev.heal());
  await tp(2650);
  await page.waitForTimeout(300);
  await hold("KeyW", 1200);
  await page.keyboard.up("KeyW");
  assert.ok((await page.evaluate(() => window.__next.run.events.slip)) >= 1, "the puddle slips him");
  await page.evaluate(() => window.__next.dev.heal());
  await tp(760);
  await page.waitForFunction(() => (window.__next.run.events.hallDoor ?? 0) >= 2, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  await shot("hallway-door.png");
  await page.evaluate(() => window.__next.dev.heal());
  await tp(4700);
  await page.waitForFunction(() => (window.__next.run.events.castAttack ?? 0) >= 1, null, { timeout: 15000 });
  await shot("hallway-bellhops.png");
  await page.evaluate(() => window.__next.dev.heal());

  // The governor: a heavy frame steps its tier down once, and the density with it; it never comes back up.
  const before = await page.evaluate(() => window.__next.three);
  const ORDER = ["ultra", "high", "medium", "low"];
  await page.evaluate(() => window.__next.dev.three({ frameMs: 30 }));
  await page.waitForFunction((q) => window.__next.three.quality !== q, before.quality, { timeout: 6000 });
  await page.evaluate(() => window.__next.dev.three({ frameMs: 0 }));
  const after = await page.evaluate(() => window.__next.three);
  assert.ok(ORDER.indexOf(after.quality) > ORDER.indexOf(before.quality), `stepped down: ${before.quality} to ${after.quality}`);
  assert.ok(after.density <= before.density, "the density with it");
  await page.waitForTimeout(3000);
  const later = await page.evaluate(() => window.__next.three);
  assert.ok(ORDER.indexOf(later.quality) >= ORDER.indexOf(after.quality), "never up");

  // A lost context: flat within a moment, the HUD still there, the level still playable to the door.
  await page.evaluate(() => window.__next.dev.three({ lose: true }));
  await page.waitForFunction(() => window.__next.three?.canvas === false, null, { timeout: 3000 });
  await page.waitForTimeout(500);
  assert.equal(await canvases(), 1, "one canvas left");
  assert.ok(await page.locator(".next-hud__hint").isVisible(), "the HUD still there");
  await shot("hallway-lost.png");
  await openTheDoor();
  await page.close();

  // The door in 3D.
  await open(`${base}?next=1&dev=1&level=hallway`);
  await waitMode("play");
  await page.waitForFunction(() => window.__next?.three?.canvas, null, { timeout: 15000 });
  await openTheDoor();
  await page.close();

  // Flat from the start: one canvas, no 3D view, and it plays to the end.
  await open(`${base}?next=1&dev=1&level=hallway&flat=1`);
  await waitMode("play");
  assert.equal(await canvases(), 1, "one canvas when flat");
  assert.equal(await page.evaluate(() => window.__next.three), undefined, "no 3D view when flat");
  await shot("hallway-flat.png");
  await hold("KeyW", 500);
  await page.keyboard.up("KeyW");
  assert.ok((await heroX()) > 150, "W walks him flat too");
  await openTheDoor();
  await page.close();

  assert.deepEqual(errors, [], "no console errors");
  console.log(`PASS: the hall at four sizes, A left and D right, W through the card, S back, the stick; ${JSON.stringify(rates)} fps at ${three.quality}, density ${three.density}; the governor, a lost context, the puddle, the door, the bellhops, his face only in profile; flat.`);
} catch (err) {
  if (page && !page.isClosed()) await shot("hallway-fail.png").catch(() => undefined);
  console.error(`errors: ${errors.join("; ")}`);
  throw err;
} finally {
  await browser.close();
}
