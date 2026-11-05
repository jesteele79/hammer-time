import type { Level } from "../level";

/**
 * 2-4, the suite (story spec §8.4): three rooms and no door, and Lifetime Titanium guy in them. Where the furniture stands is
 * where the painted rooms have it: one wall a room, 186 px to their meter, the living room's sofa, table and minibar, the
 * bedroom's king bed and nightstands, the balcony's rail. The level ends when he goes over it.
 */
export const SUITE: Level = {
  id: "suite",
  name: "The suite",
  world: "2-4",
  length: 4800,
  spawn: { x: 300, y: 0 },
  time: 300,
  music: "suite",
  card: "Someone is in it.",
  hints: { early: 0 },
  rooms: [
    { id: "living", x0: 0, x1: 1600 },
    { id: "bedroom", x0: 1600, x1: 3200 },
    { id: "balcony", x0: 3200, x1: 4800 },
  ],
  backdrop: { walls: ["suite-far-1", "suite-far-2", "suite-far-3"], mid: [], fore: [], rooms: true, far: { pan: 1, scale: 1 } },
  floor: [
    { x0: -400, x1: 3200, y0: 0, y1: 0, kind: "carpet" },
    { x0: 3200, x1: 5200, y0: 0, y1: 0, kind: "tile" },
  ],
  platforms: [
    { x0: 214, x1: 679, y: -110, kind: "sofa" },
    { x0: 726, x1: 1005, y: -112, kind: "table" },
    { x0: 1116, x1: 1414, y: -177, kind: "minibar" },
    { x0: 1633, x1: 1808, y: -115, kind: "table" },
    { x0: 1889, x1: 2782, y: -150, kind: "bed", bounce: 1.3 },
    { x0: 2865, x1: 3032, y: -115, kind: "table" },
    { x0: 4500, x1: 4800, y: -220, kind: "rail" },
  ],
  // He stays in the suite; the balcony's rail stops him and only Lifetime Titanium guy goes over it.
  solids: [
    { x: -200, y: -1600, w: 200, h: 1600 },
    { x: 4800, y: -1600, w: 200, h: 1600 },
  ],
  passes: [],
  bounds: { x: 0, y: -1600, w: 4800, h: 2200 },
  // Over the minibar, a jump up from it, as the lobby hangs its own.
  crates: [{ id: "minibar", kind: "can", x: 1265, y: -435 }],
  doors: [],
  signs: [],
  furniture: [],
  carts: [],
  // None past the bedroom's wall: on the night sky a glow is fog, and the balcony's lamp is painted.
  lights: [
    { x: 100, y: -500, radius: 900, intensity: 0.4 },
    { x: 1200, y: -600, radius: 900, intensity: 0.3 },
    { x: 1800, y: -420, radius: 800, intensity: 0.4 },
    { x: 2600, y: -420, radius: 600, intensity: 0.4 },
  ],
  camera: { zones: [] },
  rewards: { count: 0, bucees: 0, nuts: 0 },
  routes: [{ id: "rooms", x0: 100, x1: 4700, y0: 0, y1: 0 }],
  checkpoints: [],
  boss: { kind: "titanium", x: 1200, arena: [200, 4600], room: 0 },
  cast: [],
};
