// Plays the lobby's cast at /?next=1&dev=1: the first bellhop's shove jumped and bonked back, a server
// knocked down, the lecture on staff and on students, a plane swatted, the shield bowling, the projector ambush.
// Usage: node scripts/cast-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const errors = [];
let page;
const run = () => page.evaluate(() => window.__next.run);
const cast = () => page.evaluate(() => window.__next.cast);
const moves = () => page.evaluate(() => window.__next.moves);
const played = () => page.evaluate(() => window.__next.sound.played);
const count = (r, type) => r.events[type] ?? 0;
/** Polls the run and the cast every 30 ms until `pred(run, cast)` holds or `ms` pass. */
const waitFor = async (pred, ms) => {
  const end = Date.now() + ms;
  for (;;) {
    const r = await run();
    const c = await cast();
    if (pred(r, c) || Date.now() >= end) return [r, c];
    await page.waitForTimeout(30);
  }
};
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
/** Full patience again: each step is checked on its own, not on the pips the earlier ones cost. */
const heal = () => page.evaluate(() => window.__next.dev.heal());
const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
/** Waits for his current move (a lecture, a swing) to end: keys held during one do not turn him. */
const settle = async () => {
  for (const end = Date.now() + 3000; Date.now() < end; ) {
    const m = await moves();
    if (m.move === null) return;
    await page.waitForTimeout(30);
  }
};
/** Turns him to face `dir` and asserts it took. */
const face = async (dir) => {
  await settle();
  await hold([dir === 1 ? "ArrowRight" : "ArrowLeft"], 60);
  await page.waitForTimeout(50);
  assert.equal((await moves()).facing, dir, `facing ${dir === 1 ? "right" : "left"}`);
};
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&dev=1`);
  await page.waitForFunction(() => window.__next?.run && window.__next?.dev && window.__next?.cast, {}, { timeout: 30000 });
  let [r] = await waitFor((x) => x.mode === "play", 5000);
  assert.equal(r.mode, "play");

  // 1. The runaway cart: walk toward the first bellhop, he winds up (the ! burst) and shoves; jump it.
  await hold(["ArrowRight"], 700);
  [r] = await waitFor((x) => count(x, "castWindup") >= 1, 8000);
  assert.ok(count(r, "castWindup") >= 1, "the bellhop winds up");
  [r] = await waitFor((x) => count(x, "castAttack") >= 1, 3000);
  assert.ok(count(r, "castAttack") >= 1, "the shove");
  assert.ok((await played()).squeal >= 1, "the wheels squeal");
  let last = null;
  let jumped = false;
  for (const end = Date.now() + 4000; Date.now() < end && !jumped; ) {
    const m = await moves();
    const cx = m.carts[0];
    // Late, as a player learns to: the cases pass under him while he is high.
    if (last !== null && cx !== last && Math.abs(cx - m.heroX) < 230) {
      await hold(["Space"], 350);
      jumped = true;
    }
    last = cx;
    await page.waitForTimeout(30);
  }
  assert.ok(jumped, "jumped as the cart came");
  await page.waitForTimeout(1200);
  r = await run();
  assert.equal(r.patience, 2, "no pip from the cart");
  await shot("cast-cart.png");

  // 2. Bonk it back: once he has fetched it and wheeled it home, stand on its far side from him and swing; it bowls him for the chain's first 100.
  await tp(-300);
  const [, home] = await waitFor((_, y) => y.acts["bellhop-desk"] === "idle" && Math.abs(y.positions["bellhop-desk"].x - 1400) < 20, 20000);
  assert.ok(home.acts["bellhop-desk"] === "idle", `the bellhop wheels the cart home: ${JSON.stringify(home.acts["bellhop-desk"])}`);
  let m = await moves();
  const side = (await cast()).positions["bellhop-desk"].x > m.carts[0] ? -1 : 1;
  await tp(m.carts[0] + side * 230);
  await face(side === -1 ? 1 : -1);
  await page.waitForTimeout(100);
  const hitsBefore = count(await run(), "castHit");
  await page.keyboard.press("KeyH");
  [r] = await waitFor((x) => count(x, "castHit") > hitsBefore && count(x, "chain") >= 1, 3500);
  assert.ok(count(r, "castHit") > hitsBefore && count(r, "chain") >= 1, `the reversed cart bowls the bellhop: ${JSON.stringify(r.events)}`);
  await page.waitForTimeout(300);
  await shot("cast-bonk-back.png");

  // 3. The server: her warning crouch, then the rush from well off; the mallet meets her and the glasses shatter.
  await heal();
  await tp(3950);
  await face(1);
  let [, c] = await waitFor((_, y) => y.acts["server-buffet"] === "attack", 9000);
  assert.equal(c.acts["server-buffet"], "attack", "she rushes");
  const serverHits = count(await run(), "castHit");
  // Swing as she comes into reach (the arc lands 120–220 px ahead over the next 0.3 s; she covers 125 px in that).
  await waitFor((x, y) => y.positions["server-buffet"].x - x.x <= 300, 3000);
  await page.keyboard.press("KeyH");
  [r] = await waitFor((x) => count(x, "castHit") > serverHits, 1500);
  assert.ok(count(r, "castHit") > serverHits, "the server goes down");
  const p = await played();
  assert.ok(p.bonk >= 1 && p.shatter >= 1, `the bonk and the shatter: ${JSON.stringify(p)}`);
  await page.waitForTimeout(400);
  await shot("cast-server.png");

  // 4. The lecture on staff: the second server freezes mid-rush, whichever side of him she comes from.
  await tp(8900);
  const [r4, c4] = await waitFor((_, y) => ["windup", "attack"].includes(y.acts["server-staff"]), 7000);
  await face(c4.positions["server-staff"].x > r4.x ? 1 : -1);
  await page.keyboard.press("KeyE");
  [r] = await waitFor((x) => count(x, "castFreeze") >= 1, 1500);
  assert.ok(count(r, "castFreeze") >= 1, "a staffer frozen");
  await shot("cast-freeze.png");

  // 5. A plane swatted, then the lecture on students, up on the balcony. He stands at the balcony's near end so
  // every student is in front of him (planes never come at his back): the first is 410 px off, where a plane has
  // dipped to mallet height by the time it arrives and the swing lands when pressed with it 210–350 px out, so
  // press at 300; the second's planes, from 960 px, land short of him.
  await heal();
  await tp(7540, -520);
  await face(1);
  let swatted = false;
  const presses = [];
  for (const end = Date.now() + 16000; Date.now() < end && !swatted; ) {
    const [rr, cc] = await waitFor((_, y) => y.planes.some((q) => q.kind === "plane"), 3000);
    const plane = cc.planes.find((q) => q.kind === "plane" && q.x > rr.x && q.x - rr.x <= 300 && q.x - rr.x >= 140);
    if (plane) {
      const mm = await moves();
      presses.push({ d: Math.round(plane.x - rr.x), y: Math.round(plane.y - rr.y), move: mm.move, facing: mm.facing, patience: rr.patience, x: Math.round(rr.x) });
      await page.keyboard.press("KeyH");
      const [after] = await waitFor((x) => count(x, "swat") >= 1, 700);
      swatted = count(after, "swat") >= 1;
    } else await page.waitForTimeout(30);
  }
  assert.ok(swatted, `a plane swatted; presses ${JSON.stringify(presses)}`);
  await shot("cast-swat.png");
  // The lecture on the second student, from his far side: the other two are 900 px and more behind him, whose
  // planes land 300 px short; this one's own plane, from 250–450 px, would cut the lecture off at his chest, so
  // he steps in while the student is between throws, from here, where that student's planes land short too
  // (the lecture lands 0.3 s after the step; a windup takes 0.65).
  await waitFor((_, y) => !["windup", "attack"].includes(y.acts["student-rail-2"]) && y.planes.length === 0, 8000);
  await settle();
  await tp(8750, -520);
  await face(-1);
  await page.keyboard.press("KeyE");
  [r] = await waitFor((x) => count(x, "castSchooled") >= 1, 1500);
  assert.ok(count(r, "castSchooled") >= 1, "a student schooled");
  await shot("cast-schooled.png");

  // 6. The projector ambush: the silhouette, then the leap and the coffee.
  await heal();
  await tp(13700);
  await page.waitForTimeout(300);
  await shot("cast-screen.png");
  // Step inside his 500 px notice (and clear of the tables' server, who rushes anyone within 680 of her patrol).
  await tp(14080);
  await face(1);
  [, c] = await waitFor((_, y) => ["windup", "attack"].includes(y.acts["office-screen"]), 3000);
  assert.ok(["windup", "attack"].includes(c.acts["office-screen"]), `he leaps out: ${JSON.stringify(c.acts["office-screen"])}`);
  [, c] = await waitFor((_, y) => y.planes.some((q) => q.kind === "coffee"), 3000);
  assert.ok(c.planes.some((q) => q.kind === "coffee"), "and flings the coffee");
  await page.waitForTimeout(1500);
  m = await moves();
  assert.ok(m.puddles >= 1, "coffee on the floor");
  await shot("cast-coffee.png");

  // 7. The shield, last, since it lasts ten seconds and bowls whoever leaps at him: whatever he runs into goes
  // flying. (The gift drops where he stands, so teleport first: a little behind the floor bellhop, wherever his cart
  // has taken him by now.)
  const bellhopX = (await page.evaluate(() => window.__next.cast.positions["bellhop-floor"]?.x)) ?? 8200;
  await tp(Math.round(bellhopX) - 500);
  await page.evaluate(() => window.__next.dev.give("bucees"));
  const [before] = await waitFor((x) => x.star > 9, 1500);
  assert.ok(before.star > 9, "the shield is up");
  await settle();
  await hold(["ArrowRight", "ShiftLeft"], 1400);
  r = await run();
  assert.ok(count(r, "castHit") > count(before, "castHit") || count(r, "hit") > count(before, "hit"), `the shield bowls what he runs into: ${JSON.stringify(r.events)}`);
  await shot("cast-shield.png");

  r = await run();
  writeFileSync(resolve(out, "cast-check.json"), JSON.stringify({ events: r.events, played: await played(), cast: await cast() }, null, 2));
  assert.deepEqual(errors, []);
  console.log("PASS: the cast's fights play in the browser.");
} catch (err) {
  console.error("Cast browser check failure", errors);
  if (page) console.error(JSON.stringify({ run: await run().catch(() => null), cast: await cast().catch(() => null) }));
  await page?.screenshot({ path: resolve(out, "cast-failure.png") });
  throw err;
} finally {
  await browser.close();
}
