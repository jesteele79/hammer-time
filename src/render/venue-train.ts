import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ART_BASE, TRAIN_PIECES, type Piece, type Registry, type TrainPiece, type Wall } from "../art/registry";
import { conductorWall } from "../sim/conductor";
import type { Boss } from "../sim/boss";
import type { Level } from "../sim/level";
import type { Mover } from "../sim/movers";
import { INK, THIN } from "./ink";
import { PALETTE } from "./palette";
import { label } from "./text";

/** The station's and the coaches' materials, until the sheet is in. */
const C = { steel: "#8d939c", frame: "#5a6068", leaf: "#6c727a", glass: "#b8cdd6", wall: "#b8b8b4", seat: "#2d4a84", cloth: "#5d6b7d", tire: "#1d1d1f", amber: "#f2c14e", lamp: "#ff5a3c" } as const;
/** The train's doors on the platform, where station.py paints them, and how high their lamps stand. */
const PLATFORM_DOORS = [2450, 3050, 3850] as const;
const DOOR_LAMP_Y = -468;
const BEEP_LIT = 0.6;
/** The departure board's center is the level's; its top row and how far its text runs from the middle. */
const BOARD_ROW = { up: 86, half: 250, size: 26 } as const;
/** The clock when no wall says where: station.py's. */
const HALL_CLOCK: NonNullable<Wall["clock"]> = [480, 230, 84];
const HALL_K = 2000 / 1536;
/** How high the sheet's pieces stand, in game px. */
const HEIGHTS = { suitcase: 110, trolley: 170, barrier: 320, quiet: 190 } as const;

/** The train sheet's pieces, loaded: each with its registry entry. */
export type TrainPieces = Partial<Record<TrainPiece, { texture: Texture; piece: Piece }>>;

/** The sheet's pieces, or none while it is not in (the drawn stand-ins stand); one that fails is left out. */
export async function loadTrainPieces(registry: Registry): Promise<TrainPieces> {
  const listed = registry.train?.pieces;
  const out: TrainPieces = {};
  if (!listed) return out;
  await Promise.all(
    TRAIN_PIECES.map(async (name) => {
      const piece = listed[name];
      if (!piece) return;
      try {
        out[name] = { texture: await Assets.load<Texture>(ART_BASE + piece.file), piece };
      } catch (err) {
        console.warn(`train piece ${name}: the stand-in draws (${(err as Error).message})`);
      }
    }),
  );
  return out;
}

const standing = (art: NonNullable<TrainPieces[TrainPiece]>, height: number): Sprite => {
  const s = new Sprite(art.texture);
  s.anchor.set(art.piece.base.x / art.piece.width, art.piece.base.y / art.piece.height);
  s.scale.set(height / art.piece.height);
  return s;
};

function drawStroller(g: Graphics, w: number, h: number) {
  g.roundRect(-w / 2 + 12, -h + 34, w - 24, h - 54, 12).fill(C.cloth).roundRect(-w / 2 + 12, -h + 34, w - 24, h - 54, 12).stroke(INK);
  g.moveTo(-w / 2 + 14, -h + 40).arc(-w / 2 + 44, -h + 40, 30, Math.PI, 0).closePath().fill("#46525f").stroke(THIN);
  g.moveTo(w / 2 - 14, -h + 40).lineTo(w / 2 + 12, -h + 4).stroke(INK);
  for (const x of [-w / 2 + 26, w / 2 - 26]) g.circle(x, -13, 13).fill(C.tire);
}

function drawBicycle(g: Graphics, w: number) {
  const r = w * 0.19;
  const [back, front] = [-w / 2 + r, w / 2 - r];
  for (const x of [back, front]) g.circle(x, 0, r).stroke({ width: 5, color: C.tire });
  g.moveTo(back, 0).lineTo(-w * 0.08, -r * 1.05).lineTo(front - r * 0.5, -r * 1.05).lineTo(front, 0).stroke({ width: 5, color: "#a33a2a" });
  g.moveTo(-w * 0.08, -r * 1.05).lineTo(w * 0.02, 0).lineTo(back, 0).stroke({ width: 5, color: "#a33a2a" });
  g.moveTo(front - r * 0.5, -r * 1.05).lineTo(front - r * 0.7, -r * 1.5).stroke({ width: 5, color: C.tire });
}

function drawTrolley(g: Graphics, x: number) {
  g.rect(x - 60, -44, 120, 12).fill(C.steel).rect(x - 60, -44, 120, 12).stroke(THIN);
  g.moveTo(x + 50, -44).lineTo(x + 62, -170).stroke(INK);
  for (const wx of [x - 44, x + 40]) g.circle(wx, -11, 11).fill(C.tire);
}

function drawSuitcase(g: Graphics, x: number) {
  g.roundRect(x - 34, -92, 68, 84, 8).fill("#26395f").roundRect(x - 34, -92, 68, 84, 8).stroke(INK);
  g.moveTo(x + 18, -92).lineTo(x + 18, -130).lineTo(x - 18, -130).lineTo(x - 18, -92).stroke(THIN);
  for (const wx of [x - 22, x + 22]) g.circle(wx, -6, 6).fill(C.tire);
}

