// Turns the owner's plates under art/incoming into registered game art under
// public/art, and records every owner file's hash in art/manifest.json.
// Usage: node scripts/art-sync.mjs [--overlay] [--strict] [--accept <owner file>]
//   --overlay writes each body's layers side by side to artifacts/body-layers-<costume>.png
//   --strict  refuse a misaligned expression plate instead of skipping it (art:sync, tests)
//   --accept  re-record one owner file the owner regenerated on purpose
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
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
  layerZ,
  bodyLayers,
  castRig,
  tolerant,
  syncHats,
  toWebp,
  webpPaths,
  wallCrop,
  sheetPieces,
  foodCells,
  paddedLayer,
  scaled,
  MESH_CELL,
  TEXTURE_SCALE,
} from "./art-cut.mjs";
import { ink } from "./ink.mjs";

const OUT = "public/art";
const HAMMER_IN = "art/incoming/hammer";
const MANIFEST = "art/manifest.json";
/** The life icon's stored width: it shows a few dozen CSS px across, three times that on a phone. */
const ICON_WIDTH = 256;
const EXPRESSIONS = ["neutral", "angry", "hurt", "smug", "bored", "chomp"];
const COSTUMES = ["affliction", "scrubs", "suit", "banquet"];
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
    // Stored at the body's texture scale: the game draws a head well under half its painted size, even on a phone.
    writeFileSync(join(OUT, outFile), await scaled(keyed.png, keyed.width, TEXTURE_SCALE));
    registry.hammer.heads[name] = { file: outFile, ...reg, scale: TEXTURE_SCALE };
    console.log(`head ${name}: ${reg.width}x${reg.height}, neck ${reg.neck.x},${reg.neck.y}, nose ${reg.nose.x},${reg.nose.y}`);
  }
  const tq = join(HAMMER_IN, "head-three-quarter.png");
  if (existsSync(tq)) {
    const keyed = await keyOut(readFileSync(tq));
    const reg = await registerHead(keyed.png, "three-quarter");
    // Only ever the life icon on the HUD and the cards: a few dozen pixels across.
    writeFileSync(join(OUT, "hammer/head-three-quarter.png"), await scaled(keyed.png, keyed.width, ICON_WIDTH / keyed.width));
    registry.hammer.portrait = { file: "hammer/head-three-quarter.png", ...reg, scale: ICON_WIDTH / keyed.width };
  }
}

// Where a prop is held and where it reaches, in the keyed crop's pixels. The mallet is held
// on the leather wrap 117 px (14 rest units) above the butt, so the butt shows below the
// fist, and reaches to the middle of the head, where the handle's line meets its axis.
const PROP_ANCHORS = { mallet: { pivot: { x: 916, y: 1191 }, tip: { x: 342, y: 209 } } };

