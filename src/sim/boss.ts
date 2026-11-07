import type { GameEvent } from "./events";
import type { BossSpec } from "./level";
import { conductorRect, createConductor, hitConductor, stepConductor, type Conductor, type ConductorWorld } from "./conductor";
import { createMajor, hitMajor, majorRect, stepMajor, type Major, type MajorWorld } from "./major";
import { createReplacement, hitReplacement, replacementRect, stepReplacement, type Replacement, type ReplacementWorld } from "./replacement";
import { createPurser, hitPurser, purserRect, stepPurser, type Purser, type PurserWorld } from "./purser";
import { BOSS_ID, createSupervisor, hitSupervisor, stepSupervisor, supervisorRect, type Supervisor, type SupervisorWorld } from "./supervisor";
import { createTitanium, hitTitanium, stepTitanium, titaniumRect, type Titanium, type TitaniumWorld } from "./titanium";
import type { Rect } from "./types";

export { BOSS_ID };
/** The bosses beside the pig: each its own module, sharing the world's one slot and the HUD's one bar. */
export type Boss = Supervisor | Titanium | Purser | Conductor | Major | Replacement;

/** The name on the HUD's bar. */
export const BOSS_NAMES: Record<Boss["kind"], string> = { supervisor: "Housekeeping", titanium: "Lifetime Titanium guy", purser: "The purser", conductor: "The conductor", major: "The drum major", replacement: "The replacement" };

export function createBoss(b: BossSpec, floor: number): Boss | null {
  if (b.kind === "titanium") return createTitanium(b);
  if (b.kind === "purser") return createPurser(b);
  if (b.kind === "conductor") return createConductor(b);
  if (b.kind === "major") return createMajor(b);
  if (b.kind === "replacement") return createReplacement(b);
  return b.kind === "supervisor" ? createSupervisor(b, floor) : null;
}

export const bossRect = (b: Boss): Rect => (b.kind === "titanium" ? titaniumRect(b) : b.kind === "purser" ? purserRect(b) : b.kind === "conductor" ? conductorRect(b) : b.kind === "major" ? majorRect(b) : b.kind === "replacement" ? replacementRect(b) : supervisorRect(b));

/** A hit on the boss from anywhere: true when it counted. */
export const hitBoss = (b: Boss, by: "bonk" | "snot", events: GameEvent[]): boolean =>
  b.kind === "titanium" ? hitTitanium(b, by, events) : b.kind === "purser" ? hitPurser(b, by, events) : b.kind === "conductor" ? hitConductor(b, by, events) : b.kind === "major" ? hitMajor(b, by, events) : b.kind === "replacement" ? hitReplacement(b, by, events) : hitSupervisor(b, by, events);

/** It has been met: its bar is up, until it is down. */
export const bossUp = (b: Boss | null): boolean => !!b && b.awake && b.state !== "down";

export function stepBoss(w: SupervisorWorld & TitaniumWorld & PurserWorld & ConductorWorld & MajorWorld & ReplacementWorld & { boss: Boss | null }, dt: number, events: GameEvent[]): void {
  if (w.boss?.kind === "titanium") stepTitanium(w.boss, w, dt, events);
  else if (w.boss?.kind === "purser") stepPurser(w.boss, w, dt, events);
  else if (w.boss?.kind === "conductor") stepConductor(w.boss, w, dt, events);
  else if (w.boss?.kind === "major") stepMajor(w.boss, w, dt, events);
  else if (w.boss?.kind === "replacement") stepReplacement(w.boss, w, dt, events);
  else if (w.boss) stepSupervisor(w.boss, w, dt, events);
}
