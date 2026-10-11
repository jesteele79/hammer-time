import { Container, MeshRope, Point as PxPoint, type Texture } from "pixi.js";
import type { Solved } from "../sim/rig/fk";
import type { Point } from "../sim/types";

/** A hand towel's hang, world px: points, their spacing and its width across. */
export type TowelFit = { n: number; len: number; width: number };
export const TOWEL: TowelFit = { n: 8, len: 16, width: 52 };
/** The towel is out of the pocket between these fractions of the wipe. */
export const TOWEL_OUT = [0.04, 0.95] as const;

/**
 * The towel as a hanging chain: the first point is the hand, the rest follow at `len` apart,
 * each sagging toward where it was plus a little lower, so it swings and settles hanging down.
 */
export function towelChain(anchor: Point, prev: Point[], n: number, len: number): Point[] {
  const pts: Point[] = [{ ...anchor }];
  for (let i = 1; i < n; i++) {
    const was = prev[i] ?? { x: anchor.x, y: anchor.y + len * i };
    const up = pts[i - 1];
    const x = was.x;
    const y = was.y + len * 0.35;
    const d = Math.hypot(x - up.x, y - up.y) || 1;
    pts.push({ x: up.x + ((x - up.x) / d) * len, y: up.y + ((y - up.y) / d) * len });
  }
  return pts;
}

/**
 * Whether his left hand, wiping his face, is drawn over his head: while its wrist is up in front
 * of his neck. It swings up in front of him and flicks out in front, so it changes layers clear
 * of his head and his shirt.
 */
export function towelAtFace(solved: Solved): boolean {
  const w = solved.joints.wristFar;
  const n = solved.joints.neck;
  return w.y < n.y && (w.x - n.x) * solved.facing > 0;
}

/** How far along the hand, from the wrist, the towel is held: in the palm, not at the fingertips. */
const GRIP = 0.3;

/** This frame's towel in the facing-right frame (x times facing), hung from the palm of his left hand. */
export function hangTowel(solved: Solved, prev: Point[], fit: TowelFit = TOWEL): Point[] {
  const f = solved.facing;
  const w = solved.joints.wristFar;
  const k = solved.joints.handFar;
  const palm = { x: (w.x + (k.x - w.x) * GRIP) * f, y: w.y + (k.y - w.y) * GRIP };
  return towelChain(palm, prev, fit.n, fit.len);
}

/** Texture px per world px: the rope is drawn from a sharper texture shrunk back down. */
const RES = 4;

/**
 * The towel rope, worked in the facing-right frame: the holder mirrors it for the
 * left. Its texture runs along the rope (the plate's top at the hand) and its
 * height is the towel's width.
 */
export class Towel {
  readonly holder = new Container({ label: "towel" });
  private readonly points: PxPoint[];
  private chain: Point[] = [];
  private readonly rope: MeshRope;

  /** `texture` comes from `towelTexture` at the fit's width. */
  constructor(
    texture: Texture,
    readonly fit: TowelFit = TOWEL,
  ) {
    this.points = Array.from({ length: fit.n }, () => new PxPoint());
    this.rope = new MeshRope({ texture, points: this.points, textureScale: 0 });
    this.rope.scale.set(1 / RES);
    this.holder.addChild(this.rope);
    this.holder.visible = false;
  }

  set tint(t: number) {
    this.rope.tint = t;
  }

  /** Hangs the towel from this frame's far hand; null puts it away. */
  update(solved: Solved | null): void {
    if (!solved) {
      this.holder.visible = false;
      this.chain = [];
      return;
    }
    this.chain = hangTowel(solved, this.chain, this.fit);
    this.chain.forEach((p, i) => this.points[i].set(p.x * RES, p.y * RES));
    this.holder.scale.x = solved.facing;
    this.holder.visible = true;
  }
}

/** The towel plate turned to run along a rope: its top (where it hangs from) at the start, `width` world px across. */
export function towelTexture(plate: Texture, width: number, make: (canvas: HTMLCanvasElement) => Texture): Texture {
  const k = (width * RES) / plate.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(plate.height * k));
  canvas.height = Math.max(1, Math.round(plate.width * k));
  const ctx = canvas.getContext("2d")!;
  // (x, y) on the plate lands at (y, x): the hanging point first, the plate's width across the rope.
  ctx.setTransform(0, k, k, 0, 0, 0);
  ctx.drawImage(plate.source.resource as CanvasImageSource, 0, 0);
  return make(canvas);
}
