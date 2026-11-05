# Handoff: Story Phase 3, the way to Basel (for the Fable planning session, then an Opus 5.5 session at extra-high effort)

Story Phase 2 is built: Act 2 plays from 2-1's card to "Act 2 · Status Crusade · complete" on a saved journey. Your job is Phase 3 of `docs/superpowers/plans/2026-11-02-story-roadmap.md`: 3-1 the flight, 3-2 Paris with the French table, 3-3 the train.

**Repo and branch:** `C:\Users\jeste\Desktop\hammer-time`, branch `claude/hammer-pass`. `main` moves only on the owner's yes at the time.

## The plan is written (2026-11-05): this is now the build's handoff

The Fable planning session brainstormed Act 3 with the owner (spec §9's and §12's "As planned (Phase 3, 2026-11-05)" notes, §20 items 23 to 26) and wrote the plan: **`docs/superpowers/plans/2026-11-05-story-phase-3.md`**, fifteen tasks in two halves. **3a** (Tasks 1 to 9): the cheap leftovers and the strip's label, the cabin from Blender and the view's second set, the flight's sim with its three snapped lanes, its run and the purser, the cabin drawn with his back crouching, Paris's hotel and street, the French table, Paris drawn, the four songs, the half's verification and report. **3b** (Tasks 10 to 15): the station on its stretch clock, the eighteen coaches as rooms, the conductor, the train drawn from the session's renders, Act 3's cards, the phase's verification, the Phase 4 handoff.

**The method:** superpowers:executing-plans inline, test-first, the ledger `.superpowers/sdd/2026-11-05-story-phase-3/progress.md` (every ruling with its cost if wrong), one fresh reviewer on the most capable model at the end of each half (Tasks 9 and 15). Commit and push `claude/hammer-pass` after every task; `main` only on the owner's yes at the time.

**The asks at the start:** put the owner's four Codex prompts to them before Task 1 (`art/outgoing/batch-story-phase3-codex.txt` prompts 1 to 4: the six people; Paris's walls and pieces; the brasserie's room and the French sheet; the train's sheet) and carry on without waiting. Prompt 5 (the station's two walls and the three coaches over the game's renders) is handed over at Task 13 with the renders. The cabin's set is the session's own Blender work (Task 2). The brief is `art/outgoing/batch-12-story-phase3.txt`.

**What the plan supersedes in this file and the spec:** §16's `station.png` is two walls (`station-1..2`) and `paris-far-1..3` is four walls with three pieces (`paris-far-1..4`, `paris-mid-1..2`, `paris-fore-1`); the attendants are one painting (`attendant-1`) recolored; the kids are the student at child size; the flight is a run with snapped lanes; the brasserie's round ends 3-2. The "Phase 3's asks" section below stands otherwise. Act 2 play notes from the owner are fixed between tasks as they come.

## Read first, in full, before any code

