import type { Point } from "../../types";

/**
 * Fare Darts' route map (R5 design §2 to §4, expansion spec appendix C): a cartoon US in a rectangle 1080 by 600 px,
 * x east, y south, the origin at its top-left. The rules work here, wherever the board is drawn.
 */
export const MAP = { w: 1080, h: 600 } as const;

export type CityCode =
  | "SAT" | "DAL" | "HOU" | "AUS" | "OKC" | "DEN" | "SLC" | "LAS" | "PHX" | "LAX" | "OAK" | "SMF"
  | "SEA" | "MCI" | "STL" | "MDW" | "BNA" | "MSY" | "ATL" | "MCO" | "FLL" | "BWI" | "BOS";

/** Appendix C's cities, 0 to 1 across the map, in its order. */
export const CITY_UV: Record<CityCode, Point> = {
  SAT: { x: 0.457, y: 0.803 },
  DAL: { x: 0.486, y: 0.669 },
  HOU: { x: 0.511, y: 0.79 },
  AUS: { x: 0.47, y: 0.769 },
  OKC: { x: 0.474, y: 0.561 },
  DEN: { x: 0.345, y: 0.39 },
  SLC: { x: 0.226, y: 0.35 },
  LAS: { x: 0.17, y: 0.533 },
  PHX: { x: 0.223, y: 0.642 },
  LAX: { x: 0.117, y: 0.618 },
  OAK: { x: 0.047, y: 0.468 },
  SMF: { x: 0.061, y: 0.437 },
  SEA: { x: 0.046, y: 0.076 },
  MCI: { x: 0.524, y: 0.416 },
  STL: { x: 0.6, y: 0.435 },
  MDW: { x: 0.644, y: 0.305 },
  BNA: { x: 0.659, y: 0.534 },
  MSY: { x: 0.602, y: 0.782 },
  ATL: { x: 0.7, y: 0.63 },
  MCO: { x: 0.752, y: 0.838 },
  FLL: { x: 0.773, y: 0.935 },
  BWI: { x: 0.834, y: 0.408 },
  BOS: { x: 0.93, y: 0.286 },
};
export const CITY_CODES = Object.keys(CITY_UV) as CityCode[];
/** Home: the YOU ARE HERE sticker; never a tag. */
export const HOME: CityCode = "SAT";

/** A city on the map, px. */
export const cityAt = (c: CityCode): Point => ({ x: CITY_UV[c].x * MAP.w, y: CITY_UV[c].y * MAP.h });

/** Appendix C's cartoon silhouette, in order, 0 to 1. */
export const POLYGON_UV: readonly Point[] = (
  [
    [0.04, 0.07], [0.62, 0.07], [0.66, 0.18], [0.72, 0.12], [0.78, 0.2], [0.96, 0.1],
    [0.99, 0.2], [0.93, 0.33], [0.86, 0.4], [0.84, 0.5], [0.78, 0.62], [0.77, 0.75],
    [0.79, 0.9], [0.76, 0.99], [0.72, 0.92], [0.7, 0.8], [0.62, 0.8], [0.56, 0.86],
    [0.52, 0.83], [0.47, 0.92], [0.43, 0.99], [0.38, 0.86], [0.33, 0.8], [0.29, 0.74],
    [0.17, 0.68], [0.11, 0.68], [0.08, 0.62], [0.03, 0.5], [0.05, 0.3], [0.02, 0.18],
  ] as const
).map(([x, y]) => ({ x, y }));
export const polygon = (): Point[] => POLYGON_UV.map((p) => ({ x: p.x * MAP.w, y: p.y * MAP.h }));

export type FareClass = "wga" | "anytime" | "business";
/** A fare tag, or one of the two bonus tags he hates (R5 §6). */
export type TagKind = "fare" | "seating" | "fee";
/** Each tag's size on the map and its color: Southwest yellow, red and blue; ASSIGNED SEATING white, BAG FEE orange. */
export const TAGS: Record<FareClass | "seating" | "fee", { w: number; h: number; color: number }> = {
  wga: { w: 90, h: 50, color: 0xffbf27 },
  anytime: { w: 120, h: 60, color: 0xc8102e },
  business: { w: 150, h: 70, color: 0x304cb2 },
  seating: { w: 120, h: 60, color: 0xffffff },
  fee: { w: 120, h: 60, color: 0xf28c28 },
};
/** A scalpel's point within this of a tag's edge still books it (§12.2). */
export const PAD = 2;

/** Rounded up to end in 9: 48 to 49, 54 to 59, 221 to 229. */
export const endIn9 = (n: number) => Math.ceil((n + 1) / 10) * 10 - 1;
const clampFare = (n: number) => Math.max(49, Math.min(249, n));

/** A city's fare from San Antonio (R5 §4): 39 + its distance × 260, ending in 9, $49 to $249; a flash sale halves it. */
export function fareFor(c: CityCode, flash: boolean): number {
  const d = Math.hypot(CITY_UV[c].x - CITY_UV[HOME].x, CITY_UV[c].y - CITY_UV[HOME].y);
  const full = clampFare(endIn9(39 + Math.round(d * 260)));
  return flash ? clampFare(endIn9(Math.round(full / 2))) : full;
}

/** Hammer's old fare names, on purpose: Wanna Get Away under $100, Anytime to $199, Business Select from $200. */
export const classOf = (fare: number): FareClass => (fare < 100 ? "wga" : fare < 200 ? "anytime" : "business");

/** A booking's points by class: the cheap fares pay the most. */
export const pointsFor = (cls: FareClass, fare: number) => (cls === "wga" ? 300 + (100 - fare) * 2 : cls === "anytime" ? 150 : 60);
