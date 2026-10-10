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
const warnings = [];
const verdict = { ok: false, renderer: null, fallback: null, fps: 0, content: false, fit: {}, art: null };
let page;
/** True when the stage shows a real scene, not a flat fill (the renderer reads its own pixels back). */
const hasContent = async () => (await page.evaluate(() => window.__next.sample())) > 12;
const hero = () => page.evaluate(() => window.__next.hero);
const booted = async (url) => {
  await page.goto(url);
  await page.waitForFunction(() => window.__next?.renderer && window.__next?.hero, {}, { timeout: 30000 });
};
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning") warnings.push(m.text());
  });
  await booted(`${base}?next=1`);
  verdict.renderer = await page.evaluate(() => window.__next.renderer);
  await page.waitForTimeout(1500);
  verdict.content = await hasContent();
  assert.ok(verdict.content, "the canvas shows a scene");
  verdict.fps = await page.evaluate(() => window.__next.fps);
  assert.ok(verdict.fps >= 30, `fps ${verdict.fps}`);
  verdict.art = await page.evaluate(() => window.__next.art);
  assert.ok(verdict.art.heads >= 1, "the art registry loaded");
  await page.screenshot({ path: resolve(out, "next-boot.png") });

  const start = (await hero()).x;
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(900);
  let h = await hero();
  assert.equal(h.state, "run", `running: ${h.state}`);
  assert.ok(h.x > start + 200, `moved right: ${start} -> ${h.x}`);
  await page.screenshot({ path: resolve(out, "next-run.png") });
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  h = await hero();
  assert.ok(h.state === "jump" || h.state === "fall", `airborne: ${h.state}`);
  await page.screenshot({ path: resolve(out, "next-jump.png") });
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ShiftLeft");
  await page.waitForTimeout(1000);
  h = await hero();
  assert.equal(h.state, "idle", `settled: ${h.state}`);
  await page.screenshot({ path: resolve(out, "next-idle.png") });

  for (const [w, hgt] of [
    [1000, 750],
    [2560, 1080],
  ]) {
    await page.setViewportSize({ width: w, height: hgt });
    await page.waitForTimeout(400);
    const frac = await page.evaluate(() => window.__next.heroScreenHeight / window.innerHeight);
    verdict.fit[`${w}x${hgt}`] = frac;
    assert.ok(frac >= 0.3 && frac <= 0.33, `hero height fraction at ${w}x${hgt}: ${frac}`);
  }

  await booted(`${base}?next=1&gl=1`);
  verdict.fallback = await page.evaluate(() => window.__next.renderer);
  assert.equal(verdict.fallback, "webgl", "forced WebGL still boots");
  await page.waitForTimeout(800);
  assert.ok(await hasContent(), "WebGL frame shows a scene");

  await booted(`${base}?next=1&noart=1`);
  await page.waitForTimeout(800);
  assert.ok(await hasContent(), "the scene renders with fallback art");
  const fallbacks = warnings.filter((w) => w.includes("art fallback"));
  assert.equal(fallbacks.length, 1, `one art fallback warning: ${JSON.stringify(warnings)}`);
  await page.screenshot({ path: resolve(out, "next-noart.png") });

  assert.deepEqual(errors, []);
  verdict.ok = true;
  writeFileSync(resolve(out, "next-check.json"), JSON.stringify({ ...verdict, errors, warnings }, null, 2));
  console.log(
    `PASS: /?next=1 boots on ${verdict.renderer}, runs, jumps, idles, fits ${JSON.stringify(verdict.fit)}, falls back to webgl, no errors.`,
  );
} catch (err) {
  console.error("Next check failure", errors, await page?.locator("body").innerText());
  await page?.screenshot({ path: resolve(out, "next-failure.png") });
  throw err;
} finally {
  await browser.close();
}
