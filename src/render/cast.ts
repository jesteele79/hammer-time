import { Container, Graphics, type Texture } from "pixi.js";
import { HEAD_PLATE_DEFAULT, type Registry } from "../art/registry";
import { HATTED, type CastAct, type CastJob, type CastRole } from "../sim/cast";
import { HEAD_SCALE, STEP } from "../sim/constants";
import type { CastPerson, Furniture, Level } from "../sim/level";
import { castGround, castPose } from "../sim/rig/cast";
import { solve, type Solved } from "../sim/rig/fk";
import { groundShift } from "../sim/rig/ground";
import { HERO_HEIGHT, type JointName } from "../sim/rig/skeleton";
import type { Point, Rect, Snapshot } from "../sim/types";
import type { Quality } from "./app";
import { RIM, castHeadScale, hatWorldWidth, rimFor } from "./cast-art";
import { loadCastArt, PaintedFigure, type CastArt, type Rim } from "./cast-body";
import { between } from "./interp";
import { PALETTE, tones } from "./palette";

export type HairStyle = "short" | "bun" | "ponytail" | "curly" | "bald" | "bob" | "beanie";
/** One person's build and clothes: the stand-in draws from it, and R2b-2 keeps it for the recolors. */
export type CastLook = {
  height: number;
  build: number;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  sleeves: "top" | "skin";
  vest?: string;
  apron?: boolean;
  tie?: string;
  bottom: string;
  shoes: string;
  gloves?: boolean;
  glasses?: boolean;
  mustache?: boolean;
  earbuds?: boolean;
  backpack?: string;
  lanyard?: boolean;
  braid?: boolean;
  /** The head's share of the height, crown to neck, the owner picked on the cast-heads board; the painting's own when missing. */
  head?: number;
};
export type FigureOpts = { role: CastRole; job: CastJob; act: CastAct; hat: boolean; prop: boolean; slimed: boolean; silhouette: boolean };

const INK = PALETTE.outline;
const LINE = 4;
const SIL = "#14110f";
/** Capsule radii in rest units; `build` scales them. */
const R = { arm: 20, leg: 26, hand: 16, foot: 15, torsoTop: 44, torsoBottom: 40, head: 38 } as const;

// The heads' shares: the owner picked 0.22 for the first bellhop on 2026-10-12, and it is everyone's start.
export const LOOKS: Record<CastPerson, CastLook> = {
  "bellhop-1": { height: 355, head: 0.22, build: 1.05, skin: "#d7a27a", hair: "#9a9a9a", hairStyle: "short", top: "#b8282e", sleeves: "top", bottom: "#1c1d24", shoes: "#141414", gloves: true, mustache: true, braid: true },
  "bellhop-2": { height: 315, head: 0.22, build: 0.85, skin: "#ebc9a9", hair: "#3b2a22", hairStyle: "bun", top: "#b8282e", sleeves: "top", bottom: "#1c1d24", shoes: "#141414", gloves: true, braid: true },
  "server-1": { height: 320, head: 0.22, build: 0.8, skin: "#e2b48f", hair: "#2a1d16", hairStyle: "ponytail", top: "#f4f3ee", sleeves: "skin", vest: "#1a1a1a", apron: true, bottom: "#1a1a1a", shoes: "#141414" },
  "server-2": { height: 360, head: 0.22, build: 0.75, skin: "#c9956a", hair: "#4a2e1a", hairStyle: "curly", top: "#f4f3ee", sleeves: "skin", vest: "#1a1a1a", apron: true, bottom: "#1a1a1a", shoes: "#141414" },
  "office-1": { height: 345, head: 0.22, build: 1.1, skin: "#e8bf9c", hair: "#2b2320", hairStyle: "bald", top: "#9cc4ec", sleeves: "skin", tie: "#7a1f2b", bottom: "#c8b58c", shoes: "#5a3a1e", glasses: true, earbuds: true, lanyard: true },
  "office-2": { height: 325, head: 0.22, build: 0.85, skin: "#d9a98b", hair: "#1f1a18", hairStyle: "bob", top: "#5a5e68", sleeves: "top", bottom: "#1d1d1f", shoes: "#141414", earbuds: true, lanyard: true },
  "student-1": { height: 315, head: 0.22, build: 0.9, skin: "#c88f6a", hair: "#1c1612", hairStyle: "curly", top: "#5d6b3c", sleeves: "top", bottom: "#3f5e8f", shoes: "#f4f3ee", glasses: true, earbuds: true, backpack: "#6b1f2a" },
  "student-2": { height: 335, head: 0.22, build: 0.95, skin: "#f0cfae", hair: "#2a2a2e", hairStyle: "beanie", top: "#8a8d93", sleeves: "top", bottom: "#1f2024", shoes: "#f4f3ee", earbuds: true, backpack: "#1a1a1a" },
  // R3's people (their stand-ins are the fallback only; never polish them).
  "cook-1": { height: 360, head: 0.22, build: 1.2, skin: "#c98a5e", hair: "#1c1612", hairStyle: "bald", top: "#f4f3ee", sleeves: "skin", apron: true, bottom: "#2a2a2a", shoes: "#141414" },
  "busser-1": { height: 340, head: 0.22, build: 0.75, skin: "#f0cfae", hair: "#e3b341", hairStyle: "short", top: "#1a1a1a", sleeves: "skin", apron: true, bottom: "#1a1a1a", shoes: "#141414" },
  "lunch-1": { height: 300, head: 0.22, build: 1.15, skin: "#e8bf9c", hair: "#b5b5b5", hairStyle: "curly", top: "#2d3f7a", sleeves: "skin", apron: true, bottom: "#1d1d1f", shoes: "#141414", glasses: true },
  "prof-1": { height: 330, head: 0.22, build: 0.95, skin: "#e9c4a4", hair: "#f2f2f2", hairStyle: "curly", top: "#7b5a3a", sleeves: "top", tie: "#b8282e", bottom: "#6b4a2a", shoes: "#5a3a1e", glasses: true },
};

