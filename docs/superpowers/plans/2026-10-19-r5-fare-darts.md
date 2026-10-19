# R5 Fare Darts, the AIRPORT SHUTTLE Door, the Boxes of #15 Blades and the Second Side Quests Card, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. For R5 the handoff names the method: superpowers:executing-plans inline, test-first, with the ledger, and one fresh reviewer on the most capable model at the end.

**Goal:** Fare Darts inside the new game (the R5 design): ten scalpels thrown at a route map at gate B7, at shift size, under a crosshair whose figure never closes, with fare tags, the A-List ladder, the hazards, Hammer's insults and a crowd that oohs and laughs; the lobby's AIRPORT SHUTTLE door opens it once a shift and pays out boxes of #15 blades, which he lobs at staff and students in the shift to freeze them with birds round their heads; the start screen's second Side quests card plays it as practice; the owner's four paintings cut in as they come.

**Architecture:** The round is a pure sim (`src/sim/quests/fares/`: `board.ts` the map, the cities and the fares; `fares.ts` the round; `events.ts` its events; `drive.ts` the scripted players). The Game's quest becomes `Hungry | Fares`, told apart by an `id`, both hosted by R4's modes (`questCard`, `quest`, `questTally`) with the shift frozen behind them. The boxes are a hero count (`HeroState.boxes`), a move (`lob`) and a projectile (`src/sim/samples.ts`) whose hit freezes its target through the lecture's frozen act with its own length and birds. The renderer draws the gate from a pure per-screen-shape layout (`src/render/quests/gate-layout.ts`), a board (`gate-board.ts`) and a view (`gate-scene.ts`, `GateView`), switched in by `look.ts` the way the banquet is; the shell shows the round's HUD, card and tally, and the start screen's second card.

**Tech Stack:** TypeScript, React 19, TanStack Start, PixiJS 8, sharp, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-18-r5-fare-darts-design.md` (all of it) over `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§2 hard limits, §6.3, §10 HUD and shell, §12 Fare Darts, §15 testing), the R4 design's §7 and §8 (`2026-10-14-r4-hungry-hungry-hammer-design.md`, the side quest's door and practice) and the expansion spec's appendix C (the map). Handoff: `docs/superpowers/handoff-2026-10-14-r5.md`. Art: `art/outgoing/batch-9-r5-gate.txt` (the brief), `art/outgoing/batch-r5-codex.txt` (the owner's prompts).

## Global Constraints

- The crosshair: "`x = cx + 540 sin(θ)`, `y = cy + 300 sin(1.618 θ + 0.7)` around the map's middle, θ advancing at `w`, which starts at 1.4 rad/s and rises 8 percent a throw (compounding). θ accumulates, so the crosshair never jumps when `w` changes." The rules work "on the map rectangle in its own px (1080 by 600, x east, y south, the origin at its top-left)". (R5 §3)
- The tuning: "a player who never throws ends C GROUP with nothing; a "person" ... books a median of four to six; a sharp player ... reaches A1 in at least seven of the ten. What may move: the starting `w`, its 8 percent rise, the steady hand's 0.35 and its 2.5 s (and the 1.618, only toward another ratio that never closes, keeping every city within reach). What may not: the map, the tags' sizes, lives and spawning, the fares and the points." (R5 §3; this plan's decision 1 replaces the idle player with a masher)
- The steady hand: "holding Run (Shift or J; the pad's Run; a second finger held on the screen) slows `w` to 0.35 of itself while the steady meter drains. The meter holds 2.5 s a round and refills 0.2 s per booking (capped at 2.5)." (R5 §3)
- The throw: "any action key (Space, W, Z or ↑; F, C or K; H or X; Q) or a tap on the scene. The point the crosshair is on at the press is where the scalpel lands and what it is scored against, with the tags live at the press (one that runs out while the scalpel flies still books)." "The throw clip runs 0.3 s ... the scalpel flies 0.22 s on a slight arc with two spins and a motion trail, sticks with a thunk, wobbles 0.4 s, and the board shakes 6 px. The camera pushes in 4 percent on the release and back on the stick. A throw can start once the last one has stuck; a held key never throws twice." (R5 §3)
- Tags: "one spawns every 0.9 s on a random untagged city (never SAT), at most four live, each lasting 2.6 s and flickering through its last 0.6 s." The fare: "`39 + round(d × 260)`, `d` the distance from SAT in appendix C's normalized map coordinates, rounded up to end in 9, clamped 49 to 249; a flash sale (a fifth of spawns) halves it, rounded up to end in 9 and clamped again." Wanna Get Away (under $100) 90 by 50, yellow, `300 + (100 − fare) × 2`; Anytime ($100 to $199) 120 by 60, red, 150; Business Select ($200 and up) 150 by 70, blue, 60. Tags "centered on the city ... (2 px pad). Where two tags overlap, the one whose city is nearest the scalpel's point books." "Booking a city already booked this round is a Companion Pass: double." (R5 §4, §1 decision 6)
- The ladder: "Boarding positions 0 to 179 are A1 to A60, B1 to B60, C1 to C60; he starts at C60 (179). A booking moves his pass up 20; on a streak, 30. A miss drops it a full group (60, never past C60)." "The streak begins at the third booking in a row and lasts until a miss." "A1 once a round: A-LIST PREFERRED ... his remaining scalpels score double (stacking with a Companion Pass)". "Anything that does not book is a miss for the ladder and the streak: the drywall, the bare map, a tag under the storm cloud, the cancelled flight, the gate agent's clipboard. The two bonus tags (ASSIGNED SEATING, BAG FEE) are bookings." (R5 §5, §1 decisions 3 to 5)
- Hazards: the cloud "drifts over a third of the map (the west, the middle or the east, at random) after the second and the sixth scalpels have stuck, and stays 3 s"; the ground stop "once a round: a red X sits on a live tag for 2 s at a random moment between the second and the eighth throw. Hitting it costs 200 and is a miss"; the agent's crossing "once between the fourth and the eighth throw ... for 1.4 s ... a box as wide as her drawn body sliding along the map's lowest 160 px across its right half"; ASSIGNED SEATING "once a round between the fifth and the ninth throw: a white tag on a random city for 1.6 s, +500"; BAG FEE "once a round at random: an orange tag, +300". (R5 §6)
- His mouth: an insult "comes on its own every 6 s or so; on a streak every 3 s; E fires one at once (no wait beyond the bubble on screen, not while a throw is in the air)"; a miss: "his angry face for 2 s, steam puffing from the top of his head ... the miss line, and he doubles down: two insults in a row, the first at whoever laughed"; the crowd: "on a booking one or two travelers react ... on a streak booking all of them ... on a miss they laugh ... at A-LIST PREFERRED they clap"; "at most two travelers' bubbles at once". The lines are the design's §7, word for word. (R5 §7)
- The end and the payout: "After the tenth scalpel has stuck or bounced, a beat, then the tally." Grades "A-LIST PREFERRED (A1 reached), A-LIST (seven or more bookings), B GROUP (four to six), C GROUP (three or fewer)." From the door: "the score onto the shift's; a box of #15 blades per booking; three cans per Wanna Get Away booked ...; a full smash for B GROUP or better; a life for A-LIST PREFERRED. Walking out he holds a Coke Zero in his free hand for 3 s if cans came, and nuts spill from his pockets for 2 s if the smash did." "Practice wins nothing." The hint on the way back: "Gate +3,840 · 6 boxes of #15 blades · +9 cans". (R5 §8)
- The boxes: "Carried like the doggy bag ... through the venues, the stash and a lost life, until thrown; a new shift starts with none." "B lobs one ... underhand from his free hand, an arc forward about a screen's third with gravity. The first staffer or student on their feet it touches is bonked: frozen 1.5 s with three little birds circling their head and "FREE SAMPLE!", 50 points, the taunt roll of a lecture freeze ... the pig, a cart and a wall stop it with no effect." "One every 0.4 s; standing, walking, running or in the air, never crouched, sliding, flopping or knocked down." The hint "Boxes of #15 blades · B lobs one · it freezes staff" until the first throw. (R5 §9, §1 decision 10)
- The door: "↓ on the floor in front of it, not in the air, mid-move, mid-slide or knocked down; its card ("Side quest / Fare Darts / Gate B7 · SAT", and the prize: "Book fares to bring home boxes of #15 blades"); the lobby frozen behind it ...; Continue on the tally stands him at the door with 0.6 s of grace ...; once a shift ... The hint in front of it: "↓ AIRPORT SHUTTLE · Fare Darts"." "The BUFFET door and the AIRPORT SHUTTLE door are spent separately." (R5 §10)
- Practice: "A second card in the Side quests row ... "Fare Darts / Gate B7 · best 000000", its picture rendered by the game (`public/start/gate.webp`) ... `/?quest=fares` opens it directly." The best: `hammer-time-best-fares`, door rounds and practice alike. (R5 §11, §1 decision 16)
- The screen: the top bar ("the scalpels left (ten small scalpels, spent ones dim) in the clock's place, "Fare Darts · Gate B7" in the venue's place"), the panel ("the steady hand's meter, his boarding position ("B13"), the streak when there is one"), the hint lines word for word from R5 §12, the pad's ten buttons (Jump, Hammer, Snot and Super throw, Run steadies, Lecture mouths off, the arrows, ↓ and Towel unlit), "Every card and bar fits 1280 by 800, 390 by 844 and 844 by 390 with no horizontal overflow." (R5 §12)
- The scene: "Everyone is drawn at their shift size"; "The board hangs low in every layout: the map's bottom edge about 150 px above the floor"; "nobody but the crossing agent covers a city or a tag"; the travelers `office-1`, `student-2`, `prof-1` and the nurse "seated in a row of gate seats seen from behind"; on an upright phone "the board fills the width and the people stand in front of its bottom edge". (R5 §2, §1 decisions 13, 14, 19)
- The art: the four paintings, what is drawn in code, what is reused, the poses and the fallbacks of R5 §13. "The sync warns and goes on; a bad painting never stops it."
- Sound: "`whoosh` on a throw; new `thunk` ... on a stick; new `print` ... on a booking's pass, with `ding`; `boom` on A-LIST PREFERRED ... In the shift the box lands with the existing `thud`, and a new `tweet` (three quick chirps) plays with the birds. No crowd voices." The lobby's music plays on. (R5 §14)
- The face rule (main spec §2.1): nothing crosses his face box in any frame of the throw or the lob, his head within 8 degrees of level; Hammer's lines are thoughts, everyone else's speech; "The six recordings in `public/voice/*` plus `public/absolute-bullshit.mp3` are the only spoken lines."
- "Pixi objects cannot be constructed under `node:test`": node tests touch pure functions and the cut pipeline only; drawing is verified on boards and in the browser. Stand-ins are placeholders: never polish them.
- The owner's files under `art/incoming/` and `art/reference/`, `public/voice/*` and `public/absolute-bullshit.mp3` are never modified; `npm run art:sync` after any change to `art/cuts/*` or `scripts/art-cut.mjs`; a commit stages only the manifest entries of the paintings it adds (`node artifacts/stage-manifest.mjs <paths…>`, or `git add -p art/manifest.json`).
- Owner rules: never stage, revert or touch `package-lock.json` or `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`, checked after every edit to `src/routes/index.tsx`); write the message to `.git/CLAUDE_MSG` with the Write tool and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, named paths only, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `claude/hammer-pass` after each commit, never `main`; the dev server on 8090, the preview on 8091 (restart it after every rebuild); browser checks with `BROWSER_SMOKE_CHANNEL=chrome`. Many source files are CRLF: exact-string edit scripts normalize them (`artifacts/edit.mjs`); write code and scripts to files with the Write tool.

## Review Focus

