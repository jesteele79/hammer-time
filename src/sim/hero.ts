import {
  ACCEL_AIR,
  ACCEL_GROUND,
  APEX_BAND,
  APEX_FLOAT,
  BUFFER,
  COYOTE,
  CROUCH_WALK,
  FRICTION,
  GRAVITY_DOWN,
  GRAVITY_UP,
  HERO_CROUCH_H,
  HERO_H,
  HERO_W,
  JUMP_CUT,
  JUMP_V0,
  LAND_T,
  MAX_FALL,
  RUN,
  SLIDE_DECEL,
  SLIDE_END,
  SLIDE_START,
  WALK,
} from "./constants";
import type { GameEvent } from "./events";
import type { Input } from "./input";
import { HEAT, SINUS_MAX, TIRED } from "./moves";
import { canStand, moveBody } from "./physics";
import type { HeroMotion, HeroState, Point, Stage } from "./types";

export type HeroOptions = { heat?: number; charge?: number; hot?: boolean };

export function createHero(spawn: Point, opts: HeroOptions = {}): HeroState {
  return {
    x: spawn.x,
    y: spawn.y,
    w: HERO_W,
    h: HERO_H,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    crouch: false,
    slideT: 0,
    coyote: 0,
    buffer: 0,
    state: "idle",
    stateT: 0,
    animT: 0,
    move: null,
    heat: opts.heat ?? 0,
    sinus: SINUS_MAX,
    charge: opts.charge ?? 0,
    hot: opts.hot ?? false,
    fireCd: 0,
    boiled: false,
  };
}

/** Moves `v` toward `target` by at most `step`. */
const approach = (v: number, target: number, step: number) =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step);

export function stepHero(h: HeroState, stage: Stage, input: Input, dt: number, events: GameEvent[] = []): void {
  const { held, pressed } = input;
  // The towel holds him still: no steering and no jump until it is done.
  const locked = h.move?.kind === "wipe";
  const dir = locked ? 0 : (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (dir !== 0) h.facing = dir > 0 ? 1 : -1;

  h.coyote = h.onGround ? COYOTE : Math.max(0, h.coyote - dt);
  h.buffer = pressed.jump && !locked ? BUFFER : locked ? 0 : Math.max(0, h.buffer - dt);

  if (h.onGround && h.slideT <= 0) {
    if (held.down && !h.crouch) {
      h.crouch = true;
      h.h = HERO_CROUCH_H;
      if (Math.abs(h.vx) > WALK) {
        h.vx = SLIDE_START * h.facing;
        h.slideT = (SLIDE_START - SLIDE_END) / SLIDE_DECEL;
        events.push({ type: "slide" });
      }
    } else if (!held.down && h.crouch && canStand(h, stage, HERO_H)) {
      h.crouch = false;
      h.h = HERO_H;
    }
  }

  if (h.slideT > 0) {
    h.vx = approach(h.vx, SLIDE_END * h.facing, SLIDE_DECEL * dt);
    h.slideT -= dt;
    if (Math.abs(h.vx) <= SLIDE_END) h.slideT = 0;
  } else {
    const tired = h.heat >= HEAT.tired;
    const cap = h.crouch ? CROUCH_WALK : held.run ? RUN * (tired ? TIRED.run : 1) : WALK * (tired ? TIRED.walk : 1);
    if (dir !== 0 && Math.abs(h.vx) <= cap) {
      h.vx = approach(h.vx, dir * cap, (h.onGround ? ACCEL_GROUND : ACCEL_AIR) * dt);
    } else if (h.onGround) {
      // Over the cap, or nothing held: friction brings him back to the cap or to rest.
      h.vx = approach(h.vx, dir !== 0 ? dir * cap : 0, FRICTION * dt);
    }
  }

  // The cut comes before the jump starts, so a tap always gets its first full step of rise.
  if (!held.jump && h.state === "jump" && h.vy < -JUMP_CUT) h.vy = -JUMP_CUT;
  const canJump = h.onGround || (h.coyote > 0 && h.state !== "jump");
  if (h.buffer > 0 && canJump && (!h.crouch || canStand(h, stage, HERO_H))) {
    h.crouch = false;
    h.h = HERO_H;
    h.slideT = 0;
    h.vy = -JUMP_V0;
    h.onGround = false;
    h.coyote = 0;
    h.buffer = 0;
    h.state = "jump";
    h.stateT = 0;
    h.heat = Math.min(100, h.heat + HEAT.jump);
    events.push({ type: "jump" });
  }

  let g = h.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN;
  if (Math.abs(h.vy) < APEX_BAND && !h.onGround) g *= APEX_FLOAT;
  h.vy = Math.min(MAX_FALL, h.vy + g * dt);

  moveBody(h, stage, dt);

  const prev = h.state;
  let next: HeroMotion;
  if (!h.onGround) next = h.vy < 0 ? "jump" : "fall";
  else if (prev === "jump" || prev === "fall") {
    next = "land";
    events.push({ type: "land", x: h.x, y: h.y });
  }
  else if (prev === "land" && h.stateT < LAND_T) next = "land";
  else if (h.slideT > 0) next = "slide";
  else if (h.crouch) next = "crouch";
  else if (Math.abs(h.vx) > (WALK + RUN) / 2) next = "run";
  else if (Math.abs(h.vx) > 10) next = "walk";
  else next = "idle";
  if (next !== prev) {
    h.state = next;
    h.stateT = 0;
    h.animT = 0;
  } else {
    h.stateT += dt;
    h.animT += dt;
  }
}
