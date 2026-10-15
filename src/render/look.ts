import { Container, Graphics, RenderTexture, Sprite, Texture, type Ticker } from "pixi.js";
import { ART_BASE, loadRegistry, type Expression, type Registry } from "../art/registry";
import { ASIDES, DAMAGE_LINE, LECTURES, STAFF_COMEBACKS, TAUNT_LINES } from "../game/lines";
import type { TauntTarget } from "../game/taunts";
import { applyFeel, createClock, runFrame } from "../sim/clock";
import { HEAD_SCALE, LAND_T, STEP } from "../sim/constants";
import { PATIENCE_MAX } from "../sim/damage";
import type { GameEvent } from "../sim/events";
import { feelOf } from "../sim/feel";
import { sweptHeadHits } from "../sim/hits";
import { KEY_BINDINGS, emptyInput, inputFrom, type Action } from "../sim/input";
import { createGame, type GameMode } from "../sim/game";
import { CHARGE_MAX, moveU, type Move } from "../sim/moves";
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
import type { Level, LevelId } from "../sim/level";
import { LOBBY } from "../sim/levels/lobby";
import { STASH } from "../sim/levels/stash";
import { RESTAURANT } from "../sim/levels/restaurant";
import { CAMPUS } from "../sim/levels/campus";
import { GIFTSHOP } from "../sim/levels/giftshop";
import { PIG_ID } from "../sim/pig";
import { heatZoneAt } from "../sim/hazards";
import { RUN } from "../sim/run";
import type { HeroState, Point, Rect } from "../sim/types";
import type { Quality, RenderApp } from "./app";
import { groundAt, loadBackdrop, type Backdrop } from "./backdrop";
import { createBoards, snapshotOf } from "./boards";
import { Bubbles, Speech } from "./bubbles";
import { createCharacter } from "./character";
import { createLighting, multiplyTint, type Light } from "./lighting";
import { drawCrate, loadProducts, Objects } from "./objects";
import { PALETTE } from "./palette";
import { Particles } from "./particles";
import { HATTED, type CastRole } from "../sim/cast";
import { Cast } from "./cast";
import { Flyers } from "./cast-fx";
import { fightFrame } from "./frame";
import { PIG_HEIGHT, PigView } from "./pig";
import { PaintedFigure } from "./cast-body";
import { attackers } from "../sim/cast-behavior";
import { Props } from "./props";
import { createScene } from "./scene";
import { createSound, heard } from "./sound";
import { TOWEL_OUT } from "./towel";
import { hudKey, hudOf, pickupNote, type HudPayload } from "./hud";
import type { PickupKind } from "../sim/rewards";
import { installFonts, label } from "./text";
import { drawVenue, type VenueView } from "./venue";
import { Words } from "./words";
import { BanquetView } from "./quests/hungry-scene";
import { DINER_ID } from "./quests/diner";
import { banquetFrame } from "./quests/frame";
import { HUNGRY, createHungry, land, stepHungry, type Hungry } from "../sim/quests/hungry/hungry";
import { sharpPlayer } from "../sim/quests/hungry/drive";
import { FOODS, type FoodKind } from "../sim/quests/hungry/food";
import { SEATS, TABLE, onScreen, screenDeg, sub, type RivalId } from "../sim/quests/hungry/table";

