import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFileSync, existsSync, readdirSync } from "node:fs";
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
  layerZ,
  layerOrder,
  bodyLayers,
  castRig,
  hatBase,
  recolorMask,
  maskMean,
  recolorLayer,
  wallCrop,
  sheetPieces,
  foodCells,
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

test("the shirt keeps no neck above its collar, so the head's own neck runs into it", async () => {
  const { W, layers } = await layersOf();
  const at = (x, y) => layers.torso.rgba.subarray((y * W + x) * 4, (y * W + x) * 4 + 4);
  // The painted neck's flap above the collar's front: the orange triangle under his jaw.
  for (const [x, y] of [[300, 300], [320, 290], [340, 282], [360, 275], [284, 277], [298, 320], [322, 312], [342, 297]])
    assert.equal(at(x, y)[3], 0, `no neck skin left at ${x},${y}: ${[...at(x, y)]}`);
  // The collar's ink line stays with the shirt.
  for (const [x, y] of [[326, 313], [362, 287], [380, 276]]) {
    const p = at(x, y);
    assert.ok(p[3] > 0 && p[0] + p[1] + p[2] < 3 * 70, `the collar's ink at ${x},${y}: ${[...p]}`);
  }
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


const CAST_IN = "art/incoming/cast";
const PERSONS = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2", "cook-1", "busser-1", "lunch-1", "prof-1"];
/** The cast bodies with a painting and a cut: every cast check runs on each. */
const CAST_CUT = PERSONS.filter((p) => existsSync(`${CAST_IN}/${p}.png`) && existsSync(`art/cuts/cast-${p}.json`));
const castCache = new Map();
/** A cast body keyed and cut, with its painting's pixels. */
const castOf = async (person) => {
  if (!castCache.has(person)) {
    const keyed = await keyOut(readFileSync(`${CAST_IN}/${person}.png`));
    const cuts = JSON.parse(readFileSync(`art/cuts/cast-${person}.json`, "utf8"));
    const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    castCache.set(person, { keyed, cuts, data, ...(await separateLayers(keyed, cuts)) });
  }
  return castCache.get(person);
};

test("the first bellhop is cut, and every cut cast body is its painting put back together at rest, nothing lost", async () => {
  assert.ok(CAST_CUT.includes("bellhop-1"), "bellhop-1 has its cut file");
  for (const person of CAST_CUT) {
    const { W, H, layers, owner, data, cuts } = await castOf(person);
    const z = layerZ(cuts);
    assert.deepEqual(z, ["armFar", "legFar", "legNear", "head", "torso", "armNear"]);
    let wrong = 0,
      extra = 0,
      lost = 0;
    for (let i = 0; i < W * H; i++) {
      let top = null;
      for (const name of z) if (layers[name].rgba[i * 4 + 3] > 0) top = name;
      if (owner[i] < 0) {
        if (top) extra++;
        if (data[i * 4 + 3] >= 128) lost++;
        continue;
      }
      const px = layers[top].rgba.subarray(i * 4, i * 4 + 4);
      if (px[0] !== data[i * 4] || px[1] !== data[i * 4 + 1] || px[2] !== data[i * 4 + 2] || px[3] !== data[i * 4 + 3]) wrong++;
    }
    assert.equal(wrong, 0, `${person}: the frontmost layer shows the painted pixel`);
    assert.equal(extra, 0, `${person}: nothing is drawn where the painting is empty`);
    assert.ok(lost < 40, `${person}: ${lost} painted pixels belong to no layer`);
  }
});

test("each cast body's neck runs on under its collar, out of sight at rest", async () => {
  for (const person of CAST_CUT) {
    const { W, layers, cuts } = await castOf(person);
    const [nx, ny] = cuts.rig.joints.neck;
    let under = 0,
      shown = 0;
    // From 18 px down: the collar's top edge slopes, and above it at the throat the neck shows as painted.
    for (let y = ny + 18; y < ny + 44; y++)
      for (let x = nx - 30; x <= nx + 30; x++) {
        const i = y * W + x;
        if (layers.head.rgba[i * 4 + 3] === 0) continue;
        under++;
        if (layers.torso.rgba[i * 4 + 3] === 0) shown++;
      }
    assert.ok(under > 400, `${person}: the neck runs on under the collar (${under} px)`);
    assert.ok(shown < under * 0.15, `${person}: and the collar covers it (${shown} of ${under} show)`);
  }
});

test("each cast body's layers are meshed and skinned: every painted pixel in a cell, weights summing to one", async () => {
  for (const person of CAST_CUT) {
    const { W, H, layers, cuts } = await castOf(person);
    for (const name of LAYER_Z) {
      const alpha = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) alpha[i] = layers[name].rgba[i * 4 + 3] > 0 ? 1 : 0;
      const mesh = buildMesh(alpha, W, H, 14);
      const covered = new Set();
      for (let t = 0; t < mesh.indices.length; t += 6)
        covered.add(`${Math.round((mesh.positions[mesh.indices[t] * 2] - mesh.x0) / mesh.cell)},${Math.round((mesh.positions[mesh.indices[t] * 2 + 1] - mesh.y0) / mesh.cell)}`);
      let missed = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (alpha[y * W + x] && !covered.has(`${Math.floor((x - mesh.x0) / mesh.cell)},${Math.floor((y - mesh.y0) / mesh.cell)}`)) missed++;
      assert.equal(missed, 0, `${person} ${name}: every painted pixel lies in a cell`);
      const { weights } = skinWeights(mesh.positions, cuts.rig, name);
      for (let v = 0; v < mesh.positions.length / 2; v++) {
        const sum = weights[v * 4] + weights[v * 4 + 1] + weights[v * 4 + 2] + weights[v * 4 + 3];
        assert.ok(Math.abs(sum - 1) < 1e-6, `${person} ${name} vertex ${v} weights sum to ${sum}`);
      }
    }
  }
});

test("each cast body's joints lie on its painting, and its sole is its near shoe's lowest row", async () => {
  for (const person of CAST_CUT) {
    const { W, H, data, cuts } = await castOf(person);
    const painted = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] >= 128;
    for (const [name, [x, y]] of Object.entries(cuts.rig.joints)) {
      let on = false;
      for (let dy = -14; dy <= 14 && !on; dy++) for (let dx = -14; dx <= 14 && !on; dx++) on = painted(Math.round(x) + dx, Math.round(y) + dy);
      assert.ok(on, `${person}: ${name} at ${x},${y} is off the painting`);
    }
    const [tx] = cuts.rig.joints.toeNear,
      [hx] = cuts.rig.joints.heelNear;
    let lowest = -1;
    for (let y = H - 1; y >= 0 && lowest < 0; y--) for (let x = Math.min(tx, hx); x <= Math.max(tx, hx); x++) if (painted(x, y)) lowest = y;
    assert.ok(Math.abs(cuts.rig.sole - lowest) <= 3, `${person}: sole ${cuts.rig.sole}, near shoe's lowest row ${lowest}`);
  }
});

