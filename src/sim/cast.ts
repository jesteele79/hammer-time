import { CAST_LINES, JOB_LINES, pick, type CastJobName, type CastLineSet } from "../game/lines";
import type { GameEvent } from "./events";
import { bodyRect } from "./geometry";
import type { CastPerson, Level } from "./level";
import { floorAt } from "./physics";
import { SNOT, type Puddle } from "./snot";
import type { Rect, Stage, Target } from "./types";

export type CastRole = "bellhop" | "server" | "office" | "student";
export type CastAct =
  | "idle"
  | "walk"
  | "notice"
  | "windup"
  | "attack"
  | "recover"
  | "chase"
  | "return"
  | "hide"
  | "bumped"
  | "fly"
  | "down"
  | "getup"
  | "leave"
  | "slide"
  | "slip"
  | "frozen"
  | "schooled"
  | "duck"
  | "hop"
  | "flee";
export type CastHitBy = "mallet" | "snot" | "stomp" | "burst" | "shield" | "cart" | "slide" | "body" | "puddle";

export type CastJob = CastJobName;
/** Who a person is: the painting's name less its number ("cook-1" is a cook). */
export const jobOf = (p: CastPerson): CastJob => p.slice(0, -2) as CastJob;
/** Which of the lobby's four fights each job fights (R3 §4). */
export const ROLE_OF: Record<CastJob, CastRole> = { bellhop: "bellhop", server: "server", office: "office", student: "student", cook: "office", busser: "bellhop", lunch: "server", prof: "office" };
export const roleOf = (p: CastPerson): CastRole => ROLE_OF[jobOf(p)];
/** Who wears a hat that flies off at the first hit. */
export const HATTED: ReadonlySet<CastJob> = new Set<CastJob>(["bellhop", "cook"]);

/**
 * Each role's numbers (the R2b design §2): colliders, how far they notice him, wind-ups, attacks, rests, dazes, and the
 * hits it takes to put them out. World px and seconds. The owner made them tougher and pushier on 2026-10-15: two hits
 * for a server, an office worker or a student, three for a bellhop; shorter rests, a longer look, a fourth plane.
 */
export const CAST = {
  bellhop: { w: 100, h: 330, notice: 1100, windup: 0.7, windup2: 0.55, shove: 650, walk: 200, rest: 2, daze: 4, hits: 3, hold: 150 },
  server: { w: 90, h: 310, notice: 850, windup: 0.45, rush: 420, rushT: 2, rushPx: 1000, walk: 200, skid: 0.4, rest: 1, daze: 2.5, hits: 2 },
  office: { w: 95, h: 320, notice: 650, windup: 0.5, march: 160, chime: 400, leap: 500, leapUp: 600, rest: 1.2, daze: 2.5, hits: 2 },
  student: { w: 90, h: 310, notice: 1100, windup: 0.65, restMin: 2.5, restStep: 0.5, melee: 300, hop: 200, hopT: 0.35, duck: 0.5, schooled: 9, flee: 400, planes: 4, hits: 2 },
} as const;
/** How many may be on the attack at once (the design §4; three since 2026-10-15). */
export const TICKETS = 3;
/** The shipped chain: one moving thing bowling staffer after staffer, the eighth a life. */
export const CHAIN = [100, 200, 400, 800, 1000, 2000, 4000, 8000] as const;
export const POINTS = { down: 100, slip: 150, schooled: 150, frozen: 50, swat: 50, shield: 200, fled: 100, shaft: 500 } as const;
/** A plain hit's throw, a big one's (the spec's staff knockback), and the bellhop's slide. */
export const KNOCK = { small: { back: 700, up: 650 }, big: { back: 1100, up: 600 }, slide: { speed: 1100, friction: 700 }, bounce: 0.3 } as const;
/** How fast a cart, a sliding bellhop or a flying body must move to bowl or to hurt. */
export const ROLLING = 150;
export const SPILL = { water: { w: 260, life: 8 }, coffee: { w: 150, life: 7 }, gravy: { w: 260, life: 8 }, grease: { w: 150, life: 7 } } as const;
export type SpillKind = keyof typeof SPILL;
/** What a staffer's fall leaves on the floor: the tray's water, the coffee, the gravy, the pan's grease. */
export const SPILL_OF: Partial<Record<CastJob, SpillKind>> = { server: "water", office: "coffee", lunch: "gravy", cook: "grease" };
/**
 * The beats' seconds: the double-take, getting up, a stagger and the gap between bump lines, a slip, a freeze, a line; the leaving
 * walk's px/s; how far off he is gone; how far off, walking off against a wall, he is out of Hammer's view and gone at once.
 */
