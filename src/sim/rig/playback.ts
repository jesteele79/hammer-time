import { moveU, type Move, type MoveKind } from "../moves";
import { ACTIONS, ACTION_MASK, displayU, overlay } from "./actions";
import { blend, type Pose } from "./pose";

/** A move's clip blends in over this and back out over the next (spec §6.3). */
export const ACTION_IN = 0.06;
export const ACTION_OUT = 0.12;

/**
 * The move laid over the locomotion clip. `kind` and `w` are the act showing and its weight;
 * `from` is the pose he was drawn in when another act cut in, which the new one takes over from.
 */
export type Playback = {
  kind: MoveKind | null;
  action: Pose | null;
  w: number;
  moveT: number;
  last: Pose | null;
  from: Pose | null;
  fromK: number;
};

export const createPlayback = (): Playback => ({ kind: null, action: null, w: 0, moveT: -1, last: null, from: null, fromK: 0 });

/**
 * This frame's pose: the act blends in over 0.06 s and its last frame out over 0.12 s. An act that
 * cuts into another (a hit mid-move) blends from where his limbs were drawn, so nothing pops, and
 * a frame of no time (a hit-stop) holds the blend where it is.
 */
export function playAction(p: Playback, base: Pose, m: Move | null, dt: number): Pose {
  if (m) {
    if (m.kind !== p.kind || m.t < p.moveT || p.moveT < 0) {
      if (p.kind && p.last && p.w > 0) {
        p.from = p.last;
        p.fromK = 1;
      }
      p.kind = m.kind;
      p.w = 0;
    }
    p.moveT = m.t;
    p.w = Math.min(1, p.w + dt / ACTION_IN);
    p.action = ACTIONS[m.kind](displayU(m.kind, moveU(m)));
  } else {
    p.moveT = -1;
    p.w = Math.max(0, p.w - dt / ACTION_OUT);
    if (p.w === 0) {
      p.action = null;
      p.kind = null;
    }
  }
  p.fromK = Math.max(0, p.fromK - dt / ACTION_IN);
  let drawn = p.action && p.kind ? overlay(base, p.action, ACTION_MASK[p.kind], p.w) : base;
  if (p.from && p.fromK > 0) drawn = blend(drawn, p.from, p.fromK);
  else p.from = null;
  p.last = drawn;
  return drawn;
}
