// Owner green-screen plates in, registered transparent parts out. Never edits the inputs.
import sharp from "sharp";

const MARGIN = 8;

/** Chroma key: green hue 90-150 at saturation above 0.45, with a soft ramp so edges antialias. */
function alphaOf(r, g, b) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const sat = max ? (max - min) / max : 0;
  if (max !== g || sat < 0.35) return 255;
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
];

/**
 * Cuts a keyed A-pose body into rig parts. A pixel claimed by two polygons
 * goes to the later part in the draw order. Where a part was painted behind
 * another (the torso under the near arm, the far leg under the near leg) the
 * uncovered hole is filled with the part's base color sampled at `fillFrom`,
 * and the hole's boundary gets a 4 px outline so the part keeps its edge.
 */
export async function sliceBody(keyed, cuts) {
  const { data, info } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const names = Object.keys(cuts.parts);
  const masks = {};
  for (const name of names) masks[name] = polygonMask(cuts.parts[name].polygon, W, H, keyed.offset);
  // Ownership: the last part in draw order that claims an opaque pixel wins it.
  const owner = new Int8Array(W * H).fill(-1);
  const order = DRAW_ORDER.filter((n) => names.includes(n)).concat(names.filter((n) => !DRAW_ORDER.includes(n)));
  order.forEach((name, idx) => {
    const m = masks[name];
    for (let i = 0; i < m.length; i++) if (m[i] && data[i * 4 + 3] > 0) owner[i] = idx;
  });
  const parts = {};
  for (const [idx, name] of order.entries()) {
    const spec = cuts.parts[name];
    const m = masks[name];
    const buf = Buffer.alloc(W * H * 4);
    let fill = null;
    if (spec.fillFrom) {
      const fx = spec.fillFrom[0] - keyed.offset.x,
        fy = spec.fillFrom[1] - keyed.offset.y;
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
        if (!m[i]) continue;
        const o = i * 4;
        if (owner[i] === idx) {
          buf.set(data.subarray(o, o + 4), o);
        } else if (owner[i] > idx && fill) {
          // Painted behind a later part: restore the base fill, outlined where the hole meets the owner.
          const edge = [i - 1, i + 1, i - W, i + W].some((j) => j >= 0 && j < W * H && (owner[j] === idx || !m[j]));
          const near = [i - 2, i + 2, i - 2 * W, i + 2 * W].some((j) => j >= 0 && j < W * H && !m[j]);
          const c = edge || near ? [16, 16, 16] : fill;
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
    const local = ([x, y]) => ({ x: x - keyed.offset.x - left, y: y - keyed.offset.y - top });
    parts[name] = { png, width: cw, height: ch, pivot: local(spec.pivot), tip: local(spec.tip) };
  }
  return parts;
}
