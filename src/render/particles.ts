import { Container, Graphics } from "pixi.js";
import type { Rect } from "../sim/types";

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
  // Up and back, for a man facing right: away from his face.
  sweat: {
    speed: [160, 320],
    angle: [200, 250],
    gravity: 1400,
    drag: 0.4,
    life: [0.4, 0.7],
    size: [5, 3],
    colors: ["#bfe6ff", "#5aa6e8"],
    additive: false,
  },
  impact: { speed: [260, 620], angle: [0, 360], gravity: 900, drag: 2, life: [0.25, 0.45], size: [9, 3], colors: ["#fff4c8", "#e9a23b"], additive: true },
  debris: { speed: [300, 760], angle: [200, 340], gravity: 2200, drag: 0.6, life: [0.5, 0.9], size: [8, 5], colors: ["#d4783c", "#e7d2b4"], additive: false },
  snot: { speed: [20, 90], angle: [0, 360], gravity: 300, drag: 3, life: [0.2, 0.35], size: [7, 2], colors: ["#c8dc8c", "#8fae4f"], additive: false },
  // Snot landing: thick gobs flung up and out (owner, 2026-10-18: it has to look gross).
  splat: { speed: [160, 460], angle: [190, 350], gravity: 1700, drag: 0.8, life: [0.35, 0.6], size: [12, 6], colors: ["#d4ea7a", "#6f9a22"], additive: false },
  // A drip off a glob of snot stuck to someone, falling straight down; the pepper's is mustard-green.
  drip: { speed: [0, 40], angle: [80, 100], gravity: 1500, drag: 0.2, life: [0.45, 0.7], size: [6, 5], colors: ["#bcd95a", "#7da32a"], additive: false },
  dripHot: { speed: [0, 40], angle: [80, 100], gravity: 1500, drag: 0.2, life: [0.45, 0.7], size: [7, 5], colors: ["#e4e070", "#8a8414"], additive: false },
  spray: { speed: [420, 900], angle: [150, 250], gravity: 1600, drag: 0.5, life: [0.35, 0.6], size: [5, 3], colors: ["#d8f0ff", "#6db4f0"], additive: false },
  steam: { speed: [40, 110], angle: [250, 290], gravity: -220, drag: 1.4, life: [0.6, 1.1], size: [10, 24], colors: ["#f2f2f2", "#9aa3ad"], additive: false },
  glint: { speed: [0, 30], angle: [0, 360], gravity: 0, drag: 2, life: [0.25, 0.4], size: [14, 2], colors: ["#ffffff", "#fff2a8"], additive: true },
  ring: { speed: [700, 900], angle: [180, 360], gravity: 0, drag: 2.4, life: [0.35, 0.45], size: [12, 26], colors: ["#fff3d0", "#e9b866"], additive: true },
  // Pickups taken, in their own colours: the can's red and silver, the nuts' crumbs, Buc-ee's gold.
  fizz: { speed: [180, 420], angle: [200, 340], gravity: 900, drag: 1.6, life: [0.3, 0.5], size: [8, 3], colors: ["#ff5a4f", "#c9ccd1"], additive: false },
  // The Coke Zero's cool-down: an icy fizz bursting up and out.
  frost: { speed: [160, 420], angle: [200, 340], gravity: 300, drag: 1.8, life: [0.35, 0.6], size: [9, 3], colors: ["#f2fbff", "#7cc8f0"], additive: true },
  // His breath when he is tired: small puffs pushed out in front of his mouth.
  pant: { speed: [40, 90], angle: [-25, 15], gravity: -50, drag: 2.2, life: [0.35, 0.6], size: [5, 12], colors: ["#ffffff", "#c9ced6"], additive: false },
  // Hot snot sheds embers as it flies.
  ember: { speed: [20, 90], angle: [180, 360], gravity: -160, drag: 2, life: [0.2, 0.4], size: [6, 2], colors: ["#ffd36a", "#ff5a1f"], additive: true },
  crumbs: { speed: [140, 360], angle: [200, 340], gravity: 1500, drag: 1, life: [0.3, 0.55], size: [6, 3], colors: ["#d9a86a", "#8a5a2c"], additive: false },
  // Out of the shuttle door with a full smash: nuts spilling from his pockets, tumbling out and down (R5 §8).
  nuts: { speed: [60, 200], angle: [30, 150], gravity: 1800, drag: 0.6, life: [0.25, 0.38], size: [10, 8], colors: ["#d0a066", "#7a4f24"], additive: false },
  gold: { speed: [200, 480], angle: [0, 360], gravity: 300, drag: 2, life: [0.35, 0.6], size: [9, 3], colors: ["#fff1a0", "#f2c230"], additive: true },
  // The pepper crate's steam, a slow wisp rising off its top.
  steamPuff: { speed: [20, 60], angle: [250, 290], gravity: -120, drag: 1.2, life: [0.8, 1.3], size: [8, 20], colors: ["#ffffff", "#c9c2b8"], additive: false },
  splinters: { speed: [260, 640], angle: [190, 350], gravity: 2000, drag: 0.6, life: [0.45, 0.8], size: [8, 4], colors: ["#b9c0c5", "#5d4630"], additive: false },
  // The cast's leftovers: a shattered glass, its ice, coffee, the tray's water and a swatted plane's confetti.
  glass: { speed: [200, 600], angle: [200, 340], gravity: 2200, drag: 0.5, life: [0.4, 0.7], size: [6, 3], colors: ["#ffffff", "#9fd6ff"], additive: false },
  ice: { speed: [100, 400], angle: [160, 380], gravity: 1600, drag: 1.2, life: [0.5, 0.9], size: [6, 4], colors: ["#e8f8ff", "#bfe6ff"], additive: false },
  coffee: { speed: [160, 520], angle: [190, 350], gravity: 1900, drag: 0.8, life: [0.3, 0.55], size: [8, 3], colors: ["#7a4a24", "#3d2412"], additive: false },
  water: { speed: [200, 520], angle: [200, 340], gravity: 1600, drag: 0.8, life: [0.3, 0.5], size: [7, 3], colors: ["#dff3ff", "#7cc8f0"], additive: false },
  paper: { speed: [80, 320], angle: [0, 360], gravity: 260, drag: 2.4, life: [0.7, 1.2], size: [9, 6], colors: ["#fbf7ee", "#d9d2c4"], additive: false },
  // The pig's white fluff out of a seam (spec §5.6).
  stuffing: { speed: [160, 420], angle: [200, 340], gravity: 1100, drag: 1.4, life: [0.5, 0.9], size: [12, 6], colors: ["#fff7f2", "#f7d4de"], additive: false },
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

