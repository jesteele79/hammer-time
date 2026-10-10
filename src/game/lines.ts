import type { EnemyRole } from "./levels";
import type { TauntId } from "./taunts";

/**
 * One of Hammer's lines. Only the six recordings carry a clip; a line without
 * one is drawn as a thought bubble. Giving a line a clip makes it spoken.
 */
export type Line = { text: string; clip?: TauntId | "damage" };
const think = (text: string): Line => ({ text });

/** Captions for the five supplied recordings. */
export const TAUNT_LINES: Record<TauntId, Line> = {
  fired: { text: "They need to get fired.", clip: "fired" },
  feedback: { text: "They can't take feedback.", clip: "feedback" },
  problem: { text: "They got a problem.", clip: "problem" },
  "man-balls": { text: "Go grow some man balls.", clip: "man-balls" },
  "butt-hurt": { text: "They get all butt hurt.", clip: "butt-hurt" },
};
export const DAMAGE_LINE: Line = { text: "ABSOLUTE BULLSHIT", clip: "damage" };

/** What the staff say before Hammer gets to them. */
export const STAFF_LINES: Record<EnemyRole, string[]> = {
  server: [
    "Can I start you off with some waters?",
    "Is Pepsi okay?",
    "Are we still working on that?",
    "Have you dined with us before?",
    "We're out of Coke Zero.",
    "I'll be taking care of you today!",
    "Order up!",
  ],
  hotel: [
    "Check-in is at four, sir.",
    "There's a daily resort fee.",
    "Your room isn't ready yet.",
    "Would you like to upgrade?",
    "Valet only, sir.",
    "Housekeeping!",
  ],
  office: ["Per my last email...", "Let's circle back.", "Can we take this offline?", "Quick sync?"],
};

/** Hammer's reply when the mallet lands and no recorded line is playing. */
export const STAFF_COMEBACKS: Record<EnemyRole, Line[]> = {
  server: [
    "I said NO ice.",
    "Coke ZERO. Not Diet.",
    "Get me your manager.",
    "That's coming out of your tip.",
    "Did I stutter?",
  ].map(think),
  hotel: ["I've had status since '98.", "Resort fee THIS.", "Who trained you?", "Unbelievable."].map(think),
  office: ["Circle back on THIS.", "Reply all to that.", "Consider this my feedback."].map(think),
};

export const LECTURES: Line[] = [
  "Let me explain this slowly.",
  "Back in my day, we read the syllabus.",
  "When I was your age, I had two jobs.",
  "Look at me when I'm talking to you.",
  "A participation trophy is not an achievement.",
  "Sit up straight. Both feet on the floor.",
  "That is not a real major.",
].map(think);

/** Hammer's opener to a student, and what the student says back. */
export const STUDENT_EXCHANGES: { hammer: Line; reply: string }[] = [
  ["Read the syllabus, rookie.", "It's on the rubric."],
  ["That's not extra credit.", "I just asked for directions."],
  ["Office hours are over.", "Sir, this is the dining hall."],
  ["Your group project is a mess.", "We put your name on it."],
  ["Put the phone down, scholar.", "I'm rating your customer service."],
  ["That paper better be double-spaced.", "It's a paper airplane."],
  ["No extensions. Ever.", "You missed the deadline too."],
].map(([hammer, reply]) => ({ hammer: think(hammer), reply }));

export const ASIDES = {
  better: think("Ahh. Better."),
  hammerTime: think("HAMMER TIME."),
  anyDayNow: think("Any day now."),
};

export const RETORTS = [
  "Okay, boomer.",
  "Literally who asked.",
  "Sir, this is a dining hall.",
  "That's lowkey unhinged.",
  "I'm telling my TA.",
  "Ratio.",
];

export const STAFF_SIGHS = ["Sir, I just work here.", "I'll get my manager.", "Noted, sir.", "Wow. Okay."];


export const IMPACT_WORDS = ["BONK!", "WHAM!", "CLONK!", "THWACK!"];

/** Stable pick so a given staffer always opens with the same line. */
export function pick<T>(list: readonly T[], seed: number): T {
  return list[(Math.abs(Math.floor(seed)) || 0) % list.length];
}
