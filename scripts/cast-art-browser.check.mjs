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
/**
 * Opens the game with `query` and returns the cast's art and the page's errors. `block` aborts the matching
 * requests; `body` answers them with that text instead. `then` plays on with the page before it closes.
 */
async function open(name, query, block = null, { body = null, then = null } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if (block) await page.route(block, (r) => (body === null ? r.abort() : r.fulfill({ status: 200, contentType: "application/json", body })));
  await page.goto(`${base}?next=1&dev=1${query}`);
  await page.waitForFunction(() => window.__next?.castArt && window.__next?.run?.mode === "play", {}, { timeout: 30000 });
  await page.evaluate(() => window.__next.dev.teleport(900, 0));
  await page.waitForTimeout(800);
  const art = await page.evaluate(() => window.__next.castArt);
  await page.screenshot({ path: resolve("artifacts", `cast-art-${name}.png`) });
  if (then) await then(page);
  await page.close();
  return { art, errors };
}
/** Down at a door, held long enough to take it, and the level it leads to. */
const door = async (page, level) => {
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowDown");
  await page.waitForFunction((l) => window.__next.run.level === l, level, { timeout: 2000 });
};
try {
  // The stash empties the lobby's cast and the way back rebuilds it: the figures it leaves are let go, not kept.
  const painted = await open("painted", "", null, {
    then: async (page) => {
      await page.evaluate(() => window.__next.dev.teleport(9700, 0));
      await page.waitForTimeout(250);
      await door(page, "stash");
      await page.waitForTimeout(300);
      await page.evaluate(() => window.__next.dev.teleport(320, 0));
      await page.waitForTimeout(250);
      await door(page, "lobby");
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({ live: window.__next.castArt.live, cast: Object.keys(window.__next.cast.acts).length }));
      assert.equal(after.live, after.cast, `after the stash, ${after.live} painted figures are kept for ${after.cast} people`);
    },
  });
  assert.ok(painted.art.painted.includes("bellhop-1"), `bellhop-1 painted: ${JSON.stringify(painted.art)}`);
  assert.equal(painted.art.tints.flyers, painted.art.tints.cast, "a hat knocked off is lit like the head it came off");
  assert.deepEqual(painted.errors, []);
  // A hat that does not load leaves the bellhops painted, bareheaded.
  const noHat = await open("no-hat", "", "**/art/cast/*-hat*.png");
  assert.ok(noHat.art.painted.includes("bellhop-1") && noHat.art.painted.includes("bellhop-2"), JSON.stringify(noHat.art));
  // A layer's texture that does not load, and a rig that is not JSON: that person is the stand-in, the game plays on.
  const noTorso = await open("no-torso", "", "**/art/cast/bellhop-1-torso.png");
  assert.ok(noTorso.art.standIn.includes("bellhop-1") && noTorso.art.painted.includes("server-1"), JSON.stringify(noTorso.art));
  assert.deepEqual(noTorso.errors.filter((e) => !/Failed to load resource|ERR_FAILED|bellhop-1-torso/.test(e)), [], "nothing breaks but the blocked texture");
  const broken = await open("broken-rig", "", "**/art/cast/bellhop-1-rig.json", { body: "{" });
  assert.ok(broken.art.standIn.includes("bellhop-1") && broken.art.painted.includes("server-1"), JSON.stringify(broken.art));
  assert.deepEqual(broken.errors, []);
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
