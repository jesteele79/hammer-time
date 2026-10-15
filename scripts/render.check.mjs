import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldStepDown, WORK_BUDGET_MS } from "../src/render/quality.ts";
import { skinLayer, bodyScale, layerFile, turnAbout } from "../src/render/skin.ts";
import { CLIPS } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { REST_POSE } from "../src/sim/rig/skeleton.ts";
import { placeWord, wordBox } from "../src/render/words.ts";
import { hangTowel, palmTurn, towelAtFace, towelChain } from "../src/render/towel.ts";
import { ACTIONS } from "../src/sim/rig/actions.ts";
import { pose } from "../src/sim/rig/pose.ts";

test("a vsynced 60 Hz display with light work never steps down", () => {
  assert.equal(shouldStepDown({ workMs: 2, intervalMs: 16.7, refreshMs: 16.7 }), false);
  assert.equal(shouldStepDown({ workMs: 9, intervalMs: 16.8, refreshMs: 16.7 }), false);
});

test("heavy work on a frame steps down even when vsync hides it", () => {
  assert.equal(shouldStepDown({ workMs: WORK_BUDGET_MS + 0.5, intervalMs: 16.7, refreshMs: 16.7 }), true);
});

test("dropped frames step down even when the measured work is light", () => {
  assert.equal(shouldStepDown({ workMs: 4, intervalMs: 33, refreshMs: 16.7 }), true);
  assert.equal(shouldStepDown({ workMs: 4, intervalMs: 8.4, refreshMs: 8.3 }), false);
});

// A rig whose one layer is a vertex on every bone's end joint, wholly that bone's.
const cuts = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8"));
const rig = {
  version: 2,
  span: cuts.rig.sole - cuts.rig.joints.neck[1],
  root: [cuts.rig.rootX, cuts.rig.sole],
  joints: cuts.rig.joints,
  bones: cuts.rig.bones,
};
const probe = {
  positions: cuts.rig.bones.flatMap(([, c]) => cuts.rig.joints[c]),
  bones: cuts.rig.bones.flatMap((_, b) => [b, 0, 0, 0]),
  weights: cuts.rig.bones.flatMap(() => [1, 0, 0, 0]),
};
const skin = (solved) => {
  const out = new Float32Array(probe.positions.length);
  skinLayer(out, probe, rig, solved);
  return out;
};

test("at rest the skinned body is the painting, scaled to the hero and stood on the feet point", () => {
  const solved = solve(REST_POSE, -1, 0.26);
  const K = bodyScale(solved, rig);
  const out = skin(solved);
  for (let v = 0; v < probe.positions.length / 2; v++) {
    const [x, y] = [probe.positions[v * 2], probe.positions[v * 2 + 1]];
    assert.ok(Math.abs(out[v * 2] - K * (x - rig.root[0])) < 0.05, `vertex ${v} x`);
    assert.ok(Math.abs(out[v * 2 + 1] - K * (y - rig.root[1])) < 0.05, `vertex ${v} y`);
  }
});

test("the painted joints and the game's skeleton agree: every bone's end lands on its solved joint", () => {
  for (const [name, clip] of Object.entries(CLIPS))
    for (const u of [0, 0.3, 0.7])
      for (const facing of [-1, 1]) {
        const pose = clip(u, { t: 0, speed: 640, vy: 0, facing });
        const solved = solve(pose, facing, 0.26);
        const out = skin(solved);
        cuts.rig.bones.forEach(([, c], b) => {
          const j = solved.joints[c];
          const d = Math.hypot(out[b * 2] - j.x, out[b * 2 + 1] - j.y);
          assert.ok(d < 0.5, `${name} u=${u} facing ${facing}: ${c} is ${d.toFixed(2)} px off its joint`);
        });
      }
});

test("comic words slide off the face wherever the hit lands, and stay in view", () => {
  const face = { x: 500, y: 300, w: 90, h: 110 };
  const view = { x: 0, y: 0, w: 1280, h: 800 };
  for (let x = 380; x <= 720; x += 20)
    for (let y = 200; y <= 520; y += 20)
      for (const big of [false, true]) {
        const r = placeWord(wordBox(x, y, big ? 260 : 120, big), face, view);
        const hit = r.x < face.x + face.w && r.x + r.w > face.x && r.y < face.y + face.h && r.y + r.h > face.y;
        assert.ok(!hit, `word at ${x},${y} covers the face`);
        assert.ok(r.x >= view.x && r.y >= view.y && r.x + r.w <= view.x + view.w && r.y + r.h <= view.y + view.h);
      }
});

test("the towel hangs from the hand, link by link, and sags below it", () => {
  let pts = [];
  for (let i = 0; i < 120; i++) {
    const anchor = { x: 400 + Math.sin(i / 6) * 60, y: 300 + Math.cos(i / 5) * 40 };
    pts = towelChain(anchor, pts, 8, 18);
    assert.deepEqual(pts[0], anchor);
    for (let k = 1; k < pts.length; k++)
      assert.ok(Math.abs(Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y) - 18) < 1e-9, "each link is 18 long");
  }
  // Left still, it settles hanging straight down from the hand.
  for (let i = 0; i < 200; i++) pts = towelChain({ x: 0, y: 0 }, pts, 8, 18);
  assert.ok(Math.abs(pts[7].x) < 1 && pts[7].y > 18 * 7 - 1, `it hangs straight down: ${pts[7].x.toFixed(1)}, ${pts[7].y.toFixed(1)}`);
});

test("while his left hand wipes his face, the towel in it is at his face too", () => {
  for (const facing of [-1, 1]) {
    let chain = [];
    let at = 0;
    for (let k = 0; k <= 400; k++) {
      const u = k / 400;
      const solved = solve(ACTIONS.wipe(u), facing, 0.26);
      chain = hangTowel(solved, chain);
      if (u < 0.15 || u > 0.6) continue;
      const top = { x: chain[0].x * facing, y: chain[0].y };
      const f = solved.faceBox;
      if (top.x > f.x - 10 && top.x < f.x + f.w + 10 && top.y > f.y - 10 && top.y < f.y + f.h + 10) at++;
    }
    assert.ok(at > 150, `facing ${facing}: the towel is at his face for ${at} of the scrub's frames`);
  }
});

test("the shirt is drawn from its mirror when he faces right, the painting's way when he faces left", () => {
  const mesh = { positions: [], bones: [], weights: [] };
  const torso = { ...mesh, file: "t.png", variants: { mirror: "t-mirror.png" } };
  assert.equal(layerFile("torso", torso, 1), "t-mirror.png");
  assert.equal(layerFile("torso", torso, -1), "t.png");
  const arm = { ...mesh, file: "a.png", variants: { fist: "a-fist.png" } };
  assert.equal(layerFile("armNear", arm, 1), "a-fist.png", "the near hand holds the mallet either way");
  assert.equal(layerFile("armNear", arm, -1), "a-fist.png");
  assert.equal(layerFile("legNear", { ...mesh, file: "l.png" }, 1), "l.png");
});

test("the towel hand goes over his head only up at his face, and switches where it covers nothing", () => {
  for (const facing of [-1, 1]) {
    let was = false,
      over = 0;
    for (let k = 0; k <= 400; k++) {
      const s = solve(ACTIONS.wipe(k / 400), facing, 0.26);
      const now = towelAtFace(s);
      const ahead = (p) => (p.x - s.joints.neck.x) * facing >= -2;
      if (now) {
        over++;
        for (const p of [s.joints.wristFar, s.joints.handFar])
          assert.ok(ahead(p) && p.y < s.parts.head.y, `facing ${facing}, u ${(k / 400).toFixed(3)}: over his head but not up in front of his neck`);
      }
      if (now !== was) {
        // Drawn in front or behind, the hand looks the same here: it overlaps neither his head nor his shirt.
        const b = s.headBox;
        for (const p of [s.joints.wristFar, s.joints.handFar])
          assert.ok(
            p.x < b.x - 8 || p.x > b.x + b.w + 8 || p.y < b.y - 8 || p.y > b.y + b.h + 8,
            `facing ${facing}, u ${(k / 400).toFixed(3)}: the hand switches layers on top of his head`,
          );
      }
      was = now;
    }
    assert.ok(over > 150, `facing ${facing}: the hand is over his face through the wipe (${over} of 401 frames)`);
  }
});

