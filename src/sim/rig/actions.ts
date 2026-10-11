import type { MoveKind } from "../moves";
import { SUPER_CUT, SWING_CUT, WIPE_FLICK, WIPE_SCRUB } from "../moves";
import { FREE, HOLD } from "./clips";
import { armTo } from "./ik";
import { blend, linear, out, pose, smooth, track, type Key, type Pose } from "./pose";
import type { JointName, Point } from "./skeleton";

export { armTo };

export const ACTION_MASK: Record<MoveKind, "upper" | "whole"> = { swing: "upper", super: "whole", snot: "upper", wipe: "whole" };
const CUTS: Partial<Record<MoveKind, readonly [number, number]>> = { swing: SWING_CUT, super: SUPER_CUT };

/** The frame drawn at u. Inside a cut the strike lands at once, so the arc over the head is never drawn. */
export function displayU(kind: MoveKind, u: number): number {
  const c = CUTS[kind];
  return c && u > c[0] && u < c[1] ? c[1] : u;
}

/** The joints an upper-body action owns; the legs, root and squash stay the locomotion clip's. */
export const UPPER_JOINTS: JointName[] = [
  "chest",
  "neck",
  "head",
  "shoulderNear",
  "elbowNear",
  "wristNear",
  "knuckleNear",
  "handNear",
  "shoulderFar",
  "elbowFar",
  "wristFar",
  "handFar",
  "grip",
  "malletHead",
];

/** Lays an action over a locomotion pose at weight w: the whole body, or the upper body and lean. */
export function overlay(base: Pose, action: Pose, mask: "upper" | "whole", w: number): Pose {
  if (mask === "whole") return blend(base, action, w);
  const mixed = blend(base, action, w);
  const result = structuredClone(base);
  for (const j of UPPER_JOINTS) result.rot[j] = mixed.rot[j];
  result.lean = mixed.lean;
  result.headTilt = mixed.headTilt;
  return result;
}

type K = readonly Key[];
const at = (keys: K, u: number) => track(keys, u);

// Swing: a windmill. The arm swings back through the bottom and up behind him (the mallet
// sweeps down in front, back, and trails down his back at the load), the strike over the top
// is the cut, then the follow-through low in front and the return to the hold. Rotation
// tracks run on past ±180 so the windmill turns one way: one full turn of the shoulder (−360).
// The keys are world angles turned into rotations: upper arm U, forearm F, hand H, handle H+68.
const SWING = {
  // U: −82 (hold), −120, −170, 125 (load: the elbow up behind his head), 122, −15 (strike), −70, −72, −82.
  shoulderNear: [[0, HOLD.shoulderNear], [0.12, -41.31], [0.2, -91.31], [0.26, -156.31, out], [SWING_CUT[0], -159.31, linear], [SWING_CUT[1], -296.31, linear], [0.46, -351.31, out], [0.58, -353.31, out], [1, HOLD.shoulderNear - 360]] as K,
  elbowNear: [[0, HOLD.elbowNear], [0.12, -4.63], [0.2, 0.37], [0.26, 45.37, out], [SWING_CUT[0], 50.37, linear], [SWING_CUT[1], -24.63, linear], [0.46, -24.63, out], [0.58, -22.63, out], [1, HOLD.elbowNear]] as K,
  // The handle: 70 (hold), −40 (down in front), −110 (down behind), 223 (hanging down his back), 218, 30 (strike), −30, −32, 70.
  wristNear: [[0, HOLD.wristNear], [0.12, -11.61], [0.2, -36.61], [0.26, -43.61, out], [SWING_CUT[0], -42.61, linear], [SWING_CUT[1], -26.61, linear], [0.46, -31.61, out], [0.58, -33.61, out], [1, HOLD.wristNear]] as K,
  lean: [[0, 0], [0.26, -5, out], [SWING_CUT[0], -6], [SWING_CUT[1], 2, linear], [0.46, 9, out], [0.58, 10], [1, 0]] as K,
  shoulderFar: [[0, FREE], [0.26, FREE + 20, out], [SWING_CUT[1], FREE - 10, linear], [0.58, FREE - 14], [1, FREE]] as K,
};

// Super smash: the hop with the same windmill load, the cut over the top, then the slam:
// folded forward 45 degrees, squatting, the arm long and the mallet head on the floor ahead.
const SUPER = {
  shoulderNear: [[0, HOLD.shoulderNear], [0.14, -91.31], [0.3, -165.31, out], [SUPER_CUT[0], -168.31, linear], [SUPER_CUT[1], -306.31, linear], [0.56, -306.31, out], [0.76, -306.31], [1, HOLD.shoulderNear - 360]] as K,
  elbowNear: [[0, HOLD.elbowNear], [0.14, 0.37], [0.3, 45.37, out], [SUPER_CUT[0], 50.37, linear], [SUPER_CUT[1], -19.63, linear], [0.56, -19.63, out], [0.76, -19.63], [1, HOLD.elbowNear]] as K,
  wristNear: [[0, HOLD.wristNear], [0.14, -36.61], [0.3, -43.61, out], [SUPER_CUT[0], -42.61, linear], [SUPER_CUT[1], -33.61, linear], [0.56, -33.61, out], [0.76, -33.61], [1, HOLD.wristNear]] as K,
  lean: [[0, 0], [0.34, -9, out], [SUPER_CUT[0], -10], [SUPER_CUT[1], 4, linear], [0.56, 45, out], [0.76, 45], [1, 0]] as K,
  hip: [[0, 0], [0.2, 25, out], [SUPER_CUT[1], 10], [0.56, 62, out], [0.76, 62], [1, 0]] as K,
  knee: [[0, 0], [0.2, -40, out], [SUPER_CUT[1], -15], [0.56, -105, out], [0.76, -105], [1, 0]] as K,
  shoulderFar: [[0, FREE], [0.3, FREE + 30, out], [SUPER_CUT[1], FREE - 10, linear], [0.76, FREE - 20], [1, FREE]] as K,
};

