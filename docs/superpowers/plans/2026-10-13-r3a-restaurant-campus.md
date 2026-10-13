# R3a The Restaurant and the Campus, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The shift runs lobby to restaurant to campus: clock out of a venue, the tally, the next venue's card, with score, lives, cans, charge, pips and the pepper carried; the restaurant (1-2) and the campus (1-3) built as the owner approved them, with their hazards (flat-tops, the walk-in freezer, the swinging door, the truck well, the tray conveyor); four new people (the line cook, the busser, the lunch worker, the professor) fighting the lobby's known ways; the owner's new paintings cut and placed (the people, the cook's hat, the walls and the standing pieces); plus R2b-2's cheap deferred minors.

**Architecture:** The Game (`src/sim/game.ts`) grows a shift: `Levels.venues` lists the venues after the lobby, `game.venue` indexes them, and the tally's end loads the next venue's card instead of the clear (`nextVenue`). Venue hazards are plain level data stepped by the world (`src/sim/hazards.ts`: heat zones and swinging doors). Each cast member gets a `job` (who they are: cook, busser, lunch worker, professor or a lobby role) beside the `role` that picks their behavior, so the new people reuse `cast-behavior.ts` with their own lines, props, spills and missiles. The renderer builds a level's views on demand and holds the sim while a venue loads (`prepare` in `look.ts`); new floors, platforms and furniture are drawn by per-venue files (`venue-restaurant.ts`, `venue-campus.ts`); the far plane lays a venue's painted walls side by side and the mid and fore planes place its painted pieces (`backdrop.ts`), all cut at sync (`art-cut.mjs` `sheetPieces`, wall cut files).

**Tech Stack:** TypeScript, PixiJS 8, sharp, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-13-r3-the-run-design.md` (§2 the shift, §3 the venues and the level format, §4 the new cast, §6.1, §6.2 and §6.4 the art, §8's R3a and checks) over `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§5.3 the planes, §8, §9, §15) and the lobby cast's rules in `docs/superpowers/specs/2026-10-12-r2b-lobby-cast-design.md` (§3, §4, §8). The approved maps: `docs/superpowers/specs/2026-10-13-r3-maps/`. Handoff: `docs/superpowers/handoff-2026-10-13-r3.md` (the deferred minors). Art briefs: `art/outgoing/batch-2-backdrops.txt`, `art/outgoing/batch-7-r3-cast.txt`, prompts in `art/outgoing/batch-r3-codex.txt`.

## Global Constraints

- "Between venues: walking into a venue's exit starts the walk-off and the tally ... then the next venue's card." "What carries to the next venue: score, lives, cans, the smash charge, patience pips and the pepper (`hot`). He arrives with heat 0 and full snot; the Buc-ee's shield ends at the exit." (R3 §2)
- "Per venue: its own clock (420 s ...), its own punch clocks, its own seeded pickups and crates. A lost life returns him to the last punch clock passed in the venue he is in." (R3 §2)
- "The R2b rules hold in every venue: two attackers at most, the double-take, knocked out and walking off, the chain, puddles trip staff and never Hammer, points (R2b §3.3), Hammer's recordings and comebacks." (R3 §4.5)
- The face rule: nothing of the cast, their props, projectiles, doors, fore pieces or effects is ever drawn over Hammer's face box; the cast and their props draw behind him; words and bubbles go through the face-safe layout; fore pieces fade to 20 percent while his head is behind one (main spec §5.3, R2b §8).
- "Hammer: head scale 0.26 ... every cast member's head is 0.22 of their height." (handoff) The stand-ins are placeholders: never polish them; nothing the owner sees in a play-test is a stand-in (R3 §1).
- "The six recordings in `public/voice/*` plus `public/absolute-bullshit.mp3` are the only spoken lines; the cast's lines are written, never new recordings." (handoff)
- "Pixi objects cannot be constructed under `node:test`": node tests touch pure functions and the cut pipeline only; drawing is verified on boards and in the browser.
- The owner's files under `art/incoming/` and `art/reference/`, `public/voice/*` and `public/absolute-bullshit.mp3` are never modified; `npm run art:sync` records each new one in `art/manifest.json`, committed with it. Run `npm run art:sync` after every change to `art/cuts/*` or `scripts/art-cut.mjs`; `public/art/` is git-ignored.
- Owner rules: never stage `package-lock.json` or `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` stays `dceedffd…`, checked after every edit to `src/routes/index.tsx`); write the message to `.git/CLAUDE_MSG` with the Write tool and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, named paths only, ending with the session's attribution line; push `claude/hammer-pass` after each commit; dev server on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort`, `node_modules\.bin` on PATH), preview on 8091 (restart it after every rebuild); browser checks with `BROWSER_SMOKE_CHANNEL=chrome`.
- Many source files use CRLF line endings: exact-string edit scripts normalize them. Bash heredocs containing apostrophes break in this harness: write files with the Write tool.

## Review Focus

1. **Things in flight or on the floor when he clocks out** (a plane, coffee, a pan, snot, a puddle, a rolling cart, a swinging door mid-bang, the shield): none of it follows him into the next venue; the next venue's cast, carts, missiles, puddles and doors start fresh. Pinned in Task 2.
2. **A lost life in a later venue**, including one whose punch clock shares an id with a clock already punched in the lobby: he comes back at that venue's last punch clock (or its start), never the lobby's, with that venue's pickups as the run laid them out. Pinned in Task 2.
3. **A shift started at a later venue** (the `&venue=` link, later the start screen) that ends in "Hammer down" or "Shift over": "Try again" and "Play again" start where that shift began, with three lives. Pinned in Task 2.
4. **The art arriving piecemeal**: a painting without its cut, a cut whose painting is missing, a bad cut, two of a venue's three walls cut: the sync warns and goes on (dev and build chain on it), and the game falls back per item (the stand-in for a person, the inked photo for a venue's walls), never a broken row of walls or a crashed sync. Pinned in Task 1 (the tolerant sync) and Task 10 (`wallsFor`).
5. **Hazards meeting the cast and each other**: a staffer on a flat-top or in the freezer (nothing: heat zones are his alone), a cart rolling into the truck well (gone; its busser stands idle), a server banging the door open while he is in grace (no pip, the door still swings), the door bonked with nobody behind it (it just swings). Pinned in Task 3 and Task 4.

## Decisions taken for the owner (report these)

1. One best score for the whole shift, kept where the lobby's best was (`hammer-time-best-next`).
2. The next venue loads while the last one's tally counts; if it is not ready, its card stays up a moment longer (the game holds; nothing moves).
3. Heat zones touch only Hammer: staff walk the flat-tops and the freezer unharmed. The flat-top's 20 a second and the freezer's 30 come on top of what he is doing, so standing still on a flat-top nets 17 a second (he cools 3 a second at rest).
4. The swinging door bangs only for its kitchen server's rush; anyone else walking through it swings it softly with no harm. The warning is her own wind-up (the ! burst, 0.45 s) and her run to the door.
5. The steel counters on the line break at the walk-in freezer's door (9000 to 9500), so the freezer stands open on the floor route; from the counters it is a running jump across, or a drop into the cold. Under the campus deck the table and the bench are 110 high (not 160), so nothing under the deck reaches it (the lobby's rule for its balcony).
6. A cart that falls into a pit is gone; its busser stands idle after.
7. The repeats' colors: a plum vest for the host, the lobby's burgundy for the kitchen server, a black jacket for the second cook, a maroon tee for the dock's busser, a red polo for the second lunch worker, grey tweed for the second professor, a pale green shirt for the commons' office worker, the lobby's mustard and teal for two students, purple and rust for two more.
8. A venue whose walls are not all cut draws its inked venue photo (the restaurant's and the campus's photos exist), never a partial row.
9. Cast members walking on stairs: their footing check allows a 60 px step, so the professor patrols the library stairs (a 120 px drop still turns them).
10. The scripted test clears the restaurant by its floor route; the counter and pot-rack route is checked for reach. The campus is cleared by both routes.
11. The lunch worker's gravy and the cook's grease trip staff like the lobby's water and coffee.
12. Each new venue's painted pieces stand in the mid plane at 0.6 of their painted size and the fore pieces at full size, darkened and blurred as the main spec's fore plane is.

---

## File Structure

- `src/sim/level.ts` (modify): `LevelId`, new floor, platform and furniture kinds, `LevelPass`, `HeatZone` and `SwingDoorSpec` fields, `pitWord`, `backdrop`, `CastSpawn.load`, the new `CastPerson`s, `pitsOf`.
- `src/sim/game.ts` (modify): `Levels.venues`, `game.shift`, `game.venue`, `game.start`, `nextVenue`, `newRun(seed, start?)`, carts on their floor, doors and heat zones per level.
- `src/sim/hazards.ts` (create): `HeatZone`, `heatZoneAt`, `stepHeatZones`, `SwingDoor`, `SWING`, `createSwingDoors`, `stepSwingDoors`.
- `src/sim/world.ts`, `src/sim/types.ts`, `src/sim/events.ts` (modify): `world.swingDoors`, `world.zone`, `Stage.heat`, `Snapshot.doors`, `Target.load`/`spilled`; the `venue`, `heatZone`, `doorSwing` and `dishes` events; `castFell.line`, `castSplash.kind`, `chime.job`.
- `src/sim/targets.ts` (modify): cart loads, the dishes, carts gone down a pit.
- `src/sim/cast.ts`, `src/sim/cast-behavior.ts`, `src/sim/missiles.ts`, `src/sim/snot.ts` (modify): `CastJob`, `jobOf`, `ROLE_OF`, `roleOf`, `HATTED`, `SPILL_OF`, lines by job, the pan, grease and gravy, slope-tolerant footing.
- `src/game/lines.ts` (modify): `fall` lines, `CastJobName`, `CastLineSet`, `JOB_LINES`.
- `src/sim/levels/restaurant.ts`, `src/sim/levels/campus.ts` (create).
- `src/sim/drive.ts` (modify): the deck route's hop, slope-aware fighting.
- `src/game/audio.ts` (modify): `sizzle`, `frost`, `bang`, `page`.
- `src/render/look.ts` (modify): the shift's levels, `prepare`, holding while a venue loads, per-level punch clocks and doors, the new effects.
- `src/render/ink.ts` (create): the shared outline constants (moved out of `venue.ts`).
- `src/render/venue.ts` (modify), `src/render/venue-restaurant.ts`, `src/render/venue-campus.ts` (create): the new kinds, pits from `pitsOf`, the swinging door.
- `src/render/cast.ts`, `src/render/cast-fx.ts`, `src/render/props.ts`, `src/render/sound.ts`, `src/render/hud.ts` (modify): the new people's looks and props, carts by load, puddles, flyers, sounds, hints; culling.
- `src/render/backdrop.ts` (modify): walls, mid and fore pieces, `wallsFor`, `layWalls`.
- `src/render/boards.ts` (modify), `scripts/look-boards.mjs` (modify): venue boards, the new people, figures destroyed.
- `src/art/registry.ts` (modify): `cast.hats`, `walls`, `pieces`.
- `scripts/art-cut.mjs`, `scripts/art-sync.mjs` (modify): `tolerant`, hats by name, `wallCrop`, `sheetPieces`, walls and pieces, the venue photos.
- `art/cuts/cast-cook-1.json`, `cast-busser-1.json`, `cast-lunch-1.json`, `cast-prof-1.json`, `art/cuts/wall-<name>.json` (create); recolor masks added to the existing cast cuts.
- `src/components/next-game.tsx`, `src/components/next-veil.tsx`, `src/routes/index.tsx` (modify): the `venue` link, the venue cards' lines, "Shift over".
- Tests: `scripts/venues.check.mjs` (create, added to `test:next`), `scripts/lobby.check.mjs`, `scripts/cast.check.mjs`, `scripts/art.check.mjs`, `scripts/render.check.mjs` (modify); `scripts/shift-browser.check.mjs` (create); `scripts/run-browser.check.mjs`, `scripts/next-browser.check.mjs` (modify).
- Docs: `README.md`, the R3 design (as built), `art/ART-REQUEST.md`, `docs/superpowers/handoff-<date>-r3b.md`.

Test helpers already at the top of `scripts/cast.check.mjs`: `NONE`, `input`, `flat`, `levelWith`, `worldWith`, `steps`, `press`, `until`, `of`, `npc`. In `scripts/lobby.check.mjs`: `mini`, `stashOf`, `play`, `stepsG`, `until` (Game form), `knockOut`, `input`, `STEP`.

---

### Task 1: R2b-2's cheap deferred minors

**Files:**
- Modify: `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `src/render/look.ts`, `src/render/cast.ts`, `src/render/boards.ts`, `scripts/look-boards.mjs`, `src/game/lines.ts`, `src/sim/cast-behavior.ts`, `src/sim/events.ts`, `scripts/next-browser.check.mjs`
- Test: `scripts/art.check.mjs`, `scripts/cast.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces: `tolerant(label: string, strict: boolean, fn: () => Promise<T>): Promise<T | null>` in `scripts/art-cut.mjs`; `onScreen(x: number, y: number, view: Rect, pad?: number): boolean` and `CULL_PAD` (600) in `src/render/cast.ts`; `Cast.sync(..., view?: Rect)`; `CAST_LINES.<role>.fall` (the office's `shaft` renamed `fall`); `castFell` gains `line: string`.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/art.check.mjs` (add `tolerant` to its import from `./art-cut.mjs`):

```js
test("one bad item in a tolerant sync is a warning and a fallback; a strict sync stops on it", async () => {
  const warn = console.warn;
  const said = [];
  console.warn = (m) => said.push(String(m));
  try {
    assert.equal(await tolerant("cast x", false, async () => { throw new Error("bad cut"); }), null);
    assert.ok(said.some((m) => m.includes("cast x") && m.includes("bad cut")), said.join(" | "));
    assert.equal(await tolerant("cast y", false, async () => 7), 7);
  } finally {
    console.warn = warn;
  }
  await assert.rejects(tolerant("cast z", true, async () => { throw new Error("bad cut"); }), /bad cut/);
});
```

Append to `scripts/cast.check.mjs` (import `CAST_LINES` from `../src/game/lines.ts`):

```js
test("whoever falls down a pit says their own line on the way down", () => {
  const pit = flat({ floor: [{ x0: -2000, x1: 1000, y0: 0, y1: 0 }, { x0: 1400, x1: 20000, y0: 0, y1: 0 }], bounds: { x: -2000, y: -3000, w: 22000, h: 3600 } });
  for (const [person, line] of [["bellhop-1", CAST_LINES.bellhop.fall], ["server-1", CAST_LINES.server.fall], ["office-1", CAST_LINES.office.fall], ["student-1", CAST_LINES.student.fall]]) {
    const w = worldWith([{ id: "p", person, x: 1200, y: 0 }], { x: -1500, y: 0 }, {}, [], pit);
    const fell = of(until(w, (x) => !npc(x, "p").alive, 3), "castFell");
    assert.equal(fell.length, 1, person);
    assert.equal(fell[0].line, line, person);
  }
  assert.equal(new Set([CAST_LINES.bellhop.fall, CAST_LINES.server.fall, CAST_LINES.office.fall, CAST_LINES.student.fall]).size, 4, "four different lines");
});
```

Append to `scripts/render.check.mjs` (import `onScreen` from `../src/render/cast.ts`):

```js
test("the cast is drawn only near the view: inside it or within the pad, never far off it", () => {
  const view = { x: 1000, y: -1000, w: 2000, h: 1100 };
  assert.ok(onScreen(1500, 0, view));
  assert.ok(onScreen(400, 0, view), "within the pad to the left");
  assert.ok(onScreen(3500, 0, view), "within the pad to the right");
  assert.ok(!onScreen(-200, 0, view), "far left");
  assert.ok(!onScreen(4200, 0, view), "far right");
  assert.ok(!onScreen(1500, 900, view), "far below");
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs scripts/cast.check.mjs scripts/render.check.mjs` (`tolerant` and `onScreen` are not exported; `CAST_LINES.bellhop.fall` is undefined; `castFell` has no `line`).

- [ ] **Step 3: Implement**

`scripts/art-cut.mjs`, after `ALIGN_MIN`'s block:

```js
/**
 * One item of the sync. Strict (npm run art:sync), a failure stops the sync; otherwise it is a warning and null, so one
 * bad cut leaves that item on its fallback and the rest of the art, and `dev` and `build`, going.
 */
export async function tolerant(label, strict, fn) {
  try {
    return await fn();
  } catch (err) {
    if (strict) throw err;
    console.warn(`art sync: ${label} skipped, it falls back (${err.message})`);
    return null;
  }
}
```

`scripts/art-sync.mjs`: import `tolerant`; in `cast()`, the body of `for (const person of CAST_PERSONS)` after the two `continue` checks becomes `await tolerant(\`cast ${person}\`, strict, async () => { ...the cuts read, castRig, writes and overlay as they are... });`.

`src/game/lines.ts`, in `CAST_LINES`: `bellhop` gains `fall: "Luggaaage!"`, `server` gains `fall: "Order uuup!"`, `student` gains `fall: "Ratiooo"`, and the office's `shaft: "Per my last emaaaail"` becomes `fall: "Per my last emaaaail"`.

`src/sim/events.ts`: `castFell` becomes `{ type: "castFell"; id: number; x: number; y: number; points: number; line: string }`.

`src/sim/cast-behavior.ts`, in `physics`: the push becomes `events.push({ type: "castFell", id: n.id, x: n.x, y: n.y, points: POINTS.shaft, line: CAST_LINES[n.role].fall });`.

`src/render/look.ts`, the `castFell` case: `speech.say(e.id, e.line, 1.2);` (in place of `CAST_LINES.office.shaft`).

`src/render/cast.ts`:

```ts
/** How far past the view a cast member is still drawn: a figure walking in is already posed. */
export const CULL_PAD = 600;
/** Inside the view or within the pad of it: anyone farther is not posed or drawn this frame. */
export const onScreen = (x: number, y: number, view: Rect, pad = CULL_PAD): boolean =>
  x >= view.x - pad && x <= view.x + view.w + pad && y >= view.y - pad && y <= view.y + view.h + pad;
```

(import `type Rect` from `../sim/types`). `sync` gains a last parameter `view: Rect | null = null`; right after the view `v` is found or made, before the pose: `const seenNow = !view || onScreen(n.x, n.y - n.h / 2, view); v.root.visible = seenNow; if (!seenNow) continue;` (the member still counts in `seen`, so their view is kept). In `look.ts` pass `scene.view()` as the new argument.

`src/render/look.ts`: `await cast.preload(...)` runs only `if (!opts.nocast)`.

`src/render/boards.ts`: in `castSheet` and `castHeads`, push every `new PaintedFigure(art)` into a `const figs: PaintedFigure[] = []`, and after `const png = await snapshot(board, width, height);` run `for (const f of figs) f.destroy();` then `return png;`.

`scripts/look-boards.mjs`: before the first cast board read `const live0 = await page.evaluate(() => window.__next?.castArt?.live ?? 0)`; after the last cast board, `const live1 = ...` the same, and throw `new Error(\`board figures left alive: ${live1 - live0}\`)` when they differ.

`scripts/next-browser.check.mjs` (it runs with `&nocast=1`): after boot, `assert.deepEqual(await page.evaluate(() => window.__next.castArt.painted), [], "nocast loads no cast paintings");`.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`.

- [ ] **Step 5: See it.** With the 8090 dev server: `node scripts/next-browser.check.mjs http://127.0.0.1:8090/`, `node scripts/cast-browser.check.mjs http://127.0.0.1:8090/` and `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-heads` pass (`BROWSER_SMOKE_CHANNEL=chrome`).

- [ ] **Step 6: Commit** `scripts/art-cut.mjs scripts/art-sync.mjs scripts/art.check.mjs scripts/cast.check.mjs scripts/render.check.mjs scripts/look-boards.mjs scripts/next-browser.check.mjs src/game/lines.ts src/sim src/render`: "Fix R2b-2's cheap minors: a tolerant sync, no cast paintings under nocast, culling, board figures freed, a fall line for everyone". Push.

---

### Task 2: The shift

**Files:**
- Modify: `src/sim/level.ts`, `src/sim/game.ts`, `src/sim/events.ts`, `src/render/look.ts`, `src/render/boards.ts`, `src/components/next-game.tsx`, `src/components/next-veil.tsx`, `src/routes/index.tsx`
- Test: `scripts/lobby.check.mjs`

**Interfaces:**
- Produces: `LevelId = "lobby" | "stash" | "restaurant" | "campus"` (`Level.id: LevelId`); `Levels = { lobby: Level; stash: Level; venues?: Level[] }`; `Game.shift: Level[]`, `Game.venue: number`, `Game.start: number`, `Game.newRun(seed: number, start?: number)`; `createGame(levels, seed, opts: { cast?: boolean; start?: number })`; the event `{ type: "venue"; id: LevelId }`; `startLook(render, { ..., start?: LevelId })`; `NextGame`'s `start?: "restaurant" | "campus"`; `VeilInfo.first: boolean`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/lobby.check.mjs`; import `SINUS_MAX` from `../src/sim/moves.ts` and add `VENUE_SEED` to the import from `../src/sim/game.ts`)

```js
/** A venue after the lobby: mini's shape, its own exit, the same punch clock id as the lobby's ("k1"). */
const venueOf = (id) => ({ ...mini(), id, name: id, world: id === "restaurant" ? "1-2" : "1-3", doors: [{ id: `${id}-out`, kind: "exit", x: 5900, y: 0, label: "OUT" }], carts: [] });
const shiftOf = () => ({ lobby: { ...mini(), doors: [{ id: "out", kind: "exit", x: 5900, y: 0, label: "CLOCK OUT" }] }, stash: stashOf(), venues: [venueOf("restaurant"), venueOf("campus")] });
/** Walks him out of the venue he is in and through the tally; returns every event on the way. */
const walkOut = (g) => {
  g.world.hero.x = 5700;
  const evs = until(g, (x) => x.mode === "walkoff", 3, { right: true });
  return [...evs, ...until(g, (x) => x.mode !== "walkoff" && x.mode !== "tally", 12)];
};

test("clocking out tallies, then the next venue's card: what he carries comes along, he arrives cool, snot full, shield spent", () => {
  const g = createGame(shiftOf(), 7);
  play(g);
  Object.assign(g.world.hero, { charge: 8, patience: 3, hot: true, heat: 70, sinus: 1 });
  Object.assign(g.run, { cans: 12, lives: 4, star: 5 });
  const evs = walkOut(g);
  assert.ok(evs.some((e) => e.type === "venue" && e.id === "restaurant"));
  assert.deepEqual([g.mode, g.level.id, g.venue], ["card", "restaurant", 1]);
  const h = g.world.hero;
  assert.deepEqual([h.charge, h.patience, h.hot, h.heat, h.sinus, g.run.cans, g.run.lives, g.run.star, h.invuln], [8, 3, true, 0, SINUS_MAX, 12, 4, 0, 0]);
  assert.ok(g.run.score > 0, "the tally paid");
  assert.ok(Math.abs(g.run.time - 420) < 1e-9, "the restaurant's own full clock");
  assert.ok(Math.abs(h.x - g.level.spawn.x) < 1, "at the restaurant's start");
});

test("nothing in the air or on the floor follows him into the next venue", () => {
  const g = createGame(shiftOf(), 7);
  play(g);
  g.world.missiles.push({ id: 1, kind: "plane", x: 5000, y: -2500, vx: 0, vy: 0, spin: 0, life: 9, phase: 0, from: 0 });
  g.world.puddles.push({ x: 5800, y: 0, w: 100, life: 9, max: 9, kind: "water" });
  g.world.snot.push({ id: 1, x: 5000, y: -2500, vx: 0, vy: 0, life: 9, hot: false, pierce: 0, hit: [] });
  walkOut(g);
  assert.equal(g.level.id, "restaurant");
  assert.deepEqual([g.world.missiles.length, g.world.puddles.length, g.world.snot.length, g.world.targets.length], [0, 0, 0, 0]);
});

test("a lost life in a later venue brings him back at that venue's last punch clock, never the lobby's", () => {
  const g = createGame(shiftOf(), 7);
  play(g);
  g.world.hero.x = 3050;
  stepsG(g, 0.1);
  assert.deepEqual(g.run.punched, ["k1"], "the lobby's clock");
  walkOut(g);
  play(g);
  assert.deepEqual(g.run.punched, [], "the restaurant's clocks start fresh, the same id or not");
  knockOut(g);
  until(g, (x) => x.mode === "card");
  play(g);
  assert.equal(g.level.id, "restaurant");
  assert.ok(Math.abs(g.world.hero.x - g.level.spawn.x) < 1, "no clock punched here yet: back at the restaurant's start");
  g.world.hero.x = 3050;
  stepsG(g, 0.1);
  assert.deepEqual(g.run.punched, ["k1"]);
  const layout = JSON.stringify(g.pickups.map((p) => [p.kind, p.x, p.y]));
  knockOut(g);
  until(g, (x) => x.mode === "card");
  play(g);
  assert.ok(g.level.id === "restaurant" && Math.abs(g.world.hero.x - 3000) < 1, `at the restaurant's clock: ${g.level.id} ${g.world.hero.x}`);
  assert.equal(JSON.stringify(g.pickups.map((p) => [p.kind, p.x, p.y])), layout, "the restaurant as the run laid it out");
});

test("each venue lays its pickups out by its own seed; the lobby keeps the run's", () => {
  const layout = (list) => JSON.stringify(list.map((p) => [p.kind, p.x, p.y]));
  const a = createGame(shiftOf(), 7);
  assert.equal(layout(a.pickups), layout(seedRewards(a.level, 7)), "the lobby as before");
  play(a);
  walkOut(a);
  assert.equal(layout(a.pickups), layout(seedRewards(a.level, 7 + VENUE_SEED)), "the restaurant by its own seed");
  assert.notEqual(layout(a.pickups), layout(seedRewards(a.level, 7)));
});

