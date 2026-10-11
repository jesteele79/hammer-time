import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAR_FLOOR, HERO_HEIGHT, JOINTS, REST_POSE } from "../src/sim/rig/skeleton.ts";
import { groundShift } from "../src/sim/rig/ground.ts";
import { CLIPS, blend } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { faceClear } from "../src/sim/rig/face.ts";

const ctx = { t: 0, speed: 0, vy: 0, facing: 1 };

test("the rest pose stands 340 px tall with the near sole on the floor and the head on the neck", () => {
  const s = solve(REST_POSE, 1, 0.26);
  const soleY = Math.max(s.joints.toeNear.y, s.joints.heelNear.y);
  assert.ok(Math.abs(soleY) < 1, `near sole at y=0: ${soleY}`);
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

test("the skeleton's rest pose is the painted body, joint for joint", () => {
  const { rig } = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8"));
  const u = 296 / (rig.sole - rig.joints.neck[1]);
  for (const [name, [x, y]] of Object.entries(rig.joints)) {
    const rest = JOINTS[name].rest;
    assert.ok(Math.abs(rest.x - (rig.rootX - x) * u) < 0.05, `${name} x: ${rest.x}`);
    assert.ok(Math.abs(rest.y - (rig.sole - y) * u) < 0.05, `${name} y: ${rest.y}`);
  }
});

test("grounding stands the lowest sole on its floor line: the near one at 0, the far one higher by perspective", () => {
  for (const [name, u] of [["idle", 0], ["crouch", 1], ["land", 0], ["slide", 0.5]]) {
    const s = solve(CLIPS[name](u, ctx), 1, 0.26);
    const dy = groundShift(s, "planted");
    const lift = FAR_FLOOR * s.scale * s.squash.y;
    const lowest = Math.max(s.joints.toeNear.y, s.joints.heelNear.y, s.joints.toeFar.y + lift, s.joints.heelFar.y + lift);
    assert.ok(Math.abs(lowest + dy) < 1e-6, `${name}: lowest sole after grounding ${lowest + dy}`);
  }
  // Mid-stride with the near foot swung up, the far foot carries him on its own line.
  let farPlanted = false;
  for (let i = 0; i < 40; i++) {
    const s = solve(CLIPS.walk(i / 40, { ...ctx, speed: 400 }), 1, 0.26);
    const dy = groundShift(s, "planted");
    const near = Math.max(s.joints.toeNear.y, s.joints.heelNear.y) + dy;
    if (near < -6) farPlanted = true;
  }
  assert.ok(farPlanted, "some walk frames lift the near foot clear while the far foot stands");
  const flight = solve(CLIPS.run(0.2, { ...ctx, speed: 640 }), 1, 0.26);
  assert.ok(groundShift(flight, "push") <= 0, "a run's flight is never pulled down to the floor");
});
