import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAR_FLOOR, HERO_HEIGHT, JOINTS, NECK_REST_Y, REST_POSE } from "../src/sim/rig/skeleton.ts";
import { groundShift } from "../src/sim/rig/ground.ts";
import { CLIPS, blend } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { faceClear } from "../src/sim/rig/face.ts";

const ctx = { t: 0, speed: 0, vy: 0, facing: 1 };

test("the rest pose stands on the near sole, his head sunk 9 rest units into the collar from 340 px, the body its old size", () => {
  const s = solve(REST_POSE, 1, 0.26);
  const soleY = Math.max(s.joints.toeNear.y, s.joints.heelNear.y);
  assert.ok(Math.abs(soleY) < 1, `near sole at y=0: ${soleY}`);
  // Owner, 2026-10-12, option C: the head down and a little forward; the body is not scaled up to make up for it.
  assert.ok(Math.abs(s.crown.y + HERO_HEIGHT - 9 * s.scale) < 0.5, `crown 9 units under -340: ${s.crown.y}`);
  const seat = { x: (s.parts.head.x - s.joints.neck.x) / s.scale, y: (s.parts.head.y - s.joints.neck.y) / s.scale };
  assert.ok(Math.abs(seat.x - 8) < 0.5 && Math.abs(seat.y - 18) < 0.5, `the head 8 forward and 18 down from the neck: ${JSON.stringify(seat)}`);
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

test("the fist holds the mallet out in front, head up, in every clip but the slide and the flop", () => {
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
        if (name === "slide" || name === "flop") continue;
        assert.ok((j.malletHead.x - j.neck.x) * facing > 60 * s.scale, `${name} u=${u}: the head is out in front`);
        assert.ok(j.malletHead.y < j.grip.y - 80 * s.scale, `${name} u=${u}: the head stands above the fist`);
      }
});


import { ACTIONS, ACTION_MASK, displayU, overlay, armTo } from "../src/sim/rig/actions.ts";
import { MOVE_SECONDS, SWING_CUT, SUPER_CUT, WIPE_SCRUB } from "../src/sim/moves.ts";
import { FREE, HOLD } from "../src/sim/rig/clips.ts";
import { pose } from "../src/sim/rig/pose.ts";

const KINDS = ["swing", "super", "snot", "wipe", "lecture", "watch", "tap", "hurt", "tumble", "throw", "lob"];

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

// The exceptions to the face rule, his left arm only: it wipes his face with the towel (owner,
// 2026-10-11) and presses his nose for the snot rocket (owner, 2026-10-12).
// At the gate (R5) his fist holds a scalpel, not the mallet, which leans on his cart: its own probe is below.
const FACE_ALLOWED = { swing: [], super: [], snot: ["far upper arm", "far forearm"], wipe: ["far upper arm", "far forearm"], lecture: [], watch: [], tap: [], hurt: [], tumble: [], throw: ["mallet handle", "mallet head"], lob: [] };

// The owner's head scale is 0.26; the sweep keeps a margin either side of it. Since the head sank into
// the collar (2026-10-12), a head as small as 0.22 would meet the slam's folded-over arm.
test("every drawn frame of every move keeps the face clear, both ways, at every head scale", () => {
  for (const kind of KINDS)
    for (let i = 0; i <= 400; i++)
      for (const facing of [1, -1])
        for (const headScale of [0.24, 0.26, 0.3]) {
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


test("every act moves smoothly: no step jumps a hand, the mallet or his head", () => {
  for (const kind of ["wipe", "lecture", "watch", "tap", "hurt", "tumble", "lob"]) {
    const du = 1 / 120 / MOVE_SECONDS[kind];
    for (const part of ["handFar", "malletHead", "neck"]) {
      let prev = null,
        last = 0,
        fastest = 0,
        spike = 0,
        at = 0;
      for (let k = 0; k * du <= 1 + 1e-9; k++) {
        const u = Math.min(1, k * du);
        const h = solve(ACTIONS[kind](u), 1, 0.26).joints[part];
        if (prev) {
          const d = Math.hypot(h.x - prev.x, h.y - prev.y);
          fastest = Math.max(fastest, d);
          if (Math.abs(d - last) > spike) [spike, at] = [Math.abs(d - last), u];
          last = d;
        }
        prev = h;
      }
      assert.ok(spike < 10, `${kind}: the ${part}'s step changes by ${spike.toFixed(0)} px at u ${at.toFixed(3)}`);
      assert.ok(fastest < 40, `${kind}: the ${part} covers ${fastest.toFixed(0)} px in one step`);
    }
  }
});

test("for the snot rocket his left hand comes up and presses his nose through the blow, then drops back to the hang", () => {
  const hang = solve(pose({ rot: { ...HOLD, shoulderFar: FREE } }), 1, 0.26).joints.handFar;
  for (const u of [0, 1]) {
    const h = solve(ACTIONS.snot(u), 1, 0.26).joints.handFar;
    assert.ok(Math.hypot(h.x - hang.x, h.y - hang.y) < 3, `at u ${u} the left hand hangs at his side`);
  }
  for (const facing of [1, -1])
    for (let i = 25; i <= 62; i++) {
      const s = solve(ACTIONS.snot(i / 100), facing, 0.26);
      const d = Math.hypot(s.joints.handFar.x - s.nose.x, s.joints.handFar.y - s.nose.y);
      assert.ok(d < 16, `facing ${facing}, u ${i / 100}: the left hand is ${d.toFixed(0)} px from his nose`);
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
    assert.ok(spine <= -BACK * down.scale + 1, `facing ${facing}: the spine is ${spine} px down`);
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

import { plantFeet } from "../src/sim/rig/feet.ts";
import { legTo } from "../src/sim/rig/ik.ts";

const slope = (deg) => (dx) => dx * Math.tan((deg * Math.PI) / 180);
const soles = (r, facing) => {
  const s = solve(r.pose, facing, 0.26);
  const lift = FAR_FLOOR * s.scale * s.squash.y;
  return [
    ["Near", 0],
    ["Far", -lift],
  ].map(([leg, line]) => ({
    line,
    pts: [s.joints[`heel${leg}`], s.joints[`toe${leg}`]].map((q) => ({ x: q.x, y: q.y + r.dy })),
  }));
};

test("leg IK puts the ankle on a reachable target with the foot at the asked angle", () => {
  for (const [leg, target, foot] of [
    ["near", { x: -10, y: 40 }, -20],
    ["far", { x: 30, y: 60 }, -10],
  ]) {
    const r = legTo(leg, target, foot, 1);
    const p = pose({ rot: leg === "near" ? { hipNear: r.hip, kneeNear: r.knee, ankleNear: r.ankle } : { hipFar: r.hip, kneeFar: r.knee, ankleFar: r.ankle } });
    const s = solve(p, 1, 0.26);
    const a = s.joints[leg === "near" ? "ankleNear" : "ankleFar"];
    assert.ok(Math.hypot(a.x - target.x * s.scale, a.y + target.y * s.scale) < 0.5, `${leg} ankle off`);
  }
});

test("on a flat floor foot IK changes nothing", () => {
  for (const [name, u] of [
    ["idle", 0],
    ["walk", 0.3],
    ["crouch", 0],
  ]) {
    const p = CLIPS[name](u, { ...ctx, speed: 400 });
    const r = plantFeet(p, 1, 0.26, undefined, "planted", () => 0);
    assert.deepEqual(r.pose, p);
    assert.equal(r.dy, groundShift(solve(p, 1, 0.26), "planted"));
  }
});

test("foot IK stands both soles on a slope within 2 px, up to 30 degrees either way, facing either way", () => {
  for (const deg of [-30, -20, -10, 10, 20, 30])
    for (const facing of [1, -1])
      for (const [name, u] of [
        ["idle", 0],
        ["idle", 0.5],
        ["crouch", 0],
        ["land", 0.5],
        ["walk", 0],
        ["walk", 0.5],
      ]) {
        const floor = slope(deg);
        const r = plantFeet(CLIPS[name](u, { ...ctx, speed: 400 }), facing, 0.26, undefined, "planted", floor);
        assert.ok(Number.isFinite(r.dy) && r.gap <= 2, `${name} ${u} ${deg}° facing ${facing}: a planted sole is ${r.gap.toFixed(2)} px off`);
        for (const { line, pts } of soles(r, facing))
          for (const q of pts)
            assert.ok(q.y - (floor(q.x) + line) <= 2, `${name} ${u} ${deg}° facing ${facing}: a sole sinks ${(q.y - floor(q.x) - line).toFixed(2)} px`);
      }
});

test("a foot over a ledge or a ramp's foot leaves him on his counter, sinks nothing, makes no NaN", () => {
  const idle = CLIPS.idle(0, ctx);
  const level = groundShift(solve(idle, 1, 0.26), "planted");
  // The back foot hangs over the counter's end: the floor there is 180 px down.
  const ledge = plantFeet(idle, 1, 0.26, undefined, "planted", (dx) => (dx < -10 ? 180 : 0));
  assert.ok(Math.abs(ledge.dy - level) < 1e-9, `kept on the counter: ${ledge.dy} vs ${level}`);
  const gap = plantFeet(idle, 1, 0.26, undefined, "planted", (dx) => (dx < -10 ? null : 0));
  assert.ok(Number.isFinite(gap.dy) && JSON.stringify(gap.pose).indexOf("null") < 0, "no NaN over a gap");
  for (const facing of [1, -1]) {
    const kink = (dx) => (dx * facing < 0 ? 0 : dx * facing * Math.tan((25 * Math.PI) / 180) * -1);
    const r = plantFeet(idle, facing, 0.26, undefined, "planted", kink);
    for (const { line, pts } of soles(r, facing)) for (const q of pts) assert.ok(q.y - (kink(q.x) + line) <= 2, `facing ${facing}: a sole sinks at the ramp's foot`);
  }
});

import { TUMBLE_LAND } from "../src/sim/moves.ts";

const holdAt = (facing) => solve(CLIPS.idle(0, ctx), facing, 0.26);
const near2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 2;

test("the head stays within 8 degrees of his body in every move", () => {
  for (const kind of KINDS)
    for (let i = 0; i <= 100; i++)
      for (const facing of [1, -1]) {
        const s = solve(ACTIONS[kind](i / 100), facing, 0.26);
        const rel = -s.parts.head.rotation * facing - (s.spin * Math.PI) / 180;
        assert.ok(Math.abs(rel) <= (8 * Math.PI) / 180 + 1e-9, `${kind} u ${i / 100}: ${rel}`);
      }
});

test("the lecture points the mallet ahead at chest height and wags it, from the hold and back", () => {
  for (const facing of [1, -1]) {
    const s = solve(ACTIONS.lecture(0.5), facing, 0.26);
    const j = s.joints;
    assert.ok((j.malletHead.x - j.neck.x) * facing > 150, `aimed ahead (facing ${facing})`);
    assert.ok(j.malletHead.y > s.faceBox.y + s.faceBox.h && j.malletHead.y < j.pelvis.y, "between his chin and his belt");
    for (const u of [0, 1]) assert.ok(near2(solve(ACTIONS.lecture(u), facing, 0.26).joints.malletHead, holdAt(facing).joints.malletHead), `u ${u}: the hold`);
  }
  const ys = Array.from({ length: 41 }, (_, i) => solve(ACTIONS.lecture(0.3 + (0.4 * i) / 40), 1, 0.26).joints.malletHead.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 30, `it wags ${Math.max(...ys) - Math.min(...ys)} px`);
});

test("the watch check brings his left wrist up in front of his chest, above the mallet fist, and back to the hang", () => {
  for (const facing of [1, -1]) {
    for (let i = 0; i <= 20; i++) {
      const u = 0.2 + (0.6 * i) / 20;
      const s = solve(ACTIONS.watch(u), facing, 0.26);
      const j = s.joints;
      assert.ok((j.wristFar.x - j.chest.x) * facing > 40 * s.scale, `u ${u}: in front of his chest`);
      assert.ok(Math.abs(j.wristFar.y - j.chest.y) < 40 * s.scale, `u ${u}: at chest height`);
      assert.ok(j.wristFar.y < j.wristNear.y - 24 * s.scale, `u ${u}: clear above the mallet fist, so the watch shows`);
    }
    for (const u of [0, 1]) assert.ok(near2(solve(ACTIONS.watch(u), facing, 0.26).joints.handFar, holdAt(facing).joints.handFar), `u ${u}: hanging`);
  }
});

test("the foot tap lifts his near toe twice a second with the heel planted, harrumphs, and never bobs", () => {
  const rest = holdAt(1);
  let taps = 0,
    up = false,
    lift = 0;
  for (let k = 0; k <= MOVE_SECONDS.tap * 120; k++) {
    const u = k / (MOVE_SECONDS.tap * 120);
    const s = solve(ACTIONS.tap(u), 1, 0.26);
    assert.ok(Math.hypot(s.joints.heelNear.x - rest.joints.heelNear.x, s.joints.heelNear.y - rest.joints.heelNear.y) < 0.5, `u ${u}: the heel stays`);
    assert.ok(Math.abs(groundShift(s, "planted") - groundShift(rest, "planted")) < 0.5, `u ${u}: no bob`);
    const l = rest.joints.toeNear.y - s.joints.toeNear.y;
    lift = Math.max(lift, l);
    if (l > 4 && !up) taps++;
    up = l > 4;
  }
  assert.ok(lift > 8, `the toe lifts ${lift} px`);
  assert.equal(taps, 5, "five taps before the harrumph");
});

test("the hurt throws his head and shoulders back with the mallet low, away from his face, and recovers", () => {
  for (const facing of [1, -1]) {
    const rest = holdAt(facing);
    assert.ok((solve(ACTIONS.hurt(0.2), facing, 0.26).joints.neck.x - rest.joints.neck.x) * facing < -10, "thrown back");
    for (let i = 0; i <= 20; i++) {
      const q = solve(ACTIONS.hurt(0.1 + (0.5 * i) / 20), facing, 0.26);
      assert.ok(q.joints.malletHead.y > q.faceBox.y + q.faceBox.h, "the mallet head stays below his chin");
    }
    assert.ok(near2(solve(ACTIONS.hurt(1), facing, 0.26).joints.malletHead, rest.joints.malletHead), "back in the hold");
  }
});

test("the tumble goes over backward, lies flat on his back on the floor, and gets up to the hold", () => {
  for (const facing of [1, -1]) {
    for (const u of [0.36, 0.5, 0.6]) {
      const s = solve(ACTIONS.tumble(u), facing, 0.26);
      const j = s.joints;
      const ang = (Math.atan2(-(j.neck.y - j.pelvis.y), (j.neck.x - j.pelvis.x) * facing) * 180) / Math.PI;
      assert.ok(Math.abs(Math.abs(ang) - 180) < 15, `u ${u} facing ${facing}: flat, head behind him (${ang.toFixed(0)}°)`);
      const dy = groundShift(s, "body");
      assert.ok(Math.abs(j.chest.y + dy) < 50 * s.scale, `u ${u}: on his back on the floor`);
    }
    const end = solve(ACTIONS.tumble(1), facing, 0.26);
    for (const n of ["neck", "malletHead", "toeNear"]) assert.ok(near2(end.joints[n], holdAt(facing).joints[n]), `stands up: ${n}`);
  }
  assert.ok(solve(ACTIONS.tumble(TUMBLE_LAND), 1, 0.26).spin > 60, "most of the way over by the landing frame");
});

import { groundForAction } from "../src/sim/rig/ground.ts";

test("touching down never snaps him: each act grounds the same way in the air as on the floor, near the landing", () => {
  for (const kind of ["tumble", "hurt", "super"]) {
    const from = kind === "super" ? 0.5 : 0;
    for (let i = 0; i <= 40; i++) {
      const u = from + ((1 - from) * i) / 40;
      const s = solve(ACTIONS[kind](u), 1, 0.26);
      const air = groundShift(s, groundForAction(kind, "fall", false, u));
      const floor = groundShift(s, groundForAction(kind, "idle", true, u));
      assert.ok(Math.abs(air - floor) < 2, `${kind} u ${u.toFixed(3)}: lands with a ${(floor - air).toFixed(0)} px snap`);
    }
  }
});

import { createPlayback, playAction } from "../src/sim/rig/playback.ts";

test("a hit mid-move takes over from where his limbs were: nothing pops, and the hit-stop freezes the blend", () => {
  for (const [kind, at] of [
    ["wipe", 0.4],
    ["watch", 0.5],
    ["lecture", 0.5],
  ]) {
    const p = createPlayback();
    const base = CLIPS.idle(0, ctx);
    const move = { kind, t: 0, fired: false, burst: false, lastU: -1, stroke: -1, victims: [], held: 0 };
    let drawn = null;
    for (let t = 0; t <= at * MOVE_SECONDS[kind]; t += 1 / 60) {
      move.t = t;
      drawn = playAction(p, base, move, 1 / 60);
    }
    const before = solve(drawn, 1, 0.26).joints;
    const hurt = { kind: "hurt", t: 0, fired: false, burst: false, lastU: -1, stroke: -1, victims: [], held: 0 };
    const frozen = playAction(p, base, hurt, 0);
    const still = solve(frozen, 1, 0.26).joints;
    for (const part of ["handFar", "malletHead"])
      assert.ok(Math.hypot(still[part].x - before[part].x, still[part].y - before[part].y) < 1e-6, `${kind}: the frozen frame keeps the ${part} where it was`);
    hurt.t = 1 / 60;
    const next = solve(playAction(p, base, hurt, 1 / 60), 1, 0.26).joints;
    // Where the hurt alone would put him: the blend in covers a 60th of a second of its 0.06 s, not all of it.
    const goal = solve(overlay(base, ACTIONS.hurt(1 / 60 / MOVE_SECONDS.hurt), "whole", 1), 1, 0.26).joints;
    for (const part of ["handFar", "malletHead"]) {
      const d = Math.hypot(next[part].x - before[part].x, next[part].y - before[part].y);
      const all = Math.hypot(goal[part].x - before[part].x, goal[part].y - before[part].y);
      assert.ok(d <= 0.35 * all + 1, `${kind}: the ${part} moves ${d.toFixed(0)} of ${all.toFixed(0)} px in the first frame of the hurt`);
    }
  }
});

import { ARM_BONES, HAMMER, skeletonFrom } from "../src/sim/rig/skeleton.ts";
import { HEAD_PLATE_DEFAULT } from "../src/art/registry.ts";

const HAMMER_CUT = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8")).rig;
const paintedOf = (rig) => ({ joints: rig.joints, sole: rig.sole, rootX: rig.rootX });
/** Hammer's painting with both arms swung `a` radians about their shoulders, in the crop's pixels. */
const swung = (rig, a) => {
  const joints = structuredClone(rig.joints);
  const turn = (about, names) => {
    const [cx, cy] = rig.joints[about];
    for (const n of names) {
      const [x, y] = rig.joints[n];
      joints[n] = [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
    }
  };
  turn("shoulderNear", ["elbowNear", "wristNear", "knuckleNear", "handNear", "grip"]);
  turn("shoulderFar", ["elbowFar", "wristFar", "handFar"]);
  return { ...paintedOf(rig), joints };
};
const close = (a, b, tol) => Math.abs(a - b) < tol;

test("a skeleton from Hammer's own painting is his skeleton, nothing turned", () => {
  const s = skeletonFrom(paintedOf(HAMMER_CUT));
  for (const [name, j] of Object.entries(JOINTS)) {
    const r = s.joints[name].rest;
    assert.ok(close(r.x, j.rest.x, 0.06) && close(r.y, j.rest.y, 0.06), `${name}: ${r.x},${r.y}`);
    assert.ok(Math.abs(s.turns[name] ?? 0) < 0.003, `${name} turned ${s.turns[name]}`);
  }
  // His far floor is his far toe's height; from the painting it is the far sole's lowest point, his heel, half a unit lower.
  assert.ok(close(s.farFloor, Math.min(JOINTS.toeFar.rest.y, JOINTS.heelFar.rest.y) - Math.min(JOINTS.toeNear.rest.y, JOINTS.heelNear.rest.y), 0.06));
  assert.equal(HAMMER.joints, JOINTS);
  assert.equal(HAMMER.farFloor, FAR_FLOOR);
});

test("a body painted with its arms swung takes Hammer's arm directions at its own lengths, its paint turned back by the swing", () => {
  const s = skeletonFrom(swung(HAMMER_CUT, 0.2));
  for (const [name, j] of Object.entries(JOINTS)) {
    const r = s.joints[name].rest;
    assert.ok(close(r.x, j.rest.x, 0.1) && close(r.y, j.rest.y, 0.1), `${name} back on Hammer's stance: ${r.x},${r.y}`);
  }
  const arm = ARM_BONES.map(([, c]) => s.turns[c]);
  assert.ok(arm.every((t) => close(Math.abs(t), 0.2, 0.002)), `each arm bone turned 0.2: ${arm}`);
  assert.ok(arm.every((t) => Math.sign(t) === Math.sign(arm[0])), "all the same way");
  for (const n of ["chest", "neck", "hipNear", "kneeFar", "toeFar", "heelNear"]) assert.ok(Math.abs(s.turns[n] ?? 0) < 0.003, `${n} as painted`);
});

test("a painted body's solve turns its head on its own neck joint, crown at the top, and carries its far floor and turns", () => {
  const skel = skeletonFrom(swung(HAMMER_CUT, 0.2));
  const s = solve(REST_POSE, -1, 0.2, HEAD_PLATE_DEFAULT, skel);
  assert.ok(Math.hypot(s.parts.head.x - s.joints.neck.x, s.parts.head.y - s.joints.neck.y) < 1e-9, "the head turns on the neck joint");
  assert.ok(close(s.crown.y, -HERO_HEIGHT, 0.5), `crown at ${s.crown.y}`);
  assert.equal(s.farFloor, skel.farFloor);
  assert.equal(s.turns, skel.turns);
  const h = solve(REST_POSE, -1, 0.26);
  assert.ok(h.parts.head.y > h.joints.neck.y, "Hammer's plate still sits down in his collar");
  assert.deepEqual(h.turns, {});
  assert.equal(h.farFloor, FAR_FLOOR);
});

import { existsSync } from "node:fs";
const CAST_PEOPLE = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2"].filter((p) => existsSync(`art/cuts/cast-${p}.json`));

test("each cut cast body is pose-locked to Hammer's painting: legs and spine within 15 degrees, arms turned and hands off his under 25", () => {
  assert.ok(CAST_PEOPLE.includes("bellhop-1"));
  const deg = (r) => (r * 180) / Math.PI;
  for (const person of CAST_PEOPLE) {
    const { rig } = JSON.parse(readFileSync(`art/cuts/cast-${person}.json`, "utf8"));
    const s = skeletonFrom({ joints: rig.joints, sole: rig.sole, rootX: rig.rootX }, rig.match ?? ARM_BONES);
    const u = 296 / (rig.sole - rig.joints.neck[1]);
    for (const [p, c] of rig.bones) {
      if (ARM_BONES.some(([a, b]) => a === p && b === c)) {
        assert.ok(Math.abs(deg(s.turns[c])) < 25, `${person}: ${p}->${c} turned ${deg(s.turns[c]).toFixed(1)} degrees`);
        continue;
      }
      const ours = Math.atan2((rig.joints[p][1] - rig.joints[c][1]) * u, (rig.joints[p][0] - rig.joints[c][0]) * u);
      const his = Math.atan2(JOINTS[c].rest.y - JOINTS[p].rest.y, JOINTS[c].rest.x - JOINTS[p].rest.x);
      const off = deg(Math.atan2(Math.sin(ours - his), Math.cos(ours - his)));
      // The hands keep their painted angle to the forearm, so they may sit further off his.
      const hand = p.startsWith("wrist") || p.startsWith("knuckle");
      assert.ok(Math.abs(off) < (hand ? 25 : 15), `${person}: ${p}->${c} is ${off.toFixed(1)} degrees off Hammer's`);
    }
  }
});

test("a painting's pelvis stays where it is painted, and its far floor is the far sole's height above the near one", () => {
  // Hammer's painting with the whole body below the neck dropped 20 px nearer the soles' row... the pelvis moved down 20 px alone.
  const joints = structuredClone(HAMMER_CUT.joints);
  joints.pelvis = [joints.pelvis[0], joints.pelvis[1] + 20];
  const s = skeletonFrom({ joints, sole: HAMMER_CUT.sole, rootX: HAMMER_CUT.rootX });
  const k = 296 / (HAMMER_CUT.sole - HAMMER_CUT.joints.neck[1]);
  assert.ok(close(s.joints.pelvis.rest.y, (HAMMER_CUT.sole - joints.pelvis[1]) * k, 0.06), `pelvis at ${s.joints.pelvis.rest.y}`);
  // Feet painted 10 px above the soles' row: the far floor is still the gap between the two soles' lowest points.
  const raised = { joints: HAMMER_CUT.joints, sole: HAMMER_CUT.sole + 10, rootX: HAMMER_CUT.rootX };
  const j = HAMMER_CUT.joints;
  const gap = (Math.max(j.toeNear[1], j.heelNear[1]) - Math.max(j.toeFar[1], j.heelFar[1])) * (296 / (raised.sole - j.neck[1]));
  assert.ok(close(skeletonFrom(raised).farFloor, gap, 0.06), `far floor ${skeletonFrom(raised).farFloor} against ${gap}`);
});

import { DIVE, divePose, coilPose, diveK } from "../src/sim/rig/dive.ts";

const headLevel = (s) => -s.parts.head.rotation * s.facing;
const DEG8 = (8 * Math.PI) / 180 + 1e-9;

test("a lift turns the head back from his body's line by its degrees, past the 8-degree hold: tipped 40, lifted 40, level", () => {
  for (const facing of [1, -1]) {
    assert.ok(Math.abs(headLevel(solve(pose({ spin: -40, lift: 40 }), facing, 0.26))) < 1e-9);
    assert.ok(Math.abs(headLevel(solve(pose({ spin: -40 }), facing, 0.26)) + (40 * Math.PI) / 180) <= DEG8, "without it the head goes with the body");
  }
  assert.equal(pose({}).lift, 0);
});

test("the dive keeps his head within 8 degrees of level and nothing crosses his face, at every stretch, both facings, with and without the mallet", () => {
  for (const facing of [1, -1])
    for (const mallet of [true, false])
      for (let i = 0; i <= 40; i++) {
        const s = solve(divePose(i / 40, mallet), facing, 0.26);
        assert.ok(Math.abs(headLevel(s)) <= DEG8, `k ${i / 40}, facing ${facing}: head at ${(headLevel(s) * 180) / Math.PI}`);
        const c = faceClear(s);
        assert.ok(c.ok, `k ${i / 40}, facing ${facing}, mallet ${mallet}: ${c.offender}`);
      }
});

test("at full stretch his body is tipped forward by the dive's tip, his far hand down at the cloth under his chin and out ahead of his chest", () => {
  const axisOf = (j) => (Math.atan2(-(j.neck.y - j.pelvis.y), j.neck.x - j.pelvis.x) * 180) / Math.PI;
  const rest = axisOf(solve(pose({}), 1, 0.26).joints);
  const s = solve(divePose(1), 1, 0.26);
  const j = s.joints;
  assert.ok(Math.abs(axisOf(j) - rest + DIVE.tip) < 1, `tipped ${(rest - axisOf(j)).toFixed(1)} degrees`);
  assert.ok(j.handFar.y > s.faceBox.y + s.faceBox.h, "the far hand below his chin");
  assert.ok(j.handFar.x > j.chest.x + 40 * s.scale, "and out ahead of his chest");
});

test("the dive starts from his hold and the coil from standing: k 0 and c 0 are the idle hold, nothing jumps", () => {
  const hold = solve(pose({ rot: { ...HOLD, shoulderFar: FREE } }), 1, 0.26).joints;
  for (const p of [divePose(0), coilPose(0)]) {
    const j = solve(p, 1, 0.26).joints;
    for (const name of ["handFar", "handNear", "malletHead", "neck", "toeNear"]) assert.ok(Math.hypot(j[name].x - hold[name].x, j[name].y - hold[name].y) < 2, name);
  }
  for (let i = 1; i <= 40; i++) {
    const a = solve(divePose((i - 1) / 40), 1, 0.26).joints.handFar;
    const b = solve(divePose(i / 40), 1, 0.26).joints.handFar;
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 20, `a jump of the hand at k ${i / 40}`);
  }
});

test("the coil leans him back and bends his knees, never crossing his face; the body tips as the hand goes out, fully by 160 px", () => {
  for (let i = 0; i <= 20; i++) {
    const s = solve(coilPose(i / 20), 1, 0.26);
    assert.ok(faceClear(s).ok, `coil ${i / 20}`);
  }
  assert.ok(coilPose(1).lean < 0);
  assert.deepEqual([diveK(0), diveK(80), diveK(DIVE.tipBy), diveK(900)], [0, 0.5, 1, 1]);
});

test("on the ground the slam's squat keeps both soles on their floor lines and never slides a shoe", () => {
  for (const facing of [1, -1]) {
    const from = {};
    for (let k = 0; k <= 54; k++) {
      const u = SUPER_CUT[1] + ((1 - SUPER_CUT[1]) * k) / 54;
      const s = solve(ACTIONS.super(u), facing, 0.26);
      const dy = groundShift(s, "planted");
      const lift = FAR_FLOOR * s.scale * s.squash.y;
      for (const name of ["heelNear", "toeNear", "heelFar", "toeFar"]) {
        const q = s.joints[name];
        const line = name.endsWith("Far") ? -lift : 0;
        from[name] ??= q.x;
        assert.ok(Math.abs(q.y + dy - line) <= 3, `facing ${facing}, u ${u.toFixed(2)}: ${name} is ${(line - q.y - dy).toFixed(1)} px off its floor line`);
        assert.ok(Math.abs(q.x - from[name]) <= 4, `facing ${facing}, u ${u.toFixed(2)}: ${name} slides ${(q.x - from[name]).toFixed(1)} px`);
      }
    }
  }
});

// The banquet's belly-flop on the floor (owner, 2026-10-18): his slide drawn flat on his belly.
import { FLOP, flopPose } from "../src/sim/rig/dive.ts";
import { BELLY } from "../src/sim/rig/ground.ts";
import { FLOP_REACH } from "../src/sim/hits.ts";

test("the flop goes over and lies flat on his belly with his head up and level, nothing over his face: every frame, both facings, every head scale", () => {
  for (const headScale of [0.22, 0.26, 0.3])
    for (const facing of [1, -1])
      for (let i = 0; i <= 80; i++) {
        const s = solve(flopPose(i / 80), facing, headScale);
        assert.ok(Math.abs(headLevel(s)) <= DEG8, `u ${i / 80}, facing ${facing}, head ${headScale}: head at ${((headLevel(s) * 180) / Math.PI).toFixed(1)}`);
        const c = faceClear(s);
        assert.ok(c.ok, `u ${i / 80}, facing ${facing}, head ${headScale}: ${c.offender} crosses the face`);
      }
  assert.deepEqual(CLIPS.flop(0.6, ctx), flopPose(0.6), "the slide's flop clip is the floor flop");
});

test("flat out he lies on his belly: his legs level, his belly on the floor and nothing of him under it, his head ahead and the whole of him under the corridor's 220 px", () => {
  const axis = (j, a, b) => (Math.atan2(-(j[b].y - j[a].y), (j[b].x - j[a].x)) * 180) / Math.PI;
  for (const facing of [1, -1])
    for (const u of [FLOP.inAt, 0.7, 1]) {
      const s = solve(flopPose(u), facing, 0.26);
      const dy = groundShift(s, "belly");
      const j = s.joints;
      const ahead = (n) => j[n].x * facing;
      // Mirrored so forward is +x: his hips to his knees run straight back, flat to within 15 degrees.
      const thigh = facing === 1 ? axis(j, "hipNear", "kneeNear") : 180 - axis(j, "hipNear", "kneeNear");
      assert.ok(Math.abs(Math.abs(thigh) - 180) < 15, `u ${u}, facing ${facing}: thigh at ${thigh.toFixed(1)}`);
      // His spine lies a belly's depth over the floor: on it, not floating and not sunk.
      const spine = Math.max(j.pelvis.y, j.chest.y) + dy;
      assert.ok(spine <= -BELLY * s.scale * 0.95 && spine >= -BELLY * s.scale - 2, `u ${u}, facing ${facing}: spine ${spine.toFixed(1)} px up`);
      // Nothing under the floor but the fingers curled round the handle, a hair.
      for (const [n, p] of Object.entries(j)) assert.ok(p.y + dy <= (n === "handNear" ? 16 : 1), `u ${u}, facing ${facing}: ${n} ${(p.y + dy).toFixed(1)} px under the floor`);
      const top = Math.min(s.headBox.y, ...Object.values(j).map((p) => p.y)) + dy;
      assert.ok(top > -200, `u ${u}, facing ${facing}: his top ${top.toFixed(0)} px up, under a pass at 220`);
      assert.ok(ahead("neck") > ahead("pelvis") + 100 * s.scale && ahead("malletHead") > ahead("neck"), "his head, then the mallet, out in front");
      // The flop's reach runs out to the mallet's head, as drawn.
      assert.ok(Math.abs(ahead("malletHead") - FLOP_REACH.ahead) < 20, `the mallet's head ${ahead("malletHead").toFixed(0)} px ahead`);
      assert.ok(-top < FLOP_REACH.tall, "and as tall as drawn");
    }
});

test("standing, 'belly' grounding stands him on his soles, as 'planted' does", () => {
  for (const name of ["idle", "run", "crouch", "land"]) {
    const s = solve(CLIPS[name](0.25, { ...ctx, speed: 640 }), 1, 0.26);
    assert.ok(Math.abs(groundShift(s, "belly") - groundShift(s, "planted")) < 1e-9, name);
  }
});

test("into the flop from any clip and out of it to any clip, the blend never crosses his face", () => {
  for (const name of Object.keys(CLIPS))
    for (const [from, to] of [
      [CLIPS[name](0.25, { ...ctx, speed: 640 }), flopPose(0)],
      [CLIPS[name](0.25, { ...ctx, speed: 640 }), flopPose(0.3)],
      [flopPose(1), CLIPS[name](0.25, { ...ctx, speed: 640 })],
      [flopPose(0.6), CLIPS[name](0, ctx)],
    ])
      for (const headScale of [0.22, 0.26, 0.3])
        for (let i = 0; i <= 20; i++) {
          const r = faceClear(solve(blend(from, to, i / 20), 1, headScale));
          assert.ok(r.ok, `${name}, t ${i / 20}, head ${headScale}: ${r.offender} crosses the face`);
        }
});

import { segmentClear } from "../src/sim/rig/face.ts";
import { LOB_RELEASE } from "../src/sim/rig/actions.ts";
import { THROW_CUT } from "../src/sim/moves.ts";

/** The scalpel in his fist at the gate: 70 units of blade ahead of the grip along the handle's line, 30 of handle behind. */
const scalpelOf = (s) => {
  const g = s.joints.grip, m = s.joints.malletHead;
  const d = Math.hypot(m.x - g.x, m.y - g.y);
  const ux = (m.x - g.x) / d, uy = (m.y - g.y) / d;
  return [{ x: g.x - ux * 30 * s.scale, y: g.y - uy * 30 * s.scale }, { x: g.x + ux * 70 * s.scale, y: g.y + uy * 70 * s.scale }];
};

test("the throw cocks the scalpel behind his head and whips it forward inside a cut: the scalpel clear of his face in every drawn frame", () => {
  for (let i = 0; i <= 400; i++)
    for (const facing of [1, -1])
      for (const headScale of [0.24, 0.26, 0.3]) {
        const u = displayU("throw", i / 400);
        const s = solve(ACTIONS.throw(u), facing, headScale);
        const [butt, tip] = scalpelOf(s);
        assert.ok(segmentClear(s, butt, tip, 8), `throw u=${u} facing ${facing} head ${headScale}: the scalpel`);
        assert.ok(!(u > THROW_CUT[0] && u < THROW_CUT[1]), `throw draws u=${u} inside its cut`);
      }
  const cocked = solve(ACTIONS.throw(THROW_CUT[0]), 1, 0.26), out = solve(ACTIONS.throw(1), 1, 0.26);
  assert.ok(cocked.joints.handNear.y < cocked.joints.neck.y && cocked.joints.handNear.x < cocked.joints.neck.x, "cocked up behind his head");
  assert.ok(out.joints.handNear.x > out.joints.chest.x + 80 && out.joints.handNear.y < out.joints.chest.y, "whipped out ahead");
});

test("the lob swings his free hand from behind his hip to chest height ahead, always under his face", () => {
  for (let i = 0; i <= 400; i++)
    for (const facing of [1, -1]) {
      const s = solve(ACTIONS.lob(i / 400), facing, 0.26);
      assert.ok(s.joints.handFar.y > s.faceBox.y + s.faceBox.h, `lob u=${i / 400}: under his face`);
    }
  const back = solve(ACTIONS.lob(0.3), 1, 0.26), go = solve(ACTIONS.lob(LOB_RELEASE), 1, 0.26);
  assert.ok(back.joints.handFar.x < back.joints.pelvis.x, "back behind his hip");
  assert.ok(go.joints.handFar.x > go.joints.chest.x + 40, "out ahead at the release");
});

import { gateHold } from "../src/sim/rig/actions.ts";

test("the gate's stance between throws: a towel wipe begun as a throw eases back keeps his face clear but for the towel arm, and the scalpel off it", () => {
  for (let a = 0; a < 5; a++)
    for (const wipeU of [null, ...Array.from({ length: 21 }, (_, i) => i / 20)])
      for (let k = 0; k <= 10; k++)
        for (const headScale of [0.24, 0.26, 0.3]) {
          const w = k / 10;
          const s = solve(gateHold(CLIPS.idle(a / 5, ctx), wipeU, w), 1, headScale);
          const allowed = wipeU === null ? FACE_ALLOWED.throw : [...FACE_ALLOWED.wipe, ...FACE_ALLOWED.throw];
          const r = faceClear(s, allowed);
          assert.ok(r.ok, `idle ${a / 5}, wipe ${wipeU}, easing ${w}, head ${headScale}: ${r.offender}`);
          const [butt, tip] = scalpelOf(s);
          assert.ok(segmentClear(s, butt, tip, 8), `idle ${a / 5}, wipe ${wipeU}, easing ${w}, head ${headScale}: the scalpel`);
        }
});
