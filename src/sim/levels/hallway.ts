import type { Level } from "../level";

/** 2-3, the fourteenth floor (story spec §8.3): the 2D sim with a lateral axis; 100 px to the meter along its 80 m. */
export const HALLWAY: Level = {
  id: "hallway",
  name: "The fourteenth floor",
  world: "2-3",
  length: 8000,
  spawn: { x: 100, y: 0 },
  time: 300,
  music: "hallway",
  hall: { width: 3, keep: 0.4 },
  floor: [{ x0: 0, x1: 8000, y0: 0, y1: 0, kind: "carpet" }],
  platforms: [],
  solids: [],
  passes: [],
  bounds: { x: 0, y: -1400, w: 8000, h: 1800 },
  crates: [],
  doors: [],
  signs: [],
  furniture: [],
  carts: [],
  lights: [],
  camera: { zones: [] },
  rewards: { count: 0, bucees: 0, nuts: 0 },
  routes: [{ id: "hall", x0: 300, x1: 7600, y0: 0, y1: 0 }],
  checkpoints: [],
};
