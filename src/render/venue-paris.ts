import { Container, Graphics } from "pixi.js";
import { HERO_CROUCH_H } from "../sim/constants";
import type { Level, LevelPlatform } from "../sim/level";
import type { Mover } from "../sim/movers";
import { INK, THIN } from "./ink";
import { tones } from "./palette";

/** Paris's colors: the hotel's wallpaper and wood, the street's stone, shutters and awning, the brass, a television's blue. */
const C = { paper: "#e6d8c0", stripe: "#d9b8ac", wainscot: "#4a2f22", slab: "#3a2a20", stone: "#d6cdb9", stoneDark: "#a99f8c", shutter: "#6a707a", slat: "#50555e", glass: "#3a4a5c", iron: "#23262b", brass: "#c9a24a", tv: "#5fa8e8", awning: "#b8282e", cream: "#f2e6c4", wood: "#6b4a2e", marble: "#e9e4d8", sash: "#f4f1ea", bed: "#b9a07a", duvet: "#f4f1ea", pigeon: "#7d8087", wing: "#5a5d64", kerb: "#8d939c" } as const;
const STREET = { from: 1536, block: 768, top: -1080 } as const;
/** The rope's post by the desk, how far the pigeons rise, how long they stay gone. */
const ROPE = { h: 180 } as const;
const PIGEON = { rise: 0.8, away: 6, up: 240 } as const;

/** The stand-in for the hotel's two floors and the street's blocks, while the walls are not painted. */
export function drawParisStandIn(g: Graphics, level: Level): void {
  const floorAt = level.floor.find((f) => f.y0 === f.y1 && f.y0 < 0)?.y0 ?? -540;
  g.rect(0, floorAt * 2, STREET.from, -floorAt * 2).fill(C.paper);
  for (let x = 0; x < STREET.from; x += 48) g.rect(x, floorAt * 2, 22, -floorAt * 2).fill(C.stripe);
  for (const y of [0, floorAt]) g.rect(0, y - 150, STREET.from, 150).fill(C.wainscot);
  // The desk and its key rack.
  g.rect(300, -160, 260, 160).fill(C.wood).rect(300, -160, 260, 160).stroke(INK);
  g.rect(310, -360, 240, 150).fill(tones(C.wood).shadow).rect(310, -360, 240, 150).stroke(THIN);
  for (let i = 0; i < 12; i++) g.circle(330 + (i % 6) * 40, -335 + Math.floor(i / 6) * 60, 6).fill(C.brass);
  // The street's blocks: stone, tall windows, iron balconies, the ground floor shuttered.
  const end = level.length + 400;
  g.rect(STREET.from, STREET.top, end - STREET.from, -STREET.top).fill(C.stone);
  for (let x = STREET.from; x < end; x += STREET.block) {
    g.rect(x, STREET.top, 8, -STREET.top).fill(C.stoneDark);
    for (const k of [120, 340, 560]) {
      g.rect(x + k, -900, 100, 190).fill(C.glass).rect(x + k, -900, 100, 190).stroke(THIN);
      g.rect(x + k - 12, -712, 124, 8).fill(C.iron);
      for (let b = 0; b < 6; b++) g.rect(x + k - 8 + b * 22, -760, 3, 50).fill(C.iron);
    }
    g.rect(x + 60, -300, 300, 300).fill(C.shutter).rect(x + 60, -300, 300, 300).stroke(THIN);
    for (let y = -292; y < 0; y += 16) g.rect(x + 64, y, 292, 4).fill(C.slat);
    g.rect(x + 450, -280, 200, 280).fill(C.glass).rect(x + 450, -280, 200, 280).stroke(THIN);
    g.rect(x, -320, STREET.block, 10).fill(C.stoneDark);
  }
}

/** What Paris's floors need that the walls never draw: the slab of the first floor, the shaft and the gutter's line. */
export function drawParis(g: Graphics, level: Level): void {
  for (const f of level.floor) if (f.y0 === f.y1 && f.y0 < 0) g.rect(f.x0, f.y0, f.x1 - f.x0, 26).fill(C.slab).rect(f.x0, f.y0, f.x1 - f.x0, 26).stroke(THIN);
  const lift = level.movers?.find((m) => m.ride);
  if (lift) g.rect(lift.x - lift.w / 2 - 8, (lift.y1 ?? 0) - HERO_CROUCH_H - 40, lift.w + 16, -(lift.y1 ?? 0) + HERO_CROUCH_H + 40).fill({ color: C.iron, alpha: 0.28 });
  // The back wall of the ground floor, the kerb and the gutter along the street.
  g.rect(STREET.from, -470, 30, 470).fill(C.wainscot);
  g.rect(STREET.from + 935, 0, level.length, 6).fill(C.kerb);
  g.rect(STREET.from + 935, 6, level.length, 12).fill(tones(C.kerb).shadow);
}