/** A look with the uniform's top (the vest where there is one) in the recolor's hue. */
export function recolored(look: CastLook, hex: string | null): CastLook {
  if (!hex) return look;
  return look.vest ? { ...look, vest: hex } : { ...look, top: hex };
}

type Stroke = { width: number; color: string; cap: "round"; join: "round" };
/** An inked tube from a to b: the outline under the fill. In silhouette both are the shadow color. */
function tube(g: Graphics, a: Point, b: Point, r: number, color: string, sil: boolean) {
  const outline: Stroke = { width: 2 * r + 2 * LINE, color: sil ? SIL : INK, cap: "round", join: "round" };
  const fill: Stroke = { width: 2 * r, color: sil ? SIL : color, cap: "round", join: "round" };
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(outline);
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(fill);
}

/** Draws an inked stand-in about the feet point from the solved joints: far limbs, torso and uniform, near limbs, props, the head. */
export function drawFigure(g: Graphics, s: Solved, look: CastLook, o: FigureOpts): void {
  const j = s.joints;
  const k = s.scale;
  const b = look.build;
  const sil = o.silhouette;
  const f = s.facing;
  const top = tones(look.top);
  const bottom = tones(look.bottom);
  const far = (c: string) => (sil ? SIL : tones(c).shadow);
  const sleeve = look.sleeves === "top" ? look.top : look.skin;
  const hand = look.gloves ? "#f4f3ee" : look.skin;

  // Far limbs first, a shade darker.
  tube(g, j.shoulderFar, j.elbowFar, R.arm * b * k, far(look.top), sil);
  tube(g, j.elbowFar, j.wristFar, R.arm * 0.9 * b * k, far(sleeve), sil);
  tube(g, j.wristFar, j.handFar, R.hand * b * k, far(hand), sil);
  tube(g, j.hipFar, j.kneeFar, R.leg * b * k, far(look.bottom), sil);
  tube(g, j.kneeFar, j.ankleFar, R.leg * 0.85 * b * k, far(look.bottom), sil);
  tube(g, j.ankleFar, j.toeFar, R.foot * k, far(look.shoes), sil);
  // The backpack sits on the back, away from where he faces.
  if (look.backpack) {
    const back = { x: j.chest.x - f * 46 * k, y: j.chest.y + 10 * k };
    g.roundRect(back.x - 22 * k, back.y - 60 * k, 44 * k, 120 * k, 14 * k)
      .fill(sil ? SIL : look.backpack)
      .stroke({ width: LINE, color: sil ? SIL : INK });
  }
  // The torso: a tapered slab from the neck to the pelvis.
  const spine = { x: j.neck.x - j.pelvis.x, y: j.neck.y - j.pelvis.y };
  const len = Math.hypot(spine.x, spine.y) || 1;
  const nx = (-spine.y / len) * k;
  const ny = (spine.x / len) * k;
  const wt = R.torsoTop * b;
  const wb = R.torsoBottom * b;
  const torso = [j.neck.x + nx * wt, j.neck.y + ny * wt, j.neck.x - nx * wt, j.neck.y - ny * wt, j.pelvis.x - nx * wb, j.pelvis.y - ny * wb, j.pelvis.x + nx * wb, j.pelvis.y + ny * wb];
  g.poly(torso)
    .fill(sil ? SIL : top.base)
    .stroke({ width: LINE, color: sil ? SIL : INK, join: "round" });
  if (!sil) {
    // The shadow side is the back; the uniform's details on the front.
    g.poly([
      j.neck.x - f * nx * wt * 0.3,
      j.neck.y - f * ny * wt * 0.3,
      j.neck.x - f * nx * wt,
      j.neck.y - f * ny * wt,
      j.pelvis.x - f * nx * wb,
      j.pelvis.y - f * ny * wb,
      j.pelvis.x - f * nx * wb * 0.3,
      j.pelvis.y - f * ny * wb * 0.3,
    ]).fill(top.shadow);
    if (look.vest)
      g.poly([
        j.neck.x + nx * wt * 0.7,
        j.neck.y + ny * wt * 0.7,
        j.neck.x - nx * wt * 0.7,
        j.neck.y - ny * wt * 0.7,
        j.pelvis.x - nx * wb * 0.9,
        j.pelvis.y - ny * wb * 0.9,
        j.pelvis.x + nx * wb * 0.9,
        j.pelvis.y + ny * wb * 0.9,
      ]).fill(look.vest);
    if (look.tie)
      g.moveTo(j.neck.x + f * nx * 4, j.neck.y + 8 * k)
        .lineTo(j.chest.x + f * 10 * k, j.chest.y + 30 * k)
        .stroke({ width: 7 * k, color: look.tie, cap: "round" });
    if (look.lanyard)
      g.moveTo(j.neck.x, j.neck.y + 6 * k)
        .lineTo(j.chest.x + f * 8 * k, j.chest.y + 20 * k)
        .stroke({ width: 3, color: "#2f4a74" })
        .roundRect(j.chest.x + f * 8 * k - 8 * k, j.chest.y + 20 * k, 16 * k, 22 * k, 3)
        .fill("#f4f3ee")
        .stroke({ width: 2, color: INK });
    if (look.braid)
      for (let i = 0; i < 4; i++)
        g.circle(j.chest.x + f * 16 * k, j.neck.y + (18 + i * 22) * k, 4 * k)
          .fill(PALETTE.brass)
          .stroke({ width: 2, color: INK });
    if (o.slimed) g.ellipse(j.chest.x, j.chest.y, 26 * k, 18 * k).fill("#8fbf3f").stroke({ width: 3, color: INK });
  }
  // The apron hangs from the waist over the near leg.
  if (look.apron && !sil)
    g.poly([j.pelvis.x + nx * wb * 0.9, j.pelvis.y + ny * wb * 0.9, j.pelvis.x - nx * wb * 0.9, j.pelvis.y - ny * wb * 0.9, j.kneeNear.x - 30 * k, j.kneeNear.y + 20 * k, j.kneeNear.x + 30 * k, j.kneeNear.y + 20 * k])
      .fill(look.bottom)
      .stroke({ width: LINE, color: INK, join: "round" });
  // Near limbs.
  tube(g, j.hipNear, j.kneeNear, R.leg * b * k, bottom.base, sil);
  tube(g, j.kneeNear, j.ankleNear, R.leg * 0.85 * b * k, bottom.base, sil);
  tube(g, j.ankleNear, j.toeNear, R.foot * k, look.shoes, sil);
  tube(g, j.shoulderNear, j.elbowNear, R.arm * b * k, look.top, sil);
  tube(g, j.elbowNear, j.wristNear, R.arm * 0.9 * b * k, sleeve, sil);
  tube(g, j.wristNear, j.handNear, R.hand * b * k, hand, sil);
  if (!sil) drawProp(g, j, k, f, o);
  drawHead(g, s, look, o);
}

