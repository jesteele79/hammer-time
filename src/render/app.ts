import { Application, Rectangle, RendererType, UPDATE_PRIORITY, type Ticker } from "pixi.js";
import type { GameEvent } from "../sim/events";
import type { FoodKind } from "../sim/quests/hungry/food";
import type { CityCode, TagKind } from "../sim/quests/fares/board";

type ProbeRect = { x: number; y: number; w: number; h: number };
import { TIERS, firstTier, gpuClassOf, refreshFrom, shouldStepDown } from "./quality";

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
const DPR: Record<Quality, number> = { ultra: TIERS.ultra.dpr, high: TIERS.high.dpr, medium: TIERS.medium.dpr, low: TIERS.low.dpr };

export type NextProbe = {
  renderer: string;
  quality: Quality;
  /** The video card's name as the browser reports it (WebGPU's adapter info, or WebGL's renderer string). */
  gpu?: string;
  /** Whether that card counts as a desktop card, the one class Auto may put on ultra. */
  gpuClass?: "desktop" | "other";
  frameMs: number;
  fps: number;
  /** Distinct coarse colors in a 1/20-scale read of the stage: the "is anything drawn" probe. */
  sample: () => number;
  /** The color drawn at a screen point (CSS px), as [r, g, b]: what shows under the floor, for the checks. */
  pixel?: (x: number, y: number) => [number, number, number];
  /** Runs begun from the start screen on this page: a start chosen while it loaded begins once. */
  starts?: number;
  /** The canvas draws: false while the start screen covers it. */
  drawing?: boolean;
  /**
   * The side quest while it is up. Hungry Hungry Hammer (R4): its clock, score and chomps, his dives this round, his line,
   * and the table on screen. Fare Darts (R5): its clock and score, the scalpels thrown and stuck, the bookings, his
   * boarding position, the streak, the steady hand, A-LIST PREFERRED, and the crosshair, the live tags and the board on
   * screen. Screen rects and points in CSS px.
   */
  quest?:
    | { id: "hungry"; menu?: string; walker?: { s: number; away: number } | null; time: number; score: number; eaten: number; dives: number; coiling: boolean; aim: number; lock: string | null; duck: boolean; stun: number; result: unknown; frame: ProbeRect }
    | {
        id: "fares";
        time: number;
        score: number;
        thrown: number;
        stuck: number;
        booked: number;
        position: number;
        streak: number;
        steady: number;
        towels: number;
        preferred: boolean;
        aim: { x: number; y: number };
        tags: { city: string; kind: string; rect: ProbeRect }[];
        result: unknown;
        frame: ProbeRect;
      };
  /** Set by the look scene once it runs. */
  /** `walkOut`: out of the shuttle door, the seconds left of the can in his hand and the nuts spilling (R5 §8). */
  /** The 3D hall while there is one: undefined when the level plays flat. */
  three?: { canvas: boolean; quality: Quality; density: number; fps: number; drawing: boolean };
  /** The level's moving platforms and its signs, for the checks. */
  movers?: { id: string; x: number; y: number; live: boolean }[];
  level?: { signs: { label: string }[] };
  /** The cabin's state, while there is one. */
  flight?: { sign: number; cartLive: boolean; cartZ: number; lane: number };
  /** The middle of the first coach window on screen, in screen px, for the checks. */
  trainWindow?: () => { x: number; y: number } | null;
  hero?: { state: string; x: number; y: number; vx: number; onGround: boolean; crouch?: boolean; flop?: boolean; boxes?: number; stunT?: number; clip?: string; walkOut?: { can: number; nuts: number } };
  heroScreenHeight?: number;
  drawn?: { character: boolean; cast: boolean; props: boolean; flyers: boolean };
  heroScreenX?: number;
  /** His feet on the screen, CSS px from the top. */
  heroScreenY?: number;
  /** How many staffers on screen show the prize they carry over their heads. */
  carrying?: number;
  /** Globs of snot stuck to the cast and the pig, and snot splats on the floor. */
  goo?: { globs: number; splats: number };
  /** The product of every tint above the head sprite: 0xffffff when the plate reaches the screen as drawn. */
  headTintChain?: number;
  /** What he wears now: the Affliction shirt, or the level's costume (scrubs on 3-5 and 3-6). */
  costume?: string;
  /** The TRAINER badge's middle on the screen, CSS px; null without one. */
  badgeScreen?: { x: number; y: number } | null;
  /** The play layer's ambient tint now: the code blue's pulse reads here. */
  ambient?: number;
  /** The camera's trauma now: the drum corps' shake, a bogie's jolt. */
  shake?: number;
  /** The music's state the checks read: the lead's level (3-4's pipers play only while he walks). */
  music?: { lead: number; section?: number | null };
  /** The last of the owner's recordings the game asked the sound for. */
  voice?: string | null;
  /** Each built venue: whether it is visible, on the stage, and the one shown. */
  venues?: Record<string, { visible: boolean; staged: boolean; shown: boolean }>;
  /** The boss's last line and his last thought. */
  lines?: { say: string | null; think: string | null };
  /** The training room (3-6): the screen loop's frame, the drone's state, where the IFU is. */
  training?: { frame: number; drone: string | null; ifu: string | null; cracks: number; playing: boolean; beam: { x: number; y: number } | null; dark: { x: number; y: number } | null; screen: { x: number; y: number } };
  /** The level's errands done (3-4). */
  errands?: number;
  /** 3-4's bands: where each is and what it does. */
  bands?: { id: string; x: number; state: string }[];
  /** His face box on screen, CSS px: nothing in the shell may cover it. */
  /** His face on the screen; null while only his back shows, in the hall. */
  faceScreen?: { x: number; y: number; w: number; h: number } | null;
  /** His thought bubble's box on screen, CSS px, while one shows. */
  bubbleScreen?: { x: number; y: number; w: number; h: number } | null;
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
  sound?: { unlocked: boolean; played: Record<string, number>; volumes?: { music: number; effects: number } };
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
  castArt?: { painted: string[]; standIn: string[]; stale: number; live: number; tints: { cast: number; flyers: number }; drawn: Record<number, { person: string; recolor: string | null }>; carts: { id: number; load: string }[] };
  cast?: { people: Record<number, { person: string; recolor: string | null }>; targets: { id: number; load: string }[]; acts: Record<string, string>; positions: Record<string, { x: number; y: number }>; attackers: number; missiles: number; planes: { kind: string; x: number; y: number }[]; out: number };
  /** The gift shop's pig: its state, where it is, its HP and counts, and whether it is drawn or painted. */
  pig?: { state: string; x: number; hp: number; bonks: number; snots: number; drawn: "drawn" | "painted" } | null;
  /** The boss beside the pig. */
  boss?: { kind: string; state: string; hp: number; max: number; x: number; y: number } | null;
  /** With `&dev=1`: move him anywhere and hit him, for the checks. */
  dev?: {
    teleport(x: number, y?: number): void;
    hit(): void;
    /** An event as if the sim had sent it (its sound, feel and look): the voice check's taunts. */
    event(e: GameEvent): void;
    charge(): void;
    give(kind: "can" | "nuts" | "bucees" | "pepper" | "keycard"): void;
    boss(o: { hp?: number; state?: string; door?: number }): void;
    /** 3-4: an errand done at once; a band started now. */
    errand(id: string): void;
    band(id: string): void;
    pad(o: { axes?: number[]; buttons?: { pressed: boolean }[] } | null): void;
    three(o: { frameMs?: number; lose?: boolean }): void;
    /** The cabin's turbulence and its cart, now. */
    turbulence(): void;
    cart(): void;
    /** The station's clock, set; refused once he has boarded. */
    stretch(seconds: number): void;
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
    boxes(n?: number): void;
    bonked(n: number): void;
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
    /** Runs the round's clock out (the gate's: the rest of the tray as misses): its tally is next. */
    questSkip(): void;
    /** The gate's round: the crosshair pinned on a city (null sweeps again), a tag put on a city, the hazards off. */
    fares(o: { pin?: CityCode | null; tag?: { city: CityCode; kind?: TagKind }; calm?: boolean }): void;
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
  // Auto starts at high and makes its one pick once the governor has settled (plan decision 10).
  let quality: Quality = readForcedQuality() ?? "high";
  await app.init({
    preference: opts.preference ?? "webgpu",
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, DPR[quality]),
    resizeTo: host,
    background: "#0d1118",
    // Under the hall the canvas clears transparent over the 3D view, which a context must be made able to do at the start.
    backgroundAlpha: 0.999,
    powerPreference: "high-performance",
  });
  app.renderer.background.alpha = 1;
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
    pixel: (x, y) => {
      const { pixels } = app.renderer.extract.pixels({ target: app.stage, frame: new Rectangle(Math.round(x), Math.round(y), 1, 1), resolution: 1 });
      return [pixels[0], pixels[1], pixels[2]];
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
      picked = false;
      acc = work = n = 0;
      intervals.length = 0;
      out.setQuality("high");
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
    refresh = Infinity,
    picked = false;
  const intervals: number[] = [];
  /** The card's name: WebGPU's adapter info, or WebGL's unmasked renderer string; empty when the browser hides it. */
  const gpuName = (): string => {
    const r = app.renderer as unknown as { gpu?: { adapter?: { info?: Record<string, string | undefined> } }; gl?: WebGL2RenderingContext };
    const info = r.gpu?.adapter?.info;
    if (info) return [info.vendor, info.architecture, info.device, info.description].filter(Boolean).join(" ");
    const gl = r.gl;
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
  };
  probe.gpu = gpuName();
  const adapterInfo = (app.renderer as unknown as { gpu?: { adapter?: { info?: Record<string, string | undefined> } } }).gpu?.adapter?.info;
  const gpuClass = (): "desktop" | "other" => gpuClassOf({ name: probe.gpu, vendor: adapterInfo?.vendor, architecture: adapterInfo?.architecture });
  probe.gpuClass = gpuClass();
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
    if (settle > 0) {
      settle--;
      // Settled: Auto's one pick, ultra on a desktop card that held its frame rate; the new tier then settles a window.
      if (settle === 0 && !picked && !readForcedQuality()) {
        picked = true;
        const q = firstTier(gpuClass(), out.fps);
        if (q !== quality) {
          out.setQuality(q);
          settle = 1;
        }
      }
    } else if (
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
