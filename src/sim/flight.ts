import { say, hittable, type Npc } from "./cast";
import { damage } from "./damage";
import type { GameEvent } from "./events";
import { laterallyNear } from "./geometry";
import { PICKUP_SIZE, type Level } from "./level";
import { rowX } from "./levels/flight";
import type { Missile } from "./missiles";
import { seededRandom, type Pickup, type PickupKind } from "./rewards";
import type { HeroState, Stage } from "./types";

/**
 * The cabin's rules (story spec §9.1), in meters along it unless a name says px: where the cart starts, how near it catches
 * him and how near the aisle he must be, how bags fall and lie, how far a seat or a leg reaches, the rows' pitch in px.
 */
export const CABIN = {
  cartFrom: 38,
  cartReach: 0.9,
  cartLane: 0.6,
  bagSpeed: 6,
  bagAhead: 2,
  bagDrop: 2,
  bagLife: 3,
  obstacle: 60,
  legsReach: 40,
  legsHeight: 60,
  tabletReach: 3,
  pitch: 77,
  trayAhead: 120,
  attendantNear: 400,
  trayAlternates: ["can", "nuts"] as readonly PickupKind[],
} as const;

export type FlightState = {
  cart: { z: number; live: boolean; t: number; next: number; passed: boolean };
  /** Seconds the seatbelt sign stays lit. */
  sign: number;
  turbT: number;
  nextTurb: number;
  /** Seconds to the first bag of this turbulence, and how long they keep falling. */
  warnT: number;
  fallT: number;
  bagT: number;
  trayNext: 0 | 1;
  tabletSaid: boolean;
  rng: () => number;
};

/** What the rules touch: the world's and the game's, handed in by the game's step. */
export type FlightWorld = {
  hero: HeroState;
  flight: FlightState;
  missiles: Missile[];
  nextMissile: () => number;
  pickups: Pickup[];
  nextPickup: () => number;
  cast: Npc[];
  stage: Stage;
  level: Level;
  /** The purser has seen him: her own cart is out, and the drinks cart stays behind the curtain from then on. */
  bossBusy: boolean;
};

export function createFlight(level: Level, seed: number): FlightState | null {
  const spec = level.flight;
  if (!spec) return null;
  return { cart: { z: CABIN.cartFrom, live: false, t: 0, next: spec.cart.first, passed: false }, sign: 0, turbT: 0, nextTurb: spec.turbulence.first, warnT: 0, fallT: 0, bagT: 0, trayNext: 0, tabletSaid: false, rng: seededRandom((seed + 8191) >>> 0) };
}

/** The cart's shove: a pip and ten rows back, never behind row 52; in grace it passes him. True when it landed. */
export function shove(h: HeroState, stage: Stage, rows: number, events: GameEvent[]): boolean {
  if (!damage(h, stage, h.x + 1, events)) return false;
  h.x = Math.max(rowX(52), h.x - rows * CABIN.pitch);
  h.vx = 0;
  events.push({ type: "shove", rows, x: h.x, y: h.y - h.h / 2 });
  return true;
}

const nearestAttendant = (w: FlightWorld): Npc | undefined =>
  w.cast.filter((n) => n.alive && n.job === "attendant").sort((a, b) => Math.abs(a.x - w.hero.x) - Math.abs(b.x - w.hero.x))[0];

function stepCart(w: FlightWorld, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  const c = w.flight.cart;
  const spec = w.level.flight!.cart;
  c.t += dt;
  if (!c.live) {
    if (c.t < c.next || w.bossBusy) return;
    c.live = true;
    c.z = CABIN.cartFrom;
    c.passed = false;
    c.next = c.t + spec.every;
    events.push({ type: "cartOut" });
    const a = nearestAttendant(w);
    if (a) say(a, "Drinks?", events);
  }
  c.z -= spec.speed * dt;
  if (c.z <= 0) {
    c.live = false;
    return;
  }
  const z = h.x / 100;
  const aisle = laterallyNear(h, { lx: 0 }, CABIN.cartLane);
  if (Math.abs(c.z - z) <= CABIN.cartReach && aisle) shove(h, w.stage, spec.shove, events);
  if (!c.passed && c.z < z - CABIN.cartReach) {
    c.passed = true;
    if (aisle) return;
    const kind = CABIN.trayAlternates[w.flight.trayNext];
    w.flight.trayNext = w.flight.trayNext === 0 ? 1 : 0;
    w.pickups.push({ id: w.nextPickup(), kind, x: h.x + CABIN.trayAhead, y: h.y - PICKUP_SIZE, lx: h.lx, taken: false });
    events.push({ type: "tray", kind, x: h.x, y: h.y - h.h });
  }
}

