import type { Level, LevelFloor, LevelPlatform } from "../level";

/** Floors stand this far apart. */
const EVERY = 540;
/** A floor's landing line, floor 1 on the ground. */
export const floorY = (k: number): number => -EVERY * (k - 1);
const FLOORS = 14;
/** Where the walls stand, and where a flight's foot meets its landing near them. */
const WALL = { left: -400, right: 2800 } as const;
const FOOT = { left: -200, right: 2600 } as const;
/** A flight's run: 540 up over 1000 along, 28 degrees. */
const RUN = 1000;
/** The floors' laundry chutes: a gap in the landing, over the floor below (the two sides' landings overlap from 800 to 1600). */
const CHUTES = [
  { x: 1200, y: floorY(5), w: 220 },
  { x: 1300, y: floorY(9), w: 220 },
  { x: 1300, y: floorY(13), w: 220 },
];

/**
 * An odd floor's landing runs from its stairwell (800) to the right wall, an even floor's from the left wall to its own
 * (1600); floor 1 is the whole ground. Chute floors are split round their gap.
 */
function landings(k: number): LevelFloor[] {
  const y = floorY(k);
  const x0 = k === 1 || k % 2 === 0 ? WALL.left : FOOT.left + RUN;
  const x1 = k === 1 || k % 2 === 1 ? WALL.right : FOOT.right - RUN;
  const c = CHUTES.find((g) => g.y === y);
  if (!c) return [{ x0, x1, y0: y, y1: y, kind: "carpet" }];
  return [
    { x0, x1: c.x, y0: y, y1: y, kind: "carpet" },
    { x0: c.x + c.w, x1, y0: y, y1: y, kind: "carpet" },
  ];
}

/** The flight from floor k up to k+1: odd floors' rise left from the foot by the right wall, even floors' rise right from the foot by the left wall. */
function flight(k: number): LevelFloor {
  const low = floorY(k);
  const high = floorY(k + 1);
  return k % 2 === 1
    ? { x0: FOOT.right - RUN, x1: FOOT.right, y0: high, y1: low, kind: "stairs" }
    : { x0: FOOT.left, x1: FOOT.left + RUN, y0: low, y1: high, kind: "stairs" };
}

const nums = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** The atrium's balconies from floor 8 up: midway between two floors, over the overlap, a hop from each (floor 11's is hers: no way round the supervisor). */
const balconies: LevelPlatform[] = [8, 9, 10, 12, 13].map((k) => ({ x0: 900, x1: 1200, y: floorY(k) - 270, kind: "balcony" }));
/** The vending nooks: a shelf a hop up, a bag of nuts on it by the seeded rule. */
const nooks: LevelPlatform[] = [
  { x0: 100, x1: 300, y: floorY(2) - 160, kind: "vending" },
  { x0: 100, x1: 300, y: floorY(6) - 160, kind: "vending" },
  { x0: 2100, x1: 2300, y: floorY(11) - 160, kind: "vending" },
];

/**
 * 2-2, the tower (story spec §8.2): a tall level, fourteen floors of a hotel stairwell, 7,800 px high and 2,400 wide inside
 * its walls. He crosses each landing to the wall, turns, and climbs the flight rising back over it to the next landing, so
 * every landing is walked: its carts, its wet floors and its chutes are in the way. A chute drops him one floor; the
 * balconies from floor 8 are a hopped way up. The drop below floor 1 is the only pit.
 */
export const TOWER: Level = {
  id: "tower",
  name: "The tower",
  world: "2-2",
  length: 2400,
  spawn: { x: 350, y: 0 },
  time: 420,
  music: "lobby",
  card: "The elevator stops at every floor. I don't.",
  floors: { every: EVERY },
  floor: [...nums(1, FLOORS).flatMap(landings), ...nums(1, FLOORS - 1).map(flight)],
  platforms: [...balconies, ...nooks],
  solids: [],
  passes: [],
  bounds: { x: WALL.left, y: -8200, w: WALL.right - WALL.left, h: 8800 },
  crates: [
    // The ice machines by the walls (a can each); the fire hose cabinets as ! crates.
    { id: "ice-3", kind: "can", x: 2700, y: floorY(3), look: "ice" },
    { id: "ice-7", kind: "can", x: 2700, y: floorY(7), look: "ice" },
    { id: "ice-11", kind: "can", x: 2700, y: floorY(11), look: "ice" },
    { id: "hose-4", kind: "pepper", x: -310, y: floorY(4), look: "cabinet" },
    { id: "hose-12", kind: "pepper", x: -310, y: floorY(12), look: "cabinet" },
  ],
  doors: [{ id: "out", kind: "exit", x: 100, y: floorY(14), label: "FLOOR 14" }],
  checkpoints: [
    { id: "floor-5", x: 650 + 400, y: floorY(5) },
    { id: "floor-10", x: 1000, y: floorY(10) },
  ],
  signs: [
    { x: 700, y: -420, label: "SERVICE STAIR", note: "Guests use the elevator." },
    { x: 700, y: floorY(6) - 420, label: "FLOOR 6" },
    { x: 700, y: floorY(12) - 420, label: "FLOOR 12", note: "Housekeeping" },
  ],
  furniture: [],
  carts: [],
  lights: nums(1, FLOORS).map((k) => ({ x: k % 2 === 1 ? 1800 : 600, y: floorY(k) - 420, radius: 700, intensity: 0.45 })),
  camera: { zones: [{ x0: WALL.left, x1: WALL.right, zoom: 0.9, follow: "up" }] },
  rewards: { count: 14, bucees: 1, nuts: 3 },
  routes: [{ id: "landings", x0: WALL.left, x1: WALL.right, y0: floorY(FLOORS), y1: 0 }],
  chutes: CHUTES,
  slips: [
    { x: 500, y: floorY(2) },
    { x: 700, y: floorY(6) },
    { x: 1800, y: floorY(11) },
  ],
  movers: [
    { id: "cart-2", x: 700, y: floorY(2), x0: -300, x1: 1500, w: 180, h: 120, speed: 140 },
    { id: "cart-4", x: 400, y: floorY(4), x0: -300, x1: 1500, w: 180, h: 120, speed: 140 },
    { id: "cart-7", x: 1700, y: floorY(7), x0: 900, x1: 2500, w: 180, h: 120, speed: 140 },
    { id: "cart-9", x: 1900, y: floorY(9), x0: 1620, x1: 2500, w: 180, h: 120, speed: 140 },
    { id: "cart-11", x: 1400, y: floorY(11), x0: 900, x1: 2000, w: 180, h: 120, speed: 140 },
  ],
  hints: { early: 900 },
  thoughts: [
    { x: 400, y: 0, text: "Fourteen floors. I've done worse before breakfast." },
    { x: 1000, y: floorY(4), text: "Reserved. For TITANIUM." },
    { x: 700, y: floorY(6), text: "Housekeeping. HOUSEKEEPING." },
    { x: 1000, y: floorY(10), text: "This is a fire code violation." },
  ],
  cast: [],
};