/** A Paris platform drawn by the game: the terrace's chairs and tables, the awning's canvas, the bed; the sash is the view's, as it tips. */
export function parisPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  if (p.kind === "sash") return true;
  if (p.kind === "chair") {
    g.rect(p.x0, p.y, w, 10).fill(C.wood).rect(p.x0, p.y, w, 10).stroke(THIN);
    g.rect(p.x1 - 8, p.y - 90, 8, 90).fill(C.wood).rect(p.x1 - 8, p.y - 90, 8, 90).stroke(THIN);
    for (const x of [p.x0 + 4, p.x1 - 10]) g.rect(x, p.y + 10, 6, -p.y - 10).fill(C.wood);
    return true;
  }
  if (p.kind === "table" && p.y > -300) {
    g.ellipse((p.x0 + p.x1) / 2, p.y + 4, w / 2, 9).fill(C.marble).ellipse((p.x0 + p.x1) / 2, p.y + 4, w / 2, 9).stroke(THIN);
    g.rect((p.x0 + p.x1) / 2 - 4, p.y + 8, 8, -p.y - 8).fill(C.iron);
    return true;
  }
  if (p.kind === "table") {
    // The hall table upstairs, with the breakfast tray on it.
    g.rect(p.x0, p.y, w, 12).fill(C.wood).rect(p.x0, p.y, w, 12).stroke(THIN);
    for (const x of [p.x0 + 10, p.x1 - 18]) g.rect(x, p.y + 12, 8, 108).fill(tones(C.wood).shadow);
    return true;
  }
  if (p.kind === "awning") {
    for (let x = p.x0, i = 0; x < p.x1; x += 40, i++) g.rect(x, p.y, 40, 26).fill(i % 2 ? C.cream : C.awning);
    g.rect(p.x0, p.y, w, 26).stroke(THIN);
    for (let x = p.x0, i = 0; x < p.x1; x += 40, i++) g.roundRect(x, p.y + 26, 40, 14, 6).fill(i % 2 ? C.cream : C.awning).roundRect(x, p.y + 26, 40, 14, 6).stroke(THIN);
    return true;
  }
  if (p.kind === "bed" && p.bounce) {
    g.roundRect(p.x0, p.y, w, 40, 8).fill(C.duvet).roundRect(p.x0, p.y, w, 40, 8).stroke(INK);
    g.rect(p.x0, p.y + 40, w, -p.y - 580).fill(C.bed).rect(p.x0, p.y + 40, w, -p.y - 580).stroke(THIN);
    g.roundRect(p.x0 + 10, p.y - 22, 90, 26, 10).fill(C.cream).roundRect(p.x0 + 10, p.y - 22, 90, 26, 10).stroke(THIN);
    return true;
  }
  return false;
}

/** The scooter: a low body and two wheels, its rider's helmet over it, facing left; about its feet. */
export function drawScooter(g: Graphics, w: number, h: number): void {
  g.circle(-w / 2 + 20, -18, 18).fill("#16161a").circle(-w / 2 + 20, -18, 7).fill(C.kerb);
  g.circle(w / 2 - 22, -18, 18).fill("#16161a").circle(w / 2 - 22, -18, 7).fill(C.kerb);
  g.poly([-w / 2 + 6, -30, -w / 2 + 26, -h + 8, -w / 2 + 44, -h + 8, -w / 2 + 40, -30, w / 2 - 6, -30, w / 2 - 14, -52, 10, -52, -6, -30]).fill("#5f9e8f").stroke(THIN);
  g.rect(-10, -h + 18, 60, 24).fill(tones("#5f9e8f").shadow).rect(-10, -h + 18, 60, 24).stroke(THIN);
  // The rider, bent low; the helmet's only face is its visor.
  g.roundRect(-14, -h - 48, 60, 72, 14).fill("#3a3d44").stroke(THIN);
  g.circle(-16, -h - 58, 24).fill("#d8d4c8").stroke(THIN);
  g.rect(-40, -h - 64, 26, 12).fill("#23262b");
}

