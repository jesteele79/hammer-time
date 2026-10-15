# R4 Hungry Hungry Hammer, the BUFFET Door, the Side Quests Card and the Old Game's Deletion, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hungry Hungry Hammer rebuilt inside the new game (the R4 design): a round banquet table seen from above at an angle, Hammer in his banquet bib and three rivals belly-flopping across it for food the chute dumps in the middle, sixty seconds, the shipped scoring and grades; the lobby's BUFFET door opens it once a shift and pays out on the way back; the start screen's Side quests card plays it as practice; the four paintings (the ballroom, the table, the food, the nurse) cut in; then, each only on the owner's yes at the time, the old game's deletion and the merge into `main`.

**Architecture:** The banquet is a pure sim of its own (`src/sim/quests/hungry/`: the table's geometry, the dishes' disc physics, the round with its four eaters, the server, the paper, the suitcase and the cart, and three scripted players that set the grade lines). The Game hosts it in three new modes (`questCard`, `quest`, `questTally`) while the shift waits, unstepped, behind it. Its events join `GameEvent` (each type starts with `hh`) so the sound, the feel and the HUD read them like any other. The renderer draws it with a scene of its own (`src/render/quests/hungry-scene.ts`) on the play layer under a held camera, Hammer in the banquet costume and the rivals on their painted bodies; a new pose field, `lift`, lets the dive keep his head level while his body lies along the cloth. The shell shows its card, its HUD and its tally, and the start screen's card plays it in place.

**Tech Stack:** TypeScript, React 19, TanStack Start, PixiJS 8, sharp, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-14-r4-hungry-hungry-hammer-design.md` (all of it) over `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§2 hard limits, §6.3 the head, §10 HUD and shell, §11 Hungry Hungry Hammer, §15 testing, Appendices A and B). Handoff: `docs/superpowers/handoff-2026-10-14-r4.md` (environment, owner decisions, deferred minors). The shipped quest being ported: `src/game/quests/hungry.ts`, `src/game/quests/food.ts`, `scripts/hungry.check.mjs`, `scripts/quest-browser.check.mjs`. Art: `art/outgoing/batch-8-r4-banquet.txt` (the brief), `art/outgoing/batch-r4-codex.txt` (the owner's prompts).

## Global Constraints

- The table as painted: "on screen an oval 1500 by about 555 world px (the owner's painted table's own proportion, 0.37 ...). Its top stands about 370 px above the floor, as its painted cloth hangs." "Everyone is drawn at twice their shift size (Hammer 680 px tall), so the tabletop reaches their belly ... The rules' distances (the reach, the zones) are on the table top and do not change with it." (R4 §2, the owner's choice after the paintings came in)
- "The dive. Tap Space, F or ↑ (or the pad's Jump): he belly-flops out along his line, the hand travelling 520 px in 0.14 s, holding 0.04 s, sliding back in 0.10 s. Everything his hand's 110 px wide sweep crosses on the way out is chomped: it flies back low over the cloth to his plate (0.25 s) and scores when it lands; nothing past the hand's farthest point is touched. A dive can start every 0.3 s; holding the key never repeats one." (R4 §3)
- "Reach grows 10 px for every dish he eats, from 520 to 760." "A press held past 0.12 s charges, the reach growing linearly from his tap reach to 1180 at 0.5 s, with a marker on the cloth where he will stop. A charged dive slides at the tap's speed ... if it ends on a rival's plate it robs the top dish: its value plus 100 and "YOINK!" (a robbed special pays out as if eaten; a robbed check still costs 400)." (R4 §3)
- "← and → swing his line up to 30 degrees either way on screen ... drawn faintly while a direction is held or the dive charges; it stays where it is left." "His hand and a rival's within 110 px of each other while both are out (within 0.1 s): both bounce back empty and the food within 150 px of the meeting point scatters ("CLASH!", sparks)." (R4 §3)
- "H: the mallet smacks the rim in front of him ... Food within 300 px of his plate jumps away toward the middle; a rival whose hand is in that zone is stunned 2 s; the server in it drops her tray (four dishes from the current course, at his end) and leaves for 15 s; a suitcase in it is slammed off; paper in it is swatted." "↓: under the table edge; paper sails over. No dive or bonk while ducked or slapped." (R4 §3)
- "Reactions: the student 0.55 s, the bellhop 0.40 s, the nurse 0.28 s. When food comes to rest within 400 px of a rival's plate, after the reaction it dives at it ... mashing a burst of 2 to 4 dives, each at the nearest food." "Anger: +1 each time Hammer robs that rival, −1 after every 8 s without one; ... `base × 0.8^anger`, never under 0.15 s." (R4 §4)
- Paybacks: "The student winds up 0.6 s ("Heads up!") and throws a paper plane ... a hit costs 150"; "The bellhop slides a suitcase onto the cloth 250 px out along Hammer's line for 4 s ("Your bag, sir.")"; "The nurse stays angry: ... her zone (300 px round her plate) shows as a faint red ring, and a hand that enters it is slapped ("Sanitize!"): nothing eaten, a 1 s stun, his thought "I've HAD my shots."" "The server clears food that has come to rest within 150 px of the rim beside her ("Are we still working on that?", at most every 6 s)." (R4 §4)
- "Discs of radius 26 to 34 by kind ...: velocity, friction 2.4/s, elastic collisions between discs (restitution 0.6), a bounce off the rim (0.7) and off a suitcase. A dump drops food from the chute onto the middle with a random outward speed of 300 to 700 px/s." "24 appetizers at 0 s, 12 at 10 s and 12 at 20 s; 16 entrees at 25 s, 10 at 35 s; 14 desserts at 42 s (the dessert cart's crash spills them from the right rim), 10 at 50 s; the last 8 s a frenzy, three dishes a second from all three courses." Specials "once each, at random times between 5 and 50 s". (R4 §5)
- "Grabs less than 1.2 s apart build a combo: double from the fifth, triple from the tenth (the bonus counted apart, as shipped). The check costs 400, a paper hit 150." "The lines start at 3000, 2000 and 1200 and are scaled together until, over ten seeded rounds each: a player who never presses lands WATER ONLY; a steady player ... has a median between SPLIT THE CHECK and GOOD TIPPER; a sharp player ... has a median of COMPED. A full belly is GOOD TIPPER or better." (R4 §6)
- The door: "↓ on the floor in front of it, as the STAFF ONLY door does: not in the air, not mid-move, not knocked down." "The shift waits: the lobby is not stepped, its clock is stopped, the shield, heat and pepper hold." "Continue on the tally ... puts him on the lobby floor in front of the door, standing, with 0.6 s of grace; the key that closed the tally does not jump, swing or fire." What he brings back: "the round's score onto the shift's; a can for the Coke Zero; the smash full for the nuts; Buc-ee's starts his 10 s shield as he walks out; hot sauce or a full belly gives him the pepper with full patience; no lives." "Once a shift ... through lost lives; a new shift opens it again." (R4 §7)
- Practice: "plays the banquet as practice on the new start screen (no page change)"; "never touches a shift. Its tally offers Play again and Start screen"; "`/?quest=hungry` opens the practice round directly". The best: `hammer-time-best-banquet`, door and practice rounds both count. (R4 §8, §1)
- The screen: the top bar ("the round's score, its 60 s clock, "Hungry Hungry Hammer · The Banquet" in the venue's place, pause and mute"), the panel ("his reach (base to 1180, the charge showing as it builds) and his combo"), the hint lines word for word from R4 §9, the touch pad's ten buttons, "Every card and bar fits 1280 by 800, 390 by 844 and 844 by 390 with no horizontal overflow." (R4 §9)
- "Everything at the table draws behind Hammer: the rivals (standing or diving), the server, the food on the cloth and in flight, the chute, the dessert cart, the suitcase and the paper." "His head stays within 8 degrees of level and nothing crosses his face box at any reach or line angle." (R4 §1, §10; main spec §2.1)
- Art: the four paintings and their cuts; "Drawn in code: the chute, the dessert cart, the suitcase, the paper planes, the plates and the rivals' stacks, the server's tray, the THANK YOU card on the door." Fallbacks: "without the ballroom, a plain warm wall and a drawn carpet; without the table, a drawn oval table; without the food sheet, drawn plates with three-letter tags (the shipped look); without the nurse, the cast's drawn stand-in in scrubs colors. The sync warns and goes on; a bad painting never stops it." (R4 §10)
- The deletion and the merge each need the owner's explicit yes at the time; the deletion's list is R4 §11 and every retired check is retired by name ("never dropped silently", main spec §4).
- "The six recordings in `public/voice/*` plus `public/absolute-bullshit.mp3` are the only spoken lines": Hammer's banquet lines are thoughts; the rivals and the server speak in speech bubbles.
- "Pixi objects cannot be constructed under `node:test`": node tests touch pure functions and the cut pipeline only; drawing is verified on boards and in the browser. The stand-ins are placeholders: never polish them.
- The owner's files under `art/incoming/` and `art/reference/`, `public/voice/*` and `public/absolute-bullshit.mp3` are never modified; `npm run art:sync` records each owner file in `art/manifest.json`; a commit stages only the manifest entries of the paintings it adds (`node artifacts/stage-manifest.mjs <paths…>`; if that git-ignored helper is gone, `git add -p art/manifest.json` and take only those entries). Run `npm run art:sync` after any change to `art/cuts/*` or `scripts/art-cut.mjs`; `public/art/` is git-ignored.
- Owner rules: never stage, revert or touch `package-lock.json` or `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`, checked after every edit to `src/routes/index.tsx`); write the message to `.git/CLAUDE_MSG` with the Write tool and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, named paths only, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `claude/hammer-pass` after each commit (`git push origin claude/hammer-pass`), never `main`; the dev server on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort`, `node_modules\.bin` on PATH), the preview on 8091 (restart it after every rebuild); browser checks with `BROWSER_SMOKE_CHANNEL=chrome`.
- Many source files use CRLF line endings: exact-string edit scripts normalize them (`artifacts/edit.mjs`). Bash heredocs containing apostrophes break in this harness: write files with the Write tool.

## Review Focus

1. **The key that closes the tally**: Space or Enter on the tally never carries over: back in the lobby he does not jump, swing or fire on it, and a new practice round does not start with a dive on it; a held Down does not reopen anything. Pinned in Task 6 (the sim: `finishQuest` disarms the doors; a held key with no press edge does nothing) and Task 10 (the browser: Space closes the tally, no `jump` event, no `hhDive` in the next round's first second).
2. **The door around lost lives and new shifts**: spent through a lost life and a trip to the stash; open again on Try again, Play again or a start from the start screen; while he eats, the lobby's clock, his heat, the shield's seconds and the pepper all hold, and nobody in the lobby moves. Pinned in Task 6.
3. **A crowded table**: the frenzy, the cart's crash and a tray dropped together (well over a hundred dishes with nobody eating), a wave poured onto one spot, a dish exactly on another or on the table's exact middle: nothing leaves the rim, nothing goes NaN, and no dish is chomped twice when two sweeps cross it in one step. Pinned in Task 2 (the physics), Task 3 (a whole round with nobody eating) and Task 4 (two sweeps over one dish).
4. **A break, a blur or a turned phone mid-dive**: a charge held through the break does not grow or fire while paused; the window losing focus lets go of the keys (a coil then goes out as a tap); a phone turned during the round keeps the whole table, all four eaters and the chute in view and clear of the bars. Pinned in Task 6 (the sim: the coil does not advance in a pause) and Task 10 (the browser: blur and the three screen shapes mid-round).
5. **Missing art**: no ballroom, table, food sheet or nurse painting (or `&noart=1`): the sync warns and goes on, the stand-ins draw, the round plays to its tally with no errors. Pinned in Task 8 (the sync with a cut missing) and Task 10 (a `&noart=1` round in the browser).

## Decisions taken for the owner (report these)

The design's twelve were reported with it. These are the plan's:

1. The dive keeps his head level with a new "head lift": his body tips forward about 40 degrees over the cloth and his head lifts back by as much, so his face looks ahead along the table while his far hand reaches down to the food under his chin. Tipped further, with his head level, his jaw would come too close to his near shoulder for the face rule. The body keeps that one tip whatever the line's angle; the line shows in where he slides. If the neck reads broken on the board, the body tips less rather than the head tipping down.
2. The haul rides in his hand: what the sweep crosses is carried to full stretch and then flies back to the plate, so a clash or a slap really leaves him empty-handed (what he held drops where his hand was).
3. A rival's dive keeps within 50 degrees of level on screen either way, and the rival turns to face it; so the student can raid the food near Hammer's end and the bonk can stun a hand there. (The design's "within 50 degrees of the way it faces" would have kept every rival away from his end.)
4. A wave pours: its dishes drop from the chute one after another, 0.03 s apart, not all at once.
5. The dessert cart rolls in along the near side from the right and spills at the rim between the near side and the nurse's end, so it never runs through her.
6. The paper plane flies from the student's plate to Hammer's spot at 650 px/s; inside the bonk's 300 px it can be swatted.
7. The server walks behind the far side from the right end to Hammer's corner and back in 18 s, and her tray drops at his corner.
8. The Coke Zero eaten at the banquet comes home as a can like any other, its 200 points included.
9. The rivals are the painted `student-1` and `bellhop-1`, and the nurse; the server is `server-2` in a black vest. The nurse stands with the office worker's idle at the table.
10. The tally names a new best; its eyebrow says "Side quest".
11. During the round, its cards sit on the right half on a laptop and a phone on its side, and above or below him on an upright phone.
12. The Auto quality choice goes back to the top tier and lets the game step down again from there.
13. The table's numbers come from its painting: its oval 0.37 as deep as it is wide (measured 0.368 off the gold rim) and its top 370 above the floor (the cloth's drop, about 378 at the hem's lowest points). Hammer and the nurse stand at 860 from the middle, their bodies at twice the size clear of the table's ends; the chute's mouth hangs 440 above the table's middle, above his head as he dives under it.
14. No gamepad: the new game reads none yet (R4 §9's gamepad line has nothing to stand on). The banquet takes the same actions as the shift, so it follows whenever the shift gets one.

---

## File Structure

- `src/sim/quests/hungry/table.ts` (create): `TABLE`, `EaterId`, `RIVALS`, `RivalId`, `Seat`, `SEATS`, `onScreen`, `floorOf`, `dirOf`, `screenDeg`, `sub`, `dist`.
- `src/sim/quests/hungry/food.ts` (create): `FoodKind`, `Course`, `FoodSpec`, `FOODS`, `COURSES`, `SPECIALS`, `Dish`, `Box`, `DISH`, `settled`, `stepDishes`.
- `src/sim/quests/hungry/events.ts` (create): `HungryEvent`.
- `src/sim/quests/hungry/hungry.ts` (create): `HUNGRY`, `GRADE_SCALE`, `GRADES`, `Grade`, `gradeFor`, `DivePhase`, `Dive`, `Eater`, `Hammer`, `Rival`, `Flight`, `Plane`, `Suitcase`, `Server`, `Cart`, `Score`, `Hungry`, `HungryResult`, `HungryOptions`, `createHungry`, `stepHungry`, `addDish`, `baseReach`, `handOf`, `serverAt`, `planeAt`, `reactionFor`, `land`, `bonk`, `payback`, `hungryHint`.
- `src/sim/quests/hungry/drive.ts` (create): `Player`, `idlePlayer`, `steadyPlayer`, `sharpPlayer`, `playRound`, `suggestScale`.
- `src/sim/events.ts`, `src/sim/game.ts`, `src/sim/run.ts`, `src/sim/level.ts`, `src/sim/levels/lobby.ts`, `src/sim/feel.ts` (modify): the modes, `Game.quest`, `newQuest`, `finishQuest`, the quest door, `Run.spent`, the payout, the feel.
- `src/sim/rig/skeleton.ts`, `src/sim/rig/pose.ts`, `src/sim/rig/fk.ts`, `src/sim/rig/actions.ts` (modify): `Pose.lift`. `src/sim/rig/dive.ts` (create): `DIVE`, `divePose`, `coilPose`, `diveK`.
- `src/render/quests/frame.ts` (create): `BANQUET_FRAME`, `banquetFrame`, `zoomFor`.
- `src/render/quests/diner.ts` (create): `Diner`.
- `src/render/quests/hungry-scene.ts` (create): `BanquetView`.
- `src/render/look.ts`, `src/render/hud.ts`, `src/render/sound.ts`, `src/render/boards.ts`, `src/render/app.ts`, `src/render/cast.ts`, `src/render/venue.ts` (modify): the banquet shown, its HUD, its cues, its boards, `RenderApp.auto`, `LOOKS.nurse`, the quest door's glow and THANK YOU card.
- `src/game/audio.ts` (modify): `clash()`.
- `src/art/registry.ts` (modify): `Registry.banquet`. `src/sim/level.ts` (modify): `CastPerson` adds `nurse`.
- `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `scripts/art-grid.mjs` (modify): `foodCells`, `ovalOf`, the banquet's sync, the nurse, the pig's tufts in their own block, the `banquet/<name>` grid targets.
- `art/cuts/ballroom.json`, `art/cuts/banquet-table.json`, `art/cuts/cast-nurse.json` (create, once the paintings are in).
- `src/components/next-game.tsx`, `next-hud.tsx`, `next-veil.tsx`, `next-start.tsx`, `next-keys.ts`, `src/styles.css`, `src/routes/index.tsx` (modify): the round's HUD, its cards, practice, `quest`.
- `scripts/start-art.mjs` (modify), `public/start/banquet.webp` (create, committed).
- Tests: `scripts/banquet.check.mjs` (create, added to `test:next`), `scripts/banquet-tune.mjs` (create), `scripts/rig.check.mjs`, `scripts/art.check.mjs`, `scripts/render.check.mjs` (modify); `scripts/hungry-browser.check.mjs` (create); `scripts/next-start.check.mjs`, `scripts/look-boards.mjs`, `scripts/next-browser.check.mjs` (modify).
- Docs: `README.md`, the R4 design (as built), `art/ART-REQUEST.md`, `docs/superpowers/handoff-<date>-r5.md`.
- Task 12 (the deletion) deletes the old engine and its checks (listed there).

`scripts/banquet.check.mjs` defines its helpers once at its top (Task 2, Step 1) and every later task appends its tests below them; each task's imports go at the top of the file with the others (the loader hoists them either way, but keep them together).

---

### Task 1: R3's leftovers

**Files:**
- Modify: `src/render/look.ts` (`onKey`, `setQuality`, `start`, the tick's first lines, the probe), `src/render/app.ts` (`RenderApp.auto`, `NextProbe.starts`, `NextProbe.drawing`), `scripts/art-sync.mjs` (`pig`), `scripts/next-start.check.mjs`

**Interfaces:**
- Produces: `RenderApp.auto(): void` (back to `ultra`, the governor settling and stepping down from there); `window.__next.starts` (runs begun from the start screen this page); `window.__next.drawing` (false while the start screen covers the canvas).

- [ ] **Step 1: The failing browser checks** (in `scripts/next-start.check.mjs`)

After the first block's `assert.equal(... "started there, not walked there")` add:

```js
  assert.equal(await page.evaluate(() => window.__next.starts), 1, "the start chosen while it loaded began once");
```

After the three-sizes loop (still on the start screen at 1280 by 800, after `setViewportSize`), add the keyboard and the idle canvas:

```js
  await page.goto(url);
  await page.waitForFunction(() => window.__next?.run?.mode === "title");
  assert.equal(await page.evaluate(() => window.__next.drawing), false, "the canvas rests under the start screen");
  // The keyboard drives the start screen: the arrows move through the quality list, Space presses Clock in.
  await page.locator(".next-start__quality select").focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.locator(".next-start__quality select").inputValue(), "high");
  await page.locator(".next-start__quality select").selectOption("auto");
  await page.getByRole("button", { name: "Clock in" }).focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__next.run.mode === "card" || window.__next.run.mode === "play");
  assert.equal(await page.evaluate(() => window.__next.drawing), true);
```

In the quality block, after `selectOption("low")` and its assert, wait for the tier and then check Auto goes back to the top:

```js
  await page.waitForFunction(() => window.__next.quality === "low", null, { timeout: 3000 });
```

and after `selectOption("auto")` and its assert:

```js
  await page.waitForFunction(() => window.__next.quality === "ultra", null, { timeout: 3000 });
```

Run: `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/next-start.check.mjs http://127.0.0.1:8090/`
Expected: FAIL at `window.__next.starts` (undefined).

- [ ] **Step 2: The keyboard on the start screen** (in `src/render/look.ts`, `onKey`)

```ts
  const onKey = (e: KeyboardEvent) => {
    // On the start screen the keys are the page's: Space and Enter press its buttons, the arrows move through its list.
    if (game.mode === "title") return;
    if (e.code in KEY_BINDINGS) e.preventDefault();
```

(the rest of `onKey` as it is).

- [ ] **Step 3: Auto goes back to the top** (in `src/render/app.ts`)

Add to the `RenderApp` type, after `setQuality`:

```ts
  /** Auto again after a fixed tier: back to the top, the governor settling and stepping down from there (R4 Task 1). */
  auto(): void;
```

In `createRenderApp`, add to `out` after `setQuality(q) {…},`:

```ts
    auto() {
      settle = 2;
      acc = work = n = 0;
      intervals.length = 0;
      out.setQuality("ultra");
    },
```

(`settle`, `acc`, `work`, `n` and `intervals` are declared below `out`; `auto` only runs after they exist.) In `src/render/look.ts`, `setQuality`:

```ts
      if (q) render.setQuality(q);
      else render.auto();
```

- [ ] **Step 4: Starts counted, the canvas idle under the start screen** (in `src/render/look.ts` and `src/render/app.ts`)

In `NextProbe` (`app.ts`) add:

```ts
  /** Runs begun from the start screen on this page: a start chosen while it loaded begins once. */
  starts?: number;
  /** The canvas draws: false while the start screen covers it. */
  drawing?: boolean;
```

In `look.ts`, beside `let gifts = 0;` add `let starts = 0;`; in `start(at)` add `starts++;` as its first line. At the top of `tick`:

```ts
    // Under the opaque start screen nothing needs drawing: the canvas rests until a start is chosen.
    app.stage.visible = game.mode !== "title";
```

and in the probe block (`if (window.__next) {`), after `window.__next.run = {…};`:

```ts
      window.__next.starts = starts;
      window.__next.drawing = app.stage.visible;
```

- [ ] **Step 5: The pig's tufts in their own block** (in `scripts/art-sync.mjs`, `pig`)

Inside the `tolerant("pig", …)` block, replace the tufts loop and the registry line with:

```js
    registry.pig = { rig: rigFile, span: rig.span, stuffing: [] };
```

and keep the log line as `console.log(\`pig: ${bodyLayers(cuts).length} layers and the head, ${Object.keys(rig.head.faces ?? {}).length} faces\`);`. After the block closes, add:

```js
  // A bad tuft sheet loses the tufts only: the painted pig stays.
  const tufts = join(PIG_IN, "pig-stuffing.png");
  if (registry.pig && existsSync(tufts))
    await tolerant("pig stuffing", strict, async () => {
      for (const [i, p] of (await sheetPieces(await keyOut(readFileSync(tufts)))).entries()) {
        const name = `cast/pig-stuffing-${i + 1}.png`;
        writeFileSync(join(OUT, name), await scaled(p.png, p.width, TUFT_SCALE));
        registry.pig.stuffing.push({ file: name, width: Math.round(p.width * TUFT_SCALE), height: Math.round(p.height * TUFT_SCALE), base: { x: Math.round(p.base.x * TUFT_SCALE), y: Math.round(p.base.y * TUFT_SCALE) } });
      }
      console.log(`pig stuffing: ${registry.pig.stuffing.length} tufts`);
    });
```

Run: `npm run art:sync`
Expected: `pig: 7 layers and the head, 4 faces` then `pig stuffing: <n> tufts` with the same n as before (the sync reads the owner's folder, so this change has no node test; the review reads it).

- [ ] **Step 6: Run the checks**

Run: `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/next-start.check.mjs http://127.0.0.1:8090/`, then `node scripts/next-browser.check.mjs http://127.0.0.1:8090/`, `npx tsc --noEmit`, `npx eslint src/render scripts`
Expected: PASS, no type or lint errors.

- [ ] **Step 7: Commit and push**

```bash
git add src/render/look.ts src/render/app.ts scripts/art-sync.mjs scripts/next-start.check.mjs
```

Message: "R3's leftovers: the keyboard on the start screen, Auto back to the top, the pig's tufts on their own, starts counted, the canvas idle under the start screen". Push.

---

### Task 2: The table and the dishes

**Files:**
- Create: `src/sim/quests/hungry/table.ts`, `src/sim/quests/hungry/food.ts`, `scripts/banquet.check.mjs`
- Modify: `package.json` (`test:next` adds `scripts/banquet.check.mjs` after `scripts/pig.check.mjs`)

**Interfaces:**
- Produces: `TABLE = { r: 750, squash: 0.37, height: 370 }` (the owner's painted table's proportion and cloth, R4 §2); `BANQUET_SCALE = 2` (everyone at the banquet drawn twice their shift size); `type EaterId = "hammer" | "student" | "bellhop" | "nurse"`; `RIVALS = ["student", "bellhop", "nurse"] as const`, `type RivalId`; `type Seat = { stand: Point; plate: Point; facing: 1 | -1; far: boolean }`; `SEATS: Record<EaterId, Seat>`; `onScreen(p: Point): Point`; `floorOf(p: Point): Point`; `dirOf(facing: 1 | -1, deg: number): Point`; `screenDeg(facing: 1 | -1, d: Point): number`; `sub(a, b): Point`; `dist(a, b): number`. `type FoodKind` (the shipped nineteen); `type Course = "appetizer" | "entree" | "dessert" | "special"`; `type FoodSpec = { name; value; r; course; sheet: number | null; tag; color: number }`; `FOODS`; `COURSES: Record<Exclude<Course, "special">, FoodKind[]>`; `SPECIALS: FoodKind[]`; `type Dish = { id; kind; x; y; vx; vy; r; fall }`; `type Box = { x; y; w; h }`; `DISH = { friction: 2.4, restitution: 0.6, rim: 0.7, rest: 40, stop: 5, fall: 0.2 }`; `settled(d: Dish): boolean`; `stepDishes(dishes: Dish[], dt: number, boxes?: readonly Box[]): void`.

The table top is in table coordinates: x to the right, y toward the far side, its middle at 0, 0, world px. The screen (world px, y down) shows it squashed: `onScreen({ x, y }) = { x, y: -y * squash }`; someone standing at a table point has their feet `TABLE.height` lower on screen (`floorOf`).

- [ ] **Step 1: Write the failing tests** (create `scripts/banquet.check.mjs`; add it to `test:next`)

```js
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { TABLE, SEATS, RIVALS, onScreen, floorOf, dirOf, screenDeg, sub, dist } from "../src/sim/quests/hungry/table.ts";
import { DISH, FOODS, COURSES, SPECIALS, settled, stepDishes } from "../src/sim/quests/hungry/food.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const near = (a, b, what, tol = 2 * STEP + 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not ${b}`);
/** A dish at rest (or moving) on the cloth. */
const dish = (id, x, y, vx = 0, vy = 0, kind = "ribeye") => ({ id, kind, x, y, vx, vy, r: FOODS[kind].r, fall: 0 });
const slide = (dishes, seconds, boxes = []) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepDishes(dishes, STEP, boxes);
};
const overlapOf = (ds) => {
  let worst = 0;
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) worst = Math.max(worst, ds[i].r + ds[j].r - dist(ds[i], ds[j]));
  return worst;
};

test("the table is a circle of 750 squashed to a 1500 by 555 oval on screen, as painted; the floor is drawn 370 under any point of it", () => {
  assert.ok(Math.abs(onScreen({ x: 0, y: 750 }).y + 277.5) < 1e-9);
  assert.ok(Math.abs(onScreen({ x: 0, y: -750 }).y - 277.5) < 1e-9);
  assert.equal(onScreen({ x: 750, y: 0 }).x, 750);
  assert.equal(floorOf({ x: -860, y: 0 }).y, TABLE.height);
  assert.ok(Math.abs(floorOf({ x: 0, y: 750 }).y - (-277.5 + TABLE.height)) < 1e-9);
  assert.equal(TABLE.height, 370);
});

test("each plate sits where the design puts it: the nurse's 1160 from his, the student's 538, the bellhop's 912, all inside his 30 degrees", () => {
  const h = SEATS.hammer.plate;
  assert.ok(Math.abs(dist(h, SEATS.nurse.plate) - 1160) < 1);
  assert.ok(Math.abs(dist(h, SEATS.student.plate) - 538) < 1);
  assert.ok(Math.abs(dist(h, SEATS.bellhop.plate) - 912) < 1);
  for (const id of RIVALS) {
    const deg = screenDeg(1, sub(SEATS[id].plate, h));
    assert.ok(Math.abs(deg) <= 30, `${id} at ${deg.toFixed(1)} degrees`);
  }
  for (const id of ["student", "bellhop"]) assert.ok(Math.hypot(SEATS[id].stand.x, SEATS[id].stand.y) > TABLE.r, `${id} stands behind the far rim`);
  assert.deepEqual([SEATS.hammer.facing, SEATS.student.facing, SEATS.bellhop.facing, SEATS.nurse.facing], [1, 1, -1, -1]);
});

test("a line aimed n degrees up on screen looks n degrees up, and is a unit on the table top: 30 on screen is about 57 on the table", () => {
  for (const facing of [1, -1])
    for (let deg = -30; deg <= 30; deg += 5) {
      const d = dirOf(facing, deg);
      assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9);
      assert.ok(Math.abs(screenDeg(facing, d) - deg) < 1e-9, `facing ${facing}, ${deg}`);
    }
  const d = dirOf(1, 30);
  assert.ok(Math.abs((Math.atan2(d.y, d.x) * 180) / Math.PI - 57.3) < 0.5);
});

test("the dishes: the shipped values, radii 26 to 34, three courses and six specials, sixteen in the food sheet's order", () => {
  assert.deepEqual([FOODS.shrimp.value, FOODS.bread.value, FOODS.ribeye.value, FOODS.pudding.value, FOODS.check.value], [80, 50, 300, 160, -400]);
  for (const f of Object.values(FOODS)) assert.ok(f.r >= 26 && f.r <= 34, f.name);
  assert.deepEqual(COURSES.appetizer, ["shrimp", "bread", "eggs", "kolache", "nuggets"]);
  assert.deepEqual(COURSES.entree, ["ribeye", "chicken", "brisket", "grits", "club"]);
  assert.deepEqual(COURSES.dessert, ["pie", "cheesecake", "pudding"]);
  assert.deepEqual(SPECIALS, ["coke", "nuts", "bucees", "hotsauce", "togo", "check"]);
  assert.deepEqual(Object.values(FOODS).map((f) => f.sheet).filter((s) => s !== null), [...Array(16).keys()]);
});

