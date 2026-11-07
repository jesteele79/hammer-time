import type { Level } from "../level";

/**
 * 3-6, the replacement (story spec §11.1, the 2026-11-06 note): the training room, the fight only, in scrubs. The double doors
 * at the left with the catering table beside them, four rows of seats as platforms, and at the right the lectern with the
 * IFU on it, the ring light on its stand, the big screen on the wall and the drone's pad. The kid waits by the lectern.
 */
export const REPLACEMENT: Level = {
  id: "replacement",
  name: "The replacement",
  world: "3-6",
  length: 3600,
  spawn: { x: 200, y: 0 },
  time: 360,
  music: "replacement",
  costume: "scrubs",
  card: "The training room. He has a ring light.",
  floor: [{ x0: 0, x1: 3600, y0: 0, y1: 0, kind: "carpet" }],
  platforms: [
    { x0: 400, x1: 700, y: -130, kind: "table" },
    ...[900, 1400, 1900, 2400].map((x0) => ({ x0, x1: x0 + 300, y: -150, kind: "seat" as const })),
    { x0: 2950, x1: 3050, y: -140, kind: "lectern" },
  ],
  solids: [
    { x: -40, y: -1400, w: 40, h: 1400 },
    { x: 3600, y: -1400, w: 60, h: 1400 },
  ],
  passes: [],
  bounds: { x: -400, y: -1400, w: 4400, h: 2000 },
  ifu: { x: 3000, y: -140 },
  // The residents who take their seats in round two.
  calls: ["resident"],
  crates: [],
  checkpoints: [],
  doors: [],
  signs: [],
  furniture: [],
  carts: [],
  lights: [],
  camera: { zones: [{ x0: 0, x1: 3600, zoom: 0.85 }] },
  rewards: { count: 0, bucees: 0, nuts: 0 },
  routes: [],
  boss: { kind: "replacement", x: 3100, arena: [200, 3500] },
  thoughts: [{ x: 600, text: "Read the IFU." }],
  // Three walls painted straight: the back with the doors and the calendar, the plain middle, the front with the screen in its
  // middle (the screen stands over 2700 to 3400); the third drawn over the second's right part.
  backdrop: {
    walls: ["training-far-1", "training-far-2", "training-far-3"],
    layout: [
      { wall: "training-far-1", x: 0 },
      { wall: "training-far-2", x: 1536 },
      { wall: "training-far-3", x: 2200 },
    ],
    mid: [],
    fore: [],
    far: { pan: 1, scale: 1 },
  },
};
