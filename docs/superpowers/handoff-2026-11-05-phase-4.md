# Handoff: Story Phase 4, Basel, the office and the replacement (for a planning session, then a build session)

Story Phase 3 is built: Act 3 plays from 3-1's card to "Basel SBB. 17:06. On time. They always are." on a saved journey, and 3-4 reads "Coming". Your job is Phase 4 of `docs/superpowers/plans/2026-11-02-story-roadmap.md`: 3-4 Basel in Tattoo week, 3-5 the Basel office, 3-6 the replacement, and the end of Act 3.

**Repo and branch:** `C:\Users\jeste\Desktop\hammer-time`, branch `claude/hammer-pass`. `main` moves only on the owner's yes at the time. `main` holds Phase 3 since 2026-11-06: the owner moved it before playing the phase, so their play notes may still come.

## The plan is written (2026-11-06): this is now the build's handoff

The Fable planning session brainstormed Phase 4 with the owner (spec §10's, §11's and §13's "As planned (Phase 4, 2026-11-06)" notes, §16's amendment, §20 items 27 to 32) and wrote the plan: **`docs/superpowers/plans/2026-11-06-story-phase-4.md`**, fifteen tasks in three parts. **4a** (Tasks 1 to 6): the cheap leftovers, Basel's street with its errands and its door, the parade's bands as walls with a hole, the drum corps and the drill team, the drum major and the pipers who follow, Basel drawn from the session's renders with its song and the home scene, the part's verification. **4b** (Tasks 7 to 10): the costume on the level, the office's corridor and hazards, its people with the spray and the slip, the lab drawn with its song, the part's verification. **4c** (Tasks 11 to 15): the training room and the replacement's three rounds, the training room drawn with its song, the end of Act 3 with the save's end and the home, the phase's verification, the Phase 5 handoff.

**The method:** superpowers:executing-plans inline, test-first, the ledger `.superpowers/sdd/2026-11-06-story-phase-4/progress.md` (every ruling with its cost if wrong), one fresh reviewer on the most capable model at the end of each part (Tasks 6, 10 and 15). Commit and push `claude/hammer-pass` after every task; `main` only on the owner's yes at the time.

