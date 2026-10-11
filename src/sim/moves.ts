import { WALK } from "./constants";
import type { GameEvent } from "./events";
import type { Input } from "./input";
import type { HeroState, Rect } from "./types";

export type MoveKind = "swing" | "super" | "snot" | "wipe" | "lecture" | "watch" | "tap" | "hurt" | "tumble";
export type Move = { kind: MoveKind; t: number; fired: boolean; burst: boolean; lastU: number; stroke: number; victims: number[]; held: number };

// The shipped game's timings (src/game/combat.ts, src/game/rig.ts); the watch and tap are its idle beats.
export const MOVE_SECONDS: Record<MoveKind, number> = {
  swing: 0.42,
  super: 0.66,
  snot: 0.45,
  wipe: 0.95,
  lecture: 0.8,
  watch: 2.1,
  tap: 3,
  hurt: 0.45,
  tumble: 1.6,
};
/** The tumble's frame where he lands flat: the sim holds it while he is still in the air. */
export const TUMBLE_LAND = 0.3;
/** Seconds into the foot tap when the tapping stops and he harrumphs. */
export const TAP_HARRUMPH = 2.5;
/** Seconds of grace after a hit, and again as he gets up (the shipped 1.45 s). */
export const GRACE = 1.45;
/** Longest the tumble waits in the air for the floor before it plays on. */
export const TUMBLE_HOLD = 1.5;
/** Where a swing can land, as a fraction of the move. */
export const SWING_ACTIVE = [0.33, 0.72] as const;
/** The strike over the head, sampled for contact but never drawn. */
export const SWING_CUT = [0.33, 0.36] as const;
export const SUPER_CUT = [0.42, 0.46] as const;
export const SNOT_FIRE_U = 0.45;
export const WIPE_SCRUB = [0.12, 0.62] as const;
export const WIPE_FLICK = [0.62, 0.78] as const;
export const WIPE_SHINE = 0.84;
/** Heat per second running and resting, per action, the wipe's drain, and the thresholds. */
export const HEAT = { run: 6, rest: 3, jump: 12, swing: 3, snot: 5, wipe: 240, tired: 80, boil: 99.5, cool: 70 } as const;
export const SINUS_MAX = 3;
export const SINUS_REFILL = 1.5;
export const FIRE_COOLDOWN = 0.5;
export const SNOT_ALIVE = 3;
export const CHARGE_MAX = 10;
/** The shipped hop and plunge (260 and 300 px/s at 50 px tall), scaled by the run speeds. */
export const SUPER_HOP = 1020;
export const SUPER_PLUNGE = 1215;
/** Caps while tired, as fractions of the run and walk speeds. */
export const TIRED = { run: 0.73, walk: 0.67 } as const;

/**
 * The shipped lecture (src/game/engine.ts `deliverLecture`): 1.4 s from one to the next, delivered
 * a fifth of the way in, 15 heat off, and its reach in front of him (-8..112 by +-52 at 50 px tall).
 */
export const LECTURE = { cooldown: 1.4, deliver: 0.2, cool: 15, ahead: 762, behind: 54, half: 354 } as const;
/** Moves that hold him still: no steering and no jump until they end. */
export const LOCKING: ReadonlySet<MoveKind> = new Set<MoveKind>(["wipe", "lecture", "hurt", "tumble"]);

/** The shipped idle beats: the watch check at 2.5 s, the foot tap from 5 s, the harrumph at 8 s, then round again. */
export const IDLE = { watchAt: 2.5, tapAt: 5, harrumphAt: 8 } as const;
const IDLE_ACTS: ReadonlySet<MoveKind> = new Set<MoveKind>(["watch", "tap"]);
export const isIdleAct = (m: Move | null): boolean => m !== null && IDLE_ACTS.has(m.kind);

export const newMove = (kind: MoveKind): Move => ({ kind, t: 0, fired: false, burst: false, lastU: -1, stroke: -1, victims: [], held: 0 });
export const moveU = (m: Move) => Math.min(1, m.t / MOVE_SECONDS[m.kind]);

/** Starts at most one move, by the shipped priority: towel, snot, lecture, super, swing. Nothing starts crouched or sliding. */
export function startMove(h: HeroState, input: Input, alive: number, events: GameEvent[]): void {
  // An idle act gives way to anything he presses.
  if ((h.move && !isIdleAct(h.move)) || h.crouch) return;
  const p = input.pressed;
  if (p.towel && h.heat > 0 && h.onGround) {
    h.move = newMove("wipe");
    h.vx *= 0.2;
    events.push({ type: "wipeStart" });
  } else if (p.fire && h.sinus >= 1 && h.fireCd <= 0 && alive < SNOT_ALIVE) {
    h.move = newMove("snot");
    h.fireCd = FIRE_COOLDOWN;
    h.sinus -= 1;
    events.push({ type: "sniff" });
  } else if (p.lecture && h.onGround && h.lectureCd <= 0) {
    h.move = newMove("lecture");
    h.lectureCd = LECTURE.cooldown;
    h.vx *= 0.2;
    events.push({ type: "lectureStart" });
  } else if (p.super && h.charge >= CHARGE_MAX) {
    h.move = newMove("super");
    h.charge = 0;
    h.vy = -SUPER_HOP;
    h.onGround = false;
    events.push({ type: "superStart" });
  } else if (p.hammer) {
    h.move = newMove("swing");
    h.heat = Math.min(100, h.heat + HEAT.swing);
    events.push({ type: "swing" });
  }
}

