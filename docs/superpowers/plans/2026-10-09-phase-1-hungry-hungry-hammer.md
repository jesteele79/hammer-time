# Phase 1 Hungry Hungry Hammer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship spec phase 1: the side-quest framework hosted by the engine, Hungry Hungry Hammer at the banquet table, the BUFFET door in the lobby, the Side quests row on the start screen, the quest tally with rewards, and `scripts/hungry.check.mjs`.

**Architecture:** The quest is a self-contained module (`src/game/quests/hungry.ts` rules, `hungry-draw.ts` drawing, `food.ts` catalog and physics) implementing the phase 0 `Quest` interface. The engine gains modes `quest` and `questTally`, a `startQuest()` host (title card, fixed-step loop, pause, the stage/grade pipeline, thought and comic drawing from the quest's hero pose, rewards, return to the door or the title) and never learns quest rules. Hammer's dive is a new rig pose `lungeJoints(u, reach)` drawn through the existing rig; rules read the far hand from the same rig.

**Tech Stack:** TypeScript, Canvas 2D, React 19 shell, node:test via `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-09-hammer-time-expansion-design.md` sections 2, 4, 6, 12, 13 (phase 1). Phase 0 plan for conventions: `docs/superpowers/plans/2026-10-09-phase-0-warm-up.md`.

## Global Constraints

- Hard limits (spec §2): Hammer's face never changes and nothing is drawn over it; the Affliction shirt stays; the pig and the Coke Zero / nuts / Buc-ee's photos stay byte-for-byte (they may be drawn scaled, never edited); the mallet is the main weapon; the six recordings are the only spoken lines; test 1 of `gameplay.check.mjs` is never edited.
- Every Hammer line in the quest is a thought bubble (via `QuestContext.say`); NPC lines ("Sanitize!", "Are we still working on that?") are speech bubbles drawn by the quest, kept clear of his face.
- Spec numbers used as given: table x 40–344, 14 px thick; Hammer's plate x 58; rivals at x 170 / 230 / 290 drawn at 0.85 scale facing left; chute (192, 60); 60 s round; waves (5 appetizers at 0 s then 3 every 4 s; 4 entrées at 20 s then 2 every 4 s; dessert cart at 42 s spills 8); specials once each per round; food 12 px tall; bounce once with vy × 0.4; friction 0.88/s; reach 90 + 10 per item, cap 250; charge 0.5 s; eat radius 10 px; spring back 0.25 s; rivals react within 45 px with a 0.2 s lean; reactions student 0.55 / bellhop 0.40 / nurse 0.28 s, −20 % per anger level, min 0.15 s; anger +1 per theft, −1 per 8 s; server bonk range 70 px, server away 15 s, tray dumps 4; rival stun 2 s; plane hit −150; suitcase 4 s; slap stun 1 s; combo window 1.2 s, ×2 at 5, ×3 at 10; grades COMPED ≥ 3000, GOOD TIPPER ≥ 2000, SPLIT THE CHECK ≥ 1200, WATER ONLY below; fullBelly = grade ≥ GOOD TIPPER; practice bests in `localStorage` as `hammer-time-best-hungry`.
- Never stage `package-lock.json` or `src/routeTree.gen.ts`. Commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, message ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Dev server on 8090, production preview on 8091 (8080/8081 belong to another tool). Never load an image file that does not exist (a 404 is a console error that fails the smoke check), so `public/food-sheet.webp` is not referenced until it is added.

## Spec conflicts resolved here (each is ledgered as a ruling at execution)

1. **Tabletop height.** Spec says tabletop y = 150 with Hammer's feet at 192. Hammer is 50 px tall, so y 150 is his face height, and rivals at 0.85 scale (39 px) standing at the same floor would be hidden behind it. The table top sits at **y = 170** (his waist); rivals stand behind it with head and shoulders above the cloth. Paper planes fly **20 px above the tabletop (y = 150)**, the same offset the spec's y = 130 had from its y = 150 table.
2. **Charged reach and "fully charged" steals.** With reach linear in hold time, only a full 0.5 s hold reaches 250 px, which lands on the nurse's plate alone, so the student's and bellhop's plates could never be robbed. Holds up to `TAP_SECONDS` (0.12 s) are taps at the base reach; beyond that the reach grows linearly from the base reach to 250 by 0.5 s, and **any charged lunge (held past the tap) that ends on a rival's plate steals**. Taps never steal. A reach marker on the tablecloth shows where the dive will land while charging.
3. **Bonk reach.** "Hits a rival who has leaned into range": a rival's lean hand reaches 45 px toward Hammer at most (the student to x 125), beyond the 70 px server range (x 110). Rivals are hit when their lean target is within **90 px** of the table's left end (x ≤ 130). The suitcase is cleared by the same swing: the mallet slams the end of the table and every suitcase tumbles off.
4. **Desserts after the cart.** The spec lists only the cart for 40–60 s; desserts also dump **2 every 4 s at 44, 48, 52 and 56 s** so the last third does not run dry.
5. **Quest interface.** `Quest` gains `pose(): HeroPose` so the engine can draw quest thoughts and keep comic words off his face with the same face-safe code as the main game. `HeroPose` gains `lunge?` and `coil?`.
6. **Hot vs full belly.** The engine has one state for "hot snot and three patience" (`form = 2`), so `hot` and `fullBelly` both set `form = 2` on return.
7. **Door data.** Doors are a typed `Level.doors` list (`{ x, label, quest, table, locked? }`) rather than a `Prop` kind, because props carry y/w/h and are solid furniture; doors are neither.
8. **Side quests row.** Fare Darts is phase 3; the row ships with the one playable quest and gains the second button in phase 3 instead of showing a dead button now.

## Review Focus

1. **Holding or mashing the lunge button** (held through the whole round, pressed again during the spring-back or while ducking or stunned): no auto-repeat lunges, no stuck charge, no lunge from a stale press. Pinned in Task 3.
2. **Pausing or losing window focus mid-charge or mid-dive**: pause works in `quest`, the quest clock stops, and resuming does not invent a press. Pinned in Task 6.
3. **The door from the wrong state** (airborne, mid-swing, already spent, standing just outside it): enters only on the floor in front of an unspent door; returning leaves him standing, not stuck crouched, briefly invulnerable. Pinned in Task 6.
4. **Practice then a real run**: practice rewards never leak into a run, and only practice records a best. Pinned in Task 6.
5. **Phone layouts during the quest** (390×844, 844×390): ten touch buttons, no horizontal overflow, the quest HUD readable. Pinned in Task 7.

---

## File Structure

- `src/game/rig.ts` (modify): `LUNGE_LEAN`, `LUNGE_HAND`, `lungeJoints()`, `coilJoints()`.
- `src/game/hero.ts` (modify): `HeroPose.lunge`, `HeroPose.coil`, `heroJoints` order, `heroFarHand()`.
- `src/game/people.ts` (create): `drawPerson()` shared by the engine and the quest.
- `src/game/quests/quest.ts` (modify): `Quest.pose()`.
- `src/game/quests/food.ts` (create): food catalog, table geometry, food physics.
- `src/game/quests/hungry.ts` (create): `HungryQuest` rules, hud, result, pose.
- `src/game/quests/hungry-draw.ts` (create): drawing the banquet scene.
- `src/game/audio.ts` (modify): `chomp()`, `slide()`, `ding()`.
- `src/game/levels.ts` (modify): `Door`, `Level.doors`, BUFFET door in the lobby.
- `src/game/engine.ts` (modify): modes, quest host, doors, HUD payload, dev levers, probe.
- `src/components/kiln-hop.tsx`, `src/styles.css` (modify): quest HUD, card, tally veil, Side quests row.
- `scripts/game-harness.mjs` (create): the `game()` / `bossGame()` harness, now shared.
- `scripts/gameplay.check.mjs` (modify outside test 1): import the harness; face sweep gains lunge and coil.
- `scripts/hungry.check.mjs` (create): quest and engine-integration checks.
- `scripts/quest-browser.check.mjs` (create): Side quests row, practice round, door round, phones, filmstrip.
- `scripts/game-browser-check.mjs` (modify): pose board gains lunge cells.
- `package.json` (modify): `test:game` runs both check files.
- `README.md` (modify).

---

### Task 1: The lunge pose

**Files:** Modify `src/game/rig.ts`, `src/game/hero.ts`; test in `scripts/gameplay.check.mjs` (face sweep, not test 1).

**Interfaces:**
- Produces: `lungeJoints(u: number, reach: number): Joints` (u 0..1 extension, reach in world px), `coilJoints(c: number): Joints`, `LUNGE_LEAN = 55`; `HeroPose.lunge?: { u: number; reach: number }`, `HeroPose.coil?: number`; `heroFarHand(p: HeroPose): Point | null` (world px).

- [ ] **Step 1: Failing test.** In the face test, after the watch sweep:

```js
  // The dive: near arm and mallet trail behind, the far arm leads below his chin.
  const farFace = (j, label) => {
    if (!j.far) return;
    const { elbow, hand } = farArm(j);
    const [a, b] = FACE.map((corner) => rigPoint(j, corner, "head"));
    const box = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) };
    for (const [from, to, r] of [[FAR_SHOULDER, elbow, 46], [elbow, hand, 42]])
      for (let t = 0; t <= 1.0001; t += 0.1) {
        const p = rigPoint(j, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, "torso");
        const dx = Math.max(box.x0 - p.x, 0, p.x - box.x1),
          dy = Math.max(box.y0 - p.y, 0, p.y - box.y1);
        assert.ok(Math.hypot(dx, dy) > r, `${label}: far arm crosses the face`);
      }
  };
  for (let i = 0; i <= 100; i++)
    for (const reach of [0, 90, 170, 250]) {
      const u = i / 100;
      clear(lungeJoints(u, reach), `lunge ${u} ${reach}`);
      farFace(lungeJoints(u, reach), `lunge ${u} ${reach}`);
      clear(coilJoints(u), `coil ${u}`);
    }
```

Add `coilJoints, lungeJoints` to the rig import. Also add a new check:

```js
test("the dive's far hand lands at tabletop height, its reach ahead of the rest point", () => {
  const pose = (u, reach) => ({ x: 18, foot: 192, facing: 1, phase: 0, moving: false, air: false, reduced: false, mega: 0, swing: 0, lunge: { u, reach } });
  const rest = heroFarHand(pose(1, 0));
  assert.ok(rest.y > 160 && rest.y < 172, `hand at tabletop height: ${rest.y}`);
  for (const reach of [90, 170, 250]) {
    const hand = heroFarHand(pose(1, reach));
    assert.ok(Math.abs(hand.x - rest.x - reach) < 1e-6, "reach is measured from the rest point");
    assert.ok(Math.abs(hand.y - rest.y) < 1e-6);
  }
  assert.equal(heroFarHand({ ...pose(0, 0), lunge: undefined }), null, "no far hand at rest");
});
```

Import `heroFarHand` from hero.ts.

- [ ] **Step 2: Run, expect FAIL** (`lungeJoints` not exported). `npm run test:game`.

- [ ] **Step 3: Implement** (`rig.ts`, import `HERO_HEIGHT` from `./combat`):

```ts
/**
 * Hungry Hungry Hammer dive: lean out over the table and scoot along it, far
 * hand first at tabletop height. `reach` is in world pixels; the head stays level.
 */
export const LUNGE_LEAN = 55;
export const LUNGE_HAND = { x: 568, y: 22 };
const LUNGE_POLE = { x: 330, y: 650 };
export function lungeJoints(u: number, reach: number): Joints {
  const k = Math.max(0, Math.min(1, u));
  return {
    ...REST,
    lean: LUNGE_LEAN * k,
    dx: (reach * k * 1371) / HERO_HEIGHT,
    stride: 0.8 * k,
    A: A0 + 60 * k,
    F: F0 + 70 * k,
    H: H0 + 50 * k,
    far:
      k > 0.02
        ? { x: FAR_REST.x + (LUNGE_HAND.x - FAR_REST.x) * k, y: FAR_REST.y + (LUNGE_HAND.y - FAR_REST.y) * k }
        : null,
    pole: LUNGE_POLE,
  };
}
/** Winding up a charged dive: sit back on the heels. */
export function coilJoints(c: number): Joints {
  const k = Math.max(0, Math.min(1, c));
  return { ...REST, lean: -7 * k, squat: 0.25 * k, stride: -0.25 * k };
}
```

`hero.ts`: `HeroPose` gains `/** Banquet dive: extension 0..1 and reach in world px. */ lunge?: { u: number; reach: number }; /** 0..1 wind-up before a charged dive. */ coil?: number;`. In `heroJoints` after the swing branch:

```ts
  if (p.lunge && p.lunge.u > 0) return lungeJoints(p.lunge.u, p.lunge.reach);
  if ((p.coil ?? 0) > 0) return coilJoints(p.coil!);
```

and

```ts
/** World position of the far hand when it is out (the dive, the watch, the towel), else null. */
export function heroFarHand(p: HeroPose): Point | null {
  const j = heroJoints(p);
  if (!j.far) return null;
  return artworkToWorld(p, rigPoint(j, farArm(j).hand, "torso"));
}
```

- [ ] **Step 4: Run, expect PASS.** If the hand height assertion fails, adjust `LUNGE_HAND` (torso space) so the world hand sits at y 160–172 and rerun the face sweep.
- [ ] **Step 5: Render** a strip (scratch render script from phase 0): coil 1, lunge u 0.3/0.6/1 at reach 90 and 250, spring back u 0.5. Check: head level, far hand leads at the table edge height, mallet trails, no neck/waist gap at 55° that phase 0's knee cap / pelvis fixes do not cover (if the back of the shirt opens, extend the shorts top edge up the back as phase 0 noted).
- [ ] **Step 6: Commit** `src/game/rig.ts src/game/hero.ts scripts/gameplay.check.mjs` — "Add the banquet dive pose with the far hand leading".

---

### Task 2: Food catalog and physics; shared harness

**Files:** Create `src/game/quests/food.ts`, `scripts/game-harness.mjs`, `scripts/hungry.check.mjs`; modify `scripts/gameplay.check.mjs` (harness import, outside test 1), `package.json`.

**Interfaces:**
- Produces: `FoodKind`, `FOODS`, `APPETIZERS`, `ENTREES`, `DESSERTS`, `SPECIALS`, `TABLE = { left: 40, right: 344, top: 170, thick: 14 }`, `CHUTE = { x: 192, y: 60 }`, `FOOD_SIZE = 12`, `Food`, `Blocker`, `makeFood(id, kind, x, y, vx, vy)`, `stepFood(f, dt, blockers)`, `onTable(f)`, `nearTable(f)`; harness `game()`, `bossGame()`.

- [ ] **Step 1: Move the harness.** Cut `function game()` and `function bossGame()` (with their bodies, unchanged) from `scripts/gameplay.check.mjs` into `scripts/game-harness.mjs` as `export function game()` / `export function bossGame()` with the imports they need (`Game`, `buildLevels`); add `spentDoors: new Set(), quest: null, questInfo: null, questResult: null, cardNext: "play"` to the `Object.assign` defaults (class field initializers do not run under `Object.create`). In `gameplay.check.mjs` add `import { game, bossGame } from "./game-harness.mjs";`. Run `npm run test:game`: 46/46 still pass.

- [ ] **Step 2: Failing test** (`scripts/hungry.check.mjs`, and `package.json` `test:game` becomes `node --loader ./scripts/game-test-loader.mjs --test scripts/gameplay.check.mjs scripts/hungry.check.mjs`):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { CHUTE, FOODS, TABLE, makeFood, onTable, stepFood } from "../src/game/quests/food.ts";

const run = (f, seconds, blockers = []) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepFood(f, 1 / 60, blockers);
};

