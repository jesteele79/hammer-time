import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Scene,
  type Texture,
} from "three";
import type { Registry } from "../../art/registry";
import type { CastPerson, Level } from "../../sim/level";
import { BACK_CLIPS, type BackClipName } from "../../sim/rig/back-clips";
import type { CastAct } from "../../sim/cast";
import { castPose } from "../../sim/rig/cast";
import { solve } from "../../sim/rig/fk";
import { HERO_HEIGHT } from "../../sim/rig/skeleton";
import { castHeadScale } from "../cast-art";
import { loadBackArt, loadCastArt, type CastArt } from "../cast-body";
import { LOOKS } from "../cast";
import { Cutout, picture } from "./cutout";
import type { HallState } from "./hall-state";

/** He stands 1.9 m in the hall; everyone's world px by that. */
export const HERO_METERS = 1.9;
const METERS = HERO_METERS / HERO_HEIGHT;
/** The pictures in the hall, in meters: a pickup, and a housekeeping cart seen from the hall. */
const PICKUP_H = 0.5;
const PICKUP_LIFT = 0.45;
const CART = { w: 1.2, h: 1.05 } as const;
const LEAF = { w: 1.0, h: 2.2, t: 0.05, face: 1.5 } as const;
const MISSILE = 0.3;
/** Behind him this far they are between him and the camera: out of the picture, so nobody fills the screen. */
const BEHIND = 0.8;
/** How far the door's leaf swings, a quarter turn out across the hall. */
const LEAF_TURN = Math.PI / 2;

const softShadow = (): CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.62)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
};

const wetPatch = (): CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 18, 64, 64, 64);
  g.addColorStop(0, "rgba(170,215,240,0.5)");
  g.addColorStop(0.75, "rgba(170,215,240,0.38)");
  g.addColorStop(1, "rgba(170,215,240,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
};