async function props(registry) {
  for (const name of ["mallet", "towel", "wristwatch"]) {
    const file = join(HAMMER_IN, `${name}.png`);
    if (!existsSync(file)) continue;
    const keyed = await keyOut(readFileSync(file));
    const outFile = `hammer/${name}.png`;
    writeFileSync(join(OUT, outFile), await scaled(keyed.png, keyed.width, TEXTURE_SCALE));
    registry.hammer.props[name] = { file: outFile, width: keyed.width, height: keyed.height, ...PROP_ANCHORS[name], scale: TEXTURE_SCALE };
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
      const full = await paddedLayer(rgba, W, H, mesh);
      if (overlay) sheet.push(full);
      const outFile = `hammer/${costume}-${name}.png`;
      const store = async (png, file) => writeFileSync(join(OUT, file), await scaled(png, mesh.width, TEXTURE_SCALE));
      await store(full, outFile);
      // Variants share the layer's mesh, so they cover the same rectangle.
      const variants = {};
      for (const [vname, vrgba] of Object.entries(layers[name].variants ?? {})) {
        const vfull = await paddedLayer(vrgba, W, H, mesh);
        variants[vname] = `hammer/${costume}-${name}-${vname}.png`;
        await store(vfull, variants[vname]);
        if (overlay) sheet.push(vfull);
      }
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
        ...(Object.keys(variants).length ? { variants } : {}),
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

const CAST_IN = "art/incoming/cast";
const CAST_PERSONS = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2", "cook-1", "busser-1", "lunch-1", "prof-1", "nurse"];

/** The cast's paintings, cut like Hammer's bodies: each person's layers, head plate and silhouettes, and their rig. */
async function cast(registry) {
  mkdirSync(join(OUT, "cast"), { recursive: true });
  for (const person of CAST_PERSONS) {
    const file = join(CAST_IN, `${person}.png`);
    if (!existsSync(file)) continue;
    const cutsFile = `art/cuts/cast-${person}.json`;
    if (!existsSync(cutsFile)) {
      console.warn(`cast ${person}: painted but not cut yet (no ${cutsFile}); the stand-in draws them`);
      continue;
    }
    // One bad cut leaves that person on the stand-in and the rest of the art going (a strict sync stops on it).
    await tolerant(`cast ${person}`, strict, async () => {
      const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
      // A face edit, knocked silly, swaps in for the head while dazed; one that does not fit its painting is skipped (refused with --strict).
      const sillyFile = join(CAST_IN, `${person}-silly.png`);
      const silly = existsSync(sillyFile) ? await keyOut(readFileSync(sillyFile)) : null;
      const { rig, images, layers, W, H } = await castRig(person, await keyOut(readFileSync(file)), cuts, { silly, strict });
      for (const [name, png] of images) writeFileSync(join(OUT, name), png);
      const rigFile = `cast/${person}-rig.json`;
      writeFileSync(join(OUT, rigFile), JSON.stringify(rig));
      registry.cast.bodies[person] = { rig: rigFile, span: rig.span };
      console.log(`cast ${person}: five layers and the head, the painted head ${rig.head.share} of the figure`);
      if (overlay) {
        const sheet = await Promise.all(layerZ(cuts).map((name) => sharp(layers[name].rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()));
        await drawLayers(`cast-${person}`, sheet);
      }
    });
  }
  await syncHats(registry, { inDir: CAST_IN, outDir: OUT, strict });
}

const PIG_IN = "art/incoming/pig";
const PIG_FACES = ["squint", "charge", "hurt", "defeated"];
/** The tufts are painted about 350 px across and drawn under 100: stored at half size. */
const TUFT_SCALE = 0.5;

/** The pig (R3 §6.3): its body cut like a cast painting on its own cut, its four face edits on the head, and its stuffing tufts. */
async function pig(registry) {
  const file = join(PIG_IN, "pig-body.png");
  if (!existsSync(file)) return;
  const cutsFile = "art/cuts/pig.json";
  if (!existsSync(cutsFile)) {
    console.warn(`pig: painted but not cut yet (no ${cutsFile}); the drawn pig stands in`);
    return;
  }
  // A bad cut or face leaves the drawn pig (or its plain face) standing in and the rest of the art going.
  await tolerant("pig", strict, async () => {
    const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
    const faces = {};
    for (const name of PIG_FACES) {
      const f = join(PIG_IN, `pig-${name}.png`);
      if (existsSync(f)) faces[name] = await keyOut(readFileSync(f));
    }
    const { rig, images, layers, W, H } = await castRig("pig", await keyOut(readFileSync(file)), cuts, { faces, strict });
    for (const [name, png] of images) writeFileSync(join(OUT, name), png);
    const rigFile = "cast/pig-rig.json";
    writeFileSync(join(OUT, rigFile), JSON.stringify(rig));
    registry.pig = { rig: rigFile, span: rig.span, stuffing: [] };
    console.log(`pig: ${bodyLayers(cuts).length} layers and the head, ${Object.keys(rig.head.faces ?? {}).length} faces`);
    if (overlay) {
      const sheet = await Promise.all(layerZ(cuts).map((name) => sharp(layers[name].rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()));
      await drawLayers("pig", sheet);
    }
  });
  // A bad tuft sheet loses the tufts only: the painted pig stays.
  const tufts = join(PIG_IN, "pig-stuffing.png");
  if (registry.pig && existsSync(tufts))
    await tolerant("pig stuffing", strict, async () => {
      for (const [i, p] of (await sheetPieces(await keyOut(readFileSync(tufts)))).entries()) {
        const name = `cast/pig-stuffing-${i + 1}.png`;
        writeFileSync(join(OUT, name), await scaled(p.png, p.width, TUFT_SCALE));
        registry.pig.stuffing.push({ file: name, width: Math.round(p.width * TUFT_SCALE), height: Math.round(p.height * TUFT_SCALE), base: { x: Math.round(p.base.x * TUFT_SCALE), y: Math.round(p.base.y * TUFT_SCALE) } });
      }
      console.log(`pig stuffing: ${registry.pig.stuffing.length} tufts`);
    });
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
  const venues = { lobby: "public/hotel-corridor.webp", restaurant: "public/hotel-restaurant-bg.jpg", campus: "public/campus-common.webp" };
  for (const [venue, photo] of Object.entries(venues)) {
    const owner = `art/incoming/backdrops/${venue}-far.png`;
    const outFile = `backdrops/${venue}-far.png`;
    const target = join(OUT, outFile);
    if (existsSync(owner)) {
      const keyedFree = await sharp(readFileSync(owner)).resize({ width: 1920 }).png().toBuffer();
      mkdirSync(join(OUT, "backdrops"), { recursive: true });
      writeFileSync(target, keyedFree);
    } else if (existsSync(photo)) {
      // Inking a photo is slow: one already inked, and published, is kept.
      if (!existsSync(target) && !existsSync(target.replace(/\.png$/, ".webp"))) await ink(photo, target, 1920);
    } else continue;
    registry.backdrops[venue] = { far: outFile };
    console.log(`backdrop ${venue}: ${existsSync(owner) ? "owner art" : "inked photo"}`);
  }
}

/** The venues' painted walls, cropped at their seams (art/cuts/wall-<name>.json), and their mid and fore sheets cut into pieces. */
async function walls(registry) {
  const dir = "art/incoming/backdrops";
  if (!existsSync(dir)) return;
  mkdirSync(join(OUT, "backdrops"), { recursive: true });
  for (const file of readdirSync(dir).filter((f) => /-far-\d+\.png$/.test(f))) {
    const name = file.replace(/\.png$/, "");
    const cutFile = `art/cuts/wall-${name}.json`;
    if (!existsSync(cutFile)) {
      console.warn(`wall ${name}: painted but not cut yet (no ${cutFile}); its venue keeps its photo`);
      continue;
    }
    await tolerant(`wall ${name}`, strict, async () => {
      const w = await wallCrop(readFileSync(join(dir, file)), JSON.parse(readFileSync(cutFile, "utf8")));
      writeFileSync(join(OUT, `backdrops/${name}.png`), w.png);
      registry.walls[name] = { file: `backdrops/${name}.png`, width: w.width, height: w.height, floor: w.floor, top: w.top, bottom: w.bottom };
      console.log(`wall ${name}: ${w.width}x${w.height}, its floor at ${w.floor}`);
    });
  }
  for (const file of readdirSync(dir).filter((f) => /-(mid|fore)\.png$/.test(f))) {
    const sheet = file.replace(/\.png$/, "");
    await tolerant(`pieces ${sheet}`, strict, async () => {
      const pieces = await sheetPieces(await keyOut(readFileSync(join(dir, file))));
      pieces.forEach((p, i) => {
        const name = `${sheet}-${i + 1}`;
        writeFileSync(join(OUT, `backdrops/${name}.png`), p.png);
        registry.pieces[name] = { file: `backdrops/${name}.png`, width: p.width, height: p.height, base: p.base };
      });
      console.log(`pieces ${sheet}: ${pieces.length}`);
    });
  }
}


/** How tall a pickup's copy is stored: more than twice the most the game draws it (on a tall phone at three times its pixels). */
const PRODUCT_HEIGHT = 720;

/** The pickups' pictures in public/ cut to what is painted and stored small, for the game (the shipped game keeps the originals). */
async function products() {
  const table = JSON.parse(readFileSync("src/render/products.json", "utf8"));
  mkdirSync(join(OUT, "products"), { recursive: true });
  for (const [name, p] of Object.entries(table)) {
    const src = join("public", p.file);
    if (!existsSync(src)) continue;
    const [x0, y0, x1, y1] = p.box;
    const png = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).resize({ height: Math.min(PRODUCT_HEIGHT, y1 - y0), kernel: "lanczos3" }).png().toBuffer();
    writeFileSync(join(OUT, `products/${name}.png`), png);
  }
}

/**
 * Every picture the sync wrote, published as WebP (a tenth of the bytes, the same to the eye at the size the game draws
 * it): each PNG under public/art converted and removed, and the names in the rigs and the registry renamed.
 */
const BANQUET = { room: "art/incoming/backdrops/ballroom.png", table: "art/incoming/props/banquet-table.png", food: "art/incoming/props/food-sheet.png" };

/** The banquet (R4 §10): the ballroom and the table placed by their cuts, the food sheet cut into its sixteen dishes. */
async function banquet(registry) {
  registry.banquet = {};
  mkdirSync(join(OUT, "banquet"), { recursive: true });
  const cutOf = (name, what, fallback) => {
    const file = `art/cuts/${name}.json`;
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
    console.warn(`${what}: painted but not cut yet (no ${file}); ${fallback}`);
    return null;
  };
  if (existsSync(BANQUET.room)) {
    const cut = cutOf("ballroom", "ballroom", "the drawn room stands in");
    if (cut)
      await tolerant("ballroom", strict, async () => {
        const meta = await sharp(BANQUET.room).metadata();
        writeFileSync(join(OUT, "banquet/room.png"), await sharp(BANQUET.room).png().toBuffer());
        registry.banquet.room = { file: "banquet/room.png", width: meta.width, height: meta.height, table: { x: cut.table[0], y: cut.table[1] }, span: cut.span };
        console.log(`ballroom: ${meta.width}x${meta.height}, the table's middle at ${cut.table}, ${cut.span} px across`);
      });
  }
  if (existsSync(BANQUET.table)) {
    const cut = cutOf("banquet-table", "banquet table", "the drawn table stands in");
    if (cut)
      await tolerant("banquet table", strict, async () => {
        const keyed = await keyOut(readFileSync(BANQUET.table));
        const [cx, cy] = cut.top.center;
        const [rx, ry] = cut.top.radii;
        // The game's top is 0.37 as deep as wide (TABLE.squash, measured off this painting); a cut far off that would stretch it.
        if (Math.abs(ry / rx - 0.37) > 0.05) throw new Error(`its top is ${(ry / rx).toFixed(2)} as deep as wide; the game's is 0.37`);
        writeFileSync(join(OUT, "banquet/table.png"), keyed.png);
        registry.banquet.table = { file: "banquet/table.png", width: keyed.width, height: keyed.height, top: { cx, cy, rx, ry } };
        console.log(`banquet table: ${keyed.width}x${keyed.height}, its top ${2 * rx}x${2 * ry}`);
      });
  }
  if (existsSync(BANQUET.food))
    await tolerant("food sheet", strict, async () => {
      const cells = await foodCells(readFileSync(BANQUET.food));
      registry.banquet.food = cells.map((c, i) => {
        const file = `banquet/food-${i + 1}.png`;
        writeFileSync(join(OUT, file), c.png);
        return { file, width: c.width, height: c.height };
      });
      console.log(`food sheet: ${cells.length} dishes`);
    });
}

async function publish(registry) {
  const pngs = [];
  const rigs = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".png")) pngs.push(p);
      else if (e.name.endsWith("-rig.json")) rigs.push(p);
    }
  };
  walk(OUT);
  // Eight at a time: the encoder's own threads do the rest.
  for (let i = 0; i < pngs.length; i += 8)
    await Promise.all(
      pngs.slice(i, i + 8).map(async (p) => {
        writeFileSync(p.slice(0, -4) + ".webp", await toWebp(readFileSync(p)));
        unlinkSync(p);
      }),
    );
  for (const p of rigs) writeFileSync(p, JSON.stringify(webpPaths(JSON.parse(readFileSync(p, "utf8")))));
  console.log(`published ${pngs.length} pictures as WebP`);
  return webpPaths(registry);
}

const registry = { version: 1, hammer: { heads: {}, bodies: {}, props: {}, portrait: null }, cast: { bodies: {}, hats: {} }, backdrops: {}, walls: {}, pieces: {} };
mkdirSync(join(OUT, "hammer"), { recursive: true });
guard(ownerFiles());
await heads(registry);
await props(registry);
await bodies(registry);
await cast(registry);
await pig(registry);
await backdrops(registry);
await walls(registry);
await banquet(registry);
await products();
writeFileSync(join(OUT, "registry.json"), JSON.stringify(await publish(registry), null, 2) + "\n");
console.log(`wrote ${OUT}/registry.json`);
