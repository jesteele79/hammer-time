import type { CastAct, CastRole } from "../cast";
import { CAST, T } from "../cast";
import { flatFeet } from "./clips";
import type { Ground } from "./ground";
import { armTo } from "./ik";
import { pose, smooth, track, type Key, type Pose } from "./pose";
import type { JointName } from "./skeleton";

/**
 * The cast's poses on Hammer's skeleton (the R2b design §7): every act of every role, as rotations
 * away from the painted stance. Pure, so the checks can step through every frame.
 */
export type CastPoseCtx = { role: CastRole; act: CastAct; t: number; speed: number; onGround: boolean; sit: boolean; spin: number; hits: number };

const TAU = Math.PI * 2;
type K = readonly Key[];
const at = (keys: K, u: number) => track(keys, u);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Both arms hanging at the sides (the painting reaches them forward). */
const HANG = { shoulderNear: -30, shoulderFar: -34 } as const;

/** Seconds each timed act plays for, for the boards and the smoothness check; loops are 0. */
export const ACT_SECONDS: Record<CastAct, number> = {
  idle: 0,
  walk: 0,
  notice: T.notice,
  windup: 0.7,
  attack: 0.6,
  recover: 0.4,
  chase: 0,
  return: 0,
  hide: 0,
  bumped: T.bump,
  fly: 0,
  down: 0,
  getup: T.getup,
  leave: 0,
  slide: 0,
  slip: T.slip,
  frozen: 0,
  schooled: 0,
  duck: CAST.student.duck,
  hop: CAST.student.hopT,
  flee: 0,
};

/** How an act stands on the floor: on the feet, or on whatever is lowest (sitting, lying, sliding). */
export function castGround(act: CastAct, onGround: boolean, sit: boolean): Ground {
  if (!onGround || act === "fly" || act === "hop") return "none";
  if (act === "down" || act === "slide" || act === "slip" || act === "schooled" || act === "getup" || sit) return "body";
  return act === "flee" || act === "attack" ? "push" : "planted";
}

/** A walk or run cycle on both legs with the arms swinging against them; `u` is the cycle. */
function stride(u: number, run: boolean, arms = 1): Partial<Record<JointName, number>> {
  const phi = TAU * u;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const hip = run ? 32 : 20;
  const knee = run ? 56 : 34;
  return flatFeet(
    {
      hipNear: hip * s,
      kneeNear: -(run ? 8 : 0) - knee * Math.max(0, c),
      hipFar: -hip * s,
      kneeFar: -(run ? 8 : 0) - knee * Math.max(0, -c),
      shoulderNear: HANG.shoulderNear - 14 * s * arms,
      elbowNear: (run ? 60 : 6) + 10 * Math.max(0, -s) * arms,
      shoulderFar: HANG.shoulderFar + 14 * s * arms,
      elbowFar: (run ? 60 : 6) + 10 * Math.max(0, s) * arms,
    },
    run ? 0.6 : 0.75,
  );
}

type Hands = { rot: Partial<Record<JointName, number>>; lean: number; headTilt: number };

/** The role's hands at rest: the tray up, the cup and the phone, the rail lean, or hanging. */
function hands(role: CastRole, t: number): Hands {
  if (role === "server") {
    const near = armTo("near", { x: 66, y: 262 + 2 * Math.sin(t * TAU * 0.6) }, 0, -1);
    return { rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: HANG.shoulderFar }, lean: 2, headTilt: 0 };
  }
  if (role === "office") {
    const near = armTo("near", { x: 52, y: 212 }, 20, -1);
    const far = armTo("far", { x: 58, y: 248 }, 65, -1);
    return {
      rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist },
      lean: 4,
      headTilt: 12,
    };
  }
  if (role === "student") {
    const near = armTo("near", { x: 62, y: 250 }, 70, -1);
    return { rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: HANG.shoulderFar + 6 }, lean: -3, headTilt: 6 };
  }
  // The bellhop: hands at his sides, chest out; every six seconds a polish of the cart's rail.
  const cycle = t % 6;
  const polishing = cycle > 3.5 && cycle < 5.5;
  const rub = polishing ? 8 * Math.sin(cycle * TAU * 1.5) : 0;
  const k = smooth(clamp01(polishing ? Math.min(cycle - 3.5, 5.5 - cycle) / 0.3 : 0));
  return { rot: { shoulderNear: HANG.shoulderNear + 70 * k, elbowNear: (40 + rub) * k, shoulderFar: HANG.shoulderFar }, lean: -3, headTilt: -2 };
}

