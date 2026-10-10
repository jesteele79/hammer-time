// Owner green-screen plates in, registered transparent parts out. Never edits the inputs.
import sharp from "sharp";

const MARGIN = 8;

/**
 * Chroma key: bright, green-dominant pixels of hue 90-150 at saturation above
 * 0.45, with a soft ramp so edges antialias. Dark ink is never green: a
 * (0, 3, 0) pixel has the hue but not the light.
 */
function alphaOf(r, g, b) {
  if (g < 90 || g - Math.max(r, b) < 40) return 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const sat = max ? (max - min) / max : 0;
  if (sat < 0.35) return 255;
  const hue = (60 * ((b - r) / (max - min || 1)) + 120 + 360) % 360;
  if (hue < 90 || hue > 150) return 255;
  const k = Math.min(1, Math.max(0, (sat - 0.45) / 0.1));
  return Math.round(255 * (1 - k));
}

/**
 * Keys the green out of a plate and crops to the subject plus an 8 px margin.
 * `offset` is the crop's top-left in the source, so polygons measured on the
 * source image can be mapped onto the result.
 */
export async function keyOut(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const out = Buffer.from(data);
  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = alphaOf(out[i], out[i + 1], out[i + 2]);
      out[i + 3] = a;
      if (a === 0) continue;
      // Despill: an edge pixel's green is pulled down to the mean of its red and blue.
      if (a < 255 || out[i + 1] > Math.max(out[i], out[i + 2]) + 40)
        out[i + 1] = Math.round((out[i] + out[i + 2]) / 2);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  if (x1 < 0) throw new Error("keyOut: no subject found");
  const left = Math.max(0, x0 - MARGIN),
    top = Math.max(0, y0 - MARGIN);
  const cw = Math.min(W, x1 + 1 + MARGIN) - left,
    ch = Math.min(H, y1 + 1 + MARGIN) - top;
  const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .png()
    .toBuffer();
  return {
    png,
    width: cw,
    height: ch,
    bbox: { x0: x0 - left, y0: y0 - top, x1: x1 + 1 - left, y1: y1 + 1 - top },
    offset: { x: left, y: top },
  };
}

async function alphaMask(png, scale = 1) {
  let s = sharp(png).ensureAlpha();
  if (scale !== 1) {
    const meta = await sharp(png).metadata();
    s = s.resize(Math.max(1, Math.round(meta.width * scale)), Math.max(1, Math.round(meta.height * scale)));
  }
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  const m = new Uint8Array(info.width * info.height);
  for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  return { m, w: info.width, h: info.height };
}

function rowSpan(mask, y) {
  let a = -1,
    b = -1;
  for (let x = 0; x < mask.w; x++)
    if (mask.m[y * mask.w + x]) {
      if (a < 0) a = x;
      b = x;
    }
  return a < 0 ? null : [a, b];
}

/**
 * Head anchors in plate pixels. The neck is the center of the lowest opaque
 * row, the crown the center of the topmost. A left-facing profile's face box
 * runs from the leftmost opaque pixel (the nose) to 48% of the width (the
 * cheek in front of the ear) and from 30% to 82% of the height (eyebrows to chin).
 * A three-quarter plate's box is 10%..70% wide and 28%..78% high.
 */
export async function registerHead(png, kind) {
  const mask = await alphaMask(png);
  const { w, h } = mask;
  let top = -1,
    bottom = -1,
    leftMost = w;
  for (let y = 0; y < h; y++) {
    const s = rowSpan(mask, y);
    if (!s) continue;
    if (top < 0) top = y;
    bottom = y;
    if (s[0] < leftMost) leftMost = s[0];
  }
  const neckSpan = rowSpan(mask, bottom),
    topSpan = rowSpan(mask, top);
  const face =
    kind === "profile"
      ? { x: leftMost, y: Math.round(h * 0.3), w: Math.round(w * 0.48) - leftMost, h: Math.round(h * 0.52) }
      : { x: Math.round(w * 0.1), y: Math.round(h * 0.28), w: Math.round(w * 0.6), h: Math.round(h * 0.5) };
  return {
    width: w,
    height: h,
    neck: { x: Math.round((neckSpan[0] + neckSpan[1]) / 2), y: bottom },
    crown: { x: Math.round((topSpan[0] + topSpan[1]) / 2), y: top },
    face,
  };
}

