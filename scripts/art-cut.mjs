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
    leftMost = w,
    noseY = 0;
  for (let y = 0; y < h; y++) {
    const s = rowSpan(mask, y);
    if (!s) continue;
    if (top < 0) top = y;
    bottom = y;
    if (s[0] < leftMost) {
      leftMost = s[0];
      noseY = y;
    }
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
    // A profile's leftmost point is the tip of the nose: snot leaves from just ahead of it.
    nose: { x: leftMost, y: noseY },
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
    nose: map(reference.nose),
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

/** Layers from front to back: a painted pixel inside several polygons belongs to the first. */
export const LAYER_ORDER = ["armNear", "torso", "legNear", "legFar", "armFar"];
/** The owner of a painted pixel no layer draws and no layer may claim. */
const DROPPED = -2;
/** The order they are drawn in, back to front. */
export const LAYER_Z = ["armFar", "legFar", "legNear", "torso", "armNear"];
/**
 * A cast body's cut adds its head: claimed after the torso, so the collar stays with the jacket,
 * and drawn behind it, so the neck runs on down under the collar however the head turns.
 */
export const layerOrder = (cuts) => (cuts.layers.head ? ["armNear", "torso", "head", "legNear", "legFar", "armFar"] : LAYER_ORDER);
export const layerZ = (cuts) => (cuts.layers.head ? ["armFar", "legFar", "legNear", "head", "torso", "armNear"] : LAYER_Z);
const OUTLINE = [16, 16, 16];
const OUTLINE_PX = 3;

/** A layer's settings for one costume; an override of null drops a base setting. */
const layerSpec = (cuts, costume, name) => {
  const spec = { ...cuts.layers[name], ...(cuts.overrides?.[costume]?.layers?.[name] ?? {}) };
  for (const k of Object.keys(spec)) if (spec[k] === null) delete spec[k];
  return spec;
};

/**
 * Paints the `target` pixels of an RGBA buffer from the `known` pixels around
 * them: a push-pull pyramid (each level averages the known pixels below it,
 * then fills the gaps above it from the level below), relaxed toward the mean
 * of the neighbours so the fill has no blocks. Targets end opaque.
 */
export function pushPullFill(rgba, W, H, known, target, relax = 40) {
  const levels = [];
  let w = W,
    h = H;
  let c = new Float32Array(w * h * 3),
    a = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    if (known[i]) {
      c[i * 3] = rgba[i * 4];
      c[i * 3 + 1] = rgba[i * 4 + 1];
      c[i * 3 + 2] = rgba[i * 4 + 2];
      a[i] = 1;
    }
  levels.push({ w, h, c, a });
  while (w > 1 || h > 1) {
    const nw = Math.ceil(w / 2),
      nh = Math.ceil(h / 2);
    const nc = new Float32Array(nw * nh * 3),
      na = new Float32Array(nw * nh);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!a[i]) continue;
        const j = (y >> 1) * nw + (x >> 1);
        nc[j * 3] += c[i * 3] * a[i];
        nc[j * 3 + 1] += c[i * 3 + 1] * a[i];
        nc[j * 3 + 2] += c[i * 3 + 2] * a[i];
        na[j] += a[i];
      }
    for (let j = 0; j < nw * nh; j++)
      if (na[j] > 0) {
        nc[j * 3] /= na[j];
        nc[j * 3 + 1] /= na[j];
        nc[j * 3 + 2] /= na[j];
        na[j] = Math.min(1, na[j]);
      }
    levels.push({ w: nw, h: nh, c: nc, a: na });
    w = nw;
    h = nh;
    c = nc;
    a = na;
  }
  const sample = (lv, fx, fy, out) => {
    const x0 = Math.max(0, Math.min(lv.w - 1, Math.floor(fx))),
      y0 = Math.max(0, Math.min(lv.h - 1, Math.floor(fy)));
    const x1 = Math.min(lv.w - 1, x0 + 1),
      y1 = Math.min(lv.h - 1, y0 + 1);
    const tx = Math.max(0, Math.min(1, fx - x0)),
      ty = Math.max(0, Math.min(1, fy - y0));
    for (let k = 0; k < 3; k++) {
      const top = lv.c[(y0 * lv.w + x0) * 3 + k] * (1 - tx) + lv.c[(y0 * lv.w + x1) * 3 + k] * tx;
      const bottom = lv.c[(y1 * lv.w + x0) * 3 + k] * (1 - tx) + lv.c[(y1 * lv.w + x1) * 3 + k] * tx;
      out[k] = top * (1 - ty) + bottom * ty;
    }
  };
  const px = [0, 0, 0];
  for (let l = levels.length - 2; l >= 0; l--) {
    const fine = levels[l],
      coarse = levels[l + 1];
    for (let y = 0; y < fine.h; y++)
      for (let x = 0; x < fine.w; x++) {
        const i = y * fine.w + x;
        const t = fine.a[i];
        if (t >= 1) continue;
        sample(coarse, (x + 0.5) / 2 - 0.5, (y + 0.5) / 2 - 0.5, px);
        for (let k = 0; k < 3; k++) fine.c[i * 3 + k] = fine.c[i * 3 + k] * t + px[k] * (1 - t);
        fine.a[i] = 1;
      }
  }
  const base = levels[0].c;
  const cols = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++)
    for (let k = 0; k < 3; k++) cols[i * 3 + k] = known[i] ? rgba[i * 4 + k] : base[i * 3 + k];
  const inside = (i) => known[i] || target[i];
  for (let it = 0; it < relax; it++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!target[i]) continue;
        let n = 0;
        const sum = [0, 0, 0];
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
          if (j < 0 || !inside(j)) continue;
          for (let k = 0; k < 3; k++) sum[k] += cols[j * 3 + k];
          n++;
        }
        if (n) for (let k = 0; k < 3; k++) cols[i * 3 + k] = sum[k] / n;
      }
  for (let i = 0; i < W * H; i++)
    if (target[i]) {
      for (let k = 0; k < 3; k++) rgba[i * 4 + k] = Math.round(Math.max(0, Math.min(255, cols[i * 3 + k])));
      rgba[i * 4 + 3] = 255;
    }
}