const idle = (role: CastRole, t: number, sit: boolean): Pose => {
  const breath = Math.sin(TAU * 0.4 * t);
  const h = hands(role, t);
  if (sit)
    return pose({
      rot: { ...h.rot, hipNear: 92, kneeNear: -104, hipFar: 88, kneeFar: -100, ankleNear: 10, ankleFar: 10 },
      lean: h.lean + 6,
      headTilt: h.headTilt,
      root: { x: 0, y: -40 },
    });
  const rail = role === "student" ? { lean: 14, hip: -8 } : { lean: 0, hip: 0 };
  return pose({
    rot: { ...h.rot, chest: 1.2 * breath, hipNear: rail.hip, hipFar: rail.hip },
    lean: h.lean + rail.lean + 0.8 * breath,
    headTilt: h.headTilt + 0.6 * breath,
  });
};

const walk = (role: CastRole, t: number, speed: number, run: boolean, arms = 1): Pose => {
  const u = ((t * Math.max(120, speed)) / 280) % 1;
  const rot = stride(u, run, arms);
  const h = hands(role, t);
  // A carried tray, cup or phone keeps that arm where it is; the other swings.
  if (role === "server" || role === "office" || role === "student") Object.assign(rot, { shoulderNear: h.rot.shoulderNear, elbowNear: h.rot.elbowNear, wristNear: h.rot.wristNear });
  if (role === "office") Object.assign(rot, { shoulderFar: h.rot.shoulderFar, elbowFar: h.rot.elbowFar, wristFar: h.rot.wristFar });
  return pose({ rot, lean: run ? 12 : 3 + (role === "office" ? 4 : 0), headTilt: role === "office" ? 12 : 0 });
};

// The double-take: a look, back, and a longer look with the shoulders up.
const NOTICE = {
  headTilt: [[0, 0], [0.12, -8], [0.24, 0], [0.4, -9], [0.6, -4]] as K,
  lean: [[0, 0], [0.12, -3], [0.24, 0], [0.4, -7], [0.6, -5]] as K,
  arms: [[0, 0], [0.3, 0], [0.42, 1], [0.6, 0.6]] as K,
};
const notice = (role: CastRole, t: number): Pose => {
  const u = clamp01(t / T.notice);
  const h = hands(role, t);
  const up = at(NOTICE.arms, u);
  return pose({
    rot: { ...h.rot, shoulderNear: (h.rot.shoulderNear ?? HANG.shoulderNear) + 25 * up, shoulderFar: (h.rot.shoulderFar ?? HANG.shoulderFar) + 25 * up, chest: -3 * up },
    lean: h.lean + at(NOTICE.lean, u),
    headTilt: h.headTilt + at(NOTICE.headTilt, u),
  });
};

// Wind-ups: the bellhop grips and rocks the cart, the server drops into a sprinter's crouch with the
// tray held high, the office worker rears back with the cup, the student cocks the arm.
const windup = (role: CastRole, t: number): Pose => {
  const u = clamp01(t / 0.7);
  const k = smooth(Math.min(1, u * 3));
  if (role === "bellhop") {
    const near = armTo("near", { x: 92, y: 200 }, -10, -1);
    const far = armTo("far", { x: 96, y: 206 }, -10, -1);
    const rock = -8 * Math.max(0, Math.sin(t * TAU * 3)) * k;
    return pose({
      rot: flatFeet(
        {
          shoulderNear: near.shoulder * k + HANG.shoulderNear * (1 - k),
          elbowNear: near.elbow * k,
          wristNear: near.wrist * k,
          shoulderFar: far.shoulder * k + HANG.shoulderFar * (1 - k),
          elbowFar: far.elbow * k,
          wristFar: far.wrist * k,
          hipNear: 38 * k,
          kneeNear: -58 * k,
          hipFar: 34 * k,
          kneeFar: -54 * k,
        },
        1,
      ),
      lean: 22 * k,
      root: { x: rock, y: 0 },
    });
  }
  if (role === "server") {
    // The tray held high and forward, clear of her face.
    const near = armTo("near", { x: 104, y: 326 }, 0, -1);
    return pose({
      rot: flatFeet(
        { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: HANG.shoulderFar - 40 * k, elbowFar: 30 * k, hipNear: 62 * k, kneeNear: -92 * k, hipFar: -26 * k, kneeFar: -16 * k },
        0.7,
      ),
      lean: 30 * k,
      root: { x: 0, y: -24 * k },
    });
  }
  if (role === "office") {
    const near = armTo("near", { x: -40 + 90 * (1 - k), y: 230 }, 40, -1);
    const far = armTo("far", { x: 58, y: 248 }, 65, -1);
    return pose({
      rot: {
        shoulderNear: near.shoulder,
        elbowNear: near.elbow,
        wristNear: near.wrist,
        shoulderFar: far.shoulder,
        elbowFar: far.elbow,
        wristFar: far.wrist,
        hipNear: 10 * k,
        kneeNear: -20 * k,
        hipFar: 10 * k,
        kneeFar: -20 * k,
      },
      lean: -16 * k,
      headTilt: 4,
    });
  }
  // The arm cocks back over a third of a second: a long swing, taken slowly enough to read.
  const ks = smooth(Math.min(1, u * 2));
  const near = armTo("near", { x: -36, y: 300 }, 120, 1);
  return pose({
    rot: { shoulderNear: near.shoulder * ks + HANG.shoulderNear * (1 - ks), elbowNear: near.elbow * ks, wristNear: near.wrist * ks, shoulderFar: HANG.shoulderFar + 10 * ks, chest: -4 * ks },
    lean: -6 * ks,
    headTilt: -3 * ks,
  });
};

