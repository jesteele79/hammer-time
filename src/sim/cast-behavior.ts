import { GRAVITY_DOWN, STEP } from "./constants";
import { CAST, T, TICKETS, noticeLine, say, setAct, type CastAct, type Npc } from "./cast";
import type { GameEvent } from "./events";
import type { Missile } from "./missiles";
import { floorAt, moveBody } from "./physics";
import type { Puddle } from "./snot";
import type { HeroState, Point, Stage, Target } from "./types";

export type CastWorld = {
  stage: Stage;
  hero: HeroState;
  cast: Npc[];
  targets: Target[];
  missiles: Missile[];
  puddles: Puddle[];
  hits: number[];
  swing: Point[];
  nextMissile: number;
  time: number;
};

/** Who holds an attack ticket: a wind-up, an attack, or a bellhop chasing the cart he shoved. */
const TICKET_ACTS: ReadonlySet<CastAct> = new Set<CastAct>(["windup", "attack", "chase"]);
export const attackers = (cast: Npc[]): number => cast.filter((n) => n.alive && TICKET_ACTS.has(n.act)).length;
export const ticketFree = (cast: Npc[]): boolean => attackers(cast) < TICKETS;

const toward = (n: Npc, h: HeroState): 1 | -1 => (h.x < n.x ? -1 : 1);
const sameLevel = (n: Npc, h: HeroState) => Math.abs(h.y - n.level) < 60;

/** Something to stand on at `x` within a step of `y`: a floor or a platform. */
export function supportAt(stage: Stage, x: number, y: number): boolean {
  const f = floorAt(stage, x, y - 24);
  if (f !== null && Math.abs(f - y) <= 24) return true;
  return stage.platforms.some((p) => x >= p.x0 && x <= p.x1 && Math.abs(p.y - y) <= 24);
}

/** The double-take, once per life, when he comes within the role's range on their floor (students see the whole lobby). */
function notice(n: Npc, w: CastWorld, events: GameEvent[]): boolean {
  const h = w.hero;
  if (n.noticed || (n.act !== "idle" && n.act !== "walk")) return false;
  const c = CAST[n.role];
  if (Math.abs(h.x - n.x) > c.notice || (n.role !== "student" && !sameLevel(n, h))) return false;
  n.noticed = true;
  n.facing = toward(n, h);
  say(n, noticeLine(n), events);
  // The office worker never looks up: a mutter, no double-take.
  if (n.role === "office") return false;
  n.vx = 0;
  setAct(n, "notice");
  events.push({ type: "castNotice", id: n.id, x: n.x, y: n.y - n.h });
  return true;
}

/** Walks the patrol between x0 and x1 at `speed`, turning at its ends, at walls and at ledges; stands still with no patrol. */
function patrol(n: Npc, w: CastWorld, speed: number): void {
  if (n.x1 - n.x0 < 1) {
    n.vx = 0;
    return;
  }
  const ahead = n.x + n.facing * (n.w / 2 + 10);
  if (n.x + speed * STEP >= n.x1) n.facing = -1;
  else if (n.x - speed * STEP <= n.x0) n.facing = 1;
  else if (n.blocked || !supportAt(w.stage, ahead, n.y)) n.facing = n.facing === 1 ? -1 : 1;
  n.vx = n.facing * speed;
  n.act = "walk";
}

function stepAct(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  void dt;
  switch (n.act) {
    case "notice":
      n.vx = 0;
      if (n.actT >= T.notice) setAct(n, "idle");
      return;
    default:
      break;
  }
  if (notice(n, w, events)) return;
  if (n.role === "server") patrol(n, w, CAST.server.walk);
  else if (n.role === "office") patrol(n, w, CAST.office.march);
  else n.vx = 0;
}

function physics(n: Npc, w: CastWorld, dt: number): void {
  if (!n.onGround) n.vy += GRAVITY_DOWN * dt;
  const vx0 = n.vx;
  moveBody(n, w.stage, dt);
  n.blocked = vx0 !== 0 && n.vx === 0;
}

/** One step of the cast, after Hammer and the carts have moved. */
export function stepCast(w: CastWorld, dt: number, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void {
  void prevHeroY;
  void jumpHeld;
  for (const n of w.cast) {
    if (!n.alive) continue;
    n.actT += dt;
    n.rest = Math.max(0, n.rest - dt);
    n.bumpT += dt;
    stepAct(n, w, dt, events);
    physics(n, w, dt);
  }
}
