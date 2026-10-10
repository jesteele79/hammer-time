import type { AudioBus } from "../audio";
import type { TouchAction } from "../engine";
import type { HeroPose } from "../hero";

/** Side quests are self-contained modules; the engine hosts them through this interface. */
export type QuestId = "hungry" | "fares";
export type QuestInput = {
  /** Sampled every frame. */
  held: Record<TouchAction, boolean>;
  /** Edges, consumed per step. */
  pressed: Record<TouchAction, boolean>;
};
export type QuestHud = {
  /** "HUNGRY HUNGRY HAMMER" */
  title: string;
  /** "Round 1 · The Banquet" */
  subtitle: string;
  score: number;
  /** Seconds left, or null. */
  timer: number | null;
  meter: { label: string; value: number; max: number; text?: string } | null;
  hint: string;
};
export type QuestResult = {
  /** Added to the run score. */
  score: number;
  /** Coke Zero toward the next life. */
  coins: number;
  /** Smash charge to add (clamped to 10). */
  charge: number;
  /** Buc-ee's boost on return. */
  star: boolean;
  /** Hot snot (form 2) on return. */
  hot: boolean;
  /** 1UPs earned. */
  lives: number;
  /** Patience back to 3. */
  fullBelly: boolean;
  /** "COMPED" */
  grade: string;
  /** Tally screen bullet list. */
  lines: string[];
};
export type QuestContext = {
  audio: AudioBus;
  /** The engine's loaded art by key. */
  images: Record<string, HTMLImageElement>;
  drawHero: (ctx: CanvasRenderingContext2D, pose: HeroPose, cam?: number) => void;
  /** Seeded; tests pass a fixed one. */
  rng: () => number;
  /** Thought bubble on Hammer. */
  say: (text: string, seconds: number) => void;
  comic: (x: number, y: number, text: string, big: boolean) => void;
  /** prefers-reduced-motion */
  reduced: boolean;
};
export interface Quest {
  readonly id: QuestId;
  enter(ctx: QuestContext, options: { table?: string; practice: boolean }): void;
  /** Called with STEP = 1/60. */
  step(dt: number, input: QuestInput): void;
  /** Draws in VIEW_W x VIEW_H space. */
  render(ctx: CanvasRenderingContext2D, clock: number): void;
  hud(): QuestHud;
  /** Null while running. */
  result(): QuestResult | null;
  exit(): void;
}
