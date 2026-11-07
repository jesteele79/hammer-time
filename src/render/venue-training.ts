import { Assets, BitmapText, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ART_BASE, TRAINING_PIECES, type Piece, type Registry, type TrainingPiece } from "../art/registry";
import type { Level } from "../sim/level";
import { REPLACEMENT, beamOn, type Replacement } from "../sim/replacement";
import type { World } from "../sim/world";
import { SCENERY_Z } from "./backdrop";
import { INK, THIN } from "./ink";
import { label } from "./text";

/** The training room's materials, until the sheet is in. */
const C = { door: "#6b4a2e", doorGlass: "#cde6f2", cloth: "#f4f3ee", leg: "#5a4632", bowl: "#d8d2c4", nut: "#b07a3e", can: "#2b2b2e", seat: "#7a2f3a", seatDark: "#5a1f28", frame: "#3a3c44", wood: "#8a6440", woodDark: "#6b4a2e", steel: "#8d939c", ring: "#f8f4e6", screen: "#1b2230", pad: "#3a3c44", ifu: "#2a5d9c", ifuPage: "#f4f3ee", beam: "#fff3d2", hand: "#e8bf9c", unit: "#c9cfd4" } as const;
/** Where the screen hangs (over the brief's x 2700 to 3400, y -900 to -400), the drone's pad, and the loop's pace. */
const SCREEN = { y0: -900, y1: -400, fps: 2, frames: 4 } as const;
const PAD = { x: 3400, w: 120 } as const;
/** The ring light: its stand's height and the ring's radius. */
const RING = { top: 420, r: 54 } as const;
/** The beam's lit ellipse on the floor, and the faint cone of light down to it from the ring. */
const WEDGE = { ry: 30, cone: 0.1 } as const;

export type TrainingPieces = Partial<Record<TrainingPiece, { texture: Texture; piece: Piece }>>;

/** The sheet's pieces, or none while it is not in (the drawn stand-ins stand); one that fails is left out. */
export async function loadTrainingPieces(registry: Registry): Promise<TrainingPieces> {
  const listed = registry.training?.pieces;
  const out: TrainingPieces = {};
  if (!listed) return out;
  await Promise.all(
    TRAINING_PIECES.map(async (name) => {
      const piece = listed[name];
      if (!piece) return;
      try {
        out[name] = { texture: await Assets.load<Texture>(ART_BASE + piece.file), piece };
      } catch (err) {
        console.warn(`training piece ${name}: the stand-in draws (${(err as Error).message})`);
      }
    }),
  );
  return out;
}

function standing(art: NonNullable<TrainingPieces[TrainingPiece]>, height: number): Sprite {
  const s = new Sprite(art.texture);
  s.anchor.set(art.piece.base.x / art.piece.width, art.piece.base.y / art.piece.height);
  s.scale.set(height / art.piece.height);
  return s;
}

/** The walls until they are painted: a lecture hall's warm plaster over a wood wainscot, the acoustic ceiling, the calendar. */
export function drawTrainingWalls(g: Graphics, level: Level) {
  const w = level.length + 800;
  g.rect(-400, -1400, w, 1400).fill("#e6dcc8");
  g.rect(-400, -1400, w, 380).fill("#d6d2c8");
  for (let x = -400; x < level.length + 400; x += 160) g.rect(x, -1400, 4, 380).fill("#c4c0b6");
  g.rect(-400, -330, w, 330).fill("#a8774e").rect(-400, -334, w, 8).fill(C.woodDark);
  // The European training calendar on the back wall, every date crossed out and rewritten in his hand.
  const cx = 820;
  g.rect(cx, -860, 420, 300).fill("#fbf7ee").rect(cx, -860, 420, 300).stroke(THIN).rect(cx, -860, 420, 40).fill("#b8282e");
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 7; c++) {
      const x = cx + 12 + c * 58;
      const y = -808 + r * 60;
      g.rect(x, y, 50, 50).stroke({ width: 2, color: "#c4c0b6" });
      g.moveTo(x + 6, y + 6).lineTo(x + 44, y + 44).stroke({ width: 3, color: "#b8282e" });
      g.moveTo(x + 10, y + 36).lineTo(x + 40, y + 30).stroke({ width: 3, color: "#1f2c4d" });
    }
}

/**
 * What the training room draws behind him: the double doors at the left, the catering table with its bowls, the four rows of
 * seats, the lectern, the ring light on its stand, the big screen's frame on the wall and the drone's pad. The platforms are
 * drawn here, as what they are.
 */
