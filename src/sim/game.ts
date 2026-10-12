import { HERO_H, SNAP, STEP } from "./constants";
import { FALL_MARGIN, createCast, hittable, npcRect, strikeNpc, type Npc } from "./cast";
import { crateRect, crateSolids, cratesOf, hitCrate, stepCrates, type Crate, type CrateHit } from "./crates";
import { damage, PATIENCE_MAX } from "./damage";
import type { GameEvent } from "./events";
import { createHero } from "./hero";
import { BURST_R, MALLET_R } from "./hits";
import { bodyRect, overlapsRect } from "./geometry";
import { emptyInput, type Input } from "./input";
import { stageOf, type DoorSpec, type Level } from "./level";
import type { Missile } from "./missiles";
import { CHARGE_MAX, moveU, type Move } from "./moves";
import { floorAt } from "./physics";
import { collectPickups, seedRewards, stepPickups, type Pickup, type PickupKind } from "./rewards";
import { addCans, addScore, createRun, RUN, type Run } from "./run";
import { createCart, knock } from "./targets";
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
  /** The door he stands in front of, if any: it glows and the hint names it. */
  door: DoorSpec | null;
  /** This step's events: the world's and the game's. */
  events: GameEvent[];
  step(input: Input): void;
  newRun(seed: number): void;
  togglePause(): void;
};

/** The stash's layout comes from the run's seed, offset so it differs from the lobby's. */
const STASH_SEED = 7919;
/** The shipped 20 px door reach at the new scale. */
const DOOR_REACH = 136;
/** How far above the slam a crate's bottom may hang and still be shaken open: a jump's bump and then some. */
const SMASH_UP = 600;
/** The shield's knock: the staff knockback (spec §9); a cart already flying faster than `flying` is left alone. */
const SHIELD = { speed: 1100, lift: 600, flying: 300 } as const;
/** How close to the exit's middle he walks before the lobby ends. */
const EXIT_REACH = 60;

const near = (p: Point, r: Rect, pad: number) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;

/**
 * A run of the lobby: the world, plus everything the shipped engine kept around it (src/game/engine.ts):
 * the seeded pickups and the crates, score, cans, lives and the clock, punch clocks, deaths and respawn.
 */