test("a dish slides, slows at 2.4 a second and stops: from 500 px/s it travels about 208 px", () => {
  const d = dish(1, 0, 0, 500, 0);
  slide([d], 4);
  assert.deepEqual([d.vx, d.vy], [0, 0]);
  assert.ok(Math.abs(d.x - 500 / DISH.friction) < 8, `${d.x}`);
  assert.ok(settled(d));
});

test("two dishes meeting bounce apart, slower than they came; one dropped exactly on another is pushed apart, never NaN", () => {
  const a = dish(1, -100, 0, 400, 0);
  const b = dish(2, 100, 0, -400, 0);
  slide([a, b], 0.3);
  assert.ok(a.vx < 0 && b.vx > 0, "they bounced");
  assert.ok(Math.abs(a.vx) < 400 * DISH.restitution && Math.abs(b.vx) < 400 * DISH.restitution, `${a.vx} ${b.vx}`);
  const c = dish(3, 50, 50);
  const d = dish(4, 50, 50);
  slide([c, d], 0.2);
  assert.ok(Number.isFinite(c.x + c.y + d.x + d.y));
  assert.ok(dist(c, d) >= c.r + d.r - 1, `still ${c.r + d.r - dist(c, d)} px into each other`);
});

test("the rim sends a dish back at 0.7 of its speed", () => {
  const d = dish(1, TABLE.r - 40, 0, 1000, 0, "shrimp");
  stepDishes([d], STEP);
  stepDishes([d], STEP);
  assert.ok(d.vx < 0 && -d.vx > 640 && -d.vx <= 700 + 1e-9, `${d.vx}`);
  assert.ok(Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-9);
});

test("nothing leaves the table: a hundred dishes fired from the middle at 2000 px/s stay inside the rim, part and come to rest", () => {
  const ds = Array.from({ length: 100 }, (_, i) => {
    const a = (i / 100) * Math.PI * 2;
    return dish(i + 1, Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 2000, Math.sin(a) * 2000, i % 2 ? "ribeye" : "shrimp");
  });
  for (let s = 0; s < 6 / STEP; s++) {
    stepDishes(ds, STEP);
    if (s % 60 === 0) for (const d of ds) assert.ok(Number.isFinite(d.x + d.y + d.vx + d.vy), `dish ${d.id} went NaN`);
  }
  for (const d of ds) assert.ok(Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-6, `dish ${d.id} at ${Math.hypot(d.x, d.y)}`);
  assert.ok(overlapOf(ds) < 4, `overlap ${overlapOf(ds)}`);
  assert.ok(ds.every(settled));
});

test("a dish dropping from the chute is not on the cloth until it lands: it neither moves nor knocks anything", () => {
  const d = { ...dish(1, 0, 0, 300, 0), fall: 0.2 };
  const under = dish(2, 0, 0);
  slide([d, under], 0.1);
  assert.deepEqual([d.x, d.y, under.x, under.y], [0, 0, 0, 0]);
  assert.ok(d.fall > 0);
  slide([d], 0.15);
  assert.ok(d.fall === 0 && d.x > 0);
});

test("a dish bounces off a suitcase on the cloth", () => {
  const d = dish(1, -200, 0, 600, 0, "shrimp");
  slide([d], 1, [{ x: -50, y: -40, w: 120, h: 80 }]);
  assert.ok(d.x <= -50 - d.r + 1e-6, `kept out of the case: ${d.x}`);
});
```

Run: `npm run test:next`
Expected: FAIL (`banquet.check.mjs`: cannot find `src/sim/quests/hungry/table.ts`).

- [ ] **Step 2: The table** (create `src/sim/quests/hungry/table.ts`)

```ts
import type { Point } from "../../types";

/**
 * The round banquet table (R4 design §2): its top a circle seen from above at an angle, squashed on screen to an oval
 * 1500 by 555, the owner's painted table's own proportion. Table coordinates: x to the right, y toward the far side,
 * the middle at 0, 0, world px.
 */
export const TABLE = {
  r: 750,
  /** Screen px down per table px toward the camera: the painted top's depth for its width (0.368, measured). */
  squash: 0.37,
  /** How far below the top the floor is drawn under any point of it: the painted cloth's drop at a 1500-wide top. */
  height: 370,
} as const;

/** Everyone at the banquet is drawn this many times their shift size, so the tabletop reaches their belly (owner, R4 §1). */
export const BANQUET_SCALE = 2;

export type EaterId = "hammer" | "student" | "bellhop" | "nurse";
export const RIVALS = ["student", "bellhop", "nurse"] as const;
export type RivalId = (typeof RIVALS)[number];
/** Where an eater stands (the table point over their feet), their plate, the way they face on screen, and whether the table hides them below the waist. */
export type Seat = { stand: Point; plate: Point; facing: 1 | -1; far: boolean };

/** R4 §2's table: Hammer at the left end, the student and the bellhop behind the far rim, the nurse at the right end. */
export const SEATS: Record<EaterId, Seat> = {
  hammer: { stand: { x: -860, y: 0 }, plate: { x: -590, y: 0 }, facing: 1, far: false },
  student: { stand: { x: -330, y: 790 }, plate: { x: -230, y: 400 }, facing: 1, far: true },
  bellhop: { stand: { x: 330, y: 790 }, plate: { x: 230, y: 400 }, facing: -1, far: true },
  nurse: { stand: { x: 860, y: 0 }, plate: { x: 570, y: 0 }, facing: -1, far: false },
};

export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** A point of the table top on screen (world px, y down). */
export const onScreen = (p: Point): Point => ({ x: p.x, y: -p.y * TABLE.squash });
/** The floor under a point of (or beside) the table, on screen: the feet of someone standing there. */
export const floorOf = (p: Point): Point => ({ x: p.x, y: -p.y * TABLE.squash + TABLE.height });

const DEG = Math.PI / 180;
/** The unit direction on the table top that looks `deg` degrees up from `facing` on screen. */
export function dirOf(facing: 1 | -1, deg: number): Point {
  const x = facing * Math.cos(deg * DEG);
  const y = Math.sin(deg * DEG) / TABLE.squash;
  const n = Math.hypot(x, y);
  return { x: x / n, y: y / n };
}
/** How many degrees up from `facing` a table-top direction looks on screen. */
export const screenDeg = (facing: 1 | -1, d: Point) => Math.atan2(d.y * TABLE.squash, d.x * facing) / DEG;
```

- [ ] **Step 3: The dishes** (create `src/sim/quests/hungry/food.ts`)

```ts
import { TABLE } from "./table";

/** The shipped banquet's dishes (expansion spec Appendix B) and its specials. */
export type FoodKind =
  | "shrimp" | "bread" | "eggs" | "kolache" | "nuggets"
  | "ribeye" | "chicken" | "brisket" | "grits" | "club"
  | "pie" | "cheesecake" | "pudding"
  | "coke" | "nuts" | "bucees" | "hotsauce" | "togo" | "check";
export type Course = "appetizer" | "entree" | "dessert" | "special";
/** What a dish is called and worth, its plate's radius on the cloth, its cell on the owner's food sheet, and its drawn plate's tag and color. */
export type FoodSpec = { name: string; value: number; r: number; course: Course; sheet: number | null; tag: string; color: number };

export const FOODS: Record<FoodKind, FoodSpec> = {
  shrimp: { name: "Shrimp cocktail", value: 80, r: 27, course: "appetizer", sheet: 0, tag: "SHR", color: 0xf08a6c },
  bread: { name: "Bread basket", value: 50, r: 28, course: "appetizer", sheet: 1, tag: "BRD", color: 0xd9a35a },
  eggs: { name: "Deviled eggs", value: 60, r: 27, course: "appetizer", sheet: 2, tag: "EGG", color: 0xf2d65c },
  kolache: { name: "Kolache", value: 70, r: 26, course: "appetizer", sheet: 3, tag: "KOL", color: 0xe8b46a },
  nuggets: { name: "Beaver Nuggets", value: 90, r: 27, course: "appetizer", sheet: 4, tag: "BVR", color: 0xc98a3c },
  ribeye: { name: "Ribeye", value: 300, r: 34, course: "entree", sheet: 5, tag: "RIB", color: 0x8a3b2a },
  chicken: { name: "Chicken fried steak", value: 220, r: 33, course: "entree", sheet: 6, tag: "CFS", color: 0xc7924e },
  brisket: { name: "Brisket plate", value: 260, r: 34, course: "entree", sheet: 7, tag: "BSK", color: 0x6b3a26 },
  grits: { name: "Shrimp and grits", value: 200, r: 32, course: "entree", sheet: 8, tag: "GRT", color: 0xefd9a0 },
  club: { name: "Club sandwich", value: 150, r: 32, course: "entree", sheet: 9, tag: "CLB", color: 0xe3c27a },
  pie: { name: "Pie slice", value: 180, r: 29, course: "dessert", sheet: 10, tag: "PIE", color: 0xc2643c },
  cheesecake: { name: "Cheesecake", value: 200, r: 29, course: "dessert", sheet: 11, tag: "CHZ", color: 0xf5ecd2 },
  pudding: { name: "Banana pudding", value: 160, r: 28, course: "dessert", sheet: 12, tag: "PUD", color: 0xf3e08a },
  coke: { name: "Coke Zero", value: 100, r: 26, course: "special", sheet: null, tag: "ZRO", color: 0x1b1b1b },
  nuts: { name: "Mixed nuts", value: 100, r: 27, course: "special", sheet: null, tag: "NUT", color: 0xa8742f },
  bucees: { name: "Buc-ee's", value: 300, r: 28, course: "special", sheet: null, tag: "BUC", color: 0xf5c518 },
  hotsauce: { name: "Hot sauce", value: 150, r: 26, course: "special", sheet: 13, tag: "HOT", color: 0xc8281e },
  togo: { name: "To-go box", value: 0, r: 30, course: "special", sheet: 14, tag: "TOGO", color: 0xf4f1ea },
  check: { name: "The check", value: -400, r: 28, course: "special", sheet: 15, tag: "BILL", color: 0x2a1d14 },
};

const kinds = Object.keys(FOODS) as FoodKind[];
export const COURSES: Record<Exclude<Course, "special">, FoodKind[]> = {
  appetizer: kinds.filter((k) => FOODS[k].course === "appetizer"),
  entree: kinds.filter((k) => FOODS[k].course === "entree"),
  dessert: kinds.filter((k) => FOODS[k].course === "dessert"),
};
export const SPECIALS: FoodKind[] = kinds.filter((k) => FOODS[k].course === "special");

/** A dish on the table top: its middle, its velocity, its plate's radius; `fall` the seconds it is still dropping from the chute. */
export type Dish = { id: number; kind: FoodKind; x: number; y: number; vx: number; vy: number; r: number; fall: number };
/** Something on the cloth food bounces off (the bellhop's suitcase), in table coordinates, from its corner at x, y. */
export type Box = { x: number; y: number; w: number; h: number };

/** R4 §5's disc physics. */
export const DISH = {
  /** Speed kept a second: e^(-2.4). */
  friction: 2.4,
  restitution: 0.6,
  rim: 0.7,
  /** Under this speed a dish has come to rest: the rivals and the server go for it. */
  rest: 40,
  /** Under this it stops dead. */
  stop: 5,
  /** Seconds a dish drops from the chute before it is on the cloth. */
  fall: 0.2,
} as const;

/** On the cloth and slow enough to be called resting. */
export const settled = (d: Dish) => d.fall <= 0 && Math.hypot(d.vx, d.vy) < DISH.rest;

/** One step of the table: dishes land, slide and slow, knock into each other, and bounce off the rim and any box. */
export function stepDishes(dishes: Dish[], dt: number, boxes: readonly Box[] = []): void {
  const damp = Math.exp(-DISH.friction * dt);
  for (const d of dishes) {
    if (d.fall > 0) {
      d.fall = Math.max(0, d.fall - dt);
      continue;
    }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= damp;
    d.vy *= damp;
    if (Math.hypot(d.vx, d.vy) < DISH.stop) d.vx = d.vy = 0;
  }
  // Two that overlap are pushed apart along the line between their middles; their closing speed bounces back at 0.6.
  for (let i = 0; i < dishes.length; i++) {
    const a = dishes[i];
    if (a.fall > 0) continue;
    for (let j = i + 1; j < dishes.length; j++) {
      const b = dishes[j];
      if (b.fall > 0) continue;
      let nx = b.x - a.x;
      let ny = b.y - a.y;
      const n = Math.hypot(nx, ny);
      const over = a.r + b.r - n;
      if (over <= 0) continue;
      // One dropped exactly on another goes off to the side: any direction is as good as another.
      if (n < 1e-9) {
        nx = 1;
        ny = 0;
      } else {
        nx /= n;
        ny /= n;
      }
      a.x -= (nx * over) / 2;
      a.y -= (ny * over) / 2;
      b.x += (nx * over) / 2;
      b.y += (ny * over) / 2;
      const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (closing >= 0) continue;
      const k = ((1 + DISH.restitution) * closing) / 2;
      a.vx += k * nx;
      a.vy += k * ny;
      b.vx -= k * nx;
      b.vy -= k * ny;
    }
  }
  for (const d of dishes) {
    if (d.fall > 0) continue;
    const n = Math.hypot(d.x, d.y);
    const max = TABLE.r - d.r;
    if (n > max) {
      const ux = d.x / n;
      const uy = d.y / n;
      d.x = ux * max;
      d.y = uy * max;
      const out = d.vx * ux + d.vy * uy;
      if (out > 0) {
        d.vx -= (1 + DISH.rim) * out * ux;
        d.vy -= (1 + DISH.rim) * out * uy;
      }
    }
    for (const b of boxes) bounceOff(d, b);
  }
}

/** Out of a box the way it came in, the speed into the box turned back at the rim's 0.7. */
function bounceOff(d: Dish, b: Box) {
  const cx = Math.min(b.x + b.w, Math.max(b.x, d.x));
  const cy = Math.min(b.y + b.h, Math.max(b.y, d.y));
  let nx = d.x - cx;
  let ny = d.y - cy;
  const n = Math.hypot(nx, ny);
  if (n >= d.r) return;
  if (n < 1e-9) {
    // The middle inside the box: out through the nearest side.
    const sides = [d.x - b.x, b.x + b.w - d.x, d.y - b.y, b.y + b.h - d.y];
    const i = sides.indexOf(Math.min(...sides));
    [nx, ny] = [[-1, 0], [1, 0], [0, -1], [0, 1]][i];
    d.x = i === 0 ? b.x - d.r : i === 1 ? b.x + b.w + d.r : d.x;
    d.y = i === 2 ? b.y - d.r : i === 3 ? b.y + b.h + d.r : d.y;
  } else {
    nx /= n;
    ny /= n;
    d.x = cx + nx * d.r;
    d.y = cy + ny * d.r;
  }
  const into = d.vx * nx + d.vy * ny;
  if (into < 0) {
    d.vx -= (1 + DISH.rim) * into * nx;
    d.vy -= (1 + DISH.rim) * into * ny;
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test:next`
Expected: PASS (`banquet.check.mjs`: 10 tests; the rest as before).

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/quests/hungry/table.ts src/sim/quests/hungry/food.ts scripts/banquet.check.mjs package.json
```

Message: "The banquet's table and its dishes: a round top seen at an angle, the plates where the design puts them, discs that slide, knock and stay on the cloth". Push.

---

### Task 3: The round: his dive, the haul, the courses and the score

**Files:**
- Create: `src/sim/quests/hungry/events.ts`, `src/sim/quests/hungry/hungry.ts`
- Modify: `scripts/banquet.check.mjs` (append)

**Interfaces:**
- Consumes: Task 2's table and dishes; `MOVE_SECONDS.swing`, `SWING_ACTIVE` (`src/sim/moves.ts`); `seededRandom` (`src/sim/rewards.ts`); `Input` (`src/sim/input.ts`).
- Produces: `HungryEvent` (`hhDump { x, y, count, kinds, cart }`, `hhDive { who, charged }`, `hhChomp { who, x, y, count }`, `hhLand { who, kind, points }`, `hhRob { from, kind, x, y }`, `hhClash { x, y }`, `hhSwing`, `hhBonk { x, y, hit }`, `hhStun { who, x, y }`, `hhTray { x, y }`, `hhSlap { x, y }`, `hhPlane { x, y }`, `hhPaper { x, y, hit }`, `hhSwat { x, y }`, `hhSuitcase { x, y, on }`, `hhCart { x, y }`, `hhBus { x, y, count }`, `hhSay { who, text, seconds }`, `hhThink { text, seconds }`, `hhEnd { score, grade }`; positions on the table top). `HUNGRY` (every number of R4 §3 to §6); `WAVES`; `GRADE_SCALE`; `type Grade`; `GRADES`; `gradeFor(score): Grade`; `type DivePhase = "coil" | "out" | "hold" | "back"`; `type Dive`; `type Eater`; `type Hammer`; `type Rival`; `type Flight`; `type Plane`; `type Suitcase`; `type Server`; `type Cart`; `type Score`; `type HungryResult = { score; grade; full; plate; grabs; comboBonus; bestCombo; robbed; paper; specials; bill; cans; nuts; bucees; hot }`; `type HungryOptions = { practice?; schedule?; rivals?; server? }`; `type Hungry`; `createHungry(seed: number, opts?: HungryOptions): Hungry`; `stepHungry(q: Hungry, input: Input, dt: number): void`; `addDish(q, kind, x, y, vx?, vy?, fall?): Dish`; `baseReach(q): number`; `handOf(e: Eater): Point`; `land(q, to: EaterId, kind, bonus?): void`; `bonk(q): void`; `hungryHint(q): string`. Task 4 adds `reactionFor`, `serverAt`, `planeAt`, `payback`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/banquet.check.mjs`; the import goes at the top with the others)

```js
import { HUNGRY, WAVES, GRADES, gradeFor, createHungry, stepHungry, addDish, baseReach, handOf, land, hungryHint } from "../src/sim/quests/hungry/hungry.ts";

/** A round with nothing scheduled, the rivals asleep and the server away: Hammer alone at the table. */
const alone = (seed = 1) => createHungry(seed, { practice: true, schedule: false, rivals: false, server: false });
const P = SEATS.hammer.plate;
const run = (q, seconds, held = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    stepHungry(q, input(held), STEP);
    out.push(...q.events);
  }
  return out;
};
const press = (q, key, held = {}) => {
  stepHungry(q, input({ ...held, [key]: true }, { [key]: true }), STEP);
  return [...q.events];
};
/** A tap: the key down one step and up the next. */
const tap = (q, key = "jump") => [...press(q, key), ...run(q, STEP)];
/** Every phase change of his dive until it is over: the phase and when. */
const phases = (q) => {
  const out = [];
  let t = 0;
  let last = q.hammer.dive?.phase ?? null;
  while (q.hammer.dive && t < 3) {
    stepHungry(q, input(), STEP);
    t += STEP;
    const now = q.hammer.dive?.phase ?? null;
    if (now !== last) out.push({ phase: (last = now), t });
  }
  return out;
};

test("a tap: the hand goes 520 px out in 0.14 s, holds 0.04 s and slides back in 0.10 s", () => {
  const q = alone();
  press(q, "jump");
  assert.equal(q.hammer.dive.phase, "coil");
  const evs = run(q, STEP);
  assert.deepEqual(of(evs, "hhDive").map((e) => [e.who, e.charged]), [["hammer", false]]);
  const marks = phases(q);
  assert.deepEqual(marks.map((m) => m.phase), ["hold", "back", null]);
  near(marks[0].t, 0.14, "out");
  near(marks[1].t - marks[0].t, HUNGRY.hold, "hold");
  near(marks[2].t - marks[1].t, 0.1, "back");
});

test("his reach grows 10 px for every dish he eats and stops at 760", () => {
  const q = alone();
  assert.equal(baseReach(q), 520);
  q.score.eaten = 10;
  assert.equal(baseReach(q), 620);
  q.score.eaten = 40;
  assert.equal(baseReach(q), 760);
});

test("the sweep takes what it crosses on the way out, carries it to full stretch and flies it home in 0.25 s; nothing past the hand or wide of it", () => {
  const q = alone();
  const on = addDish(q, "ribeye", P.x + 300, P.y + 40);
  const wide = addDish(q, "shrimp", P.x + 300, P.y + 120);
  const past = addDish(q, "club", P.x + 600, P.y);
  const behind = addDish(q, "pie", P.x - 100, P.y);
  const evs = tap(q);
  let t = 0;
  let held = null;
  let landed = null;
  while (t < 1) {
    stepHungry(q, input(), STEP);
    t += STEP;
    evs.push(...q.events);
    if (held === null && q.hammer.dive?.phase === "hold") held = t;
    if (landed === null && of(q.events, "hhLand").length) landed = t;
  }
  const left = q.dishes.map((d) => d.id);
  assert.ok(!left.includes(on.id), "the ribeye on his line");
  for (const d of [wide, past, behind]) assert.ok(left.includes(d.id), `the ${d.kind} stays`);
  assert.deepEqual(of(evs, "hhChomp").map((e) => [e.who, e.count]), [["hammer", 1]]);
  assert.deepEqual(of(evs, "hhLand").map((e) => [e.who, e.kind, e.points]), [["hammer", "ribeye", 300]]);
  near(landed - held, HUNGRY.fly, "flies home in 0.25 s");
  assert.deepEqual([q.score.plate, q.score.eaten], [300, 1]);
});

test("one dive every 0.3 s at most; holding the key never starts another; nothing while ducked, slapped or swinging", () => {
  const mash = alone();
  let dives = 0;
  for (let i = 0; i < Math.round(3 / STEP); i++) {
    const down = i % 2 === 0;
    stepHungry(mash, input({ jump: down }, { jump: down }), STEP);
    dives += of(mash.events, "hhDive").length;
  }
  assert.ok(dives >= 8 && dives <= 11, `${dives} dives in 3 s`);
  const held = alone();
  press(held, "jump");
  assert.equal(of(run(held, 3, { jump: true }), "hhDive").length, 1, "one, at full charge, then nothing");
  const ducked = alone();
  press(ducked, "jump", { down: true });
  assert.equal(ducked.hammer.dive, null, "ducked");
  const slapped = alone();
  slapped.hammer.stun = 1;
  press(slapped, "jump");
  assert.equal(slapped.hammer.dive, null, "stunned");
  const swinging = alone();
  press(swinging, "hammer");
  run(swinging, 0.05);
  press(swinging, "jump");
  assert.equal(swinging.hammer.dive, null, "mid-swing");
});

test("← and → swing his line up to 30 degrees either way; it stays where it is left; a dive goes out along it", () => {
  const q = alone();
  run(q, 2, { left: true });
  assert.equal(q.hammer.aim, 30);
  run(q, 1);
  assert.equal(q.hammer.aim, 30, "left where it was");
  run(q, 0.5, { right: true });
  assert.ok(Math.abs(q.hammer.aim - (30 - HUNGRY.aimRate * 0.5)) < 1e-6, `${q.hammer.aim}`);
  tap(q);
  const d = q.hammer.dive.dir;
  assert.ok(Math.abs(screenDeg(1, d) - q.hammer.aim) < 1e-9);
  run(q, 0.1);
  const hand = handOf(q.hammer);
  assert.ok(Math.abs(screenDeg(1, sub(hand, P)) - q.hammer.aim) < 1e-6, "the hand is on the line");
});

test("a held press charges from his tap reach to 1180 at 0.5 s, and goes out by itself at 0.5", () => {
  const q = alone();
  press(q, "jump");
  run(q, 0.31 - STEP, { jump: true });
  const mid = 520 + (1180 - 520) * ((0.31 - HUNGRY.tap) / (HUNGRY.charge - HUNGRY.tap));
  assert.ok(Math.abs(q.hammer.dive.reach - mid) < 15, `${q.hammer.dive.reach} not about ${mid}`);
  assert.equal(q.hammer.dive.phase, "coil");
  const evs = run(q, 0.25, { jump: true });
  assert.deepEqual(of(evs, "hhDive").map((e) => e.charged), [true]);
  assert.equal(q.hammer.dive.reach, 1180);
});

test("a charged dive that ends on a rival's plate robs its top dish for its value plus 100; a tap never robs, even reaching over it", () => {
  const q = alone();
  q.rivals.bellhop.plate.push("pie", "ribeye");
  q.hammer.aim = screenDeg(1, sub(SEATS.bellhop.plate, P));
  tap(q);
  run(q, 1);
  assert.deepEqual(q.rivals.bellhop.plate, ["pie", "ribeye"], "a tap falls short");
  press(q, "jump");
  const evs = run(q, 1.5, { jump: true });
  assert.deepEqual(of(evs, "hhRob").map((e) => [e.from, e.kind]), [["bellhop", "ribeye"]]);
  assert.deepEqual(of(evs, "hhLand").map((e) => [e.kind, e.points]), [["ribeye", 400]]);
  assert.deepEqual([q.rivals.bellhop.plate, q.rivals.bellhop.anger, q.score.robbed], [["pie"], 1, 1]);
  const over = alone();
  over.score.eaten = 24;
  over.rivals.student.plate.push("club");
  over.hammer.aim = screenDeg(1, sub(SEATS.student.plate, P));
  tap(over);
  run(over, 1);
  assert.ok(baseReach(over) > dist(P, SEATS.student.plate));
  assert.deepEqual(over.rivals.student.plate, ["club"], "a grown tap passes over it and takes nothing");
});

test("a robbed special pays out as if eaten; a robbed check still costs 400, with no 100 for the rob", () => {
  const q = alone();
  q.rivals.nurse.plate.push("check");
  q.rivals.bellhop.plate.push("nuts");
  q.hammer.aim = screenDeg(1, sub(SEATS.bellhop.plate, P));
  press(q, "jump");
  run(q, 1.5, { jump: true });
  q.hammer.aim = 0;
  press(q, "jump");
  run(q, 1.5, { jump: true });
  assert.deepEqual([q.score.specials, q.score.bill, q.score.plate], [["nuts"], true, 100 + 100 - 400]);
});

test("grabs less than 1.2 s apart build a combo: double from the fifth, triple from the tenth, the bonus counted apart", () => {
  const q = alone();
  for (let i = 0; i < 12; i++) {
    q.time = i * 0.5;
    land(q, "hammer", "bread");
  }
  assert.deepEqual([q.score.plate, q.score.bonus, q.score.best], [600, 550, 12]);
  q.time = 20;
  land(q, "hammer", "bread");
  assert.equal(q.score.chain, 1, "a gap of more than 1.2 s starts over");
});

test("the to-go box doubles his next five grabs; the check costs 400", () => {
  const q = alone();
  land(q, "hammer", "togo");
  for (let i = 0; i < 6; i++) {
    q.time += 2;
    land(q, "hammer", "club");
  }
  assert.equal(q.score.plate, 300 * 5 + 150);
  q.time += 2;
  land(q, "hammer", "check");
  assert.deepEqual([q.score.plate, q.score.bill], [300 * 5 + 150 - 400, true]);
});

test("the waves: 24, 12 and 12 appetizers, 16 and 10 entrees, the cart's 14 desserts, 10 more, then three a second; each special once between 5 and 50 s", () => {
  const q = createHungry(3, { practice: true, rivals: false, server: false });
  const dumps = [];
  const carts = [];
  while (!q.result) {
    stepHungry(q, input(), STEP);
    for (const e of of(q.events, "hhDump")) dumps.push({ t: q.time, ...e });
    carts.push(...of(q.events, "hhCart").map(() => q.time));
    if (Math.round(q.time / STEP) % 60 === 0)
      for (const d of q.dishes) {
        assert.ok(Number.isFinite(d.x + d.y + d.vx + d.vy), "no NaN");
        assert.ok(d.fall > 0 || Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-6, `a dish off the table at ${q.time}`);
      }
  }
  const waves = dumps.filter((d) => d.count > 1 && !d.cart);
  assert.deepEqual(waves.map((d) => [Math.floor(d.t), d.count]), WAVES.map((w) => [w.at, w.count]));
  for (const [i, w] of WAVES.entries()) assert.ok(waves[i].kinds.every((k) => FOODS[k].course === w.course), `wave ${i}`);
  const cart = dumps.filter((d) => d.cart);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].count, 14);
  assert.ok(cart[0].kinds.every((k) => FOODS[k].course === "dessert"));
  assert.ok(carts[0] >= HUNGRY.cart.at && carts[0] < HUNGRY.cart.at + 2, `the cart crashed at ${carts[0]}`);
  const singles = dumps.filter((d) => d.count === 1);
  const specials = singles.filter((d) => FOODS[d.kinds[0]].course === "special");
  assert.deepEqual(specials.map((d) => d.kinds[0]).sort(), [...SPECIALS].sort());
  assert.ok(specials.every((d) => d.t >= 5 && d.t <= 50 + STEP));
  const frenzy = singles.filter((d) => d.t >= HUNGRY.frenzy.from);
  assert.ok(frenzy.length >= 23 && frenzy.length <= 25, `${frenzy.length} in the frenzy`);
  assert.ok(new Set(frenzy.map((d) => FOODS[d.kinds[0]].course)).size >= 2, "from all three courses");
  assert.ok(q.dishes.length > 100, `a crowded table: ${q.dishes.length}`);
  // The last of the frenzy has only just landed: let the table settle, then nothing is left sitting in anything else.
  slide(q.dishes, 2);
  assert.ok(overlapOf(q.dishes) < 6, `overlap ${overlapOf(q.dishes)}`);
  assert.ok(q.dishes.every((d) => Math.hypot(d.x, d.y) <= TABLE.r - d.r + 1e-6));
});

test("a wave pours: its dishes drop from the chute 0.03 s apart and spread from the middle", () => {
  const q = createHungry(4, { practice: true, rivals: false, server: false });
  stepHungry(q, input(), STEP);
  const falls = q.dishes.map((d) => d.fall).sort((a, b) => a - b);
  assert.equal(falls.length, 24);
  for (let i = 1; i < falls.length; i++) assert.ok(Math.abs(falls[i] - falls[i - 1] - HUNGRY.dump.pour) < 1e-9);
  run(q, 2.5);
  const spread = q.dishes.reduce((s, d) => s + Math.hypot(d.x, d.y), 0) / q.dishes.length;
  assert.ok(spread > 150, `spread ${spread}`);
});

test("the round ends at 60 s with a graded result, then nothing more happens; standing still is WATER ONLY", () => {
  const q = createHungry(5, { practice: true });
  const evs = run(q, 61);
  assert.equal(of(evs, "hhEnd").length, 1);
  assert.ok(q.result);
  assert.deepEqual([q.result.score, q.result.grade, q.result.full], [0, "WATER ONLY", false]);
  const t = q.time;
  run(q, 1);
  assert.equal(q.time, t);
  assert.deepEqual(GRADES.map(([, g]) => g), ["COMPED", "GOOD TIPPER", "SPLIT THE CHECK", "WATER ONLY"]);
  assert.equal(gradeFor(GRADES[0][0]), "COMPED");
  assert.equal(gradeFor(GRADES[1][0] - 1), "SPLIT THE CHECK");
});

