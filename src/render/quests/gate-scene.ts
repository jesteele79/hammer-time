import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { ART_BASE, type GatePiece, type Registry } from "../../art/registry";
import { HEAD_SCALE } from "../../sim/constants";
import type { CastPerson } from "../../sim/level";
import { THROW_CUT } from "../../sim/moves";
import type { CityCode, TagKind } from "../../sim/quests/fares/board";
import type { FaresEvent } from "../../sim/quests/fares/events";
import { FARES, TRAVELERS, agentBox, type Fares, type Traveler } from "../../sim/quests/fares/fares";
import { ACTIONS, displayU, gateHold, overlay } from "../../sim/rig/actions";
import { castPose, castReaction, REACTION_SECONDS, type Reaction } from "../../sim/rig/cast";
import { CLIPS } from "../../sim/rig/clips";
import { solve } from "../../sim/rig/fk";
import { groundShift } from "../../sim/rig/ground";
import type { Pose } from "../../sim/rig/pose";
import type { Point, Rect } from "../../sim/types";
import type { RenderApp } from "../app";
import { createCharacter, type Character } from "../character";
import { PALETTE } from "../palette";
import type { Scene } from "../scene";
import { TOWEL_OUT } from "../towel";
import { Diner } from "./diner";
import { RouteBoard, drawScalpel, scalpelInFist } from "./gate-board";
import type { GateLayout } from "./gate-layout";

/** Who sits at the gate in whose painting (R5 §1, decision 13). */
export const TRAVELER_PERSON: Record<Traveler, CastPerson> = { office: "office-1", student: "student-2", prof: "prof-1", nurse: "nurse" };
/** The gate's people for the speech bubbles: the banquet's are 901 to 904. */
export const GATE_ID: Record<Traveler | "agent", number> = { office: 911, student: 912, prof: 913, nurse: 914, agent: 915 };

const INK = PALETTE.outline;
const Z = { room: 0, planes: 2, roomFront: 4, board: 10, agent: 19, printer: 20, podium: 21, cross: 25, travelers: 30, seats: 31, cart: 40, hammer: 50, flight: 60, stanchions: 70 } as const;
/** The drawn gate's window band and the low wall under it, world px above the floor (R5 §2). */
const WIN = { top: -1500, bottom: -330, horizon: -470 } as const;
/** How far the room's edges are stretched, so any screen shape sees the room round the frame. */
const ROOM_EDGE = 6000;
/** Where the room painting's middle hangs: the wide frame's middle. */
const ROOM_MID = 250;
/** A plane taking off behind the glass: one every 6 to 10 s, 4.5 s across, climbing (R5 §2). */
const PLANE = { every: 8, jitter: 2, cross: 4.5, length: 520, climb: 800 } as const;
/** The seats' backs and where the seated rest their feet, world px above the seats' floor. */
const SEATS = { back: 150, pad: 14 } as const;
const KIOSK = { w: 150, h: 175, slot: 140 } as const;
const PODIUM = { w: 170, h: 200 } as const;
const CART = { w: 200, h: 165 } as const;
const STANCHION = { h: 110, front: 70 } as const;
/** The blend from the throw's end back to his stance. */
const FOLLOW = 0.25;

type Reacting = { kind: Reaction; t: number };

/**
 * Gate B7 (R5 §2): the room and the airfield behind its glass, the planes taking off, the route map board and the
 * ladder, the printer, the podium and the gate agent, the travelers in their seats, his cart and its tray, Hammer
 * throwing scalpels, the scalpel in flight, the stanchions. Painted where the owner's art is in, drawn where it is not.
 */
