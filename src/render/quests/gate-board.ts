import { Container, Graphics, type BitmapText } from "pixi.js";
import { CITY_CODES, HOME, MAP, TAGS, cityAt, classOf, polygon, type CityCode } from "../../sim/quests/fares/board";
import type { FaresEvent } from "../../sim/quests/fares/events";
import { FARES, aimOf, crosshair, groupOf, tagRect, type Fares, type Tag } from "../../sim/quests/fares/fares";
import type { Solved } from "../../sim/rig/fk";
import type { Point, Rect } from "../../sim/types";
import { PALETTE } from "../palette";
import { label } from "../text";
import { BOARD } from "./gate-layout";

const NAVY = 0x1f2a5c;
const OCEAN = 0xa9d3ec;
const LAND = 0xf3e6c4;
const RED = 0xd8443c;
const GOLD = 0xf2c230;
const INK = PALETTE.outline;
/** Where a city's code sits from its dot, map px (its anchor's corner): Texas's four and the Bay's two set apart (R5 §2). */
const LABEL_AT: Partial<Record<CityCode, { x: number; y: number; ax: number; ay: number }>> = {
  SAT: { x: -12, y: 4, ax: 1, ay: 0 },
  AUS: { x: -12, y: -6, ax: 1, ay: 1 },
  HOU: { x: 12, y: -2, ax: 0, ay: 0.5 },
  DAL: { x: 12, y: -2, ax: 0, ay: 0.5 },
  SMF: { x: 10, y: -10, ax: 0, ay: 1 },
  OAK: { x: 10, y: 8, ax: 0, ay: 0 },
};
const LABEL_DEFAULT = { x: 0, y: 12, ax: 0.5, ay: 0 };
/** Each tag's face: its fill, its words' color, and what it says under the city's code. */
const TAG_FACE = {
  wga: { fill: TAGS.wga.color, ink: 0x1f2a5c },
  anytime: { fill: TAGS.anytime.color, ink: 0xffffff },
  business: { fill: TAGS.business.color, ink: 0xffffff },
  seating: { fill: TAGS.seating.color, ink: 0x1f2a5c },
  fee: { fill: TAGS.fee.color, ink: 0xffffff },
} as const;
/** The pass on the ladder, board px. */
const PASS = { w: 64, h: 38 } as const;
/** The trail behind the crosshair: the last 1.5 s of its figure (R5 §3). */
const TRAIL_SECONDS = 1.5;
const WOBBLE = 0.4;
const SHAKE = { px: 6, t: 0.25 } as const;
const FLY = 0.5;

type TagView = { c: Container; face: Graphics; x: Graphics; w: number; h: number };
type Flying = { c: Container; from: Point; t: number };
type Stuck = { at: Point; t: number };
type Lost = { at: Point; t: number };

/**
 * A scalpel drawn on its line: the steel handle from `butt` and the blade out to `tip`, the edge curving to its point.
 * Shared by the board's stuck and falling scalpels and the gate's hand, flight and tray.
 */
export function drawScalpel(g: Graphics, butt: Point, tip: Point, width = 7): void {
  const dx = tip.x - butt.x;
  const dy = tip.y - butt.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const at = (s: number, o: number) => [butt.x + ux * s * len + nx * o * width, butt.y + uy * s * len + ny * o * width];
  g.poly([...at(0, -0.5), ...at(0.66, -0.5), ...at(0.66, 0.5), ...at(0, 0.5)]).fill(0x8d969f).stroke({ width: 2, color: INK });
  g.poly([...at(0.64, -0.55), ...at(0.8, -0.75), ...at(1, 0), ...at(0.86, 0.4), ...at(0.64, 0.55)]).fill(0xe9edf0).stroke({ width: 2, color: INK });
  for (const s of [0.12, 0.24, 0.36]) g.moveTo(...(at(s, -0.4) as [number, number])).lineTo(...(at(s, 0.4) as [number, number])).stroke({ width: 1.5, color: 0x5d646b });
}

