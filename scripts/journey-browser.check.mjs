// The journey in the browser (story Phase 1): Clock in on a fresh journey, the venue cards and the cards between levels,
// the save written at every card and exit and read back after a reload, Hammer down with Try again on the snapshot and
// Journey, Act 1's ending (the Bonvoy phone card and the act card) back to the home screen, a replay of a finished stop
// ending on its own exit card without moving the journey, a broken save, every card clear of his face on three shapes.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/journey-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const home = `${base}?dev=1`;
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const errors = [];
let page;
const run = () => page.evaluate(() => window.__next.run);
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("hammer-time-journey") ?? "null"));
const waitFor = async (pred, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await run();
    if (pred(r)) return r;
    await page.waitForTimeout(30);
  }
  return run();
};
const mode = () => page.evaluate(() => window.__next.run.mode);
const waitMode = (m, timeout = 30000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const veil = () => page.locator(".next-veil__card").textContent();
/**
 * From just before a level's exit: walks in and waits for what follows its tally: the next level's card, or a story card
 * (`story`: the hold that shows cards; a hold with none passes on to the next card at once).
 */
const clockOut = async (x, y, story = false) => {
  await tp(x, y);
  await page.waitForTimeout(250);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction((s) => (s ? ["story"] : ["card", "clear", "title"]).includes(window.__next.run.mode), story, { timeout: 20000 });
  await page.keyboard.up("ArrowRight");
  return run();
};
/** A card that holds: on a laptop, an upright phone and a phone on its side it fits, scrolls nothing and keeps off his face. */
const cardFits = async (name) => {
  for (const [w, h] of [[1920, 1080], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const b = document.querySelector(".next-veil__card").getBoundingClientRect();
      return { card: { x: b.x, y: b.y, w: b.width, h: b.height }, face: window.__next.faceScreen, sw: document.scrollingElement.scrollWidth, vw: innerWidth, vh: innerHeight };
    });
    assert.ok(r.sw <= r.vw, `${name} at ${w}x${h}: no sideways scrolling (${r.sw})`);
    assert.ok(r.card.x >= -0.5 && r.card.x + r.card.w <= r.vw + 0.5 && r.card.y >= -0.5 && r.card.y + r.card.h <= r.vh + 0.5, `${name} at ${w}x${h}: the card on the screen ${JSON.stringify(r.card)}`);
    assert.ok(!r.face || !hit(r.card, r.face), `${name} at ${w}x${h}: the card covers his face ${JSON.stringify(r)}`);
    await shot(`journey-${name}-${w}x${h}.png`);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
};
/** One scalpel at a city in the gate's round: a tag put there, the crosshair pinned on it, Space, the stick waited for. */
const throwAt = async (city) => {
  const stuck = await page.evaluate(() => window.__next.quest.stuck);
  await page.evaluate((c) => window.__next.dev.fares({ tag: { city: c }, pin: c }), city);
  await page.keyboard.press("Space");
  await page.waitForFunction((s) => window.__next.quest.stuck > s, stuck, { timeout: 5000 });
};
/** Continue on a story card by the keyboard: its button has the focus, so Enter presses it. */
const enter = async () => {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
};

try {
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // 1. A fresh journey: nothing saved yet; Clock in starts at the true start: the email, then SAT.
  await page.goto(home);
  await page.evaluate(() => localStorage.clear());
  await page.goto(home);
  await waitMode("title");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-journey")), null, "nothing saved before clocking in");

  // 0. The home screen is Hammer, live: the key art gone within two seconds of the scene, an insult as his thought within
  // twelve, the cast standing still, the frame rate held, never more than one bubble, and no more than eight in a minute.
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelector(".next-start[data-live]"), null, { timeout: 15000 });
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".next-start__art")).opacity === "0", null, { timeout: 2000 });
  assert.equal(await page.evaluate(() => window.__next.drawing), true, "the scene draws under the start screen");
  const acts0 = await page.evaluate(() => JSON.stringify(window.__next.cast.acts));
  await page.waitForFunction(() => (window.__next.run.events.think ?? 0) >= 1, null, { timeout: 12000 });
  await page.waitForFunction(() => !!window.__next.moves.bubble, null, { timeout: 2000 });
  await shot("journey-home-insult.png");
  const fps = await page.evaluate(() => window.__next.fps);
  assert.ok(fps >= 55, `the home screen holds its frame rate: ${fps}`);
  while (Date.now() - t0 < 60000) await page.waitForTimeout(1000);
  const thinks = await page.evaluate(() => window.__next.run.events.think ?? 0);
  assert.ok(thinks >= 6 && thinks <= 8, `about one insult every eight seconds: ${thinks} in a minute`);
  assert.equal(await page.evaluate(() => JSON.stringify(window.__next.cast.acts)), acts0, "the cast stands still");
  assert.equal(await mode(), "title", "nothing clocked in");
  // His face and his thought clear of every piece of the menu, on a laptop, a small laptop and a phone both ways up.
  for (const [w, h] of [[1920, 1080], [1280, 720], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(1200);
    // Measured in the same instant a thought shows: one caught at the end of its three seconds is gone a moment later.
    const handle = await page.waitForFunction(() => {
      if (!window.__next.bubbleScreen) return null;
      const shown = (el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).opacity !== "0";
      // The title's lines by their text: the eyebrow's box runs the full width of a phone on its side.
      const extent = (el) => {
        if (!el.matches(".next-start__eyebrow, .next-start__word, .next-start__tagline")) return el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect();
      };
      const blocks = [...document.querySelectorAll(".next-start__top > *, .next-start__eyebrow, .next-start__word, .next-start__tagline, .next-start__go, .next-strip, .next-start__quests")]
        .filter(shown)
        .map((el) => { const b = extent(el); return { cls: el.className, x: b.x, y: b.y, w: b.width, h: b.height }; });
      return { face: window.__next.faceScreen, bubble: window.__next.bubbleScreen, blocks, vw: innerWidth, vh: innerHeight };
    }, null, { timeout: 9000, polling: 50 });
    const r = await handle.jsonValue();
    await shot(`journey-home-${w}x${h}.png`);
    const inside = (b) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= r.vw + 0.5 && b.y + b.h <= r.vh + 0.5;
    assert.ok(inside(r.face) && inside(r.bubble), `at ${w}x${h} his face and his thought on the screen ${JSON.stringify({ face: r.face, bubble: r.bubble })}`);
    for (const b of r.blocks) {
      assert.ok(!hit(r.face, b), `at ${w}x${h} ${b.cls} covers his face ${JSON.stringify({ face: r.face, block: b })}`);
      assert.ok(!hit(r.bubble, b), `at ${w}x${h} ${b.cls} covers his thought ${JSON.stringify({ bubble: r.bubble, block: b })}`);
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("story");
  let text = await veil();
  for (const words of ["Basel office", "Your transition", "Training is moving to video.", "Transition."]) assert.ok(text.includes(words), `the email says ${words}: ${text}`);
  assert.equal((await run()).level, "sat");
  await cardFits("email");
  await enter();
  await waitMode("card");
  text = await veil();
  assert.match(text, /San Antonio International/);
  assert.match(text, /Boarding in 7:00/);
  let s = await save();
  assert.deepEqual([s.next, s.done, !!s.run], ["sat", [], true], `the save at SAT's card: ${JSON.stringify(s)}`);
  // SAT's gate: two bookings, the round's tally, the clock's, "Three hours later", 1-1's card with the boxes carried in.
  await waitMode("play");
  await tp(7650, 0);
  await page.waitForTimeout(250);
  await page.keyboard.down("ArrowRight");
  await waitMode("questCard", 8000);
  await page.keyboard.up("ArrowRight");
  await waitMode("quest", 8000);
  await page.evaluate(() => window.__next.dev.fares({ calm: true }));
  for (let i = 0; i < 2; i++) await throwAt("AUS");
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode("questTally", 8000);
  const boxes = await page.evaluate(() => window.__next.quest.result.boxes);
  assert.ok(boxes > 0, `the gate paid boxes: ${boxes}`);
  await page.waitForTimeout(400);
  await enter();
  await waitMode("story", 20000);
  assert.match(await veil(), /Three hours later. The hotel./);
  s = await save();
  assert.deepEqual([s.next, s.done, s.carry.boxes], ["lobby", ["sat"], boxes], `the save after SAT: ${JSON.stringify(s)}`);
  assert.ok(s.best.sat > 0, "SAT's best");
  await enter();
  await waitMode("card");
  text = await veil();
  assert.match(text, /Hotel lobby/);
  assert.match(text, /Your shift starts here/);
  assert.equal(await page.evaluate(() => window.__next.hero.boxes), boxes, "the gate's boxes carried into 1-1");
  s = await save();
  assert.deepEqual([s.next, s.done, !!s.run], ["lobby", ["sat"], true], `the save at 1-1's card: ${JSON.stringify(s)}`);

  // 2. 1-1 to its exit: no cards after it, so the hold passes straight to 1-2's card; the save moves on.
  await waitMode("play");
  await page.evaluate(() => window.__next.dev.give("pepper"));
  await page.waitForTimeout(300);
  let r = await clockOut(15800, 0);
  assert.deepEqual([r.mode, r.level], ["card", "restaurant"], "1-2's card after 1-1's exit");
  assert.match(await veil(), /Your shift goes on/);
  s = await save();
  assert.deepEqual([s.next, s.done], ["restaurant", ["sat", "lobby"]]);
  assert.ok(s.best.lobby > 0 && s.run.score === r.score, `1-1's best and the run carried: ${JSON.stringify({ best: s.best, run: s.run?.score, score: r.score })}`);
  assert.equal(s.carry.hot, true, "the pepper is carried in the snapshot");
  const saved = s.run.score;

  // 3. A reload: Clock in starts 1-2's card with the saved score.
  await page.goto(home);
  await waitMode("title");
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("card");
  r = await run();
  assert.deepEqual([r.level, r.score, r.hot], ["restaurant", saved, true], "1-2 from the save, its score and the pepper");

  // 4. Hammer down: three lives lost; Try again restores 1-2's card exactly; a key pressed on the card jumps nothing.
  await waitMode("play");
  await page.evaluate(() => window.__next.dev.give("can"));
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) {
    await waitFor((x) => x.mode === "play", 8000);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__next.dev.patience(1);
      window.__next.dev.hit();
    });
    await page.waitForFunction(() => window.__next.run.mode === "dying" || window.__next.run.mode === "over", null, { timeout: 8000 });
  }
  await waitMode("over");
  text = await veil();
  assert.match(text, /Hammer down/);
  assert.ok(await page.getByRole("button", { name: "Try again" }).isVisible(), "Try again");
  assert.ok(await page.getByRole("button", { name: "Journey" }).isVisible(), "Journey");
  assert.equal(await page.getByRole("button", { name: "Start screen" }).count(), 0, "no Start screen in a journey");
  await cardFits("hammer-down");
  await page.getByRole("button", { name: "Try again" }).focus();
  await page.keyboard.press("Enter");
  await waitMode("card");
  r = await run();
  assert.deepEqual([r.level, r.score, r.lives, r.hot], ["restaurant", saved, 3, true], "Try again: the card as it stood");
  const jumps = r.events.jump ?? 0;
  await page.keyboard.press("Space");
  await waitMode("play");
  await page.waitForTimeout(1000);
  assert.equal((await run()).events.jump ?? 0, jumps, "the key pressed on the card jumped nothing");

  // 5. 1-2, 1-3 and 1-4 to Act 1's end: the Bonvoy phone card, the act card, then the home screen.
  r = await clockOut(15600, 0);
  assert.deepEqual([r.mode, r.level], ["card", "campus"]);
  await waitMode("play");
  r = await clockOut(15880, -900);
  assert.deepEqual([r.mode, r.level], ["card", "arena"]);
  await waitMode("play");
  await page.evaluate(() => window.__next.dev.pig({ state: "defeated" }));
  r = await clockOut(3950, 0, true);
  assert.equal(r.mode, "story");
  await page.locator(".next-veil__phone").waitFor();
  text = await veil();
  assert.match(text, /Marriott Bonvoy/);
  assert.match(text, /Your status has been reviewed\./);
  assert.match(text, /Reviewed\./);
  await cardFits("bonvoy");
  await enter();
  await page.locator(".next-veil__act").waitFor();
  text = await veil();
  assert.match(text, /Act 1 · The Trip · complete/);
  s = await save();
  const total = ["lobby", "restaurant", "campus", "arena"].reduce((t, id) => t + (s.best[id] ?? 0), 0);
  assert.ok(total > 0 && text.includes(String(total).padStart(6, "0")), `the act's total on its card: ${total} in ${text}`);
  assert.deepEqual([s.next, s.done, s.run], ["lobby-night", ["sat", "lobby", "restaurant", "campus", "arena"], null], "Act 1 done, Act 2 starts clean");
  await cardFits("act");
  await enter();
  await waitMode("title");
  // The strip: 1-4 finished, 2-1 next and coming, Clock in gives way to "Act 2 is coming", Act 1's header totals its bests.
  const strip = await page.locator(".next-strip__stop").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.querySelector(".next-strip__code").textContent, e.dataset.state])));
  assert.deepEqual([strip["1-4"], strip["2-1"]], ["done", "next"], JSON.stringify(strip));
  assert.ok(await page.getByRole("button", { name: "Act 2 is coming" }).isDisabled(), "Act 2 is coming");
  assert.equal(await page.locator(".next-strip__act[data-act='act1'] > b").textContent(), String(total).padStart(6, "0"), "Act 1's total on its header");
  assert.ok(await page.getByRole("button", { name: /Work the whole shift/ }).isVisible(), "Work the whole shift on Act 1's header");

  // 6. A replay of the finished 1-3: a fresh run, its own exit card, a best, and the journey untouched.
  const before = await save();
  await page.locator(".next-strip__stop", { has: page.locator(".next-strip__code", { hasText: /^1-3$/ }) }).click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("card");
  r = await run();
  assert.deepEqual([r.level, r.score, r.lives, r.hot], ["campus", 0, 3, false], "a replay starts fresh");
  await waitMode("play");
  r = await clockOut(15880, -900, true);
  assert.equal(r.mode, "story");
  await page.getByRole("heading", { name: "Clocked out" }).waitFor();
  text = await veil();
  assert.match(text, /1-3/);
  assert.match(text, /Score[\s\S]*\d{6}[\s\S]*best[\s\S]*\d{6}/i);
  await cardFits("clocked-out");
  await page.getByRole("button", { name: "Journey" }).click();
  await waitMode("title");
  s = await save();
  assert.deepEqual([s.next, s.run, s.done], [before.next, before.run, before.done], "a replay moves nothing");
  assert.ok(s.best.campus >= before.best.campus, "a replay never lowers a best");

  // 7. A broken save: the start screen opens on a new journey, and nothing errs.
  await page.evaluate(() => localStorage.setItem("hammer-time-journey", "{broken"));
  await page.goto(home);
  await waitMode("title");
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("story");
  r = await run();
  assert.deepEqual([r.level, r.score], ["sat", 0], "a new journey from its true start, the email first");

  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: Clock in on a fresh journey, the cards between levels, the save at every card and exit and after a reload, Hammer down and Try again on the snapshot, Act 1's Bonvoy and act cards, a replay's Clocked out, a broken save; the cards fit three shapes clear of his face.");
} catch (err) {
  console.error("Journey check failure", errors);
  await page?.screenshot({ path: resolve(out, "journey-failure.png") });
  throw err;
} finally {
  await browser.close();
}
