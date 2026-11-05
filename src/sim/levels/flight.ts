import type { CastPerson, CastSpawn, Level } from "../level";

/** Where a row of the cabin stands along its 40 m, in the sim's px: row 52 at 50, row 1 at 3,977, 0.77 m apart. */
export const rowX = (row: number): number => Math.round(100 * (0.5 + (52 - row) * 0.77));

/** Eight people in their seats, at the window side of the rows, who take no part. */
const SEATED: [number, CastPerson, 1 | -1, string?][] = [
  [50, "office-1", -1],
  [45, "prof-1", 1],
  [37, "office-2", 1],
  [33, "cook-1", -1, "#5b6b84"],
  [27, "office-1", 1, "#6b4f3a"],
  [19, "prof-1", -1],
  [12, "office-2", -1, "#7a6a55"],
  [7, "cook-1", 1, "#4e5f6e"],
];

const seated: CastSpawn[] = SEATED.map(([row, person, side, recolor]) => ({ id: `seat-${row}`, person, x: rowX(row), y: 0, sit: true, lx: side * 1.3, trick: "seated", recolor }));

/**
 * 3-1, row 52 (story spec §9.1): the hall's format with three snapped lanes: 100 px to the meter along the cabin's 40 m,
 * forward without a key, W the sprint, ↓ under a reclined seat. The drinks cart, the turbulence and the rows are
 * `src/sim/flight.ts`; the purser stands at the curtain at row 3, and past her the seat in row 1 ends the level.
 */
export const FLIGHT: Level = {
  id: "flight",
  name: "Row 52",
  world: "3-1",
  length: 4000,
  spawn: { x: 50, y: 0 },
  time: 300,
  music: "hallway",
  card: "Seat 52E. Middle.",
  hall: { width: 3.4, keep: 0.6, set: "cabin", lanes: [-0.9, 0, 0.9], run: true, pace: 0.5 },
  hints: { early: 0 },
  floor: [{ x0: -300, x1: 4100, y0: 0, y1: 0, kind: "carpet" }],
  platforms: [],
  solids: [],
  passes: [],
  bounds: { x: -300, y: -1400, w: 4400, h: 1800 },
  // He walks under it; a jump's head opens it.
  crates: [{ id: "bin", kind: "bucees", x: rowX(10), y: -360, look: "bin" }],
  doors: [],
  signs: [],
  furniture: [],
  carts: [],
  lights: [],
  camera: { zones: [] },
  rewards: { count: 0, bucees: 0, nuts: 0 },
  routes: [],
  checkpoints: [{ id: "row30", x: rowX(30), y: 0 }],
  seat: { x: rowX(1) },
  boss: { kind: "purser", x: rowX(3), arena: [rowX(6), rowX(3)] },
  thoughts: [
    { x: 60, text: "Row 52. ROW FIFTY-TWO." },
    { x: 600, text: "Middle seat. I don't do middle." },
    { x: rowX(20) - 200, text: "Headphones. HEAD PHONES." },
    { x: 3700, text: "Business Select. Look it up." },
    { x: rowX(1) - 30, text: "I AM business select." },
  ],
  pickupThoughts: { can: "No ice. Of course.", nuts: "Pretzels. PRETZELS." },
  cast: [
    { id: "queue-1", person: "office-1", x: rowX(30), y: 0, lx: 0, facing: 1, trick: "queue" },
    { id: "queue-2", person: "prof-1", x: rowX(30) + 40, y: 0, lx: 0, facing: 1, trick: "queue" },
    { id: "queue-3", person: "lunch-1", x: rowX(30) + 80, y: 0, lx: 0, facing: 1, trick: "queue" },
    { id: "attendant-1", person: "attendant-1", x: rowX(40), y: 0, x0: rowX(40) - 150, x1: rowX(40) + 150, lx: 0.9, recolor: "#1b2748", trick: "wander" },
    { id: "attendant-2", person: "attendant-1", x: rowX(15), y: 0, x0: rowX(15) - 150, x1: rowX(15) + 150, lx: 0.9, recolor: "#3b4a6b", trick: "wander" },
    ...seated,
  ],
  flight: {
    cart: { first: 12, every: 20, speed: 3, shove: 10 },
    turbulence: { first: 30, every: 45, warn: 2, fall: 4, sign: 6, bagEvery: 0.5 },
    recliners: [{ row: 48, lane: 0 }, { row: 44, lane: 2 }, { row: 38, lane: 0 }, { row: 26, lane: 2 }, { row: 16, lane: 0 }, { row: 8, lane: 2 }],
    legs: [41, 35, 23, 13],
    tablet: { row: 20 },
  },
};
