import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAR_FLOOR, HERO_HEIGHT, JOINTS, NECK_REST_Y, REST_POSE } from "../src/sim/rig/skeleton.ts";
import { groundShift } from "../src/sim/rig/ground.ts";
import { CLIPS, blend } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { faceClear } from "../src/sim/rig/face.ts";

const ctx = { t: 0, speed: 0, vy: 0, facing: 1 };

test("the rest pose stands 340 px tall with the near sole on the floor and the head on the neck", () => {
  const s = solve(REST_POSE, 1, 0.26);
  const soleY = Math.max(s.joints.toeNear.y, s.joints.heelNear.y);
  assert.ok(Math.abs(soleY) < 1, `near sole at y=0: ${soleY}`);
  assert.ok(Math.abs(s.crown.y + HERO_HEIGHT) < 0.5, `crown at -340: ${s.crown.y}`);
  assert.ok(Math.abs(s.parts.head.x - s.joints.neck.x) < 12, "the head sits on the neck");
});

test("the head sits down in the collar, so its own neck runs into the shirt", () => {
  // In the body painting's pixels, drawn the painting's way (facing left).
  const cuts = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8"));
  const span = cuts.rig.sole - cuts.rig.joints.neck[1];
  const s = solve(REST_POSE, -1, 0.26);
  const K = (s.scale * NECK_REST_Y) / span;
  const crop = (p) => ({ x: cuts.rig.rootX + p.x / K, y: cuts.rig.sole + p.y / K });
  const seat = crop(s.parts.head);
  // The collar's top edge across the throat, measured off the painting.
  const collar = [[302, 316], [322, 302], [342, 290], [362, 277], [382, 266]];
  const collarY = (x) => {
    for (let i = 1; i < collar.length; i++)
      if (x <= collar[i][0]) {
        const [a, b] = [collar[i - 1], collar[i]];
        return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
      }
    return collar[collar.length - 1][1];
  };
  assert.ok(seat.y > collarY(seat.x) + 15, `its stub sits down in the collar: ${seat.y.toFixed(0)} against the collar at ${collarY(seat.x).toFixed(0)}`);
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


import { ACTIONS, ACTION_MASK, displayU, overlay, armTo } from "../src/sim/rig/actions.ts";
import { MOVE_SECONDS, SWING_CUT, SUPER_CUT, WIPE_SCRUB } from "../src/sim/moves.ts";
import { FREE, HOLD } from "../src/sim/rig/clips.ts";
import { pose } from "../src/sim/rig/pose.ts";

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

// The one exception to the face rule: his left hand wipes his face with the towel (owner, 2026-10-11).
const FACE_ALLOWED = { swing: [], super: [], snot: [], wipe: ["far upper arm", "far forearm"] };

test("every drawn frame of every move keeps the face clear, both ways, at every head scale", () => {
  for (const kind of KINDS)
    for (let i = 0; i <= 400; i++)
      for (const facing of [1, -1])
        for (const headScale of [0.22, 0.26, 0.3]) {
          const u = displayU(kind, i / 400);
          const r = faceClear(solve(ACTIONS[kind](u), facing, headScale), FACE_ALLOWED[kind]);
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
          const r = faceClear(solve(p, 1, 0.26), FACE_ALLOWED[kind]);
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

test("for the wipe his right hand drops the mallet low in front of his legs, then lifts it back to the hold", () => {
  for (const facing of [-1, 1]) {
    for (let k = 0; k <= 40; k++) {
      const u = WIPE_SCRUB[0] + ((WIPE_SCRUB[1] - WIPE_SCRUB[0]) * k) / 40;
      const s = solve(ACTIONS.wipe(u), facing, 0.26);
      assert.ok(s.joints.malletHead.y > s.joints.kneeNear.y - 40, `facing ${facing}, u ${u.toFixed(2)}: the mallet head hangs about knee height`);
      assert.ok((s.joints.malletHead.x - s.joints.grip.x) * facing > 0, `facing ${facing}, u ${u.toFixed(2)}: it hangs in front of him`);
    }
    for (const u of [0, 1]) {
      const s = solve(ACTIONS.wipe(u), facing, 0.26);
      assert.ok(s.joints.malletHead.y < s.faceBox.y + s.faceBox.h, `facing ${facing}, u ${u}: the mallet is up in the hold`);
    }
  }
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


test("both arms move smoothly through the whole wipe: no step jumps the towel hand or the mallet", () => {
  // A jump is a step whose travel leaps past its neighbour's; a fast swing speeds up gradually.
  const du = 1 / 120 / MOVE_SECONDS.wipe;
  for (const part of ["handFar", "malletHead"]) {
    let prev = null,
      last = 0,
      fastest = 0,
      spike = 0,
      at = 0;
    for (let k = 0; k * du <= 1 + 1e-9; k++) {
      const u = Math.min(1, k * du);
      const h = solve(ACTIONS.wipe(u), 1, 0.26).joints[part];
      if (prev) {
        const d = Math.hypot(h.x - prev.x, h.y - prev.y);
        fastest = Math.max(fastest, d);
        if (Math.abs(d - last) > spike) [spike, at] = [Math.abs(d - last), u];
        last = d;
      }
      prev = h;
    }
    assert.ok(spike < 10, `the ${part}'s step changes by ${spike.toFixed(0)} px at u ${at.toFixed(3)}`);
    assert.ok(fastest < 40, `the ${part} covers ${fastest.toFixed(0)} px in one step`);
  }
});

test("the wipe starts and ends with the far arm hanging as it does at rest", () => {
  const hang = solve(pose({ rot: { ...HOLD, shoulderFar: FREE } }), 1, 0.26).joints.handFar;
  for (const u of [0, 1]) {
    const h = solve(ACTIONS.wipe(u), 1, 0.26).joints.handFar;
    const d = Math.hypot(h.x - hang.x, h.y - hang.y);
    assert.ok(d < 3, `at u ${u} the far hand is ${d.toFixed(1)} px from where it hangs`);
  }
});

test("through the scrub his left hand comes up and wipes his face", () => {
  for (const facing of [-1, 1])
    for (let k = 0; k <= 40; k++) {
      const u = WIPE_SCRUB[0] + 0.01 + ((WIPE_SCRUB[1] - WIPE_SCRUB[0] - 0.02) * k) / 40;
      const s = solve(ACTIONS.wipe(u), facing, 0.26);
      const w = s.joints.wristFar,
        h = s.joints.handFar;
      const palm = { x: w.x + (h.x - w.x) * 0.5, y: w.y + (h.y - w.y) * 0.5 };
      const f = s.faceBox;
      const inside = palm.x > f.x && palm.x < f.x + f.w && palm.y > f.y && palm.y < f.y + f.h;
      assert.ok(inside, `facing ${facing}, u ${u.toFixed(2)}: the palm is on his face`);
    }
});

import { BACK } from "../src/sim/rig/ground.ts";

test("a spin turns the whole body about the pelvis and the head with it, level to his body within 8 degrees", () => {
  for (const facing of [1, -1]) {
    const upright = solve(pose({ rot: { ...HOLD, shoulderFar: FREE } }), facing, 0.26);
    const over = solve(pose({ rot: { ...HOLD, shoulderFar: FREE }, spin: 90 }), facing, 0.26);
    const p0 = upright.joints.pelvis,
      p1 = over.joints.pelvis;
    assert.ok(Math.hypot(p1.x - p0.x, p1.y - p0.y) < 1e-6, "the pelvis stays put");
    const d0 = { x: upright.joints.neck.x - p0.x, y: upright.joints.neck.y - p0.y };
    const d1 = { x: over.joints.neck.x - p1.x, y: over.joints.neck.y - p1.y };
    // A quarter turn backward: on screen, up becomes behind him.
    assert.ok(Math.abs(d1.x - d0.y * facing) < 1e-6 && Math.abs(d1.y + d0.x * facing) < 1e-6, `facing ${facing}: ${JSON.stringify(d1)}`);
    const rel = -over.parts.head.rotation * facing - (over.spin * Math.PI) / 180;
    assert.ok(Math.abs(rel) <= (8 * Math.PI) / 180 + 1e-9, `the head turns with him: ${rel}`);
  }
});

test("'body' grounding stands him on his soles, and lays him flat on his back when he is down", () => {
  const stand = solve(REST_POSE, 1, 0.26);
  assert.ok(Math.abs(groundShift(stand, "body") - groundShift(stand, "planted")) < 1e-9);
  for (const facing of [1, -1]) {
    const down = solve(pose({ spin: 90 }), facing, 0.26);
    const dy = groundShift(down, "body");
    const j = down.joints;
    const spine = Math.max(j.pelvis.y, j.chest.y, j.neck.y) + dy;
    // His back, his head or his heels touch the floor; his spine lies just above it, never in it.
    assert.ok(spine <= -BACK * down.scale + 1e-6, `facing ${facing}: the spine is ${spine} px down`);
    assert.ok(spine > -BACK * down.scale - 30, `facing ${facing}: flat on the floor, not floating: ${spine}`);
    for (const name of ["heelNear", "toeNear", "heelFar", "toeFar"]) assert.ok(j[name].y + dy <= 1e-6, `${name} out of the floor`);
  }
});

import { LAYERS, addBody, addLean, breathNow, createLayers, squashNow, stepLayers } from "../src/sim/rig/layers.ts";

const STEP_S = 1 / 120;
const runLayers = (s, seconds, vx, facing = 1) => {
  for (let i = 0; i < Math.round(seconds / STEP_S); i++) stepLayers(s, { vx: vx(i * STEP_S), facing }, [], STEP_S);
};

test("he leans into acceleration up to 9 degrees, back when he brakes, and not at a steady run", () => {
  const s = createLayers();
  // Ground acceleration reaches the run in 0.177 s.
  runLayers(s, 0.17, (t) => Math.min(780, 4400 * t));
  assert.ok(s.lean > 7.5 && s.lean <= 9 + 1e-9, `speeding up: ${s.lean}`);
  runLayers(s, 0.6, () => 780);
  assert.ok(Math.abs(s.lean) < 0.5, `steady: ${s.lean}`);
  runLayers(s, 0.12, (t) => Math.max(0, 780 - 5600 * t));
  assert.ok(s.lean < -6 && s.lean >= -9 - 1e-9, `braking: ${s.lean}`);
  const l = createLayers();
  runLayers(l, 0.17, (t) => -Math.min(780, 4400 * t), -1);
  assert.ok(l.lean > 7.5, `facing left, speeding up leans forward too: ${l.lean}`);
  assert.equal(addLean(pose({ lean: 3 }), s).lean, 3 + s.lean);
});

test("a landing squashes 0.92 by 1.08 and is back to normal in 0.09 s; a jump stretches 1.06 by 0.95", () => {
  const s = createLayers();
  stepLayers(s, { vx: 0, facing: 1 }, [{ type: "land", x: 0, y: 0, speed: 1900 }], 1e-6);
  const q = squashNow(s);
  assert.ok(Math.abs(q.x - LAYERS.land.x) < 1e-3 && Math.abs(q.y - LAYERS.land.y) < 1e-3, JSON.stringify(q));
  assert.deepEqual([LAYERS.land.x, LAYERS.land.y, LAYERS.land.t], [1.08, 0.92, 0.09]);
  runLayers(s, 0.09, () => 0);
  assert.deepEqual(squashNow(s), { x: 1, y: 1 });
  stepLayers(s, { vx: 0, facing: 1 }, [{ type: "jump" }], 1e-6);
  const j = squashNow(s);
  assert.ok(Math.abs(j.x - 0.95) < 1e-3 && Math.abs(j.y - 1.06) < 1e-3, JSON.stringify(j));
  const p = addBody(pose(), s);
  assert.ok(Math.abs(p.squash.y - j.y) < 1e-9, "the stretch lands on the pose");
});

test("his chest breathes 1.5 percent either way at 0.4 Hz", () => {
  const s = createLayers();
  let lo = 2,
    hi = 0;
  for (let i = 0; i < 300; i++) {
    stepLayers(s, { vx: 0, facing: 1 }, [], 0.01);
    lo = Math.min(lo, breathNow(s));
    hi = Math.max(hi, breathNow(s));
  }
  assert.ok(Math.abs(hi - 1.015) < 1e-3 && Math.abs(lo - 0.985) < 1e-3, `${lo}..${hi}`);
  assert.equal(LAYERS.breathHz, 0.4);
});

test("the belly springs from a hard landing up to 0.04 and settles without overshoot", () => {
  const s = createLayers();
  stepLayers(s, { vx: 0, facing: 1 }, [{ type: "land", x: 0, y: 0, speed: 2600 }], STEP_S);
  let peak = 0,
    under = 0;
  for (let i = 0; i < 120; i++) {
    stepLayers(s, { vx: 0, facing: 1 }, [], STEP_S);
    peak = Math.max(peak, s.belly);
    under = Math.min(under, s.belly);
  }
  assert.ok(peak > 0.03 && peak <= 0.04 + 1e-9, `peak ${peak}`);
  assert.ok(under > -1e-3, `no overshoot: ${under}`);
  assert.ok(Math.abs(s.belly) < 1e-3, `settled: ${s.belly}`);
});