test("turning a hand about its length mirrors it across, keeps it along, and flattens it halfway", () => {
  // A wrist at (10, 10), the hand pointing straight up; one vertex 4 to the right of the line, one on it.
  const src = new Float32Array([14, 0, 10, -5]);
  const out = new Float32Array(4);
  const at = (k) => {
    turnAbout(out, src, [0, 1], { x: 10, y: 10 }, { x: 10, y: -10 }, k);
    return [...out].map((v) => +v.toFixed(6));
  };
  assert.deepEqual(at(1), [14, 0, 10, -5], "untouched at 1");
  assert.deepEqual(at(-1), [6, 0, 10, -5], "mirrored across the line at -1");
  assert.deepEqual(at(0), [10, 0, 10, -5], "on the line at 0");
});

test("his left hand turns palm-in as it comes up to his face, smoothly, and back as it leaves", () => {
  for (const facing of [-1, 1]) {
    let prev = null,
      worst = 0;
    for (let k = 0; k <= 400; k++) {
      const u = k / 400;
      const turn = palmTurn(solve(ACTIONS.wipe(u), facing, 0.26));
      assert.ok(turn >= -1 && turn <= 1);
      if (u > 0.16 && u < 0.62) assert.equal(turn, -1, `facing ${facing}, u ${u.toFixed(3)}: palm toward his face while wiping`);
      if (prev !== null) worst = Math.max(worst, Math.abs(turn - prev));
      prev = turn;
    }
    for (const u of [0, 1]) assert.equal(palmTurn(solve(ACTIONS.wipe(u), facing, 0.26)), 1, `facing ${facing}: as painted at the hang`);
    assert.ok(worst < 0.5, `facing ${facing}: the hand turns over several frames, at most ${worst.toFixed(2)} a frame`);
  }
});

test("the torso scale widens the shirt front to back about the spine and moves nothing else", () => {
  const base = solve(REST_POSE, -1, 0.26);
  const wide = solve(pose({ torso: 1.04 }), -1, 0.26);
  const a = skin(base);
  const b = skin(wide);
  cuts.rig.bones.forEach(([p, c], v) => {
    const dx = b[v * 2] - a[v * 2];
    const dy = b[v * 2 + 1] - a[v * 2 + 1];
    if (c !== "chest" && c !== "neck") {
      assert.ok(Math.hypot(dx, dy) < 1e-6, `${p}->${c} unmoved`);
      return;
    }
    const o = base.joints[p];
    assert.ok(Math.abs(b[v * 2] - o.x - 1.04 * (a[v * 2] - o.x)) < 1e-6, `${p}->${c} widened`);
    assert.ok(Math.abs(dy) < 1e-6, `${p}->${c} no taller`);
  });
});

import { bubbleLayout } from "../src/render/bubbles.ts";

test("a thought never covers his face or its puffs, wherever he stands and whichever way he faces", () => {
  const view = { x: 0, y: 0, w: 1920, h: 1080 };
  const hit = (a, b) => a.x < b.x + b.w + 2 && a.x + a.w + 2 > b.x && a.y < b.y + b.h + 2 && a.y + a.h + 2 > b.y;
  for (const facing of [1, -1]) {
    const s = solve(CLIPS.idle(0, { t: 0, speed: 0, vy: 0, facing }), facing, 0.26);
    for (let x = 60; x <= 1860; x += 60)
      for (let y = 140; y <= 1060; y += 40)
        for (const size of [
          { w: 180, h: 70 },
          { w: 440, h: 140 },
        ]) {
          const face = { x: x + s.faceBox.x, y: y + s.faceBox.y, w: s.faceBox.w, h: s.faceBox.h };
          const crown = { x: x + s.crown.x, y: y + s.crown.y };
          const { box, puffs } = bubbleLayout(size, crown, facing, face, view);
          assert.ok(!hit(box, face), `facing ${facing} at ${x},${y}: the bubble covers the face`);
          for (const p of puffs)
            assert.ok(!hit({ x: p.x - p.r, y: p.y - p.r, w: 2 * p.r, h: 2 * p.r }, face), `facing ${facing} at ${x},${y}: a puff covers the face`);
          assert.ok(box.x >= view.x && box.x + box.w <= view.x + view.w, "in view across");
        }
  }
});

import { between } from "../src/render/interp.ts";
import { RECIPES, drift, launch } from "../src/render/particles.ts";

test("props draw between the last two steps, as Hammer does, matched by id", () => {
  const snap = (cartX, blobs) => ({ time: 0, hero: null, targets: [{ id: 1, x: cartX, y: -40 }], snot: blobs, puddles: [], cast: [], missiles: [] });
  const prev = snap(1000, [
    { id: 4, x: 0, y: 0 },
    { id: 5, x: 50, y: 0 },
  ]);
  const cur = snap(1010, [
    { id: 5, x: 60, y: -2 },
    { id: 6, x: 300, y: 10 },
  ]);
  const mid = between(prev, cur, 0.5);
  assert.equal(mid.targets[0].x, 1005);
  assert.deepEqual(
    mid.snot.map((b) => [b.id, b.x, b.y]),
    [
      [5, 55, -1],
      [6, 300, 10],
    ],
    "a new blob starts where it is born; a gone one is gone",
  );
});

test("sweat flies back off his head, away from his face, facing either way", () => {
  const face = { x: 0, y: 0, w: 34, h: 52 };
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const facing of [1, -1]) {
    const back = facing === 1 ? face.x - 8 : face.x + face.w + 8;
    for (let n = 0; n < 200; n++) {
      const p = { x: back, y: face.y + face.h * 0.25, ...launch(RECIPES.sweat, rand(), rand(), facing === -1) };
      for (let t = 0; t < 0.4; t += 1 / 120) {
        drift(p, RECIPES.sweat, 1 / 120);
        const r = RECIPES.sweat.size[0];
        const touches = p.x + r > face.x && p.x - r < face.x + face.w && p.y + r > face.y && p.y - r < face.y + face.h;
        assert.ok(!touches, `facing ${facing}: a drop crosses the face`);
      }
    }
  }
});

import { hintOf, hudKey, hudOf } from "../src/render/hud.ts";
import { createGame } from "../src/sim/game.ts";
import { emptyInput } from "../src/sim/input.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";

/** A run past its start card, him standing at x. */
const gameAt = (x = 3000, y = 0) => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  while (g.mode === "card") g.step(emptyInput());
  Object.assign(g.world.hero, { x, y });
  return g;
};

test("the HUD carries the run: score, cans, lives, the clock in whole seconds and its hurry, and clamped meters", () => {
  const g = gameAt();
  Object.assign(g.run, { score: 4200, cans: 42, time: 79.4 });
  Object.assign(g.world.hero, { heat: 140, sinus: -1, charge: 12, patience: 5 });
  const a = hudOf(g, "/art/hammer/head-three-quarter.png", true);
  assert.deepEqual([a.score, a.cans, a.lives, a.time, a.hurry, a.saved, a.world, a.venue], [4200, 42, 3, 80, true, true, "1-1", "Hotel lobby"]);
  assert.deepEqual([a.heat, a.sinus, a.charge, a.patience], [100, 0, 10, 3]);
  g.run.time = 80.2;
  assert.equal(hudOf(g, null).hurry, false, "no hurry at 81 s");
  g.level = g.levels.stash;
  const s = hudOf(g, null);
  assert.deepEqual([s.time, s.hurry, s.venue], [null, false, "Staff-only stash"], "the stash has no clock");
});

