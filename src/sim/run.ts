import type { GameEvent } from "./events";

/**
 * The shipped run's numbers (src/game/engine.ts): lives, the patience a run starts with, what each
 * pickup is worth, the clock's hurry, and the seconds of each card and beat, in seconds not frames.
 */
export const RUN = {
  lives: 3,
  patience: 2,
  canPoints: 200,
  canCool: 10,
  cansPerLife: 100,
  nutPoints: 500,
  nutCharge: 3,
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
};

export const createRun = (seed: number): Run => ({ seed, score: 0, cans: 0, lives: RUN.lives, time: 0, star: 0, checkpoint: null, punched: [] });

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
