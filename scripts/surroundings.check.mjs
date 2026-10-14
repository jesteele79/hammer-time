import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

// The shipped game lives at ?classic=1 since `/` opened the new one (R3b); the base argument is unchanged.
const url = (() => {
  const u = new URL(checkedUrl(process.argv[2] || "http://127.0.0.1:8080/"));
  u.searchParams.set("classic", "1");
  return u.href;
})();
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
});
const errors = [],
  results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [venue, scene, target] of [
    [0, "lobby", 155],
    [1, "service", 130],
    [2, "campus", 211],
  ]) {
    await page.goto(url);
    await page
      .getByRole("button", {
        name: `Start at ${["Full shift", "Restaurant", "Campus"][venue]}`,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Clock in" }).click();
    await page.waitForFunction(() => window.__kiln?.mode === "play");
    await page.evaluate(async (target) => {
      window.__controlsTest.setKeys(["ArrowRight"]);
      while (window.__kiln.x < target) await new Promise(requestAnimationFrame);
      window.__controlsTest.setKeys([]);
      while (Math.abs(window.__controlsTest.getSpeed()) > 1)
        await new Promise(requestAnimationFrame);
    }, target);
    assert.equal(await page.evaluate(() => window.__kiln.scene), scene);
    await page.screenshot({ path: resolve(out, `surroundings-${scene}.png`) });
    if (scene === "campus") {
      // The written opener, or the student recording that played instead.
      assert.match(
        await page.locator("body").innerText(),
        /Hammer: (Read the syllabus, rookie\.|They got a problem\.|Go grow some man balls\.)/,
      );
    }
    if (scene === "lobby") {
      await page.keyboard.down("ArrowDown");
      await page.waitForFunction(() => window.__kiln.height === 30);
      await page.screenshot({ path: resolve(out, "surroundings-crouch.png") });
      await page.keyboard.up("ArrowDown");
      await page.waitForFunction(() => window.__kiln.height === 46);
      assert.equal(await page.evaluate(() => window.__kiln.stance), "standing");
    }
    results.push({ scene, picker: true, rendered: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.getByRole("button", { name: "Clock in" }).waitFor();
  await page.waitForFunction(() => !document.querySelector(".start-button")?.disabled);
  const dockFits = () => {
    const dock = document.querySelector(".start-venues").getBoundingClientRect();
    const frame = document.querySelector(".start-screen").getBoundingClientRect();
    return (
      dock.top >= frame.top &&
      dock.bottom <= frame.bottom &&
      dock.left >= frame.left &&
      dock.right <= frame.right
    );
  };
  assert.equal(await page.evaluate(dockFits), true, "portrait starting points fit the viewport");
  await page.screenshot({ path: resolve(out, "surroundings-phone-title.png") });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole("button", { name: "Start at Campus", exact: true }).click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__kiln?.mode === "play");
  await page.screenshot({ path: resolve(out, "surroundings-phone.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector(".start-button")?.disabled);
  assert.equal(await page.evaluate(dockFits), true, "landscape starting points fit the viewport");
  await page.screenshot({ path: resolve(out, "surroundings-landscape-title.png") });
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(out, "surroundings-check.json"),
    JSON.stringify(
      { ok: true, results, crouch: true, studentBanter: true, pageErrors: errors },
      null,
      2,
    ),
  );
  console.log(
    "PASS: three venue selectors and scenes, crouch/stand, student banter, mobile layout; no page errors.",
  );
} finally {
  await browser.close();
}
