import { Container, Graphics } from "pixi.js";

export type Recipe = {
  speed: [number, number];
  /** Screen degrees, 0 right, 90 down. */
  angle: [number, number];
  gravity: number;
  drag: number;
  life: [number, number];
  /** Radius at birth and at death. */
  size: [number, number];
  colors: [string, string];
  additive: boolean;
};

export const RECIPES = {
  dust: {
    speed: [40, 140],
    angle: [200, 340],
    gravity: -60,
    drag: 2.5,
    life: [0.35, 0.7],
    size: [7, 16],
    colors: ["#cdbfa7", "#8f8370"],
    additive: false,
  },
  sweat: {
    speed: [160, 320],
    angle: [220, 320],
    gravity: 1400,
    drag: 0.4,
    life: [0.4, 0.7],
    size: [5, 3],
    colors: ["#bfe6ff", "#5aa6e8"],
    additive: false,
  },
} satisfies Record<string, Recipe>;
export type RecipeName = keyof typeof RECIPES;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  recipe: Recipe;
  seed: number;
};

const hex = (c: string) => parseInt(c.slice(1), 16);
const mix = (a: number, b: number, t: number) => {
  const ch = (s: number) => ((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t;
  return (Math.round(ch(16)) << 16) | (Math.round(ch(8)) << 8) | Math.round(ch(0));
};

/** A pooled system drawn as one Graphics per blend mode, rebuilt each frame. */
export class Particles {
  private readonly pool: Particle[] = [];
  private readonly plain = new Graphics();
  private readonly glow = new Graphics();
  private seed = 7;

  constructor(
    layer: Container,
    readonly cap = 600,
  ) {
    this.glow.blendMode = "add";
    layer.addChild(this.plain, this.glow);
  }

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  emit(name: RecipeName, x: number, y: number, n: number) {
    const recipe: Recipe = RECIPES[name];
    for (let i = 0; i < n; i++) {
      if (this.pool.length >= this.cap) this.pool.shift();
      const speed = recipe.speed[0] + (recipe.speed[1] - recipe.speed[0]) * this.rand();
      const a = ((recipe.angle[0] + (recipe.angle[1] - recipe.angle[0]) * this.rand()) * Math.PI) / 180;
      this.pool.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        age: 0,
        life: recipe.life[0] + (recipe.life[1] - recipe.life[0]) * this.rand(),
        recipe,
        seed: this.rand(),
      });
    }
  }

  get alive() {
    return this.pool.length;
  }

  update(dt: number) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.pool.splice(i, 1);
        continue;
      }
      p.vy += p.recipe.gravity * dt;
      const k = Math.max(0, 1 - p.recipe.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.plain.clear();
    this.glow.clear();
    for (const p of this.pool) {
      const t = p.age / p.life;
      const r = p.recipe.size[0] + (p.recipe.size[1] - p.recipe.size[0]) * t;
      const color = mix(hex(p.recipe.colors[0]), hex(p.recipe.colors[1]), t);
      const g = p.recipe.additive ? this.glow : this.plain;
      g.circle(p.x, p.y, r).fill({ color, alpha: 0.85 * (1 - t * t) });
    }
  }
}
