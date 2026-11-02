# Story Phase 1: Act 1 as a Finished Chapter, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The handoff names the method for this phase: superpowers:executing-plans inline, test-first, with the ledger `.superpowers/sdd/2026-11-02-story-phase-1/progress.md` (git-ignored; every ruling with its cost if wrong, as R4 and R5 kept it), and one fresh reviewer on the most capable model at the end of each half.

**Goal:** The game becomes one story with Act 1 finished: a journey of levels that unlock and are saved in the browser, three lives a level with a snapshot behind Try again, a home screen that is Hammer live and insulting, a journey strip, the email and the story cards, Act 1's ending, the prologue at the San Antonio airport ending in Fare Darts at gate B7, one song a place and music under every card, Settings with two volumes and a controller, the floor's edge where the dark band was, every painting crisp at 1920 by 1080, ultra by default on a real video card, and the Service Record. Work the whole shift and both side quests stay exactly as built.

**Architecture:** The story is a pure table (`src/sim/story.ts`: the stops in order, their acts and their cards) and the journey a pure save (`src/sim/journey.ts`: the next open stop, the finished stops, the bests, the snapshot). The `Game` learns a **journey run** (`newRun` with a shift of levels, a snapshot to restore and a hold for the story cards): three lives at every level's card, a `levelDone` event with the level's own score, a `story` mode that holds between levels for the shell's cards, and a `gate` door that opens Fare Darts as a level's set piece and ends the level on its tally. The renderer keeps the stage live in `title` mode and the `Game` steps Hammer alone there (`titleStep`: his idle beats, a snot rocket a minute, an insult every eight seconds as a `think` event), so the home screen is the lobby itself behind a transparent start screen. The shell (`next-game.tsx`) owns the journey: it saves at every card and exit, shows the cards and the strip (`next-strip.tsx`), the Settings (`next-settings.tsx`) and the Service Record, and starts journey runs, replays and Work the whole shift through `Look`. SAT is a level like the others (`src/sim/levels/sat.ts`) with three new cast jobs, lessons in the hint line and thoughts at marks. Music is one `Song` a place in `src/game/audio.ts`, with two volumes on the bus.

**Tech Stack:** TypeScript, React 19, TanStack Start, PixiJS 8, Web Audio, the Gamepad API, sharp, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md` (§1 to §7, §13 to §16, §18 to §20) over `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§2 hard limits, §10 HUD and shell, §15 testing); the R5 design `2026-10-18-r5-fare-darts-design.md` for the round as built. Roadmap: `docs/superpowers/plans/2026-11-02-story-roadmap.md`. Handoffs: `docs/superpowers/handoff-2026-11-02-phase-1.md` (this phase's), `handoff-2026-10-25-r6.md` (the environment, the deferred minors, the gate paintings' steps). Art: `art/outgoing/batch-10-story-phase1.txt` (the brief), `art/outgoing/batch-story-phase1-codex.txt` (the owner's prompts), `art/outgoing/batch-r5-codex.txt` (the gate's, unchanged).

## Global Constraints