test("the last venue's tally ends the shift; a shift started at a later venue starts there again", () => {
  const g = createGame(shiftOf(), 7, { start: 2 });
  assert.deepEqual([g.level.id, g.venue, g.start], ["campus", 2, 2]);
  play(g);
  const evs = walkOut(g);
  assert.ok(evs.some((e) => e.type === "clear"));
  assert.equal(g.mode, "clear");
  g.newRun(9);
  assert.equal(g.level.id, "campus", "play again starts where the shift began");
  play(g);
  g.run.lives = 1;
  knockOut(g);
  until(g, (x) => x.mode === "over");
  assert.equal(g.mode, "over");
  g.newRun(10);
  assert.deepEqual([g.level.id, g.run.lives, g.run.score], ["campus", 3, 0]);
  assert.equal(createGame(shiftOf(), 7, { start: 9 }).level.id, "campus", "a start past the end is the last venue");
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/lobby.check.mjs` (no `venues`, no `venue` event, no `start`).

- [ ] **Step 3: Implement**

`src/sim/level.ts`: `export type LevelId = "lobby" | "stash" | "restaurant" | "campus";` and `Level`'s `id: LevelId`.

`src/sim/events.ts`: import `type LevelId`; add `/** The shift moved on: the next venue's card is up. */ | { type: "venue"; id: LevelId }`.

`src/sim/game.ts`:
- `export type Levels = { lobby: Level; stash: Level; /** The venues after the lobby, in the shift's order. */ venues?: Level[] };`
- `Game` gains `/** The shift's venues in order: the lobby first. */ shift: Level[]; /** The venue he is in, an index into the shift. */ venue: number; /** Where this shift began: "Try again" and "Play again" start there. */ start: number;` and `newRun(seed: number, start?: number): void`.
- In `createGame` (opts `{ cast?: boolean; start?: number }`):
  ```ts
  const shift = [levels.lobby, ...(levels.venues ?? [])];
  const clampStart = (s: number | undefined) => Math.min(shift.length - 1, Math.max(0, Math.floor(s ?? 0)));
  ```
  `game.shift = shift`, `game.start = game.venue = clampStart(opts.start)`, `level: shift[game.venue]`; `createWorld(stageOf(shift[game.venue]), shift[game.venue].spawn, ...)`.
- An exported constant: `/** Each venue after the lobby seeds its pickups this far from the run's seed, so venues differ and the lobby stays as it was. */ export const VENUE_SEED = 104729;`
- `begin` becomes `function begin(carry: HeroOptions, ev: GameEvent[])` (import `type HeroOptions` from `./hero`) and reads `const level = shift[game.venue];` in place of `levels.lobby`: `game.pickups = seedRewards(level, game.run.seed + game.venue * VENUE_SEED)`, the checkpoint from `level.checkpoints`, `Object.assign(world.hero, createHero(at, carry))`, `world.targets = level.carts.map((x, i) => createCart(i + 1, x))`, `createCast(level, world.targets)`, `game.run.time = level.time`.
- `loseLife`: `begin({ charge: world.hero.charge, patience: RUN.patience }, ev);`. The first call and `newRun`: `begin({ charge: 0, patience: RUN.patience }, ...)`.
- `newRun(s, start = game.start)`: `game.start = game.venue = clampStart(start);` then as before.
- The stash's save remembers the level he left: `lobbySave` gains `level: Level`, set to `game.level` on the way in, and the return is `enter(save.level, { x: save.door.x, y: save.door.y })`.
- The checkpoints: `if (!lethal) for (const k of game.level.checkpoints)` (the `game.level.id === "lobby"` test goes; the stash has none).
- The tally's end:
  ```ts
  if (game.modeT <= 1e-9) {
    if (game.venue < shift.length - 1) nextVenue(ev);
    else {
      ev.push({ type: "clear" });
      setMode("clear", ev);
    }
  }
  ```
  and
  ```ts
  /** On to the shift's next venue: what he carries comes along; he arrives cool with full snot, his shield spent, its clocks unpunched. */
  function nextVenue(ev: GameEvent[]) {
    const h = world.hero;
    const carry = { charge: h.charge, patience: h.patience, hot: h.hot };
    game.venue++;
    game.run.checkpoint = null;
    game.run.punched = [];
    begin(carry, ev);
    ev.push({ type: "venue", id: game.level.id });
  }
  ```

`src/render/look.ts`:
- `const SHIFT: Level[] = [LOBBY];` (Tasks 6 and 7 add the restaurant and the campus) and `const LEVELS = new Map<LevelId, Level>([...SHIFT, STASH].map((l) => [l.id, l]));`.
- `opts` gains `start?: LevelId`; `createGame({ lobby: SHIFT[0], stash: STASH, venues: SHIFT.slice(1) }, newSeed(), { cast: !opts.nocast, start: Math.max(0, SHIFT.findIndex((l) => l.id === opts.start)) })`; the camera starts on `game.level` (bounds and spawn).
- The backdrops and venues records become one map and a loader:
  ```ts
  type Views = { venue: VenueView; backdrop: Backdrop };
  const views = new Map<LevelId, Views>();
  const loading = new Map<LevelId, Promise<void>>();
  /** A level's venue, backdrop and cast paintings, built once; the game holds while the level he is in is not ready. */
  const prepare = (level: Level): Promise<void> => {
    let p = loading.get(level.id);
    if (!p) {
      p = (async () => {
        const backdrop = await loadBackdrop(scene, level.id, level.length, registry);
        const venue = drawVenue(scene, level);
        venue.setVisible(false);
        backdrop.setVisible(false);
        if (!opts.nocast) await cast.preload((level.cast ?? []).map((s) => s.person));
        views.set(level.id, { venue, backdrop });
      })();
      loading.set(level.id, p);
    }
    return p;
  };
  ```
  Declare `prepare` after `cast` exists; `await prepare(game.level); await prepare(STASH);` before the first frame, then `void SHIFT.reduce((p, l) => p.then(() => prepare(l)), Promise.resolve());` to load the rest one after another.
- The lighting takes every level's lamps: `createLighting(scene, render.quality, [...SHIFT, STASH].flatMap(lightsOf))`.
- `tick`: first thing, `const holding = !views.has(game.level.id); if (holding) void prepare(game.level);` and `dt` is `0` while `holding` (as for the pause), so the sim takes no steps until the venue is ready.
- `showLevel(level, x, y)`: `for (const [id, v] of views) { v.venue.setVisible(id === level.id); v.backdrop.setVisible(id === level.id); }` and `views.get(level.id)?.venue.setPunched(game.run.punched);` for any level. It runs only once the level is ready: `if (game.level.id !== shown && views.has(game.level.id)) showLevel(game.level, x, y);`.
- Every `venues.lobby.…` and `venues[game.level.id].…` becomes `views.get(game.level.id)?.venue.…` (the checkpoint's `punch`, `setPunched` after a respawn, `setDoorGlow`, `update`); `stop()` destroys every view's venue.
- The board's `showForBoard(id)` loops the map the same way and reads `LEVELS.get(id)!`; `createBoards`'s `showLevel` parameter type becomes `(id: LevelId | null) => void`.

`src/routes/index.tsx`: add to `validateSearch`: `venue: venueOf(search.venue),` with
```tsx
const VENUES = ["restaurant", "campus"] as const;
type Venue = (typeof VENUES)[number];
/** `&venue=` starts the shift at a later venue (R3a's play-test link, before the start screen). */
const venueOf = (v: unknown): Venue | undefined => (VENUES as readonly unknown[]).includes(v) ? (v as Venue) : undefined;
```
and pass `start={venue}` to `NextGame`. Run `git hash-object src/routeTree.gen.ts` afterward: it must still be `dceedffd…`.

`src/components/next-game.tsx`: a `start?: "restaurant" | "campus"` prop passed to `startLook(render, { ..., start })` and added to the effect's dependencies; `const [first, setFirst] = useState(true);` set in `onMode` when `m === "card"`: `setFirst(lastMode.current === null || lastMode.current === "clear" || lastMode.current === "over");`; `info.first = first`.

`src/components/next-veil.tsx`: `VeilInfo` gains `/** The shift's first card, not one after a venue. */ first: boolean`; the card's line is `info.back ? "Back from your break" : info.first ? "Your shift starts here" : "Your shift goes on"`; the clear card's `aria-label` and title are "Shift over".

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`; `git hash-object src/routeTree.gen.ts` is `dceedffd…`.

- [ ] **Step 5: See it.** With the 8090 dev server: `run-browser.check.mjs` (its clear is now "Shift over"; update the title it reads if it reads one), `next-browser.check.mjs`, `cast-browser.check.mjs` pass. Open `http://127.0.0.1:8090/?next=1`: the lobby plays as before and its exit's card reads "Shift over".

- [ ] **Step 6: Commit** `src/sim src/render src/components src/routes/index.tsx scripts/lobby.check.mjs scripts/run-browser.check.mjs`: "Run the shift: venues in order, the tally between them, what carries, a start link". Push.

---
### Task 3: The level format and the venues' hazards

**Files:**
- Create: `src/sim/hazards.ts`, `scripts/venues.check.mjs`
- Modify: `src/sim/level.ts`, `src/sim/types.ts`, `src/sim/constants.ts`, `src/sim/world.ts`, `src/sim/events.ts`, `src/sim/targets.ts`, `src/sim/cast.ts`, `src/sim/cast-behavior.ts`, `src/sim/game.ts`, `src/render/hud.ts`, `src/render/sound.ts`, `src/game/audio.ts`, `package.json` (`test:next` gains `scripts/venues.check.mjs`)
- Test: `scripts/venues.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Consumes: `Game.venue`, `begin` (Task 2).
- Produces:
  - `src/sim/level.ts`: `PlatformKind` adds `"booth" | "host" | "pass" | "steel" | "flattop" | "rack" | "crates" | "dumpster" | "bench" | "fountain" | "tier" | "serving" | "tray" | "deck" | "ledge"`; `FloorKind` adds `"wood" | "quarry" | "concrete" | "ramp" | "truck" | "brick" | "terrazzo" | "stone" | "steps" | "belt"`; `FurnitureKind` adds `"bar" | "lamps" | "freezer" | "truck" | "fountain" | "lampPost" | "sneeze" | "slot"`; `LevelPass = Pass & { kind?: "service" | "gantry" }`; `SwingDoorSpec = { id: string; x: number; y: number; server: string }`; `BackdropSpec = { walls: string[]; mid: { name: string; x: number }[]; fore: { name: string; x: number }[] }`; `Level` gains `passes: LevelPass[]`, `heat?: HeatZone[]`, `swingDoors?: SwingDoorSpec[]`, `pitWord?: string`, `backdrop?: BackdropSpec`; `CastSpawn.load?: CartLoad`; `pitsOf(level: Pick<Level, "floor">): { x0: number; x1: number; y: number }[]`.
  - `src/sim/types.ts`: `CartLoad = "cases" | "dishes" | "trash"`; `Stage.heat?: HeatZone[]`; `Target.load: CartLoad`, `Target.spilled: boolean`; `Snapshot.doors: SwingDoor[]`.
  - `src/sim/hazards.ts`: `HeatZone = { x0, x1, y, rate, kind: "flattop" | "freezer" }`, `heatZoneAt(stage, h): HeatZone | null`, `stepHeatZones(h, stage, dt, was, events): HeatZone | null`; `SwingDoor = { id, x, y, server, t, dir, hard, chain }`, `SWING = { reach: 240, swing: 0.4, hit: 90, h: 380 }`, `createSwingDoors(specs): SwingDoor[]`, `stepSwingDoors(w: DoorWorld, dt, events): void`.
  - `World.swingDoors: SwingDoor[]`, `World.zone: HeatZone | null`, `WorldOptions.swingDoors?: SwingDoor[]`.
  - Events: `{ type: "heatZone"; kind: "flattop" | "freezer"; x; y }`, `{ type: "doorSwing"; id: string; x; y; dir: 1 | -1; hard: boolean }`, `{ type: "dishes"; x; y }`.
  - `createCart(id, x, y = 0, load: CartLoad = "cases")`; `stepTargets(targets, stage, dt, events = [])` (dishes once, carts gone down a pit removed).
  - `FALL_MARGIN` moves to `src/sim/constants.ts` (`src/sim/cast.ts` re-exports it).
  - `AudioBus.sizzle()`, `frost()`, `bang()`, `page()`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/venues.check.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { createCast, CAST } from "../src/sim/cast.ts";
import { createCart } from "../src/sim/targets.ts";
import { createSwingDoors, stepSwingDoors, SWING } from "../src/sim/hazards.ts";
import { HEAT } from "../src/sim/moves.ts";
import { pitsOf, stageOf } from "../src/sim/level.ts";
import { createGame } from "../src/sim/game.ts";
import { hintOf } from "../src/render/hud.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = (extra = {}) => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 }, ...extra });
const worldWith = (spawns, hero = { x: 100, y: 0 }, opts = {}, carts = [], stage = flat()) => {
  const targets = carts.map((x, i) => createCart(i + 1, x));
  const w = createWorld(stage, hero, { ...opts, targets });
  w.cast = createCast({ cast: spawns, carts }, targets);
  for (let i = 0; i < 6; i++) w.step(input());
  return w;
};
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const until = (w, done, seconds = 10, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(w); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const of = (evs, type) => evs.filter((e) => e.type === type);
const npc = (w, spawn) => w.cast.find((n) => n.spawn === spawn);
/** A level shaped like the lobby's tests' mini level, for the Game. */
const levelOf = (extra = {}) => ({
  id: "restaurant", name: "Mini", world: "1-2", length: 6000, spawn: { x: 200, y: 0 }, time: 420,
  floor: [{ x0: -400, x1: 6400, y0: 0, y1: 0, kind: "quarry" }], platforms: [], solids: [], passes: [],
  bounds: { x: -400, y: -1600, w: 6800, h: 2200 }, crates: [], doors: [{ id: "out", kind: "exit", x: 5900, y: 0, label: "OUT" }],
  checkpoints: [], signs: [], furniture: [], carts: [], lights: [], camera: { zones: [] }, rewards: { count: 4, bucees: 1, nuts: 1 }, routes: [], music: "day",
  ...extra,
});

test("a flat-top heats him while he stands on it and the freezer cools him; beside them or in the air, nothing", () => {
  const heat = [{ x0: 1000, x1: 1400, y: -180, rate: 20, kind: "flattop" }, { x0: 2000, x1: 2500, y: 0, rate: -30, kind: "freezer" }];
  const w = createWorld(flat({ platforms: [{ x0: 900, x1: 1500, y: -180 }], heat }), { x: 1200, y: -180 });
  const on = steps(w, 0.2);
  assert.deepEqual(of(on, "heatZone").map((e) => e.kind), ["flattop"], "one event stepping on");
  w.hero.heat = 40;
  assert.equal(of(steps(w, 1), "heatZone").length, 0, "none while he stays");
  assert.ok(Math.abs(w.hero.heat - (40 + 20 - HEAT.rest)) < 0.5, `on the flat-top: ${w.hero.heat}`);
  Object.assign(w.hero, { x: 1450, heat: 40 });
  steps(w, 1);
  assert.ok(Math.abs(w.hero.heat - (40 - HEAT.rest)) < 0.5, `beside it on the steel: ${w.hero.heat}`);
  Object.assign(w.hero, { x: 2200, y: 0, onGround: true, heat: 60 });
  const cold = steps(w, 1);
  assert.equal(of(cold, "heatZone")[0]?.kind, "freezer");
  assert.ok(Math.abs(w.hero.heat - (60 - 30 - HEAT.rest)) < 0.5, `in the freezer: ${w.hero.heat}`);
  Object.assign(w.hero, { x: 2200, y: -300, vy: 0, onGround: false, heat: 60 });
  w.step(input());
  assert.ok(Math.abs(w.hero.heat - 60) < 0.2, "in the air over it, nothing");
});

const doorsOf = () => createSwingDoors([{ id: "kitchen", x: 1200, y: 0, server: "k" }]);
const doorWorld = (heroX, spawns) => {
  const w = worldWith(spawns, { x: heroX, y: 0 });
  w.swingDoors = doorsOf();
  return w;
};
const through = (n, x, vx, act = "attack") => Object.assign(n, { x, vx, act, actT: 0 });

test("the kitchen server's rush bangs the door open her way: a pip inside its swing, none outside it or in grace", () => {
  for (const [heroX, invuln, pip] of [[1050, 0, true], [900, 0, false], [1050, 1, false]]) {
    const w = doorWorld(heroX, [{ id: "k", person: "server-1", x: 1400, y: 0 }]);
    w.hero.invuln = invuln;
    through(npc(w, "k"), 1198, -CAST.server.rush);
    const evs = [];
    stepSwingDoors(w, STEP, evs);
    const swing = of(evs, "doorSwing")[0];
    assert.ok(swing?.hard && swing.dir === -1, `${heroX}: a bang toward the dining side`);
    assert.equal(w.hits.length, heroX === 1050 ? 1 : 0, `${heroX}: inside the swing (${SWING.reach} px) only`);
    w.step(input());
    assert.equal(w.hero.patience < 3, pip, `${heroX} in grace ${invuln}`);
    assert.ok(w.swingDoors[0].t > 0, "the door still swings");
  }
});

test("anyone else through the door swings it softly, him included, and nobody is hurt", () => {
  const w = doorWorld(600, [{ id: "o", person: "office-1", x: 1400, y: 0 }, { id: "k", person: "server-1", x: 1600, y: 0 }]);
  through(npc(w, "o"), 1198, -160, "walk");
  const a = [];
  stepSwingDoors(w, STEP, a);
  assert.deepEqual(of(a, "doorSwing").map((e) => [e.hard, e.dir]), [[false, -1]]);
  w.swingDoors = doorsOf();
  through(npc(w, "k"), 1202, 200, "walk");
  const b = [];
  stepSwingDoors(w, STEP, b);
  assert.deepEqual(of(b, "doorSwing").map((e) => e.hard), [false], "her walk is not her rush");
  w.swingDoors = doorsOf();
  Object.assign(w.hero, { x: 1203, vx: 400 });
  const c = [];
  stepSwingDoors(w, STEP, c);
  assert.deepEqual(of(c, "doorSwing").map((e) => [e.hard, e.dir]), [[false, 1]]);
  assert.equal(w.hits.length, 0);
});

test("the mallet on a door at rest slams it away from him into whoever stands in its swing beyond; with nobody there it just swings", () => {
  const w = doorWorld(1080, [{ id: "k", person: "server-1", x: 1350, y: 0 }, { id: "far", person: "server-2", x: 1600, y: 0 }]);
  w.swing = [{ x: 1180, y: -150 }];
  const evs = [];
  stepSwingDoors(w, STEP, evs);
  assert.deepEqual(of(evs, "doorSwing").map((e) => [e.hard, e.dir]), [[true, 1]]);
  assert.equal(npc(w, "k").act, "fly", "in its swing: knocked flying");
  assert.notEqual(npc(w, "far").act, "fly", "past its reach: untouched");
  assert.deepEqual(of(evs, "chain").map((e) => [e.count, e.points]), [[1, 100]]);
  const empty = doorWorld(1080, []);
  empty.swing = [{ x: 1180, y: -150 }];
  const lone = [];
  stepSwingDoors(empty, STEP, lone);
  assert.deepEqual([of(lone, "doorSwing").length, of(lone, "chain").length], [1, 0]);
});

test("a cart rolling into a pit is gone, and the one who pushed it stands idle", () => {
  const pit = flat({ floor: [{ x0: -2000, x1: 1500, y0: 0, y1: 0 }, { x0: 1830, x1: 20000, y0: 0, y1: 0 }], bounds: { x: -2000, y: -3000, w: 22000, h: 3600 } });
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1000, y: 0, cart: 850 }], { x: -1500, y: 0 }, {}, [850], pit);
  Object.assign(w.targets[0], { x: 1400, vx: 900 });
  steps(w, 2);
  assert.equal(w.targets.length, 0, "down the pit and gone");
  steps(w, 1);
  const b = npc(w, "b");
  assert.ok(b.alive && b.act === "idle" && b.vx === 0, `${b.act} ${b.vx}`);
});

test("a dish cart's dishes crash once, on its first knock; a cart of cases never does", () => {
  const w = worldWith([], { x: -1500, y: 0 }, {}, [1000, 2000]);
  w.targets[0].load = "dishes";
  w.targets[0].flash = 0.06;
  w.targets[1].flash = 0.06;
  const evs = steps(w, 0.1);
  assert.deepEqual(of(evs, "dishes").length, 1);
  assert.ok(w.targets[0].spilled && !w.targets[1].spilled);
  w.targets[0].flash = 0.06;
  assert.equal(of(steps(w, 0.1), "dishes").length, 0, "once");
});

test("a belt rising to the right carries him up from its low end; on the floor in front of it he walks past", () => {
  const stage = flat({
    floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }, { x0: 1000, x1: 1900, y0: -120, y1: -520, belt: 220 }],
    platforms: [{ x0: 750, x1: 1000, y: -120 }, { x0: 1900, x1: 3000, y: -520 }],
  });
  const w = createWorld(stage, { x: 900, y: -120 });
  steps(w, 0.2);
  steps(w, 0.3, { right: true });
  steps(w, 4.5);
  assert.ok(Math.abs(w.hero.y + 520) < 2 && w.hero.x > 1900, `carried up onto the deck: ${w.hero.x}, ${w.hero.y}`);
  const floor = createWorld(stage, { x: 600, y: 0 });
  steps(floor, 0.1);
  steps(floor, 3, { right: true });
  assert.ok(floor.hero.y === 0 && floor.hero.x > 1900, `walked past under it: ${floor.hero.x}, ${floor.hero.y}`);
});

test("a patrol walks up and down a 30-degree flight; a 120 px drop still turns it", () => {
  const stairs = flat({ floor: [{ x0: -2000, x1: 1000, y0: 0, y1: 0 }, { x0: 1000, x1: 1520, y0: 0, y1: -300 }, { x0: 1520, x1: 2200, y0: -300, y1: -300 }] });
  const w = worldWith([{ id: "p", person: "office-1", x: 1250, y: -144, x0: 900, x1: 2000 }], { x: -1500, y: 0 }, {}, [], stairs);
  const ys = [];
  for (let i = 0; i < 40; i++) { steps(w, 0.25); ys.push(npc(w, "p").y); }
  assert.ok(Math.min(...ys) < -290 && Math.max(...ys) > -10, `up and down the flight: ${Math.min(...ys)} to ${Math.max(...ys)}`);
  const ledge = flat({ floor: [{ x0: -2000, x1: 1000, y0: -120, y1: -120 }, { x0: 1000, x1: 20000, y0: 0, y1: 0 }] });
  const l = worldWith([{ id: "p", person: "server-1", x: 800, y: -120, x0: 400, x1: 1400 }], { x: -1500, y: 0 }, {}, [], ledge);
  const xs = [];
  for (let i = 0; i < 30; i++) { steps(l, 0.25); xs.push(npc(l, "p").x); }
  assert.ok(Math.max(...xs) < 1000, `turned at the drop: ${Math.max(...xs)}`);
});

test("the pits are the gaps between two floors at one height that nothing else covers", () => {
  assert.deepEqual(pitsOf(LOBBY), [{ x0: 5900, x1: 6230, y: 0 }]);
  const floor = [
    { x0: 0, x1: 1000, y0: 0, y1: 0 },
    { x0: 1000, x1: 1600, y0: 0, y1: -200 },
    { x0: 1600, x1: 2000, y0: -200, y1: -200 },
    { x0: 2330, x1: 3000, y0: -200, y1: -200 },
    { x0: 3000, x1: 4000, y0: 0, y1: 0 },
  ];
  assert.deepEqual(pitsOf({ floor }), [{ x0: 2000, x1: 2330, y: -200 }]);
});

test("a cart stands on the floor under it, a raised dock included; the level's doors and heat come with it", () => {
  const level = levelOf({
    floor: [{ x0: -400, x1: 1000, y0: 0, y1: 0, kind: "quarry" }, { x0: 1000, x1: 6400, y0: -200, y1: -200, kind: "concrete" }],
    carts: [600, 3000],
    heat: [{ x0: 2000, x1: 2400, y: -200, rate: 20, kind: "flattop" }],
    swingDoors: [{ id: "kitchen", x: 800, y: 0, server: "k" }],
  });
  const g = createGame({ lobby: level, stash: STASH }, 7);
  assert.deepEqual(g.world.targets.map((t) => t.y), [0, -200]);
  assert.equal(g.world.swingDoors.length, 1);
  assert.equal(stageOf(level).heat.length, 1);
});

test("the hint names the hazard he is at: the flat-top, the freezer, the swinging door", () => {
  const level = levelOf({
    platforms: [{ x0: 1000, x1: 1400, y: -180, kind: "flattop" }],
    heat: [{ x0: 1000, x1: 1400, y: -180, rate: 20, kind: "flattop" }, { x0: 2000, x1: 2500, y: 0, rate: -30, kind: "freezer" }],
    swingDoors: [{ id: "kitchen", x: 3500, y: 0, server: "k" }],
  });
  const g = createGame({ lobby: level, stash: STASH }, 7);
  while (g.mode === "card") g.step(input());
  Object.assign(g.world.hero, { x: 1200, y: -180, onGround: true });
  assert.match(hintOf(g), /Flat-top/);
  Object.assign(g.world.hero, { x: 2200, y: 0 });
  assert.match(hintOf(g), /freezer/i);
  Object.assign(g.world.hero, { x: 3300 });
  assert.match(hintOf(g), /Swinging door/);
});
```

Append to `scripts/render.check.mjs`:

```js
test("the venues' hazards sound: a sizzle on a flat-top, frost in the freezer, a door's bang or swish, the dishes' crash", () => {
  assert.deepEqual(cuesFor({ type: "heatZone", kind: "flattop", x: 0, y: 0 }), ["sizzle"]);
  assert.deepEqual(cuesFor({ type: "heatZone", kind: "freezer", x: 0, y: 0 }), ["frost"]);
  assert.deepEqual(cuesFor({ type: "doorSwing", id: "k", x: 0, y: 0, dir: 1, hard: true }), ["bang"]);
  assert.deepEqual(cuesFor({ type: "doorSwing", id: "k", x: 0, y: 0, dir: 1, hard: false }), ["swish"]);
  assert.deepEqual(cuesFor({ type: "dishes", x: 0, y: 0 }), ["shatter", "smash"]);
});
```

`package.json`: append ` scripts/venues.check.mjs` to `test:next`'s file list.

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/venues.check.mjs scripts/render.check.mjs` (`hazards.ts` does not exist).

- [ ] **Step 3: Implement**

`src/sim/constants.ts`: `/** A fall this far above the level's bottom edge is gone: off the screen by then (him, the cast and the carts). */ export const FALL_MARGIN = 200;`. `src/sim/cast.ts`: delete its own `FALL_MARGIN` and add `export { FALL_MARGIN } from "./constants";` (Game and cast-behavior import it from `./cast` as before).

`src/sim/types.ts`:
```ts
/** What a cart carries: the lobby's cases, a busser's dirty dishes, or the dock's trash. */
export type CartLoad = "cases" | "dishes" | "trash";
```
`Stage` gains `/** Flat-tops and the walk-in: heat on or off a second while he stands in one (R3). */ heat?: HeatZone[];` (`import type { HeatZone, SwingDoor } from "./hazards";`). `Target` gains `load: CartLoad;` and `/** A dish cart's dishes are gone (they crash once). */ spilled: boolean;`. `Snapshot` gains `doors: SwingDoor[]`.

`src/sim/level.ts`: the kinds, `LevelPass`, `SwingDoorSpec`, `BackdropSpec` and the `Level` fields of the Interfaces block; `Level` becomes `Omit<Stage, "floor" | "platforms" | "passes"> & { ...; passes: LevelPass[]; heat?: HeatZone[]; swingDoors?: SwingDoorSpec[]; /** The word over a pit when the cast goes down it. */ pitWord?: string; /** The painted walls and standing pieces (R3 §6). */ backdrop?: BackdropSpec; ... }`; re-export `type CartLoad` from `./types`; `CastSpawn` gains `/** A busser's cart's load. */ load?: CartLoad;`. `stageOf` returns `heat: level.heat` too. And:

```ts
/**
 * The gaps in a level's floor: where a fall leaves the world (the lobby's shaft, the restaurant's truck well). A pit lies
 * between two flat floors at one height that no slope or other floor covers; the venue draws it dark.
 */
export function pitsOf(level: Pick<Level, "floor">): { x0: number; x1: number; y: number }[] {
  const flats = level.floor.filter((f) => f.y0 === f.y1).sort((a, b) => a.x0 - b.x0);
  const out: { x0: number; x1: number; y: number }[] = [];
  for (let i = 1; i < flats.length; i++) {
    const a = flats[i - 1];
    const b = flats[i];
    if (b.x0 - a.x1 < 40 || a.y0 !== b.y0) continue;
    const mid = (a.x1 + b.x0) / 2;
    if (level.floor.some((f) => f !== a && f !== b && mid >= f.x0 && mid <= f.x1)) continue;
    out.push({ x0: a.x1, x1: b.x0, y: a.y0 });
  }
  return out;
}
```

`src/sim/hazards.ts`:

```ts
import { CHAIN, hittable, strikeNpc, type Npc } from "./cast";
import type { GameEvent } from "./events";
import type { Puddle } from "./snot";
import type { HeroState, Point, Stage } from "./types";

/** A stretch of counter or floor that heats him (a flat-top) or cools him (the walk-in freezer) while he stands on it: heat a second. */
export type HeatZone = { x0: number; x1: number; y: number; rate: number; kind: "flattop" | "freezer" };
/** How far his feet may be from a zone's surface and still be on it. */
const ON = 4;

/** The zone he stands on now, or null: standing on it counts, passing over it in the air does not. */
export function heatZoneAt(stage: Pick<Stage, "heat">, h: Pick<HeroState, "x" | "y" | "onGround">): HeatZone | null {
  if (!h.onGround) return null;
  return stage.heat?.find((z) => h.x >= z.x0 && h.x <= z.x1 && Math.abs(h.y - z.y) <= ON) ?? null;
}

/** Heat on or off at the zone's rate, kept within 0 and 100, with a `heatZone` event as he steps onto one. Returns the zone he is on. */
export function stepHeatZones(h: HeroState, stage: Stage, dt: number, was: HeatZone | null, events: GameEvent[]): HeatZone | null {
  const z = heatZoneAt(stage, h);
  if (z) h.heat = Math.min(100, Math.max(0, h.heat + z.rate * dt));
  if (z && z !== was) events.push({ type: "heatZone", kind: z.kind, x: h.x, y: h.y });
  return z;
}

/** The kitchen's swinging door: at rest, banging open the way its server rushes through, or slammed away from him by the mallet. */
export type SwingDoor = {
  id: string;
  x: number;
  y: number;
  /** The spawn id of the server whose rush bangs it open. */
  server: string;
  /** Seconds left of a swing; 0 at rest. */
  t: number;
  /** The way it swings, toward +x or -x. */
  dir: 1 | -1;
  /** A bang or a slam, which hurts and knocks; a soft swing does neither. */
  hard: boolean;
  /** How many this slam has bowled over: the chain. */
  chain: number;
};
/** Its swing reaches this far on the side it opens to, lasts `swing` seconds, and the mallet meets it within `hit` of the panel, up to `h` above its floor. */
export const SWING = { reach: 240, swing: 0.4, hit: 90, h: 380 } as const;

export function createSwingDoors(specs: readonly { id: string; x: number; y: number; server: string }[]): SwingDoor[] {
  return specs.map((s) => ({ id: s.id, x: s.x, y: s.y, server: s.server, t: 0, dir: -1, hard: false, chain: 0 }));
}

export type DoorWorld = { hero: HeroState; cast: Npc[]; swing: Point[]; hits: number[]; puddles: Puddle[]; stage: Stage; swingDoors: SwingDoor[] };

/** Whether `before` and `after` lie on opposite sides of the door. */
const crossed = (d: SwingDoor, before: number, after: number) => (before - d.x) * (after - d.x) < 0;
/** Inside the swing on side `dir`: within its reach, on its floor. */
const inSwing = (d: SwingDoor, dir: 1 | -1, x: number, y: number) => (x - d.x) * dir > 0 && Math.abs(x - d.x) <= SWING.reach && Math.abs(y - d.y) < 60;

/**
 * One step of the doors, after the cast has moved. The named server's rush through a door bangs it open her way, and him
 * inside its swing on that side takes a pip (his grace holds as for any hit). Anyone else through it, him included, swings
 * it softly. The mallet meeting a door at rest slams it away from him, knocking down whoever stands in its swing beyond:
 * a chain, like a thrown body.
 */
export function stepSwingDoors(w: DoorWorld, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  for (const d of w.swingDoors) {
    d.t = Math.max(0, d.t - dt);
    if (d.t <= 0) d.hard = false;
    const open = (dir: 1 | -1, hard: boolean) => {
      d.t = SWING.swing;
      d.dir = dir;
      d.hard = hard;
      d.chain = 0;
      events.push({ type: "doorSwing", id: d.id, x: d.x, y: d.y, dir, hard });
    };
    if (d.t <= 0 && w.swing.some((p) => Math.abs(p.x - d.x) <= SWING.hit && p.y <= d.y && p.y >= d.y - SWING.h)) {
      const dir: 1 | -1 = h.x < d.x ? 1 : -1;
      open(dir, true);
      for (const n of w.cast) {
        if (!hittable(n) || n.act === "down" || !inSwing(d, dir, n.x, n.y)) continue;
        if (!strikeNpc(n, "body", dir, w, events, d.chain + 1)) continue;
        d.chain++;
        events.push({ type: "chain", x: n.x, y: n.y - n.h, count: d.chain, points: CHAIN[Math.min(d.chain, CHAIN.length) - 1], oneUp: d.chain >= CHAIN.length });
      }
      continue;
    }
    for (const n of w.cast) {
      if (!n.alive || !crossed(d, n.x - n.vx * dt, n.x)) continue;
      const bang = n.spawn === d.server && n.act === "attack";
      if (d.t > 0 && !bang) continue;
      const dir: 1 | -1 = n.vx > 0 ? 1 : -1;
      open(dir, bang);
      if (bang && inSwing(d, dir, h.x, h.y)) w.hits.push(d.x);
    }
    if (d.t <= 0 && crossed(d, h.x - h.vx * dt, h.x)) open(h.vx > 0 ? 1 : -1, false);
  }
}
```

`src/sim/events.ts`: the three events of the Interfaces block (import `type HeatZone` for `kind`'s type or write the union).

`src/sim/world.ts`: `WorldOptions` gains `swingDoors?: SwingDoor[]`; `World` gains `/** The level's swinging doors. */ swingDoors: SwingDoor[]; /** The heat zone he stood on last step. */ zone: HeatZone | null;` (created as `opts.swingDoors ?? []` and `null`); in `step`, `stepTargets(world.targets, world.stage, STEP, events);` (pass the events), then right after `stepCast(...)`: `stepSwingDoors(world, STEP, events);`, and right after `stepHeat(...)`: `world.zone = stepHeatZones(h, world.stage, STEP, world.zone, events);`; `snapshot()` adds `doors: world.swingDoors.map((d) => ({ ...d }))`.

`src/sim/targets.ts`:
```ts
export function createCart(id: number, x: number, y = 0, load: CartLoad = "cases"): Target {
  return { id, kind: "cart", x, y, w: CART.w, h: CART.h, vx: 0, vy: 0, onGround: true, flash: 0, spin: 0, chain: 0, load, spilled: false };
}
```
and `stepTargets(targets, stage, dt, events: GameEvent[] = [])`: at the top of the loop, before the flash decays:
```ts
    // A dish cart's first knock (the knock's flash is this step's) sends its dishes flying, once.
    if (t.load === "dishes" && !t.spilled && t.flash > 0) {
      t.spilled = true;
      events.push({ type: "dishes", x: t.x, y: t.y - t.h / 2 });
    }
```
and after the loop:
```ts
  // A cart down a pit is gone.
  const b = stage.bounds;
  for (let i = targets.length - 1; i >= 0; i--) if (targets[i].y > b.y + b.h - FALL_MARGIN) targets.splice(i, 1);
```
(import `FALL_MARGIN` from `./constants`, `type GameEvent` from `./events`).

`src/sim/cast.ts`, `createCast`: where the cart id is found, keep the target: `const target = s.cart === undefined ? undefined : targets.find((t) => Math.abs(t.x - s.cart!) < 1); if (target && s.load) target.load = s.load;` and `cart: target?.id ?? null`.

`src/sim/cast-behavior.ts`: footing on stairs:
```ts
/** How far up or down the floor a step ahead may be and still be footing: a 30-degree stair, not a drop. */
const SUPPORT_STEP = 60;
export function supportAt(stage: Stage, x: number, y: number): boolean {
  const f = floorAt(stage, x, y - SUPPORT_STEP);
  if (f !== null && Math.abs(f - y) <= SUPPORT_STEP) return true;
  return stage.platforms.some((p) => x >= p.x0 && x <= p.x1 && Math.abs(p.y - y) <= 24);
}
```

`src/sim/game.ts`: `begin` places each cart on the floor under it and sets the level's doors: `world.targets = level.carts.map((x, i) => createCart(i + 1, x, floorAt(world.stage, x) ?? 0));` (after `restage()`), `world.swingDoors = createSwingDoors(level.swingDoors ?? []); world.zone = null;`; `enter(level, at)` sets the same two for the level it enters.

`src/render/hud.ts`, `hintOf`: after the stash's line,
```ts
  const zone = heatZoneAt(game.world.stage, h);
  if (zone?.kind === "flattop") return "Flat-top · it heats you fast · step off it";
  if (zone?.kind === "freezer") return "Walk-in freezer · cooling off";
```
and after the cast's threats (before the shield's line):
```ts
  if (game.world.swingDoors.some((d) => Math.abs(d.x - h.x) < 500 && Math.abs(d.y - h.y) < 60)) return "Swinging door · stand clear when it bangs, or bonk it back";
```

`src/game/audio.ts`, beside `chime()`:
```ts
  /** A flat-top under his shoes. */
  sizzle() {
    this.noise(0.35, 0.09, 5200, "highpass", 2400);
  }
  /** The walk-in's cold breath. */
  frost() {
    this.noise(0.4, 0.05, 2600, "bandpass", 1200);
    this.blip(1320, 0.12, "sine", 0.03, 990);
  }
  /** A swinging door banging open. */
  bang() {
    this.noise(0.1, 0.16, 500, "lowpass");
    this.blip(110, 0.12, "square", 0.08, 70);
  }
  /** A page turning. */
  page() {
    this.noise(0.08, 0.05, 3000, "bandpass", 1500);
  }
```

`src/render/sound.ts`, `cuesFor`:
```ts
    case "heatZone":
      return e.kind === "flattop" ? ["sizzle"] : ["frost"];
    case "doorSwing":
      return e.hard ? ["bang"] : ["swish"];
    case "dishes":
      return ["shatter", "smash"];
```

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npm run test:game`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`.

- [ ] **Step 5: Commit** `src/sim src/render/hud.ts src/render/sound.ts src/game/audio.ts scripts/venues.check.mjs scripts/render.check.mjs package.json`: "Add the venues' hazards: heat zones, the swinging door, carts on their floor and down pits, footing on stairs". Push.

---

### Task 4: The new cast's fights

**Files:**
- Modify: `src/game/lines.ts`, `src/sim/level.ts`, `src/sim/cast.ts`, `src/sim/cast-behavior.ts`, `src/sim/missiles.ts`, `src/sim/snot.ts`, `src/sim/events.ts`
- Test: `scripts/cast.check.mjs`

**Interfaces:**
- Consumes: `CastSpawn.load`, `Target.load` (Task 3).
- Produces:
  - `src/game/lines.ts`: `CastJobName = "bellhop" | "server" | "office" | "student" | "cook" | "busser" | "lunch" | "prof"`; `CastLineSet = { notice; bump; down: readonly string[]; fall: string; shove; warn; skid; march; ambush: readonly string[]; frozen: string | null }`; `JOB_LINES: Record<CastJobName, CastLineSet>`.
  - `src/sim/level.ts`: `CastPerson` adds `"cook-1" | "busser-1" | "lunch-1" | "prof-1"`.
  - `src/sim/cast.ts`: `CastJob` (= `CastJobName`), `jobOf(p)`, `ROLE_OF: Record<CastJob, CastRole>`, `roleOf(p)` (by the table), `HATTED: ReadonlySet<CastJob>`, `SpillKind = "water" | "coffee" | "gravy" | "grease"`, `SPILL` (adds gravy 260 px 8 s and grease 150 px 7 s), `SPILL_OF: Partial<Record<CastJob, SpillKind>>`, `linesOf(n): CastLineSet`; `Npc.job: CastJob`; `spill(w, n, kind: SpillKind)`.
  - `src/sim/missiles.ts`: `MissileKind = "plane" | "coffee" | "pan"`; `launchCoffee(id, from, target, kind: "coffee" | "pan" = "coffee")`.
  - `src/sim/snot.ts`: `Puddle.kind: "snot" | SpillKind`.
  - Events: `castSplash` gains `kind: "coffee" | "grease" | "papers"`; `chime` gains `job: CastJob`; `castHit` gains `job: CastJob`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/cast.check.mjs`; import `JOB_LINES` from `../src/game/lines.ts`, `strikeNpc` from `../src/sim/cast.ts`, `knock` from `../src/sim/targets.ts`)

```js
test("the new people fight the lobby's ways: the busser's cart, the lunch worker's rush, the cook's and the professor's march", () => {
  const w = worldWith(
    [
      { id: "b", person: "busser-1", x: 1000, y: 0, cart: 850, load: "dishes" },
      { id: "l", person: "lunch-1", x: 3000, y: 0 },
      { id: "c", person: "cook-1", x: 5000, y: 0, hide: true },
      { id: "p", person: "prof-1", x: 7000, y: 0, x0: 6800, x1: 7200 },
    ],
    { x: -1500, y: 0 }, {}, [850],
  );
  assert.deepEqual(w.cast.map((n) => [n.job, n.role, n.hat]), [["busser", "bellhop", false], ["lunch", "server", false], ["cook", "office", true], ["prof", "office", false]]);
  assert.equal(w.targets[0].load, "dishes");
  assert.equal(npc(w, "c").act, "hide");
});

test("the busser shoves his dish cart with his own line; bonked, its dishes crash once", () => {
  const w = worldWith([{ id: "b", person: "busser-1", x: 1400, y: 0, cart: 1250, load: "dishes" }], { x: 500, y: 0 }, {}, [1250]);
  const evs = until(w, (x) => npc(x, "b").act === "chase", 4);
  assert.ok(of(evs, "castAttack").length === 1 && w.targets[0].vx < 0, "shoved at him");
  assert.ok(of(evs, "castLine").some((e) => JOB_LINES.busser.shove.includes(e.text)), "a busser's line");
  knock(w.targets[0], 1, 1100, 200);
  assert.equal(of(steps(w, 0.3), "dishes").length, 1);
  knock(w.targets[0], -1, 1100, 200);
  assert.equal(of(steps(w, 0.3), "dishes").length, 0, "once");
});

test("the lunch worker warns and rushes with her own lines; knocked down she leaves gravy", () => {
  const w = worldWith([{ id: "l", person: "lunch-1", x: 1400, y: 0 }], { x: 900, y: 0 });
  const evs = until(w, (x) => npc(x, "l").act === "attack", 3);
  assert.ok(of(evs, "castLine").some((e) => JOB_LINES.lunch.warn.includes(e.text)), "her warning");
  strikeNpc(npc(w, "l"), "mallet", 1, w, []);
  const down = until(w, (x) => npc(x, "l").act === "leave", 6);
  assert.equal(w.puddles.at(-1)?.kind, "gravy");
  assert.ok(of(down, "castLine").some((e) => JOB_LINES.lunch.down.includes(e.text)), "her line getting up");
});

test("the cook rears up out of hiding with his own line and flings a hot pan that leaves grease; hit, his hat flies", () => {
  const w = worldWith([{ id: "c", person: "cook-1", x: 1400, y: 0, hide: true }], { x: 600, y: 0 });
  w.hero.x = 1000;
  const evs = until(w, (x) => x.puddles.some((p) => p.kind === "grease"), 4);
  assert.ok(of(evs, "castLine").some((e) => JOB_LINES.cook.ambush.includes(e.text)), "his line");
  assert.ok(of(evs, "missile").some((e) => e.kind === "pan"), "a pan, not coffee");
  assert.ok(w.puddles.some((p) => p.kind === "grease"), "a grease slick");
  const c = npc(w, "c");
  Object.assign(c, { act: "walk" });
  assert.ok(c.hat);
  strikeNpc(c, "mallet", 1, w, []);
  assert.equal(c.hat, false, "the toque flies");
});

test("the professor reads as he marches: a page turns as he closes in, and head-on his papers fly and it costs a pip", () => {
  const w = worldWith([{ id: "p", person: "prof-1", x: 1000, y: 0, x0: 600, x1: 1400 }], { x: -1500, y: 0 });
  until(w, () => npc(w, "p").facing === -1 && npc(w, "p").x < 1300 && npc(w, "p").x > 900, 8);
  Object.assign(w.hero, { x: npc(w, "p").x - 450, y: 0, facing: 1 });
  const evs = until(w, (x) => x.hero.patience < 3, 4);
  assert.ok(of(evs, "chime").some((e) => e.job === "prof"), "the page's tell");
  assert.ok(of(evs, "castSplash").some((e) => e.kind === "papers"), "his papers");
  assert.ok(of(evs, "castLine").some((e) => e.text === JOB_LINES.prof.march[0]));
});

test("the lecture freezes the cook and the professor with their own lines", () => {
  const w = worldWith([{ id: "c", person: "cook-1", x: 1120, y: 0 }, { id: "p", person: "prof-1", x: 1150, y: 0 }], { x: 1000, y: 0 });
  Object.assign(w.hero, { facing: 1, lectureCd: 0 });
  const evs = [...press(w, "lecture"), ...until(w, (x) => x.events.some((e) => e.type === "castFreeze"), 1), ...w.events];
  const lines = of(evs, "castLine").map((e) => e.text);
  assert.ok(lines.includes(JOB_LINES.cook.frozen), lines.join(" | "));
  assert.ok(lines.includes(JOB_LINES.prof.frozen), lines.join(" | "));
});

test("the new people say their own line down a pit", () => {
  const pit = flat({ floor: [{ x0: -2000, x1: 1000, y0: 0, y1: 0 }, { x0: 1400, x1: 20000, y0: 0, y1: 0 }], bounds: { x: -2000, y: -3000, w: 22000, h: 3600 } });
  for (const person of ["busser-1", "lunch-1", "cook-1", "prof-1"]) {
    const w = worldWith([{ id: "p", person, x: 1200, y: 0 }], { x: -1500, y: 0 }, {}, [], pit);
    const fell = of(until(w, (x) => !npc(x, "p").alive, 3), "castFell");
    assert.equal(fell[0]?.line, JOB_LINES[person.slice(0, -2)].fall, person);
  }
});

test("the lobby's people say exactly what they said before the jobs", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 1400, y: 0 }, { id: "s", person: "server-1", x: 3000, y: 0 }, { id: "b", person: "bellhop-1", x: 5000, y: 0 }], { x: -1500, y: 0 });
  assert.deepEqual(w.cast.map((n) => [n.job, n.role]), [["office", "office"], ["server", "server"], ["bellhop", "bellhop"]]);
  assert.deepEqual(JOB_LINES.office.frozen, CAST_LINES.office.frozen);
  assert.deepEqual(JOB_LINES.server.notice, STAFF_LINES.server);
  assert.deepEqual(JOB_LINES.bellhop.shove, CAST_LINES.bellhop.shove);
});
```

(Import `STAFF_LINES` from `../src/game/lines.ts` for the last test.)

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/cast.check.mjs` (no `job`, no new persons).

- [ ] **Step 3: Implement**

`src/game/lines.ts`, after `CAST_LINES`:

```ts
export type CastJobName = "bellhop" | "server" | "office" | "student" | "cook" | "busser" | "lunch" | "prof";
/** Everything one job says: speech bubbles, never recordings. A role's fight reads the lines it needs; the rest stay empty. */
export type CastLineSet = {
  notice: readonly string[];
  bump: readonly string[];
  down: readonly string[];
  /** Said on the way down a pit. */
  fall: string;
  /** The cart's shove (the bellhop, the busser). */
  shove: readonly string[];
  /** The rush's warning and its skid (the server, the lunch worker). */
  warn: readonly string[];
  skid: readonly string[];
  /** Walked into head-on (the office worker, the cook, the professor). */
  march: readonly string[];
  /** Rearing up out of hiding (the office worker behind the screen, the cook behind the pass). */
  ambush: readonly string[];
  /** Frozen by the lecture; null sighs one of STAFF_SIGHS. */
  frozen: string | null;
};
const none: readonly string[] = [];

/** Every job's lines (R3 §4): the lobby's four as R2b wrote them, and the restaurant's and campus's new people. */
export const JOB_LINES: Record<CastJobName, CastLineSet> = {
  bellhop: { notice: CAST_LINES.bellhop.notice, bump: CAST_LINES.bellhop.bump, down: CAST_LINES.bellhop.down, fall: CAST_LINES.bellhop.fall, shove: CAST_LINES.bellhop.shove, warn: none, skid: none, march: none, ambush: none, frozen: null },
  server: { notice: STAFF_LINES.server, bump: CAST_LINES.server.bump, down: CAST_LINES.server.down, fall: CAST_LINES.server.fall, shove: none, warn: CAST_LINES.server.warn, skid: CAST_LINES.server.skid, march: none, ambush: none, frozen: null },
  office: { notice: CAST_LINES.office.notice, bump: CAST_LINES.office.notice, down: CAST_LINES.office.down, fall: CAST_LINES.office.fall, shove: none, warn: none, skid: none, march: CAST_LINES.office.march, ambush: CAST_LINES.office.ambush, frozen: CAST_LINES.office.frozen },
  student: { notice: CAST_LINES.student.notice, bump: none, down: none, fall: CAST_LINES.student.fall, shove: none, warn: none, skid: none, march: none, ambush: none, frozen: null },
  busser: {
    notice: ["Behind you!", "Are you still working on that?", "I just started here."],
    bump: ["Coming through!", "Hot plates!"],
    down: ["That's not my section.", "I just started here."],
    fall: "I quiiit",
    shove: ["Coming through!", "Bus cart!", "Heads up, sir!"],
    warn: none, skid: none, march: none, ambush: none, frozen: null,
  },
  cook: {
    notice: ["Who let him back here?", "Hands!", "Ninety-six on that."],
    bump: ["Behind!", "Corner!"],
    down: ["Who touched my station?", "I'm calling the chef."],
    fall: "Behiiind",
    shove: none, warn: none, skid: none,
    march: ["Behind!"],
    ambush: ["Order up!", "Hands!"],
    frozen: "Yes, chef.",
  },
  lunch: {
    notice: ["No cutting!", "One scoop, hon.", "You want gravy on that?"],
    bump: ["Keep it moving, hon.", "Tray, please."],
    down: ["That's it, I'm on break.", "I've been here thirty years."],
    fall: "Hooooon",
    shove: none,
    warn: ["Keep it moving, hon!", "Line's back there!"],
    skid: ["Next!", "Who's next?"],
    march: none, ambush: none, frozen: null,
  },
  prof: {
    notice: ["Office hours are Tuesdays.", "Are you in my section?", "Fascinating."],
    bump: ["Pardon me.", "Were you enrolled?"],
    down: ["I'm putting this in my memoir.", "That's going on your transcript."],
    fall: "Tenuuure",
    shove: none, warn: none, skid: none,
    march: ["Pardon me. Were you enrolled?"],
    ambush: none,
    frozen: "Fascinating. Go on.",
  },
};
```

`src/sim/level.ts`: `CastPerson` adds `"cook-1" | "busser-1" | "lunch-1" | "prof-1"`.

`src/sim/cast.ts`:
```ts
export type CastJob = CastJobName;
/** Who a person is: the painting's name less its number ("cook-1" is a cook). */
export const jobOf = (p: CastPerson): CastJob => p.slice(0, -2) as CastJob;
/** Which of the lobby's four fights each job fights (R3 §4). */
export const ROLE_OF: Record<CastJob, CastRole> = { bellhop: "bellhop", server: "server", office: "office", student: "student", cook: "office", busser: "bellhop", lunch: "server", prof: "office" };
export const roleOf = (p: CastPerson): CastRole => ROLE_OF[jobOf(p)];
/** Who wears a hat that flies off at the first hit. */
export const HATTED: ReadonlySet<CastJob> = new Set<CastJob>(["bellhop", "cook"]);
export const SPILL = { water: { w: 260, life: 8 }, coffee: { w: 150, life: 7 }, gravy: { w: 260, life: 8 }, grease: { w: 150, life: 7 } } as const;
export type SpillKind = keyof typeof SPILL;
/** What a staffer's fall leaves on the floor: the tray's water, the coffee, the gravy, the pan's grease. */
export const SPILL_OF: Partial<Record<CastJob, SpillKind>> = { server: "water", office: "coffee", lunch: "gravy", cook: "grease" };
/** Everything a cast member says. */
export const linesOf = (n: Pick<Npc, "job">): CastLineSet => JOB_LINES[n.job];
```
`Npc` gains `/** Who they are (the painting's job); `role` is the fight they fight. */ job: CastJob;`; `createCast`: `const job = jobOf(s.person); const role = ROLE_OF[job];`, `job,` in the record, `hat: HATTED.has(job)`. `spill(w, n, kind: SpillKind)`. `strikeNpc`'s staff branch: `n.hat = false;` for everyone (the `role === "bellhop"` test goes). `hitEvent` adds `job: n.job`. `noticeLine(n)` becomes `return pick(linesOf(n).notice, n.k);`.

`src/sim/cast-behavior.ts`:
- `downLine` becomes `const downLine = (n: Npc): string => pick(linesOf(n).down, n.k);`.
- `stepServer`: `pick(linesOf(n).skid, n.k + n.hits)` and `pick(linesOf(n).warn, n.k + n.hits)`.
- `stepBellhop`: `pick(linesOf(n).shove, n.k + n.hits)`.
- `stepOffice`: `pick(linesOf(n).ambush, n.k)`; the throw: `w.missiles.push(launchCoffee(++w.nextMissile, n, { x: h.x, y: h.y - h.h * 0.6 }, n.job === "cook" ? "pan" : "coffee"));` and the missile event's `kind: m.kind`; the tell: `events.push({ type: "chime", x: n.x, y: n.y - n.h, job: n.job });`.
- `land`: `const s = SPILL_OF[n.job]; if (s) spill(w, n, s);` in place of the server and office lines.
- `physics`: the fall's line is `linesOf(n).fall`.
- `contact`, the attacking office worker's branch: `events.push({ type: "castSplash", x: h.x, y: h.y - h.h * 0.6, kind: n.job === "cook" ? "grease" : n.job === "prof" ? "papers" : "coffee" }); say(n, pick(linesOf(n).march, 0), events);`; the bump: `say(n, pick(linesOf(n).bump, n.role === "office" ? n.k + 1 : n.k), events);`.
- `lectureOn`: `say(n, linesOf(n).frozen ?? pick(STAFF_SIGHS, n.k + frozen), events);`.

`src/sim/missiles.ts`: `MissileKind = "plane" | "coffee" | "pan"`; `launchCoffee(id, from, target, kind: "coffee" | "pan" = "coffee")` returns `kind`; `puddleAt(w, x, y, kind: "coffee" | "grease")` reads `SPILL[kind]`; in `stepMissiles` the coffee branch serves both (`if (m.kind === "plane") {...} else {...}`), and both puddles become `if (m.kind !== "plane") puddleAt(w, ..., m.kind === "pan" ? "grease" : "coffee")`.

`src/sim/snot.ts`: `Puddle.kind: "snot" | SpillKind` (`import type { SpillKind } from "./cast"`).

`src/sim/events.ts`: the three event changes of the Interfaces block (`import type { CastJob } from "./cast"`).

`grep -rn "CAST_LINES\.\|STAFF_LINES\.server\|role === \"bellhop\" ? pick" src/sim` must find no line the jobs replaced.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/sim src/game scripts`.

- [ ] **Step 5: Commit** `src/game/lines.ts src/sim scripts/cast.check.mjs`: "Give the cast jobs: the cook, the busser, the lunch worker and the professor fight the lobby's ways". Push.

---

### Task 5: The new cast drawn

**Files:**
- Modify: `src/render/cast.ts`, `src/render/cast-fx.ts`, `src/render/props.ts`, `src/render/look.ts`, `src/render/sound.ts`, `src/render/boards.ts`
- Test: `scripts/render.check.mjs`

**Interfaces:**
- Consumes: `CastJob`, `HATTED`, `roleOf`, `Target.load`, `Target.spilled`, the new events (Tasks 3 and 4).
- Produces: `LOOKS` entries for the four new persons; `FigureOpts.job: CastJob`; `Carried = "glasses" | "food" | "cup" | "phone" | "pan" | "book"`; `carriedOf(job: CastJob): Carried[]`; `drawCart` draws by `t.load` (`drawBusCart`, `drawBin`); `drawPuddle` draws `gravy` and `grease`; `drawMissile` draws `pan`; `Flyers.hat(x, y, dir, painted, job)`, `Flyers.food(x, y, dir)`, `Flyers.pan(x, y, dir)`, `Flyers.papers(x, y, dir)`, `Flyers.towel(x, y, dir)`, `Flyers.book(x, y, dir)`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/render.check.mjs`; import `carriedOf, LOOKS` from `../src/render/cast.ts`)

```js
test("each job carries its own things: the server's glasses, the lunch tray, the coffee and phone, the pan, the book", () => {
  assert.deepEqual(carriedOf("server"), ["glasses"]);
  assert.deepEqual(carriedOf("lunch"), ["food"]);
  assert.deepEqual(carriedOf("office"), ["cup", "phone"]);
  assert.deepEqual(carriedOf("cook"), ["pan"]);
  assert.deepEqual(carriedOf("prof"), ["book"]);
  assert.deepEqual([carriedOf("bellhop"), carriedOf("busser"), carriedOf("student")], [[], [], []]);
});

test("every person the levels place has a look, its head 0.22 of its height", () => {
  for (const p of ["cook-1", "busser-1", "lunch-1", "prof-1"]) {
    assert.ok(LOOKS[p], p);
    assert.equal(LOOKS[p].head, 0.22, p);
  }
});

test("the new people sound like themselves: the cook's sizzle and the professor's page as tells, papers and grease, a dropped tray", () => {
  assert.deepEqual(cuesFor({ type: "chime", x: 0, y: 0, job: "office" }), ["chime"]);
  assert.deepEqual(cuesFor({ type: "chime", x: 0, y: 0, job: "cook" }), ["sizzle"]);
  assert.deepEqual(cuesFor({ type: "chime", x: 0, y: 0, job: "prof" }), ["page"]);
  assert.deepEqual(cuesFor({ type: "castSplash", x: 0, y: 0, kind: "papers" }), ["paper"]);
  assert.deepEqual(cuesFor({ type: "castSplash", x: 0, y: 0, kind: "grease" }), ["splash"]);
  const down = (job, role) => cuesFor({ type: "castHit", id: 1, role, job, by: "mallet", x: 0, y: 0, dir: 1, down: true, points: 100 });
  assert.deepEqual(down("server", "server"), ["shatter"]);
  assert.deepEqual(down("lunch", "server"), ["splash"]);
  assert.deepEqual(down("cook", "office"), ["splash"]);
  assert.deepEqual(down("prof", "office"), ["page"]);
  assert.deepEqual(cuesFor({ type: "missile", kind: "pan", x: 0, y: 0 }), ["whoosh"]);
  assert.deepEqual(cuesFor({ type: "missile", kind: "plane", x: 0, y: 0 }), ["paper"]);
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/render.check.mjs`.

- [ ] **Step 3: Implement**

`src/render/cast.ts`:
- `LOOKS` gains (stand-in fallbacks only; never polish them):
  ```ts
  "cook-1": { height: 360, head: 0.22, build: 1.2, skin: "#c98a5e", hair: "#1c1612", hairStyle: "bald", top: "#f4f3ee", sleeves: "skin", apron: true, bottom: "#2a2a2a", shoes: "#141414" },
  "busser-1": { height: 340, head: 0.22, build: 0.75, skin: "#f0cfae", hair: "#e3b341", hairStyle: "short", top: "#1a1a1a", sleeves: "skin", apron: true, bottom: "#1a1a1a", shoes: "#141414" },
  "lunch-1": { height: 300, head: 0.22, build: 1.15, skin: "#e8bf9c", hair: "#b5b5b5", hairStyle: "curly", top: "#2d3f7a", sleeves: "skin", apron: true, bottom: "#1d1d1f", shoes: "#141414", glasses: true },
  "prof-1": { height: 330, head: 0.22, build: 0.95, skin: "#e9c4a4", hair: "#f2f2f2", hairStyle: "curly", top: "#7b5a3a", sleeves: "top", tie: "#b8282e", bottom: "#6b4a2a", shoes: "#5a3a1e", glasses: true },
  ```
- `FigureOpts` gains `job: CastJob`.
- ```ts
  export type Carried = "glasses" | "food" | "cup" | "phone" | "pan" | "book";
  /** What each job carries in its hands: drawn in code over the painting or the stand-in so it can fly and break. */
  export function carriedOf(job: CastJob): Carried[] {
    switch (job) {
      case "server":
        return ["glasses"];
      case "lunch":
        return ["food"];
      case "office":
        return ["cup", "phone"];
      case "cook":
        return ["pan"];
      case "prof":
        return ["book"];
      default:
        return [];
    }
  }
  ```
- `drawProp` reads the job's things; the student's phone stays as it is (role `student`, idle acts):
  ```ts
  function drawProp(g: Graphics, j: Record<JointName, Point>, k: number, f: 1 | -1, o: FigureOpts) {
    const h = j.handNear;
    const c = carriedOf(o.job);
    if (c.includes("glasses") && o.prop) {
      // ...the server's tray of glasses, as today...
    }
    if (c.includes("food") && o.prop) {
      // The lunch tray: mashed potatoes, a row of peas, a jello cube.
      g.ellipse(h.x + f * 10 * k, h.y - 10 * k, 46 * k, 10 * k).fill("#c9a84a").stroke({ width: 3, color: INK });
      g.ellipse(h.x - f * 12 * k, h.y - 22 * k, 16 * k, 12 * k).fill("#f1e3b5").stroke({ width: 2, color: INK });
      for (const dx of [2, 10, 18]) g.circle(h.x + f * dx * k, h.y - 18 * k, 5 * k).fill("#7fb24a").stroke({ width: 1.5, color: INK });
      g.roundRect(h.x + f * 26 * k - 9 * k, h.y - 34 * k, 18 * k, 18 * k, 3).fill({ color: "#c8443a", alpha: 0.9 }).stroke({ width: 2, color: INK });
    }
    if (c.includes("cup") && o.prop) {
      // ...the office worker's coffee cup, as today...
    }
    if (c.includes("phone")) {
      // ...the office worker's phone in the far hand, as today...
    }
    if (c.includes("pan") && o.prop) {
      // The cook's pan held out by its handle, food in it.
      g.roundRect(Math.min(h.x, h.x + f * 70 * k), h.y - 6 * k, 70 * k, 12 * k, 4).fill("#3a2a1c").stroke({ width: 2, color: INK });
      g.ellipse(h.x + f * 110 * k, h.y - 8 * k, 46 * k, 12 * k).fill("#2b2b2e").stroke({ width: 3, color: INK });
      g.ellipse(h.x + f * 110 * k, h.y - 16 * k, 24 * k, 8 * k).fill("#d98a3a");
    }
    if (c.includes("book")) {
      // The professor's open book, held up in the far hand.
      const p = j.handFar;
      g.poly([p.x - 30 * k, p.y - 34 * k, p.x, p.y - 26 * k, p.x + 30 * k, p.y - 34 * k, p.x + 30 * k, p.y + 4 * k, p.x, p.y + 12 * k, p.x - 30 * k, p.y + 4 * k])
        .fill("#f4efe2")
        .stroke({ width: 2, color: INK });
      g.moveTo(p.x, p.y - 26 * k).lineTo(p.x, p.y + 12 * k).stroke({ width: 2, color: INK });
      g.rect(p.x - 32 * k, p.y + 4 * k, 64 * k, 6 * k).fill("#6b3a1e");
    }
    // ...the student's phone, as today...
  }
  ```
  (The "as today" blocks are the existing code moved under their `carriedOf` test; the `o.role === "office"` and `o.role === "server"` tests go.)
- `hairOn`'s last argument becomes `hat: false | "pillbox" | "toque"`: the pillbox as today; the toque a white `roundRect` 1.6 rx wide and 2.2 ry tall above the crown with a puffed top `ellipse`. `drawHead` passes `o.hat && HATTED.has(o.job) ? (o.job === "cook" ? "toque" : "pillbox") : false`.
- `Cast.draw`: `v.painted.apply(s, { recolor, dazed, hat: o.hat && HATTED.has(o.job), silhouette: o.silhouette }, rim)`; both `FigureOpts` built in `sync` gain `job: n.job`.

`src/render/props.ts`:
- `drawCart(g, t: Pick<Target, "w" | "h" | "load" | "spilled">, flash)` begins `if (t.load === "dishes") return drawBusCart(g, t, flash); if (t.load === "trash") return drawBin(g, t, flash);`.
- ```ts
  /** A busser's grey utility cart, two shelves of bus tubs, dirty dishes stacked in them until they crash. */
  function drawBusCart(g: Graphics, t: Pick<Target, "w" | "spilled">, flash: boolean): void {
    const f: Fill = { flash };
    const grey = tones("#7c8086");
    const half = t.w / 2 - 10;
    for (const x of [-half + 14, half - 14]) {
      g.circle(x, -14, 14);
      paint(g, "#1a1a1a", f);
      ink(g, f, 3);
    }
    for (const x of [-half, half - 14]) {
      g.rect(x, -250, 14, 222);
      paint(g, grey.shadow, f);
      ink(g, f, 3);
    }
    for (const y of [-70, -180]) {
      g.rect(-half, y, half * 2, 18);
      paint(g, grey.base, f);
      ink(g, f, 3);
      g.roundRect(-half + 16, y - 56, half * 2 - 32, 56, 6);
      paint(g, "#5a5e66", f);
      ink(g, f, 3);
      if (!t.spilled)
        for (let x = -half + 34; x < half - 40; x += 34) {
          g.ellipse(x, y - 60, 16, 6);
          paint(g, "#f4f3ee", f);
          ink(g, f, 2);
        }
    }
    g.roundRect(-half - 10, -262, half * 2 + 20, 16, 6);
    paint(g, grey.highlight, f);
    ink(g, f, 3);
  }

  /** The dock's wheeled trash bin, its lid shut. */
  function drawBin(g: Graphics, t: Pick<Target, "w">, flash: boolean): void {
    const f: Fill = { flash };
    const body = tones("#3d5a3f");
    const half = t.w / 2 - 20;
    g.circle(-half + 20, -16, 16);
    paint(g, "#1a1a1a", f);
    ink(g, f, 3);
    g.poly([-half, -300, half, -300, half - 12, -24, -half + 12, -24]);
    paint(g, body.base, f);
    ink(g, f);
    g.poly([half - 50, -300, half, -300, half - 12, -24, half - 46, -24]);
    paint(g, body.shadow, f);
    g.roundRect(-half - 8, -322, half * 2 + 16, 26, 6);
    paint(g, body.highlight, f);
    ink(g, f, 3);
  }
  ```
- `drawPuddle`: `gravy` in `#8a5a2b` with three darker lumps, `grease` in `#d9a441` at 0.7 alpha with a white glint; the same shape as `water`.
- `drawMissile`: `pan`: the pan as in `drawProp`, turned by `m.spin`, with an orange glob trailing.

`src/render/cast-fx.ts`:
- The flyers:
  ```ts
  /** The cook's toque, code-drawn: what flies when his painted one is missing. */
  private static toque(): Graphics {
    return new Graphics()
      .roundRect(-22, -60, 44, 60, 10)
      .fill("#f4f3ee")
      .stroke({ width: 3, color: INK })
      .ellipse(0, -62, 30, 18)
      .fill("#ffffff")
      .stroke({ width: 3, color: INK });
  }

  /** Something knocked loose that lands and lies there a while: a pan, a towel, a book. */
  private lie(view: Container, x: number, y: number, dir: 1 | -1, up: number, spin: number): void {
    this.add(view, x, y, dir * 260, -up, dir * spin, 3, (f) => {
      f.vx = 0;
      f.spin = 0;
    });
  }

  /** The lunch tray's food: the potatoes, the peas and the jello, each splatting where it lands. */
  food(x: number, y: number, dir: 1 | -1): void {
    const bits: [Graphics, number][] = [
      [new Graphics().ellipse(0, 0, 16, 12).fill("#f1e3b5").stroke({ width: 2, color: INK }), -700],
      [new Graphics().circle(-6, 0, 5).circle(6, 0, 5).circle(0, -7, 5).fill("#7fb24a").stroke({ width: 1.5, color: INK }), -820],
      [new Graphics().roundRect(-9, -9, 18, 18, 3).fill({ color: "#c8443a", alpha: 0.9 }).stroke({ width: 2, color: INK }), -560],
    ];
    bits.forEach(([g, up], i) =>
      this.add(g, x + i * 12, y, dir * (120 + i * 90) + (i - 1) * 60, up, (i - 1) * 7, 3, (f) => {
        f.life = 0;
        this.particles.emit("coffee", f.x, f.y, 6);
      }),
    );
  }

  pan(x: number, y: number, dir: 1 | -1): void {
    const g = new Graphics().roundRect(-80, -6, 70, 12, 4).fill("#3a2a1c").stroke({ width: 2, color: INK }).ellipse(20, -8, 46, 12).fill("#2b2b2e").stroke({ width: 3, color: INK });
    this.lie(g, x, y, dir, 600, 9);
  }

  towel(x: number, y: number, dir: 1 | -1): void {
    this.lie(new Graphics().roundRect(-26, -16, 52, 32, 6).fill("#f4f3ee").stroke({ width: 3, color: INK }), x, y, dir, 520, 6);
  }

  book(x: number, y: number, dir: 1 | -1): void {
    this.lie(new Graphics().roundRect(-24, -16, 48, 32, 3).fill("#6b3a1e").stroke({ width: 3, color: INK }).rect(-20, -12, 40, 24).fill("#f4efe2"), x, y, dir, 560, 8);
  }

  /** The professor's papers: four sheets fluttering down, and a flurry. */
  papers(x: number, y: number, dir: 1 | -1): void {
    for (let i = 0; i < 4; i++)
      this.add(new Graphics().rect(-14, -18, 28, 36).fill("#ffffff").stroke({ width: 2, color: INK }), x, y, dir * (60 + 70 * i), -400 - 90 * i, (i - 1.5) * 3, 2, (f) => {
        f.vx = 0;
        f.spin = 0;
      });
    this.particles.emit("paper", x, y, 10);
  }
  ```
  and `hat(x, y, dir, painted = null, job: CastJob = "bellhop")` draws `Flyers.toque()` for a cook when `painted` is null (the pillbox for anyone else, as today).

`src/render/look.ts`, `show`:
- `castHit`: `const n = world.cast.find((c) => c.id === e.id);` then `if (n && !n.hat && n.hits === 1 && HATTED.has(n.job)) flyers.hat(e.x, e.y - 150, e.dir, cast.hat(n.person), n.job);`; `if (e.job === "busser" && n?.hits === 1) flyers.towel(e.x, e.y - 60, e.dir);`; the downs by job: `server` glasses and water (as today), `lunch` `flyers.food`, `office` the cup (as today), `cook` `flyers.pan`, `prof` `flyers.book` and `flyers.papers`; the comeback for staff as today.
- `dishes`: `particles.emit("glass", e.x, e.y, 18); words.say("CRASH!", e.x, e.y - 120, false, face, view);`.
- `castSplash`: `e.kind === "papers" ? particles.emit("paper", e.x + facing * 40, e.y, 14) : particles.emit("coffee", e.x + facing * 40, e.y, 16)`.
- `missileHit`: `e.kind !== "plane"` emits `coffee` particles.

`src/render/sound.ts`, `cuesFor`:
```ts
    case "chime":
      return e.job === "cook" ? ["sizzle"] : e.job === "prof" ? ["page"] : ["chime"];
    case "castSplash":
      return e.kind === "papers" ? ["paper"] : ["splash"];
    case "missile":
      return e.kind === "pan" ? ["whoosh"] : ["paper"];
    case "missileHit":
      return e.kind === "plane" ? [] : ["splash"];
```
and in the `castHit` case the downs read the job: `if (e.down && e.job === "server") names.push("shatter"); if (e.down && (e.job === "office" || e.job === "lunch" || e.job === "cook")) names.push("splash"); if (e.down && e.job === "prof") names.push("page");`. Remove `chime`, `missile` and `castSplash` from `CUES`.

`src/render/boards.ts`: `PERSONS` adds `"cook-1", "busser-1", "lunch-1", "prof-1"`; the role is `roleOf(person)` in `castSheet` and `castHeads`; the rows' `hat` is `HATTED.has(jobOf(person))` and every `FigureOpts` gains `job: jobOf(person)`; the act-name header row repeats at the first row of each role group; `castFx` adds items "toque", "pan", "tray", "book", "papers", "gravy", "grease", "dish cart" (`drawCart` with `load: "dishes"`), "bin".

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`.

- [ ] **Step 5: Look.** With the 8090 dev server, `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-fx`: the four new rows draw (as stand-ins until Task 8) with their props in every act; `cast-fx.png` shows each new prop and puddle at full size, inked like the rest. `cast-browser.check.mjs` still passes.

- [ ] **Step 6: Commit** `src/render scripts/render.check.mjs`: "Draw the new cast's props, carts, puddles and flyers, and give them their sounds". Push.

---
### Task 6: The restaurant

**Files:**
- Create: `src/sim/levels/restaurant.ts`, `src/render/ink.ts`, `src/render/venue-restaurant.ts`
- Modify: `src/render/venue.ts`, `src/render/look.ts`, `src/sim/drive.ts`, `scripts/run-browser.check.mjs`
- Test: `scripts/venues.check.mjs`

**Interfaces:**
- Consumes: everything of Tasks 2 to 5.
- Produces: `RESTAURANT: Level`; `src/render/ink.ts`: `OUTLINE`, `INK`, `THIN`, `FLOOR = { depth: 120, top: 26, back: 34 }`; `src/render/venue-restaurant.ts`: `restaurantFloor(g, f): boolean`, `restaurantPlatform(g, p): boolean`, `restaurantFurniture(g, f): boolean`, `drawGantry(g, p)`; `VenueView.setDoors(doors: readonly SwingDoor[]): void`; `drawSwingDoor(g, at, open, dir)` and `drawPits(g, level)` in `venue.ts`; `fight`'s slope-aware reach in `drive.ts`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/venues.check.mjs`; import `RESTAURANT` from `../src/sim/levels/restaurant.ts`, `seedRewards` from `../src/sim/rewards.ts`, `drive` from `../src/sim/drive.ts`, `floorAt` from `../src/sim/physics.ts`)

```js
/** His jump tops out near 398 px (the lobby's measure). */
const REACH = 398;
/** Where every spawn stands: on a floor or a platform at its y. */
const footed = (level) => {
  const stage = stageOf(level);
  for (const s of level.cast ?? []) {
    const f = floorAt(stage, s.x, s.y - 24);
    const onFloor = f !== null && Math.abs(f - s.y) < 2;
    const onPlat = level.platforms.some((p) => s.x >= p.x0 && s.x <= p.x1 && Math.abs(p.y - s.y) < 2);
    assert.ok(onFloor || onPlat, `${level.id}: ${s.id} floats at ${s.x}, ${s.y}`);
  }
};
/** Drives the scripted player from the venue's card to its exit; returns the game and the highest he climbed. */
const clear = (level, start, route, seed = 11) => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: level }, seed, { start });
  while (g.mode === "card") g.step(input());
  let t = 0, last = g.world.hero.x, stuck = 0, topY = 0;
  while (g.mode === "play" && t < 150) {
    g.step(drive(g.level, g.world.hero, route, g.world));
    t += STEP;
    topY = Math.min(topY, g.world.hero.y);
    if (Math.floor(t * 2) !== Math.floor((t - STEP) * 2)) {
      stuck = g.world.hero.x <= last + 1 ? stuck + 1 : 0;
      last = g.world.hero.x;
      assert.ok(stuck < 6, `${g.level.id} ${route}: stuck at ${g.world.hero.x}, ${g.world.hero.y}`);
    }
  }
  return { g, topY };
};

test("the restaurant keeps the spec's shape: its length, two clocks, the three bands, an early pepper, the truck well its only pit", () => {
  const R = RESTAURANT;
  assert.ok(R.length >= 14000 && R.length <= 18000);
  assert.equal(R.checkpoints.length, 2);
  assert.ok(R.platforms.some((p) => p.y === -180) && R.platforms.some((p) => p.y === -520), "counters at 180, the pot rack at 520");
  assert.deepEqual(pitsOf(R), [{ x0: 13600, x1: 13930, y: -200 }]);
  assert.ok(Math.min(...R.crates.filter((c) => c.kind === "pepper").map((c) => c.x)) < 1200, "an early pepper");
  assert.deepEqual(R.heat.map((z) => z.kind), ["flattop", "flattop", "freezer"]);
  for (const z of R.heat.filter((z) => z.kind === "flattop"))
    assert.ok(R.platforms.some((p) => p.kind === "flattop" && p.x0 === z.x0 && p.x1 === z.x1 && p.y === z.y), "each flat-top zone is a flat-top's top");
  const freezer = R.heat.find((z) => z.kind === "freezer");
  assert.ok(!R.platforms.some((p) => p.y === -180 && p.x1 > freezer.x0 && p.x0 < freezer.x1), "no counter in front of the walk-in's door");
  assert.equal(R.swingDoors[0].server, "server-kitchen");
  const k = R.cast.find((s) => s.id === "server-kitchen");
  assert.ok(k.x0 < R.swingDoors[0].x && k.x1 > R.swingDoors[0].x, "her patrol crosses the door");
  for (const d of ["PRIVATE DINING", "DELIVERIES"]) assert.ok(R.doors.some((x) => x.label === d), d);
  assert.equal(R.cast.length, 8);
  footed(R);
});

test("the pot rack is reached from the counters, never from the floor; no crate hangs under it", () => {
  const rack = RESTAURANT.platforms.find((p) => p.kind === "rack");
  const counters = RESTAURANT.platforms.filter((p) => (p.kind === "steel" || p.kind === "flattop") && p.x1 > rack.x0 && p.x0 < rack.x1);
  assert.ok(counters.length > 0 && counters.every((c) => c.y - rack.y < REACH), "a jump from a counter reaches it");
  assert.ok(0 - rack.y > REACH, "a jump from the floor does not");
  for (const c of RESTAURANT.crates) assert.ok(c.x < rack.x0 - 100 || c.x > rack.x1 + 100, `crate ${c.id} under the rack`);
});

test("every run of the restaurant has a can, nuts and a Buc-ee's on the line's floor and up on the rack", () => {
  assert.deepEqual(RESTAURANT.routes.map((r) => r.id), ["line", "rack"]);
  for (let seed = 1; seed <= 24; seed++) {
    const p = seedRewards(RESTAURANT, seed);
    assert.equal(p.length, RESTAURANT.rewards.count);
    for (const r of RESTAURANT.routes)
      for (const kind of ["can", "nuts", "bucees"])
        assert.ok(p.some((q) => q.kind === kind && q.x >= r.x0 && q.x <= r.x1 && q.y >= r.y0 && q.y <= r.y1), `seed ${seed}: ${kind} on the ${r.id}`);
  }
});

test("a scripted player clears the restaurant by its floor route: alive, inside the clock, scoring on the cast", () => {
  const { g } = clear([RESTAURANT], 1, "floor");
  assert.equal(g.level.id, "restaurant");
  assert.equal(g.run.lives, 3, "no life lost");
  assert.ok(["walkoff", "tally", "clear"].includes(g.mode), `reached DELIVERIES (${g.mode} at ${g.world.hero.x})`);
  assert.ok(g.run.score > 0);
});

test("the lobby's exit now leads to the restaurant's card", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT] }, 7);
  while (g.mode === "card") g.step(input());
  g.world.hero.x = 15800;
  for (let i = 0; i < Math.round(20 / STEP) && g.mode !== "card"; i++) g.step(input({ right: true }));
  assert.deepEqual([g.mode, g.level.id], ["card", "restaurant"]);
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/venues.check.mjs` (no `restaurant.ts`).

- [ ] **Step 3: The level.** Create `src/sim/levels/restaurant.ts`:

```ts
import type { Level } from "../level";

/**
 * 1-2, the restaurant (R3 §3.1), in world px with the floor at 0 and up negative. Act 1, the dining room: the early
 * pepper, the host stand, booths and a table to hop, the first punch clock, the busser's dish cart and the bar to jump.
 * Act 2, the kitchen: the swinging door, the pass with the cook hidden behind it, the heat-lamp gantry to slide under,
 * then the line: steel counters with two flat-tops (they heat him) under the pot rack (520, reached only from the
 * counters), or the floor in front, where the second cook marches and the walk-in freezer stands open (it cools him).
 * Act 3, the loading dock: a ramp up, crates, the trash-bin busser, the truck well (the one pit) and the truck, the
 * dumpster and the DELIVERIES gate.
 */
export const RESTAURANT: Level = {
  id: "restaurant",
  name: "Restaurant",
  world: "1-2",
  length: 15800,
  spawn: { x: 300, y: 0 },
  time: 420,
  floor: [
    { x0: -400, x1: 5200, y0: 0, y1: 0, kind: "wood" },
    { x0: 5200, x1: 11000, y0: 0, y1: 0, kind: "quarry" },
    { x0: 11000, x1: 11600, y0: 0, y1: -200, kind: "ramp" },
    { x0: 11600, x1: 13600, y0: -200, y1: -200, kind: "concrete" },
    { x0: 13930, x1: 15000, y0: -200, y1: -200, kind: "truck" },
    { x0: 15000, x1: 16400, y0: 0, y1: 0, kind: "concrete" },
  ],
  platforms: [
    { x0: 1050, x1: 1250, y: -150, kind: "host" },
    { x0: 1600, x1: 2100, y: -110, kind: "booth" },
    { x0: 2300, x1: 2700, y: -160, kind: "table" },
    { x0: 2900, x1: 3400, y: -110, kind: "booth" },
    { x0: 5700, x1: 6900, y: -180, kind: "pass" },
    { x0: 7800, x1: 8300, y: -180, kind: "steel" },
    { x0: 8300, x1: 8700, y: -180, kind: "flattop" },
    { x0: 8700, x1: 9000, y: -180, kind: "steel" },
    { x0: 9500, x1: 9900, y: -180, kind: "flattop" },
    { x0: 9900, x1: 10400, y: -180, kind: "steel" },
    { x0: 8000, x1: 10200, y: -520, kind: "rack" },
    { x0: 12000, x1: 12300, y: -340, kind: "crates" },
    { x0: 12500, x1: 12700, y: -480, kind: "crates" },
    { x0: 15150, x1: 15500, y: -220, kind: "dumpster" },
  ],
  solids: [{ x: 4300, y: -180, w: 700, h: 180 }],
  passes: [{ x: 7100, y: -1000, w: 500, h: 780, kind: "gantry" }],
  bounds: { x: -400, y: -1600, w: 16400, h: 2200 },
  crates: [
    { id: "pepper-host", kind: "pepper", x: 760, y: -435 },
    { id: "can-booth", kind: "can", x: 1850, y: -545 },
    { id: "can-bar", kind: "can", x: 4650, y: -615 },
    { id: "pepper-dock", kind: "pepper", x: 11800, y: -635 },
    { id: "case-dock", kind: "case", x: 12850, y: -635 },
  ],
  doors: [
    { id: "private", kind: "closed", x: 1430, y: 0, label: "PRIVATE DINING", opens: "Opens later" },
    { id: "out", kind: "exit", x: 15750, y: 0, label: "DELIVERIES" },
  ],
  checkpoints: [
    { id: "host", x: 3650, y: 0 },
    { id: "line", x: 10700, y: 0 },
  ],
  signs: [
    { x: 200, y: -700, label: "RESTAURANT", note: "! supplies · jump + hammer" },
    { x: 2300, y: -760, label: "DINING ROOM", note: "Hop the booths" },
    { x: 5450, y: -760, label: "KITCHEN", note: "Mind the swinging door" },
    { x: 7900, y: -820, label: "THE LINE", note: "Flat-tops burn · the walk-in cools" },
    { x: 11400, y: -820, label: "LOADING DOCK", note: "Jump the truck well" },
  ],
  furniture: [
    { kind: "bar", x: 4300, y: -180, w: 700, h: 180 },
    { kind: "lamps", x: 5700, y: -470, w: 1200, h: 90 },
    { kind: "freezer", x: 9000, y: -400, w: 500, h: 400 },
    { kind: "truck", x: 13930, y: -560, w: 1070, h: 360 },
  ],
  // The busser's dish cart before the bar; the dock busser's trash bin.
  carts: [3880, 13080],
  lights: [
    { x: 1300, y: -640, radius: 900, intensity: 0.5 },
    { x: 3600, y: -640, radius: 900, intensity: 0.5 },
    { x: 6300, y: -560, radius: 800, intensity: 0.55 },
    { x: 8600, y: -760, radius: 900, intensity: 0.5 },
    { x: 10000, y: -760, radius: 900, intensity: 0.5 },
    { x: 12500, y: -900, radius: 900, intensity: 0.45 },
    { x: 14800, y: -900, radius: 900, intensity: 0.4 },
  ],
  camera: { zones: [{ x0: 7600, x1: 10600, zoom: 0.88 }] },
  rewards: { count: Math.ceil(15800 / 544), bucees: 3, nuts: 7 },
  routes: [
    { id: "line", x0: 7600, x1: 10400, y0: -100, y1: 0 },
    { id: "rack", x0: 8000, x1: 10200, y0: -600, y1: -560 },
  ],
  music: "day",
  hints: { early: 1500 },
  pitWord: "DELIVERY REFUSED",
  heat: [
    { x0: 8300, x1: 8700, y: -180, rate: 20, kind: "flattop" },
    { x0: 9500, x1: 9900, y: -180, rate: 20, kind: "flattop" },
    { x0: 9000, x1: 9500, y: 0, rate: -30, kind: "freezer" },
  ],
  swingDoors: [{ id: "kitchen", x: 5200, y: 0, server: "server-kitchen" }],
  // The cast (R3 §3.1): the host and a server in the dining room, the busser and his dish cart, the kitchen server through
  // the door, the cook behind the pass and the second on the line, the dock's busser with his bin, a server on her break.
  cast: [
    { id: "server-host", person: "server-2", x: 1150, y: 0, x0: 900, x1: 1500, recolor: "#4b2a5c" },
    { id: "server-booths", person: "server-1", x: 2800, y: 0, x0: 2200, x1: 3500 },
    { id: "busser-dining", person: "busser-1", x: 4030, y: 0, cart: 3880, load: "dishes" },
    { id: "server-kitchen", person: "server-1", x: 5550, y: 0, x0: 4900, x1: 6000, recolor: "#7a1f2b", size: 0.97 },
    { id: "cook-pass", person: "cook-1", x: 6300, y: 0, hide: true },
    { id: "cook-line", person: "cook-1", x: 8600, y: 0, x0: 7700, x1: 10400, recolor: "#26262a" },
    { id: "busser-dock", person: "busser-1", x: 13230, y: -200, cart: 13080, load: "trash", recolor: "#6b1f2a" },
    { id: "server-break", person: "server-2", x: 14650, y: -200, x0: 14100, x1: 14950 },
  ],
  backdrop: {
    walls: ["restaurant-far-1", "restaurant-far-2", "restaurant-far-3"],
    mid: [
      { name: "restaurant-mid-1", x: 900 },
      { name: "restaurant-mid-2", x: 4500 },
      { name: "restaurant-mid-3", x: 6200 },
      { name: "restaurant-mid-4", x: 7400 },
      { name: "restaurant-mid-5", x: 10600 },
      { name: "restaurant-mid-6", x: 12400 },
    ],
    fore: [
      { name: "restaurant-fore-1", x: 2500 },
      { name: "restaurant-fore-2", x: 11300 },
    ],
  },
};
```

- [ ] **Step 4: Its drawing.**

Create `src/render/ink.ts` and move `venue.ts`'s ink and floor constants there (`venue.ts` imports them; `FLOOR_DEPTH`, `FLOOR_TOP` and `FLOOR_BACK` become `FLOOR.depth`, `FLOOR.top`, `FLOOR.back`):

```ts
import { PALETTE } from "./palette";

/** The play plane's ink (main spec §3): 4 px outlines on furniture, 3 px on its small parts. */
export const OUTLINE = 4;
export const INK = { width: OUTLINE, color: PALETTE.outline, join: "round" as const };
export const THIN = { width: 3, color: PALETTE.outline, join: "round" as const };
/** A floor's front face reaches `depth` below its top line; its top strip runs `back` toward the wall and `top` toward us. */
export const FLOOR = { depth: 120, top: 26, back: 34 } as const;
```

Create `src/render/venue-restaurant.ts`:

```ts
import type { Graphics } from "pixi.js";
import type { Furniture, LevelFloor, LevelPass, LevelPlatform } from "../sim/level";
import { FLOOR, INK, THIN } from "./ink";
import { PALETTE, highlightOf, shadowOf, tones } from "./palette";

/** The restaurant's materials: the dining room's wood, the kitchen's quarry tile, the dock's concrete, the line's steel. */
const C = {
  wood: "#6b4428",
  quarry: "#a3402f",
  concrete: "#80858a",
  steel: "#a7adb3",
  plate: "#2b2b2e",
  hot: "#ff5a1f",
  booth: "#2f3e6b",
  bar: "#4a2e1c",
  crate: "#b07a3e",
  dumpster: "#3d5a3f",
  truck: "#dcd6c8",
  hazard: "#e2b23a",
  pot: "#b8763a",
} as const;

/** A floor's top strip and its front face down to `bottom`: the lobby's marble in another material. */
function slab(g: Graphics, f: LevelFloor, color: string, bottom: number) {
  const t = tones(color);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, f.y1 + FLOOR.top, f.x0, f.y0 + FLOOR.top]).fill(t.highlight);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, bottom, f.x0, bottom]).fill(t.base);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, f.y1 + FLOOR.top + 10, f.x0, f.y0 + FLOOR.top + 10]).fill(t.shadow);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, bottom, f.x0, bottom]).stroke(INK);
}

/** A steel counter's body from its top down to the floor: legs, an undershelf of stock pots, the top's edge. */
function counterBody(g: Graphics, p: LevelPlatform) {
  const steel = tones(C.steel);
  const w = p.x1 - p.x0;
  for (const x of [p.x0 + 16, p.x1 - 34]) g.rect(x, p.y + 20, 18, -p.y - 20).fill(steel.shadow).stroke(THIN);
  g.rect(p.x0 + 16, -60, w - 32, 14).fill(steel.base).stroke(THIN);
  for (let x = p.x0 + 50; x < p.x1 - 90; x += 120) g.rect(x, -120, 70, 60).fill(steel.highlight).stroke(THIN);
}

export function restaurantFloor(g: Graphics, f: LevelFloor): boolean {
  // A raised floor (the dock, the truck's bed) is a block down to the lane; one at the floor shows its usual depth.
  const low = Math.max(f.y0, f.y1);
  const bottom = low < 0 ? FLOOR.depth : low + FLOOR.depth;
  switch (f.kind) {
    case "wood":
      slab(g, f, C.wood, bottom);
      for (let x = f.x0 + 90; x < f.x1; x += 180) g.moveTo(x, f.y0 - FLOOR.back + 4).lineTo(x - 12, f.y0 + FLOOR.top - 2).stroke({ width: 2, color: shadowOf(C.wood) });
      return true;
    case "quarry":
      slab(g, f, C.quarry, bottom);
      for (let x = f.x0 + 100; x < f.x1; x += 100) g.moveTo(x, f.y0 - FLOOR.back).lineTo(x, f.y0 + FLOOR.top).stroke({ width: 3, color: shadowOf(C.quarry) });
      g.moveTo(f.x0, f.y0 - 4).lineTo(f.x1, f.y1 - 4).stroke({ width: 3, color: shadowOf(C.quarry) });
      return true;
    case "concrete":
      slab(g, f, C.concrete, bottom);
      // The dock's bumper along its edge.
      if (f.y0 < 0) g.rect(f.x0, f.y0 + FLOOR.top + 14, f.x1 - f.x0, 22).fill(C.hazard);
      for (let x = f.x0 + 360; x < f.x1; x += 360) g.moveTo(x, f.y0 + FLOOR.top + 40).lineTo(x, bottom).stroke({ width: 2, color: shadowOf(C.concrete), alpha: 0.6 });
      return true;
    case "ramp": {
      const t = tones(C.concrete);
      g.poly([f.x0, f.y0, f.x1, f.y1, f.x1, FLOOR.depth, f.x0, FLOOR.depth]).fill(t.base);
      g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, f.y1 + 8, f.x0, f.y0 + 8]).fill(t.highlight);
      g.moveTo(f.x0, f.y0 + 4).lineTo(f.x1, f.y1 + 4).stroke({ width: 10, color: C.hazard });
      g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, FLOOR.depth, f.x0, FLOOR.depth]).stroke(INK);
      return true;
    }
    case "truck": {
      // The lane under the truck (drawn only: nothing stands there), the trailer's steel bed and its two axles.
      g.rect(f.x0, FLOOR.top, f.x1 - f.x0, FLOOR.depth - FLOOR.top).fill(tones(C.concrete).shadow);
      const t = tones("#5c6168");
      g.rect(f.x0, f.y0 - 10, f.x1 - f.x0, 40).fill(t.base);
      g.rect(f.x0, f.y0 + 30, f.x1 - f.x0, 30).fill(t.shadow);
      g.rect(f.x0, f.y0 - 10, f.x1 - f.x0, 70).stroke(INK);
      for (const x of [f.x1 - 260, f.x1 - 120]) {
        g.circle(x, -48, 48).fill("#1a1a1a").stroke(THIN);
        g.circle(x, -48, 18).fill("#8a8a8a");
      }
      g.rect(f.x0 + 40, f.y0 + 60, 30, -f.y0 - 60).fill(t.shadow).stroke(THIN);
      return true;
    }
  }
  return false;
}

export function restaurantPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  switch (p.kind) {
    case "host": {
      // The host's podium: a wood stand with the reservation book on it.
      const wood = tones(C.bar);
      g.rect(p.x0 + 20, p.y + 18, w - 40, -p.y - 18).fill(wood.base);
      g.rect(p.x1 - 60, p.y + 18, 40, -p.y - 18).fill(wood.shadow);
      g.rect(p.x0 + 20, p.y + 18, w - 40, -p.y - 18).stroke(INK);
      g.rect(p.x0, p.y - 4, w, 22).fill(wood.highlight).stroke(INK);
      g.rect(p.x0 + 40, p.y - 22, 70, 18).fill("#7a1f2b").stroke(THIN);
      return true;
    }
    case "booth": {
      // A navy tufted booth: its tall back behind, the seat he stands on, its wood plinth.
      const v = tones(C.booth);
      g.roundRect(p.x0 + 10, p.y - 190, w - 20, 200, 20).fill(v.shadow).stroke(INK);
      for (let x = p.x0 + 40; x < p.x1 - 30; x += 60) g.moveTo(x, p.y - 176).lineTo(x, p.y - 8).stroke({ width: 3, color: shadowOf(v.shadow) });
      g.roundRect(p.x0, p.y, w, 70, 14).fill(v.base).stroke(INK);
      g.roundRect(p.x0 + 12, p.y + 6, w - 24, 10, 5).fill(v.highlight);
      g.rect(p.x0 + 16, p.y + 70, w - 32, -p.y - 70).fill(tones(C.bar).shadow).stroke(THIN);
      return true;
    }
    case "pass": {
      // The pass: a steel counter, plates waiting along its back under the lamps (drawn as furniture above it).
      counterBody(g, p);
      g.rect(p.x0 - 10, p.y - 6, w + 20, 26).fill(tones(C.steel).highlight).stroke(INK);
      for (let x = p.x0 + 60; x < p.x1 - 40; x += 140) {
        g.ellipse(x, p.y - 8, 36, 8).fill("#ffffff").stroke({ width: 2, color: PALETTE.outline });
        g.ellipse(x, p.y - 14, 18, 6).fill("#d98a3a");
      }
      return true;
    }
    case "steel": {
      counterBody(g, p);
      g.rect(p.x0 - 6, p.y - 6, w + 12, 26).fill(tones(C.steel).highlight).stroke(INK);
      return true;
    }
    case "flattop": {
      // A flat-top griddle: a black plate glowing at its seams, knobs on its front, heat shimmering off it.
      const steel = tones(C.steel);
      g.rect(p.x0, p.y + 20, w, -p.y - 20).fill(steel.shadow).stroke(INK);
      for (let x = p.x0 + 40; x < p.x1 - 20; x += 70) g.circle(x, p.y + 60, 12).fill(PALETTE.outline);
      g.rect(p.x0 - 6, p.y - 6, w + 12, 26).fill(C.plate).stroke(INK);
      for (let x = p.x0 + 30; x < p.x1 - 20; x += 60) g.moveTo(x, p.y + 2).lineTo(x + 30, p.y + 2).stroke({ width: 4, color: C.hot, cap: "round" });
      g.rect(p.x0 - 6, p.y + 14, w + 12, 6).fill({ color: C.hot, alpha: 0.8 });
      for (let x = p.x0 + 50; x < p.x1; x += 110)
        g.moveTo(x, p.y - 20).quadraticCurveTo(x + 14, p.y - 50, x, p.y - 80).stroke({ width: 3, color: "#ffffff", alpha: 0.35, cap: "round" });
      return true;
    }
    case "rack": {
      // The pot rack: a wire shelf hung on chains from the ceiling, pots and pans standing on it.
      const steel = tones(C.steel);
      for (const x of [p.x0 + 30, p.x1 - 30]) g.moveTo(x, p.y).lineTo(x, -1200).stroke({ width: 5, color: steel.shadow });
      g.rect(p.x0, p.y - 4, w, 20).fill(steel.base).stroke(INK);
      for (let x = p.x0 + 14; x < p.x1; x += 28) g.moveTo(x, p.y).lineTo(x, p.y + 14).stroke({ width: 2, color: steel.shadow });
      const pot = tones(C.pot);
      for (let x = p.x0 + 120; x < p.x1 - 120; x += 260) {
        g.roundRect(x - 50, p.y - 70, 100, 66, 8).fill(pot.base).stroke(THIN);
        g.rect(x - 50, p.y - 70, 100, 10).fill(pot.highlight);
      }
      return true;
    }
    case "crates": {
      // Produce crates stacked up from the dock, one box per 100 px of height.
      const wood = tones(C.crate);
      const floor = -200;
      for (let y = floor; y > p.y + 1; y -= 100)
        for (let x = p.x0; x < p.x1 - 1; x += 150) {
          const cw = Math.min(150, p.x1 - x);
          const top = Math.max(p.y, y - 100);
          g.rect(x, top, cw, y - top).fill(wood.base).stroke(THIN);
          g.moveTo(x + 6, top + (y - top) / 2).lineTo(x + cw - 6, top + (y - top) / 2).stroke({ width: 3, color: wood.shadow });
        }
      g.rect(p.x0, p.y, w, 10).fill(wood.highlight);
      return true;
    }
    case "dumpster": {
      const body = tones(C.dumpster);
      g.poly([p.x0 + 10, p.y + 20, p.x1 - 10, p.y + 20, p.x1 - 24, -30, p.x0 + 24, -30]).fill(body.base).stroke(INK);
      g.poly([p.x1 - 70, p.y + 20, p.x1 - 10, p.y + 20, p.x1 - 24, -30, p.x1 - 76, -30]).fill(body.shadow);
      g.rect(p.x0, p.y - 4, w, 26).fill(PALETTE.outline);
      for (const x of [p.x0 + 50, p.x1 - 50]) g.circle(x, -16, 16).fill("#1a1a1a").stroke(THIN);
      return true;
    }
  }
  return false;
}

export function restaurantFurniture(g: Graphics, f: Furniture): boolean {
  switch (f.kind) {
    case "bar": {
      // The bar: wood panels and a brass foot rail under a marble top, glasses along its back.
      const wood = tones(C.bar);
      const brass = tones(PALETTE.brass);
      g.rect(f.x, f.y, f.w, f.h).fill(wood.base).stroke(INK);
      for (let x = f.x + 40; x < f.x + f.w - 120; x += 160) g.roundRect(x, f.y + 50, 120, f.h - 80, 6).stroke({ width: 3, color: wood.shadow });
      g.rect(f.x, f.h + f.y - 40, f.w, 12).fill(brass.base);
      g.rect(f.x - 14, f.y - 10, f.w + 28, 30).fill(PALETTE.marbleTop).stroke(INK);
      for (let x = f.x + 40; x < f.x + f.w - 30; x += 90)
        g.poly([x, f.y - 10, x + 20, f.y - 10, x + 24, f.y - 44, x - 4, f.y - 44]).fill({ color: "#a9c7cf", alpha: 0.8 }).stroke({ width: 2, color: PALETTE.outline });
      return true;
    }
    case "lamps": {
      // Heat lamps over the pass: cords from above, red hoods, an orange glow (the light layer blooms it).
      for (let x = f.x + 100; x < f.x + f.w; x += 200) {
        g.moveTo(x, f.y - 600).lineTo(x, f.y).stroke({ width: 4, color: PALETTE.outline });
        g.poly([x - 40, f.y + f.h, x + 40, f.y + f.h, x + 22, f.y, x - 22, f.y]).fill("#b8282e").stroke(THIN);
        g.ellipse(x, f.y + f.h + 6, 34, 10).fill({ color: "#ffb347", alpha: 0.9 });
      }
      return true;
    }
    case "freezer": {
      // The walk-in: a steel wall panel with its heavy door swung wide, frost and dark cold inside.
      const steel = tones(C.steel);
      g.rect(f.x - 60, f.y - 40, f.w + 120, f.h + 40).fill(steel.base).stroke(INK);
      g.rect(f.x, f.y, f.w, f.h).fill("#1d3346");
      for (let k = 0; k < 6; k++) g.rect(f.x + 30 + k * 76, f.y + 40, 40, f.h - 40).fill({ color: "#9fd3f2", alpha: 0.12 });
      g.rect(f.x - 150, f.y, 90, f.h).fill(steel.highlight).stroke(THIN);
      g.roundRect(f.x - 130, f.y + f.h * 0.45, 50, 20, 6).fill(PALETTE.outline);
      g.rect(f.x, f.y + f.h - 50, f.w, 50).fill({ color: "#dff3ff", alpha: 0.35 });
      return true;
    }
    case "truck": {
      // The trailer's box over its bed, its roll-up door open on the dock's side, boxes inside, tail lights.
      const box = tones(C.truck);
      g.rect(f.x, f.y, f.w, f.h).fill(box.base).stroke(INK);
      g.rect(f.x, f.y, 80, f.h).fill("#1c1f24");
      for (let k = 0; k < 3; k++) g.rect(f.x + 10, f.y + f.h - 70 - k * 60, 60, 56).fill(tones(C.crate).base).stroke(THIN);
      g.rect(f.x + f.w - 30, f.y + f.h - 60, 20, 30).fill("#d9302a").stroke(THIN);
      g.rect(f.x + 100, f.y + 40, f.w - 160, 12).fill(box.shadow);
      return true;
    }
  }
  return false;
}

/** The kitchen's heat-lamp gantry over the line's way in: a steel beam on two posts, lamps glowing under it, a low clearance. */
export function drawGantry(g: Graphics, p: LevelPass): void {
  const steel = tones(C.steel);
  const bottom = p.y + p.h;
  g.rect(p.x, bottom - 90, p.w, 90).fill(steel.base).stroke(INK);
  g.rect(p.x, bottom - 20, p.w, 20).fill(steel.shadow);
  for (const x of [p.x + 10, p.x + p.w - 34]) g.rect(x, p.y, 24, bottom - 90 - p.y).fill(steel.shadow).stroke(THIN);
  for (let x = p.x + 60; x < p.x + p.w - 30; x += 90) g.ellipse(x, bottom + 4, 26, 8).fill({ color: "#ffb347", alpha: 0.9 });
  g.rect(p.x + p.w / 2 - 90, bottom - 70, 180, 40).fill("#e2b23a").stroke(THIN);
}
```

`src/render/venue.ts`:
- `drawVenue`: furniture `if (!restaurantFurniture(back, f)) drawFurniture(back, f);`; passes `p.kind === "gantry" ? drawGantry(back, p) : drawPass(back, p, root)`; platforms `if (!restaurantPlatform(mid, p)) drawPlatform(mid, p);`; floors `if (!restaurantFloor(front, f)) drawFloor(front, f, level);`; `drawShaftPits(back, level)` becomes `drawPits(back, level)`:
  ```ts
  /** Every pit's drop below its floor line, dark; the lobby's shaft with its cables. */
  function drawPits(g: Graphics, level: Level) {
    for (const p of pitsOf(level)) {
      g.rect(p.x0, p.y - FLOOR.back, p.x1 - p.x0, 700).fill(COLORS.shaft);
      if (level.id === "lobby")
        for (const k of [0.35, 0.65]) g.moveTo(p.x0 + (p.x1 - p.x0) * k, p.y - FLOOR.back).lineTo(p.x0 + (p.x1 - p.x0) * k, p.y + 700).stroke({ width: 3, color: "#3a3640" });
      else for (const x of [p.x0, p.x1 - 24]) g.rect(x, p.y - FLOOR.back, 24, FLOOR.depth).fill(COLORS.hazard);
    }
  }
  ```
- The swinging doors: a `Graphics` for them added to `root` after the platforms, and:
  ```ts
  /** The kitchen's swinging door in its frame: the panel turns on its hinge like a card flipping toward us as it swings. */
  export function drawSwingDoor(g: Graphics, at: { x: number; y: number }, open: number, dir: 1 | -1): void {
    const w = 140;
    const h = 340;
    const steel = tones(COLORS.steel);
    g.rect(at.x - w / 2 - 16, at.y - h - 16, w + 32, h + 16).fill(PALETTE.wallWood).stroke(INK);
    g.rect(at.x - w / 2, at.y - h, w, h).fill("#1c1f24");
    const hinge = at.x + (dir * w) / 2;
    const span = w * Math.cos((open * Math.PI) / 2);
    const left = Math.min(hinge, hinge - dir * span);
    const width = Math.max(4, Math.abs(span));
    g.rect(left, at.y - h, width, h).fill(steel.base).stroke(THIN);
    g.circle(left + width / 2, at.y - h * 0.64, Math.min(20, width / 2)).fill({ color: "#cfe6f0", alpha: 0.85 }).stroke(THIN);
    g.rect(left, at.y - 70, width, 50).fill(steel.shadow);
  }
  ```
  `VenueView.setDoors(doors)`: `doorG.clear(); for (const s of level.swingDoors ?? []) { const d = doors.find((q) => q.id === s.id); const open = d && d.t > 0 ? Math.sin(Math.PI * (1 - d.t / SWING.swing)) : 0; drawSwingDoor(doorG, s, open, d?.dir ?? -1); }`.

`src/render/look.ts`:
- `const SHIFT: Level[] = [LOBBY, RESTAURANT];`.
- Each frame: `views.get(game.level.id)?.venue.setDoors(cur.doors);`.
- The heat zones on him: `const zone = heatZoneAt(world.stage, h); zoneT = zone ? zoneT + simDt : 0; if (zone && zoneT >= (zone.kind === "flattop" ? 0.1 : 0.12)) { zoneT = 0; particles.emit(zone.kind === "flattop" ? "steam" : "frost", x + (Math.random() - 0.5) * 80, floorY - 10, 1); }` (`let zoneT = 0;` beside `steamT`).
- The walk-in breathes: `fogT += simDt; if (fogT >= 0.3) { fogT = 0; const v = scene.view(); for (const z of game.level.heat ?? []) if (z.kind === "freezer" && z.x1 > v.x && z.x0 < v.x + v.w) particles.emit("frost", z.x0 + Math.random() * (z.x1 - z.x0), z.y - 40, 2); }`.
- The `castFell` word: `words.say(game.level.pitWord ?? "OUT OF ORDER", e.x, e.y - 400, true, face, view);`.

`src/sim/drive.ts`, `fight`: the reach reads the slope: `const level = (x: number, y: number) => Math.abs(y - h.y) < 80 + Math.abs(x - h.x) * 0.6;` and its uses pass `n.x, n.y` and `t.x, t.y`.

`scripts/run-browser.check.mjs`, from "The exit: walk in, the tally, the clear." to the end of "Play again", becomes:

```js
  // The exit: walk in, the tally, and the shift goes on in the restaurant.
  await tp(15700);
  await page.waitForTimeout(250);
  await hold(["ArrowRight"], 900);
  r = await waitFor((x) => x.mode === "tally", 3000);
  await shot("run-tally.png");
  r = await waitFor((x) => x.mode === "card" && x.level === "restaurant", 14000);
  assert.deepEqual([r.mode, r.level], ["card", "restaurant"], "the lobby leads to the restaurant");
  await page.waitForSelector("text=Your shift goes on", { timeout: 2000 });
  await shot("run-next-venue.png");
  await cardClearOfFace("veil-venue");
  r = await waitFor((x) => x.mode === "play", 5000);
  assert.ok(Math.abs(r.time - 420) < 1, "the restaurant's own clock");

  // Two falls down the truck well and a knockdown: game over, and Try again starts the shift over in the lobby.
  for (let i = 0; i < 2; i++) {
    await tp(13765, -260);
    await waitFor((x) => x.mode !== "play", 3000);
    await waitFor((x) => x.mode === "play", 6000);
  }
```
and after "Try again", the assertion: `assert.deepEqual([r.mode, r.lives, r.level], ["play", 3, "lobby"], "tried again, from the lobby");`. The header comment and the PASS line name the restaurant's card and the truck well.

- [ ] **Step 5: Run, expect PASS**: `npm run test:next`; `npm run test:game`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`. A failing scripted player is fixed in `drive.ts` (how it plays), never by making the level easier, unless a step of the level is unfair by the R2b fairness rules; say which.

- [ ] **Step 6: See it.** With the 8090 dev server: `run-browser.check.mjs`, `next-browser.check.mjs`, `cast-browser.check.mjs` pass. Open `http://127.0.0.1:8090/?next=1&venue=restaurant&dev=1` and play it through once: the booths, the bar, the swinging door's bang (stand in it once), the cook rearing up behind the pass, the gantry slide, a flat-top (steam at his feet, the heat bar climbing, the sizzle), the freezer (frost, the bar falling), the truck well (fall in once: DELIVERY REFUSED is the cast's word, his is the lost life), the exit's tally and the "Shift over" card. Screenshot each and look at them at full size: nothing over his face, every new piece of furniture inked like the lobby's.

- [ ] **Step 7: Commit** `src/sim/levels/restaurant.ts src/render src/sim/drive.ts scripts/venues.check.mjs scripts/run-browser.check.mjs`: "Build the restaurant: the dining room, the kitchen and the line, the loading dock". Push.

---

### Task 7: The campus

**Files:**
- Create: `src/sim/levels/campus.ts`, `src/render/venue-campus.ts`
- Modify: `src/render/venue.ts`, `src/render/look.ts`, `src/sim/drive.ts`
- Test: `scripts/venues.check.mjs`

**Interfaces:**
- Consumes: Task 6's `ink.ts`, the dispatch in `drawVenue`, `clear` and `footed` in the test file.
- Produces: `CAMPUS: Level`; `campusFloor(g, f): boolean`, `campusPlatform(g, p): boolean`, `campusFurniture(g, f): boolean`, `drawBeltTrays(g, f, t)` in `src/render/venue-campus.ts`; `drive`'s balcony route hops onto a `tray` as onto a `landing`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/venues.check.mjs`; import `CAMPUS` from `../src/sim/levels/campus.ts`)

```js
test("the campus keeps the spec's shape: its length, two clocks, the bands, an early pepper, no pit", () => {
  const K = CAMPUS;
  assert.ok(K.length >= 14000 && K.length <= 18000);
  assert.equal(K.checkpoints.length, 2);
  assert.deepEqual(pitsOf(K), []);
  assert.ok(Math.min(...K.crates.filter((c) => c.kind === "pepper").map((c) => c.x)) < 1200);
  assert.ok(K.platforms.some((p) => p.kind === "deck" && p.y === -520), "the deck at 520");
  const belt = K.floor.find((f) => f.kind === "belt");
  assert.ok(belt.belt > 0 && belt.y1 < belt.y0, "a belt rising to the right");
  for (const f of K.floor.filter((f) => f.kind === "steps")) {
    const deg = (Math.atan2(Math.abs(f.y1 - f.y0), f.x1 - f.x0) * 180) / Math.PI;
    assert.ok(Math.abs(deg - 30) < 0.5, `30-degree steps: ${deg}`);
  }
  for (const d of ["SKILLS LAB", "LIBRARY"]) assert.ok(K.doors.some((x) => x.label === d), d);
  assert.equal(K.cast.length, 12);
  footed(K);
});

test("the deck is out of reach from the floor and nothing under it reaches it; the fountain's top is reached from its rim, not the plaza", () => {
  const deck = CAMPUS.platforms.find((p) => p.kind === "deck");
  assert.ok(0 - deck.y > REACH, "not from the floor");
  for (const p of CAMPUS.platforms) if (p !== deck && p.x1 > deck.x0 && p.x0 < deck.x1) assert.ok(p.y - deck.y > 300 + 100, `${p.kind} at ${p.y} under the deck`);
  const tray = CAMPUS.platforms.find((p) => p.kind === "tray");
  const belt = CAMPUS.floor.find((f) => f.kind === "belt");
  assert.ok(tray.x1 === belt.x0 && tray.y === belt.y0 && -tray.y < REACH, "the tray counter, a hop up, feeds the belt");
  assert.ok(belt.x1 === deck.x0 && belt.y1 === deck.y, "the belt delivers onto the deck");
  const rim = CAMPUS.platforms.find((p) => p.kind === "fountain");
  const tier = CAMPUS.platforms.find((p) => p.kind === "tier");
  assert.ok(rim.y - tier.y < REACH && -200 - tier.y > REACH, "the tier from the rim, never from the plaza");
});

test("the library's ledges are each reached from the flight or landing beside them", () => {
  const stage = stageOf(CAMPUS);
  for (const l of CAMPUS.platforms.filter((p) => p.kind === "ledge")) {
    const near = Math.max(...[l.x0, l.x1, l.x1 + 100].map((x) => -(floorAt(stage, x, -2000) ?? 0)));
    assert.ok(-l.y - near < REACH, `ledge at ${l.x0}: ${-l.y - near} px above its footing`);
  }
});

test("every run of the campus has a can, nuts and a Buc-ee's under the deck and on it", () => {
  assert.deepEqual(CAMPUS.routes.map((r) => r.id), ["floor", "deck"]);
  for (let seed = 1; seed <= 24; seed++) {
    const p = seedRewards(CAMPUS, seed);
    for (const r of CAMPUS.routes)
      for (const kind of ["can", "nuts", "bucees"])
        assert.ok(p.some((q) => q.kind === kind && q.x >= r.x0 && q.x <= r.x1 && q.y >= r.y0 && q.y <= r.y1), `seed ${seed}: ${kind} on the ${r.id}`);
  }
});

test("a scripted player clears the campus by the floor and by the deck: alive, inside the clock", () => {
  for (const route of ["floor", "balcony"]) {
    const { g, topY } = clear([RESTAURANT, CAMPUS], 2, route);
    assert.equal(g.level.id, "campus");
    assert.equal(g.run.lives, 3, `${route}: no life lost`);
    assert.ok(["walkoff", "tally", "clear"].includes(g.mode), `${route}: reached the LIBRARY (${g.mode} at ${g.world.hero.x})`);
    assert.ok(topY <= -880, `${route}: up the library steps`);
  }
});

test("the shift runs lobby, restaurant, campus, then it is over", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT, CAMPUS] }, 7);
  const seen = [g.level.id];
  for (let i = 0; i < 3; i++) {
    while (g.mode === "card") g.step(input());
    const exit = g.level.doors.find((d) => d.kind === "exit");
    Object.assign(g.world.hero, { x: exit.x - 120, y: exit.y, vx: 0, vy: 0 });
    for (let k = 0; k < Math.round(20 / STEP) && g.mode !== "card" && g.mode !== "clear"; k++) g.step(input({ right: true }));
    seen.push(g.mode === "clear" ? "clear" : g.level.id);
  }
  assert.deepEqual(seen, ["lobby", "restaurant", "campus", "clear"]);
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/venues.check.mjs`.

- [ ] **Step 3: The level.** Create `src/sim/levels/campus.ts`:

```ts
import type { Level } from "../level";

/**
 * 1-3, the campus (R3 §3.2). Act 1, the quad, outdoors: steps up to a plaza, benches with students on them, the fountain
 * (its rim, and its top tier from the rim), the professor marching with his book, steps down, the SKILLS LAB door and the
 * first punch clock. Act 2, the dining commons: the serving line and the lunch worker; then two ways: hop onto the tray
 * return and ride its conveyor up to the seating deck (520, out of reach from the floor; students on it), or stay on the
 * floor under it (an office worker, a second lunch worker, paper from above); stairs down where they meet; the second
 * clock. Act 3, the library steps: three flights and their landings up to the LIBRARY, students firing down them and a
 * second professor walking them.
 */
export const CAMPUS: Level = {
  id: "campus",
  name: "Campus",
  world: "1-3",
  length: 16400,
  spawn: { x: 300, y: 0 },
  time: 420,
  floor: [
    { x0: -400, x1: 1200, y0: 0, y1: 0, kind: "brick" },
    { x0: 1200, x1: 1546, y0: 0, y1: -200, kind: "steps" },
    { x0: 1546, x1: 4200, y0: -200, y1: -200, kind: "brick" },
    { x0: 4200, x1: 4546, y0: -200, y1: 0, kind: "steps" },
    { x0: 4546, x1: 5000, y0: 0, y1: 0, kind: "brick" },
    { x0: 5000, x1: 12000, y0: 0, y1: 0, kind: "terrazzo" },
    { x0: 7400, x1: 8300, y0: -120, y1: -520, belt: 220, kind: "belt" },
    { x0: 10400, x1: 11300, y0: -520, y1: 0, kind: "steps" },
    { x0: 12000, x1: 12520, y0: 0, y1: -300, kind: "steps" },
    { x0: 12520, x1: 13000, y0: -300, y1: -300, kind: "stone" },
    { x0: 13000, x1: 13520, y0: -300, y1: -600, kind: "steps" },
    { x0: 13520, x1: 14000, y0: -600, y1: -600, kind: "stone" },
    { x0: 14000, x1: 14520, y0: -600, y1: -900, kind: "steps" },
    { x0: 14520, x1: 16800, y0: -900, y1: -900, kind: "stone" },
  ],
  platforms: [
    { x0: 1800, x1: 2100, y: -300, kind: "bench" },
    { x0: 2300, x1: 3100, y: -310, kind: "fountain" },
    { x0: 2600, x1: 2800, y: -610, kind: "tier" },
    { x0: 3400, x1: 3700, y: -300, kind: "bench" },
    { x0: 5600, x1: 7000, y: -180, kind: "serving" },
    { x0: 7150, x1: 7400, y: -120, kind: "tray" },
    { x0: 8300, x1: 10400, y: -520, kind: "deck" },
    { x0: 8600, x1: 9200, y: -110, kind: "table" },
    { x0: 9600, x1: 10200, y: -110, kind: "bench" },
    { x0: 12280, x1: 12460, y: -520, kind: "ledge" },
    { x0: 13280, x1: 13460, y: -820, kind: "ledge" },
  ],
  solids: [],
  passes: [],
  bounds: { x: -400, y: -2200, w: 17200, h: 2800 },
  crates: [
    { id: "pepper-quad", kind: "pepper", x: 760, y: -435 },
    { id: "can-serving", kind: "can", x: 6300, y: -615 },
    { id: "pepper-library", kind: "pepper", x: 11800, y: -435 },
    { id: "case-terrace", kind: "case", x: 15300, y: -1335 },
  ],
  doors: [
    { id: "skills", kind: "closed", x: 4750, y: 0, label: "SKILLS LAB", opens: "Opens with the Skills Lab" },
    { id: "out", kind: "exit", x: 16000, y: -900, label: "LIBRARY" },
  ],
  checkpoints: [
    { id: "commons", x: 5150, y: 0 },
    { id: "library", x: 11500, y: 0 },
  ],
  signs: [
    { x: 200, y: -700, label: "CAMPUS", note: "! supplies · jump + hammer" },
    { x: 2700, y: -1000, label: "THE QUAD", note: "Students throw paper · E lectures them" },
    { x: 6300, y: -800, label: "DINING COMMONS", note: "Ride the tray return up, or stay on the floor" },
    { x: 12300, y: -900, label: "LIBRARY STEPS", note: "Paper from above · keep climbing" },
  ],
  furniture: [
    { kind: "lampPost", x: 1680, y: -700, w: 40, h: 500 },
    { kind: "fountain", x: 2300, y: -620, w: 800, h: 420 },
    { kind: "lampPost", x: 4000, y: -700, w: 40, h: 500 },
    { kind: "sneeze", x: 5600, y: -330, w: 1400, h: 150 },
    { kind: "slot", x: 8150, y: -860, w: 260, h: 320 },
  ],
  carts: [],
  lights: [
    { x: 1680, y: -720, radius: 600, intensity: 0.3 },
    { x: 4000, y: -720, radius: 600, intensity: 0.3 },
    { x: 6300, y: -760, radius: 900, intensity: 0.45 },
    { x: 8800, y: -1100, radius: 900, intensity: 0.45 },
    { x: 10100, y: -1100, radius: 900, intensity: 0.45 },
    { x: 13000, y: -1100, radius: 900, intensity: 0.4 },
    { x: 15200, y: -1500, radius: 900, intensity: 0.45 },
  ],
  camera: {
    zones: [
      { x0: 7900, x1: 10800, zoom: 0.88 },
      { x0: 11800, x1: 16800, zoom: 0.88 },
    ],
  },
  rewards: { count: Math.ceil(16400 / 544), bucees: 3, nuts: 7 },
  routes: [
    { id: "floor", x0: 8300, x1: 10400, y0: -100, y1: 0 },
    { id: "deck", x0: 8300, x1: 10400, y0: -600, y1: -560 },
  ],
  music: "day",
  hints: { early: 1500 },
  // The cast (R3 §3.2).
  cast: [
    { id: "student-bench-1", person: "student-1", x: 1950, y: -300, sit: true, recolor: "#c9a227", size: 1.03 },
    { id: "student-bench-2", person: "student-2", x: 3550, y: -300, sit: true },
    { id: "prof-quad", person: "prof-1", x: 3950, y: -200, x0: 3300, x1: 4150 },
    { id: "lunch-line", person: "lunch-1", x: 5400, y: 0, x0: 5200, x1: 6900 },
    { id: "student-deck-1", person: "student-1", x: 8700, y: -520 },
    { id: "student-deck-2", person: "student-2", x: 9500, y: -520, recolor: "#2a8c8a", size: 1.02 },
    { id: "office-commons", person: "office-1", x: 9400, y: 0, x0: 8500, x1: 10300, recolor: "#c8d8b0" },
    { id: "lunch-salad", person: "lunch-1", x: 10050, y: 0, x0: 9600, x1: 10400, recolor: "#9b2335" },
    { id: "student-steps-1", person: "student-2", x: 12850, y: -300, recolor: "#b5532a" },
    { id: "prof-steps", person: "prof-1", x: 13300, y: -473, x0: 12520, x1: 13520, recolor: "#5d6066" },
    { id: "student-steps-2", person: "student-1", x: 13850, y: -600, recolor: "#8a3b8f", size: 0.98 },
    { id: "student-terrace", person: "student-2", x: 14800, y: -900 },
  ],
  backdrop: {
    walls: ["campus-far-1", "campus-far-2", "campus-far-3"],
    mid: [
      { name: "campus-mid-1", x: 1000 },
      { name: "campus-mid-2", x: 4400 },
      { name: "campus-mid-3", x: 7000 },
      { name: "campus-mid-4", x: 9000 },
      { name: "campus-mid-5", x: 10800 },
      { name: "campus-mid-6", x: 11600 },
    ],
    fore: [
      { name: "campus-fore-1", x: 3000 },
      { name: "campus-fore-2", x: 12400 },
    ],
  },
};
```

- [ ] **Step 4: Its drawing.** Create `src/render/venue-campus.ts`:

```ts
import type { Graphics } from "pixi.js";
import type { Furniture, LevelFloor, LevelPlatform } from "../sim/level";
import type { FloorSegment } from "../sim/types";
import { FLOOR, INK, THIN } from "./ink";
import { PALETTE, highlightOf, shadowOf, tones } from "./palette";

/** The campus's materials: the quad's brick, the commons' terrazzo, the library's limestone, the conveyor's steel and rubber. */
const C = { brick: "#a2533d", terrazzo: "#d6cfbf", stone: "#d8cfb8", steel: "#a7adb3", rubber: "#26272b", wood: "#9a6b3f", iron: "#2b2d31", water: "#7fc4e0", tray: "#c9a84a" } as const;
/** The conveyor's trays, one every this many px of its run. */
const TRAY_GAP = 180;

function slab(g: Graphics, f: LevelFloor, color: string, bottom: number) {
  const t = tones(color);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, f.y1 + FLOOR.top, f.x0, f.y0 + FLOOR.top]).fill(t.highlight);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, bottom, f.x0, bottom]).fill(t.base);
  g.poly([f.x0, f.y0 + FLOOR.top, f.x1, f.y1 + FLOOR.top, f.x1, f.y1 + FLOOR.top + 10, f.x0, f.y0 + FLOOR.top + 10]).fill(t.shadow);
  g.poly([f.x0, f.y0 - FLOOR.back, f.x1, f.y1 - FLOOR.back, f.x1, bottom, f.x0, bottom]).stroke(INK);
}

/** Stone steps at 30 degrees: treads along the slope, a stone stringer under them, a stone balustrade beside. */
function stoneSteps(g: Graphics, f: LevelFloor) {
  const rise = 40;
  const run = rise / Math.tan(Math.PI / 6);
  const stone = tones(C.stone);
  const slope = (f.y1 - f.y0) / (f.x1 - f.x0);
  const at = (x: number) => f.y0 + slope * (x - f.x0);
  const low = Math.max(f.y0, f.y1);
  g.poly([f.x0, at(f.x0), f.x1, at(f.x1), f.x1, low + FLOOR.depth, f.x0, low + FLOOR.depth]).fill(stone.shadow);
  const up = f.y1 < f.y0;
  const pts: number[] = [f.x0, at(f.x0)];
  for (let x = f.x0; x < f.x1 - 1; x += run) {
    const nx = Math.min(f.x1, x + run);
    // Rising to the right each tread steps up at its far end; falling, at its near end.
    if (up) pts.push(x, at(nx), nx, at(nx));
    else pts.push(x, at(x), nx, at(x));
  }
  pts.push(f.x1, low + FLOOR.depth, f.x0, low + FLOOR.depth);
  g.poly(pts).fill(stone.base).stroke(INK);
  for (let x = f.x0; x < f.x1 - 1; x += run) {
    const nx = Math.min(f.x1, x + run);
    g.rect(x + 4, up ? at(nx) : at(x), nx - x - 4, 8).fill(stone.highlight);
  }
  g.moveTo(f.x0 - 10, at(f.x0) - 110).lineTo(f.x1 + 10, at(f.x1) - 110).stroke({ width: 22, color: PALETTE.outline, cap: "round" });
  g.moveTo(f.x0 - 10, at(f.x0) - 110).lineTo(f.x1 + 10, at(f.x1) - 110).stroke({ width: 15, color: stone.highlight, cap: "round" });
  for (let x = f.x0 + 30; x < f.x1; x += 70) g.rect(x - 7, at(x) - 104, 14, 104).fill(stone.base).stroke({ width: 2, color: PALETTE.outline });
}

export function campusFloor(g: Graphics, f: LevelFloor): boolean {
  const low = Math.max(f.y0, f.y1);
  const bottom = low < 0 ? FLOOR.depth : low + FLOOR.depth;
  switch (f.kind) {
    case "brick":
      slab(g, f, C.brick, bottom);
      for (let x = f.x0 + 60; x < f.x1; x += 120) g.moveTo(x, f.y0 - FLOOR.back).lineTo(x - 20, f.y0 + FLOOR.top).stroke({ width: 3, color: shadowOf(C.brick) });
      for (let y = f.y0 + FLOOR.top + 30; y < bottom; y += 30) g.moveTo(f.x0, y).lineTo(f.x1, y).stroke({ width: 2, color: shadowOf(C.brick), alpha: 0.6 });
      return true;
    case "terrazzo":
      slab(g, f, C.terrazzo, bottom);
      for (let x = f.x0 + 37; x < f.x1; x += 53) g.circle(x, f.y0 - 8 + ((x * 7) % 26), 3).fill(shadowOf(C.terrazzo));
      return true;
    case "stone":
      slab(g, f, C.stone, bottom);
      for (let x = f.x0 + 240; x < f.x1; x += 240) g.moveTo(x, f.y0 + FLOOR.top).lineTo(x, bottom).stroke({ width: 2, color: shadowOf(C.stone), alpha: 0.7 });
      return true;
    case "steps":
      stoneSteps(g, f);
      return true;
    case "belt": {
      // The tray-return conveyor: a steel truss rising under a rubber belt; its trays ride along in drawBeltTrays.
      const steel = tones(C.steel);
      g.poly([f.x0, f.y0, f.x1, f.y1, f.x1, f.y1 + 60, f.x0, f.y0 + 60]).fill(steel.base).stroke(INK);
      g.poly([f.x0, f.y0 - 4, f.x1, f.y1 - 4, f.x1, f.y1 + 14, f.x0, f.y0 + 14]).fill(C.rubber);
      for (const x of [f.x0 + 60, (f.x0 + f.x1) / 2, f.x1 - 60]) {
        const y = f.y0 + ((f.y1 - f.y0) * (x - f.x0)) / (f.x1 - f.x0);
        g.rect(x - 10, y + 60, 20, -y - 60).fill(steel.shadow).stroke(THIN);
      }
      g.moveTo(f.x0, f.y0 - 90).lineTo(f.x1, f.y1 - 90).stroke({ width: 8, color: steel.highlight, cap: "round" });
      return true;
    }
  }
  return false;
}

/** The trays riding up the conveyor this moment, sliding along at its speed. */
export function drawBeltTrays(g: Graphics, f: FloorSegment, t: number): void {
  const run = f.x1 - f.x0;
  const shift = ((((f.belt ?? 0) * t) % TRAY_GAP) + TRAY_GAP) % TRAY_GAP;
  for (let x = f.x0 + shift; x <= f.x1 - 40; x += TRAY_GAP) {
    const y = f.y0 + ((f.y1 - f.y0) * (x - f.x0)) / run;
    g.rect(x - 34, y - 14, 68, 10).fill(C.tray).stroke({ width: 2, color: PALETTE.outline });
    g.ellipse(x - 8, y - 18, 14, 5).fill("#ffffff").stroke({ width: 2, color: PALETTE.outline });
  }
}

export function campusPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  // A platform on the quad stands on the plaza; elsewhere on the floor.
  const base = p.kind === "bench" || p.kind === "fountain" || p.kind === "tier" ? Math.min(0, p.y < -250 ? -200 : 0) : 0;
  switch (p.kind) {
    case "bench": {
      // A slatted wood bench on iron legs.
      const wood = tones(C.wood);
      for (const x of [p.x0 + 20, p.x1 - 36]) g.rect(x, p.y + 10, 16, base - p.y - 10).fill(C.iron).stroke(THIN);
      g.roundRect(p.x0, p.y - 4, w, 18, 6).fill(wood.base).stroke(INK);
      g.roundRect(p.x0 + 6, p.y - 70, w - 12, 16, 6).fill(wood.shadow).stroke(THIN);
      for (const x of [p.x0 + 30, p.x1 - 40]) g.rect(x, p.y - 70, 10, 66).fill(C.iron);
      return true;
    }
    case "fountain": {
      // The fountain's stone rim, the water held inside it (the basin and the column are furniture).
      const stone = tones(C.stone);
      g.rect(p.x0, p.y, w, base - p.y).fill(stone.base).stroke(INK);
      g.rect(p.x0, p.y - 6, w, 24).fill(stone.highlight).stroke(INK);
      g.rect(p.x0 + 30, p.y + 30, w - 60, 20).fill({ color: C.water, alpha: 0.8 });
      return true;
    }
    case "tier": {
      // The fountain's upper bowl on its column.
      const stone = tones(C.stone);
      g.poly([p.x0 - 20, p.y, p.x1 + 20, p.y, p.x1 - 20, p.y + 50, p.x0 + 20, p.y + 50]).fill(stone.base).stroke(INK);
      g.rect(p.x0 - 20, p.y - 6, w + 40, 16).fill(stone.highlight).stroke(THIN);
      return true;
    }
    case "serving": {
      // A steel serving line: food pans set into its top, a tray rail along its front.
      const steel = tones(C.steel);
      g.rect(p.x0, p.y + 20, w, -p.y - 20).fill(steel.base).stroke(INK);
      g.rect(p.x0 - 10, p.y - 6, w + 20, 26).fill(steel.highlight).stroke(INK);
      g.rect(p.x0 - 20, p.y + 40, w + 40, 12).fill(steel.shadow).stroke(THIN);
      const foods = ["#f1e3b5", "#7fb24a", "#c8443a", "#d9a441"];
      for (let x = p.x0 + 30, k = 0; x < p.x1 - 120; x += 150, k++) g.rect(x, p.y - 4, 120, 10).fill(foods[k % foods.length]);
      return true;
    }
    case "tray": {
      // The tray return: a low steel counter where the trays go onto the belt.
      const steel = tones(C.steel);
      g.rect(p.x0, p.y + 16, w, -p.y - 16).fill(steel.base).stroke(INK);
      g.rect(p.x0 - 8, p.y - 6, w + 16, 22).fill(steel.highlight).stroke(INK);
      for (let k = 0; k < 3; k++) g.rect(p.x0 + 30, p.y - 14 - k * 10, 90, 8).fill(C.tray).stroke({ width: 2, color: PALETTE.outline });
      return true;
    }
    case "deck": {
      // The seating deck: a wood slab on steel columns, a glass railing with a steel cap.
      const wood = tones(C.wood);
      const steel = tones(C.steel);
      for (let x = p.x0 + 200; x < p.x1 - 100; x += 700) g.rect(x - 30, p.y + 44, 60, -p.y - 44).fill(steel.base).stroke(THIN);
      g.rect(p.x0, p.y + 44, w, 40).fill({ color: PALETTE.outline, alpha: 0.25 });
      g.rect(p.x0, p.y, w, 44).fill(wood.base).stroke(INK);
      g.rect(p.x0, p.y, w, 12).fill(wood.highlight);
      g.rect(p.x0, p.y - 110, w, 110).fill({ color: "#a9c7cf", alpha: 0.25 });
      g.roundRect(p.x0, p.y - 116, w, 12, 5).fill(steel.highlight).stroke(THIN);
      for (let x = p.x0 + 20; x <= p.x1 - 20; x += 200) g.rect(x - 3, p.y - 110, 6, 110).fill(steel.base);
      return true;
    }
    case "ledge": {
      // A stone plinth beside the steps with a planter on it.
      const stone = tones(C.stone);
      g.rect(p.x0, p.y, w, 60).fill(stone.base).stroke(INK);
      g.rect(p.x0 - 8, p.y - 6, w + 16, 18).fill(stone.highlight).stroke(THIN);
      g.rect(p.x0 + 20, p.y + 60, w - 40, 120).fill(stone.shadow).stroke(THIN);
      return true;
    }
  }
  return false;
}

export function campusFurniture(g: Graphics, f: Furniture): boolean {
  switch (f.kind) {
    case "lampPost": {
      const cx = f.x + f.w / 2;
      g.rect(cx - 8, f.y + 40, 16, f.h - 40).fill(C.iron).stroke(THIN);
      g.rect(cx - 22, f.y + f.h - 30, 44, 30).fill(C.iron).stroke(THIN);
      g.circle(cx, f.y + 20, 30).fill("#fff3cf").stroke(THIN);
      return true;
    }
    case "fountain": {
      // The basin's back wall and the column carrying the tier, water arcing off it.
      const stone = tones(C.stone);
      const cx = f.x + f.w / 2;
      g.rect(f.x + 40, f.y + f.h - 160, f.w - 80, 70).fill(stone.shadow).stroke(THIN);
      g.rect(cx - 40, f.y + 60, 80, f.h - 60).fill(stone.base).stroke(INK);
      for (const d of [-1, 1]) g.moveTo(cx + d * 70, f.y + 20).quadraticCurveTo(cx + d * 220, f.y + 10, cx + d * 300, f.y + f.h - 120).stroke({ width: 8, color: C.water, alpha: 0.75, cap: "round" });
      return true;
    }
    case "sneeze": {
      // The sneeze guard: glass panes on steel posts over the back of the serving line.
      const steel = tones(C.steel);
      for (let x = f.x + 40; x < f.x + f.w; x += 350) g.rect(x, f.y, 10, f.h).fill(steel.shadow);
      g.poly([f.x, f.y, f.x + f.w, f.y, f.x + f.w, f.y + 30, f.x, f.y + 30]).fill({ color: "#a9c7cf", alpha: 0.35 }).stroke(THIN);
      return true;
    }
    case "slot": {
      // The dish room's window at the conveyor's top: a dark opening in a steel frame, a light over it.
      const steel = tones(C.steel);
      g.rect(f.x - 20, f.y - 20, f.w + 40, f.h + 20).fill(steel.base).stroke(INK);
      g.rect(f.x, f.y, f.w, f.h).fill("#1c1f24");
      g.ellipse(f.x + f.w / 2, f.y - 30, 60, 12).fill({ color: "#fff3cf", alpha: 0.8 });
      return true;
    }
  }
  return false;
}
```

`src/render/venue.ts`: the dispatch tries the campus functions after the restaurant's (`restaurantFloor(front, f) || campusFloor(front, f) || drawFloor(front, f, level)`, likewise for platforms and furniture); the moving floors are `level.floor.filter((f) => f.kind === "escalator" || f.kind === "belt")`, redrawn each update by kind (`drawEscalatorSteps` or `drawBeltTrays`).

`src/render/look.ts`: `const SHIFT: Level[] = [LOBBY, RESTAURANT, CAMPUS];`.

`src/sim/drive.ts`: the balcony route's hop is onto `p.kind === "landing" || p.kind === "tray"`, and only from the floor (`h.y === 0` stays).

- [ ] **Step 5: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`. As in Task 6, a failing scripted player is fixed in `drive.ts`; a level change needs a fairness reason, reported.

- [ ] **Step 6: See it.** Open `http://127.0.0.1:8090/?next=1&venue=campus&dev=1` and play it through by each way: the quad's steps, a bench student's plane, the fountain's tier, the professor's page-turn and his papers, the lunch worker's rush and the gravy, the hop onto the tray return and the ride up (trays sliding by), the deck's students, the floor under the deck, the library's flights with planes from above and the second professor on the stairs, the LIBRARY's tally and "Shift over". Screenshots at full size; nothing over his face. `run-browser.check.mjs` still passes.

- [ ] **Step 7: Commit** `src/sim/levels/campus.ts src/render src/sim/drive.ts scripts/venues.check.mjs`: "Build the campus: the quad, the dining commons and the conveyor, the library steps". Push.

---
### Task 8: The new people's paintings and the cook's hat

This task runs as the paintings come in (`art/incoming/cast/cook-1.png`, `busser-1.png`, `lunch-1.png`, `prof-1.png`, `cook-hat.png`, made from `art/outgoing/batch-r3-codex.txt` section 1). If some are not in when Task 7 is done, do Task 10 and come back.

**Files:**
- Create: `art/cuts/cast-cook-1.json`, `art/cuts/cast-busser-1.json`, `art/cuts/cast-lunch-1.json`, `art/cuts/cast-prof-1.json`
- Modify: `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `src/art/registry.ts`, `src/render/skin.ts`, `src/render/cast-body.ts`, `src/render/look.ts`, `scripts/cast-art-browser.check.mjs`, `scripts/render.check.mjs` (its painted-people list)
- Test: `scripts/art.check.mjs`
- Add: each painting, its prompt, `art/manifest.json`

**Interfaces:**
- Produces: the cut file's `hat` gains `name?: "bellhop" | "cook"` (default `"bellhop"`); `CastHead.hat.name?: string`; `Registry.cast = { bodies; hats: Record<string, Prop> }` (the old single `hat` goes); `loadCastArt` seats the hat its rig names; `CAST_PERSONS` in `art-sync.mjs` and `PERSONS` in `art.check.mjs` add the four.

- [ ] **Step 1: Write the failing tests** (in `scripts/art.check.mjs`, `PERSONS` adds `"cook-1", "busser-1", "lunch-1", "prof-1"`, so the existing "every cast painting in art/incoming/cast has its cut" fails as soon as a new painting is in uncut; append:)

```js
test("each hatted person's cut names the hat it seats, and the sync registers every hat painting under its name", () => {
  for (const p of CAST_CUT) {
    const cuts = JSON.parse(readFileSync(`art/cuts/cast-${p}.json`, "utf8"));
    if (!cuts.hat) continue;
    assert.equal(cuts.hat.name ?? "bellhop", p.startsWith("cook") ? "cook" : "bellhop", p);
  }
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  for (const name of ["bellhop", "cook"])
    if (existsSync(`${CAST_IN}/${name}-hat.png`)) assert.ok(reg.cast.hats[name]?.span > 0 && reg.cast.hats[name].pivot, `${name}'s hat`);
});
```

- [ ] **Step 2: Accept or refuse each painting first.** `node scripts/art-pose.mjs <person>`, then look at the painting at full size and at `artifacts/pose-<person>.png`. It passes when: strict left profile; both arms forward and down, hands open and empty; both soles flat with the far foot a step ahead, within 6 px of Hammer's rows; flat green, no floor or shadow; no text (the tattoos and the name tag carry none); the item's person and clothes; the same inked finish as `bellhop-1.png`. A painting that fails is not cut: tell the owner in plain words what is wrong and give them the redo line from section 6 of `art/outgoing/batch-r3-codex.txt`, filled in.

- [ ] **Step 3: Cut each.** Copy the closest cut (`cast-server-2.json` for the busser, `cast-bellhop-1.json` for the cook, `cast-server-1.json` for the lunch worker, `cast-office-1.json` for the professor) to `art/cuts/cast-<person>.json`, move every coordinate by the difference between the two crop offsets `art-pose.mjs` prints, then re-measure on `node scripts/art-grid.mjs cast/<person>` as R2b-2 did. Per costume:
  - **cook-1**: the rolled sleeves end above the elbow, so each arm's outline takes the rolled cuff and the bare tattooed forearm; the short apron and the side towel go with the torso, the houndstooth trousers painted on under them in each leg's fill; the head is bald and bearded, its jaw line under the beard; `"hat": { "x", "y", "width", "name": "cook" }` seats the toque on his crown.
  - **busser-1**: the t-shirt's short sleeves with the arms (bare below); the long bistro apron and its towel with the torso, hem below the knee, the trousers painted on under it; the shaggy hair with the head.
  - **lunch-1**: the polo's short sleeves and the gloves with the arms; the bib apron and the name tag with the torso; the hairnet, the glasses and their chain with the head.
  - **prof-1**: the tweed sleeves with the arms; the sweater vest, the shirt and the bow tie with the torso; the wild hair, the glasses and the goatee with the head, the jaw line under the goatee.

- [ ] **Step 4: Implement the hats by name.**
  - `scripts/art-cut.mjs`, `castRig`: `out.head.hat = { x, y, width, name: cuts.hat.name ?? "bellhop" }`.
  - `src/render/skin.ts`: `CastHead.hat` gains `name?: string`.
  - `scripts/art-sync.mjs`: `CAST_PERSONS` adds the four; the hat block becomes a loop over `["bellhop", "cook"]`, each reading `<name>-hat.png`, writing `cast/<name>-hat.png` and `cast/<name>-hat-worn.png`, and setting `registry.cast.hats[name] = { file, worn, width, height, pivot, span }`; the registry starts as `cast: { bodies: {}, hats: {} }`.
  - `src/art/registry.ts`: `cast?: { bodies: Partial<Record<CastPerson, Body>>; hats: Record<string, Prop> }`.
  - `src/render/cast-body.ts`, `loadCastArt`: `const plate = rig.head.hat ? registry.cast?.hats?.[rig.head.hat.name ?? "bellhop"] : undefined;`.
  - `src/render/look.ts`, `stripped`: `cast: { bodies: {}, hats: {} }`.
  - `scripts/cast-art-browser.check.mjs`: the hat's route pattern becomes `**/art/cast/*-hat*.png`.
  - `scripts/render.check.mjs`: its list of painted people adds the four (its checks run on whoever is cut).

- [ ] **Step 5: Run, expect PASS**: `npm run art:sync`; `npm run test:next`; `npm run art:sync -- --overlay` and look at `artifacts/body-layers-cast-<person>.png` at full size for each.

- [ ] **Step 6: Look.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-heads,cast-fx`: each new person's row of `cast.png` at full size, stepped act by act (no tear where the arms turn at the shoulder, the hands landing on the pan, the tray, the book and the cart's handle, the toque on the cook's head and flying whole); their head beside Hammer's on `cast-heads.png` at 0.22. In the browser, `?next=1&venue=restaurant&dev=1` and `?next=1&venue=campus&dev=1`: each new person painted (`window.__next.castArt.standIn` empty), nothing over his face.

- [ ] **Step 7: Commit** each person as they are done: `art/cuts/cast-<person>.json art/incoming/cast/<person>.png art/incoming/cast/<person>.prompt.txt art/manifest.json` (the hat's code and tests with the cook): "Cut <person>'s painting". Push.

---

### Task 9: The repeats' colors

**Files:**
- Modify: `art/cuts/cast-server-2.json`, `cast-cook-1.json`, `cast-busser-1.json`, `cast-lunch-1.json`, `cast-prof-1.json`, `cast-office-1.json`, `cast-student-1.json`, `cast-student-2.json`; `src/render/boards.ts`
- Test: `scripts/art.check.mjs`

**Interfaces:**
- Consumes: the levels' `recolor` fields (Tasks 6 and 7), the recolor masks of R2b-2 (`recolors` in a cut: regions and tone ranges per hex).

- [ ] **Step 1: Write the failing test** (append to `scripts/art.check.mjs`; import `RESTAURANT` and `CAMPUS` beside its `LOBBY` import)

```js
test("every recolor a level asks of a painting is in that painting's cut", () => {
  for (const level of [LOBBY, RESTAURANT, CAMPUS])
    for (const s of level.cast ?? []) {
      if (!s.recolor || !existsSync(`art/cuts/cast-${s.person}.json`)) continue;
      const cuts = JSON.parse(readFileSync(`art/cuts/cast-${s.person}.json`, "utf8"));
      assert.ok(cuts.recolors?.[s.recolor], `${level.id} ${s.id}: ${s.person} has no ${s.recolor} mask`);
    }
});
```

- [ ] **Step 2: Run, expect FAIL** (the new hexes have no masks yet).

- [ ] **Step 3: The masks.** For each new recolor, find the garment on `node scripts/art-grid.mjs cast/<person>` (regions in crop px, and the hue, saturation and luma ranges that take the garment and leave skin, hair and the other clothes), as R2b-2's Task 9 did, and add it under the cut's `recolors`:
  - `server-2` `#4b2a5c`: the vest (the host's plum).
  - `cook-1` `#26262a`: the chef's jacket (the second cook's black), the rolled cuffs with it; not the side towel.
  - `busser-1` `#6b1f2a`: the t-shirt (the dock busser's maroon).
  - `lunch-1` `#9b2335`: the polo (the salad bar's red).
  - `prof-1` `#5d6066`: the tweed jacket (the stairs' grey), elbow patches with it.
  - `office-1` `#c8d8b0`: the shirt (the commons' pale green), not the tie.
  - `student-1` `#8a3b8f`: the overshirt (purple), beside its existing `#c9a227`.
  - `student-2` `#b5532a`: the hoodie (rust), beside its existing `#2a8c8a`.

  `src/render/boards.ts`, `castSheet`: the repeats' rows come from every level (`[LOBBY, RESTAURANT, CAMPUS].flatMap((l) => l.cast ?? [])`), one row per person and hex.

- [ ] **Step 4: Run, expect PASS**: `npm run art:sync`; `npm run test:next`.

- [ ] **Step 5: Look.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast`: every repeat's row at full size: only the garment changed, its shading kept, no speckle on skin or hair, no garment left in its old color at an edge; two repeats of one painting each in their own colors.

- [ ] **Step 6: Commit** `art/cuts src/render/boards.ts scripts/art.check.mjs`: "Recolor the venues' repeats from masks in their cuts". Push.

---

### Task 10: The walls and the standing pieces

This task runs on whatever walls and sheets are in under `art/incoming/backdrops/` (sections 4 and 5 of the Codex prompts). The restaurant's arrived first; the campus's, the gift shop's and the lobby's follow. A venue whose walls are not all cut keeps its inked photo.

**Files:**
- Create: `art/cuts/wall-<name>.json` for each wall in (the six `restaurant-far-*` and `campus-far-*` for R3a; the gift shop's and the lobby's when they arrive, cut but used in R3b)
- Modify: `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `scripts/art-grid.mjs`, `src/art/registry.ts`, `src/render/backdrop.ts`, `src/render/look.ts`
- Test: `scripts/art.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces: `wallCrop(png, cut: { floor: number; seams: [number, number] }): Promise<{ png; width; height; floor; top: string }>` and `sheetPieces(keyed, opts?): Promise<{ png; width; height; base: { x; y } }[]>` in `art-cut.mjs`; `Registry.walls?: Record<string, Wall>` with `Wall = { file; width; height; floor; top: string }`, `Registry.pieces?: Record<string, Piece>` with `Piece = { file; width; height; base: Point }`; `wallsFor(level, registry): Wall[] | null`, `layWalls(walls, scale, center, extent): { index: number; x: number }[]`, `WALL_SCALE` (1.4), `MID_SCALE` (0.6) in `backdrop.ts`; `loadBackdrop(scene, level, registry)`; `Backdrop.update(face: Rect | null)` fading the fore pieces.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/art.check.mjs` (import `wallCrop, sheetPieces` from `./art-cut.mjs`):

```js
test("a wall is cropped between its seams, full height, its floor line kept and its top row's color noted", async () => {
  const W = 1000, H = 600;
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const y = Math.floor(i / W);
    rgba.set(y < 10 ? [200, 40, 40, 255] : [90, 90, 90, 255], i * 4);
  }
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const w = await wallCrop(png, { floor: 400, seams: [50, 950] });
  assert.deepEqual([w.width, w.height, w.floor, w.top], [900, 600, 400, "#c82828"]);
  await assert.rejects(wallCrop(png, { floor: 400, seams: [50, 1200] }), /seams/);
  await assert.rejects(wallCrop(png, { floor: 700, seams: [50, 950] }), /floor/);
});

test("a sheet of objects on green is cut into one piece each, left to right, near shapes joined, specks dropped, each with its base", async () => {
  const W = 700, H = 320;
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set([0, 255, 0, 255], i * 4);
  const block = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgba.set([...c, 255], (y * W + x) * 4); };
  block(40, 100, 140, 280, [180, 40, 40]);
  block(240, 60, 300, 280, [40, 40, 180]);
  block(420, 120, 470, 280, [120, 90, 40]);
  block(480, 220, 520, 280, [200, 200, 40]);
  block(640, 20, 643, 23, [40, 40, 40]);
  const png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const pieces = await sheetPieces(await keyOut(png));
  assert.equal(pieces.length, 3, "three pieces: the near pair joined, the speck dropped");
  assert.ok(pieces[0].width < pieces[1].width + 60 && pieces[2].width > 100, `widths ${pieces.map((p) => p.width)}`);
  for (const p of pieces) assert.equal(p.base.y, p.height - 1 - 8, "the base on the lowest painted row, inside the 8 px margin");
});
```

And, once `npm run art:sync` has run:

```js
test("each painted sheet is cut into as many pieces as its brief lists", () => {
  const listed = { "restaurant-mid": 6, "restaurant-fore": 2, "campus-mid": 6, "campus-fore": 2, "arena-mid": 5, "arena-fore": 2, "lobby-mid": 5, "lobby-fore": 2 };
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  for (const [sheet, n] of Object.entries(listed)) {
    if (!existsSync(`art/incoming/backdrops/${sheet}.png`)) continue;
    assert.equal(Object.keys(reg.pieces ?? {}).filter((k) => k.startsWith(`${sheet}-`)).length, n, sheet);
  }
});
```

Append to `scripts/render.check.mjs` (import `layWalls, wallsFor` from `../src/render/backdrop.ts`):

```js
test("a venue's walls stand side by side, centred, the end walls repeated to cover the view; any wall missing means its photo", () => {
  const walls = [{ width: 1000 }, { width: 1000 }, { width: 1000 }];
  const row = layWalls(walls, 1, 1500, [-1200, 4500]);
  assert.deepEqual(row.map((r) => r.index), [0, 0, 0, 1, 2, 2, 2]);
  assert.deepEqual(row.map((r) => r.x), [-2000, -1000, 0, 1000, 2000, 3000, 4000]);
  const wall = { file: "w.png", width: 1400, height: 1000, floor: 730, top: "#000000" };
  assert.equal(wallsFor({ backdrop: { walls: ["a", "b"], mid: [], fore: [] } }, { walls: { a: wall } }), null);
  assert.equal(wallsFor({}, { walls: { a: wall } }), null);
  assert.deepEqual(wallsFor({ backdrop: { walls: ["a", "a"], mid: [], fore: [] } }, { walls: { a: wall } }), [wall, wall]);
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs scripts/render.check.mjs`.

- [ ] **Step 3: Implement**

`scripts/art-cut.mjs`:

```js
/** A wall painting cropped between its seams (the middles of its edge pilasters), full height; its floor line kept and its top row's mean color, which the wall carries on above itself. */
export async function wallCrop(png, cut) {
  const meta = await sharp(png).metadata();
  const [a, b] = cut.seams;
  if (!(a >= 0 && b <= meta.width && b - a > 200)) throw new Error(`wallCrop: seams ${a}..${b} outside the painting's ${meta.width} px`);
  if (!(cut.floor > 0 && cut.floor < meta.height)) throw new Error(`wallCrop: floor line ${cut.floor} outside the painting's ${meta.height} px`);
  const out = await sharp(png).extract({ left: a, top: 0, width: b - a, height: meta.height }).png().toBuffer();
  const { data } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = b - a;
  const sum = [0, 0, 0];
  for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) sum[c] += data[x * 4 + c];
  const top = "#" + sum.map((v) => Math.round(v / w).toString(16).padStart(2, "0")).join("");
  return { png: out, width: w, height: meta.height, floor: cut.floor, top };
}

/**
 * A keyed sheet of objects cut into one image each: its paint's 8-connected shapes, shapes whose boxes come within `join`
 * px merged (a mop and its bucket), shapes under `minShare` of the largest dropped (specks); left to right, each cropped
 * with the margin to its own shapes only, its base the middle of its lowest painted row.
 */
export async function sheetPieces(keyed, { join = 24, minShare = 0.02 } = {}) {
  const { data, info } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const label = new Int32Array(W * H).fill(-1);
  let groups = [];
  const stack = [];
  for (let i = 0; i < W * H; i++) {
    if (label[i] >= 0 || data[i * 4 + 3] < 128) continue;
    const id = groups.length;
    const g = { ids: [id], x0: W, y0: H, x1: -1, y1: -1, n: 0 };
    label[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop();
      const x = j % W,
        y = (j - x) / W;
      g.n++;
      g.x0 = Math.min(g.x0, x);
      g.x1 = Math.max(g.x1, x);
      g.y0 = Math.min(g.y0, y);
      g.y1 = Math.max(g.y1, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const k = ny * W + nx;
          if (label[k] < 0 && data[k * 4 + 3] >= 128) {
            label[k] = id;
            stack.push(k);
          }
        }
    }
    groups.push(g);
  }
  const near = (p, q) => !(p.x0 - join > q.x1 || q.x0 - join > p.x1 || p.y0 - join > q.y1 || q.y0 - join > p.y1);
  for (let merged = true; merged; ) {
    merged = false;
    for (let a = 0; a < groups.length && !merged; a++)
      for (let b = a + 1; b < groups.length && !merged; b++) {
        const p = groups[a],
          q = groups[b];
        if (!near(p, q)) continue;
        groups[a] = { ids: [...p.ids, ...q.ids], x0: Math.min(p.x0, q.x0), y0: Math.min(p.y0, q.y0), x1: Math.max(p.x1, q.x1), y1: Math.max(p.y1, q.y1), n: p.n + q.n };
        groups.splice(b, 1);
        merged = true;
      }
  }
  const largest = Math.max(...groups.map((g) => g.n));
  groups = groups.filter((g) => g.n >= largest * minShare).sort((p, q) => p.x0 - q.x0);
  const out = [];
  for (const g of groups) {
    const own = new Set(g.ids);
    const left = Math.max(0, g.x0 - MARGIN),
      top = Math.max(0, g.y0 - MARGIN);
    const width = Math.min(W, g.x1 + 1 + MARGIN) - left,
      height = Math.min(H, g.y1 + 1 + MARGIN) - top;
    const rgba = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const k = (top + y) * W + left + x;
        if (own.has(label[k])) data.copy(rgba, (y * width + x) * 4, k * 4, k * 4 + 4);
      }
    let lo = -1,
      hi = -1;
    for (let x = g.x0; x <= g.x1; x++)
      if (own.has(label[g.y1 * W + x])) {
        if (lo < 0) lo = x;
        hi = x;
      }
    out.push({ png: await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer(), width, height, base: { x: Math.round((lo + hi) / 2) - left, y: g.y1 - top } });
  }
  return out;
}
```

`scripts/art-sync.mjs`: import `wallCrop, sheetPieces, tolerant`; the registry starts with `walls: {}, pieces: {}`; `backdrops()`'s venue photos become `{ lobby: "public/hotel-corridor.webp", restaurant: "public/hotel-restaurant-bg.jpg", campus: "public/campus-common.webp" }`; and a new step after it:

```js
/** The venues' painted walls, cropped at their seams (art/cuts/wall-<name>.json), and their mid and fore sheets cut into pieces. */
async function walls(registry) {
  const dir = "art/incoming/backdrops";
  if (!existsSync(dir)) return;
  mkdirSync(join(OUT, "backdrops"), { recursive: true });
  for (const file of readdirSync(dir).filter((f) => /-far-\d+\.png$/.test(f))) {
    const name = file.replace(/\.png$/, "");
    const cutFile = `art/cuts/wall-${name}.json`;
    if (!existsSync(cutFile)) {
      console.warn(`wall ${name}: painted but not cut yet (no ${cutFile}); its venue keeps its photo`);
      continue;
    }
    await tolerant(`wall ${name}`, strict, async () => {
      const w = await wallCrop(readFileSync(join(dir, file)), JSON.parse(readFileSync(cutFile, "utf8")));
      writeFileSync(join(OUT, `backdrops/${name}.png`), w.png);
      registry.walls[name] = { file: `backdrops/${name}.png`, width: w.width, height: w.height, floor: w.floor, top: w.top };
      console.log(`wall ${name}: ${w.width}x${w.height}, its floor at ${w.floor}`);
    });
  }
  for (const file of readdirSync(dir).filter((f) => /-(mid|fore)\.png$/.test(f))) {
    const sheet = file.replace(/\.png$/, "");
    await tolerant(`pieces ${sheet}`, strict, async () => {
      const pieces = await sheetPieces(await keyOut(readFileSync(join(dir, file))));
      pieces.forEach((p, i) => {
        const name = `${sheet}-${i + 1}`;
        writeFileSync(join(OUT, `backdrops/${name}.png`), p.png);
        registry.pieces[name] = { file: `backdrops/${name}.png`, width: p.width, height: p.height, base: p.base };
      });
      console.log(`pieces ${sheet}: ${pieces.length}`);
    });
  }
}
```
called as `await walls(registry);` after `await backdrops(registry);`.

`scripts/art-grid.mjs`: `wall/<name>` draws `art/incoming/backdrops/<name>.png` with the 50 px grid and, when `art/cuts/wall-<name>.json` exists, its seams as red verticals and its floor line in cyan, to `artifacts/grid-wall-<name>.png`.

`src/art/registry.ts`: `Wall`, `Piece` and the two optional maps of the Interfaces block.

`src/render/backdrop.ts`:

```ts
/** The far plane's walls are drawn at this scale; the mid plane's pieces at MID_SCALE, the fore plane's at full size. */
export const WALL_SCALE = 1.4;
export const MID_SCALE = 0.6;
/** Half the widest view the camera shows (21:9 at zoom 0.88), so the far plane never runs out at a level's ends. */
const VIEW_HALF = 1400;
/** The fore pieces: darker, a little blurred, and set this far in front of the floor line. */
const FORE = { tint: 0xb3b3b3, blur: 2, down: 60, faded: 0.2, ease: 6 } as const;

