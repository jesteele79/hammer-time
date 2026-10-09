import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Game } from "../src/game/engine.ts";
import { AudioBus } from "../src/game/audio.ts";
import { TAUNT_FILES, TauntRotation } from "../src/game/taunts.ts";
import { createHash } from "node:crypto";
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

test("provided taunts preserve their sources and use valid short PCM speech files", () => {
  const manifest = JSON.parse(readFileSync("public/voice/manifest.json", "utf8"));
  assert.equal(manifest.clips.length, 5);
  for (const clip of manifest.clips) {
    const source = readFileSync(`public${clip.source}`);
    const wav = readFileSync(`public${clip.file}`);
    assert.equal(createHash("sha256").update(source).digest("hex"), clip.sourceSha256);
    assert.equal(createHash("sha256").update(wav).digest("hex"), clip.sha256);
    assert.equal(TAUNT_FILES[clip.id], clip.file);
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.ok(clip.durationSeconds > 0.5 && clip.durationSeconds < 3);
  }
});

test("taunt bags cycle staff/student lines, allow occasional crossover and give the pig all five", () => {
  const staff = new TauntRotation(() => 0.25);
  const primary = Array.from({ length: 20 }, () => staff.next("staff"));
  for (let i = 0; i < primary.length; i += 2)
    assert.deepEqual(new Set(primary.slice(i, i + 2)), new Set(["fired", "feedback"]));
  for (let i = 1; i < primary.length; i++) assert.notEqual(primary[i], primary[i - 1]);
  const crossover = new TauntRotation(() => 0.1);
  const studentLines = new Set(["problem", "man-balls", "butt-hurt"]);
  assert.deepEqual(new Set(Array.from({ length: 3 }, () => crossover.next("staff"))), studentLines);
  const student = new TauntRotation(() => 0.25);
  assert.deepEqual(new Set(Array.from({ length: 3 }, () => student.next("student"))), studentLines);
  const pig = new TauntRotation(() => 0.25);
  const heard = Array.from({ length: 30 }, () => pig.next("pig"));
  for (let i = 0; i < heard.length; i += 5)
    assert.deepEqual(new Set(heard.slice(i, i + 5)), new Set(Object.keys(TAUNT_FILES)));
  for (let i = 1; i < heard.length; i++) assert.notEqual(heard[i], heard[i - 1]);
});

function voiceBus(random = () => 0.25) {
  const audio = new AudioBus(random),
    starts = [],
    stops = [];
  audio.ctx = {
    currentTime: 10,
    createBufferSource() {
      return {
        connect() {},
        disconnect() {},
        onended: null,
        start(at) {
          starts.push({ at, buffer: this.buffer });
        },
        stop() {
          stops.push(this.buffer);
        },
      };
    },
  };
  audio.master = { gain: { setTargetAtTime() {} } };
  audio.musicGain = {
    gain: { cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {} },
  };
  for (const id of Object.keys(TAUNT_FILES)) audio.tauntBuffers.set(id, { id, duration: 1.6 });
  audio.yellBuf = { id: "damage", duration: 1.375 };
  return { audio, starts, stops };
}

test("taunts are occasional, spaced, never overlap or queue; damage immediately interrupts them", () => {
  const { audio, starts, stops } = voiceBus();
  assert.ok(audio.taunt("staff"));
  assert.equal(starts.length, 1);
  assert.equal(audio.voiceCount, 0, "taunts do not count as damage");
  assert.equal(audio.taunt("pig"), null, "busy voice cannot overlap");
  audio.curse();
  assert.equal(stops.length, 1, "damage cuts off the taunt");
  assert.equal(starts[1].buffer.id, "damage");
  assert.equal(starts[1].at, audio.ctx.currentTime, "no damage delay");
  assert.equal(audio.voiceCount, 1);
  audio.yellSrc.onended();
  audio.ctx.currentTime = 12;
  assert.equal(audio.taunt("student"), null, "cooldown also protects the damage reaction");
  audio.ctx.currentTime = 14;
  assert.ok(audio.taunt("student"));
  audio.setMuted(true);
  assert.equal(stops.length, 2);
  audio.ctx.currentTime = 20;
  assert.equal(audio.taunt("pig"), null);
  audio.setMuted(false);
  assert.ok(audio.taunt("pig"));
  audio.stopVoice();
  assert.equal(stops.length, 3, "pause/stop ends a taunt");
  const skipped = voiceBus(() => 0.99);
  for (let i = 0; i < 30; i++) {
    skipped.audio.ctx.currentTime += 5;
    assert.equal(skipped.audio.taunt("staff"), null);
  }
  assert.equal(skipped.starts.length, 0, "a failed chance never schedules later speech");
});

