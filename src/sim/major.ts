import type { GameEvent } from "./events";
import { sweptHeadHits } from "./geometry";
import { BURST_R, MALLET_R } from "./hits";
import type { BossSpec } from "./level";
import { PARADE, startBand, type Band, type ParadeState } from "./parade";
import { BOSS_ID } from "./supervisor";
import type { HeroState, Point, Rect, Stage } from "./types";

export type MajorState = "wait" | "whistle" | "rank" | "windup" | "throw" | "catch" | "hurt" | "rest" | "handover" | "down";
/**
 * The drum major at the Marktplatz (story spec §10.1, the 2026-11-06 note): three rounds, each a whistle and a rank of
 * four from the wing, then the mace thrown two seconds high, the only time he can be hit. On the third: "Carry on, sir."
 * and the pipers fall in behind Hammer. `mace` while it is in the air; `rank` the band his whistle called this round.
 */
export type Major = {
  kind: "major";
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  state: MajorState;
  hp: number;
  max: number;
  round: number;
  timer: number;
  hurtT: number;
  mace: { x: number; y: number; vy: number } | null;
  awake: boolean;
  said: number;
  arena: [number, number];
  rank: string | null;
  /** The mace he dropped when hit: it clatters down and he takes it up again in his rest. */
  dropped: boolean;
};

/** His numbers: the wake, the whistle, the rank he calls (how many, how far out), the throw (two seconds up and down), his flinch, his rests, the handover. */
export const MAJOR = { hp: 3, notice: 700, whistle: 0.8, rank: { count: 4, from: 900, past: 300, color: "#7a1f2b" }, windup: 0.5, air: 2.0, up: -1960, gravity: 1960, catch: 0.3, hurt: 0.6, rest: 1.2, handover: 1.5, points: 1000, land: 60, w: 110, h: 380 } as const;
const FOLLOWERS = 4;

export const createMajor = (b: BossSpec): Major => ({ kind: "major", x: b.x, y: 0, w: MAJOR.w, h: MAJOR.h, facing: -1, state: "wait", hp: MAJOR.hp, max: MAJOR.hp, round: 0, timer: 0, hurtT: 0, mace: null, awake: false, said: 0, arena: b.arena, rank: null, dropped: false });

export const majorRect = (m: Major): Rect => ({ x: m.x - m.w / 2, y: m.y - m.h, w: m.w, h: m.h });

/** The mace thrown from his hand, straight up. */
export const throwMace = (m: Major): Major["mace"] => ({ x: m.x, y: m.y - m.h, vy: MAJOR.up });

/** A hit counts only while his mace is in the air: the bonk, a snot, the smash's burst. */
export function hitMajor(m: Major, by: "bonk" | "snot", events: GameEvent[]): boolean {
  if (m.state !== "throw" || m.hurtT > 0) return false;
  m.hp = Math.max(0, m.hp - 1);
  m.hurtT = MAJOR.hurt;
  m.dropped = true;
  events.push({ type: "bossHit", by, x: m.x, y: m.y - m.h * 0.6, hp: m.hp });
  if (m.hp === 0) {
    m.state = "handover";
    m.timer = MAJOR.handover;
    return true;
  }
  m.state = "hurt";
  m.timer = MAJOR.hurt;
  return true;
}

/** A rank of four from the wing, marching the arena: a band with nothing to wait for. */
export function spawnRank(p: ParadeState, x: number, x1: number, color: string, events: GameEvent[]): Band {
  const b: Band = { id: `rank-${p.bands.filter((k) => k.id.startsWith("rank")).length + 1}`, x, x1, from: -Infinity, color, state: "wait", t: 0 };
  p.bands.push(b);
  startBand(b, events);
  return b;
}

export type MajorWorld = { hero: HeroState; stage: Stage; swing: Point[]; hits: number[]; parade: ParadeState | null };

/** The mace in the air: up and down under its own gravity; back at his hand, it lands, on Hammer if he stands under it. */
function stepMace(m: Major, w: MajorWorld, dt: number, events: GameEvent[]): boolean {
  const c = m.mace;
  if (!c) return false;
  c.vy += MAJOR.gravity * dt;
  c.y += c.vy * dt;
  if (c.vy < 0 || c.y < m.y - m.h) return false;
  const h = w.hero;
  const hit = Math.abs(h.x - c.x) <= MAJOR.land && h.onGround;
  if (hit) w.hits.push(c.x === h.x ? c.x + 1 : c.x);
  events.push({ type: "maceLand", x: c.x, y: m.y, hit });
  m.mace = null;
  return true;
}

