import { CAST_LINES, pick } from "../game/lines";
import {
  CAST,
  FALL_MARGIN,
  KNOCK,
  POINTS,
  STOMP,
  T,
  TICKETS,
  hittable,
  noticeLine,
  npcRect,
  say,
  setAct,
  spill,
  standing,
  strikeNpc,
  type CastAct,
  type Npc,
} from "./cast";
import { GRAVITY_DOWN, STEP } from "./constants";
import type { GameEvent } from "./events";
import { bodyRect, overlapsRect } from "./geometry";
import { BURST_R } from "./hits";
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
/** On the attack now: what costs a pip on contact. */
export const attacking = (n: Npc): boolean => n.act === "attack" || (n.role === "office" && n.act === "walk" && n.rest <= 0);
/** Going about their business: what a touch from him staggers. */
const BUMPABLE: ReadonlySet<CastAct> = new Set<CastAct>(["idle", "walk", "notice", "chase", "return"]);

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

const downLine = (n: Npc): string =>
  n.role === "bellhop" ? pick(CAST_LINES.bellhop.down, n.k) : n.role === "server" ? pick(CAST_LINES.server.down, n.k) : pick(CAST_LINES.office.down, n.k);

/** The telegraph: he squares up to Hammer, and the ! burst goes up. */
const windup = (n: Npc, w: CastWorld, events: GameEvent[]) => {
  n.facing = toward(n, w.hero);
  n.vx = 0;
  setAct(n, "windup");
  events.push({ type: "castWindup", id: n.id, role: n.role, x: n.x, y: n.y - n.h });
};
const attack = (n: Npc, events: GameEvent[], x = n.x, y = n.y - n.h / 2) => {
  setAct(n, "attack");
  events.push({ type: "castAttack", id: n.id, role: n.role, x, y });
};

/** The server: a warning crouch, then a rush at him, a skid and a rest; a patrol in between. */
function stepServer(n: Npc, w: CastWorld, events: GameEvent[]): void {
  const c = CAST.server;
  const h = w.hero;
  if (n.act === "windup") {
    n.vx = 0;
    if (n.actT >= c.windup) {
      attack(n, events);
      n.mark = n.x;
      n.vx = n.facing * c.rush;
    }
    return;
  }
  if (n.act === "attack") {
    n.vx = n.facing * c.rush;
    const ledge = !supportAt(w.stage, n.x + n.facing * (n.w / 2 + 20), n.y);
    if (n.actT >= c.rushT || Math.abs(n.x - n.mark) >= c.rushPx || n.blocked || ledge) {
      setAct(n, "recover");
      say(n, pick(CAST_LINES.server.skid, n.k + n.hits), events);
    }
    return;
  }
  if (n.act === "recover") {
    n.vx = n.actT < c.skid ? n.facing * c.rush * (1 - n.actT / c.skid) : 0;
    if (n.actT >= c.skid + c.rest) setAct(n, "idle");
    return;
  }
  patrol(n, w, c.walk);
  if (!n.noticed || n.rest > 0 || !sameLevel(n, h) || Math.abs(h.x - n.x) > c.notice || !ticketFree(w.cast)) return;
  windup(n, w, events);
  say(n, pick(CAST_LINES.server.warn, n.k + n.hits), events);
}

/** The office worker: a head-down march, with the phone's chime as its only warning. */
function stepOffice(n: Npc, w: CastWorld, events: GameEvent[]): void {
  const c = CAST.office;
  const h = w.hero;
  patrol(n, w, c.march);
  // The phone chimes once each time he closes in.
  const near = sameLevel(n, h) && Math.abs(h.x - n.x) < c.chime;
  if (near && !n.cue) {
    n.cue = true;
    events.push({ type: "chime", x: n.x, y: n.y - n.h });
  }
  if (!near && Math.abs(h.x - n.x) > c.chime * 2) n.cue = false;
}

function stepAct(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  switch (n.act) {
    case "notice":
      n.vx = 0;
      if (n.actT >= T.notice) setAct(n, "idle");
      return;
    case "fly":
      return;
    case "slide": {
      const f = KNOCK.slide.friction * dt;
      n.vx = Math.abs(n.vx) <= f ? 0 : n.vx - Math.sign(n.vx) * f;
      if (n.onGround && n.vx === 0) setAct(n, "down");
      return;
    }
    case "slip":
      n.vx = 0;
      if (n.actT >= T.slip) setAct(n, "down");
      return;
    case "down":
      n.vx = 0;
      if (n.actT >= CAST[n.role === "student" ? "server" : n.role].daze) {
        setAct(n, "getup");
        if (n.out) say(n, downLine(n), events);
      }
      return;
    case "getup":
      n.vx = 0;
      if (n.actT >= T.getup) {
        if (n.out) {
          n.facing = toward(n, w.hero) === 1 ? -1 : 1;
          n.vx = n.facing * T.leave;
          setAct(n, "leave");
        } else {
          setAct(n, "idle");
          n.rest = CAST.bellhop.rest;
        }
      }
      return;
    case "leave":
      n.vx = n.facing * T.leave;
      return;
    case "flee":
      n.vx = n.facing * CAST.student.flee;
      return;
    case "duck":
      n.vx = 0;
      if (n.actT >= CAST.student.duck) setAct(n, "idle");
      return;
    case "hop": {
      // A hop back out of his reach, if there is floor there: the first step picks the way.
      if (n.mark < 0) {
        const dir = n.dir;
        n.mark = supportAt(w.stage, n.x + dir * CAST.student.hop, n.y) ? 1 : 0;
        n.vx = n.mark ? (dir * CAST.student.hop) / CAST.student.hopT : 0;
      }
      if (n.actT >= CAST.student.hopT) {
        n.vx = 0;
        setAct(n, "idle");
      }
      return;
    }
    case "bumped":
      n.vx = n.dir * 300;
      if (n.actT >= T.bump) {
        n.vx = 0;
        setAct(n, "idle");
      }
      return;
    default:
      break;
  }
  if (notice(n, w, events)) return;
  if (n.role === "server") stepServer(n, w, events);
  else if (n.role === "office") stepOffice(n, w, events);
  else n.vx = 0;
}

