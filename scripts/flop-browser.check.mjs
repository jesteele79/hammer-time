// The banquet's belly-flop in the shift (owner, 2026-10-18), at 1280x800 and on a phone held either way: its badge
// beside his patience and the hint that teaches it, run + ↓ going flat on his belly into the BUFFET door's server and
// knocking her over, the hint gone once he has flopped, and the flop still going under the service corridor. Each shape
// saves the flop frame by frame (artifacts/flop-<shape>-NN.png) and under the corridor (flop-<shape>-corridor-NN.png).
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/flop-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const FLOP_HINT = "Belly-flop · run, then ↓ · it knocks staff over";
/** The corridor's low ceiling in the lobby: from 14800 to 15300. */
const CORRIDOR = { x0: 14800, x1: 15300 };
const SHAPES = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "phone-side", width: 844, height: 390 },
];
/** Slow motion for the frames: a tenth of the speed, so the half-second flop is some twenty shots. */
const SLOW = 0.1;
const errors = [];
try {
  for (const shape of SHAPES) {
    const page = await browser.newPage({ viewport: { width: shape.width, height: shape.height } });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => errors.push(`${shape.name}: ${e.message}`));
    const run = () => page.evaluate(() => window.__next.run);
    const hero = () => page.evaluate(() => window.__next.hero);
    const cast = () => page.evaluate(() => window.__next.cast);
    const hint = () => page.locator(".next-hud__hint").innerText();
    const tp = (x) => page.evaluate((a) => window.__next.dev.teleport(a, 0), x);
    const slow = (on) => page.evaluate((s) => window.__next.dev.slowmo(s, s < 1 ? 60 : 0), on ? SLOW : 1);
    /** Runs right until he is `ahead` px short of `to()` (looked up as he goes), then goes down: a flop, in slow motion. */
    const flopAt = async (to, ahead) => {
      await keys(["Shift", "ArrowRight"], true);
      for (const end = Date.now() + 4000; Date.now() < end; ) {
        const [x, target] = await page.evaluate(() => [window.__next.hero.x, window.__next.cast]);
        if (x >= (await to(target)) - ahead) break;
      }
      await keys(["ArrowDown"], true);
      await slow(true);
    };
    const keys = async (list, down) => {
      for (const k of list) await (down ? page.keyboard.down(k) : page.keyboard.up(k));
    };
    /** Screenshots as fast as the page gives them for `ms` of wall time, numbered on from `from`; returns the clips drawn meanwhile. */
    const frames = async (prefix, ms, from = 0) => {
      const clips = [];
      const end = Date.now() + ms;
      for (let i = from; Date.now() < end; i++) {
        await page.screenshot({ path: resolve(out, `${prefix}-${String(i).padStart(2, "0")}.png`) });
        clips.push((await hero()).clip);
      }
      return clips;
    };

    await page.goto(`${base}?next=1&dev=1`);
    await page.waitForFunction(() => window.__next?.run?.mode === "play", null, { timeout: 30000 });
    await page.evaluate(() => window.__next.dev.heal());
    await tp(2600);
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".next-hud__flop").count(), 0, `${shape.name}: no badge before he has it`);
    assert.notEqual(await hint(), FLOP_HINT);
    await page.evaluate(() => window.__next.dev.flop());
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".next-hud__flop").count(), 1, `${shape.name}: the badge beside his patience`);
    assert.ok(await page.locator(".next-hud__flop").isVisible(), `${shape.name}: the badge shows`);
    assert.match(await page.locator(".next-hud dd[aria-label*='belly-flop']").getAttribute("aria-label"), /belly-flop/);
    assert.equal(await hint(), FLOP_HINT, `${shape.name}: the hint teaches it`);
    await page.screenshot({ path: resolve(out, `flop-${shape.name}-hud.png`) });

    // At the BUFFET door's server, from out of her sight: a run, then ↓.
    const sx = (await cast()).positions["server-buffet"].x;
    await tp(sx - 900);
    await page.waitForTimeout(400);
    const before = await run();
    await flopAt((c) => c.positions["server-buffet"].x, 420);
    const clips = await frames(`flop-${shape.name}`, 400 / SLOW);
    // ↓ comes up before the flop ends (he slides by the BUFFET door, where ↓ held would open it), and he gets up.
    await keys(["ArrowDown", "ArrowRight", "Shift"], false);
    clips.push(...(await frames(`flop-${shape.name}`, 300 / SLOW, clips.length)));
    await slow(false);
    const after = await run();
    assert.ok((after.events.flop ?? 0) > (before.events.flop ?? 0), `${shape.name}: ↓ at a run flops`);
    assert.ok(clips.includes("flop"), `${shape.name}: drawn on his belly: ${clips.join(",")}`);
    assert.ok((after.events.castHit ?? 0) > (before.events.castHit ?? 0), `${shape.name}: the flop knocks her over`);
    assert.ok(["fly", "down", "getup"].includes((await cast()).acts["server-buffet"]), `${shape.name}: she is off her feet: ${(await cast()).acts["server-buffet"]}`);
    assert.equal(after.patience, before.patience, `${shape.name}: and he is untouched`);
    await page.waitForTimeout(1200);
    assert.notEqual(await hint(), FLOP_HINT, `${shape.name}: taught once`);

    // The corridor: the flop still goes under its low ceiling, and he crawls out the far side.
    // The office worker behind the projector screen leaps out at whoever comes by: sent off, so nothing else is in it.
    await page.evaluate(() => {
      window.__next.dev.heal();
      window.__next.dev.dismiss("office-screen");
    });
    await tp(CORRIDOR.x0 - 600);
    await page.waitForTimeout(400);
    await flopAt(() => CORRIDOR.x0, 230);
    const under = await frames(`flop-${shape.name}-corridor`, 400 / SLOW);
    // Under the ceiling he stays low with ↓ let go, and → crawls him out.
    await keys(["ArrowDown", "Shift"], false);
    under.push(...(await frames(`flop-${shape.name}-corridor`, 200 / SLOW, under.length)));
    await slow(false);
    await page.waitForFunction((x) => window.__next.hero.x > x, CORRIDOR.x1 + 60, { timeout: 8000 });
    await keys(["ArrowRight"], false);
    assert.ok(under.includes("flop"), `${shape.name}: flat under the corridor: ${under.join(",")}`);
    assert.equal((await run()).mode, "play");
    await page.close();
  }
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: the belly-flop's badge and hint, a flop knocking the BUFFET server over, the hint taught once, and under the corridor, at 1280x800, 390x844 and 844x390.");
} finally {
  await browser.close();
}
