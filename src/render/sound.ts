import { AudioBus } from "../game/audio";
import type { TauntId, TauntTarget } from "../game/taunts";
import type { GameEvent } from "../sim/events";

type Cue = keyof AudioBus & string;

const CUES: Partial<Record<GameEvent["type"], Cue[]>> = {
  jump: ["jump"],
  slide: ["slide"],
  flop: ["slide", "thud"],
  swing: ["whoosh"],
  superStart: ["power"],
  sampleThrow: ["swish"],
  sampleHit: ["thud", "tweet"],
  sampleStop: ["thud"],
  burst: ["boom"],
  sniff: ["sniff"],
  fire: ["honk"],
  splat: ["splat"],
  wipeStart: ["cloth"],
  stroke: ["swish"],
  flick: ["snap"],
  shine: ["glint"],
  boiling: ["whistle"],
  lectureStart: ["harrumph"],
  harrumph: ["harrumph"],
  watch: ["tickSfx"],
  hurt: ["curse"],
  tumble: ["curse", "thud"],
  crate: ["bump"],
  canPop: ["coin"],
  caseBreak: ["smash"],
  bump: ["bump"],
  checkpoint: ["power", "thud"],
  oneUp: ["oneUp"],
  timeOut: ["curse"],
  exit: ["clear"],
  bell: ["ding"],
  castNotice: ["glint"],
  castBump: ["bump"],
  castFreeze: ["tickSfx"],
  castSchooled: ["ding"],
  castFlee: ["slip"],
  castFell: ["die"],
  chain: ["kick"],
  swat: ["thud"],
  stomp: ["stomp"],
  lectureLand: ["harrumph"],
  pigWake: ["power"],
  pigCharge: ["bump"],
  pigHop: ["bump"],
  pigLand: ["thud"],
  pigHit: ["thud"],
  pigBounce: ["bump"],
  pigDown: ["clear"],
  hhDive: ["whoosh"],
  hhBus: ["slide"],
  hhCart: ["boom"],
  hhClash: ["clash"],
  hhLock: ["tickSfx"],
  hhLecture: ["harrumph"],
  doggyBag: ["chomp", "power"],
  hhSwat: ["thud"],
  hhTray: ["ding"],
};
const PICKUP_CUES: Record<string, Cue[]> = { can: ["coin"], nuts: ["power"], bucees: ["power", "oneUp"], pepper: ["power"] };
/** The tally ticks once every ten seconds of clock it counts. */
const TALLY_TICK = 10;
/** A fall harder than a full jump's landing thuds. */
const HARD_LANDING = 2200;

export type Sound = {
  unlock(): void;
  play(e: GameEvent): void;
  /** The level's theme, or silence; the same theme again carries on where it was. */
  music(theme: "day" | "cellar" | null): void;
  setHurry(on: boolean): void;
  setMuted(on: boolean): void;
  /** One of the owner's recordings, by name. */
  voice(id: TauntId): void;
  /** One of the five taunts for a besting, when the bus allows one (the shipped chance and gap); which one played, or null. */
  taunt(target: TauntTarget): TauntId | null;
  /** Whatever recording is playing stops (a break). */
  stopVoice(): void;
  /** Schedules the music's next notes: once a frame. */
  tick(): void;
  destroy(): void;
  /** Every cue asked for since boot, counted whether or not sound is unlocked. */
  played: Record<string, number>;
  unlocked: boolean;
};

/**
 * The pool of the owner's recordings an event offers a taunt from: only besting someone does (the shipped rule, R2b §3.4):
 * a staffer put out, a lecture that freezes staff or schools a student, a student run off, a swatted plane, a hit on
 * the pig. The bus then rolls the pool's chance.
 */
export function tauntFor(e: GameEvent): TauntTarget | null {
  switch (e.type) {
    case "castHit":
      return e.down && e.role !== "student" ? "staff" : null;
    case "lectureLand":
      return e.schooled ? "student" : e.frozen ? "staff" : null;
    case "castFlee":
      return "student";
    case "swat":
      return e.kind === "plane" ? "student" : null;
    case "pigHit":
      return "pig";
    // A box of blades freezing someone bests them like a lecture: the student's pool or the staff's.
    case "sampleHit":
      return e.role === "student" ? "student" : "staff";
    default:
      return null;
  }
}

/** The cues an event asks for: the table, with the events whose cue depends on what they carry. */
/** How far past the view an off-screen swing of the kitchen door is still heard (world px). */
const EARSHOT = 300;

/**
 * Whether an event is heard where the camera is. The kitchen server crosses her door every few seconds wherever he is:
 * its soft swing is heard only near the view; its bang, which only ever comes at him, always.
 */
export function heard(e: GameEvent, view: { x: number; w: number }): boolean {
  if (e.type !== "doorSwing" || e.hard) return true;
  return e.x > view.x - EARSHOT && e.x < view.x + view.w + EARSHOT;
}

