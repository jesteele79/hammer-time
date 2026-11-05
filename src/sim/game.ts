import { HERO_H, SNAP, STEP } from "./constants";
import { CAST_ID, FALL_MARGIN, createCast, hittable, npcRect, strikeNpc, type Npc } from "./cast";
import { crateRect, crateSolids, cratesOf, hitCrate, stepCrates, type Crate, type CrateHit } from "./crates";
import { damage, PATIENCE_MAX } from "./damage";
import type { GameEvent } from "./events";
import { createHero, type HeroOptions } from "./hero";
import { BURST_R, MALLET_R } from "./hits";
import { bodyRect, overlapsRect } from "./geometry";
import { emptyInput, type Input } from "./input";
import { PICKUP_SIZE, stageOf, tierMet, type CastSpawn, type DoorSpec, type Lesson, type Level, type LevelId } from "./level";
import type { Missile } from "./missiles";
import { CHARGE_MAX, moveU, type Move } from "./moves";
import { floorAt } from "./physics";
import { PIG, createPig } from "./pig";
import { createHallCarts, createHallDoors, KEY_REACH } from "./hall";
import { TITANIUM } from "./titanium";
import { collectPickups, dropPickup, keycardsOf, laneRewards, seedRewards, stepPickups, type Pickup, type PickupKind } from "./rewards";
import { addCans, addScore, createRun, RUN, type Run } from "./run";
import { AMBASSADOR_CHECKPOINT, KEYCARD_POINTS, LATE_CHECKOUT, TIER_POINTS, tierOf } from "./status";
import { createCart, knock } from "./targets";
import { createMover } from "./movers";
import { createBoss } from "./boss";
import { createSwingDoors } from "./hazards";
import type { Point, Rect } from "./types";
import { createWorld, type World } from "./world";
import { createHungry, stepHungry, type HungryResult } from "./quests/hungry/hungry";
import { createFares, stepFares, type FaresResult } from "./quests/fares/fares";
import type { Quest, QuestId } from "./quests/quest";
import type { Carry, Snapshot } from "./journey";
import { HOME_INSULTS } from "../game/lines";
import { shuffled } from "./rewards";

/** `story`: the game holds between levels (or before the first) while the shell shows the story's cards; nothing steps. */
export type GameMode = "card" | "play" | "pause" | "dying" | "over" | "walkoff" | "tally" | "clear" | "title" | "questCard" | "quest" | "questTally" | "story";
/**
 * The lobby and its stash, the venues after the lobby in the shift's order (R3 §2), and the levels that may stand as the
 * home screen's scene without being part of Work the whole shift (the lobby at night).
 */
export type Levels = { lobby: Level; stash: Level; venues?: Level[]; homes?: Level[] };
/**
 * A run of the journey (story Phase 1): `shift` the levels it plays (the stop's to the end of its act), `journey` its rules
 * (three lives a card, the snapshot, the story hold after each level), `snapshot` the run to restore (Try again, or the
 * save), `hold` to begin in `story` for the cards before the first level.
 */
export type RunOptions = { shift?: Level[]; journey?: boolean; snapshot?: Snapshot | null; hold?: boolean };

export type Game = {
  levels: Levels;
  /** The shift's venues in order: the lobby first. */
  shift: Level[];
  /** The venue he is in: an index into the shift. */
  venue: number;
  /** Where this shift began: "Try again" and "Play again" start there. */
  start: number;
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
  /**
   * A fresh run from a card. With no options it is today's whole shift (Work the whole shift); with options it is the
   * journey's: a Try again (a snapshot alone) keeps the shift and the journey's rules it was in.
   */
  newRun(seed: number, start?: number, opts?: RunOptions): void;
  /** A journey run: three lives a card, the snapshot at every card, the story hold after every level. */
  journey: boolean;
  /** The run and what he carried as they stood at this level's card (a journey run only). */
  snapshot: Snapshot | null;
  /** On from the story hold: to the level's card, or after a level to the next one's (or `clear` after the last). */
  continueStory(): void;
  /** What he has scored inside this level: the run's score less its score at the card. */
  levelScore(): number;
  /** Seconds on the home screen this visit. */
  titleT: number;
  /** Which run this is: a new id at every `newRun`, Try again's and a replay's included (the lifetime staff bonked count tells runs apart by it). */
  runs: number;
  /**
   * A step of the home screen's scene (story spec §5.1): he stands at the home spot running his idle beats, the cast
   * still, a snot rocket at 45 s and every minute after, an insult as his thought every eight seconds until the visit's
   * twelve are spent.
   */
  titleStep(): void;
  togglePause(): void;
  /** Back to the start screen: the game holds, nothing steps, until a new run is chosen. */
  toTitle(): void;
  /** The level the home screen shows from the next visit on (story spec §5.1): none is the first with a home spot. */
  setHome(id: LevelId | undefined): void;
  /** The banquet while its card shows, it runs, or its tally waits (R4). */
  quest: Quest | null;
  /** The door it was opened from; null for practice from the start screen. */
  questDoor: DoorSpec | null;
  /** Practice from the start screen, or Play again on a practice tally: a round on its own (R4 §8). */
  newQuest(seed: number, id?: QuestId): void;
  /** Continue on a door's tally: what he ate comes home with him, and he stands at the door (R4 §7). */
  finishQuest(): void;
};

