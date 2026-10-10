# Phase 0 Warm-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship spec phase 0: the `Line` model with thought bubbles for every unrecorded Hammer line, idle moves (watch check, foot tap, harrumph), the super smash squat that puts the mallet head on the floor, and the quest plumbing types compiled but unused.

**Architecture:** Hammer's lines move into one table in `lines.ts` (`Line = { text, clip? }`); the engine's `say()` gains a `spoken` flag set only by a `voice()` helper when a recorded clip actually played, and unspoken lines render through a new pure-layout module `thought.ts`. New poses are keyframes in `rig.ts` (a `squat` joint with two-bone leg IK, `watchJoints`, `tapJoints`, `idleJoints`) drawn by `hero.ts`; the engine only tracks an idle timer. `src/game/quests/quest.ts` holds the spec's interface types.

**Tech Stack:** TypeScript, Canvas 2D, Vite/TanStack Start shell, node:test via `scripts/game-test-loader.mjs`, Playwright (installed Chrome) for renders.

**Spec:** `docs/superpowers/specs/2026-10-09-hammer-time-expansion-design.md` (sections 2, 4, 5, 10 "Idle moves" and "Super smash squat", 12, 13 phase 0).

## Global Constraints

- His face never changes and nothing is drawn over it; `no drawn frame of any hero pose puts the arm or mallet over the face` must cover every new pose (watch check, foot tap, squat) and pass.
- Source PNGs, the pig, the photo pickups and the towel stay byte-for-byte; test 1 of `gameplay.check.mjs` is not edited and keeps passing.
- The six recordings are the only spoken lines: staff = fired/feedback/butt-hurt, students = problem/man-balls, pig = all five, damage = `damage-voice.wav`. Every other Hammer line is a text thought bubble. NPC lines stay speech bubbles.
- `Line = { text: string; clip?: TauntId | "damage" }` (spec says `TauntId`; widened so the damage caption lives in the same table).
- Thought anchor: `x = headX - facing * 10`, `y = top - 18`, clamped to the view, never in front of the face. Cloud = four overlapping ellipses with a dark outline plus two trailing circles toward the back of the head.
- Idle: grounded, still, no enemy within 120 px, no action for 2.5 s → watch check (far wrist to chest height, elbow bent, never above the collar); 5 s → foot tap via `stride`; 8 s → `audio.harrumph()` and "Any day now."; any input cancels.
- Super smash: `Joints.squat` 0..1 bends both knees in `legs()` and lowers the hips; the SUPER keyframes squat to 1 through the slam so the mallet head meets the floor.
- Never stage `package-lock.json` or `src/routeTree.gen.ts`; always `git add` explicit paths. Commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, message ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Dev server on 8090 only (8080/8081 belong to another tool): `node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort` with `node_modules\.bin` on PATH.

## Review Focus

1. **Thought bubble at a view edge or the top of the screen** (Hammer on a high shelf, or pressed against the left/right edge): clamping must never slide the cloud or its puffs over his face. Pinned by the sweep test in Task 2.
2. **A recorded clip starts while a thought is showing, or an idle thought fires during a spoken caption**: the spoken caption replaces the thought; the soft idle line never overwrites a spoken caption. Pinned in Tasks 1 and 4.
3. **Idling with danger around** (a paper plane in flight, an awake pig, a staffer frozen by a lecture 100 px away): he must not start checking his watch. Pinned in Task 4.
4. **Facing left**: the slam must put the mirrored mallet on the floor too; contact checks run with `facing: -1`. Pinned in Task 3.
5. **Idle state leaking across a death, level load or card**: the watch pose must not survive a respawn. Pinned in Task 4.

---

## File Structure

- `src/game/lines.ts` (modify): the single table of Hammer's lines as `Line`s (`TAUNT_LINES`, `DAMAGE_LINE`, `STAFF_COMEBACKS`, `LECTURES`, `STUDENT_EXCHANGES`, `ASIDES`), plus NPC strings unchanged.
- `src/game/levels.ts` (modify): `StudentSpawn.hammer` becomes a `Line`; student pairs come from `STUDENT_EXCHANGES`.
- `src/game/thought.ts` (create): `thoughtLayout()` (pure, tested) and `drawThought()`.
- `src/game/rig.ts` (modify): `FACE`, `CROWN`, `MALLET_OUTLINE`, leg constants, `squat` joint, `squatOffset()`, `squatLeg()`, new SUPER keyframes, `watchJoints()`, `tapJoints()`, `idleJoints()`, `WATCH_HAND`.
- `src/game/combat.ts` (modify): idle timing constants.
- `src/game/hero.ts` (modify): `HeroPose.idle`, `heroFace()`, squat-aware legs/shorts/torso frame, wrist watch on the far arm.
- `src/game/engine.ts` (modify): `say(..., spoken)`, `voice()`, rerouted quip/greeting/lecture/swat/pig captions, thought rendering, idle timer, slam ring at the mallet, probe fields.
- `src/game/quests/quest.ts` (create): spec section 4 types.
- `scripts/gameplay.check.mjs` (modify, never test 1): new checks and the extended face sweep.
- `scripts/game-browser-check.mjs` (modify): bigger pose board (new poses, slam sequence, thought bubbles), live idle and slam captures.
- `README.md` (modify).

---

### Task 1: Line table and the spoken-or-thought switch

**Files:**
- Modify: `src/game/lines.ts`, `src/game/levels.ts:16-22,161-174,318-322`, `src/game/engine.ts` (imports; `say` 1178; `quip` 1185; lecture start 1007; `deliverLecture` 1136-1139; wipe 1093; student greeting 1446-1456; `hitBoss` 1575; swat 1856; `startSuper` 1896; reset ~2221; `drawCurse` 3565)
- Test: `scripts/gameplay.check.mjs` (append)

**Interfaces:**
- Produces: `type Line = { text: string; clip?: TauntId | "damage" }`; `TAUNT_LINES: Record<TauntId, Line>`; `DAMAGE_LINE: Line`; `STAFF_COMEBACKS: Record<EnemyRole, Line[]>`; `LECTURES: Line[]`; `STUDENT_EXCHANGES: { hammer: Line; reply: string }[]`; `ASIDES: { better: Line; hammerTime: Line; anyDayNow: Line }`; engine private `say(text, seconds, soft = false, spoken = false)`, `voice(said: unknown): boolean`, field `banterSpoken: boolean`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/gameplay.check.mjs`; add `import * as LINES from "../src/game/lines.ts";` at the top)

```js
test("only the six recordings are spoken lines; every other Hammer line is text", () => {
  const found = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if (typeof v.text === "string" && Object.keys(v).every((k) => k === "text" || k === "clip")) found.push(v);
      else Object.values(v).forEach(walk);
    }
  };
  walk(Object.values(LINES));
  const clips = found.filter((line) => line.clip).map((line) => line.clip);
  assert.deepEqual(clips.sort(), [...Object.keys(TAUNT_FILES), "damage"].sort());
  for (const [id, line] of Object.entries(LINES.TAUNT_LINES)) assert.equal(line.clip, id);
  assert.equal(LINES.DAMAGE_LINE.clip, "damage");
  assert.ok(found.length >= 35, "Hammer's written lines live in the table");
});

