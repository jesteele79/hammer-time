import type { Feel } from "./feel";

/** Hit-stop and slow motion, both counted in wall seconds. */
export type Clock = { hitstop: number; slowmo: number; scale: number };

export const createClock = (): Clock => ({ hitstop: 0, slowmo: 0, scale: 1 });

/** The longer hit-stop wins, never the sum; slow motion keeps the deeper scale and the longer time. */
export function applyFeel(c: Clock, f: Feel): void {
  c.hitstop = Math.max(c.hitstop, f.hitstop);
  if (f.slowmo) {
    c.scale = c.slowmo > 0 ? Math.min(c.scale, f.slowmo.scale) : f.slowmo.scale;
    c.slowmo = Math.max(c.slowmo, f.slowmo.seconds);
  }
}

/** The sim seconds `dt` wall seconds are worth. Slow motion keeps counting through a hit-stop. */
export function tickClock(c: Clock, dt: number): number {
  let left = dt;
  let sim = 0;
  if (c.hitstop > 0) {
    const used = Math.min(left, c.hitstop);
    c.hitstop -= used;
    c.slowmo = Math.max(0, c.slowmo - used);
    left -= used;
  }
  if (left > 0 && c.slowmo > 0) {
    const used = Math.min(left, c.slowmo);
    sim += used * c.scale;
    c.slowmo -= used;
    left -= used;
  }
  sim += left;
  if (c.slowmo <= 0) c.scale = 1;
  return sim;
}
