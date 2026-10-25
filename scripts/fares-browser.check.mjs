// Fare Darts in the browser (R5): the start screen's card to the round, a booking and a miss, Space mashed through a
// windup, the steady hand, E mouthing off, a break mid-flight, a blur, the three screen shapes, the tally with Play again
// and Start screen and its own best; Space on a tally carrying nothing over; a round with the art missing; the AIRPORT
// SHUTTLE door in a shift and what it brings home (the boxes, the cans, the walk out); B held through Continue lobbing
// nothing; a box lobbed at a staffer freezing them with the birds; /?quest=fares.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/fares-browser.check.mjs [http://127.0.0.1:8090/]
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
const quest = (page) => page.evaluate(() => window.__next.quest);
const events = (page, type) => page.evaluate((t) => window.__next.run.events[t] ?? 0, type);
/** One scalpel at a city: a tag put there, the crosshair pinned on it, Space, and the stick waited for. */
const throwAt = async (page, city, tag = true) => {
  const stuck = (await quest(page)).stuck;
  await page.evaluate(([c, t]) => window.__next.dev.fares(t ? { tag: { city: c }, pin: c } : { pin: c }), [city, tag]);
  await page.keyboard.press("Space");
  await page.waitForFunction((s) => window.__next.quest.stuck > s, stuck, { timeout: 5000 });
};
const fits = async (page, w, h) => {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const bar = document.querySelector(".next-hud__bar-top")?.getBoundingClientRect();
    return { sw: doc.scrollWidth, sh: doc.scrollHeight, frame: window.__next.quest.frame, barBottom: bar?.bottom ?? 0 };
  });
  assert.ok(r.sw <= w && r.sh <= h, `${w}x${h}: no scrolling`);
  const f = r.frame;
  assert.ok(f.x >= -1 && f.x + f.w <= w + 1 && f.y >= r.barBottom - 1 && f.y + f.h <= h + 1, `${w}x${h}: the board in view, under the bar: ${JSON.stringify(f)}`);
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}?next=1&title=1&dev=1`);
  await page.evaluate(() => localStorage.removeItem("hammer-time-best-fares"));
  await page.getByRole("button", { name: "Play Fare Darts" }).click();
  await waitMode(page, "questCard");
  assert.match(await page.locator(".next-veil").innerText(), /Fare Darts/i);
  assert.match(await page.locator(".next-veil").innerText(), /box of #15 blades/i, "the card names the prize");
  await shot(page, "fares-card.png");
  await waitMode(page, "quest");
  assert.match(await page.locator(".next-hud").innerText(), /Fare Darts/i);
  assert.match(await page.locator(".next-hud").innerText(), /Gate B7/i);
  assert.equal(await page.locator(".next-hud__scalpel").count(), 10, "ten scalpels on the tray");
  await page.evaluate(() => window.__next.dev.fares({ calm: true }));
  // A booking at Austin: the score up, his pass up the ladder.
  await throwAt(page, "AUS");
  let q = await quest(page);
  assert.equal(q.booked, 1, "Austin booked");
  assert.ok(q.score > 0 && q.position < 179, `the score and his pass up: ${JSON.stringify({ score: q.score, position: q.position })}`);
  assert.equal(await page.locator(".next-hud__scalpel[data-spent='true']").count(), 1, "one scalpel spent");
  await page.waitForTimeout(400);
  await shot(page, "fares-booked.png");
  // San Antonio is home, never a fare: a scalpel there is a miss.
  const misses = q.stuck - q.booked;
  await throwAt(page, "SAT", false);
  q = await quest(page);
  assert.equal(q.stuck - q.booked, misses + 1, "a miss");
  await page.waitForTimeout(500);
  await shot(page, "fares-miss.png");
  await page.evaluate(() => window.__next.dev.fares({ pin: null }));
  // Space mashed through a windup throws one scalpel.
  await page.waitForTimeout(1200);
  const thrown = (await quest(page)).thrown;
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(700);
  assert.equal((await quest(page)).thrown, thrown + 1, "one throw from a mashed key");
  // Shift held steadies his hand: the meter falls.
  const steady = (await quest(page)).steady;
  await page.keyboard.down("Shift");
  await page.waitForTimeout(500);
  await page.keyboard.up("Shift");
  assert.ok((await quest(page)).steady < steady - 0.2, "the steady hand drains while Shift is held");
  // T towels off: the wipe, then the steady hand full again and one towel fewer (owner, 2026-10-25).
  await page.keyboard.press("t");
  await page.waitForTimeout(400);
  await shot(page, "fares-towel.png");
  await page.waitForFunction(() => window.__next.quest.steady === 2.5, null, { timeout: 3000 });
  assert.equal((await quest(page)).towels, 1, "one towel used");
  // E mouths off at once.
  const insults = await events(page, "fdInsult");
  await page.waitForTimeout(1300);
  await page.keyboard.press("e");
  await page.waitForFunction((n) => (window.__next.run.events.fdInsult ?? 0) > n, insults, { timeout: 3000 });
  await page.waitForTimeout(300);
  await shot(page, "fares-insult.png");
  // A break mid-flight holds the round and the scalpel; back to work, it lands once.
  await page.waitForTimeout(1300);
  const before = await quest(page);
  await page.evaluate(() => window.__next.dev.fares({ tag: { city: "HOU" }, pin: "HOU" }));
  await page.keyboard.press("Space");
  await page.waitForFunction((n) => window.__next.quest.thrown > n, before.thrown, { timeout: 3000 });
  await page.waitForTimeout(150);
  await page.keyboard.press("Escape");
  await waitMode(page, "pause");
  assert.match(await page.locator(".next-veil").innerText(), /throw a scalpel/i, "the break card lists the gate's keys");
  const held = await quest(page);
  await page.waitForTimeout(1000);
  const still = await quest(page);
  assert.equal(still.time, held.time, "the round's clock stops");
  assert.equal(still.stuck, held.stuck, "the scalpel holds in the air");
  await page.keyboard.press("Escape");
  await waitMode(page, "quest");
  await page.waitForFunction((n) => window.__next.quest.stuck > n, held.stuck, { timeout: 3000 });
  await page.waitForTimeout(600);
  assert.equal((await quest(page)).stuck, held.stuck + 1, "it lands once");
  await page.evaluate(() => window.__next.dev.fares({ pin: null }));
  // The window losing focus lets go of Shift.
  await page.keyboard.down("Shift");
  await page.waitForTimeout(80);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const s0 = (await quest(page)).steady;
  await page.waitForTimeout(500);
  assert.ok((await quest(page)).steady >= s0 - 0.01, "the steady hand stops draining on a blur");
  await page.keyboard.up("Shift");
  for (const [w, h] of [[1280, 800], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    if (w < 900) assert.equal(await page.locator(".next-touch button").count(), 10, `${w}x${h}: the pad's ten buttons`);
    await fits(page, w, h);
    await shot(page, `fares-${w}x${h}.png`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  // The tally: practice offers Play again and Start screen, and keeps its own best.
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  const tally = await page.locator(".next-veil").innerText();
  assert.match(tally, /A-LIST PREFERRED|A-LIST|B GROUP|C GROUP/);
  assert.match(tally, /Play again/i);
  assert.match(tally, /Start screen/i);
  assert.match(tally, /From the door this would bring home/i, "the tally names what the door would bring");
  assert.ok((await page.locator(".next-veil__pass").count()) >= 2, "a printed pass per booking");
  await shot(page, "fares-tally.png");
  const score = (await quest(page)).score;
  assert.equal(Number(await page.evaluate(() => localStorage.getItem("hammer-time-best-fares"))), score, "the best kept");
  // Space on the tally is Play again: a fresh round's card, and no throw in its first second.
  const throws = await events(page, "fdThrow");
  await page.keyboard.down("Space");
  await waitMode(page, "questCard");
  await waitMode(page, "quest");
  await page.waitForTimeout(1000);
  assert.equal(await events(page, "fdThrow"), throws, "the key held from the tally threw nothing");
  await page.keyboard.up("Space");
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  // A button the keyboard has moved to is the one Enter presses: Start screen, not Play again.
  await page.getByRole("button", { name: "Start screen" }).focus();
  await page.keyboard.press("Enter");
  await waitMode(page, "title", 5000);
  // A round with the art missing: the stand-ins draw and it plays to its tally.
  await page.goto(`${base}?next=1&title=1&dev=1&noart=1`);
  await page.getByRole("button", { name: "Play Fare Darts" }).click();
  await waitMode(page, "quest");
  await page.waitForTimeout(2500);
  await shot(page, "fares-noart.png");
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  // The AIRPORT SHUTTLE door in a shift: three bookings at Austin, Continue with Space, back at the door with the boxes,
  // the cans and the walk out, and the door spent.
  await page.goto(`${base}?next=1&dev=1`);
  await waitMode(page, "play");
  await page.evaluate(() => window.__next.dev.teleport(9100, 0));
  await page.waitForTimeout(400);
  assert.match(await page.locator(".next-hud__hint").innerText(), /↓ AIRPORT SHUTTLE · Fare Darts/);
  const shift = await page.evaluate(() => ({ score: window.__next.run.score, jumps: window.__next.run.events.jump ?? 0, cans: window.__next.run.cans }));
  await page.keyboard.down("ArrowDown");
  await waitMode(page, "questCard");
  assert.match(await page.locator(".next-veil").innerText(), /Book fares to bring home boxes of #15 blades/i);
  await page.keyboard.up("ArrowDown");
  await waitMode(page, "quest");
  await page.evaluate(() => window.__next.dev.fares({ calm: true }));
  for (let i = 0; i < 3; i++) await throwAt(page, "AUS");
  assert.equal((await quest(page)).booked, 3);
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  const paid = await page.locator(".next-veil").innerText();
  assert.match(paid, /Back to the lobby/i);
  assert.match(paid, /Bringing home: 3 boxes of #15 blades · \+9 cans/i, "the door's prize");
  await shot(page, "fares-door-tally.png");
  // B held through Continue lobs nothing on the way out.
  const lobs = await events(page, "sampleThrow");
  await page.keyboard.down("KeyB");
  await page.keyboard.down("Space");
  await waitMode(page, "play");
  await page.waitForTimeout(500);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyB");
  assert.equal(await events(page, "sampleThrow"), lobs, "B held through Continue lobbed nothing");
  const after = await page.evaluate(() => ({ x: window.__next.run.x, score: window.__next.run.score, jumps: window.__next.run.events.jump ?? 0, cans: window.__next.run.cans, walkOut: window.__next.hero.walkOut }));
  assert.ok(Math.abs(after.x - 9100) < 2, "back at the door");
  assert.equal(after.jumps, shift.jumps, "Space on the tally did not jump");
  assert.ok(after.score > shift.score, "the round's score came home");
  assert.ok(after.walkOut.can > 0, "a Coke Zero in his hand walking out");
  assert.match(await page.locator(".next-hud__boxes").innerText(), /3/, "three boxes beside his patience");
  assert.match(await page.locator(".next-hud__hint").innerText(), /Gate \+[\d,]+ · 3 boxes of #15 blades · \+9 cans/, "what it paid, on the way back");
  await shot(page, "fares-door-paid.png");
  // Any move puts the can away: the hand that holds it wipes, snots and lobs, and nothing goes over his face.
  await page.keyboard.press("h");
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__next.hero.walkOut.can), 0, "a swing puts the can away");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(400);
  await page.keyboard.up("ArrowDown");
  assert.equal(await mode(page), "play", "the door is spent");
  // A box lobbed at the BUFFET's server: frozen, the birds and FREE SAMPLE!.
  await page.evaluate(() => window.__next.dev.teleport(4050, 0));
  await page.waitForTimeout(1500);
  const hits = await events(page, "sampleHit");
  await page.keyboard.down("KeyB");
  await page.waitForTimeout(80);
  await page.keyboard.up("KeyB");
  await page.waitForFunction((n) => (window.__next.run.events.sampleHit ?? 0) > n, hits, { timeout: 5000 });
  await page.waitForTimeout(300);
  await shot(page, "fares-box-bonk.png");
  assert.match(await page.locator(".next-hud__boxes").innerText(), /2/, "one box gone");
  // The link: straight into the gate's practice.
  await page.goto(`${base}?quest=fares`);
  await page.waitForFunction(() => ["questCard", "quest"].includes(window.__next?.run?.mode), null, { timeout: 30000 });
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: practice from the start screen, a booking and a miss, one throw from a mashed key, the steady hand, E, a break mid-flight, a blur, three shapes, the tally and its best, no key carried over, the art missing, the AIRPORT SHUTTLE door and what it brings home, B through Continue, a box lobbed at the staff, /?quest=fares.");
} finally {
  await browser.close();
}
