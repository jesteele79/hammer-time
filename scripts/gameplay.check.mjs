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
import { HERO_BODY_HEIGHT, HERO_CROUCH_HEIGHT } from "../src/game/combat.ts";

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
  for (const file of [
    "coke-zero.png",
    "coke-zero.webp",
    "nuts-bag.png",
    "nuts-bag.webp",
    "buccees-pickup.png",
    "buccees-pickup.webp",
    "towel-cloth.png",
    "towel-cloth.webp",
    "damage-voice.wav",
  ]) {
    assert.deepEqual(
      readFileSync(`public/${file}`),
      execFileSync("git", ["show", `b2cf5e9:public/${file}`], { maxBuffer: 20 * 1024 * 1024 }),
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
test("a pepper-equipped run clears all three venues with three lives", () => {
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

test("crouching preserves feet, slides through every service pass and stands only when clear", () => {
  for (const level of buildLevels().courses) {
    const g = game();
    g.loadLevel(level, 2, 0, true);
    g.enemies = [];
    const pass = level.props.find((p) => p.kind === "pass");
    const p = g.player;
    p.x = pass.x * 16 - 42;
    p.vx = 150;
    p.onGround = true;
    g.actions = { right: true, run: true, down: true };
    for (let frame = 0; frame < 20; frame++) g.step(1 / 60);
    assert.equal(p.h, HERO_CROUCH_HEIGHT);
    assert.equal(p.y + p.h, 192);
    assert.ok(p.x > pass.x * 16 && p.x < (pass.x + pass.w) * 16);
    g.actions = {};
    for (let frame = 0; frame < 25; frame++) g.step(1 / 60);
    assert.equal(p.crouch, true, "releasing Down beneath the roof must stay low");
    assert.equal(g.overlapsSolid(p.x, p.y, p.w, p.h), false);
    g.actions = { right: true };
    for (let frame = 0; frame < 110; frame++) g.step(1 / 60);
    assert.ok(p.x >= (pass.x + pass.w) * 16);
    assert.equal(p.h, HERO_BODY_HEIGHT);
    assert.equal(p.crouch, false);
  }
});

test("shelf paths can be climbed through physics to bump every high supply case", () => {
  for (const level of buildLevels().courses) {
    const g = game();
    g.loadLevel(level, 2, 0, true);
    g.enemies = [];
    g.students = [];
    const [lower, upper] = level.props.filter((p) => p.kind === "shelf");
    const p = g.player;
    p.x = lower.x * 16 - 22;
    p.vx = 96;
    p.onGround = true;
    g.actions = { right: true };
    g.jumpHeld = true;
    p.jumpBuf = 0.12;
    let landed = false;
    for (let frame = 0; frame < 80; frame++) {
      g.step(1 / 60);
      if (frame > 4 && p.onGround && Math.abs(p.y + p.h - lower.y * 16) < 0.1) {
        landed = true;
        break;
      }
    }
    assert.ok(landed, level.id + " lower shelf is reachable");
    p.jumpBuf = 0.12;
    landed = false;
    for (let frame = 0; frame < 80; frame++) {
      g.step(1 / 60);
      if (frame > 4 && p.onGround && Math.abs(p.y + p.h - upper.y * 16) < 0.1) {
        landed = true;
        break;
      }
    }
    assert.ok(landed, level.id + " upper shelf is reachable");
    const tx = upper.x + 2;
    while (p.x < tx * 16 - 2) g.step(1 / 60);
    g.actions = {};
    for (let frame = 0; frame < 15; frame++) g.step(1 / 60);
    p.jumpBuf = 0.12;
    for (let frame = 0; frame < 40; frame++) g.step(1 / 60);
    assert.equal(g.tileAt(tx, 2), ID.used, level.id + " high case can be hit from its shelf");
  }
});

test("every ordinary overhead supply has standing clearance and a reachable head bump", () => {
  for (const level of [...buildLevels().courses, buildLevels().bonus]) {
    for (let tx = 0; tx < level.w; tx++) {
      const id = level.tiles[7 * level.w + tx];
      if (![ID.power, ID.question, ID.treat].includes(id)) continue;
      const g = game();
      g.loadLevel(level, 2, 0, true);
      g.enemies = [];
      g.students = [];
      const p = g.player;
      p.x = tx * 16 + 1;
      p.onGround = true;
      g.actions = {};
      g.jumpHeld = true;
      assert.equal(g.overlapsSolid(p.x, p.y, p.w, p.h), false, level.id + " standing clearance");
      p.jumpBuf = 0.12;
      for (let frame = 0; frame < 45; frame++) g.step(1 / 60);
      assert.equal(g.tileAt(tx, 7), ID.used, level.id + " reachable supply at " + tx);
    }
  }
});

test("hospitality staff dominate the cast; servers warn before rushing and students only banter", () => {
  const built = buildLevels();
  const enemies = built.courses.flatMap((l) => l.enemies);
  assert.ok(enemies.filter((e) => e.role !== "office").length > enemies.length * 0.7);
  const g = game();
  const server = g.enemies.find((e) => e.role === "server");
  g.player.x = server.x - 70;
  server.awake = true;
  g.stepEnemies(1 / 60);
  assert.ok(server.alert > 0);
  assert.equal(server.vx, 0);
  for (let frame = 0; frame < 30; frame++) g.stepEnemies(1 / 60);
  assert.equal(Math.abs(server.vx), 62);
  g.loadLevel(built.courses[2], 2, 0, true);
  g.enemies = [];
  const student = g.students[0];
  g.player.x = student.x - 20;
  g.stepStudents(1 / 60);
  g.touchEnemies();
  assert.equal(g.heroBanter, student.hammer);
  assert.equal(student.greeted, true);
  assert.equal(g.player.form, 2);
  assert.equal(g.audio.voiceCount, 0, "student dialogue is not accepted damage");
  g.swing = 0.2;
  g.tryHammer();
  assert.equal(g.students.length, 3, "student passersby stay outside combat targets");
});

test("staff stash shelf can be climbed to reach its elevated Buc-ee's case", () => {
  const g = game();
  g.loadLevel(g.bonus, 2, 0, true);
  const shelf = g.level.props.find((p) => p.kind === "shelf");
  const p = g.player;
  p.x = shelf.x * 16 - 50;
  p.vx = 96;
  p.onGround = true;
  p.jumpBuf = 0.12;
  g.jumpHeld = true;
  g.actions = { right: true };
  let landed = false;
  for (let frame = 0; frame < 80; frame++) {
    g.step(1 / 60);
    if (frame > 4 && p.onGround && Math.abs(p.y + p.h - shelf.y * 16) < 0.1) {
      landed = true;
      break;
    }
  }
  assert.ok(landed, "bonus shelf is reachable from the floor");
  for (let frame = 0; frame < 60 && p.x < 14 * 16 - 2; frame++) g.step(1 / 60);
  g.actions = {};
  for (let frame = 0; frame < 15; frame++) g.step(1 / 60);
  assert.equal(g.overlapsSolid(p.x, p.y, p.w, p.h), false);
  p.jumpBuf = 0.12;
  for (let frame = 0; frame < 45; frame++) g.step(1 / 60);
  assert.equal(
    g.tileAt(14, 4),
    ID.used,
    `bonus reward x=${p.x} feet=${p.y + p.h} grounded=${p.onGround}`,
  );
});

test("stunned hotel staff keep their feet and cannot stand inside a service pass", () => {
  const g = game(),
    pass = g.level.props.find((p) => p.kind === "pass");
  const e = g.enemies.find((enemy) => enemy.role === "hotel");
  e.x = (pass.x + 2) * 16;
  e.y = 192 - e.h;
  e.awake = true;
  const center = e.x + e.w / 2;
  g.stun(e);
  assert.equal(e.x + e.w / 2, center);
  assert.equal(e.y + e.h, 192);
  assert.equal(g.overlapsSolid(e.x, e.y, e.w, e.h), false);
  e.wake = 4.1;
  g.enemies = [e];
  g.stepEnemies(1 / 60);
  assert.equal(e.state, "shell");
  assert.equal(e.h, 27);
  e.x = (pass.x + pass.w + 2) * 16;
  g.stepEnemies(1 / 60);
  assert.equal(e.state, "walk");
  assert.equal(e.h, 42);
  assert.equal(e.y + e.h, 192);
  assert.equal(g.overlapsSolid(e.x, e.y, e.w, e.h), false);
});
