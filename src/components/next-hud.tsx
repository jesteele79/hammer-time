import type { CSSProperties } from "react";
import type { HudPayload } from "@/render/hud";

const level = (heat: number) => (heat < 45 ? "cool" : heat < 80 ? "warm" : "hot");
const fill = (v: number): CSSProperties => ({ ["--fill" as string]: Math.min(1, Math.max(0, v)) });
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
/** Up to this many lives show as portraits; more show one and a count. */
const LIFE_PIPS = 5;

/** The Coke Zero can: the real product's picture. */
function CanIcon() {
  return <img className="next-hud__can" src="/coke-zero.webp" alt="" />;
}

/** The doggy bag from the banquet: a takeout box, drawn. */
function DoggyIcon() {
  return (
    <svg className="next-hud__doggy" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h16l-2 11H6z" />
      <path d="M4 9l3-4h10l3 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 5c0-2 6-2 6 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** The belly-flop from the banquet: him flat on his belly, head up, sliding, drawn. */
function FlopIcon() {
  return (
    <svg className="next-hud__flop" viewBox="0 0 28 24" aria-hidden="true">
      <path d="M1 13h4M2 17h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 15c0-2.6 3-3.6 7-3.6h6.5l1.5 3.6v3H8.6C7.7 18 7 16.8 7 15z" />
      <circle cx="22.5" cy="8" r="3.4" />
      <path d="M17 18.5h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Pause and sound, drawn: two bars, and a speaker with its waves or a cross. */
function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="3" width="4" height="14" rx="1" />
      <rect x="12" y="3" width="4" height="14" rx="1" />
    </svg>
  );
}
function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 8h3l4-4v12l-4-4H3z" />
      {muted ? (
        <path d="M13 7l5 6M18 7l-5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M13 7c1.5 1.6 1.5 4.4 0 6M15.5 5c2.8 2.8 2.8 7.2 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** The rebuild's HUD (spec §10): slate, Affliction gold, Barlow Condensed. Nothing here sits over his face. */
export function NextHud({
  hud,
  touch = false,
  muted = false,
  onPause,
  onMute,
}: {
  hud: HudPayload | null;
  /** The touch pad is showing: the hint and the checkpoint note move up above it. */
  touch?: boolean;
  muted?: boolean;
  onPause?: () => void;
  onMute?: () => void;
}) {
  if (!hud) return null;
  // The banquet's round (R4 §9): its own score, clock and rows in the shift's places.
  const q = hud.quest?.id === "hungry" ? hud.quest : null;
  const score = q ? q.score : hud.score;
  const full = hud.charge >= hud.chargeMax;
  const lives = Math.max(0, hud.lives);
  // A mouse press must not leave a button focused: Space would then press it instead of jumping.
  const noFocus = (e: { preventDefault(): void }) => e.preventDefault();
  return (
    <div className={touch ? "next-hud next-hud--touch" : "next-hud"}>
      <section className="next-hud__bar-top" aria-label="Run">
        <span className="next-hud__score" data-comped={!!q && q.score >= q.goal} aria-label={`Score ${score}`}>
          {String(score).padStart(6, "0")}
        </span>
        {!q && (
          <span className="next-hud__cans" aria-label={`${hud.cans} Coke Zero`}>
            <CanIcon />
            {String(hud.cans).padStart(2, "0")}
          </span>
        )}
        {!q && (
          <span className="next-hud__lives" aria-label={`${lives} ${lives === 1 ? "life" : "lives"}`}>
            {Array.from({ length: lives > LIFE_PIPS ? 1 : lives }, (_, i) =>
              hud.portrait ? <img key={i} src={hud.portrait} alt="" /> : <i key={i} />,
            )}
            {lives > LIFE_PIPS && <b>×{lives}</b>}
          </span>
        )}
        {!q && hud.star > 0 && (
          <span className="next-hud__star" aria-label={`Buc-ee's shield, ${hud.star} seconds`}>
            <img src="/art/products/beaver.webp" alt="" />
            {hud.star}
          </span>
        )}
        {q ? (
          <span className="next-hud__clock" data-hurry={q.time <= 10} aria-label={`${q.time} seconds left`}>
            {clock(q.time)}
          </span>
        ) : (
          <span className="next-hud__clock" data-hurry={hud.hurry} aria-label={hud.time === null ? "No clock" : `${hud.time} seconds left`}>
            {hud.time === null ? "–" : clock(hud.time)}
          </span>
        )}
        <button type="button" className="next-hud__button" aria-label="Pause" onPointerDown={noFocus} onClick={onPause}>
          <PauseIcon />
        </button>
        <button type="button" className="next-hud__button" aria-label={muted ? "Sound on" : "Mute"} onPointerDown={noFocus} onClick={onMute}>
          <SoundIcon muted={muted} />
        </button>
      </section>
      {!q && hud.boss && (
        <section className="next-hud__boss" aria-label="The Pink Menace">
          <span className="next-hud__boss-name">The Pink Menace</span>
          <span className="next-hud__boss-bar" role="meter" aria-label="Its stuffing" aria-valuemin={0} aria-valuemax={hud.boss.max} aria-valuenow={hud.boss.hp}>
            {Array.from({ length: hud.boss.max }, (_, i) => (
              <i key={i} data-on={i < hud.boss!.hp} />
            ))}
          </span>
          <span className="next-hud__boss-count" data-done={hud.boss.bonks >= hud.boss.need}>
            Bonks {Math.min(hud.boss.bonks, hud.boss.need)}/{hud.boss.need}
          </span>
          <span className="next-hud__boss-count" data-done={hud.boss.snots >= hud.boss.need}>
            Snots {Math.min(hud.boss.snots, hud.boss.need)}/{hud.boss.need}
          </span>
        </section>
      )}
      <section className="next-hud__panel" aria-label="Hammer">
        <header className="next-hud__head">
          {hud.portrait && <img className="next-hud__portrait" src={hud.portrait} alt="" />}
          <div>
            <div className="next-hud__venue">{q ? "Hungry Hungry Hammer" : hud.venue}</div>
            <div className="next-hud__mode">{q ? "The Banquet" : `World ${hud.world}`}</div>
          </div>
        </header>
        {q ? (
          <dl className="next-hud__rows">
            <div className="next-hud__row">
              <dt>Reach</dt>
              <dd aria-label={`${q.reach} of ${q.reachMax}`}>
                <span className="next-hud__bar next-hud__bar--reach">
                  <b style={{ width: `${(100 * q.reach) / q.reachMax}%` }} />
                  <i style={{ left: `${(100 * q.reachBase) / q.reachMax}%` }} />
                </span>
              </dd>
            </div>
            <div className="next-hud__row">
              <dt>Combo</dt>
              <dd className="next-hud__combo" data-mult={q.mult}>
                {q.mult > 1 ? `×${q.mult} · ` : ""}
                {q.combo} in a row · {q.chomps} chomped
              </dd>
            </div>
            <div className="next-hud__row next-hud__row--lecture">
              <dt>Lecture</dt>
              <dd className="next-hud__lecture" data-ready={q.lecture === 0}>
                {q.lecture === 0 ? "Ready · E" : `${q.lecture}s`}
              </dd>
            </div>
          </dl>
        ) : (
          <dl className="next-hud__rows">
            <div className="next-hud__row">
              <dt>Patience</dt>
              <dd aria-label={`${hud.patience} of ${hud.patienceMax}${hud.doggy > 0 ? ", doggy bag" : ""}${hud.flop ? ", belly-flop" : ""}`} data-hot={hud.hot}>
                {Array.from({ length: hud.patienceMax }, (_, i) => (
                  <i key={i} className="next-hud__pip next-hud__pip--patience" style={fill(i < hud.patience ? 1 : 0)} />
                ))}
                {hud.doggy > 0 && <DoggyIcon />}
                {hud.flop && <FlopIcon />}
              </dd>
            </div>
            <div className="next-hud__row">
              <dt>Heat</dt>
              <dd aria-label={`${Math.round(hud.heat)} percent`}>
                <span className="next-hud__bar" data-level={level(hud.heat)} data-slowed={hud.slowed}>
                  <b style={{ width: `${hud.heat}%` }} />
                </span>
              </dd>
            </div>
            <div className="next-hud__row">
              <dt>Snot</dt>
              <dd aria-label={`${Math.floor(hud.sinus)} of ${hud.sinusMax}`}>
                {Array.from({ length: hud.sinusMax }, (_, i) => (
                  <i key={i} className="next-hud__pip next-hud__pip--snot" style={fill(hud.sinus - i)} />
                ))}
              </dd>
            </div>
            <div className="next-hud__row">
              <dt>Smash</dt>
              <dd className="next-hud__segs" data-full={full} aria-label={`${hud.charge} of ${hud.chargeMax}`}>
                {Array.from({ length: hud.chargeMax }, (_, i) => (
                  <i key={i} className="next-hud__seg" data-on={i < hud.charge} />
                ))}
              </dd>
            </div>
          </dl>
        )}
      </section>
      {hud.saved && (
        <div className="next-hud__saved" role="status">
          Checkpoint saved
        </div>
      )}
      <p className="next-hud__hint">{hud.hint}</p>
    </div>
  );
}