test("the HUD re-renders when what it shows changes, not on noise", () => {
  const g = gameAt();
  g.run.time = 100.4;
  const a = hudOf(g, null);
  g.run.time = 100.2;
  g.world.hero.heat = 0.3;
  assert.equal(hudKey(hudOf(g, null)), hudKey(a), "the same whole second and heat point");
  g.run.score += 200;
  assert.notEqual(hudKey(hudOf(g, null)), hudKey(a));
  assert.notEqual(hudKey(hudOf(g, null, true)), hudKey(hudOf(g, null, false)), "the checkpoint note");
});

test("the hint says the most pressing thing, the shipped hint's order without the cast", () => {
  const g = gameAt(12000);
  const h = g.world.hero;
  assert.equal(hintOf(g), "Find a ! crate for hot pepper");
  h.hot = true;
  assert.equal(hintOf(g), "Hot snot pierces · nuts charge Q super smash");
  Object.assign(h, { x: 7000, y: -253 });
  assert.equal(hintOf(g), "Up to the mezzanine · keep climbing");
  Object.assign(h, { x: 900, y: 0 });
  assert.equal(hintOf(g), "F snot rocket · jump into the ! crate for hot pepper");
  h.charge = 10;
  assert.equal(hintOf(g), "Super smash ready · Q");
  h.heat = 85;
  assert.equal(hintOf(g), "Overheated · T to towel off");
  g.run.star = 4;
  assert.equal(hintOf(g), "Buc-ee's boost · nothing can touch you");
  g.level = g.levels.stash;
  assert.equal(hintOf(g), "Staff stash · ↓ at the cart to go back");
  h.crouch = true;
  assert.equal(hintOf(g), "Stay low · release ↓ when clear to stand");
  g.level = g.levels.lobby;
  g.door = LOBBY.doors.find((d) => d.id === "staff");
  assert.equal(hintOf(g), "↓ STAFF ONLY · the stash");
  g.door = LOBBY.doors.find((d) => d.id === "buffet");
  assert.equal(hintOf(g), "↓ BUFFET · Hungry Hungry Hammer");
  g.door = LOBBY.doors.find((d) => d.id === "out");
  assert.equal(hintOf(g), "CLOCK OUT · walk in to finish your shift");
});

test("the drop hint shows on the balcony, not on the stairs or the landing, and the early hint edge is level data", () => {
  const g = gameAt(7000, -253);
  // The lecture is cooling down: with students in reach and the lecture ready, that hint would come first.
  g.world.hero.lectureCd = 5;
  assert.equal(hintOf(g), "Up to the mezzanine · keep climbing");
  Object.assign(g.world.hero, { x: 6700, y: -120 });
  assert.equal(hintOf(g), "Up to the mezzanine · keep climbing");
  Object.assign(g.world.hero, { x: 8000, y: -520 });
  assert.equal(hintOf(g), "Up on the mezzanine · ↓ + jump drops you back down");
  Object.assign(g.world.hero, { x: LOBBY.hints.early - 1, y: 0 });
  assert.equal(hintOf(g), "F snot rocket · jump into the ! crate for hot pepper");
});

import { LOOKS, recolored } from "../src/render/cast.ts";

test("the cast and the missiles draw between the last two steps, matched by id", () => {
  const npc = (x, y) => ({ id: 1001, spawn: "s", x, y, alive: true });
  const prev = { time: 0, hero: {}, targets: [], snot: [], puddles: [], cast: [npc(100, 0)], missiles: [{ id: 1, x: 0, y: 0 }] };
  const cur = { time: 1, hero: {}, targets: [], snot: [], puddles: [], cast: [npc(200, -40)], missiles: [{ id: 1, x: 100, y: -20 }, { id: 2, x: 500, y: 0 }] };
  const b = between(prev, cur, 0.25);
  assert.deepEqual([b.cast[0].x, b.cast[0].y], [125, -10]);
  assert.deepEqual([b.missiles[0].x, b.missiles[0].y, b.missiles[1].x], [25, -5, 500]);
});

test("every person has a look, taller or shorter than Hammer by the design, and a recolor changes only the top", () => {
  assert.deepEqual(Object.keys(LOOKS).sort(), ["bellhop-1", "bellhop-2", "busser-1", "cook-1", "lunch-1", "nurse", "office-1", "office-2", "prof-1", "server-1", "server-2", "student-1", "student-2"]);
  assert.deepEqual([LOOKS["bellhop-1"].height, LOOKS["server-2"].height, LOOKS["student-1"].height], [355, 360, 315]);
  const r = recolored(LOOKS["server-1"], "#7a1f2b");
  assert.equal(r.vest, "#7a1f2b");
  assert.equal(r.bottom, LOOKS["server-1"].bottom);
  assert.equal(recolored(LOOKS["student-2"], "#2a8c8a").top, "#2a8c8a");
  assert.equal(recolored(LOOKS["student-2"], null), LOOKS["student-2"]);
});

import { speechLayout } from "../src/render/bubbles.ts";

test("a speech bubble sits over its speaker's head and slides off Hammer's face", () => {
  const view = { x: 0, y: -1000, w: 1920, h: 1400 };
  const clear = speechLayout({ w: 300, h: 60 }, { x: 800, y: -500 }, { x: 100, y: -600, w: 80, h: 100 }, view);
  assert.ok(Math.abs(clear.box.x + 150 - 800) < 1 && clear.box.y + clear.box.h < -500, "centred above the crown");
  assert.ok(clear.tail.y > clear.box.y + clear.box.h - 1, "the tail hangs from the box");
  const face = { x: 760, y: -620, w: 80, h: 100 };
  const near = speechLayout({ w: 300, h: 60 }, { x: 800, y: -500 }, face, view);
  assert.ok(!(near.box.x < face.x + face.w && near.box.x + near.box.w > face.x && near.box.y < face.y + face.h && near.box.y + near.box.h > face.y), "off the face");
});

test("the hints name the cast's threats in the shipped order", () => {
  const g = gameAt(4100);
  const h = g.world.hero;
  h.facing = 1;
  g.world.missiles.push({ id: 1, kind: "plane", x: 4300, y: -200, vx: -300, vy: 0, spin: 0, life: 2, phase: 0, from: 0 });
  assert.equal(hintOf(g), "Paper incoming · duck, jump or swat with H");
  g.world.missiles.length = 0;
  g.world.targets[0] = { ...g.world.targets[0], x: 4500, vx: -650 };
  assert.equal(hintOf(g), "Runaway cart · jump it, or bonk it back");
  g.world.targets[0].vx = 0;
  const k = g.world.cast.find((n) => n.spawn === "student-rail-1");
  Object.assign(k, { x: 4400, y: 0, level: 0 });
  h.lectureCd = 0;
  assert.equal(hintOf(g), "E lectures them · schooled students stop throwing paper");
  k.x = 9000;
  g.world.puddles.push({ x: 4200, y: 0, w: 100, life: 5, max: 5, kind: "snot" });
  const s = g.world.cast.find((n) => n.spawn === "server-buffet");
  assert.equal(hintOf(g), "Staff slip on puddles · stomp or bonk them while they are down");
  g.world.puddles.length = 0;
  s.act = "windup";
  s.x = 4500;
  assert.equal(hintOf(g), "H swings the mallet · hit them with the head");
  s.act = "idle";
  s.x = 9000;
  assert.equal(hintOf(g), "Find a ! crate for hot pepper");
});

import { escalatorSteps } from "../src/render/venue.ts";