1. **Keys carried across a card or a tally:** Space or Enter closing the gate's tally neither throws a scalpel in the next practice round nor jumps or swings back in the lobby; a key held through the round's card throws nothing when the round starts; B held through Continue lobs nothing until pressed again. Pinned in Task 6 (the sim: throws and lobs take press edges only) and Task 12 (the browser: Space closes the tally, no `fdThrow` in the next round's first second, no `sampleThrow` back in the lobby).
2. **Mashing, a break mid-throw and the round's end:** throws pressed during a windup or a flight are dropped, never queued; exactly ten scalpels; the tally and its payout come once; a break during a windup or a flight resumes it where it was, with the outcome decided at the press, and the steady meter does not drain while paused. Pinned in Task 3 (mashing, ten exactly, the end once) and Task 6 (a break mid-shot in the Game).
3. **A phone turned mid-round, and odd screens:** at 1280 by 800, 1920 by 1080, 4:3, 21:9 and three phones either way up, the board, the ladder, Hammer and the travelers' heads stay in view between the bars, nobody stands or sits over a city's tag, and the agent's drawn band covers the map's lowest 160 px. Pinned in Task 10 (`gateLayout` over seven shapes) and Task 12 (the browser, three shapes mid-round).
4. **Boxes in awkward places:** lobbed point-blank into a wall, off a ledge into the elevator shaft, at the pig, at a cart, over a staffer already down, as he walks through a door or the exit, or with none left: no crash, no NaN, the count never below 0, one box per press, a box in flight gone at a level change. Pinned in Task 8.
5. **Missing or half-finished art:** no gate painting, a sheet with six or eight pieces, no agent painting (or `&noart=1`): the sync warns and goes on, the drawn gate, pieces and stand-ins draw, and a round plays to its tally with no errors; the box draws as a drawn box. Pinned in Task 9 (the sheet's naming refuses the wrong count) and Task 12 (a `&noart=1` round in the browser).

## Decisions taken for the owner (report these)

The design's decisions were reported with it. These are the plan's:

1. **The scripted floor is a "masher"**, not the design's idle player: with no clock, a player who never throws never ends a round. A masher throws the moment a throw can start, without aiming, and must land C GROUP.
2. At the gate he holds the scalpel **in his fist where the mallet's handle goes**, so his grip and the face rule carry over unchanged; the mallet is drawn leaning on the cart.
3. On a touch screen **a tap anywhere on the scene** (not on the pad) throws, and a second finger held down steadies, besides the pad's Run.
4. **The box's arc:** it leaves his far hand at 620 px/s ahead and 650 up under 1800 px/s² of gravity, so from standing it lands about 640 px ahead, a third of a laptop screen.
5. The box freezes with the lecture's frozen act, for its own 1.5 s with birds (the lecture keeps its 1.8 s); it freezes students too, which the lecture never does (it schools them).
6. The gate agent's crossing walks out from her podium to the map's middle and back, 0.7 s each way.
7. The bonus tags are 120 by 60, ASSIGNED SEATING white and BAG FEE orange; both name the city they sit on.
8. The Box button sits after Jump in the pad's action cluster with its count on it, and appears only while he has boxes.
9. The board, the tags and the crosshair are drawn by the game; the gate's walls are the owner's painting when it is in, and until then (or with `&noart=1`) the brainstorm mockup's drawn gate.

---

## File Structure

- `src/sim/quests/fares/board.ts` (create): `MAP`, `CityCode`, `CITY_CODES`, `HOME`, `CITY_UV`, `cityAt`, `POLYGON_UV`, `polygon`, `FareClass`, `TagKind`, `TAGS`, `PAD`, `endIn9`, `fareFor`, `classOf`, `pointsFor`.
- `src/sim/quests/fares/events.ts` (create): `CrowdKind`, `FaresEvent`.
- `src/sim/quests/fares/fares.ts` (create): `FARES`, `Traveler`, `TRAVELERS`, `Outcome`, `Tag`, `Booking`, `Shot`, `FaresGrade`, `FaresResult`, `FaresOptions`, `Fares`, `createFares`, `stepFares`, `crosshair`, `aimOf`, `addTag`, `tagRect`, `tagAt`, `groupOf`, `gradeOf`, `throwPressed`, `faresHint`, `skipFares`.
- `src/sim/quests/fares/drive.ts` (create): `Player`, `masherPlayer`, `personPlayer`, `sharpPlayer`, `playRound`.
- `src/sim/quests/quest.ts` (create): `QuestId`, `Quest`, `QUEST_NAMES`.
- `src/sim/samples.ts` (create): `SAMPLE`, `Sample`, `fireSample`, `stepSamples`.
- `src/sim/game.ts`, `events.ts`, `types.ts`, `hero.ts`, `run.ts`, `level.ts`, `levels/lobby.ts`, `input.ts`, `moves.ts`, `world.ts`, `cast.ts`, `cast-behavior.ts`, `feel.ts`, `quests/hungry/hungry.ts` (modify): the quest generalized, the shuttle door, the payout, the boxes.
- `src/sim/rig/actions.ts`, `src/sim/rig/cast.ts`, `src/sim/rig/face.ts` (modify): `throw`, `lob`, `castReaction`, `segmentClear`.
- `src/render/quests/gate-layout.ts`, `gate-board.ts`, `gate-scene.ts` (create); `frame.ts`, `diner.ts` (modify: `fitFrame`, a scale for `Diner`).
- `src/render/look.ts`, `hud.ts`, `sound.ts`, `props.ts`, `interp.ts`, `cast.ts`, `boards.ts`, `app.ts` (modify); `src/game/audio.ts` (`thunk`, `print`, `tweet`); `src/game/lines.ts` (`GATE_INSULTS`, `GATE_GLOATS`, `GATE_PISSED`, `SAMPLE_LINES`).
- `src/art/registry.ts` (`Registry.gate`, `GatePiece`, `GATE_PIECES`); `scripts/art-cut.mjs` (`nameGatePieces`), `scripts/art-sync.mjs` (`gate`, the agent), `scripts/art-grid.mjs` (`gate/room`, `gate/sheet`); `art/cuts/gate.json`, `art/cuts/cast-gate-agent.json` (create when the paintings are in).
- `src/components/next-game.tsx`, `next-veil.tsx`, `next-hud.tsx`, `next-start.tsx`, `next-touch.tsx`, `next-keys.ts`, `src/styles.css`, `src/routes/index.tsx` (modify); `scripts/start-art.mjs` (modify), `public/start/gate.webp` (create, committed).
- Tests: `scripts/fares.check.mjs` (create, in `test:next` after `banquet.check.mjs`), `scripts/fares-tune.mjs` (create), `scripts/fares-browser.check.mjs` (create); `scripts/banquet.check.mjs`, `rig.check.mjs`, `cast.check.mjs`, `art.check.mjs`, `render.check.mjs`, `next-start.check.mjs`, `look-boards.mjs` (modify).
- Docs: `README.md`, the R5 design (as built), `art/ART-REQUEST.md`, `docs/superpowers/handoff-<date>-r6.md`.
- The ledger: `.superpowers/sdd/2026-10-19-r5-fare-darts/progress.md` (git-ignored), every ruling with its cost if wrong, as in R4.

`scripts/fares.check.mjs` keeps its helpers at its top (Task 2, Step 1); later tasks add their imports beside the others and their tests below.

---

### Task 1: The handoff's cheap minors

**Files:**
- Modify: `src/sim/quests/hungry/hungry.ts` (`hungryHint`), `src/render/hud.ts` (`isNewBest`), `src/components/next-game.tsx`, `src/components/next-veil.tsx`
- Test: `scripts/banquet.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces: `isNewBest(score: number, before: number): boolean` in `src/render/hud.ts`; `VeilInfo.bestBefore: number` (the quest's best as it stood when the round's card showed).

- [ ] **Step 1: The failing tests**

In `scripts/banquet.check.mjs`:

```js
test("the hint warns of paper only while a plane is still coming, not while a missed one sails past", () => {
  const q = createHungry(1, { schedule: false, rivals: false, server: false });
  q.planes.push({ from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, d: 0, wait: 0, done: false, hit: false });
  assert.equal(hungryHint(q), "Paper incoming · ↓ ducks, H swats");
  q.planes[0].done = true;
  assert.notEqual(hungryHint(q), "Paper incoming · ↓ ducks, H swats");
});
```

In `scripts/render.check.mjs` (import `isNewBest` from `../src/render/hud.ts`):

```js
test("a tally says New best only when the score beats the best kept before the round, never on a tie", () => {
  assert.deepEqual([isNewBest(5000, 4000), isNewBest(5000, 5000), isNewBest(4000, 5000), isNewBest(0, 0)], [true, false, false, false]);
});
```

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/banquet.check.mjs scripts/render.check.mjs`
Expected: FAIL (the hint still warns; `isNewBest` is not exported).

- [ ] **Step 3: The fixes**

`hungryHint`: `q.planes.some((p) => !p.done)` in place of `q.planes.length`. `isNewBest(score, before) = score > before`. In `next-game.tsx`, keep `bestBefore` in state, set from the banquet's best each time the mode becomes `questCard`, and pass it in the veil's info; in `next-veil.tsx` the tally's `<dt>` reads `isNewBest(r.score, info.bestBefore) ? "New best" : "Best"`.

- [ ] **Step 4: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`, then `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/hungry-browser.check.mjs http://127.0.0.1:8090/`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/quests/hungry/hungry.ts src/render/hud.ts src/components/next-game.tsx src/components/next-veil.tsx scripts/banquet.check.mjs scripts/render.check.mjs
```

Message: "Two banquet leftovers: the paper warning goes once the plane has passed, and a tie with the best is not a New best". Push.

---

### Task 2: The route map, its cities and their fares

**Files:**
- Create: `src/sim/quests/fares/board.ts`, `scripts/fares.check.mjs`
- Modify: `package.json` (`test:next` adds `scripts/fares.check.mjs` after `scripts/banquet.check.mjs`)

**Interfaces:**
- Produces: `MAP = { w: 1080, h: 600 }`; `type CityCode` (the 23 codes of appendix C); `CITY_CODES: readonly CityCode[]` in appendix C's order (`SAT DAL HOU AUS OKC DEN SLC LAS PHX LAX OAK SMF SEA MCI STL MDW BNA MSY ATL MCO FLL BWI BOS`); `HOME: CityCode = "SAT"`; `CITY_UV: Record<CityCode, Point>` (appendix C, 0 to 1); `cityAt(c: CityCode): Point` (map px: `uv × MAP`); `POLYGON_UV: readonly Point[]` (appendix C's 30 points in order); `polygon(): Point[]` (map px); `type FareClass = "wga" | "anytime" | "business"`; `type TagKind = "fare" | "seating" | "fee"`; `TAGS: Record<FareClass | "seating" | "fee", { w: number; h: number; color: number }>` (wga 90×50 `0xffbf27`, anytime 120×60 `0xc8102e`, business 150×70 `0x304cb2`, seating 120×60 `0xffffff`, fee 120×60 `0xf28c28`); `PAD = 2`; `endIn9(n: number): number`; `fareFor(c: CityCode, flash: boolean): number`; `classOf(fare: number): FareClass`; `pointsFor(cls: FareClass, fare: number): number`.

- [ ] **Step 1: The failing tests** (create `scripts/fares.check.mjs` with its helpers)

```js
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { MAP, CITY_CODES, cityAt, polygon, TAGS, endIn9, fareFor, classOf, pointsFor } from "../src/sim/quests/fares/board.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const near = (a, b, what, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not ${b}`);

test("the map: 23 cities in a 1080 by 600 rectangle, San Antonio at (493.6, 481.8), the cartoon US's 30 points", () => {
  assert.deepEqual([MAP.w, MAP.h, CITY_CODES.length, polygon().length], [1080, 600, 23, 30]);
  near(cityAt("SAT").x, 493.56, "SAT x");
  near(cityAt("SAT").y, 481.8, "SAT y");
  for (const c of CITY_CODES) assert.ok(cityAt(c).x > 0 && cityAt(c).x < MAP.w && cityAt(c).y > 0 && cityAt(c).y < MAP.h, c);
});

test("fares by the design's formula: Austin, Houston, Dallas and New Orleans Wanna Get Away, Seattle and Boston Business Select; a flash sale halves", () => {
  assert.deepEqual(["AUS", "HOU", "DAL", "MSY", "OKC", "PHX", "DEN", "SLC", "BWI", "BOS", "SEA"].map((c) => fareFor(c, false)), [49, 59, 79, 79, 109, 119, 159, 179, 189, 229, 249]);
  assert.deepEqual(["AUS", "DAL", "OKC", "SLC", "BOS", "SEA"].map((c) => fareFor(c, true)), [49, 49, 59, 99, 119, 129]);
  for (const c of CITY_CODES.filter((c) => c !== "SAT"))
    for (const flash of [false, true]) {
      const f = fareFor(c, flash);
      assert.ok(f >= 49 && f <= 249 && f % 10 === 9, `${c} ${flash}: ${f}`);
    }
  assert.deepEqual(CITY_CODES.filter((c) => c !== "SAT" && classOf(fareFor(c, false)) === "wga"), ["DAL", "HOU", "AUS", "MSY"]);
  assert.deepEqual(CITY_CODES.filter((c) => classOf(fareFor(c, false)) === "business"), ["SEA", "BOS"]);
  assert.deepEqual([endIn9(48), endIn9(49), endIn9(54), endIn9(140), endIn9(221)], [49, 49, 59, 149, 229]);
});

test("classes, tags and points: $49 pays 402 and $79 pays 342 Wanna Get Away; Anytime 150; Business Select 60", () => {
  assert.deepEqual([classOf(99), classOf(100), classOf(199), classOf(200)], ["wga", "anytime", "anytime", "business"]);
  assert.deepEqual([pointsFor("wga", 49), pointsFor("wga", 79), pointsFor("anytime", 149), pointsFor("business", 229)], [402, 342, 150, 60]);
  assert.deepEqual([TAGS.wga.w, TAGS.wga.h, TAGS.anytime.w, TAGS.anytime.h, TAGS.business.w, TAGS.business.h], [90, 50, 120, 60, 150, 70]);
});
```

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/fares.check.mjs`
Expected: FAIL (cannot find `board.ts`).

- [ ] **Step 3: `board.ts`**

`endIn9(n) = Math.ceil((n + 1) / 10) * 10 - 1`. `fareFor`: `d` is the distance between the city's and SAT's `CITY_UV` points; `full = clamp(endIn9(39 + Math.round(d * 260)))`; a flash sale is `clamp(endIn9(Math.round(full / 2)))`; `clamp` keeps 49 to 249. `classOf`: under 100 `wga`, under 200 `anytime`, else `business`. `pointsFor`: `wga` `300 + (100 - fare) * 2`, `anytime` 150, `business` 60.

- [ ] **Step 4: Run them**

Run: `npm run test:next`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/quests/fares/board.ts scripts/fares.check.mjs package.json
```

Message: "Fare Darts' route map: the cartoon US, its 23 cities and their fares from San Antonio". Push.

---

### Task 3: The round: the crosshair, the steady hand, the tags, the throw, the ladder and the grade

**Files:**
- Create: `src/sim/quests/fares/events.ts`, `src/sim/quests/fares/fares.ts`
- Test: `scripts/fares.check.mjs` (append)

**Interfaces:**
- Consumes: Task 2's `board.ts`.
- Produces:
  - `FARES` (all the round's numbers): `throws: 10`; `aim: { w: 1.4, rise: 1.08, ratio: 1.618, phase: 0.7, ax: 540, ay: 300 }`; `steady: { factor: 0.35, budget: 2.5, refill: 0.2 }`; `tags: { every: 0.9, max: 4, life: 2.6, flicker: 0.6, flash: 0.2 }`; `windup: 0.3`, `flight: 0.22`, `end: 1`; `ladder: { start: 179, book: 20, streak: 30, miss: 60 }`; `streak: 3`; `cloud: { after: [2, 6], t: 3 }`; `stop: { t: 2, cost: 200, from: 2, to: 8 }`; `agent: { t: 1.4, from: 4, to: 8, band: 160, w: 150 }`; `seating: { points: 500, life: 1.6, from: 5, to: 9 }`; `fee: { points: 300 }`; `mouth: { every: 6, streak: 3, again: 1.2, angry: 2, bubble: 1.4 }`.
  - `type Traveler = "office" | "student" | "prof" | "nurse"`; `TRAVELERS: readonly Traveler[]`.
  - `type Outcome = "book" | "miss" | "cloud" | "stop" | "agent"`.
  - `type Tag = { id: number; city: CityCode; kind: TagKind; fare: number; flash: boolean; t: number; life: number; stopped: number }` (`t` seconds alive; `stopped` seconds left of a ground stop's X).
  - `type Booking = { city: CityCode; kind: TagKind; cls: FareClass | null; fare: number; points: number; companion: boolean; position: number }` (`position` his boarding position after it; `cls` null for the bonus tags).
  - `type Shot = { at: Point; t: number; phase: "windup" | "flight"; outcome: Outcome; tag: Tag | null }`.
  - `type FaresGrade = "A-LIST PREFERRED" | "A-LIST" | "B GROUP" | "C GROUP"`.
  - `type FaresResult = { score: number; grade: FaresGrade; bookings: Booking[]; booked: number; wga: number; companions: number; seating: boolean; fee: boolean; cancelled: number; misses: number; bestStreak: number; preferred: boolean; boxes: number; cans: number; nuts: boolean; lives: number }`.
  - `type FaresOptions = { practice?: boolean; tags?: boolean; hazards?: boolean; mouth?: boolean }` (`false` turns off the tags spawning on their own, the cloud, stop, agent and bonus tags, and the insults on their own). They land in the round as the live switches `spawning`, `hazards` and `mouth`, which a test may flip on a round the door made.
  - `type Fares = { id: "fares"; rng: () => number; practice: boolean; spawning: boolean; hazards: boolean; mouth: boolean; time: number; theta: number; w: number; steady: number; thrown: number; stuck: number; shot: Shot | null; stuckAt: Point[]; tags: Tag[]; nextId: number; position: number; streak: number; bestStreak: number; preferred: boolean; score: number; bookings: Booking[]; misses: number; cancelled: number; cloud: { third: 0 | 1 | 2; t: number } | null; agent: { t: number } | null; pin: Point | null; said: Set<string>; events: FaresEvent[]; result: FaresResult | null }` plus whatever private bookkeeping the builder needs (spawn timer, hazard schedule, mouth timers).
  - `createFares(seed: number, opts?: FaresOptions): Fares`; `stepFares(q: Fares, input: Input, dt: number): void` (clears `q.events` first).
  - `crosshair(theta: number): Point` (`{ x: 540 + 540 sin θ, y: 300 + 300 sin(1.618 θ + 0.7) }`); `aimOf(q: Fares): Point` (`q.pin ?? crosshair(q.theta)`: `pin` is the tests' and the dev hook's held crosshair).
  - Tags spawning on their own (when on): the first at 0.9 s, then every 0.9 s while fewer than four fare tags are live.
  - `addTag(q: Fares, city: CityCode, kind?: TagKind, flash?: boolean): Tag` (replacing a live tag on the same city); `tagRect(t: Tag): Rect` (centered on the city, its class's or kind's size, `PAD` all round); `tagAt(q: Fares, p: Point): Tag | null` (of the live tags whose rect holds `p`, the one whose city is nearest `p`).
  - `groupOf(position: number): string` (0 `"A1"`, 59 `"A60"`, 60 `"B1"`, 179 `"C60"`); `gradeOf(booked: number, preferred: boolean): FaresGrade`; `throwPressed(input: Input): boolean` (a press edge of jump, fire, hammer or super); `faresHint(q: Fares): string`; `skipFares(q: Fares): void` (the dev hook's: the rest of the tray goes as misses and the end's beat runs).
  - `events.ts`: `type CrowdKind = "ooh" | "laugh" | "clap"` and

```ts
export type FaresEvent =
  | { type: "fdTag"; id: number; city: CityCode; kind: TagKind; fare: number; flash: boolean }
  | { type: "fdTagGone"; id: number }
  /** The press: the throw clip starts; `at` is where it will land. */
  | { type: "fdThrow"; at: Point }
  /** The whip's end: the scalpel leaves his hand. */
  | { type: "fdRelease"; at: Point }
  | { type: "fdStick"; at: Point; outcome: Outcome; booking: Booking | null; points: number; tag: number | null }
  | { type: "fdLadder"; from: number; to: number }
  | { type: "fdPreferred" }
  | { type: "fdCloud"; third: 0 | 1 | 2; on: boolean }
  | { type: "fdStop"; tag: number; on: boolean }
  | { type: "fdAgent"; on: boolean }
  /** An insult at a traveler or the agent: the scene picks his line from GATE_INSULTS, GATE_GLOATS or GATE_PISSED. */
  | { type: "fdInsult"; at: Traveler | "agent"; mood: "calm" | "gloat" | "pissed" }
  | { type: "fdCrowd"; kind: CrowdKind; who: Traveler[] }
  /** His face: smug through a streak, angry after a miss; null back to neutral. */
  | { type: "fdMood"; mood: "smug" | "angry" | null; seconds: number }
  | { type: "fdThink"; text: string; seconds: number }
  | { type: "fdSay"; who: Traveler | "agent"; text: string; seconds: number }
  | { type: "fdEnd"; score: number; grade: string };
```

- [ ] **Step 1: The failing tests** (append; add the imports beside the others)

```js
import { FARES, TRAVELERS, createFares, stepFares, crosshair, aimOf, addTag, tagRect, tagAt, groupOf, gradeOf } from "../src/sim/quests/fares/fares.ts";

/** A round with nothing on its own: no tags, hazards or insults unless a test adds them. */
const quiet = (seed = 1, o = {}) => createFares(seed, { practice: true, tags: false, hazards: false, mouth: false, ...o });
const stepsF = (q, seconds, held = {}) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    stepFares(q, input(held), STEP);
    out.push(...q.events);
  }
  return out;
};
/** Holds the crosshair on `p` (a city or a map point), presses Space once and waits for the scalpel to stick. */
const throwAt = (q, p) => {
  q.pin = typeof p === "string" ? cityAt(p) : p;
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  const out = [...q.events];
  out.push(...stepsF(q, FARES.windup + FARES.flight + STEP));
  return out;
};
const OCEAN = { x: 20, y: 580 };

