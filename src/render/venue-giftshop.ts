import type { Graphics } from "pixi.js";
import type { Furniture, LevelFloor, LevelPlatform } from "../sim/level";
import { FLOOR, INK, THIN } from "./ink";
import { shadowOf, tones } from "./palette";

const CARPET = tones("#5d6470");
const SHELF = tones("#7a5236");
const GLASS = "#a9c7d6";
const PLUSH = ["#d9a066", "#f2f0ea", "#f3a6bd", "#f2d36b", "#a9a9b3"];

/** The grey carpet, with its front edge and a faint weave; false for any other floor. */
export function giftshopFloor(g: Graphics, f: LevelFloor): boolean {
  if (f.kind !== "carpet") return false;
  const w = f.x1 - f.x0;
  g.rect(f.x0, f.y0, w, FLOOR.depth).fill(CARPET.base);
  for (let x = f.x0; x < f.x1; x += 48) g.rect(x, f.y0 + 6, 2, FLOOR.depth - 12).fill({ color: CARPET.shadow, alpha: 0.35 });
  g.rect(f.x0, f.y0, w, 8).fill(CARPET.highlight);
  g.moveTo(f.x0, f.y0).lineTo(f.x1, f.y0).stroke(INK);
  return true;
}

/** A plush shelf (its top a platform, a row of plush on each board) or the till (glass-fronted, the register at one end). */
export function giftshopPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  const h = -p.y;
  if (p.kind === "plush") {
    g.rect(p.x0, p.y, w, h).fill(SHELF.shadow).stroke(INK);
    g.rect(p.x0 - 10, p.y - 14, w + 20, 18).fill(SHELF.highlight).stroke(INK);
    for (let board = p.y + h / 2; board < 0; board += h / 2) g.rect(p.x0, board, w, 12).fill(SHELF.base).stroke(THIN);
    // The plush sits on the boards below the top: what stands on the top is him.
    for (let row = 1; row <= 2; row++)
      for (let x = p.x0 + 40, i = 0; x < p.x1 - 30; x += 70, i++) {
        const y = p.y + (h / 2) * row - 4;
        if (y > -20) continue;
        const c = PLUSH[(i + row) % PLUSH.length];
        g.circle(x, y - 26, 24).fill(c).stroke(THIN);
        g.circle(x - 15, y - 48, 9).fill(c).stroke(THIN);
        g.circle(x + 15, y - 48, 9).fill(c).stroke(THIN);
      }
    return true;
  }
  if (p.kind === "till") {
    g.rect(p.x0, p.y, w, h).fill(SHELF.base).stroke(INK);
    g.rect(p.x0 + 20, p.y + 26, w - 40, h - 56).fill({ color: GLASS, alpha: 0.55 }).stroke(THIN);
    g.rect(p.x0 - 12, p.y - 12, w + 24, 16).fill(SHELF.highlight).stroke(INK);
    const rx = p.x1 - 140;
    g.roundRect(rx, p.y - 92, 110, 80, 10).fill("#2b2f36").stroke(INK);
    g.rect(rx + 14, p.y - 82, 82, 26).fill("#7fd1a8").stroke(THIN);
    return true;
  }
  return false;
}

/** The spotlight pooled on the carpet in the middle of the arena; false for any other furniture. */
export function giftshopFurniture(g: Graphics, f: Furniture): boolean {
  if (f.kind !== "spotlight") return false;
  const cx = f.x + f.w / 2;
  for (let i = 0; i < 6; i++) g.ellipse(cx, f.y + 10, (f.w / 2) * (1 - i * 0.14), 70 * (1 - i * 0.12)).fill({ color: "#ffe7f0", alpha: 0.05 });
  g.poly([cx - 160, f.y - f.h, cx + 160, f.y - f.h, cx + f.w / 2, f.y, cx - f.w / 2, f.y]).fill({ color: shadowOf("#ffe7f0"), alpha: 0.04 });
  return true;
}
