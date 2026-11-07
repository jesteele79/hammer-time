import { createRun, type Run } from "./run";
import { STORY, firstOfAct, isStoryId, nextOf, type ActId, type StoryId } from "./story";

/** Where the journey is kept in this browser (spec §4.5). */
export const JOURNEY_KEY = "hammer-time-journey";

/** What he carries that lives on him rather than in the run (plan decision 2): the six things spec §4.3 lists. */
export type Carry = { charge: number; patience: number; hot: boolean; doggy: number; flop: boolean; boxes: number };
/** The run as it stood at a level's card, and what he carried in: Try again restores it (spec §4.3). */
export type Snapshot = { run: Run; carry: Carry };
/** The save (spec §4.5, plan decision 2): the next open stop, the finished ones, their bests, lifetime staff bonked, the snapshot. */
export type Journey = {
  v: 1;
  next: StoryId;
  done: StoryId[];
  best: Partial<Record<StoryId, number>>;
  bonked: number;
  run: Run | null;
  carry: Carry | null;
  credits: boolean;
};

export const newJourney = (): Journey => ({ v: 1, next: "sat", done: [], best: {}, bonked: 0, run: null, carry: null, credits: false });

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const finiteAtLeast0 = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const ORDER = new Map(STORY.map((s, i) => [s.id, i]));
const inOrder = (ids: Iterable<StoryId>): StoryId[] => [...new Set(ids)].sort((a, b) => ORDER.get(a)! - ORDER.get(b)!);

/**
 * A saved run: seed, score, cans and lives must be there as numbers; any other field a newer `Run` has and the save
 * lacks is filled in fresh (a snapshot from an earlier build is kept); a field present with the wrong type drops it.
 */
function runOf(raw: unknown): Run | null {
  if (!isObject(raw)) return null;
  for (const k of ["seed", "score", "cans", "lives"]) if (typeof raw[k] !== "number" || !Number.isFinite(raw[k])) return null;
  const fresh = createRun(raw.seed as number);
  const out: Record<string, unknown> = { ...fresh };
  for (const [k, v] of Object.entries(fresh)) {
    if (!(k in raw)) continue;
    const got = raw[k];
    if (Array.isArray(v)) {
      if (!Array.isArray(got) || !got.every((s) => typeof s === "string")) return null;
    } else if (k === "stretch") {
      // The station's clock: its seconds, or none.
      if (got !== null && typeof got !== "number") return null;
    } else if (v === null) {
      // `checkpoint`: a punch clock's id or none.
      if (got !== null && typeof got !== "string") return null;
    } else if (typeof got !== typeof v) return null;
    out[k] = got;
  }
  return out as Run;
}

function carryOf(raw: unknown): Carry | null {
  if (!isObject(raw)) return null;
  const { charge, patience, hot, doggy, flop, boxes } = raw;
  if (![charge, patience, doggy, boxes].every(finiteAtLeast0) || typeof hot !== "boolean" || typeof flop !== "boolean") return null;
  return { charge: charge as number, patience: patience as number, hot, doggy: doggy as number, flop, boxes: boxes as number };
}

/** Every field recognized is kept; the rest is let go. A journey from any version reads this way (spec §4.5). */
export function migrateJourney(raw: unknown): Journey {
  if (!isObject(raw)) return newJourney();
  const done = inOrder(Array.isArray(raw.done) ? raw.done.filter(isStoryId) : []);
  const best: Partial<Record<StoryId, number>> = {};
  if (isObject(raw.best)) for (const [k, v] of Object.entries(raw.best)) if (isStoryId(k) && finiteAtLeast0(v)) best[k] = v;
  // An unknown next (a later build's stop) plays on from the last stop finished.
  const last = done[done.length - 1];
  const given: StoryId = isStoryId(raw.next) ? raw.next : last ? (nextOf(last) ?? last) : "sat";
  // Next is the first stop not finished: a hand-edited pair that disagrees would replay a finished stop or lock one for good.
  const next: StoryId = STORY.find((s) => !done.includes(s.id))?.id ?? given;
  const bonked = finiteAtLeast0(raw.bonked) && Number.isInteger(raw.bonked) ? raw.bonked : 0;
  return { v: 1, next, done, best, bonked, run: runOf(raw.run), carry: carryOf(raw.carry), credits: raw.credits === true };
}

