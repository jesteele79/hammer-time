import { SNAP, STEP } from "./constants";
import { CRATE, crateRect, crateSolids, cratesOf, hitCrate, stepCrates, type Crate, type CrateHit } from "./crates";
import { damage, PATIENCE_MAX } from "./damage";
import type { GameEvent } from "./events";
import { createHero } from "./hero";
import { BURST_R, MALLET_R } from "./hits";
import type { Input } from "./input";
import { stageOf, type Level } from "./level";
import { CHARGE_MAX, moveU, type Move } from "./moves";
import { floorAt } from "./physics";
import { collectPickups, seedRewards, stepPickups, type Pickup, type PickupKind } from "./rewards";
import { addCans, addScore, createRun, RUN, type Run } from "./run";
import { createCart } from "./targets";
import type { Point, Rect } from "./types";
import { createWorld, type World } from "./world";

export type GameMode = "card" | "play" | "pause" | "dying" | "over" | "walkoff" | "tally" | "clear";
export type Levels = { lobby: Level; stash: Level };

export type Game = {
  levels: Levels;
  level: Level;
  world: World;
  run: Run;
  pickups: Pickup[];
  crates: Crate[];
  mode: GameMode;
  /** Seconds left of a card, a death or the tally's hold. */
  modeT: number;
  /** This step's events: the world's and the game's. */
  events: GameEvent[];
  step(input: Input): void;
  newRun(seed: number): void;
  togglePause(): void;
};

/** A fall this far above the level's bottom edge is a lost life: he is off the screen by then. */
const FALL_MARGIN = 200;

const near = (p: Point, r: Rect, pad: number) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;

/**
 * A run of the lobby: the world, plus everything the shipped engine kept around it (src/game/engine.ts):
 * the seeded pickups and the crates, score, cans, lives and the clock, punch clocks, deaths and respawn.
 */
