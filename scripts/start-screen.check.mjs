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
const errors = [],
  results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [name, width, height] of [
    ["desktop", 1280, 800],
    ["phone", 390, 844],
    ["landscape", 844, 390],
    ["small-phone", 320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const launch = page.getByRole("button", { name: "Clock in", exact: true });
    await launch.waitFor();
    await page.waitForFunction(
      () =>
        !document.querySelector(".start-button").disabled &&
        [...document.querySelectorAll(".start-screen img")].every(
          (img) => img.complete && img.naturalWidth,
        ),
    );
    assert.equal(await page.locator(".hud").isVisible(), false, "game HUD is hidden until launch");
    assert.equal(
      await page.getByRole("button", { name: "Jump", exact: true }).isVisible(),
      false,
      "touch pad stays out of the launch screen",
    );
    assert.equal(
      await page.evaluate(() => document.querySelector(".start-screen").scrollWidth > innerWidth),
      false,
      "no launch-screen horizontal overflow",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Start at Full shift", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    if (name !== "small-phone") {
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector(".start-venues").getBoundingClientRect().bottom <= innerHeight,
        ),
        true,
        "all starting points fit the viewport",
      );
    }
    await page.screenshot({ path: resolve(out, `start-${name}.png`) });
    const campus = page.getByRole("button", { name: "Start at Campus", exact: true });
    await campus.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => window.__kiln.mode),
      "title",
      "Enter selects a focused venue without launching it",
    );
    assert.equal(await campus.getAttribute("aria-pressed"), "true");
    await page.locator(".start-help summary").click();
    assert.equal(await page.locator(".start-help-body").isVisible(), true);
    await page.locator(".start-help summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".start-help-body").isVisible(), false);
    assert.equal(
      await page.evaluate(() => window.__kiln.mode),
      "title",
      "help keyboard input does not start a run",
    );
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Unmute", exact: true }).getAttribute("aria-pressed"),
      "true",
    );
    await page.getByRole("button", { name: "Unmute", exact: true }).click();
    await launch.click();
    await page.waitForFunction(() => window.__kiln.mode === "play");
    assert.equal(await page.evaluate(() => window.__kiln.scene), "campus");
    assert.equal(await page.locator(".start-screen").count(), 0);
    assert.equal(await page.locator(".hud").isVisible(), true);
    results.push({ name, width, height, selection: true, help: true, mute: true, launch: true });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [point, scene] of [
    ["Full shift", "lobby"],
    ["Restaurant", "service"],
    ["Campus", "campus"],
    ["Pink pig", "plush"],
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: `Start at ${point}`, exact: true }).click();
    await page.getByRole("button", { name: "Clock in", exact: true }).click();
    await page.waitForFunction(() => window.__kiln.mode === "play");
    assert.equal(await page.evaluate(() => window.__kiln.scene), scene);
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(out, "start-screen-check.json"),
    JSON.stringify({ ok: true, results, errors }, null, 2),
  );
  console.log(
    "PASS: redesigned title on desktop, portrait, landscape and small phone; venue keyboard selection, help, mute, launch and game HUD transition; no page errors.",
  );
} finally {
  await browser.close();
}
