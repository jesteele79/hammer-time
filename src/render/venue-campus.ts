import type { Graphics } from "pixi.js";
import type { Furniture, LevelFloor, LevelPlatform } from "../sim/level";
import type { FloorSegment } from "../sim/types";
import { FLOOR, INK, THIN } from "./ink";
import { PALETTE, shadowOf, tones } from "./palette";

/** The campus's materials: the quad's brick, the commons' terrazzo, the library's limestone, the conveyor's steel and rubber. */
const C = { brick: "#a2533d", terrazzo: "#d6cfbf", stone: "#d8cfb8", steel: "#a7adb3", rubber: "#26272b", wood: "#9a6b3f", iron: "#2b2d31", water: "#7fc4e0", tray: "#c9a84a" } as const;
/** The conveyor's trays, one every this many px of its run. */
const TRAY_GAP = 180;

function slab(g: Graphics, f: LevelFloor, color: string, bottom: number) {
  const t = tones(color);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, f.y1 + FLOOR.top, f.x0, f.y0 + FLOOR.top]).fill(t.highlight);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, bottom, f.x0, bottom]).fill(t.base);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, f.y1 + FLOOR.top + 10, f.x0, f.y0 + FLOOR.top + 10]).fill(t.shadow);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, bottom, f.x0, bottom]).stroke(INK);
}

/** How deep an open flight's stringer is under its treads. */
const STRINGER = 70;

/** Where a floor's front ends: anything above the ground stands on it, so no flight stops in the air under the next. */
export function floorBottom(f: LevelFloor): number {
  return Math.max(0, Math.max(f.y0, f.y1)) + FLOOR.depth;
}

/** A flight with another floor running on under it, which he can walk along: drawn open, on its stringer. */
export function openUnder(f: LevelFloor, floors: readonly LevelFloor[]): boolean {
  return f.kind === "steps" && floors.some((o) => o !== f && o.kind !== "belt" && o.x0 < f.x1 && o.x1 > f.x0 && Math.min(o.y0, o.y1) >= Math.max(f.y0, f.y1));
}

/**
 * Stone steps at 30 degrees: treads along the slope, a stone balustrade beside; solid down to `bottom`, or with no
 * bottom an open flight on its stringer.
 */
function stoneSteps(g: Graphics, f: LevelFloor, bottom: number | null) {
  const rise = 40;
  const run = rise / Math.tan(Math.PI / 6);
  const stone = tones(C.stone);
  const slope = (f.y1 - f.y0) / (f.x1 - f.x0);
  const at = (x: number) => f.y0 + slope * (x - f.x0);
  // The open flight's stringer lands on the floor at its foot rather than going through it.
  const foot = Math.max(f.y0, f.y1);
  const under = bottom === null ? [f.x1, Math.min(at(f.x1) + STRINGER, foot), f.x0, Math.min(at(f.x0) + STRINGER, foot)] : [f.x1, bottom, f.x0, bottom];
  g.poly([f.x0, at(f.x0), f.x1, at(f.x1), ...under]).fill(stone.shadow);
  const up = f.y1 < f.y0;
  const pts: number[] = [f.x0, at(f.x0)];
  for (let x = f.x0; x < f.x1 - 1; x += run) {
    const nx = Math.min(f.x1, x + run);
    // Rising to the right each tread steps up at its far end; falling, at its near end.
    if (up) pts.push(x, at(nx), nx, at(nx));
    else pts.push(x, at(x), nx, at(x));
  }
  pts.push(...under);
  g.poly(pts).fill(stone.base).stroke(INK);
  for (let x = f.x0; x < f.x1 - 1; x += run) {
    const nx = Math.min(f.x1, x + run);
    g.rect(x + 4, up ? at(nx) : at(x), nx - x - 4, 8).fill(stone.highlight);
  }
  g.moveTo(f.x0 - 10, at(f.x0) - 110).lineTo(f.x1 + 10, at(f.x1) - 110).stroke({ width: 22, color: PALETTE.outline, cap: "round" });
  g.moveTo(f.x0 - 10, at(f.x0) - 110).lineTo(f.x1 + 10, at(f.x1) - 110).stroke({ width: 15, color: stone.highlight, cap: "round" });
  for (let x = f.x0 + 30; x < f.x1; x += 70) g.rect(x - 7, at(x) - 104, 14, 104).fill(stone.base).stroke({ width: 2, color: PALETTE.outline });
}

