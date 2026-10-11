import type { JointName } from "./skeleton";
import { pose, out, type Pose } from "./pose";

export type ClipName = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "crouch" | "slide";
export type ClipCtx = { t: number; speed: number; vy: number; facing: 1 | -1 };
export type Clip = (u: number, ctx: ClipCtx) => Pose;

const TAU = Math.PI * 2;
const bump = (u: number, c: number, w = 0.07) => Math.exp(-(((u - c) / w) ** 2));

/**
 * The near arm holding the mallet out in front, ready to swing: the elbow at
 * his side, the forearm level, the wrist straight, the fist closed round the
 * handle so the mallet stands up at 70 degrees with its head ahead of his face.
 * The arm rides with the chest, so the hold leans when he leans.
 */
export const HOLD = { shoulderNear: -3.31, elbowNear: 54.37, wristNear: 1.39 };
/** The free arm swung back from the painting's forward reach to hang at his side, hidden behind him. */
export const FREE = -34;

/** Turns each ankle back by part of its leg's swing so a planted shoe stays nearly flat. */
function feet(rot: Partial<Record<JointName, number>>, keep = 0.75) {
  rot.ankleNear = (rot.ankleNear ?? 0) - keep * ((rot.hipNear ?? 0) + (rot.kneeNear ?? 0));
  rot.ankleFar = (rot.ankleFar ?? 0) - keep * ((rot.hipFar ?? 0) + (rot.kneeFar ?? 0));
  return rot;
}

// Every clip turns joints away from the painted stance (arms hanging forward,
// elbows soft, the far leg a step ahead) and holds the mallet the same way.
const idle: Clip = (u) => {
  const breath = Math.sin(TAU * u);
  return pose({
    rot: { ...HOLD, shoulderFar: FREE + 1.5 * breath, chest: 1.2 * breath },
    lean: 0.8 * breath,
    headTilt: 0.6 * breath,
  });
};

// The free arm counters the near leg. Grounding sets the height.
const walk: Clip = (u) => {
  const phi = TAU * u;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  return pose({
    rot: feet({
      ...HOLD,
      hipNear: 20 * s,
      kneeNear: -34 * Math.max(0, c),
      hipFar: -20 * s,
      kneeFar: -34 * Math.max(0, -c),
      shoulderFar: FREE + 13 * s,
      elbowFar: 4 + 10 * Math.max(0, s),
    }),
    lean: 3,
  });
};

const run: Clip = (u) => {
  const phi = TAU * u;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const flight = bump(u, 0.2) + bump(u, 0.7);
  return pose({
    rot: feet(
      {
        ...HOLD,
        hipNear: 32 * s,
        kneeNear: -8 - 56 * Math.max(0, c),
        hipFar: -32 * s,
        kneeFar: -8 - 56 * Math.max(0, -c),
        shoulderFar: FREE + 18 * s,
        elbowFar: 14 + 18 * Math.max(0, s),
      },
      0.6,
    ),
    lean: 9,
    root: { x: 0, y: 14 * flight },
  });
};

const jump: Clip = () =>
  pose({
    rot: {
      ...HOLD,
      shoulderFar: FREE - 8,
      elbowFar: 18,
      hipNear: 22,
      kneeNear: -32,
      hipFar: 12,
      kneeFar: -38,
      ankleNear: 14,
      ankleFar: 14,
    },
  });

const fall: Clip = () =>
  pose({
    rot: {
      ...HOLD,
      shoulderFar: FREE + 20,
      elbowFar: 16,
      hipNear: 10,
      kneeNear: -16,
      hipFar: -8,
      kneeFar: -12,
      ankleNear: 10,
      ankleFar: 8,
    },
    lean: -4,
  });

const land: Clip = (u) => {
  const k = 1 - out(u);
  return pose({
    rot: feet({ ...HOLD, shoulderFar: FREE, hipNear: 18 * k, kneeNear: -30 * k, hipFar: 18 * k, kneeFar: -30 * k }, 1),
  });
};

// A deep squat with the shoes flat; grounding brings the soles to the floor.
const crouch: Clip = () =>
  pose({
    rot: feet({ ...HOLD, hipNear: 70, kneeNear: -112, hipFar: 66, kneeFar: -108, chest: -6, shoulderFar: FREE + 18, elbowFar: 14 }, 1),
    lean: 16,
    root: { x: 0, y: -60 },
    headTilt: 4,
  });

// Feet first, torso reclined; the near arm reaches down past the hip and the mallet
// points ahead over his legs (28 degrees up), so a blend from the hold swings it down
// in front of him, away from the face.
const slide: Clip = () =>
  pose({
    rot: {
      hipNear: 78,
      kneeNear: -6,
      hipFar: 82,
      kneeFar: -10,
      ankleNear: -18,
      ankleFar: -18,
      shoulderNear: 8.69,
      elbowNear: -19.63,
      wristNear: -18.61,
      shoulderFar: -45,
      elbowFar: -6,
    },
    lean: -40,
    root: { x: 0, y: -115 },
  });

export const CLIPS: Record<ClipName, Clip> = { idle, walk, run, jump, fall, land, crouch, slide };
export { blend } from "./pose";
