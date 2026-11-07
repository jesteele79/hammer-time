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
  // Navy too, in the bellhop's, until his own is cut.
  conductor: { person: "conductor", recolor: "#1b2748", size: 1 },
  // The guard's painting until his own is cut.
  major: { person: "major", recolor: null, size: 1.05 },
  // The student's painting until his own is cut.
  replacement: { person: "replacement", recolor: null, size: 0.97 },
};
/** The selfie stick's length out of his near hand, folded and extended for the jab. */
const STICK = { folded: 60, out: 170 } as const;
/**
 * The replacement carried out (story spec §11.1): two residents walk in from the left over `in` s and take him one at each end,
 * lift him `up` px over `lift` s, and walk him out to the left at `walk` px/s, `gap` either side of him.
 */
export const CARRY = { from: 900, in: 1.4, lift: 0.4, up: 110, walk: 600, gap: 90 } as const;
/** Where the carry has the kid and his two residents `t` seconds after he went down. */
export function carryAt(x: number, t: number): { kid: { x: number; y: number }; carriers: { x: number; facing: 1 | -1; walking: boolean }[] } {
  const lift = Math.min(1, Math.max(0, (t - CARRY.in) / CARRY.lift));
  const out = Math.max(0, t - CARRY.in - CARRY.lift) * CARRY.walk;
  const walkIn = Math.min(1, t / CARRY.in);
  const carriers = [-1, 1].map((side) => {
    const end = x + side * CARRY.gap;
    const start = x - CARRY.from - (side + 1) * 80;
    return t < CARRY.in ? { x: start + (end - start) * walkIn, facing: 1 as const, walking: true } : { x: end - out, facing: -1 as const, walking: out > 0 };
  });
  return { kid: { x: x - out, y: -CARRY.up * lift }, carriers };
}

/** A boss standing in the level: their painting (or stand-in), posed by their state, always behind him. */
const RETREAT_FADE = 0.3;
/** The conductor goes through his door and on to the next: he fades over his walk's last moments, not popping off the screen. */
export const fadeOfBoss = (b: Pick<Boss, "kind" | "state"> & { timer?: number }): number => (b.kind === "conductor" && b.state === "retreat" ? Math.min(1, (b.timer ?? 1) / RETREAT_FADE) : 1);

