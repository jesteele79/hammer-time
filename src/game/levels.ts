import { GROUND_ROW, ID, MAP_H, TILE, type TileId } from "./constants";

export type Sky = "day" | "cellar";

export type EnemySpawn = { kind: "soot" | "shell"; x: number };

export type Pipe = { x: number; top: number; dest: "bonus" | "back" | null };

export type Level = {
  id: string;
  world: string;
  name: string;
  sky: Sky;
  music: Sky;
  w: number;
  h: number;
  tiles: Uint8Array;
  flagTile: number;
  castleTile: number;
  pipes: Pipe[];
  enemies: EnemySpawn[];
  deco: { x: number; y: number; k: "shrub" | "stack" }[];
  spawnX: number;
  time: number;
};

function stamp(t: Uint8Array, w: number, x: number, y: number, id: TileId) {
  if (x < 0 || y < 0 || x >= w || y >= MAP_H) return;
  t[y * w + x] = id;
}

function fillGround(w: number, pits: Array<[number, number]>): Uint8Array {
  const t = new Uint8Array(w * MAP_H);
  const open = new Set<number>();
  for (const [a, b] of pits) {
    for (let x = a; x <= b; x++) open.add(x);
  }
  for (let x = 0; x < w; x++) {
    if (open.has(x)) continue;
    t[GROUND_ROW * w + x] = ID.ground;
    t[(GROUND_ROW + 1) * w + x] = ID.ground;
  }
  return t;
}

function pipe(t: Uint8Array, w: number, tx: number, height: number, dest: Pipe["dest"], pipes: Pipe[]) {
  const top = GROUND_ROW - height;
  for (let i = 0; i < height; i++) {
    stamp(t, w, tx, top + i, ID.pipe);
    stamp(t, w, tx + 1, top + i, ID.pipe);
  }
  pipes.push({ x: tx * TILE, top: top * TILE, dest });
}

function stairs(t: Uint8Array, w: number, start: number, n: number) {
  for (let i = 0; i < n; i++) {
    const extra = i;
    for (let k = 1; k <= extra; k++) stamp(t, w, start + i, GROUND_ROW - k, ID.brick);
  }
}

function coins(t: Uint8Array, w: number, xs: number[], y: number) {
  for (const x of xs) stamp(t, w, x, y, ID.coin);
}

export function buildLevels(): { courses: Level[]; bonus: Level } {
  const hill = buildHill();
  const cellar = buildCellar();
  const bonus = buildBonus();
  return { courses: [hill, cellar], bonus };
}

function buildHill(): Level {
  const w = 176;
  const pipes: Pipe[] = [];
  const t = fillGround(w, [
    [44, 46],
    [87, 89],
    [130, 132],
  ]);
  stamp(t, w, 13, 8, ID.power);
  stamp(t, w, 16, 8, ID.brick);
  stamp(t, w, 17, 8, ID.question);
  stamp(t, w, 18, 8, ID.brick);
  stamp(t, w, 17, 5, ID.question);
  coins(t, w, [8, 9, 10], 11);
  stamp(t, w, 11, 11, ID.nut);
  coins(t, w, [22, 23, 24, 25], 7);
  stamp(t, w, 65, 11, ID.nut);
  stamp(t, w, 40, 8, ID.treat);
  stamp(t, w, 30, 8, ID.hidden);
  pipe(t, w, 32, 2, null, pipes);
  for (let x = 52; x <= 57; x++) stamp(t, w, x, 8, x === 54 || x === 55 ? ID.brickCoin : ID.brick);
  stamp(t, w, 60, 5, ID.question);
  coins(t, w, [61, 62, 63], 6);
  pipe(t, w, 72, 3, "bonus", pipes);
  for (let x = 85; x <= 92; x++) stamp(t, w, x, 9, ID.ledge);
  coins(t, w, [86, 87, 88, 89, 90], 7);
  for (let x = 100; x <= 105; x++) stamp(t, w, x, 8, x === 102 ? ID.question : ID.brick);
  stamp(t, w, 102, 5, ID.hidden);
  stamp(t, w, 116, 8, ID.power);
  coins(t, w, [120, 121, 122, 123], 9);
  pipe(t, w, 124, 2, null, pipes);
  stairs(t, w, 152, 6);
  return {
    id: "hill",
    world: "1-1",
    name: "Open Office",
    sky: "day",
    music: "day",
    w,
    h: MAP_H,
    tiles: t,
    flagTile: 162,
    castleTile: 168,
    pipes,
    enemies: [
      { kind: "soot", x: 20 },
      { kind: "soot", x: 36 },
      { kind: "shell", x: 56 },
      { kind: "soot", x: 78 },
      { kind: "soot", x: 96 },
      { kind: "soot", x: 98 },
      { kind: "shell", x: 112 },
      { kind: "soot", x: 140 },
      { kind: "soot", x: 146 },
    ],
    deco: [
      { x: 6, y: GROUND_ROW, k: "shrub" },
      { x: 22, y: GROUND_ROW, k: "stack" },
      { x: 48, y: GROUND_ROW, k: "shrub" },
      { x: 68, y: GROUND_ROW, k: "stack" },
      { x: 94, y: GROUND_ROW, k: "shrub" },
      { x: 136, y: GROUND_ROW, k: "shrub" },
    ],
    spawnX: 32,
    time: 300,
  };
}