/**
 * Paints a limb's hidden stretch by carrying its painted cross-section along
 * the bone: from each target pixel, step along the chain toward the hand until
 * a known pixel, and take its color, outline and shading included, so the limb
 * runs on as a limb. Returns the targets no step reached, for push-pull.
 */
function extrudeFill(rgba, W, H, known, target, chain) {
  const rest = new Uint8Array(W * H);
  const segs = chain.slice(1).map((b, i) => {
    const a = chain[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, L, dx: (b[0] - a[0]) / L, dy: (b[1] - a[1]) / L };
  });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!target[i]) continue;
      let seg = segs[0],
        best = Infinity;
      for (const sg of segs) {
        const t = Math.max(0, Math.min(sg.L, (x - sg.a[0]) * sg.dx + (y - sg.a[1]) * sg.dy));
        const d = Math.hypot(x - (sg.a[0] + t * sg.dx), y - (sg.a[1] + t * sg.dy));
        if (d < best) {
          best = d;
          seg = sg;
        }
      }
      let hit = -1;
      for (let k = 1; k <= 400 && hit < 0; k++) {
        const xx = Math.round(x + seg.dx * k),
          yy = Math.round(y + seg.dy * k);
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) break;
        if (known[yy * W + xx]) hit = yy * W + xx;
      }
      if (hit < 0) {
        rest[i] = 1;
        continue;
      }
      rgba[i * 4] = rgba[hit * 4];
      rgba[i * 4 + 1] = rgba[hit * 4 + 1];
      rgba[i * 4 + 2] = rgba[hit * 4 + 2];
      rgba[i * 4 + 3] = 255;
      known[i] = 1;
    }
  return rest;
}

/**
 * Paints a limb's hidden stretch from another limb's painting: each target pixel
 * is placed in its own bone's frame (how far along, how far across) and takes the
 * painted pixel at the same place in the source bone's frame, if that pixel lies
 * in the source's polygons. Where the source has no paint the target stays
 * empty, so the carried stretch keeps the source limb's shape, sleeve and all.
 * `scale` and `shift` fit it across the bone (the target is `scale` times as wide
 * and its middle `shift` px off its bone), and `width` keeps only the source within
 * that distance of its bone. Returns the pixels it painted.
 */
