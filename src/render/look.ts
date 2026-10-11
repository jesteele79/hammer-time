import { Graphics, Sprite, Texture, type Ticker } from "pixi.js";
import { loadRegistry, type Expression, type Registry } from "../art/registry";
import { applyFeel, createClock, tickClock } from "../sim/clock";
import { HEAD_SCALE, LAND_T, RUN, STEP } from "../sim/constants";
import type { GameEvent } from "../sim/events";
import { feelOf } from "../sim/feel";
import { sweptHeadHits } from "../sim/hits";
import { KEY_BINDINGS, emptyInput, inputFromKeys, type Action } from "../sim/input";
import { CHARGE_MAX, moveU, type Move, type MoveKind } from "../sim/moves";
import { floorAt } from "../sim/physics";
import { ACTIONS, ACTION_MASK, displayU, overlay } from "../sim/rig/actions";
import { CLIPS, type ClipCtx, type ClipName } from "../sim/rig/clips";
import { solve, type Solved } from "../sim/rig/fk";
import { groundModeFor, groundShift, type Ground } from "../sim/rig/ground";
import { blend, type Pose } from "../sim/rig/pose";
import { HERO_HEIGHT } from "../sim/rig/skeleton";
import { createCart } from "../sim/targets";
import type { HeroState, Point, Rect, Stage } from "../sim/types";
import { createWorld } from "../sim/world";
import type { RenderApp } from "./app";
import { loadBackdrop } from "./backdrop";
import { createBoards } from "./boards";
import { createCharacter } from "./character";
import { createLighting, type Light } from "./lighting";
import { Meters } from "./meters";
import { PALETTE } from "./palette";
import { Particles } from "./particles";
import { Props } from "./props";
import { createScene } from "./scene";
import { createSound } from "./sound";
import { installFonts, label } from "./text";
import { Words } from "./words";

/** The lobby's first stretch: the floor, two counters, a balcony and a service pass. */
export const LOBBY_STAGE: Stage = {
  floor: [{ x0: -1000, x1: 14000, y0: 0, y1: 0 }],
  platforms: [
    { x0: 1500, x1: 2000, y: -180 },
    { x0: 3200, x1: 3700, y: -180 },
    { x0: 4400, x1: 5600, y: -520 },
  ],
  solids: [],
  passes: [{ x: 2200, y: -1000, w: 500, h: 780 }],
  bounds: { x: -1000, y: -2200, w: 15000, h: 3000 },
};
const LOBBY_LIGHTS: Light[] = [800, 3400, 6000, 8600, 11200].map((x) => ({
  x,
  y: -560,
  radius: 560,
  color: PALETTE.lampGlow,
  intensity: 0.55,
  flicker: 0.04,
}));
/** World px one walk or run cycle covers, so the feet don't skate. */
const STRIDE = 280;
const BLEND_T = 0.1;
const DUST_EVERY = 0.12;
/** A move's clip blends in over this and back out over the next (spec §6.3). */
const ACTION_IN = 0.06;
const ACTION_OUT = 0.12;
const SMUG_T = 0.6;
/** The look test's practice convenience: the smash refills this long after a burst. */
const REFILL_T = 2;
const STEAM_EVERY = 0.08;
const SWEAT_EVERY = 0.25;
const STEAM_HEAT = 80;
const SWEAT_HEAT = 45;
/** The towel is out of the pocket between these fractions of the wipe. */
const TOWEL_U = [0.04, 0.95] as const;
/** The mallet's smear: the strike's display fractions it shows in, its trail, and its clearance from the face. */
const SMEAR = { from: 0.36, to: 0.5, points: 6, trail: 0.06, width: 26, clear: 40 } as const;

export type Look = { stop(): void };

/** Where things are this frame, in world px, for the effects. */
type Frame = { face: Rect; view: Rect; facing: 1 | -1; hand: Point; crown: Point };