export const T = { notice: 0.6, getup: 0.6, bump: 0.3, bumpGap: 1.5, slip: 0.4, freeze: 1.8, line: 2, leave: 200, gone: 1500, offView: 1300 } as const;
export const STOMP = { tolerance: 24, bounce: 900, held: 1300 } as const;
/** Cast ids start here: a swing's victims list holds carts and cast alike, so they never meet. */
export const CAST_ID = 1001;
export { FALL_MARGIN } from "./constants";

export type Npc = {
  id: number;
  spawn: string;
  role: CastRole;
  person: CastPerson;
  /** Who they are (the painting's job); `role` is the fight they fight. */
  job: CastJob;
  recolor: string | null;
  /** Drawn this much taller or shorter than the painting (a repeat). */
  size: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 1 | -1;
  /** His spot, his patrol's ends and the y he lives at. */
  home: number;
  x0: number;
  x1: number;
  level: number;
  act: CastAct;
  /** Seconds in the act. */
  actT: number;
  hits: number;
  /** Knocked out for good: he leaves once he is up. */
  out: boolean;
  /** False once he has walked off or fallen: skipped everywhere, kept for the snapshot's ids. */
  alive: boolean;
  noticed: boolean;
  /** Seconds until his next attack may start. */
  rest: number;
  /** The bellhop's cart (a target id), the hat still on, the tray or cup still held, slimed by snot. */
  cart: number | null;
  hat: boolean;
  prop: boolean;
  /** The hit that sent him flying knocked the tray, the cup or the pan out of his hands: it spills where he lands. */
  spills: boolean;
  slimed: boolean;
  /** Degrees turned while flying or sliding; the way a knock threw him; a slide's chain count. */
  spin: number;
  dir: 1 | -1;
  chain: number;
  hide: boolean;
  sit: boolean;
  /** Seconds since his last bump line; a wall stopped him this step; he bounced once in this flight. */
  bumpT: number;
  blocked: boolean;
  bounced: boolean;
  /** A role's own marker: where a rush started, a hop's way picked, whether the coffee is thrown. */
  mark: number;
  /** When a student last hopped back. */
  hopAt: number;
  /** The phone chime sounded for this approach. */
  cue: boolean;
  /** His index in the cast: stable picks of lines and rests. */
  k: number;
};

export function createCast(level: Pick<Level, "cast" | "carts">, targets: Target[]): Npc[] {
  return (level.cast ?? []).map((s, k) => {
    const job = jobOf(s.person);
    const role = ROLE_OF[job];
    const c = CAST[role];
    const target = s.cart === undefined ? undefined : targets.find((t) => Math.abs(t.x - s.cart!) < 1);
    // A busser's cart carries what he pushes: dirty dishes, or the dock's trash.
    if (target && s.load) target.load = s.load;
    const cart = target?.id ?? null;
    return {
      id: CAST_ID + k,
      spawn: s.id,
      role,
      job,
      person: s.person,
      recolor: s.recolor ?? null,
      size: s.size ?? 1,
      x: s.x,
      y: s.y,
      w: c.w,
      h: c.h,
      vx: 0,
      vy: 0,
      onGround: true,
      facing: s.facing ?? -1,
      home: s.x,
      x0: s.x0 ?? s.x,
      x1: s.x1 ?? s.x,
      level: s.y,
      act: s.hide ? "hide" : "idle",
      actT: 0,
      hits: 0,
      out: false,
      alive: true,
      noticed: false,
      rest: role === "student" ? CAST.student.restMin + (k % 4) * CAST.student.restStep : 0,
      cart,
      hat: HATTED.has(job),
      prop: role !== "bellhop",
      spills: false,
      slimed: false,
      spin: 0,
      dir: -1,
      chain: 0,
      hide: !!s.hide,
      sit: !!s.sit,
      bumpT: T.bumpGap,
      blocked: false,
      bounced: false,
      mark: 0,
      hopAt: -9,
      cue: false,
      k,
    };
  });
}

export const npcRect = (n: Npc): Rect => bodyRect(n);
export const setAct = (n: Npc, act: CastAct): void => {
  n.act = act;
  n.actT = 0;
};
export const say = (n: Npc, text: string, events: GameEvent[]): void => {
  events.push({ type: "castLine", id: n.id, text, seconds: T.line });
};

const STANDING: ReadonlySet<CastAct> = new Set<CastAct>(["idle", "walk", "notice", "windup", "attack", "recover", "chase", "return", "bumped"]);
/** Standing acts: on his feet and doing his job (what a lecture freezes and a bump staggers). */
export const standing = (n: Npc): boolean => n.alive && STANDING.has(n.act);
const UNHITTABLE: ReadonlySet<CastAct> = new Set<CastAct>(["fly", "slide", "leave", "flee", "getup", "slip", "hide"]);
/** Can be hit now: alive, not flying, sliding, leaving, fleeing, getting up, slipping or hidden; a downed one only while he will get up again (the bellhop's first hit). */
export const hittable = (n: Npc): boolean => n.alive && !UNHITTABLE.has(n.act) && !(n.out && n.act === "down");