function buildCellar(): Level {
  const w = 150;
  const pipes: Pipe[] = [];
  const t = fillGround(w, [
    [36, 38],
    [72, 74],
    [108, 110],
  ]);
  for (let x = 24; x < 132; x++) {
    if ((x >= 50 && x <= 54) || (x >= 90 && x <= 94)) continue;
    stamp(t, w, x, 1, ID.brick);
    stamp(t, w, x, 2, ID.brick);
  }
  stamp(t, w, 12, 8, ID.power);
  stamp(t, w, 14, 8, ID.question);
  stamp(t, w, 15, 8, ID.brick);
  stamp(t, w, 16, 8, ID.question);
  coins(t, w, [18, 19, 20, 21], 9);
  stamp(t, w, 22, 9, ID.nut);
  stamp(t, w, 34, 8, ID.treat);
  pipe(t, w, 28, 2, null, pipes);
  for (let x = 44; x <= 48; x++) stamp(t, w, x, 8, ID.brick);
  stamp(t, w, 46, 8, ID.brickCoin);
  stamp(t, w, 46, 5, ID.hidden);
  coins(t, w, [51, 52, 53], 5);
  for (let x = 60; x <= 66; x++) stamp(t, w, x, 9, x % 2 === 0 ? ID.question : ID.brick);
  pipe(t, w, 80, 3, null, pipes);
  for (let x = 84; x <= 88; x++) stamp(t, w, x, 8, ID.ledge);
  coins(t, w, [91, 92, 93], 6);
  stamp(t, w, 94, 11, ID.nut);
  stamp(t, w, 100, 8, ID.power);
  for (let x = 102; x <= 106; x++) stamp(t, w, x, 8, ID.brick);
  coins(t, w, [118, 119, 120, 121], 9);
  stairs(t, w, 126, 5);
  return {
    id: "cellar",
    world: "1-2",
    name: "File Room",
    sky: "cellar",
    music: "cellar",
    w,
    h: MAP_H,
    tiles: t,
    flagTile: 136,
    castleTile: 142,
    pipes,
    enemies: [
      { kind: "shell", x: 22 },
      { kind: "soot", x: 42 },
      { kind: "shell", x: 58 },
      { kind: "soot", x: 68 },
      { kind: "shell", x: 96 },
      { kind: "soot", x: 104 },
      { kind: "soot", x: 120 },
    ],
    deco: [],
    spawnX: 32,
    time: 260,
  };
}

function buildBonus(): Level {
  const w = 32;
  const pipes: Pipe[] = [];
  const t = fillGround(w, []);
  for (let x = 0; x < w; x++) {
    stamp(t, w, x, 1, ID.brick);
    stamp(t, w, x, 2, ID.brick);
  }
  pipe(t, w, 2, 2, "back", pipes);
  for (let x = 6; x < 28; x++) {
    if (x % 2 === 0) {
      stamp(t, w, x, 6, ID.coin);
      stamp(t, w, x, 9, x % 6 === 0 ? ID.nut : ID.coin);
    }
  }
  stamp(t, w, 12, 8, ID.treat);
  stamp(t, w, 16, 8, ID.power);
  stamp(t, w, 20, 8, ID.question);
  return {
    id: "bonus",
    world: "1-1",
    name: "Supply Closet",
    sky: "cellar",
    music: "cellar",
    w,
    h: MAP_H,
    tiles: t,
    flagTile: -1,
    castleTile: -1,
    pipes,
    enemies: [],
    deco: [],
    spawnX: 72,
    time: 0,
  };
}