export function campusFloor(g: Graphics, f: LevelFloor, floors: readonly LevelFloor[] = []): boolean {
  const bottom = floorBottom(f);
  switch (f.kind) {
    case "brick":
      slab(g, f, C.brick, bottom);
      for (let x = f.x0 + 60; x < f.x1; x += 120) g.moveTo(x, f.y0 - FLOOR.back).lineTo(x - 20, f.y0 + FLOOR.top).stroke({ width: 3, color: shadowOf(C.brick) });
      for (let y = f.y0 + FLOOR.top + 30; y < bottom; y += 30) g.moveTo(f.x0, y).lineTo(f.x1, y).stroke({ width: 2, color: shadowOf(C.brick), alpha: 0.6 });
      return true;
    case "terrazzo":
      slab(g, f, C.terrazzo, bottom);
      for (let x = f.x0 + 37; x < f.x1; x += 53) g.circle(x, f.y0 - 8 + ((x * 7) % 26), 3).fill(shadowOf(C.terrazzo));
      return true;
    case "stone":
      slab(g, f, C.stone, bottom);
      for (let x = f.x0 + 240; x < f.x1; x += 240) g.moveTo(x, f.y0 + FLOOR.top).lineTo(x, bottom).stroke({ width: 2, color: shadowOf(C.stone), alpha: 0.7 });
      return true;
    case "steps":
      stoneSteps(g, f, openUnder(f, floors) ? null : bottom);
      return true;
    case "belt": {
      // The tray-return conveyor: a steel truss rising under a rubber belt; its trays ride along in drawBeltTrays.
      const steel = tones(C.steel);
      g.poly([f.x0, f.y0, f.x1, f.y1, f.x1, f.y1 + 60, f.x0, f.y0 + 60]).fill(steel.base).stroke(INK);
      g.poly([f.x0, f.y0 - 4, f.x1, f.y1 - 4, f.x1, f.y1 + 14, f.x0, f.y0 + 14]).fill(C.rubber);
      for (const x of [f.x0 + 60, (f.x0 + f.x1) / 2, f.x1 - 60]) {
        const y = f.y0 + ((f.y1 - f.y0) * (x - f.x0)) / (f.x1 - f.x0);
        g.rect(x - 10, y + 60, 20, -y - 60).fill(steel.shadow).stroke(THIN);
      }
      g.moveTo(f.x0, f.y0 - 90).lineTo(f.x1, f.y1 - 90).stroke({ width: 8, color: steel.highlight, cap: "round" });
      return true;
    }
  }
  return false;
}

/** The trays riding up the conveyor this moment, sliding along at its speed. */
export function drawBeltTrays(g: Graphics, f: FloorSegment, t: number): void {
  const run = f.x1 - f.x0;
  const shift = ((((f.belt ?? 0) * t) % TRAY_GAP) + TRAY_GAP) % TRAY_GAP;
  for (let x = f.x0 + shift; x <= f.x1 - 40; x += TRAY_GAP) {
    const y = f.y0 + ((f.y1 - f.y0) * (x - f.x0)) / run;
    g.rect(x - 34, y - 14, 68, 10).fill(C.tray).stroke({ width: 2, color: PALETTE.outline });
    g.ellipse(x - 8, y - 18, 14, 5).fill("#ffffff").stroke({ width: 2, color: PALETTE.outline });
  }
}

