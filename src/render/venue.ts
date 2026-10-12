import { Container, Graphics } from "pixi.js";
import type { CheckpointSpec, DoorSpec, Furniture, Level, LevelFloor, LevelPlatform, SignSpec } from "../sim/level";
import type { FloorSegment, Pass, Point } from "../sim/types";
import { SCENERY_Z } from "./backdrop";
import { PALETTE, highlightOf, shadowOf, tones } from "./palette";
import type { Scene } from "./scene";
import { label } from "./text";

const OUTLINE = 4;
const INK = { width: OUTLINE, color: PALETTE.outline, join: "round" as const };
const THIN = { width: 3, color: PALETTE.outline, join: "round" as const };
const FLOOR_DEPTH = 120;
const FLOOR_TOP = 26;
/** The floor's top runs this far back toward the wall, so the far foot (a step back in the painting) stands on it. */
const FLOOR_BACK = 34;
const COLORS = {
  velvet: "#7a2e3a",
  runner: "#8f2a2a",
  steel: "#9aa3a8",
  rubber: "#1d1d1f",
  glass: "#a9c7cf",
  cloth: "#efe9dc",
  tile: "#8d9289",
  exit: "#2f8f4e",
  hazard: "#e2b23a",
  shaft: "#141218",
  card: "#efe6cf",
  gold: "#f2c14e",
  screen: "#f4f1ea",
} as const;
/** A stair's rise and run: 30 degrees. */
const STEP_RISE = 40;
const STEP_RUN = STEP_RISE / Math.tan(Math.PI / 6);
/** The escalator's steps, px apart along its run. */
const ESCALATOR_GAP = 60;
const DOOR = { w: 260, h: 380, lintel: 64 } as const;
const CLOCK = { w: 130, h: 190, up: 430 } as const;
const BALCONY = { slab: 44, rail: 112, post: 140, column: 900 } as const;
/** A banquet chair's height from the floor to the top of its back. */
const CHAIR_H = 330;

export type VenueView = {
  /** The door he stands in front of glows with a down arrow. */
  setDoorGlow(id: string | null): void;
  /** A punch clock's card turns gold and its face lights. */
  punch(id: string): void;
  /** Every clock in `ids` punched, the rest fresh: after a respawn. */
  setPunched(ids: readonly string[]): void;
  update(dt: number): void;
  setVisible(on: boolean): void;
  destroy(): void;
};

/** The escalator's steps this moment: one every 60 px of its run, sliding along at the belt's speed. */
export function escalatorSteps(seg: FloorSegment, t: number): Point[] {
  const run = seg.x1 - seg.x0;
  const shift = ((((seg.belt ?? 0) * t) % ESCALATOR_GAP) + ESCALATOR_GAP) % ESCALATOR_GAP;
  const out: Point[] = [];
  for (let x = seg.x0 + shift; x <= seg.x1; x += ESCALATOR_GAP) out.push({ x, y: seg.y0 + ((seg.y1 - seg.y0) * (x - seg.x0)) / run });
  return out;
}

/** The level drawn behind Hammer: floors, platforms, furniture, doors, punch clocks and signs. */
export function drawVenue(scene: Scene, level: Level): VenueView {
  const root = new Container();
  root.zIndex = SCENERY_Z;
  root.sortableChildren = false;
  const back = new Graphics();
  const mid = new Graphics();
  const front = new Graphics();
  root.addChild(back, mid, front);

  for (const f of level.furniture) drawFurniture(back, f);
  for (const p of level.passes) drawPass(back, p, root);
  for (const p of level.platforms) drawPlatform(mid, p);
  for (const f of level.floor) drawFloor(front, f, level);
  drawShaftPits(back, level);
  for (const s of level.signs) drawSign(root, s);

  const escalators = level.floor.filter((f) => f.kind === "escalator");
  const steps = new Graphics();
  root.addChild(steps);

  const doors = new Map<string, { glow: Graphics }>();
  for (const d of level.doors) doors.set(d.id, drawDoor(root, d));
  const clocks = new Map<string, Graphics>();
  for (const k of level.checkpoints) {
    const g = new Graphics();
    drawClock(g, k, false);
    const card = label("BREAK", "display", 28);
    card.tint = PALETTE.outline;
    card.anchor.set(0.5);
    card.position.set(k.x, k.y - CLOCK.up + 118);
    root.addChild(g, card);
    clocks.set(k.id, g);
  }
  scene.layers.play.addChild(root);

  let t = 0;
  let glowing: string | null = null;
  const redrawSteps = () => {
    steps.clear();
    for (const seg of escalators) drawEscalatorSteps(steps, seg, t);
  };
  redrawSteps();

  return {
    setDoorGlow(id) {
      glowing = id;
      for (const [k, d] of doors) d.glow.visible = k === id;
    },
    punch(id) {
      const g = clocks.get(id);
      const k = level.checkpoints.find((c) => c.id === id);
      if (g && k) drawClock(g.clear(), k, true);
    },
    setPunched(ids) {
      for (const k of level.checkpoints) {
        const g = clocks.get(k.id);
        if (g) drawClock(g.clear(), k, ids.includes(k.id));
      }
    },
    update(dt) {
      t += dt;
      if (escalators.length) redrawSteps();
      if (glowing) {
        const d = doors.get(glowing);
        if (d) d.glow.alpha = 0.65 + 0.35 * Math.sin(t * 6);
      }
    },
    setVisible(on) {
      root.visible = on;
    },
    destroy() {
      root.destroy({ children: true });
    },
  };
}