export class BossView {
  readonly container = new Container({ label: "boss" });
  private figure: Diner | null = null;
  private kind: Boss["kind"] | null = null;
  /** Lifetime Titanium guy's briefcase, in his near hand. */
  private readonly briefcase = new Graphics();
  /** The replacement's selfie stick in his near hand and the tablet in his far one; the two residents who carry him out. */
  private readonly stick = new Graphics();
  private readonly tablet = new Graphics();
  private carriers: Diner[] = [];

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
    this.tablet.roundRect(-34, -24, 68, 48, 6).fill("#1b1d22").stroke({ width: 4, color: "#0c0c0e" });
    this.tablet.roundRect(-28, -18, 56, 36, 3).fill("#5fa8e8");
    this.tablet.zIndex = -5;
    this.stick.zIndex = 50;
    this.tablet.visible = this.stick.visible = false;
    this.container.addChild(this.tablet, this.stick);
  }

  /** Loads the figure a level's boss wears; once for each kind met. */
  async load(kind: Boss["kind"]): Promise<void> {
    if (this.kind === kind) return;
    this.figure?.destroy();
    const who = WHO[kind];
    this.kind = kind;
    this.figure = new Diner(this.container, this.registry, who.person, who.recolor, this.noart, who.size);
    for (const c of this.carriers) c.destroy();
    this.carriers = kind === "replacement" ? [0, 1].map(() => new Diner(this.container, this.registry, "resident", null, this.noart, 1)) : [];
    for (const c of this.carriers) c.container.visible = false;
    await Promise.all([this.figure.load(), ...this.carriers.map((c) => c.load())]);
  }

  get isPainted(): boolean {
    return !!this.figure?.isPainted;
  }

  get crown(): Point | null {
    return this.figure?.crown ?? null;
  }

  /** Drawn where the boss stands, or hidden when the level has none. */
  sync(b: Boss | null, time: number): void {
    this.container.visible = !!b && !!this.figure && this.kind === b.kind && !((b.kind === "titanium" || b.kind === "conductor") && b.state === "down");
    this.container.alpha = b ? fadeOfBoss(b) : 1;
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
    this.stick.visible = this.tablet.visible = false;
    for (const c of this.carriers) c.container.visible = false;
    if (b.kind === "replacement") {
      const down = b.state === "down";
      // Down, he is carried out: his two residents walk in, lift him and walk him off to the left.
      const carry = down ? carryAt(b.x, -b.timer) : null;
      if (carry)
        this.carriers.forEach((c, k) => {
          const at = carry.carriers[k];
          c.container.visible = true;
          c.pose(castPose({ role: "student", act: at.walking ? "walk" : "windup", t: time % 1, speed: at.walking ? 300 : 0, onGround: true, sit: false, spin: 0, hits: 0 }), at.facing, { x: at.x, y: 0 }, false, time, "planted");
        });
      const act = down
        ? "down"
        : b.state === "jab"
          ? "windup"
          : b.state === "swing"
            ? "attack"
            : b.state === "hurt" || b.state === "out"
              ? "bumped"
              : b.state === "frozen"
                ? "frozen"
                : b.state === "hop"
                  ? "hop"
                  : b.state === "hide"
                    ? "duck"
                    : b.vx !== 0
                      ? "walk"
                      : "idle";
      // Behind the lectern he holds the duck at its deepest.
      const pose = castPose({ role: "office", act, t: b.state === "hide" ? 0.25 : time % 1, speed: Math.abs(b.vx), onGround: b.state !== "hop", sit: false, spin: 0, hits: 0, flat: down });
      this.figure.pose(pose, b.facing, carry ? carry.kid : { x: b.x, y: b.y }, b.hurtT > 0, time, down ? "body" : "planted");
      if (down || b.state === "hide") return;
      const near = this.figure.handOffset(pose, b.facing, "handNear");
      const far = this.figure.handOffset(pose, b.facing, "handFar");
      const reach = b.state === "swing" ? STICK.out : b.state === "jab" ? STICK.out * 0.5 : STICK.folded;
      this.stick.clear();
      this.stick.moveTo(0, 0).lineTo(b.facing * reach, -reach * 0.35).stroke({ width: 6, color: "#2b2b2e" });
      this.stick.roundRect(b.facing * reach - 12, -reach * 0.35 - 20, 24, 40, 4).fill("#141414").stroke({ width: 3, color: "#0c0c0e" });
      this.stick.position.set(b.x + near.x - this.container.x, b.y + near.y - this.container.y);
      this.tablet.position.set(b.x + far.x - this.container.x, b.y + far.y - this.container.y);
      this.stick.visible = this.tablet.visible = true;
      return;
    }
    if (b.kind === "purser") {
      const pose = castPose({ role: "office", act: b.state === "push" ? "attack" : b.flinch > 0 ? "bumped" : "idle", t: time % 1, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 });
      // Down, she has pulled the curtain back and stands to the far side of it.
      this.figure.pose(pose, -1, { x: b.state === "down" ? b.x + 120 : b.x, y: b.y }, b.flinch > 0, time, "planted");
      return;
    }
    if (b.kind === "major") {
      const act = b.state === "windup" || b.state === "whistle" ? "windup" : b.state === "throw" || b.state === "catch" ? "attack" : b.state === "hurt" ? "bumped" : "idle";
      this.figure.pose(castPose({ role: "office", act, t: time % 1, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 }), b.facing, { x: b.x, y: b.y }, b.hurtT > 0, time, "planted");
      return;
    }
    if (b.kind === "conductor") {
      const act = b.state === "windup" ? "windup" : b.state === "punch" ? "attack" : b.state === "stagger" || b.state === "hurt" ? "bumped" : b.state === "retreat" ? "walk" : "idle";
      this.figure.pose(castPose({ role: "office", act, t: time % 1, speed: b.state === "retreat" ? 400 : 0, onGround: true, sit: false, spin: 0, hits: 0 }), b.facing, { x: b.x, y: b.y }, b.flinch > 0, time, "planted");
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
    for (const c of this.carriers) c.destroy();
    this.figure?.destroy();
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
