import type { Fares } from "./fares/fares";
import type { Hungry } from "./hungry/hungry";

/** The side quests (R4, R5): one at a time, behind a lobby door or from the start screen. */
export type QuestId = "hungry" | "fares";
export type Quest = Hungry | Fares;
export const QUEST_NAMES: Record<QuestId, string> = { hungry: "Hungry Hungry Hammer", fares: "Fare Darts" };
