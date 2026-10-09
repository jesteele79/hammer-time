import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Game } from "../src/game/engine.ts";
import { AudioBus } from "../src/game/audio.ts";
import { hammerPose, malletInArtwork, sweptHeadHits } from "../src/game/combat.ts";
import { heroMallet, artworkToWorld } from "../src/game/hero.ts";
import { buildLevels } from "../src/game/levels.ts";
import { ID } from "../src/game/constants.ts";

function game() {
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
test("locked character files and source voice stay byte-for-byte unchanged", () => {
  for (const file of [
    "hero-idle-calm.png",
    "hero-body.png",
    "hero-upper.png",
    "hero-fore.png",
    "hero-hand.png",
    "hero-reach.png",
    "absolute-bullshit.mp3",
  ]) {
    assert.deepEqual(
      readFileSync(`public/${file}`),
      execFileSync("git", ["show", `ff02ee9:public/${file}`], { maxBuffer: 20 * 1024 * 1024 }),
    );
  }
});
test("mallet collision follows drawing joints and mirrors with facing", () => {
  const p = {
    x: 100,
    foot: 192,
    facing: 1,
    phase: 0,
    moving: false,
    reduced: false,
    mega: 0,
    swing: 0.21,
  };
  const angles = hammerPose(0.5),
    source = malletInArtwork(angles.s, angles.e);
  assert.deepEqual(heroMallet(p), artworkToWorld(p, source));
  const left = heroMallet({ ...p, facing: -1 }),
    right = heroMallet(p);
  assert.ok(Math.abs(left.x + right.x - 200) < 1e-9);
  assert.equal(left.y, right.y);
  assert.ok(sweptHeadHits({ x: 0, y: 10 }, { x: 100, y: 10 }, 4, { x: 48, y: 6, w: 5, h: 8 }));
  assert.equal(
    sweptHeadHits({ x: 0, y: 0 }, { x: 100, y: 0 }, 4, { x: 48, y: 6, w: 5, h: 8 }),
    false,
  );
});
test("damage voice starts once per accepted damage; immunity and boost stay silent", () => {
  const g = game(),
    source = { x: g.player.x + 20, w: 14 };
  g.hurt(source);
  assert.equal(g.audio.voiceCount, 1);
  assert.equal(g.player.form, 0);
  assert.equal(g.mode, "play");
  g.hurt(source);
  assert.equal(g.audio.voiceCount, 1);
  g.player.invuln = 0;
  g.star = 2;
  g.hurt(source);
  assert.equal(g.audio.voiceCount, 1);
  g.star = 0;
  g.hurt(source);
  assert.equal(g.audio.voiceCount, 2);
  assert.equal(g.mode, "die");
  g.hurt(source);
  assert.equal(g.audio.voiceCount, 2);
});
test("decoded voice starts at current audio time with no timer or fetch at contact", () => {
  const a = new AudioBus(),
    starts = [];
  a.ctx = {
    currentTime: 4.25,
    createBufferSource() {
      return {
        connect() {},
        disconnect() {},
        start(at) {
          starts.push(at);
        },
        stop() {},
        onended: null,
      };
    },
  };
  a.master = { gain: { setTargetAtTime() {} } };
  a.yellBuf = { duration: 1.375 };
  a.musicGain = { gain: { cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {} } };
  a.curse();
  assert.deepEqual(starts, [4.25]);
  assert.equal(a.voiceCount, 1);
  assert.equal(a.lastVoiceAt, 4.25);
  a.setMuted(true);
  a.curse();
  assert.equal(a.voiceCount, 1);
});
test("checkpoint death respawns safely and preserves run score", () => {
  const g = game();
  g.checkpoint = 64 * 16;
  g.score = 900;
  g.mode = "die";
  g.resolveDeath();
  assert.equal(g.player.x, 1024);
  assert.equal(g.score, 900);
  assert.equal(g.lives, 2);
  assert.equal(g.mode, "card");
  assert.equal(g.overlapsSolid(g.player.x, g.player.y, g.player.w, g.player.h), false);
});
test("snot cannot hit two enemies after its first contact", () => {
  const g = game();
  g.tiles.fill(ID.empty);
  g.enemies = [0, 1].map(() => ({ x: 100, y: 80, w: 14, h: 30, alive: true, state: "walk" }));
  g.embers = [{ x: 80, y: 90, vx: 600, vy: 0, life: 1, max: 1, ox: 80, oy: 90 }];
  g.stepEmbers(0.05);
  assert.equal(g.enemies.filter((e) => !e.alive).length, 1);
  assert.equal(g.embers.length, 0);
});
test("bonus room clock is safe and pickups have distinct benefits", () => {
  const g = game();
  g.level = g.bonus;
  g.timeLeft = 0;
  g.tickClock(4);
  assert.equal(g.mode, "play");
  g.heat = 70;
  g.grantZeros(1, 0, 0);
  assert.equal(g.heat, 60);
  assert.equal(g.coins, 1);
  g.grantNuts(0, 0);
  assert.equal(g.charge, 3);
  assert.equal(g.coins, 1);
  g.startTreat();
  assert.equal(g.star, 10);
});
test("a visible forward hammer strike defeats its target once and misses the rear", () => {
  const g = game();
  g.tiles.fill(ID.empty);
  g.player.onGround = true;
  const front = {
    x: g.player.x + 20,
    y: 162,
    w: 14,
    h: 30,
    alive: true,
    state: "walk",
    kind: "soot",
  };
  const rear = { ...front, x: g.player.x - 35 };
  g.enemies = [front, rear];
  for (let i = 0; i <= 25; i++) {
    g.swing = 0.42 - i / 60;
    g.tryHammer();
  }
  assert.equal(front.state, "flat");
  assert.equal(rear.state, "walk");
  assert.equal(g.charge, 1);
  assert.equal(g.score, 100);
});
test("a pepper-equipped run clears both floors with three lives", () => {
  const g = game();
  g.timeAcc = 0;
  g.clock = 0;
  g.jumpHeld = true;
  g.lives = 3;
  g.player.form = 2;
  let lastJump = -100;
  for (let frame = 0; frame < 24000 && g.mode !== "win"; frame++) {
    g.clock += 1 / 60;
    if (g.mode === "card") {
      g.mode = "play";
    }
    if (g.mode === "play") {
      const p = g.player;
      g.actions = { right: true, run: true };
      const tx = Math.floor((p.x + p.w + 35) / 16);
      const pit = g.tileAt(Math.floor((p.x + p.w + 18) / 16), 12) === ID.empty;
      const obstacle = [9, 10, 11].some(
        (y) => g.tileAt(tx, y) === ID.pipe || g.tileAt(tx, y) === ID.brick,
      );
      const enemy = g.enemies.some(
        (e) => e.alive && e.state !== "flat" && e.x > p.x && e.x - p.x < 65,
      );
      const headBlocked = g.overlapsSolid(p.x, p.y - 16, p.w, 16);
      if (
        p.onGround &&
        (pit || obstacle || enemy || Math.abs(p.vx) < 5) &&
        (!pit || !headBlocked) &&
        frame - lastJump > (pit ? 4 : 14)
      ) {
        p.jumpBuf = 0.12;
        lastJump = frame;
      }
      if (frame % 30 === 0) g.hammerEdge = true;
      if (frame % 45 === 0) g.fireEdge = true;
      const nearby = g.enemies.some(
        (e) => e.alive && e.state !== "flat" && Math.abs(e.x - p.x) < 130,
      );
      if (g.heat > 65 && p.onGround && !nearby && !pit) g.towelEdge = true;
      if (g.charge >= 10 && p.onGround && enemy && !pit) g.superEdge = true;
    }
    g.step(1 / 60);
  }
  assert.equal(
    g.mode,
    "win",
    `stuck in ${g.mode} floor=${g.level.id} x=${g.player.x} y=${g.player.y} lives=${g.lives}`,
  );
});
