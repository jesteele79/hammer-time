import type { MoveKind } from "../moves";
import { MOVE_SECONDS, SUPER_CUT, SWING_CUT, TAP_HARRUMPH, TUMBLE_LAND, WIPE_FLICK, WIPE_SCRUB } from "../moves";
import { FREE, HOLD, flatFeet } from "./clips";
import { armTo, legTo } from "./ik";
import { blend, linear, out, pose, smooth, smoother, track, type Key, type Pose } from "./pose";
import { JOINTS, type JointName, type Point } from "./skeleton";

export { armTo };

export const ACTION_MASK: Record<MoveKind, "upper" | "whole"> = {
  swing: "upper",
  super: "whole",
  snot: "upper",
  wipe: "whole",
  lecture: "upper",
  watch: "upper",
  tap: "whole",
  hurt: "whole",
  tumble: "whole",
};
const CUTS: Partial<Record<MoveKind, readonly [number, number]>> = { swing: SWING_CUT, super: SUPER_CUT };

/** The frame drawn at u. Inside a cut the strike lands at once, so the arc over the head is never drawn. */
export function displayU(kind: MoveKind, u: number): number {
  const c = CUTS[kind];
  return c && u > c[0] && u < c[1] ? c[1] : u;
}

/** The joints an upper-body action owns; the legs, root and squash stay the locomotion clip's. */
export const UPPER_JOINTS: JointName[] = [
  "chest",
  "neck",
  "head",
  "shoulderNear",
  "elbowNear",
  "wristNear",
  "knuckleNear",
  "handNear",
  "shoulderFar",
  "elbowFar",
  "wristFar",
  "handFar",
  "grip",
  "malletHead",
];

/** Lays an action over a locomotion pose at weight w: the whole body, or the upper body and lean. */
export function overlay(base: Pose, action: Pose, mask: "upper" | "whole", w: number): Pose {
  if (mask === "whole") return blend(base, action, w);
  const mixed = blend(base, action, w);
  const result = structuredClone(base);
  for (const j of UPPER_JOINTS) result.rot[j] = mixed.rot[j];
  result.lean = mixed.lean;
  result.headTilt = mixed.headTilt;
  result.lift = mixed.lift;
  return result;
}

type K = readonly Key[];
const at = (keys: K, u: number) => track(keys, u);

// Swing: a windmill. The arm swings back through the bottom and up behind him (the mallet
// sweeps down in front, back, and trails down his back at the load), the strike over the top
// is the cut, then the follow-through low in front and the return to the hold. Rotation
// tracks run on past ±180 so the windmill turns one way: one full turn of the shoulder (−360).
// The keys are world angles turned into rotations: upper arm U, forearm F, hand H, handle H+68.
const SWING = {
  // U: −82 (hold), −120, −170, 125 (load: the elbow up behind his head), 122, −15 (strike), −70, −72, −82.
  shoulderNear: [[0, HOLD.shoulderNear], [0.12, -41.31], [0.2, -91.31], [0.26, -156.31, out], [SWING_CUT[0], -159.31, linear], [SWING_CUT[1], -296.31, linear], [0.46, -351.31, out], [0.58, -353.31, out], [1, HOLD.shoulderNear - 360]] as K,
  elbowNear: [[0, HOLD.elbowNear], [0.12, -4.63], [0.2, 0.37], [0.26, 45.37, out], [SWING_CUT[0], 50.37, linear], [SWING_CUT[1], -24.63, linear], [0.46, -24.63, out], [0.58, -22.63, out], [1, HOLD.elbowNear]] as K,
  // The handle: 70 (hold), −40 (down in front), −110 (down behind), 223 (hanging down his back), 218, 30 (strike), −30, −32, 70.
  wristNear: [[0, HOLD.wristNear], [0.12, -11.61], [0.2, -36.61], [0.26, -43.61, out], [SWING_CUT[0], -42.61, linear], [SWING_CUT[1], -26.61, linear], [0.46, -31.61, out], [0.58, -33.61, out], [1, HOLD.wristNear]] as K,
  lean: [[0, 0], [0.26, -5, out], [SWING_CUT[0], -6], [SWING_CUT[1], 2, linear], [0.46, 9, out], [0.58, 10], [1, 0]] as K,
  shoulderFar: [[0, FREE], [0.26, FREE + 20, out], [SWING_CUT[1], FREE - 10, linear], [0.58, FREE - 14], [1, FREE]] as K,
};

