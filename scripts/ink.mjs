// Ink filter for photos used as far planes until owner backdrops exist:
// median blur, a 12-level posterize, Sobel edges painted black, then lifted
// and desaturated so the result sits behind full-contrast characters.
// Usage: node scripts/ink.mjs <input image> <output png> [width=1920]
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export async function ink(input, output, width = 1920) {
  const base = sharp(input).resize({ width }).median(5);
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  // Posterize to 12 levels per channel.
  const post = Buffer.alloc(W * H * 3);
  for (let i = 0, j = 0; i < data.length; i += C, j += 3)
    for (let k = 0; k < 3; k++) post[j + k] = Math.round(Math.round(data[i + k] / 23.2) * 23.2);

  // Sobel on luminance.
  const lum = new Float32Array(W * H);
  for (let i = 0, p = 0; i < data.length; i += C, p++)
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const edge = new Uint8Array(W * H);
  const threshold = 0.3 * 255 * 4;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const at = (dx, dy) => lum[(y + dy) * W + (x + dx)];
      const gx = -at(-1, -1) - 2 * at(-1, 0) - at(-1, 1) + at(1, -1) + 2 * at(1, 0) + at(1, 1);
      const gy = -at(-1, -1) - 2 * at(0, -1) - at(1, -1) + at(-1, 1) + 2 * at(0, 1) + at(1, 1);
      if (Math.hypot(gx, gy) > threshold) edge[y * W + x] = 1;
    }
  // Dilate the edges to 3 px and paint them.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let hit = false;
      for (let dy = -1; dy <= 1 && !hit; dy++)
        for (let dx = -1; dx <= 1 && !hit; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && xx < W && yy >= 0 && yy < H && edge[yy * W + xx]) hit = true;
        }
      if (hit) {
        const j = (y * W + x) * 3;
        post[j] = 16;
        post[j + 1] = 16;
        post[j + 2] = 16;
      }
    }
  mkdirSync(dirname(output), { recursive: true });
  await sharp(post, { raw: { width: W, height: H, channels: 3 } })
    .modulate({ saturation: 0.8 })
    .linear(0.9, 25)
    .png()
    .toFile(output);
  return { width: W, height: H };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [input, output, widthArg = "1920"] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/ink.mjs <input> <output.png> [width]");
    process.exit(2);
  }
  const { width, height } = await ink(input, output, Number(widthArg));
  console.log(`wrote ${output} (${width}x${height})`);
}