test("only actual staff bonks, student encounters/swats and accepted pig hits offer taunts", () => {
  const g = game(),
    offered = [];
  g.audio.taunt = (target) => offered.push(target);
  g.swing = 0.19;
  const head = heroMallet(g.heroPose());
  g.tryHammer();
  assert.deepEqual(offered, [], "empty swings do not speak");
  for (const role of ["office", "server", "hotel"]) {
    g.hammerVictims.clear();
    g.enemies = [
      {
        ...g.courses[0].enemies[0],
        role,
        kind: "soot",
        state: "walk",
        alive: true,
        x: head.x - 4,
        y: head.y - 4,
        w: 8,
        h: 8,
        vx: 0,
        vy: 0,
      },
    ];
    g.tryHammer();
    g.tryHammer();
  }
  assert.deepEqual(offered, ["staff", "staff", "staff"], "one opportunity per target per swing");
  g.enemies = [];
  const student = g.students[0];
  g.player.x = student.x - 20;
  g.stepStudents(1 / 60);
  g.stepStudents(1 / 60);
  assert.equal(offered.at(-1), "student");
  const swatHead = heroMallet(g.heroPose());
  g.planes = [{ x: swatHead.x, y: swatHead.y, life: 3 }];
  g.tryHammer();
  assert.equal(offered.filter((x) => x === "student").length, 2);
  const boss = bossGame(),
    bossOffers = [];
  boss.audio.taunt = (target) => bossOffers.push(target);
  assert.ok(boss.hitBoss("bonk", 1, 0, 0));
  assert.equal(boss.hitBoss("snot", 1, 0, 0), false);
  boss.boss.hurt = 0;
  assert.ok(boss.hitBoss("snot", 1, 0, 0));
  assert.deepEqual(bossOffers, ["pig", "pig"]);
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
test("all three extended routes are traversable with staff active and three lives", () => {
  const g = game();
  g.courses = g.courses.filter((level) => !level.boss);
  // Isolate route geometry and staff collisions; timed paper defense has separate tests.
  const load = g.loadLevel;
  g.loadLevel = function (...args) {
    load.apply(this, args);
    this.students = [];
  };
  g.students = [];
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
      const pass = g.level.props.some(
        (prop) =>
          prop.kind === "pass" && p.x + p.w + 20 > prop.x * 16 && p.x < (prop.x + prop.w) * 16,
      );
      if (pass && p.y + p.h > 160) g.actions.down = true;
      const tx = Math.floor((p.x + p.w + 35) / 16);
      const pit = g.tileAt(Math.floor((p.x + p.w + 18) / 16), 12) === ID.empty;
      const obstacle = [9, 10, 11].some(
        (y) => g.tileAt(tx, y) === ID.pipe || g.tileAt(tx, y) === ID.brick,
      );
      const enemy = g.enemies.some(
        (e) => e.alive && e.state !== "flat" && e.x > p.x && e.x - p.x < 65,
      );
      const paper = g.planes.some((plane) => plane.x > p.x && plane.x - p.x < 85 && plane.vx < 0);
      const headBlocked = g.overlapsSolid(p.x, p.y - 16, p.w, 16);
      if (
        p.onGround &&
        !pass &&
        (pit || obstacle || enemy || paper || Math.abs(p.vx) < 5) &&
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
      const safeToWipe = Array.from({ length: 12 }, (_, i) => Math.floor(p.x / 16) + i).every(
        (x) => g.tileAt(x, 12) !== ID.empty,
      );
      if (g.heat > 65 && p.onGround && !nearby && safeToWipe && !pass) g.towelEdge = true;
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
  for (const level of buildLevels().courses.filter((level) => !level.boss)) {
    for (const pass of level.props.filter((prop) => prop.kind === "pass")) {
      const g = game();
      g.loadLevel(level, 2, 0, true);
      g.enemies = [];
      g.students = [];
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
  }
});

test("shelf paths can be climbed through physics to bump every high supply case", () => {
  for (const level of buildLevels().courses.filter((level) => !level.boss)) {
    const shelves = level.props.filter((p) => p.kind === "shelf");
    for (let pair = 0; pair < shelves.length; pair += 2) {
      const g = game();
      g.loadLevel(level, 2, 0, true);
      g.enemies = [];
      g.students = [];
      const lower = shelves[pair],
        upper = shelves[pair + 1];
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
      for (let frame = 0; frame < 180 && p.x < tx * 16 - 2; frame++) g.step(1 / 60);
      assert.ok(p.x >= tx * 16 - 2, level.id + " supply approach is clear");
      g.actions = {};
      for (let frame = 0; frame < 15; frame++) g.step(1 / 60);
      p.jumpBuf = 0.12;
      for (let frame = 0; frame < 40; frame++) g.step(1 / 60);
      assert.equal(g.tileAt(tx, 2), ID.used, level.id + " high case can be hit from its shelf");
    }
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

test("hospitality staff dominate the cast; student bodies stay outside combat targets", () => {
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
  assert.equal(g.students.length, 10, "student passersby stay outside combat targets");
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

test("reward seeds vary pickups while preserving geometry, pepper and safe anchors", () => {
  const first = buildLevels(1),
    again = buildLevels(1),
    second = buildLevels(2);
  const rewards = [ID.coin, ID.nut, ID.buc];
  const geometry = (tiles) =>
    Array.from(tiles, (tile) => (rewards.includes(tile) ? ID.empty : tile));
  assert.deepEqual(first.courses[0].tiles, again.courses[0].tiles);
  assert.notDeepEqual(first.courses[0].tiles, second.courses[0].tiles);
  for (let seed = 1; seed <= 24; seed++) {
    const built = buildLevels(seed);
    for (const [index, level] of built.courses.entries()) {
      assert.deepEqual(geometry(level.tiles), geometry(first.courses[index].tiles));
      assert.equal(level.tiles[7 * level.w + 7], ID.power, "early pepper is guaranteed");
      for (const id of rewards) assert.ok(level.tiles.includes(id));
      for (let i = 0; i < level.tiles.length; i++) {
        if (!rewards.includes(level.tiles[i])) continue;
        const x = i % level.w,
          y = Math.floor(i / level.w);
        assert.ok(
          level.tiles[(y + 1) * level.w + x] === ID.ground ||
            level.tiles[(y + 2) * level.w + x] === ID.ledge,
          `seed ${seed} ${level.id} reward ${x},${y} has a floor or shelf`,
        );
      }
    }
  }
  assert.ok(first.courses[0].w >= 220 && first.courses[1].w >= 230 && first.courses[2].w >= 250);
  assert.equal(first.courses[2].students.filter((s) => s.throws).length, 10);
});

test("student paper attacks telegraph, then travel toward Hammer", () => {
  const g = game();
  g.enemies = [];
  const student = g.students[0];
  student.x = g.player.x + 70;
  student.home = student.x;
  student.throwCd = 0;
  g.students = [student];
  g.stepStudents(1 / 60);
  assert.ok(student.windup > 0);
  assert.equal(g.planes.length, 0);
  for (let i = 0; i < 20; i++) g.stepStudents(1 / 60);
  assert.equal(g.planes.length, 0, "the warning must precede the projectile");
  for (let i = 0; i < 22; i++) g.stepStudents(1 / 60);
  assert.equal(g.planes.length, 1);
  assert.ok(g.planes[0].vx < 0);
  assert.ok(student.throwCd > 3);
});

test("paper can be ducked or swatted; a body hit uses the accepted damage voice", () => {
  const g = game(),
    p = g.player;
  const plane = () => ({ x: p.x - 8, y: 156, ox: p.x - 8, oy: 156, vx: 112, life: 3, phase: 0 });
  p.onGround = true;
  g.actions = { down: true };
  g.updateStance(1 / 60);
  g.planes = [plane()];
  g.stepPlanes(0.2);
  assert.equal(g.audio.voiceCount, 0);
  g.actions = {};
  g.updateStance(1 / 60);
  g.planes = [plane()];
  g.stepPlanes(0.2);
  assert.equal(g.audio.voiceCount, 1);
  assert.equal(g.planes.length, 0);
  const swat = game();
  swat.swing = 0.19;
  const head = heroMallet(swat.heroPose());
  swat.planes = [{ x: head.x, y: head.y, ox: head.x, oy: head.y, vx: -112, life: 3, phase: 0 }];
  swat.tryHammer();
  assert.equal(swat.planes[0].life, 0);
  assert.equal(swat.score, 50);
});

function bossGame() {
  const g = game();
  g.levelIndex = 3;
  g.loadLevel(g.courses[3], 2, 0, true);
  g.player.x = g.level.boss.arenaStart * 16 + 2;
  g.player.onGround = true;
  g.stepBoss(1 / 60);
  return g;
}
function bonk(g) {
  const b = g.boss;
  b.hurt = 0;
  g.hammerBossTagged = false;
  g.hammerLast = null;
  g.player.x = b.x - 27;
  g.player.y = 146;
  g.player.h = 46;
  g.player.facing = 1;
  for (let i = 0; i <= 25; i++) {
    g.swing = 0.42 - i / 60;
    g.tryHammer();
  }
}
function snot(g) {
  const b = g.boss;
  b.hurt = 0;
  g.embers = [
    { x: b.x - 20, y: b.y + 35, ox: b.x - 20, oy: b.y + 35, vx: 280, vy: 0, life: 1, max: 1 },
  ];
  g.stepEmbers(0.1);
}

test("plush boss needs separate bonks and snots; one swing cannot drain its health", () => {
  const g = bossGame(),
    b = g.boss;
  const initialScore = g.score;
  bonk(g);
  assert.equal(b.hp, 11);
  assert.equal(b.bonks, 1);
  snot(g);
  assert.equal(b.hp, 10);
  assert.equal(b.snots, 1);
  assert.equal(g.embers.length, 0);
  for (let i = 0; i < 12; i++) bonk(g);
  assert.equal(b.hp, 1);
  assert.notEqual(b.state, "defeated", "bonks alone do not finish the plush");
  snot(g);
  assert.equal(b.hp, 1);
  snot(g);
  assert.equal(b.hp, 0);
  assert.equal(b.snots, 3);
  assert.equal(b.state, "defeated");
  assert.equal(g.score - initialScore, 3000);
});

test("boss blocks the exit, telegraphs charges and supplies recoverable pepper", () => {
  const g = bossGame(),
    b = g.boss;
  g.player.x = g.level.flagTile * 16 + 3;
  g.tryFlag();
  assert.equal(g.mode, "play");
  g.player.x = g.level.boss.arenaStart * 16 + 2;
  for (let i = 0; i < 30; i++) g.stepBoss(1 / 60);
  assert.equal(b.state, "windup");
  assert.equal(b.vx, 0);
  for (let i = 0; i < 40; i++) g.stepBoss(1 / 60);
  assert.equal(b.state, "charge");
  assert.ok(b.vx < 0);
  g.player.form = 1;
  g.stepBoss(1 / 60);
  const refill = g.items.find((item) => item.kind === "lamp");
  assert.ok(refill);
  g.player.x = refill.x;
  g.player.y = 146;
  g.collectItems();
  assert.equal(g.player.form, 2);
  assert.equal(g.checkpoint, g.level.boss.arenaStart * 16);
  b.state = "defeated";
  b.hp = 0;
  g.player.x = g.level.flagTile * 16 + 3;
  g.tryFlag();
  assert.equal(g.mode, "walkoff");
});

test("Buc-ee's contact and a super smash cannot erase the multi-hit pig", () => {
  const g = bossGame(),
    b = g.boss;
  g.star = 10;
  g.player.x = b.x;
  g.stepBoss(1 / 60);
  assert.equal(b.hp, 12);
  assert.equal(g.audio.voiceCount, 0);
  g.player.x = b.x - 20;
  g.player.y = 146;
  g.superBurst();
  assert.equal(b.hp, 10);
  assert.equal(b.bonks, 1);
  assert.notEqual(b.state, "defeated");
});

test("the pig can be defeated and exited using movement and attack controls", () => {
  const g = game();
  g.levelIndex = 3;
  g.loadLevel(g.courses[3], 1, 0, true);
  g.timeAcc = 0;
  let nextFire = 0,
    nextBonk = 0;
  for (let frame = 0; frame < 15000 && g.mode !== "win" && g.mode !== "over"; frame++) {
    g.clock += 1 / 60;
    if (g.mode === "play") {
      const p = g.player,
        b = g.boss;
      g.actions = {};
      if (b.state === "defeated") g.actions.right = true;
      else if (p.x < 132) g.actions.right = true;
      else if (p.x > 136) g.actions.left = true;
      else if (p.facing < 0) g.actions.right = true;
      if (frame >= nextFire && b.snots < 9 && b.x > p.x && p.form === 2) {
        g.fireEdge = true;
        nextFire = frame + 65;
      }
      if (frame >= nextBonk && b.x - p.x < 34 && b.snots >= 3) {
        g.hammerEdge = true;
        nextBonk = frame + 35;
      }
    }
    g.step(1 / 60);
  }
  assert.equal(
    g.mode,
    "win",
    `mode=${g.mode} hp=${g.boss.hp} bonks=${g.boss.bonks} snots=${g.boss.snots} x=${g.player.x} bossX=${g.boss.x}`,
  );
  assert.ok(g.boss.bonks >= 3 && g.boss.snots >= 3);
  assert.equal(g.lives, 3);
});
