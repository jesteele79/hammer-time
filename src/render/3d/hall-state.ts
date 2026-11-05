/**
 * What the 3D hall shows on a frame, in meters, built by the look from the world: `lx` across the hall (+ the walker's
 * right), `z` down it (0 at the stairwell door), `y` up. Pure, with no three.js in it, so the node checks can read it.
 */
export type HallState = {
  hero: { lx: number; z: number; y: number; facing: 1 | -1; clip: string; u: number; hurt: boolean };
  cast: { id: string; person: string; lx: number; z: number; y: number; clip: string; u: number; recolor: string | null }[];
  missiles: { kind: string; lx: number; z: number; y: number }[];
  pickups: { id: number; kind: string; lx: number; z: number; y: number; taken: boolean }[];
  carts: { lx: number; z: number; dir: 1 | -1 }[];
  doors: { z: number; side: 1 | -1; open: number }[];
  puddle: { z0: number; z1: number } | null;
};

/** The sim's world is in px, 100 to the meter. */
export const PX_PER_METER = 100;
export const toMeters = (px: number) => px / PX_PER_METER;

export const EMPTY_HALL: HallState = { hero: { lx: 0, z: 0, y: 0, facing: 1, clip: "idle", u: 0, hurt: false }, cast: [], missiles: [], pickups: [], carts: [], doors: [], puddle: null };