/** Down on the floor after a flight: dazed, with the spill if the tray or the cup came down with him. */
function land(n: Npc, w: CastWorld): void {
  n.vx = 0;
  n.spin = 0;
  if (n.role === "student") {
    n.facing = toward(n, w.hero) === 1 ? -1 : 1;
    n.vx = n.facing * CAST.student.flee;
    setAct(n, "flee");
    return;
  }
  setAct(n, "down");
  if (n.role === "server") spill(w, n, "water");
  else if (n.role === "office") spill(w, n, "coffee");
}

function physics(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  const was = n.onGround;
  if (!n.onGround) n.vy += GRAVITY_DOWN * dt;
  const vx0 = n.vx;
  const vy0 = n.vy;
  moveBody(n, w.stage, dt);
  n.blocked = vx0 !== 0 && n.vx === 0;
  if (n.act === "fly") {
    n.spin += n.dir * 540 * dt;
    if (!was && n.onGround) {
      if (!n.bounced && vy0 > 400) {
        // One bounce, then he stays down.
        n.bounced = true;
        n.onGround = false;
        n.vy = -vy0 * KNOCK.bounce;
        n.vx *= 0.6;
      } else land(n, w);
    }
  }
  const b = w.stage.bounds;
  if (n.y > b.y + b.h - FALL_MARGIN) {
    n.alive = false;
    events.push({ type: "castFell", id: n.id, x: n.x, y: n.y, points: POINTS.shaft });
  } else if ((n.act === "leave" || n.act === "flee") && Math.abs(n.x - w.hero.x) > T.gone) n.alive = false;
}

/** Overlapping him: a stomp from above knocks them down and bounces him (students sidestep). */
function contact(n: Npc, w: CastWorld, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void {
  const h = w.hero;
  if (!hittable(n) || !overlapsRect(bodyRect(h), npcRect(n))) return;
  const dir: 1 | -1 = toward(n, h) === 1 ? -1 : 1;
  if (h.vy > 0 && prevHeroY <= n.y - n.h + STOMP.tolerance) {
    const landed = strikeNpc(n, "stomp", dir, w, events);
    h.vy = -(jumpHeld ? STOMP.held : STOMP.bounce);
    h.onGround = false;
    events.push({ type: "stomp", x: n.x, y: n.y - n.h, landed });
    return;
  }
  // An attack under way costs a pip; the office worker's coffee goes all over him and he staggers, then rests.
  if (attacking(n)) {
    w.hits.push(n.x);
    if (n.role === "office") {
      events.push({ type: "castSplash", x: h.x, y: h.y - h.h * 0.6 });
      say(n, CAST_LINES.office.march[0], events);
      n.rest = CAST.office.rest;
      n.dir = dir;
      setAct(n, "bumped");
    }
    return;
  }
  // Anyone else he walks into is nudged back with a line: no pip. A telegraph, a skid or a stagger is not interrupted.
  if (n.role !== "student" && BUMPABLE.has(n.act) && n.bumpT >= T.bumpGap) {
    n.bumpT = 0;
    n.dir = dir;
    setAct(n, "bumped");
    events.push({ type: "castBump", id: n.id, x: n.x, y: n.y - n.h });
    say(n, n.role === "bellhop" ? pick(CAST_LINES.bellhop.bump, n.k) : n.role === "server" ? pick(CAST_LINES.server.bump, n.k) : pick(CAST_LINES.office.notice, n.k + 1), events);
  }
}

/** Staff on the move over a puddle slip on it; the puddle is used up. */
function puddle(n: Npc, w: CastWorld, events: GameEvent[]): void {
  if (n.role === "student" || !standing(n) || !n.onGround || Math.abs(n.vx) < 4) return;
  const p = w.puddles.find((q) => Math.abs(q.y - n.y) < 3 && n.x + n.w / 2 > q.x - q.w / 2 && n.x - n.w / 2 < q.x + q.w / 2);
  if (!p) return;
  p.life = Math.min(p.life, 1.2);
  strikeNpc(n, "puddle", n.vx > 0 ? 1 : -1, w, events);
}

/** One step of the cast, after Hammer and the carts have moved. */
export function stepCast(w: CastWorld, dt: number, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void {
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  for (const n of w.cast) {
    if (!n.alive) continue;
    n.actT += dt;
    n.rest = Math.max(0, n.rest - dt);
    n.bumpT += dt;
    // The slam sends everyone within its reach flying away from him.
    if (burst && Math.hypot(n.x - burst.x, n.y - n.h / 2 - burst.y) <= BURST_R) strikeNpc(n, "burst", toward(n, w.hero) === 1 ? -1 : 1, w, events);
    stepAct(n, w, dt, events);
    physics(n, w, dt, events);
    contact(n, w, prevHeroY, jumpHeld, events);
    puddle(n, w, events);
  }
}