- **Three lives a level:** "Every level starts on its card with three lives, two patience pips and its clock: 420 s for a venue (SAT's clock reads as boarding time, 7:00)". "Hammer down (no lives left): the card "Hammer down" with Try again and Journey. Try again restarts *this level* from its card with the run exactly as it was at that card". "The exit counts the leftover clock at 50 points a second as built, then the next level's card". (spec §4.2)
- **Carries:** "Within an act the run carries as a shift does today: score, cans, the smash charge, patience pips, the pepper, the boxes of #15 blades, the doggy bag, the belly-flop, the spent doors. A new act starts him clean (a fresh `Run`)". "At every level's card the game takes a snapshot of the run; Try again after Hammer down restores it". (§4.3; this plan's decision 1 says the prologue flows into Act 1)
- **Scores:** "A level's score is what he scored inside it: the run's score at its exit minus the run's score at its card, the clock bonus included. The HUD keeps showing the running score of the act". Each level's best on its strip card, the act's total on its header, the journey's total in place of "Personal best", lifetime staff bonked. "`hammer-time-best-next` is the best of "Work the whole shift", `hammer-time-best-banquet` and `hammer-time-best-fares` the side quests'." (§4.4)
- **The save:** `hammer-time-journey`, JSON, `{ v: 1; next: LevelId; done: LevelId[]; best: Partial<Record<LevelId, number>>; bonked: number; run: Run | null; credits: boolean }`, "Written at every level's card and at every exit". "New game sits with the tools and asks before wiping ("Start over? The journey and its bests are erased."); the side quests' bests and the whole-shift best survive it. A journey from a later version is migrated, never thrown away." (§4.5; decision 2 adds `carry`)
- **Replays:** "A finished level replays from the strip with a fresh three lives and a fresh run (no carries, no status) and can set a new best; it never moves `next` or touches the snapshot. The pig's "Practice over" wording goes: a replay ends on the level's own exit card with its score and best." "For Act 1 that is Work the whole shift: today's game, today's rules, today's best, untouched." (§4.6)
- **The checks' links:** "`/?next=1&level=<id>` starts any level fresh (the old `&venue=` aliases stay); `&journey=all` opens every stop for the page without saving; `/?quest=hungry` and `/?quest=fares` stay." (§4.7)
- **The home screen:** "The engine renders a real scene behind the title, with Hammer in it at idle, and the key art (`public/start/key-art.webp`) stays only as the first thing painted while the engine wakes, cross-faded away once the scene runs." The scene before and during Act 1: "the lobby by the desk, as the key art is now". The idle beats "the watch check at 2.5 s, a foot tap at 5 s, a harrumph and "Any day now." at 8 s, and a snot rocket about once a minute, all through the face check." The insults: "Every eight seconds or so while the player has not clocked in, a thought bubble from a shuffled pool, each once a visit, written never spoken", the twelve lines of §5.1 word for word. "The title sequence stays". "The camera's lean with the mouse stays; the scene leans with it." (§5.1)
- **The strip:** "every stop in order, grouped under headers (Prologue · Act 1 The Trip · Act 2 Status Crusade · Act 3 The Last Tour · Epilogue), one scrolling strip along the bottom, arrow keys and the wheel moving it, the open stop centered on arrival." Finished: "gold, its picture, its code and name, "best 012345"". Next: "lit, its picture, marked Next; Clock in starts it." Locked: "dim, no picture (its code and a lock only, so nothing is spoiled), not clickable." An act header "shows the act's title and total; once the act is finished it offers the straight-through run". "The Side quests row stays under the strip exactly as built." (§5.2) Tools: Settings, New game; "Three acts. Zero patience." "Bonk the staff. Dodge the paper. Get to Basel." (§5.3)
- **The email:** "From: Basel office · To: Hammer · Subject: Your transition · Training is moving to video. Please come to Basel on the 14th to discuss your transition. Safe travels." His thought "Transition." Continue. "It shows once a journey (a New game shows it again) and replays from the SAT card's picture." (§6.1)
- **SAT:** "SAT · San Antonio International · Boarding in 7:00. Left to right, about 8,000 px ... one punch clock at the concourse. The clock is the boarding clock: 420 s shown as 7:00." The five stretches, their x ranges and contents of §6.2 word for word; the cast "the skycap ... two TSA agents ... the bartender (server-1 in a black apron, recolored), the travelers"; "Rules as the lobby's cast: two attackers at a time"; "The hint line teaches the moves here in order: jump, run, slide, swing, snot, the towel". The lines of §6.2 word for word. (§6.2)
- **The gate:** "Walking into B7 starts Fare Darts as the level's set piece: the round as built ... at shift size, with the gate's paintings cut in. Its tally pays into the run exactly as the AIRPORT SHUTTLE door does ..., and the agent's call is the exit: "Now boarding... just Mr. Hammer." Then a card, "Three hours later. The hotel.", and 1-1's card. The boxes he brings home are what he carries into Act 1." The lobby's AIRPORT SHUTTLE door is untouched. (§6.3)
- **Act 1's ending:** after the gift shop's tally, "a phone card, "Marriott Bonvoy: Your status has been reviewed.", his thought "Reviewed.", then the act card "Act 1 · The Trip · complete" with the act's total and its best, and Continue to 2-1's card. In Work the whole shift the "Shift over" card stays as built." The cards between venues: "Three hours later. The hotel." then the venue card; "Your shift goes on" between 1-1, 1-2, 1-3 and 1-4. (§7)
- **Music:** the table of §13 for the home screen, SAT, 1-1 to 1-4, the stash and the two side quests; "Music plays everywhere it is silent today: the home screen's title tune, a level's theme quietly under its card and at full at play, the tally on the theme, a four-note sting then silence on Hammer down, a short fanfare on each act's ending." "The crowd never speaks aloud." (§13)
- **Settings:** "music volume and effects volume (two sliders, 0 to 100, kept in `hammer-time-sound`; "Sound off" is both at 0), the controller (the Gamepad API, standard mapping: the left stick and d-pad move, A jumps, X swings the hammer, B snots, Y lobs a box, the right bumper runs, the left bumper is the towel, the right trigger the super smash, the left trigger the lecture, Start pauses; a connected pad shows its glyphs in the hint line in place of the keys), the keys (the table as built), quality (Auto, High, Medium, Low; Auto picks ultra on a desktop GPU), and reduced motion following the system." From the home screen and the break card. (§14)
- **The look pass:** "Auto picks `ultra` when the GPU reports a desktop class (WebGPU's adapter info or WebGL's renderer string) and 60 fps holds for the first two seconds; the tiers still step down as built." Crisp at 1080p: republish at full size where soft, "keeping the WebP budget under 20 MB for the first level." The floor band: "the camera frames the floor at about 78 percent of the height on 16:9 ..., and each floor gets a drawn front face in its own material (marble, tile, carpet, terrazzo, the platform's edge) with a contact shadow, so the band is the floor's edge, not darkness. The cards and the hint line keep their place (clear of his face)." The phone keeps working: "the pad's ten buttons, no horizontal overflow at 390 by 844 and 844 by 390". The Service Record in Phase 1; the awards and the slimmer panel in the last phase. The cheap minors in Phase 1's first task; the per-frame churn items in the look pass. The gate's paintings cut in by the R6 handoff's steps. (§15)
- **Done:** `npm run test:next` with the phase's new checks (a pure-sim check file per new level, the journey's save and snapshot), `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`; the rig checks for every new clip; the browser checks at 1920 by 1080 first (60 fps over 5 s at the ultra tier on the dev box), then 1280 by 800, 390 by 844 and 844 by 390: "the home screen with the live scene and an insult, the strip with a locked, a next and a finished stop, a level start to finish, every card, Hammer down and Try again with the snapshot, the save surviving a reload"; look boards for every new level at three camera positions, every new cast member and the home screen; the protected files' hashes; the production build smoked against the dev verdict; README and the spec's "As built" notes. (§19)
- **The rules of §2:** the face rule (head scale 0.26 for him, 0.22 for the cast, the mallet in his fist out in front, every new clip through the face-clearance check); the Affliction shirt; the six recordings and `public/absolute-bullshit.mp3` are the only spoken lines, every other line written; the products as built; the cast pose-locked to `body-affliction.png`, stand-ins never polished, a missing painting never stops a level; never modify `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3` or `public/voice/*`; never stage `package-lock.json` or `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`, checked after every edit to `src/routes/index.tsx`); no `.env`, no auth, no database; the renderer client-only; the save `localStorage`.
- **Owner rules:** plain language, no emojis, decisive on technical matters, never ask the owner to run commands, list every decision made for them. Git has no identity: write the message to `.git/CLAUDE_MSG` with the Write tool (never PowerShell, which adds a BOM) and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, `git add` named paths only, ending with the attribution line the session is given; push `claude/hammer-pass` after each commit, never `main`. Ports 8080 and 8081 belong to another tool: the dev server on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort`), the preview on 8091 (`node scripts/with-app-env.mjs vite preview --host 127.0.0.1 --port 8091 --strictPort`, restarted after every rebuild); browser checks with `BROWSER_SMOKE_CHANNEL=chrome`. Pixi objects cannot be constructed under `node:test`: node tests touch pure functions only; render changes are verified on boards and in the browser. Many source files are CRLF: write code and scripts to files with the Write tool; an exact-string edit script must normalize line endings. Do not edit files under `src/` while a browser check runs.

## Review Focus

1. **The save across versions and broken storage:** a `hammer-time-journey` from a later version, a truncated or hand-edited JSON, a stop id the page does not know (a Phase 2 level on a Phase 1 build), a private window that refuses `localStorage`: the home screen still opens, nothing is thrown away that can be kept, and the journey plays from the earliest stop that still makes sense. Pinned in Task 3 (`parseJourney` over garbage, a later version and an unknown `next`) and Task 5 (the browser: a seeded bad save, the page loads on the strip).
2. **Keys and clicks carried across the new cards:** Space or Enter pressed on the email card, "Three hours later", the Bonvoy card, the act card or the replay's exit card neither jumps nor swings on the first step of the next level, and a key held through Try again does not swing on the restored level's first step; a double click on a strip stop starts it once. Pinned in Task 4 (`continueStory` and the restored run take press edges only) and Task 5 (the browser: Enter through every card, no `jump` or `swing` event in the next level's first second).
3. **The snapshot and what it does not restore:** Try again after Hammer down at 1-3 brings back the score, cans, boxes, doggy bags, the pepper and the spent doors as they stood at 1-3's card, with three lives, a full clock and the level's layout as it was (the same seed), and never the pickups he had already taken in the failed attempt; a replay from the strip carries nothing in and writes nothing to `next` or the snapshot; finishing a replayed level with a worse score keeps the old best. Pinned in Task 4 (the sim) and Task 5 (the browser, a retry and a replay).
4. **The home screen left running:** an hour on the home screen with the mouse idle: the insult pool runs out and stays silent (never repeats within the visit), the snot rockets never cross his face, memory and fps hold (no bubble or particle leak), and a tab hidden and shown again does not pile up insults. A phone turned on the home screen keeps the strip reachable and the title readable. Pinned in Task 7 (`titleStep` over 3,600 s in the sim: exactly twelve `think` events, snot presses only with `sinus >= 1`) and Task 10 (the browser: 60 s on the home screen, fps and the bubble count).
5. **SAT with its paintings missing or half there, and the gate's round ending the level in every way:** `&noart=1` SAT plays to the gate with stand-ins and drawn furniture; Hammer down at the gate's podium (the clock out as he walks in) goes to "Hammer down", not into the round; a life lost inside Fare Darts is impossible (the shift is frozen) but a lost life before the podium brings him back at the concourse's punch clock with the gate still ahead; the round's tally always ends the level, A1's life included, and the Continue key cannot throw a scalpel. Pinned in Task 12 (the sim: the gate door's rules) and Task 15 (the browser: `&noart=1` SAT start to finish).

## Decisions taken for the owner (report these)

The design's decisions were reported with it (spec §20). These are the plan's:

1. **The prologue flows into Act 1.** The spec says a new act starts him clean and also that the boxes from the gate are what he carries into Act 1; the prologue is not an act, so the run is fresh at SAT and carries through 1-1 to 1-4. Act 2 and Act 3 start clean, as written.
2. **The snapshot holds what he carries too.** `Run` has no hero fields, so the save gains `carry` beside `run` (`charge, patience, hot, doggy, flop, boxes`), the six things the spec lists that live on him. A save without `carry` reads as none.
3. **A level starts with three lives or more, never fewer.** Lives he has earned (cans, the gate's A1) carry to the next level of the act; three is the floor. Otherwise A1's life at SAT would be worth nothing, the level ending at the tally.
4. **Lifetime staff bonked** counts every cast member knocked out for good, fled for good or sent down a pit, in every mode (the journey, replays, Work the whole shift), added at each exit and at each Hammer down.
5. **2-1 is "coming" in Phase 1.** Once Act 1 is finished, the strip shows 2-1 lit and marked Next with "Act 2 is coming" in place of Clock in; finished stops replay as usual. Phase 2 removes the notice by building the level.
6. **The story's cards live in the sim's table**, so the checks can read the sequence; the shell only draws them. The `story` mode holds the game between levels while they show; a stop with no cards is passed through without a pause.
7. **The bartender is a student in a black apron:** job `bartender`, role `student` (throws, hops back, is schooled by the lecture, flees from snot), drawn with `server-1`'s painting recolored black, his planes drawn as coasters (`MissileKind "coaster"`, the plane's physics). The skycap is a bellhop with the luggage cart (`skycap`, role `bellhop`); the TSA agents are bellhops without a cart whose shove is a shove of the hands (`tsa`, role `bellhop`; the bellhop fight without a cart gets the shove it never had). The gate's travelers are the seated cast of the gate scene, drawn, never fighting.
8. **The home screen's scene is a level field:** `Level.home: { x: number; cx: number }` is where he stands and where the camera looks (the lobby: `x 1100, cx 1600`, the key art's frame). In `title` mode the cast stands still and never notices him; the snot rocket fires at 45 s and every 60 s after.
9. **The floor band:** the camera's rest focus is set so the walking line sits at 78 percent of the view's height in landscape (`FLOOR_LINE = 0.78`), the dead zone as built; every floor's front face is drawn down to 420 world px below its walking line in its own material, with a 40 px contact shadow under the line, so no landscape aspect shows the ground fill. Portrait keeps its framing.
10. **Ultra means more than high:** ultra keeps the device pixel ratio up to 2, 900 particles, the lamp bloom and the rim light; high 600 particles at a ratio up to 1.5; medium 400 at 1, no bloom; low 300, no glows, no rim. Auto starts at high and moves to ultra after the governor's first two settled windows when the GPU reads as desktop class (NVIDIA, GeForce, RTX, Radeon, AMD or Arc in the adapter's or renderer's string) and the frame rate held 58 or better; it steps down as built.
11. **Crisp at 1080p:** Hammer's body layers and heads and the cast's layers and heads are published at the painting's full size (`TEXTURE_SCALE 1`); the props, hats, silhouettes and the pig's tufts stay at half. The sync refuses a first level (the lobby's registry files) over 20 MB.
12. **Two volumes, one mute:** `hammer-time-sound` is `{ music: 0..100, effects: 0..100, muted: boolean }`; the HUD's speaker button toggles `muted` and keeps the sliders; "Sound off" in the Settings is both sliders at 0. The old page kept no sound setting, so nothing migrates.
13. **The title tune starts at the first key or click**, as browsers allow; until then the home screen is silent.
14. **Each song is a `Song`**, the two side quests' format: "day" and "cellar" become `lobby`, `restaurant`, `campus`, `arena` and `cellar` songs written in it; the procedural chiptune goes.
15. **The controller is read every frame** by `navigator.getGamepads()` with the standard mapping, as a third input source beside the keys and the pad; the hint line swaps key names for pad glyphs through a table while a pad is connected.
16. **The gate's paintings are a task that waits**: it runs when the four files exist, and otherwise the handoff for Phase 2 carries it.

---

## File Structure

- `src/sim/story.ts` (create): `ActId`, `StoryId`, `StoryCard`, `StoryStop`, `ACTS`, `STORY`, `stopOf`, `nextOf`, `actOf`, `firstOfAct`, `builtStops`, `shiftFrom`.
- `src/sim/journey.ts` (create): `JOURNEY_KEY`, `Carry`, `Snapshot`, `Journey`, `newJourney`, `parseJourney`, `serializeJourney`, `finishLevel`, `stopState`, `actTotal`, `journeyTotal`, `migrateJourney`.
- `src/sim/game.ts` (modify): `GameMode` + `"story"`; `Levels.shift?`; `RunOptions`; `Game.journey`, `Game.snapshot`, `Game.continueStory`, `Game.titleStep`; `newRun(seed, start?, opts?)`; the `gate` door; `Run.bonked`.
- `src/sim/run.ts` (`Run.bonked`), `src/sim/events.ts` (`levelDone`, `think`, `lesson`), `src/sim/level.ts` (`LevelId` + `"sat"`, `DoorKind` + `"gate"`, `CastPerson` + `"skycap-1" | "tsa-1" | "bartender-1"`, `FurnitureKind` + the airport's, `Level.home`, `Level.lessons`, `Level.thoughts`, `Level.music: SongId`), `src/sim/levels/sat.ts` (create), `src/sim/levels/lobby.ts` (`home`, `music`), `restaurant.ts`, `campus.ts`, `giftshop.ts`, `stash.ts` (`music`), `src/sim/cast.ts` (`ROLE_OF`, `CAST`, the handless shove), `src/sim/cast-behavior.ts` (the TSA shove, the bartender's coaster), `src/sim/missiles.ts` (`"coaster"`), `src/sim/world.ts` (`still`), `src/sim/drive.ts` (the belt and the gate) (modify).
- `src/game/lines.ts` (`HOME_INSULTS`, `SAT_THOUGHTS`, `JOB_LINES.skycap/tsa/bartender`), `src/game/audio.ts` (`SongId`, `SONGS` for every place, `setVolumes`, `sting`, `fanfare`) (modify).
- `src/render/look.ts` (`Look.startJourney`, `continueStory`, `onTitleScene`, the title scene, music by mode, the gamepad, SAT's view), `src/render/scene.ts` (`FLOOR_LINE`, `floorFocus`), `src/render/venue.ts`, `venue-restaurant.ts`, `venue-campus.ts`, `venue-giftshop.ts` (the front faces), `src/render/venue-sat.ts` (create), `src/render/sound.ts` (`setVolumes`, `music(theme, quiet?)`), `src/render/app.ts` (`gpuClass`, the tiers), `src/render/quality.ts` (`TIERS`, `firstTier`), `src/render/gamepad.ts` (create), `src/render/hud.ts` (`HudPayload.bonked`, `pad`, lessons), `src/render/cast.ts` (`LOOKS`), `src/render/props.ts` (the coaster), `src/render/boards.ts` (`START_FRAMES.sat`, `VENUE_FRAMES.sat`, the home board), `src/render/backdrop.ts` (`GROUND` under the faces), `src/render/particles.ts` (the tier's count) (modify).
- `src/components/next-game.tsx` (the journey, the saves, the cards' wiring), `next-start.tsx` (the live scene, the tools), `next-strip.tsx` (create), `next-settings.tsx` (create), `next-record.tsx` (create: the Service Record), `next-veil.tsx` (the story cards, Hammer down's Journey, the replay's exit card, the act card), `next-hud.tsx` (the pad glyphs, Settings from the break card), `next-keys.ts` (`PAD_GLYPHS`), `src/styles.css`, `src/routes/index.tsx` (`level`, `journey`) (modify).
- `src/art/registry.ts` (`Registry.sat`, `SAT_PIECES`), `scripts/art-cut.mjs` (`TEXTURE_SCALE` per kind, `nameSatPieces`), `scripts/art-sync.mjs` (`CAST_PERSONS`, the SAT sheet, the budget), `scripts/art-grid.mjs` (`sat/sheet`) (modify); `art/cuts/cast-skycap-1.json`, `art/cuts/cast-tsa-1.json`, `art/cuts/wall-sat-far-1..3.json` (create when the paintings are in).
- `scripts/start-art.mjs` (`sat`), `scripts/look-boards.mjs` (`sat`, `home`), `public/start/sat.webp` (create, committed) (modify).
- Tests: `scripts/journey.check.mjs` (create, in `test:next` after `venues.check.mjs`), `scripts/sat.check.mjs` (create, after `journey.check.mjs`), `scripts/music.check.mjs` (create, after `voice.check.mjs`), `scripts/journey-browser.check.mjs` (create), `scripts/sat-browser.check.mjs` (create); `scripts/lobby.check.mjs`, `fares.check.mjs`, `render.check.mjs`, `art.check.mjs`, `cast.check.mjs`, `next-start.check.mjs`, `next-browser.check.mjs`, `shift-browser.check.mjs` (modify).
- Docs: `README.md`, the spec's "As built" notes, `docs/superpowers/handoff-<date>-phase-2.md`.
- The ledger: `.superpowers/sdd/2026-11-02-story-phase-1/progress.md` (git-ignored).

Every check file keeps the input boilerplate at its top (`NONE`, `input`, `of`, `until`, `play`, `stepsG` as `scripts/lobby.check.mjs:252-255` has them); later tasks add their imports beside the others and their tests below.

---

# Part A: the spine and the look (Phase 1a)

Before Task 1: ask the owner for the merge of `claude/hammer-pass` into `main` (never push `main` yourself) and to run the two gate prompts in `art/outgoing/batch-r5-codex.txt`; then carry on. Neither answer blocks Part A.

### Task 1: The cheap minors

**Files:**
- Modify: `src/render/look.ts` (`onBlur`, `onPointer`, the resume path, the gate's round end), `src/sim/quests/fares/fares.ts` (the miss lines), `src/components/next-veil.tsx` (the break card on touch), `src/components/next-game.tsx` (`touch` into the veil), `src/render/boards.ts` (the `moves` board's throw), `src/render/cast.ts:67` (the nurse comment)
- Test: `scripts/fares.check.mjs`, `scripts/sim.check.mjs`, `scripts/fares-browser.check.mjs`

**Interfaces:**
- Produces: `VeilInfo.touch: boolean` (the pad is showing: the break card names the pad's buttons); `TOUCH_KEYS: [string, string][]` and `GATE_TOUCH_KEYS` in `src/components/next-keys.ts` (the pad's words: "Jump", "Hammer", "Snot", "Run", "Towel", "Smash", "Lecture", "Box", "← →", "↓").

- [ ] **Step 1: The failing tests**

In `scripts/fares.check.mjs`:

```js
test("the miss lines come on every miss, not once a round", () => {
  const q = createFares(5, { tags: false, hazards: false, mouth: false });
  const misses = () => of(q.events, "fdThink").filter((e) => /demo unit|Denver/.test(e.text)).length;
  let seen = 0;
  for (let k = 0; k < 4; k++) {
    q.pin = { x: 20, y: 20 };
    q.events = [];
    stepFares(q, input({}, { jump: true }), STEP);
    for (let i = 0; i < Math.round((FARES.windup + FARES.flight + 0.1) / STEP); i++) stepFares(q, input(), STEP);
    seen += misses();
  }
  assert.ok(seen >= 3, `a miss line on (nearly) every miss, saw ${seen}`);
});
```

In `scripts/sim.check.mjs` (import `inputFrom` from `../src/sim/input.ts`):

```js
test("a key already held when play resumes is held, not pressed", () => {
  const down = new Set(["Space"]);
  const i = inputFrom(down, new Set(), { ...NONE, jump: true });
  assert.deepEqual([i.held.jump, i.pressed.jump], [true, false]);
});
```

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/fares.check.mjs scripts/sim.check.mjs`
Expected: the fares test FAILS (one miss line a round); the sim test passes already (the helper is right; the bug is the look's resume path, pinned in the browser in Step 4).

- [ ] **Step 3: The fixes**

`fares.ts`: the miss lines are not added to `q.said` (every other thought stays once a round). `look.ts`: `onBlur` also clears the gate's `pointers` map, and so does the gate's round end (where `q.result` first appears); `onPointer` throws only for `e.button === 0`; on resume from a break (`togglePause` back to play or quest) set the previous held set to what is down now, so the first step back sees no new press (`forgetPresses()` already exists for the way in: use its idea on the way out). `next-veil.tsx`: with `info.touch`, the break card lists `GATE_TOUCH_KEYS` at the gate, `TOUCH_KEYS` elsewhere, in place of the keyboard's. `boards.ts`: the `moves` board draws the throw with the scalpel in his fist (as `gate-throw` does), not the mallet. `cast.ts`: move the R4 nurse comment above the nurse's look.

- [ ] **Step 4: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`, then (the dev server up on 8090) `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/fares-browser.check.mjs http://127.0.0.1:8090/`. Add to `fares-browser.check.mjs` first: a right-click on the gate's canvas throws nothing (`__next.run.events.fdThrow` unchanged); P, Space held, P: no `jump` within 0.2 s.
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/render/look.ts src/sim/quests/fares/fares.ts src/components/next-veil.tsx src/components/next-game.tsx src/components/next-keys.ts src/render/boards.ts src/render/cast.ts scripts/fares.check.mjs scripts/sim.check.mjs scripts/fares-browser.check.mjs
git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG
git push origin claude/hammer-pass
```

Message: "The cheap minors: miss lines on every miss, left clicks only at the gate, pointers cleared on blur, no press on the first step back from a break, the pad's words on the break card".

### Task 2: The story table

**Files:**
- Create: `src/sim/story.ts`
- Modify: `src/sim/level.ts:120` (`LevelId`)
- Test: `scripts/journey.check.mjs` (create; add it to `package.json`'s `test:next` list after `scripts/venues.check.mjs`)

**Interfaces:**
- Produces, in `src/sim/story.ts`:
  - `type ActId = "prologue" | "act1" | "act2" | "act3" | "epilogue"`
  - `type StoryId = "sat" | "lobby" | "restaurant" | "campus" | "arena" | "lobby-night" | "tower" | "hallway" | "suite" | "flight" | "paris" | "train" | "basel" | "lab" | "replacement"` (the fifteen of spec §4.1, in order)
  - `type StoryCard = { kind: "email" } | { kind: "caption"; text: string } | { kind: "phone"; app: string; text: string; thought: string } | { kind: "act"; act: ActId }`
  - `type StoryStop = { id: StoryId; code: string; name: string; act: ActId; before?: StoryCard[]; after?: StoryCard[] }`
  - `const ACTS: Record<ActId, { title: string; straight: string | null; straightKey: string | null }>`: prologue "Prologue" (no straight run), act1 "Act 1 · The Trip" ("Work the whole shift", `hammer-time-best-next`), act2 "Act 2 · Status Crusade" ("Play the night straight through", `hammer-time-best-act2`), act3 "Act 3 · The Last Tour" ("Play the tour straight through", `hammer-time-best-act3`), epilogue "Epilogue" (none).
  - `const STORY: readonly StoryStop[]`: sat "SAT" "San Antonio International" prologue, `before: [{ kind: "email" }]`, `after: [{ kind: "caption", text: "Three hours later. The hotel." }]`; lobby "1-1" "Hotel lobby" act1; restaurant "1-2" "Restaurant"; campus "1-3" "Campus"; arena "1-4" "The Pink Menace", `after: [{ kind: "phone", app: "Marriott Bonvoy", text: "Your status has been reviewed.", thought: "Reviewed." }, { kind: "act", act: "act1" }]`; lobby-night "2-1" "The lobby at night" act2; tower "2-2" "The tower"; hallway "2-3" "The fourteenth floor"; suite "2-4" "The suite"; flight "3-1" "Row 52" act3; paris "3-2" "Paris"; train "3-3" "The 14:02"; basel "3-4" "Basel, Tattoo week"; lab "3-5" "The Basel office"; replacement "3-6" "The replacement". Later phases add the other stops' cards.
  - `stopOf(id: StoryId): StoryStop`, `nextOf(id: StoryId): StoryId | null` (null after `replacement`), `actOf(id: StoryId): ActId`, `firstOfAct(id: StoryId): boolean` (true for `sat`, `lobby-night`, `flight`; false for `lobby`, decision 1), `builtStops(levels: ReadonlyMap<string, unknown>): StoryId[]` (the stops in order whose id the map holds), `shiftFrom(id: StoryId, levels: ReadonlyMap<string, Level>): Level[]` (that stop's level and every built stop after it to the end of its act; for `sat`, through `arena`).
- `LevelId` in `src/sim/level.ts` becomes `"sat" | "lobby" | "stash" | "restaurant" | "campus" | "arena"` (the built ones; `StoryId` is the story's, `LevelId` the levels that exist).

- [ ] **Step 1: The failing tests**

In `scripts/journey.check.mjs` (new; imports `STORY`, `ACTS`, `stopOf`, `nextOf`, `actOf`, `firstOfAct`, `builtStops`, `shiftFrom` from `../src/sim/story.ts` and the five levels):

```js
test("the story is fifteen stops in the spec's order with their codes", () => {
  assert.deepEqual(STORY.map((s) => s.code), ["SAT", "1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2", "3-3", "3-4", "3-5", "3-6"]);
  assert.deepEqual([nextOf("sat"), nextOf("arena"), nextOf("replacement")], ["lobby", "lobby-night", null]);
  assert.deepEqual([actOf("sat"), actOf("arena"), actOf("suite"), actOf("flight")], ["prologue", "act1", "act2", "act3"]);
  assert.deepEqual(["sat", "lobby", "lobby-night", "flight", "paris"].map(firstOfAct), [true, false, true, true, false]);
});
test("the cards: the email before SAT, the hotel after it, the phone and the act card after the pig", () => {
  assert.deepEqual(stopOf("sat").before, [{ kind: "email" }]);
  assert.deepEqual(stopOf("sat").after, [{ kind: "caption", text: "Three hours later. The hotel." }]);
  assert.deepEqual(stopOf("arena").after, [{ kind: "phone", app: "Marriott Bonvoy", text: "Your status has been reviewed.", thought: "Reviewed." }, { kind: "act", act: "act1" }]);
  assert.equal(stopOf("lobby").after, undefined);
  assert.deepEqual([ACTS.act1.straight, ACTS.act1.straightKey, ACTS.prologue.straight], ["Work the whole shift", "hammer-time-best-next", null]);
});
test("the built stops and the shift from a stop run to the end of the act", () => {
  const levels = new Map([LOBBY, RESTAURANT, CAMPUS, GIFTSHOP].map((l) => [l.id, l]));
  assert.deepEqual(builtStops(levels), ["lobby", "restaurant", "campus", "arena"]);
  assert.deepEqual(shiftFrom("campus", levels).map((l) => l.id), ["campus", "arena"]);
  assert.deepEqual(shiftFrom("arena", levels).map((l) => l.id), ["arena"]);
});
```

- [ ] **Step 2: Run it**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/journey.check.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/sim/story.ts`** with the interfaces above; add `"sat"` to `LevelId`.

- [ ] **Step 4: Run it, then the full checks**

Run: the file, then `npm run test:next` and `npx tsc --noEmit`.
Expected: PASS.

- [ ] **Step 5: Commit and push** (`src/sim/story.ts`, `src/sim/level.ts`, `scripts/journey.check.mjs`, `package.json`): "The story table: fifteen stops in three acts, their codes, their cards".

### Task 3: The journey's save

**Files:**
- Create: `src/sim/journey.ts`
- Modify: `src/sim/run.ts` (`Run.bonked`, `createRun`)
- Test: `scripts/journey.check.mjs`

**Interfaces:**
- Consumes: `StoryId`, `nextOf`, `firstOfAct`, `actOf`, `STORY` (Task 2); `Run`, `createRun` (`src/sim/run.ts`).
- Produces, in `src/sim/journey.ts`:
  - `const JOURNEY_KEY = "hammer-time-journey"`
  - `type Carry = { charge: number; patience: number; hot: boolean; doggy: number; flop: boolean; boxes: number }`
  - `type Snapshot = { run: Run; carry: Carry }`
  - `type Journey = { v: 1; next: StoryId; done: StoryId[]; best: Partial<Record<StoryId, number>>; bonked: number; run: Run | null; carry: Carry | null; credits: boolean }`
  - `newJourney(): Journey` (`next: "sat"`, nothing done, no bests, bonked 0, run and carry null, credits false)
  - `parseJourney(json: string | null): Journey`: null, unparsable, or not an object gives `newJourney()`; a `v` above 1 is migrated by `migrateJourney` (keeps every field it recognizes); `done` keeps only known ids in story order; `best` keeps known ids with finite non-negative numbers; `next` unknown becomes the stop after the last done one (or `"sat"`); `run` and `carry` that fail their shape become null; `bonked` a finite non-negative integer or 0.
  - `serializeJourney(j: Journey): string`
  - `finishLevel(j: Journey, id: StoryId, score: number, snapshot: Snapshot | null): Journey`: a new journey with `id` added to `done` once (in story order), `best[id] = max(old, score)`, and when `id === j.next`: `next = nextOf(id) ?? id`, `run`/`carry` = the snapshot unless `firstOfAct(next)` (then null). When `id !== j.next` (a replay) `next`, `run` and `carry` are untouched.
  - `stopState(j: Journey, id: StoryId): "done" | "next" | "locked"`
  - `actTotal(j: Journey, act: ActId): number` (the sum of the act's stops' bests), `journeyTotal(j: Journey): number`
  - `migrateJourney(raw: unknown): Journey`
- `Run.bonked: number` (every cast member knocked out for good, fled for good or sent down a pit this run; `createRun` starts it at 0).

- [ ] **Step 1: The failing tests**

In `scripts/journey.check.mjs` (import the journey's exports and `createRun`):

```js
const snap = (score, boxes = 2) => ({ run: { ...createRun(7), score, cans: 12, spent: ["buffet"] }, carry: { charge: 4, patience: 2, hot: true, doggy: 1, flop: true, boxes } });
test("a new journey starts at SAT with nothing done", () => {
  assert.deepEqual(newJourney(), { v: 1, next: "sat", done: [], best: {}, bonked: 0, run: null, carry: null, credits: false });
  assert.deepEqual(parseJourney(null), newJourney());
  assert.deepEqual(parseJourney("{not json"), newJourney());
});
test("finishing the next stop opens the one after it and keeps the snapshot; the prologue flows into Act 1", () => {
  let j = finishLevel(newJourney(), "sat", 3200, snap(3200));
  assert.deepEqual([j.next, j.done, j.best.sat, j.run.score, j.carry.boxes], ["lobby", ["sat"], 3200, 3200, 2]);
  j = finishLevel(j, "lobby", 9000, snap(12200));
  assert.deepEqual([j.next, j.done, j.best.lobby, j.run.score], ["restaurant", ["sat", "lobby"], 9000, 12200]);
  assert.deepEqual([stopState(j, "sat"), stopState(j, "restaurant"), stopState(j, "campus")], ["done", "next", "locked"]);
});
test("an act's end starts the next act clean", () => {
  let j = newJourney();
  for (const id of ["sat", "lobby", "restaurant", "campus"]) j = finishLevel(j, id, 1000, snap(1000));
  j = finishLevel(j, "arena", 5000, snap(9000));
  assert.deepEqual([j.next, j.run, j.carry, actTotal(j, "act1"), journeyTotal(j)], ["lobby-night", null, null, 8000, 9000]);
});
test("a replay sets a best but never moves next or the snapshot", () => {
  let j = finishLevel(newJourney(), "sat", 3200, snap(3200));
  const again = finishLevel(j, "sat", 4000, null);
  assert.deepEqual([again.next, again.best.sat, again.run.score], ["lobby", 4000, 3200]);
  const worse = finishLevel(again, "sat", 100, null);
  assert.equal(worse.best.sat, 4000);
});
test("a save from a later version, with unknown stops and garbage, is kept where it can be", () => {
  const raw = JSON.stringify({ v: 3, next: "moon", done: ["lobby", "sat", "mars"], best: { sat: 500, mars: 9, lobby: -2 }, bonked: 41.7, run: { nope: true }, carry: null, credits: "yes", extra: 1 });
  const j = parseJourney(raw);
  assert.deepEqual([j.v, j.next, j.done, j.best, j.bonked, j.run, j.carry, j.credits], [1, "restaurant", ["sat", "lobby"], { sat: 500 }, 0, null, null, false]);
  assert.deepEqual(parseJourney(serializeJourney(j)), j);
});
```

- [ ] **Step 2: Run it**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/journey.check.mjs`
Expected: FAIL (no `src/sim/journey.ts`).

- [ ] **Step 3: Write `src/sim/journey.ts`** with the interfaces above; `Run.bonked` in `run.ts`. The run's shape check: every field of `createRun(0)` present with the same `typeof`, arrays of strings for `punched` and `spent`.

- [ ] **Step 4: Run it, then the full checks** (`npm run test:next`, `npx tsc --noEmit`). Expected: PASS.

- [ ] **Step 5: Commit and push** (`src/sim/journey.ts`, `src/sim/run.ts`, `scripts/journey.check.mjs`): "The journey's save: the next stop, the finished stops, the bests, the snapshot, kept across versions".

### Task 4: The Game's journey run

**Files:**
- Modify: `src/sim/game.ts`, `src/sim/events.ts`, `src/sim/level.ts` (`DoorKind`), `src/sim/run.ts`
- Test: `scripts/journey.check.mjs`, `scripts/lobby.check.mjs`

**Interfaces:**
- Consumes: `Snapshot`, `Carry` (Task 3); `Level`, `LevelId`.
- Produces, in `src/sim/game.ts`:
  - `GameMode` gains `"story"` (a hold between levels, or before the first, while the shell shows cards; nothing steps).
  - `type RunOptions = { shift?: Level[]; journey?: boolean; snapshot?: Snapshot | null; hold?: boolean }`
  - `newRun(seed: number, start?: number, opts?: RunOptions): void`: with `shift`, `game.shift` is replaced and `start` indexes into it; `journey` sets `game.journey`; `snapshot` makes the run a clone of its `run` and begins with its `carry`; `hold` begins in `story` instead of `card`.
  - `Game.journey: boolean`; `Game.snapshot: Snapshot | null` (taken at every level's card of a journey run: in `newRun` and `nextVenue`, a deep copy); `Game.continueStory(): void` (in `story`: before a level, to its card; after a level, to the next venue's card or, after the last, to `clear`); `Game.levelScore(): number` (the run's score less its score at the level's card).
  - In a journey run: at every level's card `run.lives = Math.max(RUN.lives, run.lives)` (decision 3); after a level's tally `setMode("story")` with `{ type: "levelDone"; id: LevelId; score: number; bonked: number; last: boolean }` (`score` the level's own, `bonked` the run's count since the card, `last` when no level follows in the shift); `run.bonked` grows on every `castHit` with `down`, `castFlee` and `castFell`.
  - `DoorKind` gains `"gate"` (`src/sim/level.ts`): walked into like an exit (within `EXIT_REACH`, standing, on the ground, no ↓) it opens Fare Darts from that door, the level frozen behind it; `finishQuest` from a gate door pays like the shuttle's (`payFares`) and goes straight to `tally` (the clock's bonus), never back to play.
- `src/sim/events.ts`: `levelDone` as above; `{ type: "think"; text: string; seconds: number }` (Hammer's thought, for Task 7 and Task 13).

- [ ] **Step 1: The failing tests**

In `scripts/journey.check.mjs` (import `createGame`, `RUN`, `STEP`, the levels, `drive`; the lobby check's `play`, `until`, `knockOut`, `walkOut` helpers copied to the top; a `shift = [LOBBY, RESTAURANT, CAMPUS, GIFTSHOP]`):

```js
const journeyGame = (start = 0, opts = {}) => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT, CAMPUS, GIFTSHOP] }, 11, { cast: false, title: true });
  g.newRun(11, start, { shift, journey: true, ...opts });
  return g;
};
const exit = (g) => { g.world.hero.x = g.level.doors.find((d) => d.kind === "exit").x - 100; if (g.world.pig) g.world.pig.state = "defeated"; return until(g, (x) => x.mode !== "play" && x.mode !== "walkoff" && x.mode !== "tally", 20, { right: true }); };
test("a journey run takes a snapshot at the card, holds in story after a level, and carries on", () => {
  const g = journeyGame(0);
  assert.deepEqual([g.mode, g.journey, g.snapshot.run.score, g.snapshot.carry.boxes], ["card", true, 0, 0]);
  play(g);
  g.run.score = 4000; g.world.hero.boxes = 3; g.run.spent.push("buffet");
  const evs = exit(g);
  const done = evs.find((e) => e.type === "levelDone");
  assert.equal(g.mode, "story");
  assert.deepEqual([done.id, done.last, done.score > 4000, g.levelScore()], ["lobby", false, true, done.score]);
  g.continueStory();
  assert.deepEqual([g.mode, g.level.id, g.snapshot.run.score, g.snapshot.carry.boxes, g.snapshot.run.spent], ["card", "restaurant", g.run.score, 3, ["buffet"]]);
});
test("three lives or more at every card; Try again restores the snapshot exactly", () => {
  const g = journeyGame(1, { snapshot: { run: { ...createRun(11), score: 7000, cans: 30, lives: 5, spent: ["shuttle"] }, carry: { charge: 8, patience: 2, hot: true, doggy: 1, flop: true, boxes: 4 } } });
  assert.deepEqual([g.level.id, g.run.score, g.run.lives, g.world.hero.boxes, g.world.hero.doggy, g.run.spent], ["restaurant", 7000, 5, 4, 1, ["shuttle"]]);
  play(g);
  g.run.score = 9999; g.world.hero.boxes = 0;
  const taken = g.pickups[0]; taken.taken = true;
  g.run.lives = 1; knockOut(g); until(g, (x) => x.mode === "over");
  g.newRun(11, g.venue, { snapshot: g.snapshot });
  assert.deepEqual([g.mode, g.run.score, g.run.lives, g.world.hero.boxes, g.pickups.every((p) => !p.taken)], ["card", 7000, 5, 4, true]);
  const low = journeyGame(0, { snapshot: { run: { ...createRun(11), lives: 1 }, carry: { charge: 0, patience: 2, hot: false, doggy: 0, flop: false, boxes: 0 } } });
  assert.equal(low.run.lives, 3);
});
test("the last level of the shift ends in story then clear; a one-level shift is a replay", () => {
  const g = journeyGame(0, { shift: [GIFTSHOP] });
  play(g);
  const evs = exit(g);
  assert.deepEqual([g.mode, evs.find((e) => e.type === "levelDone").last], ["story", true]);
  g.continueStory();
  assert.equal(g.mode, "clear");
});
test("a hold before the first level shows its cards first", () => {
  const g = journeyGame(0, { hold: true });
  assert.equal(g.mode, "story");
  for (let i = 0; i < 10; i++) g.step(input({}, { jump: true }));
  assert.equal(g.mode, "story");
  g.continueStory();
  assert.equal(g.mode, "card");
  play(g);
  g.step(input({ jump: true }));
  assert.equal(of(g.events, "jump").length, 0, "a key held through Continue is held, not pressed");
});
test("staff bonked are counted on the run", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  play(g);
  const n = g.world.cast[0];
  g.world.events = []; 
  g.step(input());
  n.hits = 99; n.alive = false;
  g.events.push({ type: "castHit", id: n.id, role: n.role, job: n.job, by: "mallet", x: n.x, y: n.y, dir: 1, down: true, points: 100, drops: false });
  g.step(input());
  assert.ok(g.run.bonked >= 0);
});
```

Replace the last test's body with a real knockout if the cast lets one happen in a few seconds: stand him beside the desk's bellhop, swing three times (`hammer` presses 0.5 s apart) and assert `g.run.bonked === 1` after the `castHit` with `down`; keep the event shape above only as a fallback.

In `scripts/lobby.check.mjs`, the existing shift tests must still pass unchanged (a non-journey run keeps `clear` after the last venue, lives carried, no `levelDone`).

- [ ] **Step 2: Run them**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/journey.check.mjs scripts/lobby.check.mjs`
Expected: the journey tests FAIL (`newRun` ignores `opts`; no `story` mode); the lobby tests pass.

