import { Assets, Container, Graphics, MeshRope, Point, Sprite, Texture } from "pixi.js";
import {
  ART_BASE,
  BODY_PLATE_FACING,
  HEAD_PLATE_FACING,
  MALLET_PLATE_FACING,
  type Body,
  type Costume,
  type Expression,
  type HeadPlate,
  type Registry,
  type Strip,
  type StripName,
} from "../art/registry";
import { HERO_W } from "../sim/constants";
import type { Placement, Solved } from "../sim/rig/fk";
import { NECK_REST_Y, type JointName } from "../sim/rig/skeleton";
import { multiplyTint } from "./lighting";
import { PALETTE } from "./palette";

export type Character = {
  container: Container;
  shadow: Graphics;
  /** Resolves once every plate is loaded; `apply` works before then with empty textures. */
  ready: Promise<void>;
  /**
   * `solved` is the rig solved facing left (the plates' own facing); `facing`
   * mirrors the whole figure. `ambient` tints the body and the mallet; the
   * head plate is never tinted.
   */
  apply(solved: Solved, expression: Expression, facing: 1 | -1, heightAboveFloor: number, ambient?: number): void;
  /** The product of every tint from the head sprite up to the stage: 0xffffff when nothing colors it. */
  headTintChain(): number;
};

/** Each limb is one strip bent along its chain of joints; the far limbs reuse the near strips, shaded. */
const CHAINS: { strip: StripName; joints: JointName[]; far: boolean; z: number }[] = [
  { strip: "armNear", joints: ["shoulderFar", "elbowFar", "wristFar"], far: true, z: 0 },
  { strip: "legNear", joints: ["hipFar", "kneeFar", "ankleFar"], far: true, z: 1 },
  { strip: "torso", joints: ["neck", "chest", "pelvis"], far: false, z: 2 },
  { strip: "legNear", joints: ["hipNear", "kneeNear", "ankleNear"], far: false, z: 4 },
  { strip: "armNear", joints: ["shoulderNear", "elbowNear", "wristNear"], far: false, z: 5 },
];
const ROPE_POINTS = 28;
/** How much of each bone a joint's bend rounds off. */
const BEND = 0.28;
const SHADOW_RX = HERO_W * 0.55;
const FAR_TINT = parseInt(PALETTE.farLimb.slice(1), 16);
// The plates face left, so the figure is built facing left and mirrored to face right.
const BASE_FACING: 1 | -1 = -1;

let warned = false;
function fallback(message: string) {
  if (warned) return;
  warned = true;
  console.warn(`art fallback: ${message}`);
}

type Rope = { strip: Strip; joints: JointName[]; far: boolean; mesh: MeshRope; points: Point[] };

