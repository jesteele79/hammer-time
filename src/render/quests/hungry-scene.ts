import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { ART_BASE, type Registry } from "../../art/registry";
import { HEAD_SCALE } from "../../sim/constants";
import { DISH, FOODS, type FoodKind } from "../../sim/quests/hungry/food";
import { HUNGRY, baseReach, handOf, planeAt, serverAt, underLine, type Eater, type Hungry, type Rival } from "../../sim/quests/hungry/hungry";
import { BANQUET_SCALE, RIVALS, SEATS, TABLE, dirOf, dist, floorOf, onScreen, sub, type EaterId, type RivalId } from "../../sim/quests/hungry/table";
import { ACTIONS, displayU, overlay } from "../../sim/rig/actions";
import { castPose } from "../../sim/rig/cast";
import { CLIPS } from "../../sim/rig/clips";
import { coilPose, diveK, divePose } from "../../sim/rig/dive";
import { solve } from "../../sim/rig/fk";
import { groundShift } from "../../sim/rig/ground";
import type { Pose } from "../../sim/rig/pose";
import type { Point, Rect } from "../../sim/types";
import type { RenderApp } from "../app";
import { createCharacter, type Character } from "../character";
import { loadProducts, productTexture } from "../objects";
import { PALETTE } from "../palette";
import type { Scene } from "../scene";
import { label } from "../text";
import { DINER_ID, Diner } from "./diner";

/** Who stands at the table in whose painting (R4 plan, decision 9): the server in server-2's own black vest. */
const PERSON: Record<RivalId | "server", "student-1" | "bellhop-1" | "nurse" | "server-2"> = {
  student: "student-1",
  bellhop: "bellhop-1",
  nurse: "nurse",
  server: "server-2",
};
/** Where the chute's mouth hangs over the table's middle, world px: above his head as he dives under it at twice his size. */
const CHUTE_MOUTH = -440;
/** A dish poured from a tray or the cart drops this far onto its spot. */
const SPILL_DROP = 160;
/** Paper flies head-high over the table top. */
const PAPER_UP = 300;
/**
 * A dish's plate drawn this much wider than its disc on the cloth: at twice their shift size the eaters' hands would
 * dwarf plates drawn to the disc, so the plates are drawn half again as wide and overlap a little where they crowd.
 */
const PLATE_DRAW = 1.5;
/** The products (the can, the bags) are pictures, not plates: drawn to the disc's own width, so they stand about a plate tall. */
const PRODUCT_DRAW = 1.1;
/** How wide a dish is drawn on the cloth or in the air. */
const drawWidth = (kind: FoodKind, r: number) => 2 * r * (FOODS[kind].sheet === null ? PRODUCT_DRAW : PLATE_DRAW);
/** How far past the ballroom painting its edges are stretched, so a screen of any shape sees the room. */
const ROOM_EDGE = 6000;
const Z = { room: 0, server: 10, far: 20, table: 30, marks: 35, plates: 36, stacks: 37, dishes: 40, cases: 50, chute: 55, divers: 60, ends: 62, cart: 64, air: 70, hammer: 80 } as const;

/**
 * The banquet (R4 §2): the ballroom, the round table, the dishes, the plates, the chute, the cart, the paper and the
 * suitcase, the rivals and the server, and Hammer in his bib, all drawn from the round's state each frame. Everything at
 * the table sorts behind him (R4 §1, decision 7). Painted where the owner's art is in, drawn where it is not.
 */
export class BanquetView {
  readonly root = new Container({ label: "banquet" });
  private readonly room = new Container({ label: "room" });
  private readonly table = new Container({ label: "table" });
  private readonly marks = new Graphics();
  private readonly dishes = new Container({ label: "dishes" });
  private readonly plates = new Graphics();
  private readonly stacks = new Container({ label: "stacks" });
  private readonly cases = new Graphics();
  private readonly chute = new Graphics();
  private readonly cart = new Graphics();
  private readonly air = new Container({ label: "air" });
  private readonly paper = new Graphics();
  private readonly sprites = new Map<number, Sprite>();
  private readonly food = new Map<FoodKind, Texture>();
  /** The plates it drew itself (not loaded art): let go with it. */
  private readonly drawn: Texture[] = [];
  /** The room painting's stretched edges: frames of its texture, let go without the texture itself. */
  private readonly framed: Texture[] = [];
  private readonly diners = new Map<RivalId | "server", Diner>();
  private hammer: Character | null = null;
  private faceRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  private crownAt: Point = { x: 0, y: 0 };
  private smugT = 0;
  private hurtT = 0;

