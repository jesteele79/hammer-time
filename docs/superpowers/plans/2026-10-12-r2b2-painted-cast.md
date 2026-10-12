# R2b-2 The Painted Cast, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The lobby's cast drawn from the owner's paintings the way Hammer's body is drawn: each person's painting cut into five skinned layers and a head plate, bent by their own skeleton through every R2b-1 clip, with head sizes the owner picks, the bellhops' painted hat, the face edits while dazed, recolors for the repeats, a warm rim light from the lobby lamps, and the stand-ins kept as the fallback. Plus R2b-1's cheap deferred minors.

**Architecture:** The cut pipeline (`scripts/art-cut.mjs`) learns a sixth layer, the head, claimed after the torso and drawn behind it, and a `castRig` function that turns a keyed painting and its cut file (`art/cuts/cast-<person>.json`) into meshes, weights, textures, a head plate and rim silhouettes; `art-sync.mjs` writes them under `public/art/cast/` and registers them in `registry.cast`. The solver (`src/sim/rig/fk.ts`) takes a `Skeleton`: Hammer's stays as it is; a painted body's comes from `skeletonFrom` (its own joints and bone lengths, its arm bones turned to Hammer's rest directions), so every clip and every reach posed on Hammer lands the same way on everyone, and `skinLayer` turns each arm bone's paint by the same amount. The renderer's `Cast` view preloads each person's art and draws a `PaintedFigure` (`src/render/cast-body.ts`) where it loaded, the stand-in where it did not.

**Tech Stack:** TypeScript, PixiJS 8 (`Mesh`, `MeshGeometry`, `Sprite`), sharp, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-12-r2b-lobby-cast-design.md` (§6.2 cutting and rigging, §6.3 fallback, §7, §8, §10's R2b-2, §11) over `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§6, §7.1, §14, §15). Handoff: `docs/superpowers/handoff-2026-10-12-r2b2.md` (the deferred minors list). The art: `art/outgoing/batch-3-cast.txt`, `art/ART-REQUEST.md` §1 and §5.

## Global Constraints

- "Nothing of the cast covers Hammer's face: the cast, their props and their projectiles always draw behind Hammer" (R2b §8). The cast's container keeps its `zIndex` just under his; nothing in this plan draws cast art anywhere else.
- "The art pipeline ... is generalized from Hammer's bodies to any body: one cut file per person, `art/cuts/cast-<person>.json`, with the painted joints and six layer outlines (Hammer's five plus a head layer ...), measured with `art-grid.mjs`." (R2b §6.2)
- "Each person gets a rest skeleton from their painting's joints, with the same joint names, so every clip works on every body." (R2b §6.2) Hammer's rest table, his head seat (`HEAD_SEAT = { x: 8, y: -18 }`, `BODY_SEAT_Y = -9`), his 0.26 head scale and every R0 to R2b-1 check stay exactly as they are.
- "Heads are scaled toward Hammer's caricature proportions (his is 0.26 of his height); the scale per person is chosen on a board with the owner." (R2b §6.2)
- "Recolors shift only the uniform's and the hair's hues, from masks recorded in the cut file." "The face edits, when present, swap in whole for the head layer while dazed." "Rim light: the side of each cast member facing the nearest lobby lamp gets a thin warm lit edge." (R2b §6.2)
- "The stand-in stays as the fallback when the art is missing or fails to load" (R2b §6.3), and with `&noart=1`. The stand-ins are placeholders: never polish them (owner, 2026-10-12).
- The props the cast holds stay code-drawn (R2b §1, decision 5); the hat is the owner's painting.
- "Pixi objects cannot be constructed under `node:test`": node tests touch pure functions and the cut pipeline only; drawing is verified on boards and in the browser.
- The owner's files under `art/incoming/` (the new `art/incoming/cast/` included), `art/reference/`, `public/voice/*` and `public/absolute-bullshit.mp3` are never modified; `npm run art:sync` records each new one in `art/manifest.json`, which is committed with it. Run `npm run art:sync` after every change to `art/cuts/*` or `scripts/art-cut.mjs`; `public/art/` is git-ignored.
- Owner rules: never stage `package-lock.json` or `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` stays `dceedffd…`); write the message to `.git/CLAUDE_MSG` with the Write tool and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, named paths only, ending with the session's attribution line; push `claude/hammer-pass` after each commit; dev server on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort`, `node_modules\.bin` on PATH), preview on 8091; browser checks with `BROWSER_SMOKE_CHANNEL=chrome`.
- Bash heredocs containing apostrophes break in this harness: write files with the Write tool.

## Review Focus

1. **A person's painting is missing, its cut file is missing, or its rig or a texture fails to load** (a 404, a broken JSON): that person draws as the stand-in, everyone else painted, one console warning, no page error, the game plays on. Pinned in Task 5 (`cast-art-browser.check.mjs` blocks the first bellhop's rig).
2. **Two cast members wearing one painting** (server-1 at BUFFET and the recolored server at the tables; student-1 twice; student-2 twice): each draws its own colors and its own pose; recoloring one never recolors the other, and a recolor the cut file does not list falls back to the painting's colors. Pinned in Task 9.
3. **A painted cast member facing right** (mirrored against the painting): the bones still land on their joints, the head flips with the body and stays on the neck, the hat stays on the head. Pinned in Task 5 (both facings in the bone test); the hat rides in the head's own container (Task 8), and Task 8, Step 5 looks at a bellhop facing right.
4. **The arms turned at the shoulder to Hammer's stance**: where the torso's weight hands over to the upper arm the paint bends, never tears, in every act of every role. Pinned in Task 5 (no edge of the arms or the jacket stretches past 2.5 times in any act) and repeated per person in Task 7.
5. **A face edit that drifted** (the owner's edit tool moved or rescaled the picture): it is aligned back onto its body, or skipped in a dev run and refused by `art:sync`, never drawn off its neck. Pinned in Task 8.

## Decisions taken for the owner (report these)

1. Every clip keeps Hammer's angles on every body: each person's skeleton takes their own bone lengths and their painting's legs and spine, but their arms point the way Hammer's painted arms do at rest. The first bellhop's arms were painted about 10 degrees further forward; the rig turns them back, so his hands land where the R2b-1 poses put them (the cart's rail, the tray, the cup, the phone).
2. Each person's head is cut from their own painting and drawn as a plate behind the collar (like Hammer's head runs into his shirt), turning on the painted neck. Its size is a share of their height, crown to neck: the board offers "as painted", 0.22 and 0.26; the owner picks per person.
3. Recolors are baked into extra textures when the art is synced, not computed while playing. The three repeats are drawn 3 percent taller, 3 percent shorter and 2 percent taller than the painting they wear (the design's ±4 percent).
4. The rim light is a warm copy of the figure's silhouette drawn behind it, a few pixels toward the nearest lamp, fading over 1300 px; off at the low quality tier.
5. The projector silhouette is the painted figure darkened, so it has the person's real outline.
6. The stand-in stays per person: anyone whose painting is not in, not cut or not loaded is drawn as the stand-in; `&noart=1` draws everyone as stand-ins.
7. The hat's painting has a long chin-strap loop under it: on a bellhop's head the hat is drawn cut at its base (the loop would cross his face); knocked off and flying, the whole hat shows, strap and all.
8. R2b-1's cheap deferred minors are fixed first (Task 1); the costly ones stay deferred (the cart's snap at a wind-up toward the other side, ticket timing, posture colliders, the plane line-of-sight check, the shaft line, the board-only overlaps).

---

## File Structure

- `src/sim/rig/skeleton.ts` (modify): `Skeleton`, `HAMMER`, `ARM_BONES`, `PaintedJoints`, `skeletonFrom`.
- `src/sim/rig/fk.ts` (modify): `solve(pose, facing, headScale, plate?, skel?)`; `Solved.turns`, `Solved.farFloor`.
- `src/sim/rig/ground.ts`, `src/sim/rig/feet.ts` (modify): the far floor from the solve.
- `src/render/skin.ts` (modify): the turned bones in `skinLayer`; `CastHead`, `RigFile.head`, `RigFile.match`, `RigLayer.sil`, `RigLayer.recolors`, `layerTexture`.
- `src/art/registry.ts` (modify): `Registry.cast`.
- `scripts/art-cut.mjs` (modify): `layerOrder`, `layerZ`, `MESH_CELL`, `TEXTURE_SCALE`, `paddedLayer`, `scaled`, `castHeadPlate`, `castRig`, `alignOnto`, `hatBase`, the recolor functions.
- `scripts/art-sync.mjs` (modify): `cast()`, the hat, the overlay for cast bodies.
- `scripts/art-grid.mjs` (modify): `cast/<person>`.
- `scripts/art-pose.mjs` (create): a new painting laid over Hammer's, for accepting or refusing it.
- `art/cuts/cast-<person>.json` (create, one per painting).
- `src/render/cast-art.ts` (create, pure): `castSkeleton`, `castHeadScale`, `RIM`, `rimFor`, `hatWorldWidth`.
- `src/render/cast-body.ts` (create): `CastArt`, `loadCastArt`, `PaintedFigure`.
- `src/render/cast.ts` (modify): `Cast.preload`, `Cast.artState`, `Cast.setQuality`, `Cast.hat`, painted or stand-in per member, `drawCarried`, `DAZED`, `LOOKS[...].head`.
- `src/render/cast-fx.ts` (modify): the painted hat in flight.
- `src/render/look.ts`, `src/render/boards.ts`, `src/render/sound.ts` (modify).
- `src/sim/cast.ts`, `src/sim/cast-behavior.ts`, `src/sim/missiles.ts`, `src/sim/types.ts`, `src/sim/targets.ts`, `src/sim/level.ts`, `src/sim/levels/lobby.ts` (modify).
- Tests: `scripts/art.check.mjs`, `scripts/rig.check.mjs`, `scripts/render.check.mjs`, `scripts/cast.check.mjs` (modify); `scripts/cast-art-browser.check.mjs` (create); `scripts/look-boards.mjs` (modify).
- Docs: `README.md`, the R2b design (§6 as built), the rebuild spec §7.1 and §8.3, `art/ART-REQUEST.md` §5, `art/outgoing/batch-3-codex.txt` (create: the prompts that made the paintings).

Test helpers already at the top of `scripts/cast.check.mjs` (R2b-1): `NONE`, `input`, `flat`, `worldWith`, `steps`, `press`, `until`, `of`, `npc`.

---

### Task 1: R2b-1's cheap deferred minors

**Files:**
- Modify: `src/sim/cast.ts`, `src/sim/cast-behavior.ts`, `src/sim/missiles.ts`, `src/sim/types.ts`, `src/sim/targets.ts`, `src/render/cast.ts`, `src/render/sound.ts`
- Test: `scripts/cast.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces: `T.offView` (1000) in `src/sim/cast.ts`; `cuesFor` exported from `src/render/sound.ts`; `Target.owner` removed.

- [ ] **Step 1: Write the failing tests** (append to `scripts/cast.check.mjs`; add `launchCoffee` is not needed, `stepMissiles` is already imported)

```js
test("a knocked-out staffer walking off into a wall turns back on screen, and is gone at once off it", () => {
  const wall = flat({ solids: [{ x: 1500, y: -400, w: 100, h: 400 }] });
  const w = worldWith([{ id: "s", person: "server-1", x: 1300, y: 0 }], { x: 900, y: 0 }, {}, [], wall);
  const s = npc(w, "s");
  Object.assign(s, { out: true, facing: 1, act: "leave", actT: 0, noticed: true });
  steps(w, 1.2);
  assert.ok(s.alive && s.facing === -1, "in view of him, she turns back from the wall");
  // 1250 px off at the wall: past his view, short of the 1500 px that removes anyone walking off.
  const far = worldWith([{ id: "s", person: "server-1", x: 1300, y: 0 }], { x: 200, y: 0 }, {}, [], wall);
  const f = npc(far, "s");
  Object.assign(f, { out: true, facing: 1, act: "leave", actT: 0, noticed: true });
  steps(far, 1.2);
  assert.equal(f.alive, false, "out of his view and blocked, she is gone");
});

test("coffee that hits him in the air leaves its puddle on the floor under him", () => {
  const w = worldWith([], { x: 1000, y: 0 });
  Object.assign(w.hero, { y: -260, onGround: false, vy: 0, invuln: 0 });
  w.missiles.push({ id: 1, kind: "coffee", x: 1000, y: -400, vx: 0, vy: 0, spin: 0, life: 1, phase: 0, from: 0 });
  const evs = [];
  stepMissiles(w, STEP, evs);
  assert.ok(evs.some((e) => e.type === "missileHit" && e.hero), "it hit him");
  assert.equal(w.puddles.at(-1).y, 0, "on the marble, not in the air");
});

test("planes in the air and planes being folded count together against the cap of three", () => {
  const w = worldWith([{ id: "a", person: "student-1", x: 1400, y: 0 }, { id: "b", person: "student-2", x: 1600, y: 0 }], { x: 700, y: 0 });
  for (const n of w.cast) Object.assign(n, { noticed: true, rest: 0 });
  for (const id of [90, 91]) w.missiles.push({ id, kind: "plane", x: 5000 + id, y: -2600, vx: 0, vy: 0, spin: 0, life: 3, phase: 0, from: 0 });
  let worst = 0;
  for (let i = 0; i < Math.round(1 / STEP); i++) {
    w.step(input());
    const up = w.missiles.filter((m) => m.kind === "plane").length + w.cast.filter((n) => n.act === "windup").length;
    worst = Math.max(worst, up);
  }
  assert.ok(worst <= 3, `at most three, counted ${worst}`);
});

test("a lecture landing while the screen's office worker rears back brings him out to march, not idle and hidden", () => {
  const w = worldWith([{ id: "o", person: "office-2", x: 1400, y: 0, hide: true }], { x: 300, y: 0 });
  w.hero.x = 1000;
  until(w, () => npc(w, "o").act === "windup", 1);
  const o = npc(w, "o");
  assert.equal(o.act, "windup");
  w.hero.facing = 1;
  w.hero.lectureCd = 0;
  press(w, "lecture");
  until(w, (x) => x.events.some((e) => e.type === "castFreeze"), 1);
  assert.ok(o.act === "frozen" && !o.hide, "frozen in the open");
  until(w, () => o.act === "walk", 3);
  assert.equal(o.act, "walk", "he marches once the freeze ends");
});

test("an office worker marching into him in grace passes through: no coffee, no line, no stagger", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 1000, y: 0, x0: 600, x1: 1400 }], { x: -1500, y: 0 });
  const o = npc(w, "o");
  until(w, () => npc(w, "o").facing === 1 && npc(w, "o").x > 900 && npc(w, "o").x < 1200, 6);
  o.noticed = true;
  Object.assign(w.hero, { x: o.x + 60, y: 0, facing: -1, invuln: 1.4 });
  const evs = steps(w, 0.1);
  assert.equal(of(evs, "castSplash").length, 0, "no coffee over him in grace");
  assert.ok(!of(evs, "castLine").some((e) => e.text === "Oh. Were you standing there?"));
  assert.equal(o.act, "walk", "he marches on");
  assert.equal(w.hero.patience, 3);
});

