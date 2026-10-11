import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  keyOut,
  registerHead,
  registerAligned,
  alignTo,
  gateExpression,
  pushPullFill,
  separateLayers,
  buildMesh,
  skinWeights,
  LAYER_Z,
} from "./art-cut.mjs";

/** A green canvas with a filled circle and a 'neck' stub at the bottom. */
async function plate(dx = 0, dy = 0, scale = 1, { fill = "#b5642a", stub = 60, height = 400 } = {}) {
  const r = 100 * scale;
  const svg = `<svg width="400" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="${height}" fill="#00ff00"/>
    <circle cx="${200 + dx}" cy="${180 + dy}" r="${r}" fill="${fill}" stroke="#101010" stroke-width="6"/>
    <rect x="${180 + dx}" y="${270 + dy}" width="40" height="${stub}" fill="${fill}" stroke="#101010" stroke-width="6"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

test("near-black ink is not green: a (0,3,0) fill survives the key", async () => {
  const { png, width, height } = await keyOut(await plate(0, 0, 1, { fill: "#000300" }));
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
  const c = at(Math.round(width / 2), Math.round(height * 0.45));
  assert.equal(c[3], 255, `the dark fill stays opaque: alpha ${c[3]}`);
  assert.equal(at(0, 0)[3], 0, "the green is still keyed");
});

test("a reframed expression plate takes its anchors from the neutral through the alignment", async () => {
  const neutral = await keyOut(await plate());
  const taller = await keyOut(await plate(0, 0, 1, { stub: 130, height: 470 }));
  const ref = await registerHead(neutral.png, "profile");
  const a = await alignTo(neutral.png, taller.png);
  assert.ok(a.overlap >= 0.85, `a longer neck stub still passes the gate: ${a.overlap}`);
  const reg = registerAligned(ref, a, { width: taller.width, height: taller.height });
  assert.equal(reg.width, taller.width);
  assert.ok(Math.abs(reg.face.y - ref.face.y) <= 4, `face box stays put: ${reg.face.y} vs ${ref.face.y}`);
  assert.ok(Math.abs(reg.face.h - ref.face.h) <= 4, `face box keeps its height: ${reg.face.h} vs ${ref.face.h}`);
  assert.ok(Math.abs(reg.neck.y - ref.neck.y) <= 4, `the head still attaches where the neutral does: ${reg.neck.y}`);
});

test("the expression gate skips a misaligned plate in a dev run and refuses it when strict", () => {
  assert.equal(gateExpression(0.9), "ok");
  assert.equal(gateExpression(0.8), "skip");
  assert.equal(gateExpression(0.8, { strict: true }), "refuse");
});

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
  const names = files.map(([f]) => f);
  assert.ok(names.some((f) => f.endsWith(".txt")), "the prompts beside the plates are guarded too");
  assert.ok(names.includes("art/incoming/hammer/manifest.json"), "the batch manifest is guarded");
  assert.ok(names.includes("public/absolute-bullshit.mp3"), "the recording is guarded");
  for (const [file, sha] of files) {
    assert.ok(existsSync(file), `${file} exists`);
    assert.equal(
      createHash("sha256").update(readFileSync(file)).digest("hex"),
      sha,
      `${file} unchanged`,
    );
  }
});

const CUTS = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8"));
let affliction;
const layersOf = async () =>
  (affliction ??= await separateLayers(await keyOut(readFileSync("art/incoming/hammer/body-affliction.png")), CUTS));
/** The layers with the keyed painting they were cut from. */
const layersWithPainting = async () => {
  const keyed = await keyOut(readFileSync("art/incoming/hammer/body-affliction.png"));
  const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { ...(await layersOf()), data };
};

test("push-pull paints a hole in a gradient from its edges", () => {
  const W = 64,
    H = 32;
  const rgba = Buffer.alloc(W * H * 4);
  const known = new Uint8Array(W * H),
    target = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const hole = x >= 20 && x < 44 && y >= 8 && y < 24;
      if (hole) target[i] = 1;
      else {
        known[i] = 1;
        rgba.set([x * 4, 100, 200 - x * 2, 255], i * 4);
      }
    }
  pushPullFill(rgba, W, H, known, target);
  for (let i = 0; i < W * H; i++) {
    if (!target[i]) continue;
    assert.equal(rgba[i * 4 + 3], 255, "every hole pixel is painted");
    assert.ok(rgba[i * 4] >= 76 && rgba[i * 4] <= 176, `red ${rgba[i * 4]} stays within the edges' range`);
  }
  const mid = (16 * W + 32) * 4;
  assert.ok(Math.abs(rgba[mid] - 128) < 24, `the middle follows the gradient: ${rgba[mid]}`);
});