test("what he ate is in the result: a can for the Coke Zero, the nuts, the Buc-ee's, the hot sauce; a full belly from GOOD TIPPER", () => {
  const q = alone();
  for (const k of ["coke", "nuts", "bucees", "hotsauce"]) land(q, "hammer", k);
  q.score.plate = GRADES[1][0];
  q.time = HUNGRY.round - STEP / 2;
  stepHungry(q, input(), STEP);
  const r = q.result;
  assert.deepEqual([r.cans, r.nuts, r.bucees, r.hot, r.full, r.grade === "GOOD TIPPER" || r.grade === "COMPED"], [1, true, true, true, true, true]);
});

test("the hint names what matters most, as shipped", () => {
  const q = alone();
  assert.equal(hungryHint(q), "Tap Space to dive · hold to reach farther and rob a plate · ← → aim · H bonks the server");
  q.score.togo = 3;
  assert.equal(hungryHint(q), "To-go box · next 3 grabs double");
  q.hammer.stun = 0.5;
  assert.equal(hungryHint(q), "Slapped · wait a second");
});
```

Run: `npm run test:next`
Expected: FAIL (cannot find `src/sim/quests/hungry/hungry.ts`).

- [ ] **Step 2: The events** (create `src/sim/quests/hungry/events.ts`)

```ts
import type { FoodKind } from "./food";
import type { EaterId, RivalId } from "./table";

/**
 * What happened at the banquet in one step (R4). Positions are on the table top (x to the right, y toward the far side,
 * its middle at 0, 0): the scene puts them on screen with `onScreen`.
 */
export type HungryEvent =
  /** Food poured from the chute, a tray or the cart's crash: how many, and which. */
  | { type: "hhDump"; x: number; y: number; count: number; kinds: FoodKind[]; cart: boolean }
  | { type: "hhDive"; who: EaterId; charged: boolean }
  /** A hand swept dishes up. */
  | { type: "hhChomp"; who: EaterId; x: number; y: number; count: number }
  /** A dish landed on a plate; on his, the points it scored. */
  | { type: "hhLand"; who: EaterId; kind: FoodKind; points: number }
  | { type: "hhRob"; from: RivalId; kind: FoodKind; x: number; y: number }
  | { type: "hhClash"; x: number; y: number }
  | { type: "hhSwing" }
  /** The mallet met the rim; `hit` when it caught a rival, the server, a suitcase or paper. */
  | { type: "hhBonk"; x: number; y: number; hit: boolean }
  | { type: "hhStun"; who: RivalId; x: number; y: number }
  /** The server dropped her tray at his end. */
  | { type: "hhTray"; x: number; y: number }
  | { type: "hhSlap"; x: number; y: number }
  /** The student let a paper plane go. */
  | { type: "hhPlane"; x: number; y: number }
  /** A plane reached his spot: `hit` costs 150; otherwise he was ducked or out on the table. */
  | { type: "hhPaper"; x: number; y: number; hit: boolean }
  | { type: "hhSwat"; x: number; y: number }
  /** The bellhop's suitcase went on the cloth (`on`) or came off it. */
  | { type: "hhSuitcase"; x: number; y: number; on: boolean }
  | { type: "hhCart"; x: number; y: number }
  /** The server cleared dishes off the rim. */
  | { type: "hhBus"; x: number; y: number; count: number }
  /** A rival's or the server's line: a speech bubble. */
  | { type: "hhSay"; who: RivalId | "server"; text: string; seconds: number }
  /** His line: a thought. */
  | { type: "hhThink"; text: string; seconds: number }
  | { type: "hhEnd"; score: number; grade: string };
```

- [ ] **Step 3: The round** (create `src/sim/quests/hungry/hungry.ts`)

```ts
import { STEP } from "../../constants";
import type { Input } from "../../input";
import { MOVE_SECONDS, SWING_ACTIVE } from "../../moves";
import { seededRandom } from "../../rewards";
import type { Point } from "../../types";
import type { HungryEvent } from "./events";
import { COURSES, DISH, FOODS, SPECIALS, stepDishes, type Box, type Course, type Dish, type FoodKind } from "./food";
import { RIVALS, SEATS, TABLE, dirOf, dist, sub, type EaterId, type RivalId } from "./table";

const DEG = Math.PI / 180;

/** The round's numbers (R4 design §3 to §6): world px on the table top, seconds. */
export const HUNGRY = {
  round: 60,
  reach: { base: 520, step: 10, max: 760, charged: 1180 },
  /** A press let go by now is a tap. */
  tap: 0.12,
  /** Held this long, it goes out at full charge. */
  charge: 0.5,
  /** The hand out (520 px in 0.14 s) and back (520 px in 0.10 s). */
  out: 520 / 0.14,
  back: 520 / 0.1,
  hold: 0.04,
  cadence: 0.3,
  /** Half the hand's 110 px sweep. */
  sweep: 55,
  fly: 0.25,
  aim: 30,
  /** How fast ← and → swing his line, degrees a second. */
  aimRate: 90,
  /** A rival's plate is reached within this of its middle. */
  plate: 60,
  rob: 100,
  combo: { window: 1.2, double: 5, triple: 10 },
  togo: 5,
  bonk: { reach: 300, push: 500 },
  dump: { min: 300, max: 700, pour: 0.03, jitter: 20 },
  cart: { at: 42, speed: 900, count: 14 },
  frenzy: { from: 52, every: 1 / 3 },
  specials: { from: 5, to: 50 },
  /** His swing at the table is the shift's: the strike lands a third of the way in. */
  swing: MOVE_SECONDS.swing,
  strike: SWING_ACTIVE[0],
  rival: { range: 400, cone: 50, burst: [2, 4] as const, calm: 8, floor: 0.15, quicker: 0.8, stun: 2 },
  slap: { zone: 300, stun: 1 },
  plane: { windup: 0.6, speed: 650, hit: 150 },
  suitcase: { t: 4, out: 250, w: 120, h: 80 },
  clash: { reach: 110, scatter: 150, speed: 400 },
  /** The server's walk behind the far side: from 15 degrees round the table to 170 (his corner) and back. */
  server: { trip: 18, from: 15, to: 170, radius: 830, linger: 1.5, bus: 150, reach: 260, quiet: 6, away: 15, tray: 4 },
} as const;

/** The waves from the chute (R4 §5); the cart's desserts and the frenzy come apart. */
export const WAVES: readonly { at: number; course: Exclude<Course, "special">; count: number }[] = [
  { at: 0, course: "appetizer", count: 24 },
  { at: 10, course: "appetizer", count: 12 },
  { at: 20, course: "appetizer", count: 12 },
  { at: 25, course: "entree", count: 16 },
  { at: 35, course: "entree", count: 10 },
  { at: 50, course: "dessert", count: 10 },
];
const ALL_COURSES: FoodKind[] = [...COURSES.appetizer, ...COURSES.entree, ...COURSES.dessert];
/** The cart comes in from off the right along the near side and crashes into the rim 35 degrees below the right end. */
const CART_FROM: Point = { x: 1500, y: -760 };
const CART_TO: Point = { x: Math.cos(-35 * DEG) * TABLE.r, y: Math.sin(-35 * DEG) * TABLE.r };

/** The shipped grade lines, scaled together by the scripted rounds (R4 §6; Task 5 sets it). */
export const GRADE_SCALE = 1;
export type Grade = "COMPED" | "GOOD TIPPER" | "SPLIT THE CHECK" | "WATER ONLY";
export const GRADES: readonly (readonly [number, Grade])[] = (
  [
    [3000, "COMPED"],
    [2000, "GOOD TIPPER"],
    [1200, "SPLIT THE CHECK"],
    [0, "WATER ONLY"],
  ] as const
).map(([n, g]) => [Math.round(n * GRADE_SCALE), g] as const);
export const gradeFor = (score: number): Grade => GRADES.find(([min]) => score >= min)![1];

export type DivePhase = "coil" | "out" | "hold" | "back";
export type Dive = {
  phase: DivePhase;
  /** Seconds in this phase. */
  t: number;
  /** The coil: seconds the key has been held. */
  held: number;
  /** Which way the hand goes: a unit on the table top. */
  dir: Point;
  /** Where the hand stops, px from the plate. */
  reach: number;
  /** How far out the hand is now. */
  ext: number;
  charged: boolean;
  /** The rival whose plate a charged dive ends on. */
  rob: RivalId | null;
  /** What the hand swept up on the way out: it flies home at full stretch. */
  haul: { kind: FoodKind; bonus: number }[];
  /** Where the hand was over the last 0.1 s: the clash. */
  trail: Point[];
};
export type Eater = {
  id: EaterId;
  dive: Dive | null;
  /** Seconds since the last dive started. */
  since: number;
  /** Seconds left of a stun: the bonk's, the nurse's slap. */
  stun: number;
  /** What is on their plate, the top last. */
  plate: FoodKind[];
};
export type Hammer = Eater & { id: "hammer"; aim: number; duck: boolean; swing: number; bonked: boolean };
/** `asleep` (the tests' quiet table): there, plate and all, never diving. */
export type Rival = Eater & { id: RivalId; base: number; anger: number; calm: number; wait: number; target: number | null; burst: number; asleep: boolean };
export type Flight = { kind: FoodKind; to: EaterId; from: Point; t: number; bonus: number };
export type Plane = { from: Point; to: Point; d: number; wait: number; done: boolean; hit: boolean };
export type Suitcase = Box & { t: number };
/** `s` 0 at the right end, 1 at his corner; `wait` lingering at an end. */
export type Server = { s: number; dir: 1 | -1; away: number; quiet: number; wait: number };
export type Cart = { x: number; y: number; crashed: boolean };
export type Score = { plate: number; bonus: number; chain: number; best: number; last: number; togo: number; eaten: number; robbed: number; paper: number; specials: FoodKind[]; bill: boolean };
export type HungryResult = {
  score: number;
  grade: Grade;
  /** GOOD TIPPER or better: the pepper on the way back. */
  full: boolean;
  plate: number;
  grabs: number;
  comboBonus: number;
  bestCombo: number;
  robbed: number;
  paper: number;
  specials: FoodKind[];
  bill: boolean;
  cans: number;
  nuts: boolean;
  bucees: boolean;
  hot: boolean;
};
/** The tests' switches: no waves, specials, cart or frenzy; the rivals asleep; the server away for good. */
export type HungryOptions = { practice?: boolean; schedule?: boolean; rivals?: boolean; server?: boolean };
export type Hungry = {
  rng: () => number;
  practice: boolean;
  time: number;
  dishes: Dish[];
  nextId: number;
  hammer: Hammer;
  rivals: Record<RivalId, Rival>;
  flights: Flight[];
  planes: Plane[];
  suitcases: Suitcase[];
  server: Server;
  cart: Cart | null;
  /** Which of WAVES has poured. */
  poured: boolean[];
  specials: { at: number; kind: FoodKind; done: boolean }[];
  scheduled: boolean;
  frenzyT: number;
  score: Score;
  /** His thoughts this round: each once. */
  said: Set<string>;
  events: HungryEvent[];
  result: HungryResult | null;
};

const RIVAL_BASE: Record<RivalId, number> = { student: 0.55, bellhop: 0.4, nurse: 0.28 };
function eater<I extends EaterId>(id: I): Eater & { id: I } {
  return { id, dive: null, since: HUNGRY.cadence, stun: 0, plate: [] };
}

export function createHungry(seed: number, opts: HungryOptions = {}): Hungry {
  const rng = seededRandom(seed);
  const scheduled = opts.schedule !== false;
  const rival = (id: RivalId): Rival => ({ ...eater(id), base: RIVAL_BASE[id], anger: 0, calm: 0, wait: -1, target: null, burst: 0, asleep: opts.rivals === false });
  const { from, to } = HUNGRY.specials;
  return {
    rng,
    practice: !!opts.practice,
    time: 0,
    dishes: [],
    nextId: 1,
    hammer: { ...eater("hammer"), aim: 0, duck: false, swing: 0, bonked: false },
    rivals: { student: rival("student"), bellhop: rival("bellhop"), nurse: rival("nurse") },
    flights: [],
    planes: [],
    suitcases: [],
    server: { s: 0, dir: 1, away: opts.server === false ? Infinity : 0, quiet: 0, wait: 0 },
    cart: null,
    poured: WAVES.map(() => !scheduled),
    specials: scheduled ? SPECIALS.map((kind) => ({ at: from + rng() * (to - from), kind, done: false })) : [],
    scheduled,
    frenzyT: 0,
    score: { plate: 0, bonus: 0, chain: 0, best: 0, last: -99, togo: 0, eaten: 0, robbed: 0, paper: 0, specials: [], bill: false },
    said: new Set(),
    events: [],
    result: null,
  };
}

/** A dish on the cloth, or `fall` seconds above it. */
export function addDish(q: Hungry, kind: FoodKind, x: number, y: number, vx = 0, vy = 0, fall = 0): Dish {
  const d: Dish = { id: q.nextId++, kind, x, y, vx, vy, r: FOODS[kind].r, fall };
  q.dishes.push(d);
  return d;
}

/** His tap's reach: the hungrier he gets, the farther he stretches (R4 §3). */
export const baseReach = (q: Hungry) => Math.min(HUNGRY.reach.max, HUNGRY.reach.base + HUNGRY.reach.step * q.score.eaten);

/** Where an eater's hand is on the table top: on their plate, or out along their dive. */
export function handOf(e: Eater): Point {
  const p = SEATS[e.id].plate;
  const d = e.dive;
  return d ? { x: p.x + d.dir.x * d.ext, y: p.y + d.dir.y * d.ext } : { x: p.x, y: p.y };
}

function think(q: Hungry, text: string, seconds = 1.8) {
  if (q.said.has(text)) return;
  q.said.add(text);
  q.events.push({ type: "hhThink", text, seconds });
}
function say(q: Hungry, who: RivalId | "server", text: string, seconds = 1.4) {
  q.events.push({ type: "hhSay", who, text, seconds });
}

/** Pours `count` dishes: from the chute every way, or from a tray or the cart inward, within 40 degrees of `inward`. */
function dump(q: Hungry, kinds: readonly FoodKind[], count: number, at: Point = { x: 0, y: 0 }, inward: Point | null = null, cart = false) {
  const made: FoodKind[] = [];
  const j = HUNGRY.dump.jitter;
  for (let i = 0; i < count; i++) {
    const kind = kinds[Math.floor(q.rng() * kinds.length)];
    const speed = HUNGRY.dump.min + q.rng() * (HUNGRY.dump.max - HUNGRY.dump.min);
    const a = inward ? Math.atan2(inward.y, inward.x) + (q.rng() - 0.5) * 80 * DEG : q.rng() * Math.PI * 2;
    addDish(q, kind, at.x + (q.rng() - 0.5) * j, at.y + (q.rng() - 0.5) * j, Math.cos(a) * speed, Math.sin(a) * speed, DISH.fall + i * HUNGRY.dump.pour);
    made.push(kind);
  }
  q.events.push({ type: "hhDump", x: at.x, y: at.y, count, kinds: made, cart });
}

function schedule(q: Hungry, dt: number) {
  WAVES.forEach((w, i) => {
    if (q.poured[i] || q.time < w.at) return;
    q.poured[i] = true;
    dump(q, COURSES[w.course], w.count);
    if (w.at === 0) think(q, "I didn't order this. I'm eating it anyway.", 2.2);
  });
  for (const s of q.specials)
    if (!s.done && q.time >= s.at) {
      s.done = true;
      dump(q, [s.kind], 1);
    }
  if (!q.scheduled) return;
  if (!q.cart && q.time >= HUNGRY.cart.at) q.cart = { x: CART_FROM.x, y: CART_FROM.y, crashed: false };
  if (q.time >= HUNGRY.frenzy.from) {
    q.frenzyT -= dt;
    while (q.frenzyT <= 1e-9) {
      q.frenzyT += HUNGRY.frenzy.every;
      dump(q, ALL_COURSES, 1);
    }
  }
}

/** The dessert cart rolls in and crashes into the rim, spilling its desserts inward. */
function stepCart(q: Hungry, dt: number) {
  const c = q.cart;
  if (!c || c.crashed) return;
  const v = sub(CART_TO, c);
  const n = Math.hypot(v.x, v.y);
  const step = HUNGRY.cart.speed * dt;
  if (n > step) {
    c.x += (v.x / n) * step;
    c.y += (v.y / n) * step;
    return;
  }
  c.x = CART_TO.x;
  c.y = CART_TO.y;
  c.crashed = true;
  const at = { x: CART_TO.x * 0.9, y: CART_TO.y * 0.9 };
  dump(q, COURSES.dessert, HUNGRY.cart.count, at, { x: -at.x, y: -at.y }, true);
  q.events.push({ type: "hhCart", x: at.x, y: at.y });
  think(q, "Bring the cart back.");
}

const newDive = (dir: Point, reach: number, phase: DivePhase): Dive => ({ phase, t: 0, held: 0, dir, reach, ext: 0, charged: false, rob: null, haul: [], trail: [] });

/**
 * Where a coiling dive will stop: his tap reach, or the charge so far (linear from the tap's reach to 1180 between 0.12
 * and 0.5 s); and a charged line ends on the first rival plate along it that has something on it.
 */
function aimDive(q: Hungry, d: Dive) {
  const base = baseReach(q);
  const k = Math.min(1, Math.max(0, (d.held - HUNGRY.tap) / (HUNGRY.charge - HUNGRY.tap)));
  let reach = d.charged ? base + (HUNGRY.reach.charged - base) * k : base;
  d.rob = null;
  if (d.charged) {
    const p = SEATS.hammer.plate;
    const on = RIVALS.map((id) => {
      const v = sub(SEATS[id].plate, p);
      return { id, along: v.x * d.dir.x + v.y * d.dir.y, off: Math.abs(v.x * d.dir.y - v.y * d.dir.x) };
    })
      .filter((o) => o.along > 0 && o.off <= HUNGRY.plate && o.along <= reach + HUNGRY.plate && q.rivals[o.id].plate.length > 0)
      .sort((a, b) => a.along - b.along)[0];
    if (on) {
      reach = on.along;
      d.rob = on.id;
    }
  }
  d.reach = reach;
}

function stepHammer(q: Hungry, input: Input, dt: number) {
  const h = q.hammer;
  h.stun = Math.max(0, h.stun - dt);
  h.since += dt;
  // ← swings his line toward the far side, → toward the near side, as he would steer from where he stands.
  if (input.held.left !== input.held.right) h.aim = Math.min(HUNGRY.aim, Math.max(-HUNGRY.aim, h.aim + (input.held.left ? 1 : -1) * HUNGRY.aimRate * dt));
  h.duck = input.held.down && !h.dive && h.swing <= 0;
  const free = !h.duck && h.stun <= 0;
  if (input.pressed.hammer && !h.dive && h.swing <= 0 && free) {
    h.swing = HUNGRY.swing;
    h.bonked = false;
    q.events.push({ type: "hhSwing" });
  }
  if (h.swing > 0) {
    h.swing = Math.max(0, h.swing - dt);
    if (!h.bonked && 1 - h.swing / HUNGRY.swing >= HUNGRY.strike) {
      h.bonked = true;
      bonk(q);
    }
  }
  if (!h.dive) {
    if (!(input.pressed.jump || input.pressed.fire) || h.swing > 0 || !free || h.since < HUNGRY.cadence) return;
    h.dive = newDive(dirOf(1, h.aim), baseReach(q), "coil");
    h.since = 0;
  }
  const d = h.dive;
  if (d.phase === "coil") {
    d.held += dt;
    d.dir = dirOf(1, h.aim);
    d.charged = d.held > HUNGRY.tap;
    aimDive(q, d);
    if (!(input.held.jump || input.held.fire) || d.held >= HUNGRY.charge - 1e-9) {
      d.phase = "out";
      d.t = 0;
      q.events.push({ type: "hhDive", who: "hammer", charged: d.charged });
    }
    return;
  }
  advance(q, h, dt);
}

/** A dive along its phases: out (sweeping), the hold at full stretch, back to the plate. */
function advance(q: Hungry, e: Eater, dt: number) {
  const d = e.dive!;
  d.t += dt;
  if (d.phase === "out") {
    const from = d.ext;
    d.ext = Math.min(d.reach, d.ext + HUNGRY.out * dt);
    sweep(q, e, from, d.ext);
    if (d.ext >= d.reach - 1e-9) {
      d.phase = "hold";
      d.t = 0;
      stretch(q, e);
    }
  } else if (d.phase === "hold") {
    if (d.t >= HUNGRY.hold - 1e-9) {
      d.phase = "back";
      d.t = 0;
    }
  } else if (d.phase === "back") {
    d.ext = Math.max(0, d.ext - HUNGRY.back * dt);
    if (d.ext <= 0) e.dive = null;
  }
  if (e.dive) {
    e.dive.trail.push(handOf(e));
    if (e.dive.trail.length > Math.round(0.1 / STEP)) e.dive.trail.shift();
  }
}

/** The hand moved out from `from` to `to`: every dish on the cloth whose plate it crossed goes into the haul. */
function sweep(q: Hungry, e: Eater, from: number, to: number) {
  const d = e.dive!;
  const p = SEATS[e.id].plate;
  const took = q.dishes.filter((x) => {
    if (x.fall > 0) return false;
    const v = sub(x, p);
    const along = v.x * d.dir.x + v.y * d.dir.y;
    return along >= from && along <= to && Math.abs(v.x * d.dir.y - v.y * d.dir.x) <= HUNGRY.sweep + x.r;
  });
  if (!took.length) return;
  q.dishes = q.dishes.filter((x) => !took.includes(x));
  for (const x of took) d.haul.push({ kind: x.kind, bonus: 0 });
  const hand = handOf(e);
  q.events.push({ type: "hhChomp", who: e.id, x: hand.x, y: hand.y, count: took.length });
}

/** Full stretch: a charged dive on a rival's plate robs its top dish; then what the hand holds flies home. */
function stretch(q: Hungry, e: Eater) {
  const d = e.dive!;
  if (d.rob && e.id === "hammer") {
    const r = q.rivals[d.rob];
    const kind = r.plate.pop();
    if (kind) {
      d.haul.push({ kind, bonus: HUNGRY.rob });
      q.score.robbed++;
      const at = SEATS[d.rob].plate;
      q.events.push({ type: "hhRob", from: d.rob, kind, x: at.x, y: at.y });
      think(q, "That's MINE now.");
      robbed(q, r);
    }
  }
  const from = handOf(e);
  for (const h of d.haul) q.flights.push({ kind: h.kind, to: e.id, from, t: 0, bonus: h.bonus });
  d.haul = [];
}

/** He robbed `r`: angrier for it (Task 4 adds the paybacks). */
function robbed(q: Hungry, r: Rival) {
  r.anger++;
  r.calm = 0;
}

function stepFlights(q: Hungry, dt: number) {
  for (const f of q.flights) f.t += dt;
  const landed = q.flights.filter((f) => f.t >= HUNGRY.fly - 1e-9);
  if (!landed.length) return;
  q.flights = q.flights.filter((f) => !landed.includes(f));
  for (const f of landed) land(q, f.to, f.kind, f.bonus);
}

/** A dish lands on a plate: on his it scores (R4 §6); on a rival's it stacks. */
export function land(q: Hungry, to: EaterId, kind: FoodKind, bonus = 0): void {
  if (to !== "hammer") {
    q.rivals[to].plate.push(kind);
    q.events.push({ type: "hhLand", who: to, kind, points: 0 });
    think(q, "Are you going to finish that?");
    return;
  }
  const sc = q.score;
  q.hammer.plate.push(kind);
  if (kind === "check") {
    sc.plate += FOODS.check.value;
    sc.bill = true;
    q.events.push({ type: "hhLand", who: "hammer", kind, points: FOODS.check.value });
    think(q, "YOU picked up the bill?", 2);
    return;
  }
  let points = FOODS[kind].value;
  if (sc.togo > 0 && kind !== "togo") {
    points *= 2;
    sc.togo--;
  }
  sc.chain = q.time - sc.last <= HUNGRY.combo.window ? sc.chain + 1 : 1;
  sc.last = q.time;
  sc.best = Math.max(sc.best, sc.chain);
  const mult = sc.chain >= HUNGRY.combo.triple ? 3 : sc.chain >= HUNGRY.combo.double ? 2 : 1;
  sc.plate += points + bonus;
  sc.bonus += (points + bonus) * (mult - 1);
  sc.eaten++;
  if (FOODS[kind].course === "special") {
    sc.specials.push(kind);
    if (kind === "togo") sc.togo = HUNGRY.togo;
    else think(q, "Room charge.");
  }
  q.events.push({ type: "hhLand", who: "hammer", kind, points: (points + bonus) * mult });
}

/** The mallet on the rim in front of him (R4 §3): the food near him jumps toward the middle (Task 4 adds the rest). */
export function bonk(q: Hungry): void {
  const p = SEATS.hammer.plate;
  for (const d of q.dishes) {
    if (d.fall > 0 || dist(d, p) > HUNGRY.bonk.reach) continue;
    const v = sub(d, p);
    const n = Math.hypot(v.x, v.y);
    const u = n > 1e-6 ? { x: v.x / n, y: v.y / n } : { x: 1, y: 0 };
    d.vx = u.x * HUNGRY.bonk.push;
    d.vy = u.y * HUNGRY.bonk.push;
  }
  q.events.push({ type: "hhBonk", x: -TABLE.r + 30, y: 0, hit: false });
}

function finish(q: Hungry) {
  // What is still in the air when the clock runs out lands first.
  for (const f of q.flights) land(q, f.to, f.kind, f.bonus);
  q.flights = [];
  const sc = q.score;
  const score = Math.max(0, Math.round(sc.plate + sc.bonus));
  const grade = gradeFor(score);
  q.result = {
    score,
    grade,
    full: score >= GRADES[1][0],
    plate: sc.plate,
    grabs: sc.eaten,
    comboBonus: sc.bonus,
    bestCombo: sc.best,
    robbed: sc.robbed,
    paper: sc.paper,
    specials: [...sc.specials],
    bill: sc.bill,
    cans: sc.specials.filter((k) => k === "coke").length,
    nuts: sc.specials.includes("nuts"),
    bucees: sc.specials.includes("bucees"),
    hot: sc.specials.includes("hotsauce"),
  };
  q.events.push({ type: "hhEnd", score, grade });
}

/** One step of the round. */
export function stepHungry(q: Hungry, input: Input, dt: number): void {
  q.events = [];
  if (q.result) return;
  q.time += dt;
  schedule(q, dt);
  stepCart(q, dt);
  stepDishes(q.dishes, dt, q.suitcases);
  stepHammer(q, input, dt);
  stepFlights(q, dt);
  if (q.time >= HUNGRY.round - 1e-9) finish(q);
}

/** The hint line during the round (R4 §9), first match wins. */
export function hungryHint(q: Hungry): string {
  if (q.planes.length) return "Paper incoming · ↓ ducks, H swats";
  if (q.suitcases.length) return "Suitcase on the table · H clears it";
  if (q.hammer.stun > 0) return "Slapped · wait a second";
  if (q.score.togo > 0) return `To-go box · next ${q.score.togo} grabs double`;
  if (q.rivals.nurse.anger > 0) return "The nurse is angry · keep your hand out of her zone";
  return "Tap Space to dive · hold to reach farther and rob a plate · ← → aim · H bonks the server";
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test:next`
Expected: PASS. If the "a tap" test's phase times are off by more than two steps, the dive is not going out on the release step: check `stepHammer`'s coil (the press step starts the coil and counts its first step; the step the key comes up sends it out).

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/quests/hungry/events.ts src/sim/quests/hungry/hungry.ts scripts/banquet.check.mjs
```

Message: "The banquet's round: the belly-flop dive with its sweep, charge, aim and rob, the waves, the cart and the frenzy, the combo, the to-go box, the check and the grades". Push.

---

### Task 4: The rivals, the server, the paper, the suitcase, the slap, the bonk and the clash

**Files:**
- Modify: `src/sim/quests/hungry/hungry.ts`, `scripts/banquet.check.mjs` (append)

**Interfaces:**
- Consumes: Task 3's round.
- Produces: `reactionFor(r: Rival): number`; `serverAt(q): Point`; `planeAt(p: Plane): Point`; `payback(q, id: RivalId): void` (what `robbed` calls after the anger; exported for the tests); `stepHungry` now steps the server, the suitcases, the rivals, the clash and the planes; `bonk` now stuns, trays, slams and swats.

- [ ] **Step 1: Write the failing tests** (append to `scripts/banquet.check.mjs`; extend the hungry import with `reactionFor, serverAt, planeAt, payback, bonk`)

```js
/** A round with the rivals awake but nothing scheduled and the server away: dishes placed by hand. */
const table = (seed = 1) => createHungry(seed, { practice: true, schedule: false, server: false });
/** Only `id` of the rivals awake: the others would take a test's dish first. */
const only = (q, id) => {
  for (const o of RIVALS) q.rivals[o].asleep = o !== id;
  return q;
};
/** Every ribeye anywhere: on the cloth, on a plate, in the air, in a hand. */
const ribeyes = (q) =>
  q.dishes.filter((d) => d.kind === "ribeye").length +
  [q.hammer, ...RIVALS.map((id) => q.rivals[id])].reduce((n, e) => n + e.plate.filter((k) => k === "ribeye").length + (e.dive?.haul ?? []).filter((h) => h.kind === "ribeye").length, 0) +
  q.flights.filter((f) => f.kind === "ribeye").length;
/** Every dive start for `seconds`: who, and when. */
const diveTimes = (q, seconds, held = {}) => {
  const out = [];
  let t = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    stepHungry(q, input(held), STEP);
    t += STEP;
    for (const e of of(q.events, "hhDive")) out.push({ who: e.who, t });
  }
  return out;
};

test("a rival dives at food that comes to rest within 400 px of its plate after its reaction: the student 0.55 s, the bellhop 0.40, the nurse 0.28", () => {
  for (const [id, reaction] of [["student", 0.55], ["bellhop", 0.4], ["nurse", 0.28]]) {
    const q = only(table(), id);
    const p = SEATS[id].plate;
    const side = SEATS[id].facing;
    addDish(q, "club", p.x + side * 250, p.y);
    const first = diveTimes(q, 2).find((d) => d.who === id);
    assert.ok(first, `${id} dived`);
    near(first.t, reaction + STEP, `${id}'s reaction`, 3 * STEP);
  }
});