const radius = (p: Particle) => p.recipe.size[0] + (p.recipe.size[1] - p.recipe.size[0]) * (p.age / p.life);
const touches = (x: number, y: number, r: number, b: Rect) =>
  x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h;
const hex = (c: string) => parseInt(c.slice(1), 16);
const mix = (a: number, b: number, t: number) => {
  const ch = (s: number) => ((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t;
  return (Math.round(ch(16)) << 16) | (Math.round(ch(8)) << 8) | Math.round(ch(0));
};

/** A particle's launch: speed and direction drawn from the recipe; `mirror` throws it the other way. */
export function launch(recipe: Recipe, a: number, b: number, mirror: boolean): { vx: number; vy: number } {
  const speed = recipe.speed[0] + (recipe.speed[1] - recipe.speed[0]) * a;
  const deg = recipe.angle[0] + (recipe.angle[1] - recipe.angle[0]) * b;
  const r = ((mirror ? 180 - deg : deg) * Math.PI) / 180;
  return { vx: Math.cos(r) * speed, vy: Math.sin(r) * speed };
}

/** One step of a particle's flight: gravity, drag, motion. */
export function drift(p: { x: number; y: number; vx: number; vy: number }, recipe: Recipe, dt: number): void {
  p.vy += recipe.gravity * dt;
  const k = Math.max(0, 1 - recipe.drag * dt);
  p.vx *= k;
  p.vy *= k;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

/**
 * A pooled system drawn as one Graphics per blend mode, rebuilt each frame.
 * Under reduced motion the glow recipes draw plain: no additive glow (spec §5.6).
 */
export class Particles {
  private readonly pool: Particle[] = [];
  private readonly plain = new Graphics();
  private readonly glow = new Graphics();
  private seed = 7;

  constructor(
    layer: Container,
    readonly cap = 600,
    readonly reduced = false,
  ) {
    this.glow.blendMode = "add";
    layer.addChild(this.plain, this.glow);
  }

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** `mirror` flips the recipe's spread left for right, for a burst thrown behind him when he faces left. */
  emit(name: RecipeName, x: number, y: number, n: number, mirror = false) {
    const recipe: Recipe = RECIPES[name];
    for (let i = 0; i < n; i++) {
      if (this.pool.length >= this.cap) this.pool.shift();
      const v = launch(recipe, this.rand(), this.rand(), mirror);
      this.pool.push({
        x,
        y,
        ...v,
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

  /** `keepOut` is his face: a particle that would touch it is gone, so nothing is ever drawn over it. */
  update(dt: number, keepOut?: Rect) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.pool.splice(i, 1);
        continue;
      }
      drift(p, p.recipe, dt);
      if (keepOut && touches(p.x, p.y, radius(p), keepOut)) this.pool.splice(i, 1);
    }
    this.plain.clear();
    this.glow.clear();
    for (const p of this.pool) {
      const t = p.age / p.life;
      const color = mix(hex(p.recipe.colors[0]), hex(p.recipe.colors[1]), t);
      const g = p.recipe.additive && !this.reduced ? this.glow : this.plain;
      g.circle(p.x, p.y, radius(p)).fill({ color, alpha: 0.85 * (1 - t * t) });
    }
  }
}
