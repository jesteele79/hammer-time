import type { Level } from "../level";

/**
 * 3-5, the Basel office's skills lab (story spec §10.2, the 2026-11-06 note): left to right in scrubs, from the entrance and
 * the administrator's desk down the sterile corridor and the ward to the training room's double doors. Nurse stations as
 * counters with sharps bins, supply racks as shelves, the gurneys and IV poles rolling, the code blue stretch, the autoclave's
 * steam, two vending machines, the break room's stash door. The gurney bays are drawn frames the gurneys roll in.
 */
export const LAB: Level = {
  id: "lab",
  name: "The Basel office",
  world: "3-5",
  length: 14000,
  spawn: { x: 150, y: 0 },
  time: 420,
  music: "lab",
  costume: "scrubs",
  card: "Skills lab · Training day.",
  floor: [{ x0: 0, x1: 14000, y0: 0, y1: 0, kind: "tile" }],
  platforms: [
    ...[1800, 4200, 6000, 8600, 10400, 12400].map((x0) => ({ x0, x1: x0 + 500, y: -120, kind: "counter" as const })),
    ...[3200, 5400, 9800, 11600].map((x0) => ({ x0, x1: x0 + 300, y: -260, kind: "shelf" as const })),
  ],
  solids: [
    { x: -40, y: -1400, w: 40, h: 1400 },
    { x: 14000, y: -1400, w: 60, h: 1400 },
  ],
  passes: [],
  bounds: { x: -400, y: -1400, w: 14800, h: 2000 },
  movers: [
    { id: "gurney-1", x: 2600, y: 0, x0: 2200, x1: 3400, w: 260, h: 150, speed: 220 },
    // Clear of the autoclave's steam, which the second bay would otherwise roll its gurney through.
    { id: "gurney-2", x: 7200, y: 0, x0: 6800, x1: 7800, w: 260, h: 150, speed: 220 },
    { id: "gurney-3", x: 9400, y: 0, x0: 9200, x1: 9600, w: 260, h: 150, speed: 220 },
    { id: "iv-1", x: 4000, y: 0, x0: 3800, x1: 4100, w: 70, h: 60, speed: 40 },
    { id: "iv-2", x: 8000, y: 0, x0: 7900, x1: 8100, w: 70, h: 60, speed: 40 },
    { id: "iv-3", x: 12100, y: 0, x0: 12000, x1: 12200, w: 70, h: 60, speed: 40 },
  ],
  crates: [
    // Out of the first gurney's bay, so it never rolls through one.
    { id: "vend-1", kind: "can", x: 1500, y: 0, look: "vending", yield: 3 },
    { id: "vend-2", kind: "can", x: 11200, y: 0, look: "vending", yield: 3 },
  ],
  sharps: [
    { x: 4500, y: -210, w: 90, h: 90 },
    { x: 8900, y: -210, w: 90, h: 90 },
    { x: 12700, y: -210, w: 90, h: 90 },
  ],
  codeBlue: { x0: 7800, x1: 9400 },
  heat: [{ x0: 6400, x1: 6700, y: 0, rate: 20, kind: "steam", cycle: { on: 2, off: 3 } }],
  checkpoints: [
    { id: "sterile", x: 4800, y: 0 },
    { id: "ward", x: 10200, y: 0 },
  ],
  doors: [
    { id: "break", kind: "stash", x: 9000, y: 0, label: "BREAK ROOM" },
    { id: "training", kind: "exit", x: 13700, y: 0, label: "TRAINING ROOM" },
  ],
  signs: [
    { x: 600, y: -300, label: "SKILLS LAB" },
    { x: 3600, y: -300, label: "STERILE CORRIDOR" },
    { x: 6200, y: -300, label: "OR 3" },
    { x: 8200, y: -300, label: "CODE BLUE" },
    { x: 9000, y: -300, label: "BREAK ROOM" },
  ],
  furniture: [],
  carts: [],
  lights: [],
  camera: { zones: [] },
  rewards: { count: 8, bucees: 1, nuts: 2 },
  routes: [{ id: "corridor", x0: 800, x1: 13200, y0: -80, y1: 0 }],
  thoughts: [
    { x: 700, text: "I'm here to train." },
    { x: 1500, text: "Grüezi yourself." },
    { x: 4000, text: "I don't need a badge. I'm the trainer." },
    { x: 7000, text: "In-service is at 7. Be early." },
    { x: 10500, text: "Scalpel. SCALPEL. Are you listening?" },
    { x: 12300, text: "I've trained surgeons better than your surgeons." },
  ],
  // Three walls painted straight: the entrance, the sterile corridor with the autoclave, the ward with the double doors.
  backdrop: {
    walls: ["lab-far-1", "lab-far-2", "lab-far-3"],
    layout: [
      { wall: "lab-far-1", x: -1536 },
      { wall: "lab-far-1", x: 0 },
      { wall: "lab-far-2", x: 1536 },
      { wall: "lab-far-2", x: 3072 },
      { wall: "lab-far-2", x: 4608 },
      { wall: "lab-far-3", x: 6144 },
      { wall: "lab-far-3", x: 7680 },
      { wall: "lab-far-2", x: 9216 },
      { wall: "lab-far-3", x: 10752 },
      { wall: "lab-far-3", x: 12288 },
      { wall: "lab-far-3", x: 13824 },
    ],
    mid: [],
    fore: [],
    far: { pan: 1, scale: 1 },
  },
  cast: [
    // The administrator at her desk under SKILLS LAB; she takes no part.
    { id: "admin", person: "admin", x: 500, y: 0, facing: 1, trick: "seated" },
    // Nurses with the sanitizer at their stations.
    ...[2000, 4400, 8700, 12600].map((x, k) => ({ id: `nurse-${k + 1}`, person: "nurse" as const, x, y: 0, x0: x - 300, x1: x + 300, trick: "spray" as const })),
    // Techs who square up and shove.
    ...[3300, 7300, 11000].map((x, k) => ({ id: `tech-${k + 1}`, person: "tech" as const, x, y: 0, x0: x - 300, x1: x + 300 })),
    // Residents in white coats throwing charts.
    ...[5000, 6800, 9900, 11700].map((x, k) => ({ id: `resident-${k + 1}`, person: "resident" as const, x, y: 0, x0: x - 250, x1: x + 250 })),
  ],
};
