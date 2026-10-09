import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const url = checkedUrl(process.argv[2] || "http://127.0.0.1:8080/");
const capturePoses = process.argv.includes("--poses");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Clock in" }).waitFor();
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Clock in"),
    );
    return button && !button.disabled;
  });
  await page.screenshot({ path: resolve(out, "game-title.png") });
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.bringToFront();
  await page.waitForFunction(() => document.querySelector("main")?.dataset.mode === "play");
  // Release movement in the same animation frame as reaching the crate, so
  // host/Chrome IPC delays under build load do not overshoot the jump target.
  await page.evaluate(async () => {
    window.__controlsTest.setKeys(["ArrowRight"]);
    while (window.__kiln.x < 96) await new Promise(requestAnimationFrame);
    window.__controlsTest.setKeys([]);
    while (Math.abs(window.__controlsTest.getSpeed()) > 1) await new Promise(requestAnimationFrame);
  });
  const crateX = await page.evaluate(() => window.__kiln.x);
  assert.ok(crateX > 100 && crateX < 128, `Approach should stop below the first crate: ${crateX}`);
  await page.keyboard.press("Space", { delay: 260 });
  await page.waitForTimeout(600);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => document.querySelector(".pepper-state")?.dataset.on === "true",
    {},
    { timeout: 5000 },
  );
  await page.keyboard.up("ArrowRight");
  await page.screenshot({ path: resolve(out, "pepper-check.png") });
  assert.match(await page.locator(".pepper-state").innerText(), /Snot ready/);
  await page.keyboard.press("f");
  await page.waitForTimeout(180);
  await page.screenshot({ path: resolve(out, "game-snot.png") });
  await page.waitForTimeout(650);
  await page.keyboard.press("t");
  await page.waitForTimeout(380);
  await page.screenshot({ path: resolve(out, "game-towel.png") });
  await page.waitForTimeout(700);
  await page.keyboard.press("h");
  await page.waitForTimeout(200);
  await page.screenshot({ path: resolve(out, "game-hammer.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  assert.equal(await page.locator("main").getAttribute("data-mode"), "pause");
  const pausedX = await page.evaluate(() => window.__kiln.x);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowRight");
  assert.equal(await page.evaluate(() => window.__kiln.x), pausedX);
  await page.getByRole("button", { name: "Back to work" }).click();
  await page.screenshot({ path: resolve(out, "gameplay.png") });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    const sizes = await page.locator(".touchbar button").evaluateAll((buttons) =>
      buttons.map((b) => ({
        label: b.getAttribute("aria-label"),
        w: b.getBoundingClientRect().width,
        h: b.getBoundingClientRect().height,
      })),
    );
    assert.equal(sizes.length, 9);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: resolve(out, `game-${viewport.width}.png`) });
  }
  // Optional development-only pose board uses the live renderer and source art.
  if (capturePoses) {
    await page.setViewportSize({ width: 1500, height: 520 });
    await page.evaluate(async () => {
      const { drawHero } = await import("/src/game/hero.ts");
      const urls = {
        idle: "hero-idle-calm.png",
        body: "hero-body.png",
        upper: "hero-upper.png",
        fore: "hero-fore.png",
        reach: "hero-reach.png",
        hand: "hero-hand.png",
        towel: "towel-cloth.webp",
      };
      const assets = {};
      await Promise.all(
        Object.entries(urls).map(async ([key, url]) => {
          const img = new Image();
          img.src = `/${url}`;
          await img.decode();
          assets[key] = img;
        }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = 1500;
      canvas.height = 520;
      canvas.style = "width:1500px;height:520px";
      document.body.replaceChildren(canvas);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#192532";
      ctx.fillRect(0, 0, 1500, 520);
      const states = [
        { label: "Walk", moving: true, phase: 0.18 },
        { label: "Wind-up", swing: 0.32 },
        { label: "Strike", swing: 0.19 },
        { label: "Brow wipe", wipe: 0.5 },
        { label: "Snot rocket", snot: 0.24 },
      ];
      states.forEach((state, i) => {
        ctx.save();
        ctx.translate(i * 300 + 145, 450);
        ctx.scale(8, 8);
        drawHero(ctx, assets, {
          x: 0,
          foot: 0,
          facing: 1,
          phase: 0,
          moving: false,
          air: false,
          landing: 0,
          swing: 0,
          mega: 0,
          wipe: 0,
          snot: 0,
          heat: 75,
          hurt: 0,
          star: 0,
          reduced: false,
          clock: 1,
          ...state,
        });
        ctx.restore();
        ctx.fillStyle = "#ead8b4";
        ctx.font = "bold 18px Segoe UI";
        ctx.fillText(state.label, i * 300 + 100, 490);
      });
    });
    await page.screenshot({ path: resolve(out, "character-poses.png") });
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(out, "game-interactions.json"),
    JSON.stringify(
      {
        ok: true,
        pepper: true,
        snot: true,
        towel: true,
        hammer: true,
        pause: true,
        touchButtons: 9,
        viewports: ["1280x800", "390x844", "844x390"],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: pepper, snot, towel, hammer, pause, 9 touch controls, portrait and landscape; no page errors.",
  );
} catch (err) {
  console.error("Browser check failure", errors, await page?.locator("body").innerText());
  await page?.screenshot({ path: resolve(out, "interaction-failure.png") });
  throw err;
} finally {
  await browser.close();
}
