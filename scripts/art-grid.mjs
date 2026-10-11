// Zooms into a keyed body plate with a labelled grid in the keyed crop's pixels, for measuring
// joints and cut lines by eye. The rig's joints, bones and layer outlines from
// art/cuts/hammer-body.json are drawn over it when they exist.
// Usage: node scripts/art-grid.mjs <costume> [x y w h] [scale] [--bare]
//   writes artifacts/grid-<costume>.png
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { keyOut } from "./art-cut.mjs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const bare = process.argv.includes("--bare");
const costume = args[0] ?? "affliction";
const keyed = await keyOut(readFileSync(`art/incoming/hammer/body-${costume}.png`));
const [x0, y0, w, h] = args.length >= 5 ? args.slice(1, 5).map(Number) : [0, 0, keyed.width, keyed.height];
const scale = Number(args[5] ?? (args.length >= 5 ? 2 : 1));
const W = Math.round(w * scale),
  H = Math.round(h * scale);
const step = w <= 300 ? 10 : w <= 700 ? 25 : 50;

const px = (x) => (x - x0) * scale;
const py = (y) => (y - y0) * scale;
const shapes = [];
for (let x = Math.ceil(x0 / step) * step; x <= x0 + w; x += step) {
  const major = x % (step * 2) === 0;
  shapes.push(
    `<line x1="${px(x)}" y1="0" x2="${px(x)}" y2="${H}" stroke="#39ff6a" stroke-opacity="${major ? 0.7 : 0.3}" stroke-width="1"/>`,
  );
  if (major) shapes.push(`<text x="${px(x) + 2}" y="12" font-size="12" font-family="monospace" fill="#39ff6a">${x}</text>`);
}
for (let y = Math.ceil(y0 / step) * step; y <= y0 + h; y += step) {
  const major = y % (step * 2) === 0;
  shapes.push(
    `<line x1="0" y1="${py(y)}" x2="${W}" y2="${py(y)}" stroke="#39ff6a" stroke-opacity="${major ? 0.7 : 0.3}" stroke-width="1"/>`,
  );
  if (major) shapes.push(`<text x="2" y="${py(y) - 2}" font-size="12" font-family="monospace" fill="#39ff6a">${y}</text>`);
}

const cutsFile = "art/cuts/hammer-body.json";
if (!bare && existsSync(cutsFile)) {
  const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
  const colors = { torso: "#ff3b3b", armNear: "#ffd23b", armFar: "#3bb0ff", legNear: "#ff7ad9", legFar: "#3bfff0" };
  const layers = { ...(cuts.layers ?? {}), ...(cuts.overrides?.[costume]?.layers ?? {}) };
  for (const [name, layer] of Object.entries(layers)) {
    const c = colors[name] ?? "#ffffff";
    for (const poly of [layer.polygon, layer.hidden].filter(Boolean)) {
      const pts = poly.map(([x, y]) => `${px(x)},${py(y)}`).join(" ");
      shapes.push(`<polygon points="${pts}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="${poly === layer.hidden ? "6 4" : ""}"/>`);
    }
  }
  const joints = cuts.rig?.joints ?? {};
  for (const [a, b] of cuts.rig?.bones ?? []) {
    if (!joints[a] || !joints[b]) continue;
    shapes.push(
      `<line x1="${px(joints[a][0])}" y1="${py(joints[a][1])}" x2="${px(joints[b][0])}" y2="${py(joints[b][1])}" stroke="#ffffff" stroke-width="2"/>`,
    );
  }
  for (const [name, [x, y]] of Object.entries(joints)) {
    shapes.push(`<circle cx="${px(x)}" cy="${py(y)}" r="5" fill="#ff00ff" stroke="#000" stroke-width="1"/>`);
    shapes.push(`<text x="${px(x) + 7}" y="${py(y) - 5}" font-size="12" font-family="monospace" fill="#ff00ff" stroke="#000" stroke-width="0.4">${name}</text>`);
  }
}

const base = await sharp(keyed.png)
  .extract({ left: x0, top: y0, width: w, height: h })
  .resize({ width: W, height: H, kernel: "nearest" })
  .flatten({ background: "#2a2f3a" })
  .png()
  .toBuffer();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes.join("")}</svg>`;
mkdirSync("artifacts", { recursive: true });
const out = `artifacts/grid-${costume}.png`;
await sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(out);
console.log(`${out}: crop ${keyed.width}x${keyed.height}, region ${x0},${y0} ${w}x${h} at ${scale}x`);
