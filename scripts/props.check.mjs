import { chromium } from "playwright";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";
const url = checkedUrl(process.argv[2] || "http://127.0.0.1:8080/");
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__kiln?.mode === "play");
  // First supply, then a real route through the front desk and floor gap.
  await page.evaluate(async () => {
    window.__controlsTest.setKeys(["ArrowRight"]);
    while (window.__kiln.x < 96) await new Promise(requestAnimationFrame);
    window.__controlsTest.setKeys([]);
    while (Math.abs(window.__controlsTest.getSpeed()) > 1) await new Promise(requestAnimationFrame);
  });
  await page.keyboard.press("Space", { delay: 260 });
  await page.waitForTimeout(600);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__kiln.form === 2);
  await page.keyboard.up("ArrowRight");
  for (const [target, name] of [
    [450, "counter"],
    [792, "tunnel"],
    [1080, "shelves"],
  ]) {
    await page.evaluate(async (target) => {
      const start = performance.now();
      let nextFire = 0,
        lastJump = 0,
        wasGround = false,
        jumping = false;
      while (window.__kiln.x < target && performance.now() - start < 20000) {
        const p = window.__kiln,
          now = performance.now(),
          keys = ["ArrowRight", "ShiftLeft"];
        if (now > nextFire) {
          keys.push("KeyF");
          nextFire = now + 1100;
        }
        const landed = p.onGround && !wasGround;
        if (landed) jumping = false;
        if (
          p.onGround &&
          !landed &&
          ((p.x > 330 && p.x < 465) || (p.x > 535 && p.x < 580)) &&
          now - lastJump > 250
        ) {
          jumping = true;
          lastJump = now;
        }
        if (jumping) keys.push("Space");
        wasGround = p.onGround;
        if (p.x > 720 && p.x < 836) keys.push("ArrowDown");
        window.__controlsTest.setKeys(keys);
        await new Promise(requestAnimationFrame);
      }
      window.__controlsTest.setKeys(pEnd(target));
      function pEnd(target) {
        return target < 836 && target > 720 ? ["ArrowDown"] : [];
      }
      const brakeStart = performance.now();
      while (
        Math.abs(window.__controlsTest.getSpeed()) > 1 &&
        performance.now() - brakeStart < 2000
      )
        await new Promise(requestAnimationFrame);
    }, target);
    assert.ok(
      await page.evaluate((target) => window.__kiln.x >= target, target),
      name + " can be reached through controls",
    );
    await page.screenshot({ path: resolve("artifacts", `props-${name}.png`) });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real route through counter, floor gap, crouch tunnel and shelf section; no page errors.",
  );
} finally {
  await browser.close();
}
