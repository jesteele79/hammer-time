import type { SongId } from "../game/audio";
import type { Costume } from "../art/registry";
import type { HeatZone } from "./hazards";
import type { QuestId } from "./quests/quest";
import type { MoverSpec } from "./movers";
import type { PickupKind } from "./rewards";
import type { CartLoad, FloorSegment, HallSpec, Pass, Platform, Point, Rect, Stage } from "./types";

export type { CartLoad };

export type PlatformKind =
  | "bed"
  | "minibar"
  | "rail"
  | "counter"
  | "sofa"
  | "landing"
  | "balcony"
  | "table"
  | "shelf"
  | "booth"
  | "host"
  | "pass"
  | "steel"
  | "flattop"
  | "rack"
  | "crates"
  | "dumpster"
  | "bench"
  | "fountain"
  | "tier"
  | "serving"
  | "tray"
  | "deck"
  | "ledge"
  | "plush"
  | "till"
  | "vending"
  | "sash"
  | "chair"
  | "awning"
  | "seat"
  | "bike"
  | "barrier"
  | "bleacher"
  | "tent";
export type FloorKind = "marble" | "tile" | "stairs" | "escalator" | "wood" | "quarry" | "concrete" | "ramp" | "truck" | "brick" | "terrazzo" | "stone" | "steps" | "belt" | "carpet";
export type LevelFloor = FloorSegment & { kind: FloorKind };
/** `tip`: stood on this long, it tips him off (the window of Paris's closet). */
export type LevelPlatform = Platform & { kind: PlatformKind; bounce?: number; tip?: number };
export type CrateKind = "pepper" | "can" | "case" | "bucees";
/** `x` is the crate's middle, `y` its bottom (world px, up is negative). */
/** `yield`: the cans a bonk on a can crate pops (3-5's vending machines pay three). */
export type CrateSpec = { id: string; kind: CrateKind; x: number; y: number; look?: "ice" | "cabinet" | "bin" | "fridge" | "vending"; yield?: number };
export type DoorKind = "stash" | "return" | "exit" | "closed" | "quest" | "gate";
/**
 * `closed` doors say what opens them; a `quest` door opens a side quest once a shift (the BUFFET's banquet, R4 §7); a
 * `gate` is walked into like an exit and opens Fare Darts as the level's set piece, its tally ending the level (spec
 * §6.3); `x` is the door's middle, `y` the floor in front of it; a `locked` exit is chained until the pig is down.
 */
export type DoorSpec = {
  id: string;
  kind: DoorKind;
  x: number;
  y: number;
  label: string;
  opens?: string;
  locked?: boolean;
  quest?: QuestId;
  /** The keycards it takes to open (story spec §8.1): below them it reads as closed, its `opens` on it. */
  tier?: number;
  /** An exit that opens on ↓ like a quest door, never by walking past it. */
  down?: boolean;
  /** A quest door whose tally ends the level, as a gate's does. */
  ends?: boolean;
  /** An exit shut until every errand of the level is done (3-4's office door). */
  errands?: boolean;
};
/** A pipe band's rank (story spec §10.1): it waits until he passes `from`, then marches left from `x` to `x1`. */
export type BandSpec = { id: string; from: number; x: number; x1: number; color: string };
/** A counter he stands at, still, for `ERRAND.hold` seconds: done once a run, its line his thought (story spec §10.1). */
export type ErrandSpec = { id: string; x: number; line: string };
/** A door with a tier opens at that many keycards; any other door has none to reach. */
export const tierMet = (d: Pick<DoorSpec, "tier">, keycards: number): boolean => !d.tier || keycards >= d.tier;
/** `auto`: set as he crosses a stretch's end, with no clock to punch and no bonus for it. */
export type CheckpointSpec = { id: string; x: number; y: number; auto?: boolean };
export type SignSpec = { x: number; y: number; label: string; note?: string };
export type FurnitureKind =
  | "desk"
  | "bell"
  | "elevators"
  | "shaft"
  | "planter"
  | "porte"
  | "screen"
  | "chairs"
  | "railing"
  | "corridor"
  | "cart"
  | "bar"
  | "lamps"
  | "freezer"
  | "truck"
  | "fountain"
  | "lampPost"
  | "sneeze"
  | "slot"
  | "spotlight"
  | "van"
  | "stanchion"
  | "xray"
  | "scanner"
  | "walkway"
  | "departures"
  | "seats"
  | "podium";