  constructor(
    private readonly render: RenderApp,
    scene: Scene,
    private readonly registry: Registry,
    private readonly noart: boolean,
  ) {
    this.root.sortableChildren = true;
    this.root.visible = false;
    for (const [c, z] of [
      [this.room, Z.room],
      [this.table, Z.table],
      [this.marks, Z.marks],
      [this.plates, Z.plates],
      [this.stacks, Z.stacks],
      [this.dishes, Z.dishes],
      [this.cases, Z.cases],
      [this.chute, Z.chute],
      [this.cart, Z.cart],
      [this.air, Z.air],
      [this.paper, Z.air + 1],
    ] as const) {
      c.zIndex = z;
      this.root.addChild(c);
    }
    this.dishes.sortableChildren = true;
    scene.layers.play.addChild(this.root);
  }

  /** The paintings (or their drawn stand-ins), the diners and his banquet bib: loaded once. */
  async load(): Promise<void> {
    const b = this.noart ? undefined : this.registry.banquet;
    await Promise.all([this.loadRoom(b), this.loadTable(b), this.loadFood(b)]);
    for (const id of [...RIVALS, "server"] as const) this.diners.set(id, new Diner(this.root, this.registry, PERSON[id], null, this.noart));
    await Promise.all([...this.diners.values()].map((d) => d.load()));
    this.hammer = createCharacter(this.registry, "banquet", { noart: this.noart });
    this.hammer.container.zIndex = Z.hammer;
    this.root.addChild(this.hammer.container);
    await this.hammer.ready;
    this.drawChute();
  }

  /** A painting's texture, or null when it does not load: its stand-in draws instead. */
  private async texture(file: string): Promise<Texture | null> {
    try {
      return await Assets.load<Texture>(ART_BASE + file);
    } catch {
      return null;
    }
  }

  private async loadRoom(b: Registry["banquet"]) {
    const room = b?.room;
    const tex = room ? await this.texture(room.file) : null;
    if (room && tex) {
      const k = (2 * TABLE.r) / room.span;
      const [W, H] = [tex.width, tex.height];
      const [x0, y0, w, h] = [-room.table.x * k, -room.table.y * k, W * k, H * k];
      // The painting's own edges stretched outward first, so a phone's taller or wider view still sees the room round it.
      const edge = (frame: Rectangle, x: number, y: number, sw: number, sh: number) => {
        const t = new Texture({ source: tex.source, frame });
        this.framed.push(t);
        const s = new Sprite(t);
        s.position.set(x, y);
        s.width = sw;
        s.height = sh;
        this.room.addChild(s);
      };
      const E = ROOM_EDGE;
      edge(new Rectangle(0, 0, W, 1), x0, y0 - E, w, E);
      edge(new Rectangle(0, H - 1, W, 1), x0, y0 + h, w, E);
      edge(new Rectangle(0, 0, 1, H), x0 - E, y0, E, h);
      edge(new Rectangle(W - 1, 0, 1, H), x0 + w, y0, E, h);
      for (const [fx, fy, x, y] of [
        [0, 0, x0 - E, y0 - E],
        [W - 1, 0, x0 + w, y0 - E],
        [0, H - 1, x0 - E, y0 + h],
        [W - 1, H - 1, x0 + w, y0 + h],
      ])
        edge(new Rectangle(fx, fy, 1, 1), x, y, E, E);
      const s = new Sprite(tex);
      s.scale.set(k);
      s.position.set(x0, y0);
      this.room.addChild(s);
      return;
    }
    // A plain warm wall over a drawn carpet: the room until the painting is in.
    const g = new Graphics();
    g.rect(-ROOM_EDGE, -ROOM_EDGE, 2 * ROOM_EDGE, ROOM_EDGE - 540).fill(0x5a1f24);
    g.rect(-ROOM_EDGE, -560, 2 * ROOM_EDGE, 40).fill(0xc9a24a);
    g.rect(-ROOM_EDGE, -520, 2 * ROOM_EDGE, ROOM_EDGE).fill(0x4a1c22);
    for (let y = -480; y < 1800; y += 120) for (let x = -2400 + ((y / 120) % 2) * 120; x < 2400; x += 240) g.ellipse(x, y, 40, 18).fill({ color: 0xc9a24a, alpha: 0.35 });
    this.room.addChild(g);
  }

