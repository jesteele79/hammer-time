/** Game feel (spec §9). World px and seconds; y is down, the floor is at 0. */
export const STEP = 1 / 120;

export const GRAVITY_UP = 3300;
export const GRAVITY_DOWN = 4600;
/** Gravity multiplier near the top of a jump… */
export const APEX_FLOAT = 0.5;
/** …while |vy| is under this. */
export const APEX_BAND = 160;
/** 1520 in the spec's table; 1620 clears the spec's 1.15 heights once the 120 Hz step and the apex float are accounted for. */
export const JUMP_V0 = 1620;
export const JUMP_CUT = 620;
/** Terminal fall speed: 21.7 px a step, so no fall passes through a solid or a pass. */
export const MAX_FALL = 2600;

export const WALK = 400;
/** 640 in the spec's table; 780 crosses the 1920 px design screen in 2.6 s from a standing start, acceleration included (§9's target). */
export const RUN = 780;
export const ACCEL_GROUND = 4400;
export const ACCEL_AIR = 2600;
export const FRICTION = 5600;
export const COYOTE = 0.1;
export const BUFFER = 0.12;

export const SLIDE_START = 800;
export const SLIDE_END = 480;
/** The slide bleeds from SLIDE_START to SLIDE_END in half a second. */
export const SLIDE_DECEL = 640;
export const CROUCH_WALK = 240;

export const HERO_W = 110;
export const HERO_H = 300;
export const HERO_CROUCH_H = 200;
/** How far the feet point may hang past a floor's end and still stand. */
export const LEDGE = HERO_W / 4;
/** How far the feet may be above the floor and still stick to it (walking down a slope). */
export const SNAP = 24;
export const LAND_T = 0.09;
/** Head height as a fraction of HERO_HEIGHT: the owner kept 0.26 on 2026-10-10. The sim samples the mallet at this scale. */
export const HEAD_SCALE = 0.26;
/** A fall this far above the level's bottom edge is gone: off the screen by then (him, the cast and the carts). */
export const FALL_MARGIN = 200;