/** The scalpel in his fist at the gate: 30 rest units of handle behind the grip, 70 of blade ahead (as the rig's checks probe it). */
const SCALPEL = { back: 30, ahead: 70 } as const;
/** The scalpel in his fist in a solved pose, its butt and its tip, px from his feet: along his grip's line. */
export function scalpelInFist(s: Solved): [Point, Point] {
  const g = s.joints.grip;
  const m = s.joints.malletHead;
  const d = Math.hypot(m.x - g.x, m.y - g.y) || 1;
  const [ux, uy] = [(m.x - g.x) / d, (m.y - g.y) / d];
  return [
    { x: g.x - ux * SCALPEL.back * s.scale, y: g.y - uy * SCALPEL.back * s.scale },
    { x: g.x + ux * SCALPEL.ahead * s.scale, y: g.y + uy * SCALPEL.ahead * s.scale },
  ];
}

/**
 * The route map board at gate B7 (R5 §2 and §3): the panel and its header, the map, the cities, the tags, the storm
 * cloud, the cancelled X, the crosshair and its trail, the stuck scalpels, and the A-List ladder with his pass. The
 * rules work in the map's own px; this draws them wherever the layout hangs the board.
 */
export class RouteBoard {
  readonly root = new Container({ label: "route board" });
  private readonly panel = new Container({ label: "panel" });
  private readonly mapLayer = new Container({ label: "map" });
  private readonly tagLayer = new Container({ label: "tags" });
  private readonly cloud = new Graphics();
  private readonly cloudWord: BitmapText;
  private readonly marks = new Graphics();
  private readonly aim = new Graphics();
  private readonly ladder = new Container({ label: "ladder" });
  private readonly ladderBack = new Graphics();
  private readonly pass = new Container({ label: "pass" });
  private readonly passWord: BitmapText;
  private readonly flyLayer = new Container({ label: "flying tags" });
  private readonly tags = new Map<number, TagView>();
  private flying: Flying[] = [];
  private stuck: Stuck[] = [];
  private lost: Lost[] = [];
  private q: Fares | null = null;
  private board: Point = { x: 0, y: 0 };
  private ladderRect: Rect = { x: 0, y: 0, w: 74, h: BOARD.h };
  private printer: Point = { x: 0, y: 0 };
  private shownPosition: number = FARES.ladder.start;
  private lastSteady: number = FARES.steady.budget;
  private steadied = false;
  private shakeT = 0;
  private time = 0;

  constructor(parent: Container) {
    this.drawPanel();
    this.mapLayer.position.set(BOARD.mapX, BOARD.mapY);
    this.cloudWord = label("DELAYED", "comic", 40);
    this.cloudWord.anchor.set(0.5);
    // The cloud stays on the map, however it drifts.
    const cloudMask = new Graphics().rect(0, 0, MAP.w, MAP.h).fill(0xffffff);
    this.cloud.mask = cloudMask;
    this.mapLayer.addChild(this.tagLayer, cloudMask, this.cloud, this.cloudWord, this.marks, this.aim);
    this.passWord = label("C60", "display", 26);
    this.passWord.anchor.set(0.5);
    this.passWord.tint = 0x1f2a5c;
    const card = new Graphics().roundRect(0, 0, PASS.w, PASS.h, 6).fill(0xffffff).stroke({ width: 3, color: INK });
    card.rect(0, 0, 10, PASS.h).fill(0x304cb2);
    this.passWord.position.set(PASS.w / 2 + 4, PASS.h / 2);
    this.pass.addChild(card, this.passWord);
    this.ladder.addChild(this.ladderBack);
    ["A", "B", "C"].forEach((s, i) => {
      const t = label(s, "display", 52);
      t.tint = 0x1f2a5c;
      t.anchor.set(0.5);
      t.position.set(this.ladderRect.w / 2 - 6, ((i + 0.5) * BOARD.h) / 3);
      this.ladder.addChild(t);
    });
    this.ladder.addChild(this.pass);
    this.root.addChild(this.panel, this.mapLayer, this.ladder, this.flyLayer);
    parent.addChild(this.root);
  }

