import type { Level } from "../level";

/**
 * 1-3, the campus (R3 §3.2). Act 1, the quad, outdoors: steps up to a plaza, benches with students on them, the fountain
 * (its rim, and its top tier from the rim), the professor marching with his book, steps down, the SKILLS LAB door and the
 * first punch clock. Act 2, the dining commons: the serving line and the lunch worker; then two ways: hop onto the tray
 * return and ride its conveyor up to the seating deck (520, out of reach from the floor; students on it), or stay on the
 * floor under it (an office worker, a second lunch worker, paper from above); stairs down where they meet; the second
 * clock. Act 3, the library steps: three flights and their landings up to the LIBRARY, students firing down them and a
 * second professor walking them.
 */
export const CAMPUS: Level = {
  id: "campus",
  name: "Campus",
  world: "1-3",
  length: 16400,
  spawn: { x: 300, y: 0 },
  time: 420,
  floor: [
    { x0: -400, x1: 1200, y0: 0, y1: 0, kind: "brick" },
    { x0: 1200, x1: 1546, y0: 0, y1: -200, kind: "steps" },
    { x0: 1546, x1: 4200, y0: -200, y1: -200, kind: "brick" },
    { x0: 4200, x1: 4546, y0: -200, y1: 0, kind: "steps" },
    { x0: 4546, x1: 5000, y0: 0, y1: 0, kind: "brick" },
    { x0: 5000, x1: 12000, y0: 0, y1: 0, kind: "terrazzo" },
    { x0: 7400, x1: 8300, y0: -120, y1: -520, belt: 220, kind: "belt" },
    { x0: 10400, x1: 11300, y0: -520, y1: 0, kind: "steps" },
    { x0: 12000, x1: 12520, y0: 0, y1: -300, kind: "steps" },
    { x0: 12520, x1: 13000, y0: -300, y1: -300, kind: "stone" },
    { x0: 13000, x1: 13520, y0: -300, y1: -600, kind: "steps" },
    { x0: 13520, x1: 14000, y0: -600, y1: -600, kind: "stone" },
    { x0: 14000, x1: 14520, y0: -600, y1: -900, kind: "steps" },
    { x0: 14520, x1: 16800, y0: -900, y1: -900, kind: "stone" },
  ],
  platforms: [
    { x0: 1800, x1: 2100, y: -300, kind: "bench" },
    { x0: 2300, x1: 3100, y: -310, kind: "fountain" },
    { x0: 2600, x1: 2800, y: -610, kind: "tier" },
    { x0: 3400, x1: 3700, y: -300, kind: "bench" },
    { x0: 5600, x1: 7000, y: -180, kind: "serving" },
    { x0: 7150, x1: 7400, y: -120, kind: "tray" },
    { x0: 8300, x1: 10400, y: -520, kind: "deck" },
    { x0: 8600, x1: 9200, y: -110, kind: "table" },
    { x0: 9600, x1: 10200, y: -110, kind: "bench" },
    { x0: 12280, x1: 12460, y: -520, kind: "ledge" },
    { x0: 13280, x1: 13460, y: -820, kind: "ledge" },
  ],
  solids: [],
  passes: [],
  bounds: { x: -400, y: -2200, w: 17200, h: 2800 },
  crates: [
    { id: "pepper-quad", kind: "pepper", x: 760, y: -435 },
    { id: "can-serving", kind: "can", x: 6300, y: -615 },
    { id: "pepper-library", kind: "pepper", x: 11800, y: -435 },
    { id: "case-terrace", kind: "case", x: 15300, y: -1335 },
  ],
  doors: [
    { id: "skills", kind: "closed", x: 4750, y: 0, label: "SKILLS LAB", opens: "Opens with the Skills Lab" },
    { id: "out", kind: "exit", x: 16000, y: -900, label: "LIBRARY" },
  ],
  checkpoints: [
    { id: "commons", x: 5150, y: 0 },
    { id: "library", x: 11500, y: 0 },
  ],
  signs: [
    { x: 200, y: -700, label: "CAMPUS", note: "! supplies · jump + hammer" },
    { x: 2700, y: -1000, label: "THE QUAD", note: "Students throw paper · E lectures them" },
    { x: 6300, y: -800, label: "DINING COMMONS", note: "Ride the tray return up, or stay on the floor" },
    { x: 12300, y: -900, label: "LIBRARY STEPS", note: "Paper from above · keep climbing" },
  ],
  furniture: [
    { kind: "lampPost", x: 1680, y: -700, w: 40, h: 500 },
    { kind: "fountain", x: 2300, y: -620, w: 800, h: 420 },
    { kind: "lampPost", x: 4000, y: -700, w: 40, h: 500 },
    { kind: "sneeze", x: 5600, y: -330, w: 1400, h: 150 },
    { kind: "slot", x: 8150, y: -860, w: 260, h: 320 },
  ],
  carts: [],
  lights: [
    { x: 1680, y: -720, radius: 600, intensity: 0.3 },
    { x: 4000, y: -720, radius: 600, intensity: 0.3 },
    { x: 6300, y: -760, radius: 900, intensity: 0.45 },
    { x: 8800, y: -1100, radius: 900, intensity: 0.45 },
    { x: 10100, y: -1100, radius: 900, intensity: 0.45 },
    { x: 13000, y: -1100, radius: 900, intensity: 0.4 },
    { x: 15200, y: -1500, radius: 900, intensity: 0.45 },
  ],
  camera: {
    zones: [
      { x0: 7900, x1: 10800, zoom: 0.88 },
      { x0: 11800, x1: 16800, zoom: 0.88 },
    ],
  },
  rewards: { count: Math.ceil(16400 / 544), bucees: 3, nuts: 7 },
  routes: [
    { id: "floor", x0: 8300, x1: 10400, y0: -100, y1: 0 },
    { id: "deck", x0: 8300, x1: 10400, y0: -600, y1: -560 },
  ],
  music: "day",
  hints: { early: 1500 },
  // The cast (R3 §3.2).
  cast: [
    { id: "student-bench-1", person: "student-1", x: 1950, y: -300, sit: true, recolor: "#c9a227", size: 1.03 },
    { id: "student-bench-2", person: "student-2", x: 3550, y: -300, sit: true },
    { id: "prof-quad", person: "prof-1", x: 3950, y: -200, x0: 3300, x1: 4150 },
    { id: "lunch-line", person: "lunch-1", x: 5400, y: 0, x0: 5200, x1: 6900 },
    { id: "student-deck-1", person: "student-1", x: 8700, y: -520 },
    { id: "student-deck-2", person: "student-2", x: 9500, y: -520, recolor: "#2a8c8a", size: 1.02 },
    { id: "office-commons", person: "office-1", x: 9400, y: 0, x0: 8500, x1: 10300, recolor: "#c8d8b0" },
    { id: "lunch-salad", person: "lunch-1", x: 10050, y: 0, x0: 9600, x1: 10400, recolor: "#9b2335" },
    { id: "student-steps-1", person: "student-2", x: 12850, y: -300, recolor: "#b5532a" },
    { id: "prof-steps", person: "prof-1", x: 13300, y: -473, x0: 12520, x1: 13520, recolor: "#5d6066" },
    { id: "student-steps-2", person: "student-1", x: 13850, y: -600, recolor: "#8a3b8f", size: 0.98 },
    { id: "student-terrace", person: "student-2", x: 14800, y: -900 },
  ],
  backdrop: {
    walls: ["campus-far-1", "campus-far-2", "campus-far-3"],
    mid: [
      { name: "campus-mid-1", x: 1000 },
      { name: "campus-mid-2", x: 4400 },
      { name: "campus-mid-3", x: 7000 },
      { name: "campus-mid-4", x: 9000 },
      { name: "campus-mid-5", x: 10800 },
      { name: "campus-mid-6", x: 11600 },
    ],
    fore: [
      { name: "campus-fore-1", x: 3000 },
      { name: "campus-fore-2", x: 12400 },
    ],
  },
};
