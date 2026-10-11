import { Container, Graphics, Matrix, RenderTexture } from "pixi.js";
import type { Costume, Expression, Registry } from "../art/registry";
import { SUPER_CUT, type MoveKind } from "../sim/moves";
import { ACTIONS, ACTION_MASK, displayU, overlay } from "../sim/rig/actions";
import { CLIPS, type ClipCtx, type ClipName } from "../sim/rig/clips";
import { solve } from "../sim/rig/fk";
import { groundModeFor, groundShift, type Ground } from "../sim/rig/ground";
import type { RenderApp } from "./app";
import { createCharacter } from "./character";
import type { Particles } from "./particles";
import type { Scene } from "./scene";
import { label } from "./text";
import { TOWEL_OUT } from "./towel";

export type BoardSpec = { kind: "clips" | "heads" | "costumes" | "lobby" | "moves"; resolution?: number };
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
const MOVES: MoveKind[] = ["swing", "super", "snot", "wipe"];
const MOVE_FRAMES = 10;
/** The moves board draws Hammer this much bigger, for a closer look. */
const MOVE_SCALE = 1.5;
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
};

function cellPose(cell: Cell) {
  if (!cell.move) return CLIPS[cell.clip](cell.u, CTX);
  return overlay(CLIPS.idle(0, CTX), ACTIONS[cell.move](cell.u), ACTION_MASK[cell.move], 1);
}

/** Grounded as the game grounds it: a move stands on the floor, except the super's hop before the slam. */
function cellGround(cell: Cell): Ground {
  if (!cell.move) return groundModeFor(cell.clip, true);
  return cell.move === "super" && cell.u < SUPER_CUT[0] ? "none" : "planted";
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
  placeHero: (x: number) => void,
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
  ) => {
    const board = new Container();
    const cellW = CELL_W * scale;
    const cellH = CELL_H * scale;
    const width = cols * cellW + 150;
    const height = rows * cellH + 50;
    const bg = new Graphics().rect(0, 0, width, height).fill("#20242b");
    for (let r = 0; r <= rows; r++) bg.rect(150, 50 + r * cellH, cols * cellW, 2).fill("#343a44");
    for (let c = 0; c <= cols; c++) bg.rect(150 + c * cellW, 50, 2, rows * cellH).fill("#343a44");
    board.addChild(bg);
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
      const solved = solve(cellPose(cell), 1, cell.headScale, registry.hammer.heads.neutral!);
      const dy = groundShift(solved, cellGround(cell));
      const towel = cell.move === "wipe" && cell.u > TOWEL_OUT[0] && cell.u < TOWEL_OUT[1];
      ch.container.scale.set(scale);
      ch.container.position.set(
        150 + cell.col * cellW + cellW * 0.4,
        50 + cell.row * cellH + cellH - 32 * scale + dy * scale,
      );
      // A fresh towel hangs at its chain's rest shape: straight down from the hand.
      ch.apply(solved, cell.expression, -dy, undefined, towel);
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

  const lobby = async () => {
    const positions = [400, 1750, 5000];
    const saved = { w: scene.width, h: scene.height, x: scene.camera.x, y: scene.camera.y, target: scene.camera.target };
    const frames: string[] = [];
    scene.camera.target = null;
    scene.width = 1920;
    scene.height = 1080;
    for (const x of positions) {
      placeHero(x);
      particles.emit("dust", x - 40, 0, 12);
      particles.update(0.12);
      scene.camera.x = x + 200;
      scene.camera.y = -187;
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
          MOVES.forEach((move, i) => cells.push(...moveCells(move, CLIP_NAMES.length + i, 6)));
          const rows = [...CLIP_NAMES, ...MOVES];
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
        case "lobby":
          return lobby();
      }
    },
  };
}
