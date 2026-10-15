import { TABLE } from "./table";

/** The shipped banquet's dishes (expansion spec Appendix B) and its specials. */
export type FoodKind =
  | "shrimp" | "bread" | "eggs" | "kolache" | "nuggets"
  | "ribeye" | "chicken" | "brisket" | "grits" | "club"
  | "pie" | "cheesecake" | "pudding"
  | "coke" | "nuts" | "bucees" | "hotsauce" | "togo" | "check";
export type Course = "appetizer" | "entree" | "dessert" | "special";
/** What a dish is called and worth, its plate's radius on the cloth, its cell on the owner's food sheet, and its drawn plate's tag and color. */
export type FoodSpec = { name: string; value: number; r: number; course: Course; sheet: number | null; tag: string; color: number };

export const FOODS: Record<FoodKind, FoodSpec> = {
  shrimp: { name: "Shrimp cocktail", value: 80, r: 27, course: "appetizer", sheet: 0, tag: "SHR", color: 0xf08a6c },
  bread: { name: "Bread basket", value: 50, r: 28, course: "appetizer", sheet: 1, tag: "BRD", color: 0xd9a35a },
  eggs: { name: "Deviled eggs", value: 60, r: 27, course: "appetizer", sheet: 2, tag: "EGG", color: 0xf2d65c },
  kolache: { name: "Kolache", value: 70, r: 26, course: "appetizer", sheet: 3, tag: "KOL", color: 0xe8b46a },
  nuggets: { name: "Beaver Nuggets", value: 90, r: 27, course: "appetizer", sheet: 4, tag: "BVR", color: 0xc98a3c },
  ribeye: { name: "Ribeye", value: 300, r: 34, course: "entree", sheet: 5, tag: "RIB", color: 0x8a3b2a },
  chicken: { name: "Chicken fried steak", value: 220, r: 33, course: "entree", sheet: 6, tag: "CFS", color: 0xc7924e },
  brisket: { name: "Brisket plate", value: 260, r: 34, course: "entree", sheet: 7, tag: "BSK", color: 0x6b3a26 },
  grits: { name: "Shrimp and grits", value: 200, r: 32, course: "entree", sheet: 8, tag: "GRT", color: 0xefd9a0 },
  club: { name: "Club sandwich", value: 150, r: 32, course: "entree", sheet: 9, tag: "CLB", color: 0xe3c27a },
  pie: { name: "Pie slice", value: 180, r: 29, course: "dessert", sheet: 10, tag: "PIE", color: 0xc2643c },
  cheesecake: { name: "Cheesecake", value: 200, r: 29, course: "dessert", sheet: 11, tag: "CHZ", color: 0xf5ecd2 },
  pudding: { name: "Banana pudding", value: 160, r: 28, course: "dessert", sheet: 12, tag: "PUD", color: 0xf3e08a },
  coke: { name: "Coke Zero", value: 100, r: 26, course: "special", sheet: null, tag: "ZRO", color: 0x1b1b1b },
  nuts: { name: "Mixed nuts", value: 100, r: 27, course: "special", sheet: null, tag: "NUT", color: 0xa8742f },
  bucees: { name: "Buc-ee's", value: 300, r: 28, course: "special", sheet: null, tag: "BUC", color: 0xf5c518 },
  hotsauce: { name: "Hot sauce", value: 150, r: 26, course: "special", sheet: 13, tag: "HOT", color: 0xc8281e },
  togo: { name: "To-go box", value: 0, r: 30, course: "special", sheet: 14, tag: "TOGO", color: 0xf4f1ea },
  check: { name: "The check", value: -400, r: 28, course: "special", sheet: 15, tag: "BILL", color: 0x2a1d14 },
};

const kinds = Object.keys(FOODS) as FoodKind[];
export const COURSES: Record<Exclude<Course, "special">, FoodKind[]> = {
  appetizer: kinds.filter((k) => FOODS[k].course === "appetizer"),
  entree: kinds.filter((k) => FOODS[k].course === "entree"),
  dessert: kinds.filter((k) => FOODS[k].course === "dessert"),
};
export const SPECIALS: FoodKind[] = kinds.filter((k) => FOODS[k].course === "special");

/** A dish on the table top: its middle, its velocity, its plate's radius; `fall` the seconds it is still dropping from the chute. */
export type Dish = { id: number; kind: FoodKind; x: number; y: number; vx: number; vy: number; r: number; fall: number };
/** Something on the cloth food bounces off (the bellhop's suitcase), in table coordinates, from its corner at x, y. */
export type Box = { x: number; y: number; w: number; h: number };

