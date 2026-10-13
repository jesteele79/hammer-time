import type { Npc } from "./cast";
import { stepCast } from "./cast-behavior";
import { STEP } from "./constants";
import { damage } from "./damage";
import type { GameEvent } from "./events";
import { createHero, stepHero, type HeroOptions } from "./hero";
import { superBurst, swingContact } from "./hits";
import type { Input } from "./input";
import { stepMissiles, type Missile } from "./missiles";
import { advanceMove, deliverLecture, startMove, steerMove, stepHeat, stepIdle } from "./moves";
import { fireSnot, stepSnot, type Puddle, type Snot } from "./snot";
import { stepTargets } from "./targets";
import { stepHeatZones, stepSwingDoors, type HeatZone, type SwingDoor } from "./hazards";
import type { HeroState, Point, Snapshot, Stage, Target } from "./types";

export type WorldOptions = HeroOptions & { targets?: Target[]; cast?: Npc[]; swingDoors?: SwingDoor[] };

export type World = {
  stage: Stage;
  hero: HeroState;
  targets: Target[];
  /** The lobby's people: stepped after him and the carts. */
  cast: Npc[];
  /** Paper planes and coffee in the air. */
  missiles: Missile[];
  /** The last missile id handed out. */
  nextMissile: number;
  snot: Snot[];
  /** The last snot id handed out. */
  nextSnot: number;
  puddles: Puddle[];
  time: number;
  /** What happened in the last step. */
  events: GameEvent[];
  /** The mallet head's path in front of him this step (empty unless a swing is landing). */
  swing: Point[];
  /** Hits waiting for the next step: where each came from. */
  hits: number[];
  /** The level's swinging doors. */
  swingDoors: SwingDoor[];
  /** The heat zone he stood on last step. */
  zone: HeatZone | null;
  /** A hit from something at `fromX`, applied at the start of the next step. */
  hit(fromX: number): void;
  step(input: Input): void;
  snapshot(): Snapshot;
};

/** A fixed-step world: every call to `step` advances exactly STEP seconds. */
export function createWorld(stage: Stage, spawn: Point, opts: WorldOptions = {}): World {
  const world: World = {
    stage,
    hero: createHero(spawn, opts),
    targets: opts.targets ?? [],
    cast: opts.cast ?? [],
    missiles: [],
    nextMissile: 0,
    snot: [],
    nextSnot: 0,
    puddles: [],
    time: 0,
    events: [],
    swing: [],
    hits: [],
    swingDoors: opts.swingDoors ?? [],
    zone: null,
    hit(fromX) {
      world.hits.push(fromX);
    },
    step(input) {
      const events: GameEvent[] = [];
      const h = world.hero;
      for (const from of world.hits.splice(0)) damage(h, world.stage, from, events);
      startMove(h, input, world.snot.length, events);
      steerMove(h);
      const prevY = h.y;
      stepHero(h, world.stage, input, STEP, events);
      advanceMove(h, STEP, events);
      world.swing = swingContact(h, world, events);
      superBurst(h, world.targets, events);
      fireSnot(h, world, events);
      deliverLecture(h, events);
      stepSnot(world, STEP, events);
      stepTargets(world.targets, world.stage, STEP, events);
      stepMissiles(world, STEP, events);
      stepCast(world, STEP, prevY, input.held.jump, events);
      stepSwingDoors(world, STEP, events);
      stepHeat(h, input, STEP, events);
      world.zone = stepHeatZones(h, world.stage, STEP, world.zone, events);
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
        cast: world.cast.map((n) => ({ ...n })),
        missiles: world.missiles.map((m) => ({ ...m })),
        doors: world.swingDoors.map((d) => ({ ...d })),
      };
    },
  };
  return world;
}