function carryOver(rgba, data, W, H, target, source, from, to, { width = Infinity, scale = 1, shift = 0 } = {}) {
  const frame = ([a, b]) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L = Math.hypot(dx, dy);
    return { a, dx, dy, L, ux: dx / L, uy: dy / L, nx: -dy / L, ny: dx / L };
  };
  const f = frame(to),
    g = frame(from);
  const carried = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!target[i]) continue;
      const t = ((x - f.a[0]) * f.ux + (y - f.a[1]) * f.uy) / f.L;
      const s = ((x - f.a[0]) * f.nx + (y - f.a[1]) * f.ny - shift) / scale;
      if (Math.abs(s) > width) continue;
      const qx = Math.round(g.a[0] + g.dx * t + g.nx * s),
        qy = Math.round(g.a[1] + g.dy * t + g.ny * s);
      if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
      const q = qy * W + qx;
      if (!source[q] || data[q * 4 + 3] < 160) continue;
      data.copy(rgba, i * 4, q * 4, q * 4 + 3);
      rgba[i * 4 + 3] = 255;
      carried[i] = 1;
    }
  return carried;
}

/**
 * A shirt's printed word, reversed along its banner, for drawing the body mirrored: the
 * painting's lettering would read backward, this reads the right way round. `quad` is the
 * banner around the word (top-left, top-right, bottom-right, bottom-left). The letters
 * (near-white) and their soft edge are lifted out and the banner painted in under them;
 * then each pixel takes the letter from the mirrored place along the banner (s becomes
 * 1 - s at the same height across it), stretched to the banner's height there. Outside
 * the quad, and outside the body, nothing changes.
 */
export function reverseLettering(rgba, W, H, { quad }) {
  const [TL, TR, BR, BL] = quad;
  const at = (s, v) => [
    (1 - v) * ((1 - s) * TL[0] + s * TR[0]) + v * ((1 - s) * BL[0] + s * BR[0]),
    (1 - v) * ((1 - s) * TL[1] + s * TR[1]) + v * ((1 - s) * BL[1] + s * BR[1]),
  ];
  // The bilinear map inverted by Newton's method: a few steps settle it inside a gentle quad.
  const place = (x, y) => {
    let s = 0.5,
      v = 0.5;
    for (let k = 0; k < 12; k++) {
      const [px, py] = at(s, v);
      const sx = (1 - v) * (TR[0] - TL[0]) + v * (BR[0] - BL[0]),
        sy = (1 - v) * (TR[1] - TL[1]) + v * (BR[1] - BL[1]);
      const vx = (1 - s) * (BL[0] - TL[0]) + s * (BR[0] - TR[0]),
        vy = (1 - s) * (BL[1] - TL[1]) + s * (BR[1] - TR[1]);
      const det = sx * vy - vx * sy;
      const ex = x - px,
        ey = y - py;
      s += (ex * vy - vx * ey) / det;
      v += (sx * ey - ex * sy) / det;
    }
    return [s, v];
  };
  const xs = quad.map((q) => q[0]),
    ys = quad.map((q) => q[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))),
    x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))),
    y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
  const inside = new Uint8Array(W * H),
    letter = new Uint8Array(W * H);
  const sv = new Float64Array(W * H * 2);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (rgba[i * 4 + 3] < 160) continue;
      const [s, v] = place(x, y);
      if (s < 0 || s > 1 || v < 0 || v > 1) continue;
      inside[i] = 1;
      sv[i * 2] = s;
      sv[i * 2 + 1] = v;
      const lo = Math.min(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      const hi = Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      if (lo > 140 && hi - lo < 60) letter[i] = 1;
    }
  // The letters with their soft edge: two pixels round every letter pixel.
  const lifted = new Uint8Array(W * H);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!letter[y * W + x]) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const j = (y + dy) * W + (x + dx);
          if (inside[j]) lifted[j] = 1;
        }
    }
  const out = Buffer.from(rgba);
  const known = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) known[i] = inside[i] && !lifted[i] ? 1 : 0;
  pushPullFill(out, W, H, known, lifted);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (!inside[i]) continue;
      const [qx, qy] = at(1 - sv[i * 2], sv[i * 2 + 1]).map(Math.round);
      if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
      const q = qy * W + qx;
      if (lifted[q]) rgba.copy(out, i * 4, q * 4, q * 4 + 4);
    }
  return out;
}