test("the layers split the painted body and put it back together exactly at rest", async () => {
  const keyed = await keyOut(readFileSync("art/incoming/hammer/body-affliction.png"));
  const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { W, H, layers, owner } = await layersOf();
  let wrong = 0,
    extra = 0,
    owned = 0;
  for (let i = 0; i < W * H; i++) {
    let top = null;
    for (const name of LAYER_Z) if (layers[name].rgba[i * 4 + 3] > 0) top = name;
    if (owner[i] < 0) {
      if (top) extra++;
      continue;
    }
    owned++;
    const px = layers[top].rgba.subarray(i * 4, i * 4 + 4);
    if (px[0] !== data[i * 4] || px[1] !== data[i * 4 + 1] || px[2] !== data[i * 4 + 2] || px[3] !== data[i * 4 + 3])
      wrong++;
  }
  assert.ok(owned > 300000, `the layers take the body: ${owned} pixels`);
  assert.equal(wrong, 0, "the frontmost layer shows the painted pixel");
  assert.equal(extra, 0, "nothing is drawn where the painting is empty");
});

test("the torso runs on behind the near arm, the far arm behind the torso, and neither past its outline", async () => {
  const { W, layers } = await layersOf();
  const at = (name, x, y) => layers[name].rgba.subarray((y * W + x) * 4, (y * W + x) * 4 + 4);
  const shirt = at("torso", 240, 700);
  assert.equal(shirt[3], 255, "the shirt is painted in behind the forearm");
  assert.ok(shirt[0] + shirt[1] + shirt[2] < 3 * 90, `and it is dark like the shirt: ${[...shirt]}`);
  assert.equal(at("torso", 150, 880)[3], 0, "nothing of the torso in front of the belly, behind the hand");
  const arm = at("armFar", 300, 540);
  assert.equal(arm[3], 255, "the far arm continues behind the torso");
  assert.ok(arm[0] > arm[2] + 40, `in skin tones: ${[...arm]}`);
  assert.equal(at("armNear", 330, 470)[3], 0, "the near arm keeps none of the sleeve");
  assert.equal(at("armNear", 160, 880)[3], 255, "the near arm keeps its hand");
});

test("the far arm's hidden upper arm is the near arm's sleeve and skin carried over, not a stretched plank", async () => {
  const { W, layers, data } = await layersWithPainting();
  const j = CUTS.rig.joints;
  const frame = (a, b) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L = Math.hypot(dx, dy);
    return { a, dx, dy, nx: -dy / L, ny: dx / L };
  };
  const along = (f, t, s = 0) => [Math.round(f.a[0] + f.dx * t + f.nx * s), Math.round(f.a[1] + f.dy * t + f.ny * s)];
  const far = frame(j.shoulderFar, j.elbowFar);
  const near = frame(j.shoulderNear, j.elbowNear);
  const arm = (x, y) => layers.armFar.rgba.subarray((y * W + x) * 4, (y * W + x) * 4 + 4);
  const painted = (x, y) => data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4);
  const luma = (p) => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
  const isSkin = (p) => p[0] > p[2] + 40;
  // Near the shoulder the T-shirt's sleeve comes along with the arm.
  const sleeve = arm(...along(far, 0.35));
  assert.equal(sleeve[3], 255, "the far upper arm is painted near the shoulder");
  assert.ok(!isSkin(sleeve), `the sleeve is cloth, not skin: ${[...sleeve]}`);
  // Below the hem it is painted skin, shaded along the arm the way the near arm is;
  // a cross-section stretched along the bone would hardly change from end to end.
  const ts = Array.from({ length: 12 }, (_, k) => 0.68 + k * 0.02);
  const spread = (ps) => {
    const ls = ps.map(luma);
    const m = ls.reduce((a, b) => a + b, 0) / ls.length;
    return Math.sqrt(ls.reduce((a, b) => a + (b - m) ** 2, 0) / ls.length);
  };
  const farSkin = ts.map((t) => arm(...along(far, t)));
  const nearSkin = ts.map((t) => painted(...along(near, t)));
  for (const p of farSkin) assert.ok(p[3] === 255 && isSkin(p), `skin below the hem: ${[...p]}`);
  assert.ok(spread(nearSkin) > 2, `the near arm is shaded along its length: ${spread(nearSkin).toFixed(1)}`);
  assert.ok(
    spread(farSkin) > spread(nearSkin) / 2,
    `the far arm is shaded like it: ${spread(farSkin).toFixed(1)} against ${spread(nearSkin).toFixed(1)}`,
  );
  // The belly's ink line, painted over the forearm where it goes behind the shirt, stays with the
  // shirt: a raised arm carries no stripe of it. The line runs in the 5 px nearest the shirt's
  // edge (x 195 to 197 here); further out are the forearm's own top and bottom outlines.
  let ink = 0;
  for (let y = 552; y <= 700; y++)
    for (let x = 191; x <= 195; x++) {
      const i = y * W + x;
      if (layers.armFar.visible[i] && luma(layers.armFar.rgba.subarray(i * 4, i * 4 + 4)) < 50) ink++;
    }
  assert.equal(ink, 0, "no ink of the belly's outline is left on the far forearm");
});

