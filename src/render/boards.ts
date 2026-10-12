import { Container, Graphics, Matrix, RenderTexture } from "pixi.js";
import type { Costume, Expression, Registry } from "../art/registry";
import { SUPER_CUT, type MoveKind } from "../sim/moves";
import { ACTIONS, ACTION_MASK, displayU, overlay } from "../sim/rig/actions";
import { CLIPS, type ClipCtx, type ClipName } from "../sim/rig/clips";
import { plantFeet } from "../sim/rig/feet";
import { solve } from "../sim/rig/fk";
import { groundModeFor, groundShift, type Ground } from "../sim/rig/ground";
import { FAR_FLOOR } from "../sim/rig/skeleton";
import type { RenderApp } from "./app";
import { createCharacter } from "./character";
import { crateLogo, drawCrate, pickupView } from "./objects";
import type { Particles } from "./particles";
import type { Scene } from "./scene";
import { label } from "./text";
import { TOWEL_OUT } from "./towel";

export type BoardSpec = { kind: "clips" | "heads" | "costumes" | "lobby" | "moves" | "acts" | "slopes" | "objects" | "stash"; resolution?: number };
export type Boards = { render(spec: BoardSpec): Promise<string> };
declare global {
  interface Window {
    __nextBoard?: Boards;
  }
}

const CELL_H = 420;
// Wide enough for the mallet held out in front; the figure stands left of center.
const CELL_W = 420;
const CLIP_NAMES: ClipName[] = ["idle", "walk", "run", "jump", "fall", "land", "crouch", "slide"];
const EXPRESSIONS: Expression[] = ["neutral", "angry", "hurt", "smug", "bored", "chomp"];
const HEAD_SCALES = [0.22, 0.26, 0.3];
const COSTUMES: Costume[] = ["affliction", "scrubs", "suit", "banquet"];
const CTX: ClipCtx = { t: 0, speed: 640, vy: 0, facing: 1 };
const MOVES: MoveKind[] = ["swing", "super", "snot", "wipe", "lecture"];
/** What he does when he is not attacking: the idle acts and taking a hit. */
const ACTS: MoveKind[] = ["watch", "tap", "hurt", "tumble"];
const MOVE_FRAMES = 10;
/**
 * The lobby frames: where he stands, where the camera looks and how wide. The desk, the sofas, the
 * shaft and the landing, the mezzanine over the floor route (its 0.88 zone), the tables, and the
 * corridor and the exit.
 */
const LOBBY_FRAMES: { x: number; y?: number; cx: number; cy?: number; zoom?: number }[] = [
  { x: 1100, y: 0, cx: 1700 },
  { x: 3250, y: -110, cx: 3700 },
  { x: 5650, y: 0, cx: 6250 },
  { x: 8300, y: -520, cx: 8700, cy: -420, zoom: 0.88 },
  { x: 12500, y: -160, cx: 13000 },
  { x: 15560, y: 0, cx: 15400 },
];
/** The moves board draws Hammer this much bigger, for a closer look. */
const MOVE_SCALE = 1.5;
/** Floors the slopes board stands him on, degrees: negative rises to the right. */
const SLOPES = [-30, -15, 0, 15, 30];
/** The slopes board's cells are this much taller, room for him and a 30-degree floor; his feet stand this far up. */
const SLOPE_TALL = 1.5;
const SLOPE_FEET = 160;
/** The GPU caps a texture side at 8192 px, so a bigger board is drawn in tiles and joined on a canvas. */
const MAX_TEXTURE = 8192;

/** A board cell: a locomotion clip at u, or a move laid over the idle hold at its drawn u. */
type Cell = {
  col: number;
  row: number;
  clip: ClipName;
  u: number;
  costume: Costume;
  expression: Expression;
  headScale: number;
  move?: MoveKind;
  facing?: 1 | -1;
  /** Stood by foot IK on a floor at this angle (degrees, negative rising to the right), drawn under him. */
  slope?: number;
};

function cellPose(cell: Cell) {
  if (!cell.move) return CLIPS[cell.clip](cell.u, CTX);
  return overlay(CLIPS.idle(0, CTX), ACTIONS[cell.move](cell.u), ACTION_MASK[cell.move], 1);
}

