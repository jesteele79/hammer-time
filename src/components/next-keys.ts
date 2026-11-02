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

/** The touch pad's words for the break card while the pad shows: the buttons as the pad labels them. */
export const TOUCH_KEYS: [string, string][] = [
  ["← →", "move"],
  ["Run", "run"],
  ["Jump", "jump"],
  ["↓", "duck, doors"],
  ["Hammer", "swing"],
  ["Snot", "snot"],
  ["Lecture", "lecture"],
  ["Towel", "towel"],
  ["Super", "smash"],
  ["Box", "box of blades"],
];

/** The pad at the banquet: the arrows hop and aim, Jump dives (R4 §3). */
export const BANQUET_TOUCH_KEYS: [string, string][] = [
  ["← →", "tap: next plate, hold: aim"],
  ["Jump", "grab, hold to reach"],
  ["Lecture", "lecture the table"],
  ["Hammer", "bonk the table"],
  ["↓", "duck"],
];

/** The pad at the gate: a tap on the scene or any action button throws (R5 §3). */
export const GATE_TOUCH_KEYS: [string, string][] = [
  ["Jump", "throw a scalpel (or tap the scene)"],
  ["Run", "steady your hand (or hold a finger)"],
  ["Towel", "towel off: steady again"],
  ["Lecture", "mouth off"],
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
