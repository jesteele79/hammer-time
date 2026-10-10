import { useEffect, useRef } from "react";

/** The rebuild's canvas. Pixi is browser-only, so everything loads after mount. */
export function NextGame({ forceWebgl = false }: { forceWebgl?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { createRenderApp } = await import("@/render/app");
      const { startLook } = await import("@/render/look");
      if (cancelled || !host.current) return;
      const render = await createRenderApp(host.current, {
        preference: forceWebgl ? "webgl" : "webgpu",
      });
      if (cancelled) return render.destroy();
      const look = startLook(render);
      dispose = () => {
        look.stop();
        render.destroy();
      };
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [forceWebgl]);
  return (
    <div
      ref={host}
      className="next-stage"
      style={{ position: "fixed", inset: 0, background: "#0d1118" }}
    />
  );
}
