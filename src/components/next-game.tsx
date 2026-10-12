import { useEffect, useRef, useState } from "react";
import type { HudPayload } from "@/render/hud";
import { NextHud } from "./next-hud";

/** The rebuild's canvas. Pixi is browser-only, so everything loads after mount. */
export function NextGame({
  forceWebgl = false,
  noart = false,
  board = false,
  dev = false,
}: {
  forceWebgl?: boolean;
  noart?: boolean;
  board?: boolean;
  /** The checks' switch: a practice hit on G and a teleport on the probe. */
  dev?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudPayload | null>(null);
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
      const look = await startLook(render, { noart, board, dev, onHud: setHud });
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
  }, [forceWebgl, noart, board, dev]);
  return (
    <>
      <div ref={host} className="next-stage" style={{ position: "fixed", inset: 0, background: "#0d1118" }} />
      <NextHud hud={hud} />
    </>
  );
}
