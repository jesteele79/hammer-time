import { HERO_H } from "./constants";
import type { GameEvent } from "./events";
import { GRACE, newMove } from "./moves";
import { canStand } from "./physics";
import type { HeroState, Stage } from "./types";

/** Hammer on damage (spec §9: 540 back, 500 up) and the hurt face's 0.6 s (§6.1). */
export const HURT = { back: 540, up: 500, face: 0.6 } as const;
/** The last pip: thrown higher, off his feet. */
export const KNOCKDOWN = { back: 540, up: 900 } as const;
/** The shipped patience: form + 1. */
export const PATIENCE_MAX = 3;

/**
 * A hit from something at `fromX`. In grace or already down it does nothing. Otherwise it costs a
 * patience pip, ends whatever he was doing, drops hot snot (the shipped game's lost form), turns
 * him to face what hit him and throws him back: hurt, or on the last pip the tumble. A doggy bag
 * catches the last pip: he eats his leftovers instead, and is only hurt, with full patience and the
 * pepper (owner, 2026-10-18); `bag: false` (the clock running out) leaves the bag alone.
 */
export function damage(h: HeroState, stage: Stage, fromX: number, events: GameEvent[], bag = true): boolean {
  if (h.invuln > 0 || h.move?.kind === "tumble") return false;
  const facing: 1 | -1 = fromX >= h.x ? 1 : -1;
  const dir: 1 | -1 = facing === 1 ? -1 : 1;
  const saved = bag && h.patience <= 1 && h.doggy > 0;
  const down = h.patience <= 1 && !saved;
  h.facing = facing;
  h.patience = saved ? PATIENCE_MAX : Math.max(0, h.patience - 1);
  h.hot = saved;
  if (saved) {
    h.doggy--;
    events.push({ type: "doggyBag", x: h.x, y: h.y - h.h });
  }
  h.hurtT = HURT.face;
  h.invuln = GRACE;
  h.slideT = 0;
  h.buffer = 0;
  if (h.crouch && canStand(h, stage, HERO_H)) {
    h.crouch = false;
    h.h = HERO_H;
  }
  const kick = down ? KNOCKDOWN : HURT;
  h.move = newMove(down ? "tumble" : "hurt");
  h.vx = dir * kick.back;
  h.vy = -kick.up;
  h.onGround = false;
  const at = { x: h.x, y: h.y - h.h / 2, dir };
  if (down) events.push({ type: "tumble", ...at });
  else events.push({ type: "hurt", ...at });
  return true;
}