// Super smash: the hop with the same windmill load, the cut over the top, then the slam:
// folded forward 45 degrees, squatting, the arm long and the mallet head on the floor ahead.
const SUPER = {
  shoulderNear: [[0, HOLD.shoulderNear], [0.14, -91.31], [0.3, -165.31, out], [SUPER_CUT[0], -168.31, linear], [SUPER_CUT[1], -309.31, linear], [0.56, -309.31, out], [0.76, -309.31], [1, HOLD.shoulderNear - 360]] as K,
  elbowNear: [[0, HOLD.elbowNear], [0.14, 0.37], [0.3, 45.37, out], [SUPER_CUT[0], 50.37, linear], [SUPER_CUT[1], -19.63, linear], [0.56, -19.63, out], [0.76, -19.63], [1, HOLD.elbowNear]] as K,
  wristNear: [[0, HOLD.wristNear], [0.14, -36.61], [0.3, -43.61, out], [SUPER_CUT[0], -42.61, linear], [SUPER_CUT[1], -33.61, linear], [0.56, -33.61, out], [0.76, -33.61], [1, HOLD.wristNear]] as K,
  lean: [[0, 0], [0.34, -9, out], [SUPER_CUT[0], -10], [SUPER_CUT[1], 4, linear], [0.56, 45, out], [0.76, 45], [1, 0]] as K,
  hip: [[0, 0], [0.2, 25, out], [SUPER_CUT[1], 10], [0.56, 62, out], [0.76, 62], [1, 0]] as K,
  knee: [[0, 0], [0.2, -40, out], [SUPER_CUT[1], -15], [0.56, -105, out], [0.76, -105], [1, 0]] as K,
  shoulderFar: [[0, FREE], [0.3, FREE + 30, out], [SUPER_CUT[1], FREE - 10, linear], [0.76, FREE - 20], [1, FREE]] as K,
};

// Snot: his left hand comes up and presses one nostril shut, he rears back to load the sinuses,
// then snaps the whole upper body forward and blows; the hand drops after.
const SNOT = {
  lean: [[0, 0], [0.3, -11], [0.42, -12], [0.5, 15, out], [0.62, 11], [1, 0]] as K,
  headTilt: [[0, 0], [0.3, -6], [0.42, -7], [0.5, 8, out], [0.7, 4], [1, 0]] as K,
  chest: [[0, 0], [0.3, -5], [0.5, 6, out], [1, 0]] as K,
  // The mallet arm turns against the rear-back so the mallet stays out in front, and dips a
  // little further on the snap so the mallet head gives way as his face comes forward.
  shoulderNear: [[0, HOLD.shoulderNear], [0.3, HOLD.shoulderNear - 16], [0.42, HOLD.shoulderNear - 19], [0.5, HOLD.shoulderNear - 8, out], [0.62, HOLD.shoulderNear - 6], [1, HOLD.shoulderNear]] as K,
};

/** The far wrist's path for the towel, in the chest's frame (rest units): from the hang, scalp strokes, flick, back to the hang. */
const DEG = Math.PI / 180;
const angleOf = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x) / DEG;
/**
 * Where the far wrist hangs at rest (the free arm swung back by FREE) and the way its hand
 * points: the wipe starts and ends there, so the blend in and out has nothing to jump.
 */
