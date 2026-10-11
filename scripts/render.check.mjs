import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldStepDown, WORK_BUDGET_MS } from "../src/render/quality.ts";
import { skinLayer, bodyScale } from "../src/render/skin.ts";
import { CLIPS } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { REST_POSE } from "../src/sim/rig/skeleton.ts";

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
