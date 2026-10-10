import { SWING_SECONDS, SUPER_SECONDS, type Point } from "./combat";

/**
 * Joints on the approved 456×1371 cut-out canvas. Every pose is expressed as
 * absolute screen angles (degrees, clockwise, figure facing right) so the
 * keyframes read like a pose sheet; armAngles() turns them into the local
 * rotations the renderer and the mallet collision both apply.
 */
export const HIP = { x: 185, y: 712 };
export const SHOULDER = { x: 100, y: 360 };
export const ELBOW = { x: 90, y: 520 };
export const FIST = { x: 150, y: 800 };
export const GRIP = { x: 150, y: 812 };
export const MALLET_HEAD = { x: 357, y: 934 };
export const NOSTRIL = { x: 349, y: 187 };
/** Eyes, nose, mustache, mouth and chin: nothing is ever drawn over this box. */
export const FACE: readonly [Point, Point] = [
  { x: 282, y: 96 },
  { x: 368, y: 266 },
];
/** Top of the bald crown, in head space. */
export const CROWN = { x: 232, y: 0 };
/** The head rides the torso but stays level, so the face is never tilted. */
export const NECK = { x: 215, y: 290 };
export const NECKLINE = [
  [-40, 236], [120, 240], [140, 250], [163, 277], [180, 295], [200, 310], [227, 317], [253, 310],
  [263, 293], [480, 293],
];
export const FAR_SHOULDER = { x: 300, y: 372 };
export const FAR_REST = { x: 300, y: 760 };
export const UPPER_LENGTH = Math.hypot(ELBOW.x - SHOULDER.x, ELBOW.y - SHOULDER.y);
export const FORE_LENGTH = Math.hypot(FIST.x - ELBOW.x, FIST.y - ELBOW.y);

const angle = (from: Point, to: Point) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
export const A0 = angle(SHOULDER, ELBOW);
export const F0 = angle(ELBOW, FIST);
export const H0 = angle(GRIP, MALLET_HEAD);
const rad = (d: number) => (d * Math.PI) / 180;

export type Joints = {
  /** Torso rotation around the hips; positive leans toward the facing side. */
  lean: number;
  /** Whole-figure shift toward the facing side, in artwork pixels. */
  dx: number;
  /** -1..1 stance: positive steps the front foot out for a lunge. */
  stride: number;
  /** Absolute upper arm, forearm and mallet handle directions. */
  A: number;
  F: number;
  H: number;
  /** Far fist target in torso space, or null while it hangs out of sight. */
  far: Point | null;
  /** Point the far elbow bends toward, so it stays hidden behind the body. */
  pole: Point;
};

export const REST: Joints = {
  lean: 0,
  dx: 0,
  stride: 0,
  A: A0,
  F: F0,
  H: H0,
  far: null,
  pole: { x: 250, y: 560 },
};

type Ease = (t: number) => number;
const linear: Ease = (t) => t;
const smooth: Ease = (t) => t * t * (3 - 2 * t);
const out: Ease = (t) => 1 - (1 - t) ** 3;
type Key = readonly [u: number, value: number, ease?: Ease];

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

export function armAngles(j: Joints) {
  return { s: rad(j.A - A0), e: rad(j.F - j.A - (F0 - A0)), w: rad(j.H - j.F - (H0 - F0)) };
}

export function rotateAround(p: Point, c: Point, a: number): Point {
  const x = p.x - c.x,
    y = p.y - c.y,
    cos = Math.cos(a),
    sin = Math.sin(a);
  return { x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos };
}

export type Frame = "torso" | "head" | "upper" | "fore" | "mallet";

/** The renderer applies exactly this chain, innermost joint first. */
export function rigPoint(j: Joints, point: Point, frame: Frame): Point {
  const { s, e, w } = armAngles(j);
  let q = point;
  if (frame === "head") q = rotateAround(q, NECK, -rad(j.lean));
  if (frame === "mallet") q = rotateAround(q, GRIP, w);
  if (frame === "mallet" || frame === "fore") q = rotateAround(q, ELBOW, e);
  if (frame === "upper" || frame === "fore" || frame === "mallet") q = rotateAround(q, SHOULDER, s);
  q = rotateAround(q, HIP, rad(j.lean));
  return { x: q.x + j.dx, y: q.y };
}

