import { AudioBus } from "./audio";
import { DISPLAY_H, DISPLAY_W, GROUND_ROW, ID, TILE, VIEW_H, VIEW_W, isSolid } from "./constants";
import { buildLevels, type Level } from "./levels";
import { loadSprites, type SpriteBook } from "./sprites";

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
  | "win";

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
};

type TouchAction = "left" | "right" | "jump" | "run" | "down" | "fire" | "towel";

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
type Bit = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; s: number };
type Sheet = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; life: number; max: number };
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
  private sprites: SpriteBook;
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
  private face = new Image();
  private heroIdle = new Image();
  private heroJump = new Image();
  private heroSwing = new Image();
  private heroSwingCalm = new Image();
  private heroWalkA = new Image();
  private heroWalkB = new Image();
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
  private hops = 0;
  private wipe = 0;
  private hitstop = 0;
  private curse = 0;
  private swing = 0;
  private swingHit = false;
  private superT = 0;
  private superHit = false;
  private nose = 0;
  private snotT = 0;
  private snotFired = false;
  private elbow = 0;
  private elbowV = 0;
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
  };
  private actions = { ...this.touch, hammer: false };
  private prevJump = false;
  private prevFire = false;
  private prevPause = false;
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
    this.sprites = loadSprites();
    this.face.src = "/hammer-face.jpg";
    this.heroIdle.src = "/hero-idle-calm.png?v=lock";
    this.heroJump.src = "/hero-jump-calm.png?v=lock";
    this.heroSwing.src = "/hero-swing.png?v=lock";
    this.heroSwingCalm.src = "/hero-swing-calm.png?v=lock";
    this.heroWalkA.src = "/hero-walk-a-calm.png?v=lock";
    this.heroWalkB.src = "/hero-walk-b-calm.png?v=lock";
    this.heroBody.src = "/hero-body.png?v=rig4";
    this.heroUpper.src = "/hero-upper.png?v=rig4";
    this.heroFore.src = "/hero-fore.png?v=rig4";
    this.heroHand.src = "/hero-hand.png?v=rig4";
    this.heroReach.src = "/hero-reach.png?v=rig4";
    this.officeBg.src = "/office-bg.jpg";
    this.zeroCan.src = "/zero-can.png";
    this.beaver.src = "/beaver.png";
    this.worker.src = "/office-worker.png";
    this.scrubs.src = "/scrubs.png";
    const built = buildLevels();
    this.courses = built.courses;
    this.bonus = built.bonus;
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.loadLevel(this.courses[0], 0, 0, true);
    this.onKeyDown = (e) => {
      this.probeActive = false;
      this.keys.add(e.code);
      if (this.mode === "play" || this.mode === "pause" || this.mode === "slide" || this.mode === "walkoff") {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      }
      if ((this.mode === "title" || this.mode === "over" || this.mode === "win") && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        this.newGame();
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onBlur = () => {
      this.keys.clear();
      this.pointers.clear();
      this.recomputeTouch();
    };
    this.onVis = () => {
      if (document.visibilityState === "visible") this.audio.unlock();
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
  }

  newGame() {
    if (this.mode !== "title" && this.mode !== "over" && this.mode !== "win") return;
    this.audio.unlock();
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.charge = 0;
    this.star = 0;
    this.hops = 0;
    this.wipe = 0;
    this.levelIndex = 0;
    this.snap = null;
    this.fade = 0;
    this.loadLevel(this.courses[0], 0, 0, true);
    this.audio.startMusic("day");
    this.mode = "card";
    this.cardT = 1.65;
  }

  togglePause() {
    if (this.mode === "play" || this.mode === "slide" || this.mode === "walkoff") {
      this.pausedFrom = this.mode;
      this.mode = "pause";
      this.audio.stopMusic();
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
    this.recomputeTouch();
  }

  private recomputeTouch() {
    this.touch = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false };
    for (const action of this.pointers.values()) this.touch[action] = true;
  }

  private installProbe() {
    const game = this;
    window.__controlsTest = {
      getYaw: () => 0,
      getSpeed: () => game.player.vx,
      getX: () => game.player.x,
      setKeys: (codes) => {
        game.probeActive = true;
        game.probe = new Set(codes);
      },
    };
    window.__kiln = {
      get mode() {
        return game.mode;
      },
      get x() {
        return game.player.x;
      },
      get y() {
        return game.player.y;
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
      jump: t.jump || this.held("Space") || this.held("ArrowUp") || this.held("KeyW") || this.held("KeyZ"),
      run: t.run || this.held("ShiftLeft") || this.held("ShiftRight") || this.held("KeyJ"),
      down: t.down || this.held("ArrowDown") || this.held("KeyS"),
      fire: t.fire || this.held("KeyF") || this.held("KeyC") || this.held("KeyK"),
      hammer: t.run || this.held("KeyH") || this.held("KeyX"),
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
    this.clock += dt;
    this.sample();
    const pause = this.held("Escape") || this.held("KeyP");
    if (pause && !this.prevPause) this.togglePause();
    this.prevPause = pause;
    if (this.mode === "play" && this.actions.jump && !this.prevJump) this.player.jumpBuf = 0.12;
    if (this.mode === "play" && !this.actions.jump && this.prevJump) this.jumpRelease = true;
    this.prevJump = this.actions.jump;
    if (this.actions.fire && !this.prevFire) this.fireEdge = true;
    this.prevFire = this.actions.fire;
    if (this.actions.hammer && !this.prevHammer) this.hammerEdge = true;
    this.prevHammer = this.actions.hammer;
    if (this.actions.towel && !this.prevTowel) this.towelEdge = true;
    this.prevTowel = this.actions.towel;
    this.jumpHeld = this.actions.jump;

    if (this.mode === "title") {
      this.drawTitle();
      this.emit();
      return;
    }
    if (this.mode === "pause") {
      this.render(dt);
      this.ctx.fillStyle = "rgba(12,8,6,0.45)";
      this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
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
    this.nose = Math.max(0, this.nose - dt);
    this.snotT = Math.max(0, this.snotT - dt);
    this.settleArm(dt);
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
      if (this.cardT <= 0) this.mode = "play";
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

    if (this.player.freeze > 0 && this.mode === "play") {
      this.player.freeze -= dt;
      this.wipe = Math.max(0, this.wipe - dt);
      this.player.anim += dt;
      return;
    }

    if (this.mode === "play") this.controlPlayer(dt);
    else if (this.mode === "slide") this.slide(dt);
    else if (this.mode === "walkoff") this.walkoff(dt);
    if (this.superT > 0 && !this.superHit && this.superT < 0.34) {
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
      if (this.player.y > VIEW_H + 24) this.kill();
    }
    this.followCamera(dt);
  }

  private controlPlayer(dt: number) {
    const p = this.player;
    this.wipe = Math.max(0, this.wipe - dt);
    if (this.towelEdge && this.hops >= 6) {
      this.hops = 0;
      this.wipe = 0.92;
      p.freeze = 0.88;
      p.vx *= 0.2;
      this.audio.bump();
    }
    this.towelEdge = false;
    const run = this.actions.run;
    const tired = this.hops >= 6;
    const cap = tired ? 86 : 158;
    const accel = (p.onGround ? 540 : 320) * (run ? 1.15 : 1) * (tired ? 0.72 : 1);
    if (this.actions.left) {
      p.vx -= accel * dt;
      p.facing = -1;
    }
    if (this.actions.right) {
      p.vx += accel * dt;
      p.facing = 1;
    }
    const reversing = p.onGround && ((this.actions.left && p.vx > 36) || (this.actions.right && p.vx < -36));
    p.skid = reversing;
    if (!this.actions.left && !this.actions.right) {
      const f = 620 * dt;
      if (Math.abs(p.vx) <= f) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * f;
    } else if (reversing) {
      p.vx += (this.actions.left ? -1 : 1) * 780 * dt;
    }
    if (!run && Math.abs(p.vx) > (tired ? 64 : 96)) p.vx = approach(p.vx, (tired ? 64 : 96) * Math.sign(p.vx), 240 * dt);
    p.vx = clamp(p.vx, -cap, cap);

    if ((p.onGround || p.coyote > 0) && p.jumpBuf > 0) {
      p.vy = Math.abs(p.vx) > 118 && !tired ? -408 : -350;
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuf = 0;
      p.land = 0;
      this.hops = Math.min(12, this.hops + 1);
      this.audio.jump();
    }
    if (this.jumpRelease && p.vy < -40) p.vy *= 0.5;
    this.jumpRelease = false;
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);

    let g = p.vy < 0 ? 1080 : 1980;
    if (Math.abs(p.vy) < 46) g *= 0.48;
    p.vy = Math.min(310, p.vy + g * dt);

    if (
      this.fireEdge &&
      p.form === 2 &&
      this.fireCd <= 0 &&
      this.embers.length < 2 &&
      this.superT <= 0 &&
      this.snotT <= 0 &&
      this.wipe <= 0
    ) {
      this.snotT = this.reduce ? 0.28 : 0.6;
      this.snotFired = false;
      this.fireCd = 0.72;
      this.nose = 0.45;
    }
    this.fireEdge = false;
    if (this.snotT > 0 && !this.snotFired && (this.reduce || this.snotT < 0.28)) {
      this.snotFired = true;
      const n = this.rigWorld(355, 172);
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
      for (let i = 0; i < 4; i++) this.puff(n.x, n.y, i % 2 ? "#d6ee6a" : "#7eae28");
      this.audio.snot();
    }

    if (this.hammerEdge && this.superT <= 0) {
      if (this.charge >= 10) this.startSuper();
      else if (this.swing <= 0) {
        this.swing = 0.5;
        this.swingHit = false;
        this.audio.kick();
      }
    }
    this.hammerEdge = false;
    if (this.swing > 0 && !this.swingHit && this.swing < 0.26) {
      this.swingHit = true;
      this.tryHammer();
    }

    p.prevY = p.y;
    const was = p.onGround;
    this.moveBody(p, dt, true);
    if (p.onGround) {
      p.coyote = 0.09;
      if (!was) p.land = 0.09;
    } else p.coyote = Math.max(0, p.coyote - dt);
    p.anim += dt;
    if (p.skid && Math.random() < 0.4) this.puff(p.x + p.w / 2, p.y + p.h, "#e7d2b4");
    else if (p.onGround && Math.abs(p.vx) > 80 && Math.random() < 0.25) this.puff(p.x + 4, p.y + p.h, "#d8c2a4");
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
    this.timeAcc += dt;
    while (this.timeAcc >= 0.4) {
      this.timeAcc -= 0.4;
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
          e.h = 16;
          e.y = feet - 16;
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
      b.vy = Math.min(220, b.vy + 900 * dt);
      const prevX = b.x;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const tx = Math.floor((b.x + 3) / TILE);
      const ty = Math.floor((b.y + 3) / TILE);
      if (isSolid(this.tileAt(tx, ty)) && b.x !== prevX) b.life = 0;
      const foot = this.tileAt(Math.floor((b.x + 3) / TILE), Math.floor((b.y + 6) / TILE));
      if ((isSolid(foot) || foot === ID.ledge) && b.vy > 0) b.vy = -150;
      for (const e of this.enemies) {
        if (!e.alive || e.state === "flat") continue;
        if (b.x < e.x + e.w && b.x + 8 > e.x && b.y < e.y + e.h && b.y + 6 > e.y) {
          b.life = 0;
          this.splat(e);
          for (let i = 0; i < 5; i++) this.puff(e.x + e.w / 2, e.y + 4, i % 2 ? "#8fbf3a" : "#4f7a22");
        }
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
        this.grantZeros(10, tx * TILE, ty * TILE);
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
        this.grantZeros(10, it.x, it.y);
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
    const p = this.player;
    const reach = p.form > 0 ? 20 : 14;
    const box = {
      x: p.facing > 0 ? p.x + p.w - 4 : p.x - reach,
      y: p.y + 1,
      w: reach + 4,
      h: Math.max(8, p.h - 2),
    };
    let hit = false;
    for (const e of this.enemies) {
      if (!e.alive || e.state === "flat" || !overlap(box, e)) continue;
      hit = true;
      this.hitstop = 0.05;
      this.shake = Math.max(this.shake, 0.07);
      this.flyPapers(e.x + e.w / 2, e.y, 5);
      if (e.kind === "soot") {
        e.state = "flat";
        e.vx = p.facing * 30;
        e.vy = -40;
        e.y += 6;
        e.h = 8;
        this.noteVictory(e, 100);
        this.audio.stomp();
      } else if (e.state === "walk") {
        const feet = e.y + e.h;
        e.state = "shell";
        e.vx = 0;
        e.chain = 0;
        e.wake = 0;
        e.h = 10;
        e.y = feet - 10;
        this.noteVictory(e, 100);
        this.audio.bump();
      } else {
        this.kick(e);
      }
    }
    const tx = Math.floor((p.facing > 0 ? p.x + p.w + 4 : p.x - 4) / TILE);
    const ty = Math.floor((p.y + p.h * 0.35) / TILE);
    const id = this.tileAt(tx, ty);
    if (id === ID.brick || id === ID.brickCoin || id === ID.question || id === ID.power || id === ID.hidden || id === ID.treat) {
      this.hitBlock(tx, ty, false);
      hit = true;
    }
    if (hit) this.shake = Math.max(this.shake, 0.05);
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
    if (this.player.x + this.player.w > fx + 2 && this.player.y < GROUND_ROW * TILE) this.beginSlide();
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
    this.player = s.player;
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
    const desired = clamp(this.player.x - 72, 0, max);
    if (this.level.id === "bonus") {
      this.camX = approach(this.camX, desired, 640 * dt);
      return;
    }
    if (desired > this.camX) this.camX = approach(this.camX, desired, 560 * dt);
    if (this.camX > max) this.camX = max;
    if (this.player.x < this.camX && this.mode === "play") {
      this.player.x = this.camX;
      if (this.player.vx < 0) this.player.vx = 0;
    }
  }

  private kill(quiet = false) {
    if (this.mode === "die" || this.mode === "over" || this.mode === "tally" || this.mode === "slide" || this.mode === "walkoff") return;
    this.mode = "die";
    this.dieT = 1.25;
    this.player.vy = -250;
    this.player.vx = 0;
    this.snap = null;
    this.audio.stopMusic();
    if (!quiet) this.audio.die();
    this.shake = 0.18;
    this.star = 0;
    this.hops = 0;
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
    this.loadLevel(this.courses[this.levelIndex], 0, 1.3, true);
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
    this.loadLevel(this.courses[next], form, 0, true);
    this.audio.startMusic(this.level.music);
    this.mode = "card";
    this.cardT = 1.65;
  }

  private loadLevel(src: Level, form: 0 | 1 | 2, invuln: number, resetTime: boolean) {
    this.curse = 0;
    this.level = src;
    this.tiles = new Uint8Array(src.tiles);
    const h = form === 0 ? 14 : 22;
    this.player = {
      x: src.spawnX,
      y: GROUND_ROW * TILE - h,
      w: 12,
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
      y: GROUND_ROW * TILE - 16,
      w: 14,
      h: 16,
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
    this.swing = 0;
    this.superT = 0;
    this.nose = 0;
    this.snotT = 0;
    this.snotFired = false;
    this.elbow = 0;
    this.elbowV = 0;
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
    const feet = p.y + p.h;
    const h = 22;
    let y = feet - h;
    if (this.overlapsSolid(p.x, y, p.w, h)) {
      this.bonusPoints();
      return;
    }
    p.form = next;
    p.h = h;
    p.y = y;
    p.invuln = Math.max(p.invuln, 0.9);
    p.freeze = 0.32;
    this.scoreAdd(1000);
    this.float(p.x, p.y, "1000");
    this.audio.power();
  }

  private bonusPoints() {
    this.scoreAdd(1000);
    this.float(this.player.x, this.player.y, "1000");
    this.audio.power();
  }

  private shrink() {
    const p = this.player;
    const feet = p.y + p.h;
    p.form = p.form > 1 ? 1 : 0;
    p.h = p.form === 0 ? 14 : 22;
    p.y = feet - p.h;
    p.invuln = 1.45;
    p.freeze = 0.22;
    this.audio.bump();
  }

  private hurt(from: { x: number; w: number }) {
    if (this.star > 0 || this.player.invuln > 0 || this.mode !== "play") return;
    const p = this.player;
    const dir = p.x + p.w / 2 < from.x + from.w / 2 ? -1 : 1;
    this.curse = 2.15;
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
    this.audio.coin();
    this.float(x, y, n === 1 ? "200" : String(200 * n));
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
    this.float(this.player.x, this.player.y - 12, "TREAT");
    this.audio.power();
    this.shake = Math.max(this.shake, 0.08);
  }

  private spawnItem(tx: number, ty: number) {
    const kind = this.player.form === 0 ? "gear" : "lamp";
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
    this.bits.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: -16, life: 0.25, max: 0.25, color, s: 2 });
  }

  private float(x: number, y: number, text: string) {
    this.texts.push({ x, y, vy: -28, life: 0.7, text });
  }

  private updateFx(dt: number) {
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

  private eachCell(x: number, y: number, w: number, h: number, fn: (tx: number, ty: number) => void) {
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
      (this.mode === "walkoff" && this.level.castleTile >= 0 && this.player.x > this.level.castleTile * TILE + 20);
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
      const cover = Math.max(DISPLAY_W / this.officeBg.naturalWidth, DISPLAY_H / this.officeBg.naturalHeight);
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
    const g = ctx.createRadialGradient(DISPLAY_W / 2, DISPLAY_H * 0.45, DISPLAY_H * 0.2, DISPLAY_W / 2, DISPLAY_H / 2, DISPLAY_H * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
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
      g.addColorStop(0, (tx + ty) % 2 === 0 ? "#7d8a62" : "#738058");
      g.addColorStop(0.2, "#5e6b48");
      g.addColorStop(1, "#3c4a32");
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, 16, 16);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(sx, sy, 16, 1.4);
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
      this.beaverMark(sx + 8, sy + 16, 30);
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
      ctx.fillStyle = "#c46a32";
      ctx.beginPath();
      ctx.roundRect(sx + 3, sy + 5, 10, 8, 2);
      ctx.fill();
      ctx.fillStyle = "#f2c14e";
      ctx.fillRect(sx + 5, sy + 7, 6, 1);
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
      const warp = this.level.pipes.some((p) => p.dest && tx >= p.x / TILE && tx <= p.x / TILE + 1 && ty === p.top / TILE);
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

  private icon(img: HTMLImageElement, cx: number, foot: number, h: number) {
    if (!img.complete || !img.naturalWidth) return false;
    const w = (img.naturalWidth / img.naturalHeight) * h;
    this.ctx.drawImage(img, cx - w / 2, foot - h, w, h);
    return true;
  }

  private can(cx: number, foot: number) {
    if (this.icon(this.zeroCan, cx, foot, 26)) return;
    const ctx = this.ctx;
    const x = cx - 4;
    const y = foot - 14;
    const g = ctx.createLinearGradient(x, y, x + 8, y);
    g.addColorStop(0, "#8e1b1b");
    g.addColorStop(0.5, "#e10600");
    g.addColorStop(1, "#6e1010");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, 8, 14, 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(x, y + 4, 8, 2);
    ctx.fillRect(x, y + 9, 8, 2);
  }

  private beaverMark(cx: number, foot: number, h: number) {
    if (this.icon(this.beaver, cx, foot, h)) return;
    const ctx = this.ctx;
    ctx.fillStyle = "#8a5a32";
    ctx.beginPath();
    ctx.ellipse(cx, foot - h * 0.45, h * 0.28, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
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
    const fy = this.mode === "slide" || this.mode === "walkoff" || this.mode === "tally" ? this.flagY : top + 2;
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
      this.heroReach.complete
    );
  }

  private rigHeight() {
    const tall = this.player.form > 0;
    return (tall ? 52 : 44) * (this.superT > 0 ? 1.2 : 1);
  }

  private rigWorld(ix: number, iy: number) {
    const p = this.player;
    const h = this.rigHeight();
    const scale = h / 1371;
    const w = 456 * scale;
    const moving =
      p.onGround &&
      Math.abs(p.vx) > 16 &&
      this.swing <= 0 &&
      this.superT <= 0 &&
      this.wipe <= 0 &&
      this.snotT <= 0 &&
      !this.reduce;
    const stride = Math.max(7, Math.abs(p.vx) / 12);
    const lift = moving ? Math.sin(p.anim * stride * Math.PI) ** 2 * 1.5 : 0;
    const lx = -w * 0.42 + ix * scale;
    const ly = -h - lift + iy * scale;
    return { x: p.x + p.w / 2 + p.facing * lx, y: p.y + p.h + 1 + ly };
  }

  private settleArm(dt: number) {
    const target = this.armTarget().e;
    if (this.reduce) {
      this.elbow = target;
      this.elbowV = 0;
      return;
    }
    this.elbowV += (target - this.elbow) * 36 * dt;
    this.elbowV *= Math.exp(-6.5 * dt);
    this.elbow += this.elbowV * dt;
  }

  private armTarget() {
    const mega = this.superT > 0;
    const active = mega || this.swing > 0;
    if (active) {
      const amp = mega ? 1.22 : 1;
      if (this.reduce) return { s: -1.05 * amp, e: -0.28 * amp };
      const u = mega ? 1 - this.superT / 0.62 : 1 - this.swing / 0.5;
      const back = 0.98 * amp;
      const through = -1.16 * amp;
      if (u < 0.28) {
        const t = 1 - (1 - u / 0.28) ** 3;
        return { s: back * t, e: 0.52 * amp * t };
      }
      if (u < 0.52) {
        const t = ((u - 0.28) / 0.24) ** 2;
        return { s: back + (through - back) * t, e: 0.52 * amp + (-0.92 * amp) * t };
      }
      const t = 1 - (1 - Math.min(1, (u - 0.52) / 0.48)) ** 3;
      return { s: through * (1 - t), e: -0.4 * amp * (1 - t) };
    }
    const p = this.player;
    if (p && p.onGround && Math.abs(p.vx) > 16 && this.wipe <= 0 && this.snotT <= 0 && !this.reduce) {
      const stride = Math.max(7, Math.abs(p.vx) / 12);
      const step = Math.sin(p.anim * stride * Math.PI);
      return { s: step * 0.2, e: Math.max(0, step) * 0.14 };
    }
    return { s: 0, e: 0 };
  }

  private reachTarget() {
    const rest = { x: 300, y: 760 };
    const smooth = (t: number) => t * t * (3 - 2 * t);
    if (this.wipe > 0) {
      const u = 1 - this.wipe / 0.92;
      const brow = { x: 344, y: 112 };
      if (u < 0.16) return { ...rest, amount: u / 0.16, towel: u / 0.16, scrub: 0 };
      if (u < 0.4) {
        const e = smooth((u - 0.16) / 0.24);
        return {
          x: rest.x + (brow.x - rest.x) * e,
          y: rest.y + (brow.y - rest.y) * e,
          amount: 1,
          towel: 1,
          scrub: 0,
        };
      }
      if (u < 0.78) {
        const t = (u - 0.4) / 0.38;
        const scrub = Math.sin(t * Math.PI * 3);
        return { x: brow.x + scrub * 96, y: brow.y + Math.sin(t * Math.PI * 6) * 16, amount: 1, towel: 1, scrub };
      }
      const e = smooth((u - 0.78) / 0.22);
      return {
        x: brow.x + (rest.x - brow.x) * e,
        y: brow.y + (rest.y - brow.y) * e,
        amount: 1 - e * 0.4,
        towel: 1 - e,
        scrub: 0,
      };
    }
    if (this.snotT > 0) {
      const u = 1 - this.snotT / 0.6;
      const nose = { x: 352, y: 174 };
      let e = 0;
      if (u < 0.42) e = smooth(u / 0.42);
      else if (u < 0.7) e = 1;
      else e = 1 - smooth((u - 0.7) / 0.3);
      return {
        x: rest.x + (nose.x - rest.x) * e,
        y: rest.y + (nose.y - rest.y) * e,
        amount: Math.max(e, 0.001),
        towel: 0,
        scrub: 0,
      };
    }
    return { ...rest, amount: 0, towel: 0, scrub: 0 };
  }

  private solveArm(sx: number, sy: number, tx: number, ty: number, l1: number, l2: number) {
    let dx = tx - sx;
    let dy = ty - sy;
    let dist = Math.hypot(dx, dy);
    dist = Math.min(l1 + l2 - 0.5, Math.max(Math.abs(l1 - l2) + 0.5, dist));
    const ang = Math.atan2(dy, dx);
    const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
    const cosE = clamp((l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2), -1, 1);
    const bend = -1;
    const shoulder = ang + bend * Math.acos(cosA);
    const elbow = Math.acos(cosE);
    return { shoulderRot: shoulder - Math.PI / 2, elbowRot: bend * (Math.PI - elbow) };
  }

  private drawRig(cam: number) {
    const p = this.player;
    const ctx = this.ctx;
    const moving =
      p.onGround &&
      Math.abs(p.vx) > 16 &&
      this.swing <= 0 &&
      this.superT <= 0 &&
      this.wipe <= 0 &&
      this.snotT <= 0 &&
      !this.reduce;
    const stride = Math.max(7, Math.abs(p.vx) / 12);
    const phase = p.anim * stride;
    const lift = moving ? Math.sin(phase * Math.PI) ** 2 * 1.5 : 0;
    const h = this.rigHeight();
    const scale = h / 1371;
    const pose = this.armTarget();
    const reach = this.reachTarget();
    ctx.save();
    ctx.translate(p.x + p.w / 2 - cam, p.y + p.h + 1);
    ctx.scale(p.facing, 1);
    ctx.fillStyle = "rgba(20,16,12,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(-h * (456 / 1371) * 0.42, -h - lift);
    ctx.scale(scale, scale);
    ctx.drawImage(this.heroBody, 0, 0);
    ctx.save();
    ctx.translate(102.9, 468.4);
    ctx.rotate(pose.s);
    ctx.translate(-102.9, -468.4);
    ctx.drawImage(this.heroUpper, 0, 0);
    ctx.translate(113.4, 642.1);
    ctx.rotate(this.elbow);
    ctx.translate(-113.4, -642.1);
    ctx.drawImage(this.heroFore, 0, 0);
    ctx.restore();
    if (reach.amount > 0.02 && this.heroReach.naturalWidth > 0) {
      const ik = this.solveArm(198, 478, reach.x, reach.y, 200, 210);
      ctx.save();
      ctx.globalAlpha = Math.min(1, reach.amount * 2.4);
      ctx.translate(198, 478);
      ctx.rotate(ik.shoulderRot);
      ctx.drawImage(this.heroReach, -46, 0, 92, 200);
      ctx.translate(0, 200);
      ctx.rotate(ik.elbowRot);
      ctx.drawImage(this.heroReach, -36, 0, 72, 210);
      ctx.restore();
    }
    if (reach.towel > 0.04) this.drawTowel(reach.x, reach.y, reach.towel, reach.scrub);
    const hw = 50;
    const hh = 62;
    const hx = 275;
    const hy = 729;
    const destX = reach.amount > 0.02 ? reach.x - hw / 2 : hx;
    const destY = reach.amount > 0.02 ? reach.y - hh / 2 : hy;
    if (this.heroHand.naturalWidth > 0) ctx.drawImage(this.heroHand, hx, hy, hw, hh, destX, destY, hw, hh);
    ctx.restore();
    if (this.hops >= 6 && this.wipe <= 0) {
      const drip = (this.clock * 16) % 8;
      ctx.fillStyle = "rgba(158,196,224,0.9)";
      ctx.beginPath();
      ctx.ellipse(h * 0.12, -h * 0.78 + drip, 1.1, 1.8, 0, 0, Math.PI * 2);
      ctx.ellipse(h * 0.22, -h * 0.82 + ((drip + 4) % 8), 1.1, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawTowel(x: number, y: number, scale: number, scrub: number) {
    const ctx = this.ctx;
    const s = 0.55 + scale * 0.45;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35 + scrub * 0.4);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(40, 28, 18, 0.28)";
    ctx.beginPath();
    ctx.moveTo(-70, -18);
    ctx.quadraticCurveTo(-10, -78, 78, -58);
    ctx.quadraticCurveTo(150, -36, 132, 18);
    ctx.quadraticCurveTo(70, 58, -8, 36);
    ctx.quadraticCurveTo(-88, 48, -96, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f6f1e6";
    ctx.beginPath();
    ctx.moveTo(-78, -28);
    ctx.quadraticCurveTo(-16, -86, 74, -64);
    ctx.quadraticCurveTo(148, -40, 128, 12);
    ctx.quadraticCurveTo(64, 52, -12, 28);
    ctx.quadraticCurveTo(-96, 42, -104, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e7dcc8";
    ctx.beginPath();
    ctx.moveTo(-60, -8);
    ctx.quadraticCurveTo(10, -36, 70, -18);
    ctx.quadraticCurveTo(20, 8, -48, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1d4e8c";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(-70, 2);
    ctx.quadraticCurveTo(20, -8, 110, 6);
    ctx.stroke();
    ctx.translate(96, 18);
    ctx.rotate(0.9 + scrub * 0.35);
    ctx.fillStyle = "#efe6d4";
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-22, 70, -4, 150);
    ctx.quadraticCurveTo(18, 158, 22, 70);
    ctx.quadraticCurveTo(20, 16, 8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1d4e8c";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-6, 28);
    ctx.quadraticCurveTo(2, 70, 4, 96);
    ctx.stroke();
    ctx.restore();
  }

  private drawEmbers(cam: number) {
    const ctx = this.ctx;
    for (const b of this.embers) {
      const age = 1 - b.life / b.max;
      if (age < 0.22) {
        ctx.save();
        ctx.globalAlpha = (1 - age / 0.22) * 0.9;
        ctx.strokeStyle = "#c6e15a";
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(b.ox - cam, b.oy);
        ctx.lineTo(b.x - cam, b.y);
        ctx.stroke();
        ctx.restore();
      }
      const ang = Math.atan2(b.vy, b.vx);
      const speed = Math.hypot(b.vx, b.vy);
      const len = 3.4 + Math.min(4.5, speed * 0.012);
      ctx.save();
      ctx.translate(b.x - cam, b.y);
      ctx.rotate(ang);
      ctx.fillStyle = "#8fbf2a";
      ctx.beginPath();
      ctx.ellipse(0, 0, len, 1.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8f7a4";
      ctx.beginPath();
      ctx.ellipse(len * 0.28, -0.35, len * 0.42, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.8 - i * 0.15;
        ctx.fillStyle = i % 2 ? "#d2ee62" : "#6f9e22";
        ctx.beginPath();
        ctx.ellipse(-len - i * 2.5, Math.sin(i * 1.7 + b.x) * 0.55, Math.max(0.4, 1.45 - i * 0.22), 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPlayer(cam: number) {
    if (this.rigReady()) {
      this.drawRig(cam);
      return;
    }
    const p = this.player;
    const ctx = this.ctx;
    const tall = p.form > 0;
    const striking = this.swing > 0 && this.swing < 0.13;
    const superOn = this.superT > 0;
    const moving = p.onGround && Math.abs(p.vx) > 16 && !striking && !superOn && !this.reduce;
    const stride = Math.max(7, Math.abs(p.vx) / 12);
    const phase = p.anim * stride;
    const walks = this.heroWalkA.complete && this.heroWalkA.naturalWidth > 0 && this.heroWalkB.complete && this.heroWalkB.naturalWidth > 0;
    const calmSwing = this.heroSwingCalm.complete && this.heroSwingCalm.naturalWidth > 0;
    const hero = superOn
      ? this.heroSwing
      : striking && calmSwing
        ? this.heroSwingCalm
        : !p.onGround
          ? this.heroJump
          : moving && walks
            ? Math.floor(phase) % 2 === 0
              ? this.heroWalkA
              : this.heroWalkB
            : this.heroIdle;
    const ready = hero.complete && hero.naturalWidth > 0;
    ctx.save();
    ctx.translate(p.x + p.w / 2 - cam, p.y + p.h + 1);
    ctx.scale(p.facing, 1);
    if (moving) ctx.rotate(Math.sin(phase * Math.PI) * 0.06);
    ctx.fillStyle = "rgba(20,16,12,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ready) {
      const h = (tall ? 52 : 44) * (superOn ? 1.2 : 1);
      const w = (hero.naturalWidth / hero.naturalHeight) * h;
      const lift = moving ? Math.sin(phase * Math.PI) ** 2 * 1.5 : 0;
      ctx.drawImage(hero, -w * 0.42, -h - lift, w, h);
      if (p.form === 2) {
        ctx.fillStyle = this.nose > 0 ? "#c6e07a" : "#6f8a62";
        ctx.beginPath();
        ctx.ellipse(w * 0.08, -h + 14, this.nose > 0 ? 4 : 2, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.hops >= 6 && this.wipe <= 0) {
        const drip = (this.clock * 16) % 8;
        ctx.fillStyle = "rgba(158,196,224,0.9)";
        ctx.beginPath();
        ctx.ellipse(-3, -h + 10 + drip, 1.1, 1.8, 0, 0, Math.PI * 2);
        ctx.ellipse(4, -h + 8 + ((drip + 4) % 8), 1.1, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.wipe > 0) {
        ctx.fillStyle = "#f7f3ea";
        ctx.beginPath();
        ctx.roundRect(-8, -h + 8, 14, 4, 1);
        ctx.fill();
      }
    }
    ctx.restore();
    if (!ready) this.drawPlayerFallback(cam);
    if (this.star > 0) {
      this.beaverMark(p.x - cam + p.w / 2, p.y - 4, 18);
    }
  }

  private drawPlayerFallback(cam: number) {
    const p = this.player;
    const ctx = this.ctx;
    const tall = p.form > 0;
    const squash = !this.reduce && p.land > 0;
    const stretch = !this.reduce && p.vy < -180;
    const striking = this.swing > 0 && this.swing < 0.13;
    const winding = this.swing >= 0.13;
    const superOn = this.superT > 0;
    const step = p.onGround ? Math.sin(p.anim * (Math.abs(p.vx) > 80 ? 16 : 10)) : 0;
    ctx.save();
    ctx.translate(p.x + p.w / 2 - cam, p.y + p.h);
    ctx.scale(p.facing * (squash ? 1.08 : stretch ? 0.94 : 1) * 1.65, (squash ? 0.9 : stretch ? 1.08 : 1) * 1.65);
    ctx.fillStyle = "rgba(20,16,12,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 1, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    const leg = step * 2.2;
    ctx.fillStyle = "#241c16";
    ctx.beginPath();
    ctx.roundRect(-5, -8, 3.2, 8, 1);
    ctx.roundRect(1.6, -8 + Math.max(0, -leg) * 0.2, 3.2, 8, 1);
    ctx.fill();
    ctx.fillStyle = "#141820";
    ctx.beginPath();
    ctx.roundRect(-6, tall ? -14 : -11, 12, tall ? 7 : 5, 1.4);
    ctx.fill();
    const shirt = ctx.createLinearGradient(-7, -24, 7, -8);
    shirt.addColorStop(0, "#2a2a2a");
    shirt.addColorStop(1, "#0e0e0e");
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.roundRect(-7, tall ? -26 : -20, 14, tall ? 14 : 11, 2.2);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(-1.2, tall ? -20 : -16, 2.6, 1.1);
    const headY = tall ? -28 : -22;
    this.drawHead(headY, tall ? 13 : 11, superOn);
    if (p.form === 2) {
      ctx.fillStyle = this.nose > 0 ? "#d7ef8a" : "#8fbf3a";
      ctx.beginPath();
      ctx.ellipse(4, headY + 2, this.nose > 0 ? 3 : 1.6, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.hops >= 6 && this.wipe <= 0) {
      const drip = (this.clock * 14) % 6;
      ctx.fillStyle = "#9ec4e0";
      ctx.fillRect(-4, headY + drip, 1, 2);
      ctx.fillRect(3, headY + ((drip + 3) % 6), 1, 2);
    }
    if (this.wipe > 0) {
      ctx.fillStyle = "#f7f3ea";
      ctx.beginPath();
      ctx.roundRect(-7, headY + 1, 12, 3, 0.6);
      ctx.fill();
    }
    this.drawMallet(striking, winding, superOn, tall);
    ctx.restore();
    if (this.star > 0) this.beaverMark(p.x - cam + p.w / 2, p.y - 4, 18);
  }

  private drawHead(top: number, size: number, scream: boolean) {
    const ctx = this.ctx;
    const x = -size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, top, size, size, size * 0.35);
    ctx.clip();
    if (scream && this.face.complete && this.face.naturalWidth > 0) {
      const sw = this.face.naturalWidth;
      const sh = this.face.naturalHeight * 0.72;
      ctx.drawImage(this.face, 0, 0, sw, sh, x, top, size, size);
    } else {
      ctx.fillStyle = "#e0a070";
      ctx.fillRect(x, top, size, size);
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(x + size * 0.55, top + size * 0.38, size * 0.16, size * 0.08);
      ctx.fillRect(x + size * 0.42, top + size * 0.62, size * 0.28, size * 0.05);
    }
    ctx.restore();
  }

  private drawMallet(striking: boolean, winding: boolean, superOn: boolean, tall: boolean) {
    const ctx = this.ctx;
    ctx.save();
    const sc = superOn ? 1.8 : tall ? 1.15 : 1;
    ctx.translate(6, tall ? -18 : -14);
    ctx.rotate(striking || superOn ? 0.9 : winding ? -1.5 : -0.55);
    ctx.scale(sc, sc);
    ctx.fillStyle = "#6b3f24";
    ctx.beginPath();
    ctx.roundRect(-1, 0, 2.2, 12, 0.6);
    ctx.fill();
    const g = ctx.createLinearGradient(-6, -5, 6, 2);
    g.addColorStop(0, "#e0a15a");
    g.addColorStop(0.5, "#f2d2a0");
    g.addColorStop(1, "#8a4124");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-6, -5, 12, 6, 1.2);
    ctx.fill();
    ctx.restore();
  }

  private drawPickup(it: { kind: string; x: number; y: number; emerge: number }, cam: number) {
    const ctx = this.ctx;
    const bob = it.emerge > 0 ? 0 : Math.sin(this.clock * 6 + it.x) * 1.2;
    const x = it.x - cam;
    const y = it.y - bob;
    ctx.save();
    ctx.translate(x + 6, y + 8);
    if (it.kind === "gear") {
      ctx.strokeStyle = "#e2b043";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#f6d56a";
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (it.kind === "lamp") {
      ctx.fillStyle = "#3f8f55";
      ctx.beginPath();
      ctx.ellipse(0, 1, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e4a2c";
      ctx.fillRect(-0.6, -6, 1.2, 3);
    } else if (it.kind === "nuts") {
      ctx.fillStyle = "#c46a32";
      ctx.beginPath();
      ctx.roundRect(-5, -4, 10, 8, 2);
      ctx.fill();
    } else {
      ctx.restore();
      this.beaverMark(it.x - cam + 7, y + 16, 30);
      return;
    }
    ctx.restore();
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
    ctx.fillStyle = "rgba(18,12,8,0.72)";
    ctx.beginPath();
    ctx.roundRect(10, 18, 92, 40, 4);
    ctx.fill();
    ctx.save();
    ctx.scale(2, 2);
    this.px("HAMMER", 8, 11, "#f6e7c1");
    this.px("TIME", 14, 24, "#f2c14e");
    ctx.restore();
    this.gradeStage();
  }

  private blit(img: HTMLCanvasElement, x: number, y: number, flip: boolean) {
    if (!flip) {
      this.ctx.drawImage(img, Math.round(x), Math.round(y));
      return;
    }
    this.ctx.save();
    this.ctx.translate(Math.round(x + img.width), Math.round(y));
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(img, 0, 0);
    this.ctx.restore();
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

function overlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function approach(v: number, target: number, delta: number) {
  if (v < target) return Math.min(target, v + delta);
  return Math.max(target, v - delta);
}
