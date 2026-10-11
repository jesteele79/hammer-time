import { Container, MeshRope, Point as PxPoint, type Texture } from "pixi.js";
import type { Solved } from "../sim/rig/fk";
import type { Point } from "../sim/types";

/** A hand towel's hang, world px: points, their spacing, its width across, and the gap it keeps from the face. */
export type TowelFit = { n: number; len: number; width: number; gap: number };
export const TOWEL: TowelFit = { n: 8, len: 16, width: 52, gap: 4 };

/**
 * The towel as a hanging chain: the first point is the hand, the rest follow at `len` apart
 * under gravity with damping, and no point goes past `back` (the head's back edge in front
 * of which the towel would cover the face): the towel passes behind the head, never in front.
 */
export function towelChain(anchor: Point, prev: Point[], n: number, len: number, back: number): Point[] {
  const pts: Point[] = [{ ...anchor }];
  for (let i = 1; i < n; i++) {
    const was = prev[i] ?? { x: anchor.x, y: anchor.y + len * i };
    const up = pts[i - 1];
    let x = was.x;
    let y = was.y + len * 0.35;
    const d = Math.hypot(x - up.x, y - up.y) || 1;
    x = up.x + ((x - up.x) / d) * len;
    y = up.y + ((y - up.y) / d) * len;
    pts.push({ x: Math.min(x, back), y });
  }
  return pts;
}

/**
 * This frame's towel in the facing-right frame (x times facing), hung from the far hand.
 * Wherever it could reach the face's height it stays behind the face's back edge by half
 * its width and the gap, the hand's end included; below the chin it hangs free.
 */
export function hangTowel(solved: Solved, prev: Point[], fit: TowelFit = TOWEL): Point[] {
  const f = solved.facing;
  const face = solved.faceBox;
  const hand = { x: solved.joints.handFar.x * f, y: solved.joints.handFar.y };
  const margin = fit.width / 2 + fit.gap;
  const back = (f === 1 ? face.x : -(face.x + face.w)) - margin;
  const high = hand.y < face.y + face.h + margin;
  const anchor = high ? { x: Math.min(hand.x, back), y: hand.y } : hand;
  return towelChain(anchor, prev, fit.n, fit.len, high ? back : Infinity);
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
