// Turns the owner's plates under art/incoming into registered game art under
// public/art, and records every owner file's hash in art/manifest.json.
// Usage: node scripts/art-sync.mjs [--overlay] [--strict] [--accept <owner file>]
//   --overlay writes each body's layers side by side to artifacts/body-layers-<costume>.png
//   --strict  refuse a misaligned expression plate instead of skipping it (art:sync, tests)
//   --accept  re-record one owner file the owner regenerated on purpose
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";
import {
  keyOut,
  registerHead,
  registerAligned,
  alignTo,
  gateExpression,
  ALIGN_MIN,
  separateLayers,
  buildMesh,
  skinWeights,
  LAYER_Z,
} from "./art-cut.mjs";
import { ink } from "./ink.mjs";

const OUT = "public/art";
const HAMMER_IN = "art/incoming/hammer";
const MANIFEST = "art/manifest.json";
const EXPRESSIONS = ["neutral", "angry", "hurt", "smug", "bored", "chomp"];
const COSTUMES = ["affliction", "scrubs", "suit", "banquet"];
// Mesh cells in crop pixels, and the size the layer textures are stored at (the game draws the
// body at about a quarter of the crop's size, twice that on a high-density screen).
const MESH_CELL = 14;
const TEXTURE_SCALE = 0.5;
const args = process.argv.slice(2);
const overlay = args.includes("--overlay");
const strict = args.includes("--strict");
const accept = args.includes("--accept") ? args[args.indexOf("--accept") + 1]?.replace(/\\/g, "/") : null;

const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Adds new owner files to the manifest; refuses if a recorded file changed, unless it is the accepted one. */
function guard(files) {
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { files: {} };
  if (accept) delete manifest.files[accept];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const h = sha(file);
    const known = manifest.files[file];
    if (known && known !== h) {
      console.error(
        `${file} changed since it was recorded; owner files are never edited. Restore it, or if the owner regenerated it, re-record it with: node scripts/art-sync.mjs --accept ${file}`,
      );
      process.exit(1);
    }
    manifest.files[file] = h;
  }
  const sorted = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, JSON.stringify({ files: sorted }, null, 2) + "\n");
  return manifest;
}

/** Every file the owner put under the art and voice folders, archives aside. */
function ownerFiles() {
  const list = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) walk(p);
      else if (!/\.zip$/i.test(entry.name)) list.push(p);
    }
  };
  if (existsSync("art/reference")) walk("art/reference");
  if (existsSync("art/incoming")) walk("art/incoming");
  for (const f of ["public/absolute-bullshit.mp3", "public/damage-voice.wav"]) if (existsSync(f)) list.push(f);
  if (existsSync("public/voice")) walk("public/voice");
  return list;
}

async function heads(registry) {
  const neutralFile = join(HAMMER_IN, "head-profile.png");
  if (!existsSync(neutralFile)) {
    console.warn("no head-profile.png under art/incoming/hammer; the head slot stays empty");
    return;
  }
  mkdirSync(join(OUT, "hammer"), { recursive: true });
  const neutral = await keyOut(readFileSync(neutralFile));
  const neutralReg = await registerHead(neutral.png, "profile");
  for (const name of EXPRESSIONS) {
    const file = join(HAMMER_IN, name === "neutral" ? "head-profile.png" : `head-profile-${name}.png`);
    if (!existsSync(file)) continue;
    const keyed = name === "neutral" ? neutral : await keyOut(readFileSync(file));
    let reg = neutralReg;
    if (name !== "neutral") {
      const a = await alignTo(neutral.png, keyed.png);
      const verdict = gateExpression(a.overlap, { strict });
      const why = `${basename(file)}: outline overlap ${a.overlap.toFixed(2)}, expected ≥ ${ALIGN_MIN}; regenerate it on the neutral plate's framing`;
      if (verdict === "refuse") {
        console.error(why);
        process.exit(1);
      }
      if (verdict === "skip") {
        console.warn(`${why} (skipped; the neutral plate stands in)`);
        continue;
      }
      // The face box and neck come from the neutral plate, carried through the alignment.
      reg = registerAligned(neutralReg, a, { width: keyed.width, height: keyed.height });
    }
    const outFile = `hammer/head-${name}.png`;
    writeFileSync(join(OUT, outFile), keyed.png);
    registry.hammer.heads[name] = { file: outFile, ...reg };
    console.log(`head ${name}: ${reg.width}x${reg.height}, neck ${reg.neck.x},${reg.neck.y}`);
  }
  const tq = join(HAMMER_IN, "head-three-quarter.png");
  if (existsSync(tq)) {
    const keyed = await keyOut(readFileSync(tq));
    const reg = await registerHead(keyed.png, "three-quarter");
    writeFileSync(join(OUT, "hammer/head-three-quarter.png"), keyed.png);
    registry.hammer.portrait = { file: "hammer/head-three-quarter.png", ...reg };
  }
}

// Where a prop is held and where it reaches, in the keyed crop's pixels.
const PROP_ANCHORS = { mallet: { pivot: { x: 965, y: 1295 }, tip: { x: 300, y: 235 } } };

async function props(registry) {
  for (const name of ["mallet", "towel", "wristwatch"]) {
    const file = join(HAMMER_IN, `${name}.png`);
    if (!existsSync(file)) continue;
    const keyed = await keyOut(readFileSync(file));
    const outFile = `hammer/${name}.png`;
    writeFileSync(join(OUT, outFile), keyed.png);
    registry.hammer.props[name] = { file: outFile, width: keyed.width, height: keyed.height, ...PROP_ANCHORS[name] };
    console.log(`prop ${name}: ${keyed.width}x${keyed.height}`);
  }
}