  /** The panel's top-left, the map's, the ladder's rect and the printer's slot, world px. */
  place(board: Point, map: Point, ladder: Rect, printer: Point): void {
    this.board = board;
    this.root.position.set(board.x, board.y);
    this.mapLayer.position.set(map.x - board.x, map.y - board.y);
    this.ladderRect = ladder;
    this.ladder.position.set(ladder.x - board.x, ladder.y - board.y);
    this.printer = printer;
    this.drawLadder(false);
  }

  /** A map point in world px. */
  toWorld(p: Point): Point {
    return { x: this.board.x + this.mapLayer.x + p.x, y: this.board.y + this.mapLayer.y + p.y };
  }

  /** The panel's rect, world px. */
  rect(): Rect {
    return { x: this.board.x, y: this.board.y, w: BOARD.w, h: BOARD.h };
  }

  /** Each live tag's rect and kind, world px: the checks aim at them. */
  tagsInWorld(): { city: CityCode; kind: Tag["kind"]; rect: Rect }[] {
    return (this.q?.tags ?? []).map((t) => {
      const r = tagRect(t);
      const p = this.toWorld(r);
      return { city: t.city, kind: t.kind, rect: { x: p.x, y: p.y, w: r.w, h: r.h } };
    });
  }

  /** A scalpel sticking: it wobbles where it landed (or the agent's clipboard knocks it down), the board shakes, a booked tag flies to the printer. */
  event(e: FaresEvent): void {
    if (e.type !== "fdStick") return;
    this.shakeT = SHAKE.t;
    if (e.outcome === "agent") this.lost.push({ at: e.at, t: 0 });
    else this.stuck.push({ at: e.at, t: 0 });
    if (e.outcome === "book" && e.tag !== null) {
      const v = this.tags.get(e.tag);
      if (v) {
        this.tags.delete(e.tag);
        this.tagLayer.removeChild(v.c);
        this.flyLayer.addChild(v.c);
        v.c.position.set(v.c.x + this.mapLayer.x, v.c.y + this.mapLayer.y);
        v.c.visible = true;
        this.flying.push({ c: v.c, from: { x: v.c.x, y: v.c.y }, t: 0 });
      }
    }
  }

  sync(q: Fares, dt: number, time: number): void {
    if (q !== this.q) this.reset(q);
    this.time = time;
    this.steadied = q.steady < this.lastSteady - 1e-6;
    this.lastSteady = q.steady;
    this.shakeT = Math.max(0, this.shakeT - dt);
    const k = this.shakeT / SHAKE.t;
    this.root.position.set(this.board.x + Math.sin(time * 90) * SHAKE.px * k, this.board.y + Math.cos(time * 77) * SHAKE.px * 0.5 * k);
    this.syncTags(q);
    this.drawCloud(q);
    this.drawMarks(dt);
    this.drawAim(q);
    this.syncFlying(dt);
    this.shownPosition += (q.position - this.shownPosition) * Math.min(1, dt * 8);
    if (Math.abs(q.position - this.shownPosition) < 0.05) this.shownPosition = q.position;
    this.drawLadder(q.preferred);
    const span = this.ladderRect.h - PASS.h - 8;
    this.pass.position.set((this.ladderRect.w - PASS.w) / 2 + 2, 4 + (this.shownPosition / FARES.ladder.start) * span);
    this.passWord.text = groupOf(Math.round(this.shownPosition));
  }

  private reset(q: Fares) {
    this.q = q;
    for (const v of this.tags.values()) v.c.destroy({ children: true });
    this.tags.clear();
    for (const f of this.flying) f.c.destroy({ children: true });
    this.flying = [];
    this.stuck = [];
    this.lost = [];
    this.shownPosition = q.position;
    this.lastSteady = q.steady;
  }