/** A venue's walls in order, all registered, or null: a venue with any wall missing draws its photo, never a partial row. */
export function wallsFor(level: Pick<Level, "backdrop">, registry: Pick<Registry, "walls">): Wall[] | null {
  const names = level.backdrop?.walls ?? [];
  if (!names.length) return null;
  const walls = names.map((n) => registry.walls?.[n]);
  return walls.every((w): w is Wall => !!w) ? walls : null;
}

/** Where each wall stands in the far plane: side by side at `scale`, the row centred on `center`, the first and last walls repeated outward until `extent` is covered. */
export function layWalls(walls: Pick<Wall, "width">[], scale: number, center: number, extent: [number, number]): { index: number; x: number }[] {
  const widths = walls.map((w) => w.width * scale);
  const total = widths.reduce((a, b) => a + b, 0);
  const out: { index: number; x: number }[] = [];
  let x = center - total / 2;
  walls.forEach((_, i) => {
    out.push({ index: i, x });
    x += widths[i];
  });
  for (let right = x; right < extent[1]; right += widths[walls.length - 1]) out.push({ index: walls.length - 1, x: right });
  for (let left = center - total / 2; left > extent[0]; ) {
    left -= widths[0];
    out.unshift({ index: 0, x: left });
  }
  return out;
}
```

`loadBackdrop` becomes (the sky's gradient, `blockWall` and `drawMid` as today; import `BlurFilter` from `pixi.js`, `type Level` and `type Rect`):

```ts
export type Backdrop = { setVisible(on: boolean): void; update(face: Rect | null, dt: number): void };
const WALL_TINT = "#c4b9ad";
const MID_TINT = "#b8ad9f";

