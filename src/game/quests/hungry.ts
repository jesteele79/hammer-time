import { SWING_SECONDS } from "../combat";
import { heroFarHand, type HeroPose } from "../hero";
import { SWING_ACTIVE } from "../rig";
import type { Quest, QuestContext, QuestHud, QuestInput, QuestResult } from "./quest";
import {
  APPETIZERS,
  CHUTE,
  DESSERTS,
  ENTREES,
  FOODS,
  SPECIALS,
  TABLE,
  makeFood,
  nearTable,
  onTable,
  stepFood,
  type Food,
  type FoodKind,
} from "./food";
import { drawHungry } from "./hungry-draw";

export const ROUND_SECONDS = 60;
export const REACH_BASE = 90;
export const REACH_STEP = 10;
export const REACH_MAX = 250;
/** A press released by this point is a tap: base reach, no plate steals. */
export const TAP_SECONDS = 0.12;
export const CHARGE_SECONDS = 0.5;
export const LUNGE_OUT = 0.12;
export const LUNGE_HOLD = 0.08;
export const LUNGE_BACK = 0.25;
export const EAT_RADIUS = 10;
export const PLATE_RADIUS = 14;
export const COMBO_WINDOW = 1.2;
export const RIVAL_RANGE = 45;
export const RIVAL_LEAN = 0.2;
export const BONK_SERVER = 70;
export const BONK_RIVAL = 90;
export const SERVER_SPEED = 28;
export const SERVER_AWAY = 15;
export const RIVAL_STUN = 2;
export const SLAP_STUN = 1;
export const SUITCASE_SECONDS = 4;
export const PLANE_Y = 150;
export const PLANE_SPEED = 130;
export const PLANE_HIT = 150;
export const CART_AT = 42;
export const HAMMER_X = 18;
export const HAMMER_FOOT = 192;
export const PLATE_X = 58;
const BASE_POSE: HeroPose = {
  x: HAMMER_X,
  foot: HAMMER_FOOT,
  facing: 1,
  phase: 0,
  moving: false,
  air: false,
  landing: 0,
  swing: 0,
  mega: 0,
  wipe: 0,
  snot: 0,
  heat: 0,
  hurt: 0,
  star: 0,
  reduced: false,
  clock: 0,
};
/** Where the far hand lands on a zero-reach dive; every reach is measured from here. */
export const HAND0 = heroFarHand({ ...BASE_POSE, lunge: { u: 1, reach: 0 } })!.x;

export const GRADES: readonly (readonly [number, string])[] = [
  [3000, "COMPED"],
  [2000, "GOOD TIPPER"],
  [1200, "SPLIT THE CHECK"],
  [0, "WATER ONLY"],
];
export const gradeFor = (score: number) => GRADES.find(([min]) => score >= min)![1];

export type RivalKind = "student" | "bellhop" | "nurse";
export type Rival = {
  kind: RivalKind;
  x: number;
  /** Seconds to react at zero anger. */
  base: number;
  anger: number;
  /** Seconds since anger last rose or fell. */
  calm: number;
  plate: Food[];
  stun: number;
  /** Countdown to a grab, or -1. */
  wait: number;
  target: number | null;
  lean: number;
  leanX: number;
  line: string;
  lineT: number;
};
export const ROSTER: Record<string, { kind: RivalKind; x: number; base: number }[]> = {
  banquet: [
    { kind: "student", x: 170, base: 0.55 },
    { kind: "bellhop", x: 230, base: 0.4 },
    { kind: "nurse", x: 290, base: 0.28 },
  ],
};
export const reactionFor = (r: Rival) => Math.max(0.15, r.base * 0.8 ** r.anger);

type Phase = "charge" | "out" | "hold" | "back";
export type Lunge = { phase: Phase; t: number; held: number; reach: number; charged: boolean };
export type Server = {
  x: number;
  dir: 1 | -1;
  away: number;
  line: string;
  lineT: number;
  quiet: number;
};
export type Plane = { x: number; vx: number };
export type Suitcase = { x0: number; x1: number; t: number };
export type Cart = { x: number; spilled: boolean };
type Dump = { at: number; kinds: readonly FoodKind[]; count: number; done: boolean };

function waves(): Dump[] {
  const d = (at: number, kinds: readonly FoodKind[], count: number) => ({
    at,
    kinds,
    count,
    done: false,
  });
  return [
    d(0, APPETIZERS, 5),
    ...[4, 8, 12, 16].map((t) => d(t, APPETIZERS, 3)),
    d(20, ENTREES, 4),
    ...[24, 28, 32, 36].map((t) => d(t, ENTREES, 2)),
    ...[44, 48, 52, 56].map((t) => d(t, DESSERTS, 2)),
  ];
}
const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;
const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

