import {
  TAUNT_FILES,
  TAUNT_CHANCE,
  TAUNT_GAP_SECONDS,
  TauntRotation,
  type TauntId,
  type TauntTarget,
} from "./taunts";

/** Every place's song (story spec §13): the home screen's, each level's, the stash's and the two side quests'. */
export type SongId = "title" | "sat" | "lobby" | "restaurant" | "campus" | "arena" | "cellar" | "banquet" | "gate" | "lobby-night" | "lounge" | "tower" | "hallway" | "suite" | "flight" | "paris" | "french" | "train" | "basel" | "lab" | "replacement";
export type Theme = SongId;
/** The music's level, and the share of it left under the cards (plan decision 12's quiet). */
export const MUSIC = { level: 0.07, quiet: 0.4 } as const;
/** The effects' level at full volume. */
const EFFECTS_LEVEL = 0.14;

/**
 * A side quest's song (owner, 2026-10-25: "some other bonkers music for this side quest and hungry hungry hammer"):
 * sixteenth-note steps, MIDI notes (0 a rest) for the lead and the bass, drum lines a bar long that repeat ("x" a hit),
 * a voice doubling the lead over part of it, and gags on given steps.
 */
export type Song = {
  /** Seconds a sixteenth. */
  step: number;
  lead: number[];
  leadWave: OscillatorType;
  /** Steps a lead note sounds. */
  leadLen: number;
  double?: { from: number; to: number; shift: number; wave: OscillatorType };
  bass: number[];
  bassWave: OscillatorType;
  bassLen: number;
  kick: string;
  snare: string;
  /** The snare's level, if not the full kit's: brushes. */
  snareGain?: number;
  hat: string;
  gags: Record<number, "whistle" | "honk" | "chime" | "jet">;
  /** A song in sections of four bars (3-6, one for each of a fight's rounds): each section's own drum lines, a bar long. */
  sections?: { kick: string; snare: string; hat: string }[];
};
/** Steps in a section: four bars of sixteenths. */
const SECTION_STEPS = 64;
/** Where in a song `length` steps long its `step`th sixteenth falls: the whole song round, or section `section`'s four bars round. */
export const sectionStep = (step: number, length: number, section: number | null): number =>
  section === null || (section + 1) * SECTION_STEPS > length ? step % length : section * SECTION_STEPS + (step % SECTION_STEPS);
