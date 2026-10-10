import { AudioBus } from "./audio";
import {
  HERO_BODY_HEIGHT,
  HERO_BODY_WIDTH,
  HERO_CROUCH_HEIGHT,
  ENEMY_HEIGHT,
  ENEMY_BODY_HEIGHT,
  IDLE_HARRUMPH_AT,
  LECTURE_SECONDS,
  SNOT_SECONDS,
  SUPER_SECONDS,
  SWING_SECONDS,
  WIPE_SECONDS,
  pathHits,
  sweptHeadHits,
  type Point,
} from "./combat";
import { drawHero, heroFace, heroMallet, heroNostril, type HeroPose } from "./hero";
import { drawThought, thoughtLayout } from "./thought";
import { clearOfFace, comicBox, comicStar } from "./layout";
import { drawPerson as drawPersonArt } from "./people";
import { SNOT_FIRE_U, SUPER_CUT_FROM, SWING_ACTIVE, WIPE_FLICK, WIPE_SCRUB, WIPE_SHINE } from "./rig";
import { DISPLAY_H, DISPLAY_W, GROUND_ROW, ID, TILE, VIEW_H, VIEW_W, isSolid } from "./constants";
import { buildLevels, seededRandom, type EnemyRole, type StudentSpawn, type Level } from "./levels";
import { HungryQuest } from "./quests/hungry";
import type { Quest, QuestContext, QuestHud, QuestId, QuestResult } from "./quests/quest";
import { drawFurniture, drawSign, drawRoomDecor, drawCrate, drawFloorGap } from "./scenery";
import {
  ASIDES,
  DAMAGE_LINE,
  IMPACT_WORDS,
  LECTURES,
  RETORTS,
  STAFF_COMEBACKS,
  STAFF_LINES,
  STAFF_SIGHS,
  TAUNT_LINES,
  pick,
} from "./lines";
import type { TauntId } from "./taunts";

export type Mode =
  | "title"
  | "card"
  | "play"
  | "pause"
  | "die"
  | "slide"
  | "walkoff"
  | "tally"
  | "over"
  | "win"
  | "quest"
  | "questTally";

export type Hud = {
  score: number;
  coins: number;
  world: string;
  name: string;
  time: number;
  lives: number;
  form: 0 | 1 | 2;
  charge: number;
  star: number;
  heat: number;
  cooldown: number;
  checkpoint: boolean;
  hint: string;
  soundReady: boolean;
  visualsReady: boolean;
  stance: "standing" | "crouching" | "sliding";
  boss: { hp: number; max: number; bonks: number; snots: number; defeated: boolean } | null;
  /** Snot charges, refilled over time; pepper makes them hot. */
  sinus: number;
  hot: boolean;
  /** Hits Hammer can still take before the next one costs a life. */
  patience: number;
  lectureReady: boolean;
  /** Present while a side quest runs (and on its title card and tally). */
  quest: QuestHud | null;
  questResult: (QuestResult & { practice: boolean }) | null;
};

export type TouchAction =
  | "left"
  | "right"
  | "jump"
  | "run"
  | "down"
  | "fire"
  | "towel"
  | "hammer"
  | "super"
  | "lecture";

type Body = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
};

type Player = Body & {
  facing: 1 | -1;
  form: 0 | 1 | 2;
  coyote: number;
  jumpBuf: number;
  invuln: number;
  anim: number;
  skid: boolean;
  land: number;
  prevY: number;
  pipeLock: number;
  freeze: number;
  crouch: boolean;
  slideT: number;
};

type Enemy = Body & {
  kind: "soot" | "shell";
  role: EnemyRole;
  home: number;
  alert: number;
  alerted: boolean;
  speechT: number;
  alive: boolean;
  state: "walk" | "shell" | "flat";
  awake: boolean;
  flatT: number;
  facing: 1 | -1;
  chain: number;
  grace: number;
  anim: number;
  wake: number;
  line?: string;
  greeted?: boolean;
  /** Seconds left standing still after a lecture. */
  freeze?: number;
};
/** Purely visual: a defeated staffer sent flying by the mallet or the snot. */
type Tumble = {
  role: EnemyRole;
  x: number;
  feet: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  life: number;
  slimed: boolean;
};
type Student = Body &
  StudentSpawn & {
    facing: 1 | -1;
    home: number;
    greeted: boolean;
    speechT: number;
    throwCd: number;
    windup: number;
    /** Seconds left sulking after a lecture: no paper, a sullen retort. */
    schooled?: number;
    retort?: string;
  };
type Puddle = { x: number; y: number; w: number; life: number; max: number };
type Ring = {
  x: number;
  y: number;
  r: number;
  grow: number;
  life: number;
  max: number;
  color: string;
  /** Floor shockwaves are drawn flattened into perspective. */
  floor?: boolean;
};
type Comic = { x: number; y: number; text: string; life: number; max: number; rot: number; big: boolean };
type Plane = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  life: number;
  phase: number;
};
type Boss = Body & {
  hp: number;
  max: number;
  active: boolean;
  bonks: number;
  snots: number;
  state: "idle" | "windup" | "charge" | "hop" | "recover" | "defeated";
  timer: number;
  hurt: number;
  facing: 1 | -1;
  attacks: number;
  refill: number;
};

type Item = Body & { kind: "gear" | "lamp" | "nuts" | "treat"; emerge: number };
type Ember = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  ox: number;
  oy: number;
  /** Pepper-loaded snot: bigger, faster, and it goes through one target. */
  hot?: boolean;
  pierce?: number;
  hit?: Set<object>;
};
type Bit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  s: number;
};
type Sheet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  life: number;
  max: number;
};
type Floater = { x: number; y: number; vy: number; life: number; text: string };

export type GameHooks = {
  onMode: (mode: Mode) => void;
  onHud: (hud: Hud) => void;
  onRecord: (score: number) => void;
  /** A practice quest finished with this score. */
  onQuestRecord?: (id: QuestId, score: number) => void;
};

const FONT: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "110", "100", "110", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["110", "101", "101", "101", "011"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "011", "001"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["110", "001", "010", "100", "111"],
  "3": ["110", "001", "011", "001", "110"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "110", "001", "110"],
  "6": ["011", "100", "110", "101", "011"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "110"],
  "!": ["010", "010", "010", "000", "010"],
  "?": ["110", "001", "010", "000", "010"],
  "-": ["000", "000", "111", "000", "000"],
  "+": ["000", "010", "111", "010", "000"],
  " ": ["000", "000", "000", "000", "000"],
};

const STEP = 1 / 60;
const DOOR_W = 40;
const ACTIONS: TouchAction[] = [
  "left",
  "right",
  "jump",
  "run",
  "down",
  "fire",
  "towel",
  "hammer",
  "super",
  "lecture",
];
const blank = () =>
  Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<TouchAction, boolean>;
