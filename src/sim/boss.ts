import type { GameEvent } from "./events";
import type { BossSpec } from "./level";
import { BOSS_ID, createSupervisor, hitSupervisor, stepSupervisor, supervisorRect, type Supervisor, type SupervisorWorld } from "./supervisor";
import type { Rect } from "./types";

export { BOSS_ID };
/** The bosses beside the pig: each its own module, sharing the world's one slot and the HUD's one bar. */
export type Boss = Supervisor;

/** The name on the HUD's bar. */
export const BOSS_NAMES: Record<Boss["kind"], string> = { supervisor: "Housekeeping" };

export function createBoss(b: BossSpec, floor: number): Boss | null {
  return b.kind === "supervisor" ? createSupervisor(b, floor) : null;
}

export const bossRect = (b: Boss): Rect => supervisorRect(b);

/** A hit on the boss from anywhere: true when it counted. */
export const hitBoss = (b: Boss, by: "bonk" | "snot", events: GameEvent[]): boolean => hitSupervisor(b, by, events);

/** It has been met: its bar is up, until it is down. */
export const bossUp = (b: Boss | null): boolean => !!b && b.awake && b.state !== "down";

export function stepBoss(w: SupervisorWorld & { boss: Boss | null }, dt: number, events: GameEvent[]): void {
  if (w.boss) stepSupervisor(w.boss, w, dt, events);
}
