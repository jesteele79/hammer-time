import { useEffect, useRef, useState } from "react";
import type { Quality } from "@/render/app";
import { journeyTotal, playableNext, type Journey } from "@/sim/journey";
import type { QuestId } from "@/sim/quests/quest";
import { ACTS, actOf, type ActId, type StoryId } from "@/sim/story";
import { KEYS } from "./next-keys";
import { NextStrip } from "./next-strip";

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
 * hammered on, and the journey runs along the bottom as a strip of stops (story spec §5.2) with "Clock in" (the next stop,
 * or a finished one picked on the strip), the journey's best, mute, the keys, the quality, and the side quests (Hungry
 * Hungry Hammer and Fare Darts, played here as practice, R4 §8 and R5 §11).
 * The game loads behind it: a start picked before it is ready begins as soon as it is, with no plunge, since the screen
 * must stay up until then. It is drawn at once; its buttons wait, disabled, until the page is live, so no tap is lost.
 */
export function NextStart({
  live,
  ready,
  best,
  banquetBest,
  faresBest,
  muted,
  quality,
  onMute,
  onQuality,
  journey,
  built,
  onStop,
  onStraight,
  onQuest,
}: {
  /** The page's script is running: until then a tap would be lost. */
  live: boolean;
  ready: boolean;
  best: number;
  /** Hungry Hungry Hammer's own best, door rounds and practice alike. */
  banquetBest: number;
  /** Fare Darts' own best, door rounds and practice alike. */
  faresBest: number;
  muted: boolean;
  quality: Quality | null;
  onMute: () => void;
  onQuality: (q: Quality | null) => void;
  journey: Journey;
  /** The stops that can be played, in story order. */
  built: readonly StoryId[];
  /** Start a stop: the next plays the journey, a finished one replays. */
  onStop: (id: StoryId) => void;
  /** An act's straight-through run from its header: for Act 1, Work the whole shift. */
  onStraight: (act: ActId) => void;
  /** A Side quests card: a practice round of that quest, on this page. */
  onQuest: (id: QuestId) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [full] = useState(() => !sequenced);
  // A finished stop picked on the strip; otherwise Clock in plays the journey's next.
  const [picked, setPicked] = useState<StoryId | null>(null);
  const next = playableNext(journey, built) ?? journey.next;
  const chosen = picked && journey.done.includes(picked) && built.includes(picked) ? picked : next;
  // The next stop not built yet: its act is coming (plan decision 5).
  const coming = !built.includes(chosen);
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
    if (waiting || leaving || coming) return;
    setWaiting(!ready);
    leave(() => onStop(chosen));
  };
  return (
    <div ref={root} className="next-start" data-sequence={full ? "full" : "short"} data-leaving={leaving || undefined} role="dialog" aria-label="Hammer Time">
      <header className="next-start__top">
        <span className="next-start__edition">A very personal hospitality problem</span>
        <span className="next-start__best">
          Journey best <b>{pad(journeyTotal(journey))}</b>
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
          <p className="next-start__eyebrow">Three acts. Zero patience.</p>
          <h1>
            <span className="next-start__word">
              <span>Hammer</span>
            </span>{" "}
            <span className="next-start__word next-start__word--time">
              <span>Time.</span>
            </span>
          </h1>
          <p className="next-start__tagline">
            <span>Bonk the staff. Dodge the paper.</span> <span>Get to Basel.</span>
          </p>
          <button type="button" className="next-start__go" onClick={clockIn} aria-busy={waiting} disabled={!live || coming}>
            {coming ? `${ACTS[actOf(chosen)].title.split(" · ")[0]} is coming` : waiting ? "Getting Hammer ready…" : "Clock in"}
          </button>
        </div>
      </section>
      <NextStrip
        journey={journey}
        built={built}
        best={best}
        chosen={chosen}
        live={live}
        onChoose={(id) => setPicked(id)}
        onStop={(id) => leave(() => onStop(id))}
        onStraight={(act) => leave(() => onStraight(act))}
      />
      <section className="next-start__quests" aria-label="Side quests">
        <span className="next-start__quests-k">Side quests</span>
        <button type="button" className="next-start__quest" aria-label="Play Hungry Hungry Hammer" onClick={() => leave(() => onQuest("hungry"))} disabled={!live}>
          <span className="next-start__shot">
            <img src="/start/banquet.webp" alt="" draggable={false} />
          </span>
          <b>Hungry Hungry Hammer</b>
          <small>
            <span className="next-start__where">Banquet table · </span>best {pad(banquetBest)}
          </small>
        </button>
        <button type="button" className="next-start__quest" aria-label="Play Fare Darts" onClick={() => leave(() => onQuest("fares"))} disabled={!live}>
          <span className="next-start__shot">
            <img src="/start/gate.webp" alt="" draggable={false} />
          </span>
          <b>Fare Darts</b>
          <small>
            <span className="next-start__where">Gate B7 · </span>best {pad(faresBest)}
          </small>
        </button>
      </section>
      <div className="next-start__film" aria-hidden="true" />
    </div>
  );
}
