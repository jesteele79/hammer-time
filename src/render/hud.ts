import { PATIENCE_MAX } from "../sim/damage";
import { CHARGE_MAX, SINUS_MAX } from "../sim/moves";
import type { HeroState } from "../sim/types";

/** What the shell's HUD shows (spec §10), as far as the look scene goes; R2 adds score, Coke Zero, lives and the clock. */
export type HudPayload = {
  venue: string;
  mode: string;
  portrait: string | null;
  heat: number;
  sinus: number;
  sinusMax: number;
  charge: number;
  chargeMax: number;
  patience: number;
  patienceMax: number;
  /** Keys and what they do, joined by " · ", each written "KEY what". */
  hint: string;
};

export const HUD_HINT = "H swing · F snot · E lecture · T towel · Q smash · G practice hit";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function hudOf(h: Pick<HeroState, "heat" | "sinus" | "charge" | "patience">, portrait: string | null): HudPayload {
  return {
    venue: "Hotel lobby",
    mode: "Look test",
    portrait,
    heat: clamp(h.heat, 0, 100),
    sinus: clamp(h.sinus, 0, SINUS_MAX),
    sinusMax: SINUS_MAX,
    charge: clamp(h.charge, 0, CHARGE_MAX),
    chargeMax: CHARGE_MAX,
    patience: clamp(h.patience, 0, PATIENCE_MAX),
    patienceMax: PATIENCE_MAX,
    hint: HUD_HINT,
  };
}

/** Changes only when the HUD would look different: whole heat points, tenths of a snot charge. */
export const hudKey = (p: HudPayload) => [Math.round(p.heat), p.sinus.toFixed(1), p.charge, p.patience, p.portrait].join("|");