test("a bellhop chasing his cart faces it, wherever it rolled", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1000, y: 0, cart: 850 }], { x: -1500, y: 0 }, {}, [850]);
  const b = npc(w, "b");
  Object.assign(w.targets[0], { x: 1700, vx: 0 });
  Object.assign(b, { noticed: true, act: "chase", actT: 0, facing: -1 });
  steps(w, 0.3);
  assert.equal(b.facing, 1, "turned to the cart behind him");
  assert.ok(b.vx > 0, "and walking forwards to it");
});
```

Append to `scripts/render.check.mjs` (import `cuesFor` from `../src/render/sound.ts` at the top):

```js
test("the server's order-up ding rings with her warning, not with her rush", () => {
  assert.deepEqual(cuesFor({ type: "castWindup", id: 1, role: "server", x: 0, y: 0 }), ["sting", "ding"]);
  assert.deepEqual(cuesFor({ type: "castWindup", id: 1, role: "bellhop", x: 0, y: 0 }), ["sting"]);
  assert.ok(!cuesFor({ type: "castAttack", id: 1, role: "server", x: 0, y: 0 }).includes("ding"));
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/cast.check.mjs scripts/render.check.mjs` (the six new cast tests fail on the old behavior; `cuesFor` is not exported).

- [ ] **Step 3: Implement**

`src/sim/cast.ts`: `T` gains `offView: 1000` with the comment `/** ... offView: walking off against a wall farther than this from him, they are out of his view and gone. */` added to `T`'s doc.

`src/sim/cast-behavior.ts`:
- At the end of `physics`, replace the `else if ((n.act === "leave" || n.act === "flee") && ...)` branch:
  ```ts
    } else if (n.act === "leave" || n.act === "flee") {
      const far = Math.abs(n.x - w.hero.x);
      // Walking off into a wall: gone if he cannot see them any more, else they turn back the other way.
      if (far > T.gone || (n.blocked && far > T.offView)) n.alive = false;
      else if (n.blocked) n.facing = n.facing === 1 ? -1 : 1;
    }
  ```
- In `stepBellhop`'s chase branch, before `const want = ...`:
  ```ts
    // He faces the cart he goes after, so he never walks backwards to it.
    n.facing = cart.x >= n.x ? 1 : -1;
  ```
- In `stepStudent`, the cap line becomes:
  ```ts
  // Planes in the air and planes being folded count together, so two wind-ups never take it past three.
  const planes = w.missiles.filter((m) => m.kind === "plane").length + w.cast.filter((m) => m.role === "student" && m.act === "windup").length;
  ```
- In `lectureOn`'s staff branch, first thing inside `else if (standing(n)) {`:
  ```ts
      // Caught rearing back behind the screen: out in the open now, he marches when the freeze ends.
      if (n.hide) {
        n.hide = false;
        n.x0 = n.x - 400;
        n.x1 = n.x + 400;
      }
  ```
- In `contact`, the attack branch starts:
  ```ts
  if (attacking(n, h)) {
    // In grace (or down) an attack passes through him: no pip, no coffee, no stagger.
    if (h.invuln > 0 || h.move?.kind === "tumble") return;
    w.hits.push(n.x);
  ```
- Delete `cart.owner = n.id;`.

`src/sim/missiles.ts`: the hero branch's puddle becomes `if (m.kind === "coffee") puddleAt(w, h.x, floorAt(w.stage, h.x, h.y - 24) ?? h.y);`.

`src/sim/types.ts`: delete `owner: number | null;` and its comment from `Target`. `src/sim/targets.ts`: delete `owner: null` from `createCart`. Run `grep -rn "\.owner" src scripts` and remove any remaining cart `owner` use.

`src/render/cast.ts`, the hidden branch: after `drawFigure(... silhouette: true ...)` and before `continue`, so "Got a minute?" has a head to hang from:
```ts
        this.crowns.set(n.id, { x: n.x + solved.crown.x * k * 0.95, y: sheet.y + sheet.h + 30 + solved.crown.y * k * 0.95, facing: n.facing });
```

`src/render/sound.ts`: `export function cuesFor(...)`; delete `castWindup: ["sting"],` from `CUES`; in the switch:
```ts
    case "castWindup":
      // The server's warning carries the order-up ding (R2b §2.2); every wind-up carries the sting.
      return e.role === "server" ? ["sting", "ding"] : ["sting"];
    case "castAttack":
      return e.role === "bellhop" ? ["squeal"] : e.role === "server" || e.role === "office" ? ["whoosh"] : ["paper"];
```

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/sim src/render scripts`.

- [ ] **Step 5: See it.** With the dev server on 8090, `node scripts/cast-browser.check.mjs http://127.0.0.1:8090/` passes (`BROWSER_SMOKE_CHANNEL=chrome`), and its step 6 screenshot shows the "Got a minute?" bubble over the screen's silhouette.

- [ ] **Step 6: Commit** `src/sim src/render/cast.ts src/render/sound.ts scripts/cast.check.mjs scripts/render.check.mjs`: "Fix R2b-1's cheap deferred minors: walking off into walls, coffee in the air, the plane cap, the hidden worker, grace, the chase, the ding". Push.

---

### Task 2: Skeletons for painted bodies

**Files:**
- Modify: `src/sim/rig/skeleton.ts`, `src/sim/rig/fk.ts`, `src/sim/rig/ground.ts`, `src/sim/rig/feet.ts`, `src/render/skin.ts`
- Test: `scripts/rig.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces:

```ts
// src/sim/rig/skeleton.ts
export type Skeleton = { joints: Record<JointName, Joint>; turns: Partial<Record<JointName, number>>; farFloor: number; headSeat: Point; bodySeatY: number };
export const HAMMER: Skeleton; // { joints: JOINTS, turns: {}, farFloor: FAR_FLOOR, headSeat: HEAD_SEAT, bodySeatY: BODY_SEAT_Y }
export const ARM_BONES: readonly (readonly [JointName, JointName])[];
export type PaintedJoints = { joints: Partial<Record<string, readonly [number, number]>>; sole: number; rootX: number };
export function skeletonFrom(p: PaintedJoints, match?: readonly (readonly [JointName, JointName])[]): Skeleton;
// src/sim/rig/fk.ts
export function solve(pose: Pose, facing: 1 | -1, headScale: number, plate?: HeadPlate, skel?: Skeleton): Solved; // Solved gains turns, farFloor
```

- [ ] **Step 1: Write the failing tests** (append to `scripts/rig.check.mjs`)

```js
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
  assert.ok(close(s.farFloor, FAR_FLOOR, 0.06));
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
```

Append to `scripts/render.check.mjs` (import `skeletonFrom` from `../src/sim/rig/skeleton.ts`):

```js
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
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/rig.check.mjs scripts/render.check.mjs` (`skeletonFrom` is not exported).

- [ ] **Step 3: Implement**

`src/sim/rig/skeleton.ts`, after `REST_POSE`:

```ts
/** A body the solver bends: its joints at rest, and how it stands and wears its head. */
export type Skeleton = {
  joints: Record<JointName, Joint>;
  /**
   * How far each joint's offset from its parent was turned away from its painting, radians
   * counter-clockwise facing right: the skin turns the paint of the bone ending there by as much.
   */
  turns: Partial<Record<JointName, number>>;
  /** How far above the floor the far sole stands at rest: the painting's perspective. */
  farFloor: number;
  /** Where the head's neck anchor sits from the neck joint, rest units. */
  headSeat: Point;
  /** The seat the body's size is worked out from. */
  bodySeatY: number;
};

export const HAMMER: Skeleton = { joints: JOINTS, turns: {}, farFloor: FAR_FLOOR, headSeat: HEAD_SEAT, bodySeatY: BODY_SEAT_Y };

/**
 * The bones a painted cast body takes Hammer's rest directions for. Each painting reaches its arms
 * a little differently, and every clip and every reach for a rail, a tray or a phone was posed on
 * his; turned to his stance, they land where they land on him.
 */
export const ARM_BONES: readonly (readonly [JointName, JointName])[] = [
  ["shoulderNear", "elbowNear"],
  ["elbowNear", "wristNear"],
  ["wristNear", "knuckleNear"],
  ["knuckleNear", "handNear"],
  ["shoulderFar", "elbowFar"],
  ["elbowFar", "wristFar"],
  ["wristFar", "handFar"],
];

/** A painting's marks: joints in its keyed crop's pixels (facing left, y down), its sole's row and its feet point's x. */
export type PaintedJoints = { joints: Partial<Record<string, readonly [number, number]>>; sole: number; rootX: number };

const turnBy = (p: Point, a: number): Point => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * A skeleton from a painting, in rest units with its neck at NECK_REST_Y: every joint where it is
 * painted, except that a `match` bone takes Hammer's rest direction at its own painted length and
 * what hangs below it turns with it. A joint the painting has no mark for keeps Hammer's offset
 * from its parent. The head turns on the painted neck joint itself: a painting's head is its own,
 * already in its collar.
 */
export function skeletonFrom(p: PaintedJoints, match: readonly (readonly [JointName, JointName])[] = ARM_BONES): Skeleton {
  const neck = p.joints.neck;
  if (!neck) throw new Error("skeletonFrom: the painting has no neck joint");
  const k = NECK_REST_Y / (p.sole - neck[1]);
  const mark = (n: JointName): Point | null => {
    const q = p.joints[n];
    return q ? { x: (p.rootX - q[0]) * k, y: (p.sole - q[1]) * k } : null;
  };
  const rest = { root: { x: 0, y: 0 } } as Record<JointName, Point>;
  const turns: Partial<Record<JointName, number>> = { root: 0 };
  for (const name of JOINT_NAMES) {
    const parent = TABLE[name].parent;
    if (!parent) continue;
    const his = { x: TABLE[name].rest.x - TABLE[parent].rest.x, y: TABLE[name].rest.y - TABLE[parent].rest.y };
    const a = mark(parent);
    const b = mark(name);
    let off = his;
    let turn = turns[parent] ?? 0;
    if (a && b) {
      const painted = { x: b.x - a.x, y: b.y - a.y };
      if (match.some(([x, y]) => x === parent && y === name)) {
        const len = Math.hypot(painted.x, painted.y);
        const hl = Math.hypot(his.x, his.y) || 1;
        turn = wrap(Math.atan2(his.y, his.x) - Math.atan2(painted.y, painted.x));
        off = { x: (his.x / hl) * len, y: (his.y / hl) * len };
      } else off = turnBy(painted, turn);
    }
    rest[name] = { x: rest[parent].x + off.x, y: rest[parent].y + off.y };
    turns[name] = turn;
  }
  const joints = Object.fromEntries(
    JOINT_NAMES.map((name) => {
      const parent = TABLE[name].parent;
      const length = parent ? Math.hypot(rest[name].x - rest[parent].x, rest[name].y - rest[parent].y) : undefined;
      return [name, { parent, rest: rest[name], length }];
    }),
  ) as Record<JointName, Joint>;
  return { joints, turns, farFloor: rest.toeFar.y, headSeat: { x: 0, y: 0 }, bodySeatY: 0 };
}
```

`src/sim/rig/fk.ts`:
- Imports: replace `BODY_SEAT_Y, HEAD_SEAT, JOINTS, NECK_REST_Y` with `HAMMER, type Skeleton` (keep `HANDLE_REST_DEG, HERO_HEIGHT, JOINT_NAMES, type JointName, type Point, type Pose`).
- `Solved` gains, after `torso`:
  ```ts
  /** The skeleton's turns away from its painting (what the skin turns each bone's paint by). */
  turns: Partial<Record<JointName, number>>;
  /** How far above the floor its far sole stands at rest, rest units. */
  farFloor: number;
  ```
- `export function solve(pose: Pose, facing: 1 | -1, headScale: number, plate: HeadPlate = HEAD_PLATE_DEFAULT, skel: Skeleton = HAMMER): Solved {` with `const J = skel.joints;` first; `scale = (HERO_HEIGHT - above) / (J.neck.rest.y + skel.bodySeatY)`; every `JOINTS[...]` becomes `J[...]`; `rotate(HEAD_SEAT, frame.neck)` becomes `rotate(skel.headSeat, frame.neck)`; the mallet's length `J.malletHead.length! * scale`; the return adds `turns: skel.turns, farFloor: skel.farFloor`.
- The doc comment gains: "`skel` is Hammer's unless a painted cast body is bent (R2b-2)."

`src/sim/rig/ground.ts`: `const lift = solved.farFloor * solved.scale * solved.squash.y;`; drop the `FAR_FLOOR` import and say in `groundShift`'s doc "the far sole's floor line sits the skeleton's far floor higher".

`src/sim/rig/feet.ts`: line 45 becomes `const lift = s0.farFloor * s0.scale * s0.squash.y;`; drop `FAR_FLOOR` from the import.

`src/render/skin.ts`, in `skinLayer`: `const a = -f * (solved.links[c] + (solved.turns[c] ?? 0));`, and the doc gains: "A bone a painted body's skeleton turned to Hammer's stance turns its paint by as much first."

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit` (it lists any other place that builds a `Solved` by hand: give it `turns: {}, farFloor: FAR_FLOOR`).

- [ ] **Step 5: Commit** `src/sim/rig src/render/skin.ts scripts/rig.check.mjs scripts/render.check.mjs`: "Give painted bodies their own skeletons, arms turned to Hammer's stance". Push.

---

### Task 3: Cutting a cast painting, and the first bellhop's cut

**Files:**
- Modify: `scripts/art-cut.mjs`, `scripts/art-grid.mjs`
- Create: `scripts/art-pose.mjs`, `art/cuts/cast-bellhop-1.json`
- Add: `art/incoming/cast/bellhop-1.png`, `art/incoming/cast/bellhop-1.prompt.txt` (the owner's, already on disk), `art/manifest.json`
- Test: `scripts/art.check.mjs`, `scripts/rig.check.mjs`

**Interfaces:**
- Consumes: `skeletonFrom`, `ARM_BONES` (Task 2).
- Produces: `layerOrder(cuts): string[]` (front to back) and `layerZ(cuts): string[]` (back to front): `["armNear", "torso", "head", "legNear", "legFar", "armFar"]` and `["armFar", "legFar", "legNear", "head", "torso", "armNear"]` when `cuts.layers.head` exists, Hammer's `LAYER_ORDER` and `LAYER_Z` otherwise. `separateLayers` returns `{ W, H, layers, owner, order }`. The cut file format (below).

The cut file is Hammer's format (`art/cuts/hammer-body.json`'s `note` explains it) with a `head` layer and no `drop` or `overrides`:

```json
{
  "note": "Coordinates are pixels of the keyed crop of art/incoming/cast/bellhop-1.png. Layers as in hammer-body.json, plus head: everything above the collar's top edge, claimed after the torso (so the collar stays with the jacket) and drawn behind it; its fill paints the neck on down under the collar. rig.joints are the painted joints; the neck joint sits on the collar's top edge at the neck's middle (the head turns about it). Check with: node scripts/art-grid.mjs cast/bellhop-1.",
  "space": "crop",
  "rig": { "sole": 0, "rootX": 0, "joints": {}, "bones": [], "skin": {} },
  "layers": { "head": {}, "torso": {}, "armNear": {}, "armFar": {}, "legNear": {}, "legFar": {} }
}
```

- [ ] **Step 1: Write the failing tests** (append to `scripts/art.check.mjs`; add `layerZ` to the `art-cut.mjs` import)

```js
const CAST_IN = "art/incoming/cast";
const PERSONS = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2"];
/** The cast bodies with a painting and a cut: every cast check runs on each. */
const CAST_CUT = PERSONS.filter((p) => existsSync(`${CAST_IN}/${p}.png`) && existsSync(`art/cuts/cast-${p}.json`));
const castCache = new Map();
/** A cast body keyed and cut, with its painting's pixels. */
const castOf = async (person) => {
  if (!castCache.has(person)) {
    const keyed = await keyOut(readFileSync(`${CAST_IN}/${person}.png`));
    const cuts = JSON.parse(readFileSync(`art/cuts/cast-${person}.json`, "utf8"));
    const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    castCache.set(person, { keyed, cuts, data, ...(await separateLayers(keyed, cuts)) });
  }
  return castCache.get(person);
};

test("the first bellhop is cut, and every cut cast body is its painting put back together at rest, nothing lost", async () => {
  assert.ok(CAST_CUT.includes("bellhop-1"), "bellhop-1 has its cut file");
  for (const person of CAST_CUT) {
    const { W, H, layers, owner, data, cuts } = await castOf(person);
    const z = layerZ(cuts);
    assert.deepEqual(z, ["armFar", "legFar", "legNear", "head", "torso", "armNear"]);
    let wrong = 0,
      extra = 0,
      lost = 0;
    for (let i = 0; i < W * H; i++) {
      let top = null;
      for (const name of z) if (layers[name].rgba[i * 4 + 3] > 0) top = name;
      if (owner[i] < 0) {
        if (top) extra++;
        if (data[i * 4 + 3] >= 128) lost++;
        continue;
      }
      const px = layers[top].rgba.subarray(i * 4, i * 4 + 4);
      if (px[0] !== data[i * 4] || px[1] !== data[i * 4 + 1] || px[2] !== data[i * 4 + 2] || px[3] !== data[i * 4 + 3]) wrong++;
    }
    assert.equal(wrong, 0, `${person}: the frontmost layer shows the painted pixel`);
    assert.equal(extra, 0, `${person}: nothing is drawn where the painting is empty`);
    assert.ok(lost < 40, `${person}: ${lost} painted pixels belong to no layer`);
  }
});

test("each cast body's neck runs on under its collar, out of sight at rest", async () => {
  for (const person of CAST_CUT) {
    const { W, layers, cuts } = await castOf(person);
    const [nx, ny] = cuts.rig.joints.neck;
    let under = 0,
      shown = 0;
    // From 18 px down: the collar's top edge slopes, and above it at the throat the neck shows as painted.
    for (let y = ny + 18; y < ny + 44; y++)
      for (let x = nx - 30; x <= nx + 30; x++) {
        const i = y * W + x;
        if (layers.head.rgba[i * 4 + 3] === 0) continue;
        under++;
        if (layers.torso.rgba[i * 4 + 3] === 0) shown++;
      }
    assert.ok(under > 400, `${person}: the neck runs on under the collar (${under} px)`);
    assert.ok(shown < under * 0.15, `${person}: and the collar covers it (${shown} of ${under} show)`);
  }
});

test("each cast body's layers are meshed and skinned: every painted pixel in a cell, weights summing to one", async () => {
  for (const person of CAST_CUT) {
    const { W, H, layers, cuts } = await castOf(person);
    for (const name of LAYER_Z) {
      const alpha = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) alpha[i] = layers[name].rgba[i * 4 + 3] > 0 ? 1 : 0;
      const mesh = buildMesh(alpha, W, H, 14);
      const covered = new Set();
      for (let t = 0; t < mesh.indices.length; t += 6)
        covered.add(`${Math.round((mesh.positions[mesh.indices[t] * 2] - mesh.x0) / mesh.cell)},${Math.round((mesh.positions[mesh.indices[t] * 2 + 1] - mesh.y0) / mesh.cell)}`);
      let missed = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (alpha[y * W + x] && !covered.has(`${Math.floor((x - mesh.x0) / mesh.cell)},${Math.floor((y - mesh.y0) / mesh.cell)}`)) missed++;
      assert.equal(missed, 0, `${person} ${name}: every painted pixel lies in a cell`);
      const { weights } = skinWeights(mesh.positions, cuts.rig, name);
      for (let v = 0; v < mesh.positions.length / 2; v++) {
        const sum = weights[v * 4] + weights[v * 4 + 1] + weights[v * 4 + 2] + weights[v * 4 + 3];
        assert.ok(Math.abs(sum - 1) < 1e-6, `${person} ${name} vertex ${v} weights sum to ${sum}`);
      }
    }
  }
});

test("each cast body's joints lie on its painting, and its sole is its near shoe's lowest row", async () => {
  for (const person of CAST_CUT) {
    const { W, H, data, cuts } = await castOf(person);
    const painted = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] >= 128;
    for (const [name, [x, y]] of Object.entries(cuts.rig.joints)) {
      let on = false;
      for (let dy = -14; dy <= 14 && !on; dy++) for (let dx = -14; dx <= 14 && !on; dx++) on = painted(Math.round(x) + dx, Math.round(y) + dy);
      assert.ok(on, `${person}: ${name} at ${x},${y} is off the painting`);
    }
    const [tx] = cuts.rig.joints.toeNear,
      [hx] = cuts.rig.joints.heelNear;
    let lowest = -1;
    for (let y = H - 1; y >= 0 && lowest < 0; y--) for (let x = Math.min(tx, hx); x <= Math.max(tx, hx); x++) if (painted(x, y)) lowest = y;
    assert.ok(Math.abs(cuts.rig.sole - lowest) <= 3, `${person}: sole ${cuts.rig.sole}, near shoe's lowest row ${lowest}`);
  }
});
```

Append to `scripts/rig.check.mjs`:

```js
import { existsSync } from "node:fs";
const CAST_PEOPLE = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2"].filter((p) => existsSync(`art/cuts/cast-${p}.json`));

test("each cut cast body is pose-locked to Hammer's painting: legs and spine within 15 degrees, arms turned under 25", () => {
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
      assert.ok(Math.abs(off) < 15, `${person}: ${p}->${c} is ${off.toFixed(1)} degrees off Hammer's`);
    }
  }
});
```

(`ours` takes the painted offset into rest axes: x and y both flip, so the parent-minus-child difference in crop pixels is the child-minus-parent in rest units.)

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs scripts/rig.check.mjs` (`layerZ` is not exported; no cut file).

