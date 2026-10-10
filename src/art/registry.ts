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
export type BodyPart = { file: string; width: number; height: number; pivot: Point; tip: Point };
export type Registry = {
  version: number;
  hammer: {
    heads: Partial<Record<Expression, HeadPlate>>;
    bodies: Partial<Record<Costume, { parts: Partial<Record<PartName, BodyPart>> }>>;
    props: Record<string, { file: string; width: number; height: number }>;
    portrait: HeadPlate | null;
  };
  backdrops: Record<string, { far?: string }>;
};

export const ART_BASE = "/art/";
/** The face box used when a plate has none registered (fractions of the plate). */
export const HEAD_FACE_PROFILE = { x: 0, y: 0.36, w: 0.48, h: 0.46 };

export async function loadRegistry(): Promise<Registry> {
  const res = await fetch(`${ART_BASE}registry.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`art registry: ${res.status}`);
  return (await res.json()) as Registry;
}
