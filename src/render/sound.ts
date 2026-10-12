import { AudioBus } from "../game/audio";
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
  /** Schedules the music's next notes: once a frame. */
  tick(): void;
  destroy(): void;
  /** Every cue asked for since boot, counted whether or not sound is unlocked. */
  played: Record<string, number>;
  unlocked: boolean;
};

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
      const names: Cue[] =
        e.type === "hit"
          ? e.by === "mallet"
            ? ["bonk"]
            : e.by === "snot"
              ? ["splat"]
              : []
          : e.type === "land"
            ? e.speed >= HARD_LANDING
              ? ["thud"]
              : []
            : e.type === "pickup"
              ? PICKUP_CUES[e.kind]
              : e.type === "mode"
                ? e.mode === "dying"
                  ? ["die"]
                  : []
                : e.type === "tallyTick"
                  ? e.seconds % TALLY_TICK === 0
                    ? ["tickSfx"]
                    : []
                  : (CUES[e.type] ?? []);
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