- [ ] **Step 3: Generalize the cut** in `scripts/art-cut.mjs`, after `LAYER_Z`:

```js
/**
 * A cast body's cut adds its head: claimed after the torso, so the collar stays with the jacket,
 * and drawn behind it, so the neck runs on down under the collar however the head turns.
 */
export const layerOrder = (cuts) => (cuts.layers.head ? ["armNear", "torso", "head", "legNear", "legFar", "armFar"] : LAYER_ORDER);
export const layerZ = (cuts) => (cuts.layers.head ? ["armFar", "legFar", "legNear", "head", "torso", "armNear"] : LAYER_Z);
```

In `separateLayers`: `const order = layerOrder(cuts); const zs = layerZ(cuts);` at the top; every `LAYER_ORDER` in the function becomes `order`, every `LAYER_Z` becomes `zs`; return `{ W, H, layers, owner, order }`. Hammer's output is unchanged (his cut has no head layer).

`scripts/art-grid.mjs`: the usage line becomes `// Usage: node scripts/art-grid.mjs <costume | cast/<person>> [x y w h] [scale] [--bare]`, and:

```js
const target = args[0] ?? "affliction";
// A cast painting is named cast/<person>: its plate and its own cut file.
const person = target.startsWith("cast/") ? target.slice(5) : null;
const keyed = await keyOut(readFileSync(person ? `art/incoming/cast/${person}.png` : `art/incoming/hammer/body-${target}.png`));
```

with `cutsFile = person ? \`art/cuts/cast-${person}.json\` : "art/cuts/hammer-body.json"`, `colors` gaining `head: "#c08cff"`, the overrides read only for Hammer (`...(person ? {} : cuts.overrides?.[target]?.layers ?? {})`), each fill polygon (`layer.fill`, an array or `{ polygon }`) drawn dashed in its layer's color, and `const out = \`artifacts/grid-${person ? \`cast-${person}\` : target}.png\``. Rename the old `costume` variable to `target` throughout.

`scripts/art-pose.mjs` (create), for accepting a new painting before anything is cut:

```js
// Lays a new cast painting over Hammer's body plate on their shared canvas, to accept or refuse it:
// prints the canvas, the keyed crop's offset (cut files are in the crop's pixels), where the soles
// and the crown land against his, and how flat the green is; writes artifacts/pose-<person>.png
// (the painting red, Hammer blue, overlap purple) and artifacts/pose-grid-<person>.png (the
// painting with Hammer's painted skeleton over it, a 50 px grid in canvas pixels).
// Usage: node scripts/art-pose.mjs <person>
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { keyOut } from "./art-cut.mjs";

const person = process.argv[2];
if (!person) throw new Error("usage: node scripts/art-pose.mjs <person>");
const file = `art/incoming/cast/${person}.png`;
const hammerFile = "art/incoming/hammer/body-affliction.png";
const cuts = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8"));
const meta = await sharp(file).metadata();
const W = meta.width,
  H = meta.height;
const keyed = await keyOut(readFileSync(file));
const hk = await keyOut(readFileSync(hammerFile));
const box = (k) => [k.bbox.x0 + k.offset.x, k.bbox.y0 + k.offset.y, k.bbox.x1 + k.offset.x, k.bbox.y1 + k.offset.y];
console.log(`canvas ${W}x${H} (Hammer's ${(await sharp(hammerFile).metadata()).width}x${(await sharp(hammerFile).metadata()).height})`);
console.log(`crop offset ${keyed.offset.x},${keyed.offset.y} (Hammer's ${hk.offset.x},${hk.offset.y}); a cut file's pixels are the crop's`);
console.log(`painted box ${box(keyed)}; Hammer's ${box(hk)}`);
const { data } = await sharp(readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const corners = [0, W - 1, (H - 1) * W, H * W - 1].map((i) => [...data.subarray(i * 4, i * 4 + 3)]);
console.log(`green corners ${JSON.stringify(corners)}`);
const onCanvas = async (k) => {
  const { data: d, info } = await sharp(k.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = new Uint8Array(W * H);
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const sx = x + k.offset.x,
        sy = y + k.offset.y;
      if (sx < W && sy < H) a[sy * W + sx] = d[(y * info.width + x) * 4 + 3];
    }
  return a;
};
const ca = await onCanvas(keyed);
const ha = await onCanvas(hk);
const lowest = (a, x0, x1) => {
  for (let y = H - 1; y >= 0; y--) for (let x = x0; x < x1; x++) if (a[y * W + x] > 128) return y;
  return -1;
};
console.log(`lowest painted row: ${lowest(ca, 0, W)} (Hammer's ${lowest(ha, 0, W)}); far shoe band x 300-450: ${lowest(ca, 300, 450)} (Hammer's ${lowest(ha, 300, 450)})`);
const ov = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const c = ca[i] > 128,
    h = ha[i] > 128;
  ov.set(c && h ? [150, 60, 200, 255] : c ? [230, 60, 60, 255] : h ? [60, 120, 240, 255] : [30, 32, 40, 255], i * 4);
}
await sharp(ov, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`artifacts/pose-${person}.png`);
const J = Object.fromEntries(Object.entries(cuts.rig.joints).map(([k, [x, y]]) => [k, [x + hk.offset.x, y + hk.offset.y]]));
const shapes = [];
for (let x = 0; x <= W; x += 50) shapes.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#39ff6a" stroke-opacity="${x % 100 ? 0.25 : 0.6}"/>`);
for (let y = 0; y <= H; y += 50) shapes.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#39ff6a" stroke-opacity="${y % 100 ? 0.25 : 0.6}"/>`);
for (const [a, b] of cuts.rig.bones) shapes.push(`<line x1="${J[a][0]}" y1="${J[a][1]}" x2="${J[b][0]}" y2="${J[b][1]}" stroke="#00e5ff" stroke-width="3"/>`);
for (const [n, [x, y]] of Object.entries(J)) shapes.push(`<circle cx="${x}" cy="${y}" r="6" fill="#00e5ff" stroke="#000"/><text x="${x + 8}" y="${y - 6}" font-size="13" font-family="monospace" fill="#00e5ff">${n}</text>`);
const base = await sharp({ create: { width: W, height: H, channels: 4, background: "#2a2f3a" } }).composite([{ input: keyed.png, left: keyed.offset.x, top: keyed.offset.y }]).png().toBuffer();
await sharp(base).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes.join("")}</svg>`), left: 0, top: 0 }]).png().toFile(`artifacts/pose-grid-${person}.png`);
console.log(`wrote artifacts/pose-${person}.png and artifacts/pose-grid-${person}.png`);
```

