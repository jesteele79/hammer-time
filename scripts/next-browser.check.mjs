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
const verdict = { ok: false, renderer: null, fallback: null, fps: 0, content: false, fit: {}, art: null, hud: {} };
let page;
/** True when the stage shows a real scene, not a flat fill (the renderer reads its own pixels back). */
const hasContent = async () => (await page.evaluate(() => window.__next.sample())) > 12;
const hero = () => page.evaluate(() => window.__next.hero);
const hitBox = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** The touch pad: ten buttons on the screen, none over his face, and Jump makes him jump. */
const touchWorks = async (name) => {
  await page.waitForSelector(".next-touch", { timeout: 5000 });
  const r = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll(".next-touch button")].map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, label: b.getAttribute("aria-label") };
    }),
    face: window.__next.faceScreen,
    vw: innerWidth,
    vh: innerHeight,
  }));
  assert.equal(r.buttons.length, 10, `${name}: ten touch buttons`);
  for (const b of r.buttons) {
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= r.vw && b.y + b.h <= r.vh, `${name}: ${b.label} on screen ${JSON.stringify(b)}`);
    assert.ok(!hitBox(b, r.face), `${name}: ${b.label} covers his face`);
    assert.ok(b.h >= 40 && b.w >= 40, `${name}: ${b.label} big enough to tap ${JSON.stringify(b)}`);
  }
  const jump = page.locator('.next-touch button[aria-label="Jump"]');
  await jump.dispatchEvent("pointerdown", { pointerId: 7, isPrimary: true, button: 0 });
  await page.waitForFunction(() => window.__next.hero.state === "jump", {}, { timeout: 2000 });
  await jump.dispatchEvent("pointerup", { pointerId: 7, isPrimary: true, button: 0 });
};
/** The pause button brings the break card, clear of his face; Back to work takes it away. */
const pauseWorks = async (name) => {
  await page.click(".next-hud__button[aria-label='Pause']");
  await page.waitForSelector(".next-veil__card", { timeout: 2000 });
  const r = await page.evaluate(() => {
    const b = document.querySelector(".next-veil__card").getBoundingClientRect();
    return { card: { x: b.x, y: b.y, w: b.width, h: b.height }, face: window.__next.faceScreen, mode: window.__next.run.mode, title: document.querySelector(".next-veil__title").textContent };
  });
  assert.equal(r.mode, "pause");
  assert.equal(r.title, "On break");
  assert.ok(!hitBox(r.card, r.face), `${name}: the break card covers his face ${JSON.stringify(r)}`);
  await page.screenshot({ path: resolve(out, `veil-pause-${name}.png`) });
  await page.click("text=Back to work");
  await page.waitForFunction(() => window.__next.run.mode === "play", {}, { timeout: 2000 });
};
/** The HUD fits the screen without sideways scrolling and never covers his face; a screenshot per size. */
const hudFits = async (name) => {
  await page.waitForSelector(".next-hud__panel", { timeout: 5000 });
  const r = await page.evaluate(() => {
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    return {
      panel: box(document.querySelector(".next-hud__panel")),
      bar: box(document.querySelector(".next-hud__bar-top")),
      hint: box(document.querySelector(".next-hud__hint")),
      face: window.__next.faceScreen,
      vw: innerWidth,
      vh: innerHeight,
      scroll: document.documentElement.scrollWidth,
    };
  });
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  assert.ok(r.scroll <= r.vw, `${name}: no horizontal overflow (${r.scroll} > ${r.vw})`);
  assert.ok(!hit(r.bar, r.panel), `${name}: the run bar and the panel overlap ${JSON.stringify(r.bar)} ${JSON.stringify(r.panel)}`);
  for (const k of ["panel", "bar", "hint"]) {
    const b = r[k];
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= r.vw && b.y + b.h <= r.vh, `${name}: the ${k} is on screen ${JSON.stringify(b)}`);
    assert.ok(!hit(b, r.face), `${name}: the ${k} covers his face ${JSON.stringify(b)} ${JSON.stringify(r.face)}`);
  }
  verdict.hud[name] = { panel: r.panel, bar: r.bar, hint: r.hint };
  await page.screenshot({ path: resolve(out, `hud-${name}.png`) });
};
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
  // The shipped game's address stays what it was: no flags leak into it.
  await page.goto(base);
  await page.waitForLoadState("networkidle");
  assert.equal(new URL(page.url()).search, "", `the plain address keeps no search: ${page.url()}`);

  await booted(`${base}?next=1`);
  verdict.renderer = await page.evaluate(() => window.__next.renderer);
  await page.waitForTimeout(1500);
  verdict.content = await hasContent();
  assert.ok(verdict.content, "the canvas shows a scene");
  verdict.fps = await page.evaluate(() => window.__next.fps);
  assert.ok(verdict.fps >= 30, `fps ${verdict.fps}`);
  verdict.art = await page.evaluate(() => window.__next.art);
  assert.ok(verdict.art.heads >= 1, "the art registry loaded");
  // Nothing above the head sprite colors it: the owner's plate reaches the screen as drawn.
  assert.equal(await page.evaluate(() => window.__next.headTintChain), 0xffffff, "the head plate is untinted");
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
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(400);
  await hudFits("1280x800");
  assert.equal(await page.locator(".next-touch").count(), 0, "no touch pad with a mouse on a wide screen");
  await pauseWorks("1280x800");
  // A phone in portrait: he runs and stays on the screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1200);
  const portrait = await page.evaluate(() => ({ x: window.__next.heroScreenX, w: window.innerWidth }));
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ShiftLeft");
  verdict.fit["390x844"] = portrait.x / portrait.w;
  assert.ok(portrait.x > 40 && portrait.x < portrait.w - 40, `on screen in portrait: ${portrait.x} of ${portrait.w}`);
  await page.screenshot({ path: resolve(out, "next-portrait.png") });
  await hudFits("390x844");
  await touchWorks("390x844");
  await pauseWorks("390x844");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  await hudFits("844x390");
  await touchWorks("844x390");
  await pauseWorks("844x390");
  await page.waitForTimeout(600);

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