export function cuesFor(e: GameEvent): Cue[] {
  switch (e.type) {
    case "hit":
      return e.by === "mallet" ? ["bonk"] : e.by === "shield" ? ["kick"] : e.by === "snot" ? ["splat"] : [];
    case "land":
      return e.speed >= HARD_LANDING ? ["thud"] : [];
    case "pickup":
      return PICKUP_CUES[e.kind];
    case "mode":
      return e.mode === "dying" ? ["die"] : [];
    case "tallyTick":
      return e.seconds % TALLY_TICK === 0 ? ["tickSfx"] : [];
    case "castWindup":
      // The server's warning carries the order-up ding (R2b §2.2); every wind-up carries the sting.
      return e.role === "server" ? ["sting", "ding"] : ["sting"];
    case "castAttack":
      return e.role === "bellhop" ? ["squeal"] : e.role === "server" || e.role === "office" ? ["whoosh"] : ["paper"];
    case "castHit": {
      // The mallet and the snot ring through their own hit event; the hit that knocks a server's tray away shatters its
      // glasses, an office worker's coffee splashes, a professor's pages fly.
      const names: Cue[] = e.by === "stomp" ? ["stomp"] : e.by === "puddle" ? ["slip"] : e.by === "mallet" || e.by === "snot" ? [] : ["kick"];
      if (e.drops && e.job === "server") names.push("shatter");
      if (e.drops && (e.job === "office" || e.job === "lunch" || e.job === "cook")) names.push("splash");
      if (e.drops && e.job === "prof") names.push("page");
      return names;
    }
    case "chime":
      return e.job === "cook" ? ["sizzle"] : e.job === "prof" ? ["page"] : ["chime"];
    case "castSplash":
      return e.kind === "papers" ? ["paper"] : ["splash"];
    case "missile":
      return e.kind === "pan" ? ["whoosh"] : ["paper"];
    case "heatZone":
      return e.kind === "flattop" ? ["sizzle"] : ["frost"];
    case "doorSwing":
      return e.hard ? ["bang"] : ["swish"];
    case "dishes":
      return ["shatter", "smash"];
    case "missileHit":
      return e.kind === "plane" ? [] : ["splash"];
    case "hhDump":
      // The bell for a wave, a tray or the cart; the frenzy's dishes and the specials drop without it.
      return e.count > 1 ? ["ding"] : [];
    case "hhChomp":
      return e.who === "hammer" ? ["chomp"] : ["slide"];
    case "hhBonk":
      return e.hit ? ["bonk"] : ["thud"];
    case "hhPaper":
      return e.hit ? ["splat"] : [];
    case "hhSuitcase":
      return e.on ? ["thud"] : [];
    // Every third slap he says it: the damage recording.
    case "hhSlap":
      return e.curse ? ["curse", "thud"] : ["thud"];
    default:
      return CUES[e.type] ?? [];
  }
}

/** The shipped game's sound effects for the rebuild's events. Silent until the first key unlocks it. */
export function createSound(): Sound {
  const bus = new AudioBus();
  const played: Record<string, number> = {};
  let theme: "day" | "cellar" | null = null;
  let playing: "day" | "cellar" | null = null;
  const sound: Sound = {
    played,
    unlocked: false,
    unlock() {
      if (sound.unlocked) return;
      bus.unlock();
      // The damage recording decodes now, so the first hit plays it at once.
      bus.preloadCurse();
      sound.unlocked = !bus.failed;
    },
    play(e) {
      const names = cuesFor(e);
      for (const name of names) {
        played[name] = (played[name] ?? 0) + 1;
        if (sound.unlocked) (bus[name] as () => void).call(bus);
      }
    },
    music(next) {
      if (next === theme) return;
      theme = next;
      played[`music:${next ?? "off"}`] = (played[`music:${next ?? "off"}`] ?? 0) + 1;
      if (!next) {
        bus.stopMusic();
        playing = null;
      }
    },
    setHurry(on) {
      bus.hurry = on;
    },
    setMuted(on) {
      bus.setMuted(on);
    },
    voice(id) {
      played[`voice:${id}`] = (played[`voice:${id}`] ?? 0) + 1;
      if (sound.unlocked) bus.voice(id);
    },
    taunt(target) {
      const id = sound.unlocked ? bus.taunt(target) : null;
      if (id) played[`voice:${id}`] = (played[`voice:${id}`] ?? 0) + 1;
      return id;
    },
    stopVoice() {
      bus.stopVoice();
    },
    tick() {
      // Music asked for before the first key starts once the key unlocks sound.
      if (theme && sound.unlocked && playing !== theme) {
        bus.startMusic(theme);
        playing = theme;
      }
      bus.tick();
    },
    destroy() {
      bus.destroy();
    },
  };
  return sound;
}
