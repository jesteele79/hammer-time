import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowRight, ChevronDown, Keyboard, Pause, Volume2, VolumeX } from "lucide-react";
import { Game, type Hud, type Mode, type TouchAction } from "@/game/engine";
import { DISPLAY_H, DISPLAY_W } from "@/game/constants";

const BEST_KEY = "hammer-time-best";
const starts = [
  {
    name: "Full shift",
    place: "Hotel lobby",
    note: "Lobby. Restaurant. Campus. Then the pig.",
    image: "/npc-hotel.webp",
    code: "01",
    detail: "The whole run",
  },
  {
    name: "Restaurant",
    place: "Lunch rush",
    note: "Jump counters, slide the service passes, and handle the lunch rush.",
    image: "/npc-server.webp",
    code: "02",
    detail: "Practice the rush",
  },
  {
    name: "Campus",
    place: "Finals week",
    note: "More students. More paper airplanes. Same short fuse.",
    image: "/npc-student.webp",
    code: "03",
    detail: "Dodge the paper",
  },
  {
    name: "Pink pig",
    place: "The Pink Menace",
    note: "12 HP. At least 3 bonks and 3 snots. Settle the score.",
    image: "/boss-pig-reference.webp",
    code: "04",
    detail: "Boss practice",
  },
];
const initial: Hud = {
  score: 0,
  coins: 0,
  world: "1-1",
  name: "Lobby & Lunch Rush",
  time: 420,
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
  stance: "standing",
  boss: null,
  sinus: 3,
  hot: false,
  patience: 2,
  lectureReady: true,
  quest: null,
  questResult: null,
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
    frameRef = useRef<HTMLDivElement>(null),
    gameRef = useRef<Game | null>(null);
  const [mode, setMode] = useState<Mode>("title"),
    [hud, setHud] = useState(initial),
    [muted, setMuted] = useState(false),
    [best, setBest] = useState(0);
  const [ready, setReady] = useState(false);
  const [venue, setVenue] = useState(0);
  const chooseVenue = (next: number) => {
    setVenue(next);
    gameRef.current?.setStartingVenue(next);
  };
  useEffect(() => {
    const canvas = canvasRef.current,
      play = playRef.current,
      frame = frameRef.current;
    if (!canvas || !play || !frame) return;
    const fit = () => {
      const box = play.getBoundingClientRect(),
        scale = Math.min(box.width / DISPLAY_W, box.height / DISPLAY_H);
      frame.style.width = `${Math.floor(DISPLAY_W * scale)}px`;
      frame.style.height = `${Math.floor(DISPLAY_H * scale)}px`;
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
    start = () => gameRef.current?.newGame(venue);
  const controls: [string, string][] = [
    ["← →", "Move"],
    ["Space", "Jump / hold for height"],
    ["Shift", "Run"],
    ["H / X", "Swing mallet"],
    ["F", "Snot rocket"],
    ["E", "Lecture"],
    ["T", "Towel off"],
    ["Q", "Super smash"],
    ["↓ / S", "Crouch / run to slide"],
    ["Esc", "Pause"],
  ];
  const pips = (filled: number) => (
    <i className="pips" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <b key={i} data-full={filled >= i + 1} />
      ))}
    </i>
  );
  return (
    <main className="stage" data-mode={mode} data-stance={hud.stance}>
      {mode === "title" && (
        <section className="start-screen" aria-label="Hammer Time start screen">
          <div
            className="start-backdrop"
            aria-hidden="true"
            style={{
              backgroundImage: `url(${venue < 2 ? "/hotel-corridor.webp" : "/campus-common.webp"})`,
            }}
          />
          <div className="start-shell">
            <header className="start-top">
              <span className="start-edition">A very personal hospitality problem</span>
              <div className="start-top-tools">
                <span className="start-record">
                  Personal best <b>{pad(best)}</b>
                </span>
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
            <div className="start-main">
              <div className="start-copy">
                <p className="start-eyebrow">
                  <span /> Three venues. Zero patience.
                </p>
                <h1>
                  HAMMER
                  <span>
                    TIME<span className="start-period">.</span>
                  </span>
                </h1>
                <p className="start-tagline">
                  Bonk the staff. Dodge the paper.
                  <br />
                  Settle it with the pig.
                </p>
                <div className="start-launch">
                  <button className="start-button" disabled={!ready} onClick={start}>
                    {ready ? "Clock in" : "Getting Hammer ready…"}
                    <ArrowRight size={22} aria-hidden="true" />
                  </button>
                  <div className="start-selected" aria-live="polite">
                    <b>{starts[venue].place}</b>
                    <span>{starts[venue].note}</span>
                  </div>
                </div>
              </div>
              <div className="start-art" aria-hidden="true">
                <div className="start-art-glow" />
                <span className="start-vs">VS.</span>
                <img className="start-hero" src="/hero-idle-calm.png" alt="" draggable="false" />
                <img
                  className="start-pig"
                  src="/boss-pig-reference.webp"
                  alt=""
                  draggable="false"
                />
                <span className="start-pig-label">Soft toy. Hard feelings.</span>
                <svg className="start-paper" viewBox="0 0 90 45">
                  <path d="M4 18 85 4 48 40 38 25Z" fill="#e4e9e5" />
                  <path
                    d="m4 18 34 7L85 4 42 30l6 10"
                    fill="none"
                    stroke="#84969e"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
            <nav className="start-venues" aria-label="Choose a starting point">
              {starts.map((point, index) => (
                <button
                  key={point.name}
                  className="start-venue"
                  data-venue={index}
                  aria-label={`Start at ${point.name}`}
                  aria-pressed={venue === index}
                  disabled={!ready}
                  onClick={() => chooseVenue(index)}
                >
                  <span className="start-venue-number">{point.code}</span>
                  <span className="start-venue-copy">
                    <b>{point.name}</b>
                    <small>{point.detail}</small>
                  </span>
                  <img src={point.image} alt="" draggable="false" />
                  <span className="start-venue-mark" aria-hidden="true">
                    <ArrowRight size={15} />
                  </span>
                </button>
              ))}
            </nav>
            <footer className="start-footer">
              <div className="start-loadout" aria-label="Signature power-ups">
                <span>
                  <img src="/coke-zero.webp" alt="" />
                  <b>
                    Coke Zero<small>Cool off</small>
                  </b>
                </span>
                <span>
                  <img src="/nuts-bag.webp" alt="" />
                  <b>
                    Mixed nuts<small>Charge up</small>
                  </b>
                </span>
                <span>
                  <img src="/buccees-pickup.webp" alt="" />
                  <b>
                    Buc-ee’s<small>Go invincible</small>
                  </b>
                </span>
              </div>
              <details className="start-help">
                <summary>
                  <Keyboard size={18} /> How to play <ChevronDown size={15} />
                </summary>
                <div className="start-help-body">
                  <p>Move with arrows or A / D. On a phone, use the touch controls.</p>
                  <ul>
                    {controls.map(([key, label]) => (
                      <li key={key}>
                        <kbd>{key}</kbd>
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    Snot is always loaded, three blasts at a time; a ! crate&apos;s pepper makes it
                    hot. Staff slip on the puddles. Lecture students and they stop throwing paper.
                    The pig needs at least three bonks and three snots.
                  </p>
                </div>
              </details>
            </footer>
          </div>
        </section>
      )}
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
          <div className="game-frame" ref={frameRef}>
            <canvas
              ref={canvasRef}
              className="game"
              width={DISPLAY_W}
              height={DISPLAY_H}
              aria-label="Hammer Time playfield. Arrows move, Space jumps, H swings, F fires snot, E lectures, T towels off, Q super smash."
            />
            {hud.boss && (
              <div
                className="boss-hud"
                aria-label="Stuffed pig boss health"
                data-defeated={hud.boss.defeated}
              >
                <div>
                  <b>{hud.boss.defeated ? "STUFFING SETTLED" : "THE PINK MENACE"}</b>
                  <span>
                    {hud.boss.hp} / {hud.boss.max}
                  </span>
                </div>
                <meter min="0" max={hud.boss.max} value={hud.boss.hp} aria-label="Pig health" />
                <small>
                  Bonks {Math.min(3, hud.boss.bonks)}/3 · Snots {Math.min(3, hud.boss.snots)}/3
                </small>
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
                    {hud.world === "1-4"
                      ? "Land at least 3 bonks and 3 snots. Pepper refills on the left."
                      : "F snot rockets. E lectures students out of throwing paper."}
                    <br />H swings. Run + ↓ slides under service passes.
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
                    Space jumps · H swings · F fires · E lectures
                    <br />T towels off · Q super smash
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
                      ? "Shift cleared. You earned that Coke Zero."
                      : "Hospitality won this round. Take another swing."}
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
      </div>
      <div className="statusbar">
        <p className="game-hint">
          {active ? hud.hint : "An arcade platformer with very personal customer service."}
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
          <span
            className="pepper-state"
            data-on={hud.hot}
            aria-label={`Snot ${Math.floor(hud.sinus)} of 3${hud.hot ? ", hot" : ""}`}
          >
            {hud.sinus < 1 || hud.cooldown > 0
              ? "Snot reloading"
              : hud.hot
                ? "Snot ready · hot"
                : "Snot ready · F"}
            {pips(hud.sinus)}
          </span>
          <span className="patience" aria-label={`Patience ${hud.patience} of 3`}>
            Patience
            {pips(hud.patience)}
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
          <button
            className="pad-btn"
            aria-label="Crouch, slide or enter staff stash"
            {...bind("down")}
          >
            ↓
          </button>
        </div>
        <div className="actions">
          <button className="pad-btn" aria-label="Wipe sweat" {...bind("towel")}>
            Towel
          </button>
          <button
            className="pad-btn"
            data-on={hud.sinus >= 1 ? "1" : "0"}
            aria-label="Fire snot rocket"
            {...bind("fire")}
          >
            Snot
          </button>
          <button
            className="pad-btn"
            data-on={hud.lectureReady ? "1" : "0"}
            aria-label="Lecture"
            {...bind("lecture")}
          >
            Lecture
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
