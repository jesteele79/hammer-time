import type { Level } from "../level";

/**
 * The staff-only stash behind the STAFF ONLY door (the shipped "Staff-Only Stash", scaled): no
 * clock, restocked on every visit, a luggage shelf whose jump bumps the Buc-ee's case, a ! crate,
 * and the return cart by the door he came in at.
 */
export const STASH: Level = {
  id: "stash",
  name: "Staff-only stash",
  world: "1-1",
  length: 3300,
  spawn: { x: 700, y: 0 },
  time: 0,
  floor: [{ x0: -200, x1: 3300, y0: 0, y1: 0, kind: "tile" }],
  platforms: [{ x0: 1200, x1: 1630, y: -330, kind: "shelf" }],
  solids: [],
  passes: [],
  bounds: { x: -200, y: -1400, w: 3500, h: 2000 },
  crates: [
    { id: "bucees-shelf", kind: "bucees", x: 1520, y: -765 },
    { id: "pepper-stash", kind: "pepper", x: 2290, y: -435 },
  ],
  doors: [{ id: "back", kind: "return", x: 320, y: 0, label: "BACK TO THE LOBBY" }],
  checkpoints: [],
  signs: [{ x: 560, y: -700, label: "STAFF-ONLY STASH", note: "Stock up · ↓ at the cart to go back" }],
  furniture: [],
  carts: [],
  lights: [
    { x: 900, y: -700, radius: 800, intensity: 0.4 },
    { x: 2300, y: -700, radius: 800, intensity: 0.4 },
  ],
  camera: { zones: [] },
  rewards: { count: 8, bucees: 1, nuts: 2 },
  routes: [],
  music: "cellar",
};
