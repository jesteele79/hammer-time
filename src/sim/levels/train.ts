import type { CastPerson, CastSpawn, Level, LevelPlatform } from "../level";

/** Where a coach of the 14:02 begins, in the sim's px: coach 18 at the platform's end, coach 1 last, 768 apart. */
export const coachX = (coach: number): number => 4000 + (18 - coach) * 768;

const COACHES = Array.from({ length: 18 }, (_, k) => 18 - k);
/** The bistro car, the family car, the bike car and the quiet car, by number. */
const BISTRO = 10;
const FAMILY = 7;
const BIKES = 4;
const QUIET = 14;
const CEILING = -404;

/** A coach's rack: ending short of the door frames, or he could not step off it. */
const racks: LevelPlatform[] = COACHES.filter((n) => n !== BISTRO).map((n) => ({ x0: coachX(n) + 110, x1: coachX(n) + 620, y: -170, kind: "rack" }));
const seatBacks: LevelPlatform[] = COACHES.filter((n) => n !== BISTRO && n !== FAMILY && n !== BIKES).flatMap((n) => [0, 1, 2, 3].map((i) => ({ x0: coachX(n) + 120 + 150 * i, x1: coachX(n) + 210 + 150 * i, y: -110, kind: "seat" as const })));
/** Who sits and stands up into him. */
const STANDING: [number, CastPerson, string?][] = [
  [17, "office-1"],
  [15, "prof-1"],
  [12, "office-2", "#5b6b84"],
  [9, "cook-1", "#4e5f6e"],
  [6, "lunch-1"],
  [5, "busser-1", "#6b4f3a"],
];
const standing: CastSpawn[] = STANDING.map(([n, person, recolor]) => ({ id: `stand-${n}`, person, x: coachX(n) + 300, y: 0, sit: true, trick: "stand", recolor }));
/** The seams between coaches: the bogies under them. */
const seams: number[] = COACHES.filter((n) => n < 18).map(coachX);

/**
 * 3-3, the 14:02 (story spec §9.3): Gare de Lyon at a dead run on its own two-minute clock, the barrier and the crowd and a
 * board with no platform on it; then eighteen coaches, the level's clock starting as he boards: the racks a crouched route
 * under the ceiling, seat backs to stand on, travelers who stand up into him, the quiet car, the bistro car's punch clock and
 * fridge, the family car's kids and stroller, the bike car; and first class, whose seat at coach 1 ends the level.
 */
