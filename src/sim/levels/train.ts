import type { Level } from "../level";

/** Where a coach of the 14:02 begins, in the sim's px: coach 18 at the platform's end, coach 1 last, 768 apart. */
export const coachX = (coach: number): number => 4000 + (18 - coach) * 768;

/**
 * 3-3, the 14:02 (story spec §9.3): Gare de Lyon at a dead run on its own two-minute clock, the barrier and the crowd and a
 * board with no platform on it; then eighteen coaches, the level's clock starting as he boards.
 */
export const TRAIN: Level = {
  id: "train",
  name: "The 14:02",
  world: "3-3",
  length: 17900,
  spawn: { x: 150, y: 0 },
  time: 420,
  music: "train",
  card: "13:41. Gare de Lyon. Voie 23 is not on the board.",
  stretch: { x1: 4000, time: 120, card: "The train left at 14:02. It always does.", bonus: 50 },
  board: { x: 1200, y: -700, lightAt: 60 },
  hints: { early: 0 },
  floor: [
    { x0: 0, x1: 4000, y0: 0, y1: 0, kind: "stone" },
    { x0: 4000, x1: 17900, y0: 0, y1: 0, kind: "carpet" },
  ],
  platforms: [],
  solids: [
    { x: -40, y: -1400, w: 40, h: 1400 },
    { x: 17900, y: -1400, w: 40, h: 1400 },
  ],
  // The ticket barrier: his head stops at it; a slide goes under its paddles.
  passes: [{ x: 1800, y: -1000, w: 150, h: 780, kind: "barrier" }],
  bounds: { x: -400, y: -1400, w: 18600, h: 2000 },
  crates: [],
  doors: [],
  signs: [],
  furniture: [],
  carts: [],
  lights: [],
  camera: { zones: [] },
  rewards: { count: 8, bucees: 1, nuts: 2 },
  routes: [],
  checkpoints: [{ id: "board", x: 4100, y: 0, auto: true }],
  thoughts: [
    { x: 3600, text: "The train leaves when I'm ON it." },
    { x: 4050, text: "I don't ride second." },
  ],
  cast: [
    { id: "crowd-1", person: "office-1", x: 700, y: 0, x0: 600, x1: 1200, trick: "shove" },
    { id: "crowd-2", person: "office-2", x: 1100, y: 0, x0: 800, x1: 1500, trick: "shove" },
    { id: "crowd-3", person: "nurse", x: 1400, y: 0, x0: 1100, x1: 1700, trick: "shove" },
    { id: "crowd-4", person: "lunch-1", x: 2200, y: 0, x0: 2050, x1: 2600, trick: "shove" },
    { id: "crowd-5", person: "prof-1", x: 2500, y: 0, x0: 2300, x1: 2900, trick: "shove" },
    { id: "crowd-6", person: "cook-1", x: 2900, y: 0, x0: 2600, x1: 3200, trick: "shove" },
    { id: "crowd-7", person: "busser-1", x: 3200, y: 0, x0: 2900, x1: 3500, trick: "shove" },
    { id: "crowd-8", person: "server-2", x: 3400, y: 0, x0: 3100, x1: 3600, trick: "shove" },
  ],
};
