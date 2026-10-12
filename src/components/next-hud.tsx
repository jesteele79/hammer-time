import type { CSSProperties } from "react";
import type { HudPayload } from "@/render/hud";

const level = (heat: number) => (heat < 45 ? "cool" : heat < 80 ? "warm" : "hot");
const fill = (v: number): CSSProperties => ({ ["--fill" as string]: Math.min(1, Math.max(0, v)) });
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
/** Up to this many lives show as portraits; more show one and a count. */
const LIFE_PIPS = 5;

/** The Coke Zero can, drawn: black, a red band, a silver top. */
function CanIcon() {
  return (
    <svg className="next-hud__can" viewBox="0 0 14 22" aria-hidden="true">
      <rect x="1" y="1" width="12" height="20" rx="3" fill="#151515" stroke="#0d1118" strokeWidth="1.2" />
      <rect x="1" y="9" width="12" height="5" fill="#d4202c" />
      <rect x="1.6" y="1.6" width="10.8" height="3" rx="1.5" fill="#c9ccd1" />
      <rect x="3" y="6" width="1.6" height="12" rx="0.8" fill="#ffffff" opacity="0.4" />
    </svg>
  );
}

/** The rebuild's HUD (spec §10): slate, Affliction gold, Barlow Condensed. Nothing here sits over his face. */
export function NextHud({ hud }: { hud: HudPayload | null }) {
  if (!hud) return null;
  const full = hud.charge >= hud.chargeMax;
  const lives = Math.max(0, hud.lives);
  return (
    <div className="next-hud">
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
          <span className="next-hud__star" aria-label={`Buc-ee's boost, ${hud.star} seconds`}>
            {hud.star}
          </span>
        )}
        <span className="next-hud__clock" data-hurry={hud.hurry} aria-label={hud.time === null ? "No clock" : `${hud.time} seconds left`}>
          {hud.time === null ? "–" : clock(hud.time)}
        </span>
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