test("the escalator's steps slide down at the belt's speed and wrap round", () => {
  const seg = { x0: 1000, x1: 1900, y0: -520, y1: 0, belt: 200, kind: "escalator" };
  const a = escalatorSteps(seg, 0);
  const b = escalatorSteps(seg, 0.5);
  assert.ok(Math.abs(a.length - b.length) <= 1);
  assert.ok(Math.abs(b[0].x - (a[0].x + 100 - 60)) < 1e-6 || Math.abs(b[0].x - (a[0].x + 100)) < 1e-6, `moved ${b[0].x - a[0].x}`);
  for (const p of [...a, ...b]) {
    assert.ok(p.x >= seg.x0 - 1e-9 && p.x <= seg.x1 + 1e-9, "on the escalator");
    assert.ok(Math.abs(p.y - (seg.y0 + ((seg.y1 - seg.y0) * (p.x - seg.x0)) / (seg.x1 - seg.x0))) < 1e-9, "on its slope");
  }
  const c = escalatorSteps(seg, 0.3);
  assert.ok(Math.abs(c[0].x - a[0].x) < 1e-6, "0.3 s at 200 px/s moves a whole step: the same picture");
});

import { bob } from "../src/render/objects.ts";

test("pickups bob 10 px either way, out of step with each other", () => {
  let lo = 0, hi = 0;
  for (let t = 0; t < 3; t += 0.01) { lo = Math.min(lo, bob(t, 1)); hi = Math.max(hi, bob(t, 1)); }
  assert.ok(Math.abs(hi - 10) < 0.5 && Math.abs(lo + 10) < 0.5);
  assert.notEqual(bob(0.3, 1).toFixed(3), bob(0.3, 2).toFixed(3));
});

import { pickupNote } from "../src/render/hud.ts";

test("for two seconds after a pickup the hint line says what it just did", () => {
  assert.equal(pickupNote("can", { charge: 0 }), "Coke Zero · cooled down");
  assert.equal(pickupNote("nuts", { charge: 4 }), "Mixed nuts · smash 1 of 3");
  assert.equal(pickupNote("nuts", { charge: 8 }), "Mixed nuts · smash 2 of 3");
  assert.equal(pickupNote("nuts", { charge: 10 }), "Mixed nuts · Super Smash ready · Q");
  assert.equal(pickupNote("bucees", { charge: 0 }), "Buc-ee's · shield for 10 seconds");
  assert.equal(pickupNote("pepper", { charge: 0 }), "Pepper · extra hit and hot snot");
  const g = gameAt(12000);
  assert.equal(hudOf(g, null, false, "Coke Zero · cooled down").hint, "Coke Zero · cooled down");
  assert.equal(hudOf(g, null).hint, "Find a ! crate for hot pepper");
});

test("the snot hand goes over his head only up at his nose, and switches where it covers nothing", () => {
  for (const facing of [-1, 1]) {
    let was = false,
      over = 0;
    for (let k = 0; k <= 400; k++) {
      const s = solve(ACTIONS.snot(k / 400), facing, 0.26);
      const now = towelAtFace(s);
      if (now) over++;
      if (now !== was) {
        const b = s.headBox;
        for (const p of [s.joints.wristFar, s.joints.handFar])
          assert.ok(
            p.x < b.x - 8 || p.x > b.x + b.w + 8 || p.y < b.y - 8 || p.y > b.y + b.h + 8,
            `facing ${facing}, u ${(k / 400).toFixed(3)}: the hand switches layers on top of his head`,
          );
      }
      was = now;
    }
    assert.ok(over > 120, `facing ${facing}: the hand is up at his nose through the blow (${over} of 401 frames)`);
  }
});

test("the HUD says when he is too hot to run, when the stash is cleaned out, and flags the heat bar while it slows him", () => {
  const g = gameAt(12000);
  const h = g.world.hero;
  h.heat = 85;
  assert.equal(hintOf(g), "Overheated · T to towel off");
  h.boiled = true;
  assert.equal(hintOf(g), "Too hot to run · T to towel off");
  h.boiled = false;
  h.heat = 40;
  assert.equal(hudOf(g, null).slowed, false, "below half, full speed");
  h.heat = 60;
  assert.equal(hudOf(g, null).slowed, true, "past half, slower");
  assert.notEqual(hudKey(hudOf(g, null)), (h.heat = 40, hudKey(hudOf(g, null))));
  g.level = g.levels.stash;
  g.pickups = [{ id: 1, kind: "can", x: 0, y: 0, taken: true }];
  g.crates = [];
  assert.equal(hintOf(g), "Staff stash · cleaned out · ↓ at the cart to go back");
  g.pickups[0].taken = false;
  assert.equal(hintOf(g), "Staff stash · ↓ at the cart to go back");
});

import { cuesFor } from "../src/render/sound.ts";

test("the server's order-up ding rings with her warning, not with her rush", () => {
  assert.deepEqual(cuesFor({ type: "castWindup", id: 1, role: "server", x: 0, y: 0 }), ["sting", "ding"]);
  assert.deepEqual(cuesFor({ type: "castWindup", id: 1, role: "bellhop", x: 0, y: 0 }), ["sting"]);
  assert.ok(!cuesFor({ type: "castAttack", id: 1, role: "server", x: 0, y: 0 }).includes("ding"));
});

import { skeletonFrom } from "../src/sim/rig/skeleton.ts";

test("a body painted with its arms swung still carries every bone's end onto its solved joint, in every clip, both ways", () => {
  const a = 0.2;
  const joints = structuredClone(cuts.rig.joints);
  for (const [about, names] of [["shoulderNear", ["elbowNear", "wristNear", "knuckleNear", "handNear", "grip"]], ["shoulderFar", ["elbowFar", "wristFar", "handFar"]]]) {
    const [cx, cy] = cuts.rig.joints[about];
    for (const n of names) {
      const [x, y] = cuts.rig.joints[n];
      joints[n] = [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
    }
  }
  const turned = { ...rig, joints };
  const probe2 = { positions: cuts.rig.bones.flatMap(([, c]) => joints[c]), bones: probe.bones, weights: probe.weights };
  const skel = skeletonFrom({ joints, sole: rig.root[1], rootX: rig.root[0] });
  for (const [name, clip] of Object.entries(CLIPS))
    for (const u of [0, 0.3, 0.7])
      for (const facing of [-1, 1]) {
        const solved = solve(clip(u, { t: 0, speed: 640, vy: 0, facing }), facing, 0.26, undefined, skel);
        const out = new Float32Array(probe2.positions.length);
        skinLayer(out, probe2, turned, solved);
        cuts.rig.bones.forEach(([, c], b) => {
          const d = Math.hypot(out[b * 2] - solved.joints[c].x, out[b * 2 + 1] - solved.joints[c].y);
          assert.ok(d < 0.5, `${name} u=${u} facing ${facing}: ${c} is ${d.toFixed(2)} px off`);
        });
      }
});

import { existsSync } from "node:fs";
import { castHeadScale, castSkeleton } from "../src/render/cast-art.ts";
import { castRig, keyOut } from "./art-cut.mjs";
import { castPose } from "../src/sim/rig/cast.ts";
import { roleOf as castRoleOf } from "../src/sim/cast.ts";
import { HERO_HEIGHT } from "../src/sim/rig/skeleton.ts";

/** Every cast person painted and cut: the checks below run on each, so each new cut is held to them. */
const CAST_PEOPLE = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2", "cook-1", "busser-1", "lunch-1", "prof-1"].filter(
  (p) => existsSync(`art/incoming/cast/${p}.png`) && existsSync(`art/cuts/cast-${p}.json`),
);
const rigs = new Map();
/** A person's rig as the sync writes it (no files written), with each layer's paint. */
const cutOf = async (person) => {
  if (!rigs.has(person)) rigs.set(person, await castRig(person, await keyOut(readFileSync(`art/incoming/cast/${person}.png`)), JSON.parse(readFileSync(`art/cuts/cast-${person}.json`, "utf8"))));
  return rigs.get(person);
};
const rigOf = async (person) => (await cutOf(person)).rig;
/** The triangles of a layer's mesh whose cell holds paint: the mesh's empty border never shows. */
const paintedTriangles = (layer, rgba, W) => {
  const out = [];
  for (let i = 0; i < layer.indices.length; i += 3) {
    const a = layer.indices[i];
    const [x0, y0] = [layer.positions[a * 2], layer.positions[a * 2 + 1]];
    let paint = false;
    for (let y = Math.max(0, y0); y < y0 + 14 && !paint; y++) for (let x = Math.max(0, x0); x < Math.min(W, x0 + 14) && !paint; x++) paint = rgba[(y * W + x) * 4 + 3] > 0;
    if (paint) out.push(i);
  }
  return out;
};
/** The role the game poses each person in (the cook as the office worker, the busser as the bellhop, ...). */
const roleOf = (person) => castRoleOf(person);
/** Every act each role plays (the hidden one aside: it is drawn as a silhouette of the idle). */
const actsOf = (person) =>
  roleOf(person) === "student"
    ? ["idle", "walk", "notice", "windup", "attack", "fly", "flee", "hop", "schooled", "duck"]
    : ["idle", "walk", "notice", "windup", "attack", "recover", "chase", "return", "bumped", "fly", "down", "getup", "leave", "slide", "slip", "frozen"];