export function stepMajor(m: Major, w: MajorWorld, dt: number, events: GameEvent[]): void {
  m.hurtT = Math.max(0, m.hurtT - dt);
  if (m.state === "down") return;
  const h = w.hero;
  if (!m.awake && Math.abs(h.x - m.x) <= MAJOR.notice) {
    m.awake = true;
    whistle(m, events);
  }
  if (!m.awake) return;
  m.facing = h.x < m.x ? -1 : 1;
  // He holds the Marktplatz while he stands: no way past him to the office.
  if (m.state !== "handover" && h.x > m.arena[1]) {
    h.x = m.arena[1];
    h.vx = Math.min(0, h.vx);
  }
  // The mallet's arc this step (once a swing), the smash's burst.
  const mv = h.move;
  if (mv?.kind === "swing" && !mv.victims.includes(BOSS_ID))
    for (let k = 0; k < w.swing.length; k++) {
      if (!sweptHeadHits(w.swing[Math.max(0, k - 1)], w.swing[k], MALLET_R, majorRect(m))) continue;
      if (hitMajor(m, "bonk", events)) mv.victims.push(BOSS_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(m.x - burst.x, m.y - m.h / 2 - burst.y) <= BURST_R) hitMajor(m, "bonk", events);
  const thrown = m.state === "throw" && !m.mace;
  const landed = !thrown && stepMace(m, w, dt, events);
  m.timer -= dt;
  switch (m.state) {
    case "whistle": {
      if (m.timer > 0) return;
      const p = w.parade;
      m.rank = p ? spawnRank(p, m.x + MAJOR.rank.from, m.arena[0] - 200, MAJOR.rank.color, events).id : null;
      m.state = "rank";
      return;
    }
    case "rank": {
      const b = w.parade?.bands.find((k) => k.id === m.rank);
      if (b && b.state !== "gone" && b.x > m.x - MAJOR.rank.past) return;
      windup(m, events);
      return;
    }
    case "windup":
      if (m.timer > 0) return;
      m.state = "throw";
      m.dropped = false;
      m.mace = throwMace(m);
      events.push({ type: "maceUp", x: m.x, y: m.y - m.h });
      return;
    case "throw":
      if (thrown) m.mace = throwMace(m);
      if (!landed) return;
      m.state = "catch";
      m.timer = MAJOR.catch;
      return;
    case "catch":
      if (m.timer > 0) return;
      m.state = "rest";
      m.timer = MAJOR.rest;
      return;
    case "hurt":
      if (m.timer > 0) return;
      m.state = "rest";
      m.timer = MAJOR.rest;
      m.round++;
      return;
    case "rest":
      // A round won is a new round: its whistle and its rank; else the mace again.
      if (m.timer > 0 || m.mace) return;
      if (m.dropped) whistle(m, events);
      else windup(m, events);
      return;
    case "handover":
      // He hands Hammer the mace as the handover begins.
      if (m.said < 2) {
        m.said = 2;
        events.push({ type: "bossSay", text: "Carry on, sir.", seconds: 2 });
        events.push({ type: "handover", x: m.x, y: m.y - m.h * 0.5 });
      }
      if (m.timer > 0) return;
      m.state = "down";
      m.mace = null;
      events.push({ type: "bossDown", x: m.x, y: m.y - m.h, points: MAJOR.points });
      events.push({ type: "follow", n: FOLLOWERS });
      // His ranks fall out: their four pipers are the ones who fall in behind Hammer.
      if (w.parade) {
        for (const b of w.parade.bands) if (b.id.startsWith("rank")) b.state = "gone";
        w.parade.followers = Array.from({ length: FOLLOWERS }, (_, i) => ({ x: h.x - PARADE.followSpace * (i + 1), walked: 0 }));
      }
      return;
  }
}

function whistle(m: Major, events: GameEvent[]) {
  m.state = "whistle";
  m.timer = MAJOR.whistle;
  m.dropped = false;
  events.push({ type: "whistle", x: m.x, y: m.y - m.h });
  if (m.said === 0) {
    m.said = 1;
    events.push({ type: "bossSay", text: "Stand clear!", seconds: 2 });
  }
}

function windup(m: Major, events: GameEvent[]) {
  m.state = "windup";
  m.timer = MAJOR.windup;
  events.push({ type: "bossWindup", x: m.x, y: m.y - m.h });
}
