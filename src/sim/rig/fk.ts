import { HEAD_PLATE_DEFAULT, HEAD_PLATE_FACING, type HeadPlate, type PartName } from "../../art/registry";
import {
  HANDLE_REST_DEG,
  HERO_HEIGHT,
  JOINTS,
  JOINT_NAMES,
  NECK_REST_Y,
  type JointName,
  type Point,
  type Pose,
} from "./skeleton";

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Where a sprite goes, in world px with y down and the feet point at the
 * origin. `rotation` is in Pixi's convention (clockwise positive), relative to
 * the part's rest direction: hanging straight down for body parts, the handle
 * pointing straight up for the mallet, level for the head. `scaleX` carries the
 * facing sign (positive facing right) and the squash; `length` is the world px
 * the part spans from its pivot (the plate height for the head). The renderer
 * sets sprite scale to `scale * length / plateLength`.
 */
export type Placement = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  z: number;
  length: number;
};

export type Solved = {
  parts: Record<PartName | "head" | "mallet", Placement>;
  joints: Record<JointName, Point>;
  /** Nothing is ever drawn over it. */
  faceBox: Rect;
  crown: Point;
  /** World px per rest unit. */
  scale: number;
  facing: 1 | -1;
};

const DEG = Math.PI / 180;
const HEAD_LEVEL_DEG = 8;

// Far arm, far leg, torso, hips, near leg, near arm, mallet, head.
const PARTS: [PartName | "head" | "mallet", joint: JointName, frame: JointName, z: number][] = [
  ["upperArmFar", "shoulderFar", "shoulderFar", 0],
  ["forearmFar", "elbowFar", "elbowFar", 0],
  ["thighFar", "hipFar", "hipFar", 1],
  ["shinFar", "kneeFar", "kneeFar", 1],
  ["torso", "neck", "chest", 2],
  ["hips", "pelvis", "pelvis", 3],
  ["thighNear", "hipNear", "hipNear", 4],
  ["shinNear", "kneeNear", "kneeNear", 4],
  ["upperArmNear", "shoulderNear", "shoulderNear", 5],
  ["forearmNear", "elbowNear", "elbowNear", 5],
  ["mallet", "grip", "grip", 6],
  ["head", "neck", "head", 7],
];
// The shorts hem below the pelvis, rest units; no joint marks it.
const HIPS_HEM = 24;
// How far each part reaches from its pivot, rest units.
const SPAN: Record<PartName | "head" | "mallet", number> = {
  upperArmFar: JOINTS.elbowFar.length!,
  forearmFar: JOINTS.wristFar.length! + JOINTS.handFar.length!,
  thighFar: JOINTS.kneeFar.length!,
  shinFar: JOINTS.ankleFar.length!,
  torso: NECK_REST_Y - JOINTS.pelvis.rest.y,
  hips: HIPS_HEM,
  thighNear: JOINTS.kneeNear.length!,
  shinNear: JOINTS.ankleNear.length!,
  upperArmNear: JOINTS.elbowNear.length!,
  forearmNear: JOINTS.wristNear.length! + JOINTS.handNear.length!,
  mallet: JOINTS.malletHead.length!,
  head: 0,
};

const rotate = (p: Point, a: number): Point => ({
  x: p.x * Math.cos(a) - p.y * Math.sin(a),
  y: p.x * Math.sin(a) + p.y * Math.cos(a),
});
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Standard 2D forward kinematics over the skeleton, then the head plate placed on the neck. */
export function solve(pose: Pose, facing: 1 | -1, headScale: number, plate: HeadPlate = HEAD_PLATE_DEFAULT): Solved {
  const headPx = headScale * HERO_HEIGHT;
  const scale = (HERO_HEIGHT - headPx) / NECK_REST_Y;
  const rot = (name: JointName) => (pose.rot[name] ?? 0) * DEG;
  const leanMath = -pose.lean * DEG;

  const pos = {} as Record<JointName, Point>;
  const frame = {} as Record<JointName, number>;
  pos.root = { x: pose.root.x, y: pose.root.y };
  frame.root = 0;
  for (const name of JOINT_NAMES) {
    const j = JOINTS[name];
    if (!j.parent) continue;
    // The lean turns the torso at the pelvis; the legs keep their own frame.
    const link = frame[j.parent] + (name === "chest" ? leanMath : 0);
    const off = { x: j.rest.x - JOINTS[j.parent].rest.x, y: j.rest.y - JOINTS[j.parent].rest.y };
    const d = rotate(off, link);
    pos[name] = { x: pos[j.parent].x + d.x, y: pos[j.parent].y + d.y };
    frame[name] = link + rot(name);
  }
  // The head counter-rotates so it never tilts more than 8 degrees from level.
  frame.head = clamp(frame.neck - pose.headTilt * DEG, -HEAD_LEVEL_DEG * DEG, HEAD_LEVEL_DEG * DEG);

  const sx = pose.squash.x;
  const sy = pose.squash.y;
  const joints = {} as Record<JointName, Point>;
  for (const name of JOINT_NAMES) joints[name] = { x: pos[name].x * scale * facing * sx, y: -pos[name].y * scale * sy };
  // A counter-clockwise turn facing right reads clockwise on a y-down screen only when mirrored.
  const screenRot = (a: number) => -a * facing;

  const parts = {} as Record<PartName | "head" | "mallet", Placement>;
  for (const [part, joint, frameJoint, z] of PARTS) {
    const extra = part === "mallet" ? (HANDLE_REST_DEG - 90) * DEG : 0;
    parts[part] = {
      x: joints[joint].x,
      y: joints[joint].y,
      rotation: screenRot(frame[frameJoint] + extra),
      scaleX: facing * sx,
      scaleY: sy,
      z,
      length: part === "head" ? headPx : SPAN[part] * scale,
    };
  }

  // The plate's neck anchor sits on the neck joint; the plate is drawn facing HEAD_PLATE_FACING.
  const s = headPx / plate.height;
  const flip = facing * HEAD_PLATE_FACING;
  const headRot = parts.head.rotation;
  const place = (px: number, py: number): Point => {
    const local = { x: (px - plate.neck.x) * s * flip * sx, y: (py - plate.neck.y) * s * sy };
    const r = rotate(local, headRot);
    return { x: joints.neck.x + r.x, y: joints.neck.y + r.y };
  };
  const f = plate.face;
  const corners = [place(f.x, f.y), place(f.x + f.w, f.y), place(f.x, f.y + f.h), place(f.x + f.w, f.y + f.h)];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const faceBox = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };

  return { parts, joints, faceBox, crown: place(plate.crown.x, plate.crown.y), scale, facing };
}
