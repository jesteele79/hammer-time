import { TABLE } from "./table";

/** The shipped banquet's dishes (expansion spec Appendix B) and its specials. */
export type FoodKind =
  | "shrimp" | "bread" | "eggs" | "kolache" | "nuggets"
  | "ribeye" | "chicken" | "brisket" | "grits" | "club"
  | "pie" | "cheesecake" | "pudding"
  | "coke" | "nuts" | "bucees" | "hotsauce" | "togo" | "check"
  // The M CLUB's evening spread (story spec §8.1).
  | "cheese" | "crudites" | "meatballs" | "sliders" | "hotdish" | "hummus" | "crackers" | "cookies" | "brownies" | "fruitcup" | "parfait" | "nycheesecake" | "pretzels" | "water" | "wine"
  // The French table (story spec §9.2).
  | "baguette" | "escargots" | "steakfrites" | "moules" | "croque" | "camembert" | "comte" | "roquefort" | "cremebrulee" | "macarons" | "tartetatin" | "carafe" | "tinycoke" | "breadbasket" | "cheesecart" | "bill";
export type Course = "appetizer" | "entree" | "dessert" | "special";
/** Which table serves a dish: the banquet's, the lounge's, the French table's; a dish of several says so (the products and the to-go box). */
export type Menu = "banquet" | "lounge" | "french";
/** The banquet's and the lounge's own products. */
const BOTH: Menu[] = ["banquet", "lounge"];
/** What a dish is called and worth, its plate's radius on the cloth, its cell on the owner's food sheet, and its drawn plate's tag and color. */
export type FoodSpec = { name: string; value: number; r: number; course: Course; sheet: number | null; tag: string; color: number; menu: Menu | Menu[] };

