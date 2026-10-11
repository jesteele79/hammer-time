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

test("the fist holds the mallet out in front, head up, in every clip but the slide", () => {
  const DEG = 180 / Math.PI;
  for (const [name, clip] of Object.entries(CLIPS))
    for (const u of [0, 0.25, 0.5, 0.75])
      for (const facing of [1, -1]) {
        const s = solve(clip(u, { ...ctx, facing, speed: 500 }), facing, 0.26);
        const j = s.joints;
        // Screen angles with y up, mirrored so forward is +x either way, squash and stretch
        // divided out: the fist never turns on the handle.
        const ang = (a, b) => Math.atan2(-(b.y - a.y) / s.squash.y, ((b.x - a.x) * facing) / s.squash.x) * DEG;
        const turn = (((ang(j.grip, j.malletHead) - ang(j.wristNear, j.knuckleNear) + 540) % 360) - 180);
        assert.ok(Math.abs(turn - 68) < 1e-6, `${name} u=${u}: the handle sits ${turn.toFixed(2)} degrees from the hand`);
        if (name === "slide") continue;
        assert.ok((j.malletHead.x - j.neck.x) * facing > 60 * s.scale, `${name} u=${u}: the head is out in front`);
        assert.ok(j.malletHead.y < j.grip.y - 80 * s.scale, `${name} u=${u}: the head stands above the fist`);
      }
});


import { ACTIONS, ACTION_MASK, displayU, overlay, wipeHand, armTo } from "../src/sim/rig/actions.ts";
import { MOVE_SECONDS, SWING_CUT, SUPER_CUT } from "../src/sim/moves.ts";

const KINDS = ["swing", "super", "snot", "wipe"];

test("two-bone IK puts the wrist on a reachable target with the hand at the asked angle", () => {
  for (const [arm, target, hand, bend] of [["near", { x: 40, y: 200 }, 10, -1], ["near", { x: -50, y: 320 }, 150, 1], ["far", { x: -20, y: 380 }, 80, 1]]) {
    const r = armTo(arm, target, hand, bend);
    const p = { ...REST_POSE, rot: { ...REST_POSE.rot } };
    const [s, e, w] = arm === "near" ? ["shoulderNear", "elbowNear", "wristNear"] : ["shoulderFar", "elbowFar", "wristFar"];
    p.rot[s] = r.shoulder; p.rot[e] = r.elbow; p.rot[w] = r.wrist;
    const solved = solve(p, 1, 0.26);
    const wrist = solved.joints[arm === "near" ? "wristNear" : "wristFar"];
    const want = { x: target.x * solved.scale, y: -target.y * solved.scale };
    assert.ok(Math.hypot(wrist.x - want.x, wrist.y - want.y) < 0.5, `${arm} wrist off by ${Math.hypot(wrist.x - want.x, wrist.y - want.y)}`);
  }
});

test("every drawn frame of every move keeps the face clear, both ways, at every head scale", () => {
  for (const kind of KINDS)
    for (let i = 0; i <= 400; i++)
      for (const facing of [1, -1])
        for (const headScale of [0.22, 0.26, 0.3]) {
          const u = displayU(kind, i / 400);
          const r = faceClear(solve(ACTIONS[kind](u), facing, headScale));
          assert.ok(r.ok, `${kind} u=${u} facing ${facing} head ${headScale}: ${r.offender}`);
        }
});

test("blending each move in over 0.06 s and out over 0.12 s from every clip keeps the face clear", () => {
  for (const kind of KINDS)
    for (const [name, clip] of Object.entries(CLIPS))
      for (let i = 0; i <= 12; i++) {
        const w = i / 12;
        const base = clip(0.5, { ...ctx, speed: 500 });
        for (const u of [displayU(kind, (0.06 / MOVE_SECONDS[kind]) * w), displayU(kind, 1)]) {
          const p = overlay(base, ACTIONS[kind](u), ACTION_MASK[kind], w);
          const r = faceClear(solve(p, 1, 0.26));
          assert.ok(r.ok, `${name} + ${kind} at weight ${w.toFixed(2)}: ${r.offender}`);
        }
      }
});

test("the cut hides the strike over the head: no drawn frame falls inside it", () => {
  for (const [kind, cut] of [["swing", SWING_CUT], ["super", SUPER_CUT]])
    for (let i = 0; i <= 400; i++) {
      const u = displayU(kind, i / 400);
      assert.ok(!(u > cut[0] && u < cut[1]), `${kind} draws u=${u}`);
    }
});

test("the swing loads behind him, strikes in front, follows through low and returns to the hold", () => {
  const head = (u, facing = 1) => solve(ACTIONS.swing(u), facing, 0.26).joints.malletHead;
  for (const facing of [1, -1]) {
    assert.ok(head(0.3, facing).x * facing < -60, `loaded behind (facing ${facing})`);
    assert.ok(head(0.36, facing).x * facing > 120, `strikes in front (facing ${facing})`);
    assert.ok(head(0.5, facing).y > -150, "follows through low");
  }
  const ready = solve(CLIPS.idle(0, ctx), 1, 0.26).joints.malletHead;
  const end = head(1);
  assert.ok(Math.hypot(end.x - ready.x, end.y - ready.y) < 2, "ends in the hold");
});

test("the super's slam puts the mallet head on the floor in front", () => {
  const s = solve(ACTIONS.super(0.6), 1, 0.26);
  const dy = groundShift(s, "planted");
  assert.ok(Math.abs(s.joints.malletHead.y + dy) < 30, `the head meets the floor: ${s.joints.malletHead.y + dy}`);
  assert.ok(s.joints.malletHead.x > 60, "in front");
});

test("the towel hand works behind the head and never reaches the face", () => {
  for (let i = 0; i <= 200; i++) {
    const u = i / 200;
    const s = solve(ACTIONS.wipe(u), 1, 0.26);
    const hand = s.joints.handFar;
    if (u > 0.15 && u < 0.6) assert.ok(hand.y < s.joints.neck.y, `u=${u}: the hand is up at the head`);
    assert.ok(hand.x < s.faceBox.x - 10 || hand.y < s.faceBox.y - 20 || hand.y > s.faceBox.y + s.faceBox.h + 10, `u=${u}: hand clear of the face`);
  }
  assert.ok(wipeHand(0.3).y > 330, "the strokes are on the scalp");
});

test("the fist never turns on the handle during any move", () => {
  const DEG = 180 / Math.PI;
  for (const kind of KINDS)
    for (let i = 0; i <= 40; i++) {
      const s = solve(ACTIONS[kind](i / 40), 1, 0.26);
      const j = s.joints;
      const ang = (a, b) => Math.atan2(-(b.y - a.y) / s.squash.y, (b.x - a.x) / s.squash.x) * DEG;
      const turn = ((ang(j.grip, j.malletHead) - ang(j.wristNear, j.knuckleNear) + 540) % 360) - 180;
      assert.ok(Math.abs(turn - 68) < 1e-6, `${kind} ${i / 40}: ${turn}`);
    }
});