export class GateView {
  readonly root = new Container({ label: "gate" });
  private readonly room = new Container({ label: "room" });
  private readonly planes = new Container({ label: "planes" });
  private readonly planeMask = new Graphics();
  private readonly roomFront = new Graphics();
  private readonly boardLayer = new Container({ label: "board" });
  private readonly board: RouteBoard;
  private readonly printer = new Container({ label: "printer" });
  private readonly passes = new Graphics();
  private readonly podium = new Container({ label: "podium" });
  private readonly seats = new Container({ label: "seats" });
  private readonly cart = new Container({ label: "cart" });
  private readonly tray = new Graphics();
  private readonly flight = new Graphics();
  private readonly stanchions = new Container({ label: "stanchions" });
  private readonly clipboard = new Graphics();
  private readonly fist = new Graphics();
  private readonly travelers = new Map<Traveler, Diner>();
  private agent: Diner | null = null;
  private hammer: Character | null = null;
  private plane: Sprite | Graphics | null = null;
  private pieces: Partial<Record<GatePiece, Texture>> = {};
  private mallet: Texture | null = null;
  private windows: { top: number; bottom: number } = { top: WIN.top, bottom: WIN.bottom };
  /** Loaded textures it made frames of: let go without the textures themselves. */
  private readonly framed: Texture[] = [];
  private l: GateLayout | null = null;
  private layoutKey = "";
  private readonly reacting = new Map<Traveler, Reacting>();
  private moodNow: "smug" | "angry" | null = null;
  private moodT = 0;
  private followT = FOLLOW;
  private hadShot = false;
  private from: Point | null = null;
  private booked = 0;
  private printT = 1;
  private q: Fares | null = null;
  private faceRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  private crownAt: Point = { x: 0, y: 0 };
  private releaseAt: Point = { x: 0, y: 0 };

  constructor(
    _render: RenderApp,
    scene: Scene,
    private readonly registry: Registry,
    private readonly noart: boolean,
  ) {
    this.root.sortableChildren = true;
    this.root.visible = false;
    this.board = new RouteBoard(this.boardLayer);
    for (const [c, z] of [
      [this.room, Z.room],
      [this.planes, Z.planes],
      [this.roomFront, Z.roomFront],
      [this.boardLayer, Z.board],
      [this.printer, Z.printer],
      [this.podium, Z.podium],
      [this.seats, Z.seats],
      [this.cart, Z.cart],
      [this.flight, Z.flight],
      [this.stanchions, Z.stanchions],
      [this.clipboard, Z.cross + 1],
    ] as const) {
      c.zIndex = z;
      this.root.addChild(c);
    }
    this.planes.addChild(this.planeMask);
    this.planes.mask = this.planeMask;
    this.printer.addChild(this.passes);
    scene.layers.play.addChild(this.root);
  }

  /** The paintings (or their drawn stand-ins), the agent, the travelers and Hammer: loaded once. */
  async load(): Promise<void> {
    const g = this.noart ? undefined : this.registry.gate;
    await Promise.all([this.loadRoom(g), this.loadPlane(g), this.loadPieces(g)]);
    for (const t of TRAVELERS) this.travelers.set(t, new Diner(this.root, this.registry, TRAVELER_PERSON[t], null, this.noart, 1));
    this.agent = new Diner(this.root, this.registry, "gate-agent", null, this.noart, 1);
    await Promise.all([...this.travelers.values(), this.agent].map((d) => d.load()));
    for (const d of this.travelers.values()) d.container.zIndex = Z.travelers;
    this.hammer = createCharacter(this.registry, "affliction", { noart: this.noart });
    this.hammer.container.zIndex = Z.hammer;
    this.hammer.holdMallet(false);
    this.fist.zIndex = 3.5;
    this.hammer.container.addChild(this.fist);
    this.root.addChild(this.hammer.container);
    await this.hammer.ready;
    const mallet = this.registry.hammer.props.mallet;
    this.mallet = mallet ? await this.texture(mallet.file) : null;
    const plate = this.registry.hammer.heads.neutral!;
    this.releaseAt = scalpelInFist(solve(ACTIONS.throw(THROW_CUT[1]), 1, HEAD_SCALE, plate))[1];
    if (this.l) this.place(this.l);
  }

  private async texture(file: string): Promise<Texture | null> {
    try {
      return await Assets.load<Texture>(ART_BASE + file);
    } catch {
      return null;
    }
  }

  private async loadRoom(g: Registry["gate"]) {
    const room = g?.room;
    const tex = room ? await this.texture(room.file) : null;
    if (room && tex) {
      const k = -WIN.top / (room.floor - room.windows.top);
      const [W, H] = [tex.width, tex.height];
      const [x0, y0, w, h] = [ROOM_MID - (W * k) / 2, -room.floor * k, W * k, H * k];
      const E = ROOM_EDGE;
      const edge = (frame: Rectangle, x: number, y: number, sw: number, sh: number) => {
        const t = new Texture({ source: tex.source, frame });
        this.framed.push(t);
        const s = new Sprite(t);
        s.position.set(x, y);
        s.width = sw;
        s.height = sh;
        this.room.addChild(s);
      };
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
      this.windows = { top: -(room.floor - room.windows.top) * k, bottom: -(room.floor - room.windows.bottom) * k };
      this.planeMask.rect(-ROOM_EDGE, this.windows.top, 2 * ROOM_EDGE, this.windows.bottom - this.windows.top).fill(0xffffff);
      return;
    }
    this.drawRoom();
  }

