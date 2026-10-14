// Renders the R0 look boards from the live look scene and saves them under artifacts/.
// Usage: node scripts/look-boards.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
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
  for (const kind of ["clips", "heads", "costumes", "moves", "acts", "slopes", "objects", "cast", "cast-fx", "cast-heads"])
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
  for (const venue of ["restaurant", "campus", "arena"]) {
    if (!want(venue)) continue;
    await page.goto(`${base}?next=1&board=1&venue=${venue}`);
    await page.waitForFunction((v) => window.__nextBoard && window.__next?.run?.level === v, venue, { timeout: 30000 });
    await page.waitForTimeout(800);
    const frames = (await render("venue")).split("\n");
    frames.forEach((f, i) => save(`${venue}-look-${i + 1}.png`, f));
    count += frames.length;
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
