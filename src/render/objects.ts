import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { ART_BASE } from "../art/registry";
import PRODUCT_TABLE from "./products.json" with { type: "json" };
import { CRATE, type Crate } from "../sim/crates";
import type { CrateKind } from "../sim/level";
import type { Pickup, PickupKind } from "../sim/rewards";
import { SCENERY_Z } from "./backdrop";
import { PALETTE, shadowOf, tones } from "./palette";
import type { Particles, RecipeName } from "./particles";

const INK = { width: 4, color: PALETTE.outline, join: "round" as const };
const THIN = { width: 3, color: PALETTE.outline, join: "round" as const };
const COLORS = {
  can: "#151515",
  canRed: "#d4202c",
  silver: "#c9ccd1",
  kraft: "#c79a5b",
  nut: "#b07a3c",
  bucees: "#f2c230",
  buceesRed: "#c8262d",
  beaver: "#7a4a24",
  chili: "#d13a26",
  stem: "#3f8a3a",
  wood: "#b98a52",
  amber: "#e9a23b",
  steel: "#8f989e",
  strap: "#4a3a2c",
} as const;
/** Pickups and crates sort just in front of the venue and behind everything that moves. */
const PICKUP_Z = SCENERY_Z + 1;
const CRATE_Z = SCENERY_Z + 2;
/** A crate hit from below jumps this far and settles over this long. */
const CRATE_BUMP = { px: 12, t: 0.12 } as const;
const BURSTS: Record<PickupKind, RecipeName> = { can: "frost", nuts: "crumbs", bucees: "gold", pepper: "fizz" };

/**
 * The real products (owner, 2026-10-12: "obvious and with their original logos"): the shipped
 * game's pictures in public/, cropped to what is painted, and how tall each stands in the world
 * (about a quarter of his height). The beaver marks the Buc-ee's case.
 */
const PRODUCTS = PRODUCT_TABLE as Record<"can" | "nuts" | "bucees" | "beaver", { file: string; box: [number, number, number, number]; height: number }>;
type Product = keyof typeof PRODUCTS;
/** The sync's small copy of a pickup, already cut to what is painted. */
const productCopy = (k: Product) => `${ART_BASE}products/${k}.webp`;
const productTextures = new Map<Product, Texture>();
/** The can stencilled on the Coke Zero crate stands this tall. */
const CRATE_CAN = 56;

/** Loads the product pictures once. Returns how many of the three pickups have theirs; the rest keep the drawn stand-in. */
export async function loadProducts(): Promise<number> {
  await Promise.all(
    (Object.keys(PRODUCTS) as Product[]).map(async (k) => {
      if (productTextures.has(k)) return;
      try {
        productTextures.set(k, await Assets.load<Texture>(productCopy(k)));
      } catch {
        try {
          // No small copy: the original, cut to its box.
          const p = PRODUCTS[k];
          const t = await Assets.load<Texture>(p.file);
          const [x0, y0, x1, y1] = p.box;
          productTextures.set(k, new Texture({ source: t.source, frame: new Rectangle(x0, y0, x1 - x0, y1 - y0) }));
        } catch {
          // The drawn stand-in stays.
        }
      }
    }),
  );
  return (["can", "nuts", "bucees"] as const).filter((k) => productTextures.has(k)).length;
}

function productSprite(k: Product, height: number = PRODUCTS[k].height): Sprite | null {
  const t = productTextures.get(k);
  if (!t) return null;
  const s = new Sprite(t);
  s.anchor.set(0.5);
  s.scale.set(height / t.frame.height);
  return s;
}

/** A pickup about its middle: the real product where its picture loaded, the ink stand-in otherwise. */
export function pickupView(kind: PickupKind): Container {
  const c = new Container();
  const s = kind === "pepper" ? null : productSprite(kind);
  c.addChild(s ?? drawPickup(new Graphics(), kind));
  return c;
}