test("a cast body's rig: five skinned layers, a head plate turning on its neck joint, silhouettes, every file it names", async () => {
  const { keyed, cuts } = await castOf("bellhop-1");
  const { rig, images } = await castRig("bellhop-1", keyed, cuts);
  assert.deepEqual(Object.keys(rig.layers).sort(), [...LAYER_Z].sort());
  assert.deepEqual(rig.root, [cuts.rig.rootX, cuts.rig.sole]);
  for (const [name, l] of Object.entries(rig.layers)) {
    assert.ok(images.has(l.file) && images.has(l.sil), `${name}: its texture and its silhouette`);
    assert.equal(l.bones.length, l.positions.length * 2, `${name}: four bones a vertex`);
    for (let v = 0; v < l.positions.length / 2; v++) {
      const sum = l.weights[v * 4] + l.weights[v * 4 + 1] + l.weights[v * 4 + 2] + l.weights[v * 4 + 3];
      assert.ok(Math.abs(sum - 1) < 0.01, `${name} vertex ${v}: ${sum}`);
    }
  }
  const sil = await sharp(images.get(rig.layers.torso.sil)).ensureAlpha().raw().toBuffer();
  let lit = 0;
  for (let i = 0; i < sil.length; i += 4) if (sil[i + 3] === 255) lit += sil[i] === 255 && sil[i + 1] === 255 && sil[i + 2] === 255 ? 1 : -1000;
  assert.ok(lit > 1000, "the silhouette is white where the jacket is painted");
  const h = rig.head;
  const meta = await sharp(images.get(h.file)).metadata();
  assert.deepEqual([meta.width, meta.height], [h.width, h.height]);
  assert.ok(images.has(h.sil));
  assert.ok(h.crown.y < 10, `the crown at the plate's top: ${h.crown.y}`);
  assert.ok(h.nose.x < h.width * 0.3, `the face to the left: nose at ${h.nose.x} of ${h.width}`);
  assert.ok(h.neck.y > h.height * 0.6 && h.neck.y < h.height, `the neck anchor low on the plate: ${h.neck.y} of ${h.height}`);
  assert.ok(h.share > 0.14 && h.share < 0.24, `the painted head is ${h.share} of him`);
});

test("every cast painting in art/incoming/cast has its cut", () => {
  for (const p of PERSONS) if (existsSync(`${CAST_IN}/${p}.png`)) assert.ok(existsSync(`art/cuts/cast-${p}.json`), `${p} is painted but not cut`);
});

