import type { JointName, Point } from "./skeleton";
import type { Rect, Solved } from "./fk";

// Capsule radii in rest units: how wide each drawn part is around its bone.
const ARM = 24;
const LEG = 30;
const HANDLE = 14;
// The painted mallet head reaches 49 units from its center.
const MALLET_HEAD = 50;
const SAMPLES = 11;

const SEGMENTS: [name: string, from: JointName, to: JointName, radius: number][] = [
  ["near upper arm", "shoulderNear", "elbowNear", ARM],
  ["near forearm", "elbowNear", "handNear", ARM],
  ["far upper arm", "shoulderFar", "elbowFar", ARM],
  ["far forearm", "elbowFar", "handFar", ARM],
  ["near thigh", "hipNear", "kneeNear", LEG],
  ["near shin", "kneeNear", "ankleNear", LEG],
  ["near foot", "ankleNear", "toeNear", LEG],
  ["far thigh", "hipFar", "kneeFar", LEG],
  ["far shin", "kneeFar", "ankleFar", LEG],
  ["far foot", "ankleFar", "toeFar", LEG],
  ["mallet handle", "grip", "malletHead", HANDLE],
];

const distToRect = (p: Point, r: Rect) => {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
};

/** Probes every limb and the mallet against the face box; names the first thing that crosses it. */
export function faceClear(solved: Solved): { ok: boolean; offender?: string } {
  const { joints, faceBox, scale } = solved;
  for (const [name, from, to, radius] of SEGMENTS) {
    const a = joints[from];
    const b = joints[to];
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1);
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (distToRect(p, faceBox) < radius * scale) return { ok: false, offender: name };
    }
  }
  if (distToRect(joints.malletHead, faceBox) < MALLET_HEAD * scale) return { ok: false, offender: "mallet head" };
  return { ok: true };
}
