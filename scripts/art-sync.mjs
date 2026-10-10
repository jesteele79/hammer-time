// Turns the owner's plates under art/incoming into registered game art under
// public/art, and records every owner file's hash in art/manifest.json.
// Usage: node scripts/art-sync.mjs [--overlay] [--strict] [--accept <owner file>]
//   --strict  refuse a misaligned expression plate instead of skipping it (art:sync, tests)
//   --accept  re-record one owner file the owner regenerated on purpose
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";
import { keyOut, registerHead, registerAligned, alignTo, gateExpression, ALIGN_MIN, sliceBody } from "./art-cut.mjs";
import { ink } from "./ink.mjs";

const OUT = "public/art";
const HAMMER_IN = "art/incoming/hammer";
const MANIFEST = "art/manifest.json";
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

async function bodies(registry) {
  const cutsFile = "art/cuts/hammer-body.json";
  if (!existsSync(cutsFile)) {
    console.warn("no art/cuts/hammer-body.json; bodies are not sliced");
    return;
  }
  const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
  for (const costume of COSTUMES) {
    const file = join(HAMMER_IN, `body-${costume}.png`);
    if (!existsSync(file)) continue;
    const keyed = await keyOut(readFileSync(file));
    const parts = await sliceBody(keyed, cuts, costume);
    registry.hammer.bodies[costume] = { parts: {}, span: cuts.sole - cuts.collar };
    for (const [name, part] of Object.entries(parts)) {
      const outFile = `hammer/${costume}-${name}.png`;
      writeFileSync(join(OUT, outFile), part.png);
      registry.hammer.bodies[costume].parts[name] = {
        file: outFile,
        width: part.width,
        height: part.height,
        pivot: part.pivot,
        tip: part.tip,
      };
    }
    console.log(`body ${costume}: ${Object.keys(parts).length} parts (crop offset ${keyed.offset.x},${keyed.offset.y}, ${keyed.width}x${keyed.height})`);
    if (overlay && costume === "affliction") await drawOverlay(keyed, cuts);
  }
}

/** The polygons and pivots drawn over the keyed body, for checking the cuts by eye. */
async function drawOverlay(keyed, cuts) {
  const off = cuts.space === "crop" ? { x: 0, y: 0 } : keyed.offset;
  const colors = ["#ff3b3b", "#3bb0ff", "#ffd23b", "#3bff7a", "#ff7ad9", "#ffa03b", "#8a3bff", "#3bfff0", "#c0ff3b", "#ff3b9b"];
  const shapes = Object.entries(cuts.parts)
    .map(([name, p], i) => {
      const pts = p.polygon.map(([x, y]) => `${x - off.x},${y - off.y}`).join(" ");
      const [px, py] = [p.pivot[0] - off.x, p.pivot[1] - off.y];
      const [tx, ty] = [p.tip[0] - off.x, p.tip[1] - off.y];
      const c = colors[i % colors.length];
      return `<polygon points="${pts}" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="3"/>
        <circle cx="${px}" cy="${py}" r="9" fill="${c}"/><circle cx="${tx}" cy="${ty}" r="6" fill="#fff" stroke="${c}" stroke-width="3"/>
        <text x="${px + 12}" y="${py - 8}" font-size="26" font-family="sans-serif" fill="${c}" stroke="#000" stroke-width="1">${name}</text>`;
    })
    .join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${keyed.width}" height="${keyed.height}">${shapes}</svg>`;
  mkdirSync("artifacts", { recursive: true });
  await sharp(keyed.png)
    .flatten({ background: "#223" })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile("artifacts/body-cuts.png");
  console.log("wrote artifacts/body-cuts.png");
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
