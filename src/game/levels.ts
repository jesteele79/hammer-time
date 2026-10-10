import { GROUND_ROW, ID, MAP_H, TILE, type TileId } from "./constants";
import { STUDENT_EXCHANGES, type Line } from "./lines";
import type { QuestId } from "./quests/quest";

export type Sky = "day" | "cellar";
export type SceneTheme = "hotel" | "restaurant" | "campus";
export type EnemyRole = "server" | "hotel" | "office";
export type EnemySpawn = { kind: "soot" | "shell"; role: EnemyRole; x: number };
export type Pipe = { x: number; top: number; dest: "bonus" | "back" | null };
export type Prop = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "counter" | "shelf" | "pass" | "cart";
};
export type Sign = { x: number; label: string; note?: string };
/** A side-quest door: ↓ in front of it, on the floor, enters the quest once per run. */
export type Door = { x: number; label: string; quest: QuestId; table: string; locked?: boolean };
export type StudentSpawn = {
  x: number;
  hammer: Line;
  reply: string;
  throws?: boolean;
  delay?: number;
};
export type BossSpawn = { x: number; arenaStart: number; arenaEnd: number; hp: number };
export type Level = {
  id: string;
  world: string;
  name: string;
  theme: SceneTheme;
  sky: Sky;
  music: Sky;
  w: number;
  h: number;
  tiles: Uint8Array;
  flagTile: number;
  castleTile: number;
  pipes: Pipe[];
  enemies: EnemySpawn[];
  props: Prop[];
  signs: Sign[];
  doors: Door[];
  students: StudentSpawn[];
  deco: { x: number; y: number; k: "shrub" | "stack" }[];
  spawnX: number;
  time: number;
  checkpointTile: number;
  checkpoints: number[];
  boss: BossSpawn | null;
};

