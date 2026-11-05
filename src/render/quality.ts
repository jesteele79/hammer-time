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

/** The 3D view's own tiers (plan decision 14): it gives up density first, then antialiasing, then the bloom, the ink last. */
export type Tier3d = { density: number; aa: number; bloom: boolean; ink: boolean };
export const TIERS3D: Record<"ultra" | "high" | "medium" | "low", Tier3d> = {
  ultra: { density: 1.5, aa: 4, bloom: true, ink: true },
  high: { density: 1.25, aa: 4, bloom: true, ink: true },
  medium: { density: 1, aa: 2, bloom: false, ink: true },
  low: { density: 0.75, aa: 0, bloom: false, ink: false },
};
/** The density a tier draws at: only an NVIDIA card gets 2 at ultra (the spike's integrated card fell to 21 fps there). */
export const density3dFor = (q: keyof typeof TIERS3D, gpu: string): number => (q === "ultra" && /NVIDIA|GeForce|RTX/i.test(gpu) ? 2 : TIERS3D[q].density);

/** The rate the 3D view holds before it gives up a tier, whatever the display's own rate: a 120 Hz screen need not be matched. */
export const THREE_FPS_FLOOR = 55;
/** Whether a window asks the 3D view for the next tier down: too much work, or under its floor. */
export const shouldStepDown3d = (sample: { workMs: number; intervalMs: number }): boolean => shouldStepDown({ workMs: sample.workMs, intervalMs: sample.intervalMs, refreshMs: 1000 / THREE_FPS_FLOOR / DROP_RATIO });

/** A real video card by its adapter's or renderer's name (story spec §15): NVIDIA, AMD and Intel Arc. */
export const isDesktopGpu = (name: string): boolean => /NVIDIA|GeForce|RTX|Radeon|AMD|Arc\b/i.test(name);
/** The same from everything a browser tells of its card: WebGPU may say Intel Arc only as vendor "intel", architecture "xe-hpg". */
export const gpuClassOf = (info: { name?: string; vendor?: string; architecture?: string }): "desktop" | "other" =>
  isDesktopGpu(info.name ?? "") || isDesktopGpu(info.vendor ?? "") || (/intel/i.test(info.vendor ?? "") && /xe-hpg|xe2|arc/i.test(info.architecture ?? "")) ? "desktop" : "other";

/** Auto's one pick once the governor has settled: ultra on a desktop card holding 58 fps or better, high otherwise. */
export const firstTier = (gpu: "desktop" | "other", fps: number): "ultra" | "high" => (gpu === "desktop" && fps >= 58 ? "ultra" : "high");