export function drawTraining(level: Level, pieces: TrainingPieces): Container {
  const root = new Container({ label: "training" });
  const g = new Graphics();
  root.addChild(g);
  // The double doors.
  for (const x of [40, 140]) {
    g.rect(x, -380, 100, 380).fill(C.door).rect(x, -380, 100, 380).stroke(INK);
    g.rect(x + 30, -320, 40, 120).fill(C.doorGlass).rect(x + 30, -320, 40, 120).stroke(THIN);
    g.rect(x + (x === 40 ? 82 : 8), -190, 10, 50).fill(C.steel);
  }
  g.rect(70, -440, 140, 40).fill("#2f8f4e").rect(70, -440, 140, 40).stroke(THIN);
  for (const p of level.platforms) {
    const w = p.x1 - p.x0;
    if (p.kind === "table") {
      g.rect(p.x0 + 20, p.y, 14, -p.y).fill(C.leg).rect(p.x1 - 34, p.y, 14, -p.y).fill(C.leg);
      g.rect(p.x0, p.y, w, 70).fill(C.cloth).rect(p.x0, p.y, w, 70).stroke(INK);
      for (const [k, x] of [p.x0 + 60, p.x0 + 150, p.x0 + 240].entries()) {
        g.ellipse(x, p.y - 12, 38, 16).fill(C.bowl).ellipse(x, p.y - 12, 38, 16).stroke(THIN);
        if (k < 2) for (let n = 0; n < 5; n++) g.circle(x - 20 + n * 10, p.y - 20 - (n % 2) * 4, 6).fill(C.nut);
        else for (let n = 0; n < 3; n++) g.roundRect(x - 24 + n * 18, p.y - 50, 14, 34, 3).fill(C.can).roundRect(x - 24 + n * 18, p.y - 50, 14, 34, 3).stroke(THIN);
      }
    } else if (p.kind === "seat") {
      // A row of three lecture seats: the seats' tops are the platform, their backs behind.
      for (let k = 0; k < 3; k++) {
        const x = p.x0 + k * (w / 3) + 8;
        const sw = w / 3 - 16;
        g.roundRect(x, p.y - 150, sw, 150, 10).fill(C.seatDark).roundRect(x, p.y - 150, sw, 150, 10).stroke(THIN);
        g.roundRect(x - 4, p.y, sw + 8, 34, 8).fill(C.seat).roundRect(x - 4, p.y, sw + 8, 34, 8).stroke(INK);
      }
      g.rect(p.x0, p.y + 34, w, -p.y - 34).fill(C.frame);
    } else if (p.kind === "lectern") {
      if (pieces.lectern) {
        const s = standing(pieces.lectern, -p.y);
        s.position.set((p.x0 + p.x1) / 2, 0);
        root.addChild(s);
      } else {
        g.rect(p.x0 + 6, p.y, w - 12, -p.y).fill(C.wood).rect(p.x0 + 6, p.y, w - 12, -p.y).stroke(INK);
        g.poly([p.x0 - 10, p.y + 10, p.x1 + 10, p.y - 6, p.x1 + 10, p.y + 8, p.x0 - 10, p.y + 22]).fill(C.woodDark).stroke(THIN);
        g.rect(p.x0 + 24, p.y + 50, w - 48, 40).fill(C.woodDark);
      }
    }
  }
  // The screen's frame on the wall; what it shows is the view's.
  const s = REPLACEMENT.screen;
  g.roundRect(s.x0 - 16, SCREEN.y0 - 16, s.x1 - s.x0 + 32, SCREEN.y1 - SCREEN.y0 + 32, 10).fill("#141414").roundRect(s.x0 - 16, SCREEN.y0 - 16, s.x1 - s.x0 + 32, SCREEN.y1 - SCREEN.y0 + 32, 10).stroke(INK);
  // The drone's pad.
  g.rect(PAD.x - PAD.w / 2, -14, PAD.w, 14).fill(C.pad).rect(PAD.x - PAD.w / 2, -14, PAD.w, 14).stroke(THIN);
  g.rect(PAD.x - 20, -12, 8, 10).fill("#f2c14e").rect(PAD.x + 12, -12, 8, 10).fill("#f2c14e").rect(PAD.x - 12, -8, 24, 4).fill("#f2c14e");
  return root;
}

