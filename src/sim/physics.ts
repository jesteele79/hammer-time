import { LEDGE, SNAP } from "./constants";
import type { FloorSegment, Rect, Stage } from "./types";

/** Anything with a feet point, a collider and a velocity. */
export type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean; dropT?: number };

const collider = (b: { x: number; y: number; w: number; h: number }): Rect => ({
  x: b.x - b.w / 2,
  y: b.y - b.h,
  w: b.w,
  h: b.h,
});
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const blockers = (stage: Stage) => [...stage.solids, ...stage.passes];

const heightOn = (f: FloorSegment, x: number) => {
  const k = f.x1 > f.x0 ? Math.min(1, Math.max(0, (x - f.x0) / (f.x1 - f.x0))) : 0;
  return f.y0 + (f.y1 - f.y0) * k;
};

/** The floor segment `floorAt` stands him on: the highest under `x` no higher than `reach`. */
export function floorUnder(stage: Stage, x: number, reach = -Infinity): FloorSegment | null {
  let best: FloorSegment | null = null;
  let bestY = Infinity;
  for (const f of stage.floor) {
    if (x < f.x0 - LEDGE || x > f.x1 + LEDGE) continue;
    const y = heightOn(f, x);
    if (y < reach || y >= bestY) continue;
    best = f;
    bestY = y;
  }
  return best;
}

/**
 * The highest floor under `x` that is no higher than `reach`, or null where
 * there is none. A mezzanine overhead is not the floor under his feet.
 */
export function floorAt(stage: Stage, x: number, reach = -Infinity): number | null {
  const f = floorUnder(stage, x, reach);
  return f ? heightOn(f, x) : null;
}

/** True when a body `h` tall could stand here without a solid or a pass through it. */
export function canStand(body: { x: number; y: number; w: number }, stage: Stage, h: number): boolean {
  const c = collider({ ...body, h });
  return !blockers(stage).some((s) => overlaps(c, s));
}

/**
 * Integrates x then y, pushing out of solids and passes, landing on floors and platforms.
 * `onBump` hears each solid or pass his head meets from below; platforms are ignored while `dropT` runs.
 */
export function moveBody(body: Body, stage: Stage, dt: number, onBump?: (s: Rect) => void): void {
  const wasOnGround = body.onGround;
  const prevX = body.x;
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
    } else {
      body.y = s.y + s.h + body.h;
      onBump?.(s);
    }
    body.vy = 0;
  }

  if (body.vy >= 0) {
    // Grounded, the floor may sit a step above or below the feet; airborne, only one the feet crossed counts. A flight
    // rising ahead of him climbs up to the step's run toward his feet (none is steeper than 45 degrees): crossed too, or
    // he would drop through the steps he lands on.
    const rise = wasOnGround ? SNAP : Math.abs(body.x - prevX);
    const fy = floorAt(stage, body.x, wasOnGround ? body.y - SNAP : prevY - rise);
    if (fy !== null && body.y >= fy - (wasOnGround ? SNAP : 0) && prevY <= fy + rise) {
      body.y = fy;
      body.vy = 0;
      body.onGround = true;
    }
    for (const p of (body.dropT ?? 0) > 0 ? [] : stage.platforms) {
      if (body.x < p.x0 - LEDGE || body.x > p.x1 + LEDGE) continue;
      if (prevY <= p.y && body.y >= p.y) {
        body.y = p.y;
        body.vy = 0;
        body.onGround = true;
      }
    }
  }
}
