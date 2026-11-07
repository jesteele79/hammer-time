import { HERO_CROUCH_H } from "./constants";
import { damage, stun } from "./damage";
import type { GameEvent } from "./events";
import { bodyRect, overlapsRect } from "./geometry";
import type { Level, LevelPlatform } from "./level";
import { canStand } from "./physics";
import type { HeroState, Rect, Stage } from "./types";

export type BandState = "wait" | "rise" | "march" | "gone";
/**
 * A pipe band (story spec §10.1, the 2026-11-06 note): one marching rank on the floor, drawn six deep, against him; the
 * nearest piper is missing, so a hole at the floor lets a slide through. It waits until he passes `from`, raises its pipes
 * for `PARADE.rise` s, marches left from `x`, and is gone at `x1`.
 */
export type Band = { id: string; x: number; x1: number; from: number; color: string; state: BandState; t: number };
/** A piper falling in behind him after the drum major's handover: `walked` how far he has stepped, for the view's stride. */
export type Follower = { x: number; walked: number };
/**
 * The parade: its bands, the drum corps (where it plays and how near its beat knocks him off a barrier), the last beat
 * heard, the pipers who follow him, and the band carrying him if one caught him: `x` his place against the rank.
 */
export type ParadeState = {
  bands: Band[];
  corps: { x: number; reach: number } | null;
  beat: number;
  followers: Follower[];
  carry: { band: string; from: number; x: number } | null;
};

/**
 * The bands' march, the rise before it, a rank's size and its hole, how far a catch carries him; the drum corps' beat (the
 * song's fourth at 96), how far it is heard, the knock off a platform; the followers' spacing and their most speed.
 */
export const PARADE = { speed: 200, rise: 1.0, w: 110, h: 440, hole: 220, carry: 400, beat: 2.5, hear: 1400, knock: 120, hop: 300, drop: 0.3, followSpace: 140, followSpeed: 400 } as const;
/** What the drum corps' beat shakes him off. */
const SHAKEN: ReadonlySet<LevelPlatform["kind"]> = new Set<LevelPlatform["kind"]>(["barrier", "bleacher", "tent", "tier"]);

export function createParade(level: Pick<Level, "parade">): ParadeState | null {
  const p = level.parade;
  if (!p) return null;
  return { bands: p.bands.map((b) => ({ ...b, state: "wait" as const, t: 0 })), corps: p.corps ?? null, beat: -1, followers: [], carry: null };
}

/** The rank on the floor: what catches him unless he is under its hole. */
export const bandRect = (b: Pick<Band, "x">): Rect => ({ x: b.x - PARADE.w / 2, y: -PARADE.h, w: PARADE.w, h: PARADE.h });

/** A band starts now, whoever is where: the drum major's whistle, or the checks. */
export function startBand(b: Band, events: GameEvent[]): void {
  if (b.state !== "wait") return;
  b.state = "rise";
  b.t = 0;
  events.push({ type: "bandRise", id: b.id, x: b.x });
}

export type ParadeWorld = { hero: HeroState; stage: Stage; parade: ParadeState | null; time: number };

/** Low enough to pass under the missing piper: a slide or a crouch. */
const low = (h: HeroState) => h.h <= HERO_CROUCH_H;

function stepBands(p: ParadeState, h: HeroState, dt: number, events: GameEvent[]) {
  for (const b of p.bands) {
    if (b.state === "wait") {
      if (h.x >= b.from) startBand(b, events);
    } else if (b.state === "rise") {
      b.t += dt;
      if (b.t >= PARADE.rise) {
        b.state = "march";
        events.push({ type: "bandStep", id: b.id, x: b.x });
      }
    } else if (b.state === "march") {
      b.x -= PARADE.speed * dt;
      if (b.x <= b.x1) b.state = "gone";
    }
  }
}

/** Carried with the rank, never into a wall or past the level's start; after its 400 px, or when it stops, dropped behind it. */
function stepCarry(p: ParadeState, w: ParadeWorld, events: GameEvent[]) {
  const c = p.carry;
  if (!c) return;
  const h = w.hero;
  const b = p.bands.find((k) => k.id === c.band);
  const want = b ? b.x + c.x : h.x;
  const start = w.stage.bounds.x + h.w / 2;
  const free = !!b && b.state === "march" && want >= start && canStand({ x: want, y: h.y, w: h.w }, w.stage, h.h);
  if (free) h.x = want;
  h.vx = 0;
  if (free && c.from - h.x < PARADE.carry) return;
  p.carry = null;
  // Dropped, and the rank marches on over him: the hit throws him out behind it.
  h.stunT = 0;
  h.invuln = 0;
  damage(h, w.stage, h.x - 1, events);
  events.push({ type: "dropped", x: h.x });
}

/** A rank meets him standing, walking or in the air: caught, unless he is low, in grace or already down. */
function catchHim(p: ParadeState, h: HeroState, events: GameEvent[]) {
  if (p.carry || h.invuln > 0 || h.move?.kind === "tumble" || low(h)) return;
  const me = bodyRect(h);
  const b = p.bands.find((k) => k.state === "march" && overlapsRect(me, bandRect(k)));
  if (!b) return;
  p.carry = { band: b.id, from: h.x, x: h.x - b.x };
  h.vx = 0;
  h.vy = Math.max(0, h.vy);
  stun(h, PARADE.carry / PARADE.speed, events);
  events.push({ type: "caught", x: h.x });
}

/** The drum corps' beat: heard within `hear`, it shakes the screen, and on a barrier or a bleacher near it he is knocked off. */
function stepCorps(p: ParadeState, w: ParadeWorld, events: GameEvent[]) {
  const k = p.corps;
  if (!k) return;
  const beat = Math.floor(w.time / PARADE.beat);
  if (beat === p.beat) return;
  const first = p.beat < 0;
  p.beat = beat;
  const h = w.hero;
  if (first || Math.abs(h.x - k.x) > PARADE.hear) return;
  events.push({ type: "drumHit", x: k.x });
  if (!h.onGround || Math.abs(h.x - k.x) > k.reach) return;
  const on = w.stage.platforms.find((q) => SHAKEN.has((q as LevelPlatform).kind) && Math.abs(h.y - q.y) < 2 && h.x >= q.x0 - 30 && h.x <= q.x1 + 30);
  if (!on) return;
  h.vx = PARADE.knock * (h.x < k.x ? -1 : 1);
  h.vy = -PARADE.hop;
  h.y -= 1;
  h.onGround = false;
  h.dropT = PARADE.drop;
  events.push({ type: "knocked", x: h.x, y: h.y });
}

/** The followers keep their spacing behind him, never faster than a piper walks, and stop when he stops. */
function stepFollowers(p: ParadeState, h: HeroState, dt: number, walking: boolean) {
  if (!walking) return;
  let lead = h.x;
  for (const f of p.followers) {
    const want = lead - PARADE.followSpace;
    const most = PARADE.followSpeed * dt;
    const step = Math.max(-most, Math.min(most, want - f.x));
    f.x += step;
    f.walked += Math.abs(step);
    lead = f.x;
  }
}

/** `walking`: a way held this step; the followers march only while he does. */
export function stepParade(w: ParadeWorld, dt: number, events: GameEvent[], walking = true): void {
  const p = w.parade;
  if (!p) return;
  stepBands(p, w.hero, dt, events);
  stepCarry(p, w, events);
  catchHim(p, w.hero, events);
  stepCorps(p, w, events);
  stepFollowers(p, w.hero, dt, walking);
}
