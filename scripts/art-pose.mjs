// Lays a new cast painting over Hammer's body plate on their shared canvas, to accept or refuse it:
// prints the canvas, the keyed crop's offset (cut files are in the crop's pixels), where the soles
// and the crown land against his, and how flat the green is; writes artifacts/pose-<person>.png
// (the painting red, Hammer blue, overlap purple) and artifacts/pose-grid-<person>.png (the
// painting with Hammer's painted skeleton over it, a 50 px grid in canvas pixels).
// Usage: node scripts/art-pose.mjs <person>
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { keyOut } from "./art-cut.mjs";

const person = process.argv[2];
if (!person) throw new Error("usage: node scripts/art-pose.mjs <person>");
const file = `art/incoming/cast/${person}.png`;
const hammerFile = "art/incoming/hammer/body-affliction.png";
const cuts = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8"));
const meta = await sharp(file).metadata();
const hmeta = await sharp(hammerFile).metadata();
const W = meta.width,
  H = meta.height;
const keyed = await keyOut(readFileSync(file));
const hk = await keyOut(readFileSync(hammerFile));
const box = (k) => [k.bbox.x0 + k.offset.x, k.bbox.y0 + k.offset.y, k.bbox.x1 + k.offset.x, k.bbox.y1 + k.offset.y];
console.log(`canvas ${W}x${H} (Hammer's ${hmeta.width}x${hmeta.height})`);
console.log(`crop offset ${keyed.offset.x},${keyed.offset.y} (Hammer's ${hk.offset.x},${hk.offset.y}); a cut file's pixels are the crop's`);
console.log(`painted box ${box(keyed)}; Hammer's ${box(hk)}`);
const { data } = await sharp(readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const corners = [0, W - 1, (H - 1) * W, H * W - 1].map((i) => [...data.subarray(i * 4, i * 4 + 3)]);
console.log(`green corners ${JSON.stringify(corners)}`);
/** A keyed crop's alpha placed back on the full canvas. */
const onCanvas = async (k) => {
  const { data: d, info } = await sharp(k.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = new Uint8Array(W * H);
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const sx = x + k.offset.x,
        sy = y + k.offset.y;
      if (sx < W && sy < H) a[sy * W + sx] = d[(y * info.width + x) * 4 + 3];
    }
  return a;
};
const ca = await onCanvas(keyed);
const ha = await onCanvas(hk);
const lowest = (a, x0, x1) => {
  for (let y = H - 1; y >= 0; y--) for (let x = x0; x < x1; x++) if (a[y * W + x] > 128) return y;
  return -1;
};
console.log(`lowest painted row ${lowest(ca, 0, W)} (Hammer's ${lowest(ha, 0, W)})`);
const ov = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const c = ca[i] > 128,
    h = ha[i] > 128;
  ov.set(c && h ? [150, 60, 200, 255] : c ? [230, 60, 60, 255] : h ? [60, 120, 240, 255] : [30, 32, 40, 255], i * 4);
}
mkdirSync("artifacts", { recursive: true });
await sharp(ov, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`artifacts/pose-${person}.png`);
const J = Object.fromEntries(Object.entries(cuts.rig.joints).map(([k, [x, y]]) => [k, [x + hk.offset.x, y + hk.offset.y]]));
const shapes = [];
for (let x = 0; x <= W; x += 50) shapes.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#39ff6a" stroke-opacity="${x % 100 ? 0.25 : 0.6}"/>`);
for (let y = 0; y <= H; y += 50) shapes.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#39ff6a" stroke-opacity="${y % 100 ? 0.25 : 0.6}"/>`);
for (const [a, b] of cuts.rig.bones) shapes.push(`<line x1="${J[a][0]}" y1="${J[a][1]}" x2="${J[b][0]}" y2="${J[b][1]}" stroke="#00e5ff" stroke-width="3"/>`);
for (const [n, [x, y]] of Object.entries(J))
  shapes.push(`<circle cx="${x}" cy="${y}" r="6" fill="#00e5ff" stroke="#000"/><text x="${x + 8}" y="${y - 6}" font-size="13" font-family="monospace" fill="#00e5ff">${n}</text>`);
const base = await sharp({ create: { width: W, height: H, channels: 4, background: "#2a2f3a" } })
  .composite([{ input: keyed.png, left: keyed.offset.x, top: keyed.offset.y }])
  .png()
  .toBuffer();
await sharp(base)
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes.join("")}</svg>`), left: 0, top: 0 }])
  .png()
  .toFile(`artifacts/pose-grid-${person}.png`);
console.log(`wrote artifacts/pose-${person}.png and artifacts/pose-grid-${person}.png`);