/** A low ceiling to slide under: the lobby's service corridor, the kitchen's heat-lamp gantry, or SAT's body scanner. */
export type LevelPass = Pass & { kind?: "service" | "gantry" | "scanner" | "barrier" };
/** The kitchen's swinging door, and the spawn id of the server whose rush bangs it open. */
export type SwingDoorSpec = { id: string; x: number; y: number; server: string };
/**
 * A venue's painted walls in walking order, and its standing pieces by name at the world x they stand beside (R3 §6).
 * `far` is for a short venue with wide walls: its own wall scale and far plane's pan, so the whole row is walked past.
 * A fore piece stands at the size it was painted unless it says otherwise.
 */
export type BackdropSpec = { walls: string[]; mid: { name: string; x: number }[]; fore: { name: string; x: number; scale?: number }[]; far?: { pan: number; scale: number }; stack?: "up"; rooms?: boolean; layout?: { wall: string; x: number; y?: number }[] };
/**
 * A level's boss: the gift shop's pig (where it sleeps and the arena he is held in once it wakes, R3 §3.3, §5.1), the
 * tower's supervisor (where she stands, her flight's top and foot, `y` her landing).
 */
export type BossSpec = { kind: "pig" | "supervisor" | "titanium" | "purser" | "conductor" | "major"; x: number; arena: [number, number]; y?: number; room?: number; doors?: number[] };
/** Drawn only: what he collides with is in the floors, platforms, solids and passes. */
export type Furniture = { kind: FurnitureKind; x: number; y: number; w: number; h: number };
/** `follow: "up"`: a tall level's climb: no look-ahead, the floor line kept as he rises. */
export type CameraZone = { x0: number; x1: number; zoom: number; follow?: "up" };
export type CastPerson =
  | "bellhop-1"
  | "bellhop-2"
  | "server-1"
  | "server-2"
  | "office-1"
  | "office-2"
  | "student-1"
  | "student-2"
  | "cook-1"
  | "busser-1"
  | "lunch-1"
  | "prof-1"
  | "nurse"
  | "gate-agent"
  | "skycap-1"
  | "tsa-1"
  | "bartender-1"
  | "guard-1"
  | "titanium"
  | "housekeeper-1"
  | "purser"
  | "attendant-1"
  | "concierge"
  | "garcon"
  | "parisian-1"
  | "kid-1"
  | "conductor"
  | "piper"
  | "drummer"
  | "drill"
  | "major"
  | "tech"
  | "resident"
  | "admin";
/**
 * Who stands where. `y` is the floor or platform they stand on; `x0, x1` a patrol; `cart` a bellhop's cart (its x in
 * `carts`); `hide` waits behind the screen; `sit` sits on a table; `recolor` a uniform hue (R2b-2).
 */
