/** What happened in one sim step, for the renderer, the sound and the feel. Positions are world px. */
export type GameEvent =
  | { type: "jump" }
  | { type: "land"; x: number; y: number }
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
  | { type: "boiling" };