/** The logo on a fresh crate, from the bottom middle: the can on the Coke Zero crate, the beaver on the Buc-ee's case. */
export function crateLogo(kind: CrateKind): Sprite | null {
  const s = kind === "can" ? productSprite("can", CRATE_CAN) : kind === "bucees" ? productSprite("beaver") : null;
  s?.position.set(0, -CRATE.size / 2);
  return s;
}

/** A pickup's float: 10 px either way, each out of step with its neighbours. */
export const bob = (t: number, id: number) => 10 * Math.sin(t * 2.6 + id * 1.7);

/** A pickup drawn about its middle, 70 px tall. */
export function drawPickup(g: Graphics, kind: PickupKind): Graphics {
  switch (kind) {
    case "can": {
      g.roundRect(-20, -31, 40, 62, 8).fill(COLORS.can);
      g.rect(-20, -6, 40, 16).fill(COLORS.canRed);
      g.roundRect(-20, -31, 40, 10, 5).fill(COLORS.silver);
      g.roundRect(-6, -29, 12, 4, 2).fill(shadowOf(COLORS.silver));
      g.roundRect(-20, 23, 40, 8, 4).fill(COLORS.silver);
      g.roundRect(-13, -18, 6, 38, 3).fill({ color: "#ffffff", alpha: 0.45 });
      g.roundRect(-20, -31, 40, 62, 8).stroke(INK);
      return g;
    }
    case "nuts": {
      const kraft = tones(COLORS.kraft);
      g.poly([-26, -24, 26, -24, 30, 34, -30, 34]).fill(kraft.base);
      g.poly([8, -24, 26, -24, 30, 34, 10, 34]).fill(kraft.shadow);
      // The crimped top: a folded band with a pinked edge, inked with the bag.
      const zig: number[] = [];
      for (let i = 0; i <= 8; i++) zig.push(-26 + i * 6.5, -30 - (i % 2 ? 6 : 0));
      g.poly([...zig, 26, -18, -26, -18]).fill(kraft.highlight);
      g.poly([...zig, 26, -18, -26, -18]).stroke({ width: 3, color: PALETTE.outline, join: "round" });
      g.roundRect(-16, -8, 32, 28, 8).fill("#f3e7d2");
      for (const [x, y] of [[-8, 0], [6, 2], [-2, 12], [9, 13]]) g.ellipse(x, y, 6, 4).fill(COLORS.nut);
      g.roundRect(-16, -8, 32, 28, 8).stroke({ width: 2, color: PALETTE.outline });
      g.poly([-26, -24, 26, -24, 30, 34, -30, 34]).stroke(INK);
      return g;
    }
    case "bucees": {
      const bag = tones(COLORS.bucees);
      g.roundRect(-30, -32, 60, 66, 10).fill(bag.base);
      g.roundRect(8, -26, 18, 56, 6).fill(bag.shadow);
      g.roundRect(-30, -32, 60, 12, 6).fill(bag.highlight);
      g.circle(0, 4, 18).fill(COLORS.buceesRed);
      // The beaver in the red circle: a round face, two ears, two front teeth.
      g.circle(0, 5, 11).fill(COLORS.beaver);
      for (const ex of [-9, 9]) {
        g.circle(ex, -5, 4.5).fill(COLORS.beaver);
        g.circle(ex, -5, 4.5).stroke({ width: 1.5, color: PALETTE.outline });
      }
      g.rect(-4, 9, 8, 7).fill("#ffffff");
      g.circle(-4, 1, 2).fill(PALETTE.outline);
      g.circle(4, 1, 2).fill(PALETTE.outline);
      g.circle(0, 4, 18).stroke({ width: 2, color: PALETTE.outline });
      g.roundRect(-30, -32, 60, 66, 10).stroke(INK);
      return g;
    }
    case "pepper": {
      const chili = tones(COLORS.chili);
      g.moveTo(-6, -24).bezierCurveTo(26, -20, 30, 18, -6, 34).bezierCurveTo(14, 12, 10, -6, -16, -16).closePath().fill(chili.base);
      g.moveTo(-2, -16).bezierCurveTo(18, -10, 20, 10, 6, 22).stroke({ width: 4, color: chili.highlight, cap: "round" });
      g.moveTo(-6, -24).bezierCurveTo(26, -20, 30, 18, -6, 34).bezierCurveTo(14, 12, 10, -6, -16, -16).closePath().stroke(INK);
      g.moveTo(-12, -20).quadraticCurveTo(-18, -32, -8, -36).stroke({ width: 9, color: PALETTE.outline, cap: "round" });
      g.moveTo(-12, -20).quadraticCurveTo(-18, -32, -8, -36).stroke({ width: 5, color: COLORS.stem, cap: "round" });
      return g;
    }
  }
}