test("the pig's painting has its cut", () => {
  assert.ok(!existsSync(`${PIG_IN}/pig-body.png`) || existsSync("art/cuts/pig.json"));
});

test("a hat sits on its base's middle, whatever hangs below it", async () => {
  // A pillbox 200 x 120 with a thin chin strap hanging 60 px below its left end, on clear ground.
  const W = 240,
    H = 220;
  const rgba = Buffer.alloc(W * H * 4);
  const paint = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) rgba.set([180, 30, 40, 255], (y * W + x) * 4);
  };
  paint(20, 20, 200, 120);
  paint(30, 140, 10, 60);
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const base = await hatBase(png);
  assert.deepEqual([base.x, base.y, base.span], [120, 139, 200]);
});

test("a face edit that drifted is drawn back onto its body; one of another body is refused when strict", async () => {
  const { keyed, cuts } = await castOf("bellhop-1");
  const meta = await sharp(keyed.png).metadata();
  // The same painting moved 8 px right and 4 px down inside a canvas 10 px bigger: a drifted edit.
  const moved = await sharp({ create: { width: meta.width + 10, height: meta.height + 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: keyed.png, left: 8, top: 4 }])
    .png()
    .toBuffer();
  const plain = await castRig("bellhop-1", keyed, cuts);
  const edited = await castRig("bellhop-1", keyed, cuts, { silly: { png: moved }, strict: true });
  const silly = edited.images.get(edited.rig.head.silly);
  assert.ok(silly, "the edit is synced");
  const [a, b] = await Promise.all([plain.images.get(plain.rig.head.file), silly].map((p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  assert.deepEqual([a.info.width, a.info.height], [b.info.width, b.info.height], "framed exactly like the head");
  let both = 0,
    either = 0;
  for (let i = 3; i < a.data.length; i += 4) {
    both += a.data[i] > 127 && b.data[i] > 127 ? 1 : 0;
    either += a.data[i] > 127 || b.data[i] > 127 ? 1 : 0;
  }
  assert.ok(both / either > 0.95, `back on the neck: overlap ${(both / either).toFixed(3)}`);
  const other = await keyOut(readFileSync("art/incoming/hammer/body-affliction.png"));
  await assert.rejects(castRig("bellhop-1", keyed, cuts, { silly: other, strict: true }), /overlap/);
  const loose = await castRig("bellhop-1", keyed, cuts, { silly: other, strict: false });
  assert.equal(loose.rig.head.silly, undefined, "skipped in a dev run: the plain face stands in");
});

test("the bellhops' cuts seat the hat on the head, inside the head plate", async () => {
  for (const person of ["bellhop-1", "bellhop-2"]) {
    const { keyed, cuts } = await castOf(person);
    const { rig } = await castRig(person, keyed, cuts);
    const h = rig.head.hat;
    assert.ok(h, `${person}: the cut seats the hat`);
    assert.ok(h.x > 0 && h.x < rig.head.width && h.y >= 0 && h.y < rig.head.neck.y, `${person}: the seat on the head: ${JSON.stringify(h)}`);
    assert.ok(h.width > rig.head.width * 0.4 && h.width < rig.head.width * 1.2, `${person}: about the head's width: ${h.width} of ${rig.head.width}`);
  }
});

import { LOBBY } from "../src/sim/levels/lobby.ts";
import { RESTAURANT } from "../src/sim/levels/restaurant.ts";
import { CAMPUS } from "../src/sim/levels/campus.ts";

test("a recolor takes the garment to the new hue, keeps its light and dark, and leaves the ink and everything else", () => {
  const W = 40,
    H = 20;
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Left half an olive cloth shaded left to right, an ink line down x = 10, the right half white.
      if (x === 10) rgba.set([16, 16, 16, 255], i);
      else if (x < 20) rgba.set([90 + x * 3, 100 + x * 3, 40 + x, 255], i);
      else rgba.set([240, 240, 236, 255], i);
    }
  const spec = { regions: [[[0, 0], [40, 0], [40, 20], [0, 20]]], match: { hue: [50, 100], sat: [0.2, 1], luma: [40, 255] } };
  const mask = recolorMask(rgba, W, H, spec);
  const out = recolorLayer(rgba, mask, "#c9a227", maskMean(rgba, mask));
  const at = (b, x, y) => [...b.subarray((y * W + x) * 4, (y * W + x) * 4 + 4)];
  assert.deepEqual(at(out, 10, 5), at(rgba, 10, 5), "the ink stays ink");
  assert.deepEqual(at(out, 30, 5), at(rgba, 30, 5), "the white stays white");
  const hue = ([r, g, b]) => {
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    return max === r ? (60 * ((g - b) / (max - min)) + 360) % 360 : max === g ? 60 * ((b - r) / (max - min)) + 120 : 60 * ((r - g) / (max - min)) + 240;
  };
  for (const x of [2, 8, 16]) assert.ok(Math.abs(hue(at(out, x, 5)) - hue([0xc9, 0xa2, 0x27])) < 8, `mustard at ${x}: ${at(out, x, 5)}`);
  const luma = (p) => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
  assert.ok(luma(at(out, 2, 5)) < luma(at(out, 16, 5)), "the shading runs the same way");
});

test("every recolor the lobby asks for is in the cut of the painting it repaints, and synced on every layer and the head", async () => {
  for (const s of LOBBY.cast.filter((c) => c.recolor)) {
    assert.ok(CAST_CUT.includes(s.person), `${s.id}: ${s.person} is cut`);
    const { keyed, cuts } = await castOf(s.person);
    assert.ok(cuts.recolors?.[s.recolor], `${s.id}: ${s.person}'s cut has no ${s.recolor}`);
    const { rig, images } = await castRig(s.person, keyed, cuts);
    for (const part of [...Object.values(rig.layers), rig.head]) assert.ok(images.has(part.recolors?.[s.recolor]), `${s.id}: a ${s.recolor} texture for ${part.file}`);
  }
});

import { tolerant } from "./art-cut.mjs";

test("one bad item in a tolerant sync is a warning and a fallback; a strict sync stops on it", async () => {
  const warn = console.warn;
  const said = [];
  console.warn = (m) => said.push(String(m));
  try {
    assert.equal(await tolerant("cast x", false, async () => { throw new Error("bad cut"); }), null);
    assert.ok(said.some((m) => m.includes("cast x") && m.includes("bad cut")), said.join(" | "));
    assert.equal(await tolerant("cast y", false, async () => 7), 7);
  } finally {
    console.warn = warn;
  }
  await assert.rejects(tolerant("cast z", true, async () => { throw new Error("bad cut"); }), /bad cut/);
});

test("each hatted person's cut names the hat it seats, and the sync registers every hat painting under its name", () => {
  for (const p of CAST_CUT) {
    const cuts = JSON.parse(readFileSync(`art/cuts/cast-${p}.json`, "utf8"));
    if (!cuts.hat) continue;
    assert.equal(cuts.hat.name ?? "bellhop", p.startsWith("cook") ? "cook" : "bellhop", p);
  }
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  for (const name of ["bellhop", "cook"])
    if (existsSync(`${CAST_IN}/${name}-hat.png`)) assert.ok(reg.cast.hats[name]?.span > 0 && reg.cast.hats[name].pivot, `${name}'s hat`);
});

test("every recolor a level asks of a painting is in that painting's cut", () => {
  for (const level of [LOBBY, RESTAURANT, CAMPUS])
    for (const s of level.cast ?? []) {
      if (!s.recolor || !existsSync(`art/cuts/cast-${s.person}.json`)) continue;
      const cuts = JSON.parse(readFileSync(`art/cuts/cast-${s.person}.json`, "utf8"));
      assert.ok(cuts.recolors?.[s.recolor], `${level.id} ${s.id}: ${s.person} has no ${s.recolor} mask`);
    }
});

test("a recolor region can name the layers it reaches: a garment painted in behind an arm is recolored on its own layer only", () => {
  const W = 20,
    H = 10;
  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set([240, 240, 236, 255], i * 4);
  const everywhere = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const torsoOnly = { polygon: [[10, 0], [20, 0], [20, 10], [10, 10]], layers: ["torso"] };
  const spec = { regions: [everywhere, torsoOnly], match: { sat: [0, 0.1], luma: [200, 255] } };
  const count = (m) => m.reduce((a, b) => a + b, 0);
  assert.equal(count(recolorMask(rgba, W, H, spec, "torso")), 200, "the torso takes both regions");
  assert.equal(count(recolorMask(rgba, W, H, spec, "armNear")), 100, "the arm only the open one");
  assert.equal(count(recolorMask(rgba, W, H, spec)), 100, "the painting, for the garment's mean, only the open one");
});

test("a wall is cropped between its seams, full height, its floor line kept and its top row's color noted", async () => {
  const W = 1000, H = 600;
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const y = Math.floor(i / W);
    rgba.set(y < 10 ? [200, 40, 40, 255] : [90, 90, 90, 255], i * 4);
  }
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const w = await wallCrop(png, { floor: 400, seams: [50, 950] });
  assert.deepEqual([w.width, w.height, w.floor, w.top], [900, 600, 400, "#c82828"]);
  await assert.rejects(wallCrop(png, { floor: 400, seams: [50, 1200] }), /seams/);
  await assert.rejects(wallCrop(png, { floor: 700, seams: [50, 950] }), /floor/);
});

test("a sheet of objects on green is cut into one piece each, left to right, near shapes joined, specks dropped, each with its base", async () => {
  const W = 700, H = 320;
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set([0, 255, 0, 255], i * 4);
  const block = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgba.set([...c, 255], (y * W + x) * 4); };
  block(40, 100, 140, 280, [180, 40, 40]);
  block(240, 60, 300, 280, [40, 40, 180]);
  block(420, 120, 470, 280, [120, 90, 40]);
  block(480, 220, 520, 280, [200, 200, 40]);
  block(640, 20, 643, 23, [40, 40, 40]);
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const pieces = await sheetPieces(await keyOut(png));
  assert.equal(pieces.length, 3, "three pieces: the near pair joined, the speck dropped");
  assert.ok(pieces[0].width < pieces[1].width + 60 && pieces[2].width > 100, `widths ${pieces.map((p) => p.width)}`);
  for (const p of pieces) assert.equal(p.base.y, p.height - 1 - 8, "the base on the lowest painted row, inside the 8 px margin");
});

