import { Sprite, Texture } from "pixi.js";
import { AdvancedBloomFilter } from "pixi-filters";
import type { Quality } from "./app";
import { TIERS } from "./quality";
import { PALETTE, dim } from "./palette";
import type { Level } from "../sim/level";
import type { Scene } from "./scene";

/** `group` names the level a lamp belongs to; lamps of other levels stay dark. */
export type Light = { x: number; y: number; radius: number; color: string; intensity: number; flicker?: number; group?: string; soft?: boolean };

const radials = new Map<boolean, Texture>();
/** A soft disc fading to clear: white at the center, or with no hot core for a night lamp, whose raised intensity would burn out what it stands over. */
function radialTexture(soft = false): Texture {
  const made = radials.get(soft);
  if (made) return made;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(255,255,255,${soft ? 0.55 : 1})`);
  g.addColorStop(0.35, `rgba(255,255,255,${soft ? 0.4 : 0.55})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = Texture.from(canvas);
  radials.set(soft, texture);
  return texture;
}

export type Lighting = { setQuality(q: Quality): void; update(dt: number): void; setGroup(group: string): void; setAmbient(hex: string): void };

/** A level's ambient light (story spec §8.1): the hotel's warmth by day, the cool blue at night. */
export const ambientOf = (level: Pick<Level, "ambient">): string => (level.ambient === "night" ? PALETTE.nightAmbient : PALETTE.lobbyAmbient);
/** An ambient as the tint scenery and body parts take. */
export const ambientTint = (hex: string): number => parseInt(dim(hex, 0.92).slice(1), 16);
/** A level's lamps; at night the lights' radius down and their intensity up (story spec §8.1). */
export const lightsOf = (level: Pick<Level, "id" | "lights" | "ambient">): Light[] =>
  level.lights.map((l) =>
    level.ambient === "night"
      ? { ...l, radius: l.radius * 0.7, intensity: l.intensity * 1.6, color: PALETTE.lampGlow, flicker: 0.06, group: level.id, soft: true }
      : { ...l, color: PALETTE.lampGlow, flicker: 0.04, group: level.id },
  );

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
    const s = new Sprite(radialTexture(l.soft));
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
  scene.ambient = ambientTint(ambient);
  const lit = scene.layers.play.children.filter((c) => c.label !== "hammer").map((c) => ({ c, base: c.tint }));
  for (const { c, base } of lit) c.tint = multiplyTint(base, scene.ambient);
  let t = 0;
  const lighting: Lighting = {
    setQuality(q) {
      layer.visible = TIERS[q].glows;
      layer.filters = TIERS[q].bloom ? [bloom] : [];
    },
    setAmbient(hex) {
      scene.ambient = ambientTint(hex);
      for (const { c, base } of lit) c.tint = multiplyTint(base, scene.ambient);
    },
    setGroup(group) {
      for (const lamp of lamps) lamp.sprite.visible = !lamp.light.group || lamp.light.group === group;
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
