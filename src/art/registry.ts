/** The registered game art written by `npm run art:sync` to public/art/registry.json. */
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Expression = "neutral" | "angry" | "hurt" | "smug" | "bored" | "chomp";
export type Costume = "affliction" | "scrubs" | "suit" | "banquet";
export type PartName =
  | "torso"
  | "hips"
  | "upperArmNear"
  | "forearmNear"
  | "upperArmFar"
  | "forearmFar"
  | "thighNear"
  | "shinNear"
  | "thighFar"
  | "shinFar";

export type HeadPlate = {
  file: string;
  width: number;
  height: number;
  /** Where the plate attaches to the body, in plate pixels. */
  neck: Point;
  crown: Point;
  /** Brow to chin, nose to cheek: nothing is ever drawn over it. */
  face: Rect;
};
/** A sliced body part; `pivot` is the joint it hangs from and `tip` the joint it reaches, in part pixels. */
export type BodyPart = { file: string; width: number; height: number; pivot: Point; tip: Point };
/** `span` is the collar-to-sole height of the body plate, in its pixels. */
export type Body = { parts: Partial<Record<PartName, BodyPart>>; span: number };
export type Prop = { file: string; width: number; height: number; pivot?: Point; tip?: Point };
export type Registry = {
  version: number;
  hammer: {
    heads: Partial<Record<Expression, HeadPlate>>;
    bodies: Partial<Record<Costume, Body>>;
    props: Record<string, Prop>;
    portrait: HeadPlate | null;
  };
  backdrops: Record<string, { far?: string }>;
};

export const ART_BASE = "/art/";
/** The face box used when a plate has none registered (fractions of the plate). */
export const HEAD_FACE_PROFILE = { x: 0, y: 0.36, w: 0.48, h: 0.46 };
/** The owner's profile plates are drawn facing left (spec §6.1); the game flips them to face right. */
export const HEAD_PLATE_FACING: 1 | -1 = -1;
/** The painted bodies face left too; the mallet plate's handle leans back for a right-facing carry. */
export const BODY_PLATE_FACING: 1 | -1 = -1;
export const MALLET_PLATE_FACING: 1 | -1 = 1;
/** The neutral plate as registered on 2026-10-10, for the solver when no registry is loaded. */
export const HEAD_PLATE_DEFAULT: HeadPlate = {
  file: "hammer/head-neutral.png",
  width: 932,
  height: 1283,
  neck: { x: 489, y: 1274 },
  crown: { x: 532, y: 8 },
  face: { x: 8, y: 385, w: 439, h: 667 },
};

export async function loadRegistry(): Promise<Registry> {
  const res = await fetch(`${ART_BASE}registry.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`art registry: ${res.status}`);
  return (await res.json()) as Registry;
}