/** Hungry Hungry Hippos at a banquet table: dive for the food, rob the plates, bonk the server. */
export class HungryQuest implements Quest {
  readonly id = "hungry" as const;
  ctx!: QuestContext;
  table = "banquet";
  practice = false;
  time = 0;
  food: Food[] = [];
  rivals: Rival[] = [];
  server: Server = { x: 300, dir: -1, away: 0, line: "", lineT: 0, quiet: 0 };
  planes: Plane[] = [];
  suitcases: Suitcase[] = [];
  cart: Cart | null = null;
  cartAt = CART_AT;
  lunge: Lunge | null = null;
  swing = 0;
  bonked = false;
  duck = false;
  stun = 0;
  crumbs = 0;
  plate: Food[] = [];
  plateTotal = 0;
  comboBonus = 0;
  combo = 0;
  bestCombo = 0;
  lastGrab = -99;
  togo = 0;
  eaten = 0;
  steals = 0;
  hits = 0;
  bill = false;
  coins = 0;
  charge = 0;
  star = false;
  hot = false;
  specials: FoodKind[] = [];
  schedule: Dump[] = waves();
  specialsAt: { at: number; kind: FoodKind; done: boolean }[] = [];
  private nextId = 1;
  private said = new Set<string>();
  private finished: QuestResult | null = null;

  enter(ctx: QuestContext, options: { table?: string; practice: boolean }) {
    this.ctx = ctx;
    this.table = options.table ?? "banquet";
    this.practice = options.practice;
    this.rivals = (ROSTER[this.table] ?? ROSTER.banquet).map((r) => ({
      ...r,
      anger: 0,
      calm: 0,
      plate: [],
      stun: 0,
      wait: -1,
      target: null,
      lean: 0,
      leanX: r.x,
      line: "",
      lineT: 0,
    }));
    this.specialsAt = SPECIALS.map((kind) => ({ at: 6 + ctx.rng() * 48, kind, done: false }));
  }

  /** Base reach: the hungrier he gets, the farther he stretches. */
  reach() {
    return Math.min(REACH_MAX, REACH_BASE + REACH_STEP * this.eaten);
  }
  private reachFor(held: number) {
    const base = this.reach();
    if (held <= TAP_SECONDS) return base;
    return (
      base + (REACH_MAX - base) * Math.min(1, (held - TAP_SECONDS) / (CHARGE_SECONDS - TAP_SECONDS))
    );
  }
  /** A suitcase on the cloth stops the dive short of it. */
  private blocked(reach: number) {
    let end = HAND0 + reach;
    for (const s of this.suitcases) if (s.x0 > HAND0 && end > s.x0 - 2) end = s.x0 - 2;
    return Math.max(0, end - HAND0);
  }
  private extension() {
    const L = this.lunge;
    if (!L || L.phase === "charge") return 0;
    if (L.phase === "out") return ease(L.t / LUNGE_OUT);
    if (L.phase === "hold") return 1;
    return 1 - smooth(L.t / LUNGE_BACK);
  }
  /** Where the hand is right now along the tablecloth. */
  handX() {
    return HAND0 + (this.lunge?.reach ?? 0) * this.extension();
  }
  private think(text: string, seconds = 1.8, once = true) {
    if (once && this.said.has(text)) return;
    this.said.add(text);
    this.ctx.say(text, seconds);
  }

  step(dt: number, input: QuestInput) {
    if (this.finished) return;
    this.time += dt;
    for (const d of this.schedule)
      if (!d.done && this.time >= d.at) {
        d.done = true;
        this.dump(d.kinds, d.count);
        if (d.at === 0) this.think("I didn't order this. I'm eating it anyway.", 2.2);
      }
    for (const s of this.specialsAt)
      if (!s.done && this.time >= s.at) {
        s.done = true;
        this.dump([s.kind], 1);
      }
    this.stepCart(dt);
    this.stepServer(dt);
    this.stepRivals(dt);
    this.stepPlanes(dt);
    for (const s of this.suitcases) s.t -= dt;
    this.suitcases = this.suitcases.filter((s) => s.t > 0);
    for (const f of this.food) stepFood(f, dt, this.suitcases);
    this.stepHammer(dt, input);
    this.crumbs = Math.max(0, this.crumbs - dt);
    if (this.time >= ROUND_SECONDS) this.finish();
  }

