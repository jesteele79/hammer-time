import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import type { CastJob } from "../sim/cast";
import { GRAVITY_DOWN } from "../sim/constants";
import { PALETTE } from "./palette";
import type { Particles } from "./particles";

type Flyer = { g: Container; x: number; y: number; vx: number; vy: number; spin: number; rot: number; life: number; landed: boolean; onLand: (f: Flyer) => void };
const INK = PALETTE.outline;

/** Props that fly off the cast when they are hit: the pillbox hat, the tray's glasses, the coffee cup. */
export class Flyers {
  private readonly root = new Container({ label: "flyers" });
  private readonly live: Flyer[] = [];

  constructor(
    layer: Container,
    private readonly particles: Particles,
    ambient = 0xffffff,
  ) {
    // Lit like the cast they fly off, so a hat does not brighten the moment it leaves a head.
    this.root.tint = ambient;
    layer.addChild(this.root);
  }

  /** Sorted by the look each frame, just behind Hammer. */
  get container(): Container {
    return this.root;
  }

  private add(g: Container, x: number, y: number, vx: number, vy: number, spin: number, life: number, onLand: (f: Flyer) => void) {
    g.position.set(x, y);
    this.root.addChild(g);
    this.live.push({ g, x, y, vx, vy, spin, rot: 0, life, landed: false, onLand });
  }

  /**
   * The bellhop's hat, knocked off: it tumbles, lands and lies there a while. `painted` is the owner's hat, strap and
   * all, at the size it sat on his head; without it the code-drawn stand-in's hat flies.
   */
  hat(x: number, y: number, dir: 1 | -1, painted: { texture: Texture; pivot: { x: number; y: number }; scale: number } | null = null, job: CastJob = "bellhop"): void {
    let view: Container;
    if (painted) {
      const s = new Sprite(painted.texture);
      s.anchor.set(painted.pivot.x / painted.texture.width, painted.pivot.y / painted.texture.height);
      // The painting's front is to the left; flying right it leads with its front too.
      s.scale.set(-dir * painted.scale, painted.scale);
      view = s;
    } else if (job === "cook") view = Flyers.toque();
    else
      view = new Graphics()
        .roundRect(-28, -14, 56, 28, 4)
        .fill("#b8282e")
        .stroke({ width: 3, color: INK })
        .rect(-28, 8, 56, 6)
        .fill(PALETTE.brass);
    this.add(
      view,
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

  /** The cook's toque, code-drawn: what flies when his painted one is missing. */
  private static toque(): Graphics {
    return new Graphics()
      .roundRect(-22, -60, 44, 60, 10)
      .fill("#f4f3ee")
      .stroke({ width: 3, color: INK })
      .ellipse(0, -62, 30, 18)
      .fill("#ffffff")
      .stroke({ width: 3, color: INK });
  }

  /** Something knocked loose that lands and lies there a while: a pan, a towel, a book. */
  private lie(view: Container, x: number, y: number, dir: 1 | -1, up: number, spin: number): void {
    this.add(view, x, y, dir * 260, -up, dir * spin, 3, (f) => {
      f.vx = 0;
      f.spin = 0;
    });
  }

  /** The lunch tray's food: the potatoes, the peas and the jello, each splatting where it lands. */
  food(x: number, y: number, dir: 1 | -1): void {
    const bits: [Graphics, number][] = [
      [new Graphics().ellipse(0, 0, 16, 12).fill("#f1e3b5").stroke({ width: 2, color: INK }), -700],
      [new Graphics().circle(-6, 0, 5).circle(6, 0, 5).circle(0, -7, 5).fill("#7fb24a").stroke({ width: 1.5, color: INK }), -820],
      [new Graphics().roundRect(-9, -9, 18, 18, 3).fill({ color: "#c8443a", alpha: 0.9 }).stroke({ width: 2, color: INK }), -560],
    ];
    bits.forEach(([g, up], i) =>
      this.add(g, x + i * 12, y, dir * (120 + i * 90) + (i - 1) * 60, up, (i - 1) * 7, 3, (f) => {
        f.life = 0;
        this.particles.emit("coffee", f.x, f.y, 6);
      }),
    );
  }

  pan(x: number, y: number, dir: 1 | -1): void {
    const g = new Graphics().roundRect(-80, -6, 70, 12, 4).fill("#3a2a1c").stroke({ width: 2, color: INK }).ellipse(20, -8, 46, 12).fill("#2b2b2e").stroke({ width: 3, color: INK });
    this.lie(g, x, y, dir, 600, 9);
  }

  towel(x: number, y: number, dir: 1 | -1): void {
    this.lie(new Graphics().roundRect(-26, -16, 52, 32, 6).fill("#f4f3ee").stroke({ width: 3, color: INK }), x, y, dir, 520, 6);
  }

  book(x: number, y: number, dir: 1 | -1): void {
    this.lie(new Graphics().roundRect(-24, -16, 48, 32, 3).fill("#6b3a1e").stroke({ width: 3, color: INK }).rect(-20, -12, 40, 24).fill("#f4efe2"), x, y, dir, 560, 8);
  }

  /** The professor's papers: four sheets fluttering down, and a flurry. */
  papers(x: number, y: number, dir: 1 | -1): void {
    for (let i = 0; i < 4; i++)
      this.add(new Graphics().rect(-14, -18, 28, 36).fill("#ffffff").stroke({ width: 2, color: INK }), x, y, dir * (60 + 70 * i), -400 - 90 * i, (i - 1.5) * 3, 2, (f) => {
        f.vx = 0;
        f.spin = 0;
      });
    this.particles.emit("paper", x, y, 10);
  }

  /** The tray's glasses: three arcs, each shattering where it lands. */
  glasses(x: number, y: number, dir: 1 | -1): void {
    [-700, -820, -560].forEach((up, i) =>
      this.add(
        new Graphics()
          .roundRect(-7, -14, 14, 28, 3)
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
      new Graphics()
        .roundRect(-11, -30, 22, 28, 4)
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

  /** Lets everything in the air or on the floor go: nothing follows him into the next venue. */
  clear(): void {
    for (const f of this.live) f.g.destroy();
    this.live.length = 0;
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
