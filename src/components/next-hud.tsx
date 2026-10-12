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
  const full = hud.charge >= hud.chargeMax;
  const lives = Math.max(0, hud.lives);
  // A mouse press must not leave a button focused: Space would then press it instead of jumping.
  const noFocus = (e: { preventDefault(): void }) => e.preventDefault();
  return (
    <div className={touch ? "next-hud next-hud--touch" : "next-hud"}>
      <section className="next-hud__bar-top" aria-label="Run">
        <span className="next-hud__score" aria-label={`Score ${hud.score}`}>
          {String(hud.score).padStart(6, "0")}
        </span>
        <span className="next-hud__cans" aria-label={`${hud.cans} Coke Zero`}>
          <CanIcon />
          {String(hud.cans).padStart(2, "0")}
        </span>
        <span className="next-hud__lives" aria-label={`${lives} ${lives === 1 ? "life" : "lives"}`}>
          {Array.from({ length: lives > LIFE_PIPS ? 1 : lives }, (_, i) =>
            hud.portrait ? <img key={i} src={hud.portrait} alt="" /> : <i key={i} />,
          )}
          {lives > LIFE_PIPS && <b>×{lives}</b>}
        </span>
        {hud.star > 0 && (
          <span className="next-hud__star" aria-label={`Buc-ee's shield, ${hud.star} seconds`}>
            <img src="/beaver.png" alt="" />
            {hud.star}
          </span>
        )}
        <span className="next-hud__clock" data-hurry={hud.hurry} aria-label={hud.time === null ? "No clock" : `${hud.time} seconds left`}>
          {hud.time === null ? "–" : clock(hud.time)}
        </span>
        <button type="button" className="next-hud__button" aria-label="Pause" onPointerDown={noFocus} onClick={onPause}>
          <PauseIcon />
        </button>
        <button type="button" className="next-hud__button" aria-label={muted ? "Sound on" : "Mute"} onPointerDown={noFocus} onClick={onMute}>
          <SoundIcon muted={muted} />
        </button>
      </section>
      <section className="next-hud__panel" aria-label="Hammer">
        <header className="next-hud__head">
          {hud.portrait && <img className="next-hud__portrait" src={hud.portrait} alt="" />}
          <div>
            <div className="next-hud__venue">{hud.venue}</div>
            <div className="next-hud__mode">World {hud.world}</div>
          </div>
        </header>
        <dl className="next-hud__rows">
          <div className="next-hud__row">
            <dt>Patience</dt>
            <dd aria-label={`${hud.patience} of ${hud.patienceMax}`} data-hot={hud.hot}>
              {Array.from({ length: hud.patienceMax }, (_, i) => (
                <i key={i} className="next-hud__pip next-hud__pip--patience" style={fill(i < hud.patience ? 1 : 0)} />
              ))}
            </dd>
          </div>
          <div className="next-hud__row">
            <dt>Heat</dt>
            <dd aria-label={`${Math.round(hud.heat)} percent`}>
              <span className="next-hud__bar" data-level={level(hud.heat)}>
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
