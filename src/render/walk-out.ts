/** Out of the shuttle door (R5 §8): the Coke Zero in his free hand 3 s, nuts spilling from his pockets 2 s. */
export const WALK_OUT = { can: 3, nuts: 2 } as const;
/** Seconds left of each. */
export type WalkOut = { can: number; nuts: number };

/** What the gate's payout sets going: the can when cans came home, the nuts with a full smash (B GROUP or better). */
export const walkOutFrom = (e: { cans: number; grade: string }): WalkOut => ({
  can: e.cans > 0 ? WALK_OUT.can : 0,
  nuts: e.grade !== "C GROUP" ? WALK_OUT.nuts : 0,
});

/**
 * A step of the walk out: both run down, and any move puts the can away for good. His free hand holds it, and that is
 * the hand that wipes his face, presses his nose and lobs a box: nothing may be over his face but the hand itself.
 */
export function stepWalkOut(w: WalkOut, dt: number, moving: boolean): WalkOut {
  return { can: moving ? 0 : Math.max(0, w.can - dt), nuts: Math.max(0, w.nuts - dt) };
}
