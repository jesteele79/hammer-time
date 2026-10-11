import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldStepDown, WORK_BUDGET_MS } from "../src/render/quality.ts";
import { skinLayer, bodyScale, layerFile } from "../src/render/skin.ts";
import { CLIPS } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { REST_POSE } from "../src/sim/rig/skeleton.ts";
import { placeWord, wordBox } from "../src/render/words.ts";
import { TOWEL, hangTowel, towelChain, towelOverHead } from "../src/render/towel.ts";
import { ACTIONS } from "../src/sim/rig/actions.ts";
import { sweptHeadHits } from "../src/sim/hits.ts";

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

test("the towel hangs from the hand and never swings in front of the head's back", () => {
  // The hand itself stays behind the line (the rig keeps it clear of the face); the towel follows it.
  let pts = [];
  for (let i = 0; i < 120; i++) {
    const anchor = { x: 380 + Math.sin(i / 6) * 40, y: 300 + Math.cos(i / 5) * 40 };
    pts = towelChain(anchor, pts, 8, 18, 420);
    assert.deepEqual(pts[0], anchor);
    for (const p of pts) assert.ok(p.x <= 420 + 1e-9, `towel point at ${p.x} crosses 420`);
  }
  // A towel left hanging in front of the line is pulled behind it on the next frame.
  const front = Array.from({ length: 8 }, (_, i) => ({ x: 520, y: 300 + 18 * i }));
  for (const p of towelChain({ x: 400, y: 300 }, front, 8, 18, 420).slice(1))
    assert.ok(p.x <= 420 + 1e-9, `towel point at ${p.x} stays in front of 420`);
});

test("the towel in his far hand never covers his face through the whole wipe, either way he faces", () => {
  for (const facing of [-1, 1])
    for (const scale of [0.22, 0.26, 0.3])
      for (const frames of [55, 400]) {
        let chain = [];
        for (let k = 0; k <= frames; k++) {
          const u = 0.04 + (0.91 * k) / frames;
          const solved = solve(ACTIONS.wipe(u), facing, scale);
          chain = hangTowel(solved, chain);
          const world = chain.map((p) => ({ x: p.x * facing, y: p.y }));
          for (let i = 1; i < world.length; i++)
            assert.ok(
              !sweptHeadHits(world[i - 1], world[i], TOWEL.width / 2, solved.faceBox),
              `facing ${facing}, head ${scale}, u ${u.toFixed(3)}: towel segment ${i} covers the face`,
            );
        }
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

test("the towel hand goes over his head only above his neck and behind it, and switches where it covers nothing", () => {
  for (const facing of [-1, 1]) {
    let was = false,
      over = 0;
    for (let k = 0; k <= 400; k++) {
      const s = solve(ACTIONS.wipe(k / 400), facing, 0.26);
      const now = towelOverHead(s);
      const behind = (p) => (p.x - s.joints.neck.x) * facing <= 2;
      if (now) {
        over++;
        for (const p of [s.joints.wristFar, s.joints.handFar])
          assert.ok(behind(p) && p.y < s.joints.neck.y, `facing ${facing}, u ${(k / 400).toFixed(3)}: over his head but not above and behind his neck`);
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
    assert.ok(over > 150, `facing ${facing}: the hand is over his head through the rub (${over} of 401 frames)`);
  }
});
