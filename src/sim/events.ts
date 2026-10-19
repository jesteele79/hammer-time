import type { CastHitBy, CastJob, CastRole } from "./cast";
import type { GameMode } from "./game";
import type { HungryEvent } from "./quests/hungry/events";
import type { FaresEvent } from "./quests/fares/events";
import type { QuestId } from "./quests/quest";
import type { MissileKind } from "./missiles";
import type { CrateKind, DoorKind, LevelId } from "./level";
import type { PickupKind } from "./rewards";
import type { Rect } from "./types";

/** What happened in one sim step, for the renderer, the sound and the feel. Positions are world px. */
export type GameEvent =
  | { type: "jump" }
  /** `speed` is how fast he was falling when he touched down, px/s. */
  | { type: "land"; x: number; y: number; speed: number }
  | { type: "slide" }
  /** His slide, as the banquet's belly-flop: on his belly, knocking staff over (owner, 2026-10-18). */
  | { type: "flop"; x: number; y: number }
  | { type: "swing" }
  /** `shield` is the Buc-ee's shield bowling over whatever he runs into. */
  | { type: "hit"; by: "mallet" | "snot" | "burst" | "shield"; x: number; y: number; target: number }
  | { type: "superStart" }
  | { type: "burst"; x: number; y: number }
  | { type: "sniff" }
  | { type: "fire"; x: number; y: number; hot: boolean }
  | { type: "splat"; x: number; y: number; floor: boolean; hot: boolean }
  | { type: "wipeStart" }
  | { type: "stroke"; n: number }
  | { type: "flick" }
  | { type: "shine" }
  | { type: "boiling" }
  | { type: "lectureStart" }
  /** The lecture lands: everyone inside `reach` is schooled or frozen (R2's NPCs). */
  | { type: "lecture"; reach: Rect }
  | { type: "watch" }
  | { type: "tap" }
  | { type: "harrumph" }
  /** `dir` is the way he is thrown. */
  | { type: "hurt"; x: number; y: number; dir: 1 | -1 }
  | { type: "tumble"; x: number; y: number; dir: 1 | -1 }
  | { type: "getUp" }
  /** His head met the underside of a solid; the point is inside the solid's bottom edge. */
  | { type: "bump"; x: number; y: number }
  /** A single-use crate opened; `x` is its middle, `y` its bottom. */
  | { type: "crate"; id: string; kind: CrateKind; x: number; y: number }
  /** A can pops out of a crate straight to him. */
  | { type: "canPop"; x: number; y: number }
  | { type: "caseBreak"; x: number; y: number }
  | { type: "pickup"; kind: PickupKind; x: number; y: number }
  /** The mallet rang the front desk's bell. */
  | { type: "bell"; x: number; y: number }
  /** A hundred cans: a life. */
  | { type: "oneUp" }
  /** He passed a punch clock: where he comes back. */
  | { type: "checkpoint"; id: string; x: number; y: number }
  | { type: "fell" }
  | { type: "timeOut" }
  | { type: "lifeLost"; lives: number }
  | { type: "respawn" }
  | { type: "over" }
  | { type: "door"; kind: DoorKind; id: string }
  | { type: "exit" }
  /** The tally counted another whole second of the clock into points. */
  | { type: "tallyTick"; seconds: number }
  | { type: "clear" }
  /** He stepped onto a flat-top or into the walk-in. */
  | { type: "heatZone"; kind: "flattop" | "freezer"; x: number; y: number }
  /** A swinging door swung: banged open by its server's rush or slammed by the mallet (`hard`), or pushed through. */
  | { type: "doorSwing"; id: string; x: number; y: number; dir: 1 | -1; hard: boolean }
  /** A dish cart's dishes crashed. */
  | { type: "dishes"; x: number; y: number }
  /** The shift moved on: the next venue's card is up. */
  | { type: "venue"; id: LevelId }
  /** He walked into a stash he had already cleaned out. */
  | { type: "stashEmpty" }
  /** A cast member noticed him: the double-take. */
  | { type: "castNotice"; id: number; x: number; y: number }
  /** A cast member says a line (a speech bubble). */
  | { type: "castLine"; id: number; text: string; seconds: number }
  /** A hit landed on a cast member. `down`: knocked out by it. `points` go to the score. */
  /** `down`: knocked out by it; `drops`: it knocked what he carried (the tray, the cup, the pan, the book) out of his hands. */
  | { type: "castHit"; id: number; role: CastRole; job: CastJob; by: CastHitBy; x: number; y: number; dir: 1 | -1; down: boolean; points: number; drops: boolean }
  /** He landed on someone from above; `landed` is false when a student sidestepped. */
  | { type: "stomp"; x: number; y: number; landed: boolean }
  /** A student runs off (snot, or after a knock). */
  | { type: "castFlee"; id: number; x: number; y: number; points: number }
  /** Knocked out for good, a staffer drops what they carried: it jumps out of them at their middle. */
  | { type: "castDrop"; id: number; kind: PickupKind; x: number; y: number }
  /** Someone went down the open shaft. */
  | { type: "castFell"; id: number; x: number; y: number; points: number; line: string }
  /** An attack's telegraph: the ! burst and its sound. */
  | { type: "castWindup"; id: number; role: CastRole; x: number; y: number }
  /** The attack itself: a shove, a rush, a fling, a throw. */
  | { type: "castAttack"; id: number; role: CastRole; x: number; y: number }
  /** He walked into someone who was not attacking: a nudge and a line, no pip. */
  | { type: "castBump"; id: number; x: number; y: number }
  /** The office worker's coffee, all over him. */
  | { type: "castSplash"; x: number; y: number; kind: "coffee" | "grease" | "papers" }
  /** A marching office worker's phone, as he closes in. */
  | { type: "chime"; x: number; y: number; job: CastJob }
  /** A chain: the `count`th staffer bowled over by one moving thing; `oneUp` at eight. */
  | { type: "chain"; x: number; y: number; count: number; points: number; oneUp: boolean }
  /** A missile launched. */
  | { type: "missile"; kind: MissileKind; x: number; y: number }
  /** A missile landed on the floor (`floor`), a wall, or him (`hero`). */
  | { type: "missileHit"; kind: MissileKind; x: number; y: number; floor: boolean; hero: boolean }
  /** A missile swatted by the mallet. */
  | { type: "swat"; kind: MissileKind; x: number; y: number; points: number }
  /** The lecture froze a staffer where he stood. */
  | { type: "castFreeze"; id: number; x: number; y: number; points: number }
  /** The lecture sat a student down to sulk. */
  | { type: "castSchooled"; id: number; x: number; y: number; points: number }
  /** The lecture landed on `schooled` students and `frozen` staff (once per lecture that lands on anyone). */
  | { type: "lectureLand"; x: number; y: number; schooled: number; frozen: number }
  /** He crossed into the arena: the pig wakes ("PIG FIGHT"). */
  | { type: "pigWake"; x: number; y: number }
  /** A wind-up starts; `hop` when the attack it winds up for is a hop (the "BOING!" warning). */
  | { type: "pigWindup"; x: number; y: number; hop: boolean }
  | { type: "pigCharge"; x: number; y: number; dir: 1 | -1 }
  | { type: "pigHop"; x: number; y: number; dir: 1 | -1 }
  | { type: "pigLand"; x: number; y: number }
  /** A hit that counted: what it was, and the pig's HP and counts after it. */
  | { type: "pigHit"; by: "bonk" | "snot"; x: number; y: number; hp: number; bonks: number; snots: number }
  /** A hit that would have ended it short of the rule: held at 1 HP. */
  | { type: "pigHold"; word: "MORE BONKS" | "MORE SNOT"; x: number; y: number }
  | { type: "pigDown"; x: number; y: number; points: number }
  /** He landed on it from above and bounced off. */
  | { type: "pigBounce"; x: number; y: number }
  /** The lecture reached it: "It's a stuffed animal." */
  | { type: "pigShrug"; x: number; y: number }
  /** A refill pepper appeared at the arena's left edge. */
  | { type: "pigRefill"; x: number; y: number }
  /** The banquet's own events (R4): see src/sim/quests/hungry/events.ts. */
  | HungryEvent
  /** Fare Darts' own events (R5): see src/sim/quests/fares/events.ts. */
  | FaresEvent
  /** Back from a side quest's tally: what it paid. */
  | { type: "questPaid"; quest: QuestId; score: number; grade: string; doggy: boolean; flop: boolean; boxes: number; cans: number; lives: number }
  /** A doggy bag caught the hit that would have knocked him flat: he eats his leftovers, at his head. */
  | { type: "doggyBag"; x: number; y: number }
  | { type: "mode"; mode: GameMode };