export function createGame(levels: Levels, seed: number): Game {
  const world = createWorld(stageOf(levels.lobby), levels.lobby.spawn, { patience: RUN.patience });
  let timedOut = false;
  let nextPickup = 1000;
  let swingMove: Move | null = null;
  const swingHit = new Set<string>();
  let bellRung = false;

  const game: Game = {
    levels,
    level: levels.lobby,
    world,
    run: createRun(seed),
    pickups: [],
    crates: [],
    mode: "card",
    modeT: RUN.cardT,
    events: [],
    step,
    newRun,
    togglePause,
  };

  function setMode(mode: GameMode, ev: GameEvent[], seconds = 0) {
    game.mode = mode;
    game.modeT = seconds;
    ev.push({ type: "mode", mode });
  }

  const restage = () => {
    world.stage = stageOf(game.level, crateSolids(game.crates));
  };

  /** Stands him on the floor under `at`, still and fresh. */
  function standAt(at: Point) {
    const h = world.hero;
    h.x = at.x;
    h.y = floorAt(world.stage, at.x, at.y - SNAP) ?? at.y;
    h.vx = 0;
    h.vy = 0;
    h.onGround = true;
  }

  /** The lobby as the run laid it out, him at the last punch clock with a full clock: the shipped respawn. */
  function begin(charge: number, ev: GameEvent[]) {
    const lobby = levels.lobby;
    game.level = lobby;
    game.crates = cratesOf(lobby);
    game.pickups = seedRewards(lobby, game.run.seed);
    const k = lobby.checkpoints.find((c) => c.id === game.run.checkpoint);
    const at = k ?? lobby.spawn;
    Object.assign(world.hero, createHero(at, { patience: RUN.patience, charge }));
    restage();
    world.targets = lobby.carts.map((x, i) => createCart(i + 1, x));
    world.snot = [];
    world.puddles = [];
    world.hits = [];
    world.swing = [];
    standAt(at);
    game.run.time = lobby.time;
    game.run.star = 0;
    timedOut = false;
    swingMove = null;
    setMode("card", ev, RUN.cardT);
  }

  function newRun(s: number) {
    game.run = createRun(s);
    begin(0, (game.events = []));
  }

  function togglePause() {
    if (game.mode === "play") game.mode = "pause";
    else if (game.mode === "pause") game.mode = "play";
  }

  function die(ev: GameEvent[]) {
    setMode("dying", ev, RUN.dieT);
  }

  function loseLife(ev: GameEvent[]) {
    game.run.lives--;
    ev.push({ type: "lifeLost", lives: game.run.lives });
    if (game.run.lives <= 0) {
      setMode("over", ev);
      ev.push({ type: "over" });
      return;
    }
    const charge = world.hero.charge;
    begin(charge, ev);
    world.hero.invuln = RUN.respawnGrace;
    ev.push({ type: "respawn" });
  }

  function take(kind: PickupKind, ev: GameEvent[]) {
    const h = world.hero;
    const run = game.run;
    if (kind === "can") h.heat = Math.max(0, h.heat - addCans(run, 1, ev));
    else if (kind === "nuts") {
      addScore(run, RUN.nutPoints);
      h.charge = Math.min(CHARGE_MAX, h.charge + RUN.nutCharge);
    } else if (kind === "bucees") {
      addScore(run, RUN.buceesPoints);
      run.star = RUN.star;
      h.invuln = Math.max(h.invuln, run.star);
    } else {
      addScore(run, RUN.pepperPoints);
      h.patience = PATIENCE_MAX;
      h.hot = true;
    }
  }

  /** What the head, the mallet and the smash did to the crates and the bell this step. */
  function strikeCrates(ev: GameEvent[]) {
    const h = world.hero;
    const out = { pickups: game.pickups, events: [] as GameEvent[], nextId: () => ++nextPickup };
    const ctx = { patience: h.patience, star: game.run.star > 0, hot: h.hot };
    const hit = (c: Crate, how: CrateHit) => hitCrate(c, how, ctx, out);
    const live = game.crates.filter((c) => !c.broken);
    for (const e of world.events) {
      if (e.type === "bump") {
        const c = live.find((k) => near(e, crateRect(k), 1));
        if (c) hit(c, "bump");
      } else if (e.type === "burst") {
        for (const c of live) if (Math.hypot(c.x - e.x, c.y - CRATE.size / 2 - e.y) <= BURST_R) hit(c, "burst");
      }
    }
    if (h.move !== swingMove) {
      swingMove = h.move;
      swingHit.clear();
      bellRung = false;
    }
    const bell = game.level.furniture.find((f) => f.kind === "bell");
    for (const p of world.swing) {
      for (const c of live)
        if (!swingHit.has(c.id) && near(p, crateRect(c), MALLET_R)) {
          swingHit.add(c.id);
          hit(c, "mallet");
        }
      if (bell && !bellRung && near(p, bell, MALLET_R)) {
        bellRung = true;
        ev.push({ type: "bell", x: bell.x + bell.w / 2, y: bell.y });
      }
    }
    let broke = false;
    for (const e of out.events) {
      if (e.type === "canPop") h.heat = Math.max(0, h.heat - addCans(game.run, 1, ev));
      if (e.type === "caseBreak") {
        addScore(game.run, RUN.casePoints);
        broke = true;
      }
      ev.push(e);
    }
    if (broke) restage();
  }

  function playStep(input: Input, ev: GameEvent[]) {
    const h = world.hero;
    const run = game.run;
    if (game.level.time > 0 && !timedOut) {
      run.time = Math.max(0, run.time - STEP);
      if (run.time === 0) {
        timedOut = true;
        ev.push({ type: "timeOut" });
        // Out of time is a knockdown where he stands, whatever grace he has; one already under way stands.
        if (h.move?.kind !== "tumble") {
          h.patience = 1;
          h.invuln = 0;
          damage(h, world.stage, h.x + h.facing, ev);
        }
      }
    }
    if (run.star > 0) {
      run.star = Math.max(0, run.star - STEP);
      h.invuln = Math.max(h.invuln, run.star);
    }
    world.step(input);
    ev.push(...world.events);
    strikeCrates(ev);
    stepCrates(game.crates, STEP);
    stepPickups(game.pickups, world.stage, STEP);
    for (const kind of collectPickups(h, game.pickups, ev)) take(kind, ev);
    if (game.level.id === "lobby")
      for (const k of game.level.checkpoints)
        if (!run.punched.includes(k.id) && h.x >= k.x) {
          run.punched.push(k.id);
          run.checkpoint = k.id;
          ev.push({ type: "checkpoint", id: k.id, x: k.x, y: k.y });
        }
    const b = world.stage.bounds;
    if (h.y > b.y + b.h - FALL_MARGIN) {
      ev.push({ type: "fell" });
      die(ev);
    } else if (h.move?.kind === "tumble" && moveU(h.move) >= RUN.lieAt) die(ev);
  }

  function step(input: Input) {
    const ev: GameEvent[] = [];
    game.events = ev;
    if (game.mode === "card") {
      game.modeT -= STEP;
      if (game.modeT <= 1e-9) setMode("play", ev);
    } else if (game.mode === "dying") {
      game.modeT -= STEP;
      if (game.modeT <= 1e-9) loseLife(ev);
    } else if (game.mode === "play") playStep(input, ev);
  }

  begin(0, game.events);
  game.events = [];
  return game;
}