function stepTurbulence(w: FlightWorld, dt: number, events: GameEvent[]): void {
  const f = w.flight;
  const spec = w.level.flight!.turbulence;
  const h = w.hero;
  f.turbT += dt;
  f.sign = Math.max(0, f.sign - dt);
  if (f.turbT >= f.nextTurb) {
    f.nextTurb = f.turbT + spec.every;
    f.sign = spec.sign;
    f.warnT = spec.warn;
    f.fallT = spec.fall;
    f.bagT = 0;
    events.push({ type: "seatbelt" });
    const a = nearestAttendant(w);
    if (a) say(a, "Sir, the seatbelt sign is on.", events);
    return;
  }
  if (f.warnT > 0) {
    f.warnT = Math.max(0, f.warnT - dt);
    if (f.warnT > 0) return;
  }
  if (f.fallT <= 0) return;
  f.fallT = Math.max(0, f.fallT - dt);
  f.bagT -= dt;
  if (f.bagT > 0) return;
  f.bagT = spec.bagEvery;
  const lanes = w.stage.hall?.lanes ?? [0];
  const lx = lanes[Math.min(lanes.length - 1, Math.floor(f.rng() * lanes.length))];
  w.missiles.push({ id: w.nextMissile(), kind: "bag", x: h.x + CABIN.bagAhead * 100, y: -CABIN.bagDrop * 100, vx: 0, vy: CABIN.bagSpeed * 100, gravity: 0, spin: 0, life: CABIN.bagLife, phase: 0, from: 0, lx });
  events.push({ type: "bagDrop", x: h.x + CABIN.bagAhead * 100, lx });
}

/** A seat back or a leg in his way: a pip and a step back; in grace he passes. */
const trip = (w: FlightWorld, events: GameEvent[]) => {
  if (damage(w.hero, w.stage, w.hero.x + 1, events)) w.hero.x -= CABIN.obstacle;
};

function stepRows(w: FlightWorld, events: GameEvent[]): void {
  const h = w.hero;
  const spec = w.level.flight!;
  const at = (row: number, reach: number) => Math.abs(h.x - rowX(row)) <= reach;
  if (!h.crouch && spec.recliners.some((r) => r.lane === h.lane && at(r.row, CABIN.obstacle))) trip(w, events);
  else if (h.lane === 1 && h.y > -CABIN.legsHeight && spec.legs.some((row) => at(row, CABIN.legsReach))) trip(w, events);
  if (!w.flight.tabletSaid && Math.abs(h.x - rowX(spec.tablet.row)) <= CABIN.tabletReach * 100) {
    w.flight.tabletSaid = true;
    events.push({ type: "tablet" });
  }
}

/** The queue at row 30 stands across its lane until bonked; over its heads is open. */
function stepQueue(w: FlightWorld): void {
  const h = w.hero;
  for (const n of w.cast) {
    if (n.trick !== "queue" || !hittable(n) || n.out || !laterallyNear(h, n)) continue;
    if (h.y <= n.y - n.h) continue;
    const stop = n.x - (n.w + h.w) / 2;
    if (h.x <= stop || h.x >= n.x + n.w) continue;
    h.x = stop;
    h.vx = Math.min(0, h.vx);
  }
}

/** The attendants tell him once each, as he comes near. */
function stepAttendants(w: FlightWorld, events: GameEvent[]): void {
  for (const n of w.cast) {
    if (n.job !== "attendant" || n.replied || !n.alive || Math.abs(n.x - w.hero.x) > CABIN.attendantNear) continue;
    n.replied = true;
    say(n, "Sir, you need to return to your seat.", events);
  }
}

/** One step of the cabin: the cart, the turbulence, the rows, the queue and the attendants. */
export function stepFlight(w: FlightWorld, dt: number, events: GameEvent[]): void {
  stepCart(w, dt, events);
  stepTurbulence(w, dt, events);
  stepRows(w, events);
  stepQueue(w);
  stepAttendants(w, events);
  // Row 52 is the back of the cabin: no throw takes him behind it.
  if (w.hero.x < rowX(52)) {
    w.hero.x = rowX(52);
    w.hero.vx = Math.max(0, w.hero.vx);
  }
}
