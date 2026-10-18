import { Application, RendererType, UPDATE_PRIORITY, type Ticker } from "pixi.js";
import type { GameEvent } from "../sim/events";
import type { FoodKind } from "../sim/quests/hungry/food";
import { refreshFrom, shouldStepDown } from "./quality";

export type Quality = "ultra" | "high" | "medium" | "low";
export type RenderApp = {
  app: Application;
  quality: Quality;
  rendererType: "webgpu" | "webgl";
  frameMs: number;
  fps: number;
  setQuality(q: Quality): void;
  /** Auto again after a fixed tier: back to the top, the governor settling and stepping down from there (R4 Task 1). */
  auto(): void;
  onQuality: (q: Quality) => void;
  destroy(): void;
};

const ORDER: Quality[] = ["ultra", "high", "medium", "low"];
const DPR: Record<Quality, number> = { ultra: 2, high: 2, medium: 1, low: 1 };

export type NextProbe = {
  renderer: string;
  quality: Quality;
  frameMs: number;
  fps: number;
  /** Distinct coarse colors in a 1/20-scale read of the stage: the "is anything drawn" probe. */
  sample: () => number;
  /** Runs begun from the start screen on this page: a start chosen while it loaded begins once. */
  starts?: number;
  /** The canvas draws: false while the start screen covers it. */
  drawing?: boolean;
  /** Hungry Hungry Hammer while it is up (R4): its clock, score and chomps, his dives this round, his line, and the table on screen in CSS px. */
  quest?: { time: number; score: number; eaten: number; dives: number; coiling: boolean; aim: number; lock: string | null; duck: boolean; stun: number; result: unknown; frame: { x: number; y: number; w: number; h: number } };
  /** Set by the look scene once it runs. */
  hero?: { state: string; x: number; y: number; vx: number; onGround: boolean; flop?: boolean; clip?: string };
  heroScreenHeight?: number;
  heroScreenX?: number;
  /** The product of every tint above the head sprite: 0xffffff when the plate reaches the screen as drawn. */
  headTintChain?: number;
  /** His face box on screen, CSS px: nothing in the shell may cover it. */
  faceScreen?: { x: number; y: number; w: number; h: number };
  /** `products`: how many of the three pickups have their real pictures. */
  art?: { heads: number; bodies: number; products?: number };
  /** The move layer, set by the look scene: `events` counts every event type seen since boot. */
  moves?: {
    move: string | null;
    u: number;
    heat: number;
    sinus: number;
    charge: number;
    events: Record<string, number>;
    carts: number[];
    snot: number;
    puddles: number;
    heroX: number;
    heroY: number;
    facing: 1 | -1;
    patience: number;
    bored: boolean;
    /** The head plate on screen. */
    expression: string;
    /** The thought or caption showing, if any. */
    bubble: string | null;
    /** How far (px) the legs left a placed foot from where the floor puts it. */
    feetGap: number;
  };
  /** Sound: whether a key has unlocked it, and every cue asked for since boot. */
  sound?: { unlocked: boolean; played: Record<string, number> };
  /** The run: its mode, level and numbers, and every event type counted since the page loaded. */
  run?: {
    mode: string;
    level: string;
    x: number;
    y: number;
    score: number;
    cans: number;
    lives: number;
    time: number;
    patience: number;
    hot: boolean;
    star: number;
    checkpoint: string | null;
    saved: boolean;
    /** The Buc-ee's shield is drawn this frame. */
    shield: boolean;
    /** Where he was drawn when the level he is in was put on screen: the camera snapped there. */
    shownX: number;
    events: Record<string, number>;
  };
  /** The cast: each live member's act by spawn id, how many hold attack tickets, the missiles in the air, how many are out. */
  /** Which cast paintings drew and which fell back to the stand-in. */
  castArt?: { painted: string[]; standIn: string[]; live: number; tints: { cast: number; flyers: number }; drawn: Record<number, { person: string; recolor: string | null }>; carts: { id: number; load: string }[] };
  cast?: { people: Record<number, { person: string; recolor: string | null }>; targets: { id: number; load: string }[]; acts: Record<string, string>; positions: Record<string, { x: number; y: number }>; attackers: number; missiles: number; planes: { kind: string; x: number; y: number }[]; out: number };
  /** The gift shop's pig: its state, where it is, its HP and counts, and whether it is drawn or painted. */
  pig?: { state: string; x: number; hp: number; bonks: number; snots: number; drawn: "drawn" | "painted" } | null;
  /** With `&dev=1`: move him anywhere and hit him, for the checks. */
  dev?: {
    teleport(x: number, y?: number): void;
    hit(): void;
    /** An event as if the sim had sent it (its sound, feel and look): the voice check's taunts. */
    event(e: GameEvent): void;
    charge(): void;
    give(kind: "can" | "nuts" | "bucees" | "pepper"): void;
    /** Takes everything in the level he is in, as if he had cleaned it out. */
    clearShelves(): void;
    /** Sets his heat. */
    heat(n: number): void;
    /** Restores his patience, so a check's later steps do not inherit the earlier ones' pips. */
    heal(): void;
    /** Sets his patience pips. */
    patience(n: number): void;
    /** Gives him doggy bags from the banquet (one by default). */
    doggy(n?: number): void;
    /** Gives him the banquet's belly-flop, or takes it away. */
    flop(on?: boolean): void;
    /** Slow motion at `scale` for `seconds` of wall time (0 ends it): frame-by-frame screenshots of a quick move. */
    slowmo(scale: number, seconds: number): void;
    /** Sends one of the cast off the level by spawn id, so a check can watch a hazard without them in the way. */
    dismiss(spawn: string): void;
    /** Sets the pig's HP, counts or state, for the checks. */
    pig(o: { hp?: number; bonks?: number; snots?: number; state?: "recover" | "defeated" }): void;
    /** The running round: its clock, dishes on a rival's plate, his line aimed at a rival's plate, dishes landed on his. */
    quest(o: { time?: number; plate?: { who: "student" | "bellhop" | "nurse"; kinds: FoodKind[] }; aim?: "student" | "bellhop" | "nurse"; eat?: FoodKind[] }): void;
    /** Runs the round's clock out: its tally is next. */
    questSkip(): void;
  };
};
declare global {
  interface Window {
    __next?: NextProbe;
  }
}

