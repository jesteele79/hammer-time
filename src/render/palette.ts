/** Colors taken from the owner's portraits and the lobby, stored once (spec §3). */
export const PALETTE = {
  skin: "#b5642a",
  skinShadow: "#8e4a1f",
  skinHighlight: "#d07f44",
  shirt: "#111417",
  shorts: "#2f4a74",
  wood: "#c9a16a",
  woodShadow: "#8c6a3f",
  outline: "#101010",
  lobbyAmbient: "#ffe9c9",
  marbleTop: "#d9d2c4",
  marbleFront: "#b8ad99",
  brass: "#c9a24a",
  lampGlow: "#ffd9a0",
  /** Far limbs, parts only, never the head: a warm shadow, not a grey. */
  farLimb: "#b9a69a",
  leaf: "#4f7a4a",
  wallWood: "#4a3327",
};

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) =>
  "#" + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

/** The shadow tone: darkened 22 percent and nudged toward blue. */
export function shadowOf(hex: string): string {
  const [r, g, b] = toRgb(hex);
  return toHex([r * 0.78, g * 0.78, b * 0.86]);
}
/** The highlight tone: lightened 18 percent. */
export function highlightOf(hex: string): string {
  const [r, g, b] = toRgb(hex);
  return toHex([r + (255 - r) * 0.18, g + (255 - g) * 0.18, b + (255 - b) * 0.18]);
}
/** The three tones every code-drawn fill gets. */
export const tones = (base: string) => ({ base, shadow: shadowOf(base), highlight: highlightOf(base) });

/** A color at a fraction of its brightness, for ambient tints. */
export function dim(hex: string, k: number): string {
  return toHex(toRgb(hex).map((v) => v * k));
}
