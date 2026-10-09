export type TauntTarget = "staff" | "student" | "pig";
export type TauntId = "fired" | "feedback" | "problem" | "man-balls" | "butt-hurt";

export const TAUNT_FILES: Record<TauntId, string> = {
  fired: "/voice/fired.wav",
  feedback: "/voice/feedback.wav",
  problem: "/voice/problem.wav",
  "man-balls": "/voice/man-balls.wav",
  "butt-hurt": "/voice/butt-hurt.wav",
};

export const TAUNT_CHANCE: Record<TauntTarget, number> = {
  staff: 0.35,
  student: 0.5,
  pig: 0.45,
};
export const TAUNT_GAP_SECONDS = 3.5;

const STAFF: TauntId[] = ["fired", "feedback"];
const STUDENT: TauntId[] = ["problem", "man-balls", "butt-hurt"];
const POOLS = { staff: STAFF, crossover: STUDENT, student: STUDENT, pig: [...STAFF, ...STUDENT] };
type Pool = keyof typeof POOLS;

/** Each pool exhausts a shuffled bag before refilling, including across retries. */
export class TauntRotation {
  private bags = new Map<Pool, TauntId[]>();
  private last: TauntId | null = null;

  constructor(private random: () => number = Math.random) {}

  next(target: TauntTarget): TauntId {
    const pool: Pool = target === "staff" && this.random() < 0.2 ? "crossover" : target;
    let bag = this.bags.get(pool);
    if (!bag?.length) {
      bag = [...POOLS[pool]];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.bags.set(pool, bag);
    }
    if (bag.at(-1) === this.last && bag.length > 1) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const chosen = bag.pop()!;
    this.last = chosen;
    return chosen;
  }
}
