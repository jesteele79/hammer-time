// The painted cast loads: at /?next=1&dev=1 the first bellhop draws from his painting; with his rig
// unreachable he falls back to the stand-in and the game plays on; with &noart=1 everyone is a stand-in.
// Usage: node scripts/cast-art-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
/** Opens the game with `query` (blocking `block` when given) and returns the cast's art and the page's errors. */
async function open(name, query, block = null) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if (block) await page.route(block, (r) => r.abort());
  await page.goto(`${base}?next=1&dev=1${query}`);
  await page.waitForFunction(() => window.__next?.castArt && window.__next?.run?.mode === "play", {}, { timeout: 30000 });
  await page.evaluate(() => window.__next.dev.teleport(900, 0));
  await page.waitForTimeout(800);
  const art = await page.evaluate(() => window.__next.castArt);
  await page.screenshot({ path: resolve("artifacts", `cast-art-${name}.png`) });
  await page.close();
  return { art, errors };
}
try {
  const painted = await open("painted", "");
  assert.ok(painted.art.painted.includes("bellhop-1"), `bellhop-1 painted: ${JSON.stringify(painted.art)}`);
  assert.deepEqual(painted.errors, []);
  const blocked = await open("blocked", "", "**/art/cast/bellhop-1-rig.json");
  assert.ok(blocked.art.standIn.includes("bellhop-1") && !blocked.art.painted.includes("bellhop-1"), JSON.stringify(blocked.art));
  assert.deepEqual(
    blocked.errors.filter((e) => !/Failed to load resource|ERR_FAILED/.test(e)),
    [],
    "nothing breaks but the blocked file",
  );
  const plain = await open("noart", "&noart=1");
  assert.deepEqual(plain.art.painted, []);
  console.log("PASS: the painted cast loads, falls back per person, and stays off with noart.");
} finally {
  await browser.close();
}
