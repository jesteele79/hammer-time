import type { Level } from "../level";

/**
 * 1-1, the hotel lobby (spec §8.3), in world px with the floor at 0 and up negative.
 * Act 1, the entrance and the front desk: the early pepper crate, the desk with its bell, the
 * time clock behind it, two sofas with can crates over them, a luggage cart and the BUFFET door.
 * Act 2, the elevator bank: an open shaft (the only pit), then a landing to hop onto, the grand
 * staircase at 30 degrees up to the mezzanine and an escalator down; or stay on the floor, past
 * the airport shuttle and the staff stash, under the balcony. Act 3, the conference wing: the
 * second clock, long tables, the projector screen, the service corridor and the CLOCK OUT door.
 * His jump tops out near 398 px, so the balcony (520) is out of reach from the floor and from the
 * landing (120): the stairs are the way up.
 */
export const LOBBY: Level = {
  id: "lobby",
  name: "Hotel lobby",
  world: "1-1",
  length: 16400,
  spawn: { x: 300, y: 0 },
  time: 420,
  floor: [
    { x0: -400, x1: 5900, y0: 0, y1: 0, kind: "marble" },
    { x0: 6230, x1: 16800, y0: 0, y1: 0, kind: "marble" },
    { x0: 6800, x1: 7493, y0: -120, y1: -520, kind: "stairs" },
    { x0: 10200, x1: 11100, y0: -520, y1: 0, belt: 200, kind: "escalator" },
  ],
  platforms: [
    { x0: 3000, x1: 3500, y: -110, kind: "sofa" },
    { x0: 3800, x1: 4300, y: -110, kind: "sofa" },
    { x0: 6560, x1: 6800, y: -120, kind: "landing" },
    { x0: 7493, x1: 10200, y: -520, kind: "balcony" },
    { x0: 12100, x1: 12900, y: -160, kind: "table" },
    { x0: 13300, x1: 14100, y: -160, kind: "table" },
  ],
  solids: [{ x: 1500, y: -180, w: 900, h: 180 }],
  passes: [{ x: 14800, y: -1000, w: 500, h: 780 }],
  bounds: { x: -400, y: -1600, w: 16800, h: 2200 },
  crates: [
    { id: "pepper-desk", kind: "pepper", x: 760, y: -435 },
    { id: "can-sofa-1", kind: "can", x: 3250, y: -545 },
    { id: "can-sofa-2", kind: "can", x: 4050, y: -545 },
    { id: "case-elevators", kind: "case", x: 5300, y: -435 },
    { id: "pepper-wing", kind: "pepper", x: 11400, y: -435 },
    { id: "case-corridor", kind: "case", x: 15500, y: -435 },
  ],
  doors: [
    { id: "buffet", kind: "quest", x: 4600, y: 0, label: "BUFFET", quest: "hungry" },
    { id: "mclub", kind: "closed", x: 8800, y: -520, label: "M CLUB", opens: "Platinum members only" },
    { id: "shuttle", kind: "closed", x: 9100, y: 0, label: "AIRPORT SHUTTLE", opens: "Opens with Fare Darts" },
    { id: "staff", kind: "stash", x: 9700, y: 0, label: "STAFF ONLY" },
    { id: "out", kind: "exit", x: 15950, y: 0, label: "CLOCK OUT" },
  ],
  checkpoints: [
    { id: "desk", x: 2650, y: 0 },
    { id: "wing", x: 11700, y: 0 },
  ],
  signs: [
    { x: 200, y: -700, label: "LOBBY", note: "! supplies · jump + hammer" },
    { x: 1420, y: -700, label: "FRONT DESK", note: "Jump the desk" },
    { x: 5560, y: -700, label: "ELEVATORS", note: "Mind the gap" },
    { x: 6420, y: -700, label: "MEZZANINE", note: "Up the stairs, or stay on the floor" },
    { x: 11850, y: -700, label: "CONFERENCE WING", note: "Long tables, short tempers" },
    { x: 14700, y: -700, label: "SERVICE CORRIDOR", note: "Run + ↓ to slide" },
  ],
  furniture: [
    { kind: "desk", x: 1500, y: -180, w: 900, h: 180 },
    { kind: "bell", x: 1920, y: -240, w: 60, h: 60 },
    { kind: "elevators", x: 5450, y: -520, w: 1100, h: 520 },
    { kind: "shaft", x: 5900, y: -520, w: 330, h: 520 },
    { kind: "porte", x: 8900, y: -440, w: 400, h: 440 },
    { kind: "chairs", x: 12100, y: -330, w: 800, h: 330 },
    { kind: "chairs", x: 13300, y: -330, w: 800, h: 330 },
    { kind: "screen", x: 14250, y: -520, w: 400, h: 520 },
    { kind: "corridor", x: 14800, y: -500, w: 500, h: 500 },
  ],
  // The first bellhop's cart at the entrance, the spare between the sofas, the floor route's.
  carts: [1250, 3650, 7900],
  lights: [
    { x: 1300, y: -640, radius: 900, intensity: 0.5 },
    { x: 3900, y: -640, radius: 900, intensity: 0.5 },
    { x: 6500, y: -640, radius: 900, intensity: 0.45 },
    { x: 8000, y: -1100, radius: 800, intensity: 0.45 },
    { x: 9600, y: -1100, radius: 800, intensity: 0.45 },
    { x: 11700, y: -640, radius: 900, intensity: 0.5 },
    { x: 14300, y: -640, radius: 900, intensity: 0.5 },
  ],
  camera: { zones: [{ x0: 6300, x1: 10900, zoom: 0.88 }] },
  rewards: { count: Math.ceil(16400 / 544), bucees: 3, nuts: 7 },
  routes: [
    { id: "floor", x0: 6560, x1: 11100, y0: -100, y1: 0 },
    { id: "balcony", x0: 7493, x1: 10200, y0: -600, y1: -560 },
  ],
  music: "day",
  hints: { early: 1500 },
  // The lobby's three walls in walking order; against them a palm by the doors, a floor lamp by the desk, a lamp on its
  // table under the mezzanine, the lilies in the shuttle bay and the rope line at the conference wing; in front, a potted
  // tree past the desk (clear of its punch clock) and a column in the wing. The inked corridor photo and the drawn
  // columns and palms are its fallback; its painted palm takes the place of the drawn potted palms it once stood.
  backdrop: {
    walls: ["lobby-far-1", "lobby-far-2", "lobby-far-3"],
    mid: [
      { name: "lobby-mid-1", x: 700 },
      { name: "lobby-mid-2", x: 3300 },
      { name: "lobby-mid-3", x: 7600 },
      { name: "lobby-mid-4", x: 10900 },
      { name: "lobby-mid-5", x: 12900 },
    ],
    fore: [
      { name: "lobby-fore-1", x: 2950 },
      { name: "lobby-fore-2", x: 11300 },
    ],
  },
  // The cast (the R2b design §5): the bellhops behind their carts, servers on patrols, the office workers
  // by the elevators and behind the screen, the students at the rail and on a table.
  cast: [
    { id: "bellhop-desk", person: "bellhop-1", x: 1400, y: 0, cart: 1250 },
    { id: "server-buffet", person: "server-1", x: 4900, y: 0, x0: 4400, x1: 5200 },
    { id: "office-elevators", person: "office-1", x: 5550, y: 0, x0: 5000, x1: 5850 },
    { id: "bellhop-floor", person: "bellhop-2", x: 8050, y: 0, cart: 7900 },
    { id: "server-staff", person: "server-2", x: 9300, y: 0, x0: 8600, x1: 9600 },
    { id: "student-rail-1", person: "student-1", x: 7950, y: -520 },
    { id: "student-rail-2", person: "student-2", x: 8500, y: -520 },
    { id: "student-rail-3", person: "student-1", x: 9650, y: -520, recolor: "#c9a227", size: 1.03 },
    { id: "server-tables", person: "server-1", x: 13100, y: 0, x0: 12900, x1: 13300, recolor: "#7a1f2b", size: 0.97 },
    { id: "student-table", person: "student-2", x: 13900, y: -160, sit: true, recolor: "#2a8c8a", size: 1.02 },
    { id: "office-screen", person: "office-2", x: 14450, y: 0, hide: true },
  ],
};
