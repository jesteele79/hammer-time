import type { GameEvent } from "./events";
import { laterallyNear } from "./geometry";
import type { Level } from "./level";
import type { HeroState, Stage } from "./types";

/** The hall's numbers: how fast he sidesteps, how the carts cross it, how a door's handle warns and its leaf stands open. */
export const HALL = { strafe: 2, cartSpeed: 2.4, wall: 1.5, cartReach: 90, cartLane: 0.6, handle: 0.5, open: 1.5, leaf: 0.3, leafMargin: 20, swing: 0.5 } as const;
/** How far ahead of the end of a swing the key door's reader answers it. */
export const KEY_REACH = 136;

/** A housekeeping cart rolling out of a door at `z`, across the hall and in at the far wall, over and over. */
export type HallCart = { z: number; side: 1 | -1; every: number; next: number; t: number; live: boolean; lx: number; dir: 1 | -1; struck: boolean };
export type DoorPhase = "shut" | "handle" | "open";
/** A room door that swings out across its half of the hall for a moment. `open`: its leaf's swing, 0 shut to 1 across. */
export type HallDoor = { z: number; side: 1 | -1; every: number; next: number; t: number; phase: DoorPhase; open: number };

export const createHallCarts = (level: Pick<Level, "hallCarts">): HallCart[] => (level.hallCarts ?? []).map((c) => ({ z: c.z, side: c.side, every: c.every, next: c.at, t: 0, live: false, lx: c.side * HALL.wall, dir: (c.side > 0 ? -1 : 1) as 1 | -1, struck: false }));
export const createHallDoors = (level: Pick<Level, "hallDoors">): HallDoor[] => (level.hallDoors ?? []).map((d) => ({ z: d.z, side: d.side, every: d.every, next: d.at, t: 0, phase: "shut" as const, open: 0 }));

/** His sidestep this step, clamped to the walls' reach; standing still leaves him where he is. */
export function stepLateral(h: Pick<HeroState, "lx">, strafe: number, dt: number, hall: NonNullable<Stage["hall"]>): void {
  if (!strafe) return;
  const most = hall.width / 2 - hall.keep;
  h.lx = Math.max(-most, Math.min(most, h.lx + strafe * HALL.strafe * dt));
}

export type HallWorld = { hero: HeroState; hallCarts: HallCart[]; hallDoors: HallDoor[]; hits: number[] };

/** One step of the hall's carts and doors. `prevX`: where he stood before this step, for a leaf that stops him like a wall. */
export function stepHall(w: HallWorld, prevX: number, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  for (const c of w.hallCarts) {
    c.t += dt;
    if (!c.live) {
      if (c.t < c.next) continue;
      c.live = true;
      c.struck = false;
      c.lx = c.side * HALL.wall;
      c.next += c.every;
    }
    c.lx += c.dir * HALL.cartSpeed * dt;
    if (c.dir * c.lx >= HALL.wall) {
      c.live = false;
      continue;
    }
    // Jumped over, it passes under him; once a crossing it costs him a pip.
    const x = c.z * 100;
    if (!c.struck && h.onGround && h.invuln <= 0 && h.move?.kind !== "tumble" && laterallyNear(h, c, HALL.cartLane) && Math.abs(h.x - x) < HALL.cartReach) {
      c.struck = true;
      w.hits.push(h.x === x ? x + 1 : x);
      events.push({ type: "hit", by: "cart", x: h.x, y: h.y - h.h / 2, target: 0 });
    }
  }
  for (const d of w.hallDoors) {
    d.t += dt;
    if (d.phase === "shut" && d.t >= d.next) {
      d.phase = "handle";
      events.push({ type: "hallDoor", z: d.z, side: d.side, phase: "handle" });
    } else if (d.phase === "handle" && d.t >= d.next + HALL.handle) {
      d.phase = "open";
      events.push({ type: "hallDoor", z: d.z, side: d.side, phase: "open" });
    } else if (d.phase === "open" && d.t >= d.next + HALL.handle + HALL.open) {
      d.phase = "shut";
      d.next += d.every;
      events.push({ type: "hallDoor", z: d.z, side: d.side, phase: "shut" });
    }
    d.open = Math.max(0, Math.min(1, d.open + ((d.phase === "open" ? 1 : -1) * dt) / HALL.swing));
    if (d.phase !== "open" || d.side * h.lx <= HALL.leaf) continue;
    // Its leaf stands across his half of the hall: he stops at it, whichever way he comes.
    const x = d.z * 100;
    if (prevX <= x - HALL.leafMargin && h.x > x - HALL.leafMargin) {
      h.x = x - HALL.leafMargin;
      h.vx = Math.min(0, h.vx);
    } else if (prevX >= x + HALL.leafMargin && h.x < x + HALL.leafMargin) {
      h.x = x + HALL.leafMargin;
      h.vx = Math.max(0, h.vx);
    }
  }
}
