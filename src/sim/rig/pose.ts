import { JOINT_NAMES, type JointName, type Point, type Pose } from "./skeleton";

export type { Pose };

// A −0 would make two equal poses compare unequal.
const clean = (v: number) => (v === 0 ? 0 : v);

/** A pose with every joint present, so blends compare like with like. */
export function pose(
  p: {
    rot?: Partial<Record<JointName, number>>;
    root?: Point;
    lean?: number;
    squash?: { x: number; y: number };
    headTilt?: number;
    spin?: number;
    torso?: number;
  } = {},
): Pose {
  const rot = {} as Record<JointName, number>;
  for (const name of JOINT_NAMES) rot[name] = clean(p.rot?.[name] ?? 0);
  return {
    rot,
    root: { x: clean(p.root?.x ?? 0), y: clean(p.root?.y ?? 0) },
    lean: clean(p.lean ?? 0),
    squash: { x: clean(p.squash?.x ?? 1), y: clean(p.squash?.y ?? 1) },
    headTilt: clean(p.headTilt ?? 0),
    spin: clean(p.spin ?? 0),
    torso: clean(p.torso ?? 1),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** The shortest way round from one angle to another, degrees. */
const arc = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** Linear on every number, rotations through the shortest arc; exact at both ends. */
export function blend(a: Pose, b: Pose, t: number): Pose {
  const k = Math.min(1, Math.max(0, t));
  if (k === 0) return structuredClone(a);
  if (k === 1) return structuredClone(b);
  const rot = {} as Record<JointName, number>;
  for (const name of JOINT_NAMES) {
    const va = a.rot[name] ?? 0;
    rot[name] = va + arc((b.rot[name] ?? 0) - va) * k;
  }
  return {
    rot,
    root: { x: lerp(a.root.x, b.root.x, k), y: lerp(a.root.y, b.root.y, k) },
    lean: lerp(a.lean, b.lean, k),
    squash: { x: lerp(a.squash.x, b.squash.x, k), y: lerp(a.squash.y, b.squash.y, k) },
    headTilt: lerp(a.headTilt, b.headTilt, k),
    spin: lerp(a.spin, b.spin, k),
    torso: lerp(a.torso, b.torso, k),
  };
}

export type Ease = (t: number) => number;
export const linear: Ease = (t) => t;
export const smooth: Ease = (t) => t * t * (3 - 2 * t);
export const out: Ease = (t) => 1 - (1 - t) ** 3;
/** Starts and stops with no jolt: speed and acceleration both ease from zero. */
export const smoother: Ease = (t) => t * t * t * (t * (6 * t - 15) + 10);
export type Key = readonly [u: number, value: number, ease?: Ease];

/** Each key's ease shapes the segment that arrives at it. */
export function track(keys: readonly Key[], u: number) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [u1, v1, ease = smooth] = keys[i];
    if (u <= u1) {
      const [u0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * ease(u1 > u0 ? (u - u0) / (u1 - u0) : 1);
    }
  }
  return keys[keys.length - 1][1];
}