/** Two-bone reach for the far arm; the elbow takes the side nearer its pole. */
export function farArm(j: Joints) {
  const target = j.far ?? FAR_REST;
  const dx = target.x - FAR_SHOULDER.x,
    dy = target.y - FAR_SHOULDER.y;
  const reach = UPPER_LENGTH + FORE_LENGTH;
  const d = Math.max(Math.abs(UPPER_LENGTH - FORE_LENGTH) + 1, Math.min(reach - 1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const bend = Math.acos((UPPER_LENGTH ** 2 + d ** 2 - FORE_LENGTH ** 2) / (2 * UPPER_LENGTH * d));
  const elbows = [base + bend, base - bend].map((a) => ({
    x: FAR_SHOULDER.x + Math.cos(a) * UPPER_LENGTH,
    y: FAR_SHOULDER.y + Math.sin(a) * UPPER_LENGTH,
  }));
  const near = (p: Point) => Math.hypot(p.x - j.pole.x, p.y - j.pole.y);
  const elbow = near(elbows[0]) <= near(elbows[1]) ? elbows[0] : elbows[1];
  const hand = {
    x: FAR_SHOULDER.x + Math.cos(base) * d,
    y: FAR_SHOULDER.y + Math.sin(base) * d,
  };
  return { elbow, hand };
}

/*
 * Mallet swing. The wind-up travels behind the head, then the strike cuts from
 * overhead to the front between two physics steps: the drawn arm never sweeps
 * across the face, while the smear and the swept collision follow the full arc.
 */
export const STRIKE_FROM = 0.33;
export const STRIKE_TO = 0.36;
export const SWING_ACTIVE: readonly [number, number] = [STRIKE_FROM, 0.72];
const SWING = {
  A: [[0, A0], [0.26, 252, out], [STRIKE_FROM, 258, linear], [STRIKE_TO, 352, linear], [0.46, 392, out], [0.58, 404, out], [1, A0 + 360]],
  F: [[0, F0], [0.26, 240, out], [STRIKE_FROM, 248, linear], [STRIKE_TO, 346, linear], [0.46, 386, out], [0.58, 401, out], [1, F0 + 360]],
  H: [[0, H0], [0.26, 204, out], [STRIKE_FROM, 214, linear], [STRIKE_TO, 392, linear], [0.46, 438, out], [0.58, 458, out], [1, H0 + 360]],
  lean: [[0, 0], [0.26, -5, out], [STRIKE_FROM, -6], [STRIKE_TO, 2, linear], [0.46, 9, out], [0.58, 10], [1, 0]],
  dx: [[0, 0], [0.26, -12, out], [STRIKE_TO, 8, linear], [0.46, 30, out], [0.58, 32], [1, 0]],
  stride: [[0, 0], [0.26, -0.35, out], [STRIKE_TO, 0.4, linear], [0.46, 1, out], [0.62, 1], [1, 0]],
} satisfies Record<string, Key[]>;

/** Drawn frames hold the overhead pose until the cut lands. */
export function displayU(u: number, from: number, to: number) {
  return u > from && u < to ? to : u;
}

function keyed(table: Record<"A" | "F" | "H" | "lean" | "dx" | "stride", readonly Key[]>, u: number): Joints {
  return {
    ...REST,
    A: track(table.A, u),
    F: track(table.F, u),
    H: track(table.H, u),
    lean: track(table.lean, u),
    dx: track(table.dx, u),
    stride: track(table.stride, u),
  };
}

export function swingJoints(u: number) {
  return keyed(SWING, u);
}

/** Super smash: a hop, a long overhead load, then a slam carried by the landing. */
export const SUPER_CUT_FROM = 0.42;
export const SUPER_CUT_TO = 0.46;
const SUPER = {
  A: [[0, A0], [0.3, 256, out], [SUPER_CUT_FROM, 264, linear], [SUPER_CUT_TO, 352, linear], [0.54, 404, out], [0.72, 412], [1, A0 + 360]],
  F: [[0, F0], [0.3, 248, out], [SUPER_CUT_FROM, 258, linear], [SUPER_CUT_TO, 346, linear], [0.54, 400, out], [0.72, 410], [1, F0 + 360]],
  H: [[0, H0], [0.3, 218, out], [SUPER_CUT_FROM, 232, linear], [SUPER_CUT_TO, 404, linear], [0.54, 452, out], [0.72, 462], [1, H0 + 360]],
  lean: [[0, 0], [0.34, -9, out], [SUPER_CUT_FROM, -10], [SUPER_CUT_TO, 4, linear], [0.54, 16, out], [0.72, 15], [1, 0]],
  dx: [[0, 0], [0.34, -14, out], [SUPER_CUT_TO, 10, linear], [0.54, 36, out], [0.72, 36], [1, 0]],
  stride: [[0, 0], [0.34, -0.4], [SUPER_CUT_TO, 0.5, linear], [0.54, 1, out], [0.76, 1], [1, 0]],
} satisfies Record<string, Key[]>;

export function superJoints(u: number) {
  return keyed(SUPER, u);
}

/**
 * Snot rocket: rear back to load the sinuses, then snap the whole body
 * forward. No hand comes up, so nothing ever sits on the face.
 */
export const SNOT_FIRE_U = 0.45;
/** Head-space points (the level head) expressed in torso space. */
const fromHead = (p: Point, lean: number) => rotateAround(p, NECK, -rad(lean));
export function snotJoints(u: number): Joints {
  return {
    ...REST,
    lean: track([[0, 0], [0.3, -6], [SNOT_FIRE_U - 0.03, -7], [SNOT_FIRE_U + 0.05, 10, out], [0.62, 7], [1, 0]], u),
    dx: track([[0, 0], [0.3, -10], [SNOT_FIRE_U - 0.03, -12], [SNOT_FIRE_U + 0.05, 16, out], [1, 0]], u),
    stride: track([[0, 0], [0.3, -0.3], [SNOT_FIRE_U + 0.05, 0.7, out], [0.7, 0.5], [1, 0]], u),
    A: A0 + track([[0, 0], [0.3, 14], [SNOT_FIRE_U - 0.03, 16], [SNOT_FIRE_U + 0.05, -14, out], [1, 0]], u),
    F: F0 + track([[0, 0], [0.3, 18], [SNOT_FIRE_U - 0.03, 20], [SNOT_FIRE_U + 0.05, -20, out], [1, 0]], u),
    H: H0 + track([[0, 0], [0.3, 22], [SNOT_FIRE_U - 0.03, 24], [SNOT_FIRE_U + 0.05, -26, out], [1, 0]], u),
  };
}

/*
 * Towel wipe: the far hand comes up behind the head, mops the bald crown and
 * the back of the head in two and a half strokes, then flicks the sweat off
 * behind him. Nothing passes over the eyes, nose or mouth.
 */
export const SCALP = { x: 232, y: 165, rx: 135, ry: 175 };
export const POCKET = { x: 72, y: 690 };
export const WIPE_SCRUB: readonly [number, number] = [0.12, 0.62];
export const WIPE_FLICK: readonly [number, number] = [0.62, 0.78];
export const WIPE_SHINE = 0.84;
export function scalpAngle(u: number) {
  const t = (u - WIPE_SCRUB[0]) / (WIPE_SCRUB[1] - WIPE_SCRUB[0]);
  return -110 + 40 * Math.cos(Math.max(0, Math.min(1, t)) * Math.PI * 5);
}
export function scalpPoint(theta: number, lift = 0): Point {
  const a = rad(theta);
  return { x: SCALP.x + Math.cos(a) * (SCALP.rx + lift), y: SCALP.y + Math.sin(a) * (SCALP.ry + lift) };
}
const bezier = (a: Point, c: Point, b: Point, t: number): Point => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
export function wipeHand(u: number): Point {
  if (u < WIPE_SCRUB[0]) return bezier(POCKET, { x: 10, y: 150 }, scalpPoint(-70), out(u / WIPE_SCRUB[0]));
  if (u < WIPE_FLICK[0]) return scalpPoint(scalpAngle(u));
  const back = scalpPoint(-150),
    flung = { x: 8, y: 262 };
  if (u < WIPE_FLICK[1]) {
    const t = out((u - WIPE_FLICK[0]) / (WIPE_FLICK[1] - WIPE_FLICK[0]));
    return { x: back.x + (flung.x - back.x) * t, y: back.y + (flung.y - back.y) * t };
  }
  return bezier(flung, { x: 20, y: 520 }, POCKET, smooth(Math.min(1, (u - WIPE_FLICK[1]) / 0.16)));
}
export function wipeJoints(u: number): Joints {
  const stroke = u > WIPE_SCRUB[0] && u < WIPE_SCRUB[1] ? Math.sin(((u - WIPE_SCRUB[0]) / 0.1) * Math.PI) : 0;
  const lean = track([[0, 0], [0.12, -3], [0.62, -3], [0.7, 3, out], [1, 0]], u) + stroke * 1.5;
  return {
    ...REST,
    lean,
    A: A0 + track([[0, 0], [0.12, -4], [0.62, -4], [0.7, 8], [1, 0]], u),
    H: H0 + track([[0, 0], [0.12, -6], [0.62, -6], [0.7, 10], [1, 0]], u),
    F: F0 + track([[0, 0], [0.12, -4], [0.62, -4], [0.7, 8], [1, 0]], u),
    far: u < 0.95 ? fromHead(wipeHand(u), lean) : null,
    pole: { x: 150, y: 470 },
  };
}

/** Lecture: plant the feet, point the mallet at them and wag it. */
export function lectureJoints(u: number, clock: number): Joints {
  const up = track([[0, 0], [0.16, 1, out], [0.84, 1], [1, 0]], u);
  const wag = u > 0.18 && u < 0.86 ? Math.sin(clock * 34) * 13 : 0;
  return {
    ...REST,
    lean: 4 * up,
    dx: 10 * up,
    A: A0 + (38 - A0) * up,
    F: F0 + (-14 - F0) * up,
    H: H0 + (-42 - H0) * up + wag,
  };
}

export function walkJoints(phase: number): Joints {
  const swing = Math.sin(phase * Math.PI * 2);
  return {
    ...REST,
    A: A0 - 9 * swing,
    F: F0 - 13 * swing,
    H: H0 - 12 * Math.sin(phase * Math.PI * 2 - 0.7),
  };
}

export const AIR: Joints = { ...REST, A: A0 - 22, F: F0 - 42, H: H0 - 26, lean: -2 };
export const CROUCH: Joints = { ...REST, A: A0 - 40, F: F0 - 74, H: H0 - 62 };
export function hurtJoints(t: number): Joints {
  const k = Math.min(1, t / 0.18);
  return { ...REST, lean: -8 * k, dx: -10 * k, A: A0 + 48 * k, F: F0 + 66 * k, H: H0 + 58 * k };
}
export const TUMBLE: Joints = { ...REST, lean: -14, A: 214, F: 238, H: 268 };

export { SWING_SECONDS, SUPER_SECONDS };