export type StrikeWorld = { puddles: Puddle[]; stage: Stage };
/** The hits that throw hard: the spec's staff knockback. */
const BIG: ReadonlySet<CastHitBy> = new Set<CastHitBy>(["burst", "shield", "cart", "slide", "body"]);

/** A spill on the floor under him: the server's water, the office worker's coffee. */
export function spill(w: StrikeWorld, n: Npc, kind: SpillKind): void {
  const s = SPILL[kind];
  const y = floorAt(w.stage, n.x, n.y - 24) ?? n.y;
  w.puddles.push({ x: n.x, y, w: s.w, life: s.life, max: s.life, kind });
  if (w.puddles.length > SNOT.puddles) w.puddles.shift();
}

function hitEvent(n: Npc, by: CastHitBy, dir: 1 | -1, down: boolean, points: number, events: GameEvent[], drops = false) {
  events.push({ type: "castHit", id: n.id, role: n.role, job: n.job, by, x: n.x, y: n.y - n.h / 2, dir, down, points, drops });
}

/** Thrown: off his feet, flying `dir`, turning over. */
export function throwNpc(n: Npc, dir: 1 | -1, big: boolean): void {
  const k = big ? KNOCK.big : KNOCK.small;
  n.dir = dir;
  n.vx = dir * k.back;
  n.vy = -k.up;
  n.onGround = false;
  n.spin = 0;
  n.chain = 0;
  n.bounced = false;
  setAct(n, "fly");
}

/**
 * A hit on a cast member; true when it landed (students duck the mallet and sidestep a stomp). `chain` > 0 is a
 * bowl's count: its points ride the chain event instead, and the thrown body carries the count on.
 */
export function strikeNpc(n: Npc, by: CastHitBy, dir: 1 | -1, w: StrikeWorld, events: GameEvent[], chain = 0): boolean {
  if (!hittable(n)) return false;
  const big = BIG.has(by);
  if (n.role === "student") {
    if (by === "puddle") return false;
    if (by === "mallet" && n.act !== "schooled") {
      setAct(n, "duck");
      say(n, CAST_LINES.student.duck, events);
      return false;
    }
    if (by === "stomp") {
      setAct(n, "hop");
      n.dir = dir;
      n.mark = -1;
      return false;
    }
    n.hits++;
    n.prop = false;
    // Short of his last hit he is only slimed or knocked down: he gets back up and keeps throwing.
    n.out = n.hits >= CAST.student.hits;
    if (by === "snot" && !n.out) {
      n.slimed = true;
      n.dir = dir;
      n.mark = -1;
      setAct(n, "hop");
      say(n, CAST_LINES.student.snot, events);
      hitEvent(n, by, dir, false, POINTS.down, events);
      return true;
    }
    if (by === "snot") {
      n.slimed = true;
      n.facing = dir;
      setAct(n, "flee");
      say(n, CAST_LINES.student.snot, events);
      hitEvent(n, by, dir, true, 0, events);
      events.push({ type: "castFlee", id: n.id, x: n.x, y: n.y - n.h, points: POINTS.fled });
      return true;
    }
    throwNpc(n, dir, big);
    n.chain = chain;
    hitEvent(n, by, dir, n.out, by === "shield" ? POINTS.shield : chain ? 0 : POINTS.down, events);
    return true;
  }
  if (by === "snot") n.slimed = true;
  n.hits++;
  n.spills = n.prop;
  n.prop = false;
  n.hat = false;
  n.out = n.hits >= CAST[n.role].hits;
  const points = by === "shield" ? POINTS.shield : by === "puddle" ? POINTS.slip : chain ? 0 : POINTS.down;
  if (n.role === "bellhop" && n.act === "down") {
    // The second hit while he is down: along the marble on his back.
    n.dir = dir;
    n.vx = dir * KNOCK.slide.speed;
    n.vy = 0;
    n.chain = 0;
    n.spin = 0;
    setAct(n, "slide");
  } else if (by === "puddle") {
    n.dir = dir;
    n.vx = 0;
    setAct(n, "slip");
  } else {
    throwNpc(n, dir, big);
    n.chain = chain;
  }
  hitEvent(n, by, dir, n.out, points, events, n.spills);
  return true;
}

/** The line a cast member opens with when he sees Hammer. */
export function noticeLine(n: Npc): string {
  return pick(linesOf(n).notice, n.k);
}

/** Everything a cast member says. */
export const linesOf = (n: Pick<Npc, "job">): CastLineSet => JOB_LINES[n.job];