/** R4 §5's disc physics. */
export const DISH = {
  /** Speed kept a second: e^(-2.4). */
  friction: 2.4,
  restitution: 0.6,
  rim: 0.7,
  /** Under this speed a dish has come to rest: the rivals and the server go for it. */
  rest: 40,
  /** Under this it stops dead. */
  stop: 5,
  /** Seconds a dish drops from the chute before it is on the cloth. */
  fall: 0.2,
} as const;

/** On the cloth and slow enough to be called resting. */
export const settled = (d: Dish) => d.fall <= 0 && Math.hypot(d.vx, d.vy) < DISH.rest;

/** One step of the table: dishes land, slide and slow, knock into each other, and bounce off the rim and any box. */
export function stepDishes(dishes: Dish[], dt: number, boxes: readonly Box[] = []): void {
  const damp = Math.exp(-DISH.friction * dt);
  for (const d of dishes) {
    if (d.fall > 0) {
      d.fall = Math.max(0, d.fall - dt);
      continue;
    }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= damp;
    d.vy *= damp;
    if (Math.hypot(d.vx, d.vy) < DISH.stop) d.vx = d.vy = 0;
  }
  // Two that overlap are pushed apart along the line between their middles; their closing speed bounces back at 0.6.
  for (let i = 0; i < dishes.length; i++) {
    const a = dishes[i];
    if (a.fall > 0) continue;
    for (let j = i + 1; j < dishes.length; j++) {
      const b = dishes[j];
      if (b.fall > 0) continue;
      let nx = b.x - a.x;
      let ny = b.y - a.y;
      const n = Math.hypot(nx, ny);
      const over = a.r + b.r - n;
      if (over <= 0) continue;
      // One dropped exactly on another goes off to the side: any direction is as good as another.
      if (n < 1e-9) {
        nx = 1;
        ny = 0;
      } else {
        nx /= n;
        ny /= n;
      }
      a.x -= (nx * over) / 2;
      a.y -= (ny * over) / 2;
      b.x += (nx * over) / 2;
      b.y += (ny * over) / 2;
      const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (closing >= 0) continue;
      const k = ((1 + DISH.restitution) * closing) / 2;
      a.vx += k * nx;
      a.vy += k * ny;
      b.vx -= k * nx;
      b.vy -= k * ny;
    }
  }
  for (const d of dishes) {
    if (d.fall > 0) continue;
    const n = Math.hypot(d.x, d.y);
    const max = TABLE.r - d.r;
    if (n > max) {
      const ux = d.x / n;
      const uy = d.y / n;
      d.x = ux * max;
      d.y = uy * max;
      const out = d.vx * ux + d.vy * uy;
      if (out > 0) {
        d.vx -= (1 + DISH.rim) * out * ux;
        d.vy -= (1 + DISH.rim) * out * uy;
      }
    }
    for (const b of boxes) bounceOff(d, b);
  }
}

/** Out of a box the way it came in, the speed into the box turned back at the rim's 0.7. */
function bounceOff(d: Dish, b: Box) {
  const cx = Math.min(b.x + b.w, Math.max(b.x, d.x));
  const cy = Math.min(b.y + b.h, Math.max(b.y, d.y));
  let nx = d.x - cx;
  let ny = d.y - cy;
  const n = Math.hypot(nx, ny);
  if (n >= d.r) return;
  if (n < 1e-9) {
    // The middle inside the box: out through the nearest side.
    const sides = [d.x - b.x, b.x + b.w - d.x, d.y - b.y, b.y + b.h - d.y];
    const i = sides.indexOf(Math.min(...sides));
    [nx, ny] = [[-1, 0], [1, 0], [0, -1], [0, 1]][i];
    d.x = i === 0 ? b.x - d.r : i === 1 ? b.x + b.w + d.r : d.x;
    d.y = i === 2 ? b.y - d.r : i === 3 ? b.y + b.h + d.r : d.y;
  } else {
    nx /= n;
    ny /= n;
    d.x = cx + nx * d.r;
    d.y = cy + ny * d.r;
  }
  const into = d.vx * nx + d.vy * ny;
  if (into < 0) {
    d.vx -= (1 + DISH.rim) * into * nx;
    d.vy -= (1 + DISH.rim) * into * ny;
  }
}
