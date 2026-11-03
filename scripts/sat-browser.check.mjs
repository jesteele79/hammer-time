// SAT in the browser at /?next=1&dev=1&level=sat (story Phase 1): its card and clock, the first lesson, its five
// stretches, the X-ray belt carrying him, the body scanner passed only by a slide, his NO LIQUIDS thought, the bartender's
// coaster, the gate's round from the podium and its tally into "Three hours later" and 1-1's card; the same with the art
// missing; the card and the hint on both phone shapes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/sat-browser.check.mjs [http://127.0.0.1:8090/]
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
const waitMode = (m, timeout = 30000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const veil = () => page.locator(".next-veil__card").textContent();
const hint = () => page.locator(".next-hud__hint").innerText();
const inside = (b, w, h) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= w + 0.5 && b.y + b.h <= h + 0.5;
/** On a phone upright and on its side the card (or the hint, once playing) is on the screen and nothing scrolls sideways. */
const fits = async (sel, name) => {
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const r = await page.evaluate((s) => {
      const b = document.querySelector(s).getBoundingClientRect();
      return { box: { x: b.x, y: b.y, w: b.width, h: b.height }, sw: document.scrollingElement.scrollWidth };
    }, sel);
    assert.ok(r.sw <= w, `${name} at ${w}x${h}: no sideways scrolling (${r.sw})`);
    assert.ok(inside(r.box, w, h), `${name} at ${w}x${h}: on the screen ${JSON.stringify(r.box)}`);
    await shot(`sat-${name}-${w}x${h}.png`);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
};
/** From in front of the podium: walks in, the round's card, the round; skipped to its tally; Enter, the clock's tally, the hold's first card. */
const board = async () => {
  await tp(7650, 0);
  await page.waitForTimeout(250);
  await page.keyboard.down("ArrowRight");
  await waitMode("questCard", 8000);
  await page.keyboard.up("ArrowRight");
  await waitMode("quest", 8000);
  const id = await page.evaluate(() => window.__next.quest?.id);
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode("questTally", 8000);
  await page.waitForTimeout(400);
  await page.keyboard.press("Enter");
  await waitMode("story", 20000);
  return id;
};

try {
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&dev=1&level=sat`);
  await waitMode("card");
  let text = await veil();
  for (const words of ["SAT", "San Antonio International", "Boarding in 7:00"]) assert.ok(text.includes(words), `SAT's card says ${words}: ${text}`);
  await fits(".next-veil__card", "card");
  await waitMode("play");
  assert.match(await page.locator(".next-hud").innerText(), /7:00|6:5\d/, "the boarding clock");
  assert.match(await hint(), /^Space jumps/, "the first lesson");
  await fits(".next-hud__hint", "hint");

  // The five stretches, a picture of each.
  for (const [name, x, y] of [
    ["curb", 700, 0],
    ["hall", 2500, 0],
    ["tsa", 4250, -120],
    ["concourse", 6000, 0],
    ["gate", 7500, 0],
  ]) {
    await tp(x, y);
    await page.waitForTimeout(700);
    await shot(`sat-${name}.png`);
  }

  // The X-ray belt carries him with no key down.
  await tp(4000, -130);
  await page.waitForTimeout(400);
  const x0 = (await run()).x;
  await page.waitForTimeout(500);
  const x1 = (await run()).x;
  assert.ok(x1 - x0 > 60, `the belt carries him: ${x0} to ${x1}`);

  // The scanner stops a man walking upright; a slide takes him under it, past his NO LIQUIDS thought.
  await page.evaluate(() => window.__next.dev.dismiss("tsa-2"));
  // On the ramp down, clear of the scanner (a teleport into its ceiling would push him out its far side).
  await tp(4620, -90);
  await page.waitForTimeout(300);
  await hold(["ArrowRight"], 1200);
  let r = await run();
  assert.ok(r.x < 4750, `upright he stays out of the scanner: ${r.x}`);
  const thinks = r.events.think ?? 0;
  await tp(4550, -120);
  await page.waitForTimeout(300);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  await page.keyboard.down("ArrowDown");
  r = await waitFor((s) => s.x > 5100, 4000);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ShiftLeft");
  assert.ok(r.x > 5100, `a slide takes him under the scanner: ${r.x}`);
  assert.ok((r.events.think ?? 0) > thinks, "a thought on the way past NO LIQUIDS");
  await shot("sat-scanner.png");

  // The bartender throws a coaster at a man in front of his bar.
  await tp(5650, 0);
  await page.evaluate(() => window.__next.dev.heal());
  const coaster = await page
    .waitForFunction(() => window.__next.cast.planes.some((m) => m.kind === "coaster"), null, { timeout: 8000, polling: 50 })
    .then(() => true)
    .catch(() => false);
  assert.ok(coaster, "a coaster from the bar");
  await shot("sat-coaster.png");

  // The podium opens the gate's round; its tally ends the level: "Three hours later", then 1-1's card.
  await page.evaluate(() => window.__next.dev.heal());
  assert.equal(await board(), "fares", "the podium opens Fare Darts");
  await page.waitForSelector("text=Three hours later. The hotel.", { timeout: 4000 });
  await shot("sat-three-hours.png");
  await page.keyboard.press("Enter");
  await waitMode("card", 8000);
  r = await run();
  assert.equal(r.level, "lobby", "1-1's card after SAT");
  assert.match(await veil(), /Hotel lobby/);

  // The art missing: the stand-ins, the same way through, no errors.
  await page.goto(`${base}?next=1&dev=1&level=sat&noart=1`);
  await waitMode("play");
  const art = await page.evaluate(() => window.__next.castArt);
  for (const p of ["skycap-1", "tsa-1"]) assert.ok(art.standIn.includes(p), `${p} draws as the stand-in: ${JSON.stringify(art.standIn)}`);
  await tp(3700, 0);
  await page.waitForTimeout(600);
  await shot("sat-noart.png");
  await page.evaluate(() => window.__next.dev.heal());
  assert.equal(await board(), "fares");
  await page.waitForSelector("text=Three hours later. The hotel.", { timeout: 4000 });

  assert.deepEqual(errors, []);
  writeFileSync(resolve(out, "sat-check.json"), JSON.stringify({ run: await run(), errors }, null, 2));
  console.log("PASS: SAT's card and clock, the first lesson, the five stretches, the belt, the scanner by a slide, the thought, the coaster, the gate into Three hours later and 1-1's card, the art missing; the card and the hint on both phone shapes; no errors.");
} catch (err) {
  console.error("SAT check failure", errors);
  await page?.screenshot({ path: resolve(out, "sat-failure.png") });
  throw err;
} finally {
  await browser.close();
}