  private async loadTable(b: Registry["banquet"]) {
    const t = b?.table;
    const tex = t ? await this.texture(t.file) : null;
    if (t && tex) {
      const s = new Sprite(tex);
      s.scale.set(TABLE.r / t.top.rx, (TABLE.r * TABLE.squash) / t.top.ry);
      s.position.set(-t.top.cx * s.scale.x, -t.top.cy * s.scale.y);
      this.table.addChild(s);
      return;
    }
    const g = new Graphics();
    const ry = TABLE.r * TABLE.squash;
    g.rect(-TABLE.r, 0, 2 * TABLE.r, TABLE.height).fill(0xf2efe8);
    g.ellipse(0, TABLE.height, TABLE.r, ry).fill(0xe4e0d6);
    g.ellipse(0, 0, TABLE.r, ry).fill(0xf8f6f0).stroke({ width: 8, color: 0xc9a24a });
    g.ellipse(0, 0, TABLE.r * 0.2, ry * 0.2).fill(0xc8ccd2).stroke({ width: 4, color: PALETTE.outline });
    this.table.addChild(g);
  }

  private async loadFood(b: Registry["banquet"]) {
    const sheet = b?.food;
    await loadProducts();
    for (const kind of Object.keys(FOODS) as FoodKind[]) {
      const f = FOODS[kind];
      const cell = f.sheet !== null ? sheet?.[f.sheet] : undefined;
      const painted = cell ? await this.texture(cell.file) : null;
      if (painted) this.food.set(kind, painted);
      // Coke Zero, the nuts and Buc-ee's are the products' own pictures, as in the shift.
      else if (kind === "coke" || kind === "nuts" || kind === "bucees") this.food.set(kind, (!this.noart && productTexture(kind === "coke" ? "can" : kind)) || this.drawnPlate(kind));
      else this.food.set(kind, this.drawnPlate(kind));
    }
  }

  /** The shipped look: a plate with the dish's color and its three-letter tag. */
  private drawnPlate(kind: FoodKind): Texture {
    const f = FOODS[kind];
    const r = 64;
    const g = new Graphics();
    g.ellipse(r, r * 0.6, r, r * 0.55).fill(0xffffff).stroke({ width: 5, color: PALETTE.outline });
    g.ellipse(r, r * 0.55, r * 0.62, r * 0.32).fill(f.color).stroke({ width: 3, color: PALETTE.outline });
    const tag = label(f.tag, "ui", 28);
    tag.anchor.set(0.5);
    tag.position.set(r, r * 0.55);
    tag.tint = 0x101010;
    const c = new Container();
    c.addChild(g, tag);
    const tex = this.render.app.renderer.generateTexture({ target: c, resolution: 2 });
    c.destroy({ children: true });
    this.drawn.push(tex);
    return tex;
  }

  /** A dish's picture as the table draws it: the food sheet's, the product's, or the drawn plate. */
  foodTexture(kind: FoodKind): Texture {
    return this.food.get(kind) ?? Texture.WHITE;
  }

  /** The kitchen's chute: a steel duct down from the ceiling, lit on its left and banded at its seams, flaring at its mouth. */
  private drawChute() {
    const g = this.chute.clear();
    const top = -1800;
    const neck = CHUTE_MOUTH - 70;
    g.rect(-56, top, 56, neck - top).fill(0xd6dbe0);
    g.rect(0, top, 56, neck - top).fill(0xa4abb3);
    for (let y = neck - 150; y > top; y -= 170) g.rect(-58, y, 116, 12).fill(0x7d848c);
    g.rect(-56, top, 112, neck - top).stroke({ width: 6, color: PALETTE.outline });
    g.poly([-56, neck, 56, neck, 88, CHUTE_MOUTH, -88, CHUTE_MOUTH]).fill(0xbfc5cc).stroke({ width: 6, color: PALETTE.outline });
    g.ellipse(0, CHUTE_MOUTH, 88, 16).fill(0x1d2127).stroke({ width: 5, color: PALETTE.outline });
  }

