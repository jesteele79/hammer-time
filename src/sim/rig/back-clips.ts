import { pose, type Pose } from "./pose";

/** His back's clips: the rig's poses on the back painting's own skeleton, and how much each leg and arm is foreshortened. */
export type BackClipName = "idle" | "walk" | "run" | "swing" | "jump" | "crouch";
/** A frame of his back: the pose, and each limb's foreshortening about its hip or shoulder (1 as painted). */
export type BackFrame = { pose: Pose; legNear: number; legFar: number; armNear: number; armFar: number };
export const BACK_SECONDS = { idle: 3, walk: 0.6, run: 0.42, swing: 0.42, jump: 1, crouch: 1 } as const;
/** The crouch: how much of a leg his pelvis comes down, in rest units for his leg of 133. */
const CROUCH = { leg: 0.65, drop: 133 * 0.35 } as const;

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** Eased from `a` to `b` between `u0` and `u1`. */
const ramp = (u: number, u0: number, u1: number, a: number, b: number) => a + (b - a) * smooth(clamp01((u - u0) / (u1 - u0)));

/** The rig's shoulder turn that raises the near arm: out to his side and up, on the screen's right. */
const UP = -1;
/** The swing's arm, radians from hanging: all the way up and over at the top, and through the blow. */
const SWING = { top: 2.6, through: 3.3, start: 0.12, peak: 0.42, hit: 0.62, out: 1 } as const;

/** A step from behind: the leg coming through shortens, as it lifts toward him; the arms swing against the legs and his weight rolls. */
function stride(u: number, lift: number, swing: number, roll: number, bob: number): BackFrame {
  const s = Math.sin(u * TAU);
  const near = Math.max(0, s);
  const far = Math.max(0, -s);
  return {
    pose: pose({
      rot: { shoulderNear: (UP * swing * 0.45 * s + 2) * 1, shoulderFar: -swing * s, hipNear: -2 * s, hipFar: 2 * s },
      lean: roll * s,
      root: { x: 0, y: bob * Math.abs(Math.cos(u * TAU)) },
    }),
    legNear: 1 - lift * near,
    legFar: 1 - lift * far,
    armNear: 1,
    armFar: 1 - 0.1 * Math.abs(s),
  };
}

export const BACK_CLIPS: Record<BackClipName, (u: number) => BackFrame> = {
  // A shoulder breath.
  idle: (u) => {
    const b = Math.sin(u * TAU);
    return { pose: pose({ rot: { shoulderNear: 1.5 * b, shoulderFar: -1.5 * b }, root: { x: 0, y: 1.5 * (b + 1) } }), legNear: 1, legFar: 1, armNear: 1, armFar: 1 };
  },
  walk: (u) => stride(u, 0.14, 14, 1.4, 2.5),
  run: (u) => stride(u, 0.24, 26, 2.6, 5),
  // The mallet arm out to his side and up over his head, then through the blow, the shoulders turning with it.
  swing: (u) => {
    const rise = ramp(u, SWING.start, SWING.peak, 0, SWING.top);
    const fall = ramp(u, SWING.peak, SWING.hit, 0, SWING.through - SWING.top);
    const home = ramp(u, SWING.hit, SWING.out, 1, 0);
    const a = (rise + fall) * home;
    return {
      pose: pose({
        rot: { shoulderNear: UP * a * DEG, elbowNear: -12 * smooth(clamp01(u / SWING.peak)) * home },
        lean: ramp(u, SWING.start, SWING.peak, 0, -4) + ramp(u, SWING.peak, SWING.hit, 0, 9) - ramp(u, SWING.hit, SWING.out, 0, 5),
      }),
      legNear: 1,
      legFar: 1,
      // Coming down toward the hall ahead of him the arm is end on.
      armNear: 1 - 0.28 * smooth(clamp01((u - SWING.peak) / (SWING.hit - SWING.peak))) * home,
      armFar: 1,
    };
  },
  // Under a reclined seat: knees bent, seen from behind as shorter legs with the pelvis down that much, his shoulders breathing.
  crouch: (u) => {
    const b = Math.sin(u * TAU);
    return { pose: pose({ rot: { shoulderNear: UP * 8 + 1.5 * b, shoulderFar: 8 - 1.5 * b, elbowNear: -18, elbowFar: 18 }, root: { x: 0, y: -CROUCH.drop } }), legNear: CROUCH.leg, legFar: CROUCH.leg, armNear: 0.95, armFar: 0.95 };
  },
  // Both legs tucked, the arms out a little.
  jump: (u) => ({ pose: pose({ rot: { shoulderNear: UP * 14, shoulderFar: 14 } }), legNear: 1 - 0.2 * Math.sin(Math.PI * clamp01(u)), legFar: 1 - 0.2 * Math.sin(Math.PI * clamp01(u)), armNear: 1, armFar: 1 }),
};
