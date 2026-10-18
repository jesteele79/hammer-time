import type { HudPayload } from "@/render/hud";
import type { GameMode } from "@/sim/game";
import { FOODS } from "@/sim/quests/hungry/food";
import { GRADES, HUNGRY } from "@/sim/quests/hungry/hungry";

/** COMPED's line, as the cards write it. */
const GOAL = GRADES[0][0].toLocaleString("en-US");
import { BANQUET_KEYS, KEYS } from "./next-keys";

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
  /** Hungry Hungry Hammer while it is up (its card, round, break or tally), and its own best (R4). */
  quest: HudPayload["quest"];
  banquetBest: number;
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
 * clear, and the banquet's card and tally. They sit in the half of the screen his face is not in,
 * over a scrim that fades out before it (spec §2.1); on a phone on its side they fold into one
 * compact row.
 */
export function NextVeil({
  mode,
  info,
  place = "bottom",
  onResume,
  onNewRun,
  onTitle,
  onContinue,
  onQuestAgain,
}: {
  mode: GameMode | null;
  info: VeilInfo;
  /** The half of the screen away from his face: the right half at the banquet on a wide screen. */
  place?: "top" | "bottom" | "right";
  onResume: () => void;
  onNewRun: () => void;
  /** Back to the start screen, when there is one. */
  onTitle?: () => void;
  /** The BUFFET door's tally: back to the lobby. */
  onContinue?: () => void;
  /** Practice's tally: another round. */
  onQuestAgain?: () => void;
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
            {(info.quest ? BANQUET_KEYS : KEYS).map(([key, what]) => (
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
  if (mode === "questCard")
    return (
      <div className="next-veil next-veil--card" data-place={place}>
        <section className="next-veil__card" aria-live="polite">
          <p className="next-veil__eyebrow">Side quest</p>
          <h2 className="next-veil__title">Hungry Hungry Hammer</h2>
          <p className="next-veil__line">The Banquet</p>
          <p className="next-veil__line next-veil__line--prize">
            {info.quest?.door ? `Get COMPED (${GOAL}) to take home a doggy bag and the belly-flop` : `In a shift, COMPED (${GOAL}) takes home a doggy bag and the belly-flop`}
          </p>
        </section>
      </div>
    );
  if (mode === "questTally" && info.quest?.result) {
    const r = info.quest.result;
    const best = Math.max(info.banquetBest, r.score);
    const lines = [
      `Plate ${r.plate} from ${r.grabs} grabs`,
      `Combo bonus +${r.comboBonus} (best ${r.bestCombo} in a row)`,
      ...(r.robbed ? [`Robbed other plates ${r.robbed} time${r.robbed > 1 ? "s" : ""}`] : []),
      ...(r.paper ? [`Paper to the face: ${r.paper} (-${r.paper * 150})`] : []),
      ...(r.slapped ? [`Slapped ${r.slapped} time${r.slapped > 1 ? "s" : ""} (-${r.slapped * HUNGRY.guard.cost})`] : []),
      ...(r.specials.length ? [`Specials: ${r.specials.map((k) => FOODS[k].name).join(", ")}`] : []),
      ...(r.bill ? ["Picked up the check: -400"] : []),
      ...(r.full ? ["Full belly: the pepper on the way back"] : []),
    ];
    const prize = r.doggy
      ? info.quest.door
        ? "Doggy bag packed: it saves you from the next knockdown"
        : "COMPED: from the BUFFET door that wins a doggy bag and the belly-flop"
      : `COMPED (${GOAL}) wins a doggy bag and the belly-flop`;
    return (
      <div className="next-veil" data-place={place}>
        <section className="next-veil__card next-veil__card--tally" role="dialog" aria-label={r.grade}>
          <p className="next-veil__eyebrow">Side quest</p>
          <h2 className="next-veil__title">{r.grade}</h2>
          <dl className="next-veil__scores">
            <div>
              <dt>Score</dt>
              <dd>{String(r.score).padStart(6, "0")}</dd>
            </div>
            <div>
              <dt>{r.score >= best && r.score > 0 ? "New best" : "Best"}</dt>
              <dd>{String(best).padStart(6, "0")}</dd>
            </div>
          </dl>
          <p className="next-veil__line next-veil__line--prize" data-won={r.doggy}>
            {prize}
          </p>
          {r.flop && info.quest.door && (
            <p className="next-veil__line next-veil__line--prize" data-won="true">
              Belly-flop learned: run, then ↓ to flop through the staff
            </p>
          )}
          <ul className="next-veil__lines">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {info.quest.door ? (
            <button type="button" className="next-veil__button" onClick={onContinue}>
              Back to the lobby
            </button>
          ) : (
            <>
              <button type="button" className="next-veil__button" onClick={onQuestAgain}>
                Play again
              </button>
              {toTitle}
            </>
          )}
        </section>
      </div>
    );
  }
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
