import { Container, Graphics } from "pixi.js";
import { GRAVITY_DOWN } from "../sim/constants";
import { PALETTE } from "./palette";
import type { Particles } from "./particles";

type Flyer = { g: Graphics; x: number; y: number; vx: number; vy: number; spin: number; rot: number; life: number; landed: boolean; onLand: (f: Flyer) => void };
const INK = PALETTE.outline;

/** Props that fly off the cast when they are hit: the pillbox hat, the tray's glasses, the coffee cup. */
export class Flyers {
  private readonly root = new Container({ label: "flyers" });
  private readonly live: Flyer[] = [];

  constructor(
    layer: Container,
    private readonly particles: Particles,
  ) {
    layer.addChild(this.root);
  }

  private add(draw: (g: Graphics) => void, x: number, y: number, vx: number, vy: number, spin: number, life: number, onLand: (f: Flyer) => void) {
    const g = new Graphics();
    draw(g);
    g.position.set(x, y);
    this.root.addChild(g);
    this.live.push({ g, x, y, vx, vy, spin, rot: 0, life, landed: false, onLand });
  }

  /** The bellhop's hat, knocked off: it tumbles, lands and lies there a while. */
  hat(x: number, y: number, dir: 1 | -1): void {
    this.add(
      (g) =>
        g.roundRect(-28, -14, 56, 28, 4)
          .fill("#b8282e")
          .stroke({ width: 3, color: INK })
          .rect(-28, 8, 56, 6)
          .fill(PALETTE.brass),
      x,
      y,
      dir * 320,
      -620,
      dir * 9,
      6,
      (f) => {
        f.vx = 0;
        f.spin = 0;
        f.rot = 0;
      },
    );
  }

  /** The tray's glasses: three arcs, each shattering where it lands. */
  glasses(x: number, y: number, dir: 1 | -1): void {
    [-700, -820, -560].forEach((up, i) =>
      this.add(
        (g) =>
          g.roundRect(-7, -14, 14, 28, 3)
            .fill({ color: "#dff3ff", alpha: 0.9 })
            .stroke({ width: 2, color: INK }),
        x + i * 12,
        y,
        dir * (120 + i * 90) + (i - 1) * 60,
        up,
        (i - 1) * 7,
        3,
        (f) => {
          f.life = 0;
          this.particles.emit("glass", f.x, f.y, 8);
          this.particles.emit("ice", f.x, f.y, 4);
        },
      ),
    );
  }

  /** The office worker's cup, flung off: coffee where it lands. */
  cup(x: number, y: number, dir: 1 | -1): void {
    this.add(
      (g) =>
        g.roundRect(-11, -30, 22, 28, 4)
          .fill("#f4f3ee")
          .stroke({ width: 3, color: INK })
          .rect(-11, -30, 22, 6)
          .fill("#6b3a1e"),
      x,
      y,
      dir * 260,
      -520,
      dir * 8,
      3,
      (f) => {
        f.life = 0;
        this.particles.emit("coffee", f.x, f.y, 10);
      },
    );
  }

  update(dt: number, floorUnder: (x: number, y: number) => number | null): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const f = this.live[i];
      if (!f.landed) {
        const y0 = f.y;
        f.vy += GRAVITY_DOWN * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.spin * dt;
        const floor = floorUnder(f.x, y0);
        if (floor !== null && f.y >= floor && f.vy > 0) {
          f.y = floor;
          f.landed = true;
          f.onLand(f);
        }
      } else f.life -= dt;
      if (f.life <= 0) {
        f.g.destroy();
        this.live.splice(i, 1);
        continue;
      }
      f.g.position.set(f.x, f.y);
      f.g.rotation = f.rot;
      f.g.alpha = f.landed ? Math.min(1, f.life) : 1;
    }
  }
}
