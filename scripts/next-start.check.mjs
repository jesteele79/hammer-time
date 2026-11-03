// The start screen at `/?next=1&title=1`: it fits a laptop, a phone upright and a phone on its side without scrolling or
// anything off the screen; the journey strip runs along the bottom (finished, next and locked stops under their acts),
// the wheel and the arrows move it, Clock in starts the next stop (once, even when chosen while the game still loads), a
// finished stop replays to its own exit card, Act 1's header offers Work the whole shift once Act 1 is finished, a double
// click starts a stop once, "Start screen" and Journey come back to it, the quality choice is kept, and the side quests
// open on the same page with no errors.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/next-start.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const url = `${base}?next=1&title=1&dev=1`;
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const errors = [];
const fits = async (page, w, h) => {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement;
    // The strip scrolls inside itself: its stops may sit past its edges, the strip itself may not.
    const boxes = [...document.querySelectorAll(".next-start button, .next-start a, .next-start select, .next-start h1, .next-strip")]
      .filter((e) => !e.closest(".next-strip") || e.classList.contains("next-strip"))
      .map((e) => e.getBoundingClientRect());
    // Clock in clear of the strip: a start screen too tall for the phone squeezes the hero until its button rides over it.
    const go = document.querySelector(".next-start__go").getBoundingClientRect();
    const over = [...document.querySelectorAll(".next-strip, .next-start__quest")].map((e) => e.getBoundingClientRect()).filter((b) => go.left < b.right && go.right > b.left && go.top < b.bottom && go.bottom > b.top).length;
    return { sw: doc.scrollWidth, sh: doc.scrollHeight, out: boxes.filter((b) => b.left < 0 || b.top < 0 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5).length, over };
  });
  assert.ok(r.sw <= w && r.sh <= h, `${w}x${h}: no scrolling (${r.sw}x${r.sh})`);
  assert.equal(r.out, 0, `${w}x${h}: everything on the screen`);
  assert.equal(r.over, 0, `${w}x${h}: Clock in over the strip`);
};
const stops = (page) => page.locator(".next-strip__stop").evaluateAll((els) => els.map((e) => ({ code: e.querySelector(".next-strip__code")?.textContent, state: e.dataset.state, img: !!e.querySelector("img"), lock: !!e.querySelector(".next-strip__lock"), disabled: e.disabled })));
const stop = (page, code) => page.locator(".next-strip__stop", { has: page.locator(".next-strip__code", { hasText: new RegExp(`^${code}$`) }) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  // Clocked in at once, while the game still loads: the next stop starts once it is ready, and only once: SAT, behind the
  // email.
  await page.goto(url);
  await page.getByRole("button", { name: /Clock in|Getting Hammer ready/ }).click();
  await page.waitForFunction(() => window.__next?.run?.mode === "story");
  assert.equal(await page.evaluate(() => window.__next.run.level), "sat", "the journey's true start");
  assert.equal(await page.evaluate(() => window.__next.starts), 1, "the start chosen while it loaded began once");
  for (const [w, h] of [[1280, 800], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(url);
    await page.waitForSelector(".next-strip__stop");
    await page.waitForFunction(() => window.__next?.run?.mode === "title");
    await page.waitForTimeout(300);
    await fits(page, w, h);
    // The Side quests row holds both rounds (R5 §11), each card whole on the screen.
    assert.deepEqual(await page.locator(".next-start__quest").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))), ["Play Hungry Hungry Hammer", "Play Fare Darts"], `${w}x${h}: both side quests`);
    // The next stop is on the screen, centered in the strip on arrival.
    const next = await page.evaluate(() => {
      const b = document.querySelector(".next-strip__stop[data-state='next']").getBoundingClientRect();
      const n = document.querySelector(".next-strip").getBoundingClientRect();
      return { left: b.left, right: b.right, nl: n.left, nr: n.right };
    });
    assert.ok(next.left >= next.nl - 1 && next.right <= next.nr + 1, `${w}x${h}: the next stop in view ${JSON.stringify(next)}`);
    await page.screenshot({ path: resolve(out, `start-${w}x${h}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url);
  await page.waitForFunction(() => window.__next?.run?.mode === "title");
  assert.equal(await page.evaluate(() => window.__next.drawing), true, "the scene is live under the start screen");
  // The strip of a fresh journey: fifteen stops under five headers; SAT next with its picture, the rest locked: no
  // picture, a lock.
  const s = await stops(page);
  assert.equal(s.length, 15, "fifteen stops");
  assert.deepEqual(await page.locator(".next-strip__act h3").allTextContents(), ["Prologue", "Act 1 · The Trip", "Act 2 · Status Crusade", "Act 3 · The Last Tour", "Epilogue"]);
  assert.equal(s.find((x) => x.code === "SAT").state, "next", "SAT is next");
  assert.ok(s.find((x) => x.code === "SAT").img, "the next stop shows its picture");
  for (const x of s.slice(1)) assert.deepEqual([x.state, x.img, x.lock, x.disabled], ["locked", false, true, true], `${x.code}: locked, no picture, a lock`);
  assert.match(await page.locator(".next-start__eyebrow").innerText(), /Three acts\. Zero patience\./i);
  assert.match(await page.locator(".next-start__tagline").innerText(), /Bonk the staff\. Dodge the paper\.\s*Get to Basel\./i);
  assert.match(await page.locator(".next-start__best").innerText(), /Journey best/i);
  // The wheel over the strip scrolls it sideways.
  const box = await page.locator(".next-strip").boundingBox();
  const left0 = await page.locator(".next-strip").evaluate((e) => e.scrollLeft);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(300);
  const left1 = await page.locator(".next-strip").evaluate((e) => e.scrollLeft);
  assert.ok(left1 > left0, `the wheel moves the strip: ${left0} to ${left1}`);
  // The arrows move it while it has the focus.
  await stop(page, "SAT").focus();
  const left2 = await page.locator(".next-strip").evaluate((e) => e.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  assert.notEqual(await page.locator(".next-strip").evaluate((e) => e.scrollLeft), left2, "the arrows move the strip");
  // No HUD or pad under the start screen. Settings opens by mouse and keyboard: the sliders write hammer-time-sound, Sound
  // off sets both to 0 and Sound on brings them back, the quality is inside it, the keys are listed, Escape and Done
  // close it; none clocks in.
  assert.equal(await page.locator(".next-hud, .next-touch").count(), 0, "no HUD or touch pad on the start screen");
  const soundSaved = () => page.evaluate(() => JSON.parse(localStorage.getItem("hammer-time-sound") ?? "null"));
  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.waitFor();
  assert.ok((await settings.locator(".next-hud__key").count()) >= 10, "the keys are listed");
  assert.match(await settings.innerText(), /Controller: none/);
  const music = settings.locator("input[type=range]").first();
  await music.fill("0");
  assert.deepEqual(await soundSaved(), { music: 0, effects: 80, muted: false }, "the music slider at 0");
  await music.fill("100");
  assert.equal((await soundSaved()).music, 100, "the music slider at 100");
  await settings.getByRole("button", { name: "Sound off" }).click();
  assert.deepEqual(await soundSaved(), { music: 0, effects: 0, muted: false }, "Sound off is both at 0");
  await settings.getByRole("button", { name: "Sound on" }).click();
  assert.deepEqual(await soundSaved(), { music: 80, effects: 80, muted: false }, "and Sound on brings both back");
  // The keyboard drives it: the arrows move through the quality list.
  await settings.locator(".next-settings__quality select").focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await settings.locator(".next-settings__quality select").inputValue(), "high");
  await settings.locator(".next-settings__quality select").selectOption("auto");
  await page.keyboard.press("Escape");
  await settings.waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Settings" }).focus();
  await page.keyboard.press("Enter");
  await settings.waitFor();
  await settings.getByRole("button", { name: "Done" }).click();
  await settings.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => window.__next.run.mode), "title", "nothing clocked in");
  // Space presses Clock in.
  await page.getByRole("button", { name: "Clock in" }).focus();
  await page.keyboard.press("Space");
  // SAT's email shows again: the first Clock in stopped at it, before any snapshot was saved.
  await page.waitForFunction(() => ["story", "card", "play"].includes(window.__next.run.mode));
  assert.equal(await page.evaluate(() => window.__next.drawing), true);

  // Every built stop open for the page (`&journey=all`): finished, gold, their pictures, totals of nothing yet, and Act 1's
  // header offers Work the whole shift.
  const all = `${url}&journey=all`;
  await page.evaluate(() => localStorage.setItem("hammer-time-best-next", "0"));
  await page.goto(all);
  await page.waitForFunction(() => window.__next?.run?.mode === "title");
  const open = await stops(page);
  for (const code of ["1-1", "1-2", "1-3", "1-4"]) assert.deepEqual([open.find((x) => x.code === code).state, open.find((x) => x.code === code).img], ["done", true], `${code} finished`);
  assert.equal(open.find((x) => x.code === "2-1").state, "next", "2-1 next");
  assert.deepEqual(await page.locator(".next-strip__act b").allTextContents(), ["000000", "000000", "000000", "000000", "000000"], "no bests yet");
  assert.equal(await page.getByRole("button", { name: "Clock in" }).count(), 0, "Clock in gives way to the notice");
  assert.ok(await page.getByRole("button", { name: "Act 2 is coming" }).isDisabled(), "Act 2 is coming");
  await page.getByRole("button", { name: /Work the whole shift/ }).click();
  await page.waitForFunction(() => window.__next.run.mode === "card");
  assert.match(await page.locator(".next-veil__card").textContent(), /Your shift starts here/);
  assert.match(await page.locator(".next-hud__mode").textContent(), /World 1-1/);
  await page.waitForFunction(() => window.__next.run.mode === "play");
  assert.deepEqual(await page.evaluate(() => [window.__next.run.level, window.__next.run.lives, window.__next.run.patience, window.__next.run.hot]), ["lobby", 3, 2, false], "the whole shift, fresh");

  // A double click on a finished stop starts it once, fresh.
  await page.goto(all);
  await page.waitForFunction(() => window.__next?.run?.mode === "title");
  await stop(page, "1-3").dblclick();
  await page.waitForFunction(() => window.__next.run.mode === "play");
  assert.deepEqual(await page.evaluate(() => [window.__next.run.level, window.__next.starts, window.__next.run.score, window.__next.run.lives]), ["campus", 1, 0, 3], "1-3 once, fresh");

  // A finished 1-4 replayed: chosen by a click, Clock in; the pig down, CLOCK OUT ends on its own exit card; Journey goes
  // home; the whole shift's best is not touched.
  await page.goto(all);
  await page.waitForFunction(() => window.__next?.run?.mode === "title");
  await stop(page, "1-4").click();
  assert.equal(await stop(page, "1-4").getAttribute("aria-pressed"), "true", "a click chooses it");
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "play");
  assert.equal(await page.evaluate(() => window.__next.run.level), "arena");
  await page.evaluate(() => window.__next.dev.pig({ state: "defeated" }));
  await page.evaluate(() => window.__next.dev.teleport(3950, 0));
  // The arrow stays held through the card and back to the start screen, and is let go there.
  await page.keyboard.down("ArrowRight");
  await page.getByRole("heading", { name: "Clocked out" }).waitFor({ timeout: 20000 });
  assert.match(await page.locator(".next-veil__card").textContent(), /1-4/);
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-best-next")), "0", "a replay keeps no whole-shift best");
  await page.screenshot({ path: resolve(out, "start-replay-over.png") });
  await page.getByRole("button", { name: "Journey" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "title");
  await page.keyboard.up("ArrowRight");
  // The quality choice is kept on the device.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator(".next-settings__quality select").selectOption("low");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-quality")), "low");
  await page.waitForFunction(() => window.__next.quality === "low", null, { timeout: 3000 });
  await page.locator(".next-settings__quality select").selectOption("auto");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-quality")), null);
  await page.getByRole("button", { name: "Done" }).click();
  // Auto starts at high and picks ultra once the governor has settled, on this laptop's card.
  await page.waitForFunction(() => window.__next.quality === "ultra", null, { timeout: 8000 });
  // A key let go on the start screen is let go: the next start does not set off walking on its own.
  await stop(page, "1-2").click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "play");
  const x0 = await page.evaluate(() => window.__next.hero.x);
  await page.waitForTimeout(1000);
  assert.ok(Math.abs((await page.evaluate(() => window.__next.hero.x)) - x0) < 1, "he stands where the stop starts");
  // The side quest, clicked while the game still loads: the banquet opens on this page once it is ready, and nothing errs.
  await page.goto(url);
  await page.getByRole("button", { name: "Play Hungry Hungry Hammer" }).click();
  await page.waitForFunction(() => window.__next?.run?.mode === "questCard" || window.__next?.run?.mode === "quest");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(out, "start-hungry.png") });
  // Fare Darts, clicked while the game still loads: its card on this page once it is ready (R5 §11).
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem("hammer-time-best-next", "0");
    localStorage.removeItem("hammer-time-best-fares");
  });
  await page.getByRole("button", { name: "Play Fare Darts" }).click();
  await page.waitForFunction(() => window.__next?.run?.mode === "questCard" || window.__next?.run?.mode === "quest");
  if ((await page.evaluate(() => window.__next.run.mode)) === "questCard") await page.locator(".next-veil__title", { hasText: "Fare Darts" }).waitFor();
  await page.waitForFunction(() => window.__next?.run?.mode === "quest" && window.__next.quest?.id === "fares");
  assert.match(await page.locator(".next-hud__venue").innerText(), /Fare Darts/i);
  await page.screenshot({ path: resolve(out, "start-fares.png") });
  // A booking, then the rest of the tray: the tally keeps its best apart from the shift's.
  await page.evaluate(() => window.__next.dev.fares({ calm: true, tag: { city: "AUS" }, pin: "AUS" }));
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__next.quest.booked === 1);
  await page.evaluate(() => window.__next.dev.questSkip());
  await page.waitForFunction(() => window.__next.run.mode === "questTally");
  const fares = await page.evaluate(() => window.__next.quest.score);
  assert.ok(fares > 0, "a booking scored");
  await page.getByRole("button", { name: "Play again" }).waitFor();
  assert.ok(await page.getByRole("button", { name: "Start screen" }).isVisible(), "practice's tally offers the start screen");
  assert.equal(Number(await page.evaluate(() => localStorage.getItem("hammer-time-best-fares"))), fares, "the gate's best kept");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-best-next")), "0", "the shift's best untouched");
  await page.screenshot({ path: resolve(out, "start-fares-tally.png") });
  // New game asks first: Keep leaves the journey; Erase starts it over at SAT and leaves the side quests' bests alone.
  await page.goto(url);
  await page.evaluate(() => {
    const j = JSON.parse(localStorage.getItem("hammer-time-journey") ?? "null") ?? {};
    localStorage.setItem("hammer-time-journey", JSON.stringify({ ...j, v: 1, next: "restaurant", done: ["sat", "lobby"], best: { sat: 900, lobby: 4000 }, bonked: 7, run: null, carry: null, credits: false }));
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__next?.run?.mode === "title");
  const faresBest = await page.evaluate(() => localStorage.getItem("hammer-time-best-fares"));
  // The Service Record: the journey's total and each act's, the lifetime staff bonked, the bests.
  const record = async () => {
    await page.getByRole("button", { name: "Service Record" }).click();
    const card = page.getByRole("dialog", { name: "Service Record" });
    const text = await card.innerText();
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached" });
    return text;
  };
  let seen = await record();
  for (const words of ["Journey total", "Prologue", "Act 1 · The Trip", "Staff bonked", "Whole shift best", "Hungry Hungry Hammer best", "Fare Darts best"]) assert.ok(seen.toLowerCase().includes(words.toLowerCase()), `the record names ${words}: ${seen}`);
  assert.ok(/Staff bonked\s*7/i.test(seen), `seven staff bonked: ${seen}`);
  assert.ok(seen.includes("004900"), `the journey's total, 900 and 4,000: ${seen}`);
  // Every bonk counted once through a replay of 1-1 (six), its Clocked out, Play again, and Hammer down (three more).
  const savedBonked = () => page.evaluate(() => JSON.parse(localStorage.getItem("hammer-time-journey")).bonked);
  await stop(page, "1-1").click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "play");
  await page.evaluate(() => window.__next.dev.bonked(6));
  await page.evaluate(() => window.__next.dev.teleport(15800, 0));
  await page.keyboard.down("ArrowRight");
  await page.getByRole("heading", { name: "Clocked out" }).waitFor({ timeout: 20000 });
  await page.keyboard.up("ArrowRight");
  assert.equal(await savedBonked(), 13, "the replay's six counted at its tally");
  await page.getByRole("button", { name: "Play again" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "play");
  await page.evaluate(() => window.__next.dev.bonked(3));
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => window.__next.run.mode === "play", null, { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__next.dev.patience(1);
      window.__next.dev.hit();
    });
    await page.waitForFunction(() => window.__next.run.mode === "dying" || window.__next.run.mode === "over", null, { timeout: 8000 });
  }
  await page.waitForFunction(() => window.__next.run.mode === "over", null, { timeout: 8000 });
  assert.equal(await savedBonked(), 16, "Hammer down in the second replay adds its three");
  await page.getByRole("button", { name: "Journey" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "title");
  await page.getByRole("button", { name: "New game" }).click();
  const ask = page.getByRole("dialog", { name: "New game" });
  assert.match(await ask.innerText(), /Start over\?[\s\S]*The journey and its bests are erased\./i);
  await ask.getByRole("button", { name: "Keep" }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("hammer-time-journey")).next), "restaurant", "Keep keeps the journey");
  await page.getByRole("button", { name: "New game" }).click();
  await ask.getByRole("button", { name: "Erase" }).click();
  await ask.waitFor({ state: "detached" });
  const fresh = await page.evaluate(() => JSON.parse(localStorage.getItem("hammer-time-journey")));
  assert.deepEqual([fresh.next, fresh.done, fresh.best], ["sat", [], {}], "Erase starts the journey over");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-best-fares")), faresBest, "the gate's best untouched");
  assert.equal((await stops(page)).find((x) => x.code === "SAT").state, "next", "SAT next on the strip");
  seen = await record();
  assert.ok(/Staff bonked\s*16/i.test(seen) && /Journey total\s*000000/i.test(seen), `a new journey keeps the lifetime staff bonked: ${seen}`);
  // /?quest=fares opens the practice round straight from the start screen (R5 §1, decision 16).
  await page.goto(`${base}?dev=1&quest=fares`);
  await page.waitForFunction(() => window.__next?.run?.mode === "quest" && window.__next.quest?.id === "fares");
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: the start screen fits all three sizes; the strip shows finished, next and locked stops under their acts and scrolls by wheel and arrows; Clock in starts once; a replay ends on Clocked out; Work the whole shift from Act 1's header; a double click starts once; the side quests open.");
} finally {
  await browser.close();
}
