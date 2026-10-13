import type { HeadPlate } from "../art/registry";
import { skeletonFrom, type Skeleton } from "../sim/rig/skeleton";
import type { CastHead, RigFile } from "./skin";

/** A cast member's skeleton from their painting: its joints and bone lengths, the arms turned to Hammer's stance. */
export const castSkeleton = (rig: RigFile): Skeleton => skeletonFrom({ joints: rig.joints, sole: rig.root[1], rootX: rig.root[0] }, rig.match);

/** solve's head scale (the plate's height over HERO_HEIGHT) for a head `share` of the figure's height, crown to neck joint. */
export const castHeadScale = (share: number, plate: HeadPlate): number => (share * plate.height) / (plate.neck.y - plate.crown.y);

/**
 * A painted head grown by `g` (how much bigger than the body's own scale the solve draws it) the way a caricature
 * grows: above the jaw-to-nape line it scales about the line's middle, below it the painted neck stays as it is,
 * blended over `band` plate px, so the neck still fits its collar. The head part's scale lands the crown where a
 * head scaled whole by `g` would put it. Takes vertices in plate px; returns them relative to the neck anchor.
 */
export function taperHead(verts: ArrayLike<number>, head: CastHead, g: number, band = 20): Float32Array {
  const out = new Float32Array(verts.length);
  const [[ax, ay], [bx, by]] = head.jaw ?? [
    [0, head.neck.y],
    [head.width, head.neck.y],
  ];
  const jx = (ax + bx) / 2;
  const jy = (ay + by) / 2;
  // The line's normal, toward the crown.
  let nx = -(by - ay);
  let ny = bx - ax;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  if ((head.crown.x - jx) * nx + (head.crown.y - jy) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = (g * (head.crown.y - head.neck.y) - (jy - head.neck.y)) / (head.crown.y - jy);
  for (let i = 0; i < verts.length; i += 2) {
    const x = verts[i];
    const y = verts[i + 1];
    const t = Math.min(1, Math.max(0, ((x - jx) * nx + (y - jy) * ny) / band));
    const f = 1 + (k - 1) * t * t * (3 - 2 * t);
    out[i] = jx + f * (x - jx) - head.neck.x;
    out[i + 1] = jy + f * (y - jy) - head.neck.y;
  }
  return out;
}

/** The rim light (R2b §6.2): how far a lamp reaches, the edge's strength at the lamp, how far the edge peeks out (world px), its color. */
export const RIM = { reach: 1300, max: 0.85, offset: 3, color: 0xffd38a } as const;

/** Which side of a cast member the nearest lamp lights, and how strongly; null with no lamp in reach. */
export function rimFor(x: number, y: number, lights: readonly { x: number; y: number }[]): { side: 1 | -1; k: number } | null {
  let best: { x: number; y: number } | null = null;
  let d = Infinity;
  for (const l of lights) {
    const dd = Math.hypot(l.x - x, l.y - y);
    if (dd < d) {
      d = dd;
      best = l;
    }
  }
  if (!best || d >= RIM.reach) return null;
  return { side: best.x >= x ? 1 : -1, k: RIM.max * (1 - d / RIM.reach) };
}
