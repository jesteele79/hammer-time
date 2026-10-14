import type { GameMode } from "@/sim/game";
import { KEYS } from "./next-keys";

export type VeilInfo = {
  venue: string;
  world: string;
  score: number;
  best: number;
  lives: number;
  portrait: string | null;
  /** The card after a lost life, not the first. */
  back: boolean;
  /** The shift's first card, not one after a venue. */
  first: boolean;
  /** Pig practice: scored on its own, no best kept. */
  practice: boolean;
};

function Lives({ n, portrait }: { n: number; portrait: string | null }) {
  return (
    <span className="next-veil__lives" aria-label={`${n} ${n === 1 ? "life" : "lives"} left`}>
      {Array.from({ length: Math.min(n, 5) }, (_, i) => (portrait ? <img key={i} src={portrait} alt="" /> : <i key={i} />))}
      {n > 5 && <b>×{n}</b>}
    </span>
  );
}

function Scores({ info }: { info: VeilInfo }) {
  const best = Math.max(info.best, info.score);
  // Practice keeps no best: its score alone.
  if (info.practice)
    return (
      <dl className="next-veil__scores">
        <div>
          <dt>Score</dt>
          <dd>{String(info.score).padStart(6, "0")}</dd>
        </div>
      </dl>
    );
  return (
    <dl className="next-veil__scores">
      <div>
        <dt>Score</dt>
        <dd>{String(info.score).padStart(6, "0")}</dd>
      </div>
      <div>
        <dt>{info.score >= best && info.score > 0 ? "New best" : "Best"}</dt>
        <dd>{String(best).padStart(6, "0")}</dd>
      </div>
    </dl>
  );
}

/**
 * The shell's cards in slate and gold: the venue card before play, the break, game over and the
 * clear. They sit in the half of the screen his face is not in, over a scrim that fades out before
 * it (spec §2.1); on a phone on its side they fold into one compact row.
 */
export function NextVeil({
  mode,
  info,
  place = "bottom",
  onResume,
  onNewRun,
  onTitle,
}: {
  mode: GameMode | null;
  info: VeilInfo;
  /** The half of the screen away from his face. */
  place?: "top" | "bottom";
  onResume: () => void;
  onNewRun: () => void;
  /** Back to the start screen, when there is one. */
  onTitle?: () => void;
}) {
  const toTitle = onTitle && (
    <button type="button" className="next-veil__button next-veil__button--quiet" onClick={onTitle}>
      Start screen
    </button>
  );
  if (mode === "card")
    return (
      <div className="next-veil next-veil--card" data-place={place}>
        <section className="next-veil__card" aria-live="polite">
          <p className="next-veil__eyebrow">World {info.world}</p>
          <h2 className="next-veil__title">{info.venue}</h2>
          <p className="next-veil__line">{info.back ? "Back from your break" : info.first ? "Your shift starts here" : "Your shift goes on"}</p>
          <Lives n={info.lives} portrait={info.portrait} />
        </section>
      </div>
    );
  if (mode === "pause")
    return (
      <div className="next-veil" data-place={place}>
        <section className="next-veil__card" role="dialog" aria-label="On break">
          <h2 className="next-veil__title">On break</h2>
          <p className="next-veil__keys">
            {KEYS.map(([key, what]) => (
              <span key={key} className="next-hud__key">
                <kbd>{key}</kbd>
                {what}
              </span>
            ))}
          </p>
          <button type="button" className="next-veil__button" onClick={onResume}>
            Back to work
          </button>
        </section>
      </div>
    );
  if (mode === "over")
    return (
      <div className="next-veil next-veil--over" data-place={place}>
        <section className="next-veil__card" role="dialog" aria-label="Hammer down">
          <h2 className="next-veil__title">Hammer down</h2>
          <p className="next-veil__line">Absolute bullshit.</p>
          <Scores info={info} />
          <button type="button" className="next-veil__button" onClick={onNewRun}>
            Try again
          </button>
          {toTitle}
        </section>
      </div>
    );
  if (mode === "clear")
    return (
      <div className="next-veil" data-place={place}>
        <section className="next-veil__card" role="dialog" aria-label={info.practice ? "Practice over" : "Shift over"}>
          <p className="next-veil__eyebrow">{info.practice ? "Pig practice" : `World ${info.world}`}</p>
          <h2 className="next-veil__title">{info.practice ? "Practice over" : "Shift over"}</h2>
          <p className="next-veil__line">{info.practice ? "The pig is stuffed. Now try the whole shift." : "Clocked out with time to spare."}</p>
          <Scores info={info} />
          <button type="button" className="next-veil__button" onClick={onNewRun}>
            Play again
          </button>
          {toTitle}
        </section>
      </div>
    );
  return null;
}
