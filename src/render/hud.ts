import { PATIENCE_MAX } from "../sim/damage";
import type { Game } from "../sim/game";
import { CHARGE_MAX, HEAT, SINUS_MAX } from "../sim/moves";
import type { PickupKind } from "../sim/rewards";
import { RUN } from "../sim/run";

/** What the shell's HUD shows (spec §10). */
export type HudPayload = {
  venue: string;
  world: string;
  portrait: string | null;
  heat: number;
  sinus: number;
  sinusMax: number;
  charge: number;
  chargeMax: number;
  patience: number;
  patienceMax: number;
  score: number;
  cans: number;
  lives: number;
  /** Whole seconds on the clock, or null where there is no clock (the stash). */
  time: number | null;
  hurry: boolean;
  /** Whole seconds left of a Buc-ee's boost. */
  star: number;
  hot: boolean;
  /** The lecture is off its cooldown: the touch pad lights its button. */
  lecture: boolean;
  /** "Checkpoint saved" shows for two seconds after a punch clock. */
  saved: boolean;
  /** The most pressing thing to know, one line. */
  hint: string;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Up on the mezzanine side: the landing, the stairs and the balcony. */
const MEZZANINE = { x0: 6560, x1: 10200, below: -100 } as const;
/** The early stretch where the first hint teaches the snot and the ! crate. */
const EARLY_X = 1500;

/** The shipped game's hint (src/game/engine.ts hint()), first match wins, without the cast's lines. */
export function hintOf(game: Game): string {
  const h = game.world.hero;
  const d = game.door;
  if (d) {
    if (d.kind === "stash") return `↓ ${d.label} · the stash`;
    if (d.kind === "return") return "↓ at the cart · back to the lobby";
    if (d.kind === "exit") return `${d.label} · walk in to finish your shift`;
    return `${d.label} · ${d.opens ?? "closed"}`;
  }
  if (h.crouch) return "Stay low · release ↓ when clear to stand";
  if (game.level.id === "stash") return "Staff stash · ↓ at the cart to go back";
  if (game.run.star > 0) return "Buc-ee's boost · nothing can touch you";
  if (h.heat >= HEAT.tired) return "Overheated · T to towel off";
  if (h.charge >= CHARGE_MAX) return "Super smash ready · Q";
  if (h.x < EARLY_X) return "F snot rocket · jump into the ! crate for hot pepper";
  if (h.x >= MEZZANINE.x0 && h.x <= MEZZANINE.x1 && h.y <= MEZZANINE.below) return "Up to the mezzanine · ↓ + jump drops you back down";
  return h.hot ? "Hot snot pierces · nuts charge Q super smash" : "Find a ! crate for hot pepper";
}

/** What a pickup just did, for the hint line (owner, 2026-10-12: each power-up has one clear job). */
export function pickupNote(kind: PickupKind, h: { charge: number }): string {
  if (kind === "can") return "Coke Zero · cooled down";
  if (kind === "bucees") return `Buc-ee's · shield for ${RUN.star} seconds`;
  if (kind === "pepper") return "Pepper · extra hit and hot snot";
  if (h.charge >= CHARGE_MAX) return "Mixed nuts · Super Smash ready · Q";
  return `Mixed nuts · smash ${Math.min(2, Math.floor(h.charge / RUN.nutCharge))} of 3`;
}

/** `note` is a pickup's line, shown in place of the hint while it lasts. */
export function hudOf(game: Game, portrait: string | null, saved = false, note: string | null = null): HudPayload {
  const h = game.world.hero;
  const clocked = game.level.time > 0;
  const time = clocked ? Math.ceil(game.run.time) : null;
  return {
    venue: game.level.name,
    world: game.level.world,
    portrait,
    heat: clamp(h.heat, 0, 100),
    sinus: clamp(h.sinus, 0, SINUS_MAX),
    sinusMax: SINUS_MAX,
    charge: clamp(h.charge, 0, CHARGE_MAX),
    chargeMax: CHARGE_MAX,
    patience: clamp(h.patience, 0, PATIENCE_MAX),
    patienceMax: PATIENCE_MAX,
    score: game.run.score,
    cans: game.run.cans,
    lives: game.run.lives,
    time,
    hurry: clocked && game.run.time < RUN.hurry,
    star: Math.ceil(game.run.star),
    hot: h.hot,
    lecture: h.lectureCd <= 0,
    saved,
    hint: note ?? hintOf(game),
  };
}

/** Changes only when the HUD would look different: whole heat points, tenths of a snot charge, whole seconds. */
export const hudKey = (p: HudPayload) =>
  [
    Math.round(p.heat),
    p.sinus.toFixed(1),
    p.charge,
    p.patience,
    p.portrait,
    p.score,
    p.cans,
    p.lives,
    p.time,
    p.star,
    p.hot,
    p.lecture,
    p.saved,
    p.hint,
    p.venue,
  ].join("|");
