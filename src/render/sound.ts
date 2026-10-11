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
};
/** A fall harder than a full jump's landing thuds. */
const HARD_LANDING = 2200;

export type Sound = {
  unlock(): void;
  play(e: GameEvent): void;
  destroy(): void;
  /** Every cue asked for since boot, counted whether or not sound is unlocked. */
  played: Record<string, number>;
  unlocked: boolean;
};

/** The shipped game's sound effects for the rebuild's events. Silent until the first key unlocks it. */
export function createSound(): Sound {
  const bus = new AudioBus();
  const played: Record<string, number> = {};
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
            : (CUES[e.type] ?? []);
      for (const name of names) {
        played[name] = (played[name] ?? 0) + 1;
        if (sound.unlocked) (bus[name] as () => void).call(bus);
      }
    },
    destroy() {
      bus.destroy();
    },
  };
  return sound;
}