// Measured along the path, so the tuning's speed does not move it: a minute and a tag's life at the design's 1.4 rad/s.
test("the crosshair's figure never closes: along its path every city's smallest tag is crossed within a minute's worth, and during a tag's life's worth at least one time in seven", () => {
  const d = 1.4 / 120;
  const minute = 60 * 1.4, life = FARES.tags.life * 1.4;
  for (const c of CITY_CODES.filter((c) => c !== "SAT")) {
    const p = cityAt(c);
    const hits = [];
    for (let th = 0; th < 1200; th += d) {
      const a = crosshair(th);
      if (Math.abs(a.x - p.x) <= 47 && Math.abs(a.y - p.y) <= 27) hits.push(th);
    }
    const gaps = [hits[0], ...hits.slice(1).map((t, i) => t - hits[i])];
    assert.ok(Math.max(...gaps) <= minute, `${c}: a stretch of ${Math.max(...gaps).toFixed(1)} rad`);
    let ok = 0, n = 0;
    for (let t0 = 0; t0 < 1200 - life; t0 += 0.35, n++) if (hits.some((t) => t >= t0 && t <= t0 + life)) ok++;
    assert.ok(ok / n >= 1 / 7, `${c}: crossed in ${(100 * ok / n).toFixed(0)}% of a tag's lives`);
  }
});

test("the crosshair moves smoothly and the same way every round; each throw speeds it 8 percent", () => {
  const a = quiet(3), b = quiet(3);
  stepsF(a, 2); stepsF(b, 2);
  assert.equal(a.theta, b.theta);
  near(a.theta, FARES.aim.w * 2, "theta", 1e-6);
  const q = quiet(4);
  let last = aimOf(q), worst = 0;
  for (let k = 0; k < 10; k++) {
    throwAt(q, OCEAN);
    q.pin = null;
    for (let i = 0; i < 60; i++) {
      stepFares(q, input(), STEP);
      const p = aimOf(q);
      worst = Math.max(worst, Math.hypot(p.x - last.x, p.y - last.y));
      last = p;
    }
  }
  assert.ok(worst < 20, `a jump of ${worst} px`);
  near(quiet(5).w, 1.4, "w");
});

test("the steady hand: Run slows the sweep to 0.35 while its 2.5 s drain; empty, it slows nothing; a booking gives back 0.2", () => {
  const q = quiet();
  stepsF(q, 1, { run: true });
  near(q.theta, FARES.aim.w * FARES.steady.factor, "slowed", 1e-6);
  near(q.steady, 1.5, "drained", 1e-6);
  stepsF(q, 2, { run: true });
  assert.equal(q.steady, 0);
  const t = q.theta;
  stepsF(q, 1, { run: true });
  near(q.theta - t, FARES.aim.w, "no longer slowed", 1e-6);
  addTag(q, "DAL");
  throwAt(q, "DAL");
  near(q.steady, 0.2, "refilled", 1e-9);
});

test("tags: one every 0.9 s on an untagged city, never San Antonio, four at most, each 2.6 s; about a fifth are flash sales", () => {
  const q = createFares(7, { practice: true, hazards: false, mouth: false });
  const evs = stepsF(q, 0.9 + STEP);
  assert.equal(of(evs, "fdTag").length, 1);
  let flash = 0, total = 0;
  for (let i = 0; i < 400 / STEP; i++) {
    stepFares(q, input(), STEP);
    for (const e of of(q.events, "fdTag")) {
      total++;
      if (e.flash) flash++;
      assert.notEqual(e.city, "SAT");
    }
    assert.ok(q.tags.filter((t) => t.kind === "fare").length <= 4);
    assert.equal(new Set(q.tags.map((t) => t.city)).size, q.tags.length, "one tag a city");
    for (const t of q.tags) assert.ok(t.t <= t.life + STEP);
  }
  assert.ok(flash / total > 0.12 && flash / total < 0.28, `${flash} of ${total}`);
});

test("a throw at a live tag books it at the press, even if the tag runs out while the scalpel flies; elsewhere it misses", () => {
  const q = quiet();
  const tag = addTag(q, "DAL");
  q.pin = cityAt("DAL");
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  assert.equal(of(q.events, "fdThrow").length, 1);
  tag.life = tag.t + 0.05;
  const evs = stepsF(q, FARES.windup + FARES.flight + STEP);
  const stick = of(evs, "fdStick")[0];
  assert.deepEqual([stick.outcome, stick.points, q.score, q.bookings.length, q.position], ["book", 342, 342, 1, 159]);
  assert.equal(of(evs, "fdRelease").length, 1);
  const miss = throwAt(q, OCEAN);
  assert.equal(of(miss, "fdStick")[0].outcome, "miss");
  assert.deepEqual([q.misses, q.streak, q.position], [1, 0, 179]);
  assert.ok(of(miss, "fdThink").some((e) => e.text === "That's a $400 demo unit."));
});

test("where two tags overlap, the one whose city is nearest the point books; a tag's rect is centered on its city with a 2 px pad", () => {
  const q = quiet();
  addTag(q, "AUS");
  addTag(q, "HOU");
  const r = tagRect(q.tags[0]);
  assert.deepEqual([r.w, r.h], [94, 54]);
  near(r.x + r.w / 2, cityAt("AUS").x, "centered");
  const p = { x: cityAt("AUS").x + 5, y: cityAt("AUS").y + 20 };
  assert.equal(tagAt(q, p).city, "AUS");
  const h = { x: cityAt("HOU").x - 20, y: cityAt("HOU").y - 5 };
  assert.equal(tagAt(q, h).city, "HOU");
});

test("a city booked twice is a Companion Pass: double, and his thought", () => {
  const q = quiet();
  addTag(q, "DAL");
  throwAt(q, "DAL");
  addTag(q, "DAL");
  const evs = throwAt(q, "DAL");
  const b = of(evs, "fdStick")[0].booking;
  assert.deepEqual([b.points, b.companion], [684, true]);
  assert.ok(of(evs, "fdThink").some((e) => e.text === "Companion Pass? I fly alone."));
});

test("a held key never throws twice; presses during a windup or a flight are dropped; ten scalpels, then a beat, then the result once", () => {
  const q = quiet();
  q.pin = OCEAN;
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  stepsF(q, 1, { jump: true });
  assert.equal(q.thrown, 1, "held");
  stepFares(q, input({ fire: true }, { fire: true }), STEP);
  assert.equal(q.thrown, 2, "a new press after it stuck");
  stepFares(q, input({ hammer: true }, { hammer: true }), STEP);
  assert.equal(q.thrown, 2, "dropped mid-windup");
  while (q.thrown < 10) throwAt(q, OCEAN);
  throwAt(q, OCEAN);
  assert.deepEqual([q.thrown, q.stuck], [10, 10], "no eleventh");
  assert.equal(q.result, null, "the beat");
  const evs = stepsF(q, FARES.end + STEP);
  assert.equal(of(evs, "fdEnd").length, 1);
  assert.equal(q.result.grade, "C GROUP");
  assert.equal(of(stepsF(q, 2), "fdEnd").length, 0, "once");
});

test("the ladder: up 20, 30 from the third booking in a row; seven in a row reach A1; a miss drops 60, never past C60", () => {
  const q = quiet();
  const seen = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, i % 2 ? "HOU" : "AUS");
    throwAt(q, i % 2 ? "HOU" : "AUS");
    seen.push(q.position);
  }
  assert.deepEqual(seen, [159, 139, 109, 79, 49, 19, 0]);
  assert.equal(q.preferred, true);
  assert.deepEqual([groupOf(0), groupOf(15), groupOf(59), groupOf(60), groupOf(72), groupOf(179)], ["A1", "A16", "A60", "B1", "B13", "C60"]);
  const s = quiet();
  for (let i = 0; i < 6; i++) {
    addTag(s, "AUS");
    throwAt(s, "AUS");
  }
  assert.equal(s.position, 19, "six are not enough");
  throwAt(s, OCEAN);
  assert.deepEqual([s.position, s.streak], [79, 0]);
});

test("A1 once: the rest of the tray scores double, stacking with a Companion Pass; the agent's line and a boom-worthy event, once", () => {
  const q = quiet();
  const evs = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, "AUS");
    evs.push(...throwAt(q, "AUS"));
  }
  assert.equal(of(evs, "fdPreferred").length, 1);
  assert.ok(of(evs, "fdSay").some((e) => e.who === "agent" && e.text === "Now boarding... just Mr. Hammer."));
  addTag(q, "DAL");
  assert.equal(of(throwAt(q, "DAL"), "fdStick")[0].points, 684);
  addTag(q, "DAL");
  assert.equal(of(throwAt(q, "DAL"), "fdStick")[0].points, 1368);
});

test("the grades and the prize: boxes per booking, three cans per Wanna Get Away, a smash from B GROUP, a life at A1", () => {
  assert.deepEqual([gradeOf(2, true), gradeOf(7, false), gradeOf(6, false), gradeOf(4, false), gradeOf(3, false)], ["A-LIST PREFERRED", "A-LIST", "B GROUP", "B GROUP", "C GROUP"]);
  const q = quiet();
  for (const c of ["DAL", "OKC", "BOS", "AUS"]) {
    addTag(q, c);
    throwAt(q, c);
  }
  for (let i = 0; i < 6; i++) throwAt(q, OCEAN);
  stepsF(q, FARES.end + STEP);
  const r = q.result;
  assert.deepEqual([r.booked, r.boxes, r.wga, r.cans, r.nuts, r.lives, r.grade], [4, 4, 2, 6, true, 0, "B GROUP"]);
});

test("his lines on the way: leaving group C, passing A16, a third booking in a row, Business Select; each once a round", () => {
  const q = quiet();
  const evs = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, "AUS");
    evs.push(...throwAt(q, "AUS"));
  }
  const thoughts = of(evs, "fdThink").map((e) => e.text);
  for (const line of ["I don't do group C.", "A16. Right where I belong.", "Rapid Rewards. Rapidly."]) assert.equal(thoughts.filter((t) => t === line).length, 1, line);
  addTag(q, "BOS");
  assert.ok(of(throwAt(q, "BOS"), "fdThink").some((e) => e.text === "I don't PAY Business Select. I AM business select."));
});
```

(Add `cityAt` and `CITY_CODES` to the board import if they are not there.)

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/fares.check.mjs`
Expected: FAIL (cannot find `fares.ts`).

- [ ] **Step 3: `events.ts` and `fares.ts`**

The round, each step: θ advances by `w × (steadied ? 0.35 : 1) × dt` (steadied while Run is held and the meter is above 0; the meter drains by `dt` while it slows); tags age, spawn (when on) and go (`fdTagGone`); a shot's windup runs 0.3 s then `fdRelease` and its flight 0.22 s, then it sticks (`fdStick`) and the outcome decided at the press is applied: a booking scores `pointsFor` (or the bonus tag's points) × 2 for a Companion Pass × 2 once A1 is reached, refills the meter, moves the ladder (`fdLadder`) and the streak; a miss counts, resets the streak and drops the ladder; `w *= rise` after each stick. A press (`throwPressed`) starts a shot only when none is in the air and fewer than ten have been thrown; it records the point (`aimOf`) and its outcome then. After the tenth sticks, `FARES.end` later the result is made once (`fdEnd`). The rng is `seededRandom` from `src/sim/rewards.ts`.

- [ ] **Step 4: Run them**

