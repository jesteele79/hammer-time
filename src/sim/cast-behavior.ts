import { CAST_LINES, RETORTS, STAFF_SIGHS, pick } from "../game/lines";
import { SPILL_OF, TRICKS, freezeNpc, linesOf } from "./cast";
import { stun } from "./damage";
import {
  CAST,
  CHAIN,
  FALL_MARGIN,
  KNOCK,
  POINTS,
  ROLLING,
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
import { bodyRect, overlapsRect, sideways } from "./geometry";
import { BURST_R, flopRect, flopping } from "./hits";
import { flies, launchCoffee, launchPlane, type Missile } from "./missiles";
import { canStand, floorAt, moveBody } from "./physics";
import type { Puddle } from "./snot";
import type { HeroState, Point, Rect, Stage, Target } from "./types";

export type CastWorld = {
  stage: Stage;
  hero: HeroState;
  /** The home screen's scene: nobody moves or notices him. */
  still?: boolean;
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
/** On the attack now: what costs a pip on contact. A student's follow-through hurts nobody, the guard's attack is his beam, and the office worker's march only head-on. */
export const attacking = (n: Npc, h: HeroState): boolean =>
  n.role !== "student" && n.role !== "guard" && n.trick !== "wander" && (n.act === "attack" || (n.role === "office" && n.act === "walk" && n.rest <= 0 && n.facing === toward(n, h)));
/** How much of a rolling cart hurts him: the stacked cases, from the floor up; the brass frame and arch hurt nobody. */
const CART_HURT = { w: 140, h: 220 } as const;
/** How hard the drunk guest's bump sends him: about 200 px on a clear floor. */
const WANDER_PUSH = 1500;
/** Going about their business: what a touch from him staggers. */
const BUMPABLE: ReadonlySet<CastAct> = new Set<CastAct>(["idle", "walk", "notice", "chase", "return"]);

const sameLevel = (n: Npc, h: HeroState) => Math.abs(h.y - n.level) < 60;
/**
 * Within earshot of someone marching head-down, who may be on a stair: from where he stands now, the farther off the
 * more a step up or down still counts (a 30-degree flight rises 0.58 a px).
 */
const marchLevel = (n: Npc, h: HeroState) => Math.abs(h.y - n.y) < 60 + Math.abs(h.x - n.x) * 0.6;

/** Something to stand on at `x` within a step of `y`: a floor or a platform. */
/** How far up or down the floor a step ahead may be and still be footing: a 30-degree stair, not a drop. */
const SUPPORT_STEP = 60;
export function supportAt(stage: Stage, x: number, y: number): boolean {
  const f = floorAt(stage, x, y - SUPPORT_STEP);
  if (f !== null && Math.abs(f - y) <= SUPPORT_STEP) return true;
  return stage.platforms.some((p) => x >= p.x0 && x <= p.x1 && Math.abs(p.y - y) <= 24);
}

/** The double-take, once per life, when he comes within the role's range on their floor (students see the whole lobby). */
function notice(n: Npc, w: CastWorld, events: GameEvent[]): boolean {
  const h = w.hero;
  if (n.noticed || (n.act !== "idle" && n.act !== "walk")) return false;
  const c = CAST[n.role];
  const level = n.role === "office" && !n.hide ? marchLevel(n, h) : sameLevel(n, h);
  if (Math.abs(h.x - n.x) > c.notice || (n.role !== "student" && !level)) return false;
  n.noticed = true;
  n.facing = toward(n, h);
  // The reply-all's own line says it, with the first plane.
  if (n.trick !== "replyAll" && (n.trick !== "wander" || n.job === "parisian")) say(n, noticeLine(n), events);
  // The office worker never looks up: a mutter, no double-take.
  if (n.role === "office") return false;
  n.vx = 0;
  setAct(n, "notice");
  events.push({ type: "castNotice", id: n.id, x: n.x, y: n.y - n.h });
  return true;
}

/** The station's crowd: their walk, how far a shove carries him, how long before they shove again, how high a jump clears them. */
const SHOVE = { walk: 260, push: 150, rest: 1.2, over: 120 } as const;
/** The kids: how far off they run at him, how fast, how long off after a bonk. */
const RUSH = { from: 500, speed: 320, back: 3 } as const;
/** A seated traveler: how near he gets them up, and how long past before they sit again. */
const STAND = { near: 160, sits: 2 } as const;
function stepStand(n: Npc, w: CastWorld, dt: number): void {
  n.vx = 0;
  const near = Math.abs(w.hero.x - n.x) <= STAND.near && sameLevel(n, w.hero);
  if (near) {
    n.sit = false;
    n.mark = 0;
    return;
  }
  if (n.sit) return;
  n.mark += dt;
  if (n.mark >= STAND.sits) n.sit = true;
}
/** How long after walking off they come back; null for those who do not. */
const backAfter = (n: Npc): number | null => (n.trick === "tray" ? TRAY.back : n.trick === "rush" ? RUSH.back : null);
/** The waiter's walk, and how long he is off walking once he is back up: about eight seconds from the bonk. */
const TRAY = { walk: 200, back: 5 } as const;
const trayBack = (n: Npc) => {
  Object.assign(n, { alive: true, out: false, hits: 0, x: n.x0, vx: 0, facing: 1 });
  setAct(n, "idle");
};

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

const downLine = (n: Npc): string => pick(linesOf(n).down, n.k);

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
      // The ice water, half the time, instead of the rush: tossed at him, and she goes back to her rounds.
      if (n.trick === "water" && n.rng && n.rng() < TRICKS.waterChance) {
        const m = launchCoffee(++w.nextMissile, n, { x: h.x, y: h.y - h.h * 0.6 }, "water");
        w.missiles.push(m);
        events.push({ type: "missile", kind: m.kind, x: m.x, y: m.y });
        attack(n, events);
        say(n, "Ice water, sir?", events);
        setAct(n, "idle");
        n.rest = c.rest + c.skid;
        return;
      }
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
      say(n, pick(linesOf(n).skid, n.k + n.hits), events);
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
  say(n, pick(linesOf(n).warn, n.k + n.hits), events);
}

/** Which side of him the cart stands on: Hammer's, where there is room for it; the other where a solid (the desk) is in the way. */
function cartSide(n: Npc, w: CastWorld, cart: Target, facing: 1 | -1): 1 | -1 {
  const fits = (x: number) => !w.stage.solids.some((s) => overlapsRect({ x: x - cart.w / 2, y: cart.y - cart.h, w: cart.w, h: cart.h }, s));
  if (fits(n.x + facing * CAST.bellhop.hold)) return facing;
  return fits(n.x - facing * CAST.bellhop.hold) ? ((-facing) as 1 | -1) : facing;
}

/** How near he comes before a hidden bellhop steps out. */
const HIDDEN_UNTIL = 1200;
/** The bellhop: grips his cart, winds up, shoves it at him, follows it where it stops and wheels it home. */
function stepBellhop(n: Npc, w: CastWorld, events: GameEvent[]): void {
  const c = CAST.bellhop;
  const h = w.hero;
  const cart = w.targets.find((t) => t.id === n.cart);
  // The doors open on bellhops: out of sight until he is near.
  if (n.act === "hide") {
    n.vx = 0;
    if (Math.abs(h.x - n.x) > HIDDEN_UNTIL) return;
    n.hide = false;
    n.noticed = true;
    setAct(n, "idle");
    return;
  }
  // A cart knocked out of his hands (the hit's flash is this instant's) is let go of: he goes after it.
  if (cart && cart.flash > 0 && (n.act === "windup" || n.act === "return")) {
    setAct(n, "chase");
    return;
  }
  if (n.act === "windup") {
    n.vx = 0;
    if (cart) {
      cart.x = n.x + n.facing * c.hold;
      cart.vx = 0;
    }
    if (n.actT >= (n.hits ? c.windup2 : c.windup)) {
      if (cart) {
        cart.vx = n.facing * c.shove;
        cart.vy = 0;
        cart.onGround = true;
        cart.chain = 0;
      }
      attack(n, events, cart?.x, cart ? cart.y - cart.h / 2 : undefined);
      say(n, pick(linesOf(n).shove, n.k + n.hits), events);
      if (cart) {
        setAct(n, "chase");
        return;
      }
      // No cart: the push lands on a man within arm's reach on his floor (not in grace, not already down).
      if (sameLevel(n, h) && Math.abs(h.x - n.x) <= c.hold + h.w && h.invuln <= 0 && h.move?.kind !== "tumble" && !sideways(w.stage, h, n)) w.hits.push(n.x);
      n.rest = c.rest;
    }
    return;
  }
  if (n.act === "attack") {
    // The hands' push, held a beat.
    n.vx = 0;
    if (n.actT >= c.follow) setAct(n, "idle");
    return;
  }
  if (n.act === "chase") {
    if (!cart) {
      setAct(n, "idle");
      return;
    }
    // Walked into something on the way (the desk, with the cart beyond it): the cart is given up on, and the
    // ticket with it, until it moves again.
    if (n.blocked) {
      n.vx = 0;
      n.mark = cart.x;
      setAct(n, "idle");
      return;
    }
    const stopped = cart.onGround && Math.abs(cart.vx) < 10;
    // He faces the cart he goes after, so he never walks backwards to it.
    n.facing = cart.x >= n.x ? 1 : -1;
    const want = cart.x - n.facing * c.hold;
    const dx = want - n.x;
    n.vx = Math.abs(dx) < 8 ? 0 : Math.sign(dx) * c.walk;
    if (stopped && Math.abs(dx) < 8) setAct(n, "return");
    return;
  }
  if (n.act === "return") {
    const dx = n.home - n.x;
    if (Math.abs(dx) < 8) {
      n.vx = 0;
      n.facing = toward(n, h);
      if (cart) {
        // Home: the cart keeps its side (the wind-up moves it between them), so nothing jumps.
        cart.x = n.x + cartSide(n, w, cart, cart.x >= n.x ? 1 : -1) * c.hold;
        cart.vx = 0;
      }
      setAct(n, "idle");
      n.rest = c.rest;
      return;
    }
    n.facing = dx > 0 ? 1 : -1;
    n.vx = n.facing * c.walk;
    if (cart) {
      // The cart stays on the side he took it up from, led or dragged, unless a solid leaves no room there.
      cart.x = n.x + cartSide(n, w, cart, cart.x >= n.x ? 1 : -1) * c.hold;
      cart.vx = 0;
      cart.vy = 0;
      cart.y = n.y;
      cart.onGround = true;
    }
    return;
  }
  n.vx = 0;
  if (!cart) {
    // An agent with no cart walks his patrol and, up close, squares up to shove with his hands; he waits for a man sliding
    // or crouched under the scanner to stand (the slide is the only way through it).
    patrol(n, w, c.walk);
    if (!n.noticed || n.rest > 0 || !sameLevel(n, h) || Math.abs(h.x - n.x) > c.reach || h.crouch || h.slideT > 0 || !ticketFree(w.cast)) return;
    windup(n, w, events);
    return;
  }
  // A cart out of his hands (bonked away, or he was staggered chasing it) is fetched first, unless it is the
  // one he gave up on, still where it was.
  if (Math.abs(cart.x - n.x) > c.hold + 40) {
    if (Math.abs(cart.x - n.mark) > 40) setAct(n, "chase");
    return;
  }
  if (!n.noticed || n.rest > 0 || !sameLevel(n, h) || Math.abs(h.x - n.x) > c.notice || !ticketFree(w.cast)) return;
  // The cart goes between him and Hammer before the shove; with no room for it there (the desk), no shove.
  n.facing = toward(n, h);
  if (cartSide(n, w, cart, n.facing) !== n.facing) return;
  cart.x = n.x + n.facing * c.hold;
  windup(n, w, events);
}

/** The student: out of melee, a hop back when he closes in, and paper planes after a wind-up. */
function stepStudent(n: Npc, w: CastWorld, events: GameEvent[]): void {
  const c = CAST.student;
  const h = w.hero;
  n.vx = 0;
  if (n.act === "windup") {
    if (n.actT >= c.windup) {
      // The bartender's are coasters off the bar; they fly as the planes do.
      const m = launchPlane(++w.nextMissile, n, { x: h.x, y: h.y - h.h * 0.6 }, n.job === "bartender" ? "coaster" : "plane");
      w.missiles.push(m);
      events.push({ type: "missile", kind: m.kind, x: m.x, y: m.y });
      attack(n, events);
      // The rest between throws counts from the throw.
      n.rest = c.restMin + ((n.k + n.hits) % 4) * c.restStep;
    }
    return;
  }
  if (n.act === "attack") {
    // The throw's follow-through.
    if (n.actT >= 0.4) setAct(n, "idle");
    return;
  }
  // Out of melee: a hop back when he closes in on their floor, once every 1.5 s.
  if (sameLevel(n, h) && Math.abs(h.x - n.x) < c.melee && w.time - n.hopAt > 1.5) {
    n.dir = toward(n, h) === 1 ? -1 : 1;
    n.hopAt = w.time;
    n.mark = -1;
    setAct(n, "hop");
    return;
  }
  // Planes in the air and planes being folded count together, so two wind-ups never take it past three.
  const planes = w.missiles.filter((m) => flies(m.kind)).length + w.cast.filter((m) => m.role === "student" && m.act === "windup").length;
  if (!n.noticed || n.rest > 0 || Math.abs(h.x - n.x) > c.notice || planes >= c.planes || !ticketFree(w.cast)) return;
  windup(n, w, events);
  say(n, CAST_LINES.student.heads, events);
}

/** The night auditor's reply-all (story spec §8.1): a wind-up at the notice, three planes a beat apart, then the march. True while it takes his step. */
function replyAll(n: Npc, w: CastWorld, events: GameEvent[]): boolean {
  const c = CAST.office;
  const h = w.hero;
  const { planes, gap } = TRICKS.replyAll;
  if (n.act === "windup") {
    n.vx = 0;
    if (n.actT >= c.windup) {
      attack(n, events);
      n.mark = 0;
    }
    return true;
  }
  if (n.act === "attack") {
    n.vx = 0;
    if (n.mark < planes && n.actT >= n.mark * gap) {
      const m = launchPlane(++w.nextMissile, n, { x: h.x, y: h.y - h.h * 0.6 });
      w.missiles.push(m);
      events.push({ type: "missile", kind: m.kind, x: m.x, y: m.y });
      events.push({ type: "castThrow", id: n.id, x: m.x, y: m.y, t: w.time });
      if (n.mark === 0) say(n, "Per my last email", events);
      n.mark++;
    }
    if (n.mark >= planes && n.actT >= planes * gap) {
      setAct(n, "walk");
      n.rest = c.rest;
    }
    return true;
  }
  if (!n.replied && n.noticed && marchLevel(n, h) && Math.abs(h.x - n.x) <= c.notice && ticketFree(w.cast)) {
    n.replied = true;
    windup(n, w, events);
    return true;
  }
  return false;
}

/** The office worker: the ambush, for the one behind the screen; then the head-down march, for both, with the phone's chime as its only warning. */
function stepOffice(n: Npc, w: CastWorld, events: GameEvent[]): void {
  const c = CAST.office;
  const h = w.hero;
  if (n.trick === "replyAll" && replyAll(n, w, events)) return;
  if (n.trick === "wander") {
    // The drunk guest: never leaps, never throws, ambles toward him once he has seen him, along his stretch.
    // The cabin's crew keep to their stretch of the aisle.
    if (n.job !== "attendant" && n.noticed && n.rest <= 0 && marchLevel(n, h) && Math.abs(h.x - n.x) <= c.notice) {
      n.facing = toward(n, h);
      n.vx = n.facing * c.march;
      n.act = "walk";
      if (n.x + n.vx * STEP < n.x0 || n.x + n.vx * STEP > n.x1) n.vx = 0;
    } else if (n.rest > 0) n.vx = 0;
    else patrol(n, w, c.march);
    return;
  }
  if (n.act === "hide") {
    n.vx = 0;
    if (!sameLevel(n, h) || Math.abs(h.x - n.x) > c.notice || !ticketFree(w.cast)) return;
    windup(n, w, events);
    say(n, pick(linesOf(n).ambush, n.k), events);
    return;
  }
  if (n.act === "windup") {
    n.vx = 0;
    if (n.actT >= c.windup) {
      n.vx = n.facing * c.leap;
      n.vy = -c.leapUp;
      n.onGround = false;
      n.mark = 0;
      attack(n, events);
    }
    return;
  }
  if (n.act === "attack") {
    // At the top of the leap the coffee flies; he lands and marches like the other one.
    if (n.prop && n.vy >= 0 && !n.mark) {
      n.mark = 1;
      n.prop = false;
      // The office worker flings his coffee; the cook his hot pan.
      w.missiles.push(launchCoffee(++w.nextMissile, n, { x: h.x, y: h.y - h.h * 0.6 }, n.job === "cook" ? "pan" : "coffee"));
      const m = w.missiles[w.missiles.length - 1];
      events.push({ type: "missile", kind: m.kind, x: m.x, y: m.y });
    }
    if (n.onGround && n.actT > 0.2) {
      n.hide = false;
      n.x0 = n.x - 400;
      n.x1 = n.x + 400;
      setAct(n, "walk");
    }
    return;
  }
  patrol(n, w, c.march);
  // The phone chimes once each time he closes in.
  const near = marchLevel(n, h) && Math.abs(h.x - n.x) < c.chime;
  if (near && !n.cue) {
    n.cue = true;
    events.push({ type: "chime", x: n.x, y: n.y - n.h, job: n.job });
  }
  if (!near && Math.abs(h.x - n.x) > c.chime * 2) n.cue = false;
}

/**
 * The security guard: walks his patrol; seeing Hammer in front of him he raises the flashlight (telegraphed), and its beam
 * dazzles him for a second if he stands in it: no pip lost. Then a rest. The lecture freezes him as it does any staff.
 */
function stepGuard(n: Npc, w: CastWorld, events: GameEvent[]): void {
  const c = CAST.guard;
  const h = w.hero;
  if (n.act === "windup") {
    n.vx = 0;
    if (n.actT >= c.windup) {
      attack(n, events);
      events.push({ type: "flash", id: n.id, x: n.x + n.facing * 40, y: n.y - n.h * 0.72, facing: n.facing });
      const front = (h.x - n.x) * n.facing;
      if (sameLevel(n, h) && front > 0 && front <= c.reach && h.invuln <= 0 && h.move?.kind !== "tumble") stun(h, c.stun, events);
    }
    return;
  }
  if (n.act === "attack") {
    n.vx = 0;
    if (n.actT >= c.flash) {
      setAct(n, "idle");
      n.rest = c.rest;
    }
    return;
  }
  patrol(n, w, c.walk);
  if (!n.noticed || n.rest > 0 || !sameLevel(n, h) || Math.abs(h.x - n.x) > c.notice || !ticketFree(w.cast)) return;
  windup(n, w, events);
  say(n, pick(linesOf(n).warn, n.k + n.hits), events);
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
          // Up again and back at him after his rest.
          setAct(n, "idle");
          n.rest = n.role === "student" ? CAST.student.restMin : CAST[n.role].rest;
        }
      }
      return;
    case "leave":
      n.vx = n.facing * T.leave;
      if (backAfter(n) !== null && n.actT >= backAfter(n)!) trayBack(n);
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
    case "frozen":
      n.vx = 0;
      if (n.actT >= n.freeze) {
        n.birds = false;
        setAct(n, "idle");
      }
      return;
    case "schooled":
      n.vx = 0;
      if (n.actT >= CAST.student.schooled) setAct(n, "idle");
      return;
    default:
      break;
  }
  // The waiter walks his pass with his tray, whoever comes; the crowd hurries for its train.
  if (n.trick === "tray") {
    patrol(n, w, TRAY.walk);
    return;
  }
  if (n.trick === "shove") {
    patrol(n, w, SHOVE.walk);
    return;
  }
  if (n.trick === "stand") {
    stepStand(n, w, dt);
    return;
  }
  if (n.trick === "rush") {
    const h = w.hero;
    if (n.rest <= 0 && Math.abs(h.x - n.x) <= RUSH.from && sameLevel(n, h)) {
      n.facing = toward(n, h);
      n.vx = n.facing * RUSH.speed;
      n.act = "walk";
    } else patrol(n, w, SHOVE.walk);
    return;
  }
  // The cabin's queue and its seated travelers, the quiet car's pair, stand as they are, whoever comes.
  if (n.trick === "queue" || n.trick === "seated") {
    n.vx = 0;
    return;
  }
  if (notice(n, w, events)) return;
  if (n.role === "server") stepServer(n, w, events);
  else if (n.role === "office") stepOffice(n, w, events);
  else if (n.role === "bellhop") stepBellhop(n, w, events);
  else if (n.role === "guard") stepGuard(n, w, events);
  else stepStudent(n, w, events);
}