export type CastSpawn = {
  id: string;
  person: CastPerson;
  x: number;
  y: number;
  facing?: 1 | -1;
  x0?: number;
  x1?: number;
  cart?: number;
  hide?: boolean;
  sit?: boolean;
  recolor?: string;
  /** Drawn this much taller or shorter than the painting: a recolored repeat, within ±4 percent (R2b §5). */
  size?: number;
  /** A busser's cart's load. */
  load?: CartLoad;
  /** What they carry and drop when knocked out for good: the floor road's prize is a fight (owner, 2026-10-18). */
  carry?: CarriedKind;
  /** Meters across a hall. */
  lx?: number;
  /** The night crew's tricks (story spec §8.1): a server's ice water, an office worker's reply-all, a guest who only wanders. */
  trick?: CastTrick;
};
/** `spray`: a nurse who never marches and sprays sanitizer at his feet within reach (3-5); `cheer`: the crowd behind a barrier, never solid and never noticing him, bonked once with a "Prost!"; `queue`: stands in his lane and says nothing until bonked; `seated`: in a seat of the cabin, or behind a desk, takes no part; `tray`: walks its pass, knocking him if he is in the way, and never looks up; `shove`: a traveler in a hurry who shoves him along, no pip; `stand`: seated until he is near, then up into him; `rush`: a kid who runs at him and shoves him along. */
export type CastTrick = "water" | "replyAll" | "wander" | "queue" | "seated" | "tray" | "shove" | "stand" | "rush" | "cheer" | "spray";
export type CarriedKind = "can" | "nuts" | "bucees" | "keycard";
export type LevelLight = { x: number; y: number; radius: number; intensity: number };
/** The moves a lesson teaches: each is learned the first time he does it (story spec §6.2). */
export type Lesson = "jump" | "run" | "slide" | "swing" | "snot" | "wipe";
/** A stretch where the hint teaches a move until he has done it. */
export type LessonSpec = { x0: number; x1: number; move: Lesson; text: string };
/** His thought at a mark, once a layout of the level, as he walks past it. */
export type ThoughtSpec = { x: number; text: string; y?: number };
/** A stretch the seeding stocks with one of each reward: anchors with x in [x0, x1] and y in [y0, y1]. */
export type RewardRoute = { id: string; x0: number; x1: number; y0: number; y1: number };

