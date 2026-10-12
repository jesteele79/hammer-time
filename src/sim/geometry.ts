import type { Point, Rect } from "./types";

export const overlapsRect = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** A body's collider: `x, y` is the feet point, `w` wide and `h` tall above it. */
export const bodyRect = (b: { x: number; y: number; w: number; h: number }): Rect => ({ x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h });

/** A head of radius r moving from a to b touches the rect anywhere along the way (slab test on the grown rect). */
export function sweptHeadHits(a: Point, b: Point, r: number, rect: Rect): boolean {
  let lo = 0;
  let hi = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - rect.x + r],
    [dx, rect.x + rect.w + r - a.x],
    [-dy, a.y - rect.y + r],
    [dy, rect.y + rect.h + r - a.y],
  ]) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return false;
  }
  return true;
}
