import { Container, Graphics } from "pixi.js";
import { HALL, type HallCart, type HallDoor } from "../sim/hall";
import type { Level } from "../sim/level";
import { INK, THIN } from "./ink";
import { tones } from "./palette";

/** The flat hall's colors: the hall from the side, as a browser without WebGL2 plays it. */
const C = { wall: "#c9b48a", wainscot: "#5c3b1f", rail: "#d8c7a0", door: "#6a3d1e", frame: "#3a2312", carpet: "#4a1520", gold: "#a8802a", steel: "#8d939c", ice: "#9fb1bd", lane: "#f3ead8" } as const;
const CEILING = -420;
const EVERY_DOOR = 300;
const RAIL = -150;

/** The corridor seen from the side: wall, wainscot and carpet, a door frame every 3 m, the alcove, the lobby and room 1417. */
export function drawHallFlat(g: Graphics, level: Level) {
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

  /** `lane`: how far along its width a meter of the hall's breadth draws, on the floor in front of the wall. */
  sync(carts: readonly HallCart[], doors: readonly HallDoor[], hero: { x: number; lx: number }) {
    const g = this.g;
    g.clear();
    const down = (lx: number) => 30 + (lx + HALL.wall) * 30;
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
