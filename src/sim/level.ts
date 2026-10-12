import type { FloorSegment, Platform, Point, Rect, Stage } from "./types";

export type PlatformKind = "counter" | "sofa" | "landing" | "balcony" | "table" | "shelf";
export type FloorKind = "marble" | "tile" | "stairs" | "escalator";
export type LevelFloor = FloorSegment & { kind: FloorKind };
export type LevelPlatform = Platform & { kind: PlatformKind };
export type CrateKind = "pepper" | "can" | "case" | "bucees";
/** `x` is the crate's middle, `y` its bottom (world px, up is negative). */
export type CrateSpec = { id: string; kind: CrateKind; x: number; y: number };
export type DoorKind = "stash" | "return" | "exit" | "closed";
/** `closed` doors say what opens them; `x` is the door's middle, `y` the floor in front of it. */
export type DoorSpec = { id: string; kind: DoorKind; x: number; y: number; label: string; opens?: string };
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
  | "cart";
/** Drawn only: what he collides with is in the floors, platforms, solids and passes. */
export type Furniture = { kind: FurnitureKind; x: number; y: number; w: number; h: number };
export type CameraZone = { x0: number; x1: number; zoom: number };
export type LevelLight = { x: number; y: number; radius: number; intensity: number };
/** A stretch the seeding stocks with one of each reward: anchors with x in [x0, x1] and y in [y0, y1]. */
export type RewardRoute = { id: string; x0: number; x1: number; y0: number; y1: number };

export type Level = Omit<Stage, "floor" | "platforms"> & {
  id: "lobby" | "stash";
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
  /** How many pickups the seeding places, and how many of them are Buc-ee's and nuts. */
  rewards: { count: number; bucees: number; nuts: number };
  routes: RewardRoute[];
  music: "day" | "cellar";
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
  };
}

const CLEAR = { door: 150, cart: 200, crate: 120, checkpoint: 120 } as const;

/**
 * Where pickups may go (the shipped rule, scaled): on level floor and on platforms, one anchor per
 * ANCHOR_STEP, never over a gap or a slope or a belt, inside a solid, in a doorway, on a cart, under
 * a crate or on a punch clock. A pickup's middle sits PICKUP_SIZE above the surface.
 */
export function rewardAnchors(level: Level): Point[] {
  const out: Point[] = [];
  const blocked = (x: number, y: number) =>
    level.solids.some((s) => x > s.x - 40 && x < s.x + s.w + 40 && y > s.y - PICKUP_SIZE) ||
    level.doors.some((d) => Math.abs(x - d.x) < CLEAR.door) ||
    level.carts.some((c) => Math.abs(x - c) < CLEAR.cart) ||
    level.crates.some((c) => Math.abs(x - c.x) < CLEAR.crate && y > c.y) ||
    level.checkpoints.some((k) => Math.abs(x - k.x) < CLEAR.checkpoint);
  for (const f of level.floor) {
    if (f.y0 !== f.y1 || f.belt) continue;
    for (let x = f.x0 + ANCHOR_STEP; x < f.x1 - ANCHOR_STEP / 2; x += ANCHOR_STEP) {
      const y = f.y0 - PICKUP_SIZE;
      if (x < level.spawn.x + 300 || x > level.length - 300 || blocked(x, y)) continue;
      out.push({ x, y });
    }
  }
  for (const p of level.platforms)
    for (let x = p.x0 + ANCHOR_STEP / 2; x < p.x1 - 40; x += ANCHOR_STEP) {
      const y = p.y - PICKUP_SIZE;
      if (!blocked(x, y)) out.push({ x, y });
    }
  return out;
}
