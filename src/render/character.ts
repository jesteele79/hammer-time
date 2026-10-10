import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import {
  ART_BASE,
  BODY_PLATE_FACING,
  HEAD_PLATE_FACING,
  MALLET_PLATE_FACING,
  type Body,
  type BodyPart,
  type Costume,
  type Expression,
  type HeadPlate,
  type PartName,
  type Registry,
} from "../art/registry";
import { HERO_W } from "../sim/constants";
import type { Placement, Solved } from "../sim/rig/fk";
import { NECK_REST_Y } from "../sim/rig/skeleton";
import { multiplyTint } from "./lighting";
import { PALETTE } from "./palette";

export type Character = {
  container: Container;
  shadow: Graphics;
  /** Resolves once every plate is loaded; `apply` works before then with empty textures. */
  ready: Promise<void>;
  /** `ambient` tints the body parts and the mallet; the head plate is never tinted. */
  apply(solved: Solved, expression: Expression, facing: 1 | -1, heightAboveFloor: number, ambient?: number): void;
  /** The product of every tint from the head sprite up to the stage: 0xffffff when nothing colors it. */
  headTintChain(): number;
};

const PART_NAMES: PartName[] = [
  "upperArmFar",
  "forearmFar",
  "thighFar",
  "shinFar",
  "torso",
  "hips",
  "thighNear",
  "shinNear",
  "upperArmNear",
  "forearmNear",
];
// The far limbs are the near plates again, tinted: the painted far arm reaches and the far
// shoe sits a perspective step higher, neither of which a rig wants at rest.
const FAR_OF: Partial<Record<PartName, PartName>> = {
  upperArmFar: "upperArmNear",
  forearmFar: "forearmNear",
  thighFar: "thighNear",
  shinFar: "shinNear",
};
const SHADOW_RX = HERO_W * 0.55;
const FAR_TINT = parseInt(PALETTE.farLimb.slice(1), 16);

let warned = false;
function fallback(message: string) {
  if (warned) return;
  warned = true;
  console.warn(`art fallback: ${message}`);
}

/** One container of plate sprites placed by the solver, plus a blob shadow at the floor. */
export function createCharacter(registry: Registry, costume: Costume, opts: { noart?: boolean } = {}): Character {
  const bodies = registry.hammer.bodies;
  let body: Body | undefined = opts.noart && costume !== "affliction" ? undefined : bodies[costume];
  if (!body) {
    fallback(`no ${costume} body, wearing the Affliction shirt`);
    body = bodies.affliction;
  }
  if (!body) throw new Error("no body art registered; run art:sync");
  const heads = registry.hammer.heads;
  const neutral = heads.neutral;
  if (!neutral) throw new Error("no neutral head registered; run art:sync");

  const container = new Container({ label: "hammer" });
  container.sortableChildren = true;
  const shadow = new Graphics();
  shadow.zIndex = -1;
  container.addChild(shadow);

  const sprites = new Map<PartName, { sprite: Sprite; part: BodyPart }>();
  for (const name of PART_NAMES) {
    const source = FAR_OF[name] ?? name;
    const part = body.parts[source] ?? body.parts[name];
    if (!part) continue;
    const sprite = new Sprite();
    sprite.anchor.set(part.pivot.x / part.width, part.pivot.y / part.height);
    container.addChild(sprite);
    sprites.set(name, { sprite, part });
  }
  const mallet = registry.hammer.props.mallet;
  const malletSprite = mallet?.pivot && mallet.tip ? new Sprite() : null;
  if (malletSprite && mallet?.pivot) {
    malletSprite.anchor.set(mallet.pivot.x / mallet.width, mallet.pivot.y / mallet.height);
    container.addChild(malletSprite);
  }
  const head = new Sprite();
  container.addChild(head);

  const textures = new Map<string, Texture>();
  const files = new Set<string>();
  for (const { part } of sprites.values()) files.add(part.file);
  for (const plate of Object.values(heads)) if (plate) files.add(plate.file);
  if (mallet) files.add(mallet.file);
  const ready = Assets.load<Texture>([...files].map((f) => ART_BASE + f)).then((loaded) => {
    for (const f of files) textures.set(f, loaded[ART_BASE + f]);
    for (const { sprite, part } of sprites.values()) sprite.texture = textures.get(part.file) ?? Texture.EMPTY;
    if (malletSprite && mallet) malletSprite.texture = textures.get(mallet.file) ?? Texture.EMPTY;
  });

  let headPlate: HeadPlate = neutral;
  const placeLimb = (sprite: Sprite, part: { pivot: { x: number; y: number }; tip: { x: number; y: number } }, pl: Placement, facing: 1 | -1, plateFacing: 1 | -1, scale: number, upright: boolean) => {
    const dx = part.tip.x - part.pivot.x;
    const dy = part.tip.y - part.pivot.y;
    // The plate's own lean from its rest direction, in Pixi's clockwise radians; mirrored when flipped.
    const lean = upright ? Math.atan2(dx, -dy) : Math.atan2(-dx, dy);
    const flip = facing * plateFacing;
    sprite.position.set(pl.x, pl.y);
    sprite.rotation = pl.rotation - lean * flip;
    sprite.scale.set(pl.scaleX * plateFacing * scale, pl.scaleY * scale);
    sprite.zIndex = pl.z;
  };

  return {
    container,
    shadow,
    ready,
    apply(solved, expression, facing, heightAboveFloor, ambient = 0xffffff) {
      const K = solved.scale * (NECK_REST_Y / body.span);
      for (const [name, { sprite, part }] of sprites) {
        placeLimb(sprite, part, solved.parts[name], facing, BODY_PLATE_FACING, K, false);
        sprite.tint = FAR_OF[name] ? multiplyTint(ambient, FAR_TINT) : ambient;
      }
      if (malletSprite && mallet?.pivot && mallet.tip) {
        const pl = solved.parts.mallet;
        const len = Math.hypot(mallet.tip.x - mallet.pivot.x, mallet.tip.y - mallet.pivot.y);
        placeLimb(malletSprite, { pivot: mallet.pivot, tip: mallet.tip }, pl, facing, MALLET_PLATE_FACING, pl.length / len, true);
        malletSprite.tint = ambient;
      }
      const wanted = (opts.noart && expression !== "neutral" ? undefined : heads[expression]) ?? neutral;
      if (wanted !== headPlate || head.texture === Texture.EMPTY) {
        if (wanted === neutral && expression !== "neutral") fallback(`no ${expression} head, keeping neutral`);
        headPlate = wanted;
        head.texture = textures.get(wanted.file) ?? Texture.EMPTY;
        head.anchor.set(wanted.neck.x / wanted.width, wanted.neck.y / wanted.height);
      }
      const pl = solved.parts.head;
      const s = pl.length / headPlate.height;
      head.position.set(pl.x, pl.y);
      head.rotation = pl.rotation;
      head.scale.set(pl.scaleX * HEAD_PLATE_FACING * s, pl.scaleY * s);
      head.zIndex = pl.z;

      const k = Math.max(0.3, 1 - heightAboveFloor / 500);
      shadow.clear().ellipse(0, heightAboveFloor, SHADOW_RX * k, 16 * k).fill({ color: 0x000000, alpha: 0.35 });
    },
    headTintChain() {
      let chain = 0xffffff;
      for (let node: Container | null = head; node; node = node.parent) chain = multiplyTint(chain, node.tint);
      return chain;
    },
  };
}
