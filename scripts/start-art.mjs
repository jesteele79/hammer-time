// Renders the start screen's pictures from the game itself and stores them in public/start/ (committed): the key art (the
// lobby with Hammer and the pig), a picture of each place a shift can start, and the banquet's and the gate's for the Side
// quests cards.
// The owner's art/incoming/brand/key-art.png replaces the rendered key art when it exists. Run it after the art changes,
// against the dev server.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/start-art.mjs [http://127.0.0.1:8090/] [key-art,starts,banquet,gate]
// (a second argument names the pictures to render, comma separated; the rest are left as they are).
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const only = process.argv[3]?.split(",");
const want = (name) => !only || only.includes(name);
mkdirSync("public/start", { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const webp = (png, width, file) => sharp(png).resize({ width }).webp({ quality: 85, effort: 5 }).toFile(`public/start/${file}`);
try {
  // The boards render 1920 by 1080: a window that size, as the look boards use, so nothing sized to the window falls short.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(60000);
  // The key art is the two of them alone: the lobby without its cast.
  const shot = async (venue, kind) => {
    await page.goto(`${base}?next=1&board=1${venue === "lobby" ? "" : `&venue=${venue}`}${kind === "keyart" ? "&nocast=1" : ""}`);
    await page.waitForFunction((v) => window.__nextBoard && window.__next?.run?.level === v, venue);
    await page.waitForTimeout(800);
    const data = await page.evaluate((k) => window.__nextBoard.render({ kind: k, resolution: 1 }), kind);
    return Buffer.from(data.split(",").pop(), "base64");
  };
  const owner = "art/incoming/brand/key-art.png";
  if (want("key-art")) await webp(existsSync(owner) ? readFileSync(owner) : await shot("lobby", "keyart"), 1600, "key-art.webp");
  if (want("starts")) for (const venue of ["lobby", "restaurant", "campus", "arena"]) await webp(await shot(venue, "thumb"), 640, `${venue}.webp`);
  // The side quests' cards, drawn by the game: the banquet at the entrees, the gate on a streak (R5 §11).
  for (const [name, url, kind] of [
    ["banquet", `${base}?next=1&board=1&quest=hungry`, "banquet-thumb"],
    ["gate", `${base}?next=1&board=1`, "gate-thumb"],
  ]) {
    if (!want(name)) continue;
    await page.goto(url);
    await page.waitForFunction(() => window.__nextBoard && window.__next?.run, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    const thumb = await page.evaluate((k) => window.__nextBoard.render({ kind: k, resolution: 1 }), kind);
    await webp(Buffer.from(thumb.split(",").pop(), "base64"), 640, `${name}.webp`);
  }
  console.log(`PASS: wrote public/start/: ${only ? only.join(", ") : "the key art, four pictures of where a shift starts and the side quests'"}.`);
} finally {
  await browser.close();
}
