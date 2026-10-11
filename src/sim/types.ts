import type { Move } from "./moves";
import type { Puddle, Snot } from "./snot";

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

/** A floor the feet follow; sloped when y0 differs from y1. */
export type FloorSegment = { x0: number; x1: number; y0: number; y1: number };
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
};

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
};

export type Snapshot = { time: number; hero: HeroState; targets: Target[]; snot: Snot[]; puddles: Puddle[] };