  private drawPanel() {
    const g = new Graphics();
    this.panel.addChild(g);
    g.roundRect(-8, 10, BOARD.w + 16, BOARD.h, 30).fill({ color: 0x000000, alpha: 0.25 });
    g.roundRect(0, 0, BOARD.w, BOARD.h, 28).fill(NAVY).stroke({ width: 6, color: INK });
    g.roundRect(BOARD.mapX - 6, BOARD.mapY - 6, MAP.w + 12, MAP.h + 12, 10).fill(0x14193a);
    const head = label("GATE B7 · SAN ANTONIO", "display", 50);
    head.position.set(BOARD.mapX + 6, 14);
    const ask = new Graphics().roundRect(BOARD.w - 300, 18, 250, 48, 10).fill(0xffbf27).stroke({ width: 3, color: INK });
    const askWord = label("WHERE TO, SIR?", "display", 32);
    askWord.tint = 0x1f2a5c;
    askWord.anchor.set(0.5);
    askWord.position.set(BOARD.w - 175, 42);
    const map = new Graphics();
    map.rect(0, 0, MAP.w, MAP.h).fill(OCEAN);
    for (let i = 1; i < 6; i++) map.moveTo(0, i * 100).lineTo(MAP.w, i * 100).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
    for (let i = 1; i < 11; i++) map.moveTo(i * 100, 0).lineTo(i * 100, MAP.h).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
    map.poly(polygon().flatMap((p) => [p.x, p.y])).fill(LAND).stroke({ width: 5, color: INK, join: "round" });
    const cities = new Container({ label: "cities" });
    for (const c of CITY_CODES) {
      const p = cityAt(c);
      map.circle(p.x, p.y, c === HOME ? 11 : 9).fill(c === HOME ? 0x304cb2 : RED).stroke({ width: 3, color: 0xffffff });
      map.circle(p.x, p.y, c === HOME ? 13 : 11).stroke({ width: 2, color: INK });
      const at = LABEL_AT[c] ?? LABEL_DEFAULT;
      const t = label(c, "display", 26);
      t.tint = 0x1f2a5c;
      t.anchor.set(at.ax, at.ay);
      t.position.set(p.x + at.x, p.y + at.y);
      cities.addChild(t);
    }
    // YOU ARE HERE on San Antonio: a yellow sticker below it with a star, clear of the Gulf's cities.
    const s = cityAt(HOME);
    const sticker = new Graphics();
    sticker.roundRect(s.x - 150, s.y + 36, 150, 34, 8).fill(0xffbf27).stroke({ width: 3, color: INK });
    sticker.star(s.x - 166, s.y + 52, 5, 20, 9).fill(0xffbf27).stroke({ width: 3, color: INK });
    const here = label("YOU ARE HERE", "display", 24);
    here.tint = 0x1f2a5c;
    here.anchor.set(0.5);
    here.position.set(s.x - 75, s.y + 53);
    this.mapLayer.addChild(map, cities, sticker, here);
    this.panel.addChild(head, ask, askWord);
  }

  /** The ladder: A, B and C each a third of the board's height, A at the top; gold while A-LIST PREFERRED. */
  private drawLadder(preferred: boolean) {
    const g = this.ladderBack.clear();
    const { w, h } = this.ladderRect;
    const third = h / 3;
    const pulse = preferred ? 0.5 + 0.5 * Math.sin(this.time * 8) : 0;
    const bands = [preferred ? GOLD : 0xffbf27, 0x8fb4e8, 0xd9d2c4];
    bands.forEach((c, i) => g.rect(0, i * third, w, third).fill(c));
    for (let i = 1; i < 12; i++) g.moveTo(w - 16, (i * h) / 12).lineTo(w, (i * h) / 12).stroke({ width: 2, color: INK, alpha: 0.6 });
    g.roundRect(0, 0, w, h, 8).stroke({ width: preferred ? 6 + 4 * pulse : 5, color: preferred ? GOLD : INK });
  }