const HANG: Point = (() => {
  const S = JOINTS.shoulderFar.rest;
  const W = JOINTS.wristFar.rest;
  const a = FREE * DEG;
  return {
    x: S.x + (W.x - S.x) * Math.cos(a) - (W.y - S.y) * Math.sin(a),
    y: S.y + (W.x - S.x) * Math.sin(a) + (W.y - S.y) * Math.cos(a),
  };
})();
const HANG_DEG = angleOf(JOINTS.wristFar.rest, JOINTS.handFar.rest) + FREE;
/**
 * The towel wipe: his right hand drops the mallet to hang in front of his legs while his left
 * hand swings up in front of him to his face and wipes it, five strokes between his mouth and
 * his forehead, flicks the towel forward and down, and goes back to the hang as the mallet
 * comes back up (owner, 2026-10-11: "the most natural look").
 */
/** The head sat 8 units further forward and 9 lower from 2026-10-12; the towel's path at his face follows it. */
const FACE_SHIFT: Point = { x: 8, y: -9 };
const FACE_LOW: Point = { x: 44 + FACE_SHIFT.x, y: 300 + FACE_SHIFT.y };
const FACE_HIGH: Point = { x: 38 + FACE_SHIFT.x, y: 328 + FACE_SHIFT.y };
const HAND_LOW = 105;
const HAND_HIGH = 95;
const HAND_FLICK = 10;
const FLICK_TURN = 0.08;
const FLUNG: Point = { x: 100 + FACE_SHIFT.x, y: 260 + FACE_SHIFT.y };
/** Where a stroke is: 0 low over his mouth, 1 high over his eyes. */
const rub = (u: number) => 0.5 - 0.5 * Math.cos(((u - WIPE_SCRUB[0]) / (WIPE_SCRUB[1] - WIPE_SCRUB[0])) * Math.PI * 5);
/** The hand reaches his face a little into the first stroke, so the long swing up has time to ease. */
const RISE_END = 0.16;
const scrubAt = (u: number) => mix(FACE_LOW, FACE_HIGH, rub(u));
const scrubDeg = (u: number) => HAND_LOW + (HAND_HIGH - HAND_LOW) * rub(u);
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const bez = (a: Point, c: Point, b: Point, t: number): Point => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
export function wipeHand(u: number): Point {
  // Up from the hang and out in front of him, easing in and out, so the arm rises instead of appearing.
  if (u < RISE_END) return bez(HANG, { x: 90 + FACE_SHIFT.x, y: 330 + FACE_SHIFT.y }, scrubAt(RISE_END), smoother(u / RISE_END));
  if (u < WIPE_FLICK[0]) return scrubAt(u);
  if (u < WIPE_FLICK[1]) return mix(FACE_HIGH, FLUNG, smooth((u - WIPE_FLICK[0]) / (WIPE_FLICK[1] - WIPE_FLICK[0])));
  return bez(FLUNG, { x: 60, y: 160 }, HANG, smooth(Math.min(1, (u - WIPE_FLICK[1]) / 0.16)));
}

/**
 * The way the far hand points through the wipe, in the chest's frame (degrees, facing right):
 * it turns up with the arm as it rises, its palm on his face with the fingers up over his eyes,
 * flips forward over 0.08 of the clip to flick, and turns back down with the arm to the hang.
 */
export function wipeHandDeg(u: number): number {
  if (u < RISE_END) return HANG_DEG + (scrubDeg(RISE_END) - HANG_DEG) * smoother(u / RISE_END);
  if (u < WIPE_FLICK[0]) return scrubDeg(u);
  if (u < WIPE_FLICK[0] + FLICK_TURN) return HAND_HIGH + (HAND_FLICK - HAND_HIGH) * smooth((u - WIPE_FLICK[0]) / FLICK_TURN);
  if (u < WIPE_FLICK[1]) return HAND_FLICK;
  return HAND_FLICK + (HANG_DEG - HAND_FLICK) * smooth(Math.min(1, (u - WIPE_FLICK[1]) / 0.16));
}

