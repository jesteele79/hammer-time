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

export type Tier = { dpr: number; particles: number; bloom: boolean; glows: boolean; rim: boolean };
/**
 * What each tier draws (plan decision 10): ultra keeps the screen's density up to 2 and 900 particles with the lamp bloom
 * and the rim light; high a density up to 1.5 and 600; medium 1 and 400 without the bloom; low 300, no glows, no rim.
 */
export const TIERS: Record<"ultra" | "high" | "medium" | "low", Tier> = {
  ultra: { dpr: 2, particles: 900, bloom: true, glows: true, rim: true },
  high: { dpr: 1.5, particles: 600, bloom: true, glows: true, rim: true },
  medium: { dpr: 1, particles: 400, bloom: false, glows: true, rim: true },
  low: { dpr: 1, particles: 300, bloom: false, glows: false, rim: false },
};

/** A real video card by its adapter's or renderer's name (story spec §15): NVIDIA, AMD and Intel Arc. */
export const isDesktopGpu = (name: string): boolean => /NVIDIA|GeForce|RTX|Radeon|AMD|Arc\b/i.test(name);

/** Auto's one pick once the governor has settled: ultra on a desktop card holding 58 fps or better, high otherwise. */
export const firstTier = (gpu: "desktop" | "other", fps: number): "ultra" | "high" => (gpu === "desktop" && fps >= 58 ? "ultra" : "high");
