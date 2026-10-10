import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { keyOut, registerHead, alignTo } from "./art-cut.mjs";

/** A green canvas with a filled dark circle and a 'neck' stub at the bottom. */
async function plate(dx = 0, dy = 0, scale = 1) {
  const r = 100 * scale;
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#00ff00"/>
    <circle cx="${200 + dx}" cy="${180 + dy}" r="${r}" fill="#b5642a" stroke="#101010" stroke-width="6"/>
    <rect x="${180 + dx}" y="${270 + dy}" width="40" height="60" fill="#b5642a" stroke="#101010" stroke-width="6"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

test("keying removes the green, keeps outlines and crops to the subject with a margin", async () => {
  const { png, bbox, width, height } = await keyOut(await plate());
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  const at = (x, y) => data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
  assert.equal(at(0, 0)[3], 0, "corner is transparent");
  const cx = Math.round(width / 2),
    cy = Math.round(height / 2);
  assert.equal(at(cx, cy)[3], 255, "the subject is opaque");
  assert.ok(bbox.x1 - bbox.x0 > 200 && bbox.x1 - bbox.x0 < 240, `bbox width ${bbox.x1 - bbox.x0}`);
  assert.ok(Math.abs(width - (bbox.x1 - bbox.x0 + 16)) <= 1, "8 px margin each side");
  let greenish = 0;
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] > 0 && data[i + 1] > 180 && data[i] < 100 && data[i + 2] < 100) greenish++;
  assert.equal(greenish, 0, "no green left in opaque pixels");
});

test("a head plate registers its neck, crown and face box", async () => {
  const { png } = await keyOut(await plate());
  const reg = await registerHead(png, "profile");
  assert.ok(Math.abs(reg.crown.y - 8) <= 2, `crown at the top: ${reg.crown.y}`);
  assert.ok(reg.neck.y > reg.height - 12, `neck at the bottom: ${reg.neck.y} of ${reg.height}`);
  assert.ok(
    reg.face.y >= reg.crown.y && reg.face.y + reg.face.h <= reg.neck.y,
    "face box inside the plate",
  );
});

test("a shifted copy of a plate passes the alignment gate; a different silhouette is refused", async () => {
  // keyOut crops each plate to its own subject, so a shift in the source leaves no offset.
  const neutral = (await keyOut(await plate())).png;
  const shifted = (await keyOut(await plate(9, -6))).png;
  const a = await alignTo(neutral, shifted);
  assert.ok(a.overlap > 0.92, `overlap ${a.overlap}`);
  assert.ok(Math.abs(a.dx) <= 2 && Math.abs(a.dy) <= 2, `residual offset ${a.dx},${a.dy}`);
  const other = (await keyOut(await plate(0, 0, 0.6))).png;
  const b = await alignTo(neutral, other);
  assert.ok(b.overlap < 0.85, "a different silhouette does not pass");
});

test("every owner file still matches art/manifest.json", () => {
  const manifest = JSON.parse(readFileSync("art/manifest.json", "utf8"));
  const files = Object.entries(manifest.files);
  assert.ok(files.length >= 24, `manifest lists ${files.length} files`);
  for (const [file, sha] of files) {
    assert.ok(existsSync(file), `${file} exists`);
    assert.equal(
      createHash("sha256").update(readFileSync(file)).digest("hex"),
      sha,
      `${file} unchanged`,
    );
  }
});