  /** How many of the diners are drawn from their paintings: the checks count the shift's painted figures apart from these. */
  paintedCount(): number {
    return [...this.diners.values()].filter((d) => d.isPainted).length;
  }

  setVisible(on: boolean): void {
    this.root.visible = on;
  }

  /** His face on screen as last drawn, world px: words, bubbles and cards keep off it. */
  face(): Rect {
    return this.faceRect;
  }
  crown(): Point {
    return this.crownAt;
  }
  crownOf(id: number): { x: number; y: number; facing: 1 | -1 } | null {
    for (const [k, d] of this.diners) if (DINER_ID[k] === id) return { ...d.crown, facing: 1 };
    return null;
  }
  /** Where someone's hand is on screen: the words for a chomp go there. */
  handAt(who: EaterId, q: Hungry): Point {
    return onScreen(handOf(who === "hammer" ? q.hammer : q.rivals[who]));
  }

  /** Hammer's expression a moment longer after a rob or a hurt. */
  smug(): void {
    this.smugT = 0.6;
  }
  hurt(): void {
    this.hurtT = 0.6;
  }

  sync(q: Hungry, dt: number, time: number): void {
    this.smugT = Math.max(0, this.smugT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.syncDishes(q);
    this.drawMarks(q, time);
    this.drawPlates(q);
    this.drawCases(q);
    this.drawCart(q);
    this.drawAir(q);
    for (const id of RIVALS) this.syncRival(q.rivals[id], time);
    this.syncServer(q, time);
    this.syncHammer(q, time);
  }

  private syncDishes(q: Hungry) {
    const seen = new Set<number>();
    for (const d of q.dishes) {
      // Still in the chute: not drawn yet.
      if (d.fall > DISH.fall) continue;
      seen.add(d.id);
      let s = this.sprites.get(d.id);
      if (!s) {
        s = new Sprite(this.foodTexture(d.kind));
        s.anchor.set(0.5, 0.6);
        this.sprites.set(d.id, s);
        this.dishes.addChild(s);
      }
      const at = onScreen(d);
      s.scale.set(drawWidth(d.kind, d.r) / s.texture.width);
      // Dropping onto its spot, faster as it falls: from the chute's mouth, or (a tray's, the cart's) from just above.
      const p = 1 - d.fall / DISH.fall;
      const chute = Math.hypot(d.x, d.y) < 2 * HUNGRY.dump.jitter;
      const from = chute ? { x: 0, y: CHUTE_MOUTH } : { x: at.x, y: at.y - SPILL_DROP };
      s.position.set(from.x + (at.x - from.x) * p, from.y + (at.y - from.y) * p * p);
      s.zIndex = at.y;
    }
    for (const [id, s] of this.sprites)
      if (!seen.has(id)) {
        s.destroy();
        this.sprites.delete(id);
      }
  }

  /**
   * His line, always there (stronger as a charge builds) out to where his hand would stop, the dishes it would sweep ringed,
   * and the plate it is locked on ringed bold (owner, 2026-10-18: a better way to steer his hand to each plate); in amber
   * over a dark edge, which reads on the white cloth. A diner's guard round their plate shows where his line runs into it,
   * redder the angrier they are, and bright while their slap is coming.
   */
  private drawMarks(q: Hungry, time: number) {
    const g = this.marks.clear();
    // The round over, its tally up: nothing more to aim at.
    if (q.result) return;
    const h = q.hammer;
    const p = SEATS.hammer.plate;
    const coil = h.dive?.phase === "coil" ? h.dive : null;
    const out = !!h.dive && !coil;
    const dir = coil ? coil.dir : dirOf(1, h.aim);
    const lockAt = h.lock ? dist(SEATS[h.lock].plate, p) : Infinity;
    const reach = coil ? coil.reach : Math.min(baseReach(q), lockAt);
    const end = h.lock ? lockAt : reach;
    const zone = HUNGRY.guard.zone;
    for (const id of RIVALS) {
      const r = q.rivals[id];
      if (r.asleep) continue;
      const v = sub(SEATS[id].plate, p);
      const along = Math.min(end, Math.max(0, v.x * dir.x + v.y * dir.y));
      const crossed = !out && Math.hypot(v.x - dir.x * along, v.y - dir.y * along) <= zone;
      const coming = r.slap >= 0;
      if (!coming && !crossed) continue;
      const c = onScreen(SEATS[id].plate);
      g.ellipse(c.x, c.y, zone, zone * TABLE.squash)
        .fill({ color: 0xd8443c, alpha: coming ? 0.24 : 0.06 + 0.03 * r.anger })
        .stroke({ width: coming ? 7 : 4, color: 0xd8443c, alpha: coming ? 0.95 : 0.3 + 0.12 * r.anger });
    }
    if (out) return;
    const AMBER = 0xe8961e;
    const EDGE = { color: 0x4a2c0c, alpha: 0.4 };
    const ring = (x: number, y: number, rx: number, ry: number, width: number, alpha: number) => {
      g.ellipse(x, y, rx, ry).stroke({ width: width + 4, ...EDGE });
      g.ellipse(x, y, rx, ry).stroke({ width, color: AMBER, alpha });
    };
    for (const d of underLine(q, dir, reach)) {
      const c = onScreen(d);
      const rx = drawWidth(d.kind, d.r) / 2 + 8;
      ring(c.x, c.y, rx, rx * 0.5, 4, 0.95);
    }
    const a = onScreen(p);
    const b = onScreen({ x: p.x + dir.x * end, y: p.y + dir.y * end });
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 11, cap: "round", ...EDGE });
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 6, color: AMBER, alpha: coil ? 1 : 0.8, cap: "round" });
    const stop = onScreen({ x: p.x + dir.x * reach, y: p.y + dir.y * reach });
    if (!h.lock || reach < lockAt - 1) ring(stop.x, stop.y, 40, 40 * TABLE.squash, 5, coil ? 1 : 0.8);
    if (h.lock) ring(b.x, b.y, 96, 96 * TABLE.squash, 8, 0.7 + 0.3 * Math.sin(time * 7));
  }

  /** Each plate, its stack's top few dishes on it. */
  private drawPlates(q: Hungry) {
    const g = this.plates.clear();
    this.stacks.removeChildren().forEach((c) => c.destroy());
    for (const e of [q.hammer, ...RIVALS.map((id) => q.rivals[id])] as Eater[]) {
      const c = onScreen(SEATS[e.id].plate);
      g.ellipse(c.x, c.y, 62, 62 * TABLE.squash).fill(0xffffff).stroke({ width: 5, color: PALETTE.outline });
      e.plate.slice(-4).forEach((kind, i) => {
        const s = new Sprite(this.foodTexture(kind));
        s.anchor.set(0.5, 0.6);
        s.scale.set((FOODS[kind].r * 1.6) / s.texture.width);
        s.position.set(c.x, c.y - 10 - i * 12);
        this.stacks.addChild(s);
      });
    }
  }

  private drawCases(q: Hungry) {
    const g = this.cases.clear();
    for (const b of q.suitcases) {
      const tl = onScreen({ x: b.x, y: b.y + b.h });
      const br = onScreen({ x: b.x + b.w, y: b.y });
      g.roundRect(tl.x, tl.y - 70, br.x - tl.x, br.y - tl.y + 70, 10).fill(0x6b4423).stroke({ width: 5, color: PALETTE.outline });
      g.roundRect((tl.x + br.x) / 2 - 22, tl.y - 86, 44, 18, 6).stroke({ width: 5, color: PALETTE.outline });
    }
  }

  /** The dessert trolley: two linen-covered shelves of cakes on brass posts, its handle at the back; spilled once it crashes. */
  private drawCart(q: Hungry) {
    const g = this.cart.clear();
    const c = q.cart;
    if (!c) return;
    const ink = { width: 4, color: PALETTE.outline };
    // Drawn about its own wheels at the origin, then placed: a trolley at the people's size, twice the shift's (R4 §2).
    for (const x of [-96, 96]) g.rect(x - 5, -150, 10, 132).fill(0xc9a24a).stroke({ width: 3, color: PALETTE.outline });
    g.moveTo(104, -146).lineTo(140, -196).stroke({ width: 9, color: 0xc9a24a, cap: "round" });
    g.moveTo(130, -200).lineTo(150, -192).stroke({ width: 12, color: 0x2a2f36, cap: "round" });
    for (const y of [-160, -78]) {
      g.roundRect(-112, y, 224, 16, 5).fill(0xf4f1ea).stroke(ink);
      g.rect(-108, y + 16, 216, 14).fill(0xe7e1d3).stroke({ width: 2, color: PALETTE.outline });
    }
    if (!c.crashed) {
      // A cake, a pie and a pudding on the top shelf; the lower one stacked with plates.
      g.roundRect(-90, -196, 56, 36, 6).fill(0xf5ecd2).stroke(ink);
      g.ellipse(-62, -196, 28, 9).fill(0xd8443c).stroke(ink);
      g.poly([-14, -160, 40, -160, 30, -184]).fill(0xc2643c).stroke(ink);
      g.roundRect(54, -190, 40, 30, 8).fill(0xf3e08a).stroke(ink);
      for (let i = 0; i < 4; i++) g.ellipse(-40 + i * 26, -84, 22, 6).fill(0xffffff).stroke({ width: 2, color: PALETTE.outline });
    }
    for (const x of [-88, 88]) {
      g.circle(x, -12, 14).fill(0x2a2f36).stroke({ width: 3, color: PALETTE.outline });
      g.circle(x, -12, 4).fill(0xc9a24a);
    }
    const at = floorOf(c);
    this.cart.position.set(at.x, at.y);
    this.cart.scale.set(BANQUET_SCALE);
    this.cart.rotation = c.crashed ? 0.35 : 0;
  }

  /** What is in the air: dishes flying home low over the cloth, and the paper. */
  private drawAir(q: Hungry) {
    this.air.removeChildren().forEach((c) => c.destroy());
    for (const f of q.flights) {
      const k = Math.min(1, f.t / HUNGRY.fly);
      const a = onScreen(f.from);
      const b = onScreen(SEATS[f.to].plate);
      const s = new Sprite(this.foodTexture(f.kind));
      s.anchor.set(0.5, 0.6);
      s.scale.set(drawWidth(f.kind, FOODS[f.kind].r) / s.texture.width);
      s.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - 90 * Math.sin(Math.PI * k));
      this.air.addChild(s);
    }
    const g = this.paper.clear();
    for (const p of q.planes) {
      if (p.wait > 0) continue;
      const at = onScreen(planeAt(p));
      // Head-high, flying toward him.
      const y = at.y - PAPER_UP;
      g.poly([at.x - 30, y, at.x + 26, y - 10, at.x + 26, y + 10]).fill(0xf4f3ee).stroke({ width: 3, color: PALETTE.outline });
    }
  }

  /** A rival: standing at their seat, diving with their hand on the line, or dazed. */
  private syncRival(r: Rival, time: number) {
    const d = this.diners.get(r.id);
    if (!d) return;
    const seat = SEATS[r.id];
    const stand = floorOf(seat.stand);
    const dive = r.dive;
    const facing: 1 | -1 = dive && Math.abs(dive.dir.x) > 0.05 ? (dive.dir.x > 0 ? 1 : -1) : seat.facing;
    const k = dive ? diveK(dive.ext) : 0;
    if (k > 0) {
      const pose = divePose(k, false);
      const hand = onScreen(handOf(r));
      const off = d.handOffset(pose, facing);
      const lying = { x: hand.x - off.x, y: hand.y - off.y };
      d.pose(pose, facing, { x: stand.x + (lying.x - stand.x) * k, y: stand.y + (lying.y - stand.y) * k }, r.stun > 0, time);
    } else d.pose(castPose({ role: "office", act: "idle", t: time, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 }), facing, stand, r.stun > 0 || r.frozen > 0, time, "planted");
    // Standing behind the far rim the table hides them below the waist; diving they lie on the cloth.
    d.container.zIndex = k > 0 ? Z.divers + d.container.y / 1e4 : seat.far ? Z.far : Z.ends;
  }

  private syncServer(q: Hungry, time: number) {
    const d = this.diners.get("server");
    if (!d) return;
    d.container.visible = q.server.away <= 0;
    if (!d.container.visible) return;
    const walking = q.server.wait <= 0;
    const pose = castPose({ role: "server", act: walking ? "walk" : "idle", t: time, speed: walking ? 140 : 0, onGround: true, sit: false, spin: 0, hits: 0 });
    // Walking toward his corner she faces left; back toward the right end, right.
    d.pose(pose, q.server.dir === 1 ? -1 : 1, floorOf(serverAt(q)), false, time, "planted");
    d.container.zIndex = Z.server;
  }

  /** Hammer at the left end: the hold, the coil, the dive along his line, the bonk, the duck, a flinch when slapped. */
  private syncHammer(q: Hungry, time: number) {
    const ch = this.hammer;
    if (!ch) return;
    const h = q.hammer;
    const stand = floorOf(SEATS.hammer.stand);
    const ctx = { t: time, speed: 0, vy: 0, facing: 1 as const };
    let pose: Pose = CLIPS.idle((time * 0.4) % 1, ctx);
    let k = 0;
    if (h.duck) pose = CLIPS.crouch(1, ctx);
    else if (h.stun > 0) pose = ACTIONS.hurt(Math.min(1, (HUNGRY.guard.stun - h.stun) * 1.4));
    else if (h.swing > 0) pose = overlay(pose, ACTIONS.swing(displayU("swing", 1 - h.swing / HUNGRY.swing)), "upper", 1);
    // The lecture: the shift's wagging finger over his stance at the table.
    else if (h.lecture > 0) pose = overlay(pose, ACTIONS.lecture(1 - h.lecture / HUNGRY.lecture.move), "upper", 1);
    else if (h.dive?.phase === "coil") pose = coilPose(h.dive.held / HUNGRY.charge);
    else if (h.dive) {
      k = diveK(h.dive.ext);
      pose = divePose(k);
    }
    const plate = this.registry.hammer.heads.neutral!;
    const solved = solve(pose, 1, HEAD_SCALE, plate);
    // He is drawn at twice his shift size here (R4 §2): every offset from his feet doubles with him.
    const S = BANQUET_SCALE;
    let feet = { x: stand.x, y: stand.y + S * groundShift(solved, k > 0 ? "none" : "planted") };
    if (k > 0) {
      const hand = onScreen(handOf(h));
      const j = solved.joints.handFar;
      const lying = { x: hand.x - S * j.x, y: hand.y - S * j.y };
      feet = { x: stand.x + (lying.x - stand.x) * k, y: stand.y + (lying.y - stand.y) * k };
    }
    const out = h.dive && (h.dive.phase === "out" || h.dive.phase === "hold");
    const expression = h.stun > 0 || this.hurtT > 0 ? "hurt" : out ? "chomp" : this.smugT > 0 || h.lecture > 0 ? "smug" : "neutral";
    ch.container.position.set(feet.x, feet.y);
    ch.container.scale.set(S);
    // Out over the cloth his shadow would lie on the cloth's drop: only standing does he throw one, on the floor.
    ch.shadow.visible = k === 0;
    ch.apply(solved, expression, (stand.y - feet.y) / S, 0xffffff);
    const fb = solved.faceBox;
    this.faceRect = { x: feet.x + S * fb.x, y: feet.y + S * fb.y, w: S * fb.w, h: S * fb.h };
    this.crownAt = { x: feet.x + S * solved.crown.x, y: feet.y + S * solved.crown.y };
  }

  destroy(): void {
    for (const d of this.diners.values()) d.destroy();
    if (!this.root.destroyed) this.root.destroy({ children: true });
    for (const t of this.drawn) t.destroy(true);
    for (const t of this.framed) t.destroy(false);
  }
}
