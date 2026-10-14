import { useCallback, useEffect, useRef, useState } from "react";
import type { Quality } from "@/render/app";
import type { HudPayload } from "@/render/hud";
import type { Look } from "@/render/look";
import type { GameMode } from "@/sim/game";
import type { Action } from "@/sim/input";
import { NextHud } from "./next-hud";
import { NextStart, type Start } from "./next-start";
import { NextTouch } from "./next-touch";
import { NextVeil } from "./next-veil";

/** Where the rebuild keeps its best score, apart from the shipped game's. */
const BEST_KEY = "hammer-time-best-next";
/** The shipped game's Hungry Hungry Hammer best, shown on its side-quest card. */
const HUNGRY_BEST_KEY = "hammer-time-best-hungry";
const QUALITY_KEY = "hammer-time-quality";
const QUALITIES: readonly Quality[] = ["ultra", "high", "medium", "low"];
const TOUCH_QUERY = "(pointer: coarse), (max-width: 899px)";

const readNumber = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
const readQuality = (): Quality | null => {
  try {
    const q = localStorage.getItem(QUALITY_KEY) as Quality | null;
    return q && QUALITIES.includes(q) ? q : null;
  } catch {
    return null;
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

/** The rebuild's canvas and its shell: the start screen, the HUD, the cards and the touch pad. Pixi is browser-only, so everything loads after mount. */
export function NextGame({
  forceWebgl = false,
  noart = false,
  board = false,
  dev = false,
  nocast = false,
  start,
  title = false,
}: {
  forceWebgl?: boolean;
  noart?: boolean;
  board?: boolean;
  /** The checks' switch: a practice hit on G and a teleport on the probe. */
  dev?: boolean;
  /** A lobby with nobody in it: the older checks' switch. */
  nocast?: boolean;
  /** Start the shift at a later venue (`&venue=`). */
  start?: "restaurant" | "campus" | "arena";
  /** On the start screen first; the game loads behind it. */
  title?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const look = useRef<Look | null>(null);
  const hudNow = useRef<HudPayload | null>(null);
  const lastMode = useRef<GameMode | null>(null);
  const [hud, setHud] = useState<HudPayload | null>(null);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [back, setBack] = useState(false);
  const [first, setFirst] = useState(true);
  const [best, setBest] = useState(0);
  const [hungryBest, setHungryBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const [place, setPlace] = useState<"top" | "bottom">("bottom");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Start | null>(null);
  const [practice, setPractice] = useState(start === "arena");
  const [quality, setQualityState] = useState<Quality | null>(null);
  // The page is live once mounted: until then the server-drawn start screen's buttons are disabled, since a tap would be lost.
  const [live, setLive] = useState(false);
  // Read by the callbacks and by the look once it is up: what was chosen before it was ready still reaches it.
  const practiceRef = useRef(practice);
  const mutedRef = useRef(false);
  const qualityChosen = useRef<{ q: Quality | null } | null>(null);
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

  useEffect(() => {
    setLive(true);
    setBest(readNumber(BEST_KEY));
    setHungryBest(readNumber(HUNGRY_BEST_KEY));
    setQualityState(readQuality());
  }, []);

  const onHud = useCallback((h: HudPayload) => {
    hudNow.current = h;
    setHud(h);
  }, []);
  const onMode = useCallback((m: GameMode) => {
    if (m === "card") {
      setBack(lastMode.current === "dying");
      // The shift's first card; a card after a venue's tally says the shift goes on.
      setFirst(lastMode.current === null || lastMode.current === "clear" || lastMode.current === "over" || lastMode.current === "title");
    }
    // Pig practice keeps no best (R3 §2).
    if ((m === "over" || m === "clear") && !practiceRef.current) {
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
      const started = await startLook(render, { noart, board, dev, nocast, start, title, onHud, onMode });
      if (cancelled) {
        started.stop();
        return render.destroy();
      }
      look.current = started;
      if (mutedRef.current) started.setMuted(true);
      if (qualityChosen.current) started.setQuality(qualityChosen.current.q);
      setReady(true);
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
  }, [forceWebgl, noart, board, dev, nocast, start, title, onHud, onMode]);

  // A start chosen while the game still loaded begins once it is ready, and only once.
  useEffect(() => {
    if (ready && pending) {
      look.current?.start(pending.at);
      setPending(null);
    }
  }, [ready, pending]);

  const begin = (s: Start) => {
    practiceRef.current = s.id === "arena";
    setPractice(s.id === "arena");
    if (look.current) look.current.start(s.at);
    else setPending(s);
  };
  const toggleMute = () => {
    setMuted((m) => {
      mutedRef.current = !m;
      look.current?.setMuted(!m);
      return !m;
    });
  };
  const press = useCallback((a: Action, down: boolean) => look.current?.press(a, down), []);
  const onTitle = mode === "title" || (title && mode === null);
  const veiled = mode === "pause" || mode === "over" || mode === "clear";
  const info = {
    venue: hud?.venue ?? "Hotel lobby",
    world: hud?.world ?? "1-1",
    score: hud?.score ?? 0,
    best,
    lives: hud?.lives ?? 3,
    portrait: hud?.portrait ?? null,
    back,
    first,
    practice,
  };
  return (
    <>
      <div ref={host} className="next-stage" style={{ position: "fixed", inset: 0, background: "#0d1118" }} />
      {onTitle ? (
        <NextStart
          live={live}
          ready={ready}
          best={best}
          hungryBest={hungryBest}
          muted={muted}
          quality={quality}
          onMute={toggleMute}
          onQuality={(q) => {
            setQualityState(q);
            qualityChosen.current = { q };
            look.current?.setQuality(q);
          }}
          onStart={begin}
        />
      ) : (
        <>
          <NextHud hud={hud} touch={touch && !veiled} muted={muted} onPause={() => look.current?.togglePause()} onMute={toggleMute} />
          {touch && !veiled && mode !== "card" && hud && (
            <NextTouch onPress={press} ready={{ fire: hud.sinus >= 1, lecture: hud.lecture, super: hud.charge >= hud.chargeMax }} />
          )}
          <NextVeil
            mode={mode}
            info={info}
            place={place}
            onResume={() => look.current?.togglePause()}
            onNewRun={() => look.current?.newRun()}
            onTitle={title ? () => look.current?.toTitle() : undefined}
          />
        </>
      )}
    </>
  );
}