/** The lift for one: a brass cage on a cabin whose roof stands at his crouch, its feet on the mover. */
export function drawLift(g: Graphics, m: Pick<Mover, "w">): void {
  const roof = -HERO_CROUCH_H - 16;
  g.rect(-m.w / 2, roof, m.w, 12).fill(C.brass).rect(-m.w / 2, roof, m.w, 12).stroke(THIN);
  for (let x = -m.w / 2; x <= m.w / 2 + 1; x += m.w / 7) g.rect(x - 2, roof, 4, -roof).fill(C.brass);
  g.moveTo(-m.w / 2, roof / 2).lineTo(m.w / 2, roof / 2).stroke({ width: 3, color: C.brass });
  g.rect(-m.w / 2 - 6, -6, m.w + 12, 12).fill(C.iron).rect(-m.w / 2 - 6, -6, m.w + 12, 12).stroke(THIN);
}

/** How bright a window's television is at `t`: a flicker of two frequencies, never quite dark. */
export const screenGlow = (t: number, i: number): number => 0.55 + 0.25 * Math.sin(t * 7.3 + i * 2.1) + 0.2 * Math.sin(t * 17.9 + i);

/**
 * Paris's moving dressing: the rope at the desk that drops when he has answered her, the window that tips, the televisions'
 * flicker in the blocks' windows, the pigeons who go up as he comes and are back after a while.
 */
export class ParisView {
  readonly container = new Container({ label: "paris" });
  private readonly g = new Graphics();
  private readonly gone = new Map<number, number>();

  constructor(parent: Container) {
    this.container.addChild(this.g);
    parent.addChild(this.container);
  }

  /** A flock has seen him. */
  scatter(x: number): void {
    this.gone.set(x, 0);
  }

  clear(): void {
    this.gone.clear();
  }

  sync(level: Level, t: number, dt: number, open: boolean, tipped: boolean): void {
    const g = this.g;
    g.clear();
    const b = level.bonjour;
    if (b) {
      const x = b.wall.x + 12;
      g.rect(x - 5, -ROPE.h, 10, ROPE.h).fill(C.brass).rect(x - 5, -ROPE.h, 10, ROPE.h).stroke(THIN);
      g.circle(x, -ROPE.h - 8, 11).fill(C.brass).circle(x, -ROPE.h - 8, 11).stroke(THIN);
      if (!open) g.moveTo(x, -ROPE.h + 14).quadraticCurveTo(x - 110, -ROPE.h + 90, x - 210, -ROPE.h + 14).stroke({ width: 9, color: C.awning, cap: "round" });
      else g.moveTo(x, -ROPE.h + 14).quadraticCurveTo(x + 14, -ROPE.h + 90, x + 6, -10).stroke({ width: 9, color: C.awning, cap: "round" });
    }
    const sash = level.platforms.find((p) => p.tip);
    if (sash) {
      const w = sash.x1 - sash.x0;
      // The window: its frame on the wall, its sash tilted in as it hangs open.
      g.rect(sash.x0 - 10, sash.y - 170, w + 20, 170).fill(C.glass).rect(sash.x0 - 10, sash.y - 170, w + 20, 170).stroke(THIN);
      if (tipped) g.poly([sash.x0, sash.y, sash.x1, sash.y + 120, sash.x1 + 12, sash.y + 112, sash.x0 + 10, sash.y - 8]).fill(C.sash).stroke(THIN);
      else g.rect(sash.x0, sash.y, w, 14).fill(C.sash).rect(sash.x0, sash.y, w, 14).stroke(THIN);
    }
    (level.screens ?? []).forEach((s, i) => {
      g.rect(s.x, s.y, 86, 62).fill({ color: C.tv, alpha: screenGlow(t, i) });
    });
    for (const p of level.pigeons ?? []) {
      const since = this.gone.get(p.x);
      if (since !== undefined) {
        const now = since + dt;
        if (now >= PIGEON.away) this.gone.delete(p.x);
        else this.gone.set(p.x, now);
      }
      const u = since === undefined ? 0 : Math.min(1, since / PIGEON.rise);
      if (u >= 1) continue;
      for (const k of [-46, 0, 52]) {
        const y = p.y - 12 - u * PIGEON.up * (1 + k / 120);
        const a = 1 - u;
        g.ellipse(p.x + k + u * k, y, 18, 11).fill({ color: C.pigeon, alpha: a });
        g.circle(p.x + k + u * k - 16, y - 8, 7).fill({ color: C.pigeon, alpha: a });
        const flap = u > 0 ? Math.sin(t * 40 + k) * 14 : 0;
        g.moveTo(p.x + k + u * k - 6, y).lineTo(p.x + k + u * k + 16, y - 8 - flap).stroke({ width: 4, color: C.wing, alpha: a });
      }
    }
  }

  setVisible(on: boolean): void {
    this.container.visible = on;
  }

  destroy(): void {
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