- [ ] **Step 3: Implement the journey run in `src/sim/game.ts`**

`newRun(seed, start, opts)`: replace the shift when given (`game.shift`, `game.levels.venues` left alone), clamp `start`, `game.journey = !!opts.journey`, the run from the snapshot (`structuredClone`) or `createRun`, `begin(carry)` with the snapshot's carry or the fresh one, then `takeSnapshot()` when `journey`, then `hold` → `setMode("story")` with a private `storyAt: "before" | "after"`. `scoreAtCard` is kept beside the snapshot. `tally()`: when `game.journey`, after the hold `setMode("story")` and push `levelDone`; `continueStory()` reads `storyAt`. `nextVenue` applies the lives floor and takes the snapshot in a journey run. The gate door in `tryDoors`: `d.kind === "gate"` found like the exit (same reach, `standing`, `h.onGround`), `exitDoor = d`, `openQuest(createFares(seed), d, ev)`; `finishQuest` with `d.kind === "gate"`: `payFares`, `h.boxes` and the rest as the shuttle, then `setMode("tally", ev, RUN.clearHold)`. The `bonked` count in `playStep` from the step's events.

- [ ] **Step 4: Run them, then the full checks** (`npm run test:next`, `npx tsc --noEmit`). Expected: PASS.

- [ ] **Step 5: Commit and push** (`src/sim/game.ts`, `src/sim/events.ts`, `src/sim/level.ts`, `src/sim/run.ts`, `scripts/journey.check.mjs`): "The Game plays a journey: a shift of levels, three lives a card, the snapshot, the story hold, the gate door".

