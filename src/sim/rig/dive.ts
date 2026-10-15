import { FREE, HOLD } from "./clips";
import { pose, smooth, type Pose } from "./pose";

/**
 * The banquet's belly-flop (R4 §10): `tip`, the degrees his body tips forward over the cloth at full stretch (past about
 * 44 his near shoulder comes into the face box's margin, with his head held level); `tipBy`, the px the hand is out when
 * the body has tipped all the way.
 */
export const DIVE = { tip: 40, tipBy: 160 } as const;

/** How far the body has tipped for a hand `ext` px out: all the way by `tipBy`. */
export const diveK = (ext: number) => Math.min(1, Math.max(0, ext / DIVE.tipBy));

/**
 * The dive at `k` (0 standing, 1 at full stretch): the body tips forward about the pelvis, the head lifted back by as much
 * so the face stays level; the far hand reaches down to the cloth under his chin; the near arm (the mallet's, for Hammer)
 * sweeps back along his side; the legs trail. The line's angle is not in the pose: the scene slides him along it. Every
 * rotation is tuned on the `banquet-dive` board; the rig checks hold the face and the head.
 */
export function divePose(k: number, mallet = true): Pose {
  const s = smooth(Math.min(1, Math.max(0, k)));
  const spin = -DIVE.tip * s;
  const near = mallet ? HOLD : { shoulderNear: FREE, elbowNear: 0, wristNear: 0 };
  return pose({
    spin,
    lift: -spin,
    rot: {
      shoulderFar: FREE + (70 - FREE) * s,
      elbowFar: -10 * s,
      shoulderNear: near.shoulderNear + (-130 - near.shoulderNear) * s,
      elbowNear: near.elbowNear * (1 - s),
      wristNear: near.wristNear * (1 - s),
      hipNear: -20 * s,
      hipFar: -10 * s,
      kneeNear: -20 * s,
      kneeFar: -10 * s,
    },
  });
}

/** The charge (c 0 to 1): he rears back on bent knees, the far arm drawn back, ready to spring. */
export function coilPose(c: number): Pose {
  const k = smooth(Math.min(1, Math.max(0, c)));
  return pose({
    lean: -12 * k,
    squash: { x: 1 + 0.04 * k, y: 1 - 0.06 * k },
    rot: {
      ...HOLD,
      // The mallet arm turns against the rear-back, as in the snot rocket, so the mallet's head keeps clear of his face.
      shoulderNear: HOLD.shoulderNear - 18 * k,
      shoulderFar: FREE - 25 * k,
      hipNear: 22 * k,
      hipFar: 22 * k,
      kneeNear: -38 * k,
      kneeFar: -38 * k,
    },
  });
}
