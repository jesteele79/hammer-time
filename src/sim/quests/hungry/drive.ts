import { STEP } from "../../constants";
import { emptyInput, type Input } from "../../input";
import { FOODS, settled, type Dish } from "./food";
import { HUNGRY, baseReach, createHungry, serverAt, stepHungry, type Hungry, type HungryResult } from "./hungry";
import { RIVALS, SEATS, dirOf, dist, screenDeg, sub } from "./table";

/** A scripted player for the grade lines (R4 §6): the keys for this step of the round. */
export type Player = (q: Hungry) => Input;

const P = SEATS.hammer.plate;
const degTo = (x: { x: number; y: number }) => screenDeg(1, sub(x, P));
/** Swings his line toward `deg`: true while it still has to. */
function aimTo(input: Input, aim: number, deg: number): boolean {
  if (Math.abs(deg - aim) <= 2.5) return false;
  input.held[deg > aim ? "left" : "right"] = true;
  return true;
}
const free = (q: Hungry) => !q.hammer.dive && q.hammer.swing <= 0 && q.hammer.stun <= 0;

/** Never presses a key. */
export const idlePlayer: Player = () => emptyInput();

/** Every 0.5 s: the nearest resting dish within his tap's reach and his swing, aimed at and tapped. Never a charge or a bonk. */
export function steadyPlayer(): Player {
  let next = 0;
  return (q) => {
    const input = emptyInput();
    if (!free(q) || q.time < next || q.hammer.since < HUNGRY.cadence) return input;
    const reach = baseReach(q);
    const target = q.dishes
      .filter((d) => settled(d) && dist(d, P) <= reach && Math.abs(degTo(d)) <= HUNGRY.aim)
      .sort((a, b) => dist(a, P) - dist(b, P))[0];
    if (!target || aimTo(input, q.hammer.aim, degTo(target))) return input;
    input.held.jump = input.pressed.jump = true;
    next = q.time + 0.5;
    return input;
  };
}

/** Whether a dish's plate lies across a sweep from his plate along `dir` out to `reach`. */
const crosses = (d: Dish, dir: { x: number; y: number }, reach: number) => {
  const v = sub(d, P);
  const along = v.x * dir.x + v.y * dir.y;
  return along >= 0 && along <= reach && Math.abs(v.x * dir.y - v.y * dir.x) <= HUNGRY.sweep + d.r;
};

/**
 * Bonks the server at his corner; robs a rival's plate topped by an entree with a full charge (not the angry nurse's);
 * otherwise mashes along whichever line crosses the most food.
 */
export function sharpPlayer(): Player {
  let holding = 0;
  return (q) => {
    const input = emptyInput();
    const h = q.hammer;
    if (holding > 0) {
      holding--;
      input.held.jump = holding > 0;
      return input;
    }
    if (!free(q)) return input;
    if (q.server.away <= 0 && dist(serverAt(q), P) <= HUNGRY.bonk.reach) {
      input.held.hammer = input.pressed.hammer = true;
      return input;
    }
    if (h.since < HUNGRY.cadence) return input;
    for (const id of RIVALS) {
      const r = q.rivals[id];
      const top = r.plate[r.plate.length - 1];
      if (!top || FOODS[top].course !== "entree" || (id === "nurse" && r.anger > 0)) continue;
      const deg = degTo(SEATS[id].plate);
      if (Math.abs(deg) > HUNGRY.aim || dist(SEATS[id].plate, P) > HUNGRY.reach.charged) continue;
      if (aimTo(input, h.aim, deg)) return input;
      input.held.jump = input.pressed.jump = true;
      holding = Math.ceil(HUNGRY.charge / STEP);
      return input;
    }
    const reach = baseReach(q);
    let best: number | null = null;
    let most = 0;
    for (let deg = -HUNGRY.aim; deg <= HUNGRY.aim; deg += 5) {
      const dir = dirOf(1, deg);
      const n = q.dishes.filter((d) => d.fall <= 0 && crosses(d, dir, reach)).length;
      if (n > most) {
        most = n;
        best = deg;
      }
    }
    if (best === null || aimTo(input, h.aim, best)) return input;
    input.held.jump = input.pressed.jump = true;
    return input;
  };
}

/** A whole practice round under a scripted player. */
export function playRound(seed: number, player: Player): HungryResult {
  const q = createHungry(seed, { practice: true });
  while (!q.result) stepHungry(q, player(q), STEP);
  return q.result;
}

/**
 * The grade scale the scripted rounds ask for (R4 §6): the sharp median at COMPED (3000 k), the steady median at SPLIT THE
 * CHECK or GOOD TIPPER (1200 k up to 3000 k); a twentieth under the most that does both, to a twentieth. Null when none does.
 */
export function suggestScale(steady: number, sharp: number): number | null {
  const most = Math.min(steady / 1200, sharp / 3000) * 0.95;
  const k = Math.floor(most * 20 + 1e-9) / 20;
  return k > 0 && k > steady / 3000 ? k : null;
}