/** The levels that exist (the story's stops are `StoryId`, `src/sim/story.ts`); the stash is a level, not a stop. */
export type LevelId = "sat" | "lobby" | "stash" | "restaurant" | "campus" | "arena" | "lobby-night" | "tower" | "hallway" | "suite" | "flight" | "paris" | "train" | "basel" | "lab" | "replacement";
/** The cabin's numbers (story spec §9.1): the drinks cart, the turbulence, the reclined seats, the legs and the tablet by row. */
export type FlightSpec = {
  cart: { first: number; every: number; speed: number; shove: number };
  turbulence: { first: number; every: number; warn: number; fall: number; sign: number; bagEvery: number };
  recliners: { row: number; lane: 0 | 2 }[];
  legs: number[];
  tablet: { row: number };
};
export type Level = Omit<Stage, "floor" | "platforms" | "passes" | "heat"> & {
  passes: LevelPass[];
  /** Flat-tops and the walk-in freezer (R3 §3.1). */
  heat?: HeatZone[];
  swingDoors?: SwingDoorSpec[];
  /** The word over a pit when the cast goes down it. */
  pitWord?: string;
  /** The painted walls and standing pieces (R3 §6). */
  backdrop?: BackdropSpec;
  /** The pig's fight (the gift shop). */
  boss?: BossSpec;
  id: LevelId;
  name: string;
  world: string;
  length: number;
  spawn: Point;
  /** Seconds on the clock; 0 for no clock. */
  time: number;
  floor: LevelFloor[];
  platforms: LevelPlatform[];
  crates: CrateSpec[];
  doors: DoorSpec[];
  checkpoints: CheckpointSpec[];
  signs: SignSpec[];
  furniture: Furniture[];
  /** Luggage carts' x: they roll when bonked. */
  carts: number[];
  lights: LevelLight[];
  camera: { zones: CameraZone[] };
  /** How many pickups the seeding places, and how many of them are Buc-ee's and nuts (those only up on platforms). */
  rewards: { count: number; bucees: number; nuts: number };
  routes: RewardRoute[];
  /** Its song (story spec §13). */
  music: SongId;
  /** The x before which the first hint teaches the snot and the ! crate. */
  hints?: { early: number };
  /** The home screen's scene (story spec §5.1, plan decision 8): where he stands, and where the camera looks. */
  home?: { x: number; cx: number };
  /** The moves taught along the level, in order (SAT, the prologue). */
  lessons?: LessonSpec[];
  /** His thoughts at their marks. */
  thoughts?: ThoughtSpec[];
  /** The lobby's people (R2b). */
  cast?: CastSpawn[];
  /** Relit for the night (story spec §8.1): the cool ambient and the tighter, brighter lamps. */
  ambient?: "night";
  /** The line under the level's name on its card. */
  card?: string;
  /** Keycards here count toward his status (2-1, story spec §8.1): the tiers, their perks and the doors; elsewhere a keycard is points. */
  status?: boolean;
  /** Where the keycards stand: fixed spots, each once a run. */
  keycards?: Point[];
  /** A tall level (the tower): how far apart its floors stand; the HUD reads the floor he is on. */
  floors?: { every: number };
  /** A hall under the chase camera (story spec §8.3): how wide in meters, how near a wall he may stand, the 3D set it is drawn in, its lanes. */
  hall?: HallSpec;
  /** The cabin's cart, turbulence and rows (story spec §9.1). */
  flight?: FlightSpec;
  /** The gate the lecture opens (3-2): pressed within `reach` of `x`, the `wall` stops being a solid. */
  bonjour?: { x: number; reach: number; wall: Rect };
  /** Drawn only (3-2): the windows' televisions, and the pigeons, who scatter as he comes. */
  screens?: Point[];
  pigeons?: Point[];
  /** Fixed pickups, each once a run. */
  pickups?: { kind: PickupKind; x: number; y: number }[];
  /** How big the can is drawn here: Coke Zero in France. */
  canScale?: number;
  /** The level's own line on its tally. */
  tally?: string;
  /** A first stretch on its own clock (3-3's station): up to `x1` it runs in the level's clock's place; at zero its `card` and a life; what is left at `x1` pays `bonus` a second. */
  stretch?: { x1: number; time: number; card: string; bonus: number };
  /** The station's departure board: its platform is lit when the stretch's clock reaches `lightAt`. */
  board?: { x: number; y: number; lightAt: number };
  /** Reaching it with the boss down sits him and ends the level. */
  seat?: { x: number };
  /** What he thinks as he takes a pickup of this kind in this level: the first time each. */
  pickupThoughts?: Partial<Record<PickupKind, string>>;
  /** A level of rooms (the suite, the train): a painted wall each, the camera on the room the boss is in; `wall` the room's own, if not the list's by order. */
  rooms?: { id: string; x0: number; x1: number; wall?: string }[];
  /** The train's coaches, for the HUD's line and the low ceiling he tucks under. */
  coaches?: { from: number; every: number; count: number };
  /** The quiet car; the tunnel's mouth; the seams where the floor shakes. */
  quiet?: { x0: number; x1: number };
  tunnel?: { x: number };
  shakes?: number[];
  /** Housekeeping carts rolling across it from the door at `z` meters, on `side`: first at `at` s, then every `every`. */
  hallCarts?: { z: number; side: 1 | -1; every: number; at: number }[];
  /** Room doors that swing out across their half of it, on the same clock. */
  hallDoors?: { z: number; side: 1 | -1; at: number; every: number }[];
  /** The ice alcove's leak, in meters along it and across it: a wet floor where it is drawn. */
  puddle?: { z0: number; z1: number; lx0: number; lx1: number };
  /** The door the level ends at: how many swings of the mallet it takes, and what he thinks of each. */
  keyDoor?: { x: number; hits: number; fails: string[] };
  /** Carts that roll along a landing. */
  movers?: MoverSpec[];
  /** Gaps that drop him one floor for the slide's seconds: `x` their left end, `y` the landing. */
  chutes?: { x: number; y: number; w: number }[];
  /** Wet floors: a reversed step and half a second without control. */
  slips?: Point[];
  /** The counters he must stand at before the door that needs them opens (3-4). */
  errands?: ErrandSpec[];
  /** The parade (3-4): the pipe bands as marching walls with a hole, and the drum corps whose beat shakes the ground. */
  parade?: { bands: BandSpec[]; corps?: { x: number; reach: number } };
  /** The code blue stretch (3-5): everyone in it moves at 1.8 times while he is in it, and the lights pulse. */
  codeBlue?: { x0: number; x1: number };
  /** Sharps bins on the counters (3-5): brushing one is a hit. */
  sharps?: Rect[];
  /** What he wears here (story spec §10.2): scrubs on 3-5 and 3-6; the Affliction shirt when it names none. */
  costume?: Costume;
  /** Evening coming on over the clock: the light eases to night through its last third and the lanterns come on (3-4). */
  dusk?: boolean;
};

export const PICKUP_SIZE = 70;
/** One reward anchor per 218 px (the shipped two tiles), a pickup's middle 70 px above the surface. */
export const ANCHOR_STEP = 218;