test("a rival mashes 2 to 4 dives in a burst, one every 0.3 s, then waits out its reaction again; the food goes to its plate", () => {
  const q = only(table(7), "nurse");
  const p = SEATS.nurse.plate;
  for (let i = 0; i < 8; i++) addDish(q, i % 2 ? "shrimp" : "club", p.x - 120 - i * 34, p.y + (i % 2 ? 50 : -50));
  const ts = diveTimes(q, 4).filter((d) => d.who === "nurse").map((d) => d.t);
  const gaps = ts.slice(1).map((t, i) => t - ts[i]);
  // Within a burst a dive starts every 0.3 s; after it, the dive back (about 0.12 s) and her 0.28 s reaction come first.
  const burst = gaps.findIndex((g) => g > 0.36);
  assert.ok(burst >= 1 && burst <= 3, `a burst of ${burst + 1}: gaps ${gaps.map((g) => g.toFixed(2))}`);
  for (const g of gaps.slice(0, burst)) near(g, HUNGRY.cadence, "within the burst", 3 * STEP);
  assert.ok(q.rivals.nurse.plate.length >= 2);
  assert.equal(q.hammer.plate.length, 0, "never his");
});

test("a rival dives only within 50 degrees of level on screen, either way, and turns to face it; straight down it lets food lie", () => {
  const q = only(table(), "student");
  const p = SEATS.student.plate;
  addDish(q, "club", p.x, p.y - 300);
  assert.equal(diveTimes(q, 2).filter((d) => d.who === "student").length, 0, "straight down the screen");
  const back = only(table(), "student");
  addDish(back, "club", p.x - 220, p.y - 250);
  assert.equal(diveTimes(back, 2).filter((d) => d.who === "student").length, 1, "down and back toward his end");
});

test("anger: a robbery makes a rival a fifth quicker a level, never under 0.15 s; 8 s without one calms it a level", () => {
  const q = table();
  const r = q.rivals.student;
  assert.equal(reactionFor(r), 0.55);
  r.anger = 1;
  assert.ok(Math.abs(reactionFor(r) - 0.44) < 1e-9);
  r.anger = 20;
  assert.equal(reactionFor(r), 0.15);
  r.anger = 2;
  run(q, 8 + STEP);
  assert.equal(r.anger, 1);
  run(q, 8);
  assert.equal(r.anger, 0);
});

test("robbed, the student winds up 0.6 s and throws paper at him: a hit costs 150; ducked it sails over; out on the table it misses; swatted it is gone", () => {
  const len = dist(SEATS.student.plate, SEATS.hammer.stand);
  const hitQ = table();
  payback(hitQ, "student");
  const evs = run(hitQ, 0.6 + len / HUNGRY.plane.speed + 0.1);
  assert.equal(of(evs, "hhPlane").length, 1);
  assert.deepEqual(of(evs, "hhPaper").map((e) => e.hit), [true]);
  assert.deepEqual([hitQ.score.plate, hitQ.score.paper], [-150, 1]);
  const duck = table();
  payback(duck, "student");
  assert.deepEqual(of(run(duck, 2.2, { down: true }), "hhPaper").map((e) => e.hit), [false]);
  const out = table();
  payback(out, "student");
  // A full charge pressed 0.65 s before the plane arrives is out on the table, well past 100 px, when it does.
  run(out, 0.6 + len / HUNGRY.plane.speed - 0.65);
  press(out, "jump");
  const outEvs = run(out, 1.2, { jump: true });
  assert.deepEqual(of(outEvs, "hhPaper").map((e) => e.hit), [false], "out on the table at a full charge");
  const swat = table();
  payback(swat, "student");
  run(swat, 0.6 + (len * 0.6) / HUNGRY.plane.speed);
  assert.ok(dist(planeAt(swat.planes[0]), P) <= HUNGRY.bonk.reach);
  bonk(swat);
  assert.equal(swat.planes.length, 0);
  assert.equal(of(swat.events, "hhSwat").length, 1);
  assert.equal(of(run(swat, 2), "hhPaper").length, 0);
});

test("robbed, the bellhop slides a suitcase 250 px out along his line for 4 s: his dives stop short of it, the bonk slams it off", () => {
  const q = table();
  payback(q, "bellhop");
  assert.equal(q.suitcases.length, 1);
  const s = q.suitcases[0];
  assert.ok(Math.abs(s.x + s.w / 2 - (P.x + HUNGRY.suitcase.out)) < 1e-6);
  tap(q);
  assert.ok(q.hammer.dive.reach < HUNGRY.suitcase.out - HUNGRY.suitcase.w / 2, `stopped at ${q.hammer.dive.reach}`);
  run(q, 1);
  bonk(q);
  assert.equal(q.suitcases.length, 0);
  const lasts = table();
  payback(lasts, "bellhop");
  run(lasts, HUNGRY.suitcase.t + STEP);
  assert.equal(lasts.suitcases.length, 0, "gone after 4 s");
});

test("the angry nurse slaps a hand that comes into her zone: nothing eaten, a 1 s stun, 'Sanitize!' and his thought", () => {
  const q = table();
  q.rivals.nurse.anger = 1;
  q.rivals.nurse.wait = 99;
  const food = addDish(q, "ribeye", 320, 0);
  press(q, "jump");
  // The coil's 0.5 s, then the hand reaches her zone 860 px out a quarter of a second later.
  const evs = run(q, 0.9, { jump: true });
  assert.equal(of(evs, "hhSlap").length, 1);
  assert.ok(q.dishes.includes(food), "nothing eaten");
  assert.ok(q.hammer.stun > 0.5);
  assert.deepEqual(of(evs, "hhSay").map((e) => [e.who, e.text]), [["nurse", "Sanitize!"]]);
  assert.deepEqual(of(evs, "hhThink").map((e) => e.text), ["I've HAD my shots."]);
  assert.equal(of(run(q, 1), "hhLand").length, 0);
});

test("the server walks behind the far side and clears food resting near the rim beside her, one line every 6 s at most", () => {
  const q = createHungry(2, { practice: true, schedule: false, rivals: false });
  q.server.s = 0.5;
  q.server.wait = 99;
  const at = serverAt(q);
  const u = { x: at.x / Math.hypot(at.x, at.y), y: at.y / Math.hypot(at.x, at.y) };
  const rim = addDish(q, "pie", u.x * 680, u.y * 680);
  const middle = addDish(q, "pie", 0, 0);
  const evs = run(q, 0.1);
  assert.ok(!q.dishes.includes(rim) && q.dishes.includes(middle));
  assert.deepEqual(of(evs, "hhSay").map((e) => e.text), ["Are we still working on that?"]);
  addDish(q, "pie", u.x * 680, u.y * 680);
  assert.equal(of(run(q, 1), "hhSay").length, 0, "quiet for a while");
});

test("the bonk: food near him jumps toward the middle; a rival's hand in reach is stunned 2 s; the server at his corner drops four dishes and leaves for 15 s", () => {
  const q = createHungry(2, { practice: true, schedule: false });
  const d = addDish(q, "club", P.x + 150, P.y + 50);
  const st = q.rivals.student;
  const target = { x: -450, y: 150 };
  const v = sub(target, SEATS.student.plate);
  const n = Math.hypot(v.x, v.y);
  st.dive = { phase: "hold", t: 0, held: 0, dir: { x: v.x / n, y: v.y / n }, reach: n, ext: n, charged: false, rob: null, haul: [{ kind: "pie", bonus: 0 }], trail: [] };
  q.server.s = 1;
  q.server.wait = 99;
  const before = q.dishes.length;
  bonk(q);
  assert.ok((d.vx * 150 + d.vy * 50) / Math.hypot(150, 50) > HUNGRY.bonk.push * 0.99, "away from him");
  assert.deepEqual([st.stun, st.dive.phase], [HUNGRY.rival.stun, "back"]);
  assert.deepEqual(of(q.events, "hhStun").map((e) => e.who), ["student"]);
  assert.equal(of(q.events, "hhTray").length, 1);
  assert.equal(q.dishes.length, before + 1 + HUNGRY.server.tray, "the pie it held and the tray's four");
  assert.equal(q.server.away, HUNGRY.server.away);
  assert.deepEqual(of(q.events, "hhBonk").map((e) => e.hit), [true]);
  run(q, HUNGRY.server.away + 0.1);
  assert.deepEqual([q.server.away, q.server.s], [0, 0], "back from the right end");
});

test("the clash: his hand and a rival's within 110 px while both are out bounce back empty and scatter the food near them", () => {
  const q = only(table(), "bellhop");
  q.rivals.bellhop.wait = 99;
  const meet = { x: 0, y: 100 };
  const hv = sub(meet, P);
  const hn = Math.hypot(hv.x, hv.y);
  q.hammer.dive = { phase: "out", t: 0, held: 0, dir: { x: hv.x / hn, y: hv.y / hn }, reach: 1000, ext: hn - 40, charged: true, rob: null, haul: [{ kind: "ribeye", bonus: 0 }], trail: [] };
  const bv = sub({ x: 40, y: 100 }, SEATS.bellhop.plate);
  const bn = Math.hypot(bv.x, bv.y);
  q.rivals.bellhop.dive = { phase: "out", t: 0, held: 0, dir: { x: bv.x / bn, y: bv.y / bn }, reach: 1000, ext: bn - 20, charged: false, rob: null, haul: [{ kind: "pie", bonus: 0 }], trail: [] };
  const nearby = addDish(q, "shrimp", 20, 180);
  const evs = run(q, STEP);
  assert.equal(of(evs, "hhClash").length, 1);
  assert.deepEqual([q.hammer.dive.phase, q.rivals.bellhop.dive.phase], ["back", "back"]);
  assert.ok(Math.hypot(nearby.vx, nearby.vy) > 300, "the food near them flew");
  assert.ok(q.dishes.some((x) => x.kind === "ribeye") && q.dishes.some((x) => x.kind === "pie"), "what they held dropped");
  assert.equal(of(run(q, 1), "hhLand").length, 0, "nothing reached a plate");
});

test("two sweeps over one dish in one step: it goes to one of them or drops in their clash, never to both", () => {
  const q = only(table(), "student");
  const food = addDish(q, "ribeye", -200, 200);
  const hv = sub(food, P);
  const hn = Math.hypot(hv.x, hv.y);
  q.hammer.dive = { phase: "out", t: 0, held: 0, dir: { x: hv.x / hn, y: hv.y / hn }, reach: hn + 40, ext: hn - 20, charged: false, rob: null, haul: [], trail: [] };
  const sv = sub(food, SEATS.student.plate);
  const sn = Math.hypot(sv.x, sv.y);
  q.rivals.student.dive = { phase: "out", t: 0, held: 0, dir: { x: sv.x / sn, y: sv.y / sn }, reach: sn + 40, ext: sn - 20, charged: false, rob: null, haul: [], trail: [] };
  stepHungry(q, input(), STEP);
  assert.equal(ribeyes(q), 1, "one ribeye, wherever it is");
  const evs = run(q, 1);
  assert.ok(of(evs, "hhLand").filter((e) => e.kind === "ribeye").length <= 1);
  assert.equal(ribeyes(q), 1);
});
```

Run: `npm run test:next`
Expected: FAIL (`reactionFor` is not exported).

- [ ] **Step 2: The rivals, the server, the planes and the rest** (in `src/sim/quests/hungry/hungry.ts`)

Add the imports `screenDeg` and `settled` (`import { ..., screenDeg, ... } from "./table"`, `import { ..., settled, ... } from "./food"`). Replace `robbed` with:

```ts
/** He robbed `r`: angrier, and paying him back (R4 §4). */
function robbed(q: Hungry, r: Rival) {
  r.anger++;
  r.calm = 0;
  payback(q, r.id);
}

/** A robbed rival's payback: the student's paper, the bellhop's suitcase, the nurse's "Excuse me?" (her anger is the slap). */
export function payback(q: Hungry, id: RivalId): void {
  if (id === "student") {
    q.planes.push({ from: { ...SEATS.student.plate }, to: { ...SEATS.hammer.stand }, d: 0, wait: HUNGRY.plane.windup, done: false, hit: false });
    say(q, "student", "Heads up!");
  } else if (id === "bellhop") {
    const p = SEATS.hammer.plate;
    const dir = dirOf(1, q.hammer.aim);
    const { out, w, h, t } = HUNGRY.suitcase;
    const c = { x: p.x + dir.x * out, y: p.y + dir.y * out };
    q.suitcases.push({ x: c.x - w / 2, y: c.y - h / 2, w, h, t });
    q.events.push({ type: "hhSuitcase", x: c.x, y: c.y, on: true });
    say(q, "bellhop", "Your bag, sir.");
  } else say(q, "nurse", "Excuse me?");
}

/** A rival's reaction now: a fifth quicker each level of anger, never under 0.15 s (R4 §4). */
export const reactionFor = (r: Rival) => Math.max(HUNGRY.rival.floor, r.base * HUNGRY.rival.quicker ** r.anger);

/** A dish a rival goes for: at rest within 400 px of its plate, on a line within 50 degrees of level on screen, either way. */
function reachable(r: Rival, d: Dish): boolean {
  if (!settled(d)) return false;
  const v = sub(d, SEATS[r.id].plate);
  const n = Math.hypot(v.x, v.y);
  if (n < 1 || n > HUNGRY.rival.range) return false;
  const deg = Math.abs(screenDeg(1, v));
  return deg <= HUNGRY.rival.cone || deg >= 180 - HUNGRY.rival.cone;
}

function stepRival(q: Hungry, r: Rival, dt: number) {
  r.since += dt;
  if (r.anger > 0) {
    r.calm += dt;
    if (r.calm >= HUNGRY.rival.calm - 1e-9) {
      r.anger--;
      r.calm = 0;
    }
  }
  r.stun = Math.max(0, r.stun - dt);
  if (r.dive) return advance(q, r, dt);
  if (r.asleep || r.stun > 0) {
    r.wait = -1;
    r.target = null;
    r.burst = 0;
    return;
  }
  const p = SEATS[r.id].plate;
  if (r.wait < 0) {
    const t = q.dishes.filter((d) => reachable(r, d)).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (t) {
      // Within a burst the next dive comes as fast as it can; a fresh one waits out the reaction.
      r.wait = r.burst > 0 ? 0 : reactionFor(r);
      r.target = t.id;
    } else r.burst = 0;
    return;
  }
  r.wait -= dt;
  if (r.wait > 1e-9 || r.since < HUNGRY.cadence - 1e-9) return;
  r.wait = -1;
  const d = q.dishes.find((x) => x.id === r.target);
  r.target = null;
  if (!d || !reachable(r, d)) {
    r.burst = 0;
    return;
  }
  const [lo, hi] = HUNGRY.rival.burst;
  if (r.burst <= 0) r.burst = lo + Math.floor(q.rng() * (hi - lo + 1));
  r.burst--;
  const v = sub(d, p);
  const n = Math.hypot(v.x, v.y);
  r.dive = newDive({ x: v.x / n, y: v.y / n }, n + d.r, "out");
  r.since = 0;
  q.events.push({ type: "hhDive", who: r.id, charged: false });
}

/** How far a dive along `dir` from `p` gets before a suitcase stops it: short of the box by half the hand. */
function caseStop(q: Hungry, p: Point, dir: Point): number {
  let stop = Infinity;
  for (const b of q.suitcases) {
    let t0 = 0;
    let t1 = Infinity;
    let hit = true;
    for (const [o, v, lo, hi] of [
      [p.x, dir.x, b.x, b.x + b.w],
      [p.y, dir.y, b.y, b.y + b.h],
    ] as const) {
      if (Math.abs(v) < 1e-12) {
        if (o < lo || o > hi) hit = false;
        continue;
      }
      const a = (lo - o) / v;
      const c = (hi - o) / v;
      t0 = Math.max(t0, Math.min(a, c));
      t1 = Math.min(t1, Math.max(a, c));
    }
    if (hit && t0 <= t1) stop = Math.min(stop, Math.max(0, t0 - HUNGRY.sweep));
  }
  return stop;
}

/** A hand lets go of what it holds: the dishes land on the cloth round where it is. */
function drop(q: Hungry, e: Eater, at: Point) {
  const d = e.dive;
  if (!d) return;
  for (const h of d.haul) addDish(q, h.kind, at.x + (q.rng() - 0.5) * 40, at.y + (q.rng() - 0.5) * 40);
  d.haul = [];
}

/** The angry nurse slaps a hand that comes into her zone: what it holds drops, he is stunned a second (R4 §4). */
function slapped(q: Hungry): boolean {
  const n = q.rivals.nurse;
  const h = q.hammer;
  if (n.anger <= 0 || n.stun > 0 || n.asleep || !h.dive) return false;
  const hand = handOf(h);
  if (dist(hand, SEATS.nurse.plate) > HUNGRY.slap.zone) return false;
  drop(q, h, hand);
  h.dive.phase = "back";
  h.dive.t = 0;
  h.stun = HUNGRY.slap.stun;
  q.events.push({ type: "hhSlap", x: hand.x, y: hand.y });
  say(q, "nurse", "Sanitize!");
  think(q, "I've HAD my shots.");
  return true;
}

/** Two hands out at once within 110 px of each other in the last 0.1 s (R4 §3): both back empty, the food near them scattered. */
function clashes(q: Hungry) {
  const h = q.hammer;
  if (h.dive?.phase !== "out") return;
  const a = handOf(h);
  for (const id of RIVALS) {
    const r = q.rivals[id];
    if (r.dive?.phase !== "out") continue;
    const b = handOf(r);
    const reach = HUNGRY.clash.reach;
    const met = dist(a, b) <= reach || r.dive.trail.some((p) => dist(p, a) <= reach) || h.dive.trail.some((p) => dist(p, b) <= reach);
    if (!met) continue;
    const at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    drop(q, h, a);
    drop(q, r, b);
    for (const e of [h.dive, r.dive]) {
      e.phase = "back";
      e.t = 0;
    }
    for (const d of q.dishes) {
      if (d.fall > 0) continue;
      const v = sub(d, at);
      const n = Math.hypot(v.x, v.y);
      if (n > HUNGRY.clash.scatter) continue;
      const k = n > 1e-6 ? 1 / n : 0;
      const a2 = q.rng() * Math.PI * 2;
      d.vx = (k ? v.x * k : Math.cos(a2)) * HUNGRY.clash.speed;
      d.vy = (k ? v.y * k : Math.sin(a2)) * HUNGRY.clash.speed;
    }
    q.events.push({ type: "hhClash", x: at.x, y: at.y });
    return;
  }
}

/** Where the server is on her walk behind the far side: `s` 0 at the right end, 1 at his corner. */
export function serverAt(q: Hungry): Point {
  const { from, to, radius } = HUNGRY.server;
  const a = (from + (to - from) * q.server.s) * DEG;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

function stepServer(q: Hungry, dt: number) {
  const s = q.server;
  const S = HUNGRY.server;
  s.quiet = Math.max(0, s.quiet - dt);
  if (s.away > 0) {
    s.away -= dt;
    // Back from the right end, where she lingers first.
    if (s.away <= 0) Object.assign(s, { away: 0, s: 0, dir: 1, wait: S.linger });
    return;
  }
  if (s.wait > 0) s.wait -= dt;
  else {
    s.s += (s.dir * dt) / (S.trip / 2);
    if (s.s >= 1) Object.assign(s, { s: 1, dir: -1, wait: S.linger });
    else if (s.s <= 0) Object.assign(s, { s: 0, dir: 1, wait: S.linger });
  }
  const at = serverAt(q);
  const bused = q.dishes.filter((d) => settled(d) && Math.hypot(d.x, d.y) >= TABLE.r - S.bus && dist(d, at) <= S.reach);
  if (!bused.length) return;
  q.dishes = q.dishes.filter((d) => !bused.includes(d));
  q.events.push({ type: "hhBus", x: at.x, y: at.y, count: bused.length });
  if (s.quiet <= 0) {
    say(q, "server", "Are we still working on that?", 1.6);
    s.quiet = S.quiet;
  }
}

/** Where a plane is on its way from the student's plate to his spot. */
export function planeAt(p: Plane): Point {
  const v = sub(p.to, p.from);
  const k = p.d / Math.hypot(v.x, v.y);
  return { x: p.from.x + v.x * k, y: p.from.y + v.y * k };
}

function stepPlanes(q: Hungry, dt: number) {
  const h = q.hammer;
  for (const p of q.planes) {
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.wait <= 0) q.events.push({ type: "hhPlane", ...planeAt(p) });
      continue;
    }
    p.d += HUNGRY.plane.speed * dt;
    if (p.done || p.d < dist(p.from, p.to)) continue;
    p.done = true;
    // It hits him only where he is: ducked under the edge, or out on the table, it sails on past.
    p.hit = !h.duck && !(h.dive && h.dive.ext > 100);
    if (p.hit) {
      q.score.plate -= HUNGRY.plane.hit;
      q.score.paper++;
    }
    q.events.push({ type: "hhPaper", x: p.to.x, y: p.to.y, hit: p.hit });
  }
  q.planes = q.planes.filter((p) => !p.done || (!p.hit && p.d < dist(p.from, p.to) + 400));
}

/** What else the bonk catches (R4 §3): a rival's hand, the server, a suitcase, paper. True when it caught anything. */
function bonkOthers(q: Hungry): boolean {
  const p = SEATS.hammer.plate;
  const R = HUNGRY.bonk.reach;
  let hit = false;
  for (const id of RIVALS) {
    const r = q.rivals[id];
    if (!r.dive || r.dive.phase === "back" || dist(handOf(r), p) > R) continue;
    const at = handOf(r);
    drop(q, r, at);
    r.dive.phase = "back";
    r.dive.t = 0;
    r.stun = HUNGRY.rival.stun;
    q.events.push({ type: "hhStun", who: id, x: at.x, y: at.y });
    hit = true;
  }
  const s = serverAt(q);
  if (q.server.away <= 0 && dist(s, p) <= R) {
    const n = Math.hypot(s.x, s.y);
    const inside = { x: (s.x / n) * (TABLE.r - 80), y: (s.y / n) * (TABLE.r - 80) };
    const course: Exclude<Course, "special"> = q.time < 25 ? "appetizer" : q.time < 42 ? "entree" : "dessert";
    dump(q, COURSES[course], HUNGRY.server.tray, inside, { x: -inside.x, y: -inside.y });
    q.server.away = HUNGRY.server.away;
    q.events.push({ type: "hhTray", x: inside.x, y: inside.y });
    think(q, "Is Pepsi okay? NO.");
    hit = true;
  }
  const near = (b: Box) => dist({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, p) <= R;
  for (const b of q.suitcases.filter(near)) {
    q.events.push({ type: "hhSuitcase", x: b.x + b.w / 2, y: b.y + b.h / 2, on: false });
    hit = true;
  }
  q.suitcases = q.suitcases.filter((b) => !near(b));
  const swatted = q.planes.filter((pl) => pl.wait <= 0 && !pl.done && dist(planeAt(pl), p) <= R);
  for (const pl of swatted) q.events.push({ type: "hhSwat", ...planeAt(pl) });
  if (swatted.length) hit = true;
  q.planes = q.planes.filter((pl) => !swatted.includes(pl));
  return hit;
}
```

In `bonk`, replace the last line with:

```ts
  const hit = bonkOthers(q);
  q.events.push({ type: "hhBonk", x: -TABLE.r + 30, y: 0, hit });
```

In `aimDive`, after `let reach = …`:

```ts
  reach = Math.min(reach, caseStop(q, SEATS.hammer.plate, d.dir));
```

In `advance`, the `out` branch, between `d.ext = …` and `sweep(…)`:

```ts
    if (e.id === "hammer" && slapped(q)) return;
```

Replace `stepHungry`'s body after `schedule(q, dt);` with:

```ts
  stepCart(q, dt);
  stepServer(q, dt);
  for (const s of q.suitcases) s.t -= dt;
  for (const s of q.suitcases.filter((b) => b.t <= 0)) q.events.push({ type: "hhSuitcase", x: s.x + s.w / 2, y: s.y + s.h / 2, on: false });
  q.suitcases = q.suitcases.filter((b) => b.t > 0);
  stepDishes(q.dishes, dt, q.suitcases);
  stepHammer(q, input, dt);
  // His sweep goes first: a dish two hands cross in one step is his.
  for (const id of RIVALS) stepRival(q, q.rivals[id], dt);
  clashes(q);
  stepFlights(q, dt);
  stepPlanes(q, dt);
  if (q.time >= HUNGRY.round - 1e-9) finish(q);
```

- [ ] **Step 3: Run the tests**

Run: `npm run test:next`
Expected: PASS. Task 3's tests still pass: their table has the rivals asleep and the server away. If the paper's "out on the table" case fails, the charge's timing is the cause: the plane must reach his spot while his hand is more than 100 px out; widen the run before the press by a step or two, never the rule.

- [ ] **Step 4: Commit and push**

```bash
git add src/sim/quests/hungry/hungry.ts scripts/banquet.check.mjs
```

Message: "The banquet fights back: the rivals' dives and bursts, their anger and paybacks, the server, the slap, the bonk's catches and the clash". Push.

---

### Task 5: The scripted players and the grade lines

**Files:**
- Create: `src/sim/quests/hungry/drive.ts`, `scripts/banquet-tune.mjs`
- Modify: `src/sim/quests/hungry/hungry.ts` (`GRADE_SCALE`), `scripts/banquet.check.mjs` (append)

**Interfaces:**
- Consumes: Tasks 2 to 4.
- Produces: `type Player = (q: Hungry) => Input`; `idlePlayer: Player`; `steadyPlayer(): Player`; `sharpPlayer(): Player`; `playRound(seed: number, player: Player): HungryResult`; `suggestScale(steady: number, sharp: number): number | null`; `GRADE_SCALE` set from the scripted rounds.

- [ ] **Step 1: Write the failing tests** (append to `scripts/banquet.check.mjs`)

```js
import { idlePlayer, steadyPlayer, sharpPlayer, playRound, suggestScale } from "../src/sim/quests/hungry/drive.ts";
import { GRADE_SCALE } from "../src/sim/quests/hungry/hungry.ts";

const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);
/** The upper median: the middle of ten is the sixth. */
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

test("the scale the rounds ask for puts sharp at COMPED and steady at SPLIT THE CHECK or GOOD TIPPER, or says none can", () => {
  assert.equal(suggestScale(2400, 6000), 1.9);
  const k = suggestScale(2400, 6000);
  assert.ok(2400 >= 1200 * k && 2400 < 3000 * k && 6000 >= 3000 * k);
  assert.equal(suggestScale(5000, 5000), null, "sharp no better than steady: no one scale does both");
});

test("the grade lines keep the shipped proportions, scaled together", () => {
  assert.deepEqual(GRADES.map(([n]) => n), [3000, 2000, 1200, 0].map((n) => Math.round(n * GRADE_SCALE)));
});

test("over ten rounds each: standing still is WATER ONLY, a steady tapper's median SPLIT THE CHECK or GOOD TIPPER, a sharp player's COMPED", () => {
  for (const s of SEEDS) assert.equal(playRound(s, idlePlayer).grade, "WATER ONLY", `seed ${s}`);
  const steady = median(SEEDS.map((s) => playRound(s, steadyPlayer()).score));
  assert.ok(["SPLIT THE CHECK", "GOOD TIPPER"].includes(gradeFor(steady)), `steady median ${steady}: ${gradeFor(steady)}`);
  const sharp = median(SEEDS.map((s) => playRound(s, sharpPlayer()).score));
  assert.equal(gradeFor(sharp), "COMPED", `sharp median ${sharp}`);
});

