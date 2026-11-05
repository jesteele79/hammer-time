import type { Level } from "../level";

/**
 * 2-3, the fourteenth floor (story spec §8.3): the 2D sim with a lateral axis, 100 px to the meter along its 80 m and `lx`
 * meters across its 3. W walks him down it, S back, A and D sidestep; housekeeping carts roll across from their doors, the
 * room doors swing out across their half of the hall, the ice alcove leaks at 30 m, the bellhops wait at the elevator
 * lobby at 50 m, and the key at the end fails twice.
 */
export const HALLWAY: Level = {
  id: "hallway",
  name: "The fourteenth floor",
  world: "2-3",
  length: 8000,
  spawn: { x: 100, y: 0 },
  time: 300,
  music: "hallway",
  hall: { width: 3, keep: 0.4 },
  hints: { early: 0 },
  floor: [{ x0: 0, x1: 8000, y0: 0, y1: 0, kind: "carpet" }],
  platforms: [],
  // The end wall, with 1417's door in it.
  solids: [{ x: 7900, y: -600, w: 100, h: 600 }],
  passes: [],
  bounds: { x: 0, y: -1400, w: 8000, h: 1800 },
  crates: [],
  doors: [],
  signs: [],
  furniture: [],
  carts: [4900, 5200],
  lights: [],
  camera: { zones: [] },
  rewards: { count: 10, bucees: 1, nuts: 2 },
  routes: [{ id: "hall", x0: 300, x1: 7600, y0: 0, y1: 0 }],
  checkpoints: [{ id: "elevators", x: 5000, y: 0 }],
  thoughts: [
    { x: 600, text: "Fourteen. Of course it's fourteen." },
    { x: 3000, text: "Ice. At this hour." },
    { x: 5000, text: "Bellhops. Of course." },
  ],
  hallCarts: [
    { z: 12, side: 1, every: 6, at: 2 },
    { z: 24, side: -1, every: 7, at: 4 },
    { z: 42, side: 1, every: 6, at: 1 },
    { z: 63, side: -1, every: 8, at: 3 },
    { z: 72, side: 1, every: 6, at: 2 },
  ],
  hallDoors: [
    { z: 9, side: 1, at: 2, every: 9 },
    { z: 21, side: -1, at: 5, every: 8 },
    { z: 36, side: 1, at: 3, every: 10 },
    { z: 57, side: -1, at: 6, every: 9 },
    { z: 69, side: 1, at: 4, every: 11 },
  ],
  puddle: { z0: 29, z1: 31 },
  keyDoor: { x: 7900, hits: 3, fails: ["Mobile key failed.", "Mobile key failed AGAIN.", "Elite members don't wait."] },
  cast: [
    { id: "guest-1", person: "office-2", x: 1500, y: 0, x0: 1200, x1: 1900, recolor: "#d9c7b8", trick: "wander", lx: 0.5 },
    { id: "guest-2", person: "nurse", x: 3800, y: 0, x0: 3500, x1: 4200, trick: "wander", lx: -0.5 },
    // "The doors open on bellhops": they wait out of sight until he is near, then shove their carts at him, two at a time.
    { id: "bell-14-1", person: "bellhop-1", x: 5000, y: 0, cart: 4900, hide: true, lx: 0.3 },
    { id: "bell-14-2", person: "bellhop-2", x: 5300, y: 0, cart: 5200, hide: true, recolor: "#4a2f6b", lx: -0.3 },
  ],
};
