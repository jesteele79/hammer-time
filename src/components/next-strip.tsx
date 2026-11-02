import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { actTotal, playableNext, type Journey } from "@/sim/journey";
import { ACTS, STORY, type ActId, type StoryId, type StoryStop } from "@/sim/story";

const pad = (n: number) => String(n).padStart(6, "0");
const ACT_ORDER: ActId[] = ["prologue", "act1", "act2", "act3", "epilogue"];

/** A padlock, drawn: a locked stop shows its code and this, nothing that would spoil it. */
function Lock() {
  return (
    <svg className="next-strip__lock" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The journey along the bottom of the home screen (story spec §5.2): every stop in order under its act's header, one
 * scrolling strip that the wheel and the arrows move, the next stop centered on arrival. A finished stop is gold with its
 * picture, its code and name and its best; the next is lit with its picture; a locked one is dim, its code and a lock. A
 * stop not built yet shows what it is and that it is coming. A click chooses a stop for Clock in; a double click starts it.
 * Each act's header shows its title and total, and once it is finished, its straight-through run.
 */
export function NextStrip({
  journey,
  built,
  best,
  chosen,
  live,
  onChoose,
  onStop,
  onStraight,
}: {
  journey: Journey;
  built: readonly StoryId[];
  /** Work the whole shift's best, on Act 1's straight-through button. */
  best: number;
  /** The stop Clock in starts. */
  chosen: StoryId | null;
  live: boolean;
  onChoose: (id: StoryId) => void;
  onStop: (id: StoryId) => void;
  onStraight: (act: ActId) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  const next = playableNext(journey, built) ?? journey.next;
  // The next stop in the middle of the strip on arrival, and again when the journey is read from the save.
  useEffect(() => {
    const el = nav.current;
    const at = el?.querySelector<HTMLElement>(".next-strip__stop[data-state='next']");
    if (!el || !at) return;
    el.scrollLeft = at.offsetLeft - (el.clientWidth - at.offsetWidth) / 2;
  }, [next]);
  // The wheel turns the strip sideways: a mouse's wheel only scrolls up and down.
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  // ← and → move the strip a stop at a time while it has the focus.
  const keys = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const el = nav.current;
    const one = el?.querySelector<HTMLElement>(".next-strip__stop")?.offsetWidth ?? 200;
    if (!el) return;
    e.preventDefault();
    el.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * (one + 12), behavior: "smooth" });
  };
  const stopView = (s: StoryStop, i: number) => {
    const done = journey.done.includes(s.id);
    const state = done ? "done" : s.id === next ? "next" : "locked";
    const isBuilt = built.includes(s.id);
    // Not built yet: what it is, and that it is coming, when it is finished, next or passed; locked past that.
    const coming = !isBuilt && (done || state === "next" || STORY.findIndex((x) => x.id === s.id) < STORY.findIndex((x) => x.id === next));
    const shown = isBuilt && state !== "locked";
    const playable = isBuilt && state !== "locked";
    const label = shown || coming ? `${s.code} ${s.name}${done ? ", finished" : state === "next" ? ", next" : ""}` : `${s.code}, locked`;
    return (
      <button
        key={s.id}
        type="button"
        className="next-strip__stop"
        data-state={state}
        data-coming={coming || undefined}
        style={{ ["--i" as string]: i } as CSSProperties}
        aria-label={label}
        aria-pressed={playable ? chosen === s.id : undefined}
        disabled={!live || !playable}
        onClick={() => onChoose(s.id)}
        onDoubleClick={() => onStop(s.id)}
      >
        <span className="next-start__shot next-strip__shot">
          {shown ? <img src={`/start/${s.id}.webp`} alt="" draggable={false} /> : coming ? <em>Coming</em> : <Lock />}
        </span>
        <span className="next-start__code next-strip__code">{s.code}</span>
        {(shown || coming) && <b>{s.name}</b>}
        {(shown || coming) && <small>{done && isBuilt ? `best ${pad(journey.best[s.id] ?? 0)}` : state === "next" ? (isBuilt ? "Next" : "Coming") : done ? "Passed" : "Coming"}</small>}
      </button>
    );
  };
  let n = 0;
  return (
    <nav ref={nav} className="next-strip" data-live={live || undefined} aria-label="The journey" onKeyDown={keys}>
      {ACT_ORDER.map((act) => {
        const stops = STORY.filter((s) => s.act === act);
        const finished = stops.length > 0 && stops.every((s) => journey.done.includes(s.id));
        const a = ACTS[act];
        return [
          <div key={`act-${act}`} className="next-strip__act" data-act={act} style={{ ["--i" as string]: n++ } as CSSProperties}>
            <h3>{a.title}</h3>
            <b>{pad(actTotal(journey, act))}</b>
            {finished && a.straight && (
              <button type="button" className="next-strip__straight" onClick={() => onStraight(act)} disabled={!live}>
                {a.straight}
                {act === "act1" && <small>best {pad(best)}</small>}
              </button>
            )}
          </div>,
          ...stops.map((s) => stopView(s, n++)),
        ];
      })}
    </nav>
  );
}