/** Outline overlap an expression plate needs to stand in for the neutral one. */
export const ALIGN_MIN = 0.85;

/** "ok" above the gate; below it "skip" (the neutral plate stands in) unless strict, then "refuse". */
export function gateExpression(overlap, { strict = false } = {}) {
  if (overlap >= ALIGN_MIN) return "ok";
  return strict ? "refuse" : "skip";
}

/**
 * An expression plate's anchors, carried over from the neutral plate through
 * its alignment: alignTo maps a reference point p to (p + d) / scale on the
 * candidate. A plate framed with a longer neck or a wider margin keeps the
 * face box where the face is, instead of where a fixed fraction would put it.
 */
export function registerAligned(reference, align, { width, height }) {
  const map = (p) => ({
    x: Math.round((p.x + align.dx) / align.scale),
    y: Math.round((p.y + align.dy) / align.scale),
  });
  const corner = map({ x: reference.face.x, y: reference.face.y });
  return {
    width,
    height,
    neck: map(reference.neck),
    crown: map(reference.crown),
    face: {
      x: corner.x,
      y: corner.y,
      w: Math.round(reference.face.w / align.scale),
      h: Math.round(reference.face.h / align.scale),
    },
  };
}

/**
 * Best translation (±24 px) and scale (±4%) of the candidate's silhouette onto
 * the reference's, as intersection over union. Both masks are searched at 1/4
 * scale and the offsets scaled back up.
 */
export async function alignTo(reference, candidate) {
  const down = 0.25;
  const ref = await alphaMask(reference, down);
  let best = { dx: 0, dy: 0, scale: 1, overlap: 0 };
  for (const scale of [0.96, 0.98, 1, 1.02, 1.04]) {
    const cand = await alphaMask(candidate, down * scale);
    const reach = Math.round(24 * down);
    for (let dy = -reach; dy <= reach; dy++)
      for (let dx = -reach; dx <= reach; dx++) {
        let inter = 0,
          union = 0;
        for (let y = 0; y < ref.h; y++) {
          const cy = y + dy;
          for (let x = 0; x < ref.w; x++) {
            const cx = x + dx;
            const a = ref.m[y * ref.w + x];
            const b = cy >= 0 && cy < cand.h && cx >= 0 && cx < cand.w ? cand.m[cy * cand.w + cx] : 0;
            inter += a & b;
            union += a | b;
          }
        }
        // Candidate pixels outside the reference's frame count against it too.
        for (let y = 0; y < cand.h; y++)
          for (let x = 0; x < cand.w; x++) {
            const rx = x - dx,
              ry = y - dy;
            if (rx < 0 || rx >= ref.w || ry < 0 || ry >= ref.h) union += cand.m[y * cand.w + x];
          }
        const overlap = union ? inter / union : 0;
        if (overlap > best.overlap) best = { dx: Math.round(dx / down), dy: Math.round(dy / down), scale, overlap };
      }
  }
  return best;
}

/** Scanline-fills a polygon (source-image pixels) into a mask of the given size at the given offset. */
export function polygonMask(polygon, width, height, offset) {
  const m = new Uint8Array(width * height);
  const pts = polygon.map(([x, y]) => [x - offset.x, y - offset.y]);
  for (let y = 0; y < height; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i],
        [bx, by] = pts[(i + 1) % pts.length];
      if (ay === by) continue;
      const cy = y + 0.5;
      if ((cy >= ay && cy < by) || (cy >= by && cy < ay)) xs.push(ax + ((cy - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(width, Math.floor(xs[k + 1] + 0.5)); x++)
        m[y * width + x] = 1;
  }
  return m;
}

const DRAW_ORDER = [
  "upperArmFar",
  "forearmFar",
  "thighFar",
  "shinFar",
  "torso",
  "hips",
  "thighNear",
  "shinNear",
  "upperArmNear",
  "forearmNear",
  "sleeveNear",
];

/** Orange-brown skin, as painted in the plates: hue 8-45, saturation over 0.3, not too dark. */
function isSkin(r, g, b) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  if (max < 70) return false;
  const sat = (max - min) / max;
  if (sat < 0.3) return false;
  let hue;
  if (max === r) hue = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) hue = 60 * ((b - r) / (max - min)) + 120;
  else hue = 60 * ((r - g) / (max - min)) + 240;
  return hue >= 8 && hue <= 45;
}

