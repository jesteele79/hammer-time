import { AudioBus } from "../game/audio";
import type { TauntId, TauntTarget } from "../game/taunts";
import type { GameEvent } from "../sim/events";

type Cue = keyof AudioBus & string;

const CUES: Partial<Record<GameEvent["type"], Cue[]>> = {
  jump: ["jump"],
  slide: ["slide"],
  swing: ["whoosh"],
  superStart: ["power"],
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
  missile: ["paper"],
  castSplash: ["splash"],
  stomp: ["stomp"],
  chime: ["chime"],
  lectureLand: ["harrumph"],
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
  /** Schedules the music's next notes: once a frame. */
  tick(): void;
  destroy(): void;
  /** Every cue asked for since boot, counted whether or not sound is unlocked. */
  played: Record<string, number>;
  unlocked: boolean;
};

/** The cues an event asks for: the table, with the events whose cue depends on what they carry. */
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
      // The mallet and the snot ring through their own hit event; a knocked-out server's glasses shatter, an office worker's coffee splashes.
      const names: Cue[] = e.by === "stomp" ? ["stomp"] : e.by === "puddle" ? ["slip"] : e.by === "mallet" || e.by === "snot" ? [] : ["kick"];
      if (e.down && e.role === "server") names.push("shatter");
      if (e.down && e.role === "office") names.push("splash");
      return names;
    }
    case "heatZone":
      return e.kind === "flattop" ? ["sizzle"] : ["frost"];
    case "doorSwing":
      return e.hard ? ["bang"] : ["swish"];
    case "dishes":
      return ["shatter", "smash"];
    case "missileHit":
      return e.kind === "coffee" ? ["splash"] : [];
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