test("a played clip is captioned as speech; anything else is a thought", () => {
  const g = game();
  g.voice("fired");
  assert.equal(g.heroBanter, "They need to get fired.");
  assert.equal(g.banterSpoken, true);
  g.banterT = 0;
  assert.equal(g.voice(null), false);
  assert.equal(g.voice(3), false, "stubbed taunts that return junk are not speech");
  const random = Math.random;
  Math.random = () => 0;
  try {
    g.quip({ role: "server", home: 0 }, null);
  } finally {
    Math.random = random;
  }
  assert.ok(LINES.STAFF_COMEBACKS.server.some((line) => line.text === g.heroBanter));
  assert.equal(g.banterSpoken, false);
});

test("student greetings caption the clip that played, or think the written line", () => {
  for (const [said, spoken] of [["man-balls", true], [null, false]]) {
    const g = game();
    g.loadLevel(g.courses[2], 2, 0, true);
    g.enemies = [];
    g.audio.taunt = () => said;
    const student = g.students[0];
    g.player.x = student.x - 20;
    g.stepStudents(1 / 60);
    assert.equal(g.heroBanter, spoken ? "Go grow some man balls." : student.hammer.text);
    assert.equal(g.banterSpoken, spoken);
  }
});
```

Also edit the existing check "hospitality staff dominate the cast" (not test 1): `assert.equal(g.heroBanter, student.hammer);` becomes `assert.equal(g.heroBanter, student.hammer.text);`.

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:game`
Expected: the three new checks FAIL (`TAUNT_LINES` undefined, `g.voice is not a function`).

- [ ] **Step 3: Rewrite `src/game/lines.ts`**

```ts
import type { EnemyRole } from "./levels";
import type { TauntId } from "./taunts";

/**
 * One of Hammer's lines. Only the six recordings carry a clip; a line without
 * one is drawn as a thought bubble. Giving a line a clip makes it spoken.
 */
export type Line = { text: string; clip?: TauntId | "damage" };
const think = (text: string): Line => ({ text });

/** Captions for the five supplied recordings. */
export const TAUNT_LINES: Record<TauntId, Line> = {
  fired: { text: "They need to get fired.", clip: "fired" },
  feedback: { text: "They can't take feedback.", clip: "feedback" },
  problem: { text: "They got a problem.", clip: "problem" },
  "man-balls": { text: "Go grow some man balls.", clip: "man-balls" },
  "butt-hurt": { text: "They get all butt hurt.", clip: "butt-hurt" },
};
export const DAMAGE_LINE: Line = { text: "ABSOLUTE BULLSHIT", clip: "damage" };

/** Hammer's reply when the mallet lands and no recorded line is playing. */
export const STAFF_COMEBACKS: Record<EnemyRole, Line[]> = {
  server: ["I said NO ice.", "Coke ZERO. Not Diet.", "Get me your manager.", "That's coming out of your tip.", "Did I stutter?"].map(think),
  hotel: ["I've had status since '98.", "Resort fee THIS.", "Who trained you?", "Unbelievable."].map(think),
  office: ["Circle back on THIS.", "Reply all to that.", "Consider this my feedback."].map(think),
};

export const LECTURES: Line[] = [
  "Let me explain this slowly.",
  "Back in my day, we read the syllabus.",
  "When I was your age, I had two jobs.",
  "Look at me when I'm talking to you.",
  "A participation trophy is not an achievement.",
  "Sit up straight. Both feet on the floor.",
  "That is not a real major.",
].map(think);

/** Hammer's opener to a student, and what the student says back. */
export const STUDENT_EXCHANGES: { hammer: Line; reply: string }[] = [
  ["Read the syllabus, rookie.", "It's on the rubric."],
  ["That's not extra credit.", "I just asked for directions."],
  ["Office hours are over.", "Sir, this is the dining hall."],
  ["Your group project is a mess.", "We put your name on it."],
  ["Put the phone down, scholar.", "I'm rating your customer service."],
  ["That paper better be double-spaced.", "It's a paper airplane."],
  ["No extensions. Ever.", "You missed the deadline too."],
].map(([hammer, reply]) => ({ hammer: think(hammer), reply }));

export const ASIDES = {
  better: think("Ahh. Better."),
  hammerTime: think("HAMMER TIME."),
  anyDayNow: think("Any day now."),
};
```

Keep `STAFF_LINES`, `RETORTS`, `STAFF_SIGHS`, `IMPACT_WORDS` and `pick` exactly as they are (NPC strings and comic words). Delete `SUBTITLES` (replaced by `TAUNT_LINES`).

- [ ] **Step 4: Point `levels.ts` at the table**

`StudentSpawn.hammer: Line` (`import type { Line } from "./lines"` and `import { STUDENT_EXCHANGES } from "./lines"`), delete the local `studentLines` array, and:

```ts
function students(level: Level, xs: number[], rng: () => number) {
  level.students = xs.map((x, i) => {
    const { hammer, reply } = STUDENT_EXCHANGES[i % STUDENT_EXCHANGES.length];
    return { x, hammer, reply, throws: true, delay: 2 + rng() * 3 };
  });
}
```

Campus explicit students: `campus.students = [17, 62, 96].map((x, i) => ({ x, ...STUDENT_EXCHANGES[i] }));`

`lines.ts` imports only types from `levels.ts`, so the new value import has no cycle at runtime.

- [ ] **Step 5: Route every Hammer caption through `say`/`voice` in `engine.ts`**

```ts
private banterSpoken = false;

/** Soft lines (written jabs, asides) give way to the next encounter; the rest play out. */
private say(text: string, seconds: number, soft = false, spoken = false) {
  this.heroBanter = text;
  this.banterT = seconds;
  this.banterSoft = soft;
  this.banterSpoken = spoken;
}

/** A recorded line that actually played is captioned as speech. */
private voice(said: unknown) {
  const line = typeof said === "string" ? TAUNT_LINES[said as TauntId] : undefined;
  if (!line) return false;
  this.say(line.text, 2, false, true);
  return true;
}

/** Captions the recorded line when one plays; otherwise an occasional written jab. */
private quip(e: Pick<Enemy, "role" | "home">, said: unknown) {
  if (this.voice(said) || this.banterT > 0 || Math.random() >= 0.45) return;
  this.say(pick(STAFF_COMEBACKS[e.role ?? "office"], e.home / TILE + this.clock * 3).text, 1.6, true);
}
```