/** Boots Pixi on the host, watches frame time, and steps the quality down when it slips. */
export async function createRenderApp(
  host: HTMLElement,
  opts: { preference?: "webgpu" | "webgl" } = {},
): Promise<RenderApp> {
  const app = new Application();
  let quality: Quality = readForcedQuality() ?? "ultra";
  await app.init({
    preference: opts.preference ?? "webgpu",
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, DPR[quality]),
    resizeTo: host,
    background: "#0d1118",
    powerPreference: "high-performance",
  });
  host.appendChild(app.canvas);
  const rendererType = app.renderer.type === RendererType.WEBGPU ? "webgpu" : "webgl";
  const probe: NextProbe = {
    renderer: rendererType,
    quality,
    frameMs: 0,
    fps: 0,
    sample: () => {
      // Only the visible screen: the stage's own bounds span the whole level.
      const { pixels } = app.renderer.extract.pixels({ target: app.stage, frame: app.screen, resolution: 0.05 });
      const seen = new Set<number>();
      for (let i = 0; i < pixels.length; i += 4)
        seen.add((pixels[i] >> 4) * 4096 + (pixels[i + 1] >> 4) * 256 + (pixels[i + 2] >> 4));
      return seen.size;
    },
  };
  const out: RenderApp = {
    app,
    quality,
    rendererType,
    frameMs: 0,
    fps: 0,
    onQuality: () => {},
    setQuality(q) {
      quality = out.quality = q;
      app.renderer.resolution = Math.min(window.devicePixelRatio || 1, DPR[q]);
      app.renderer.resize(host.clientWidth, host.clientHeight);
      out.onQuality(q);
    },
    auto() {
      settle = 2;
      acc = work = n = 0;
      intervals.length = 0;
      out.setQuality("ultra");
    },
    destroy() {
      app.ticker.remove(begin);
      app.ticker.remove(end);
      app.destroy(true, { children: true, texture: true });
      delete window.__next;
    },
  };
  // Frame watch: each second, the work per frame and the frames dropped against the display's
  // own rate decide whether to step one tier down. Never up. Vsync alone never trips it.
  let acc = 0,
    work = 0,
    n = 0,
    settle = 2,
    frameStart = 0,
    refresh = Infinity;
  const intervals: number[] = [];
  const begin = () => {
    frameStart = performance.now();
  };
  const end = (t: Ticker) => {
    acc += t.deltaMS;
    work += performance.now() - frameStart;
    intervals.push(t.deltaMS);
    n++;
    if (acc < 1000) return;
    out.frameMs = acc / n;
    out.fps = Math.round(1000 / out.frameMs);
    refresh = Math.min(refresh, refreshFrom(intervals));
    if (settle > 0) settle--;
    else if (
      !readForcedQuality() &&
      shouldStepDown({ workMs: work / n, intervalMs: out.frameMs, refreshMs: refresh })
    ) {
      const i = ORDER.indexOf(quality);
      if (i < ORDER.length - 1) out.setQuality(ORDER[i + 1]);
    }
    probe.quality = out.quality;
    probe.frameMs = out.frameMs;
    probe.fps = out.fps;
    acc = 0;
    work = 0;
    n = 0;
    intervals.length = 0;
  };
  app.ticker.add(begin, undefined, UPDATE_PRIORITY.HIGH);
  // After the application's own render listener, which runs at LOW.
  app.ticker.add(end, undefined, UPDATE_PRIORITY.UTILITY);
  window.__next = probe;
  return out;
}

function readForcedQuality(): Quality | null {
  try {
    const q = localStorage.getItem("hammer-time-quality") as Quality | null;
    return q && ORDER.includes(q) ? q : null;
  } catch {
    return null;
  }
}
