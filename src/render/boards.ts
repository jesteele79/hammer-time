import { Container, Graphics, RenderTexture } from "pixi.js";
import type { Costume, Expression, Registry } from "../art/registry";
import { CLIPS, type ClipCtx, type ClipName } from "../sim/rig/clips";
import { solve } from "../sim/rig/fk";
import type { RenderApp } from "./app";
import { createCharacter } from "./character";
import type { Particles } from "./particles";
import type { Scene } from "./scene";
import { label } from "./text";

export type BoardSpec = { kind: "clips" } | { kind: "heads" } | { kind: "costumes" } | { kind: "lobby" };
export type Boards = { render(spec: BoardSpec): Promise<string> };
declare global {
  interface Window {
    __nextBoard?: Boards;
  }
}

const CELL_H = 420;
const CELL_W = 340;
const CLIP_NAMES: ClipName[] = ["idle", "walk", "run", "jump", "fall", "land", "crouch", "slide"];
const EXPRESSIONS: Expression[] = ["neutral", "angry", "hurt", "smug", "bored", "chomp"];
const HEAD_SCALES = [0.22, 0.26, 0.3];
const COSTUMES: Costume[] = ["affliction", "scrubs", "suit", "banquet"];
const CTX: ClipCtx = { t: 0, speed: 640, vy: 0, facing: 1 };

type Cell = { col: number; row: number; clip: ClipName; u: number; costume: Costume; expression: Expression; headScale: number };

/** Contact sheets drawn off screen for the owner's sign-off, returned as PNG data URLs. */
export function createBoards(
  render: RenderApp,
  scene: Scene,
  registry: Registry,
  particles: Particles,
  placeHero: (x: number) => void,
): Boards {
  const { app } = render;

  const sheet = async (cols: number, rows: number, cells: Cell[], rowLabels: string[], colLabels: string[]) => {
    const board = new Container();
    const width = cols * CELL_W + 150;
    const height = rows * CELL_H + 50;
    const bg = new Graphics().rect(0, 0, width, height).fill("#20242b");
    for (let r = 0; r <= rows; r++) bg.rect(150, 50 + r * CELL_H, cols * CELL_W, 2).fill("#343a44");
    for (let c = 0; c <= cols; c++) bg.rect(150 + c * CELL_W, 50, 2, rows * CELL_H).fill("#343a44");
    board.addChild(bg);
    rowLabels.forEach((text, r) => {
      const t = label(text, "display", 30);
      t.position.set(16, 50 + r * CELL_H + 12);
      board.addChild(t);
    });
    colLabels.forEach((text, c) => {
      const t = label(text, "ui", 22);
      t.position.set(150 + c * CELL_W + 12, 14);
      board.addChild(t);
    });
    const characters = cells.map((cell) => {
      const ch = createCharacter(registry, cell.costume);
      const plate = registry.hammer.heads.neutral!;
      const solved = solve(CLIPS[cell.clip](cell.u, CTX), 1, cell.headScale, plate);
      ch.container.position.set(150 + cell.col * CELL_W + CELL_W / 2, 50 + cell.row * CELL_H + CELL_H - 32);
      ch.apply(solved, cell.expression, 1, 0);
      board.addChild(ch.container);
      return ch;
    });
    await Promise.all(characters.map((c) => c.ready));
    for (const [i, ch] of characters.entries()) {
      const cell = cells[i];
      ch.apply(solve(CLIPS[cell.clip](cell.u, CTX), 1, cell.headScale, registry.hammer.heads.neutral!), cell.expression, 1, 0);
    }
    return snapshot(board, width, height);
  };

  const snapshot = async (container: Container, width: number, height: number) => {
    const target = RenderTexture.create({ width, height, resolution: 1 });
    app.renderer.render({ container, target });
    const url = await app.renderer.extract.base64({ target, format: "png" });
    target.destroy(true);
    container.destroy({ children: true });
    return url;
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
      const target = RenderTexture.create({ width: 1920, height: 1080, resolution: 1 });
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
      switch (spec.kind) {
        case "clips": {
          const cells: Cell[] = [];
          CLIP_NAMES.forEach((clip, row) => {
            for (let col = 0; col < 6; col++)
              cells.push({ col, row, clip, u: col / 6, costume: "affliction", expression: "neutral", headScale: 0.26 });
          });
          return sheet(6, CLIP_NAMES.length, cells, CLIP_NAMES, [0, 1, 2, 3, 4, 5].map((i) => `u = ${(i / 6).toFixed(2)}`));
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
        case "lobby":
          return lobby();
      }
    },
  };
}