/** The shift's venues in order (R3 §2): the lobby, the restaurant, the campus and the gift shop. */
const SHIFT: Level[] = [LOBBY, RESTAURANT, CAMPUS, GIFTSHOP];
const LEVELS = new Map<LevelId, Level>([...SHIFT, STASH].map((l) => [l.id, l]));
const lightsOf = (level: Level): Light[] => level.lights.map((l) => ({ ...l, color: PALETTE.lampGlow, flicker: 0.04, group: level.id }));
/** The ballroom's chandelier over the banquet table (R4 §2). */
const BANQUET_LIGHT: Light = { x: 0, y: -560, radius: 1100, intensity: 0.55, color: PALETTE.lampGlow, flicker: 0.02, group: "banquet" };
/** How long a pickup's line stays in the hint. */
const NOTE_T = 2;
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
const SWEAT_EVERY = 0.25;
const STEAM_HEAT = 80;
const SWEAT_HEAT = 45;
/** Past this heat he pants, and past STEAM_HEAT he sweats twice as fast: he is tiring (owner, 2026-10-12). */
const PANT_HEAT = 60;
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
/** The mallet's smear: the strike's display fractions it shows in, its trail, and its clearance from the face. */
const SMEAR = { from: 0.36, to: 0.5, points: 6, trail: 0.06, width: 26, clear: 40 } as const;

export type Look = {
  stop(): void;
  /** A fresh run from the start card. */
  newRun(): void;
  togglePause(): void;
  /** A touch button went down or came up. */
  press(action: Action, down: boolean): void;
  /** His face on the screen, in CSS px, as last drawn: the cards keep clear of it. */
  face(): Rect | null;
  setMuted(on: boolean): void;
  /** A shift from the start screen, at the shift's venue `at` (the gift shop is pig practice). */
  start(at: number): void;
  /** Back to the start screen. */
  toTitle(): void;
  /** The start screen's quality choice: a tier kept on this device, or null to let the game choose (and step down). */
  setQuality(q: Quality | null): void;
  /** Hungry Hungry Hammer as practice: from the start screen's card, or Play again on its tally (R4 §8). */
  newQuest(): void;
  /** Continue on the BUFFET door's tally: back in the lobby with what he ate (R4 §7). */
  finishQuest(): void;
};

/** Where things are this frame, in world px, for the effects. */
type Frame = { face: Rect; view: Rect; facing: 1 | -1; hand: Point; crown: Point };

/**
 * The lobby, played: the Game under the keyboard, Hammer drawn as R1 built him, the venue, its
 * pickups and crates. The shell draws the HUD from `onHud` and its cards from `onMode`. With `dev`,
 * G is a practice hit and `window.__next.dev` can teleport him, for the checks.
 */