Run: `npm run test:next`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/quests/fares/events.ts src/sim/quests/fares/fares.ts scripts/fares.check.mjs
```

Message: "Fare Darts' round: a crosshair whose loop never closes, the steady hand, fare tags, ten scalpels, Companion Passes, the A-List ladder and the grade". Push.

---

### Task 4: The hazards, his mouth and the crowd

**Files:**
- Modify: `src/sim/quests/fares/fares.ts`
- Test: `scripts/fares.check.mjs` (append)

**Interfaces:**
- Consumes: Task 3.
- Produces: the cloud, the ground stop, the agent's crossing and the bonus tags scheduled by throw (each hazard begins after a given scalpel has stuck, 0 to 0.8 s later, `rng`): the cloud after the 2nd and the 6th; the stop once after the k−1th for a k in 2..8 (on a live fare tag, waiting for one); the agent once for a k in 4..8, her box `FARES.agent.w` wide over the map's lowest 160 px, its middle from `MAP.w + 75` to `MAP.w / 2` and back, 0.7 s each way; ASSIGNED SEATING once for a k in 5..9 (life 1.6 s); BAG FEE once for a k in 1..10. The mouth: `fdInsult` on its own every `6 × (0.85 + 0.3 rng)` s (3 on a streak) while no shot is in the air, aimed at a random traveler or, one time in six, the agent, each followed by the target's reply (`fdSay`, from the sim's own reply lists: the design's §7 answers; the agent's "Sir, please."); E (`input.pressed.lecture`) one at once unless a shot is in the air or the last insult is under 1.2 s old; a booking `fdCrowd ooh` with one or two travelers (all four on a streak booking) and their lines ("Ooh!", "Ahh!", "Nice!"; "OOOOH!" on a streak); A1 `fdCrowd clap` with all four; a miss `fdMood angry 2`, `fdCrowd laugh` with one to three travelers ("HA!", "Ha ha ha!", "Nice throw, grandpa."), then two `fdInsult pissed`, the first at once at one who laughed, the second 1.2 s later; a streak's start `fdMood smug` and its end `fdMood null`; at most two travelers' `fdSay` open at once (each 1.4 s); the hazards' lines ("Denver. Of course.", the agent's "Sir, that flight is cancelled." and "Sir, you can't do that here.", "BRING BACK OPEN SEATING.", "Bags used to fly FREE."). `faresHint` (R5 §12): "Storm over the map · wait it out" under a cloud, "Cancelled flight · don't hit the X" during a stop, "A-LIST PREFERRED · every scalpel counts double" once A1 is reached, else "Space throws · hold Shift to steady your hand · E mouths off".

- [ ] **Step 1: The failing tests** (append; add `faresHint` to the import)

```js
/** Throws at the bare map every `gap` seconds, recording how many had stuck when each hazard came. */
const patient = (seed, gap = 2) => {
  const q = createFares(seed, { practice: true, mouth: false });
  const at = { cloud: [], stop: [], agent: [], seating: [], fee: [] };
  for (let s = 0; s < 400 / STEP && !q.result; s++) {
    const press = q.shot === null && s % Math.round(gap / STEP) === 0;
    q.pin = OCEAN;
    stepFares(q, press ? input({ jump: true }, { jump: true }) : input(), STEP);
    for (const e of q.events) {
      if (e.type === "fdCloud" && e.on) at.cloud.push(q.stuck);
      if (e.type === "fdStop" && e.on) at.stop.push(q.stuck);
      if (e.type === "fdAgent" && e.on) at.agent.push(q.stuck);
      if (e.type === "fdTag" && e.kind !== "fare") at[e.kind].push(q.stuck);
    }
  }
  return at;
};

test("the hazards come in their windows: the cloud after the 2nd and 6th, the stop once in 2..8, the agent once in 4..8, ASSIGNED SEATING once in 5..9, BAG FEE once", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const at = patient(seed);
    assert.deepEqual(at.cloud, [2, 6], `seed ${seed} cloud`);
    assert.ok(at.stop.length === 1 && at.stop[0] >= 1 && at.stop[0] <= 7, `seed ${seed} stop ${at.stop}`);
    assert.ok(at.agent.length === 1 && at.agent[0] >= 3 && at.agent[0] <= 7, `seed ${seed} agent ${at.agent}`);
    assert.ok(at.seating.length === 1 && at.seating[0] >= 4 && at.seating[0] <= 8, `seed ${seed} seating ${at.seating}`);
    assert.equal(at.fee.length, 1, `seed ${seed} fee`);
  }
});

test("under the cloud a tag can't be booked: the scalpel sticks, no points, a miss, and Denver", () => {
  const q = quiet();
  addTag(q, "DEN");
  q.cloud = { third: 1, t: 0 }; // the middle third, 360 to 720: Denver is at 373
  const evs = throwAt(q, "DEN");
  assert.deepEqual([of(evs, "fdStick")[0].outcome, q.score, q.misses], ["cloud", 0, 1]);
  assert.ok(of(evs, "fdThink").some((e) => e.text === "Denver. Of course."));
  assert.equal(faresHint(q), "Storm over the map · wait it out");
});

test("the cancelled flight costs 200 and is a miss; the agent's clipboard eats a scalpel; the bonus tags pay and are bookings", () => {
  const q = quiet();
  const t = addTag(q, "OKC");
  t.stopped = 2;
  assert.equal(faresHint(q), "Cancelled flight · don't hit the X");
  const stop = throwAt(q, "OKC");
  assert.deepEqual([of(stop, "fdStick")[0].outcome, q.score, q.cancelled, q.misses], ["stop", -200, 1, 1]);
  assert.ok(of(stop, "fdSay").some((e) => e.who === "agent" && e.text === "Sir, that flight is cancelled."));
  q.agent = { t: 0.7 };
  const clip = throwAt(q, { x: MAP.w / 2 + 10, y: MAP.h - 40 });
  assert.equal(of(clip, "fdStick")[0].outcome, "agent");
  assert.ok(of(clip, "fdSay").some((e) => e.text === "Sir, you can't do that here."));
  addTag(q, "MDW", "seating");
  const seat = throwAt(q, "MDW");
  assert.deepEqual([of(seat, "fdStick")[0].outcome, of(seat, "fdStick")[0].points, q.bookings.length], ["book", 500, 1]);
  assert.ok(of(seat, "fdThink").some((e) => e.text === "BRING BACK OPEN SEATING."));
  addTag(q, "STL", "fee");
  const fee = throwAt(q, "STL");
  assert.equal(of(fee, "fdStick")[0].points, 300);
  assert.ok(of(fee, "fdThink").some((e) => e.text === "Bags used to fly FREE."));
});

test("his mouth: an insult about every 6 s on its own, about every 3 on a streak, each answered", () => {
  const q = quiet(2, { mouth: true });
  const times = [];
  let answered = 0;
  for (let i = 0; i < 40 / STEP; i++) {
    stepFares(q, input(), STEP);
    if (of(q.events, "fdInsult").length) times.push(q.time);
    answered += of(q.events, "fdSay").length;
  }
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.ok(gaps.length >= 4 && gaps.every((g) => g >= 5 && g <= 7), `${gaps}`);
  assert.ok(answered >= times.length - 1, "answered");
  const s = quiet(3, { mouth: true });
  for (let i = 0; i < 3; i++) {
    addTag(s, "AUS");
    throwAt(s, "AUS");
  }
  const streak = [];
  for (let i = 0; i < 20 / STEP; i++) {
    stepFares(s, input(), STEP);
    if (of(s.events, "fdInsult").length) streak.push(s.time);
  }
  const sg = streak.slice(1).map((t, i) => t - streak[i]);
  assert.ok(sg.length >= 4 && sg.every((g) => g >= 2.5 && g <= 3.5), `${sg}`);
});

test("E mouths off at once, but not while a scalpel is in the air, nor over the last insult's bubble", () => {
  const q = quiet(5);
  stepsF(q, 0.5);
  stepFares(q, input({ lecture: true }, { lecture: true }), STEP);
  assert.equal(of(q.events, "fdInsult").length, 1, "E");
  stepFares(q, input({ lecture: true }, { lecture: true }), STEP);
  assert.equal(of(q.events, "fdInsult").length, 0, "the bubble is still up");
  q.pin = OCEAN;
  stepsF(q, 1.3);
  stepFares(q, input({ jump: true }, { jump: true }), STEP);
  stepFares(q, input({ lecture: true }, { lecture: true }), STEP);
  assert.equal(of(q.events, "fdInsult").length, 0, "not mid-throw");
});

test("a miss: angry for 2 s, the crowd laughs, and he doubles down with two insults, the first at one who laughed", () => {
  const q = quiet(3, { mouth: true });
  stepsF(q, 1.5);
  const evs = throwAt(q, OCEAN);
  evs.push(...stepsF(q, 1.4));
  const mood = of(evs, "fdMood").find((e) => e.mood === "angry");
  assert.ok(mood && mood.seconds === 2);
  const laugh = of(evs, "fdCrowd").find((e) => e.kind === "laugh");
  assert.ok(laugh && laugh.who.length >= 1 && laugh.who.length <= 3);
  const pissed = of(evs, "fdInsult").filter((e) => e.mood === "pissed");
  assert.equal(pissed.length, 2);
  assert.ok(laugh.who.includes(pissed[0].at));
});

test("the crowd: one or two ooh at a booking, all four on a streak, all clap at A1; never more than two travelers talking at once", () => {
  const q = quiet(4, { mouth: true });
  const evs = [];
  for (let i = 0; i < 7; i++) {
    addTag(q, "AUS");
    evs.push(...throwAt(q, "AUS"));
  }
  const ooh = of(evs, "fdCrowd").filter((e) => e.kind === "ooh");
  assert.ok(ooh[0].who.length >= 1 && ooh[0].who.length <= 2);
  assert.equal(ooh[ooh.length - 1].who.length, TRAVELERS.length);
  assert.ok(of(evs, "fdCrowd").some((e) => e.kind === "clap" && e.who.length === 4));
  assert.ok(of(evs, "fdMood").some((e) => e.mood === "smug"));
});

test("never more than two travelers talking at once, whatever the crowd does", () => {
  const q = quiet(9, { mouth: true });
  const ends = [];
  let worst = 0;
  for (let i = 0; i < 30 / STEP; i++) {
    if (i % 60 === 0) addTag(q, i % 120 ? "AUS" : "HOU");
    q.pin = i % 240 < 120 ? cityAt(i % 120 ? "AUS" : "HOU") : OCEAN;
    stepFares(q, i % 60 === 1 ? input({ jump: true }, { jump: true }) : input(), STEP);
    for (const e of of(q.events, "fdSay")) if (e.who !== "agent") ends.push(q.time + e.seconds);
    worst = Math.max(worst, ends.filter((end) => end > q.time).length);
  }
  assert.ok(worst <= 2, `${worst} talking at once`);
});
```

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/fares.check.mjs`
Expected: FAIL (no hazards, mouth or crowd yet).

- [ ] **Step 3: The hazards, the mouth and the crowd** (in `fares.ts`, per this task's Interfaces; the travelers' replies and crowd lines live in the sim beside the round, as the banquet's diners' do)

- [ ] **Step 4: Run them**

Run: `npm run test:next`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/quests/fares/fares.ts scripts/fares.check.mjs
```

Message: "Fare Darts fights back: the storm cloud, the cancelled flight, the agent's clipboard and the bonus tags; Hammer mouths off at the gate, a miss makes him pissed, and the travelers ooh and laugh". Push.

---

### Task 5: The scripted players and the tuning

**Files:**
- Create: `src/sim/quests/fares/drive.ts`, `scripts/fares-tune.mjs`
- Modify: `src/sim/quests/fares/fares.ts` (`FARES.aim.w`, `.rise`, `.ratio`, `FARES.steady.factor`, `.budget`: only these, and only to the values the tuning finds)
- Test: `scripts/fares.check.mjs` (append)

**Interfaces:**
- Consumes: Tasks 3 and 4.
- Produces: `type Player = (q: Fares) => Input`; `masherPlayer: Player` (presses Space whenever no shot is in the air, never steadies); `personPlayer(seed: number): Player` (picks a live tag the crosshair's next pass will cross before it runs out, reading the path ahead with `crosshair`; holds Run from 0.25 s before the pass while the meter lasts; presses within ±50 ms, from its own `seededRandom(seed)`, of the moment the crosshair is over the tag's middle); `sharpPlayer(): Player` (presses exactly when the crosshair is over a Wanna Get Away tag, holding Run from the moment one is within 120 px of it; after 60 s with no such chance, any tag); `playRound(seed: number, player: Player, cap = 900): FaresResult` (a practice round with everything on, stepped until its result; past `cap` seconds the player's next presses go at once).
- `scripts/fares-tune.mjs` prints `{ masher: { booked: number[]; median }, person: { booked: number[]; median }, sharp: { preferred: number /* of 10 */, booked: number[] } }` over seeds 1 to 10.

- [ ] **Step 1: The failing test** (append; import from `drive.ts`)

```js
import { masherPlayer, personPlayer, sharpPlayer, playRound } from "../src/sim/quests/fares/drive.ts";

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

test("the grade lines hold over ten seeds: a masher lands C GROUP, a person books four to six, a sharp player reaches A1 in seven or more", () => {
  const seeds = [...Array(10).keys()].map((i) => i + 1);
  const masher = seeds.map((s) => playRound(s, masherPlayer));
  assert.ok(masher.every((r) => r.grade === "C GROUP"), `${masher.map((r) => r.booked)}`);
  const person = seeds.map((s) => playRound(s, personPlayer(s)).booked);
  assert.ok(median(person) >= 4 && median(person) <= 6, `person ${person}`);
  const sharp = seeds.map((s) => playRound(s, sharpPlayer()));
  assert.ok(sharp.filter((r) => r.preferred).length >= 7, `sharp ${sharp.map((r) => r.booked)}`);
});
```

- [ ] **Step 2: Run it**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/fares.check.mjs`
Expected: FAIL (cannot find `drive.ts`).

- [ ] **Step 3: The players and the tuning script** (per the Interfaces)

- [ ] **Step 4: Tune**

Run: `node --loader ./scripts/game-test-loader.mjs scripts/fares-tune.mjs`
Move only the five numbers in this task's Files until the targets hold (a slower start widens a crossing and narrows the share of tags crossed in their lives; a smaller rise keeps the last throws fair; a stronger steady hand favors the person over the masher). Write each try and the final numbers in the ledger. If the 1.618 has to move, Task 3's coverage test must still pass.
Expected: the targets hold, and Task 3's tests still pass with the tuned numbers.

- [ ] **Step 5: Run the checks**

