export type Point = { x: number; y: number };

export const SWING_SECONDS = 0.42;
export const HERO_HEIGHT = 44;
export const HERO_BODY_HEIGHT = 38;
export const HERO_BODY_WIDTH = 12;

/** The same joint angles drive drawing and contact. No independent attack box. */
export function hammerPose(progress: number) {
  const u = Math.max(0, Math.min(1, progress));
  if (u < 0.28) {
    const t = 1 - (1 - u / 0.28) ** 3;
    return { s: -2.3 * t, e: 0.3 * t };
  }
  if (u < 0.62) {
    const t = ((u - 0.28) / 0.34) ** 1.35;
    return { s: -2.3 + 2.52 * t, e: 0.3 - 0.5 * t };
  }
  const t = 1 - (1 - (u - 0.62) / 0.38) ** 3;
  return { s: 0.22 * (1 - t), e: -0.2 * (1 - t) };
}

export function rotateAround(p: Point, joint: Point, angle: number): Point {
  const x = p.x - joint.x;
  const y = p.y - joint.y;
  return {
    x: joint.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: joint.y + x * Math.sin(angle) + y * Math.cos(angle),
  };
}

export function malletInArtwork(shoulder: number, elbow: number): Point {
  return rotateAround(
    rotateAround({ x: 357, y: 934 }, { x: 113.4, y: 642.1 }, elbow),
    { x: 102.9, y: 468.4 },
    shoulder,
  );
}

/** Segment against an expanded rectangle: a moving rounded head cannot tunnel. */
export function sweptHeadHits(
  a: Point,
  b: Point,
  radius: number,
  rect: { x: number; y: number; w: number; h: number },
) {
  let lo = 0;
  let hi = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - rect.x + radius],
    [dx, rect.x + rect.w + radius - a.x],
    [-dy, a.y - rect.y + radius],
    [dy, rect.y + rect.h + radius - a.y],
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