function drawFloor(g: Graphics, f: LevelFloor, level: Level) {
  if (f.kind === "stairs") return drawStairs(g, f);
  if (f.kind === "escalator") return drawEscalator(g, f);
  const face = tones(f.kind === "tile" ? COLORS.tile : PALETTE.marbleFront);
  const top = f.kind === "tile" ? highlightOf(COLORS.tile) : PALETTE.marbleTop;
  const x0 = Math.max(f.x0, level.bounds.x - 200);
  const x1 = Math.min(f.x1, level.bounds.x + level.bounds.w + 200);
  g.poly([x0, f.y0 + FLOOR_TOP, x1, f.y1 + FLOOR_TOP, x1, f.y1 + FLOOR_DEPTH, x0, f.y0 + FLOOR_DEPTH]).fill(face.base);
  g.poly([x0, f.y0 - FLOOR_BACK, x1, f.y1 - FLOOR_BACK, x1, f.y1 + FLOOR_TOP, x0, f.y0 + FLOOR_TOP]).fill(top);
  g.poly([x0, f.y0 + FLOOR_TOP, x1, f.y1 + FLOOR_TOP, x1, f.y1 + FLOOR_TOP + 10, x0, f.y0 + FLOOR_TOP + 10]).fill(face.shadow);
  g.poly([x0, f.y0 + 16, x1, f.y1 + 16, x1, f.y1 + 20, x0, f.y0 + 20]).fill({ color: "#ffffff", alpha: 0.4 });
  g.poly([x0, f.y0 - FLOOR_BACK, x1, f.y1 - FLOOR_BACK, x1, f.y1 + FLOOR_DEPTH, x0, f.y0 + FLOOR_DEPTH]).stroke(INK);
  if (f.kind === "tile") {
    for (let x = x0 + 120; x < x1; x += 120) g.moveTo(x, f.y0 + FLOOR_TOP + 10).lineTo(x, f.y0 + FLOOR_DEPTH).stroke({ width: 2, color: face.shadow });
    return;
  }
  for (let x = x0 + 160; x < x1 - 320; x += 420) {
    const y = f.y0 + FLOOR_TOP + 30;
    g.moveTo(x, y)
      .quadraticCurveTo(x + 90, y + 40, x + 200, y + 20)
      .quadraticCurveTo(x + 260, y + 10, x + 320, y + 55)
      .stroke({ width: 3, color: face.shadow, cap: "round" });
  }
}

/** The grand staircase: a marble stringer, treads with a red runner and brass rods, and a balustrade. */
function drawStairs(g: Graphics, f: FloorSegment) {
  const marble = tones(PALETTE.marbleFront);
  const brass = tones(PALETTE.brass);
  const runner = tones(COLORS.runner);
  const slope = (f.y1 - f.y0) / (f.x1 - f.x0);
  const at = (x: number) => f.y0 + slope * (x - f.x0);
  // The stringer under the steps, its underside open over the floor route.
  g.poly([f.x0, at(f.x0), f.x1, at(f.x1), f.x1, at(f.x1) + 120, f.x0, at(f.x0) + 120]).fill(marble.base);
  g.poly([f.x0, at(f.x0) + 90, f.x1, at(f.x1) + 90, f.x1, at(f.x1) + 120, f.x0, at(f.x0) + 120]).fill(marble.shadow);
  // The treads: a sawtooth along the slope, the feet line through their noses.
  const pts: number[] = [f.x0, at(f.x0)];
  for (let x = f.x0; x < f.x1 - 1; x += STEP_RUN) {
    const nx = Math.min(f.x1, x + STEP_RUN);
    pts.push(x, at(nx), nx, at(nx));
  }
  pts.push(f.x1, at(f.x1) + 120, f.x0, at(f.x0) + 120);
  g.poly(pts).fill(PALETTE.marbleTop);
  for (let x = f.x0; x < f.x1 - 1; x += STEP_RUN) {
    const nx = Math.min(f.x1, x + STEP_RUN);
    g.rect(x + 8, at(nx), nx - x - 8, 14).fill(runner.base);
    g.rect(x + 8, at(nx) + 14, nx - x - 8, STEP_RISE - 14).fill(runner.shadow);
    g.roundRect(x + 2, at(nx) + STEP_RISE - 8, nx - x, 7, 3).fill(brass.highlight);
  }
  g.poly(pts).stroke(INK);
  // The balustrade: brass posts every other step and a sloped rail.
  for (let x = f.x0 + 20; x < f.x1; x += STEP_RUN * 2) {
    g.rect(x - 5, at(x) - 110, 10, 110).fill(brass.base);
    g.rect(x - 5, at(x) - 110, 10, 110).stroke(THIN);
  }
  g.moveTo(f.x0 - 10, at(f.x0) - 118).lineTo(f.x1 + 10, at(f.x1) - 118).stroke({ width: 18, color: PALETTE.outline, cap: "round" });
  g.moveTo(f.x0 - 10, at(f.x0) - 118).lineTo(f.x1 + 10, at(f.x1) - 118).stroke({ width: 11, color: brass.highlight, cap: "round" });
}