/** A paper plane or a splash, drawn once. */
const missileTexture = (kind: string): CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  x.lineWidth = 3;
  x.strokeStyle = "#0c0c0e";
  if (kind === "plane") {
    x.fillStyle = "#f4f1ea";
    x.beginPath();
    x.moveTo(6, 40);
    x.lineTo(60, 12);
    x.lineTo(30, 56);
    x.lineTo(26, 38);
    x.closePath();
    x.fill();
    x.stroke();
  } else {
    x.fillStyle = kind === "water" ? "#9fd6ff" : "#6b3f1e";
    x.beginPath();
    x.arc(32, 32, 22, 0, Math.PI * 2);
    x.fill();
    x.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

const flat = (map: Texture) => new MeshBasicMaterial({ map, transparent: true, side: DoubleSide, depthTest: false, depthWrite: false, toneMapped: false });

/**
 * Everyone in the hall: his back, the cast in their paintings, and what rolls, flies and lies about. They draw over the
 * set, far to near, so nothing of the wall clips them; what stands in the set itself (a door's leaf, the puddle, the blob
 * shadows) goes in the set's own scene.
 */
export class HallPeople {
  private readonly people = new Group();
  private hero: Cutout | null = null;
  private heroArt: CastArt | null = null;
  private readonly cast = new Map<string, { cut: Cutout; art: CastArt; person: CastPerson; k: number }>();
  private readonly shadows: Mesh[] = [];
  private readonly shadowMap = softShadow();
  private cartPicture: Texture | null = null;
  private readonly carts: Mesh[] = [];
  private readonly pickups = new Map<number, Mesh>();
  private readonly products = new Map<string, Texture>();
  private readonly missiles: Mesh[] = [];
  private readonly missileMaps = new Map<string, CanvasTexture>();
  private readonly leaves = new Map<string, { pivot: Group; mesh: Mesh }>();
  private puddle: Mesh | null = null;
  /** The back shown this frame: false while his profile is on the game's canvas. */
  heroShown = true;

  constructor(
    private readonly setScene: Scene,
    peopleScene: Scene,
  ) {
    peopleScene.add(this.people);
  }

  /** His back, the level's cast and the small pictures. What fails to load stays out of the hall; the level still plays. */
  async load(registry: Registry, level: Level) {
    const art = await loadBackArt(registry);
    if (art) {
      this.heroArt = art;
      this.hero = await Cutout.make(art);
      this.people.add(this.hero.group);
    }
    await Promise.all(
      (level.cast ?? []).map(async (s) => {
        const a = await loadCastArt(registry, s.person);
        if (!a) return;
        const cut = await Cutout.make(a, s.recolor ?? null);
        this.people.add(cut.group);
        this.cast.set(s.id, { cut, art: a, person: s.person, k: ((LOOKS[s.person]?.height ?? HERO_HEIGHT) * (s.size ?? 1) * METERS) / HERO_HEIGHT });
      }),
    );
    const cart = registry.tower?.pieces?.cart;
    if (cart) this.cartPicture = await picture(cart.file).catch(() => null);
    await Promise.all(["can", "nuts", "bucees"].map(async (k) => {
      const t = await picture(`products/${k}.webp`).catch(() => null);
      if (t) this.products.set(k, t);
    }));
  }

  private shadow(i: number, lx: number, z: number, size: number, opacity: number) {
    let s = this.shadows[i];
    if (!s) {
      s = new Mesh(new CircleGeometry(0.5, 24), new MeshBasicMaterial({ map: this.shadowMap, transparent: true, depthWrite: false, toneMapped: false }));
      s.rotation.x = -Math.PI / 2;
      s.layers.set(1);
      this.setScene.add(s);
      this.shadows[i] = s;
    }
    s.visible = true;
    s.position.set(lx, 0.012, -z);
    s.scale.set(size, size * 0.65, 1);
    (s.material as MeshBasicMaterial).opacity = opacity;
  }

  /** The frame's people, sorted far to near. `clip` is his back's clip, or null while his profile shows on the game's canvas. */
  sync(state: HallState, back: { clip: BackClipName; u: number } | null) {
    let shadowN = 0;
    const draw: { z: number; set: (o: number) => void }[] = [];
    const he = state.hero;
    this.shadow(shadowN++, he.lx, he.z, 1.5, 1 - Math.min(0.6, he.y));
    this.heroShown = !!back && !!this.hero;
    if (this.hero) this.hero.setVisible(this.heroShown);
    if (back && this.hero && this.heroArt) {
      const a = this.heroArt;
      const frame = BACK_CLIPS[back.clip](back.u);
      const solved = solve(frame.pose, -1, castHeadScale(a.head.share, a.head), a.head, a.skeleton);
      this.hero.apply(solved);
      const j = solved.joints;
      this.hero.foreshorten("legNear", j.hipNear.y, frame.legNear);
      this.hero.foreshorten("legFar", j.hipFar.y, frame.legFar);
      this.hero.foreshorten("armNear", j.shoulderNear.y, frame.armNear);
      this.hero.foreshorten("armFar", j.shoulderFar.y, frame.armFar);
      this.hero.place(he.lx, he.y, he.z, METERS);
      const cut = this.hero;
      draw.push({ z: he.z, set: (o) => cut.setOrder(o) });
    }
    const seen = new Set<string>();
    for (const n of state.cast) {
      const c = this.cast.get(n.id);
      if (!c || n.z < he.z - BEHIND) continue;
      seen.add(n.id);
      const facing: 1 | -1 = n.lx > he.lx + 0.1 ? -1 : n.lx < he.lx - 0.1 ? 1 : -1;
      const pose = castPose({ role: n.role, act: n.clip as CastAct, t: n.u, speed: n.speed, onGround: n.y <= 0.01, sit: false, spin: n.spin, hits: n.hits, flat: n.person === "housekeeper-1" });
      c.cut.apply(solve(pose, facing, castHeadScale(LOOKS[c.person]?.head ?? c.art.head.share, c.art.head), c.art.head, c.art.skeleton));
      c.cut.place(n.lx, n.y, n.z, c.k);
      c.cut.setVisible(true);
      draw.push({ z: n.z, set: (o) => c.cut.setOrder(o) });
      this.shadow(shadowN++, n.lx, n.z, 1.3, 0.8);
    }
    for (const [id, c] of this.cast) if (!seen.has(id)) c.cut.setVisible(false);
    // The housekeeping carts and the bellhops' on their picture, turned the way they roll.
    state.carts.forEach((c, i) => {
      let m = this.carts[i];
      if (c.z < he.z - BEHIND) {
        if (m) m.visible = false;
        return;
      }
      if (!m) {
        m = new Mesh(new PlaneGeometry(CART.w, CART.h), flat(this.cartPicture ?? this.shadowMap));
        m.geometry.scale(1, -1, 1);
        this.people.add(m);
        this.carts[i] = m;
      }
      m.visible = true;
      m.position.set(c.lx, CART.h / 2, -c.z);
      m.scale.x = c.dir > 0 ? -1 : 1;
      const mesh = m;
      draw.push({ z: c.z, set: (o) => (mesh.renderOrder = o) });
      this.shadow(shadowN++, c.lx, c.z, 1.3, 0.7);
    });
    for (let i = state.carts.length; i < this.carts.length; i++) this.carts[i].visible = false;
    for (const m of this.pickups.values()) m.visible = false;
    for (const p of state.pickups) {
      let m = this.pickups.get(p.id);
      if (p.taken) {
        if (m) m.visible = false;
        continue;
      }
      const map = this.products.get(p.kind);
      if (!map) continue;
      if (p.z < he.z - BEHIND) {
        if (m) m.visible = false;
        continue;
      }
      if (!m) {
        const img = map.image as { width: number; height: number };
        m = new Mesh(new PlaneGeometry((PICKUP_H * img.width) / img.height, PICKUP_H), flat(map));
        m.geometry.scale(1, -1, 1);
        this.people.add(m);
        this.pickups.set(p.id, m);
      }
      m.visible = true;
      // A fresh run lays new pickups under the old ids.
      const material = m.material as MeshBasicMaterial;
      if (material.map !== map) material.map = map;
      m.position.set(p.lx, Math.max(p.y, PICKUP_LIFT), -p.z);
      const mesh = m;
      draw.push({ z: p.z, set: (o) => (mesh.renderOrder = o) });
    }
    state.missiles.forEach((b, i) => {
      let m = this.missiles[i];
      if (!m) {
        m = new Mesh(new PlaneGeometry(MISSILE, MISSILE), flat(this.shadowMap));
        this.people.add(m);
        this.missiles[i] = m;
      }
      let map = this.missileMaps.get(b.kind);
      if (!map) {
        map = missileTexture(b.kind);
        this.missileMaps.set(b.kind, map);
      }
      (m.material as MeshBasicMaterial).map = map;
      m.visible = true;
      m.position.set(b.lx, Math.max(0.2, b.y), -b.z);
      const mesh = m;
      draw.push({ z: b.z, set: (o) => (mesh.renderOrder = o) });
    });
    for (let i = state.missiles.length; i < this.missiles.length; i++) this.missiles[i].visible = false;
    // Far first: the set was drawn already, so they are simply laid over it in order.
    draw.sort((a, b) => b.z - a.z);
    draw.forEach((d, i) => d.set(i * 10));
    for (let i = shadowN; i < this.shadows.length; i++) this.shadows[i].visible = false;
    // The doors that swing, in the set so the ink finds their edges: hinged on the side of the frame toward him.
    for (const d of state.doors) {
      const key = `${d.z}:${d.side}`;
      let leaf = this.leaves.get(key);
      if (!leaf) {
        const pivot = new Group();
        const mesh = new Mesh(new BoxGeometry(LEAF.t, LEAF.h, LEAF.w), new MeshToonMaterial({ color: 0x9a6232 }));
        mesh.position.set(0, LEAF.h / 2, -LEAF.w / 2);
        pivot.add(mesh);
        // Its two panels and its handle, on both faces.
        const panel = new MeshToonMaterial({ color: 0x6f4420 });
        for (const y of [0.6, 1.6]) {
          const inset = new Mesh(new BoxGeometry(LEAF.t + 0.03, 0.8, LEAF.w * 0.7), panel);
          inset.position.set(0, y, -LEAF.w / 2);
          pivot.add(inset);
        }
        const handle = new Mesh(new BoxGeometry(LEAF.t + 0.12, 0.06, 0.12), new MeshToonMaterial({ color: 0xc9a24a }));
        handle.position.set(0, 1.05, -LEAF.w + 0.12);
        pivot.add(handle);
        pivot.position.set(d.side * LEAF.face, 0, -d.z + LEAF.w / 2);
        this.setScene.add(pivot);
        leaf = { pivot, mesh };
        this.leaves.set(key, leaf);
      }
      leaf.pivot.visible = d.open > 0;
      leaf.pivot.rotation.y = d.side * LEAF_TURN * d.open;
    }
    if (state.puddle && !this.puddle) {
      const { z0, z1 } = state.puddle;
      // A spreading wet patch, soft at its edge, leaking out of the alcove.
      this.puddle = new Mesh(new CircleGeometry(0.5, 32), new MeshBasicMaterial({ map: wetPatch(), transparent: true, depthWrite: false, toneMapped: false }));
      this.puddle.rotation.x = -Math.PI / 2;
      this.puddle.scale.set(2.4, z1 - z0, 1);
      this.puddle.position.set(-0.4, 0.01, -(z0 + z1) / 2);
      this.puddle.layers.set(1);
      this.setScene.add(this.puddle);
    }
  }

  destroy() {
    this.hero?.destroy();
    for (const c of this.cast.values()) c.cut.destroy();
    this.people.removeFromParent();
    this.shadowMap.dispose();
  }
}