export type Carried = "glasses" | "food" | "cup" | "phone" | "pan" | "book";
/** What each job carries in its hands: drawn in code over the painting or the stand-in, so it can fly and break. */
export function carriedOf(job: CastJob): Carried[] {
  switch (job) {
    case "server":
      return ["glasses"];
    case "lunch":
      return ["food"];
    case "office":
      return ["cup", "phone"];
    case "cook":
      return ["pan"];
    case "prof":
      return ["book"];
    default:
      return [];
  }
}

/** What the job carries: the server's tray of glasses, the lunch tray, the coffee and the phone, the pan, the book; the student's phone. */
function drawProp(g: Graphics, j: Record<JointName, Point>, k: number, f: 1 | -1, o: FigureOpts) {
  const h = j.handNear;
  const c = carriedOf(o.job);
  if (c.includes("glasses") && o.prop) {
    g.ellipse(h.x + f * 10 * k, h.y - 10 * k, 46 * k, 10 * k)
      .fill("#c9ccd1")
      .stroke({ width: 3, color: INK });
    for (const dx of [-24, 0, 24])
      g.roundRect(h.x + f * 10 * k + dx * k - 7 * k, h.y - 36 * k, 14 * k, 26 * k, 3)
        .fill({ color: "#dff3ff", alpha: 0.9 })
        .stroke({ width: 2, color: INK });
  }
  if (c.includes("food") && o.prop) {
    // The lunch tray: mashed potatoes, a row of peas, a jello cube.
    g.ellipse(h.x + f * 10 * k, h.y - 10 * k, 46 * k, 10 * k).fill("#c9a84a").stroke({ width: 3, color: INK });
    g.ellipse(h.x - f * 12 * k, h.y - 22 * k, 16 * k, 12 * k).fill("#f1e3b5").stroke({ width: 2, color: INK });
    for (const dx of [2, 10, 18]) g.circle(h.x + f * dx * k, h.y - 18 * k, 5 * k).fill("#7fb24a").stroke({ width: 1.5, color: INK });
    g.roundRect(h.x + f * 26 * k - 9 * k, h.y - 34 * k, 18 * k, 18 * k, 3).fill({ color: "#c8443a", alpha: 0.9 }).stroke({ width: 2, color: INK });
  }
  if (c.includes("cup") && o.prop)
    g.roundRect(h.x - 11 * k, h.y - 30 * k, 22 * k, 28 * k, 4)
      .fill("#f4f3ee")
      .stroke({ width: 3, color: INK })
      .rect(h.x - 11 * k, h.y - 30 * k, 22 * k, 6 * k)
      .fill("#6b3a1e");
  if (c.includes("phone")) {
    const p = j.handFar;
    g.roundRect(p.x - 9 * k, p.y - 20 * k, 18 * k, 34 * k, 3)
      .fill("#1a1a1a")
      .stroke({ width: 2, color: INK })
      .rect(p.x - 7 * k, p.y - 18 * k, 14 * k, 28 * k)
      .fill({ color: "#9fd6ff", alpha: 0.9 });
  }
  if (c.includes("pan") && o.prop) {
    // The cook's pan held out by its handle, food in it.
    g.roundRect(Math.min(h.x, h.x + f * 70 * k), h.y - 6 * k, 70 * k, 12 * k, 4).fill("#3a2a1c").stroke({ width: 2, color: INK });
    g.ellipse(h.x + f * 110 * k, h.y - 8 * k, 46 * k, 12 * k).fill("#2b2b2e").stroke({ width: 3, color: INK });
    g.ellipse(h.x + f * 110 * k, h.y - 16 * k, 24 * k, 8 * k).fill("#d98a3a");
  }
  if (c.includes("book") && o.prop) {
    // The professor's open book, held up in the far hand.
    const p = j.handFar;
    g.poly([p.x - 30 * k, p.y - 34 * k, p.x, p.y - 26 * k, p.x + 30 * k, p.y - 34 * k, p.x + 30 * k, p.y + 4 * k, p.x, p.y + 12 * k, p.x - 30 * k, p.y + 4 * k])
      .fill("#f4efe2")
      .stroke({ width: 2, color: INK });
    g.moveTo(p.x, p.y - 26 * k).lineTo(p.x, p.y + 12 * k).stroke({ width: 2, color: INK });
    g.rect(p.x - 32 * k, p.y + 4 * k, 64 * k, 6 * k).fill("#6b3a1e");
  }
  if (o.role === "student" && (o.act === "idle" || o.act === "notice" || o.act === "hide")) {
    g.roundRect(h.x - 9 * k, h.y - 22 * k, 18 * k, 34 * k, 3)
      .fill("#1a1a1a")
      .stroke({ width: 2, color: INK });
    g.circle(h.x + 4 * k, h.y - 16 * k, 3 * k).fill("#ff2d2d");
  }
}

