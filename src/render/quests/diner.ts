import { Container, Graphics } from "pixi.js";
import { type Registry } from "../../art/registry";
import type { CastPerson } from "../../sim/level";
import { BANQUET_SCALE } from "../../sim/quests/hungry/table";
import { solve, type Solved } from "../../sim/rig/fk";
import { groundShift, type Ground } from "../../sim/rig/ground";
import type { Pose } from "../../sim/rig/pose";
import { HERO_HEIGHT } from "../../sim/rig/skeleton";
import type { Point } from "../../sim/types";
import { castHeadScale } from "../cast-art";
import { loadCastArt, PaintedFigure, type CastArt } from "../cast-body";
import { LOOKS, drawFigure, recolored, star, type CastLook } from "../cast";

/** The banquet's rivals and server for the speech bubbles: the pig is 900. */
export const DINER_ID = { student: 901, bellhop: 902, nurse: 903, server: 904 } as const;

/**
 * Someone at the banquet table: their painting skinned on their own skeleton, or the stand-in when it is missing, posed
 * by whatever pose the scene hands them, their feet where it says.
 */
export class Diner {
  readonly container = new Container({ label: "diner" });
  private art: CastArt | null = null;
  private painted: PaintedFigure | null = null;
  private readonly body = new Graphics();
  private readonly stars = new Graphics();
  private readonly look: CastLook;
  /** Their crown on screen as last drawn: their speech hangs from it. */
  crown: Point = { x: 0, y: 0 };

  constructor(
    parent: Container,
    private readonly registry: Registry,
    private readonly person: CastPerson,
    private readonly recolor: string | null,
    private readonly noart: boolean,
  ) {
    this.look = recolored(LOOKS[person], recolor);
    this.container.addChild(this.body, this.stars);
    parent.addChild(this.container);
  }

  async load(): Promise<void> {
    this.art = this.noart ? null : await loadCastArt(this.registry, this.person);
    if (this.art) {
      this.painted = new PaintedFigure(this.art);
      this.container.addChildAt(this.painted.container, 0);
    }
  }

  /** Drawn from their painting (not the stand-in). */
  get isPainted(): boolean {
    return !!this.painted;
  }

  private solved(p: Pose, facing: 1 | -1): Solved {
    const a = this.art;
    return a ? solve(p, facing, castHeadScale(this.look.head ?? a.head.share, a.head), a.head, a.skeleton) : solve(p, facing, 0.26);
  }

  /** Their size: their own height, at twice the shift's size at the banquet (R4 §2). */
  private get k() {
    return (this.look.height / HERO_HEIGHT) * BANQUET_SCALE;
  }

  /** Where their far hand is from their feet, world px, in this pose: the dive anchors the hand on the cloth. */
  handOffset(p: Pose, facing: 1 | -1): Point {
    const j = this.solved(p, facing).joints.handFar;
    return { x: j.x * this.k, y: j.y * this.k };
  }

  /** Posed and placed: `feet` is where they stand (`ground` plants the soles there), or where the dive's offset puts them. */
  pose(p: Pose, facing: 1 | -1, feet: Point, dazed: boolean, time: number, ground: Ground = "none"): void {
    const s = this.solved(p, facing);
    const k = this.k;
    const dy = groundShift(s, ground) * k;
    this.container.position.set(feet.x, feet.y + dy);
    this.container.scale.set(k);
    this.body.clear();
    this.stars.clear();
    if (this.painted) this.painted.apply(s, { recolor: this.recolor, dazed, hat: false, silhouette: false });
    else drawFigure(this.body, s, this.look, { role: "office", job: "office", act: "idle", hat: false, prop: false, slimed: false, silhouette: false });
    if (dazed)
      for (let i = 0; i < 3; i++) {
        const a = time * 4 + (i * Math.PI * 2) / 3;
        star(this.stars, s.crown.x + Math.cos(a) * 40, s.crown.y - 20 + Math.sin(a) * 14, 9);
      }
    this.crown = { x: feet.x + s.crown.x * k, y: feet.y + dy + s.crown.y * k };
  }

  destroy(): void {
    this.painted?.destroy();
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
