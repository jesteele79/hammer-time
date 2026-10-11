import { HEAD_PLATE_DEFAULT, HEAD_PLATE_FACING, type HeadPlate } from "../../art/registry";
import {
  HANDLE_REST_DEG,
  HEAD_SEAT,
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
 * the part's rest direction: the handle pointing straight up for the mallet,
 * level for the head (the body is skinned from `links`). `scaleX` carries the
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
  parts: Record<"head" | "mallet", Placement>;
  joints: Record<JointName, Point>;
  /**
   * The turn each joint's offset from its parent took from rest, radians
   * counter-clockwise facing right: what a bone ending at that joint turned by.
   */
  links: Record<JointName, number>;
  /** Nothing is ever drawn over it. */
  faceBox: Rect;
  /** The whole head plate's bounds, world px from the feet point. */
  headBox: Rect;
  crown: Point;
  /** The nose tip, world px from the feet point. */
  nose: Point;
  /** World px per rest unit. */
  scale: number;
  facing: 1 | -1;
  squash: { x: number; y: number };
};

const DEG = Math.PI / 180;
const HEAD_LEVEL_DEG = 8;

// The props on the skinned body. The mallet sits between the torso (3) and the near arm (4),
// so its handle runs behind the hand that holds it; the head plate is drawn last.
const PARTS: ["head" | "mallet", joint: JointName, frame: JointName, z: number][] = [
  ["mallet", "grip", "grip", 3.5],
  ["head", "neck", "head", 7],
];

const rotate = (p: Point, a: number): Point => ({
  x: p.x * Math.cos(a) - p.y * Math.sin(a),
  y: p.x * Math.sin(a) + p.y * Math.cos(a),
});
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Standard 2D forward kinematics over the skeleton, then the head plate placed on the neck. */
export function solve(pose: Pose, facing: 1 | -1, headScale: number, plate: HeadPlate = HEAD_PLATE_DEFAULT): Solved {
  const headPx = headScale * HERO_HEIGHT;
  // The plate stands from its neck anchor to its crown; the body is scaled so that, seated, the crown is HERO_HEIGHT up.
  const above = (headPx * (plate.neck.y - plate.crown.y)) / plate.height;
  const scale = (HERO_HEIGHT - above) / (NECK_REST_Y + HEAD_SEAT.y);
  const rot = (name: JointName) => (pose.rot[name] ?? 0) * DEG;
  const leanMath = -pose.lean * DEG;

  const pos = {} as Record<JointName, Point>;
  const frame = {} as Record<JointName, number>;
  const links = { root: 0 } as Record<JointName, number>;
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
    links[name] = link;
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

  // The head's seat turns with the neck.
  const seatOff = rotate(HEAD_SEAT, frame.neck);
  const seat = {
    x: (pos.neck.x + seatOff.x) * scale * facing * sx,
    y: -(pos.neck.y + seatOff.y) * scale * sy,
  };

  const parts = {} as Record<"head" | "mallet", Placement>;
  for (const [part, joint, frameJoint, z] of PARTS) {
    const extra = part === "mallet" ? (HANDLE_REST_DEG - 90) * DEG : 0;
    const at = part === "head" ? seat : joints[joint];
    parts[part] = {
      x: at.x,
      y: at.y,
      rotation: screenRot(frame[frameJoint] + extra),
      scaleX: facing * sx,
      scaleY: sy,
      z,
      length: part === "head" ? headPx : JOINTS.malletHead.length! * scale,
    };
  }

  // The plate's neck anchor sits on the seat; the plate is drawn facing HEAD_PLATE_FACING.
  const s = headPx / plate.height;
  const flip = facing * HEAD_PLATE_FACING;
  const headRot = parts.head.rotation;
  const place = (px: number, py: number): Point => {
    const local = { x: (px - plate.neck.x) * s * flip * sx, y: (py - plate.neck.y) * s * sy };
    const r = rotate(local, headRot);
    return { x: seat.x + r.x, y: seat.y + r.y };
  };
  const bounds = (x: number, y: number, w: number, h: number): Rect => {
    const corners = [place(x, y), place(x + w, y), place(x, y + h), place(x + w, y + h)];
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const f = plate.face;
  const faceBox = bounds(f.x, f.y, f.w, f.h);
  const headBox = bounds(0, 0, plate.width, plate.height);

  return {
    parts,
    joints,
    links,
    faceBox,
    headBox,
    crown: place(plate.crown.x, plate.crown.y),
    nose: place(plate.nose.x, plate.nose.y),
    scale,
    facing,
    squash: { x: sx, y: sy },
  };
}
