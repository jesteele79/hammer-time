import type { Level } from "../level";

/**
 * The prologue, San Antonio International (story spec §6.2): the curb with the van and the skycap's cart, the check-in
 * hall with its kiosks and the bag drop, the TSA line's rope zig-zag, the X-ray belt he rides up and through, the body
 * scanner to slide under, the concourse's punch clock, the moving walkway past the bar, the newsstand, and gate B7, where
 * Fare Darts is the level's end (spec §6.3). Seven minutes on the clock: boarding.
 */
export const SAT: Level = {
  id: "sat",
  name: "San Antonio International",
  world: "SAT",
  length: 8000,
  spawn: { x: 300, y: 0 },
  time: 420,
  floor: [
    { x0: -400, x1: 1400, y0: 0, y1: 0, kind: "concrete" },
    { x0: 1400, x1: 3800, y0: 0, y1: 0, kind: "terrazzo" },
    { x0: 3800, x1: 3950, y0: 0, y1: -120, kind: "ramp" },
    { x0: 3950, x1: 4550, y0: -120, y1: -120, belt: 220, kind: "belt" },
    { x0: 4550, x1: 4700, y0: -120, y1: 0, kind: "ramp" },
    { x0: 4700, x1: 5600, y0: 0, y1: 0, kind: "terrazzo" },
    { x0: 5600, x1: 6400, y0: 0, y1: 0, belt: 200, kind: "belt" },
    { x0: 6400, x1: 8400, y0: 0, y1: 0, kind: "terrazzo" },
  ],
  platforms: [
    { x0: 1500, x1: 1800, y: -180, kind: "counter" },
    { x0: 2000, x1: 2300, y: -180, kind: "counter" },
    { x0: 5900, x1: 6500, y: -180, kind: "counter" },
    { x0: 6800, x1: 7200, y: -200, kind: "shelf" },
  ],
  solids: [],
  passes: [{ x: 4750, y: -1000, w: 300, h: 780, kind: "scanner" }],
  bounds: { x: -400, y: -1600, w: 8800, h: 2200 },
  crates: [
    { id: "pepper-curb", kind: "pepper", x: 500, y: -435 },
    { id: "case-bagdrop", kind: "case", x: 2400, y: -435 },
    { id: "can-kiosk", kind: "can", x: 2150, y: -615 },
    { id: "bucees-news", kind: "bucees", x: 7000, y: -635 },
  ],
  doors: [{ id: "b7", kind: "gate", x: 7800, y: 0, label: "GATE B7" }],
  checkpoints: [{ id: "concourse", x: 5300, y: 0 }],
  signs: [
    { x: 200, y: -700, label: "SOUTHWEST", note: "Curbside check-in" },
    { x: 2600, y: -700, label: "BAG FEE", note: "Bags used to fly FREE." },
    { x: 3300, y: -700, label: "TSA PRE✓", note: "This lane is closed" },
    { x: 4900, y: -700, label: "NO LIQUIDS", note: "3.4 oz or less" },
    { x: 7600, y: -700, label: "B7", note: "Now boarding" },
  ],
  furniture: [
    { kind: "van", x: 600, y: -300, w: 520, h: 300 },
    { kind: "stanchion", x: 3200, y: -120, w: 700, h: 120 },
    // The housing stands on the belt's line, its tunnel tall enough for him to ride through.
    { kind: "xray", x: 3900, y: -540, w: 700, h: 420 },
    { kind: "scanner", x: 4750, y: -780, w: 300, h: 780 },
    { kind: "walkway", x: 5600, y: -120, w: 800, h: 120 },
    { kind: "bar", x: 5900, y: -180, w: 600, h: 180 },
    { kind: "departures", x: 2500, y: -1000, w: 200, h: 1000 },
    { kind: "seats", x: 7220, y: -140, w: 400, h: 140 },
    { kind: "podium", x: 7700, y: -220, w: 200, h: 220 },
  ],
  carts: [1000],
  lights: [
    { x: 300, y: -700, radius: 800, intensity: 0.45 },
    { x: 2600, y: -900, radius: 1200, intensity: 0.6 },
    { x: 4300, y: -900, radius: 1100, intensity: 0.55 },
    { x: 6200, y: -900, radius: 1200, intensity: 0.6 },
    { x: 7700, y: -700, radius: 900, intensity: 0.5 },
  ],
  camera: { zones: [{ x0: 3200, x1: 5200, zoom: 0.92 }] },
  rewards: { count: 8, bucees: 0, nuts: 2 },
  routes: [{ id: "floor", x0: 1400, x1: 7400, y0: 0, y1: 0 }],
  music: "sat",
  hints: { early: 1400 },
  // The moves, taught in the stretch where each is needed (spec §6.2), each until he has done it once.
  lessons: [
    { x0: 0, x1: 1400, move: "jump", text: "Space jumps · over the cart, onto the kiosks" },
    { x0: 1400, x1: 3200, move: "run", text: "Shift runs · the bag belt moves under you" },
    { x0: 3200, x1: 4700, move: "slide", text: "↓ while running slides · under the body scanner" },
    { x0: 3200, x1: 5200, move: "swing", text: "H swings the mallet · the agents go down in three" },
    { x0: 5200, x1: 7600, move: "snot", text: "F fires a snot rocket · the bartender runs from it" },
    { x0: 5200, x1: 7600, move: "wipe", text: "T towels off · when the heat bar is high" },
  ],
  thoughts: [
    { x: 300, text: "Pre-check. I AM pre-check." },
    { x: 700, text: "I don't check." },
    { x: 3300, text: "Take your shoes off? These are loafers." },
    { x: 4000, text: "That's a $400 demo unit." },
    { x: 4900, text: "It's Coke Zero. It's not a liquid. It's a lifestyle." },
    { x: 5300, text: "Seven minutes. Plenty." },
    { x: 7000, text: "I have a schedule." },
  ],
  // The skycap's cart is the curb's; the second agent waits at the scanner's way out; the bartender stands on his own bar.
  cast: [
    { id: "skycap-curb", person: "skycap-1", x: 900, y: 0, cart: 1000, carry: "nuts" },
    { id: "tsa-1", person: "tsa-1", x: 3600, y: 0, x0: 3400, x1: 3900 },
    { id: "tsa-2", person: "tsa-1", x: 5150, y: 0, recolor: "#2f3f63", size: 1.03 },
    { id: "bartender", person: "bartender-1", x: 6300, y: -180, carry: "can" },
  ],
  backdrop: {
    walls: ["sat-tall-far-1", "sat-tall-far-2", "sat-tall-far-3"],
    // The level is half a hotel floor's length: at the shared pan the curb and the gate would never come into view. This scale fills a 1080p view to its top.
    far: { pan: 0.42, scale: 1.15 },
    mid: [
      { name: "sat-mid-1", x: 1800 },
      { name: "sat-mid-2", x: 4300 },
      { name: "sat-mid-3", x: 6000 },
    ],
    fore: [{ name: "sat-fore-1", x: 2600, scale: 0.55 }],
  },
};