export async function startLook(
  render: RenderApp,
  opts: { noart?: boolean; board?: boolean; dev?: boolean; nocast?: boolean; start?: LevelId; title?: boolean; onHud?: (hud: HudPayload) => void; onMode?: (mode: GameMode) => void } = {},
): Promise<Look> {
  const { app } = render;
  const scene = createScene(render);
  const game = createGame({ lobby: SHIFT[0], stash: STASH, venues: SHIFT.slice(1) }, newSeed(), {
    cast: !opts.nocast,
    title: !!opts.title,
    start: Math.max(0, SHIFT.findIndex((l) => l.id === opts.start)),
  });
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
  const particles = new Particles(scene.layers.fx, reduced ? 400 : 600, reduced);
  const words = new Words(scene.layers.fx);
  const smear = new Graphics();
  if (!reduced) smear.blendMode = "add";
  scene.layers.fx.addChild(smear);
  const objects = new Objects(scene.layers.play, particles);
  // The Buc-ee's shield: a gold glow drawn behind him, so nothing of it is ever over his face.
  const shieldGlow = new Graphics();
  if (!reduced) shieldGlow.blendMode = "add";
  scene.layers.play.addChild(shieldGlow);
  // The lamps light the play layer's children as they are now; a venue built later takes the same tint in `prepare`.
  const lighting = createLighting(scene, render.quality, [...[...SHIFT, STASH].flatMap((l) => lightsOf(l)), BANQUET_LIGHT]);
  const props = new Props(scene.layers.play, particles, scene.ambient);
  const cast = new Cast(scene.layers.play, scene.ambient, registry);
  cast.setQuality(render.quality);
  render.onQuality = (q) => {
    lighting.setQuality(q);
    cast.setQuality(q);
  };
  const flyers = new Flyers(scene.layers.play, particles, scene.ambient);
  const pigView = new PigView(scene.layers.play, particles);
  const character = createCharacter(registry, opts.noart ? "scrubs" : "affliction", { noart: opts.noart });
  scene.layers.play.addChild(character.container);
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
        const venue = drawVenue(scene, level);
        venue.root.tint = multiplyTint(venue.root.tint, scene.ambient);
        venue.setVisible(false);
        backdrop.setVisible(false);
        if (!opts.nocast) await cast.preload((level.cast ?? []).map((s) => s.person));
        // The pig's painting loads with its venue; the drawn pig stands in if it fails.
        if (level.boss && !opts.noart && !stopped) await pigView.load(registry);
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
  // The banquet behind the BUFFET door and the Side quests card: loaded once the lobby is in (R4). Whatever of it fails to
  // load draws its stand-in; its card holds only while it loads.
  const banquet = new BanquetView(render, scene, registry, !!opts.noart);
  let banquetLoaded = false;
  const banquetReady = banquet
    .load()
    .catch((err) => console.warn("banquet:", err))
    .then(() => {
      banquetLoaded = true;
    });
  // The rest of the shift loads one venue after another while he plays.
  void SHIFT.reduce((p, l) => p.then(() => (stopped ? undefined : prepare(l))), Promise.resolve());
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
    for (const e of game.events) feel(e);
  };
  const onKey = (e: KeyboardEvent) => {
    // On the start screen the keys are the page's: Space and Enter press its buttons, the arrows move through its list.
    if (game.mode === "title") return;
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
      // On the banquet's tally Enter or Space is its button: Continue on a door's, Play again on practice's. The key goes
      // in as held, not pressed, so the step after it sees no new press (R4 Review Focus 1).
      if (game.mode === "questTally" && !e.repeat && (e.code === "Enter" || e.code === "Space")) {
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
  const onBlur = () => {
    down.clear();
    tapped.clear();
    touchDown.clear();
    touchTapped.clear();
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
  const frame = { acc: 0 };
  let prev = world.snapshot();
  let cur = prev;
  let clip: ClipName = "idle";
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
    const want = h.state as ClipName;
    if (want !== clip) {
      fromPose = lastPose;
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
    groundForAction(playback.kind, clip, h.onGround, h.move?.kind === playback.kind && h.move ? moveU(h.move) : 1);

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
    if (heard(e, scene.view())) sound.play(e);
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
    const lines = STAFF_COMEBACKS[role === "bellhop" ? "hotel" : role === "student" ? "office" : role];
    bubbles.think(lines[Math.floor(Math.random() * lines.length)].text, 1.6);
  };

  const show = (e: GameEvent, at: Frame) => {
    const { face, view, facing } = at;
    switch (e.type) {
      case "hit":
        if (e.by === "mallet") {
          particles.emit("impact", e.x, e.y, 18);
          particles.emit("debris", e.x, e.y, 10);
          words.say("BONK!", e.x, e.y - 70, false, face, view);
          smugT = SMUG_T;
        } else if (e.by === "snot") words.say("SPLAT!", e.x, e.y - 50, false, face, view);
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
        particles.emit("splat", e.x, e.y, 14);
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
      case "pickup":
        objects.pop(e.kind, e.x, e.y);
        note = pickupNote(e.kind, world.hero);
        noteT = NOTE_T;
        if (e.kind === "nuts")
          words.say(world.hero.charge >= CHARGE_MAX ? "SMASH READY!" : "NUTS!", e.x, e.y - 80, world.hero.charge >= CHARGE_MAX, face, view);
        if (e.kind === "bucees") words.say("SHIELD!", e.x, e.y - 100, true, face, view);
        if (e.kind === "pepper") words.say("HOT!", e.x, e.y - 100, true, face, view);
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
      case "castLine":
        speech.say(e.id, e.text, e.seconds);
        break;
      case "castWindup":
        words.say("!", e.x, e.y - 60, true, face, view);
        break;
      case "castBump":
        particles.emit("dust", e.x, e.y + 300, 4);
        break;
      case "stomp":
        particles.emit("dust", e.x, e.y, 8);
        if (e.landed) words.say("STOMP!", e.x, e.y - 60, false, face, view);
        break;
      case "castHit": {
        if (e.by === "stomp" || e.by === "puddle") words.say(e.by === "puddle" ? "WHOA!" : "OOF!", e.x, e.y - 90, false, face, view);
        else if (e.by !== "mallet" && e.by !== "snot") words.say("WHAM!", e.x, e.y - 90, false, face, view);
        const n = world.cast.find((c) => c.id === e.id);
        if (n && !n.hat && n.hits === 1 && HATTED.has(n.job)) flyers.hat(e.x, e.y - 150, e.dir, cast.hat(n.person), n.job);
        if (e.job === "busser" && n?.hits === 1) flyers.towel(e.x, e.y - 60, e.dir);
        if (e.job === "server" && e.down) {
          flyers.glasses(e.x + e.dir * 20, e.y - 60, e.dir);
          particles.emit("water", e.x, e.y - 60, 12);
        }
        if (e.job === "lunch" && e.down) flyers.food(e.x + e.dir * 20, e.y - 60, e.dir);
        if (e.job === "office" && e.down) flyers.cup(e.x, e.y - 40, e.dir);
        if (e.job === "cook" && e.down) flyers.pan(e.x, e.y - 40, e.dir);
        if (e.job === "prof" && e.down) {
          flyers.book(e.x, e.y - 60, e.dir);
          flyers.papers(e.x, e.y - 80, e.dir);
        }
        if (e.role !== "student" && e.down) comeback(e.role);
        break;
      }
      case "castFreeze":
        words.say("+50", e.x, e.y - 40, false, face, view);
        break;
      case "castSchooled":
        words.say("SCHOOLED", e.x, e.y - 40, false, face, view);
        break;
      case "lectureLand":
        words.say(e.schooled ? "SCHOOLED!" : "LISTEN UP!", e.x + facing * 120, e.y - 20, false, face, view);
        taunt(e.schooled ? "student" : "staff");
        break;
      case "castFlee":
        taunt("student");
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
        if (e.kind === "plane") {
          words.say("SWAT!", e.x, e.y - 50, false, face, view);
          taunt("student");
        }
        break;
      case "missileHit":
        if (e.kind !== "plane") particles.emit("coffee", e.x, e.y, 12);
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
        // The sound bus rolls the shipped 45 percent for the pig (TAUNT_CHANCE) and keeps its gap between recordings.
        taunt("pig");
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
    // His chest at the screen's centre, as at the start; the dead zone takes over from there.
    scene.camera.focusY = scene.camera.y = y - HERO_HEIGHT * 0.55;
  }

  /** The level he is in now: its venue, backdrop, lamps, bounds and camera. */
  function showLevel(level: Level, x: number, y: number) {
    shown = level.id;
    shownX = x;
    for (const [id, v] of views) {
      v.venue.setVisible(id === level.id);
      v.backdrop.setVisible(id === level.id);
    }
    lighting.setGroup(level.id);
    scene.camera.bounds = level.bounds;
    objects.clear();
    shownPickups = game.pickups;
    views.get(level.id)?.venue.setPunched(game.run.punched);
    snapCamera(x, y);
    // The zoom lands with him: no easing across a door.
    const zone = level.camera.zones.find((z) => x >= z.x0 && x <= z.x1);
    scene.camera.zoom = zone?.zoom ?? 1;
  }

  /** A world rect on the screen, CSS px. */
  const screenRect = (r: Rect): Rect => {
    const tl = scene.toScreen({ x: r.x, y: r.y });
    const br = scene.toScreen({ x: r.x + r.w, y: r.y + r.h });
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
  };

  /** The tail of every frame, the shift's and the banquet's: the mode's notice, the hurry, the notes' clocks and the HUD. */
  const afterFrame = (simDt: number, hurry: boolean) => {
    if (game.mode !== lastMode) {
      lastMode = game.mode;
      opts.onMode?.(game.mode);
    }
    sound.setHurry(hurry);
    sound.tick();
    savedT = Math.max(0, savedT - simDt);
    noteT = Math.max(0, noteT - simDt);
    const hud = hudOf(game, portrait, savedT > 0, noteT > 0 ? note : null);
    const key = hudKey(hud);
    if (key !== hudLast) {
      hudLast = key;
      opts.onHud?.(hud);
    }
  };

  /** The banquet is up: its card, its round, its tally, or a break in its round. */
  const inBanquet = () => !!game.quest && (game.mode === "questCard" || game.mode === "quest" || game.mode === "questTally" || game.mode === "pause");
  let banqueting = false;
  let shownQuest: Hungry | null = null;
  let questDives = 0;

  /** The banquet's view in place of the shift's, or back: the shift's venue, people and props hidden while it shows. */
  const showBanquetView = (on: boolean) => {
    for (const [id, v] of views) {
      v.venue.setVisible(!on && id === shown);
      v.backdrop.setVisible(!on && id === shown);
    }
    if (!on && shown) lighting.setGroup(shown);
    character.container.visible = cast.container.visible = props.container.visible = flyers.container.visible = pigView.container.visible = !on;
    objects.setVisible(!on);
    banquet.setVisible(on);
    if (on) {
      shieldGlow.clear();
      smear.clear();
      lighting.setGroup("banquet");
      scene.camera.bounds = null;
      scene.camera.target = null;
    }
  };
  const enterBanquet = () => {
    speech.clear();
    bubbles.clear();
    showBanquetView(true);
    banqueting = true;
  };
  /** Out of the banquet: the shift's level shown again where he stands. */
  const leaveBanquet = (x: number, y: number) => {
    speech.clear();
    bubbles.clear();
    showBanquetView(false);
    showLevel(game.level, x, y);
    banqueting = false;
  };

  /** The CSS px the HUD's top bar and the touch pad or the hint take off the screen: the banquet is framed between them. */
  const insets = () => {
    const bar = document.querySelector(".next-hud__bar-top")?.getBoundingClientRect();
    const pad = document.querySelector(".next-touch")?.getBoundingClientRect();
    const hint = document.querySelector(".next-hud__hint")?.getBoundingClientRect();
    return { top: bar ? bar.bottom + 8 : 64, bottom: pad ? scene.height - pad.top + 8 : hint ? scene.height - hint.top + 8 : 44 };
  };

  /** The banquet's events as words, bubbles, speech and particles, every word through the face-safe layout. */
  const showBanquet = (e: GameEvent, q: Hungry) => {
    const face = banquet.face();
    const view = scene.view();
    const crown = banquet.crown();
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
        if (e.who === "hammer" && e.kind === "check") words.say("-400", crown.x + 160, crown.y, true, face, view);
        else if (e.who === "hammer" && (q.score.chain === HUNGRY.combo.double || q.score.chain === HUNGRY.combo.triple))
          words.say(q.score.chain === HUNGRY.combo.triple ? "COMBO x3!" : "COMBO x2!", crown.x + 220, crown.y - 40, true, face, view);
        break;
      case "hhRob": {
        const p = onScreen(e);
        words.say("YOINK!", p.x, p.y - 120, true, face, view);
        banquet.smug();
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
        words.say("SLAP!", p.x, p.y - 100, true, face, view);
        banquet.hurt();
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
          banquet.hurt();
        }
        break;
      case "hhCart": {
        const p = onScreen(e);
        particles.emit("glass", p.x, p.y, 18);
        words.say("CRASH!", p.x, p.y - 200, true, face, view);
        break;
      }
      case "hhTray": {
        const p = onScreen(e);
        words.say("BONK!", p.x, p.y - 200, true, face, view);
        break;
      }
      default:
        break;
    }
  };

  /** A frame of the banquet: the round drawn, framed between the bars, its words and the HUD. */
  const banquetTick = (dt: number, simDt: number) => {
    if (!banqueting) enterBanquet();
    const q = game.quest!;
    // His dives this round, for the checks: a new round counts from nothing.
    if (q !== shownQuest) {
      shownQuest = q;
      questDives = 0;
    }
    questDives += pending.filter((e) => e.type === "hhDive" && e.who === "hammer").length;
    stepped.length = 0;
    banquet.sync(q, simDt, time);
    for (const e of pending) showBanquet(e, q);
    pending.length = 0;
    const f = banquetFrame(scene.width, scene.height, insets());
    Object.assign(scene.camera, { x: f.x, y: f.y, zoom: f.zoom });
    scene.update(dt);
    lighting.update(dt);
    const face = banquet.face();
    faceOnScreen = screenRect(face);
    const view = scene.view();
    words.update(simDt, face, view);
    bubbles.update(simDt, { crown: banquet.crown(), face, facing: 1, view });
    speech.update(simDt, (id) => banquet.crownOf(id), face, view);
    particles.update(simDt, face);
    // The lobby's music plays on through the round (R4 §1, decision 10).
    sound.music(game.mode === "quest" ? game.level.music : null);
    afterFrame(simDt, false);
    vignette.width = scene.width;
    vignette.height = scene.height;
    if (window.__next) {
      // The shift's numbers stay as he left them; the mode and the event counts move on.
      if (window.__next.run) Object.assign(window.__next.run, { mode: game.mode, events: { ...counts } });
      window.__next.starts = starts;
      window.__next.drawing = app.stage.visible;
      window.__next.faceScreen = faceOnScreen;
      window.__next.sound = { unlocked: sound.unlocked, played: { ...sound.played } };
      window.__next.quest = {
        time: q.time,
        score: Math.max(0, Math.round(q.score.plate + q.score.bonus)),
        eaten: q.score.eaten,
        dives: questDives,
        coiling: q.hammer.dive?.phase === "coil",
        aim: q.hammer.aim,
        duck: q.hammer.duck,
        stun: q.hammer.stun,
        result: q.result,
        frame: screenRect({ x: -TABLE.r, y: -TABLE.r * TABLE.squash, w: 2 * TABLE.r, h: 2 * TABLE.r * TABLE.squash }),
      };
    }
  };

  /** Just the actions the keys and the pad hold this instant: what Continue must not see pressed on the step after it. */
  const heldNow = () => inputFrom(down, touchDown, prevHeld).held;

  const tick = (t: Ticker) => {
    // Under the opaque start screen nothing needs drawing: the canvas rests until a start is chosen.
    app.stage.visible = game.mode !== "title";
    // A venue still loading holds the game where it is, its card up; so does the banquet's card while the banquet loads.
    const holding = !views.has(game.level.id) || (inBanquet() && !banquetLoaded);
    if (holding) void prepare(game.level);
    // A break stops everything that runs on game time; the camera and the screen still draw.
    const dt = game.mode === "pause" || holding ? 0 : Math.min(t.deltaMS / 1000, 0.1);
    const keys = tapped.size ? new Set([...down, ...tapped]) : down;
    // Hit-stop and slow motion: the sim and everything it drives run on the clock's seconds,
    // and a hit freezes the world on the step it lands.
    const { simDt, steps } = runFrame(clock, frame, dt, () => {
      const input = inputFrom(keys, touchTapped.size ? new Set([...touchDown, ...touchTapped]) : touchDown, prevHeld);
      prevHeld = input.held;
      prev = cur;
      game.step(input);
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
    if (banqueting) leaveBanquet(world.hero.x, world.hero.y);
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
      m?.kind === "tumble" || h.hurtT > 0
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
    const heatAt = heatZoneAt(world.stage, h);
    zoneT = heatAt ? zoneT + simDt : 0;
    if (heatAt && zoneT >= (heatAt.kind === "flattop" ? 0.1 : 0.12)) {
      zoneT = 0;
      particles.emit(heatAt.kind === "flattop" ? "steam" : "frost", x + (Math.random() - 0.5) * 80, floorY - 10, 1);
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
    if (game.pickups !== shownPickups) {
      // A respawn or a door laid the pickups out afresh.
      objects.clear();
      shownPickups = game.pickups;
      views.get(game.level.id)?.venue.setPunched(game.run.punched);
      snapCamera(x, y);
    }
    objects.sync(game.pickups, game.crates, simDt);
    // A door he can use glows: the stash's, the cart back, and the BUFFET until it is spent.
    const d = game.door;
    const usable = !!d && (d.kind === "stash" || d.kind === "return" || (d.kind === "quest" && !game.run.spent.includes(d.id)));
    views.get(game.level.id)?.venue.setDoorGlow(game.mode === "play" && usable ? d!.id : null);
    views.get(game.level.id)?.venue.setSpent(game.run.spent);
    // The level's theme while he plays (the stash has its own), silence otherwise; a repeat changes nothing.
    sound.music(game.mode === "play" ? game.level.music : null);
    afterFrame(simDt, game.level.time > 0 && game.run.time < RUN.hurry);

    const cam = scene.camera;
    const zone = game.level.camera.zones.find((z) => x >= z.x0 && x <= z.x1);
    cam.zoom += ((zone?.zoom ?? 1) - cam.zoom) * Math.min(1, dt / ZOOM_EASE);
    // In the fight the camera holds both fighters (the shipped boss camera); no look-ahead pulls it off them.
    const pig = cur.pig;
    const fighting = !!pig && pig.state !== "asleep" && pig.state !== "defeated";
    cam.target = { x: fighting ? fightFrame(x, pig.x, scene.view().w * FRAME_REACH) : x, y };
    cam.facing = h.facing;
    cam.moving = !fighting && Math.abs(h.vx) > 40;
    cam.falling = h.vy > 900;
    scene.update(dt);
    lighting.update(dt);
    views.get(game.level.id)?.venue.update(simDt);
    views.get(game.level.id)?.venue.setDoors(cur.doors);
    views.get(game.level.id)?.venue.setChained(game.level.doors.some((d) => d.locked) && cur.pig?.state !== "defeated");
    words.update(simDt, face, scene.view());
    bubbles.update(simDt, { crown: at.crown, face, facing: h.facing, view: scene.view() });
    speech.update(simDt, (id) => (id === PIG_ID ? pigView.crown() : cast.crownOf(id)), face, scene.view());
    particles.update(simDt, face);
    vignette.width = scene.width;
    vignette.height = scene.height;

    if (window.__next) {
      window.__next.run = {
        mode: game.mode,
        level: game.level.id,
        x: h.x,
        y: h.y,
        score: game.run.score,
        cans: game.run.cans,
        lives: game.run.lives,
        time: game.run.time,
        patience: h.patience,
        hot: h.hot,
        star: game.run.star,
        checkpoint: game.run.checkpoint,
        saved: savedT > 0,
        shield: shieldShown,
        shownX,
        events: { ...counts },
      };
      window.__next.starts = starts;
      window.__next.drawing = app.stage.visible;
      window.__next.hero = { state: h.state, x: h.x, y: h.y, vx: h.vx, onGround: h.onGround };
      window.__next.pig = cur.pig && { state: cur.pig.state, x: cur.pig.x, hp: cur.pig.hp, bonks: cur.pig.bonks, snots: cur.pig.snots, drawn: pigView.kind };
      window.__next.heroScreenHeight = HERO_HEIGHT * scene.scale;
      window.__next.heroScreenX = scene.toScreen({ x, y }).x;
      window.__next.headTintChain = character.headTintChain();
      window.__next.faceScreen = faceOnScreen;
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
      window.__next.sound = { unlocked: sound.unlocked, played: { ...sound.played } };
      // The cast's painted figures alive: the pig's own figure, kept while the gift shop is loaded, and the banquet's diners are not.
      window.__next.castArt = { ...cast.artState(), live: PaintedFigure.live - (pigView.kind === "painted" ? 1 : 0) - banquet.paintedCount(), tints: { cast: cast.container.tint, flyers: flyers.container.tint }, drawn: cast.drawn(), carts: props.drawnCarts() };
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
      lighting.setGroup(id);
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
    };
    /** The banquet at `q`, 1920 by 1080, as a PNG data URL: shown and framed for one picture, then put back as it was. */
    const shootBanquet = async (q: Hungry): Promise<string> => {
      await banquetReady;
      const cam = scene.camera;
      const saved = { w: scene.width, h: scene.height, x: cam.x, y: cam.y, zoom: cam.zoom, target: cam.target, bounds: cam.bounds, shake: { ...cam.shake }, stage: app.stage.visible };
      showBanquetView(true);
      app.stage.visible = true;
      scene.width = 1920;
      scene.height = 1080;
      banquet.sync(q, 0, q.time);
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
      if (!banqueting) showBanquetView(false);
      scene.fit();
      return out;
    };
    /** A practice round under the sharp player, run until `until` (or its end). */
    const roundUntil = (until: (q: Hungry) => boolean) => {
      const q = createHungry(11, { practice: true });
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
      /** The sixteen dishes and the three products as the table draws them, named: the food sheet's board. */
      async food(): Promise<string> {
        await banquetReady;
        const board = new Container();
        const kinds = Object.keys(FOODS) as FoodKind[];
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
    window.__nextBoard = createBoards(render, scene, registry, particles, placeHero, (id) => showForBoard(id ?? game.level.id), () => game.level, banquetShots);
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
      charge() {
        world.hero.charge = CHARGE_MAX;
      },
      heat(n: number) {
        world.hero.heat = n;
      },
      heal() {
        world.hero.patience = PATIENCE_MAX;
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
      /** The running round: its clock, dishes on a rival's plate, his line on a rival's plate, dishes landed on his. */
      quest(o: { time?: number; plate?: { who: RivalId; kinds: FoodKind[] }; aim?: RivalId; eat?: FoodKind[] }) {
        const q = game.quest;
        if (!q) return;
        if (o.time !== undefined) q.time = o.time;
        if (o.plate) q.rivals[o.plate.who].plate.push(...o.plate.kinds);
        if (o.aim) q.hammer.aim = screenDeg(1, sub(SEATS[o.aim].plate, SEATS.hammer.plate));
        for (const k of o.eat ?? []) land(q, "hammer", k);
      },
      /** Runs the round's clock out: its tally is next. */
      questSkip() {
        if (game.quest && !game.quest.result) game.quest.time = HUNGRY.round - STEP / 2;
      },
    };
  const look: Look = {
    stop() {
      stopped = true;
      app.ticker.remove(tick);
      delete window.__nextBoard;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      sound.destroy();
      objects.destroy();
      cast.destroy();
      pigView.destroy();
      banquet.destroy();
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
    },
    start(at) {
      starts++;
      forgetPresses();
      game.newRun(newSeed(), at);
      prev = cur = world.snapshot();
      clearActors();
    },
    toTitle() {
      forgetPresses();
      game.toTitle();
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
    newQuest() {
      forgetPresses();
      game.newQuest(newSeed());
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
