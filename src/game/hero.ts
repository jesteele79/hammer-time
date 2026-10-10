import {
  HERO_HEIGHT,
  HERO_CROUCH_VISUAL_HEIGHT,
  LECTURE_SECONDS,
  SNOT_SECONDS,
  SUPER_SECONDS,
  SWING_SECONDS,
  WIPE_SECONDS,
  type Point,
} from "./combat";
import {
  AIR,
  ANKLE,
  CROUCH,
  CROWN,
  ELBOW,
  FACE,
  FAR_SHOULDER,
  FIST,
  GRIP,
  HIP,
  KNEE,
  LEG_HIPS,
  MALLET_HEAD,
  NECK,
  NECKLINE,
  NOSTRIL,
  REST,
  SHOULDER,
  STRIKE_FROM,
  STRIKE_TO,
  SUPER_CUT_FROM,
  SUPER_CUT_TO,
  TUMBLE,
  WIPE_FLICK,
  WIPE_SCRUB,
  WIPE_SHINE,
  armAngles,
  displayU,
  farArm,
  hurtJoints,
  coilJoints,
  idleJoints,
  lectureJoints,
  lungeJoints,
  rigPoint,
  scalpAngle,
  scalpPoint,
  pelvisTilt,
  snotJoints,
  squatLeg,
  squatOffset,
  superJoints,
  swingJoints,
  walkJoints,
  wipeHand,
  wipeJoints,
  type Joints,
} from "./rig";

export type HeroAssets = {
  idle: HTMLImageElement;
  body: HTMLImageElement;
  upper: HTMLImageElement;
  fore: HTMLImageElement;
  hand: HTMLImageElement;
  towel: HTMLImageElement;
};
export type HeroPose = {
  x: number;
  foot: number;
  facing: number;
  phase: number;
  moving: boolean;
  air: boolean;
  landing: number;
  swing: number;
  mega: number;
  wipe: number;
  snot: number;
  heat: number;
  hurt: number;
  star: number;
  reduced: boolean;
  clock: number;
  crouch?: boolean;
  lecture?: number;
  dead?: boolean;
  /** 0..1 temper shown as a popping vein beside the head. */
  anger?: number;
  /** Seconds standing idle; drives the watch check and foot tap. */
  idle?: number;
  /** Banquet dive: extension 0..1 and reach in world px. */
  lunge?: { u: number; reach: number };
  /** 0..1 wind-up before a charged dive. */
  coil?: number;
};

const SCALE = HERO_HEIGHT / 1371;

export function heroLift(p: Pick<HeroPose, "moving" | "phase" | "reduced">) {
  return p.moving && !p.reduced ? Math.abs(Math.sin(p.phase * Math.PI * 2)) * 0.85 : 0;
}

export function artworkToWorld(p: HeroPose, point: Point): Point {
  return {
    x: p.x + p.facing * (-456 * SCALE * 0.42 + point.x * SCALE),
    y: p.foot - (p.crouch ? HERO_CROUCH_VISUAL_HEIGHT : HERO_HEIGHT) - heroLift(p) + point.y * SCALE,
  };
}

/**
 * The single source of the skeleton for drawing and contact. `continuous`
 * ignores the strike's display cut so collision can follow the full arc.
 */
export function heroJoints(p: HeroPose, continuous = false): Joints {
  if (p.dead) return TUMBLE;
  if (p.mega > 0) {
    const u = 1 - p.mega / SUPER_SECONDS;
    return superJoints(continuous ? u : displayU(u, SUPER_CUT_FROM, SUPER_CUT_TO));
  }
  if (p.swing > 0) {
    const u = 1 - p.swing / SWING_SECONDS;
    return swingJoints(continuous ? u : displayU(u, STRIKE_FROM, STRIKE_TO));
  }
  if (p.lunge && p.lunge.u > 0) return lungeJoints(p.lunge.u, p.lunge.reach);
  if ((p.coil ?? 0) > 0) return coilJoints(p.coil!);
  if ((p.lecture ?? 0) > 0) return lectureJoints(1 - p.lecture! / LECTURE_SECONDS, p.clock);
  if (p.wipe > 0) return wipeJoints(1 - p.wipe / WIPE_SECONDS);
  if (p.snot > 0) return snotJoints(1 - p.snot / SNOT_SECONDS);
  if (p.hurt > 0) return hurtJoints(p.hurt);
  if (p.crouch) return CROUCH;
  if (p.air) return AIR;
  if (p.moving && !p.reduced) return walkJoints(p.phase);
  const idle = p.idle ? idleJoints(p.idle, p.reduced) : null;
  return idle ?? REST;
}

