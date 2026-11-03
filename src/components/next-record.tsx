import { useEffect, useRef } from "react";
import { actTotal, journeyTotal, type Journey } from "@/sim/journey";
import { ACTS, type ActId } from "@/sim/story";

const pad = (n: number) => String(n).padStart(6, "0");

/**
 * The Service Record (story spec §4.5), from the home screen's tools: the journey's total and each act's (an act not
 * built yet stands at zero), the staff bonked in every way of playing, the whole shift's best and the side quests'.
 * Escape or Done closes it.
 */
export function NextRecord({
  journey,
  best,
  banquetBest,
  faresBest,
  onClose,
}: {
  journey: Journey;
  /** Work the whole shift's best. */
  best: number;
  banquetBest: number;
  faresBest: number;
  onClose: () => void;
}) {
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    done.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const rows: [string, string][] = [
    ["Journey total", pad(journeyTotal(journey))],
    ...(Object.keys(ACTS) as ActId[]).map((a): [string, string] => [ACTS[a].title, pad(actTotal(journey, a))]),
    ["Staff bonked", String(journey.bonked)],
    ["Whole shift best", pad(best)],
    ["Hungry Hungry Hammer best", pad(banquetBest)],
    ["Fare Darts best", pad(faresBest)],
  ];
  return (
    <div className="next-settings" role="dialog" aria-modal="true" aria-label="Service Record">
      <section className="next-settings__card">
        <h2 className="next-veil__title">Service Record</h2>
        <dl className="next-record">
          {rows.map(([what, n]) => (
            <div key={what} className="next-record__row">
              <dt>{what}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>
        <button ref={done} type="button" className="next-veil__button" onClick={onClose}>
          Done
        </button>
      </section>
    </div>
  );
}