/** A skin mask grown by `radius` so the arm's outline and shadow stay with the arm. */
function skinMask(data, W, H, radius) {
  const skin = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++)
    if (data[i * 4 + 3] > 127 && isSkin(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])) skin[i] = 1;
  const grown = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!skin[y * W + x]) continue;
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && xx < W && yy >= 0 && yy < H && dx * dx + dy * dy <= radius * radius) grown[yy * W + xx] = 1;
        }
    }
  return grown;
}

/**
 * Cuts a keyed A-pose body into rig parts. A part's polygon is coarse; its
 * `material` ("skin", "cloth" or absent for anything) decides which pixels
 * inside it are the part's. A pixel claimed by two parts goes to the later one
 * in the draw order. Where a part was painted behind another (the torso under
 * the near arm, the far leg under the near leg) the uncovered hole is filled
 * with the part's base color sampled at `fillFrom`, and the hole's boundary
 * gets an outline so the part keeps its edge. Polygon coordinates are in the
 * keyed crop's pixels when `cuts.space` is "crop", else in source pixels.
 */
export async function sliceBody(keyed, cuts, costume = "affliction") {
  const { data, info } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const offset = cuts.space === "crop" ? { x: 0, y: 0 } : keyed.offset;
  const names = Object.keys(cuts.parts);
  const skin = skinMask(data, W, H, 5);
  // A costume may override a part's material and fill (a jacket sleeve is cloth where a bare arm is skin).
  const spec = (name) => ({ ...cuts.parts[name], ...(cuts.overrides?.[costume]?.[name] ?? {}) });
  const masks = {};
  const caps = {};
  const fillCaps = {};
  for (const name of names) {
    const m = polygonMask(cuts.parts[name].polygon, W, H, offset);
    const material = spec(name).material;
    if (material === "skin") for (let i = 0; i < m.length; i++) m[i] = m[i] && skin[i] ? 1 : 0;
    if (material === "cloth") for (let i = 0; i < m.length; i++) m[i] = m[i] && !skin[i] ? 1 : 0;
    // Round caps at a joint: a disc the part keeps (or, lost to a later part, has filled in)
    // so the limb ends in a ball that stays covered however the next part turns. A "fill"
    // cap is painted flat in the part's base color: skin under a sleeve that only shows
    // when the arm swings out.
    const cap = new Uint8Array(W * H);
    const fillCap = new Uint8Array(W * H);
    for (const [cx, cy, r, capMaterial] of cuts.parts[name].caps ?? []) {
      const x0 = cx - offset.x,
        y0 = cy - offset.y;
      for (let y = Math.max(0, Math.floor(y0 - r)); y <= Math.min(H - 1, Math.ceil(y0 + r)); y++)
        for (let x = Math.max(0, Math.floor(x0 - r)); x <= Math.min(W - 1, Math.ceil(x0 + r)); x++) {
          if ((x - x0) ** 2 + (y - y0) ** 2 > r * r) continue;
          const i = y * W + x;
          if (capMaterial === "fill") {
            fillCap[i] = 1;
            continue;
          }
          if (capMaterial === "skin" && !skin[i]) continue;
          if (capMaterial === "cloth" && skin[i]) continue;
          cap[i] = 1;
          m[i] = 1;
        }
    }
    masks[name] = m;
    caps[name] = cap;
    fillCaps[name] = fillCap;
  }
  // Ownership: the last part in draw order that claims an opaque pixel wins it.
  const owner = new Int8Array(W * H).fill(-1);
  const order = DRAW_ORDER.filter((n) => names.includes(n)).concat(names.filter((n) => !DRAW_ORDER.includes(n)));
  order.forEach((name, idx) => {
    const m = masks[name];
    for (let i = 0; i < m.length; i++) if (m[i] && data[i * 4 + 3] > 0) owner[i] = idx;
  });
  // Holes are judged against the coarse polygon, so a cloth part under a skin arm gets filled.
  const coarse = {};
  for (const name of names) coarse[name] = polygonMask(cuts.parts[name].polygon, W, H, offset);
  // A cover (a sleeve over a bare arm) hides what is under it; it never counts as a hole.
  const coverIdx = new Set(order.map((n, i) => (spec(n).cover ? i : -1)).filter((i) => i >= 0));
  const parts = {};
  for (const [idx, name] of order.entries()) {
    const part = spec(name);
    const m = coarse[name];
    const cap = caps[name];
    const fillCap = fillCaps[name];
    const buf = Buffer.alloc(W * H * 4);
    let fill = null;
    if (part.fillFrom) {
      const fx = part.fillFrom[0] - offset.x,
        fy = part.fillFrom[1] - offset.y;
      const i = (fy * W + fx) * 4;
      fill = [data[i], data[i + 1], data[i + 2]];
    }
    let x0 = W,
      y0 = H,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!m[i] && !cap[i] && !fillCap[i]) continue;
        const o = i * 4;
        if (owner[i] === idx) {
          buf.set(data.subarray(o, o + 4), o);
        } else if (fillCap[i] && fill) {
          // Hidden under a cover, so a shade darker than the lit base.
          const shade = part.fillShade ?? 1;
          buf[o] = Math.round(fill[0] * shade);
          buf[o + 1] = Math.round(fill[1] * shade);
          buf[o + 2] = Math.round(fill[2] * shade);
          buf[o + 3] = 255;
        } else if (owner[i] > idx && fill && !coverIdx.has(owner[i])) {
          // Painted behind a later part: restore the base fill, outlined along the part's edge.
          const near = [i - 3, i + 3, i - 3 * W, i + 3 * W].some((j) => j >= 0 && j < W * H && !m[j] && !cap[j]);
          const c = near ? [16, 16, 16] : fill;
          buf[o] = c[0];
          buf[o + 1] = c[1];
          buf[o + 2] = c[2];
          buf[o + 3] = 255;
        } else continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    if (x1 < 0) throw new Error(`sliceBody: part ${name} is empty`);
    const left = Math.max(0, x0 - MARGIN),
      top = Math.max(0, y0 - MARGIN);
    const cw = Math.min(W, x1 + 1 + MARGIN) - left,
      ch = Math.min(H, y1 + 1 + MARGIN) - top;
    const png = await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left, top, width: cw, height: ch })
      .png()
      .toBuffer();
    const local = ([x, y]) => ({ x: x - offset.x - left, y: y - offset.y - top });
    parts[name] = { png, width: cw, height: ch, pivot: local(part.pivot), tip: local(part.tip) };
  }
  return parts;
}