function drawQuiet(g: Graphics, x: number) {
  g.rect(x - 5, -110, 10, 110).fill(C.frame);
  g.circle(x, -140, 48).fill("#f4f1ea").circle(x, -140, 48).stroke(INK);
  g.circle(x - 18, -152, 5).fill(PALETTE.outline).circle(x + 18, -152, 5).fill(PALETTE.outline);
  g.moveTo(x - 20, -128).lineTo(x + 20, -128).stroke(INK);
  g.rect(x - 3, -152, 6, 36).fill("#d9a877").rect(x - 3, -152, 6, 36).stroke(THIN);
}

/** The mover's own drawing on the train: the stroller and the bike that swings, the sheet's where it is in. Null for any other. */
export function trainMover(m: Pick<Mover, "id" | "w" | "h">, pieces: TrainPieces): Container | null {
  const stroller = m.id === "stroller";
  if (!stroller && !m.id.startsWith("bike")) return null;
  const art = stroller ? pieces.stroller : pieces.bicycle;
  if (art) {
    const s = standing(art, stroller ? m.h * 1.1 : (m.w * art.piece.height) / art.piece.width);
    if (!stroller) s.anchor.set(0.5, 0.5);
    return s;
  }
  const g = new Graphics();
  if (stroller) drawStroller(g, m.w, m.h);
  else drawBicycle(g, m.w);
  return g;
}

/** The coaches and the station while their walls are not there: plain, with the platforms where he stands. */
export function drawTrainStandIn(g: Graphics, level: Level) {
  for (const r of level.rooms ?? []) g.rect(r.x0, -1400, r.x1 - r.x0, 1400).fill(r.x0 < 4000 ? "#a59277" : C.wall);
  for (const p of level.platforms) {
    if (p.kind === "bike") continue;
    const color = p.kind === "seat" ? C.seat : p.kind === "counter" ? "#6b4023" : C.steel;
    const h = p.kind === "rack" ? 10 : -p.y;
    g.rect(p.x0, p.y, p.x1 - p.x0, h).fill(color).rect(p.x0, p.y, p.x1 - p.x0, h).stroke(THIN);
  }
  const [cx, cy, r] = HALL_CLOCK;
  g.circle(cx * HALL_K, (cy - 768) * HALL_K, r * HALL_K).fill("#f4f1ea").circle(cx * HALL_K, (cy - 768) * HALL_K, r * HALL_K).stroke(INK);
  const b = level.board;
  if (b) g.rect(b.x - 280, b.y - 125, 560, 250).fill("#14161b");
}

/**
 * What the game stands in front of the train's painted walls: the frame of the connecting door at every seam, the barrier's
 * gate, the platform's trolleys and suitcase, the fixed bikes, the quiet car's sign. The sheet's pieces where they are in.
 */
export function drawTrain(level: Level, pieces: TrainPieces): Container {
  const root = new Container({ label: "train-dressing" });
  const g = new Graphics();
  root.addChild(g);
  for (const x of level.shakes ?? []) {
    g.rect(x - 34, -300, 12, 300).fill(C.frame).rect(x + 22, -300, 12, 300).fill(C.frame);
    g.rect(x - 34, -404, 68, 104).fill(C.leaf).rect(x - 34, -404, 68, 104).stroke(THIN);
    g.roundRect(x - 16, -384, 32, 56, 4).fill(C.glass).roundRect(x - 16, -384, 32, 56, 4).stroke(THIN);
  }
  for (const p of level.platforms) {
    if (p.kind !== "bike") continue;
    const w = p.x1 - p.x0;
    if (pieces.bicycle) {
      const s = standing(pieces.bicycle, (w * pieces.bicycle.piece.height) / pieces.bicycle.piece.width);
      s.anchor.set(0.5, 0);
      s.position.set(p.x0 + w / 2, p.y);
      root.addChild(s);
    } else {
      const bike = new Graphics();
      drawBicycle(bike, w);
      bike.position.set(p.x0 + w / 2, p.y + w * 0.22);
      root.addChild(bike);
    }
  }
  const dress = (name: "suitcase" | "trolley" | "quiet", x: number, stand: (at: number) => void) => {
    const art = pieces[name];
    if (!art) return stand(x);
    const s = standing(art, HEIGHTS[name]);
    s.position.set(x, 0);
    root.addChild(s);
  };
  dress("trolley", 2300, (x) => drawTrolley(g, x));
  dress("suitcase", 2720, (x) => drawSuitcase(g, x));
  dress("trolley", 3320, (x) => drawTrolley(g, x));
  if (level.quiet) dress("quiet", level.quiet.x0 + 70, (x) => drawQuiet(g, x));
  return root;
}

