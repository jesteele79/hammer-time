import { useEffect, useRef } from "react";

/** The rebuild's canvas. Pixi is browser-only, so everything loads after mount. */
export function NextGame({
  forceWebgl = false,
  noart = false,
  board = false,
}: {
  forceWebgl?: boolean;
  noart?: boolean;
  board?: boolean;
}) {
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
      const look = await startLook(render, { noart, board });
      if (cancelled) {
        look.stop();
        return render.destroy();
      }
      dispose = () => {
        look.stop();
        render.destroy();
      };
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [forceWebgl, noart, board]);
  return (
    <div
      ref={host}
      className="next-stage"
      style={{ position: "fixed", inset: 0, background: "#0d1118" }}
    />
  );
}
