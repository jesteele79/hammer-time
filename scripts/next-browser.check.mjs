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
const verdict = { ok: false, renderer: null, fallback: null, fps: 0, content: false };
let page;
/** True when the stage shows more than a flat fill (the renderer reads its own pixels back). */
const hasContent = async () => (await page.evaluate(() => window.__next.sample())) > 1;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1`);
  await page.waitForFunction(() => window.__next?.renderer, {}, { timeout: 20000 });
  verdict.renderer = await page.evaluate(() => window.__next.renderer);
  await page.waitForTimeout(1500);
  verdict.content = await hasContent();
  assert.ok(verdict.content, "the canvas shows content");
  verdict.fps = await page.evaluate(() => window.__next.fps);
  assert.ok(verdict.fps >= 30, `fps ${verdict.fps}`);
  await page.screenshot({ path: resolve(out, "next-boot.png") });
  await page.goto(`${base}?next=1&gl=1`);
  await page.waitForFunction(() => window.__next?.renderer, {}, { timeout: 20000 });
  verdict.fallback = await page.evaluate(() => window.__next.renderer);
  assert.equal(verdict.fallback, "webgl", "forced WebGL still boots");
  await page.waitForTimeout(800);
  assert.ok(await hasContent(), "WebGL frame shows content");
  assert.deepEqual(errors, []);
  verdict.ok = true;
  writeFileSync(resolve(out, "next-check.json"), JSON.stringify({ ...verdict, errors }, null, 2));
  console.log(
    `PASS: /?next=1 boots on ${verdict.renderer}, falls back to webgl, draws, ${verdict.fps} fps, no errors.`,
  );
} catch (err) {
  console.error("Next check failure", errors, await page?.locator("body").innerText());
  await page?.screenshot({ path: resolve(out, "next-failure.png") });
  throw err;
} finally {
  await browser.close();
}
