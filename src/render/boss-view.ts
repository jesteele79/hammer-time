import { Container } from "pixi.js";
import type { Registry } from "../art/registry";
import type { Boss } from "../sim/boss";
import { castPose } from "../sim/rig/cast";
import type { CastPerson } from "../sim/level";
import type { Point } from "../sim/types";
import { Diner } from "./quests/diner";

/** Who a boss is drawn as: the supervisor wears the housekeeper's painting, navy, a shade larger (story spec §8.2). */
const WHO: Record<Boss["kind"], { person: CastPerson; recolor: string | null; size: number }> = {
  supervisor: { person: "housekeeper-1", recolor: "#1f2c4d", size: 1.05 },
};

/** A boss standing in the level: their painting (or stand-in), posed by their state, always behind him. */
export class BossView {
  readonly container = new Container({ label: "boss" });
  private figure: Diner | null = null;
  private kind: Boss["kind"] | null = null;

  constructor(
    parent: Container,
    private readonly registry: Registry,
    private readonly noart: boolean,
  ) {
    this.container.sortableChildren = true;
    parent.addChild(this.container);
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
    this.container.visible = !!b && !!this.figure && this.kind === b.kind;
    if (!b || !this.figure || this.kind !== b.kind) return;
    const act = b.state === "down" ? "down" : b.state === "windup" ? "windup" : b.state === "wave" ? "attack" : "idle";
    const pose = castPose({ role: "bellhop", act, t: time % 1, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 });
    this.figure.pose(pose, b.facing, { x: b.x, y: b.y }, b.state === "down" || b.flinch > 0, time, b.state === "down" ? "none" : "planted");
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