/** The save as read from storage: nothing, garbage or a later version all give a journey that plays. */
export function parseJourney(json: string | null): Journey {
  if (json === null) return newJourney();
  try {
    return migrateJourney(JSON.parse(json));
  } catch {
    return newJourney();
  }
}

export const serializeJourney = (j: Journey): string => JSON.stringify(j);

/**
 * A level finished. Its best is kept; when it was the next stop, the one after it opens and the snapshot carries in (none
 * when that one starts an act clean). A replay (any other stop) touches neither `next` nor the snapshot (spec §4.6).
 */
export function finishLevel(j: Journey, id: StoryId, score: number, snapshot: Snapshot | null): Journey {
  const best = { ...j.best, [id]: Math.max(j.best[id] ?? 0, Math.max(0, score)) };
  const done = inOrder([...j.done, id]);
  if (id !== j.next) return { ...j, done, best };
  const next = nextOf(id) ?? id;
  const clean = next !== id && firstOfAct(next);
  return { ...j, next, done, best, run: clean ? null : (snapshot?.run ?? null), carry: clean ? null : (snapshot?.carry ?? null) };
}

/**
 * Plays `id` as the journey's next stop when the stops from `next` up to it are not built yet (in Phase 1a, SAT): those
 * are passed, finished with no best, and `id` becomes next. Nothing changes when `id` is next or comes before it.
 */
export function skipTo(j: Journey, id: StoryId): Journey {
  const from = ORDER.get(j.next)!;
  const to = ORDER.get(id)!;
  if (to <= from) return j;
  return { ...j, next: id, done: inOrder([...j.done, ...STORY.slice(from, to).map((s) => s.id)]) };
}

/** The stop Clock in plays: the journey's next, or the first built stop after it while it is not built (Phase 1a's SAT). */
export function playableNext(j: Journey, built: readonly StoryId[]): StoryId | null {
  const from = ORDER.get(j.next)!;
  return STORY.slice(from).find((s) => built.includes(s.id))?.id ?? null;
}

export function stopState(j: Journey, id: StoryId): "done" | "next" | "locked" {
  if (j.done.includes(id)) return "done";
  return id === j.next ? "next" : "locked";
}

/** The home screen's scene (story spec §5.1, §11's 2026-11-06 note): the lobby at night once Act 1 is done, Basel's street once the suite is. */
export const homeOf = (j: Pick<Journey, "done">): "lobby-night" | "basel" | undefined => (j.done.includes("suite") ? "basel" : j.done.includes("arena") ? "lobby-night" : undefined);

export const actTotal = (j: Journey, act: ActId): number => STORY.filter((s) => s.act === act).reduce((t, s) => t + (j.best[s.id] ?? 0), 0);
export const journeyTotal = (j: Journey): number => STORY.reduce((t, s) => t + (j.best[s.id] ?? 0), 0);

/**
 * Lifetime staff bonked (plan decision 4), counted from the run as it goes: what a moment adds to the journey's count and
 * how much of the run is counted after it. A run's start (a fresh one, a saved one, Try again's) counts from where it
 * stands, its bonks counted when they happened; a level's tally adds its own; Hammer down and Shift over add the rest.
 */
export function bonkedCount(counted: number, run: number, at: "start" | "levelDone" | "over" | "clear", level = 0): { add: number; counted: number } {
  if (at === "start") return { add: 0, counted: run };
  if (at === "levelDone") return { add: level, counted: counted + level };
  return { add: Math.max(0, run - counted), counted: Math.max(counted, run) };
}