/** Painted-in pixels within `px` of the layer's outside take the ink outline, so a rebuilt edge reads as an edge. */
function outlineFill(rgba, W, H, visible, fill, px, only = fill) {
  const out = (x, y) => x < 0 || y < 0 || x >= W || y >= H || (!visible[y * W + x] && !fill[y * W + x]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!only[i]) continue;
      let edge = false;
      for (let dy = -px; dy <= px && !edge; dy++)
        for (let dx = -px; dx <= px && !edge; dx++) if (dx * dx + dy * dy <= px * px && out(x + dx, y + dy)) edge = true;
      if (edge) rgba.set(OUTLINE, i * 4);
    }
}

const luma = (data, i) => 0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2];

/**
 * Narrows a polygon mask to one material. Skin keeps the grown skin mask plus
 * anything it encloses (a knuckle line, a shadow), so a limb comes away whole.
 */
function materialMask(m, skin, W, H, material) {
  if (material === "cloth") {
    for (let i = 0; i < W * H; i++) if (skin[i]) m[i] = 0;
    return;
  }
  for (let i = 0; i < W * H; i++) if (!skin[i]) m[i] = m[i] ? 2 : 0;
  // Flood the non-skin pixels from outside the polygon; whatever it cannot reach is enclosed.
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let i = 0; i < W * H; i++)
    if (m[i] === 0) {
      seen[i] = 1;
      stack.push(i);
    }
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j < 0 || j >= W * H || seen[j] || m[j] !== 2) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  for (let i = 0; i < W * H; i++) if (m[i] === 2) m[i] = seen[i] ? 0 : 1;
}

/**
 * Painted pixels no polygon took (an outline's soft edge, a sliver between two
 * cuts) go to the layer of the nearest pixel that was taken, within `reach`,
 * so no limb loses its edge.
 */
function claimStragglers(owner, data, W, H, reach) {
  let front = [];
  const dist = new Uint16Array(W * H);
  for (let i = 0; i < W * H; i++) if (owner[i] >= 0) front.push(i);
  for (let d = 1; d <= reach && front.length; d++) {
    const next = [];
    for (const i of front) {
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H || owner[j] !== -1 || data[j * 4 + 3] === 0 || dist[j]) continue;
        owner[j] = owner[i];
        dist[j] = d;
        next.push(j);
      }
    }
    front = next;
  }
}

/**
 * A layer's texture with part of it folded out of sight, such as the fingers
 * curled into a fist round a handle. Paint inside `drop` is removed; the paint
 * left along the new edge gets the ink outline (`outline` px) and, inside that,
 * a band of shadow tone (`shade` px) where the surface turns away from the light.
 */
export function curlVariant(rgba, W, H, { drop, outline = 3, shade = 4 }) {
  const out = Buffer.from(rgba);
  const m = polygonMask(drop, W, H, { x: 0, y: 0 });
  const dist = new Uint8Array(W * H);
  let front = [];
  for (let i = 0; i < W * H; i++)
    if (m[i] && out[i * 4 + 3] > 0) {
      out[i * 4 + 3] = 0;
      front.push(i);
    }
  const reach = outline + shade;
  for (let d = 1; d <= reach && front.length; d++) {
    const next = [];
    for (const i of front) {
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) {
        if (j < 0 || j >= W * H || dist[j] || m[j] || out[j * 4 + 3] === 0) continue;
        dist[j] = d;
        next.push(j);
      }
    }
    front = next;
  }
  for (let i = 0; i < W * H; i++) {
    const d = dist[i];
    if (!d) continue;
    if (d <= outline) out.set(OUTLINE, i * 4);
    else {
      out[i * 4] = Math.round(out[i * 4] * 0.78);
      out[i * 4 + 1] = Math.round(out[i * 4 + 1] * 0.78);
      out[i * 4 + 2] = Math.round(out[i * 4 + 2] * 0.86);
    }
    out[i * 4 + 3] = 255;
  }
  return out;
}

