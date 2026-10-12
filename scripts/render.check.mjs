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
          assert.ok(ahead(p) && p.y < s.joints.neck.y, `facing ${facing}, u ${(k / 400).toFixed(3)}: over his head but not up in front of his neck`);
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
  const snap = (cartX, blobs) => ({ time: 0, hero: null, targets: [{ id: 1, x: cartX, y: -40 }], snot: blobs, puddles: [] });
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

import { HUD_HINT, hudKey, hudOf } from "../src/render/hud.ts";

test("the HUD payload carries the meters, clamped, and changes only when what it shows does", () => {
  const a = hudOf({ heat: 41.2, sinus: 2.04, charge: 3, patience: 3 }, "/art/hammer/head-three-quarter.png");
  assert.deepEqual([a.heat, a.sinus, a.charge, a.patience, a.patienceMax, a.chargeMax, a.sinusMax], [41.2, 2.04, 3, 3, 3, 10, 3]);
  assert.equal(a.hint, HUD_HINT);
  assert.equal(hudKey(a), hudKey(hudOf({ heat: 41.4, sinus: 2.02, charge: 3, patience: 3 }, a.portrait)), "noise does not re-render");
  assert.notEqual(hudKey(a), hudKey(hudOf({ heat: 42.6, sinus: 2.04, charge: 3, patience: 3 }, a.portrait)));
  assert.equal(hudOf({ heat: 140, sinus: -1, charge: 12, patience: 5 }, null).heat, 100);
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
