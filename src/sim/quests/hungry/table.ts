import type { Point } from "../../types";

/**
 * The round banquet table (R4 design §2): its top a circle seen from above at an angle, squashed on screen to an oval
 * 1500 by 555, the owner's painted table's own proportion. Table coordinates: x to the right, y toward the far side,
 * the middle at 0, 0, world px.
 */
export const TABLE = {
  r: 750,
  /** Screen px down per table px toward the camera: the painted top's depth for its width (0.368, measured). */
  squash: 0.37,
  /** How far below the top the floor is drawn under any point of it: the painted cloth's drop at a 1500-wide top. */
  height: 370,
} as const;

/** Everyone at the banquet is drawn this many times their shift size, so the tabletop reaches their belly (owner, R4 §1). */
export const BANQUET_SCALE = 2;

export type EaterId = "hammer" | "student" | "bellhop" | "nurse";
export const RIVALS = ["student", "bellhop", "nurse"] as const;
export type RivalId = (typeof RIVALS)[number];
/** Where an eater stands (the table point over their feet), their plate, the way they face on screen, and whether the table hides them below the waist. */
export type Seat = { stand: Point; plate: Point; facing: 1 | -1; far: boolean };

/** R4 §2's table: Hammer at the left end, the student and the bellhop behind the far rim, the nurse at the right end. */
export const SEATS: Record<EaterId, Seat> = {
  hammer: { stand: { x: -860, y: 0 }, plate: { x: -590, y: 0 }, facing: 1, far: false },
  student: { stand: { x: -330, y: 790 }, plate: { x: -230, y: 400 }, facing: 1, far: true },
  bellhop: { stand: { x: 330, y: 790 }, plate: { x: 230, y: 400 }, facing: -1, far: true },
  nurse: { stand: { x: 860, y: 0 }, plate: { x: 570, y: 0 }, facing: -1, far: false },
};

export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** A point of the table top on screen (world px, y down). */
export const onScreen = (p: Point): Point => ({ x: p.x, y: -p.y * TABLE.squash });
/** The floor under a point of (or beside) the table, on screen: the feet of someone standing there. */
export const floorOf = (p: Point): Point => ({ x: p.x, y: -p.y * TABLE.squash + TABLE.height });

const DEG = Math.PI / 180;
/** The unit direction on the table top that looks `deg` degrees up from `facing` on screen. */
export function dirOf(facing: 1 | -1, deg: number): Point {
  const x = facing * Math.cos(deg * DEG);
  const y = Math.sin(deg * DEG) / TABLE.squash;
  const n = Math.hypot(x, y);
  return { x: x / n, y: y / n };
}
/**
 * A point of the table top (an offset `v` from a line's start) against a line along `dir`, as the eye sees them: how far
 * along the line, in the line's own table px (so it compares with a dive's reach), and how far beside it in screen px.
 * The hands and the dishes are drawn upright on the squashed cloth, so whether one passes over the other is a matter of
 * the screen, not of the table's depth (owner, 2026-10-17: he looked to grab air).
 */
export function onLine(v: Point, dir: Point): { along: number; off: number } {
  const sx = dir.x;
  const sy = dir.y * TABLE.squash;
  const len2 = sx * sx + sy * sy;
  const vx = v.x;
  const vy = v.y * TABLE.squash;
  return { along: (vx * sx + vy * sy) / len2, off: Math.abs(vx * sy - vy * sx) / Math.sqrt(len2) };
}
/** How many degrees up from `facing` a table-top direction looks on screen. */
export const screenDeg = (facing: 1 | -1, d: Point) => Math.atan2(d.y * TABLE.squash, d.x * facing) / DEG;