  /** The drawn gate (the brainstorm's mockup): sky and airfield behind the glass, the window frames, the low wall, terrazzo. */
  private drawRoom() {
    const back = new Graphics();
    const parked = new Container({ label: "parked planes" });
    const E = ROOM_EDGE;
    back.rect(-E, WIN.top, 2 * E, WIN.horizon - WIN.top).fill(0x8ec9ef);
    back.rect(-E, WIN.top, 2 * E, 300).fill({ color: 0x6fb3e6, alpha: 0.6 });
    // A distant terminal on the horizon, then the tarmac with its taxi lines.
    for (let x = -2600; x < 3000; x += 900) back.rect(x, WIN.horizon - 90, 520, 90).fill(0xb9c2cb).stroke({ width: 3, color: 0x8a939b });
    back.rect(-E, WIN.horizon, 2 * E, WIN.bottom - WIN.horizon).fill(0x8f959b);
    for (let x = -3000; x < 3000; x += 260) back.rect(x, WIN.horizon + 70, 140, 8).fill(0xf2c230);
    // Planes parked at the jet bridges, nose in.
    for (const x of [-1300, -350, 1500, 2500]) {
      const p = this.drawnPlane(0.75);
      p.position.set(x, WIN.bottom - 70);
      parked.addChild(p);
    }
    this.room.addChild(back, parked);
    this.planeMask.rect(-E, WIN.top, 2 * E, WIN.bottom - WIN.top).fill(0xffffff);
    const f = this.roomFront;
    f.rect(-E, -E, 2 * E, E + WIN.top).fill(0x2b3038);
    f.rect(-E, WIN.top - 30, 2 * E, 30).fill(0x4a515a);
    for (let x = -4000; x <= 4000; x += 320) f.rect(x - 13, WIN.top, 26, WIN.bottom - WIN.top).fill(0x3a4048).stroke({ width: 2, color: INK, alpha: 0.5 });
    f.rect(-E, WIN.bottom, 2 * E, 30).fill(0x4a515a);
    f.rect(-E, WIN.bottom + 30, 2 * E, -WIN.bottom - 50).fill(0xd6d1c6);
    f.rect(-E, -20, 2 * E, 20).fill(0x5d646b);
    f.rect(-E, 0, 2 * E, E).fill(0xd9d4c8);
    // Terrazzo: flecks scattered on a fixed pattern.
    for (let i = 0; i < 900; i++) {
      const x = -3000 + ((i * 397) % 6000);
      const y = 8 + ((i * 131) % 700);
      f.circle(x, y, 2 + (i % 3)).fill(i % 4 === 0 ? 0x9aa3ad : i % 4 === 1 ? 0xb88a5a : 0xffffff);
    }
  }

  /** A Southwest-colored airliner in side view, nose to the right, about `k` of 520 px long; no text or logos. */
  private drawnPlane(k: number): Graphics {
    const g = new Graphics();
    const ink = { width: 3, color: INK };
    g.poly([-250, -20, -196, -20, -226, -118, -262, -118]).fill(0x304cb2).stroke(ink);
    g.poly([-238, -100, -224, -100, -212, -40, -236, -40]).fill(0xc8102e);
    g.roundRect(-260, -30, 520, 60, 30).fill(0x304cb2).stroke(ink);
    g.rect(-246, 2, 480, 8).fill(0xffbf27);
    g.rect(-246, 10, 470, 12).fill(0xc8102e);
    g.poly([230, -22, 252, -6, 226, -6]).fill(0x1b2440);
    for (let x = -180; x <= 200; x += 22) g.circle(x, -10, 5).fill(0xffffff);
    g.poly([-60, 14, 50, 14, -10, 58, -86, 58]).fill(0x24398a).stroke(ink);
    g.ellipse(-4, 42, 36, 14).fill(0xc9ced6).stroke(ink);
    g.scale.set(k);
    return g;
  }

