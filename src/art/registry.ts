/** The registered game art written by `npm run art:sync` to public/art/registry.json. */
import type { CastPerson } from "../sim/level";

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Expression = "neutral" | "angry" | "hurt" | "smug" | "bored" | "chomp";
export type Costume = "affliction" | "scrubs" | "suit" | "banquet";
export type HeadPlate = {
  file: string;
  width: number;
  height: number;
  /** Where the plate attaches to the body, in plate pixels. */
  neck: Point;
  crown: Point;
  /** Brow to chin, nose to cheek: nothing is ever drawn over it. */
  face: Rect;
  /** The nose tip: snot leaves from just ahead of it. */
  nose: Point;
  /** The stored file's size as a share of the plate's pixels, which every number above is in; 1 when missing. */
  scale?: number;
};
/** A painted body: its skinned layers and bones live in the rig file; `span` is its sole-to-neck height in crop pixels. */
export type Body = { rig: string; span: number };
export type Prop = {
  file: string;
  width: number;
  height: number;
  pivot?: Point;
  tip?: Point;
  /** A hat's width at its base, in its own pixels. */
  span?: number;
  /** The hat as worn: cut at its base, the strap left off (same top-left, so the same pivot). */
  worn?: string;
  /** The stored file's size as a share of the pixels `width`, `height`, `pivot` and `tip` are in; 1 when missing. */
  scale?: number;
};
/** A venue's painted wall, cropped at its seams: `floor` is the row where it meets the floor; `top` and `bottom` its top and bottom rows' colors, which carry it on above and below. */
export type Wall = { file: string; width: number; height: number; floor: number; top: string; bottom?: string };
/** A standing piece cut from a mid or fore sheet: `base` is where it stands, in its own px. */
export type Piece = { file: string; width: number; height: number; base: Point };
export type Registry = {
  version: number;
  hammer: {
    heads: Partial<Record<Expression, HeadPlate>>;
    bodies: Partial<Record<Costume, Body>>;
    props: Record<string, Prop>;
    portrait: HeadPlate | null;
  };
  /** The cast's paintings (R2b-2): each person's rig file, and each hat by name (the bellhops', the cook's). Missing from an older sync. */
  cast?: { bodies: Partial<Record<CastPerson, Body>>; hats: Record<string, Prop> };
  backdrops: Record<string, { far?: string }>;
  /** The venues' painted walls and standing pieces by name. Missing from an older sync. */
  walls?: Record<string, Wall>;
  pieces?: Record<string, Piece>;
};

export const ART_BASE = "/art/";
/** The face box used when a plate has none registered (fractions of the plate). */
export const HEAD_FACE_PROFILE = { x: 0, y: 0.36, w: 0.48, h: 0.46 };
/** The owner's profile plates are drawn facing left (spec §6.1); the game flips them to face right. */
export const HEAD_PLATE_FACING: 1 | -1 = -1;
/** The mallet plate's handle leans back for a right-facing carry. */
export const MALLET_PLATE_FACING: 1 | -1 = 1;
/** The neutral plate as registered on 2026-10-10, for the solver when no registry is loaded. */
export const HEAD_PLATE_DEFAULT: HeadPlate = {
  file: "hammer/head-neutral.webp",
  width: 934,
  height: 1285,
  neck: { x: 509, y: 1276 },
  crown: { x: 522, y: 8 },
  face: { x: 8, y: 386, w: 440, h: 668 },
  nose: { x: 8, y: 666 },
};

export async function loadRegistry(): Promise<Registry> {
  const res = await fetch(`${ART_BASE}registry.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`art registry: ${res.status}`);
  return (await res.json()) as Registry;
}