Run: `npm run test:next`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add src/sim/quests/fares/drive.ts src/sim/quests/fares/fares.ts scripts/fares-tune.mjs scripts/fares.check.mjs
```

Message: "Fare Darts tuned by scripted rounds: a masher lands C GROUP, a person about half the tray, a sharp hand A-LIST PREFERRED". Push.

---

### Task 6: The quest generalized, the AIRPORT SHUTTLE door and what comes home

**Files:**
- Create: `src/sim/quests/quest.ts`
- Modify: `src/sim/quests/hungry/hungry.ts` (`Hungry.id`), `src/sim/game.ts`, `src/sim/events.ts`, `src/sim/types.ts` (`HeroState.boxes`), `src/sim/hero.ts` (`HeroOptions.boxes`), `src/sim/level.ts` (`DoorSpec.quest`), `src/sim/levels/lobby.ts` (the shuttle door), `src/render/hud.ts` (`hintOf`, `HudPayload.quest`, `HudPayload.boxes`, `hudOf`, `hudKey`), `src/render/look.ts` (the `questPaid` note), `src/components/next-hud.tsx`, `next-veil.tsx`, `next-game.tsx` (narrowing on `quest.id` only)
- Test: `scripts/fares.check.mjs` (append), `scripts/banquet.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Consumes: Tasks 3 to 5 (`createFares`, `stepFares`, `FaresResult`, `FaresEvent`, `faresHint`, `groupOf`).
- Produces:
  - `quest.ts`: `type QuestId = "hungry" | "fares"`; `type Quest = Hungry | Fares`; `QUEST_NAMES: Record<QuestId, string> = { hungry: "Hungry Hungry Hammer", fares: "Fare Darts" }`.
  - `Hungry.id: "hungry"` (set by `createHungry`).
  - `Game.quest: Quest | null`; `Game.newQuest(seed: number, id?: QuestId): void` (default `"hungry"`); the door opens `createFares` when `d.quest === "fares"`; `step` runs `stepFares` or `stepHungry` by `q.id`.
  - `GameEvent` adds `FaresEvent`; `questPaid` becomes `{ type: "questPaid"; quest: QuestId; score: number; grade: string; doggy: boolean; flop: boolean; boxes: number; cans: number; lives: number }`.
  - `HeroState.boxes: number`; `HeroOptions.boxes?: number`; carried at `nextVenue` and `loseLife` beside `doggy` and `flop`, dropped by `newRun`.
  - `DoorSpec.quest?: QuestId`; the lobby's shuttle door `{ id: "shuttle", kind: "quest", x: 9100, y: 0, label: "AIRPORT SHUTTLE", quest: "fares" }`.
  - What the gate pays (in `pay`, by the quest): the score; `h.boxes += r.boxes`; the cans through `addCans` (their heat off); `h.charge = CHARGE_MAX` when `r.nuts`; `run.lives += r.lives` with a `oneUp` event per life.
  - `HudPayload.quest`: `({ id: "hungry" } & the banquet's fields) | GateHud`, `GateHud = { id: "fares"; score: number; left: number; steady: number; steadyMax: number; position: string; streak: number; door: boolean; result: FaresResult | null }`; `HudPayload.boxes: number`; the hint in a fares round is `faresHint(q)`.
  - `hintOf` at a quest door: `↓ ${d.label} · ${QUEST_NAMES[d.quest ?? "hungry"]}`, spent `${d.label} · thank you, come again`.
  - The `questPaid` note: the banquet's as now; the gate's `Gate +${score} · ${boxes} boxes of #15 blades · +${cans} cans` (the parts it won only; "1 box" in the singular; `· extra life` for a life).

- [ ] **Step 1: The failing tests** (append to `scripts/fares.check.mjs`, its own door helpers beside them)

```js
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
import { RESTAURANT } from "../src/sim/levels/restaurant.ts";
import { RUN } from "../src/sim/run.ts";
import { CHARGE_MAX, newMove } from "../src/sim/moves.ts";
import { hintOf, hudOf } from "../src/render/hud.ts";

const SHUTTLE = LOBBY.doors.find((d) => d.id === "shuttle");
const BUFFET = LOBBY.doors.find((d) => d.id === "buffet");
const lobbyGame = (opts = {}) => createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false, ...opts });
const until = (g, mode, seconds = 5, held = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP) && g.mode !== mode; i++) g.step(input(held));
  return g.mode;
};
const at = (g, door) => {
  until(g, "play");
  Object.assign(g.world.hero, { x: door.x, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  g.step(input());
  return g;
};
const downAt = (g) => {
  g.step(input({ down: true }, { down: true }));
  return [...g.events];
};
/** A gate round from the door (its hazards switched off, so a cloud or the agent can't eat a throw), `book` bookings at Austin then misses to the end, its tally up. */
const gateRound = (g, book = 0) => {
  downAt(g);
  until(g, "quest");
  const q = g.quest;
  q.hazards = false;
  for (let i = 0; i < 10; i++) {
    if (i < book) addTag(q, "AUS");
    q.pin = i < book ? cityAt("AUS") : OCEAN;
    g.step(input({ jump: true }, { jump: true }));
    for (let s = 0; s < Math.round((FARES.windup + FARES.flight) / STEP) + 2; s++) g.step(input());
  }
  until(g, "questTally", FARES.end + 0.5);
  return q;
};

test("↓ in front of the AIRPORT SHUTTLE door opens Fare Darts: its card, then the round; never from the air", () => {
  const g = at(lobbyGame(), SHUTTLE);
  assert.equal(hintOf(g), "↓ AIRPORT SHUTTLE · Fare Darts");
  downAt(g);
  assert.deepEqual([g.mode, g.quest.id, g.quest.practice, g.questDoor.id], ["questCard", "fares", false, "shuttle"]);
  assert.equal(until(g, "quest", RUN.cardT + 0.1), "quest");
  const air = at(lobbyGame(), SHUTTLE);
  Object.assign(air.world.hero, { y: -200, onGround: false });
  downAt(air);
  assert.equal(air.mode, "play");
});

test("a key held through the round's card throws nothing; only a fresh press does", () => {
  const g = at(lobbyGame(), SHUTTLE);
  downAt(g);
  until(g, "quest", RUN.cardT + 0.1, { jump: true });
  for (let i = 0; i < 30; i++) g.step(input({ jump: true }));
  assert.equal(g.quest.thrown, 0);
  g.step(input({ jump: true }, { jump: true }));
  assert.equal(g.quest.thrown, 1);
});

test("a break mid-throw holds the shot, the crosshair and the steady meter, and the shot lands once after", () => {
  const g = at(lobbyGame(), SHUTTLE);
  downAt(g);
  until(g, "quest");
  addTag(g.quest, "AUS");
  g.quest.pin = cityAt("AUS");
  g.step(input({ jump: true, run: true }, { jump: true }));
  const { theta, steady } = g.quest;
  const t = g.quest.shot.t;
  g.togglePause();
  for (let i = 0; i < 120; i++) g.step(input({ run: true, jump: true }, { jump: true }));
  assert.deepEqual([g.quest.theta, g.quest.steady, g.quest.shot.t], [theta, steady, t]);
  g.togglePause();
  for (let i = 0; i < 80; i++) g.step(input());
  assert.deepEqual([g.quest.stuck, g.quest.bookings.length], [1, 1]);
});

test("Continue stands him at the shuttle door with grace and brings home the score, a box a booking, three cans a Wanna Get Away, the smash", () => {
  const g = at(lobbyGame(), SHUTTLE);
  Object.assign(g.world.hero, { charge: 0, boxes: 0 });
  const before = { score: g.run.score, cans: g.run.cans };
  const q = gateRound(g, 4);
  const r = q.result;
  assert.deepEqual([r.booked, r.boxes, r.cans, r.nuts, r.lives], [4, 4, 12, true, 0]);
  g.finishQuest();
  const h = g.world.hero;
  assert.deepEqual([g.mode, h.x, h.onGround, h.boxes, h.charge], ["play", SHUTTLE.x, true, 4, CHARGE_MAX]);
  assert.ok(h.invuln >= RUN.questGrace - 1e-9);
  assert.equal(g.run.cans, before.cans + 12);
  assert.equal(g.run.score, before.score + r.score + 12 * RUN.canPoints);
  const paid = of(g.events, "questPaid")[0];
  assert.deepEqual([paid.quest, paid.boxes, paid.cans, paid.lives], ["fares", 4, 12, 0]);
});

test("A-LIST PREFERRED from the door is an extra life", () => {
  const g = at(lobbyGame(), SHUTTLE);
  const lives = g.run.lives;
  gateRound(g, 7);
  assert.equal(g.quest.result.lives, 1);
  g.finishQuest();
  assert.equal(g.run.lives, lives + 1);
  assert.equal(of(g.events, "oneUp").length, 1);
});

test("the shuttle is spent once a shift, through a lost life, and apart from the BUFFET; a new shift opens it again", () => {
  const g = at(lobbyGame(), SHUTTLE);
  gateRound(g);
  g.finishQuest();
  for (let i = 0; i < 30; i++) g.step(input({ down: true }));
  g.step(input());
  downAt(g);
  assert.equal(g.mode, "play", "spent; the held key opened nothing");
  assert.equal(hintOf(g), "AIRPORT SHUTTLE · thank you, come again");
  g.world.hero.y = 99999;
  until(g, "dying", 1);
  until(g, "play", 8);
  at(g, SHUTTLE);
  downAt(g);
  assert.equal(g.mode, "play", "still spent after a lost life");
  at(g, BUFFET);
  downAt(g);
  assert.deepEqual([g.mode, g.quest.id], ["questCard", "hungry"], "the BUFFET is its own");
  g.newRun(9);
  at(g, SHUTTLE);
  downAt(g);
  assert.equal(g.mode, "questCard", "a new shift opens it");
});

test("the boxes ride with him through a lost life and into the next venue; a new shift has none", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT] }, 3, { cast: false });
  until(g, "play");
  g.world.hero.boxes = 3;
  g.world.hero.y = 99999;
  until(g, "dying", 1);
  until(g, "play", 8);
  assert.equal(g.world.hero.boxes, 3, "through a lost life");
  g.world.hero.x = 15800;
  for (let i = 0; i < Math.round(20 / STEP) && g.mode !== "card"; i++) g.step(input({ right: true }));
  assert.deepEqual([g.level.id, g.world.hero.boxes], ["restaurant", 3], "into the next venue");
  g.newRun(4);
  assert.equal(g.world.hero.boxes, 0);
});

test("practice: newQuest(seed, 'fares') plays a round on its own that never touches a shift", () => {
  const g = lobbyGame({ title: true });
  g.newQuest(5, "fares");
  assert.deepEqual([g.mode, g.quest.id, g.quest.practice, g.questDoor], ["questCard", "fares", true, null]);
  g.newQuest(6);
  assert.equal(g.quest.id, "fares", "no new round over a running card");
});

test("the HUD in the gate's round: the score, the scalpels left, the steady hand, his position, the streak and its hint", () => {
  const g = lobbyGame({ title: true });
  g.newQuest(5, "fares");
  until(g, "quest");
  const q = g.quest;
  Object.assign(q, { score: 684, thrown: 3, stuck: 3, steady: 2.3, position: 72, streak: 3 });
  assert.deepEqual(hudOf(g, null).quest, { id: "fares", score: 684, left: 7, steady: 2.3, steadyMax: 2.5, position: "B13", streak: 3, door: false, result: null });
  assert.equal(hudOf(g, null).hint, "Space throws · hold Shift to steady your hand · E mouths off");
});
```

In `scripts/banquet.check.mjs`, the banquet's `questPaid` now carries `quest: "hungry"`, `boxes: 0`, `cans` and `lives: 0`: update any assertion that reads the whole event. In `scripts/render.check.mjs`, the banquet's HUD `deepEqual` gains `id: "hungry"`.

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/fares.check.mjs scripts/banquet.check.mjs scripts/render.check.mjs`
Expected: FAIL (the shuttle door is still `closed`).

- [ ] **Step 3: The generalization, the door and the payout** (per the Interfaces; the shell's three components narrow on `hud.quest.id === "hungry"` where they read the banquet's fields, and show nothing new yet)

- [ ] **Step 4: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/sim src/render src/components scripts`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/sim/quests/quest.ts src/sim/quests/hungry/hungry.ts src/sim/game.ts src/sim/events.ts src/sim/types.ts src/sim/hero.ts src/sim/level.ts src/sim/levels/lobby.ts src/render/hud.ts src/render/look.ts src/components/next-hud.tsx src/components/next-veil.tsx src/components/next-game.tsx scripts/fares.check.mjs scripts/banquet.check.mjs scripts/render.check.mjs
```

Message: "The AIRPORT SHUTTLE door opens Fare Darts once a shift, apart from the BUFFET; Continue brings home the score, boxes of #15 blades, cans, the smash and a life at A1". Push.

---

### Task 7: The throw, the lob and the travelers' reactions

**Files:**
- Modify: `src/sim/moves.ts` (`MoveKind` adds `"throw" | "lob"`; `MOVE_SECONDS.throw = 0.3`, `MOVE_SECONDS.lob = 0.35`), `src/sim/rig/actions.ts` (`ACTION_MASK.throw = "upper"`, `ACTION_MASK.lob = "upper"`; `ACTIONS.throw`, `ACTIONS.lob`; `LOB_RELEASE = 0.55`), `src/sim/rig/cast.ts` (`Reaction`, `REACTION_SECONDS`, `castReaction`), `src/sim/rig/face.ts` (`segmentClear`), `src/render/boards.ts` (the moves board lists both)
- Test: `scripts/rig.check.mjs` (`KINDS`, `FACE_ALLOWED`, the smoothness list), `scripts/cast.check.mjs`

**Interfaces:**
- Produces: `ACTIONS.throw(u: number): Pose` (the near arm, its fist on the grip, cocks the scalpel up behind his head by u 0.4 and whips it forward to arm's length ahead and above his shoulder at u 1, his chest turning into it); `ACTIONS.lob(u: number): Pose` (the near arm holds the mallet as `HOLD`; the far arm swings from behind his hip, through, to chest height ahead, the far hand passing `LOB_RELEASE`'s point ahead of his chest); `LOB_RELEASE = 0.55`; `segmentClear(solved: Solved, a: Point, b: Point, r: number): boolean` (the face probe's sampling, exported); `type Reaction = "ooh" | "laugh" | "clap"`; `REACTION_SECONDS: Record<Reaction, number> = { ooh: 0.9, laugh: 1.2, clap: 1.4 }`; `castReaction(base: Pose, kind: Reaction, t: number): Pose` (the reaction over `base` by `overlay(…, "upper", w)` from `rig/actions.ts`, easing in and out over its seconds: ooh leans in with both hands up to the chest, laugh tips the head back with the shoulders shaking at 6 Hz, clap brings the hands together in front of the chest at 3 Hz).
- The scalpel at the gate is drawn in the fist on the grip (`solved.joints.grip`), 70 px of blade ahead along the handle's line and 30 px of handle behind.

- [ ] **Step 1: The failing tests**

In `scripts/rig.check.mjs`: add `"throw"` and `"lob"` to `KINDS`; `FACE_ALLOWED.throw = ["mallet handle", "mallet head"]` (no mallet in his fist at the gate) and `FACE_ALLOWED.lob = []`; both to the smoothness list. Then:

```js
test("the throw cocks the scalpel behind his head and whips it forward: the scalpel clear of his face at every frame, his head level", () => {
  for (let i = 0; i <= 400; i++)
    for (const facing of [1, -1])
      for (const headScale of [0.24, 0.26, 0.3]) {
        const u = i / 400;
        const s = solve(ACTIONS.throw(u), facing, headScale);
        const grip = s.joints.grip, head = s.joints.malletHead;
        const d = Math.hypot(head.x - grip.x, head.y - grip.y);
        const ux = (head.x - grip.x) / d, uy = (head.y - grip.y) / d;
        const tip = { x: grip.x + ux * 70, y: grip.y + uy * 70 };
        const butt = { x: grip.x - ux * 30, y: grip.y - uy * 30 };
        assert.ok(segmentClear(s, butt, tip, 8), `throw u=${u} facing ${facing} head ${headScale}: the scalpel`);
      }
  const cocked = solve(ACTIONS.throw(0.4), 1, 0.26), out = solve(ACTIONS.throw(1), 1, 0.26);
  assert.ok(cocked.joints.handNear.y < cocked.joints.neck.y && cocked.joints.handNear.x < cocked.joints.neck.x, "cocked up behind his head");
  assert.ok(out.joints.handNear.x > out.joints.chest.x + 80 && out.joints.handNear.y < out.joints.shoulderNear.y, "whipped out ahead, above his shoulder");
});

