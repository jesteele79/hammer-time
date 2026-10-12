import { Container, Graphics, Sprite, Texture, type Ticker } from "pixi.js";
import { ART_BASE, loadRegistry, type Expression, type Registry } from "../art/registry";
import { ASIDES, DAMAGE_LINE, LECTURES } from "../game/lines";
import { applyFeel, createClock, runFrame } from "../sim/clock";
import { HEAD_SCALE, LAND_T, STEP } from "../sim/constants";
import type { GameEvent } from "../sim/events";
import { feelOf } from "../sim/feel";
import { sweptHeadHits } from "../sim/hits";
import { KEY_BINDINGS, emptyInput, inputFromKeys, type Action } from "../sim/input";
import { createGame, type GameMode } from "../sim/game";
import { moveU, type Move } from "../sim/moves";
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
import type { Level } from "../sim/level";
import { LOBBY } from "../sim/levels/lobby";
import { STASH } from "../sim/levels/stash";
import { RUN } from "../sim/run";
import type { HeroState, Point, Rect } from "../sim/types";
import type { RenderApp } from "./app";
import { loadBackdrop, type Backdrop } from "./backdrop";
import { createBoards } from "./boards";
import { Bubbles } from "./bubbles";
import { createCharacter } from "./character";
import { createLighting, type Light } from "./lighting";
import { drawCrate, Objects } from "./objects";
import { PALETTE } from "./palette";
import { Particles } from "./particles";
import { Props } from "./props";
import { createScene } from "./scene";
import { createSound } from "./sound";
import { TOWEL_OUT } from "./towel";
import { hudKey, hudOf, type HudPayload } from "./hud";
import { installFonts } from "./text";
import { drawVenue, type VenueView } from "./venue";
import { Words } from "./words";

