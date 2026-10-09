import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Pause, Volume2, VolumeX } from "lucide-react";
import { Game, type Hud, type Mode } from "@/game/engine";
import { DISPLAY_H, DISPLAY_W } from "@/game/constants";

const BEST_KEY = "hammer-time-best";

function pad(n: number, len = 6) {
  return String(Math.max(0, Math.floor(n))).padStart(len, "0");
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(score: number) {
  const best = Math.max(readBest(), score);
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* ignore quota */
  }
  return best;
}

export function KilnHop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const scoreRef = useRef<HTMLElement>(null);
  const coinRef = useRef<HTMLElement>(null);
  const worldRef = useRef<HTMLElement>(null);
  const timeRef = useRef<HTMLElement>(null);
  const livesRef = useRef<HTMLElement>(null);
  const bestRef = useRef<HTMLParagraphElement>(null);
  const worldBigRef = useRef<HTMLParagraphElement>(null);
  const nameBigRef = useRef<HTMLParagraphElement>(null);
  const livesBigRef = useRef<HTMLElement>(null);
  const emberRef = useRef<HTMLButtonElement>(null);
  const chargeRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>("title");
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const play = playRef.current;
    if (!canvas || !play) return;

    const fit = () => {
      const box = play.getBoundingClientRect();
      const scale = Math.min(box.width / DISPLAY_W, box.height / DISPLAY_H);
      const w = Math.max(160, Math.floor(DISPLAY_W * scale));
      const h = Math.floor(DISPLAY_H * (w / DISPLAY_W));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(play);

    const game = new Game(canvas, {
      onMode: (next) => setMode(next),
      onHud: (hud: Hud) => {
        if (scoreRef.current) scoreRef.current.textContent = pad(hud.score);
        if (coinRef.current) coinRef.current.textContent = pad(hud.coins, 2);
        if (worldRef.current) worldRef.current.textContent = hud.world;
        if (timeRef.current) timeRef.current.textContent = String(hud.time);
        if (livesRef.current) livesRef.current.textContent = `×${hud.lives}`;
        if (worldBigRef.current) worldBigRef.current.textContent = hud.world;
        if (nameBigRef.current) nameBigRef.current.textContent = hud.name;
        if (livesBigRef.current) livesBigRef.current.textContent = String(hud.lives);
        if (chargeRef.current) {
          if (hud.star > 0) {
            chargeRef.current.textContent = `STAR ${Math.ceil(hud.star)}`;
            chargeRef.current.dataset.ready = "1";
          } else {
            chargeRef.current.textContent = hud.charge >= 10 ? "READY" : `${hud.charge}/10`;
            chargeRef.current.dataset.ready = hud.charge >= 10 ? "1" : "0";
          }
        }
        if (emberRef.current) emberRef.current.dataset.on = hud.form === 2 ? "1" : "0";
      },
      onRecord: (score) => {
        const best = writeBest(score);
        if (bestRef.current) bestRef.current.textContent = `Best ${pad(best)}`;
      },
    });
    gameRef.current = game;
    if (bestRef.current) bestRef.current.textContent = `Best ${pad(readBest())}`;

    return () => {
      obs.disconnect();
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const bind = (action: "left" | "right" | "jump" | "run" | "down" | "fire" | "towel") => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      gameRef.current?.setPointer(e.pointerId, action, true);
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      gameRef.current?.setPointer(e.pointerId, action, false);
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      gameRef.current?.setPointer(e.pointerId, action, false);
    },
  });

  const showTitle = mode === "title";
  const showCard = mode === "card";
  const showPause = mode === "pause";
  const showOver = mode === "over";
  const showWin = mode === "win";
  const showTally = mode === "tally";
  const showVeil = showTitle || showCard || showPause || showOver || showWin || showTally;

  return (
    <main className="stage" data-mode={mode}>
      <header className="hud">
        <div>
          <span className="hud-k">Hammer</span>
          <b ref={scoreRef}>000000</b>
          <span className="hud-k" ref={livesRef}>
            ×3
          </span>
          <span className="hud-k">Smash</span>
          <b ref={chargeRef} data-ready="0">
            0/10
          </b>
        </div>
        <div>
          <span className="hud-k">Zero</span>
          <b ref={coinRef}>00</b>
        </div>
        <div>
          <span className="hud-k">World</span>
          <b ref={worldRef}>1-1</b>
        </div>
        <div>
          <span className="hud-k">Time</span>
          <b ref={timeRef}>300</b>
        </div>
        <div className="hud-tools">
          <button
            type="button"
            className="icon-btn pause-btn"
            hidden={mode !== "play" && mode !== "slide" && mode !== "walkoff" && mode !== "pause"}
            onClick={() => gameRef.current?.togglePause()}
            aria-label={mode === "pause" ? "Resume" : "Pause"}
          >
            <Pause size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted(gameRef.current?.toggleMute() ?? !muted)}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      <div className="screen">
        <aside className="legend" aria-label="Controls">
          <p className="legend-k">Controls</p>
          <ul>
            <li>
              <kbd>←</kbd>
              <kbd>→</kbd>
              <span>Move</span>
            </li>
            <li>
              <kbd>Z</kbd>
              <span>Jump</span>
            </li>
            <li>
              <kbd>Shift</kbd>
              <span>Run</span>
            </li>
            <li>
              <kbd>H</kbd>
              <kbd>X</kbd>
              <span>Hammer</span>
            </li>
            <li>
              <kbd>F</kbd>
              <span>Snot rocket</span>
            </li>
            <li>
              <kbd>T</kbd>
              <span>Towel</span>
            </li>
            <li>
              <kbd>↓</kbd>
              <span>Pipe</span>
            </li>
          </ul>
          <p className="legend-note">Snot rocket works after the second ! block. That one is the pepper. T wipes the drip after a lot of jumps.</p>
        </aside>
        <div className="play" ref={playRef}>
        <canvas ref={canvasRef} className="game" width={DISPLAY_W} height={DISPLAY_H} aria-label="Hammer Time playfield" />
        {showVeil ? (
          <div className={showTitle ? "veil veil-title" : "veil"}>
            {showTitle ? (
              <div className="title-dock">
                <button type="button" className="btn-nes" onClick={() => gameRef.current?.newGame()}>
                  Start
                </button>
                <p className="best" ref={bestRef}>
                  Best 000000
                </p>
                <p className="keys">Arrows move · Z jumps · H or X hammers · F snot rocket</p>
              </div>
            ) : null}
            {showCard ? (
              <div className="panel">
                <p className="kicker">The floor</p>
                <p className="world" ref={worldBigRef}>
                  1-1
                </p>
                <p className="dek" ref={nameBigRef}>
                  Hill Road
                </p>
                <p className="dek">
                  × <span ref={livesBigRef}>3</span>
                </p>
              </div>
            ) : null}
            {showPause ? (
              <div className="panel">
                <p className="kicker">Paused</p>
                <button type="button" className="btn-nes" onClick={() => gameRef.current?.togglePause()}>
                  Resume
                </button>
              </div>
            ) : null}
            {showTally ? (
              <div className="panel">
                <p className="kicker">Course clear</p>
                <p className="dek">Time left is turning into points.</p>
              </div>
            ) : null}
            {showOver ? (
              <div className="panel">
                <p className="kicker">Hammer down</p>
                <p className="dek">Hammer dropped the mallet. The office is still standing.</p>
                <button type="button" className="btn-nes" onClick={() => gameRef.current?.newGame()}>
                  Try again
                </button>
              </div>
            ) : null}
            {showWin ? (
              <div className="panel">
                <p className="kicker">Shift over</p>
                <p className="dek">Open Office and the file room are quiet. The pepper is spent.</p>
                <button type="button" className="btn-nes" onClick={() => gameRef.current?.newGame()}>
                  Run again
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>

      <div className="touchbar">
        <div className="pad">
          <button type="button" className="pad-btn" aria-label="Left" {...bind("left")}>
            ←
          </button>
          <button type="button" className="pad-btn" aria-label="Right" {...bind("right")}>
            →
          </button>
        </div>
        <div className="actions">
          <button type="button" className="pad-btn" aria-label="Down into a pipe" {...bind("down")}>
            ↓
          </button>
          <button type="button" className="pad-btn" aria-label="Wipe with the towel" {...bind("towel")}>
            T
          </button>
          <button type="button" className="pad-btn" ref={emberRef} data-on="0" aria-label="Fire snot rocket" {...bind("fire")}>
            S
          </button>
          <button type="button" className="pad-btn run" aria-label="Hammer and run" {...bind("run")}>
            H
          </button>
          <button type="button" className="pad-btn jump" aria-label="Jump" {...bind("jump")}>
            A
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {mode === "play"
          ? "Playing"
          : mode === "pause"
            ? "Paused"
            : mode === "over"
              ? "Game over"
              : mode === "win"
                ? "You cleared the job site"
                : mode === "card"
                  ? "Get ready"
                  : ""}
      </p>
    </main>
  );
}