/**
 * A level's planes behind and in front of the play: the sky; its painted walls side by side (or its inked photo while
 * any wall is missing); its painted mid pieces against them (or the code-drawn columns and palms); its fore pieces,
 * darkened and blurred, fading while his head is behind one. The stash has its block wall.
 */
export async function loadBackdrop(scene: Scene, level: Level, registry: Registry): Promise<Backdrop> {
  const planes = { sky: new Container(), far: new Container(), mid: new Container(), fore: new Container() };
  scene.layers.sky.addChild(planes.sky);
  scene.layers.far.addChild(planes.far);
  scene.layers.mid.addChild(planes.mid);
  scene.layers.fore.addChild(planes.fore);
  // ...the sky's gradient sprite, as today...
  const b = level.bounds;
  const walls = wallsFor(level, registry);
  if (walls) {
    const textures = await Promise.all(walls.map((w) => Assets.load<Texture>(ART_BASE + w.file)));
    const extent: [number, number] = [b.x * PARALLAX.far - VIEW_HALF, (b.x + b.w) * PARALLAX.far + VIEW_HALF];
    for (const { index, x } of layWalls(walls, WALL_SCALE, (b.x + b.w / 2) * PARALLAX.far, extent)) {
      const w = walls[index];
      const top = -w.floor * WALL_SCALE;
      // The wall carries on above the painting in its top row's color.
      planes.far.addChild(new Graphics().rect(x, -4000, w.width * WALL_SCALE, 4000 + top).fill(w.top));
      const s = new Sprite(textures[index]);
      s.position.set(x, top);
      s.scale.set(WALL_SCALE);
      s.tint = WALL_TINT;
      planes.far.addChild(s);
    }
  } else {
    const far = registry.backdrops[level.id]?.far;
    // ...the inked photo's TilingSprite, as today...
  }
  if (level.id === "stash") planes.far.addChild(blockWall(level.length));
  const piece = async (name: string): Promise<Sprite | null> => {
    const p = registry.pieces?.[name];
    if (!p) return null;
    const s = new Sprite(await Assets.load<Texture>(ART_BASE + p.file));
    s.anchor.set(p.base.x / p.width, p.base.y / p.height);
    return s;
  };
  let mids = 0;
  for (const m of level.backdrop?.mid ?? []) {
    const s = await piece(m.name);
    if (!s) continue;
    s.position.set(m.x * PARALLAX.mid, 0);
    s.scale.set(MID_SCALE);
    s.tint = MID_TINT;
    planes.mid.addChild(s);
    mids++;
  }
  if (!mids && level.id !== "stash") planes.mid.addChild(drawMid(level.length));
  const fores: Sprite[] = [];
  for (const f of level.backdrop?.fore ?? []) {
    const s = await piece(f.name);
    if (!s) continue;
    s.position.set(f.x * PARALLAX.fore, FORE.down);
    s.tint = FORE.tint;
    s.filters = [new BlurFilter({ strength: FORE.blur })];
    planes.fore.addChild(s);
    fores.push(s);
  }
  return {
    setVisible(on) {
      for (const c of Object.values(planes)) c.visible = on;
    },
    update(face, dt) {
      for (const s of fores) {
        const r = s.getBounds();
        const behind = !!face && r.x < face.x + face.w && r.x + r.width > face.x && r.y < face.y + face.h && r.y + r.height > face.y;
        s.alpha += ((behind ? FORE.faded : 1) - s.alpha) * Math.min(1, FORE.ease * dt);
      }
    },
  };
}
```

`src/render/look.ts`: `prepare` calls `loadBackdrop(scene, level, registry)`; each frame `views.get(game.level.id)?.backdrop.update(faceOnScreen, simDt)` after `faceOnScreen` is set; `stripped` also sets `walls: {}, pieces: {}`.

- [ ] **Step 4: The cuts.** For each wall in `art/incoming/backdrops/`: `node scripts/art-grid.mjs wall/<name>`, then write `art/cuts/wall-<name>.json`: `{ "note": "...", "floor": <the row where the wall meets the floor>, "seams": [<left>, <right>] }`, the seams at the middles of the edge pilasters (the picture's own edges where a pilaster is cut exactly in half there). Re-run the grid with the cut to see the red seams and the cyan floor line where they belong. Then `npm run art:sync` and check each venue's two seams side by side: `node -e` a quick `sharp` join of the cropped walls (`public/art/backdrops/<a>.png` beside `<b>.png`) to `artifacts/seam-<a>-<b>.png`, and look at it at full size: the pilaster's halves meet as one, the trim lines meet. A seam that does not meet is moved; a painting whose edges can never meet goes back to the owner with the redo line.

- [ ] **Step 5: Run, expect PASS**: `npm run art:sync`; `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`.

- [ ] **Step 6: Look.** In the browser at `?next=1&venue=restaurant&dev=1` and `?next=1&venue=campus&dev=1`, teleport along each venue (every 1500 px) and screenshot: the walls' joins, the walls' floor lines on the game's floor, the painted pieces against the walls, a fore piece fading as his head passes behind it, nothing painted over his face. Each venue whose walls are not all in shows its inked photo, whole.

- [ ] **Step 7: Commit** `scripts/art-cut.mjs scripts/art-sync.mjs scripts/art-grid.mjs art/cuts src/art/registry.ts src/render scripts/art.check.mjs scripts/render.check.mjs`, and each owner file under `art/incoming/backdrops/` that is cut, with its prompt and `art/manifest.json`: "Paint the venues' walls and standing pieces from the owner's art". Push.

---

### Task 11: The boards, the checks, the docs and the review

**Files:**
- Create: `scripts/shift-browser.check.mjs`, `docs/superpowers/handoff-<date>-r3b.md`
- Modify: `src/render/boards.ts`, `scripts/look-boards.mjs`, `README.md`, `docs/superpowers/specs/2026-10-13-r3-the-run-design.md`, `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md`, `art/ART-REQUEST.md`

- [ ] **Step 1: The venue boards.** `src/render/boards.ts`: `BoardSpec.kind` adds `"venue"`; `createBoards` gains a last parameter `currentLevel: () => Level = () => LOBBY` (`look.ts` passes `() => game.level`); the `lobby` function becomes `levelFrames(frameList, id: LevelId)` (it calls `showLevel(id)`), and the new case is `case "venue": { const lv = currentLevel(); const frames = VENUE_FRAMES[lv.id]; if (!frames) throw new Error(`no venue frames for ${lv.id}`); return levelFrames(frames, lv.id); }`:

```ts
/** Each venue's six frames: where he stands, where the camera looks and how wide. */
const VENUE_FRAMES: Partial<Record<LevelId, { x: number; y?: number; cx: number; cy?: number; zoom?: number }[]>> = {
  restaurant: [
    { x: 1100, y: 0, cx: 1700 },
    { x: 4450, y: -180, cx: 4900 },
    { x: 6000, y: 0, cx: 6500 },
    { x: 8500, y: -180, cx: 9000, cy: -380, zoom: 0.88 },
    { x: 12200, y: -340, cx: 12800 },
    { x: 13450, y: -200, cx: 14100 },
  ],
  campus: [
    { x: 1300, y: -100, cx: 1900 },
    { x: 2450, y: -310, cx: 2900, cy: -500 },
    { x: 5300, y: 0, cx: 5900 },
    { x: 7250, y: -120, cx: 8100, cy: -420, zoom: 0.88 },
    { x: 9000, y: 0, cx: 9400, cy: -350, zoom: 0.88 },
    { x: 13200, y: -473, cx: 13600, cy: -700, zoom: 0.88 },
  ],
};
```

`scripts/look-boards.mjs`, after the cast boards:

```js
  for (const venue of ["restaurant", "campus"]) {
    if (!want(venue)) continue;
    await page.goto(`${base}?next=1&board=1&venue=${venue}`);
    await page.waitForFunction((v) => window.__nextBoard && window.__next?.run?.level === v, venue, { timeout: 30000 });
    await page.waitForTimeout(800);
    const frames = (await render("venue")).split("\n");
    frames.forEach((f, i) => save(`${venue}-look-${i + 1}.png`, f));
    count += frames.length;
  }
