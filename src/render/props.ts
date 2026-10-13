import { Container, Graphics } from "pixi.js";
import type { Missile } from "../sim/missiles";
import type { Puddle, Snot } from "../sim/snot";
import type { Snapshot, Target } from "../sim/types";
import { between } from "./interp";
import { PALETTE, tones } from "./palette";
import type { Particles } from "./particles";

const INK = PALETTE.outline;
const LINE = 4;
const TRAIL_EVERY = 0.02;
const FLASH_ALPHA = 0.85;
/** How far a flying cart leans per unit of spin, radians. */
const SPIN_LEAN = 0.02;

type Fill = { flash: boolean };
const paint = (g: Graphics, color: string, { flash }: Fill) => g.fill(flash ? "#ffffff" : color);
const ink = (g: Graphics, { flash }: Fill, width = LINE) =>
  flash ? g : g.stroke({ width, color: INK, join: "round", cap: "round" });

/**
 * The lobby's brass luggage cart, its feet at the origin: a brass frame with an arch
 * handle and two uprights, a red carpet deck on four castors and three strapped cases.
 * `flash` draws the same shapes in white: the overlay for the hit flash.
 */
export function drawCart(g: Graphics, t: Pick<Target, "w" | "h"> & Partial<Pick<Target, "load" | "spilled">>, flash = false): void {
  if (t.load === "dishes") return drawBusCart(g, { w: t.w, spilled: !!t.spilled }, flash);
  if (t.load === "trash") return drawBin(g, t, flash);
  const f: Fill = { flash };
  const brass = tones(PALETTE.brass);
  const deck = tones("#8e2b2b");
  const half = t.w / 2;
  const deckTop = -58;
  const deckH = 22;
  const postX = half - 12;
  // The arch's top is the cart's full height.
  const springY = -t.h + postX;

  // The far castors first, a shade back, then the near pair.
  for (const [x, r, far] of [
    [-postX + 22, 12, true],
    [postX - 6, 12, true],
    [-postX + 6, 15, false],
    [postX - 22, 15, false],
  ] as const) {
    g.rect(x - 3, deckTop + deckH - 2, 6, -deckTop - deckH - r * 2 + 4);
    paint(g, far ? brass.shadow : brass.base, f);
    ink(g, f, 3);
    g.circle(x, -r, r);
    paint(g, far ? "#2a2a2a" : "#1a1a1a", f);
    ink(g, f, 3);
    g.circle(x, -r, r * 0.4);
    paint(g, "#8a8a8a", f);
  }

  // The uprights and the arch over the top: a brass tube.
  const tube = (draw: () => void, width: number, color: string) => {
    draw();
    g.stroke({ width: width + LINE * 2, color: flash ? "#ffffff" : INK, cap: "round", join: "round" });
    draw();
    g.stroke({ width, color: flash ? "#ffffff" : color, cap: "round", join: "round" });
  };
  const arch = () => {
    g.moveTo(-postX, deckTop).lineTo(-postX, springY);
    g.arc(0, springY, postX, Math.PI, 0);
    g.lineTo(postX, deckTop);
  };
  tube(arch, 12, brass.base);
  if (!flash) {
    g.moveTo(-postX - 3, deckTop - 6).lineTo(-postX - 3, springY - 4);
    g.arc(0, springY, postX + 3, Math.PI, Math.PI * 1.35);
    g.stroke({ width: 3, color: brass.highlight, cap: "round" });
  }

  // Three cases on the deck, each with a strap and a handle.
  const cases: [x: number, y: number, w: number, h: number, color: string][] = [
    [-half + 26, deckTop - 96, 132, 96, "#2f4a74"],
    [-half + 44, deckTop - 96 - 72, 112, 72, "#7a4b2a"],
    [-half + 62, deckTop - 168 - 52, 84, 52, "#3f6b4f"],
  ];
  for (const [x, y, w, h, color] of cases) {
    const c = tones(color);
    g.roundRect(x, y, w, h, 10);
    paint(g, c.base, f);
    ink(g, f);
    if (flash) continue;
    g.roundRect(x + 6, y + h - 16, w - 12, 10, 4).fill(c.shadow);
    g.roundRect(x + 8, y + 6, w - 16, 6, 3).fill(c.highlight);
    g.rect(x + w * 0.3, y, 10, h).fill("#1d1d1d");
    g.rect(x + w * 0.62, y, 10, h).fill("#1d1d1d");
    g.roundRect(x + w / 2 - 16, y - 12, 32, 14, 6).stroke({ width: 5, color: INK });
  }

  // The red carpet deck with its brass rim.
  g.roundRect(-half, deckTop, t.w, deckH, 6);
  paint(g, deck.base, f);
  ink(g, f);
  if (!flash) {
    g.rect(-half + 6, deckTop + 4, t.w - 12, 5).fill(deck.highlight);
    g.rect(-half + 6, deckTop + deckH - 7, t.w - 12, 4).fill(deck.shadow);
    g.roundRect(-half - 4, deckTop - 6, t.w + 8, 8, 4).fill(brass.base).stroke({ width: 3, color: INK });
  }
}