test("each painted sheet is cut into as many pieces as its brief lists", () => {
  const listed = { "restaurant-mid": 6, "restaurant-fore": 2, "campus-mid": 6, "campus-fore": 2, "arena-mid": 5, "arena-fore": 2, "lobby-mid": 5, "lobby-fore": 2 };
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  for (const [sheet, n] of Object.entries(listed)) {
    if (!existsSync(`art/incoming/backdrops/${sheet}.png`)) continue;
    assert.equal(Object.keys(reg.pieces ?? {}).filter((k) => k.startsWith(`${sheet}-`)).length, n, sheet);
  }
});

test("two objects on a sheet whose boxes nearly touch but whose paint stands well apart stay two pieces (a tree's crown over a stool)", async () => {
  const W = 300, H = 320;
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set([0, 255, 0, 255], i * 4);
  const block = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgba.set([...c, 255], (y * W + x) * 4); };
  // The crown high and wide, its trunk down the middle; the stool low, starting 4 px past the crown's box.
  block(40, 40, 140, 140, [40, 60, 170]);
  block(85, 140, 95, 280, [120, 70, 30]);
  block(144, 200, 220, 280, [180, 30, 30]);
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  assert.equal((await sheetPieces(await keyOut(png))).length, 2);
});

test("a wall notes its bottom row's color too, which carries its painted floor on below it", async () => {
  const W = 400, H = 300;
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set(Math.floor(i / W) >= H - 4 ? [30, 60, 90, 255] : [90, 90, 90, 255], i * 4);
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  assert.equal((await wallCrop(png, { floor: 200, seams: [0, 400] })).bottom, "#1e3c5a");
});