/**
 * Splits a keyed body into the rig's layers. Each layer keeps the painted
 * pixels inside its polygon that no layer in front of it took (only skin when
 * its material is skin); inside its fill polygons, wherever a layer drawn over
 * it covers the painting, it is painted in from its own pixels and outlined
 * where it meets its outside. Drawn back to front at rest, the layers rebuild
 * the painting exactly.
 */
export async function separateLayers(keyed, cuts, costume = "affliction") {
  const { data, info } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const origin = { x: 0, y: 0 };
  const order = layerOrder(cuts);
  const zs = layerZ(cuts);
  const skin = skinMask(data, W, H, 5);
  const owner = new Int8Array(W * H).fill(-1);
  order.forEach((name, idx) => {
    const spec = layerSpec(cuts, costume, name);
    const m = polygonMask(spec.polygon, W, H, origin);
    if (spec.material) materialMask(m, skin, W, H, spec.material);
    for (let i = 0; i < W * H; i++) if (owner[i] < 0 && m[i] && data[i * 4 + 3] > 0) owner[i] = idx;
  });
  // The painted neck above the collar is the head's to show: those pixels belong to no layer.
  // A drop is a polygon, or { polygon, skin: true } to take only skin there (down to a collar's ink).
  for (const entry of cuts.overrides?.[costume]?.drop ?? cuts.drop ?? []) {
    const { polygon, skin: skinOnly } = Array.isArray(entry) ? { polygon: entry } : entry;
    const m = polygonMask(polygon, W, H, origin);
    for (let i = 0; i < W * H; i++)
      if (m[i] && (!skinOnly || isSkin(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]))) owner[i] = DROPPED;
  }
  claimStragglers(owner, data, W, H, 10);
  // A layer drawn in front keeps its own ink: near-black pixels just outside its edge, over a
  // layer behind it, are its outline painted across that layer (the belly's line over the far
  // forearm), so they stay with it instead of riding off on the limb.
  order.forEach((name, idx) => {
    const spec = layerSpec(cuts, costume, name);
    if (!spec.ink) return;
    const over = new Set(spec.ink.over.map((n) => order.indexOf(n)));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!over.has(owner[i]) || data[i * 4 + 3] < 160 || luma(data, i) >= 50) continue;
        if (!pointInPolygon([x, y], spec.polygon) && distanceToPolygon([x, y], spec.polygon) <= spec.ink.px) owner[i] = idx;
      }
  });
  const layers = {};
  order.forEach((name, idx) => {
    const spec = layerSpec(cuts, costume, name);
    const above = new Set(zs.slice(zs.indexOf(name) + 1).map((n) => order.indexOf(n)));
    const visible = new Uint8Array(W * H),
      known = new Uint8Array(W * H),
      fill = new Uint8Array(W * H);
    const rgba = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      if (owner[i] !== idx) continue;
      visible[i] = 1;
      data.copy(rgba, i * 4, i * 4, i * 4 + 4);
      if (data[i * 4 + 3] < 160) continue;
      const tone = isSkin(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (spec.source === "skin" ? tone : spec.source === "cloth" ? !tone : luma(data, i) >= 36) known[i] = 1;
    }
    // A fill is a polygon, or { polygon, from } to paint it only from the layer's pixels inside
    // `from` (the shirt from the shirt, the shorts from the shorts, so the hem stays a hem), or
    // { polygon, carry } to paint it from another limb's painting along matching bones.
    const chain = spec.extrude ? cuts.rig.skin[name].chain.map((j) => cuts.rig.joints[j]) : null;
    const carried = new Uint8Array(W * H);
    for (const entry of spec.fill ?? []) {
      const { polygon, from, dark, carry } = Array.isArray(entry) ? { polygon: entry } : entry;
      const m = polygonMask(polygon, W, H, origin);
      const part = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (m[i] && !visible[i] && !carried[i] && above.has(owner[i])) part[i] = 1;
      if (!part.some(Boolean)) continue;
      if (carry) {
        const source = new Uint8Array(W * H);
        for (const region of carry.over) {
          const poly = region === "sleeve" ? cuts.rig.skin.torso.sleeve.polygon : layerSpec(cuts, costume, region).polygon;
          const sm = polygonMask(poly, W, H, origin);
          for (let i = 0; i < W * H; i++) if (sm[i]) source[i] = 1;
        }
        const bone = (pair) => pair.map((jn) => cuts.rig.joints[jn]);
        const got = carryOver(rgba, data, W, H, part, source, bone(carry.from), bone(carry.to), carry);
        for (let i = 0; i < W * H; i++)
          if (got[i]) {
            carried[i] = fill[i] = known[i] = 1;
          }
        continue;
      }
      for (let i = 0; i < W * H; i++) if (part[i]) fill[i] = 1;
      let sources = known;
      if (from || dark) {
        const f = from ? polygonMask(from, W, H, origin) : null;
        // `dark` keeps only the garment's own dark cloth, not a bright shirt showing through it.
        sources = known.map((k, i) => (k && (!f || f[i]) && (!dark || luma(data, i) < 70) ? 1 : 0));
      }
      const rest = chain ? extrudeFill(rgba, W, H, sources, part, chain) : part;
      pushPullFill(rgba, W, H, sources, rest);
    }
    if (fill.some(Boolean) && !chain) outlineFill(rgba, W, H, visible, fill, OUTLINE_PX);
    // A carried stretch takes the ink where it meets the outside, like any rebuilt edge.
    if (carried.some(Boolean)) outlineFill(rgba, W, H, visible, fill, OUTLINE_PX, carried);
    const variants = {};
    for (const [vname, v] of Object.entries(spec.variants ?? {}))
      variants[vname] = v.reverse ? reverseLettering(rgba, W, H, v.reverse) : curlVariant(rgba, W, H, v);
    layers[name] = { rgba, visible, fill, variants };
  });
  return { W, H, layers, owner, order };
}