/** The escalator's truss, glass side and rubber handrail; its steps move in `drawEscalatorSteps`. */
function drawEscalator(g: Graphics, f: FloorSegment) {
  const steel = tones(COLORS.steel);
  const slope = (f.y1 - f.y0) / (f.x1 - f.x0);
  const at = (x: number) => f.y0 + slope * (x - f.x0);
  g.poly([f.x0, at(f.x0), f.x1, at(f.x1), f.x1 + 40, at(f.x1) + 26, f.x1 + 40, at(f.x1) + 110, f.x0, at(f.x0) + 110]).fill(steel.base);
  g.poly([f.x0, at(f.x0) + 80, f.x1 + 40, at(f.x1) + 80, f.x1 + 40, at(f.x1) + 110, f.x0, at(f.x0) + 110]).fill(steel.shadow);
  g.poly([f.x0, at(f.x0), f.x1, at(f.x1), f.x1 + 40, at(f.x1) + 26, f.x1 + 40, at(f.x1) + 110, f.x0, at(f.x0) + 110]).stroke(INK);
  g.poly([f.x0, at(f.x0) - 96, f.x1, at(f.x1) - 96, f.x1, at(f.x1), f.x0, at(f.x0)]).fill({ color: COLORS.glass, alpha: 0.28 });
  for (let x = f.x0 + 150; x < f.x1; x += 150) g.moveTo(x, at(x) - 96).lineTo(x, at(x)).stroke({ width: 2, color: steel.highlight, alpha: 0.8 });
  g.moveTo(f.x0 - 30, at(f.x0) - 100).lineTo(f.x1 + 30, at(f.x1) - 100).stroke({ width: 20, color: PALETTE.outline, cap: "round" });
  g.moveTo(f.x0 - 30, at(f.x0) - 100).lineTo(f.x1 + 30, at(f.x1) - 100).stroke({ width: 13, color: COLORS.rubber, cap: "round" });
  g.moveTo(f.x0 - 26, at(f.x0) - 104).lineTo(f.x1 + 26, at(f.x1) - 104).stroke({ width: 3, color: "#ffffff", alpha: 0.35, cap: "round" });
}

function drawEscalatorSteps(g: Graphics, f: FloorSegment, t: number) {
  const steel = tones(COLORS.steel);
  for (const p of escalatorSteps(f, t)) {
    g.rect(p.x - 26, p.y, 52, 10).fill(steel.highlight);
    g.rect(p.x - 26, p.y + 10, 52, 22).fill(steel.shadow);
    g.rect(p.x - 26, p.y, 52, 32).stroke({ width: 2, color: PALETTE.outline });
  }
}