/** `cast: false` runs the lobby with nobody in it (the older browser checks). */
export function createGame(levels: Levels, seed: number, opts: { cast?: boolean } = {}): Game {
  const world = createWorld(stageOf(levels.lobby), levels.lobby.spawn, { patience: RUN.patience });
  let timedOut = false;
  /** Down must come up between doors, so arriving with it held never sends him straight back. */
  let armed = true;
  /** The stash's shelves this run: stocked on the first visit and never again (owner, 2026-10-12). */
  let stashStock: { pickups: Pickup[]; crates: Crate[] } | null = null;
  /** The lobby as he left it for the stash. */
  let lobbySave: { pickups: Pickup[]; crates: Crate[]; targets: World["targets"]; cast: Npc[]; missiles: Missile[]; facing: 1 | -1; door: DoorSpec } | null = null;
  let exitDoor: DoorSpec | null = null;
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
    door: null,
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
    world.cast = opts.cast === false ? [] : createCast(lobby, world.targets);
    world.missiles = [];
    world.nextMissile = 0;
    world.snot = [];
    world.puddles = [];
    world.hits = [];
    world.swing = [];
    standAt(at);
    game.run.time = lobby.time;
    game.run.star = 0;
    timedOut = false;
    swingMove = null;
    lobbySave = null;
    exitDoor = null;
    game.door = null;
    setMode("card", ev, RUN.cardT);
  }

  function newRun(s: number) {
    game.run = createRun(s);
    stashStock = null;
    begin(0, (game.events = []));
  }

  /** A break, or back from one: the mode event goes into a fresh events list for the caller to drain. */
  function togglePause() {
    if (game.mode !== "play" && game.mode !== "pause") return;
    game.events = [];
    setMode(game.mode === "play" ? "pause" : "play", game.events);
  }

  function die(ev: GameEvent[]) {
    // No door glows over a man going down.
    game.door = null;
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
        // The slam shakes everything over the floor within its reach, crates hung at head-bump height included.
        for (const c of live) if (Math.abs(c.x - e.x) <= BURST_R && e.y - c.y <= SMASH_UP && c.y <= e.y + 1) hit(c, "burst");
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
        // A crate still locked from a bump does not spend the swing: it keeps trying until the lock ends.
        if (!swingHit.has(c.id) && near(p, crateRect(c), MALLET_R) && hit(c, "mallet")) swingHit.add(c.id);
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

  /** Moves him into another level: the stash, or back to the lobby as it was. */
  function enter(level: Level, at: Point) {
    game.level = level;
    restage();
    world.snot = [];
    world.puddles = [];
    world.hits = [];
    world.swing = [];
    const h = world.hero;
    h.move = null;
    h.crouch = false;
    h.slideT = 0;
    h.h = HERO_H;
    standAt(at);
  }

  /**
   * The shipped doors: down, on the ground, doing nothing else, within reach of the door's middle.
   * The staff door goes to the stash (restocked each visit, its clock stopped); the cart there
   * comes back. The exit needs no key: walking into it ends the lobby. Returns true if he left.
   */
  function tryDoors(input: Input, ev: GameEvent[]): boolean {
    const h = world.hero;
    if (!input.held.down) armed = true;
    game.door = game.level.doors.find((d) => Math.abs(h.x - d.x) <= DOOR_REACH && Math.abs(h.y - d.y) < 60) ?? null;
    // Only a man still on his feet clocks out: not one knocked flat, or out of time, thrown into the door.
    const standing = h.move?.kind !== "tumble" && !timedOut;
    const exit = standing
      ? game.level.doors.find((d) => d.kind === "exit" && Math.abs(h.x - d.x) <= EXIT_REACH && Math.abs(h.y - d.y) < 60 && h.onGround)
      : undefined;
    if (exit) {
      exitDoor = exit;
      world.hits = [];
      ev.push({ type: "exit" });
      setMode("walkoff", ev, RUN.walkoffT);
      return true;
    }
    const d = game.door;
    if (!d || !armed || !input.held.down || !h.onGround || h.move) return false;
    armed = false;
    ev.push({ type: "door", kind: d.kind, id: d.id });
    if (d.kind === "stash") {
      lobbySave = { pickups: game.pickups, crates: game.crates, targets: world.targets, cast: world.cast, missiles: world.missiles, facing: h.facing, door: d };
      const stash = levels.stash;
      stashStock ??= { pickups: seedRewards(stash, game.run.seed + STASH_SEED), crates: cratesOf(stash) };
      game.crates = stashStock.crates;
      game.pickups = stashStock.pickups;
      world.targets = stash.carts.map((x, i) => createCart(i + 1, x));
      // Nobody works the stash.
      world.cast = [];
      world.missiles = [];
      enter(stash, stash.spawn);
      game.door = null;
      const cleanedOut = game.pickups.every((p) => p.taken) && game.crates.every((c) => c.used || c.broken);
      if (cleanedOut) ev.push({ type: "stashEmpty" });
      return true;
    }
    if (d.kind === "return" && lobbySave) {
      const save = lobbySave;
      lobbySave = null;
      game.pickups = save.pickups;
      game.crates = save.crates;
      world.targets = save.targets;
      world.cast = save.cast;
      world.missiles = save.missiles;
      enter(levels.lobby, { x: save.door.x, y: save.door.y });
      h.facing = save.facing;
      game.door = save.door;
      return true;
    }
    return false;
  }

  /** He walks into the exit door, nothing touching him. */
  function walkoff(ev: GameEvent[]) {
    const h = world.hero;
    const to = exitDoor?.x ?? h.x;
    const walk = emptyInput();
    if (Math.abs(to - h.x) > 8) walk.held[to > h.x ? "right" : "left"] = true;
    world.step(walk);
    ev.push(...world.events.filter((e) => e.type === "land"));
    game.modeT -= STEP;
    if (game.modeT <= 1e-9) setMode("tally", ev, RUN.clearHold);
  }

  /** The leftover clock drains into points, fifty a second; then a beat, then the lobby is clear. */
  function tally(ev: GameEvent[]) {
    const run = game.run;
    if (run.time > 0) {
      const before = Math.floor(run.time);
      run.time = Math.max(0, run.time - RUN.tallyRate * STEP);
      const after = Math.floor(run.time);
      for (let s = before; s > after; s--) {
        addScore(run, RUN.tallyPoints);
        ev.push({ type: "tallyTick", seconds: s - 1 });
      }
      return;
    }
    game.modeT -= STEP;
    if (game.modeT <= 1e-9) {
      ev.push({ type: "clear" });
      setMode("clear", ev);
    }
  }

  /** The Buc-ee's shield: whatever he runs into goes flying away from him, cast included, and he keeps going. */
  function shieldBowl(ev: GameEvent[]) {
    const h = world.hero;
    for (const n of world.cast) {
      if (!hittable(n) || !overlapsRect(bodyRect(h), npcRect(n))) continue;
      strikeNpc(n, "shield", n.x >= h.x ? 1 : -1, world, ev);
    }
    for (const t of world.targets) {
      const touching = Math.abs(t.x - h.x) < (t.w + h.w) / 2 && t.y - t.h < h.y && h.y - h.h < t.y;
      // A cart already flying away is left alone; one rolling at him is bowled.
      if (!touching || (Math.abs(t.vx) > SHIELD.flying && (t.x - h.x) * t.vx > 0)) continue;
      const dir: 1 | -1 = t.x === h.x ? h.facing : t.x > h.x ? 1 : -1;
      knock(t, dir, SHIELD.speed, SHIELD.lift);
      ev.push({ type: "hit", by: "shield", x: t.x, y: t.y - t.h / 2, target: t.id });
    }
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
    // The cast's points ride their events; the eighth bowl of a chain is a life.
    const score = (list: GameEvent[]) => {
      for (const e of list) {
        if ("points" in e && e.points) addScore(run, e.points);
        if (e.type === "chain" && e.oneUp) {
          run.lives++;
          ev.push({ type: "oneUp" });
        }
      }
    };
    score(world.events);
    strikeCrates(ev);
    if (tryDoors(input, ev)) return;
    stepCrates(game.crates, STEP);
    stepPickups(game.pickups, world.stage, STEP);
    // Knocked flat on his last pip he is on his way out: nothing he tumbles past is his, no clock punches.
    const lethal = h.move?.kind === "tumble";
    if (!lethal) for (const kind of collectPickups(h, game.pickups, ev)) take(kind, ev);
    if (run.star > 0) {
      // The shield's bowling scores like any other hit on the cast.
      const bowled: GameEvent[] = [];
      shieldBowl(bowled);
      score(bowled);
      ev.push(...bowled);
    }
    if (!lethal && game.level.id === "lobby")
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
    else if (game.mode === "walkoff") walkoff(ev);
    else if (game.mode === "tally") tally(ev);
  }

  begin(0, game.events);
  game.events = [];
  return game;
}