// Snot: rear back to load the sinuses, then snap the whole upper body forward. No hand comes up.
const SNOT = {
  lean: [[0, 0], [0.3, -11], [0.42, -12], [0.5, 15, out], [0.62, 11], [1, 0]] as K,
  headTilt: [[0, 0], [0.3, -6], [0.42, -7], [0.5, 8, out], [0.7, 4], [1, 0]] as K,
  chest: [[0, 0], [0.3, -5], [0.5, 6, out], [1, 0]] as K,
  shoulderFar: [[0, FREE], [0.3, FREE - 14], [0.5, FREE + 24, out], [1, FREE]] as K,
  // The mallet arm turns against the rear-back so the mallet stays out in front, and dips a
  // little further on the snap so the mallet head gives way as his face comes forward.
  shoulderNear: [[0, HOLD.shoulderNear], [0.3, HOLD.shoulderNear - 16], [0.42, HOLD.shoulderNear - 19], [0.5, HOLD.shoulderNear - 8, out], [0.62, HOLD.shoulderNear - 6], [1, HOLD.shoulderNear]] as K,
};

/** The far wrist's path for the towel, in the chest's frame (rest units): pocket, scalp strokes, flick, pocket. */
const POCKET: Point = { x: 4, y: 136 };
const SCALP = { x: -18, y: 358, rx: 22, ry: 34 };
const scalp = (deg: number): Point => ({
  x: SCALP.x + Math.cos((deg * Math.PI) / 180) * SCALP.rx,
  y: SCALP.y + Math.sin((deg * Math.PI) / 180) * SCALP.ry,
});
const bez = (a: Point, c: Point, b: Point, t: number): Point => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
export function wipeHand(u: number): Point {
  if (u < WIPE_SCRUB[0]) return bez(POCKET, { x: -70, y: 260 }, scalp(110), out(u / WIPE_SCRUB[0]));
  if (u < WIPE_FLICK[0]) {
    const t = (u - WIPE_SCRUB[0]) / (WIPE_SCRUB[1] - WIPE_SCRUB[0]);
    return scalp(150 - 40 * Math.cos(t * Math.PI * 5));
  }
  const flung = { x: -95, y: 290 };
  if (u < WIPE_FLICK[1]) {
    const t = out((u - WIPE_FLICK[0]) / (WIPE_FLICK[1] - WIPE_FLICK[0]));
    const from = scalp(110);
    return { x: from.x + (flung.x - from.x) * t, y: from.y + (flung.y - from.y) * t };
  }
  return bez(flung, { x: -80, y: 180 }, POCKET, smooth(Math.min(1, (u - WIPE_FLICK[1]) / 0.16)));
}
const WIPE_LEAN = [[0, 0], [0.12, -3], [0.62, -3], [0.7, 3, out], [1, 0]] as K;

export const ACTIONS: Record<MoveKind, (u: number) => Pose> = {
  swing: (u) =>
    pose({
      rot: {
        shoulderNear: at(SWING.shoulderNear, u),
        elbowNear: at(SWING.elbowNear, u),
        wristNear: at(SWING.wristNear, u),
        shoulderFar: at(SWING.shoulderFar, u),
      },
      lean: at(SWING.lean, u),
    }),
  super: (u) => {
    const hip = at(SUPER.hip, u);
    const knee = at(SUPER.knee, u);
    return pose({
      rot: {
        shoulderNear: at(SUPER.shoulderNear, u),
        elbowNear: at(SUPER.elbowNear, u),
        wristNear: at(SUPER.wristNear, u),
        shoulderFar: at(SUPER.shoulderFar, u),
        hipNear: hip,
        kneeNear: knee,
        hipFar: hip * 0.9,
        kneeFar: knee * 0.95,
        ankleNear: -(hip + knee),
        ankleFar: -(hip * 0.9 + knee * 0.95),
      },
      lean: at(SUPER.lean, u),
    });
  },
  snot: (u) =>
    pose({
      rot: { ...HOLD, shoulderNear: at(SNOT.shoulderNear, u), chest: at(SNOT.chest, u), shoulderFar: at(SNOT.shoulderFar, u) },
      lean: at(SNOT.lean, u),
      headTilt: at(SNOT.headTilt, u),
    }),
  wipe: (u) => {
    const lean = at(WIPE_LEAN, u);
    const towelUp = u > 0.04 && u < 0.95;
    const far = towelUp ? armTo("far", wipeHand(u), u < WIPE_FLICK[0] ? 95 : 150, 1) : { shoulder: FREE, elbow: 0, wrist: 0 };
    return pose({
      rot: { ...HOLD, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist },
      lean,
    });
  },
};
