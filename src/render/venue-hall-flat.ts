import { Container, Graphics } from "pixi.js";
import { HALL, type HallCart, type HallDoor } from "../sim/hall";
import type { Level } from "../sim/level";
import { rowX } from "../sim/levels/flight";
import { INK, THIN } from "./ink";
import { tones } from "./palette";

/** The flat hall's colors: the hall from the side, as a browser without WebGL2 plays it. */
const C = { wall: "#c9b48a", wainscot: "#5c3b1f", rail: "#d8c7a0", door: "#6a3d1e", frame: "#3a2312", carpet: "#4a1520", gold: "#a8802a", steel: "#8d939c", ice: "#9fb1bd", lane: "#f3ead8" } as const;
const CEILING = -420;
const EVERY_DOOR = 300;
const RAIL = -150;

/** The flat cabin's colors. */
const CABIN = { wall: "#d8d2c2", bin: "#cfc8b6", seam: "#8a8678", seat: "#2b3a6a", head: "#b8bcc6", window: "#bcd6f2", floor: "#1b2340", lav: "#b9b4a8", curtain: "#1d2a58", business: "#946a42", recline: "#9c2f35", legs: "#2f3542", cart: "#a9aeb6" } as const;
const SEAT_EVERY = 77;
/** Where the floor's far edge meets the near row's seats: the aisle's depth on the page. */
const CABIN_NEAR = 340;

/** The cabin seen from the side: bins and windows on the far wall, the far row against it, the near row across the bottom. */
function drawCabinFlat(g: Graphics, level: Level) {
  const len = level.length;
  g.rect(-400, CEILING - 800, len + 800, 800).fill(tones(CABIN.wall).shadow);
  g.rect(-400, CEILING, len + 800, -CEILING).fill(CABIN.wall);
  g.rect(-400, CEILING, len + 800, 110).fill(CABIN.bin);
  g.rect(-400, CEILING + 110, len + 800, 4).fill(CABIN.seam);
  g.rect(-400, 0, len + 800, CABIN_NEAR + 200).fill(CABIN.floor);
  for (let row = 56; row >= 1; row--) {
    const x = rowX(row);
    const cloth = row <= 3 ? CABIN.business : CABIN.seat;
    g.rect(x, CEILING, 2, 110).fill(CABIN.seam);
    g.roundRect(x + 14, -250, 40, 70, 12).fill(CABIN.window).roundRect(x + 14, -250, 40, 70, 12).stroke(THIN);
    g.roundRect(x + 8, -150, 26, 150, 6).fill(cloth).roundRect(x + 8, -150, 26, 150, 6).stroke(THIN);
    g.rect(x + 8, -150, 26, 34).fill(CABIN.head);
    g.rect(x + 30, -60, SEAT_EVERY - 34, 60).fill(tones(cloth).shadow);
    g.roundRect(x + 8, CABIN_NEAR - 90, SEAT_EVERY - 12, 90, 8).fill(cloth).roundRect(x + 8, CABIN_NEAR - 90, SEAT_EVERY - 12, 90, 8).stroke(THIN);
    g.rect(x + 8, CABIN_NEAR, SEAT_EVERY - 12, 200).fill(tones(cloth).shadow);
  }
  const spec = level.flight;
  if (spec) {
    for (const r of spec.recliners) {
      const x = rowX(r.row);
      const y = r.lane === 0 ? 0 : CABIN_NEAR;
      g.moveTo(x + 8, y).lineTo(x - 34, y - 150).stroke({ width: 26, color: CABIN.recline, cap: "round" });
    }
    for (const row of spec.legs) {
      const x = rowX(row);
      g.roundRect(x - 44, 34, 88, 24, 10).fill(CABIN.legs).roundRect(x - 44, 34, 88, 24, 10).stroke(THIN);
      g.roundRect(x - 54, 80, 40, 22, 8).fill("#14110f");
    }
  }
  const lav = rowX(30);
  g.rect(lav - 75, -320, 150, 320).fill(CABIN.lav).rect(lav - 75, -320, 150, 320).stroke(INK);
  g.rect(lav - 45, -280, 90, 280).fill(tones(CABIN.lav).shadow).rect(lav - 45, -280, 90, 280).stroke(THIN);
}

