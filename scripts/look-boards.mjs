// Renders the R0 look boards from the live look scene and saves them under artifacts/.
// Usage: node scripts/look-boards.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";
import sharp from "sharp";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const errors = [];
const save = (name, dataUrl) => {
  const file = resolve(out, name);
  writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(file);
};
let page;
try {
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&board=1`);
  await page.waitForFunction(() => window.__nextBoard && window.__next?.hero, {}, { timeout: 30000 });
  await page.waitForTimeout(800);
  const render = (kind) => page.evaluate((k) => window.__nextBoard.render({ kind: k }), kind);
  // A third argument names the boards to render, comma separated; the rest are skipped.
  const only = process.argv[3]?.split(",");
  const want = (kind) => !only || only.includes(kind);
  let count = 0;
  // Board figures are let go of once drawn: as many alive after the boards as before.
  const live = () => page.evaluate(() => window.__next?.castArt?.live ?? 0);
  const live0 = await live();
  for (const kind of ["clips", "heads", "costumes", "moves", "acts", "slopes", "flop", "objects", "cast", "cast-fx", "cast-heads"])
    if (want(kind)) {
      save(kind === "objects" || kind.startsWith("cast") ? `${kind}.png` : `hammer-${kind}.png`, await render(kind));
      count++;
    }
  if ((await live()) !== live0) throw new Error(`board figures left alive: ${(await live()) - live0}`);
  if (want("lobby")) {
    const frames = (await render("lobby")).split("\n");
    frames.forEach((f, i) => save(`lobby-look-${i + 1}.png`, f));
    count += frames.length;
  }
  if (want("stash")) {
    save("stash.png", await render("stash"));
    count++;
  }
  if (want("cast-lobby")) {
    const frames = (await render("cast-lobby")).split("\n");
    frames.forEach((f, i) => save(`cast-lobby-${i + 1}.png`, f));
    count += frames.length;
  }
  if (want("pig")) {
    // The pig in every state and face, and its charge and hop frame by frame: drawn from the gift shop, which loads it.
    await page.goto(`${base}?next=1&board=1&venue=arena`);
    await page.waitForFunction(() => window.__nextBoard && window.__next?.run?.level === "arena", null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const before = await live();
    save("pig.png", await render("pig"));
    save("pig-steps.png", await render("pig-steps"));
    count += 2;
    if ((await live()) !== before) throw new Error(`pig board figures left alive: ${(await live()) - before}`);
  }
  if (want("home-night")) {
    // The home screen as it stands once Act 1 is done.
    await page.goto(`${base}?dev=1&home=night`);
    await page.waitForFunction(() => document.querySelector(".next-start[data-live]"), null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: resolve(out, "home-night.png") });
    console.log(resolve(out, "home-night.png"));
    count++;
  }
  if (want("supervisor")) {
    // The supervisor in the running game: her wave with a cart on the flight, her wait beside him, and down.
    await page.goto(`${base}?next=1&dev=1&level=tower`);
    await page.waitForFunction(() => window.__next?.run?.mode === "play", null, { timeout: 60000 });
    await page.evaluate(() => window.__next.dev.teleport(2300, -5400));
    await page.waitForFunction(() => window.__next.boss?.state === "wave", null, { timeout: 8000 });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: resolve(out, "supervisor-1.png") });
    await page.evaluate(() => {
      window.__next.dev.boss({ state: "waiting", timer: 60 });
      window.__next.dev.teleport(1250, -5940);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(out, "supervisor-2.png") });
    await page.evaluate(() => window.__next.dev.boss({ state: "down" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(out, "supervisor-3.png") });
    count += 3;
  }
  // The hall in the running game: its three stretches, and his back through the swing, slowed to be seen.
  if (want("hallway")) {
    await page.goto(`${base}?next=1&dev=1&level=hallway`);
    await page.waitForFunction(() => window.__next?.three?.drawing && window.__next.run.mode === "play", null, { timeout: 60000 });
    for (const [i, x] of [200, 3000, 7800].entries()) {
      await page.evaluate((at) => window.__next.dev.teleport(at, 0), x);
      await page.waitForTimeout(900);
      await page.screenshot({ path: resolve(out, `hallway-look-${i + 1}.png`) });
      count++;
    }
  }
  if (want("back")) {
    await page.goto(`${base}?next=1&dev=1&level=hallway`);
    await page.waitForFunction(() => window.__next?.three?.drawing && window.__next.run.mode === "play", null, { timeout: 60000 });
    await page.evaluate(() => {
      window.__next.dev.teleport(2200, 0);
      window.__next.dev.slowmo(0.03, 120);
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(out, "back-1.png") });
    await page.keyboard.down("KeyH");
    await page.waitForTimeout(200);
    await page.keyboard.up("KeyH");
    for (const [i, u] of [0.2, 0.42, 0.62, 0.85].entries()) {
      await page.waitForFunction((want) => window.__next.moves.u > want, u, { timeout: 30000, polling: 10 });
      await page.screenshot({ path: resolve(out, `back-${i + 2}.png`) });
    }
    count += 5;
  }
  // The suite in the running game: a room a phase, him in it.
  if (want("suite")) {
    await page.goto(`${base}?next=1&dev=1&level=suite`);
    await page.waitForFunction(() => window.__next?.run?.mode === "play", null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: resolve(out, "suite-look-1.png") });
    await page.evaluate(() => {
      window.__next.dev.boss({ hp: 8 });
      window.__next.dev.teleport(2200, 0);
    });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: resolve(out, "suite-look-2.png") });
    await page.evaluate(() => {
      window.__next.dev.boss({ hp: 4 });
      window.__next.dev.teleport(3600, 0);
    });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: resolve(out, "suite-look-3.png") });
    count += 3;
  }
  if (want("hallway-flat")) {
    await page.goto(`${base}?next=1&dev=1&level=hallway&flat=1`);
    await page.waitForFunction(() => window.__next?.run?.mode === "play", null, { timeout: 60000 });
    for (const [i, x] of [600, 2800, 5100].entries()) {
      await page.evaluate((at) => window.__next.dev.teleport(at, 0), x);
      await page.waitForTimeout(500);
      await page.screenshot({ path: resolve(out, `hallway-flat-${i + 1}.png`) });
      count++;
    }
  }
  for (const venue of ["sat", "restaurant", "campus", "arena", "lobby-night", "tower"]) {
    if (!want(venue)) continue;
    await page.goto(`${base}?next=1&board=1&venue=${venue}`);
    await page.waitForFunction((v) => window.__nextBoard && window.__next?.run?.level === v, venue, { timeout: 30000 });
    await page.waitForTimeout(800);
    const frames = (await render("venue")).split("\n");
    frames.forEach((f, i) => save(`${venue}-look-${i + 1}.png`, f));
    count += frames.length;
  }
  if (want("banquet")) {
    // The banquet: drawn from its own page, the practice round's scene and Hammer's dive.
    await page.goto(`${base}?next=1&board=1&dev=1&quest=hungry`);
    await page.waitForFunction(() => window.__nextBoard && window.__next?.run, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const frames = (await render("banquet")).split("\n");
    frames.forEach((f, i) => save(`banquet-look-${i + 1}.png`, f));
    save("banquet-dive.png", await render("banquet-dive"));
    save("banquet-food.png", await render("banquet-food"));
    count += frames.length + 2;
  }
  if (want("lounge")) {
    // The M CLUB's table: its first spread and the entrees.
    await page.goto(`${base}?next=1&board=1&dev=1`);
    await page.waitForFunction(() => window.__nextBoard && window.__next?.run, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const frames = (await render("lounge")).split("\n");
    frames.forEach((f, i) => save(`lounge-look-${i + 1}.png`, f));
    count += frames.length;
  }
  if (want("gate")) {
    // The gate (R5): its four moments from a replayed practice round, and his throw and lob up close.
    await page.goto(`${base}?next=1&board=1&dev=1`);
    await page.waitForFunction(() => window.__nextBoard && window.__next?.run, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const frames = (await render("gate")).split("\n");
    frames.forEach((f, i) => save(`gate-look-${i + 1}.png`, f));
    save("gate-throw.png", await render("gate-throw"));
    count += frames.length + 1;
  }
  if (want("box-bonk")) {
    // A box of #15 blades lobbed in the lobby, slowed down: in flight, the bonk, the birds over whoever it froze; side by side.
    await page.goto(`${base}?next=1&dev=1`);
    await page.waitForFunction(() => window.__next?.run?.mode === "play", null, { timeout: 60000 });
    await page.evaluate(() => {
      window.__next.dev.boxes(3);
      window.__next.dev.teleport(4050, 0);
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__next.dev.slowmo(0.2, 4));
    await page.keyboard.down("KeyB");
    await page.waitForTimeout(80);
    await page.keyboard.up("KeyB");
    await page.waitForTimeout(1300);
    const shots = [await page.screenshot()];
    await page.waitForFunction(() => (window.__next.run.events?.sampleHit ?? 0) > 0, null, { timeout: 8000 });
    shots.push(await page.screenshot());
    await page.waitForTimeout(700);
    shots.push(await page.screenshot());
    const { width, height } = await sharp(shots[0]).metadata();
    const png = await sharp({ create: { width: width * 3, height, channels: 4, background: "#20242b" } })
      .composite(shots.map((input, i) => ({ input, left: i * width, top: 0 })))
      .png()
      .toBuffer();
    save("box-bonk.png", `data:image/png;base64,${png.toString("base64")}`);
    count++;
  }
  if (want("home")) {
    // The home screen (story spec §5.1): the start screen over the live scene with an insult up, as the owner sees it, on
    // a laptop and a phone both ways.
    for (const [w, h] of [[1920, 1080], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${base}?dev=1`);
      await page.waitForFunction(() => document.querySelector(".next-start[data-live]") && window.__next?.dev, null, { timeout: 60000 });
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.__next.dev.event({ type: "think", text: "Did you play football without a helmet growing up?", seconds: 3 }));
      await page.waitForTimeout(700);
      const name = w === 1920 ? "home.png" : `home-${w}x${h}.png`;
      save(name, `data:image/png;base64,${(await page.screenshot()).toString("base64")}`);
      count++;
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log(`PASS: ${count} boards rendered.`);
} catch (err) {
  console.error("Look boards failure", errors);
  await page?.screenshot({ path: resolve(out, "boards-failure.png") });
  throw err;
} finally {
  await browser.close();
}
