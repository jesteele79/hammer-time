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
};

export type Snapshot = { time: number; hero: HeroState };
