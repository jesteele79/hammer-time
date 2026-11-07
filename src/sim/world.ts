import type { Npc } from "./cast";
import { stepCast } from "./cast-behavior";
import { STEP } from "./constants";
import { damage } from "./damage";
import type { GameEvent } from "./events";
import { createHero, stepHero, type HeroOptions } from "./hero";
import type { FlightState } from "./flight";
import { stepHall, stepLateral, type HallCart, type HallDoor } from "./hall";
import { superBurst, swingContact } from "./hits";
import { emptyInput, type Input } from "./input";
import { stepMissiles, type Missile } from "./missiles";
import { stepBoss, type Boss } from "./boss";
import { stepMovers, type Mover } from "./movers";
import { stepParade, type ParadeState } from "./parade";
import { stepPig, type Pig } from "./pig";
import { advanceMove, deliverLecture, startMove, steerMove, stepHeat, stepIdle } from "./moves";
import { fireSnot, stepSnot, type Puddle, type Snot } from "./snot";
import { fireSample, stepSamples, type Sample } from "./samples";
import { stepTargets } from "./targets";
import { stepHeatZones, stepSwingDoors, type HeatZone, type SwingDoor } from "./hazards";
import type { HeroState, Point, Snapshot, Stage, Target } from "./types";

export type WorldOptions = HeroOptions & { targets?: Target[]; cast?: Npc[]; swingDoors?: SwingDoor[]; pig?: Pig | null };

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
  /** Boxes of #15 blades in the air or lying a moment (R5). */
  samples: Sample[];
  nextSample: number;
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
  /** The gift shop's pig, or null. */
  pig: Pig | null;
  /** The carts rolling along the tower's landings. */
  movers: Mover[];
  /** The boss beside the pig: the tower's supervisor. */
  boss: Boss | null;
  /** 3-4's parade: the bands, the drum corps, the pipers who follow him; null elsewhere. */
  parade: ParadeState | null;
  /** Paris's gate has heard his bonjour, this life. */
  bonjourDone: boolean;
  /** Paris's window: how long he has stood on it, and how long it hangs open. */
  tip: { on: number; out: number };
  /** The cabin's cart, turbulence and sign; null off a flight. */
  flight: FlightState | null;
  /** The hall's carts and doors. */
  hallCarts: HallCart[];
  hallDoors: HallDoor[];
  /** The home screen's scene: the cast stands as it is and never notices him; his snot passes them and the carts by. */
  still: boolean;
  /** The run's errands done (3-4), as the game keeps them: for the scripted walker and the look. */
  errands: readonly string[];
  /** 3-5's code blue: 1.8 while he is in its stretch (everyone in it moves that much faster), 1 otherwise; and the stretch. */
  codeBlue: number;
  codeBlueZone: { x0: number; x1: number } | null;
  /** The IFU (3-6): on the lectern, in his hand, in the air as the box he threw (`sample` its id), or lying where it landed. */
  ifu: { x: number; y: number; state: "lectern" | "held" | "air" | "lying"; sample?: number } | null;
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
    samples: [],
    nextSample: 0,
    puddles: [],
    time: 0,
    events: [],
    swing: [],
    hits: [],
    swingDoors: opts.swingDoors ?? [],
    zone: null,
    pig: opts.pig ?? null,
    movers: [],
    boss: null,
    parade: null,
    bonjourDone: false,
    tip: { on: 0, out: 0 },
    flight: null,
    hallCarts: [],
    hallDoors: [],
    still: false,
    errands: [],
    codeBlue: 1,
    codeBlueZone: null,
    ifu: null,
    hit(fromX) {
      world.hits.push(fromX);
    },
    step(given) {
      const events: GameEvent[] = [];
      const h = world.hero;
      // Dazzled by the flashlight his keys do nothing: he stands, slowing as when idle.
      const input = h.stunT > 0 ? emptyInput() : given;
      h.stunT = Math.max(0, h.stunT - STEP);
      for (const from of world.hits.splice(0)) damage(h, world.stage, from, events);
      startMove(h, input, world.snot.length, events);
      steerMove(h);
      const prevY = h.y;
      const prevX = h.x;
      stepHero(h, world.stage, input, STEP, events);
      const sprung = h as HeroState & { bounced?: boolean };
      if (sprung.bounced) {
        sprung.bounced = false;
        events.push({ type: "bounce", x: h.x, y: h.y });
      }
      if (world.stage.hall) {
        // Down a hall he always faces it: S walks him back without turning him.
        h.facing = 1;
        stepLateral(h, input.strafe ?? 0, STEP, world.stage.hall);
        stepHall(world, prevX, STEP, events);
      }
      advanceMove(h, STEP, events);
      world.swing = swingContact(h, world, events);
      superBurst(h, world.targets, events);
      fireSnot(h, world, events);
      fireSample(h, world, events);
      deliverLecture(h, events);
      stepSnot(world, STEP, events);
      stepSamples(world, STEP, events);
      stepTargets(world.targets, world.stage, STEP, events);
      stepMovers(world, STEP, events);
      stepParade(world, STEP, events, input.held.left || input.held.right);
      stepMissiles(world, STEP, events);
      stepCast(world, STEP, prevY, input.held.jump, events);
      stepPig(world, STEP, prevY, input.held.jump, events);
      stepBoss(world, STEP, events);
      stepSwingDoors(world, STEP, events);
      stepHeat(h, input, STEP, events);
      world.zone = stepHeatZones(h, world.stage, STEP, world.zone, events, world.time);
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
        samples: world.samples.map((b) => ({ ...b })),
        puddles: world.puddles.map((p) => ({ ...p })),
        cast: world.cast.map((n) => ({ ...n })),
        missiles: world.missiles.map((m) => ({ ...m })),
        doors: world.swingDoors.map((d) => ({ ...d })),
        pig: world.pig && { ...world.pig, arena: [world.pig.arena[0], world.pig.arena[1]] },
        movers: world.movers.map((m) => ({ ...m, top: { ...m.top } })),
        boss: world.boss && { ...world.boss },
        parade: world.parade && structuredClone(world.parade),
        flight: world.flight && { ...world.flight, cart: { ...world.flight.cart } },
        hallCarts: world.hallCarts.map((c) => ({ ...c })),
        hallDoors: world.hallDoors.map((d) => ({ ...d })),
      };
    },
  };
  return world;
}
