import type { Npc } from "./cast";
import type { Missile } from "./missiles";
import type { Move } from "./moves";
import type { Pig } from "./pig";
import type { HeatZone, SwingDoor } from "./hazards";
import type { Puddle, Snot } from "./snot";
import type { Sample } from "./samples";

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

/** A floor the feet follow; sloped when y0 differs from y1. `belt` (px/s along x) carries whoever stands on it: an escalator. */
export type FloorSegment = { x0: number; x1: number; y0: number; y1: number; belt?: number };
/** Landed on from above only. */
export type Platform = { x0: number; x1: number; y: number };
/** A low ceiling: slide under it, never stand under it. */
export type Pass = Rect;
export type Solid = Rect;

export type Stage = {
  floor: FloorSegment[];
  platforms: Platform[];
  solids: Solid[];
  passes: Pass[];
  bounds: Rect;
  /** Flat-tops and the walk-in: heat on or off a second while he stands in one (R3). */
  heat?: HeatZone[];
};

/** What a cart carries: the lobby's cases, a busser's dirty dishes, or the dock's trash. */
export type CartLoad = "cases" | "dishes" | "trash";

export type HeroMotion = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "crouch" | "slide";

/** `x, y` is the feet point; the collider is `w` wide and `h` tall above it. */
export type HeroState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  crouch: boolean;
  slideT: number;
  coyote: number;
  buffer: number;
  state: HeroMotion;
  /** Seconds in the current state. */
  stateT: number;
  /** Seconds the current clip has played. */
  animT: number;
  /** The move under way, or none. */
  move: Move | null;
  /** 0 to 100: sweat, steam and a slower run from 80. */
  heat: number;
  /** Snot charges, 0 to 3, refilled over time. */
  sinus: number;
  /** Super smash charge, 0 to 10. */
  charge: number;
  /** Pepper-loaded: hot snot. */
  hot: boolean;
  fireCd: number;
  /** Set once he boils over, cleared when he cools below 70. */
  boiled: boolean;
  /** Seconds until he can lecture again. */
  lectureCd: number;
  /** Seconds standing idle: the watch check, the foot tap and the harrumph. */
  idleT: number;
  /** From the watch check until he does anything. */
  bored: boolean;
  /** Patience pips, 0 to 3: a hit costs one; at the last he is knocked flat. */
  patience: number;
  /** Seconds of the hurt face. */
  hurtT: number;
  /** Seconds of grace after a hit. */
  invuln: number;
  /** Seconds one-way platforms let him through after down + jump. */
  dropT: number;
  /** Doggy bags from the banquet: each one catches a hit that would knock him flat (owner, 2026-10-18). */
  doggy: number;
  /** The banquet's belly-flop: his slide is a flop that knocks staff over, for the rest of the shift (owner, 2026-10-18). */
  flop: boolean;
  /** How many staff this flop has bowled over (the chain). */
  flopChain: number;
  /** Boxes of #15 blades from the gate: B lobs one at staff (owner, R5). */
  boxes: number;
  /** Seconds until he can lob the next box. */
  boxCd: number;
};

/** Something to hit: the lobby's practice luggage carts. `x, y` is the base center. */
export type Target = {
  id: number;
  kind: "cart";
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  flash: number;
  spin: number;
  /** How many staff this roll has bowled over (the chain). */
  chain: number;
  load: CartLoad;
  /** A dish cart's dishes are gone (they crash once). */
  spilled: boolean;
};

export type Snapshot = { time: number; hero: HeroState; targets: Target[]; snot: Snot[]; samples: Sample[]; puddles: Puddle[]; cast: Npc[]; missiles: Missile[]; doors: SwingDoor[]; pig: Pig | null };
