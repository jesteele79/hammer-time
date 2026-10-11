import type { CSSProperties } from "react";
import type { HudPayload } from "@/render/hud";

const level = (heat: number) => (heat < 45 ? "cool" : heat < 80 ? "warm" : "hot");
const fill = (v: number): CSSProperties => ({ ["--fill" as string]: Math.min(1, Math.max(0, v)) });

/** The rebuild's HUD (spec §10): slate, Affliction gold, Barlow Condensed. Nothing here sits over his face. */
export function NextHud({ hud }: { hud: HudPayload | null }) {
  if (!hud) return null;
  const full = hud.charge >= hud.chargeMax;
  const keys = hud.hint.split(" · ").map((pair) => {
    const [key, ...what] = pair.split(" ");
    return { key, what: what.join(" ") };
  });
  return (
    <div className="next-hud">
      <section className="next-hud__panel" aria-label="Hammer">
        <header className="next-hud__head">
          {hud.portrait && <img className="next-hud__portrait" src={hud.portrait} alt="" />}
          <div>
            <div className="next-hud__venue">{hud.venue}</div>
            <div className="next-hud__mode">{hud.mode}</div>
          </div>
        </header>
        <dl className="next-hud__rows">
          <div className="next-hud__row">
            <dt>Patience</dt>
            <dd aria-label={`${hud.patience} of ${hud.patienceMax}`}>
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
      <p className="next-hud__hint">
        {keys.map(({ key, what }) => (
          <span key={key} className="next-hud__key">
            <kbd>{key}</kbd>
            {what}
          </span>
        ))}
      </p>
    </div>
  );
}