export const TRAIN: Level = {
  id: "train",
  name: "The 14:02",
  world: "3-3",
  length: 17900,
  spawn: { x: 150, y: 0 },
  time: 420,
  music: "train",
  card: "13:41. Gare de Lyon. Voie 23 is not on the board.",
  stretch: { x1: 4000, time: 120, card: "The train left at 14:02. It always does.", bonus: 50 },
  board: { x: 1200, y: -700, lightAt: 60 },
  hints: { early: 0 },
  floor: [
    { x0: 0, x1: 4000, y0: 0, y1: 0, kind: "stone" },
    { x0: 4000, x1: 17900, y0: 0, y1: 0, kind: "carpet" },
  ],
  platforms: [
    ...racks,
    ...seatBacks,
    { x0: coachX(BISTRO) + 200, x1: coachX(BISTRO) + 500, y: -120, kind: "counter" },
    { x0: coachX(BIKES) + 150, x1: coachX(BIKES) + 290, y: -200, kind: "bike" },
    { x0: coachX(BIKES) + 400, x1: coachX(BIKES) + 540, y: -200, kind: "bike" },
  ],
  solids: [
    { x: -40, y: -1400, w: 40, h: 1400 },
    { x: 17900, y: -1400, w: 40, h: 1400 },
    // The coaches' ceiling and, at every seam, the lintel of the connecting door.
    { x: 4000, y: CEILING, w: 13824, h: 20 },
    ...seams.map((x) => ({ x: x - 12, y: CEILING, w: 24, h: -CEILING - 300 })),
  ],
  // The ticket barrier: his head stops at it; a slide goes under its paddles.
  passes: [{ x: 1800, y: -1000, w: 150, h: 780, kind: "barrier" }],
  bounds: { x: -400, y: -1400, w: 18600, h: 2000 },
  crates: [{ id: "fridge", kind: "can", x: coachX(BISTRO) + 600, y: -140, look: "fridge" }],
  doors: [],
  signs: [{ x: coachX(QUIET) + 384, y: -300, label: "Shh" }],
  movers: [
    { id: "stroller", x: coachX(FAMILY) + 100, y: 0, x0: coachX(FAMILY) + 40, x1: coachX(FAMILY) + 720, w: 120, h: 110, speed: 160 },
    { id: "bike-swing", x: coachX(BIKES) + 600, y: -200, x0: coachX(BIKES) + 540, x1: coachX(BIKES) + 660, w: 140, h: 30, speed: 160 },
  ],
  coaches: { from: 4000, every: 768, count: 18 },
  rooms: [
    { id: "hall", x0: 0, x1: 2000, wall: "station-1" },
    { id: "platform", x0: 2000, x1: 4000, wall: "station-2" },
    ...COACHES.map((n) => ({ id: `coach-${n}`, x0: coachX(n), x1: coachX(n) + 768, wall: n === BISTRO ? "train-far-2" : n <= 3 ? "train-far-3" : "train-far-1" })),
  ],
  backdrop: { walls: ["station-1", "station-2", "train-far-1", "train-far-2", "train-far-3"], mid: [], fore: [], rooms: true, far: { pan: 1, scale: 1 } },
  quiet: { x0: coachX(QUIET), x1: coachX(QUIET) + 768 },
  tunnel: { x: coachX(12) },
  shakes: seams,
  seat: { x: coachX(1) + 600 },
  boss: { kind: "conductor", x: coachX(13), arena: [coachX(14), coachX(13) + 300], doors: [coachX(13), coachX(7), coachX(2)] },
  furniture: [],
  carts: [],
  lights: [],
  camera: { zones: [] },
  rewards: { count: 8, bucees: 1, nuts: 2 },
  routes: [
    { id: "aisle", x0: 4100, x1: 17000, y0: -80, y1: 0 },
    { id: "racks", x0: 4100, x1: 17000, y0: -300, y1: -100 },
  ],
  checkpoints: [
    { id: "board", x: 4100, y: 0, auto: true },
    { id: "bistro", x: coachX(BISTRO) + 100, y: 0 },
  ],
  thoughts: [
    { x: 3600, text: "The train leaves when I'm ON it." },
    { x: 4050, text: "I don't ride second." },
    { x: coachX(QUIET) + 100, text: "Shh yourself." },
  ],
  cast: [
    { id: "crowd-1", person: "office-1", x: 700, y: 0, x0: 600, x1: 1200, trick: "shove" },
    { id: "crowd-2", person: "office-2", x: 1100, y: 0, x0: 800, x1: 1500, trick: "shove" },
    { id: "crowd-3", person: "nurse", x: 1400, y: 0, x0: 1100, x1: 1700, trick: "shove" },
    { id: "crowd-4", person: "lunch-1", x: 2200, y: 0, x0: 2050, x1: 2600, trick: "shove" },
    { id: "crowd-5", person: "prof-1", x: 2500, y: 0, x0: 2300, x1: 2900, trick: "shove" },
    { id: "crowd-6", person: "cook-1", x: 2900, y: 0, x0: 2600, x1: 3200, trick: "shove" },
    { id: "crowd-7", person: "busser-1", x: 3200, y: 0, x0: 2900, x1: 3500, trick: "shove" },
    { id: "crowd-8", person: "server-2", x: 3400, y: 0, x0: 3100, x1: 3600, trick: "shove" },
    ...standing,
    { id: "quiet-1", person: "office-2", x: coachX(QUIET) + 220, y: 0, sit: true, trick: "seated", lx: 0 },
    { id: "quiet-2", person: "prof-1", x: coachX(QUIET) + 520, y: 0, sit: true, trick: "seated", lx: 0 },
    { id: "kid-1", person: "kid-1", size: 0.6, recolor: "#c0392b", x: coachX(FAMILY) + 200, y: 0, x0: coachX(FAMILY) + 60, x1: coachX(FAMILY) + 700, trick: "rush" },
    { id: "kid-2", person: "kid-1", size: 0.6, recolor: "#2980b9", x: coachX(FAMILY) + 500, y: 0, x0: coachX(FAMILY) + 60, x1: coachX(FAMILY) + 700, trick: "rush" },
  ],
};