/** What the role carries, and the slime: over the painted body as over the stand-in. */
export function drawCarried(g: Graphics, s: Solved, o: FigureOpts): void {
  if (o.silhouette) return;
  drawProp(g, s.joints, s.scale, s.facing, o);
  if (o.slimed) g.ellipse(s.joints.chest.x, s.joints.chest.y, 26 * s.scale, 18 * s.scale).fill("#8fbf3f").stroke({ width: 3, color: INK });
}

/** A caricature head on the neck seat: skull, ear, nose, eye, mouth, hair or hat; the front is the way he faces. */
function drawHead(g: Graphics, s: Solved, look: CastLook, o: FigureOpts) {
  const p = s.parts.head;
  const f = s.facing;
  const sil = o.silhouette;
  const len = p.length;
  const rx = R.head * look.build * s.scale * 0.9;
  const ry = len * 0.46;
  const c = Math.cos(p.rotation);
  const sn = Math.sin(p.rotation);
  // Head-local (x forward, y up) to world.
  const at = (x: number, y: number): Point => ({ x: p.x + (f * x * c - -y * sn), y: p.y + (f * x * sn + -y * c) });
  const cx = at(2 * s.scale, ry * 1.05);
  const ink = sil ? SIL : INK;
  const skin = sil ? SIL : look.skin;
  // Ear behind, then the skull.
  const ear = at(-rx * 0.9, ry * 0.95);
  g.ellipse(ear.x, ear.y, rx * 0.22, ry * 0.26).fill(skin).stroke({ width: 3, color: ink });
  g.ellipse(cx.x, cx.y, rx, ry).fill(skin).stroke({ width: LINE, color: ink });
  if (sil) return;
  const sh = tones(look.skin).shadow;
  g.ellipse(cx.x - f * rx * 0.45, cx.y + ry * 0.25, rx * 0.5, ry * 0.5).fill(sh);
  // The nose, the eye, the brow and the mouth on the front.
  const nose = at(rx * 1.05, ry * 0.95);
  const noseTop = at(rx * 0.7, ry * 1.2);
  const noseBottom = at(rx * 0.6, ry * 0.75);
  g.poly([noseTop.x, noseTop.y, nose.x, nose.y, noseBottom.x, noseBottom.y])
    .fill(look.skin)
    .stroke({ width: 3, color: INK, join: "round" });
  const eye = at(rx * 0.45, ry * 1.25);
  g.ellipse(eye.x, eye.y, rx * 0.16, ry * 0.12).fill("#ffffff").stroke({ width: 2, color: INK });
  g.circle(eye.x + f * rx * 0.05, eye.y, rx * 0.07).fill(INK);
  const b0 = at(rx * 0.2, ry * 1.48);
  const b1 = at(rx * 0.7, ry * 1.5);
  g.moveTo(b0.x, b0.y).lineTo(b1.x, b1.y).stroke({ width: 4, color: INK, cap: "round" });
  const m0 = at(rx * 0.45, ry * 0.55);
  const m1 = at(rx * 0.8, ry * 0.6);
  g.moveTo(m0.x, m0.y).lineTo(m1.x, m1.y).stroke({ width: 3, color: INK, cap: "round" });
  if (look.mustache) {
    const u0 = at(rx * 0.5, ry * 0.7);
    const u1 = at(rx * 0.9, ry * 0.72);
    g.moveTo(u0.x, u0.y).lineTo(u1.x, u1.y).stroke({ width: 6, color: look.hair, cap: "round" });
  }
  if (look.glasses) {
    g.circle(eye.x, eye.y, rx * 0.26).stroke({ width: 3, color: INK });
    const arm = at(-rx * 0.6, ry * 1.25);
    g.moveTo(eye.x - f * rx * 0.26, eye.y).lineTo(arm.x, arm.y).stroke({ width: 3, color: INK });
  }
  if (look.earbuds) g.circle(ear.x + f * rx * 0.06, ear.y + ry * 0.1, rx * 0.09).fill("#ffffff").stroke({ width: 2, color: INK });
  hairOn(g, at, rx, ry, look, o.hat && HATTED.has(o.job) ? (o.job === "cook" ? "toque" : "pillbox") : false);
}