test("the lob swings his free hand from behind his hip to chest height ahead, always under his face", () => {
  for (let i = 0; i <= 400; i++)
    for (const facing of [1, -1]) {
      const s = solve(ACTIONS.lob(i / 400), facing, 0.26);
      assert.ok(s.joints.handFar.y > s.faceBox.y + s.faceBox.h, `lob u=${i / 400}: under his face`);
    }
  const back = solve(ACTIONS.lob(0.2), 1, 0.26), go = solve(ACTIONS.lob(LOB_RELEASE), 1, 0.26);
  assert.ok(back.joints.handFar.x < back.joints.pelvis.x, "back behind his hip");
  assert.ok(go.joints.handFar.x > go.joints.chest.x + 40, "out ahead at the release");
});
```

In `scripts/cast.check.mjs` (import `castPose`, `castReaction`, `REACTION_SECONDS`):

```js
test("the travelers' ooh, laugh and clap move only the upper body over a seated pose, smoothly", () => {
  const seated = (t) => castPose({ role: "office", act: "idle", t, speed: 0, onGround: true, sit: true, spin: 0, hits: 0 });
  for (const kind of ["ooh", "laugh", "clap"]) {
    let last = null;
    for (let t = 0; t <= REACTION_SECONDS[kind]; t += STEP) {
      const base = seated(t), p = castReaction(base, kind, t);
      for (const j of ["hipNear", "hipFar", "kneeNear", "kneeFar"]) assert.equal(p.rot[j], base.rot[j], `${kind}: ${j} stays`);
      if (last) for (const [j, v] of Object.entries(p.rot)) assert.ok(Math.abs(v - (last.rot[j] ?? v)) <= 9, `${kind} t=${t.toFixed(2)}: ${j} jumps`);
      last = p;
    }
    const mid = castReaction(seated(0), kind, REACTION_SECONDS[kind] / 2);
    assert.ok(Math.abs(mid.rot.shoulderNear - seated(0).rot.shoulderNear) >= 20, `${kind} moves his arms`);
  }
});
```

(Use the joint names `rig/skeleton.ts` defines; adjust the leg names to them.)

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/rig.check.mjs scripts/cast.check.mjs`
Expected: FAIL (no `throw`, `lob` or `castReaction`).

- [ ] **Step 3: The clips** (per the Interfaces; keyed tracks with `at`, the far arm by `armTo("far", …)` as the snot clip does)

- [ ] **Step 4: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`
Expected: PASS: every existing face, blend, fist, smoothness and head check over the two new kinds too.

- [ ] **Step 5: The boards**

Run: `node scripts/look-boards.mjs http://127.0.0.1:8090/ "" moves` and look at `hammer-moves.png` at full size: the throw and the lob, frame by frame; nothing crosses his face, nothing jumps.

- [ ] **Step 6: Commit and push**

```bash
git add src/sim/moves.ts src/sim/rig/actions.ts src/sim/rig/cast.ts src/sim/rig/face.ts src/render/boards.ts scripts/rig.check.mjs scripts/cast.check.mjs
```

Message: "Hammer's dart throw and his underhand lob, both clear of his face, and the travelers' ooh, laugh and clap". Push.

---

### Task 8: The boxes of #15 blades in the shift

**Files:**
- Create: `src/sim/samples.ts`
- Modify: `src/sim/input.ts` (`Action` adds `"box"`, `ACTIONS`, `KEY_BINDINGS.KeyB = "box"`), `src/sim/moves.ts` (`startMove`: the lob; `stepHeat`: `boxCd`), `src/sim/types.ts` (`HeroState.boxCd`, `Snapshot.samples`), `src/sim/hero.ts`, `src/sim/world.ts` (`samples`, `nextSample`, the step order, `snapshot`), `src/sim/cast.ts` (`Npc.freeze`, `Npc.birds`, `freezeNpc`), `src/sim/cast-behavior.ts` (the frozen case reads `n.freeze`; `lectureOn` freezes through `freezeNpc`), `src/sim/events.ts`, `src/sim/game.ts` (samples cleared where snot is), `src/sim/run.ts` (`Run.lobbed`), `src/render/interp.ts`, `src/render/props.ts` (the box in flight and lying), `src/render/cast.ts` (the birds), `src/render/sound.ts` (cues, `tauntFor`), `src/game/audio.ts` (`tweet`), `src/render/hud.ts` (the hint, `boxes`), `src/render/look.ts` ("FREE SAMPLE!", the occasional thought), `src/game/lines.ts` (`SAMPLE_LINES`), `src/components/next-touch.tsx` (the Box button), `src/components/next-game.tsx` (`boxes` to the pad), `src/components/next-keys.ts` (`B` in the keys card), `src/components/next-hud.tsx` (the boxes badge)
- Test: `scripts/fares.check.mjs` (append), `scripts/render.check.mjs`

**Interfaces:**
- Consumes: Task 6 (`HeroState.boxes`), Task 7 (`ACTIONS.lob`, `LOB_RELEASE`).
- Produces: `SAMPLE = { vx: 620, vy: -650, gravity: 1800, r: 22, cd: 0.4, freeze: 1.5, points: 50, fade: 0.6 }`; `type Sample = { id: number; x: number; y: number; vx: number; vy: number; landed: number; hit: boolean }` (`landed` −1 in the air, else seconds lying); `fireSample(h: HeroState, w: { samples: Sample[]; nextSample: number }, events: GameEvent[]): void` (once per lob, at `LOB_RELEASE`, from `solve(ACTIONS.lob(u), …).joints.handFar`; `h.boxes -= 1`; `sampleThrow`); `stepSamples(w: { stage: Stage; samples: Sample[]; targets: Cart[]; cast: Npc[]; pig: Pig | null }, dt: number, events: GameEvent[]): void`; `freezeNpc(n: Npc, seconds: number, birds: boolean, toward: Point): void`; `Npc.freeze: number` (this freeze's length; the frozen act ends at `actT >= freeze`); `Npc.birds: boolean`; events `{ type: "sampleThrow"; x: number; y: number }`, `{ type: "sampleHit"; id: number; role: CastRole; x: number; y: number; points: number }`, `{ type: "sampleStop"; x: number; y: number; on: "pig" | "cart" | "wall" | "floor" }`; `HeroState.boxCd: number`; `Run.lobbed: boolean` (set by the first `sampleThrow`); `HudPayload.boxes`; the hint "Boxes of #15 blades · B lobs one · it freezes staff" while he has boxes and `!run.lobbed`; `NextTouch` takes `boxes: number` and shows `{ action: "box", label: "Box of blades", glyph: "Box" }` after Jump, with `data-count`, while `boxes > 0`.
- The lob starts in `startMove` after the hammer's branch: `p.box && h.boxes > 0 && h.boxCd <= 0` gives `h.move = newMove("lob")` and `h.boxCd = SAMPLE.cd` (the guard at its top already refuses a crouch, a slide, a flop and every move but the idle acts, so a knockdown's hurt or tumble refuses it too).
- A box in flight hits the first cast member it sweeps (`sweptHeadHits` against `npcRect`) who is `standing(n)`; it freezes them (`freezeNpc(n, SAMPLE.freeze, true, hero)`), pushes `sampleHit` with 50 points, and drops (`vx = 0`). The pig's rect, a cart's and a solid or pass stop it (`sampleStop`), the floor lands it (`landed = 0`), and it is removed after `SAMPLE.fade` lying or below the level's bottom.
- Sound: `sampleThrow` `["swish"]`, `sampleHit` `["thud", "tweet"]`, `sampleStop` `["thud"]`; `tauntFor(sampleHit)` is `"student"` for a student, else `"staff"`, rolled by the bus like a lecture's.

- [ ] **Step 1: The failing tests** (append; a cast game helper beside the door helpers)

```js
import { SAMPLE, stepSamples } from "../src/sim/samples.ts";
import { T } from "../src/sim/cast.ts";
import { createCart } from "../src/sim/targets.ts";
import { createPig } from "../src/sim/pig.ts";
import { GIFTSHOP } from "../src/sim/levels/giftshop.ts";
import { cuesFor, tauntFor } from "../src/render/sound.ts";

/** Him on the flat floor route under the balcony (9300, between the shuttle and STAFF ONLY), facing right, with boxes; no carts in the way. */
const lobber = (boxes = 3, cast = false, x = 9300) => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3, { cast });
  until(g, "play");
  g.world.targets = [];
  Object.assign(g.world.hero, { x, y: 0, vx: 0, vy: 0, onGround: true, move: null, facing: 1, boxes });
  g.step(input());
  return g;
};
const lob = (g) => {
  g.step(input({ box: true }, { box: true }));
  const out = [...g.events];
  for (let i = 0; i < 60; i++) {
    g.step(input({ box: true }));
    out.push(...g.events);
  }
  return out;
};

test("B lobs one box from his free hand; held, it lobs one; one every 0.4 s; with none left, nothing", () => {
  const g = lobber(2);
  const evs = lob(g);
  assert.equal(of(evs, "sampleThrow").length, 1);
  assert.equal(g.world.hero.boxes, 1);
  for (let i = 0; i < 10; i++) g.step(input());
  lob(g);
  assert.equal(g.world.hero.boxes, 0);
  assert.equal(of(lob(g), "sampleThrow").length, 0, "none left");
  assert.ok(g.world.hero.boxes >= 0);
  const c = lobber(3);
  c.step(input({ box: true }, { box: true }));
  for (let i = 0; i < Math.round(0.37 / STEP); i++) c.step(input());
  c.step(input({ box: true }, { box: true }));
  assert.equal(c.world.hero.boxes, 2, "the lob is over but 0.4 s have not passed");
  for (let i = 0; i < Math.round(0.05 / STEP); i++) c.step(input());
  c.step(input({ box: true }, { box: true }));
  for (let i = 0; i < 60; i++) c.step(input());
  assert.equal(c.world.hero.boxes, 1);
});

test("from standing a box lands about 640 px ahead, either way he faces", () => {
  for (const facing of [1, -1]) {
    const g = lobber(1);
    g.world.hero.facing = facing;
    const x0 = g.world.hero.x;
    const evs = lob(g);
    for (let i = 0; i < 240; i++) {
      g.step(input());
      evs.push(...g.events);
    }
    const land = of(evs, "sampleStop").find((e) => e.on === "floor");
    assert.ok(land && Math.abs(land.x - x0) > 520 && Math.abs(land.x - x0) < 760 && Math.sign(land.x - x0) === facing, `${facing}: ${land?.x - x0}`);
  }
});

test("a box freezes a staffer or a student on their feet for 1.5 s with birds, 50 points, no damage; the lecture still freezes 1.8 s", () => {
  for (const role of ["server", "student"]) {
    const g = lobber(1, true);
    const n = g.world.cast.find((c) => c.role === role);
    Object.assign(n, { x: g.world.hero.x + 450, y: 0, vx: 0, act: "idle", actT: 0 });
    const score = g.run.score, hits = n.hits;
    const evs = lob(g);
    for (let i = 0; i < 120 && !of(evs, "sampleHit").length; i++) {
      g.step(input());
      evs.push(...g.events);
    }
    assert.equal(of(evs, "sampleHit").length, 1, role);
    assert.deepEqual([n.act, n.birds, n.hits], ["frozen", true, hits]);
    assert.equal(g.run.score, score + SAMPLE.points);
    for (let i = 0; i < Math.round(1.4 / STEP); i++) g.step(input());
    assert.equal(n.act, "frozen", "still at 1.4 s");
    for (let i = 0; i < Math.round(0.2 / STEP); i++) g.step(input());
    assert.notEqual(n.act, "frozen", "free by 1.6 s");
    assert.equal(n.birds, false);
  }
  assert.equal(T.freeze, 1.8);
});

test("a wall, the pig and a cart stop a box with no effect; a staffer already down lets it pass; down the shaft it is gone; never NaN", () => {
  // Under the service corridor's low ceiling (14800 to 15300) the box's arc meets the pass at once.
  const wall = lobber(1, false, 14900);
  const evs = lob(wall);
  for (let i = 0; i < 120; i++) {
    wall.step(input());
    evs.push(...wall.events);
    for (const s of wall.world.samples) assert.ok(Number.isFinite(s.x + s.y + s.vx + s.vy));
  }
  assert.ok(of(evs, "sampleStop").some((e) => e.on === "wall"));
  const shaft = lobber(1, false, 5800);
  lob(shaft);
  for (let i = 0; i < 600; i++) shaft.step(input());
  assert.equal(shaft.world.samples.length, 0, "a box down the shaft is gone");
  const down = lobber(1, true);
  const n = down.world.cast.find((c) => c.role === "server");
  Object.assign(n, { x: down.world.hero.x + 450, y: 0, vx: 0, act: "down", actT: 0 });
  const passed = lob(down);
  for (let i = 0; i < 120; i++) {
    down.step(input());
    passed.push(...down.events);
  }
  assert.equal(of(passed, "sampleHit").length, 0, "over a staffer already down");
  const w = { stage: wall.world.stage, samples: [], targets: [{ ...createCart(1, 9500, 0) }], cast: [], pig: { ...createPig(GIFTSHOP.boss, 0), x: 9300, state: "recover" } };
  w.samples.push({ id: 1, x: 9000, y: -150, vx: 620, vy: 0, landed: -1, hit: false });
  const stops = [];
  for (let i = 0; i < 120; i++) stepSamples(w, STEP, stops);
  assert.ok(stops.some((e) => e.type === "sampleStop" && (e.on === "pig" || e.on === "cart")), "the pig or the cart stopped it");
  assert.equal(w.pig.hp, createPig(GIFTSHOP.boss, 0).hp, "the pig unhurt");
});

test("never from a crouch, a slide, a flop or a knockdown", () => {
  const g = lobber(3);
  Object.assign(g.world.hero, { crouch: true });
  assert.equal(of(lob(g), "sampleThrow").length, 0, "crouched");
  Object.assign(g.world.hero, { crouch: false, move: newMove("tumble") });
  g.step(input({ box: true }, { box: true }));
  assert.equal(of(g.events, "sampleThrow").length, 0, "knocked down");
});

test("a box in flight is gone when he walks into the stash; the boxes he carries come back with him", () => {
  const g = lobber(2);
  const staff = LOBBY.doors.find((d) => d.kind === "stash");
  Object.assign(g.world.hero, { x: staff.x - 40 });
  g.step(input({ box: true }, { box: true }));
  for (let i = 0; i < 40; i++) g.step(input());
  Object.assign(g.world.hero, { x: staff.x, y: 0, vx: 0, onGround: true, move: null });
  g.step(input());
  downAt(g);
  assert.equal(g.level.id, "stash");
  assert.equal(g.world.samples.length, 0);
  assert.equal(g.world.hero.boxes, 1);
});

test("the box's sounds and taunts: a swish, a thud and the birds' tweet; a student's or the staff's pool", () => {
  assert.deepEqual(cuesFor({ type: "sampleHit", id: 1, role: "server", x: 0, y: 0, points: 50 }), ["thud", "tweet"]);
  assert.equal(tauntFor({ type: "sampleHit", id: 1, role: "student", x: 0, y: 0, points: 50 }), "student");
  assert.equal(tauntFor({ type: "sampleHit", id: 1, role: "server", x: 0, y: 0, points: 50 }), "staff");
});
```

