import type { Graphics } from "pixi.js";

/** How dark a floor's front face is at its bottom, and the contact shadow along its top edge (story spec §15). */
export const FACE = { dark: 0.25, bands: 8, contact: 40, contactAlpha: 0.35, contactBands: 5, platform: 16 } as const;

/**
 * Shades a floor's front face: a contact shadow down from its top edge (its top line at x0 and x1, which may slope) and
 * the face darkening in bands to 75 percent at `bottom`, so it reads as a floor's edge in depth rather than a flat band.
 */
export function shadeFace(g: Graphics, x0: number, x1: number, top0: number, top1: number, bottom: number): void {
  const at = (k: number, top: number) => top + (bottom - top) * k;
  // The face darkens toward the bottom: each band a little darker than the one above it.
  for (let i = 0; i < FACE.bands; i++) {
    const a = i / FACE.bands;
    const b = (i + 1) / FACE.bands;
    g.poly([x0, at(a, top0), x1, at(a, top1), x1, at(b, top1), x0, at(b, top0)]).fill({ color: "#000000", alpha: (FACE.dark * (i + 0.5)) / FACE.bands });
  }
  contactShadow(g, x0, x1, top0, top1, FACE.contact);
}

/** A shadow down from a top edge (sloped from y0 at x0 to y1 at x1), fading from 35 percent black to nothing over `depth`. */
export function contactShadow(g: Graphics, x0: number, x1: number, y0: number, y1: number, depth: number): void {
  const step = depth / FACE.contactBands;
  for (let i = 0; i < FACE.contactBands; i++) {
    const alpha = FACE.contactAlpha * (1 - i / FACE.contactBands);
    g.poly([x0, y0 + i * step, x1, y1 + i * step, x1, y1 + (i + 1) * step, x0, y0 + (i + 1) * step]).fill({ color: "#000000", alpha });
  }
}

/** Under a platform's top lip (a landing, the balcony, a deck): the 16 px shadow the floors have, at its scale. */
export function platformShadow(g: Graphics, x0: number, x1: number, y: number): void {
  contactShadow(g, x0, x1, y, y, FACE.platform);
}
