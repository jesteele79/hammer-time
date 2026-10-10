import { Sprite, Texture } from "pixi.js";
import { AdvancedBloomFilter } from "pixi-filters";
import type { Quality } from "./app";
import { PALETTE, dim } from "./palette";
import type { Scene } from "./scene";

export type Light = { x: number; y: number; radius: number; color: string; intensity: number; flicker?: number };

let radial: Texture | null = null;
/** A soft disc, white at the center fading to clear. */
function radialTexture(): Texture {
  if (radial) return radial;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  radial = Texture.from(canvas);
  return radial;
}

export type Lighting = { setQuality(q: Quality): void; update(dt: number): void };

/** Two tints combined channel by channel. */
export function multiplyTint(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Lamp glows on the light layer, bloomed at the top tiers; the play layer takes the ambient tint. */
export function createLighting(scene: Scene, quality: Quality, lights: Light[], ambient = PALETTE.lobbyAmbient): Lighting {
  const layer = scene.layers.light;
  const bloom = new AdvancedBloomFilter({ threshold: 0.55, bloomScale: 0.9, brightness: 1 });
  const lamps = lights.map((l, i) => {
    const s = new Sprite(radialTexture());
    s.anchor.set(0.5);
    s.position.set(l.x, l.y);
    s.width = s.height = l.radius * 2;
    s.tint = l.color;
    s.alpha = l.intensity;
    s.blendMode = "add";
    layer.addChild(s);
    return { sprite: s, light: l, phase: i * 1.7 };
  });
  // The ambient tints scenery and, through Character.apply, body parts; a tint on the play
  // layer itself would be inherited by the head plate, which is never tinted (spec §2).
  scene.ambient = parseInt(dim(ambient, 0.92).slice(1), 16);
  for (const child of scene.layers.play.children)
    if (child.label !== "hammer") child.tint = multiplyTint(child.tint, scene.ambient);
  let t = 0;
  const lighting: Lighting = {
    setQuality(q) {
      layer.visible = q !== "low";
      layer.filters = q === "ultra" || q === "high" ? [bloom] : [];
    },
    update(dt) {
      t += dt;
      for (const lamp of lamps) {
        const f = lamp.light.flicker ?? 0;
        if (f > 0) lamp.sprite.alpha = lamp.light.intensity * (1 + f * Math.sin(t * 9 + lamp.phase) * Math.sin(t * 2.3));
      }
    },
  };
  lighting.setQuality(quality);
  return lighting;
}
