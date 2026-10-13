import type { Graphics } from "pixi.js";
import type { Furniture, LevelFloor, LevelPass, LevelPlatform } from "../sim/level";
import { FLOOR, INK, THIN } from "./ink";
import { PALETTE, shadowOf, tones } from "./palette";

/** The restaurant's materials: the dining room's wood, the kitchen's quarry tile, the dock's concrete, the line's steel. */
const C = {
  wood: "#6b4428",
  quarry: "#a3402f",
  concrete: "#80858a",
  steel: "#a7adb3",
  plate: "#2b2b2e",
  hot: "#ff5a1f",
  booth: "#2f3e6b",
  bar: "#4a2e1c",
  crate: "#b07a3e",
  dumpster: "#3d5a3f",
  truck: "#dcd6c8",
  hazard: "#e2b23a",
  pot: "#b8763a",
} as const;

/** A floor's top strip and its front face down to `bottom`: the lobby's marble in another material. */
function slab(g: Graphics, f: LevelFloor, color: string, bottom: number) {
  const t = tones(color);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, f.y1 + FLOOR.top, f.x0, f.y0 + FLOOR.top]).fill(t.highlight);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, bottom, f.x0, bottom]).fill(t.base);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, f.y1 + FLOOR.top + 10, f.x0, f.y0 + FLOOR.top + 10]).fill(t.shadow);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, bottom, f.x0, bottom]).stroke(INK);
}

/** A steel counter's body from its top down to the floor: legs, an undershelf of stock pots, the top's edge. */
function counterBody(g: Graphics, p: LevelPlatform) {
  const steel = tones(C.steel);
  const w = p.x1 - p.x0;
  for (const x of [p.x0 + 16, p.x1 - 34]) g.rect(x, p.y + 20, 18, -p.y - 20).fill(steel.shadow).stroke(THIN);
  g.rect(p.x0 + 16, -60, w - 32, 14).fill(steel.base).stroke(THIN);
  for (let x = p.x0 + 50; x < p.x1 - 90; x += 120) g.rect(x, -120, 70, 60).fill(steel.highlight).stroke(THIN);
}

export function restaurantFloor(g: Graphics, f: LevelFloor): boolean {
  // A raised floor (the dock, the truck's bed) is a block down to the lane; one at the floor shows its usual depth.
  const low = Math.max(f.y0, f.y1);
  const bottom = low < 0 ? FLOOR.depth : low + FLOOR.depth;
  switch (f.kind) {
    case "wood":
      slab(g, f, C.wood, bottom);
      for (let x = f.x0 + 90; x < f.x1; x += 180) g.moveTo(x, f.y0 - FLOOR.back + 4).lineTo(x - 12, f.y0 + FLOOR.top - 2).stroke({ width: 2, color: shadowOf(C.wood) });
      return true;
    case "quarry":
      slab(g, f, C.quarry, bottom);
      for (let x = f.x0 + 100; x < f.x1; x += 100) g.moveTo(x, f.y0 - FLOOR.back).lineTo(x, f.y0 + FLOOR.top).stroke({ width: 3, color: shadowOf(C.quarry) });
      g.moveTo(f.x0, f.y0 - 4).lineTo(f.x1, f.y1 - 4).stroke({ width: 3, color: shadowOf(C.quarry) });
      return true;
    case "concrete":
      slab(g, f, C.concrete, bottom);
      // The dock's bumper along its edge.
      if (f.y0 < 0) g.rect(f.x0, f.y0 + FLOOR.top + 14, f.x1 - f.x0, 22).fill(C.hazard);
      for (let x = f.x0 + 360; x < f.x1; x += 360) g.moveTo(x, f.y0 + FLOOR.top + 40).lineTo(x, bottom).stroke({ width: 2, color: shadowOf(C.concrete), alpha: 0.6 });
      return true;
    case "ramp": {
      const t = tones(C.concrete);
      g.poly([f.x0, f.y0, f.x1, f.y1, f.x1, FLOOR.depth, f.x0, FLOOR.depth]).fill(t.base);
      g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, f.y1 + 8, f.x0, f.y0 + 8]).fill(t.highlight);
      g.moveTo(f.x0, f.y0 + 4).lineTo(f.x1, f.y1 + 4).stroke({ width: 10, color: C.hazard });
      g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, FLOOR.depth, f.x0, FLOOR.depth]).stroke(INK);
      return true;
    }
    case "truck": {
      // The lane under the truck (drawn only: nothing stands there), the trailer's steel bed and its two axles.
      g.rect(f.x0, FLOOR.top, f.x1 - f.x0, FLOOR.depth - FLOOR.top).fill(tones(C.concrete).shadow);
      const t = tones("#5c6168");
      g.rect(f.x0, f.y0 - 10, f.x1 - f.x0, 40).fill(t.base);
      g.rect(f.x0, f.y0 + 30, f.x1 - f.x0, 30).fill(t.shadow);
      g.rect(f.x0, f.y0 - 10, f.x1 - f.x0, 70).stroke(INK);
      for (const x of [f.x1 - 260, f.x1 - 120]) {
        g.circle(x, -48, 48).fill("#1a1a1a").stroke(THIN);
        g.circle(x, -48, 18).fill("#8a8a8a");
      }
      g.rect(f.x0 + 40, f.y0 + 60, 30, -f.y0 - 60).fill(t.shadow).stroke(THIN);
      return true;
    }
  }
  return false;
}

