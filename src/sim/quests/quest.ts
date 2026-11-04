import type { Fares } from "./fares/fares";
import type { Hungry } from "./hungry/hungry";

/** The side quests (R4, R5): one at a time, behind a lobby door or from the start screen. */
export type QuestId = "hungry" | "fares" | "lounge";
export type Quest = Hungry | Fares;
export const QUEST_NAMES: Record<QuestId, string> = { hungry: "Hungry Hungry Hammer", fares: "Fare Darts", lounge: "The M CLUB" };
/** Which side quest a round is: the lounge is the banquet's engine (`id` "hungry") under its own menu. */
export const questIdOf = (q: Quest): QuestId => (q.id === "fares" ? "fares" : q.menu === "lounge" ? "lounge" : "hungry");
