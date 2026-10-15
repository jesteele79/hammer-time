import { useState } from "react";
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

/**
 * The start screen (R3 §7) in the shell's slate and gold: the title over the key art, where to start (the whole shift,
 * the restaurant, the campus, or pig practice), "Clock in", the best, mute, the keys, the quality, and the side quests
 * (Hungry Hungry Hammer, played here as practice, R4 §8).
 * The game loads behind it: a start picked before it is ready begins as soon as it is. It is drawn at once; its buttons
 * wait, disabled, until the page is live, so no tap is lost.
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
  const [chosen, setChosen] = useState<Start>(STARTS[0]);
  const [keys, setKeys] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const clockIn = () => {
    if (waiting) return;
    setWaiting(!ready);
    onStart(chosen);
  };
  return (
    <div className="next-start" role="dialog" aria-label="Hammer Time">
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
        <img className="next-start__art" src="/start/key-art.webp" alt="" draggable={false} />
        <div className="next-start__title">
          <p className="next-start__eyebrow">Four venues. Zero patience.</p>
          <h1>
            Hammer <span>Time.</span>
          </h1>
          <p className="next-start__tagline">Bonk the staff. Dodge the paper. Settle it with the pig.</p>
          <button type="button" className="next-start__go" onClick={clockIn} aria-busy={waiting} disabled={!live}>
            {waiting ? "Getting Hammer ready…" : "Clock in"}
          </button>
        </div>
      </section>
      <nav className="next-start__venues" aria-label="Choose where to start">
        {STARTS.map((s) => (
          <button key={s.id} type="button" className="next-start__venue" aria-label={`Start at ${s.name}`} aria-pressed={chosen.id === s.id} onClick={() => setChosen(s)} onDoubleClick={() => onStart(s)} disabled={!live}>
            <img src={`/start/${s.id}.webp`} alt="" draggable={false} />
            <span className="next-start__code">{s.code}</span>
            <b>{s.name}</b>
            <small>{s.detail}</small>
          </button>
        ))}
      </nav>
      <section className="next-start__quests" aria-label="Side quests">
        <span className="next-start__quests-k">Side quests</span>
        <button type="button" className="next-start__quest" aria-label="Play Hungry Hungry Hammer" onClick={onQuest} disabled={!live}>
          <img src="/start/banquet.webp" alt="" draggable={false} />
          <b>Hungry Hungry Hammer</b>
          <small>Banquet table · best {pad(banquetBest)}</small>
        </button>
      </section>
    </div>
  );
}