import { syncHats } from "./art-cut.mjs";
import { mkdtempSync, mkdirSync as mkdirHat, copyFileSync, writeFileSync as writeHat } from "node:fs";
import { tmpdir } from "node:os";
import { join as joinHat } from "node:path";

test("a hat painting that cannot be cut is skipped with a warning: the other hats are registered and the sync goes on", async () => {
  const inDir = mkdtempSync(joinHat(tmpdir(), "hats-in-"));
  const outDir = mkdtempSync(joinHat(tmpdir(), "hats-out-"));
  mkdirHat(joinHat(outDir, "cast"));
  copyFileSync("art/incoming/cast/bellhop-hat.png", joinHat(inDir, "bellhop-hat.png"));
  // The cook's hat as nothing but green: nothing to key, no base to find.
  writeHat(joinHat(inDir, "cook-hat.png"), await sharp({ create: { width: 400, height: 300, channels: 3, background: "#00ff00" } }).png().toBuffer());
  const registry = { cast: { bodies: {}, hats: {} } };
  await syncHats(registry, { inDir, outDir, strict: false });
  assert.ok(registry.cast.hats.bellhop?.span > 0, "the bellhops' hat is registered");
  assert.equal(registry.cast.hats.cook, undefined, "the cook's is skipped: he plays bareheaded");
  await assert.rejects(syncHats({ cast: { bodies: {}, hats: {} } }, { inDir, outDir, strict: true }), "a strict sync still stops on it");
});

test("Hammer's heads and props are stored at the body's texture scale, their plate pixels kept; the life icon is small", async () => {
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  const plates = [...Object.values(reg.hammer.heads), ...["mallet", "towel", "wristwatch"].map((n) => reg.hammer.props[n]).filter(Boolean)];
  assert.ok(plates.length >= 7, `heads and props registered: ${plates.length}`);
  for (const p of plates) {
    const meta = await sharp(`public/art/${p.file}`).metadata();
    assert.equal(p.scale, 0.5, `${p.file} records its scale`);
    assert.ok(Math.abs(meta.width - p.width * p.scale) <= 1 && Math.abs(meta.height - p.height * p.scale) <= 1, `${p.file}: ${meta.width}x${meta.height} for a ${p.width}x${p.height} plate`);
  }
  const icon = await sharp(`public/art/${reg.hammer.portrait.file}`).metadata();
  assert.ok(icon.width <= 256, `the life icon is ${icon.width} wide`);
});