export const FOODS: Record<FoodKind, FoodSpec> = {
  shrimp: { name: "Shrimp cocktail", value: 80, r: 27, course: "appetizer", sheet: 0, tag: "SHR", color: 0xf08a6c, menu: "banquet" },
  bread: { name: "Bread basket", value: 50, r: 28, course: "appetizer", sheet: 1, tag: "BRD", color: 0xd9a35a, menu: "banquet" },
  eggs: { name: "Deviled eggs", value: 60, r: 27, course: "appetizer", sheet: 2, tag: "EGG", color: 0xf2d65c, menu: "banquet" },
  kolache: { name: "Kolache", value: 70, r: 26, course: "appetizer", sheet: 3, tag: "KOL", color: 0xe8b46a, menu: "banquet" },
  nuggets: { name: "Beaver Nuggets", value: 90, r: 27, course: "appetizer", sheet: 4, tag: "BVR", color: 0xc98a3c, menu: "banquet" },
  ribeye: { name: "Ribeye", value: 300, r: 34, course: "entree", sheet: 5, tag: "RIB", color: 0x8a3b2a, menu: "banquet" },
  chicken: { name: "Chicken fried steak", value: 220, r: 33, course: "entree", sheet: 6, tag: "CFS", color: 0xc7924e, menu: "banquet" },
  brisket: { name: "Brisket plate", value: 260, r: 34, course: "entree", sheet: 7, tag: "BSK", color: 0x6b3a26, menu: "banquet" },
  grits: { name: "Shrimp and grits", value: 200, r: 32, course: "entree", sheet: 8, tag: "GRT", color: 0xefd9a0, menu: "banquet" },
  club: { name: "Club sandwich", value: 150, r: 32, course: "entree", sheet: 9, tag: "CLB", color: 0xe3c27a, menu: "banquet" },
  pie: { name: "Pie slice", value: 180, r: 29, course: "dessert", sheet: 10, tag: "PIE", color: 0xc2643c, menu: "banquet" },
  cheesecake: { name: "Cheesecake", value: 200, r: 29, course: "dessert", sheet: 11, tag: "CHZ", color: 0xf5ecd2, menu: "banquet" },
  pudding: { name: "Banana pudding", value: 160, r: 28, course: "dessert", sheet: 12, tag: "PUD", color: 0xf3e08a, menu: "banquet" },
  coke: { name: "Coke Zero", value: 100, r: 26, course: "special", sheet: null, tag: "ZRO", color: 0x1b1b1b, menu: BOTH },
  nuts: { name: "Mixed nuts", value: 100, r: 27, course: "special", sheet: null, tag: "NUT", color: 0xa8742f, menu: BOTH },
  bucees: { name: "Buc-ee's", value: 300, r: 28, course: "special", sheet: null, tag: "BUC", color: 0xf5c518, menu: BOTH },
  hotsauce: { name: "Hot sauce", value: 150, r: 26, course: "special", sheet: 13, tag: "HOT", color: 0xc8281e, menu: "banquet" },
  togo: { name: "To-go box", value: 0, r: 30, course: "special", sheet: 14, tag: "TOGO", color: 0xf4f1ea, menu: BOTH },
  check: { name: "The check", value: -400, r: 28, course: "special", sheet: 15, tag: "BILL", color: 0x2a1d14, menu: "banquet" },
  // The lounge's, their cells on its own sheet (the to-go box is cell 14 on both).
  cheese: { name: "Cheese cubes", value: 100, r: 27, course: "appetizer", sheet: 0, tag: "CHS", color: 0xf2d65c, menu: "lounge" },
  crudites: { name: "Crudités", value: 50, r: 27, course: "appetizer", sheet: 1, tag: "CRU", color: 0x7fb24a, menu: "lounge" },
  meatballs: { name: "Meatballs", value: 200, r: 31, course: "entree", sheet: 2, tag: "MTB", color: 0x8a4b2a, menu: "lounge" },
  sliders: { name: "Sliders", value: 300, r: 32, course: "entree", sheet: 3, tag: "SLD", color: 0xc7924e, menu: "lounge" },
  hotdish: { name: "The hot dish", value: 250, r: 32, course: "entree", sheet: 4, tag: "HOT", color: 0xd98a3a, menu: "lounge" },
  hummus: { name: "Hummus", value: 100, r: 27, course: "appetizer", sheet: 5, tag: "HUM", color: 0xe3c27a, menu: "lounge" },
  crackers: { name: "Crackers", value: 50, r: 27, course: "appetizer", sheet: 6, tag: "CRK", color: 0xe8b46a, menu: "lounge" },
  cookies: { name: "Cookies", value: 150, r: 27, course: "dessert", sheet: 7, tag: "COK", color: 0xc98a3c, menu: "lounge" },
  brownies: { name: "Brownies", value: 200, r: 28, course: "dessert", sheet: 8, tag: "BRN", color: 0x4a2a1a, menu: "lounge" },
  fruitcup: { name: "Fruit cup", value: 100, r: 27, course: "dessert", sheet: 9, tag: "FRT", color: 0xd8443c, menu: "lounge" },
  parfait: { name: "Yogurt parfait", value: 150, r: 27, course: "dessert", sheet: 10, tag: "PRF", color: 0xf3e08a, menu: "lounge" },
  nycheesecake: { name: "Cheesecake", value: 300, r: 29, course: "dessert", sheet: 11, tag: "CHZ", color: 0xf5ecd2, menu: "lounge" },
  pretzels: { name: "Pretzels", value: 100, r: 27, course: "appetizer", sheet: 12, tag: "PRZ", color: 0xb07a3c, menu: "lounge" },
  water: { name: "Tiny water", value: 0, r: 26, course: "appetizer", sheet: 13, tag: "H2O", color: 0x9fd6ff, menu: "lounge" },
  wine: { name: "Wine", value: -100, r: 26, course: "special", sheet: 15, tag: "WIN", color: 0x7a1f2b, menu: "lounge" },
  // The French table's, their cells on its own sheet; the tiny Coke Zero is the can's picture at 0.7, its cell 12 painted and unused.
  baguette: { name: "Baguette", value: 50, r: 27, course: "appetizer", sheet: 0, tag: "BGT", color: 0xc88a3e, menu: "french" },
  escargots: { name: "Escargots", value: 200, r: 27, course: "appetizer", sheet: 1, tag: "ESC", color: 0x6b7a3a, menu: "french" },
  steakfrites: { name: "Steak frites", value: 300, r: 34, course: "entree", sheet: 2, tag: "STK", color: 0x8a3b2a, menu: "french" },
  moules: { name: "Moules", value: 250, r: 33, course: "entree", sheet: 3, tag: "MOU", color: 0x2f3a55, menu: "french" },
  croque: { name: "Croque monsieur", value: 200, r: 32, course: "entree", sheet: 4, tag: "CRQ", color: 0xe3c27a, menu: "french" },
  camembert: { name: "Camembert", value: 150, r: 27, course: "dessert", sheet: 5, tag: "CAM", color: 0xf5ecd2, menu: "french" },
  comte: { name: "Comté", value: 200, r: 27, course: "dessert", sheet: 6, tag: "CMT", color: 0xf2d65c, menu: "french" },
  roquefort: { name: "Roquefort", value: 250, r: 27, course: "dessert", sheet: 7, tag: "ROQ", color: 0xdfe6d8, menu: "french" },
  cremebrulee: { name: "Crème brûlée", value: 300, r: 29, course: "dessert", sheet: 8, tag: "CRB", color: 0xe8b46a, menu: "french" },
  macarons: { name: "Macarons", value: 150, r: 27, course: "dessert", sheet: 9, tag: "MAC", color: 0xe58fb0, menu: "french" },
  tartetatin: { name: "Tarte tatin", value: 250, r: 29, course: "dessert", sheet: 10, tag: "TAT", color: 0xc2643c, menu: "french" },
  carafe: { name: "A carafe of water", value: 0, r: 26, course: "special", sheet: 11, tag: "H2O", color: 0x9fd6ff, menu: "french" },
  tinycoke: { name: "Tiny Coke Zero", value: 0, r: 26, course: "special", sheet: null, tag: "ZRO", color: 0x1b1b1b, menu: "french" },
  breadbasket: { name: "Bread basket", value: 50, r: 28, course: "appetizer", sheet: 13, tag: "BRD", color: 0xd9a35a, menu: "french" },
  cheesecart: { name: "The cheese cart", value: 0, r: 30, course: "special", sheet: 14, tag: "CART", color: 0xf4f1ea, menu: "french" },
  bill: { name: "L'addition", value: -100, r: 28, course: "special", sheet: 15, tag: "BILL", color: 0x2a1d14, menu: "french" },
};
/** Whether a table serves a dish. */
export const onMenu = (f: Pick<FoodSpec, "menu">, menu: Menu): boolean => (Array.isArray(f.menu) ? f.menu.includes(menu) : f.menu === menu);

const kinds = Object.keys(FOODS) as FoodKind[];
/** A table's dishes by course. */
export const coursesOf = (menu: Menu): Record<Course, FoodKind[]> => {
  const of = (course: Course) => kinds.filter((k) => FOODS[k].course === course && onMenu(FOODS[k], menu));
  return { appetizer: of("appetizer"), entree: of("entree"), dessert: of("dessert"), special: of("special") };
};
export const COURSES: Record<Exclude<Course, "special">, FoodKind[]> = coursesOf("banquet");
export const SPECIALS: FoodKind[] = coursesOf("banquet").special;

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
