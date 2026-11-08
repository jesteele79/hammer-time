# Handoff: Story Phase 5, the epilogue and 1.0 (for a planning session, then a build session)

Story Phase 4 is built: Act 3 plays from 3-1's card through Basel in Tattoo week, the Basel office in scrubs and the replacement's three rounds to "The Basel office would like you to stay on. As Trainer for Life." ("Obviously.") and "Act 3 · The Last Tour · complete". The journey is finished there and Clock in reads "The epilogue is coming". Your job is Phase 5 of `docs/superpowers/plans/2026-11-02-story-roadmap.md`: the epilogue's eight cards and the credits, the Buc-ee's booth at home, the awards, the straight-through runs for Acts 2 and 3, the food plates, the last of the deferred minors, and the final review of the whole game.

**Repo and branch:** `C:\Users\jeste\Desktop\hammer-time`, branch `claude/hammer-pass`. `main` moves only on the owner's yes at the time. `main` holds Phase 4 since 2026-11-08, on the owner's word before playing it.

## Read first, in full, before any code

1. `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md`: §1 and §2 (the decisions and the rules), §11.2 (the epilogue and the credits), §10's and §11's "As planned" and "As built (Phase 4a/4b/4c)" notes, §13, §15's art schedule, §16, §19.
2. `docs/superpowers/plans/2026-11-02-story-roadmap.md`, Phase 5 and the art schedule.
3. `docs/superpowers/plans/2026-11-06-story-phase-4.md` and `2026-11-06-story-phase-4-ledger.md`: the last plan, its Review Focus, and every ruling it took with its cost if wrong.
4. `README.md`: "Basel (3-4)", "The Basel office (3-5)", "The replacement (3-6)", "The journey", "Music".
5. The code Phase 5 builds on: `src/sim/story.ts` (`STORY`, the cards, `END_LABEL`), `src/sim/journey.ts` (`finished`, `finishLevel`, `homeOf`, `credits`), `src/components/next-veil.tsx` (the cards), `src/components/next-start.tsx` (Clock in, the strip, the home scene), `src/render/venue-training.ts` (a room drawn by the game until its paintings land).

## What Phase 4 built

