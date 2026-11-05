import type { GameEvent } from "./events";
import type { Lesson } from "./level";
import type { Point } from "./types";

/**
 * The shipped game's run numbers: lives, the patience a run starts with, what each
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
  breadPoints: 50,
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
  /** He has belly-flopped this shift: the hint that teaches it is done (owner, 2026-10-18). */
  flopped: boolean;
  /** He has lobbed a box of #15 blades this shift: the hint stops teaching it. */
  lobbed: boolean;
  /** Staff bonked this run: everyone knocked out for good, run off for good or sent down a pit (plan decision 4). */
  bonked: number;
  /** The moves he has done this run: their lessons stop teaching them. */
  learned: Lesson[];
  /** Keycards he holds: his status (story spec §8.1), taken in the snapshot, reset with the act. */
  keycards: number;
  /** The status tiers granted this run: each pays once. */
  perks: string[];
  /** The keycard spots taken this run: a life lost does not put them back. */
  spots: string[];
  /** The conductor's doors won this level: they stay open across a lost life. */
  bossDoors: number;
  /** The stretch's own clock while he is in it (3-3's station), null otherwise: the level's clock waits. */
  stretch: number | null;
  /** Where Ambassador set the checkpoint, while `checkpoint` names it. */
  checkpointAt?: Point;
};

export const createRun = (seed: number): Run => ({ seed, score: 0, cans: 0, lives: RUN.lives, time: 0, star: 0, checkpoint: null, punched: [], spent: [], flopped: false, lobbed: false, bonked: 0, learned: [], keycards: 0, perks: [], spots: [], stretch: null, bossDoors: 0 });

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
