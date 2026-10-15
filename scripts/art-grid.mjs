// Zooms into a keyed body plate with a labelled grid in the keyed crop's pixels, for measuring
// joints and cut lines by eye. The rig's joints, bones and layer outlines (fills dashed) from the
// body's cut file are drawn over it when they exist: art/cuts/hammer-body.json for Hammer's
// costumes, art/cuts/cast-<person>.json for a cast painting, art/cuts/pig.json for the pig.
// A venue's wall is named wall/<name>: its painting as it is (no green to key), its cut's seams red and its floor line cyan.
// The banquet: banquet/room is the ballroom as painted (its cut's table middle a cross, its span a line); banquet/table the
// keyed table (its top's oval).
// Usage: node scripts/art-grid.mjs <costume | cast/<person> | pig | wall/<name> | banquet/room | banquet/table> [x y w h] [scale] [--bare]
//   writes artifacts/grid-<costume>.png, artifacts/grid-cast-<person>.png, artifacts/grid-pig.png, artifacts/grid-wall-<name>.png
//   or artifacts/grid-banquet-<room | table>.png
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { keyOut } from "./art-cut.mjs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const bare = process.argv.includes("--bare");
const target = args[0] ?? "affliction";
// A cast painting is named cast/<person>: its plate and its own cut file.
const person = target.startsWith("cast/") ? target.slice(5) : null;
const wall = target.startsWith("wall/") ? target.slice(5) : null;
const pig = target === "pig";
const banquetTarget = target.startsWith("banquet/") ? target.slice(8) : null;
const banquetFile = banquetTarget === "room" ? "art/incoming/backdrops/ballroom.png" : banquetTarget === "table" ? "art/incoming/props/banquet-table.png" : null;
const rawPng = wall ? readFileSync(`art/incoming/backdrops/${wall}.png`) : banquetTarget === "room" ? readFileSync(banquetFile) : null;
const keyed = rawPng
  ? { png: rawPng, ...(await sharp(rawPng).metadata()) }
  : await keyOut(
      readFileSync(banquetTarget === "table" ? banquetFile : pig ? "art/incoming/pig/pig-body.png" : person ? `art/incoming/cast/${person}.png` : `art/incoming/hammer/body-${target}.png`),
    );
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

const wallCut = wall ? `art/cuts/wall-${wall}.json` : null;
if (!bare && wallCut && existsSync(wallCut)) {
  const cut = JSON.parse(readFileSync(wallCut, "utf8"));
  for (const s of cut.seams) shapes.push(`<line x1="${px(s)}" y1="0" x2="${px(s)}" y2="${H}" stroke="#ff3b3b" stroke-width="3"/>`);
  shapes.push(`<line x1="0" y1="${py(cut.floor)}" x2="${W}" y2="${py(cut.floor)}" stroke="#3bfff0" stroke-width="3"/>`);
}
if (!bare && banquetTarget === "room" && existsSync("art/cuts/ballroom.json")) {
  const cut = JSON.parse(readFileSync("art/cuts/ballroom.json", "utf8"));
  const [cx, cy] = cut.table;
  shapes.push(`<line x1="${px(cx - 30)}" y1="${py(cy)}" x2="${px(cx + 30)}" y2="${py(cy)}" stroke="#ff3b3b" stroke-width="3"/>`, `<line x1="${px(cx)}" y1="${py(cy - 30)}" x2="${px(cx)}" y2="${py(cy + 30)}" stroke="#ff3b3b" stroke-width="3"/>`);
  shapes.push(`<line x1="${px(cx - cut.span / 2)}" y1="${py(cy)}" x2="${px(cx + cut.span / 2)}" y2="${py(cy)}" stroke="#3bfff0" stroke-width="2"/>`);
}
if (!bare && banquetTarget === "table" && existsSync("art/cuts/banquet-table.json")) {
  const { center, radii } = JSON.parse(readFileSync("art/cuts/banquet-table.json", "utf8")).top;
  shapes.push(`<ellipse cx="${px(center[0])}" cy="${py(center[1])}" rx="${radii[0] * scale}" ry="${radii[1] * scale}" fill="none" stroke="#ff3b3b" stroke-width="3"/>`);
}
const cutsFile = pig ? "art/cuts/pig.json" : person ? `art/cuts/cast-${person}.json` : "art/cuts/hammer-body.json";
if (!bare && !wall && !banquetTarget && existsSync(cutsFile)) {
  const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
  const colors = { head: "#c08cff", torso: "#ff3b3b", armNear: "#ffd23b", armFar: "#3bb0ff", legNear: "#ff7ad9", legFar: "#3bfff0", tail: "#ffffff" };
  const layers = { ...(cuts.layers ?? {}), ...(person || pig ? {} : (cuts.overrides?.[target]?.layers ?? {})) };
  const outline = (poly, c, dashed) => {
    const pts = poly.map(([x, y]) => `${px(x)},${py(y)}`).join(" ");
    shapes.push(`<polygon points="${pts}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="${dashed ? "6 4" : ""}"/>`);
  };
  for (const [name, layer] of Object.entries(layers)) {
    const c = colors[name] ?? "#ffffff";
    if (layer.polygon) outline(layer.polygon, c, false);
    if (layer.hidden) outline(layer.hidden, c, true);
    for (const f of layer.fill ?? []) outline(Array.isArray(f) ? f : f.polygon, c, true);
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
const out = `artifacts/grid-${person ? `cast-${person}` : wall ? `wall-${wall}` : banquetTarget ? `banquet-${banquetTarget}` : target}.png`;
await sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(out);
console.log(`${out}: crop ${keyed.width}x${keyed.height}, region ${x0},${y0} ${w}x${h} at ${scale}x`);
