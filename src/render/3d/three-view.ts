import {
  DataTexture,
  DepthTexture,
  DirectionalLight,
  HalfFloatType,
  HemisphereLight,
  Mesh,
  MeshNormalMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  NoToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  RedFormat,
  RepeatWrapping,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import type { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { Quality } from "../app";
import { TIERS3D, density3dFor } from "../quality";
import type { BackClipName } from "../../sim/rig/back-clips";
import type { Level } from "../../sim/level";
import type { Registry } from "../../art/registry";
import { HallPeople } from "./hall-people";
import type { HallState } from "./hall-state";
import { createInkPass } from "./ink-pass";

const NEAR = 0.1;
const FAR = 120;
/** The chase camera: how far behind him, how high, how much of his sidestep it follows, how fast it catches up. */
const CHASE = { back: 3, height: 1.6, follow: 0.55, aim: 0.3, ahead: 5, aimHeight: 1.15, rate: 8 } as const;
/** A wide view of the hall; an upright phone needs more of it. */
const FOV = { wide: 62, upright: 78 } as const;
/** How bright a lamp may be: Blender's emission is far too much for the bloom. */
const LAMP_MAX = 1.6;
const LAMP_EVERY = 6;
const LAMP_FIRST = 3;
/** The camera's layer for what the ink should not outline: blob shadows, the puddle. */
export const CUTOUT_LAYER = 1;
/** How many frames of the 3D view to average its work over. */
const WORK_AVERAGE = 0.05;

/**
 * The hall in 3D (story spec §12): a second canvas under the game's, which stays transparent over it for his thoughts and
 * the comic words. The set is from Blender, shaded in three steps and inked in screen space; the sim runs as it always does,
 * and this only draws what the look hands it. `load` rejects where WebGL2 is missing or a context cannot be made, and the
 * level then plays flat.
 */
export class ThreeView {
  canvas: HTMLCanvasElement | null = null;
  quality: Quality;
  density = 1;
  frameMs = 0;
  fps = 0;
  /** The hall has shown a frame since it was made visible: the probe's "drawing". */
  drawing = false;
  onContextLost: (() => void) | null = null;
  people: HallPeople | null = null;
  private readonly peopleScene = new Scene();
  private renderer: WebGLRenderer | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV.wide, 16 / 9, NEAR, FAR);
  private composer: EffectComposer | null = null;
  private ink: ShaderPass | null = null;
  private bloom: UnrealBloomPass | null = null;
  private normalTarget: WebGLRenderTarget | null = null;
  private readonly normals = new MeshNormalMaterial();
  private key: DirectionalLight | null = null;
  private readonly pools: PointLight[] = [];
  private width = 1;
  private height = 1;
  private visible = false;
  private frames: number[] = [];

  constructor(
    private readonly host: HTMLElement,
    quality: Quality,
    private readonly gpu: string,
  ) {
    this.quality = quality;
  }

  /** The renderer, the set and the passes. Anything that fails rejects here, and nothing is left behind. */
  async load(): Promise<void> {
    if (typeof WebGL2RenderingContext === "undefined") throw new Error("no WebGL2");
    const renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer = renderer;
    renderer.toneMapping = NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    const canvas = renderer.domElement;
    this.canvas = canvas;
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", display: "none", zIndex: "0" });
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.onContextLost?.();
    });
    this.host.insertBefore(canvas, this.host.firstChild);

    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    const gltf = new GLTFLoader();
    gltf.setDRACOLoader(draco);
    const set = (await gltf.loadAsync("/sets/hallway.glb")).scene;
    draco.dispose();
    this.dress(set);
    this.scene.add(set);
    this.people = new HallPeople(this.scene, this.peopleScene);
    this.camera.layers.enable(CUTOUT_LAYER);
    this.camera.position.set(0, CHASE.height, CHASE.back);
    this.light();

    const size = this.drawSize();
    this.normalTarget = new WebGLRenderTarget(size.x, size.y, { depthTexture: new DepthTexture(size.x, size.y) });
    const composer = new EffectComposer(renderer, new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType, samples: TIERS3D[this.quality].aa }));
    this.composer = composer;
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.ink = createInkPass({ normal: this.normalTarget.texture, depth: this.normalTarget.depthTexture! }, NEAR, FAR);
    composer.addPass(this.ink);
    // The people over the inked set: the ink never touches their painted lines, and no wall clips them.
    const over = new RenderPass(this.peopleScene, this.camera);
    over.clear = false;
    over.clearDepth = true;
    over.needsSwap = false;
    composer.addPass(over);
    this.bloom = new UnrealBloomPass(new Vector2(this.width, this.height), 0.22, 0.35, 1.05);
    // Its blurs at half the buffer again: a lamp's glow loses nothing and they are most of the pass's cost.
    const fullSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w: number, h: number) => fullSize(w / 2, h / 2);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
    this.resize(this.host.clientWidth || 1, this.host.clientHeight || 1);
    this.setQuality(this.quality);
  }

  /** Three-step toon materials over the glTF's colors, the carpet's pattern repeating, the lamps capped. */
  private dress(set: Object3D) {
    const steps = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
    steps.minFilter = steps.magFilter = NearestFilter;
    steps.needsUpdate = true;
    set.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.name !== "ceiling" && mesh.name !== "carpet";
      mesh.receiveShadow = true;
      const m = mesh.material as MeshStandardMaterial;
      if (m.map) {
        m.map.wrapS = m.map.wrapT = RepeatWrapping;
        m.map.anisotropy = 8;
      }
      mesh.material = new MeshToonMaterial({ color: m.color, map: m.map, gradientMap: steps, emissive: m.emissive, emissiveIntensity: Math.min(m.emissiveIntensity, LAMP_MAX) });
      m.dispose();
    });
  }

  /** One key light from behind him, a dim fill, and the lamps nearest him as soft pools. */
  private light() {
    this.scene.add(new HemisphereLight(0xfff0dc, 0x4a3020, 1.1));
    const key = new DirectionalLight(0xffe6c4, 1.1);
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.03;
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 16, bottom: -16, near: 0.5, far: 30 });
    this.key = key;
    this.scene.add(key, key.target);
    for (let i = 0; i < 3; i++) {
      const p = new PointLight(0xffd9a6, 3.2, 8, 1.8);
      this.pools.push(p);
      this.scene.add(p);
    }
  }

  private drawSize() {
    const pr = this.renderer?.getPixelRatio() ?? 1;
    return new Vector2(Math.max(1, Math.round(this.width * pr)), Math.max(1, Math.round(this.height * pr)));
  }

  setVisible(on: boolean) {
    this.visible = on;
    this.drawing = false;
    if (this.canvas) this.canvas.style.display = on ? "block" : "none";
  }

  /** A tier: its density times the screen's, capped at 2; its antialiasing, bloom, ink and shadows. */
  setQuality(q: Quality) {
    this.quality = q;
    const tier = TIERS3D[q];
    this.density = density3dFor(q, this.gpu);
    if (!this.renderer || !this.composer) return;
    const pr = Math.min(2, this.density * (window.devicePixelRatio || 1));
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);
    for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      target.samples = tier.aa;
      target.dispose();
    }
    if (this.bloom) this.bloom.enabled = tier.bloom;
    if (this.ink) this.ink.enabled = tier.ink;
    if (this.key) this.key.castShadow = q === "ultra" || q === "high";
    this.resize(this.width, this.height);
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? FOV.upright : FOV.wide;
    this.camera.updateProjectionMatrix();
    if (!this.renderer || !this.composer) return;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const size = this.drawSize();
    this.normalTarget?.setSize(size.x, size.y);
    this.ink?.material.uniforms.texel.value.set(1 / size.x, 1 / size.y);
  }

  /** The frame's state: the chase camera after him, the key light and the nearest lamps with it. `dt` in seconds. */
  sync(state: HallState, back: { clip: BackClipName; u: number } | null, dt: number) {
    const { lx, z } = state.hero;
    this.people?.sync(state, back);
    const k = 1 - Math.exp(-CHASE.rate * dt);
    const cam = this.camera.position;
    cam.x += (lx * CHASE.follow - cam.x) * k;
    cam.y = CHASE.height;
    // The hall runs along three.js's -z: the camera looks down it, with +x on the screen's right.
    cam.z = -z + CHASE.back;
    this.camera.lookAt(lx * CHASE.aim, CHASE.aimHeight, -z - CHASE.ahead);
    this.key?.position.set(lx + 0.8, 2.6, -z + 3.5);
    this.key?.target.position.set(lx, 0, -z - 3);
    const lamp = Math.round((z - LAMP_FIRST) / LAMP_EVERY);
    this.pools.forEach((p, i) => p.position.set(0, 2.55, -(LAMP_FIRST + (lamp + i - 1) * LAMP_EVERY)));
  }

  /** Where a point of the hall falls on the screen, in CSS px. */
  project(lx: number, y: number, z: number): { x: number; y: number } {
    const v = new Vector3(lx, y, -z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  /** Drops the context, as a browser short of them does: the checks' way to the flat fallback. */
  lose() {
    this.renderer?.getContext().getExtension("WEBGL_lose_context")?.loseContext();
  }

  /** His back, the level's cast and the small pictures. */
  loadPeople(registry: Registry, level: Level): Promise<void> {
    return this.people?.load(registry, level) ?? Promise.resolve();
  }

  /** One frame: the ink's normals, then the passes. */
  render(dt: number) {
    const renderer = this.renderer;
    if (!renderer || !this.composer || !this.visible) return;
    const t0 = performance.now();
    if (this.ink?.enabled && this.normalTarget) {
      this.camera.layers.set(0);
      this.scene.overrideMaterial = this.normals as Material;
      renderer.setRenderTarget(this.normalTarget);
      renderer.clear();
      renderer.render(this.scene, this.camera);
      this.scene.overrideMaterial = null;
      this.camera.layers.enableAll();
      renderer.setRenderTarget(null);
    }
    this.composer.render(dt);
    const now = performance.now();
    this.frameMs += (now - t0 - this.frameMs) * WORK_AVERAGE;
    this.frames.push(now);
    while (this.frames.length && now - this.frames[0] > 1000) this.frames.shift();
    this.fps = this.frames.length;
    this.drawing = true;
  }

  destroy() {
    this.onContextLost = null;
    this.setVisible(false);
    this.people?.destroy();
    this.composer?.dispose();
    this.normalTarget?.dispose();
    this.normals.dispose();
    this.renderer?.dispose();
    this.canvas?.remove();
    this.renderer = null;
    this.composer = null;
  }
}