/** A busser's grey utility cart: two shelves of bus tubs, dirty dishes stacked in them until they crash. */
function drawBusCart(g: Graphics, t: { w: number; spilled: boolean }, flash: boolean): void {
  const f: Fill = { flash };
  const grey = tones("#7c8086");
  const half = t.w / 2 - 10;
  for (const x of [-half + 14, half - 14]) {
    g.circle(x, -14, 14);
    paint(g, "#1a1a1a", f);
    ink(g, f, 3);
  }
  for (const x of [-half, half - 14]) {
    g.rect(x, -250, 14, 222);
    paint(g, grey.shadow, f);
    ink(g, f, 3);
  }
  for (const y of [-70, -180]) {
    g.rect(-half, y, half * 2, 18);
    paint(g, grey.base, f);
    ink(g, f, 3);
    g.roundRect(-half + 16, y - 56, half * 2 - 32, 56, 6);
    paint(g, "#5a5e66", f);
    ink(g, f, 3);
    if (!t.spilled)
      for (let x = -half + 34; x < half - 40; x += 34) {
        g.ellipse(x, y - 60, 16, 6);
        paint(g, "#f4f3ee", f);
        ink(g, f, 2);
      }
  }
  g.roundRect(-half - 10, -262, half * 2 + 20, 16, 6);
  paint(g, grey.highlight, f);
  ink(g, f, 3);
}

/** The dock's wheeled trash bin, its lid shut. */
function drawBin(g: Graphics, t: Pick<Target, "w">, flash: boolean): void {
  const f: Fill = { flash };
  const body = tones("#3d5a3f");
  const half = t.w / 2 - 20;
  g.circle(-half + 20, -16, 16);
  paint(g, "#1a1a1a", f);
  ink(g, f, 3);
  g.poly([-half, -300, half, -300, half - 12, -24, -half + 12, -24]);
  paint(g, body.base, f);
  ink(g, f);
  g.poly([half - 50, -300, half, -300, half - 12, -24, half - 46, -24]);
  paint(g, body.shadow, f);
  g.roundRect(-half - 8, -322, half * 2 + 16, 26, 6);
  paint(g, body.highlight, f);
  ink(g, f, 3);
}

type CartView = { root: Container; body: Graphics; flash: Graphics; lean: number; spilled: boolean };

/** Draws the carts, the snot in flight and the puddles from each snapshot. */
export class Props {
  readonly container = new Container({ label: "props" });
  private readonly carts = new Map<number, CartView>();
  private readonly blobs: Graphics[] = [];
  private readonly puddles: Graphics[] = [];
  private readonly missiles: Graphics[] = [];
  private trailT = 0;

  constructor(
    layer: Container,
    private readonly particles: Particles,
    ambient = 0xffffff,
  ) {
    this.container.sortableChildren = true;
    // Props take the venue's light like the scenery; the hit flash goes a touch warm with it.
    this.container.tint = ambient;
    layer.addChild(this.container);
  }

  /** Draws the props `alpha` of the way from the last step to this one, as Hammer is drawn. */
  sync(prev: Snapshot, cur: Snapshot, alpha: number, dt: number): void {
    const s = between(prev, cur, alpha);
    for (const t of s.targets) this.cart(t, dt);
    this.trailT += dt;
    const trail = this.trailT >= TRAIL_EVERY;
    if (trail) this.trailT = 0;
    this.pool(this.blobs, s.snot.length, 2);
    s.snot.forEach((b, i) => {
      drawSnot(this.blobs[i], b);
      if (trail) this.particles.emit(b.hot ? "ember" : "snot", b.x, b.y, b.hot ? 2 : 1);
    });
    this.pool(this.puddles, s.puddles.length, 0);
    s.puddles.forEach((p, i) => drawPuddle(this.puddles[i], p));
    this.pool(this.missiles, s.missiles.length, 3);
    s.missiles.forEach((m, i) => {
      drawMissile(this.missiles[i], m);
      if (trail && m.kind !== "plane") this.particles.emit("coffee", m.x, m.y, 1);
    });
  }

