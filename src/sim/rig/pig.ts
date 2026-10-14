import { PIG, type PigState } from "../pig";
import { pose, smooth, type Pose } from "./pose";

/** The pig's state, how long it has been in it, the time for breathing, the hit's gap left, and since a hop landed. */
export type PigClipCtx = { state: PigState; t: number; clock: number; hurtT: number; onGround: boolean; landT: number | null };
export type PigFace = "squint" | "charge" | "hurt" | "defeated";

/** Its feel (R3 §5.2, main spec §7.2): degrees, hertz, seconds and squash factors. */
export const PIG_FEEL = {
  breathHz: 0.5,
  breath: 0.02,
  pantHz: 1.6,
  pant: 0.03,
  windupLean: 12,
  chargeLean: 18,
  leanIn: 0.25,
  legHz: 6,
  legSwing: 26,
  hopAir: { x: 0.9, y: 1.15 },
  hopLand: { x: 1.2, y: 0.8 },
  landT: 0.25,
  deflate: 0.85,
  deflateT: 1.2,
  wobble: 5,
  wobbleHz: 9,
} as const;

const wave = (t: number, hz: number) => Math.sin(t * 2 * Math.PI * hz);
const ease = (t: number, over: number) => smooth(Math.min(1, Math.max(0, t / over)));

/**
 * The pig's pose in its state. A lean is a spin of the whole stuffed body about its middle (positive leans back, as the
 * solve turns it), so its head goes with it; its arms and legs move under it. A hit wobbles it while the gap runs.
 */
export function pigPose(c: PigClipCtx): Pose {
  const F = PIG_FEEL;
  const wobble = c.hurtT > 0 ? wave(PIG.gap - c.hurtT, F.wobbleHz) * F.wobble * (c.hurtT / PIG.gap) : 0;
  const breathe = (hz: number, amp: number) => {
    const b = wave(c.clock, hz) * amp;
    return { x: 1 - b / 2, y: 1 + b };
  };
  switch (c.state) {
    case "asleep":
      return pose({ squash: breathe(F.breathHz, F.breath), headTilt: -4, rot: { shoulderNear: -12, shoulderFar: -12 } });
    case "windup": {
      const a = ease(c.t, F.leanIn);
      return pose({ spin: F.windupLean * a + wobble, squash: breathe(F.breathHz, F.breath), rot: { shoulderNear: 30 * a, shoulderFar: 30 * a, hipNear: -8 * a, hipFar: 8 * a } });
    }
    case "charge": {
      const a = ease(c.t, 0.12);
      const s = wave(c.t, F.legHz) * F.legSwing * a;
      return pose({
        spin: -F.chargeLean * a + wobble,
        rot: { hipNear: s, hipFar: -s, kneeNear: -Math.max(0, s) * 0.6, kneeFar: -Math.max(0, -s) * 0.6, shoulderNear: -35 * a, shoulderFar: -35 * a },
      });
    }
    case "hop": {
      if (!c.onGround) {
        const a = ease(c.t, 0.1);
        const tuck = { shoulderNear: 40 * a, shoulderFar: 40 * a, hipNear: 20 * a, hipFar: -12 * a, kneeNear: -25 * a, kneeFar: -25 * a };
        return pose({ spin: -6 * a + wobble, squash: { x: 1 + (F.hopAir.x - 1) * a, y: 1 + (F.hopAir.y - 1) * a }, rot: tuck });
      }
      // Landing: squashed at once, then back over a quarter second.
      const l = ease(c.landT ?? F.landT, F.landT);
      const k = 1 - l;
      return pose({
        spin: -6 * k + wobble,
        squash: { x: F.hopLand.x + (1 - F.hopLand.x) * l, y: F.hopLand.y + (1 - F.hopLand.y) * l },
        rot: { shoulderNear: 40 * k, shoulderFar: 40 * k, hipNear: 20 * k, hipFar: -12 * k, kneeNear: -25 * k, kneeFar: -25 * k },
      });
    }
    case "recover":
      return pose({ spin: wobble, squash: breathe(F.pantHz, F.pant), headTilt: 5, rot: { shoulderNear: -18, shoulderFar: -18 } });
    case "defeated": {
      const a = ease(c.t, F.deflateT);
      return pose({ spin: 6 * a, squash: { x: 1 + 0.08 * a, y: 1 - (1 - F.deflate) * a }, headTilt: 8 * a, rot: { shoulderNear: -30 * a, shoulderFar: -30 * a } });
    }
  }
}

/** The face edit its state wears, or null for the painted one. */
export function pigFace(c: Pick<PigClipCtx, "state" | "hurtT" | "onGround">): PigFace | null {
  if (c.state === "defeated") return "defeated";
  if (c.hurtT > 0) return "hurt";
  if (c.state === "windup" || c.state === "asleep") return "squint";
  if (c.state === "charge" || (c.state === "hop" && !c.onGround)) return "charge";
  return null;
}