Call sites:
- lecture start: `this.say(pick(LECTURES, this.clock * 13).text, 1.8);`
- `deliverLecture`: replace the `SUBTITLES` block with `this.voice(this.audio.taunt(schooled ? "student" : "staff"));`
- wipe shine: `this.say(ASIDES.better.text, 1.2, true);`
- student greeting: replace `this.say(student.hammer, 2.1); this.audio.taunt("student");` with `if (!this.voice(this.audio.taunt("student"))) this.say(student.hammer.text, 2.1);`
- `hitBoss`: `this.voice(this.audio.taunt("pig"));`
- plane swat: `this.voice(this.audio.taunt("student"));`
- `startSuper`: `this.say(ASIDES.hammerTime.text, 1.1, true);`
- level reset (`this.banterSoft = false;` at ~2221): add `this.banterSpoken = false;`
- `drawCurse`: `const line = DAMAGE_LINE.text;`
- imports: drop `SUBTITLES`, add `ASIDES, DAMAGE_LINE, TAUNT_LINES` from `./lines` and `import type { TauntId } from "./taunts";`

- [ ] **Step 6: Run the tests**

Run: `npm run test:game` and `npx tsc --noEmit`
Expected: all checks PASS (36), tsc clean.

- [ ] **Step 7: Commit**

```powershell
git add src/game/lines.ts src/game/levels.ts src/game/engine.ts scripts/gameplay.check.mjs
git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG
```
Message: "Move Hammer's lines into one table and caption only played clips as speech".

---

### Task 2: Thought bubbles

**Files:**
- Create: `src/game/thought.ts`
- Modify: `src/game/rig.ts` (add `FACE`, `CROWN`), `src/game/hero.ts` (add `heroFace`), `src/game/engine.ts` (render at ~2711)
- Test: `scripts/gameplay.check.mjs`

**Interfaces:**
- Consumes: `banterSpoken`, `heroBanter` from Task 1.
- Produces: `type Rect = { x; y; w; h }`; `thoughtLayout(size: { w: number; h: number }, crown: Point, facing: 1 | -1, face: Rect, view: { w: number; h: number }): { cloud: Rect; puffs: { x: number; y: number; r: number }[] }`; `drawThought(ctx, text, crown, facing, face, view): void`; rig `FACE: readonly [Point, Point]`, `CROWN: Point`; hero `heroFace(p: HeroPose): Rect & { crown: Point }`.

- [ ] **Step 1: Write the failing test**

```js
import { thoughtLayout } from "../src/game/thought.ts";
import { heroFace } from "../src/game/hero.ts";

test("a thought cloud sits above and behind the head and never covers the face", () => {
  const view = { w: 384, h: 216 };
  const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pose = { x: 200, foot: 192, facing: 1, phase: 0, moving: false, air: false, landing: 0, swing: 0, mega: 0, wipe: 0, snot: 0, heat: 0, hurt: 0, star: 0, reduced: false, clock: 0 };
  const rest = heroFace(pose);
  const normal = thoughtLayout({ w: 60, h: 14 }, rest.crown, 1, rest, view);
  assert.ok(normal.cloud.y + normal.cloud.h <= rest.crown.y - 17, "above the head");
  assert.ok(normal.cloud.x + normal.cloud.w / 2 < rest.crown.x, "behind the head");
  for (const facing of [1, -1])
    for (let x = 0; x <= 384; x += 6)
      for (const foot of [60, 80, 120, 192])
        for (const size of [{ w: 30, h: 14 }, { w: 82, h: 24 }]) {
          const p = { ...pose, x, foot, facing };
          const face = heroFace(p);
          const { cloud, puffs } = thoughtLayout(size, face.crown, facing, face, view);
          const label = `x=${x} foot=${foot} facing=${facing} w=${size.w}`;
          assert.ok(!hits(cloud, face), `${label}: cloud covers the face`);
          assert.ok(cloud.x >= 0 && cloud.y >= 0 && cloud.x + cloud.w <= 384 && cloud.y + cloud.h <= 216, `${label}: off view`);
          for (const c of puffs)
            assert.ok(!hits({ x: c.x - c.r, y: c.y - c.r, w: 2 * c.r, h: 2 * c.r }, face), `${label}: puff on the face`);
        }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:game`
Expected: FAIL, cannot find module `thought.ts` / `heroFace` not exported.

- [ ] **Step 3: Add face geometry**

`rig.ts`:
```ts
/** Eyes, nose, mustache, mouth and chin: nothing is ever drawn over this box. */
export const FACE: readonly [Point, Point] = [{ x: 282, y: 96 }, { x: 368, y: 266 }];
/** Top of the bald crown, in head space. */
export const CROWN = { x: 232, y: 0 };
```

`hero.ts`:
```ts
/** World-space face box and the crown above it, for anything placed near his head. */
export function heroFace(p: HeroPose) {
  const j = heroJoints(p);
  const [a, b] = FACE.map((c) => artworkToWorld(p, rigPoint(j, c, "head")));
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
    crown: artworkToWorld(p, rigPoint(j, CROWN, "head")),
  };
}
```

- [ ] **Step 4: Create `src/game/thought.ts`**