const LEVELS = { lobby: LOBBY, stash: STASH } as const;
const lightsOf = (level: Level): Light[] => level.lights.map((l) => ({ ...l, color: PALETTE.lampGlow, flicker: 0.04, group: level.id }));
/** Seconds the camera takes to settle into a zone's zoom. */
const ZOOM_EASE = 0.5;
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
  opts: { noart?: boolean; board?: boolean; dev?: boolean; onHud?: (hud: HudPayload) => void; onMode?: (mode: GameMode) => void } = {},
): Promise<Look> {
  const { app } = render;
  const scene = createScene(render);
  const game = createGame(LEVELS, newSeed());
  const world = game.world;
  const clock = createClock();
  scene.camera.bounds = LOBBY.bounds;
  scene.camera.x = LOBBY.spawn.x;
  scene.camera.focusY = scene.camera.y = -HERO_HEIGHT * 0.55;

  await installFonts();
  let registry = await loadRegistry();
  if (opts.noart) registry = stripped(registry);
  const backdrops: Record<Level["id"], Backdrop> = {
    lobby: await loadBackdrop(scene, "lobby", LOBBY.length, registry),
    stash: await loadBackdrop(scene, "stash", STASH.length, registry),
  };
  const venues: Record<Level["id"], VenueView> = { lobby: drawVenue(scene, LOBBY), stash: drawVenue(scene, STASH) };
  const reduced = scene.reducedMotion;
  const particles = new Particles(scene.layers.fx, reduced ? 400 : 600, reduced);
  const words = new Words(scene.layers.fx);
  const smear = new Graphics();
  if (!reduced) smear.blendMode = "add";
  scene.layers.fx.addChild(smear);
  const objects = new Objects(scene.layers.play, particles);
  // The lamps light the play layer's children as they are now, so everything it holds comes first.
  const lighting = createLighting(scene, render.quality, [...lightsOf(LOBBY), ...lightsOf(STASH)]);
  render.onQuality = (q) => lighting.setQuality(q);
  const props = new Props(scene.layers.play, particles, scene.ambient);
  const character = createCharacter(registry, opts.noart ? "scrubs" : "affliction", { noart: opts.noart });
  scene.layers.play.addChild(character.container);
  await character.ready;
  const headPlate = registry.hammer.heads.neutral!;

  const vignette = new Sprite(vignetteTexture());
  vignette.alpha = 1;
  scene.layers.post.addChild(vignette);
  const portrait = registry.hammer.portrait ? ART_BASE + registry.hammer.portrait.file : null;
  let hudLast = "";
  const sound = createSound();
  const layers = createLayers();
  const bubbles = new Bubbles(scene.layers.fx);
  let lectures = 0;
  /** This frame's events, for the procedural layers. */
  const stepped: GameEvent[] = [];

  const down = new Set<string>();
  // A tap shorter than a frame still counts for the frame's steps.
  const tapped = new Set<string>();
  const onKey = (e: KeyboardEvent) => {
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
        game.togglePause();
      }
      down.add(e.code);
      tapped.add(e.code);
    } else down.delete(e.code);
  };
  const onBlur = () => {
    down.clear();
    tapped.clear();
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
  let steamT = 0;
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
    sound.play(e);
    const f = feelOf(e);
    if (f) {
      applyFeel(clock, f);
      scene.camera.trauma = Math.min(1, scene.camera.trauma + f.trauma);
      if (f.zoom) scene.punch(f.zoom.amount, f.zoom.seconds);
    }
    pending.push(e);
    stepped.push(e);
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
        if (e.kind === "nuts") words.say("NUTS!", e.x, e.y - 80, false, face, view);
        if (e.kind === "bucees") words.say("BUC-EE'S!", e.x, e.y - 100, true, face, view);
        if (e.kind === "pepper") words.say("HOT!", e.x, e.y - 100, true, face, view);
        break;
      case "canPop":
        particles.emit("fizz", e.x, e.y, 10);
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
        venues.lobby.punch(e.id);
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

  /** Puts the camera on him at once: after a door, a respawn or a teleport. */
  function snapCamera(x: number, y: number) {
    scene.camera.x = x;
    // His chest at the screen's centre, as at the start; the dead zone takes over from there.
    scene.camera.focusY = scene.camera.y = y - HERO_HEIGHT * 0.55;
  }

  /** The level he is in now: its venue, backdrop, lamps, bounds and camera. */
  function showLevel(level: Level, x: number, y: number) {
    shown = level.id;
    for (const k of ["lobby", "stash"] as const) {
      venues[k].setVisible(k === level.id);
      backdrops[k].setVisible(k === level.id);
    }
    lighting.setGroup(level.id);
    scene.camera.bounds = level.bounds;
    objects.clear();
    shownPickups = game.pickups;
    if (level.id === "lobby") venues.lobby.setPunched(game.run.punched);
    snapCamera(x, y);
  }

  const tick = (t: Ticker) => {
    // A break stops everything that runs on game time; the camera and the screen still draw.
    const dt = game.mode === "pause" ? 0 : Math.min(t.deltaMS / 1000, 0.1);
    const keys = tapped.size ? new Set([...down, ...tapped]) : down;
    // Hit-stop and slow motion: the sim and everything it drives run on the clock's seconds,
    // and a hit freezes the world on the step it lands.
    const { simDt, steps } = runFrame(clock, frame, dt, () => {
      const input = inputFromKeys(keys, prevHeld);
      prevHeld = input.held;
      prev = cur;
      game.step(input);
      cur = world.snapshot();
      for (const e of game.events) feel(e);
      // A door or a respawn moves him: no sliding across the gap between frames.
      if (game.events.some((e) => e.type === "respawn" || e.type === "door")) prev = cur;
    });
    time += simDt;
    if (steps > 0) tapped.clear();
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
    character.apply(solved, expression, floorY - drawY, scene.ambient, towel, watchUp);
    // The carts, the snot and the puddles sort just behind him: none of them ever covers his face.
    props.container.zIndex = y - 0.5;
    props.sync(prev, cur, alpha, simDt);

    const fb = solved.faceBox;
    const face: Rect = { x: x + fb.x, y: drawY + fb.y, w: fb.w, h: fb.h };
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
    if (sweatT >= SWEAT_EVERY) {
      sweatT = 0;
      const back = h.facing === 1 ? face.x - 8 : face.x + face.w + 8;
      // Thrown up and back, away from his face; mirrored when he faces left.
      particles.emit("sweat", back, face.y + face.h * 0.25, 1, h.facing === -1);
    }
    drawSmear(m, base, x, drawY, h.facing, face);

    if (game.level.id !== shown) showLevel(game.level, x, y);
    if (game.pickups !== shownPickups) {
      // A respawn or a door laid the pickups out afresh.
      objects.clear();
      shownPickups = game.pickups;
      if (game.level.id === "lobby") venues.lobby.setPunched(game.run.punched);
      snapCamera(x, y);
    }
    objects.sync(game.pickups, game.crates, simDt);
    const door = game.door && (game.door.kind === "stash" || game.door.kind === "return") ? game.door.id : null;
    venues[game.level.id].setDoorGlow(door);
    if (game.mode !== lastMode) {
      lastMode = game.mode;
      sound.music(game.mode === "play" ? game.level.music : null);
      opts.onMode?.(game.mode);
    }
    sound.setHurry(game.level.time > 0 && game.run.time < RUN.hurry);
    sound.tick();
    savedT = Math.max(0, savedT - simDt);

    const cam = scene.camera;
    const zone = game.level.camera.zones.find((z) => x >= z.x0 && x <= z.x1);
    cam.zoom += ((zone?.zoom ?? 1) - cam.zoom) * Math.min(1, dt / ZOOM_EASE);
    cam.target = { x, y };
    cam.facing = h.facing;
    cam.moving = Math.abs(h.vx) > 40;
    cam.falling = h.vy > 900;
    scene.update(dt);
    lighting.update(dt);
    venues[game.level.id].update(simDt);
    words.update(simDt, face, scene.view());
    bubbles.update(simDt, { crown: at.crown, face, facing: h.facing, view: scene.view() });
    particles.update(simDt, face);
    const hud = hudOf(game, portrait, savedT > 0);
    const key = hudKey(hud);
    if (key !== hudLast) {
      hudLast = key;
      opts.onHud?.(hud);
    }
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
        events: { ...counts },
      };
      window.__next.hero = { state: h.state, x: h.x, y: h.y, vx: h.vx, onGround: h.onGround };
      window.__next.heroScreenHeight = HERO_HEIGHT * scene.scale;
      window.__next.heroScreenX = scene.toScreen({ x, y }).x;
      window.__next.headTintChain = character.headTintChain();
      const tl = scene.toScreen({ x: face.x, y: face.y });
      const br = scene.toScreen({ x: face.x + face.w, y: face.y + face.h });
      window.__next.faceScreen = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
      window.__next.art = {
        heads: Object.keys(registry.hammer.heads).length,
        bodies: Object.keys(registry.hammer.bodies).length,
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
        patience: h.patience,
        bored: h.bored,
        expression,
        bubble: bubbles.text,
        feetGap: planted.gap,
      };
      window.__next.sound = { unlocked: sound.unlocked, played: { ...sound.played } };
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
      return y;
    };
    // The boards show the stash by swapping the visuals for one frame; the game stays where it is.
    // Another level's frame draws that level's crates in place of the live objects.
    let boardCrates: Container | null = null;
    const showForBoard = (id: Level["id"]) => {
      for (const k of ["lobby", "stash"] as const) {
        venues[k].setVisible(k === id);
        backdrops[k].setVisible(k === id);
      }
      lighting.setGroup(id);
      scene.camera.bounds = LEVELS[id].bounds;
      boardCrates?.destroy({ children: true });
      boardCrates = null;
      objects.setVisible(id === game.level.id);
      if (id !== game.level.id) {
        boardCrates = new Container();
        for (const c of LEVELS[id].crates) {
          const g = drawCrate(new Graphics(), c.kind, false);
          g.position.set(c.x, c.y);
          boardCrates.addChild(g);
        }
        scene.layers.play.addChild(boardCrates);
      }
    };
    window.__nextBoard = createBoards(render, scene, registry, particles, placeHero, (id) => showForBoard(id ?? game.level.id));
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
    };
  return {
    stop() {
      app.ticker.remove(tick);
      delete window.__nextBoard;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      sound.destroy();
      objects.destroy();
      venues.lobby.destroy();
      venues.stash.destroy();
      if (window.__next) delete window.__next.dev;
      scene.destroy();
    },
    newRun() {
      game.newRun(newSeed());
      prev = cur = world.snapshot();
    },
    togglePause() {
      game.togglePause();
    },
  };
}

/** The dev-only loader that forgets every plate but the neutral head and the Affliction body. */
function stripped(registry: Registry): Registry {
  return {
    ...registry,
    hammer: {
      ...registry.hammer,
      heads: { neutral: registry.hammer.heads.neutral },
      bodies: { affliction: registry.hammer.bodies.affliction },
    },
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