  private dump(kinds: readonly FoodKind[], count: number, x = CHUTE.x, y = CHUTE.y) {
    const rng = this.ctx.rng;
    this.ctx.audio.ding();
    for (let i = 0; i < count; i++) {
      const kind = kinds[Math.floor(rng() * kinds.length)];
      this.food.push(
        makeFood(this.nextId++, kind, x + (rng() - 0.5) * 16, y, (rng() * 2 - 1) * 120, rng() * 30),
      );
    }
  }
  private pool() {
    return this.time < 20 ? APPETIZERS : this.time < 40 ? ENTREES : DESSERTS;
  }

  private stepHammer(dt: number, input: QuestInput) {
    const held = input.held.jump || input.held.fire;
    const pressed = input.pressed.jump || input.pressed.fire;
    this.stun = Math.max(0, this.stun - dt);
    this.duck = input.held.down && !this.lunge && this.swing <= 0;
    if (input.pressed.hammer && !this.lunge && this.swing <= 0 && !this.duck && this.stun <= 0) {
      this.swing = SWING_SECONDS;
      this.bonked = false;
      this.ctx.audio.whoosh();
    }
    if (this.swing > 0) {
      this.swing = Math.max(0, this.swing - dt);
      if (!this.bonked && 1 - this.swing / SWING_SECONDS >= SWING_ACTIVE[0]) {
        this.bonked = true;
        this.bonk();
      }
    }
    const L = this.lunge;
    if (!L) {
      if (pressed && this.swing <= 0 && !this.duck && this.stun <= 0)
        this.lunge = { phase: "charge", t: 0, held: 0, reach: this.reach(), charged: false };
      return;
    }
    if (L.phase === "charge") {
      L.held += dt;
      L.reach = this.reachFor(L.held);
      if (!held || L.held >= CHARGE_SECONDS) {
        L.charged = L.held > TAP_SECONDS;
        L.reach = this.blocked(L.reach);
        L.phase = "out";
        L.t = 0;
        this.ctx.audio.whoosh();
      }
      return;
    }
    L.t += dt;
    if (L.phase === "out" && L.t >= LUNGE_OUT) {
      L.phase = "hold";
      L.t = 0;
      this.grab(L);
    } else if (L.phase === "hold" && L.t >= LUNGE_HOLD) {
      L.phase = "back";
      L.t = 0;
    } else if (L.phase === "back" && L.t >= LUNGE_BACK) this.lunge = null;
  }

  /** Full extension: a slap, a steal, or everything within reach of the hand. */
  private grab(L: Lunge) {
    const hand = HAND0 + L.reach;
    if (this.slapped(hand)) return;
    if (L.charged) {
      const r = this.rivals.find((r) => r.plate.length && Math.abs(hand - r.x) <= PLATE_RADIUS);
      if (r) {
        const item = r.plate.pop()!;
        this.take(item, 100);
        this.steals++;
        r.anger++;
        r.calm = 0;
        this.retaliate(r);
        this.ctx.comic(hand, TABLE.top - 22, "YOINK!", false);
        this.ctx.audio.chomp();
        this.think("That's MINE now.");
        return;
      }
    }
    const bite = this.food.filter((f) => nearTable(f) && Math.abs(f.x - hand) <= EAT_RADIUS);
    if (!bite.length) return;
    this.food = this.food.filter((f) => !bite.includes(f));
    for (const f of bite) this.eat(f, hand);
  }

  private eat(f: Food, hand: number) {
    if (f.kind === "check") {
      this.plateTotal += f.value;
      this.bill = true;
      this.ctx.comic(hand, TABLE.top - 22, "-400", false);
      this.think("YOU picked up the bill?", 2);
      return;
    }
    if (f.kind === "coke") this.coins++;
    if (f.kind === "nuts") this.charge += 3;
    if (f.kind === "buccees") this.star = true;
    if (f.kind === "hotsauce") this.hot = true;
    if (f.kind === "togo") this.togo = 5;
    if (f.special) {
      this.specials.push(f.kind);
      if (f.kind !== "togo") this.think("Room charge.");
    }
    this.take(f, 0);
    this.crumbs = 0.6;
    this.ctx.comic(hand, TABLE.top - 22, "NOM", false);
    this.ctx.audio.chomp();
  }

