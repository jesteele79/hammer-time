import { HANDLE_REST_DEG, type JointName } from "./skeleton";
import { pose, out, smooth, type Pose } from "./pose";

export type ClipName = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "crouch" | "slide";
export type ClipCtx = { t: number; speed: number; vy: number; facing: 1 | -1 };
export type Clip = (u: number, ctx: ClipCtx) => Pose;

const TAU = Math.PI * 2;
const bump = (u: number, c: number, w = 0.07) => Math.exp(-(((u - c) / w) ** 2));

/** Where the handle points while carried: up and back over the near shoulder, world degrees. */
export const CARRY_DEG = 140;

/** The near hand keeps the handle at a fixed world angle whatever the arm does. */
function carry(rot: Partial<Record<JointName, number>>, lean: number, worldDeg = CARRY_DEG) {
  const chain =
    -lean +
    (rot.pelvis ?? 0) +
    (rot.chest ?? 0) +
    (rot.shoulderNear ?? 0) +
    (rot.elbowNear ?? 0) +
    (rot.wristNear ?? 0);
  rot.grip = worldDeg - HANDLE_REST_DEG - chain;
  return rot;
}

const idle: Clip = (u) =>
  pose({
    rot: carry({ shoulderNear: -8, elbowNear: 95, shoulderFar: 4, elbowFar: 6 }, 0),
    squash: { x: 1, y: 1 + 0.008 * Math.sin(TAU * u) },
  });

// The mallet arm barely swings: the handle rests on the shoulder. The free arm counters the legs.
const walk: Clip = (u) => {
  const phi = TAU * u;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const lean = 3;
  return pose({
    rot: carry(
      {
        hipNear: 22 * s,
        kneeNear: -38 * Math.max(0, c),
        hipFar: -22 * s,
        kneeFar: -38 * Math.max(0, -c),
        shoulderNear: -8 - 5 * s,
        elbowNear: 95,
        shoulderFar: 4 + 14 * s,
        elbowFar: 6 + 8 * Math.max(0, s),
      },
      lean,
    ),
    lean,
    root: { x: 0, y: -3 + 3 * Math.cos(2 * phi) },
  });
};

const run: Clip = (u) => {
  const phi = TAU * u;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const lean = 9;
  const flight = bump(u, 0.2) + bump(u, 0.7);
  return pose({
    rot: carry(
      {
        hipNear: 34 * s,
        kneeNear: -62 * Math.max(0, c),
        hipFar: -34 * s,
        kneeFar: -62 * Math.max(0, -c),
        shoulderNear: -8 - 6 * s,
        elbowNear: 100,
        shoulderFar: 4 + 26 * s,
        elbowFar: 40 + 20 * Math.max(0, s),
      },
      lean,
    ),
    lean,
    root: { x: 0, y: -5 + 5 * Math.cos(2 * phi) + 14 * flight },
  });
};

const jump: Clip = (u) => {
  const k = 1 - smooth(u);
  return pose({
    rot: carry(
      {
        shoulderNear: -30,
        elbowNear: 80,
        shoulderFar: -35,
        elbowFar: 20,
        hipNear: 25,
        kneeNear: -30,
        hipFar: 15,
        kneeFar: -35,
      },
      0,
    ),
    squash: { x: 1 - 0.05 * k, y: 1 + 0.06 * k },
  });
};

const fall: Clip = () => {
  const lean = -4;
  return pose({
    rot: carry(
      {
        shoulderNear: -5,
        elbowNear: 75,
        shoulderFar: 25,
        elbowFar: 15,
        hipNear: 12,
        kneeNear: -20,
        hipFar: -12,
        kneeFar: -10,
      },
      lean,
    ),
    lean,
  });
};

const land: Clip = (u) => {
  const k = 1 - out(u);
  return pose({
    rot: carry(
      {
        shoulderNear: -8,
        elbowNear: 95,
        shoulderFar: 4,
        elbowFar: 6,
        hipNear: 20 * k,
        kneeNear: -25 * k,
        hipFar: 20 * k,
        kneeFar: -25 * k,
      },
      0,
    ),
    squash: { x: 1 + 0.08 * k, y: 1 - 0.08 * k },
  });
};

// Hips 75 and knees −120 put the ankles back on the floor with the root 69 down.
const crouch: Clip = () =>
  pose({
    rot: carry(
      {
        hipNear: 75,
        kneeNear: -120,
        hipFar: 70,
        kneeFar: -115,
        chest: -20,
        shoulderNear: -10,
        elbowNear: 100,
        shoulderFar: 10,
        elbowFar: 30,
      },
      0,
    ),
    root: { x: 0, y: -69 },
    headTilt: 4,
  });

// Feet first, torso reclined, the near heel riding the floor; the mallet points ahead like a lance.
const slide: Clip = () => {
  const lean = -40;
  return pose({
    rot: carry(
      {
        hipNear: 80,
        kneeNear: -5,
        hipFar: 85,
        kneeFar: -10,
        shoulderNear: 20,
        elbowNear: 10,
        shoulderFar: -50,
        elbowFar: -10,
      },
      lean,
      20,
    ),
    lean,
    root: { x: 0, y: -115 },
  });
};

export const CLIPS: Record<ClipName, Clip> = { idle, walk, run, jump, fall, land, crouch, slide };
export { blend } from "./pose";
