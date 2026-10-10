import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const url = checkedUrl(process.argv[2] || "http://127.0.0.1:8080/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
const verdict = { ok: false, practice: false, door: false, phones: [], pause: false };
let page;
const mode = () => page.evaluate(() => document.querySelector("main")?.dataset.mode);
const waitMode = (m, timeout = 8000) =>
  page.waitForFunction((want) => document.querySelector("main")?.dataset.mode === want, m, {
    timeout,
  });
const shot = (name) => page.screenshot({ path: resolve(out, name) });
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const side = page.getByRole("button", { name: "Play Hungry Hungry Hammer", exact: true });
  await side.waitFor();
  await page.waitForFunction(
    () => !document.querySelector("button[aria-label='Play Hungry Hungry Hammer']")?.disabled,
  );
  assert.equal(
    await page.evaluate(
      () => document.querySelector(".start-venues").getBoundingClientRect().bottom <= innerHeight,
    ),
    true,
    "venues still fit the viewport",
  );
  await shot("quest-title.png");

  // Practice round from the start screen.
  await side.click();
  await waitMode("card");
  assert.match(await page.locator(".veil").innerText(), /hungry hungry hammer/i);
  await shot("quest-card.png");
  await waitMode("quest");
  assert.equal(await page.evaluate(() => window.__kiln.quest), "hungry");
  assert.match(await page.locator(".hud").innerText(), /the banquet/i);
  await page.waitForTimeout(900);
  await shot("quest-start.png");
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
  }
  await page.keyboard.down("Space");
  await page.waitForTimeout(350);
  await page.keyboard.up("Space");
  await page.waitForTimeout(100);
  await shot("quest-dive.png");
  await page.waitForTimeout(500);
  await page.keyboard.press("h");
  await page.waitForTimeout(160);
  await shot("quest-bonk.png");
  await page.waitForTimeout(400);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(400);
  await shot("quest-duck.png");
  await page.keyboard.up("ArrowDown");

  // Pause freezes the round.
  await page.keyboard.press("Escape");
  await waitMode("pause");
  const frozen = await page.locator(".hud").innerText();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator(".hud").innerText(), frozen, "the quest clock stops");
  await page.keyboard.press("Escape");
  await waitMode("quest");
  verdict.pause = true;

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    assert.equal(await page.locator(".touchbar button").count(), 10);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      "no horizontal overflow",
    );
    await shot(`quest-${viewport.width}.png`);
    verdict.phones.push(`${viewport.width}x${viewport.height}`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  const dev = await page.evaluate(() => Boolean(window.__kilnDev));
  if (dev) {
    await page.evaluate(() => window.__kilnDev.questSkip(70));
    await waitMode("questTally");
    const tally = await page.locator(".veil").innerText();
    assert.match(tally, /COMPED|GOOD TIPPER|SPLIT THE CHECK|WATER ONLY/);
    await shot("quest-tally.png");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await waitMode("title");
    assert.ok(
      Number.isFinite(Number(await page.evaluate(() => localStorage.getItem("hammer-time-best-hungry")))),
      "practice best stored",
    );
    verdict.practice = true;

    // The BUFFET door in a real run.
    await page.getByRole("button", { name: "Clock in", exact: true }).click();
    await waitMode("play");
    const doorX = 115 * 16 + 12;
    await page.evaluate((x) => {
      window.__controlsTest.setKeys([]);
      window.__kilnDev.teleport(x);
    }, doorX);
    await page.waitForTimeout(400);
    await shot("quest-door.png");
    const scoreBefore = Number((await page.locator(".hud div").nth(1).innerText()).replace(/\D/g, ""));
    await page.keyboard.down("ArrowDown");
    await waitMode("card");
    await page.keyboard.up("ArrowDown");
    await waitMode("quest");
    await page.evaluate(() => window.__kilnDev.questSkip(70));
    await waitMode("questTally");
    await page.keyboard.press("Enter");
    await waitMode("play");
    assert.equal(await page.evaluate(() => window.__kiln.spentDoors), 1);
    assert.ok(Math.abs((await page.evaluate(() => window.__kiln.x)) - doorX) < 2, "back at the door");
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(300);
    await page.keyboard.up("ArrowDown");
    assert.equal(await mode(), "play", "a spent door stays shut");
    const scoreAfter = Number((await page.locator(".hud div").nth(1).innerText()).replace(/\D/g, ""));
    assert.ok(scoreAfter >= scoreBefore, "quest score added to the run");
    await shot("quest-door-after.png");
    verdict.door = true;
  }
  assert.deepEqual(errors, []);
  verdict.ok = true;
  writeFileSync(resolve(out, "quest-check.json"), JSON.stringify({ ...verdict, errors }, null, 2));
  console.log(
    `PASS: side quests row, practice card and round, dive, bonk, duck, pause, phones${dev ? ", tally, best score, BUFFET door round trip" : ""}; no page errors.`,
  );
} catch (err) {
  console.error("Quest check failure", errors, await page?.locator("body").innerText());
  await page?.screenshot({ path: resolve(out, "quest-failure.png") });
  throw err;
} finally {
  await browser.close();
}
