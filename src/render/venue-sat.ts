import { Assets, type Graphics, type Texture } from "pixi.js";
import { ART_BASE, SAT_PIECES, type Piece, type Registry, type SatPiece } from "../art/registry";
import type { Furniture, Level, LevelFloor } from "../sim/level";
import type { FloorSegment, Point } from "../sim/types";
import { FLOOR, INK, THIN } from "./ink";
import { PALETTE, tones } from "./palette";
import { campusFloor } from "./venue-campus";

/** The airport's materials: the van's white and Southwest blue, the stanchions' chrome and red rope, the machines' grey. */
const C = {
  van: "#f2f1ec",
  blue: "#2b4f9e",
  red: "#c8312f",
  gold: "#e6b43a",
  chrome: "#b9bec4",
  rope: "#b8282e",
  machine: "#c9ccd0",
  tunnel: "#1b1d22",
  rubber: "#26272b",
  glass: "#a9c7cf",
  screen: "#121418",
  seat: "#3b4a63",
  podium: "#2f3f63",
  kiosk: "#d9dde2",
} as const;

/** The X-ray belt's grey bins, one every `gap` px of its run; the moving walkway's grooves, one every `groove`. */
export const BIN = { gap: 200, w: 90, h: 40, groove: 60 } as const;

/** The sheet's pieces, loaded: each with its registry entry (its size and the point it stands on). */
export type SatPieces = Partial<Record<SatPiece, { texture: Texture; piece: Piece }>>;

/** The SAT sheet's pieces, or null while the sheet is not in (the drawn stand-ins stand); one that fails is left out. */
export async function loadSatPieces(registry: Registry): Promise<SatPieces | null> {
  const listed = registry.sat?.pieces;
  if (!listed) return null;
  const out: SatPieces = {};
  await Promise.all(
    SAT_PIECES.map(async (name) => {
      const piece = listed[name];
      if (!piece) return;
      try {
        out[name] = { texture: await Assets.load<Texture>(ART_BASE + piece.file), piece };
      } catch (err) {
        console.warn(`SAT piece ${name}: the stand-in draws (${(err as Error).message})`);
      }
    }),
  );
  return out;
}

/** Draws a piece `w` wide with its base point at (x, y): it stands where the stand-in stood. */
function stand(g: Graphics, p: { texture: Texture; piece: Piece }, x: number, y: number, w: number) {
  const s = w / p.piece.width;
  g.texture(p.texture, 0xffffff, x - p.piece.base.x * s, y - p.piece.base.y * s, w, p.piece.height * s);
}

/** Where the bins on a belt are at `t`: riding at its speed, looping, never hanging off either end. */
export function beltBins(seg: FloorSegment, t: number, gap: number = BIN.gap, margin: number = BIN.w / 2): Point[] {
  const run = seg.x1 - seg.x0;
  const shift = ((((seg.belt ?? 0) * t) % gap) + gap) % gap;
  const out: Point[] = [];
  for (let x = seg.x0 + margin + shift; x <= seg.x1 - margin; x += gap) out.push({ x, y: seg.y0 + ((seg.y1 - seg.y0) * (x - seg.x0)) / run });
  return out;
}

/** What rides SAT's belts: the bins through the X-ray (the raised one), the grooves of the moving walkway (the floor's). */
export function drawSatBelt(g: Graphics, seg: FloorSegment, t: number, pieces: SatPieces | null): void {
  if (seg.y0 >= 0) {
    for (const p of beltBins(seg, t, BIN.groove, 10)) g.moveTo(p.x, p.y - 2).lineTo(p.x - 6, p.y + 12).stroke({ width: 3, color: "#55595f" });
    return;
  }
  const bin = pieces?.bin;
  for (const p of beltBins(seg, t)) {
    if (bin) stand(g, bin, p.x, p.y, BIN.w);
    else g.poly([p.x - BIN.w / 2, p.y - BIN.h, p.x + BIN.w / 2, p.y - BIN.h, p.x + BIN.w / 2 - 8, p.y, p.x - BIN.w / 2 + 8, p.y]).fill("#8d939b").stroke(THIN);
  }
}

