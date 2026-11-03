/** The two volumes and the mute (plan decision 12), kept on the device; 0 to 100 each. */
export const SOUND_KEY = "hammer-time-sound";
export type SoundSettings = { music: number; effects: number; muted: boolean };
export const DEFAULT_SOUND: SoundSettings = { music: 80, effects: 80, muted: false };

const volume = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback);

/** The settings as saved; nothing saved or a broken save reads as the defaults, a volume out of range as its nearest end. */
export function parseSound(raw: string | null): SoundSettings {
  let got: unknown = null;
  try {
    got = raw === null ? null : JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SOUND };
  }
  if (!got || typeof got !== "object") return { ...DEFAULT_SOUND };
  const o = got as Record<string, unknown>;
  return { music: volume(o.music, DEFAULT_SOUND.music), effects: volume(o.effects, DEFAULT_SOUND.effects), muted: o.muted === true };
}
