/** Banquet food: what it is, what it is worth, and how it slides along the tablecloth. */
export type FoodKind =
  | "shrimp"
  | "bread"
  | "eggs"
  | "kolache"
  | "nuggets"
  | "ribeye"
  | "chicken"
  | "brisket"
  | "grits"
  | "club"
  | "pie"
  | "cheesecake"
  | "pudding"
  | "coke"
  | "nuts"
  | "buccees"
  | "hotsauce"
  | "togo"
  | "check";

export type FoodSpec = {
  name: string;
  /** Three-letter tag drawn on the procedural plate. */
  label: string;
  value: number;
  color: string;
  /** Index in the requested food sheet (spec appendix B), when it exists. */
  sheet: number | null;
  special?: boolean;
};

export const FOODS: Record<FoodKind, FoodSpec> = {
  shrimp: { name: "Shrimp cocktail", label: "SHR", value: 80, color: "#f08a6c", sheet: 0 },
  bread: { name: "Bread basket", label: "BRD", value: 50, color: "#d9a35a", sheet: 1 },
  eggs: { name: "Deviled eggs", label: "EGG", value: 60, color: "#f2d65c", sheet: 2 },
  kolache: { name: "Kolache", label: "KOL", value: 70, color: "#e8b46a", sheet: 3 },
  nuggets: { name: "Beaver Nuggets", label: "BVR", value: 90, color: "#c98a3c", sheet: 4 },
  ribeye: { name: "Ribeye", label: "RIB", value: 300, color: "#8a3b2a", sheet: 5 },
  chicken: { name: "Chicken fried steak", label: "CFS", value: 220, color: "#c7924e", sheet: 6 },
  brisket: { name: "Brisket plate", label: "BSK", value: 260, color: "#6b3a26", sheet: 7 },
  grits: { name: "Shrimp and grits", label: "GRT", value: 200, color: "#efd9a0", sheet: 8 },
  club: { name: "Club sandwich", label: "CLB", value: 150, color: "#e3c27a", sheet: 9 },
  pie: { name: "Pie slice", label: "PIE", value: 180, color: "#c2643c", sheet: 10 },
  cheesecake: { name: "Cheesecake", label: "CHZ", value: 200, color: "#f5ecd2", sheet: 11 },
  pudding: { name: "Banana pudding", label: "PUD", value: 160, color: "#f3e08a", sheet: 12 },
  coke: {
    name: "Coke Zero",
    label: "ZRO",
    value: 100,
    color: "#1b1b1b",
    sheet: null,
    special: true,
  },
  nuts: {
    name: "Mixed nuts",
    label: "NUT",
    value: 100,
    color: "#a8742f",
    sheet: null,
    special: true,
  },
  buccees: {
    name: "Buc-ee's bag",
    label: "BUC",
    value: 300,
    color: "#f5c518",
    sheet: null,
    special: true,
  },
  hotsauce: {
    name: "Hot sauce",
    label: "HOT",
    value: 150,
    color: "#c8281e",
    sheet: 13,
    special: true,
  },
  togo: { name: "To-go box", label: "TOGO", value: 0, color: "#f4f1ea", sheet: 14, special: true },
  check: {
    name: "The check",
    label: "BILL",
    value: -400,
    color: "#2a1d14",
    sheet: 15,
    special: true,
  },
};

export const APPETIZERS: readonly FoodKind[] = ["shrimp", "bread", "eggs", "kolache", "nuggets"];
export const ENTREES: readonly FoodKind[] = ["ribeye", "chicken", "brisket", "grits", "club"];
export const DESSERTS: readonly FoodKind[] = ["pie", "cheesecake", "pudding"];
export const SPECIALS: readonly FoodKind[] = [
  "coke",
  "nuts",
  "buccees",
  "hotsauce",
  "togo",
  "check",
];

/** The banquet table in view space; its top sits at Hammer's waist. */
export const TABLE = { left: 40, right: 344, top: 170, thick: 14 };
export const CHUTE = { x: 192, y: 60 };
export const FOOD_SIZE = 12;
const GRAVITY = 520;
/** Velocity kept per second while sliding on the cloth. */
const FRICTION = 0.88;

export type Food = {
  id: number;
  kind: FoodKind;
  value: number;
  /** Centre x and bottom y, in view space. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  special: boolean;
  bounced: boolean;
};
export type Blocker = { x0: number; x1: number };

export function makeFood(
  id: number,
  kind: FoodKind,
  x: number,
  y: number,
  vx: number,
  vy: number,
): Food {
  const spec = FOODS[kind];
  return {
    id,
    kind,
    value: spec.value,
    x,
    y,
    vx,
    vy,
    size: FOOD_SIZE,
    special: !!spec.special,
    bounced: false,
  };
}

/** Settled on the tablecloth. */
export const onTable = (f: Food) => f.bounced && f.vy === 0 && f.y >= TABLE.top;
/** Low enough to grab: on the cloth or skipping just above it. */
export const nearTable = (f: Food) => f.y >= TABLE.top - 24;

/** Fall, bounce once on the cloth, then slide with friction off the ends and blockers. */
export function stepFood(f: Food, dt: number, blockers: readonly Blocker[]) {
  if (!onTable(f)) {
    f.vy += GRAVITY * dt;
    f.y += f.vy * dt;
    if (f.y >= TABLE.top) {
      f.y = TABLE.top;
      if (!f.bounced && f.vy > 60) f.vy = -f.vy * 0.4;
      else f.vy = 0;
      f.bounced = true;
    }
  }
  const half = f.size / 2,
    was = f.x;
  f.x += f.vx * dt;
  if (onTable(f)) {
    f.vx *= FRICTION ** dt;
    if (Math.abs(f.vx) < 2) f.vx = 0;
  }
  if (f.x < TABLE.left + half) {
    f.x = TABLE.left + half;
    f.vx = Math.abs(f.vx) * 0.8;
  } else if (f.x > TABLE.right - half) {
    f.x = TABLE.right - half;
    f.vx = -Math.abs(f.vx) * 0.8;
  }
  if (!nearTable(f)) return;
  for (const b of blockers) {
    if (f.x + half <= b.x0 || f.x - half >= b.x1) continue;
    if (was <= (b.x0 + b.x1) / 2) {
      f.x = b.x0 - half;
      f.vx = -Math.abs(f.vx) * 0.8;
    } else {
      f.x = b.x1 + half;
      f.vx = Math.abs(f.vx) * 0.8;
    }
  }
}