// The throw: from the arm cocked up behind to flung forward, over the top, the shoulder turning one way
// the whole way (a solve each frame would wrap at 180 degrees).
const COCK = armTo("near", { x: -36, y: 300 }, 120, 1);
const THROWN = armTo("near", { x: 104, y: 240 }, -10, -1);
const overTheTop = (a: number, b: number) => (b > a ? b - 360 : b);
const shortWay = (a: number, b: number) => a + ((((b - a + 180) % 360) + 360) % 360) - 180;

// Attacks: the shove, the rush, the leap, the throw.
const attack = (role: CastRole, t: number, speed: number): Pose => {
  if (role === "bellhop") {
    const k = smooth(clamp01(t / 0.25));
    const near = armTo("near", { x: 110 + 20 * k, y: 215 }, 0, -1);
    const far = armTo("far", { x: 112 + 20 * k, y: 220 }, 0, -1);
    return pose({
      rot: flatFeet(
        { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist, hipNear: 30, kneeNear: -40, hipFar: -10, kneeFar: -10 },
        0.8,
      ),
      lean: 24 - 6 * k,
    });
  }
  if (role === "server") {
    const p = walk(role, t, speed, true, 0);
    const near = armTo("near", { x: 104, y: 322 }, 0, -1);
    return pose({ rot: { ...p.rot, shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist }, lean: 20, headTilt: -2 });
  }
  if (role === "office") {
    const k = smooth(clamp01(t / 0.2));
    const near = armTo("near", { x: 100, y: 250 }, 30, -1);
    const far = armTo("far", { x: 58, y: 248 }, 65, -1);
    return pose({
      rot: {
        shoulderNear: near.shoulder,
        elbowNear: near.elbow,
        wristNear: near.wrist,
        shoulderFar: far.shoulder,
        elbowFar: far.elbow,
        wristFar: far.wrist,
        hipNear: 22 * k,
        kneeNear: -32 * k,
        hipFar: 12 * k,
        kneeFar: -38 * k,
      },
      lean: 10 * k,
    });
  }
  const k = smooth(clamp01(t / 0.4));
  const mix = (a: number, b: number) => a + (b - a) * k;
  return pose({
    rot: {
      shoulderNear: mix(COCK.shoulder, overTheTop(COCK.shoulder, THROWN.shoulder)),
      elbowNear: mix(COCK.elbow, shortWay(COCK.elbow, THROWN.elbow)),
      wristNear: mix(COCK.wrist, shortWay(COCK.wrist, THROWN.wrist)),
      shoulderFar: HANG.shoulderFar + 10 * (1 - k),
      chest: -4 + 10 * k,
    },
    lean: -6 + 14 * k,
  });
};

// Knocked flying: limbs loose on a wobble, the whole body turning with its spin.
const fly = (t: number, spin: number): Pose => {
  const w = Math.sin(t * TAU * 5);
  return pose({
    rot: {
      hipNear: 30 + 8 * w,
      kneeNear: -40 - 10 * w,
      hipFar: -12 - 8 * w,
      kneeFar: -36 + 10 * w,
      shoulderNear: 70 + 12 * w,
      elbowNear: 30,
      shoulderFar: -30 - 12 * w,
      elbowFar: 24,
      ankleNear: 20,
      ankleFar: 20,
    },
    lean: -8,
    spin,
  });
};