/** Grounded as the game grounds it: a move stands on the floor, except the super's hop before the slam. */
function cellGround(cell: Cell): Ground {
  if (!cell.move) return groundModeFor(cell.clip, true);
  if (cell.move === "super" && cell.u < SUPER_CUT[0]) return "none";
  if (cell.move === "tumble") return "body";
  return "planted";
}

const moveCells = (move: MoveKind, row: number, frames: number): Cell[] =>
  Array.from({ length: frames }, (_, col) => ({
    col,
    row,
    clip: "idle",
    u: displayU(move, col / frames),
    costume: "affliction",
    expression: "neutral",
    headScale: 0.26,
    move,
  }));

/** Contact sheets drawn off screen for the owner's sign-off, returned as PNG data URLs. */
export function createBoards(
  render: RenderApp,
  scene: Scene,
  registry: Registry,
  particles: Particles,
  /** Stands him at x, on the floor there or at `y`, and returns where his feet are. */
  placeHero: (x: number, y?: number) => number,
  /** Shows a level's visuals (null: the one he is in) without moving the game. */
  showLevel: (id: "lobby" | "stash" | null) => void = () => {},
): Boards {
  const { app } = render;

  // Twice the board's size by default: what a high-density screen shows, and sharp when zoomed.
  let resolution = 2;
  const sheet = async (
    cols: number,
    rows: number,
    cells: Cell[],
    rowLabels: string[],
    colLabels: string[],
    scale = 1,
    tall = 1,
  ) => {
    const board = new Container();
    const cellW = CELL_W * scale;
    const cellH = CELL_H * scale * tall;
    const width = cols * cellW + 150;
    const height = rows * cellH + 50;
    const bg = new Graphics().rect(0, 0, width, height).fill("#20242b");
    for (let r = 0; r <= rows; r++) bg.rect(150, 50 + r * cellH, cols * cellW, 2).fill("#343a44");
    for (let c = 0; c <= cols; c++) bg.rect(150 + c * cellW, 50, 2, rows * cellH).fill("#343a44");
    board.addChild(bg);
    const floors = new Graphics();
    board.addChild(floors);
    rowLabels.forEach((text, r) => {
      const t = label(text, "display", 30);
      t.position.set(16, 50 + r * cellH + 12);
      board.addChild(t);
    });
    colLabels.forEach((text, c) => {
      const t = label(text, "ui", 22);
      t.position.set(150 + c * cellW + 12, 14);
      board.addChild(t);
    });
    const characters = cells.map((cell) => {
      const ch = createCharacter(registry, cell.costume);
      board.addChild(ch.container);
      return ch;
    });
    await Promise.all(characters.map((c) => c.ready));
    for (const [i, ch] of characters.entries()) {
      const cell = cells[i];
      const facing = cell.facing ?? 1;
      const plate = registry.hammer.heads.neutral!;
      let pose = cellPose(cell);
      let dy: number;
      const fx = 150 + cell.col * cellW + cellW * (facing === 1 ? 0.4 : 0.6);
      const fy = 50 + cell.row * cellH + cellH - (cell.slope === undefined ? 32 : SLOPE_FEET) * scale;
      if (cell.slope === undefined) dy = groundShift(solve(pose, facing, cell.headScale, plate), cellGround(cell));
      else {
        const tan = Math.tan((cell.slope * Math.PI) / 180);
        const planted = plantFeet(pose, facing, cell.headScale, plate, "planted", (dx) => dx * tan);
        pose = planted.pose;
        dy = planted.dy;
        // The floor under him, and the far foot's line the painting's perspective puts higher.
        const lift = FAR_FLOOR * solve(pose, facing, cell.headScale, plate).scale * scale;
        const x0 = 150 + cell.col * cellW + 6;
        const x1 = x0 + cellW - 12;
        const at = (x: number) => fy + (x - fx) * tan;
        floors.moveTo(x0, at(x0) - lift).lineTo(x1, at(x1) - lift).stroke({ width: 3, color: "#5b6472" });
        floors.moveTo(x0, at(x0)).lineTo(x1, at(x1)).stroke({ width: 4, color: "#101010" });
      }
      const solved = solve(pose, facing, cell.headScale, plate);
      const towel = cell.move === "wipe" && cell.u > TOWEL_OUT[0] && cell.u < TOWEL_OUT[1];
      const watch = cell.move === "watch" && cell.u > 0.15 && cell.u < 0.85;
      ch.container.scale.set(scale);
      ch.container.position.set(fx, fy + dy * scale);
      // A fresh towel hangs at its chain's rest shape: straight down from the hand.
      ch.apply(solved, cell.expression, -dy, undefined, towel, watch, cell.move === "snot");
    }
    return snapshot(board, width, height);
  };

  const snapshot = async (container: Container, width: number, height: number) => {
    const tile = Math.floor(MAX_TEXTURE / resolution);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * resolution);
    canvas.height = Math.ceil(height * resolution);
    const ctx = canvas.getContext("2d")!;
    for (let y0 = 0; y0 < height; y0 += tile)
      for (let x0 = 0; x0 < width; x0 += tile) {
        const target = RenderTexture.create({
          width: Math.min(tile, width - x0),
          height: Math.min(tile, height - y0),
          resolution,
        });
        app.renderer.render({ container, target, transform: new Matrix().translate(-x0, -y0) });
        const part = app.renderer.extract.canvas(target) as HTMLCanvasElement;
        ctx.drawImage(part, Math.round(x0 * resolution), Math.round(y0 * resolution));
        target.destroy(true);
      }
    container.destroy({ children: true });
    return canvas.toDataURL("image/png");
  };

  /** Every pickup, every crate fresh, and every crate spent, twice their size on the dark board. */
  const objects = async () => {
    const cell = 260;
    const CRATES = ["pepper", "can", "bucees", "case"] as const;
    const crate = (i: number, used: boolean) => {
      const c = new Container();
      const logo = used ? null : crateLogo(CRATES[i]);
      c.addChild(drawCrate(new Graphics(), CRATES[i], used, used ? 3 : 0, !logo));
      if (logo) c.addChild(logo);
      return c;
    };
    const rows: [string, (i: number) => Container, string[]][] = [
      ["pickups", (i) => pickupView((["can", "nuts", "bucees", "pepper"] as const)[i]), ["Coke Zero", "Mixed nuts", "Buc-ee's", "Pepper"]],
      ["crates", (i) => crate(i, false), ["! pepper", "? can", "Buc-ee's", "Delivery case"]],
      ["spent", (i) => crate(i, true), ["opened", "opened", "opened", "3 cans out"]],
    ];
    const width = 150 + 4 * cell;
    const height = 50 + rows.length * cell;
    const board = new Container();
    board.addChild(new Graphics().rect(0, 0, width, height).fill("#20242b"));
    rows.forEach(([name, draw, names], r) => {
      const t = label(name, "display", 30);
      t.position.set(16, 50 + r * cell + 12);
      board.addChild(t);
      names.forEach((n, c) => {
        const g = draw(c);
        g.scale.set(r === 0 ? 2 : 1.7);
        g.position.set(150 + c * cell + cell / 2, 50 + r * cell + (r === 0 ? cell / 2 + 16 : cell - 24));
        const caption = label(n, "ui", 20);
        caption.position.set(150 + c * cell + 12, 50 + r * cell + 8);
        board.addChild(g, caption);
      });
    });
    return snapshot(board, width, height);
  };

  const lobby = async (frameList = LOBBY_FRAMES, level: "lobby" | "stash" = "lobby") => {
    const saved = { w: scene.width, h: scene.height, x: scene.camera.x, y: scene.camera.y, target: scene.camera.target, zoom: scene.camera.zoom };
    const frames: string[] = [];
    scene.camera.target = null;
    scene.width = 1920;
    scene.height = 1080;
    showLevel(level);
    for (const f of frameList) {
      const y = placeHero(f.x, f.y);
      particles.emit("dust", f.x - 40, y, 12);
      particles.update(0.12);
      scene.camera.x = f.cx;
      scene.camera.y = f.cy ?? y - 187;
      scene.camera.zoom = f.zoom ?? 1;
      scene.fit();
      const target = RenderTexture.create({ width: 1920, height: 1080, resolution });
      app.renderer.render({ container: app.stage, target });
      frames.push(await app.renderer.extract.base64({ target, format: "png" }));
      target.destroy(true);
    }
    scene.width = saved.w;
    scene.height = saved.h;
    scene.camera.x = saved.x;
    scene.camera.y = saved.y;
    scene.camera.target = saved.target;
    scene.camera.zoom = saved.zoom;
    showLevel(null);
    scene.fit();
    return frames.join("\n");
  };

  return {
    async render(spec) {
      resolution = spec.resolution ?? 2;
      switch (spec.kind) {
        case "clips": {
          // The locomotion clips, then each move as the game draws it over the idle hold.
          const cells: Cell[] = [];
          CLIP_NAMES.forEach((clip, row) => {
            for (let col = 0; col < 6; col++)
              cells.push({ col, row, clip, u: col / 6, costume: "affliction", expression: "neutral", headScale: 0.26 });
          });
          [...MOVES, ...ACTS].forEach((move, i) => cells.push(...moveCells(move, CLIP_NAMES.length + i, 6)));
          const rows = [...CLIP_NAMES, ...MOVES, ...ACTS];
          return sheet(6, rows.length, cells, rows, [0, 1, 2, 3, 4, 5].map((i) => `u = ${(i / 6).toFixed(2)}`));
        }
        case "heads": {
          const cells: Cell[] = [];
          HEAD_SCALES.forEach((headScale, row) => {
            EXPRESSIONS.forEach((expression, col) =>
              cells.push({ col, row, clip: "idle", u: 0, costume: "affliction", expression, headScale }),
            );
          });
          return sheet(EXPRESSIONS.length, HEAD_SCALES.length, cells, HEAD_SCALES.map((s) => `head ${s}`), EXPRESSIONS);
        }
        case "costumes": {
          const cells: Cell[] = [];
          COSTUMES.forEach((costume, col) => {
            cells.push({ col, row: 0, clip: "idle", u: 0, costume, expression: "neutral", headScale: 0.26 });
            cells.push({ col, row: 1, clip: "run", u: 0.25, costume, expression: "neutral", headScale: 0.26 });
          });
          return sheet(COSTUMES.length, 2, cells, ["idle", "run"], COSTUMES);
        }
        case "moves": {
          // Each move as the game draws it, closer up: the strike's cut skips the frames over his head.
          const cells = MOVES.flatMap((move, row) => moveCells(move, row, MOVE_FRAMES));
          const heads = Array.from({ length: MOVE_FRAMES }, (_, i) => `u = ${(i / MOVE_FRAMES).toFixed(2)}`);
          return sheet(MOVE_FRAMES, MOVES.length, cells, MOVES, heads, MOVE_SCALE);
        }
        case "acts": {
          const cells = ACTS.flatMap((move, row) => moveCells(move, row, MOVE_FRAMES));
          const heads = Array.from({ length: MOVE_FRAMES }, (_, i) => `u = ${(i / MOVE_FRAMES).toFixed(2)}`);
          return sheet(MOVE_FRAMES, ACTS.length, cells, ACTS, heads, MOVE_SCALE);
        }
        case "slopes": {
          // Standing and mid-stride on each floor, facing right then left: foot IK at work.
          const cells: Cell[] = [];
          const rows: [ClipName, number, 1 | -1, string][] = [
            ["idle", 0, 1, "idle R"],
            ["walk", 0.25, 1, "walk R"],
            ["idle", 0, -1, "idle L"],
            ["walk", 0.25, -1, "walk L"],
          ];
          rows.forEach(([clip, u, facing], row) =>
            SLOPES.forEach((slope, col) =>
              cells.push({ col, row, clip, u, costume: "affliction", expression: "neutral", headScale: 0.26, facing, slope }),
            ),
          );
          const heads = SLOPES.map((d) => (d === 0 ? "flat" : `${d < 0 ? "up" : "down"} ${Math.abs(d)} deg`));
          return sheet(SLOPES.length, rows.length, cells, rows.map((r) => r[3]), heads, 1, SLOPE_TALL);
        }
        case "lobby":
          return lobby();
        case "objects":
          return objects();
        case "stash":
          return lobby([{ x: 1300, y: -330, cx: 1500, cy: -420 }], "stash");
      }
    },
  };
}