  /** Onto Hammer's plate, doubled by an open to-go box, multiplied by the combo. */
  private take(item: Food, bonus: number) {
    let points = item.value;
    if (this.togo > 0 && item.kind !== "togo") {
      points *= 2;
      this.togo--;
    }
    this.combo = this.time - this.lastGrab <= COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastGrab = this.time;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
    this.plateTotal += points + bonus;
    this.comboBonus += (points + bonus) * (mult - 1);
    this.eaten++;
    this.plate.push(item);
  }

  // Task 4 fills these in.
  private slapped(_hand: number) {
    return false;
  }
  private retaliate(_r: Rival) {}
  private bonk() {}
  private stepServer(_dt: number) {}
  private stepRivals(_dt: number) {}
  private stepPlanes(_dt: number) {}
  private stepCart(dt: number) {
    if (!this.cart && this.time >= this.cartAt) {
      this.cart = { x: 384 + 30, spilled: false };
      this.ctx.audio.boom();
    }
    const c = this.cart;
    if (!c || c.spilled) return;
    c.x -= 260 * dt;
    if (c.x > TABLE.right - 6) return;
    c.spilled = true;
    const rng = this.ctx.rng;
    for (let i = 0; i < 8; i++) {
      const f = makeFood(
        this.nextId++,
        DESSERTS[Math.floor(rng() * DESSERTS.length)],
        TABLE.right - 20 - rng() * 10,
        TABLE.top - 10,
        -(60 + rng() * 140),
        -(120 + rng() * 80),
      );
      this.food.push(f);
    }
    this.ctx.comic(TABLE.right - 24, TABLE.top - 40, "CRASH!", true);
  }

  private finish() {
    const score = Math.max(0, Math.round(this.plateTotal + this.comboBonus));
    const grade = gradeFor(score);
    const mult = this.bestCombo >= 10 ? 3 : this.bestCombo >= 5 ? 2 : 1;
    const lines = [
      `Plate: ${this.plateTotal} from ${this.eaten} grabs`,
      `Combo bonus: +${this.comboBonus} (best ${this.bestCombo} in a row, x${mult})`,
    ];
    if (this.steals)
      lines.push(`Robbed other plates ${this.steals} time${this.steals > 1 ? "s" : ""}`);
    if (this.hits) lines.push(`Paper to the face: ${this.hits} (-${this.hits * PLANE_HIT})`);
    if (this.specials.length)
      lines.push(`Specials: ${this.specials.map((k) => FOODS[k].name).join(", ")}`);
    if (this.bill) lines.push("Picked up the check: -400");
    if (score >= 2000) lines.push("Full belly: patience back to 3");
    this.finished = {
      score,
      coins: this.coins,
      charge: Math.min(10, this.charge),
      star: this.star,
      hot: this.hot,
      lives: 0,
      fullBelly: score >= 2000,
      grade,
      lines,
    };
  }

  render(ctx: CanvasRenderingContext2D, clock: number) {
    drawHungry(ctx, this, this.ctx, clock);
  }

  hud(): QuestHud {
    const L = this.lunge;
    const shown = L ? L.reach : this.reach();
    return {
      title: "HUNGRY HUNGRY HAMMER",
      subtitle: "Round 1 · The Banquet",
      score: Math.max(0, Math.round(this.plateTotal + this.comboBonus)),
      timer: Math.max(0, Math.ceil(ROUND_SECONDS - this.time)),
      meter: { label: "Reach", value: shown, max: REACH_MAX, text: `${Math.round(shown)} px` },
      hint: this.hint(),
    };
  }
  private hint() {
    if (this.planes.length) return "Paper incoming · ↓ ducks under it, H swats it";
    if (this.suitcases.length) return "Suitcase on the table · H slams the table and clears it";
    if (this.stun > 0) return "Slapped · wait a second";
    if (this.togo > 0) return `To-go box · next ${this.togo} grabs count double`;
    if (this.rivals.some((r) => r.kind === "nurse" && r.anger > 0))
      return "The nurse is angry · keep your hand out of her zone";
    return "Tap Space to dive · hold to reach farther and rob a plate · H bonks the server";
  }

  result() {
    return this.finished;
  }
  exit() {}

  pose(): HeroPose {
    const L = this.lunge,
      u = this.extension();
    return {
      ...BASE_POSE,
      swing: this.swing,
      hurt: this.stun > 0 ? 0.18 : 0,
      reduced: this.ctx.reduced,
      clock: this.time,
      crouch: this.duck,
      lunge: L && u > 0 ? { u, reach: L.reach } : undefined,
      coil: L?.phase === "charge" ? Math.min(1, L.held / CHARGE_SECONDS) : 0,
    };
  }
}
