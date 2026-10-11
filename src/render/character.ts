import { Assets, Container, Graphics, Mesh, MeshGeometry, Sprite, Texture } from "pixi.js";
import {
  ART_BASE,
  HEAD_PLATE_FACING,
  MALLET_PLATE_FACING,
  type Costume,
  type Expression,
  type HeadPlate,
  type Registry,
} from "../art/registry";
import { HERO_W } from "../sim/constants";
import type { Placement, Solved } from "../sim/rig/fk";
import { multiplyTint } from "./lighting";
import { LAYER_Z, layerFile, skinLayer, type LayerName, type RigFile, type RigLayer } from "./skin";
import { TOWEL, Towel, towelOverHead, towelTexture } from "./towel";

export type Character = {
  container: Container;
  shadow: Graphics;
  /** Resolves once the rig and every plate are loaded; `apply` draws nothing of the body before then. */
  ready: Promise<void>;
  /**
   * `ambient` tints the body, the mallet and the towel; the head plate is never tinted.
   * `towel` hangs the towel from the far hand (the wipe). While the hand is up at his head,
   * the hand and the towel are drawn over the head, rubbing it; never over the face box.
   */
  apply(solved: Solved, expression: Expression, heightAboveFloor: number, ambient?: number, towel?: boolean): void;
  /** The product of every tint from the head sprite up to the stage: 0xffffff when nothing colors it. */
  headTintChain(): number;
};

const SHADOW_RX = HERO_W * 0.55;
/** The far arm and leg sit a shade back so they read behind the near ones where they cross. */
const FAR_SHADE = 0xe2dad2;
const FAR_LAYERS = new Set<LayerName>(["armFar", "legFar"]);
const MIPMAPS = { autoGenerateMipmaps: true };
/** In front of the far arm that holds it, behind the legs, the torso, the near arm, the mallet and the head. */
const TOWEL_Z = 0.5;
/** Rubbing his head: the towel over the head plate, and the far hand over the towel. */
const TOWEL_OVER_Z = 7.4;
const HAND_OVER_Z = 7.5;
/** One turned towel texture per plate, shared by every character (the boards draw dozens). */
const towelTextures = new Map<string, Texture>();

/** The far arm's triangles that move mostly with the hand bone: the hand drawn over his head. */
function handTriangles(layer: RigLayer, rig: RigFile): Uint32Array {
  const bone = rig.bones.findIndex(([p, c]) => p === "wristFar" && c === "handFar");
  if (bone < 0 || !layer.indices) return new Uint32Array(0);
  const weightOf = (v: number) => {
    let w = 0;
    for (let k = 0; k < 4; k++) if (layer.bones[v * 4 + k] === bone) w += layer.weights[v * 4 + k];
    return w;
  };
  const out: number[] = [];
  const idx = layer.indices;
  for (let t = 0; t < idx.length; t += 3)
    if ((weightOf(idx[t]) + weightOf(idx[t + 1]) + weightOf(idx[t + 2])) / 3 > 0.5) out.push(idx[t], idx[t + 1], idx[t + 2]);
  return new Uint32Array(out);
}

let warned = false;
function fallback(message: string) {
  if (warned) return;
  warned = true;
  console.warn(`art fallback: ${message}`);
}

type Skinned = {
  name: LayerName;
  layer: RigLayer;
  mesh: Mesh;
  geometry: MeshGeometry;
  positions: Float32Array;
  /** The far hand alone, drawn over the head while it rubs it; it shares the layer's skinned positions. */
  hand?: { mesh: Mesh; geometry: MeshGeometry };
};

/**
 * The painted body as skinned meshes bent by the solved skeleton, the mallet in
 * the near fist (drawn between the torso and the near arm, so the fist closes
 * over the handle) and the head plate on top.
 */
