import type { Level } from "../level";

/**
 * 1-4, the gift shop (R3 §5.1): the hotel's gift shop at night on grey carpet, the pig's arena. Spawn at 300 and the ! crate
 * at 500; the arena from 600 to 3900, its punch clock at the way in; two plush shelves (180 and 360 high) and the cash
 * counter (180) to get above the pig; a spotlight pooled in the middle; CLOCK OUT at 4100, chained until the pig is down.
 * The rewards are the shipped boss level's: eight, two of them nuts, one Buc-ee's.
 */
export const GIFTSHOP: Level = {
  id: "arena",
  name: "The Pink Menace",
  world: "1-4",
  length: 4400,
  spawn: { x: 300, y: 0 },
  time: 300,
  floor: [{ x0: -400, x1: 4800, y0: 0, y1: 0, kind: "carpet" }],
  platforms: [
    { x0: 1100, x1: 1500, y: -180, kind: "plush" },
    { x0: 1800, x1: 2200, y: -360, kind: "plush" },
    { x0: 2900, x1: 3500, y: -180, kind: "till" },
  ],
  solids: [],
  passes: [],
  bounds: { x: -400, y: -1600, w: 5200, h: 2200 },
  crates: [{ id: "pepper-door", kind: "pepper", x: 500, y: -435 }],
  doors: [{ id: "out", kind: "exit", x: 4100, y: 0, label: "CLOCK OUT", locked: true }],
  checkpoints: [{ id: "arena", x: 600, y: 0 }],
  signs: [{ x: 200, y: -700, label: "THE PINK MENACE", note: "3 bonks + 3 snots minimum" }],
  furniture: [{ kind: "spotlight", x: 1350, y: 0, w: 1800, h: 900 }],
  carts: [],
  lights: [
    { x: 300, y: -700, radius: 800, intensity: 0.45 },
    { x: 2250, y: -900, radius: 1300, intensity: 0.6 },
    { x: 4000, y: -700, radius: 800, intensity: 0.45 },
  ],
  camera: { zones: [{ x0: 600, x1: 3900, zoom: 0.92 }] },
  rewards: { count: 8, bucees: 1, nuts: 2 },
  routes: [],
  music: "day",
  hints: { early: 560 },
  boss: { x: 2600, arena: [600, 3900] },
};