**The asks at the start:** put the owner's five Codex prompts to them before Task 1 (`art/outgoing/batch-story-phase4-codex.txt` prompts 1 to 5: Basel's four people; Basel's two straight walls and its sheet; the office's three walls and its sheet; the office's three people; the training room's three walls, the kid and the training sheet) and carry on without waiting. Prompt 6 (the bridge and the Marktplatz over the game's renders) is handed over at Task 5 with the renders. The renders are the session's own Blender work (`scripts/blender/basel.py`, Task 5). The brief is `art/outgoing/batch-13-story-phase4.txt`. Phase 3's prompts 1 to 4 may still be out with the owner: cut their paintings in as they land, as the handoff's unpainted list says.

**What the plan supersedes in this file and the spec:** the scrubs costume layer is already painted and rigged (`public/art/hammer/scrubs-*`), so `hammer/body-scrubs.png` is struck; the drum major's file is `cast/major.png`; the training room is three walls (`training-far-1..3`), not one; the parade's bands are a module of their own (`src/sim/parade.ts`), not cast; the lab's gurney and spray numbers are scaled to this game's size and a gurney is never slid under; the epilogue stays in Phase 5, so the save ends on "The epilogue is coming". The "Phase 4's asks" section below stands otherwise. Act 3 play notes from the owner are fixed between tasks as they come.

## Read first, in full, before any code

0. `docs/superpowers/plans/2026-11-06-story-phase-4.md`, the whole plan, then this file.
1. `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md`: §1 and §2 (the decisions and the rules), §10 and §11, §9's "As built" notes, §12, §13, §15's art schedule, §19.
2. `docs/superpowers/plans/2026-11-02-story-roadmap.md`, Phase 4 and the art schedule.
3. `docs/superpowers/plans/2026-11-05-story-phase-3.md` and `2026-11-05-story-phase-3-ledger.md`: the last plan, for its format and its Review Focus, and every ruling it took.
4. `README.md`: "Row 52", "Paris", "The brasserie", "The 14:02", "The journey", "Music".
5. The code Phase 4 builds on: `src/sim/levels/train.ts` (rooms that name their walls, a stretch on its own clock), `src/sim/conductor.ts` (the newest boss), `src/render/venue-train.ts` (a level's moving parts over painted walls), `scripts/blender/train.py` (renders whose furniture stands by the level's numbers).

## What Phase 3 built

- **3a:** the flight as the second 3D level on `ThreeView` with lanes, the seatbelt sign, the drinks carts, the queue and the purser; Paris with its lift, its gate and its closed street; the French table on the lounge's menu pattern; four songs.
- **3b:** Gare de Lyon on its own two-minute clock; eighteen coaches as rooms under a low ceiling he tucks under; the conductor at three doors; the countryside and the tunnel; Act 3's cards to Basel.
- Tests at the end: 818 passing. Twenty-one browser checks at the sizes they name, on dev; flight, Paris, train and journey on the production build. 74 to 79 fps in the cabin at medium and 116 to 120 on the train, on the laptop's integrated card on mains. On battery in its Silent plan every screen holds near 43: a run there sets `FPS_FLOOR`.

## What is still unpainted

Prompts 1 to 4 of `art/outgoing/batch-story-phase3-codex.txt` are with the owner:

- **The six people:** `cast/purser.png`, `attendant-1.png`, `concierge.png`, `parisian-1.png`, `garcon.png`, `conductor.png`. Each draws in a borrowed painting (`PAINTING_OF` in `src/sim/cast.ts`) until cut: write `art/cuts/cast-<name>.json`, take the name out of `PAINTING_OF` and the recolor off its spawns and `boss-view.ts`.
- **Paris:** `backdrops/paris-far-1..4.png`, `paris-mid-1..2.png`, `paris-fore-1.png`; the game draws its own until then.
- **The brasserie:** `backdrops/brasserie.png`, `props/french-sheet.png`.
- **The train's sheet:** `props/train-sheet.png` (six pieces, `nameTrainPieces`); drawn stand-ins until then.

**In:** the station's two walls and the three coaches (`backdrops/station-1..2.png`, `train-far-1..3.png`).

## Open from Phases 2 and 3

The ledgers' `minor (deferred)` lines are the list. From Phase 3:

- For the middle third of a lane change's 0.18 s he counts in both lanes for a bag or the cart.
- Holding A and tapping D steps him a further lane left when D comes up.
- In 3D a drinks cart launched before she woke is undrawn during her 1.5 s push, and still shoves.
- A respawn at row 30's clock lands him inside the first of the queue, who pops him back 105 px.
- A summoned conductor follows him anywhere, through every wall, even back down the platform.
- The countryside's phase keys on where he stands: stepping back left of the tunnel's mouth turns the hills back into fields.
- A knockdown in the 1.45 s after the conductor's ninth hit keeps the win but not its 1,000 points.

From Phase 2: a snot rocket as the supervisor's last hit gives no ride cart; the bellhops' keycards drop again after a lost life while the fixed ones stay taken; `let carts` in `supervisor.ts` is module state; his profile on the game's canvas uses the 3D camera of the frame before; a door's leaf and the wall it makes disagree by 0.2 m and half a second; the puddle slips him across the hall's whole width; a dropped keycard in the suite pogoes off the bed.

**Never measured:** the laptop's RTX 4070 in the 3D levels. The headless checks run on its integrated card, which settles at medium. The songs have been measured for loudness and never heard by a session.

## Phase 4's asks

- Basel's bridge and Marktplatz from Blender renders painted over, on the train's pattern (`scripts/blender/train.py`, `art/cuts/wall-train-far-N.json`, a room's `wall`).
- The parade's bands as cast with a beat.
- The office's walls and people, and the scrubs costume layer.
- The training room and the replacement, with its sheet.
- The end of Act 3: its act card and what the save does there. Act 3's straight-through run and the awards are Phase 5 (`STRAIGHT_BUILT`).

## The rules

The face rule, the Affliction shirt and the six recordings as the only spoken lines bind every level. The owner is not a developer: plain language, no emojis, decisive, never asked to run commands or check things, reports in product terms with images, every decision made for them listed. Art is made by the owner in Codex: give exact paste-ready prompts, and stand-ins draw until a painting lands. Never modify `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3` or `public/voice/*`.

## A trap: never run `npm install --no-package-lock`

It wrecked `node_modules` in Phase 2. Never stage, revert or touch `package-lock.json` or `src/routeTree.gen.ts` (its hash stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`).

## Environment (Windows 11, this laptop)

- Git has no identity: write the message to `.git/CLAUDE_MSG` and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, named paths only.
- Ports 8080 and 8081 belong to another tool: dev on 8090, preview on 8091. Run them as `PATH="$PWD/node_modules/.bin:$PATH" node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort` from the Bash tool in the background. Browser checks need `BROWSER_SMOKE_CHANNEL=chrome` and no `src/` edits while one runs. Many files are CRLF.
- Blender 5.2 by script: `"$LOCALAPPDATA/Programs/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/<name>.py`.
- A `?next=1&dev=1&level=<id>` page jumps to a level; a saved journey is the way to test the shell's cards (`openStop` in `scripts/paris-browser.check.mjs`).