/** Before movement: the super plunges once the load is done, until it lands. */
export function steerMove(h: HeroState): void {
  const m = h.move;
  if (m?.kind === "super" && !m.burst && moveU(m) >= SUPER_CUT[0] && !h.onGround) h.vy = Math.max(h.vy, SUPER_PLUNGE);
}

/** After movement: the clock, the wipe's strokes, the super's landing flag, the end. */
export function advanceMove(h: HeroState, dt: number, events: GameEvent[]): void {
  const m = h.move;
  if (!m) return;
  // Down off a ledge, the tumble holds its landing frame until he lands.
  if (m.kind === "tumble" && !h.onGround && moveU(m) >= TUMBLE_LAND && m.held < TUMBLE_HOLD) m.held += dt;
  else m.t += dt;
  const u = moveU(m);
  if (m.kind === "super" && !m.burst && u >= SUPER_CUT[0] && (h.onGround || u >= 0.92)) m.burst = true;
  if (m.kind === "wipe") {
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
    if (stroke !== m.stroke) {
      m.stroke = stroke;
      if (stroke >= 0 && stroke < 5) events.push({ type: "stroke", n: stroke });
      else if (stroke === 6) events.push({ type: "flick" });
      else if (stroke === 7) events.push({ type: "shine" });
    }
  }
  if (m.t >= MOVE_SECONDS[m.kind]) {
    h.move = null;
    if (m.kind === "tumble") {
      h.invuln = Math.max(h.invuln, GRACE);
      events.push({ type: "getUp" });
    }
  }
}

/** The lecture's reach: a box in front of him, world px. */
export function lectureReach(h: Pick<HeroState, "x" | "y" | "h" | "facing">): Rect {
  const cy = h.y - h.h / 2;
  const x = h.facing === 1 ? h.x - LECTURE.behind : h.x - LECTURE.ahead;
  return { x, y: cy - LECTURE.half, w: LECTURE.ahead + LECTURE.behind, h: 2 * LECTURE.half };
}

/** A fifth of the way in, once: the lecture lands on everyone in reach and cools him. */
export function deliverLecture(h: HeroState, events: GameEvent[]): void {
  const m = h.move;
  if (m?.kind !== "lecture" || m.fired || moveU(m) < LECTURE.deliver) return;
  m.fired = true;
  h.heat = Math.max(0, h.heat - LECTURE.cool);
  events.push({ type: "lecture", reach: lectureReach(h) });
}

/** Standing around. Any key, any motion or any other move ends an idle act and starts the count again. */
export function stepIdle(h: HeroState, input: Input, dt: number, events: GameEvent[]): void {
  const busy =
    Object.values(input.held).some(Boolean) ||
    !h.onGround ||
    Math.abs(h.vx) > 1 ||
    h.crouch ||
    (h.move !== null && !isIdleAct(h.move));
  if (busy) {
    h.idleT = 0;
    h.bored = false;
    if (isIdleAct(h.move)) h.move = null;
    return;
  }
  const was = h.idleT;
  h.idleT += dt;
  const crossed = (t: number) => was < t && h.idleT >= t;
  if (crossed(IDLE.watchAt)) {
    h.move = newMove("watch");
    h.bored = true;
    events.push({ type: "watch" });
  }
  if (crossed(IDLE.tapAt)) {
    h.move = newMove("tap");
    events.push({ type: "tap" });
  }
  if (h.idleT >= IDLE.harrumphAt) {
    h.idleT = 0;
    events.push({ type: "harrumph" });
  }
}

/** Heat, the sinus and the cooldowns, every step. */
export function stepHeat(h: HeroState, input: Input, dt: number, events: GameEvent[]): void {
  if (h.move?.kind === "wipe") h.heat = Math.max(0, h.heat - HEAT.wipe * dt);
  else {
    const running = input.held.run && Math.abs(h.vx) > WALK;
    h.heat = Math.min(100, Math.max(0, h.heat + (running ? HEAT.run : -HEAT.rest) * dt));
  }
  if (h.heat >= HEAT.boil && !h.boiled) {
    h.boiled = true;
    events.push({ type: "boiling" });
  } else if (h.heat < HEAT.cool) h.boiled = false;
  h.sinus = Math.min(SINUS_MAX, h.sinus + dt / SINUS_REFILL);
  h.fireCd = Math.max(0, h.fireCd - dt);
  h.lectureCd = Math.max(0, h.lectureCd - dt);
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.invuln = Math.max(0, h.invuln - dt);
}