function hairOn(g: Graphics, at: (x: number, y: number) => Point, rx: number, ry: number, look: CastLook, hat: false | "pillbox" | "toque") {
  const hair = look.hair;
  /** A cap of hair over the skull from `fromX` to `toX`, its top at `top`, `thick` deep. */
  const cap = (fromX: number, toX: number, top: number, thick: number) => {
    const pts: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (i / 8);
      const q = at(fromX + ((toX - fromX) * (1 - Math.cos(a))) / 2, top + Math.sin(a) * thick);
      pts.push(q.x, q.y);
    }
    g.poly(pts).fill(hair).stroke({ width: 3, color: INK, join: "round" });
  };
  const lock = (a: Point, b: Point, w: number) => {
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: w + 4, color: INK, cap: "round" });
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: w, color: hair, cap: "round" });
  };
  switch (look.hairStyle) {
    case "short":
      cap(-rx * 1.05, rx * 0.6, ry * 1.55, ry * 0.5);
      break;
    case "bald":
      cap(-rx * 1.05, -rx * 0.3, ry * 1.1, ry * 0.5);
      break;
    case "curly": {
      cap(-rx * 1.1, rx * 0.7, ry * 1.5, ry * 0.75);
      for (let i = 0; i < 5; i++) {
        const q = at(-rx * 1.1 + i * rx * 0.45, ry * 1.95);
        g.circle(q.x, q.y, rx * 0.22).fill(hair).stroke({ width: 2, color: INK });
      }
      break;
    }
    case "bun": {
      cap(-rx * 1.05, rx * 0.55, ry * 1.55, ry * 0.45);
      const q = at(-rx * 1.0, ry * 1.5);
      g.circle(q.x, q.y, rx * 0.32).fill(hair).stroke({ width: 3, color: INK });
      break;
    }
    case "ponytail":
      cap(-rx * 1.05, rx * 0.55, ry * 1.55, ry * 0.45);
      lock(at(-rx * 1.05, ry * 1.5), at(-rx * 1.5, ry * 0.7), rx * 0.4);
      break;
    case "bob":
      cap(-rx * 1.15, rx * 0.6, ry * 1.5, ry * 0.5);
      lock(at(-rx * 1.1, ry * 1.4), at(-rx * 1.05, ry * 0.6), rx * 0.5);
      break;
    case "beanie": {
      const pts: number[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (i / 8);
        const q = at(-rx * 1.15 + (rx * 1.9 * (1 - Math.cos(a))) / 2, ry * 1.35 + Math.sin(a) * ry * 0.85);
        pts.push(q.x, q.y);
      }
      g.poly(pts).fill("#2f3a4a").stroke({ width: 3, color: INK, join: "round" });
      const r0 = at(-rx * 1.15, ry * 1.35);
      const r1 = at(rx * 0.75, ry * 1.35);
      g.moveTo(r0.x, r0.y).lineTo(r1.x, r1.y).stroke({ width: 8, color: "#3d4a5e" });
      break;
    }
  }
  if (hat === "toque") {
    // The cook's tall pleated toque.
    const b0 = at(-rx * 0.8, ry * 1.8);
    const b1 = at(rx * 0.8, ry * 1.8);
    const t0 = at(-rx * 0.8, ry * 4.0);
    const t1 = at(rx * 0.8, ry * 4.0);
    g.poly([b0.x, b0.y, b1.x, b1.y, t1.x, t1.y, t0.x, t0.y]).fill("#f4f3ee").stroke({ width: 3, color: INK, join: "round" });
    const top = at(0, ry * 4.1);
    g.ellipse(top.x, top.y, rx * 1.0, ry * 0.45).fill("#ffffff").stroke({ width: 3, color: INK });
  } else if (hat) {
    const h0 = at(-rx * 1.0, ry * 1.85);
    const h1 = at(rx * 0.75, ry * 1.85);
    const t0 = at(-rx * 1.0, ry * 2.4);
    const t1 = at(rx * 0.75, ry * 2.4);
    g.poly([h0.x, h0.y, h1.x, h1.y, t1.x, t1.y, t0.x, t0.y])
      .fill("#b8282e")
      .stroke({ width: 3, color: INK, join: "round" });
    g.moveTo(h0.x, h0.y).lineTo(h1.x, h1.y).stroke({ width: 6, color: PALETTE.brass });
  }
}

