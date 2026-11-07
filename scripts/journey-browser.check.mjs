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

// 55 on mains; a laptop on battery in its Silent plan holds every screen near 43, the home screen too, so a run there names its own.
const FPS_FLOOR = Number(process.env.FPS_FLOOR ?? 55);
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
  assert.ok(fps >= FPS_FLOOR, `the home screen holds its frame rate: ${fps}`);
  while (Date.now() - t0 < 60000) await page.waitForTimeout(1000);
  const thinks = await page.evaluate(() => window.__next.run.events.think ?? 0);
  assert.ok(thinks >= 6 && thinks <= 8, `about one insult every eight seconds: ${thinks} in a minute`);
  assert.equal(await page.evaluate(() => JSON.stringify(window.__next.cast.acts)), acts0, "the cast stands still");
  assert.equal(await mode(), "title", "nothing clocked in");
  // A click on the home screen unlocks sound, and the title tune is what plays.
  await page.mouse.click(40, 500);
  await page.waitForFunction(() => window.__next.sound.unlocked, null, { timeout: 3000 });
  assert.ok((await page.evaluate(() => window.__next.sound.played["music:title"] ?? 0)) >= 1, "the title tune on the home screen");
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
  assert.ok((await page.evaluate(() => window.__next.sound.played["music:sat"] ?? 0)) >= 1, "SAT's song under the email");
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
  assert.match(await veil(), /Three hours later\. The hotel\./);
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

  // 3. A reload: Clock in starts 1-2's card with the saved score; the volumes are kept.
  await page.evaluate(() => localStorage.setItem("hammer-time-sound", JSON.stringify({ music: 40, effects: 60, muted: false })));
  await page.goto(home);
  await waitMode("title");
  await page.waitForFunction(() => window.__next.sound?.volumes?.music === 0.4, null, { timeout: 5000 });
  assert.deepEqual(await page.evaluate(() => window.__next.sound.volumes), { music: 0.4, effects: 0.6 }, "the volumes kept across a reload");
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
  const played = await page.evaluate(() => window.__next.sound.played);
  assert.ok((played.hammerDown ?? 0) >= 1 && (played["music:off"] ?? 0) >= 1, `Hammer down's notes over silence: ${JSON.stringify(played)}`);
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
  // 2-1 is built: Continue plays on to the lobby at night, clean, its caption first; the way home from a level's card is a fresh page.
  await waitMode("story");
  assert.match(await veil(), /11:40 pm\. The same lobby\./);
  await cardFits("night-caption");
  await enter();
  await waitMode("card");
  r = await run();
  assert.deepEqual([r.level, r.score, r.lives], ["lobby-night", 0, 3], "Act 2 starts clean");
  assert.match(await veil(), /Front desk has you as MEMBER\. System error\./);
  await page.goto(home);
  await waitMode("title");
  // The strip: 1-4 finished, 2-1 next, Clock in plays it, the home scene is the lobby at night, Act 1's header totals its bests.
  const strip = await page.locator(".next-strip__stop").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.querySelector(".next-strip__code").textContent, e.dataset.state])));
  assert.deepEqual([strip["1-4"], strip["2-1"]], ["done", "next"], JSON.stringify(strip));
  assert.ok(await page.getByRole("button", { name: "Clock in" }).isEnabled(), "Clock in plays 2-1");
  assert.equal((await run()).level, "lobby-night", "the home scene is the lobby at night");
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

  // Act 2 from its first card to its last: the keycards to Titanium, the stairs, the tower, the hall in 3D, the suite.
  await page.evaluate((j) => localStorage.setItem("hammer-time-journey", JSON.stringify(j)), { v: 1, next: "lobby-night", done: ["sat", "lobby", "restaurant", "campus", "arena"], best: { sat: 900, lobby: 4000, restaurant: 4000, campus: 4000, arena: 4000 }, bonked: 7, run: null, carry: null, credits: false });
  await page.goto(home);
  await waitMode("title");
  assert.equal((await run()).level, "lobby-night", "the home scene is the lobby at night");
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("story");
  assert.match(await veil(), /11:40 pm\. The same lobby\./);
  await enter();
  await waitMode("card");
  assert.match(await veil(), /Front desk has you as MEMBER\. System error\./);
  await waitMode("play");
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.__next.dev.give("keycard"));
    await page.waitForFunction((w) => window.__next.run.keycards >= w, i + 1, { timeout: 4000 });
  }
  await tp(6400, 0);
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowDown");
  await waitFor((x) => x.mode !== "play", 8000);
  // Its tally, then 2-2's card with his status on it.
  await page.waitForFunction(() => window.__next.run.level === "tower", null, { timeout: 30000 });
  await waitMode("card");
  text = await page.locator(".next-veil").textContent();
  assert.ok(/2-2/.test(text) && /TITANIUM/.test(text), `2-2's card with his status: ${text}`);
  s = await save();
  assert.deepEqual([s.next, s.done.includes("lobby-night")], ["tower", true], "2-1 in the save");
  await waitMode("play");
  await page.evaluate(() => {
    window.__next.dev.boss({ state: "down" });
    window.__next.dev.heal();
  });
  await tp(240, -7020);
  await page.keyboard.down("ArrowLeft");
  await waitFor((x) => x.mode !== "play", 8000);
  await page.keyboard.up("ArrowLeft");
  await page.waitForFunction(() => window.__next.run.level === "hallway", null, { timeout: 30000 });
  await waitMode("card");
  assert.match(await veil(), /2-3/);
  await waitMode("play");
  await page.waitForFunction(() => window.__next.three?.canvas, null, { timeout: 15000 });
  await tp(7790, 0);
  await page.waitForTimeout(400);
  for (let i = 0; i < 6 && (await page.evaluate(() => window.__next.run.events.keyOpen ?? 0)) === 0; i++) {
    // A press while a swing is still under way is no new swing: this waits for his hands to be free.
    await page.waitForFunction(() => !window.__next.moves.move, null, { timeout: 8000 });
    await page.keyboard.press("KeyH");
    await page.waitForFunction((n) => (window.__next.run.events.swing ?? 0) > n, await page.evaluate(() => window.__next.run.events.swing ?? 0) - 1, { timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(800);
  }
  await waitMode("story", 20000);
  assert.match(await veil(), /The suite\. Someone is in it\./);
  await cardFits("suite-caption");
  await enter();
  await waitMode("card");
  text = await veil();
  assert.ok(/2-4/.test(text) && /The suite/i.test(text), `2-4's card: ${text}`);
  await waitMode("play");
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.__next.three?.drawing), false, "the 3D view is off in the suite");
  // What the hall hid is all back on: the people, what they fling, his own figure.
  assert.deepEqual(await page.evaluate(() => window.__next.drawn), { character: true, cast: true, props: true, flyers: true }, "everything the hall hid is drawn again");
  await page.evaluate(() => window.__next.dev.boss({ state: "down" }));
  await waitMode("story", 20000);
  text = await veil();
  assert.match(text, /TITANIUM\. Lifetime\./);
  assert.match(text, /Lifetime\./);
  await cardFits("bonvoy-2");
  await enter();
  await page.waitForFunction(() => /Status Crusade · complete/.test(document.querySelector(".next-veil__card")?.textContent ?? ""), null, { timeout: 8000 });
  text = await veil();
  assert.match(text, /Act 2 · Status Crusade · complete/);
  assert.match(text, /TITANIUM/);
  s = await save();
  const act2 = ["lobby-night", "tower", "hallway", "suite"].reduce((t, id) => t + (s.best[id] ?? 0), 0);
  assert.ok(text.includes(String(act2).padStart(6, "0")), `the act's total on its card: ${act2} in ${text}`);
  assert.deepEqual([s.next, s.done.length, s.run], ["flight", 9, null], "Act 2 in the save");
  await cardFits("act-2");
  // 3-1 is built: on to its card, as Act 1's end goes on to 2-1's; home by a fresh page.
  await enter();
  await waitMode("card");
  assert.equal((await run()).level, "flight", "on to 3-1's card");
  await page.goto(home);
  await waitMode("title");
  const strip2 = await page.locator(".next-strip__stop").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.querySelector(".next-strip__code").textContent, e.dataset.state])));
  assert.equal(strip2["3-1"], "next", JSON.stringify(strip2));
  assert.ok(await page.getByRole("button", { name: "Clock in" }).isEnabled(), "3-1 is built: Clock in plays it");
  assert.equal(await page.locator(".next-strip__act[data-act='act2'] > b").textContent(), String(act2).padStart(6, "0"), "Act 2's total on its header");
  assert.equal(await page.locator(".next-strip__act[data-act='act2'] .next-strip__straight").count(), 0, "no straight-through run on Act 2 in this phase");
  assert.equal(await page.locator(".next-start__quest").count(), 3, "three side quests");
  assert.equal((await run()).level, "basel", "the home scene is Basel's street once the suite is done");

  // 6c. Act 3 to its end: 3-1, the landing, 3-2 and its lunch, 3-3, Basel on time, 3-4 to the office door, 3-5 in scrubs to the
  // training room's doors, 3-6's last hit and "They need to get fired", the carry-out and the administrator, Trainer for Life,
  // the act's card, and home with the epilogue coming.
  const rowX = (row) => Math.round(100 * (0.5 + (52 - row) * 0.77));
  const coachX = (n) => 4000 + (18 - n) * 768;
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("card");
  assert.match(await veil(), /Seat 52E\. Middle\./);
  await waitMode("play");
  await page.evaluate(() => window.__next.dev.boss({ state: "down" }));
  await tp(rowX(1) - 50);
  await waitMode("story");
  assert.match(await veil(), /Paris\. 13 July\. 06:40\. No Southwest, no A-List, no ice\./);
  await cardFits("landing");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await enter();
  await waitMode("card");
  assert.equal((await run()).level, "paris", "on to 3-2's card");
  await waitMode("play");
  await tp(10200);
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowDown");
  await waitMode("questCard", 8000);
  await page.keyboard.press("Enter");
  await waitMode("quest", 8000);
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode("questTally", 8000);
  await page.getByRole("button", { name: /Continue|Back|On/ }).first().click();
  await waitMode("tally", 8000);
  assert.match(await page.locator(".next-veil").textContent(), /Lunch took three hours\. It is 13:40\. The train leaves at 14:02\./);
  await waitMode("card", 20000);
  assert.equal((await run()).level, "train", "on to 3-3's card");
  await waitMode("play");
  await tp(3990);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => /Coach 18/i.test(document.querySelector(".next-hud__venue")?.textContent ?? ""), null, { timeout: 5000 });
  await page.keyboard.up("KeyD");
  await page.evaluate(() => window.__next.dev.boss({ door: 3 }));
  await tp(coachX(1) + 550);
  await page.keyboard.down("KeyD");
  await waitMode("story", 30000);
  await page.keyboard.up("KeyD");
  assert.match(await veil(), /Basel SBB\. 17:06\. On time\. They always are\./);
  await cardFits("basel-on-time");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await enter();
  // The run goes on to 3-4: its card, the errands, the drum major down, the office door.
  await waitMode("card", 20000);
  assert.match(await veil(), /Basel, Tattoo week/);
  assert.equal((await run()).level, "basel", "on to 3-4's card");
  await waitMode("play");
  await page.evaluate(() => {
    for (const id of ["bank", "printer", "pharmacy", "courier"]) window.__next.dev.errand(id);
    window.__next.dev.boss({ state: "down" });
  });
  await tp(15600);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => ["story", "card"].includes(window.__next.run.mode) && window.__next.run.level !== "basel", null, { timeout: 30000 }).catch(() => null);
  await page.keyboard.up("KeyD");
  if ((await run()).mode === "story") await enter();
  // The run goes on to 3-5: its card, him in scrubs, the training room's doors.
  await waitMode("card", 20000);
  assert.match(await veil(), /The Basel office/);
  assert.equal((await run()).level, "lab", "on to 3-5's card");
  await waitMode("play");
  await page.waitForFunction(() => window.__next.costume === "scrubs", null, { timeout: 10000 });
  await tp(13600);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => ["story", "card"].includes(window.__next.run.mode) && window.__next.run.level !== "lab", null, { timeout: 30000 }).catch(() => null);
  await page.keyboard.up("KeyD");
  if ((await run()).mode === "story") await enter();
  // The run goes on to 3-6: the last hit plays the recording, two residents carry him out, the administrator walks in.
  await waitMode("card", 20000);
  assert.match(await veil(), /The training room\. He has a ring light\./);
  assert.equal((await run()).level, "replacement", "on to 3-6's card");
  await waitMode("play");
  await tp(2300);
  await page.waitForFunction(() => window.__next.boss?.state === "edge", null, { timeout: 10000 });
  await page.evaluate(() => window.__next.dev.boss({ hp: 1, round: 3, state: "frozen", timer: 6, screen: { playing: false, cracks: 3 } }));
  const kidX = await page.evaluate(() => window.__next.boss.x);
  await tp(kidX - 130);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(80);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyH");
  await page.waitForTimeout(120);
  await page.keyboard.up("KeyH");
  await page.waitForFunction(() => window.__next.boss?.state === "down", null, { timeout: 5000 });
  await page.waitForFunction(() => window.__next.voice === "fired", null, { timeout: 5000 });
  await page.waitForTimeout(2500);
  await shot("journey-carry-out.png");
  await page.waitForTimeout(2600);
  await shot("journey-admin-in.png");
  await waitMode("story", 30000);
  text = await veil();
  assert.ok(text.includes("The Basel office would like you to stay on. As Trainer for Life.") && text.includes("Obviously."), `the administrator's card: ${text}`);
  await cardFits("trainer-for-life");
  await enter();
  await page.getByRole("heading", { name: "Act 3 · The Last Tour · complete" }).waitFor();
  text = await veil();
  assert.match(text, /Score[\s\S]*\d{6}[\s\S]*Act total[\s\S]*\d{6}/);
  await cardFits("act3");
  await enter();
  await waitMode("title", 20000);
  const strip3 = await page.locator(".next-strip__stop").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.querySelector(".next-strip__code").textContent, e.dataset.state])));
  assert.ok(Object.values(strip3).every((v) => v === "done") && Object.keys(strip3).length === 15, JSON.stringify(strip3));
  assert.ok(await page.getByRole("button", { name: "The epilogue is coming" }).isDisabled(), "Clock in waits for the epilogue");
  assert.equal((await run()).level, "basel", "the home scene is Basel's street");
  assert.equal(await page.evaluate(() => window.__next.costume), "affliction", "in the Affliction shirt at home");
  s = await save();
  assert.deepEqual([s.next, s.done.length, s.run], ["replacement", 15, null], "the journey finished, nothing to carry on");
  // 3-4 replays from the strip to its own Clocked out card.
  await page.locator(".next-strip__stop", { has: page.locator(".next-strip__code", { hasText: /^3-4$/ }) }).click();
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("card");
  assert.equal((await run()).level, "basel", "3-4 replays");
  await waitMode("play");
  await page.evaluate(() => {
    for (const id of ["bank", "printer", "pharmacy", "courier"]) window.__next.dev.errand(id);
    window.__next.dev.boss({ state: "down" });
  });
  await tp(15600);
  await page.keyboard.down("KeyD");
  await page.getByRole("heading", { name: "Clocked out" }).waitFor({ timeout: 30000 });
  await page.keyboard.up("KeyD");
  assert.match(await veil(), /3-4/);
  await page.getByRole("button", { name: "Journey" }).click();
  await waitMode("title", 20000);
  assert.deepEqual([(await save()).next, (await save()).done.length], ["replacement", 15], "the replay leaves the journey as it was");

  // 7. A broken save: the start screen opens on a new journey, and nothing errs.
  await page.evaluate(() => localStorage.setItem("hammer-time-journey", "{broken"));
  await page.goto(home);
  await waitMode("title");
  await page.getByRole("button", { name: "Clock in" }).click();
  await waitMode("story");
  r = await run();
  assert.deepEqual([r.level, r.score], ["sat", 0], "a new journey from its true start, the email first");

  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: Clock in on a fresh journey, the cards between levels, the save at every card and exit and after a reload, Hammer down and Try again on the snapshot, Act 1's Bonvoy and act cards, a replay's Clocked out, Act 3 to its end and the epilogue coming, a broken save; the cards fit three shapes clear of his face.");
} catch (err) {
  console.error("Journey check failure", errors, JSON.stringify(await page?.evaluate(() => ({ run: window.__next.run, hero: window.__next.hero, moves: window.__next.moves.move })).catch(() => null)));
  await page?.screenshot({ path: resolve(out, "journey-failure.png") });
  throw err;
} finally {
  await browser.close();
}
