import type { Level } from "../level";

const FERME = "Fermé · 14 juillet";

/**
 * 3-2, Paris (story spec §9.2): the hotel on two stacked floors over one wall's width (a lobby with the concierge's gate, a
 * lift for one and spiral stairs, up to the closet with its window and the breakfast tray), a back stair down to the street
 * on the 14th, shut from end to end, with its terrace, its waiter, its scooters and one brasserie, whose door ends the level.
 */
export const PARIS: Level = {
  id: "paris",
  name: "Paris",
  world: "3-2",
  length: 10600,
  spawn: { x: 200, y: 0 },
  time: 420,
  music: "paris",
  card: "13 July. 06:40. The hotel has one lift.",
  tally: "Lunch took three hours. It is 13:40. The train leaves at 14:02.",
  canScale: 0.7,
  hints: { early: 0 },
  floor: [
    { x0: 0, x1: 1536, y0: 0, y1: 0, kind: "wood" },
    { x0: 515, x1: 1536, y0: -540, y1: -540, kind: "wood" },
    // The spiral stairs: he climbs leftward through the hole in the floor above.
    { x0: 515, x1: 1450, y0: -540, y1: 0, kind: "stairs" },
    { x0: 1536, x1: 2471, y0: -540, y1: 0, kind: "steps" },
    { x0: 2471, x1: 10800, y0: 0, y1: 0, kind: "stone" },
  ],
  platforms: [
    { x0: 400, x1: 560, y: -800, kind: "sash", tip: 0.4 },
    { x0: 650, x1: 1000, y: -660, kind: "bed", bounce: 1.3 },
    { x0: 1150, x1: 1350, y: -650, kind: "table" },
    { x0: 2550, x1: 2640, y: -130, kind: "chair" },
    { x0: 2700, x1: 2790, y: -130, kind: "chair" },
    { x0: 2850, x1: 2940, y: -130, kind: "chair" },
    { x0: 2600, x1: 2710, y: -180, kind: "table" },
    { x0: 2800, x1: 2910, y: -180, kind: "table" },
    { x0: 9900, x1: 10400, y: -380, kind: "awning" },
  ],
  solids: [
    // The hotel's two ends: the back wall, and the wall the ground floor stops at, far enough under the back stair's top for his width.
    { x: -40, y: -1400, w: 40, h: 1400 },
    { x: 1536, y: -470, w: 30, h: 470 },
    // The street's far end.
    { x: 10760, y: -1400, w: 60, h: 1400 },
  ],
  passes: [],
  bounds: { x: -400, y: -1400, w: 11600, h: 2000 },
  bonjour: { x: 500, reach: 300, wall: { x: 700, y: -540, w: 30, h: 540 } },
  movers: [
    { id: "lift", x: 1030, y: 0, x0: 1030, x1: 1030, y0: 0, y1: -540, w: 140, h: 24, speed: 800, ride: "crouch" },
    { id: "scooter-1", x: 10800, y: 0, x0: 10800, x1: 2520, w: 160, h: 90, speed: 900, loop: -1, every: 7, first: 3 },
    { id: "scooter-2", x: 10800, y: 0, x0: 10800, x1: 2520, w: 160, h: 90, speed: 900, loop: -1, every: 7, first: 7 },
  ],
  pickups: [
    { kind: "bread", x: 1250, y: -700 },
    { kind: "nuts", x: 2700, y: -230 },
  ],
  pickupThoughts: { bread: "That's breakfast? That's a baguette.", can: "Thirty-three centiliters. That's a sample." },
  crates: [{ id: "awning", kind: "bucees", x: 10150, y: -560 }],
  checkpoints: [{ id: "terrace", x: 2900, y: 0 }],
  doors: [{ id: "brasserie", kind: "quest", quest: "french", x: 10200, y: 0, label: "BRASSERIE", down: true, ends: true }],
  signs: [
    { x: 3300, y: -300, label: FERME },
    { x: 6600, y: -300, label: FERME },
    { x: 9500, y: -300, label: FERME },
  ],
  screens: [
    { x: 3000, y: -760 },
    { x: 4100, y: -760 },
    { x: 6000, y: -760 },
    { x: 7400, y: -760 },
    { x: 8700, y: -760 },
  ],
  pigeons: [
    { x: 4600, y: 0 },
    { x: 7900, y: 0 },
  ],
  furniture: [],
  carts: [],
  lights: [],
  // The hotel is climbed: the floor line kept as he rises.
  camera: { zones: [{ x0: -400, x1: 2471, zoom: 1, follow: "up" }] },
  rewards: { count: 6, bucees: 0, nuts: 0 },
  routes: [{ id: "street", x0: 3000, x1: 9500, y0: -80, y1: 0 }],
  thoughts: [
    { x: 1200, y: -540, text: "No ice. Of COURSE." },
    { x: 2500, text: "Fermé? It's a Tuesday." },
    { x: 3000, text: "Is Pepsi okay? NO." },
  ],
  backdrop: {
    walls: ["paris-far-1", "paris-far-2", "paris-far-3", "paris-far-4"],
    layout: [
      { wall: "paris-far-1", x: 0 },
      { wall: "paris-far-2", x: 0, y: -540 },
      { wall: "paris-far-3", x: 1536 },
      { wall: "paris-far-4", x: 3072 },
      { wall: "paris-far-3", x: 4608 },
      { wall: "paris-far-4", x: 6144 },
      { wall: "paris-far-3", x: 7680 },
      { wall: "paris-far-4", x: 9216 },
    ],
    mid: [
      { name: "paris-mid-1", x: 2500 },
      { name: "paris-mid-2", x: 9900 },
    ],
    fore: [{ name: "paris-fore-1", x: 3600, scale: 0.55 }],
    far: { pan: 1, scale: 1 },
  },
  cast: [
    // She stays behind her desk: he answers her, or the gate stays shut.
    { id: "concierge", person: "concierge", x: 460, y: 0, facing: 1, trick: "seated" },
    { id: "garcon-terrace", person: "garcon", x: 2700, y: 0, x0: 2520, x1: 3300, trick: "tray" },
    { id: "parisian-1", person: "parisian-1", x: 5200, y: 0, x0: 4900, x1: 5500, trick: "wander" },
    { id: "parisian-2", person: "parisian-1", x: 7400, y: 0, x0: 7100, x1: 7700, recolor: "#7a3b2e", trick: "wander" },
  ],
};
