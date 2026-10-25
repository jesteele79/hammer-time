import { HERO_HEIGHT } from "../../sim/rig/skeleton";
import { HERO_SCREEN_FRACTION, PORTRAIT_ZOOM } from "../scene";

/**
 * The banquet's world on screen (R4 §2), everyone at twice their shift size: the whole table and its cloth (the hem in
 * front at 277 + 370), Hammer and the nurse at its ends (feet at 370, heads 680 up), the far side's heads (feet at 78,
 * the tallest 720 up), and the chute, with a margin. World px.
 */
export const BANQUET_FRAME = { x: -1060, y: -700, w: 2120, h: 1380 } as const;

/**
 * Where the camera looks and the zoom for the frame to fill the screen between the bars: `top` and `bottom` are the CSS
 * px the HUD's top bar and the touch pad (or the hint line) take.
 */
export function banquetFrame(width: number, height: number, insets: { top: number; bottom: number }): { x: number; y: number; zoom: number } {
  return fitFrame(BANQUET_FRAME, width, height, insets);
}

/** The camera that fits a world frame to the screen between the bars, its middle in the middle of the room between them. */
export function fitFrame(frame: { x: number; y: number; w: number; h: number }, width: number, height: number, insets: { top: number; bottom: number }): { x: number; y: number; zoom: number } {
  const room = Math.max(1, height - insets.top - insets.bottom);
  const scale = Math.min(width / frame.w, room / frame.h);
  const portrait = width < height ? PORTRAIT_ZOOM : 1;
  return {
    x: frame.x + frame.w / 2,
    y: frame.y + frame.h / 2 - (insets.top - insets.bottom) / 2 / scale,
    zoom: (scale * HERO_HEIGHT) / (HERO_SCREEN_FRACTION * height * portrait),
  };
}
