import { WALK } from "./constants";
import type { GameEvent } from "./events";
import type { Input } from "./input";
import type { HeroState } from "./types";

export type MoveKind = "swing" | "super" | "snot" | "wipe";
export type Move = { kind: MoveKind; t: number; fired: boolean; burst: boolean; lastU: number; stroke: number; victims: number[] };

// The shipped game's timings (src/game/combat.ts, src/game/rig.ts).
export const MOVE_SECONDS: Record<MoveKind, number> = { swing: 0.42, super: 0.66, snot: 0.45, wipe: 0.95 };
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

const newMove = (kind: MoveKind): Move => ({ kind, t: 0, fired: false, burst: false, lastU: -1, stroke: -1, victims: [] });
export const moveU = (m: Move) => Math.min(1, m.t / MOVE_SECONDS[m.kind]);

/** Starts at most one move, by the shipped priority: towel, snot, super, swing. Nothing starts crouched or sliding. */
export function startMove(h: HeroState, input: Input, alive: number, events: GameEvent[]): void {
  if (h.move || h.crouch) return;
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
  m.t += dt;
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
  if (m.t >= MOVE_SECONDS[m.kind]) h.move = null;
}

/** Heat, the sinus and the snot cooldown, every step. */
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
}
