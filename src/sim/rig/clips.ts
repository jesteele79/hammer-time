import { HANDLE_REST_DEG, type JointName } from "./skeleton";
import { pose, out, smooth, type Pose } from "./pose";

export type ClipName = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "crouch" | "slide";
export type ClipCtx = { t: number; speed: number; vy: number; facing: 1 | -1 };
export type Clip = (u: number, ctx: ClipCtx) => Pose;

const TAU = Math.PI * 2;
const bump = (u: number, c: number, w = 0.07) => Math.exp(-(((u - c) / w) ** 2));

/**
 * Where the handle points while carried, world degrees: the near hand stays low
 * where the painting has it, and the handle runs up across the chest so the
 * mallet's head rides behind the shoulder.
 */
export const CARRY_DEG = 130;

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

/** Turns each ankle back by part of its leg's swing so a planted shoe stays nearly flat. */
function feet(rot: Partial<Record<JointName, number>>, keep = 0.75) {
  rot.ankleNear = (rot.ankleNear ?? 0) - keep * ((rot.hipNear ?? 0) + (rot.kneeNear ?? 0));
  rot.ankleFar = (rot.ankleFar ?? 0) - keep * ((rot.hipFar ?? 0) + (rot.kneeFar ?? 0));
  return rot;
}

// Every clip turns joints away from the painted stance (arms hanging forward,
// elbows soft, the far leg a step ahead). Idle is the painting, breathing.
const idle: Clip = (u) => {
  const breath = Math.sin(TAU * u);
  return pose({
    rot: carry({ shoulderNear: -1.5 * breath, shoulderFar: 1.5 * breath, chest: 1.2 * breath }, 0.8 * breath),
    lean: 0.8 * breath,
    headTilt: 0.6 * breath,
    squash: { x: 1, y: 1 + 0.008 * breath },
  });
};

// The mallet arm barely swings; the free arm counters the near leg. Grounding sets the height.
const walk: Clip = (u) => {
  const phi = TAU * u;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const lean = 3;
  return pose({
    rot: carry(
      feet({
        hipNear: 20 * s,
        kneeNear: -34 * Math.max(0, c),
        hipFar: -20 * s,
        kneeFar: -34 * Math.max(0, -c),
        shoulderNear: -3 * s,
        shoulderFar: -8 + 13 * s,
        elbowFar: 4 + 10 * Math.max(0, s),
      }),
      lean,
    ),
    lean,
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
      feet(
        {
          hipNear: 32 * s,
          kneeNear: -8 - 56 * Math.max(0, c),
          hipFar: -32 * s,
          kneeFar: -8 - 56 * Math.max(0, -c),
          shoulderNear: -6 * s,
          elbowNear: 6,
          shoulderFar: -14 + 18 * s,
          elbowFar: 14 + 18 * Math.max(0, s),
        },
        0.6,
      ),
      lean,
    ),
    lean,
    root: { x: 0, y: 14 * flight },
  });
};

const jump: Clip = (u) => {
  const k = 1 - smooth(u);
  return pose({
    rot: carry({
      shoulderNear: -8,
      shoulderFar: -28,
      elbowFar: 18,
      hipNear: 22,
      kneeNear: -32,
      hipFar: 12,
      kneeFar: -38,
      ankleNear: 14,
      ankleFar: 14,
    }, 0),
    squash: { x: 1 - 0.05 * k, y: 1 + 0.06 * k },
  });
};

const fall: Clip = () => {
  const lean = -4;
  return pose({
    rot: carry(
      {
        shoulderNear: -4,
        shoulderFar: 6,
        elbowFar: 16,
        hipNear: 10,
        kneeNear: -16,
        hipFar: -8,
        kneeFar: -12,
        ankleNear: 10,
        ankleFar: 8,
      },
      lean,
    ),
    lean,
  });
};

const land: Clip = (u) => {
  const k = 1 - out(u);
  return pose({
    rot: carry(feet({ hipNear: 18 * k, kneeNear: -30 * k, hipFar: 18 * k, kneeFar: -30 * k }, 1), 0),
    squash: { x: 1 + 0.08 * k, y: 1 - 0.08 * k },
  });
};

// A deep squat with the shoes flat; grounding brings the soles to the floor.
const crouch: Clip = () => {
  const lean = 16;
  return pose({
    rot: carry(
      feet({ hipNear: 70, kneeNear: -112, hipFar: 66, kneeFar: -108, chest: -6, shoulderNear: 4, shoulderFar: 4, elbowFar: 14 }, 1),
      lean,
    ),
    lean,
    root: { x: 0, y: -60 },
    headTilt: 4,
  });
};

// Feet first, torso reclined; the mallet trails behind, so a blend from the carry
// swings it round the back and never over the face.
const slide: Clip = () => {
  const lean = -40;
  return pose({
    rot: carry(
      {
        hipNear: 78,
        kneeNear: -6,
        hipFar: 82,
        kneeFar: -10,
        ankleNear: -18,
        ankleFar: -18,
        shoulderNear: -15,
        elbowNear: 8,
        shoulderFar: -45,
        elbowFar: -6,
      },
      lean,
      200,
    ),
    lean,
    root: { x: 0, y: -115 },
  });
};

export const CLIPS: Record<ClipName, Clip> = { idle, walk, run, jump, fall, land, crouch, slide };
export { blend } from "./pose";