/** Sitting on the floor, legs out, head lolling. */
const SIT = { hip: 100, knee: -8, lean: 10, shoulder: -40 } as const;
const down = (t: number): Pose =>
  pose({
    rot: { hipNear: SIT.hip, kneeNear: SIT.knee, hipFar: SIT.hip - 4, kneeFar: SIT.knee, ankleNear: 30, ankleFar: 30, shoulderNear: SIT.shoulder, shoulderFar: SIT.shoulder - 4, elbowNear: 10, elbowFar: 10 },
    lean: SIT.lean,
    headTilt: 6 * Math.sin(t * TAU),
  });

// Getting up: the knees pulled in under him, then up through a crouch to standing.
const GETUP = {
  hip: [[0, SIT.hip], [0.4, 125], [0.65, 70], [1, 0]] as K,
  knee: [[0, SIT.knee], [0.4, -140], [0.65, -112], [1, 0]] as K,
  lean: [[0, SIT.lean], [0.4, 34], [0.65, 16], [1, 0]] as K,
  drop: [[0, 0], [0.4, -20], [0.65, -60], [1, 0]] as K,
  shoulder: [[0, SIT.shoulder], [1, HANG.shoulderNear]] as K,
};
const getup = (t: number): Pose => {
  const u = clamp01(t / T.getup);
  const hip = at(GETUP.hip, u);
  const knee = at(GETUP.knee, u);
  return pose({
    rot: flatFeet({ hipNear: hip, kneeNear: knee, hipFar: hip * 0.96, kneeFar: knee * 0.96, shoulderNear: at(GETUP.shoulder, u), shoulderFar: at(GETUP.shoulder, u) - 4 }, 1),
    lean: at(GETUP.lean, u),
    root: { x: 0, y: at(GETUP.drop, u) },
  });
};

/** Flat on his back along the marble, legs up, arms up. */
const slide = (t: number): Pose =>
  pose({
    rot: { hipNear: 60, kneeNear: -30, hipFar: 50, kneeFar: -26, shoulderNear: 120 + 6 * Math.sin(t * TAU * 4), shoulderFar: 110, elbowNear: 20, elbowFar: 20 },
    spin: 90,
    lean: 0,
  });

/** Feet out from under him: legs forward, arms thrown up, going over backward. */
const slip = (t: number): Pose => {
  const u = clamp01(t / T.slip);
  const k = smooth(u);
  return pose({
    rot: { hipNear: 70 * k, kneeNear: 0, hipFar: 66 * k, kneeFar: 0, ankleNear: 20 * k, ankleFar: 20 * k, shoulderNear: HANG.shoulderNear + 160 * k, shoulderFar: HANG.shoulderFar + 150 * k },
    lean: -30 * k,
    spin: 40 * k,
    root: { x: 0, y: -10 * Math.sin(u * Math.PI) },
  });
};

/** Held mid-gesture by the lecture: the hands up a little, no motion at all. */
const frozen = (role: CastRole): Pose => {
  const h = hands(role, 0);
  return pose({
    rot: { ...h.rot, shoulderNear: (h.rot.shoulderNear ?? HANG.shoulderNear) + 20, shoulderFar: (h.rot.shoulderFar ?? HANG.shoulderFar) + 15 },
    lean: h.lean - 4,
    headTilt: h.headTilt - 4,
  });
};

/** Sat down to sulk: knees up, arms crossed, chin down. */
const schooled = (t: number): Pose =>
  pose({
    rot: { hipNear: 100, kneeNear: -120, hipFar: 96, kneeFar: -116, shoulderNear: 60, elbowNear: 110, shoulderFar: 50, elbowFar: 110 },
    lean: 8,
    headTilt: 10 + 2 * Math.sin(t * TAU * 0.5),
  });

const duck = (t: number): Pose => {
  const k = smooth(clamp01(t / 0.2)) * smooth(clamp01((CAST.student.duck - t) / 0.25));
  return pose({
    rot: flatFeet(
      { hipNear: 70 * k, kneeNear: -112 * k, hipFar: 66 * k, kneeFar: -108 * k, shoulderNear: HANG.shoulderNear + 100 * k, elbowNear: 40 * k, shoulderFar: HANG.shoulderFar + 96 * k, elbowFar: 40 * k, chest: -6 * k },
      1,
    ),
    lean: 16 * k,
    root: { x: 0, y: -60 * k },
    headTilt: 6 * k,
  });
};

const hop = (t: number): Pose => {
  const k = Math.sin(clamp01(t / CAST.student.hopT) * Math.PI);
  return pose({
    rot: { hipNear: 22 * k, kneeNear: -32 * k, hipFar: 12 * k, kneeFar: -38 * k, ankleNear: 14 * k, ankleFar: 14 * k, shoulderNear: HANG.shoulderNear + 20 * k, shoulderFar: HANG.shoulderFar + 20 * k },
    lean: -5 * k,
  });
};