/** Down on the floor after a flight: dazed, with the spill if the tray or the cup came down with him. */
function land(n: Npc, w: CastWorld): void {
  n.vx = 0;
  n.spin = 0;
  if (n.role === "student" && n.out) {
    n.facing = toward(n, w.hero) === 1 ? -1 : 1;
    n.vx = n.facing * CAST.student.flee;
    setAct(n, "flee");
    return;
  }
  setAct(n, "down");
  // The tray, the cup or the pan comes down with him, the time the hit knocked it out of his hands.
  const s = SPILL_OF[n.job];
  if (s && n.spills) spill(w, n, s);
  n.spills = false;
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
    events.push({ type: "castFell", id: n.id, x: n.x, y: n.y, points: POINTS.shaft, line: linesOf(n).fall });
  } else if (n.act === "leave" || n.act === "flee") {
    const far = Math.abs(n.x - w.hero.x);
    // Walking off into a wall: gone if he cannot see them any more, else they turn back the other way.
    if (far > T.gone || (n.blocked && far > T.offView)) n.alive = false;
    else if (n.blocked) n.facing = n.facing === 1 ? -1 : 1;
  }
}

/**
 * Overlapping him: a stomp from above knocks them down and bounces him (students sidestep). His belly-flop knocks over
 * anyone on their feet it runs into, attack or no attack, and its bowling scores the chain like a runaway cart's.
 */