```ts
import type { Point } from "./combat";

export type Rect = { x: number; y: number; w: number; h: number };
type View = { w: number; h: number };

const EDGE = 2;
const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/**
 * Above and behind the head, clamped to the view. When an edge would push the
 * cloud onto the face it moves fully behind the face, then below it.
 */
export function thoughtLayout(size: { w: number; h: number }, crown: Point, facing: 1 | -1, face: Rect, view: View) {
  const fitX = (x: number) => Math.min(Math.max(x, EDGE), view.w - size.w - EDGE);
  const fitY = (y: number) => Math.min(Math.max(y, EDGE), view.h - size.h - EDGE);
  const ax = crown.x - facing * 10,
    ay = crown.y - 18;
  let cloud: Rect = { x: fitX(ax - size.w / 2), y: fitY(ay - size.h), ...size };
  if (overlaps(cloud, face, 2))
    cloud = { ...cloud, x: fitX(facing > 0 ? face.x - 4 - size.w : face.x + face.w + 4) };
  if (overlaps(cloud, face, 2)) cloud = { ...cloud, y: fitY(face.y + face.h + 4) };
  const from = { x: crown.x - facing * 6, y: crown.y + 1 };
  const below = cloud.y > from.y;
  const to = {
    x: Math.min(Math.max(from.x, cloud.x + 4), cloud.x + cloud.w - 4),
    y: below ? cloud.y : cloud.y + cloud.h,
  };
  const puffs = [
    { t: 0.35, r: 1.1 },
    { t: 0.7, r: 1.7 },
  ].map(({ t, r }) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, r }));
  return { cloud, puffs };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  lines.push(line);
  return lines;
}

/** Hammer thinking out loud: a cloud of four ellipses trailing two puffs toward the back of his head. */
export function drawThought(ctx: CanvasRenderingContext2D, text: string, crown: Point, facing: 1 | -1, face: Rect, view: View) {
  ctx.save();
  ctx.font = "italic 600 4px 'Segoe UI',sans-serif";
  const lines = wrap(ctx, text, 76);
  const size = { w: Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14, h: lines.length * 5 + 9 };
  const { cloud, puffs } = thoughtLayout(size, crown, facing, face, view);
  const { x, y, w, h } = cloud;
  const lobes = [
    [x + w * 0.3, y + h * 0.5, w * 0.32, h * 0.5],
    [x + w * 0.5, y + h * 0.42, w * 0.3, h * 0.48],
    [x + w * 0.7, y + h * 0.5, w * 0.32, h * 0.5],
    [x + w * 0.5, y + h * 0.62, w * 0.42, h * 0.4],
  ];
  const shapes = () => {
    ctx.beginPath();
    for (const [cx, cy, rx, ry] of lobes) {
      ctx.moveTo(cx + rx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    for (const c of puffs) {
      ctx.moveTo(c.x + c.r, c.y);
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    }
  };
  // Stroke every lobe, then fill over the inner strokes: only the outline of the union stays.
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 1.2;
  shapes();
  ctx.stroke();
  ctx.fillStyle = "#fbf7ee";
  shapes();
  ctx.fill();
  ctx.fillStyle = "#2a1c12";
  ctx.textAlign = "center";
  lines.forEach((part, i) => ctx.fillText(part, x + w / 2, y + 8 + i * 5));
  ctx.restore();
}
```

- [ ] **Step 5: Render unspoken lines as thoughts** (`engine.ts` render, replacing the `drawSpeech(this.heroBanter, ...)` branch)

```ts
else if (this.banterT > 0) {
  if (this.banterSpoken)
    this.drawSpeech(this.heroBanter, this.player.x - cam, this.player.y - 26, "#e7bd6a");
  else {
    const face = heroFace(this.heroPose());
    drawThought(
      ctx,
      this.heroBanter,
      { x: face.crown.x - cam, y: face.crown.y },
      this.player.facing,
      { ...face, x: face.x - cam },
      { w: VIEW_W, h: VIEW_H },
    );
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `npm run test:game`, `npx tsc --noEmit`, `npx eslint src/game scripts`
Expected: PASS (37), clean.

- [ ] **Step 7: Commit** `src/game/thought.ts src/game/rig.ts src/game/hero.ts src/game/engine.ts scripts/gameplay.check.mjs` — "Draw Hammer's unrecorded lines as thought bubbles behind his head".

---

### Task 3: Super smash squat

Geometry measured before planning (art space, 456x1371, soles at y≈1368): with the current slam the lowest drawn mallet pixel is at y≈1048–1075; arm and mallet hanging straight down from an upright shoulder reach ≈1060. Knee bend alone cannot close 300 px. A lab sweep (squat depth × lean × arm angles, face margin > 10, head in front of the toes) found the most upright working slam at **hips 180 px down and 110 px back, torso lean 45°, A 405, F 400, H 390** (lowest mallet pixel 1358, face margin 152). Fallback if the 45° lean shows a waist or neck gap that cannot be patched: 160 down / 80 back with lean 55°, A 385, F 380, H 370. The physics lands the hop at u≈0.606, so the slam pose must be complete by u=0.58 and hold through 0.76.

**Files:**
- Modify: `src/game/rig.ts` (Joints, REST, rigPoint, keyed, SUPER), `src/game/hero.ts` (legs, torso frame, shorts), `src/game/engine.ts` (`superBurst` ring origin)
- Test: `scripts/gameplay.check.mjs`

**Interfaces:**
- Produces: `Joints.squat: number`; `SQUAT_DROP = 180`, `SQUAT_BACK = 110`; `KNEE`, `ANKLE`, `LEG_HIPS: { rear: Point; front: Point }`; `MALLET_OUTLINE: readonly Point[]`; `squatOffset(squat: number): Point`; `squatLeg(hip: Point, squat: number): { thigh: number; knee: number }` (radians, canvas rotations applied after `translate(squatOffset)`).

- [ ] **Step 1: Write the failing tests**

```js
import { ANKLE, KNEE, LEG_HIPS, MALLET_OUTLINE, rotateAround, squatLeg, squatOffset } from "../src/game/rig.ts";

test("the squat bends both knees and keeps both feet planted", () => {
  for (const hip of Object.values(LEG_HIPS))
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const { thigh, knee } = squatLeg(hip, s);
      const o = squatOffset(s);
      const foot = rotateAround(rotateAround(ANKLE, KNEE, knee), hip, thigh);
      assert.ok(Math.hypot(foot.x + o.x - ANKLE.x, foot.y + o.y - ANKLE.y) < 0.5, `foot slides at ${s}`);
      const k = rotateAround(KNEE, hip, thigh);
      if (s > 0.3) assert.ok(k.x + o.x > hip.x + o.x, "knees go forward, never backward");
    }
  assert.deepEqual(squatLeg(LEG_HIPS.front, 0), { thigh: 0, knee: 0 });
  assert.deepEqual(squatOffset(0), { x: 0, y: 0 });
});

