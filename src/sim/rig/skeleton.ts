/**
 * Hammer's paper-doll skeleton (spec §6.2). Rest positions are in rest units,
 * y up from the soles, facing right; `solve` scales them so the crown lands at
 * HERO_HEIGHT whatever head scale the owner picks.
 */
export type Point = { x: number; y: number };

/** Soles to crown, world px. */
export const HERO_HEIGHT = 340;

export type JointName =
  | "root"
  | "pelvis"
  | "chest"
  | "neck"
  | "head"
  | "shoulderNear"
  | "elbowNear"
  | "wristNear"
  | "handNear"
  | "shoulderFar"
  | "elbowFar"
  | "wristFar"
  | "handFar"
  | "hipNear"
  | "kneeNear"
  | "ankleNear"
  | "toeNear"
  | "hipFar"
  | "kneeFar"
  | "ankleFar"
  | "toeFar"
  | "heelNear"
  | "heelFar"
  | "grip"
  | "malletHead";

export type Joint = { parent: JointName | null; rest: Point; length?: number };

const HANDLE = 150;
/** The handle's rest direction from the grip, degrees counter-clockwise from forward: up and back over the shoulder. */
export const HANDLE_REST_DEG = 120;
const handleEnd = (grip: Point): Point => ({
  x: grip.x + HANDLE * Math.cos((HANDLE_REST_DEG * Math.PI) / 180),
  y: grip.y + HANDLE * Math.sin((HANDLE_REST_DEG * Math.PI) / 180),
});

// Parents before children: the solver walks this order. The rest pose is the owner's
// painted body, joint for joint (art/cuts/hammer-body.json, 296 units from sole to neck):
// both arms hang forward with soft elbows, and the far leg stands a step ahead and, by
// perspective, 25 units up. Every rotation in a clip is a turn away from this pose.
const TABLE: Record<JointName, { parent: JointName | null; rest: Point }> = {
  root: { parent: null, rest: { x: 0, y: 0 } },
  pelvis: { parent: "root", rest: { x: -1.32, y: 150.11 } },
  chest: { parent: "pelvis", rest: { x: 2.64, y: 234.69 } },
  neck: { parent: "chest", rest: { x: 7.93, y: 296 } },
  head: { parent: "neck", rest: { x: 7.93, y: 296 } },
  shoulderNear: { parent: "chest", rest: { x: -7.93, y: 273.8 } },
  elbowNear: { parent: "shoulderNear", rest: { x: 4.76, y: 210.37 } },
  wristNear: { parent: "elbowNear", rest: { x: 42.81, y: 166.5 } },
  handNear: { parent: "wristNear", rest: { x: 62.9, y: 134.26 } },
  shoulderFar: { parent: "chest", rest: { x: -2.64, y: 266.4 } },
  elbowFar: { parent: "shoulderFar", rest: { x: 38.59, y: 207.99 } },
  wristFar: { parent: "elbowFar", rest: { x: 75.32, y: 164.12 } },
  handFar: { parent: "wristFar", rest: { x: 91.97, y: 145.36 } },
  hipNear: { parent: "pelvis", rest: { x: -14.54, y: 132.94 } },
  kneeNear: { parent: "hipNear", rest: { x: -14.54, y: 89.86 } },
  ankleNear: { parent: "kneeNear", rest: { x: -17.44, y: 31.19 } },
  toeNear: { parent: "ankleNear", rest: { x: 31.71, y: 0 } },
  hipFar: { parent: "pelvis", rest: { x: 17.97, y: 132.94 } },
  kneeFar: { parent: "hipFar", rest: { x: 14.01, y: 90.91 } },
  ankleFar: { parent: "kneeFar", rest: { x: 15.59, y: 47.57 } },
  toeFar: { parent: "ankleFar", rest: { x: 63.43, y: 25.37 } },
  heelNear: { parent: "ankleNear", rest: { x: -35.68, y: 1.06 } },
  heelFar: { parent: "ankleFar", rest: { x: 0.53, y: 24.84 } },
  grip: { parent: "wristNear", rest: { x: 50.74, y: 151.44 } },
  malletHead: { parent: "grip", rest: handleEnd({ x: 50.74, y: 151.44 }) },
};
/** How far above the floor the far sole stands at rest: the painting's perspective. */
export const FAR_FLOOR = 25.37;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Each joint with the length of the segment from its parent. */
export const JOINTS = Object.fromEntries(
  Object.entries(TABLE).map(([name, j]) => [
    name,
    { ...j, length: j.parent ? dist(j.rest, TABLE[j.parent].rest) : undefined },
  ]),
) as Record<JointName, Joint>;

/** Parents before children. */
export const JOINT_NAMES = Object.keys(TABLE) as JointName[];

export const NECK_REST_Y = TABLE.neck.rest.y;

/**
 * Joint rotations in degrees, counter-clockwise when facing right: a hanging
 * limb swings forward for a positive value. `lean` (pelvis) and `headTilt`
 * are positive forward. `root` is in rest units; `squash` scales about the feet.
 */
export type Pose = {
  rot: Partial<Record<JointName, number>>;
  root: Point;
  lean: number;
  squash: { x: number; y: number };
  headTilt: number;
};

export const REST_POSE: Pose = {
  rot: Object.fromEntries(JOINT_NAMES.map((name) => [name, 0])) as Record<JointName, number>,
  root: { x: 0, y: 0 },
  lean: 0,
  squash: { x: 1, y: 1 },
  headTilt: 0,
};
