import { Assets, Container, Graphics, RenderTexture, Sprite, Texture, type Ticker } from "pixi.js";
import { ART_BASE, loadRegistry, type Costume, type Expression, type Registry } from "../art/registry";
import { ASIDES, BANQUET_LECTURES, DAMAGE_LINE, DOGGY_LINE, GATE_GLOATS, GATE_INSULTS, GATE_PISSED, LECTURES, SAMPLE_LINES, SERVER_LECTURES, STAFF_COMEBACKS, TAUNT_LINES } from "../game/lines";
import type { TauntTarget } from "../game/taunts";
import { applyFeel, createClock, runFrame } from "../sim/clock";
import { HEAD_SCALE, LAND_T, STEP } from "../sim/constants";
import { PATIENCE_MAX } from "../sim/damage";
import type { GameEvent } from "../sim/events";
import { feelOf } from "../sim/feel";
import { sweptHeadHits } from "../sim/hits";
import { flies } from "../sim/missiles";
import { KEY_BINDINGS, emptyInput, inputFrom, type Action } from "../sim/input";
import { createGame, STATION, type GameMode } from "../sim/game";
import { CHARGE_MAX, HEAT, moveU, type Move } from "../sim/moves";
import { floorAt } from "../sim/physics";
import { ACTIONS, displayU, overlay } from "../sim/rig/actions";
import { CLIPS, type ClipCtx, type ClipName } from "../sim/rig/clips";
import { plantFeet, type FloorProbe } from "../sim/rig/feet";
import { solve, type Solved } from "../sim/rig/fk";
import { groundForAction, type Ground } from "../sim/rig/ground";
import { addBody, addLean, createLayers, stepLayers } from "../sim/rig/layers";
import { createPlayback, playAction } from "../sim/rig/playback";
import { blend, type Pose } from "../sim/rig/pose";
import { HERO_HEIGHT } from "../sim/rig/skeleton";
import { tierMet, type Level, type LevelId } from "../sim/level";
import { LOBBY } from "../sim/levels/lobby";
import { STASH } from "../sim/levels/stash";
import { RESTAURANT } from "../sim/levels/restaurant";
import { CAMPUS } from "../sim/levels/campus";
import { GIFTSHOP } from "../sim/levels/giftshop";
import { SAT } from "../sim/levels/sat";
import { LOBBY_NIGHT } from "../sim/levels/lobby-night";
import { FLIGHT } from "../sim/levels/flight";
import { PARIS } from "../sim/levels/paris";
import { TRAIN } from "../sim/levels/train";
import { BASEL } from "../sim/levels/basel";
import { LAB } from "../sim/levels/lab";
import { REPLACEMENT } from "../sim/levels/replacement";
import { HALLWAY } from "../sim/levels/hallway";
import { SUITE } from "../sim/levels/suite";
import { TOWER } from "../sim/levels/tower";
import { STOP_LEVELS } from "../sim/levels";
import type { Carry, Snapshot } from "../sim/journey";
import { shiftFrom, type StoryId } from "../sim/story";
import { PIG_ID } from "../sim/pig";
import { BOSS_ID } from "../sim/boss";
import { setTitanium } from "../sim/titanium";
import { heatZoneAt } from "../sim/hazards";
import type { HeroState, Point, Rect } from "../sim/types";
import type { Quality, RenderApp } from "./app";
import { TIERS, shouldStepDown3d } from "./quality";
import { VIEW_HALF, groundAt, loadBackdrop, type Backdrop } from "./backdrop";
import { createBoards, snapshotOf } from "./boards";
import { Bubbles, Speech } from "./bubbles";
import { costumeAt, costumeOf, createCharacter } from "./character";
import { ambientOf, ambientTint, createLighting, lightsOf, multiplyTint, type Light } from "./lighting";
import { drawCrate, loadProducts, Objects, productTexture, setBreadPicture } from "./objects";
import { PALETTE } from "./palette";
import { Particles, zoneParticle } from "./particles";
import { CAST, HATTED, type CastRole } from "../sim/cast";
import { Cast } from "./cast";
import { Flyers } from "./cast-fx";
import { fightFrame } from "./frame";
import { PIG_HEIGHT, PigView } from "./pig";
import { BossView } from "./boss-view";
import { PaintedFigure } from "./cast-body";
import { attackers } from "../sim/cast-behavior";
import { Props } from "./props";
import { HERO_METERS } from "./3d/hall-people";
import { HERO_SCREEN_FRACTION, LAYER_ORDER, PORTRAIT_ZOOM, createScene, floorFocus } from "./scene";
import { createSound, heard, hurryFor, musicFor, questMusic, tauntFor } from "./sound";
import { TOWEL_OUT } from "./towel";
import { hudKey, hudOf, pickupNote, type HudPayload } from "./hud";
import type { PickupKind } from "../sim/rewards";
import { installFonts, label } from "./text";
import { drawVenue, type VenueView } from "./venue";
import { backClipOf, backCycle, flatCabinOf, hallStateOf } from "./3d/hall-state";
import type { ThreeView } from "./3d/three-view";
import { SETS } from "./3d/sets";
import { ParisView } from "./venue-paris";
import { TrainView, loadTrainPieces, type TrainPieces } from "./venue-train";
import { BaselView, LANTERNS, loadBaselPieces, type BaselPieces } from "./venue-basel";
import { LabView, loadLabPieces, type LabPieces } from "./venue-lab";
import { TrainingView, loadTrainingPieces, type TrainingPieces } from "./venue-training";
import { beamOn } from "../sim/replacement";
import { loadSatPieces } from "./venue-sat";
import { HallFlatView } from "./venue-hall-flat";
import { TowerCarts, loadTowerPieces, type TowerPieces } from "./venue-tower";
import { NO_PAD, mapPad, readPad, type Pad } from "./gamepad";
import { Words } from "./words";
import { stepWalkOut, walkOutFrom, type WalkOut } from "./walk-out";
import { BanquetView } from "./quests/hungry-scene";
import { DINER_ID } from "./quests/diner";
import { banquetFrame } from "./quests/frame";
import { HUNGRY, createHungry, land, stepHungry, type Hungry } from "../sim/quests/hungry/hungry";
import { sharpPlayer } from "../sim/quests/hungry/drive";
import { FOODS, onMenu, type FoodKind, type Menu } from "../sim/quests/hungry/food";
import { SEATS, TABLE, onScreen, screenDeg, sub, type RivalId } from "../sim/quests/hungry/table";
import { GATE_ID, GateView } from "./quests/gate-scene";
import { gateLayout } from "./quests/gate-layout";
import { FARES, addTag, aimOf, createFares, skipFares, stepFares, type Fares } from "../sim/quests/fares/fares";
import { masherPlayer, sharpPlayer as sharpFares, type Player as FaresPlayer } from "../sim/quests/fares/drive";
import { cityAt, type CityCode, type TagKind } from "../sim/quests/fares/board";
import type { FaresEvent } from "../sim/quests/fares/events";
import { questIdOf, type QuestId } from "../sim/quests/quest";

/** The shift's venues in order (R3 §2): the lobby, the restaurant, the campus and the gift shop. */
const SHIFT: Level[] = [LOBBY, RESTAURANT, CAMPUS, GIFTSHOP];
/** SAT is the journey's first stop, never part of Work the whole shift. */
/** How far past a room's walls the camera may see, and how much of the view is kept round him if he has left the room. */
const ROOM_MARGIN = 200;
const ROOM_KEEP = 0.8;
const LEVELS = new Map<LevelId, Level>([SAT, ...SHIFT, STASH, LOBBY_NIGHT, TOWER, HALLWAY, SUITE, FLIGHT, PARIS, TRAIN, BASEL, LAB, REPLACEMENT].map((l) => [l.id, l]));
/** The ballroom's chandelier over the banquet table (R4 §2). */
const BANQUET_LIGHT: Light = { x: 0, y: -560, radius: 1100, intensity: 0.55, color: PALETTE.lampGlow, flicker: 0.02, group: "banquet" };
/** Basel's lanterns over the old town (3-4), lit as the clock's last third begins: a lamp every post. */
const BASEL_LANTERNS: Light[] = Array.from({ length: Math.floor((LANTERNS.x1 - LANTERNS.x0) / LANTERNS.post) + 1 }, (_, k) => ({ x: LANTERNS.x0 + k * LANTERNS.post, y: LANTERNS.y, radius: 520, intensity: 0.5, color: PALETTE.lampGlow, flicker: 0.05, group: "basel-lanterns", soft: true }));
/** Basel's evening light at the level's start, before dusk eases it toward the night's. */
const BASEL_DAY = "#ffe0bd";
/** The code blue's red, the lights pulse toward it. */
const CODE_BLUE = "#7a1f2b";
/** The drum corps' shake: camera trauma on its fourth beat. */
const DRUM_SHAKE = 0.5;
/** How fast he must be moving for the pipers following him to play. */
const LEAD_WALK = 10;
/** How far into dusk a level with one is: 0 until the clock's last third, then up to 1 as it runs out. */
export const duskOf = (level: Pick<Level, "dusk" | "time">, timeLeft: number): number => (level.dusk && level.time > 0 ? Math.min(1, Math.max(0, (level.time / 3 - timeLeft) / (level.time / 3))) : 0);
/** Two colors mixed, `k` of the way from `a` to `b`. */
export function mixHex(a: string, b: string, k: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}
/** How long a pickup's line stays in the hint. */
const NOTE_T = 2;
/** A seam underfoot: a jolt of about 2 px, gone in 0.3 s. */
const BOGIE_JOLT = 0.3;
/** The Buc-ee's shield's look: its glow around his middle, and its last seconds' flicker. */
const SHIELD_LOOK = { up: 170, rx: 130, ry: 215, rings: 5, alpha: 0.22, color: 0xffcf3a, rim: 0xfff1a0, flicker: 2, sparkEvery: 0.08 } as const;
/** Seconds the camera takes to settle into a zone's zoom. */
const ZOOM_EASE = 0.5;
/** In the pig fight, the share of the view's width he may stand from its middle while it frames both fighters. */
const FRAME_REACH = 0.3;
/** World px one walk or run cycle covers, so the feet don't skate. */
const STRIDE = 280;
const BLEND_T = 0.1;
const DUST_EVERY = 0.12;
const SMUG_T = 0.6;
/** How far ahead of the towel hand the sweat spray starts. */
const SPRAY_AHEAD = 24;
const STEAM_EVERY = 0.08;
/** The Coke Zero in his hand out of the shuttle door is drawn this tall (R5 §8). */
const WALK_CAN_H = 46;
/** A finger held this long on the canvas at the gate steadies his hand (R5 §3). */
const POINTER_STEADY_MS = 200;
const SWEAT_EVERY = 0.25;
const STEAM_HEAT = HEAT.steam;
const SWEAT_HEAT = HEAT.sweat;
/** Past this heat he pants, and past STEAM_HEAT he sweats twice as fast: he is tiring (owner, 2026-10-12). */
const PANT_HEAT = HEAT.pant;
const PANT_EVERY = 0.5;
/** Walking into a cleaned-out stash: a thought, then the owner's recording a beat later. */
const STASH_THOUGHT = "Can't keep one shelf stocked.";
const STASH_LINE_AFTER = 1.5;
/** How far above his feet a floor may be and still be the floor under a foot: a stride up a slope. */
const STRIDE_UP = 60;
/** The dev practice hit (G) comes from this far in front of him. */
const PRACTICE_HIT = 160;
/** The watch is drawn while his wrist is up: these fractions of the watch check. */
const WATCH_SHOWN = [0.15, 0.85] as const;
/**
 * The home screen's camera (story spec §5.1): he stands this far across the start screen's picture, this tall a share of
 * its height, his feet this far down it, as the key art has him; the mouse leans the camera this many world px across and
 * down; it eases at this rate.
 */
const TITLE_FRAME = { across: 0.34, tall: 0.44, feet: 0.83, leanX: 120, leanY: 40, ease: 4 } as const;
/**
 * A screen whose free picture is shorter than `short` of the whole (a phone on its side, the menu filling it): he peeks
 * over the menu instead, his crown this far down the free band, the menu's top this share of his height below his
 * crown, this far across the band, no lean.
 */
const TITLE_PEEK = { short: 0.45, below: 0.1, shown: 0.5, across: 0.15 } as const;
/** The mallet's smear: the strike's display fractions it shows in, its trail, and its clearance from the face. */
const SMEAR = { from: 0.36, to: 0.5, points: 6, trail: 0.06, width: 26, clear: 40 } as const;

export type Look = {
  stop(): void;
  /** A fresh run from the start card. */
  newRun(): void;
  togglePause(): void;
  /** An act's ending: the fanfare under its card. */
  fanfare(): void;
  /** A touch button went down or came up. */
  press(action: Action, down: boolean): void;
  /** His face on the screen, in CSS px, as last drawn: the cards keep clear of it. */
  face(): Rect | null;
  setMuted(on: boolean): void;
  /** The Settings' two sliders, 0 to 1 each. */
  setVolumes(music: number, effects: number): void;
  /** A menu is open over the game (the Settings): its keys are the page's, as on the home screen. */
  setMenu(open: boolean): void;
  /** A shift from the start screen, at the shift's venue `at` (the gift shop is pig practice). */
  start(at: number): void;
  /** Back to the start screen. */
  toTitle(): void;
  /** The level the home screen shows, from the save (story spec §5.1): on the home screen it changes at once, else at the next visit. */
  setHome(id: LevelId | undefined): void;
  /** The start screen's quality choice: a tier kept on this device, or null to let the game choose (and step down). */
  setQuality(q: Quality | null): void;
  /** Hungry Hungry Hammer as practice: from the start screen's card, or Play again on its tally (R4 §8). */
  newQuest(id?: QuestId): void;
  /** Continue on the BUFFET door's tally: back in the lobby with what he ate (R4 §7). */
  finishQuest(): void;
  /**
   * A journey run from a stop to the end of its act (`journey`, from the save's snapshot or fresh), or that stop alone,
   * fresh (`replay`); `hold` begins on the story's cards before it.
   */
  startJourney(id: StoryId, how: "journey" | "replay", snapshot: Snapshot | null, hold: boolean): void;
  /** On from the story's cards: to the level's card, or to the next level's. */
  continueStory(): void;
  /** Hammer down's Try again: the level's card as it stood (a journey's snapshot), or a fresh shift. */
  tryAgain(): void;
};

/** A level of a journey run is over: what he scored in it, the staff he bonked, the run as it stands now. */
export type LevelDone = { id: LevelId; score: number; bonked: number; last: boolean; snapshot: Snapshot };

/** Where things are this frame, in world px, for the effects. */
type Frame = { face: Rect; view: Rect; facing: 1 | -1; hand: Point; crown: Point };

/**
 * The lobby, played: the Game under the keyboard, Hammer drawn as R1 built him, the venue, its
 * pickups and crates. The shell draws the HUD from `onHud` and its cards from `onMode`. With `dev`,
 * G is a practice hit and `window.__next.dev` can teleport him, for the checks.
 */
