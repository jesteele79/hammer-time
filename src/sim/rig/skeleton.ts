/**
 * Hammer's paper-doll skeleton (spec §6.2). Rest positions are in rest units,
 * y up from the soles, facing right; `solve` scales them so the crown lands at
 * HERO_HEIGHT whatever head scale the owner picks.
 */
export type Point = { x: number; y: number };

/** Soles to crown, world px. */
export const HERO_HEIGHT = 340;
/**
 * Where the head plate's neck anchor sits, from the neck joint (rest units, facing right,
 * y up): down into the collar and a little forward, so the head's own neck runs into the
 * shirt instead of standing on the painting's neck (owner, 2026-10-12: option C).
 */
export const HEAD_SEAT = { x: 8, y: -18 };
/**
 * The seat the body's size is worked out from: where the head sat when the owner approved his
 * build. Sinking the head below it shortens him rather than growing his body to make up for it.
 */
export const BODY_SEAT_Y = -9;

export type JointName =
  | "root"
  | "pelvis"
  | "chest"
  | "neck"
  | "head"
  | "shoulderNear"
  | "elbowNear"
  | "wristNear"
  | "knuckleNear"
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

/** Grip to the middle of the mallet's head. */
const HANDLE = 136;
const WRIST_NEAR: Point = { x: 42.81, y: 166.5 };
const KNUCKLE_NEAR: Point = { x: 51.54, y: 155.93 };
const GRIP: Point = { x: 52.59, y: 154.08 };
/**
 * A closed fist holds the handle at a fixed angle to the hand: the handle runs
 * through the palm from the heel of the hand to the base of the index finger,
 * 68 degrees counter-clockwise from the hand (wrist to knuckles), so the head
 * is on the thumb side and leans the way the hand points.
 */
export const GRIP_DEG = 68;
/** The handle's rest direction from the grip, degrees counter-clockwise from forward. */
export const HANDLE_REST_DEG =
  (Math.atan2(KNUCKLE_NEAR.y - WRIST_NEAR.y, KNUCKLE_NEAR.x - WRIST_NEAR.x) * 180) / Math.PI + GRIP_DEG;
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
  wristNear: { parent: "elbowNear", rest: WRIST_NEAR },
  // The knuckles, where the fingers bend.
  knuckleNear: { parent: "wristNear", rest: KNUCKLE_NEAR },
  handNear: { parent: "knuckleNear", rest: { x: 60.79, y: 134.79 } },
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
  // In the palm just past the knuckles, where the fist closes round the handle.
  grip: { parent: "wristNear", rest: GRIP },
  malletHead: { parent: "grip", rest: handleEnd(GRIP) },
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
  /** The whole body turned about the pelvis, degrees, counter-clockwise facing right: flat on his back is +90. */
  spin: number;
  /** The torso's front-to-back scale: breathing and the belly's follow-through. 1 as painted. */
  torso: number;
};

export const REST_POSE: Pose = {
  rot: Object.fromEntries(JOINT_NAMES.map((name) => [name, 0])) as Record<JointName, number>,
  root: { x: 0, y: 0 },
  lean: 0,
  squash: { x: 1, y: 1 },
  headTilt: 0,
  spin: 0,
  torso: 1,
};

/** A body the solver bends: its joints at rest, and how it stands and wears its head. */
export type Skeleton = {
  joints: Record<JointName, Joint>;
  /**
   * How far each joint's offset from its parent was turned away from its painting, radians
   * counter-clockwise facing right: the skin turns the paint of the bone ending there by as much.
   */
  turns: Partial<Record<JointName, number>>;
  /** How far above the floor the far sole stands at rest: the painting's perspective. */
  farFloor: number;
  /** Where the head's neck anchor sits from the neck joint, rest units. */
  headSeat: Point;
  /** The seat the body's size is worked out from. */
  bodySeatY: number;
};

export const HAMMER: Skeleton = { joints: JOINTS, turns: {}, farFloor: FAR_FLOOR, headSeat: HEAD_SEAT, bodySeatY: BODY_SEAT_Y };

/**
 * The bones a painted cast body takes Hammer's rest directions for. Each painting reaches its arms
 * a little differently, and every clip and every reach for a rail, a tray or a phone was posed on
 * his; turned to his stance, they land where they land on him.
 */
export const ARM_BONES: readonly (readonly [JointName, JointName])[] = [
  ["shoulderNear", "elbowNear"],
  ["elbowNear", "wristNear"],
  ["wristNear", "knuckleNear"],
  ["knuckleNear", "handNear"],
  ["shoulderFar", "elbowFar"],
  ["elbowFar", "wristFar"],
  ["wristFar", "handFar"],
];

/** A painting's marks: joints in its keyed crop's pixels (facing left, y down), its sole's row and its feet point's x. */
export type PaintedJoints = { joints: Partial<Record<string, readonly [number, number]>>; sole: number; rootX: number };

const turnBy = (p: Point, a: number): Point => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * A skeleton from a painting, in rest units with its neck at NECK_REST_Y: every joint where it is
 * painted, except that a `match` bone takes Hammer's rest direction at its own painted length and
 * what hangs below it turns with it. A joint the painting has no mark for keeps Hammer's offset
 * from its parent. The head turns on the painted neck joint itself: a painting's head is its own,
 * already in its collar.
 */
export function skeletonFrom(p: PaintedJoints, match: readonly (readonly [JointName, JointName])[] = ARM_BONES): Skeleton {
  const neck = p.joints.neck;
  if (!neck) throw new Error("skeletonFrom: the painting has no neck joint");
  const k = NECK_REST_Y / (p.sole - neck[1]);
  const mark = (n: JointName): Point | null => {
    const q = p.joints[n];
    return q ? { x: (p.rootX - q[0]) * k, y: (p.sole - q[1]) * k } : null;
  };
  const rest = { root: { x: 0, y: 0 } } as Record<JointName, Point>;
  const turns: Partial<Record<JointName, number>> = { root: 0 };
  for (const name of JOINT_NAMES) {
    const parent = TABLE[name].parent;
    if (!parent) continue;
    const his = { x: TABLE[name].rest.x - TABLE[parent].rest.x, y: TABLE[name].rest.y - TABLE[parent].rest.y };
    const a = mark(parent);
    const b = mark(name);
    let off = his;
    let turn = turns[parent] ?? 0;
    if (a && b) {
      const painted = { x: b.x - a.x, y: b.y - a.y };
      if (match.some(([x, y]) => x === parent && y === name)) {
        const len = Math.hypot(painted.x, painted.y);
        const hl = Math.hypot(his.x, his.y) || 1;
        turn = wrap(Math.atan2(his.y, his.x) - Math.atan2(painted.y, painted.x));
        off = { x: (his.x / hl) * len, y: (his.y / hl) * len };
      } else off = turnBy(painted, turn);
    }
    rest[name] = { x: rest[parent].x + off.x, y: rest[parent].y + off.y };
    turns[name] = turn;
  }
  const joints = Object.fromEntries(
    JOINT_NAMES.map((name) => {
      const parent = TABLE[name].parent;
      const length = parent ? Math.hypot(rest[name].x - rest[parent].x, rest[name].y - rest[parent].y) : undefined;
      return [name, { parent, rest: rest[name], length }];
    }),
  ) as Record<JointName, Joint>;
  return { joints, turns, farFloor: rest.toeFar.y, headSeat: { x: 0, y: 0 }, bodySeatY: 0 };
}
