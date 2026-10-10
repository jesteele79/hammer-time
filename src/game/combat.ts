export type Point = { x: number; y: number };

export const SWING_SECONDS = 0.42;
export const SUPER_SECONDS = 0.66;
export const SNOT_SECONDS = 0.45;
export const WIPE_SECONDS = 0.95;
export const LECTURE_SECONDS = 0.8;
/** Idle beats: watch check, then a foot tap, then a harrumph; the cycle repeats. */
export const IDLE_WATCH_AT = 2.5;
export const WATCH_SECONDS = 2.1;
export const IDLE_TAP_AT = 5;
export const IDLE_HARRUMPH_AT = 8;
export const HERO_HEIGHT = 50;
export const HERO_BODY_HEIGHT = 46;
export const HERO_BODY_WIDTH = 14;
export const HERO_CROUCH_HEIGHT = 30;
export const HERO_CROUCH_VISUAL_HEIGHT = 32;
export const ENEMY_HEIGHT = 46;
export const ENEMY_BODY_HEIGHT = 42;

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

/** True when a swept head touches the rect anywhere along a sampled arc. */
export function pathHits(
  path: Point[],
  radius: number,
  rect: { x: number; y: number; w: number; h: number },
) {
  for (let i = 1; i < path.length; i++) if (sweptHeadHits(path[i - 1], path[i], radius, rect)) return true;
  return path.length === 1 && sweptHeadHits(path[0], path[0], radius, rect);
}