/** A five-point star about (x, y). */
export function star(g: Graphics, x: number, y: number, r: number) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.poly(pts).fill("#ffe14a").stroke({ width: 2, color: INK, join: "round" });
}

type View = {
  root: Container;
  body: Graphics;
  /** The person's painting, when it loaded; the stand-in (`body`) otherwise. */
  painted: PaintedFigure | null;
  carried: Graphics;
  shadow: Graphics;
  stars: Graphics;
  look: CastLook;
  mask: Graphics | null;
  air: boolean;
  squashT: number;
};
const SHADOW_RX = 60;
/** How far past the view a cast member is still drawn: a figure walking in is already posed. */
export const CULL_PAD = 600;
/** Inside the view or within the pad of it: anyone farther is not posed or drawn this frame. */
export const onScreen = (x: number, y: number, view: Rect, pad = CULL_PAD): boolean =>
  x >= view.x - pad && x <= view.x + view.w + pad && y >= view.y - pad && y <= view.y + view.h + pad;
/** Dazed: three stars circling the head. */
const STARS = { n: 3, r: 40, size: 9, rate: 4 } as const;
export const DAZED: ReadonlySet<CastAct> = new Set<CastAct>(["down", "slide", "slip", "getup"]);
/** A landing's squash, the design's 0.09 s. */
const SQUASH = { x: 1.08, y: 0.92, t: 0.09 } as const;
/** The lit screen's sheet, below the furniture's top. */
const SHEET_H = 300;
/** How long a cook behind the pass takes to rear up out of it as he winds up. */
const REAR_T = 0.25;

/** Cover for whoever hides: the lobby's projector sheet, his shadow thrown on it, or a pass's counter he crouches behind. */
export type Cover = { kind: "screen"; sheet: Furniture } | { kind: "counter"; top: number };

export function coverOf(x: number, level: Pick<Level, "furniture" | "platforms">): Cover | null {
  const sheet = level.furniture.find((f) => f.kind === "screen" && x >= f.x && x <= f.x + f.w);
  if (sheet) return { kind: "screen", sheet };
  const counter = level.platforms.find((p) => p.kind === "pass" && x >= p.x0 && x <= p.x1);
  return counter ? { kind: "counter", top: counter.y } : null;
}

