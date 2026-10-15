import type { TauntId } from "./taunts";

/** The shipped game's three staff roles, which its lines are keyed by. */
export type EnemyRole = "server" | "hotel" | "office";

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

/** The lobby cast's new lines (R2b): speech bubbles, never recordings. */
export const CAST_LINES = {
  bellhop: {
    notice: ["Welcome to the Marriott!", "Let me get that for you, sir.", "Right this way, sir.", "Luggage, sir?"],
    shove: ["Coming through!", "Cart!", "Make way, sir!"],
    bump: ["Sir, check-in is at four.", "Mind the cart, sir."],
    down: ["I'll get my manager.", "That's a resort fee, sir."],
    fall: "Luggaaage!",
  },
  server: {
    warn: ["Can I start you off with some waters?!", "Order up!", "Be right with you!!"],
    skid: ["Be right with you!", "Still working on that?"],
    bump: ["Behind you!", "Hot plate!"],
    down: ["I'm going on break.", "Is Pepsi okay? No? Okay."],
    fall: "Order uuup!",
  },
  office: {
    notice: ["Per my last email...", "Quick sync?", "Let's circle back."],
    march: ["Oh. Were you standing there?"],
    ambush: ["Got a minute?", "Can we take this offline?"],
    frozen: "Per my last em\u2014",
    down: ["I'm putting this in an email.", "Let's circle back."],
    fall: "Per my last emaaaail",
  },
  student: {
    notice: ["I'm rating your customer service.", "Say hi to the internet.", "This is going in the group chat.", "Sir, this is a hotel."],
    heads: "Heads up!",
    duck: "lol",
    snot: "EW!",
    fall: "Ratiooo",
  },
} as const;


export type CastJobName = "bellhop" | "server" | "office" | "student" | "cook" | "busser" | "lunch" | "prof";
/** Everything one job says: speech bubbles, never recordings. A role's fight reads the lines it needs; the rest stay empty. */
export type CastLineSet = {
  notice: readonly string[];
  bump: readonly string[];
  down: readonly string[];
  /** Said on the way down a pit. */
  fall: string;
  /** The cart's shove (the bellhop, the busser). */
  shove: readonly string[];
  /** The rush's warning and its skid (the server, the lunch worker). */
  warn: readonly string[];
  skid: readonly string[];
  /** Walked into head-on (the office worker, the cook, the professor). */
  march: readonly string[];
  /** Rearing up out of hiding (the office worker behind the screen, the cook behind the pass). */
  ambush: readonly string[];
  /** Frozen by the lecture; null sighs one of STAFF_SIGHS. */
  frozen: string | null;
};
const none: readonly string[] = [];

/** Every job's lines (R3 §4): the lobby's four as R2b wrote them, and the restaurant's and campus's new people. */
export const JOB_LINES: Record<CastJobName, CastLineSet> = {
  bellhop: { notice: CAST_LINES.bellhop.notice, bump: CAST_LINES.bellhop.bump, down: CAST_LINES.bellhop.down, fall: CAST_LINES.bellhop.fall, shove: CAST_LINES.bellhop.shove, warn: none, skid: none, march: none, ambush: none, frozen: null },
  server: { notice: STAFF_LINES.server, bump: CAST_LINES.server.bump, down: CAST_LINES.server.down, fall: CAST_LINES.server.fall, shove: none, warn: CAST_LINES.server.warn, skid: CAST_LINES.server.skid, march: none, ambush: none, frozen: null },
  office: { notice: CAST_LINES.office.notice, bump: CAST_LINES.office.notice, down: CAST_LINES.office.down, fall: CAST_LINES.office.fall, shove: none, warn: none, skid: none, march: CAST_LINES.office.march, ambush: CAST_LINES.office.ambush, frozen: CAST_LINES.office.frozen },
  student: { notice: CAST_LINES.student.notice, bump: none, down: none, fall: CAST_LINES.student.fall, shove: none, warn: none, skid: none, march: none, ambush: none, frozen: null },
  busser: {
    notice: ["Behind you!", "Are you still working on that?", "I just started here."],
    bump: ["Coming through!", "Hot plates!"],
    down: ["That's not my section.", "I just started here."],
    fall: "I quiiit",
    shove: ["Coming through!", "Bus cart!", "Heads up, sir!"],
    warn: none, skid: none, march: none, ambush: none, frozen: null,
  },
  cook: {
    notice: ["Who let him back here?", "Hands!", "Ninety-six on that."],
    bump: ["Behind!", "Corner!"],
    down: ["Who touched my station?", "I'm calling the chef."],
    fall: "Behiiind",
    shove: none, warn: none, skid: none,
    march: ["Behind!"],
    ambush: ["Order up!", "Hands!"],
    frozen: "Yes, chef.",
  },
  lunch: {
    notice: ["No cutting!", "One scoop, hon.", "You want gravy on that?"],
    bump: ["Keep it moving, hon.", "Tray, please."],
    down: ["That's it, I'm on break.", "I've been here thirty years."],
    fall: "Hooooon",
    shove: none,
    warn: ["Keep it moving, hon!", "Line's back there!"],
    skid: ["Next!", "Who's next?"],
    march: none, ambush: none, frozen: null,
  },
  prof: {
    notice: ["Office hours are Tuesdays.", "Are you in my section?", "Fascinating."],
    bump: ["Pardon me.", "Were you enrolled?"],
    down: ["I'm putting this in my memoir.", "That's going on your transcript."],
    fall: "Tenuuure",
    shove: none, warn: none, skid: none,
    march: ["Pardon me. Were you enrolled?"],
    ambush: none,
    frozen: "Fascinating. Go on.",
  },
};

export const IMPACT_WORDS = ["BONK!", "WHAM!", "CLONK!", "THWACK!"];

/** Stable pick so a given staffer always opens with the same line. */
export function pick<T>(list: readonly T[], seed: number): T {
  return list[(Math.abs(Math.floor(seed)) || 0) % list.length];
}
