import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Pause, Volume2, VolumeX } from "lucide-react";
import { Game, type Hud, type Mode, type TouchAction } from "@/game/engine";
import { DISPLAY_H, DISPLAY_W } from "@/game/constants";

const BEST_KEY = "hammer-time-best";
const initial: Hud = {
  score: 0,
  coins: 0,
  world: "1-1",
  name: "Open Office",
  time: 300,
  lives: 3,
  form: 1,
  charge: 0,
  star: 0,
  heat: 0,
  cooldown: 0,
  checkpoint: false,
  hint: "",
  soundReady: false,
  visualsReady: false,
};
const pad = (n: number, len = 6) => String(Math.max(0, Math.floor(n))).padStart(len, "0");
function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function KilnHop() {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    playRef = useRef<HTMLDivElement>(null),
    gameRef = useRef<Game | null>(null);
  const [mode, setMode] = useState<Mode>("title"),
    [hud, setHud] = useState(initial),
    [muted, setMuted] = useState(false),
    [best, setBest] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current,
      play = playRef.current;
    if (!canvas || !play) return;
    const fit = () => {
      const box = play.getBoundingClientRect(),
        scale = Math.min(box.width / DISPLAY_W, box.height / DISPLAY_H);
      canvas.style.width = `${Math.floor(DISPLAY_W * scale)}px`;
      canvas.style.height = `${Math.floor(DISPLAY_H * scale)}px`;
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(play);
    let nextHud = 0;
    const game = new Game(canvas, {
      onMode: setMode,
      onHud: (value) => {
        if (performance.now() >= nextHud) {
          setHud(value);
          setReady(value.visualsReady);
          nextHud = performance.now() + 80;
        }
      },
      onRecord: (score) => {
        const value = Math.max(readBest(), score);
        try {
          localStorage.setItem(BEST_KEY, String(value));
        } catch {
          /* Storage may be unavailable. */
        }
        setBest(value);
      },
    });
    gameRef.current = game;
    setBest(readBest());
    return () => {
      obs.disconnect();
      game.destroy();
      gameRef.current = null;
    };
  }, []);
  const bind = (action: TouchAction) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      gameRef.current?.setPointer(e.pointerId, action, true);
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) =>
      gameRef.current?.setPointer(e.pointerId, action, false),
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) =>
      gameRef.current?.setPointer(e.pointerId, action, false),
    onLostPointerCapture: (e: PointerEvent<HTMLButtonElement>) =>
      gameRef.current?.setPointer(e.pointerId, action, false),
  });
  const active = ["play", "pause", "slide", "walkoff"].includes(mode),
    start = () => gameRef.current?.newGame();
  const controls: [string, string][] = [
    ["← →", "Move"],
    ["Space", "Jump / hold for height"],
    ["Shift", "Run"],
    ["H / X", "Swing mallet"],
    ["F", "Snot rocket"],
    ["T", "Wipe sweat"],
    ["Q", "Super smash"],
    ["↓", "Enter supply closet"],
    ["Esc", "Pause"],
  ];
  return (
    <main className="stage" data-mode={mode}>
      <header className="hud">
        <div className="wordmark">
          <span>HAMMER</span>
          <strong>
            TIME<span className="brand-dot">.</span>
          </strong>
        </div>
        <div>
          <span className="hud-k">Score</span>
          <b>{pad(hud.score)}</b>
        </div>
        <div>
          <span className="hud-k">Coke Zero</span>
          <b>
            {pad(hud.coins, 2)}
            <small> / 100</small>
          </b>
        </div>
        <div>
          <span className="hud-k">Lives</span>
          <b>×{hud.lives}</b>
        </div>
        <div>
          <span className="hud-k">
            {hud.world} · {hud.name}
          </span>
          <b>
            {hud.time}
            <small> sec</small>
          </b>
        </div>
        <div className="hud-tools">
          {active && (
            <button
              className="icon-btn"
              onClick={() => gameRef.current?.togglePause()}
              aria-label={mode === "pause" ? "Resume" : "Pause"}
            >
              <Pause size={18} />
            </button>
          )}
          <button
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
        <aside className="legend" aria-label="Controls and power-ups">
          <p className="legend-k">Clock in. Let loose.</p>
          <ul>
            {controls.map(([key, label]) => (
              <li key={key}>
                <kbd>{key}</kbd>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="pickup-guide">
            <p>
              <img src="/coke-zero.webp" alt="" />
              <span>
                <b>Coke Zero</b>Cools you off. 100 earns a life.
              </span>
            </p>
            <p>
              <img src="/nuts-bag.webp" alt="" />
              <span>
                <b>Mixed nuts</b>+3 super smash charge.
              </span>
            </p>
            <p>
              <img src="/buccees-pickup.webp" alt="" />
              <span>
                <b>Buc-ee’s</b>10 seconds of invincibility.
              </span>
            </p>
          </div>
        </aside>
        <div className="play" ref={playRef}>
          <canvas
            ref={canvasRef}
            className="game"
            width={DISPLAY_W}
            height={DISPLAY_H}
            aria-label="Hammer Time playfield. Arrows move, Space jumps, H swings, F fires snot, T wipes sweat, Q super smash."
          />
          {mode === "title" && (
            <div className="veil veil-title">
              <div className="title-dock">
                <p className="kicker">An exceptionally bad day at the office</p>
                <h1>
                  HAMMER
                  <br />
                  <span>TIME.</span>
                </h1>
                <p className="title-copy">
                  Mallet in hand. Affliction on.
                  <br />
                  Make it to the end of the shift.
                </p>
                <button className="btn-nes" disabled={!ready} onClick={start}>
                  {ready ? "Clock in" : "Loading…"} <span aria-hidden="true">→</span>
                </button>
                <p className="best">Best {pad(best)} · 2 floors + a secret stash</p>
              </div>
            </div>
          )}
          {mode === "card" && (
            <div className="veil">
              <div className="panel">
                <p className="kicker">
                  {hud.checkpoint ? "Back from your break" : "Your shift starts here"}
                </p>
                <h2>{hud.name}</h2>
                <p>
                  {hud.world} · {hud.lives} lives
                </p>
                <p className="dek">
                  Jump into the ! crate for pepper.
                  <br />H swings. F launches a snot rocket.
                </p>
                {!hud.soundReady && <small>Preparing audio…</small>}
              </div>
            </div>
          )}
          {mode === "pause" && (
            <div className="veil">
              <div className="panel">
                <p className="kicker">On break</p>
                <h2>Take a breath.</h2>
                <p className="dek">
                  Space jumps · H swings · F fires
                  <br />T wipes · Q super smash
                </p>
                <button className="btn-nes" onClick={() => gameRef.current?.togglePause()}>
                  Back to work
                </button>
              </div>
            </div>
          )}
          {mode === "tally" && (
            <div className="veil">
              <div className="panel">
                <p className="kicker">Floor cleared</p>
                <h2>Job done.</h2>
                <p>Remaining time becomes bonus points.</p>
              </div>
            </div>
          )}
          {(mode === "over" || mode === "win") && (
            <div className="veil">
              <div className="panel">
                <p className="kicker">{mode === "win" ? "Shift complete" : "Hammer down"}</p>
                <h2>{mode === "win" ? "Clock out, legend." : "Absolute bullshit."}</h2>
                <p>
                  {mode === "win"
                    ? "Both floors cleared. You earned that Coke Zero."
                    : "The office won this round. Take another swing."}
                </p>
                <p className="best">
                  Score {pad(hud.score)} · Best {pad(best)}
                </p>
                <button className="btn-nes" onClick={start}>
                  {mode === "win" ? "Another shift" : "Try again"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="statusbar">
        <p className="game-hint">
          {active ? hud.hint : "An office platformer with a very personal attitude."}
          {active && hud.checkpoint && <span className="saved"> · Checkpoint saved</span>}
        </p>
        <div className="meters">
          <div className="heat-meter" data-hot={hud.heat >= 80}>
            <span>
              Heat <b>{Math.round(hud.heat)}%</b>
            </span>
            <meter min="0" max="100" value={hud.heat} aria-label="Heat" />
          </div>
          <div className="smash-meter" data-ready={hud.charge >= 10 || hud.star > 0}>
            <span>
              {hud.star > 0 ? `Buc-ee’s ${Math.ceil(hud.star)}s` : `Smash ${hud.charge}/10`}
            </span>
            <meter min="0" max="10" value={hud.charge} aria-label="Super smash charge" />
          </div>
          <span className="pepper-state" data-on={hud.form === 2}>
            {hud.form === 2
              ? hud.cooldown > 0
                ? "Snot reloading"
                : "Snot ready · F"
              : "Pepper needed · !"}
          </span>
        </div>
      </div>
      <div className="touchbar" aria-label="Touch controls">
        <div className="pad">
          <button className="pad-btn direction" aria-label="Left" {...bind("left")}>
            ←
          </button>
          <button className="pad-btn direction" aria-label="Right" {...bind("right")}>
            →
          </button>
          <button className="pad-btn" aria-label="Run" {...bind("run")}>
            Run
          </button>
          <button className="pad-btn" aria-label="Enter supply closet" {...bind("down")}>
            ↓
          </button>
        </div>
        <div className="actions">
          <button className="pad-btn" aria-label="Wipe sweat" {...bind("towel")}>
            Towel
          </button>
          <button
            className="pad-btn"
            data-on={hud.form === 2 ? "1" : "0"}
            aria-label="Fire snot rocket"
            {...bind("fire")}
          >
            Snot
          </button>
          <button
            className="pad-btn"
            data-on={hud.charge >= 10 ? "1" : "0"}
            aria-label="Super smash"
            {...bind("super")}
          >
            Super
          </button>
          <button className="pad-btn hammer" aria-label="Swing mallet" {...bind("hammer")}>
            Hammer
          </button>
          <button className="pad-btn jump" aria-label="Jump" {...bind("jump")}>
            Jump
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
                ? "Shift complete"
                : mode === "card"
                  ? "Get ready"
                  : ""}
      </p>
    </main>
  );
}