/** The hall's clock by the stretch's time left: two minutes a stretch of it, on to the 14:02. */
export function clockTime(stretch: number | null): string {
  const minutes = 14 * 60 + 2 - (stretch ?? 0) / 30;
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** The train's moving parts in the sim's world: his door, the barrier's paddles, the board's row, the clock's hands, the lamps. */
export class TrainView {
  readonly container = new Container({ label: "train" });
  private readonly g = new Graphics();
  private readonly hands = new Graphics();
  private readonly gate = new Graphics();
  private readonly row = new Container();
  private readonly platform = label("Voie 23", "display", BOARD_ROW.size);
  private built = false;
  private beepT = 0;

  constructor(parent: Container) {
    parent.addChild(this.container);
    this.container.addChild(this.gate, this.g, this.hands, this.row);
  }

  setVisible(on: boolean): void {
    this.container.visible = on;
  }

  /** The doors' beep: their lamps light. */
  beep(): void {
    this.beepT = BEEP_LIT;
  }

  private build(level: Level, pieces: TrainPieces) {
    this.built = true;
    const b = level.board;
    if (b) {
      const y = b.y - BOARD_ROW.up;
      const train = label("14:02 Basel SBB", "display", BOARD_ROW.size);
      train.anchor.set(0, 0.5);
      train.position.set(b.x - BOARD_ROW.half, y);
      train.tint = C.amber;
      this.platform.anchor.set(1, 0.5);
      this.platform.position.set(b.x + BOARD_ROW.half, y);
      this.platform.tint = C.amber;
      this.row.addChild(train, this.platform);
    }
    const pass = level.passes.find((p) => p.kind === "barrier");
    if (pass && pieces.barrier) {
      const s = standing(pieces.barrier, HEIGHTS.barrier);
      s.position.set(pass.x + pass.w / 2, 0);
      this.container.addChildAt(s, 0);
    }
  }

  /** `clock` is the hall's wall's, in its own px, or the stand-in's. */
  sync(level: Level, pieces: TrainPieces, hall: Wall | null, s: { stretch: number | null; heroX: number; boss: Boss | null }, dt: number): void {
    if (!this.built) this.build(level, pieces);
    this.beepT = Math.max(0, this.beepT - dt);
    const g = this.g.clear();
    // His door, shut while he holds it.
    const wall = s.boss?.kind === "conductor" ? conductorWall(s.boss) : null;
    if (wall) {
      g.rect(wall.x - 22, -404, 68, 404).fill(C.leaf).rect(wall.x - 22, -404, 68, 404).stroke(INK);
      g.roundRect(wall.x - 6, -330, 36, 110, 5).fill(C.glass).roundRect(wall.x - 6, -330, 36, 110, 5).stroke(THIN);
    }
    if (this.beepT > 0) for (const x of PLATFORM_DOORS) g.circle(x, DOOR_LAMP_Y, 16).fill(C.lamp).circle(x, DOOR_LAMP_Y, 26).fill({ color: C.lamp, alpha: 0.3 });
    // The barrier: its gate, the paddles shut until he is through.
    const pass = level.passes.find((p) => p.kind === "barrier");
    const gate = this.gate.clear();
    if (pass) {
      const through = s.heroX > pass.x + pass.w;
      const bottom = pass.y + pass.h;
      if (!pieces.barrier) {
        gate.rect(pass.x, bottom - 300, pass.w, 300).fill({ color: C.glass, alpha: 0.28 }).rect(pass.x, bottom - 300, pass.w, 300).stroke(THIN);
        for (const x of [pass.x - 10, pass.x + pass.w - 6]) gate.rect(x, bottom - 300, 16, 300 - bottom).fill(C.steel).rect(x, bottom - 300, 16, 300 - bottom).stroke(INK);
      }
      if (!through) gate.rect(pass.x, bottom - 76, pass.w, 76).fill({ color: "#e8eef0", alpha: 0.82 }).rect(pass.x, bottom - 76, pass.w, 76).stroke(THIN);
      gate.circle(pass.x + pass.w / 2, bottom - 100, 10).fill(through ? "#3fd46b" : C.lamp);
    }
    // The board's platform: blank until the light.
    const lit = level.board && s.stretch !== null && s.stretch <= level.board.lightAt;
    this.platform.visible = !!lit;
    this.row.visible = s.stretch !== null;
    this.drawHands(level, hall, s.stretch);
  }

  private drawHands(level: Level, hall: Wall | null, stretch: number | null) {
    const room = level.rooms?.[0];
    const hands = this.hands.clear();
    if (!room || stretch === null) return;
    const [cx, cy, r] = hall?.clock ?? HALL_CLOCK;
    const k = (room.x1 - room.x0) / (hall?.width ?? 1536);
    const x = room.x0 + cx * k;
    const y = (cy - (hall?.floor ?? 768)) * k;
    const minutes = 14 * 60 + 2 - stretch / 30;
    const hand = (turn: number, length: number, width: number) => {
      const a = turn * Math.PI * 2 - Math.PI / 2;
      hands.moveTo(x, y).lineTo(x + Math.cos(a) * length, y + Math.sin(a) * length).stroke({ width, color: PALETTE.outline });
    };
    hand((minutes % 720) / 720, r * k * 0.55, 8);
    hand((minutes % 60) / 60, r * k * 0.86, 5);
    hands.circle(x, y, 7).fill(PALETTE.outline);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
