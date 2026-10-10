import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const url = checkedUrl(process.argv[2] || "http://127.0.0.1:8080/");
const capturePoses = process.argv.includes("--poses");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Clock in" }).waitFor();
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Clock in"),
    );
    return button && !button.disabled;
  });
  await page.screenshot({ path: resolve(out, "game-title.png") });
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.bringToFront();
  await page.waitForFunction(() => document.querySelector("main")?.dataset.mode === "play");
  // Release movement in the same animation frame as reaching the crate, so
  // host/Chrome IPC delays under build load do not overshoot the jump target.
  await page.evaluate(async () => {
    window.__controlsTest.setKeys(["ArrowRight"]);
    while (window.__kiln.x < 96) await new Promise(requestAnimationFrame);
    window.__controlsTest.setKeys([]);
    while (Math.abs(window.__controlsTest.getSpeed()) > 1) await new Promise(requestAnimationFrame);
  });
  const crateX = await page.evaluate(() => window.__kiln.x);
  assert.ok(crateX > 100 && crateX < 128, `Approach should stop below the first crate: ${crateX}`);
  await page.keyboard.press("Space", { delay: 260 });
  await page.waitForTimeout(600);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => document.querySelector(".pepper-state")?.dataset.on === "true",
    {},
    { timeout: 5000 },
  );
  await page.keyboard.up("ArrowRight");
  await page.screenshot({ path: resolve(out, "pepper-check.png") });
  assert.match(await page.locator(".pepper-state").innerText(), /Snot ready/);
  await page.keyboard.press("f");
  await page.waitForTimeout(180);
  await page.screenshot({ path: resolve(out, "game-snot.png") });
  await page.waitForTimeout(650);
  await page.keyboard.press("t");
  await page.waitForTimeout(380);
  await page.screenshot({ path: resolve(out, "game-towel.png") });
  await page.waitForTimeout(700);
  await page.keyboard.press("h");
  await page.waitForTimeout(200);
  await page.screenshot({ path: resolve(out, "game-hammer.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  assert.equal(await page.locator("main").getAttribute("data-mode"), "pause");
  const pausedX = await page.evaluate(() => window.__kiln.x);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowRight");
  assert.equal(await page.evaluate(() => window.__kiln.x), pausedX);
  await page.getByRole("button", { name: "Back to work" }).click();
  await page.screenshot({ path: resolve(out, "gameplay.png") });
  // Left alone, he checks his watch; with the dev lever, the super smash slams the floor.
  await page.evaluate(() => window.__controlsTest.setKeys([]));
  await page.waitForFunction(() => window.__kiln.idle > 2.9, {}, { timeout: 9000 });
  await page.screenshot({ path: resolve(out, "game-idle-watch.png") });
  const slam = await page.evaluate(() => Boolean(window.__kilnDev));
  if (slam) {
    await page.evaluate(() => window.__kilnDev.charge(10));
    await page.keyboard.press("q");
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(out, "game-slam.png") });
    await page.waitForTimeout(700);
  }
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    const sizes = await page.locator(".touchbar button").evaluateAll((buttons) =>
      buttons.map((b) => ({
        label: b.getAttribute("aria-label"),
        w: b.getBoundingClientRect().width,
        h: b.getBoundingClientRect().height,
      })),
    );
    assert.equal(sizes.length, 10);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: resolve(out, `game-${viewport.width}.png`) });
  }
  // Optional development-only pose board uses the live renderer and source art.
  if (capturePoses) {
    const board = await page.evaluate(async () => {
      const { drawHero, heroFace } = await import("/src/game/hero.ts");
      const { drawThought } = await import("/src/game/thought.ts");
      const { SUPER_SECONDS } = await import("/src/game/combat.ts");
      const urls = {
        idle: "hero-idle-calm.png",
        body: "hero-body.png",
        upper: "hero-upper.png",
        fore: "hero-fore.png",
        reach: "hero-reach.png",
        hand: "hero-hand.png",
        towel: "towel-cloth.webp",
      };
      const assets = {};
      await Promise.all(
        Object.entries(urls).map(async ([key, url]) => {
          const img = new Image();
          img.src = `/${url}`;
          await img.decode();
          assets[key] = img;
        }),
      );
      const base = {
        x: 0,
        foot: 0,
        facing: 1,
        phase: 0,
        moving: false,
        air: false,
        landing: 0,
        swing: 0,
        mega: 0,
        wipe: 0,
        snot: 0,
        heat: 0,
        hurt: 0,
        star: 0,
        reduced: false,
        clock: 1,
      };
      const slam = (u) => SUPER_SECONDS * (1 - u);
      const poses = [
        { label: "Walk", moving: true, phase: 0.18, heat: 75 },
        { label: "Wind-up", swing: 0.32, heat: 75 },
        { label: "Strike", swing: 0.19, heat: 75 },
        { label: "Brow wipe", wipe: 0.5, heat: 75 },
        { label: "Snot rocket", snot: 0.24, heat: 75 },
        { label: "Crouch / slide", crouch: true, heat: 75 },
        { label: "Watch check", idle: 3.5 },
        { label: "Foot tap", idle: 5.125 },
        { label: "Slam load", mega: slam(0.38), air: true },
        { label: "Slam", mega: slam(0.6) },
        { label: "Slam hold", mega: slam(0.74) },
        { label: "Slam, facing left", mega: slam(0.6), facing: -1 },
        ...[0.46, 0.5, 0.54, 0.58, 0.68, 0.86].map((u) => ({
          label: `Slam u=${u}`,
          mega: slam(u),
          air: u < 0.58,
        })),
      ];
      const thoughts = [
        { label: "Thought", text: "Are you going to finish that?", x: 190, foot: 192 },
        {
          label: "Long thought",
          text: "I don't PAY Business Select. I AM business select.",
          x: 120,
          foot: 192,
        },
        { label: "Top edge", text: "TITANIUM. Look again.", x: 200, foot: 56 },
        { label: "Left edge", text: "Any day now.", x: 4, foot: 192 },
        { label: "Right edge, facing left", text: "Room charge.", x: 380, foot: 192, facing: -1 },
        { label: "Mid-jump", text: "HAMMER TIME.", x: 260, foot: 130, air: true },
      ];
      const cellH = 520,
        sceneW = 600,
        sceneH = 338,
        rows = Math.ceil(poses.length / 6);
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = rows * cellH + 2 * (sceneH + 40);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#192532";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const label = (text, x, y) => {
        ctx.fillStyle = "#ead8b4";
        ctx.font = "bold 18px Segoe UI";
        ctx.fillText(text, x, y);
      };
      poses.forEach((state, i) => {
        const cx = (i % 6) * 300,
          cy = Math.floor(i / 6) * cellH;
        ctx.fillStyle = "#5a6b7c";
        ctx.fillRect(cx + 8, cy + 450, 284, 2);
        ctx.save();
        ctx.translate(cx + (state.facing === -1 ? 175 : 125), cy + 450);
        ctx.scale(8, 8);
        drawHero(ctx, assets, { ...base, ...state });
        ctx.restore();
        label(state.label, cx + 16, cy + 490);
      });
      // Thought bubbles in view space near game scale (the game draws the view at 5x).
      // Each scene crops 128x72 view units around Hammer; the darker margin is outside the view.
      thoughts.forEach((t, i) => {
        const ox = (i % 3) * sceneW,
          oy = rows * cellH + Math.floor(i / 3) * (sceneH + 40);
        const view = { w: 384, h: 216 };
        const crop = { w: 180, h: 101.25 };
        const left = Math.min(Math.max(t.x - crop.w / 2, -8), view.w - crop.w + 8);
        const top = Math.min(Math.max(t.foot - 96, -8), view.h - crop.h + 8);
        const k = (sceneW - 24) / crop.w;
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox + 12, oy + 4, sceneW - 24, crop.h * k);
        ctx.clip();
        ctx.translate(ox + 12, oy + 4);
        ctx.scale(k, k);
        ctx.translate(-left, -top);
        ctx.fillStyle = "#24364a";
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.fillStyle = "#5a6b7c";
        ctx.fillRect(0, 192, view.w, 0.5);
        const pose = { ...base, x: t.x, foot: t.foot, facing: t.facing ?? 1, air: t.air ?? false };
        drawHero(ctx, assets, pose);
        const face = heroFace(pose);
        drawThought(ctx, t.text, face.crown, pose.facing, face, view);
        ctx.restore();
        label(t.label, ox + 16, oy + sceneH + 30);
      });
      return canvas.toDataURL("image/png");
    });
    writeFileSync(resolve(out, "character-poses.png"), Buffer.from(board.split(",")[1], "base64"));
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(out, "game-interactions.json"),
    JSON.stringify(
      {
        ok: true,
        pepper: true,
        snot: true,
        towel: true,
        hammer: true,
        pause: true,
        idle: true,
        slam,
        touchButtons: 10,
        viewports: ["1280x800", "390x844", "844x390"],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: pepper, snot, towel, hammer, pause, idle watch${slam ? ", super slam" : ""}, 10 touch controls, portrait and landscape; no page errors.`,
  );
} catch (err) {
  console.error("Browser check failure", errors, await page?.locator("body").innerText());
  await page?.screenshot({ path: resolve(out, "interaction-failure.png") });
  throw err;
} finally {
  await browser.close();
}