test("food falls from the chute, bounces once, then slides and slows", () => {
  const f = makeFood(1, "ribeye", CHUTE.x, CHUTE.y, 0, 0);
  let landings = 0,
    wasUp = true;
  for (let i = 0; i < 180; i++) {
    stepFood(f, 1 / 60, []);
    if (f.y >= TABLE.top && wasUp) landings++;
    wasUp = f.y < TABLE.top;
  }
  assert.equal(landings, 2, "one bounce, then it settles");
  assert.ok(onTable(f));
  assert.equal(f.value, FOODS.ribeye.value);
  const s = makeFood(2, "pie", 150, TABLE.top, 100, 0);
  s.bounced = true;
  run(s, 1);
  assert.ok(Math.abs(s.vx - 88) < 1, `friction keeps 88% a second: ${s.vx}`);
});

test("food bounces off the table ends and off a suitcase", () => {
  const f = makeFood(1, "bread", TABLE.right - 20, TABLE.top, 200, 0);
  f.bounced = true;
  run(f, 0.3);
  assert.ok(f.vx < 0 && f.x <= TABLE.right - 6, "off the right end");
  const g = makeFood(2, "bread", 100, TABLE.top, 150, 0);
  g.bounced = true;
  run(g, 0.5, [{ x0: 140, x1: 156 }]);
  assert.ok(g.vx < 0 && g.x <= 140 - 6, "off the suitcase");
});
```

- [ ] **Step 3: Run, expect FAIL** (module missing).

- [ ] **Step 4: Implement** `src/game/quests/food.ts`:

```ts
// @file src/game/quests/food.ts
/** Banquet food: what it is, what it is worth, and how it slides along the tablecloth. */
export type FoodKind =
  | "shrimp" | "bread" | "eggs" | "kolache" | "nuggets"
  | "ribeye" | "chicken" | "brisket" | "grits" | "club"
  | "pie" | "cheesecake" | "pudding"
  | "coke" | "nuts" | "buccees" | "hotsauce" | "togo" | "check";

export type FoodSpec = {
  name: string;
  /** Three-letter tag drawn on the procedural plate. */
  label: string;
  value: number;
  color: string;
  /** Index in the requested food sheet (spec appendix B), when it exists. */
  sheet: number | null;
  special?: boolean;
};

export const FOODS: Record<FoodKind, FoodSpec> = {
  shrimp: { name: "Shrimp cocktail", label: "SHR", value: 80, color: "#f08a6c", sheet: 0 },
  bread: { name: "Bread basket", label: "BRD", value: 50, color: "#d9a35a", sheet: 1 },
  eggs: { name: "Deviled eggs", label: "EGG", value: 60, color: "#f2d65c", sheet: 2 },
  kolache: { name: "Kolache", label: "KOL", value: 70, color: "#e8b46a", sheet: 3 },
  nuggets: { name: "Beaver Nuggets", label: "BVR", value: 90, color: "#c98a3c", sheet: 4 },
  ribeye: { name: "Ribeye", label: "RIB", value: 300, color: "#8a3b2a", sheet: 5 },
  chicken: { name: "Chicken fried steak", label: "CFS", value: 220, color: "#c7924e", sheet: 6 },
  brisket: { name: "Brisket plate", label: "BSK", value: 260, color: "#6b3a26", sheet: 7 },
  grits: { name: "Shrimp and grits", label: "GRT", value: 200, color: "#efd9a0", sheet: 8 },
  club: { name: "Club sandwich", label: "CLB", value: 150, color: "#e3c27a", sheet: 9 },
  pie: { name: "Pie slice", label: "PIE", value: 180, color: "#c2643c", sheet: 10 },
  cheesecake: { name: "Cheesecake", label: "CHZ", value: 200, color: "#f5ecd2", sheet: 11 },
  pudding: { name: "Banana pudding", label: "PUD", value: 160, color: "#f3e08a", sheet: 12 },
  coke: { name: "Coke Zero", label: "ZRO", value: 100, color: "#1b1b1b", sheet: null, special: true },
  nuts: { name: "Mixed nuts", label: "NUT", value: 100, color: "#a8742f", sheet: null, special: true },
  buccees: { name: "Buc-ee's bag", label: "BUC", value: 300, color: "#f5c518", sheet: null, special: true },
  hotsauce: { name: "Hot sauce", label: "HOT", value: 150, color: "#c8281e", sheet: 13, special: true },
  togo: { name: "To-go box", label: "TOGO", value: 0, color: "#f4f1ea", sheet: 14, special: true },
  check: { name: "The check", label: "BILL", value: -400, color: "#2a1d14", sheet: 15, special: true },
};

export const APPETIZERS: readonly FoodKind[] = ["shrimp", "bread", "eggs", "kolache", "nuggets"];
export const ENTREES: readonly FoodKind[] = ["ribeye", "chicken", "brisket", "grits", "club"];
export const DESSERTS: readonly FoodKind[] = ["pie", "cheesecake", "pudding"];
export const SPECIALS: readonly FoodKind[] = ["coke", "nuts", "buccees", "hotsauce", "togo", "check"];

/** The banquet table in view space; its top sits at Hammer's waist. */
export const TABLE = { left: 40, right: 344, top: 170, thick: 14 };
export const CHUTE = { x: 192, y: 60 };
export const FOOD_SIZE = 12;
const GRAVITY = 520;
/** Velocity kept per second while sliding on the cloth. */
const FRICTION = 0.88;

