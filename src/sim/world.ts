import { STEP } from "./constants";
import type { GameEvent } from "./events";
import { createHero, stepHero, type HeroOptions } from "./hero";
import { superBurst, swingContact } from "./hits";
import type { Input } from "./input";
import { advanceMove, deliverLecture, startMove, steerMove, stepHeat, stepIdle } from "./moves";
import { fireSnot, stepSnot, type Puddle, type Snot } from "./snot";
import { stepTargets } from "./targets";
import type { HeroState, Point, Snapshot, Stage, Target } from "./types";

export type WorldOptions = HeroOptions & { targets?: Target[] };

export type World = {
  stage: Stage;
  hero: HeroState;
  targets: Target[];
  snot: Snot[];
  puddles: Puddle[];
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
    targets: opts.targets ?? [],
    snot: [],
    puddles: [],
    time: 0,
    events: [],
    step(input) {
      const events: GameEvent[] = [];
      const h = world.hero;
      startMove(h, input, world.snot.length, events);
      steerMove(h);
      stepHero(h, world.stage, input, STEP, events);
      advanceMove(h, STEP, events);
      swingContact(h, world.targets, events);
      superBurst(h, world.targets, events);
      fireSnot(h, world.snot, events);
      deliverLecture(h, events);
      stepSnot(world, STEP, events);
      stepTargets(world.targets, world.stage, STEP);
      stepHeat(h, input, STEP, events);
      stepIdle(h, input, STEP, events);
      world.events = events;
      world.time += STEP;
    },
    snapshot() {
      const h = world.hero;
      return {
        time: world.time,
        hero: { ...h, move: h.move && { ...h.move, victims: [...h.move.victims] } },
        targets: world.targets.map((t) => ({ ...t })),
        snot: world.snot.map((b) => ({ ...b, hit: [...b.hit] })),
        puddles: world.puddles.map((p) => ({ ...p })),
      };
    },
  };
  return world;
}
