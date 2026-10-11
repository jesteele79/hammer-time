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
};

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
      sound.unlocked = !bus.failed;
    },
    play(e) {
      const names: Cue[] =
        e.type === "hit" ? (e.by === "mallet" ? ["bonk"] : e.by === "snot" ? ["splat"] : []) : (CUES[e.type] ?? []);
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
