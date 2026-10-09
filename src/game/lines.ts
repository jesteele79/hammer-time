import type { EnemyRole } from "./levels";
import type { TauntId } from "./taunts";

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
export const STAFF_COMEBACKS: Record<EnemyRole, string[]> = {
  server: [
    "I said NO ice.",
    "Coke ZERO. Not Diet.",
    "Get me your manager.",
    "That's coming out of your tip.",
    "Did I stutter?",
  ],
  hotel: ["I've had status since '98.", "Resort fee THIS.", "Who trained you?", "Unbelievable."],
  office: ["Circle back on THIS.", "Reply all to that.", "Consider this my feedback."],
};

export const LECTURES = [
  "Let me explain this slowly.",
  "Back in my day, we read the syllabus.",
  "When I was your age, I had two jobs.",
  "Look at me when I'm talking to you.",
  "A participation trophy is not an achievement.",
  "Sit up straight. Both feet on the floor.",
  "That is not a real major.",
];

export const RETORTS = [
  "Okay, boomer.",
  "Literally who asked.",
  "Sir, this is a dining hall.",
  "That's lowkey unhinged.",
  "I'm telling my TA.",
  "Ratio.",
];

export const STAFF_SIGHS = ["Sir, I just work here.", "I'll get my manager.", "Noted, sir.", "Wow. Okay."];

/** Captions for the five supplied recordings. */
export const SUBTITLES: Record<TauntId, string> = {
  fired: "They need to get fired.",
  feedback: "They can't take feedback.",
  problem: "They got a problem.",
  "man-balls": "Go grow some man balls.",
  "butt-hurt": "They get all butt hurt.",
};

export const IMPACT_WORDS = ["BONK!", "WHAM!", "CLONK!", "THWACK!"];

/** Stable pick so a given staffer always opens with the same line. */
export function pick<T>(list: readonly T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length];
}