export async function startLook(
  render: RenderApp,
  opts: {
    noart?: boolean;
    /** The hall flat on the game's own canvas, as a browser without WebGL2 plays it. */
    flat?: boolean;
    board?: boolean;
    dev?: boolean;
    nocast?: boolean;
    /** Straight into play at this level of the whole shift (`&level=`, the old `&venue=`). */
    level?: LevelId;
    title?: boolean;
    /** The home screen's scene, from the save: the lobby at night once Act 1 is done. */
    home?: LevelId;
    onHud?: (hud: HudPayload) => void;
    onMode?: (mode: GameMode) => void;
    /** A journey level's tally is counted: the shell finishes it in the save and shows the story's cards. */
    onLevelDone?: (e: LevelDone) => void;
    /** A journey level's card is up, with the snapshot just taken: the shell saves it. */
    onCard?: (id: LevelId, snapshot: Snapshot | null) => void;
    /** The home screen's scene is drawn and running: the key art can fade away. */
    onTitleScene?: () => void;
    /** The tier the game draws at now: Auto's pick, or a step down. */
    onQuality?: (q: Quality) => void;
  } = {},
): Promise<Look> {
  const { app } = render;
  const scene = createScene(render);
  const game = createGame({ lobby: SHIFT[0], stash: STASH, venues: SHIFT.slice(1), homes: [LOBBY_NIGHT, BASEL] }, newSeed(), {
    cast: !opts.nocast,
    title: !!opts.title,
    start: Math.max(0, SHIFT.findIndex((l) => l.id === opts.level)),
    home: opts.home,
  });
  // SAT and Act 2 are no stops of the whole shift: `&level=` plays them as the journey does, what follows them after them.
  if (opts.level === "sat") game.newRun(newSeed(), 0, { shift: [SAT, ...SHIFT], journey: true });
  else if (opts.level && !SHIFT.some((l) => l.id === opts.level)) game.newRun(newSeed(), 0, { shift: shiftFrom(opts.level as StoryId, STOP_LEVELS), journey: true });
  const world = game.world;
  const clock = createClock();
  scene.camera.bounds = game.level.bounds;
  scene.camera.x = game.level.spawn.x;
  scene.camera.focusY = scene.camera.y = -HERO_HEIGHT * 0.55;

  // None of these needs another: on a phone each round trip saved is a fraction of a second.
  const [, products, loaded] = await Promise.all([installFonts(), loadProducts(), loadRegistry()]);
  let registry = loaded;
  if (opts.noart) registry = stripped(registry);
  const reduced = scene.reducedMotion;
  /** The tier's particle count; under reduced motion never more than 400. */
  const particleCount = (q: Quality) => (reduced ? Math.min(400, TIERS[q].particles) : TIERS[q].particles);
  const particles = new Particles(scene.layers.fx, particleCount(render.quality), reduced);
  const words = new Words(scene.layers.fx);
  const smear = new Graphics();
  if (!reduced) smear.blendMode = "add";
  scene.layers.fx.addChild(smear);
  const objects = new Objects(scene.layers.play, particles);
  // The guard's flashlight: its beam behind him, its last moment fading.
  const beam = new Graphics();
  if (!reduced) beam.blendMode = "add";
  beam.visible = false;
  let beamT = 0;
  // The Buc-ee's shield: a gold glow drawn behind him, so nothing of it is ever over his face.
  const shieldGlow = new Graphics();
  if (!reduced) shieldGlow.blendMode = "add";
  scene.layers.play.addChild(shieldGlow, beam);
  // The lamps light the play layer's children as they are now; a venue built later takes the same tint in `prepare`.
  const lighting = createLighting(scene, render.quality, [...[...LEVELS.values()].flatMap((l) => lightsOf(l)), BANQUET_LIGHT, ...BASEL_LANTERNS]);
  const props = new Props(scene.layers.play, particles, scene.ambient);
  if (!opts.noart) void props.loadBox(registry);
  const cast = new Cast(scene.layers.play, scene.ambient, registry, particles);
  cast.setQuality(render.quality);
  render.onQuality = (q) => {
    lighting.setQuality(q);
    cast.setQuality(q);
    particles.setCount(particleCount(q));
    opts.onQuality?.(q);
  };
  const flyers = new Flyers(scene.layers.play, particles, scene.ambient);
  const pigView = new PigView(scene.layers.play, particles);
  const bossView = new BossView(scene.layers.play, registry, !!opts.noart);
  const towerCarts = new TowerCarts(scene.layers.play);
  const hallFlat = new HallFlatView(scene.layers.play);
  const parisView = new ParisView(scene.layers.play);
  const trainView = new TrainView(scene.layers.play);
  let trainPieces: TrainPieces = {};
  const baselView = new BaselView(scene.layers.play);
  let baselPieces: BaselPieces = {};
  const labView = new LabView(scene.layers.play);
  let labPieces: LabPieces = {};
  const trainingView = new TrainingView(scene.layers.play);
  let trainingPieces: TrainingPieces = {};
  /** The code blue's light last set: redrawn as it moves on, not every frame. */
  let pulseAt = -1;
  /** The light dusk has brought so far (3-4): redrawn as it moves on, not every frame. */
  let duskAt = -1;
  let character = createCharacter(registry, opts.noart ? "scrubs" : "affliction", { noart: opts.noart });
  scene.layers.play.addChild(character.container);
  /** The costume last asked for: a level that names the same one changes nothing, whatever the body fell back to. */
  let asked: Costume = opts.noart ? "scrubs" : "affliction";
  /**
   * He changes into the level's costume (story spec §10.2): the new body is built and loaded while the old one still shows,
   * then takes its place; a later ask wins over one still loading.
   */
  const wear = async (costume: Costume): Promise<void> => {
    if (costume === asked) return;
    asked = costume;
    const next = createCharacter(registry, costume, { noart: opts.noart });
    await next.ready.catch(() => undefined);
    if (asked !== costume || stopped) {
      next.container.destroy({ children: true });
      return;
    }
    const old = character;
    next.container.position.copyFrom(old.container.position);
    next.container.zIndex = old.container.zIndex;
    next.container.visible = old.container.visible;
    scene.layers.play.addChild(next.container);
    character = next;
    old.container.destroy({ children: true });
  };
  type Views = { venue: VenueView; backdrop: Backdrop };
  const views = new Map<LevelId, Views>();
  const loading = new Map<LevelId, Promise<void>>();
  /**
   * A level's venue, backdrop and cast paintings, built once; the game holds while the level he is in is not ready.
   * Every painting its cast wears loads before it shows, so nobody pops from stand-in to painting.
   */
  /** Set once the look stops: the background loading builds nothing more, and lets go of what it was building. */
  let stopped = false;
  const prepare = (level: Level): Promise<void> => {
    let p = loading.get(level.id);
    if (!p) {
      p = (async () => {
        const backdrop = await loadBackdrop(scene, level, registry);
        if (stopped) return;
        const towerPieces: TowerPieces = level.floors && !opts.noart ? await loadTowerPieces(registry) : {};
        if (level.floors) {
          towerCarts.setArt(towerPieces);
          const looks = (name: "ice" | "cabinet") => {
            const p = towerPieces[name];
            return p ? { texture: p.texture, height: p.piece.height, width: p.piece.width, base: p.piece.base } : undefined;
          };
          objects.setLooks({ ice: looks("ice"), cabinet: looks("cabinet") });
        }
        if (level.coaches) {
          trainPieces = opts.noart ? {} : await loadTrainPieces(registry);
          towerCarts.setTrainArt(trainPieces);
        }
        if (level.errands) {
          baselPieces = opts.noart ? {} : await loadBaselPieces(registry);
          towerCarts.setBaselArt(baselPieces);
        }
        if (level.codeBlue) {
          labPieces = opts.noart ? {} : await loadLabPieces(registry);
          towerCarts.setLabArt(labPieces);
        }
        if (level.ifu) {
          trainingPieces = opts.noart ? {} : await loadTrainingPieces(registry);
          trainingView.setPieces(trainingPieces);
        }
        if (level.pickups?.some((p) => p.kind === "bread") && !opts.noart && registry.french?.food?.[0]) setBreadPicture(await Assets.load<Texture>(ART_BASE + registry.french.food[0].file).catch(() => null));
        const venue = drawVenue(scene, level, level.id === "sat" && !opts.noart ? await loadSatPieces(registry) : null, towerPieces, !opts.noart && !!registry.walls?.[level.rooms?.[0]?.wall ?? (level.bonjour ? "paris-far-1" : "suite-far-1")], trainPieces, baselPieces, labPieces, !opts.noart && !!registry.walls?.[level.backdrop?.walls[0] ?? ""], trainingPieces);
        venue.root.tint = multiplyTint(venue.root.tint, ambientTint(ambientOf(level)));
        venue.setVisible(false);
        backdrop.setVisible(false);
        if (!opts.nocast) await cast.preload((level.cast ?? []).map((s) => s.person));
        // The pig's painting loads with its venue; the drawn pig stands in if it fails.
        if (level.boss?.kind === "pig" && !opts.noart && !stopped) await pigView.load(registry);
        if (level.boss && level.boss.kind !== "pig" && !stopped) await bossView.load(level.boss.kind);
        if (stopped) {
          venue.destroy();
          return;
        }
        views.set(level.id, { venue, backdrop });
      })();
      loading.set(level.id, p);
    }
    return p;
  };
  // He and the level he starts in load side by side; the stash, behind a door, follows (its door holds until it is in).
  await Promise.all([character.ready, prepare(game.level)]);
  void prepare(STASH);
  // The banquet behind the BUFFET door and the Side quests card (R4). Whatever of it fails to load draws its stand-in; its
  // card holds only while it loads.
  const banquet = new BanquetView(render, scene, registry, !!opts.noart);
  let banquetLoaded = false;
  let banquetLoad: Promise<void> | null = null;
  const loadBanquet = () =>
    (banquetLoad ??= banquet
      .load()
      .catch((err) => console.warn("banquet:", err))
      .then(() => {
        banquetLoaded = true;
      }));
  // On the start screen the side quest is a tap away: it loads right behind the lobby. Straight into play it waits for
  // the shift's venues (or the BUFFET door), so a phone's start fetches no more than it did before the banquet.
  // The gate behind the AIRPORT SHUTTLE door and its card (R5) loads the same way, after the banquet.
  const gate = new GateView(render, scene, registry, !!opts.noart);
  let gateLoaded = false;
  let gateLoad: Promise<void> | null = null;
  const loadGate = () =>
    (gateLoad ??= gate
      .load()
      .catch((err) => console.warn("gate:", err))
      .then(() => {
        gateLoaded = true;
      }));
  if (opts.title) void loadBanquet().then(() => (stopped ? undefined : loadGate()));
  // The M CLUB's table loads when its door or its card is near: it is the banquet's engine with its own room, sheet and guests.
  const lounge = new BanquetView(render, scene, registry, !!opts.noart, "lounge");
  let loungeLoaded = false;
  let loungeLoad: Promise<void> | null = null;
  const loadLounge = () =>
    (loungeLoad ??= lounge
      .load()
      .catch((err) => console.warn("lounge:", err))
      .then(() => {
        loungeLoaded = true;
      }));
  const french = new BanquetView(render, scene, registry, !!opts.noart, "french");
  let frenchLoaded = false;
  let frenchLoad: Promise<void> | null = null;
  const loadFrench = () =>
    (frenchLoad ??= french
      .load()
      .catch((err) => console.warn("french:", err))
      .then(() => {
        frenchLoaded = true;
      }));
  // The rest of the shift loads one venue after another while he plays.
  void SHIFT.reduce((p, l) => p.then(() => (stopped ? undefined : prepare(l))), Promise.resolve())
    .then(() => (stopped ? undefined : loadBanquet()))
    .then(() => (stopped ? undefined : loadGate()));
  const headPlate = registry.hammer.heads.neutral!;

  const vignette = new Sprite(vignetteTexture());
  vignette.alpha = 1;
  scene.layers.post.addChild(vignette);
  const portrait = registry.hammer.portrait ? ART_BASE + registry.hammer.portrait.file : null;
  let hudLast = "";
  const sound = createSound();
  const layers = createLayers();
  const bubbles = new Bubbles(scene.layers.fx);
  const speech = new Speech(scene.layers.fx);
  let lectures = 0;
  /** This frame's events, for the procedural layers. */
  const stepped: GameEvent[] = [];

  const down = new Set<string>();
  // A tap shorter than a frame still counts for the frame's steps.
  const tapped = new Set<string>();
  /** A break or back from one: the Game's mode event goes through the feel like any other. */
  const pause = () => {
    game.togglePause();
    // A break stops the recording, and its caption goes with it (spec §13).
    if (game.mode === "pause") {
      sound.stopVoice();
      bubbles.cut();
    } else {
      // Back to work: a key first pressed during the break and still held is held, not pressed, on the first step back.
      prevHeld = { ...prevHeld, ...heldNow() };
    }
    for (const e of game.events) feel(e);
  };
  const onKey = (e: KeyboardEvent) => {
    // On the start screen the keys are the page's: Space and Enter press its buttons, the arrows move through its list. A
    // key held from the shift and let go here is let go, so the next shift does not start with it down.
    // The story's cards between levels are the page's too: Enter or Space presses their focused Continue.
    if (game.mode === "title" || game.mode === "story" || menu) {
      // The title tune waits for the first key or tap (plan decision 13).
      if (e.type === "keydown") sound.unlock();
      if (e.type === "keyup") down.delete(e.code);
      return;
    }
    if (e.code in KEY_BINDINGS) e.preventDefault();
    if (e.type === "keydown") {
      // Browsers only let sound start from a key or a tap.
      sound.unlock();
      if (opts.dev && e.code === "KeyG" && !e.repeat) {
        // A practice hit from in front of him, until R2b's cast can hit him.
        e.preventDefault();
        world.hit(world.hero.x + world.hero.facing * PRACTICE_HIT);
      }
      if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) {
        e.preventDefault();
        forgetPresses();
        pause();
        return;
      }
      // On the banquet's tally Enter or Space is its button: Continue on a door's, Play again on practice's (a button the
      // keyboard has moved to presses itself instead). The key goes in as held, not pressed, so the step after it sees no
      // new press (R4 Review Focus 1).
      const focused = document.activeElement instanceof HTMLButtonElement;
      if (game.mode === "questTally" && !e.repeat && !focused && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        down.add(e.code);
        if (game.questDoor) look.finishQuest();
        else look.newQuest();
        return;
      }
      down.add(e.code);
      tapped.add(e.code);
    } else down.delete(e.code);
  };
  // The touch pad's buttons, held and tapped, the same way as the keys.
  const touchDown = new Set<Action>();
  const touchTapped = new Set<Action>();
  /** Fingers on the canvas during a Fare Darts round, and when each went down (R5 §3). */
  const pointers = new Map<number, number>();
  const onBlur = () => {
    down.clear();
    tapped.clear();
    touchDown.clear();
    touchTapped.clear();
    // A release that never reaches the window must not leave the steady hand draining.
    pointers.clear();
  };
  /** Taps and touches end at a break or a new run: none of them fires on the far side of it. */
  const forgetPresses = () => {
    tapped.clear();
    touchDown.clear();
    touchTapped.clear();
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", onBlur);

  let prevHeld: Record<Action, boolean> = emptyInput().held;
  /** The controller this frame, and whether its Start was down last frame (a press pauses on its edge). */
  let pad: Pad = NO_PAD;
  let padStart = false;
  let menu = false;
  const frame = { acc: 0 };
  let prev = world.snapshot();
  let cur = prev;
  let clip: ClipName = "idle";
  /** The clip the blend is coming from: out of the belly-flop he stays on his belly until he is up. */
  let fromClip: ClipName = "idle";
  let phase = 0;
  let lastPose: Pose | null = null;
  let fromPose: Pose | null = null;
  let blendT = 1;
  let lastState = cur.hero.state;
  let dustT = 0;
  let time = 0;
  const playback = createPlayback();
  let smugT = 0;
  let shown: Level["id"] | null = null;
  let shownPickups = game.pickups;
  let lastMode: GameMode | null = null;
  let savedT = 0;
  /** A pickup's line for the hint, and how long it has left. */
  let note: string | null = null;
  let noteT = 0;
  let sparkT = 0;
  let shieldShown = false;
  let gifts = 0;
  let starts = 0;
  let pantT = 0;
  /** A spoken line waiting for its thought to finish: when it is due, on the scene's clock. */
  let lineDue: number | null = null;
  let faceOnScreen: Rect | null = null;
  let shownX = 0;
  let steamT = 0;
  /** The flat-top's steam or the walk-in's frost at his feet, and the walk-in's own breath. */
  let zoneT = 0;
  let fogT = 0;
  let sweatT = 0;
  const counts: Record<string, number> = {};
  const pending: GameEvent[] = [];

  const animate = (h: HeroState, dt: number): Pose => {
    // With the banquet's belly-flop his slide is drawn flat on his belly.
    const want = (h.state === "slide" && h.flop ? "flop" : h.state) as ClipName;
    if (want !== clip) {
      fromPose = lastPose;
      fromClip = clip;
      blendT = 0;
      clip = want;
      phase = 0;
    }
    const cycling = clip === "walk" || clip === "run";
    phase += cycling ? (Math.abs(h.vx) * dt) / STRIDE : dt;
    const u = cycling
      ? phase % 1
      : clip === "idle"
        ? (phase * 0.4) % 1
        : clip === "land"
          ? Math.min(1, phase / LAND_T)
          : clip === "jump"
            ? Math.min(1, phase / 0.35)
            : Math.min(1, phase / 0.3);
    const ctx: ClipCtx = { t: time, speed: Math.abs(h.vx), vy: h.vy, facing: h.facing };
    let pose = CLIPS[clip](u, ctx);
    if (fromPose && blendT < 1) {
      blendT = Math.min(1, blendT + dt / BLEND_T);
      pose = blend(fromPose, pose, blendT);
    }
    lastPose = pose;
    return pose;
  };

  const groundMode = (h: HeroState): Ground =>
    fromClip === "flop" && blendT < 1 && h.onGround && !playback.kind
      ? "belly"
      : groundForAction(playback.kind, clip, h.onGround, h.move?.kind === playback.kind && h.move ? moveU(h.move) : 1);

  /** The top of whatever he could stand on under x, no higher than `reach`: floors, platforms and solids. */
  const topUnder = (x: number, reach: number): number | null => {
    const stage = world.stage;
    let best = floorAt(stage, x, reach);
    for (const p of stage.platforms) if (x >= p.x0 && x <= p.x1 && p.y >= reach && (best === null || p.y < best)) best = p.y;
    for (const s of stage.solids) if (x >= s.x && x <= s.x + s.w && s.y >= reach && (best === null || s.y < best)) best = s.y;
    return best;
  };
  const supportY = (x: number, y: number) => topUnder(x, y - 1) ?? y;

  /** The floor or counter top under x, no higher than a stride above the feet; null over a gap. */
  const supportAt = (fx: number, fy: number): number | null => topUnder(fx, fy - STRIDE_UP);
  const floorProbe = (fx: number, fy: number): FloorProbe => {
    const under = supportAt(fx, fy) ?? fy;
    return (dx) => {
      const f = supportAt(fx + dx, fy);
      return f === null ? null : f - under;
    };
  };

  /** Time and the camera answer each event at once; its look waits for this frame's pose. */
  const feel = (e: GameEvent) => {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
    if (e.type === "levelDone") opts.onLevelDone?.({ id: e.id, score: e.score, bonked: e.bonked, last: e.last, snapshot: snapshotNow() });
    if (heard(e, scene.view())) sound.play(e);
    if (e.type === "over") sound.hammerDown();
    const f = feelOf(e);
    if (f) {
      applyFeel(clock, f);
      scene.camera.trauma = Math.min(1, scene.camera.trauma + f.trauma);
      if (f.zoom) scene.punch(f.zoom.amount, f.zoom.seconds);
    }
    pending.push(e);
    stepped.push(e);
  };

  /** One of the owner's recordings for a besting, when the bus allows one; its caption is spoken. */
  const taunt = (target: TauntTarget) => {
    const id = sound.taunt(target);
    if (id) bubbles.say(TAUNT_LINES[id].text, 2);
    return !!id;
  };
  /** Knocking out staff: a recording, or sometimes a written comeback as a thought, never over a recording. */
  const comeback = (role: CastRole) => {
    if (taunt("staff") || bubbles.text || Math.random() >= 0.45) return;
    const lines = STAFF_COMEBACKS[role === "bellhop" || role === "guard" ? "hotel" : role === "student" ? "office" : role];
    bubbles.think(lines[Math.floor(Math.random() * lines.length)].text, 1.6);
  };

  /** The cast member (or cart) the last snot hit named: its splat, next, sticks the snot to them. */
  let snotOn: { id: number; x: number; y: number } | null = null;
  const show = (e: GameEvent, at: Frame) => {
    const { face, view, facing } = at;
    // Besting someone offers a recording; the bus rolls its pool's shipped chance and keeps its gap.
    const pool = tauntFor(e);
    if (e.type === "castHit" && pool) comeback(e.role);
    else if (pool) taunt(pool);
    switch (e.type) {
      case "hit":
        if (e.by === "mallet") {
          particles.emit("impact", e.x, e.y, 18);
          particles.emit("debris", e.x, e.y, 10);
          words.say("BONK!", e.x, e.y - 70, false, face, view);
          smugT = SMUG_T;
        } else if (e.by === "snot") {
          words.say("SPLAT!", e.x, e.y - 50, false, face, view);
          snotOn = { id: e.target, x: e.x, y: e.y };
        }
        break;
      case "burst":
        particles.emit("ring", e.x, e.y, 24);
        particles.emit("debris", e.x, e.y, 30);
        particles.emit("dust", e.x, e.y, 20);
        words.say("HAMMER TIME!", e.x, e.y - 300, true, face, view);
        break;
      case "fire":
        particles.emit("snot", e.x, e.y, 8);
        words.say(e.hot ? "HOT HONK!" : "HONK!", e.x + facing * 60, e.y - 60, false, face, view);
        break;
      case "splat":
        particles.emit("splat", e.x, e.y, e.floor ? 14 : 18);
        // In the air it hit someone: the cast member its hit named (a cart keeps none), or else the pig, the only other thing
        // that stops it; it sticks where it hit them.
        if (!e.floor) {
          if (snotOn && snotOn.x === e.x && snotOn.y === e.y) cast.slime(snotOn.id, e.x, e.y, e.hot);
          else pigView.slime(e.x, e.y, e.hot);
        }
        snotOn = null;
        break;
      // The sweat flies forward off the towel at his face, from just in front of it so the face
      // keep-out doesn't take it: the recipe throws left, so mirror it facing right.
      case "stroke":
        particles.emit("spray", at.hand.x + facing * SPRAY_AHEAD, at.hand.y, 6, facing === 1);
        break;
      case "flick":
        particles.emit("spray", at.hand.x + facing * SPRAY_AHEAD, at.hand.y, 20, facing === 1);
        break;
      case "shine":
        particles.emit("glint", at.crown.x, at.crown.y, 6);
        bubbles.think(ASIDES.better.text, 1.2);
        break;
      case "lectureStart":
        bubbles.think(LECTURES[lectures++ % LECTURES.length].text, 1.8);
        break;
      // His thought on the home screen: an insult, written, never spoken.
      case "think":
        bubbles.think(e.text, e.seconds);
        break;
      case "harrumph":
        bubbles.think(ASIDES.anyDayNow.text, 1.6);
        break;
      case "stashEmpty":
        bubbles.think(STASH_THOUGHT, 1.4);
        lineDue = time + STASH_LINE_AFTER;
        break;
      case "hurt":
        particles.emit("impact", e.x, e.y, 10);
        words.say("OOF!", e.x + e.dir * 90, e.y - 40, false, face, view);
        bubbles.say(DAMAGE_LINE.text, 1.6);
        break;
      case "tumble":
        particles.emit("impact", e.x, e.y, 16);
        words.say("WHAM!", e.x + e.dir * 120, e.y - 60, true, face, view);
        bubbles.say(DAMAGE_LINE.text, 1.6);
        break;
      // The doggy bag caught the hit that would have knocked him flat: he eats his leftovers instead.
      case "doggyBag":
        particles.emit("crumbs", e.x, e.y, 14);
        // In front of him at his middle, clear of the caption over his head even on a narrow phone.
        words.say("LEFTOVERS!", at.crown.x + facing * 260, at.crown.y + 260, true, face, view);
        bubbles.think(DOGGY_LINE.text, 1.6);
        break;
      // Back from the banquet: what it paid, in the hint line for a moment (the R4 review's deferred minor).
      case "questPaid":
        note =
          e.quest === "fares"
            ? `Gate +${e.score.toLocaleString("en-US")}${e.boxes ? ` · ${e.boxes} ${e.boxes === 1 ? "box" : "boxes"} of #15 blades` : ""}${e.cans ? ` · +${e.cans} cans` : ""}${e.lives ? " · extra life" : ""}`
            : `Banquet +${e.score.toLocaleString("en-US")}${e.doggy ? " · doggy bag packed" : ""}${e.flop ? " · belly-flop" : ""}`;
        noteT = NOTE_T * 2;
        if (e.quest === "fares") {
          Object.assign(walkOut, walkOutFrom(e));
        }
        break;
      case "pickup":
        objects.pop(e.kind, e.x, e.y);
        note = pickupNote(e.kind, world.hero);
        noteT = NOTE_T;
        if (e.kind === "nuts")
          words.say(world.hero.charge >= CHARGE_MAX ? "SMASH READY!" : "NUTS!", e.x, e.y - 80, world.hero.charge >= CHARGE_MAX, face, view);
        if (e.kind === "bucees") words.say("SHIELD!", e.x, e.y - 100, true, face, view);
        if (e.kind === "pepper") words.say("HOT!", e.x, e.y - 100, true, face, view);
        if (e.kind === "keycard") words.say("+1 KEYCARD", e.x, e.y - 80, false, face, view);
        break;
      // A status tier: its comic word over his head.
      case "tier":
        particles.emit("gold", e.x, e.y, 24);
        // Beside him: his thought rises over his head.
        words.say(e.word, at.crown.x + facing * 420, at.crown.y + 40, true, face, view);
        break;
      case "canPop":
        particles.emit("frost", e.x, e.y, 10);
        note = pickupNote("can", world.hero);
        noteT = NOTE_T;
        particles.emit("glint", e.x, e.y - 30, 2);
        break;
      case "crate":
        particles.emit("debris", e.x, e.y, 6);
        break;
      // Knocked out for good, a staffer lets go of what they carried.
      case "castDrop":
        particles.emit("glint", e.x, e.y, 6);
        break;
      case "caseBreak":
        objects.splinter(e.x, e.y);
        words.say("CRUNCH!", e.x, e.y - 90, false, face, view);
        break;
      case "bump":
        particles.emit("dust", e.x, e.y, 4);
        break;
      case "bell":
        words.say("DING!", e.x, e.y - 70, false, face, view);
        break;
      case "checkpoint":
        views.get(game.level.id)?.venue.punch(e.id);
        particles.emit("glint", e.x, e.y - 360, 6);
        savedT = 2;
        break;
      case "oneUp":
        words.say("1UP!", at.crown.x, at.crown.y - 90, true, face, view);
        break;
      case "timeOut":
        words.say("TIME!", at.crown.x, at.crown.y - 120, true, face, view);
        break;
      case "boiling":
        words.say("BOILING!", at.crown.x, at.crown.y - 90, true, face, view);
        break;
      case "castNotice":
        particles.emit("glint", e.x, e.y - 40, 3);
        break;
      case "pigeons":
        parisView.scatter(e.x);
        break;
      case "tunnel":
        views.get(game.level.id)?.backdrop.countryside?.enterTunnel();
        break;
      case "respawn":
        views.get(game.level.id)?.backdrop.countryside?.reset();
        break;
      case "doorsBeep":
        trainView.beep();
        break;
      case "spray":
        labView.spray(e.x, e.y);
        break;
      case "drumHit":
        scene.camera.trauma = Math.max(scene.camera.trauma, DRUM_SHAKE);
        break;
      case "bogie":
        scene.camera.trauma = Math.max(scene.camera.trauma, BOGIE_JOLT);
        break;
      case "bossSay":
        speech.say(BOSS_ID, e.text, e.seconds);
        break;
      // A scripted recording has its words in his bubble, as a taunt's do; the damage recording has none.
      case "voiceLine":
        if (e.id !== "curse") bubbles.say(TAUNT_LINES[e.id].text, 2);
        break;
      case "castLine":
        speech.say(e.id, e.text, e.seconds);
        break;
      case "castWindup":
        words.say("!", e.x, e.y - 60, true, face, view);
        break;
      case "castBump":
        particles.emit("dust", e.x, e.y + 300, 4);
        break;
      case "flop":
        // He lands on his belly a beat into the slide, a body ahead of where it started.
        particles.emit("dust", e.x + facing * 140, e.y, 14);
        break;
      case "stomp":
        particles.emit("dust", e.x, e.y, 8);
        if (e.landed) words.say("STOMP!", e.x, e.y - 60, false, face, view);
        break;
      case "castHit": {
        if (e.by === "stomp" || e.by === "puddle") words.say(e.by === "puddle" ? "WHOA!" : "OOF!", e.x, e.y - 90, false, face, view);
        else if (e.by === "flop") words.say("FLOP!", e.x, e.y - 90, false, face, view);
        else if (e.by !== "mallet" && e.by !== "snot") words.say("WHAM!", e.x, e.y - 90, false, face, view);
        const n = world.cast.find((c) => c.id === e.id);
        if (n && !n.hat && n.hits === 1 && HATTED.has(n.job)) flyers.hat(e.x, e.y - 150, e.dir, cast.hat(n.person), n.job);
        if (e.job === "busser" && n?.hits === 1) flyers.towel(e.x, e.y - 60, e.dir);
        // What he carried flies on the hit that knocks it from his hands.
        if (e.job === "server" && e.drops) {
          flyers.glasses(e.x + e.dir * 20, e.y - 60, e.dir);
          particles.emit("water", e.x, e.y - 60, 12);
        }
        if (e.job === "lunch" && e.drops) flyers.food(e.x + e.dir * 20, e.y - 60, e.dir);
        if (e.job === "office" && e.drops) flyers.cup(e.x, e.y - 40, e.dir);
        if (e.job === "cook" && e.drops) flyers.pan(e.x, e.y - 40, e.dir);
        if (e.job === "prof" && e.drops) {
          flyers.book(e.x, e.y - 60, e.dir);
          flyers.papers(e.x, e.y - 80, e.dir);
        }
        break;
      }
      case "castFreeze":
        words.say("+50", e.x, e.y - 40, false, face, view);
        break;
      // A box of blades bonked someone: the free sample nobody wanted, and now and then his line (each once a venue).
      case "sampleHit": {
        words.say("FREE SAMPLE!", e.x, e.y - 300, false, face, view);
        if (sampleVenue !== game.level.id) {
          sampleVenue = game.level.id;
          samplesSaid.clear();
        }
        const line = SAMPLE_LINES.find((l) => !samplesSaid.has(l.text));
        if (line && Math.random() < 0.4) {
          samplesSaid.add(line.text);
          bubbles.think(line.text, 1.6);
        }
        break;
      }
      case "castSchooled":
        words.say("SCHOOLED", e.x, e.y - 40, false, face, view);
        break;
      case "lectureLand":
        words.say(e.schooled ? "SCHOOLED!" : "LISTEN UP!", e.x + facing * 120, e.y - 20, false, face, view);
        break;
      case "castFell":
        words.say(game.level.pitWord ?? "OUT OF ORDER", e.x, e.y - 400, true, face, view);
        speech.say(e.id, e.line, 1.2);
        break;
      case "chain":
        words.say(e.oneUp ? "1UP!" : String(e.points), e.x, e.y - 60, e.count >= 4, face, view);
        break;
      case "swat":
        particles.emit("paper", e.x, e.y, 14);
        if (flies(e.kind)) words.say("SWAT!", e.x, e.y - 50, false, face, view);
        break;
      // The guard's beam: drawn behind him, so nothing of it is ever over his face.
      case "flash":
        drawBeam(e.x, e.y, e.facing);
        break;
      case "stunned":
        words.say("!", e.x, e.y - 40, true, face, view);
        break;
      case "missileHit":
        if (e.kind === "water") particles.emit("water", e.x, e.y, 16);
        else if (!flies(e.kind)) particles.emit("coffee", e.x, e.y, 12);
        else particles.emit("paper", e.x, e.y, 4);
        break;
      case "castSplash":
        if (e.kind === "papers") particles.emit("paper", e.x + facing * 40, e.y, 14);
        else particles.emit("coffee", e.x + facing * 40, e.y, 16);
        break;
      case "dishes":
        particles.emit("glass", e.x, e.y, 18);
        words.say("CRASH!", e.x, e.y - 120, false, face, view);
        break;
      case "pigWake":
        words.say("PIG FIGHT", at.crown.x, at.crown.y - 120, true, face, view);
        break;
      case "pigWindup":
        if (e.hop) speech.say(PIG_ID, "BOING!", 0.8);
        break;
      case "pigLand":
        particles.emit("dust", e.x, e.y, 14);
        break;
      case "pigHit":
        words.say(e.by === "bonk" ? "BONK!" : "SNOT!", e.x, e.y - 40, false, face, view);
        pigView.hit(e.x, e.y);
        speech.say(PIG_ID, "SQUEEEE!", 0.6);
        break;
      case "pigHold":
        words.say(e.word, e.x, e.y - 60, true, face, view);
        break;
      case "pigDown":
        words.say("STUFFING SETTLED", e.x, e.y - PIG_HEIGHT - 60, true, face, view);
        pigView.down();
        flyers.papers(e.x, e.y - 220, 1);
        break;
      case "pigShrug":
        // A thought: only the owner's recordings are spoken.
        bubbles.think("It's a stuffed animal.", 1.6);
        break;
      case "pigRefill":
        particles.emit("glint", e.x, e.y, 6);
        break;
      case "bossHit":
        words.say(e.by === "bonk" ? "BONK!" : "SNOT!", e.x, e.y - 40, false, face, view);
        particles.emit("impact", e.x, e.y, 14);
        break;
      case "bossDown":
        words.say(cur.boss?.kind === "titanium" ? "OVER THE RAIL" : cur.boss?.kind === "purser" ? "BUSINESS SELECT" : cur.boss?.kind === "conductor" ? "ON TIME" : cur.boss?.kind === "major" ? "CARRY ON" : "HOUSEKEEPING DOWN", e.x, e.y - 60, true, face, view);
        break;
      case "bossPhase":
        scene.camera.trauma = Math.max(scene.camera.trauma, 0.3);
        break;
      case "grab":
        if (e.phase === "windup") words.say("!", e.x, e.y - 60, true, face, view);
        else if (e.phase === "take" && e.n) words.say(`-${e.n} CANS`, e.x, e.y - 40, true, face, view);
        break;
      case "giveBack":
        words.say(`+${e.n} CANS`, e.x, e.y - 40, false, face, view);
        break;
      case "batted":
        words.say("+100", e.x, e.y - 40, false, face, view);
        particles.emit("impact", e.x, e.y, 8);
        break;
      case "pool":
        particles.emit("water", e.x, -120, 24);
        break;
      case "bossWindup":
        words.say("!", e.x, e.y - 60, true, face, view);
        break;
      case "chute":
        words.say("DOWN THE CHUTE", e.x, e.y - 200, true, face, view);
        break;
      case "slip":
        words.say("WHOA!", e.x, e.y - 330, false, face, view);
        break;
      default:
        break;
    }
  };

  /** The swing's smear: a few samples of the mallet head's path just behind it, never near his face. */
  const drawSmear = (m: Move | null, base: Pose, x: number, y: number, facing: 1 | -1, face: Rect) => {
    smear.clear();
    if (m?.kind !== "swing" || playback.kind !== "swing") return;
    const u = displayU("swing", moveU(m));
    if (u < SMEAR.from || u > SMEAR.to) return;
    const near: Rect = { x: face.x - SMEAR.clear, y: face.y - SMEAR.clear, w: face.w + 2 * SMEAR.clear, h: face.h + 2 * SMEAR.clear };
    const pts: Point[] = [];
    for (let k = SMEAR.points - 1; k >= 0; k--) {
      const uk = Math.max(SMEAR.from, u - (SMEAR.trail * k) / (SMEAR.points - 1));
      const j = solve(overlay(base, ACTIONS.swing(uk), "upper", playback.w), facing, HEAD_SCALE, headPlate).joints.malletHead;
      pts.push({ x: x + j.x, y: y + j.y });
    }
    for (let i = 1; i < pts.length; i++) {
      if (sweptHeadHits(pts[i - 1], pts[i], SMEAR.width / 2, near)) continue;
      const k = i / (pts.length - 1);
      smear
        .moveTo(pts[i - 1].x, pts[i - 1].y)
        .lineTo(pts[i].x, pts[i].y)
        .stroke({ width: SMEAR.width * k, color: 0xfff4c8, alpha: 0.35 * k, cap: "round" });
    }
  };

  /**
   * The Buc-ee's shield while it lasts: a gold glow around him, drawn just behind him, flickering
   * through its last two seconds, with sparkles turning round its rim (the face keep-out drops any
   * that would cross his face).
   */
  function drawShield(x: number, drawY: number, sortY: number, dt: number) {
    shieldGlow.clear();
    const left = game.run.star;
    shieldShown = left > 0 && (left > SHIELD_LOOK.flicker || Math.floor(time * 10) % 2 === 0);
    if (!shieldShown) return;
    const cy = drawY - SHIELD_LOOK.up;
    for (let i = SHIELD_LOOK.rings; i >= 1; i--) {
      const k = i / SHIELD_LOOK.rings;
      shieldGlow.ellipse(x, cy, SHIELD_LOOK.rx * k, SHIELD_LOOK.ry * k).fill({ color: SHIELD_LOOK.color, alpha: SHIELD_LOOK.alpha * (1 - k * 0.6) });
    }
    shieldGlow.ellipse(x, cy, SHIELD_LOOK.rx, SHIELD_LOOK.ry).stroke({ width: 6, color: SHIELD_LOOK.rim, alpha: 0.7 });
    shieldGlow.zIndex = sortY - 1;
    sparkT += dt;
    if (sparkT >= SHIELD_LOOK.sparkEvery) {
      sparkT = 0;
      const a = time * 3.1;
      particles.emit("glint", x + Math.cos(a) * SHIELD_LOOK.rx, cy + Math.sin(a) * SHIELD_LOOK.ry, 1);
      particles.emit("glint", x - Math.cos(a) * SHIELD_LOOK.rx, cy - Math.sin(a) * SHIELD_LOOK.ry, 1);
    }
  }

  /** The flashlight's beam from his hand, the length of its reach. */
  function drawBeam(x: number, y: number, facing: 1 | -1) {
    beam.clear();
    // Layers of a warm cone, each shorter than the last, so it thins out along its reach instead of ending on an edge.
    for (const k of [1, 0.84, 0.68, 0.52, 0.36, 0.2]) {
      const far = x + facing * CAST.guard.reach * k;
      beam.poly([x, y - 10, x, y + 10, far, y + 10 + 120 * k, far, y - 10 - 80 * k]).fill({ color: 0xffe9a8, alpha: 0.11 });
    }
    beamT = CAST.guard.flash;
  }

  /** Lets the drawn people, carts, flyers and bubbles go, for a new venue or a new shift. */
  function clearActors() {
    cast.clear();
    pigView.clear();
    props.clear();
    flyers.clear();
    speech.clear();
  }

  /** Puts the camera on him at once: after a door, a respawn or a teleport. */
  function snapCamera(x: number, y: number) {
    scene.camera.x = x;
    // The walking line where it rests (his chest at the centre on a phone upright), as the camera settles it.
    const portrait = scene.width < scene.height;
    const scale = (HERO_SCREEN_FRACTION * scene.height * scene.camera.zoom * (portrait ? PORTRAIT_ZOOM : 1)) / HERO_HEIGHT;
    scene.camera.focusY = scene.camera.y = floorFocus(scene.height, scale, y, portrait);
  }

  /** A level's light on everything that takes it: the lamps' group, the ambient on the people, the props and what flies. */
  function lightLevel(level: Level) {
    lighting.setGroup(level.id);
    lighting.setAmbient(ambientOf(level));
    cast.setAmbient(scene.ambient);
    props.setAmbient(scene.ambient);
    flyers.setAmbient(scene.ambient);
  }

  /** The level he is in now: its venue, backdrop, lamps, bounds and camera. */
  function showLevel(level: Level, x: number, y: number) {
    shown = level.id;
    shownX = x;
    void wear(costumeAt(level, game.shift[game.venue] ?? level));
    for (const [id, v] of views) {
      v.venue.setVisible(id === level.id);
      v.backdrop.setVisible(id === level.id);
    }
    lightLevel(level);
    scene.camera.bounds = level.bounds;
    objects.clear();
    shownPickups = game.pickups;
    views.get(level.id)?.venue.setPunched(game.run.punched);
    // The zoom lands with him: no easing across a door.
    const zone = level.camera.zones.find((z) => x >= z.x0 && x <= z.x1);
    scene.camera.zoom = zone?.zoom ?? 1;
    snapCamera(x, y);
  }

  /** The run for the checks: its mode, where he is, the shift's numbers and every event type counted since the page loaded. */
  const runProbe = () => {
    const h = cur.hero;
    return {
      mode: game.mode,
      level: game.level.id,
      x: h.x,
      y: h.y,
      score: game.run.score,
      cans: game.run.cans,
      lives: game.run.lives,
      time: game.run.time,
      keycards: game.run.keycards,
      patience: h.patience,
      hot: h.hot,
      star: game.run.star,
      checkpoint: game.run.checkpoint,
      saved: savedT > 0,
      shield: shieldShown,
      shownX,
      events: { ...counts },
    };
  };

  /** A world rect on the screen, CSS px. */
  const screenRect = (r: Rect): Rect => {
    const tl = scene.toScreen({ x: r.x, y: r.y });
    const br = scene.toScreen({ x: r.x + r.w, y: r.y + r.h });
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
  };

  /** In a level of rooms the camera keeps to the room the boss is in, but never so that he himself goes off the screen. */
  let roomView: { x0: number; x1: number } | null = null;
  const roomsCamera = (x: number, dt: number) => {
    const rooms = game.level.rooms;
    const boss = cur.boss;
    if (!rooms || boss?.kind !== "titanium") {
      roomView = null;
      return;
    }
    const r = rooms[boss.room];
    const b = game.level.bounds;
    const half = scene.view().w / 2;
    const want = { x0: Math.max(b.x, Math.min(r.x0 - ROOM_MARGIN, x - half * ROOM_KEEP)), x1: Math.min(b.x + b.w, Math.max(r.x1 + ROOM_MARGIN, x + half * ROOM_KEEP)) };
    const k = roomView ? Math.min(1, dt / ZOOM_EASE) : 1;
    roomView = roomView ? { x0: roomView.x0 + (want.x0 - roomView.x0) * k, x1: roomView.x1 + (want.x1 - roomView.x1) * k } : want;
    scene.camera.bounds = { x: roomView.x0, y: b.y, w: roomView.x1 - roomView.x0, h: b.h };
  };

  /** The 3D hall, loaded the first time a level asks for it: three.js stays out of the page until then. */
  let three: ThreeView | null = null;
  let threeSettled = false;
  let threeLoad: Promise<void> | null = null;
  /** Which load is the live one: a view that finishes loading after the level moved on, or after a lost context, is freed. */
  let threeGen = 0;
  /** A context lost once: the browser is short of them, and the halls play flat for the session. */
  let threeLost = false;
  const threeOff = () => {
    if (window.__next) window.__next.three = { canvas: false, quality: render.quality, density: 0, fps: 0, drawing: false };
  };
  const loadThree = () => {
    if (threeLoad) return threeLoad;
    const gen = ++threeGen;
    const hall = game.level.hall;
    return (threeLoad = (async () => {
      if (threeLost || !hall) return;
      const { ThreeView } = await import("./3d/three-view");
      const host = app.canvas.parentElement;
      if (!host) throw new Error("the game's canvas has no host");
      // The game's canvas over the hall's, for his profile, his thoughts and the words.
      Object.assign(app.canvas.style, { position: "relative", zIndex: "1" });
      const view = new ThreeView(host, render.quality, window.__next?.gpu ?? "");
      view.onContextLost = () => {
        threeLost = true;
        threeGen++;
        hallLost();
        three = null;
        view.destroy();
        threeOff();
      };
      try {
        await view.load(SETS[hall.set]);
        if (gen === threeGen) await view.loadPeople(registry, game.level);
      } catch (err) {
        view.destroy();
        throw err;
      }
      if (gen !== threeGen) {
        view.destroy();
        return;
      }
      three = view;
    })()
      .catch((err) => console.warn("the hall plays flat:", err))
      .then(() => {
        if (gen === threeGen || threeLost) threeSettled = true;
      }));
  };
  /** Frees the 3D view: off a hall, or as the game stops. The next hall loads its own. */
  const freeThree = () => {
    if (!threeLoad) return;
    threeGen++;
    three?.destroy();
    three = null;
    threeLoad = null;
    threeSettled = false;
    threeOff();
  };
  /** The checks' controller, in place of a real one. */
  let devPad: Pad | null = null;
  let hallShown = false;
  let hallPhase = 0;
  const hallUp = () => !!game.level.hall && !!three;
  /** The 3D view lost: the game's canvas opaque again, the level drawn flat where he stands. */
  const hallLost = () => {
    if (!hallShown) return;
    hallShown = false;
    for (const name of LAYER_ORDER) scene.layers[name].visible = true;
    app.renderer.background.alpha = 1;
    shown = null;
    character.container.visible = true;
    cast.container.visible = props.container.visible = flyers.container.visible = true;
    objects.setVisible(true);
    scene.camera.bounds = game.level.bounds;
    hallFlat.setVisible(true);
  };
  /** The 3D view under the game's canvas, which clears transparent and keeps only his profile, comic words, thoughts and sparks. */
  const showHall = (on: boolean) => {
    hallShown = on;
    for (const name of LAYER_ORDER) if (name !== "fx" && name !== "play") scene.layers[name].visible = !on;
    app.renderer.background.alpha = on ? 0 : 1;
    three?.setVisible(on);
    if (!on && window.__next?.three) window.__next.three = { ...window.__next.three, drawing: false };
    if (!on) {
      character.container.visible = true;
      cast.container.visible = props.container.visible = flyers.container.visible = true;
      objects.setVisible(true);
      scene.camera.bounds = game.level.bounds;
    }
    hallGov.settle = 2;
    hallGov.t = hallGov.n = 0;
  };
  /** The hall's own governor: a window of a second steps its tier down, never up; the game's own tier is untouched. */
  const THREE_ORDER: Quality[] = ["ultra", "high", "medium", "low"];
  const hallGov = { settle: 2, t: 0, n: 0, forced: 0 };
  const governHall = (dt: number) => {
    if (!three || game.mode === "pause" || dt <= 0) return;
    if (hallGov.settle > 0) {
      hallGov.settle -= dt;
      return;
    }
    hallGov.t += dt;
    hallGov.n++;
    if (hallGov.t < 1) return;
    const intervalMs = (hallGov.t / hallGov.n) * 1000;
    hallGov.t = hallGov.n = 0;
    if (!shouldStepDown3d({ workMs: hallGov.forced || three.frameMs, intervalMs })) return;
    const next = THREE_ORDER[THREE_ORDER.indexOf(three.quality) + 1];
    if (!next) return;
    three.setQuality(next);
    three.frameMs = 0;
    hallGov.settle = 1;
  };
  /**
   * The hall's frame, once the game's own has run: its view for this frame, and the game's camera laid over it so that the
   * world's point under his feet is the hall's, at the hall's size. His profile, his thoughts and the words then land on him.
   */
  const hallFrame = (alpha: number, simDt: number, dt: number) => {
    if (!three) return;
    const hNow = cur.hero;
    const pace = game.level.hall?.pace ?? 1;
    hallPhase += simDt * backCycle(hNow, pace);
    const back = backClipOf(hNow, hallPhase, pace);
    const state = hallStateOf(prev, cur, alpha, game.pickups, game.level.puddle ?? null, { crates: game.crates, lift: game.level.hall ? SETS[game.level.hall.set].lift : 1 });
    three.resize(scene.width, scene.height);
    three.sync(state, back, dt);
    // The set's own view of him, then the game's camera on it: his height on the screen and his feet's place.
    const feet = three.project(state.hero.lx, state.hero.y, state.hero.z);
    const crown = three.project(state.hero.lx, state.hero.y + HERO_METERS, state.hero.z);
    const cam = scene.camera;
    cam.target = null;
    cam.bounds = null;
    const portrait = scene.width < scene.height ? PORTRAIT_ZOOM : 1;
    cam.zoom = (feet.y - crown.y) / (HERO_SCREEN_FRACTION * scene.height * portrait);
    scene.fit();
    cam.x = prev.hero.x + (hNow.x - prev.hero.x) * alpha - (feet.x - scene.width / 2) / scene.scale;
    cam.y = prev.hero.y + (hNow.y - prev.hero.y) * alpha - (feet.y - scene.height / 2) / scene.scale;
    scene.fit();
    hallCrowns.clear();
    for (const n of state.cast) {
      const at = three.project(n.lx, n.y + 1.85, n.z);
      hallCrowns.set(n.num, { x: cam.x + (at.x - scene.width / 2) / scene.scale, y: cam.y + (at.y - scene.height / 2) / scene.scale });
    }
    if (state.boss) {
      const at = three.project(state.boss.lx, state.boss.y + 1.85, state.boss.z);
      hallCrowns.set(BOSS_ID, { x: cam.x + (at.x - scene.width / 2) / scene.scale, y: cam.y + (at.y - scene.height / 2) / scene.scale });
    }
    character.container.visible = !back;
    three.render(dt);
    governHall(dt);
    if (window.__next) window.__next.three = { canvas: true, quality: three.quality, density: three.density, fps: three.fps, drawing: three.drawing };
    return back;
  };
  /** Where each of the cast's heads is, in the game's world, over the hall's view of them: their speech hangs from it. */
  const hallCrowns = new Map<number, { x: number; y: number }>();

  /** The tail of every frame, the shift's and the banquet's: the mode's notice, the hurry, the notes' clocks and the HUD. */
  const afterFrame = (simDt: number, hurry: boolean) => {
    sound.setHurry(hurry);
    sound.tick();
    savedT = Math.max(0, savedT - simDt);
    noteT = Math.max(0, noteT - simDt);
    // The HUD before the mode: the shell reads this frame's numbers (the score, the staff bonked) when the mode changes.
    const hud = { ...hudOf(game, portrait, savedT > 0, noteT > 0 ? note : null), pad: pad.connected };
    const key = hudKey(hud);
    if (key !== hudLast) {
      hudLast = key;
      opts.onHud?.(hud);
    }
    if (game.mode !== lastMode) {
      lastMode = game.mode;
      opts.onMode?.(game.mode);
    }
  };

  /** A side quest is up: its card, its round, its tally, or a break in its round. */
  const inQuest = () => !!game.quest && (game.mode === "questCard" || game.mode === "quest" || game.mode === "questTally" || game.mode === "pause");
  const inBanquet = () => inQuest() && game.quest?.id === "hungry";
  /** The view of the round's table, and whether it has loaded. */
  const tableOf = (q: Hungry) => (q.menu === "lounge" ? lounge : q.menu === "french" ? french : banquet);
  const loadTableOf = (q: Hungry) => (q.menu === "lounge" ? loadLounge() : q.menu === "french" ? loadFrench() : loadBanquet());
  const tableLoaded = () => {
    const q = game.quest;
    return q?.id !== "hungry" || (q.menu === "lounge" ? loungeLoaded : q.menu === "french" ? frenchLoaded : banquetLoaded);
  };
  const inGate = () => inQuest() && game.quest?.id === "fares";
  /** Which quest's view is up in place of the shift's. */
  let questShown: QuestId | null = null;
  /** Which of his gate lines comes next, by mood (R5 §7). */
  const gateLines = { calm: 0, gloat: 0, pissed: 0 };
  /** The camera's push-in while a scalpel flies (R5 §3), 0 to 1. */
  let gatePush = 0;
  let gateSteamT = 0;
  /** Out of the shuttle door: the Coke Zero in his hand and the nuts spilling from his pockets, seconds left (R5 §8). */
  const walkOut: WalkOut = { can: 0, nuts: 0 };
  let nutsT = 0;
  const walkCan = new Sprite(Texture.EMPTY);
  walkCan.anchor.set(0.5, 0.6);
  walkCan.visible = false;
  scene.layers.play.addChild(walkCan);
  /** Which of his banquet lectures comes next. */
  let banquetLectures = 0;
  /** The box of blades's lines said in this venue (R5 §9): each once a venue. */
  let sampleVenue = "";
  const samplesSaid = new Set<string>();
  let shownQuest: Hungry | null = null;
  let questDives = 0;

  /** A quest's view in place of the shift's, or back (null): the shift's venue, people and props hidden while it shows. */
  const showQuestView = (id: QuestId | null) => {
    const on = id !== null;
    for (const [vid, v] of views) {
      v.venue.setVisible(!on && vid === shown);
      v.backdrop.setVisible(!on && vid === shown);
    }
    if (!on && shown) lighting.setGroup(shown);
    character.container.visible = cast.container.visible = props.container.visible = flyers.container.visible = pigView.container.visible = !on;
    if (on) bossView.container.visible = false;
    towerCarts.container.visible = !on;
    hallFlat.setVisible(!on && !!game.level.hall);
    objects.setVisible(!on);
    banquet.setVisible(id === "hungry");
    lounge.setVisible(id === "lounge");
    french.setVisible(id === "french");
    gate.setVisible(id === "fares");
    if (on) {
      beam.visible = false;
      shieldGlow.clear();
      smear.clear();
      walkCan.visible = false;
      lighting.setGroup(id === "fares" ? "gate" : "banquet");
      scene.camera.bounds = null;
      scene.camera.target = null;
    }
  };
  const enterQuest = (id: QuestId) => {
    speech.clear();
    bubbles.clear();
    showQuestView(id);
    questShown = id;
  };
  /** Out of a quest: the shift's level shown again where he stands. */
  const leaveQuest = (x: number, y: number) => {
    speech.clear();
    bubbles.clear();
    showQuestView(null);
    showLevel(game.level, x, y);
    questShown = null;
  };

  /**
   * The CSS px the HUD's top bar and the touch pad or the hint take off the screen: the banquet is framed between them.
   * The gate (`gate`) on an upright phone keeps under the HUD's panel and above the hint, which both span the screen there.
   */
  const insetsCache = new Map<string, { at: number; v: { top: number; bottom: number } }>();
  /** The HUD's layout read again only on a resize or every half second (a pad showing, a hint growing), not each frame. */
  const insets = (gate = false) => {
    const key = `${gate}:${scene.width}x${scene.height}`;
    const now = performance.now();
    const hit = insetsCache.get(key);
    if (hit && now - hit.at < 500) return hit.v;
    const v = measureInsets(gate);
    insetsCache.set(key, { at: now, v });
    return v;
  };
  const measureInsets = (gate: boolean) => {
    const upright = gate && scene.width < scene.height;
    const bar = document.querySelector(".next-hud__bar-top")?.getBoundingClientRect();
    const side = upright ? document.querySelector(".next-hud__panel")?.getBoundingClientRect() : undefined;
    const pad = document.querySelector(".next-touch")?.getBoundingClientRect();
    const hint = document.querySelector(".next-hud__hint")?.getBoundingClientRect();
    const low = upright && pad && hint ? Math.min(pad.top, hint.top) : pad ? pad.top : hint?.top;
    return { top: Math.max(bar ? bar.bottom + 8 : 64, side ? side.bottom + 8 : 0), bottom: low !== undefined ? scene.height - low + 8 : 44 };
  };

  /** The banquet's events as words, bubbles, speech and particles, every word through the face-safe layout. */
  const showBanquet = (e: GameEvent, q: Hungry) => {
    const table = q.menu === "lounge" ? lounge : banquet;
    const face = table.face();
    const view = scene.view();
    const crown = table.crown();
    switch (e.type) {
      case "hhThink":
        bubbles.think(e.text, e.seconds);
        break;
      case "hhSay":
        speech.say(DINER_ID[e.who], e.text, e.seconds);
        break;
      case "hhChomp": {
        const p = onScreen(e);
        particles.emit("crumbs", p.x, p.y, 6 + 2 * e.count);
        if (e.who === "hammer") words.say(e.count > 2 ? "NOM NOM!" : "NOM", p.x, p.y - 80, e.count > 2, face, view);
        break;
      }
      case "hhLand":
        if (e.who === "hammer" && (e.kind === "check" || e.kind === "bill")) words.say(e.kind === "bill" ? "-100" : "-400", crown.x + 160, crown.y, true, face, view);
        else if (e.who === "hammer" && (q.score.chain === HUNGRY.combo.double || q.score.chain === HUNGRY.combo.triple))
          words.say(q.score.chain === HUNGRY.combo.triple ? "COMBO x3!" : "COMBO x2!", crown.x + 220, crown.y - 40, true, face, view);
        break;
      case "hhRob": {
        const p = onScreen(e);
        words.say("YOINK!", p.x, p.y - 120, true, face, view);
        table.smug();
        break;
      }
      case "hhClash": {
        const p = onScreen(e);
        particles.emit("impact", p.x, p.y, 16);
        particles.emit("glint", p.x, p.y, 8);
        words.say("CLASH!", p.x, p.y - 120, true, face, view);
        break;
      }
      case "hhBonk":
        if (e.hit) {
          const p = onScreen(e);
          particles.emit("impact", p.x, p.y, 14);
          words.say("BONK!", p.x + 60, p.y - 160, false, face, view);
        }
        break;
      case "hhSlap": {
        const p = onScreen(e);
        particles.emit("impact", p.x, p.y, 12);
        words.say("SLAP!", p.x, p.y - 100, true, face, view);
        // Every third slap he says it: the recording with its caption.
        if (e.curse) bubbles.say(DAMAGE_LINE.text, 1.6);
        table.hurt();
        break;
      }
      // His lecture: the service when the server is at his end of the table, the food and the manners otherwise.
      case "hhLecture": {
        const server = q.server.away <= 0 && q.server.s >= 0.5;
        const lines = server ? SERVER_LECTURES : BANQUET_LECTURES;
        bubbles.think(lines[banquetLectures++ % lines.length].text, 1.8);
        break;
      }
      case "hhSchooled": {
        const p = e.who === "server" ? onScreen(e) : onScreen(SEATS[e.who].plate);
        particles.emit("glint", p.x, p.y - 200, 5);
        break;
      }
      case "hhSwat": {
        const p = onScreen(e);
        particles.emit("paper", p.x, p.y - 240, 14);
        words.say("SWAT!", p.x, p.y - 320, false, face, view);
        break;
      }
      case "hhPaper":
        if (e.hit) {
          const p = onScreen(e);
          particles.emit("paper", p.x, p.y - 240, 10);
          words.say("-150", p.x + 200, p.y - 300, false, face, view);
          table.hurt();
        }
        break;
      // Lifetime Titanium guy helped himself: "evenly".
      case "hhSplit": {
        const p = onScreen(e);
        words.say("SPLIT!", p.x + 160, p.y - 120, true, face, view);
        table.hurt();
        break;
      }
      case "hhCart": {
        const p = onScreen(e);
        particles.emit("glass", p.x, p.y, 18);
        words.say("CRASH!", p.x, p.y - 200, true, face, view);
        break;
      }
      case "hhTray": {
        if (e.phase === "hand") break;
        const p = onScreen(e);
        words.say(e.phase === "spill" ? "PARDON!" : "BONK!", p.x, p.y - 200, true, face, view);
        break;
      }
      default:
        break;
    }
  };

  /** A frame of the banquet: the round drawn, framed between the bars, its words and the HUD. */
  const banquetTick = (dt: number, simDt: number) => {
    const q = game.quest;
    if (q?.id !== "hungry") return;
    const key = questIdOf(q);
    const table = tableOf(q);
    if (questShown !== key) enterQuest(key);
    // His dives this round, for the checks: a new round counts from nothing.
    if (q !== shownQuest) {
      shownQuest = q;
      questDives = 0;
    }
    questDives += pending.filter((e) => e.type === "hhDive" && e.who === "hammer").length;
    stepped.length = 0;
    table.sync(q, simDt, time);
    for (const e of pending) showBanquet(e, q);
    pending.length = 0;
    const f = banquetFrame(scene.width, scene.height, insets());
    Object.assign(scene.camera, { x: f.x, y: f.y, zoom: f.zoom });
    scene.update(dt);
    lighting.update(dt);
    const face = table.face();
    faceOnScreen = screenRect(face);
    const view = scene.view();
    words.update(simDt, face, view);
    bubbles.update(simDt, { crown: table.crown(), face, facing: 1, view });
    speech.update(simDt, (id) => table.crownOf(id), face, view);
    particles.update(simDt, face);
    // Each side quest has its own song (owner, 2026-10-25), faster for the frenzy; quiet on its card and its tally.
    const tune = questMusic(q);
    const banquetMusic = musicFor(game.mode, game.level.music, tune.theme);
    sound.music(banquetMusic.theme, banquetMusic.quiet);
    afterFrame(simDt, game.mode === "quest" && tune.hurry);
    vignette.width = scene.width;
    vignette.height = scene.height;
    if (window.__next) {
      // The shift's numbers stay as he left them (nothing of it steps); the mode and the event counts move on. Written in
      // full: a round begun before the shift's first frame (a practice asked for while the page loaded) has no other.
      window.__next.run = runProbe();
      window.__next.starts = starts;
      window.__next.drawing = app.stage.visible;
      window.__next.faceScreen = faceOnScreen;
      window.__next.sound = { unlocked: sound.unlocked, played: { ...sound.played }, volumes: sound.volumes };
      window.__next.quest = {
        id: "hungry",
        menu: q.menu,
        walker: q.walker && { s: q.walker.s, away: q.walker.away },
        time: q.time,
        score: Math.max(0, Math.round(q.score.plate + q.score.bonus)),
        eaten: q.score.eaten,
        dives: questDives,
        coiling: q.hammer.dive?.phase === "coil",
        aim: q.hammer.aim,
        lock: q.hammer.lock,
        duck: q.hammer.duck,
        stun: q.hammer.stun,
        result: q.result,
        frame: screenRect({ x: -TABLE.r, y: -TABLE.r * TABLE.squash, w: 2 * TABLE.r, h: 2 * TABLE.r * TABLE.squash }),
      };
    }
  };

  /** The gate's events as words, bubbles, speech and the crowd's beats, every word through the face-safe layout (R5 §7). */
  const showGate = (e: GameEvent) => {
    const face = gate.face();
    const view = scene.view();
    switch (e.type) {
      case "fdStick": {
        const p = gate.toWorld(e.at);
        particles.emit("debris", p.x, p.y, 4);
        if (e.outcome === "book" && e.booking) {
          particles.emit("glint", p.x, p.y, 8);
          words.say(`+${e.points.toLocaleString("en-US")}`, p.x, p.y - 80, e.points >= 300, face, view);
          if (e.booking.companion) words.say("COMPANION PASS", p.x, p.y - 160, true, face, view);
        } else if (e.outcome === "stop") words.say("CANCELLED", p.x, p.y - 80, true, face, view);
        else words.say("MISS", p.x, p.y - 80, false, face, view);
        break;
      }
      case "fdPreferred": {
        const r = gate.boardOnScreen();
        particles.emit("gold", r.x + r.w / 2, r.y + r.h / 2, 30);
        words.say("A-LIST PREFERRED!", r.x + r.w / 2, r.y + r.h / 2, true, face, view);
        break;
      }
      case "fdThink":
        bubbles.think(e.text, e.seconds);
        break;
      case "fdSay":
        speech.say(GATE_ID[e.who], e.text, e.seconds);
        break;
      case "fdInsult": {
        const lines = e.mood === "gloat" ? GATE_GLOATS : e.mood === "pissed" ? GATE_PISSED : GATE_INSULTS;
        bubbles.think(lines[gateLines[e.mood]++ % lines.length].text, FARES.mouth.bubble);
        break;
      }
      case "fdCrowd":
        for (const t of e.who) gate.react(t, e.kind);
        break;
      case "fdMood":
        gate.mood(e.mood, e.seconds);
        break;
      // Toweled off: the sweat flies off the towel in front of his face, and his hand is steady again.
      case "fdTowel":
        if (!e.on) {
          const c = gate.crown();
          particles.emit("spray", face.x + face.w + 24, face.y + face.h / 2, 20, true);
          words.say("STEADY!", c.x + 180, c.y - 20, false, face, view);
        }
        break;
      default:
        break;
    }
  };
  const isFares = (e: GameEvent): e is FaresEvent => e.type.startsWith("fd");

  /** A frame of the gate: the round drawn, framed between the bars, its words and the HUD. */
  const gateTick = (dt: number, simDt: number) => {
    const q = game.quest;
    if (q?.id !== "fares") return;
    if (questShown !== "fares") enterQuest("fares");
    // The round is over: no finger still on the canvas steadies the next one.
    if (q.result) pointers.clear();
    stepped.length = 0;
    const l = gateLayout(scene.width, scene.height, insets(true));
    gate.layout(l);
    for (const e of pending) if (isFares(e)) gate.event(e);
    gate.sync(q, simDt, time);
    for (const e of pending) showGate(e);
    pending.length = 0;
    gatePush += ((q.shot?.phase === "flight" ? 1 : 0) - gatePush) * Math.min(1, simDt * 14);
    Object.assign(scene.camera, { x: l.camera.x, y: l.camera.y, zoom: l.camera.zoom * (1 + 0.04 * gatePush) });
    scene.update(dt);
    lighting.update(dt);
    const face = gate.face();
    // Pissed after a miss: the heat's steam puffing from the top of his head, for the look only.
    gateSteamT = gate.steaming() ? gateSteamT + simDt : 0;
    if (gateSteamT >= STEAM_EVERY / 2) {
      gateSteamT = 0;
      const c = gate.crown();
      particles.emit("steam", c.x + (Math.random() - 0.5) * 40, c.y, 2);
    }
    faceOnScreen = screenRect(face);
    const view = scene.view();
    words.update(simDt, face, view);
    bubbles.update(simDt, { crown: gate.crown(), face, facing: 1, view });
    speech.update(simDt, (id) => gate.crownOf(id), face, view);
    particles.update(simDt, face);
    // Its own song (owner, 2026-10-25), faster while he is on a streak; quiet on its card and its tally.
    const tune = questMusic(q);
    const gateMusic = musicFor(game.mode, game.level.music, tune.theme);
    sound.music(gateMusic.theme, gateMusic.quiet);
    afterFrame(simDt, game.mode === "quest" && tune.hurry);
    vignette.width = scene.width;
    vignette.height = scene.height;
    if (window.__next) {
      window.__next.run = runProbe();
      window.__next.starts = starts;
      window.__next.drawing = app.stage.visible;
      window.__next.faceScreen = faceOnScreen;
      window.__next.sound = { unlocked: sound.unlocked, played: { ...sound.played }, volumes: sound.volumes };
      window.__next.quest = {
        id: "fares",
        time: q.time,
        score: Math.max(0, q.score),
        thrown: q.thrown,
        stuck: q.stuck,
        booked: q.bookings.length,
        position: q.position,
        streak: q.streak,
        steady: q.steady,
        towels: q.towels,
        preferred: q.preferred,
        aim: scene.toScreen(gate.toWorld(aimOf(q))),
        tags: gate.tagsInWorld().map((t) => ({ city: t.city, kind: t.kind, rect: screenRect(t.rect) })),
        result: q.result,
        frame: screenRect(gate.boardOnScreen()),
      };
    }
  };

  /** A finger on the canvas during a Fare Darts round: its touch throws; one held a moment steadies the next (R5 §3). */
  const onPointer = (e: PointerEvent) => {
    if (e.type === "pointerdown") {
      // The primary button (a touch or a left click) throws; a right or middle click does nothing.
      if (game.quest?.id !== "fares" || game.mode !== "quest" || e.button !== 0) return;
      sound.unlock();
      pointers.set(e.pointerId, performance.now());
      touchTapped.add("jump");
    } else pointers.delete(e.pointerId);
  };
  /** A finger held on the canvas 0.2 s or more, with no scalpel in the air: Run held. */
  const pointerSteady = () => {
    const q = game.quest;
    if (q?.id !== "fares" || game.mode !== "quest" || q.shot) return false;
    const now = performance.now();
    for (const at of pointers.values()) if (now - at >= POINTER_STEADY_MS) return true;
    return false;
  };
  app.canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("pointerup", onPointer);
  window.addEventListener("pointercancel", onPointer);

  /** The mouse across and down the screen, -0.5 to 0.5: the home screen's camera leans with it. */
  const lean = { x: 0, y: 0 };
  const onLean = (e: PointerEvent) => {
    lean.x = e.clientX / Math.max(1, innerWidth) - 0.5;
    lean.y = e.clientY / Math.max(1, innerHeight) - 0.5;
  };
  window.addEventListener("pointermove", onLean, { passive: true });
  // A tap or a click anywhere unlocks sound, the home screen's and the cards' included (plan decision 13).
  const onTap = () => sound.unlock();
  window.addEventListener("pointerdown", onTap, { passive: true });
  /**
   * The start screen's picture, CSS px, measured twice a second: `frame` is its camera's box below the tools along the
   * top, the scene framed inside it; `free` is the part no piece of the menu covers, where his thoughts go.
   */
  const whole = (): Rect => ({ x: 0, y: 0, w: scene.width, h: scene.height * 0.85 });
  let picture = { frame: whole(), free: whole() };
  let pictureT = Infinity;
  let titleShown = false;
  let titleSnap = true;
  let titleFrames = 0;
  const measurePicture = () => {
    const r = document.querySelector(".next-start__camera")?.getBoundingClientRect();
    const tools = document.querySelector(".next-start__top")?.getBoundingClientRect();
    const top = r ? Math.max(r.y, tools ? tools.bottom + 8 : r.y) : 0;
    if (!r || r.width <= 0 || r.bottom - top <= 0) return { frame: whole(), free: whole() };
    const frame = { x: r.x, y: top, w: r.width, h: r.bottom - top };
    // The title's lines by the text on them: the eyebrow's box runs the full width of a phone on its side.
    const text = (el: Element) => {
      if (el instanceof HTMLButtonElement) return el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect();
    };
    const seen = (sel: string, of = (el: Element) => el.getBoundingClientRect()) =>
      [...document.querySelectorAll(sel)].map(of).filter((b) => b.width > 0 && b.height > 0);
    // Above the strip and the side quests; then beside the title or above it, whichever leaves more room.
    let left = frame.x;
    let bottom = frame.y + frame.h;
    for (const b of seen(".next-strip, .next-start__quests")) if (b.top > top) bottom = Math.min(bottom, b.top - 8);
    const title = seen(".next-start__eyebrow, .next-start__word, .next-start__tagline, .next-start__go", text);
    if (title.length) {
      const right = Math.max(...title.map((b) => b.right)) + 12;
      const above = Math.min(bottom, Math.min(...title.map((b) => b.top)) - 8);
      if ((frame.x + frame.w - right) * (bottom - top) >= frame.w * (above - top)) left = right;
      else bottom = above;
    }
    const free = { x: left, y: top, w: frame.x + frame.w - left, h: bottom - top };
    return { frame, free: free.w > 0 && free.h > 0 ? free : frame };
  };
  const pictureRect = (dt: number) => {
    pictureT += dt;
    if (pictureT >= 0.5) {
      pictureT = 0;
      picture = measurePicture();
    }
    return picture;
  };
  /** The free picture in the world, for keeping his thoughts inside it. */
  const titleView = (): Rect => {
    const { free } = picture;
    const cam = scene.camera;
    return {
      x: cam.x + cam.shake.x + (free.x - scene.width / 2) / scene.scale,
      y: cam.y + cam.shake.y + (free.y - scene.height / 2) / scene.scale,
      w: free.w / scene.scale,
      h: free.h / scene.scale,
    };
  };
  /**
   * The home screen's camera: him a third of the way across the picture at the key art's size, his feet low in it, the
   * desk to his right (never past the level's look point, cx), leaning with the mouse; no look-ahead, no bounds. On a
   * screen the menu fills, he peeks over it from the free band instead.
   */
  const titleCamera = (home: { x: number; cx: number }, feetY: number, dt: number) => {
    const cam = scene.camera;
    if (titleSnap) pictureT = Infinity;
    const { frame, free } = pictureRect(dt);
    const peek = free.h < TITLE_PEEK.short * frame.h;
    const crown = free.y + free.h * TITLE_PEEK.below;
    const tall = peek ? (free.y + free.h - crown) / TITLE_PEEK.shown : TITLE_FRAME.tall * frame.h;
    const at = peek
      ? { x: free.x + free.w * TITLE_PEEK.across, y: crown + tall }
      : { x: frame.x + frame.w * TITLE_FRAME.across, y: frame.y + frame.h * TITLE_FRAME.feet };
    const leaning = peek ? 0 : 1;
    const portrait = scene.width < scene.height ? PORTRAIT_ZOOM : 1;
    const base = (HERO_SCREEN_FRACTION * scene.height * portrait) / HERO_HEIGHT;
    const s = tall / HERO_HEIGHT;
    cam.zoom = s / base;
    cam.target = null;
    cam.bounds = null;
    const wantX = Math.min(home.cx, home.x - (at.x - scene.width / 2) / s) + leaning * lean.x * TITLE_FRAME.leanX;
    const wantY = feetY - (at.y - scene.height / 2) / s + leaning * lean.y * TITLE_FRAME.leanY;
    const k = titleSnap ? 1 : 1 - Math.exp(-TITLE_FRAME.ease * dt);
    cam.x += (wantX - cam.x) * k;
    cam.y += (wantY - cam.y) * k;
    cam.focusY = cam.y;
    titleSnap = false;
  };

  /** Just the actions the keys and the pad hold this instant: what Continue must not see pressed on the step after it. */
  const heldNow = () => inputFrom(down, pad.held.size ? new Set([...touchDown, ...pad.held]) : touchDown, prevHeld).held;

  /** The run and what he carries, as they stand: a level's exit hands this on to the next card. */
  function snapshotNow(): Snapshot {
    const h = world.hero;
    const carry: Carry = { charge: h.charge, patience: h.patience, hot: h.hot, doggy: h.doggy, flop: h.flop, boxes: h.boxes };
    return structuredClone({ run: game.run, carry });
  }
  /** After the shell moved the game on (a new run, a story card's Continue): its events felt, a new level's card saved. */
  const settled = () => {
    prev = cur = world.snapshot();
    if (game.events.some((e) => e.type === "venue")) clearActors();
    for (const e of game.events) feel(e);
    if (game.mode === "card" && game.journey) opts.onCard?.(game.level.id, game.snapshot);
  };

  const tick = (t: Ticker) => {
    // Under the opaque start screen nothing needs drawing: the canvas rests until a start is chosen.
    // The home screen is the scene itself, live behind the start screen.
    app.stage.visible = true;
    // A venue still loading holds the game where it is, its card up; so does the banquet's card while the banquet loads.
    if (!game.level.hall) freeThree();
    const holding = !views.has(game.level.id) || (inBanquet() && !tableLoaded()) || (inGate() && !gateLoaded) || (!!game.level.hall && !opts.flat && !threeSettled);
    if (holding) {
      void prepare(game.level);
      if (game.level.hall && !opts.flat) void loadThree();
      if (inBanquet() && game.quest?.id === "hungry") void loadTableOf(game.quest);
      if (inGate()) void loadGate();
    }
    // A break stops everything that runs on game time; the camera and the screen still draw.
    const dt = game.mode === "pause" || holding ? 0 : Math.min(t.deltaMS / 1000, 0.1);
    const keys = tapped.size ? new Set([...down, ...tapped]) : down;
    // The controller merges with the keys and the touch pad; its Start breaks and resumes like P.
    pad = opts.board ? NO_PAD : (devPad ?? readPad());
    if (pad.start && !padStart && !menu && (game.mode === "play" || game.mode === "pause" || game.mode === "quest")) {
      forgetPresses();
      pause();
    }
    padStart = pad.start;
    // Hit-stop and slow motion: the sim and everything it drives run on the clock's seconds,
    // and a hit freezes the world on the step it lands.
    const { simDt, steps } = runFrame(clock, frame, dt, () => {
      const touch = touchTapped.size || pointers.size || pad.held.size ? new Set([...touchDown, ...touchTapped, ...pad.held]) : touchDown;
      if (pointerSteady()) touch.add("run");
      // Down a hall the pad's forward runs: there is no room for its own button there.
      if (game.level.hall && touch.has("up")) touch.add("run");
      const input = inputFrom(keys, touch, prevHeld);
      prevHeld = input.held;
      prev = cur;
      if (game.mode === "title") game.titleStep();
      else game.step(input);
      cur = world.snapshot();
      for (const e of game.events) feel(e);
      // A door, a respawn or a new venue moves him: no sliding across the gap between frames.
      if (game.events.some((e) => e.type === "respawn" || e.type === "door" || e.type === "venue")) prev = cur;
      // A new venue's people, carts and what flies are its own: nothing of the last one's is drawn there.
      if (game.events.some((e) => e.type === "venue")) clearActors();
    });
    time += simDt;
    if (steps > 0) {
      tapped.clear();
      touchTapped.clear();
    }
    if (inBanquet()) {
      banquetTick(dt, simDt);
      return;
    }
    if (inGate()) {
      gateTick(dt, simDt);
      return;
    }
    if (questShown) leaveQuest(world.hero.x, world.hero.y);
    if (hallShown && !hallUp()) showHall(false);
    const alpha = Math.min(1, frame.acc / STEP);
    const h = cur.hero;
    const x = prev.hero.x + (h.x - prev.hero.x) * alpha;
    const y = prev.hero.y + (h.y - prev.hero.y) * alpha;
    stepLayers(layers, h, stepped, simDt);
    stepped.length = 0;

    const base = addLean(animate(h, simDt), layers);
    const m = h.move;
    // The move over the locomotion clip; under reduced motion the foot doesn't tap (the shipped rule).
    const acted = playAction(playback, base, m?.kind === "tap" && reduced ? null : m, simDt);
    // The feet stand on the floor under each of them, slopes included.
    const planted = plantFeet(addBody(acted, layers), h.facing, HEAD_SCALE, headPlate, groundMode(h), floorProbe(x, y));
    // Solved facing left, the plates' own facing; the character mirrors itself for the right.
    const solved: Solved = solve(planted.pose, h.facing, HEAD_SCALE, headPlate);
    const floorY = supportY(x, y);
    smugT = Math.max(0, smugT - simDt);
    const expression: Expression =
      m?.kind === "tumble" || h.hurtT > 0 || h.stunT > 0
        ? "hurt"
        : m?.kind === "super" || m?.kind === "lecture"
          ? "angry"
          : smugT > 0
            ? "smug"
            : h.bored
              ? "bored"
              : "neutral";
    const drawY = y + planted.dy;
    const towel = m?.kind === "wipe" && moveU(m) > TOWEL_OUT[0] && moveU(m) < TOWEL_OUT[1];
    const watchUp = m?.kind === "watch" && playback.kind === "watch" && moveU(m) > WATCH_SHOWN[0] && moveU(m) < WATCH_SHOWN[1];
    character.container.position.set(x, drawY);
    character.container.zIndex = y;
    const nose = m?.kind === "snot" && playback.kind === "snot";
    character.apply(solved, expression, floorY - drawY, scene.ambient, towel, watchUp, nose);
    beamT = Math.max(0, beamT - simDt);
    beam.visible = beamT > 0;
    beam.alpha = beamT / CAST.guard.flash;
    beam.zIndex = y - 0.65;
    // The carts, the snot and the puddles sort just behind him: none of them ever covers his face.
    props.container.zIndex = y - 0.5;
    props.sync(prev, cur, alpha, simDt);
    // The cast draws just behind him too: nothing of them is ever over his face.
    cast.container.zIndex = y - 0.6;
    cast.sync(prev, cur, alpha, time, game.level, game.level.lights, scene.view());
    // Their flying props too (the hat, the glasses, the cup): between the cast and the carts, never over his face.
    flyers.container.zIndex = y - 0.55;
    flyers.update(simDt, (fx, fy) => topUnder(fx, fy));
    // The pig and its tufts sort behind the cast: nothing of it is ever over his face.
    pigView.sort(y - 0.7);
    pigView.sync(prev.pig, cur.pig, alpha, simDt);
    bossView.sort(y - 0.7);
    bossView.sync(cur.boss, time);
    towerCarts.container.zIndex = y - 0.65;
    towerCarts.sync(cur.movers);
    hallFlat.container.zIndex = y - 0.66;
    parisView.container.zIndex = y - 0.67;
    parisView.setVisible(!!game.level.bonjour);
    trainView.container.zIndex = y - 0.72;
    trainView.setVisible(!!game.level.coaches);
    if (game.level.coaches) {
      trainView.sync(game.level, trainPieces, opts.noart ? null : (registry.walls?.[game.level.rooms?.[0]?.wall ?? ""] ?? null), { stretch: game.run.stretch, heroX: world.hero.x, boss: world.boss }, simDt);
      views.get(game.level.id)?.backdrop.countryside?.sync(scene.camera.x, VIEW_HALF, world.hero.x, simDt);
    }
    if (game.level.bonjour) parisView.sync(game.level, time, simDt, world.bonjourDone, world.tip.out > 0);
    baselView.back.zIndex = y - 0.74;
    baselView.front.zIndex = y - 0.58;
    baselView.setVisible(!!game.level.errands);
    if (game.level.errands) {
      const dusk = game.mode === "title" ? 1 : duskOf(game.level, game.run.time);
      const near = game.level.errands.reduce((a, b) => (Math.abs(b.x - h.x) < Math.abs(a.x - h.x) ? b : a));
      baselView.sync(game.level, baselPieces, cur.parade, cur.boss, { x: near.x, hold: game.errandHold }, time, dusk > 0 ? 1 : 0, simDt);
      // Evening comes on over the clock's last third, the lanterns lit at its start.
      const at = Math.round(dusk * 20) / 20;
      if (at !== duskAt) {
        duskAt = at;
        lighting.setGroup(dusk > 0 ? "basel-lanterns" : game.level.id);
        lighting.setAmbient(mixHex(BASEL_DAY, PALETTE.nightAmbient, at));
        cast.setAmbient(scene.ambient);
        props.setAmbient(scene.ambient);
        flyers.setAmbient(scene.ambient);
      }
      // Once the pipers follow him, their chanter plays while he walks; the drone holds while he stands.
      sound.lead(!cur.parade?.followers.length || Math.abs(h.vx) > LEAD_WALK);
    } else {
      duskAt = -1;
      sound.lead(true);
    }
    // The training room: the beam's floor and the screen under everyone, the drone and the IFU among them; the song's section by
    // the kid's round.
    trainingView.front.zIndex = y - 0.5;
    trainingView.setVisible(!!game.level.ifu);
    const kid = cur.boss?.kind === "replacement" ? cur.boss : null;
    if (game.level.ifu) {
      trainingView.reducedMotion = scene.reducedMotion;
      trainingView.sync(world.boss?.kind === "replacement" ? world.boss : null, world.ifu, simDt);
    }
    sound.section(game.level.ifu && kid ? kid.round - 1 : null);
    labView.container.zIndex = y - 0.45;
    labView.setVisible(!!game.level.codeBlue);
    if (game.level.codeBlue) {
      labView.sync(game.level, world.time, simDt);
      // Code blue: the lights pulse red at 2 Hz while he is in its stretch, except under reduced motion.
      const pulse = world.codeBlue > 1 && !scene.reducedMotion ? Math.round((0.5 + 0.5 * Math.sin(world.time * Math.PI * 4)) * 8) / 8 : 0;
      if (pulse !== pulseAt) {
        pulseAt = pulse;
        lighting.setAmbient(mixHex(ambientOf(game.level), CODE_BLUE, pulse * 0.6));
        cast.setAmbient(scene.ambient);
        props.setAmbient(scene.ambient);
        flyers.setAmbient(scene.ambient);
      }
    } else pulseAt = -1;
    hallFlat.setVisible(!!game.level.hall && !hallUp());
    if (game.level.hall) hallFlat.sync(cur.hallCarts, cur.hallDoors, h, cur.flight ? flatCabinOf(cur) : undefined);

    const fb = solved.faceBox;
    const face: Rect = { x: x + fb.x, y: drawY + fb.y, w: fb.w, h: fb.h };
    faceOnScreen = screenRect(face);
    // A fore piece fades while his head is behind it.
    views.get(game.level.id)?.backdrop.update(faceOnScreen, simDt, groundAt(game.level.floor, x));
    const at: Frame = {
      face,
      view: scene.view(),
      facing: h.facing,
      hand: { x: x + solved.joints.handFar.x, y: drawY + solved.joints.handFar.y },
      crown: { x: x + solved.crown.x, y: drawY + solved.crown.y },
    };
    for (const e of pending) show(e, at);
    pending.length = 0;
    // Out of the shuttle door: a Coke Zero in his free hand, nuts spilling from his pockets (R5 §8).
    Object.assign(walkOut, stepWalkOut(walkOut, simDt, !!m));
    const can = walkOut.can > 0 ? productTexture("can") : null;
    walkCan.visible = !!can;
    if (can) {
      walkCan.texture = can;
      walkCan.scale.set(WALK_CAN_H / can.height);
      walkCan.position.set(at.hand.x, at.hand.y);
      walkCan.zIndex = y + 0.1;
    }
    nutsT = walkOut.nuts > 0 ? nutsT + simDt : 0;
    if (nutsT >= 0.08) {
      nutsT = 0;
      const hip = { x: x + solved.joints.hipNear.x, y: drawY + solved.joints.hipNear.y };
      particles.emit("nuts", hip.x + h.facing * 10, hip.y, 2);
    }

    if (h.state !== lastState) {
      if (h.state === "land") particles.emit("dust", x, floorY, 10);
      lastState = h.state;
    }
    if (h.state === "run" && h.onGround) {
      dustT += simDt;
      if (dustT >= DUST_EVERY) {
        dustT = 0;
        particles.emit("dust", x - h.facing * 30, floorY, 2);
      }
    }
    // Heat shows as steam off the top and sweat flicked from behind the face (spec §9).
    steamT = h.heat >= STEAM_HEAT ? steamT + simDt : 0;
    if (steamT >= STEAM_EVERY) {
      steamT = 0;
      particles.emit("steam", at.crown.x, at.crown.y, 1);
    }
    sweatT = h.heat > SWEAT_HEAT && m?.kind !== "wipe" ? sweatT + simDt : 0;
    if (sweatT >= (h.heat >= STEAM_HEAT ? SWEAT_EVERY / 2 : SWEAT_EVERY)) {
      sweatT = 0;
      const back = h.facing === 1 ? face.x - 8 : face.x + face.w + 8;
      // Thrown up and back, away from his face; mirrored when he faces left.
      particles.emit("sweat", back, face.y + face.h * 0.25, 1, h.facing === -1);
    }
    // Tiring, he pants: puffs out in front of his mouth, quicker the hotter he is.
    pantT = h.heat >= PANT_HEAT && m?.kind !== "wipe" ? pantT + simDt : 0;
    if (pantT >= PANT_EVERY * (1.6 - h.heat / 100)) {
      pantT = 0;
      const front = h.facing === 1 ? face.x + face.w + 14 : face.x - 14;
      particles.emit("pant", front, face.y + face.h * 0.72, 2, h.facing === -1);
    }
    if (lineDue !== null && time >= lineDue) {
      lineDue = null;
      bubbles.say(TAUNT_LINES.fired.text, 1.8);
      sound.voice("fired");
    }
    // A flat-top steams under his shoes; the walk-in frosts round them.
    const heatAt = heatZoneAt(world.stage, h, world.time);
    zoneT = heatAt ? zoneT + simDt : 0;
    if (heatAt && zoneT >= (heatAt.kind === "flattop" ? 0.1 : 0.12)) {
      zoneT = 0;
      particles.emit(zoneParticle(heatAt.kind), x + (Math.random() - 0.5) * 80, floorY - 10, 1);
    }
    // The walk-in breathes cold out of its door while it is on screen.
    fogT += simDt;
    if (fogT >= 0.3) {
      fogT = 0;
      const v = scene.view();
      for (const z of game.level.heat ?? []) if (z.kind === "freezer" && z.x1 > v.x && z.x0 < v.x + v.w) particles.emit("frost", z.x0 + Math.random() * (z.x1 - z.x0), z.y - 40, 2);
    }
    drawSmear(m, base, x, drawY, h.facing, face);
    drawShield(x, drawY, y, simDt);

    if (game.level.id !== shown && !holding) showLevel(game.level, x, y);
    if (hallUp()) {
      if (!hallShown) showHall(true);
      // Under the hall the game's canvas draws only his profile: the flat venue and its people are the hall's now.
      for (const v of views.values()) {
        v.venue.setVisible(false);
        v.backdrop.setVisible(false);
      }
      cast.container.visible = props.container.visible = flyers.container.visible = false;
      bossView.container.visible = false;
      objects.setVisible(false);
    }
    if (game.pickups !== shownPickups) {
      // A respawn or a door laid the pickups out afresh.
      objects.clear();
      shownPickups = game.pickups;
      views.get(game.level.id)?.venue.setPunched(game.run.punched);
      snapCamera(x, y);
    }
    objects.canScale = game.level.canScale ?? 1;
    objects.sync(game.pickups, game.crates, simDt);
    objects.carry(
      world.cast.flatMap((n) => {
        const crown = n.alive && !n.out && n.carry ? cast.crownOf(n.id) : null;
        return crown && n.carry ? [{ id: n.id, kind: n.carry, x: crown.x, y: crown.y, facing: crown.facing }] : [];
      }),
    );
    // A door he can use glows: the stash's, the cart back, and the BUFFET until it is spent.
    const d = game.door;
    const usable = !!d && tierMet(d, game.run.keycards) && (d.kind === "stash" || d.kind === "return" || (d.kind === "exit" && !!d.down) || (d.kind === "quest" && !game.run.spent.includes(d.id)));
    views.get(game.level.id)?.venue.setDoorGlow(game.mode === "play" && usable ? d!.id : null);
    views.get(game.level.id)?.venue.setSpent(game.run.spent);
    views.get(game.level.id)?.venue.setKeycards(game.run.keycards);
    // The title tune on the home screen; the level's song (the stash has its own), quiet under its cards; a repeat changes nothing.
    const levelMusic = musicFor(game.mode, game.level.music, game.quest ? questMusic(game.quest).theme : null);
    sound.music(levelMusic.theme, levelMusic.quiet);
    afterFrame(simDt, hurryFor(game.mode, game.level.time, game.run.time, (world.flight?.sign ?? 0) > 0 || (game.run.stretch !== null && game.run.stretch <= STATION.doors) || world.codeBlue > 1));

    const cam = scene.camera;
    const home = game.mode === "title" ? game.level.home : undefined;
    if (home) titleCamera(home, y, dt);
    else if (!hallUp()) {
      // Out of the home screen: the level's own bounds, zoom and camera again, put on him at once.
      if (titleShown) showLevel(game.level, x, y);
      const zone = game.level.camera.zones.find((z) => x >= z.x0 && x <= z.x1);
      cam.zoom += ((zone?.zoom ?? 1) - cam.zoom) * Math.min(1, dt / ZOOM_EASE);
      // In the fight the camera holds both fighters (the shipped boss camera); no look-ahead pulls it off them.
      const pig = cur.pig;
      const fighting = !!pig && pig.state !== "asleep" && pig.state !== "defeated";
      cam.target = { x: fighting ? fightFrame(x, pig.x, scene.view().w * FRAME_REACH) : x, y };
      cam.facing = h.facing;
      // In a climb the camera looks at him, not ahead of him.
      cam.moving = !fighting && !zone?.follow && Math.abs(h.vx) > 40;
      cam.falling = h.vy > 900;
      cam.grounded = h.onGround;
    }
    titleShown = !!home;
    roomsCamera(x, dt);
    scene.update(dt);
    const hallBack = hallUp() ? hallFrame(alpha, simDt, dt) : undefined;
    // The home screen's scene drawn a couple of frames: the shell lets the key art go.
    titleFrames = home && views.has(game.level.id) && shown === game.level.id ? titleFrames + 1 : 0;
    if (titleFrames === 3) opts.onTitleScene?.();
    lighting.update(dt);
    views.get(game.level.id)?.venue.update(simDt);
    views.get(game.level.id)?.venue.setDoors(cur.doors);
    views.get(game.level.id)?.venue.setChained(game.level.doors.some((d) => d.locked) && (cur.boss ? cur.boss.state !== "down" : cur.pig?.state !== "defeated"));
    words.update(simDt, face, scene.view());
    // On the home screen the title stands behind him: his thoughts rise on his far side, over the scene, not under the words.
    const titled = game.mode === "title" && !!game.level.home;
    bubbles.update(simDt, { crown: at.crown, face, facing: titled ? (-h.facing as 1 | -1) : h.facing, view: titled ? titleView() : scene.view() });
    const hallCrown = (id: number) => {
      const at = hallUp() ? hallCrowns.get(id) : null;
      return at ? { ...at, facing: 1 as const } : null;
    };
    speech.update(simDt, (id) => hallCrown(id) ?? (id === PIG_ID ? pigView.crown() : id === BOSS_ID && bossView.crown ? { ...bossView.crown, facing: 1 as const } : cast.crownOf(id)), face, scene.view());
    particles.update(simDt, face);
    vignette.width = scene.width;
    vignette.height = scene.height;

    if (window.__next) {
      window.__next.run = runProbe();
      window.__next.starts = starts;
      window.__next.drawing = app.stage.visible;
      window.__next.hero = { state: h.state, x: h.x, y: h.y, vx: h.vx, onGround: h.onGround, crouch: h.crouch, flop: h.flop, boxes: h.boxes, stunT: h.stunT, clip: hallBack?.clip ?? clip, walkOut: { ...walkOut } };
      window.__next.movers = cur.movers.map((m) => ({ id: m.id, x: m.x, y: m.y, live: m.live !== false }));
      window.__next.level = { signs: game.level.signs.map((s) => ({ label: s.label })) };
      window.__next.flight = cur.flight ? { sign: cur.flight.sign, cartLive: cur.flight.cart.live, cartZ: cur.flight.cart.z, lane: cur.hero.lane } : undefined;
      window.__next.trainWindow = game.level.coaches
        ? () => {
            const half = (scene.width / scene.scale) * 0.45;
            const r = views.get(game.level.id)?.backdrop.countryside?.showing(scene.camera.x, half)[0];
            return r ? scene.toScreen({ x: r.x + r.w / 2, y: r.y + r.h / 2 }) : null;
          }
        : undefined;
      window.__next.boss = cur.boss && { kind: cur.boss.kind, state: cur.boss.state, hp: cur.boss.hp, max: cur.boss.max, x: cur.boss.x, y: cur.boss.y };
      window.__next.pig = cur.pig && { state: cur.pig.state, x: cur.pig.x, hp: cur.pig.hp, bonks: cur.pig.bonks, snots: cur.pig.snots, drawn: pigView.kind };
      window.__next.heroScreenHeight = HERO_HEIGHT * scene.scale;
      window.__next.carrying = objects.carrying;
      window.__next.goo = { globs: cast.globs + pigView.globCount, splats: props.splats };
      window.__next.drawn = { character: character.container.visible, cast: cast.container.visible, props: props.container.visible, flyers: flyers.container.visible };
      window.__next.heroScreenX = scene.toScreen({ x, y }).x;
      window.__next.heroScreenY = scene.toScreen({ x, y: drawY }).y;
      window.__next.headTintChain = character.headTintChain();
      window.__next.costume = character.costume;
      const badge = character.badge();
      window.__next.badgeScreen = badge && scene.toScreen({ x: character.container.x + badge.x, y: character.container.y + badge.y });
      window.__next.shake = scene.camera.trauma;
      window.__next.ambient = scene.ambient;
      window.__next.music = { lead: sound.leadLevel, section: sound.sectionNow };
      window.__next.voice = sound.lastVoice;
      const kidNow = world.boss?.kind === "replacement" ? world.boss : null;
      window.__next.training = game.level.ifu
        ? {
            frame: trainingView.frame,
            drone: kidNow?.drone?.state ?? null,
            ifu: world.ifu?.state ?? null,
            // On screen: the floor in the beam's middle, the floor well out of it, the middle of the big screen.
            beam: kidNow && beamOn(kidNow) ? scene.toScreen({ x: kidNow.beam.x, y: 12 }) : null,
            dark: kidNow ? scene.toScreen({ x: kidNow.beam.x + (kidNow.beam.x > 2600 ? -900 : 900), y: 12 }) : null,
            // Where the loop's demo unit sways in and out of frame to frame.
            screen: scene.toScreen({ x: 3200, y: -600 }),
          }
        : undefined;
      window.__next.errands = game.run.errands.length;
      window.__next.bands = cur.parade?.bands.map((b) => ({ id: b.id, x: b.x, state: b.state }));
      // His back has no face: only his profile does, while it shows.
      window.__next.faceScreen = hallBack ? null : faceOnScreen;
      window.__next.bubbleScreen = bubbles.box && screenRect(bubbles.box);
      window.__next.art = {
        heads: Object.keys(registry.hammer.heads).length,
        bodies: Object.keys(registry.hammer.bodies).length,
        products,
      };
      window.__next.moves = {
        move: m?.kind ?? null,
        u: m ? moveU(m) : 0,
        heat: h.heat,
        sinus: h.sinus,
        charge: h.charge,
        events: { ...counts },
        carts: cur.targets.map((c) => c.x),
        snot: cur.snot.length,
        puddles: cur.puddles.length,
        heroX: h.x,
        heroY: h.y,
        facing: h.facing,
        patience: h.patience,
        bored: h.bored,
        expression,
        bubble: bubbles.text,
        feetGap: planted.gap,
      };
      window.__next.sound = { unlocked: sound.unlocked, played: { ...sound.played }, volumes: sound.volumes };
      // The cast's painted figures alive: the pig's own figure, kept while the gift shop is loaded, and the banquet's diners are not.
      window.__next.castArt = { ...cast.artState(), live: PaintedFigure.live - (pigView.kind === "painted" ? 1 : 0) - banquet.paintedCount() - lounge.paintedCount() - gate.paintedCount(), tints: { cast: cast.container.tint, flyers: flyers.container.tint }, drawn: cast.drawn(), carts: props.drawnCarts() };
      window.__next.cast = {
        people: Object.fromEntries(cur.cast.filter((n) => n.alive).map((n) => [n.id, { person: n.person, recolor: n.recolor }])),
        targets: cur.targets.map((t) => ({ id: t.id, load: t.load })),
        acts: Object.fromEntries(cur.cast.filter((n) => n.alive).map((n) => [n.spawn, n.act])),
        positions: Object.fromEntries(cur.cast.filter((n) => n.alive).map((n) => [n.spawn, { x: n.x, y: n.y }])),
        attackers: attackers(world.cast),
        missiles: cur.missiles.length,
        planes: cur.missiles.map((mm) => ({ kind: mm.kind, x: mm.x, y: mm.y })),
        out: world.cast.filter((n) => n.out || !n.alive).length,
      };
    }
  };
  app.ticker.add(tick);
  if (opts.board) {
    // The boards move Hammer without stepping the sim; the next tick re-places him from the world.
    const placeHero = (x: number, at?: number) => {
      const y = at ?? floorAt(world.stage, x, -1) ?? 0;
      world.hero.x = x;
      world.hero.y = y;
      world.hero.vx = 0;
      cur = prev = world.snapshot();
      const p = plantFeet(CLIPS.idle(0, { t: 0, speed: 0, vy: 0, facing: 1 }), 1, HEAD_SCALE, headPlate, "planted", floorProbe(x, y));
      const solved = solve(p.pose, 1, HEAD_SCALE, headPlate);
      character.container.position.set(x, y + p.dy);
      character.apply(solved, "neutral", -p.dy, scene.ambient);
      // A board frame is one picture, not a walk: the painted walls stand on the ground under him at once.
      views.get(game.level.id)?.backdrop.update(null, 1, groundAt(game.level.floor, x));
      return y;
    };
    // The boards show the stash by swapping the visuals for one frame; the game stays where it is.
    // Another level's frame draws that level's crates in place of the live objects.
    let boardCrates: Container | null = null;
    const showForBoard = (id: LevelId) => {
      for (const [k, v] of views) {
        v.venue.setVisible(k === id);
        v.backdrop.setVisible(k === id);
      }
      lightLevel(LEVELS.get(id)!);
      scene.camera.bounds = LEVELS.get(id)!.bounds;
      boardCrates?.destroy({ children: true });
      boardCrates = null;
      objects.setVisible(id === game.level.id);
      if (id !== game.level.id) {
        boardCrates = new Container();
        for (const c of LEVELS.get(id)!.crates) {
          const g = drawCrate(new Graphics(), c.kind, false);
          g.position.set(c.x, c.y);
          boardCrates.addChild(g);
        }
        scene.layers.play.addChild(boardCrates);
      }
      // The level's Hammer in the level's costume: scrubs in the office's pictures.
      return wear(costumeOf(LEVELS.get(id)!));
    };
    /** The banquet at `q`, 1920 by 1080, as a PNG data URL: shown and framed for one picture, then put back as it was. */
    const shootBanquet = async (q: Hungry): Promise<string> => {
      await loadTableOf(q);
      const table = tableOf(q);
      const key = questIdOf(q);
      const cam = scene.camera;
      const saved = { w: scene.width, h: scene.height, x: cam.x, y: cam.y, zoom: cam.zoom, target: cam.target, bounds: cam.bounds, shake: { ...cam.shake }, stage: app.stage.visible };
      showQuestView(key);
      app.stage.visible = true;
      scene.width = 1920;
      scene.height = 1080;
      table.sync(q, 0, q.time);
      const f = banquetFrame(1920, 1080, { top: 0, bottom: 0 });
      Object.assign(cam, { x: f.x, y: f.y, zoom: f.zoom, shake: { x: 0, y: 0, rot: 0 } });
      scene.fit();
      const target = RenderTexture.create({ width: 1920, height: 1080, resolution: 1 });
      app.renderer.render({ container: app.stage, target });
      const out = await app.renderer.extract.base64({ target, format: "png" });
      target.destroy(true);
      scene.width = saved.w;
      scene.height = saved.h;
      Object.assign(cam, { x: saved.x, y: saved.y, zoom: saved.zoom, target: saved.target, bounds: saved.bounds, shake: saved.shake });
      app.stage.visible = saved.stage;
      if (questShown !== key) showQuestView(questShown);
      scene.fit();
      return out;
    };
    /** A practice round under the sharp player, run until `until` (or its end). */
    const roundUntil = (until: (q: Hungry) => boolean, menu: Menu = "banquet") => {
      const q = createHungry(11, { practice: true, menu });
      const player = sharpPlayer();
      while (!until(q) && !q.result) stepHungry(q, player(q), STEP);
      return q;
    };
    const banquetShots = {
      /** The round at a moment, the scene at 1920 by 1080: the opening dump, a dive out on the cloth, the cart's crash, the frenzy. */
      async moments(): Promise<string[]> {
        const out: string[] = [];
        for (const until of [
          (q: Hungry) => q.time >= 1.2,
          (q: Hungry) => q.time >= 12 && (q.hammer.dive?.ext ?? 0) > 300,
          (q: Hungry) => !!q.cart?.crashed && q.time >= HUNGRY.cart.at + 1.4,
          (q: Hungry) => q.time >= 55,
        ])
          out.push(await shootBanquet(roundUntil(until)));
        return out;
      },
      /** The start screen's picture: the round at the entrees. */
      thumb: () => shootBanquet(roundUntil((q) => q.time >= 26.5)),
      /** The M CLUB at a moment: its first spread, and Lifetime Titanium guy reaching Hammer's end. */
      lounge: async () => [await shootBanquet(roundUntil((q) => q.time >= 1.2, "lounge")), await shootBanquet(roundUntil((q) => q.time >= 26.5, "lounge"))],
      /** The brasserie's picture for the Side quests row, and the round at the desserts. */
      frenchThumb: () => shootBanquet(roundUntil((q) => q.time >= 26.5, "french")),
      french: async () => [await shootBanquet(roundUntil((q) => q.time >= 1.2, "french")), await shootBanquet(roundUntil((q) => q.time >= 40, "french"))],
      /** The M CLUB's picture for the Side quests row. */
      loungeThumb: () => shootBanquet(roundUntil((q) => q.time >= 26.5, "lounge")),
      /** The sixteen dishes and the three products as the table draws them, named: the food sheet's board. */
      async food(): Promise<string> {
        await loadBanquet();
        const board = new Container();
        const kinds = (Object.keys(FOODS) as FoodKind[]).filter((k) => onMenu(FOODS[k], "banquet"));
        const cell = 260;
        const rows = Math.ceil(kinds.length / 5);
        board.addChild(new Graphics().rect(0, 0, 5 * cell, rows * cell).fill("#20242b"));
        kinds.forEach((kind, i) => {
          const s = new Sprite(banquet.foodTexture(kind));
          s.anchor.set(0.5);
          s.scale.set(Math.min((cell * 0.8) / s.texture.width, (cell * 0.6) / s.texture.height));
          s.position.set((i % 5) * cell + cell / 2, Math.floor(i / 5) * cell + cell / 2 - 10);
          const name = label(FOODS[kind].name, "ui", 20);
          name.position.set((i % 5) * cell + 12, Math.floor(i / 5) * cell + cell - 34);
          board.addChild(s, name);
        });
        return snapshotOf(app, board, 5 * cell, rows * cell, 1);
      },
    };
    /** The gate at `q` as the round left it, 1920 by 1080, as a PNG data URL (R5): shown and framed for one picture, then put back. */
    const shootGate = async (q: Fares, steam = false): Promise<string> => {
      await loadGate();
      const cam = scene.camera;
      const saved = { w: scene.width, h: scene.height, x: cam.x, y: cam.y, zoom: cam.zoom, target: cam.target, bounds: cam.bounds, shake: { ...cam.shake }, stage: app.stage.visible };
      showQuestView("fares");
      app.stage.visible = true;
      scene.width = 1920;
      scene.height = 1080;
      const l = gateLayout(1920, 1080, { top: 0, bottom: 0 });
      gate.layout(l);
      gate.sync(q, 0, q.time);
      if (steam) {
        const c = gate.crown();
        for (let i = 0; i < 8; i++) {
          particles.emit("steam", c.x + (i % 3) * 14 - 14, c.y, 1);
          particles.update(0.05, gate.face());
        }
      }
      Object.assign(cam, { x: l.camera.x, y: l.camera.y, zoom: l.camera.zoom, shake: { x: 0, y: 0, rot: 0 } });
      scene.fit();
      const target = RenderTexture.create({ width: 1920, height: 1080, resolution: 1 });
      app.renderer.render({ container: app.stage, target });
      const out = await app.renderer.extract.base64({ target, format: "png" });
      target.destroy(true);
      scene.width = saved.w;
      scene.height = saved.h;
      Object.assign(cam, { x: saved.x, y: saved.y, zoom: saved.zoom, target: saved.target, bounds: saved.bounds, shake: saved.shake });
      app.stage.visible = saved.stage;
      if (questShown !== "fares") showQuestView(questShown);
      scene.fit();
      return out;
    };
    /** A practice round under `player`, its events fed to the gate as they come (the board's sticks, the crowd, his face), run until `until` or its end. */
    const gateUntil = async (player: FaresPlayer, until: (q: Fares) => boolean, seed = 7): Promise<Fares> => {
      await loadGate();
      gate.layout(gateLayout(1920, 1080, { top: 0, bottom: 0 }));
      const q = createFares(seed, { practice: true });
      let acc = 0;
      let n = 0;
      while (!q.result) {
        stepFares(q, player(q), STEP);
        acc += STEP;
        for (const e of q.events) {
          gate.event(e);
          if (e.type === "fdCrowd") for (const t of e.who) gate.react(t, e.kind);
          if (e.type === "fdMood") gate.mood(e.mood, e.seconds);
        }
        const done = until(q);
        if (done || ++n % 6 === 0) {
          gate.sync(q, acc, q.time);
          acc = 0;
        }
        if (done) break;
      }
      return q;
    };
    /** Since the last event of a kind, on the round's clock: for the boards' moments. */
    const since = (test: (e: Fares["events"][number]) => boolean) => {
      let at = -Infinity;
      return (q: Fares) => {
        if (q.events.some(test)) at = q.time;
        return q.time - at;
      };
    };
    const gateShots = {
      /** The round at four moments (R5 Task 10): the opening, a scalpel in flight, a streak with the crowd oohing, a miss with the steam. */
      async moments(): Promise<string[]> {
        const ooh = since((e) => e.type === "fdCrowd" && e.kind === "ooh");
        const missed = since((e) => e.type === "fdStick" && e.outcome !== "book");
        return [
          await shootGate(await gateUntil(sharpFares(), (q) => q.time >= 2.4)),
          await shootGate(await gateUntil(sharpFares(), (q) => q.thrown >= 2 && q.shot?.phase === "flight" && q.shot.t >= 0.09)),
          await shootGate(await gateUntil(sharpFares(), (q) => q.streak >= FARES.streak && ooh(q) >= 0.3 && ooh(q) < 0.5)),
          await shootGate(await gateUntil(masherPlayer, (q) => q.stuck >= 2 && missed(q) >= 0.35), true),
        ];
      },
      /** The start screen's picture: a streak, tags up, the next scalpel cocked. */
      thumb: async () => shootGate(await gateUntil(sharpFares(), (q) => q.streak >= FARES.streak && q.tags.length >= 3 && q.shot?.phase === "windup" && q.shot.t >= 0.12)),
    };
    window.__nextBoard = createBoards(render, scene, registry, particles, placeHero, (id) => showForBoard(id ?? game.level.id), () => game.level, banquetShots, gateShots);
  }
  if (opts.dev && window.__next)
    window.__next.dev = {
      teleport(x: number, y = 0) {
        const hero = world.hero;
        hero.x = x;
        hero.y = y;
        hero.vx = 0;
        hero.vy = 0;
        hero.onGround = false;
        prev = cur = world.snapshot();
        snapCamera(x, y);
      },
      hit() {
        world.hit(world.hero.x + world.hero.facing * PRACTICE_HIT);
      },
      /** An event as if the sim had sent it: its sound, its feel and its look (the voice check's taunts). */
      event(e: GameEvent) {
        feel(e);
      },
      charge() {
        world.hero.charge = CHARGE_MAX;
      },
      heat(n: number) {
        world.hero.heat = n;
      },
      heal() {
        world.hero.patience = PATIENCE_MAX;
      },
      /** His patience down to `n` pips, and a doggy bag or not: the save's check. */
      patience(n: number) {
        world.hero.patience = n;
      },
      doggy(n = 1) {
        world.hero.doggy = n;
      },
      /** Boxes of #15 blades in his pockets (R5), for the checks. */
      boxes(n = 3) {
        world.hero.boxes = n;
      },
      /** Staff bonked added to the run, as if knocked out for good: the lifetime count's check. */
      bonked(n: number) {
        game.run.bonked += n;
      },
      flop(on = true) {
        world.hero.flop = on;
      },
      slowmo(scale: number, seconds: number) {
        clock.scale = scale;
        clock.slowmo = seconds;
      },
      clearShelves() {
        for (const p of game.pickups) p.taken = true;
        for (const c of game.crates) c.used = true;
      },
      give(kind: PickupKind) {
        const h = world.hero;
        game.pickups.push({ id: 900000 + gifts++, kind, x: h.x, y: h.y - h.h / 2, taken: false });
      },
      dismiss(spawn: string) {
        for (const n of world.cast) if (n.spawn === spawn) n.alive = false;
      },
      pig(o: { hp?: number; bonks?: number; snots?: number; state?: "recover" | "defeated" }) {
        if (world.pig) Object.assign(world.pig, o, o.state === "recover" ? { timer: 30, vx: 0 } : {});
      },
      /** The checks' controller: its buttons and stick as the Gamepad API reports them, or null for the real one. */
      pad(o: { axes?: number[]; buttons?: { pressed: boolean }[] } | null) {
        devPad = o ? { connected: true, ...mapPad(o.buttons ?? [], o.axes ?? []) } : null;
      },
      /** The 3D view pushed: its frame's work held at a number (0 lets go), or its context lost. */
      three(o: { frameMs?: number; lose?: boolean }) {
        if (o.frameMs !== undefined) hallGov.forced = o.frameMs;
        if (o.lose) three?.lose();
      },
      /** The level's boss set as the checks want it: `state: "down"` beats it. */
      turbulence() {
        game.dev.turbulence();
      },
      stretch(seconds: number) {
        game.dev.stretch(seconds);
      },
      cart() {
        game.dev.cart();
      },
      boss(o: { hp?: number; state?: string; door?: number }) {
        if (world.boss?.kind === "titanium") setTitanium(world.boss, o, game.events);
        else if (world.boss?.kind === "conductor" && o.door !== undefined) game.dev.bossDoor(o.door);
        else if (world.boss) game.dev.boss(o);
      },
      /** 3-4's errand done at once, and a band started now, whoever is where. */
      errand(id: string) {
        game.dev.errand(id);
      },
      band(id: string) {
        game.dev.band(id);
      },
      /** The running round: its clock, dishes on a rival's plate, his line locked on a rival's plate, dishes landed on his. */
      quest(o: { time?: number; plate?: { who: RivalId; kinds: FoodKind[] }; aim?: RivalId; eat?: FoodKind[] }) {
        const q = game.quest;
        if (q?.id !== "hungry") return;
        if (o.time !== undefined) q.time = o.time;
        if (o.plate) q.rivals[o.plate.who].plate.push(...o.plate.kinds);
        if (o.aim) Object.assign(q.hammer, { aim: screenDeg(1, sub(SEATS[o.aim].plate, SEATS.hammer.plate)), lock: o.aim });
        for (const k of o.eat ?? []) land(q, "hammer", k);
      },
      /** Runs the round's clock out (the gate's: the rest of the tray as misses): its tally is next. */
      questSkip() {
        const q = game.quest;
        if (q?.id === "hungry" && !q.result) q.time = HUNGRY.round - STEP / 2;
        if (q?.id === "fares") skipFares(q);
      },
      /** The gate's round: the crosshair pinned on a city (null lets it sweep again), a tag put on a city, the hazards off. */
      fares(o: { pin?: CityCode | null; tag?: { city: CityCode; kind?: TagKind }; calm?: boolean }) {
        const q = game.quest;
        if (q?.id !== "fares") return;
        if (o.calm) q.hazards = false;
        if (o.tag) addTag(q, o.tag.city, o.tag.kind ?? "fare");
        if (o.pin !== undefined) q.pin = o.pin === null ? null : cityAt(o.pin);
      },
    };
  const look: Look = {
    stop() {
      stopped = true;
      freeThree();
      app.ticker.remove(tick);
      delete window.__nextBoard;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointermove", onLean);
      window.removeEventListener("pointerdown", onTap);
      sound.destroy();
      objects.destroy();
      cast.destroy();
      pigView.destroy();
      bossView.destroy();
      towerCarts.destroy();
      parisView.destroy();
      trainView.destroy();
      baselView.destroy();
      labView.destroy();
      trainingView.destroy();
      hallFlat.destroy();
      banquet.destroy();
      lounge.destroy();
      french.destroy();
      gate.destroy();
      app.canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointer);
      window.removeEventListener("pointercancel", onPointer);
      for (const v of views.values()) v.venue.destroy();
      if (window.__next) delete window.__next.dev;
      scene.destroy();
    },
    newRun() {
      forgetPresses();
      game.newRun(newSeed());
      prev = cur = world.snapshot();
      clearActors();
    },
    togglePause() {
      forgetPresses();
      pause();
    },
    fanfare() {
      sound.fanfare();
    },
    face() {
      return faceOnScreen;
    },
    press(action, isDown) {
      sound.unlock();
      if (isDown) {
        touchDown.add(action);
        touchTapped.add(action);
      } else touchDown.delete(action);
    },
    setMuted(on) {
      sound.setMuted(on);
      if (on) bubbles.cut();
    },
    setVolumes(music, effects) {
      sound.setVolumes(music, effects);
    },
    setMenu(open) {
      menu = open;
    },
    start(at) {
      starts++;
      forgetPresses();
      game.newRun(newSeed(), at);
      prev = cur = world.snapshot();
      clearActors();
    },
    setHome(id) {
      game.setHome(id);
      if (game.mode === "title" && game.level.id !== (id ?? "lobby")) look.toTitle();
    },
    toTitle() {
      forgetPresses();
      game.toTitle();
      prev = cur = world.snapshot();
      clearActors();
      titleSnap = true;
      for (const e of game.events) feel(e);
    },
    setQuality(q) {
      try {
        if (q) localStorage.setItem("hammer-time-quality", q);
        else localStorage.removeItem("hammer-time-quality");
      } catch {
        // Private windows refuse storage: the choice lasts the session.
      }
      if (q) render.setQuality(q);
      else render.auto();
    },
    newQuest(id) {
      forgetPresses();
      const which = id ?? (game.quest ? questIdOf(game.quest) : "hungry");
      if (which === "lounge") void loadLounge();
      if (which === "french") void loadFrench();
      game.newQuest(newSeed(), which);
      for (const e of game.events) feel(e);
    },
    finishQuest() {
      forgetPresses();
      // A key held through Continue is no new press on the step after it (R4 Review Focus 1).
      prevHeld = { ...prevHeld, ...heldNow() };
      game.finishQuest();
      prev = cur = world.snapshot();
      for (const e of game.events) feel(e);
    },
    startJourney(id, how, snapshot, hold) {
      const level = STOP_LEVELS.get(id);
      if (!level) return;
      starts++;
      forgetPresses();
      prevHeld = { ...prevHeld, ...heldNow() };
      const shift = how === "replay" ? [level] : shiftFrom(id, STOP_LEVELS);
      game.newRun(newSeed(), 0, { shift, journey: true, snapshot: how === "replay" ? null : snapshot, hold });
      clearActors();
      settled();
    },
    continueStory() {
      // A key held through a card's Continue is held, not pressed, on the next level's first step.
      forgetPresses();
      prevHeld = { ...prevHeld, ...heldNow() };
      game.continueStory();
      settled();
    },
    tryAgain() {
      forgetPresses();
      prevHeld = { ...prevHeld, ...heldNow() };
      if (game.journey && game.snapshot) game.newRun(newSeed(), game.venue, { snapshot: game.snapshot });
      else game.newRun(newSeed());
      clearActors();
      settled();
    },
  };
  return look;
}

/** The dev-only loader that forgets every plate but the neutral head and the Affliction body, and the cast's paintings. */
function stripped(registry: Registry): Registry {
  return {
    ...registry,
    hammer: {
      ...registry.hammer,
      heads: { neutral: registry.hammer.heads.neutral },
      bodies: { affliction: registry.hammer.bodies.affliction },
    },
    // The cast draws as the stand-ins.
    cast: { bodies: {}, hats: {} },
    walls: {},
    pieces: {},
  };
}

let vignetteTex: Texture | null = null;
/** Clear in the middle, 18 percent black at the corners. */
function vignetteTexture(): Texture {
  if (vignetteTex) return vignetteTex;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  vignetteTex = Texture.from(canvas);
  return vignetteTex;
}

/** A run's seed: a new layout every run. */
function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