/** SAT's belts as surfaces: the X-ray's rubber over its rollers, the walkway's steel skirt and dark treads. */
export function satFloor(g: Graphics, f: LevelFloor): boolean {
  if (f.kind !== "belt") return false;
  const steel = tones(C.chrome);
  if (f.y0 < 0) {
    // The hall's terrazzo runs on under the machine, and the X-ray's belt stands on it on its frame.
    campusFloor(g, { x0: f.x0, x1: f.x1, y0: 0, y1: 0, kind: "terrazzo" });
    g.rect(f.x0, f.y0 + 10, f.x1 - f.x0, 30).fill(steel.shadow).stroke(INK);
    for (let x = f.x0 + 30; x < f.x1; x += 80) g.circle(x, f.y0 + 25, 9).fill(steel.base).stroke(THIN);
    for (const x of [f.x0 + 40, f.x1 - 60]) g.rect(x, f.y0 + 40, 20, -f.y0 - 40).fill(steel.shadow).stroke(THIN);
    g.rect(f.x0, f.y0 - 4, f.x1 - f.x0, 14).fill(C.rubber).stroke(THIN);
    return true;
  }
  // The moving walkway: set into the concourse's terrazzo, its dark tread band with a steel edge and comb plates at both ends.
  campusFloor(g, { ...f, kind: "terrazzo", belt: undefined });
  g.rect(f.x0, f.y0 - FLOOR.back, f.x1 - f.x0, FLOOR.back + 8).fill("#3a3d42").stroke(THIN);
  g.rect(f.x0, f.y0 + 8, f.x1 - f.x0, 6).fill(steel.base);
  for (const x of [f.x0, f.x1 - 40]) g.rect(x, f.y0 - FLOOR.back - 2, 40, FLOOR.back + 10).fill(steel.highlight).stroke(THIN);
  return true;
}

/**
 * SAT's furniture, drawn in code where the sheet has no piece for it: the van, the rope line, the X-ray and the scanner,
 * the walkway's rails, the departures column, the seats at the gate, the podium (into `over`, in front of the gate's door,
 * when given). Other kinds are left to the other venues.
 */
export function drawSatFurniture(g: Graphics, f: Furniture, pieces: SatPieces | null, over: Graphics | null = null): boolean {
  const floor = f.y + f.h;
  switch (f.kind) {
    case "van": {
      if (pieces?.van) {
        stand(g, pieces.van, f.x + f.w / 2, floor, f.w);
        return true;
      }
      // A white shuttle van, nose to the right, a Southwest blue band with a red and gold stripe, two wheels.
      g.roundRect(f.x, f.y + 20, f.w, f.h - 70, 28).fill(C.van).stroke(INK);
      g.rect(f.x, f.y + 130, f.w, 46).fill(C.blue);
      g.rect(f.x, f.y + 176, f.w, 10).fill(C.red);
      g.rect(f.x, f.y + 186, f.w, 8).fill(C.gold);
      g.roundRect(f.x + f.w - 110, f.y + 40, 90, 80, 14).fill(C.glass).stroke(THIN);
      for (let x = f.x + 30; x < f.x + f.w - 150; x += 100) g.roundRect(x, f.y + 44, 80, 66, 8).fill(tones(C.glass).shadow).stroke(THIN);
      for (const x of [f.x + 100, f.x + f.w - 110]) {
        g.circle(x, floor - 46, 46).fill("#1a1a1a").stroke(THIN);
        g.circle(x, floor - 46, 18).fill("#8a8a8a");
      }
      return true;
    }
    case "stanchion": {
      // The rope line's zig-zag: the back row of posts and rope lighter, the front row over it.
      const step = 140;
      if (pieces?.stanchion) {
        for (let x = f.x; x <= f.x + f.w; x += step) stand(g, pieces.stanchion, x, floor, step);
        return true;
      }
      for (const [dy, alpha] of [
        [-30, 0.55],
        [0, 1],
      ] as const) {
        const posts: number[] = [];
        for (let x = f.x + (dy ? step / 2 : 0); x <= f.x + f.w; x += step) posts.push(x);
        for (let i = 1; i < posts.length; i++)
          g.moveTo(posts[i - 1], f.y + dy + 6)
            .quadraticCurveTo((posts[i - 1] + posts[i]) / 2, f.y + dy + 40, posts[i], f.y + dy + 6)
            .stroke({ width: 7, color: C.rope, alpha, cap: "round" });
        for (const x of posts) {
          g.rect(x - 5, f.y + dy, 10, f.h - dy).fill({ color: C.chrome, alpha }).stroke({ ...THIN, alpha });
          g.ellipse(x, floor - 4, 24, 8).fill({ color: tones(C.chrome).shadow, alpha });
        }
      }
      return true;
    }
    case "xray": {
      // The X-ray's housing around the belt he rides: a roof over the tunnel, a pillar at each mouth with lead strips.
      const m = tones(C.machine);
      g.rect(f.x + 50, f.y + 120, f.w - 100, f.h - 120).fill(C.tunnel);
      g.roundRect(f.x, f.y, f.w, 120, 16).fill(m.base).stroke(INK);
      g.rect(f.x, f.y + 96, f.w, 24).fill(m.shadow);
      for (const x of [f.x, f.x + f.w - 50]) g.rect(x, f.y + 100, 50, f.h - 100).fill(m.base).stroke(INK);
      for (const x of [f.x + 54, f.x + f.w - 104])
        for (let k = 0; k < 5; k++) g.rect(x + k * 10, f.y + 120, 8, 150).fill({ color: "#4a4d52", alpha: 0.85 });
      // The operator's screen on top.
      g.roundRect(f.x + f.w / 2 - 70, f.y - 90, 140, 90, 8).fill(C.screen).stroke(INK);
      g.rect(f.x + f.w / 2 - 50, f.y - 74, 100, 58).fill({ color: "#3e7cc0", alpha: 0.6 });
      return true;
    }
    case "scanner": {
      // The body scanner as a low pass: its housing down to the slide's height, a hazard edge, the "arms up" figure.
      const m = tones(C.machine);
      const low = -220;
      g.rect(f.x, low, f.w, floor - low).fill(C.tunnel);
      g.roundRect(f.x - 20, f.y, f.w + 40, low - f.y, 30).fill(m.base).stroke(INK);
      g.rect(f.x - 20, low - 24, f.w + 40, 24).fill(PALETTE.brass);
      for (let x = f.x - 10; x < f.x + f.w + 20; x += 40) g.poly([x, low - 24, x + 20, low - 24, x + 8, low, x - 12, low]).fill("#1a1a1a");
      for (const x of [f.x - 20, f.x + f.w]) g.rect(x, low, 20, floor - low).fill(m.shadow).stroke(THIN);
      // The "arms up" figure low on the housing, under the NO LIQUIDS sign.
      const cx = f.x + f.w / 2;
      const cy = f.y + 400;
      g.circle(cx, cy - 60, 22).fill(C.blue);
      g.roundRect(cx - 22, cy - 34, 44, 90, 12).fill(C.blue);
      for (const d of [-1, 1]) g.moveTo(cx + d * 18, cy - 24).lineTo(cx + d * 52, cy - 96).stroke({ width: 14, color: C.blue, cap: "round" });
      return true;
    }
    case "walkway": {
      // The walkway's black rubber handrail on glass panels, from end to end.
      g.rect(f.x + 20, f.y + 16, f.w - 40, f.h - 16).fill({ color: C.glass, alpha: 0.28 }).stroke({ ...THIN, alpha: 0.6 });
      g.roundRect(f.x, f.y, f.w, 18, 9).fill(C.rubber).stroke(THIN);
      return true;
    }
    case "departures": {
      // A column carrying the departures board: dark, its rows of flights unlit (or the sheet's sign in its place).
      const cx = f.x + f.w / 2;
      g.rect(cx - 50, f.y + 260, 100, f.h - 260).fill(tones("#d8d2c4").base).stroke(INK);
      if (pieces?.sign) {
        stand(g, pieces.sign, cx, f.y + 260, f.w);
        return true;
      }
      g.roundRect(f.x, f.y, f.w, 260, 10).fill(C.screen).stroke(INK);
      for (let y = f.y + 40; y < f.y + 240; y += 34) g.rect(f.x + 16, y, f.w - 32, 14).fill({ color: "#e0a83a", alpha: 0.18 });
      return true;
    }
    case "seats": {
      // Four seats from behind on one beam: the travelers' backs come with the gate's own scene.
      const seat = tones(C.seat);
      const w = f.w / 4;
      g.rect(f.x, floor - 50, f.w, 14).fill(tones(C.chrome).shadow);
      for (const x of [f.x + 30, f.x + f.w - 40]) g.rect(x, floor - 40, 10, 40).fill(tones(C.chrome).shadow);
      for (let k = 0; k < 4; k++) g.roundRect(f.x + k * w + 6, f.y, w - 12, f.h - 50, 18).fill(seat.base).stroke(INK);
      return true;
    }
    case "podium": {
      // The gate agent's podium: a navy desk with a sloped top and the gate's number.
      const p = tones(C.podium);
      const d = over ?? g;
      d.poly([f.x, f.y + 20, f.x + f.w, f.y, f.x + f.w, floor, f.x, floor]).fill(p.base).stroke(INK);
      d.rect(f.x + 30, f.y + 70, f.w - 60, 60).fill(p.highlight);
      return true;
    }
  }
  return false;
}