/** A crate drawn from its bottom middle: the mark says what is inside until it is spent. `mark` false leaves it to a logo. */
export function drawCrate(g: Graphics, kind: CrateKind, used: boolean, cans = 0, mark = true): Graphics {
  const s = CRATE.size;
  const x = -s / 2;
  const y = -s;
  if (kind === "case") {
    const steel = tones(COLORS.steel);
    g.roundRect(x, y + 10, s, s - 10, 10).fill(cans >= 3 ? steel.shadow : steel.base);
    g.roundRect(x + 6, y + 16, s - 12, 10, 4).fill(steel.highlight);
    for (const sx of [x + 22, x + s - 34]) g.rect(sx, y + 10, 12, s - 10).fill(COLORS.strap);
    g.roundRect(x + s / 2 - 22, y - 2, 44, 16, 6).stroke({ width: 6, color: PALETTE.outline });
    g.roundRect(x + s / 2 - 14, y + s / 2 - 4, 28, 18, 4).fill(PALETTE.brass);
    g.roundRect(x + s / 2 - 14, y + s / 2 - 4, 28, 18, 4).stroke({ width: 2, color: PALETTE.outline });
    // Dents for every can it has given up.
    for (let i = 0; i < cans; i++) g.circle(x + 44 + ((i * 29) % 34), y + 36 + ((i * 23) % 44), 7).fill({ color: PALETTE.outline, alpha: 0.35 });
    g.roundRect(x, y + 10, s, s - 10, 10).stroke(INK);
    return g;
  }
  const base = kind === "bucees" ? COLORS.bucees : COLORS.wood;
  const wood = tones(used ? shadowOf(shadowOf(base)) : base);
  g.rect(x, y, s, s).fill(wood.base);
  for (let k = 1; k < 4; k++) g.rect(x, y + (k * s) / 4 - 2, s, 4).fill(wood.shadow);
  g.rect(x, y, 14, s).fill(wood.highlight);
  g.rect(x + s - 14, y, 14, s).fill(wood.shadow);
  g.rect(x, y, s, 12).fill(wood.highlight);
  g.rect(x, y + s - 12, s, 12).fill(wood.shadow);
  g.rect(x, y, s, s).stroke(INK);
  if (used || !mark) return g;
  const cx = 0;
  const cy = y + s / 2;
  if (kind === "pepper") {
    g.roundRect(cx - 10, cy - 34, 20, 46, 6).fill(COLORS.amber);
    g.circle(cx, cy + 26, 10).fill(COLORS.amber);
    g.roundRect(cx - 10, cy - 34, 20, 46, 6).stroke(THIN);
    g.circle(cx, cy + 26, 10).stroke(THIN);
  } else if (kind === "can") {
    g.roundRect(cx - 14, cy - 26, 28, 52, 6).fill(COLORS.can);
    g.rect(cx - 14, cy - 6, 28, 12).fill(COLORS.canRed);
    g.roundRect(cx - 14, cy - 26, 28, 52, 6).stroke(THIN);
  } else {
    g.circle(cx, cy, 26).fill(COLORS.buceesRed);
    g.circle(cx, cy + 2, 14).fill(COLORS.beaver);
    g.circle(cx, cy, 26).stroke(THIN);
  }
  return g;
}

