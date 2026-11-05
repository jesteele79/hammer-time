import type { Graphics } from "pixi.js";
import type { Level } from "../sim/level";
import { INK, THIN } from "./ink";

/** The suite's stand-in colors, for a level drawn with no painting at all (\`&noart=1\`). */
const C = { wall: "#a78a60", sky: "#0a0d1e", wood: "#4a2a14", cloth: "#2a3a60", white: "#e8e2d4", brass: "#c9a24a" } as const;

/** Without its paintings the suite still has its three rooms and the furniture he stands on. */
export function drawSuiteStandIn(g: Graphics, level: Level) {
  for (const r of level.rooms ?? []) g.rect(r.x0, -800, r.x1 - r.x0, 800).fill(r.id === "balcony" ? C.sky : C.wall);
  for (const p of level.platforms) {
    const w = p.x1 - p.x0;
    const color = p.kind === "bed" ? C.white : p.kind === "sofa" ? C.cloth : C.wood;
    if (p.kind === "rail") {
      g.rect(3200, p.y, 1600, 10).fill(C.brass);
      continue;
    }
    g.rect(p.x0, p.y, w, -p.y).fill(color).rect(p.x0, p.y, w, -p.y).stroke(p.kind === "bed" ? INK : THIN);
  }
}
