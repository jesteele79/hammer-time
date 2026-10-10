import type { Point } from "./combat";

export type Rect = { x: number; y: number; w: number; h: number };
type View = { w: number; h: number };

export const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/** The least slide, along one axis and kept in view, that clears the face. */
export function clearOfFace(box: Rect, face: Rect, view: View, pad = 2): Rect {
  if (!overlaps(box, face, pad)) return box;
  const fit = (r: Rect) => ({
    ...r,
    x: Math.min(Math.max(r.x, 0), view.w - r.w),
    y: Math.min(Math.max(r.y, 0), view.h - r.h),
  });
  const moves = [
    { ...box, x: face.x - pad - box.w },
    { ...box, x: face.x + face.w + pad },
    { ...box, y: face.y - pad - box.h },
    { ...box, y: face.y + face.h + pad },
  ]
    .map(fit)
    .filter((r) => !overlaps(r, face, pad));
  const cost = (r: Rect) => Math.hypot(r.x - box.x, r.y - box.y);
  return moves.sort((a, b) => cost(a) - cost(b))[0] ?? box;
}

const COMIC_POP = 1.125;
const COMIC_TILT = 0.15;

/** Outline of a comic burst around its text, before pop and tilt. */
export function comicStar(textWidth: number, big: boolean): Point[] {
  const size = big ? 9 : 5.2;
  const rx = textWidth / 2 + size * 0.9,
    ry = size * 1.15;
  return Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2,
      k = i % 2 ? 0.78 : 1.08;
    return { x: Math.cos(a) * rx * k, y: Math.sin(a) * ry * k };
  });
}

/** Bounds of a comic burst centred at (x, y) at its biggest pop and either tilt, stroke included. */
export function comicBox(x: number, y: number, textWidth: number, big: boolean): Rect {
  let x0 = 0,
    x1 = 0,
    y0 = 0,
    y1 = 0;
  for (const rot of [-COMIC_TILT, 0, COMIC_TILT])
    for (const p of comicStar(textWidth, big)) {
      const px = (p.x * Math.cos(rot) - p.y * Math.sin(rot)) * COMIC_POP,
        py = (p.x * Math.sin(rot) + p.y * Math.cos(rot)) * COMIC_POP;
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      y0 = Math.min(y0, py);
      y1 = Math.max(y1, py);
    }
  const pad = 1;
  return { x: x + x0 - pad, y: y + y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
}
