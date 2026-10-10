/** Frame work a tier may spend before the renderer steps down (spec §5.2's 15 ms). */
export const WORK_BUDGET_MS = 15;
/** Frames arriving this much later than the display's own interval count as dropped. */
export const DROP_RATIO = 1.5;

/**
 * Whether a one-second window asks for the next tier down. `workMs` is the
 * average time spent per frame, `intervalMs` the average time between frames,
 * `refreshMs` the display's interval: vsync alone never trips the governor.
 */
export function shouldStepDown(sample: { workMs: number; intervalMs: number; refreshMs: number }): boolean {
  return sample.workMs > WORK_BUDGET_MS || sample.intervalMs > sample.refreshMs * DROP_RATIO;
}

/** The display interval a window of frame intervals implies: the fastest tenth, never under 4 ms. */
export function refreshFrom(intervals: number[]): number {
  if (!intervals.length) return 16.7;
  const sorted = [...intervals].sort((a, b) => a - b);
  return Math.max(4, sorted[Math.floor(sorted.length * 0.1)]);
}