export function heroMallet(p: HeroPose, continuous = false) {
  return artworkToWorld(p, rigPoint(heroJoints(p, continuous), MALLET_HEAD, "mallet"));
}

export function heroNostril(p: HeroPose) {
  return artworkToWorld(p, rigPoint(heroJoints(p), NOSTRIL, "head"));
}

/** World position of the far hand when it is out (the dive, the watch, the towel), else null. */
export function heroFarHand(p: HeroPose): Point | null {
  const j = heroJoints(p);
  if (!j.far) return null;
  return artworkToWorld(p, rigPoint(j, farArm(j).hand, "torso"));
}

/** World-space face box and the crown above it, for anything placed near his head. */
export function heroFace(p: HeroPose) {
  const j = heroJoints(p);
  const [a, b] = FACE.map((c) => artworkToWorld(p, rigPoint(j, c, "head")));
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
    crown: artworkToWorld(p, rigPoint(j, CROWN, "head")),
  };
}

/* Clip outlines on the cut-out canvas. */
const SLEEVE = [[38, 296], [70, 281], [122, 287], [160, 336], [164, 460], [42, 460]];
const TORSO_FILL = [[55, 300], [122, 287], [160, 336], [164, 460], [55, 460]];
const FOREARM = [
  [70, 624], [152, 624], [163, 690], [176, 740], [199, 770], [201, 808], [186, 822], [178, 848],
  [160, 862], [140, 860], [118, 846], [100, 830], [97, 800], [98, 765], [103, 745], [88, 700], [72, 660],
];
const HANDLE = [[14, 722], [327, 889], [310, 921], [-3, 754]];
const HEAD = [[352, 820], [456, 866], [456, 950], [432, 990], [416, 1050], [266, 1000], [296, 900]];
const HEAD_CLIP = [
  [-40, -80], [480, -80], [480, 290], [272, 296], [262, 326], [253, 338], [227, 345], [200, 338],
  [180, 323], [163, 305], [140, 274], [118, 254], [100, 205],
];
const CAP = 52;
const KNEE_CAP = 62;
const HEEL = { x: 88, y: 1348 };

function outline(ctx: CanvasRenderingContext2D, ...shapes: number[][][]) {
  for (const shape of shapes) {
    shape.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
}
function clipShapes(ctx: CanvasRenderingContext2D, ...shapes: number[][][]) {
  ctx.beginPath();
  outline(ctx, ...shapes);
  ctx.clip();
}
function pivot(ctx: CanvasRenderingContext2D, c: Point, a: number) {
  ctx.translate(c.x, c.y);
  ctx.rotate(a);
  ctx.translate(-c.x, -c.y);
}
const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;

const shaded = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
/** The far arm reuses the near arm photography, a shade darker for depth. */
function shade(img: HTMLImageElement) {
  let canvas = shaded.get(img);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const g = canvas.getContext("2d")!;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(42,22,14,0.2)";
    g.fillRect(0, 0, canvas.width, canvas.height);
    shaded.set(img, canvas);
  }
  return canvas;
}

function upperSegment(ctx: CanvasRenderingContext2D, img: CanvasImageSource) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 456, ELBOW.y - CAP);
  ctx.moveTo(ELBOW.x + CAP, ELBOW.y);
  ctx.arc(ELBOW.x, ELBOW.y, CAP, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
function foreSegment(ctx: CanvasRenderingContext2D, upper: CanvasImageSource, fore: CanvasImageSource) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ELBOW.y - CAP, 456, 420);
  ctx.moveTo(ELBOW.x + CAP - 4, ELBOW.y);
  ctx.arc(ELBOW.x, ELBOW.y, CAP - 4, 0, Math.PI * 2);
  ctx.clip("evenodd");
  ctx.drawImage(upper, 0, 0);
  ctx.restore();
  ctx.save();
  clipShapes(ctx, FOREARM);
  ctx.drawImage(fore, 0, 0);
  ctx.restore();
}