- [ ] **Step 4: Measure and write `art/cuts/cast-bellhop-1.json`.** Run `node scripts/art-pose.mjs bellhop-1` (crop offset 135,7; soles within 3 px of Hammer's) and `node scripts/art-grid.mjs cast/bellhop-1 --bare`, then zoom into each region with `node scripts/art-grid.mjs cast/bellhop-1 <x y w h> 2`. Where each joint goes, in the crop's pixels:
  - `neck`: on the collar's top edge, at the neck's middle (start: 410,255). The head plate turns about it, so it must sit on that edge.
  - `pelvis`, `chest`: on the spine at the hip line and mid-chest (start: Hammer's mapped, 463,846 and 448,526, then move them to the middle of his slimmer body).
  - `shoulderNear`, `shoulderFar`: the balls of the shoulders (start: 480,363 and 460,388); `elbowNear`, `elbowFar` (start: 380,553 and 305,538); `wristNear`, `wristFar` where the glove meets the cuff (start: 260,753 and 130,693); `knuckleNear` at the base of the near glove's fingers (start: 210,813); `handNear`, `handFar` at the fingertips (start: 155,888 and 35,823). No `grip`: the cast holds no mallet.
  - `hipNear`, `hipFar`, `kneeNear`, `kneeFar`, `ankleNear`, `ankleFar`, `toeNear`, `toeFar`, `heelNear`, `heelFar`: as on Hammer, at the bellhop's own legs and shoes (start: Hammer's crop joints plus 68,6, e.g. `kneeNear` 513,1074, `toeNear` 338,1414, `heelNear` 593,1410, `toeFar` 218,1318, `heelFar` 456,1320).
  - `sole`: the near shoe's lowest painted row (about 1411); `rootX`: halfway between `toeNear` and `heelNear`.
  - `bones`: Hammer's sixteen, copied from `art/cuts/hammer-body.json`. `skin`: Hammer's chains, `parent`, `start` and `blend` for all five layers, with no `sleeve` on the torso (the jacket's sleeves go with the arms).

  The layer outlines (start from these, crop pixels, then follow the painted seams on the grid):
  - `head`: `{ "polygon": [[250,0],[545,0],[545,300],[250,300]], "fill": [{ "polygon": [[340,283],[480,222],[505,262],[505,335],[355,335]], "from": [[338,240],[400,215],[465,195],[478,226],[352,283],[338,282]] }] }`: everything above the collar the torso does not take, and the neck painted on under the collar from the neck's own skin only (`from` stays clear of the jaw, the ear and the hair).
  - `torso`: the jacket from the collar's top edge (front 352,283 to back 477,226) down to the hip line about y 900, the collar and the buttons included: `[[352,283],[477,226],[500,240],[540,300],[555,420],[562,560],[566,780],[562,900],[338,900],[320,780],[300,640],[300,480],[310,330],[330,300]]`, with `"fill": [{ "polygon": [[330,330],[525,330],[525,790],[330,790]], "from": [[300,280],[570,280],[570,780],[300,780]] }]` (the jacket painted on behind the near sleeve).
  - `armNear`: the near sleeve from the shoulder seam to the glove's fingertips: `[[425,313],[485,293],[545,323],[560,393],[525,513],[465,613],[385,713],[340,768],[305,793],[275,853],[215,898],[145,898],[120,843],[140,783],[195,733],[225,683],[285,593],[345,493],[395,393]]`.
  - `armFar`: the far sleeve from where it comes out in front of the chest, and its glove: `[[320,453],[335,513],[305,573],[225,653],[200,713],[150,738],[135,793],[85,838],[15,833],[5,763],[65,693],[100,633],[165,573],[245,503]]`, `"extrude": true`, and its hidden upper arm carried from the near sleeve like Hammer's: `"fill": [{ "polygon": [[500,360],[540,420],[350,590],[300,520]], "carry": { "from": ["shoulderNear","elbowNear"], "to": ["shoulderFar","elbowFar"], "over": ["armNear"], "width": 60, "scale": 0.85, "shift": 0 } }]`.
  - `legNear`: the near trouser leg with its gold stripe from the hip line, and the near shoe: `[[425,873],[565,873],[580,993],[590,1143],[600,1293],[605,1353],[605,1408],[310,1408],[310,1363],[335,1333],[405,1303],[465,1293],[455,1193],[435,1043]]`, `"fill": [[[425,830],[565,830],[565,880],[425,880]]]`.
  - `legFar`: the far leg and shoe: `[[335,873],[445,873],[440,1043],[455,1193],[460,1293],[455,1323],[200,1323],[200,1263],[285,1223],[355,1213],[365,1093],[345,993]]`, `"fill": [[[430,880],[470,880],[470,1300],[430,1300]], [[335,830],[445,830],[445,880],[335,880]]]`.

  Then `node scripts/art-grid.mjs cast/bellhop-1` and look at the outlines and the skeleton over the painting at full size, region by region. Adjust until each outline follows its seam: the collar's top edge, the shoulder seam, the cuffs, the hem, the hip line, the inside of each trouser leg.

- [ ] **Step 5: Run, expect PASS**: `node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs scripts/rig.check.mjs`. A failure names the person, the layer or the joint and where: fix the cut file, not the test. Then `npm run art:sync` (it records `bellhop-1.png` and its prompt in `art/manifest.json`; the cast is not synced until Task 4).

- [ ] **Step 6: Commit** `scripts/art-cut.mjs scripts/art-grid.mjs scripts/art-pose.mjs art/cuts/cast-bellhop-1.json art/incoming/cast/bellhop-1.png art/incoming/cast/bellhop-1.prompt.txt art/manifest.json scripts/art.check.mjs scripts/rig.check.mjs`: "Cut the first bellhop's painting: the head layer, the grid and pose tools, the cast art checks". Push.

---

### Task 4: Syncing the cast

**Files:**
- Modify: `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `src/art/registry.ts`, `src/render/skin.ts`
- Test: `scripts/art.check.mjs`

**Interfaces:**
- Consumes: `layerZ`, `separateLayers` (Task 3).
- Produces:

```js
// scripts/art-cut.mjs
export const MESH_CELL = 14;
export const TEXTURE_SCALE = 0.5;
export async function paddedLayer(rgba, W, H, mesh): Promise<Buffer>; // the layer over its mesh's cells, full size
export const scaled = (png, width, scale) => Promise<Buffer>;
export async function castHeadPlate(rgba, W, H, neck: [number, number], scale, crop?): Promise<{ png, box: { x, y, w, h }, width, height, neck, crown, face, nose }>;
export async function castRig(person, keyed, cuts, opts?): Promise<{ rig, images: Map<string, Buffer>, layers, W, H }>;
```

```ts
// src/render/skin.ts
export type CastHead = HeadPlate & { share: number; sil: string; silly?: string; recolors?: Record<string, string>; hat?: { x: number; y: number; width: number } };
// RigLayer gains sil?: string; recolors?: Record<string, string>
// RigFile gains match?: [JointName, JointName][]; head?: CastHead
export const layerTexture: (part: { file?: string; recolors?: Record<string, string> }, recolor: string | null) => string;
// src/art/registry.ts: Registry gains cast?: { bodies: Partial<Record<CastPerson, Body>>; hat: Prop | null }
```

The rig file (`public/art/cast/<person>-rig.json`): `{ version: 2, span, root: [rootX, sole], joints, bones, match?, layers: { armFar, legFar, legNear, torso, armNear: { file, sil, x, y, width, height, positions, indices, bones, weights } }, head: { file, sil, width, height, neck, crown, face, nose, share } }`.

- [ ] **Step 1: Write the failing test** (append to `scripts/art.check.mjs`; import `castRig` from `./art-cut.mjs`)

```js
test("a cast body's rig: five skinned layers, a head plate turning on its neck joint, silhouettes, every file it names", async () => {
  const { keyed, cuts } = await castOf("bellhop-1");
  const { rig, images } = await castRig("bellhop-1", keyed, cuts);
  assert.deepEqual(Object.keys(rig.layers).sort(), [...LAYER_Z].sort());
  assert.deepEqual(rig.root, [cuts.rig.rootX, cuts.rig.sole]);
  for (const [name, l] of Object.entries(rig.layers)) {
    assert.ok(images.has(l.file) && images.has(l.sil), `${name}: its texture and its silhouette`);
    assert.equal(l.bones.length, l.positions.length * 2, `${name}: four bones a vertex`);
    for (let v = 0; v < l.positions.length / 2; v++) {
      const sum = l.weights[v * 4] + l.weights[v * 4 + 1] + l.weights[v * 4 + 2] + l.weights[v * 4 + 3];
      assert.ok(Math.abs(sum - 1) < 0.01, `${name} vertex ${v}: ${sum}`);
    }
  }
  const sil = await sharp(images.get(rig.layers.torso.sil)).ensureAlpha().raw().toBuffer();
  let lit = 0;
  for (let i = 0; i < sil.length; i += 4) if (sil[i + 3] === 255) lit += sil[i] === 255 && sil[i + 1] === 255 && sil[i + 2] === 255 ? 1 : -1000;
  assert.ok(lit > 1000, "the silhouette is white where the jacket is painted");
  const h = rig.head;
  const meta = await sharp(images.get(h.file)).metadata();
  assert.deepEqual([meta.width, meta.height], [h.width, h.height]);
  assert.ok(images.has(h.sil));
  assert.ok(h.crown.y < 10, `the crown at the plate's top: ${h.crown.y}`);
  assert.ok(h.nose.x < h.width * 0.3, `the face to the left: nose at ${h.nose.x} of ${h.width}`);
  assert.ok(h.neck.y > h.height * 0.6 && h.neck.y < h.height, `the neck anchor low on the plate: ${h.neck.y} of ${h.height}`);
  assert.ok(h.share > 0.14 && h.share < 0.24, `the painted head is ${h.share} of him`);
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs` (`castRig` is not exported).

- [ ] **Step 3: Implement**

`scripts/art-cut.mjs`, after `buildMesh`:

```js
/** Mesh cells in crop pixels, and the size layer textures are stored at (the game draws a body at about a quarter of its crop, twice that on a high-density screen). */
export const MESH_CELL = 14;
export const TEXTURE_SCALE = 0.5;
/** The rim light's silhouettes are only an edge: half the textures' size. */
const SIL_SCALE = TEXTURE_SCALE / 2;

/** A layer's pixels over its mesh's cells exactly, padded with clear pixels past the crop, at full size. */
export async function paddedLayer(rgba, W, H, mesh) {
  const left = Math.max(0, mesh.x0),
    top = Math.max(0, mesh.y0);
  const right = Math.min(W, mesh.x0 + mesh.width),
    bottom = Math.min(H, mesh.y0 + mesh.height);
  return sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width: right - left, height: bottom - top })
    .extend({
      left: left - mesh.x0,
      top: top - mesh.y0,
      right: mesh.x0 + mesh.width - right,
      bottom: mesh.y0 + mesh.height - bottom,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/** A PNG `width` wide stored at `scale`. */
export const scaled = (png, width, scale) => sharp(png).resize({ width: Math.round(width * scale), kernel: "lanczos3" }).png().toBuffer();

/** White wherever the layer is painted, with its alpha: tinted, it is the rim light's edge. */
function whiteOf(rgba) {
  const out = Buffer.from(rgba);
  for (let i = 0; i < out.length; i += 4) out[i] = out[i + 1] = out[i + 2] = 255;
  return out;
}

/**
 * A cast body's head layer as a plate like Hammer's heads: its paint cropped to its bounds with a
 * margin (or to `crop`, for a face edit that must frame exactly like it), stored at `scale`, its
 * neck anchor on the painted neck joint, its crown, nose and face box registered as a profile's.
 */
export async function castHeadPlate(rgba, W, H, neck, scale, crop = null) {
  let box = crop;
  if (!box) {
    let x0 = W,
      y0 = H,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (rgba[(y * W + x) * 4 + 3] > 0) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) throw new Error("castHeadPlate: the head layer is empty");
    const left = Math.max(0, x0 - MARGIN),
      top = Math.max(0, y0 - MARGIN);
    box = { x: left, y: top, w: Math.min(W, x1 + 1 + MARGIN) - left, h: Math.min(H, y1 + 1 + MARGIN) - top };
  }
  const full = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract({ left: box.x, top: box.y, width: box.w, height: box.h }).png().toBuffer();
  const png = await scaled(full, box.w, scale);
  const reg = await registerHead(png, "profile");
  return { png, box, ...reg, neck: { x: Math.round((neck[0] - box.x) * scale), y: Math.round((neck[1] - box.y) * scale) } };
}

/**
 * A cast body as the game loads it, from its keyed painting and its cut: the five skinned layers
 * (meshes and weights in the crop's pixels, textures at TEXTURE_SCALE), the head as a plate turning
 * on the painted neck joint, a white silhouette of each for the rim light, and `share`, the painted
 * head's height (crown to neck joint) over the whole figure's. Returns the rig and the images to
 * write, by their names under public/art.
 */
export async function castRig(person, keyed, cuts) {
  const { W, H, layers } = await separateLayers(keyed, cuts);
  const { rig } = cuts;
  const images = new Map();
  const out = {
    version: 2,
    span: rig.sole - rig.joints.neck[1],
    root: [rig.rootX, rig.sole],
    joints: rig.joints,
    bones: rig.bones,
    ...(rig.match ? { match: rig.match } : {}),
    layers: {},
  };
  for (const name of LAYER_Z) {
    const { rgba } = layers[name];
    const alpha = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = rgba[i * 4 + 3] > 0 ? 1 : 0;
    const mesh = buildMesh(alpha, W, H, MESH_CELL);
    const { bones, weights } = skinWeights(mesh.positions, rig, name);
    const file = `cast/${person}-${name}.png`;
    const sil = `cast/${person}-${name}-sil.png`;
    images.set(file, await scaled(await paddedLayer(rgba, W, H, mesh), mesh.width, TEXTURE_SCALE));
    images.set(sil, await scaled(await paddedLayer(whiteOf(rgba), W, H, mesh), mesh.width, SIL_SCALE));
    out.layers[name] = {
      file,
      sil,
      x: mesh.x0,
      y: mesh.y0,
      width: mesh.width,
      height: mesh.height,
      positions: mesh.positions,
      indices: mesh.indices,
      bones: [...bones],
      weights: [...weights].map((w) => Math.round(w * 1000) / 1000),
    };
  }
  const head = await castHeadPlate(layers.head.rgba, W, H, rig.joints.neck, TEXTURE_SCALE);
  const headSil = await castHeadPlate(whiteOf(layers.head.rgba), W, H, rig.joints.neck, TEXTURE_SCALE, head.box);
  let crownRow = 0;
  while (crownRow < H && !layers.head.rgba.subarray(crownRow * W * 4, (crownRow + 1) * W * 4).some((v, i) => i % 4 === 3 && v > 0)) crownRow++;
  const file = `cast/${person}-head.png`;
  const sil = `cast/${person}-head-sil.png`;
  images.set(file, head.png);
  images.set(sil, headSil.png);
  const share = (rig.joints.neck[1] - crownRow) / (rig.sole - crownRow);
  out.head = { file, sil, width: head.width, height: head.height, neck: head.neck, crown: head.crown, face: head.face, nose: head.nose, share: Math.round(share * 1000) / 1000 };
  return { rig: out, images, layers, W, H, head };
}
```

`scripts/art-sync.mjs`:
- Import `castRig, layerZ, paddedLayer, scaled, MESH_CELL, TEXTURE_SCALE` from `./art-cut.mjs`; delete the local `MESH_CELL` and `TEXTURE_SCALE`. In `bodies()`, the `full` and variant extracts become `await paddedLayer(rgba, W, H, mesh)` and `await paddedLayer(vrgba, W, H, mesh)`, and `store` becomes `async (png, file) => writeFileSync(join(OUT, file), await scaled(png, mesh.width, TEXTURE_SCALE))`. Hammer's files must come out as before: run `sha256sum public/art/hammer/*` before and after the change; if any bytes differ, compare the decoded pixels, which must match exactly.
- After `props()`:

```js
const CAST_IN = "art/incoming/cast";
const CAST_PERSONS = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2"];

/** The cast's paintings, cut like Hammer's bodies: each person's layers, head plate and silhouettes, and their rig. */
async function cast(registry) {
  mkdirSync(join(OUT, "cast"), { recursive: true });
  for (const person of CAST_PERSONS) {
    const file = join(CAST_IN, `${person}.png`);
    if (!existsSync(file)) continue;
    const cutsFile = `art/cuts/cast-${person}.json`;
    if (!existsSync(cutsFile)) {
      console.warn(`cast ${person}: painted but not cut yet (no ${cutsFile}); the stand-in draws them`);
      continue;
    }
    const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
    const { rig, images, layers, W, H } = await castRig(person, await keyOut(readFileSync(file)), cuts);
    for (const [name, png] of images) writeFileSync(join(OUT, name), png);
    const rigFile = `cast/${person}-rig.json`;
    writeFileSync(join(OUT, rigFile), JSON.stringify(rig));
    registry.cast.bodies[person] = { rig: rigFile, span: rig.span };
    console.log(`cast ${person}: five layers and the head, the painted head ${rig.head.share} of the figure`);
    if (overlay) {
      const sheet = await Promise.all(layerZ(cuts).map((name) => sharp(layers[name].rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()));
      await drawLayers(`cast-${person}`, sheet);
    }
  }
}
```

- The registry starts `{ version: 1, hammer: { ... }, cast: { bodies: {}, hat: null }, backdrops: {} }` and `await cast(registry);` runs after `await bodies(registry);`.

`src/art/registry.ts`: `import type { CastPerson } from "../sim/level";` and `Registry` gains
```ts
  /** The cast's paintings (R2b-2): each person's rig file, and the bellhops' hat. Missing from an older sync. */
  cast?: { bodies: Partial<Record<CastPerson, Body>>; hat: Prop | null };
```

`src/render/skin.ts`: `import type { HeadPlate } from "../art/registry";`; `RigLayer` gains `/** White where it is painted: the rim light's edge (a cast body's). */ sil?: string;` and `/** The texture in each recolor, by its hex. */ recolors?: Record<string, string>;`; `RigFile` gains `/** The bones a painted cast body turns to Hammer's stance (ARM_BONES when missing). */ match?: [JointName, JointName][];` and `head?: CastHead;`; and

```ts
/** A cast body's head: a plate cut from its painting, turning on the painted neck joint. */
export type CastHead = HeadPlate & {
  /** The painted head's height, crown to neck joint, as a share of the whole figure. */
  share: number;
  /** White where the head is painted: the rim light's edge. */
  sil: string;
  /** The face edit, knocked silly, framed exactly like the plate. */
  silly?: string;
  recolors?: Record<string, string>;
  /** Where the bellhops' hat sits (its base's middle) and how wide it is, plate pixels. */
  hat?: { x: number; y: number; width: number };
};

/** A layer's or a head's texture in a recolor when it has one, its own otherwise. */
export const layerTexture = (part: { file?: string; recolors?: Record<string, string> }, recolor: string | null): string =>
  (recolor ? part.recolors?.[recolor] : undefined) ?? part.file ?? "";
```

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`. Then `npm run art:sync -- --overlay` and look at `artifacts/body-layers-cast-bellhop-1.png` at full size: each layer whole, the jacket painted on behind the near sleeve, the far arm's hidden stretch a sleeve, the neck running down under the collar, no green fringe. `public/art/registry.json` lists `cast.bodies["bellhop-1"]`.

- [ ] **Step 5: Commit** `scripts/art-cut.mjs scripts/art-sync.mjs src/art/registry.ts src/render/skin.ts scripts/art.check.mjs`: "Sync the cast's paintings: skinned layers, head plates, silhouettes, one rig each". Push.

---

### Task 5: Drawing the painted cast

**Files:**
- Create: `src/render/cast-art.ts`, `src/render/cast-body.ts`, `scripts/cast-art-browser.check.mjs`
- Modify: `src/render/cast.ts`, `src/render/look.ts`, `src/render/boards.ts`, `scripts/look-boards.mjs`
- Test: `scripts/render.check.mjs`

**Interfaces:**
- Consumes: `skeletonFrom` (Task 2); `RigFile`, `CastHead`, `layerTexture`, `Registry.cast` (Task 4); `castRig` (Task 4, in the tests).
- Produces:

```ts
// src/render/cast-art.ts (pure)
export const castSkeleton: (rig: RigFile) => Skeleton;
export const castHeadScale: (share: number, plate: HeadPlate) => number;
// src/render/cast-body.ts
export type CastArt = { person: CastPerson; rig: RigFile; skeleton: Skeleton; head: CastHead; textures: Map<string, Texture> };
export type PaintOpts = { recolor: string | null; dazed: boolean; hat: boolean; silhouette: boolean };
export function loadCastArt(registry: Registry, person: CastPerson): Promise<CastArt | null>;
export class PaintedFigure { readonly container: Container; constructor(art: CastArt); apply(solved: Solved, o: PaintOpts): void }
// src/render/cast.ts
export const DAZED: ReadonlySet<CastAct>;
export function drawCarried(g: Graphics, s: Solved, o: FigureOpts): void;
// CastLook gains head?: number (the owner's pick, a share of the height; the painting's when missing)
// Cast: constructor(layer, ambient, registry?: Registry | null); preload(persons): Promise<void>; artState(): { painted: CastPerson[]; standIn: CastPerson[] }
// window.__next.castArt = cast.artState(); BoardSpec kinds gain "cast-heads"
```

- [ ] **Step 1: Write the failing tests** (append to `scripts/render.check.mjs`)

```js
import { existsSync } from "node:fs";
import { castHeadScale, castSkeleton } from "../src/render/cast-art.ts";
import { castRig, keyOut } from "./art-cut.mjs";
import { castPose } from "../src/sim/rig/cast.ts";
import { HERO_HEIGHT } from "../src/sim/rig/skeleton.ts";

/** Every cast person painted and cut: the checks below run on each, so each new cut is held to them. */
const CAST_PEOPLE = ["bellhop-1", "bellhop-2", "server-1", "server-2", "office-1", "office-2", "student-1", "student-2"].filter(
  (p) => existsSync(`art/incoming/cast/${p}.png`) && existsSync(`art/cuts/cast-${p}.json`),
);
const rigs = new Map();
/** A person's rig as the sync writes it (no files written). */
const rigOf = async (person) => {
  if (!rigs.has(person))
    rigs.set(person, (await castRig(person, await keyOut(readFileSync(`art/incoming/cast/${person}.png`)), JSON.parse(readFileSync(`art/cuts/cast-${person}.json`, "utf8")))).rig);
  return rigs.get(person);
};
const roleOf = (person) => person.slice(0, -2);
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

test("no edge of any painting's arms or torso stretches past 2.5 times its painted length in any act", async () => {
  for (const person of CAST_PEOPLE) {
    const rig = await rigOf(person);
    const skel = castSkeleton(rig);
    for (const name of ["armNear", "armFar", "torso"]) {
      const layer = rig.layers[name];
      const out = new Float32Array(layer.positions.length);
      for (const act of actsOf(person))
        for (const t of [0.05, 0.3, 0.9]) {
          const solved = solve(poseOf(person, act, t), -1, castHeadScale(0.22, rig.head), rig.head, skel);
          skinLayer(out, layer, rig, solved);
          const K = bodyScale(solved, rig);
          let worst = 0;
          for (let i = 0; i < layer.indices.length; i += 3)
            for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
              const p = layer.indices[i + a],
                q = layer.indices[i + b];
              const painted = K * Math.hypot(layer.positions[p * 2] - layer.positions[q * 2], layer.positions[p * 2 + 1] - layer.positions[q * 2 + 1]);
              const posed = Math.hypot(out[p * 2] - out[q * 2], out[p * 2 + 1] - out[q * 2 + 1]);
              worst = Math.max(worst, posed / painted);
            }
          assert.ok(worst <= 2.5, `${person} ${name} ${act} t=${t}: an edge stretched ${worst.toFixed(2)} times`);
        }
    }
  }
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/render.check.mjs` (`cast-art.ts` does not exist).

- [ ] **Step 3: Implement the pure part**, `src/render/cast-art.ts`:

```ts
import type { HeadPlate } from "../art/registry";
import { skeletonFrom, type Skeleton } from "../sim/rig/skeleton";
import type { RigFile } from "./skin";

/** A cast member's skeleton from their painting: its joints and bone lengths, the arms turned to Hammer's stance. */
export const castSkeleton = (rig: RigFile): Skeleton => skeletonFrom({ joints: rig.joints, sole: rig.root[1], rootX: rig.root[0] }, rig.match);

/** solve's head scale (the plate's height over HERO_HEIGHT) for a head `share` of the figure's height, crown to neck joint. */
export const castHeadScale = (share: number, plate: HeadPlate): number => (share * plate.height) / (plate.neck.y - plate.crown.y);
```

- [ ] **Step 4: Run, expect PASS** (the three new tests): `node --loader ./scripts/game-test-loader.mjs --test scripts/render.check.mjs`.

- [ ] **Step 5: Implement the drawing.** `src/render/cast-body.ts`:

```ts
import { Assets, Container, Mesh, MeshGeometry, Sprite, Texture } from "pixi.js";
import { ART_BASE, HEAD_PLATE_FACING, type Registry } from "../art/registry";
import type { CastPerson } from "../sim/level";
import type { Solved } from "../sim/rig/fk";
import type { Skeleton } from "../sim/rig/skeleton";
import { castSkeleton } from "./cast-art";
import { LAYER_Z, layerTexture, skinLayer, type CastHead, type LayerName, type RigFile, type RigLayer } from "./skin";

/** One person's painting, loaded once and shared by everyone who wears it. */
export type CastArt = { person: CastPerson; rig: RigFile; skeleton: Skeleton; head: CastHead; textures: Map<string, Texture> };
export type PaintOpts = { recolor: string | null; dazed: boolean; hat: boolean; silhouette: boolean };

const MIPMAPS = { autoGenerateMipmaps: true };
/** The far arm and leg a shade back, as on Hammer. */
const FAR_SHADE = 0xe2dad2;
const FAR_LAYERS = new Set<LayerName>(["armFar", "legFar"]);
/** The head between the near leg and the torso: the collar covers where its neck runs on, however it turns. */
const HEAD_Z = 2.5;
/** On the projector's sheet every part is this dark. */
const SIL = 0x14110f;

/** Every texture a rig names. */
function filesOf(rig: RigFile): string[] {
  const files = new Set<string>();
  const add = (p: { file?: string; sil?: string; silly?: string; recolors?: Record<string, string> }) => {
    for (const f of [p.file, p.sil, p.silly, ...Object.values(p.recolors ?? {})]) if (f) files.add(f);
  };
  for (const name of LAYER_Z) add(rig.layers?.[name] ?? {});
  if (rig.head) add(rig.head);
  return [...files];
}

const loads = new Map<string, Promise<CastArt | null>>();

/** A person's rig and textures, or null when their painting is not registered or does not load: the stand-in draws them. */
export function loadCastArt(registry: Registry, person: CastPerson): Promise<CastArt | null> {
  const body = registry.cast?.bodies[person];
  if (!body) return Promise.resolve(null);
  let load = loads.get(body.rig);
  if (!load) {
    load = (async () => {
      try {
        const res = await fetch(ART_BASE + body.rig, { cache: "no-cache" });
        if (!res.ok) throw new Error(`${res.status}`);
        const rig = (await res.json()) as RigFile;
        if (!rig.head || !LAYER_Z.every((n) => rig.layers?.[n]?.file)) throw new Error("no head or a layer missing");
        const textures = new Map<string, Texture>();
        await Promise.all(filesOf(rig).map((f) => Assets.load<Texture>({ src: ART_BASE + f, data: MIPMAPS }).then((t) => textures.set(f, t))));
        return { person, rig, skeleton: castSkeleton(rig), head: rig.head, textures };
      } catch (err) {
        console.warn(`cast art fallback: ${person} draws as the stand-in (${body.rig}: ${(err as Error).message})`);
        return null;
      }
    })();
    loads.set(body.rig, load);
  }
  return load;
}

type Part = { name: LayerName; layer: RigLayer; mesh: Mesh; geometry: MeshGeometry; positions: Float32Array };

/** One cast member's painting: five skinned layers bent by their skeleton, and their head plate turned on the neck. */
export class PaintedFigure {
  readonly container = new Container({ label: "painted" });
  protected readonly parts: Part[] = [];
  protected readonly head = new Container({ label: "head" });
  protected readonly headSprite = new Sprite();

  constructor(protected readonly art: CastArt) {
    this.container.sortableChildren = true;
    LAYER_Z.forEach((name, z) => {
      const layer = art.rig.layers![name]!;
      const n = layer.positions.length / 2;
      const uvs = new Float32Array(n * 2);
      for (let v = 0; v < n; v++) {
        uvs[v * 2] = (layer.positions[v * 2] - layer.x!) / layer.width!;
        uvs[v * 2 + 1] = (layer.positions[v * 2 + 1] - layer.y!) / layer.height!;
      }
      const positions = new Float32Array(n * 2);
      const geometry = new MeshGeometry({ positions, uvs, indices: new Uint32Array(layer.indices!) });
      const mesh = new Mesh({ geometry, texture: art.textures.get(layer.file!) ?? Texture.EMPTY });
      mesh.zIndex = z;
      this.container.addChild(mesh);
      this.parts.push({ name, layer, mesh, geometry, positions });
    });
    const plate = art.head;
    this.headSprite.anchor.set(plate.neck.x / plate.width, plate.neck.y / plate.height);
    this.head.zIndex = HEAD_Z;
    this.head.addChild(this.headSprite);
    this.container.addChild(this.head);
  }

  apply(solved: Solved, o: PaintOpts): void {
    const { art } = this;
    for (const p of this.parts) {
      skinLayer(p.positions, p.layer, art.rig, solved);
      p.geometry.getBuffer("aPosition").update();
      p.mesh.texture = art.textures.get(layerTexture(p.layer, o.recolor)) ?? p.mesh.texture;
      p.mesh.tint = o.silhouette ? SIL : FAR_LAYERS.has(p.name) ? FAR_SHADE : 0xffffff;
    }
    const plate = art.head;
    const pl = solved.parts.head;
    const s = pl.length / plate.height;
    this.head.position.set(pl.x, pl.y);
    this.head.rotation = pl.rotation;
    this.head.scale.set(pl.scaleX * HEAD_PLATE_FACING * s, pl.scaleY * s);
    const face = o.dazed && plate.silly ? plate.silly : layerTexture(plate, o.recolor);
    this.headSprite.texture = art.textures.get(face) ?? this.headSprite.texture;
    this.headSprite.tint = o.silhouette ? SIL : 0xffffff;
  }
}
```

`src/render/cast.ts` (imports: `type Registry` from `../art/registry`, `type CastPerson` is already there, `castHeadScale` from `./cast-art`, `loadCastArt, PaintedFigure, type CastArt` from `./cast-body`):
- `CastLook` gains `/** The head's share of the height, crown to neck, the owner picked on the cast-heads board; the painting's own when missing. */ head?: number;`.
- `export const DAZED` (was `const`); `export function drawCarried(g: Graphics, s: Solved, o: FigureOpts): void { if (o.silhouette) return; drawProp(g, s.joints, s.scale, s.facing, o); if (o.slimed) g.ellipse(s.joints.chest.x, s.joints.chest.y, 26 * s.scale, 18 * s.scale).fill("#8fbf3f").stroke({ width: 3, color: INK }); }` with the doc "What the role carries, and the slime: over the painted body as over the stand-in."
- `View` gains `painted: PaintedFigure | null; carried: Graphics`.
- The class:

```ts
  private readonly arts = new Map<CastPerson, CastArt | null>();

  constructor(layer: Container, ambient: number, private readonly registry: Registry | null = null) { /* as before */ }

  /** Loads the paintings these people wear; anyone whose painting is missing or does not load draws as the stand-in. */
  async preload(persons: Iterable<CastPerson>): Promise<void> {
    const reg = this.registry;
    await Promise.all([...new Set(persons)].map(async (p) => this.arts.set(p, reg ? await loadCastArt(reg, p) : null)));
  }

  /** Who draws from their painting and who as the stand-in, for the checks. */
  artState(): { painted: CastPerson[]; standIn: CastPerson[] } {
    const all = [...this.arts];
    return { painted: all.filter(([, a]) => a).map(([p]) => p), standIn: all.filter(([, a]) => !a).map(([p]) => p) };
  }
```

- In `sync`, a new view: `const art = this.arts.get(n.person) ?? null; const painted = art ? new PaintedFigure(art) : null; const carried = new Graphics(); root.addChild(shadow, body, ...(painted ? [painted.container] : []), carried, stars);` and the view records `painted, carried`.
- Each frame, the solve:

```ts
      const art = v.painted ? this.arts.get(n.person)! : null;
      const solved = art
        ? solve(pose, n.facing, castHeadScale(v.look.head ?? art.head.share, art.head), art.head, art.skeleton)
        : solve(pose, n.facing, HEAD_SCALE, HEAD_PLATE_DEFAULT);
```

- `v.carried.clear()` beside `v.body.clear()`; both `drawFigure(...)` calls become `this.draw(v, solved, { role: n.role, act: n.act, hat: n.hat, prop: n.prop, slimed: n.slimed, silhouette }, n.recolor, DAZED.has(n.act))` with `silhouette` true in the hidden branch, and:

```ts
  /** The painting where it loaded, the stand-in where it did not. */
  private draw(v: View, s: Solved, o: FigureOpts, recolor: string | null, dazed: boolean): void {
    if (!v.painted) return drawFigure(v.body, s, v.look, o);
    v.painted.apply(s, { recolor, dazed, hat: o.hat && o.role === "bellhop", silhouette: o.silhouette });
    drawCarried(v.carried, s, o);
  }
```

`src/render/look.ts`:
- `const cast = new Cast(scene.layers.play, scene.ambient, registry);` then, beside `await character.ready;`: `await cast.preload((LOBBY.cast ?? []).map((s) => s.person));`.
- Where `window.__next.cast` is set, add `window.__next.castArt = cast.artState();`, and the `castArt` field on the `__next` type in `src/render/app.ts`.
- `stripped()` adds `cast: { bodies: {}, hat: null },`.

`src/render/boards.ts`:
- `BoardSpec` kinds gain `"cast-heads"`; `const HEAD_SHARES = [0.22, 0.26];`.
- `castSheet`: before each row, `const art = await loadCastArt(registry, person);`. In each cell, when `art`:

```ts
          const solved = solve(pose, -1, castHeadScale(look.head ?? art.head.share, art.head), art.head, art.skeleton);
          const fig = new PaintedFigure(art);
          const opts = { role, act, hat: role === "bellhop", prop: true, slimed: false, silhouette: false };
          fig.apply(solved, { recolor: null, dazed: DAZED.has(act), hat: opts.hat, silhouette: false });
          const g = new Graphics();
          drawCarried(g, solved, opts);
          cell.addChild(fig.container, g);
```
  with `dy` from that solve; the stand-in path stays for people without art.
- A new board, the head sizes, and its `case "cast-heads": return castHeads();`:

```ts
  /** Each painted person beside Hammer at their painted head, 0.22 and 0.26 of their height, for the owner to pick. */
  const castHeads = async () => {
    const people: [CastPerson, CastArt][] = [];
    for (const p of PERSONS) {
      const a = await loadCastArt(registry, p);
      if (a) people.push([p, a]);
    }
    const cols = 2 + HEAD_SHARES.length;
    const rows = Math.max(1, people.length);
    const width = cols * CELL_W + 150;
    const height = rows * CELL_H + 50;
    const board = new Container();
    const bg = new Graphics().rect(0, 0, width, height).fill("#20242b");
    for (let r = 0; r <= rows; r++) bg.rect(150, 50 + r * CELL_H, cols * CELL_W, 2).fill("#343a44");
    for (let c = 0; c <= cols; c++) bg.rect(150 + c * CELL_W, 50, 2, rows * CELL_H).fill("#343a44");
    board.addChild(bg);
    ["Hammer", "as painted", ...HEAD_SHARES.map(String)].forEach((text, c) => {
      const t = label(text, "ui", 22);
      t.position.set(150 + c * CELL_W + 12, 14);
      board.addChild(t);
    });
    const plate = registry.hammer.heads.neutral!;
    for (const [row, [person, art]] of people.entries()) {
      const t = label(`${person} (${art.head.share.toFixed(2)})`, "display", 26);
      t.position.set(16, 50 + row * CELL_H + 12);
      board.addChild(t);
      const feet = 50 + row * CELL_H + CELL_H - 32;
      const hammer = createCharacter(registry, "affliction");
      board.addChild(hammer.container);
      await hammer.ready;
      const hs = solve(CLIPS.idle(0, CTX), -1, HEAD_SCALE, plate);
      hammer.container.position.set(150 + CELL_W * 0.6, feet + groundShift(hs, "planted"));
      hammer.apply(hs, "neutral", 0);
      const look = LOOKS[person];
      const k = look.height / HERO_HEIGHT;
      [art.head.share, ...HEAD_SHARES].forEach((share, i) => {
        const role = person.slice(0, -2) as CastRole;
        const s = solve(castPose({ role, act: "idle", t: 0, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 }), -1, castHeadScale(share, art.head), art.head, art.skeleton);
        const fig = new PaintedFigure(art);
        fig.apply(s, { recolor: null, dazed: false, hat: role === "bellhop", silhouette: false });
        const cell = new Container();
        cell.addChild(fig.container);
        cell.scale.set(k);
        cell.position.set(150 + (i + 1) * CELL_W + CELL_W * 0.55, feet + groundShift(s, "planted") * k);
        board.addChild(cell);
      });
    }
    return snapshot(board, width, height);
  };
```
  (Imports: `loadCastArt, PaintedFigure, type CastArt` from `./cast-body`; `castHeadScale` from `./cast-art`; `DAZED, drawCarried` from `./cast`; `CLIPS` is already imported; `CastRole` from `../sim/cast`.)

`scripts/look-boards.mjs`: the kinds list gains `"cast-heads"` after `"cast-fx"` (saved as `cast-heads.png`).

`scripts/cast-art-browser.check.mjs` (create):

```js
// The painted cast loads: at /?next=1&dev=1 the first bellhop draws from his painting; with his rig
// unreachable he falls back to the stand-in and the game plays on; with &noart=1 everyone is a stand-in.
// Usage: node scripts/cast-art-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
/** Opens the game with `query` (blocking `block` when given) and returns the cast's art and the page's errors. */
async function open(name, query, block = null) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if (block) await page.route(block, (r) => r.abort());
  await page.goto(`${base}?next=1&dev=1${query}`);
  await page.waitForFunction(() => window.__next?.castArt && window.__next?.run?.mode === "play", {}, { timeout: 30000 });
  await page.evaluate(() => window.__next.dev.teleport(900, 0));
  await page.waitForTimeout(800);
  const art = await page.evaluate(() => window.__next.castArt);
  await page.screenshot({ path: resolve("artifacts", `cast-art-${name}.png`) });
  await page.close();
  return { art, errors };
}
try {
  const painted = await open("painted", "");
  assert.ok(painted.art.painted.includes("bellhop-1"), `bellhop-1 painted: ${JSON.stringify(painted.art)}`);
  assert.deepEqual(painted.errors, []);
  const blocked = await open("blocked", "", "**/art/cast/bellhop-1-rig.json");
  assert.ok(blocked.art.standIn.includes("bellhop-1") && !blocked.art.painted.includes("bellhop-1"), JSON.stringify(blocked.art));
  assert.deepEqual(blocked.errors.filter((e) => !/Failed to load resource|ERR_FAILED/.test(e)), [], "nothing breaks but the blocked file");
  const plain = await open("noart", "&noart=1");
  assert.deepEqual(plain.art.painted, []);
  console.log("PASS: the painted cast loads, falls back per person, and stays off with noart.");
} finally {
  await browser.close();
}
```

- [ ] **Step 6: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/render scripts`; with the 8090 dev server running (check it first; restart it if it is days old), `node scripts/cast-art-browser.check.mjs http://127.0.0.1:8090/` and `node scripts/cast-browser.check.mjs http://127.0.0.1:8090/`.

- [ ] **Step 7: Look.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-heads,cast-lobby`. At full size: the bellhop-1 row of `cast.png` in every act (the head on the neck, the collar over the neck's join, the gloves where the stand-in's hands were, the arms bending at the shoulder without a crease, the far limbs a shade back, the cart's grip and the polish reaching the rail); `cast-heads.png`; `cast-lobby-1.png` (him behind his cart, behind Hammer). Also `artifacts/cast-art-painted.png`. Fix what reads wrong (a joint a few pixels off shows as a kink: adjust the cut file, `npm run art:sync`, render again).

- [ ] **Step 8: Commit** `src/render scripts/look-boards.mjs scripts/cast-art-browser.check.mjs scripts/render.check.mjs`: "Draw the cast from their paintings, the stand-in where a painting is missing". Push.

- [ ] **Step 9: Owner checkpoint.** Crop the bellhop's row and the heads board for the phone (`node -e "require('sharp')('artifacts/cast.png').extract({left:0,top:50,width:4350,height:420}).toFile('artifacts/cast-bellhop-1.png')"`), send both with `SendUserFile`, and ask in plain words which head size he gets: as painted, 0.22 or 0.26 (or another). Carry on with Task 6; when the answer comes, set `head` in his `LOOKS` entry, re-render, and commit "Size the first bellhop's head as the owner picked".

---

### Task 6: The rim light

**Files:**
- Modify: `src/render/cast-art.ts`, `src/render/cast-body.ts`, `src/render/cast.ts`, `src/render/look.ts`
- Test: `scripts/render.check.mjs`

**Interfaces:**
- Produces: `RIM = { reach: 1300, max: 0.85, offset: 3, color: 0xffd38a }`; `rimFor(x: number, y: number, lights: readonly { x: number; y: number }[]): { side: 1 | -1; k: number } | null`; `PaintedFigure.apply(solved, o, rim?: { side: 1 | -1; k: number; px: number } | null)`; `Cast.setQuality(q: Quality)`; `Cast.sync(prev, cur, alpha, time, screens, lights?)`.

- [ ] **Step 1: Write the failing test** (append to `scripts/render.check.mjs`; import `RIM, rimFor` from `../src/render/cast-art.ts`)

```js
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
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/render.check.mjs`.

- [ ] **Step 3: Implement.** `src/render/cast-art.ts`:

```ts
/** The rim light (R2b §6.2): how far a lamp reaches, the edge's strength at the lamp, how far the edge peeks out (world px), its color. */
export const RIM = { reach: 1300, max: 0.85, offset: 3, color: 0xffd38a } as const;

/** Which side of a cast member the nearest lamp lights, and how strongly; null with no lamp in reach. */
export function rimFor(x: number, y: number, lights: readonly { x: number; y: number }[]): { side: 1 | -1; k: number } | null {
  let best: { x: number; y: number } | null = null;
  let d = Infinity;
  for (const l of lights) {
    const dd = Math.hypot(l.x - x, l.y - y);
    if (dd < d) {
      d = dd;
      best = l;
    }
  }
  if (!best || d >= RIM.reach) return null;
  return { side: best.x >= x ? 1 : -1, k: RIM.max * (1 - d / RIM.reach) };
}
```

`src/render/cast-body.ts`: a rim container behind every layer, holding a mesh per layer on the same geometry with its silhouette texture tinted `RIM.color`, and a copy of the head's container with the head's silhouette:

```ts
  protected readonly rim = new Container({ label: "rim" });
  protected readonly rimHead = new Container({ label: "rim-head" });
```
  In the constructor: `this.rim.zIndex = -1; this.container.addChild(this.rim);`; in the layer loop, `const edge = new Mesh({ geometry, texture: art.textures.get(layer.sil ?? "") ?? Texture.EMPTY }); edge.tint = RIM.color; this.rim.addChild(edge);`; after the head, `const edgeHead = new Sprite(art.textures.get(plate.sil) ?? Texture.EMPTY); edgeHead.anchor.copyFrom(this.headSprite.anchor); edgeHead.tint = RIM.color; this.rimHead.addChild(edgeHead); this.rim.addChild(this.rimHead);`. `apply(solved, o, rim = null)` copies the head's position, rotation and scale onto `this.rimHead`, then:

```ts
    // A warm copy of the figure a few pixels toward the lamp, behind it: only its lit edge shows.
    this.rim.visible = !!rim && !o.silhouette;
    if (rim) {
      this.rim.position.set(rim.side * rim.px, 0);
      this.rim.alpha = rim.k;
    }
```

`src/render/cast.ts`: `private rimOn = true;`, `setQuality(q: Quality): void { this.rimOn = q !== "low"; }` (import `type Quality` from `./app`); `sync(prev, cur, alpha, time, screens, lights: readonly { x: number; y: number }[] = [])`; in `draw`, a `rim` argument passed through to `v.painted.apply`; in the normal (not hidden) branch:

```ts
      const lit = this.rimOn ? rimFor(n.x, n.y - n.h / 2, lights) : null;
      // The root is scaled by k: the edge's offset is in world px.
      const rim = lit && { ...lit, px: RIM.offset / k };
```

`src/render/look.ts`: `cast.sync(prev, cur, alpha, time, game.level.furniture, game.level.lights);`, `cast.setQuality(render.quality);` after the cast is made, and `render.onQuality = (q) => { lighting.setQuality(q); cast.setQuality(q); };`.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`.

- [ ] **Step 5: Look.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast-lobby`; at full size on `cast-lobby-1.png`: a thin warm edge on the bellhop's side toward the nearest lamp, none on the other side, never a halo, nothing over Hammer. Tune `RIM.offset` and `RIM.color` on that frame if it reads as a glow or not at all, and say what you chose in the commit.

- [ ] **Step 6: Commit** `src/render scripts/render.check.mjs`: "Light the painted cast's lamp-side edge". Push.

---

### Task 7: The other seven paintings

This task runs as each painting arrives under `art/incoming/cast/` (the owner makes them with the Codex prompt; Task 10 saves it in `art/outgoing/batch-3-codex.txt`). If none have arrived when Task 6 is done, go on to Task 8 and come back.

**Files:**
- Create: `art/cuts/cast-bellhop-2.json`, `cast-server-1.json`, `cast-server-2.json`, `cast-office-1.json`, `cast-office-2.json`, `cast-student-1.json`, `cast-student-2.json`
- Modify: `src/render/cast.ts` (`LOOKS[...].head`), `scripts/art.check.mjs`
- Add: each painting and its prompt, `art/manifest.json`

The art, rig and render checks of Tasks 3 to 5 already run on every painted and cut person, so each new cut is held to the same bars as the first bellhop's.

- [ ] **Step 1: Write the failing test** (append to `scripts/art.check.mjs`; it fails as soon as a painting lands uncut)

```js
test("every cast painting in art/incoming/cast has its cut", () => {
  for (const p of PERSONS) if (existsSync(`${CAST_IN}/${p}.png`)) assert.ok(existsSync(`art/cuts/cast-${p}.json`), `${p} is painted but not cut`);
});
```

- [ ] **Step 2: For each painting, accept or refuse it first.** `node scripts/art-pose.mjs <person>`, then look at the painting itself at full size and at `artifacts/pose-<person>.png`. It passes when: strict left profile; both arms forward and down, hands open and empty (nothing held); both soles flat with the far foot a step ahead, the soles within 6 px of Hammer's rows; flat green with no floor or shadow; no text; the item's person, build and clothes; the same inked finish as bellhop-1. A painting that fails is not cut: tell the owner in plain words what is wrong and give them the Codex redo line for that item (`Redo <file>: <what was wrong>. Keep everything else from the brief and the checklist.`); if two paintings fail the same way, fix the brief in `art/outgoing/batch-3-cast.txt` too.

- [ ] **Step 3: Cut it.** Copy the closest cut file (bellhop-1's for everyone) to `art/cuts/cast-<person>.json`, move every coordinate by the difference between the two crop offsets `art-pose.mjs` prints, then re-measure on `node scripts/art-grid.mjs cast/<person>` as in Task 3, Step 4. Per costume:
  - **bellhop-2**: as bellhop-1; her bun is the head's.
  - **server-1, server-2**: sleeves rolled to the elbow, so each arm's outline takes the rolled cuff and the bare forearm; the long apron goes with the torso (its hem below the knee), and each leg's fill paints the trouser on under it; server-1's ponytail is the head's.
  - **office-1**: rolled sleeves as the servers; the tie and the lanyard and its badge go with the torso; the glasses and the earbuds with the head.
  - **office-2**: the blazer's sleeves with the arms; the lanyard with the torso; the bob with the head.
  - **student-1, student-2**: the backpack goes with the torso (its straps over the shoulders are the torso's, under the near arm); the overshirt's or the hoodie's sleeves with the arms; glasses, earbuds and student-2's beanie with the head.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npm run art:sync -- --overlay` and look at `artifacts/body-layers-cast-<person>.png` at full size.

- [ ] **Step 5: Look.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-heads,cast-lobby`; the person's row of `cast.png` and their lobby frame at full size, as in Task 5, Step 7.

- [ ] **Step 6: Commit** each person as they are done: `art/cuts/cast-<person>.json art/incoming/cast/<person>.png art/incoming/cast/<person>.prompt.txt art/manifest.json scripts/art.check.mjs scripts/render.check.mjs` (the tests with the first one): "Cut <person>'s painting". Push.

- [ ] **Step 7: Owner checkpoint.** Once all eight are cut, send `cast-heads.png` (cropped to two rows a picture if it is too tall for a phone) and ask the owner to pick each person's head size. Set `head` in each `LOOKS` entry, re-render `cast` and `cast-lobby`, and commit "Size the cast's heads as the owner picked". Push.

---

### Task 8: The hat and the face edits

The hat needs `art/incoming/cast/bellhop-hat.png`; the face edits are optional (`<person>-silly.png`). Without either, everything here still lands and is checked with the test images below; the code-drawn hat stays until the painted one is in.

**Files:**
- Modify: `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `art/cuts/cast-bellhop-1.json`, `art/cuts/cast-bellhop-2.json`, `src/render/cast-art.ts`, `src/render/cast-body.ts`, `src/render/cast.ts`, `src/render/cast-fx.ts`, `src/render/look.ts`
- Test: `scripts/art.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces: `alignOnto(reference, candidate, align)`; `hatBase(png): Promise<{ x, y, span }>` (the hat's base middle and its width, in the PNG's pixels); `castRig(person, keyed, cuts, { silly, strict })` adds `rig.head.silly` and `rig.head.hat`; `registry.cast.hat = { file, width, height, pivot, span }` (`Prop` gains `span?: number`); `CastArt` gains `hat: { texture: Texture; plate: Prop } | null`; `hatWorldWidth(head: CastHead, share: number, height: number): number`; `Flyers.setHat(texture: Texture, pivot: { x: number; y: number }, scale: number)`; `Cast.hat(): { texture: Texture; pivot: { x: number; y: number }; scale: number } | null`.

The cut file gains, for the bellhops, `"hat": { "x": 0, "y": 0, "width": 0 }`: in the crop's pixels, the point on top of the head where the hat's base sits (its middle, a little forward of the crown, on the hair) and the hat's width there.

- [ ] **Step 1: Write the failing tests** (append to `scripts/art.check.mjs`; import `alignOnto, hatBase` from `./art-cut.mjs`)

```js
test("a hat sits on its base's middle, whatever hangs below it", async () => {
  // A pillbox 200 x 120 with a thin chin strap hanging 60 px below its left end, on clear ground.
  const W = 240,
    H = 220;
  const rgba = Buffer.alloc(W * H * 4);
  const paint = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) rgba.set([180, 30, 40, 255], (y * W + x) * 4);
  };
  paint(20, 20, 200, 120);
  paint(30, 140, 10, 60);
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const base = await hatBase(png);
  assert.deepEqual([base.x, base.y, base.span], [120, 139, 200]);
});

test("a face edit that drifted is drawn back onto its body; one of another body is refused when strict", async () => {
  const { keyed, cuts } = await castOf("bellhop-1");
  const meta = await sharp(keyed.png).metadata();
  // The same painting moved 10 px right and 2 px down inside a canvas 10 px bigger: a drifted edit.
  const moved = await sharp({ create: { width: meta.width + 10, height: meta.height + 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: keyed.png, left: 10, top: 2 }])
    .png()
    .toBuffer();
  const plain = await castRig("bellhop-1", keyed, cuts);
  const edited = await castRig("bellhop-1", keyed, cuts, { silly: { png: moved }, strict: true });
  const silly = edited.images.get(edited.rig.head.silly);
  assert.ok(silly, "the edit is synced");
  const [a, b] = await Promise.all([plain.images.get(plain.rig.head.file), silly].map((p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  assert.deepEqual([a.info.width, a.info.height], [b.info.width, b.info.height], "framed exactly like the head");
  let both = 0,
    either = 0;
  for (let i = 3; i < a.data.length; i += 4) {
    both += a.data[i] > 127 && b.data[i] > 127 ? 1 : 0;
    either += a.data[i] > 127 || b.data[i] > 127 ? 1 : 0;
  }
  assert.ok(both / either > 0.95, `back on the neck: overlap ${(both / either).toFixed(3)}`);
  const other = await keyOut(readFileSync("art/incoming/hammer/body-affliction.png"));
  await assert.rejects(castRig("bellhop-1", keyed, cuts, { silly: other, strict: true }), /overlap/);
  const loose = await castRig("bellhop-1", keyed, cuts, { silly: other, strict: false });
  assert.equal(loose.rig.head.silly, undefined, "skipped in a dev run: the plain face stands in");
});
```

Append to `scripts/render.check.mjs` (import `hatWorldWidth` from `../src/render/cast-art.ts`):

```js
test("the hat in flight is as wide as the hat on his head", async () => {
  const rig = await rigOf("bellhop-1");
  const head = { ...rig.head, hat: { x: 100, y: 20, width: 90 } };
  const share = 0.22;
  const k = 355 / HERO_HEIGHT;
  const onHead = head.hat.width * (castHeadScale(share, head) * HERO_HEIGHT / head.height) * k;
  assert.ok(Math.abs(hatWorldWidth(head, share, 355) - onHead) < 1e-9);
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs scripts/render.check.mjs`.

- [ ] **Step 3: Implement**

`scripts/art-cut.mjs`:

```js
/**
 * The candidate redrawn in the reference's frame through an alignTo result: each reference pixel p
 * takes the candidate's pixel at (p + d) / scale, so an edit that drifted or was rescaled sits back
 * on the painting it was made from.
 */
export async function alignOnto(reference, candidate, align) {
  const ref = await sharp(reference.png).metadata();
  const { data, info } = await sharp(candidate.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = ref.width,
    H = ref.height;
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const qx = Math.round((x + align.dx) / align.scale),
        qy = Math.round((y + align.dy) / align.scale);
      if (qx < 0 || qy < 0 || qx >= info.width || qy >= info.height) continue;
      data.copy(out, (y * W + x) * 4, (qy * info.width + qx) * 4, (qy * info.width + qx) * 4 + 4);
    }
  return { png: await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer(), width: W, height: H };
}

/** Where a hat sits: the lowest row at least 60 percent as wide as its widest (a chin strap is narrower), its middle and that width. */
export async function hatBase(png) {
  const { m, w, h } = await alphaMask(png);
  let widest = 0;
  const spans = [];
  for (let y = 0; y < h; y++) {
    const s = rowSpan({ m, w }, y);
    spans.push(s);
    if (s) widest = Math.max(widest, s[1] - s[0] + 1);
  }
  for (let y = h - 1; y >= 0; y--) {
    const s = spans[y];
    if (s && s[1] - s[0] + 1 >= widest * 0.6) return { x: Math.round((s[0] + s[1] + 1) / 2), y, span: s[1] - s[0] + 1 };
  }
  throw new Error("hatBase: no hat");
}
```

  In `castRig(person, keyed, cuts, { silly = null, strict = false } = {})`, after `out.head` is set:

```js
  if (cuts.hat) {
    const s = TEXTURE_SCALE;
    out.head.hat = { x: Math.round((cuts.hat.x - head.box.x) * s), y: Math.round((cuts.hat.y - head.box.y) * s), width: Math.round(cuts.hat.width * s) };
  }
  if (silly) {
    const a = await alignTo(keyed.png, silly.png);
    const verdict = gateExpression(a.overlap, { strict });
    const why = `${person}-silly.png: outline overlap ${a.overlap.toFixed(2)}, expected at least ${ALIGN_MIN}; make it again as an edit of ${person}.png`;
    if (verdict === "refuse") throw new Error(why);
    if (verdict === "skip") console.warn(`${why} (skipped; the plain face stands in)`);
    else {
      const { layers: edited } = await separateLayers(await alignOnto(keyed, silly, a), cuts);
      const plate = await castHeadPlate(edited.head.rgba, W, H, rig.joints.neck, TEXTURE_SCALE, head.box);
      out.head.silly = `cast/${person}-head-silly.png`;
      images.set(out.head.silly, plate.png);
    }
  }
```

`scripts/art-sync.mjs`, in `cast()`: `const sillyFile = join(CAST_IN, \`${person}-silly.png\`); const silly = existsSync(sillyFile) ? await keyOut(readFileSync(sillyFile)) : null;` and `castRig(person, keyed, cuts, { silly, strict })`; after the loop:

```js
  const hatFile = join(CAST_IN, "bellhop-hat.png");
  if (existsSync(hatFile)) {
    const keyed = await keyOut(readFileSync(hatFile));
    const png = await scaled(keyed.png, keyed.width, TEXTURE_SCALE);
    const meta = await sharp(png).metadata();
    const base = await hatBase(png);
    writeFileSync(join(OUT, "cast/bellhop-hat.png"), png);
    // Worn, the long chin-strap loop the painting hangs below the hat would cross the face: the head wears the hat cut at its base.
    const worn = await sharp(png).extract({ left: 0, top: 0, width: meta.width, height: Math.min(meta.height, base.y + 2) }).png().toBuffer();
    writeFileSync(join(OUT, "cast/bellhop-hat-worn.png"), worn);
    registry.cast.hat = { file: "cast/bellhop-hat.png", worn: "cast/bellhop-hat-worn.png", width: meta.width, height: meta.height, pivot: { x: base.x, y: base.y }, span: base.span };
    console.log(`cast hat: ${meta.width}x${meta.height}, sits at ${base.x},${base.y}`);
  }
```

`src/art/registry.ts`: `Prop` gains `/** A hat's width at its base, in its own pixels. */ span?: number;` and `/** The hat as worn: cut at its base, the strap left off (same top-left, so the same pivot). */ worn?: string;`.

`src/render/cast-art.ts`:

```ts
/** The hat's width in world px on a head of `share` on a figure `height` tall, as the head draws it. */
export const hatWorldWidth = (head: CastHead, share: number, height: number): number =>
  ((head.hat?.width ?? 0) * castHeadScale(share, head) * height) / head.height;
```

`src/render/cast-body.ts`: `CastArt` gains `hat: { texture: Texture; plate: Prop } | null`; `loadCastArt` loads `registry.cast.hat.worn` (or `.file` when there is no worn cut) for bellhops whose rig has `head.hat` and fills it; `PaintedFigure`'s constructor adds, when `art.hat && art.head.hat`, a `Sprite` of that texture in `this.head` anchored at the plate's `pivot`, placed at `(head.hat.x - head.neck.x, head.hat.y - head.neck.y)` (the head container is in plate pixels about the neck) and scaled `head.hat.width / plate.span`; `apply` sets its `visible = o.hat` and its tint like the head's. The hat lives in the head's container, so it turns, flips and sizes with the head.

`src/render/cast.ts`: the stand-in's hat is unchanged; `hat()` returns, from bellhop-1's art, the whole hat, strap and all (loaded from `registry.cast.hat.file`), `{ texture, pivot, scale: hatWorldWidth(head, LOOKS["bellhop-1"].head ?? head.share, LOOKS["bellhop-1"].height) / plate.span }`, or null without the painted hat.

`src/render/cast-fx.ts`: `Flyer.g` becomes `Container`; `add` takes a ready `Container` instead of a draw function (the two code-drawn props build their `Graphics` first); `setHat(texture, pivot, scale)` keeps them; `hat()` draws the painted hat when set (a `Sprite`, anchored at its pivot, `scale.set(dir * -scale, scale)` so its front leads), the code-drawn one otherwise.

`src/render/look.ts`: after `await cast.preload(...)`, `const hat = cast.hat(); if (hat) flyers.setHat(hat.texture, hat.pivot, hat.scale);`.

`art/cuts/cast-bellhop-1.json` and `cast-bellhop-2.json`: measure `hat` on the grid once `bellhop-hat.png` is in (`node scripts/art-pose.mjs` is not for the hat; look at it at full size: a red pillbox, gold band, side view, front to the left).

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npm run art:sync`.

- [ ] **Step 5: Look.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-fx,cast-lobby`: at full size the hat seated on both bellhops' heads in every act facing left, and on `cast-lobby-1.png`; in `cast-fx.png` the hat in flight the same size. In the browser, stand Hammer to the first bellhop's right (`window.__next.dev.teleport(1900, 0)`) and screenshot him facing right with his hat on; then knock him down (`teleport(1200, 0)`, then swing) and screenshot: the hat flies off, he lies dazed with the silly face if his edit is in.

- [ ] **Step 6: Commit** `scripts/art-cut.mjs scripts/art-sync.mjs src art/cuts scripts/art.check.mjs scripts/render.check.mjs` (and `art/incoming/cast/bellhop-hat.png`, any `-silly.png` with their prompts, `art/manifest.json`): "Put the painted hat on the bellhops and in flight; swap in the face edits while dazed". Push.

---

### Task 9: Recolors and sizes for the repeats

Needs server-1, student-1 and student-2 cut (Task 7).

**Files:**
- Modify: `scripts/art-cut.mjs`, `art/cuts/cast-server-1.json`, `art/cuts/cast-student-1.json`, `art/cuts/cast-student-2.json`, `src/sim/level.ts`, `src/sim/cast.ts`, `src/sim/levels/lobby.ts`, `src/render/cast.ts`, `src/render/boards.ts`
- Test: `scripts/art.check.mjs`, `scripts/render.check.mjs`, `scripts/cast.check.mjs`

**Interfaces:**
- Produces: `recolorMask(rgba, W, H, spec): Uint8Array`; `maskMean(rgba, mask): number`; `recolorLayer(rgba, mask, hex, mean): Buffer`; the cut file's `"recolors": { "<hex>": { "regions": [[x, y], ...][], "match": { "hue"?: [lo, hi], "sat"?: [lo, hi], "luma"?: [lo, hi] } } }`; `castRig` writes `layers[name].recolors[hex]` and `head.recolors[hex]`; `CastSpawn.size?: number`, `Npc.size: number`.

- [ ] **Step 1: Write the failing tests**

`scripts/art.check.mjs` (import `recolorMask, maskMean, recolorLayer` from `./art-cut.mjs`; import `LOBBY` from `../src/sim/levels/lobby.ts`):

```js
test("a recolor takes the garment to the new hue, keeps its light and dark, and leaves the ink and everything else", () => {
  const W = 40,
    H = 20;
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Left half an olive cloth shaded left to right, an ink line down x = 10, the right half white.
      if (x === 10) rgba.set([16, 16, 16, 255], i);
      else if (x < 20) rgba.set([90 + x * 3, 100 + x * 3, 40 + x, 255], i);
      else rgba.set([240, 240, 236, 255], i);
    }
  const spec = { regions: [[[0, 0], [40, 0], [40, 20], [0, 20]]], match: { hue: [50, 100], sat: [0.2, 1], luma: [40, 255] } };
  const mask = recolorMask(rgba, W, H, spec);
  const out = recolorLayer(rgba, mask, "#c9a227", maskMean(rgba, mask));
  const at = (b, x, y) => [...b.subarray((y * W + x) * 4, (y * W + x) * 4 + 4)];
  assert.deepEqual(at(out, 10, 5), at(rgba, 10, 5), "the ink stays ink");
  assert.deepEqual(at(out, 30, 5), at(rgba, 30, 5), "the white stays white");
  const hue = ([r, g, b]) => {
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    return max === r ? (60 * ((g - b) / (max - min)) + 360) % 360 : max === g ? 60 * ((b - r) / (max - min)) + 120 : 60 * ((r - g) / (max - min)) + 240;
  };
  for (const x of [2, 8, 16]) assert.ok(Math.abs(hue(at(out, x, 5)) - hue([0xc9, 0xa2, 0x27])) < 8, `mustard at ${x}: ${at(out, x, 5)}`);
  const luma = (p) => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
  assert.ok(luma(at(out, 2, 5)) < luma(at(out, 16, 5)), "the shading runs the same way");
});

test("every recolor the lobby asks for is in the cut of the painting it repaints", () => {
  for (const s of LOBBY.cast.filter((c) => c.recolor)) {
    if (!CAST_CUT.includes(s.person)) continue;
    const cuts = JSON.parse(readFileSync(`art/cuts/cast-${s.person}.json`, "utf8"));
    assert.ok(cuts.recolors?.[s.recolor], `${s.id}: ${s.person}'s cut has no ${s.recolor}`);
  }
});
```

`scripts/render.check.mjs` (import `layerTexture` from `../src/render/skin.ts`):

```js
test("two people in one painting keep their own colors, and a recolor the art lacks falls back to the painting", () => {
  const layer = { file: "cast/server-1-torso.png", recolors: { "#7a1f2b": "cast/server-1-7a1f2b-torso.png" } };
  assert.equal(layerTexture(layer, null), "cast/server-1-torso.png");
  assert.equal(layerTexture(layer, "#7a1f2b"), "cast/server-1-7a1f2b-torso.png");
  assert.equal(layerTexture(layer, "#123456"), "cast/server-1-torso.png");
});
```

`scripts/cast.check.mjs`:

```js
test("the recolored repeats are drawn within 4 percent of their painting's height, everyone else as painted", () => {
  const w = createGame({ lobby: LOBBY, stash: STASH }, 5).world;
  for (const n of w.cast) {
    const spawn = LOBBY.cast.find((s) => s.id === n.spawn);
    assert.equal(n.size, spawn.size ?? 1);
    assert.ok(Math.abs(n.size - 1) <= 0.04, `${n.spawn}: ${n.size}`);
    assert.ok(spawn.recolor ? n.size !== 1 : n.size === 1, `${n.spawn}: only the repeats are resized`);
  }
});
```

- [ ] **Step 2: Run, expect FAIL**: `npm run test:next`.

- [ ] **Step 3: Implement**

`scripts/art-cut.mjs`:

```js
/** A pixel's hue in degrees (0 for a grey), its saturation (0 to 1) and its luma (0 to 255). */
function toneOf(r, g, b) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) hue = max === r ? (60 * ((g - b) / (max - min)) + 360) % 360 : max === g ? 60 * ((b - r) / (max - min)) + 120 : 60 * ((r - g) / (max - min)) + 240;
  return { hue, sat: max ? (max - min) / max : 0, luma: 0.3 * r + 0.59 * g + 0.11 * b };
}

/** The garment a recolor names: painted pixels inside its regions (crop px) within its hue, saturation and luma ranges (each optional; a hue range may wrap past 360). */
export function recolorMask(rgba, W, H, { regions, match = {} }) {
  const inside = new Uint8Array(W * H);
  for (const poly of regions) {
    const m = polygonMask(poly, W, H, { x: 0, y: 0 });
    for (let i = 0; i < W * H; i++) if (m[i]) inside[i] = 1;
  }
  const within = (v, r) => !r || (r[0] <= r[1] ? v >= r[0] && v <= r[1] : v >= r[0] || v <= r[1]);
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!inside[i] || rgba[i * 4 + 3] < 128) continue;
    const t = toneOf(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    if (within(t.hue, match.hue) && within(t.sat, match.sat) && within(t.luma, match.luma)) mask[i] = 1;
  }
  return mask;
}

/** The garment's mean luma: what each of its pixels' light and dark is measured against. */
export function maskMean(rgba, mask) {
  let sum = 0,
    n = 0;
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      sum += 0.3 * rgba[i * 4] + 0.59 * rgba[i * 4 + 1] + 0.11 * rgba[i * 4 + 2];
      n++;
    }
  return n ? sum / n : 1;
}

/** The garment in `hex`: each pixel as much lighter or darker than the new color as it was than the garment's mean. */
export function recolorLayer(rgba, mask, hex, mean) {
  const out = Buffer.from(rgba);
  const target = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const k = (0.3 * rgba[i * 4] + 0.59 * rgba[i * 4 + 1] + 0.11 * rgba[i * 4 + 2]) / mean;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(target[c] * k)));
  }
  return out;
}
```

  In `castRig`, after the head: the painting's pixels (`const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });`), then

```js
  for (const [hex, spec] of Object.entries(cuts.recolors ?? {})) {
    // The mean is the painting's, so every layer's painted-in stretch takes the same light and dark.
    const mean = maskMean(data, recolorMask(data, W, H, spec));
    const tag = hex.slice(1);
    for (const name of LAYER_Z) {
      const l = out.layers[name];
      const rgba = recolorLayer(layers[name].rgba, recolorMask(layers[name].rgba, W, H, spec), hex, mean);
      const file = `cast/${person}-${tag}-${name}.png`;
      images.set(file, await scaled(await paddedLayer(rgba, W, H, { x0: l.x, y0: l.y, width: l.width, height: l.height }), l.width, TEXTURE_SCALE));
      (l.recolors ??= {})[hex] = file;
    }
    const rgba = recolorLayer(layers.head.rgba, recolorMask(layers.head.rgba, W, H, spec), hex, mean);
    const plate = await castHeadPlate(rgba, W, H, rig.joints.neck, TEXTURE_SCALE, head.box);
    const file = `cast/${person}-${tag}-head.png`;
    images.set(file, plate.png);
    (out.head.recolors ??= {})[hex] = file;
  }
