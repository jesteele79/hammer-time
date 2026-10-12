import type { Solved } from "../sim/rig/fk";
import { NECK_REST_Y, type JointName } from "../sim/rig/skeleton";

/** The body's layers, drawn back to front. */
export const LAYER_Z = ["armFar", "legFar", "legNear", "torso", "armNear"] as const;
export type LayerName = (typeof LAYER_Z)[number];

/** A layer's mesh in the body crop's pixels, with up to four bone influences per vertex. */
export type RigLayer = {
  file?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  positions: ArrayLike<number>;
  indices?: ArrayLike<number>;
  bones: ArrayLike<number>;
  weights: ArrayLike<number>;
  /** Other textures over the same mesh, such as the near hand closed into a fist. */
  variants?: Record<string, string>;
};

/** One body's rig as written by art-sync: the painted joints and bones, and its layers. */
export type RigFile = {
  version: number;
  /** Sole to neck, crop pixels: the skeleton's 296 rest units. */
  span: number;
  /** The feet point in the crop. */
  root: [number, number];
  joints: Record<string, [number, number]>;
  bones: [JointName, JointName][];
  layers?: Partial<Record<LayerName, RigLayer>>;
};

/**
 * The texture a layer draws with: the near hand always as the fist that holds the mallet,
 * and a lettered shirt's mirror when the body is drawn facing right, against the painting,
 * so the word still reads the right way round.
 */
export function layerFile(name: LayerName, layer: RigLayer, facing: 1 | -1): string | undefined {
  if (name === "armNear" && layer.variants?.fist) return layer.variants.fist;
  if (facing === 1 && layer.variants?.mirror) return layer.variants.mirror;
  return layer.file;
}

/**
 * Turns part of a skinned layer about a line, the way a wrist turns a hand over: each listed
 * vertex keeps how far along the line from `a` toward `b` it is and has how far across it is
 * scaled by `k` (1 as painted, 0 edge-on, -1 turned over). Every vertex is copied from `src`
 * to `out` first.
 */
export function turnAbout(
  out: Float32Array,
  src: ArrayLike<number>,
  verts: ArrayLike<number>,
  a: { x: number; y: number },
  b: { x: number; y: number },
  k: number,
): void {
  for (let i = 0; i < src.length; i++) out[i] = src[i];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len,
    uy = (b.y - a.y) / len;
  for (let n = 0; n < verts.length; n++) {
    const v = verts[n];
    const dx = src[v * 2] - a.x,
      dy = src[v * 2 + 1] - a.y;
    const along = dx * ux + dy * uy;
    out[v * 2] = a.x + along * ux + k * (dx - along * ux);
    out[v * 2 + 1] = a.y + along * uy + k * (dy - along * uy);
  }
}

/** World px per crop pixel for this solve. */
export const bodyScale = (solved: Solved, rig: RigFile) => solved.scale * (NECK_REST_Y / rig.span);

/**
 * Writes every vertex of a layer to `out` (x, y pairs, world px, the feet
 * point at the origin). A bone from joint P to joint C carries its vertices
 * the way the solver carried C: about P, by the turn C's link took, so a
 * vertex painted on a joint lands on that joint. The painted crop faces left;
 * facing right mirrors it. Squash applies last, about the feet.
 */
export function skinLayer(out: Float32Array, layer: RigLayer, rig: RigFile, solved: Solved): void {
  const K = bodyScale(solved, rig);
  const f = solved.facing;
  const { x: sx, y: sy } = solved.squash;
  const nb = rig.bones.length;
  const m = new Float64Array(nb * 6);
  for (let b = 0; b < nb; b++) {
    const [p, c] = rig.bones[b];
    // A bone a painted body's skeleton turned to Hammer's stance turns its paint by as much first.
    const a = -f * (solved.links[c] + (solved.turns[c] ?? 0));
    const cos = Math.cos(a),
      sin = Math.sin(a);
    const [bx, by] = rig.joints[p];
    const j = solved.joints[p];
    // The torso's bones carry the breath and the belly: their pixels scale front to back about the spine.
    const t = c === "chest" || c === "neck" ? solved.torso : 1;
    // world = origin + R(a) · K · (−f·t·(x − bx), y − by)
    m[b * 6] = j.x / sx;
    m[b * 6 + 1] = j.y / sy;
    m[b * 6 + 2] = -f * K * cos * t;
    m[b * 6 + 3] = -K * sin;
    m[b * 6 + 4] = -f * K * sin * t;
    m[b * 6 + 5] = K * cos;
    m[b * 6] -= m[b * 6 + 2] * bx + m[b * 6 + 3] * by;
    m[b * 6 + 1] -= m[b * 6 + 4] * bx + m[b * 6 + 5] * by;
  }
  const n = layer.positions.length / 2;
  for (let v = 0; v < n; v++) {
    const x = layer.positions[v * 2],
      y = layer.positions[v * 2 + 1];
    let ox = 0,
      oy = 0;
    for (let k = 0; k < 4; k++) {
      const w = layer.weights[v * 4 + k];
      if (!w) continue;
      const b = layer.bones[v * 4 + k] * 6;
      ox += w * (m[b] + m[b + 2] * x + m[b + 3] * y);
      oy += w * (m[b + 1] + m[b + 4] * x + m[b + 5] * y);
    }
    out[v * 2] = ox * sx;
    out[v * 2 + 1] = oy * sy;
  }
}
