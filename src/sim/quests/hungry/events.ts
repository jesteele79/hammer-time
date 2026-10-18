import type { FoodKind } from "./food";
import type { EaterId, RivalId } from "./table";

/**
 * What happened at the banquet in one step (R4). Positions are on the table top (x to the right, y toward the far side,
 * its middle at 0, 0): the scene puts them on screen with `onScreen`.
 */
export type HungryEvent =
  /** Food poured from the chute, a tray or the cart's crash: how many, and which. */
  | { type: "hhDump"; x: number; y: number; count: number; kinds: FoodKind[]; cart: boolean }
  | { type: "hhDive"; who: EaterId; charged: boolean }
  /** A hand swept dishes up. */
  | { type: "hhChomp"; who: EaterId; x: number; y: number; count: number }
  /** A dish landed on a plate; on his, the points it scored. */
  | { type: "hhLand"; who: EaterId; kind: FoodKind; points: number }
  | { type: "hhRob"; from: RivalId; kind: FoodKind; x: number; y: number }
  | { type: "hhClash"; x: number; y: number }
  | { type: "hhSwing" }
  /** The mallet met the rim; `hit` when it caught a rival, the server, a suitcase or paper. */
  | { type: "hhBonk"; x: number; y: number; hit: boolean }
  | { type: "hhStun"; who: RivalId; x: number; y: number }
  /** The server dropped her tray at his end. */
  | { type: "hhTray"; x: number; y: number }
  /** A diner slapped his hand away from their plate, at where his hand was; `curse` on every third, when he says it. */
  | { type: "hhSlap"; who: RivalId; x: number; y: number; curse: boolean }
  /** A tap of ← or → hopped his line onto a diner's plate. */
  | { type: "hhLock"; who: RivalId }
  /** He started a lecture (E); the scene picks his line. */
  | { type: "hhLecture" }
  /** The lecture landed on a diner or the server: frozen where they stand, at their plate or their spot. */
  | { type: "hhSchooled"; who: RivalId | "server"; x: number; y: number }
  /** The student let a paper plane go. */
  | { type: "hhPlane"; x: number; y: number }
  /** A plane reached his spot: `hit` costs 150; otherwise he was ducked or out on the table. */
  | { type: "hhPaper"; x: number; y: number; hit: boolean }
  | { type: "hhSwat"; x: number; y: number }
  /** The bellhop's suitcase went on the cloth (`on`) or came off it. */
  | { type: "hhSuitcase"; x: number; y: number; on: boolean }
  | { type: "hhCart"; x: number; y: number }
  /** The server cleared dishes off the rim. */
  | { type: "hhBus"; x: number; y: number; count: number }
  /** A rival's or the server's line: a speech bubble. */
  | { type: "hhSay"; who: RivalId | "server"; text: string; seconds: number }
  /** His line: a thought. */
  | { type: "hhThink"; text: string; seconds: number }
  | { type: "hhEnd"; score: number; grade: string };