test("the sharp player does what it says: dives, robs with a charge, and bonks the server", () => {
  const q = createHungry(3, { practice: true });
  const player = sharpPlayer();
  const counts = {};
  while (!q.result) {
    stepHungry(q, player(q), STEP);
    for (const e of q.events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  assert.ok((counts.hhDive ?? 0) > 40, `dives ${counts.hhDive}`);
  assert.ok((counts.hhRob ?? 0) >= 1, "a rob");
  assert.ok((counts.hhTray ?? 0) >= 1, "the server's tray");
});
```

Run: `npm run test:next`
Expected: FAIL (cannot find `drive.ts`).

- [ ] **Step 2: The players** (create `src/sim/quests/hungry/drive.ts`)

```ts
import { STEP } from "../../constants";
import { emptyInput, type Input } from "../../input";
import { FOODS, settled, type Dish } from "./food";
import { HUNGRY, baseReach, createHungry, serverAt, stepHungry, type Hungry, type HungryResult } from "./hungry";
import { RIVALS, SEATS, dirOf, dist, screenDeg, sub } from "./table";

/** A scripted player for the grade lines (R4 §6): the keys for this step of the round. */
export type Player = (q: Hungry) => Input;

const P = SEATS.hammer.plate;
const degTo = (x: { x: number; y: number }) => screenDeg(1, sub(x, P));
/** Swings his line toward `deg`: true while it still has to. */
function aimTo(input: Input, aim: number, deg: number): boolean {
  if (Math.abs(deg - aim) <= 2.5) return false;
  input.held[deg > aim ? "left" : "right"] = true;
  return true;
}
const free = (q: Hungry) => !q.hammer.dive && q.hammer.swing <= 0 && q.hammer.stun <= 0;

/** Never presses a key. */
export const idlePlayer: Player = () => emptyInput();

/** Every 0.5 s: the nearest resting dish within his tap's reach and his swing, aimed at and tapped. Never a charge or a bonk. */
export function steadyPlayer(): Player {
  let next = 0;
  return (q) => {
    const input = emptyInput();
    if (!free(q) || q.time < next || q.hammer.since < HUNGRY.cadence) return input;
    const reach = baseReach(q);
    const target = q.dishes
      .filter((d) => settled(d) && dist(d, P) <= reach && Math.abs(degTo(d)) <= HUNGRY.aim)
      .sort((a, b) => dist(a, P) - dist(b, P))[0];
    if (!target || aimTo(input, q.hammer.aim, degTo(target))) return input;
    input.held.jump = input.pressed.jump = true;
    next = q.time + 0.5;
    return input;
  };
}

/** Whether a dish's plate lies across a sweep from his plate along `dir` out to `reach`. */
const crosses = (d: Dish, dir: { x: number; y: number }, reach: number) => {
  const v = sub(d, P);
  const along = v.x * dir.x + v.y * dir.y;
  return along >= 0 && along <= reach && Math.abs(v.x * dir.y - v.y * dir.x) <= HUNGRY.sweep + d.r;
};

/**
 * Bonks the server at his corner; robs a rival's plate topped by an entree with a full charge (not the angry nurse's);
 * otherwise mashes along whichever line crosses the most food.
 */
export function sharpPlayer(): Player {
  let holding = 0;
  return (q) => {
    const input = emptyInput();
    const h = q.hammer;
    if (holding > 0) {
      holding--;
      input.held.jump = holding > 0;
      return input;
    }
    if (!free(q)) return input;
    if (q.server.away <= 0 && dist(serverAt(q), P) <= HUNGRY.bonk.reach) {
      input.held.hammer = input.pressed.hammer = true;
      return input;
    }
    if (h.since < HUNGRY.cadence) return input;
    for (const id of RIVALS) {
      const r = q.rivals[id];
      const top = r.plate[r.plate.length - 1];
      if (!top || FOODS[top].course !== "entree" || (id === "nurse" && r.anger > 0)) continue;
      const deg = degTo(SEATS[id].plate);
      if (Math.abs(deg) > HUNGRY.aim || dist(SEATS[id].plate, P) > HUNGRY.reach.charged) continue;
      if (aimTo(input, h.aim, deg)) return input;
      input.held.jump = input.pressed.jump = true;
      holding = Math.ceil(HUNGRY.charge / STEP);
      return input;
    }
    const reach = baseReach(q);
    let best: number | null = null;
    let most = 0;
    for (let deg = -HUNGRY.aim; deg <= HUNGRY.aim; deg += 5) {
      const dir = dirOf(1, deg);
      const n = q.dishes.filter((d) => d.fall <= 0 && crosses(d, dir, reach)).length;
      if (n > most) {
        most = n;
        best = deg;
      }
    }
    if (best === null || aimTo(input, h.aim, best)) return input;
    input.held.jump = input.pressed.jump = true;
    return input;
  };
}

/** A whole practice round under a scripted player. */
export function playRound(seed: number, player: Player): HungryResult {
  const q = createHungry(seed, { practice: true });
  while (!q.result) stepHungry(q, player(q), STEP);
  return q.result;
}

/**
 * The grade scale the scripted rounds ask for (R4 §6): the sharp median at COMPED (3000 k), the steady median at SPLIT THE
 * CHECK or GOOD TIPPER (1200 k up to 3000 k); a twentieth under the most that does both, to a twentieth. Null when none does.
 */
export function suggestScale(steady: number, sharp: number): number | null {
  const most = Math.min(steady / 1200, sharp / 3000) * 0.95;
  const k = Math.floor(most * 20 + 1e-9) / 20;
  return k > 0 && k > steady / 3000 ? k : null;
}
```

(Check the first test's numbers against this: `min(2400 / 1200, 6000 / 3000) × 0.95 = 1.9`, and `1.9 > 2400 / 3000`; for 5000 and 5000, `min(4.17, 1.67) × 0.95 = 1.58 → 1.55`, and `1.55 < 5000 / 3000 = 1.67`: null.)

- [ ] **Step 3: The tuning script** (create `scripts/banquet-tune.mjs`)

```js
// Plays ten seeded practice rounds for each scripted player and prints their medians and the grade scale they ask for (R4 §6).
// Usage: node --loader ./scripts/game-test-loader.mjs scripts/banquet-tune.mjs
import { idlePlayer, steadyPlayer, sharpPlayer, playRound, suggestScale } from "../src/sim/quests/hungry/drive.ts";

const seeds = Array.from({ length: 10 }, (_, i) => i + 1);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const scores = (make) => seeds.map((s) => playRound(s, make()).score);
const idle = scores(() => idlePlayer);
const steady = scores(steadyPlayer);
const sharp = scores(sharpPlayer);
console.log(JSON.stringify({ idle: median(idle), steady: { median: median(steady), all: steady }, sharp: { median: median(sharp), all: sharp }, scale: suggestScale(median(steady), median(sharp)) }, null, 2));
```

- [ ] **Step 4: Measure, and set the scale**

Run: `node --loader ./scripts/game-test-loader.mjs scripts/banquet-tune.mjs`
Expected: the medians and a `scale`. Set `export const GRADE_SCALE = <scale>;` in `hungry.ts` (the printed number, a multiple of 0.05). If `scale` is null, stop: the sharp player is no better than the steady one, so the round does not reward play. Report the medians to the owner as a ruling before going on, and do not change the rules to make the test pass.

- [ ] **Step 5: Run the tests**

Run: `npm run test:next`
Expected: PASS. (The three players' rounds take a few seconds.)

- [ ] **Step 6: Commit and push**

```bash
git add src/sim/quests/hungry/drive.ts src/sim/quests/hungry/hungry.ts scripts/banquet-tune.mjs scripts/banquet.check.mjs
```

Message: "The banquet's grade lines, set by three scripted players: still is WATER ONLY, steady tapping SPLIT THE CHECK or GOOD TIPPER, sharp play COMPED". Push. Record the medians and the scale in the ledger.

---

### Task 6: The banquet in the Game: the modes, the BUFFET door, practice and the payout

**Files:**
- Modify: `src/sim/game.ts`, `src/sim/events.ts`, `src/sim/run.ts`, `src/sim/level.ts` (`DoorKind`, `DoorSpec`), `src/sim/levels/lobby.ts` (the BUFFET door), `src/render/hud.ts` (`hintOf`), `scripts/render.check.mjs` (the BUFFET hint), `scripts/banquet.check.mjs` (append)

**Interfaces:**
- Consumes: Tasks 3 to 5 (`createHungry`, `stepHungry`, `HungryResult`, `HungryEvent`).
- Produces: `GameMode` adds `"questCard" | "quest" | "questTally"`; `Game.quest: Hungry | null`; `Game.questDoor: DoorSpec | null` (null for practice); `Game.newQuest(seed: number): void` (from the title, or a practice tally: Play again); `Game.finishQuest(): void` (a door's tally: Continue); `togglePause()` works in the round too; `DoorKind` adds `"quest"`, `DoorSpec.quest?: "hungry"`; `Run.spent: string[]`; `RUN.questGrace = 0.6`; `GameEvent` adds every `HungryEvent` and `{ type: "questPaid"; score: number; grade: string }`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/banquet.check.mjs`)

```js
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { RUN } from "../src/sim/run.ts";
import { CHARGE_MAX } from "../src/sim/moves.ts";
import { PATIENCE_MAX } from "../src/sim/damage.ts";
import { hintOf } from "../src/render/hud.ts";

const BUFFET = LOBBY.doors.find((d) => d.id === "buffet");
const lobbyGame = (opts = {}) => createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false, ...opts });
const until = (g, mode, seconds = 5, held = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP) && g.mode !== mode; i++) g.step(input(held));
  return g.mode;
};
const stepsG = (g, seconds, held = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    g.step(input(held));
    out.push(...g.events);
  }
  return out;
};
/** Him in play, standing on the floor in front of the BUFFET door. */
const atBuffet = (g) => {
  until(g, "play");
  Object.assign(g.world.hero, { x: BUFFET.x, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  g.step(input());
  return g;
};
const downAt = (g) => {
  g.step(input({ down: true }, { down: true }));
  return [...g.events];
};
/** The round's clock runs out on the next step. */
const endRound = (g) => {
  g.quest.time = HUNGRY.round - STEP / 2;
  g.step(input());
};

test("↓ on the floor in front of the BUFFET door opens the banquet: its card, then the round; never from the air or mid-swing", () => {
  const g = atBuffet(lobbyGame());
  assert.equal(hintOf(g), "↓ BUFFET · Hungry Hungry Hammer");
  const evs = downAt(g);
  assert.deepEqual(of(evs, "door").map((e) => [e.kind, e.id]), [["quest", "buffet"]]);
  assert.deepEqual([g.mode, g.quest.practice, g.questDoor.id], ["questCard", false, "buffet"]);
  assert.equal(until(g, "quest", RUN.cardT + 0.1), "quest");
  const air = atBuffet(lobbyGame());
  Object.assign(air.world.hero, { y: -200, onGround: false });
  downAt(air);
  assert.equal(air.mode, "play", "not in the air");
  const swing = atBuffet(lobbyGame());
  swing.step(input({ hammer: true }, { hammer: true }));
  downAt(swing);
  assert.equal(swing.mode, "play", "not mid-swing");
});

test("while he eats, the lobby waits: its clock, his heat, the shield and the pepper hold, and nobody moves", () => {
  const g = atBuffet(lobbyGame({ cast: true }));
  downAt(g);
  Object.assign(g.world.hero, { heat: 50, hot: true });
  g.run.star = 5;
  const time = g.run.time;
  const cast = g.world.cast.map((n) => [n.x, n.y]);
  stepsG(g, 6, { right: true, jump: true });
  assert.equal(g.mode, "quest");
  assert.deepEqual([g.run.time, g.run.star, g.world.hero.heat, g.world.hero.hot, g.world.hero.x], [time, 5, 50, true, BUFFET.x]);
  assert.deepEqual(g.world.cast.map((n) => [n.x, n.y]), cast);
});

test("the round's end waits on its tally; Continue stands him at the door with 0.6 s of grace and brings home the score, a can, a full smash, the shield and the pepper", () => {
  const g = atBuffet(lobbyGame());
  downAt(g);
  until(g, "quest");
  for (const k of ["coke", "nuts", "bucees", "hotsauce"]) land(g.quest, "hammer", k);
  g.quest.score.plate = 99999;
  Object.assign(g.world.hero, { charge: 0, hot: false, patience: 1 });
  const before = { score: g.run.score, cans: g.run.cans };
  endRound(g);
  assert.equal(g.mode, "questTally");
  const r = g.quest.result;
  stepsG(g, 3, { jump: true, down: true });
  assert.equal(g.mode, "questTally", "it waits");
  g.finishQuest();
  const h = g.world.hero;
  assert.equal(g.mode, "play");
  assert.deepEqual([h.x, h.y, h.onGround, h.move], [BUFFET.x, 0, true, null]);
  assert.ok(h.invuln >= RUN.questGrace - 1e-9);
  assert.equal(g.run.score, before.score + r.score + RUN.canPoints);
  assert.deepEqual([g.run.cans, h.charge, g.run.star, h.hot, h.patience], [before.cans + 1, CHARGE_MAX, RUN.star, true, PATIENCE_MAX]);
  assert.deepEqual(of(g.events, "questPaid").map((e) => e.score), [r.score]);
  assert.equal(g.quest, null);
});

test("a full belly alone brings the pepper; a poor round brings its score and nothing else", () => {
  const full = atBuffet(lobbyGame());
  downAt(full);
  until(full, "quest");
  full.quest.score.plate = GRADES[1][0];
  Object.assign(full.world.hero, { hot: false, patience: 2 });
  endRound(full);
  full.finishQuest();
  assert.deepEqual([full.world.hero.hot, full.world.hero.patience], [true, PATIENCE_MAX]);
  const poor = atBuffet(lobbyGame());
  downAt(poor);
  until(poor, "quest");
  poor.quest.score.plate = 100;
  Object.assign(poor.world.hero, { hot: false, patience: 2, charge: 0 });
  const before = { score: poor.run.score, cans: poor.run.cans };
  endRound(poor);
  poor.finishQuest();
  assert.deepEqual([poor.run.score - before.score, poor.run.cans, poor.world.hero.hot, poor.world.hero.charge, poor.run.star], [100, before.cans, false, 0, 0]);
});

test("the door opens once a shift: shut through the stash and a lost life, open on a new shift; a key held from the tally opens nothing", () => {
  const g = atBuffet(lobbyGame());
  downAt(g);
  until(g, "quest");
  endRound(g);
  g.finishQuest();
  stepsG(g, 0.5, { down: true });
  assert.equal(g.mode, "play", "the held key opens nothing");
  g.step(input());
  downAt(g);
  assert.equal(g.mode, "play", "spent");
  assert.equal(hintOf(g), "BUFFET · thank you, come again");
  // To the stash and back.
  const staff = LOBBY.doors.find((d) => d.kind === "stash");
  Object.assign(g.world.hero, { x: staff.x, y: 0, vx: 0, onGround: true });
  g.step(input());
  downAt(g);
  assert.equal(g.level.id, "stash");
  g.step(input());
  const cart = STASH.doors.find((d) => d.kind === "return");
  Object.assign(g.world.hero, { x: cart.x, y: cart.y, vx: 0, onGround: true });
  g.step(input());
  downAt(g);
  assert.equal(g.level.id, "lobby");
  g.step(input());
  atBuffet(g);
  downAt(g);
  assert.equal(g.mode, "play", "still spent after the stash");
  // A lost life down the shaft.
  Object.assign(g.world.hero, { x: 6060, y: 0, vx: 0 });
  assert.equal(until(g, "card", 6), "card");
  atBuffet(g);
  downAt(g);
  assert.equal(g.mode, "play", "still spent after a lost life");
  g.newRun(9);
  atBuffet(g);
  downAt(g);
  assert.equal(g.mode, "questCard", "a new shift opens it again");
});

test("a break in the round stops its clock and its charge, and comes back to the round", () => {
  const g = atBuffet(lobbyGame());
  downAt(g);
  until(g, "quest");
  g.step(input({ jump: true }, { jump: true }));
  const t = g.quest.time;
  const held = g.quest.hammer.dive.held;
  g.togglePause();
  assert.equal(g.mode, "pause");
  stepsG(g, 1, { jump: true });
  assert.deepEqual([g.quest.time, g.quest.hammer.dive.held], [t, held]);
  g.togglePause();
  assert.equal(g.mode, "quest");
});

test("practice from the start screen: a round on its own that never touches a shift; its tally waits for Play again or the start screen", () => {
  const g = lobbyGame({ title: true });
  assert.equal(g.mode, "title");
  g.newQuest(5);
  assert.deepEqual([g.mode, g.quest.practice, g.questDoor], ["questCard", true, null]);
  until(g, "quest");
  endRound(g);
  assert.equal(g.mode, "questTally");
  g.finishQuest();
  assert.equal(g.mode, "questTally", "Continue is the door's: practice waits for Play again or the start screen");
  const first = g.quest;
  g.newQuest(6);
  assert.ok(g.mode === "questCard" && g.quest !== first, "Play again: a fresh round");
  until(g, "quest");
  endRound(g);
  g.toTitle();
  assert.deepEqual([g.mode, g.quest, g.run.score], ["title", null, 0]);
  const shift = atBuffet(lobbyGame());
  downAt(shift);
  until(shift, "quest");
  endRound(shift);
  shift.newQuest(7);
  assert.equal(shift.mode, "questTally", "no practice over a door's tally");
});
```

In `scripts/render.check.mjs`, the BUFFET hint now opens it:

```js
  assert.equal(hintOf(g), "↓ BUFFET · Hungry Hungry Hammer");
```

Run: `npm run test:next`
Expected: FAIL (the door is still `closed`: no `questCard`).

- [ ] **Step 2: The door, the run and the events**

`src/sim/level.ts`:

```ts
export type DoorKind = "stash" | "return" | "exit" | "closed" | "quest";
/**
 * `closed` doors say what opens them; a `quest` door opens a side quest once a shift (the BUFFET's banquet, R4 §7); `x`
 * is the door's middle, `y` the floor in front of it; a `locked` exit is chained until the pig is down.
 */
export type DoorSpec = { id: string; kind: DoorKind; x: number; y: number; label: string; opens?: string; locked?: boolean; quest?: "hungry" };
```

`src/sim/levels/lobby.ts`, the BUFFET door:

```ts
    { id: "buffet", kind: "quest", x: 4600, y: 0, label: "BUFFET", quest: "hungry" },
```

`src/sim/run.ts`: in `RUN` after `respawnGrace`, `/** Back from the banquet: a moment's grace in front of its door (R4 §7). */ questGrace: 0.6,`; in `Run`, `/** Doors used once a shift: the BUFFET's banquet (R4 §7). */ spent: string[];`; and `createRun` adds `spent: []`.

`src/sim/events.ts`: `import type { HungryEvent } from "./quests/hungry/events";` and, before `| { type: "mode"; mode: GameMode }`:

```ts
  /** The banquet's own events (R4): see src/sim/quests/hungry/events.ts. */
  | HungryEvent
  /** Back from the banquet's tally: what it paid. */
  | { type: "questPaid"; score: number; grade: string }
```

`src/render/hud.ts`, in `hintOf`'s `if (d)` block before the `closed` line:

```ts
    if (d.kind === "quest") return game.run.spent.includes(d.id) ? `${d.label} · thank you, come again` : `↓ ${d.label} · Hungry Hungry Hammer`;
```

- [ ] **Step 3: The Game** (in `src/sim/game.ts`)

Imports: `import { createHungry, stepHungry, type Hungry, type HungryResult } from "./quests/hungry/hungry";`.

```ts
export type GameMode = "card" | "play" | "pause" | "dying" | "over" | "walkoff" | "tally" | "clear" | "title" | "questCard" | "quest" | "questTally";
```

In `Game`, after `toTitle(): void;`:

```ts
  /** The banquet while its card shows, it runs, or its tally waits (R4). */
  quest: Hungry | null;
  /** The door it was opened from; null for practice from the start screen. */
  questDoor: DoorSpec | null;
  /** Practice from the start screen, or Play again on a practice tally: a round on its own (R4 §8). */
  newQuest(seed: number): void;
  /** Continue on a door's tally: what he ate comes home with him, and he stands at the door (R4 §7). */
  finishQuest(): void;
```

In `createGame`, beside `let armed = true;`: `/** The mode a break came from: the shift's play or the banquet's round. */ let paused: "play" | "quest" = "play";`. In the `game` object, after `toTitle,`: `quest: null, questDoor: null, newQuest, finishQuest,`.

`newRun` and `toTitle` each clear the banquet first:

```ts
    game.quest = null;
    game.questDoor = null;
```

`togglePause`:

```ts
  function togglePause() {
    if (game.mode === "play" || game.mode === "quest") {
      paused = game.mode;
      game.events = [];
      setMode("pause", game.events);
    } else if (game.mode === "pause") {
      game.events = [];
      setMode(paused, game.events);
    }
  }
```

New functions beside `togglePause`:

```ts
  function openQuest(q: Hungry, door: DoorSpec | null, ev: GameEvent[]) {
    game.quest = q;
    game.questDoor = door;
    setMode("questCard", ev, RUN.cardT);
  }

  function newQuest(seed: number) {
    if (game.mode !== "title" && !(game.mode === "questTally" && !game.questDoor)) return;
    game.events = [];
    openQuest(createHungry(seed, { practice: true }), null, game.events);
  }

  /** What the banquet pays (R4 §7): its score, a can, the smash, the shield, the pepper; no lives. */
  function pay(r: HungryResult, ev: GameEvent[]) {
    const h = world.hero;
    const run = game.run;
    addScore(run, r.score);
    if (r.cans) h.heat = Math.max(0, h.heat - addCans(run, r.cans, ev));
    if (r.nuts) h.charge = CHARGE_MAX;
    if (r.bucees) run.star = RUN.star;
    if (r.hot || r.full) {
      h.hot = true;
      h.patience = PATIENCE_MAX;
    }
    ev.push({ type: "questPaid", score: r.score, grade: r.grade });
  }

  function finishQuest() {
    const q = game.quest;
    const d = game.questDoor;
    if (game.mode !== "questTally" || !q?.result || !d) return;
    const ev: GameEvent[] = (game.events = []);
    pay(q.result, ev);
    const h = world.hero;
    h.move = null;
    h.crouch = false;
    h.slideT = 0;
    h.h = HERO_H;
    standAt({ x: d.x, y: d.y });
    h.invuln = Math.max(h.invuln, RUN.questGrace);
    // Down held from the tally opens nothing on the way back.
    armed = false;
    game.door = d;
    game.quest = null;
    game.questDoor = null;
    setMode("play", ev);
  }
```

In `tryDoors`, after `if (!d || !armed || !input.held.down || !h.onGround || h.move) return false;`:

```ts
    // The banquet is once a shift: a spent door stays shut, and nothing is said about it.
    if (d.kind === "quest" && game.run.spent.includes(d.id)) return false;
```

and after `ev.push({ type: "door", kind: d.kind, id: d.id });`:

```ts
    if (d.kind === "quest") {
      game.run.spent.push(d.id);
      openQuest(createHungry((game.run.seed ^ Math.imul(Math.round(d.x), 7919)) >>> 0), d, ev);
      return true;
    }
```

In `step`:

```ts
    } else if (game.mode === "questCard") {
      game.modeT -= STEP;
      if (game.modeT <= 1e-9) setMode("quest", ev);
    } else if (game.mode === "quest") {
      const q = game.quest!;
      stepHungry(q, input, STEP);
      ev.push(...q.events);
      if (q.result) setMode("questTally", ev);
    }
```

(inserted before `else if (game.mode === "play") playStep(input, ev);`, the chain's other branches unchanged).

- [ ] **Step 4: Run the tests**

Run: `npm run test:next`
Expected: PASS. A test elsewhere that read the BUFFET door as `closed` fails here; update its expectation to the quest door and say so in the ledger.

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/game.ts src/sim/events.ts src/sim/run.ts src/sim/level.ts src/sim/levels/lobby.ts src/render/hud.ts scripts/render.check.mjs scripts/banquet.check.mjs
```

Message: "The BUFFET door opens the banquet once a shift, the lobby waiting behind it; Continue brings home the score, a can, the smash, the shield and the pepper; practice from the start screen". Push.

---

### Task 7: The dive's poses and the head's lift

**Files:**
- Create: `src/sim/rig/dive.ts`
- Modify: `src/sim/rig/skeleton.ts` (`Pose.lift`, `REST_POSE`), `src/sim/rig/pose.ts` (`pose`, `blend`), `src/sim/rig/fk.ts` (the head), `src/sim/rig/actions.ts` (`overlay`), `scripts/rig.check.mjs` (append)

**Interfaces:**
- Produces: `Pose.lift?: number` (degrees the head is lifted back from the body's line after the 8-degree hold; 0 everywhere but the dive); `DIVE = { tip: 40, tipBy: 160 }`; `divePose(k: number, mallet?: boolean): Pose` (k 0 standing to 1 at full stretch; the body keeps one tip whatever the line's angle, and the line shows in where the scene slides him); `coilPose(c: number): Pose` (c 0 to 1, the charge); `diveK(ext: number): number` (how far the body has tipped for a hand `ext` px out).

Why 40 degrees: with his head held level, the more the body tips the closer his jaw comes to his near shoulder. By the rest joints, at 40 degrees the near shoulder's capsule clears the face box by about 2 rest units, at 44 by about 1, and past 50 it crosses it. A body that tilted with the line (tipping further on a line aimed down) would cross it too. So the tip is fixed, and the board may try steeper only while the rig checks still pass.

- [ ] **Step 1: Write the failing tests** (append to `scripts/rig.check.mjs`, importing what it does not already: `solve` from `../src/sim/rig/fk.ts`, `faceClear` from `../src/sim/rig/face.ts`, `pose` from `../src/sim/rig/pose.ts`, `HOLD` and `FREE` from `../src/sim/rig/clips.ts`)

```js
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
```

Run: `npm run test:next`
Expected: FAIL (cannot find `src/sim/rig/dive.ts`).

- [ ] **Step 2: The lift**

`src/sim/rig/skeleton.ts`, in `Pose` after `torso`:

```ts
  /**
   * Degrees the head is lifted back from the body's line after the 8-degree hold: the banquet's dive keeps his face level
   * while his body lies along the cloth (R4 §10). 0 when missing.
   */
  lift?: number;
```

and `REST_POSE` gains `lift: 0`. `src/sim/rig/pose.ts`: `pose`'s parameter type gains `lift?: number`, its result `lift: clean(p.lift ?? 0)`; `blend`'s result gains `lift: lerp(a.lift ?? 0, b.lift ?? 0, k)`. `src/sim/rig/fk.ts`, the head's line:

```ts
  // The head counter-rotates so it never tilts more than 8 degrees from his body's own level; a lift then raises it back.
  frame.head = spin + clamp(frame.neck - spin - pose.headTilt * DEG, -HEAD_LEVEL_DEG * DEG, HEAD_LEVEL_DEG * DEG) + (pose.lift ?? 0) * DEG;
```

`src/sim/rig/actions.ts`, `overlay`'s upper-body branch, after `result.headTilt = mixed.headTilt;`: `result.lift = mixed.lift;`.

- [ ] **Step 3: The dive** (create `src/sim/rig/dive.ts`)

```ts
import { FREE, HOLD } from "./clips";
import { pose, smooth, type Pose } from "./pose";

/**
 * The banquet's belly-flop (R4 §10): `tip`, the degrees his body tips forward over the cloth at full stretch (past about
 * 44 his near shoulder comes into the face box's margin, with his head held level); `tipBy`, the px the hand is out when
 * the body has tipped all the way.
 */
export const DIVE = { tip: 40, tipBy: 160 } as const;

/** How far the body has tipped for a hand `ext` px out: all the way by `tipBy`. */
export const diveK = (ext: number) => Math.min(1, Math.max(0, ext / DIVE.tipBy));

/**
 * The dive at `k` (0 standing, 1 at full stretch): the body tips forward about the pelvis, the head lifted back by as much
 * so the face stays level; the far hand reaches down to the cloth under his chin; the near arm (the mallet's, for Hammer)
 * sweeps back along his side; the legs trail. The line's angle is not in the pose: the scene slides him along it. Every
 * rotation is tuned on the `banquet-dive` board; the rig checks hold the face and the head.
 */
export function divePose(k: number, mallet = true): Pose {
  const s = smooth(Math.min(1, Math.max(0, k)));
  const spin = -DIVE.tip * s;
  const near = mallet ? HOLD : { shoulderNear: FREE, elbowNear: 0, wristNear: 0 };
  return pose({
    spin,
    lift: -spin,
    rot: {
      shoulderFar: FREE + (70 - FREE) * s,
      elbowFar: -10 * s,
      shoulderNear: near.shoulderNear + (-130 - near.shoulderNear) * s,
      elbowNear: near.elbowNear * (1 - s),
      wristNear: near.wristNear * (1 - s),
      hipNear: -20 * s,
      hipFar: -10 * s,
      kneeNear: -20 * s,
      kneeFar: -10 * s,
    },
  });
}

/** The charge (c 0 to 1): he rears back on bent knees, the far arm drawn back, ready to spring. */
export function coilPose(c: number): Pose {
  const k = smooth(Math.min(1, Math.max(0, c)));
  return pose({
    lean: -12 * k,
    squash: { x: 1 + 0.04 * k, y: 1 - 0.06 * k },
    rot: {
      ...HOLD,
      // The mallet arm turns against the rear-back, as in the snot rocket, so the mallet's head keeps clear of his face.
      shoulderNear: HOLD.shoulderNear - 18 * k,
      shoulderFar: FREE - 25 * k,
      hipNear: 22 * k,
      hipFar: 22 * k,
      kneeNear: -38 * k,
      kneeFar: -38 * k,
    },
  });
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test:next`
Expected: the lift and the starts pass. If the full-stretch or face tests fail, tune the rotations in `divePose` (not the tests): the far arm lower (`shoulderFar` toward 50) if it crosses his face, the near arm further back (`shoulderNear` toward -150) if the mallet does, the tip shallower (`DIVE.tip` toward 34) if the near shoulder does; record each change in the ledger. Then PASS, with every existing rig test still passing (a test that compared a whole pose to a literal without `lift` gains `lift: 0`, noted in the ledger).

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/rig/dive.ts src/sim/rig/skeleton.ts src/sim/rig/pose.ts src/sim/rig/fk.ts src/sim/rig/actions.ts scripts/rig.check.mjs
```

Message: "The belly-flop's poses: his body tips onto the cloth and a head lift keeps his face level; the coil; the face rule at every stretch and angle". Push.

---

### Task 8: The paintings in the art pipeline

**Files:**
- Modify: `src/sim/level.ts` (`CastPerson` adds `nurse`), `src/render/cast.ts` (`LOOKS.nurse`), `src/render/boards.ts` (`PERSONS`), `src/art/registry.ts` (`Registry.banquet`), `scripts/art-cut.mjs` (`foodCells`), `scripts/art-sync.mjs` (the nurse, `banquet`), `scripts/art-grid.mjs` (the `banquet/room` and `banquet/table` targets), `scripts/art.check.mjs` (append)
- Create, once the owner's paintings are in: `art/cuts/ballroom.json`, `art/cuts/banquet-table.json`, `art/cuts/cast-nurse.json`

**Interfaces:**
- Produces: `foodCells(png: Buffer, cols?: number, rows?: number): Promise<{ png: Buffer; width: number; height: number }[]>` (a sheet cut cell by cell in reading order, each keyed and cropped; throws "food sheet cell N is empty" on an empty cell); `Registry.banquet?: { room?: { file; width; height; table: Point; span: number }; table?: { file; width; height; top: { cx; cy; rx; ry } }; food?: { file; width; height }[] }` (the food in sheet order, index = `FOODS[kind].sheet`); `CastPerson` `"nurse"`; `LOOKS.nurse`.

- [ ] **Step 1: Write the failing test** (append to `scripts/art.check.mjs`; import `foodCells` beside the file's other `./art-cut.mjs` imports, and `sharp` if it is not imported yet)

```js
test("the food sheet is cut cell by cell into its sixteen dishes in reading order, each keyed and cropped to its paint; an empty cell is refused", async () => {
  const cell = 200;
  const dish = (i) => `<circle cx="${(i % 4) * cell + 100}" cy="${Math.floor(i / 4) * cell + 100}" r="${30 + i * 3}" fill="#c0392b" stroke="#101010" stroke-width="4"/>`;
  const sheetOf = (skip = -1) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#00ff00"/>${Array.from({ length: 16 }, (_, i) => (i === skip ? "" : dish(i))).join("")}</svg>`)).png().toBuffer();
  const cells = await foodCells(await sheetOf());
  assert.equal(cells.length, 16);
  cells.forEach((c, i) => {
    // The disc and its outline, plus the keyer's 8 px margin each side.
    const want = 2 * (30 + i * 3) + 4 + 16;
    assert.ok(Math.abs(c.width - want) <= 4 && Math.abs(c.height - want) <= 4, `cell ${i + 1}: ${c.width}x${c.height}, not about ${want}`);
  });
  await assert.rejects(foodCells(await sheetOf(5)), /cell 6 is empty/);
});
```

Run: `npm run test:next`
Expected: FAIL (`foodCells` is not exported).

- [ ] **Step 2: The cutter** (in `scripts/art-cut.mjs`, beside `sheetPieces`)

```js
/**
 * The food sheet (R4 §10): the sheet split into its `cols` by `rows` cells (Codex lays them out evenly across the
 * picture), each keyed and cropped to its dish, in reading order. A cell with nothing painted in it is refused.
 */
export async function foodCells(png, cols = 4, rows = 4) {
  const { width: W, height: H } = await sharp(png).metadata();
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const left = Math.floor((c * W) / cols);
      const top = Math.floor((r * H) / rows);
      const width = Math.floor(((c + 1) * W) / cols) - left;
      const height = Math.floor(((r + 1) * H) / rows) - top;
      const cell = await sharp(png).extract({ left, top, width, height }).png().toBuffer();
      try {
        const keyed = await keyOut(cell);
        out.push({ png: keyed.png, width: keyed.width, height: keyed.height });
      } catch {
        throw new Error(`food sheet cell ${r * cols + c + 1} is empty`);
      }
    }
  return out;
}
```

- [ ] **Step 3: The nurse, the registry and the banquet's sync**

`src/sim/level.ts`: `CastPerson` gains `| "nurse"`. `src/render/boards.ts`: `PERSONS` gains `"nurse"`, so `cast.png` and `cast-heads.png` show her. `src/render/cast.ts`, `LOOKS` (her stand-in, until her painting is cut; never polish it):

```ts
  // R4's nurse: the banquet's quickest rival, and the hospital's later (her stand-in is the fallback only).
  nurse: { height: 320, head: 0.22, build: 0.8, skin: "#e2b48f", hair: "#3b2a22", hairStyle: "bun", top: "#2a9d8f", sleeves: "skin", bottom: "#2a9d8f", shoes: "#f4f3ee", lanyard: true },
