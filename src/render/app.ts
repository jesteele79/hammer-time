import { Application, RendererType, type Ticker } from "pixi.js";

export type Quality = "ultra" | "high" | "medium" | "low";
export type RenderApp = {
  app: Application;
  quality: Quality;
  rendererType: "webgpu" | "webgl";
  frameMs: number;
  fps: number;
  setQuality(q: Quality): void;
  onQuality: (q: Quality) => void;
  destroy(): void;
};

const ORDER: Quality[] = ["ultra", "high", "medium", "low"];
const DPR: Record<Quality, number> = { ultra: 2, high: 2, medium: 1, low: 1 };

export type NextProbe = {
  renderer: string;
  quality: Quality;
  frameMs: number;
  fps: number;
  /** Distinct coarse colors in a 1/20-scale read of the stage: the "is anything drawn" probe. */
  sample: () => number;
  /** Set by the look scene once it runs. */
  hero?: { state: string; x: number; y: number; vx: number; onGround: boolean };
  heroScreenHeight?: number;
  art?: { heads: number; bodies: number };
};
declare global {
  interface Window {
    __next?: NextProbe;
  }
}

/** Boots Pixi on the host, watches frame time, and steps the quality down when it slips. */
export async function createRenderApp(
  host: HTMLElement,
  opts: { preference?: "webgpu" | "webgl" } = {},
): Promise<RenderApp> {
  const app = new Application();
  let quality: Quality = readForcedQuality() ?? "ultra";
  await app.init({
    preference: opts.preference ?? "webgpu",
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, DPR[quality]),
    resizeTo: host,
    background: "#0d1118",
    powerPreference: "high-performance",
  });
  host.appendChild(app.canvas);
  const rendererType = app.renderer.type === RendererType.WEBGPU ? "webgpu" : "webgl";
  const probe: NextProbe = {
    renderer: rendererType,
    quality,
    frameMs: 0,
    fps: 0,
    sample: () => {
      // Only the visible screen: the stage's own bounds span the whole level.
      const { pixels } = app.renderer.extract.pixels({ target: app.stage, frame: app.screen, resolution: 0.05 });
      const seen = new Set<number>();
      for (let i = 0; i < pixels.length; i += 4)
        seen.add((pixels[i] >> 4) * 4096 + (pixels[i + 1] >> 4) * 256 + (pixels[i + 2] >> 4));
      return seen.size;
    },
  };
  const out: RenderApp = {
    app,
    quality,
    rendererType,
    frameMs: 0,
    fps: 0,
    onQuality: () => {},
    setQuality(q) {
      quality = out.quality = q;
      app.renderer.resolution = Math.min(window.devicePixelRatio || 1, DPR[q]);
      app.renderer.resize(host.clientWidth, host.clientHeight);
      out.onQuality(q);
    },
    destroy() {
      app.ticker.remove(watch);
      app.destroy(true, { children: true, texture: true });
      delete window.__next;
    },
  };
  // Frame-time watch: a 1 s average over 15 ms steps the tier down once, never up.
  let acc = 0,
    n = 0,
    settle = 2;
  const watch = (t: Ticker) => {
    acc += t.deltaMS;
    n++;
    if (acc < 1000) return;
    out.frameMs = acc / n;
    out.fps = Math.round(1000 / out.frameMs);
    if (settle > 0) settle--;
    else if (out.frameMs > 15 && !readForcedQuality()) {
      const i = ORDER.indexOf(quality);
      if (i < ORDER.length - 1) out.setQuality(ORDER[i + 1]);
    }
    probe.quality = out.quality;
    probe.frameMs = out.frameMs;
    probe.fps = out.fps;
    acc = 0;
    n = 0;
  };
  app.ticker.add(watch);
  window.__next = probe;
  return out;
}

function readForcedQuality(): Quality | null {
  try {
    const q = localStorage.getItem("hammer-time-quality") as Quality | null;
    return q && ORDER.includes(q) ? q : null;
  } catch {
    return null;
  }
}
