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
import { SETS } from "../src/render/3d/sets.ts";
import { backClipOf, backCycle, flatCabinOf, hallStateOf } from "../src/render/3d/hall-state.ts";
import { FLIGHT, rowX } from "../src/sim/levels/flight.ts";
import { PARIS } from "../src/sim/levels/paris.ts";
import { placementsOf } from "../src/render/backdrop.ts";
import { screenGlow } from "../src/render/venue-paris.ts";
import { HALLWAY } from "../src/sim/levels/hallway.ts";

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
  const snap = (cartX, blobs) => ({ time: 0, hero: null, targets: [{ id: 1, x: cartX, y: -40 }], snot: blobs, samples: [], puddles: [], cast: [], missiles: [] });
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
  const prev = { time: 0, hero: {}, targets: [], snot: [], samples: [], puddles: [], cast: [npc(100, 0)], missiles: [{ id: 1, x: 0, y: 0 }] };
  const cur = { time: 1, hero: {}, targets: [], snot: [], samples: [], puddles: [], cast: [npc(200, -40)], missiles: [{ id: 1, x: 100, y: -20 }, { id: 2, x: 500, y: 0 }] };
  const b = between(prev, cur, 0.25);
  assert.deepEqual([b.cast[0].x, b.cast[0].y], [125, -10]);
  assert.deepEqual([b.missiles[0].x, b.missiles[0].y, b.missiles[1].x], [25, -5, 500]);
});