```

`src/art/registry.ts`, in `Registry` after `pig?`:

```ts
  /**
   * The banquet (R4 §10): the ballroom placed by its cut (`table`, the painting px where the table's middle goes; `span`,
   * the painting px a 1500-wide table spans there); the table with its top's oval in its own px; the sixteen dishes in
   * the food sheet's order. Missing from an older sync, or while a painting is not in.
   */
  banquet?: {
    room?: { file: string; width: number; height: number; table: Point; span: number };
    table?: { file: string; width: number; height: number; top: { cx: number; cy: number; rx: number; ry: number } };
    food?: { file: string; width: number; height: number }[];
  };
```

`scripts/art-sync.mjs`: `CAST_PERSONS` gains `"nurse"`; import `foodCells` beside the other `./art-cut.mjs` imports; add before `products`:

```js
const BANQUET = { room: "art/incoming/backdrops/ballroom.png", table: "art/incoming/props/banquet-table.png", food: "art/incoming/props/food-sheet.png" };

/** The banquet (R4 §10): the ballroom and the table placed by their cuts, the food sheet cut into its sixteen dishes. */
async function banquet(registry) {
  registry.banquet = {};
  mkdirSync(join(OUT, "banquet"), { recursive: true });
  const cutOf = (name, what, fallback) => {
    const file = `art/cuts/${name}.json`;
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
    console.warn(`${what}: painted but not cut yet (no ${file}); ${fallback}`);
    return null;
  };
  if (existsSync(BANQUET.room)) {
    const cut = cutOf("ballroom", "ballroom", "the drawn room stands in");
    if (cut)
      await tolerant("ballroom", strict, async () => {
        const meta = await sharp(BANQUET.room).metadata();
        writeFileSync(join(OUT, "banquet/room.png"), await sharp(BANQUET.room).png().toBuffer());
        registry.banquet.room = { file: "banquet/room.png", width: meta.width, height: meta.height, table: { x: cut.table[0], y: cut.table[1] }, span: cut.span };
        console.log(`ballroom: ${meta.width}x${meta.height}, the table's middle at ${cut.table}, ${cut.span} px across`);
      });
  }
  if (existsSync(BANQUET.table)) {
    const cut = cutOf("banquet-table", "banquet table", "the drawn table stands in");
    if (cut)
      await tolerant("banquet table", strict, async () => {
        const keyed = await keyOut(readFileSync(BANQUET.table));
        const [cx, cy] = cut.top.center;
        const [rx, ry] = cut.top.radii;
        // The game's top is 0.37 as deep as wide (TABLE.squash, measured off this painting); a cut far off that would stretch it.
        if (Math.abs(ry / rx - 0.37) > 0.05) throw new Error(`its top is ${(ry / rx).toFixed(2)} as deep as wide; the game's is 0.37`);
        writeFileSync(join(OUT, "banquet/table.png"), keyed.png);
        registry.banquet.table = { file: "banquet/table.png", width: keyed.width, height: keyed.height, top: { cx, cy, rx, ry } };
        console.log(`banquet table: ${keyed.width}x${keyed.height}, its top ${2 * rx}x${2 * ry}`);
      });
  }
  if (existsSync(BANQUET.food))
    await tolerant("food sheet", strict, async () => {
      const cells = await foodCells(readFileSync(BANQUET.food));
      registry.banquet.food = cells.map((c, i) => {
        const file = `banquet/food-${i + 1}.png`;
        writeFileSync(join(OUT, file), c.png);
        return { file, width: c.width, height: c.height };
      });
      console.log(`food sheet: ${cells.length} dishes`);
    });
}
```

and call it after `await walls(registry);`: `await banquet(registry);`.

`scripts/art-grid.mjs`: two more targets. After `const wall = …`:

```js
// The banquet: banquet/room is the ballroom as painted (its cut's table middle a cross, its span a line); banquet/table the
// keyed table (its top's oval).
const banquetTarget = target.startsWith("banquet/") ? target.slice(8) : null;
const banquetFile = banquetTarget === "room" ? "art/incoming/backdrops/ballroom.png" : banquetTarget === "table" ? "art/incoming/props/banquet-table.png" : null;
```

`wallPng` becomes `const rawPng = wall ? readFileSync(\`art/incoming/backdrops/${wall}.png\`) : banquetTarget === "room" ? readFileSync(banquetFile) : null;` (and `keyed` reads `rawPng`), the keyed branch keys `banquetFile` for `banquet/table`; after the wall's cut drawing:

```js
if (!bare && banquetTarget === "room" && existsSync("art/cuts/ballroom.json")) {
  const cut = JSON.parse(readFileSync("art/cuts/ballroom.json", "utf8"));
  const [cx, cy] = cut.table;
  shapes.push(`<line x1="${px(cx - 30)}" y1="${py(cy)}" x2="${px(cx + 30)}" y2="${py(cy)}" stroke="#ff3b3b" stroke-width="3"/>`, `<line x1="${px(cx)}" y1="${py(cy - 30)}" x2="${px(cx)}" y2="${py(cy + 30)}" stroke="#ff3b3b" stroke-width="3"/>`);
  shapes.push(`<line x1="${px(cx - cut.span / 2)}" y1="${py(cy)}" x2="${px(cx + cut.span / 2)}" y2="${py(cy)}" stroke="#3bfff0" stroke-width="2"/>`);
}
if (!bare && banquetTarget === "table" && existsSync("art/cuts/banquet-table.json")) {
  const { center, radii } = JSON.parse(readFileSync("art/cuts/banquet-table.json", "utf8")).top;
  shapes.push(`<ellipse cx="${px(center[0])}" cy="${py(center[1])}" rx="${radii[0] * scale}" ry="${radii[1] * scale}" fill="none" stroke="#ff3b3b" stroke-width="3"/>`);
}
```

The body cut block's guard (`!wall`) becomes `!wall && !banquetTarget`, and the output name `artifacts/grid-${person ? \`cast-${person}\` : wall ? \`wall-${wall}\` : banquetTarget ? \`banquet-${banquetTarget}\` : target}.png`.

- [ ] **Step 4: Run the tests and the sync**

Run: `npm run test:next`, then `npm run art:sync`
Expected: PASS; the sync names each banquet painting that is in but not cut yet and goes on (`ballroom: painted but not cut yet …`), and says nothing of one not painted yet. Both the room's and the table's absence and a missing cut leave the registry's `banquet` without that entry (Review Focus 5).

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/level.ts src/render/cast.ts src/render/boards.ts src/art/registry.ts scripts/art-cut.mjs scripts/art-sync.mjs scripts/art-grid.mjs scripts/art.check.mjs
```

Message: "The banquet's paintings in the art pipeline: the food sheet cut cell by cell, the ballroom and the table placed by their cuts, the nurse among the cast". Push.

- [ ] **Step 6: As each painting arrives, check it, cut it and sync it** (repeat per painting; the rest of the plan goes on with the stand-ins meanwhile)

1. Look at it at full size against its checklist in `art/outgoing/batch-r4-codex.txt`. A painting that fails a point goes back to the owner with the exact reason and a one-line redo prompt; nothing is cut from it.
2. The nurse: `node scripts/art-pose.mjs nurse` (her pose over Hammer's); then `node scripts/art-grid.mjs cast/nurse` and write `art/cuts/cast-nurse.json` in the shape of `art/cuts/cast-lunch-1.json` (her joints, the jaw line, the five layers' polygons and their fills; `"space": "crop"`), redrawing the grid until every joint sits on her painted joint and every layer takes its part; then `node scripts/art-sync.mjs --overlay` and look at `artifacts/body-layers-cast-nurse.png` at full size.
3. The ballroom: `node scripts/art-grid.mjs banquet/room`; write `art/cuts/ballroom.json`:

```json
{
  "note": "Pixels of art/incoming/backdrops/ballroom.png as painted. table: where the round table's middle stands, in the middle of the empty carpet at the depth a table would stand; span: the painting px a 1500-wide table top spans there, judged by the carpet's pattern and the buffet against the wall. Check with: node scripts/art-grid.mjs banquet/room.",
  "space": "source",
  "table": [0, 0],
  "span": 0
}
```

with `table` and `span` measured on the grid (both must be read off the owner's painting; the scene scales the room by `1500 / span` and puts `table` at the table top's middle).
4. The table: `node scripts/art-grid.mjs banquet/table`; write `art/cuts/banquet-table.json`:

```json
{
  "note": "Pixels of the keyed crop of art/incoming/props/banquet-table.png. top: the gold rim's oval, its middle and its two radii. Check with: node scripts/art-grid.mjs banquet/table.",
  "space": "crop",
  "top": { "center": [0, 0], "radii": [0, 0] }
}
```

with the oval measured on the grid until the red ellipse lies on the gold rim all the way round.
5. The food sheet needs no cut: `npm run art:sync` reports `food sheet: 16 dishes`; look at the sixteen in `public/art/banquet/`.
6. `npm run art:sync`; `npm run test:next`. Commit each painting's cut with its manifest entries only (`node artifacts/stage-manifest.mjs art/incoming/cast/nurse.png art/incoming/cast/nurse.prompt.txt`, and likewise for the others), the owner's files as they are:

```bash
git add art/incoming/cast/nurse.png art/incoming/cast/nurse.prompt.txt art/cuts/cast-nurse.json
```

Message per painting, for example "The nurse's painting cut: five layers and her head, her joints on her painting". Push.

---

### Task 9: The banquet drawn

**Files:**
- Create: `src/render/quests/frame.ts`, `src/render/quests/diner.ts`, `src/render/quests/hungry-scene.ts`
- Modify: `src/render/look.ts`, `src/render/sound.ts`, `src/sim/feel.ts`, `src/game/audio.ts` (`clash`), `src/render/boards.ts` (the banquet's boards), `src/render/app.ts` (`NextProbe.quest`), `src/render/objects.ts` (`productTexture`), `scripts/look-boards.mjs`, `scripts/render.check.mjs` (append)

**Interfaces:**
- Consumes: Tasks 3 to 8 (`Hungry`, `handOf`, `serverAt`, `planeAt`, `SEATS`, `onScreen`, `floorOf`, `divePose`, `coilPose`, `diveK`, `Registry.banquet`, `LOOKS.nurse`).
- Produces: `BANQUET_FRAME`; `banquetFrame(width, height, insets: { top; bottom }): { x; y; zoom }`; `class Diner` (`constructor(parent: Container, registry: Registry, person: CastPerson, recolor: string | null, noart: boolean)`, `load(): Promise<void>`, `pose(p: Pose, facing: 1 | -1, feet: Point, dazed: boolean, time: number): void`, `handOffset(p: Pose, facing): Point`, `crown: Point`, `container`, `destroy()`); `class BanquetView` (`constructor(render, scene, registry, particles, noart)`, `load(): Promise<void>`, `setVisible(on)`, `sync(q: Hungry, dt: number, time: number): void`, `face(): Rect`, `crown(): Point`, `crownOf(id: number): { x; y; facing } | null`, `handAt(who: EaterId): Point`, `destroy()`); speech ids `DINER_ID = { student: 901, bellhop: 902, nurse: 903, server: 904 }`; `cuesFor` and `feelOf` for the `hh` events; `AudioBus.clash()`; `window.__next.quest` (`{ time, score, eaten, dives, aim, duck, stun, frame }` with `frame` the table's oval on screen in CSS px); boards `banquet` (four moments), `banquet-dive` (the coil and the dive frame by frame), `banquet-food` (every dish as the table draws it), `banquet-thumb` (the start screen's picture).

- [ ] **Step 1: Write the failing tests** (append to `scripts/render.check.mjs`)

```js
import { BANQUET_FRAME, banquetFrame } from "../src/render/quests/frame.ts";
import { HERO_SCREEN_FRACTION, PORTRAIT_ZOOM } from "../src/render/scene.ts";
import { feelOf } from "../src/sim/feel.ts";
// `cuesFor` is imported higher up the file already: a second import of the name is a syntax error.

test("the banquet's frame fills the screen between the bars on a laptop and on a phone either way, nothing of it under a bar", () => {
  for (const [w, h, top, bottom] of [[1280, 800, 64, 44], [390, 844, 96, 300], [844, 390, 60, 150]]) {
    const f = banquetFrame(w, h, { top, bottom });
    const scale = (HERO_SCREEN_FRACTION * h * f.zoom * (w < h ? PORTRAIT_ZOOM : 1)) / 340;
    const sx = (x) => w / 2 + (x - f.x) * scale;
    const sy = (y) => h / 2 + (y - f.y) * scale;
    const [l, r, t, b] = [sx(BANQUET_FRAME.x), sx(BANQUET_FRAME.x + BANQUET_FRAME.w), sy(BANQUET_FRAME.y), sy(BANQUET_FRAME.y + BANQUET_FRAME.h)];
    assert.ok(l >= -0.5 && r <= w + 0.5, `${w}x${h}: across ${l}..${r}`);
    assert.ok(t >= top - 0.5 && b <= h - bottom + 0.5, `${w}x${h}: down ${t}..${b}`);
    assert.ok(Math.abs(r - l - w) < 1 || Math.abs(b - t - (h - top - bottom)) < 1, `${w}x${h}: filled one way`);
  }
});

test("the banquet's sounds: the bell on a wave, a whoosh on a dive, the chomp, the slide when someone else takes food, the bonk or the thud, the cart's boom, the paper's splat, the clash", () => {
  assert.deepEqual(cuesFor({ type: "hhDump", x: 0, y: 0, count: 24, kinds: [], cart: false }), ["ding"]);
  assert.deepEqual(cuesFor({ type: "hhDump", x: 0, y: 0, count: 1, kinds: [], cart: false }), []);
  assert.deepEqual(cuesFor({ type: "hhDive", who: "hammer", charged: false }), ["whoosh"]);
  assert.deepEqual(cuesFor({ type: "hhChomp", who: "hammer", x: 0, y: 0, count: 2 }), ["chomp"]);
  assert.deepEqual(cuesFor({ type: "hhChomp", who: "nurse", x: 0, y: 0, count: 1 }), ["slide"]);
  assert.deepEqual(cuesFor({ type: "hhBus", x: 0, y: 0, count: 3 }), ["slide"]);
  assert.deepEqual(cuesFor({ type: "hhBonk", x: 0, y: 0, hit: true }), ["bonk"]);
  assert.deepEqual(cuesFor({ type: "hhBonk", x: 0, y: 0, hit: false }), ["thud"]);
  assert.deepEqual(cuesFor({ type: "hhCart", x: 0, y: 0 }), ["boom"]);
  assert.deepEqual(cuesFor({ type: "hhPaper", x: 0, y: 0, hit: true }), ["splat"]);
  assert.deepEqual(cuesFor({ type: "hhClash", x: 0, y: 0 }), ["clash"]);
});

test("the banquet's feel: the bonk that catches something, the clash and the cart's crash shake the camera", () => {
  assert.ok(feelOf({ type: "hhBonk", x: 0, y: 0, hit: true }).trauma > 0);
  assert.equal(feelOf({ type: "hhBonk", x: 0, y: 0, hit: false }).hitstop, 0);
  assert.ok(feelOf({ type: "hhClash", x: 0, y: 0 }).trauma >= 0.3);
  assert.ok(feelOf({ type: "hhCart", x: 0, y: 0 }).trauma >= 0.5);
});
```

Run: `npm run test:next`
Expected: FAIL (cannot find `src/render/quests/frame.ts`).

- [ ] **Step 2: The frame, the sounds and the feel**

Create `src/render/quests/frame.ts`:

```ts
import { HERO_HEIGHT } from "../../sim/rig/skeleton";
import { HERO_SCREEN_FRACTION, PORTRAIT_ZOOM } from "../scene";

/**
 * The banquet's world on screen (R4 §2), everyone at twice their shift size: the whole table and its cloth (the hem in
 * front at 277 + 370), Hammer and the nurse at its ends (feet at 370, heads 680 up), the far side's heads (feet at 78,
 * the tallest 720 up), and the chute, with a margin. World px.
 */
export const BANQUET_FRAME = { x: -1060, y: -700, w: 2120, h: 1380 } as const;

/**
 * Where the camera looks and the zoom for the frame to fill the screen between the bars: `top` and `bottom` are the CSS
 * px the HUD's top bar and the touch pad (or the hint line) take.
 */
export function banquetFrame(width: number, height: number, insets: { top: number; bottom: number }): { x: number; y: number; zoom: number } {
  const room = Math.max(1, height - insets.top - insets.bottom);
  const scale = Math.min(width / BANQUET_FRAME.w, room / BANQUET_FRAME.h);
  const portrait = width < height ? PORTRAIT_ZOOM : 1;
  return {
    x: BANQUET_FRAME.x + BANQUET_FRAME.w / 2,
    // The frame's middle in the middle of the room between the bars.
    y: BANQUET_FRAME.y + BANQUET_FRAME.h / 2 - (insets.top - insets.bottom) / 2 / scale,
    zoom: (scale * HERO_HEIGHT) / (HERO_SCREEN_FRACTION * height * portrait),
  };
}
```

`src/game/audio.ts`, after `boom()`:

```ts
  /** Two hands meeting over the banquet table: a bright double clank. */
  clash() {
    [1320, 1760].forEach((f, i) => this.blip(f, 0.07, "square", 0.07, f * 0.8, i * 0.03));
    this.noise(0.05, 0.12, 3000, "highpass");
  }
```

`src/render/sound.ts`, `CUES` adds `hhDive: ["whoosh"], hhBus: ["slide"], hhCart: ["boom"], hhClash: ["clash"], hhSlap: ["thud"], hhSwat: ["thud"], hhTray: ["ding"], hhSuitcase: ["thud"]`, and `cuesFor` adds:

```ts
    case "hhDump":
      // The bell for a wave, a tray or the cart; the frenzy's dishes and the specials drop without it.
      return e.count > 1 ? ["ding"] : [];
    case "hhChomp":
      return e.who === "hammer" ? ["chomp"] : ["slide"];
    case "hhBonk":
      return e.hit ? ["bonk"] : ["thud"];
    case "hhPaper":
      return e.hit ? ["splat"] : [];
    case "hhSuitcase":
      return e.on ? ["thud"] : [];
```

`src/sim/feel.ts`, before `default`:

```ts
    // The banquet (R4): the mallet on the rim, two hands meeting, the dessert cart, the nurse's slap.
    case "hhBonk":
      return e.hit ? { hitstop: 0.06, trauma: 0.35 } : { hitstop: 0, trauma: 0.12 };
    case "hhClash":
      return { hitstop: 0.05, trauma: 0.35 };
    case "hhCart":
      return { hitstop: 0.04, trauma: 0.55 };
    case "hhSlap":
      return { hitstop: 0.04, trauma: 0.2 };
```

- [ ] **Step 3: The diners** (create `src/render/quests/diner.ts`)

```ts
import { Container, Graphics } from "pixi.js";
import { type Registry } from "../../art/registry";
import type { CastPerson } from "../../sim/level";
import { BANQUET_SCALE } from "../../sim/quests/hungry/table";
import { solve, type Solved } from "../../sim/rig/fk";
import type { Pose } from "../../sim/rig/pose";
import { HERO_HEIGHT } from "../../sim/rig/skeleton";
import type { Point } from "../../sim/types";
import { castHeadScale } from "../cast-art";
import { loadCastArt, PaintedFigure, type CastArt } from "../cast-body";
import { LOOKS, drawFigure, recolored, star, type CastLook } from "../cast";

/** The banquet's rivals and server for the speech bubbles: the pig is 900. */
export const DINER_ID = { student: 901, bellhop: 902, nurse: 903, server: 904 } as const;

/**
 * Someone at the banquet table: their painting skinned on their own skeleton, or the stand-in when it is missing, posed
 * by whatever pose the scene hands them, their feet where it says.
 */
export class Diner {
  readonly container = new Container({ label: "diner" });
  private art: CastArt | null = null;
  private painted: PaintedFigure | null = null;
  private readonly body = new Graphics();
  private readonly stars = new Graphics();
  private readonly look: CastLook;
  /** Their crown on screen as last drawn: their speech hangs from it. */
  crown: Point = { x: 0, y: 0 };

  constructor(
    parent: Container,
    private readonly registry: Registry,
    private readonly person: CastPerson,
    private readonly recolor: string | null,
    private readonly noart: boolean,
  ) {
    this.look = recolored(LOOKS[person], recolor);
    this.container.addChild(this.body, this.stars);
    parent.addChild(this.container);
  }

  async load(): Promise<void> {
    this.art = this.noart ? null : await loadCastArt(this.registry, this.person);
    if (this.art) {
      this.painted = new PaintedFigure(this.art);
      this.container.addChildAt(this.painted.container, 0);
    }
  }

  private solved(p: Pose, facing: 1 | -1): Solved {
    const a = this.art;
    return a ? solve(p, facing, castHeadScale(this.look.head ?? a.head.share, a.head), a.head, a.skeleton) : solve(p, facing, 0.26);
  }

  /** Their size: their own height, at twice the shift's size at the banquet (R4 §2). */
  private get k() {
    return (this.look.height / HERO_HEIGHT) * BANQUET_SCALE;
  }

  /** Where their far hand is from their feet, world px, in this pose: the dive anchors the hand on the cloth. */
  handOffset(p: Pose, facing: 1 | -1): Point {
    const j = this.solved(p, facing).joints.handFar;
    return { x: j.x * this.k, y: j.y * this.k };
  }

  pose(p: Pose, facing: 1 | -1, feet: Point, dazed: boolean, time: number): void {
    const s = this.solved(p, facing);
    const k = this.k;
    this.container.position.set(feet.x, feet.y);
    this.container.scale.set(k);
    this.body.clear();
    this.stars.clear();
    if (this.painted) this.painted.apply(s, { recolor: this.recolor, dazed, hat: false, silhouette: false });
    else drawFigure(this.body, s, this.look, { role: "office", job: "office", act: "idle", hat: false, prop: false, slimed: false, silhouette: false });
    if (dazed)
      for (let i = 0; i < 3; i++) {
        const a = time * 4 + (i * Math.PI * 2) / 3;
        star(this.stars, s.crown.x + Math.cos(a) * 40, s.crown.y - 20 + Math.sin(a) * 14, 9);
      }
    this.crown = { x: feet.x + s.crown.x * k, y: feet.y + s.crown.y * k };
  }

  destroy(): void {
    this.painted?.destroy();
    if (!this.container.destroyed) this.container.destroy({ children: true });
  }
}
```

(The bellhop's hat stays off at the table, `hat: false`, so nothing flies; `drawFigure`'s options take the office worker's for every stand-in: the props they carry in the shift are not at the table. `recolored`, `drawFigure` and `star` are exported from `src/render/cast.ts` already.)

In `src/render/objects.ts`, after `productTextures`, a getter for the scene:

```ts
/** A product's picture once `loadProducts` has it, or null: the banquet's Coke Zero, nuts and Buc-ee's are these. */
export const productTexture = (k: "can" | "nuts" | "bucees"): Texture | null => productTextures.get(k) ?? null;
```

- [ ] **Step 4: The scene** (create `src/render/quests/hungry-scene.ts`)

```ts
import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ART_BASE, type Registry } from "../../art/registry";
import { DISH, FOODS, type FoodKind } from "../../sim/quests/hungry/food";
import { HUNGRY, handOf, planeAt, serverAt, type Eater, type Hungry, type Rival } from "../../sim/quests/hungry/hungry";
import { BANQUET_SCALE, RIVALS, SEATS, TABLE, dirOf, floorOf, onScreen, type EaterId, type RivalId } from "../../sim/quests/hungry/table";
import { CLIPS } from "../../sim/rig/clips";
import { castPose } from "../../sim/rig/cast";
import { coilPose, diveK, divePose } from "../../sim/rig/dive";
import { overlay, ACTIONS, displayU } from "../../sim/rig/actions";
import { solve } from "../../sim/rig/fk";
import { groundShift } from "../../sim/rig/ground";
import type { Pose } from "../../sim/rig/pose";
import type { Point, Rect } from "../../sim/types";
import { HEAD_SCALE } from "../../sim/constants";
import type { RenderApp } from "../app";
import { createCharacter, type Character } from "../character";
import { loadProducts, productTexture } from "../objects";
import { PALETTE } from "../palette";
import type { Particles } from "../particles";
import type { Scene } from "../scene";
import { label } from "../text";
import { DINER_ID, Diner } from "./diner";

const PERSON: Record<RivalId | "server", { person: "student-1" | "bellhop-1" | "nurse" | "server-2"; recolor: string | null }> = {
  student: { person: "student-1", recolor: null },
  bellhop: { person: "bellhop-1", recolor: null },
  nurse: { person: "nurse", recolor: null },
  server: { person: "server-2", recolor: "#1b1b1b" },
};
/** Where the chute's mouth hangs over the table's middle, world px: above his head as he dives under it at twice his size. */
const CHUTE_MOUTH = -440;
/** Paper flies head-high over the table top. */
const PAPER_UP = 300;
/** A dish's plate drawn this much wider than its disc: the painted plate's rim. */
const PLATE_DRAW = 1.15;
const Z = { room: 0, server: 10, far: 20, table: 30, marks: 35, dishes: 40, plates: 45, cases: 50, chute: 55, divers: 60, ends: 62, cart: 64, air: 70, hammer: 80 } as const;

/**
 * The banquet (R4 §2): the ballroom, the round table, the dishes, the plates, the chute, the cart, the paper and the
 * suitcase, the rivals and the server, and Hammer in his bib, all drawn from the round's state each frame. Everything at
 * the table sorts behind him (R4 §1, decision 7). Painted where the owner's art is in, drawn where it is not.
 */
export class BanquetView {
  readonly root = new Container({ label: "banquet" });
  private readonly room = new Container({ label: "room" });
  private readonly table = new Container({ label: "table" });
  private readonly marks = new Graphics();
  private readonly dishes = new Container({ label: "dishes" });
  private readonly plates = new Graphics();
  private readonly stacks = new Container({ label: "stacks" });
  private readonly cases = new Graphics();
  private readonly chute = new Graphics();
  private readonly cart = new Graphics();
  private readonly air = new Container({ label: "air" });
  private readonly paper = new Graphics();
  private readonly sprites = new Map<number, Sprite>();
  private readonly food = new Map<FoodKind, Texture>();
  /** The plates it drew itself (not loaded art): let go with it. */
  private readonly drawn: Texture[] = [];
  private readonly diners = new Map<RivalId | "server", Diner>();
  private hammer: Character | null = null;
  private faceRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  private crownAt: Point = { x: 0, y: 0 };
  private smugT = 0;
  private hurtT = 0;

  constructor(
    private readonly render: RenderApp,
    scene: Scene,
    private readonly registry: Registry,
    private readonly particles: Particles,
    private readonly noart: boolean,
  ) {
    this.root.sortableChildren = true;
    this.root.visible = false;
    for (const [c, z] of [[this.room, Z.room], [this.table, Z.table], [this.marks, Z.marks], [this.dishes, Z.dishes], [this.plates, Z.plates], [this.stacks, Z.plates + 1], [this.cases, Z.cases], [this.chute, Z.chute], [this.cart, Z.cart], [this.air, Z.air], [this.paper, Z.air + 1]] as const) {
      c.zIndex = z;
      this.root.addChild(c);
    }
    this.dishes.sortableChildren = true;
    scene.layers.play.addChild(this.root);
  }

  /** The paintings (or their drawn stand-ins), the diners and his banquet bib: loaded once. */
  async load(): Promise<void> {
    const b = this.noart ? undefined : this.registry.banquet;
    await Promise.all([this.loadRoom(b), this.loadTable(b), this.loadFood(b)]);
    for (const id of [...RIVALS, "server"] as const) {
      const d = new Diner(this.root, this.registry, PERSON[id].person, PERSON[id].recolor, this.noart);
      this.diners.set(id, d);
    }
    await Promise.all([...this.diners.values()].map((d) => d.load()));
    this.hammer = createCharacter(this.registry, "banquet", { noart: this.noart });
    this.hammer.container.zIndex = Z.hammer;
    this.root.addChild(this.hammer.container);
    await this.hammer.ready;
    this.drawChute();
  }

  private async loadRoom(b: Registry["banquet"]) {
    const room = b?.room;
    if (room) {
      const s = new Sprite(await Assets.load<Texture>(ART_BASE + room.file));
      const k = (2 * TABLE.r) / room.span;
      s.scale.set(k);
      s.position.set(-room.table.x * k, -room.table.y * k);
      this.room.addChild(s);
      return;
    }
    // A plain warm wall over a drawn carpet: the room until the painting is in.
    const g = new Graphics();
    g.rect(-2400, -1600, 4800, 1060).fill(0x5a1f24);
    g.rect(-2400, -560, 4800, 40).fill(0xc9a24a);
    g.rect(-2400, -520, 4800, 2400).fill(0x4a1c22);
    for (let y = -480; y < 1800; y += 120) for (let x = -2400 + ((y / 120) % 2) * 120; x < 2400; x += 240) g.ellipse(x, y, 40, 18).fill({ color: 0xc9a24a, alpha: 0.35 });
    this.room.addChild(g);
  }

  private async loadTable(b: Registry["banquet"]) {
    const t = b?.table;
    if (t) {
      const s = new Sprite(await Assets.load<Texture>(ART_BASE + t.file));
      s.scale.set(TABLE.r / t.top.rx, (TABLE.r * TABLE.squash) / t.top.ry);
      s.position.set(-t.top.cx * s.scale.x, -t.top.cy * s.scale.y);
      this.table.addChild(s);
      return;
    }
    const g = new Graphics();
    const ry = TABLE.r * TABLE.squash;
    g.rect(-TABLE.r, 0, 2 * TABLE.r, TABLE.height).fill(0xf2efe8);
    g.ellipse(0, TABLE.height, TABLE.r, ry).fill(0xe4e0d6);
    g.ellipse(0, 0, TABLE.r, ry).fill(0xf8f6f0).stroke({ width: 8, color: 0xc9a24a });
    g.ellipse(0, 0, TABLE.r * 0.2, ry * 0.2).fill(0xc8ccd2).stroke({ width: 4, color: PALETTE.outline });
    this.table.addChild(g);
  }

