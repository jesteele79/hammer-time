import { SUPER_CUT, type MoveKind } from "../moves";
import type { Solved } from "./fk";

/** "planted" stands the lowest sole on the floor; "push" only lifts a sole out of it; "body" rests whatever is lowest, back or head included; "none" leaves the pose. */
export type Ground = "planted" | "push" | "body" | "none";
/** Half his torso's depth behind the spine, rest units: what he lies on when he is flat on his back. */
export const BACK = 36;
/** How far his seat hangs below his hip joints, rest units: what he sits on. */
export const SEAT = 22;

/**
 * How far to move the drawn body down (world px, y down) so its lowest sole
 * stands on the floor at y = 0. The far sole's floor line sits the skeleton's
 * far floor (Hammer's FAR_FLOOR) rest units higher, where the painting's perspective put it, so whichever foot is
 * planted takes the weight on its own line.
 */
export function groundShift(solved: Solved, mode: Ground): number {
  if (mode === "none") return 0;
  const lift = solved.farFloor * solved.scale * solved.squash.y;
  const j = solved.joints;
  const lowest = Math.max(j.toeNear.y, j.heelNear.y, j.toeFar.y + lift, j.heelFar.y + lift);
  if (mode === "body") {
    // His back is on the side of the spine away from where he faces; lying down, it is underneath.
    const sx = j.neck.x - j.pelvis.x;
    const sy = j.neck.y - j.pelvis.y;
    const len = Math.hypot(sx, sy) || 1;
    const backY = (solved.facing === 1 ? -sx : sx) / len;
    const spine = Math.max(j.pelvis.y, j.chest.y, j.neck.y) + Math.max(0, backY) * BACK * solved.scale;
    const seat = Math.max(j.hipNear.y, j.hipFar.y) + SEAT * solved.scale;
    return -Math.max(lowest, spine, seat, solved.headBox.y + solved.headBox.h);
  }
  return mode === "push" ? Math.min(0, -lowest) : -lowest;
}

/** Which clips stand on the floor: a run may leave it between strides; jumps and falls are in the air. */
export function groundModeFor(clip: string, onGround: boolean): Ground {
  if (!onGround || clip === "jump" || clip === "fall") return "none";
  return clip === "run" ? "push" : "planted";
}

/** How a move at fraction `u` stands him on the floor, over the locomotion clip's own rule. */
export function groundForAction(kind: MoveKind | null, clip: string, onGround: boolean, u = 0): Ground {
  switch (kind) {
    case "super":
      // Free through the hop; from the plunge he comes down feet first, so the slam lands without a snap.
      return onGround || u >= SUPER_CUT[0] ? "planted" : "none";
    case "hurt":
      return onGround ? "planted" : "none";
    case "wipe":
    case "lecture":
      return "planted";
    case "tumble":
      // Down or flying, whatever is lowest of him rides his feet point, so landing never snaps him.
      return "body";
    default:
      return groundModeFor(clip, onGround);
  }
}
