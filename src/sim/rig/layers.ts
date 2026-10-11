import type { GameEvent } from "../events";
import { smooth, type Pose } from "./pose";

/** The procedural layers over the clips (spec §6.3). */
export const LAYERS = {
  /** Degrees of lean per px/s² of horizontal acceleration (ground acceleration gives the cap), and how fast it follows. */
  leanPer: 9 / 4400,
  leanMax: 9,
  leanT: 0.08,
  breathHz: 0.4,
  breath: 0.015,
  /** The belly's spring: its rate (rad/s), the kick a landing at 2600 px/s gives and a jump's, and the cap. */
  bellyW: 18,
  bellyLand: 1.95,
  bellyJump: -1.2,
  bellyMax: 0.04,
  land: { x: 1.08, y: 0.92, t: 0.09 },
  jump: { x: 0.95, y: 1.06, t: 0.18 },
} as const;
const TERMINAL = 2600;

export type Layers = {
  lean: number;
  lastVx: number | null;
  t: number;
  belly: number;
  bellyV: number;
  squash: { x: number; y: number; t: number; age: number } | null;
};

export const createLayers = (): Layers => ({ lean: 0, lastVx: null, t: 0, belly: 0, bellyV: 0, squash: null });

/** One frame of sim time: the lean follows the acceleration, the breath runs, landings squash, jumps stretch, the belly springs. */
export function stepLayers(s: Layers, h: { vx: number; facing: 1 | -1 }, events: readonly GameEvent[], dt: number): void {
  if (dt <= 0) return;
  s.t += dt;
  const ax = s.lastVx === null ? 0 : (h.vx - s.lastVx) / dt;
  s.lastVx = h.vx;
  const want = Math.max(-LAYERS.leanMax, Math.min(LAYERS.leanMax, ax * h.facing * LAYERS.leanPer));
  s.lean += (want - s.lean) * (1 - Math.exp(-dt / LAYERS.leanT));
  for (const e of events) {
    if (e.type === "land") {
      s.squash = { ...LAYERS.land, age: 0 };
      s.bellyV += LAYERS.bellyLand * Math.min(1, e.speed / TERMINAL);
    } else if (e.type === "jump") {
      s.squash = { ...LAYERS.jump, age: 0 };
      s.bellyV += LAYERS.bellyJump;
    }
  }
  if (s.squash) {
    s.squash.age += dt;
    if (s.squash.age >= s.squash.t) s.squash = null;
  }
  // Critically damped, stepped exactly, so a long frame can't make it ring: x(t) = (x0 + (v0 + w x0) t) e^(−wt).
  const w = LAYERS.bellyW;
  const e = Math.exp(-w * dt);
  const b = s.bellyV + w * s.belly;
  const x = s.belly + b * dt;
  s.belly = x * e;
  s.bellyV = (b - w * x) * e;
  s.belly = Math.max(-LAYERS.bellyMax, Math.min(LAYERS.bellyMax, s.belly));
}

export function squashNow(s: Layers): { x: number; y: number } {
  if (!s.squash) return { x: 1, y: 1 };
  const k = 1 - smooth(Math.min(1, s.squash.age / s.squash.t));
  return { x: 1 + (s.squash.x - 1) * k, y: 1 + (s.squash.y - 1) * k };
}

export const breathNow = (s: Layers) => 1 + LAYERS.breath * Math.sin(2 * Math.PI * LAYERS.breathHz * s.t);

/** The acceleration lean, on the locomotion pose before any action is laid over it. */
export function addLean(p: Pose, s: Layers): Pose {
  return { ...p, lean: p.lean + s.lean };
}

/** The squash, the stretch, the breath and the belly, on the finished pose. */
export function addBody(p: Pose, s: Layers): Pose {
  const q = squashNow(s);
  return { ...p, squash: { x: p.squash.x * q.x, y: p.squash.y * q.y }, torso: p.torso * (breathNow(s) + s.belly) };
}
