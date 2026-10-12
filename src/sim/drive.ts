import { ROLLING, hittable, npcRect, standing } from "./cast";
import { attacking } from "./cast-behavior";
import { overlapsRect } from "./geometry";
import { emptyInput, type Input } from "./input";
import { stageOf, type Level } from "./level";
import { lectureReach } from "./moves";
import { floorAt } from "./physics";
import type { HeroState } from "./types";
import type { World } from "./world";

/** How far ahead the scripted player looks for a gap, a wall or the landing. */
const LOOK = { gap: 220, wall: 260, landing: 200, pass: 300 } as const;
/** How far ahead it sees trouble: staff to bonk, a cart to jump, a plane to swat. */
const FIGHT = { staff: 420, cart: 520, plane: 300 } as const;

/**
 * A scripted player for the traversal test: run right, hop gaps and walls, slide the passes, and
 * at the stairs either hop onto the landing (the balcony route) or run on under it (the floor).
 * With a world it also fights what is in front of it.
 */
export function drive(level: Level, h: HeroState, route: "floor" | "balcony", world?: World): Input {
  const i = emptyInput();
  i.held.right = i.held.run = true;
  const stage = stageOf(level);
  const gap = h.onGround && floorAt(stage, h.x + LOOK.gap, h.y - 60) === null;
  const wall = level.solids.some((s) => s.x - h.x > 0 && s.x - h.x < LOOK.wall && s.y < h.y - 10 && s.y + s.h > h.y - 290);
  const landing =
    route === "balcony" && h.y === 0 && level.platforms.some((p) => p.kind === "landing" && p.x0 - h.x > 0 && p.x0 - h.x < LOOK.landing);
  const pass = level.passes.some((p) => p.x - h.x > -p.w && p.x - h.x < LOOK.pass);
  if (world) fight(world, h, i);
  if (pass) i.held.down = true;
  if ((wall || gap || landing || i.pressed.jump) && h.onGround && !pass) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  return i;
}

/** Fights what is in front of him: a swing at staff or a plane within reach, a jump over a cart rolling at him, a lecture at students. */
function fight(w: World, h: HeroState, i: Input): void {
  if (h.move) return;
  const ahead = (x: number, within: number) => (x - h.x) * h.facing > 0 && Math.abs(x - h.x) < within;
  const level = (y: number) => Math.abs(y - h.y) < 80;
  const staff = w.cast.some(
    (n) => n.alive && n.role !== "student" && hittable(n) && (attacking(n, h) || n.act === "windup" || standing(n)) && ahead(n.x, FIGHT.staff) && level(n.y),
  );
  const plane = w.missiles.some((m) => ahead(m.x, FIGHT.plane) && Math.abs(m.y - (h.y - h.h * 0.6)) < 200);
  const cart = w.targets.some((t) => ahead(t.x, FIGHT.cart) && Math.abs(t.vx) >= ROLLING && (h.x - t.x) * t.vx > 0 && level(t.y));
  const students = w.cast.filter((n) => n.alive && n.role === "student" && n.act !== "schooled" && overlapsRect(lectureReach(h), npcRect(n)));
  if (cart && h.onGround) {
    i.pressed.jump = true;
    return;
  }
  if (students.length && h.lectureCd <= 0 && h.onGround) {
    i.held.lecture = i.pressed.lecture = true;
    return;
  }
  if (staff || plane) i.held.hammer = i.pressed.hammer = true;
}
