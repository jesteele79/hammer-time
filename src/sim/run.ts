import type { GameEvent } from "./events";

/**
 * The shipped run's numbers (src/game/engine.ts): lives, the patience a run starts with, what each
 * pickup is worth, the clock's hurry, and the seconds of each card and beat, in seconds not frames.
 */
export const RUN = {
  lives: 3,
  patience: 2,
  canPoints: 200,
  /** A can is a cool-down: a big drop in heat, so he runs at full speed again (owner, 2026-10-12). */
  canCool: 25,
  cansPerLife: 100,
  nutPoints: 500,
  /** Nuts are smash fuel: three bags fill the Super Smash (10). */
  nutCharge: 4,
  buceesPoints: 1000,
  star: 10,
  pepperPoints: 1000,
  casePoints: 50,
  maxScore: 999999,
  /** The tally drains this many clock seconds a second, each worth `tallyPoints`. */
  tallyRate: 60,
  tallyPoints: 50,
  hurry: 80,
  dieT: 1.2,
  cardT: 1.6,
  respawnGrace: 1.3,
  /** Back from the banquet: a moment's grace in front of its door (R4 §7). */
  questGrace: 0.6,
  /** How far into the tumble he lies still before the life is lost. */
  lieAt: 0.5,
  walkoffT: 0.8,
  clearHold: 0.85,
} as const;

export type Run = {
  seed: number;
  score: number;
  cans: number;
  lives: number;
  /** Seconds left on the clock. */
  time: number;
  /** Seconds left of a Buc-ee's boost. */
  star: number;
  /** The last punch clock he passed, where he comes back. */
  checkpoint: string | null;
  /** Every punch clock passed this run: their cards stay gold. */
  punched: string[];
  /** Doors used once a shift: the BUFFET's banquet (R4 §7). */
  spent: string[];
};

export const createRun = (seed: number): Run => ({ seed, score: 0, cans: 0, lives: RUN.lives, time: 0, star: 0, checkpoint: null, punched: [], spent: [] });

export function addScore(r: Run, n: number): void {
  r.score = Math.min(RUN.maxScore, r.score + n);
}

/** Cans: points, a cooler head, and a life for every hundred. Returns the heat they take off. */
export function addCans(r: Run, n: number, events: GameEvent[]): number {
  addScore(r, RUN.canPoints * n);
  r.cans += n;
  while (r.cans >= RUN.cansPerLife) {
    r.cans -= RUN.cansPerLife;
    r.lives++;
    events.push({ type: "oneUp" });
  }
  return RUN.canCool * n;
}
