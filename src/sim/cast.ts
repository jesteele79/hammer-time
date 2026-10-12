import { CAST_LINES, STAFF_LINES, pick } from "../game/lines";
import type { GameEvent } from "./events";
import { bodyRect } from "./geometry";
import type { CastPerson, Level } from "./level";
import type { Rect, Target } from "./types";

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

export const roleOf = (p: CastPerson): CastRole => p.slice(0, -2) as CastRole;

/** Each role's numbers (the R2b design §2): colliders, how far they notice him, wind-ups, attacks, rests, dazes. World px and seconds. */
export const CAST = {
  bellhop: { w: 100, h: 330, notice: 900, windup: 0.7, windup2: 0.55, shove: 650, walk: 200, rest: 3, daze: 4, hits: 2, hold: 150 },
  server: { w: 90, h: 310, notice: 680, windup: 0.45, rush: 420, rushT: 2, rushPx: 1000, walk: 200, skid: 0.4, rest: 1.5, daze: 2.5, hits: 1 },
  office: { w: 95, h: 320, notice: 500, windup: 0.5, march: 160, chime: 400, leap: 500, leapUp: 600, rest: 2, daze: 2.5, hits: 1 },
  student: { w: 90, h: 310, notice: 1100, windup: 0.65, restMin: 4, restStep: 0.6, melee: 300, hop: 200, hopT: 0.35, duck: 0.5, schooled: 9, flee: 400, planes: 3 },
} as const;
/** How many may be on the attack at once (the design §4). */
export const TICKETS = 2;
/** The shipped chain: one moving thing bowling staffer after staffer, the eighth a life. */
export const CHAIN = [100, 200, 400, 800, 1000, 2000, 4000, 8000] as const;
export const POINTS = { down: 100, slip: 150, schooled: 150, frozen: 50, swat: 50, shield: 200, fled: 100, shaft: 500 } as const;
/** A plain hit's throw, a big one's (the spec's staff knockback), and the bellhop's slide. */
export const KNOCK = { small: { back: 700, up: 650 }, big: { back: 1100, up: 600 }, slide: { speed: 1100, friction: 700 }, bounce: 0.3 } as const;
/** How fast a cart, a sliding bellhop or a flying body must move to bowl or to hurt. */
export const ROLLING = 150;
export const SPILL = { water: { w: 260, life: 8 }, coffee: { w: 150, life: 7 } } as const;
/** The beats' seconds: the double-take, getting up, a stagger and the gap between bump lines, a slip, a freeze, a line; the leaving walk's px/s; how far off he is gone. */
export const T = { notice: 0.6, getup: 0.6, bump: 0.3, bumpGap: 1.5, slip: 0.4, freeze: 1.8, line: 2, leave: 200, gone: 1500 } as const;
export const STOMP = { tolerance: 24, bounce: 900, held: 1300 } as const;
/** Cast ids start here: a swing's victims list holds carts and cast alike, so they never meet. */
export const CAST_ID = 1001;

export type Npc = {
  id: number;
  spawn: string;
  role: CastRole;
  person: CastPerson;
  recolor: string | null;
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
  /** The phone chime sounded for this approach. */
  cue: boolean;
  /** His index in the cast: stable picks of lines and rests. */
  k: number;
};

export function createCast(level: Pick<Level, "cast" | "carts">, targets: Target[]): Npc[] {
  return (level.cast ?? []).map((s, k) => {
    const role = roleOf(s.person);
    const c = CAST[role];
    const cart = s.cart === undefined ? null : (targets.find((t) => Math.abs(t.x - s.cart!) < 1)?.id ?? null);
    return {
      id: CAST_ID + k,
      spawn: s.id,
      role,
      person: s.person,
      recolor: s.recolor ?? null,
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
      hat: role === "bellhop",
      prop: role !== "bellhop",
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

/** The line a cast member opens with when he sees Hammer. */
export function noticeLine(n: Npc): string {
  if (n.role === "bellhop") return pick(CAST_LINES.bellhop.notice, n.k);
  if (n.role === "server") return pick(STAFF_LINES.server, n.k);
  if (n.role === "office") return pick(CAST_LINES.office.notice, n.k);
  return pick(CAST_LINES.student.notice, n.k);
}