/** The look test: Hammer in the lobby under the keyboard with the practice carts and the meters. */
export async function startLook(render: RenderApp, opts: { noart?: boolean; board?: boolean } = {}): Promise<Look> {
  const { app } = render;
  const scene = createScene(render);
  const world = createWorld(
    LOBBY_STAGE,
    { x: 400, y: 0 },
    { charge: CHARGE_MAX, targets: [createCart(1, 1100), createCart(2, 3000)] },
  );
  const clock = createClock();
  scene.camera.bounds = LOBBY_STAGE.bounds;
  scene.camera.x = 400;
  scene.camera.focusY = scene.camera.y = -HERO_HEIGHT * 0.55;

  await installFonts();
  let registry = await loadRegistry();
  if (opts.noart) registry = stripped(registry);
  await loadBackdrop(scene, "lobby", LOBBY_STAGE, registry);
  const lighting = createLighting(scene, render.quality, LOBBY_LIGHTS);
  render.onQuality = (q) => lighting.setQuality(q);
  const reduced = scene.reducedMotion;
  const particles = new Particles(scene.layers.fx, reduced ? 400 : 600, reduced);
  const words = new Words(scene.layers.fx);
  const smear = new Graphics();
  if (!reduced) smear.blendMode = "add";
  scene.layers.fx.addChild(smear);
  const props = new Props(scene.layers.play, particles, scene.ambient);
  const character = createCharacter(registry, opts.noart ? "scrubs" : "affliction", { noart: opts.noart });
  scene.layers.play.addChild(character.container);
  await character.ready;
  const headPlate = registry.hammer.heads.neutral!;

  const vignette = new Sprite(vignetteTexture());
  vignette.alpha = 1;
  const title = label("LOOK TEST · /?next=1", "display", 30);
  title.position.set(24, 14);
  title.alpha = 0.8;
  scene.layers.post.addChild(vignette, title);
  const meters = new Meters(scene.layers.post);
  const sound = createSound();

  const down = new Set<string>();
  // A tap shorter than a frame still counts for the frame's steps.
  const tapped = new Set<string>();
  const onKey = (e: KeyboardEvent) => {
    if (e.code in KEY_BINDINGS) e.preventDefault();
    if (e.type === "keydown") {
      // Browsers only let sound start from a key or a tap.
      sound.unlock();
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
  let acc = 0;
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
  let action: Pose | null = null;
  let actionKind: MoveKind | null = null;
  let actionW = 0;
  let moveT = -1;
  let smugT = 0;
  let refillT = 0;
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
    // Lean into the motion on top of the clip's own lean.
    pose.lean += (6 * h.vx * h.facing) / RUN;
    if (fromPose && blendT < 1) {
      blendT = Math.min(1, blendT + dt / BLEND_T);
      pose = blend(fromPose, pose, blendT);
    }
    lastPose = pose;
    return pose;
  };

  /** The move's clip over the locomotion: in over 0.06 s, its last frame held while it blends out over 0.12 s. */
  const play = (m: Move | null, dt: number) => {
    if (m) {
      if (m.kind !== actionKind || m.t < moveT || moveT < 0) {
        actionKind = m.kind;
        actionW = 0;
      }
      moveT = m.t;
      actionW = Math.min(1, actionW + dt / ACTION_IN);
      action = ACTIONS[m.kind](displayU(m.kind, moveU(m)));
    } else {
      moveT = -1;
      actionW = Math.max(0, actionW - dt / ACTION_OUT);
      if (actionW === 0) {
        action = null;
        actionKind = null;
      }
    }
  };

  /** The super stands on the floor only once it lands; the towel always does; the rest leave it to the clip. */
  const groundMode = (h: HeroState): Ground => {
    if (actionKind === "super") return h.onGround ? "planted" : "none";
    if (actionKind === "wipe") return "planted";
    return groundModeFor(clip, h.onGround);
  };

  const supportY = (x: number, y: number) => {
    let best = floorAt(LOBBY_STAGE, x, y - 1) ?? y;
    for (const p of LOBBY_STAGE.platforms) if (x >= p.x0 && x <= p.x1 && p.y >= y - 1 && p.y < best) best = p.y;
    return best;
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
        refillT = REFILL_T;
        break;
      case "fire":
        particles.emit("snot", e.x, e.y, 8);
        words.say(e.hot ? "HOT HONK!" : "HONK!", e.x + facing * 60, e.y - 60, false, face, view);
        break;
      case "splat":
        particles.emit("splat", e.x, e.y, 14);
        break;
      // The spray flies off the towel behind his head: the recipe throws left, so mirror it facing left.
      case "stroke":
        particles.emit("spray", at.hand.x, at.hand.y, 6, facing === -1);
        break;
      case "flick":
        particles.emit("spray", at.hand.x, at.hand.y, 20, facing === -1);
        break;
      case "shine":
        particles.emit("glint", at.crown.x, at.crown.y, 6);
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
    if (m?.kind !== "swing" || actionKind !== "swing") return;
    const u = displayU("swing", moveU(m));
    if (u < SMEAR.from || u > SMEAR.to) return;
    const near: Rect = { x: face.x - SMEAR.clear, y: face.y - SMEAR.clear, w: face.w + 2 * SMEAR.clear, h: face.h + 2 * SMEAR.clear };
    const pts: Point[] = [];
    for (let k = SMEAR.points - 1; k >= 0; k--) {
      const uk = Math.max(SMEAR.from, u - (SMEAR.trail * k) / (SMEAR.points - 1));
      const j = solve(overlay(base, ACTIONS.swing(uk), "upper", actionW), facing, HEAD_SCALE, headPlate).joints.malletHead;
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

  const tick = (t: Ticker) => {
    const dt = Math.min(t.deltaMS / 1000, 0.1);
    // Hit-stop and slow motion: the sim and everything it drives run on these seconds.
    const simDt = tickClock(clock, dt);
    time += simDt;
    acc += simDt;
    let steps = 0;
    const keys = tapped.size ? new Set([...down, ...tapped]) : down;
    while (acc >= STEP && steps < 5) {
      const input = inputFromKeys(keys, prevHeld);
      prevHeld = input.held;
      prev = cur;
      world.step(input);
      cur = world.snapshot();
      acc -= STEP;
      steps++;
      for (const e of world.events) feel(e);
      // A hit freezes the world on the step it lands.
      if (clock.hitstop > 0) break;
    }
    if (steps > 0) tapped.clear();
    if (steps === 5) acc = 0;
    const alpha = Math.min(1, acc / STEP);
    const h = cur.hero;
    const x = prev.hero.x + (h.x - prev.hero.x) * alpha;
    const y = prev.hero.y + (h.y - prev.hero.y) * alpha;

    const base = animate(h, simDt);
    const m = h.move;
    play(m, simDt);
    const pose = action && actionKind ? overlay(base, action, ACTION_MASK[actionKind], actionW) : base;
    // Solved facing left, the plates' own facing; the character mirrors itself for the right.
    const solved: Solved = solve(pose, h.facing, HEAD_SCALE, headPlate);
    const floorY = supportY(x, y);
    smugT = Math.max(0, smugT - simDt);
    const expression: Expression =
      m?.kind === "super"
        ? "angry"
        : smugT > 0
          ? "smug"
          : !m && h.state === "idle" && h.stateT > 4
            ? "bored"
            : "neutral";
    const drawY = y + groundShift(solved, groundMode(h));
    const towel = m?.kind === "wipe" && moveU(m) > TOWEL_U[0] && moveU(m) < TOWEL_U[1];
    character.container.position.set(x, drawY);
    character.container.zIndex = y;
    character.apply(solved, expression, floorY - drawY, scene.ambient, towel);
    // The carts, the snot and the puddles sort just behind him: none of them ever covers his face.
    props.container.zIndex = y - 0.5;
    props.sync(cur, simDt);

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
      particles.emit("sweat", back, face.y + face.h * 0.25, 1);
    }
    if (refillT > 0) {
      refillT -= simDt;
      if (refillT <= 0) world.hero.charge = CHARGE_MAX;
    }
    drawSmear(m, base, x, drawY, h.facing, face);

    const cam = scene.camera;
    cam.target = { x, y };
    cam.facing = h.facing;
    cam.moving = Math.abs(h.vx) > 40;
    cam.falling = h.vy > 900;
    scene.update(dt);
    lighting.update(dt);
    words.update(simDt, face, scene.view());
    particles.update(simDt, face);
    meters.set(h.heat, h.sinus, h.charge);
    vignette.width = scene.width;
    vignette.height = scene.height;

    if (window.__next) {
      window.__next.hero = { state: h.state, x: h.x, y: h.y, vx: h.vx, onGround: h.onGround };
      window.__next.heroScreenHeight = HERO_HEIGHT * scene.scale;
      window.__next.heroScreenX = scene.toScreen({ x, y }).x;
      window.__next.headTintChain = character.headTintChain();
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
      };
      window.__next.sound = { unlocked: sound.unlocked, played: { ...sound.played } };
    }
  };
  app.ticker.add(tick);
  if (opts.board) {
    // The boards move Hammer without stepping the sim; the next tick re-places him from the world.
    const placeHero = (x: number) => {
      world.hero.x = x;
      world.hero.vx = 0;
      cur = prev = world.snapshot();
      const solved = solve(CLIPS.idle(0, { t: 0, speed: 0, vy: 0, facing: 1 }), 1, HEAD_SCALE, headPlate);
      const dy = groundShift(solved, "planted");
      character.container.position.set(x, dy);
      character.apply(solved, "neutral", -dy, scene.ambient);
    };
    window.__nextBoard = createBoards(render, scene, registry, particles, placeHero);
  }
  return {
    stop() {
      app.ticker.remove(tick);
      delete window.__nextBoard;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      sound.destroy();
      scene.destroy();
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