function drawPlatform(g: Graphics, p: LevelPlatform) {
  const w = p.x1 - p.x0;
  const marble = tones(PALETTE.marbleFront);
  const brass = tones(PALETTE.brass);
  switch (p.kind) {
    case "sofa": {
      const velvet = tones(COLORS.velvet);
      // The back cushion, set behind the seat, then the seat he stands on, arms, and short brass legs.
      g.roundRect(p.x0 + 20, p.y - 120, w - 40, 130, 26).fill(velvet.shadow);
      g.roundRect(p.x0 + 20, p.y - 120, w - 40, 130, 26).stroke(INK);
      for (let x = p.x0 + 20 + (w - 40) / 3; x < p.x1 - 40; x += (w - 40) / 3)
        g.moveTo(x, p.y - 108).lineTo(x, p.y - 4).stroke({ width: 3, color: shadowOf(velvet.shadow) });
      g.roundRect(p.x0, p.y, w, 76, 18).fill(velvet.base);
      g.roundRect(p.x0 + 14, p.y + 6, w - 28, 10, 5).fill(velvet.highlight);
      g.roundRect(p.x0, p.y, w, 76, 18).stroke(INK);
      for (const x of [p.x0 - 18, p.x1 - 26]) {
        g.roundRect(x, p.y - 56, 44, 120, 20).fill(velvet.base);
        g.roundRect(x, p.y - 56, 44, 120, 20).stroke(INK);
      }
      for (const x of [p.x0 + 30, p.x1 - 42]) {
        g.rect(x, p.y + 76, 12, -p.y - 76).fill(brass.base);
        g.rect(x, p.y + 76, 12, -p.y - 76).stroke(THIN);
      }
      return;
    }
    case "landing": {
      g.rect(p.x0, p.y, w, -p.y).fill(marble.base);
      g.rect(p.x0, p.y, w, 18).fill(PALETTE.marbleTop);
      g.rect(p.x0 + w - 40, p.y + 18, 40, -p.y - 18).fill(marble.shadow);
      g.rect(p.x0, p.y, w, -p.y).stroke(INK);
      // A newel post at the foot of the stairs.
      g.rect(p.x0 + 14, p.y - BALCONY.post, 26, BALCONY.post).fill(brass.base);
      g.rect(p.x0 + 14, p.y - BALCONY.post, 26, BALCONY.post).stroke(THIN);
      g.circle(p.x0 + 27, p.y - BALCONY.post - 12, 18).fill(brass.highlight);
      g.circle(p.x0 + 27, p.y - BALCONY.post - 12, 18).stroke(THIN);
      return;
    }
    case "balcony": {
      // Marble columns hold it up over the floor route, then the slab and its brass balustrade.
      for (let x = p.x0 + 300; x < p.x1 - 100; x += BALCONY.column) {
        g.rect(x - 40, p.y + BALCONY.slab, 80, -p.y - BALCONY.slab).fill(marble.base);
        g.rect(x + 14, p.y + BALCONY.slab, 26, -p.y - BALCONY.slab).fill(marble.shadow);
        g.rect(x - 40, p.y + BALCONY.slab, 80, -p.y - BALCONY.slab).stroke(THIN);
      }
      g.rect(p.x0, p.y + BALCONY.slab, w, 40).fill({ color: PALETTE.outline, alpha: 0.25 });
      g.rect(p.x0, p.y, w, BALCONY.slab).fill(marble.base);
      g.rect(p.x0, p.y, w, 14).fill(PALETTE.marbleTop);
      g.rect(p.x0, p.y + 30, w, 14).fill(marble.shadow);
      g.rect(p.x0, p.y, w, BALCONY.slab).stroke(INK);
      for (let x = p.x0 + 20; x <= p.x1 - 20; x += 70) {
        g.rect(x - 4, p.y - 100, 8, 100).fill(brass.base);
        g.rect(x - 4, p.y - 100, 8, 100).stroke({ width: 2, color: PALETTE.outline });
      }
      g.roundRect(p.x0, p.y - BALCONY.rail, w, 14, 6).fill(brass.highlight);
      g.roundRect(p.x0, p.y - BALCONY.rail, w, 14, 6).stroke(THIN);
      return;
    }
    case "table": {
      const cloth = tones(COLORS.cloth);
      g.rect(p.x0, p.y, w, -p.y - 10).fill(cloth.base);
      g.rect(p.x0, p.y, w, 16).fill(cloth.highlight);
      for (let x = p.x0 + 60; x < p.x1 - 20; x += 90)
        g.moveTo(x, p.y + 20).quadraticCurveTo(x + 8, p.y + 80, x - 4, -12).stroke({ width: 3, color: cloth.shadow });
      g.rect(p.x0, p.y, w, -p.y - 10).stroke(INK);
      // Place settings along the back of the top: plates, glasses and a centrepiece, below his knees.
      for (let x = p.x0 + 70; x < p.x1 - 40; x += 170) {
        g.ellipse(x, p.y - 4, 34, 7).fill("#ffffff");
        g.ellipse(x, p.y - 4, 34, 7).stroke({ width: 2, color: PALETTE.outline });
        g.moveTo(x + 52, p.y - 4).lineTo(x + 52, p.y - 22).stroke({ width: 3, color: PALETTE.outline });
        g.poly([x + 42, p.y - 22, x + 62, p.y - 22, x + 58, p.y - 46, x + 46, p.y - 46]).fill({ color: COLORS.glass, alpha: 0.8 });
        g.poly([x + 42, p.y - 22, x + 62, p.y - 22, x + 58, p.y - 46, x + 46, p.y - 46]).stroke({ width: 2, color: PALETTE.outline });
      }
      const mid = (p.x0 + p.x1) / 2;
      g.poly([mid - 22, p.y, mid + 22, p.y, mid + 14, p.y - 44, mid - 14, p.y - 44]).fill(brass.base);
      g.poly([mid - 22, p.y, mid + 22, p.y, mid + 14, p.y - 44, mid - 14, p.y - 44]).stroke(THIN);
      for (const [dx, dy, c] of [[-22, -60, "#d9534f"], [0, -72, "#f2c14e"], [22, -60, "#e8e2d4"]] as const) {
        g.circle(mid + dx, p.y + dy, 16).fill(c);
        g.circle(mid + dx, p.y + dy, 16).stroke({ width: 2, color: PALETTE.outline });
      }
      return;
    }
    case "shelf": {
      const wood = tones(PALETTE.wood);
      g.rect(p.x0, p.y, w, 30).fill(wood.base);
      g.rect(p.x0, p.y + 22, w, 8).fill(wood.shadow);
      g.rect(p.x0, p.y, w, 30).stroke(INK);
      for (const x of [p.x0 + 40, p.x1 - 60]) {
        g.poly([x, p.y + 30, x + 20, p.y + 30, x + 20, p.y + 110, x, p.y + 50]).fill(wood.shadow);
        g.poly([x, p.y + 30, x + 20, p.y + 30, x + 20, p.y + 110, x, p.y + 50]).stroke(THIN);
      }
      // Boxes of supplies along the back.
      for (let x = p.x0 + 30; x < p.x1 - 90; x += 130) {
        g.rect(x, p.y - 70, 90, 70).fill(tones("#b58b56").base);
        g.rect(x, p.y - 70, 90, 70).stroke(THIN);
        g.moveTo(x + 45, p.y - 70).lineTo(x + 45, p.y).stroke({ width: 3, color: "#8c6a3f" });
      }
      return;
    }
    case "counter":
      drawDesk(g, { kind: "desk", x: p.x0, y: p.y, w, h: -p.y });
  }
}