  private makeTag(t: Tag): TagView {
    const kind = t.kind === "fare" ? classOf(t.fare) : t.kind;
    const size = TAGS[kind];
    const face = TAG_FACE[kind];
    const c = new Container({ label: `tag ${t.city}` });
    const g = new Graphics();
    g.roundRect(-size.w / 2 + 3, -size.h / 2 + 4, size.w, size.h, 8).fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(-size.w / 2, -size.h / 2, size.w, size.h, 8).fill(face.fill).stroke({ width: 3, color: INK });
    g.circle(-size.w / 2 + 9, 0, 4).fill(0xffffff).stroke({ width: 2, color: INK });
    const code = label(t.city, "display", Math.round(size.h * 0.34));
    const big = label(t.kind === "fare" ? `$${t.fare}` : t.kind === "seating" ? "ASSIGNED SEATING" : "BAG FEE", "display", t.kind === "fare" ? Math.round(size.h * 0.5) : 18);
    for (const [s, y] of [
      [code, -size.h * 0.22],
      [big, size.h * 0.16],
    ] as const) {
      s.tint = face.ink;
      s.anchor.set(0.5);
      s.position.set(4, y);
    }
    const x = new Graphics();
    x.moveTo(-size.w / 2 - 6, -size.h / 2 - 6).lineTo(size.w / 2 + 6, size.h / 2 + 6).stroke({ width: 10, color: RED, cap: "round" });
    x.moveTo(size.w / 2 + 6, -size.h / 2 - 6).lineTo(-size.w / 2 - 6, size.h / 2 + 6).stroke({ width: 10, color: RED, cap: "round" });
    c.addChild(g, code, big);
    // A flash sale: a red SALE flag on the tag's top corner, clear of its words.
    if (t.flash) {
      g.roundRect(size.w / 2 - 44, -size.h / 2 - 16, 50, 22, 6).fill(RED).stroke({ width: 2, color: INK });
      const sale = label("SALE", "display", 18);
      sale.anchor.set(0.5);
      sale.position.set(size.w / 2 - 19, -size.h / 2 - 5);
      c.addChild(sale);
    }
    c.addChild(x);
    return { c, face: g, x, w: size.w, h: size.h };
  }

  /** The live tags, centered on their cities, flickering through their last 0.6 s; a stopped tag under its red X. */
  private syncTags(q: Fares) {
    const live = new Set<number>();
    for (const t of q.tags) {
      live.add(t.id);
      let v = this.tags.get(t.id);
      if (!v) {
        v = this.makeTag(t);
        this.tags.set(t.id, v);
        this.tagLayer.addChild(v.c);
      }
      const p = cityAt(t.city);
      v.c.position.set(p.x, p.y);
      const left = t.life - t.t;
      v.c.visible = left > FARES.tags.flicker || Math.floor(left * 14) % 2 === 0;
      v.c.scale.set(t.t < 0.12 ? 0.6 + (0.4 * t.t) / 0.12 : 1);
      v.x.visible = t.stopped > 0;
    }
    for (const [id, v] of this.tags)
      if (!live.has(id)) {
        v.c.destroy({ children: true });
        this.tags.delete(id);
      }
  }

  /** A booked tag shrinking into the printer's slot. */
  private syncFlying(dt: number) {
    const to = { x: this.printer.x - this.board.x, y: this.printer.y - this.board.y };
    this.flying = this.flying.filter((f) => {
      f.t += dt;
      const k = Math.min(1, f.t / FLY);
      const e = k * k * (3 - 2 * k);
      f.c.position.set(f.from.x + (to.x - f.from.x) * e, f.from.y + (to.y - f.from.y) * e - 120 * Math.sin(Math.PI * k));
      f.c.scale.set(1 - 0.6 * e);
      f.c.rotation = 0.6 * e;
      if (k < 1) return true;
      f.c.destroy({ children: true });
      return false;
    });
  }