/**
 * A grid mesh over a layer's painted pixels, in the crop's pixels: every
 * `cell`-square that holds paint, grown by one cell, as two triangles.
 */
export function buildMesh(alpha, W, H, cell) {
  let minX = W,
    minY = H,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (alpha[y * W + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) throw new Error("buildMesh: empty layer");
  const x0 = Math.floor(minX / cell) * cell - cell,
    y0 = Math.floor(minY / cell) * cell - cell;
  const cols = Math.ceil((maxX + 1 - x0) / cell) + 1,
    rows = Math.ceil((maxY + 1 - y0) / cell) + 1;
  const paint = new Uint8Array(cols * rows);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++)
      if (alpha[y * W + x]) paint[Math.floor((y - y0) / cell) * cols + Math.floor((x - x0) / cell)] = 1;
  const keep = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!paint[r * cols + c]) continue;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr,
            cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) keep[rr * cols + cc] = 1;
        }
    }
  const vid = new Int32Array((cols + 1) * (rows + 1)).fill(-1);
  const positions = [],
    indices = [];
  const vertex = (c, r) => {
    const k = r * (cols + 1) + c;
    if (vid[k] < 0) {
      vid[k] = positions.length / 2;
      positions.push(x0 + c * cell, y0 + r * cell);
    }
    return vid[k];
  };
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!keep[r * cols + c]) continue;
      const a = vertex(c, r),
        b = vertex(c + 1, r),
        d = vertex(c, r + 1),
        e = vertex(c + 1, r + 1);
      indices.push(a, b, e, a, e, d);
    }
  return { x0, y0, cell, width: cols * cell, height: rows * cell, positions, indices };
}

/** Mesh cells in crop pixels, and the size layer textures are stored at (the game draws a body at about a quarter of its crop, twice that on a high-density screen). */
export const MESH_CELL = 14;
export const TEXTURE_SCALE = 0.5;
/** The rim light's silhouettes are only an edge: half the textures' size. */
const SIL_SCALE = TEXTURE_SCALE / 2;

/** A layer's pixels over its mesh's cells exactly, padded with clear pixels past the crop, at full size. */
export async function paddedLayer(rgba, W, H, mesh) {
  const left = Math.max(0, mesh.x0),
    top = Math.max(0, mesh.y0);
  const right = Math.min(W, mesh.x0 + mesh.width),
    bottom = Math.min(H, mesh.y0 + mesh.height);
  return sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
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
}

/** A PNG `width` wide stored at `scale`. */
export const scaled = (png, width, scale) => sharp(png).resize({ width: Math.round(width * scale), kernel: "lanczos3" }).png().toBuffer();