import { toWebp, webpPaths } from "./art-cut.mjs";

test("the published art is WebP: a painted layer stays within a few shades of its PNG, its edges keep their alpha, and it is far smaller", async () => {
  const png = readFileSync("art/incoming/cast/bellhop-1.png");
  const keyed = (await keyOut(png)).png;
  const webp = await toWebp(keyed);
  assert.ok(webp.length * 4 < keyed.length, `${keyed.length} -> ${webp.length} bytes`);
  const a = await sharp(keyed).ensureAlpha().raw().toBuffer();
  const b = await sharp(webp).ensureAlpha().raw().toBuffer();
  let sum = 0,
    n = 0,
    alphaOff = 0;
  for (let i = 0; i < a.length; i += 4) {
    alphaOff = Math.max(alphaOff, Math.abs(a[i + 3] - b[i + 3]));
    if (a[i + 3] < 250) continue;
    for (let c = 0; c < 3; c++) sum += Math.abs(a[i + c] - b[i + c]);
    n += 3;
  }
  assert.ok(sum / n < 5, `mean shift ${(sum / n).toFixed(2)} of 255`);
  assert.ok(alphaOff <= 2, `alpha off by ${alphaOff}`);
});

test("every stored picture a registry or a rig names is renamed to its WebP, and nothing else is touched", () => {
  const before = { a: "hammer/head-neutral.png", b: { c: ["cast/x-torso.png", "cast/x-rig.json"], d: 3, e: null }, f: "png" };
  assert.deepEqual(webpPaths(before), { a: "hammer/head-neutral.webp", b: { c: ["cast/x-torso.webp", "cast/x-rig.json"], d: 3, e: null }, f: "png" });
});

test("after the sync no registry or rig names a PNG, and every picture they name is there", () => {
  const files = [];
  const walk = (v) => (typeof v === "string" ? files.push(v) : v && typeof v === "object" && Object.values(v).forEach(walk));
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  walk(reg);
  for (const f of files.filter((f) => f.endsWith("-rig.json"))) walk(JSON.parse(readFileSync(`public/art/${f}`, "utf8")));
  const pictures = files.filter((f) => /\.(png|webp)$/.test(f));
  assert.ok(pictures.length > 200, `${pictures.length} pictures named`);
  assert.deepEqual(pictures.filter((f) => f.endsWith(".png")), [], "no PNG is named");
  assert.deepEqual(pictures.filter((f) => !existsSync(`public/art/${f}`)), [], "every named picture is there");
});

test("the pickups are served as small copies cut to what is painted, each at least twice as tall as the game ever draws it", async () => {
  const table = JSON.parse(readFileSync("src/render/products.json", "utf8"));
  for (const [name, p] of Object.entries(table)) {
    const file = `public/art/products/${name}.webp`;
    assert.ok(existsSync(file), file);
    const meta = await sharp(file).metadata();
    const [x0, y0, x1, y1] = p.box;
    assert.equal(meta.height, Math.min(720, y1 - y0), `${name} height`);
    assert.ok(Math.abs(meta.width / meta.height - (x1 - x0) / (y1 - y0)) < 0.01, `${name} keeps its shape`);
    // On a tall phone at three times its pixels, his 340 is about 1270 screen px: a pickup p.height tall is drawn this tall.
    assert.ok(meta.height >= Math.min(y1 - y0, 2 * (p.height / 340) * 1270) * 0.95, `${name}: ${meta.height} stored for ${Math.round((p.height / 340) * 1270)} drawn`);
  }
});

const PIG_IN = "art/incoming/pig";
const PIG_FACES = ["squint", "charge", "hurt", "defeated"];
let pigCache = null;
/** The pig keyed and cut, with its painting's pixels. */
const pigOf = async () => {
  if (!pigCache) {
    const keyed = await keyOut(readFileSync(`${PIG_IN}/pig-body.png`));
    const cuts = JSON.parse(readFileSync("art/cuts/pig.json", "utf8"));
    const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    pigCache = { keyed, cuts, data, ...(await separateLayers(keyed, cuts)) };
  }
  return pigCache;
};

test("a cut may name its own layers: the cast's keep the old lists, the pig's are its own", () => {
  assert.deepEqual(layerZ({ layers: { head: {} } }), ["armFar", "legFar", "legNear", "head", "torso", "armNear"]);
  assert.deepEqual(bodyLayers({ layers: { head: {} } }), ["armFar", "legFar", "legNear", "torso", "armNear"]);
  assert.deepEqual(layerZ({ layers: {}, z: ["a", "head", "b"] }), ["a", "head", "b"]);
  assert.deepEqual(bodyLayers({ layers: {}, z: ["a", "head", "b"] }), ["a", "b"]);
  assert.deepEqual(layerOrder({ layers: {}, order: ["b", "head", "a"] }), ["b", "head", "a"]);
});