  private async loadFood(b: Registry["banquet"]) {
    const sheet = b?.food;
    await loadProducts();
    for (const kind of Object.keys(FOODS) as FoodKind[]) {
      const f = FOODS[kind];
      const cell = f.sheet !== null ? sheet?.[f.sheet] : undefined;
      if (cell) this.food.set(kind, await Assets.load<Texture>(ART_BASE + cell.file));
      // Coke Zero, the nuts and Buc-ee's are the products' own pictures, as in the shift.
      else if (kind === "coke" || kind === "nuts" || kind === "bucees") this.food.set(kind, productTexture(kind === "coke" ? "can" : kind) ?? this.drawnPlate(kind));
      else this.food.set(kind, this.drawnPlate(kind));
    }
  }

  /** The shipped look: a plate with the dish's color and its three-letter tag. */
  private drawnPlate(kind: FoodKind): Texture {
    const f = FOODS[kind];
    const r = 64;
    const g = new Graphics();
    g.ellipse(r, r * 0.6, r, r * 0.55).fill(0xffffff).stroke({ width: 5, color: PALETTE.outline });
    g.ellipse(r, r * 0.55, r * 0.62, r * 0.32).fill(f.color).stroke({ width: 3, color: PALETTE.outline });
    const tag = label(f.tag, "ui", 28);
    tag.anchor.set(0.5);
    tag.position.set(r, r * 0.55);
    tag.tint = 0x101010;
    const c = new Container();
    c.addChild(g, tag);
    const tex = this.render.app.renderer.generateTexture({ target: c, resolution: 2 });
    c.destroy({ children: true });
    this.drawn.push(tex);
    return tex;
  }

  private drawChute() {
    const g = this.chute.clear();
    g.poly([-70, -1400, 70, -1400, 60, CHUTE_MOUTH - 40, -60, CHUTE_MOUTH - 40]).fill(0xb8bec6).stroke({ width: 6, color: PALETTE.outline });
    g.ellipse(0, CHUTE_MOUTH - 40, 64, 22).fill(0x2a2f36).stroke({ width: 6, color: PALETTE.outline });
  }

  setVisible(on: boolean): void {
    this.root.visible = on;
  }

  /** His face on screen as last drawn, world px: words, bubbles and cards keep off it. */
  face(): Rect {
    return this.faceRect;
  }
  crown(): Point {
    return this.crownAt;
  }
  crownOf(id: number): { x: number; y: number; facing: 1 | -1 } | null {
    for (const [k, d] of this.diners) if (DINER_ID[k] === id) return { ...d.crown, facing: 1 };
    return null;
  }
  /** Where someone's hand is on screen: the words for a chomp go there. */
  handAt(who: EaterId, q: Hungry): Point {
    const e = who === "hammer" ? q.hammer : q.rivals[who];
    return onScreen(handOf(e));
  }

  /** Hammer's expression a moment longer after a rob or a hurt. */
  smug(): void {
    this.smugT = 0.6;
  }
  hurt(): void {
    this.hurtT = 0.6;
  }

  sync(q: Hungry, dt: number, time: number): void {
    this.smugT = Math.max(0, this.smugT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.syncDishes(q);
    this.drawMarks(q);
    this.drawPlates(q);
    this.drawCases(q);
    this.drawCart(q);
    this.drawAir(q);
    for (const id of RIVALS) this.syncRival(q, q.rivals[id], time);
    this.syncServer(q, time);
    this.syncHammer(q, time);
  }

  private syncDishes(q: Hungry) {
    const seen = new Set<number>();
    for (const d of q.dishes) {
      // Still in the chute: not drawn yet.
      if (d.fall > DISH.fall) continue;
      seen.add(d.id);
      let s = this.sprites.get(d.id);
      if (!s) {
        s = new Sprite(this.food.get(d.kind) ?? Texture.WHITE);
        s.anchor.set(0.5, 0.6);
        this.sprites.set(d.id, s);
        this.dishes.addChild(s);
      }
      const at = onScreen(d);
      const w = 2 * d.r * PLATE_DRAW;
      s.scale.set(w / s.texture.width);
      // Dropping from the chute's mouth onto its spot, faster as it falls.
      const p = 1 - d.fall / DISH.fall;
      s.position.set(at.x * p, CHUTE_MOUTH + (at.y - CHUTE_MOUTH) * p * p);
      s.zIndex = at.y;
    }
    for (const [id, s] of this.sprites)
      if (!seen.has(id)) {
        s.destroy();
        this.sprites.delete(id);
      }
  }

  /** His line, faint, while he aims or charges, and the marker where a charge will stop; the angry nurse's zone. */
  private drawMarks(q: Hungry) {
    const g = this.marks.clear();
    const h = q.hammer;
    const p = SEATS.hammer.plate;
    const dir = h.dive?.phase === "coil" ? h.dive.dir : dirOf(1, h.aim);
    const reach = h.dive?.phase === "coil" ? h.dive.reach : 0;
    if (reach || h.aim !== 0) {
      const a = onScreen(p);
      const b = onScreen({ x: p.x + dir.x * (reach || 520), y: p.y + dir.y * (reach || 520) });
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 6, color: 0xffffff, alpha: 0.35, cap: "round" });
      if (reach) g.ellipse(b.x, b.y, 46, 46 * TABLE.squash).stroke({ width: 5, color: 0xffcf3a, alpha: 0.9 });
    }
    const n = q.rivals.nurse;
    if (n.anger > 0) {
      const c = onScreen(SEATS.nurse.plate);
      g.ellipse(c.x, c.y, HUNGRY.slap.zone, HUNGRY.slap.zone * TABLE.squash).fill({ color: 0xd8443c, alpha: 0.12 }).stroke({ width: 4, color: 0xd8443c, alpha: 0.5 });
    }
  }

  /** Each plate, its stack's top few dishes on it. */
  private drawPlates(q: Hungry) {
    const g = this.plates.clear();
    this.stacks.removeChildren().forEach((c) => c.destroy());
    for (const e of [q.hammer, ...RIVALS.map((id) => q.rivals[id])] as Eater[]) {
      const c = onScreen(SEATS[e.id].plate);
      g.ellipse(c.x, c.y, 62, 62 * TABLE.squash).fill(0xffffff).stroke({ width: 5, color: PALETTE.outline });
      e.plate.slice(-4).forEach((kind, i) => {
        const s = new Sprite(this.food.get(kind) ?? Texture.WHITE);
        s.anchor.set(0.5, 0.6);
        s.scale.set((FOODS[kind].r * 1.6) / s.texture.width);
        s.position.set(c.x, c.y - 10 - i * 12);
        this.stacks.addChild(s);
      });
    }
  }

  private drawCases(q: Hungry) {
    const g = this.cases.clear();
    for (const b of q.suitcases) {
      const tl = onScreen({ x: b.x, y: b.y + b.h });
      const br = onScreen({ x: b.x + b.w, y: b.y });
      g.roundRect(tl.x, tl.y - 70, br.x - tl.x, br.y - tl.y + 70, 10).fill(0x6b4423).stroke({ width: 5, color: PALETTE.outline });
      g.roundRect((tl.x + br.x) / 2 - 22, tl.y - 86, 44, 18, 6).stroke({ width: 5, color: PALETTE.outline });
    }
  }

  private drawCart(q: Hungry) {
    const g = this.cart.clear();
    const c = q.cart;
    if (!c) return;
    const at = floorOf(c);
    const tilt = c.crashed ? 0.35 : 0;
    g.rect(at.x - 110, at.y - 150, 220, 18).fill(0xc8ccd2).stroke({ width: 5, color: PALETTE.outline });
    g.rect(at.x - 110, at.y - 70, 220, 14).fill(0xc8ccd2).stroke({ width: 5, color: PALETTE.outline });
    for (const x of [-100, 100]) g.rect(at.x + x - 5, at.y - 150, 10, 150).fill(0x9aa0a8).stroke({ width: 3, color: PALETTE.outline });
    for (const x of [-90, 90]) g.circle(at.x + x, at.y - 10, 12).fill(0x2a2f36);
    g.rotation = 0;
    this.cart.pivot.set(at.x, at.y);
    this.cart.position.set(at.x, at.y);
    // A trolley at the people's size: twice the shift's (R4 §2).
    this.cart.scale.set(BANQUET_SCALE);
    this.cart.rotation = tilt;
  }

  /** What is in the air: dishes flying home low over the cloth, and the paper. */
  private drawAir(q: Hungry) {
    this.air.removeChildren().forEach((c) => c.destroy());
    for (const f of q.flights) {
      const k = Math.min(1, f.t / HUNGRY.fly);
      const a = onScreen(f.from);
      const b = onScreen(SEATS[f.to].plate);
      const s = new Sprite(this.food.get(f.kind) ?? Texture.WHITE);
      s.anchor.set(0.5, 0.6);
      s.scale.set((FOODS[f.kind].r * 2 * PLATE_DRAW) / s.texture.width);
      s.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - 90 * Math.sin(Math.PI * k));
      this.air.addChild(s);
    }
    const g = this.paper.clear();
    for (const p of q.planes) {
      if (p.wait > 0) continue;
      const at = onScreen(planeAt(p));
      // Head-high, flying toward him.
      const y = at.y - PAPER_UP;
      g.poly([at.x - 30, y, at.x + 26, y - 10, at.x + 26, y + 10]).fill(0xf4f3ee).stroke({ width: 3, color: PALETTE.outline });
    }
  }

  /** A rival: standing at their seat, diving with their hand on the line, or dazed. */
  private syncRival(q: Hungry, r: Rival, time: number) {
    const d = this.diners.get(r.id);
    if (!d) return;
    const seat = SEATS[r.id];
    const stand = floorOf(seat.stand);
    const dive = r.dive;
    const facing: 1 | -1 = dive && Math.abs(dive.dir.x) > 0.05 ? (dive.dir.x > 0 ? 1 : -1) : seat.facing;
    const k = dive ? diveK(dive.ext) : 0;
    const pose: Pose = k > 0 ? divePose(k, false) : castPose({ role: "office", act: "idle", t: time, speed: 0, onGround: true, sit: false, spin: 0, hits: 0 });
    let feet = stand;
    if (k > 0) {
      const hand = onScreen(handOf(r));
      const off = d.handOffset(pose, facing);
      const lying = { x: hand.x - off.x, y: hand.y - off.y };
      feet = { x: stand.x + (lying.x - stand.x) * k, y: stand.y + (lying.y - stand.y) * k };
    }
    d.pose(pose, facing, feet, r.stun > 0, time);
    // Standing behind the far rim the table hides them below the waist; diving they lie on the cloth.
    d.container.zIndex = k > 0 ? Z.divers + feet.y / 1e4 : seat.far ? Z.far : Z.ends;
  }

  private syncServer(q: Hungry, time: number) {
    const d = this.diners.get("server");
    if (!d) return;
    d.container.visible = q.server.away <= 0;
    if (!d.container.visible) return;
    const at = floorOf(serverAt(q));
    const walking = q.server.wait <= 0;
    d.pose(castPose({ role: "server", act: walking ? "walk" : "idle", t: time, speed: walking ? 140 : 0, onGround: true, sit: false, spin: 0, hits: 0 }), (q.server.dir === 1 ? -1 : 1) as 1 | -1, at, false, time);
    d.container.zIndex = Z.server;
  }

  /** Hammer at the left end: the hold, the coil, the dive along his line, the bonk, the duck, a flinch when slapped. */
  private syncHammer(q: Hungry, time: number) {
    const ch = this.hammer;
    if (!ch) return;
    const h = q.hammer;
    const stand = floorOf(SEATS.hammer.stand);
    const ctx = { t: time, speed: 0, vy: 0, facing: 1 as const };
    let pose: Pose = CLIPS.idle((time * 0.4) % 1, ctx);
    let k = 0;
    if (h.duck) pose = CLIPS.crouch(1, ctx);
    else if (h.stun > 0) pose = ACTIONS.hurt(Math.min(1, (HUNGRY.slap.stun - h.stun) * 1.4));
    else if (h.swing > 0) pose = overlay(pose, ACTIONS.swing(displayU("swing", 1 - h.swing / HUNGRY.swing)), "upper", 1);
    else if (h.dive?.phase === "coil") pose = coilPose(h.dive.held / HUNGRY.charge);
    else if (h.dive) {
      k = diveK(h.dive.ext);
      pose = divePose(k);
    }
    const plate = this.registry.hammer.heads.neutral!;
    const solved = solve(pose, 1, HEAD_SCALE, plate);
    // He is drawn at twice his shift size here (R4 §2): every offset from his feet doubles with him.
    const S = BANQUET_SCALE;
    let feet = { x: stand.x, y: stand.y + S * groundShift(solved, k > 0 ? "none" : "planted") };
    if (k > 0) {
      const hand = onScreen(handOf(h));
      const j = solved.joints.handFar;
      const lying = { x: hand.x - S * j.x, y: hand.y - S * j.y };
      feet = { x: stand.x + (lying.x - stand.x) * k, y: stand.y + (lying.y - stand.y) * k };
    }
    const expression = h.stun > 0 || this.hurtT > 0 ? "hurt" : h.dive && (h.dive.phase === "out" || h.dive.phase === "hold") ? "chomp" : this.smugT > 0 ? "smug" : "neutral";
    ch.container.position.set(feet.x, feet.y);
    ch.container.scale.set(S);
    ch.apply(solved, expression, (stand.y - feet.y) / S, 0xffffff);
    const fb = solved.faceBox;
    this.faceRect = { x: feet.x + S * fb.x, y: feet.y + S * fb.y, w: S * fb.w, h: S * fb.h };
    this.crownAt = { x: feet.x + S * solved.crown.x, y: feet.y + S * solved.crown.y };
  }

  destroy(): void {
    for (const d of this.diners.values()) d.destroy();
    if (!this.root.destroyed) this.root.destroy({ children: true });
    for (const t of this.drawn) t.destroy(true);
  }
}
```

- [ ] **Step 5: The banquet in the look** (in `src/render/look.ts`)

1. Imports: `BanquetView` from `./quests/hungry-scene`, `DINER_ID` from `./quests/diner`, `banquetFrame` from `./quests/frame`, `onScreen` from `../sim/quests/hungry/table`, `HUNGRY` from `../sim/quests/hungry/hungry`.
2. The chandelier joins the lamps: in `createLighting(scene, render.quality, [...])` add `{ x: 0, y: -560, radius: 1100, intensity: 0.55, color: PALETTE.lampGlow, flicker: 0.02, group: "banquet" }`.
3. After `void prepare(STASH);`: `const banquet = new BanquetView(render, scene, registry, particles, !!opts.noart); const banquetReady = banquet.load();`. The quest's card holds while it loads: `const holding = !views.has(game.level.id) || (inBanquet() && !banquetLoaded)`, with `let banquetLoaded = false; void banquetReady.then(() => (banquetLoaded = true));`.
4. `const inBanquet = () => !!game.quest && (game.mode === "questCard" || game.mode === "quest" || game.mode === "questTally" || game.mode === "pause");` and `let banqueting = false;`.
5. `enterBanquet()`: hide every venue's views (`v.venue.setVisible(false); v.backdrop.setVisible(false)`), `character.container.visible = cast.container.visible = props.container.visible = flyers.container.visible = pigView.container.visible = false`, `objects.setVisible(false)`, `shieldGlow.clear()`, `smear.clear()`, `words`, `bubbles` and `speech` cleared (their `clear()` if they have one; else let their lines run out), `lighting.setGroup("banquet")`, `scene.camera.bounds = null`, `scene.camera.target = null`, `banquet.setVisible(true)`, `banqueting = true`. `leaveBanquet(x, y)`: `banquet.setVisible(false)`, the containers visible again, `objects.setVisible(true)`, `showLevel(game.level, x, y)`, `banqueting = false`.
6. In `tick`, right after the sim's `runFrame(...)` and its `tapped` clearing, before `const alpha = …`:

```ts
    if (inBanquet()) {
      if (!banqueting) enterBanquet();
      const q = game.quest!;
      // His dives this round, for the checks: a new round counts from nothing.
      if (q !== shownQuest) {
        shownQuest = q;
        questDives = 0;
      }
      questDives += pending.filter((e) => e.type === "hhDive" && e.who === "hammer").length;
      banquet.sync(q, simDt, time);
      for (const e of pending) showBanquet(e, q);
      pending.length = 0;
      const f = banquetFrame(scene.width, scene.height, insets());
      Object.assign(scene.camera, { x: f.x, y: f.y, zoom: f.zoom });
      scene.update(dt);
      lighting.update(dt);
      const face = banquet.face();
      faceOnScreen = screenRect(face);
      words.update(simDt, face, scene.view());
      bubbles.update(simDt, { crown: banquet.crown(), face, facing: 1, view: scene.view() });
      speech.update(simDt, (id) => banquet.crownOf(id), face, scene.view());
      particles.update(simDt, face);
      sound.music(game.mode === "quest" ? game.level.music : null);
      sound.tick();
      afterFrame();
      if (window.__next) {
        // The shift's numbers stay as he left them; the mode and the event counts move on.
        if (window.__next.run) Object.assign(window.__next.run, { mode: game.mode, events: { ...counts } });
        const top = screenRect({ x: -TABLE.r, y: -TABLE.r * TABLE.squash, w: 2 * TABLE.r, h: 2 * TABLE.r * TABLE.squash });
        window.__next.quest = {
          time: q.time,
          score: Math.round(q.score.plate + q.score.bonus),
          eaten: q.score.eaten,
          dives: questDives,
          coiling: q.hammer.dive?.phase === "coil",
          aim: q.hammer.aim,
          duck: q.hammer.duck,
          stun: q.hammer.stun,
          result: q.result,
          frame: top,
        };
      }
      return;
    }
    if (banqueting) leaveBanquet(world.hero.x, world.hero.y);
```

with `let shownQuest: Hungry | null = null; let questDives = 0;` beside the tick's other state and `TABLE` imported from `../sim/quests/hungry/table`; `screenRect(r)` turns a world rect into CSS px through `scene.toScreen` (the face's own conversion in `tick` becomes a call to it too); `insets()` reads the bars:

```ts
  /** The CSS px the HUD's top bar and the touch pad or the hint take off the screen: the banquet is framed between them. */
  const insets = () => {
    const bar = document.querySelector(".next-hud__bar-top")?.getBoundingClientRect();
    const pad = document.querySelector(".next-touch")?.getBoundingClientRect();
    const hint = document.querySelector(".next-hud__hint")?.getBoundingClientRect();
    return { top: bar ? bar.bottom + 8 : 64, bottom: pad ? scene.height - pad.top + 8 : hint ? scene.height - hint.top + 8 : 44 };
  };
```

and `afterFrame()` is the tail of `tick` moved into a function both paths call, unchanged: the mode's notice (`if (game.mode !== lastMode) …`), the hurry, `savedT` and `noteT`, and the HUD (`hudOf` / `hudKey` / `opts.onHud`). The shift's path calls it where those lines were.
7. `showBanquet(e, q)` turns the banquet's events into words, bubbles, speech and particles, every word through the face-safe `words.say(text, x, y, big, face, view)` with `face = banquet.face()` and `view = scene.view()`; positions come through `onScreen`:

```ts
  const showBanquet = (e: GameEvent, q: Hungry) => {
    const face = banquet.face();
    const view = scene.view();
    const at = (p: { x: number; y: number }) => onScreen(p);
    switch (e.type) {
      case "hhThink":
        bubbles.think(e.text, e.seconds);
        break;
      case "hhSay":
        speech.say(DINER_ID[e.who], e.text, e.seconds);
        break;
      case "hhChomp": {
        const p = at(e);
        particles.emit("crumbs", p.x, p.y, 6 + 2 * e.count);
        if (e.who === "hammer") words.say(e.count > 2 ? "NOM NOM!" : "NOM", p.x, p.y - 80, e.count > 2, face, view);
        break;
      }
      case "hhLand":
        if (e.who === "hammer" && e.kind === "check") words.say("-400", banquet.crown().x + 160, banquet.crown().y, true, face, view);
        else if (e.who === "hammer" && (q.score.chain === HUNGRY.combo.double || q.score.chain === HUNGRY.combo.triple))
          words.say(q.score.chain === HUNGRY.combo.triple ? "COMBO x3!" : "COMBO x2!", banquet.crown().x + 220, banquet.crown().y - 40, true, face, view);
        break;
      case "hhRob": {
        const p = at(e);
        words.say("YOINK!", p.x, p.y - 120, true, face, view);
        banquet.smug();
        break;
      }
      case "hhClash": {
        const p = at(e);
        particles.emit("impact", p.x, p.y, 16);
        particles.emit("glint", p.x, p.y, 8);
        words.say("CLASH!", p.x, p.y - 120, true, face, view);
        break;
      }
      case "hhBonk":
        if (e.hit) {
          const p = at(e);
          particles.emit("impact", p.x, p.y, 14);
          words.say("BONK!", p.x + 60, p.y - 160, false, face, view);
        }
        break;
      case "hhSlap": {
        const p = at(e);
        words.say("SLAP!", p.x, p.y - 100, true, face, view);
        banquet.hurt();
        break;
      }
      case "hhSwat": {
        const p = at(e);
        particles.emit("paper", p.x, p.y - 240, 14);
        words.say("SWAT!", p.x, p.y - 320, false, face, view);
        break;
      }
      case "hhPaper":
        if (e.hit) {
          const p = at(e);
          particles.emit("paper", p.x, p.y - 240, 10);
          words.say("-150", p.x + 200, p.y - 300, false, face, view);
          banquet.hurt();
        }
        break;
      case "hhCart": {
        const p = at(e);
        particles.emit("glass", p.x, p.y, 18);
        words.say("CRASH!", p.x, p.y - 200, true, face, view);
        break;
      }
      case "hhTray": {
        const p = at(e);
        words.say("BONK!", p.x, p.y - 200, true, face, view);
        break;
      }
      default:
        break;
    }
  };
```

8. Board hooks (with `opts.board`): `createBoards(…)` gains a last argument, the banquet's shots:

```ts
    const banquetShots = {
      /** The round at a moment, the scene at 1920 by 1080: the opening dump, a dive out on the cloth, the cart's crash, the frenzy. */
      async moments(): Promise<string[]> {
        await banquetReady;
        const out: string[] = [];
        for (const until of [
          (q: Hungry) => q.time >= 1.2,
          (q: Hungry) => q.time >= 12 && (q.hammer.dive?.ext ?? 0) > 300,
          (q: Hungry) => !!q.cart?.crashed && q.time >= HUNGRY.cart.at + 1.4,
          (q: Hungry) => q.time >= 55,
        ]) {
          const q = createHungry(11, { practice: true });
          const player = sharpPlayer();
          while (!until(q) && !q.result) stepHungry(q, player(q), STEP);
          out.push(await shootBanquet(q));
        }
        return out;
      },
      async thumb(): Promise<string> {
        await banquetReady;
        const q = createHungry(11, { practice: true });
        const player = sharpPlayer();
        while (q.time < 26.5) stepHungry(q, player(q), STEP);
        return shootBanquet(q);
      },
      /** The sixteen dishes and the three products as the table draws them, named: the food sheet's board. */
      async food(): Promise<string> {
        await banquetReady;
        const board = new Container();
        const kinds = Object.keys(FOODS) as FoodKind[];
        const cell = 260;
        board.addChild(new Graphics().rect(0, 0, 5 * cell, Math.ceil(kinds.length / 5) * cell).fill("#20242b"));
        kinds.forEach((kind, i) => {
          const s = new Sprite(banquet.foodTexture(kind));
          s.anchor.set(0.5);
          s.scale.set(Math.min((cell * 0.8) / s.texture.width, (cell * 0.6) / s.texture.height));
          s.position.set((i % 5) * cell + cell / 2, Math.floor(i / 5) * cell + cell / 2 - 10);
          const name = label(FOODS[kind].name, "ui", 20);
          name.position.set((i % 5) * cell + 12, Math.floor(i / 5) * cell + cell - 34);
          board.addChild(s, name);
        });
        return snapshotOf(board, 5 * cell, Math.ceil(kinds.length / 5) * cell);
      },
    };
```

(`banquet.foodTexture(kind)` returns the view's `food.get(kind)`: add that one-line getter to `BanquetView`; `snapshotOf` is `boards.ts`'s `snapshot`, exported as `snapshotOf` for this; `label` from `./text`; `FOODS` and `type FoodKind` from `../sim/quests/hungry/food`.)

where `shootBanquet(q)` enters the banquet view (as `enterBanquet` does, without touching the game), syncs it to `q` (with the time `q.time`), frames it with `banquetFrame(1920, 1080, { top: 0, bottom: 0 })` at `scene.width = 1920`, `scene.height = 1080`, renders `app.stage` into a 1920 by 1080 `RenderTexture` and returns `app.renderer.extract.base64(...)`, then restores the scene's size and camera and leaves the banquet (the `levelFrames` pattern in `boards.ts`). Import `createHungry`, `stepHungry` and `type Hungry` from `../sim/quests/hungry/hungry`, `sharpPlayer` from `../sim/quests/hungry/drive`, `STEP` is imported already.
9. Dev hooks (in `window.__next.dev`), for the checks:

```ts
      /** The running round: its clock, dishes on a rival's plate, his line on a rival's plate, dishes landed on his. */
      quest(o: { time?: number; plate?: { who: RivalId; kinds: FoodKind[] }; aim?: RivalId; eat?: FoodKind[] }) {
        const q = game.quest;
        if (!q) return;
        if (o.time !== undefined) q.time = o.time;
        if (o.plate) q.rivals[o.plate.who].plate.push(...o.plate.kinds);
        if (o.aim) q.hammer.aim = screenDeg(1, sub(SEATS[o.aim].plate, SEATS.hammer.plate));
        for (const k of o.eat ?? []) land(q, "hammer", k);
      },
      /** Runs the round's clock out: its tally is next. */
      questSkip() {
        if (game.quest && !game.quest.result) game.quest.time = HUNGRY.round - STEP / 2;
      },
```

(imports: `land` from `../sim/quests/hungry/hungry`, `SEATS`, `screenDeg`, `sub` and `type RivalId` from `../sim/quests/hungry/table`, `type FoodKind` from `../sim/quests/hungry/food`). Add both to `NextProbe["dev"]` in `app.ts` with these signatures (the food and rival names as string unions), and `quest?: { time: number; score: number; eaten: number; dives: number; coiling: boolean; aim: number; duck: boolean; stun: number; result: unknown; frame: Rect }` to `NextProbe`.
10. `Look` gains `newQuest(): void` (`forgetPresses(); game.newQuest(newSeed()); for (const e of game.events) feel(e);`) and `finishQuest(): void` (`forgetPresses(); prevHeld = { ...prevHeld, ...heldNow() }; game.finishQuest(); for (const e of game.events) feel(e);`), where `heldNow()` is the actions held by the keys and the pad this instant (`inputFrom(down, touchDown, prevHeld).held`): the step after Continue then sees no new press of a key held through it (Review Focus 1).
11. In `onKey`, on the tally: Enter or Space (not a repeat) is Continue on a door's tally and Play again on practice's:

```ts
      if (game.mode === "questTally" && !e.repeat && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        down.add(e.code);
        if (game.questDoor) look.finishQuest();
        else look.newQuest();
        return;
      }
```

(`look` is the returned object: build it as `const look: Look = { … }` and `return look;`.) The key goes into `down` so the step after sees it held, not pressed.

- [ ] **Step 6: The boards** (in `src/render/boards.ts` and `scripts/look-boards.mjs`)

`BoardSpec.kind` adds `"banquet" | "banquet-dive" | "banquet-thumb" | "banquet-food"`. `createBoards` takes `banquet?: { moments(): Promise<string[]>; thumb(): Promise<string>; food(): Promise<string> }` last; `case "banquet-food": return banquet!.food();`. The module's `snapshot` is lifted to the top level as `export async function snapshotOf(app, container, width, height, resolution)` (its body unchanged, taking what it read from the closure as arguments), and the closure's `snapshot` calls it. `Cell` gains `pose?: Pose` (drawn in place of the clip when present) and `ground?: Ground`; `cellPose` returns `cell.pose` when it is set, `cellGround` returns `cell.ground` when it is set. In `render`:

```ts
        case "banquet":
          return (await banquet!.moments()).join("\n");
        case "banquet-thumb":
          return banquet!.thumb();
        case "banquet-dive": {
          // The coil and the dive frame by frame, in his bib with the faces the round gives him; the dive stands on its lowest point.
          const FRAMES = 10;
          const cells: Cell[] = [];
          for (let col = 0; col < FRAMES; col++) {
            const u = col / (FRAMES - 1);
            cells.push({ col, row: 0, clip: "idle", u: 0, costume: "banquet", expression: "neutral", headScale: 0.26, pose: coilPose(u) });
            cells.push({ col, row: 1, clip: "idle", u: 0, costume: "banquet", expression: u > 0.3 ? "chomp" : "neutral", headScale: 0.26, pose: divePose(u), ground: "body" });
          }
          return sheet(FRAMES, 2, cells, ["coil", "dive"], Array.from({ length: FRAMES }, (_, i) => (i / (FRAMES - 1)).toFixed(2)), MOVE_SCALE);
        }
```

`scripts/look-boards.mjs`: after the venues' loop:

```js
  if (want("banquet")) {
    // The banquet: drawn from its own page, the practice round's scene and Hammer's dive.
    await page.goto(`${base}?next=1&board=1&dev=1&quest=hungry`);
    await page.waitForFunction(() => window.__nextBoard && window.__next?.run, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const frames = (await render("banquet")).split("\n");
    frames.forEach((f, i) => save(`banquet-look-${i + 1}.png`, f));
    save("banquet-dive.png", await render("banquet-dive"));
    save("banquet-food.png", await render("banquet-food"));
    count += frames.length + 2;
  }
```

- [ ] **Step 7: Run the checks and look**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/sim scripts`, then with the dev server up `node scripts/look-boards.mjs http://127.0.0.1:8090/ banquet`.
Expected: PASS, no type or lint errors; `artifacts/banquet-look-1..4.png` and `banquet-dive.png`. Look at each at full size: the table, the four eaters and the chute in the frame; the far side's heads clear of the top; the dishes on the cloth, not floating or under it; nothing over his face in any frame; the dive's hand on the cloth under his chin; his feet and the rivals' on the floor line. Step the dive board frame by frame: nothing jumps. Fix what is wrong before committing (the rotations in `dive.ts` with the rig checks still passing; the scene's numbers here).

- [ ] **Step 8: Commit and push**

```bash
git add src/render/quests/frame.ts src/render/quests/diner.ts src/render/quests/hungry-scene.ts src/render/look.ts src/render/sound.ts src/sim/feel.ts src/game/audio.ts src/render/boards.ts src/render/app.ts src/render/objects.ts scripts/look-boards.mjs scripts/render.check.mjs
```

Message: "The banquet drawn: the ballroom, the table, the dishes poured and flying home, the rivals and the server, Hammer's dive in his bib; its sounds, its feel and its boards". Push.