test("every person has a look, taller or shorter than Hammer by the design, and a recolor changes only the top", () => {
  assert.deepEqual(Object.keys(LOOKS).sort(), ["attendant-1", "bartender-1", "bellhop-1", "bellhop-2", "busser-1", "concierge", "conductor", "cook-1", "drill", "drummer", "garcon", "gate-agent", "guard-1", "housekeeper-1", "kid-1", "lunch-1", "major", "nurse", "office-1", "office-2", "parisian-1", "piper", "prof-1", "purser", "server-1", "server-2", "skycap-1", "student-1", "student-2", "titanium", "tsa-1"]);
  assert.deepEqual([LOOKS["skycap-1"].height, LOOKS["tsa-1"].height, LOOKS["bartender-1"].height], [330, 320, 310]);
  assert.equal(PAINTING_OF["bartender-1"], "server-1");
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

test("a slap at the banquet thuds; every third carries the damage recording", () => {
  assert.deepEqual(cuesFor({ type: "hhSlap", who: "nurse", x: 0, y: 0, curse: false }), ["thud"]);
  assert.deepEqual(cuesFor({ type: "hhSlap", who: "nurse", x: 0, y: 0, curse: true }), ["curse", "thud"]);
});

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
import { roleOf as castRoleOf, PAINTING_OF } from "../src/sim/cast.ts";
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
    // Plates are stored at the painting's size now (BODY_SCALE): their coordinates carry floating error near 1e-6 px.
    // A point 5 plate px below the jaw line's middle, on the neck's side.
    let n = [-(by - ay), bx - ax];
    const len = Math.hypot(n[0], n[1]);
    n = [n[0] / len, n[1] / len];
    if ((h.crown.x - mid[0]) * n[0] + (h.crown.y - mid[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const neckPoint = [mid[0] - 5 * n[0], mid[1] - 5 * n[1]];
    const verts = [h.crown.x, h.crown.y, h.neck.x, h.neck.y, ...neckPoint];
    const same = taperHead(verts, h, 1);
    [h.crown.x - h.neck.x, h.crown.y - h.neck.y, 0, 0, neckPoint[0] - h.neck.x, neckPoint[1] - h.neck.y].forEach((v, i) =>
      assert.ok(Math.abs(same[i] - v) < 1e-5, `${person}: grown by 1 nothing moves (${i})`),
    );
    const big = taperHead(verts, h, 1.5);
    assert.ok(Math.abs(big[1] - 1.5 * (h.crown.y - h.neck.y)) < 1e-5, `${person}: the crown where a whole head 1.5 times as big would put it: ${big[1]}`);
    assert.ok(Math.abs(big[2]) < 1e-9 && Math.abs(big[3]) < 1e-9, `${person}: the neck anchor stays`);
    assert.ok(Math.abs(big[4] - (neckPoint[0] - h.neck.x)) < 1e-5 && Math.abs(big[5] - (neckPoint[1] - h.neck.y)) < 1e-5, `${person}: the neck below the jaw stays as painted`);
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
  assert.ok(Math.abs(hatWorldWidth(rig, share, height) - onHead) < 1e-5, `${hatWorldWidth(rig, share, height)} against ${onHead}`);
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
  const down = (job, role) => cuesFor({ type: "castHit", id: 1, role, job, by: "mallet", x: 0, y: 0, dir: 1, down: true, points: 100, drops: true });
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
  // A flight between two landings reaches the ground like the landings either side of it, not a face's depth under its foot.
  for (const f of floors.filter((f) => (f.kind === "steps" || f.kind === "stone") && !openUnder(f, floors))) assert.equal(floorBottom(f), FLOOR.depth, `${f.kind} at ${f.x0}`);
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

import { Graphics as PaintedGraphics, Texture as PaintedTexture } from "pixi.js";
import { KIOSK_W, drawSatDressing } from "../src/render/venue-sat.ts";
import { drawSample } from "../src/render/props.ts";
import { drawScalpel, paintScalpel } from "../src/render/quests/gate-board.ts";

const paintedPiece = (width, height) => ({ texture: PaintedTexture.WHITE, piece: { file: "p.webp", width, height, base: { x: width / 2, y: height } } });
const textures = (g) => g.context.instructions.filter((i) => i.action === "texture").map((i) => i.data);

test("SAT's seats and podium are the gate sheet's once it is in, each on its floor; the sheet's kiosk stands behind its counter, not over it", () => {
  const seats = new PaintedGraphics();
  assert.ok(drawSatFurniture(seats, { kind: "seats", x: 100, y: -140, w: 400, h: 140 }, { seats: paintedPiece(800, 400) }));
  const [s] = textures(seats);
  assert.deepEqual([s.dx, s.dy, s.dw, s.dh], [100, -200, 400, 200]);
  const back = new PaintedGraphics();
  const over = new PaintedGraphics();
  assert.ok(drawSatFurniture(back, { kind: "podium", x: 700, y: -220, w: 200, h: 220 }, { podium: paintedPiece(200, 240) }, over));
  assert.equal(textures(back).length, 0, "the podium stands in front of the door");
  assert.equal(textures(over)[0].dh, 240);
  const behind = new PaintedGraphics();
  drawSatDressing(behind, new PaintedGraphics(), { platforms: [{ x0: 1500, x1: 1800, y: -180, kind: "counter" }] }, { kiosk: paintedPiece(180, 320) });
  const [k] = textures(behind);
  assert.equal(k.dw, KIOSK_W);
  assert.ok(k.dh < 340, `about a head over the counter, not a wall: ${k.dh}`);
  assert.equal(k.dx + k.dw / 2, 1650);
});

test("the sheet's departures sign stands on the floor at his height, not on a column up over the ceiling", () => {
  const f = SAT.furniture.find((x) => x.kind === "departures");
  const g = new PaintedGraphics();
  assert.ok(drawSatFurniture(g, f, { sign: paintedPiece(250, 320) }));
  const [t] = textures(g);
  assert.equal(t.dy + t.dh, f.y + f.h, "on the floor");
  assert.ok(t.dh < 345, `no taller than he is: ${t.dh}`);
  assert.equal(t.dx + t.dw / 2, f.x + f.w / 2);
  assert.equal(g.context.instructions.filter((i) => i.action === "fill").length, 0, "no column under it");
});

test("the sheet's scalpel, once in, runs from the butt to the tip with its painted blade at the tip; before that the drawn one stands in", () => {
  const drawn = new PaintedGraphics();
  drawScalpel(drawn, { x: 0, y: 0 }, { x: 100, y: 0 });
  assert.equal(textures(drawn).length, 0);
  paintScalpel({ texture: PaintedTexture.WHITE, aspect: 0.15 });
  try {
    const g = new PaintedGraphics();
    drawScalpel(g, { x: 0, y: 0 }, { x: 100, y: 0 });
    const [t] = textures(g);
    assert.deepEqual([t.dw, t.dh], [100, 15]);
    // The painting's left edge is the blade's tip: it lands on the tip, its right edge on the butt.
    const at = (x, y) => t.transform.apply({ x, y });
    assert.ok(Math.abs(at(0, 0).x - 100) < 1e-6 && Math.abs(at(0, 0).y) < 1e-6, "the blade at the tip");
    assert.ok(Math.abs(at(100, 0).x) < 1e-6 && Math.abs(at(100, 0).y) < 1e-6, "the handle at the butt");
    // One stuck in the map or on the tray is too small for the painting's ink: the drawn one, for reading it.
    const small = new PaintedGraphics();
    drawScalpel(small, { x: 0, y: 0 }, { x: 60, y: 0 });
    assert.equal(textures(small).length, 0);
  } finally {
    paintScalpel(null);
  }
});

test("a box of blades is the sheet's once it is in, sitting on the floor where it lands, and keeps its spin and fade", () => {
  const b = { x: 300, y: 0, landed: 0 };
  const g = new PaintedGraphics();
  drawSample(g, b, { texture: PaintedTexture.WHITE, aspect: 1 });
  const [t] = textures(g);
  assert.equal(t.dw, t.dh);
  assert.equal(g.y, -t.dh / 2, "its bottom on the floor");
  const flying = new PaintedGraphics();
  drawSample(flying, { x: 120, y: -200, landed: -1 }, { texture: PaintedTexture.WHITE, aspect: 1 });
  assert.equal(flying.y, -200);
  assert.ok(flying.rotation !== 0, "it tumbles in the air");
  const drawn = new PaintedGraphics();
  drawSample(drawn, b);
  assert.equal(textures(drawn).length, 0, "the drawn one stands in");
});

import { farPan } from "../src/render/backdrop.ts";
import { PARALLAX } from "../src/render/scene.ts";
import { SAT as SAT_LEVEL } from "../src/sim/levels/sat.ts";

test("a venue may set its far plane's scale and pan; the others keep the formula and the shared pan", () => {
  const walls = [{ width: 1000 }];
  const bounds = { x: 0, y: 0, w: 16000, h: 1000 };
  assert.equal(wallScale(walls, { bounds, backdrop: { walls: [], mid: [], fore: [], far: { pan: 0.5, scale: 1.05 } } }), 1.05);
  assert.equal(farPan({ backdrop: { walls: [], mid: [], fore: [], far: { pan: 0.5, scale: 1.05 } } }), 0.5);
  assert.equal(farPan({ backdrop: { walls: [], mid: [], fore: [] } }), PARALLAX.far);
  assert.equal(farPan({}), PARALLAX.far);
  assert.ok(farPan(SAT_LEVEL) < PARALLAX.mid, "the far plane stays slower than the mid plane");
});

test("SAT's walls are all seen on the walk: the curb's left edge at the start, gate B7's wall at the end, nothing past them", () => {
  // The cut walls' widths; half the view at 16:9 and zoom 1 in world px.
  const walls = [{ width: 1425 }, { width: 1425 }, { width: 1425 }];
  const half = 1036;
  const pan = farPan(SAT_LEVEL);
  const b = SAT_LEVEL.bounds;
  const scale = wallScale(walls, SAT_LEVEL);
  const row = layWalls(walls, scale, (b.x + b.w / 2) * pan, [b.x * pan - half, (b.x + b.w) * pan + half]);
  const first = row.find((r) => r.index === 1).x - walls[0].width * scale;
  const last = row.find((r) => r.index === 1).x + walls[1].width * scale + walls[2].width * scale;
  const seen = [(b.x + half) * pan - half, (b.x + b.w - half) * pan + half];
  assert.ok(first > seen[0] - 100 && first < seen[0] + 100, `the row starts where the walk's view starts: ${first} against ${seen[0]}`);
  assert.ok(last > seen[1] - 100 && last < seen[1] + 100, `the row ends where the walk's view ends: ${last} against ${seen[1]}`);
  // The walls' floor line is 788 px down: at this scale the painted ceiling reaches the top of a 1080p view, 870 px over the floor.
  assert.ok(788 * scale >= 870, `the walls fill the view: ${788 * scale}`);
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

import { BANQUET_FRAME, banquetFrame } from "../src/render/quests/frame.ts";
import { HERO_SCREEN_FRACTION, PORTRAIT_ZOOM } from "../src/render/scene.ts";
import { feelOf } from "../src/sim/feel.ts";
// `cuesFor` is imported higher up the file already: a second import of the name is a syntax error.

test("the banquet's frame fills the screen between the bars on a laptop and on a phone either way, nothing of it under a bar", () => {
  for (const [w, h, top, bottom] of [[1280, 800, 64, 44], [390, 844, 96, 300], [844, 390, 60, 150]]) {
    const f = banquetFrame(w, h, { top, bottom });
    const scale = (HERO_SCREEN_FRACTION * h * f.zoom * (w < h ? PORTRAIT_ZOOM : 1)) / 340;
    const sx = (x) => w / 2 + (x - f.x) * scale;
    const sy = (y) => h / 2 + (y - f.y) * scale;
    const [l, r, t, b] = [sx(BANQUET_FRAME.x), sx(BANQUET_FRAME.x + BANQUET_FRAME.w), sy(BANQUET_FRAME.y), sy(BANQUET_FRAME.y + BANQUET_FRAME.h)];
    assert.ok(l >= -0.5 && r <= w + 0.5, `${w}x${h}: across ${l}..${r}`);
    assert.ok(t >= top - 0.5 && b <= h - bottom + 0.5, `${w}x${h}: down ${t}..${b}`);
    assert.ok(Math.abs(r - l - w) < 1 || Math.abs(b - t - (h - top - bottom)) < 1, `${w}x${h}: filled one way`);
  }
});

test("the banquet's sounds: the bell on a wave, a whoosh on a dive, the chomp, the slide when someone else takes food, the bonk or the thud, the cart's boom, the paper's splat, the clash", () => {
  assert.deepEqual(cuesFor({ type: "hhDump", x: 0, y: 0, count: 24, kinds: [], cart: false }), ["ding"]);
  assert.deepEqual(cuesFor({ type: "hhDump", x: 0, y: 0, count: 1, kinds: [], cart: false }), []);
  assert.deepEqual(cuesFor({ type: "hhDive", who: "hammer", charged: false }), ["whoosh"]);
  assert.deepEqual(cuesFor({ type: "hhChomp", who: "hammer", x: 0, y: 0, count: 2 }), ["chomp"]);
  assert.deepEqual(cuesFor({ type: "hhChomp", who: "nurse", x: 0, y: 0, count: 1 }), ["slide"]);
  assert.deepEqual(cuesFor({ type: "hhBus", x: 0, y: 0, count: 3 }), ["slide"]);
  assert.deepEqual(cuesFor({ type: "hhBonk", x: 0, y: 0, hit: true }), ["bonk"]);
  assert.deepEqual(cuesFor({ type: "hhBonk", x: 0, y: 0, hit: false }), ["thud"]);
  assert.deepEqual(cuesFor({ type: "hhCart", x: 0, y: 0 }), ["boom"]);
  assert.deepEqual(cuesFor({ type: "hhPaper", x: 0, y: 0, hit: true }), ["splat"]);
  assert.deepEqual(cuesFor({ type: "hhClash", x: 0, y: 0 }), ["clash"]);
});

test("the banquet's feel: the bonk that catches something, the clash and the cart's crash shake the camera", () => {
  assert.ok(feelOf({ type: "hhBonk", x: 0, y: 0, hit: true }).trauma > 0);
  assert.equal(feelOf({ type: "hhBonk", x: 0, y: 0, hit: false }).hitstop, 0);
  assert.ok(feelOf({ type: "hhClash", x: 0, y: 0 }).trauma >= 0.3);
  assert.ok(feelOf({ type: "hhCart", x: 0, y: 0 }).trauma >= 0.5);
});

test("the HUD in the round: its score and clock, his reach from his tap's to 1180 as it charges, the combo, the chomps, the door or practice, the lecture's wait and COMPED's line; none in the shift", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false, title: true });
  assert.equal(hudOf(g, null).quest, null);
  g.newQuest(5);
  while (g.mode !== "quest") g.step(emptyInput());
  const q = g.quest;
  q.score.plate = 640;
  q.score.bonus = 60;
  q.score.chain = 6;
  q.score.eaten = 9;
  q.time = 12.2;
  const hud = hudOf(g, null).quest;
  assert.deepEqual(hud, { id: "hungry", menu: "banquet", score: 700, time: 48, reach: 610, reachBase: 610, reachMax: 1180, combo: 6, mult: 2, chomps: 9, door: false, lecture: 0, goal: 30300, result: null });
  assert.equal(hudOf(g, null).hint, "Tap ← → to pick a plate · hold Space to grab · E lectures · H bonks the server");
  assert.equal(hudOf(g, null).lecture, true, "the pad lights Lecture");
  q.hammer.lectureCd = 4.2;
  assert.deepEqual([hudOf(g, null).quest.lecture, hudOf(g, null).lecture], [5, false], "and counts down its wait");
});

test("what a staffer carries breaks on the hit that knocks it from his hands, not again on his knockout", () => {
  const hit = (job, role, down, drops) => cuesFor({ type: "castHit", id: 1, role, job, by: "mallet", x: 0, y: 0, dir: 1, down, points: 100, drops });
  assert.deepEqual(hit("server", "server", false, true), ["shatter"], "the first hit: the tray goes");
  assert.deepEqual(hit("server", "server", true, false), [], "knocked out with no tray left");
  assert.deepEqual(hit("lunch", "server", false, true), ["splash"]);
  assert.deepEqual(hit("prof", "office", false, true), ["page"]);
});

import { tauntFor } from "../src/render/sound.ts";
import { Caption } from "../src/render/bubbles.ts";

test("only besting someone offers a recording: a staffer knocked out, a lecture that lands, a student run off, a swatted plane, a hit on the pig", () => {
  const hit = (role, down) => ({ type: "castHit", id: 1, role, job: role, by: "mallet", x: 0, y: 0, dir: 1, down, points: 100, drops: false });
  assert.equal(tauntFor(hit("server", true)), "staff");
  assert.equal(tauntFor(hit("bellhop", true)), "staff");
  assert.equal(tauntFor(hit("office", true)), "staff");
  assert.equal(tauntFor(hit("server", false)), null, "a hit short of the last");
  assert.equal(tauntFor(hit("student", true)), null, "a student put out runs off, and the flee speaks");
  assert.equal(tauntFor({ type: "castFlee", id: 1, x: 0, y: 0, points: 100 }), "student");
  assert.equal(tauntFor({ type: "lectureLand", x: 0, y: 0, schooled: 1, frozen: 2 }), "student");
  assert.equal(tauntFor({ type: "lectureLand", x: 0, y: 0, schooled: 0, frozen: 1 }), "staff");
  assert.equal(tauntFor({ type: "lectureLand", x: 0, y: 0, schooled: 0, frozen: 0 }), null, "a lecture to nobody");
  assert.equal(tauntFor({ type: "swat", kind: "plane", x: 0, y: 0, points: 50 }), "student");
  assert.equal(tauntFor({ type: "swat", kind: "pan", x: 0, y: 0, points: 50 }), null);
  for (const by of ["bonk", "snot"]) assert.equal(tauntFor({ type: "pigHit", by, x: 0, y: 0, hp: 5, bonks: 1, snots: 0 }), "pig");
  for (const type of ["swing", "jump", "hurt", "castBump", "castFreeze", "castSchooled", "chain", "pigBounce"]) assert.equal(tauntFor({ type }), null, type);
});

test("captions follow the voice: a thought waits while a recording's caption is up; a stopped recording takes its caption", () => {
  const c = new Caption();
  assert.equal(c.think("HAMMER TIME.", 1.1), true);
  assert.deepEqual([c.text, c.spoken], ["HAMMER TIME.", false]);
  c.say("They can't take feedback.", 2);
  assert.deepEqual([c.text, c.spoken], ["They can't take feedback.", true], "a recording's caption replaces a thought");
  assert.equal(c.think("Any day now.", 1.6), false, "a thought waits for the recording");
  assert.equal(c.text, "They can't take feedback.");
  c.say("ABSOLUTE BULLSHIT", 1.6);
  assert.equal(c.text, "ABSOLUTE BULLSHIT", "the damage line cuts in with its own");
  c.cut();
  assert.equal(c.text, null, "a recording stopped by a break or by mute takes its caption");
  c.think("Ahh. Better.", 1.2);
  c.cut();
  assert.equal(c.text, "Ahh. Better.", "a thought is no recording: a cut leaves it");
  c.step(1.3);
  assert.equal(c.text, null, "it runs out");
  c.say("They need to get fired.", 2);
  c.step(2.01);
  assert.equal(c.think("Any day now.", 1.6), true, "with nothing spoken, thoughts show");
});

import { GOO, addGlob, globOutline, globPoint, globSpatter, splatGrow, splatShape, stepGlob, stickGlob } from "../src/render/goo.ts";

test("snot sticks where it hit: on the nearest joint, and it stays there as they turn and move", () => {
  const right = solve(REST_POSE, 1, 0.22);
  const left = solve(REST_POSE, -1, 0.22);
  const at = { x: right.joints.chest.x + 10, y: right.joints.chest.y - 6 };
  const g = stickGlob(right.joints, 1, at, false, 3);
  assert.equal(g.joint, "chest");
  const back = globPoint(g, right.joints, 1);
  assert.ok(Math.abs(back.x - at.x) < 1e-9 && Math.abs(back.y - at.y) < 1e-9, "where it hit");
  const turned = globPoint(g, left.joints, -1);
  assert.ok(Math.abs(turned.x - (left.joints.chest.x - 10)) < 1e-9 && Math.abs(turned.y - at.y) < 1e-9, "mirrored when they turn");
  // A hit on the face sits on the face, never pulled down to the chest.
  const face = { x: right.crown.x, y: right.crown.y + 30 };
  const f = stickGlob(right.joints, 1, face, false, 4);
  const p = globPoint(f, right.joints, 1);
  assert.ok(Math.hypot(p.x - face.x, p.y - face.y) < 1e-9, `on the face: ${JSON.stringify(p)}`);
  // A hit well off the body lands on its edge, not in the air.
  const far = stickGlob(right.joints, 1, { x: right.joints.chest.x + 400, y: right.joints.chest.y }, false, 5);
  assert.ok(Math.hypot(far.ox, far.oy) <= GOO.reach + 1e-9, "held on the body");
});

test("each glob has two or three strands that stretch down, let a drip go at full length and start again short", () => {
  const g = stickGlob({ chest: { x: 0, y: -200 } }, 1, { x: 0, y: -200 }, false, 9);
  assert.ok(g.strands.length >= 2 && g.strands.length <= 3, `strands: ${g.strands.length}`);
  for (const s of g.strands) assert.ok(s.max >= GOO.len[0] && s.max <= GOO.len[1] && s.len <= GOO.stub + 1e-9);
  // Each hangs from the tip of a run of goo down off the glob's lower edge.
  for (const s of g.strands) assert.ok(s.top >= g.r * 0.9 && s.top <= g.r * 1.6, `a run below the glob: ${s.top}`);
  const drips = [];
  let longest = 0;
  for (let i = 0; i < 600; i++) {
    drips.push(...stepGlob(g, 1 / 120));
    longest = Math.max(longest, ...g.strands.map((s) => s.len));
  }
  assert.ok(drips.length >= 2, `drips in five seconds: ${drips.length}`);
  assert.ok(longest <= GOO.len[1] + 1e-9, "never longer than the longest");
  for (const d of drips) assert.ok(d.y > 0, "a drip falls from below the glob");
  // Over a floor close under it, a strand lies on the floor instead of dripping through it.
  const low = stickGlob({ chest: { x: 0, y: -20 } }, 1, { x: 0, y: -20 }, false, 9);
  const onFloor = [];
  for (let i = 0; i < 600; i++) onFloor.push(...stepGlob(low, 1 / 120, 12));
  assert.equal(onFloor.length, 0, "no drip through the floor");
  for (const s of low.strands) assert.ok(s.len <= 12 + 1e-9, `stopped at the floor: ${s.len}`);
});

test("someone carries four globs at most: the oldest dries off", () => {
  const list = [];
  for (let i = 0; i < 6; i++) addGlob(list, stickGlob({ chest: { x: 0, y: -200 } }, 1, { x: i, y: -200 }, false, i));
  assert.equal(list.length, GOO.max);
  assert.deepEqual(list.map((g) => g.seed), [2, 3, 4, 5]);
});

test("a glob is lumpy, sags at the bottom and is sprayed round with smaller gobs, not a dot, the same frame to frame", () => {
  const a = globOutline(GOO.r, 7);
  assert.deepEqual(globOutline(GOO.r, 7), a, "the same for its seed");
  assert.notDeepEqual(globOutline(GOO.r, 8), a, "another glob, another shape");
  const radii = a.map((p) => Math.hypot(p.x, p.y));
  assert.ok(Math.max(...radii) / Math.min(...radii) > 1.25, `lobed: ${Math.min(...radii)}..${Math.max(...radii)}`);
  assert.ok(Math.max(...a.map((p) => p.y)) > -Math.min(...a.map((p) => p.y)) * 1.1, "it sags: lower than it is high");
  assert.ok(GOO.r >= 28, `big enough to read at a distance: ${GOO.r}`);
  const gobs = globSpatter(GOO.r, 7);
  assert.deepEqual(globSpatter(GOO.r, 7), gobs, "the same for its seed");
  assert.ok(gobs.length >= 3 && gobs.length <= 5, `gobs: ${gobs.length}`);
  for (const g of gobs) {
    const d = Math.hypot(g.x, g.y);
    assert.ok(d >= GOO.r * 1.1 && d <= GOO.r * 2.4 && g.r < GOO.r * 0.45, `a gob off the glob: ${JSON.stringify(g)}`);
  }
});

test("snot on the floor is a lumpy splat with a mound in the middle, splash fingers and droplets all round, spreading out as it lands", () => {
  const s = splatShape(102, 41);
  assert.deepEqual(splatShape(102, 41), s, "the same for its seed");
  const xs = s.rim.map((p) => p.x);
  const ys = s.rim.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  assert.ok(w > 85 && w < 130, `about as wide as the puddle: ${w}`);
  assert.ok(h < w * 0.4 && h > w * 0.2, `lying on the floor, seen from the side: ${h} of ${w}`);
  const radii = s.rim.map((p) => Math.hypot(p.x, p.y / GOO.flat));
  assert.ok(Math.max(...radii) / Math.min(...radii) > 1.25, "lumpy");
  assert.ok(s.fingers.length >= 3 && s.fingers.length <= 6, `fingers: ${s.fingers.length}`);
  for (const k of s.fingers) assert.ok(k.len > 102 / 2, `a finger reaches past the rim: ${k.len}`);
  assert.ok(s.drops.length >= 3 && s.drops.length <= 6, `droplets: ${s.drops.length}`);
  const sides = new Set(s.drops.map((d) => Math.sign(d.x)));
  assert.equal(sides.size, 2, "droplets on both sides, not in a bunch");
  assert.ok(s.mound.h > 102 * 0.1 && s.mound.w < 102 * 0.7, `a mound of goo in the middle: ${JSON.stringify(s.mound)}`);
  assert.ok(splatGrow(0) < 0.5 && splatGrow(0.09) > 1 && Math.abs(splatGrow(0.4) - 1) < 1e-9, "it spreads, overshoots and settles");
});

import { isNewBest } from "../src/render/hud.ts";

test("a tally says New best only when the score beats the best kept before the round, never on a tie", () => {
  assert.deepEqual([isNewBest(5000, 4000), isNewBest(5000, 5000), isNewBest(4000, 5000), isNewBest(0, 0)], [true, false, false, false]);
});

import { gateLayout, PERSON } from "../src/render/quests/gate-layout.ts";
import { MAP as GATE_MAP, CITY_CODES, cityAt, TAGS, fareFor, classOf } from "../src/sim/quests/fares/board.ts";
import { FARES } from "../src/sim/quests/fares/fares.ts";

const SHAPES = [[1280, 800], [1920, 1080], [1440, 1080], [2560, 1080], [390, 844], [844, 390], [360, 780]];
const GATE_INSETS = { top: 64, bottom: 44 };
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** The largest tag a city can wear, in world px: its full fare's, or a bonus tag's. */
const biggest = (l, c) => {
  const cls = classOf(fareFor(c, false));
  const s = { w: Math.max(TAGS[cls].w, TAGS.seating.w), h: Math.max(TAGS[cls].h, TAGS.seating.h) };
  const p = cityAt(c);
  return { x: l.map.x + p.x - s.w / 2, y: l.map.y + p.y - s.h / 2, w: s.w, h: s.h };
};

test("the gate fits every screen: the board, the ladder, Hammer and the travelers' heads in the frame", () => {
  for (const [w, h] of SHAPES) {
    const l = gateLayout(w, h, GATE_INSETS);
    const f = l.frame;
    const rects = [
      { x: l.board.x, y: l.board.y, w: 1180, h: 720 },
      l.ladder,
      { x: l.hammer - PERSON.stand.w / 2, y: l.floor - PERSON.stand.h, w: PERSON.stand.w, h: PERSON.stand.h },
      ...Object.values(l.travelers).map((x) => ({ x: x - PERSON.seat.w / 2, y: l.seats.floor - PERSON.seat.head, w: PERSON.seat.w, h: PERSON.seat.head })),
    ];
    for (const r of rects) assert.ok(r.x >= f.x - 1 && r.y >= f.y - 1 && r.x + r.w <= f.x + f.w + 1 && r.y + r.h <= f.y + f.h + 1, `${w}x${h}: ${JSON.stringify(r)} outside`);
    assert.equal(l.upright, w < h);
    assert.ok(l.camera.zoom > 0 && Number.isFinite(l.camera.x + l.camera.y));
  }
});

test("nobody stands or sits over a city's tag, and the map's bottom is 150 above the floor, so the agent's head and shoulders cover its lowest 160", () => {
  for (const [w, h] of SHAPES) {
    const l = gateLayout(w, h, GATE_INSETS);
    assert.ok(Math.abs(l.floor - (l.map.y + GATE_MAP.h) - 150) <= 1, `${w}x${h}`);
    assert.ok(l.floor - 318 <= l.map.y + GATE_MAP.h - FARES.agent.band, `${w}x${h}: the agent reaches the band`);
    const people = [
      { x: l.hammer - PERSON.stand.w / 2, y: l.floor - PERSON.stand.h, w: PERSON.stand.w, h: PERSON.stand.h },
      { x: l.podium - PERSON.stand.w / 2, y: l.floor - PERSON.stand.h, w: PERSON.stand.w, h: PERSON.stand.h },
      ...Object.values(l.travelers).map((x) => ({ x: x - PERSON.seat.w / 2, y: l.seats.floor - PERSON.seat.head, w: PERSON.seat.w, h: PERSON.seat.head })),
    ];
    for (const c of CITY_CODES.filter((c) => c !== "SAT"))
      for (const p of people) assert.ok(!overlaps(p, biggest(l, c)), `${w}x${h}: someone over ${c}`);
  }
});

test("the gate's sounds: a whoosh on the throw, a thunk on the stick, the printer and a ding on a booking, a boom at A1", () => {
  assert.deepEqual(cuesFor({ type: "fdThrow", at: { x: 0, y: 0 } }), ["whoosh"]);
  assert.deepEqual(cuesFor({ type: "fdStick", at: { x: 0, y: 0 }, outcome: "book", booking: null, points: 342, tag: 1 }), ["thunk", "print", "ding"]);
  assert.deepEqual(cuesFor({ type: "fdStick", at: { x: 0, y: 0 }, outcome: "miss", booking: null, points: 0, tag: null }), ["thunk"]);
  assert.deepEqual(cuesFor({ type: "fdPreferred" }), ["boom"]);
});

import { GATE_INSULTS, GATE_GLOATS, GATE_PISSED } from "../src/game/lines.ts";

test("a scalpel sticking shakes the screen a little", () => {
  assert.deepEqual(feelOf({ type: "fdStick", at: { x: 0, y: 0 }, outcome: "book", booking: null, points: 342, tag: 1 }), { hitstop: 0, trauma: 0.15 });
});

test("his gate lines, word for word (R5 §7): twelve insults, four gloats, five pissed, all thoughts", () => {
  assert.deepEqual(GATE_INSULTS.map((l) => l.text), [
    "You CHECKED a bag? Amateur.",
    "Group C. Enjoy the middle seat.",
    "That is not a personal item. That is a footlocker.",
    "Shoes ON, sir. This is a gate, not a spa.",
    "A neck pillow. At the gate. Bold.",
    "Pre-boarding? For WHAT?",
    "You don't line up before your number. That's not how numbers work.",
    "No assigned seats and you still found a way to be wrong.",
    "Speakerphone. At a gate. Incredible.",
    "That's a four-dollar water. You paid it. I watched.",
    "Real travelers carry on.",
    "Fly much? No. Clearly not.",
  ]);
  assert.deepEqual(GATE_GLOATS.map((l) => l.text), ["Watch and learn, trainees.", "I've flown more miles than this airport.", "Write that down. That's a technique.", "Rapid Rewards. Rapidly."]);
  assert.deepEqual(GATE_PISSED.map((l) => l.text), ["Who moved the board?", "Somebody coughed.", "STOP. LOOKING. AT ME.", "That one doesn't count. Practice throw.", "I'll be writing to the manufacturer."]);
  for (const l of [...GATE_INSULTS, ...GATE_GLOATS, ...GATE_PISSED]) assert.equal(l.clip, undefined, l.text);
});

import { WALK_OUT, walkOutFrom, stepWalkOut } from "../src/render/walk-out.ts";

test("out of the shuttle door: the can when cans came, the nuts with a full smash, and any move puts the can away so nothing is over his face (the final review)", () => {
  assert.deepEqual(walkOutFrom({ cans: 3, grade: "C GROUP" }), { can: WALK_OUT.can, nuts: 0 });
  assert.deepEqual(walkOutFrom({ cans: 0, grade: "B GROUP" }), { can: 0, nuts: WALK_OUT.nuts });
  assert.deepEqual(WALK_OUT, { can: 3, nuts: 2 });
  const w = stepWalkOut({ can: 3, nuts: 2 }, 0.5, false);
  assert.ok(Math.abs(w.can - 2.5) < 1e-9 && Math.abs(w.nuts - 1.5) < 1e-9, "both run down");
  const moved = stepWalkOut(w, 1 / 120, true);
  assert.equal(moved.can, 0, "a wipe, a snot rocket, a lob or a swing puts the can away");
  assert.ok(moved.nuts > 1.4, "the nuts keep spilling");
  assert.equal(stepWalkOut(moved, 1 / 120, false).can, 0, "and it stays away");
  assert.deepEqual(stepWalkOut({ can: 0.001, nuts: 0 }, 0.5, false), { can: 0, nuts: 0 }, "never below zero");
});

test("the towel at the gate sounds like the shift's: the cloth as he starts, a ding as his hand is steady again", () => {
  assert.deepEqual(cuesFor({ type: "fdTowel", on: true }), ["cloth"]);
  assert.deepEqual(cuesFor({ type: "fdTowel", on: false }), ["ding"]);
});

import { SONGS } from "../src/game/audio.ts";
import { questMusic } from "../src/render/sound.ts";
import { createHungry, HUNGRY as HUNGRY_ROUND } from "../src/sim/quests/hungry/hungry.ts";
import { createFares } from "../src/sim/quests/fares/fares.ts";

// The side quests' own music (owner, 2026-10-25: "some other bonkers music for this side quest and hungry hungry hammer").
test("every song: whole bars of sixteenths, notes in range, drum lines a bar long, the gags inside the song; the side quests' fast", () => {
  assert.deepEqual(Object.keys(SONGS).sort(), ["arena", "banquet", "basel", "campus", "cellar", "flight", "french", "gate", "hallway", "lobby", "lobby-night", "lounge", "paris", "restaurant", "sat", "suite", "title", "tower", "train"]);
  for (const name of ["banquet", "gate"]) assert.ok(SONGS[name].step <= 0.12, `${name}: a side quest's quick sixteenth`);
  for (const [name, s] of Object.entries(SONGS)) {
    assert.ok(s.lead.length > 0 && s.lead.length % 16 === 0, `${name}: whole bars`);
    assert.equal(s.bass.length, s.lead.length, `${name}: the bass as long as the lead`);
    for (const n of [...s.lead, ...s.bass]) assert.ok(n === 0 || (n >= 28 && n <= 100), `${name}: note ${n}`);
    // The musette and its quick cousin are waltzes: twelve steps a bar.
    const bar = name === "paris" || name === "french" ? 12 : 16;
    for (const line of [s.kick, s.snare, s.hat]) assert.equal(line.length, bar, `${name}: a drum line a bar long`);
    assert.ok(s.step >= 0.07 && s.step <= 0.24, `${name}: a sixteenth of ${s.step} s`);
    for (const at of Object.keys(s.gags)) assert.ok(Number(at) >= 0 && Number(at) < s.lead.length, `${name}: a gag on step ${at}`);
    if (s.double) assert.ok(s.double.from >= 0 && s.double.to <= s.lead.length && s.double.from < s.double.to, `${name}: the doubling inside the song`);
  }
});

test("each side quest plays its own song: the banquet's speeds up for the frenzy, the gate's while he is on a streak", () => {
  const h = createHungry(3, { practice: true });
  assert.deepEqual(questMusic(h), { theme: "banquet", hurry: false });
  h.time = HUNGRY_ROUND.frenzy.from;
  assert.deepEqual(questMusic(h), { theme: "banquet", hurry: true });
  const q = createFares(3, { practice: true });
  assert.deepEqual(questMusic(q), { theme: "gate", hurry: false });
  q.streak = 3;
  assert.deepEqual(questMusic(q), { theme: "gate", hurry: true });
});

import { floorFocus, FLOOR_LINE } from "../src/render/scene.ts";
import { FLOOR } from "../src/render/ink.ts";

test("the camera's rest focus puts the walking line at 78 percent of the view in landscape, the chest at centre in portrait", () => {
  const scale = (0.315 * 1080) / 340;
  const focus = floorFocus(1080, scale, 0, false);
  assert.ok(Math.abs(((0 - focus) * scale) / 1080 + 0.5 - FLOOR_LINE) < 1e-6);
  assert.equal(floorFocus(844, scale, 0, true), -340 * 0.55);
  assert.equal(FLOOR.depth, 420);
  // The front face reaches past the bottom of any landscape view: no ground shows under a floor.
  for (const [w, h] of [[1920, 1080], [1280, 800], [2560, 1080], [844, 390]]) {
    const s = (0.315 * h) / 340;
    assert.ok((1 - FLOOR_LINE) * h / s < FLOOR.depth, `${w}x${h}: the face covers the band`);
  }
});

import { TIERS, firstTier, gpuClassOf, isDesktopGpu } from "../src/render/quality.ts";
import { ambientOf, lightsOf } from "../src/render/lighting.ts";
import { stackWalls } from "../src/render/backdrop.ts";
import { TIERS3D, density3dFor } from "../src/render/quality.ts";
import { PALETTE } from "../src/render/palette.ts";
import { LOBBY_NIGHT } from "../src/sim/levels/lobby-night.ts";
test("the 3D view's tiers: density, antialiasing, bloom and ink never rise going down; the sharpest density is an NVIDIA card's", () => {
  const order = ["ultra", "high", "medium", "low"];
  for (let i = 1; i < order.length; i++) {
    const a = TIERS3D[order[i - 1]];
    const b = TIERS3D[order[i]];
    assert.ok(b.density <= a.density && b.aa <= a.aa && Number(b.bloom) <= Number(a.bloom) && Number(b.ink) <= Number(a.ink), `${order[i]} under ${order[i - 1]}`);
  }
  assert.equal(density3dFor("ultra", "NVIDIA GeForce RTX 4070"), 2);
  assert.equal(density3dFor("ultra", "AMD Radeon 780M"), 1.5);
  assert.equal(density3dFor("medium", "NVIDIA GeForce RTX 4070"), 1);
});
test("a housekeeper knocked down lies flat, her painted skirt out along the floor; everyone else sits", () => {
  const flat = solve(castPose({ role: "bellhop", act: "down", t: 0, speed: 0, onGround: true, sit: false, spin: 0, hits: 0, flat: true }), 1, 0.26);
  const sat = solve(castPose({ role: "bellhop", act: "down", t: 0, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 }), 1, 0.26);
  const span = (s) => Math.abs(s.joints.neck.y - s.joints.pelvis.y);
  assert.ok(span(flat) < span(sat) * 0.25, `${span(flat)} against ${span(sat)}`);
});
test("the tower's walls stack a floor at a time: each row's floor line on its landing, alternating, up past the top, the lower floors over the upper", () => {
  const walls = [{ width: 1426, height: 1024, floor: 786 }, { width: 1432, height: 1024, floor: 787 }];
  const rows = stackWalls({ bounds: { x: -400, y: -8200, w: 3200, h: 8800 }, floors: { every: 540 } }, walls, 0.25, 1400);
  assert.equal(rows.length, 16, "up past the top of the bounds");
  assert.deepEqual(rows.map((r) => r.floor), Array.from({ length: 16 }, (_, i) => 16 - i), "the highest first: a lower floor's top covers an upper floor's carpet");
  for (const r of rows) {
    assert.equal(r.y, -540 * (r.floor - 1));
    assert.ok(Math.abs(r.scale * walls[r.columns[0].index].floor - 540) < 1e-6, "floor to the landing above");
    const left = r.columns[0].x;
    const last = r.columns[r.columns.length - 1];
    const k = (w) => 540 / walls[w].floor;
    assert.ok(left <= -400 * 0.25 - 1400, "covers the left of the far plane");
    assert.ok(last.x + walls[last.index].width * k(last.index) >= 2800 * 0.25 + 1400, "and the right");
  }
  for (let i = 1; i < rows.length; i++) assert.notEqual(rows[i].columns[0].index, rows[i - 1].columns[0].index, "alternating a floor at a time");
});
test("a night level has the cool ambient and tighter, brighter lamps; a day level is unchanged", () => {
  assert.deepEqual([ambientOf(LOBBY), ambientOf(LOBBY_NIGHT)], [PALETTE.lobbyAmbient, PALETTE.nightAmbient]);
  const day = lightsOf(LOBBY)[0], night = lightsOf(LOBBY_NIGHT)[0];
  assert.deepEqual([night.radius, night.intensity, night.flicker], [day.radius * 0.7, day.intensity * 1.6, 0.06]);
  assert.deepEqual([day.radius, day.intensity, day.flicker, day.group], [900, 0.5, 0.04, "lobby"]);
  assert.equal(night.group, "lobby-night");
  assert.deepEqual([night.soft, day.soft], [true, undefined]);
});

test("a desktop card by all the browser tells: WebGPU's Intel Arc is vendor intel, architecture xe-hpg; integrated Intel is not", () => {
  assert.equal(gpuClassOf({ vendor: "intel", architecture: "xe-hpg" }), "desktop");
  assert.equal(gpuClassOf({ vendor: "intel", architecture: "xe2" }), "desktop");
  assert.equal(gpuClassOf({ vendor: "intel", architecture: "gen-12lp" }), "other");
  assert.equal(gpuClassOf({ name: "NVIDIA GeForce RTX 4070" }), "desktop");
  assert.equal(gpuClassOf({ vendor: "amd", architecture: "gcn-5" }), "desktop");
  assert.equal(gpuClassOf({}), "other");
});

test("Auto picks ultra on a desktop GPU holding 58 fps, high otherwise; the tiers differ", () => {
  assert.deepEqual([firstTier("desktop", 60), firstTier("desktop", 50), firstTier("other", 60)], ["ultra", "high", "high"]);
  assert.deepEqual(["NVIDIA GeForce RTX 4070 Laptop GPU", "ANGLE (AMD, Radeon RX 7600)", "Intel(R) Iris(R) Xe", "Apple M2", "Mali-G78", "nvidia lovelace", "Intel Arc A770"].map(isDesktopGpu), [true, true, false, false, false, true, true]);
  assert.ok(TIERS.ultra.particles > TIERS.high.particles && TIERS.high.dpr > TIERS.medium.dpr && !TIERS.low.rim);
  assert.deepEqual(TIERS.ultra, { dpr: 2, particles: 900, bloom: true, glows: true, rim: true });
  assert.deepEqual(TIERS.medium, { dpr: 1, particles: 400, bloom: false, glows: true, rim: true });
});

import { START_FRAMES, VENUE_FRAMES } from "../src/render/boards.ts";
import { drawSatFurniture, beltBins, BIN } from "../src/render/venue-sat.ts";
import { SAT } from "../src/sim/levels/sat.ts";
test("SAT has its strip picture's frame and three look frames: the curb, the TSA line, the gate", () => {
  assert.deepEqual(START_FRAMES.sat, { x: 5900, y: 0, cx: 6500, zoom: 0.92 });
  assert.deepEqual(VENUE_FRAMES.sat.map((f) => f.x), [700, 4200, 7700]);
});
test("SAT's eight furniture kinds draw as stand-ins; another venue's are left to it", async () => {
  const { Graphics } = await import("pixi.js");
  for (const f of SAT.furniture.filter((f) => f.kind !== "bar")) assert.ok(drawSatFurniture(new Graphics(), f, null), f.kind);
  assert.equal(drawSatFurniture(new Graphics(), { kind: "bar", x: 0, y: -180, w: 600, h: 180 }, null), false);
  assert.equal(drawSatFurniture(new Graphics(), { kind: "desk", x: 0, y: -180, w: 600, h: 180 }, null), false);
});
test("the X-ray belt's bins ride at its speed and loop", () => {
  const seg = SAT.floor.find((f) => f.belt === 220);
  const a = beltBins(seg, 0);
  const b = beltBins(seg, 0.1);
  const c = beltBins(seg, BIN.gap / seg.belt);
  assert.ok(a.length >= 3, `${a.length} bins`);
  assert.ok(Math.abs(b[0].x - a[0].x - 22) < 1e-6, "22 px in a tenth of a second");
  assert.deepEqual(c.map((p) => Math.round(p.x)), a.map((p) => Math.round(p.x)));
  assert.ok(a.every((p) => p.x >= seg.x0 && p.x <= seg.x1 && p.y === seg.y0));
});

import { padGlyphs } from "../src/components/next-keys.ts";
import { mapPad } from "../src/render/gamepad.ts";
test("with a controller the hint names its buttons in place of the keys", () => {
  assert.equal(padGlyphs("H swings the mallet · hit them with the head"), "X swings the mallet · hit them with the head");
  assert.equal(padGlyphs("Space jumps · over the cart, onto the kiosks"), "A jumps · over the cart, onto the kiosks");
  assert.equal(padGlyphs("Shift runs · the bag belt moves under you"), "RB runs · the bag belt moves under you");
  assert.equal(padGlyphs("F fires a snot rocket · the bartender runs from it"), "B fires a snot rocket · the bartender runs from it");
  assert.equal(padGlyphs("Super smash ready · Q"), "Super smash ready · RT");
  assert.equal(padGlyphs("Overheated · T to towel off"), "Overheated · LB to towel off");
});
test("the standard mapping: the buttons and the left stick to actions, past a dead zone", () => {
  const up = () => Array.from({ length: 17 }, () => ({ pressed: false }));
  const press = (...ids) => {
    const b = up();
    for (const i of ids) b[i].pressed = true;
    return b;
  };
  assert.deepEqual([...mapPad(press(2), [0, 0]).held], ["hammer"]);
  assert.deepEqual([...mapPad(press(0, 5), [0, 0]).held].sort(), ["jump", "run"]);
  assert.deepEqual([...mapPad(up(), [-0.6, 0]).held], ["left"]);
  assert.deepEqual([...mapPad(up(), [-0.2, 0]).held], []);
  assert.deepEqual([...mapPad(up(), [0, 0.7]).held], ["down"]);
  assert.deepEqual([...mapPad(press(15), [0, 0]).held], ["right"]);
  assert.deepEqual([mapPad(press(9), [0, 0]).start, mapPad(up(), [0, 0]).start], [true, false]);
});

import { createGame as createGameR18 } from "../src/sim/game.ts";
import { hudOf as hudOfR18, hudKey as hudKeyR18 } from "../src/render/hud.ts";
import { LOBBY as LOBBY_R18 } from "../src/sim/levels/lobby.ts";
import { STASH as STASH_R18 } from "../src/sim/levels/stash.ts";
test("the HUD carries the run's staff bonked, and a bonk changes it", () => {
  const g = createGameR18({ lobby: LOBBY_R18, stash: STASH_R18 }, 3, { cast: false });
  const a = hudOfR18(g, null);
  g.run.bonked = 4;
  const b = hudOfR18(g, null);
  assert.deepEqual([a.bonked, b.bonked], [0, 4]);
  assert.notEqual(hudKeyR18(a), hudKeyR18(b));
});
test("the HUD tells each run apart: a new run, Try again's included, has a new id", () => {
  const g = createGameR18({ lobby: LOBBY_R18, stash: STASH_R18 }, 3, { cast: false });
  const a = hudOfR18(g, null);
  g.newRun(9);
  const b = hudOfR18(g, null);
  assert.notEqual(a.run, b.run);
  assert.notEqual(hudKeyR18(a), hudKeyR18(b));
});

import { touchHint } from "../src/components/next-keys.ts";
test("on a touch screen the hints name the pad's buttons, SAT's lessons first", () => {
  assert.equal(touchHint("Space jumps · over the cart, onto the kiosks"), "Jump · over the cart, onto the kiosks");
  assert.equal(touchHint("Shift runs · the bag belt moves under you"), "Hold Run · the bag belt moves under you");
  const keys = /\b(Space|Shift|[HFTEQB])\b/;
  for (const l of SAT.lessons) assert.doesNotMatch(touchHint(l.text), keys, l.text);
  for (const h of [
    "Paper incoming · duck, jump or swat with H",
    "Coaster incoming · duck, jump or swat with H",
    "E lectures them · schooled students stop throwing paper",
    "H swings the mallet · hit them with the head",
    "Too hot to run · T to towel off",
    "Overheated · T to towel off",
    "Super smash ready · Q",
    "Mixed nuts · Super Smash ready · Q",
    "F snot rocket · jump into the ! crate for hot pepper",
    "Hot snot pierces · nuts charge Q super smash",
    "Boxes of #15 blades · B lobs one · it freezes staff",
  ])
    assert.doesNotMatch(touchHint(h), keys, h);
  assert.equal(touchHint("GATE B7 · walk in to board"), "GATE B7 · walk in to board");
});

test("the 3D sets: the hall and the cabin, each with its file, length and lamps", () => {
  assert.deepEqual([SETS.hallway.file, SETS.cabin.file, SETS.hallway.length, SETS.cabin.length], ["/sets/hallway.glb", "/sets/cabin.glb", 80, 40]);
  assert.deepEqual(SETS.cabin.lamps, { first: 1.5, every: 3, height: 2.0, strength: 1.2 });
  assert.deepEqual([SETS.cabin.names.curtain, SETS.cabin.names.sign], ["curtain", "sign"]);
  assert.equal(HALLWAY.hall.set, "hallway");
});

const flightGame = () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 61, { cast: true, title: true });
  g.newRun(61, 0, { shift: [FLIGHT], journey: true });
  const none = { held: {}, pressed: {} };
  while (g.mode === "card") g.step(none);
  return { g, step: (s) => { for (let i = 0; i < Math.round(s * 120); i++) g.step(none); } };
};
test("a flight world's hall state carries the purser, her cart, the curtain and the sign", () => {
  const { g, step } = flightGame();
  const of = () => { const s = g.world.snapshot(); return hallStateOf(s, s, 1, g.pickups, null, { crates: g.crates }); };
  const a = of();
  assert.deepEqual([a.boss.person, a.curtain, a.sign, a.cart && a.cart.live], ["purser", false, false, false]);
  assert.deepEqual([a.bin.z, a.bin.used], [rowX(10) / 100, false]);
  assert.ok(a.cast.filter((n) => n.sit).length === 8);
  g.dev.turbulence();
  step(2);
  assert.equal(of().sign, true);
  Object.assign(g.world.flight.cart, { live: true, z: 20 });
  assert.deepEqual(of().cart, { lx: 0, z: 20, live: true });
  Object.assign(g.world.boss, { state: "down" });
  assert.equal(of().curtain, true);
  assert.ok(Math.abs(of().boss.lx) > 0.5, "she has stood aside");
});
test("his jump in the cabin stays under its ceiling, by the set's lift", () => {
  assert.deepEqual([SETS.hallway.lift, SETS.cabin.lift], [1, 0.35]);
  const { g } = flightGame();
  g.world.hero.y = -300;
  const s = g.world.snapshot();
  assert.equal(hallStateOf(s, s, 1, g.pickups, null).hero.y, 3);
  assert.ok(Math.abs(hallStateOf(s, s, 1, g.pickups, null, { lift: SETS.cabin.lift }).hero.y - 1.05) < 1e-9);
});
test("his back crouches while ↓ is held, and the cabin's sprint shows his run at the cabin's pace", () => {
  const { g } = flightGame();
  const h = g.world.hero;
  assert.equal(backClipOf({ ...h, crouch: true, onGround: true, move: null, hurtT: 0, stunT: 0 }, 0).clip, "crouch");
  assert.equal(backClipOf({ ...h, vx: 390, onGround: true, move: null, hurtT: 0, stunT: 0 }, 0, 0.5).clip, "run");
  assert.equal(backClipOf({ ...h, vx: 200, onGround: true, move: null, hurtT: 0, stunT: 0 }, 0, 0.5).clip, "walk");
  assert.equal(backCycle({ vx: 390 }, 0.5) > backCycle({ vx: 200 }, 0.5), true);
});

test("a layout places the hotel's two floors over one wall and the street's walls after it, the lower floor cut at the floor above", () => {
  const wall = (n) => ({ file: n, width: 1536, height: 1024, floor: 768, top: "#000000" });
  const walls = wallsFor(PARIS, { walls: { "paris-far-1": wall("1"), "paris-far-2": wall("2"), "paris-far-3": wall("3"), "paris-far-4": wall("4") } });
  const at = placementsOf(PARIS.backdrop, walls);
  assert.equal(at.length, 8);
  assert.deepEqual([at[0].x, at[0].y, at[0].above, at[1].x, at[1].y, at[1].above, at[2].x, at[2].y, at[2].above], [0, 0, 540, 0, -540, 768, 1536, 0, 768]);
  assert.deepEqual(at.map((p) => p.wall.file), ["1", "2", "3", "4", "3", "4", "3", "4"]);
  assert.equal(PARIS.backdrop.far.pan, 1, "the painted lift and desk stand where the sim's do");
});
test("the televisions flicker, never quite dark", () => {
  const seen = new Set();
  for (let t = 0; t < 4; t += 0.05) {
    const a = screenGlow(t, 2);
    assert.ok(a > 0.05 && a <= 1.01);
    seen.add(Math.round(a * 10));
  }
  assert.ok(seen.size > 3);
});

test("the flat cabin draws the drinks cart too: while she waits it is the one rolling; hers at her hands while she is up; none once she is down", () => {
  const { g } = flightGame();
  const flat = () => flatCabinOf(g.world.snapshot());
  assert.deepEqual([flat().cart.lx, Math.round(flat().cart.z * 100) / 100, flat().cart.live], [0, 37.53, false], "her cart at her hands, as she waits");
  Object.assign(g.world.flight.cart, { live: true, z: 20 });
  assert.deepEqual(flat().cart, { lx: 0, z: 20, live: true }, "the drinks cart while it rolls");
  Object.assign(g.world.boss.cart, { live: true, z: 36.2 });
  assert.deepEqual(flat().cart, { lx: 0, z: 36.2, live: true }, "hers while she pushes");
  assert.equal(flat().curtain, 3883);
  Object.assign(g.world.boss, { state: "down" });
  g.world.boss.cart.live = false;
  g.world.flight.cart.live = false;
  assert.deepEqual([flat().cart, flat().curtain], [null, null]);
  g.world.missiles.push({ id: 1, kind: "bag", x: 500, y: 0, vx: 0, vy: 0, spin: 0, life: 1, phase: 0, from: 0, lx: 0.9 }, { id: 2, kind: "plane", x: 500, y: 0, vx: 0, vy: 0, spin: 0, life: 1, phase: 0, from: 0 });
  assert.equal(flat().bags.length, 1);
});

import { countrysidePhase, countryWindows, roomWallOf } from "../src/render/backdrop.ts";
import { clockTime } from "../src/render/venue-train.ts";
import { TRAIN, coachX } from "../src/sim/levels/train.ts";

const trainWalls = () => Object.fromEntries(TRAIN.backdrop.walls.map((n) => [n, { file: n, width: 1536, height: 1024, floor: 768, top: "#000000", ...(n.startsWith("train") ? { windows: [[160, 141, 307, 226], [614, 141, 307, 226], [1069, 141, 307, 226]] } : {}) }]));
test("a room's own wall wins over the list's order", () => {
  const walls = trainWalls();
  assert.equal(roomWallOf(TRAIN, 10, { walls }).file, "train-far-2", "coach 10, the bistro");
  assert.equal(roomWallOf(TRAIN, 2, { walls }).file, "train-far-1");
  assert.equal(roomWallOf(TRAIN, 19, { walls }).file, "train-far-3", "coach 1");
  assert.equal(roomWallOf(TRAIN, 0, { walls }).file, "station-1");
  assert.equal(roomWallOf({ rooms: [{ id: "a", x0: 0, x1: 1 }], backdrop: { walls: ["x"] } }, 0, { walls: { x: { file: "x" } } }).file, "x", "by order where it names none");
  assert.equal(roomWallOf(TRAIN, 2, { walls: {} }), null);
});
test("the countryside shows fields before the tunnel and hills after, in every coach's three windows", () => {
  assert.equal(countrysidePhase(TRAIN, coachX(13)), "fields");
  assert.equal(countrysidePhase(TRAIN, coachX(11)), "hills");
  assert.equal(countrysidePhase(TRAIN, coachX(13), true), "hills", "once the tunnel is passed it stays hills");
  const rects = countryWindows(TRAIN, { walls: trainWalls() });
  assert.equal(rects.length, 18 * 3);
  assert.deepEqual(rects[0], { x: coachX(18) + 80, y: (141 - 768) / 2, w: 153.5, h: 113 });
});
test("the hall's clock reads 13:58 with the whole stretch left and 14:02 when it runs out", () => {
  assert.deepEqual([clockTime(120), clockTime(60), clockTime(0), clockTime(null)], ["13:58", "14:00", "14:02", "14:02"]);
});

import { fadeOfBoss } from "../src/render/boss-view.ts";
test("the conductor fades out at the end of his retreat, not popping off the screen; nobody else does", () => {
  const c = { kind: "conductor", state: "retreat", timer: 1 };
  assert.equal(fadeOfBoss(c), 1);
  assert.equal(fadeOfBoss({ ...c, timer: 0.15 }), 0.5);
  assert.equal(fadeOfBoss({ ...c, timer: 0 }), 0);
  assert.equal(fadeOfBoss({ ...c, state: "block", timer: 0 }), 1);
  assert.equal(fadeOfBoss({ kind: "purser", state: "retreat", timer: 0 }), 1);
});

import { BASEL as BASEL_STREET } from "../src/sim/levels/basel.ts";
test("a layout with a missing wall draws a block and the rest: Basel's bridge and Marktplatz show before the bank and the old town are painted", () => {
  const W = { file: "x", width: 1536, height: 1024, floor: 768, top: "#000000" };
  const walls = wallsFor(BASEL_STREET, { walls: { "basel-far-2": W, "basel-far-3": W } });
  assert.deepEqual([walls?.length, walls?.[0], walls?.[1], walls?.[2], walls?.[3]], [4, null, W, W, null]);
  assert.deepEqual(BASEL_STREET.backdrop.layout.map((p) => [p.wall, p.x]), [["basel-far-1", -1536], ["basel-far-1", 0], ["basel-far-1", 1536], ["basel-far-2", 3072], ["basel-far-2", 4608], ["basel-far-2", 6144], ["basel-far-4", 7680], ["basel-far-4", 9216], ["basel-far-3", 10752], ["basel-far-3", 12288], ["basel-far-4", 13824]]);
  assert.equal(wallsFor({ backdrop: { walls: ["a", "b"], mid: [], fore: [] } }, { walls: { a: W } }), null, "a row is still all or nothing");
});
import { BaselView } from "../src/render/venue-basel.ts";
import { Container as PixiContainer } from "pixi.js";
import { SCENERY_Z as BACK_Z } from "../src/render/backdrop.ts";
test("Basel's far things, the ferry and the lanterns, stand behind the venue's bleachers and tents", () => {
  const v = new BaselView(new PixiContainer());
  assert.ok(v.far.zIndex < BACK_Z, `the far layer at ${v.far.zIndex}, the venue at ${BACK_Z}`);
});
import { costumeOf, BADGE, badgeAt } from "../src/render/character.ts";
import { solve as solveRig } from "../src/sim/rig/fk.ts";
import { REST_POSE as REST } from "../src/sim/rig/skeleton.ts";
test("a level's costume is scrubs where it says so and the Affliction everywhere else", () => {
  assert.deepEqual([costumeOf({ costume: "scrubs" }), costumeOf(BASEL_STREET), costumeOf({})], ["scrubs", "affliction", "affliction"]);
});
test("the TRAINER badge hangs on his chest below the neckline, facing either way", () => {
  for (const facing of [1, -1]) {
    const s = solveRig(REST, facing, 0.26);
    const b = badgeAt(s);
    const top = b.y - (BADGE.h / 2) * b.scale;
    assert.ok(BADGE.dy > 0 && top > s.joints.neck.y + 10 && b.y < s.joints.pelvis.y, `facing ${facing}: badge top ${top}, neck ${s.joints.neck.y}, pelvis ${s.joints.pelvis.y}`);
    assert.equal(BADGE.text, "TRAINER");
  }
});