```

- [ ] **Step 2: The shift's browser check.** Create `scripts/shift-browser.check.mjs`:

```js
// Plays the shift across its venues at /?next=1&dev=1: the lobby's exit into the restaurant's card, a flat-top, the
// walk-in and the swinging door, the restaurant's exit into the campus's card, the tray return's ride up, the library's
// doors into "Shift over", and play again from the lobby.
// Usage: node scripts/shift-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const errors = [];
let page;
const run = () => page.evaluate(() => window.__next.run);
const waitFor = async (pred, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await run();
    if (pred(r)) return r;
    await page.waitForTimeout(30);
  }
  return run();
};
const tp = (x, y = 0) => page.evaluate(([a, b]) => window.__next.dev.teleport(a, b), [x, y]);
const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
};
const shot = (n) => page.screenshot({ path: resolve(out, n) });
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** The card stays off his face on both phone shapes and the desktop; a screenshot of each. */
const cardClearOfFace = async (name) => {
  for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const b = document.querySelector(".next-veil__card").getBoundingClientRect();
      return { card: { x: b.x, y: b.y, w: b.width, h: b.height }, face: window.__next.faceScreen };
    });
    assert.ok(!hit(r.card, r.face), `${name} at ${w}x${h}: the card covers his face ${JSON.stringify(r)}`);
    await shot(`${name}-${w}x${h}.png`);
  }
};
/** From just before a venue's exit, walks in and waits for the next venue's card, or the clear. */
const clockOut = async (x, y, next) => {
  await tp(x, y);
  await page.waitForTimeout(250);
  await hold(["ArrowRight"], 1200);
  return waitFor((r) => (next === "clear" ? r.mode === "clear" : r.mode === "card" && r.level === next), 16000);
};
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1&dev=1`);
  await page.waitForFunction(() => window.__next?.run && window.__next?.dev, {}, { timeout: 30000 });
  let r = await waitFor((x) => x.mode === "play", 6000);
  assert.equal(r.level, "lobby");
  await page.evaluate(() => window.__next.dev.give("pepper"));
  await page.waitForTimeout(300);
  r = await clockOut(15800, 0, "restaurant");
  assert.deepEqual([r.mode, r.level, r.lives, r.hot], ["card", "restaurant", 3, true], "the restaurant's card; the pepper came along");
  assert.ok(r.score > 0, "the lobby's tally paid");
  await page.waitForSelector("text=Your shift goes on", { timeout: 2000 });
  await shot("shift-restaurant-card.png");
  await cardClearOfFace("veil-restaurant");
  await waitFor((x) => x.mode === "play", 6000);

  // A flat-top heats him; the walk-in cools him.
  await tp(8500, -180);
  await page.evaluate(() => window.__next.dev.heat(30));
  await page.waitForTimeout(1500);
  let heat = await page.evaluate(() => window.__next.moves.heat);
  assert.ok(heat > 45, `the flat-top heats him: ${heat}`);
  await shot("shift-flattop.png");
  await tp(9250, 0);
  await page.evaluate(() => window.__next.dev.heat(80));
  await page.waitForTimeout(1500);
  heat = await page.evaluate(() => window.__next.moves.heat);
  assert.ok(heat < 50, `the walk-in cools him: ${heat}`);
  const played = await page.evaluate(() => window.__next.sound.played);
  assert.ok((played.sizzle ?? 0) >= 1 && (played.frost ?? 0) >= 1, `the sizzle and the frost: ${JSON.stringify(played)}`);

  // The kitchen server comes through the swinging door.
  await page.evaluate(() => window.__next.dev.heal());
  await tp(4700, 0);
  r = await waitFor((x) => (x.events.doorSwing ?? 0) > 0, 12000);
  assert.ok((r.events.doorSwing ?? 0) > 0, "the swinging door swung");
  await shot("shift-door.png");

  // On to the campus, and up the tray return's conveyor.
  r = await clockOut(15600, 0, "campus");
  assert.deepEqual([r.mode, r.level], ["card", "campus"]);
  await waitFor((x) => x.mode === "play", 6000);
  await tp(7450, -170);
  r = await waitFor((x) => x.y < -500, 8000);
  assert.ok(r.y < -500, `carried up the conveyor: ${r.y}`);
  await shot("shift-conveyor.png");

  // The library's doors end the shift.
  r = await clockOut(15880, -900, "clear");
  assert.equal(r.mode, "clear");
  await page.waitForSelector("text=Shift over", { timeout: 2000 });
  await shot("shift-over.png");
  await cardClearOfFace("veil-shift-over");
  await page.click("text=Play again");
  r = await waitFor((x) => x.mode === "play", 6000);
  assert.deepEqual([r.level, r.lives, r.score], ["lobby", 3, 0], "a fresh shift from the lobby");

  assert.deepEqual(errors, []);
  writeFileSync(resolve(out, "shift-check.json"), JSON.stringify({ run: await run(), errors }, null, 2));
  console.log("PASS: the lobby into the restaurant, a flat-top, the walk-in, the swinging door, into the campus, the conveyor, Shift over and play again; no errors.");
} catch (err) {
  console.error("Shift check failure", errors);
  await page?.screenshot({ path: resolve(out, "shift-failure.png") });
  throw err;
} finally {
  await browser.close();
}
```

