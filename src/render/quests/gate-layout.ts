import { MAP } from "../../sim/quests/fares/board";
import { TRAVELERS, type Traveler } from "../../sim/quests/fares/fares";
import type { Point, Rect } from "../../sim/types";
import { fitFrame } from "./frame";

/** The route map's panel round its map: the header above, the frame's edges at the sides and below (R5 §2). */
export const BOARD = { w: 1180, h: 720, mapX: 50, mapY: 82 } as const;
/** How far above the floor the map's bottom edge hangs, in every layout: the gate agent's head and shoulders cover its lowest band. */
export const MAP_ABOVE_FLOOR = 150;
/** The people's boxes for the layout's checks: someone standing, up to their crown; someone seated, up to their head. */
export const PERSON = { stand: { w: 160, h: 330 }, seat: { w: 160, head: 225 } } as const;

/**
 * Where everything stands at the gate for a screen shape, world px, the floor at 0: `board` and `map` the top-left
 * corners of the panel and its map; `hammer`, `cart`, `printer`, `podium` and each traveler's x on their floor; the
 * seats' row and its floor (a front row below the board on an upright phone); `frame` what must be in view, and the
 * camera that fits it between the bars.
 */
export type GateLayout = {
  upright: boolean;
  board: Point;
  map: Point;
  ladder: Rect;
  floor: number;
  hammer: number;
  cart: number;
  printer: number;
  podium: number;
  seats: { x0: number; x1: number; floor: number };
  travelers: Record<Traveler, number>;
  frame: Rect;
  camera: { x: number; y: number; zoom: number };
};

const SEAT = 110;

/**
 * Wide screens: the travelers' seats, Hammer, his cart and the printer left to right toward the board, the podium under
 * its right end, the ladder beside it. Upright phones: the board across the top, the printer, Hammer and his cart under
 * its left end over the ocean, the podium under its right end, the travelers in a front row below. Nobody but the
 * crossing agent stands over a city or a tag (R5 §2).
 */
export function gateLayout(width: number, height: number, insets: { top: number; bottom: number }): GateLayout {
  const upright = width < height;
  const floor = 0;
  const map = { x: BOARD.mapX, y: floor - MAP_ABOVE_FLOOR - MAP.h };
  const board = { x: map.x - BOARD.mapX, y: map.y - BOARD.mapY };
  const ladder = { x: board.x + BOARD.w + 14, y: board.y, w: 74, h: BOARD.h };
  const podium = map.x + 1000 + (upright ? 40 : 0);
  const seats = upright ? { x0: 480, x1: 480 + 4 * SEAT, floor: floor + 300 } : { x0: -760, x1: -760 + 4 * SEAT, floor };
  const travelers = Object.fromEntries(TRAVELERS.map((t, i) => [t, seats.x0 + SEAT / 2 + i * SEAT])) as Record<Traveler, number>;
  const parts = upright ? { printer: 40, hammer: 190, cart: 335 } : { printer: 100, hammer: -230, cart: -60 };
  const frame = upright ? { x: -50, y: board.y - 48, w: 1350, h: seats.floor + 40 - (board.y - 48) } : { x: -800, y: board.y - 48, w: 2100, h: floor + 120 - (board.y - 48) };
  return { upright, board, map, ladder, floor, ...parts, podium, seats, travelers, frame, camera: fitFrame(frame, width, height, insets) };
}
