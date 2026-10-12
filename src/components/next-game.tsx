import { useCallback, useEffect, useRef, useState } from "react";
import type { HudPayload } from "@/render/hud";
import type { Look } from "@/render/look";
import type { GameMode } from "@/sim/game";
import type { Action } from "@/sim/input";
import { NextHud } from "./next-hud";
import { NextTouch } from "./next-touch";
import { NextVeil } from "./next-veil";

/** Where the rebuild keeps its best score, apart from the shipped game's. */
const BEST_KEY = "hammer-time-best-next";
const TOUCH_QUERY = "(pointer: coarse), (max-width: 899px)";

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeBest = (n: number) => {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    // Private windows refuse storage; the best lasts the session.
  }
};

/** True while the media query matches: the touch pad shows on phones and touch screens. */
function useMedia(query: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = matchMedia(query);
    const update = () => setOn(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return on;
}

/** The rebuild's canvas and its shell: the HUD, the cards and the touch pad. Pixi is browser-only, so everything loads after mount. */
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
  const look = useRef<Look | null>(null);
  const hudNow = useRef<HudPayload | null>(null);
  const lastMode = useRef<GameMode | null>(null);
  const [hud, setHud] = useState<HudPayload | null>(null);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [back, setBack] = useState(false);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const [place, setPlace] = useState<"top" | "bottom">("bottom");
  const touch = useMedia(TOUCH_QUERY);
  const carded = mode === "card" || mode === "pause" || mode === "over" || mode === "clear";

  // While a card shows, keep it in the half of the screen away from his face (he may lie low after a fall).
  useEffect(() => {
    if (!carded) return;
    const update = () => {
      const f = look.current?.face();
      if (f) setPlace(f.y + f.h / 2 > innerHeight / 2 ? "top" : "bottom");
    };
    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [carded, mode]);

  useEffect(() => setBest(readBest()), []);

  const onHud = useCallback((h: HudPayload) => {
    hudNow.current = h;
    setHud(h);
  }, []);
  const onMode = useCallback((m: GameMode) => {
    if (m === "card") setBack(lastMode.current === "dying");
    if (m === "over" || m === "clear") {
      const score = hudNow.current?.score ?? 0;
      setBest((b) => {
        if (score <= b) return b;
        writeBest(score);
        return score;
      });
    }
    lastMode.current = m;
    setMode(m);
  }, []);

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
      const started = await startLook(render, { noart, board, dev, onHud, onMode });
      if (cancelled) {
        started.stop();
        return render.destroy();
      }
      look.current = started;
      dispose = () => {
        look.current = null;
        started.stop();
        render.destroy();
      };
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [forceWebgl, noart, board, dev, onHud, onMode]);

  const press = useCallback((a: Action, down: boolean) => look.current?.press(a, down), []);
  const veiled = mode === "pause" || mode === "over" || mode === "clear";
  const info = {
    venue: hud?.venue ?? "Hotel lobby",
    world: hud?.world ?? "1-1",
    score: hud?.score ?? 0,
    best,
    lives: hud?.lives ?? 3,
    portrait: hud?.portrait ?? null,
    back,
  };
  return (
    <>
      <div ref={host} className="next-stage" style={{ position: "fixed", inset: 0, background: "#0d1118" }} />
      <NextHud
        hud={hud}
        touch={touch && !veiled}
        muted={muted}
        onPause={() => look.current?.togglePause()}
        onMute={() => {
          setMuted((m) => {
            look.current?.setMuted(!m);
            return !m;
          });
        }}
      />
      {touch && !veiled && mode !== "card" && hud && (
        <NextTouch onPress={press} ready={{ fire: hud.sinus >= 1, lecture: hud.lecture, super: hud.charge >= hud.chargeMax }} />
      )}
      <NextVeil
        mode={mode}
        info={info}
        place={place}
        onResume={() => look.current?.togglePause()}
        onNewRun={() => look.current?.newRun()}
      />
    </>
  );
}