---

### Task 10: The shell: the round's screen, its cards, practice and the door

**Files:**
- Modify: `src/render/hud.ts` (`HudPayload.quest`), `src/components/next-hud.tsx`, `src/components/next-veil.tsx`, `src/components/next-game.tsx`, `src/components/next-start.tsx`, `src/components/next-keys.ts`, `src/styles.css`, `src/render/venue.ts` (the quest door's glow and THANK YOU card), `src/render/look.ts` (the door's glow, `setSpent`), `src/routes/index.tsx`, `scripts/start-art.mjs`, `public/start/banquet.webp` (create), `scripts/render.check.mjs` (append)
- Create: `scripts/hungry-browser.check.mjs`

**Interfaces:**
- Consumes: Tasks 6 and 9 (`Game.quest`, `newQuest`, `finishQuest`, `Look.newQuest`, `Look.finishQuest`, `window.__next.quest`, the dev hooks).
- Produces: `HudPayload.quest: { score: number; time: number; reach: number; reachBase: number; reachMax: number; combo: number; mult: number; chomps: number; door: boolean; result: HungryResult | null } | null`; `BANQUET_KEYS` (`next-keys.ts`); `NextGame`'s `quest?: "hungry"` prop; `NextStart`'s `onQuest` and `banquetBest` props; `VenueView.setSpent(ids: readonly string[])`; the best `hammer-time-best-banquet`.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/render.check.mjs`:

```js
test("the HUD in the round: its score and clock, his reach from his tap's to 1180 as it charges, the combo, the chomps, the door or practice; none in the shift", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false, title: true });
  assert.equal(hudOf(g, null).quest, null);
  g.newQuest(5);
  while (g.mode !== "quest") g.step(emptyInput());
  const q = g.quest;
  q.score.plate = 640;
  q.score.bonus = 60;
  q.score.chain = 6;
  q.score.eaten = 9;
  q.time = 12.2;
  const hud = hudOf(g, null).quest;
  assert.deepEqual(hud, { score: 700, time: 48, reach: 610, reachBase: 610, reachMax: 1180, combo: 6, mult: 2, chomps: 9, door: false, result: null });
  assert.equal(hudOf(g, null).hint, "Tap Space to dive · hold to reach farther and rob a plate · ← → aim · H bonks the server");
});
```

(Import `createGame`, `LOBBY`, `STASH` and `emptyInput` there if `render.check.mjs` does not yet.) Create `scripts/hungry-browser.check.mjs`:

```js
// Hungry Hungry Hammer in the browser (R4): the start screen's card to the round, dives, a charged rob, a bonk, a duck, a
// break, the three screen shapes, the tally with Play again and Start screen and the best kept; Space on a tally carrying
// nothing over; a round with the art missing; the BUFFET door in a shift and what it pays; /?quest=hungry.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/hungry-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const errors = [];
const shot = (page, name) => page.screenshot({ path: resolve(out, name) });
const mode = (page) => page.evaluate(() => window.__next?.run?.mode);
const waitMode = (page, m, timeout = 30000) => page.waitForFunction((want) => window.__next?.run?.mode === want, m, { timeout });
const fits = async (page, w, h) => {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const bar = document.querySelector(".next-hud__bar-top")?.getBoundingClientRect();
    return { sw: doc.scrollWidth, sh: doc.scrollHeight, frame: window.__next.quest.frame, barBottom: bar?.bottom ?? 0 };
  });
  assert.ok(r.sw <= w && r.sh <= h, `${w}x${h}: no scrolling`);
  const f = r.frame;
  assert.ok(f.x >= 0 && f.x + f.w <= w + 1 && f.y >= r.barBottom - 1 && f.y + f.h <= h + 1, `${w}x${h}: the table in view, under the bar: ${JSON.stringify(f)}`);
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}?next=1&title=1&dev=1`);
  await page.evaluate(() => localStorage.setItem("hammer-time-best-banquet", "0"));
  await page.getByRole("button", { name: "Play Hungry Hungry Hammer" }).click();
  await waitMode(page, "questCard");
  assert.match(await page.locator(".next-veil").innerText(), /Hungry Hungry Hammer/);
  await shot(page, "hungry-card.png");
  await waitMode(page, "quest");
  assert.match(await page.locator(".next-hud").innerText(), /The Banquet/);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(350);
  }
  assert.ok((await page.evaluate(() => window.__next.quest.dives)) >= 4, "he dives");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowLeft");
  assert.ok((await page.evaluate(() => window.__next.quest.aim)) > 10, "← swings his line toward the far side");
  // A charged rob of the bellhop's plate.
  await page.evaluate(() => window.__next.dev.quest({ plate: { who: "bellhop", kinds: ["ribeye"] } }));
  await page.evaluate(() => window.__next.dev.quest({ aim: "bellhop" }));
  await page.keyboard.down("Space");
  await page.waitForTimeout(550);
  await shot(page, "hungry-charge.png");
  await page.keyboard.up("Space");
  await page.waitForFunction(() => (window.__next.run.events.hhRob ?? 0) >= 1, null, { timeout: 3000 });
  await page.waitForTimeout(150);
  await shot(page, "hungry-dive.png");
  // The mallet waits for him to be back from the table.
  await page.waitForTimeout(300);
  await page.keyboard.press("h");
  await page.waitForFunction(() => (window.__next.run.events.hhBonk ?? 0) >= 1, null, { timeout: 3000 });
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__next.quest.duck), true);
  await shot(page, "hungry-duck.png");
  await page.keyboard.up("ArrowDown");
  // A break freezes the round; a charge held through it neither grows nor fires.
  await page.keyboard.down("Space");
  await page.keyboard.press("Escape");
  await waitMode(page, "pause");
  const t = await page.evaluate(() => window.__next.quest.time);
  const dives = await page.evaluate(() => window.__next.quest.dives);
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.__next.quest.time), t, "the clock stops");
  await page.keyboard.up("Space");
  await page.keyboard.press("Escape");
  await waitMode(page, "quest");
  await page.waitForTimeout(600);
  assert.ok((await page.evaluate(() => window.__next.quest.dives)) <= dives + 1, "nothing fired twice from the break");
  // The window losing focus lets go of the keys: a charge under way goes out as it is, it does not hang coiled.
  await page.keyboard.down("Space");
  await page.waitForTimeout(60);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__next.quest.coiling), false);
  await page.keyboard.up("Space");
  for (const [w, h] of [[1280, 800], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    if (w < 900) assert.equal(await page.locator(".next-touch button").count(), 10, `${w}x${h}: the pad's ten buttons`);
    await fits(page, w, h);
    await shot(page, `hungry-${w}x${h}.png`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  // The tally: practice offers Play again and Start screen, and keeps its best.
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  const tally = await page.locator(".next-veil").innerText();
  assert.match(tally, /COMPED|GOOD TIPPER|SPLIT THE CHECK|WATER ONLY/);
  assert.match(tally, /Play again/);
  assert.match(tally, /Start screen/);
  await shot(page, "hungry-tally.png");
  const score = await page.evaluate(() => window.__next.quest.score);
  assert.equal(Number(await page.evaluate(() => localStorage.getItem("hammer-time-best-banquet"))), score, "the best kept");
  // Space on the tally is Play again: a fresh round's card, and no dive in its first second.
  await page.keyboard.down("Space");
  await waitMode(page, "questCard");
  await waitMode(page, "quest");
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.__next.quest.dives), 0, "the key held from the tally fired nothing");
  await page.keyboard.up("Space");
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  await page.getByRole("button", { name: "Start screen" }).click();
  await waitMode(page, "title");
  // A round with the art missing: the stand-ins draw and it plays to its tally.
  await page.goto(`${base}?next=1&title=1&dev=1&noart=1`);
  await page.getByRole("button", { name: "Play Hungry Hungry Hammer" }).click();
  await waitMode(page, "quest");
  await page.waitForTimeout(2500);
  await shot(page, "hungry-noart.png");
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  // The BUFFET door in a shift: the round, Continue with Space, back at the door with what it paid, and the door spent.
  await page.goto(`${base}?next=1&dev=1`);
  await waitMode(page, "play");
  await page.evaluate(() => window.__next.dev.teleport(4600, 0));
  await page.waitForTimeout(400);
  assert.match(await page.locator(".next-hud__hint").innerText(), /BUFFET · Hungry Hungry Hammer/);
  const before = await page.evaluate(() => ({ score: window.__next.run.score, jumps: window.__next.run.events.jump ?? 0 }));
  await page.keyboard.down("ArrowDown");
  await waitMode(page, "questCard");
  await page.keyboard.up("ArrowDown");
  await waitMode(page, "quest");
  await page.evaluate(() => window.__next.dev.quest({ eat: ["coke", "nuts"] }));
  await page.evaluate(() => window.__next.dev.questSkip());
  await waitMode(page, "questTally");
  assert.match(await page.locator(".next-veil").innerText(), /Back to the lobby/);
  await page.keyboard.down("Space");
  await waitMode(page, "play");
  await page.waitForTimeout(500);
  await page.keyboard.up("Space");
  const after = await page.evaluate(() => ({ x: window.__next.run.x, score: window.__next.run.score, jumps: window.__next.run.events.jump ?? 0, cans: window.__next.run.cans }));
  assert.ok(Math.abs(after.x - 4600) < 2, "back at the door");
  assert.equal(after.jumps, before.jumps, "Space on the tally did not jump");
  assert.ok(after.score > before.score, "the round's score came home");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(400);
  await page.keyboard.up("ArrowDown");
  assert.equal(await mode(page), "play", "the door is spent");
  assert.match(await page.locator(".next-hud__hint").innerText(), /thank you, come again/);
  await shot(page, "hungry-door-after.png");
  // The old link's meaning: straight to the banquet.
  await page.goto(`${base}?quest=hungry`);
  await page.waitForFunction(() => ["questCard", "quest"].includes(window.__next?.run?.mode), null, { timeout: 30000 });
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: practice from the start screen, the dive, the rob, the bonk, the duck, the break, three shapes, the tally and its best, no key carried over, the art missing, the BUFFET door and its payout, /?quest=hungry.");
} finally {
  await browser.close();
}
```

Run: `npm run test:next`, then `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/hungry-browser.check.mjs http://127.0.0.1:8090/`
Expected: FAIL (`hudOf(...).quest` is undefined; the start screen has no "Play Hungry Hungry Hammer" button).

- [ ] **Step 2: The HUD's payload** (in `src/render/hud.ts`)

```ts
import { HUNGRY, baseReach, hungryHint, type HungryResult } from "../sim/quests/hungry/hungry";
```

`HudPayload` adds:

```ts
  /** The banquet (R4 §9) while its card, its round or its tally is up; null in the shift. */
  quest: { score: number; time: number; reach: number; reachBase: number; reachMax: number; combo: number; mult: number; chomps: number; door: boolean; result: HungryResult | null } | null;
```

In `hudOf`, compute it and put the banquet's hint first:

```ts
  const q = game.quest;
  const quest = q
    ? {
        score: Math.max(0, Math.round(q.score.plate + q.score.bonus)),
        time: Math.max(0, Math.ceil(HUNGRY.round - q.time)),
        reach: Math.round(q.hammer.dive?.phase === "coil" ? q.hammer.dive.reach : baseReach(q)),
        reachBase: baseReach(q),
        reachMax: HUNGRY.reach.charged,
        combo: q.score.chain,
        mult: q.score.chain >= HUNGRY.combo.triple ? 3 : q.score.chain >= HUNGRY.combo.double ? 2 : 1,
        chomps: q.score.eaten,
        door: !!game.questDoor,
        result: q.result,
      }
    : null;
```

and in the returned object `quest,` and `hint: q ? hungryHint(q) : (note ?? hintOf(game)),`. `hudKey` adds `p.quest ? [p.quest.score, p.quest.time, p.quest.reach, p.quest.reachBase, p.quest.combo, p.quest.chomps, p.quest.result ? 1 : 0].join(",") : ""`.

- [ ] **Step 3: The HUD, the cards and the keys**

`src/components/next-keys.ts` adds:

```ts
/** The banquet's keys, for its break card (R4 §3). */
export const BANQUET_KEYS: [string, string][] = [
  ["Space", "dive, hold to charge"],
  ["← →", "aim"],
  ["H", "bonk the table"],
  ["↓", "duck"],
  ["P", "break"],
];
```

`src/components/next-hud.tsx`: when `hud.quest` is set, the top bar keeps the score (the round's), the clock (its 60 s) and the two buttons, without the cans, the lives or the shield; the panel's header reads "Hungry Hungry Hammer" over "The Banquet"; its rows are Reach and Combo in place of Patience, Heat, Snot and Smash:

```tsx
  const q = hud.quest;
  const score = q ? q.score : hud.score;
```

(the score span shows `score`; the cans, lives and star spans render only when `!q`; the clock shows `q ? clock(q.time) : …`; the venue line `q ? "Hungry Hungry Hammer" : hud.venue`, the mode line `q ? "The Banquet" : \`World ${hud.world}\``) and, in place of the four rows when `q`:

```tsx
          <div className="next-hud__row">
            <dt>Reach</dt>
            <dd aria-label={`${q.reach} of ${q.reachMax}`}>
              <span className="next-hud__bar next-hud__bar--reach">
                <b style={{ width: `${(100 * q.reach) / q.reachMax}%` }} />
                <i style={{ left: `${(100 * q.reachBase) / q.reachMax}%` }} />
              </span>
            </dd>
          </div>
          <div className="next-hud__row">
            <dt>Combo</dt>
            <dd className="next-hud__combo" data-mult={q.mult}>
              {q.mult > 1 ? `×${q.mult} · ` : ""}
              {q.combo} in a row · {q.chomps} chomped
            </dd>
          </div>
```

`src/components/next-veil.tsx`: `VeilInfo` adds `quest: HudPayload["quest"]` and `banquetBest: number`; `NextVeil` takes `onContinue`, `onQuestAgain` and the existing `onTitle`; three more cards (the round's cards sit on the side away from his face: `data-place` takes `"right"` too):

```tsx
  if (mode === "questCard")
    return (
      <div className="next-veil next-veil--card" data-place={place}>
        <section className="next-veil__card" aria-live="polite">
          <p className="next-veil__eyebrow">Side quest</p>
          <h2 className="next-veil__title">Hungry Hungry Hammer</h2>
          <p className="next-veil__line">The Banquet</p>
        </section>
      </div>
    );
  if (mode === "questTally" && info.quest?.result) {
    const r = info.quest.result;
    const best = Math.max(info.banquetBest, r.score);
    const lines = [
      `Plate ${r.plate} from ${r.grabs} grabs`,
      `Combo bonus +${r.comboBonus} (best ${r.bestCombo} in a row)`,
      ...(r.robbed ? [`Robbed other plates ${r.robbed} time${r.robbed > 1 ? "s" : ""}`] : []),
      ...(r.paper ? [`Paper to the face: ${r.paper} (-${r.paper * 150})`] : []),
      ...(r.specials.length ? [`Specials: ${r.specials.map((k) => FOODS[k].name).join(", ")}`] : []),
      ...(r.bill ? ["Picked up the check: -400"] : []),
      ...(r.full ? ["Full belly: the pepper on the way back"] : []),
    ];
    return (
      <div className="next-veil" data-place={place}>
        <section className="next-veil__card next-veil__card--tally" role="dialog" aria-label={r.grade}>
          <p className="next-veil__eyebrow">Side quest</p>
          <h2 className="next-veil__title">{r.grade}</h2>
          <dl className="next-veil__scores">
            <div>
              <dt>Score</dt>
              <dd>{String(r.score).padStart(6, "0")}</dd>
            </div>
            <div>
              <dt>{r.score >= best && r.score > 0 ? "New best" : "Best"}</dt>
              <dd>{String(best).padStart(6, "0")}</dd>
            </div>
          </dl>
          <ul className="next-veil__lines">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {info.quest.door ? (
            <button type="button" className="next-veil__button" onClick={onContinue}>
              Back to the lobby
            </button>
          ) : (
            <>
              <button type="button" className="next-veil__button" onClick={onQuestAgain}>
                Play again
              </button>
              {toTitle}
            </>
          )}
        </section>
      </div>
    );
  }
```

and the pause card lists `info.quest ? BANQUET_KEYS : KEYS`. (`FOODS` from `@/sim/quests/hungry/food`, `HudPayload` from `@/render/hud`.)

`src/components/next-game.tsx`:
- `const BANQUET_BEST_KEY = "hammer-time-best-banquet";` in place of the shipped `HUNGRY_BEST_KEY`; `banquetBest` state read from it on mount.
- `quest?: "hungry"` prop: once ready, if it is set and the game is on the start screen, `look.current.newQuest()` (once, like a pending start).
- `onMode`: on `questTally`, if the HUD's `quest.result.score` beats the banquet's best, write it (door rounds and practice alike); the shift's best stays as it is (no best from a `questTally`).
- `carded` includes `questCard` and `questTally`; `place` in those modes and in a pause over the round is `"right"` when the screen is wider than tall and his face is on its left half, else top or bottom as now.
- The touch pad shows in `quest` too (`mode !== "card" && mode !== "questCard" && mode !== "questTally"`).
- `NextVeil` gets `onContinue={() => look.current?.finishQuest()}`, `onQuestAgain={() => look.current?.newQuest()}`, and `onTitle={() => look.current?.toTitle()}` in the round's modes whether or not the page began on the start screen.
- `NextStart` gets `banquetBest` and `onQuest` (`look.current ? look.current.newQuest() : setPendingQuest(true)`, begun once ready).

`src/components/next-start.tsx`: the Side quests card becomes a button with the game's picture:

```tsx
      <section className="next-start__quests" aria-label="Side quests">
        <span className="next-start__quests-k">Side quests</span>
        <button type="button" className="next-start__quest" aria-label="Play Hungry Hungry Hammer" onClick={onQuest} disabled={!live}>
          <img src="/start/banquet.webp" alt="" draggable={false} />
          <b>Hungry Hungry Hammer</b>
          <small>Banquet table · best {pad(banquetBest)}</small>
        </button>
      </section>
```

(props `banquetBest: number; onQuest: () => void` in place of `hungryBest`). `src/styles.css`: `.next-veil[data-place="right"]` puts the card in the right half (`justify-content: flex-end` and the card's width capped at 46 vw on a wide screen); `.next-veil__lines` a short list in the card's body text; `.next-hud__bar--reach i` a 2 px gold tick at the tap's reach; `.next-start__quest img` sized like the venue cards' pictures. Each fits 390 by 844 and 844 by 390.

`src/routes/index.tsx`: `Home` passes the quest to the new game, and a quest link holds the game on the start screen behind it (practice opens from there, so `?next=1&quest=hungry`, the boards' and the checks' link, works too):

```tsx
  const banquet = classic ? undefined : quest;
  return <NextGame forceWebgl={!!gl} noart={!!noart} board={!!board} dev={!!dev} nocast={!!nocast} start={venue} title={!next || !!title || !!banquet} quest={banquet} />;
```

Run: `git hash-object src/routeTree.gen.ts`
Expected: `dceedffdc12c32138e81bb63787cac7ae5d97fcd`.

- [ ] **Step 4: The door in the lobby** (in `src/render/venue.ts` and `src/render/look.ts`)

`drawDoor` gives a `quest` door the wood leaf of a closed one and no card, and a THANK YOU card hidden until it is spent; `VenueView.setSpent(ids)` shows it:

```ts
  if (d.kind === "quest") {
    thanks = new Container();
    const card = new Graphics();
    const text = label("THANK YOU", "display", 30);
    const w = Math.min(DOOR.w - 30, text.width + 36);
    card.roundRect(d.x - w / 2, top + 110, w, 52, 6).fill(COLORS.card).stroke(THIN);
    card.moveTo(d.x - 30, top + 110).lineTo(d.x, top + 80).lineTo(d.x + 30, top + 110).stroke({ width: 2, color: PALETTE.outline });
    text.tint = PALETTE.outline;
    text.anchor.set(0.5);
    text.position.set(d.x, top + 136);
    thanks.addChild(card, text);
    thanks.visible = false;
    root.addChild(thanks);
  }
```

(`drawDoor` returns `{ glow, thanks }`; the venue keeps each door's `thanks`; `setSpent(ids)` sets `thanks.visible = ids.includes(id)` for each.) In `look.ts`, the door glow (`const door = …`) includes a `quest` door that is not spent, and each frame `views.get(game.level.id)?.venue.setSpent(game.run.spent)`.

- [ ] **Step 5: The start screen's picture** (in `scripts/start-art.mjs`)

After the venues' loop:

```js
  // The banquet's card: the round at the entrees, drawn by the game.
  await page.goto(`${base}?next=1&board=1&quest=hungry`);
  await page.waitForFunction(() => window.__nextBoard && window.__next?.run, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const thumb = await page.evaluate(() => window.__nextBoard.render({ kind: "banquet-thumb", resolution: 1 }));
  await webp(Buffer.from(thumb.split(",").pop(), "base64"), 640, "banquet.webp");
```

and the PASS line names the banquet's picture. Run: `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/start-art.mjs http://127.0.0.1:8090/`. Look at `public/start/banquet.webp`.

- [ ] **Step 6: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim scripts`, then with `BROWSER_SMOKE_CHANNEL=chrome` against `http://127.0.0.1:8090/`: `hungry-browser`, `next-start`, `next-browser`, `run-browser`, `shift-browser`.
Expected: PASS. `next-start.check.mjs`'s side-quest step now clicks the button and waits for `questCard` (update it: no `waitForURL` to `classic`; the round starts on the same page). Look at every `artifacts/hungry-*.png` at full size: the card and the tally on the side away from his face, the HUD's Reach and Combo, nothing running off a phone's screen either way.

- [ ] **Step 7: Commit and push**

```bash
git add src/render/hud.ts src/components/next-hud.tsx src/components/next-veil.tsx src/components/next-game.tsx src/components/next-start.tsx src/components/next-keys.ts src/styles.css src/render/venue.ts src/render/look.ts src/render/app.ts src/routes/index.tsx scripts/start-art.mjs public/start/banquet.webp scripts/hungry-browser.check.mjs scripts/next-start.check.mjs scripts/render.check.mjs
git hash-object src/routeTree.gen.ts
```

Message: "Hungry Hungry Hammer in the shell: its HUD, its card and tally, practice from the start screen's card with its own best, the BUFFET door's glow and THANK YOU, and /?quest=hungry". Push.

---

### Task 11: Every check, the docs, the review and the owner's play-test

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-10-14-r4-hungry-hungry-hammer-design.md` (as built), `art/ART-REQUEST.md`
- Create: `docs/superpowers/handoff-<date>-r5.md`, named with the date it is written (for example `handoff-2026-10-16-r5.md`)

- [ ] **Step 1: Every check**

Run: `npm run test:next`, `npm run test:game`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`; with `BROWSER_SMOKE_CHANNEL=chrome` against `http://127.0.0.1:8090/`: `next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `hungry-browser`, `start-screen`, `node scripts/look-boards.mjs http://127.0.0.1:8090/`; then `node scripts/with-app-env.mjs vite build`, restart the preview on 8091, `node scripts/browser-smoke.mjs http://127.0.0.1:8090/?next=1 artifacts/smoke-dev.png`, `node scripts/browser-smoke.mjs http://127.0.0.1:8091/?next=1 artifacts/smoke-preview.png --baseline artifacts/smoke-dev.json`, and the phone's start through the throttling relay (`node artifacts/throttle-proxy.mjs 8092 8091 12 60`, `node artifacts/boot-relay-log.mjs`).
Expected: all pass (`game-browser-check` still times out at its idle wait, as before; note it); the phone's start fetches about what it did (the banquet's art loads behind the start screen, after the lobby).

- [ ] **Step 2: The docs**

- `README.md`, "The rebuild": a section "Hungry Hungry Hammer (the BUFFET door)" in the shape of "The gift shop (1-4)": the table and who sits where, the dive (tap, charge, aim, the haul), the rivals, the server, the paybacks, the bonk, the clash, the waves and the frenzy, the scoring and the grade lines (with the scale the scripted rounds set), the door and its payout, practice and `/?quest=hungry`, the paintings and their cuts (`node scripts/art-grid.mjs banquet/room`, `banquet/table`, `cast/nurse`), the checks (`banquet.check.mjs`, `hungry-browser.check.mjs`, `node --loader ./scripts/game-test-loader.mjs scripts/banquet-tune.mjs`) and the boards (`banquet-look-1..4`, `banquet-dive`, `banquet-food`). The start screen's section: the Side quests card plays it in place.
- The R4 design: "As built in R4 (date)" notes under §2 to §10 naming every ruling that changed what the owner sees (the plan's decisions and the ledger's).
- `art/ART-REQUEST.md`: §7 (the food sheet), §5 (the nurse) and §4 (the ballroom) status lines.
- `docs/superpowers/handoff-<date>-r5.md` for R5, Fare Darts (the shape of `handoff-2026-10-14-r4.md`): repo, read-first list, where things stand, owner decisions, the job, environment, how to work, R4's rulings, deferred minors.

- [ ] **Step 3: Commit and push**

```bash
git add README.md docs/superpowers/specs/2026-10-14-r4-hungry-hungry-hammer-design.md art/ART-REQUEST.md docs/superpowers/handoff-<date>-r5.md
```

Message: "R4 written up: Hungry Hungry Hammer in the README, the design as built, the art's status, the R5 handoff". Push.

- [ ] **Step 4: The final review** (the executing-plans skill's Final Review: the review package from `git merge-base main HEAD` to `HEAD`, one fresh reviewer on the most capable model, this plan's Review Focus verbatim, the ledger's rulings; then the one fix pass, each fix test-first)

- [ ] **Step 5: Stop for the owner's play-test**

Open `http://127.0.0.1:8090/` in the browser panel for the owner and report in product terms with the screenshots and boards: what is new, what to try (the Side quests card on the start screen; the BUFFET door in a shift, then what came home with him), every decision taken for them (this plan's list and the ledger's rulings that changed what they see), the grade lines the scripted rounds set, and R3b's open question (should the top plush shelf be a refuge from the pig's charge?). Each change the owner asks for after playing is its own commit, test-first, before Task 12.

---

### Task 12: The old game's deletion (only on the owner's explicit yes)

**Files:**
- Delete: `src/game/engine.ts`, `src/game/rig.ts`, `src/game/hero.ts`, `src/game/scenery.ts`, `src/game/sprites.ts`, `src/game/thought.ts`, `src/game/layout.ts`, `src/game/people.ts`, `src/game/levels.ts`, `src/game/constants.ts`, `src/game/combat.ts`, `src/game/quests/` (`food.ts`, `hungry.ts`, `hungry-draw.ts`, `quest.ts`), `src/components/kiln-hop.tsx`, `scripts/gameplay.check.mjs`, `scripts/hungry.check.mjs`, `scripts/game-harness.mjs`, `scripts/game-browser-check.mjs`, `scripts/start-screen.check.mjs`, `scripts/props.check.mjs`, `scripts/quest-browser.check.mjs`, `scripts/pig-boss.check.mjs`, `scripts/surroundings.check.mjs`, `scripts/voice-browser.check.mjs`
- Modify: `src/game/lines.ts` (its `EnemyRole` type moves in), `src/routes/index.tsx`, `src/styles.css` (the shipped shell's rules), `package.json` (`test:game` goes), `scripts/next-browser.check.mjs`, `README.md`

- [ ] **Step 1: Ask the owner** whether the old game at `/?classic=1` can now be deleted (Hungry Hungry Hammer, the start screen and every check now live in the new game). Go on only on a clear yes.

- [ ] **Step 2: Account for every old check** (the ledger, before deleting anything)

For each test in `scripts/gameplay.check.mjs` and `scripts/hungry.check.mjs`, and for each browser check in the Files list, write one ledger line: what it checked, and either the new check that covers it (file and test name) or why it is retired (it checked the 384 by 216 view, the photo cut-outs, the tile grid or the 1-D table, which are gone, main spec Appendix B). Where a behavior still in the game has no new check, port it to the new game's checks first, test-first, before Step 3. `voice-browser.check.mjs`'s recordings and captions are the case to look at closest: if `acts-browser` and `moves-browser` do not already hear each of the six recordings play with its caption, port that check.

- [ ] **Step 3: Delete, and move what stays**

`src/game/lines.ts` imports `EnemyRole` from `./levels`: copy that type's definition into `lines.ts` (exported) and drop the import. Delete the files listed. In `src/routes/index.tsx` remove the `KilnHop` import, the `classic` flag from `validateSearch` and its branch in `Home`, and say in the comment that `/` is the game, `?next=1` straight into play (the checks), `?quest=hungry` straight into the banquet; an old `/?classic=1` link now opens the start screen. Remove from `src/styles.css` the rules only `kiln-hop.tsx` used (list its class names with `Select-String -Path src/components/kiln-hop.tsx -Pattern 'className="([^"]+)"' -AllMatches`, and remove each rule whose classes appear in no other component). `package.json`: remove `test:game`. `scripts/next-browser.check.mjs`: drop its `classic` step.

Run: `git hash-object src/routeTree.gen.ts`
Expected: `dceedffdc12c32138e81bb63787cac7ae5d97fcd`.

- [ ] **Step 4: Every check**

Run: Task 11 Step 1's list without `test:game`, `start-screen` and `game-browser-check`; and `Select-String -Path src, scripts -Recurse -Pattern 'game/engine|kiln-hop|classic'` finds nothing but this plan's history.
Expected: all pass; `/?classic=1` on the preview opens the new game's start screen.

- [ ] **Step 5: The README**

Drop the shipped game's sections ("Controls", "Hammer's moves", "Start screen", "Side quests: Hungry Hungry Hammer", "Routes and surroundings", "The Pink Menace", and whatever of "Character and audio" describes only the old game), make "The rebuild" the game's own description (its title "Hammer Time" and its first paragraph saying what the game is), and the Validation section the new game's checks.

- [ ] **Step 6: Commit and push**

```bash
git add -u src/game src/components/kiln-hop.tsx scripts package.json
git add src/game/lines.ts src/routes/index.tsx src/styles.css README.md
git status --short
git hash-object src/routeTree.gen.ts
```

(`git add -u` stages the deletions of tracked files under those paths and nothing untracked; read `git status --short` before committing: `package-lock.json` and `src/routeTree.gen.ts` must not be staged.) Message: "The old game is gone: its engine, its shell and its checks, each check ported or retired by name; /?classic=1 opens the new game". Push. Build, restart the preview, and look at `/`, `/?next=1`, `/?quest=hungry` and `/?classic=1` on it.

---

## Finish: the merge (only on the owner's explicit yes)

Ask the owner whether to merge `claude/hammer-pass` into `main`. On a clear yes, use superpowers:finishing-a-development-branch (the merge, then push `main` with that yes). Never push `main` otherwise. Update the memory files (`hammer-time-rebuild-status.md`: R4 done, next R5 per its handoff).