function stamp(t: Uint8Array, w: number, x: number, y: number, id: TileId) {
  if (x >= 0 && y >= 0 && x < w && y < MAP_H) t[y * w + x] = id;
}
function ground(w: number, pits: Array<[number, number]>) {
  const t = new Uint8Array(w * MAP_H);
  for (let x = 0; x < w; x++) {
    if (pits.some(([a, b]) => x >= a && x <= b)) continue;
    stamp(t, w, x, GROUND_ROW, ID.ground);
    stamp(t, w, x, GROUND_ROW + 1, ID.ground);
  }
  return t;
}
function furniture(level: Level, x: number, y: number, w: number, h: number, kind: Prop["kind"]) {
  level.props.push({ x, y, w, h, kind });
  for (let tx = x; tx < x + w; tx++)
    for (let ty = y; ty < y + h; ty++)
      stamp(level.tiles, level.w, tx, ty, kind === "shelf" ? ID.ledge : ID.used);
}
function cans(level: Level, xs: number[], y: number) {
  xs.forEach((x) => stamp(level.tiles, level.w, x, y, ID.coin));
}
function supply(level: Level, x: number, y: number, id: TileId) {
  stamp(level.tiles, level.w, x, y, id);
}
function stashDoor(level: Level, x: number, dest: Pipe["dest"]) {
  for (let tx = x; tx < x + 2; tx++)
    for (let y = 10; y < 12; y++) stamp(level.tiles, level.w, tx, y, ID.pipe);
  level.pipes.push({ x: x * TILE, top: 10 * TILE, dest });
  level.props.push({ x, y: 10, w: 2, h: 2, kind: "cart" });
}
function base(
  id: string,
  name: string,
  theme: SceneTheme,
  w: number,
  pits: Array<[number, number]>,
  world: string,
): Level {
  return {
    id,
    world,
    name,
    theme,
    sky: "day",
    music: "day",
    w,
    h: MAP_H,
    tiles: ground(w, pits),
    flagTile: w - 10,
    castleTile: w - 6,
    pipes: [],
    enemies: [],
    props: [],
    signs: [],
    doors: [],
    students: [],
    deco: [],
    spawnX: 32,
    time: 420,
    checkpointTile: 60,
    checkpoints: [60],
    boss: null,
  };
}
function door(level: Level, x: number, label: string, quest: QuestId, table: string) {
  level.doors.push({ x, label, quest, table });
}
function staff(level: Level, x: number, role: EnemyRole) {
  level.enemies.push({ x, role, kind: role === "hotel" ? "shell" : "soot" });
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRewards(level: Level, rng: () => number, stash = false) {
  for (let i = 0; i < level.tiles.length; i++) {
    if (
      [ID.coin, ID.nut, ID.buc].includes(level.tiles[i] as never) ||
      (!stash && level.tiles[i] === ID.treat)
    )
      level.tiles[i] = ID.empty;
  }
  const anchors: Array<[number, number]> = [];
  for (let x = 8; x < level.w - 10; x += 2) {
    if (
      level.tiles[12 * level.w + x] !== ID.ground ||
      level.tiles[11 * level.w + x] !== ID.empty ||
      level.tiles[10 * level.w + x] !== ID.empty
    )
      continue;
    anchors.push([x, 11]);
  }
  for (const shelf of level.props.filter((p) => p.kind === "shelf")) {
    for (let x = shelf.x + 1; x < shelf.x + shelf.w; x += 2)
      if (level.tiles[(shelf.y - 2) * level.w + x] === ID.empty) anchors.push([x, shelf.y - 2]);
  }
  for (let i = anchors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [anchors[i], anchors[j]] = [anchors[j], anchors[i]];
  }
  const count = Math.min(anchors.length, stash ? 10 : level.boss ? 8 : Math.ceil(level.w / 5));
  const nuts = stash || level.boss ? 2 : 7;
  const treats = level.boss ? 1 : stash ? 1 : 3;
  for (let i = 0; i < count; i++) {
    const [x, y] = anchors[i];
    supply(level, x, y, i < treats ? ID.buc : i < treats + nuts ? ID.nut : ID.coin);
  }
}

function students(level: Level, xs: number[], rng: () => number) {
  level.students = xs.map((x, i) => {
    const { hammer, reply } = STUDENT_EXCHANGES[i % STUDENT_EXCHANGES.length];
    return { x, hammer, reply, throws: true, delay: 2 + rng() * 3 };
  });
}

export function buildLevels(seed = 0xc0ffee): { courses: Level[]; bonus: Level } {
  const rng = seededRandom(seed);
  // Normal supplies leave 64px below them: 50px artwork plus breathing room.
  // Service passes deliberately leave 32px for the 30px crouching collider.
  const lobby = base(
    "lobby",
    "Lobby & Lunch Rush",
    "hotel",
    224,
    [
      [36, 38],
      [120, 122],
      [178, 180],
    ],
    "1-1",
  );
  supply(lobby, 7, 7, ID.power);
  cans(lobby, [9, 10, 11], 10);
  supply(lobby, 12, 11, ID.nut);
  staff(lobby, 18, "server");
  furniture(lobby, 24, 10, 5, 2, "counter");
  supply(lobby, 31, 7, ID.treat);
  cans(lobby, [36, 37, 38], 7);
  furniture(lobby, 47, 9, 5, 1, "pass");
  cans(lobby, [48, 49, 50, 51], 11);
  staff(lobby, 56, "hotel");
  supply(lobby, 61, 11, ID.nut);
  furniture(lobby, 67, 9, 3, 1, "shelf");
  furniture(lobby, 72, 7, 4, 1, "shelf");
  supply(lobby, 74, 2, ID.question);
  cans(lobby, [68, 69], 7);
  staff(lobby, 82, "office");
  supply(lobby, 84, 11, ID.brickCoin);
  stashDoor(lobby, 89, "bonus");
  supply(lobby, 96, 7, ID.power);
  staff(lobby, 99, "server");
  lobby.signs = [
    { x: 3, label: "LOBBY", note: "! supplies · jump + hammer" },
    { x: 23, label: "FRONT DESK", note: "Jump the counter" },
    { x: 44, label: "SERVICE PASS", note: "Run + ↓ to slide" },
    { x: 66, label: "UPSTAIRS", note: "Use the two shelves" },
    { x: 88, label: "STAFF STASH", note: "Jump on cart · ↓" },
  ];
  lobby.deco = [
    { x: 14, y: 12, k: "shrub" },
    { x: 62, y: 12, k: "shrub" },
  ];
  furniture(lobby, 110, 10, 4, 2, "counter");
  door(lobby, 115, "BUFFET", "hungry", "banquet");
  furniture(lobby, 136, 9, 6, 1, "pass");
  furniture(lobby, 154, 9, 3, 1, "shelf");
  furniture(lobby, 159, 7, 4, 1, "shelf");
  supply(lobby, 161, 2, ID.question);
  furniture(lobby, 188, 10, 5, 2, "counter");
  furniture(lobby, 204, 9, 5, 1, "pass");
  staff(lobby, 128, "server");
  staff(lobby, 171, "hotel");
  staff(lobby, 197, "server");
  students(lobby, [32, 63, 104, 168], rng);
  lobby.checkpoints = [60, 146];
  lobby.signs.push(
    { x: 106, label: "CONFERENCE WING", note: "Watch for paper airplanes" },
    { x: 133, label: "SERVICE TUNNEL", note: "Hold ↓ through the opening" },
    { x: 153, label: "LUGGAGE STORAGE", note: "Shelves lead to supplies" },
  );

  const service = base(
    "service",
    "Restaurant Service",
    "restaurant",
    236,
    [
      [39, 41],
      [91, 93],
      [143, 145],
      [201, 203],
    ],
    "1-2",
  );
  supply(service, 7, 7, ID.power);
  staff(service, 16, "server");
  furniture(service, 23, 10, 4, 2, "counter");
  supply(service, 31, 7, ID.question);
  supply(service, 34, 11, ID.nut);
  supply(service, 35, 7, ID.treat);
  cans(service, [39, 40, 41], 7);
  furniture(service, 49, 9, 5, 1, "pass");
  cans(service, [50, 51, 52], 11);
  staff(service, 58, "hotel");
  service.checkpointTile = 65;
  supply(service, 66, 11, ID.nut);
  furniture(service, 71, 9, 3, 1, "shelf");
  furniture(service, 76, 7, 4, 1, "shelf");
  supply(service, 78, 2, ID.question);
  staff(service, 85, "server");
  supply(service, 87, 11, ID.brick);
  cans(service, [91, 92, 93], 7);
  supply(service, 98, 7, ID.power);
  staff(service, 105, "hotel");
  service.signs = [
    { x: 3, label: "LUNCH RUSH", note: "Servers rush after a warning" },
    { x: 22, label: "KITCHEN COUNTER", note: "Clear jump space" },
    { x: 46, label: "UNDER THE PASS", note: "Hold ↓ to stay low" },
    { x: 70, label: "DRY STORAGE", note: "Shelves lead to supplies" },
  ];
  service.deco = [
    { x: 12, y: 12, k: "stack" },
    { x: 68, y: 12, k: "stack" },
  ];
  furniture(service, 121, 10, 4, 2, "counter");
  furniture(service, 132, 9, 6, 1, "pass");
  furniture(service, 165, 9, 3, 1, "shelf");
  furniture(service, 170, 7, 4, 1, "shelf");
  supply(service, 172, 2, ID.question);
  furniture(service, 182, 10, 5, 2, "counter");
  furniture(service, 213, 9, 6, 1, "pass");
  staff(service, 151, "server");
  staff(service, 191, "hotel");
  staff(service, 224, "server");
  students(service, [32, 68, 114, 158, 222], rng);
  service.checkpoints = [65, 155];
  service.signs.push(
    { x: 119, label: "BANQUET SERVICE", note: "Crouch or swat the paper" },
    { x: 162, label: "STOCKROOM", note: "Climb the shelf route" },
    { x: 210, label: "LAST CALL", note: "Hold ↓ through the tunnel" },
  );

  const campus = base(
    "campus",
    "Campus Dining Commons",
    "campus",
    256,
    [
      [37, 39],
      [84, 86],
      [130, 132],
      [194, 196],
    ],
    "1-3",
  );
  supply(campus, 7, 7, ID.power);
  supply(campus, 12, 11, ID.nut);
  campus.students = [17, 62, 96].map((x, i) => ({ x, ...STUDENT_EXCHANGES[i] }));
  staff(campus, 24, "server");
  furniture(campus, 29, 10, 4, 2, "counter");
  supply(campus, 34, 7, ID.treat);
  cans(campus, [37, 38, 39], 7);
  furniture(campus, 48, 9, 5, 1, "pass");
  cans(campus, [49, 50, 51], 11);
  staff(campus, 56, "office");
  supply(campus, 64, 11, ID.nut);
  furniture(campus, 68, 9, 3, 1, "shelf");
  furniture(campus, 73, 7, 4, 1, "shelf");
  supply(campus, 75, 2, ID.question);
  supply(campus, 80, 7, ID.power);
  cans(campus, [84, 85, 86], 7);
  staff(campus, 91, "hotel");
  supply(campus, 93, 11, ID.brickCoin);
  staff(campus, 100, "server");
  campus.signs = [
    { x: 3, label: "CAMPUS COMMONS", note: "Dining staff · student banter" },
    { x: 28, label: "DINING COUNTER", note: "Students can pass safely" },
    { x: 45, label: "LOW CLEARANCE", note: "Run + ↓ to slide" },
    { x: 67, label: "BOOK STACKS", note: "Climb for extra supplies" },
  ];
  campus.deco = [
    { x: 14, y: 12, k: "shrub" },
    { x: 66, y: 12, k: "stack" },
  ];
  furniture(campus, 114, 10, 4, 2, "counter");
  furniture(campus, 141, 9, 6, 1, "pass");
  furniture(campus, 164, 9, 3, 1, "shelf");
  furniture(campus, 169, 7, 4, 1, "shelf");
  supply(campus, 171, 2, ID.question);
  furniture(campus, 183, 10, 5, 2, "counter");
  furniture(campus, 210, 9, 7, 1, "pass");
  furniture(campus, 229, 9, 3, 1, "shelf");
  furniture(campus, 234, 7, 4, 1, "shelf");
  supply(campus, 236, 2, ID.question);
  staff(campus, 135, "server");
  staff(campus, 176, "hotel");
  staff(campus, 224, "server");
  students(campus, [17, 44, 62, 96, 122, 154, 179, 202, 224, 242], rng);
  campus.checkpoints = [60, 150, 221];
  campus.signs.push(
    { x: 111, label: "STUDENT UNION", note: "Paper planes incoming" },
    { x: 138, label: "LOW CLEARANCE", note: "Run + ↓" },
    { x: 228, label: "FINALS WEEK", note: "One last climb before the pig" },
  );

  const plush = base("plush", "The Pink Menace", "campus", 42, [], "1-4");
  plush.time = 300;
  plush.checkpointTile = 5;
  plush.checkpoints = [5];
  plush.boss = { x: 24, arenaStart: 5, arenaEnd: 37, hp: 12 };
  supply(plush, 7, 7, ID.power);
  furniture(plush, 13, 9, 4, 1, "shelf");
  plush.signs = [{ x: 4, label: "THE PINK MENACE", note: "3 bonks + 3 snots minimum" }];

  const bonus = base("bonus", "Staff-Only Stash", "restaurant", 30, [], "STAFF");
  bonus.flagTile = bonus.castleTile = bonus.checkpointTile = -1;
  bonus.time = 0;
  bonus.checkpoints = [];
  bonus.spawnX = 72;
  stashDoor(bonus, 2, "back");
  for (let x = 7; x < 27; x += 2) cans(bonus, [x], 10);
  supply(bonus, 10, 11, ID.nut);
  supply(bonus, 19, 11, ID.nut);
  supply(bonus, 14, 4, ID.treat);
  supply(bonus, 21, 7, ID.power);
  furniture(bonus, 11, 9, 4, 1, "shelf");
  cans(bonus, [12, 13, 14], 7);
  bonus.signs = [{ x: 8, label: "STAFF-ONLY STASH", note: "Stock up · ↓ on return cart" }];
  for (const course of [lobby, service, campus, plush]) randomRewards(course, rng);
  randomRewards(bonus, rng, true);
  return { courses: [lobby, service, campus, plush], bonus };
}