export function restaurantPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  switch (p.kind) {
    case "host": {
      // The host's podium: a wood stand with the reservation book on it.
      const wood = tones(C.bar);
      g.rect(p.x0 + 20, p.y + 18, w - 40, -p.y - 18).fill(wood.base);
      g.rect(p.x1 - 60, p.y + 18, 40, -p.y - 18).fill(wood.shadow);
      g.rect(p.x0 + 20, p.y + 18, w - 40, -p.y - 18).stroke(INK);
      g.rect(p.x0, p.y - 4, w, 22).fill(wood.highlight).stroke(INK);
      g.rect(p.x0 + 40, p.y - 22, 70, 18).fill("#7a1f2b").stroke(THIN);
      return true;
    }
    case "booth": {
      // A navy tufted booth: its tall back behind, the seat he stands on, its wood plinth.
      const v = tones(C.booth);
      g.roundRect(p.x0 + 10, p.y - 190, w - 20, 200, 20).fill(v.shadow).stroke(INK);
      for (let x = p.x0 + 40; x < p.x1 - 30; x += 60) g.moveTo(x, p.y - 176).lineTo(x, p.y - 8).stroke({ width: 3, color: shadowOf(v.shadow) });
      g.roundRect(p.x0, p.y, w, 70, 14).fill(v.base).stroke(INK);
      g.roundRect(p.x0 + 12, p.y + 6, w - 24, 10, 5).fill(v.highlight);
      g.rect(p.x0 + 16, p.y + 70, w - 32, -p.y - 70).fill(tones(C.bar).shadow).stroke(THIN);
      return true;
    }
    case "pass": {
      // The pass: a steel counter, plates waiting along its back under the lamps (drawn as furniture above it).
      counterBody(g, p);
      g.rect(p.x0 - 10, p.y - 6, w + 20, 26).fill(tones(C.steel).highlight).stroke(INK);
      for (let x = p.x0 + 60; x < p.x1 - 40; x += 140) {
        g.ellipse(x, p.y - 8, 36, 8).fill("#ffffff").stroke({ width: 2, color: PALETTE.outline });
        g.ellipse(x, p.y - 14, 18, 6).fill("#d98a3a");
      }
      return true;
    }
    case "steel": {
      counterBody(g, p);
      g.rect(p.x0 - 6, p.y - 6, w + 12, 26).fill(tones(C.steel).highlight).stroke(INK);
      return true;
    }
    case "flattop": {
      // A flat-top griddle: a black plate glowing at its seams, knobs on its front, heat shimmering off it.
      const steel = tones(C.steel);
      g.rect(p.x0, p.y + 20, w, -p.y - 20).fill(steel.shadow).stroke(INK);
      for (let x = p.x0 + 40; x < p.x1 - 20; x += 70) g.circle(x, p.y + 60, 12).fill(PALETTE.outline);
      g.rect(p.x0 - 6, p.y - 6, w + 12, 26).fill(C.plate).stroke(INK);
      for (let x = p.x0 + 30; x < p.x1 - 20; x += 60) g.moveTo(x, p.y + 2).lineTo(x + 30, p.y + 2).stroke({ width: 4, color: C.hot, cap: "round" });
      g.rect(p.x0 - 6, p.y + 14, w + 12, 6).fill({ color: C.hot, alpha: 0.8 });
      for (let x = p.x0 + 50; x < p.x1; x += 110)
        g.moveTo(x, p.y - 20).quadraticCurveTo(x + 14, p.y - 50, x, p.y - 80).stroke({ width: 3, color: "#ffffff", alpha: 0.35, cap: "round" });
      return true;
    }
    case "rack": {
      // The pot rack: a wire shelf hung on chains from the ceiling, pots and pans standing on it.
      const steel = tones(C.steel);
      for (const x of [p.x0 + 30, p.x1 - 30]) g.moveTo(x, p.y).lineTo(x, -1200).stroke({ width: 5, color: steel.shadow });
      g.rect(p.x0, p.y - 4, w, 20).fill(steel.base).stroke(INK);
      for (let x = p.x0 + 14; x < p.x1; x += 28) g.moveTo(x, p.y).lineTo(x, p.y + 14).stroke({ width: 2, color: steel.shadow });
      const pot = tones(C.pot);
      for (let x = p.x0 + 120; x < p.x1 - 120; x += 260) {
        g.roundRect(x - 50, p.y - 70, 100, 66, 8).fill(pot.base).stroke(THIN);
        g.rect(x - 50, p.y - 70, 100, 10).fill(pot.highlight);
      }
      return true;
    }
    case "crates": {
      // Produce crates stacked up from the dock, one box per 100 px of height.
      const wood = tones(C.crate);
      const floor = -200;
      for (let y = floor; y > p.y + 1; y -= 100)
        for (let x = p.x0; x < p.x1 - 1; x += 150) {
          const cw = Math.min(150, p.x1 - x);
          const top = Math.max(p.y, y - 100);
          g.rect(x, top, cw, y - top).fill(wood.base).stroke(THIN);
          g.moveTo(x + 6, top + (y - top) / 2).lineTo(x + cw - 6, top + (y - top) / 2).stroke({ width: 3, color: wood.shadow });
        }
      g.rect(p.x0, p.y, w, 10).fill(wood.highlight);
      return true;
    }
    case "dumpster": {
      const body = tones(C.dumpster);
      g.poly([p.x0 + 10, p.y + 20, p.x1 - 10, p.y + 20, p.x1 - 24, -30, p.x0 + 24, -30]).fill(body.base).stroke(INK);
      g.poly([p.x1 - 70, p.y + 20, p.x1 - 10, p.y + 20, p.x1 - 24, -30, p.x1 - 76, -30]).fill(body.shadow);
      g.rect(p.x0, p.y - 4, w, 26).fill(PALETTE.outline);
      for (const x of [p.x0 + 50, p.x1 - 50]) g.circle(x, -16, 16).fill("#1a1a1a").stroke(THIN);
      return true;
    }
  }
  return false;
}