- [ ] **Step 3: Every check.** `npm run test:next`; `npm run test:game`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`. With the 8090 dev server: `next-browser`, `run-browser`, `moves-browser`, `acts-browser` (with `&nocast=1` as they are), `cast-browser`, `cast-art-browser`, `shift-browser`, `start-screen`, `browser-smoke.mjs http://127.0.0.1:8090/?next=1 artifacts/smoke-dev.png`. Then `node scripts/with-app-env.mjs vite build`, restart the preview (`vite preview --host 127.0.0.1 --port 8091 --strictPort`), and `browser-smoke.mjs http://127.0.0.1:8091/?next=1 artifacts/smoke-preview.png --baseline artifacts/smoke-dev.json`. Every one passes; a failure is fixed before anything else.

- [ ] **Step 4: Every board, at full size.** `node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-heads,cast-fx,restaurant,campus,lobby,cast-lobby`. Look at every new person in every act, both venues' twelve frames (the walls, the furniture, the cast in place, the hazards), and the lobby's to see nothing moved there. Step through a cook's ambush, a lunch worker's rush, a busser's shove and a professor's march frame by frame in the browser (the pause key and `window.__next.dev`): nothing pops, nothing of the cast over his face.

- [ ] **Step 5: The docs.**
  - `README.md`, "The rebuild": "The run" becomes the shift (venues in order, the tally between them, what carries, per-venue clocks and punch clocks, "Shift over", the `&venue=` link); new sections "The restaurant (1-2)" and "The campus (1-3)" in the lobby's section's style (acts, hazards, routes, the cast); "The lobby's cast" gains the four new people (their fights, lines, props, the cook's hat); the tests list gains `venues.check.mjs` and `shift-browser.check.mjs`; the boards list gains `restaurant-look-*` and `campus-look-*`.
  - The R3 design: an "As built in R3a" paragraph under §3.1 (the counters break at the freezer; the door's warning is the server's own wind-up), §3.2 (the table and bench under the deck at 110), §4 and §6 (what came in, what was cut, what still falls back).
  - The rebuild spec: §8.3's restaurant and campus sketches each get "As built in R3a (date): see the R3 design §3"; §16's R3 line notes R3a done.
  - `art/ART-REQUEST.md` §4 and §5: what is in, what is cut, what is still open (the gift shop's and lobby's walls if not yet, the pig's faces).
  - `docs/superpowers/handoff-<date>-r3b.md`, in the style of `handoff-2026-10-13-r3.md`: R3b's job (the pig and the gift shop, the start screen, the lobby's walls, the switch, the merge), where the art stands, the owner's decisions so far (all of R3's), the environment, the deferred minors (this plan's review's minors and the older ones still open).

- [ ] **Step 6: Commit** the docs, the boards and the check: "Document R3a: the restaurant, the campus and the shift". Push.

- [ ] **Step 7: The owner's play-test.** Send the venue boards (cropped for a phone) and two screenshots per venue, open `http://127.0.0.1:8090/?next=1` in the browser panel for them, and give them the two links (`&venue=restaurant`, `&venue=campus`). List the decisions above in plain words. Fold in what they ask for, each as its own commit.

- [ ] **Step 8: The final review.** One fresh reviewer on the most capable model reads the whole R3a diff (`git diff e54821d..HEAD`) against this plan and the R3 design; fix its critical and important findings with tests, list its minors in the R3b handoff, push.