test("the Affliction shirt's word is reversed along its banner for facing right, and nothing else changes", async () => {
  const { W, H, layers } = await layersOf();
  const mirror = layers.torso.variants.mirror;
  assert.ok(mirror, "the torso has a mirror variant");
  const [TL, TR, BR, BL] = CUTS.overrides.affliction.layers.torso.variants.mirror.reverse.quad;
  // How far along the banner a pixel is, from its left side to its right side on that row.
  const side = (a, b, y) => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  const along = (x, y) => (x - side(TL, BL, y)) / (side(TR, BR, y) - side(TL, BL, y));
  const inBox = (x, y) => y >= Math.min(TL[1], TR[1]) && y <= Math.max(BL[1], BR[1]) && along(x, y) >= 0 && along(x, y) <= 1;
  const base = layers.torso.rgba;
  const white = (buf, i) => Math.min(buf[i * 4], buf[i * 4 + 1], buf[i * 4 + 2]) > 140 && buf[i * 4 + 3] > 0;
  let outside = 0;
  // Where the lettering starts and ends along the banner (its 5th and 95th percentiles),
  // which stretching a letter to the banner's height at its new place does not move.
  const letters = (buf) => {
    const at = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if (inBox(x, y) && white(buf, y * W + x)) at.push(along(x, y));
    at.sort((a, b) => a - b);
    return { n: at.length, from: at[Math.floor(at.length * 0.05)], to: at[Math.floor(at.length * 0.95)] };
  };
  for (let i = 0; i < W * H; i++) {
    const x = i % W,
      y = (i - x) / W;
    if (inBox(x, y)) continue;
    if (base[i * 4] !== mirror[i * 4] || base[i * 4 + 1] !== mirror[i * 4 + 1] || base[i * 4 + 2] !== mirror[i * 4 + 2] || base[i * 4 + 3] !== mirror[i * 4 + 3])
      outside++;
  }
  assert.equal(outside, 0, "outside the banner the mirror is the shirt, pixel for pixel");
  const before = letters(base),
    after = letters(mirror);
  assert.ok(before.n > 300, `the painting has its lettering: ${before.n} white pixels`);
  // The word runs the other way along the banner, so mirrored it reads the right way round.
  const span = (l) => `${l.from.toFixed(2)} to ${l.to.toFixed(2)}`;
  assert.ok(
    Math.abs(after.from - (1 - before.to)) < 0.06 && Math.abs(after.to - (1 - before.from)) < 0.06,
    `the lettering runs ${span(before)} along the banner, then ${span(after)}`,
  );
  assert.ok(after.n > before.n * 0.7 && after.n < before.n * 1.4, `as much lettering: ${before.n} then ${after.n}`);
  assert.equal(CUTS.layers.torso.variants?.mirror, undefined, "only the Affliction shirt has a word to reverse");
});

test("a layer's mesh covers every pixel it paints", async () => {
  const { W, H, layers } = await layersOf();
  for (const name of LAYER_Z) {
    const alpha = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = layers[name].rgba[i * 4 + 3] > 0 ? 1 : 0;
    const mesh = buildMesh(alpha, W, H, 14);
    const covered = new Set();
    for (let t = 0; t < mesh.indices.length; t += 6) {
      const x = mesh.positions[mesh.indices[t] * 2],
        y = mesh.positions[mesh.indices[t] * 2 + 1];
      covered.add(`${Math.round((x - mesh.x0) / mesh.cell)},${Math.round((y - mesh.y0) / mesh.cell)}`);
    }
    let missed = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (alpha[y * W + x] && !covered.has(`${Math.floor((x - mesh.x0) / mesh.cell)},${Math.floor((y - mesh.y0) / mesh.cell)}`))
          missed++;
    assert.equal(missed, 0, `${name}: every painted pixel lies in a cell of the mesh`);
  }
});

