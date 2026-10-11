import { STEP } from "./constants";
import type { GameEvent } from "./events";
import { createHero, stepHero, type HeroOptions } from "./hero";
import type { Input } from "./input";
import { advanceMove, startMove, steerMove, stepHeat } from "./moves";
import type { HeroState, Point, Snapshot, Stage } from "./types";

export type WorldOptions = HeroOptions;

export type World = {
  stage: Stage;
  hero: HeroState;
  time: number;
  /** What happened in the last step. */
  events: GameEvent[];
  step(input: Input): void;
  snapshot(): Snapshot;
};

/** A fixed-step world: every call to `step` advances exactly STEP seconds. */
export function createWorld(stage: Stage, spawn: Point, opts: WorldOptions = {}): World {
  const world: World = {
    stage,
    hero: createHero(spawn, opts),
    time: 0,
    events: [],
    step(input) {
      const events: GameEvent[] = [];
      const h = world.hero;
      startMove(h, input, 0, events);
      steerMove(h);
      stepHero(h, world.stage, input, STEP, events);
      advanceMove(h, STEP, events);
      stepHeat(h, input, STEP, events);
      world.events = events;
      world.time += STEP;
    },
    snapshot() {
      const h = world.hero;
      return { time: world.time, hero: { ...h, move: h.move && { ...h.move, victims: [...h.move.victims] } } };
    },
  };
  return world;
}