/** How far a cook behind a counter sinks: his crown just under its top, so only his toque shows; `risen` 1 is stood up. */
export function counterSink(crown: number, top: number, risen: number): number {
  return Math.max(0, top + 12 - crown) * (1 - risen);
}

/**
 * Draws the cast from each snapshot: each member from their painting, skinned on their own skeleton, or as the stand-in
 * when it is missing; stars when dazed, a shadow on the sheet while hiding.
 */
export class Cast {
  readonly container = new Container({ label: "cast" });
  private readonly views = new Map<number, View>();
  private readonly crowns = new Map<number, { x: number; y: number; facing: 1 | -1 }>();
  private readonly arts = new Map<CastPerson, CastArt | null>();
  /** The rim light is off at the low quality tier. */
  private rimOn = true;

  constructor(
    layer: Container,
    ambient: number,
    private readonly registry: Registry | null = null,
  ) {
    this.container.sortableChildren = true;
    this.container.tint = ambient;
    layer.addChild(this.container);
  }

  /** Loads the paintings these people wear; anyone whose painting is missing or does not load draws as the stand-in. */
  async preload(persons: Iterable<CastPerson>): Promise<void> {
    const reg = this.registry;
    await Promise.all([...new Set(persons)].map(async (p) => this.arts.set(p, reg ? await loadCastArt(reg, p) : null)));
  }

  /** A bellhop's painted hat as it flies off, at the size it sat on their head; null without the painting. */
  hat(person: CastPerson): { texture: Texture; pivot: { x: number; y: number }; scale: number } | null {
    const art = this.arts.get(person);
    if (!art?.hat) return null;
    const look = LOOKS[person];
    const { whole, plate } = art.hat;
    return { texture: whole, pivot: plate.pivot!, scale: hatWorldWidth(art.rig, look.head ?? art.head.share, look.height) / plate.span! };
  }

  setQuality(q: Quality): void {
    this.rimOn = q !== "low";
  }

  /** Who draws from their painting and who as the stand-in, for the checks. */
  artState(): { painted: CastPerson[]; standIn: CastPerson[] } {
    const all = [...this.arts];
    return { painted: all.filter(([, a]) => a).map(([p]) => p), standIn: all.filter(([, a]) => !a).map(([p]) => p) };
  }

  /** The painting where it loaded, the stand-in where it did not. */
  private draw(v: View, s: Solved, o: FigureOpts, recolor: string | null, dazed: boolean, rim: Rim | null = null): void {
    if (!v.painted) return drawFigure(v.body, s, v.look, o);
    v.painted.apply(s, { recolor, dazed, hat: o.hat && HATTED.has(o.job), silhouette: o.silhouette }, rim);
    drawCarried(v.carried, s, o);
  }