/**
 * The snot rocket's left hand (owner, 2026-10-12: "his left hand needs to go to his nose"): up
 * from the hang to press one nostril shut, held through the blow, then back down. The wrist sits
 * so the fingers land just behind the tip of his nose, the hand pointing up.
 */
const NOSE_WRIST: Point = { x: 47, y: 297 };
const NOSE_DEG = 85;
/** At his nose from here, until here, and back at the hang by here (fractions of the move). */
const NOSE_ON = 0.25;
const NOSE_OFF = 0.62;
const NOSE_BACK = 0.88;
export function snotHand(u: number): Point {
  // Up from below and in front of his chin, and off with a little flick forward before it drops,
  // so the hand comes over his face and leaves it only where it covers nothing else.
  if (u < NOSE_ON) return bez(HANG, { x: 110, y: 260 }, NOSE_WRIST, smoother(u / NOSE_ON));
  if (u < NOSE_OFF) return NOSE_WRIST;
  return bez(NOSE_WRIST, { x: 140, y: 300 }, HANG, smooth(Math.min(1, (u - NOSE_OFF) / (NOSE_BACK - NOSE_OFF))));
}
export function snotHandDeg(u: number): number {
  if (u < NOSE_ON) return HANG_DEG + (NOSE_DEG - HANG_DEG) * smoother(u / NOSE_ON);
  if (u < NOSE_OFF) return NOSE_DEG;
  return NOSE_DEG + (HANG_DEG - NOSE_DEG) * smooth(Math.min(1, (u - NOSE_OFF) / (NOSE_BACK - NOSE_OFF)));
}

/** His right arm through the wipe: down from the hold so the mallet hangs in front of his legs, and back. */
const DROP = { shoulderNear: 8, elbowNear: 0, wristNear: -75 };
const WIPE_NEAR = {
  shoulderNear: [[0, HOLD.shoulderNear], [0.12, DROP.shoulderNear], [0.84, DROP.shoulderNear], [1, HOLD.shoulderNear]] as K,
  elbowNear: [[0, HOLD.elbowNear], [0.12, DROP.elbowNear], [0.84, DROP.elbowNear], [1, HOLD.elbowNear]] as K,
  wristNear: [[0, HOLD.wristNear], [0.12, DROP.wristNear], [0.84, DROP.wristNear], [1, HOLD.wristNear]] as K,
};
// A slight bow into the towel, and a lean back as he flicks it away.
const WIPE_LEAN = [[0, 0], [0.12, 0], [0.2, 3], [0.62, 3], [0.7, -3, out], [1, 0]] as K;

const toward = (a: number, b: number, k: number) => a + (b - a) * k;

// Every key in these five clips eases in and out (the default): their onsets read sharp enough
// through the 0.06 s blend in, and the smoothness check forbids a step that leaps from rest.

// Lecture (0.8 s): plant the feet, point the mallet at them and wag it like a finger (the
// shipped lectureJoints). Upper arm -35, forearm +5, hand -48: the handle aims 20 degrees up ahead.
const LECTURE_ARM = { shoulderNear: 43.69, elbowNear: 10.37, wristNear: -51.61 };
const LECTURE_UP = [[0, 0], [0.16, 1], [0.84, 1], [1, 0]] as K;
const WAG = { from: 0.18, to: 0.86, rate: 34, deg: 13, fade: 0.06 } as const;
function lecture(u: number): Pose {
  const up = at(LECTURE_UP, u);
  const fade = Math.max(0, Math.min(1, (u - WAG.from) / WAG.fade, (WAG.to - u) / WAG.fade));
  const wag = fade * Math.sin((u - WAG.from) * MOVE_SECONDS.lecture * WAG.rate) * WAG.deg;
  return pose({
    rot: {
      shoulderNear: toward(HOLD.shoulderNear, LECTURE_ARM.shoulderNear, up),
      elbowNear: toward(HOLD.elbowNear, LECTURE_ARM.elbowNear, up),
      wristNear: toward(HOLD.wristNear, LECTURE_ARM.wristNear, up) + wag,
      shoulderFar: FREE,
      chest: -2 * up,
    },
    lean: 4 * up,
    headTilt: 3 * up,
  });
}