/** A figure of rope-bent limb strips, a hips plate, the mallet and the head plate, with a blob shadow. */
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

  const ropes: Rope[] = [];
  for (const chain of CHAINS) {
    const strip = body.strips[chain.strip];
    if (!strip) continue;
    const points = Array.from({ length: ROPE_POINTS }, (_, i) => new Point(i, 0));
    const mesh = new MeshRope({ texture: Texture.EMPTY, points });
    mesh.zIndex = chain.z;
    container.addChild(mesh);
    ropes.push({ strip, joints: chain.joints, far: chain.far, mesh, points });
  }
  const hipsPart = body.parts.hips;
  const hips = hipsPart ? new Sprite() : null;
  if (hips && hipsPart) {
    hips.anchor.set(hipsPart.pivot.x / hipsPart.width, hipsPart.pivot.y / hipsPart.height);
    container.addChild(hips);
  }
  // The same sleeve twice: over the near arm, and behind the body over the far arm's top.
  const sleevePart = body.parts.sleeveNear;
  const sleeves = sleevePart ? [new Sprite(), new Sprite()] : [];
  for (const s of sleeves) {
    s.anchor.set(sleevePart!.pivot.x / sleevePart!.width, sleevePart!.pivot.y / sleevePart!.height);
    container.addChild(s);
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
  for (const rope of ropes) files.add(rope.strip.file);
  if (hipsPart) files.add(hipsPart.file);
  if (sleevePart) files.add(sleevePart.file);
  for (const plate of Object.values(heads)) if (plate) files.add(plate.file);
  if (mallet) files.add(mallet.file);
  const ready = Assets.load<Texture>([...files].map((f) => ART_BASE + f)).then((loaded) => {
    for (const f of files) textures.set(f, loaded[ART_BASE + f]);
    for (const rope of ropes) rope.mesh.texture = textures.get(rope.strip.file) ?? Texture.EMPTY;
    if (hips && hipsPart) hips.texture = textures.get(hipsPart.file) ?? Texture.EMPTY;
    for (const s of sleeves) s.texture = textures.get(sleevePart!.file) ?? Texture.EMPTY;
    if (malletSprite && mallet) malletSprite.texture = textures.get(mallet.file) ?? Texture.EMPTY;
  });

  let headPlate: HeadPlate = neutral;
  const placePlate = (
    sprite: Sprite,
    part: { pivot: { x: number; y: number }; tip: { x: number; y: number } },
    pl: Placement,
    plateFacing: 1 | -1,
    scale: number,
    upright: boolean,
  ) => {
    const dx = part.tip.x - part.pivot.x;
    const dy = part.tip.y - part.pivot.y;
    // The plate's own lean from its rest direction, in Pixi's clockwise radians; mirrored when flipped.
    const lean = upright ? Math.atan2(dx, -dy) : Math.atan2(-dx, dy);
    const flip = BASE_FACING * plateFacing;
    sprite.position.set(pl.x, pl.y);
    sprite.rotation = pl.rotation - lean * flip;
    sprite.scale.set(pl.scaleX * plateFacing * scale, pl.scaleY * scale);
    sprite.zIndex = pl.z;
  };

  /** The rope's path in strip pixels: the chain with rounded bends, resampled evenly so the texture rides it. */
  const layRope = (rope: Rope, solved: Solved, K: number) => {
    const js = rope.joints.map((name) => ({ x: solved.joints[name].x / K, y: solved.joints[name].y / K }));
    const unit = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
    };
    // Along the strip, the first joint sits at joints[0], which is negative when the texture
    // starts below it (a thigh under the shorts). The chain runs past the end joints only as
    // far as the texture does, and the texture's own span is clipped out of the arc.
    let along = rope.strip.joints[0];
    for (let i = 1; i < js.length; i++) along += Math.hypot(js[i].x - js[i - 1].x, js[i].y - js[i - 1].y);
    const u0 = unit(js[1], js[0]);
    const u1 = unit(js[js.length - 2], js[js.length - 1]);
    const first = js[0];
    const last = js[js.length - 1];
    const headExt = Math.max(0, rope.strip.joints[0]);
    const tailExt = Math.max(0, rope.strip.width - along);
    const chain = [
      ...(headExt > 0 ? [{ x: first.x + u0.x * headExt, y: first.y + u0.y * headExt }] : []),
      ...js,
      ...(tailExt > 0 ? [{ x: last.x + u1.x * tailExt, y: last.y + u1.y * tailExt }] : []),
    ];
    // Round each interior joint: straight runs, then a quadratic arc through the joint.
    const dense: { x: number; y: number }[] = [chain[0]];
    for (let i = 1; i < chain.length - 1; i++) {
      const a = chain[i - 1];
      const j = chain[i];
      const b = chain[i + 1];
      const ra = i === 1 ? Math.min(BEND, 0.5) : BEND;
      const rb = i === chain.length - 2 ? Math.min(BEND, 0.5) : BEND;
      const p = { x: j.x + (a.x - j.x) * ra, y: j.y + (a.y - j.y) * ra };
      const q = { x: j.x + (b.x - j.x) * rb, y: j.y + (b.y - j.y) * rb };
      dense.push(p);
      for (let s = 1; s < 8; s++) {
        const t = s / 8;
        const k = 1 - t;
        dense.push({
          x: k * k * p.x + 2 * k * t * j.x + t * t * q.x,
          y: k * k * p.y + 2 * k * t * j.y + t * t * q.y,
        });
      }
      dense.push(q);
    }
    dense.push(chain[chain.length - 1]);
    const cum = [0];
    for (let i = 1; i < dense.length; i++)
      cum.push(cum[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
    const total = cum[cum.length - 1];
    const sStart = Math.min(total, Math.max(0, -rope.strip.joints[0]));
    const sEnd = Math.min(total, sStart + rope.strip.width);
    let seg = 0;
    for (let i = 0; i < ROPE_POINTS; i++) {
      const target = sStart + ((sEnd - sStart) * i) / (ROPE_POINTS - 1);
      while (seg < dense.length - 2 && cum[seg + 1] < target) seg++;
      const span = cum[seg + 1] - cum[seg] || 1;
      const t = Math.min(1, Math.max(0, (target - cum[seg]) / span));
      rope.points[i].set(
        dense[seg].x + (dense[seg + 1].x - dense[seg].x) * t,
        dense[seg].y + (dense[seg + 1].y - dense[seg].y) * t,
      );
    }
  };

  return {
    container,
    shadow,
    ready,
    apply(solved, expression, facing, heightAboveFloor, ambient = 0xffffff) {
      const K = solved.scale * (NECK_REST_Y / body.span);
      container.scale.x = facing * BASE_FACING;
      for (const rope of ropes) {
        layRope(rope, solved, K);
        rope.mesh.scale.set(K);
        rope.mesh.tint = rope.far ? multiplyTint(ambient, FAR_TINT) : ambient;
      }
      if (hips && hipsPart) {
        placePlate(hips, hipsPart, solved.parts.hips, BODY_PLATE_FACING, K, false);
        hips.tint = ambient;
      }
      sleeves.forEach((s, i) => {
        // As painted, turning only with the chest.
        const pl = solved.parts[i === 0 ? "sleeveNear" : "sleeveFar"];
        s.position.set(pl.x, pl.y);
        s.rotation = pl.rotation;
        s.scale.set(pl.scaleX * BODY_PLATE_FACING * K, pl.scaleY * K);
        s.zIndex = pl.z;
        s.tint = i === 0 ? ambient : multiplyTint(ambient, FAR_TINT);
      });
      if (malletSprite && mallet?.pivot && mallet.tip) {
        const pl = solved.parts.mallet;
        const len = Math.hypot(mallet.tip.x - mallet.pivot.x, mallet.tip.y - mallet.pivot.y);
        placePlate(malletSprite, { pivot: mallet.pivot, tip: mallet.tip }, pl, MALLET_PLATE_FACING, pl.length / len, true);
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