/** The ring light on its stand: a tripod, the pole, the ring at the top (in front of the screen on the wall). */
function ringLight(pieces: TrainingPieces): Container {
  const x = REPLACEMENT.stand.x;
  if (pieces.ringlight) {
    const sp = standing(pieces.ringlight, RING.top + RING.r);
    sp.position.set(x, 0);
    return sp;
  }
  const g = new Graphics();
  g.moveTo(x, -80).lineTo(x - 50, 0).moveTo(x, -80).lineTo(x + 50, 0).moveTo(x, -80).lineTo(x, 0).stroke({ width: 6, color: "#2b2b2e" });
  g.rect(x - 4, -RING.top, 8, RING.top - 80).fill("#2b2b2e");
  g.circle(x, -RING.top - RING.r + 10, RING.r).stroke({ width: 16, color: C.ring }).circle(x, -RING.top - RING.r + 10, RING.r).stroke({ ...INK, width: 3 });
  return g;
}

/**
 * The training room's moving parts. `floor`, just over the venue and under every figure: the beam's lit wedge on the floor and
 * its glow on the wall (never over a face), and the screen's loop, its cracks and its dark. `front`, among the figures: the
 * drone, the IFU on the lectern, in his hand or lying where it landed.
 */
export class TrainingView {
  readonly floor = new Container({ label: "training-floor" });
  readonly front = new Container({ label: "training-front" });
  private readonly light = new Graphics();
  private readonly screen = new Graphics();
  private readonly caption: BitmapText;
  private readonly g = new Graphics();
  private loopT = 0;
  private spin = 0;
  private stand: Container | null = null;
  reducedMotion = false;

  constructor(parent: Container) {
    this.floor.zIndex = SCENERY_Z + 0.5;
    this.caption = label("Module 1: Holding the demo unit", "ui", 34);
    this.caption.tint = 0x1b2230;
    this.caption.visible = false;
    this.floor.addChild(this.light, this.screen, this.caption);
    this.front.addChild(this.g);
    parent.addChild(this.floor, this.front);
  }

  setVisible(on: boolean): void {
    this.floor.visible = this.front.visible = on;
  }

  /** The ring light, the sheet's or drawn, over the screen and the beam. */
  setPieces(pieces: TrainingPieces): void {
    this.stand?.destroy();
    this.stand = ringLight(pieces);
    this.floor.addChild(this.stand);
  }

  /** What the frame of the screen's loop is showing: one of four, two a second. */
  get frame(): number {
    return Math.floor(this.loopT * SCREEN.fps) % SCREEN.frames;
  }

  sync(boss: Replacement | null, ifu: World["ifu"], dt: number): void {
    this.loopT += dt;
    this.spin += dt;
    const light = this.light.clear();
    if (boss && beamOn(boss)) {
      // The wedge on the floor and the glow on the wall, below every figure: nothing of it falls on a face.
      const x = boss.beam.x;
      const w = REPLACEMENT.beam.w / 2;
      light.ellipse(x, 0, w, WEDGE.ry).fill({ color: C.beam, alpha: 0.55 });
      light.ellipse(x, -4, w * 0.7, WEDGE.ry * 0.6).fill({ color: "#ffffff", alpha: 0.35 });
      const ring = { x: REPLACEMENT.stand.x, y: -RING.top - RING.r + 10 };
      light.poly([ring.x - RING.r * 0.6, ring.y, ring.x + RING.r * 0.6, ring.y, x + w, 0, x - w, 0]).fill({ color: C.beam, alpha: WEDGE.cone });
      light.blendMode = this.reducedMotion ? "normal" : "add";
    }
    this.drawScreen(boss);
    const g = this.g.clear();
    // Hiding, he is behind the lectern: its front panel stands over him (never over Hammer, who walks in front of it).
    if (boss?.state === "hide") {
      const x0 = 2950;
      const x1 = 3050;
      g.rect(x0 + 6, -140, x1 - x0 - 12, 140).fill(C.wood).rect(x0 + 6, -140, x1 - x0 - 12, 140).stroke(INK);
      g.poly([x0 - 10, -130, x1 + 10, -146, x1 + 10, -132, x0 - 10, -118]).fill(C.woodDark).stroke(THIN);
      g.rect(x0 + 24, -90, x1 - x0 - 48, 40).fill(C.woodDark);
    }
    const d = boss?.drone;
    if (d) this.drawDrone(g, d.x, d.state === "down" ? -10 : d.y, d.state === "down");
    if (ifu && ifu.state !== "air") {
      // The IFU: a blue binder with its pages, lying flat once it has landed.
      const flat = ifu.state === "lying";
      g.roundRect(ifu.x - 26, ifu.y - (flat ? 14 : 40), 52, flat ? 14 : 40, 4).fill(C.ifu).roundRect(ifu.x - 26, ifu.y - (flat ? 14 : 40), 52, flat ? 14 : 40, 4).stroke(INK);
      if (!flat) g.rect(ifu.x - 20, ifu.y - 34, 40, 8).fill(C.ifuPage);
    }
  }