/** The stash's layout comes from the run's seed, offset so it differs from the lobby's. */
const STASH_SEED = 7919;
/** Each venue after the lobby seeds its pickups this far from the run's seed, so venues differ and the lobby stays as it was. */
export const VENUE_SEED = 104729;
/** The shipped 20 px door reach at the new scale. */
const DOOR_REACH = 136;
/** How far above the slam a crate's bottom may hang and still be shaken open: a jump's bump and then some. */
const SMASH_UP = 600;
/** The shield's knock: the staff knockback (spec §9); a cart already flying faster than `flying` is left alone. */
const SHIELD = { speed: 1100, lift: 600, flying: 300 } as const;
/** The home screen's beats (story spec §5.1, plan decision 8): an insult every 8 s held 3.2 s; a snot rocket at 45 s, then every 60 s. */
export const TITLE = { thinkEvery: 8, think: 3.2, snotAt: 45, snotEvery: 60 } as const;
/**
 * A level's thoughts (SAT's marks): held 3 s, said when a step carries him over the mark going right and he is still
 * within `reach` of it, so walking by says it and a jump far past it (a teleport) does not save it up for later.
 */
export const THINK = { seconds: 3, reach: 160 } as const;
/** The moves the world's events teach: a lesson stops once he has done its move (story spec §6.2). */
const LEARNED_BY: Partial<Record<GameEvent["type"], Lesson>> = { jump: "jump", slide: "slide", swing: "swing", sniff: "snot", wipeStart: "wipe" };
/** The seconds a laundry chute's slide costs him, and how long a wet floor holds him. */
/** `slipAgain`: how long a stumble keeps him on his feet after it, long enough to walk off the wet stretch. */
/** The key door among the mallet's victims: clear of the carts', the cast's and the bosses'. */
const KEY_ID = 902;
/** The door the suite's bellhops come in by, the ids their carts start from, and how long the level runs on after the rail. */
const BELLHOP_DOOR = 1650;
const CART_FROM = 500;
const BOSS_OVER = 1.5;
export const TOWER_TRAPS = { chute: 2, slip: 0.5, slipSpeed: 60, slipAgain: 1.6 } as const;
/** How near a tall level's punch clock he must pass, on its floor. */
const CLOCK_REACH = 120;
/** How close to the exit's middle he walks before the lobby ends. */
const EXIT_REACH = 60;

const near = (p: Point, r: Rect, pad: number) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;

/**
 * A run of the lobby: the world, plus everything the shipped game's engine kept around it:
 * the seeded pickups and the crates, score, cans, lives and the clock, punch clocks, deaths and respawn.
 */