In `scripts/render.check.mjs`: the hint with boxes and `run.lobbed` false is "Boxes of #15 blades · B lobs one · it freezes staff", and `hudOf(...).boxes` counts them.

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/fares.check.mjs scripts/render.check.mjs`
Expected: FAIL (no `box` action, no samples).

- [ ] **Step 3: The boxes** (per the Interfaces; the box drawn from the gate sheet's `box` piece when it is in, else a drawn white box with a blue band, 44 by 30, the ink style; the birds three small inked birds circling the crown like the stars, at 3 rad/s)

- [ ] **Step 4: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/sim src/render src/components scripts`, then `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/moves-browser.check.mjs http://127.0.0.1:8090/` and `node scripts/cast-browser.check.mjs http://127.0.0.1:8090/` (both unchanged and passing)
Expected: PASS.

- [ ] **Step 5: Look**

With `&dev=1`, set boxes from the console (a dev hook `boxes(n)` beside `doggy(n)`), lob at the BUFFET server, the floor bellhop and a rail student; screenshot each freeze; step the lob frame by frame at `slowmo()`. The box leaves his free hand, never crosses his face, the birds circle over the frozen head, the box falls and fades.

- [ ] **Step 6: Commit and push**

```bash
git add src/sim/samples.ts src/sim/input.ts src/sim/moves.ts src/sim/types.ts src/sim/hero.ts src/sim/world.ts src/sim/cast.ts src/sim/cast-behavior.ts src/sim/events.ts src/sim/game.ts src/sim/run.ts src/render/interp.ts src/render/props.ts src/render/cast.ts src/render/sound.ts src/game/audio.ts src/render/hud.ts src/render/look.ts src/game/lines.ts src/components/next-touch.tsx src/components/next-game.tsx src/components/next-keys.ts src/components/next-hud.tsx scripts/fares.check.mjs scripts/render.check.mjs
```

Message: "Boxes of #15 blades: B lobs one underhand and whoever it bonks freezes with birds round their head, a free sample nobody wanted". Push.

---

### Task 9: The paintings in the art pipeline

**Files:**
- Modify: `src/art/registry.ts` (`GatePiece`, `GATE_PIECES`, `Registry.gate`), `src/sim/level.ts` (`CastPerson` adds `"gate-agent"`), `src/render/cast.ts` (`LOOKS["gate-agent"]`), `scripts/art-cut.mjs` (`nameGatePieces`), `scripts/art-sync.mjs` (`gate`, `CAST_PERSONS` adds `"gate-agent"`), `scripts/art-grid.mjs` (`gate/room`, `gate/sheet`)
- Create (when each painting is in): `art/cuts/gate.json`, `art/cuts/cast-gate-agent.json`
- Test: `scripts/art.check.mjs`

**Interfaces:**
- Produces: `type GatePiece = "podium" | "kiosk" | "seats" | "cart" | "stanchion" | "scalpel" | "box"`; `GATE_PIECES: readonly GatePiece[]` in that order (the brief's left to right); `Registry.gate?: { room?: { file: string; width: number; height: number; floor: number; windows: { top: number; bottom: number } }; plane?: { file: string; width: number; height: number }; pieces?: Partial<Record<GatePiece, Piece>> }`; `nameGatePieces(pieces: Piece[]): Record<GatePiece, Piece>` (throws "the gate sheet has N pieces, not 7" unless there are seven); `art/cuts/gate.json` `{ note, space: "source", floor: number, windows: [top, bottom] }`; `LOOKS["gate-agent"]`: the stand-in (height 318, curly short dark hair, a navy polo, grey trousers, black shoes, a lanyard).
- The sync's `gate(registry)`, each part inside `tolerant`: the room (`backdrops/gate.png` unkeyed to `gate/room.png`, with the cut's floor and windows; no cut, a warning); the plane (`props/gate-plane.png` keyed to `gate/plane.png`); the sheet (`props/gate-sheet.png` through `keyOut`, `sheetPieces`, `nameGatePieces`, each to `gate/<piece>.png`); the agent through `cast()` like the nurse.

- [ ] **Step 1: The failing test** (in `scripts/art.check.mjs`)

```js
test("the gate sheet's seven pieces are named in the brief's order; six or eight refuse", async () => {
  const { nameGatePieces } = await import("./art-cut.mjs");
  const { GATE_PIECES } = await import("../src/art/registry.ts");
  const piece = (i) => ({ file: `p${i}.png`, width: 10 + i, height: 10, base: { x: 5, y: 9 } });
  const named = nameGatePieces([...Array(7).keys()].map(piece));
  assert.deepEqual(Object.keys(named), [...GATE_PIECES]);
  assert.equal(named.box.width, 16);
  assert.throws(() => nameGatePieces([...Array(6).keys()].map(piece)), /6 pieces, not 7/);
  assert.throws(() => nameGatePieces([...Array(8).keys()].map(piece)), /8 pieces, not 7/);
});
```

- [ ] **Step 2: Run it**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs`
Expected: FAIL (no `nameGatePieces`).

- [ ] **Step 3: The pipeline** (per the Interfaces)

- [ ] **Step 4: Run the checks**

Run: `npm run art:sync` (with none of the four paintings in: three warnings, the sync goes on), `npm run test:next`, `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/art/registry.ts src/sim/level.ts src/render/cast.ts scripts/art-cut.mjs scripts/art-sync.mjs scripts/art-grid.mjs scripts/art.check.mjs
```

Message: "The gate's paintings have a place to land: the room, the plane, the sheet of seven pieces and the gate agent, each falling back to a drawing". Push.

- [ ] **Step 6: Each painting as it comes in** (this step waits on the owner; the rest of the plan does not)

- `gate.png`: check it against the brief's list; `node scripts/art-grid.mjs gate/room` and measure the floor line (the wall's base) and the window band's top and bottom; write `art/cuts/gate.json`; `npm run art:sync`.
- `gate-sheet.png`: `npm run art:sync`; it must name seven pieces (if Codex painted more or fewer, ask the owner for a redo with the exact reason); `node scripts/art-grid.mjs gate/sheet` shows each piece's box and base.
- `gate-plane.png`: `npm run art:sync`.
- `gate-agent.png`: `node scripts/art-pose.mjs gate-agent` against Hammer's body; write `art/cuts/cast-gate-agent.json` from `cast-nurse.json` as R4 cut the nurse (her joints and layer polygons measured with `node scripts/art-grid.mjs cast/gate-agent`); `npm run art:sync`; `test:next`'s art checks rebuild her at rest.
- Each: look at the boards that show it (Task 10's `gate` boards, `cast.png`), then commit the painting, its prompt file, its cut and only its manifest entries (`node artifacts/stage-manifest.mjs <paths>`), with a message naming the painting. Push.

---

### Task 10: The gate drawn

**Files:**
- Create: `src/render/quests/gate-layout.ts`, `src/render/quests/gate-board.ts`, `src/render/quests/gate-scene.ts`
- Modify: `src/render/quests/frame.ts` (`fitFrame`), `src/render/quests/diner.ts` (`scale`), `src/render/look.ts`, `src/render/app.ts` (the probe's and the dev hooks' types), `src/render/sound.ts` (the gate's cues), `src/game/audio.ts` (`thunk`, `print`), `src/sim/feel.ts` (`fdStick`), `src/render/boards.ts`, `scripts/look-boards.mjs`, `src/game/lines.ts` (`GATE_INSULTS`, `GATE_GLOATS`, `GATE_PISSED`)
- Test: `scripts/render.check.mjs`

**Interfaces:**
- Consumes: Tasks 3 to 9.
- Produces:
  - `fitFrame(frame: Rect, width: number, height: number, insets: { top: number; bottom: number }): { x: number; y: number; zoom: number }` (the frame-to-camera math now inside `banquetFrame`, which calls it; the banquet's frame test still passes unchanged).
  - `type GateLayout = { upright: boolean; board: Point; map: Point; ladder: Rect; floor: number; hammer: number; cart: number; printer: number; podium: number; seats: { x0: number; x1: number }; travelers: Record<Traveler, number>; frame: Rect; camera: { x: number; y: number; zoom: number } }` (world px: `board` and `map` the top-left corners of the 1180 by 720 panel and its 1080 by 600 map; `frame` what must be in view); `gateLayout(width: number, height: number, insets: { top: number; bottom: number }): GateLayout` (wide when `width >= height`: the travelers' seats, Hammer, his cart and the printer left to right under and beside the board's left, the podium under its right, the ladder at its right; upright: the board across, the ladder below its right end, Hammer and his cart under its left half, the seats under its right half; in both the map's bottom edge 150 above `floor`).
  - `PERSON = { stand: { w: 160, h: 330 }, seat: { w: 160, head: 225 } }` (the people's boxes for the layout's checks: a standing person's box up to `floor − 330`, a seated one's head to `floor − 225`).
  - `TRAVELER_PERSON: Record<Traveler, CastPerson> = { office: "office-1", student: "student-2", prof: "prof-1", nurse: "nurse" }`; `GATE_ID: Record<Traveler | "agent", number> = { office: 911, student: 912, prof: 913, nurse: 914, agent: 915 }` (speech's ids).
  - `RouteBoard` (`gate-board.ts`): `constructor(parent: Container)`; `place(board: Point, map: Point, ladder: Rect): void`; `sync(q: Fares, dt: number, time: number): void` (the panel and its header "GATE B7 · SAN ANTONIO", the map polygon in the ink style, the cities and their `Barlow Condensed` 26 px labels with Texas's set off to the sides, the YOU ARE HERE sticker, the tags centered on their cities showing the code and the fare (the bonus tags their words), flickering through their last 0.6 s, a stopped tag's red X, a booked tag flying to the printer, the cloud with its rain and "DELAYED", the crosshair with its trail of the last 1.5 s and its ring tightening while steadied, the stuck scalpels wobbling 0.4 s, the board's 6 px shake on a stick, the ladder with his pass sliding and flashing gold at A1); `toWorld(p: Point): Point` (map px to world px); `destroy(): void`.
  - `GateView` (`gate-scene.ts`): `constructor(render: RenderApp, scene: Scene, registry: Registry, noart: boolean)`; `load(): Promise<void>`; `setVisible(on: boolean): void`; `layout(l: GateLayout): void`; `sync(q: Fares, dt: number, time: number): void`; `face(): Rect`; `crown(): Point`; `crownOf(id: number): { x: number; y: number; facing: 1 | -1 } | null`; `react(who: Traveler, kind: Reaction): void`; `mood(m: "smug" | "angry" | null, seconds: number): void` (angry also puffs the heat steam from his head); `boardOnScreen(): Rect` (world); `tagsInWorld(): { city: CityCode; kind: TagKind; rect: Rect }[]`; `paintedCount(): number`; `destroy(): void`. It draws, back to front: the room (the painting, its edges stretched outward as the ballroom's are, or the drawn gate), planes taking off behind the glass (the painted plane or a drawn one, masked to the windows, every 6 to 10 s), the board, the printer with the passes sliding into its tray, the podium with the agent behind it (a `Diner` at `scale` 1; her crossing walked in front of the board's lower right while `q.agent` is set, a clipboard drawn in her near hand), the seated travelers behind the seat backs (`Diner`s seated, with `castReaction` beats), the cart with the sterile tray's scalpels, the mallet leaning, Hammer (`createCharacter(registry, "affliction")`, posed by `ACTIONS.throw` over his idle, a scalpel at his grip and no mallet in his fist), the scalpel in flight (an arc to the press's point in 0.22 s, two spins, a trail), the stanchions.
  - `Diner`'s constructor takes `scale = BANQUET_SCALE` as its last argument (the banquet's calls unchanged).
  - In `look.ts`: `inQuest()` (the banquet's `inBanquet` for either quest); the gate loaded like the banquet (`loadGate`, behind the start screen and after the shift's venues), the round's card holding while it loads as the banquet's does, and the cast's painted-figure probe leaving out `gate.paintedCount()` as it does the banquet's; `showQuestView(id: QuestId | null)`; `gateTick(dt, simDt)` (sync, events, the camera from `gateLayout` with a 4 percent push-in from `fdRelease` to `fdStick`, bubbles and speech through the face-safe layout, the HUD); `showGate(e: GameEvent, q: Fares)` (words: "+342", "COMPANION PASS", "MISS", "CANCELLED", "A-LIST PREFERRED!", "FREE SAMPLE!" in the shift; his thoughts; speech by `GATE_ID`; insults picked in turn from `GATE_INSULTS`, `GATE_GLOATS` or `GATE_PISSED` by mood; the crowd's beats); during a fares round a pointer down on the canvas presses `jump` for one step and two pointers down hold `run`; the probe `window.__next.quest` for the gate `{ id: "fares", time: number; score: number; thrown: number; stuck: number; booked: number; position: number; streak: number; steady: number; preferred: boolean; aim: Point; tags: { city: string; kind: string; rect: Rect }[]; result: unknown; frame: Rect }` (screen px: `aim`, the tags' rects and the board's `frame`), the banquet's probe with `id: "hungry"`; dev hooks `fares(o: { pin?: CityCode | null; tag?: { city: CityCode; kind?: TagKind }; calm?: boolean })` (`calm` switches the round's hazards off, so a browser check's throw lands where it was aimed) and `questSkip()` (the gate's by `skipFares`).
  - Walking out of the shuttle door (`questPaid` with `quest: "fares"`): a Coke Zero in his free hand for 3 s if cans came (the can's picture at `handFar`), and nuts spilling from his pockets for 2 s if the smash did (a `nuts` particle recipe at his hips); the probe `window.__next.hero.walkOut = { can: number; nuts: number }` (seconds left of each).
  - Sound: `fdThrow` `["whoosh"]`; `fdStick` a booking `["thunk", "print", "ding"]`, else `["thunk"]`; `fdPreferred` `["boom"]`; new `thunk()` (a short low noise and a 90 Hz blip) and `print()` (a fast ticking burst) on `AudioBus`. Feel: `fdStick` trauma 0.15.
  - Lines: `GATE_INSULTS`, `GATE_GLOATS`, `GATE_PISSED`, `SAMPLE_LINES` as thoughts, the design's §7 and §9 lines word for word.
  - Boards: kinds `"gate"` (four moments: the opening, a throw in flight, a streak with the crowd oohing, a miss with the steam), `"gate-thumb"`, `"gate-throw"` (his throw and his lob, ten frames each, half again as large), `"box-bonk"` (a box in flight, the bonk, the birds over a frozen bellhop and a frozen student); `look-boards.mjs` saves `gate-look-1..4.png`, `gate-throw.png`, `box-bonk.png`.

- [ ] **Step 1: The failing tests** (in `scripts/render.check.mjs`)

```js
import { gateLayout, PERSON } from "../src/render/quests/gate-layout.ts";
import { MAP, CITY_CODES, cityAt, TAGS, fareFor, classOf } from "../src/sim/quests/fares/board.ts";
import { FARES } from "../src/sim/quests/fares/fares.ts";