/** The physics view of a level: its floors, platforms, solids and passes, plus any live crates. */
export function stageOf(level: Level, extraSolids: Rect[] = []): Stage {
  return {
    floor: level.floor,
    platforms: level.platforms,
    solids: extraSolids.length ? [...level.solids, ...extraSolids] : level.solids,
    passes: level.passes,
    bounds: level.bounds,
    heat: level.heat,
    hall: level.hall,
    low: level.coaches && { x0: level.coaches.from, x1: level.coaches.from + level.coaches.every * level.coaches.count },
  };
}

/**
 * The gaps in a level's floor: where a fall leaves the world (the lobby's shaft, the restaurant's truck well). A pit lies
 * between two flat floors at one height that no slope or other floor covers; the venue draws it dark.
 */
export function pitsOf(level: Pick<Level, "floor">): { x0: number; x1: number; y: number }[] {
  const flats = level.floor.filter((f) => f.y0 === f.y1).sort((a, b) => a.x0 - b.x0);
  const out: { x0: number; x1: number; y: number }[] = [];
  for (let i = 1; i < flats.length; i++) {
    const a = flats[i - 1];
    const b = flats[i];
    if (b.x0 - a.x1 < 40 || a.y0 !== b.y0) continue;
    const mid = (a.x1 + b.x0) / 2;
    if (level.floor.some((f) => f !== a && f !== b && mid >= f.x0 && mid <= f.x1)) continue;
    out.push({ x0: a.x1, x1: b.x0, y: a.y0 });
  }
  return out;
}

const CLEAR = { door: 150, cart: 200, crate: 120, checkpoint: 120, belt: 150, keycard: 100 } as const;

/**
 * Where pickups may go (the shipped rule, scaled): on level floor and on platforms, one anchor per
 * ANCHOR_STEP, never over a gap or a slope or a belt, inside a solid, in a doorway, on a cart, under
 * a crate, on a punch clock or on the steps at either end of a belt. A pickup's middle sits PICKUP_SIZE
 * above the surface. `raised` marks one up on a platform: a jump to reach.
 */
export type Anchor = Point & { raised: boolean };
export function rewardAnchors(level: Level): Anchor[] {
  const out: Anchor[] = [];
  const blocked = (x: number, y: number) =>
    level.solids.some((s) => x > s.x - 40 && x < s.x + s.w + 40 && y > s.y - PICKUP_SIZE) ||
    level.doors.some((d) => Math.abs(x - d.x) < CLEAR.door) ||
    level.carts.some((c) => Math.abs(x - c) < CLEAR.cart) ||
    level.crates.some((c) => Math.abs(x - c.x) < CLEAR.crate && y > c.y) ||
    level.checkpoints.some((k) => Math.abs(x - k.x) < CLEAR.checkpoint) ||
    (level.keycards ?? []).some((k) => Math.abs(x - k.x) < CLEAR.keycard && Math.abs(y - k.y) < CLEAR.keycard) ||
    level.floor.some((b) => !!b.belt && (Math.abs(x - b.x0) < CLEAR.belt || Math.abs(x - b.x1) < CLEAR.belt));
  for (const f of level.floor) {
    if (f.y0 !== f.y1 || f.belt) continue;
    for (let x = f.x0 + ANCHOR_STEP; x < f.x1 - ANCHOR_STEP / 2; x += ANCHOR_STEP) {
      const y = f.y0 - PICKUP_SIZE;
      // A tall level's rule of space at the start is its first floor's alone, and its walls are its ends.
      const nearStart = x < level.spawn.x + 300 && (!level.floors || f.y0 === level.spawn.y);
      if (nearStart || (!level.floors && x > level.length - 300) || blocked(x, y)) continue;
      out.push({ x, y, raised: false });
    }
  }
  for (const p of level.platforms)
    for (let x = p.x0 + ANCHOR_STEP / 2; x < p.x1 - 40; x += ANCHOR_STEP) {
      const y = p.y - PICKUP_SIZE;
      if (!blocked(x, y)) out.push({ x, y, raised: true });
    }
  return out;
}
