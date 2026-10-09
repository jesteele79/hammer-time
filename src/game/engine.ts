import { AudioBus } from "./audio";
import {
  HERO_BODY_HEIGHT,
  HERO_BODY_WIDTH,
  SWING_SECONDS,
  sweptHeadHits,
  type Point,
} from "./combat";
import { drawHero, artworkToWorld, heroMallet, type HeroPose } from "./hero";
import { DISPLAY_H, DISPLAY_W, GROUND_ROW, ID, TILE, VIEW_H, VIEW_W, isSolid } from "./constants";
import { buildLevels, type Level } from "./levels";

export type Mode =
  "title" | "card" | "play" | "pause" | "die" | "slide" | "walkoff" | "tally" | "over" | "win";

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
};

export type TouchAction =
  "left" | "right" | "jump" | "run" | "down" | "fire" | "towel" | "hammer" | "super";

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
};

type Enemy = Body & {
  kind: "soot" | "shell";
  alive: boolean;
  state: "walk" | "shell" | "flat";
  awake: boolean;
  flatT: number;
  facing: 1 | -1;
  chain: number;
  grace: number;
  anim: number;
  wake: number;
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
  " ": ["000", "000", "000", "000", "000"],
};

const STEP = 1 / 60;
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
    __kiln?: { mode: Mode; x: number; y: number };
  }
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private audio = new AudioBus();
  private courses: Level[];
  private bonus: Level;
  private level!: Level;
  private levelIndex = 0;
  private tiles!: Uint8Array;
  private player!: Player;
  private enemies: Enemy[] = [];
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
  private heroIdle = new Image();
  private heroBody = new Image();
  private heroUpper = new Image();
  private heroFore = new Image();
  private heroHand = new Image();
  private heroReach = new Image();
  private officeBg = new Image();
  private zeroCan = new Image();
  private beaver = new Image();
  private worker = new Image();
  private scrubs = new Image();
  private heat = 0;
  private checkpoint = 0;
  private hurtT = 0;
  private hammerLast: Point | null = null;
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
    this.heroReach.src = "/hero-reach.png?v=rig4";
    this.officeBg.src = "/office-bg.jpg";
    this.zeroCan.src = "/coke-zero.webp";
    this.nuts.src = "/nuts-bag.webp";
    this.towel.src = "/towel-cloth.webp";
    this.audio.preloadCurse();
    this.beaver.src = "/buccees-pickup.webp";
    this.worker.src = "/office-worker.png";
    this.scrubs.src = "/scrubs.png";
    const built = buildLevels();
    this.courses = built.courses;
    this.bonus = built.bonus;
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.loadLevel(this.courses[0], 1, 0, true);
    this.onKeyDown = (e) => {
      this.probeActive = false;
      this.keys.add(e.code);
      if (!e.repeat) {
        if (e.code === "Escape" || e.code === "KeyP") this.togglePause();
        if (this.mode === "play") {
          if (["Space", "ArrowUp", "KeyW", "KeyZ"].includes(e.code)) this.player.jumpBuf = 0.12;
          if (["KeyF", "KeyC", "KeyK"].includes(e.code)) this.fireEdge = true;
          if (["KeyH", "KeyX"].includes(e.code)) this.hammerEdge = true;
          if (e.code === "KeyT") this.towelEdge = true;
          if (e.code === "KeyQ") this.superEdge = true;
        }
      }
      if (
        this.mode === "play" ||
        this.mode === "pause" ||
        this.mode === "slide" ||
        this.mode === "walkoff"
      ) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
          e.preventDefault();
      }
      if (
        (this.mode === "title" || this.mode === "over" || this.mode === "win") &&
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
      if (this.mode === "play") this.togglePause();
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
    this.audio.destroy();
  }

  newGame() {
    if (this.mode !== "title" && this.mode !== "over" && this.mode !== "win") return;
    this.audio.unlock();
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.charge = 0;
    this.star = 0;
    this.heat = 0;
    this.wipe = 0;
    this.levelIndex = 0;
    this.checkpoint = 0;
    this.snap = null;
    this.fade = 0;
    this.loadLevel(this.courses[0], 1, 0, true);
    this.audio.startMusic("day");
    this.mode = "card";
    this.cardT = 1.65;
  }

  togglePause() {
    if (this.mode === "play" || this.mode === "slide" || this.mode === "walkoff") {
      this.pausedFrom = this.mode;
      this.mode = "pause";
      this.audio.stopMusic();
      this.audio.stopVoice();
      this.fireEdge = this.hammerEdge = this.towelEdge = this.superEdge = false;
      this.player.jumpBuf = 0;
    } else if (this.mode === "pause") {
      this.mode = this.pausedFrom;
      this.audio.startMusic(this.level.music);
    }
  }

  toggleMute() {
    this.audio.unlock();
    this.audio.setMuted(!this.audio.muted);
    return this.audio.muted;
  }

  setPointer(id: number, action: TouchAction, down: boolean) {
    this.audio.unlock();
    if (down) this.pointers.set(id, action);
    else this.pointers.delete(id);
    if (down && this.mode === "play") {
      if (action === "jump") this.player.jumpBuf = 0.12;
      if (action === "hammer") this.hammerEdge = true;
      if (action === "fire") this.fireEdge = true;
      if (action === "towel") this.towelEdge = true;
      if (action === "super") this.superEdge = true;
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
    });
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
    if (this.mode !== "play")
      this.fireEdge = this.hammerEdge = this.towelEdge = this.superEdge = false;
    this.jumpHeld = this.actions.jump;

    if (this.mode === "title") {
      this.drawTitle();
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
      if (this.cardT <= 0 && this.visualsReady() && (this.audio.ready || this.audio.failed))
        this.mode = "play";
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
    if (this.mode === "over" || this.mode === "win" || this.mode === "title") return;

    this.player.freeze = Math.max(0, this.player.freeze - dt);

    if (this.mode === "play") this.controlPlayer(dt);
    else if (this.mode === "slide") this.slide(dt);
    else if (this.mode === "walkoff") this.walkoff(dt);
    if (this.superT > 0 && !this.superHit && this.superT < 0.25) {
      this.superHit = true;
      this.superBurst();
    }

    if (this.mode === "play") this.tickClock(dt);
    this.stepItems(dt);
    this.stepEnemies(dt);
    this.stepEmbers(dt);
    if (this.mode === "play") {
      this.collectCoins();
      this.collectItems();
      this.touchEnemies();
      this.tryPipe();
      this.tryFlag();
      if (
        this.level.id !== "bonus" &&
        !this.checkpoint &&
        this.player.x >= this.level.checkpointTile * TILE &&
        this.player.onGround
      ) {
        this.checkpoint = this.level.checkpointTile * TILE;
        this.float(this.player.x, this.player.y - 12, "CHECKPOINT");
        this.audio.power();
      }
      if (this.player.y > VIEW_H + 24) this.kill();
    }
    this.followCamera(dt);
  }

  private controlPlayer(dt: number) {
    const p = this.player;
    const locked = this.wipe > 0 || p.freeze > 0 || this.hurtT > 0;
    if (this.towelEdge && this.heat > 0 && p.onGround && this.swing <= 0 && this.snotT <= 0) {
      this.heat = 0;
      this.wipe = 0.95;
      p.vx *= 0.2;
      this.audio.cloth();
    }
    this.towelEdge = false;
    const run = this.actions.run && !locked;
    const tired = this.heat >= 80;
    const cap = tired ? 116 : 158;
    this.heat = clamp(this.heat + (run && Math.abs(p.vx) > 100 ? 6 : -3) * dt, 0, 100);
    const accel = (p.onGround ? 540 : 320) * (run ? 1.15 : 1) * (tired ? 0.82 : 1);
    if (this.actions.left && !locked) {
      p.vx -= accel * dt;
      p.facing = -1;
    }
    if (this.actions.right && !locked) {
      p.vx += accel * dt;
      p.facing = 1;
    }

    const reversing =
      p.onGround && ((this.actions.left && p.vx > 36) || (this.actions.right && p.vx < -36));
    p.skid = reversing;
    if ((!this.actions.left && !this.actions.right) || this.wipe > 0) {
      const f = 620 * dt;
      if (Math.abs(p.vx) <= f) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * f;
    } else if (reversing) {
      p.vx += (this.actions.left ? -1 : 1) * 780 * dt;
    }
    if (!run && Math.abs(p.vx) > (tired ? 64 : 96))
      p.vx = approach(p.vx, (tired ? 64 : 96) * Math.sign(p.vx), 240 * dt);
    p.vx = clamp(p.vx, -cap, cap);

    if (!locked && (p.onGround || p.coyote > 0) && p.jumpBuf > 0) {
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

    if (
      !locked &&
      this.swing <= 0 &&
      this.fireEdge &&
      p.form === 2 &&
      this.fireCd <= 0 &&
      this.embers.length < 2 &&
      this.superT <= 0 &&
      this.snotT <= 0 &&
      this.wipe <= 0
    ) {
      this.snotT = 0.45;
      this.snotFired = false;
      this.fireCd = 0.72;
    }
    this.fireEdge = false;
    if (this.snotT > 0 && !this.snotFired && this.snotT < 0.25) {
      this.snotFired = true;
      const n = artworkToWorld(this.heroPose(), { x: 355, y: 172 });
      this.embers.push({
        x: n.x,
        y: n.y,
        ox: n.x,
        oy: n.y,
        vx: 280 * p.facing,
        vy: -36,
        life: 1.15,
        max: 1.15,
      });
      this.heat = Math.min(100, this.heat + 5);
      this.audio.snot();
    }

    if (this.superEdge && this.charge >= 10 && !locked && this.snotT <= 0 && this.swing <= 0)
      this.startSuper();
    this.superEdge = false;
    if (this.hammerEdge && !locked && this.superT <= 0 && this.snotT <= 0 && this.swing <= 0) {
      this.swing = SWING_SECONDS;
      this.hammerLast = heroMallet(this.heroPose());
      this.hammerVictims.clear();
      this.hammerBlocks.clear();
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
          e.state = "walk";
          const feet = e.y + e.h;
          e.h = 30;
          e.y = feet - 30;
          e.facing = this.player.x < e.x ? -1 : 1;
          e.vx = e.facing * 36;
          e.wake = 0;
        }
      } else e.wake = 0;

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
      if (e.kind === "shell" && e.state === "walk" && e.onGround) {
        const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        const tx = Math.floor(ahead / TILE);
        const ty = Math.floor((e.y + e.h + 2) / TILE);
        const under = this.tileAt(tx, ty);
        if (!isSolid(under) && under !== ID.ledge) {
          e.vx = -e.vx || -34;
          e.facing = e.vx >= 0 ? 1 : -1;
        }
      }
      if (e.y > VIEW_H + 32) e.alive = false;
      if (e.state === "shell" && Math.abs(e.vx) > 40) this.shellHits(e);
    }
    this.enemies = this.enemies.filter((e) => e.alive);
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
      this.eachCell(
        Math.min(a.x, end.x) - 2,
        Math.min(a.y, end.y) - 2,
        Math.abs(end.x - a.x) + 4,
        Math.abs(end.y - a.y) + 4,
        (tx, ty) => {
          if (isSolid(this.tileAt(tx, ty)) || this.tileAt(tx, ty) === ID.ledge) blocked = true;
        },
      );
      if (!blocked)
        for (const e of this.enemies) {
          if (!e.alive || e.state === "flat" || !sweptHeadHits(a, end, 2, e)) continue;
          this.splat(e);
          blocked = true;
          break;
        }
      if (blocked) {
        b.life = 0;
        this.splashes.push({ x: b.x, y: b.y, life: 0.8 });
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
          const feet = e.y + e.h;
          e.state = "shell";
          e.h = 10;
          e.y = feet - 10;
          e.vx = 0;
          this.noteVictory(e, 100);
        } else this.kick(e);
        this.audio.bump();
      } else if (e.grace <= 0) {
        if (e.state === "shell" && Math.abs(e.vx) < 24) this.kick(e);
        else this.hurt(e);
      }
    }
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

  private splat(e: Enemy) {
    if (!e.alive || e.state === "flat") return;
    e.alive = false;
    this.noteVictory(e, 100);
    this.audio.stomp();
  }

  private tryHammer() {
    const pose = this.heroPose();
    const head = heroMallet(pose);
    const prev = this.hammerLast ?? head;
    this.hammerLast = head;
    const u = 1 - this.swing / SWING_SECONDS;
    if (u < 0.28 || u > 0.68) return;
    for (const e of this.enemies) {
      if (
        !e.alive ||
        e.state === "flat" ||
        this.hammerVictims.has(e) ||
        !sweptHeadHits(prev, head, 5, e)
      )
        continue;
      this.hammerVictims.add(e);
      this.hitstop = 0.045;
      this.shake = Math.max(this.shake, 0.07);
      this.flyPapers(head.x, head.y, 5);
      this.audio.thud();
      if (e.kind === "soot") {
        e.state = "flat";
        e.flatT = 0;
        e.vx = this.player.facing * 30;
        this.noteVictory(e, 100);
      } else if (e.state === "walk") {
        const feet = e.y + e.h;
        e.state = "shell";
        e.vx = 0;
        e.chain = 0;
        e.wake = 0;
        e.h = 10;
        e.y = feet - 10;
        this.noteVictory(e, 100);
      } else this.kick(e);
    }
    this.eachCell(
      Math.min(prev.x, head.x) - 5,
      Math.min(prev.y, head.y) - 5,
      Math.abs(head.x - prev.x) + 10,
      Math.abs(head.y - prev.y) + 10,
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
        if (!sweptHeadHits(prev, head, 5, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE })) return;
        this.hammerBlocks.add(key);
        this.hitBlock(tx, ty, true);
      },
    );
  }

  private startSuper() {
    const p = this.player;
    this.charge = 0;
    this.superT = 0.62;
    this.superHit = false;
    this.swing = 0;
    p.vy = -300;
    p.onGround = false;
    this.audio.power();
    this.shake = Math.max(this.shake, 0.08);
    this.flyPapers(p.x + p.w / 2, p.y, 10);
  }

  private superBurst() {
    const p = this.player;
    const cx = p.x + p.w / 2 + p.facing * 10;
    const cy = p.y + p.h * 0.55;
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
    this.shake = 0.28;
    this.audio.slam();
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
      this.scoreAdd(200);
      this.float(e.x, e.y, "200");
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
    this.mode = "slide";
    this.player.x = this.level.flagTile * TILE - 4;
    this.player.vx = 0;
    this.flagY = 36;
  }

  private enterBonus(pipe: { x: number; top: number }) {
    this.snap = {
      level: this.level,
      tiles: this.tiles.slice(),
      enemies: this.enemies.map((e) => ({ ...e })),
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
    this.snotT = 0;
    this.snotFired = false;
    this.audio.startMusic(this.level.music);
    this.mode = "play";
  }

  private followCamera(dt: number) {
    if (this.mode === "die") return;
    const max = Math.max(0, this.level.w * TILE - VIEW_W);
    const desired = clamp(this.player.x - VIEW_W * 0.32, 0, max);
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
    }
    this.swing = this.superT = this.snotT = 0;
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
    };
    this.enemies = src.enemies.map((sp) => ({
      kind: sp.kind,
      x: sp.x * TILE,
      y: GROUND_ROW * TILE - 30,
      w: 14,
      h: 30,
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
    }));
    this.items = [];
    this.embers = [];
    this.splashes = [];
    this.heat = 0;
    this.wipe = 0;
    this.hurtT = 0;
    this.swing = 0;
    this.superT = 0;
    this.snotT = 0;
    this.snotFired = false;
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
    this.float(p.x, p.y, next === 2 ? "PEPPER READY" : "1000");
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
    this.swing = this.superT = this.snotT = this.wipe = 0;
    this.fireEdge = this.hammerEdge = this.towelEdge = this.superEdge = false;
    this.hurtT = 0.18;
    this.hitstop = 0.04;
    this.shake = 0.12;
    this.audio.curse();
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
    const ctx = this.ctx;
    const cam = Math.floor(this.camX);
    this.paintStage(cam, this.level.sky !== "day");
    ctx.save();
    if (this.shake > 0 && !this.reduce) {
      ctx.translate(Math.sin(this.clock * 80) * Math.min(2, this.shake * 14), 0);
    }
    this.drawSky(cam);
    this.drawTiles(cam);
    this.drawDeco(cam);
    if (this.level.checkpointTile >= 0) {
      const x = this.level.checkpointTile * TILE - cam;
      ctx.fillStyle = this.checkpoint ? "#e8c060" : "#65cbb4";
      ctx.fillRect(x, 140, 2, 52);
      ctx.fillRect(x + 2, 140, 34, 12);
      this.px(this.checkpoint ? "SAVED" : "BREAK", x + 5, 144, "#102c32");
    }
    this.drawFlag(cam);
    this.drawCastle(cam);
    for (const it of this.items) this.drawPickup(it, cam);
    for (const e of this.enemies) this.drawEnemy(e, cam);
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
    if (!hide && !flicker && this.mode !== "die") this.drawPlayer(cam);
    if (this.mode === "die") this.drawPlayer(cam);
    this.drawEmbers(cam);
    if (this.curse > 0) this.drawCurse(cam);
    for (const t of this.texts) this.px(t.text, t.x - cam, t.y, "#fff6d8");
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(12,8,6,${clamp(this.fade, 0, 1)})`;
      ctx.fillRect(-4, -4, VIEW_W + 8, VIEW_H + 8);
    }
    ctx.restore();
    this.gradeStage();
    void dt;
  }

  private paintStage(cam: number, night: boolean) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = "#141c28";
    ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
    if (this.officeBg.complete && this.officeBg.naturalWidth > 0) {
      const cover = Math.max(
        DISPLAY_W / this.officeBg.naturalWidth,
        DISPLAY_H / this.officeBg.naturalHeight,
      );
      const dw = this.officeBg.naturalWidth * cover;
      const dh = this.officeBg.naturalHeight * cover;
      const span = dw;
      let x = -((cam * 1.6) % span);
      if (x > 0) x -= span;
      const y = (DISPLAY_H - dh) / 2;
      for (; x < DISPLAY_W; x += span - 1) ctx.drawImage(this.officeBg, x, y, dw, dh);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 420 - cam * 1.1) % (DISPLAY_W + 480)) - 240;
      const shaft = ctx.createLinearGradient(x, 0, x + 220, DISPLAY_H);
      shaft.addColorStop(0, night ? "rgba(180,200,255,0.05)" : "rgba(255,244,214,0.28)");
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
      lamp.addColorStop(0, night ? "rgba(180,200,230,0.2)" : "rgba(255,248,220,0.55)");
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
      const g = ctx.createLinearGradient(sx, sy, sx, sy + 16);
      g.addColorStop(0, (tx + ty) % 2 === 0 ? "#637079" : "#5c6972");
      g.addColorStop(0.2, "#36424d");
      g.addColorStop(1, "#1d2934");
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, 16, 16);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(sx, sy, 16, 1.4);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(sx + 15.6, sy + 2, 0.4, 14);
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
      this.cabinet(sx, sy, false);
      return;
    }
    if (id === ID.used) {
      this.cabinet(sx, sy, true);
      return;
    }
    if (id === ID.treat) {
      this.beaverMark(sx + 8, sy + 16, 22);
      return;
    }
    if (id === ID.question || id === ID.power) {
      const glow = id === ID.power ? "#e8943a" : "#7eb6dc";
      const mark = id === ID.power ? "!" : "?";
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.roundRect(sx + 1, sy + 2, 15, 15, 2);
      ctx.fill();
      const g = ctx.createLinearGradient(sx, sy, sx, sy + 16);
      g.addColorStop(0, "#f7f4ee");
      g.addColorStop(1, glow);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(sx, sy, 16, 16, 2.5);
      ctx.fill();
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(sx + 2, sy + 3, 12, 8);
      this.px(mark, sx + 6, sy + 4, "#f6e7c1");
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
      ctx.fillStyle = "#c4a574";
      ctx.beginPath();
      ctx.roundRect(x + 2, y - 8, 10, 8, 1);
      ctx.fill();
      ctx.fillStyle = d.k === "shrub" ? "#3f8f55" : "#6d7a55";
      ctx.beginPath();
      ctx.ellipse(x + 7, y - 12, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.fillStyle = "#3c4658";
    ctx.fillRect(x, base - 56, 44, 56);
    ctx.fillStyle = "#d5e6f2";
    ctx.fillRect(x + 4, base - 50, 36, 42);
    ctx.fillStyle = "#9bb4c6";
    ctx.fillRect(x + 21, base - 50, 2, 42);
    ctx.fillStyle = "#f2c14e";
    ctx.fillRect(x + 28, base - 28, 3, 3);
    ctx.fillStyle = "#3f8f55";
    ctx.fillRect(x + 8, base - 66, 28, 8);
    ctx.fillStyle = "#f7f3ea";
    ctx.fillRect(x + 12, base - 64, 20, 4);
  }

  private drawEnemy(e: Enemy, cam: number) {
    const blink = e.state === "shell" && e.wake > 3 && Math.floor(this.clock * 12) % 2 === 0;
    if (blink) return;
    const ctx = this.ctx;
    const person = e.kind === "shell" ? this.scrubs : this.worker;
    ctx.save();
    ctx.translate(e.x + e.w / 2 - cam, e.y + e.h);
    ctx.scale(e.facing < 0 ? -1 : 1, 1);
    ctx.fillStyle = "rgba(20,16,12,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (person.complete && person.naturalWidth > 0) {
      if (e.state === "flat") {
        const h = 16;
        const w = (person.naturalWidth / person.naturalHeight) * 32;
        ctx.drawImage(person, -w / 2, -h, w, h);
      } else if (e.kind === "shell" && e.state === "shell") {
        const h = 26;
        const w = (person.naturalWidth / person.naturalHeight) * h;
        ctx.rotate(-1.15);
        ctx.drawImage(person, -w * 0.35, -h * 0.45, w, h);
      } else {
        const step = Math.sin(this.clock * 9 + e.x * 0.2);
        const h = 34;
        const w = (person.naturalWidth / person.naturalHeight) * h;
        ctx.rotate(step * 0.05);
        ctx.drawImage(person, -w * 0.42, -h - Math.abs(step) * 1.2, w, h);
      }
    } else {
      ctx.fillStyle = e.kind === "shell" ? "#2f6b45" : "#2c3442";
      ctx.beginPath();
      ctx.roundRect(-7, -15, 14, 14, 5);
      ctx.fill();
    }
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
      this.heroReach.complete &&
      this.heroReach.naturalWidth > 0 &&
      this.heroHand.naturalWidth > 0 &&
      this.heroIdle.complete &&
      this.heroIdle.naturalWidth > 0
    );
  }

  private visualsReady() {
    return (
      this.rigReady() &&
      [
        this.officeBg,
        this.zeroCan,
        this.nuts,
        this.beaver,
        this.towel,
        this.worker,
        this.scrubs,
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
        p.onGround && Math.abs(p.vx) > 16 && this.wipe <= 0 && this.swing <= 0 && this.snotT <= 0,
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
    };
  }

  private drawRig(cam: number) {
    drawHero(
      this.ctx,
      {
        idle: this.heroIdle,
        body: this.heroBody,
        upper: this.heroUpper,
        fore: this.heroFore,
        reach: this.heroReach,
        hand: this.heroHand,
        towel: this.towel,
      },
      this.heroPose(),
      cam,
    );
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
      ctx.save();
      ctx.translate(b.x - cam, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.strokeStyle = "rgba(193,216,129,0.62)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(-4, 1.5, 1, 0);
      ctx.stroke();
      ctx.fillStyle = "rgba(170,197,106,0.86)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.1, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(250,255,223,0.82)";
      ctx.beginPath();
      ctx.ellipse(0, -0.7, 1.5, 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

  private drawCurse(cam: number) {
    const line = "ABSOLUTE BULLSHIT";
    const w = line.length * 4;
    const x = clamp(this.player.x - cam - 6, 2, VIEW_W - w - 2);
    const y = clamp(this.player.y - 18, 4, VIEW_H - 16);
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

  private drawTitle() {
    const ctx = this.ctx;
    this.paintStage(this.clock * 8, false);
    const hero = this.heroIdle;
    if (hero.complete && hero.naturalWidth > 0) {
      const h = 168;
      const w = (hero.naturalWidth / hero.naturalHeight) * h;
      ctx.drawImage(hero, VIEW_W - w - 18, 206 - h, w, h);
    }
    const shade = ctx.createLinearGradient(0, 0, VIEW_W, 0);
    shade.addColorStop(0, "rgba(6,14,21,0.94)");
    shade.addColorStop(0.62, "rgba(6,14,21,0.65)");
    shade.addColorStop(1, "rgba(6,14,21,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 260, VIEW_H);

    this.gradeStage();
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
      hint:
        this.level.id === "bonus"
          ? "Supply closet · ↓ on the left copier to return"
          : this.star > 0
            ? "Buc-ee's boost · charge through the office!"
            : this.heat >= 80
              ? "Overheated · T to wipe your brow"
              : this.charge >= 10
                ? "Super smash ready · Q"
                : this.player.x < 260
                  ? "Jump into the ! crate for pepper · F fires snot"
                  : this.player.x < 600
                    ? "H swings the mallet · hit with the head"
                    : this.player.form === 2
                      ? "F snot rocket · nuts charge Q super smash"
                      : "Find a ! crate to restore pepper power",
    };
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