  sync(prev: Snapshot, cur: Snapshot, alpha: number, time: number, level: Pick<Level, "furniture" | "platforms">, lights: readonly { x: number; y: number }[] = [], view: Rect | null = null): void {
    const s = between(prev, cur, alpha);
    const seen = new Set<number>();
    for (const n of s.cast) {
      if (!n.alive) continue;
      seen.add(n.id);
      let v = this.views.get(n.id);
      if (!v) {
        const root = new Container({ label: n.spawn });
        const shadow = new Graphics();
        const body = new Graphics();
        const stars = new Graphics();
        const art = this.arts.get(n.person) ?? null;
        const painted = art ? new PaintedFigure(art) : null;
        const carried = new Graphics();
        root.addChild(shadow, body, ...(painted ? [painted.container] : []), carried, stars);
        this.container.addChild(root);
        v = { root, body, painted, carried, shadow, stars, look: recolored(LOOKS[n.person], n.recolor), mask: null, air: !n.onGround, squashT: 0 };
        this.views.set(n.id, v);
      }
      // Far off the view he is neither posed nor drawn; his view is kept for when he comes back.
      const seenNow = !view || onScreen(n.x, n.y - n.h / 2, view);
      v.root.visible = seenNow;
      if (!seenNow) continue;
      const hidden = n.act === "hide" || (n.hide && n.act === "windup");
      const t = n.actT + alpha * STEP;
      const pose = castPose({ role: n.role, act: n.act, t, speed: Math.abs(n.vx), onGround: n.onGround, sit: n.sit, spin: n.spin, hits: n.hits });
      const art = v.painted ? this.arts.get(n.person)! : null;
      const solved = art
        ? solve(pose, n.facing, castHeadScale(v.look.head ?? art.head.share, art.head), art.head, art.skeleton)
        : solve(pose, n.facing, HEAD_SCALE, HEAD_PLATE_DEFAULT);
      const k = (v.look.height * n.size) / HERO_HEIGHT;
      const dy = groundShift(solved, castGround(n.act, n.onGround, n.sit));
      const dazed = DAZED.has(n.act);
      v.body.clear();
      v.carried.clear();
      v.shadow.clear();
      v.stars.clear();
      if (hidden) {
        const cover = coverOf(n.x, level);
        if (!cover) continue;
        if (!v.mask) {
          v.mask = new Graphics();
          this.container.addChild(v.mask);
          v.root.mask = v.mask;
        }
        if (cover.kind === "counter") {
          // Crouched behind the pass, only his toque over the counter in the lamps' glow; winding up, he rears up out of it.
          const crown = n.y + (dy + solved.crown.y) * k;
          const sink = counterSink(crown, cover.top, n.act === "windup" ? Math.min(1, t / REAR_T) : 0);
          v.root.position.set(n.x, n.y + dy * k + sink);
          v.root.scale.set(k);
          v.root.alpha = 1;
          v.mask.clear().rect(n.x - 400, cover.top - 1000, 800, 1000).fill(0xffffff);
          this.draw(v, solved, { role: n.role, job: n.job, act: n.act, hat: n.hat, prop: n.prop, slimed: n.slimed, silhouette: false }, n.recolor, dazed);
          this.crowns.set(n.id, { x: n.x + solved.crown.x * k, y: crown + sink, facing: n.facing });
          v.root.zIndex = n.y;
          continue;
        }
        // His shadow thrown on the lit screen: the figure, dark, clipped to the sheet.
        const sheet = { x: cover.sheet.x, y: cover.sheet.y, w: cover.sheet.w, h: SHEET_H };
        // His feet a little below the sheet's bottom edge, so his head and shoulders fill it.
        v.root.position.set(n.x, sheet.y + sheet.h + 30);
        v.root.scale.set(k * 0.95);
        v.root.alpha = 0.55;
        v.mask.clear().rect(sheet.x, sheet.y, sheet.w, sheet.h).fill(0xffffff);
        this.draw(v, solved, { role: n.role, job: n.job, act: n.act, hat: n.hat, prop: n.prop, slimed: n.slimed, silhouette: true }, n.recolor, dazed);
        // His head on the sheet, so "Got a minute?" has somewhere to hang from.
        this.crowns.set(n.id, { x: n.x + solved.crown.x * k * 0.95, y: sheet.y + sheet.h + 30 + solved.crown.y * k * 0.95, facing: n.facing });
        v.root.zIndex = -1e5;
        continue;
      }
      if (v.mask) {
        v.root.mask = null;
        v.mask.destroy();
        v.mask = null;
      }
      // A landing squashes him for a moment.
      if (v.air && n.onGround) v.squashT = SQUASH.t;
      v.air = !n.onGround;
      v.squashT = Math.max(0, v.squashT - STEP);
      const q = v.squashT / SQUASH.t;
      v.root.alpha = 1;
      v.root.position.set(n.x, n.y + dy * k);
      v.root.scale.set(k * (1 + (SQUASH.x - 1) * q), k * (1 + (SQUASH.y - 1) * q));
      v.root.zIndex = n.y;
      v.shadow.ellipse(0, -dy, SHADOW_RX * v.look.build, 14).fill({ color: 0x000000, alpha: 0.3 });
      const lit = this.rimOn ? rimFor(n.x, n.y - n.h / 2, lights) : null;
      // The root is scaled by k: the edge's offset is in world px.
      const rim = lit && { ...lit, px: RIM.offset / k };
      this.draw(v, solved, { role: n.role, job: n.job, act: n.act, hat: n.hat, prop: n.prop, slimed: n.slimed, silhouette: false }, n.recolor, dazed, rim);
      if (dazed) {
        const c = solved.crown;
        for (let i = 0; i < STARS.n; i++) {
          const a = time * STARS.rate + (i * Math.PI * 2) / STARS.n;
          star(v.stars, c.x + Math.cos(a) * STARS.r, c.y - 20 + Math.sin(a) * STARS.r * 0.35, STARS.size);
        }
      }
      this.crowns.set(n.id, { x: n.x + solved.crown.x * k, y: n.y + (dy + solved.crown.y) * k, facing: n.facing });
    }
    for (const [id, v] of this.views)
      if (!seen.has(id)) {
        v.mask?.destroy();
        v.painted?.destroy();
        v.root.destroy({ children: true });
        this.views.delete(id);
        this.crowns.delete(id);
      }
  }

  /** Where a cast member's head is, for his speech bubble; null once he is gone. */
  crownOf(id: number): { x: number; y: number; facing: 1 | -1 } | null {
    return this.crowns.get(id) ?? null;
  }

  destroy(): void {
    for (const v of this.views.values()) v.painted?.destroy();
    this.views.clear();
    this.container.destroy({ children: true });
  }
}
