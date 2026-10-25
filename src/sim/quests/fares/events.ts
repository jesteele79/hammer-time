import type { Point } from "../../types";
import type { CityCode, TagKind } from "./board";
import type { Booking, Outcome, Traveler } from "./fares";

/** The travelers' beats: an "ooh" at a booking, a laugh at a miss, applause at A1 (R5 §7). */
export type CrowdKind = "ooh" | "laugh" | "clap";

/** What happened at the gate in one step (R5). Positions are on the map (px, from its top-left). */
export type FaresEvent =
  | { type: "fdTag"; id: number; city: CityCode; kind: TagKind; fare: number; flash: boolean }
  | { type: "fdTagGone"; id: number }
  /** The press: the throw clip starts; `at` is where it will land. */
  | { type: "fdThrow"; at: Point }
  /** The whip's end: the scalpel leaves his hand. */
  | { type: "fdRelease"; at: Point }
  | { type: "fdStick"; at: Point; outcome: Outcome; booking: Booking | null; points: number; tag: number | null }
  | { type: "fdLadder"; from: number; to: number }
  | { type: "fdPreferred" }
  | { type: "fdCloud"; third: 0 | 1 | 2; on: boolean }
  | { type: "fdStop"; tag: number; on: boolean }
  | { type: "fdAgent"; on: boolean }
  /** T: he towels off (`on`), and the steady hand is full again as the wipe ends (`on` false). */
  | { type: "fdTowel"; on: boolean }
  /** An insult at a traveler or the agent: the scene picks his line from GATE_INSULTS, GATE_GLOATS or GATE_PISSED. */
  | { type: "fdInsult"; at: Traveler | "agent"; mood: "calm" | "gloat" | "pissed" }
  | { type: "fdCrowd"; kind: CrowdKind; who: Traveler[] }
  /** His face: smug through a streak, angry after a miss; null back to neutral. */
  | { type: "fdMood"; mood: "smug" | "angry" | null; seconds: number }
  /** His line: a thought. */
  | { type: "fdThink"; text: string; seconds: number }
  /** A traveler's or the agent's line: a speech bubble. */
  | { type: "fdSay"; who: Traveler | "agent"; text: string; seconds: number }
  | { type: "fdEnd"; score: number; grade: string };
