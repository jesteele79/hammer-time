// Renders the start screen's pictures from the game itself and stores them in public/start/ (committed): the key art (the
// lobby with Hammer and the pig) and a picture of each place a shift can start. The owner's art/incoming/brand/key-art.png
// replaces the rendered key art when it exists. Run it after the art changes, against the dev server.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/start-art.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
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
  await webp(existsSync(owner) ? readFileSync(owner) : await shot("lobby", "keyart"), 1600, "key-art.webp");
  for (const venue of ["lobby", "restaurant", "campus", "arena"]) await webp(await shot(venue, "thumb"), 640, `${venue}.webp`);
  console.log("PASS: wrote public/start/key-art.webp and four pictures of where a shift starts.");
} finally {
  await browser.close();
}
