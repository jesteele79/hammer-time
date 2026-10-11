import type { Rect } from "./types";

/** What happened in one sim step, for the renderer, the sound and the feel. Positions are world px. */
export type GameEvent =
  | { type: "jump" }
  /** `speed` is how fast he was falling when he touched down, px/s. */
  | { type: "land"; x: number; y: number; speed: number }
  | { type: "slide" }
  | { type: "swing" }
  | { type: "hit"; by: "mallet" | "snot" | "burst"; x: number; y: number; target: number }
  | { type: "superStart" }
  | { type: "burst"; x: number; y: number }
  | { type: "sniff" }
  | { type: "fire"; x: number; y: number; hot: boolean }
  | { type: "splat"; x: number; y: number; floor: boolean; hot: boolean }
  | { type: "wipeStart" }
  | { type: "stroke"; n: number }
  | { type: "flick" }
  | { type: "shine" }
  | { type: "boiling" }
  | { type: "lectureStart" }
  /** The lecture lands: everyone inside `reach` is schooled or frozen (R2's NPCs). */
  | { type: "lecture"; reach: Rect }
  | { type: "watch" }
  | { type: "tap" }
  | { type: "harrumph" }
  /** `dir` is the way he is thrown. */
  | { type: "hurt"; x: number; y: number; dir: 1 | -1 }
  | { type: "tumble"; x: number; y: number; dir: 1 | -1 }
  | { type: "getUp" };
