import type { SetName } from "../../sim/types";

export type { SetName };
/**
 * A level's 3D set: its glb, its length and how far it runs on behind his start, its lamps (where the nearest pools hang
 * and how bright a lamp may glow), and the names the view looks its nodes up by.
 */
export type SetSpec = {
  file: string;
  length: number;
  behind: number;
  lamps: { first: number; every: number; height: number; strength: number };
  names: { ceiling: string; floor: string; curtain?: string; sign?: string };
};

export const SETS: Record<SetName, SetSpec> = {
  hallway: { file: "/sets/hallway.glb", length: 80, behind: 4, lamps: { first: 3, every: 6, height: 2.6, strength: 1.6 }, names: { ceiling: "ceiling", floor: "carpet" } },
  cabin: { file: "/sets/cabin.glb", length: 40, behind: 3, lamps: { first: 1.5, every: 3, height: 2.0, strength: 1.2 }, names: { ceiling: "ceiling", floor: "aisle", curtain: "curtain", sign: "sign" } },
};