export function createCharacter(registry: Registry, costume: Costume, opts: { noart?: boolean } = {}): Character {
  const bodies = registry.hammer.bodies;
  let body = opts.noart && costume !== "affliction" ? undefined : bodies[costume];
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

  const mallet = registry.hammer.props.mallet;
  const malletSprite = mallet?.pivot && mallet.tip ? new Sprite() : null;
  if (malletSprite && mallet?.pivot) {
    malletSprite.anchor.set(mallet.pivot.x / mallet.width, mallet.pivot.y / mallet.height);
    container.addChild(malletSprite);
  }
  const head = new Sprite();
  container.addChild(head);
  const towelPlate = registry.hammer.props.towel;
  let towel: Towel | null = null;

  let rig: RigFile | null = null;
  const skinned: Skinned[] = [];
  const textures = new Map<string, Texture>();
  const load = (file: string) =>
    Assets.load<Texture>({ src: ART_BASE + file, data: MIPMAPS }).then((t) => textures.set(file, t));

  const plates = Object.values(heads).filter((p): p is HeadPlate => !!p);
  const ready = (async () => {
    const res = await fetch(ART_BASE + body.rig, { cache: "no-cache" });
    if (!res.ok) throw new Error(`body rig ${body.rig}: ${res.status}`);
    rig = (await res.json()) as RigFile;
    const layers = rig.layers ?? {};
    await Promise.all([
      ...LAYER_Z.map((name) => layers[name]?.file && load(layers[name].file)),
      ...LAYER_Z.flatMap((name) => Object.values(layers[name]?.variants ?? {}).map(load)),
      ...plates.map((p) => load(p.file)),
      mallet ? load(mallet.file) : null,
      towelPlate ? load(towelPlate.file) : null,
    ]);
    const plate = towelPlate && textures.get(towelPlate.file);
    if (towelPlate && plate) {
      let turned = towelTextures.get(towelPlate.file);
      if (!turned) {
        turned = towelTexture(plate, TOWEL.width, (canvas) => Texture.from(canvas));
        towelTextures.set(towelPlate.file, turned);
      }
      towel = new Towel(turned);
      towel.holder.zIndex = TOWEL_Z;
      container.addChild(towel.holder);
    }
    LAYER_Z.forEach((name, z) => {
      const layer = layers[name];
      if (!layer?.file || !layer.indices) return;
      const n = layer.positions.length / 2;
      const uvs = new Float32Array(n * 2);
      for (let v = 0; v < n; v++) {
        uvs[v * 2] = (layer.positions[v * 2] - layer.x!) / layer.width!;
        uvs[v * 2 + 1] = (layer.positions[v * 2 + 1] - layer.y!) / layer.height!;
      }
      const positions = new Float32Array(n * 2);
      const geometry = new MeshGeometry({ positions, uvs, indices: new Uint32Array(layer.indices) });
      const texture = textures.get(layerFile(name, layer, -1) ?? "") ?? Texture.EMPTY;
      const mesh = new Mesh({ geometry, texture });
      mesh.zIndex = z;
      mesh.visible = false;
      container.addChild(mesh);
      const entry: Skinned = { name, layer, mesh, geometry, positions };
      if (name === "armFar") {
        const handIndices = handTriangles(layer, rig!);
        if (handIndices.length) {
          const handGeometry = new MeshGeometry({ positions, uvs, indices: handIndices });
          const handMesh = new Mesh({ geometry: handGeometry, texture });
          handMesh.zIndex = HAND_OVER_Z;
          handMesh.visible = false;
          container.addChild(handMesh);
          entry.hand = { mesh: handMesh, geometry: handGeometry };
        }
      }
      skinned.push(entry);
    });
    if (malletSprite && mallet) malletSprite.texture = textures.get(mallet.file) ?? Texture.EMPTY;
  })();

  let headPlate: HeadPlate = neutral;
  const placeProp = (
    sprite: Sprite,
    part: { pivot: { x: number; y: number }; tip: { x: number; y: number } },
    pl: Placement,
    facing: 1 | -1,
    plateFacing: 1 | -1,
    scale: number,
  ) => {
    // The plate's own lean from upright, in Pixi's clockwise radians; mirrored when flipped.
    const lean = Math.atan2(part.tip.x - part.pivot.x, -(part.tip.y - part.pivot.y));
    sprite.position.set(pl.x, pl.y);
    sprite.rotation = pl.rotation - lean * facing * plateFacing;
    sprite.scale.set(pl.scaleX * plateFacing * scale, pl.scaleY * scale);
    sprite.zIndex = pl.z;
  };

  return {
    container,
    shadow,
    ready,
    apply(solved, expression, heightAboveFloor, ambient = 0xffffff, holdTowel = false) {
      const over = holdTowel && towelOverHead(solved);
      if (rig) {
        for (const s of skinned) {
          skinLayer(s.positions, s.layer, rig, solved);
          s.geometry.getBuffer("aPosition").update();
          const texture = textures.get(layerFile(s.name, s.layer, solved.facing) ?? "");
          if (texture && s.mesh.texture !== texture) s.mesh.texture = texture;
          s.mesh.tint = FAR_LAYERS.has(s.name) ? multiplyTint(ambient, FAR_SHADE) : ambient;
          s.mesh.visible = true;
          if (s.hand) {
            s.hand.mesh.visible = over;
            if (over) {
              s.hand.geometry.getBuffer("aPosition").update();
              s.hand.mesh.tint = s.mesh.tint;
            }
          }
        }
      }
      if (malletSprite && mallet?.pivot && mallet.tip) {
        const pl = solved.parts.mallet;
        const len = Math.hypot(mallet.tip.x - mallet.pivot.x, mallet.tip.y - mallet.pivot.y);
        placeProp(malletSprite, { pivot: mallet.pivot, tip: mallet.tip }, pl, solved.facing, MALLET_PLATE_FACING, pl.length / len);
        malletSprite.tint = ambient;
      }
      if (towel) {
        towel.update(holdTowel ? solved : null);
        towel.holder.zIndex = over ? TOWEL_OVER_Z : TOWEL_Z;
        towel.tint = ambient;
      }
      const wanted = (opts.noart && expression !== "neutral" ? undefined : heads[expression]) ?? neutral;
      if (wanted !== headPlate || head.texture === Texture.EMPTY) {
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
