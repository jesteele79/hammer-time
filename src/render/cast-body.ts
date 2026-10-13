import { Assets, Container, Mesh, MeshGeometry, Sprite, Texture } from "pixi.js";
import { ART_BASE, HEAD_PLATE_FACING, type Prop, type Registry } from "../art/registry";
import type { CastPerson } from "../sim/level";
import type { Solved } from "../sim/rig/fk";
import type { Skeleton } from "../sim/rig/skeleton";
import { RIM, castSkeleton, growAbove, taperHead } from "./cast-art";
import { LAYER_Z, bodyScale, layerTexture, skinLayer, type CastHead, type LayerName, type RigFile, type RigLayer } from "./skin";

/** One person's painting, loaded once and shared by everyone who wears it. */
export type CastArt = {
  person: CastPerson;
  rig: RigFile;
  skeleton: Skeleton;
  head: CastHead;
  textures: Map<string, Texture>;
  /** The hat their cut seats (the bellhops' or the cook's), worn (cut at its base) and whole (to fly off). */
  hat: { worn: Texture; whole: Texture; plate: Prop } | null;
};
export type PaintOpts = { recolor: string | null; dazed: boolean; hat: boolean; silhouette: boolean };
/** The rim light on a member: which side, how strong, and how far the edge peeks out in the figure's own px. */
export type Rim = { side: 1 | -1; k: number; px: number };

const MIPMAPS = { autoGenerateMipmaps: true };
/**
 * The far arm a shade back, as on Hammer. Not the far leg: a cast member's trousers run from the torso's layer into
 * the legs', and a tint starting at that cut showed as a seam across the thigh (Hammer's far leg is bare skin).
 */
const FAR_SHADE = 0xe2dad2;
const FAR_LAYERS = new Set<LayerName>(["armFar"]);
/** The head between the near leg and the torso: the collar covers where its neck runs on, however it turns. */
const HEAD_Z = 2.5;
/** On the projector's sheet every part is this dark. */
const SIL = 0x14110f;

/** Every texture a rig names. */
function filesOf(rig: RigFile): string[] {
  const files = new Set<string>();
  const add = (p: { file?: string; sil?: string; silly?: string; recolors?: Record<string, string> }) => {
    for (const f of [p.file, p.sil, p.silly, ...Object.values(p.recolors ?? {})]) if (f) files.add(f);
  };
  for (const name of LAYER_Z) add(rig.layers?.[name] ?? {});
  if (rig.head) add(rig.head);
  return [...files];
}

const loads = new Map<string, Promise<CastArt | null>>();

/** A person's rig and textures, or null when their painting is not registered or does not load: the stand-in draws them. */
export function loadCastArt(registry: Registry, person: CastPerson): Promise<CastArt | null> {
  const body = registry.cast?.bodies[person];
  if (!body) return Promise.resolve(null);
  let load = loads.get(body.rig);
  if (!load) {
    load = (async () => {
      try {
        const res = await fetch(ART_BASE + body.rig, { cache: "no-cache" });
        if (!res.ok) throw new Error(`${res.status}`);
        const rig = (await res.json()) as RigFile;
        if (!rig.head || !LAYER_Z.every((n) => rig.layers?.[n]?.file)) throw new Error("no head, or a layer missing");
        const textures = new Map<string, Texture>();
        await Promise.all(filesOf(rig).map((f) => Assets.load<Texture>({ src: ART_BASE + f, data: MIPMAPS }).then((t) => textures.set(f, t))));
        const plate = rig.head.hat ? registry.cast?.hats?.[rig.head.hat.name ?? "bellhop"] : undefined;
        let hat: CastArt["hat"] = null;
        // The hat on its own: one that does not load leaves them painted and bareheaded.
        if (rig.head.hat && plate?.span && plate.pivot)
          try {
            const [worn, whole] = await Promise.all([plate.worn ?? plate.file, plate.file].map((f) => Assets.load<Texture>({ src: ART_BASE + f, data: MIPMAPS })));
            hat = { worn, whole, plate };
          } catch (err) {
            console.warn(`cast art: ${person} goes bareheaded (${plate.file}: ${(err as Error).message})`);
          }
        return { person, rig, skeleton: castSkeleton(rig), head: rig.head, textures, hat };
      } catch (err) {
        console.warn(`cast art fallback: ${person} draws as the stand-in (${body.rig}: ${(err as Error).message})`);
        return null;
      }
    })();
    loads.set(body.rig, load);
  }
  return load;
}

type Part = { name: LayerName; layer: RigLayer; mesh: Mesh; geometry: MeshGeometry; positions: Float32Array };

/** A grid over a head plate, `cell` plate px square, with its UVs: what the head's taper bends. */
function plateGrid(w: number, h: number, cell = 8) {
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const verts: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) {
      const x = Math.min(w, c * cell);
      const y = Math.min(h, r * cell);
      verts.push(x, y);
      uvs.push(x / w, y / h);
    }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const d = a + cols + 1;
      indices.push(a, a + 1, d + 1, a, d + 1, d);
    }
  return { verts: new Float32Array(verts), uvs: new Float32Array(uvs), indices: new Uint32Array(indices) };
}

/**
 * One cast member's painting: five skinned layers bent by their skeleton, and their head plate turned on the neck,
 * grown above the jaw to the size the owner picked while the neck keeps fitting the collar.
 */