// Watch check (2.1 s): his right hand lets the mallet hang in front of his legs (as in the
// wipe) and his left forearm swings up level in front of his chest, and he looks down at it
// (the shipped watchJoints, on his free arm).
const WATCH_WRIST: Point = { x: 70, y: 250 };
const WATCH_VIA: Point = { x: 70, y: 170 };
const WATCH_HAND = 12;
const WATCH_UP = [[0, 0], [0.15, 1], [0.85, 1], [1, 0]] as K;
function watch(u: number): Pose {
  const up = at(WATCH_UP, u);
  const far = armTo("far", bez(HANG, WATCH_VIA, WATCH_WRIST, up), HANG_DEG + (WATCH_HAND - HANG_DEG) * up, -1);
  return pose({
    rot: {
      shoulderNear: toward(HOLD.shoulderNear, DROP.shoulderNear, up),
      elbowNear: toward(HOLD.elbowNear, DROP.elbowNear, up),
      wristNear: toward(HOLD.wristNear, DROP.wristNear, up),
      shoulderFar: far.shoulder,
      elbowFar: far.elbow,
      wristFar: far.wrist,
    },
    lean: -1.5 * up,
    headTilt: 6 * up,
  });
}

// Foot tap (3 s): the near toe taps twice a second about the heel, then the harrumph: chest
// and chin up, and settle.
const TAP = { hz: 2, deg: 14 } as const;
const HARRUMPH = [[0, 0], [0.35, 1], [1, 0]] as K;
const TOE_REST = angleOf(JOINTS.ankleNear.rest, JOINTS.toeNear.rest);
/** The near leg with the toe lifted `deg` about the heel, which stays where it stands. */
function heelPivot(deg: number) {
  const H = JOINTS.heelNear.rest;
  const A = JOINTS.ankleNear.rest;
  const r = deg * DEG;
  const ax = A.x - H.x;
  const ay = A.y - H.y;
  const ankle = { x: H.x + ax * Math.cos(r) - ay * Math.sin(r), y: H.y + ax * Math.sin(r) + ay * Math.cos(r) };
  return legTo("near", ankle, TOE_REST + deg, 1);
}
function tap(u: number): Pose {
  const t = u * MOVE_SECONDS.tap;
  const lift = t < TAP_HARRUMPH ? Math.max(0, Math.sin(t * Math.PI * 2 * TAP.hz)) * TAP.deg : 0;
  const leg = heelPivot(lift);
  const h = t < TAP_HARRUMPH ? 0 : at(HARRUMPH, (t - TAP_HARRUMPH) / (MOVE_SECONDS.tap - TAP_HARRUMPH));
  return pose({
    rot: { ...HOLD, shoulderFar: FREE, hipNear: leg.hip, kneeNear: leg.knee, ankleNear: leg.ankle, chest: -4 * h },
    lean: -3 * h,
    headTilt: -6 * h,
  });
}