  private cart(t: Target, dt: number) {
    let v = this.carts.get(t.id);
    if (!v) {
      const root = new Container({ label: `cart ${t.id}` });
      const body = new Graphics();
      drawCart(body, t);
      const flash = new Graphics();
      drawCart(flash, t, true);
      flash.alpha = FLASH_ALPHA;
      root.addChild(body, flash);
      root.zIndex = 1;
      this.container.addChild(root);
      v = { root, body, flash, lean: 0, spilled: t.spilled };
      this.carts.set(t.id, v);
    }
    // A dish cart's dishes are gone once they crash.
    if (v.spilled !== t.spilled) {
      v.spilled = t.spilled;
      drawCart(v.body.clear(), t);
      drawCart(v.flash.clear(), t, true);
    }
    const want = t.onGround ? 0 : t.spin * SPIN_LEAN;
    v.lean += (want - v.lean) * Math.min(1, dt * 14);
    v.root.position.set(t.x, t.y);
    v.root.rotation = v.lean;
    v.flash.visible = t.flash > 0;
  }

  private pool(list: Graphics[], n: number, z: number) {
    while (list.length < n) {
      const g = new Graphics();
      g.zIndex = z;
      this.container.addChild(g);
      list.push(g);
    }
    list.forEach((g, i) => (g.visible = i < n));
  }
}

/** An outlined blob stretched along its flight; hot snot (the pepper's) is bigger and burns orange. */
function drawSnot(g: Graphics, b: Snot) {
  const r = b.hot ? 20 : 14;
  const speed = Math.hypot(b.vx, b.vy);
  const stretch = 1 + Math.min(0.7, speed / 2400);
  const body = tones(b.hot ? "#ff7a1f" : "#8fbf3f");
  g.clear();
  g.ellipse(0, 0, r * stretch, r / Math.sqrt(stretch)).fill(body.base).stroke({ width: 3, color: INK });
  g.ellipse(r * 0.25 * stretch, -r * 0.3, r * 0.35 * stretch, r * 0.2).fill(body.highlight);
  g.position.set(b.x, b.y);
  g.rotation = Math.atan2(b.vy, b.vx);
}

/** A paper plane, a folded dart pointing along its flight, or the office worker's cup tumbling. */
export function drawMissile(g: Graphics, m: Missile) {
  g.clear();
  if (m.kind === "plane") {
    g.poly([-36, 0, 32, -5, 12, 6, 32, 9]).fill("#fbf7ee").stroke({ width: 3, color: INK, join: "round" });
    g.moveTo(-36, 0).lineTo(32, -5).stroke({ width: 2, color: "#b8b0a2" });
    g.position.set(m.x, m.y);
    g.scale.set(m.vx < 0 ? -1 : 1, 1);
    g.rotation = m.vx < 0 ? -m.spin : m.spin;
    return;
  }
  if (m.kind === "pan") {
    // The cook's hot pan, tumbling, its food going with it.
    g.roundRect(-80, -6, 70, 12, 4).fill("#3a2a1c").stroke({ width: 2, color: INK });
    g.ellipse(20, -8, 46, 12).fill("#2b2b2e").stroke({ width: 3, color: INK });
    g.ellipse(20, -16, 24, 8).fill("#d98a3a");
  } else {
    g.roundRect(-11, -14, 22, 28, 4).fill("#f4f3ee").stroke({ width: 3, color: INK });
    g.rect(-11, -14, 22, 6).fill("#6b3a1e");
  }
  g.position.set(m.x, m.y);
  g.scale.set(1, 1);
  g.rotation = m.spin;
}

const PUDDLE_COLORS = { snot: "#9cc24a", water: "#7cc8f0", coffee: "#6b3a1e", gravy: "#8a5a2b", grease: "#d9a441" } as const;

/** A flat glossy puddle on the floor, in what was spilled, that fades over its last second. */
export function drawPuddle(g: Graphics, p: Puddle) {
  const h = p.w * 0.18;
  const c = tones(PUDDLE_COLORS[p.kind]);
  g.clear();
  g.ellipse(0, 0, p.w / 2, h / 2).fill(c.shadow).stroke({ width: 3, color: INK });
  g.ellipse(-p.w * 0.04, -h * 0.08, p.w * 0.38, h * 0.3).fill(c.base);
  g.ellipse(-p.w * 0.16, -h * 0.16, p.w * 0.12, h * 0.1).fill({ color: "#ffffff", alpha: 0.75 });
  g.position.set(p.x, p.y);
  g.alpha = Math.min(1, p.life);
}
