// Plays the moves in the lobby at /?next=1&nocast=1&dev=1 and asserts on them through window.__next.moves.
// Usage: node scripts/moves-browser.check.mjs [http://127.0.0.1:8090/]
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
const moves = () => page.evaluate(() => window.__next.moves);
const tap = async (key, ms = 80) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
const waitFor = async (pred, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const m = await moves();
    if (pred(m)) return m;
    await page.waitForTimeout(30);
  }
  return moves();
};
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&nocast=1&dev=1`);
  await page.waitForFunction(() => window.__next?.moves && window.__next?.run?.mode === "play", {}, { timeout: 30000 });
  await page.waitForTimeout(300);

  await tap("KeyH");
  let m = await waitFor((x) => x.move === "swing", 600);
  assert.equal(m.move, "swing");
  await page.waitForTimeout(140);
  await page.screenshot({ path: resolve(out, "moves-swing.png") });
  await page.waitForTimeout(500);

  // Beside the first luggage cart, facing it.
  const cart = (await moves()).carts[0];
  await page.evaluate((x) => window.__next.dev.teleport(x), cart - 300);
  await page.waitForTimeout(300);
  await tap("ArrowRight", 30);
  await page.waitForTimeout(200);
  const before = (await moves()).carts[0];
  await tap("KeyH");
  m = await waitFor((x) => (x.events.hit ?? 0) >= 1, 1200);
  assert.ok((m.events.hit ?? 0) >= 1, "the swing hits the cart");
  await page.screenshot({ path: resolve(out, "moves-bonk.png") });
  await page.waitForTimeout(600);
  assert.ok((await moves()).carts[0] > before + 40, "the cart rolls away");

  await tap("KeyF");
  m = await waitFor((x) => x.snot >= 1, 800);
  assert.ok(m.snot >= 1, "a snot rocket flies");
  await page.screenshot({ path: resolve(out, "moves-snot.png") });
  m = await waitFor((x) => x.puddles >= 1 || (x.events.splat ?? 0) >= 1, 2000);
  assert.ok((m.events.splat ?? 0) >= 1, "it splats");

  m = await moves();
  assert.ok(m.heat > 0, `heat from the moves: ${m.heat}`);
  const hot = m.heat;
  await tap("KeyT");
  m = await waitFor((x) => x.move === "wipe", 600);
  assert.equal(m.move, "wipe");
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(out, "moves-wipe.png") });
  m = await waitFor((x) => x.move === null, 1500);
  assert.ok(m.heat < hot, "the towel cools him");

  // A run starts with an empty smash; the dev switch fills it for the test.
  await page.evaluate(() => window.__next.dev.charge());
  await tap("KeyQ");
  m = await waitFor((x) => (x.events.burst ?? 0) >= 1, 2500);
  assert.ok((m.events.burst ?? 0) >= 1, "the smash bursts");
  await page.screenshot({ path: resolve(out, "moves-smash.png") });

  const sound = await page.evaluate(() => window.__next.sound);
  assert.ok(sound?.unlocked, "the first key press unlocks sound");
  for (const cue of ["whoosh", "bonk", "honk", "splat", "cloth", "boom"])
    assert.ok((sound.played[cue] ?? 0) >= 1, `${cue} played`);

  assert.deepEqual(errors, []);
  writeFileSync(resolve(out, "moves-check.json"), JSON.stringify({ moves: await moves(), errors }, null, 2));
  console.log("PASS: swing, bonk, snot, splat, towel and smash in the lobby with their sounds, no errors.");
} catch (err) {
  console.error("Moves check failure", errors);
  await page?.screenshot({ path: resolve(out, "moves-failure.png") });
  throw err;
} finally {
  await browser.close();
}