const bumped = (t: number, role: CastRole): Pose => {
  const u = clamp01(t / T.bump);
  const k = Math.sin(u * Math.PI);
  const h = hands(role, t);
  return pose({
    rot: { ...h.rot, shoulderNear: (h.rot.shoulderNear ?? HANG.shoulderNear) + 30 * k, shoulderFar: (h.rot.shoulderFar ?? HANG.shoulderFar) + 30 * k, hipNear: -10 * k, hipFar: 15 * k },
    lean: h.lean - 12 * k,
    headTilt: h.headTilt - 4 * k,
  });
};

/** The pose of a cast member in its act at `t` seconds in. */
export function castPose(c: CastPoseCtx): Pose {
  const { role, act, t, speed } = c;
  switch (act) {
    case "idle":
    case "hide":
      return idle(role, t, c.sit);
    case "walk":
      return walk(role, t, speed, false);
    case "chase":
    case "return": {
      const p = walk(role, t, speed, false, 0);
      const near = armTo("near", { x: 92, y: 210 }, -10, -1);
      const far = armTo("far", { x: 96, y: 214 }, -10, -1);
      return pose({
        rot: { ...p.rot, shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist },
        lean: 8,
      });
    }
    case "leave":
      return pose({ ...walk(role, t, speed, false, 0.6), lean: -2 });
    case "flee": {
      const p = walk(role, t, speed, true, 0);
      return pose({ rot: { ...p.rot, shoulderNear: HANG.shoulderNear + 170, shoulderFar: HANG.shoulderFar + 165, elbowNear: 20, elbowFar: 20 }, lean: 14 });
    }
    case "notice":
      return notice(role, t);
    case "windup":
      return windup(role, t);
    case "attack":
      return attack(role, t, speed);
    case "recover":
      return pose({
        rot: flatFeet({ hipNear: 30, kneeNear: -20, hipFar: 36, kneeFar: -24, shoulderNear: HANG.shoulderNear - 40, shoulderFar: HANG.shoulderFar - 40 }, 1),
        lean: -15 * (1 - smooth(clamp01(t / 0.4))),
      });
    case "bumped":
      return bumped(t, role);
    case "fly":
      return fly(t, c.spin);
    case "down":
      return down(t);
    case "getup":
      return getup(t);
    case "slide":
      return slide(t);
    case "slip":
      return slip(t);
    case "frozen":
      return frozen(role);
    case "schooled":
      return schooled(t);
    case "duck":
      return duck(t);
    case "hop":
      return hop(t);
  }
}

/** The travelers' beats at the gate (R5 §7), over whatever they are doing: upper body only. */
export type Reaction = "ooh" | "laugh" | "clap";
export const REACTION_SECONDS: Record<Reaction, number> = { ooh: 0.9, laugh: 1.2, clap: 1.4 };
/** The joints a reaction owns: the arms, the chest and the head; the legs and the seat stay the act's. */
const REACTION_JOINTS: JointName[] = ["chest", "neck", "head", "shoulderNear", "elbowNear", "wristNear", "shoulderFar", "elbowFar", "wristFar"];
/**
 * A reaction `t` seconds in, eased in over its first 0.2 s and out over its last 0.25: ooh leans in with both hands up to
 * the chest, laugh tips the head back with the shoulders shaking, clap brings the hands together in front and claps.
 */
export function castReaction(base: Pose, kind: Reaction, t: number): Pose {
  const len = REACTION_SECONDS[kind];
  const w = smooth(clamp01(Math.min(t / 0.2, (len - t) / 0.25)));
  const out = structuredClone(base);
  const add: Partial<Record<JointName, number>> =
    kind === "ooh"
      ? { shoulderNear: 45, elbowNear: 70, shoulderFar: 40, elbowFar: 70 }
      : kind === "laugh"
        ? { shoulderNear: 25, elbowNear: 80, shoulderFar: 15, elbowFar: 60, chest: -4 + 3 * Math.sin(t * TAU * 6), neck: -4 }
        : { shoulderNear: 50, elbowNear: 85 + 15 * Math.sin(t * TAU * 3), shoulderFar: 50, elbowFar: 85 - 15 * Math.sin(t * TAU * 3) };
  for (const j of REACTION_JOINTS) out.rot[j] = (base.rot[j] ?? 0) + (add[j] ?? 0) * w;
  out.lean = base.lean + (kind === "ooh" ? 6 : kind === "laugh" ? -6 + 2 * Math.sin(t * TAU * 6) : 2) * w;
  return out;
}
