import type { HeatZone } from "./hazards";
import type { QuestId } from "./quests/quest";
import type { CartLoad, FloorSegment, Pass, Platform, Point, Rect, Stage } from "./types";

export type { CartLoad };

export type PlatformKind =
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
  | "till";
export type FloorKind = "marble" | "tile" | "stairs" | "escalator" | "wood" | "quarry" | "concrete" | "ramp" | "truck" | "brick" | "terrazzo" | "stone" | "steps" | "belt" | "carpet";
export type LevelFloor = FloorSegment & { kind: FloorKind };
export type LevelPlatform = Platform & { kind: PlatformKind };
export type CrateKind = "pepper" | "can" | "case" | "bucees";
/** `x` is the crate's middle, `y` its bottom (world px, up is negative). */
export type CrateSpec = { id: string; kind: CrateKind; x: number; y: number };
export type DoorKind = "stash" | "return" | "exit" | "closed" | "quest";
/**
 * `closed` doors say what opens them; a `quest` door opens a side quest once a shift (the BUFFET's banquet, R4 §7); `x`
 * is the door's middle, `y` the floor in front of it; a `locked` exit is chained until the pig is down.
 */
export type DoorSpec = { id: string; kind: DoorKind; x: number; y: number; label: string; opens?: string; locked?: boolean; quest?: QuestId };
export type CheckpointSpec = { id: string; x: number; y: number };
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
  | "spotlight";
/** A low ceiling to slide under: the lobby's service corridor, or the kitchen's heat-lamp gantry. */
export type LevelPass = Pass & { kind?: "service" | "gantry" };
/** The kitchen's swinging door, and the spawn id of the server whose rush bangs it open. */
export type SwingDoorSpec = { id: string; x: number; y: number; server: string };
/** A venue's painted walls in walking order, and its standing pieces by name at the world x they stand beside (R3 §6). */
export type BackdropSpec = { walls: string[]; mid: { name: string; x: number }[]; fore: { name: string; x: number }[] };
/** The gift shop's fight: where the pig sleeps and the arena he is held in once it wakes (R3 §3.3, §5.1). */
export type BossSpec = { x: number; arena: [number, number] };
/** Drawn only: what he collides with is in the floors, platforms, solids and passes. */
export type Furniture = { kind: FurnitureKind; x: number; y: number; w: number; h: number };
export type CameraZone = { x0: number; x1: number; zoom: number };
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
  | "gate-agent";
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
};
export type CarriedKind = "can" | "nuts" | "bucees";
export type LevelLight = { x: number; y: number; radius: number; intensity: number };
/** A stretch the seeding stocks with one of each reward: anchors with x in [x0, x1] and y in [y0, y1]. */
export type RewardRoute = { id: string; x0: number; x1: number; y0: number; y1: number };

export type LevelId = "lobby" | "stash" | "restaurant" | "campus" | "arena";
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
  music: "day" | "cellar";
  /** The x before which the first hint teaches the snot and the ! crate. */
  hints?: { early: number };
  /** The lobby's people (R2b). */
  cast?: CastSpawn[];
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

const CLEAR = { door: 150, cart: 200, crate: 120, checkpoint: 120, belt: 150 } as const;

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
    level.floor.some((b) => !!b.belt && (Math.abs(x - b.x0) < CLEAR.belt || Math.abs(x - b.x1) < CLEAR.belt));
  for (const f of level.floor) {
    if (f.y0 !== f.y1 || f.belt) continue;
    for (let x = f.x0 + ANCHOR_STEP; x < f.x1 - ANCHOR_STEP / 2; x += ANCHOR_STEP) {
      const y = f.y0 - PICKUP_SIZE;
      if (x < level.spawn.x + 300 || x > level.length - 300 || blocked(x, y)) continue;
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