function nearArm(ctx: CanvasRenderingContext2D, a: HeroAssets, j: Joints) {
  const { s, e, w } = armAngles(j);
  ctx.save();
  pivot(ctx, SHOULDER, s);
  ctx.save();
  pivot(ctx, ELBOW, e);
  ctx.save();
  pivot(ctx, GRIP, w);
  clipShapes(ctx, HANDLE, HEAD);
  ctx.drawImage(a.fore, 0, 0);
  ctx.restore();
  foreSegment(ctx, a.upper, a.fore);
  ctx.restore();
  upperSegment(ctx, a.upper);
  ctx.save();
  clipShapes(ctx, SLEEVE);
  ctx.drawImage(a.body, 0, 0);
  ctx.restore();
  ctx.restore();
}

function farArmLayer(ctx: CanvasRenderingContext2D, a: HeroAssets, j: Joints) {
  const { elbow, hand } = farArm(j);
  const upper = shade(a.upper),
    fore = shade(a.fore);
  const turn = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.translate(elbow.x, elbow.y);
  ctx.rotate(turn(elbow, hand) - turn(ELBOW, FIST));
  ctx.translate(-ELBOW.x, -ELBOW.y);
  foreSegment(ctx, upper, fore);
  wristWatch(ctx);
  ctx.restore();
  ctx.save();
  ctx.translate(FAR_SHOULDER.x, FAR_SHOULDER.y);
  ctx.rotate(turn(FAR_SHOULDER, elbow) - turn(SHOULDER, ELBOW));
  ctx.translate(-SHOULDER.x, -SHOULDER.y);
  upperSegment(ctx, upper);
  ctx.restore();
}