  private async loadPlane(g: Registry["gate"]) {
    const p = g?.plane;
    const tex = p ? await this.texture(p.file) : null;
    if (tex) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(PLANE.length / tex.width);
      this.plane = s;
    } else this.plane = this.drawnPlane(PLANE.length / 520);
    this.planes.addChild(this.plane);
  }

  private async loadPieces(g: Registry["gate"]) {
    const pieces = g?.pieces ?? {};
    await Promise.all(
      (Object.keys(pieces) as GatePiece[]).map(async (k) => {
        const p = pieces[k];
        const tex = p ? await this.texture(p.file) : null;
        if (tex) this.pieces[k] = tex;
      }),
    );
  }

  /** A sheet piece standing on its base at `x`, `floor`, scaled to `w` wide; null when it is not painted. */
  private piece(k: GatePiece, x: number, floor: number, w: number): Sprite | null {
    const tex = this.pieces[k];
    const p = this.registry.gate?.pieces?.[k];
    if (!tex || !p) return null;
    const s = new Sprite(tex);
    s.anchor.set(p.base.x / p.width, p.base.y / p.height);
    s.scale.set(w / p.width);
    s.position.set(x, floor);
    return s;
  }

  /** How many of the gate's people are drawn from their paintings: the checks count the shift's painted figures apart from these. */
  paintedCount(): number {
    return [...this.travelers.values(), ...(this.agent ? [this.agent] : [])].filter((d) => d.isPainted).length;
  }

  setVisible(on: boolean): void {
    this.root.visible = on;
  }

  /** Where everything stands for this screen's shape: placed again only when the shape's layout changes. */
  layout(l: GateLayout): void {
    const key = JSON.stringify([l.board, l.ladder, l.hammer, l.cart, l.printer, l.podium, l.seats]);
    this.l = l;
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.place(l);
  }

  private place(l: GateLayout) {
    this.board.place(l.board, l.map, l.ladder, { x: l.printer, y: l.floor - KIOSK.slot });
    this.drawPrinter(l);
    this.drawPodium(l);
    this.drawSeats(l);
    this.drawCart(l);
    this.drawStanchions(l);
  }

  private clear(c: Container) {
    for (const k of c.removeChildren()) if (k !== this.passes && k !== this.tray) k.destroy({ children: true });
  }

  /** The boarding-pass kiosk: a screen, the slot, and the tray the passes slide into (R5 §4). */
  private drawPrinter(l: GateLayout) {
    this.clear(this.printer);
    const painted = this.piece("kiosk", l.printer, l.floor, KIOSK.w);
    if (painted) this.printer.addChild(painted);
    else {
      const g = new Graphics();
      const x = l.printer - KIOSK.w / 2;
      const y = l.floor - KIOSK.h;
      g.roundRect(x, y, KIOSK.w, KIOSK.h, 14).fill(0xc9ced6).stroke({ width: 4, color: INK });
      g.roundRect(x + 18, y + 14, KIOSK.w - 36, 52, 6).fill(0x1d2a52).stroke({ width: 3, color: INK });
      g.rect(x + 30, y + 30, 50, 6).fill(0xffbf27);
      g.rect(x + 24, l.floor - KIOSK.slot - 4, KIOSK.w - 48, 10).fill(0x2a2f36);
      g.poly([x + 8, l.floor - 70, x + KIOSK.w + 22, l.floor - 70, x + KIOSK.w + 10, l.floor - 46, x + 18, l.floor - 46]).fill(0x8a939b).stroke({ width: 3, color: INK });
      this.printer.addChild(g);
    }
    this.printer.addChild(this.passes);
  }

  /** The gate's podium, navy with the yellow and red stripes, its B7 sign; the agent stands behind it. */
  private drawPodium(l: GateLayout) {
    this.clear(this.podium);
    const painted = this.piece("podium", l.podium, l.floor, PODIUM.w);
    if (painted) {
      this.podium.addChild(painted);
      return;
    }
    const g = new Graphics();
    const x = l.podium - PODIUM.w / 2;
    const y = l.floor - PODIUM.h;
    g.rect(x - 10, y, PODIUM.w + 20, 18).fill(0xd6dbe0).stroke({ width: 4, color: INK });
    g.rect(x, y + 18, PODIUM.w, PODIUM.h - 18).fill(0x304cb2).stroke({ width: 4, color: INK });
    g.rect(x + 14, y + 52, PODIUM.w - 28, 12).fill(0xffbf27);
    g.rect(x + 14, y + 64, PODIUM.w - 28, 12).fill(0xc8102e);
    this.podium.addChild(g);
  }

  /** The row of four gate seats, seen from behind: their backs hide the travelers' legs (R5 §1, decision 13). */
  private drawSeats(l: GateLayout) {
    this.clear(this.seats);
    const { x0, x1, floor } = l.seats;
    const painted = this.piece("seats", (x0 + x1) / 2, floor, x1 - x0 + 2 * SEATS.pad);
    if (painted) {
      this.seats.addChild(painted);
      return;
    }
    const g = new Graphics();
    const ink = { width: 4, color: INK };
    for (let x = x0 + 30; x < x1; x += 2 * 110) g.rect(x - 6, floor - 24, 12, 24).fill(0x5d646b).stroke({ width: 3, color: INK });
    g.rect(x0 - SEATS.pad, floor - 36, x1 - x0 + 2 * SEATS.pad, 14).fill(0x5d646b).stroke(ink);
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * 110 + 4;
      g.roundRect(x, floor - SEATS.back, 102, SEATS.back - 30, 12).fill(0x2f3a4a).stroke(ink);
      g.roundRect(x + 10, floor - SEATS.back + 10, 82, 22, 8).fill({ color: 0xffffff, alpha: 0.12 });
    }
    this.seats.addChild(g);
  }

  /** His instrument cart: a stainless trolley, the sterile tray on top (drawn each frame with its scalpels), the mallet leaning on it. */
  private drawCart(l: GateLayout) {
    this.clear(this.cart);
    const painted = this.piece("cart", l.cart, l.floor, CART.w);
    const g = new Graphics();
    if (painted) this.cart.addChild(painted);
    else {
      const x = l.cart - CART.w / 2;
      const top = l.floor - CART.h;
      const steel = 0xb9c0c5;
      for (const px of [x + 12, x + CART.w - 12]) g.rect(px - 5, top, 10, CART.h - 22).fill(steel).stroke({ width: 3, color: INK });
      g.rect(x, top, CART.w, 14).fill(0xd6dbe0).stroke({ width: 4, color: INK });
      g.rect(x + 6, top + 86, CART.w - 12, 10).fill(0xd6dbe0).stroke({ width: 3, color: INK });
      for (const px of [x + 12, x + CART.w - 12]) g.circle(px, l.floor - 12, 12).fill(0x2a2f36).stroke({ width: 3, color: INK });
    }
    this.cart.addChild(g, this.tray);
    // The mallet leaning against the cart's front, its head on the top shelf, its handle down to the floor.
    const head = { x: l.cart + 46, y: l.floor - CART.h + 6 };
    if (this.mallet) {
      const m = new Sprite(this.mallet);
      const plate = this.registry.hammer.props.mallet!;
      m.anchor.set(0.5, 0.15);
      m.scale.set(-190 / plate.height, 190 / plate.height);
      m.position.set(head.x, head.y);
      m.rotation = 0.42;
      this.cart.addChild(m);
    } else {
      const d = new Graphics();
      d.moveTo(head.x, head.y).lineTo(head.x - 70, l.floor).stroke({ width: 10, color: 0x8a5a2c, cap: "round" });
      d.roundRect(head.x - 30, head.y - 30, 76, 44, 10).fill(0xa0703c).stroke({ width: 4, color: INK });
      this.cart.addChild(d);
    }
  }

  /** The stanchions and their belt across the foreground; on an upright phone the front row of seats is there instead. */
  private drawStanchions(l: GateLayout) {
    this.clear(this.stanchions);
    if (l.upright) return;
    const posts = [220, 560, 900];
    const y = l.floor + STANCHION.front;
    const g = new Graphics();
    for (let i = 0; i + 1 < posts.length; i++) {
      const [a, b] = [posts[i], posts[i + 1]];
      g.moveTo(a, y - STANCHION.h + 8)
        .quadraticCurveTo((a + b) / 2, y - STANCHION.h + 34, b, y - STANCHION.h + 8)
        .stroke({ width: 12, color: 0x304cb2 });
    }
    for (const x of posts) {
      const painted = this.piece("stanchion", x, y, 40);
      if (painted) {
        this.stanchions.addChild(painted);
        continue;
      }
      g.ellipse(x, y, 34, 10).fill(0x8a939b).stroke({ width: 3, color: INK });
      g.rect(x - 6, y - STANCHION.h, 12, STANCHION.h).fill(0xc9ced6).stroke({ width: 3, color: INK });
      g.circle(x, y - STANCHION.h, 10).fill(0xd6dbe0).stroke({ width: 3, color: INK });
    }
    this.stanchions.addChildAt(g, 0);
  }

  /** His face on screen as last drawn, world px: words, bubbles and cards keep off it. */
  face(): Rect {
    return this.faceRect;
  }
  crown(): Point {
    return this.crownAt;
  }
  crownOf(id: number): { x: number; y: number; facing: 1 | -1 } | null {
    if (id === GATE_ID.agent && this.agent) return { ...this.agent.crown, facing: -1 };
    for (const [t, d] of this.travelers) if (GATE_ID[t] === id) return { ...d.crown, facing: this.travelerFacing() };
    return null;
  }
  private travelerFacing(): 1 | -1 {
    const l = this.l;
    return l && l.hammer < l.seats.x0 ? -1 : 1;
  }

  /** A traveler's beat: leaning in with an ooh, a laugh, applause (R5 §7). */
  react(who: Traveler, kind: Reaction): void {
    this.reacting.set(who, { kind, t: 0 });
  }

  /** His face: smug through a streak (`seconds` 0 holds it until the next), angry after a miss with the steam. */
  mood(m: "smug" | "angry" | null, seconds: number): void {
    this.moodNow = m;
    this.moodT = seconds > 0 ? seconds : Infinity;
  }
  /** The steam puffs from his head while he is angry: the look's particles draw them. */
  steaming(): boolean {
    return this.moodNow === "angry" && this.moodT > 0;
  }

  /** The board's panel, world px. */
  boardOnScreen(): Rect {
    return this.board.rect();
  }
  tagsInWorld(): { city: CityCode; kind: TagKind; rect: Rect }[] {
    return this.board.tagsInWorld();
  }
  /** A map point in world px. */
  toWorld(p: Point): Point {
    return this.board.toWorld(p);
  }

  /** The round's events the board shows: a stick's wobble and shake, a booked tag flying off. */
  event(e: FaresEvent): void {
    this.board.event(e);
  }

  sync(q: Fares, dt: number, time: number): void {
    const l = this.l;
    if (!l) return;
    if (q !== this.q) {
      this.q = q;
      this.booked = q.bookings.length;
      this.reacting.clear();
      this.moodNow = null;
      this.followT = FOLLOW;
      this.hadShot = false;
    }
    this.moodT = Math.max(0, this.moodT - dt);
    if (this.moodT <= 0) this.moodNow = null;
    this.syncPlane(l, time);
    this.board.sync(q, dt, time);
    this.drawPasses(q, l, dt);
    this.syncAgent(q, l, time);
    this.syncTravelers(l, dt, time);
    this.drawTray(q, l);
    this.syncHammer(q, l, dt, time);
    this.drawFlight(q);
  }

  /** A plane taking off behind the glass now and then: left to right, climbing, masked to the windows. */
  private syncPlane(l: GateLayout, time: number) {
    const p = this.plane;
    if (!p) return;
    const n = Math.floor(time / PLANE.every);
    const hash = (Math.sin(n * 12.9898) * 43758.5453) % 1;
    const start = n * PLANE.every + Math.abs(hash) * PLANE.jitter;
    const k = (time - start) / PLANE.cross;
    p.visible = k >= 0 && k <= 1;
    if (!p.visible) return;
    const x0 = l.frame.x - PLANE.length;
    const x1 = l.frame.x + l.frame.w + PLANE.length;
    const ground = this.windows.bottom - 150;
    const e = k * k;
    p.position.set(x0 + (x1 - x0) * k, ground - PLANE.climb * e);
    p.rotation = -Math.atan2(2 * PLANE.climb * k, x1 - x0) * 0.9;
  }

  /** The passes in the printer's tray; a new booking's slides out of the slot (R5 §4). */
  private drawPasses(q: Fares, l: GateLayout, dt: number) {
    if (q.bookings.length > this.booked) this.printT = 0;
    this.booked = q.bookings.length;
    this.printT = Math.min(1, this.printT + dt / 0.4);
    const g = this.passes.clear();
    const n = q.bookings.length;
    if (!n) return;
    const pass = (x: number, y: number, rot: number) => {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const pt = (px: number, py: number) => [x + px * c - py * s, y + px * s + py * c];
      g.poly([...pt(-34, -12), ...pt(34, -12), ...pt(34, 12), ...pt(-34, 12)]).fill(0xffffff).stroke({ width: 2, color: INK });
      g.poly([...pt(-34, -12), ...pt(-24, -12), ...pt(-24, 12), ...pt(-34, 12)]).fill(0x304cb2);
    };
    const trayY = l.floor - 74;
    for (let i = 0; i < Math.min(n, 5) - (this.printT < 1 ? 1 : 0); i++) pass(l.printer + 10 + i * 3, trayY - i * 4, -0.08 + i * 0.04);
    if (this.printT < 1) {
      const k = this.printT;
      pass(l.printer + 10, l.floor - KIOSK.slot + 6 + (trayY - (l.floor - KIOSK.slot + 6)) * k * k, -0.3 * (1 - k));
    }
  }

  /** The gate agent behind her podium, or crossing in front of the board's lower right with her clipboard (R5 §6). */
  private syncAgent(q: Fares, l: GateLayout, time: number) {
    const d = this.agent;
    const cg = this.clipboard.clear();
    if (!d) return;
    const box = agentBox(q);
    if (!box || !q.agent) {
      d.pose(castPose({ role: "office", act: "idle", t: time, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 }), -1, { x: l.podium + 12, y: l.floor }, false, time, "planted");
      d.container.zIndex = Z.agent;
      return;
    }
    const u = Math.min(1, q.agent.t / FARES.agent.t);
    const out = u < 0.5;
    const x = Math.min(l.podium + 12, this.board.toWorld({ x: box.x + box.w / 2, y: 0 }).x);
    const pose = castPose({ role: "office", act: "walk", t: time, speed: 700, onGround: true, sit: false, spin: 0, hits: 0 });
    const facing: 1 | -1 = out ? -1 : 1;
    d.pose(pose, facing, { x, y: l.floor }, false, time, "planted");
    d.container.zIndex = Z.cross;
    const h = d.handOffset(pose, facing, "handNear");
    const hx = x + h.x;
    const hy = l.floor + h.y;
    cg.roundRect(hx - 30 + facing * 14, hy - 56, 60, 80, 6).fill(0x8a5a2c).stroke({ width: 3, color: INK });
    cg.rect(hx - 22 + facing * 14, hy - 46, 44, 62).fill(0xffffff);
    cg.rect(hx - 10 + facing * 14, hy - 62, 20, 12).fill(0x9aa3ad).stroke({ width: 2, color: INK });
  }

  /** The travelers seated behind the seat backs, minding their own business, with their beats. */
  private syncTravelers(l: GateLayout, dt: number, time: number) {
    const facing = this.travelerFacing();
    TRAVELERS.forEach((t, i) => {
      const d = this.travelers.get(t);
      if (!d) return;
      let pose: Pose = castPose({ role: t === "student" ? "student" : "office", act: "idle", t: time + i * 0.73, speed: 0, onGround: true, sit: true, spin: 0, hits: 0 });
      const r = this.reacting.get(t);
      if (r) {
        r.t += dt;
        if (r.t >= REACTION_SECONDS[r.kind]) this.reacting.delete(t);
        else pose = castReaction(pose, r.kind, r.t);
      }
      d.pose(pose, facing, { x: l.travelers[t], y: l.seats.floor - SEATS.pad }, false, time, "body");
    });
  }

  /** The sterile tray on his cart: ten slots, a scalpel in each one still to throw (the one in his fist apart). */
  private drawTray(q: Fares, l: GateLayout) {
    const g = this.tray.clear();
    const left = FARES.throws - q.thrown;
    const onTray = Math.max(0, left - (q.shot ? 0 : Math.min(1, left)));
    const x0 = l.cart - CART.w / 2 + 10;
    const y = l.floor - CART.h - 8;
    g.roundRect(x0 - 4, y - 14, CART.w - 12, 22, 4).fill(0x2f8f83).stroke({ width: 3, color: INK });
    for (let i = 0; i < FARES.throws; i++) {
      const x = x0 + 8 + i * ((CART.w - 30) / (FARES.throws - 1));
      if (i < onTray) drawScalpel(g, { x: x + 4, y: y - 2 }, { x: x - 6, y: y - 48 }, 6);
      else g.rect(x - 3, y - 8, 6, 10).fill(0x1d5c54);
    }
  }

  /** Hammer on his floor at the left, facing the board: his stance, the throw over it, the scalpel in his fist. */
  private syncHammer(q: Fares, l: GateLayout, dt: number, time: number) {
    const ch = this.hammer;
    if (!ch) return;
    const ctx = { t: time, speed: 0, vy: 0, facing: 1 as const };
    let pose: Pose = CLIPS.idle((time * 0.4) % 1, ctx);
    let towel = false;
    const s = q.shot;
    if (s) {
      this.hadShot = true;
      const u = s.phase === "windup" ? THROW_CUT[1] * Math.min(1, s.t / FARES.windup) : THROW_CUT[1] + (1 - THROW_CUT[1]) * Math.min(1, s.t / FARES.flight);
      pose = overlay(pose, ACTIONS.throw(displayU("throw", u)), "upper", 1);
    } else {
      if (this.hadShot) {
        this.hadShot = false;
        this.followT = 0;
      }
      // Toweling off (T): the shift's wipe, the towel in his free hand from its first beat to its last.
      const wipeU = q.wipe > 0 ? Math.min(1, 1 - q.wipe / FARES.towel.seconds) : null;
      if (wipeU !== null) towel = wipeU > TOWEL_OUT[0] && wipeU < TOWEL_OUT[1];
      this.followT = Math.min(FOLLOW, this.followT + dt);
      pose = gateHold(pose, wipeU, 1 - this.followT / FOLLOW);
    }
    const plate = this.registry.hammer.heads.neutral!;
    const solved = solve(pose, 1, HEAD_SCALE, plate);
    const feet = { x: l.hammer, y: l.floor + groundShift(solved, "planted") };
    const expression = this.moodNow ?? "neutral";
    ch.container.position.set(feet.x, feet.y);
    ch.container.scale.set(1);
    ch.apply(solved, expression, l.floor - feet.y, 0xffffff, towel);
    const left = FARES.throws - q.thrown;
    const holding = s ? s.phase === "windup" : left > 0 && !q.result;
    const f = this.fist.clear();
    if (holding) drawScalpel(f, ...scalpelInFist(solved), 7);
    const fb = solved.faceBox;
    this.faceRect = { x: feet.x + fb.x, y: feet.y + fb.y, w: fb.w, h: fb.h };
    this.crownAt = { x: feet.x + solved.crown.x, y: feet.y + solved.crown.y };
    this.from = { x: feet.x + this.releaseAt.x, y: feet.y + this.releaseAt.y };
  }

  /** The scalpel in flight: from his hand to where the crosshair was at the press, a slight arc, two spins, a trail. */
  private drawFlight(q: Fares) {
    const g = this.flight.clear();
    const s = q.shot;
    if (!s || s.phase !== "flight" || !this.from) return;
    const a = this.from;
    const b = this.board.toWorld(s.at);
    const at = (k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - 70 * Math.sin(Math.PI * k) });
    const k = Math.min(1, s.t / FARES.flight);
    const p = at(k);
    const ahead = at(Math.min(1, k + 0.02));
    const travel = Math.atan2(ahead.y - p.y, ahead.x - p.x);
    const rot = travel - 4 * Math.PI * (1 - k);
    for (let i = 1; i <= 5; i++) {
      const t = at(Math.max(0, k - i * 0.05));
      g.circle(t.x, t.y, 9 - i).fill({ color: 0xffffff, alpha: 0.45 - i * 0.08 });
    }
    const half = 50;
    drawScalpel(g, { x: p.x - Math.cos(rot) * half, y: p.y - Math.sin(rot) * half }, { x: p.x + Math.cos(rot) * half, y: p.y + Math.sin(rot) * half }, 7);
  }

  destroy(): void {
    for (const d of this.travelers.values()) d.destroy();
    this.agent?.destroy();
    this.board.destroy();
    if (!this.root.destroyed) this.root.destroy({ children: true });
    for (const t of this.framed) t.destroy(false);
  }
}
