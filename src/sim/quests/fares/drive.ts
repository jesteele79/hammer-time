import { STEP } from "../../constants";
import { emptyInput, type Input } from "../../input";
import { seededRandom } from "../../rewards";
import { classOf } from "./board";
import { FARES, createFares, crosshair, outcomeAt, stepFares, tagRect, type Fares, type FaresResult, type Tag } from "./fares";

/** A scripted player at the gate: what it presses each step. The rounds it plays set how hard Fare Darts is (R5 §3). */
export type Player = (q: Fares) => Input;

const idle = (): Input => emptyInput();
function act(throwNow: boolean, steady: boolean): Input {
  const i = emptyInput();
  i.held.run = steady;
  if (throwNow) i.held.jump = i.pressed.jump = true;
  return i;
}

/** Throws the moment a throw can start, without aiming: the floor every grade line sits on. */
export const masherPlayer: Player = (q) => act(!q.shot, false);

const inRect = (p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
/** A tag worth throwing at: live, not cancelled, not under the cloud. */
const fair = (q: Fares, t: Tag) => t.stopped === 0 && !(q.cloud && Math.min(2, Math.floor((tagRect(t).x + tagRect(t).w / 2) / 360)) === q.cloud.third);

/**
 * The next time the crosshair passes over the middle of a fair tag while it is still up, reading the path ahead at the
 * current rate: the absolute time of the pass and the tag.
 */
function nextPass(q: Fares, rate: number, horizon = 6): { at: number; tag: Tag } | null {
  const tags = q.tags.filter((t) => fair(q, t));
  if (!tags.length) return null;
  let inside: Tag | null = null;
  let best = Infinity;
  let bestK = 0;
  for (let k = 1; k * STEP <= horizon; k++) {
    const p = crosshair(q.theta + rate * k * STEP);
    if (inside) {
      if (!inRect(p, tagRect(inside))) return { at: q.time + bestK * STEP, tag: inside };
      const c = tagRect(inside);
      const d = Math.hypot(p.x - (c.x + c.w / 2), p.y - (c.y + c.h / 2));
      if (d < best) {
        best = d;
        bestK = k;
      }
      continue;
    }
    for (const t of tags)
      if (t.t + k * STEP < t.life && inRect(p, tagRect(t))) {
        inside = t;
        const c = tagRect(t);
        best = Math.hypot(p.x - (c.x + c.w / 2), p.y - (c.y + c.h / 2));
        bestK = k;
        break;
      }
  }
  return inside ? { at: q.time + bestK * STEP, tag: inside } : null;
}

/**
 * A person: picks the tag the crosshair's next pass crosses while it is up, holds Run from 0.25 s before the pass while
 * the meter lasts, and presses within 50 ms either side of the moment the crosshair is over its middle.
 */
export function personPlayer(seed: number): Player {
  const rng = seededRandom(seed * 7919 + 13);
  let plan: { at: number; tag: Tag; error: number } | null = null;
  /** Holding Run for this pass: once begun, held to the throw while the meter lasts. */
  let holding = false;
  let replan = 0;
  return (q) => {
    if (q.shot) {
      plan = null;
      holding = false;
      return idle();
    }
    // A person reads the path ahead, and stops re-reading it in the last tenth of a second before the throw.
    if (!plan || (--replan <= 0 && plan.at - q.time > 0.1)) {
      const pass = nextPass(q, q.w * (holding && q.steady > 0 ? FARES.steady.factor : 1));
      if (!pass) {
        plan = null;
        holding = false;
        return idle();
      }
      if (plan?.tag !== pass.tag) holding = false;
      plan = { ...pass, error: plan?.tag === pass.tag ? plan.error : (rng() - 0.5) * 0.1 };
      replan = 6;
    }
    if (plan.at + plan.error < q.time - 0.2) {
      plan = null;
      return idle();
    }
    if (plan.at - q.time <= 0.25) holding = true;
    return act(q.time >= plan.at + plan.error, holding && q.steady > 0);
  };
}

/** A sharp hand: throws only with the crosshair on a fair Wanna Get Away tag, steadied once one is near; after a minute without one, any fair tag. */
export function sharpPlayer(): Player {
  let since = 0;
  return (q) => {
    if (q.shot) {
      since = 0;
      return idle();
    }
    since += STEP;
    const want = (t: Tag) => fair(q, t) && (since > 60 || (t.kind === "fare" ? classOf(t.fare) === "wga" : true));
    const p = crosshair(q.theta);
    const { outcome, tag } = outcomeAt(q, p);
    const near = q.tags.some((t) => {
      if (!want(t)) return false;
      const r = tagRect(t);
      return Math.hypot(p.x - (r.x + r.w / 2), p.y - (r.y + r.h / 2)) < 120;
    });
    return act(outcome === "book" && !!tag && want(tag), near && q.steady > 0);
  };
}

/** A practice round with everything on, played to its result; past `cap` seconds every throw goes at once. */
export function playRound(seed: number, player: Player, cap = 900): FaresResult {
  const q = createFares(seed, { practice: true });
  while (!q.result) stepFares(q, q.time > cap ? masherPlayer(q) : player(q), STEP);
  return q.result;
}