// Hurt (0.45 s): the hit throws his head and shoulders back, the knees give, the mallet arm
// flails forward and down away from his face, the free arm flies back; then he recovers.
const HURT = {
  lean: [[0, 0], [0.18, -14], [0.55, -10], [1, 0]] as K,
  headTilt: [[0, 0], [0.18, -6], [0.55, -4], [1, 0]] as K,
  hip: [[0, 0], [0.18, 16], [0.55, 12], [1, 0]] as K,
  knee: [[0, 0], [0.18, -28], [0.55, -20], [1, 0]] as K,
  shoulderNear: [[0, HOLD.shoulderNear], [0.18, HOLD.shoulderNear + 30], [0.55, HOLD.shoulderNear + 22], [1, HOLD.shoulderNear]] as K,
  elbowNear: [[0, HOLD.elbowNear], [0.18, HOLD.elbowNear - 50], [0.55, HOLD.elbowNear - 36], [1, HOLD.elbowNear]] as K,
  wristNear: [[0, HOLD.wristNear], [0.18, HOLD.wristNear - 60], [0.55, HOLD.wristNear - 45], [1, HOLD.wristNear]] as K,
  shoulderFar: [[0, FREE], [0.18, FREE - 30], [0.55, FREE - 20], [1, FREE]] as K,
};
function hurt(u: number): Pose {
  const hip = at(HURT.hip, u);
  const knee = at(HURT.knee, u);
  return pose({
    rot: flatFeet(
      {
        shoulderNear: at(HURT.shoulderNear, u),
        elbowNear: at(HURT.elbowNear, u),
        wristNear: at(HURT.wristNear, u),
        shoulderFar: at(HURT.shoulderFar, u),
        hipNear: hip,
        kneeNear: knee,
        hipFar: hip * 0.8,
        kneeFar: knee * 0.8,
      },
      1,
    ),
    lean: at(HURT.lean, u),
    headTilt: at(HURT.headTilt, u),
  });
}

// Tumble (1.6 s): knocked off his feet he goes over backward, arms and legs up, lands flat on his
// back with a bounce, lies there a beat, sits up and gets up through a crouch. The sim holds
// TUMBLE_LAND while he is still in the air.
/** Getting up: sitting with his legs out, then his knees pulled up and his feet under him. */
const SIT_SPIN = 8;
const SIT_HIP = 100;
const SIT_KNEE = -3;
const SIT_LEAN = 14;
const TUCK_SPIN = 2;
const TUCK_HIP = 125;
const TUCK_KNEE = -140;
const TUCK_LEAN = 34;
// The mallet arm opens forward and down, so the mallet points away from his face however he turns.
const LIE = 0.38;
const TUMBLE = {
  spin: [[0, 0], [0.1, 32], [TUMBLE_LAND, 80], [LIE, 92], [0.42, 86], [0.46, 90], [0.62, 90], [0.74, SIT_SPIN], [0.82, TUCK_SPIN], [0.9, 0], [1, 0]] as K,
  hip: [[0, 0], [0.1, 34], [TUMBLE_LAND, 48], [LIE, 10], [0.62, 10], [0.74, SIT_HIP], [0.82, TUCK_HIP], [0.9, 70], [1, 0]] as K,
  knee: [[0, 0], [0.1, -46], [TUMBLE_LAND, -34], [LIE, -8], [0.62, -8], [0.74, SIT_KNEE], [0.82, TUCK_KNEE], [0.9, -112], [1, 0]] as K,
  lean: [[0, 0], [0.1, -10], [TUMBLE_LAND, -6], [LIE, 0], [0.62, 0], [0.74, SIT_LEAN], [0.82, TUCK_LEAN], [0.9, 16], [1, 0]] as K,
  drop: [[0, 0], [0.82, 0], [0.9, -60], [1, 0]] as K,
  // Shoes flat on the floor only while he stands or crouches; off his feet, they point where his shins do.
  flat: [[0, 1], [0.1, 0], [0.8, 0], [0.88, 1], [1, 1]] as K,
  shoulderNear: [[0, HOLD.shoulderNear], [0.1, HOLD.shoulderNear + 20], [TUMBLE_LAND, HOLD.shoulderNear + 30], [LIE, HOLD.shoulderNear + 16], [0.62, HOLD.shoulderNear + 16], [0.88, HOLD.shoulderNear], [1, HOLD.shoulderNear]] as K,
  elbowNear: [[0, HOLD.elbowNear], [0.1, HOLD.elbowNear - 50], [TUMBLE_LAND, HOLD.elbowNear - 50], [LIE, HOLD.elbowNear - 30], [0.62, HOLD.elbowNear - 30], [0.88, HOLD.elbowNear], [1, HOLD.elbowNear]] as K,
  wristNear: [[0, HOLD.wristNear], [0.1, HOLD.wristNear - 50], [TUMBLE_LAND, HOLD.wristNear - 50], [LIE, HOLD.wristNear - 40], [0.62, HOLD.wristNear - 40], [0.88, HOLD.wristNear], [1, HOLD.wristNear]] as K,
  shoulderFar: [[0, FREE], [0.1, FREE + 40], [TUMBLE_LAND, FREE + 50], [LIE, FREE + 10], [0.62, FREE + 10], [0.88, FREE], [1, FREE]] as K,
};
function tumble(u: number): Pose {
  const hip = at(TUMBLE.hip, u);
  const knee = at(TUMBLE.knee, u);
  return pose({
    rot: flatFeet(
      {
        shoulderNear: at(TUMBLE.shoulderNear, u),
        elbowNear: at(TUMBLE.elbowNear, u),
        wristNear: at(TUMBLE.wristNear, u),
        shoulderFar: at(TUMBLE.shoulderFar, u),
        hipNear: hip,
        kneeNear: knee,
        hipFar: hip * 0.92,
        kneeFar: knee * 0.95,
      },
      at(TUMBLE.flat, u),
    ),
    lean: at(TUMBLE.lean, u),
    root: { x: 0, y: at(TUMBLE.drop, u) },
    spin: at(TUMBLE.spin, u),
  });
}