const QUESTS: Partial<Record<QuestId, () => Quest>> = { hungry: () => new HungryQuest() };
const CHAIN = [100, 200, 400, 800, 1000, 2000, 4000, 8000];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      setKeys: (codes: string[]) => void;
    };
    __kiln?: {
      mode: Mode;
      x: number;
      y: number;
      scene: string;
      stance: string;
      height: number;
      seed: number;
      planes: number;
      bossHp: number;
      bossState: string;
      bossX: number;
      bonks: number;
      snots: number;
      form: number;
      onGround: boolean;
      facing: number;
      tauntsReady: boolean;
      tauntCount: number;
      lastTaunt: string | null;
      damageVoices: number;
      sinus: number;
      puddles: number;
      lecture: number;
      idle: number;
      staffGap: number;
      quest: string;
      questScore: number;
      spentDoors: number;
    };
    /** Development-only QA levers; absent from production builds. */
    __kilnDev?: {
      charge: (n: number) => number;
      heat: (n: number) => number;
      /** Fast-forward the running side quest; returns its seconds left. */
      questSkip: (seconds: number) => number;
      teleport: (x: number) => number;
    };
  }
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private audio = new AudioBus();
  private courses: Level[];
  private bonus: Level;
  private level!: Level;
  private levelIndex = 0;
  private startingVenue = 0;
  private runSeed = 0;
  private tiles!: Uint8Array;
  private player!: Player;
  private enemies: Enemy[] = [];
  private students: Student[] = [];
  private planes: Plane[] = [];
  private boss: Boss | null = null;
  private hammerBossTagged = false;
  private heroBanter = "";
  private banterT = 0;
  private banterSoft = false;
  private banterSpoken = false;
  private idleT = 0;
  private quest: Quest | null = null;
  private questInfo: { id: QuestId; practice: boolean; returnX: number } | null = null;
  private questResult: QuestResult | null = null;
  private questPressed = blank();
  private questPrev = blank();
  private spentDoors = new Set<string>();
  private cardNext: "play" | "quest" = "play";
  private items: Item[] = [];
  private embers: Ember[] = [];
  private bits: Bit[] = [];
  private sheets: Sheet[] = [];
  private texts: Floater[] = [];
  private bumps = new Map<string, number>();
  private snap: {
    level: Level;
    tiles: Uint8Array;
    enemies: Enemy[];
    students: Student[];
    items: Item[];
    player: Player;
    camX: number;
    timeLeft: number;
    timeAcc: number;
    returnX: number;
    returnTop: number;
  } | null = null;

  mode: Mode = "title";
  private pausedFrom: Mode = "play";
  private score = 0;
  private coins = 0;
  private lives = 3;
  private timeLeft = 300;
  private timeAcc = 0;
  private camX = 0;
  private clock = 0;
  private cardT = 0;
  private dieT = 0;
  private tallyHold = 0;
  private shake = 0;
  private fade = 0;
  private flagY = 40;
  private fireCd = 0;
  private charge = 0;
  private star = 0;
  private sinus = 3;
  private lecture = 0;
  private lectureCd = 0;
  private lectureHit = false;
  private lectureEdge = false;
  private prevLecture = false;
  private puddles: Puddle[] = [];
  private rings: Ring[] = [];
  private comics: Comic[] = [];
  private tumbles: Tumble[] = [];
  private boiled = false;
  private wipeStroke = -1;
  private heroIdle = new Image();
  private heroBody = new Image();
  private heroUpper = new Image();
  private heroFore = new Image();
  private heroHand = new Image();
  private zeroCan = new Image();
  private beaver = new Image();
  private worker = new Image();
  private server = new Image();
  private hotelStaff = new Image();
  private student = new Image();
  private hotelBg = new Image();
  private campusBg = new Image();
  private bossPig = new Image();
  private wood = new Image();
  private steel = new Image();
  private nurse = new Image();
  private heat = 0;
  private checkpoint = 0;
  private hurtT = 0;
  /** Swing progress at the previous contact check, so contact follows the arc. */
  private hammerLast: number | null = null;
  private hammerVictims = new Set<Enemy>();
  private hammerBlocks = new Set<string>();
  private splashes: { x: number; y: number; life: number }[] = [];
  private nuts = new Image();
  private towel = new Image();
  private wipe = 0;
  private hitstop = 0;
  private curse = 0;
  private swing = 0;
  private superT = 0;
  private superHit = false;
  private snotT = 0;
  private snotFired = false;
  private hammerEdge = false;
  private towelEdge = false;
  private prevHammer = false;
  private prevTowel = false;
  private acc = 0;
  private raf = 0;
  private reduce: boolean;
  private lastMode: Mode | null = null;

  private keys = new Set<string>();
  private probeActive = false;
  private probe = new Set<string>();
  private pointers = new Map<number, TouchAction>();
  private touch: Record<TouchAction, boolean> = {
    left: false,
    right: false,
    jump: false,
    run: false,
    down: false,
    fire: false,
    towel: false,
    hammer: false,
    super: false,
    lecture: false,
  };
  private actions = { ...this.touch };
  private superEdge = false;
  private prevSuper = false;
  private prevJump = false;
  private prevFire = false;
  private jumpRelease = false;
  private fireEdge = false;
  private jumpHeld = false;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onBlur: () => void;
  private onVis: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: GameHooks,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    this.ctx = ctx;
    this.heroIdle.src = "/hero-idle-calm.png?v=lock";
    this.heroBody.src = "/hero-body.png?v=rig4";
    this.heroUpper.src = "/hero-upper.png?v=rig4";
    this.heroFore.src = "/hero-fore.png?v=rig4";
    this.heroHand.src = "/hero-hand.png?v=rig4";
    this.zeroCan.src = "/coke-zero.webp";
    this.nuts.src = "/nuts-bag.webp";
    this.towel.src = "/towel-cloth.webp";
    this.audio.preloadCurse();
    this.audio.preloadTaunts();
    this.beaver.src = "/buccees-pickup.webp";
    this.worker.src = "/npc-office.webp";
    this.server.src = "/npc-server.webp";
    this.hotelStaff.src = "/npc-hotel.webp";
    this.student.src = "/npc-student.webp";
    this.hotelBg.src = "/hotel-corridor.webp";
    this.campusBg.src = "/campus-common.webp";
    this.bossPig.src = "/boss-pig-reference.webp";
    this.wood.src = "/wood-surface.webp";
    this.steel.src = "/steel-surface.webp";
    this.nurse.src = "/scrubs.png";
    this.runSeed = Math.floor(Math.random() * 0xffffffff);
    const built = buildLevels(this.runSeed);
    this.courses = built.courses;
    this.bonus = built.bonus;
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.loadLevel(this.courses[0], 1, 0, true);
    this.onKeyDown = (e) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.closest("select") ||
          (this.mode === "title" && e.target.closest("button,summary")))
      )
        return;
      this.probeActive = false;
      this.keys.add(e.code);
      if (this.mode === "questTally" && !e.repeat && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        this.finishQuest();
        return;
      }
      if (!e.repeat) {
        if (e.code === "Escape" || e.code === "KeyP") this.togglePause();
        if (this.mode === "play") {
          if (["Space", "ArrowUp", "KeyW", "KeyZ"].includes(e.code)) this.player.jumpBuf = 0.12;
          if (["KeyF", "KeyC", "KeyK"].includes(e.code)) this.fireEdge = true;
          if (["KeyH", "KeyX"].includes(e.code)) this.hammerEdge = true;
          if (e.code === "KeyT") this.towelEdge = true;
          if (e.code === "KeyQ") this.superEdge = true;
          if (["KeyE", "KeyL"].includes(e.code)) this.lectureEdge = true;
        }
      }
      if (
        this.mode === "play" ||
        this.mode === "quest" ||
        this.mode === "pause" ||
        this.mode === "slide" ||
        this.mode === "walkoff"
      ) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
          e.preventDefault();
      }
      if (
        (this.mode === "title" || this.mode === "over" || this.mode === "win") &&
        !e.repeat &&
        (e.code === "Enter" || e.code === "Space")
      ) {
        e.preventDefault();
        this.newGame();
      }
    };
    this.onKeyUp = (e) => {
      this.keys.delete(e.code);
      if (this.mode === "play" && ["Space", "ArrowUp", "KeyW", "KeyZ"].includes(e.code))
        this.jumpRelease = true;
    };
    this.onBlur = () => {
      this.keys.clear();
      this.pointers.clear();
      this.recomputeTouch();
      if (this.mode === "play" || this.mode === "quest") this.togglePause();
    };
    this.onVis = () => {
      if (document.visibilityState === "hidden") this.onBlur();
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVis);
    this.installProbe();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVis);
    delete window.__controlsTest;
    delete window.__kiln;
    delete window.__kilnDev;
    this.audio.destroy();
  }

  setStartingVenue(index: number) {
    this.startingVenue =
      Number.isInteger(index) && index >= 0 && index < this.courses.length ? index : 0;
  }

  newGame(startIndex = this.startingVenue) {
    if (this.mode !== "title" && this.mode !== "over" && this.mode !== "win") return;
    this.audio.unlock();
    this.runSeed = Math.floor(Math.random() * 0xffffffff);
    const built = buildLevels(this.runSeed);
    this.courses = built.courses;
    this.bonus = built.bonus;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.charge = 0;
    this.star = 0;
    this.heat = 0;
    this.wipe = 0;
    this.sinus = 3;
    this.boiled = false;
    this.levelIndex =
      Number.isInteger(startIndex) && startIndex >= 0 && startIndex < this.courses.length
        ? startIndex
        : 0;
    this.checkpoint = 0;
    this.snap = null;
    this.fade = 0;
    this.spentDoors = new Set();
    this.quest = null;
    this.questInfo = null;
    this.questResult = null;
    this.loadLevel(this.courses[this.levelIndex], 1, 0, true);
    this.audio.startMusic("day");
    this.mode = "card";
    this.cardT = 1.65;
  }

  togglePause() {
    if (
      this.mode === "play" ||
      this.mode === "quest" ||
      this.mode === "slide" ||
      this.mode === "walkoff"
    ) {
      this.pausedFrom = this.mode;
      this.mode = "pause";
      this.audio.stopMusic();
      this.audio.stopVoice();
      this.hushVoice();
      this.fireEdge = this.hammerEdge = this.towelEdge = this.superEdge = this.lectureEdge = false;
      this.player.jumpBuf = 0;
    } else if (this.mode === "pause") {
      this.mode = this.pausedFrom;
      this.questPrev = { ...blank(), ...this.actions };
      this.audio.startMusic(this.level.music);
    }
  }

  toggleMute() {
    this.audio.unlock();
    this.audio.setMuted(!this.audio.muted);
    if (this.audio.muted) this.hushVoice();
    return this.audio.muted;
  }

  setPointer(id: number, action: TouchAction, down: boolean) {
    this.audio.unlock();
    if (down) this.pointers.set(id, action);
    else this.pointers.delete(id);
    if (down && this.mode === "quest") this.questPressed[action] = true;
    if (down && this.mode === "play") {
      if (action === "jump") this.player.jumpBuf = 0.12;
      if (action === "hammer") this.hammerEdge = true;
      if (action === "fire") this.fireEdge = true;
      if (action === "towel") this.towelEdge = true;
      if (action === "super") this.superEdge = true;
      if (action === "lecture") this.lectureEdge = true;
    }
    if (!down && action === "jump") this.jumpRelease = true;
    this.recomputeTouch();
  }

  private recomputeTouch() {
    this.touch = {
      left: false,
      right: false,
      jump: false,
      run: false,
      down: false,
      fire: false,
      towel: false,
      hammer: false,
      super: false,
      lecture: false,
    };
    for (const action of this.pointers.values()) this.touch[action] = true;
  }

  private installProbe() {
    window.__controlsTest = {
      getYaw: () => 0,
      getSpeed: () => this.player.vx,
      getX: () => this.player.x,
      setKeys: (codes) => {
        this.probeActive = true;
        this.probe = new Set(codes);
      },
    };
    window.__kiln = Object.defineProperties({} as NonNullable<Window["__kiln"]>, {
      mode: { get: () => this.mode },
      x: { get: () => this.player.x },
      y: { get: () => this.player.y },
      scene: { get: () => this.level.id },
      stance: {
        get: () =>
          this.player.slideT > 0 ? "sliding" : this.player.crouch ? "crouching" : "standing",
      },
      height: { get: () => this.player.h },
      seed: { get: () => this.runSeed },
      planes: { get: () => this.planes.length },
      bossHp: { get: () => this.boss?.hp ?? 0 },
      bossState: { get: () => this.boss?.state ?? "none" },
      bossX: { get: () => this.boss?.x ?? 0 },
      bonks: { get: () => this.boss?.bonks ?? 0 },
      snots: { get: () => this.boss?.snots ?? 0 },
      form: { get: () => this.player.form },
      onGround: { get: () => this.player.onGround },
      facing: { get: () => this.player.facing },
      tauntsReady: { get: () => this.audio.tauntsReady },
      tauntCount: { get: () => this.audio.tauntCount },
      lastTaunt: { get: () => this.audio.lastTaunt },
      damageVoices: { get: () => this.audio.voiceCount },
      sinus: { get: () => this.sinus },
      puddles: { get: () => this.puddles.length },
      lecture: { get: () => this.lecture },
      idle: { get: () => this.idleT },
      quest: { get: () => this.quest?.id ?? "" },
      questScore: { get: () => this.quest?.hud().score ?? 0 },
      spentDoors: { get: () => this.spentDoors.size },
      staffGap: {
        get: () => {
          const p = this.player;
          const gaps = this.enemies
            .filter((e) => e.alive && e.state === "walk")
            .map((e) => (p.facing > 0 ? e.x - (p.x + p.w) : p.x - (e.x + e.w)))
            .filter((gap) => gap > -4);
          return gaps.length ? Math.min(...gaps) : 999;
        },
      },
    });
    if (import.meta.env?.DEV)
      window.__kilnDev = {
        charge: (n) => (this.charge = clamp(n, 0, 10)),
        heat: (n) => (this.heat = clamp(n, 0, 100)),
        questSkip: (seconds) => {
          for (let i = 0; i < seconds * 60 && this.quest && !this.quest.result(); i++)
            this.quest.step(STEP, { held: blank(), pressed: blank() });
          return this.quest?.hud().timer ?? 0;
        },
        teleport: (x) => {
          this.player.x = x;
          this.camX = clamp(x - VIEW_W * 0.32, 0, Math.max(0, this.level.w * TILE - VIEW_W));
          return x;
        },
      };
  }

  private held(code: string) {
    return this.probeActive ? this.probe.has(code) : this.keys.has(code);
  }

  private sample() {
    const t = this.touch;
    this.actions = {
      left: t.left || this.held("ArrowLeft") || this.held("KeyA"),
      right: t.right || this.held("ArrowRight") || this.held("KeyD"),
      jump:
        t.jump ||
        this.held("Space") ||
        this.held("ArrowUp") ||
        this.held("KeyW") ||
        this.held("KeyZ"),
      run: t.run || this.held("ShiftLeft") || this.held("ShiftRight") || this.held("KeyJ"),
      down: t.down || this.held("ArrowDown") || this.held("KeyS"),
      fire: t.fire || this.held("KeyF") || this.held("KeyC") || this.held("KeyK"),
      hammer: t.hammer || this.held("KeyH") || this.held("KeyX"),
      super: t.super || this.held("KeyQ"),
      towel: t.towel || this.held("KeyT"),
      lecture: t.lecture || this.held("KeyE") || this.held("KeyL"),
    };
  }

  private loop = (now: number) => {
    const prev = this.clockMs ?? now;
    this.clockMs = now;
    const dt = Math.min(0.05, (now - prev) / 1000);
    this.frame(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private clockMs: number | null = null;

  private frame(dt: number) {
    if (this.mode !== "pause") this.clock += dt;
    this.sample();
    if (this.mode === "quest")
      for (const k of ACTIONS) if (this.actions[k] && !this.questPrev[k]) this.questPressed[k] = true;
    this.questPrev = { ...blank(), ...this.actions };
    if (this.mode === "play" && this.actions.jump && !this.prevJump) this.player.jumpBuf = 0.12;
    if (this.mode === "play" && !this.actions.jump && this.prevJump) this.jumpRelease = true;
    this.prevJump = this.actions.jump;
    if (this.actions.fire && !this.prevFire) this.fireEdge = true;
    this.prevFire = this.actions.fire;
    if (this.actions.hammer && !this.prevHammer) this.hammerEdge = true;
    this.prevHammer = this.actions.hammer;
    if (this.actions.towel && !this.prevTowel) this.towelEdge = true;
    this.prevTowel = this.actions.towel;
    if (this.mode === "play" && this.actions.super && !this.prevSuper) this.superEdge = true;
    this.prevSuper = this.actions.super;
    if (this.actions.lecture && !this.prevLecture) this.lectureEdge = true;
    this.prevLecture = this.actions.lecture;
    if (this.mode !== "play")
      this.fireEdge = this.hammerEdge = this.towelEdge = this.superEdge = this.lectureEdge = false;
    this.jumpHeld = this.actions.jump;

    if (this.mode === "title") {
      this.emit();
      return;
    }
    if (this.mode === "pause") {
      this.render(dt);
      this.ctx.fillStyle = "rgba(12,8,6,0.45)";
      this.ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
      this.emit();
      return;
    }

    this.audio.hurry = this.mode === "play" && this.timeLeft > 0 && this.timeLeft < 80;
    this.audio.tick();
    this.acc += dt;
    let guard = 0;
    while (this.acc >= STEP && guard < 5) {
      this.step(STEP);
      this.acc -= STEP;
      guard++;
    }
    this.render(dt);
    this.emit();
  }

  private step(dt: number) {
    this.fade = Math.max(0, this.fade - dt * 3.2);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.superT = Math.max(0, this.superT - dt);
    this.snotT = Math.max(0, this.snotT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.wipe = Math.max(0, this.wipe - dt);
    this.lecture = Math.max(0, this.lecture - dt);
    this.lectureCd = Math.max(0, this.lectureCd - dt);
    this.sinus = Math.min(3, this.sinus + dt / 1.5);
    this.star = Math.max(0, this.star - dt);
    this.curse = Math.max(0, this.curse - dt);
    if (this.mode !== "play") this.hammerEdge = false;
    this.player.pipeLock = Math.max(0, this.player.pipeLock - dt);
    this.player.invuln = Math.max(0, this.player.invuln - dt);
    this.player.land = Math.max(0, this.player.land - dt);
    this.updateFx(dt);
    if (this.hitstop > 0 && this.mode === "play") {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }

    if (this.mode === "card") {
      this.cardT -= dt;
      if (this.cardT <= 0 && this.visualsReady() && (this.audio.ready || this.audio.failed)) {
        this.mode = this.cardNext;
        this.cardNext = "play";
      }
      return;
    }
    if (this.mode === "die") {
      this.player.vy += 1500 * dt;
      this.player.vx *= Math.max(0, 1 - dt * 0.6);
      this.player.x += this.player.vx * dt;
      this.player.y += this.player.vy * dt;
      this.dieT -= dt;
      if (this.dieT <= 0) this.resolveDeath();
      return;
    }
    if (this.mode === "tally") {
      if (this.timeLeft > 0) {
        this.timeLeft -= 1;
        this.scoreAdd(50);
        if (this.timeLeft % 10 === 0) this.audio.tickSfx();
      } else {
        this.tallyHold += dt;
        if (this.tallyHold > 0.85) this.advance();
      }
      return;
    }
    if (this.mode === "quest") {
      this.stepQuest(dt);
      return;
    }
    if (this.mode === "questTally") return;
    if (this.mode === "over" || this.mode === "win" || this.mode === "title") return;

    this.player.freeze = Math.max(0, this.player.freeze - dt);

    if (this.mode === "play") this.controlPlayer(dt);
    else if (this.mode === "slide") this.slide(dt);
    else if (this.mode === "walkoff") this.walkoff(dt);
    if (this.mode === "play") this.stepIdle(dt);
    else this.idleT = 0;
    this.stepSuper();

    if (this.mode === "play") this.tickClock(dt);
    this.stepItems(dt);
    this.stepEnemies(dt);
    this.stepStudents(dt);
    this.stepEmbers(dt);
    this.stepPuddles(dt);
    this.stepBoss(dt);
    this.stepPlanes(dt);
    if (this.mode === "play") {
      this.collectCoins();
      this.collectItems();
      this.touchEnemies();
      this.tryPipe();
      this.tryDoor();
      this.tryFlag();
      const nextCheckpoint = this.level.checkpoints
        .filter((x) => x * TILE > this.checkpoint && x * TILE <= this.player.x)
        .at(-1);
      if (nextCheckpoint != null && this.player.onGround) {
        this.checkpoint = nextCheckpoint * TILE;
        this.float(this.player.x, this.player.y - 12, "CHECKPOINT");
        this.audio.power();
      }
      if (this.player.y > VIEW_H + 24) this.kill();
    }
    this.followCamera(dt);
  }

  private controlPlayer(dt: number) {
    const p = this.player;
    this.updateStance(dt);
    const locked = this.wipe > 0 || p.freeze > 0 || this.hurtT > 0 || this.lecture > 0;
    if (
      this.towelEdge &&
      !p.crouch &&
      this.heat > 0 &&
      p.onGround &&
      !locked &&
      this.swing <= 0 &&
      this.superT <= 0 &&
      this.snotT <= 0
    ) {
      this.wipe = WIPE_SECONDS;
      this.wipeStroke = -1;
      p.vx *= 0.2;
      this.audio.cloth();
    }
    this.towelEdge = false;
    if (this.wipe > 0) this.wipeFx(dt);
    const run = this.actions.run && !locked && !p.crouch;
    const tired = this.heat >= 80;
    const cap = p.slideT > 0 ? 170 : p.crouch ? 74 : tired ? 116 : 158;
    this.heat = clamp(this.heat + (run && Math.abs(p.vx) > 100 ? 6 : -3) * dt, 0, 100);
    if (this.heat >= 99.5 && !this.boiled) {
      this.boiled = true;
      this.audio.whistle();
      this.comic(p.x + p.w / 2, p.y - 10, "BOILING!", false);
    } else if (this.heat < 70) this.boiled = false;
    const accel = (p.onGround ? 540 : 320) * (run ? 1.15 : 1) * (tired ? 0.82 : 1);
    if (this.actions.left && !locked && p.slideT <= 0) {
      p.vx -= accel * dt;
      p.facing = -1;
    }
    if (this.actions.right && !locked && p.slideT <= 0) {
      p.vx += accel * dt;
      p.facing = 1;
    }

    const reversing =
      p.onGround && ((this.actions.left && p.vx > 36) || (this.actions.right && p.vx < -36));
    p.skid = reversing;
    if (p.slideT > 0) {
      p.vx = approach(p.vx, Math.sign(p.vx) * 115, 70 * dt);
    } else if ((!this.actions.left && !this.actions.right) || this.wipe > 0 || this.lecture > 0) {
      const f = 620 * dt;
      if (Math.abs(p.vx) <= f) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * f;
    } else if (reversing) {
      p.vx += (this.actions.left ? -1 : 1) * 780 * dt;
    }
    if (p.slideT <= 0 && !p.crouch && !run && Math.abs(p.vx) > (tired ? 64 : 96))
      p.vx = approach(p.vx, (tired ? 64 : 96) * Math.sign(p.vx), 240 * dt);
    p.vx = clamp(p.vx, -cap, cap);

    if (!locked && !p.crouch && (p.onGround || p.coyote > 0) && p.jumpBuf > 0) {
      p.vy = Math.abs(p.vx) > 118 && !tired ? -408 : -350;
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuf = 0;
      p.land = 0;
      this.heat = Math.min(100, this.heat + 12);
      this.audio.jump();
    }
    if (this.jumpRelease && p.vy < -240) p.vy = -240;
    this.jumpRelease = false;
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);

    let g = p.vy < 0 ? 1080 : 1980;
    if (Math.abs(p.vy) < 46) g *= 0.48;
    p.vy = Math.min(310, p.vy + g * dt);

    // Snot is his own weapon: always loaded, limited by sinus pressure; pepper makes it hot.
    if (
      !locked &&
      !p.crouch &&
      this.swing <= 0 &&
      this.fireEdge &&
      this.sinus >= 1 &&
      this.fireCd <= 0 &&
      this.embers.length < 3 &&
      this.superT <= 0 &&
      this.snotT <= 0 &&
      this.wipe <= 0
    ) {
      this.snotT = SNOT_SECONDS;
      this.snotFired = false;
      this.fireCd = 0.5;
      this.sinus -= 1;
      this.audio.sniff();
    }
    this.fireEdge = false;
    if (this.snotT > 0 && !this.snotFired && 1 - this.snotT / SNOT_SECONDS >= SNOT_FIRE_U) {
      this.snotFired = true;
      const n = heroNostril(this.heroPose());
      const hot = p.form === 2;
      this.embers.push({
        x: n.x,
        y: n.y,
        ox: n.x,
        oy: n.y,
        vx: (hot ? 330 : 280) * p.facing,
        vy: hot ? -30 : -40,
        life: 1.15,
        max: 1.15,
        hot,
        pierce: hot ? 1 : 0,
        hit: new Set(),
      });
      for (let i = 0; i < 7; i++)
        this.bits.push({
          x: n.x,
          y: n.y,
          vx: p.facing * (50 + Math.random() * 90),
          vy: (Math.random() - 0.65) * 70,
          life: 0.32,
          max: 0.32,
          color: hot ? "#ead57c" : "#c8dc8c",
          s: 1.3,
        });
      // Out ahead of the nose so the burst never sits on his face.
      this.comic(n.x + p.facing * 26, n.y - 14, hot ? "HOT HONK!" : "HONK!", false);
      this.heat = Math.min(100, this.heat + 5);
      this.audio.honk();
    }

    if (
      this.lectureEdge &&
      !locked &&
      p.onGround &&
      !p.crouch &&
      this.lectureCd <= 0 &&
      this.swing <= 0 &&
      this.superT <= 0 &&
      this.snotT <= 0
    ) {
      this.lecture = LECTURE_SECONDS;
      this.lectureCd = LECTURE_SECONDS + 0.6;
      this.lectureHit = false;
      p.vx *= 0.2;
      this.say(pick(LECTURES, this.clock * 13).text, 1.8);
      this.audio.harrumph();
    }
    this.lectureEdge = false;
    if (this.lecture > 0 && !this.lectureHit && 1 - this.lecture / LECTURE_SECONDS >= 0.2) {
      this.lectureHit = true;
      this.deliverLecture();
    }

    if (
      this.superEdge &&
      this.charge >= 10 &&
      !locked &&
      !p.crouch &&
      this.snotT <= 0 &&
      this.swing <= 0
    )
      this.startSuper();
    this.superEdge = false;
    if (
      this.hammerEdge &&
      !locked &&
      !p.crouch &&
      this.superT <= 0 &&
      this.snotT <= 0 &&
      this.swing <= 0
    ) {
      this.swing = SWING_SECONDS;
      this.hammerLast = null;
      this.hammerVictims.clear();
      this.hammerBlocks.clear();
      this.hammerBossTagged = false;
      this.audio.whoosh();
      this.heat = Math.min(100, this.heat + 3);
    }
    this.hammerEdge = false;

    p.prevY = p.y;
    const was = p.onGround;
    this.moveBody(p, dt, true);
    if (p.onGround) {
      p.coyote = 0.09;
      if (!was) p.land = 0.09;
    } else p.coyote = Math.max(0, p.coyote - dt);
    p.anim += (dt * Math.abs(p.vx)) / 46;
    if (this.swing > 0) this.tryHammer();
    if (p.skid && Math.random() < 0.4) this.puff(p.x + p.w / 2, p.y + p.h, "#e7d2b4");
    else if (p.onGround && Math.abs(p.vx) > 80 && Math.random() < 0.25)
      this.puff(p.x + 4, p.y + p.h, "#d8c2a4");
  }

  /** Standing around with nothing to hit, he gets impatient. */
  private stepIdle(dt: number) {
    const p = this.player;
    const near = (x: number) => Math.abs(x - (p.x + p.w / 2)) < 120;
    const threat =
      this.enemies.some((e) => e.alive && e.state !== "flat" && near(e.x + e.w / 2)) ||
      this.planes.some((plane) => plane.life > 0 && near(plane.x)) ||
      (this.boss?.active === true && this.boss.state !== "defeated");
    const busy =
      Object.values(this.actions).some(Boolean) ||
      !p.onGround ||
      Math.abs(p.vx) > 1 ||
      p.crouch ||
      p.freeze > 0 ||
      this.swing > 0 ||
      this.superT > 0 ||
      this.snotT > 0 ||
      this.wipe > 0 ||
      this.lecture > 0 ||
      this.hurtT > 0;
    if (busy || threat) {
      this.idleT = 0;
      return;
    }
    this.idleT += dt;
    if (this.idleT < IDLE_HARRUMPH_AT) return;
    this.idleT = 0;
    this.audio.harrumph();
    if (this.banterT <= 0 || this.banterSoft) this.say(ASIDES.anyDayNow.text, 1.6, true);
  }

  /** The slam lands with the body: plunge after the overhead load, burst on contact. */
  private stepSuper() {
    if (this.superT <= 0 || this.superHit) return;
    const u = 1 - this.superT / SUPER_SECONDS;
    if (u < SUPER_CUT_FROM) return;
    const p = this.player;
    if (!p.onGround && u < 0.92) {
      p.vy = Math.max(p.vy, 300);
      return;
    }
    this.superHit = true;
    this.superBurst();
  }

  /** Strokes, the flick and the shine each get their sound and spray. */
  private wipeFx(dt: number) {
    const u = 1 - this.wipe / WIPE_SECONDS;
    this.heat = Math.max(0, this.heat - 240 * dt);
    const stroke =
      u < WIPE_SCRUB[0]
        ? -1
        : u < WIPE_SCRUB[1]
          ? Math.floor((u - WIPE_SCRUB[0]) / 0.1)
          : u < WIPE_FLICK[0] + 0.04
            ? 5
            : u < WIPE_SHINE
              ? 6
              : 7;
    if (stroke === this.wipeStroke) return;
    this.wipeStroke = stroke;
    if (stroke >= 0 && stroke < 5) this.audio.swish();
    else if (stroke === 6) this.audio.snap();
    else if (stroke === 7) {
      this.audio.glint();
      if (this.banterT <= 0) {
        this.say(ASIDES.better.text, 1.2, true);
      }
    }
  }

  /** Condescension as crowd control: students sulk, staff stop and take it. */
  private deliverLecture() {
    const p = this.player;
    const cx = p.x + p.w / 2,
      cy = p.y + p.h / 2;
    const inReach = (b: { x: number; y: number; w: number; h: number }) => {
      const d = (b.x + b.w / 2 - cx) * p.facing;
      return d > -8 && d < 112 && Math.abs(b.y + b.h / 2 - cy) < 52;
    };
    let schooled = 0,
      frozen = 0;
    for (const s of this.students) {
      if (!inReach(s) || (s.schooled ?? 0) > 0) continue;
      s.schooled = 9;
      s.windup = 0;
      s.throwCd = Math.max(s.throwCd, 9);
      s.retort = pick(RETORTS, s.home / TILE + schooled + Math.floor(this.clock));
      s.speechT = 2.6;
      s.greeted = true;
      s.facing = cx < s.x ? -1 : 1;
      schooled++;
      this.scoreAdd(150);
      this.float(s.x, s.y - 4, "SCHOOLED");
    }
    for (const e of this.enemies) {
      if (!e.alive || e.state !== "walk" || !inReach(e)) continue;
      e.freeze = 1.8;
      e.vx = 0;
      e.alert = 0;
      e.facing = cx < e.x ? -1 : 1;
      e.line = pick(STAFF_SIGHS, e.home / TILE + frozen);
      e.speechT = 1.8;
      frozen++;
      this.scoreAdd(50);
    }
    this.heat = Math.max(0, this.heat - 15);
    if (!schooled && !frozen) return;
    this.comic(cx + p.facing * 34, p.y - 2, schooled ? "SCHOOLED!" : "LISTEN UP!", false);
    this.voice(this.audio.taunt(schooled ? "student" : "staff"));
  }

  private stepPuddles(dt: number) {
    for (const puddle of this.puddles) puddle.life -= dt;
    this.puddles = this.puddles.filter((puddle) => puddle.life > 0);
  }

  private comic(x: number, y: number, text: string, big: boolean) {
    // Keep bursts off Hammer's face: slide them clear when they would overlap it.
    const p = this.player;
    const half = text.length * (big ? 3.4 : 2) + (big ? 9 : 6);
    const faceX = p.x + p.w / 2 + p.facing * 4.5,
      faceY = p.y + 2;
    if (Math.abs(y - faceY) < (big ? 16 : 11) && Math.abs(x - faceX) < half + 8)
      x = faceX + p.facing * (half + 9);
    this.comics.push({ x, y, text, life: big ? 1.1 : 0.7, max: big ? 1.1 : 0.7, rot: (Math.random() - 0.5) * 0.3, big });
    if (this.comics.length > 6) this.comics.shift();
  }

  private impact(x: number, y: number, power = 1, word: { x: number; y: number } | null = { x, y: y - 10 }) {
    this.rings.push({ x, y, r: 3, grow: 70 * power, life: 0.26, max: 0.26, color: "#fff4d6" });
    for (let i = 0; i < 7 * power; i++) {
      const a = Math.random() * Math.PI * 2;
      this.bits.push({
        x,
        y,
        vx: Math.cos(a) * (60 + Math.random() * 90) * power,
        vy: Math.sin(a) * (50 + Math.random() * 70) * power - 40,
        life: 0.42,
        max: 0.42,
        color: i % 3 ? "#c79a62" : "#fff2cf",
        s: 1.6,
      });
    }
    if (word) this.comic(word.x, word.y, pick(IMPACT_WORDS, this.clock * 31), false);
  }

  /** Soft lines (written jabs, asides) give way to the next encounter; the rest play out. */
  private say(text: string, seconds: number, soft = false, spoken = false) {
    // A thought never talks over a recording that is still playing.
    if (!spoken && this.banterSpoken && this.banterT > 0) return;
    this.heroBanter = text;
    this.banterT = seconds;
    this.banterSoft = soft;
    this.banterSpoken = spoken;
  }

  /** A recording cut short (damage, pause, mute) takes its caption with it. */
  private hushVoice() {
    if (!this.banterSpoken) return;
    this.banterT = 0;
    this.banterSpoken = false;
  }

  /** A recorded line that actually played is captioned as speech. */
  private voice(said: unknown) {
    const line = typeof said === "string" ? TAUNT_LINES[said as TauntId] : undefined;
    if (!line) return false;
    this.say(line.text, 2, false, true);
    return true;
  }

  /** Captions the recorded line when one plays; otherwise an occasional written jab. */
  private quip(e: Pick<Enemy, "role" | "home">, said: unknown) {
    if (this.voice(said) || this.banterT > 0 || Math.random() >= 0.45) return;
    this.say(pick(STAFF_COMEBACKS[e.role ?? "office"], e.home / TILE + this.clock * 3).text, 1.6, true);
  }

  private updateStance(dt: number) {
    const p = this.player;
    p.slideT = Math.max(0, p.slideT - dt);
    const feet = p.y + p.h;
    const wantsLow =
      this.actions.down &&
      p.onGround &&
      this.wipe <= 0 &&
      this.swing <= 0 &&
      this.superT <= 0 &&
      this.snotT <= 0 &&
      this.hurtT <= 0;
    if (wantsLow && !p.crouch) {
      if (Math.abs(p.vx) > 75) {
        p.slideT = 0.48;
        p.vx = Math.sign(p.vx) * Math.max(132, Math.abs(p.vx));
        this.audio.whoosh();
      }
      p.crouch = true;
    }
    // Releasing Down under a shelf keeps the low body; stand only when it fits.
    if (
      p.crouch &&
      !wantsLow &&
      p.slideT <= 0 &&
      !this.overlapsSolid(p.x, feet - HERO_BODY_HEIGHT, p.w, HERO_BODY_HEIGHT)
    )
      p.crouch = false;
    p.h = p.crouch ? HERO_CROUCH_HEIGHT : HERO_BODY_HEIGHT;
    p.y = feet - p.h;
  }

  private slide(dt: number) {
    const p = this.player;
    p.x = this.level.flagTile * TILE - 4;
    p.vx = 0;
    p.vy = 90;
    p.prevY = p.y;
    this.moveBody(p, dt, false);
    this.flagY = Math.min(GROUND_ROW * TILE - 18, this.flagY + 70 * dt);
    if (p.onGround) {
      this.mode = "walkoff";
      p.facing = 1;
      p.vx = 74;
    }
  }

  private walkoff(dt: number) {
    const p = this.player;
    p.vx = 74;
    p.facing = 1;
    p.vy = Math.min(310, p.vy + 1980 * dt);
    p.prevY = p.y;
    this.moveBody(p, dt, false);
    p.anim += dt;
    const door = this.level.castleTile * TILE + 22;
    if (this.level.castleTile >= 0 && p.x > door) {
      this.mode = "tally";
      this.tallyHold = 0;
    }
  }

  private tickClock(dt: number) {
    if (this.level.id === "bonus") return;
    this.timeAcc += dt;
    while (this.timeAcc >= 1) {
      this.timeAcc -= 1;
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.kill();
        return;
      }
    }
  }

  private stepItems(dt: number) {
    for (const it of this.items) {
      if (it.emerge > 0) {
        const dy = 32 * dt;
        it.y -= dy;
        it.emerge -= dy;
        if (it.emerge <= 0) it.vx = 42;
        continue;
      }
      it.vy = Math.min(280, it.vy + 1700 * dt);
      this.moveBody(it, dt, false);
    }
    this.items = this.items.filter((it) => it.y < VIEW_H + 40);
  }

  private stepEnemies(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.grace = Math.max(0, e.grace - dt);
      e.anim += dt;
      e.speechT = Math.max(0, e.speechT - dt);
      if (e.state === "flat") {
        e.flatT += dt;
        if (e.flatT > 0.5) e.alive = false;
        continue;
      }
      if (!e.awake) {
        if (e.x < this.camX + VIEW_W + 12) e.awake = true;
        else continue;
      }
      if (e.x < this.camX - 64) {
        e.alive = false;
        continue;
      }
      if (e.state === "shell" && Math.abs(e.vx) < 18) {
        e.wake += dt;
        if (e.wake > 4) {
          const feet = e.y + e.h;
          const standingX = e.x + e.w / 2 - 8;
          if (!this.overlapsSolid(standingX, feet - ENEMY_BODY_HEIGHT, 16, ENEMY_BODY_HEIGHT)) {
            e.state = "walk";
            e.x = standingX;
            e.w = 16;
            e.h = ENEMY_BODY_HEIGHT;
            e.y = feet - e.h;
            e.facing = this.player.x < e.x ? -1 : 1;
            e.vx = e.facing * 36;
            e.wake = 0;
            e.grace = 0.2;
          }
        }
      } else e.wake = 0;

      if ((e.freeze ?? 0) > 0) {
        e.freeze = Math.max(0, e.freeze! - dt);
        e.vx = 0;
      } else if (e.state === "walk") {
        const distance = Math.abs(this.player.x - e.x);
        if (
          !e.greeted &&
          e.role !== "server" &&
          distance < 120 &&
          Math.abs(this.player.y - e.y) < 40
        ) {
          e.greeted = true;
          e.speechT = 2.2;
        }
        if (distance > 160) e.alerted = false;
        if (
          e.role === "server" &&
          !e.alerted &&
          distance < 100 &&
          Math.abs(this.player.y - e.y) < 40
        ) {
          e.alerted = true;
          e.alert = 0.42;
          e.speechT = 1.5;
          e.facing = this.player.x < e.x ? -1 : 1;
        }
        if (e.alert > 0) {
          e.alert = Math.max(0, e.alert - dt);
          e.vx = e.alert > 0 ? 0 : e.facing * 62;
        }
        const home = e.home ?? e.x;
        if (e.x < home - 48 || e.x > home + 48) {
          e.facing = e.x < home ? 1 : -1;
          e.vx = e.facing * (e.role === "server" && e.alerted ? 62 : 30);
        }
      }

      const attempt = e.vx;
      e.vy = Math.min(280, e.vy + 1700 * dt);
      const hit = this.moveBody(e, dt, false);
      if (hit != null && Math.abs(attempt) > 8) {
        const tx = hit % 10000;
        const ty = Math.floor(hit / 10000);
        if (e.state === "shell" && Math.abs(attempt) > 80) {
          this.hitBlock(tx, ty, true);
          e.vx = -attempt;
        } else if (e.state === "walk") {
          e.vx = -attempt;
        }
        e.facing = e.vx >= 0 ? 1 : -1;
      }
      if (e.state === "walk" && e.onGround) {
        const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        const tx = Math.floor(ahead / TILE);
        const ty = Math.floor((e.y + e.h + 2) / TILE);
        const under = this.tileAt(tx, ty);
        if (!isSolid(under) && under !== ID.ledge) {
          e.vx = -e.vx || -34;
          e.facing = e.vx >= 0 ? 1 : -1;
        }
        const feet = e.y + e.h;
        const puddle = this.puddles.find(
          (pd) => Math.abs(pd.y - feet) < 3 && e.x + e.w > pd.x - pd.w / 2 && e.x < pd.x + pd.w / 2,
        );
        if (puddle && Math.abs(e.vx) > 4) {
          puddle.life = Math.min(puddle.life, 1.2);
          this.stun(e);
          this.comic(e.x + e.w / 2, e.y - 6, "WHOA!", false);
          this.audio.slip();
          this.scoreAdd(150);
        }
      }
      if (e.y > VIEW_H + 32) e.alive = false;
      if (e.state === "shell" && Math.abs(e.vx) > 40) this.shellHits(e);
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private stepStudents(dt: number) {
    this.banterT = Math.max(0, this.banterT - dt);
    for (const student of this.students) {
      student.speechT = Math.max(0, student.speechT - dt);
      student.throwCd = Math.max(0, student.throwCd - dt);
      const sulking = (student.schooled ?? 0) > 0;
      if (sulking) {
        student.schooled = Math.max(0, student.schooled! - dt);
        if (!student.schooled) student.vx = student.facing * 13;
      } else {
        if (student.x < student.home - 16 || student.x > student.home + 16) student.vx *= -1;
        student.facing = student.vx > 0 ? 1 : -1;
      }
      student.vy = Math.min(280, student.vy + 1700 * dt);
      const pace = student.vx;
      if (sulking) student.vx = 0;
      this.moveBody(student, dt, false);
      if (sulking) student.vx = pace;
      if (
        !sulking &&
        student.throws &&
        this.mode === "play" &&
        Math.abs(this.player.x - student.x) < 210 &&
        Math.abs(this.player.y - student.y) < 65
      ) {
        if (student.windup > 0) {
          student.windup = Math.max(0, student.windup - dt);
          if (student.windup === 0) {
            const dir = this.player.x < student.x ? -1 : 1;
            this.planes.push({
              x: student.x + student.w / 2,
              y: student.y + student.h - 36,
              ox: student.x,
              oy: student.y,
              vx: dir * 112,
              life: 3.5,
              phase: student.home,
            });
            student.throwCd = 4 + ((student.home / TILE) % 3) * 0.6;
            this.audio.whoosh();
          }
        } else if (student.throwCd <= 0 && this.planes.length < 8) {
          student.windup = 0.65;
          student.facing = this.player.x < student.x ? -1 : 1;
        }
      }
      if (
        !student.greeted &&
        this.mode === "play" &&
        (this.banterT <= 0 || this.banterSoft) &&
        Math.abs(this.player.x - student.x) < 75
      ) {
        student.greeted = true;
        student.speechT = 4.2;
        if (!this.voice(this.audio.taunt("student"))) this.say(student.hammer.text, 2.1);
      }
    }
  }

  private stepPlanes(dt: number) {
    for (const plane of this.planes) {
      if (plane.life <= 0) continue;
      plane.life -= dt;
      plane.ox = plane.x;
      plane.oy = plane.y;
      plane.x += plane.vx * dt;
      plane.y += Math.sin(this.clock * 5 + plane.phase) * 3 * dt;
      const a = { x: plane.ox, y: plane.oy },
        b = { x: plane.x, y: plane.y };
      this.eachCell(
        Math.min(a.x, b.x) - 3,
        Math.min(a.y, b.y) - 2,
        Math.abs(b.x - a.x) + 6,
        Math.abs(b.y - a.y) + 4,
        (tx, ty) => {
          if (isSolid(this.tileAt(tx, ty))) plane.life = 0;
        },
      );
      if (plane.life > 0 && this.mode === "play" && sweptHeadHits(a, b, 2, this.player)) {
        plane.life = 0;
        this.flyPapers(plane.x, plane.y, 3);
        this.hurt({ x: plane.x, w: 8 });
      }
    }
    this.planes = this.planes.filter((plane) => plane.life > 0);
  }

  private stepBoss(dt: number) {
    const b = this.boss,
      arena = this.level.boss;
    if (!b || !arena || this.mode !== "play") return;
    b.hurt = Math.max(0, b.hurt - dt);
    if (b.state === "defeated") {
      b.timer = Math.max(0, b.timer - dt);
      return;
    }
    const left = arena.arenaStart * TILE,
      right = arena.arenaEnd * TILE;
    if (!b.active) {
      if (this.player.x < left) return;
      b.active = true;
      b.state = "windup";
      b.timer = 1.1;
      b.facing = this.player.x < b.x ? -1 : 1;
      this.checkpoint = left;
      this.grow(2);
      this.player.invuln = Math.max(1.2, this.player.invuln);
      this.float(this.player.x, this.player.y - 12, "PIG FIGHT");
    }
    this.player.x = clamp(this.player.x, left + 2, this.level.flagTile * TILE - this.player.w - 4);
    b.refill = Math.max(0, b.refill - dt);
    if (this.player.form < 2 && b.refill <= 0 && !this.items.some((item) => item.kind === "lamp")) {
      this.items.push({
        kind: "lamp",
        x: left + 24,
        y: 176,
        w: 14,
        h: 16,
        vx: 0,
        vy: 0,
        onGround: true,
        emerge: 0,
      });
      b.refill = 3;
    }
    b.timer -= dt;
    if (b.state === "windup" && b.timer <= 0) {
      b.attacks++;
      b.state = b.attacks % 3 === 0 ? "hop" : "charge";
      b.vx = b.facing * (b.state === "hop" ? 78 : b.hp <= b.max / 2 ? 160 : 136);
      if (b.state === "hop") {
        b.vy = -270;
        b.onGround = false;
      }
      b.timer = b.state === "hop" ? 1.15 : 0.85;
      this.audio.bump();
    } else if ((b.state === "charge" || b.state === "hop") && b.timer <= 0) {
      b.state = "recover";
      b.vx = 0;
      b.timer = 1.35;
    } else if (b.state === "recover" && b.timer <= 0) {
      b.state = "windup";
      b.timer = b.hp <= b.max / 2 ? 0.7 : 0.9;
      // Lock the direction during the warning; turn back into the arena at its edges.
      b.facing = b.x < left + 140 ? 1 : b.x + b.w > right - 70 ? -1 : this.player.x < b.x ? -1 : 1;
    }
    b.vy = Math.min(310, b.vy + 1050 * dt);
    this.moveBody(b, dt, false);
    if (b.x < left + 80 || b.x + b.w > right - 8) {
      b.x = clamp(b.x, left + 80, right - b.w - 8);
      b.vx = 0;
      if (b.state === "charge") {
        b.state = "recover";
        b.timer = 1.35;
      }
    }
    if (overlap(this.player, b)) {
      if (this.player.vy > 0 && this.player.prevY + this.player.h <= b.y + 10) {
        this.player.vy = -260;
        this.player.onGround = false;
        this.audio.bump();
      } else this.hurt(b);
    }
  }

  private hitBoss(kind: "bonk" | "snot", amount: number, x: number, y: number) {
    const b = this.boss;
    if (!b || !b.active || b.state === "defeated" || b.hurt > 0) return false;
    b.hurt = 0.38;
    if (kind === "bonk") b.bonks++;
    else b.snots++;
    b.hp = Math.max(0, b.hp - amount);
    this.audio.thud();
    this.shake = Math.max(this.shake, 0.065);
    this.voice(this.audio.taunt("pig"));
    this.hitstop = 0.04;
    this.float(x, y, kind === "bonk" ? "BONK!" : "SNOT!");
    for (let i = 0; i < 7; i++)
      this.bits.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 95,
        vy: -25 - Math.random() * 65,
        life: 0.5,
        max: 0.5,
        color: i % 2 ? "#f7cedc" : "#fff0e9",
        s: 2,
      });
    if (b.hp <= 0 && (b.bonks < 3 || b.snots < 3)) {
      b.hp = 1;
      this.float(b.x, b.y - 8, b.bonks < 3 ? "MORE BONKS" : "MORE SNOT");
    } else if (b.hp <= 0) {
      b.state = "defeated";
      b.timer = 2.5;
      b.vx = b.vy = 0;
      this.scoreAdd(3000);
      this.float(b.x, b.y - 8, "STUFFING SETTLED");
      this.audio.clear();
      this.flyPapers(b.x + b.w / 2, b.y + 20, 16);
    }
    return true;
  }

  private shellHits(e: Enemy) {
    for (const o of this.enemies) {
      if (o === e || !o.alive || o.state === "flat") continue;
      if (!overlap(e, o)) continue;
      o.alive = false;
      const pts = CHAIN[Math.min(e.chain, CHAIN.length - 1)];
      e.chain += 1;
      this.scoreAdd(pts);
      this.float(o.x, o.y, e.chain >= 8 ? "1UP" : String(pts));
      this.audio.kick();
      if (e.chain >= 8) {
        this.lives += 1;
        this.audio.oneUp();
        e.chain = 0;
      }
    }
  }

  private stepEmbers(dt: number) {
    for (const b of this.embers) {
      b.life -= dt;
      b.ox = b.x;
      b.oy = b.y;
      b.vy += 250 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const a = { x: b.ox, y: b.oy },
        end = { x: b.x, y: b.y };
      let blocked = false;
      let floor: number | null = null;
      this.eachCell(
        Math.min(a.x, end.x) - 2,
        Math.min(a.y, end.y) - 2,
        Math.abs(end.x - a.x) + 4,
        Math.abs(end.y - a.y) + 4,
        (tx, ty) => {
          const id = this.tileAt(tx, ty);
          if (!isSolid(id) && id !== ID.ledge) return;
          blocked = true;
          if (b.vy > 0 && a.y <= ty * TILE + 1) floor = ty * TILE;
        },
      );
      if (!blocked)
        for (const e of this.enemies) {
          if (!e.alive || e.state === "flat" || b.hit?.has(e)) continue;
          if (!sweptHeadHits(a, end, b.hot ? 3 : 2, e)) continue;
          this.splat(e, b);
          if ((b.pierce ?? 0) > 0) {
            b.pierce!--;
            b.hit?.add(e);
            continue;
          }
          blocked = true;
          break;
        }
      if (
        !blocked &&
        this.boss?.active &&
        this.boss.state !== "defeated" &&
        sweptHeadHits(a, end, 2, this.boss)
      ) {
        this.hitBoss("snot", 1, b.x, b.y);
        blocked = true;
      }
      if (blocked) {
        b.life = 0;
        this.splashes.push({ x: b.x, y: floor ?? b.y, life: 0.8 });
        if (floor != null) {
          // Landed snot stays on the floor as a slip hazard for the staff.
          this.puddles.push({ x: b.x, y: floor, w: b.hot ? 22 : 15, life: b.hot ? 9 : 7, max: b.hot ? 9 : 7 });
          if (this.puddles.length > 6) this.puddles.shift();
        }
        this.audio.splat();
      }
    }
    this.embers = this.embers.filter((b) => b.life > 0 && b.y < VIEW_H + 20);
  }

  private collectCoins() {
    const p = this.player;
    this.eachCell(p.x, p.y, p.w, p.h, (tx, ty) => {
      if (this.tileAt(tx, ty) === ID.coin) {
        this.setTile(tx, ty, ID.empty);
        this.popCoin(tx, ty);
      } else if (this.tileAt(tx, ty) === ID.nut) {
        this.setTile(tx, ty, ID.empty);
        this.grantNuts(tx * TILE, ty * TILE);
      } else if (this.tileAt(tx, ty) === ID.buc) {
        this.setTile(tx, ty, ID.empty);
        this.startTreat();
      }
    });
  }

  private collectItems() {
    const p = this.player;
    this.items = this.items.filter((it) => {
      if (it.emerge > 0 || !overlap(p, it)) return true;
      if (it.kind === "gear") {
        if (p.form === 0) this.grow(1);
        else this.bonusPoints();
      } else if (it.kind === "lamp") {
        if (p.form < 2) this.grow(2);
        else this.bonusPoints();
      } else if (it.kind === "nuts") {
        this.grantNuts(it.x, it.y);
      } else {
        this.startTreat();
      }
      return false;
    });
  }

  private touchEnemies() {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive || e.state === "flat" || !overlap(p, e)) continue;
      if (this.star > 0) {
        e.alive = false;
        this.scoreAdd(200);
        this.float(e.x, e.y, "200");
        this.audio.kick();
        this.shake = Math.max(this.shake, 0.05);
        continue;
      }
      const prevBottom = p.prevY + p.h;
      const stomp = p.vy > 0 && prevBottom <= e.y + 10;
      if (stomp) {
        p.vy = this.jumpHeld ? -300 : -200;
        p.onGround = false;
        e.grace = 0.16;
        this.flyPapers(e.x + e.w / 2, e.y, 4);
        if (e.kind === "soot") {
          e.state = "flat";
          e.flatT = 0;
          this.noteVictory(e, 100);
        } else if (e.state === "walk") {
          this.stun(e);
          this.noteVictory(e, 100);
        } else this.kick(e);
        this.audio.bump();
      } else if (e.grace <= 0) {
        if (e.state === "shell" && Math.abs(e.vx) < 24) this.kick(e);
        else this.hurt(e);
      }
    }
  }

  private stun(e: Enemy) {
    const center = e.x + e.w / 2,
      feet = e.y + e.h;
    e.state = "shell";
    e.w = 34;
    e.h = 27;
    e.x = center - e.w / 2;
    e.y = feet - e.h;
    e.vx = 0;
    e.chain = 0;
    e.wake = 0;
  }

  private kick(e: Enemy) {
    const dir = this.player.x + this.player.w / 2 < e.x + e.w / 2 ? 1 : -1;
    e.state = "shell";
    e.vx = dir * 220;
    e.facing = dir;
    e.grace = 0.14;
    e.wake = 0;
    this.audio.kick();
  }

  private noteVictory(e: Enemy, pts: number) {
    this.scoreAdd(pts);
    this.float(e.x, e.y, String(pts));
    if (this.charge < 10) {
      this.charge += 1;
      if (this.charge >= 10) {
        this.float(this.player.x, this.player.y - 18, "SUPER");
        this.audio.power();
      }
    }
  }

  private splat(e: Enemy, from?: Ember) {
    if (!e.alive || e.state === "flat") return;
    e.alive = false;
    this.noteVictory(e, 100);
    this.tumble(e, Math.sign(from?.vx ?? this.player.facing) || 1, true);
    this.audio.stomp();
  }

  private tumble(e: Enemy, dir: number, slimed: boolean) {
    this.tumbles.push({
      role: e.role ?? "office",
      x: e.x + e.w / 2,
      feet: e.y + e.h,
      vx: dir * (slimed ? 60 : 165),
      vy: slimed ? -110 : -235,
      rot: 0,
      spin: dir * (slimed ? 4.5 : 11),
      life: slimed ? 1.1 : 0.95,
      slimed,
    });
  }

  private tryHammer() {
    const u = 1 - this.swing / SWING_SECONDS;
    const last = this.hammerLast == null || this.hammerLast > u ? u : this.hammerLast;
    this.hammerLast = u;
    const [lo, hi] = SWING_ACTIVE;
    if (u < lo || last > hi) return;
    // Sample the drawn arc between checks; the strike covers it faster than a frame.
    const from = Math.max(last, lo),
      to = Math.min(u, hi);
    const pose = this.heroPose();
    const steps = Math.max(1, Math.ceil((to - from) / 0.008));
    const path: Point[] = [];
    for (let k = 0; k <= steps; k++)
      path.push(heroMallet({ ...pose, swing: SWING_SECONDS * (1 - (from + ((to - from) * k) / steps)) }, true));
    const head = path[path.length - 1];
    for (const e of this.enemies) {
      if (!e.alive || e.state === "flat" || this.hammerVictims.has(e) || !pathHits(path, 5, e))
        continue;
      this.hammerVictims.add(e);
      this.hitstop = 0.06;
      this.shake = Math.max(this.shake, 0.09);
      this.flyPapers(head.x, head.y, 5);
      this.impact(head.x, head.y, 1, { x: e.x + e.w / 2 + this.player.facing * 8, y: e.y - 8 });
      this.audio.bonk();
      this.quip(e, this.audio.taunt("staff"));
      if (e.kind === "soot") {
        e.state = "flat";
        e.flatT = 0;
        e.alive = false;
        this.tumble(e, this.player.facing, false);
        this.noteVictory(e, 100);
      } else if (e.state === "walk") {
        this.stun(e);
        this.noteVictory(e, 100);
      } else this.kick(e);
    }
    if (!this.hammerBossTagged && this.boss && pathHits(path, 5, this.boss)) {
      this.hammerBossTagged = this.hitBoss("bonk", 1, head.x, head.y);
      if (this.hammerBossTagged) this.impact(head.x, head.y, 1.2, null);
    }
    for (const plane of this.planes) {
      if (plane.life > 0 && pathHits(path, 6, { x: plane.x - 4, y: plane.y - 2, w: 8, h: 4 })) {
        plane.life = 0;
        this.flyPapers(plane.x, plane.y, 3);
        this.comic(plane.x, plane.y - 8, "SWAT!", false);
        this.audio.thud();
        this.scoreAdd(50);
        this.voice(this.audio.taunt("student"));
      }
    }
    const xs = path.map((q) => q.x),
      ys = path.map((q) => q.y);
    const minX = Math.min(...xs),
      minY = Math.min(...ys);
    this.eachCell(
      minX - 5,
      minY - 5,
      Math.max(...xs) - minX + 10,
      Math.max(...ys) - minY + 10,
      (tx, ty) => {
        const id = this.tileAt(tx, ty),
          key = `${tx},${ty}`;
        if (
          ![ID.brick, ID.brickCoin, ID.question, ID.power, ID.hidden, ID.treat].includes(
            id as never,
          ) ||
          this.hammerBlocks.has(key)
        )
          return;
        if (!pathHits(path, 5, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE })) return;
        this.hammerBlocks.add(key);
        this.hitBlock(tx, ty, true);
      },
    );
  }

  private startSuper() {
    const p = this.player;
    this.charge = 0;
    this.superT = SUPER_SECONDS;
    this.superHit = false;
    this.swing = 0;
    p.vy = -260;
    p.onGround = false;
    this.audio.power();
    this.shake = Math.max(this.shake, 0.08);
    this.flyPapers(p.x + p.w / 2, p.y, 10);
    this.say(ASIDES.hammerTime.text, 1.1, true);
  }

  private superBurst() {
    const p = this.player;
    const cx = p.x + p.w / 2 + p.facing * 10;
    const cy = p.y + p.h * 0.55;
    const floor = p.y + p.h;
    const slam = heroMallet(this.heroPose());
    this.hitstop = 0.08;
    for (const [grow, color] of [
      [150, "#fff3d0"],
      [105, "#e9b866"],
      [62, "#ffffff"],
    ] as const)
      this.rings.push({ x: slam.x, y: floor, r: 4, grow, life: 0.42, max: 0.42, color, floor: true });
    this.comic(cx, p.y - 16, "HAMMER TIME!", true);
    // The hop's thought gives way to the burst so the two never stack.
    if (this.banterT > 0 && !this.banterSpoken && this.heroBanter === ASIDES.hammerTime.text) this.banterT = 0;
    this.audio.boom();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.bits.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * (46 + (i % 3) * 28),
        vy: Math.sin(a) * (36 + (i % 4) * 16) - 30,
        life: 0.6,
        max: 0.6,
        color: i % 2 === 0 ? "#d4783c" : "#e7d2b4",
        s: i % 2 === 0 ? 4 : 3,
      });
    }
    this.shake = 0.32;
    this.flyPapers(cx, cy, 12);
    const x0 = Math.floor((cx - 36) / TILE);
    const x1 = Math.floor((cx + 36) / TILE);
    const y0 = Math.floor((cy - 28) / TILE);
    const y1 = Math.floor((cy + 18) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = this.tileAt(tx, ty);
        if (id !== ID.brick && id !== ID.brickCoin) continue;
        if (id === ID.brickCoin) this.popCoin(tx, ty);
        this.setTile(tx, ty, ID.empty);
        this.shards(tx, ty);
        this.scoreAdd(50);
      }
    }
    for (const e of this.enemies) {
      if (!e.alive || e.state === "flat") continue;
      const dx = e.x + e.w / 2 - cx;
      const dy = e.y + e.h / 2 - cy;
      if (dx * dx + dy * dy > 54 * 54) continue;
      e.alive = false;
      this.tumble(e, dx < 0 ? -1 : 1, false);
      this.scoreAdd(200);
      this.float(e.x, e.y, "200");
    }
    if (
      this.boss &&
      Math.hypot(this.boss.x + this.boss.w / 2 - cx, this.boss.y + this.boss.h / 2 - cy) < 80
    )
      this.hitBoss("bonk", 2, cx, cy);
  }

  private questContext(rng: () => number): QuestContext {
    return {
      audio: this.audio,
      images: {
        server: this.server,
        hotelStaff: this.hotelStaff,
        student: this.student,
        worker: this.worker,
        nurse: this.nurse,
        coke: this.zeroCan,
        nuts: this.nuts,
        buccees: this.beaver,
        wood: this.wood,
        steel: this.steel,
      },
      drawHero: (ctx, pose, cam = 0) => drawHero(ctx, this.heroAssets(), pose, cam),
      rng,
      say: (text, seconds) => this.say(text, seconds, true),
      comic: (x, y, text, big) => this.comic(x, y, text, big),
      reduced: this.reduce,
    };
  }

  private startQuest(id: QuestId, opts: { table?: string; practice: boolean; returnX: number }) {
    const make = QUESTS[id];
    if (!make) return false;
    const quest = make();
    const seed = (this.runSeed ^ Math.floor(opts.returnX * 7919)) >>> 0;
    quest.enter(this.questContext(seededRandom(seed)), { table: opts.table, practice: opts.practice });
    this.quest = quest;
    this.questInfo = { id, practice: opts.practice, returnX: opts.returnX };
    this.questResult = null;
    this.questPressed = blank();
    this.questPrev = { ...blank(), ...this.actions };
    this.comics = [];
    this.banterT = 0;
    this.curse = 0;
    this.mode = "card";
    this.cardNext = "quest";
    this.cardT = 1.65;
    return true;
  }

  /** Practice from the title: no run, back to the title after the tally. */
  newQuest(id: QuestId) {
    if (this.mode !== "title" && this.mode !== "over" && this.mode !== "win") return;
    this.audio.unlock();
    this.loadLevel(this.courses[0], 1, 0, true);
    if (this.startQuest(id, { table: "banquet", practice: true, returnX: 0 }))
      this.audio.startMusic("day");
  }

  /** The unspent, unlocked side-quest door Hammer stands in front of. */
  private doorInFront() {
    const p = this.player,
      cx = p.x + p.w / 2;
    return this.level.doors.find(
      (door) =>
        !door.locked &&
        !this.spentDoors.has(`${this.level.id}:${door.x}`) &&
        Math.abs(cx - (door.x * TILE + DOOR_W / 2)) <= DOOR_W / 2,
    );
  }

  private tryDoor() {
    const p = this.player;
    if (!this.actions.down || !p.onGround || this.swing > 0 || this.superT > 0) return;
    if (this.mode !== "play") return;
    const door = this.doorInFront();
    if (!door) return;
    this.spentDoors.add(`${this.level.id}:${door.x}`);
    this.startQuest(door.quest, { table: door.table, practice: false, returnX: p.x });
  }

  private stepQuest(dt: number) {
    const q = this.quest!;
    const pressed = this.questPressed;
    this.questPressed = blank();
    q.step(dt, { held: { ...blank(), ...this.actions }, pressed });
    this.banterT = Math.max(0, this.banterT - dt);
    const done = q.result();
    if (!done) return;
    this.questResult = done;
    this.mode = "questTally";
    this.audio.stopMusic();
    this.audio.clear();
  }

  /** Continue from the tally: pay out and go back to the door, or back to the title. */
  finishQuest() {
    const q = this.quest,
      r = this.questResult,
      info = this.questInfo;
    if (this.mode !== "questTally" || !q || !r || !info) return;
    // The key that closed the tally is still down: it must not jump, swing or fire on return.
    this.prevJump = this.prevFire = this.prevHammer = this.prevTowel = true;
    this.prevSuper = this.prevLecture = true;
    q.exit();
    this.quest = null;
    this.questResult = null;
    this.questInfo = null;
    this.comics = [];
    this.banterT = 0;
    if (info.practice) {
      this.hooks.onQuestRecord?.(info.id, r.score);
      this.mode = "title";
      return;
    }
    this.scoreAdd(r.score);
    this.addZeros(r.coins);
    this.charge = Math.min(10, this.charge + r.charge);
    this.lives += r.lives;
    if (r.hot || r.fullBelly) this.player.form = 2;
    const p = this.player,
      feet = p.y + p.h;
    p.x = info.returnX;
    p.vx = 0;
    p.vy = 0;
    p.crouch = false;
    p.slideT = 0;
    p.h = HERO_BODY_HEIGHT;
    p.y = feet - p.h;
    p.onGround = true;
    p.invuln = Math.max(p.invuln, 0.6);
    this.idleT = 0;
    if (r.star) this.startTreat();
    this.audio.startMusic(this.level.music);
    this.mode = "play";
  }

  private renderQuest() {
    this.paintStage(0, false, "hotel");
    this.quest!.render(this.ctx, this.clock);
    this.drawHeroLine(0);
    this.drawComics(0);
    this.gradeStage();
  }

  private drawDoors(cam: number) {
    const ctx = this.ctx,
      base = GROUND_ROW * TILE,
      front = this.doorInFront();
    for (const door of this.level.doors) {
      const x = door.x * TILE - cam;
      if (x < -DOOR_W || x > VIEW_W) continue;
      const spent = this.spentDoors.has(`${this.level.id}:${door.x}`);
      ctx.save();
      ctx.fillStyle = "#2a1d14";
      ctx.fillRect(x - 3, base - 66, DOOR_W + 6, 66);
      ctx.fillStyle = spent ? "#4a3424" : "#6b4428";
      ctx.fillRect(x, base - 58, DOOR_W / 2 - 0.5, 58);
      ctx.fillRect(x + DOOR_W / 2 + 0.5, base - 58, DOOR_W / 2 - 0.5, 58);
      ctx.fillStyle = "rgba(255,236,200,0.12)";
      ctx.fillRect(x + 3, base - 54, DOOR_W / 2 - 6, 50);
      ctx.fillRect(x + DOOR_W / 2 + 3, base - 54, DOOR_W / 2 - 6, 50);
      ctx.fillStyle = "#d9b45a";
      ctx.fillRect(x + DOOR_W / 2 - 3, base - 30, 1.5, 8);
      ctx.fillRect(x + DOOR_W / 2 + 1.5, base - 30, 1.5, 8);
      ctx.font = "800 5px 'Segoe UI',sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8c060";
      ctx.fillText(door.label, x + DOOR_W / 2, base - 60);
      if (spent) {
        ctx.fillStyle = "#f4efe4";
        ctx.fillRect(x + 8, base - 48, DOOR_W - 16, 8);
        ctx.fillStyle = "#2a1d14";
        ctx.font = "700 3.4px 'Segoe UI',sans-serif";
        ctx.fillText("THANK YOU", x + DOOR_W / 2, base - 42.6);
      } else if (door === front) {
        ctx.fillStyle = `rgba(255,229,152,${0.6 + 0.4 * Math.sin(this.clock * 6)})`;
        ctx.font = "900 9px 'Segoe UI',sans-serif";
        ctx.fillText("↓", x + DOOR_W / 2, base - 70);
      }
      ctx.restore();
    }
  }

  private tryPipe() {
    if (!this.actions.down || this.player.pipeLock > 0 || !this.player.onGround) return;
    const feet = this.player.y + this.player.h;
    for (const pipe of this.level.pipes) {
      if (!pipe.dest) continue;
      if (Math.abs(feet - pipe.top) > 3) continue;
      if (this.player.x + this.player.w < pipe.x + 4 || this.player.x > pipe.x + 28) continue;
      this.fade = 1;
      if (pipe.dest === "bonus") this.enterBonus(pipe);
      else this.exitBonus();
      return;
    }
  }

  private tryFlag() {
    if (this.boss && this.boss.state !== "defeated") return;
    if (this.level.flagTile < 0) return;
    const fx = this.level.flagTile * TILE;
    if (this.player.x + this.player.w > fx + 2 && this.player.y < GROUND_ROW * TILE)
      this.beginSlide();
  }

  private beginSlide() {
    const headroom = GROUND_ROW * TILE - this.player.y;
    let pts = 100;
    if (headroom > 120) pts = 4000;
    else if (headroom > 88) pts = 2000;
    else if (headroom > 56) pts = 800;
    else if (headroom > 28) pts = 400;
    this.scoreAdd(pts);
    this.float(this.player.x, this.player.y, String(pts));
    this.audio.clear();
    this.audio.stopMusic();
    this.mode = "walkoff";
    const feet = this.player.y + this.player.h;
    this.player.crouch = false;
    this.player.slideT = 0;
    this.player.h = HERO_BODY_HEIGHT;
    this.player.y = feet - this.player.h;
    this.player.vx = 74;
    this.player.facing = 1;
  }

  private enterBonus(pipe: { x: number; top: number }) {
    this.snap = {
      level: this.level,
      tiles: this.tiles.slice(),
      enemies: this.enemies.map((e) => ({ ...e })),
      students: this.students.map((s) => ({ ...s })),
      items: this.items.map((it) => ({ ...it })),
      player: { ...this.player },
      camX: this.camX,
      timeLeft: this.timeLeft,
      timeAcc: this.timeAcc,
      returnX: pipe.x + 6,
      returnTop: pipe.top,
    };
    const form = this.player.form;
    this.loadLevel(this.bonus, form, 0.4, false);
    this.audio.startMusic("cellar");
    this.mode = "play";
  }

  private exitBonus() {
    const s = this.snap;
    if (!s) return;
    this.level = s.level;
    this.tiles = s.tiles;
    this.enemies = s.enemies;
    this.students = s.students;
    this.items = s.items;
    const form = this.player.form;
    this.player = s.player;
    this.player.form = form;
    this.camX = s.camX;
    this.timeLeft = s.timeLeft;
    this.timeAcc = s.timeAcc;
    const h = this.player.h;
    this.player.x = s.returnX;
    this.player.y = s.returnTop - h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.pipeLock = 0.55;
    this.player.invuln = Math.max(this.player.invuln, 0.4);
    this.snap = null;
    this.embers = [];
    this.planes = [];
    this.puddles = [];
    this.tumbles = [];
    this.snotT = 0;
    this.snotFired = false;
    this.audio.startMusic(this.level.music);
    this.mode = "play";
  }

  private followCamera(dt: number) {
    if (this.mode === "die") return;
    const max = Math.max(0, this.level.w * TILE - VIEW_W);
    const desired =
      this.boss?.active && this.boss.state !== "defeated"
        ? clamp((this.player.x + this.boss.x + this.boss.w / 2) / 2 - VIEW_W / 2, 0, max)
        : clamp(this.player.x - VIEW_W * 0.32, 0, max);
    this.camX = approach(this.camX, desired, 480 * dt);
    this.player.x = Math.max(0, this.player.x);
  }

  private kill(quiet = false) {
    if (
      this.mode === "die" ||
      this.mode === "over" ||
      this.mode === "tally" ||
      this.mode === "slide" ||
      this.mode === "walkoff"
    )
      return;
    this.mode = "die";
    this.dieT = 1.6;
    this.player.vy = -250;
    this.player.vx = 0;
    this.snap = null;
    this.audio.stopMusic();
    if (!quiet) {
      this.curse = 1.6;
      this.audio.curse();
      this.hushVoice();
    }
    this.swing = this.superT = this.snotT = this.lecture = 0;
    this.shake = 0.18;
    this.star = 0;
    this.heat = 0;
    this.wipe = 0;
  }

  private resolveDeath() {
    if (this.mode !== "die") return;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.mode = "over";
      this.audio.stopMusic();
      this.hooks.onRecord(this.score);
      return;
    }
    this.loadLevel(this.courses[this.levelIndex], 1, 1.3, true);
    if (this.checkpoint) {
      this.player.x = this.checkpoint;
      this.camX = clamp(this.checkpoint - VIEW_W * 0.32, 0, this.level.w * TILE - VIEW_W);
    }
    this.audio.startMusic(this.level.music);
    this.mode = "card";
    this.cardT = 1.55;
  }

  private advance() {
    if (this.mode !== "tally") return;
    const form = this.player.form;
    const next = this.levelIndex + 1;
    if (next >= this.courses.length) {
      this.mode = "win";
      this.audio.stopMusic();
      this.hooks.onRecord(this.score);
      return;
    }
    this.levelIndex = next;
    this.checkpoint = 0;
    this.loadLevel(this.courses[next], form, 0, true);
    this.audio.startMusic(this.level.music);
    this.mode = "card";
    this.cardT = 1.65;
  }

  private loadLevel(src: Level, form: 0 | 1 | 2, invuln: number, resetTime: boolean) {
    this.curse = 0;
    this.level = src;
    this.tiles = new Uint8Array(src.tiles);
    const h = HERO_BODY_HEIGHT;
    this.player = {
      x: src.spawnX,
      y: GROUND_ROW * TILE - h,
      w: HERO_BODY_WIDTH,
      h,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      form,
      coyote: 0,
      jumpBuf: 0,
      invuln,
      anim: 0,
      skid: false,
      land: 0,
      prevY: GROUND_ROW * TILE - h,
      pipeLock: 0.3,
      freeze: 0,
      crouch: false,
      slideT: 0,
    };
    this.enemies = src.enemies.map((sp) => ({
      kind: sp.kind,
      role: sp.role,
      home: sp.x * TILE,
      alert: 0,
      alerted: false,
      speechT: 0,
      x: sp.x * TILE,
      y: GROUND_ROW * TILE - ENEMY_BODY_HEIGHT,
      w: 16,
      h: ENEMY_BODY_HEIGHT,
      vx: sp.kind === "shell" ? -34 : -30,
      vy: 0,
      onGround: false,
      alive: true,
      state: "walk",
      awake: false,
      flatT: 0,
      facing: -1,
      chain: 0,
      grace: 0,
      anim: 0,
      wake: 0,
      line: pick(STAFF_LINES[sp.role], sp.x),
      greeted: false,
      freeze: 0,
    }));
    this.students = src.students.map((s) => ({
      ...s,
      x: s.x * TILE,
      home: s.x * TILE,
      y: GROUND_ROW * TILE - ENEMY_BODY_HEIGHT,
      w: 14,
      h: ENEMY_BODY_HEIGHT,
      vx: -13,
      vy: 0,
      onGround: false,
      facing: -1,
      greeted: false,
      speechT: 0,
      throwCd: s.delay ?? 3,
      windup: 0,
    }));
    this.planes = [];
    this.boss = src.boss
      ? {
          x: src.boss.x * TILE,
          y: 192 - 92,
          w: 54,
          h: 92,
          vx: 0,
          vy: 0,
          onGround: true,
          hp: src.boss.hp,
          max: src.boss.hp,
          active: false,
          bonks: 0,
          snots: 0,
          state: "idle",
          timer: 0,
          hurt: 0,
          facing: -1,
          attacks: 0,
          refill: 0,
        }
      : null;
    this.heroBanter = "";
    this.banterT = 0;
    this.banterSoft = false;
    this.banterSpoken = false;
    this.idleT = 0;
    this.items = [];
    this.embers = [];
    this.splashes = [];
    this.puddles = [];
    this.rings = [];
    this.comics = [];
    this.tumbles = [];
    this.heat = 0;
    this.wipe = 0;
    this.hurtT = 0;
    this.swing = 0;
    this.superT = 0;
    this.snotT = 0;
    this.snotFired = false;
    this.lecture = 0;
    this.lectureCd = 0;
    this.sinus = 3;
    this.bits = [];
    this.sheets = [];
    this.texts = [];
    this.bumps.clear();
    this.camX = 0;
    this.flagY = 36;
    if (resetTime) {
      this.timeLeft = src.time;
      this.timeAcc = 0;
    }
  }

  private grow(next: 1 | 2) {
    const p = this.player;
    p.form = next;
    p.invuln = Math.max(p.invuln, 0.9);
    this.scoreAdd(1000);
    this.float(p.x, p.y, next === 2 ? "HOT SNOT" : "1000");
    this.audio.power();
  }

  private bonusPoints() {
    this.scoreAdd(1000);
    this.float(this.player.x, this.player.y, "1000");
    this.audio.power();
  }

  private shrink() {
    this.player.form = this.player.form > 1 ? 1 : 0;
    this.player.invuln = 1.45;
  }

  private hurt(from: { x: number; w: number }) {
    if (this.star > 0 || this.player.invuln > 0 || this.mode !== "play") return;
    const p = this.player;
    const dir = p.x + p.w / 2 < from.x + from.w / 2 ? -1 : 1;
    this.curse = 1.6;
    this.swing = this.superT = this.snotT = this.wipe = this.lecture = 0;
    this.fireEdge = this.hammerEdge = this.towelEdge = this.superEdge = this.lectureEdge = false;
    this.hurtT = 0.18;
    this.hitstop = 0.04;
    this.shake = 0.12;
    this.audio.curse();
    this.hushVoice();
    if (p.form > 0) this.shrink();
    else this.kill(true);
    p.vx = dir * 180;
    p.vy = -170;
    p.onGround = false;
    p.freeze = 0;
  }

  private scoreAdd(n: number) {
    this.score = Math.min(999999, this.score + n);
  }

  private addCoin() {
    this.coins += 1;
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives += 1;
      this.audio.oneUp();
      this.float(this.player.x, this.player.y - 8, "1UP");
    }
  }

  private addZeros(n: number) {
    for (let i = 0; i < n; i++) this.addCoin();
  }

  private grantZeros(n: number, x: number, y: number) {
    this.scoreAdd(200 * n);
    this.addZeros(n);
    this.audio.fizz();
    this.heat = Math.max(0, this.heat - n * 10);
    this.float(x, y, n === 1 ? "200" : String(200 * n));
  }

  private grantNuts(x: number, y: number) {
    this.scoreAdd(500);
    this.charge = Math.min(10, this.charge + 3);
    this.audio.power();
    this.float(x, y, this.charge === 10 ? "SMASH READY" : "+3 SMASH");
  }

  private popCoin(tx: number, ty: number) {
    this.grantZeros(1, tx * TILE, ty * TILE);
    this.bits.push({
      x: tx * TILE + 4,
      y: ty * TILE,
      vx: 0,
      vy: -110,
      life: 0.4,
      max: 0.4,
      color: "#d7ef8a",
      s: 4,
    });
  }

  private startTreat() {
    this.star = 10;
    this.scoreAdd(1000);
    this.float(this.player.x, this.player.y - 12, "BUCCEES BOOST");
    this.audio.power();
    this.shake = Math.max(this.shake, 0.08);
  }

  private spawnItem(tx: number, ty: number) {
    const kind = this.player.form < 2 ? "lamp" : "nuts";
    this.items.push({
      kind,
      x: tx * TILE + 1,
      y: ty * TILE,
      w: 14,
      h: 12,
      vx: 0,
      vy: 0,
      onGround: false,
      emerge: 16,
    });
  }

  private hitBlock(tx: number, ty: number, fromShell: boolean) {
    const id = this.tileAt(tx, ty);
    const key = `${tx},${ty}`;
    if (this.bumps.has(key)) return;
    this.flyPapers(tx * TILE + 8, ty * TILE + 4, 5);
    if (id === ID.hidden) {
      this.setTile(tx, ty, ID.used);
      this.popCoin(tx, ty);
      this.bumps.set(key, 0);
      this.audio.bump();
      return;
    }
    if (id === ID.question) {
      this.setTile(tx, ty, ID.used);
      this.popCoin(tx, ty);
      this.bumps.set(key, 0);
      this.audio.bump();
      return;
    }
    if (id === ID.power) {
      this.setTile(tx, ty, ID.used);
      this.spawnItem(tx, ty);
      this.bumps.set(key, 0);
      this.audio.bump();
      return;
    }
    if (id === ID.treat) {
      this.setTile(tx, ty, ID.used);
      this.items.push({
        kind: "treat",
        x: tx * TILE + 1,
        y: ty * TILE,
        w: 14,
        h: 12,
        vx: 0,
        vy: 0,
        onGround: false,
        emerge: 16,
      });
      this.bumps.set(key, 0);
      this.audio.bump();
      return;
    }
    if (id === ID.brick || id === ID.brickCoin) {
      if (id === ID.brickCoin) this.popCoin(tx, ty);
      if (this.player.form > 0 || fromShell || this.star > 0) {
        this.setTile(tx, ty, ID.empty);
        this.shards(tx, ty);
        this.scoreAdd(50);
        this.audio.smash();
        this.shake = Math.max(this.shake, 0.1);
      } else {
        this.bumps.set(key, 0);
        this.audio.bump();
      }
    }
  }

  private shards(tx: number, ty: number) {
    const x = tx * TILE;
    const y = ty * TILE;
    const colors = ["#d4783c", "#8a4124", "#f0b070"];
    for (let i = 0; i < 4; i++) {
      this.bits.push({
        x: x + (i % 2) * 8,
        y: y + Math.floor(i / 2) * 8,
        vx: (i % 2 === 0 ? -1 : 1) * (40 + i * 12),
        vy: -80 - i * 20,
        life: 0.55,
        max: 0.55,
        color: colors[i % colors.length],
        s: 4,
      });
    }
  }

  private flyPapers(x: number, y: number, n = 6) {
    for (let i = 0; i < n; i++) {
      const max = 0.7 + Math.random() * 0.45;
      this.sheets.push({
        x: x + (Math.random() - 0.5) * 6,
        y,
        vx: (Math.random() - 0.5) * 110,
        vy: -60 - Math.random() * 90,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 10,
        life: max,
        max,
      });
    }
  }

  private puff(x: number, y: number, color: string) {
    this.bits.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -16,
      life: 0.25,
      max: 0.25,
      color,
      s: 2,
    });
  }

  private float(x: number, y: number, text: string) {
    this.texts.push({ x, y, vy: -28, life: 0.7, text });
  }

  private updateFx(dt: number) {
    for (const s of this.splashes) s.life -= dt;
    this.splashes = this.splashes.filter((s) => s.life > 0);
    for (const [k, v] of this.bumps) {
      const n = v + dt;
      if (n > 0.16) this.bumps.delete(k);
      else this.bumps.set(k, n);
    }
    for (const b of this.bits) {
      b.life -= dt;
      b.vy += 280 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.bits = this.bits.filter((b) => b.life > 0);
    for (const s of this.sheets) {
      s.life -= dt;
      s.vy += 220 * dt;
      s.vx *= 1 - dt * 0.4;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.spin * dt;
    }
    this.sheets = this.sheets.filter((s) => s.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y += t.vy * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r += r.grow * dt * 2.4 * (r.life / r.max + 0.25);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const c of this.comics) {
      c.life -= dt;
      c.y -= 10 * dt;
    }
    this.comics = this.comics.filter((c) => c.life > 0);
    for (const t of this.tumbles) {
      t.life -= dt;
      t.vy += 900 * dt;
      t.x += t.vx * dt;
      t.feet += t.vy * dt;
      t.rot += t.spin * dt;
    }
    this.tumbles = this.tumbles.filter((t) => t.life > 0);
    this.shake = Math.max(0, this.shake - dt);
  }

  private tileAt(tx: number, ty: number) {
    if (ty < 0) return ID.empty;
    if (ty >= this.level.h) return ID.empty;
    if (tx < 0 || tx >= this.level.w) return ID.ground;
    return this.tiles[ty * this.level.w + tx];
  }

  private setTile(tx: number, ty: number, id: number) {
    if (tx < 0 || ty < 0 || tx >= this.level.w || ty >= this.level.h) return;
    this.tiles[ty * this.level.w + tx] = id;
  }

  private eachCell(
    x: number,
    y: number,
    w: number,
    h: number,
    fn: (tx: number, ty: number) => void,
  ) {
    const x0 = Math.floor(x / TILE);
    const y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 0.001) / TILE);
    const y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) fn(tx, ty);
  }

  private overlapsSolid(x: number, y: number, w: number, h: number) {
    let hit = false;
    this.eachCell(x, y, w, h, (tx, ty) => {
      if (isSolid(this.tileAt(tx, ty))) hit = true;
    });
    return hit;
  }

  private moveBody(b: Body, dt: number, head: boolean): number | null {
    let wall: number | null = null;
    const prevX = b.x;
    b.x += b.vx * dt;
    this.eachCell(b.x, b.y, b.w, b.h, (tx, ty) => {
      if (!isSolid(this.tileAt(tx, ty))) return;
      const left = tx * TILE;
      const right = left + TILE;
      if (b.vx > 0 && b.x + b.w > left && prevX + b.w <= left + 0.2) {
        b.x = left - b.w;
        b.vx = 0;
        wall = ty * 10000 + tx;
      } else if (b.vx < 0 && b.x < right && prevX >= right - 0.2) {
        b.x = right;
        b.vx = 0;
        wall = ty * 10000 + tx;
      }
    });

    const prevY = b.y;
    const dir = b.vy;
    b.y += b.vy * dt;
    b.onGround = false;
    if (dir >= 0) {
      this.eachCell(b.x, b.y, b.w, b.h, (tx, ty) => {
        const id = this.tileAt(tx, ty);
        const solid = isSolid(id);
        const one = id === ID.ledge;
        if (!solid && !one) return;
        const top = ty * TILE;
        if (b.y + b.h > top && prevY + b.h <= top + 0.8) {
          b.y = top - b.h;
          b.vy = 0;
          b.onGround = true;
        }
      });
    } else {
      let best: { tx: number; ty: number } | null = null;
      let bestD = 9999;
      this.eachCell(b.x, b.y, b.w, b.h, (tx, ty) => {
        const id = this.tileAt(tx, ty);
        if (!isSolid(id) && id !== ID.hidden) return;
        const bot = ty * TILE + TILE;
        if (b.y < bot && prevY >= bot - 0.8) {
          const d = Math.abs((tx + 0.5) * TILE - (b.x + b.w / 2));
          if (d < bestD) {
            bestD = d;
            best = { tx, ty };
          }
        }
      });
      if (best) {
        const tile = best as { tx: number; ty: number };
        b.y = tile.ty * TILE + TILE;
        b.vy = 0;
        if (head) this.hitBlock(tile.tx, tile.ty, false);
      }
    }
    return wall;
  }

  private render(dt: number) {
    if (this.quest) return this.renderQuest();
    const ctx = this.ctx;
    const cam = Math.floor(this.camX);
    this.paintStage(cam, this.level.sky !== "day");
    ctx.save();
    if (this.shake > 0 && !this.reduce) {
      ctx.translate(Math.sin(this.clock * 80) * Math.min(2, this.shake * 14), 0);
    }
    this.drawSky(cam);
    const visibleEnd = Math.min(this.level.w, Math.ceil((cam + VIEW_W) / TILE));
    for (let tx = Math.max(0, Math.floor(cam / TILE)); tx < visibleEnd; tx++) {
      if (this.tileAt(tx, GROUND_ROW) !== ID.empty) continue;
      const start = tx;
      while (tx + 1 < visibleEnd && this.tileAt(tx + 1, GROUND_ROW) === ID.empty) tx++;
      drawFloorGap(ctx, start * TILE - cam, (tx - start + 1) * TILE);
    }
    this.drawTiles(cam);
    const materials = { wood: this.wood, steel: this.steel };
    for (const prop of this.level.props) drawFurniture(ctx, prop, this.level.theme, cam, materials);
    this.drawDeco(cam);
    for (const sign of this.level.signs) drawSign(ctx, sign, this.level.theme, cam);
    for (const checkpoint of this.level.checkpoints) {
      const x = checkpoint * TILE - cam;
      const saved = this.checkpoint >= checkpoint * TILE;
      ctx.fillStyle = saved ? "#e8c060" : "#65cbb4";
      ctx.fillRect(x, 140, 2, 52);
      ctx.fillRect(x + 2, 140, 34, 12);
      this.px(saved ? "SAVED" : "BREAK", x + 5, 144, "#102c32");
    }
    // The exit is a venue door, rather than the original platformer flagpole.
    this.drawCastle(cam);
    this.drawDoors(cam);
    this.drawPuddles(cam);
    for (const it of this.items) this.drawPickup(it, cam);
    for (const e of this.enemies) this.drawEnemy(e, cam);
    for (const t of this.tumbles) this.drawTumble(t, cam);
    for (const student of this.students) {
      const sulking = (student.schooled ?? 0) > 0;
      this.drawPerson(
        this.student,
        [5, 5, 408, 758],
        student.x + student.w / 2 - cam,
        student.y + student.h,
        student.facing,
        true,
        sulking ? 0 : this.clock + student.home,
        false,
      );
      if (student.windup > 0)
        this.drawSpeech("Heads up!", student.x - cam, student.y - 26, "#f0ca8e");
      else if (student.speechT > 0 && this.banterT <= 0)
        this.drawSpeech(
          sulking && student.retort ? student.retort : student.reply,
          student.x - cam,
          student.y - 26,
          sulking ? "#c4b2ea" : "#d5e2ef",
        );
      else if (sulking) this.drawSulk(student.x + student.w / 2 - cam, student.y - 8);
    }
    this.drawBoss(cam);
    for (const bit of this.bits) {
      ctx.globalAlpha = clamp(bit.life / bit.max, 0, 1);
      ctx.fillStyle = bit.color;
      ctx.fillRect(Math.round(bit.x - cam), Math.round(bit.y), bit.s, bit.s);
      ctx.globalAlpha = 1;
    }
    for (const sheet of this.sheets) {
      ctx.save();
      ctx.globalAlpha = clamp(sheet.life / sheet.max, 0, 1);
      ctx.translate(sheet.x - cam, sheet.y);
      ctx.rotate(sheet.rot);
      ctx.fillStyle = "rgba(20,16,12,0.18)";
      ctx.fillRect(1, 1, 8, 10);
      ctx.fillStyle = "#f7f3ea";
      ctx.beginPath();
      ctx.roundRect(0, 0, 8, 10, 0.6);
      ctx.fill();
      ctx.fillStyle = "#b7c3d0";
      ctx.fillRect(1, 2, 6, 0.7);
      ctx.fillRect(1, 4, 5, 0.7);
      ctx.fillRect(1, 6, 4, 0.7);
      ctx.restore();
    }
    const hide =
      this.mode === "title" ||
      (this.mode === "walkoff" &&
        this.level.castleTile >= 0 &&
        this.player.x > this.level.castleTile * TILE + 20);
    const flicker = this.player.invuln > 0 && Math.floor(this.clock * 18) % 2 === 0;
    // Shockwaves sit behind Hammer so they never cross his face.
    this.drawRings(cam);
    if (!hide && !flicker && this.mode !== "die") this.drawPlayer(cam);
    if (this.mode === "die") this.drawPlayer(cam);
    this.drawEmbers(cam);
    for (const plane of this.planes) this.drawPlane(plane, cam);
    this.drawHeroLine(cam);
    this.drawFloaters(cam);
    this.drawComics(cam);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(12,8,6,${clamp(this.fade, 0, 1)})`;
      ctx.fillRect(-4, -4, VIEW_W + 8, VIEW_H + 8);
    }
    ctx.restore();
    this.gradeStage();
    void dt;
  }

  private paintStage(cam: number, night: boolean, theme: Level["theme"] = this.level.theme) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = "#141c28";
    ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
    const roomBg = theme === "campus" ? this.campusBg : this.hotelBg;
    if (roomBg.complete && roomBg.naturalWidth > 0) {
      const cover = Math.max(DISPLAY_W / roomBg.naturalWidth, DISPLAY_H / roomBg.naturalHeight);
      const dw = roomBg.naturalWidth * cover;
      const dh = roomBg.naturalHeight * cover;
      const span = dw;
      const venueOffset = theme === "restaurant" ? DISPLAY_W * 0.3 : 0;
      let x = -((cam * 1.6 + venueOffset) % span);
      if (x > 0) x -= span;
      const y = (DISPLAY_H - dh) / 2;
      for (; x < DISPLAY_W; x += span - 1) ctx.drawImage(roomBg, x, y, dw, dh);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 420 - cam * 1.1) % (DISPLAY_W + 480)) - 240;
      const shaft = ctx.createLinearGradient(x, 0, x + 220, DISPLAY_H);
      shaft.addColorStop(0, night ? "rgba(180,200,255,0.05)" : "rgba(255,244,214,0.08)");
      shaft.addColorStop(1, "rgba(255,244,214,0)");
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 160, 0);
      ctx.lineTo(x + 280, DISPLAY_H);
      ctx.lineTo(x + 40, DISPLAY_H);
      ctx.closePath();
      ctx.fill();
      const lamp = ctx.createRadialGradient(x + 80, 36, 4, x + 80, 90, 180);
      lamp.addColorStop(0, night ? "rgba(180,200,230,0.2)" : "rgba(255,248,220,0.15)");
      lamp.addColorStop(1, "rgba(255,248,220,0)");
      ctx.fillStyle = lamp;
      ctx.fillRect(x - 80, 0, 340, 240);
    }
    ctx.restore();
    if (night) {
      ctx.fillStyle = "rgba(6,10,18,0.5)";
      ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
    }
    const s = DISPLAY_H / VIEW_H;
    const ox = (DISPLAY_W - VIEW_W * s) / 2;
    ctx.setTransform(s, 0, 0, s, ox, 0);
  }

  private gradeStage() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(
      DISPLAY_W / 2,
      DISPLAY_H * 0.45,
      DISPLAY_H * 0.2,
      DISPLAY_W / 2,
      DISPLAY_H / 2,
      DISPLAY_H * 0.72,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
    ctx.globalCompositeOperation = "soft-light";
    const warm = ctx.createLinearGradient(0, 0, 0, DISPLAY_H);
    warm.addColorStop(0, "rgba(255,236,200,0.35)");
    warm.addColorStop(0.45, "rgba(0,0,0,0)");
    warm.addColorStop(1, "rgba(20,40,70,0.35)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
    ctx.globalCompositeOperation = "source-over";
  }

  private drawSky(cam: number) {
    this.drawOffice(cam, this.level.sky !== "day");
  }

  private drawOffice(_cam: number, _night: boolean) {}

  private drawTiles(cam: number) {
    const x0 = Math.max(0, Math.floor(cam / TILE) - 1);
    const x1 = Math.min(this.level.w - 1, Math.floor((cam + VIEW_W) / TILE) + 1);
    for (let ty = 0; ty < this.level.h; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = this.tileAt(tx, ty);
        if (
          this.level.props.some(
            (prop) => tx >= prop.x && tx < prop.x + prop.w && ty >= prop.y && ty < prop.y + prop.h,
          )
        )
          continue;
        if (id === ID.empty || id === ID.hidden) continue;
        const bump = this.bumps.get(`${tx},${ty}`) ?? 0;
        const oy = bump > 0 ? -Math.sin((bump / 0.16) * Math.PI) * 7 : 0;
        const sx = tx * TILE - cam;
        const sy = ty * TILE + oy;
        this.drawTile(id, tx, ty, sx, sy);
      }
    }
  }

  private drawTile(id: number, tx: number, ty: number, sx: number, sy: number) {
    const ctx = this.ctx;
    if (id === ID.ground) {
      const g = ctx.createLinearGradient(sx, GROUND_ROW * TILE, sx, VIEW_H);
      const colors =
        this.level.theme === "hotel"
          ? ["#827565", "#554c42", "#302d29"]
          : this.level.theme === "restaurant"
            ? ["#88918c", "#596461", "#303c3b"]
            : ["#859394", "#566669", "#303e43"];
      g.addColorStop(0, colors[0]);
      g.addColorStop(0.2, colors[1]);
      g.addColorStop(1, colors[2]);
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, 16, 16);
      if (ty === GROUND_ROW) {
        ctx.fillStyle = "rgba(247,243,223,0.2)";
        ctx.fillRect(sx, sy, 16, 0.8);
        if (tx % 4 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(sx, sy + 2, 0.5, 14);
        }
      }
      ctx.fillStyle = "rgba(255,248,223,0.025)";
      for (let i = 1; i < 4; i++) ctx.fillRect(sx + i * 4, sy + 2, 0.5, 14);
      if (
        ty === GROUND_ROW &&
        (this.tileAt(tx + 1, ty) === ID.empty || this.tileAt(tx - 1, ty) === ID.empty)
      ) {
        ctx.fillStyle = "#e7b15a";
        ctx.fillRect(sx, sy, 16, 2);
        ctx.fillStyle = "#19232c";
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + i * 4, sy, 2, 2);
      }
      return;
    }
    if (id === ID.brick || id === ID.brickCoin) {
      this.deliveryCase(sx, sy);
      return;
    }
    if (id === ID.used) {
      drawCrate(ctx, sx, sy, { wood: this.wood, steel: this.steel }, "", true);
      return;
    }
    if (id === ID.treat || id === ID.buc) {
      this.beaverMark(sx + 8, sy + 16, 22);
      return;
    }
    if (id === ID.question || id === ID.power) {
      const mark = id === ID.power ? "!" : "?";
      drawCrate(ctx, sx, sy, { wood: this.wood, steel: this.steel }, mark);
      return;
    }
    if (id === ID.coin) {
      this.can(sx + 8, sy + 16);
      return;
    }
    if (id === ID.nut) {
      this.pickup(this.nuts, [149, 59, 925, 1170], sx + 8, sy + 16, 20);
      return;
    }

    if (id === ID.ledge) {
      const g = ctx.createLinearGradient(sx, sy, sx, sy + 8);
      g.addColorStop(0, "#f4efe6");
      g.addColorStop(1, "#c4b49a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(sx, sy + 4, 16, 6, 1);
      ctx.fill();
      ctx.fillStyle = "#8a6844";
      ctx.fillRect(sx + 2, sy + 10, 2, 6);
      ctx.fillRect(sx + 12, sy + 10, 2, 6);
      return;
    }
    if (id === ID.pipe) {
      const above = this.tileAt(tx, ty - 1) === ID.pipe;
      const left = this.tileAt(tx - 1, ty) !== ID.pipe;
      const g = ctx.createLinearGradient(sx, sy, sx + 16, sy);
      g.addColorStop(0, "#4a5568");
      g.addColorStop(0.4, "#8b97a8");
      g.addColorStop(1, "#3c4658");
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, 16, 16);
      ctx.fillStyle = left ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
      ctx.fillRect(left ? sx : sx + 14, sy, 2, 16);
      if (!above) {
        ctx.fillStyle = "#e7edf2";
        ctx.fillRect(sx, sy, 16, 3);
      }
      const warp = this.level.pipes.some(
        (p) => p.dest && tx >= p.x / TILE && tx <= p.x / TILE + 1 && ty === p.top / TILE,
      );
      if (warp) {
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(sx + 3, sy + 7, 10, 1.4);
      }
    }
  }

  private cabinet(sx: number, sy: number, dead: boolean) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(8,12,18,0.35)";
    ctx.beginPath();
    ctx.ellipse(sx + 8, sy + 17, 7.2, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(sx, sy, sx + 16, sy + 16);
    g.addColorStop(0, dead ? "#d5dbe2" : "#f4e7cf");
    g.addColorStop(1, dead ? "#8b939c" : "#c4a574");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(sx, sy, 16, 16, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,28,16,0.4)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = "rgba(40,28,16,0.35)";
    ctx.fillRect(sx + 2, sy + 7.2, 12, 0.6);
    ctx.fillStyle = dead ? "#9aa3ad" : "#e2b043";
    ctx.beginPath();
    ctx.roundRect(sx + 5.5, sy + 9.2, 5, 1.3, 0.4);
    ctx.fill();
  }

  private deliveryCase(x: number, y: number) {
    drawCrate(this.ctx, x, y, { wood: this.wood, steel: this.steel });
  }

  private pickup(img: HTMLImageElement, crop: number[], cx: number, foot: number, h: number) {
    if (!img.complete || !img.naturalWidth) return;
    const [x, y, w, sh] = crop;
    this.ctx.drawImage(img, x, y, w, sh, cx - ((w / sh) * h) / 2, foot - h, (w / sh) * h, h);
  }

  private can(cx: number, foot: number) {
    this.pickup(this.zeroCan, [149, 81, 726, 1363], cx, foot, 19);
  }

  private beaverMark(cx: number, foot: number, h: number) {
    this.pickup(this.beaver, [33, 34, 1020, 1378], cx, foot, h);
  }

  private drawDeco(cam: number) {
    const ctx = this.ctx;
    for (const d of this.level.deco) {
      const x = d.x * TILE - cam;
      const y = d.y * TILE;
      drawRoomDecor(ctx, x, y, d.k, this.level.theme);
    }
  }

  private drawFlag(cam: number) {
    if (this.level.flagTile < 0) return;
    const x = this.level.flagTile * TILE + 7 - cam;
    const top = 32;
    const bot = GROUND_ROW * TILE;
    this.ctx.strokeStyle = "#d7dee6";
    this.ctx.lineWidth = 1.4;
    this.ctx.beginPath();
    this.ctx.moveTo(x, top);
    this.ctx.lineTo(x, bot);
    this.ctx.stroke();
    this.ctx.fillStyle = "#1a120c";
    this.ctx.beginPath();
    this.ctx.arc(x, top, 2, 0, Math.PI * 2);
    this.ctx.fill();
    const fy =
      this.mode === "slide" || this.mode === "walkoff" || this.mode === "tally"
        ? this.flagY
        : top + 2;
    this.ctx.fillStyle = "#c44838";
    this.ctx.beginPath();
    this.ctx.moveTo(x + 1, fy);
    this.ctx.lineTo(x + 16, fy + 5);
    this.ctx.lineTo(x + 1, fy + 10);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawCastle(cam: number) {
    if (this.level.castleTile < 0) return;
    const x = this.level.castleTile * TILE - cam;
    const base = GROUND_ROW * TILE;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#27343d";
    ctx.fillRect(x, base - 62, 42, 62);
    const glass = ctx.createLinearGradient(x, base - 59, x + 38, base);
    glass.addColorStop(0, "#537889");
    glass.addColorStop(1, "#16252e");
    ctx.fillStyle = glass;
    ctx.fillRect(x + 3, base - 59, 36, 56);
    ctx.fillStyle = "rgba(217,231,229,0.17)";
    ctx.beginPath();
    ctx.moveTo(x + 4, base - 56);
    ctx.lineTo(x + 24, base - 56);
    ctx.lineTo(x + 4, base - 16);
    ctx.fill();
    ctx.fillStyle = "#b9c6c5";
    ctx.fillRect(x + 20, base - 59, 2, 56);
    ctx.fillRect(x + 16, base - 28, 2, 10);
    ctx.fillRect(x + 24, base - 28, 2, 10);
    ctx.fillStyle = "#36584a";
    ctx.fillRect(x + 6, base - 76, 30, 10);
    ctx.font = "600 4px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f1f2df";
    ctx.fillText(
      this.levelIndex === this.courses.length - 1 ? "CLOCK OUT →" : "NEXT VENUE →",
      x + 21,
      base - 69,
    );
    ctx.restore();
  }

  private drawBoss(cam: number) {
    const b = this.boss;
    if (!b || !this.bossPig.complete || !this.bossPig.naturalWidth) return;
    const ctx = this.ctx,
      defeated = b.state === "defeated";
    if (defeated && b.timer <= 0) return;
    const x = b.x + b.w / 2 - cam,
      feet = b.y + b.h;
    ctx.save();
    ctx.fillStyle = "rgba(12,14,26,.28)";
    ctx.beginPath();
    ctx.ellipse(x, 192, 25, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, feet);
    ctx.scale(b.facing > 0 ? -1 : 1, 1);
    const wind = b.state === "windup",
      moving = b.state === "charge" || b.state === "hop";
    if (defeated) {
      ctx.globalAlpha = Math.min(1, b.timer);
      ctx.rotate(-0.45);
      ctx.scale(1.12, 0.65);
    } else if (wind) {
      ctx.rotate(Math.sin(this.clock * 22) * 0.045);
      ctx.scale(1.035, 0.965);
    } else if (moving) {
      ctx.rotate(Math.sin(this.clock * 15) * 0.055);
      ctx.scale(1.03, 0.99);
    }
    const bob = moving ? Math.abs(Math.sin(this.clock * 12)) * 3 : Math.sin(this.clock * 2) * 0.8;
    if (b.hurt > 0) {
      ctx.shadowColor = "#fff4dc";
      ctx.shadowBlur = 7;
    }
    const h = 102,
      w = (451 / 758) * h;
    ctx.drawImage(this.bossPig, 4, 5, 451, 758, -w / 2, -h - bob, w, h);
    ctx.restore();
    if (wind && b.active)
      this.drawSpeech(b.attacks % 3 === 2 ? "BOING!" : "SQUEEEE!", x, b.y - 25, "#f1a7c7");
    if (this.level.boss && b.active && !defeated) {
      const refillX = this.level.boss.arenaStart * TILE + 31 - cam;
      ctx.save();
      ctx.font = "600 3.8px 'Segoe UI',sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(12,24,33,.88)";
      ctx.fillRect(refillX - 21, 169, 42, 8);
      ctx.fillStyle = "#e9bb72";
      ctx.fillText("PEPPER REFILL", refillX, 175);
      ctx.restore();
    }
  }

  private drawPlane(plane: Plane, cam: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(plane.x - cam, plane.y);
    ctx.scale(plane.vx > 0 ? 1 : -1, 1);
    ctx.rotate(Math.sin(this.clock * 5 + plane.phase) * 0.05);
    ctx.strokeStyle = "rgba(230,240,242,.28)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-9, 1);
    ctx.lineTo(-15, 1);
    ctx.moveTo(-8, -1);
    ctx.lineTo(-12, -1);
    ctx.stroke();
    ctx.fillStyle = "rgba(7,15,28,.28)";
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(-5, -3);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f6f1e6";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-6, -3.5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8ca3af";
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(-6, -3.5);
    ctx.lineTo(-2, 0);
    ctx.stroke();
    ctx.restore();
  }

  private staffArt(role: EnemyRole): [HTMLImageElement, [number, number, number, number]] {
    return role === "server"
      ? [this.server, [5, 5, 379, 758]]
      : role === "hotel"
        ? [this.hotelStaff, [6, 4, 600, 759]]
        : [this.worker, [4, 6, 423, 758]];
  }

  private drawEnemy(e: Enemy, cam: number) {
    const role = e.role ?? "office";
    const [image, crop] = this.staffArt(role);
    const frozen = (e.freeze ?? 0) > 0;
    if (e.state === "flat") this.ctx.globalAlpha = Math.max(0, 1 - e.flatT * 2);
    this.drawPerson(
      image,
      crop,
      e.x + e.w / 2 - cam,
      e.y + e.h,
      e.facing,
      true,
      frozen ? 0 : e.anim,
      e.state !== "walk",
    );
    this.ctx.globalAlpha = 1;
    if (e.state === "shell" && Math.abs(e.vx) < 18) this.drawDizzy(e.x + e.w / 2 - cam, e.y - 2);
    if (e.state === "walk") {
      const label = role === "server" ? "SERVER" : role === "hotel" ? "HOTEL STAFF" : "OFFICE";
      this.ctx.save();
      this.ctx.font = "600 3.2px 'Segoe UI',sans-serif";
      const w = this.ctx.measureText(label).width + 6;
      this.ctx.fillStyle = "rgba(8,17,24,0.78)";
      this.ctx.fillRect(e.x + e.w / 2 - cam - w / 2, e.y - 12, w, 6);
      this.ctx.fillStyle = e.alert > 0 ? "#f4a77d" : frozen ? "#c4b2ea" : "#e6d7bc";
      this.ctx.fillText(label, e.x + e.w / 2 - cam - w / 2 + 3, e.y - 7.5);
      this.ctx.restore();
      if (e.speechT > 0)
        this.drawSpeech(e.line ?? "Order up!", e.x - cam, e.y - 30, frozen ? "#c4b2ea" : "#efbc84");
    }
  }

  private drawTumble(t: Tumble, cam: number) {
    const [image, crop] = this.staffArt(t.role);
    if (!image.complete || !image.naturalWidth) return;
    const ctx = this.ctx,
      h = ENEMY_HEIGHT,
      w = (crop[2] / crop[3]) * h;
    ctx.save();
    ctx.globalAlpha = clamp(t.life / 0.35, 0, 1);
    ctx.translate(t.x - cam, t.feet - h / 2);
    ctx.rotate(t.rot);
    ctx.scale(t.vx > 0 ? -1 : 1, 1);
    ctx.drawImage(image, ...crop, -w / 2, -h / 2, w, h);
    if (t.slimed) {
      ctx.fillStyle = "rgba(170,203,92,0.82)";
      for (const [x, y, r] of [
        [-1, -12, 3.4],
        [2, -4, 2.6],
        [-3, 3, 2.2],
      ]) {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.8, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawDizzy(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#ffe08a";
    for (let i = 0; i < 3; i++) {
      const a = this.clock * 5 + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 7,
        sy = y + Math.sin(a) * 2;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 0.6 : 1.6,
          b = (k * Math.PI) / 5;
        ctx.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSulk(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(9,17,24,0.82)";
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 12, 12, 6, 2);
    ctx.fill();
    ctx.fillStyle = "#c4b2ea";
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 3.5 + i * 3, y - 9.6, 1.2, 1.2);
    ctx.restore();
  }

  private drawPuddles(cam: number) {
    const ctx = this.ctx;
    for (const p of this.puddles) {
      const x = p.x - cam;
      if (x < -30 || x > VIEW_W + 30) continue;
      const fade = clamp(p.life / 1.2, 0, 1) * clamp((p.max - p.life) / 0.15, 0, 1);
      ctx.save();
      ctx.globalAlpha = fade;
      const g = ctx.createLinearGradient(x, p.y - 2, x, p.y + 1.5);
      g.addColorStop(0, "#d4e78f");
      g.addColorStop(1, "#7f9c3c");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, p.y - 0.3, p.w / 2, 1.9, 0, 0, Math.PI * 2);
      ctx.ellipse(x - p.w * 0.28, p.y - 0.2, p.w * 0.2, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,236,0.75)";
      ctx.fillRect(x - p.w * 0.18, p.y - 1.4, p.w * 0.22, 0.6);
      ctx.restore();
    }
  }

  private drawRings(cam: number) {
    const ctx = this.ctx;
    for (const r of this.rings) {
      const t = r.life / r.max;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 0.6 + 2.4 * t;
      ctx.beginPath();
      ctx.ellipse(r.x - cam, r.y, r.r, r.floor ? r.r * 0.22 : r.r, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Where his face is on screen right now; words in front of him slide off it. */
  private faceOnScreen(cam: number) {
    const face = heroFace(this.activePose());
    return { x: face.x - cam, y: face.y, w: face.w, h: face.h };
  }

  private drawFloaters(cam: number) {
    const face = this.faceOnScreen(cam),
      view = { w: VIEW_W, h: VIEW_H };
    for (const t of this.texts) {
      const at = clearOfFace({ x: t.x - cam, y: t.y, w: t.text.length * 4, h: 6 }, face, view);
      this.px(t.text, at.x, at.y, "#fff6d8");
    }
  }

  private drawComics(cam: number) {
    const ctx = this.ctx;
    const face = this.faceOnScreen(cam),
      view = { w: VIEW_W, h: VIEW_H };
    for (const c of this.comics) {
      const age = c.max - c.life;
      const pop = Math.min(1, age / 0.08) * (1 + 0.25 * Math.max(0, 1 - age / 0.16));
      const size = c.big ? 9 : 5.2;
      ctx.save();
      ctx.font = `900 ${size}px 'Arial Black','Segoe UI',sans-serif`;
      const w = ctx.measureText(c.text).width;
      // Clamped into view first, then slid off his face, so the clamp can't push it back on.
      const x = clamp(c.x - cam, 20, VIEW_W - 20),
        y = clamp(c.y, 14, VIEW_H - 10);
      const box = comicBox(x, y, w, c.big),
        clear = clearOfFace(box, face, view);
      ctx.globalAlpha = clamp(c.life / 0.18, 0, 1);
      ctx.translate(x + clear.x - box.x, y + clear.y - box.y);
      ctx.rotate(c.rot);
      ctx.scale(pop, pop);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = c.big ? "#f7c948" : "#fff4cf";
      ctx.strokeStyle = "#1b120c";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const q of comicStar(w, c.big)) ctx.lineTo(q.x, q.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = size * 0.28;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1b120c";
      ctx.strokeText(c.text, 0, 0.3);
      ctx.fillStyle = c.big ? "#d63a2a" : "#c44838";
      ctx.fillText(c.text, 0, 0.3);
      ctx.restore();
    }
  }

  private drawPerson(
    image: HTMLImageElement,
    crop: [number, number, number, number],
    x: number,
    feet: number,
    facing: number,
    leftFacing: boolean,
    clock: number,
    stunned: boolean,
  ) {
    drawPersonArt(this.ctx, image, crop, x, feet, facing, leftFacing, clock, stunned);
  }


  private drawSpeech(
    text: string,
    x: number,
    y: number,
    accent: string,
    place?: (size: { w: number; h: number }) => Point,
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = "600 4px 'Segoe UI',sans-serif";
    const words = text.split(" "),
      lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? line + " " + word : word;
      if (ctx.measureText(next).width > 94 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    const w = Math.max(...lines.map((part) => ctx.measureText(part).width)) + 12;
    const at = place?.({ w, h: lines.length * 6 + 7 });
    const bx = at ? at.x : clamp(x - w / 3, 3, VIEW_W - w - 3),
      by = at ? at.y : Math.max(20, y);
    ctx.fillStyle = "rgba(9,17,24,0.94)";
    ctx.beginPath();
    ctx.roundRect(bx, by, w, lines.length * 6 + 7, 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(bx, by + 2, 1, lines.length * 6 + 3);
    ctx.fillStyle = "#f4f0e7";
    lines.forEach((part, i) => ctx.fillText(part, bx + 6, by + 7 + i * 6));
    ctx.restore();
  }

  private rigReady() {
    return (
      this.heroBody.complete &&
      this.heroBody.naturalWidth > 0 &&
      this.heroUpper.complete &&
      this.heroUpper.naturalWidth > 0 &&
      this.heroFore.complete &&
      this.heroFore.naturalWidth > 0 &&
      this.heroHand.complete &&
      this.heroHand.naturalWidth > 0 &&
      this.heroIdle.complete &&
      this.heroIdle.naturalWidth > 0
    );
  }

  private visualsReady() {
    return (
      this.rigReady() &&
      [
        this.zeroCan,
        this.nuts,
        this.beaver,
        this.towel,
        this.worker,
        this.server,
        this.hotelStaff,
        this.student,
        this.hotelBg,
        this.campusBg,
        this.bossPig,
        this.wood,
        this.steel,
        this.nurse,
      ].every((image) => image.complete && image.naturalWidth > 0)
    );
  }

  private heroPose(): HeroPose {
    const p = this.player;
    return {
      x: p.x + p.w / 2,
      foot: p.y + p.h,
      facing: p.facing,
      phase: p.anim,
      moving:
        !p.crouch &&
        p.onGround &&
        Math.abs(p.vx) > 16 &&
        this.wipe <= 0 &&
        this.swing <= 0 &&
        this.snotT <= 0,
      air: !p.onGround,
      landing: p.land,
      swing: this.swing,
      mega: this.superT,
      wipe: this.wipe,
      snot: this.snotT,
      heat: this.heat,
      hurt: this.hurtT,
      star: this.star,
      reduced: this.reduce,
      clock: this.clock,
      crouch: p.crouch,
      lecture: this.lecture,
      idle: this.idleT,
      dead: this.mode === "die",
      anger: Math.min(1, (p.form === 0 ? 0.75 : 0) + (this.heat >= 80 ? 0.5 : 0)),
    };
  }

  private heroAssets() {
    return {
      idle: this.heroIdle,
      body: this.heroBody,
      upper: this.heroUpper,
      fore: this.heroFore,
      hand: this.heroHand,
      towel: this.towel,
    };
  }

  /** Hammer as he is drawn right now: in a quest, the quest's pose. */
  private activePose(): HeroPose {
    return this.quest ? this.quest.pose() : this.heroPose();
  }

  private drawRig(cam: number) {
    drawHero(this.ctx, this.heroAssets(), this.heroPose(), cam);
  }

  private drawPlayer(cam: number) {
    if (this.rigReady()) this.drawRig(cam);
    else if (this.heroIdle.complete && this.heroIdle.naturalWidth) {
      const p = this.player;
      this.ctx.save();
      this.ctx.translate(p.x + p.w / 2 - cam, p.y + p.h);
      this.ctx.scale(p.facing, 1);
      this.ctx.drawImage(this.heroIdle, -6.15, -44, 14.63, 44);
      this.ctx.restore();
    }
  }

  private drawEmbers(cam: number) {
    const ctx = this.ctx;
    for (const b of this.embers) {
      const age = b.max - b.life;
      const size = b.hot ? 1.35 : 1;
      const stretch = 1 + Math.min(0.9, Math.hypot(b.vx, b.vy) / 420);
      ctx.save();
      ctx.translate(b.x - cam, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.scale(size, size);
      // A wet tail that thins out, plus a couple of drips shed along the way.
      const tail = ctx.createLinearGradient(-16, 0, 0, 0);
      tail.addColorStop(0, "rgba(176,206,98,0)");
      tail.addColorStop(1, b.hot ? "rgba(226,196,82,0.8)" : "rgba(176,206,98,0.75)");
      ctx.strokeStyle = tail;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-16, Math.sin(age * 30) * 0.8);
      ctx.quadraticCurveTo(-7, 1.6, 0, 0);
      ctx.stroke();
      ctx.fillStyle = b.hot ? "rgba(205,170,58,0.95)" : "rgba(150,184,82,0.95)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4 * stretch, 2.3 / Math.sqrt(stretch), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.hot ? "rgba(236,214,110,0.9)" : "rgba(196,224,128,0.9)";
      ctx.beginPath();
      ctx.ellipse(0.6, -0.3, 2.2 * stretch, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,236,0.9)";
      ctx.beginPath();
      ctx.ellipse(1.2, -0.9, 1.1, 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      if (b.hot) {
        ctx.fillStyle = "#c8341f";
        ctx.fillRect(-1.5, 0.2, 0.8, 0.8);
        ctx.fillRect(1, 0.6, 0.7, 0.7);
      }
      ctx.restore();
      ctx.fillStyle = b.hot ? "rgba(214,186,72,0.75)" : "rgba(160,194,90,0.75)";
      for (let i = 1; i <= 2; i++) {
        const t = (age * 3 + i * 0.37) % 1;
        ctx.beginPath();
        ctx.ellipse(b.x - cam - b.vx * 0.02 * i, b.y + t * 7, 0.7, 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const b of this.splashes) {
      ctx.fillStyle = `rgba(157,181,103,${b.life * 0.7})`;
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399;
        const r = (1 - b.life) * 8;
        ctx.beginPath();
        ctx.ellipse(
          b.x - cam + Math.cos(a) * r,
          b.y + Math.sin(a) * r,
          1.8,
          0.8,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  private drawPickup(it: { kind: string; x: number; y: number; emerge: number }, cam: number) {
    const bob = it.emerge > 0 || this.reduce ? 0 : Math.sin(this.clock * 6 + it.x) * 1;
    if (it.kind === "nuts")
      this.pickup(this.nuts, [149, 59, 925, 1170], it.x - cam + 7, it.y + 12 - bob, 20);
    else if (it.kind === "treat") this.beaverMark(it.x - cam + 7, it.y + 12 - bob, 24);
    else {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(it.x - cam + 7, it.y + 7 - bob);
      ctx.rotate(-0.25);
      const g = ctx.createLinearGradient(-4, -5, 4, 5);
      g.addColorStop(0, "#ff6c3d");
      g.addColorStop(0.55, "#d82b1f");
      g.addColorStop(1, "#8a1314");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-3, -4);
      ctx.bezierCurveTo(7, -8, 5, 6, -2, 9);
      ctx.bezierCurveTo(1, 3, -6, 1, -3, -4);
      ctx.fill();
      ctx.strokeStyle = "#537e35";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(-3, -9, 1, -10);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Hammer's words: the damage line, a recording's caption, or a thought. All
   * three sit above and behind his head and are never drawn over his face.
   */
  private drawHeroLine(cam: number) {
    const pose = this.activePose();
    const face = heroFace(pose);
    const crown = { x: face.crown.x - cam, y: face.crown.y },
      shown = { ...face, x: face.x - cam },
      view = { w: VIEW_W, h: VIEW_H };
    const place = (size: { w: number; h: number }) =>
      thoughtLayout(size, crown, pose.facing as 1 | -1, shown, view).cloud;
    if (this.curse > 0) this.drawCurse(place);
    else if (this.banterT > 0 && this.banterSpoken)
      this.drawSpeech(this.heroBanter, 0, 0, "#e7bd6a", place);
    else if (this.banterT > 0)
      drawThought(this.ctx, this.heroBanter, crown, pose.facing as 1 | -1, shown, view);
  }

  private drawCurse(place: (size: { w: number; h: number }) => Point) {
    const line = DAMAGE_LINE.text;
    const w = line.length * 4;
    const box = place({ w: w + 4, h: 11 });
    const x = box.x + 3,
      y = box.y + 3;
    const ctx = this.ctx;
    ctx.fillStyle = "#f7f3ea";
    ctx.fillRect(x - 3, y - 3, w + 4, 11);
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(x - 3, y - 3, w + 4, 1);
    ctx.fillRect(x - 3, y + 7, w + 4, 1);
    ctx.fillRect(x - 3, y - 3, 1, 11);
    ctx.fillRect(x + w, y - 3, 1, 11);
    this.px(line, x, y, "#c44838");
  }

  private px(text: string, x: number, y: number, color: string) {
    const ctx = this.ctx;
    for (let i = 0; i < text.length; i++) {
      const g = FONT[text[i].toUpperCase()] ?? FONT[" "];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (g[row][col] !== "1") continue;
          ctx.fillStyle = "#1a120c";
          ctx.fillRect(Math.round(x + i * 4 + col + 1), Math.round(y + row + 1), 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(Math.round(x + i * 4 + col), Math.round(y + row), 1, 1);
        }
      }
    }
  }

  private hud(): Hud {
    return {
      score: this.score,
      coins: this.coins,
      world: this.level.world,
      name: this.level.name,
      time: Math.max(0, this.timeLeft),
      lives: this.lives,
      form: this.player.form,
      charge: this.charge,
      star: this.star,
      heat: this.heat,
      cooldown: this.fireCd,
      checkpoint: this.checkpoint > 0,
      soundReady: this.audio.ready,
      visualsReady: this.visualsReady(),
      stance: this.player.slideT > 0 ? "sliding" : this.player.crouch ? "crouching" : "standing",
      boss: this.boss?.active
        ? {
            hp: this.boss.hp,
            max: this.boss.max,
            bonks: this.boss.bonks,
            snots: this.boss.snots,
            defeated: this.boss.state === "defeated",
          }
        : null,
      sinus: this.sinus,
      hot: this.player.form === 2,
      patience: this.player.form + 1,
      lectureReady: this.lectureCd <= 0,
      hint: this.quest ? this.quest.hud().hint : this.hint(),
      quest: this.quest ? this.quest.hud() : null,
      questResult:
        this.mode === "questTally" && this.questResult
          ? { ...this.questResult, practice: this.questInfo?.practice ?? false }
          : null,
    };
  }

  private hint() {
    const p = this.player;
    const near = (x: number, range: number) => Math.abs(x - p.x) < range;
    const student = this.students.some(
      (s) => !(s.schooled ?? 0) && s.throws && near(s.x, 140) && (s.x - p.x) * p.facing > -10,
    );
    if (this.boss?.active && this.boss.state !== "defeated")
      return "Pig fight · 3 bonks + 3 snots minimum · pepper refills on the left";
    if (this.planes.some((plane) => near(plane.x, 100)))
      return "Paper incoming · duck, jump or swat with H";
    const door = this.doorInFront();
    if (door) return "↓ " + door.label + " · side quest";
    if (this.banterT > 0) return "Hammer: " + this.heroBanter;
    if (p.crouch) return "Stay low · release ↓ when clear to stand";
    if (this.level.id === "bonus") return "Staff stash · ↓ on the left cart to return";
    if (this.star > 0) return "Buc-ee's boost · charge through the crowd!";
    if (this.heat >= 80) return "Overheated · T to towel off";
    if (student && this.lectureCd <= 0) return "E lectures them · schooled students stop throwing paper";
    if (this.charge >= 10) return "Super smash ready · Q";
    if (this.puddles.length) return "Staff slip on snot puddles · stomp or bonk them while they're down";
    if (p.x < 260) return "F snot rocket · jump into the ! crate for hot pepper";
    if (p.x < 600) return "H swings the mallet · hit them with the head";
    return p.form === 2 ? "Hot snot pierces · nuts charge Q super smash" : "Find a ! crate for hot pepper";
  }

  private emit() {
    if (this.mode !== this.lastMode) {
      this.lastMode = this.mode;
      this.hooks.onMode(this.mode);
    }
    this.hooks.onHud(this.hud());
  }
}

function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function approach(v: number, target: number, delta: number) {
  if (v < target) return Math.min(target, v + delta);
  return Math.max(target, v - delta);
}