  /** The storm cloud over its third of the map, its rain and "DELAYED" (R5 §6). */
  private drawCloud(q: Fares) {
    const g = this.cloud.clear();
    const c = q.cloud;
    this.cloudWord.visible = !!c;
    if (!c) return;
    const a = Math.min(1, c.t / 0.3, (FARES.cloud.t - c.t) / 0.3);
    const third = MAP.w / 3;
    const x0 = c.third * third + Math.sin(c.t * 0.9) * 14;
    g.rect(x0, 0, third, MAP.h).fill({ color: 0x4a5560, alpha: 0.22 * a });
    for (let i = 0; i < 14; i++) {
      const x = x0 + 20 + ((i * 53) % (third - 30));
      const y = 210 + ((i * 97 + this.time * 520) % 360);
      g.moveTo(x, y).lineTo(x - 10, y + 34).stroke({ width: 4, color: 0x3a6fb0, alpha: 0.8 * a, cap: "round" });
    }
    const cx = x0 + third / 2;
    for (const [dx, dy, r] of [
      [-110, 150, 60],
      [-50, 110, 78],
      [40, 100, 86],
      [115, 140, 62],
      [0, 170, 70],
    ])
      g.circle(cx + dx, dy, r).fill({ color: 0x8a939b, alpha: a }).stroke({ width: 4, color: INK, alpha: a });
    g.rect(cx - 150, 150, 300, 60).fill({ color: 0x8a939b, alpha: a });
    this.cloudWord.position.set(cx, 150);
    this.cloudWord.alpha = a;
  }

  /** The stuck scalpels, each wobbling its first 0.4 s; one off the agent's clipboard falling away. */
  private drawMarks(dt: number) {
    const g = this.marks.clear();
    for (const s of this.stuck) {
      s.t += dt;
      const w = s.t < WOBBLE ? Math.sin(s.t * 48) * 0.18 * (1 - s.t / WOBBLE) : 0;
      // The handle stands out toward where it came from: up and to his side.
      const a = Math.atan2(-0.45, -1) + w;
      g.circle(s.at.x, s.at.y, 5).fill({ color: 0x000000, alpha: 0.4 });
      drawScalpel(g, { x: s.at.x + Math.cos(a) * 62, y: s.at.y + Math.sin(a) * 62 }, s.at, 8);
    }
    this.lost = this.lost.filter((l) => {
      l.t += dt;
      const x = l.at.x + 120 * l.t;
      const y = l.at.y - 160 * l.t + 900 * l.t * l.t;
      const a = l.t * 14;
      drawScalpel(g, { x: x - Math.cos(a) * 30, y: y - Math.sin(a) * 30 }, { x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30 }, 7);
      return l.t < 0.6;
    });
  }

  /** The crosshair: its trail of the last 1.5 s, a red ring (tighter while steadied) and cross, a small scalpel at its shoulder. */
  private drawAim(q: Fares) {
    const g = this.aim.clear();
    if (q.result || q.thrown >= FARES.throws) return;
    const at = aimOf(q);
    if (!q.pin) {
      const span = TRAIL_SECONDS * q.w * (this.steadied ? FARES.steady.factor : 1);
      const n = 36;
      let prev = crosshair(q.theta - span);
      for (let i = 1; i <= n; i++) {
        const p = crosshair(q.theta - span + (span * i) / n);
        g.moveTo(prev.x, prev.y).lineTo(p.x, p.y).stroke({ width: 4, color: RED, alpha: 0.05 + (0.4 * i) / n, cap: "round" });
        prev = p;
      }
    }
    const r = this.steadied ? 22 : 32;
    g.circle(at.x, at.y, r).stroke({ width: 9, color: 0xffffff, alpha: 0.7 });
    g.circle(at.x, at.y, r).stroke({ width: 5, color: RED });
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      g.moveTo(at.x + dx * (r - 12), at.y + dy * (r - 12))
        .lineTo(at.x + dx * (r + 14), at.y + dy * (r + 14))
        .stroke({ width: 4, color: RED, cap: "round" });
    }
    g.circle(at.x, at.y, 3).fill(RED);
    drawScalpel(g, { x: at.x + r + 34, y: at.y - r - 26 }, { x: at.x + r + 4, y: at.y - r + 2 }, 6);
  }

  destroy(): void {
    if (!this.root.destroyed) this.root.destroy({ children: true });
  }
}
