import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Quality } from "@/render/app";
import { KEYS } from "./next-keys";

/** Where a shift can start: the shift's venue index, its card's picture and words. The gift shop alone is pig practice. */
export const STARTS = [
  { at: 0, id: "lobby", code: "1-1", name: "Hotel lobby", detail: "The whole shift" },
  { at: 1, id: "restaurant", code: "1-2", name: "Restaurant", detail: "Start at the restaurant" },
  { at: 2, id: "campus", code: "1-3", name: "Campus", detail: "Start at the campus" },
  { at: 3, id: "arena", code: "1-4", name: "The Pink Menace", detail: "Pig practice" },
] as const;
export type Start = (typeof STARTS)[number];

const QUALITIES: { value: Quality | null; label: string }[] = [
  { value: null, label: "Auto" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const pad = (n: number) => String(n).padStart(6, "0");

/** The title sequence plays in full once a page: back from a shift, the start screen only fades in. */
let sequenced = false;
/** How long the camera takes to plunge into the lobby once a start is chosen (the CSS's next-start-plunge). */
const LEAVE_MS = 520;
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The start screen (R3 §7) as a title sequence in the shell's slate and gold: the lobby fills the screen, the title is
 * hammered on, and where to start (the whole shift, the restaurant, the campus, or pig practice) runs along the bottom
 * with "Clock in", the best, mute, the keys, the quality, and the side quests (Hungry Hungry Hammer, played here as
 * practice, R4 §8).
 * The game loads behind it: a start picked before it is ready begins as soon as it is, with no plunge, since the screen
 * must stay up until then. It is drawn at once; its buttons wait, disabled, until the page is live, so no tap is lost.
 */
export function NextStart({
  live,
  ready,
  best,
  banquetBest,
  muted,
  quality,
  onMute,
  onQuality,
  onStart,
  onQuest,
}: {
  /** The page's script is running: until then a tap would be lost. */
  live: boolean;
  ready: boolean;
  best: number;
  /** Hungry Hungry Hammer's own best, door rounds and practice alike. */
  banquetBest: number;
  muted: boolean;
  quality: Quality | null;
  onMute: () => void;
  onQuality: (q: Quality | null) => void;
  onStart: (s: Start) => void;
  /** The Side quests card: a practice round of Hungry Hungry Hammer, on this page. */
  onQuest: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [full] = useState(() => !sequenced);
  const [chosen, setChosen] = useState<Start>(STARTS[0]);
  const [keys, setKeys] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef(0);
  useEffect(() => {
    sequenced = true;
    return () => window.clearTimeout(leaveTimer.current);
  }, []);
  // The camera leans away from a mouse: the lobby, the title and the light each shift by their own depth.
  useEffect(() => {
    const el = root.current;
    if (!el || still() || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX / window.innerWidth - 0.5;
      y = e.clientY / window.innerHeight - 0.5;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        el.style.setProperty("--look-x", x.toFixed(3));
        el.style.setProperty("--look-y", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);
  const leave = (go: () => void) => {
    if (leaving) return;
    if (!ready || still()) return go();
    setLeaving(true);
    leaveTimer.current = window.setTimeout(go, LEAVE_MS);
  };
  const clockIn = () => {
    if (waiting || leaving) return;
    setWaiting(!ready);
    leave(() => onStart(chosen));
  };
  return (
    <div ref={root} className="next-start" data-sequence={full ? "full" : "short"} data-leaving={leaving || undefined} role="dialog" aria-label="Hammer Time">
      <header className="next-start__top">
        <span className="next-start__edition">A very personal hospitality problem</span>
        <span className="next-start__best">
          Personal best <b>{pad(best)}</b>
        </span>
        <button type="button" className="next-start__tool" aria-pressed={muted} onClick={onMute} disabled={!live}>
          {muted ? "Sound off" : "Sound on"}
        </button>
        <button type="button" className="next-start__tool" aria-expanded={keys} onClick={() => setKeys((k) => !k)} disabled={!live}>
          Keys
        </button>
        <label className="next-start__tool next-start__quality">
          Quality
          <select value={quality ?? "auto"} onChange={(e) => onQuality(e.target.value === "auto" ? null : (e.target.value as Quality))} disabled={!live}>
            {QUALITIES.map((q) => (
              <option key={q.label} value={q.value ?? "auto"}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      {keys && (
        <p className="next-start__keys">
          {KEYS.map(([key, what]) => (
            <span key={key} className="next-hud__key">
              <kbd>{key}</kbd>
              {what}
            </span>
          ))}
        </p>
      )}
      <section className="next-start__hero">
        <div className="next-start__stage" aria-hidden="true">
          <div className="next-start__camera">
            <img className="next-start__art" src="/start/key-art.webp" alt="" draggable={false} fetchPriority="high" />
          </div>
          <div className="next-start__sweep" />
          <div className="next-start__shade" />
        </div>
        <div className="next-start__title">
          <p className="next-start__eyebrow">Four venues. Zero patience.</p>
          <h1>
            <span className="next-start__word">
              <span>Hammer</span>
            </span>{" "}
            <span className="next-start__word next-start__word--time">
              <span>Time.</span>
            </span>
          </h1>
          <p className="next-start__tagline">
            <span>Bonk the staff. Dodge the paper.</span> <span>Settle it with the pig.</span>
          </p>
          <button type="button" className="next-start__go" onClick={clockIn} aria-busy={waiting} disabled={!live}>
            {waiting ? "Getting Hammer ready…" : "Clock in"}
          </button>
        </div>
      </section>
      <nav className="next-start__venues" aria-label="Choose where to start">
        {STARTS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="next-start__venue"
            style={{ ["--i" as string]: i } as CSSProperties}
            aria-label={`Start at ${s.name}`}
            aria-pressed={chosen.id === s.id}
            onClick={() => setChosen(s)}
            onDoubleClick={() => leave(() => onStart(s))}
            disabled={!live}
          >
            <span className="next-start__shot">
              <img src={`/start/${s.id}.webp`} alt="" draggable={false} />
            </span>
            <span className="next-start__code">{s.code}</span>
            <b>{s.name}</b>
            <small>{s.detail}</small>
          </button>
        ))}
      </nav>
      <section className="next-start__quests" aria-label="Side quests">
        <span className="next-start__quests-k">Side quests</span>
        <button type="button" className="next-start__quest" aria-label="Play Hungry Hungry Hammer" onClick={() => leave(onQuest)} disabled={!live}>
          <span className="next-start__shot">
            <img src="/start/banquet.webp" alt="" draggable={false} />
          </span>
          <b>Hungry Hungry Hammer</b>
          <small>Banquet table · best {pad(banquetBest)}</small>
        </button>
      </section>
      <div className="next-start__film" aria-hidden="true" />
    </div>
  );
}
