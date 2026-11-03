import { useCallback, useEffect, useRef, useState } from "react";
import type { Quality } from "@/render/app";
import type { HudPayload } from "@/render/hud";
import type { LevelDone, Look } from "@/render/look";
import type { GameMode } from "@/sim/game";
import type { Action } from "@/sim/input";
import type { LevelId } from "@/sim/level";
import type { QuestId } from "@/sim/quests/quest";
import { JOURNEY_KEY, finishLevel, newJourney, parseJourney, playableNext, serializeJourney, skipTo, type Carry, type Journey, type Snapshot } from "@/sim/journey";
import { STOP_LEVELS } from "@/sim/levels";
import { RUN } from "@/sim/run";
import { builtStops, isStoryId, nextOf, stopOf, type ActId, type StoryCard, type StoryId, type StoryStop } from "@/sim/story";
import { DEFAULT_SOUND, SOUND_KEY, parseSound, type SoundSettings } from "@/game/sound-settings";
import { NextHud } from "./next-hud";
import { NextErase, NextSettings } from "./next-settings";
import { NextStart } from "./next-start";
import { NextTouch } from "./next-touch";
import { NextVeil, type RunKind } from "./next-veil";

/** Where the rebuild keeps its best score, apart from the shipped game's: Work the whole shift's (story spec §4.4). */
const BEST_KEY = "hammer-time-best-next";
/** Hungry Hungry Hammer's best, door rounds and practice alike (R4 §1, decision 6). */
const BANQUET_BEST_KEY = "hammer-time-best-banquet";
/** Fare Darts' best, door rounds and practice alike (R5 §1, decision 16). */
export const FARES_BEST_KEY = "hammer-time-best-fares";
const QUALITY_KEY = "hammer-time-quality";
const QUALITIES: readonly Quality[] = ["ultra", "high", "medium", "low"];
const TOUCH_QUERY = "(pointer: coarse), (max-width: 899px)";
/** The stops that can be played, in story order. */
const BUILT = builtStops(STOP_LEVELS);
/** What he carries into a run saved without it (plan decision 2: a save without `carry` reads as none). */
const NO_CARRY: Carry = { charge: 0, patience: RUN.patience, hot: false, doggy: 0, flop: false, boxes: 0 };

const readNumber = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
const readQuality = (): Quality | null => {
  try {
    const q = localStorage.getItem(QUALITY_KEY) as Quality | null;
    return q && QUALITIES.includes(q) ? q : null;
  } catch {
    return null;
  }
};
const writeNumber = (key: string, n: number) => {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    // Private windows refuse storage; the best lasts the session.
  }
};
/** The volumes and the mute as this browser keeps them. */
const readSound = (): SoundSettings => {
  try {
    return parseSound(localStorage.getItem(SOUND_KEY));
  } catch {
    return { ...DEFAULT_SOUND };
  }
};
const writeSound = (s: SoundSettings) => {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(s));
  } catch {
    // Private windows refuse storage; the volumes last the page.
  }
};
/** The sound settings into the game: the sliders as shares, the mute on top. */
const applySound = (l: Look, s: SoundSettings) => {
  l.setVolumes(s.music / 100, s.effects / 100);
  l.setMuted(s.muted);
};
/** The journey as this browser keeps it; a private window or a broken save gives a new one. */
const readJourney = (): Journey => {
  try {
    return parseJourney(localStorage.getItem(JOURNEY_KEY));
  } catch {
    return newJourney();
  }
};
/** `&journey=all`: every built stop finished, for the page only (spec §4.7). */
const openJourney = (): Journey => ({ ...newJourney(), done: [...BUILT], next: nextOf(BUILT[BUILT.length - 1]) ?? BUILT[BUILT.length - 1] });

