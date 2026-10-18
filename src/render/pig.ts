import { Assets, ColorMatrixFilter, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ART_BASE, type Registry } from "../art/registry";
import type { Pig } from "../sim/pig";
import { solve } from "../sim/rig/fk";
import { groundShift } from "../sim/rig/ground";
import { pigFace, pigPose, type PigClipCtx, type PigFace } from "../sim/rig/pig";
import { blend, type Pose } from "../sim/rig/pose";
import { HERO_HEIGHT } from "../sim/rig/skeleton";
import { castHeadScale } from "./cast-art";
import { loadPigArt, PaintedFigure, type CastArt } from "./cast-body";
import { addGlob, drawGlob, globPoint, stepGlob, stickGlob, type Glob } from "./goo";
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
/** A tuft of stuffing out of a hit, flying, turning and fading behind him. */
type Tuft = { s: Sprite; vx: number; vy: number; spin: number; life: number };
const TUFT = { width: 90, life: 1, fade: 0.3, gravity: 1800 } as const;

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
  /** The drawn pig until the painting is in, and for good if it never is. */
  kind: "drawn" | "painted" = "drawn";
  private readonly body = new Container({ label: "pig-body" });
  private readonly standIn = new Graphics();
  private readonly flash = whiteFlash();
  /** The tufts fly beside it and sort with it. */
  private readonly tuftLayer = new Container({ label: "pig-tufts" });
  private art: CastArt | null = null;
  private figure: PaintedFigure | null = null;
  private tuftTextures: Texture[] = [];
  private readonly tufts: Tuft[] = [];
  /** The floor it stands on: in a hop's air it is not grounded. */
  private floorY = 0;
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
  /** The snot stuck to it, over the painting (the drawn pig carries none), and the frame it was last drawn in. */
  private readonly goo = new Graphics();
  private globs: Glob[] = [];
  private frame: { x: number; y: number; k: number; joints: Record<string, { x: number; y: number }>; facing: 1 | -1 } | null = null;
  private gooSeed = 1;
  private here: { x: number; y: number; facing: 1 | -1 } = { x: 0, y: 0, facing: -1 };

  constructor(
    parent: Container,
    private readonly particles: Particles,
  ) {
    this.body.addChild(this.standIn, this.goo);
    this.container.addChild(this.body);
    this.container.visible = false;
    parent.addChild(this.container, this.tuftLayer);
  }

  /** The painting and its tufts, once: the drawn pig stands in until they are in, and for good if they never are. */
  async load(registry: Registry): Promise<void> {
    if (this.art) return;
    const art = await loadPigArt(registry);
    // A look stopped while it loaded has let the view go.
    if (!art || this.container.destroyed) return;
    this.art = art;
    this.figure = new PaintedFigure(art);
    this.body.removeChild(this.standIn);
    this.body.addChildAt(this.figure.container, 0);
    this.kind = "painted";
    try {
      this.tuftTextures = await Promise.all((registry.pig?.stuffing ?? []).map((p) => Assets.load<Texture>(ART_BASE + p.file)));
    } catch (err) {
      console.warn(`pig: its tufts did not load, plain fluff stands in (${(err as Error).message})`);
    }
  }

  /** Sorts it and its tufts among the play layer's children: the caller puts them behind him. */
  sort(z: number): void {
    this.container.zIndex = this.tuftLayer.zIndex = z;
  }

  sync(prev: Pig | null, cur: Pig | null, alpha: number, dt: number): void {
    // Tufts in flight finish even once the pig is gone.
    this.stepTufts(dt);
    this.container.visible = !!cur;
    if (!cur) {
      this.crownAt = null;
      return;
    }
    this.floorY = cur.floor;
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
    this.drawGoo(dt);
  }

  /** Each glob of snot stepped and drawn over the painting, its strands down to the pig's floor, its drips let go. */
  private drawGoo(dt: number): void {
    this.goo.clear();
    const f = this.frame;
    if (!f) return;
    const floor = (this.floorY - f.y) / f.k;
    for (const g of this.globs) {
      const at = globPoint(g, f.joints, f.facing);
      for (const d of stepGlob(g, dt, floor - at.y)) this.particles.emit(g.hot ? "dripHot" : "drip", f.x + (at.x + d.x) * f.k, f.y + (at.y + d.y) * f.k, 1);
      drawGlob(this.goo, g, at, floor);
    }
  }

  /** Snot hit it at world `x, y`: it sticks to the part of the painted pig it hit. */
  slime(x: number, y: number, hot: boolean): void {
    const f = this.frame;
    if (!f) return;
    addGlob(this.globs, stickGlob(f.joints, f.facing, { x: (x - f.x) / f.k, y: (y - f.y) / f.k }, hot, this.gooSeed++));
  }

  /** How many globs of snot are stuck to it, for the checks. */
  get globCount(): number {
    return this.globs.length;
  }

  /**
   * The painted pig, solved on its own skeleton (the solve turns, squashes and mirrors it, so the body only scales it to
   * 420 px), its feet planted while it is on its floor; or the drawn pig: turned about its middle, squashed from its
   * feet, mirrored to face right.
   */
  protected draw(pose: Pose, face: PigFace | null, facing: 1 | -1): void {
    if (this.figure && this.art) {
      const head = this.art.head;
      const solved = solve(pose, facing, castHeadScale(head.share, head), head, this.art.skeleton);
      const k = PIG_HEIGHT / HERO_HEIGHT;
      const dy = this.here.y >= this.floorY - 0.5 ? groundShift(solved, "planted") : 0;
      this.body.pivot.set(0, 0);
      this.body.rotation = 0;
      this.body.position.set(0, dy * k);
      this.body.scale.set(k);
      this.figure.apply(solved, { recolor: null, dazed: false, hat: false, silhouette: false, face }, null);
      this.frame = { x: this.here.x, y: this.here.y + dy * k, k, joints: solved.joints, facing };
      this.crownAt = { x: this.here.x + solved.crown.x * k, y: this.here.y + (solved.crown.y + dy) * k, facing };
      return;
    }
    const mid = -PIG_HEIGHT * 0.4;
    this.frame = null;
    drawPigStandIn(this.standIn, face);
    this.body.pivot.set(0, mid);
    this.body.position.set(0, mid * pose.squash.y);
    this.body.rotation = -pose.spin * DEG * facing;
    this.body.scale.set((facing === -1 ? 1 : -1) * pose.squash.x, pose.squash.y);
    this.crownAt = { x: this.here.x, y: this.here.y - PIG_HEIGHT * pose.squash.y, facing };
  }

  /** A hit: the white flash, a puff of stuffing and a tuft where it landed. */
  hit(x: number, y: number): void {
    this.flashT = FLASH_T;
    this.particles.emit("stuffing", x, y, 10);
    this.throwTuft(x, y);
  }

  /** Beaten: stuffing out at two seams. */
  down(): void {
    const { x, y } = this.here;
    const seams = [
      { x: x - 70, y: y - PIG_HEIGHT * 0.55 },
      { x: x + 90, y: y - PIG_HEIGHT * 0.35 },
    ];
    for (const s of seams) {
      this.particles.emit("stuffing", s.x, s.y, 16);
      this.throwTuft(s.x, s.y);
    }
  }

  /** A tuft of stuffing out of the pig, flying, turning and fading behind him; with no tuft pictures, only the fluff puffs. */
  private throwTuft(x: number, y: number): void {
    if (!this.tuftTextures.length) return;
    const tex = this.tuftTextures[Math.floor(Math.random() * this.tuftTextures.length)];
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.scale.set(TUFT.width / tex.width);
    s.position.set(x, y);
    this.tuftLayer.addChild(s);
    const side = Math.random() < 0.5 ? -1 : 1;
    this.tufts.push({ s, vx: side * (80 + Math.random() * 160), vy: -(500 + Math.random() * 300), spin: side * (2 + Math.random() * 3), life: TUFT.life });
  }

  private stepTufts(dt: number): void {
    for (const t of this.tufts) {
      t.vy += TUFT.gravity * dt;
      t.s.x += t.vx * dt;
      t.s.y += t.vy * dt;
      t.s.rotation += t.spin * dt;
      t.life -= dt;
      t.s.alpha = Math.max(0, Math.min(1, t.life / TUFT.fade));
      if (t.life <= 0) t.s.destroy();
    }
    for (let i = this.tufts.length - 1; i >= 0; i--) if (this.tufts[i].life <= 0) this.tufts.splice(i, 1);
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
    for (const t of this.tufts) t.s.destroy();
    this.tufts.length = 0;
    this.globs = [];
    this.goo.clear();
  }

  destroy(): void {
    this.figure?.destroy();
    if (!this.container.destroyed) this.container.destroy({ children: true });
    if (!this.tuftLayer.destroyed) this.tuftLayer.destroy({ children: true });
  }
}