test("the pig is cut into seven layers, its head in front of its body, that put its painting back together at rest", async () => {
  const { W, H, layers, owner, data, cuts } = await pigOf();
  const z = layerZ(cuts);
  assert.deepEqual(z, ["armFar", "legFar", "tail", "torso", "legNear", "head", "armNear"]);
  let wrong = 0,
    extra = 0,
    lost = 0;
  for (let i = 0; i < W * H; i++) {
    let top = null;
    for (const name of z) if (layers[name].rgba[i * 4 + 3] > 0) top = name;
    if (owner[i] < 0) {
      if (top) extra++;
      if (data[i * 4 + 3] >= 128) lost++;
      continue;
    }
    const px = layers[top].rgba.subarray(i * 4, i * 4 + 4);
    if (px[0] !== data[i * 4] || px[1] !== data[i * 4 + 1] || px[2] !== data[i * 4 + 2] || px[3] !== data[i * 4 + 3]) wrong++;
  }
  assert.equal(wrong, 0, "the frontmost layer shows the painted pixel");
  assert.equal(extra, 0, "nothing is drawn where the painting is empty");
  assert.ok(lost < 40, `${lost} painted pixels belong to no layer`);
  for (const name of z) assert.ok(layers[name].rgba.some((v, i) => i % 4 === 3 && v > 0), `${name} has paint`);
});

test("the pig's layers are meshed and skinned: every painted pixel in a cell, weights summing to one", async () => {
  const { W, H, layers, cuts } = await pigOf();
  for (const name of bodyLayers(cuts)) {
    const alpha = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = layers[name].rgba[i * 4 + 3] > 0 ? 1 : 0;
    const mesh = buildMesh(alpha, W, H, 14);
    const { weights } = skinWeights(mesh.positions, cuts.rig, name);
    for (let v = 0; v < mesh.positions.length / 2; v++) {
      const sum = weights[v * 4] + weights[v * 4 + 1] + weights[v * 4 + 2] + weights[v * 4 + 3];
      assert.ok(Math.abs(sum - 1) < 1e-6, `pig ${name} vertex ${v} weights sum to ${sum}`);
    }
  }
});

test("the pig's joints lie on its painting, its sole is its near foot's lowest row, and it keeps its own arms", async () => {
  const { W, H, data, cuts } = await pigOf();
  const painted = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] >= 128;
  for (const [name, [x, y]] of Object.entries(cuts.rig.joints)) {
    let on = false;
    for (let dy = -14; dy <= 14 && !on; dy++) for (let dx = -14; dx <= 14 && !on; dx++) on = painted(Math.round(x) + dx, Math.round(y) + dy);
    assert.ok(on, `${name} at ${x},${y} is off the painting`);
  }
  const [tx] = cuts.rig.joints.toeNear,
    [hx] = cuts.rig.joints.heelNear;
  let lowest = -1;
  for (let y = H - 1; y >= 0 && lowest < 0; y--) for (let x = Math.min(tx, hx); x <= Math.max(tx, hx); x++) if (painted(x, y)) lowest = y;
  assert.ok(Math.abs(cuts.rig.sole - lowest) <= 3, `sole ${cuts.rig.sole}, near foot's lowest row ${lowest}`);
  assert.deepEqual(cuts.rig.match, [], "its stubby arms are never turned to Hammer's stance");
});