0. `docs/superpowers/plans/2026-11-05-story-phase-3.md`, the whole plan, then this file.
1. `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md`: §1 and §2 (the decisions and the rules), §9 (Act 3) with its "As planned (Phase 3)" note, §12 and its notes, §13 to §16, §19.
2. `docs/superpowers/plans/2026-11-02-story-roadmap.md`, Phase 3 and the art schedule.
3. `docs/superpowers/plans/2026-11-04-story-phase-2.md` and `2026-11-04-story-phase-2-ledger.md`: the last plan, for its format and its Review Focus, and every ruling it took.
4. `README.md`: "The fourteenth floor", "The suite", "The 3D view", "The journey", "Music".
5. The code Phase 3 builds on: `src/render/3d/` (the second 3D level goes on `ThreeView`), `src/sim/hall.ts`, `src/sim/levels/hallway.ts`, `src/sim/quests/hungry/food.ts` (`Menu`: the French table goes where the lounge's went), `src/sim/titanium.ts` (the newest boss).

## What Phase 2 built

- **2a:** the lobby at night with its keycards and five tiers, the M CLUB side quest, the night crew (the guard's flashlight, the auditor's reply-all, the servers' ice water), the tower's fourteen floors and the supervisor, five songs.
- **2b:** three.js in the page on a second canvas under the game's, the fourteenth floor in 3D with a flat fallback, his back rigged from one painting, the suite and Lifetime Titanium guy in three rooms, Act 2's cards and its ending.
- Tests at the end: 716 passing. Eighteen browser checks at the sizes they name, on dev; night, journey, hall and suite on the production build.

## What is still unpainted

- **The suite's three walls are in,** since 2026-11-05: `art/incoming/backdrops/suite-1..3.png`, each floor line at 768. `scripts/suite.check.mjs` reads the paintings and holds the furniture's platforms to them. The renders in `art/outgoing/renders/` stay as the sync's fallback.
- **In the hall:** the set is plain boxes, shaded and inked, by design; the leaf of a swinging door and the carts' pictures are simple. The duster and the vending machines are drawn in code.
- Everything else of Phase 2 is painted and cut: the guard, the housekeeper, Lifetime Titanium guy, the lounge and its sheet, the tower's walls and its sheet.

## Open from Phase 2

The ledger's `minor (deferred)` lines are the list:

- A snot rocket as the supervisor's last hit gives no ride cart.
- The bellhops' keycards drop again after a lost life while the fixed ones stay taken.
- `let carts` in `supervisor.ts` is module state.
- His profile on the game's canvas uses the 3D camera of the frame before: one frame's lag.
- `ThreeView` is not destroyed by the game's `stop()`; a rejected `loadPeople` leaves it alive and the hall flat; a context lost before `onContextLost` is assigned goes unnoticed.
- The puddle slips him across the hall's whole width, though it is drawn from lx -0.4, 2.4 m wide.
- A door's leaf and the wall it makes disagree by 0.2 m and half a second.
- A dropped keycard in the suite pogoes off the bed.

**Never measured:** the laptop's RTX 4070 in the hall. The headless checks run on its integrated card, which settles at medium. The songs have been measured for loudness and never heard by a session.

## Phase 3's asks

- The cabin's Blender set and the flight as the second 3D level on `ThreeView`: its `load` takes one glb today; make it take the level's.
- The purser and the attendant, painted.
- Paris and the brasserie with the French table, on the lounge's menu pattern.
- The train from Blender renders painted over, the suite's way: `scripts/blender/suite.py` and `art/cuts/wall-suite-far-N.json` are the pattern, one wall a room or a car with a pan of 1 so the painted furniture meets the platforms. A level of rooms shows the painting's own floor; `drawVenue`'s `suitePainted` names the suite's first wall, so the train wants its own.
- Act 2's straight-through run and the awards are Phase 5 (`STRAIGHT_BUILT`).

## The rules

- The face rule, the Affliction shirt, the six recordings as the only spoken lines (spec §2). Nothing under `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3` or `public/voice/*` is modified.
- The owner is not a developer: plain language, no emojis, decisive on technical matters, never ask them to run commands or check things for you, report in product terms with the images, and list every decision you made for them.
- Version control: commit and push `claude/hammer-pass` after every task; `main` only on the owner's explicit yes at the time. Never stage `package-lock.json` or `src/routeTree.gen.ts` (its hash stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`).

## A trap: never run `npm install --no-package-lock`

The Phase 2 plan said to install three.js that way, and the spec's text may still suggest it. With the lockfile ignored npm re-resolves the whole tree: it moved 161 folders aside, upgraded 146 packages, failed in its own rollback, and left `node_modules` off the lock with the command shortcuts gone. It was recovered by hand (every retired folder put back, two emptied packages re-extracted, `npm rebuild --ignore-scripts` for the shortcuts). **To add a package:** add it to `package.json` at an exact version and extract its tarball and its dependencies' into `node_modules` by hand, or ask the owner first. `three` and `@types/three` are in `package.json` and not in the lockfile: a fresh `npm install` will write them into it.

## Environment (Windows 11, this laptop)

- Ports 8080 and 8081 belong to another tool. The dev server runs on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort` with `node_modules\.bin` on PATH). The production preview runs on 8091 after `node scripts/with-app-env.mjs vite build` (`node scripts/with-app-env.mjs vite preview --host 127.0.0.1 --port 8091 --strictPort`); restart the preview after every rebuild. `browser-smoke.mjs` takes `<url> <png path> [--baseline <json>]`; it waits one second, too short for the production page to boot, so "canvas disappeared" against the baseline is expected and the real checks against 8091 are the proof.
- Blender 5.2 runs in the background: `"$LOCALAPPDATA/Programs/Blender Foundation/Blender 5.2/blender.exe" --background --python <script>`.
- Browser checks need `BROWSER_SMOKE_CHANNEL=chrome`: `next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `hungry-browser`, `flop-browser`, `fares-browser`, `journey-browser`, `voice-browser`, `sat-browser`, `night-browser`, `hallway-browser`, `suite-browser`, each given `http://127.0.0.1:8090/`. `look-boards.mjs` takes a board list as its third argument. `start-art.mjs` with `starts` re-renders every stop's picture with fresh random pickups: put back the ones that did not change. Do not edit `src/` while a browser check runs: the dev server reloads the page under it. Run long ones in the background.
- The laptop sleeps during a long check, and the page dies with `ERR_NETWORK_IO_SUSPENDED`: run it again.
- Tests: `npm run test:next` (add new check files to its list in `package.json`), `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`. Pixi objects cannot be constructed under `node:test`.
- A press of H while a swing is still under way is no new swing: a check that presses it in a loop must wait for `__next.moves.move` to clear.
- Git has no identity: write the message to `.git/CLAUDE_MSG` with the Write tool and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`. Commit named paths only.
- Many source files use CRLF line endings: an exact-string edit script must normalize them (`artifacts/edit.mjs`, git-ignored, `edit(file, [[from, to], ...])`; recreate it if gone). The Bash tool eats backslashes and heredocs with apostrophes break: put edit scripts in files with the Write tool.