/** A hall from the side: the cabin's way or the corridor's: wall, wainscot and carpet, a door frame every 3 m, the alcove, the lobby and room 1417. */
export function drawHallFlat(g: Graphics, level: Level) {
  if (level.hall?.set === "cabin") return drawCabinFlat(g, level);
  const len = level.length;
  g.rect(-400, CEILING - 800, len + 800, 800).fill(tones(C.wall).shadow);
  g.rect(-400, CEILING, len + 800, -CEILING).fill(C.wall);
  g.rect(-400, RAIL, len + 800, -RAIL).fill(C.wainscot);
  g.rect(-400, RAIL - 8, len + 800, 10).fill(C.rail);
  g.rect(-400, 0, len + 800, 300).fill(C.carpet);
  g.rect(-400, 0, len + 800, 6).fill(C.gold);
  for (let x = EVERY_DOOR; x < len - 100; x += EVERY_DOOR) {
    g.rect(x - 60, -230, 120, 230).fill(C.frame);
    g.rect(x - 50, -220, 100, 220).fill(C.door).rect(x - 50, -220, 100, 220).stroke(THIN);
    g.circle(x + 36, -110, 6).fill(C.gold);
  }
  const p = level.puddle;
  if (p) {
    g.rect(p.z0 * 100, CEILING, (p.z1 - p.z0) * 100, -CEILING).fill(tones(C.wall).shadow);
    g.roundRect(p.z0 * 100 + 40, -190, 120, 190, 8).fill(C.ice).roundRect(p.z0 * 100 + 40, -190, 120, 190, 8).stroke(INK);
    g.ellipse((p.z0 + p.z1) * 50, 6, (p.z1 - p.z0) * 50, 8).fill({ color: "#9fd6ff", alpha: 0.7 });
  }
  // The elevator lobby's two steel doors.
  for (const x of [4900, 5250]) {
    g.rect(x, -260, 190, 260).fill(C.steel).rect(x, -260, 190, 260).stroke(INK);
    g.rect(x + 93, -260, 4, 260).fill(tones(C.steel).shadow);
  }
  // 1417.
  g.rect(len - 140, -260, 140, 260).fill(C.frame);
  g.rect(len - 130, -250, 120, 250).fill(C.door).rect(len - 130, -250, 120, 250).stroke(INK);
}

/** The flat hall's moving parts: a cart on its dotted lane across the door it rolled from, a swinging door's leaf, his lane. */
export class HallFlatView {
  readonly container = new Container({ label: "hall-flat" });
  private readonly g = new Graphics();

  constructor(parent: Container) {
    this.container.addChild(this.g);
    parent.addChild(this.container);
  }

  /** `lane`: how far along its width a meter of the hall's breadth draws, on the floor in front of the wall. `cabin`: the flight's cart, the curtain still drawn at `curtain`, the bags. */
  sync(carts: readonly HallCart[], doors: readonly HallDoor[], hero: { x: number; lx: number }, cabin?: { cart: { z: number; lx: number; live: boolean } | null; curtain: number | null; bags: readonly { x: number; lx?: number }[] }) {
    const g = this.g;
    g.clear();
    const down = (lx: number) => 30 + (lx + HALL.wall) * 30;
    if (cabin) {
      if (cabin.curtain !== null) g.rect(cabin.curtain - 14, CEILING, 28, -CEILING + CABIN_NEAR).fill(CABIN.curtain).rect(cabin.curtain - 14, CEILING, 28, -CEILING + CABIN_NEAR).stroke(THIN);
      if (cabin.cart) {
        const x = cabin.cart.z * 100;
        g.roundRect(x - 60, down(cabin.cart.lx) - 170, 120, 170, 8).fill(CABIN.cart).roundRect(x - 60, down(cabin.cart.lx) - 170, 120, 170, 8).stroke(INK);
        g.rect(x - 60, down(cabin.cart.lx) - 170, 120, 16).fill(tones(CABIN.cart).shadow);
      }
      // Where a bag will land: its shadow in its lane.
      for (const b of cabin.bags) g.ellipse(b.x, down(b.lx ?? 0), 44, 10).fill({ color: "#000000", alpha: 0.45 });
    }
    for (const c of carts) {
      const x = c.z * 100;
      for (let y = 30; y <= 120; y += 18) g.rect(x - 2, y, 4, 8).fill({ color: C.lane, alpha: 0.5 });
      if (!c.live) continue;
      g.roundRect(x - 60, down(c.lx) - 90, 120, 90, 8).fill(C.steel).roundRect(x - 60, down(c.lx) - 90, 120, 90, 8).stroke(INK);
    }
    for (const d of doors) {
      if (d.open <= 0) continue;
      const x = d.z * 100;
      g.rect(x - 6, -230, 90 * d.open + 6, 230).fill(C.door).rect(x - 6, -230, 90 * d.open + 6, 230).stroke(THIN);
    }
    g.circle(hero.x, down(hero.lx), 9).fill(C.lane).circle(hero.x, down(hero.lx), 9).stroke(THIN);
  }

  setVisible(on: boolean) {
    this.container.visible = on;
  }

  destroy() {
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