const poseOf = (person, act, t) =>
  castPose({ role: roleOf(person), act, t, speed: 300, onGround: act !== "fly" && act !== "hop", sit: false, spin: act === "fly" ? 120 : 0, hits: 0 });

test("a head share sizes a painted head: crown to neck is that share of HERO_HEIGHT, the crown at the top", async () => {
  assert.ok(CAST_PEOPLE.includes("bellhop-1"));
  for (const person of CAST_PEOPLE) {
    const rig = await rigOf(person);
    for (const share of [rig.head.share, 0.22, 0.26]) {
      const s = solve(REST_POSE, -1, castHeadScale(share, rig.head), rig.head, castSkeleton(rig));
      assert.ok(Math.abs(s.parts.head.y - s.crown.y - share * HERO_HEIGHT) < 0.5, `${person} share ${share}: ${s.parts.head.y - s.crown.y}`);
      assert.ok(Math.abs(s.crown.y + HERO_HEIGHT) < 0.5, `${person}: crown at ${s.crown.y}`);
    }
  }
});

test("every painting carries every bone's end onto its solved joint in every act, facing either way", async () => {
  for (const person of CAST_PEOPLE) {
    const rig = await rigOf(person);
    const skel = castSkeleton(rig);
    const ends = { positions: rig.bones.flatMap(([, c]) => rig.joints[c]), bones: rig.bones.flatMap((_, b) => [b, 0, 0, 0]), weights: rig.bones.flatMap(() => [1, 0, 0, 0]) };
    const out = new Float32Array(ends.positions.length);
    for (const act of actsOf(person))
      for (const t of [0.05, 0.3, 0.9])
        for (const facing of [-1, 1]) {
          const solved = solve(poseOf(person, act, t), facing, castHeadScale(0.22, rig.head), rig.head, skel);
          skinLayer(out, ends, rig, solved);
          rig.bones.forEach(([, c], b) => {
            const d = Math.hypot(out[b * 2] - solved.joints[c].x, out[b * 2 + 1] - solved.joints[c].y);
            assert.ok(d < 0.5, `${person} ${act} t=${t} facing ${facing}: ${c} is ${d.toFixed(2)} px off`);
          });
        }
  }
});

// Linear skinning stretches the paint where two bones meet in a sharp pose (Hammer's own long-sleeved suit, through these
// acts, stretches an arm's edge up to 5.8 times). What turning the arms to his stance must not do is make that worse.
test("turning a painting's arms to Hammer's stance never stretches its painted arms or torso more than the untouched painting does", async () => {
  for (const person of CAST_PEOPLE) {
    const { rig, layers, W } = await cutOf(person);
    const turned = castSkeleton(rig);
    const untouched = skeletonFrom({ joints: rig.joints, sole: rig.root[1], rootX: rig.root[0] }, []);
    for (const name of ["armNear", "armFar", "torso"]) {
      const layer = rig.layers[name];
      const tris = paintedTriangles(layer, layers[name].rgba, W);
      const out = new Float32Array(layer.positions.length);
      const worst = (skel) => {
        let w = 0;
        for (const act of actsOf(person))
          for (const t of [0.05, 0.3, 0.9]) {
            const solved = solve(poseOf(person, act, t), -1, castHeadScale(0.22, rig.head), rig.head, skel);
            skinLayer(out, layer, rig, solved);
            const K = bodyScale(solved, rig);
            for (const i of tris)
              for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
                const p = layer.indices[i + a],
                  q = layer.indices[i + b];
                const painted = K * Math.hypot(layer.positions[p * 2] - layer.positions[q * 2], layer.positions[p * 2 + 1] - layer.positions[q * 2 + 1]);
                w = Math.max(w, Math.hypot(out[p * 2] - out[q * 2], out[p * 2 + 1] - out[q * 2 + 1]) / painted);
              }
          }
        return w;
      };
      const [a, b] = [worst(turned), worst(untouched)];
      assert.ok(a <= b * 1.15, `${person} ${name}: turned, an edge stretches ${a.toFixed(2)} times; untouched, ${b.toFixed(2)}`);
      assert.ok(a <= 6, `${person} ${name}: an edge stretches ${a.toFixed(2)} times, past Hammer's suit`);
    }
  }
});

import { taperHead } from "../src/render/cast-art.ts";