- **4a, Basel (3-4):** the street with its four errands and the office's door, the parade's bands as marching walls with a hole (`src/sim/parade.ts`), the drum corps' shake, the drill team's rifles, the drum major on the Marktplatz and the four pipers who follow Hammer, the bridge and the Marktplatz from the session's Blender renders, dusk over the clock, its song, Basel's street as the home scene from the suite on.
- **4b, the Basel office (3-5):** the costume on the level (scrubs with the TRAINER badge), the corridor's gurneys and IV poles, the sharps bins, the code blue stretch, the autoclave's steam, the vending machines; the nurses' sanitizer and its slip, the techs' shove, the residents' charts, the administrator's greeting; the monitor's beep.
- **4c, the replacement (3-6):** the training room, the kid's three rounds on one bar (the ring light and its stand; the residents, the drone, the lecture's freeze and the IFU; the video on the screen and three smashes), "absolute bullshit" on the first hurt and "They need to get fired" on the last hit, the carry-out and the administrator, the end of Act 3, the save finished.
- Tests at the end: 882 unit tests; twenty-three browser checks on dev (the replacement's new); Basel, the office, the replacement and the journey on the production build. 120 fps in the code blue and in the replacement's round two at the quality Auto picks headless on the laptop's integrated card.
- Found and fixed at the end, older than this phase: a stop clocked into from a home scene of another level drew no room, and its people could stay stand-ins (`look.ts`'s first frame out of the home screen, `cast.ts`'s views); the act card's Continue after the last stop started it over (`next-game.tsx`).

## What is still unpainted

Every painting asked for in Phases 3 and 4 is still with the owner; the game draws a stand-in for each until it lands, and cutting one in is the session's job.

- **Phase 3** (`art/outgoing/batch-story-phase3-codex.txt` prompts 1 to 4): the six people (`cast/purser.png`, `attendant-1.png`, `concierge.png`, `parisian-1.png`, `garcon.png`, `conductor.png`), Paris's walls (`backdrops/paris-far-1..4.png`, `paris-mid-1..2.png`, `paris-fore-1.png`), the brasserie (`backdrops/brasserie.png`, `props/french-sheet.png`), the train's sheet (`props/train-sheet.png`).
- **Phase 4** (`art/outgoing/batch-story-phase4-codex.txt` prompts 1 to 6): Basel's four people (`cast/piper.png`, `drummer.png`, `drill.png`, `major.png`), Basel's straight walls and its sheet (`basel-far-1`, `basel-far-4`, `props/basel-sheet.png`), the bridge and the Marktplatz painted over the renders (`basel-far-2..3`), the office's three walls and its sheet (`lab-far-1..3`, `props/lab-sheet.png`), the office's three people (`cast/tech.png`, `resident.png`, `admin.png`), the training room's three walls, the kid and its sheet (`training-far-1..3`, `cast/replacement.png`, `props/training-sheet.png`, seven pieces: `nameTrainingPieces`).
- A person draws in a borrowed painting (`PAINTING_OF` in `src/sim/cast.ts`) until cut: write `art/cuts/cast-<name>.json`, take the name out of `PAINTING_OF` and any recolor off its spawns and `boss-view.ts`. A sheet is cut by `scripts/art-sync.mjs` once it is in `art/incoming/props/`.

## Open from Phase 4

The ledger's `minor (deferred)` lines are the list, with the final review's. From Phase 4 so far:

- The drill team's rifles show the "Paper incoming" hint.
- Riding a bike back over the ramp's leap costs a pip.
- Try again from a level-done snapshot keeps that level's errands on the run (harmless: only Basel reads them).
- `dev.boss` wakes any boss it touches (the checks only).
- A costume body that fails to load is still swapped in; the costume swap is not part of a level's readiness (he may change on screen as the card lifts), each swap leaks its meshes' geometry, a towel loaded late goes to a discarded body. Building each costume once and toggling would end all three.
- LabView clears and refills its Graphics every frame.
- The boards can shoot the old body when the same costume is already loading (dev only).
- Picking up the IFU sets his boxes to one, losing boxes he carried in.
- The smash's own burst lands the hit on the screen's first two cracks when he smashes from near the lectern.
- A second freeze on the kid overwrites the first's time rather than extending it.
- With the journey finished, the strip shows 3-6 pressed while Clock in is disabled, and clicking it turns on its replay; the strip no longer centres.
- The held IFU draws behind his torso; the last hit snaps the kid from a row to the floor; the screen's still picture is redrawn every frame.

From Phases 2 and 3: see `docs/superpowers/handoff-2026-11-05-phase-4.md`'s "Open from Phases 2 and 3"; none of them was taken up in Phase 4.

**Never measured:** the laptop's RTX 4070 in the 3D levels (the headless checks run on the integrated card). The songs have been measured for loudness and never heard by a session. No human has played Basel, the office or the replacement.

## Phase 5's asks

- The epilogue's eight cards over painted renders (§11.2), skippable after the first viewing, the credits with the kid in the front row, `credits` turning true, the Buc-ee's booth as the home scene and the epilogue's card on the strip. Clock in's "The epilogue is coming" (`END_LABEL`, `finished` in `journey.ts`) is where it starts.
- The awards in his voice on the home screen's tools.
- "Play the night straight through" and "Play the tour straight through" (`STRAIGHT_BUILT` in `story.ts`).
- Food plates on the counters of 1-2, 1-3, 3-3, 3-4 and 3-5; the slimmer stats panel on short screens.
- The whole journey played start to finish by the scripted drivers in one run (each level has its driver in `src/sim/drive.ts`; the replacement's wins in about 150 s).

## The rules

The face rule, the Affliction shirt (scrubs only where a level names them) and the six recordings as the only spoken lines bind every level. The owner is not a developer: plain language, no emojis, decisive, never asked to run commands or check things, reports in product terms with images, every decision made for them listed. Art is made by the owner in Codex: give exact paste-ready prompts, and stand-ins draw until a painting lands. Never modify `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3` or `public/voice/*`.

## A trap: never run `npm install --no-package-lock`

It wrecked `node_modules` in Phase 2. Never stage, revert or touch `package-lock.json` or `src/routeTree.gen.ts` (its hash stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`).

## Environment (Windows 11, this laptop)

- Git has no identity: write the message to a file with the Write tool (never PowerShell, which adds a BOM) and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F <file>`, named paths only.
- Ports 8080 and 8081 belong to another tool: dev on 8090, preview on 8091. Run them as `PATH="$PWD/node_modules/.bin:$PATH" node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort` from the Bash tool in the background. Browser checks need `BROWSER_SMOKE_CHANNEL=chrome` and no `src/` edits while one runs. Many files are CRLF.
- `npx eslint .` reports one error in `src/lib/app-data/client.server.ts`, untouched since the first commit; lint the game's own folders (`src/sim src/render src/game src/components src/routes src/art scripts`).
- Loudness: `node artifacts/music-render.tmp.mjs banquet,<song>[@section]` against the dev server; every song within 6 dB of the banquet's -53.8 dBFS.
- Blender 5.2 by script: `"$LOCALAPPDATA/Programs/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/<name>.py`.
- A `?next=1&dev=1&level=<id>` page jumps to a level; a saved journey is the way to test the shell's cards (`openStop` in `scripts/lab-browser.check.mjs`); `&journey=all` opens every stop for the page.
