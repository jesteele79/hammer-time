import type { Level } from "../level";

/**
 * 1-2, the restaurant (R3 §3.1), in world px with the floor at 0 and up negative. Act 1, the dining room: the early
 * pepper, the host stand, booths and a table to hop, the first punch clock, the busser's dish cart and the bar to jump.
 * Act 2, the kitchen: the swinging door, the pass with the cook hidden behind it, the heat-lamp gantry to slide under,
 * then the line: steel counters with two flat-tops (they heat him) under the pot rack (520, reached only from the
 * counters), or the floor in front, where the second cook marches and the walk-in freezer stands open (it cools him).
 * Act 3, the loading dock: a ramp up, crates, the trash-bin busser, the truck well (the one pit) and the truck, the
 * dumpster and the DELIVERIES gate.
 */
export const RESTAURANT: Level = {
  id: "restaurant",
  name: "Restaurant",
  world: "1-2",
  length: 15800,
  spawn: { x: 300, y: 0 },
  time: 420,
  floor: [
    { x0: -400, x1: 5200, y0: 0, y1: 0, kind: "wood" },
    { x0: 5200, x1: 11000, y0: 0, y1: 0, kind: "quarry" },
    { x0: 11000, x1: 11600, y0: 0, y1: -200, kind: "ramp" },
    { x0: 11600, x1: 13600, y0: -200, y1: -200, kind: "concrete" },
    { x0: 13930, x1: 15000, y0: -200, y1: -200, kind: "truck" },
    { x0: 15000, x1: 16400, y0: 0, y1: 0, kind: "concrete" },
  ],
  platforms: [
    { x0: 1050, x1: 1250, y: -150, kind: "host" },
    { x0: 1600, x1: 2100, y: -110, kind: "booth" },
    { x0: 2300, x1: 2700, y: -160, kind: "table" },
    { x0: 2900, x1: 3400, y: -110, kind: "booth" },
    { x0: 5700, x1: 6900, y: -180, kind: "pass" },
    { x0: 7800, x1: 8300, y: -180, kind: "steel" },
    { x0: 8300, x1: 8700, y: -180, kind: "flattop" },
    { x0: 8700, x1: 9000, y: -180, kind: "steel" },
    { x0: 9500, x1: 9900, y: -180, kind: "flattop" },
    { x0: 9900, x1: 10400, y: -180, kind: "steel" },
    { x0: 8000, x1: 10200, y: -520, kind: "rack" },
    { x0: 12000, x1: 12300, y: -340, kind: "crates" },
    { x0: 12500, x1: 12700, y: -480, kind: "crates" },
    { x0: 15150, x1: 15500, y: -220, kind: "dumpster" },
  ],
  solids: [{ x: 4300, y: -180, w: 700, h: 180 }],
  passes: [{ x: 7100, y: -1000, w: 500, h: 780, kind: "gantry" }],
  bounds: { x: -400, y: -1600, w: 16400, h: 2200 },
  crates: [
    { id: "pepper-host", kind: "pepper", x: 760, y: -435 },
    { id: "can-booth", kind: "can", x: 1850, y: -545 },
    { id: "can-bar", kind: "can", x: 4650, y: -615 },
    { id: "bucees-rack", kind: "bucees", x: 8500, y: -955 },
    { id: "pepper-dock", kind: "pepper", x: 11800, y: -635 },
    { id: "case-dock", kind: "case", x: 12850, y: -635 },
  ],
  doors: [
    { id: "private", kind: "closed", x: 1430, y: 0, label: "PRIVATE DINING", opens: "Opens later" },
    { id: "out", kind: "exit", x: 15750, y: 0, label: "DELIVERIES" },
  ],
  checkpoints: [
    { id: "host", x: 3650, y: 0 },
    { id: "line", x: 10700, y: 0 },
  ],
  signs: [
    { x: 200, y: -700, label: "RESTAURANT", note: "! supplies · jump + hammer" },
    { x: 2300, y: -760, label: "DINING ROOM", note: "Hop the booths" },
    { x: 5450, y: -760, label: "KITCHEN", note: "Mind the swinging door" },
    { x: 7900, y: -820, label: "THE LINE", note: "Flat-tops burn · the walk-in cools" },
    { x: 11400, y: -820, label: "LOADING DOCK", note: "Jump the truck well" },
  ],
  furniture: [
    { kind: "bar", x: 4300, y: -180, w: 700, h: 180 },
    { kind: "lamps", x: 5700, y: -470, w: 1200, h: 90 },
    { kind: "freezer", x: 9000, y: -400, w: 500, h: 400 },
    { kind: "truck", x: 13930, y: -560, w: 1070, h: 360 },
  ],
  // The busser's dish cart before the bar; the dock busser's trash bin.
  carts: [3880, 13080],
  lights: [
    { x: 1300, y: -640, radius: 900, intensity: 0.5 },
    { x: 3600, y: -640, radius: 900, intensity: 0.5 },
    { x: 6300, y: -560, radius: 800, intensity: 0.55 },
    { x: 8600, y: -760, radius: 900, intensity: 0.5 },
    { x: 10000, y: -760, radius: 900, intensity: 0.5 },
    { x: 12500, y: -900, radius: 900, intensity: 0.45 },
    { x: 14800, y: -900, radius: 900, intensity: 0.4 },
  ],
  camera: { zones: [{ x0: 7600, x1: 10600, zoom: 0.88 }] },
  rewards: { count: Math.ceil(15800 / 1000), bucees: 0, nuts: 3 },
  routes: [
    { id: "line", x0: 7600, x1: 10400, y0: -100, y1: 0 },
    { id: "rack", x0: 8000, x1: 10200, y0: -600, y1: -560 },
  ],
  music: "day",
  hints: { early: 1500 },
  pitWord: "DELIVERY REFUSED",
  heat: [
    { x0: 8300, x1: 8700, y: -180, rate: 20, kind: "flattop" },
    { x0: 9500, x1: 9900, y: -180, rate: 20, kind: "flattop" },
    { x0: 9000, x1: 9500, y: 0, rate: -30, kind: "freezer" },
  ],
  swingDoors: [{ id: "kitchen", x: 5200, y: 0, server: "server-kitchen" }],
  // The cast (R3 §3.1): the host and a server in the dining room, the busser and his dish cart, the kitchen server through
  // the door, the cook behind the pass and the second on the line, the dock's busser with his bin, a server on her break.
  cast: [
    { id: "server-host", person: "server-2", x: 1150, y: 0, x0: 900, x1: 1500, recolor: "#4b2a5c" },
    { id: "server-booths", person: "server-1", x: 2800, y: 0, x0: 2200, x1: 3500 },
    { id: "busser-dining", person: "busser-1", x: 4030, y: 0, cart: 3880, load: "dishes", carry: "nuts" },
    { id: "server-kitchen", person: "server-1", x: 5550, y: 0, x0: 4900, x1: 6000, recolor: "#7a1f2b", size: 0.97 },
    { id: "cook-pass", person: "cook-1", x: 6300, y: 0, hide: true },
    { id: "cook-line", person: "cook-1", x: 8600, y: 0, x0: 7700, x1: 10400, recolor: "#26262a", carry: "bucees" },
    { id: "busser-dock", person: "busser-1", x: 13230, y: -200, cart: 13080, load: "trash", recolor: "#6b1f2a", carry: "nuts" },
    { id: "server-break", person: "server-2", x: 14650, y: -200, x0: 14100, x1: 14950 },
  ],
  backdrop: {
    walls: ["restaurant-far-1", "restaurant-far-2", "restaurant-far-3"],
    mid: [
      { name: "restaurant-mid-1", x: 900 },
      { name: "restaurant-mid-2", x: 4500 },
      { name: "restaurant-mid-3", x: 6200 },
      { name: "restaurant-mid-4", x: 7400 },
      { name: "restaurant-mid-5", x: 10600 },
      { name: "restaurant-mid-6", x: 12400 },
    ],
    fore: [
      { name: "restaurant-fore-1", x: 2500 },
      { name: "restaurant-fore-2", x: 11300 },
    ],
  },
};
