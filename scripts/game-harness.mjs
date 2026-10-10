import { Game } from "../src/game/engine.ts";
import { buildLevels } from "../src/game/levels.ts";

/** A Game built without a canvas: private methods are called directly by the checks. */
export function game() {
  const g = Object.create(Game.prototype);
  Object.assign(g, {
    mode: "play",
    star: 0,
    charge: 0,
    score: 0,
    coins: 0,
    lives: 3,
    heat: 0,
    checkpoint: 0,
    hurtT: 0,
    curse: 0,
    shake: 0,
    swing: 0,
    superT: 0,
    wipe: 0,
    nose: 0,
    snotT: 0,
    fireCd: 0,
    snotFired: false,
    hitstop: 0,
    levelIndex: 0,
    reduce: false,
    snap: null,
    camX: 0,
    clock: 0,
    bumps: new Map(),
    bits: [],
    sheets: [],
    texts: [],
    embers: [],
    splashes: [],
    enemies: [],
    items: [],
    hammerVictims: new Set(),
    hammerBlocks: new Set(),
    actions: {},
    hooks: { onRecord() {} },
    // Class field initializers do not run under Object.create.
    spentDoors: new Set(),
    quest: null,
    questInfo: null,
    questResult: null,
    cardNext: "play",
    audio: new Proxy(
      {
        voiceCount: 0,
        curse() {
          this.voiceCount++;
        },
      },
      {
        get(t, k) {
          return k in t ? t[k] : () => {};
        },
      },
    ),
  });
  const built = buildLevels();
  g.courses = built.courses;
  g.bonus = built.bonus;
  g.loadLevel(built.courses[0], 1, 0, true);
  return g;
}

export function bossGame() {
  const g = game();
  g.levelIndex = 3;
  g.loadLevel(g.courses[3], 2, 0, true);
  g.player.x = g.level.boss.arenaStart * 16 + 2;
  g.player.onGround = true;
  g.stepBoss(1 / 60);
  return g;
}
