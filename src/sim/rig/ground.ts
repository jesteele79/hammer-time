import type { Solved } from "./fk";
import { FAR_FLOOR } from "./skeleton";

/** "planted" stands the lowest sole on the floor; "push" only lifts a sole out of it; "body" rests whatever is lowest, back or head included; "none" leaves the pose. */
export type Ground = "planted" | "push" | "body" | "none";
/** Half his torso's depth about the spine, rest units: what he lies on when he is flat on his back. */
export const BACK = 36;

/**
 * How far to move the drawn body down (world px, y down) so its lowest sole
 * stands on the floor at y = 0. The far sole's floor line sits FAR_FLOOR rest
 * units higher, where the painting's perspective put it, so whichever foot is
 * planted takes the weight on its own line.
 */
export function groundShift(solved: Solved, mode: Ground): number {
  if (mode === "none") return 0;
  const lift = FAR_FLOOR * solved.scale * solved.squash.y;
  const j = solved.joints;
  const lowest = Math.max(j.toeNear.y, j.heelNear.y, j.toeFar.y + lift, j.heelFar.y + lift);
  if (mode === "body") {
    const spine = Math.max(j.pelvis.y, j.chest.y, j.neck.y) + BACK * solved.scale;
    return -Math.max(lowest, spine, solved.headBox.y + solved.headBox.h);
  }
  return mode === "push" ? Math.min(0, -lowest) : -lowest;
}

/** Which clips stand on the floor: a run may leave it between strides; jumps and falls are in the air. */
export function groundModeFor(clip: string, onGround: boolean): Ground {
  if (!onGround || clip === "jump" || clip === "fall") return "none";
  return clip === "run" ? "push" : "planted";
}
