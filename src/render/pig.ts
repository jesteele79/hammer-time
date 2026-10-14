import { ColorMatrixFilter, Container, Graphics } from "pixi.js";
import type { Pig } from "../sim/pig";
import { pigFace, pigPose, type PigClipCtx, type PigFace } from "../sim/rig/pig";
import { blend, type Pose } from "../sim/rig/pose";
import { PALETTE } from "./palette";
import type { Particles } from "./particles";

/** It stands 420 px tall (R3 §5.2). */
export const PIG_HEIGHT = 420;
/** A change of state blends over this long, so nothing jumps between its clips. */
const BLEND_T = 0.12;
/** The hit's white flash (R3 §5.2). */
const FLASH_T = 0.08;
const DUST_EVERY = 0.06;
const DEG = Math.PI / 180;

/** Every drawn pixel white, its alpha kept: the hit flash. */
function whiteFlash(): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  f.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  return f;
}

/**
 * The code-drawn pig (main spec §7.2), standing in while its painting is missing: a pink pear with its head, snout, ears
 * and button eyes, stubby arms and legs and a curl of tail, drawn facing left as the painting is. A placeholder.
 */
export function drawPigStandIn(g: Graphics, face: PigFace | null): void {
  const H = PIG_HEIGHT;
  const pink = "#f3a6bd";
  const pad = "#e45a8a";
  const line = { width: 6, color: PALETTE.outline };
  g.clear();
  g.ellipse(0.16 * H, -0.12 * H, 0.06 * H, 0.12 * H).fill(pink).stroke(line);
  g.ellipse(-0.02 * H, -0.06 * H, 0.08 * H, 0.06 * H).fill(pink).stroke(line);
  g.circle(0.36 * H, -0.42 * H, 0.04 * H).fill(pink).stroke(line);
  g.ellipse(0.08 * H, -0.36 * H, 0.27 * H, 0.3 * H).fill(pink).stroke(line);
  g.roundRect(-0.28 * H, -0.5 * H, 0.26 * H, 0.08 * H, 0.04 * H).fill(pink).stroke(line);
  g.circle(-0.26 * H, -0.46 * H, 0.04 * H).fill(pad);
  g.circle(-0.02 * H, -0.76 * H, 0.21 * H).fill(pink).stroke(line);
  g.ellipse(0.12 * H, -0.93 * H, 0.06 * H, 0.05 * H).fill(pink).stroke(line);
  g.roundRect(-0.33 * H, -0.8 * H, 0.14 * H, 0.12 * H, 0.04 * H).fill(pink).stroke(line);
  g.ellipse(-0.33 * H, -0.74 * H, 0.025 * H, 0.055 * H).fill(pad).stroke(line);
  const eye = { x: -0.12 * H, y: -0.84 * H };
  if (face === "defeated") g.moveTo(eye.x - 9, eye.y - 9).lineTo(eye.x + 9, eye.y + 9).moveTo(eye.x + 9, eye.y - 9).lineTo(eye.x - 9, eye.y + 9).stroke(line);
  else if (face === "squint" || face === "hurt") g.moveTo(eye.x - 10, eye.y).lineTo(eye.x + 10, eye.y).stroke(line);
  else g.circle(eye.x, eye.y, face === "charge" ? 9 : 6).fill(PALETTE.outline);
}

/**
 * The gift shop's pig as the sim has it: its clips blended across a change of state, its flash, its dust on a charge and
 * its stuffing on a hit. Drawn behind Hammer (the caller sorts it), so nothing of it is ever over his face.
 */
export class PigView {
  readonly container = new Container({ label: "pig" });
  /** The drawn pig until the painting is in (Task 5), and for good if it never is. */
  kind: "drawn" | "painted" = "drawn";
  private readonly body = new Container({ label: "pig-body" });
  private readonly standIn = new Graphics();
  private readonly flash = whiteFlash();
  /** The tufts fly beside it and sort with it. */
  protected readonly tuftLayer = new Container({ label: "pig-tufts" });
  private state: Pig["state"] | null = null;
  private stateT = 0;
  private landT: number | null = null;
  private clock = 0;
  private flashT = 0;
  private dustT = 0;
  private from: Pose | null = null;
  private last: Pose | null = null;
  private blendT = BLEND_T;
  private crownAt: { x: number; y: number; facing: 1 | -1 } | null = null;
  private here: { x: number; y: number; facing: 1 | -1 } = { x: 0, y: 0, facing: -1 };

