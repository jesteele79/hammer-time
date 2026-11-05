import { BURST_R, MALLET_R } from "./hits";
import type { GameEvent } from "./events";
import { overlapsRect, sweptHeadHits } from "./geometry";
import type { BossSpec } from "./level";
import { createMover, type Mover } from "./movers";
import type { HeroState, Point, Rect, Stage } from "./types";

export type SupervisorState = "waiting" | "windup" | "wave" | "down";
/** The housekeeping supervisor (story spec §8.2): `x` her middle, `y` her feet, at the top of the flight. */
export type Supervisor = {
  kind: "supervisor";
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  state: SupervisorState;
  hp: number;
  max: number;
  /** Seconds before another hit counts. */
  hurtT: number;
  /** Which wave she is on, and how many of its carts have gone. */
  wave: number;
  sent: number;
  timer: number;
  /** She has seen him on the floor below hers. */
  awake: boolean;
  /** How low his feet must be to wake her: the floor below hers. */
  wake: number;
  /** The flight she sends her carts down: its top at x0, its foot at x1. */
  flight: { x0: number; x1: number; y0: number; y1: number };
  /** Seconds of her flinch, for the view. */
  flinch: number;
  /** How many carts she has sent: their ids. */
  carts: number;
  /** She is down and her last cart has not been sent: however the last hit landed. */
  ride: boolean;
};

export const SUPERVISOR = { hp: 3, gap: 0.5, windup: 0.8, waves: 3, cartEvery: 4, cartSpeed: 300, cartW: 180, cartH: 150, rideSpeed: 140, points: 2500, waiting: 3, w: 100, h: 330, flinch: 0.4 } as const;
/** The boss's id among the mallet's victims and for its speech: clear of the carts', the cast's and the pig's. */
export const BOSS_ID = 901;

export const createSupervisor = (b: BossSpec, floor: number): Supervisor => {
  const y = b.y ?? floor;
  const every = 540;
  return {
    kind: "supervisor",
    x: b.x,
    y,
    w: SUPERVISOR.w,
    h: SUPERVISOR.h,
    facing: 1,
    state: "waiting",
    hp: SUPERVISOR.hp,
    max: SUPERVISOR.hp,
    hurtT: 0,
    wave: 0,
    sent: 0,
    timer: 0,
    awake: false,
    wake: y + every + 10,
    flight: { x0: b.arena[0], x1: b.arena[1], y0: y, y1: y + every },
    flinch: 0,
    carts: 0,
    ride: false,
  };
};

export const supervisorRect = (s: Supervisor): Rect => ({ x: s.x - s.w / 2, y: s.y - s.h, w: s.w, h: s.h });

export type SupervisorWorld = { hero: HeroState; movers: Mover[]; stage: Stage; swing: Point[] };

function sendCart(s: Supervisor, w: SupervisorWorld, speed: number, dir: 1 | -1, once: boolean): void {
  const { x0, x1, y0, y1 } = s.flight;
  const at = dir > 0 ? x0 + 60 : x1 - 60;
  const m = createMover({ id: `wave-${++s.carts}`, x: at, y: y0 + ((y1 - y0) * (at - x0)) / (x1 - x0), x0: x0 + 40, x1: once ? x1 + 170 : x1 - 40, w: SUPERVISOR.cartW, h: SUPERVISOR.cartH, speed });
  m.dir = dir;
  m.onSlope = { x0, x1, y0, y1 };
  m.once = once;
  w.movers.push(m);
  w.stage.platforms = [...w.stage.platforms, m.top];
}

/** The cart is his to ride up the flight, once. */
function sendRide(s: Supervisor, w: SupervisorWorld): void {
  if (!s.ride) return;
  s.ride = false;
  sendCart(s, w, SUPERVISOR.rideSpeed, -1, false);
}

/** A hit on her: only while she waits between her waves, one in half a second; at the last she goes down and her last cart is his to ride. */
export function hitSupervisor(s: Supervisor, by: "bonk" | "snot", events: GameEvent[]): boolean {
  if (s.state !== "waiting" || !s.awake || s.hurtT > 0) return false;
  s.hurtT = SUPERVISOR.gap;
  s.flinch = SUPERVISOR.flinch;
  s.hp = Math.max(0, s.hp - 1);
  events.push({ type: "bossHit", by, x: s.x, y: s.y - s.h * 0.6, hp: s.hp });
  if (s.hp > 0) return true;
  s.state = "down";
  s.ride = true;
  events.push({ type: "bossDown", x: s.x, y: s.y - s.h, points: SUPERVISOR.points });
  events.push({ type: "think", text: "Do not disturb THIS.", seconds: 2.4 });
  return true;
}

/** Her waves: a wind-up, three carts four seconds apart down the flight, then the wait in which she can be hit. */
export function stepSupervisor(s: Supervisor, w: SupervisorWorld, dt: number, events: GameEvent[]): void {
  s.hurtT = Math.max(0, s.hurtT - dt);
  s.flinch = Math.max(0, s.flinch - dt);
  if (s.state === "down") return sendRide(s, w);
  const h = w.hero;
  if (!s.awake) {
    if (h.y > s.wake) return;
    s.awake = true;
    s.state = "windup";
    s.timer = SUPERVISOR.windup;
    events.push({ type: "bossWindup", x: s.x, y: s.y - s.h });
    return;
  }
  // The mallet's arc this step (once a swing), and the smash's burst.
  const r = supervisorRect(s);
  const m = h.move;
  if (m?.kind === "swing" && !m.victims.includes(BOSS_ID))
    for (let k = 0; k < w.swing.length; k++) {
      if (!sweptHeadHits(w.swing[Math.max(0, k - 1)], w.swing[k], MALLET_R, r)) continue;
      if (hitSupervisor(s, "bonk", events)) m.victims.push(BOSS_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(s.x - burst.x, s.y - s.h / 2 - burst.y) <= BURST_R) hitSupervisor(s, "bonk", events);
  const lecture = events.find((e) => e.type === "lecture") as Extract<GameEvent, { type: "lecture" }> | undefined;
  if (lecture && overlapsRect(lecture.reach, r)) events.push({ type: "castLine", id: BOSS_ID, text: "Guests use the elevator.", seconds: 1.6 });
  if ((s.state as SupervisorState) === "down") return sendRide(s, w);
  s.timer -= dt;
  if (s.timer > 0) return;
  if (s.state === "windup") {
    s.state = "wave";
    s.wave++;
    s.sent = 0;
    s.timer = 0;
    events.push({ type: "bossWave", x: s.x, y: s.y - s.h / 2, n: s.wave });
    if (s.wave === 1) {
      events.push({ type: "castLine", id: BOSS_ID, text: "Guests use the elevator.", seconds: 2.2 });
      events.push({ type: "think", text: "Guests wait. I don't.", seconds: 2.2 });
    }
  }
  if (s.state === "wave") {
    if (s.sent >= SUPERVISOR.waves) {
      s.state = "waiting";
      s.timer = SUPERVISOR.waiting;
      return;
    }
    s.sent++;
    s.timer = SUPERVISOR.cartEvery;
    sendCart(s, w, SUPERVISOR.cartSpeed, 1, true);
    return;
  }
  // The wait is over: another wave.
  s.state = "windup";
  s.timer = SUPERVISOR.windup;
  events.push({ type: "bossWindup", x: s.x, y: s.y - s.h });
}