test("the pig's rig: six skinned layers in its own order, the head plate, four faces framed exactly like it, and three tufts", async () => {
  const { keyed, cuts } = await pigOf();
  const faces = {};
  for (const name of PIG_FACES) faces[name] = await keyOut(readFileSync(`${PIG_IN}/pig-${name}.png`));
  const { rig, images } = await castRig("pig", keyed, cuts, { faces, strict: true });
  assert.deepEqual(rig.z, cuts.z);
  assert.deepEqual(Object.keys(rig.layers), bodyLayers(cuts));
  assert.deepEqual(rig.match, []);
  assert.deepEqual(Object.keys(rig.head.faces).sort(), [...PIG_FACES].sort());
  const plain = await sharp(images.get(rig.head.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [name, file] of Object.entries(rig.head.faces)) {
    const face = await sharp(images.get(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([face.info.width, face.info.height], [plain.info.width, plain.info.height], `${name}: framed like the head`);
    let changed = 0;
    for (let i = 0; i < face.data.length; i += 4) if (Math.abs(face.data[i] - plain.data[i]) + Math.abs(face.data[i + 1] - plain.data[i + 1]) > 60) changed++;
    assert.ok(changed > 50, `${name}: the face is changed (${changed} px)`);
  }
  assert.ok(rig.head.share > 0.28 && rig.head.share < 0.36, `the head ${rig.head.share} of the pig`);
  const tufts = await sheetPieces(await keyOut(readFileSync(`${PIG_IN}/pig-stuffing.png`)));
  assert.equal(tufts.length, 3, "three tufts");
});

test("a pig face from another painting is refused when strict and skipped otherwise", async () => {
  const { keyed, cuts } = await pigOf();
  const other = await keyOut(readFileSync("art/incoming/hammer/body-affliction.png"));
  await assert.rejects(castRig("pig", keyed, cuts, { faces: { hurt: other }, strict: true }), /overlap/);
  const loose = await castRig("pig", keyed, cuts, { faces: { hurt: other }, strict: false });
  assert.equal(loose.rig.head.faces?.hurt, undefined);
});

import { GIFTSHOP } from "../src/sim/levels/giftshop.ts";

test("every wall painting has its cut file", () => {
  for (const f of readdirSync("art/incoming/backdrops").filter((n) => /-far-\d+\.png$/.test(n)))
    assert.ok(existsSync(`art/cuts/wall-${f.replace(/\.png$/, "")}.json`), `${f} has no cut`);
});

test("every venue's walls and standing pieces are synced: each one its level names is in the registry", () => {
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  for (const level of [LOBBY, RESTAURANT, CAMPUS, GIFTSHOP]) {
    assert.ok(level.backdrop, `${level.id} names its painted walls`);
    for (const w of level.backdrop.walls) assert.ok(reg.walls?.[w], `${level.id}: wall ${w}`);
    for (const p of [...level.backdrop.mid, ...level.backdrop.fore]) assert.ok(reg.pieces?.[p.name], `${level.id}: piece ${p.name}`);
  }
});

test("the food sheet is cut cell by cell into its sixteen dishes in reading order, each keyed and cropped to its paint; an empty cell is refused", async () => {
  const cell = 200;
  const dish = (i) => `<circle cx="${(i % 4) * cell + 100}" cy="${Math.floor(i / 4) * cell + 100}" r="${30 + i * 3}" fill="#c0392b" stroke="#101010" stroke-width="4"/>`;
  const sheetOf = (skip = -1) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#00ff00"/>${Array.from({ length: 16 }, (_, i) => (i === skip ? "" : dish(i))).join("")}</svg>`)).png().toBuffer();
  const cells = await foodCells(await sheetOf());
  assert.equal(cells.length, 16);
  cells.forEach((c, i) => {
    // The disc and its outline, plus the keyer's 8 px margin each side.
    const want = 2 * (30 + i * 3) + 4 + 16;
    assert.ok(Math.abs(c.width - want) <= 4 && Math.abs(c.height - want) <= 4, `cell ${i + 1}: ${c.width}x${c.height}, not about ${want}`);
  });
  await assert.rejects(foodCells(await sheetOf(5)), /cell 6 is empty/);
});

test("a food sheet whose rows sit off the even grid is cut by the green between its dishes: a tall dish reaching over the grid's line comes out whole", async () => {
  const rowsAt = [100, 300, 470, 660];
  const dish = (i) => `<circle cx="${(i % 4) * 200 + 100}" cy="${rowsAt[Math.floor(i / 4)]}" r="${30 + i * 3}" fill="#c0392b" stroke="#101010" stroke-width="4"/>`;
  const sheet = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#00ff00"/>${Array.from({ length: 16 }, (_, i) => dish(i)).join("")}</svg>`)).png().toBuffer();
  const cells = await foodCells(sheet);
  assert.equal(cells.length, 16);
  cells.forEach((c, i) => {
    const want = 2 * (30 + i * 3) + 4 + 16;
    assert.ok(Math.abs(c.width - want) <= 4 && Math.abs(c.height - want) <= 4, `cell ${i + 1}: ${c.width}x${c.height}, not about ${want}`);
  });
});

test("the gate sheet's seven pieces are named in the brief's order; six or eight refuse", async () => {
  const { nameGatePieces } = await import("./art-cut.mjs");
  const { GATE_PIECES } = await import("../src/art/registry.ts");
  const piece = (i) => ({ file: `p${i}.png`, width: 10 + i, height: 10, base: { x: 5, y: 9 } });
  const named = nameGatePieces([...Array(7).keys()].map(piece));
  assert.deepEqual(Object.keys(named), [...GATE_PIECES]);
  assert.equal(named.box.width, 16);
  assert.throws(() => nameGatePieces([...Array(6).keys()].map(piece)), /6 pieces, not 7/);
  assert.throws(() => nameGatePieces([...Array(8).keys()].map(piece)), /8 pieces, not 7/);
});