type CrateView = { root: Container; g: Graphics; logo: Sprite | null; key: string; bump: number };

/** The level's pickups and crates on screen: bobbing, glinting, bursting when taken, jolting when hit. */
export class Objects {
  private readonly root = new Container();
  private readonly pickups = new Map<number, { c: Container; taken: boolean }>();
  private readonly crates = new Map<string, CrateView>();
  private t = 0;
  private steam = 0;

  constructor(
    layer: Container,
    private readonly particles: Particles,
  ) {
    layer.addChild(this.root);
  }

  /** Forget everything drawn: the level changed or he came back. */
  clear() {
    for (const p of this.pickups.values()) p.c.destroy({ children: true });
    for (const c of this.crates.values()) c.root.destroy({ children: true });
    this.pickups.clear();
    this.crates.clear();
  }

  sync(pickups: readonly Pickup[], crates: readonly Crate[], dt: number) {
    this.t += dt;
    const seen = new Set<number>();
    for (const p of pickups) {
      seen.add(p.id);
      let view = this.pickups.get(p.id);
      if (!view) {
        const c = pickupView(p.kind);
        c.zIndex = PICKUP_Z;
        this.root.addChild(c);
        view = { c, taken: p.taken };
        this.pickups.set(p.id, view);
      }
      view.c.visible = !p.taken;
      view.c.position.set(p.x, p.y + (p.body ? 0 : bob(this.t, p.id)));
      // A glint now and then, each on its own beat.
      if (!p.taken && Math.floor((this.t + p.id * 0.37) / 2.4) !== Math.floor((this.t - dt + p.id * 0.37) / 2.4))
        this.particles.emit("glint", p.x + 12, p.y - 20 + bob(this.t, p.id), 1);
    }
    for (const [id, view] of this.pickups)
      if (!seen.has(id)) {
        view.c.destroy({ children: true });
        this.pickups.delete(id);
      }

    this.steam += dt;
    const puff = this.steam >= 0.4;
    if (puff) this.steam = 0;
    for (const c of crates) {
      let view = this.crates.get(c.id);
      const key = `${c.used}|${c.broken}|${c.cans}`;
      if (!view) {
        const root = new Container();
        const g = new Graphics();
        const logo = crateLogo(c.kind);
        root.addChild(g);
        if (logo) root.addChild(logo);
        root.zIndex = CRATE_Z;
        this.root.addChild(root);
        view = { root, g, logo, key: "", bump: 0 };
        this.crates.set(c.id, view);
      }
      if (view.key !== key) {
        if (view.key && !c.broken) view.bump = CRATE_BUMP.t;
        view.key = key;
        view.g.clear();
        if (!c.broken) drawCrate(view.g, c.kind, c.used, c.cans, !view.logo);
        if (view.logo) view.logo.visible = !c.used && !c.broken;
      }
      view.bump = Math.max(0, view.bump - dt);
      const lift = view.bump > 0 ? CRATE_BUMP.px * Math.sin((view.bump / CRATE_BUMP.t) * Math.PI) : 0;
      view.root.position.set(c.x, c.y - lift);
      if (puff && c.kind === "pepper" && !c.used) this.particles.emit("steamPuff", c.x + 20, c.y - CRATE.size, 1);
    }
  }

  setVisible(on: boolean) {
    this.root.visible = on;
  }

  /** A pickup taken: a burst in its colours. */
  pop(kind: PickupKind, x: number, y: number) {
    this.particles.emit(BURSTS[kind], x, y, 14);
    this.particles.emit("glint", x, y, 3);
  }

  /** A delivery case broken open. */
  splinter(x: number, y: number) {
    this.particles.emit("splinters", x, y, 18);
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}
