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

/**
 * The belly-flop on the floor (owner, 2026-10-18): the dive taken all the way down. `tip`, the degrees he goes over from
 * standing to flat on his belly; `arch`, the degrees his back arches up off the floor. His neck comes up to upright on it,
 * so his head stands clear of his shoulders (with it in line, his near shoulder comes inside the face box's margin past
 * about 44 degrees, as at the table). `inAt`, the share of the clip he takes to go over and land; the rest he slides.
 */
export const FLOP = { tip: 90, arch: 15, inAt: 0.45 } as const;

/** The lift that holds his head level for a body turned `spin` with its neck `neck` degrees off the body's line. */
const levelLift = (spin: number, neck: number) => -spin - Math.max(-8, Math.min(8, neck));

/**
 * The flop at `u` (0 going in from the run, 1 flat out): he throws himself forward, arms out, and lands flat on his
 * belly; on the floor his legs trail with the feet kicked up, both arms reach down to the floor ahead with the mallet
 * lying out in front of his fist, and his head is up and level. Every rotation is tuned on the `flop` board; the rig
 * checks hold the face, the head and the floor.
 */
export function flopPose(u: number): Pose {
  const k = smooth(Math.min(1, Math.max(0, u / FLOP.inAt)));
  const spin = -FLOP.tip * k;
  const lean = -FLOP.arch * k;
  // The neck comes up as far as he goes over, less the arch: upright on his flat back.
  const neck = (FLOP.tip - FLOP.arch) * k;
  // Landing on his belly: a squash that springs back over the slide.
  const land = u < FLOP.inAt ? 0 : Math.max(0, 1 - (u - FLOP.inAt) / (1 - FLOP.inAt));
  return pose({
    spin,
    lean,
    lift: levelLift(spin, neck - lean),
    squash: { x: 1 + 0.04 * land * k, y: 1 - 0.06 * land * k },
    rot: {
      neck,
      shoulderNear: HOLD.shoulderNear + (88 - HOLD.shoulderNear) * k,
      elbowNear: HOLD.elbowNear + (27 - HOLD.elbowNear) * k,
      wristNear: HOLD.wristNear + (-36 - HOLD.wristNear) * k,
      shoulderFar: FREE + (84 - FREE) * k,
      elbowFar: 38 * k,
      wristFar: -4 * k,
      hipNear: 12 * k,
      kneeNear: -48 * k,
      ankleNear: -30 * k,
      hipFar: 8 * k,
      kneeFar: -62 * k,
      ankleFar: -30 * k,
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