function drawDesk(g: Graphics, f: Furniture) {
  const marble = tones(PALETTE.marbleFront);
  const brass = tones(PALETTE.brass);
  g.rect(f.x, f.y, f.w, f.h).fill(marble.base);
  g.rect(f.x + f.w - 70, f.y + 22, 70, f.h - 22).fill(marble.shadow);
  g.rect(f.x - 16, f.y - 10, f.w + 32, 32).fill(PALETTE.marbleTop);
  g.rect(f.x - 16, f.y - 10, f.w + 32, 32).stroke(INK);
  g.rect(f.x, f.y + 22, f.w, 10).fill(brass.base);
  g.rect(f.x + 24, f.y - 4, f.w - 48, 4).fill({ color: "#ffffff", alpha: 0.45 });
  g.rect(f.x, f.y + 32, f.w, 20).fill(brass.shadow);
  g.rect(f.x, f.y, f.w, f.h).stroke(INK);
  for (let x = f.x + 60; x < f.x + f.w - 120; x += 170) {
    g.roundRect(x, f.y + 70, 120, f.h - 100, 8).stroke({ width: 3, color: marble.shadow });
    g.roundRect(x + 10, f.y + 80, 100, 6, 3).fill({ color: "#ffffff", alpha: 0.35 });
  }
}

function drawFurniture(g: Graphics, f: Furniture) {
  const brass = tones(PALETTE.brass);
  switch (f.kind) {
    case "desk":
      return drawDesk(g, f);
    case "bell": {
      const cx = f.x + f.w / 2;
      const base = f.y + f.h;
      g.roundRect(cx - 32, base - 12, 64, 12, 4).fill(PALETTE.outline);
      g.ellipse(cx, base - 12, 28, 30).fill(brass.base);
      g.rect(cx - 30, base - 12, 60, 14).fill(brass.base);
      g.ellipse(cx - 9, base - 30, 7, 10).fill(brass.highlight);
      g.ellipse(cx, base - 12, 28, 30).stroke(THIN);
      g.rect(cx - 4, base - 52, 8, 12).fill(PALETTE.outline);
      g.circle(cx, base - 54, 7).fill(brass.highlight);
      g.circle(cx, base - 54, 7).stroke({ width: 2, color: PALETTE.outline });
      return;
    }
    case "elevators": {
      const steel = tones(COLORS.steel);
      const wall = tones("#cfc6b8");
      g.rect(f.x, f.y, f.w, f.h).fill(wall.base);
      g.rect(f.x, f.y, f.w, f.h).stroke(THIN);
      for (const dx of [80, 420, 760]) {
        const x = f.x + dx;
        if (x > 5850 && x < 6250) continue;
        g.rect(x - 14, f.y + 80, 288, f.h - 80).fill(brass.base);
        g.rect(x, f.y + 96, 260, f.h - 96).fill(steel.base);
        g.rect(x + 130, f.y + 96, 2, f.h - 96).fill(PALETTE.outline);
        g.rect(x + 12, f.y + 110, 18, f.h - 120).fill(steel.highlight);
        g.rect(x, f.y + 96, 260, f.h - 96).stroke(THIN);
        drawDial(g, x + 130, f.y + 52, 4);
      }
      return;
    }
    case "shaft": {
      const steel = tones(COLORS.steel);
      g.rect(f.x, f.y + 96, f.w, f.h - 96).fill(COLORS.shaft);
      for (const dx of [f.w * 0.35, f.w * 0.65]) g.moveTo(f.x + dx, f.y + 96).lineTo(f.x + dx, f.y + f.h).stroke({ width: 3, color: "#3a3640" });
      // The doors parted, jammed open.
      g.rect(f.x - 20, f.y + 96, 50, f.h - 96).fill(steel.base);
      g.rect(f.x + f.w - 30, f.y + 96, 50, f.h - 96).fill(steel.base);
      g.rect(f.x - 20, f.y + 96, 50, f.h - 96).stroke(THIN);
      g.rect(f.x + f.w - 30, f.y + 96, 50, f.h - 96).stroke(THIN);
      g.rect(f.x - 34, f.y + 80, f.w + 68, 16).fill(brass.base);
      g.rect(f.x - 34, f.y + 80, f.w + 68, 16).stroke(THIN);
      drawDial(g, f.x + f.w / 2, f.y + 40, -1);
      // A hazard stanchion strung across the gap.
      for (const x of [f.x - 60, f.x + f.w + 60]) {
        g.rect(x - 8, f.y + f.h - 170, 16, 170).fill(brass.base);
        g.rect(x - 8, f.y + f.h - 170, 16, 170).stroke(THIN);
        g.circle(x, f.y + f.h - 176, 12).fill(brass.highlight);
      }
      const ty = f.y + f.h - 150;
      g.rect(f.x - 60, ty, f.w + 120, 28).fill(COLORS.hazard);
      for (let x = f.x - 60; x < f.x + f.w + 60; x += 40) g.poly([x, ty + 28, x + 18, ty, x + 34, ty, x + 16, ty + 28]).fill(PALETTE.outline);
      g.rect(f.x - 60, ty, f.w + 120, 28).stroke(THIN);
      return;
    }
    case "planter": {
      const leaf = tones(PALETTE.leaf);
      const cx = f.x + f.w / 2;
      const base = f.y + f.h;
      g.poly([cx - f.w / 2, base - 120, cx + f.w / 2, base - 120, cx + f.w / 2 - 14, base, cx - f.w / 2 + 14, base]).fill(brass.base);
      g.poly([cx + 10, base - 120, cx + f.w / 2, base - 120, cx + f.w / 2 - 14, base, cx + 6, base]).fill(brass.shadow);
      g.poly([cx - f.w / 2, base - 120, cx + f.w / 2, base - 120, cx + f.w / 2 - 14, base, cx - f.w / 2 + 14, base]).stroke(THIN);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * 0.92 + (i / 5) * Math.PI * 0.84;
        const ex = cx + Math.cos(a) * 140;
        const ey = base - 230 + Math.sin(a) * 90 + 40;
        g.moveTo(cx, base - 120).quadraticCurveTo(cx + Math.cos(a) * 60, base - 300, ex, ey).stroke({ width: 22, color: PALETTE.outline, cap: "round" });
        g.moveTo(cx, base - 120).quadraticCurveTo(cx + Math.cos(a) * 60, base - 300, ex, ey).stroke({ width: 15, color: i % 2 ? leaf.base : leaf.shadow, cap: "round" });
      }
      return;
    }
    case "porte": {
      const steel = tones(COLORS.steel);
      g.rect(f.x - 40, f.y - 50, f.w + 80, 50).fill(steel.shadow);
      g.rect(f.x - 40, f.y - 50, f.w + 80, 50).stroke(THIN);
      for (let x = f.x; x < f.x + f.w; x += f.w / 4) {
        g.rect(x, f.y, f.w / 4, f.h).fill({ color: COLORS.glass, alpha: 0.45 });
        g.rect(x, f.y, f.w / 4, f.h).stroke(THIN);
        g.moveTo(x + 18, f.y + 30).lineTo(x + 46, f.y + 120).stroke({ width: 5, color: "#ffffff", alpha: 0.4, cap: "round" });
      }
      return;
    }
    case "chairs": {
      // Gold banquet chairs behind the table: their backs and cushions show above the cloth.
      const back = 200;
      const cushion = tones(COLORS.velvet);
      for (let x = f.x + 50; x < f.x + f.w - 60; x += 160) {
        const top = f.y + f.h - CHAIR_H;
        g.roundRect(x, top, 70, back, 10).fill(brass.base);
        g.roundRect(x + 10, top + 14, 50, back - 28, 6).fill(brass.shadow);
        for (let k = 1; k < 4; k++) g.rect(x + 8, top + k * (back / 4), 54, 6).fill(brass.highlight);
        g.roundRect(x, top, 70, back, 10).stroke(THIN);
        g.roundRect(x - 6, top + back - 10, 82, 24, 8).fill(cushion.base);
        g.roundRect(x - 6, top + back - 10, 82, 24, 8).stroke(THIN);
      }
      return;
    }
    case "screen": {
      const cx = f.x + f.w / 2;
      g.moveTo(cx, f.y + 60).lineTo(cx, f.y + f.h).stroke({ width: 8, color: PALETTE.outline });
      g.moveTo(cx, f.y + f.h - 80).lineTo(cx - 90, f.y + f.h).stroke({ width: 8, color: PALETTE.outline, cap: "round" });
      g.moveTo(cx, f.y + f.h - 80).lineTo(cx + 90, f.y + f.h).stroke({ width: 8, color: PALETTE.outline, cap: "round" });
      g.rect(f.x, f.y, f.w, 300).fill(COLORS.screen);
      g.rect(f.x, f.y, f.w, 300).stroke(INK);
      g.rect(f.x - 10, f.y - 16, f.w + 20, 18).fill(PALETTE.outline);
      g.rect(f.x + 40, f.y + 60, f.w - 80, 24).fill({ color: "#2f4a74", alpha: 0.6 });
      for (let k = 0; k < 4; k++) g.rect(f.x + 40, f.y + 110 + k * 36, (f.w - 80) * (0.9 - k * 0.15), 12).fill({ color: PALETTE.outline, alpha: 0.25 });
      return;
    }
    case "corridor":
      g.rect(f.x + 40, f.y + 40, f.w - 80, f.h - 40).fill(COLORS.shaft);
      return;
    case "railing":
    case "cart":
      return;
  }
}