export function campusPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  // A platform on the quad stands on the plaza; elsewhere on the floor.
  const base = p.kind === "bench" || p.kind === "fountain" || p.kind === "tier" ? Math.min(0, p.y < -250 ? -200 : 0) : 0;
  switch (p.kind) {
    case "bench": {
      // A slatted wood bench on iron legs.
      const wood = tones(C.wood);
      for (const x of [p.x0 + 20, p.x1 - 36]) g.rect(x, p.y + 10, 16, base - p.y - 10).fill(C.iron).stroke(THIN);
      g.roundRect(p.x0, p.y - 4, w, 18, 6).fill(wood.base).stroke(INK);
      g.roundRect(p.x0 + 6, p.y - 70, w - 12, 16, 6).fill(wood.shadow).stroke(THIN);
      for (const x of [p.x0 + 30, p.x1 - 40]) g.rect(x, p.y - 70, 10, 66).fill(C.iron);
      return true;
    }
    case "fountain": {
      // The fountain's stone rim, the water held inside it (the basin and the column are furniture).
      const stone = tones(C.stone);
      g.rect(p.x0, p.y, w, base - p.y).fill(stone.base).stroke(INK);
      g.rect(p.x0, p.y - 6, w, 24).fill(stone.highlight).stroke(INK);
      g.rect(p.x0 + 30, p.y + 30, w - 60, 20).fill({ color: C.water, alpha: 0.8 });
      return true;
    }
    case "tier": {
      // The fountain's upper bowl on its column.
      const stone = tones(C.stone);
      g.poly([p.x0 - 20, p.y, p.x1 + 20, p.y, p.x1 - 20, p.y + 50, p.x0 + 20, p.y + 50]).fill(stone.base).stroke(INK);
      g.rect(p.x0 - 20, p.y - 6, w + 40, 16).fill(stone.highlight).stroke(THIN);
      return true;
    }
    case "serving": {
      // A steel serving line: food pans set into its top, a tray rail along its front.
      const steel = tones(C.steel);
      g.rect(p.x0, p.y + 20, w, -p.y - 20).fill(steel.base).stroke(INK);
      g.rect(p.x0 - 10, p.y - 6, w + 20, 26).fill(steel.highlight).stroke(INK);
      g.rect(p.x0 - 20, p.y + 40, w + 40, 12).fill(steel.shadow).stroke(THIN);
      const foods = ["#f1e3b5", "#7fb24a", "#c8443a", "#d9a441"];
      for (let x = p.x0 + 30, k = 0; x < p.x1 - 120; x += 150, k++) g.rect(x, p.y - 4, 120, 10).fill(foods[k % foods.length]);
      return true;
    }
    case "tray": {
      // The tray return: a low steel counter where the trays go onto the belt.
      const steel = tones(C.steel);
      g.rect(p.x0, p.y + 16, w, -p.y - 16).fill(steel.base).stroke(INK);
      g.rect(p.x0 - 8, p.y - 6, w + 16, 22).fill(steel.highlight).stroke(INK);
      for (let k = 0; k < 3; k++) g.rect(p.x0 + 30, p.y - 14 - k * 10, 90, 8).fill(C.tray).stroke({ width: 2, color: PALETTE.outline });
      return true;
    }
    case "deck": {
      // The seating deck: a wood slab on steel columns, a glass railing with a steel cap.
      const wood = tones(C.wood);
      const steel = tones(C.steel);
      for (let x = p.x0 + 200; x < p.x1 - 100; x += 700) g.rect(x - 30, p.y + 44, 60, -p.y - 44).fill(steel.base).stroke(THIN);
      g.rect(p.x0, p.y + 44, w, 40).fill({ color: PALETTE.outline, alpha: 0.25 });
      g.rect(p.x0, p.y, w, 44).fill(wood.base).stroke(INK);
      g.rect(p.x0, p.y, w, 12).fill(wood.highlight);
      g.rect(p.x0, p.y - 110, w, 110).fill({ color: "#a9c7cf", alpha: 0.25 });
      g.roundRect(p.x0, p.y - 116, w, 12, 5).fill(steel.highlight).stroke(THIN);
      for (let x = p.x0 + 20; x <= p.x1 - 20; x += 200) g.rect(x - 3, p.y - 110, 6, 110).fill(steel.base);
      return true;
    }
    case "ledge": {
      // A stone plinth beside the steps with a planter on it.
      const stone = tones(C.stone);
      g.rect(p.x0, p.y, w, 60).fill(stone.base).stroke(INK);
      g.rect(p.x0 - 8, p.y - 6, w + 16, 18).fill(stone.highlight).stroke(THIN);
      g.rect(p.x0 + 20, p.y + 60, w - 40, 120).fill(stone.shadow).stroke(THIN);
      return true;
    }
  }
  return false;
}

export function campusFurniture(g: Graphics, f: Furniture): boolean {
  switch (f.kind) {
    case "lampPost": {
      const cx = f.x + f.w / 2;
      g.rect(cx - 8, f.y + 40, 16, f.h - 40).fill(C.iron).stroke(THIN);
      g.rect(cx - 22, f.y + f.h - 30, 44, 30).fill(C.iron).stroke(THIN);
      g.circle(cx, f.y + 20, 30).fill("#fff3cf").stroke(THIN);
      return true;
    }
    case "fountain": {
      // The basin's back wall and the column carrying the tier, water arcing off it.
      const stone = tones(C.stone);
      const cx = f.x + f.w / 2;
      g.rect(f.x + 40, f.y + f.h - 160, f.w - 80, 70).fill(stone.shadow).stroke(THIN);
      g.rect(cx - 40, f.y + 60, 80, f.h - 60).fill(stone.base).stroke(INK);
      for (const d of [-1, 1]) g.moveTo(cx + d * 70, f.y + 20).quadraticCurveTo(cx + d * 220, f.y + 10, cx + d * 300, f.y + f.h - 120).stroke({ width: 8, color: C.water, alpha: 0.75, cap: "round" });
      return true;
    }
    case "sneeze": {
      // The sneeze guard: glass panes on steel posts over the back of the serving line.
      const steel = tones(C.steel);
      for (let x = f.x + 40; x < f.x + f.w; x += 350) g.rect(x, f.y, 10, f.h).fill(steel.shadow);
      g.poly([f.x, f.y, f.x + f.w, f.y, f.x + f.w, f.y + 30, f.x, f.y + 30]).fill({ color: "#a9c7cf", alpha: 0.35 }).stroke(THIN);
      return true;
    }
    case "slot": {
      // The dish room's window at the conveyor's top: a dark opening in a steel frame, a light over it.
      const steel = tones(C.steel);
      g.rect(f.x - 20, f.y - 20, f.w + 40, f.h + 20).fill(steel.base).stroke(INK);
      g.rect(f.x, f.y, f.w, f.h).fill("#1c1f24");
      g.ellipse(f.x + f.w / 2, f.y - 30, 60, 12).fill({ color: "#fff3cf", alpha: 0.8 });
      return true;
    }
  }
  return false;
}
