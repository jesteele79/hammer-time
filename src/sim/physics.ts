import { LEDGE, SNAP } from "./constants";
import type { Rect, Stage } from "./types";

/** Anything with a feet point, a collider and a velocity. */
export type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean };

const collider = (b: { x: number; y: number; w: number; h: number }): Rect => ({
  x: b.x - b.w / 2,
  y: b.y - b.h,
  w: b.w,
  h: b.h,
});
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const blockers = (stage: Stage) => [...stage.solids, ...stage.passes];

/** The floor's height under `x`, or null where there is none; the highest floor wins. */
export function floorAt(stage: Stage, x: number): number | null {
  let best: number | null = null;
  for (const f of stage.floor) {
    if (x < f.x0 - LEDGE || x > f.x1 + LEDGE) continue;
    const k = f.x1 > f.x0 ? Math.min(1, Math.max(0, (x - f.x0) / (f.x1 - f.x0))) : 0;
    const y = f.y0 + (f.y1 - f.y0) * k;
    if (best === null || y < best) best = y;
  }
  return best;
}

/** True when a body `h` tall could stand here without a solid or a pass through it. */
export function canStand(body: { x: number; y: number; w: number }, stage: Stage, h: number): boolean {
  const c = collider({ ...body, h });
  return !blockers(stage).some((s) => overlaps(c, s));
}

/** Integrates x then y, pushing out of solids and passes, landing on floors and platforms. */
export function moveBody(body: Body, stage: Stage, dt: number): void {
  const wasOnGround = body.onGround;
  const prevY = body.y;
  const walls = blockers(stage);

  body.x += body.vx * dt;
  for (const s of walls) {
    if (!overlaps(collider(body), s)) continue;
    body.x = body.vx > 0 ? s.x - body.w / 2 : s.x + s.w + body.w / 2;
    body.vx = 0;
  }
  const { bounds } = stage;
  body.x = Math.min(bounds.x + bounds.w - body.w / 2, Math.max(bounds.x + body.w / 2, body.x));

  body.y += body.vy * dt;
  body.onGround = false;
  for (const s of walls) {
    if (!overlaps(collider(body), s)) continue;
    if (body.vy > 0) {
      body.y = s.y;
      body.onGround = true;
    } else body.y = s.y + s.h + body.h;
    body.vy = 0;
  }

  if (body.vy >= 0) {
    const fy = floorAt(stage, body.x);
    // Land when the feet cross the floor this step, or stick to it while walking it.
    if (fy !== null && body.y >= fy - (wasOnGround ? SNAP : 0) && prevY <= fy + (wasOnGround ? SNAP : 0)) {
      body.y = fy;
      body.vy = 0;
      body.onGround = true;
    }
    for (const p of stage.platforms) {
      if (body.x < p.x0 - LEDGE || body.x > p.x1 + LEDGE) continue;
      if (prevY <= p.y && body.y >= p.y) {
        body.y = p.y;
        body.vy = 0;
        body.onGround = true;
      }
    }
  }
}