test("the super smash slam squats so the mallet head meets the floor", () => {
  const lowest = (u) => Math.max(...MALLET_OUTLINE.map((p) => rigPoint(superJoints(u), p, "mallet").y));
  for (let u = 0.58; u <= 0.76; u += 0.01) {
    assert.equal(superJoints(u).squat, 1, `full squat at ${u}`);
    const y = lowest(u);
    assert.ok(y > 1350 && y < 1390, `mallet at ${Math.round(y)} on u=${u.toFixed(2)}`);
  }
  assert.ok(lowest(0.42) < 900, "still overhead before the cut");
  for (const facing of [1, -1]) {
    const g = game();
    g.enemies = [];
    g.students = [];
    g.actions = {};
    g.player.onGround = true;
    g.player.facing = facing;
    g.charge = 10;
    g.superEdge = true;
    let gap = null;
    const burst = g.superBurst;
    g.superBurst = function () {
      const pose = this.heroPose();
      const j = heroJoints(pose);
      const low = Math.max(...MALLET_OUTLINE.map((p) => artworkToWorld(pose, rigPoint(j, p, "mallet")).y));
      gap = low - (this.player.y + this.player.h);
      burst.call(this);
    };
    for (let i = 0; i < 90 && gap === null; i++) g.step(1 / 60);
    assert.ok(gap !== null && Math.abs(gap) <= 1, `facing ${facing}: mallet ${gap} px off the floor at the burst`);
    const center = g.player.x + g.player.w / 2;
    assert.ok(g.rings.some((ring) => ring.floor && (ring.x - center) * facing > 3), "shockwave from the mallet, in front");
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:game`
Expected: FAIL, `squatLeg` not exported.

- [ ] **Step 3: Rig: squat joint, offset, leg IK, outline** (`rig.ts`)

```ts
/** Squat: the hips sink and sit back; both legs solve to keep the feet planted. */
export const SQUAT_DROP = 180;
export const SQUAT_BACK = 110;
export const KNEE = { x: 143, y: 1098 };
export const ANKLE = { x: 113, y: 1250 };
export const LEG_HIPS = { rear: { x: 210, y: 935 }, front: { x: 143, y: 935 } };
/** Drawn outline of the mallet head, in mallet space. */
export const MALLET_OUTLINE: readonly Point[] = [
  { x: 271, y: 992 }, { x: 296, y: 900 }, { x: 352, y: 830 }, { x: 366, y: 826 }, { x: 448, y: 869 },
  { x: 453, y: 880 }, { x: 425, y: 956 }, { x: 375, y: 1036 }, { x: 281, y: 1005 },
];

export function squatOffset(squat: number): Point {
  return { x: -SQUAT_BACK * squat, y: SQUAT_DROP * squat };
}

/** Thigh and knee rotations that put the ankle back where it stands, knee forward. */
export function squatLeg(hip: Point, squat: number) {
  if (squat <= 0) return { thigh: 0, knee: 0 };
  const o = squatOffset(squat);
  const h = { x: hip.x + o.x, y: hip.y + o.y };
  const thighLen = Math.hypot(KNEE.x - hip.x, KNEE.y - hip.y),
    shinLen = Math.hypot(ANKLE.x - KNEE.x, ANKLE.y - KNEE.y);
  const dx = ANKLE.x - h.x,
    dy = ANKLE.y - h.y;
  const d = Math.min(thighLen + shinLen - 1e-6, Math.hypot(dx, dy));
  const base = Math.atan2(dy, dx);
  const bend = Math.acos((thighLen ** 2 + d ** 2 - shinLen ** 2) / (2 * thighLen * d));
  const knees = [base + bend, base - bend].map((a) => ({ x: h.x + Math.cos(a) * thighLen, y: h.y + Math.sin(a) * thighLen }));
  const k = knees[0].x >= knees[1].x ? knees[0] : knees[1];
  const thigh = Math.atan2(k.y - h.y, k.x - h.x) - Math.atan2(KNEE.y - hip.y, KNEE.x - hip.x);
  const knee = Math.atan2(ANKLE.y - k.y, ANKLE.x - k.x) - Math.atan2(ANKLE.y - KNEE.y, ANKLE.x - KNEE.x) - thigh;
  return { thigh, knee };
}
```

`Joints` gains `/** 0..1: hips sink and sit back, knees bend, feet stay planted. */ squat: number;`, `REST` gets `squat: 0`, and `rigPoint` ends with:

```ts
  q = rotateAround(q, HIP, rad(j.lean));
  const o = squatOffset(j.squat);
  return { x: q.x + j.dx + o.x, y: q.y + o.y };
```

`keyed()` accepts an optional `squat` track: `squat: table.squat ? track(table.squat, u) : 0` (type `Record<"A" | "F" | "H" | "lean" | "dx" | "stride", readonly Key[]> & { squat?: readonly Key[] }`).

New SUPER table (keys before `SUPER_CUT_TO` unchanged):

```ts
const SUPER = {
  A: [[0, A0], [0.3, 256, out], [SUPER_CUT_FROM, 264, linear], [SUPER_CUT_TO, 352, linear], [0.56, 405, out], [0.76, 405], [1, A0 + 360]],
  F: [[0, F0], [0.3, 248, out], [SUPER_CUT_FROM, 258, linear], [SUPER_CUT_TO, 346, linear], [0.56, 400, out], [0.76, 400], [1, F0 + 360]],
  H: [[0, H0], [0.3, 218, out], [SUPER_CUT_FROM, 232, linear], [SUPER_CUT_TO, 404, linear], [0.56, 390, out], [0.76, 390], [1, H0 + 360]],
  lean: [[0, 0], [0.34, -9, out], [SUPER_CUT_FROM, -10], [SUPER_CUT_TO, 4, linear], [0.56, 45, out], [0.76, 45], [1, 0]],
  dx: [[0, 0], [0.34, -14, out], [SUPER_CUT_TO, 10, linear], [0.56, 36, out], [0.76, 36], [1, 0]],
  stride: [[0, 0], [0.34, -0.4], [SUPER_CUT_TO, 0.5, linear], [0.56, 1, out], [0.76, 1], [1, 0]],
  squat: [[0, 0], [SUPER_CUT_TO, 0], [0.56, 1, out], [0.78, 1], [1, 0]],
} satisfies Record<string, Key[]>;
```

`H` passes 404 at the cut and settles back to 390: the handle levels out as the head hits. The `[1, A0 + 360]` returns stay so the recover tracks wrap correctly.

- [ ] **Step 4: Draw the squat** (`hero.ts`)

`legs()` takes the joints (`legs(ctx, a, p, j)`, using `j.stride` where `stance` was). Per leg, after the existing `thigh`/`knee` angle expressions:

```ts
const hip = rear ? LEG_HIPS.rear : LEG_HIPS.front;
const s = p.crouch ? 0 : j.squat;
const ik = squatLeg(hip, s);
const o = squatOffset(s);
ctx.translate(o.x, o.y);
const thighA = thigh + (ik.thigh - thigh) * s;
const kneeA = knee + (ik.knee - knee) * s;
// ...rotate thighA around hip, draw thigh; rotate kneeA around KNEE, draw shin...
if (!p.crouch) {
  // Planted feet stay flat while the shin folds over them.
  pivot(ctx, ANKLE, -(thighA + kneeA) * s);
  if (rear) ctx.drawImage(a.idle, 130, 1175, 215, 121, 81, 1200, 215, 121);
  else ctx.drawImage(a.idle, 43, 1225, 258, 146, 43, 1225, 258, 146);
}
```

Replace the literal `hipX`/`935`/`143, 1098` pivots with `hip` and `KNEE`. The shorts block runs inside `ctx.save(); ctx.translate(o.x, o.y); ... ctx.restore();` with `o = squatOffset(p.crouch ? 0 : j.squat)`. In `drawHero`, `torsoFrame` becomes:

```ts
const sink = squatOffset(j.squat);
const torsoFrame = () => {
  ctx.translate(sink.x, sink.y);
  pivot(ctx, HIP, lean);
};
```

This matches `rigPoint` (rotate, then offset) so drawing, the smear and the mallet point agree.

- [ ] **Step 5: Ring from the mallet** (`engine.ts` `superBurst`)

```ts
const slam = heroMallet(this.heroPose());
for (...) this.rings.push({ x: slam.x, y: floor, ... floor: true });
```

Hit areas, bricks and boss damage keep using `cx`.

- [ ] **Step 6: Run the tests and render**

Run: `npm run test:game` (39 PASS; the face sweep already covers `superJoints` at every u, now squatting).
Render the slam sequence (Task 6 board row 3, or a scratch copy of it now) and look: the head stays level, no gap opens at the lower back or neck at 45°, both shoes stay flat on the floor line, the mallet head visibly sits on the floor in front of the toes. If the waist opens, extend the shorts polygon top edge up the back by the uncovered height when `j.lean > 20` (shorts already "reach up under the shirt" for this reason) and re-render. Switch to the fallback numbers only if the 45° pose cannot be made clean.

- [ ] **Step 7: Commit** `src/game/rig.ts src/game/hero.ts src/game/engine.ts scripts/gameplay.check.mjs` — "Squat into the super smash so the mallet head meets the floor".

---

### Task 4: Idle moves

**Files:**
- Modify: `src/game/combat.ts`, `src/game/rig.ts`, `src/game/hero.ts` (`HeroPose.idle`, `heroJoints`, watch on the far arm), `src/game/engine.ts` (idle timer, `heroPose`, probe, level reset)
- Test: `scripts/gameplay.check.mjs` (new checks; extend the face sweep)

**Interfaces:**
- Consumes: `ASIDES.anyDayNow`, `say()` from Task 1.
- Produces: `IDLE_WATCH_AT = 2.5`, `WATCH_SECONDS = 2.1`, `IDLE_TAP_AT = 5`, `IDLE_HARRUMPH_AT = 8`; `WATCH_HAND`, `watchJoints(u)`, `tapJoints(t)`, `idleJoints(t, reduced): Joints | null`; `HeroPose.idle?: number`; engine `idleT` and `__kiln.idle`.

- [ ] **Step 1: Write the failing tests**

Face sweep additions (inside the existing face test, which is not test 1):

```js
  const collar = Math.max(...NECKLINE.map(([, y]) => y));
  const farClear = (j, label) => {
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
    for (let t = 0; t <= 1.0001; t += 0.1)
      assert.ok(elbow.y + (hand.y - elbow.y) * t > collar, `${label}: far forearm above the collar`);
  };
  for (let i = 0; i <= 400; i++) {
    const u = i / 400;
    clear(snotJoints(u), `snot ${u}`);
    clear(wipeJoints(u), `wipe ${u}`);
    clear(watchJoints(u), `watch ${u}`);
    farClear(watchJoints(u), `watch ${u}`);
    clear(tapJoints(u * 3), `tap ${u}`);
  }
  const wrist = (j) => {
    const { elbow, hand } = farArm(j);
    return elbow.y + (hand.y - elbow.y) * 0.78;
  };
  assert.ok(wrist(watchJoints(0.5)) > 380 && wrist(watchJoints(0.5)) < 520, "watch at chest height");
```

(The `face` constant in that test is replaced by the imported `FACE`; values are identical. Extend the test file's `rig.ts` import with `FACE, FAR_SHOULDER, NECKLINE, farArm, snotJoints, tapJoints, watchJoints, wipeJoints`.)

Engine checks:

```js
function idleGame() {
  const g = game();
  g.enemies = [];
  g.students = [];
  g.planes = [];
  g.actions = {};
  g.player.onGround = true;
  g.player.vx = 0;
  return g;
}
const run = (g, seconds) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.step(1 / 60);
};

test("standing still he checks his watch, taps his foot, then harrumphs; any input cancels", () => {
  const g = idleGame();
  let harrumphs = 0;
  g.audio.harrumph = () => harrumphs++;
  run(g, 2.4);
  assert.equal(heroJoints(g.heroPose()).far, null, "not yet");
  run(g, 0.4);
  assert.ok(heroJoints(g.heroPose()).far, "watch check at 2.5 s");
  run(g, 2.6);
  assert.ok(g.idleT > 5, "still idle at 5.4 s");
  const tap = heroJoints({ ...g.heroPose(), idle: 5.125 });
  assert.ok(tap.stride > 0.4 && !tap.far, "foot tap after 5 s, watch lowered");
  run(g, 2.7);
  assert.equal(harrumphs, 1);
  assert.equal(g.heroBanter, "Any day now.");
  assert.equal(g.banterSpoken, false);
  assert.ok(g.idleT < 0.5, "the cycle starts over");
  run(g, 3);
  g.actions = { run: true };
  g.step(1 / 60);
  assert.equal(g.idleT, 0);
  assert.equal(heroJoints(g.heroPose()).far, null);
});

test("no idling with staff, paper or the pig nearby, and none survives a respawn", () => {
  const g = idleGame();
  g.enemies = [{ ...g.courses[0].enemies[0], x: g.player.x + 100, y: 150, w: 16, h: 42, alive: true, awake: true, state: "walk", kind: "soot", role: "hotel", freeze: 99, vx: 0, vy: 0, home: g.player.x + 100 }];
  run(g, 3);
  assert.equal(g.idleT, 0, "staffer 100 px away");
  g.enemies = [];
  g.planes = [{ x: g.player.x + 90, y: 160, ox: g.player.x + 90, oy: 160, vx: 0, life: 9, phase: 0 }];
  run(g, 3);
  assert.equal(g.idleT, 0, "paper in the air");
  const boss = bossGame();
  boss.enemies = [];
  boss.actions = {};
  boss.boss.state = "recover";
  boss.boss.timer = 99;
  assert.ok(boss.boss.active, "the pig is awake");
  run(boss, 3);
  assert.equal(boss.idleT, 0, "pig awake");
  const h = idleGame();
  run(h, 3);
  h.say("They need to get fired.", 6, false, true);
  run(h, 5.2);
  assert.ok(h.idleT < 0.5, "the harrumph fired while the caption was up");
  assert.equal(h.heroBanter, "They need to get fired.", "a spoken caption is never overwritten by the idle line");
  h.loadLevel(h.courses[0], 1, 0, true);
  assert.equal(h.idleT, 0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:game`
Expected: FAIL, `watchJoints` not exported / `idleT` undefined.

- [ ] **Step 3: Timing and poses**

`combat.ts`:
```ts
/** Idle beats: watch check, then a foot tap, then a harrumph; the cycle repeats. */
export const IDLE_WATCH_AT = 2.5;
export const WATCH_SECONDS = 2.1;
export const IDLE_TAP_AT = 5;
export const IDLE_HARRUMPH_AT = 8;
```

`rig.ts`:
```ts
/** Watch check: elbow at his side, forearm out front, wrist at chest height. */
export const WATCH_HAND = { x: 590, y: 430 };
const WATCH_POLE = { x: 300, y: 720 };
export function watchJoints(u: number): Joints {
  const up = track([[0, 0], [0.15, 1, out], [0.85, 1], [1, 0]], u);
  return {
    ...REST,
    lean: -1.5 * up,
    far: up > 0.02 ? { x: FAR_REST.x + (WATCH_HAND.x - FAR_REST.x) * up, y: FAR_REST.y + (WATCH_HAND.y - FAR_REST.y) * up } : null,
    pole: WATCH_POLE,
  };
}
/** Impatient foot: the front foot taps twice a second. */
export function tapJoints(t: number): Joints {
  return { ...REST, stride: 0.45 * Math.max(0, Math.sin(t * Math.PI * 4)) };
}
export function idleJoints(t: number, reduced: boolean): Joints | null {
  if (t >= IDLE_WATCH_AT && t < IDLE_WATCH_AT + WATCH_SECONDS) return watchJoints((t - IDLE_WATCH_AT) / WATCH_SECONDS);
  if (t >= IDLE_TAP_AT && !reduced) return tapJoints(t - IDLE_TAP_AT);
  return null;
}
```
(import the idle constants from `./combat`.)

`hero.ts`: `HeroPose` gains `/** Seconds standing idle; drives the watch check and foot tap. */ idle?: number;`. In `heroJoints`, before the final `return REST`:

```ts
const idle = p.idle ? idleJoints(p.idle, p.reduced) : null;
if (idle) return idle;
```

Wrist watch in `farArmLayer`, after the forearm segment is drawn (still in the far-arm forearm transform, so it rides the wrist):

```ts
// He always wears it; it only shows when the far arm comes out front.
const wrist = { x: ELBOW.x + (FIST.x - ELBOW.x) * 0.78, y: ELBOW.y + (FIST.y - ELBOW.y) * 0.78 };
ctx.save();
pivot(ctx, wrist, Math.atan2(FIST.y - ELBOW.y, FIST.x - ELBOW.x) - Math.PI / 2);
ctx.fillStyle = "#2a2622";
ctx.fillRect(wrist.x - 34, wrist.y - 11, 68, 22);
ctx.fillStyle = "#d9b45a";
ctx.beginPath();
ctx.arc(wrist.x + 26, wrist.y, 15, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = "#f6efd8";
ctx.beginPath();
ctx.arc(wrist.x + 26, wrist.y, 10, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
```

Tune the band position and dial side on the render in Step 6 (the dial faces outward, away from the body).

- [ ] **Step 4: Engine idle timer**

```ts
private idleT = 0;

/** Standing around with nothing to hit, he gets impatient. */
private stepIdle(dt: number) {
  const p = this.player;
  const near = (x: number) => Math.abs(x - (p.x + p.w / 2)) < 120;
  const threat =
    this.enemies.some((e) => e.alive && e.state !== "flat" && near(e.x + e.w / 2)) ||
    this.planes.some((plane) => plane.life > 0 && near(plane.x)) ||
    (this.boss?.active === true && this.boss.state !== "defeated");
  const busy =
    Object.values(this.actions).some(Boolean) ||
    !p.onGround ||
    Math.abs(p.vx) > 1 ||
    p.crouch ||
    p.freeze > 0 ||
    this.swing > 0 ||
    this.superT > 0 ||
    this.snotT > 0 ||
    this.wipe > 0 ||
    this.lecture > 0 ||
    this.hurtT > 0;
  if (busy || threat) {
    this.idleT = 0;
    return;
  }
  this.idleT += dt;
  if (this.idleT < IDLE_HARRUMPH_AT) return;
  this.idleT = 0;
  this.audio.harrumph();
  if (this.banterT <= 0 || this.banterSoft) this.say(ASIDES.anyDayNow.text, 1.6, true);
}
```

Call it in `step()` right after `if (this.mode === "play") this.controlPlayer(dt);` as `if (this.mode === "play") this.stepIdle(dt); else this.idleT = 0;`. Reset `this.idleT = 0;` in `loadLevel` next to `this.banterSpoken = false;`. `heroPose()` gains `idle: this.idleT,`. Probe: `idle: { get: () => this.idleT },` and `idle: number;` in the `__kiln` type. Boss check: `bossGame()` activates the pig on `stepBoss`; confirm `boss.boss.active === true` in the test before asserting (add `assert.ok(boss.boss.active)`).

- [ ] **Step 5: Run the tests**

Run: `npm run test:game`
Expected: PASS (41). If the foot-tap assertion is flaky on the exact frame, it already falls back to sampling `idle: 5.125` (sin peak).

- [ ] **Step 6: Render and look** (Task 6 board cells "Watch check" `idle: 3.5`, "Foot tap" `idle: 5.125`): the forearm reads as raised in front of the chest below the chin, the watch dial is visible, the face is untouched; the tap visibly lifts a foot. If `stride` alone reads as a weight shift instead of a tap, raise the amplitude to 0.7 and re-render; report the result.

- [ ] **Step 7: Commit** `src/game/combat.ts src/game/rig.ts src/game/hero.ts src/game/engine.ts scripts/gameplay.check.mjs` — "Add idle impatience: watch check, foot tap and a harrumph".

---

### Task 5: Quest plumbing types

**Files:**
- Create: `src/game/quests/quest.ts`

**Interfaces:**
- Produces (for phase 1): `QuestId`, `QuestInput`, `QuestHud`, `QuestResult`, `QuestContext`, `Quest`, exactly as spec section 4.

- [ ] **Step 1: Create the file**

```ts
import type { AudioBus } from "../audio";
import type { TouchAction } from "../engine";
import type { HeroPose } from "../hero";

/** Side quests are self-contained modules; the engine hosts them through this interface. */
export type QuestId = "hungry" | "fares";
export type QuestInput = {
  /** Sampled every frame. */
  held: Record<TouchAction, boolean>;
  /** Edges, consumed per step. */
  pressed: Record<TouchAction, boolean>;
};
export type QuestHud = {
  /** "HUNGRY HUNGRY HAMMER" */
  title: string;
  /** "Round 1 · The Banquet" */
  subtitle: string;
  score: number;
  /** Seconds left, or null. */
  timer: number | null;
  meter: { label: string; value: number; max: number; text?: string } | null;
  hint: string;
};
export type QuestResult = {
  /** Added to the run score. */
  score: number;
  /** Coke Zero toward the next life. */
  coins: number;
  /** Smash charge to add (clamped to 10). */
  charge: number;
  /** Buc-ee's boost on return. */
  star: boolean;
  /** Hot snot (form 2) on return. */
  hot: boolean;
  /** 1UPs earned. */
  lives: number;
  /** Patience back to 3. */
  fullBelly: boolean;
  /** "COMPED" */
  grade: string;
  /** Tally screen bullet list. */
  lines: string[];
};
export type QuestContext = {
  audio: AudioBus;
  /** The engine's loaded art by key. */
  images: Record<string, HTMLImageElement>;
  drawHero: (ctx: CanvasRenderingContext2D, pose: HeroPose, cam?: number) => void;
  /** Seeded; tests pass a fixed one. */
  rng: () => number;
  /** Thought bubble on Hammer. */
  say: (text: string, seconds: number) => void;
  comic: (x: number, y: number, text: string, big: boolean) => void;
  /** prefers-reduced-motion */
  reduced: boolean;
};
export interface Quest {
  readonly id: QuestId;
  enter(ctx: QuestContext, options: { table?: string; practice: boolean }): void;
  /** Called with STEP = 1/60. */
  step(dt: number, input: QuestInput): void;
  /** Draws in VIEW_W x VIEW_H space. */
  render(ctx: CanvasRenderingContext2D, clock: number): void;
  hud(): QuestHud;
  /** Null while running. */
  result(): QuestResult | null;
  exit(): void;
}
```

- [ ] **Step 2: Verify it compiles and nothing imports it yet**

Run: `npx tsc --noEmit` and `npx eslint src/game`
Expected: clean. `rg "quests/quest" src` returns nothing outside the file (compiled but unused).

- [ ] **Step 3: Commit** `src/game/quests/quest.ts` — "Add the side-quest interface types for phase 1".

---

### Task 6: Renders, browser checks, README, full verification

**Files:**
- Modify: `scripts/game-browser-check.mjs`, `README.md`

- [ ] **Step 1: Pose board** — in the `--poses` branch, lay out cells of 300×520 in rows of six (canvas `1800 × 520·rows`, viewport to match). Row 1: the existing six. Row 2: "Watch check" `{ idle: 3.5 }`, "Foot tap" `{ idle: 5.125 }`, "Slam load" `{ mega: SUPER_SECONDS * (1 - 0.42) }`, "Slam" `{ mega: SUPER_SECONDS * (1 - 0.6) }`, "Slam hold" `{ mega: SUPER_SECONDS * (1 - 0.74) }`, "Facing left slam" `{ mega: ..., facing: -1 }` (translate by +cell width so it stays in its cell). Row 3: the slam sequence at u = 0.46, 0.5, 0.54, 0.58, 0.68, 0.86. Draw a floor line at each cell's foot (`#5a6b7c`, 2 px) so contact is visible. Row 4: thought bubbles via `drawThought` (import `/src/game/thought.ts` and `heroFace` from `/src/game/hero.ts`) drawn at hero scale in VIEW space onto a 384×216 offscreen canvas per cell (scaled ×4.5): "Normal" ("Are you going to finish that?"), "Long line" (the Business Select line), "Top edge" (`foot: 56`), "Left edge" (`x: 4`, facing 1), "Right edge facing left" (`x: 380`, facing -1), "Mid-jump" (`foot: 130`, "HAMMER TIME."). Take `SUPER_SECONDS` from a dynamic import of `/src/game/combat.ts`.

- [ ] **Step 2: Live captures** (after the existing pause check, before the viewport loop): release keys, wait until `__kiln.idle > 2.9`, screenshot `artifacts/game-idle-watch.png`, assert `__kiln.idle > 2.5`. If `window.__kilnDev` exists: `__kilnDev.charge(10)`, press `q`, wait 380 ms, screenshot `artifacts/game-slam.png`. Record `idle: true, slam: <bool>` in the JSON verdict.

- [ ] **Step 3: Start the dev server and run the browser checks**

```powershell
$env:PATH = "$PWD\node_modules\.bin;$env:PATH"
node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort   # background
$env:BROWSER_SMOKE_CHANNEL='chrome'
node scripts/game-browser-check.mjs http://127.0.0.1:8090/ --poses
node scripts/surroundings.check.mjs http://127.0.0.1:8090/
node scripts/start-screen.check.mjs http://127.0.0.1:8090/
node scripts/pig-boss.check.mjs http://127.0.0.1:8090/
node scripts/voice-browser.check.mjs http://127.0.0.1:8090/
node scripts/browser-smoke.mjs http://127.0.0.1:8090/ artifacts/game-dev.png
```
Expected: every script prints PASS. Open `artifacts/character-poses.png`, `game-idle-watch.png`, `game-slam.png` and look at them; fix anything that reads wrong (face covered, foot lifted off the floor in the slam, waist gap, cloud over the face, unreadable text) and re-run.

- [ ] **Step 4: Production build and preview check**

```powershell
node scripts/with-app-env.mjs vite build
node scripts/with-app-env.mjs vite preview --host 127.0.0.1 --port 8091 --strictPort   # background
node scripts/game-browser-check.mjs http://127.0.0.1:8091/
node scripts/browser-smoke.mjs http://127.0.0.1:8091/ artifacts/game-prod.png
```
Expected: build succeeds; both PASS (slam capture skipped, no `__kilnDev` in production).

- [ ] **Step 5: README** — "Hammer's moves": add **Super smash** squat sentence (hips sink and sit back, knees bend, feet stay planted, mallet head on the floor, shockwave from the mallet), new **Impatience** bullet (watch check at 2.5 s, foot tap at 5 s, harrumph and "Any day now." at 8 s, cancelled by any input or by staff, paper or the pig nearby). "Character and audio": a paragraph saying the six recordings are the only spoken lines and are captioned only when they actually play; every other Hammer line is a thought bubble above and behind his head, never over his face; `lines.ts` is the single table. "Validation": update the check count (33 → 41) and list the new coverage (line table, caption switch, student greetings, thought placement, squat feet and mallet contact, idle timing and cancel rules, watch arm clearance and collar).

- [ ] **Step 6: Full definition of done (spec section 12)**

```powershell
npx tsc --noEmit
npx eslint src/game src/components scripts
npm run test:game
```
Expected: all clean, 41/41, test 1 untouched (`git diff ff02ee9 -- scripts/gameplay.check.mjs` shows no change inside test 1). `git status --short` still shows `package-lock.json` and `src/routeTree.gen.ts` as the owner left them (compare `git hash-object` with the values recorded at the start).

- [ ] **Step 7: Commit** `scripts/game-browser-check.mjs README.md` — "Render the new poses and thoughts in the browser checks; document phase 0".

- [ ] **Step 8: Report and stop** — what was built, what was verified and how, what still looks off, the choices made where the spec gave no number (tap amplitude and rate, watch window 2.1 s, 8 s cycle reset, squat 180/110 and lean 45, cloud font and wrap width, watch art, snot and wipe added to the face sweep, captions added to swat and pig clips), with `artifacts/character-poses.png`, `game-idle-watch.png` and `game-slam.png` sent to the owner. Wait for the go-ahead before phase 1.
