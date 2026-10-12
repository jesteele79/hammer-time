import type { GameMode } from "./game";
import type { CrateKind, DoorKind } from "./level";
import type { PickupKind } from "./rewards";
import type { Rect } from "./types";

/** What happened in one sim step, for the renderer, the sound and the feel. Positions are world px. */
export type GameEvent =
  | { type: "jump" }
  /** `speed` is how fast he was falling when he touched down, px/s. */
  | { type: "land"; x: number; y: number; speed: number }
  | { type: "slide" }
  | { type: "swing" }
  /** `shield` is the Buc-ee's shield bowling over whatever he runs into. */
  | { type: "hit"; by: "mallet" | "snot" | "burst" | "shield"; x: number; y: number; target: number }
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
  | { type: "getUp" }
  /** His head met the underside of a solid; the point is inside the solid's bottom edge. */
  | { type: "bump"; x: number; y: number }
  /** A single-use crate opened; `x` is its middle, `y` its bottom. */
  | { type: "crate"; id: string; kind: CrateKind; x: number; y: number }
  /** A can pops out of a crate straight to him. */
  | { type: "canPop"; x: number; y: number }
  | { type: "caseBreak"; x: number; y: number }
  | { type: "pickup"; kind: PickupKind; x: number; y: number }
  /** The mallet rang the front desk's bell. */
  | { type: "bell"; x: number; y: number }
  /** A hundred cans: a life. */
  | { type: "oneUp" }
  /** He passed a punch clock: where he comes back. */
  | { type: "checkpoint"; id: string; x: number; y: number }
  | { type: "fell" }
  | { type: "timeOut" }
  | { type: "lifeLost"; lives: number }
  | { type: "respawn" }
  | { type: "over" }
  | { type: "door"; kind: DoorKind; id: string }
  | { type: "exit" }
  /** The tally counted another whole second of the clock into points. */
  | { type: "tallyTick"; seconds: number }
  | { type: "clear" }
  | { type: "mode"; mode: GameMode };
