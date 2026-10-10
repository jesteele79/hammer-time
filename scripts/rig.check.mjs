import test from "node:test";
import assert from "node:assert/strict";
import { HERO_HEIGHT, REST_POSE } from "../src/sim/rig/skeleton.ts";
import { CLIPS, blend } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { faceClear } from "../src/sim/rig/face.ts";

const ctx = { t: 0, speed: 0, vy: 0, facing: 1 };

test("the rest pose stands 340 px tall with the feet on the floor and the head on the neck", () => {
  const s = solve(REST_POSE, 1, 0.26);
  const feetY = Math.max(s.joints.ankleNear.y, s.joints.ankleFar.y);
  assert.ok(Math.abs(feetY) < 1, `feet at y=0: ${feetY}`);
  assert.ok(Math.abs(s.crown.y + HERO_HEIGHT) < 6, `crown at -340: ${s.crown.y}`);
  assert.ok(Math.abs(s.parts.head.x - s.joints.neck.x) < 12 && s.parts.head.y <= s.joints.neck.y);
});

test("walk and run clips cycle the legs and keep the head within 8 degrees of level", () => {
  for (const name of ["walk", "run"]) {
    let maxTilt = 0,
      swing = 0;
    for (let i = 0; i <= 60; i++) {
      const p = CLIPS[name](i / 60, { ...ctx, speed: name === "run" ? 640 : 400 });
      const s = solve(p, 1, 0.26);
      maxTilt = Math.max(maxTilt, Math.abs(s.parts.head.rotation));
      swing = Math.max(swing, Math.abs(s.joints.ankleNear.x - s.joints.ankleFar.x));
    }
    assert.ok(maxTilt <= (8 * Math.PI) / 180 + 1e-9, `${name} head tilt ${maxTilt}`);
    assert.ok(swing > 60, `${name} stride ${swing}`);
  }
});

test("blending two poses at 0 and 1 returns each pose; at 0.5 the midpoint", () => {
  const a = CLIPS.idle(0, ctx),
    b = CLIPS.crouch(1, ctx);
  assert.deepEqual(blend(a, b, 0), a);
  assert.deepEqual(blend(a, b, 1), b);
  const m = blend(a, b, 0.5);
  assert.ok(Math.abs(m.lean - (a.lean + b.lean) / 2) < 1e-9);
});

test("no sampled frame of any clip puts a limb or the mallet over the face", () => {
  for (const [name, clip] of Object.entries(CLIPS))
    for (let i = 0; i <= 400; i++)
      for (const facing of [1, -1]) {
        const s = solve(clip(i / 400, { ...ctx, facing, speed: 500 }), facing, 0.3);
        const r = faceClear(s);
        assert.ok(r.ok, `${name} u=${i / 400} facing ${facing}: ${r.offender} crosses the face`);
      }
});

test("no blend between any two clips, at any head scale, with the run lean, crosses the face", () => {
  const names = Object.keys(CLIPS);
  for (const a of names)
    for (const b of names) {
      if (a === b) continue;
      for (const headScale of [0.22, 0.26, 0.3])
        for (let i = 0; i <= 20; i++) {
          const pa = CLIPS[a](0.5, { ...ctx, speed: 640 });
          const pb = CLIPS[b](0.5, { ...ctx, speed: 640 });
          const p = blend(pa, pb, i / 20);
          p.lean += 6;
          const r = faceClear(solve(p, 1, headScale));
          assert.ok(r.ok, `${a}->${b} t=${i / 20} head ${headScale}: ${r.offender} crosses the face`);
        }
    }
});

test("facing left mirrors the solved rig exactly", () => {
  const p = CLIPS.run(0.3, { ...ctx, speed: 640 });
  const r = solve(p, 1, 0.26),
    l = solve(p, -1, 0.26);
  assert.ok(Math.abs(r.joints.wristNear.x + l.joints.wristNear.x) < 1e-6);
  assert.ok(Math.abs(r.joints.wristNear.y - l.joints.wristNear.y) < 1e-6);
});
