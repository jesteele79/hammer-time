import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const url = checkedUrl(process.argv[2] || "http://127.0.0.1:8080/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(150000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Start at Pink pig", exact: true }).click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__kiln?.mode === "play");
  await page.evaluate(async () => {
    window.__controlsTest.setKeys(["ArrowRight"]);
    while (window.__kiln.x < 100) await new Promise(requestAnimationFrame);
    window.__controlsTest.setKeys([]);
    while (Math.abs(window.__controlsTest.getSpeed()) > 1) await new Promise(requestAnimationFrame);
  });
  await page.waitForFunction(() => window.__kiln.bossState === "windup");
  assert.equal(await page.locator(".boss-hud meter").getAttribute("max"), "12");
  await page.screenshot({ path: resolve(out, "pig-boss.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => {
      const boss = document.querySelector(".boss-hud").getBoundingClientRect();
      const frame = document.querySelector(".game-frame").getBoundingClientRect();
      return (
        boss.left >= frame.left &&
        boss.right <= frame.right &&
        boss.top >= frame.top &&
        boss.bottom <= frame.bottom
      );
    }),
    true,
    "boss health and combo instructions fit the phone playfield",
  );
  await page.screenshot({ path: resolve(out, "pig-boss-phone.png") });
  await page.setViewportSize({ width: 1280, height: 800 });
  const fight = page.evaluate(async () => {
    const start = performance.now();
    let nextFire = 0,
      nextBonk = 0;
    while (
      performance.now() - start < 145000 &&
      window.__kiln.mode !== "win" &&
      window.__kiln.mode !== "over"
    ) {
      const p = window.__kiln,
        now = performance.now(),
        keys = [];
      if (p.mode === "play") {
        if (p.bossState === "defeated" || p.x < 132) keys.push("ArrowRight");
        else if (p.x > 136) keys.push("ArrowLeft");
        else if (p.facing < 0) keys.push("ArrowRight");
        if (now >= nextFire && p.snots < 9 && p.bossX > p.x && p.form === 2) {
          keys.push("KeyF");
          nextFire = now + 1100;
        }
        if (now >= nextBonk && p.bossX - p.x < 34 && p.snots >= 3) {
          keys.push("KeyH");
          nextBonk = now + 590;
        }
      }
      window.__controlsTest.setKeys(keys);
      await new Promise(requestAnimationFrame);
    }
    window.__controlsTest.setKeys([]);
    return {
      mode: window.__kiln.mode,
      hp: window.__kiln.bossHp,
      bonks: window.__kiln.bonks,
      snots: window.__kiln.snots,
    };
  });
  await page.waitForFunction(() => window.__kiln.bossState === "defeated");
  await page.screenshot({ path: resolve(out, "pig-boss-defeated.png") });
  const result = await fight;
  assert.equal(result.mode, "win", JSON.stringify(result));
  assert.ok(result.bonks >= 3 && result.snots >= 3);

  await page.goto(url);
  await page.getByRole("button", { name: "Start at Campus", exact: true }).click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__kiln?.mode === "play");
  await page.evaluate(async () => {
    window.__controlsTest.setKeys(["ArrowRight"]);
    while (window.__kiln.x < 180) await new Promise(requestAnimationFrame);
    window.__controlsTest.setKeys([]);
  });
  await page.waitForFunction(() => window.__kiln.planes > 0);
  const form = await page.evaluate(() => window.__kiln.form);
  await page.evaluate(() => window.__controlsTest.setKeys(["ArrowDown"]));
  await page.waitForFunction(() => window.__kiln.height === 30);
  await page.screenshot({ path: resolve(out, "student-paper-plane.png") });
  await page.waitForTimeout(2000);
  assert.equal(await page.evaluate(() => window.__kiln.form), form, "ducking avoids paper damage");
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(out, "pig-boss-check.json"),
    JSON.stringify({ ok: true, ...result, phoneHud: true, paperDuck: true, errors }, null, 2),
  );
  console.log(
    "PASS: photo-based pig, phone boss HUD, complete multi-snot/multi-bonk fight and exit, student paper duck; no page errors.",
  );
} finally {
  await browser.close();
}