/** White wherever the layer is painted, with its alpha: tinted, it is the rim light's edge. */
function whiteOf(rgba) {
  const out = Buffer.from(rgba);
  for (let i = 0; i < out.length; i += 4) out[i] = out[i + 1] = out[i + 2] = 255;
  return out;
}

/**
 * A cast body's head layer as a plate like Hammer's heads: its paint cropped to its bounds with a
 * margin (or to `crop`, for a face edit or a silhouette that must frame exactly like it), stored at
 * `scale`, its neck anchor on the painted neck joint, its crown, nose and face box registered as a
 * profile's.
 */
export async function castHeadPlate(rgba, W, H, neck, scale, crop = null) {
  let box = crop;
  if (!box) {
    let x0 = W,
      y0 = H,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (rgba[(y * W + x) * 4 + 3] > 0) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) throw new Error("castHeadPlate: the head layer is empty");
    const left = Math.max(0, x0 - MARGIN),
      top = Math.max(0, y0 - MARGIN);
    box = { x: left, y: top, w: Math.min(W, x1 + 1 + MARGIN) - left, h: Math.min(H, y1 + 1 + MARGIN) - top };
  }
  const full = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .png()
    .toBuffer();
  const png = await scaled(full, box.w, scale);
  const reg = await registerHead(png, "profile");
  return { png, box, ...reg, neck: { x: Math.round((neck[0] - box.x) * scale), y: Math.round((neck[1] - box.y) * scale) } };
}

/**
 * A cast body as the game loads it, from its keyed painting and its cut: the five skinned layers
 * (meshes and weights in the crop's pixels, textures at TEXTURE_SCALE), the head as a plate turning
 * on the painted neck joint, a white silhouette of each for the rim light, and `share`, the painted
 * head's height (crown to neck joint) over the whole figure's. Returns the rig and the images to
 * write, by their names under public/art.
 */
export async function castRig(person, keyed, cuts) {
  const { W, H, layers } = await separateLayers(keyed, cuts);
  const { rig } = cuts;
  const images = new Map();
  const out = {
    version: 2,
    span: rig.sole - rig.joints.neck[1],
    root: [rig.rootX, rig.sole],
    joints: rig.joints,
    bones: rig.bones,
    ...(rig.match ? { match: rig.match } : {}),
    layers: {},
  };
  for (const name of LAYER_Z) {
    const { rgba } = layers[name];
    const alpha = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = rgba[i * 4 + 3] > 0 ? 1 : 0;
    const mesh = buildMesh(alpha, W, H, MESH_CELL);
    const { bones, weights } = skinWeights(mesh.positions, rig, name);
    const file = `cast/${person}-${name}.png`;
    const sil = `cast/${person}-${name}-sil.png`;
    images.set(file, await scaled(await paddedLayer(rgba, W, H, mesh), mesh.width, TEXTURE_SCALE));
    images.set(sil, await scaled(await paddedLayer(whiteOf(rgba), W, H, mesh), mesh.width, SIL_SCALE));
    out.layers[name] = {
      file,
      sil,
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
  const head = await castHeadPlate(layers.head.rgba, W, H, rig.joints.neck, TEXTURE_SCALE);
  const headSil = await castHeadPlate(whiteOf(layers.head.rgba), W, H, rig.joints.neck, TEXTURE_SCALE, head.box);
  let crownRow = 0;
  while (crownRow < H && !layers.head.rgba.subarray(crownRow * W * 4, (crownRow + 1) * W * 4).some((v, i) => i % 4 === 3 && v > 0)) crownRow++;
  const file = `cast/${person}-head.png`;
  const sil = `cast/${person}-head-sil.png`;
  images.set(file, head.png);
  images.set(sil, headSil.png);
  const share = (rig.joints.neck[1] - crownRow) / (rig.sole - crownRow);
  out.head = {
    file,
    sil,
    width: head.width,
    height: head.height,
    neck: head.neck,
    crown: head.crown,
    face: head.face,
    nose: head.nose,
    share: Math.round(share * 1000) / 1000,
    scale: TEXTURE_SCALE,
    ...(cuts.jaw ? { jaw: cuts.jaw.map(([x, y]) => [Math.round((x - head.box.x) * TEXTURE_SCALE), Math.round((y - head.box.y) * TEXTURE_SCALE)]) } : {}),
  };
  return { rig: out, images, layers, W, H, head };
}

const smoothstep = (t) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

/** Where along a chain of joints a point lies, as arc length; the ends run on past the first and last joints. */
function chainPosition(p, pts) {
  let s0 = 0,
    best = { d: Infinity, s: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i],
      [bx, by] = pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    let t = ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / (L * L);
    t = Math.max(i === 0 ? -Infinity : 0, Math.min(i === pts.length - 2 ? Infinity : 1, t));
    const d = Math.hypot(p[0] - (ax + t * (bx - ax)), p[1] - (ay + t * (by - ay)));
    if (d < best.d) best = { d, s: s0 + t * L };
    s0 += L;
  }
  return best.s;
}

function pointInPolygon([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToPolygon([x, y], poly) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j],
      [bx, by] = poly[i];
    const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2));
    d = Math.min(d, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
  }
  return d;
}

