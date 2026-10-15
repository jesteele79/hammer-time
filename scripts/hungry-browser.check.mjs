// Hungry Hungry Hammer in the browser (R4): the start screen's card to the round, dives, a charged rob, a bonk, a duck, a
// break, the three screen shapes, the tally with Play again and Start screen and the best kept; Space on a tally carrying
// nothing over; a round with the art missing; the BUFFET door in a shift and what it pays; /?quest=hungry.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/hungry-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const errors = [];
const shot = (page, name) => page.screenshot({ path: resolve(out, name) });
const mode = (page) => page.evaluate(() => window.__next?.run?.mode);
const waitMode = (page, m, timeout = 30000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const fits = async (page, w, h) => {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const bar = document.querySelector(".next-hud__bar-top")?.getBoundingClientRect();
    return { sw: doc.scrollWidth, sh: doc.scrollHeight, frame: window.__next.quest.frame, barBottom: bar?.bottom ?? 0 };
  });
  assert.ok(r.sw <= w && r.sh <= h, `${w}x${h}: no scrolling`);
  const f = r.frame;
  assert.ok(f.x >= 0 && f.x + f.w <= w + 1 && f.y >= r.barBottom - 1 && f.y + f.h <= h + 1, `${w}x${h}: the table in view, under the bar: ${JSON.stringify(f)}`);
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}?next=1&title=1&dev=1`);
  await page.evaluate(() => localStorage.setItem("hammer-time-best-banquet", "0"));
  await page.getByRole("button", { name: "Play Hungry Hungry Hammer" }).click();
  await waitMode(page, "questCard");
  assert.match(await page.locator(".next-veil").innerText(), /Hungry Hungry Hammer/i);
  await shot(page, "hungry-card.png");
  await waitMode(page, "quest");
  assert.match(await page.locator(".next-hud").innerText(), /The Banquet/i);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(350);
  }
  assert.ok((await page.evaluate(() => window.__next.quest.dives)) >= 4, "he dives");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowLeft");
  assert.ok((await page.evaluate(() => window.__next.quest.aim)) > 10, "← swings his line toward the far side");
  // A charged rob of the bellhop's plate.
  await page.evaluate(() => window.__next.dev.quest({ plate: { who: "bellhop", kinds: ["ribeye"] } }));
  await page.evaluate(() => window.__next.dev.quest({ aim: "bellhop" }));
  await page.keyboard.down("Space");
  await page.waitForTimeout(550);
  await shot(page, "hungry-charge.png");
  await page.keyboard.up("Space");
  await page.waitForFunction(() => (window.__next.run.events.hhRob ?? 0) >= 1, null, { timeout: 3000 });
  await page.waitForTimeout(150);
  await shot(page, "hungry-dive.png");
  // The mallet waits for him to be back from the table.
  await page.waitForTimeout(300);
  await page.keyboard.press("h");
  await page.waitForFunction(() => (window.__next.run.events.hhBonk ?? 0) >= 1, null, { timeout: 3000 });
  // He ducks once the swing is through (it runs 0.42 s, the bonk a third of the way in).
  await page.keyboard.down("ArrowDown");
  await page.waitForFunction(() => window.__next.quest.duck === true, null, { timeout: 2000 });
  await shot(page, "hungry-duck.png");
  await page.keyboard.up("ArrowDown");
  // A break freezes the round; a charge held through it neither grows nor fires.
  await page.keyboard.down("Space");
  await page.keyboard.press("Escape");
  await waitMode(page, "pause");
  const t = await page.evaluate(() => window.__next.quest.time);
  const dives = await page.evaluate(() => window.__next.quest.dives);
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.__next.quest.time), t, "the clock stops");
  await page.keyboard.up("Space");
  await page.keyboard.press("Escape");
  await waitMode(page, "quest");
  await page.waitForTimeout(600);
  assert.ok((await page.evaluate(() => window.__next.quest.dives)) <= dives + 1, "nothing fired twice from the break");
  // The window losing focus lets go of the keys: a charge under way goes out as it is, it does not hang coiled.
  await page.keyboard.down("Space");
  await page.waitForTimeout(60);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__next.quest.coiling), false);
  await page.keyboard.up("Space");
  for (const [w, h] of [[1280, 800], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    if (w < 900) assert.equal(await page.locator(".next-touch button").count(), 10, `${w}x${h}: the pad's ten buttons`);
    await fits(page, w, h);
    await shot(page, `hungry-${w}x${h}.png`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  // The tally: practice offers Play again and Start screen, and keeps its best.
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  const tally = await page.locator(".next-veil").innerText();
  assert.match(tally, /COMPED|GOOD TIPPER|SPLIT THE CHECK|WATER ONLY/);
  assert.match(tally, /Play again/i);
  assert.match(tally, /Start screen/i);
  await shot(page, "hungry-tally.png");
  const score = await page.evaluate(() => window.__next.quest.score);
  assert.equal(Number(await page.evaluate(() => localStorage.getItem("hammer-time-best-banquet"))), score, "the best kept");
  // Space on the tally is Play again: a fresh round's card, and no dive in its first second.
  await page.keyboard.down("Space");
  await waitMode(page, "questCard");
  await waitMode(page, "quest");
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.__next.quest.dives), 0, "the key held from the tally fired nothing");
  await page.keyboard.up("Space");
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  await page.getByRole("button", { name: "Start screen" }).click();
  await waitMode(page, "title");
  // A round with the art missing: the stand-ins draw and it plays to its tally.
  await page.goto(`${base}?next=1&title=1&dev=1&noart=1`);
  await page.getByRole("button", { name: "Play Hungry Hungry Hammer" }).click();
  await waitMode(page, "quest");
  await page.waitForTimeout(2500);
  await shot(page, "hungry-noart.png");
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  // The BUFFET door in a shift: the round, Continue with Space, back at the door with what it paid, and the door spent.
  await page.goto(`${base}?next=1&dev=1`);
  await waitMode(page, "play");
  await page.evaluate(() => window.__next.dev.teleport(4600, 0));
  await page.waitForTimeout(400);
  assert.match(await page.locator(".next-hud__hint").innerText(), /BUFFET · Hungry Hungry Hammer/);
  const before = await page.evaluate(() => ({ score: window.__next.run.score, jumps: window.__next.run.events.jump ?? 0 }));
  await page.keyboard.down("ArrowDown");
  await waitMode(page, "questCard");
  await page.keyboard.up("ArrowDown");
  await waitMode(page, "quest");
  await page.evaluate(() => window.__next.dev.quest({ eat: ["coke", "nuts"] }));
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  assert.match(await page.locator(".next-veil").innerText(), /Back to the lobby/i);
  await page.keyboard.down("Space");
  await waitMode(page, "play");
  await page.waitForTimeout(500);
  await page.keyboard.up("Space");
  const after = await page.evaluate(() => ({ x: window.__next.run.x, score: window.__next.run.score, jumps: window.__next.run.events.jump ?? 0, cans: window.__next.run.cans }));
  assert.ok(Math.abs(after.x - 4600) < 2, "back at the door");
  assert.equal(after.jumps, before.jumps, "Space on the tally did not jump");
  assert.ok(after.score > before.score, "the round's score came home");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(400);
  await page.keyboard.up("ArrowDown");
  assert.equal(await mode(page), "play", "the door is spent");
  assert.match(await page.locator(".next-hud__hint").innerText(), /thank you, come again/);
  await shot(page, "hungry-door-after.png");
  // The old link's meaning: straight to the banquet.
  await page.goto(`${base}?quest=hungry`);
  await page.waitForFunction(() => ["questCard", "quest"].includes(window.__next?.run?.mode), null, { timeout: 30000 });
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: practice from the start screen, the dive, the rob, the bonk, the duck, the break, three shapes, the tally and its best, no key carried over, the art missing, the BUFFET door and its payout, /?quest=hungry.");
} finally {
  await browser.close();
}
