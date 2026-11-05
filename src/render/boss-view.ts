import { Container, Graphics } from "pixi.js";
import type { Registry } from "../art/registry";
import type { Boss } from "../sim/boss";
import { castPose } from "../sim/rig/cast";
import type { CastPerson } from "../sim/level";
import type { Point } from "../sim/types";
import { Diner } from "./quests/diner";

/** Who a boss is drawn as: the supervisor wears the housekeeper's painting, navy, a shade larger (story spec §8.2). */
const WHO: Record<Boss["kind"], { person: CastPerson; recolor: string | null; size: number }> = {
  supervisor: { person: "housekeeper-1", recolor: "#1f2c4d", size: 1.05 },
  titanium: { person: "titanium", recolor: null, size: 1 },
  // Navy, in the housekeeper's painting, until her own is cut.
  purser: { person: "purser", recolor: "#1b2748", size: 1 },
};

/** A boss standing in the level: their painting (or stand-in), posed by their state, always behind him. */
export class BossView {
  readonly container = new Container({ label: "boss" });
  private figure: Diner | null = null;
  private kind: Boss["kind"] | null = null;
  /** Lifetime Titanium guy's briefcase, in his near hand. */
  private readonly briefcase = new Graphics();

  constructor(
    parent: Container,
    private readonly registry: Registry,
    private readonly noart: boolean,
  ) {
    this.container.sortableChildren = true;
    parent.addChild(this.container);
    this.briefcase.roundRect(-46, -8, 92, 66, 6).fill("#6b3f1e").roundRect(-46, -8, 92, 66, 6).stroke({ width: 4, color: "#0c0c0e" });
    this.briefcase.roundRect(-16, -22, 32, 14, 4).stroke({ width: 5, color: "#3a2312" });
    this.briefcase.rect(-46, 14, 92, 5).fill("#3a2312");
    this.briefcase.zIndex = 50;
    this.briefcase.visible = false;
    this.container.addChild(this.briefcase);
  }

  /** Loads the figure a level's boss wears; once for each kind met. */
  async load(kind: Boss["kind"]): Promise<void> {
    if (this.kind === kind) return;
    this.figure?.destroy();
    const who = WHO[kind];
    this.kind = kind;
    this.figure = new Diner(this.container, this.registry, who.person, who.recolor, this.noart, who.size);
    await this.figure.load();
  }

  get isPainted(): boolean {
    return !!this.figure?.isPainted;
  }

  get crown(): Point | null {
    return this.figure?.crown ?? null;
  }

  /** Drawn where the boss stands, or hidden when the level has none. */
  sync(b: Boss | null, time: number): void {
    this.container.visible = !!b && !!this.figure && this.kind === b.kind && !(b.kind === "titanium" && b.state === "down");
    if (!b || !this.figure || this.kind !== b.kind) return;
    if (b.kind === "titanium") {
      const flying = b.state === "pool";
      const act = flying ? "fly" : b.state === "windup" || b.state === "grab" ? "windup" : b.state === "swing" || b.state === "lunge" || b.state === "throw" ? "attack" : b.vx !== 0 ? "walk" : "idle";
      const pose = castPose({ role: "office", act, t: time % 1, speed: 0, onGround: b.onGround, sit: false, spin: flying ? time * 600 : 0, hits: 0 });
      this.figure.pose(pose, b.facing, { x: b.x, y: b.y }, b.flinch > 0, time, b.onGround ? "planted" : "none");
      const hand = this.figure.handOffset(pose, b.facing, "handNear");
      this.briefcase.visible = !flying;
      this.briefcase.position.set(b.x + hand.x - this.container.x, b.y + hand.y - this.container.y);
      return;
    }
    this.briefcase.visible = false;
    if (b.kind === "purser") {
      const pose = castPose({ role: "office", act: b.state === "push" ? "attack" : b.flinch > 0 ? "bumped" : "idle", t: time % 1, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 });
      // Down, she has pulled the curtain back and stands to the far side of it.
      this.figure.pose(pose, -1, { x: b.state === "down" ? b.x + 120 : b.x, y: b.y }, b.flinch > 0, time, "planted");
      return;
    }
    const act = b.state === "down" ? "down" : b.state === "windup" ? "windup" : b.state === "wave" ? "attack" : "idle";
    const pose = castPose({ role: "bellhop", act, t: time % 1, speed: 0, onGround: true, sit: false, spin: 0, hits: 0, flat: true });
    this.figure.pose(pose, b.facing, { x: b.x, y: b.y }, b.state === "down" || b.flinch > 0, time, b.state === "down" ? "body" : "planted");
  }

  /** Behind him, whatever he does. */
  sort(z: number): void {
    this.container.zIndex = z;
  }

  destroy(): void {
    this.figure?.destroy();
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
