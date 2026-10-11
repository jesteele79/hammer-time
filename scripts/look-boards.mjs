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
  save("hammer-clips.png", await render("clips"));
  save("hammer-heads.png", await render("heads"));
  save("hammer-costumes.png", await render("costumes"));
  save("hammer-moves.png", await render("moves"));
  const frames = (await render("lobby")).split("\n");
  frames.forEach((f, i) => save(`lobby-look-${i + 1}.png`, f));
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log(`PASS: ${4 + frames.length} boards rendered.`);
} catch (err) {
  console.error("Look boards failure", errors);
  await page?.screenshot({ path: resolve(out, "boards-failure.png") });
  throw err;
} finally {
  await browser.close();
}
