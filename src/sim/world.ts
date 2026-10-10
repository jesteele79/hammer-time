import { STEP } from "./constants";
import { createHero, stepHero } from "./hero";
import type { Input } from "./input";
import type { HeroState, Point, Snapshot, Stage } from "./types";

export type World = {
  stage: Stage;
  hero: HeroState;
  time: number;
  step(input: Input): void;
  snapshot(): Snapshot;
};

/** A fixed-step world: every call to `step` advances exactly STEP seconds. */
export function createWorld(stage: Stage, spawn: Point): World {
  const world: World = {
    stage,
    hero: createHero(spawn),
    time: 0,
    step(input) {
      stepHero(world.hero, world.stage, input, STEP);
      world.time += STEP;
    },
    snapshot() {
      return { time: world.time, hero: { ...world.hero } };
    },
  };
  return world;
}