export const ACTIONS: Record<MoveKind, (u: number) => Pose> = {
  swing: (u) =>
    pose({
      rot: {
        shoulderNear: at(SWING.shoulderNear, u),
        elbowNear: at(SWING.elbowNear, u),
        wristNear: at(SWING.wristNear, u),
        shoulderFar: at(SWING.shoulderFar, u),
      },
      lean: at(SWING.lean, u),
    }),
  super: (u) => {
    const hip = at(SUPER.hip, u);
    const knee = at(SUPER.knee, u);
    return pose({
      rot: {
        shoulderNear: at(SUPER.shoulderNear, u),
        elbowNear: at(SUPER.elbowNear, u),
        wristNear: at(SUPER.wristNear, u),
        shoulderFar: at(SUPER.shoulderFar, u),
        hipNear: hip,
        kneeNear: knee,
        hipFar: hip * 0.9,
        kneeFar: knee * 0.95,
        ankleNear: -(hip + knee),
        ankleFar: -(hip * 0.9 + knee * 0.95),
      },
      lean: at(SUPER.lean, u),
    });
  },
  snot: (u) => {
    const far = armTo("far", snotHand(u), snotHandDeg(u), -1);
    return pose({
      rot: {
        ...HOLD,
        shoulderNear: at(SNOT.shoulderNear, u),
        chest: at(SNOT.chest, u),
        shoulderFar: far.shoulder,
        elbowFar: far.elbow,
        wristFar: far.wrist,
      },
      lean: at(SNOT.lean, u),
      headTilt: at(SNOT.headTilt, u),
    });
  },
  wipe: (u) => {
    const lean = at(WIPE_LEAN, u);
    // The far arm follows the towel's path the whole clip, from the hang and back, its elbow down.
    const far = armTo("far", wipeHand(u), wipeHandDeg(u), -1);
    return pose({
      rot: {
        shoulderNear: at(WIPE_NEAR.shoulderNear, u),
        elbowNear: at(WIPE_NEAR.elbowNear, u),
        wristNear: at(WIPE_NEAR.wristNear, u),
        shoulderFar: far.shoulder,
        elbowFar: far.elbow,
        wristFar: far.wrist,
      },
      lean,
    });
  },
  lecture,
  watch,
  tap,
  hurt,
  tumble,
};