const SHAPES = [[1280, 800], [1920, 1080], [1440, 1080], [2560, 1080], [390, 844], [844, 390], [360, 780]];
const INSETS = { top: 64, bottom: 44 };
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** The largest tag a city can wear, in world px: its full fare's, or a bonus tag's. */
const biggest = (l, c) => {
  const cls = classOf(fareFor(c, false));
  const s = { w: Math.max(TAGS[cls].w, TAGS.seating.w), h: Math.max(TAGS[cls].h, TAGS.seating.h) };
  const p = cityAt(c);
  return { x: l.map.x + p.x - s.w / 2, y: l.map.y + p.y - s.h / 2, w: s.w, h: s.h };
};

test("the gate fits every screen: the board, the ladder, Hammer and the travelers' heads in the frame between the bars", () => {
  for (const [w, h] of SHAPES) {
    const l = gateLayout(w, h, INSETS);
    const f = l.frame;
    for (const r of [{ x: l.board.x, y: l.board.y, w: 1180, h: 720 }, l.ladder, { x: l.hammer - 80, y: l.floor - PERSON.stand.h, w: 160, h: PERSON.stand.h }])
      assert.ok(r.x >= f.x - 1 && r.y >= f.y - 1 && r.x + r.w <= f.x + f.w + 1 && r.y + r.h <= f.y + f.h + 1, `${w}x${h}: ${JSON.stringify(r)} outside`);
    assert.equal(l.upright, w < h);
  }
});

test("nobody stands or sits over a city's tag, and the map's bottom is 150 above the floor, so the agent's head and shoulders cover its lowest 160", () => {
  for (const [w, h] of SHAPES) {
    const l = gateLayout(w, h, INSETS);
    assert.ok(Math.abs(l.floor - (l.map.y + MAP.h) - 150) <= 1, `${w}x${h}`);
    assert.ok(l.floor - 320 <= l.map.y + MAP.h - FARES.agent.band, `${w}x${h}: the agent reaches the band`);
    const people = [
      { x: l.hammer - PERSON.stand.w / 2, y: l.floor - PERSON.stand.h, w: PERSON.stand.w, h: PERSON.stand.h },
      { x: l.podium - PERSON.stand.w / 2, y: l.floor - PERSON.stand.h, w: PERSON.stand.w, h: PERSON.stand.h },
      ...Object.values(l.travelers).map((x) => ({ x: x - PERSON.seat.w / 2, y: l.floor - PERSON.seat.head, w: PERSON.seat.w, h: PERSON.seat.head })),
    ];
    for (const c of CITY_CODES.filter((c) => c !== "SAT"))
      for (const p of people) assert.ok(!overlaps(p, biggest(l, c)), `${w}x${h}: someone over ${c}`);
  }
});

test("the gate's sounds: a whoosh on the throw, a thunk on the stick, the printer and a ding on a booking, a boom at A1", () => {
  assert.deepEqual(cuesFor({ type: "fdThrow", at: { x: 0, y: 0 } }), ["whoosh"]);
  assert.deepEqual(cuesFor({ type: "fdStick", at: { x: 0, y: 0 }, outcome: "book", booking: null, points: 342, tag: 1 }), ["thunk", "print", "ding"]);
  assert.deepEqual(cuesFor({ type: "fdStick", at: { x: 0, y: 0 }, outcome: "miss", booking: null, points: 0, tag: null }), ["thunk"]);
  assert.deepEqual(cuesFor({ type: "fdPreferred" }), ["boom"]);
});
```

(The podium's standing agent behind it is checked here at rest; her crossing is the one thing allowed over the map.)

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/render.check.mjs`
Expected: FAIL (no `gate-layout.ts`).

- [ ] **Step 3: `fitFrame` and `gateLayout`** (the layout's numbers chosen so its two tests pass at every shape)

- [ ] **Step 4: `RouteBoard`, `GateView`, the look's wiring, the sounds, the lines and the boards** (per the Interfaces)

- [ ] **Step 5: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/sim src/game scripts`
Expected: PASS.

- [ ] **Step 6: Look** (the paintings or the drawn stand-ins, whichever are in)

Run: `node scripts/look-boards.mjs http://127.0.0.1:8090/ "" gate,moves` and the shuttle door in the browser panel (`?next=1&dev=1`, `__next.dev.teleport(9100, 0)`, ↓). Look at every board at full size: the board readable, the tags centered on their cities, Texas's labels apart, the crosshair and its trail, the throw frame by frame (the scalpel in his fist, nothing over his face), the scalpel's flight and stick, the travelers seated behind the seat backs with their reactions, the agent's crossing over the map's lower right, the planes behind the glass, feet on the floor, the steam on a miss; then the same at 390 by 844 and 844 by 390. Fix what is wrong before committing.

- [ ] **Step 7: Commit and push**

```bash
git add src/render/quests/gate-layout.ts src/render/quests/gate-board.ts src/render/quests/gate-scene.ts src/render/quests/frame.ts src/render/quests/diner.ts src/render/look.ts src/render/app.ts src/render/sound.ts src/game/audio.ts src/sim/feel.ts src/render/boards.ts scripts/look-boards.mjs src/game/lines.ts scripts/render.check.mjs
```

Message: "Gate B7 drawn: the route map with its fares, the crosshair, the ladder, the printer, the gate agent, the travelers in their seats and Hammer throwing scalpels at shift size". Push.

---

### Task 11: The shell: the round's screen, its card and tally, the start screen's card and the pad

**Files:**
- Modify: `src/components/next-game.tsx`, `next-veil.tsx`, `next-hud.tsx`, `next-start.tsx`, `next-touch.tsx`, `next-keys.ts` (`GATE_KEYS`), `src/routes/index.tsx`, `src/styles.css`, `src/render/look.ts` (`Look.newQuest(id?: QuestId)`), `scripts/start-art.mjs`, `scripts/next-start.check.mjs`
- Create: `public/start/gate.webp`
- Test: `scripts/next-start.check.mjs`

**Interfaces:**
- Consumes: Tasks 6, 8 and 10.
- Produces:
  - `next-game.tsx`: `FARES_BEST_KEY = "hammer-time-best-fares"`; `faresBest`, written when a fares tally shows (door or practice); `bestBefore` per quest (Task 1); the prop `quest?: QuestId`; `playQuest(id: QuestId)`; the pad lit at the gate as `{ jump: true, hammer: true, fire: true, super: true, run: steady > 0, lecture: true }` and unlit otherwise; `boxes` to the pad in the shift; the cards on the right half on a wide screen for either quest.
  - `next-veil.tsx`: the gate's card (eyebrow "Side quest", "Fare Darts", "Gate B7 · SAT", the door's prize line "Book fares to bring home boxes of #15 blades", practice's "From the AIRPORT SHUTTLE door, every fare booked brings home a box of #15 blades"); its tally (the grade; the score and the best, "New best" by `isNewBest`; the passes fanned out, one per booking: the city's code, the class ("Wanna Get Away", "Anytime", "Business Select", "ASSIGNED SEATING", "BAG FEE") and his group after it; the lines: bookings by class, Companion Passes, the bonus tags, the cancelled flight, misses, the best streak; the prize from the door, "Bringing home: 6 boxes of #15 blades · +9 cans · a full smash · an extra life" with only what was won, or practice's "From the door this would bring home …"; "Back to the lobby", or "Play again" and "Start screen"); the break card lists `GATE_KEYS`.
  - `next-hud.tsx`: on a touch screen (the pad showing) the round's default hint reads "Tap to throw · hold Run to steady · Lecture mouths off" in place of the keyboard's; in the gate's round "Fare Darts" and "Gate B7" in the venue's place, ten small scalpels (the spent ones dim) in the clock's place, the panel's rows "Steady" (a meter of `steady / steadyMax`), "Boarding" (`position`) and "Streak" (×n while `streak >= 3`); in the shift a box with the count beside the doggy bag and the belly-flop while `boxes > 0` (`.next-hud__boxes`).
  - `next-start.tsx`: `faresBest` and `onQuest(id: QuestId)`; a second card, `aria-label="Play Fare Darts"`, `/start/gate.webp`, "Fare Darts", "Gate B7 · best 000000".
  - `routes/index.tsx`: `quest: search.quest === "hungry" || search.quest === "fares" ? search.quest : undefined`.
  - `start-art.mjs`: `gate.webp` from the board kind `"gate-thumb"`, 640 wide, as the banquet's.

- [ ] **Step 1: The failing checks**

In `scripts/next-start.check.mjs`: the Side quests row has two cards, "Play Hungry Hungry Hammer" and "Play Fare Darts", both in view with no horizontal overflow at 1280 by 800, 390 by 844 and 844 by 390; "Play Fare Darts" opens the gate's card ("Fare Darts") while the game loads; a practice round's score stays out of the shift's best.

Run: `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/next-start.check.mjs http://127.0.0.1:8090/`
Expected: FAIL (one card).

- [ ] **Step 2: The shell** (per the Interfaces)

- [ ] **Step 3: The card's picture**

Run: `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/start-art.mjs http://127.0.0.1:8090/`
Expected: `public/start/gate.webp` written; look at it.

- [ ] **Step 4: Run the checks**

Run: `git hash-object src/routeTree.gen.ts` (expect `dceedffdc12c32138e81bb63787cac7ae5d97fcd`), `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/components src/routes src/render scripts`, then `next-start`, `hungry-browser` and `next-browser` with `BROWSER_SMOKE_CHANNEL=chrome` against 8090
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/components/next-game.tsx src/components/next-veil.tsx src/components/next-hud.tsx src/components/next-start.tsx src/components/next-touch.tsx src/components/next-keys.ts src/routes/index.tsx src/styles.css src/render/look.ts scripts/start-art.mjs scripts/next-start.check.mjs public/start/gate.webp
```

Message: "Fare Darts on the start screen's Side quests row, its card, its HUD with ten scalpels and the steady hand, its tally of printed boarding passes, and /?quest=fares". Push.

---

### Task 12: Every check, the docs, the review and the owner's play-test

**Files:**
- Create: `scripts/fares-browser.check.mjs`, `docs/superpowers/handoff-<date>-r6.md`
- Modify: `README.md`, `docs/superpowers/specs/2026-10-18-r5-fare-darts-design.md` (as built), `art/ART-REQUEST.md`

- [ ] **Step 1: The gate's browser check** (`scripts/fares-browser.check.mjs`, in the shape of `hungry-browser.check.mjs`)

At 1280 by 800, `?next=1&title=1&dev=1`, the fares best cleared: "Play Fare Darts" to the card and the round ("Fare Darts" in the HUD); `__next.dev.fares({ calm: true, tag: { city: "AUS" }, pin: "AUS" })` and Space: a booking (`__next.quest.booked` 1, the score up); `pin` on the bare map and Space: a miss; Space mashed through a windup throws once; Shift held: `steady` falls; `e`: an `fdInsult` (count it in `__next.run.events`); Escape mid-flight: the round's time and the shot hold, and on the way back the scalpel lands once; a blur releases Shift; the three screen shapes mid-round (the board's `frame` in view under the top bar, no scrolling, the pad's ten buttons on the phones); `__next.dev.questSkip()`: the tally (the grade, Play again, Start screen, the best in `hammer-time-best-fares`); Space on the tally is Play again and the new round has no `fdThrow` in its first second; Start screen with Enter back to the title; a `&noart=1` round to its tally with no errors; the AIRPORT SHUTTLE door in a shift (`teleport(9100, 0)`, the hint "↓ AIRPORT SHUTTLE · Fare Darts", ↓, `dev.fares({ calm: true })` and three bookings at Austin by `dev.fares`, `questSkip`, the tally's "Back to the lobby" and its prize, Space: back at 9100, `.next-hud__boxes` showing 3, the hint "Gate +… · 3 boxes of #15 blades", `__next.hero.walkOut.can > 0` when cans came, a screenshot of him walking out, the door spent); B held through Continue lobs nothing; at the STAFF ONLY door's server, B lobs a box and `sampleHit` comes with the birds (a screenshot); `/?quest=fares` straight into the round.

Run: `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/fares-browser.check.mjs http://127.0.0.1:8090/`
Expected: PASS, its screenshots saved under `artifacts/`.

- [ ] **Step 2: Every check**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`; with `BROWSER_SMOKE_CHANNEL=chrome` against `http://127.0.0.1:8090/`: `next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `hungry-browser`, `flop-browser`, `fares-browser`, `node scripts/look-boards.mjs http://127.0.0.1:8090/`; then `node scripts/with-app-env.mjs vite build`, restart the preview on 8091, `node scripts/browser-smoke.mjs http://127.0.0.1:8090/?next=1 artifacts/smoke-dev.png`, `node scripts/browser-smoke.mjs http://127.0.0.1:8091/?next=1 artifacts/smoke-preview.png --baseline artifacts/smoke-dev.json`, and the phone's start through the relay (`node artifacts/throttle-proxy.mjs 8092 8091 12 60`, `node artifacts/boot-relay-log.mjs`).
Expected: all pass; the phone's start fetches about what it did (the gate loads behind the start screen, after the lobby).

- [ ] **Step 3: The docs**

- `README.md`: a section "Fare Darts (the AIRPORT SHUTTLE door)" in the shape of the banquet's (the gate and who stands where, the board and its fares, the crosshair and the steady hand, the throw, the ladder and the streak, the hazards, his mouth and the crowd, the grades and the tuning numbers, the door and what comes home, practice and `/?quest=fares`, the paintings and their cuts, the checks and the boards); "The boxes of #15 blades" under the shift; the start screen's two cards; the validation list with `fares-browser`.
- The R5 design: "As built in R5 (date)" notes under each section naming every ruling that changed what the owner sees (this plan's decisions and the ledger's, the tuned numbers).
- `art/ART-REQUEST.md`: §4 (`gate`) and §5 (`gate-agent`) status lines; §6 the scalpel and the box now from the gate sheet.
- `docs/superpowers/handoff-<date>-r6.md` for R6, Marriott status and the lounge (the shape of the R5 handoff).
- The memory files: R5's status.

- [ ] **Step 4: Commit and push**

```bash
git add scripts/fares-browser.check.mjs README.md docs/superpowers/specs/2026-10-18-r5-fare-darts-design.md art/ART-REQUEST.md docs/superpowers/handoff-<date>-r6.md
```

Message: "R5 written up: Fare Darts in the README, the design as built, the art's status, the R6 handoff". Push.

- [ ] **Step 5: The final review** (the executing-plans skill's Final Review: the package from `git merge-base main HEAD` to `HEAD`, one fresh reviewer on the most capable model, this plan's Review Focus verbatim, the ledger's rulings; then the one fix pass, each fix test-first)

- [ ] **Step 6: Stop for the owner's play-test**

Open `http://127.0.0.1:8090/` in the browser panel for the owner and report in product terms with the screenshots and boards: what is new, what to try (the Fare Darts card on the start screen; the AIRPORT SHUTTLE door in a shift, then lobbing the boxes at the staff), every decision taken for them (this plan's list and the ledger's rulings that changed what they see), the tuned numbers, and which paintings are in or still drawn. Each change the owner asks for after playing is its own commit, test-first.

---

## Finish: the merge (only on the owner's explicit yes)

Ask the owner whether to merge `claude/hammer-pass` into `main`. On a clear yes, use superpowers:finishing-a-development-branch (the merge, then push `main` with that yes). Never push `main` otherwise. Update the memory files (`hammer-time-rebuild-status.md`: R5 done, next R6 per its handoff).