/**
 * Up to four bone influences per vertex (`bones[v*4+k]` indexes rig.bones,
 * `weights[v*4+k]` sums to 1). A layer follows its chain of joints by arc
 * length: one bone along each segment, smoothstep blends `blend[k]` wide on
 * either side of each inner joint, and a hand-over from the parent bone over
 * `start` (offsets from the first joint). A torso's sleeve hands its weight to
 * the upper arm down the sleeve, feathered at the sleeve's edge.
 */
export function skinWeights(positions, rig, layer) {
  const spec = rig.skin[layer];
  const boneId = (p, c) => {
    const id = rig.bones.findIndex(([a, b]) => a === p && b === c);
    if (id < 0) throw new Error(`skinWeights: no bone ${p}->${c}`);
    return id;
  };
  const pts = spec.chain.map((j) => rig.joints[j]);
  const chainBones = spec.chain.slice(1).map((c, i) => boneId(spec.chain[i], c));
  const S = [0];
  for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const parent = spec.parent ? boneId(...spec.parent) : null;
  const sleeve = spec.sleeve
    ? { ...spec.sleeve, id: boneId(...spec.sleeve.bone), a: rig.joints[spec.sleeve.bone[0]], b: rig.joints[spec.sleeve.bone[1]] }
    : null;
  const n = positions.length / 2;
  const bones = new Uint8Array(n * 4),
    weights = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    const p = [positions[v * 2], positions[v * 2 + 1]];
    const s = chainPosition(p, pts);
    const w = new Map();
    const add = (id, x) => x > 1e-6 && w.set(id, (w.get(id) ?? 0) + x);
    let rest = 1;
    if (parent !== null) {
      const [from, to] = spec.start;
      const t = smoothstep((s - from) / (to - from));
      add(parent, rest * (1 - t));
      rest *= t;
    }
    for (let i = 0; i < chainBones.length; i++) {
      const rise = i === 0 ? 1 : smoothstep((s - (S[i] - spec.blend[i - 1])) / (2 * spec.blend[i - 1]));
      const fall = i === chainBones.length - 1 ? 1 : 1 - smoothstep((s - (S[i + 1] - spec.blend[i])) / (2 * spec.blend[i]));
      add(chainBones[i], rest * rise * fall);
    }
    if (sleeve) {
      const inside = pointInPolygon(p, sleeve.polygon);
      const edge = distanceToPolygon(p, sleeve.polygon);
      const mask = inside ? smoothstep(edge / sleeve.feather) : 0;
      const [ax, ay] = sleeve.a,
        [bx, by] = sleeve.b;
      const L = Math.hypot(bx - ax, by - ay);
      const along = ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / L;
      const k = mask * smoothstep((along - sleeve.ramp[0]) / (sleeve.ramp[1] - sleeve.ramp[0]));
      for (const [id, x] of w) w.set(id, x * (1 - k));
      add(sleeve.id, k);
    }
    const top = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4);
    const total = top.reduce((sum, [, x]) => sum + x, 0);
    top.forEach(([id, x], k) => {
      bones[v * 4 + k] = id;
      weights[v * 4 + k] = x / total;
    });
  }
  return { bones, weights };
}