test("a painted head grows above its jaw and keeps its painted neck below it, the crown landing where the solve puts it", async () => {
  for (const person of CAST_PEOPLE) {
    const rig = await rigOf(person);
    const h = rig.head;
    assert.ok(h.jaw && h.scale > 0, `${person}: the cut marks the jaw, and the plate knows its scale`);
    const [[ax, ay], [bx, by]] = h.jaw;
    const mid = [(ax + bx) / 2, (ay + by) / 2];
    // A point 5 plate px below the jaw line's middle, on the neck's side.
    let n = [-(by - ay), bx - ax];
    const len = Math.hypot(n[0], n[1]);
    n = [n[0] / len, n[1] / len];
    if ((h.crown.x - mid[0]) * n[0] + (h.crown.y - mid[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const neckPoint = [mid[0] - 5 * n[0], mid[1] - 5 * n[1]];
    const verts = [h.crown.x, h.crown.y, h.neck.x, h.neck.y, ...neckPoint];
    const same = taperHead(verts, h, 1);
    [h.crown.x - h.neck.x, h.crown.y - h.neck.y, 0, 0, neckPoint[0] - h.neck.x, neckPoint[1] - h.neck.y].forEach((v, i) =>
      assert.ok(Math.abs(same[i] - v) < 1e-6, `${person}: grown by 1 nothing moves (${i})`),
    );
    const big = taperHead(verts, h, 1.5);
    assert.ok(Math.abs(big[1] - 1.5 * (h.crown.y - h.neck.y)) < 1e-6, `${person}: the crown where a whole head 1.5 times as big would put it: ${big[1]}`);
    assert.ok(Math.abs(big[2]) < 1e-9 && Math.abs(big[3]) < 1e-9, `${person}: the neck anchor stays`);
    assert.ok(Math.abs(big[4] - (neckPoint[0] - h.neck.x)) < 1e-6 && Math.abs(big[5] - (neckPoint[1] - h.neck.y)) < 1e-6, `${person}: the neck below the jaw stays as painted`);
  }
});

import { RIM, rimFor } from "../src/render/cast-art.ts";

test("the rim light takes the nearest lamp's side, is stronger nearer it, and is gone past its reach", () => {
  const lamps = [{ x: 1000, y: -500 }, { x: 3000, y: -500 }];
  const a = rimFor(1400, -150, lamps);
  assert.equal(a.side, -1, "the lamp to his left lights his left");
  assert.equal(rimFor(2700, -150, lamps).side, 1);
  assert.ok(rimFor(1100, -150, lamps).k > a.k, "stronger nearer the lamp");
  assert.ok(a.k > 0 && a.k <= RIM.max);
  assert.equal(rimFor(1000 + RIM.reach + 10, -500, [lamps[0]]), null);
  assert.equal(rimFor(0, 0, []), null);
});

import { hatWorldWidth } from "../src/render/cast-art.ts";

test("the hat in flight is as wide as the hat on his head, grown with the head above the jaw", async () => {
  const rig = structuredClone(await rigOf("bellhop-1"));
  rig.head.hat = { x: 60, y: 20, width: 90 };
  const share = 0.22;
  const height = 355;
  const s = solve(REST_POSE, -1, castHeadScale(share, rig.head), rig.head, castSkeleton(rig));
  const own = bodyScale(s, rig) / rig.head.scale;
  const g = s.parts.head.length / rig.head.height / own;
  const h = rig.head.hat;
  const ends = taperHead([h.x - h.width / 2, h.y, h.x + h.width / 2, h.y], rig.head, g);
  const onHead = Math.hypot(ends[2] - ends[0], ends[3] - ends[1]) * own * (height / HERO_HEIGHT);
  assert.ok(Math.abs(hatWorldWidth(rig, share, height) - onHead) < 1e-6, `${hatWorldWidth(rig, share, height)} against ${onHead}`);
});

import { layerTexture } from "../src/render/skin.ts";

test("two people in one painting keep their own colors, and a recolor the art lacks falls back to the painting", () => {
  const layer = { file: "cast/server-1-torso.png", recolors: { "#7a1f2b": "cast/server-1-7a1f2b-torso.png" } };
  assert.equal(layerTexture(layer, null), "cast/server-1-torso.png");
  assert.equal(layerTexture(layer, "#7a1f2b"), "cast/server-1-7a1f2b-torso.png");
  assert.equal(layerTexture(layer, "#123456"), "cast/server-1-torso.png");
});

import { groundShift } from "../src/sim/rig/ground.ts";

test("every painting stands its near sole on the floor at rest, and in its walk the near foot both plants and lifts", async () => {
  for (const person of CAST_PEOPLE) {
    const rig = await rigOf(person);
    const skel = castSkeleton(rig);
    const near = (s) => Math.max(s.joints.toeNear.y, s.joints.heelNear.y);
    const rest = solve(REST_POSE, -1, castHeadScale(0.22, rig.head), rig.head, skel);
    assert.ok(Math.abs(near(rest) + groundShift(rest, "planted")) < 1, `${person}: the near sole ${(near(rest) + groundShift(rest, "planted")).toFixed(2)} px off the floor at rest`);
    let lowest = -Infinity,
      highest = Infinity;
    for (let i = 0; i < 40; i++) {
      const s = solve(castPose({ role: roleOf(person), act: "walk", t: i * 0.025, speed: 200, onGround: true, sit: false, spin: 0, hits: 0 }), -1, castHeadScale(0.22, rig.head), rig.head, skel);
      const y = near(s) + groundShift(s, "planted");
      lowest = Math.max(lowest, y);
      highest = Math.min(highest, y);
    }
    assert.ok(lowest >= -0.5, `${person}: the near foot never plants in the walk (closest ${lowest.toFixed(2)} px)`);
    assert.ok(highest <= -2, `${person}: the near foot never lifts in the walk (highest ${highest.toFixed(2)} px)`);
  }
});

test("a server's tray, held up for the warning and the rush, stays clear of her own face", async () => {
  for (const person of CAST_PEOPLE.filter((p) => roleOf(p) === "server")) {
    const rig = await rigOf(person);
    const skel = castSkeleton(rig);
    for (const act of ["windup", "attack"])
      for (const t of [0.1, 0.3, 0.6]) {
        const s = solve(poseOf(person, act, t), -1, castHeadScale(0.22, rig.head), rig.head, skel);
        // The tray as drawn: an ellipse 46 rest units either side of a point 10 ahead of the hand, glasses 36 up.
        const h = s.joints.handNear;
        const k = s.scale;
        const cx = h.x + s.facing * 10 * k;
        const tray = { x: cx - 46 * k, y: h.y - 36 * k, w: 92 * k, h: 36 * k };
        const f = s.faceBox;
        const hit = tray.x < f.x + f.w && tray.x + tray.w > f.x && tray.y < f.y + f.h && tray.y + tray.h > f.y;
        assert.ok(!hit, `${person} ${act} t=${t}: the tray covers her face`);
      }
  }
});

import { onScreen } from "../src/render/cast.ts";

test("the cast is drawn only near the view: inside it or within the pad, never far off it", () => {
  const view = { x: 1000, y: -1000, w: 2000, h: 1100 };
  assert.ok(onScreen(1500, 0, view));
  assert.ok(onScreen(400, 0, view), "within the pad to the left");
  assert.ok(onScreen(3500, 0, view), "within the pad to the right");
  assert.ok(!onScreen(-200, 0, view), "far left");
  assert.ok(!onScreen(4200, 0, view), "far right");
  assert.ok(!onScreen(1500, 900, view), "far below");
});

import { cuesFor as cuesForVenues } from "../src/render/sound.ts";
test("the venues' hazards sound: a sizzle on a flat-top, frost in the freezer, a door's bang or swish, the dishes' crash", () => {
  assert.deepEqual(cuesForVenues({ type: "heatZone", kind: "flattop", x: 0, y: 0 }), ["sizzle"]);
  assert.deepEqual(cuesForVenues({ type: "heatZone", kind: "freezer", x: 0, y: 0 }), ["frost"]);
  assert.deepEqual(cuesForVenues({ type: "doorSwing", id: "k", x: 0, y: 0, dir: 1, hard: true }), ["bang"]);
  assert.deepEqual(cuesForVenues({ type: "doorSwing", id: "k", x: 0, y: 0, dir: 1, hard: false }), ["swish"]);
  assert.deepEqual(cuesForVenues({ type: "dishes", x: 0, y: 0 }), ["shatter", "smash"]);
});


import { carriedOf, LOOKS as LOOKS_R3 } from "../src/render/cast.ts";
test("each job carries its own things: the server's glasses, the lunch tray, the coffee and phone, the pan, the book", () => {
  assert.deepEqual(carriedOf("server"), ["glasses"]);
  assert.deepEqual(carriedOf("lunch"), ["food"]);
  assert.deepEqual(carriedOf("office"), ["cup", "phone"]);
  assert.deepEqual(carriedOf("cook"), ["pan"]);
  assert.deepEqual(carriedOf("prof"), ["book"]);
  assert.deepEqual([carriedOf("bellhop"), carriedOf("busser"), carriedOf("student")], [[], [], []]);
});

test("every person the levels place has a look, its head 0.22 of its height", () => {
  for (const p of ["cook-1", "busser-1", "lunch-1", "prof-1"]) {
    assert.ok(LOOKS_R3[p], p);
    assert.equal(LOOKS_R3[p].head, 0.22, p);
  }
});

test("the new people sound like themselves: the cook's sizzle and the professor's page as tells, papers and grease, a dropped tray", () => {
  assert.deepEqual(cuesFor({ type: "chime", x: 0, y: 0, job: "office" }), ["chime"]);
  assert.deepEqual(cuesFor({ type: "chime", x: 0, y: 0, job: "cook" }), ["sizzle"]);
  assert.deepEqual(cuesFor({ type: "chime", x: 0, y: 0, job: "prof" }), ["page"]);
  assert.deepEqual(cuesFor({ type: "castSplash", x: 0, y: 0, kind: "papers" }), ["paper"]);
  assert.deepEqual(cuesFor({ type: "castSplash", x: 0, y: 0, kind: "grease" }), ["splash"]);
  const down = (job, role) => cuesFor({ type: "castHit", id: 1, role, job, by: "mallet", x: 0, y: 0, dir: 1, down: true, points: 100 });
  assert.deepEqual(down("server", "server"), ["shatter"]);
  assert.deepEqual(down("lunch", "server"), ["splash"]);
  assert.deepEqual(down("cook", "office"), ["splash"]);
  assert.deepEqual(down("prof", "office"), ["page"]);
  assert.deepEqual(cuesFor({ type: "missile", kind: "pan", x: 0, y: 0 }), ["whoosh"]);
  assert.deepEqual(cuesFor({ type: "missile", kind: "plane", x: 0, y: 0 }), ["paper"]);
});


import { coverOf, counterSink } from "../src/render/cast.ts";
import { RESTAURANT } from "../src/sim/levels/restaurant.ts";

test("whoever hides has cover: the projector's sheet in the lobby, the pass's counter in the restaurant, nothing on the open line", () => {
  const screen = LOBBY.furniture.find((f) => f.kind === "screen");
  assert.equal(coverOf(screen.x + 10, LOBBY)?.kind, "screen");
  assert.deepEqual(coverOf(6300, RESTAURANT), { kind: "counter", top: -180 });
  assert.equal(coverOf(8600, RESTAURANT), null);
});

test("behind the counter the cook sinks till only his toque shows, and rears up out of it as he winds up", () => {
  // His crown 360 up, the counter's top 180 up: hiding he sinks till his crown is just under the top.
  assert.equal(counterSink(-360, -180, 0), 192);
  assert.equal(counterSink(-360, -180, 0.5), 96);
  assert.equal(counterSink(-360, -180, 1), 0);
  // Already under the top, he does not rise to meet it.
  assert.equal(counterSink(-100, -180, 0), 0);
});

import { floorBottom, openUnder } from "../src/render/venue-campus.ts";
import { CAMPUS } from "../src/sim/levels/campus.ts";

test("the campus's flights and landings stand on the ground; the deck's stair, with the commons floor under it, is open", () => {
  const floors = CAMPUS.floor;
  assert.deepEqual(floors.filter((f) => f.kind === "steps" && openUnder(f, floors)).map((f) => f.x0), [10400]);
  // A flight between two landings reaches the ground like the landings either side of it, not 120 under its foot.
  for (const f of floors.filter((f) => (f.kind === "steps" || f.kind === "stone") && !openUnder(f, floors))) assert.equal(floorBottom(f), 120, `${f.kind} at ${f.x0}`);
});

import { layWalls, wallsFor } from "../src/render/backdrop.ts";

test("a venue's walls stand side by side, centred, the end walls repeated to cover the view; any wall missing means its photo", () => {
  const walls = [{ width: 1000 }, { width: 1000 }, { width: 1000 }];
  const row = layWalls(walls, 1, 1500, [-1200, 4500]);
  assert.deepEqual(row.map((r) => r.index), [0, 0, 0, 1, 2, 2, 2]);
  assert.deepEqual(row.map((r) => r.x), [-2000, -1000, 0, 1000, 2000, 3000, 4000]);
  const wall = { file: "w.png", width: 1400, height: 1000, floor: 730, top: "#000000" };
  assert.equal(wallsFor({ backdrop: { walls: ["a", "b"], mid: [], fore: [] } }, { walls: { a: wall } }), null);
  assert.equal(wallsFor({}, { walls: { a: wall } }), null);
  assert.deepEqual(wallsFor({ backdrop: { walls: ["a", "a"], mid: [], fore: [] } }, { walls: { a: wall } }), [wall, wall]);
});

import { groundAt, wallScale } from "../src/render/backdrop.ts";

test("a venue's walls are scaled so they span its length in the far plane, each standing behind its own stretch, never past the cap", () => {
  const level = { bounds: { x: -400, y: -1600, w: 16400, h: 2200 } };
  const walls = [{ width: 1464 }, { width: 1461 }, { width: 1465 }];
  const k = wallScale(walls, level);
  assert.ok(Math.abs(k * 4390 - 16400 * 0.25) < 1, `the row spans the far extent: ${k}`);
  // A short arena keeps a readable scale and centres its walls instead.
  assert.equal(wallScale(walls, { bounds: { x: 0, y: 0, w: 3000, h: 1000 } }), 0.9);
  assert.equal(wallScale([{ width: 400 }], level), 1.4);
});

test("the ground under him: the lowest floor at his x, up the library steps and onto the dock; none over a pit", () => {
  const floor = [
    { x0: 0, x1: 1000, y0: 0, y1: 0 },
    { x0: 1000, x1: 1520, y0: 0, y1: -300 },
    { x0: 1520, x1: 3000, y0: -300, y1: -300 },
    { x0: 600, x1: 900, y0: -100, y1: -520 },
    { x0: 3400, x1: 4000, y0: -200, y1: -200 },
  ];
  assert.equal(groundAt(floor, 500), 0);
  assert.equal(groundAt(floor, 700), 0, "a belt over the floor is not the ground");
  assert.equal(groundAt(floor, 1260), -150);
  assert.equal(groundAt(floor, 2000), -300);
  assert.equal(groundAt(floor, 3200), null, "a pit has no ground");
  assert.equal(groundAt(floor, 3600), -200);
});

import { HEAD_PEEK } from "../src/render/cast.ts";

test("a cook with no hat to show keeps the top of his head over the counter, his tell, and still rears up to stand", () => {
  // Crown 360 up, the counter's top 180 up: with nothing worn, his crown stands HEAD_PEEK over the top.
  const sink = counterSink(-360, -180, 0, HEAD_PEEK);
  assert.ok(HEAD_PEEK >= 30, `enough head to read: ${HEAD_PEEK}`);
  assert.equal(-360 + sink, -180 + 12 - HEAD_PEEK, "his crown HEAD_PEEK above the counter's lip");
  assert.equal(counterSink(-360, -180, 1, HEAD_PEEK), 0, "risen, he stands");
});

import { heard } from "../src/render/sound.ts";

test("the kitchen door's soft swing is heard only on screen; its bang, near him, always", () => {
  const view = { x: 4000, y: -1000, w: 1600, h: 1000 };
  const swing = (x, hard) => ({ type: "doorSwing", id: "kitchen", x, y: 0, dir: -1, hard });
  assert.equal(heard(swing(5200, false), view), true, "in view");
  assert.equal(heard(swing(9800, false), view), false, "across the restaurant");
  assert.equal(heard(swing(9800, true), view), true, "a bang");
  assert.equal(heard({ type: "chime", x: 9800, y: 0, job: "office" }, view), true, "everything else as before");
});

import { doorPoses } from "../src/render/venue.ts";

test("the swinging door's drawn pose holds still at rest, so it is drawn once, and moves through a swing", () => {
  const specs = [{ id: "kitchen", x: 5200, y: 0, server: "s" }];
  const rest = [{ id: "kitchen", x: 5200, y: 0, server: "s", t: 0, dir: -1, hard: false, chain: 0 }];
  assert.deepEqual(doorPoses(specs, rest), [{ open: 0, dir: -1 }]);
  assert.deepEqual(doorPoses(specs, rest), doorPoses(specs, [...rest]), "the same pose frame to frame at rest");
  const mid = [{ ...rest[0], t: 0.2, dir: 1 }];
  assert.ok(doorPoses(specs, mid)[0].open > 0.99 && doorPoses(specs, mid)[0].dir === 1, JSON.stringify(doorPoses(specs, mid)));
  assert.deepEqual(doorPoses([], rest), [], "a venue with no door draws none");
});

import { towelDrawScale } from "../src/render/towel.ts";

test("the towel is turned from its plate at the same size whether the plate is stored whole or at half scale", () => {
  const whole = { width: 620, height: 1322, source: { resolution: 1 } };
  const half = { width: 620, height: 1322, source: { resolution: 0.5 } };
  assert.equal(towelDrawScale(half, 200), towelDrawScale(whole, 200) * 2);
});

import { PIG_FEEL, pigFace, pigPose } from "../src/sim/rig/pig.ts";
import { fightFrame } from "../src/render/frame.ts";
import { PIG } from "../src/sim/pig.ts";

const pigCtx = (o = {}) => ({ state: "recover", t: 0, clock: 0, hurtT: 0, onGround: true, landT: null, ...o });

test("the pig leans back 12 degrees in its wind-up and forward 18 in its charge, the whole of it about its middle", () => {
  const lean = (p) => {
    const s = solve(p, 1, 0.26);
    return s.joints.neck.x - s.joints.pelvis.x;
  };
  const rest = lean(pigPose(pigCtx()));
  assert.ok(lean(pigPose(pigCtx({ state: "windup", t: 1 }))) < rest - 20, "back, away from the way it faces");
  assert.ok(lean(pigPose(pigCtx({ state: "charge", t: 0.3 }))) > rest + 30, "forward, into the charge");
  assert.equal(pigPose(pigCtx({ state: "windup", t: 1 })).spin, PIG_FEEL.windupLean);
  assert.equal(pigPose(pigCtx({ state: "charge", t: 0.5 })).spin, -PIG_FEEL.chargeLean);
});

test("it breathes at 0.5 Hz, stretches 0.9 by 1.15 in a hop's air, squashes 1.2 by 0.8 as it lands, and deflates to 0.85 over 1.2 s", () => {
  const breath = pigPose(pigCtx({ state: "asleep", clock: 0.5 })).squash.y;
  assert.ok(Math.abs(breath - (1 + PIG_FEEL.breath)) < 1e-6, `a breath's top a quarter of 2 s in: ${breath}`);
  const squash = (o, x, y) => {
    const s = pigPose(pigCtx(o)).squash;
    assert.ok(Math.abs(s.x - x) < 1e-9 && Math.abs(s.y - y) < 1e-9, `${JSON.stringify(o)}: ${s.x} by ${s.y}`);
  };
  squash({ state: "hop", t: 0.3, onGround: false }, 0.9, 1.15);
  squash({ state: "hop", t: 0.7, landT: 0 }, 1.2, 0.8);
  squash({ state: "hop", t: 1, landT: PIG_FEEL.landT }, 1, 1);
  assert.ok(Math.abs(pigPose(pigCtx({ state: "defeated", t: 1.2 })).squash.y - 0.85) < 1e-9);
  assert.ok(pigPose(pigCtx({ state: "defeated", t: 0.6 })).squash.y > 0.85, "still going down halfway");
});

test("a hit wobbles it while the gap runs, and it stills when the gap is over", () => {
  const spins = [];
  for (let k = 1; k <= 40; k++) spins.push(pigPose(pigCtx({ hurtT: PIG.gap - k * (PIG.gap / 40) })).spin);
  assert.ok(Math.max(...spins.map(Math.abs)) > 2, "it wobbles");
  assert.equal(pigPose(pigCtx({ hurtT: 0 })).spin, 0);
});

test("the pig's faces: it squints asleep and winding up, bares its teeth charging and in a hop's air, winces hurt, and wears its X when down", () => {
  const f = (o) => pigFace({ state: "recover", hurtT: 0, onGround: true, ...o });
  assert.deepEqual(
    [f({ state: "asleep" }), f({ state: "windup" }), f({ state: "charge" }), f({ state: "hop", onGround: false }), f({ state: "hop" }), f({}), f({ hurtT: 0.2 }), f({ state: "defeated", hurtT: 0.2 })],
    ["squint", "squint", "charge", "charge", null, null, "hurt", "defeated"],
  );
});

test("inside each state the pig never jumps: no joint, lean or tilt turns more than 9 degrees in a step", () => {
  const step = 1 / 120;
  for (const [state, seconds, extra] of [["asleep", 4], ["windup", 1.1], ["charge", 0.85], ["hop", 0.6, { onGround: false }], ["recover", 1.35], ["defeated", 2]]) {
    let last = null;
    for (let t = 0; t <= seconds; t += step) {
      const p = pigPose(pigCtx({ state, t, clock: t, ...extra }));
      if (last) {
        for (const [j, v] of Object.entries(p.rot)) assert.ok(Math.abs(v - last.rot[j]) <= 9, `${state} t=${t.toFixed(3)}: ${j} jumps`);
        assert.ok(Math.abs(p.spin - last.spin) <= 9 && Math.abs(p.headTilt - last.headTilt) <= 9, `${state} t=${t.toFixed(3)}: the body jumps`);
      }
      last = p;
    }
  }
});

test("the camera frames both fighters: between them while they are close, never letting him leave the middle of the view", () => {
  assert.equal(fightFrame(1000, 1600, 600), 1300);
  assert.equal(fightFrame(1000, 3600, 600), 1600, "the pig far right: he stays 600 px from the middle");
  assert.equal(fightFrame(3000, 800, 600), 2400, "and far left");
});

import { bodyLayersOf, drawOrder } from "../src/render/skin.ts";

test("a rig draws in its cut's order with its head among its layers; the cast's rigs draw as before", () => {
  assert.deepEqual([...drawOrder({})], ["armFar", "legFar", "legNear", "head", "torso", "armNear"]);
  assert.deepEqual(bodyLayersOf({}), ["armFar", "legFar", "legNear", "torso", "armNear"]);
  const z = ["armFar", "legFar", "tail", "torso", "legNear", "head", "armNear"];
  assert.deepEqual([...drawOrder({ z })], z);
  assert.deepEqual(bodyLayersOf({ z }), ["armFar", "legFar", "tail", "torso", "legNear", "armNear"]);
});

const pigRig = async () => {
  if (!rigs.has("pig")) rigs.set("pig", await castRig("pig", await keyOut(readFileSync("art/incoming/pig/pig-body.png")), JSON.parse(readFileSync("art/cuts/pig.json", "utf8"))));
  return rigs.get("pig").rig;
};
const PIG_STATES = [["asleep", true], ["windup", true], ["charge", true], ["hop", false], ["hop", true], ["recover", true], ["defeated", true]];

test("the pig's painting carries every bone's end onto its solved joint in every state, facing either way", async () => {
  const rig = await pigRig();
  const skel = castSkeleton(rig);
  const ends = { positions: rig.bones.flatMap(([, c]) => rig.joints[c]), bones: rig.bones.flatMap((_, b) => [b, 0, 0, 0]), weights: rig.bones.flatMap(() => [1, 0, 0, 0]) };
  const out = new Float32Array(ends.positions.length);
  for (const [state, onGround] of PIG_STATES)
    for (const t of [0.05, 0.3, 0.9])
      for (const facing of [-1, 1]) {
        const solved = solve(pigPose({ state, t, clock: t, hurtT: 0, onGround, landT: onGround && state === "hop" ? 0.1 : null }), facing, castHeadScale(rig.head.share, rig.head), rig.head, skel);
        skinLayer(out, ends, rig, solved);
        rig.bones.forEach(([, c], b) => {
          const d = Math.hypot(out[b * 2] - solved.joints[c].x, out[b * 2 + 1] - solved.joints[c].y);
          assert.ok(d < 0.5, `pig ${state} t=${t} facing ${facing}: ${c} is ${d.toFixed(2)} px off`);
        });
      }
});

test("the pig stands its near sole on the floor at rest, and its head crowns it at HERO_HEIGHT before the 420 px scale", async () => {
  const rig = await pigRig();
  const s = solve(REST_POSE, -1, castHeadScale(rig.head.share, rig.head), rig.head, castSkeleton(rig));
  const sole = Math.max(s.joints.toeNear.y, s.joints.heelNear.y);
  assert.ok(Math.abs(sole + groundShift(s, "planted")) < 1, `the near sole ${(sole + groundShift(s, "planted")).toFixed(2)} px off the floor`);
  assert.ok(Math.abs(s.crown.y + HERO_HEIGHT) < 0.5, `crown at ${s.crown.y}`);
});