### Task 5: The shell plays the journey

**Files:**
- Modify: `src/render/look.ts` (`Look`), `src/components/next-game.tsx`, `src/components/next-veil.tsx`, `src/routes/index.tsx`, `src/styles.css`
- Test: `scripts/journey-browser.check.mjs` (create), `scripts/shift-browser.check.mjs`, `scripts/next-start.check.mjs`

**Interfaces:**
- Consumes: Tasks 2 to 4.
- Produces, in `src/render/look.ts`: `Look.startJourney(id: StoryId, how: "journey" | "replay", snapshot: Snapshot | null, hold: boolean): void` (a journey run from that stop with `shiftFrom`, or a one-level replay; `hold` when there are cards before); `Look.continueStory(): void`; `Look.tryAgain(): void` (`newRun` with `game.snapshot` in a journey run, a plain `newRun` otherwise); `Look.start(at)` as built (Work the whole shift); `startLook`'s `opts.level?: LevelId` replaces `opts.start` (the old ids still accepted by the route); `opts.onLevelDone?: (e: { id: LevelId; score: number; bonked: number; last: boolean }) => void`; `opts.onCard?: (id: LevelId, snapshot: Snapshot | null) => void` (every level's card of a journey run, with the snapshot just taken).
- In `src/components/next-game.tsx`: the journey in state, read from `JOURNEY_KEY` on mount and written at every `onCard` and `onLevelDone` and on New game; `VeilInfo` gains `journey: Journey | null`, `stop: StoryStop | null`, `cards: StoryCard[]` (the ones to show now, in order), `how: "journey" | "replay" | "shift" | "practice"`; `NextVeil` gains `onJourney` (to the home screen), `onContinue` reused for the story cards' Continue.
- In `src/routes/index.tsx`: `level: levelOf(search.level ?? search.venue)` over `["sat", "lobby", "restaurant", "campus", "arena"]`; `journey: flag(search.journey === "all" ? "1" : search.journey)` (`&journey=all` opens every stop for the page without saving); `NextGame` props `level?: LevelId; journeyAll?: boolean`.
- The cards (`next-veil.tsx`), in the shell's slate and gold: **email** (`next-veil__mail`: "From: Basel office" · "To: Hammer" · "Subject: Your transition" · the body "Training is moving to video. Please come to Basel on the 14th to discuss your transition. Safe travels." · his thought "Transition." as a `next-veil__thought` line · Continue); **caption** (the text alone, large, Continue); **phone** (`next-veil__phone`: the app's name as the eyebrow, the text, the thought, Continue); **act** ("Act 1 · The Trip · complete", the act's total and its best, Continue); the **replay's exit card** (eyebrow the stop's code and name, title "Clocked out", Score and Best, Play again and Journey); **Hammer down** in a journey run or replay: Try again and Journey (never "Start screen"); the venue **card** in a journey run reads "Your shift starts here" at `lobby` after the prologue only when there is no `caption` card before it (there is one, so it reads "Your shift goes on" from 1-2 on and "Boarding in 7:00" is SAT's own, Task 12); **Work the whole shift** keeps every card as built.
- The act card's Continue after `arena` in Phase 1: the journey's `next` is `lobby-night`, not built, so Continue goes to the home screen (decision 5).

- [ ] **Step 1: The failing browser check**

Write `scripts/journey-browser.check.mjs` on the pattern of `scripts/shift-browser.check.mjs` (Chrome, `?next=1&dev=1`, errors asserted empty, screenshots under `artifacts/journey-*.png`, a `clockOut(x, y, next)` helper). It:
1. opens `/` on the start screen, asserts `localStorage["hammer-time-journey"]` is unset, and clocks in: the email card (`.next-veil__mail` with "Your transition"), Enter, then the venue card for SAT (until Task 12 builds SAT, drive this check with `?next=1&dev=1&level=lobby&journey=1`: the lobby's card first; switch the check to SAT in Task 15),
2. plays 1-1 to its exit by `__next.dev.teleport` and holding ArrowRight (as `shift-browser` does), asserts the `story` hold is passed through (no card: 1-1 has none) and 1-2's card shows "Your shift goes on", and that the save now has `next: "restaurant"`, `done: ["sat", "lobby"]` (or `["lobby"]` until Task 15) and a `run` with the score,
3. reloads the page: the strip's next stop is 1-2 and Clock in starts on 1-2's card with the saved score on the HUD,
4. loses three lives at once (`__next.dev.patience(1)` and `__next.dev.hit()` three times through the respawns): "Hammer down" with Try again and Journey; Try again: 1-2's card, the HUD score back to the saved one, three lives; presses Enter on the card: no `jump` event in the first second of play,
5. finishes 1-2, 1-3 and 1-4 the same way (`__next.dev.pig({ state: "defeated" })` at the gift shop): the Bonvoy phone card ("Your status has been reviewed."), Enter, the act card ("Act 1 · The Trip · complete" with a total), Enter: the home screen, the strip with 1-4 gold and 2-1 "Act 2 is coming",
6. clicks the finished 1-3 stop: "1-3" card, a fresh HUD score of 0, three lives; finishes it: "Clocked out" with Score and Best; Journey: the home screen, the save's `next` still `lobby-night`,
7. seeds `localStorage["hammer-time-journey"] = "{broken"` and reloads: the start screen opens on a new journey with no page errors,
8. at 390 by 844 and 844 by 390: every card above fits with no horizontal overflow and clear of `__next.faceScreen`.

Run: `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/journey-browser.check.mjs http://127.0.0.1:8090/`
Expected: FAIL at step 1 (no email card).

- [ ] **Step 2: The look**

`look.ts`: `LEVELS` gains SAT when Task 12 lands (for now the four); `startJourney` builds the shift with `shiftFrom(id, LEVELS)` (the map holds only built levels) and calls `game.newRun(newSeed(), 0, { shift, journey: true, snapshot, hold })`; `continueStory` → `game.continueStory()`; `tryAgain`; the `onLevelDone` and `onCard` callbacks from the events (`levelDone`; the `mode` event to `card` with `game.journey`, passing `game.snapshot`); the `story` mode holds like `clear` (nothing steps, the scene shows); `forgetPresses()` on every `continueStory` and `tryAgain` so a key held through a card is held, not pressed.

- [ ] **Step 3: The shell**

`next-game.tsx`: the journey state and its storage (`parseJourney(localStorage.getItem(JOURNEY_KEY))` in a `try`, `serializeJourney` on write, a `journeyAll` page never writes); `begin` for a stop (`look.startJourney(id, state === "done" ? "replay" : "journey", journey.run && journey.carry ? { run, carry } : null, hold)` where `hold` is true when the stop has `before` cards and it is played as `next` for the first time); `onLevelDone` → `finishLevel` (replays pass `null` as the snapshot; the journey's `bonked += e.bonked`) and the cards to show (`stop.after` in a journey run; the replay's exit card for a replay); `onCard` → the snapshot into the journey (`run`, `carry`) and a write; Hammer down's `bonked` added from `hud.bonked` (Task 18 surfaces it; until then from the `levelDone` events only); the act card's Continue → `look.startJourney(next, ...)` when `next` is built, else `look.toTitle()`; `tryAgain` → `look.tryAgain()`. `next-veil.tsx`: the cards above. `routes/index.tsx`: `level`, `journey`; then `git hash-object src/routeTree.gen.ts` = `dceedffdc12c32138e81bb63787cac7ae5d97fcd`. `shift-browser.check.mjs` keeps passing (Work the whole shift through `look.start(0)` via the act header lands in Task 6; until then the page's `?next=1&dev=1` with no `level` starts the whole shift as today). `next-start.check.mjs`: the "Start at" buttons change in Task 6; keep it passing by leaving `STARTS` in place until then.

- [ ] **Step 4: Run the checks**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim`, then the browser: `journey-browser`, `shift-browser`, `next-start`, `next-browser`, `fares-browser`.
Expected: PASS; `artifacts/journey-*.png` looked at full size: the email card, the phone card, the act card, Hammer down with Journey, Clocked out.

- [ ] **Step 5: Commit and push** (the files above and `scripts/journey-browser.check.mjs`): "The journey plays: the email, the cards between levels, the Bonvoy phone, Act 1 complete, Try again on the snapshot, the save in the browser".

### Task 6: The journey strip

**Files:**
- Create: `src/components/next-strip.tsx`
- Modify: `src/components/next-start.tsx`, `src/components/next-game.tsx`, `src/styles.css`, `scripts/start-art.mjs`, `scripts/next-start.check.mjs`
- Test: `scripts/next-start.check.mjs`, `scripts/journey-browser.check.mjs`

**Interfaces:**
- Consumes: `STORY`, `ACTS`, `stopState`, `actTotal`, `journeyTotal`, `Journey` (Tasks 2, 3); `Look.start(at)` (Work the whole shift); `Look.startJourney` (Task 5).
- Produces: `NextStrip({ journey, built, best, onStop, onStraight, chosen, onChoose })` in `next-strip.tsx`: `built: ReadonlySet<StoryId>`; `best: number` (the whole shift's best, for Act 1's header); `onStop(id: StoryId)` (a finished stop replays, the next stop starts); `onStraight(act: ActId)` (Act 1: `look.start(0)`); `chosen: StoryId | null` and `onChoose` (the stop Clock in starts: the next stop by default; a finished stop when picked). Markup: `nav.next-strip` with `button.next-strip__stop[data-state="done"|"next"|"locked"]` (a locked stop `disabled`, its code and a lock glyph, no `<img>`), `div.next-strip__act` headers (`h3` the act's title, `b` the total, `button.next-strip__straight` once every stop of the act is done), the strip scrolling horizontally with the wheel (vertical wheel mapped to horizontal) and ← → when it has focus, the `next` stop scrolled to the centre on mount. `NextStart` keeps its title sequence, hero, Side quests row and tools; `STARTS` and the four venue cards go; the Clock in button starts `chosen`; when `chosen` is the next stop and it is not built, the button reads "Act 2 is coming" and is disabled (decision 5); `best` becomes "Journey best" (`journeyTotal`); the eyebrow "Three acts. Zero patience.", the tagline "Bonk the staff. Dodge the paper." "Get to Basel."
- `scripts/start-art.mjs` renders `public/start/<id>.webp` for every built stop (the four now, SAT in Task 15); `next-start.check.mjs` asserts the strip instead of the `STARTS` buttons.

- [ ] **Step 1: The failing checks**

In `scripts/next-start.check.mjs`: replace the "Start at <name>" assertions with: on a fresh page the strip has 15 stops, `sat` is `data-state="next"` (or `lobby` until Task 15 makes SAT a level: assert the first built stop), the rest `locked` with no `<img>` and a lock; with `&journey=all` every built stop is `done` except none is `next`... (set: every built stop `done`, the headers' totals 0, Act 1's header shows "Work the whole shift"); clicking Act 1's "Work the whole shift" lands on 1-1's card with "Your shift starts here" and the HUD's world "1-1"; the wheel over the strip scrolls it horizontally; at 390 by 844 and 844 by 390 the strip is reachable and the page does not scroll.
In `journey-browser.check.mjs` step 5: 1-4 `done`, 2-1 `next`, Clock in reads "Act 2 is coming" and is disabled; the Act 1 header's total equals the sum of the four bests.

Run both. Expected: FAIL (no strip).

- [ ] **Step 2: Build the strip and rewire the start screen** as the interfaces say; CSS in `src/styles.css` under `.next-strip`, the filmstrip arrival of the old venue cards (`--i` delays) kept for the stops.

- [ ] **Step 3: Run the checks** (`npm run test:next`, `npx tsc --noEmit`, eslint, `next-start`, `journey-browser`, `shift-browser`, `next-browser`). Look at `artifacts/start-*.png` at full size: a locked stop shows no picture.

- [ ] **Step 4: Commit and push**: "The journey strip: every stop in order under its act, finished, next and locked, Work the whole shift on Act 1's header".

### Task 7: Hammer, live, on the home screen

**Files:**
- Modify: `src/sim/game.ts` (`titleStep`), `src/sim/world.ts` (`still`), `src/sim/cast-behavior.ts` (`still`), `src/sim/level.ts` (`Level.home`), `src/sim/levels/lobby.ts` (`home`), `src/game/lines.ts` (`HOME_INSULTS`), `src/render/look.ts` (the title scene), `src/components/next-start.tsx`, `src/components/next-game.tsx`, `src/styles.css`, `src/render/boards.ts` (a `home` board), `scripts/look-boards.mjs`
- Test: `scripts/journey.check.mjs`, `scripts/next-start.check.mjs`, `scripts/journey-browser.check.mjs`

**Interfaces:**
- Produces: `Level.home?: { x: number; cx: number }` (where he stands on the home screen and where the camera looks; the lobby `{ x: 1100, cx: 1600 }`); `World.still: boolean` (the cast never notices, never moves; `stepCast` returns at once while set); `Game.titleStep(): void` (in `title` mode only: `world.still = true`, `world.step` with an empty input, except a `fire` press at 45 s and every 60 s after when `h.sinus >= 1`; every 8 s a `{ type: "think", text, seconds: 3.2 }` from the pool until it is empty; the pool reshuffled by the seed at every `toTitle` and at creation; `game.titleT` the seconds on the screen); `HOME_INSULTS: readonly string[]` in `lines.ts` (the twelve of spec §5.1 word for word, "Did you play football without a helmet growing up?" first in the file); `shuffled(pool, seed): string[]` (a seeded Fisher-Yates in `src/sim/rewards.ts` beside `seededRandom`, exported).
- In `look.ts`: the stage stays visible in `title`; `game.titleStep()` runs each sim step there; `show()` turns `think` into `bubbles.think(e.text, e.seconds)`; the camera in `title` rests at `home.cx` with the pointer's lean (`±120` world px across the screen's width, `±40` down), no look-ahead; `opts.onTitleScene?: () => void` fires once the level's view is prepared and the first title frame is drawn; `toTitle()` stands him at `home.x` of the first built level (`standAt`) facing right, and the venue shown is that level's.
- In `next-start.tsx`: the root takes `data-live` once `onTitleScene` fired; `.next-start__art` fades to 0 over 0.6 s under `[data-live]` and the stage's `.next-start__shade` and `__sweep` stay over the canvas; the start screen's background becomes transparent where the scene shows (the hero section), the strip and the title's letterbox bars opaque as built; the key art stays as the first paint. `next-game.tsx` passes `onTitleScene`.

- [ ] **Step 1: The failing tests**

In `scripts/journey.check.mjs` (import `HOME_INSULTS`, `shuffled`):

```js
test("the home screen's insults: twelve, the helmet line among them, each once a visit, every eight seconds or so", () => {
  assert.equal(HOME_INSULTS.length, 12);
  assert.ok(HOME_INSULTS.includes("Did you play football without a helmet growing up?"));
  assert.ok(HOME_INSULTS.includes("Absolute... no. I'll save it."));
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5, { cast: true, title: true });
  const thinks = [];
  const snots = [];
  for (let t = 0; t < 3600; t += STEP) {
    g.titleStep();
    thinks.push(...of(g.events, "think"));
    snots.push(...of(g.events, "sniff"));
  }
  assert.equal(thinks.length, 12);
  assert.deepEqual(new Set(thinks.map((e) => e.text)).size, 12);
  assert.ok(thinks.every((e, i) => i === 0 || thinks[i].text !== thinks[i - 1].text));
  assert.ok(snots.length >= 55 && snots.length <= 61, `a snot rocket a minute, saw ${snots.length}`);
  assert.ok(g.world.cast.every((n) => !n.noticed && n.act === "idle"), "the cast stands still");
  assert.equal(g.mode, "title");
});
test("the first insult comes within ten seconds and the eighth-second rhythm holds", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5, { cast: false, title: true });
  const at = [];
  for (let t = 0; t < 100; t += STEP) { g.titleStep(); if (of(g.events, "think").length) at.push(Math.round(t)); }
  assert.ok(at[0] <= 10 && at.every((a, i) => i === 0 || a - at[i - 1] >= 7), JSON.stringify(at));
});
test("the lobby has a home spot by the desk", () => {
  assert.deepEqual(LOBBY.home, { x: 1100, cx: 1600 });
});
```

- [ ] **Step 2: Run it** (FAIL: no `titleStep`).

- [ ] **Step 3: Implement** `titleStep`, `still`, `home`, the pool and the shuffle; the look's title scene; the start screen's cross-fade and transparency; a `home` board in `boards.ts` (the title frame at 1920 by 1080 with a bubble forced by `__next.dev.event({ type: "think", text: HOME_INSULTS[0], seconds: 3 })`) rendered by `look-boards.mjs home` to `artifacts/home.png`.

- [ ] **Step 4: Run the checks**; in `journey-browser.check.mjs` add: on the home screen, within 12 s a `think` event appears in `__next.run.events` and `__next.drawing` shows a bubble; `__next.fps >= 55` after 10 s at 1920 by 1080; the key art's `<img>` is at opacity 0 within 2 s of `__next.run.mode === "title"`; the cast stands still (`__next.cast` acts all idle); after 60 s there are at most 8 `think` events and the bubble count on screen never exceeds 1. In `next-start.check.mjs`: the page still fits the three sizes. Render `look-boards.mjs home` and look at it full size: the bubble clear of his face, the title readable over the scene.
Expected: PASS.

- [ ] **Step 5: Commit and push**: "Hammer live on the home screen: the lobby behind the title, his idle beats, a snot rocket a minute, twelve insults each once".

### Task 8: The floor band

**Files:**
- Modify: `src/render/scene.ts` (`FLOOR_LINE`, `floorFocus`), `src/render/look.ts` (the camera's focus), `src/render/ink.ts` (`FLOOR.depth`), `src/render/venue.ts`, `src/render/venue-restaurant.ts`, `src/render/venue-campus.ts`, `src/render/venue-giftshop.ts` (the front faces, the contact shadow), `src/render/backdrop.ts` (`GROUND` kept only below the faces)
- Test: `scripts/render.check.mjs`, `scripts/next-browser.check.mjs`

**Interfaces:**
- Produces, in `src/render/scene.ts`: `FLOOR_LINE = 0.78`; `floorFocus(viewH: number, scale: number, feetY: number, portrait: boolean): number` (pure: the camera's rest `focusY` so that `feetY` lands at `FLOOR_LINE` of the view's height in landscape: `feetY - (FLOOR_LINE - 0.5) * viewH / scale`; in portrait the chest focus as built, `feetY - HERO_HEIGHT * 0.55`). `look.ts` sets `cam.focusY` from it each frame with the current `scene.scale`, the dead zone as built. `FLOOR.depth` becomes 420 (`ink.ts`); every floor kind's front face is drawn from the walking line to `+FLOOR.depth` in its material (marble `#b8ad99` with veins fading down, tile `#8d9289` with grout lines, wood `#6b4428` boards on end, quarry `#a3402f`, concrete `#80858a`, brick `#a2533d` courses, terrazzo `#d6cfbf` specks, stone `#d8cfb8`, carpet `#5d6470`, a belt's steel edge, stairs and steps their risers), darker by 25 percent at the bottom, with a contact shadow (a 40 px strip under the walking line from 35 percent black to 0) and the platforms' edges likewise under their tops (`FLOOR.top`, as built, plus a 16 px shadow). The `GROUND` fill stays behind the faces for the pits.