```

  `scripts/art-sync.mjs --overlay` also lays each recolored layer into the person's sheet, to check the masks.

Cut files (measure the regions on the grid, then check the masks on the overlay sheet):
- `cast-server-1.json`: `"recolors": { "#7a1f2b": { "regions": [<the vest's outline>], "match": { "luma": [14, 120] } } }`: the black vest goes burgundy; the white shirt and the apron below the vest stay.
- `cast-student-1.json`: `"recolors": { "#c9a227": { "regions": [<the overshirt's body and sleeves>], "match": { "hue": [45, 110], "sat": [0.15, 1], "luma": [30, 255] } } }`: the olive overshirt goes mustard; the white t-shirt, the backpack and the ink stay.
- `cast-student-2.json`: `"recolors": { "#2a8c8a": { "regions": [<the hoodie's body and sleeves>], "match": { "sat": [0, 0.2], "luma": [55, 235] } } }`: the grey hoodie goes teal; the black backpack and joggers (darker than 55) and the ink stay.

`src/sim/level.ts`: `CastSpawn` gains `/** Drawn this much taller or shorter than the painting: a recolored repeat, within ±4 percent (R2b §5). */ size?: number;`. `src/sim/cast.ts`: `Npc` gains `size: number;` and `createCast` sets `size: s.size ?? 1`. `src/sim/levels/lobby.ts`: `student-rail-3` gains `size: 1.03`, `server-tables` `size: 0.97`, `student-table` `size: 1.02`.

`src/render/cast.ts`: `const k = (v.look.height * n.size) / HERO_HEIGHT;` (both branches).

`src/render/boards.ts`: `castSheet` adds a row after the eight for each recolored spawn in `LOBBY.cast` (labelled `<person> <hex>`), drawn with that recolor and size.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npm run art:sync -- --overlay` and look at the recolored layers.

- [ ] **Step 5: Look.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-lobby`: the three recolored rows and `cast-lobby-4.png` (the rail: student-1 in olive and in mustard side by side), `cast-lobby-5.png` (the tables: the burgundy-vested server, the teal-hoodied student) at full size: only the garment changed, its shading intact, no speckles where the mask frays.

- [ ] **Step 6: Commit** `scripts/art-cut.mjs scripts/art-sync.mjs art/cuts src scripts/art.check.mjs scripts/render.check.mjs scripts/cast.check.mjs`: "Recolor and resize the cast's repeats from masks in their cuts". Push.

---

### Task 10: The boards, the checks, the docs and the review

**Files:**
- Create: `art/outgoing/batch-3-codex.txt`
- Modify: `README.md`, `docs/superpowers/specs/2026-10-12-r2b-lobby-cast-design.md`, `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md`, `art/ART-REQUEST.md`

- [ ] **Step 1: Every check.** `npm run test:next`; `npm run test:game`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`. With the 8090 dev server: `next-browser.check.mjs`, `run-browser.check.mjs`, `moves-browser.check.mjs`, `acts-browser.check.mjs`, `cast-browser.check.mjs`, `cast-art-browser.check.mjs`, `start-screen.check.mjs`, `browser-smoke.mjs http://127.0.0.1:8090/?next=1 artifacts/smoke-dev.png`. Then `node scripts/with-app-env.mjs vite build`, `vite preview --host 127.0.0.1 --port 8091 --strictPort`, and `browser-smoke.mjs http://127.0.0.1:8091/?next=1 artifacts/smoke-preview.png --baseline artifacts/smoke-dev.json`. Every one passes; a failure is fixed before anything else.

- [ ] **Step 2: Every board, at full size.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-heads,cast-fx,cast-lobby`. Look at every person in every act, both bellhops' hats, the rim light in each lobby frame, the recolors, the screen's silhouette (`cast-lobby-6.png`). In the browser play the lobby once on each route (`?next=1&dev=1`), stepping frame by frame through a shove, a rush, a knockdown and a getup (`window.__next.dev` and the pause key): nothing pops between frames, no texture flashes as a stand-in, nothing of the cast over Hammer's face.

- [ ] **Step 3: The docs.**
  - `README.md`, "The lobby's cast": the cast is painted (the cut files, `castRig`, `PaintedFigure`, the head shares, the rim light, the recolors, the hat and the face edits, the stand-in as the fallback per person and with `&noart=1`); the tools (`art-pose.mjs`, `art-grid.mjs cast/<person>`, `art-sync.mjs --overlay`); the new board (`cast-heads`) and check (`cast-art-browser.check.mjs`).
  - The R2b design, §6.2: an "As built in R2b-2" paragraph (the arms turned to Hammer's stance and why; the head as a plate behind the collar; the head shares the owner picked; the recolors baked at sync; the rim light's numbers).
  - The rebuild spec §7.1 (the cast's rigs) and §8.3 (the lobby as built): one paragraph each.
  - `art/ART-REQUEST.md` §5: what is in and what is still open (the face edits).
  - `art/outgoing/batch-3-codex.txt`: the two Codex prompts that made the paintings (item 1, and items 2 to 9 with the checklist), and the redo line from Task 7, Step 2, with a line on top saying they are for Codex's "work on this laptop" mode.

- [ ] **Step 4: Commit** the docs: "Document R2b-2: the painted cast". Push.

- [ ] **Step 5: The owner's sign-off.** Send the boards (cropped for a phone) and two lobby screenshots, and list the decisions above in plain words. Fold in what they ask for, each as its own commit.

- [ ] **Step 6: The final review.** One fresh reviewer on the most capable model reads the whole R2b-2 diff (`git diff 6e5b63e..HEAD`) against this plan and the design; fix its critical and important findings with tests, list its minors in the next handoff, push.
