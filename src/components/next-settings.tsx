import { useEffect, useRef } from "react";
import type { Quality } from "@/render/app";
import { DEFAULT_SOUND, type SoundSettings } from "@/game/sound-settings";
import { KEYS, PAD_KEYS } from "./next-keys";

const QUALITIES: { value: Quality | null; label: string }[] = [
  { value: null, label: "Auto" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const PAD_LINE = "A jumps · X swings · B snots · Y lobs a box · RB runs · LB towels · RT smashes · LT lectures · Start pauses";

/**
 * The Settings (story spec §14), from the home screen's tools and the break card: the music's and the effects' volumes
 * (Sound off is both at 0), the quality, the controller and what its buttons do, the keys, and the motion as the system
 * has it. Escape or Done closes it.
 */
export function NextSettings({
  sound,
  onSound,
  quality,
  liveQuality,
  onQuality,
  pad,
  onClose,
}: {
  sound: SoundSettings;
  onSound: (s: SoundSettings) => void;
  quality: Quality | null;
  /** The tier Auto draws at now, shown beside it. */
  liveQuality: Quality | null;
  onQuality: (q: Quality | null) => void;
  /** A controller is connected. */
  pad: boolean;
  onClose: () => void;
}) {
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const silent = sound.music === 0 && sound.effects === 0;
  const slider = (name: "music" | "effects", label: string) => (
    <label className="next-settings__row">
      <span>{label}</span>
      <input
        ref={name === "music" ? first : undefined}
        type="range"
        min={0}
        max={100}
        step={5}
        value={sound[name]}
        aria-valuetext={`${sound[name]} percent`}
        onChange={(e) => onSound({ ...sound, [name]: Number(e.target.value) })}
      />
      <b>{sound[name]}</b>
    </label>
  );
  return (
    <div className="next-settings" role="dialog" aria-modal="true" aria-label="Settings">
      <section className="next-settings__card">
        <h2 className="next-veil__title">Settings</h2>
        {slider("music", "Music")}
        {slider("effects", "Effects")}
        <button
          type="button"
          className="next-veil__button next-veil__button--quiet next-settings__mute"
          onClick={() => onSound(silent ? { ...sound, music: DEFAULT_SOUND.music, effects: DEFAULT_SOUND.effects } : { ...sound, music: 0, effects: 0 })}
        >
          {silent ? "Sound on" : "Sound off"}
        </button>
        <label className="next-settings__row next-settings__quality">
          <span>Quality</span>
          <select value={quality ?? "auto"} onChange={(e) => onQuality(e.target.value === "auto" ? null : (e.target.value as Quality))}>
            {QUALITIES.map((q) => (
              <option key={q.label} value={q.value ?? "auto"}>
                {q.value === null && liveQuality ? `Auto · ${liveQuality[0].toUpperCase()}${liveQuality.slice(1)}` : q.label}
              </option>
            ))}
          </select>
        </label>
        <p className="next-settings__pad">{pad ? `Controller: connected · ${PAD_LINE}` : "Controller: none"}</p>
        <p className="next-settings__keys">
          {(pad ? PAD_KEYS : KEYS).map(([key, what]) => (
            <span key={key} className="next-hud__key">
              <kbd>{key}</kbd>
              {what}
            </span>
          ))}
        </p>
        <p className="next-settings__note">Reduced motion follows your system.</p>
        <button type="button" className="next-veil__button" onClick={onClose}>
          Done
        </button>
      </section>
    </div>
  );
}

/** New game's question: the journey and its bests erased on Erase; Keep (focused first) leaves everything as it was. */
export function NextErase({ onErase, onKeep }: { onErase: () => void; onKeep: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onKeep();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onKeep]);
  return (
    <div className="next-settings" role="dialog" aria-modal="true" aria-label="New game">
      <section className="next-settings__card">
        <h2 className="next-veil__title">Start over?</h2>
        <p className="next-veil__line">The journey and its bests are erased.</p>
        <button type="button" className="next-veil__button" onClick={onErase}>
          Erase
        </button>
        <button ref={keep} type="button" className="next-veil__button next-veil__button--quiet" onClick={onKeep}>
          Keep
        </button>
      </section>
    </div>
  );
}