const bars = (...b: number[][]) => b.flat();
/** A bossa-nova bar: the root, the fifth on the and of two and on three, the root again at the end. */
const bossa = (root: number, fifth: number) => [root, 0, 0, 0, 0, 0, fifth, 0, fifth, 0, 0, 0, 0, 0, root, 0];
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
/** The tower's lead: one bar's motif, a semitone higher each bar of the fourteen. */
const CLIMB_MOTIF = [60, 0, 64, 0, 67, 0, 64, 0, 72, 0, 67, 0, 64, 0, 67, 0];
const climbing = (motif: number[], bars: number) => Array.from({ length: bars }, (_, k) => motif.map((n) => (n ? n + k : 0))).flat();
/** Its bass under it, a square on the root and fifth, climbing with it. */
const CLIMB_BASS = [36, 0, 36, 0, 43, 0, 36, 0, 36, 0, 36, 0, 43, 0, 41, 0];
/** The musette's waltz (story spec §13), twelve steps a bar: A minor, an accordion's turn at the end of each four. */
const WALTZ_LEAD = bars(
  [76, 0, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0],
  [71, 0, 72, 0, 74, 0, 0, 0, 76, 0, 0, 0],
  [77, 0, 0, 0, 74, 0, 0, 0, 69, 0, 0, 0],
  [72, 0, 74, 0, 77, 0, 0, 0, 81, 0, 0, 0],
  [80, 0, 0, 0, 76, 0, 0, 0, 71, 0, 0, 0],
  [74, 0, 76, 0, 80, 0, 0, 0, 83, 0, 0, 0],
  [81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0],
  [71, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0],
  [72, 0, 76, 0, 79, 0, 0, 0, 84, 0, 0, 0],
  [83, 0, 0, 0, 79, 0, 0, 0, 74, 0, 0, 0],
  [72, 0, 76, 0, 81, 0, 0, 0, 84, 0, 0, 0],
  [83, 0, 0, 0, 80, 0, 0, 0, 76, 0, 0, 0],
  [77, 0, 81, 0, 86, 0, 0, 0, 84, 0, 81, 0],
  [84, 0, 81, 0, 76, 0, 0, 0, 72, 0, 0, 0],
  [71, 0, 74, 0, 76, 0, 80, 0, 83, 0, 80, 0],
  [81, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
);
/** A waltz's bass, a bar in twelve: the root low on one, its octave on two and three. */
const oomPah = (root: number) => [root, 0, 0, 0, root + 12, 0, 0, 0, root + 12, 0, 0, 0];
const WALTZ_BASS = bars(...[45, 45, 38, 38, 40, 40, 45, 45, 48, 43, 45, 40, 38, 45, 40, 45].map(oomPah));
/** Every sixteen steps of a song this many bars long: the elevator's ding through the tower. */
const everyBar = (count: number): Record<number, "chime"> => Object.fromEntries(Array.from({ length: count }, (_, k) => [k * 16, "chime" as const]));

export const SONGS: Record<SongId, Song> = {
  // 3-6 (story spec §13): twelve bars at 88, a section for each round: the lo-fi content beat, the beat with the bass drive
  // in, the boss drive with the lead an octave up and the snare on two and four.
  replacement: {
    step: 60 / 88 / 4,
    lead: bars(
      ...Array.from({ length: 8 }, () => [67, 0, 0, 70, 0, 0, 67, 0, 0, 0, 70, 0, 0, 0, 0, 0]),
      ...Array.from({ length: 4 }, () => [79, 0, 0, 82, 0, 0, 79, 0, 0, 0, 82, 0, 0, 0, 0, 0]),
    ),
    leadWave: "square",
    leadLen: 2,
    bass: bars(
      ...Array.from({ length: 4 }, () => new Array<number>(16).fill(0)),
      ...Array.from({ length: 8 }, () => [38, 0, 0, 0, 0, 0, 38, 0, 41, 0, 0, 0, 0, 0, 41, 0]),
    ),
    bassWave: "sawtooth",
    bassLen: 2,
    kick: "x.......x.......",
    snare: "................",
    hat: "..x...x...x...x.",
    gags: {},
    sections: [
      { kick: "x.......x.......", snare: "................", hat: "..x...x...x...x." },
      { kick: "x..x..x.x..x..x.", snare: "................", hat: "..x...x...x...x." },
      { kick: "x..x..x.x..x..x.", snare: "....x.......x...", hat: "..x...x...x...x." },
    ],
  },
  // 3-5 (story spec §13): the monitor's beep at 72 over sparse pads, two slow chords on a triangle.
  lab: {
    step: 60 / 72 / 4,
    // The monitor at 72: a beep on every beat.
    lead: bars(...Array.from({ length: 4 }, () => [88, 0, 0, 0, 88, 0, 0, 0, 88, 0, 0, 0, 88, 0, 0, 0])),
    leadWave: "sine",
    leadLen: 1,
    bass: bars(...Array.from({ length: 4 }, (_, k) => [k % 2 ? 53 : 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    bassWave: "triangle",
    bassLen: 16,
    kick: "................",
    snare: "................",
    hat: "x......x........",
    gags: {},
  },
  // 3-4 (story spec §13): the bands themselves, a chanter on the pipes' nine notes over the drone, the drum corps' beat as
  // the level's: four to the bar at 96, its fourth beat the shake.
  basel: {
    step: 60 / 96 / 4,
    lead: bars(
      [69, 0, 73, 0, 76, 0, 0, 0, 76, 0, 78, 0, 76, 0, 73, 0],
      [74, 0, 0, 0, 73, 0, 71, 0, 69, 0, 71, 0, 73, 0, 0, 0],
      [69, 0, 73, 0, 76, 0, 0, 0, 81, 0, 80, 0, 78, 0, 76, 0],
      [78, 0, 76, 0, 74, 0, 73, 0, 71, 0, 0, 0, 0, 0, 0, 0],
      [76, 0, 0, 0, 81, 0, 0, 0, 83, 0, 81, 0, 80, 0, 78, 0],
      [76, 0, 78, 0, 80, 0, 81, 0, 78, 0, 0, 0, 76, 0, 0, 0],
      [74, 0, 76, 0, 78, 0, 76, 0, 73, 0, 74, 0, 76, 0, 0, 0],
      [73, 0, 71, 0, 69, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "sawtooth",
    leadLen: 2,
    bass: bars(...Array.from({ length: 8 }, () => [45, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    bassWave: "triangle",
    bassLen: 16,
    kick: "x...x...x...x...",
    snare: "..x...x...x...x.",
    hat: "x.x.x.x.x.x.x.x.",
    gags: {},
  },
  // 3-1, the safety video's muzak: two chords, a marimba's short notes, brushed hats, 92 to the minute.
  flight: {
    step: 60 / 92 / 4,
    lead: bars(
      [72, 0, 0, 76, 0, 0, 79, 0, 0, 0, 76, 0, 0, 0, 0, 0],
      [77, 0, 0, 74, 0, 0, 70, 0, 0, 0, 74, 0, 0, 0, 0, 0],
      [72, 0, 0, 76, 0, 0, 79, 0, 81, 0, 79, 0, 76, 0, 0, 0],
      [77, 0, 0, 81, 0, 0, 82, 0, 81, 0, 77, 0, 74, 0, 0, 0],
      [84, 0, 0, 81, 0, 0, 79, 0, 0, 0, 76, 0, 0, 0, 0, 0],
      [82, 0, 0, 77, 0, 0, 74, 0, 0, 0, 70, 0, 0, 0, 0, 0],
      [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 0, 0, 0, 0, 0, 0],
      [70, 0, 74, 0, 77, 0, 74, 0, 70, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "triangle",
    leadLen: 1.5,
    bass: bars(
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 46, 0, 0, 0, 0, 0, 0, 0],
    ),
    bassWave: "sine",
    bassLen: 6,
    kick: "x.......x.......",
    snare: "................",
    hat: "x.x.x.x.x.x.x.x.",
    gags: {},
  },
  // 3-2, a musette: two saws a hair apart for the accordion, a waltz bass in three, 150 to the minute.
  paris: {
    step: 0.1,
    lead: WALTZ_LEAD,
    leadWave: "sawtooth",
    leadLen: 3,
    double: { from: 0, to: WALTZ_LEAD.length, shift: 0.12, wave: "sawtooth" },
    bass: WALTZ_BASS,
    bassWave: "triangle",
    bassLen: 3,
    kick: "x...........",
    snare: "............",
    hat: "....x...x...",
    gags: {},
  },
  // The French table: the musette's quick cousin, the same tune 1.4 times the speed, with a brush snare.
  french: {
    step: 0.1 / 1.4,
    lead: WALTZ_LEAD,
    leadWave: "sawtooth",
    leadLen: 3,
    double: { from: 0, to: WALTZ_LEAD.length, shift: 0.12, wave: "sawtooth" },
    bass: WALTZ_BASS,
    bassWave: "triangle",
    bassLen: 3,
    kick: "x...........",
    snare: "....x...x...",
    snareGain: 0.05,
    hat: "x.x.x.x.x.x.",
    gags: {},
  },
  // 3-3, a rail clatter in four at 128: the wheels on the kick, a low drone, two notes over it. The horn is the tunnel's own cue.
  train: {
    step: 60 / 128 / 4,
    lead: bars(
      [69, 0, 0, 0, 0, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0, 72, 0, 0, 0],
      [69, 0, 0, 0, 0, 0, 72, 0, 0, 0, 0, 0, 69, 0, 0, 0],
      [0, 0, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0],
      [81, 0, 0, 0, 0, 0, 0, 0, 84, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 81, 0, 0, 0, 0, 0, 0, 0, 84, 0, 0, 0],
      [81, 0, 0, 0, 0, 0, 84, 0, 0, 0, 0, 0, 81, 0, 0, 0],
      [0, 0, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "square",
    leadLen: 3,
    bass: bars(...Array.from({ length: 8 }, (_, k) => [k % 4 === 3 ? 41 : 38, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    bassWave: "sawtooth",
    bassLen: 16,
    kick: "x.x.....x.x.....",
    snare: "....x.......x...",
    snareGain: 0.05,
    hat: "x.xxx.xxx.xxx.xx",
    gags: {},
  },
  // The home screen's title tune (story spec §13): four bars of brass fanfare, the lead doubled a fifth below on a
  // sawtooth, landing on the title's jolt; then a slow swagger, a blues strut in C over a walking bass.
  title: {
    step: 0.16,
    lead: bars(
      [67, 0, 0, 67, 72, 0, 0, 0, 76, 0, 0, 0, 79, 0, 0, 0],
      [0, 0, 0, 0, 76, 0, 79, 0, 84, 0, 0, 0, 0, 0, 0, 0],
      [81, 0, 0, 81, 79, 0, 0, 0, 77, 0, 76, 0, 74, 0, 0, 0],
      [72, 0, 0, 0, 0, 0, 0, 0, 79, 0, 0, 0, 84, 0, 0, 0],
      [0, 0, 72, 0, 0, 75, 76, 0, 0, 0, 79, 0, 0, 0, 76, 0],
      [0, 0, 72, 0, 0, 75, 76, 0, 0, 0, 74, 0, 72, 0, 0, 0],
      [0, 0, 77, 0, 0, 80, 81, 0, 0, 0, 79, 0, 0, 0, 77, 0],
      [0, 0, 76, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0, 0, 0],
    ),
    leadWave: "sawtooth",
    leadLen: 2,
    double: { from: 0, to: 64, shift: -7, wave: "sawtooth" },
    bass: bars(
      [48, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0],
      [48, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 48, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0],
      [48, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 36, 0, 0, 0],
      [36, 0, 0, 0, 40, 0, 0, 0, 43, 0, 0, 0, 45, 0, 0, 0],
      [36, 0, 0, 0, 40, 0, 0, 0, 43, 0, 0, 0, 46, 0, 0, 0],
      [41, 0, 0, 0, 45, 0, 0, 0, 48, 0, 0, 0, 46, 0, 0, 0],
      [43, 0, 0, 0, 41, 0, 0, 0, 40, 0, 0, 0, 38, 0, 0, 0],
    ),
    bassWave: "triangle",
    bassLen: 3.5,
    kick: "x.......x.......",
    snare: "....x.......x..x",
    hat: "x...x...x...x...",
    gags: {},
  },
  // SAT's "Pre-Check": terminal muzak, a soft sine lead over Bb major's slow changes, the boarding chime every eight
  // bars.
  sat: {
    step: 0.15,
    lead: bars(
      [74, 0, 0, 0, 72, 0, 70, 0, 0, 0, 69, 0, 70, 0, 0, 0],
      [70, 0, 0, 0, 74, 0, 72, 0, 0, 0, 70, 0, 67, 0, 0, 0],
      [72, 0, 0, 0, 75, 0, 74, 0, 0, 0, 72, 0, 70, 0, 0, 0],
      [69, 0, 0, 0, 72, 0, 75, 0, 0, 0, 74, 0, 72, 0, 0, 0],
      [77, 0, 0, 0, 74, 0, 77, 0, 0, 0, 81, 0, 79, 0, 0, 0],
      [79, 0, 0, 0, 77, 0, 74, 0, 0, 0, 72, 0, 70, 0, 0, 0],
      [75, 0, 0, 0, 74, 0, 72, 0, 0, 0, 70, 0, 72, 0, 0, 0],
      [74, 0, 0, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [79, 0, 0, 0, 77, 0, 75, 0, 0, 0, 74, 0, 75, 0, 0, 0],
      [77, 0, 0, 0, 74, 0, 72, 0, 0, 0, 69, 0, 72, 0, 0, 0],
      [75, 0, 0, 0, 72, 0, 70, 0, 0, 0, 67, 0, 70, 0, 0, 0],
      [72, 0, 0, 0, 69, 0, 72, 0, 0, 0, 75, 0, 74, 0, 0, 0],
      [74, 0, 0, 0, 72, 0, 70, 0, 0, 0, 74, 0, 77, 0, 0, 0],
      [79, 0, 0, 0, 77, 0, 74, 0, 0, 0, 72, 0, 0, 0, 0, 0],
      [72, 0, 0, 0, 74, 0, 75, 0, 0, 0, 72, 0, 69, 0, 0, 0],
      [70, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "sine",
    leadLen: 3.4,
    bass: bars(
      [46, 0, 0, 0, 0, 0, 0, 0, 53, 0, 0, 0, 0, 0, 0, 0],
      [43, 0, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 53, 0, 0, 0, 0, 0, 0, 0],
      [43, 0, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [39, 0, 0, 0, 0, 0, 0, 0, 46, 0, 0, 0, 0, 0, 0, 0],
      [38, 0, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 53, 0, 0, 0, 0, 0, 0, 0],
      [43, 0, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
    bassWave: "triangle",
    bassLen: 7,
    kick: "x.......x.......",
    snare: "................",
    hat: "..x...x...x...x.",
    gags: { 0: "chime", 128: "chime" },
  },
  // 1-1's muzak: a slow arpeggio on a triangle up and down F major's changes, brushed hats, a bass on the half notes.
  lobby: {
    step: 0.14,
    lead: bars(
      [65, 0, 69, 0, 72, 0, 76, 0, 77, 0, 76, 0, 72, 0, 69, 0],
      [62, 0, 65, 0, 69, 0, 72, 0, 74, 0, 72, 0, 69, 0, 65, 0],
      [67, 0, 70, 0, 74, 0, 77, 0, 79, 0, 77, 0, 74, 0, 70, 0],
      [60, 0, 64, 0, 67, 0, 70, 0, 72, 0, 70, 0, 67, 0, 64, 0],
      [65, 0, 69, 0, 72, 0, 76, 0, 77, 0, 0, 0, 76, 0, 72, 0],
      [69, 0, 72, 0, 76, 0, 79, 0, 81, 0, 79, 0, 76, 0, 72, 0],
      [70, 0, 74, 0, 77, 0, 81, 0, 82, 0, 81, 0, 77, 0, 74, 0],
      [72, 0, 70, 0, 67, 0, 64, 0, 60, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "triangle",
    leadLen: 1.8,
    bass: bars(
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [38, 0, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0],
      [43, 0, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
      [45, 0, 0, 0, 0, 0, 0, 0, 52, 0, 0, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 53, 0, 0, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0],
    ),
    bassWave: "triangle",
    bassLen: 7,
    kick: "x.......x.......",
    snare: "................",
    hat: "x.x.x.x.x.x.x.x.",
    gags: {},
  },
  // 1-2's bossa: a syncopated bass under two-note comping (the lead and its double a fourth below) through D minor's
  // changes, then a little tune on its own.
  restaurant: {
    step: 0.12,
    lead: bars(
      [77, 0, 0, 81, 0, 0, 77, 0, 0, 0, 74, 0, 0, 77, 0, 0],
      [76, 0, 0, 79, 0, 0, 76, 0, 0, 0, 79, 0, 0, 76, 0, 0],
      [76, 0, 0, 79, 0, 0, 72, 0, 0, 0, 76, 0, 0, 79, 0, 0],
      [79, 0, 0, 76, 0, 0, 79, 0, 0, 0, 76, 0, 0, 79, 0, 0],
      [81, 0, 0, 79, 0, 0, 77, 0, 0, 0, 76, 0, 74, 0, 0, 0],
      [79, 0, 0, 77, 0, 0, 76, 0, 0, 0, 74, 0, 72, 0, 0, 0],
      [76, 0, 0, 79, 0, 0, 83, 0, 0, 0, 81, 0, 79, 0, 0, 0],
      [79, 0, 0, 0, 0, 0, 76, 0, 0, 0, 73, 0, 0, 0, 0, 0],
    ),
    leadWave: "triangle",
    leadLen: 1.4,
    double: { from: 0, to: 64, shift: -5, wave: "triangle" },
    bass: bars(bossa(38, 45), bossa(43, 50), bossa(36, 43), bossa(45, 40), bossa(38, 45), bossa(43, 50), bossa(36, 43), bossa(45, 40)),
    bassWave: "triangle",
    bassLen: 3,
    kick: "x..x....x..x....",
    snare: "x..x..x...x..x..",
    hat: "..x...x...x...x.",
    gags: {},
  },
  // 1-3's lo-fi: a lazy square lead doubled a few cents off (the wobble) over E flat's changes, a soft kick and a snare on
  // two and four.
  campus: {
    step: 0.13,
    lead: bars(
      [0, 0, 74, 0, 0, 0, 72, 70, 0, 0, 67, 0, 0, 0, 0, 0],
      [0, 0, 70, 0, 0, 0, 67, 0, 63, 0, 0, 0, 65, 0, 67, 0],
      [0, 0, 72, 0, 0, 0, 75, 0, 0, 0, 72, 0, 70, 0, 0, 0],
      [0, 0, 74, 0, 72, 0, 70, 0, 0, 0, 68, 0, 0, 0, 0, 0],
      [0, 0, 79, 0, 0, 0, 77, 75, 0, 0, 74, 0, 0, 0, 70, 0],
      [0, 0, 72, 0, 0, 0, 70, 0, 67, 0, 0, 0, 70, 0, 72, 0],
      [0, 0, 75, 0, 0, 0, 79, 0, 0, 0, 77, 0, 75, 0, 0, 0],
      [0, 0, 74, 0, 0, 0, 70, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "square",
    leadLen: 1.6,
    double: { from: 0, to: 128, shift: 0.12, wave: "square" },
    bass: bars(
      [39, 0, 0, 0, 0, 0, 0, 0, 0, 0, 46, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0],
      [44, 0, 0, 0, 0, 0, 0, 0, 0, 0, 39, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0],
      [39, 0, 0, 0, 0, 0, 0, 0, 0, 0, 46, 0, 0, 0, 0, 0],
      [36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0],
      [44, 0, 0, 0, 0, 0, 0, 0, 0, 0, 39, 0, 0, 0, 0, 0],
      [46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0],
    ),
    bassWave: "triangle",
    bassLen: 4,
    kick: "x.........x.....",
    snare: "....x.......x...",
    hat: ".x.x.x.x.x.x.x.x",
    gags: {},
  },
  // 1-4's first boss theme: a driving sawtooth bass in eighths through E minor's i, VI, VII, V, a riff for four bars, then
  // a second lead doubled an octave down for four.
  arena: {
    step: 0.1,
    lead: bars(
      [76, 0, 79, 0, 83, 0, 79, 0, 76, 0, 79, 0, 84, 0, 83, 0],
      [76, 0, 79, 0, 84, 0, 79, 0, 76, 0, 79, 0, 86, 0, 84, 0],
      [78, 0, 81, 0, 86, 0, 81, 0, 78, 0, 81, 0, 88, 0, 86, 0],
      [78, 0, 83, 0, 87, 0, 83, 0, 78, 0, 83, 0, 86, 0, 87, 0],
      [88, 0, 0, 86, 0, 0, 83, 0, 86, 0, 83, 0, 79, 0, 0, 0],
      [84, 0, 0, 83, 0, 0, 79, 0, 83, 0, 79, 0, 76, 0, 0, 0],
      [86, 0, 0, 88, 0, 0, 90, 0, 88, 0, 86, 0, 81, 0, 0, 0],
      [87, 0, 0, 0, 86, 0, 0, 0, 83, 0, 0, 0, 78, 0, 0, 0],
    ),
    leadWave: "square",
    leadLen: 1.6,
    double: { from: 64, to: 128, shift: -12, wave: "sawtooth" },
    bass: bars(
      [40, 0, 52, 0, 40, 0, 52, 0, 40, 0, 52, 0, 40, 0, 50, 0],
      [36, 0, 48, 0, 36, 0, 48, 0, 36, 0, 48, 0, 36, 0, 47, 0],
      [38, 0, 50, 0, 38, 0, 50, 0, 38, 0, 50, 0, 38, 0, 50, 0],
      [35, 0, 47, 0, 35, 0, 47, 0, 35, 0, 47, 0, 47, 0, 46, 0],
      [40, 0, 52, 0, 40, 0, 52, 0, 40, 0, 52, 0, 40, 0, 50, 0],
      [36, 0, 48, 0, 36, 0, 48, 0, 36, 0, 48, 0, 36, 0, 47, 0],
      [38, 0, 50, 0, 38, 0, 50, 0, 38, 0, 50, 0, 38, 0, 50, 0],
      [35, 0, 47, 0, 35, 0, 47, 0, 35, 0, 47, 0, 47, 0, 46, 0],
    ),
    bassWave: "sawtooth",
    bassLen: 1.6,
    kick: "x...x...x...x...",
    snare: "....x.......x...",
    hat: "x.x.x.x.x.x.x.x.",
    gags: {},
  },
  // The stash's tune as it was: its square lead a note a step, its bass every other step, no drums.
  cellar: {
    step: 0.21,
    lead: [57, 55, 53, 55, 52, 50, 53, 55, 57, 59, 57, 55, 53, 52, 50, 53],
    leadWave: "square",
    leadLen: 0.86,
    bass: [45, 0, 41, 0, 43, 0, 40, 0, 45, 0, 41, 0, 43, 0, 40, 0],
    bassWave: "triangle",
    bassLen: 1.7,
    kick: "................",
    snare: "................",
    hat: "................",
    gags: {},
  },
  // "Feeding Frenzy": a circus galop off the rails. Oom-pah under a frantic A minor lead of arpeggios and chromatic runs,
  // then a chicken-dance chorus in C with a kazoo doubling it, a slide whistle at each turn and a bike horn.
  banquet: {
    step: 0.085,
    lead: bars(
      [69, 72, 76, 81, 80, 81, 76, 72, 69, 72, 76, 81, 83, 84, 83, 81],
      [80, 76, 71, 76, 80, 83, 86, 83, 81, 76, 72, 76, 81, 0, 81, 0],
      [77, 76, 75, 76, 77, 81, 84, 81, 76, 75, 76, 80, 83, 80, 76, 74],
      [72, 71, 70, 71, 72, 74, 75, 76, 81, 80, 79, 78, 77, 76, 75, 76],
      [72, 0, 72, 0, 74, 0, 76, 0, 77, 77, 77, 0, 76, 0, 74, 0],
      [71, 0, 71, 0, 72, 0, 74, 0, 76, 76, 76, 0, 74, 0, 72, 0],
      [72, 76, 79, 84, 79, 76, 72, 76, 79, 84, 88, 84, 79, 76, 72, 67],
      [68, 71, 74, 77, 80, 83, 86, 89, 88, 86, 83, 80, 76, 0, 64, 0],
    ),
    leadWave: "square",
    leadLen: 0.8,
    double: { from: 64, to: 96, shift: -12, wave: "sawtooth" },
    bass: bars(
      [45, 0, 57, 0, 40, 0, 57, 0, 45, 0, 57, 0, 40, 0, 57, 0],
      [40, 0, 56, 0, 47, 0, 56, 0, 40, 0, 56, 0, 47, 0, 56, 0],
      [41, 0, 57, 0, 48, 0, 57, 0, 40, 0, 56, 0, 47, 0, 56, 0],
      [40, 0, 56, 0, 47, 0, 56, 0, 45, 0, 57, 0, 40, 0, 56, 0],
      [36, 0, 52, 0, 43, 0, 52, 0, 36, 0, 52, 0, 43, 0, 52, 0],
      [43, 0, 53, 0, 38, 0, 53, 0, 43, 0, 53, 0, 38, 0, 53, 0],
      [36, 0, 52, 0, 43, 0, 52, 0, 36, 0, 52, 0, 43, 0, 52, 0],
      [40, 0, 56, 0, 44, 0, 56, 0, 47, 0, 56, 0, 50, 0, 56, 0],
    ),
    bassWave: "square",
    bassLen: 1.4,
    kick: "x...x...x...x...",
    snare: "..x...x...x...x.",
    hat: ".x.x.x.x.x.x.x.x",
    gags: { 60: "whistle", 64: "honk", 96: "honk", 124: "whistle" },
  },
  // "Now Boarding (Turbulence Mix)": airport bossa-nova muzak at twice the speed it should be. The ding-dong chime opens
  // each half, the second half hits turbulence (the lead hopping octaves over a buzzing double) and a jet roars over.
  gate: {
    step: 0.1,
    lead: bars(
      [77, 0, 81, 84, 0, 81, 0, 77, 76, 0, 79, 84, 0, 79, 76, 0],
      [74, 0, 77, 81, 86, 81, 77, 74, 73, 76, 79, 82, 85, 0, 0, 0],
      [86, 0, 84, 82, 81, 0, 79, 77, 76, 79, 84, 88, 91, 0, 88, 84],
      [89, 88, 86, 84, 82, 81, 79, 77, 76, 0, 72, 0, 77, 0, 0, 0],
      [82, 94, 82, 94, 81, 93, 81, 93, 79, 91, 79, 91, 77, 89, 77, 89],
      [76, 88, 76, 88, 77, 89, 77, 89, 79, 91, 79, 91, 81, 0, 0, 0],
      [79, 82, 86, 91, 0, 86, 0, 82, 81, 84, 88, 93, 0, 88, 0, 84],
      [82, 81, 79, 77, 76, 74, 72, 70, 72, 0, 76, 0, 79, 0, 0, 0],
    ),
    leadWave: "triangle",
    leadLen: 0.9,
    double: { from: 64, to: 128, shift: -12, wave: "square" },
    bass: bars(bossa(41, 48), bossa(38, 45), bossa(43, 50), bossa(36, 43), bossa(46, 53), bossa(45, 52), bossa(43, 50), bossa(48, 43)),
    bassWave: "triangle",
    bassLen: 3,
    kick: "x.......x.......",
    snare: "...x..x...x..x..",
    hat: "x.x.x.x.x.x.x.x.",
    gags: { 0: "chime", 64: "chime", 96: "jet" },
  },
  // 2-1's jazz trio at twenty to midnight: a walking bass through B flat's two-five-ones, a sparse sine over it, brushes.
  "lobby-night": {
    step: 0.19,
    lead: bars(
      [75, 0, 0, 74, 0, 0, 0, 0, 70, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 72, 0, 75, 0, 0, 0, 77, 0, 0, 75, 0, 0, 0, 0],
      [74, 0, 0, 0, 0, 0, 0, 0, 69, 0, 70, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 74, 0, 77, 0, 0, 0, 79, 0, 0, 77, 0, 0],
      [75, 0, 0, 0, 72, 0, 0, 0, 0, 0, 70, 0, 67, 0, 0, 0],
      [0, 0, 69, 0, 72, 0, 75, 0, 0, 74, 0, 0, 72, 0, 0, 0],
      [70, 0, 0, 0, 0, 0, 0, 0, 74, 0, 77, 0, 81, 0, 0, 0],
      [0, 0, 82, 0, 0, 81, 0, 0, 77, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "sine",
    leadLen: 2.6,
    bass: bars(
      [36, 0, 39, 0, 43, 0, 46, 0, 48, 0, 46, 0, 43, 0, 40, 0],
      [41, 0, 45, 0, 48, 0, 51, 0, 53, 0, 51, 0, 48, 0, 45, 0],
      [46, 0, 45, 0, 41, 0, 38, 0, 34, 0, 38, 0, 41, 0, 42, 0],
      [43, 0, 46, 0, 50, 0, 46, 0, 43, 0, 41, 0, 38, 0, 37, 0],
      [36, 0, 38, 0, 39, 0, 41, 0, 43, 0, 41, 0, 39, 0, 40, 0],
      [41, 0, 43, 0, 45, 0, 46, 0, 48, 0, 46, 0, 45, 0, 40, 0],
      [46, 0, 41, 0, 38, 0, 34, 0, 36, 0, 38, 0, 39, 0, 40, 0],
      [41, 0, 45, 0, 48, 0, 45, 0, 41, 0, 39, 0, 38, 0, 35, 0],
    ),
    bassWave: "triangle",
    bassLen: 1.9,
    kick: "................",
    snare: "....x.......x...",
    snareGain: 0.02,
    hat: "x.x.x.x.x.x.x.x.",
    gags: {},
  },
  // The M CLUB lounge's cocktail piano: a triangle and a sine an octave up for its hammers, F major's changes, no drums.
  lounge: {
    step: 0.22,
    lead: bars(
      [77, 0, 81, 0, 84, 0, 88, 0, 84, 0, 81, 0, 0, 0, 0, 0],
      [74, 0, 77, 0, 81, 0, 84, 0, 86, 0, 84, 81, 0, 0, 0, 0],
      [79, 0, 82, 0, 86, 0, 89, 0, 86, 82, 0, 79, 0, 0, 0, 0],
      [72, 0, 76, 0, 79, 0, 82, 0, 84, 0, 82, 0, 79, 0, 76, 0],
      [77, 0, 81, 84, 0, 0, 88, 0, 89, 0, 88, 0, 84, 0, 0, 0],
      [86, 0, 84, 0, 81, 0, 77, 0, 74, 0, 77, 0, 81, 0, 0, 0],
      [82, 0, 81, 0, 79, 0, 77, 0, 76, 0, 79, 0, 84, 0, 82, 0],
      [81, 0, 0, 0, 77, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
    leadWave: "triangle",
    leadLen: 2.4,
    double: { from: 0, to: 128, shift: 12, wave: "sine" },
    bass: bars(
      [41, 0, 0, 0, 48, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0],
      [38, 0, 0, 0, 45, 0, 0, 0, 38, 0, 0, 0, 45, 0, 0, 0],
      [43, 0, 0, 0, 50, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0],
      [36, 0, 0, 0, 43, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0],
      [41, 0, 0, 0, 48, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0],
      [38, 0, 0, 0, 45, 0, 0, 0, 38, 0, 0, 0, 45, 0, 0, 0],
      [36, 0, 0, 0, 43, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0],
      [41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
    bassWave: "triangle",
    bassLen: 3.4,
    kick: "................",
    snare: "................",
    hat: "................",
    gags: {},
  },
  // 2-2's climb: the lead up a semitone a bar for the fourteen floors and back down to the first, the square bass under it,
  // the elevator he is not using dinging past every bar.
  tower: {
    step: 0.16,
    lead: climbing(CLIMB_MOTIF, 14),
    leadWave: "square",
    leadLen: 1.5,
    bass: climbing(CLIMB_BASS, 14),
    bassWave: "square",
    bassLen: 1.6,
    kick: "x...x...x...x...",
    snare: "....x.......x...",
    hat: "x.x.x.x.x.x.x.x.",
    gags: everyBar(14),
  },
  // 2-3's fourteenth-floor corridor: the hum of the place, a low sine, a muffled note every fourth bar, the ice machine down the hall.
  hallway: {
    step: 0.24,
    lead: bars(
      Array(16).fill(0),
      Array(16).fill(0),
      Array(16).fill(0),
      [64, 0, 0, 0, 65, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0],
      Array(16).fill(0),
      Array(16).fill(0),
      Array(16).fill(0),
      [64, 0, 0, 0, 67, 0, 0, 0, 0, 0, 65, 0, 64, 0, 0, 0],
    ),
    leadWave: "sine",
    leadLen: 0.3,
    bass: bars(
      [40, ...Array(15).fill(0)],
      [40, ...Array(15).fill(0)],
      [41, ...Array(15).fill(0)],
      [40, ...Array(15).fill(0)],
      [40, ...Array(15).fill(0)],
      [40, ...Array(15).fill(0)],
      [41, ...Array(15).fill(0)],
      [38, ...Array(15).fill(0)],
    ),
    bassWave: "sine",
    bassLen: 16,
    kick: "................",
    snare: "................",
    hat: "................",
    gags: { 0: "honk", 64: "honk" },
  },
  // 2-3's suite, the second boss theme: a driving sawtooth bass, four on the floor, and in A minor one lead, then two.
  suite: {
    step: 0.14,
    lead: bars(
      [69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 77, 0, 81, 0, 77, 0],
      [76, 0, 79, 0, 83, 0, 79, 0, 81, 0, 79, 0, 76, 0, 72, 0],
      [69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 77, 0, 81, 0, 84, 0],
      [83, 0, 81, 0, 79, 0, 76, 0, 72, 0, 74, 0, 76, 0, 0, 0],
      [81, 81, 0, 84, 0, 81, 0, 79, 77, 77, 0, 81, 0, 77, 0, 76],
      [74, 74, 0, 77, 0, 74, 0, 72, 71, 71, 0, 74, 0, 79, 0, 83],
      [81, 81, 0, 84, 0, 88, 0, 84, 86, 86, 0, 84, 0, 81, 0, 79],
      [77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 72, 0, 74, 0, 76, 0],
    ),
    leadWave: "square",
    leadLen: 1.3,
    double: { from: 64, to: 128, shift: -12, wave: "sawtooth" },
    bass: bars(
      [33, 0, 33, 0, 45, 0, 33, 0, 33, 0, 33, 0, 45, 0, 33, 0],
      [31, 0, 31, 0, 43, 0, 31, 0, 31, 0, 31, 0, 43, 0, 31, 0],
      [29, 0, 29, 0, 41, 0, 29, 0, 29, 0, 29, 0, 41, 0, 29, 0],
      [28, 0, 28, 0, 40, 0, 28, 0, 28, 0, 28, 0, 40, 0, 28, 0],
      [33, 0, 33, 0, 45, 0, 33, 0, 33, 0, 33, 0, 45, 0, 33, 0],
      [31, 0, 31, 0, 43, 0, 31, 0, 31, 0, 31, 0, 43, 0, 31, 0],
      [29, 0, 29, 0, 41, 0, 29, 0, 29, 0, 29, 0, 41, 0, 29, 0],
      [28, 0, 28, 0, 40, 0, 28, 0, 28, 0, 40, 0, 28, 0, 40, 0],
    ),
    bassWave: "sawtooth",
    bassLen: 1.5,
    kick: "x...x...x...x...",
    snare: "....x.......x...",
    hat: "..x...x...x...x.",
    gags: {},
  },
};

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  muted = false;
  private musicOn = false;
  private theme: Theme = "lobby";
  private quiet = false;
  /** The two sliders' shares, 0 to 1 (Task 17's Settings); the voices are the master's, untouched. */
  private music = 1;
  private effects = 1;
  private step = 0;
  private nextAt = 0;
  hurry = false;
  /** The section of a song in sections that loops (3-6: the boss's round), or null for the whole song. */
  section: number | null = null;

  /** Loops section `n`'s four bars of the song playing (bars 4n to 4n + 3), or the whole song again with null. */
  setSection(n: number | null) {
    this.section = n;
  }
  /** The song's lead, gated (3-4's pipers play only while he walks): its level, and the gain it plays through. */
  private lead = 1;
  private leadGain: GainNode | null = null;
  private yellSrc: AudioBufferSourceNode | null = null;
  private yellBytes: Promise<ArrayBuffer> | null = null;
  private yellDecode: Promise<void> | null = null;
  ready = false;
  failed = false;
  lastVoiceAt = -1;
  voiceCount = 0;
  tauntCount = 0;
  lastTaunt: TauntId | null = null;
  private tauntBytes = new Map<TauntId, Promise<ArrayBuffer | null>>();
  private tauntBuffers = new Map<TauntId, AudioBuffer>();
  private tauntDecodes = new Set<TauntId>();
  private nextTauntAt = 0;
  private taunts: TauntRotation;
  private destroyed = false;

  constructor(private random: () => number = Math.random) {
    this.taunts = new TauntRotation(random);
  }

  get tauntsReady() {
    return this.tauntBuffers.size === Object.keys(TAUNT_FILES).length;
  }

  /** Optional lines load alongside the damage voice without delaying the start. */
  preloadTaunts() {
    for (const [key, url] of Object.entries(TAUNT_FILES)) {
      const id = key as TauntId;
      if (!this.tauntBytes.has(id)) {
        this.tauntBytes.set(
          id,
          fetch(url, { signal: AbortSignal.timeout(8000) })
            .then((r) => (r.ok ? r.arrayBuffer() : null))
            .catch(() => null),
        );
      }
      if (this.ctx && !this.tauntDecodes.has(id)) {
        const ctx = this.ctx;
        this.tauntDecodes.add(id);
        void this.tauntBytes
          .get(id)!
          .then((bytes) => (bytes && !this.destroyed ? ctx.decodeAudioData(bytes.slice(0)) : null))
          .then((buffer) => {
            if (buffer && !this.destroyed) this.tauntBuffers.set(id, buffer);
          })
          .catch(() => {
            /* An optional missing clip must not break gameplay. */
          });
      }
    }
  }

  /** Fetch on the title screen; decoding never happens inside the hit handler. */
  preloadCurse() {
    if (!this.yellBytes) {
      this.yellBytes = fetch("/damage-voice.wav", { signal: AbortSignal.timeout(8000) }).then(
        (r) => {
          if (!r.ok) throw new Error("Damage sound unavailable");
          return r.arrayBuffer();
        },
      );
      void this.yellBytes.catch(() => {
        this.failed = true;
      });
    }
    if (this.ctx && !this.yellDecode) {
      const ctx = this.ctx;
      this.yellDecode = this.yellBytes
        .then((b) => ctx.decodeAudioData(b.slice(0)))
        .then((buffer) => {
          this.yellBuf = buffer;
          this.ready = true;
        })
        .catch(() => {
          this.failed = true;
        });
    }
  }

  unlock() {
    try {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.failed = true;
        return;
      }
      if (!this.ctx) {
        this.ctx = new Ctor({ latencyHint: "interactive" });
        this.master = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicLevel;
        this.sfxGain.gain.value = this.effectsLevel;
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      this.preloadCurse();
      this.preloadTaunts();
    } catch {
      this.failed = true;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopVoice();
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  /** The music bus's level now: its slider's share, quiet under the cards and the break. */
  get musicLevel(): number {
    return MUSIC.level * this.music * (this.quiet ? MUSIC.quiet : 1);
  }
  /** The effects bus's level: its slider's share. */
  get effectsLevel(): number {
    return EFFECTS_LEVEL * this.effects;
  }
  get volumes(): { music: number; effects: number } {
    return { music: this.music, effects: this.effects };
  }

  /** The Settings' two sliders, 0 to 1 each. */
  setVolumes(music: number, effects: number) {
    this.music = Math.min(1, Math.max(0, music));
    this.effects = Math.min(1, Math.max(0, effects));
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    this.musicGain.gain.setTargetAtTime(this.musicLevel, this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.effectsLevel, this.ctx.currentTime, 0.05);
  }

  startMusic(theme: Theme, quiet = false) {
    this.unlock();
    this.preloadCurse();
    this.theme = theme;
    this.musicOn = true;
    this.step = 0;
    this.nextAt = (this.ctx?.currentTime ?? 0) + 0.05;
    this.setQuiet(quiet);
  }

  /** What a jingle's notes are lifted by so they ring at the music's full level under a card's quiet. */
  get jingleLift(): number {
    return this.quiet ? 1 / MUSIC.quiet : 1;
  }

  /** The music down under a card or a break, back up in play. */
  setQuiet(on: boolean) {
    this.quiet = on;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(this.musicLevel, this.ctx.currentTime, 0.15);
  }

  /** Hammer down: four falling notes on a muted trombone, the last one wobbling, 1.2 s. */
  hammerDown() {
    this.jingle([
      [55, 0, 0.26],
      [54, 0.28, 0.26],
      [53, 0.56, 0.26],
      [52, 0.84, 0.36],
    ]);
  }

  /** An act's ending: a short brass rise to a held chord, 1.5 s. */
  fanfare() {
    this.jingle([
      [60, 0, 0.14],
      [64, 0.15, 0.14],
      [67, 0.3, 0.14],
      [72, 0.45, 1],
      [76, 0.45, 1],
    ]);
  }

  /** A few notes on the music's bus, each `[midi, start, length]` in seconds, a sawtooth doubled a fifth below. */
  private jingle(notes: [number, number, number][]) {
    if (!this.ctx || !this.musicGain || this.muted) return;
    const at = this.ctx.currentTime + 0.02;
    const lift = this.jingleLift;
    for (const [n, t, len] of notes) {
      this.tone(midi(n), at + t, len, "sawtooth", 0.12 * lift, this.musicGain, midi(n - 0.4));
      this.tone(midi(n - 7), at + t, len, "square", 0.05 * lift, this.musicGain);
    }
  }

  stopMusic() {
    this.musicOn = false;
  }

  stopVoice() {
    if (this.yellSrc) {
      this.yellSrc.onended = null;
      try {
        this.yellSrc.stop();
      } catch {
        /* already ended */
      }
      this.yellSrc.disconnect();
      this.yellSrc = null;
    }
    if (this.musicGain && this.ctx) {
      const at = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(at);
      this.musicGain.gain.setTargetAtTime(this.musicLevel, at, 0.08);
    }
  }

  destroy() {
    this.destroyed = true;
    this.stopVoice();
    if (this.ctx) void this.ctx.close();
  }

  whoosh() {
    this.noise(0.11, 0.16, 1000);
  }
  cloth() {
    this.noise(0.2, 0.045, 2200);
  }
  thud() {
    this.noise(0.08, 0.2, 200);
    this.blip(90, 0.12, "sine", 0.7, 38);
  }
  fizz() {
    this.noise(0.14, 0.1, 3600);
  }
  splat() {
    this.noise(0.1, 0.16, 600);
    this.blip(150, 0.08, "sine", 0.3, 50);
  }
  /** Mallet on a person: low body thump, a dry wood knock and a little grit. */
  bonk() {
    this.blip(118, 0.16, "sine", 0.75, 42);
    this.blip(660, 0.05, "triangle", 0.32, 300);
    this.noise(0.05, 0.16, 1400, "bandpass");
  }
  sniff() {
    this.noise(0.13, 0.05, 2600, "highpass", 5200);
  }
  honk() {
    this.noise(0.17, 0.2, 2400, "lowpass", 420);
    this.blip(196, 0.13, "sawtooth", 0.1, 78);
  }
  swish() {
    this.noise(0.09, 0.06, 2600, "bandpass", 1500);
  }
  snap() {
    this.noise(0.04, 0.14, 3200, "highpass");
    this.blip(1800, 0.02, "square", 0.05);
  }
  glint() {
    [2093, 3136].forEach((f, i) => this.blip(f, 0.07, "sine", 0.05, undefined, i * 0.06));
  }
  /** A housekeeping cart's loose wheels: a burst of band-passed noise and three clatters. */
  rattle() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    this.hit(this.ctx.currentTime, 0.25, 0.12, 900, "bandpass", this.sfxGain);
    for (const i of [0, 1, 2]) this.blip(420 - i * 60, 0.04, "square", 0.05, undefined, i * 0.06);
  }
  slip() {
    this.blip(920, 0.26, "sine", 0.12, 260);
  }
  /** The ! burst over an attacker: a short rising sting. */
  sting() {
    this.blip(880, 0.08, "square", 0.12, 1320);
    this.blip(1320, 0.06, "square", 0.08, undefined, 0.07);
  }
  /** The seatbelt sign: two soft tones, the cabin's bong. */
  belt() {
    this.blip(880, 0.22, "sine", 0.16);
    this.blip(660, 0.26, "sine", 0.16, undefined, 0.16);
  }
  /** The kid's tablet at full volume: a tinny square nursery loop. */
  tune() {
    [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72].forEach((n, i) => this.blip(midi(n), 0.14, "square", 0.05, undefined, i * 0.18));
  }
  /** The ring light's stand turned: a low 60 Hz hum swelling over half a second. */
  hum() {
    this.blip(60, 0.5, "sawtooth", 0.08, 64);
    this.blip(120, 0.5, "sine", 0.05);
  }
  /** The training video's screen cracking: a sharp glass crack. */
  crack() {
    this.noise(0.08, 0.16, 5200, "highpass", 2600);
    this.blip(2800, 0.04, "square", 0.05, 900);
  }
  /** A scooter going by: a saw falling away. */
  buzz() {
    this.blip(310, 0.8, "sawtooth", 0.07, 140);
  }
  /** The pigeons going up. */
  flutter() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    for (let i = 0; i < 7; i++) this.hit(this.ctx.currentTime + i * 0.07, 0.05, 0.05, 2400, "bandpass", this.sfxGain);
  }
  /** The train's doors: three short beeps. */
  beep() {
    for (const i of [0, 1, 2]) this.blip(1320, 0.1, "square", 0.07, undefined, i * 0.16);
  }
  /** The train's horn at the tunnel: two notes held. */
  horn() {
    this.blip(233, 1.2, "sawtooth", 0.09);
    this.blip(277, 1.2, "sawtooth", 0.07);
  }
  /** Cart wheels squealing on marble. */
  squeal() {
    this.noise(0.25, 0.08, 3200, "bandpass", 2400);
    this.blip(2600, 0.22, "sine", 0.05, 1900);
  }
  /** Glasses on the floor. */
  shatter() {
    this.noise(0.18, 0.14, 6000, "highpass", 3000);
    [3136, 4186, 5274].forEach((f, i) => this.blip(f, 0.05, "sine", 0.06, undefined, i * 0.03));
  }
  splash() {
    this.noise(0.14, 0.12, 900, "lowpass");
    this.blip(240, 0.08, "sine", 0.1, 120);
  }
  /** A phone's two notes. */
  chime() {
    [1760, 2217].forEach((f, i) => this.blip(f, 0.09, "sine", 0.08, undefined, i * 0.1));
  }
  /** A flat-top under his shoes. */
  sizzle() {
    this.noise(0.35, 0.09, 5200, "highpass", 2400);
  }
  /** The walk-in's cold breath. */
  frost() {
    this.noise(0.4, 0.05, 2600, "bandpass", 1200);
    this.blip(1320, 0.12, "sine", 0.03, 990);
  }
  /** A swinging door banging open. */
  bang() {
    this.noise(0.1, 0.16, 500, "lowpass");
    this.blip(110, 0.12, "square", 0.08, 70);
  }
  /** A page turning. */
  page() {
    this.noise(0.08, 0.05, 3000, "bandpass", 1500);
  }
  /** A paper plane leaving the hand. */
  paper() {
    this.noise(0.12, 0.08, 1800, "bandpass", 900);
  }
  harrumph() {
    this.noise(0.12, 0.06, 420, "lowpass");
    this.blip(150, 0.09, "sawtooth", 0.05, 120);
    this.blip(118, 0.12, "sawtooth", 0.05, 96, 0.12);
  }
  /** Kettle whistle when the temper boils over. */
  whistle() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const ctx = this.ctx,
      at = ctx.currentTime;
    const o = ctx.createOscillator(),
      vib = ctx.createOscillator(),
      depth = ctx.createGain(),
      g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1480, at);
    o.frequency.linearRampToValueAtTime(1760, at + 0.5);
    vib.frequency.value = 11;
    depth.gain.value = 26;
    vib.connect(depth);
    depth.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.06, at + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(at);
    vib.start(at);
    o.stop(at + 0.65);
    vib.stop(at + 0.65);
    o.onended = () => {
      o.disconnect();
      vib.disconnect();
      depth.disconnect();
      g.disconnect();
    };
  }
  /** Food going down: a short low crunch and a blip. */
  chomp() {
    this.noise(0.07, 0.18, 700, "lowpass");
    this.blip(180, 0.05, "square", 0.08, 120);
  }
  /** A plate sliding along the tablecloth. */
  slide() {
    this.noise(0.16, 0.05, 1800, "bandpass", 900);
  }
  /** The banquet's service bell. */
  ding() {
    [1568, 2093].forEach((f, i) => this.blip(f, 0.18, "sine", 0.09, undefined, i * 0.05));
  }
  boom() {
    this.blip(72, 0.38, "sine", 0.8, 32);
    this.noise(0.3, 0.22, 380, "lowpass", 120);
    this.blip(180, 0.1, "square", 0.08, 70, 0.03);
  }

  /** Two hands meeting over the banquet table: a bright double clank. */
  clash() {
    [1320, 1760].forEach((f, i) => this.blip(f, 0.07, "square", 0.07, f * 0.8, i * 0.03));
    this.noise(0.05, 0.12, 3000, "highpass");
  }

  /** A scalpel sticking in the board: a short low knock and a 90 Hz blip (R5 §14). */
  thunk() {
    this.noise(0.06, 0.3, 500, "lowpass", 160);
    this.blip(90, 0.09, "sine", 0.35, 60);
  }

  /** The boarding-pass printer: a fast ticking burst (R5 §14). */
  print() {
    for (let i = 0; i < 7; i++) this.blip(1900 + (i % 2) * 300, 0.015, "square", 0.04, undefined, 0.05 + i * 0.035);
  }

  /** The birds round a head a box of blades froze: three quick chirps (R5 §14). */
  tweet() {
    [0, 0.09, 0.18].forEach((d, i) => this.blip(2600 + i * 220, 0.05, "sine", 0.05, 3400 + i * 200, d));
  }

  private noise(
    duration: number,
    gain: number,
    cutoff: number,
    type: BiquadFilterType = "lowpass",
    sweepTo?: number,
  ) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    filter.type = type;
    filter.frequency.value = cutoff;
    if (sweepTo)
      filter.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
    volume.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(volume);
    volume.connect(this.sfxGain);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      volume.disconnect();
    };
  }

  tick() {
    if (!this.ctx || !this.musicGain || !this.musicOn || this.muted) return;
    this.tickSong(SONGS[this.theme], this.musicGain);
  }

  /** The lead on or off, over 50 ms (3-4's chanter while he walks, the drone holding while he stands); nothing else of the song changes. */
  setLead(on: boolean) {
    const want = on ? 1 : 0;
    if (want === this.lead) return;
    this.lead = want;
    if (this.ctx && this.leadGain) this.leadGain.gain.setTargetAtTime(want, this.ctx.currentTime, 0.05 / 3);
  }

  /** The lead's level now, 0 or 1: for the checks. */
  get leadLevel(): number {
    return this.lead;
  }

  /** The lead's own gain into the music, made as the song first plays. */
  private leadBus(bus: GainNode): GainNode {
    if (!this.ctx) return bus;
    if (!this.leadGain || this.leadGain.context !== this.ctx) {
      this.leadGain = this.ctx.createGain();
      this.leadGain.gain.value = this.lead;
      this.leadGain.connect(bus);
    }
    return this.leadGain;
  }

  /** A song, scheduled a little ahead: the lead and its double, the bass, the drums and the gags. */
  private tickSong(s: Song, bus: GainNode) {
    if (!this.ctx) return;
    const step = s.step * (this.hurry ? 0.78 : 1);
    // Back from a hidden tab or the mute, the audio clock ran on without the frames: pick up from now, not with every
    // missed note at once.
    if (this.nextAt < this.ctx.currentTime) this.nextAt = this.ctx.currentTime + 0.05;
    while (this.nextAt < this.ctx.currentTime + 0.28) {
      const i = sectionStep(this.step, s.lead.length, s.sections ? this.section : null);
      const t = this.nextAt;
      const n = s.lead[i];
      if (n) {
        this.tone(midi(n), t, step * s.leadLen, s.leadWave, 0.09, this.leadBus(bus));
        const d = s.double;
        if (d && i >= d.from && i < d.to) this.tone(midi(n + d.shift), t, step * s.leadLen, d.wave, 0.045, bus);
      }
      if (s.bass[i]) this.tone(midi(s.bass[i]), t, step * s.bassLen, s.bassWave, 0.08, bus);
      const drums = s.sections?.[Math.floor(i / SECTION_STEPS)] ?? s;
      const k = i % drums.kick.length;
      if (drums.kick[k] === "x") this.tone(140, t, 0.12, "sine", 0.16, bus, 45);
      if (drums.snare[k] === "x") this.hit(t, 0.08, s.snareGain ?? 0.07, 1800, "bandpass", bus);
      if (drums.hat[k] === "x") this.hit(t, 0.03, 0.025, 7000, "highpass", bus);
      const gag = s.gags[i];
      if (gag) this.gag(gag, t, bus);
      this.nextAt += step;
      this.step++;
    }
  }

  /** The songs' gags: a slide whistle up, a bike horn, the airport's ding-dong, a jet going over. */
  private gag(g: Song["gags"][number], t: number, bus: GainNode) {
    if (g === "whistle") this.tone(520, t, 0.42, "sine", 0.1, bus, 1900);
    else if (g === "honk") {
      this.tone(392, t, 0.09, "square", 0.08, bus);
      this.tone(330, t + 0.11, 0.14, "square", 0.08, bus);
    } else if (g === "chime") {
      this.tone(784, t, 0.5, "sine", 0.055, bus);
      this.tone(622, t + 0.32, 0.7, "sine", 0.055, bus);
    } else this.hit(t, 1.3, 0.06, 300, "bandpass", bus, 2600);
  }

  private noiseBuffer: AudioBuffer | null = null;
  /** A burst of noise at `when` into `bus`, filtered (and swept), fading over `dur`: the songs' drums and the jet. */
  private hit(when: number, dur: number, gain: number, cutoff: number, type: BiquadFilterType, bus: GainNode, sweepTo?: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.noiseBuffer) {
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuffer = b;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = type;
    // Silent and tuned before its moment too: a gain left at its default 1 lets the first sample through at full volume.
    filter.frequency.value = cutoff;
    volume.gain.value = 0;
    filter.frequency.setValueAtTime(cutoff, when);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, when + dur);
    volume.gain.setValueAtTime(gain, when);
    volume.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    source.connect(filter);
    filter.connect(volume);
    volume.connect(bus);
    source.start(when, dur < 0.5 ? Math.random() * 1.4 : 0, dur + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      volume.disconnect();
    };
  }

  jump() {
    this.blip(620, 0.09, "square", 0.16, 380);
  }
  /** The pipes coming up: the bagpipe's drone, a fifth swelling over 0.8 s. */
  drone() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const at = this.ctx.currentTime;
    this.tone(110, at, 0.8, "sawtooth", 0.05, this.sfxGain, 116);
    this.tone(165, at + 0.05, 0.75, "sawtooth", 0.04, this.sfxGain, 174);
  }
  /** The drum corps' fourth beat: a low thump with a snare's crack. */
  drumHit() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const at = this.ctx.currentTime;
    this.tone(90, at, 0.22, "sine", 0.22, this.sfxGain, 45);
    this.hit(at + 0.01, 0.12, 0.09, 1900, "bandpass", this.sfxGain);
  }
  /** The mace going up: a rising whistle of air, 0.6 s. */
  whirr() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const at = this.ctx.currentTime;
    this.hit(at, 0.6, 0.05, 900, "bandpass", this.sfxGain, 3200);
    this.tone(420, at, 0.6, "triangle", 0.035, this.sfxGain, 980);
  }
  coin() {
    this.blip(988, 0.06, "square", 0.14);
    this.blip(1312, 0.08, "square", 0.12, undefined, 0.05);
  }
  stomp() {
    this.blip(180, 0.07, "square", 0.16, 90);
  }
  bump() {
    this.blip(160, 0.05, "square", 0.12);
  }
  smash() {
    this.blip(110, 0.08, "sawtooth", 0.1, 60);
  }
  kick() {
    this.blip(240, 0.07, "square", 0.14, 420);
  }
  fire() {
    this.blip(740, 0.07, "square", 0.1, 480);
  }
  snot() {
    this.blip(210, 0.09, "sawtooth", 0.08, 90);
    this.blip(140, 0.06, "square", 0.06, 70, 0.04);
  }
  slam() {
    this.blip(90, 0.16, "sawtooth", 0.16, 40);
    this.blip(180, 0.1, "square", 0.1, 70, 0.05);
  }
  power() {
    const t0 = this.ctx?.currentTime ?? 0;
    [523, 659, 784, 1046].forEach((f, i) =>
      this.blip(f, 0.1, "square", 0.12, undefined, i * 0.07, t0),
    );
  }
  oneUp() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
      this.blip(f, 0.09, "square", 0.12, undefined, i * 0.06),
    );
  }
  die() {
    [494, 392, 330, 262, 196].forEach((f, i) =>
      this.blip(f, 0.16, "square", 0.14, undefined, i * 0.1),
    );
  }
  clear() {
    [392, 494, 587, 784].forEach((f, i) => this.blip(f, 0.14, "square", 0.13, undefined, i * 0.09));
  }
  private yellBuf: AudioBuffer | null = null;

  /** React to an actual contact/encounter; skip busy moments instead of queuing. */
  taunt(target: TauntTarget): TauntId | null {
    if (
      !this.ctx ||
      !this.master ||
      this.muted ||
      this.yellSrc ||
      !this.tauntBuffers.size ||
      this.ctx.currentTime < this.nextTauntAt ||
      this.random() >= TAUNT_CHANCE[target]
    )
      return null;
    const id = this.taunts.next(target);
    const buffer = this.tauntBuffers.get(id);
    if (!buffer) return null;
    const at = this.ctx.currentTime;
    this.playVoice(buffer, at);
    this.nextTauntAt = Math.max(at + TAUNT_GAP_SECONDS, at + buffer.duration + 0.8);
    this.lastTaunt = id;
    this.tauntCount++;
    return id;
  }

  /** One particular recording now, for a scripted line; skipped while another is playing. */
  voice(id: TauntId): boolean {
    if (!this.ctx || !this.master || this.muted || this.yellSrc) return false;
    const buffer = this.tauntBuffers.get(id);
    if (!buffer) return false;
    const at = this.ctx.currentTime;
    this.playVoice(buffer, at);
    this.nextTauntAt = Math.max(at + TAUNT_GAP_SECONDS, at + buffer.duration + 0.8);
    this.lastTaunt = id;
    this.tauntCount++;
    return true;
  }

  curse() {
    if (this.muted) return;
    this.stopVoice();
    if (this.yellBuf && this.ctx && this.master) {
      const at = this.ctx.currentTime;
      this.playVoice(this.yellBuf, at);
      this.nextTauntAt = Math.max(at + TAUNT_GAP_SECONDS, at + this.yellBuf.duration + 0.8);
      this.lastVoiceAt = at;
      this.voiceCount++;
      return;
    }
    this.thud();
  }

  private playVoice(buffer: AudioBuffer, at: number) {
    if (!this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.master);
    this.yellSrc = src;
    const music = this.musicGain?.gain;
    music?.cancelScheduledValues(at);
    music?.setValueAtTime(0.025, at);
    music?.setTargetAtTime(this.musicLevel, at + buffer.duration, 0.12);
    src.onended = () => {
      src.disconnect();
      if (this.yellSrc === src) this.yellSrc = null;
    };
    src.start(at);
  }

  tickSfx() {
    this.blip(880, 0.03, "square", 0.08);
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
    from?: number,
  ) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const when = (from ?? this.ctx.currentTime) + delay;
    this.tone(freq, when, dur, type, gain, this.sfxGain, slideTo);
  }

  private tone(
    freq: number,
    when: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    bus: GainNode,
    slideTo?: number,
  ) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(bus);
    o.start(when);
    o.stop(when + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
}