  private drawScreen(boss: Replacement | null) {
    const g = this.screen.clear();
    const s = REPLACEMENT.screen;
    const w = s.x1 - s.x0;
    const h = SCREEN.y1 - SCREEN.y0;
    const playing = !!boss?.screen.playing;
    g.rect(s.x0, SCREEN.y0, w, h).fill(playing ? "#eef2f6" : C.screen);
    this.caption.visible = playing;
    if (playing) {
      this.caption.position.set(s.x0 + 30, SCREEN.y0 + 24);
      // The loop: a hand holding the demo unit upside down, turning it the wrong way and swaying with it, four frames.
      const cx = s.x0 + w / 2 + [-60, 60, -20, 20][this.frame];
      const cy = SCREEN.y0 + h * 0.6;
      const tilt = [-0.4, -0.15, 0.15, 0.4][this.frame];
      const ux = Math.cos(tilt);
      const uy = Math.sin(tilt);
      const corner = (a: number, b: number) => [cx + a * ux - b * uy, cy + a * uy + b * ux];
      g.poly([...corner(-150, -60), ...corner(150, -60), ...corner(150, 60), ...corner(-150, 60)]).fill(C.unit).stroke(INK);
      g.poly([...corner(110, -40), ...corner(140, -40), ...corner(140, 40), ...corner(110, 40)]).fill("#b8282e");
      g.ellipse(cx - 40 * ux, cy + 110, 90, 54).fill(C.hand).ellipse(cx - 40 * ux, cy + 110, 90, 54).stroke(THIN);
      g.moveTo(s.x0 + 30, SCREEN.y1 - 30).lineTo(s.x0 + 30 + (w - 60) * ((this.loopT % 8) / 8), SCREEN.y1 - 30).stroke({ width: 8, color: "#b8282e" });
    }
    const cracks = boss?.screen.cracks ?? 0;
    if (cracks >= REPLACEMENT.screen.cracks) g.rect(s.x0, SCREEN.y0, w, h).fill({ color: "#0b0d10", alpha: 0.9 });
    // Each crack a burst of lines from its own point.
    const points = [
      [0.3, 0.4],
      [0.68, 0.3],
      [0.5, 0.72],
    ];
    for (let k = 0; k < cracks; k++) {
      const [px, py] = points[k];
      const x = s.x0 + w * px;
      const y = SCREEN.y0 + h * py;
      for (let a = 0; a < 7; a++) {
        const ang = a * 0.9 + k;
        g.moveTo(x, y)
          .lineTo(x + Math.cos(ang) * 90, y + Math.sin(ang) * 70)
          .lineTo(x + Math.cos(ang + 0.2) * 170, y + Math.sin(ang + 0.2) * 120)
          .stroke({ width: 3, color: "#ffffff", alpha: 0.85 });
      }
    }
  }

  /** The drone: a dark body, four arms and their spinning rotors, the red light of its camera; on the floor once downed. */
  private drawDrone(g: Graphics, x: number, y: number, down: boolean) {
    const tilt = down ? 0.5 : 0;
    g.roundRect(x - 34, y - 14, 68, 28, 8).fill("#2b2b2e").roundRect(x - 34, y - 14, 68, 28, 8).stroke(INK);
    for (const sx of [-1, 1]) {
      const ax = x + sx * 54;
      const ay = y - 18 + sx * tilt * 20;
      g.moveTo(x + sx * 30, y - 6).lineTo(ax, ay).stroke({ width: 5, color: "#2b2b2e" });
      const spread = down ? 30 : 30 * Math.abs(Math.cos(this.spin * 40 + sx));
      g.ellipse(ax, ay - 4, spread + 6, 5).fill({ color: "#9aa3ab", alpha: 0.8 });
    }
    g.circle(x, y + 8, 7).fill("#1b1b1b");
    if (!down) g.circle(x + 18, y - 4, 4).fill("#e0322b");
  }

  destroy(): void {
    if (!this.floor.destroyed) this.floor.destroy({ children: true });
    if (!this.front.destroyed) this.front.destroy({ children: true });
  }
}
