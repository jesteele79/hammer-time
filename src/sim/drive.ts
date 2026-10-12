import { emptyInput, type Input } from "./input";
import { stageOf, type Level } from "./level";
import { floorAt } from "./physics";
import type { HeroState } from "./types";

/** How far ahead the scripted player looks for a gap, a wall or the landing. */
const LOOK = { gap: 220, wall: 260, landing: 200, pass: 300 } as const;

/**
 * A scripted player for the traversal test: run right, hop gaps and walls, slide the passes, and
 * at the stairs either hop onto the landing (the balcony route) or run on under it (the floor).
 */
export function drive(level: Level, h: HeroState, route: "floor" | "balcony"): Input {
  const i = emptyInput();
  i.held.right = i.held.run = true;
  const stage = stageOf(level);
  const gap = h.onGround && floorAt(stage, h.x + LOOK.gap, h.y - 60) === null;
  const wall = level.solids.some((s) => s.x - h.x > 0 && s.x - h.x < LOOK.wall && s.y < h.y - 10 && s.y + s.h > h.y - 290);
  const landing =
    route === "balcony" && h.y === 0 && level.platforms.some((p) => p.kind === "landing" && p.x0 - h.x > 0 && p.x0 - h.x < LOOK.landing);
  const pass = level.passes.some((p) => p.x - h.x > -p.w && p.x - h.x < LOOK.pass);
  if (pass) i.held.down = true;
  if ((wall || gap || landing) && h.onGround && !pass) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  return i;
}