/**
 * Lays a chain of parts out as one horizontal strip: each bone turned to run
 * along +x, every joint on the center row, each part composited over the one
 * before it. A rope mesh then bends the strip as a single piece. `joints` are
 * the x positions of the chain's joints along the strip, first to last.
 */
export async function buildStrip(parts) {
  const placed = [];
  for (const part of parts) {
    const dx = part.tip.x - part.pivot.x,
      dy = part.tip.y - part.pivot.y;
    const theta = Math.atan2(dy, dx);
    const png = await sharp(part.png)
      .rotate((-theta * 180) / Math.PI, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const meta = await sharp(png).metadata();
    // sharp turns about the center and grows the canvas to fit; a point follows the same turn.
    const map = (p) => {
      const x = p.x - part.width / 2,
        y = p.y - part.height / 2;
      return {
        x: x * Math.cos(theta) + y * Math.sin(theta) + meta.width / 2,
        y: -x * Math.sin(theta) + y * Math.cos(theta) + meta.height / 2,
      };
    };
    placed.push({ png, width: meta.width, height: meta.height, pivot: map(part.pivot), tip: map(part.tip) });
  }
  const cy = Math.ceil(Math.max(...placed.map((p) => Math.max(p.pivot.y, p.height - p.pivot.y))));
  const layers = [];
  const joints = [];
  let x = placed[0].pivot.x;
  let minLeft = 0,
    maxRight = 0;
  for (const p of placed) {
    const left = x - p.pivot.x,
      top = cy - p.pivot.y;
    layers.push({ p, left, top });
    minLeft = Math.min(minLeft, left);
    maxRight = Math.max(maxRight, left + p.width);
    joints.push(x);
    x += Math.hypot(p.tip.x - p.pivot.x, p.tip.y - p.pivot.y);
  }
  joints.push(x);
  const shift = -minLeft;
  const width = Math.ceil(maxRight + shift),
    height = 2 * cy;
  const png = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map(({ p, left, top }) => ({ input: p.png, left: Math.round(left + shift), top: Math.round(top) })))
    .png()
    .toBuffer();
  return { png, width, height, centerY: cy, joints: joints.map((j) => j + shift) };
}
