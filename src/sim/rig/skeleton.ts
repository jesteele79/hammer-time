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

// Parents before children: the solver walks this order. Heights follow the owner's
// painted body (art/cuts/hammer-body.json at 296 units per collar-to-sole span):
// shoulder 270, elbow 204, wrist 157, fingertips 115, pelvis 155, hip 149, knee 92, sole 0.
const TABLE: Record<JointName, { parent: JointName | null; rest: Point }> = {
  root: { parent: null, rest: { x: 0, y: 0 } },
  pelvis: { parent: "root", rest: { x: 0, y: 155 } },
  chest: { parent: "pelvis", rest: { x: 0, y: 245 } },
  neck: { parent: "chest", rest: { x: 6, y: 296 } },
  head: { parent: "neck", rest: { x: 6, y: 296 } },
  shoulderNear: { parent: "chest", rest: { x: 10, y: 270 } },
  elbowNear: { parent: "shoulderNear", rest: { x: 10, y: 204 } },
  wristNear: { parent: "elbowNear", rest: { x: 10, y: 157 } },
  handNear: { parent: "wristNear", rest: { x: 10, y: 115 } },
  shoulderFar: { parent: "chest", rest: { x: -14, y: 268 } },
  elbowFar: { parent: "shoulderFar", rest: { x: -14, y: 202 } },
  wristFar: { parent: "elbowFar", rest: { x: -14, y: 155 } },
  handFar: { parent: "wristFar", rest: { x: -14, y: 113 } },
  hipNear: { parent: "pelvis", rest: { x: 10, y: 149 } },
  kneeNear: { parent: "hipNear", rest: { x: 12, y: 92 } },
  // The ankle is the sole's center, 13 units ahead of the knee as the painted shoe sits.
  ankleNear: { parent: "kneeNear", rest: { x: 25, y: 0 } },
  toeNear: { parent: "ankleNear", rest: { x: 61, y: 0 } },
  hipFar: { parent: "pelvis", rest: { x: -10, y: 149 } },
  kneeFar: { parent: "hipFar", rest: { x: -8, y: 92 } },
  ankleFar: { parent: "kneeFar", rest: { x: 5, y: 0 } },
  toeFar: { parent: "ankleFar", rest: { x: 41, y: 0 } },
  grip: { parent: "wristNear", rest: { x: 10, y: 143 } },
  malletHead: { parent: "grip", rest: handleEnd({ x: 10, y: 143 }) },
};

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