export type Food = {
  id: number;
  kind: FoodKind;
  value: number;
  /** Centre x and bottom y, in view space. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  special: boolean;
  bounced: boolean;
};
export type Blocker = { x0: number; x1: number };

export function makeFood(id: number, kind: FoodKind, x: number, y: number, vx: number, vy: number): Food {
  const spec = FOODS[kind];
  return { id, kind, value: spec.value, x, y, vx, vy, size: FOOD_SIZE, special: !!spec.special, bounced: false };
}

/** Settled on the tablecloth. */
export const onTable = (f: Food) => f.bounced && f.vy === 0 && f.y >= TABLE.top;
/** Low enough to grab: on the cloth or skipping just above it. */
export const nearTable = (f: Food) => f.y >= TABLE.top - 24;

/** Fall, bounce once on the cloth, then slide with friction off the ends and blockers. */
export function stepFood(f: Food, dt: number, blockers: readonly Blocker[]) {
  if (!onTable(f)) {
    f.vy += GRAVITY * dt;
    f.y += f.vy * dt;
    if (f.y >= TABLE.top) {
      f.y = TABLE.top;
      if (!f.bounced && f.vy > 60) f.vy = -f.vy * 0.4;
      else f.vy = 0;
      f.bounced = true;
    }
  }
  const half = f.size / 2,
    was = f.x;
  f.x += f.vx * dt;
  if (onTable(f)) {
    f.vx *= FRICTION ** dt;
    if (Math.abs(f.vx) < 2) f.vx = 0;
  }
  if (f.x < TABLE.left + half) {
    f.x = TABLE.left + half;
    f.vx = Math.abs(f.vx) * 0.8;
  } else if (f.x > TABLE.right - half) {
    f.x = TABLE.right - half;
    f.vx = -Math.abs(f.vx) * 0.8;
  }
  if (!nearTable(f)) return;
  for (const b of blockers) {
    if (f.x + half <= b.x0 || f.x - half >= b.x1) continue;
    if (was <= (b.x0 + b.x1) / 2) {
      f.x = b.x0 - half;
      f.vx = -Math.abs(f.vx) * 0.8;
    } else {
      f.x = b.x1 + half;
      f.vx = Math.abs(f.vx) * 0.8;
    }
  }
}
```

- [ ] **Step 5: Run, expect PASS** (48 checks). **Step 6: Commit** `src/game/quests/food.ts scripts/game-harness.mjs scripts/gameplay.check.mjs scripts/hungry.check.mjs package.json` — "Add banquet food and its tablecloth physics; share the test harness".

---

### Task 3: Hammer at the table (lunge, eating, combos, specials, round, grade)

**Files:** Create `src/game/quests/hungry.ts`; modify `src/game/quests/quest.ts` (`pose()`); extend `scripts/hungry.check.mjs`.

**Interfaces:**
- Consumes: Task 1 `lungeJoints`/`heroFarHand`/`HeroPose.lunge|coil`; Task 2 food module.
- Produces: `HungryQuest` (implements `Quest`), constants `ROUND_SECONDS, REACH_BASE, REACH_STEP, REACH_MAX, TAP_SECONDS, CHARGE_SECONDS, LUNGE_OUT, LUNGE_HOLD, LUNGE_BACK, EAT_RADIUS, PLATE_RADIUS, COMBO_WINDOW, HAMMER_X, HAMMER_FOOT, HAND0, GRADES`, `gradeFor(score)`, `reactionFor(rival)`; quest fields used by tests and drawing: `time, food, rivals, server, planes, suitcases, cart, lunge, swing, duck, stun, plate, plateTotal, comboBonus, combo, bestCombo, togo, eaten, steals, hits, coins, charge, star, hot, specials, schedule, specialsAt, cartAt`, methods `reach()`, `handX()`, `pose()`.

- [ ] **Step 1: `Quest.pose()`** — add to `src/game/quests/quest.ts`: `/** Hammer as the quest draws him, so the host can keep words off his face. */ pose(): HeroPose;` (tsc fails until Task 3 implements it; nothing else implements `Quest`).

- [ ] **Step 2: Failing tests** (append to `scripts/hungry.check.mjs`):

```js
import { HungryQuest, HAND0, REACH_BASE, REACH_MAX, ROUND_SECONDS, TAP_SECONDS, CHARGE_SECONDS, gradeFor } from "../src/game/quests/hungry.ts";
import { seededRandom } from "../src/game/levels.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
function quest(seed = 7) {
  const said = [],
    comics = [];
  const q = new HungryQuest();
  const audio = new Proxy({}, { get: () => () => {} });
  q.enter(
    { audio, images: {}, drawHero() {}, rng: seededRandom(seed), say: (t) => said.push(t), comic: (x, y, t) => comics.push(t), reduced: false },
    { table: "banquet", practice: true },
  );
  return { q, said, comics };
}
/** No dumps, specials, cart, server or rival reactions: only what a test places. */
function quiet(seed) {
  const t = quest(seed);
  t.q.schedule = [];
  t.q.specialsAt = [];
  t.q.cartAt = Infinity;
  t.q.server.away = 1e9;
  for (const r of t.q.rivals) r.base = 1e9;
  return t;
}
const steps = (q, n, inp = input()) => {
  for (let i = 0; i < n; i++) q.step(1 / 60, inp);
};
/** Press, hold for `seconds`, release, and let the dive spring back. */
function dive(q, seconds) {
  q.step(1 / 60, input({ jump: true }, { jump: true }));
  for (let i = 1; i < Math.round(seconds * 60); i++) q.step(1 / 60, input({ jump: true }));
  steps(q, 32);
}
const place = (q, kind, x) => {
  const f = makeFood(q.food.length + 100, kind, x, TABLE.top, 0, 0);
  f.bounced = true;
  q.food.push(f);
  return f;
};

test("a tap dives to the base reach; reach grows 10 px per item and caps at 250", () => {
  const { q } = quiet();
  assert.equal(q.reach(), REACH_BASE);
  place(q, "bread", HAND0 + REACH_BASE);
  dive(q, 0.05);
  assert.equal(q.eaten, 1);
  assert.equal(q.plateTotal, FOODS.bread.value);
  assert.equal(q.reach(), REACH_BASE + 10);
  q.eaten = 40;
  assert.equal(q.reach(), REACH_MAX);
});

test("holding charges the dive from the base reach to 250 by half a second", () => {
  const { q } = quiet();
  place(q, "ribeye", HAND0 + REACH_MAX);
  dive(q, CHARGE_SECONDS + 0.05);
  assert.equal(q.eaten, 1, "a full charge reaches 250 px");
  const short = quiet().q;
  place(short, "ribeye", HAND0 + REACH_MAX);
  dive(short, TAP_SECONDS);
  assert.equal(short.eaten, 0, "a tap does not");
});

test("holding the button never repeats the dive; presses mid-dive, ducking or stunned are ignored", () => {
  const { q } = quiet();
  let dives = 0,
    was = false;
  const count = () => {
    const out = q.lunge?.phase === "out";
    if (out && !was) dives++;
    was = out;
  };
  q.step(1 / 60, input({ jump: true }, { jump: true }));
  for (let i = 0; i < 240; i++) {
    q.step(1 / 60, input({ jump: true }));
    count();
  }
  assert.equal(dives, 1, "a held button charges once, dives once at full charge, then waits");
  const m = quiet().q;
  m.step(1 / 60, input({}, { jump: true }));
  m.step(1 / 60, input());
  for (let i = 0; i < 20; i++) m.step(1 / 60, input({}, { jump: true }));
  steps(m, 20);
  assert.equal(m.lunge, null, "presses during the dive and spring-back start nothing");
  const d = quiet().q;
  d.step(1 / 60, input({ down: true }, { jump: true, down: true }));
  assert.equal(d.lunge, null, "no dive while ducking");
  d.stun = 1;
  d.step(1 / 60, input({}, { jump: true }));
  assert.equal(d.lunge, null, "no dive while stunned");
});

test("the check costs 400; the to-go box doubles the next five grabs", () => {
  const { q, said } = quiet();
  place(q, "check", HAND0 + REACH_BASE);
  dive(q, 0.05);
  assert.equal(q.plateTotal, -400);
  assert.ok(said.includes("YOU picked up the bill?"));
  const t = quiet().q;
  place(t, "togo", HAND0 + REACH_BASE);
  dive(t, 0.05);
  for (let i = 0; i < 6; i++) {
    place(t, "bread", HAND0 + t.reach());
    dive(t, 0.05);
  }
  assert.equal(t.plateTotal, 5 * 100 + 50, "five doubled breads, then a plain one");
});

test("grabs inside 1.2 s chain a combo: x2 from the fifth, x3 from the tenth", () => {
  const { q } = quiet();
  for (let i = 0; i < 10; i++) {
    place(q, "bread", HAND0 + q.reach());
    dive(q, 0.05);
  }
  assert.equal(q.combo, 10);
  assert.equal(q.comboBonus, 5 * 50 + 50 * 2, "grabs 5-9 add one extra, grab 10 adds two");
});

test("specials map to rewards and a big plate fills the belly", () => {
  const { q } = quiet();
  for (const kind of ["coke", "nuts", "buccees", "hotsauce"]) {
    place(q, kind, HAND0 + q.reach());
    dive(q, 0.05);
  }
  q.plateTotal += 2500;
  q.time = ROUND_SECONDS - 1 / 120;
  q.step(1 / 60, input());
  const r = q.result();
  assert.deepEqual(
    { coins: r.coins, charge: r.charge, star: r.star, hot: r.hot, lives: r.lives, fullBelly: r.fullBelly },
    { coins: 1, charge: 3, star: true, hot: true, lives: 0, fullBelly: true },
  );
  assert.ok(r.lines.length >= 2);
});

test("the round ends at 60 s with a graded result", () => {
  const { q } = quest();
  steps(q, ROUND_SECONDS * 60 - 2);
  assert.equal(q.result(), null);
  steps(q, 3);
  const r = q.result();
  assert.ok(r && r.grade === gradeFor(r.score) && r.score >= 0);
  for (const [score, grade] of [[3000, "COMPED"], [2999, "GOOD TIPPER"], [2000, "GOOD TIPPER"], [1999, "SPLIT THE CHECK"], [1200, "SPLIT THE CHECK"], [1199, "WATER ONLY"], [0, "WATER ONLY"]])
    assert.equal(gradeFor(score), grade);
});

test("the waves: 5 appetizers at once, 3 every 4 s, entrees from 20 s, the cart spills 8 at 42 s, specials once each", () => {
  const { q } = quest(3);
  q.server.away = 1e9;
  for (const r of q.rivals) r.base = 1e9;
  const seen = new Map();
  const spawnedBy = (t) => {
    while (q.time < t - 1e-9) {
      q.step(1 / 60, input());
      for (const f of q.food) if (!seen.has(f.id)) seen.set(f.id, { kind: f.kind, at: q.time });
    }
    return [...seen.values()];
  };
  assert.equal(spawnedBy(0.05).filter((f) => APPETIZERS.includes(f.kind)).length, 5);
  assert.equal(spawnedBy(4.05).filter((f) => APPETIZERS.includes(f.kind)).length, 8);
  assert.equal(spawnedBy(20.05).filter((f) => ENTREES.includes(f.kind)).length, 4);
  const beforeCart = spawnedBy(41.9).filter((f) => DESSERTS.includes(f.kind)).length;
  assert.equal(spawnedBy(43).filter((f) => DESSERTS.includes(f.kind)).length - beforeCart, 8);
  const specials = spawnedBy(59.9).filter((f) => SPECIALS.includes(f.kind)).map((f) => f.kind);
  assert.deepEqual(specials.sort(), [...SPECIALS].sort());
});
```

Add `APPETIZERS, ENTREES, DESSERTS, SPECIALS` to the food import.

- [ ] **Step 3: Run, expect FAIL** (module missing).

- [ ] **Step 4: Implement** `src/game/quests/hungry.ts` (rules only; rivals, server, planes and suitcases are stubbed here as state and stepped in Task 4 — the stub step functions are empty bodies that Task 4 fills):

```ts
// @file src/game/quests/hungry.ts
import { SWING_SECONDS } from "../combat";
import { heroFarHand, type HeroPose } from "../hero";
import { SWING_ACTIVE } from "../rig";
import type { Quest, QuestContext, QuestHud, QuestInput, QuestResult } from "./quest";
import {
  APPETIZERS,
  CHUTE,
  DESSERTS,
  ENTREES,
  FOODS,
  SPECIALS,
  TABLE,
  makeFood,
  nearTable,
  onTable,
  stepFood,
  type Food,
  type FoodKind,
} from "./food";
import { drawHungry } from "./hungry-draw";

export const ROUND_SECONDS = 60;
export const REACH_BASE = 90;
export const REACH_STEP = 10;
export const REACH_MAX = 250;
/** A press released by this point is a tap: base reach, no plate steals. */
export const TAP_SECONDS = 0.12;
export const CHARGE_SECONDS = 0.5;
export const LUNGE_OUT = 0.12;
export const LUNGE_HOLD = 0.08;
export const LUNGE_BACK = 0.25;
export const EAT_RADIUS = 10;
export const PLATE_RADIUS = 14;
export const COMBO_WINDOW = 1.2;
export const RIVAL_RANGE = 45;
export const RIVAL_LEAN = 0.2;
export const BONK_SERVER = 70;
export const BONK_RIVAL = 90;
export const SERVER_SPEED = 28;
export const SERVER_AWAY = 15;
export const RIVAL_STUN = 2;
export const SLAP_STUN = 1;
export const SUITCASE_SECONDS = 4;
export const PLANE_Y = 150;
export const PLANE_SPEED = 130;
export const PLANE_HIT = 150;
export const CART_AT = 42;
export const HAMMER_X = 18;
export const HAMMER_FOOT = 192;
export const PLATE_X = 58;
const BASE_POSE: HeroPose = {
  x: HAMMER_X,
  foot: HAMMER_FOOT,
  facing: 1,
  phase: 0,
  moving: false,
  air: false,
  landing: 0,
  swing: 0,
  mega: 0,
  wipe: 0,
  snot: 0,
  heat: 0,
  hurt: 0,
  star: 0,
  reduced: false,
  clock: 0,
};
/** Where the far hand lands on a zero-reach dive; every reach is measured from here. */
export const HAND0 = heroFarHand({ ...BASE_POSE, lunge: { u: 1, reach: 0 } })!.x;

export const GRADES: readonly (readonly [number, string])[] = [
  [3000, "COMPED"],
  [2000, "GOOD TIPPER"],
  [1200, "SPLIT THE CHECK"],
  [0, "WATER ONLY"],
];
export const gradeFor = (score: number) => GRADES.find(([min]) => score >= min)![1];

export type RivalKind = "student" | "bellhop" | "nurse";
export type Rival = {
  kind: RivalKind;
  x: number;
  /** Seconds to react at zero anger. */
  base: number;
  anger: number;
  /** Seconds since anger last rose or fell. */
  calm: number;
  plate: Food[];
  stun: number;
  /** Countdown to a grab, or -1. */
  wait: number;
  target: number | null;
  lean: number;
  leanX: number;
  line: string;
  lineT: number;
};
export const ROSTER: Record<string, { kind: RivalKind; x: number; base: number }[]> = {
  banquet: [
    { kind: "student", x: 170, base: 0.55 },
    { kind: "bellhop", x: 230, base: 0.4 },
    { kind: "nurse", x: 290, base: 0.28 },
  ],
};
export const reactionFor = (r: Rival) => Math.max(0.15, r.base * 0.8 ** r.anger);

type Phase = "charge" | "out" | "hold" | "back";
export type Lunge = { phase: Phase; t: number; held: number; reach: number; charged: boolean };
export type Server = { x: number; dir: 1 | -1; away: number; line: string; lineT: number; quiet: number };
export type Plane = { x: number; vx: number };
export type Suitcase = { x0: number; x1: number; t: number };
export type Cart = { x: number; spilled: boolean };
type Dump = { at: number; kinds: readonly FoodKind[]; count: number; done: boolean };

function waves(): Dump[] {
  const d = (at: number, kinds: readonly FoodKind[], count: number) => ({ at, kinds, count, done: false });
  return [
    d(0, APPETIZERS, 5),
    ...[4, 8, 12, 16].map((t) => d(t, APPETIZERS, 3)),
    d(20, ENTREES, 4),
    ...[24, 28, 32, 36].map((t) => d(t, ENTREES, 2)),
    ...[44, 48, 52, 56].map((t) => d(t, DESSERTS, 2)),
  ];
}
const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;
const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

/** Hungry Hungry Hippos at a banquet table: dive for the food, rob the plates, bonk the server. */
export class HungryQuest implements Quest {
  readonly id = "hungry" as const;
  ctx!: QuestContext;
  table = "banquet";
  practice = false;
  time = 0;
  food: Food[] = [];
  rivals: Rival[] = [];
  server: Server = { x: 300, dir: -1, away: 0, line: "", lineT: 0, quiet: 0 };
  planes: Plane[] = [];
  suitcases: Suitcase[] = [];
  cart: Cart | null = null;
  cartAt = CART_AT;
  lunge: Lunge | null = null;
  swing = 0;
  bonked = false;
  duck = false;
  stun = 0;
  crumbs = 0;
  plate: Food[] = [];
  plateTotal = 0;
  comboBonus = 0;
  combo = 0;
  bestCombo = 0;
  lastGrab = -99;
  togo = 0;
  eaten = 0;
  steals = 0;
  hits = 0;
  bill = false;
  coins = 0;
  charge = 0;
  star = false;
  hot = false;
  specials: FoodKind[] = [];
  schedule: Dump[] = waves();
  specialsAt: { at: number; kind: FoodKind; done: boolean }[] = [];
  private nextId = 1;
  private said = new Set<string>();
  private finished: QuestResult | null = null;

  enter(ctx: QuestContext, options: { table?: string; practice: boolean }) {
    this.ctx = ctx;
    this.table = options.table ?? "banquet";
    this.practice = options.practice;
    this.rivals = (ROSTER[this.table] ?? ROSTER.banquet).map((r) => ({
      ...r,
      anger: 0,
      calm: 0,
      plate: [],
      stun: 0,
      wait: -1,
      target: null,
      lean: 0,
      leanX: r.x,
      line: "",
      lineT: 0,
    }));
    this.specialsAt = SPECIALS.map((kind) => ({ at: 6 + ctx.rng() * 48, kind, done: false }));
  }

  /** Base reach: the hungrier he gets, the farther he stretches. */
  reach() {
    return Math.min(REACH_MAX, REACH_BASE + REACH_STEP * this.eaten);
  }
  private reachFor(held: number) {
    const base = this.reach();
    if (held <= TAP_SECONDS) return base;
    return base + (REACH_MAX - base) * Math.min(1, (held - TAP_SECONDS) / (CHARGE_SECONDS - TAP_SECONDS));
  }
  /** A suitcase on the cloth stops the dive short of it. */
  private blocked(reach: number) {
    let end = HAND0 + reach;
    for (const s of this.suitcases) if (s.x0 > HAND0 && end > s.x0 - 2) end = s.x0 - 2;
    return Math.max(0, end - HAND0);
  }
  private extension() {
    const L = this.lunge;
    if (!L || L.phase === "charge") return 0;
    if (L.phase === "out") return ease(L.t / LUNGE_OUT);
    if (L.phase === "hold") return 1;
    return 1 - smooth(L.t / LUNGE_BACK);
  }
  /** Where the hand is right now along the tablecloth. */
  handX() {
    return HAND0 + (this.lunge?.reach ?? 0) * this.extension();
  }
  private think(text: string, seconds = 1.8, once = true) {
    if (once && this.said.has(text)) return;
    this.said.add(text);
    this.ctx.say(text, seconds);
  }

  step(dt: number, input: QuestInput) {
    if (this.finished) return;
    this.time += dt;
    for (const d of this.schedule)
      if (!d.done && this.time >= d.at) {
        d.done = true;
        this.dump(d.kinds, d.count);
        if (d.at === 0) this.think("I didn't order this. I'm eating it anyway.", 2.2);
      }
    for (const s of this.specialsAt)
      if (!s.done && this.time >= s.at) {
        s.done = true;
        this.dump([s.kind], 1);
      }
    this.stepCart(dt);
    this.stepServer(dt);
    this.stepRivals(dt);
    this.stepPlanes(dt);
    for (const s of this.suitcases) s.t -= dt;
    this.suitcases = this.suitcases.filter((s) => s.t > 0);
    for (const f of this.food) stepFood(f, dt, this.suitcases);
    this.stepHammer(dt, input);
    this.crumbs = Math.max(0, this.crumbs - dt);
    if (this.time >= ROUND_SECONDS) this.finish();
  }

  private dump(kinds: readonly FoodKind[], count: number, x = CHUTE.x, y = CHUTE.y) {
    const rng = this.ctx.rng;
    this.ctx.audio.ding();
    for (let i = 0; i < count; i++) {
      const kind = kinds[Math.floor(rng() * kinds.length)];
      this.food.push(makeFood(this.nextId++, kind, x + (rng() - 0.5) * 16, y, (rng() * 2 - 1) * 120, rng() * 30));
    }
  }
  private pool() {
    return this.time < 20 ? APPETIZERS : this.time < 40 ? ENTREES : DESSERTS;
  }

  private stepHammer(dt: number, input: QuestInput) {
    const held = input.held.jump || input.held.fire;
    const pressed = input.pressed.jump || input.pressed.fire;
    this.stun = Math.max(0, this.stun - dt);
    this.duck = input.held.down && !this.lunge && this.swing <= 0;
    if (input.pressed.hammer && !this.lunge && this.swing <= 0 && !this.duck && this.stun <= 0) {
      this.swing = SWING_SECONDS;
      this.bonked = false;
      this.ctx.audio.whoosh();
    }
    if (this.swing > 0) {
      this.swing = Math.max(0, this.swing - dt);
      if (!this.bonked && 1 - this.swing / SWING_SECONDS >= SWING_ACTIVE[0]) {
        this.bonked = true;
        this.bonk();
      }
    }
    const L = this.lunge;
    if (!L) {
      if (pressed && this.swing <= 0 && !this.duck && this.stun <= 0)
        this.lunge = { phase: "charge", t: 0, held: 0, reach: this.reach(), charged: false };
      return;
    }
    if (L.phase === "charge") {
      L.held += dt;
      L.reach = this.reachFor(L.held);
      if (!held || L.held >= CHARGE_SECONDS) {
        L.charged = L.held > TAP_SECONDS;
        L.reach = this.blocked(L.reach);
        L.phase = "out";
        L.t = 0;
        this.ctx.audio.whoosh();
      }
      return;
    }
    L.t += dt;
    if (L.phase === "out" && L.t >= LUNGE_OUT) {
      L.phase = "hold";
      L.t = 0;
      this.grab(L);
    } else if (L.phase === "hold" && L.t >= LUNGE_HOLD) {
      L.phase = "back";
      L.t = 0;
    } else if (L.phase === "back" && L.t >= LUNGE_BACK) this.lunge = null;
  }

  /** Full extension: a slap, a steal, or everything within reach of the hand. */
  private grab(L: Lunge) {
    const hand = HAND0 + L.reach;
    if (this.slapped(hand)) return;
    if (L.charged) {
      const r = this.rivals.find((r) => r.plate.length && Math.abs(hand - r.x) <= PLATE_RADIUS);
      if (r) {
        const item = r.plate.pop()!;
        this.take(item, 100);
        this.steals++;
        r.anger++;
        r.calm = 0;
        this.retaliate(r);
        this.ctx.comic(hand, TABLE.top - 22, "YOINK!", false);
        this.ctx.audio.chomp();
        this.think("That's MINE now.");
        return;
      }
    }
    const bite = this.food.filter((f) => nearTable(f) && Math.abs(f.x - hand) <= EAT_RADIUS);
    if (!bite.length) return;
    this.food = this.food.filter((f) => !bite.includes(f));
    for (const f of bite) this.eat(f, hand);
  }

  private eat(f: Food, hand: number) {
    if (f.kind === "check") {
      this.plateTotal += f.value;
      this.bill = true;
      this.ctx.comic(hand, TABLE.top - 22, "-400", false);
      this.think("YOU picked up the bill?", 2);
      return;
    }
    if (f.kind === "coke") this.coins++;
    if (f.kind === "nuts") this.charge += 3;
    if (f.kind === "buccees") this.star = true;
    if (f.kind === "hotsauce") this.hot = true;
    if (f.kind === "togo") this.togo = 5;
    if (f.special) {
      this.specials.push(f.kind);
      if (f.kind !== "togo") this.think("Room charge.");
    }
    this.take(f, 0);
    this.crumbs = 0.6;
    this.ctx.comic(hand, TABLE.top - 22, "NOM", false);
    this.ctx.audio.chomp();
  }

  /** Onto Hammer's plate, doubled by an open to-go box, multiplied by the combo. */
  private take(item: Food, bonus: number) {
    let points = item.value;
    if (this.togo > 0 && item.kind !== "togo") {
      points *= 2;
      this.togo--;
    }
    this.combo = this.time - this.lastGrab <= COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastGrab = this.time;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
    this.plateTotal += points + bonus;
    this.comboBonus += (points + bonus) * (mult - 1);
    this.eaten++;
    this.plate.push(item);
  }

  // Task 4 fills these in.
  private slapped(_hand: number) {
    return false;
  }
  private retaliate(_r: Rival) {}
  private bonk() {}
  private stepServer(_dt: number) {}
  private stepRivals(_dt: number) {}
  private stepPlanes(_dt: number) {}
  private stepCart(dt: number) {
    if (!this.cart && this.time >= this.cartAt) {
      this.cart = { x: 384 + 30, spilled: false };
      this.ctx.audio.boom();
    }
    const c = this.cart;
    if (!c || c.spilled) return;
    c.x -= 260 * dt;
    if (c.x > TABLE.right - 6) return;
    c.spilled = true;
    const rng = this.ctx.rng;
    for (let i = 0; i < 8; i++) {
      const f = makeFood(this.nextId++, DESSERTS[Math.floor(rng() * DESSERTS.length)], TABLE.right - 20 - rng() * 10, TABLE.top - 10, -(60 + rng() * 140), -(120 + rng() * 80));
      this.food.push(f);
    }
    this.ctx.comic(TABLE.right - 24, TABLE.top - 40, "CRASH!", true);
  }

  private finish() {
    const score = Math.max(0, Math.round(this.plateTotal + this.comboBonus));
    const grade = gradeFor(score);
    const mult = this.bestCombo >= 10 ? 3 : this.bestCombo >= 5 ? 2 : 1;
    const lines = [
      `Plate: ${this.plateTotal} from ${this.eaten} grabs`,
      `Combo bonus: +${this.comboBonus} (best ${this.bestCombo} in a row, x${mult})`,
    ];
    if (this.steals) lines.push(`Robbed other plates ${this.steals} time${this.steals > 1 ? "s" : ""}`);
    if (this.hits) lines.push(`Paper to the face: ${this.hits} (-${this.hits * PLANE_HIT})`);
    if (this.specials.length) lines.push(`Specials: ${this.specials.map((k) => FOODS[k].name).join(", ")}`);
    if (this.bill) lines.push("Picked up the check: -400");
    if (score >= 2000) lines.push("Full belly: patience back to 3");
    this.finished = {
      score,
      coins: this.coins,
      charge: Math.min(10, this.charge),
      star: this.star,
      hot: this.hot,
      lives: 0,
      fullBelly: score >= 2000,
      grade,
      lines,
    };
  }

  render(ctx: CanvasRenderingContext2D, clock: number) {
    drawHungry(ctx, this, this.ctx, clock);
  }

  hud(): QuestHud {
    const L = this.lunge;
    const shown = L ? L.reach : this.reach();
    return {
      title: "HUNGRY HUNGRY HAMMER",
      subtitle: "Round 1 · The Banquet",
      score: Math.max(0, Math.round(this.plateTotal + this.comboBonus)),
      timer: Math.max(0, Math.ceil(ROUND_SECONDS - this.time)),
      meter: { label: "Reach", value: shown, max: REACH_MAX, text: `${Math.round(shown)} px` },
      hint: this.hint(),
    };
  }
  private hint() {
    if (this.planes.length) return "Paper incoming · ↓ ducks under it, H swats it";
    if (this.suitcases.length) return "Suitcase on the table · H slams the table and clears it";
    if (this.stun > 0) return "Slapped · wait a second";
    if (this.togo > 0) return `To-go box · next ${this.togo} grabs count double`;
    if (this.rivals.some((r) => r.kind === "nurse" && r.anger > 0))
      return "The nurse is angry · keep your hand out of her zone";
    return "Tap Space to dive · hold to reach farther and rob a plate · H bonks the server";
  }

  result() {
    return this.finished;
  }
  exit() {}

  pose(): HeroPose {
    const L = this.lunge,
      u = this.extension();
    return {
      ...BASE_POSE,
      swing: this.swing,
      hurt: this.stun > 0 ? 0.18 : 0,
      reduced: this.ctx.reduced,
      clock: this.time,
      crouch: this.duck,
      lunge: L && u > 0 ? { u, reach: L.reach } : undefined,
      coil: L?.phase === "charge" ? Math.min(1, L.held / CHARGE_SECONDS) : 0,
    };
  }
}
```

Also create a minimal `src/game/quests/hungry-draw.ts` exporting `export function drawHungry(_ctx: CanvasRenderingContext2D, _q: HungryQuest, _c: QuestContext, _clock: number) {}` (filled in Task 5) and add `ding()`, `chomp()`, `slide()` to `AudioBus` now (bodies in Task 5, Step 3 shows them; add them here so tsc passes):

```ts
  /** Food going down: a short low crunch and a blip. */
  chomp() {
    this.noise(0.07, 0.18, 700, "lowpass");
    this.blip(180, 0.05, "square", 0.08, 120);
  }
  /** A plate sliding along the tablecloth. */
  slide() {
    this.noise(0.16, 0.05, 1800, "bandpass", 900);
  }
  /** The banquet's service bell. */
  ding() {
    [1568, 2093].forEach((f, i) => this.blip(f, 0.18, "sine", 0.09, undefined, i * 0.05));
  }
```

- [ ] **Step 5: Run, expect PASS** (`npm run test:game`), plus `npx tsc --noEmit`. **Step 6: Commit** `src/game/quests/hungry.ts src/game/quests/hungry-draw.ts src/game/quests/quest.ts src/game/audio.ts scripts/hungry.check.mjs` — "Add Hungry Hungry Hammer's dive, plate, combos, specials and round".

---

### Task 4: Rivals, the server, the bonk, ducking and retaliation

**Files:** Modify `src/game/quests/hungry.ts`; extend `scripts/hungry.check.mjs`.

- [ ] **Step 1: Failing tests:**

```js
test("rivals take food that settles within 45 px after their reaction, with a lean", () => {
  const { q } = quiet();
  const student = q.rivals[0];
  student.base = 0.55;
  const f = place(q, "ribeye", student.x - 20);
  steps(q, Math.floor(0.55 * 60) - 2);
  assert.ok(q.food.includes(f), "still on the cloth before the reaction");
  steps(q, 4);
  assert.ok(!q.food.includes(f) && student.plate.includes(f), "on the student's plate");
  assert.ok(student.lean > 0);
});

test("a charged dive robs a plate a tap cannot reach; anger rises, reactions shorten, then cool off", () => {
  const { q } = quiet();
  const bellhop = q.rivals[1];
  bellhop.base = 0.4;
  bellhop.plate.push(makeFood(900, "brisket", bellhop.x, TABLE.top, 0, 0));
  dive(q, 0.05);
  assert.equal(bellhop.plate.length, 1, "a tap cannot reach the plate");
  const reach = bellhop.x - HAND0;
  const hold = TAP_SECONDS + (CHARGE_SECONDS - TAP_SECONDS) * ((reach - q.reach()) / (REACH_MAX - q.reach()));
  dive(q, hold);
  assert.equal(bellhop.plate.length, 0, "a charged dive robs it");
  assert.equal(q.steals, 1);
  assert.equal(q.plateTotal, FOODS.brisket.value + 100, "YOINK bonus");
  assert.equal(bellhop.anger, 1);
  assert.ok(Math.abs(reactionFor(bellhop) - 0.32) < 1e-9);
  steps(q, 8 * 60 + 2);
  assert.equal(bellhop.anger, 0, "anger falls one level per 8 s");
  bellhop.anger = 20;
  assert.equal(reactionFor(bellhop), 0.15, "never faster than 0.15 s");
});

test("the server buses food unless he is bonked; a bonk dumps his tray and sends him off for 15 s", () => {
  const { q } = quiet();
  q.server = { ...q.server, x: 230, dir: -1, away: 0 };
  const f = place(q, "club", 200);
  steps(q, 90);
  assert.ok(!q.food.includes(f), "bused");
  const b = quiet().q;
  b.server = { ...b.server, x: TABLE.left + 60, dir: -1, away: 0 };
  const keep = place(b, "club", 200);
  b.step(1 / 60, input({}, { hammer: true }));
  steps(b, 30);
  assert.ok(b.server.away > 14, "he leaves");
  assert.equal(b.food.length, 5, "the tray spills four extra plates");
  steps(b, 10 * 60);
  assert.ok(b.food.includes(keep), "nobody buses while he is away");
});

test("a bonk stuns a rival leaning into range for 2 s and slams suitcases off the table", () => {
  const { q } = quiet();
  const student = q.rivals[0];
  student.lean = 0.2;
  student.leanX = TABLE.left + 80;
  q.suitcases.push({ x0: 190, x1: 206, t: 4 });
  q.step(1 / 60, input({}, { hammer: true }));
  steps(q, 30);
  assert.ok(student.stun > 1.4 && student.stun <= 2);
  assert.equal(q.suitcases.length, 0);
});

test("robbing the student brings paper: ducking lets it pass, H swats it, a hit costs 150", () => {
  for (const defend of ["duck", "swat", "none"]) {
    const { q } = quiet();
    const student = q.rivals[0];
    student.plate.push(makeFood(901, "pie", student.x, TABLE.top, 0, 0));
    const reach = student.x - HAND0;
    dive(q, TAP_SECONDS + (CHARGE_SECONDS - TAP_SECONDS) * ((reach - q.reach()) / (REACH_MAX - q.reach())));
    assert.equal(q.planes.length, 1, "a plane comes down the table");
    const before = q.plateTotal;
    for (let i = 0; i < 120; i++) {
      const near = q.planes[0] && q.planes[0].x < HAND0 + 60;
      q.step(1 / 60, input({ down: defend === "duck" }, { hammer: defend === "swat" && near && i % 20 === 0 }));
    }
    assert.equal(q.planes.length, 0);
    assert.equal(q.plateTotal - before, defend === "none" ? -150 : 0, defend);
  }
});

test("the bellhop's suitcase stops sliding food and dives for 4 s", () => {
  const { q } = quiet();
  const bellhop = q.rivals[1];
  bellhop.plate.push(makeFood(902, "pie", bellhop.x, TABLE.top, 0, 0));
  const reach = bellhop.x - HAND0;
  dive(q, TAP_SECONDS + (CHARGE_SECONDS - TAP_SECONDS) * ((reach - q.reach()) / (REACH_MAX - q.reach())));
  assert.equal(q.suitcases.length, 1);
  const s = q.suitcases[0];
  assert.ok(s.x1 < bellhop.x && s.x0 > HAND0);
  const beyond = place(q, "ribeye", s.x1 + 10);
  q.eaten = 30;
  dive(q, CHARGE_SECONDS + 0.05);
  assert.ok(q.food.includes(beyond), "the dive stops at the suitcase");
  steps(q, 4 * 60);
  assert.equal(q.suitcases.length, 0, "gone after 4 s");
});

test("an angry nurse slaps a hand in her zone: nothing eaten, a 1 s stun", () => {
  const { q, said } = quiet();
  const nurse = q.rivals[2];
  nurse.anger = 1;
  q.eaten = 30;
  const f = place(q, "ribeye", HAND0 + REACH_MAX);
  assert.ok(Math.abs(f.x - nurse.x) <= 45, "a full-reach tap lands in her zone");
  dive(q, 0.05);
  assert.ok(q.food.includes(f), "nothing eaten");
  assert.ok(q.stun > 0.4, "stunned for about a second");
  assert.ok(said.includes("I've HAD my shots."));
  assert.equal(nurse.line, "Sanitize!");
});
```

Add `reactionFor` to the hungry import.

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** (replace the Task 3 stubs in `hungry.ts`):

```ts
  private slapped(hand: number) {
    const nurse = this.rivals.find((r) => r.kind === "nurse" && r.anger > 0 && r.stun <= 0);
    if (!nurse || Math.abs(hand - nurse.x) > RIVAL_RANGE) return false;
    this.stun = SLAP_STUN;
    nurse.line = "Sanitize!";
    nurse.lineT = 1.4;
    nurse.lean = RIVAL_LEAN;
    nurse.leanX = hand;
    this.ctx.audio.thud();
    this.ctx.comic(hand, TABLE.top - 22, "SLAP!", false);
    this.think("I've HAD my shots.");
    return true;
  }

  /** Robbed rivals hit back: paper, luggage, or a nurse who stays angry. */
  private retaliate(r: Rival) {
    if (r.kind === "student") {
      this.planes.push({ x: r.x - 10, vx: -PLANE_SPEED });
      r.line = "Heads up!";
      this.ctx.audio.whoosh();
    } else if (r.kind === "bellhop") {
      this.suitcases.push({ x0: r.x - 36, x1: r.x - 20, t: SUITCASE_SECONDS });
      r.line = "Your bag, sir.";
      this.ctx.audio.thud();
    } else r.line = "Excuse me?";
    r.lineT = 1.4;
  }

  /** The mallet comes down on the near end of the table. */
  private bonk() {
    const s = this.server;
    let hit = false;
    if (s.away <= 0 && s.x <= TABLE.left + BONK_SERVER) {
      this.dump(this.pool(), 4, s.x, TABLE.top - 30);
      s.away = SERVER_AWAY;
      this.ctx.comic(s.x, TABLE.top - 40, "BONK!", false);
      this.ctx.audio.bonk();
      this.think("Is Pepsi okay? NO.");
      hit = true;
    }
    for (const r of this.rivals)
      if (r.lean > 0 && r.leanX <= TABLE.left + BONK_RIVAL && r.stun <= 0) {
        r.stun = RIVAL_STUN;
        this.ctx.comic(r.leanX, TABLE.top - 36, "BONK!", false);
        this.ctx.audio.bonk();
        hit = true;
      }
    this.planes = this.planes.filter((p) => {
      if (p.x > HAND0 + 60) return true;
      this.ctx.comic(p.x, PLANE_Y - 8, "SWAT!", false);
      return false;
    });
    if (this.suitcases.length) {
      this.suitcases = [];
      this.ctx.comic(TABLE.left + 20, TABLE.top - 30, "SLAM!", false);
      hit = true;
    }
    if (!hit) this.ctx.audio.thud();
  }

  private stepServer(dt: number) {
    const s = this.server;
    s.lineT = Math.max(0, s.lineT - dt);
    s.quiet = Math.max(0, s.quiet - dt);
    if (s.away > 0) {
      s.away -= dt;
      if (s.away <= 0) {
        s.x = TABLE.right + 30;
        s.dir = -1;
      }
      return;
    }
    s.x += s.dir * SERVER_SPEED * dt;
    if (s.x < 70) {
      s.x = 70;
      s.dir = 1;
    } else if (s.x > 330 && s.dir > 0) {
      s.x = 330;
      s.dir = -1;
    }
    const bused = this.food.filter((f) => onTable(f) && Math.abs(f.x - s.x) < 6);
    if (!bused.length) return;
    this.food = this.food.filter((f) => !bused.includes(f));
    this.ctx.audio.slide();
    if (s.quiet <= 0) {
      s.line = "Are we still working on that?";
      s.lineT = 1.6;
      s.quiet = 6;
    }
  }

  private stepRivals(dt: number) {
    for (const r of this.rivals) {
      r.lineT = Math.max(0, r.lineT - dt);
      r.lean = Math.max(0, r.lean - dt);
      if (r.anger > 0) {
        r.calm += dt;
        if (r.calm >= 8) {
          r.anger--;
          r.calm = 0;
        }
      }
      if (r.stun > 0) {
        r.stun = Math.max(0, r.stun - dt);
        r.wait = -1;
        r.target = null;
        continue;
      }
      if (r.wait < 0) {
        const near = this.food
          .filter((f) => onTable(f) && Math.abs(f.x - r.x) <= RIVAL_RANGE)
          .sort((a, b) => Math.abs(a.x - r.x) - Math.abs(b.x - r.x))[0];
        if (near) {
          r.wait = reactionFor(r);
          r.target = near.id;
        }
        continue;
      }
      r.wait -= dt;
      if (r.wait > 0) continue;
      r.wait = -1;
      const f = this.food.find((f) => f.id === r.target && nearTable(f) && Math.abs(f.x - r.x) <= RIVAL_RANGE);
      r.target = null;
      if (!f) continue;
      r.lean = RIVAL_LEAN;
      r.leanX = f.x;
      this.food = this.food.filter((g) => g !== f);
      r.plate.push(f);
      this.ctx.audio.slide();
      this.think("Are you going to finish that?");
    }
  }

  private stepPlanes(dt: number) {
    this.planes = this.planes.filter((p) => {
      p.x += p.vx * dt;
      if (p.x < -20) return false;
      if (p.x > HAMMER_X + 8 || this.duck) return true;
      this.plateTotal -= PLANE_HIT;
      this.hits++;
      this.ctx.audio.splat();
      this.ctx.comic(HAMMER_X + 16, PLANE_Y - 10, `-${PLANE_HIT}`, false);
      return false;
    });
  }
```

Remove the `// Task 4 fills these in.` stub block.

- [ ] **Step 4: Run, expect PASS** (all hungry checks). Tune nothing in the tests; if a test fails, find the rule bug (systematic-debugging).
- [ ] **Step 5: Commit** `src/game/quests/hungry.ts scripts/hungry.check.mjs` — "Give the banquet rivals, the server, the bonk and their paybacks".

---

### Task 5: Drawing the banquet

**Files:** Create `src/game/people.ts`; fill `src/game/quests/hungry-draw.ts`; modify `src/game/engine.ts` (its `drawPerson` delegates to `people.ts`).

**Interfaces:**
- Produces: `drawPerson(ctx, image, crop, x, feet, facing, leftFacing, clock, stunned, scale = 1)`; `drawHungry(ctx, q, c, clock)`; `drawFood(ctx, f, images)`.
- Consumes: `QuestContext.images` keys `server, hotelStaff, student, nurse, coke, nuts, buccees` (Task 6 supplies them); `QuestContext.drawHero`.

- [ ] **Step 1: `people.ts`** (move the engine's `drawPerson` body, adding `scale`):

```ts
// @file src/game/people.ts
import { ENEMY_HEIGHT } from "./combat";
import { VIEW_W } from "./constants";

/** A photographed person standing at (x, feet): soft shadow, a walking bob, or flat out when stunned. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  crop: readonly [number, number, number, number],
  x: number,
  feet: number,
  facing: number,
  leftFacing: boolean,
  clock: number,
  stunned: boolean,
  scale = 1,
) {
  if (!image || !image.complete || !image.naturalWidth || x < -55 || x > VIEW_W + 55) return;
  const h = ENEMY_HEIGHT * scale,
    w = (crop[2] / crop[3]) * h;
  ctx.save();
  ctx.translate(x, feet);
  ctx.fillStyle = "rgba(10,16,18,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(leftFacing ? (facing > 0 ? -1 : 1) : facing < 0 ? -1 : 1, 1);
  if (stunned) {
    const length = 34 * scale,
      thickness = (crop[2] / crop[3]) * length;
    ctx.translate(0, -thickness / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(image, ...crop, -thickness / 2, -length / 2, thickness, length);
  } else {
    const step = Math.sin(clock * 9);
    ctx.rotate(step * 0.02);
    ctx.drawImage(image, ...crop, -w * 0.42, -h - Math.abs(step) * 0.6 * scale, w, h);
  }
  ctx.restore();
}
```

Engine `drawPerson(...)` body becomes `drawPerson(this.ctx, image, crop, x, feet, facing, leftFacing, clock, stunned);` (imported as `drawPersonArt` to avoid the name clash, or rename the private method `person`). Run `npm run test:game` and the phase 0 browser check: unchanged behavior.

- [ ] **Step 2: `hungry-draw.ts`:**

```ts
// @file src/game/quests/hungry-draw.ts
import { heroFace } from "../hero";
import { clearOfFace } from "../layout";
import { drawPerson } from "../people";
import { CHUTE, FOODS, TABLE, type Food } from "./food";
import { HAND0, PLANE_Y, PLATE_X, type HungryQuest, type Rival } from "./hungry";
import type { QuestContext } from "./quest";

type Crop = readonly [number, number, number, number];
const ART: Record<Rival["kind"] | "server", { key: string; crop: Crop; left: boolean }> = {
  student: { key: "student", crop: [5, 5, 408, 758], left: true },
  bellhop: { key: "hotelStaff", crop: [6, 4, 600, 759], left: true },
  nurse: { key: "nurse", crop: [0, 0, 345, 720], left: false },
  server: { key: "server", crop: [5, 5, 379, 758], left: true },
};
const PHOTO: Partial<Record<Food["kind"], { key: string; crop: Crop }>> = {
  coke: { key: "coke", crop: [0, 4, 972, 1450] },
  nuts: { key: "nuts", crop: [0, 23, 1222, 1263] },
  buccees: { key: "buccees", crop: [33, 34, 1020, 1378] },
};

/** One plate of food standing on the cloth at (f.x, f.y): photo pickups, or a procedural plate. */
export function drawFood(ctx: CanvasRenderingContext2D, f: Food, images: Record<string, HTMLImageElement>) {
  const spec = FOODS[f.kind];
  const photo = PHOTO[f.kind],
    img = photo && images[photo.key];
  ctx.save();
  ctx.translate(f.x, f.y);
  if (img && img.complete && img.naturalWidth) {
    const h = f.size,
      w = (photo.crop[2] / photo.crop[3]) * h;
    ctx.drawImage(img, ...photo.crop, -w / 2, -h, w, h);
  } else if (f.kind === "hotsauce") {
    ctx.fillStyle = spec.color;
    ctx.fillRect(-2.5, -10, 5, 10);
    ctx.fillRect(-1, -12, 2, 2);
    ctx.fillStyle = "#f5e6c8";
    ctx.fillRect(-2.5, -7, 5, 3);
  } else if (f.kind === "togo") {
    ctx.fillStyle = spec.color;
    ctx.fillRect(-6, -8, 12, 8);
    ctx.fillStyle = "#c8281e";
    ctx.fillRect(-6, -9, 12, 2);
  } else if (f.kind === "check") {
    ctx.fillStyle = spec.color;
    ctx.fillRect(-6, -3, 12, 3);
    ctx.fillStyle = "#d9b45a";
    ctx.fillRect(-4, -2.2, 8, 0.8);
  } else {
    ctx.fillStyle = "#f7f4ee";
    ctx.beginPath();
    ctx.ellipse(0, -1, 7, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.ellipse(0, -4.5, 5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(-1.5, -6, 1.8, 1, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = "700 2.6px 'Segoe UI',sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#1a120c";
  ctx.fillText(spec.label, 0, -f.size - 1);
  ctx.restore();
}

function plateStack(ctx: CanvasRenderingContext2D, x: number, items: readonly Food[]) {
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.ellipse(x, TABLE.top - 0.8, 8, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  items.slice(-6).forEach((f, i) => {
    ctx.fillStyle = FOODS[f.kind].color;
    ctx.fillRect(x - 5, TABLE.top - 3 - i * 2.2, 10, 2);
  });
  if (items.length > 6) {
    ctx.font = "700 3px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff6d8";
    ctx.fillText(`+${items.length - 6}`, x, TABLE.top - 18);
  }
}

function bubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, face: ReturnType<typeof heroFace>) {
  ctx.save();
  ctx.font = "600 3.6px 'Segoe UI',sans-serif";
  const w = ctx.measureText(text).width + 8,
    h = 8;
  const box = clearOfFace({ x: x - w / 2, y: y - h, w, h }, face, { w: 384, h: 216 });
  ctx.fillStyle = "rgba(9,17,24,0.92)";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, w, h, 2);
  ctx.fill();
  ctx.fillStyle = "#f4f0e7";
  ctx.textAlign = "center";
  ctx.fillText(text, box.x + w / 2, box.y + 5.6);
  ctx.restore();
}

/** The banquet: backdrop, server and rivals behind a dressed table, the food, then Hammer in front. */
export function drawHungry(ctx: CanvasRenderingContext2D, q: HungryQuest, c: QuestContext, clock: number) {
  const img = c.images;
  // Ballroom drape and banner over the venue photo.
  ctx.fillStyle = "rgba(24,10,14,0.55)";
  ctx.fillRect(0, 0, 384, 216);
  ctx.fillStyle = "#5e1b24";
  for (let x = 0; x < 384; x += 24) ctx.fillRect(x, 0, 12, 112);
  ctx.fillStyle = "#2a1d14";
  ctx.fillRect(96, 14, 192, 14);
  ctx.font = "800 6px 'Segoe UI',sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c060";
  ctx.fillText("GRAND BALLROOM · ALL YOU CAN EAT", 192, 23.5);
  // The chute: a steel hopper over the middle of the table.
  ctx.fillStyle = "#8d9aa3";
  ctx.fillRect(CHUTE.x - 1, 0, 2, 40);
  ctx.beginPath();
  ctx.moveTo(CHUTE.x - 22, 40);
  ctx.lineTo(CHUTE.x + 22, 40);
  ctx.lineTo(CHUTE.x + 8, CHUTE.y + 2);
  ctx.lineTo(CHUTE.x - 8, CHUTE.y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c9d3d8";
  ctx.fillRect(CHUTE.x - 22, 40, 44, 2);
  // Carpet.
  ctx.fillStyle = "#3a1218";
  ctx.fillRect(0, 192, 384, 24);
  // Server and rivals stand behind the table; the cloth hides their legs.
  const s = q.server;
  if (s.away <= 0) {
    const a = ART.server;
    drawPerson(ctx, img[a.key], a.crop, s.x, 192, s.dir, a.left, clock, false, 0.9);
    ctx.fillStyle = "#c9d3d8";
    ctx.beginPath();
    ctx.ellipse(s.x + s.dir * 6, 160, 7, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of q.rivals) {
    const a = ART[r.kind];
    const leanBy = r.lean > 0 ? Math.sin((r.lean / 0.2) * Math.PI) * Math.sign(r.leanX - r.x) * 8 : 0;
    drawPerson(ctx, img[a.key], a.crop, r.x + leanBy, 192, -1, a.left, r.stun > 0 ? 0 : clock + r.x, false, 0.85);
    if (r.stun > 0) {
      ctx.fillStyle = "#ffe598";
      for (let i = 0; i < 3; i++) {
        const t = clock * 4 + (i * Math.PI * 2) / 3;
        ctx.fillRect(r.x + Math.cos(t) * 6, 150 + Math.sin(t) * 2, 1.4, 1.4);
      }
    } else if (r.anger > 0) {
      ctx.fillStyle = "#e2302a";
      ctx.font = "900 6px 'Segoe UI',sans-serif";
      ctx.fillText("!".repeat(Math.min(3, r.anger)), r.x, 150);
    }
  }
  // The table: a dressed top and skirt, legs below.
  ctx.fillStyle = "#4a3020";
  for (const x of [TABLE.left + 6, (TABLE.left + TABLE.right) / 2, TABLE.right - 8]) ctx.fillRect(x, TABLE.top + TABLE.thick, 3, 192 - TABLE.top - TABLE.thick);
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, TABLE.thick);
  ctx.fillStyle = "rgba(160,140,120,0.35)";
  for (let x = TABLE.left + 10; x < TABLE.right; x += 18) ctx.fillRect(x, TABLE.top + 3, 1, TABLE.thick - 3);
  ctx.fillStyle = "#d8cdb8";
  ctx.fillRect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, 1.2);
  // Plates, suitcases, food, the cart.
  plateStack(ctx, PLATE_X, q.plate);
  for (const r of q.rivals) plateStack(ctx, r.x, r.plate);
  for (const sc of q.suitcases) {
    ctx.fillStyle = "#6b4428";
    ctx.beginPath();
    ctx.roundRect(sc.x0, TABLE.top - 12, sc.x1 - sc.x0, 12, 1.5);
    ctx.fill();
    ctx.fillStyle = "#2a1d14";
    ctx.fillRect(sc.x0 + 5, TABLE.top - 14, sc.x1 - sc.x0 - 10, 2);
  }
  for (const f of q.food) drawFood(ctx, f, img);
  if (q.cart) {
    ctx.save();
    ctx.translate(q.cart.x, 192);
    if (q.cart.spilled) ctx.rotate(-0.25);
    ctx.fillStyle = "#9aa6ad";
    ctx.fillRect(-14, -22, 30, 16);
    ctx.fillStyle = "#3c464c";
    ctx.beginPath();
    ctx.arc(-9, -3, 3, 0, Math.PI * 2);
    ctx.arc(11, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // The reach marker while charging.
  const L = q.lunge;
  if (L && L.phase === "charge") {
    const end = HAND0 + L.reach;
    ctx.strokeStyle = "rgba(232,192,96,0.8)";
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(HAND0, TABLE.top - 1);
    ctx.lineTo(end, TABLE.top - 1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#e8c060";
    ctx.beginPath();
    ctx.moveTo(end - 3, TABLE.top - 7);
    ctx.lineTo(end + 3, TABLE.top - 7);
    ctx.lineTo(end, TABLE.top - 2);
    ctx.fill();
  }
  // Paper planes.
  for (const p of q.planes) {
    ctx.fillStyle = "#eef2ef";
    ctx.beginPath();
    ctx.moveTo(p.x - 5, PLANE_Y);
    ctx.lineTo(p.x + 5, PLANE_Y - 2.5);
    ctx.lineTo(p.x + 3, PLANE_Y + 2);
    ctx.closePath();
    ctx.fill();
  }
  // Hammer, then crumbs on his shirt below the chin.
  const pose = q.pose();
  c.drawHero(ctx, pose, 0);
  const face = heroFace(pose);
  if (q.crumbs > 0) {
    ctx.fillStyle = "#c9a26a";
    for (let i = 0; i < 6; i++) {
      const t = (1 - q.crumbs / 0.6 + i * 0.13) % 1;
      ctx.fillRect(face.x + (i % 3) * 1.4 - 1, face.y + face.h + 2 + t * 8, 0.9, 0.9);
    }
  }
  // NPC speech, kept off his face.
  if (s.away <= 0 && s.lineT > 0) bubble(ctx, s.line, s.x, 146, face);
  for (const r of q.rivals) if (r.lineT > 0) bubble(ctx, r.line, r.x, 146, face);
  if (q.combo >= 5) {
    ctx.font = "900 6px 'Arial Black','Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7c948";
    ctx.fillText(`x${q.combo >= 10 ? 3 : 2}`, PLATE_X, TABLE.top - 26);
  }
}
```

- [ ] **Step 3: Render and look.** A scratch page imports `/src/game/quests/hungry.ts`, builds a quest with a fixed rng and real images, steps scripted inputs, and draws at 4× into a canvas (export via `toDataURL`): t = 0.6 s (first dump falling), a tap dive at full extension, a charged dive with the reach marker, a steal with YOINK, ducking under paper, the cart crash at 42.3 s, a stunned rival and a suitcase. Check: rivals' heads and shoulders above the cloth, legs visible under it between the table legs, food readable at game scale, nothing over Hammer's face, the far hand lands on the food. Fix and re-render until it reads.

- [ ] **Step 4:** `npm run test:game`, `npx tsc --noEmit`, `npx eslint src/game scripts`. **Step 5: Commit** `src/game/people.ts src/game/quests/hungry-draw.ts src/game/engine.ts` — "Draw the banquet: table, rivals, server, food and the dive".

---

### Task 6: The engine hosts quests; the BUFFET door

**Files:** Modify `src/game/engine.ts`, `src/game/levels.ts`; extend `scripts/hungry.check.mjs`; update `scripts/game-harness.mjs` defaults if a new field needs one.

**Interfaces:**
- Produces: `Mode` gains `"quest" | "questTally"`; `GameHooks.onQuestRecord?: (id: QuestId, score: number) => void`; public `newQuest(id: QuestId)`, `finishQuest()`; `Hud.quest: QuestHud | null`, `Hud.questResult: (QuestResult & { practice: boolean }) | null`; `Level.doors: Door[]`, `Door = { x: number; label: string; quest: QuestId; table: string; locked?: boolean }`; `__kiln.quest`, `__kiln.questScore`, `__kiln.spentDoors`; dev `__kilnDev.questSkip(seconds)`, `__kilnDev.teleport(x)`.

- [ ] **Step 1: Failing tests** (append to `scripts/hungry.check.mjs`; `import { game } from "./game-harness.mjs";`):

```js
function questStep(g, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    g.clock += 1 / 60;
    g.step(1 / 60);
  }
}

test("the BUFFET door runs the quest, pays out, returns him to the door and is spent", () => {
  const g = game();
  g.visualsReady = () => true;
  g.audio.ready = true;
  const door = g.level.doors.find((d) => d.quest === "hungry");
  assert.ok(door && door.label === "BUFFET");
  const p = g.player;
  g.enemies = [];
  g.students = [];
  p.x = door.x * 16 + 12;
  p.onGround = true;
  g.actions = { down: true };
  questStep(g, 1 / 60);
  assert.equal(g.mode, "card");
  g.actions = {};
  questStep(g, 2);
  assert.equal(g.mode, "quest");
  const q = g.quest;
  const before = { score: g.score, coins: g.coins, charge: g.charge };
  q.plateTotal = 2600;
  q.coins = 2;
  q.charge = 3;
  q.time = 59.99;
  questStep(g, 2 / 60);
  assert.equal(g.mode, "questTally");
  assert.equal(g.hud().questResult.grade, "GOOD TIPPER");
  g.finishQuest();
  assert.equal(g.mode, "play");
  assert.equal(g.score - before.score, 2600);
  assert.equal(g.coins - before.coins, 2);
  assert.equal(g.charge - before.charge, 3);
  assert.equal(g.player.form, 2, "full belly: patience back to 3");
  assert.ok(Math.abs(g.player.x - (door.x * 16 + 12)) < 1, "back at the door");
  assert.equal(g.player.crouch, false);
  assert.ok(g.player.invuln > 0);
  g.actions = { down: true };
  questStep(g, 0.2);
  assert.equal(g.mode, "play", "a spent door stays shut");
});

test("the door only opens from the floor in front of it, never mid-jump or mid-swing", () => {
  const g = game();
  const door = g.level.doors[0];
  g.enemies = [];
  g.students = [];
  const p = g.player;
  p.x = door.x * 16 - 40;
  p.onGround = true;
  g.actions = { down: true };
  questStep(g, 1 / 60);
  assert.equal(g.mode, "play", "beside it");
  p.x = door.x * 16 + 12;
  p.onGround = false;
  p.vy = -200;
  g.tryDoor();
  assert.equal(g.mode, "play", "in the air");
  p.onGround = true;
  g.swing = 0.3;
  g.tryDoor();
  assert.equal(g.mode, "play", "mid-swing");
});

test("practice quests start from the title, record a best and never touch a run", () => {
  const g = game();
  g.mode = "title";
  const records = [];
  g.hooks = { ...g.hooks, onQuestRecord: (id, score) => records.push([id, score]), onMode() {} };
  g.visualsReady = () => true;
  g.audio.ready = true;
  g.score = 0;
  g.lives = 3;
  g.newQuest("hungry");
  questStep(g, 2);
  assert.equal(g.mode, "quest");
  g.quest.plateTotal = 1500;
  g.quest.coins = 5;
  g.quest.time = 59.99;
  questStep(g, 2 / 60);
  g.finishQuest();
  assert.equal(g.mode, "title");
  assert.deepEqual(records, [["hungry", 1500]]);
  assert.equal(g.score, 0);
  assert.equal(g.coins, 0);
});

test("pause works inside a quest and resumes it without inventing a press", () => {
  const g = game();
  g.visualsReady = () => true;
  g.audio.ready = true;
  g.mode = "title";
  g.newQuest("hungry");
  questStep(g, 2);
  assert.equal(g.mode, "quest");
  g.actions = { jump: true };
  g.togglePause();
  assert.equal(g.mode, "pause");
  g.togglePause();
  assert.equal(g.mode, "quest");
  assert.equal(g.questPrev.jump, true, "a button held through the pause is not a fresh press");
});
```

(Frame-level pausing, where `frame()` renders and never steps while paused, is the existing behavior for every mode; the quest browser check pauses mid-round and asserts the HUD timer does not move.)

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Levels.** In `levels.ts`:

```ts
import type { QuestId } from "./quests/quest";
export type Door = { x: number; label: string; quest: QuestId; table: string; locked?: boolean };
// Level gains: doors: Door[];  base() returns doors: []
function door(level: Level, x: number, label: string, quest: QuestId, table: string) {
  level.doors.push({ x, label, quest, table });
}
// in the lobby, after its furniture:
door(lobby, 115, "BUFFET", "hungry", "banquet");
```

- [ ] **Step 4: Engine host.** Modes, fields, and methods:

```ts
export type Mode =
  "title" | "card" | "play" | "pause" | "die" | "slide" | "walkoff" | "tally" | "over" | "win" | "quest" | "questTally";

const DOOR_W = 40;
const ACTIONS: TouchAction[] = ["left", "right", "jump", "run", "down", "fire", "towel", "hammer", "super", "lecture"];
const blank = () => Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<TouchAction, boolean>;
const QUESTS: Partial<Record<QuestId, () => Quest>> = { hungry: () => new HungryQuest() };

// fields
private quest: Quest | null = null;
private questInfo: { id: QuestId; practice: boolean; returnX: number } | null = null;
private questResult: QuestResult | null = null;
private questPressed = blank();
private questPrev = blank();
private spentDoors = new Set<string>();
private cardNext: "play" | "quest" = "play";
private nurse = new Image();          // constructor: this.nurse.src = "/scrubs.png"; add to visualsReady()

/** Hammer as he is drawn now: in a quest, the quest's pose. */
private activePose(): HeroPose {
  return this.quest ? this.quest.pose() : this.heroPose();
}

private questContext(rng: () => number): QuestContext {
  return {
    audio: this.audio,
    images: {
      server: this.server, hotelStaff: this.hotelStaff, student: this.student, worker: this.worker,
      nurse: this.nurse, coke: this.zeroCan, nuts: this.nuts, buccees: this.beaver, wood: this.wood, steel: this.steel,
    },
    // heroAssets(): the HeroAssets object drawRig() builds today, extracted into a method.
    drawHero: (ctx, pose, cam = 0) => drawHero(ctx, this.heroAssets(), pose, cam),
    rng,
    say: (text, seconds) => this.say(text, seconds, true),
    comic: (x, y, text, big) => this.comic(x, y, text, big),
    reduced: this.reduce,
  };
}

private startQuest(id: QuestId, opts: { table?: string; practice: boolean; returnX: number }) {
  const make = QUESTS[id];
  if (!make) return false;
  const quest = make();
  quest.enter(this.questContext(seededRandom((this.runSeed ^ Math.floor(opts.returnX * 7919)) >>> 0)), {
    table: opts.table,
    practice: opts.practice,
  });
  this.quest = quest;
  this.questInfo = { id, practice: opts.practice, returnX: opts.returnX };
  this.questResult = null;
  this.questPressed = blank();
  this.questPrev = { ...this.actions };
  this.comics = [];
  this.banterT = 0;
  this.curse = 0;
  this.mode = "card";
  this.cardNext = "quest";
  this.cardT = 1.65;
  return true;
}

/** Practice from the title: no run, back to the title after the tally. */
newQuest(id: QuestId) {
  if (this.mode !== "title" && this.mode !== "over" && this.mode !== "win") return;
  this.audio.unlock();
  this.loadLevel(this.courses[0], 1, 0, true);
  if (this.startQuest(id, { table: "banquet", practice: true, returnX: 0 })) this.audio.startMusic("day");
}

private tryDoor() {
  const p = this.player;
  if (!this.actions.down || !p.onGround || this.swing > 0 || this.superT > 0 || this.mode !== "play") return;
  const cx = p.x + p.w / 2;
  for (const door of this.level.doors) {
    const key = `${this.level.id}:${door.x}`;
    if (door.locked || this.spentDoors.has(key)) continue;
    if (Math.abs(cx - (door.x * TILE + DOOR_W / 2)) > DOOR_W / 2) continue;
    this.spentDoors.add(key);
    this.startQuest(door.quest, { table: door.table, practice: false, returnX: p.x });
    return;
  }
}

private stepQuest(dt: number) {
  const q = this.quest!;
  const pressed = this.questPressed;
  this.questPressed = blank();
  q.step(dt, { held: { ...blank(), ...this.actions }, pressed });
  this.banterT = Math.max(0, this.banterT - dt);
  const done = q.result();
  if (!done) return;
  this.questResult = done;
  this.mode = "questTally";
  this.audio.stopMusic();
  this.audio.clear();
}

/** Continue from the tally: pay out and go back to the door, or back to the title. */
finishQuest() {
  const q = this.quest,
    r = this.questResult,
    info = this.questInfo;
  if (this.mode !== "questTally" || !q || !r || !info) return;
  q.exit();
  this.quest = null;
  this.questResult = null;
  this.questInfo = null;
  this.comics = [];
  this.banterT = 0;
  if (info.practice) {
    this.hooks.onQuestRecord?.(info.id, r.score);
    this.mode = "title";
    return;
  }
  this.scoreAdd(r.score);
  this.addZeros(r.coins);
  this.charge = Math.min(10, this.charge + r.charge);
  this.lives += r.lives;
  if (r.hot || r.fullBelly) this.player.form = 2;
  const p = this.player,
    feet = p.y + p.h;
  p.x = info.returnX;
  p.vx = p.vy = 0;
  p.crouch = false;
  p.slideT = 0;
  p.h = HERO_BODY_HEIGHT;
  p.y = feet - p.h;
  p.onGround = true;
  p.invuln = Math.max(p.invuln, 0.6);
  this.idleT = 0;
  if (r.star) this.startTreat();
  this.audio.startMusic(this.level.music);
  this.mode = "play";
}
```

Wiring:
- `step()`: in the `card` branch, `this.mode = this.cardNext; this.cardNext = "play";` when the card ends; before the `over/win/title` early return add `if (this.mode === "quest") { this.stepQuest(dt); return; } if (this.mode === "questTally") return;`; in the play block after `this.tryPipe();` add `this.tryDoor();`.
- `frame()`: after `this.sample()`: `if (this.mode === "quest") for (const k of ACTIONS) if (this.actions[k] && !this.questPrev[k]) this.questPressed[k] = true; this.questPrev = { ...this.actions };`
- `setPointer()`: `if (down && this.mode === "quest") this.questPressed[action] = true;`
- `togglePause()`: include `"quest"` in the pausable modes; on resume set `this.questPrev = { ...this.actions }`. `onBlur` pauses `"quest"` too.
- `onKeyDown`: `if (this.mode === "questTally" && !e.repeat && (e.code === "Enter" || e.code === "Space")) { e.preventDefault(); this.finishQuest(); }`; include `"quest"` in the preventDefault list.
- `newGame()`: `this.spentDoors = new Set(); this.quest = null; this.questResult = null; this.questInfo = null;`
- `render()`: first line `if (this.quest) return this.renderQuest();` with

```ts
private renderQuest() {
  this.paintStage(0, false, "hotel");
  this.quest!.render(this.ctx, this.clock);
  this.drawHeroLine(0);
  this.drawComics(0);
  this.gradeStage();
}
```

  and `paintStage(cam, night, theme = this.level.theme)` uses `theme` for the backdrop choice.
- `drawHeroLine()` and `faceOnScreen()` use `this.activePose()` (and its `facing`) instead of `this.heroPose()` / `this.player.facing`.
- Door drawing `drawDoors(cam)` right after `drawCastle(cam)`:

```ts
private drawDoors(cam: number) {
  const ctx = this.ctx,
    base = GROUND_ROW * TILE,
    p = this.player,
    cx = p.x + p.w / 2;
  for (const door of this.level.doors) {
    const x = door.x * TILE - cam;
    if (x < -DOOR_W || x > VIEW_W) continue;
    const spent = this.spentDoors.has(`${this.level.id}:${door.x}`);
    ctx.save();
    ctx.fillStyle = "#2a1d14";
    ctx.fillRect(x - 3, base - 66, DOOR_W + 6, 66);
    ctx.fillStyle = spent ? "#4a3424" : "#6b4428";
    ctx.fillRect(x, base - 58, DOOR_W / 2 - 0.5, 58);
    ctx.fillRect(x + DOOR_W / 2 + 0.5, base - 58, DOOR_W / 2 - 0.5, 58);
    ctx.fillStyle = "#d9b45a";
    ctx.fillRect(x + DOOR_W / 2 - 3, base - 30, 1.5, 8);
    ctx.fillRect(x + DOOR_W / 2 + 1.5, base - 30, 1.5, 8);
    ctx.font = "800 5px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8c060";
    ctx.fillText(door.label, x + DOOR_W / 2, base - 60);
    const front = !spent && !door.locked && Math.abs(cx - (door.x * TILE + DOOR_W / 2)) <= DOOR_W / 2;
    if (spent) {
      ctx.fillStyle = "#f4efe4";
      ctx.fillRect(x + 8, base - 48, DOOR_W - 16, 8);
      ctx.fillStyle = "#2a1d14";
      ctx.font = "700 3.4px 'Segoe UI',sans-serif";
      ctx.fillText("THANK YOU", x + DOOR_W / 2, base - 42.6);
    } else if (front) {
      const glow = 0.6 + 0.4 * Math.sin(this.clock * 6);
      ctx.fillStyle = `rgba(255,229,152,${glow})`;
      ctx.font = "900 9px 'Segoe UI',sans-serif";
      ctx.fillText("↓", x + DOOR_W / 2, base - 70);
    }
    ctx.restore();
  }
}
```

- `hint()`: after the boss and plane lines, `const door = this.doorInFront(); if (door) return \`↓ ${door.label} · Hungry Hungry Hammer side quest\`;` where `doorInFront()` returns the unspent unlocked door Hammer stands in front of (same test as `tryDoor` without the down/ground checks).
- `hud()`: `quest: this.quest ? this.quest.hud() : null`, `questResult: this.mode === "questTally" && this.questResult ? { ...this.questResult, practice: this.questInfo?.practice ?? false } : null`; when a quest is active `hint` is `this.quest.hud().hint`.
- Probe: `quest: { get: () => this.quest?.id ?? "" }`, `questScore: { get: () => this.quest?.hud().score ?? 0 }`, `spentDoors: { get: () => this.spentDoors.size }` (and the type lines). Dev: `questSkip: (s) => { for (let i = 0; i < s * 60 && this.quest && !this.quest.result(); i++) this.quest.step(STEP, { held: blank(), pressed: blank() }); return this.quest?.hud().timer ?? 0; }`, `teleport: (x) => { this.player.x = x; this.camX = clamp(x - VIEW_W * 0.32, 0, Math.max(0, this.level.w * TILE - VIEW_W)); return x; }`.
- Imports: `HungryQuest`, `type Quest, type QuestContext, type QuestHud, type QuestId, type QuestResult`, `seededRandom` from levels.

- [ ] **Step 5: Run, expect PASS** (`npm run test:game`, `npx tsc --noEmit`). Fix harness defaults (`spentDoors`, `quest`) if the old checks trip over undefined fields.
- [ ] **Step 6: Commit** `src/game/engine.ts src/game/levels.ts scripts/hungry.check.mjs scripts/game-harness.mjs` — "Host side quests in the engine and open the BUFFET door".

---

### Task 7: The shell: quest HUD, card, tally, Side quests row; browser check

**Files:** Modify `src/components/kiln-hop.tsx`, `src/styles.css`; create `scripts/quest-browser.check.mjs`.

- [ ] **Step 1: Shell.**
  - `initial` Hud gains `quest: null, questResult: null`.
  - `const QUEST_BEST = { hungry: "hammer-time-best-hungry" } as const;` and `readQuestBest(id)` like `readBest`; state `[questBest, setQuestBest] = useState({ hungry: 0 })`, loaded in the effect; hook `onQuestRecord: (id, score) => { const value = Math.max(readQuestBest(id), score); try { localStorage.setItem(QUEST_BEST[id], String(value)); } catch {} setQuestBest((b) => ({ ...b, [id]: value })); }` (only `hungry` exists in the map; ignore other ids).
  - `active` includes `"quest"`.
  - Header: score shows `hud.quest ? hud.quest.score : hud.score`; the venue column shows `hud.quest ? hud.quest.subtitle : \`${hud.world} · ${hud.name}\`` and `hud.quest ? hud.quest.timer ?? "–" : hud.time`.
  - Card veil: when `hud.quest`, kicker "Side quest", `h2` `hud.quest.title`, `p` `hud.quest.subtitle`, `p.dek` "Tap Space to dive · hold to reach farther and rob a plate. H bonks the server. ↓ ducks paper."; else the existing card.
  - Tally veil for `mode === "questTally" && hud.questResult`: kicker "Quest", `h2` grade, `p.best` "Score 000000" plus " · Best 000000" in practice, `ul.notes` of `lines`, `button.btn-nes` "Continue" → `gameRef.current?.finishQuest()`.
  - Statusbar: when `hud.quest`, the meters area shows only `<div className="quest-meter"><span>{meter.label} <b>{meter.text}</b></span><meter min="0" max={meter.max} value={meter.value} aria-label={meter.label} /></div>`.
  - Start screen, after `</nav>` of `.start-venues`:

```tsx
<section className="start-quests" aria-label="Side quests">
  <span className="start-quests-k">Side quests</span>
  <button
    className="start-quest"
    aria-label="Play Hungry Hungry Hammer"
    disabled={!ready}
    onClick={() => gameRef.current?.newQuest("hungry")}
  >
    <b>Hungry Hungry Hammer</b>
    <small>Banquet table · best {pad(questBest.hungry)}</small>
  </button>
</section>
```

  - `sr-only` live text: `"quest" → "Side quest"`, `"questTally" → "Quest results"`.
- [ ] **Step 2: CSS** (`styles.css`, near `.start-venues`):

```css
.start-quests {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.start-quests-k {
  color: #e8b459;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.start-quest {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 14px;
  border: 1px solid #b1b9b930;
  border-radius: 5px;
  background: #13212bd9;
  color: #e9e5dc;
  text-align: left;
}
.start-quest b {
  font-size: 14px;
}
.start-quest small {
  font-size: 11px;
  color: #99aab3;
}
.start-quest:hover:not(:disabled) {
  border-color: #e8b459;
}
.start-quest:disabled {
  opacity: 0.6;
}
.quest-meter {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 160px;
  font-size: 12px;
}
```

  plus inside the existing small-screen media blocks: `.start-quests { gap: 8px; } .start-quest { padding: 6px 10px; }`.
- [ ] **Step 3: Browser check** `scripts/quest-browser.check.mjs` (pattern of `game-browser-check.mjs`; `checkedUrl`, installed Chrome):
  1. Title: assert the Side quests button is visible and enabled; screenshot `artifacts/quest-title.png`; assert `.start-venues` still fits the viewport at 1280×800.
  2. Click it; wait `data-mode` `card` then `quest`; screenshot `quest-start.png`.
  3. Tap Space three times 0.6 s apart; hold Space 0.35 s, screenshot 100 ms after release (`quest-dive.png`); press H, screenshot (`quest-bonk.png`); hold ArrowDown 0.4 s, screenshot (`quest-duck.png`). Assert `__kiln.quest === "hungry"`.
  4. At 390×844 and 844×390: 10 touch buttons, no horizontal overflow, screenshot.
  5. Press Escape mid-round: `data-mode` is `pause` and the HUD timer text does not change over 600 ms; Escape again resumes `quest`.
  6. If `window.__kilnDev`: `questSkip(70)`; wait `questTally`; assert the tally text matches `/COMPED|GOOD TIPPER|SPLIT THE CHECK|WATER ONLY/`; screenshot `quest-tally.png`; click Continue; wait `title`; assert `localStorage["hammer-time-best-hungry"]` is a number.
  7. If `window.__kilnDev`: Clock in (Full shift); wait `play`; `teleport(115 * 16 + 12)`; wait 300 ms; press and hold ArrowDown until `card`; wait `quest`; `questSkip(70)`; wait `questTally`; Continue; wait `play`; assert `__kiln.spentDoors === 1` and `__kiln.x` within 2 of the door; hold ArrowDown 300 ms; assert mode stays `play`; screenshot `quest-door-after.png`.
  8. No page errors; JSON verdict `artifacts/quest-check.json`; print PASS.
- [ ] **Step 4: Run** against dev 8090 with `$env:BROWSER_SMOKE_CHANNEL='chrome'`, the start-screen check, and look at every screenshot. **Step 5: Commit** `src/components/kiln-hop.tsx src/styles.css scripts/quest-browser.check.mjs` — "Show side quests in the shell: HUD, card, tally and the start-screen row".

---

### Task 8: Pose board, README, full verification

**Files:** Modify `scripts/game-browser-check.mjs`, `README.md`.

- [ ] **Step 1:** Pose board: add a row "Charge" `{ coil: 1 }`, "Dive out" `{ lunge: { u: 0.5, reach: 170 } }`, "Dive 90" `{ lunge: { u: 1, reach: 90 } }`, "Dive 250" `{ lunge: { u: 1, reach: 250 } }` (cell shifted left so the hand stays in frame: translate by `-reach * 8 * 0.6`), "Spring back" `{ lunge: { u: 0.4, reach: 250 } }`, "Duck" `{ crouch: true }`.
- [ ] **Step 2:** README: a "Side quests" section (how to enter: the BUFFET door in the lobby with ↓, or the start screen's Side quests row; the rules in brief: dive, charge, reach growth, steals and paybacks, the server, specials, combos, grades and what they pay); controls for the quest (Space/F/Jump dive, hold to charge, H bonk, ↓ duck, Esc pause); validation counts and the new browser check command.
- [ ] **Step 3: Definition of done** (spec §12): `npx tsc --noEmit`; `npx eslint src/game src/components scripts`; `npm run test:game` (all pass, test 1 untouched); dev 8090: `game-browser-check.mjs --poses`, `quest-browser.check.mjs`, `surroundings`, `start-screen`, `pig-boss`, `voice-browser`, `browser-smoke`; production build, preview 8091: `game-browser-check.mjs`, `quest-browser.check.mjs`, `browser-smoke`; owner files' hashes unchanged.
- [ ] **Step 4: Commit** `scripts/game-browser-check.mjs README.md` — "Document Hungry Hungry Hammer; add the dive to the pose board".
- [ ] **Step 5:** Final whole-branch review (fresh reviewer), one fix pass, report to the owner with filmstrips, stop before phase 2.