/** The check-in hall's end: its counters are the kiosks (the concourse's counter is the bar's top). */
const HALL_END = 3200;

/** SAT's dressing beside its platforms: a check-in kiosk behind each kiosk counter, the pretzel bag on the newsstand's shelf. */
export function drawSatDressing(back: Graphics, front: Graphics, level: Pick<Level, "platforms">, pieces: SatPieces | null): void {
  for (const p of level.platforms) {
    const w = p.x1 - p.x0;
    if (p.kind === "counter" && p.x1 <= HALL_END) {
      if (pieces?.kiosk) {
        stand(back, pieces.kiosk, (p.x0 + p.x1) / 2, 0, w);
        continue;
      }
      // A kiosk's tall body and screen standing behind the counter's top.
      const k = tones(C.kiosk);
      back.roundRect(p.x0 + w / 2 - 60, p.y - 260, 120, 260, 12).fill(k.base).stroke(INK);
      back.roundRect(p.x0 + w / 2 - 50, p.y - 240, 100, 110, 8).fill(C.screen).stroke(THIN);
      back.rect(p.x0 + w / 2 - 40, p.y - 230, 80, 40).fill({ color: "#3e7cc0", alpha: 0.7 });
    }
    if (p.kind === "shelf" && pieces?.pretzel) stand(front, pieces.pretzel, (p.x0 + p.x1) / 2 - 80, p.y, 90);
  }
}