/** `cast: false` runs the lobby with nobody in it (the older browser checks); `title` holds it on the start screen. */
export function createGame(levels: Levels, seed: number, opts: { cast?: boolean; start?: number; title?: boolean; home?: LevelId } = {}): Game {
  /** Today's whole shift: the lobby and the venues after it. */
  const wholeShift = [levels.lobby, ...(levels.venues ?? [])];
  const clampStart = (s: number | undefined, length = wholeShift.length) => Math.min(length - 1, Math.max(0, Math.floor(s ?? 0)));
  let homeId = opts.home;
  /** The level the home screen shows: the save's choice, else the first of the whole shift with a home spot (the lobby by the desk). */
  const homeLevel = () => [...wholeShift, ...(levels.homes ?? [])].find((l) => l.id === homeId) ?? wholeShift.find((l) => l.home) ?? wholeShift[0];
  /** The home scene's own shift: the whole shift when it is part of it, else just that level. */
  const homeShift = () => (wholeShift.includes(homeLevel()) ? wholeShift : [homeLevel()]);
  const firstShift = opts.title && homeId ? homeShift() : wholeShift;
  const start = opts.title && homeId ? firstShift.indexOf(homeLevel()) : clampStart(opts.start);
  const world = createWorld(stageOf(firstShift[start]), firstShift[start].spawn, { patience: RUN.patience });
  let timedOut = false;
  /** Down must come up between doors, so arriving with it held never sends him straight back. */
  let armed = true;
  /** The mode a break came from: the shift's play or the banquet's round. */
  let paused: "play" | "quest" = "play";
  /** The stash's shelves this run: stocked on the first visit and never again (owner, 2026-10-12). */
  let stashStock: { pickups: Pickup[]; crates: Crate[] } | null = null;
  /** The lobby as he left it for the stash. */
  let lobbySave: { level: Level; pickups: Pickup[]; crates: Crate[]; targets: World["targets"]; cast: Npc[]; missiles: Missile[]; facing: 1 | -1; door: DoorSpec } | null = null;
  let exitDoor: DoorSpec | null = null;
  let nextPickup = 1000;
  let swingMove: Move | null = null;
  const swingHit = new Set<string>();
  let bellRung = false;
  /** The story hold: before a level's card (its cards first) or after its tally. */
  let storyAt: "before" | "after" = "after";
  let scoreAtCard = 0;
  let bonkedAtCard = 0;
  /** The cast counted as bonked in this layout of the level: each person once, however many ways they went. */
  const bonkedIds = new Set<number>();
  /** This visit to the home screen: the insults still to come, in the visit's order, and when the next beats fall. */
  let insults: string[] = [];
  let visits = 0;
  let nextThink: number = TITLE.thinkEvery;
  let nextSnot: number = TITLE.snotAt;
  /** The thoughts said this run, by level and mark: each once, a life lost or not. */
  const thought = new Set<string>();
  /** Where he stood at the end of the last step: a thought's mark is passed going right from here. */
  let thinkFrom = 0;
  /** How high his feet were at the end of the last step: a chute is fallen into from above it. */
  let feetFrom = 0;
  /** The wet floor he stands on: it slips him stepping onto it, not for standing there. */
  /** Keys held through a card down a hall: not a step until they are let go. */
  const heldThrough = { up: false, down: false };
  /** How many times the mallet has met 1417's reader this life. */
  let keyHits = 0;
  let onSlip: unknown = null;
  let slipCool = 0;

  const game: Game = {
    levels,
    shift: firstShift,
    venue: start,
    start,
    level: firstShift[start],
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
    toTitle,
    setHome(id) {
      homeId = id;
    },
    quest: null,
    questDoor: null,
    newQuest,
    finishQuest,
    journey: false,
    snapshot: null,
    continueStory,
    levelScore: () => game.run.score - scoreAtCard,
    titleT: 0,
    runs: 0,
    titleStep,
  };

  function setMode(mode: GameMode, ev: GameEvent[], seconds = 0) {
    game.mode = mode;
    game.modeT = seconds;
    ev.push({ type: "mode", mode });
  }

  const restage = () => {
    const stage = stageOf(game.level, crateSolids(game.crates));
    // The carts' tops are platforms he can ride.
    world.stage = world.movers.length ? { ...stage, platforms: [...stage.platforms, ...world.movers.map((m) => m.top)] } : stage;
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

  /** The venue he is in as the run laid it out, him at its last punch clock with a full clock: the shipped respawn. */
  function begin(carry: HeroOptions, ev: GameEvent[]) {
    const level = game.shift[game.venue];
    game.level = level;
    game.crates = cratesOf(level);
    // A level's layout is its own wherever the run began: seeded by its place in the whole shift (SAT after it).
    const place = wholeShift.indexOf(level);
    game.pickups = [...seedRewards(level, game.run.seed + (place >= 0 ? place : wholeShift.length) * VENUE_SEED), ...keycardsOf(level, game.run.spots)];
    if (level.hall) laneRewards(game.pickups, game.run.seed);
    bonkedIds.clear();
    const k = level.checkpoints.find((c) => c.id === game.run.checkpoint);
    const set = game.run.checkpoint === AMBASSADOR_CHECKPOINT ? game.run.checkpointAt : undefined;
    const at = set ?? k ?? level.spawn;
    Object.assign(world.hero, createHero(at, carry));
    world.movers = (level.movers ?? []).map(createMover);
    restage();
    // Each cart stands on the floor under it: a raised dock's too.
    world.targets = level.carts.map((x, i) => createCart(i + 1, x, floorAt(world.stage, x) ?? 0));
    world.swingDoors = createSwingDoors(level.swingDoors ?? []);
    // The gift shop's pig sleeps at its spot, fresh, each time the venue is laid out.
    world.pig = level.boss?.kind === "pig" ? createPig(level.boss, floorAt(world.stage, level.boss.x) ?? 0) : null;
    world.boss = level.boss && level.boss.kind !== "pig" ? createBoss(level.boss, level.boss.y ?? 0) : null;
    world.hallCarts = createHallCarts(level);
    world.hallDoors = createHallDoors(level);
    keyHits = 0;
    world.hero.lx = 0;
    world.zone = null;
    world.cast = opts.cast === false ? [] : createCast(level, world.targets, game.run.seed);
    // A keycard already dropped this run stays dropped: he comes back without it.
    for (const n of world.cast) if (n.carry === "keycard" && game.run.spots.includes(`cast:${n.spawn}`)) n.carry = null;
    world.missiles = [];
    world.nextMissile = 0;
    world.snot = [];
    world.samples = [];
    world.puddles = [];
    world.hits = [];
    world.swing = [];
    world.still = false;
    standAt(at);
    // Ambassador's checkpoint is where he stood, on a platform too; a punch clock's is on the floor under it.
    if (set) world.hero.y = set.y;
    thinkFrom = world.hero.x;
    feetFrom = world.hero.y;
    onSlip = null;
    slipCool = 0;
    // Gold's late checkout stays on the clock when he comes back in the level that gave it.
    game.run.time = level.time + (level.status && game.run.perks.includes("GOLD") ? LATE_CHECKOUT : 0);
    game.run.star = 0;
    timedOut = false;
    swingMove = null;
    lobbySave = null;
    exitDoor = null;
    game.door = null;
    setMode("card", ev, RUN.cardT);
  }

  /** At a journey level's card: three lives or more (plan decision 3), and the snapshot Try again restores. */
  function atCard() {
    scoreAtCard = game.run.score;
    bonkedAtCard = game.run.bonked;
    if (!game.journey) {
      game.snapshot = null;
      return;
    }
    game.run.lives = Math.max(RUN.lives, game.run.lives);
    const h = world.hero;
    const carry: Carry = { charge: h.charge, patience: h.patience, hot: h.hot, doggy: h.doggy, flop: h.flop, boxes: h.boxes };
    game.snapshot = structuredClone({ run: game.run, carry });
  }

  function newRun(s: number, from?: number, opts?: RunOptions) {
    const snap = opts?.snapshot ?? null;
    game.shift = opts?.shift ?? (snap ? game.shift : wholeShift);
    game.journey = opts?.journey ?? (!!snap && game.journey);
    game.start = game.venue = clampStart(from ?? game.start, game.shift.length);
    game.quest = null;
    game.questDoor = null;
    thought.clear();
    game.runs++;
    // A snapshot is the run at a card: no punch clock of the level before it counts here.
    game.run = snap ? { ...structuredClone(snap.run), checkpoint: null, checkpointAt: undefined, punched: [] } : createRun(s);
    stashStock = null;
    begin(snap ? { ...snap.carry } : { charge: 0, patience: RUN.patience }, (game.events = []));
    atCard();
    if (opts?.hold) {
      storyAt = "before";
      setMode("story", game.events);
    }
  }

  function continueStory() {
    if (game.mode !== "story") return;
    const ev: GameEvent[] = (game.events = []);
    if (storyAt === "before") setMode("card", ev, RUN.cardT);
    else if (game.venue < game.shift.length - 1) nextVenue(ev);
    else {
      ev.push({ type: "clear" });
      setMode("clear", ev);
    }
  }

  /** A visit to the home screen begins: him at the home spot facing in, the insults shuffled afresh, the beats from the top. */
  function visitHome() {
    const home = homeLevel().home;
    if (home && game.level.home) {
      standAt({ x: home.x, y: 0 });
      world.hero.facing = 1;
    }
    world.still = true;
    insults = shuffled(HOME_INSULTS, (game.run.seed + Math.imul(++visits, 7919)) >>> 0);
    game.titleT = 0;
    nextThink = TITLE.thinkEvery;
    nextSnot = TITLE.snotAt;
  }

  function toTitle() {
    game.quest = null;
    game.questDoor = null;
    // The home screen's scene is laid out fresh: the lobby as a shift finds it, whatever was played last.
    game.shift = homeShift();
    game.venue = game.start = game.shift.indexOf(homeLevel());
    game.journey = false;
    game.snapshot = null;
    game.run = createRun(game.run.seed);
    stashStock = null;
    begin({ charge: 0, patience: RUN.patience }, []);
    game.events = [];
    setMode("title", game.events);
    visitHome();
  }

  function titleStep() {
    if (game.mode !== "title") return;
    const ev: GameEvent[] = (game.events = []);
    world.still = true;
    game.titleT += STEP;
    const input = emptyInput();
    if (game.titleT >= nextSnot - 1e-9) {
      nextSnot += TITLE.snotEvery;
      if (world.hero.sinus >= 1) input.held.fire = input.pressed.fire = true;
    }
    world.step(input);
    // His thoughts here are the insults; the harrumph's "Any day now." would cut across them every eight seconds.
    for (const e of world.events) if (e.type !== "harrumph") ev.push(e);
    if (game.titleT >= nextThink - 1e-9) {
      nextThink += TITLE.thinkEvery;
      const text = insults.shift();
      if (text) ev.push({ type: "think", text, seconds: TITLE.think });
    }
  }

  /** A break, or back from one: the mode event goes into a fresh events list for the caller to drain. */
  function togglePause() {
    if (game.mode === "play" || game.mode === "quest") {
      paused = game.mode;
      game.events = [];
      setMode("pause", game.events);
    } else if (game.mode === "pause") {
      game.events = [];
      setMode(paused, game.events);
    }
  }

  function openQuest(q: Quest, door: DoorSpec | null, ev: GameEvent[]) {
    game.quest = q;
    game.questDoor = door;
    setMode("questCard", ev, RUN.cardT);
  }

  function newQuest(seed: number, id: QuestId = "hungry") {
    if (game.mode !== "title" && !(game.mode === "questTally" && !game.questDoor)) return;
    game.events = [];
    openQuest(id === "fares" ? createFares(seed, { practice: true }) : createHungry(seed, { practice: true, menu: id === "lounge" ? "lounge" : "banquet" }), null, game.events);
  }

  /** What the banquet pays (R4 §7): its score, a can, the smash, the shield, the pepper, and COMPED's doggy bag and belly-flop; no lives. */
  function payHungry(r: HungryResult, ev: GameEvent[]) {
    const h = world.hero;
    const run = game.run;
    addScore(run, r.score);
    if (r.doggy) h.doggy = Math.max(h.doggy, 1);
    if (r.flop) h.flop = true;
    if (r.cans) h.heat = Math.max(0, h.heat - addCans(run, r.cans, ev));
    if (r.nuts) h.charge = CHARGE_MAX;
    if (r.bucees) run.star = RUN.star;
    if (r.hot || r.full) {
      h.hot = true;
      h.patience = PATIENCE_MAX;
    }
    ev.push({ type: "questPaid", quest: "hungry", score: r.score, grade: r.grade, doggy: r.doggy, flop: r.flop, boxes: 0, cans: r.cans, lives: 0 });
  }

  /** What the gate pays (R5 §8): its score, a box of #15 blades a booking, the cans, a full smash from B GROUP, a life at A1. */
  function payFares(r: FaresResult, ev: GameEvent[]) {
    const h = world.hero;
    const run = game.run;
    addScore(run, r.score);
    h.boxes += r.boxes;
    if (r.cans) h.heat = Math.max(0, h.heat - addCans(run, r.cans, ev));
    if (r.nuts) h.charge = CHARGE_MAX;
    for (let i = 0; i < r.lives; i++) {
      run.lives++;
      ev.push({ type: "oneUp" });
    }
    ev.push({ type: "questPaid", quest: "fares", score: r.score, grade: r.grade, doggy: false, flop: false, boxes: r.boxes, cans: r.cans, lives: r.lives });
  }

  function finishQuest() {
    const q = game.quest;
    const d = game.questDoor;
    if (game.mode !== "questTally" || !q?.result || !d) return;
    const ev: GameEvent[] = (game.events = []);
    if (q.id === "fares") payFares(q.result, ev);
    else payHungry(q.result, ev);
    // The gate's round is the level's set piece (spec §6.3): its tally pays in as the shuttle's does and ends the level.
    if (d.kind === "gate") {
      game.quest = null;
      game.questDoor = null;
      game.door = null;
      setMode("tally", ev, RUN.clearHold);
      return;
    }
    const h = world.hero;
    h.move = null;
    h.crouch = false;
    h.slideT = 0;
    h.h = HERO_H;
    standAt({ x: d.x, y: d.y });
    h.invuln = Math.max(h.invuln, RUN.questGrace);
    // Down held from the tally opens nothing on the way back.
    armed = false;
    game.door = d;
    game.quest = null;
    game.questDoor = null;
    setMode("play", ev);
  }

  function die(ev: GameEvent[]) {
    // Lifetime Titanium guy is already over the rail: the win stands.
    if (bossBeaten()) {
      world.hero.move = null;
      world.hero.invuln = 99;
      return;
    }
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
    // The fight restarts with him at full health, so what he took comes back: no points, they were already his.
    if (world.boss?.kind === "titanium") game.run.cans += world.boss.owed;
    begin({ charge: world.hero.charge, patience: RUN.patience, doggy: world.hero.doggy, flop: world.hero.flop, boxes: world.hero.boxes }, ev);
    world.hero.invuln = RUN.respawnGrace;
    ev.push({ type: "respawn" });
  }

  /** The night's level he is working: the stash behind its door counts as it. */
  const statusVenue = () => game.shift[game.venue]?.status === true;

  /** A keycard: toward his status while the night's level is on, each tier paying once a run; just points anywhere else. */
  function takeKeycard(ev: GameEvent[]) {
    const h = world.hero;
    const run = game.run;
    if (!statusVenue()) {
      addScore(run, KEYCARD_POINTS);
      return;
    }
    run.keycards++;
    ev.push({ type: "keycard", n: run.keycards, x: h.x, y: h.y - h.h });
    const tier = tierOf(run.keycards);
    if (!tier || run.perks.includes(tier.name)) return;
    run.perks.push(tier.name);
    addScore(run, TIER_POINTS);
    ev.push({ type: "tier", name: tier.name, word: tier.word, x: h.x, y: h.y - h.h });
    ev.push({ type: "think", text: tier.thought, seconds: THINK.seconds });
    if (tier.name === "GOLD") run.time += LATE_CHECKOUT;
    else if (tier.name === "TITANIUM") {
      run.lives++;
      ev.push({ type: "oneUp" });
    } else if (tier.name === "AMBASSADOR") {
      // Where he stands: in the stash, the door he came in by.
      const door = lobbySave?.door;
      run.checkpoint = AMBASSADOR_CHECKPOINT;
      run.checkpointAt = door ? { x: door.x, y: door.y } : { x: h.x, y: h.onGround ? h.y : (floorAt(world.stage, h.x, h.y) ?? h.y) };
      game.pickups.push(dropPickup(++nextPickup, "bucees", h.x, h.y - h.h - 200));
    }
  }

  function take(kind: PickupKind, ev: GameEvent[]) {
    const h = world.hero;
    const run = game.run;
    if (kind === "keycard") takeKeycard(ev);
    else if (kind === "can") h.heat = Math.max(0, h.heat - addCans(run, 1, ev));
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

  /**
   * The shipped pepper refill: while he is not hot and none is out in the arena, one 150 px inside its left edge every 3 s.
   * A pepper outside the arena (the ! crate's, slid away past the chained exit) is out of his reach and does not count.
   */
  function refill(ev: GameEvent[]) {
    const p = world.pig;
    if (!p || p.state === "asleep" || p.state === "defeated" || p.refill > 0 || world.hero.hot) return;
    if (game.pickups.some((k) => k.kind === "pepper" && !k.taken && k.x >= p.arena[0] && k.x <= p.arena[1])) return;
    const x = p.arena[0] + PIG.refillAt;
    const y = (floorAt(world.stage, x) ?? 0) - PICKUP_SIZE;
    game.pickups.push({ id: ++nextPickup, kind: "pepper", x, y, taken: false });
    p.refill = PIG.refill;
    ev.push({ type: "pigRefill", x, y });
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
    world.movers = [];
    restage();
    world.swingDoors = createSwingDoors(level.swingDoors ?? []);
    world.zone = null;
    world.snot = [];
    world.samples = [];
    world.puddles = [];
    world.hits = [];
    world.swing = [];
    const h = world.hero;
    h.move = null;
    h.crouch = false;
    h.slideT = 0;
    h.h = HERO_H;
    standAt(at);
    thinkFrom = h.x;
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
    // A locked exit is chained until the pig is down.
    const open = (d: DoorSpec) => !d.locked || (world.boss ? world.boss.state === "down" : !world.pig || world.pig.state === "defeated");
    const exit = standing
      ? game.level.doors.find((d) => d.kind === "exit" && !d.down && open(d) && Math.abs(h.x - d.x) <= EXIT_REACH && Math.abs(h.y - d.y) < 60 && h.onGround)
      : undefined;
    if (exit) {
      exitDoor = exit;
      world.hits = [];
      ev.push({ type: "exit" });
      setMode("walkoff", ev, RUN.walkoffT);
      return true;
    }
    // A gate is walked into like an exit and opens Fare Darts as the level's set piece, the level frozen behind it.
    const gate = standing
      ? game.level.doors.find((d) => d.kind === "gate" && Math.abs(h.x - d.x) <= EXIT_REACH && Math.abs(h.y - d.y) < 60 && h.onGround)
      : undefined;
    if (gate) {
      exitDoor = gate;
      world.hits = [];
      ev.push({ type: "door", kind: gate.kind, id: gate.id });
      openQuest(createFares((game.run.seed ^ Math.imul(Math.round(gate.x), 7919)) >>> 0), gate, ev);
      return true;
    }
    const d = game.door;
    // Not on the way past one in a slide or a flop: ↓ held through it is for the slide.
    if (!d || !armed || !input.held.down || !h.onGround || h.move || h.slideT > 0) return false;
    // The banquet is once a shift: a spent door stays shut, and nothing is said about it.
    if (d.kind === "quest" && game.run.spent.includes(d.id)) return false;
    // Below its tier a door reads as closed: the hint says why.
    if (!tierMet(d, game.run.keycards)) return false;
    armed = false;
    // An exit on ↓: the stairs, and the elevator at Titanium.
    if (d.kind === "exit") {
      if (!d.down || !standing) return false;
      exitDoor = d;
      world.hits = [];
      ev.push({ type: "exit" });
      setMode("walkoff", ev, RUN.walkoffT);
      return true;
    }
    ev.push({ type: "door", kind: d.kind, id: d.id });
    if (d.kind === "quest") {
      game.run.spent.push(d.id);
      const seed = (game.run.seed ^ Math.imul(Math.round(d.x), 7919)) >>> 0;
      openQuest(d.quest === "fares" ? createFares(seed) : createHungry(seed, { menu: d.quest === "lounge" ? "lounge" : "banquet" }), d, ev);
      return true;
    }
    if (d.kind === "stash") {
      lobbySave = { level: game.level, pickups: game.pickups, crates: game.crates, targets: world.targets, cast: world.cast, missiles: world.missiles, facing: h.facing, door: d };
      const stash = levels.stash;
      stashStock ??= { pickups: [...seedRewards(stash, game.run.seed + STASH_SEED), ...(statusVenue() ? keycardsOf(stash, game.run.spots) : [])], crates: cratesOf(stash) };
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
      enter(save.level, { x: save.door.x, y: save.door.y });
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
    // A plane or a shoulder that reaches him on his way out queues a hit; he has clocked out, and it is let go.
    world.hits = [];
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
      if (game.journey) {
        // The journey holds after every level for the story's cards; the shell continues it.
        const last = game.venue >= game.shift.length - 1;
        storyAt = "after";
        setMode("story", ev);
        ev.push({ type: "levelDone", id: game.level.id, score: game.levelScore(), bonked: game.run.bonked - bonkedAtCard, last });
      } else if (game.venue < game.shift.length - 1) nextVenue(ev);
      else {
        ev.push({ type: "clear" });
        setMode("clear", ev);
      }
    }
  }

  /** On to the shift's next venue: what he carries comes along; he arrives cool with full snot, his shield spent, its clocks unpunched. */
  function nextVenue(ev: GameEvent[]) {
    const h = world.hero;
    const carry = { charge: h.charge, patience: h.patience, hot: h.hot, doggy: h.doggy, flop: h.flop, boxes: h.boxes };
    game.venue++;
    game.run.checkpoint = null;
    game.run.checkpointAt = undefined;
    game.run.punched = [];
    begin(carry, ev);
    atCard();
    ev.push({ type: "venue", id: game.level.id });
  }

  /** Everyone knocked out for good, run off or sent down a pit this step counts once on the run (plan decision 4). */
  function countBonked(list: GameEvent[]) {
    for (const e of list) {
      const out = (e.type === "castHit" && e.down) || e.type === "castFlee" || e.type === "castFell";
      if (!out || bonkedIds.has(e.id)) continue;
      bonkedIds.add(e.id);
      game.run.bonked++;
    }
  }

  /** Staff knocked out for good drop what they carried where the hit found them (owner, 2026-10-18: a fight to earn it). */
  function dropCarried(list: GameEvent[], ev: GameEvent[]) {
    for (const e of list) {
      if (e.type !== "castHit" || !e.down) continue;
      const n = world.cast.find((c) => c.id === e.id);
      if (!n?.carry) continue;
      game.pickups.push(dropPickup(++nextPickup, n.carry, e.x, e.y));
      ev.push({ type: "castDrop", id: n.id, kind: n.carry, x: e.x, y: e.y });
      if (n.carry === "keycard") game.run.spots.push(`cast:${n.spawn}`);
      n.carry = null;
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
        // Out of time is a knockdown where he stands, whatever grace he has (and whatever doggy bag); one already under
        // way stands.
        if (h.move?.kind !== "tumble") {
          h.patience = 1;
          h.invuln = 0;
          damage(h, world.stage, h.x + h.facing, ev, false);
        }
      }
    }
    if (run.star > 0) {
      run.star = Math.max(0, run.star - STEP);
      h.invuln = Math.max(h.invuln, run.star);
    }
    world.step(input);
    ev.push(...world.events);
    // The ice water: a pip, as any thrown thing, and it cools him right down.
    if (world.events.some((e) => e.type === "missileHit" && e.kind === "water" && e.hero)) {
      h.heat = 0;
      ev.push({ type: "think", text: "COLD. But fair.", seconds: THINK.seconds });
    }
    if (world.events.some((e) => e.type === "flop")) run.flopped = true;
    if (world.events.some((e) => e.type === "sampleThrow")) run.lobbed = true;
    learn(input, ev);
    for (const [i, t] of (game.level.thoughts ?? []).entries()) {
      const key = `${game.level.id}:${i}`;
      if (thought.has(key)) continue;
      // A mark with a floor fires near it on that floor, whichever way he comes; the rest as he passes them going right.
      const at = t.y === undefined ? thinkFrom <= t.x && h.x > t.x && h.x - t.x < THINK.reach : Math.abs(h.y - t.y) < 60 && Math.abs(h.x - t.x) < THINK.reach;
      if (!at) continue;
      thought.add(key);
      ev.push({ type: "think", text: t.text, seconds: THINK.seconds });
    }
    thinkFrom = h.x;
    towerTraps(ev);
    feetFrom = h.y;
    if (keyDoor(ev)) return;
    if (titaniumStep(ev)) return;
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
    countBonked(world.events);
    dropCarried(world.events, ev);
    // Waking the pig hands him the pepper and a moment's grace (its punch clock stands at the way in).
    if (world.events.some((e) => e.type === "pigWake")) {
      h.hot = true;
      h.patience = PATIENCE_MAX;
      h.invuln = Math.max(h.invuln, PIG.grace);
    }
    refill(ev);
    strikeCrates(ev);
    if (tryDoors(input, ev)) return;
    stepCrates(game.crates, STEP);
    stepPickups(game.pickups, world.stage, STEP);
    // Knocked flat on his last pip he is on his way out: nothing he tumbles past is his, no clock punches.
    const lethal = h.move?.kind === "tumble";
    if (!lethal)
      for (const kind of collectPickups(h, game.pickups, ev)) {
        take(kind, ev);
        if (kind !== "keycard") continue;
        for (const p of game.pickups) if (p.spot && p.taken && !run.spots.includes(p.spot)) run.spots.push(p.spot);
      }
    if (run.star > 0) {
      // The shield's bowling scores like any other hit on the cast.
      const bowled: GameEvent[] = [];
      shieldBowl(bowled);
      score(bowled);
      countBonked(bowled);
      ev.push(...bowled);
      dropCarried(bowled, ev);
    }
    if (!lethal)
      for (const k of game.level.checkpoints)
        // A tall level's clocks count on their own floor, near them; a long level's as he passes them.
        if (!run.punched.includes(k.id) && (game.level.floors ? Math.abs(h.y - k.y) < 60 && Math.abs(h.x - k.x) <= CLOCK_REACH : h.x >= k.x)) {
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

  const bossBeaten = () => world.boss?.kind === "titanium" && (world.boss.state === "pool" || world.boss.state === "down");
  /** How long after he goes over the rail the level ends. */
  let bossOverT = 0;
  /** What Lifetime Titanium guy's fight asks of the run: his bellhops, the grab's cans, the cans he gives back, and the end. */
  function titaniumStep(ev: GameEvent[]): boolean {
    const t = world.boss;
    if (t?.kind !== "titanium") return false;
    const run = game.run;
    const h = world.hero;
    const seen = world.events;
    if (bossBeaten()) {
      world.hits = [];
      h.invuln = Math.max(h.invuln, 1);
    }
    if (seen.some((e) => e.type === "bossPhase")) h.invuln = Math.max(h.invuln, TITANIUM.grace);
    if (seen.some((e) => e.type === "bossCall") && opts.cast !== false) callBellhops(t.x);
    const land = seen.find((e) => e.type === "grab" && e.phase === "land") as Extract<GameEvent, { type: "grab" }> | undefined;
    if (land) {
      const took = Math.min(TITANIUM.grab.takes, run.cans);
      run.cans -= took;
      t.owed += took;
      ev.push({ type: "grab", phase: "take", x: land.x, y: land.y, n: took });
    }
    if (t.pay > 0) {
      const n = t.pay;
      t.pay = 0;
      h.heat = Math.max(0, h.heat - addCans(run, n, ev));
      ev.push({ type: "giveBack", n, x: t.x, y: t.y - t.h * 0.6 });
    }
    if (seen.some((e) => e.type === "bossDown")) {
      bossOverT = BOSS_OVER;
      world.hits = [];
      h.invuln = 99;
    }
    if (t.state !== "down") return false;
    bossOverT -= STEP;
    if (bossOverT > 0) return false;
    world.hits = [];
    ev.push({ type: "exit" });
    setMode("walkoff", ev, RUN.walkoffT);
    return true;
  }

  /** Two bellhops from the door into the bedroom, a cart each, a keycard each, the lobby's rules. */
  function callBellhops(near: number) {
    const k = world.cast.length;
    const spawn = (i: number): CastSpawn => ({ id: `bell-suite-${k + i}`, person: i === 0 ? "bellhop-1" : "bellhop-2", x: BELLHOP_DOOR + i * 160, y: 0, cart: BELLHOP_DOOR + 90 + i * 160, x0: Math.max(BELLHOP_DOOR, near - 700), x1: near + 700, carry: "keycard" });
    for (const i of [0, 1]) {
      const s = spawn(i);
      const cart = createCart(CART_FROM + k + i, s.cart!, 0);
      world.targets.push(cart);
      const [n] = createCast({ cast: [s], carts: [] }, world.targets, game.run.seed + k + i);
      n.id = CAST_ID + 100 + k + i;
      n.noticed = true;
      world.cast.push(n);
    }
  }

  /** The mallet on 1417's reader: it fails, and fails, and on the last swing the door gives. True once the level is ending. */
  function keyDoor(ev: GameEvent[]): boolean {
    const key = game.level.keyDoor;
    const h = world.hero;
    const m = h.move;
    if (!key || m?.kind !== "swing" || !world.swing.length || m.victims.includes(KEY_ID) || Math.abs(h.x - key.x) > KEY_REACH) return false;
    m.victims.push(KEY_ID);
    keyHits++;
    ev.push({ type: "think", text: key.fails[Math.min(keyHits, key.fails.length) - 1], seconds: THINK.seconds });
    if (keyHits < key.hits) {
      ev.push({ type: "keyFail", n: keyHits, x: key.x, y: h.y - h.h * 0.6 });
      return false;
    }
    ev.push({ type: "keyOpen", x: key.x, y: h.y - h.h * 0.6 });
    world.hits = [];
    ev.push({ type: "exit" });
    setMode("walkoff", ev, RUN.walkoffT);
    return true;
  }

  /** A hall's keys as the sim's: W forward, S back, A and D his sidestep, and no slide; a key held through a card is not a step. */
  function hallInput(given: Input): Input {
    const { held, pressed } = given;
    if (game.mode !== "play") {
      heldThrough.up = held.up;
      heldThrough.down = held.down;
    } else {
      if (!held.up) heldThrough.up = false;
      if (!held.down) heldThrough.down = false;
    }
    const forward = held.up && !heldThrough.up;
    const back = held.down && !heldThrough.down;
    return {
      held: { ...held, right: forward, left: back, down: false, up: false },
      pressed: { ...pressed, right: pressed.up && forward, left: pressed.down && back, down: false, up: false },
      strafe: ((held.right ? 1 : 0) - (held.left ? 1 : 0)) as -1 | 0 | 1,
    };
  }

  /** Off a hall W and the up arrow are a jump, as they have always been. */
  function upJumps(given: Input): Input {
    if (!given.held.up && !given.pressed.up) return given;
    return { ...given, held: { ...given.held, jump: given.held.jump || given.held.up }, pressed: { ...given.pressed, jump: given.pressed.jump || given.pressed.up } };
  }

  /** The tower's traps: falling through a chute's gap costs the slide's seconds and no more; stepping on a wet floor slips him. */
  function towerTraps(ev: GameEvent[]) {
    const h = world.hero;
    const chute = game.level.chutes?.find((c) => h.x >= c.x && h.x <= c.x + c.w && feetFrom <= c.y && h.y > c.y);
    if (chute) {
      game.run.time = Math.max(0, game.run.time - TOWER_TRAPS.chute);
      h.vx = 0;
      ev.push({ type: "chute", x: h.x, y: chute.y });
    }
    const wet = game.level.puddle;
    const slip = game.level.slips?.find((s) => Math.abs(h.y - s.y) < 4 && Math.abs(h.x - s.x) < 70) ?? (wet && h.x >= wet.z0 * 100 && h.x <= wet.z1 * 100 && h.lx >= wet.lx0 && h.lx <= wet.lx1 ? wet : null);
    slipCool = Math.max(0, slipCool - STEP);
    if (slip && slip !== onSlip && slipCool <= 0 && h.onGround && Math.abs(h.vx) > TOWER_TRAPS.slipSpeed && h.invuln <= 0) {
      h.vx = -h.vx;
      h.slideT = 0;
      h.stunT = Math.max(h.stunT, TOWER_TRAPS.slip);
      slipCool = TOWER_TRAPS.slipAgain;
      ev.push({ type: "slip", x: h.x, y: h.y });
    }
    onSlip = slip;
  }




  /** The moves he did this step that he had not done this run. */
  function learn(input: Input, ev: GameEvent[]) {
    const h = world.hero;
    const learned = game.run.learned;
    const did = (move: Lesson) => {
      if (learned.includes(move)) return;
      learned.push(move);
      ev.push({ type: "lesson", move });
    };
    for (const e of world.events) {
      const move = LEARNED_BY[e.type];
      if (move) did(move);
    }
    if (input.held.run && Math.abs(h.vx) > 0) did("run");
  }

  function step(given: Input) {
    const input = game.level.hall ? hallInput(given) : upJumps(given);
    const ev: GameEvent[] = [];
    game.events = ev;
    if (game.mode === "card") {
      game.modeT -= STEP;
      if (game.modeT <= 1e-9) setMode("play", ev);
    } else if (game.mode === "dying") {
      game.modeT -= STEP;
      if (game.modeT <= 1e-9) loseLife(ev);
    } else if (game.mode === "questCard") {
      game.modeT -= STEP;
      if (game.modeT <= 1e-9) setMode("quest", ev);
    } else if (game.mode === "quest") {
      const q = game.quest!;
      if (q.id === "fares") stepFares(q, input, STEP);
      else stepHungry(q, input, STEP);
      ev.push(...q.events);
      if (q.result) setMode("questTally", ev);
    } else if (game.mode === "play") playStep(input, ev);
    else if (game.mode === "walkoff") walkoff(ev);
    else if (game.mode === "tally") tally(ev);
  }

  begin({ charge: 0, patience: RUN.patience }, game.events);
  game.events = [];
  // On the start screen the game holds on the title until a start is chosen; the first venue is laid out behind it.
  if (opts.title) {
    game.mode = "title";
    visitHome();
  }
  return game;
}