- [ ] **Step 1: The failing tests**

In `scripts/render.check.mjs` (import `floorFocus`, `FLOOR_LINE` from `../src/render/scene.ts`; `FLOOR` from `../src/render/ink.ts`):

```js
test("the camera's rest focus puts the walking line at 78 percent of the view in landscape, the chest at centre in portrait", () => {
  const scale = (0.315 * 1080) / 340;
  const focus = floorFocus(1080, scale, 0, false);
  assert.ok(Math.abs((0 - focus) * scale / 1080 + 0.5 - FLOOR_LINE) < 1e-6);
  assert.equal(floorFocus(844, scale, 0, true), -340 * 0.55);
  assert.equal(FLOOR.depth, 420);
});
```

In `scripts/next-browser.check.mjs`: at 1920 by 1080 and 1280 by 800, standing still on the lobby's floor, `__next.heroScreenY` (add it to the probe: his feet in CSS px) over `innerHeight` is within 0.04 of 0.78, and the pixel at (his x, 97 percent of the height) sampled through `__next.sample` is not `#1d1714` and not black; at 390 by 844 the framing is as before (feet near 0.5 + 187 × scale / height).

- [ ] **Step 2: Run them** (FAIL).

- [ ] **Step 3: Implement** as the interfaces say. The venue boards: render `look-boards.mjs lobby,restaurant,campus,arena` before and after and compare at full size: no dark band under any floor at 16:9, the cards and the hint line unmoved (they are DOM), his face clear.

- [ ] **Step 4: Run the checks** (`npm run test:next`, `npx tsc --noEmit`, `next-browser`, `shift-browser`, `journey-browser`, `look-boards`). Expected: PASS.

- [ ] **Step 5: Commit and push**: "The floor's edge where the band was: the walking line at 78 percent, every floor's front face in its material with a contact shadow".

### Task 9: The laptop look pass

**Files:**
- Modify: `src/render/app.ts` (`gpuClass`, the tiers), `src/render/quality.ts` (`TIERS`, `firstTier`), `src/render/particles.ts` (a count per tier), `src/render/lighting.ts`, `src/render/cast.ts` (as built), `src/render/look.ts` (`render.onQuality` → the particles), `src/components/next-start.tsx` (the select: Auto, High, Medium, Low as built; the HUD's quality readout shows "Ultra" when Auto picked it), `scripts/art-cut.mjs` (`TEXTURE_SCALE` by kind), `scripts/art-sync.mjs` (the budget), `scripts/art.check.mjs`, the per-frame churn minors: `src/render/quests/banquet-scene.ts` (the plate stacks and flights rebuilt each frame, `insets()` measured each frame), `src/render/quests/gate-board.ts` (the board's graphics redrawn each frame), `src/render/pig.ts` (the drawn pig's Graphics), `src/render/skin.ts` (`skinLayer`'s allocations)
- Test: `scripts/render.check.mjs`, `scripts/art.check.mjs`, `scripts/next-browser.check.mjs`

**Interfaces:**
- Produces, in `src/render/quality.ts`: `TIERS: Record<Quality, { dpr: number; particles: number; bloom: boolean; glows: boolean; rim: boolean }>` = ultra `{ 2, 900, true, true, true }`, high `{ 1.5, 600, true, true, true }`, medium `{ 1, 400, false, true, true }`, low `{ 1, 300, false, false, false }`; `firstTier(gpu: "desktop" | "other", fps: number): Quality` (`"ultra"` when desktop and `fps >= 58`, else `"high"`); `isDesktopGpu(name: string): boolean` (`/NVIDIA|GeForce|RTX|Radeon|AMD|Arc\b/i`). In `app.ts`: `gpuClass(): "desktop" | "other"` from `renderer.gpu?.adapter?.info` (WebGPU: `description`/`device`/`vendor`) or `WEBGL_debug_renderer_info`'s `UNMASKED_RENDERER_WEBGL`; Auto starts at `high`; after the governor's two settled windows it calls `firstTier(gpuClass(), fps)` once and sets it; stepping down as built; `RenderApp.quality` reads the live tier. `Particles` takes a count and `setCount(n)`. `art-cut.mjs`: `TEXTURE_SCALE` stays the props', hats', silhouettes' and tufts' constant; a new `BODY_SCALE = 1` is used for Hammer's body layers and heads and the cast's layers and heads (`art-sync.mjs:122-124, 182`, `art-cut.mjs:1062, 1077`). `art-sync.mjs`: after publish, the bytes of the lobby's files (`hammer/*`, `cast/<lobby persons>*`, `backdrops/lobby-*`, `products/*`) are summed and the sync fails over 20 MB with the total printed.