/** Each body as skinned layers: textures, meshes in the crop's pixels and bone weights in one rig file. */
async function bodies(registry) {
  const cutsFile = "art/cuts/hammer-body.json";
  if (!existsSync(cutsFile)) {
    console.warn("no art/cuts/hammer-body.json; bodies are not rigged");
    return;
  }
  const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
  const { rig } = cuts;
  const span = rig.sole - rig.joints.neck[1];
  for (const costume of COSTUMES) {
    const file = join(HAMMER_IN, `body-${costume}.png`);
    if (!existsSync(file)) continue;
    const keyed = await keyOut(readFileSync(file));
    const { W, H, layers } = await separateLayers(keyed, cuts, costume);
    const out = { version: 2, span, root: [rig.rootX, rig.sole], joints: rig.joints, bones: rig.bones, layers: {} };
    const sheet = [];
    for (const name of LAYER_Z) {
      const { rgba } = layers[name];
      const alpha = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) alpha[i] = rgba[i * 4 + 3] > 0 ? 1 : 0;
      const mesh = buildMesh(alpha, W, H, MESH_CELL);
      const skin = { ...rig.skin, [name]: { ...rig.skin[name], ...(cuts.overrides?.[costume]?.skin?.[name] ?? {}) } };
      const { bones, weights } = skinWeights(mesh.positions, { ...rig, skin }, name);
      // The texture covers the mesh's cells exactly, padded with clear pixels past the crop.
      const left = Math.max(0, mesh.x0),
        top = Math.max(0, mesh.y0);
      const right = Math.min(W, mesh.x0 + mesh.width),
        bottom = Math.min(H, mesh.y0 + mesh.height);
      const full = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
        .extract({ left, top, width: right - left, height: bottom - top })
        .extend({
          left: left - mesh.x0,
          top: top - mesh.y0,
          right: mesh.x0 + mesh.width - right,
          bottom: mesh.y0 + mesh.height - bottom,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      if (overlay) sheet.push(full);
      const outFile = `hammer/${costume}-${name}.png`;
      await sharp(full)
        .resize({ width: Math.round(mesh.width * TEXTURE_SCALE), kernel: "lanczos3" })
        .png()
        .toFile(join(OUT, outFile));
      out.layers[name] = {
        file: outFile,
        x: mesh.x0,
        y: mesh.y0,
        width: mesh.width,
        height: mesh.height,
        positions: mesh.positions,
        indices: mesh.indices,
        bones: [...bones],
        weights: [...weights].map((w) => Math.round(w * 1000) / 1000),
      };
    }
    const rigFile = `hammer/${costume}-rig.json`;
    writeFileSync(join(OUT, rigFile), JSON.stringify(out));
    registry.hammer.bodies[costume] = { rig: rigFile, span };
    const verts = Object.values(out.layers).reduce((n, l) => n + l.positions.length / 2, 0);
    console.log(`body ${costume}: ${LAYER_Z.length} layers, ${verts} vertices (crop ${keyed.width}x${keyed.height})`);
    if (overlay) await drawLayers(costume, sheet);
  }
}

/** The layers side by side on a dark ground, painted-in parts and all, for checking the cuts by eye. */
async function drawLayers(costume, sheet) {
  const metas = await Promise.all(sheet.map((png) => sharp(png).metadata()));
  const height = Math.max(...metas.map((m) => m.height));
  let x = 0;
  const comps = sheet.map((input, i) => {
    const c = { input, left: x, top: 0 };
    x += metas[i].width + 12;
    return c;
  });
  mkdirSync("artifacts", { recursive: true });
  await sharp({ create: { width: x, height, channels: 4, background: "#2a2f3a" } })
    .composite(comps)
    .png()
    .toFile(`artifacts/body-layers-${costume}.png`);
  console.log(`wrote artifacts/body-layers-${costume}.png`);
}

/** Far planes: the owner's painted backdrop when present, else the inked venue photo. */
async function backdrops(registry) {
  const venues = { lobby: "public/hotel-corridor.webp" };
  for (const [venue, photo] of Object.entries(venues)) {
    const owner = `art/incoming/backdrops/${venue}-far.png`;
    const outFile = `backdrops/${venue}-far.png`;
    const target = join(OUT, outFile);
    if (existsSync(owner)) {
      const keyedFree = await sharp(readFileSync(owner)).resize({ width: 1920 }).png().toBuffer();
      mkdirSync(join(OUT, "backdrops"), { recursive: true });
      writeFileSync(target, keyedFree);
    } else if (existsSync(photo)) {
      if (!existsSync(target)) await ink(photo, target, 1920);
    } else continue;
    registry.backdrops[venue] = { far: outFile };
    console.log(`backdrop ${venue}: ${existsSync(owner) ? "owner art" : "inked photo"}`);
  }
}

const registry = { version: 1, hammer: { heads: {}, bodies: {}, props: {}, portrait: null }, backdrops: {} };
mkdirSync(join(OUT, "hammer"), { recursive: true });
guard(ownerFiles());
await heads(registry);
await props(registry);
await bodies(registry);
await backdrops(registry);
writeFileSync(join(OUT, "registry.json"), JSON.stringify(registry, null, 2) + "\n");
console.log(`wrote ${OUT}/registry.json`);