/** An elevator's floor dial; `floor` -1 is the broken one, its needle dropped. */
function drawDial(g: Graphics, x: number, y: number, floor: number) {
  const brass = tones(PALETTE.brass);
  // Each half disc starts at its own left end: an arc on its own would be joined to the origin.
  const half = (r: number) => g.moveTo(x - r, y + 20).arc(x, y + 20, r, Math.PI, 0).closePath();
  half(46).fill(brass.base);
  half(46).stroke(THIN);
  half(36).fill(COLORS.card);
  const a = floor < 0 ? Math.PI * 0.95 : Math.PI + (floor / 8) * Math.PI;
  g.moveTo(x, y + 20).lineTo(x + Math.cos(a) * 32, y + 20 + Math.sin(a) * 32).stroke({ width: 4, color: PALETTE.outline, cap: "round" });
}

/** The open shaft's drop below the floor line, dark with its cables. */
function drawShaftPits(g: Graphics, level: Level) {
  const floors = level.floor.filter((f) => f.kind === "marble" || f.kind === "tile").sort((a, b) => a.x0 - b.x0);
  for (let i = 1; i < floors.length; i++) {
    const x0 = floors[i - 1].x1;
    const x1 = floors[i].x0;
    if (x1 - x0 < 40) continue;
    g.rect(x0, -FLOOR_BACK, x1 - x0, 700).fill(COLORS.shaft);
    for (const k of [0.35, 0.65]) g.moveTo(x0 + (x1 - x0) * k, -FLOOR_BACK).lineTo(x0 + (x1 - x0) * k, 700).stroke({ width: 3, color: "#3a3640" });
  }
}