/** How far across a hall the lecture and the slam reach, more than the mallet's lane. */
const LATERAL_BLAST = 1.2;
/** Down a hall whoever has seen him closes on his lane, at a walk: within this of it they can reach him. */
const LANE = { speed: 1, near: 0.3 } as const;
function keepToHim(n: Npc, w: CastWorld, dt: number): void {
  if (!w.stage.hall || !n.noticed || !hittable(n) || n.job === "attendant") return;
  const gap = w.hero.lx - n.lx;
  if (Math.abs(gap) > LANE.near) n.lx += Math.sign(gap) * Math.min(LANE.speed * dt, Math.abs(gap));
}

function contact(n: Npc, w: CastWorld, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void {
  const h = w.hero;
  if (!hittable(n) || sideways(w.stage, h, n)) return;
  if (flopping(h)) {
    if (n.act === "down" || !overlapsRect(flopRect(h), npcRect(n))) return;
    if (strikeNpc(n, "flop", h.facing, w, events, h.flopChain + 1)) {
      h.flopChain++;
      chainEvent(events, n, h.flopChain);
      if (h.flopChain >= CHAIN.length) h.flopChain = 0;
    }
    return;
  }
  if (!overlapsRect(bodyRect(h), npcRect(n))) return;
  const dir: 1 | -1 = toward(n, h) === 1 ? -1 : 1;
  // The queue is a wall to him (the flight's rule), and takes no offense at it.
  if (n.trick === "queue" && !(h.vy > 0 && prevHeroY <= n.y - n.h + STOMP.tolerance)) return;
  // Walked into by the drunk guest: pushed along, no pip, and he takes a moment.
  if (n.trick === "wander" && n.rest <= 0 && h.invuln <= 0 && !(h.vy > 0 && prevHeroY <= n.y - n.h + STOMP.tolerance)) {
    h.vx = -dir * WANDER_PUSH;
    n.rest = CAST.office.rest;
    n.vx = 0;
    events.push({ type: "castBump", id: n.id, x: n.x, y: n.y - n.h });
    return;
  }
  if (h.vy > 0 && prevHeroY <= n.y - n.h + STOMP.tolerance) {
    const landed = strikeNpc(n, "stomp", dir, w, events);
    h.vy = -(jumpHeld ? STOMP.held : STOMP.bounce);
    h.onGround = false;
    events.push({ type: "stomp", x: n.x, y: n.y - n.h, landed });
    return;
  }
  // Up out of their seat and into him: a pip. In the seat they are nothing to walk into.
  if (n.trick === "stand") {
    if (n.sit || h.invuln > 0 || h.move?.kind === "tumble") return;
    w.hits.push(n.x);
    return;
  }
  // A traveler in a hurry or a kid: he goes the way they are going, no pip, unless he is over them or it would put him through a wall.
  if (n.trick === "shove" || n.trick === "rush") {
    if (n.rest > 0 || h.y <= n.y - SHOVE.over) return;
    n.rest = SHOVE.rest;
    const to = { x: h.x + SHOVE.push * n.facing, y: h.y, w: h.w };
    if (canStand(to, w.stage, h.h)) h.x = to.x;
    h.vx = 0;
    if (n.trick === "shove") say(n, "Pardon.", events);
    events.push({ type: "shoved", x: h.x, y: h.y - h.h / 2 });
    return;
  }
  // Into the waiter on his pass: a pip, and he says so.
  if (n.trick === "tray") {
    if (h.invuln > 0 || h.move?.kind === "tumble") return;
    w.hits.push(n.x);
    say(n, pick(linesOf(n).bump, 0), events);
    return;
  }
  // An attack under way costs a pip; the office worker's coffee goes all over him and he staggers, then rests.
  if (attacking(n, h)) {
    // In grace (or down) an attack passes through him: no pip, no coffee, no stagger.
    if (h.invuln > 0 || h.move?.kind === "tumble") return;
    w.hits.push(n.x);
    if (n.role === "office") {
      events.push({ type: "castSplash", x: h.x, y: h.y - h.h * 0.6, kind: n.job === "cook" ? "grease" : n.job === "prof" ? "papers" : "coffee" });
      say(n, pick(linesOf(n).march, 0), events);
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
    say(n, pick(linesOf(n).bump, n.role === "office" ? n.k + 1 : n.k), events);
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

const chainEvent = (events: GameEvent[], n: Npc, count: number) => {
  const points = CHAIN[Math.min(count, CHAIN.length) - 1];
  events.push({ type: "chain", x: n.x, y: n.y - n.h, count, points, oneUp: count >= CHAIN.length });
};

/** Runaway carts, sliding bellhops and flying bodies bowl over the staff in their way (the chain), and a cart rolling at him costs a pip. */
function bowl(w: CastWorld, events: GameEvent[]): void {
  const h = w.hero;
  const mover = (x: number, vx: number, rect: Rect, holder: { chain: number }, by: "cart" | "slide" | "body", self: Npc | null) => {
    const dir: 1 | -1 = vx > 0 ? 1 : -1;
    for (const n of w.cast) {
      // Only people on their feet are bowled: hitting a downed bellhop again is Hammer's own move.
      if (n === self || !hittable(n) || n.act === "down" || (n.x - x) * dir <= 0 || !overlapsRect(rect, npcRect(n))) continue;
      if (!strikeNpc(n, by, dir, w, events, holder.chain + 1)) continue;
      holder.chain++;
      chainEvent(events, n, holder.chain);
      if (holder.chain >= CHAIN.length) holder.chain = 0;
    }
  };
  for (const t of w.targets) {
    if (Math.abs(t.vx) < ROLLING) continue;
    const r = bodyRect(t);
    mover(t.x, t.vx, r, t, "cart", null);
    // What hurts him is the stack of cases, not the brass arch: a full jump, timed late, clears a runaway. Only a cart
    // closing on him hurts: one he overtakes running the same way is left behind.
    const hurt: Rect = { x: t.x - CART_HURT.w / 2, y: t.y - CART_HURT.h, w: CART_HURT.w, h: CART_HURT.h };
    const closing = (t.vx - h.vx) * Math.sign(t.vx) > 0;
    if ((h.x - t.x) * Math.sign(t.vx) > 0 && closing && !sideways(w.stage, h, t) && overlapsRect(hurt, bodyRect(h))) w.hits.push(t.x);
  }
  for (const s of w.cast) {
    if (!s.alive || Math.abs(s.vx) < ROLLING) continue;
    if (s.act === "slide") mover(s.x, s.vx, npcRect(s), s, "slide", s);
    else if (s.act === "fly") mover(s.x, s.vx, npcRect(s), s, "body", s);
  }
}

/** The lecture lands: staff in reach freeze where they stand with a sigh; students sit down to sulk with a retort, no planes. */
function lectureOn(w: CastWorld, reach: Rect, events: GameEvent[]): void {
  let schooled = 0;
  let frozen = 0;
  const upright: ReadonlySet<CastAct> = new Set<CastAct>(["idle", "walk", "notice", "windup", "attack", "duck", "hop"]);
  for (const n of w.cast) {
    if (!n.alive || !overlapsRect(reach, npcRect(n)) || sideways(w.stage, w.hero, n, LATERAL_BLAST)) continue;
    if (n.role === "student") {
      if (n.out || !upright.has(n.act)) continue;
      n.vx = 0;
      n.facing = toward(n, w.hero);
      setAct(n, "schooled");
      n.rest = Math.max(n.rest, CAST.student.schooled);
      say(n, pick(RETORTS, n.k + schooled), events);
      events.push({ type: "castSchooled", id: n.id, x: n.x, y: n.y - n.h, points: POINTS.schooled });
      schooled++;
    } else if (standing(n)) {
      // Caught rearing back behind the screen: out in the open now, he marches when the freeze ends.
      if (n.hide) {
        n.hide = false;
        n.x0 = n.x - 400;
        n.x1 = n.x + 400;
      }
      freezeNpc(n, T.freeze, false, w.hero);
      say(n, linesOf(n).frozen ?? pick(STAFF_SIGHS, n.k + frozen), events);
      events.push({ type: "castFreeze", id: n.id, x: n.x, y: n.y - n.h, points: POINTS.frozen });
      frozen++;
    }
  }
  if (schooled || frozen) events.push({ type: "lectureLand", x: w.hero.x, y: w.hero.y - w.hero.h, schooled, frozen });
}

/** One step of the cast, after Hammer and the carts have moved. */
export function stepCast(w: CastWorld, dt: number, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void {
  if (w.still) return;
  const lecture = events.find((e) => e.type === "lecture") as Extract<GameEvent, { type: "lecture" }> | undefined;
  if (lecture) lectureOn(w, lecture.reach, events);
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  for (const n of w.cast) {
    if (!n.alive) {
      // Walked off for good, except the waiter, for whom there is always another plate, and a kid.
      const back = backAfter(n);
      if (back === null) continue;
      n.actT += dt;
      if (n.actT >= back) trayBack(n);
      continue;
    }
    n.actT += dt;
    n.rest = Math.max(0, n.rest - dt);
    n.bumpT += dt;
    // The slam sends everyone within its reach flying away from him.
    if (burst && Math.hypot(n.x - burst.x, n.y - n.h / 2 - burst.y) <= BURST_R && !sideways(w.stage, w.hero, n, LATERAL_BLAST)) strikeNpc(n, "burst", toward(n, w.hero) === 1 ? -1 : 1, w, events);
    stepAct(n, w, dt, events);
    physics(n, w, dt, events);
    keepToHim(n, w, dt);
    contact(n, w, prevHeroY, jumpHeld, events);
    puddle(n, w, events);
  }
  bowl(w, events);
}