export class PaintedFigure {
  /** How many figures are alive: the checks see that none is kept after its cast member is gone. */
  static live = 0;
  readonly container = new Container({ label: "painted" });
  protected readonly parts: Part[] = [];
  protected readonly head = new Container({ label: "head" });
  protected readonly headMesh: Mesh;
  /** A warm copy of the whole figure, behind it: only the edge it peeks out by shows. */
  protected readonly rim = new Container({ label: "rim" });
  protected readonly rimHead = new Container({ label: "rim-head" });
  private readonly headGrid: ReturnType<typeof plateGrid>;
  private readonly headPositions: Float32Array;
  private readonly headGeometry: MeshGeometry;
  /** The growth the head's positions were last tapered for: built at 1, as painted. */
  private grown = 1;
  /** The bellhops' hat, riding on the head: it turns, flips and grows with it. */
  protected readonly hat: Sprite | null = null;

  constructor(protected readonly art: CastArt) {
    PaintedFigure.live++;
    this.container.sortableChildren = true;
    this.rim.zIndex = -1;
    this.rim.visible = false;
    this.container.addChild(this.rim);
    LAYER_Z.forEach((name, z) => {
      const layer = art.rig.layers![name]!;
      const n = layer.positions.length / 2;
      const uvs = new Float32Array(n * 2);
      for (let v = 0; v < n; v++) {
        uvs[v * 2] = (layer.positions[v * 2] - layer.x!) / layer.width!;
        uvs[v * 2 + 1] = (layer.positions[v * 2 + 1] - layer.y!) / layer.height!;
      }
      const positions = new Float32Array(n * 2);
      const geometry = new MeshGeometry({ positions, uvs, indices: new Uint32Array(layer.indices!) });
      const mesh = new Mesh({ geometry, texture: art.textures.get(layer.file!) ?? Texture.EMPTY });
      mesh.zIndex = z;
      this.container.addChild(mesh);
      const edge = new Mesh({ geometry, texture: art.textures.get(layer.sil ?? "") ?? Texture.EMPTY });
      edge.tint = RIM.color;
      this.rim.addChild(edge);
      this.parts.push({ name, layer, mesh, geometry, positions });
    });
    const plate = art.head;
    this.headGrid = plateGrid(plate.width, plate.height);
    this.headPositions = taperHead(this.headGrid.verts, plate, 1);
    this.headGeometry = new MeshGeometry({ positions: this.headPositions, uvs: this.headGrid.uvs, indices: this.headGrid.indices });
    this.headMesh = new Mesh({ geometry: this.headGeometry, texture: art.textures.get(plate.file) ?? Texture.EMPTY });
    this.head.zIndex = HEAD_Z;
    this.head.addChild(this.headMesh);
    if (art.hat && plate.hat) {
      const { worn, plate: hp } = art.hat;
      this.hat = new Sprite(worn);
      this.hat.anchor.set(hp.pivot!.x / worn.width, hp.pivot!.y / worn.height);
      this.head.addChild(this.hat);
    }
    this.container.addChild(this.head);
    const edgeHead = new Mesh({ geometry: this.headGeometry, texture: art.textures.get(plate.sil) ?? Texture.EMPTY });
    edgeHead.tint = RIM.color;
    this.rimHead.addChild(edgeHead);
    this.rim.addChild(this.rimHead);
  }

  /** Lets go of the figure and its meshes' buffers: a Mesh does not destroy the geometry it draws. */
  destroy(): void {
    PaintedFigure.live--;
    for (const p of this.parts) p.geometry.destroy();
    this.headGeometry.destroy();
    // A board's snapshot may have destroyed the container along with its board already.
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }

  apply(solved: Solved, o: PaintOpts, rim: Rim | null = null): void {
    const { art } = this;
    for (const p of this.parts) {
      skinLayer(p.positions, p.layer, art.rig, solved);
      p.geometry.getBuffer("aPosition").update();
      p.mesh.texture = art.textures.get(layerTexture(p.layer, o.recolor)) ?? p.mesh.texture;
      p.mesh.tint = o.silhouette ? SIL : FAR_LAYERS.has(p.name) ? FAR_SHADE : 0xffffff;
    }
    const plate = art.head;
    const pl = solved.parts.head;
    // The solve sizes the head whole; the plate is drawn at the body's own scale and grown above the jaw by the difference.
    const own = bodyScale(solved, art.rig) / plate.scale;
    const g = pl.length / plate.height / own;
    if (Math.abs(g - this.grown) > 1e-4) {
      this.grown = g;
      this.headPositions.set(taperHead(this.headGrid.verts, plate, g));
      this.headGeometry.getBuffer("aPosition").update();
    }
    this.head.position.set(pl.x, pl.y);
    this.head.rotation = pl.rotation;
    this.head.scale.set(pl.scaleX * HEAD_PLATE_FACING * own, pl.scaleY * own);
    this.rimHead.position.copyFrom(this.head.position);
    this.rimHead.rotation = this.head.rotation;
    this.rimHead.scale.copyFrom(this.head.scale);
    // The lamp's side of the figure gets a thin warm edge; never on the projector's sheet.
    this.rim.visible = !!rim && !o.silhouette;
    if (rim) {
      this.rim.position.set(rim.side * rim.px, 0);
      this.rim.alpha = rim.k;
    }
    const face = o.dazed && plate.silly ? plate.silly : layerTexture(plate, o.recolor);
    this.headMesh.texture = art.textures.get(face) ?? this.headMesh.texture;
    this.headMesh.tint = o.silhouette ? SIL : 0xffffff;
    if (this.hat && art.hat && plate.hat) {
      this.hat.visible = o.hat;
      const [x, y] = taperHead([plate.hat.x, plate.hat.y], plate, g);
      this.hat.position.set(x, y);
      this.hat.scale.set((growAbove(plate, g) * plate.hat.width) / art.hat.plate.span!);
      this.hat.tint = this.headMesh.tint;
    }
  }
}