export function restaurantFurniture(g: Graphics, f: Furniture): boolean {
  switch (f.kind) {
    case "bar": {
      // The bar: wood panels and a brass foot rail under a marble top, glasses along its back.
      const wood = tones(C.bar);
      const brass = tones(PALETTE.brass);
      g.rect(f.x, f.y, f.w, f.h).fill(wood.base).stroke(INK);
      for (let x = f.x + 40; x < f.x + f.w - 120; x += 160) g.roundRect(x, f.y + 50, 120, f.h - 80, 6).stroke({ width: 3, color: wood.shadow });
      g.rect(f.x, f.h + f.y - 40, f.w, 12).fill(brass.base);
      g.rect(f.x - 14, f.y - 10, f.w + 28, 30).fill(PALETTE.marbleTop).stroke(INK);
      for (let x = f.x + 40; x < f.x + f.w - 30; x += 90)
        g.poly([x, f.y - 10, x + 20, f.y - 10, x + 24, f.y - 44, x - 4, f.y - 44]).fill({ color: "#a9c7cf", alpha: 0.8 }).stroke({ width: 2, color: PALETTE.outline });
      return true;
    }
    case "lamps": {
      // Heat lamps over the pass: cords from above, red hoods, an orange glow (the light layer blooms it).
      for (let x = f.x + 100; x < f.x + f.w; x += 200) {
        g.moveTo(x, f.y - 600).lineTo(x, f.y).stroke({ width: 4, color: PALETTE.outline });
        g.poly([x - 40, f.y + f.h, x + 40, f.y + f.h, x + 22, f.y, x - 22, f.y]).fill("#b8282e").stroke(THIN);
        g.ellipse(x, f.y + f.h + 6, 34, 10).fill({ color: "#ffb347", alpha: 0.9 });
      }
      return true;
    }
    case "freezer": {
      // The walk-in: a steel wall panel with its heavy door swung wide, frost and dark cold inside.
      const steel = tones(C.steel);
      g.rect(f.x - 60, f.y - 40, f.w + 120, f.h + 40).fill(steel.base).stroke(INK);
      g.rect(f.x, f.y, f.w, f.h).fill("#1d3346");
      for (let k = 0; k < 6; k++) g.rect(f.x + 30 + k * 76, f.y + 40, 40, f.h - 40).fill({ color: "#9fd3f2", alpha: 0.12 });
      g.rect(f.x - 150, f.y, 90, f.h).fill(steel.highlight).stroke(THIN);
      g.roundRect(f.x - 130, f.y + f.h * 0.45, 50, 20, 6).fill(PALETTE.outline);
      g.rect(f.x, f.y + f.h - 50, f.w, 50).fill({ color: "#dff3ff", alpha: 0.35 });
      return true;
    }
    case "truck": {
      // The trailer's box over its bed, its roll-up door open on the dock's side, boxes inside, tail lights.
      const box = tones(C.truck);
      g.rect(f.x, f.y, f.w, f.h).fill(box.base).stroke(INK);
      g.rect(f.x, f.y, 80, f.h).fill("#1c1f24");
      for (let k = 0; k < 3; k++) g.rect(f.x + 10, f.y + f.h - 70 - k * 60, 60, 56).fill(tones(C.crate).base).stroke(THIN);
      g.rect(f.x + f.w - 30, f.y + f.h - 60, 20, 30).fill("#d9302a").stroke(THIN);
      g.rect(f.x + 100, f.y + 40, f.w - 160, 12).fill(box.shadow);
      return true;
    }
  }
  return false;
}

/** The kitchen's heat-lamp gantry over the line's way in: a steel beam on two posts, lamps glowing under it, a low clearance. */
export function drawGantry(g: Graphics, p: LevelPass): void {
  const steel = tones(C.steel);
  const bottom = p.y + p.h;
  g.rect(p.x, bottom - 90, p.w, 90).fill(steel.base).stroke(INK);
  g.rect(p.x, bottom - 20, p.w, 20).fill(steel.shadow);
  for (const x of [p.x + 10, p.x + p.w - 34]) g.rect(x, p.y, 24, bottom - 90 - p.y).fill(steel.shadow).stroke(THIN);
  for (let x = p.x + 60; x < p.x + p.w - 30; x += 90) g.ellipse(x, bottom + 4, 26, 8).fill({ color: "#ffb347", alpha: 0.9 });
  g.rect(p.x + p.w / 2 - 90, bottom - 70, 180, 40).fill("#e2b23a").stroke(THIN);
}
