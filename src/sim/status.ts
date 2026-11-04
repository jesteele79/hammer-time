/** A tier of the Status Crusade (story spec §8.1): how many keycards it takes, its name, its comic word and his thought. */
export type StatusTier = { at: number; name: string; word: string; thought: string };

export const STATUS_TIERS: readonly StatusTier[] = [
  { at: 2, name: "SILVER", word: "SILVER!", thought: "Silver gets you nothing. Everyone knows that." },
  { at: 4, name: "GOLD", word: "GOLD!", thought: "Late checkout. Obviously." },
  { at: 6, name: "PLATINUM", word: "PLATINUM!", thought: "Lounge. Finally." },
  { at: 8, name: "TITANIUM", word: "TITANIUM!", thought: "Finally. A suite." },
  { at: 10, name: "AMBASSADOR", word: "AMBASSADOR!", thought: "Points. Not the water." },
];

/** What a tier pays, the first time. */
export const TIER_POINTS = 500;
/** A keycard where status does not count (the suite's bellhops): just points. */
export const KEYCARD_POINTS = 200;
/** Gold's late checkout, seconds on the clock. */
export const LATE_CHECKOUT = 60;
/** The id of the checkpoint Ambassador sets where he stands. */
export const AMBASSADOR_CHECKPOINT = "ambassador";
/** The status he starts the act with: the front desk's system error. */
export const NO_STATUS = "MEMBER";

/** The highest tier these keycards reach, or none. */
export function tierOf(keycards: number): StatusTier | null {
  let best: StatusTier | null = null;
  for (const t of STATUS_TIERS) if (t.at <= keycards) best = t;
  return best;
}

/** His status as the HUD and the cards write it. */
export const statusName = (keycards: number): string => tierOf(keycards)?.name ?? NO_STATUS;
