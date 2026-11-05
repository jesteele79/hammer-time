import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { ART_BASE, HEAD_PLATE_FACING } from "../../art/registry";
import type { Solved } from "../../sim/rig/fk";
import { taperHead } from "../cast-art";
import { plateGrid, type CastArt } from "../cast-body";
import { bodyScale, drawOrder, layerTexture, skinLayer, type RigLayer } from "../skin";

const loader = new TextureLoader();
/** The hall's pictures, one load each: mipmapped and flipped as the rig's own coordinates have them. */
const pictures = new Map<string, Promise<Texture>>();
export function picture(file: string): Promise<Texture> {
  let t = pictures.get(file);
  if (!t) {
    t = loader.loadAsync(ART_BASE + file).then((tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.flipY = false;
      tex.anisotropy = 8;
      tex.generateMipmaps = true;
      tex.minFilter = LinearMipmapLinearFilter;
      return tex;
    });
    pictures.set(file, t);
  }
  return t;
}

/** A painted layer's material: the painting's own light, never the set's. */
const painted = (map: Texture) => new MeshBasicMaterial({ map, transparent: true, side: DoubleSide, depthTest: false, depthWrite: false, toneMapped: false });

type Part = { name: string; layer: RigLayer; mesh: Mesh; flat: Float32Array; geometry: BufferGeometry };

/**
 * A rig's painting bent by its solved skeleton as flat meshes standing in the hall: the same skinning as the game's own
 * figures, at the painting's full size, so there is nothing to read back and nothing to atlas. World px in, feet at the
 * origin; the group's scale takes them to meters. Drawn after the set, in the order it is given, so the walls never clip him.
 */
export class Cutout {
  readonly group = new Group();
  private readonly parts: Part[] = [];
  private readonly head = new Group();
  private readonly headPositions: BufferAttribute;
  private readonly headGrid: ReturnType<typeof plateGrid>;
  private readonly headMesh: Mesh;
  private grown = 1;
  private readonly order: readonly string[];

  private constructor(
    private readonly art: CastArt,
    textures: Map<string, Texture>,
    recolor: string | null,
  ) {
    this.order = drawOrder(art.rig);
    for (const name of this.order) {
      if (name === "head") continue;
      const layer = art.rig.layers![name]!;
      const n = layer.positions.length / 2;
      const uv = new Float32Array(n * 2);
      for (let v = 0; v < n; v++) {
        uv[v * 2] = (layer.positions[v * 2] - layer.x!) / layer.width!;
        uv[v * 2 + 1] = (layer.positions[v * 2 + 1] - layer.y!) / layer.height!;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute("uv", new BufferAttribute(uv, 2));
      geometry.setIndex(new BufferAttribute(new Uint32Array(layer.indices!), 1));
      const mesh = new Mesh(geometry, painted(textures.get(layerTexture(layer, recolor))!));
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.parts.push({ name, layer, mesh, flat: new Float32Array(n * 2), geometry });
    }
    const plate = art.head;
    this.headGrid = plateGrid(plate.width, plate.height);
    const geometry = new BufferGeometry();
    this.headPositions = new BufferAttribute(new Float32Array((this.headGrid.verts.length / 2) * 3), 3);
    geometry.setAttribute("position", this.headPositions);
    geometry.setAttribute("uv", new BufferAttribute(this.headGrid.uvs, 2));
    geometry.setIndex(new BufferAttribute(this.headGrid.indices, 1));
    this.headMesh = new Mesh(geometry, painted(textures.get(layerTexture(plate, recolor))!));
    this.headMesh.frustumCulled = false;
    this.head.add(this.headMesh);
    this.group.add(this.head);
    this.taper(1);
  }

  /** Loads the pictures its layers and head draw with, then builds it. */
  static async make(art: CastArt, recolor: string | null = null): Promise<Cutout> {
    const files = new Set<string>([layerTexture(art.head, recolor)]);
    for (const name of drawOrder(art.rig)) if (name !== "head") files.add(layerTexture(art.rig.layers![name]!, recolor));
    const textures = new Map<string, Texture>();
    await Promise.all([...files].map(async (f) => textures.set(f, await picture(f))));
    return new Cutout(art, textures, recolor);
  }

  private taper(g: number) {
    const v = taperHead(this.headGrid.verts, this.art.head, g);
    for (let i = 0; i < v.length / 2; i++) this.headPositions.setXYZ(i, v[i * 2], v[i * 2 + 1], 0);
    this.headPositions.needsUpdate = true;
    this.grown = g;
  }

  /** The pose: every layer skinned, the head turned on the neck. */
  apply(solved: Solved) {
    const { art } = this;
    for (const p of this.parts) {
      skinLayer(p.flat, p.layer, art.rig, solved);
      const pos = p.geometry.getAttribute("position") as BufferAttribute;
      for (let v = 0; v < p.flat.length / 2; v++) pos.setXYZ(v, p.flat[v * 2], p.flat[v * 2 + 1], 0);
      pos.needsUpdate = true;
    }
    const plate = art.head;
    const pl = solved.parts.head;
    const own = bodyScale(solved, art.rig) / plate.scale;
    const g = pl.length / plate.height / own;
    if (Math.abs(g - this.grown) > 1e-4) this.taper(g);
    this.head.position.set(pl.x, pl.y, 0);
    this.head.rotation.z = pl.rotation;
    this.head.scale.set(pl.scaleX * HEAD_PLATE_FACING * own, pl.scaleY * own, 1);
  }

  /** A limb foreshortened about its joint, `at` in the group's own px: 1 as painted. */
  foreshorten(name: string, at: number, by: number) {
    const part = this.parts.find((p) => p.name === name);
    if (!part) return;
    part.mesh.scale.y = by;
    part.mesh.position.y = at * (1 - by);
  }

  /** Stands it in the hall: `k` meters a world px; three.js's y is up where the rig's is down. */
  place(lx: number, y: number, z: number, k: number) {
    this.group.position.set(lx, y, -z);
    this.group.scale.set(k, -k, 1);
  }

  /** Where it draws among the hall's people: `base` for the figure, and its layers in their own order above it. */
  setOrder(base: number) {
    for (const p of this.parts) p.mesh.renderOrder = base + this.order.indexOf(p.name);
    this.headMesh.renderOrder = base + this.order.indexOf("head");
  }

  setVisible(on: boolean) {
    this.group.visible = on;
  }

  destroy() {
    for (const p of this.parts) {
      p.geometry.dispose();
      (p.mesh.material as MeshBasicMaterial).dispose();
    }
    this.headMesh.geometry.dispose();
    (this.headMesh.material as MeshBasicMaterial).dispose();
    this.group.removeFromParent();
  }
}