  constructor(
    parent: Container,
    private readonly particles: Particles,
  ) {
    this.body.addChild(this.standIn);
    this.container.addChild(this.body);
    this.container.visible = false;
    parent.addChild(this.container, this.tuftLayer);
  }

  /** Sorts it and its tufts among the play layer's children: the caller puts them behind him. */
  sort(z: number): void {
    this.container.zIndex = this.tuftLayer.zIndex = z;
  }

  sync(prev: Pig | null, cur: Pig | null, alpha: number, dt: number): void {
    this.container.visible = !!cur;
    if (!cur) {
      this.crownAt = null;
      return;
    }
    this.clock += dt;
    if (cur.state !== this.state) {
      this.from = this.last;
      this.blendT = 0;
      this.state = cur.state;
      this.stateT = 0;
      this.landT = null;
    } else this.stateT += dt;
    this.blendT += dt;
    if (cur.state === "hop" && cur.onGround) this.landT = this.landT === null ? 0 : this.landT + dt;
    const ctx: PigClipCtx = { state: cur.state, t: this.stateT, clock: this.clock, hurtT: cur.hurtT, onGround: cur.onGround, landT: this.landT };
    let pose = pigPose(ctx);
    if (this.from && this.blendT < BLEND_T) pose = blend(this.from, pose, this.blendT / BLEND_T);
    this.last = pose;
    const x = prev ? prev.x + (cur.x - prev.x) * alpha : cur.x;
    const y = prev ? prev.y + (cur.y - prev.y) * alpha : cur.y;
    this.here = { x, y, facing: cur.facing };
    this.container.position.set(x, y);
    this.flashT = Math.max(0, this.flashT - dt);
    this.container.filters = this.flashT > 0 ? [this.flash] : null;
    if (cur.state === "charge") {
      this.dustT += dt;
      if (this.dustT >= DUST_EVERY) {
        this.dustT = 0;
        this.particles.emit("dust", x - cur.facing * 100, y, 2);
      }
    } else this.dustT = 0;
    this.draw(pose, pigFace(ctx), cur.facing);
  }

  /** The drawn pig: turned about its middle, squashed from its feet, mirrored to face right. */
  protected draw(pose: Pose, face: PigFace | null, facing: 1 | -1): void {
    const mid = -PIG_HEIGHT * 0.4;
    drawPigStandIn(this.standIn, face);
    this.body.pivot.set(0, mid);
    this.body.position.set(0, mid * pose.squash.y);
    this.body.rotation = -pose.spin * DEG * facing;
    this.body.scale.set((facing === -1 ? 1 : -1) * pose.squash.x, pose.squash.y);
    this.crownAt = { x: this.here.x, y: this.here.y - PIG_HEIGHT * pose.squash.y, facing };
  }

  /** A hit: the white flash and a puff of stuffing where it landed. */
  hit(x: number, y: number): void {
    this.flashT = FLASH_T;
    this.particles.emit("stuffing", x, y, 10);
  }

  /** Beaten: stuffing out at two seams. */
  down(): void {
    const { x, y } = this.here;
    this.particles.emit("stuffing", x - 70, y - PIG_HEIGHT * 0.55, 16);
    this.particles.emit("stuffing", x + 90, y - PIG_HEIGHT * 0.35, 16);
  }

  /** Where a bubble over it hangs from. */
  crown(): { x: number; y: number; facing: 1 | -1 } | null {
    return this.container.visible ? this.crownAt : null;
  }

  /** A new venue or run: nothing carries over. */
  clear(): void {
    this.state = null;
    this.from = this.last = null;
    this.flashT = 0;
    this.container.filters = null;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