test("skin weights sum to one, follow the limb, and blend at the elbow", async () => {
  const rig = CUTS.rig;
  const boneId = (p, c) => rig.bones.findIndex(([a, b]) => a === p && b === c);
  const positions = [rig.joints.handNear[0], rig.joints.handNear[1], ...rig.joints.elbowNear, 300, 560, 212, 800];
  const { bones, weights } = skinWeights(positions, rig, "armNear");
  for (let v = 0; v < positions.length / 2; v++) {
    const sum = [0, 1, 2, 3].reduce((s, k) => s + weights[v * 4 + k], 0);
    assert.ok(Math.abs(sum - 1) < 1e-6, `vertex ${v} weights sum to ${sum}`);
  }
  const weightOf = (v, bone) => [0, 1, 2, 3].reduce((s, k) => s + (bones[v * 4 + k] === bone ? weights[v * 4 + k] : 0), 0);
  assert.equal(weightOf(0, boneId("knuckleNear", "handNear")), 1, "the fingertips follow the fingers");
  const upper = weightOf(1, boneId("shoulderNear", "elbowNear")),
    fore = weightOf(1, boneId("elbowNear", "wristNear"));
  assert.ok(upper > 0.3 && fore > 0.3, `the elbow blends upper arm ${upper} and forearm ${fore}`);
  assert.equal(weightOf(2, boneId("shoulderNear", "elbowNear")), 1, "the biceps follows the upper arm");
  assert.ok(weightOf(3, boneId("wristNear", "knuckleNear")) > 0.9, "the back of the hand follows the hand");
  const torso = skinWeights([300, 880, 400, 330], rig, "torso");
  assert.equal(torso.bones[0], boneId("pelvis", "hipNear"), "the waistband follows the hips");
  assert.equal(torso.weights[0], 1);
  assert.equal(torso.bones[4], boneId("chest", "neck"), "the collar follows the chest");
});

test("no costume loses a painted pixel below the collar", async () => {
  for (const costume of ["affliction", "scrubs", "suit", "banquet"]) {
    const keyed = await keyOut(readFileSync(`art/incoming/hammer/body-${costume}.png`));
    const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { W, H, owner } = await separateLayers(keyed, CUTS, costume);
    let lost = 0;
    const where = new Map();
    for (let y = 340; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (data[i * 4 + 3] < 128 || owner[i] >= 0) continue;
        lost++;
        const k = `${Math.floor(x / 50) * 50},${Math.floor(y / 50) * 50}`;
        where.set(k, (where.get(k) ?? 0) + 1);
      }
    const worst = [...where].sort((a, b) => b[1] - a[1]).slice(0, 4);
    assert.ok(lost < 40, `${costume}: ${lost} painted pixels belong to no layer, most near ${JSON.stringify(worst)}`);
  }
});

test("the near hand's fist folds the fingers away and inks the new edge", async () => {
  const { W, layers } = await layersOf();
  const open = layers.armNear.rgba,
    fist = layers.armNear.variants.fist;
  const a = (buf, x, y) => buf[(y * W + x) * 4 + 3];
  const rgb = (buf, x, y) => [...buf.subarray((y * W + x) * 4, (y * W + x) * 4 + 3)];
  for (const [x, y] of [[138, 888], [155, 901], [176, 901], [200, 891], [129, 846]])
    assert.ok(a(open, x, y) > 0 && a(fist, x, y) === 0, `fingertip or thumb tip at ${x},${y} is folded away`);
  for (const [x, y] of [[174, 807], [196, 816], [216, 823], [228, 778]])
    assert.deepEqual(rgb(fist, x, y), rgb(open, x, y), `knuckle or wrist at ${x},${y} keeps its paint`);
  let ink = 0;
  for (let x = 150; x < 240; x++)
    for (let y = 810; y < 860; y++) {
      const [r, g, b] = rgb(fist, x, y);
      if (a(fist, x, y) === 255 && r < 30 && g < 30 && b < 30 && a(open, x, y) === 255) ink++;
    }
  assert.ok(ink > 150, `the fist's front edge is outlined: ${ink} ink pixels`);
});


test("a profile head registers its nose tip at the face box's front edge", async () => {
  const { png } = await keyOut(readFileSync("art/incoming/hammer/head-profile.png"));
  const reg = await registerHead(png, "profile");
  assert.equal(reg.nose.x, reg.face.x, "the nose is the leftmost point");
  assert.ok(reg.nose.y > reg.face.y && reg.nose.y < reg.face.y + reg.face.h * 0.7, `nose height ${reg.nose.y}`);
});

