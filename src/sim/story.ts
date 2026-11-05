import type { Level } from "./level";

/** The story's parts (spec §4.1): the prologue, three acts and the epilogue. */
export type ActId = "prologue" | "act1" | "act2" | "act3" | "epilogue";
/** Every stop of the story in order (spec §4.1): the prologue's SAT, Act 1's four, Act 2's four, Act 3's six. */
export type StoryId =
  | "sat"
  | "lobby"
  | "restaurant"
  | "campus"
  | "arena"
  | "lobby-night"
  | "tower"
  | "hallway"
  | "suite"
  | "flight"
  | "paris"
  | "train"
  | "basel"
  | "lab"
  | "replacement";
/** A card the shell shows between levels (spec §6.1, §6.3, §7): the email, a caption, a phone's notification, an act's end. */
export type StoryCard = { kind: "email" } | { kind: "caption"; text: string } | { kind: "phone"; app: string; text: string; thought: string } | { kind: "act"; act: ActId };
/** A stop: its code and name on the strip, its act, and the cards before and after it. */
export type StoryStop = { id: StoryId; code: string; name: string; act: ActId; before?: StoryCard[]; after?: StoryCard[] };

/** Each act's title on the strip, and its straight-through run once finished with that run's best (spec §4.6). */
export const ACTS: Record<ActId, { title: string; straight: string | null; straightKey: string | null }> = {
  prologue: { title: "Prologue", straight: null, straightKey: null },
  act1: { title: "Act 1 · The Trip", straight: "Work the whole shift", straightKey: "hammer-time-best-next" },
  act2: { title: "Act 2 · Status Crusade", straight: "Play the night straight through", straightKey: "hammer-time-best-act2" },
  act3: { title: "Act 3 · The Last Tour", straight: "Play the tour straight through", straightKey: "hammer-time-best-act3" },
  epilogue: { title: "Epilogue", straight: null, straightKey: null },
};

/** The acts whose straight-through run is built: the strip offers the button only for these (Phase 5 adds the rest). */
export const STRAIGHT_BUILT: readonly ActId[] = ["act1"];

/** The fifteen stops in the order they are played. Later phases add the other stops' cards. */
export const STORY: readonly StoryStop[] = [
  {
    id: "sat",
    code: "SAT",
    name: "San Antonio International",
    act: "prologue",
    before: [{ kind: "email" }],
    after: [{ kind: "caption", text: "Three hours later. The hotel." }],
  },
  { id: "lobby", code: "1-1", name: "Hotel lobby", act: "act1" },
  { id: "restaurant", code: "1-2", name: "Restaurant", act: "act1" },
  { id: "campus", code: "1-3", name: "Campus", act: "act1" },
  {
    id: "arena",
    code: "1-4",
    name: "The Pink Menace",
    act: "act1",
    after: [
      { kind: "phone", app: "Marriott Bonvoy", text: "Your status has been reviewed.", thought: "Reviewed." },
      { kind: "act", act: "act1" },
    ],
  },
  { id: "lobby-night", code: "2-1", name: "The lobby at night", act: "act2", before: [{ kind: "caption", text: "11:40 pm. The same lobby." }] },
  { id: "tower", code: "2-2", name: "The tower", act: "act2" },
  { id: "hallway", code: "2-3", name: "The fourteenth floor", act: "act2", after: [{ kind: "caption", text: "The suite. Someone is in it." }] },
  {
    id: "suite",
    code: "2-4",
    name: "The suite",
    act: "act2",
    after: [
      { kind: "phone", app: "Marriott Bonvoy", text: "Your status has been reviewed: TITANIUM. Lifetime.", thought: "Lifetime." },
      { kind: "act", act: "act2" },
    ],
  },
  { id: "flight", code: "3-1", name: "Row 52", act: "act3" },
  { id: "paris", code: "3-2", name: "Paris", act: "act3" },
  { id: "train", code: "3-3", name: "The 14:02", act: "act3" },
  { id: "basel", code: "3-4", name: "Basel, Tattoo week", act: "act3" },
  { id: "lab", code: "3-5", name: "The Basel office", act: "act3" },
  { id: "replacement", code: "3-6", name: "The replacement", act: "act3" },
];

const INDEX = new Map(STORY.map((s, i) => [s.id, i]));

export const isStoryId = (id: unknown): id is StoryId => typeof id === "string" && INDEX.has(id as StoryId);
export const stopOf = (id: StoryId): StoryStop => STORY[INDEX.get(id)!];
/** The stop after this one; null after the last. */
export const nextOf = (id: StoryId): StoryId | null => STORY[INDEX.get(id)! + 1]?.id ?? null;
export const actOf = (id: StoryId): ActId => stopOf(id).act;
/**
 * The first stop of a run that starts clean (spec §4.3): the prologue and Acts 2 and 3. Act 1's first stop is not, since
 * the prologue flows into it: the boxes from the gate are what he carries into Act 1 (plan decision 1).
 */
export const firstOfAct = (id: StoryId): boolean => id === "sat" || id === "lobby-night" || id === "flight";
/** The stops in story order whose level exists in `levels`. */
export const builtStops = (levels: ReadonlyMap<string, unknown>): StoryId[] => STORY.filter((s) => levels.has(s.id)).map((s) => s.id);

/** The stops a run carries through from `id`: to the end of its act, the prologue running on through Act 1. */
function runStops(id: StoryId): StoryId[] {
  const out: StoryId[] = [];
  for (let at: StoryId | null = id; at; at = nextOf(at)) {
    if (at !== id && firstOfAct(at)) break;
    out.push(at);
  }
  return out;
}

/** That stop's level and every built stop after it to the end of its run: for `sat`, through `arena`. */
export const shiftFrom = (id: StoryId, levels: ReadonlyMap<string, Level>): Level[] =>
  runStops(id).flatMap((s) => {
    const l = levels.get(s);
    return l ? [l] : [];
  });
