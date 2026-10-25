/** The keys, for the break card and the start screen: the keyboard's whole set on one card. */
export const KEYS: [string, string][] = [
  ["← →", "move"],
  ["Shift", "run"],
  ["Space", "jump"],
  ["↓", "duck, doors"],
  ["H", "swing"],
  ["F", "snot"],
  ["E", "lecture"],
  ["T", "towel"],
  ["Q", "smash"],
  ["B", "box of blades"],
  ["P", "break"],
];

/** The banquet's keys, for its break card (R4 §3; the plates and the lecture since 2026-10-18). */
export const BANQUET_KEYS: [string, string][] = [
  ["← →", "tap: next plate, hold: aim"],
  ["Space", "grab, hold to reach"],
  ["E", "lecture the table"],
  ["H", "bonk the table"],
  ["↓", "duck"],
  ["P", "break"],
];

/** The gate's keys, for its break card (R5 §12): any action key throws. */
export const GATE_KEYS: [string, string][] = [
  ["Space", "throw a scalpel"],
  ["Shift", "steady your hand"],
  ["T", "towel off: steady again"],
  ["E", "mouth off"],
  ["P", "break"],
];