function drawPass(g: Graphics, p: Pass, root: Container) {
  const wood = tones(PALETTE.wallWood);
  g.rect(p.x, p.y, p.w, p.h).fill(wood.base);
  g.rect(p.x + 24, p.y + 24, p.w - 48, p.h - 48).fill(wood.highlight);
  g.rect(p.x + 24, p.y + p.h - 70, p.w - 48, 46).fill(wood.shadow);
  g.rect(p.x, p.y, p.w, p.h).stroke(INK);
  g.roundRect(p.x + p.w / 2 - 110, p.y + p.h - 120, 220, 44, 8).fill(PALETTE.brass);
  g.roundRect(p.x + p.w / 2 - 110, p.y + p.h - 120, 220, 44, 8).stroke(THIN);
  const sign = label("SERVICE", "ui", 28);
  sign.tint = PALETTE.outline;
  sign.anchor.set(0.5);
  sign.position.set(p.x + p.w / 2, p.y + p.h - 98);
  root.addChild(sign);
}

/** A brass-framed wall plaque: the label in the display face and a line of advice under it. */
function drawSign(root: Container, s: SignSpec) {
  const title = label(s.label, "display", 46);
  title.anchor.set(0.5, 0);
  const note = s.note ? label(s.note, "ui", 22) : null;
  const w = Math.max(title.width, note?.width ?? 0) + 60;
  const h = 70 + (note ? 34 : 0);
  const g = new Graphics();
  const brass = tones(PALETTE.brass);
  g.roundRect(s.x - w / 2 - 8, s.y - 8, w + 16, h + 16, 10).fill(brass.base);
  g.roundRect(s.x - w / 2 - 8, s.y - 8, w + 16, h + 16, 10).stroke(INK);
  g.roundRect(s.x - w / 2, s.y, w, h, 6).fill(PALETTE.wallWood);
  g.roundRect(s.x - w / 2 + 6, s.y + 6, w - 12, 4, 2).fill({ color: "#ffffff", alpha: 0.18 });
  title.tint = brass.highlight;
  title.position.set(s.x, s.y + 8);
  root.addChild(g, title);
  if (note) {
    note.tint = "#e8dcc6";
    note.anchor.set(0.5, 0);
    note.position.set(s.x, s.y + 68);
    root.addChild(note);
  }
}

/** A door with its lintel sign; closed doors carry a card saying what opens them. Returns its glow arrow. */
function drawDoor(root: Container, d: DoorSpec): { glow: Graphics } {
  const g = new Graphics();
  const brass = tones(PALETTE.brass);
  const x = d.x - DOOR.w / 2;
  const top = d.y - DOOR.h;
  if (d.kind === "return") {
    drawReturnCart(g, d);
  } else {
    const leaf = d.kind === "exit" ? { color: COLORS.glass, alpha: 0.5 } : { color: tones(PALETTE.wood).base, alpha: 1 };
    g.rect(x - 18, top - 18, DOOR.w + 36, DOOR.h + 18).fill(PALETTE.wallWood);
    g.rect(x - 18, top - 18, DOOR.w + 36, DOOR.h + 18).stroke(INK);
    g.rect(x, top, DOOR.w, DOOR.h).fill(leaf);
    g.rect(x + DOOR.w / 2 - 2, top, 4, DOOR.h).fill(PALETTE.outline);
    if (d.kind !== "exit")
      for (const px of [x + 22, x + DOOR.w / 2 + 20])
        for (const py of [top + 30, top + 200]) g.roundRect(px, py, DOOR.w / 2 - 42, 140, 6).stroke({ width: 3, color: tones(PALETTE.wood).shadow });
    else g.moveTo(x + 30, top + 40).lineTo(x + 80, top + 200).stroke({ width: 8, color: "#ffffff", alpha: 0.35, cap: "round" });
    for (const hx of [x + DOOR.w / 2 - 24, x + DOOR.w / 2 + 14]) {
      g.roundRect(hx, top + 190, 10, 46, 4).fill(brass.highlight);
      g.roundRect(hx, top + 190, 10, 46, 4).stroke({ width: 2, color: PALETTE.outline });
    }
    g.rect(x, top, DOOR.w, DOOR.h).stroke(THIN);
    // The lintel sign.
    const plate = d.kind === "exit" ? COLORS.exit : PALETTE.outline;
    g.roundRect(x - 30, top - 18 - DOOR.lintel, DOOR.w + 60, DOOR.lintel, 8).fill(plate);
    g.roundRect(x - 30, top - 18 - DOOR.lintel, DOOR.w + 60, DOOR.lintel, 8).stroke({ width: 3, color: brass.base });
  }
  root.addChild(g);
  if (d.kind !== "return") {
    const sign = label(d.label, "display", 36);
    sign.tint = d.kind === "exit" ? "#ffffff" : brass.highlight;
    sign.anchor.set(0.5);
    sign.position.set(d.x, top - 18 - DOOR.lintel / 2);
    if (sign.width > DOOR.w + 40) sign.scale.set((DOOR.w + 40) / sign.width);
    root.addChild(sign);
  }
  if (d.kind === "closed" && d.opens) {
    const card = new Graphics();
    const text = label(d.opens.toUpperCase(), "ui", 18);
    const w = Math.min(DOOR.w - 30, text.width + 28);
    if (text.width > w - 28) text.scale.set((w - 28) / text.width);
    card.roundRect(d.x - w / 2, top + 120, w, 40, 6).fill(COLORS.card);
    card.roundRect(d.x - w / 2, top + 120, w, 40, 6).stroke(THIN);
    card.moveTo(d.x - 30, top + 120).lineTo(d.x, top + 90).lineTo(d.x + 30, top + 120).stroke({ width: 2, color: PALETTE.outline });
    text.tint = PALETTE.outline;
    text.anchor.set(0.5);
    text.position.set(d.x, top + 140);
    root.addChild(card, text);
  }
  const glow = new Graphics();
  const ay = (d.kind === "return" ? d.y - 300 : top) - 18 - DOOR.lintel - 40;
  glow.poly([d.x - 34, ay - 50, d.x + 34, ay - 50, d.x + 34, ay - 14, d.x + 56, ay - 14, d.x, ay + 30, d.x - 56, ay - 14, d.x - 34, ay - 14]).fill(COLORS.gold);
  glow.poly([d.x - 34, ay - 50, d.x + 34, ay - 50, d.x + 34, ay - 14, d.x + 56, ay - 14, d.x, ay + 30, d.x - 56, ay - 14, d.x - 34, ay - 14]).stroke(INK);
  glow.visible = false;
  root.addChild(glow);
  return { glow };
}