/** He always wears it; it only shows when the far arm comes out front. */
function wristWatch(ctx: CanvasRenderingContext2D) {
  const wrist = { x: ELBOW.x + (FIST.x - ELBOW.x) * 0.78, y: ELBOW.y + (FIST.y - ELBOW.y) * 0.78 };
  ctx.save();
  pivot(ctx, wrist, Math.atan2(FIST.y - ELBOW.y, FIST.x - ELBOW.x) - Math.PI / 2);
  ctx.fillStyle = "#2a2622";
  ctx.fillRect(wrist.x - 34, wrist.y - 11, 68, 22);
  ctx.fillStyle = "#d9b45a";
  ctx.beginPath();
  ctx.arc(wrist.x + 26, wrist.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6efd8";
  ctx.beginPath();
  ctx.arc(wrist.x + 26, wrist.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Thigh, knee and extra shoe rotation for one leg, inside the squat's sink and
 * pelvis tilt. The renderer draws exactly this chain.
 */
export function legAngles(p: HeroPose, j: Joints, rear: boolean) {
  const stance = j.stride;
  const stride = p.moving && !p.reduced ? Math.sin(p.phase * Math.PI * 2) : 0;
  const squat = p.crouch ? 0 : j.squat;
  const tilt = pelvisTilt(squat);
  const hip = rear ? LEG_HIPS.rear : LEG_HIPS.front;
  const posed = p.crouch
    ? -1.36
    : p.air
      ? rear
        ? 0.12
        : -0.32
      : stride * (rear ? -0.24 : 0.24) + stance * (rear ? -0.2 : 0.11);
  const bent = p.crouch
    ? 2.72
    : p.air
      ? 0.45
      : Math.max(0, stride * (rear ? -1 : 1)) * 0.28 + Math.max(0, stance) * (rear ? 0.18 : 0.06);
  // The solved leg keeps the foot where the unsquatted leg stands; a knee that
  // has to swap to its forward side gets a one-frame blend instead of a pop.
  const ik = squatLeg(hip, squat, { thigh: posed, knee: bent });
  const t = ik.flipped ? Math.min(1, squat / 0.05) : 1,
    w = t * t * (3 - 2 * t);
  const thigh = posed + (ik.thigh - posed) * w;
  const knee = bent + (ik.knee - bent) * w;
  // The shoe keeps the unsquatted foot's angle while the shin folds over it.
  return { hip, squat, tilt, thigh, knee, shoe: posed + bent - (tilt + thigh + knee) };
}

function legs(ctx: CanvasRenderingContext2D, a: HeroAssets, p: HeroPose, j: Joints) {
  const squat = p.crouch ? 0 : j.squat;
  const sink = squatOffset(squat);
  const tilt = pelvisTilt(squat);
  const leg = (rear: boolean) => {
    ctx.save();
    if (p.crouch) ctx.translate(0, -180);
    const { hip, thigh, knee, shoe } = legAngles(p, j, rear);
    ctx.translate(sink.x, sink.y);
    pivot(ctx, HIP, tilt);
    pivot(ctx, hip, thigh);
    const folded = squat > 0;
    const thighPiece = () => {
      ctx.save();
      ctx.beginPath();
      if (folded) {
        outline(ctx, [[80, 920], [241, 932], [199, 1085], [195, KNEE.y], [80, KNEE.y], [72, 1080]]);
        ctx.moveTo(KNEE.x + KNEE_CAP, KNEE.y);
        ctx.arc(KNEE.x, KNEE.y, KNEE_CAP, 0, Math.PI * 2);
      } else outline(ctx, [[80, 920], [241, 932], [199, 1085], [177, 1120], [83, 1120], [72, 1080]]);
      ctx.clip();
      ctx.drawImage(a.idle, 0, 0);
      ctx.restore();
    };
    if (!folded) thighPiece();
    ctx.save();
    pivot(ctx, KNEE, knee);
    ctx.save();
    ctx.beginPath();
    outline(ctx, [[85, 1080], [190, 1080], [150, 1248], [76, 1255]]);
    ctx.clip();
    ctx.drawImage(a.idle, 0, 0);
    ctx.restore();
    // Different original shoe crops keep the layered feet readable.
    if (!p.crouch) {
      pivot(ctx, ANKLE, shoe);
      if (rear) ctx.drawImage(a.idle, 130, 1175, 215, 121, 81, 1200, 215, 121);
      else {
        pivot(ctx, HEEL, -0.24 * j.tap);
        ctx.drawImage(a.idle, 43, 1225, 258, 146, 43, 1225, 258, 146);
      }
    }
    ctx.restore();
    // A folded knee keeps the thigh on top, ending in a round cap like the elbow.
    if (folded) thighPiece();
    ctx.restore();
    if (p.crouch) ctx.drawImage(a.idle, 43, 1225, 258, 146, rear ? 116 : 180, 771, 185, 106);
  };
  leg(true);
  leg(false);

  // Shorts are rebuilt from clean denim samples; they reach up under the shirt
  // so a leaning torso never opens a gap at the waist.
  ctx.save();
  ctx.translate(sink.x, sink.y);
  pivot(ctx, HIP, tilt);
  ctx.beginPath();
  outline(
    ctx,
    p.crouch
      ? [[58, 690], [300, 700], [315, 811], [237, 840], [145, 843], [73, 827]]
      : [[58, 686], [300, 700], [283, 920], [243, 934], [145, 946], [73, 934]],
  );
  ctx.clip();
  ctx.drawImage(a.idle, 220, 742, 60, 75, 57, 686, 260, p.crouch ? 159 : 261);
  ctx.strokeStyle = "#b0bfd4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(170, 727);
  ctx.lineTo(145, p.crouch ? 840 : 916);
  ctx.stroke();
  ctx.strokeStyle = "#263a58";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, p.crouch ? 820 : 919);
  ctx.lineTo(144, p.crouch ? 839 : 925);
  ctx.lineTo(243, p.crouch ? 836 : 930);
  ctx.lineTo(282, p.crouch ? 815 : 913);
  ctx.stroke();
  ctx.restore();
}

function torso(ctx: CanvasRenderingContext2D, a: HeroAssets, lean: number) {
  ctx.save();
  ctx.beginPath();
  outline(ctx, [[55, 451], [98, 454], [149, 544], [163, 675], [164, 715], [59, 701], [52, 632], [65, 570]]);
  ctx.clip();
  ctx.drawImage(a.idle, 170, 500, 80, 160, 52, 448, 115, 279);
  ctx.restore();
  // The sleeve travels with the shoulder, so the torso behind it is patched.
  ctx.save();
  ctx.beginPath();
  outline(ctx, TORSO_FILL);
  ctx.clip();
  ctx.drawImage(a.idle, 165, 470, 45, 110, 50, 282, 118, 182);
  ctx.restore();
  // Level head first; the collar of the torso piece covers its tucked-in base.
  ctx.save();
  pivot(ctx, NECK, -lean);
  ctx.beginPath();
  outline(ctx, HEAD_CLIP);
  ctx.clip();
  ctx.drawImage(a.body, 0, 0, 456, 727, 0, 0, 456, 727);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  outline(ctx, [...NECKLINE, [480, 760], [-40, 760]], SLEEVE);
  ctx.clip("evenodd");
  ctx.drawImage(a.body, 0, 0, 456, 727, 0, 0, 456, 727);
  ctx.restore();
}

/* Towel: slices of the approved photo laid along a cloth path. */
type Ribbon = { pts: Point[]; front: number };
function towelPath(u: number, clock: number): Ribbon {
  const hand = wipeHand(u);
  const pts: Point[] = [hand];
  const length = 290;
  let used = 0;
  const push = (q: Point) => {
    const last = pts[pts.length - 1];
    used += Math.hypot(q.x - last.x, q.y - last.y);
    pts.push(q);
  };
  let front = 0;
  if (u >= WIPE_SCRUB[0] && u < WIPE_FLICK[0]) {
    for (let theta = scalpAngle(u) - 8; theta > -172 && used < length; theta -= 8) push(scalpPoint(theta, 16));
    front = used;
    const sway = Math.sin(clock * 9) * 10;
    while (used < length) {
      const last = pts[pts.length - 1];
      push({ x: last.x - 4 + sway * 0.1, y: last.y + 22 });
    }
  } else if (u >= WIPE_FLICK[0] && u < WIPE_FLICK[1] + 0.06) {
    const t = (u - WIPE_FLICK[0]) / (WIPE_FLICK[1] + 0.06 - WIPE_FLICK[0]);
    front = length;
    for (let i = 1; i <= 12; i++) {
      const k = i / 12;
      pts.push({
        x: hand.x - k * length * (0.55 + 0.4 * t),
        y: hand.y - 30 * k + Math.sin(k * 7 - t * 16) * 34 * k + 120 * k * k * (1 - t),
      });
    }
  } else {
    const sway = Math.sin(clock * 6) * 8;
    for (let i = 1; i <= 10; i++) pts.push({ x: hand.x - 6 * i + sway * (i / 10), y: hand.y + 29 * i });
  }
  return { pts, front };
}

function drawTowel(ctx: CanvasRenderingContext2D, img: HTMLImageElement, ribbon: Ribbon, layer: "front" | "back") {
  if (!ready(img)) return;
  const { pts, front } = ribbon;
  const lengths = [0];
  for (let i = 1; i < pts.length; i++)
    lengths.push(lengths[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = lengths[lengths.length - 1];
  if (total < 1) return;
  const crop = { x: 189, y: 29, w: 662, h: 1480 };
  for (let i = 1; i < pts.length; i++) {
    const inFront = lengths[i - 1] < front;
    if ((layer === "front") !== inFront) continue;
    const a = pts[i - 1],
      b = pts[i];
    const seg = lengths[i] - lengths[i - 1];
    if (seg < 0.5) continue;
    const t0 = lengths[i - 1] / total,
      t1 = lengths[i] / total;
    const width = 44 + 82 * Math.min(1, ((t0 + t1) / 2) * 3.2);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2);
    ctx.drawImage(img, crop.x, crop.y + crop.h * t0, crop.w, crop.h * (t1 - t0), -width / 2, -1, width, seg + 2);
    ctx.restore();
  }
}

/** Deterministic droplets so the wipe reads the same in play and on pose boards. */
function sweatSpray(ctx: CanvasRenderingContext2D, u: number) {
  ctx.fillStyle = "rgba(214,238,248,0.9)";
  const drop = (x: number, y: number, vx: number, vy: number, age: number) => {
    if (age < 0 || age > 0.34) return;
    const px = x + vx * age,
      py = y + vy * age + 3400 * age * age;
    ctx.globalAlpha = 1 - age / 0.34;
    ctx.beginPath();
    ctx.ellipse(px, py, 7, 11, Math.atan2(vy + 6800 * age, vx) - Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let k = 0; k <= 5; k++) {
    const at = WIPE_SCRUB[0] + (k * (WIPE_SCRUB[1] - WIPE_SCRUB[0])) / 5;
    const theta = scalpAngle(at + 0.0001);
    const o = scalpPoint(theta, 10);
    for (let i = 0; i < 4; i++) {
      const spread = ((theta + (i - 1.5) * 22) * Math.PI) / 180;
      drop(o.x, o.y, Math.cos(spread) * (520 + i * 90), Math.sin(spread) * (620 + i * 70) - 260, (u - at) * WIPE_SECONDS);
    }
  }
  const flick = WIPE_FLICK[0] + 0.05;
  const hand = wipeHand(flick);
  for (let i = 0; i < 9; i++)
    drop(hand.x - i * 22, hand.y - 10 + (i % 3) * 14, -700 - i * 70, -420 + (i % 4) * 120, (u - flick) * WIPE_SECONDS);
  ctx.globalAlpha = 1;
}

function strikeSmear(ctx: CanvasRenderingContext2D, p: HeroPose) {
  const mega = p.mega > 0;
  if (!mega && p.swing <= 0) return;
  const u = mega ? 1 - p.mega / SUPER_SECONDS : 1 - p.swing / SWING_SECONDS;
  const from = mega ? SUPER_CUT_FROM : STRIKE_FROM;
  const fade = 1 - (u - from) / 0.16;
  if (u < from || fade <= 0) return;
  const joints = mega ? superJoints : swingJoints;
  const start = Math.max(from - 0.02, u - 0.1);
  const pts: Point[] = [];
  for (let k = 0; k <= 18; k++) pts.push(rigPoint(joints(start + ((u - start) * k) / 18), MALLET_HEAD, "mallet"));
  const n = pts.length;
  const left: Point[] = [],
    right: Point[] = [];
  pts.forEach((q, i) => {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len,
      ny = (b.x - a.x) / len;
    const half = 8 + 84 * (i / (n - 1)) ** 1.6;
    left.push({ x: q.x + nx * half, y: q.y + ny * half });
    right.push({ x: q.x - nx * half, y: q.y - ny * half });
  });
  const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y);
  g.addColorStop(0, "rgba(255,250,238,0)");
  g.addColorStop(0.55, `rgba(255,250,238,${0.5 * fade})`);
  g.addColorStop(1, `rgba(255,252,244,${0.92 * fade})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  left.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = "round";
  for (const [offset, color, width] of [
    [0.55, `rgba(214,170,112,${0.7 * fade})`, 9],
    [-0.35, `rgba(255,255,255,${0.75 * fade})`, 5],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach((q, i) => {
      const x = q.x + (left[i].x - q.x) * offset,
        y = q.y + (left[i].y - q.y) * offset;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
}

function heatFx(ctx: CanvasRenderingContext2D, p: HeroPose) {
  if (p.heat > 45 && p.wipe <= 0 && !p.reduced) {
    // Sweat runs down the back of the head and pops off the crown; the face stays clear.
    ctx.fillStyle = "rgba(214,236,244,0.8)";
    for (let i = 0; i < 3; i++) {
      const t = (p.clock * 0.9 + i * 0.37) % 1;
      ctx.globalAlpha = Math.min(1, (1 - t) * 2);
      ctx.beginPath();
      ctx.ellipse(126 + i * 6 - t * 4, 92 + i * 52 + t * 70, 5, 8, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    const pop = (p.clock * 1.4) % 1;
    for (const [x, y, dir] of [
      [150, 18, -1],
      [300, 2, 1],
    ]) {
      ctx.globalAlpha = 1 - pop;
      ctx.beginPath();
      ctx.ellipse(x + dir * pop * 60, y - pop * 70 + pop * pop * 90, 7, 11, dir * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (p.heat >= 80 && !p.reduced) {
    ctx.strokeStyle = "rgba(236,240,240,0.5)";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const t = (p.clock * 0.8 + i / 3) % 1;
      const x = 190 + i * 45,
        y = -10 - t * 150;
      ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 24, y - 25, x - 24, y - 45, x + 6, y - 72);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const anger = p.anger ?? 0;
  if (anger > 0) {
    // Comic vein mark off the back of the head.
    const pulse = 1 + Math.sin(p.clock * 12) * 0.12 * anger;
    ctx.save();
    ctx.translate(118, 12);
    ctx.scale(pulse * 1.15, pulse * 1.15);
    ctx.strokeStyle = `rgba(226,48,40,${0.55 + 0.45 * anger})`;
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(10, -26);
      ctx.quadraticCurveTo(12, -10, 28, -9);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Only runtime clipping/transforms: the approved face and shirt source pixels are untouched. */
export function drawHero(ctx: CanvasRenderingContext2D, a: HeroAssets, p: HeroPose, cam = 0) {
  const j = heroJoints(p);
  ctx.save();
  ctx.translate(p.x - cam, p.foot);
  ctx.fillStyle = "rgba(5,10,15,0.32)";
  ctx.beginPath();
  ctx.ellipse(p.facing * j.dx * SCALE, 0, p.air ? 5 : 8 + Math.abs(j.stride) * 2, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.star > 0) {
    ctx.strokeStyle = "rgba(255,213,83,0.85)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(0, -HERO_HEIGHT / 2, 14, 25, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const t = p.clock * 3 + (i * Math.PI * 2) / 5;
      ctx.fillStyle = "#ffe598";
      ctx.beginPath();
      ctx.arc(Math.cos(t) * 12, -22 + Math.sin(t) * 22, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.scale(p.facing, 1);
  ctx.translate(-456 * SCALE * 0.42, -(p.crouch ? HERO_CROUCH_VISUAL_HEIGHT : HERO_HEIGHT) - heroLift(p));
  ctx.scale(SCALE, SCALE);
  ctx.translate(j.dx, 0);

  const wiping = p.wipe > 0;
  const wipeU = wiping ? 1 - p.wipe / WIPE_SECONDS : 0;
  const ribbon = wiping && wipeU > 0.03 && wipeU < 0.93 ? towelPath(wipeU, p.clock) : null;
  const lean = (j.lean * Math.PI) / 180;
  const sink = squatOffset(j.squat);
  const torsoFrame = () => {
    ctx.translate(sink.x, sink.y);
    pivot(ctx, HIP, lean);
  };
  const headFrame = () => {
    torsoFrame();
    pivot(ctx, NECK, -lean);
  };

  if (j.far) {
    ctx.save();
    torsoFrame();
    farArmLayer(ctx, a, j);
    ctx.restore();
  }
  if (ribbon) {
    ctx.save();
    headFrame();
    drawTowel(ctx, a.towel, ribbon, "back");
    ctx.restore();
  }
  legs(ctx, a, p, j);
  ctx.save();
  torsoFrame();
  torso(ctx, a, lean);
  ctx.restore();
  if (ribbon) {
    ctx.save();
    headFrame();
    drawTowel(ctx, a.towel, ribbon, "front");
    ctx.restore();
  }

  ctx.save();
  ctx.translate(-j.dx, 0);
  strikeSmear(ctx, p);
  ctx.restore();

  ctx.save();
  torsoFrame();
  nearArm(ctx, a, j);
  // At rest the far hand peeks out in front of the shorts, as in the original still.
  if (!j.far && !j.squat && ready(a.hand)) ctx.drawImage(a.hand, 275, 729, 50, 62, 275, 729, 50, 62);
  ctx.restore();

  ctx.save();
  headFrame();
  if (wiping) {
    sweatSpray(ctx, wipeU);
    shine(ctx, wipeU);
  }
  heatFx(ctx, p);
  ctx.restore();
  ctx.restore();
}

/** A squeaky-clean glint on the bald crown once the towel is done. */
function shine(ctx: CanvasRenderingContext2D, u: number) {
  const t = (u - WIPE_SHINE) / 0.14;
  if (t < 0 || t > 1) return;
  const at = scalpPoint(-88, -16),
    size = Math.sin(t * Math.PI) * 46;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(t * 1.2);
  ctx.fillStyle = "rgba(255,255,244,0.95)";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? size * 0.18 : size;
    const a = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