/** True while the media query matches: the touch pad shows on phones and touch screens. */
function useMedia(query: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = matchMedia(query);
    const update = () => setOn(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return on;
}

/** The rebuild's canvas and its shell: the start screen, the HUD, the cards and the touch pad. Pixi is browser-only, so everything loads after mount. */
export function NextGame({
  forceWebgl = false,
  noart = false,
  board = false,
  dev = false,
  nocast = false,
  level,
  title = false,
  quest,
  journeyAll = false,
}: {
  forceWebgl?: boolean;
  noart?: boolean;
  board?: boolean;
  /** The checks' switch: a practice hit on G and a teleport on the probe. */
  dev?: boolean;
  /** A lobby with nobody in it: the older checks' switch. */
  nocast?: boolean;
  /** Straight into play at this level of the whole shift (`&level=`, the old `&venue=`). */
  level?: LevelId;
  /** On the start screen first; the game loads behind it. */
  title?: boolean;
  /** Straight into a side quest's practice once the game is ready (`/?quest=hungry` or `/?quest=fares`, R4 §8, R5 §11). */
  quest?: QuestId;
  /** Every built stop open for this page, nothing saved (`&journey=all`, spec §4.7). */
  journeyAll?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const look = useRef<Look | null>(null);
  const hudNow = useRef<HudPayload | null>(null);
  const lastMode = useRef<GameMode | null>(null);
  const [hud, setHud] = useState<HudPayload | null>(null);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [back, setBack] = useState(false);
  const [first, setFirst] = useState(true);
  const [best, setBest] = useState(0);
  const [banquetBest, setBanquetBest] = useState(0);
  const [faresBest, setFaresBest] = useState(0);
  const [bestBefore, setBestBefore] = useState(0);
  const [sound, setSoundState] = useState<SoundSettings>(DEFAULT_SOUND);
  const soundRef = useRef<SoundSettings>(DEFAULT_SOUND);
  const muted = sound.muted;
  /** The Settings, and New game's question, are open over whatever shows. */
  const [settings, setSettingsOpen] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [place, setPlace] = useState<"top" | "bottom" | "right">("bottom");
  const [ready, setReady] = useState(false);
  // A start chosen before the game was ready: it begins once it is, and only once.
  const [pending, setPending] = useState<(() => void) | null>(null);
  // A practice round asked for before the game was ready: by a Side quests card, or by the page's own link.
  const [pendingQuest, setPendingQuest] = useState<QuestId | null>(quest ?? null);
  const [quality, setQualityState] = useState<Quality | null>(null);
  // The page is live once mounted: until then the server-drawn start screen's buttons are disabled, since a tap would be lost.
  const [live, setLive] = useState(false);
  /** What is being played: a journey's stops, a finished stop again, today's whole shift, or pig practice. */
  const [how, setHowState] = useState<RunKind>(level === "arena" ? "practice" : "shift");
  const howRef = useRef(how);
  const setHow = (h: RunKind) => {
    howRef.current = h;
    setHowState(h);
  };
  const [journey, setJourney] = useState<Journey>(newJourney);
  const journeyRef = useRef(journey);
  /** The stop being played in a journey or a replay, and the story's cards showing now. */
  const [stop, setStop] = useState<StoryStop | null>(null);
  const [cards, setCards] = useState<StoryCard[]>([]);
  /** The cards show before the stop's card (the email) or after its tally. */
  const storyAt = useRef<"before" | "after">("after");
  /** The level just finished was the run's last: after its cards the run is over. */
  const lastLevel = useRef(false);
  /** A replay's exit card: the stop, what it scored and its best now. */
  const [clocked, setClocked] = useState<{ id: StoryId; score: number; best: number } | null>(null);
  /** The home screen's scene is drawn and running behind the start screen: the key art fades away. */
  const [scene, setScene] = useState(false);
  const onTitleScene = useCallback(() => setScene(true), []);
  /** The tier the game draws at now: Auto's pick shows beside Auto. */
  const [liveQuality, setLiveQuality] = useState<Quality | null>(null);
  const onQuality = useCallback((q: Quality) => setLiveQuality(q), []);
  const qualityChosen = useRef<{ q: Quality | null } | null>(null);
  const touch = useMedia(TOUCH_QUERY);
  const carded = mode === "card" || mode === "pause" || mode === "over" || mode === "clear" || mode === "questCard" || mode === "questTally" || mode === "story";
  // A side quest's card, its tally, or a break in its round.
  const atQuest = mode === "questCard" || mode === "questTally" || (mode === "pause" && !!hud?.quest);

  /** The journey kept: in this browser, unless the page opened every stop for itself. */
  const writeJourney = useCallback(
    (j: Journey) => {
      journeyRef.current = j;
      setJourney(j);
      if (journeyAll) return;
      try {
        localStorage.setItem(JOURNEY_KEY, serializeJourney(j));
      } catch {
        // Private windows refuse storage; the journey lasts the page.
      }
    },
    [journeyAll],
  );

  // While a card shows, keep it in the half of the screen away from his face (he may lie low after a fall); at a side
  // quest on a screen wider than tall, the right half, his face being at the table's left end or the gate's left.
  useEffect(() => {
    if (!carded) return;
    const update = () => {
      const f = look.current?.face();
      if (!f) return;
      if (atQuest && innerWidth > innerHeight && f.x + f.w / 2 < innerWidth / 2) setPlace("right");
      else setPlace(f.y + f.h / 2 > innerHeight / 2 ? "top" : "bottom");
    };
    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [carded, mode, atQuest]);

  useEffect(() => {
    setLive(true);
    setBest(readNumber(BEST_KEY));
    setBanquetBest(readNumber(BANQUET_BEST_KEY));
    setFaresBest(readNumber(FARES_BEST_KEY));
    setQualityState(readQuality());
    const s = readSound();
    soundRef.current = s;
    setSoundState(s);
    const j = journeyAll ? openJourney() : readJourney();
    journeyRef.current = j;
    setJourney(j);
  }, [journeyAll]);

  const onHud = useCallback((h: HudPayload) => {
    hudNow.current = h;
    setHud(h);
  }, []);
  const onMode = useCallback((m: GameMode) => {
    if (m === "card") {
      setBack(lastMode.current === "dying");
      // The shift's first card; a card after a venue's tally says the shift goes on.
      setFirst(lastMode.current === null || lastMode.current === "clear" || lastMode.current === "over" || lastMode.current === "title");
    }
    // Only Work the whole shift keeps today's best (story spec §4.4); pig practice keeps none (R3 §2).
    if ((m === "over" || m === "clear") && howRef.current === "shift") {
      const score = hudNow.current?.score ?? 0;
      setBest((b) => {
        if (score <= b) return b;
        writeNumber(BEST_KEY, score);
        return score;
      });
    }
    if (m === "title") {
      setCards([]);
      setClocked(null);
    } else setScene(false);
    lastMode.current = m;
    setMode(m);
  }, []);

  /** A journey level's card is up: the snapshot just taken is what Try again and tomorrow's Clock in start from. */
  const onCard = useCallback(
    (id: LevelId, snapshot: Snapshot | null) => {
      const j = journeyRef.current;
      if (howRef.current !== "journey" || !snapshot || id !== j.next) return;
      writeJourney({ ...j, run: snapshot.run, carry: snapshot.carry });
    },
    [writeJourney],
  );

  /** The run is over after its last level's cards: on to the next act's first stop if it is built, else home. */
  const endOfRun = useCallback(() => {
    const j = journeyRef.current;
    if (howRef.current === "journey" && BUILT.includes(j.next) && j.next !== stop?.id) {
      beginStopRef.current(j.next, "journey");
      return;
    }
    look.current?.toTitle();
  }, [stop]);
  const endOfRunRef = useRef(endOfRun);
  endOfRunRef.current = endOfRun;

  /** A journey level's tally is counted: its best and the journey moved on, then its cards (or straight on). */
  const onLevelDone = useCallback(
    (e: LevelDone) => {
      if (!isStoryId(e.id)) return;
      const id = e.id;
      const replay = howRef.current === "replay";
      const done = finishLevel(journeyRef.current, id, e.score, replay ? null : e.snapshot);
      const j = { ...done, bonked: done.bonked + e.bonked };
      writeJourney(j);
      storyAt.current = "after";
      lastLevel.current = e.last;
      if (replay) {
        setClocked({ id, score: e.score, best: j.best[id] ?? e.score });
        return;
      }
      const after = stopOf(id).after ?? [];
      if (after.length) setCards(after);
      // The look is mid-step: the game moves on once this frame is done.
      else if (!e.last) setTimeout(() => look.current?.continueStory(), 0);
      else setTimeout(() => endOfRunRef.current(), 0);
    },
    [writeJourney],
  );

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { createRenderApp } = await import("@/render/app");
      const { startLook } = await import("@/render/look");
      if (cancelled || !host.current) return;
      const render = await createRenderApp(host.current, {
        preference: forceWebgl ? "webgl" : "webgpu",
      });
      if (cancelled) return render.destroy();
      const started = await startLook(render, { noart, board, dev, nocast, level, title, onHud, onMode, onLevelDone, onCard, onTitleScene, onQuality });
      setLiveQuality(render.quality);
      if (cancelled) {
        started.stop();
        return render.destroy();
      }
      look.current = started;
      applySound(started, soundRef.current);
      if (qualityChosen.current) started.setQuality(qualityChosen.current.q);
      setReady(true);
      dispose = () => {
        look.current = null;
        started.stop();
        render.destroy();
      };
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [forceWebgl, noart, board, dev, nocast, level, title, onHud, onMode, onLevelDone, onCard, onTitleScene, onQuality]);

  // A start chosen while the game still loaded begins once it is ready, and only once.
  useEffect(() => {
    if (ready && pending) {
      pending();
      setPending(null);
    }
  }, [ready, pending]);

  // A practice round asked for while the game loaded begins once it is ready, from the start screen.
  useEffect(() => {
    if (ready && pendingQuest) {
      look.current?.newQuest(pendingQuest);
      setPendingQuest(null);
    }
  }, [ready, pendingQuest]);

  // What a round's score must beat to be a new best: its own quest's best as the round's card showed.
  const questId = hud?.quest?.id ?? null;
  useEffect(() => {
    if (mode === "questCard") setBestBefore(questId === "fares" ? faresBest : banquetBest);
  }, [mode, questId, banquetBest, faresBest]);

  // A side quest's best, kept when its tally shows (a door's round and practice alike); the shift's best is not touched.
  const questResult = hud?.quest?.result ?? null;
  useEffect(() => {
    if (mode !== "questTally" || !questResult || !questId) return;
    const score = questResult.score;
    const [key, set] = questId === "fares" ? [FARES_BEST_KEY, setFaresBest] : [BANQUET_BEST_KEY, setBanquetBest];
    set((b) => {
      if (score <= b) return b;
      writeNumber(key, score);
      return score;
    });
  }, [mode, questResult, questId]);

  /** Now if the game is ready, else as soon as it is. */
  const whenReady = (go: () => void) => {
    if (look.current) go();
    else setPending(() => go);
  };
  const playQuest = (id: QuestId) => {
    if (look.current) look.current.newQuest(id);
    else setPendingQuest(id);
  };
  /** A stop of the journey (its next, from the save's snapshot) or a finished one again (fresh). */
  const beginStop = (id: StoryId, kind: "journey" | "replay") => {
    const j = journeyRef.current;
    const s = stopOf(id);
    // The cards before a stop (the email) show the first time it is played, before any snapshot of it is saved.
    const hold = kind === "journey" && !!s.before?.length && !j.run;
    setHow(kind);
    setStop(s);
    setClocked(null);
    setCards(hold ? (s.before ?? []) : []);
    storyAt.current = hold ? "before" : "after";
    lastLevel.current = false;
    const snapshot = kind === "journey" && j.run ? { run: j.run, carry: j.carry ?? NO_CARRY } : null;
    whenReady(() => look.current?.startJourney(id, kind, snapshot, hold));
  };
  const beginStopRef = useRef(beginStop);
  beginStopRef.current = beginStop;
  /** Clock in: the journey's next stop, passing any not built yet. */
  const beginJourney = () => {
    let j = journeyRef.current;
    const id = playableNext(j, BUILT);
    if (!id) return;
    if (id !== j.next) {
      j = skipTo(j, id);
      writeJourney(j);
    }
    beginStop(id, "journey");
  };
  /** A stop on the strip: a finished one replays, the next plays the journey. */
  const beginAt = (id: StoryId) => (journeyRef.current.done.includes(id) ? beginStop(id, "replay") : beginJourney());
  /** An act's straight-through run: for Act 1, Work the whole shift, today's game with today's best (story spec §4.6). */
  const beginStraight = (act: ActId) => {
    if (act !== "act1") return;
    setHow("shift");
    setStop(null);
    whenReady(() => look.current?.start(0));
  };
  // An act's card comes up to its fanfare.
  useEffect(() => {
    if (cards[0]?.kind === "act") look.current?.fanfare();
  }, [cards]);
  /** Continue on a story card: the next card, or the game moves on. */
  const continueStory = () => {
    const rest = cards.slice(1);
    setCards(rest);
    if (rest.length) return;
    if (storyAt.current === "before" || !lastLevel.current) look.current?.continueStory();
    else endOfRun();
  };
  /** The volumes or the mute changed: kept on the device and heard at once. */
  const setSound = (s: SoundSettings) => {
    soundRef.current = s;
    setSoundState(s);
    writeSound(s);
    if (look.current) applySound(look.current, s);
  };
  const toggleMute = () => setSound({ ...soundRef.current, muted: !soundRef.current.muted });
  const chooseQuality = (q: Quality | null) => {
    setQualityState(q);
    qualityChosen.current = { q };
    look.current?.setQuality(q);
  };
  const openSettings = (open: boolean) => {
    setSettingsOpen(open);
    look.current?.setMenu(open);
  };
  /** New game: the journey and its bests start over; the whole shift's and the side quests' bests stay. */
  const eraseJourney = () => {
    writeJourney(newJourney());
    setErasing(false);
  };
  const press = useCallback((a: Action, down: boolean) => look.current?.press(a, down), []);
  const onTitle = mode === "title" || (title && mode === null);
  const veiled = mode === "pause" || mode === "over" || mode === "clear" || mode === "questTally" || mode === "story";
  const info = {
    venue: hud?.venue ?? "Hotel lobby",
    world: hud?.world ?? "1-1",
    score: hud?.score ?? 0,
    best,
    lives: hud?.lives ?? 3,
    portrait: hud?.portrait ?? null,
    back,
    first,
    practice: how === "practice",
    quest: hud?.quest ?? null,
    banquetBest,
    faresBest,
    bestBefore,
    touch,
    pad: !!hud?.pad,
    how,
    journey,
    stop,
    cards,
    clocked,
  };
  // Practice's tally always offers the start screen (it was opened from there, or from its link straight in).
  const titleBack = title || (!!hud?.quest && !hud.quest.door);
  return (
    <>
      <div ref={host} className="next-stage" style={{ position: "fixed", inset: 0, background: "#0d1118" }} />
      {onTitle ? (
        <NextStart
          live={live}
          ready={ready}
          scene={scene}
          best={best}
          banquetBest={banquetBest}
          faresBest={faresBest}
          onSettings={() => openSettings(true)}
          onNewGame={() => setErasing(true)}
          journey={journey}
          built={BUILT}
          onStop={beginAt}
          onStraight={beginStraight}
          onQuest={playQuest}
        />
      ) : (
        <>
          <NextHud hud={hud} touch={touch && !veiled} muted={muted} onPause={() => look.current?.togglePause()} onMute={toggleMute} />
          {touch && !veiled && mode !== "card" && mode !== "questCard" && hud && (
            <NextTouch
              onPress={press}
              // At the banquet only the arrows, Jump, Hammer and the lecture do anything; at the gate every action key throws,
              // Run steadies while the meter lasts, Towel refills it while one is left and the lecture mouths off.
              ready={
                hud.quest?.id === "fares"
                  ? { jump: true, hammer: true, fire: true, super: true, run: hud.quest.steady > 0, towel: hud.quest.towels > 0 && hud.quest.steady < hud.quest.steadyMax, lecture: true }
                  : hud.quest
                    ? { fire: false, lecture: hud.lecture, super: false }
                    : { fire: hud.sinus >= 1, lecture: hud.lecture, super: hud.charge >= hud.chargeMax, box: hud.boxes > 0 }
              }
              boxes={hud.quest ? 0 : hud.boxes}
            />
          )}
          <NextVeil
            mode={mode}
            info={info}
            place={place}
            onResume={() => look.current?.togglePause()}
            onNewRun={() => (how === "journey" || how === "replay" ? look.current?.tryAgain() : look.current?.newRun())}
            onTitle={titleBack ? () => look.current?.toTitle() : undefined}
            onJourney={() => look.current?.toTitle()}
            onContinue={() => look.current?.finishQuest()}
            onStory={continueStory}
            onReplay={() => clocked && beginStop(clocked.id, "replay")}
            onQuestAgain={() => look.current?.newQuest(hud?.quest?.id)}
            onSettings={() => openSettings(true)}
          />
        </>
      )}
      {settings && (
        <NextSettings
          sound={sound}
          onSound={setSound}
          quality={quality}
          liveQuality={liveQuality}
          onQuality={chooseQuality}
          pad={!!hud?.pad}
          onClose={() => openSettings(false)}
        />
      )}
      {erasing && <NextErase onErase={eraseJourney} onKeep={() => setErasing(false)} />}
    </>
  );
}