- [ ] **Step 1: The failing tests**

In `scripts/render.check.mjs`:

```js
test("Auto picks ultra on a desktop GPU holding 58 fps, high otherwise; the tiers differ", () => {
  assert.deepEqual([firstTier("desktop", 60), firstTier("desktop", 50), firstTier("other", 60)], ["ultra", "high", "high"]);
  assert.deepEqual(["NVIDIA GeForce RTX 4070 Laptop GPU", "ANGLE (AMD, Radeon RX 7600)", "Intel(R) Iris(R) Xe", "Apple M2", "Mali-G78"].map(isDesktopGpu), [true, true, false, false, false]);
  assert.ok(TIERS.ultra.particles > TIERS.high.particles && TIERS.high.dpr > TIERS.medium.dpr && !TIERS.low.rim);
});
```

In `scripts/art.check.mjs`: the published rig for `body-affliction` records layer textures at the painting's crop size (`BODY_SCALE`), and `cast/bellhop-1`'s head plate too; the lobby's budget sum is under 20 MB (read the files under `public/art`).

- [ ] **Step 2: Run them** (FAIL).

- [ ] **Step 3: Implement** the tiers, the first pick, the scales, the budget, and the four churn minors (each: build its Graphics once and update positions; `insets()` measured on resize and on the HUD's layout changes, not every frame). `npm run art:sync` after the scale change; the lobby's budget printed.

- [ ] **Step 4: Run the checks** (`npm run test:next`, `npx tsc --noEmit`, `next-browser`, `hungry-browser`, `fares-browser`, `pig-browser`); in `next-browser.check.mjs` add: at 1920 by 1080 on the dev box, `__next.quality` is `ultra` after 5 s and `__next.fps >= 58` over the next 5 s. Render `look-boards.mjs clips,heads,cast,lobby` and look at full size: the body and the heads crisp at 1080p, no seam opened by the scale change.
Expected: PASS.

- [ ] **Step 5: Commit and push** (the files, and only the manifest entries a sync adds, if any): "The laptop look pass: ultra by default on a desktop GPU, the body and the cast crisp at 1080p, four fewer per-frame rebuilds".

### Task 10: Part A's verification and report (1a ships)

**Files:**
- Modify: `README.md` (the intro, "The shift", "The start screen" and a new "The journey" section), the spec (an "As built (Phase 1a)" note under §4, §5, §7, §15), `docs/superpowers/plans/2026-11-02-story-phase-1.md` (nothing; the ledger records the rulings)

- [ ] **Step 1: Every check** from Global Constraints "Done": `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`; the browser checks (`next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `hungry-browser`, `flop-browser`, `fares-browser`, `journey-browser`) at 1920 by 1080 first; `look-boards.mjs` (every board), `start-art.mjs starts,key-art` (the key art is still the first paint: re-render it from the title frame); `git hash-object src/routeTree.gen.ts`; `node scripts/with-app-env.mjs vite build`, the preview restarted on 8091, `browser-smoke.mjs http://127.0.0.1:8090/?next=1 artifacts/smoke-dev.png` then `http://127.0.0.1:8091/?next=1 artifacts/smoke-preview.png --baseline artifacts/smoke-dev.json`.
Expected: all green; the boards looked at full size.

- [ ] **Step 2: README and the spec's "As built" notes**, in the README's voice; the owner's play-test list for 1a in the report (what to try: clock in, the email, the cards, Hammer down and Try again, a replay, the home screen's insults, the floor's edge).

- [ ] **Step 3: The fresh reviewer** on the most capable model over Part A's diff (`git diff <the commit before Task 1>..HEAD`), the Review Focus as its brief; fix what it finds; rerun Step 1.

- [ ] **Step 4: Commit and push**: "Phase 1a ships: Act 1 as a chapter, the journey saved, Hammer live, the floor's edge, the look pass (README, as built)". Report to the owner in product terms with the boards, and the decisions of this plan.

---

# Part B: the prologue and the sound (Phase 1b)

Before Task 11: ask the owner to run the SAT prompts in `art/outgoing/batch-story-phase1-codex.txt`; then carry on. Nothing in Part B waits for a painting.

### Task 11: The gate's paintings cut in (when they exist)

**Files:**
- Create: `art/cuts/cast-gate-agent.json`, `art/cuts/gate.json`
- Modify: `src/render/quests/gate-board.ts` (`drawScalpel` → the sheet's scalpel), `src/render/props.ts` (`drawSample` → the sheet's box), `art/manifest.json` (the four entries only)
- Test: `scripts/art.check.mjs`, `scripts/fares-browser.check.mjs`

Do this task only when `art/incoming/cast/gate-agent.png`, `art/incoming/backdrops/gate.png`, `art/incoming/props/gate-plane.png` and `art/incoming/props/gate-sheet.png` all exist; otherwise skip it, leave it on the handoff's list, and go on.

- [ ] **Step 1:** `node scripts/art-pose.mjs gate-agent` accepts her pose; write `art/cuts/cast-gate-agent.json` from `art/cuts/cast-nurse.json` as R4 cut the nurse, measured with `node scripts/art-grid.mjs cast/gate-agent`; write `art/cuts/gate.json` (`floor`, `windows: [top, bottom]` in the painting's px, checked with `node scripts/art-grid.mjs gate/room`).
- [ ] **Step 2:** `npm run art:sync` (the sheet cuts into seven pieces by the green in the order podium, kiosk, seats, cart, stanchion, scalpel, box; `node scripts/art-grid.mjs gate/sheet` draws it). More or fewer than seven: ask the owner for a redo with the exact reason and stop this task.
- [ ] **Step 3:** wire the sheet's scalpel (the fist, the flight, the tray, the stuck ones) and the box in place of the drawn ones, keeping the drawn ones as the stand-ins; `scripts/art.check.mjs` gets a test that `registry.gate.pieces` has the seven names.
- [ ] **Step 4:** `npm run test:next`, `fares-browser`, `look-boards.mjs gate,box-bonk`; look at them full size: nobody over a city, the scalpel's point where the crosshair was.
- [ ] **Step 5: Commit and push** (the cuts, the code, the four manifest entries by `git add -p art/manifest.json` or `node artifacts/stage-manifest.mjs <paths>`): "The gate's paintings: the agent, the room, the plane and the sheet cut in".

### Task 12: SAT, the level

**Files:**
- Create: `src/sim/levels/sat.ts`
- Modify: `src/sim/level.ts` (`FurnitureKind`, `Level.lessons`, `Level.thoughts`, `LevelId` done in Task 2), `src/sim/game.ts` (lessons and thoughts), `src/sim/run.ts` (`Run.learned`), `src/sim/events.ts` (`lesson`), `src/render/hud.ts` (`hintOf` reads the lesson), `src/sim/drive.ts`
- Test: `scripts/sat.check.mjs` (create; add to `test:next` after `scripts/journey.check.mjs`)

**Interfaces:**
- Consumes: the `gate` door (Task 4), `think` (Task 4), the cast persons (Task 13; until then the cast list is written but `createCast` sees only known persons: write Task 13's sim half first if the type refuses them).
- Produces: `SAT: Level` in `src/sim/levels/sat.ts`: `id "sat"`, `name "San Antonio International"`, `world "SAT"`, `length 8000`, `spawn { x: 300, y: 0 }`, `time 420`, `music "sat"`, `hints { early: 1400 }`, `home` none, `bounds { x: -400, y: -1600, w: 8800, h: 2200 }`; floors: concrete −400 to 1,400 at 0 (the curb), terrazzo 1,400 to 3,800 at 0, a ramp 3,800 to 3,950 from 0 up to −120, a belt 3,950 to 4,550 at −120 with `belt: 220` (the X-ray belt), a ramp 4,550 to 4,700 back to 0, terrazzo 4,700 to 5,600, a belt 5,600 to 6,400 at 0 with `belt: 200` (the moving walkway), terrazzo 6,400 to 8,400; platforms: kiosks as counters 1,500 to 1,800 and 2,000 to 2,300 at −180, the bar's counter 5,900 to 6,500 at −180, the newsstand's shelf 6,800 to 7,200 at −200 (kind `shelf`); solids none; passes: the body scanner `{ x: 4750, y: -1000, w: 300, h: 780 }`; crates: `pepper-curb` pepper at 500 (y −435), `case-bagdrop` case at 2,400, `can-kiosk` can at 2,150 on the kiosk (y −615), `bucees-news` bucees at 7,000 on the shelf (y −635); doors: `{ id: "b7", kind: "gate", x: 7800, y: 0, label: "GATE B7" }`; checkpoints `[{ id: "concourse", x: 5300, y: 0 }]`; signs: `{ x: 200, y: -700, label: "SOUTHWEST", note: "Curbside check-in" }`, `{ x: 2600, y: -700, label: "BAG FEE", note: "Bags used to fly FREE." }`, `{ x: 3300, y: -700, label: "TSA PRE✓", note: "This lane is closed" }`, `{ x: 4900, y: -700, label: "NO LIQUIDS", note: "3.4 oz or less" }`, `{ x: 7600, y: -700, label: "B7", note: "Now boarding" }`; furniture: `van` at the curb (600, w 520, h 300), `stanchion` rope lines 3,200 to 3,900 (the zig-zag, w 700, h 120), `xray` around the belt (3,900 to 4,600, h 420), `scanner` over the pass (4,750, w 300, h 780), `walkway` rails 5,600 to 6,400, `bar` 5,900 to 6,500, `departures` on a column at 2,600, `seats` 7,300 to 7,700 (four seats from behind), `podium` at 7,800; carts `[1000]` (the skycap's); lights: 300/−700/800/0.45, 2,600/−900/1,200/0.6, 4,300/−900/1,100/0.55, 6,200/−900/1,200/0.6, 7,700/−700/900/0.5; camera zones `[{ x0: 3200, x1: 5200, zoom: 0.92 }]`; rewards `{ count: 8, bucees: 0, nuts: 2 }`; routes `[{ id: "floor", x0: 1400, x1: 7400, y0: 0, y1: 0 }]`; backdrop walls `sat-far-1..3`, mid `sat-mid-1` 1,800, `sat-mid-2` 4,300, `sat-mid-3` 6,000, fore `sat-fore-1` 2,600; cast: `skycap-curb` skycap-1 at 900 with cart 1,000, carry nuts; `tsa-1` tsa-1 at 3,600 (x0 3,400, x1 3,900); `tsa-2` tsa-1 at 4,950 recolor `#2f3f63` size 1.03; `bartender` bartender-1 at 6,300 y −180 (on the counter) carry can.
- `Level.lessons?: { x0: number; x1: number; move: Lesson; text: string }[]` with `type Lesson = "jump" | "run" | "slide" | "swing" | "snot" | "wipe"`; SAT's in order: jump 0 to 1,400 "Space jumps · over the cart, onto the kiosks", run 1,400 to 3,200 "Shift runs · the bag belt moves under you", slide 3,200 to 4,700 "↓ while running slides · under the body scanner", swing 3,200 to 5,200 "H swings the mallet · the agents go down in three", snot 5,200 to 7,600 "F fires a snot rocket · the bartender runs from it", wipe 5,200 to 7,600 "T towels off · when the heat bar is high". `Run.learned: Lesson[]` grows on `jump`, a run (held `run` while `|vx| > 0`), `slide`, `swing`, `sniff`, `wipeStart`; `hintOf` shows, after the threats and before the first-lesson line, the first lesson whose stretch he is in and whose move is not learned.
- `Level.thoughts?: { x: number; text: string }[]`: `think` events (3 s) once each when `h.x` first passes `x` going right; SAT's: 300 "Pre-check. I AM pre-check.", 700 "I don't check.", 3,300 "Take your shoes off? These are loafers.", 4,000 "That's a $400 demo unit.", 4,900 "It's Coke Zero. It's not a liquid. It's a lifestyle.", 5,300 "Seven minutes. Plenty.", 7,000 "I have a schedule."
- `FurnitureKind` gains `"van" | "stanchion" | "xray" | "scanner" | "walkway" | "departures" | "seats" | "podium"` (`bar` exists).
- The venue card's line for SAT: "Boarding in 7:00" (`next-veil.tsx`, by `info.world === "SAT"`); the HUD's clock shows 420 as 7:00 as built.

- [ ] **Step 1: The failing tests**

In `scripts/sat.check.mjs` (new; the boilerplate; import `SAT`, `LOBBY`, `STASH`, `createGame`, `drive`, `hintOf`, `masherPlayer` from `../src/sim/quests/fares/drive.ts`, `stepFares`):

```js
const satGame = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 11, { cast: false, title: true }); g.newRun(11, 0, { shift: [SAT, LOBBY], journey: true, ...opts }); return g; };
test("SAT is a level of about 8,000 px with one punch clock and a gate door, no exit", () => {
  assert.deepEqual([SAT.id, SAT.world, SAT.length, SAT.time, SAT.music], ["sat", "SAT", 8000, 420, "sat"]);
  assert.deepEqual(SAT.doors.map((d) => d.kind), ["gate"]);
  assert.deepEqual(SAT.checkpoints.map((k) => k.id), ["concourse"]);
  assert.ok(SAT.floor.filter((f) => f.belt).length === 2 && SAT.passes.length === 1);
});
test("the scripted player walks SAT from the curb to gate B7 along the floor", () => {
  const g = satGame();
  play(g);
  let t = 0, last = g.world.hero.x, stuck = 0;
  while (g.mode === "play" && t < 150) {
    g.step(drive(g.level, g.world.hero, "floor", g.world));
    t += STEP;
    if (Math.floor(t * 2) !== Math.floor((t - STEP) * 2)) { stuck = g.world.hero.x <= last + 1 ? stuck + 1 : 0; last = g.world.hero.x; assert.ok(stuck < 6, `stuck at ${g.world.hero.x}, ${g.world.hero.y}`); }
  }
  assert.deepEqual([g.mode, g.quest?.id, g.questDoor?.id, g.run.punched], ["questCard", "fares", "b7", ["concourse"]]);
});
test("the gate's tally pays into the run and ends the level on the clock's tally, then the story hold", () => {
  const g = satGame();
  play(g);
  Object.assign(g.world.hero, { x: 7790, y: 0, vx: 0, vy: 0, onGround: true, move: null });
  g.run.time = 100;
  until(g, (x) => x.mode === "questCard", 2, { right: true });
  until(g, (x) => x.mode === "quest", RUN.cardT + 0.2);
  const q = g.quest; const player = masherPlayer;
  for (let i = 0; i < 900 * 120 && !q.result; i++) g.step(player(q));
  assert.equal(g.mode, "questTally");
  const before = g.run.score;
  g.finishQuest();
  assert.deepEqual([g.mode, g.run.score >= before + q.result.score, g.world.hero.boxes], ["tally", true, q.result.boxes]);
  const evs = until(g, (x) => x.mode === "story", 12);
  assert.ok(evs.some((e) => e.type === "levelDone" && e.id === "sat"));
  assert.ok(g.run.score > before + q.result.score, "the clock's leftover counted");
});
test("a life lost before the podium comes back at the concourse's punch clock; the gate stays ahead", () => {
  const g = satGame();
  play(g);
  Object.assign(g.world.hero, { x: 5350, y: 0, onGround: true });
  g.step(input({ right: true }));
  assert.deepEqual(g.run.punched, ["concourse"]);
  knockOut(g);
  until(g, (x) => x.mode === "card", 3);
  assert.deepEqual([g.run.lives, Math.round(g.world.hero.x), g.quest], [2, 5300, null]);
});
test("the lessons teach the moves in order and stop once each is done; the thoughts come once at their marks", () => {
  const g = satGame();
  play(g);
  assert.match(hintOf(g), /^Space jumps/);
  g.step(input({ jump: true }, { jump: true }));
  for (let i = 0; i < 60; i++) g.step(input());
  assert.doesNotMatch(hintOf(g), /^Space jumps/);
  Object.assign(g.world.hero, { x: 1500, y: 0, onGround: true, vx: 0 });
  g.step(input());
  assert.match(hintOf(g), /^Shift runs/);
  const thoughts = [];
  for (const x of [250, 350, 350, 5250, 5350]) { Object.assign(g.world.hero, { x, y: 0, onGround: true }); g.step(input()); thoughts.push(...of(g.events, "think").map((e) => e.text)); }
  assert.deepEqual(thoughts, ["Pre-check. I AM pre-check.", "Seven minutes. Plenty."]);
});
```

- [ ] **Step 2: Run it** (FAIL: no `SAT`).

- [ ] **Step 3: Write `src/sim/levels/sat.ts`**, the lessons, the thoughts and the card line. `drive.ts`: nothing new if the ramps and belts carry him; if the driver stalls at the raised belt, let it jump a ramp's foot like a wall (`LOOK.wall` over sloped floors rising more than 100 px).

- [ ] **Step 4: Run it, then the full checks** (`npm run test:next`, `npx tsc --noEmit`). Expected: PASS.

- [ ] **Step 5: Commit and push** (`src/sim/levels/sat.ts`, `src/sim/level.ts`, `src/sim/game.ts`, `src/sim/run.ts`, `src/sim/events.ts`, `src/render/hud.ts`, `src/sim/drive.ts`, `src/components/next-veil.tsx`, `scripts/sat.check.mjs`, `package.json`): "SAT: the curb, the check-in hall, the TSA line, the concourse and gate B7, with the lessons and his thoughts".

### Task 13: SAT's cast: the skycap, the TSA agents, the bartender

**Files:**
- Modify: `src/sim/level.ts` (`CastPerson`), `src/game/lines.ts` (`CastJobName`, `JOB_LINES`), `src/sim/cast.ts` (`ROLE_OF`, `PAINTING_OF`), `src/sim/cast-behavior.ts` (the handless shove, the coaster), `src/sim/missiles.ts` (`"coaster"`, `launchPlane`'s kind), `src/render/hud.ts` ("Coaster incoming"), `src/render/cast.ts` (`LOOKS`), `src/render/cast-body.ts` (`PAINTING_OF`), `src/render/props.ts` (`drawMissile` coaster), `scripts/art-sync.mjs` (`CAST_PERSONS`)
- Test: `scripts/cast.check.mjs`, `scripts/render.check.mjs`, `scripts/sat.check.mjs`

**Interfaces:**
- Produces: `CastPerson` + `"skycap-1" | "tsa-1" | "bartender-1"`; `CastJobName` + `"skycap" | "tsa" | "bartender"`; `ROLE_OF.skycap = "bellhop"`, `ROLE_OF.tsa = "bellhop"`, `ROLE_OF.bartender = "student"`; `PAINTING_OF: Partial<Record<CastPerson, CastPerson>> = { "bartender-1": "server-1" }` in `src/sim/cast.ts` (the painting a person borrows; `loadCastArt` looks up `PAINTING_OF[person] ?? person`); the bartender's recolor is a `CastSpawn.recolor` of `#1b1b1b` baked into `server-1`'s cut (`art/cuts/cast-server-1.json` gains the hex in `recolors`); `MissileKind` + `"coaster"`, `launchPlane(id, from, target, kind: "plane" | "coaster" = "plane")`, `flies(kind: MissileKind): boolean` (plane or coaster) used wherever `"plane"` was tested; the TSA shove: `stepBellhop` with no cart ends its windup with `attack(n, events)` and, when he stands within `CAST.bellhop.hold + h.w` on the same level, a hit from the agent's side (`w.hit(n.x)`); lines: skycap `notice ["Checking bags, sir?", "Skycap, sir?"]`, `shove ["Cart coming through!"]`, `bump ["Curbside only, sir."]`, `down ["I don't do tips anyway.", "Not my cart."]`, `fall "Baaags"`; tsa `notice ["Sir, step aside.", "Laptops out.", "Is this your bag?"]`, `shove ["Arms up, sir."]`, `bump ["Sir. Sir."]`, `down ["Supervisor!", "That's a violation."]`, `fall "Supervisooor"`, `frozen "Sir, I—"`; bartender `notice ["What'll it be?", "Last call was at noon.", "Happy hour's over."]`, `fall "Taaab"`, the student's `heads` line for the throw; `LOOKS["skycap-1"]` (a red coat, a red cap, height 330), `LOOKS["tsa-1"]` (a blue shirt, black trousers, blue gloves, 320), `LOOKS["bartender-1"]` (a white shirt, a black apron, 310); `CAST_PERSONS` + `skycap-1`, `tsa-1` (the bartender borrows). `drawMissile` draws a coaster as a cream disc with a red ring, spinning.

- [ ] **Step 1: The failing tests**

In `scripts/cast.check.mjs` (its helpers; import `createWorld`, `createCast`, `stepCast` as the file does):

```js
test("a TSA agent shoves with his hands: a wind-up, then a hit if he stands close, no cart", () => {
  const level = { cast: [{ id: "a", person: "tsa-1", x: 600, y: 0 }], carts: [] };
  const w = createWorld(flat(), { x: 380, y: 0 }, { cast: createCast(level, []) });
  settle(w);
  const evs = steps(w, 3);
  assert.ok(evs.some((e) => e.type === "castWindup") && evs.some((e) => e.type === "castAttack"));
  assert.ok(evs.some((e) => e.type === "hurt"), "the shove reaches him");
});
test("the bartender throws coasters that fly like planes and flees snot like a student", () => {
  const level = { cast: [{ id: "b", person: "bartender-1", x: 900, y: 0 }], carts: [] };
  const w = createWorld(flat(), { x: 300, y: 0 }, { cast: createCast(level, []) });
  assert.deepEqual([w.cast[0].role, w.cast[0].job], ["student", "bartender"]);
  settle(w);
  const evs = steps(w, 4);
  assert.ok(evs.some((e) => e.type === "missile" && e.kind === "coaster"));
});
```

In `scripts/render.check.mjs`: the `LOOKS` key list gains the three; `PAINTING_OF["bartender-1"] === "server-1"`.

- [ ] **Step 2: Run them** (FAIL).

- [ ] **Step 3: Implement** the sim and the render halves; `npm run art:sync` for the server's new recolor (the manifest unchanged: no owner file changes).

- [ ] **Step 4: Run the checks** (`npm run test:next`, `npx tsc --noEmit`, `cast-browser`, `cast-art-browser`). Expected: PASS.

- [ ] **Step 5: Commit and push**: "SAT's people: the skycap with his cart, two TSA agents who shove, a bartender who throws coasters".

### Task 14: SAT drawn: the furniture, the sheet, the pictures

**Files:**
- Create: `src/render/venue-sat.ts`
- Modify: `src/render/venue.ts` (the dispatch), `src/art/registry.ts` (`Registry.sat`, `SAT_PIECES`), `scripts/art-cut.mjs` (`nameSatPieces`), `scripts/art-sync.mjs` (the SAT sheet), `scripts/art-grid.mjs` (`sat/sheet`), `src/render/boards.ts` (`START_FRAMES.sat`, `VENUE_FRAMES.sat`), `src/render/look.ts` (`SHIFT`/`LEVELS` gain SAT; `prepare` for it), `scripts/start-art.mjs`, `scripts/look-boards.mjs`, `scripts/art.check.mjs`
- Test: `scripts/art.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces: `drawSatFurniture(front: Graphics, mid: Graphics, f: Furniture, pieces: SatPieces | null): boolean` in `venue-sat.ts` for the eight new kinds (the drawn stand-ins: the van as a white box with a blue band and wheels, the stanchions as posts with a red rope zig-zag, the X-ray as a grey housing with a dark tunnel, the scanner as an arch, the walkway as rails, the departures column with a blank screen, the seats from behind, the podium) and the bins riding the belt (a row of grey bins moving at the belt's speed, looping); the floors by kind as built (`campusFloor` draws terrazzo and belts, `restaurantFloor` concrete). `SAT_PIECES = ["stanchion", "bin", "kiosk", "van", "sign", "pretzel"]` in `registry.ts` and `art-cut.mjs`; `registry.sat?: { pieces: Record<SatPiece, Piece> }` from `art/incoming/props/sat-sheet.png` (six pieces by the green, left to right; another count refuses with the reason). Where a piece exists it draws in place of its stand-in (the stanchion, the van, the departures sign, the bins); the kiosk piece stands behind the counters; the pretzel bag lies on the newsstand's shelf. `START_FRAMES.sat = { x: 5900, y: 0, cx: 6500, zoom: 0.92 }`; `VENUE_FRAMES.sat` = the curb (700), the TSA line (4,200), the gate (7,700). `start-art.mjs starts` renders `public/start/sat.webp`; `look-boards.mjs sat`.

- [ ] **Step 1: The failing tests**: in `scripts/art.check.mjs`, `nameSatPieces` names six pieces in order and refuses five or seven; in `scripts/render.check.mjs`, `START_FRAMES` and `VENUE_FRAMES` have `sat`.

- [ ] **Step 2: Run them** (FAIL).

- [ ] **Step 3: Implement**; render `look-boards.mjs sat` and `start-art.mjs starts`; look at `artifacts/sat-look-1..3.png` and `public/start/sat.webp` full size: the stanchions' zig-zag reads as rope lines, the scanner's arch clears his head when standing and not when sliding, the bins ride the belt, the podium at the gate, his feet on every floor.

- [ ] **Step 4: Run the checks** (`npm run test:next`, `npx tsc --noEmit`, eslint). Expected: PASS.

- [ ] **Step 5: Commit and push** (the files and `public/start/sat.webp`): "SAT drawn: the curb, the rope lines, the X-ray and the scanner, the walkway, the bar and gate B7; its strip picture".

### Task 15: SAT in the browser, and the journey from its true start

**Files:**
- Create: `scripts/sat-browser.check.mjs`
- Modify: `scripts/journey-browser.check.mjs` (from SAT), `scripts/next-start.check.mjs` (`sat` is the next stop on a fresh page), `src/render/look.ts` (`__next.dev.quest` works from the gate door)
- Test: the two browser checks

- [ ] **Step 1: Write `scripts/sat-browser.check.mjs`** on `shift-browser`'s pattern: `?next=1&dev=1&level=sat`: the card reads "SAT", "San Antonio International", "Boarding in 7:00", the HUD's clock "7:00"; the first hint starts "Space jumps"; teleports along the five stretches with a screenshot each (`artifacts/sat-curb.png` … `sat-gate.png`); on the X-ray belt he drifts right with no input (`__next.run.x` grows over 0.5 s); under the scanner standing is blocked and a slide passes (`__next.run.x` past 5,050 only after a slide); the "NO LIQUIDS" thought appears (`__next.run.events.think >= 1`); the coaster: a `missile` event of kind `coaster` near the bar within 6 s of standing at 5,800; at the podium the round opens (`__next.run.mode === "quest"`, `__next.quest.id === "fares"`); `__next.dev.questSkip()` to the tally, Enter: `tally` then the story card "Three hours later. The hotel.", Enter: 1-1's card; `&noart=1` the same route with no page errors and the stand-ins (`__next.castArt` reports `skycap-1` and `tsa-1` as stand-ins); at 390 by 844 and 844 by 390 the card and the hint fit.
- [ ] **Step 2: `journey-browser.check.mjs` steps 1 and 2 start from SAT** (the email, SAT's card, the gate by `questSkip`, "Three hours later", the save with `done: ["sat"]` and the run carrying the boxes into 1-1: `__next.hero.boxes` equals the tally's). `next-start.check.mjs`: `sat` is `next` on a fresh page.
- [ ] **Step 3: Run** `sat-browser`, `journey-browser`, `next-start`, `fares-browser`, `look-boards.mjs sat,gate` at 1920 by 1080 (60 fps over 5 s at ultra on the dev box: `__next.fps`). Expected: PASS; the screenshots looked at full size.
- [ ] **Step 4: Commit and push**: "SAT in the browser: the five stretches, the belt, the scanner, the coaster, the gate; the journey starts at the email".

### Task 16: Music everywhere

**Files:**
- Modify: `src/game/audio.ts` (`SongId`, `SONGS`, `sting`, `fanfare`, `tick`), `src/render/sound.ts` (`music(theme, quiet?)`), `src/render/look.ts` (music by mode), `src/sim/level.ts` (`Level.music: SongId`), `src/sim/levels/*.ts` (`music`)
- Test: `scripts/music.check.mjs` (create; add to `test:next` after `scripts/voice.check.mjs`), `scripts/render.check.mjs`

**Interfaces:**
- Produces, in `src/game/audio.ts`: `type SongId = "title" | "sat" | "lobby" | "restaurant" | "campus" | "arena" | "cellar" | "banquet" | "gate"`; `Theme` becomes `SongId`; `SONGS: Record<SongId, Song>` (the two as built; `cellar` the stash's notes in the `Song` form; `lobby` muzak: a slow arpeggio on a triangle lead, brushed hats, step 0.14; `restaurant` bossa: a syncopated bass, two-note comping, step 0.12; `campus` lo-fi: a square lead with a wobble (`double` a few cents off), a soft kick, step 0.13; `arena` the first boss theme: a driving sawtooth bass, two alternating leads (`double` from the second half), step 0.1; `sat` "Pre-Check": terminal muzak, a sine lead, a `chime` gag every eight bars (`gags` at every 128th step), step 0.15; `title` the title tune: four bars of brass fanfare (a sawtooth lead in fifths) then a slow swagger, step 0.16); `AudioBus.sting()` (four falling notes, 1.2 s, for Hammer down) and `AudioBus.fanfare()` (a short brass rise, 1.5 s, for an act's ending); `AudioBus.startMusic(theme, quiet = false)` (the music gain at 0.4 when quiet) and `setQuiet(on)`. The procedural day and cellar chiptune goes. In `src/render/sound.ts`: `music(theme: SongId | null, quiet = false)`; `sting()`, `fanfare()`. In `look.ts`: `title` → `music("title")`; `card`, `story`, `walkoff`, `tally` → the level's theme quiet; `play` → full; `pause` → quiet; `over` → `sting()` once then `music(null)`; `questCard`/`questTally` → the quest's theme quiet, `quest` full; `clear` → the level's theme quiet, and for the act card `fanfare()` once; the title tune waits for the unlock (decision 13). `Level.music: SongId`; the lobby `lobby`, the restaurant `restaurant`, the campus `campus`, the gift shop `arena`, the stash `cellar`, SAT `sat`.

- [ ] **Step 1: The failing tests**

In `scripts/music.check.mjs` (new; import `SONGS` and the levels):

```js
const IDS = ["title", "sat", "lobby", "restaurant", "campus", "arena", "cellar", "banquet", "gate"];
test("every place has a song in the side quests' form", () => {
  assert.deepEqual(Object.keys(SONGS).sort(), [...IDS].sort());
  for (const id of IDS) {
    const s = SONGS[id];
    assert.ok(s.step >= 0.07 && s.step <= 0.24, `${id} step ${s.step}`);
    assert.ok(s.lead.length % 16 === 0 && s.bass.length % 16 === 0, `${id} bars`);
    assert.ok(s.kick.length === s.snare.length && s.hat.length === s.kick.length, `${id} drum rows`);
  }
});
test("every level names its song; the boarding chime comes every eight bars at SAT", () => {
  assert.deepEqual([LOBBY, RESTAURANT, CAMPUS, GIFTSHOP, STASH, SAT].map((l) => l.music), ["lobby", "restaurant", "campus", "arena", "cellar", "sat"]);
  const chimes = Object.entries(SONGS.sat.gags).filter(([, g]) => g === "chime").map(([k]) => Number(k));
  assert.ok(chimes.length >= 2 && chimes.every((k) => k % 128 === 0));
});
```

- [ ] **Step 2: Run it** (FAIL).

- [ ] **Step 3: Compose and wire.** Render each song for the session's own ear-check by `artifacts/music-render.tmp.mjs` (the themes as its argument; it reads `SONGS` through the page); the session reports the peak and rms of each and keeps every song's rms within 6 dB of the banquet's.

- [ ] **Step 4: Run the checks** (`npm run test:next`, `npx tsc --noEmit`, `next-browser`, `journey-browser`: add that `__next.sound.played["music:title"] >= 1` after a click on the home screen and `music:lobby` after clocking in, `music:off` after Hammer down's sting). Expected: PASS.

- [ ] **Step 5: Commit and push**: "Music everywhere: the title tune, Pre-Check, one song a venue, quiet under the cards, a sting on Hammer down, a fanfare on the act".

### Task 17: Settings and the controller

**Files:**
- Create: `src/components/next-settings.tsx`, `src/render/gamepad.ts`
- Modify: `src/game/audio.ts` (`setVolumes`), `src/render/sound.ts` (`setVolumes`), `src/render/look.ts` (`Look.setVolumes`, the pad as an input, `HudPayload.pad`), `src/render/hud.ts` (`pad`), `src/components/next-game.tsx` (`hammer-time-sound`), `next-start.tsx` (the tools: Settings, New game), `next-hud.tsx` (the glyphs, Settings on the break card), `next-veil.tsx` (the break card's button), `next-keys.ts` (`PAD_GLYPHS`, `PAD_KEYS`), `src/styles.css`
- Test: `scripts/render.check.mjs`, `scripts/music.check.mjs`, `scripts/next-start.check.mjs`, `scripts/journey-browser.check.mjs`

**Interfaces:**
- Produces: `SOUND_KEY = "hammer-time-sound"`, `type SoundSettings = { music: number; effects: number; muted: boolean }` (0 to 100), `readSound(): SoundSettings` (defaults 80, 80, false; garbage → defaults) and `writeSound` in `next-game.tsx`; `AudioBus.setVolumes(music: number, effects: number)` (0 to 1; `musicGain` 0.07 × music, `sfxGain` 0.14 × effects, voices untouched) and `Sound.setVolumes`, `Look.setVolumes(music, effects)`; `NextSettings({ sound, onSound, quality, onQuality, pad, onClose })`: two sliders ("Music", "Effects", `input[type=range]` 0 to 100, the value spoken by `aria-valuetext`), "Sound off" (both to 0) and "Sound on" (back to 80 and 80 when both are 0), the quality select (Auto, High, Medium, Low; Auto's live tier shown beside it), "Controller: connected · A jumps · X swings · B snots · Y lobs a box · RB runs · LB towels · RT smashes · LT lectures · Start pauses" or "Controller: none", the keys table (`KEYS`), "Reduced motion follows your system"; opened by "Settings" among the home screen's tools and on the break card; "New game" among the tools asks "Start over? The journey and its bests are erased." (a `confirm`-free card with Erase and Keep) and resets the journey only. In `src/render/gamepad.ts`: `readPad(deadzone = 0.35): { connected: boolean; held: Set<Action>; start: boolean } ` by `navigator.getGamepads()` and the standard mapping (buttons 0 A `jump`, 1 B `fire`, 2 X `hammer`, 3 Y `box`, 4 LB `towel`, 5 RB `run`, 6 LT `lecture`, 7 RT `super`, 9 Start, 12 to 15 the d-pad up/down/left/right as `jump`/`down`/`left`/`right`, axes 0 and 1 the left stick as `left`/`right`/`down`); the look merges it with the keys and the pad each frame (press edges against the last frame's set), Start pauses on its edge; `HudPayload.pad: boolean`; `PAD_GLYPHS: [RegExp, string][]` in `next-keys.ts` (`/\bSpace\b/` → "A", `/\bH\b/` → "X", `/\bF\b/` → "B", `/\bB lobs\b/` → "Y lobs", `/\bShift\b/` → "RB", `/\bT\b/` → "LB", `/\bQ\b/` → "RT", `/\bE\b/` → "LT", `/\bP\b/` → "Start"), applied to the hint line and the break card's table while `pad` is true.

- [ ] **Step 1: The failing tests**

In `scripts/music.check.mjs`: `new AudioBus().setVolumes(0.5, 1)` leaves `musicGain`'s target at 0.035 and `sfxGain`'s at 0.14 (expose `bus.volumes` as `{ music, effects }` for the check); in `scripts/render.check.mjs`: `padGlyphs("H swings the mallet · hit them with the head")` → "X swings the mallet · hit them with the head", and `mapPad(buttons, axes)` (the pure half of `readPad`, exported) maps a pressed button 2 to `hammer` and axis 0 at −0.6 to `left`, at −0.2 to nothing.

- [ ] **Step 2: Run them** (FAIL).

- [ ] **Step 3: Implement**; in `next-start.check.mjs`: Settings opens, the Music slider at 0 and 100 writes `hammer-time-sound`, "Sound off" sets both to 0, the quality select is inside it, New game asks before erasing and leaves `hammer-time-best-fares` alone; in `journey-browser.check.mjs`: a reload keeps the volumes.

- [ ] **Step 4: Run the checks** (`npm run test:next`, `npx tsc --noEmit`, `next-start`, `journey-browser`, `next-browser`). Expected: PASS. Plug in a pad on the dev box if one is there; otherwise the pure test stands and the handoff says the pad was not tried on hardware.

- [ ] **Step 5: Commit and push**: "Settings: music and effects volumes, a controller with glyphs in the hint, the keys and quality in one place; New game".

### Task 18: The Service Record

**Files:**
- Create: `src/components/next-record.tsx`
- Modify: `src/render/hud.ts` (`HudPayload.bonked`), `src/components/next-game.tsx` (the lifetime count), `next-start.tsx` (the tool), `src/styles.css`
- Test: `scripts/render.check.mjs`, `scripts/next-start.check.mjs`

**Interfaces:**
- Produces: `HudPayload.bonked: number` (`game.run.bonked`); the shell adds `hud.bonked - counted` to `journey.bonked` at every `levelDone`, `over` and `clear` and sets `counted` to the run's count at every card (and 0 at a new run); `NextRecord({ journey, best, banquetBest, faresBest, onClose })`: "Service Record" with Journey total, the acts' totals (Prologue, Act 1 · The Trip, and the later acts at 0 until built), Staff bonked (lifetime), Whole shift best, Hungry Hungry Hammer best, Fare Darts best; opened by "Service Record" among the tools.

- [ ] **Step 1: The failing tests**: in `render.check.mjs`, `hudOf(game)` carries `bonked` equal to `game.run.bonked`; in `next-start.check.mjs`, the Service Record opens and shows "Staff bonked" with a number, and after a journey with a seeded save (`bonked: 7`) shows 7.
- [ ] **Step 2: Run them** (FAIL). **Step 3: Implement.** **Step 4: Run the checks.** **Step 5: Commit and push**: "The Service Record: the journey's total, the acts', lifetime staff bonked, the bests".

### Task 19: Part B's verification, the report and the handoff (Phase 1 ships)

**Files:**
- Modify: `README.md` ("SAT" section before "The lobby (1-1)", "The journey", "Music", "Settings", the validation list), the spec ("As built (Phase 1b)" notes under §6, §13, §14, §15, §16), `docs/superpowers/handoff-<date>-phase-2.md` (create)

- [ ] **Step 1: Every check** as Task 10's Step 1, plus `sat-browser`, `music.check`, `sat.check`; `look-boards.mjs` for `sat`, `home`, `cast` (the three new people), `gate`; `start-art.mjs starts,key-art`; the production build smoked against the dev verdict; 60 fps over 5 s at ultra at 1920 by 1080; the three other sizes.
- [ ] **Step 2: README, the "As built" notes, the handoff for Phase 2** in the style of `docs/superpowers/handoff-2026-10-25-r6.md`: what Phase 1 built, what is still unpainted (SAT's and the gate's as they stand), the deferred minors still open, the Phase 2 asks (the spike first, the paintings of spec §16, Blender), the environment and the rules.
- [ ] **Step 3: The fresh reviewer** over Part B's diff; fix; rerun Step 1.
- [ ] **Step 4: Commit and push**: "Phase 1 ships: SAT and the gate, music everywhere, Settings and the controller, the Service Record (README, as built, the Phase 2 handoff)". Report to the owner in product terms with the boards and the decisions.

---

## Self-review (done at writing, 2026-11-02)

1. **Spec coverage.** §4.1 to §4.7 → Tasks 2 to 6 and 15 (`&level=`, `&journey=all` in Task 5); §5.1 → Task 7; §5.2 and §5.3 → Tasks 6, 17, 18; §6.1 → Tasks 2 and 5; §6.2 → Tasks 12 to 14; §6.3 → Tasks 4, 12, 15; §7 → Tasks 2 and 5; §13 (this phase's rows) → Task 16; §14 → Task 17; §15 → Tasks 1, 8, 9, 11, 18; §16 Phase 1 → the briefs (`art/outgoing/batch-10-story-phase1.txt`, `batch-story-phase1-codex.txt`) and Tasks 11 and 14; §19 → Tasks 10 and 19. Not in this phase by the spec's own word: the awards, the slimmer phone panel, food plates, the straight-through runs of Acts 2 and 3, the night scene on the home screen (Phase 2 with 2-1).
2. **Step scan.** Every code step names its file, its signature and the spec's values; bodies appear only for the test code and the values the spec pins. The browser checks are written as lists of assertions, each checkable.
3. **Type consistency.** `StoryId` (the story's fifteen) against `LevelId` (the six built levels): `Journey.next`, `done` and `best` are `StoryId`; `levelDone.id` is a `LevelId`; the shell converts by equality (every `LevelId` but `stash` is a `StoryId`). `Snapshot` in `journey.ts` is the one `game.ts` imports. `newRun(seed, start, opts)` is the one signature in Tasks 4, 5, 12. `Look.startJourney(id, how, snapshot, hold)` is the one in Tasks 5, 6, 7. `SongId` replaces `Theme` in `audio.ts`, `sound.ts`, `level.ts` (Task 16). `HudPayload.bonked` (Task 18) and `pad` (Task 17) are the only new HUD fields.
4. **Review Focus.** Each of the five has its task named and its test added there (Tasks 3, 4, 5, 7, 10, 12, 15).
5. **Proportion.** The plan is shorter than the spec's parts it implements plus the code it will produce; the test blocks are the bulk, as they should be.

**What the owner sees between the halves:** after Task 10 the game is the journey with the hotel's four venues and the home screen live, SAT shown on the strip as the first stop but not yet playable: until Task 15, `builtStops` has no `sat`, a new journey's `next` is `sat`, and the strip treats a next stop that is not built as "coming" (decision 5) with 1-1 offered by Clock in in its place (the shell starts the first built stop at or after `next`). Task 15 then makes SAT the true start. A save made in 1a (its `done` holding `lobby` but not `sat`) gets `sat` added to `done` with no best by `migrateJourney`, so an owner mid-Act 1 is not sent back to the airport; a new journey starts at the email.

