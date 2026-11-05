import type { SetName } from "../../sim/types";

export type { SetName };
/**
 * A level's 3D set: its glb, its length and how far it runs on behind his start, its lamps (where the nearest pools hang
 * and how bright a lamp may glow), the names the view looks its nodes up by, and how much of a jump's height it shows: a
 * low cabin's ceiling is under the 2D level's leap.
 */
export type SetSpec = {
  file: string;
  length: number;
  behind: number;
  lamps: { first: number; every: number; height: number; strength: number };
  names: { ceiling: string; floor: string; curtain?: string; sign?: string };
  lift: number;
  /** The pools' brightness under the lamps, and how much of the key and the fill: a low cabin's ceiling is right by its lamps. */
  pool: number;
  ambient: number;
};

export const SETS: Record<SetName, SetSpec> = {
  hallway: { file: "/sets/hallway.glb", length: 80, behind: 4, lamps: { first: 3, every: 6, height: 2.6, strength: 1.6 }, names: { ceiling: "ceiling", floor: "carpet" }, lift: 1, pool: 3.2, ambient: 1 },
  cabin: { file: "/sets/cabin.glb", length: 40, behind: 3, lamps: { first: 1.5, every: 3, height: 2.0, strength: 1.2 }, names: { ceiling: "ceiling", floor: "aisle", curtain: "curtain", sign: "sign" }, lift: 0.35, pool: 0.9, ambient: 0.72 },
};
