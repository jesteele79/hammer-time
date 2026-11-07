import type { CastHitBy, CastJob, CastRole } from "./cast";
import type { GameMode } from "./game";
import type { HungryEvent } from "./quests/hungry/events";
import type { FaresEvent } from "./quests/fares/events";
import type { QuestId } from "./quests/quest";
import type { MissileKind } from "./missiles";
import type { CrateKind, DoorKind, Lesson, LevelId } from "./level";
import type { PickupKind } from "./rewards";
import type { Rect } from "./types";
import type { TauntId } from "../game/taunts";

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
  | { type: "hit"; by: "mallet" | "snot" | "burst" | "shield" | "cart"; x: number; y: number; target: number }
  | { type: "superStart" }
  | { type: "burst"; x: number; y: number }
  | { type: "sniff" }
  | { type: "fire"; x: number; y: number; hot: boolean }
  /** A box of #15 blades left his hand; it froze a staffer or a student (R5 §9); something stopped it, or it landed. */
  | { type: "sampleThrow"; x: number; y: number }
  | { type: "sampleHit"; id: number; role: CastRole; x: number; y: number; points: number }
  | { type: "sampleStop"; x: number; y: number; on: "pig" | "cart" | "wall" | "floor" }
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
  /**
   * A journey level is over (its tally counted): `score` what he scored inside it, `bonked` the staff bonked since its
   * card, `last` when no level follows it in this run. The game holds in `story` for the shell's cards.
   */
  | { type: "levelDone"; id: LevelId; score: number; bonked: number; last: boolean }
  /** Hammer's thought, written, never spoken: the home screen's insults, a level's marks. */
  | { type: "think"; text: string; seconds: number }
  /** He did a move for the first time this run: its lesson stops teaching it. */
  | { type: "lesson"; move: Lesson }
  /** He stepped onto a flat-top or into the walk-in. */
  | { type: "heatZone"; kind: "flattop" | "freezer" | "steam" | "beam"; x: number; y: number }
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
  /** A boss beside the pig: its telegraph, a wave of what it sends, a hit that counted, and down. */
  | { type: "bossWindup"; x: number; y: number }
  | { type: "bossWave"; x: number; y: number; n: number }
  | { type: "bossHit"; by: "bonk" | "snot"; x: number; y: number; hp: number; points?: number }
  | { type: "bossDown"; x: number; y: number; points: number }
  /** The train: aboard with what was left of the clock; the doors beeping; the clock out; a shove in the crowd; the board lit; the tunnel; a bogie underfoot; a connecting door opened; the conductor staggered and summoned. */
  | { type: "boarded"; bonus: number }
  | { type: "doorsBeep" }
  | { type: "stretchOut" }
  | { type: "shoved"; x: number; y: number }
  | { type: "board" }
  | { type: "tunnel" }
  | { type: "bogie" }
  | { type: "doorOpen"; door: number }
  | { type: "bossStagger"; x: number; y: number }
  | { type: "conductorPunch"; fromX: number }
  | { type: "summon" }
  /** Paris: the gate opened; the window tipping him off; a scooter out; the pigeons up. */
  | { type: "bonjour" }
  | { type: "tip"; x: number; y: number }
  | { type: "scooter"; id: string }
  | { type: "pigeons"; x: number; y: number }
  /** What a boss says, in a bubble at their head. */
  | { type: "bossSay"; text: string; seconds: number }
  /** The cabin: the drinks cart comes out, shoves him back so many rows, leaves its tray; the seatbelt chime and a bag; the kid's tablet; the curtain pulled back; he takes his seat. */
  | { type: "cartOut" }
  | { type: "shove"; rows: number; x: number; y: number }
  | { type: "tray"; kind: PickupKind; x: number; y: number }
  | { type: "seatbelt" }
  | { type: "bagDrop"; x: number; lx: number }
  | { type: "tablet" }
  | { type: "curtain" }
  | { type: "sit"; x: number; y: number }
  /** Down a laundry chute: a floor lost, and the slide's seconds. */
  | { type: "chute"; x: number; y: number }
  /** He hit a wet floor: spun back, a moment without control. */
  | { type: "slip"; x: number; y: number }
  /** The guard's flashlight shines the way he faces; it caught him: no control for a moment. */
  | { type: "flash"; id: number; x: number; y: number; facing: 1 | -1 }
  | { type: "stunned"; x: number; y: number }
  /** A throw on the world's clock: one plane of a reply-all. */
  | { type: "castThrow"; id: number; x: number; y: number; t: number }
  /** A keycard counted toward his status (`n` he holds now); a tier reached: its name and comic word, over his head. */
  | { type: "keycard"; n: number; x: number; y: number }
  /** The suite: a bed's bounce, his move to the next room, the grab's wind-up, landing and what it took, what he gave back, the rail. */
  | { type: "bounce"; x: number; y: number }
  | { type: "bossPhase"; phase: number; room: number }
  /** The training room (3-6): the ring light turned off him; one of the owner's recordings, forced, not rolled; the kid carried out. */
  | { type: "beamTurn"; x: number }
  | { type: "voiceLine"; id: TauntId | "curse" }
  | { type: "carryOut"; x: number; y: number }
  | { type: "bossCall" }
  | { type: "grab"; phase: "windup" | "land" | "take"; x: number; y: number; n?: number }
  | { type: "giveBack"; n: number; x: number; y: number }
  | { type: "pool"; x: number; y: number }
  /** An apple sent back the way it came. */
  | { type: "batted"; x: number; y: number; points: number }
  /** A door in the hall: its handle turning, its leaf swung across, shut again. */
  | { type: "hallDoor"; z: number; side: 1 | -1; phase: "handle" | "open" | "shut" }
  /** The mallet on room 1417's reader: a failure, or the door giving way. */
  | { type: "keyFail"; n: number; x: number; y: number }
  | { type: "keyOpen"; x: number; y: number }
  | { type: "tier"; name: string; word: string; x: number; y: number }
  /** A doggy bag caught the hit that would have knocked him flat: he eats his leftovers, at his head. */
  | { type: "doggyBag"; x: number; y: number }
  /** An errand done at its counter (3-4): `n` of `of`, and where. */
  | { type: "errand"; id: string; n: number; of: number; x: number; y: number }
  /** Walked into the office door before the errands were done. */
  | { type: "errandsShut"; x: number; y: number }
  /** The parade (3-4): a band's pipes up and its drone, its first step; caught by a rank and carried, dropped behind it. */
  | { type: "bandRise"; id: string; x: number }
  | { type: "bandStep"; id: string; x: number }
  | { type: "caught"; x: number }
  | { type: "dropped"; x: number }
  /** The drum corps' fourth beat, and him knocked off a barrier or a bleacher by it. */
  | { type: "drumHit"; x: number }
  | { type: "knocked"; x: number; y: number }
  /** The drum major (3-4): his whistle, the mace thrown up and coming down (on Hammer, or not), the handover, and the pipers who fall in. */
  | { type: "whistle"; x: number; y: number }
  | { type: "maceUp"; x: number; y: number }
  | { type: "maceLand"; x: number; y: number; hit: boolean }
  | { type: "handover"; x: number; y: number }
  | { type: "follow"; n: number }
  /** 3-5: a sharps bin brushed; the code blue stretch entered or left. */
  | { type: "sharps"; x: number; y: number }
  | { type: "codeBlue"; on: boolean }
  /** 3-5: a nurse's sanitizer on the floor at his feet, and him slipping on it. */
  | { type: "spray"; id: number; x: number; y: number }
  | { type: "slipped"; x: number; y: number }
  | { type: "mode"; mode: GameMode };