/** The stash's way back: a brass luggage cart with a tag on its arch. */
function drawReturnCart(g: Graphics, d: DoorSpec) {
  const brass = tones(PALETTE.brass);
  const x = d.x;
  const y = d.y;
  g.rect(x - 110, y - 40, 220, 22).fill(brass.base);
  g.rect(x - 110, y - 40, 220, 22).stroke(THIN);
  for (const wx of [x - 80, x + 80]) {
    g.circle(wx, y - 12, 14).fill(PALETTE.outline);
    g.circle(wx, y - 12, 6).fill(brass.highlight);
  }
  g.moveTo(x - 100, y - 40).lineTo(x - 100, y - 270).quadraticCurveTo(x, y - 340, x + 100, y - 270).lineTo(x + 100, y - 40).stroke({ width: 18, color: PALETTE.outline, cap: "round" });
  g.moveTo(x - 100, y - 40).lineTo(x - 100, y - 270).quadraticCurveTo(x, y - 340, x + 100, y - 270).lineTo(x + 100, y - 40).stroke({ width: 11, color: brass.highlight, cap: "round" });
  g.roundRect(x - 70, y - 160, 140, 120, 10).fill(tones("#5a4636").base);
  g.roundRect(x - 70, y - 160, 140, 120, 10).stroke(THIN);
  g.roundRect(x - 90, y - 250, 180, 50, 8).fill(COLORS.card);
  g.roundRect(x - 90, y - 250, 180, 50, 8).stroke(THIN);
}

/** A wall-mounted punch clock with its BREAK card; punched, the card is gold and the face lit. */
function drawClock(g: Graphics, k: CheckpointSpec, punched: boolean) {
  const brass = tones(PALETTE.brass);
  const wood = tones(PALETTE.wood);
  const x = k.x - CLOCK.w / 2;
  const y = k.y - CLOCK.up;
  if (punched) g.circle(k.x, y + 50, 90).fill({ color: PALETTE.lampGlow, alpha: 0.35 });
  g.roundRect(x, y, CLOCK.w, CLOCK.h, 12).fill(wood.base);
  g.roundRect(x + CLOCK.w - 26, y + 10, 18, CLOCK.h - 20, 6).fill(wood.shadow);
  g.roundRect(x, y, CLOCK.w, CLOCK.h, 12).stroke(INK);
  g.circle(k.x, y + 50, 38).fill(punched ? "#fff3cf" : COLORS.card);
  g.circle(k.x, y + 50, 38).stroke({ width: 5, color: brass.base });
  g.moveTo(k.x, y + 50).lineTo(k.x, y + 24).stroke({ width: 4, color: PALETTE.outline, cap: "round" });
  g.moveTo(k.x, y + 50).lineTo(k.x + 18, y + 58).stroke({ width: 4, color: PALETTE.outline, cap: "round" });
  // The card in its slot.
  g.rect(k.x - 34, y + 104, 68, 70).fill(punched ? COLORS.gold : COLORS.card);
  g.rect(k.x - 34, y + 104, 68, 70).stroke(THIN);
  g.rect(k.x - 44, y + 98, 88, 12).fill(PALETTE.outline);
  g.moveTo(k.x - 24, y + 140).lineTo(k.x + 24, y + 140).stroke({ width: 3, color: PALETTE.outline, alpha: 0.6 });
  g.moveTo(k.x - 24, y + 154).lineTo(k.x + 14, y + 154).stroke({ width: 3, color: PALETTE.outline, alpha: 0.6 });
  if (punched) g.circle(k.x + 14, y + 160, 6).fill("#a8322d");
  g.roundRect(x + 12, y + CLOCK.h + 6, CLOCK.w - 24, 30, 6).fill(PALETTE.outline);
}
