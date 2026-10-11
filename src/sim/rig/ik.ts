import { JOINTS, type JointName, type Point } from "./skeleton";

const DEG = 180 / Math.PI;
const ang = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x) * DEG;
const norm = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
type Chain = "near" | "far" | "legNear" | "legFar";
const CHAINS: Record<Chain, [JointName, JointName, JointName, JointName]> = {
  near: ["shoulderNear", "elbowNear", "wristNear", "knuckleNear"],
  far: ["shoulderFar", "elbowFar", "wristFar", "handFar"],
  legNear: ["hipNear", "kneeNear", "ankleNear", "toeNear"],
  legFar: ["hipFar", "kneeFar", "ankleFar", "toeFar"],
};

/**
 * Rotations (degrees, the chain root's parent frame, facing right) for the three joints of a
 * two-bone chain that put its third joint on `target` (rest units) and turn its last segment to
 * `endDeg`. The bend sits on the counter-clockwise side of the root-to-target line for `bend` 1,
 * clockwise for −1. A target out of reach is pulled in along that line.
 */
function chainTo(chain: Chain, target: Point, endDeg: number, bend: 1 | -1): [number, number, number] {
  const [s, e, w, k] = CHAINS[chain];
  const S = JOINTS[s].rest;
  const E0 = JOINTS[e].rest;
  const W0 = JOINTS[w].rest;
  const K0 = JOINTS[k].rest;
  const a = Math.hypot(E0.x - S.x, E0.y - S.y);
  const b = Math.hypot(W0.x - E0.x, W0.y - E0.y);
  const reach = Math.hypot(target.x - S.x, target.y - S.y);
  const d = Math.min(a + b - 1e-6, Math.max(Math.abs(a - b) + 1e-6, reach));
  const base = Math.atan2(target.y - S.y, target.x - S.x);
  const off = Math.acos((a * a + d * d - b * b) / (2 * a * d));
  const upperRad = base + bend * off;
  const E = { x: S.x + a * Math.cos(upperRad), y: S.y + a * Math.sin(upperRad) };
  const T = { x: S.x + d * Math.cos(base), y: S.y + d * Math.sin(base) };
  const first = norm(upperRad * DEG - ang(S, E0));
  const second = norm(ang(E, T) - ang(E0, W0) - first);
  const third = norm(endDeg - ang(W0, K0) - first - second);
  return [first, second, third];
}

/**
 * Shoulder, elbow and wrist rotations (degrees, the chest's frame, facing right) that put the
 * wrist on `target` (rest units) and turn the hand to `handDeg`. The elbow sits on the
 * counter-clockwise side of the shoulder-to-wrist line for `bend` 1, clockwise for −1.
 */
export function armTo(arm: "near" | "far", target: Point, handDeg: number, bend: 1 | -1) {
  const [shoulder, elbow, wrist] = chainTo(arm, target, handDeg, bend);
  return { shoulder, elbow, wrist };
}

/** The leg's rotations for an ankle target with the root at the origin (the legs take no lean). A knee bends forward with `bend` 1. */
export function legTo(leg: "near" | "far", target: Point, footDeg: number, bend: 1 | -1) {
  const [hip, knee, ankle] = chainTo(leg === "near" ? "legNear" : "legFar", target, footDeg, bend);
  return { hip, knee, ankle };
}
