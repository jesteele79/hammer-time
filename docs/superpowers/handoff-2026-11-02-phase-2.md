# Handoff: Story Phase 2, Act 2: Status Crusade (for the Fable planning session, then an Opus 5.5 session at extra-high effort)

Story Phase 1 is built: the game is one story whose prologue (SAT) and Act 1 play as a journey saved in the browser. Your job is Phase 2 of `docs/superpowers/plans/2026-11-02-story-roadmap.md`: the three.js spike first, then the plan for 2-1 to 2-4 written with the owner, then the build.

**Repo and branch:** `C:\Users\jeste\Desktop\hammer-time`. Phase 1a was merged into `main` on the owner's yes (2026-11-02, a fast-forward to 8356d9e, done as `git push origin 8356d9e:refs/heads/main`; the checkout has no local `main`). Phase 1b is on `claude/hammer-pass` from 8356d9e; its merge into `main` waits for the owner's yes at the time. Check `git log` first and say in your first message whether the merge has happened. Two uncommitted files, `package-lock.json` and `src/routeTree.gen.ts`, belong to the owner: never stage, revert or touch them. `git hash-object src/routeTree.gen.ts` must stay `dceedffdc12c32138e81bb63787cac7ae5d97fcd`; check it after any edit to `src/routes/index.tsx`.

## Read first, in full, before any code

1. `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md`: §1 and §2 (the decisions and the rules), §4 and §5 (the journey, the home screen), §8 (Act 2), §12 (the 3D levels and the spike), §13 to §16, §19, and every "As built (Phase 1a)" and "As built (Phase 1b)" note.
2. `docs/superpowers/plans/2026-11-02-story-roadmap.md`, Phase 2 and the art schedule.
3. `docs/superpowers/plans/2026-11-02-story-phase-1.md`: the last plan, for its format, its Review Focus and its test style.
4. `README.md`: "SAT (the prologue)", "The start screen", "The journey", "Music", "Settings, the controller and the Service Record".
5. The code Phase 2 builds on: `src/sim/story.ts` (the stops, the acts, `shiftFrom`), `src/sim/journey.ts` (the save, `bonkedCount`), `src/sim/game.ts` (journey runs, the story hold, lessons and thoughts), `src/sim/levels/` (SAT is the newest level), `src/render/look.ts` (`LEVELS`, `SHIFT`, `prepare`, `musicFor`'s call sites), `src/render/venue-sat.ts` (the newest drawn venue), `src/game/audio.ts` (`SONGS`), `src/components/` (the shell, Settings, the Service Record).
6. The art: the owner makes art with Codex in its work-on-this-laptop mode and wants exact paste-ready prompts (Phase 1's are in `art/outgoing/batch-story-phase1-codex.txt`, with the brief `art/outgoing/batch-10-story-phase1.txt`).

## What Phase 1 built

- **1a:** the story table and the journey's save with the snapshot behind Try again; the journey strip; Hammer live on the home screen with his twelve insults; the email and the story cards; Act 1's ending (the Bonvoy card, the act card); the floor's edge where the dark band was; the laptop look pass (ultra on a desktop card, the body and the cast crisp at 1080p).
- **1b:** SAT, the airport prologue and tutorial (lessons that teach each move, his thoughts, the skycap, two TSA agents who shove with their hands, the bartender's coasters, the X-ray belt, the body scanner, gate B7 opening Fare Darts as the level's end); the journey starting at the email and SAT; a song for every place and music under every card (quiet), Hammer down's four notes and the act's fanfare; Settings (two volumes kept on the device, the quality, the keys, the controller) and New game; a controller with its buttons named in the hint; the Service Record with lifetime staff bonked.
- Tests at the end: 618 in `npm run test:next`; fifteen browser checks green on dev and the main four on the production build, after the final review's four fixes (every bonk counted once, the hurry only in play, the music after a hidden tab, the pad's words on a phone).

## Phase 1's paintings are all in (2026-11-04)

The airport's and the gate's twelve paintings are cut and synced. **One lesson for the Phase 2 wall prompts:** ask for walls at 1536 x 1024, the hotel's shape, not "the widest the tool offers". The SAT walls came back 2172 x 724: twice as wide and three-quarters as tall, which only fit a level half the hotel's length through `backdrop.far` (its own scale and pan) and a band of sky above the roof. A corridor in the night tower has no sky to carry on into.

## Phase 2's asks

1. **The spike first** (spec §12.4): a throwaway three.js corridor on a second canvas under the React HUD, Hammer as a flat cut-out with a chase camera, A stepping him left. Write its verdict (three.js, or the drawn perspective corridor as the fallback) for the planning session; its code is never kept.
2. **The plan** for 2-1 to 2-4, written in a Fable session with the owner (brainstorm first), approved before any build.
3. **The Phase 2 paintings of spec §16:** `cast/guard`, `cast/housekeeper`, `cast/titanium`; the lounge and its sheet; the tower's walls and sheet; the suite from a Blender render painted over; Hammer's back view and frames and the cast's back views. Write the paste-ready Codex prompts early, so the owner can paint while you build.
4. **Blender 5.2** (`%LOCALAPPDATA%\Programs\Blender Foundation\Blender 5.2`) for the hallway's set and the suite's render.
5. 2-1 is shown "coming" on the strip until it is built; Phase 2 removes the "Act 2 is coming" notice by building the level, and the home screen's scene becomes the lobby at night once Act 1 is done.

## Phase 1's rulings worth knowing (every ruling, with its cost if wrong, is in `docs/superpowers/plans/2026-11-02-story-phase-1-ledger.md`)

- The prologue flows into Act 1; Acts 2 and 3 start clean. A level starts with three lives or more. The snapshot holds what he carries (`carry`).
- A Phase 1a save that clocked in past SAT keeps it finished with no best (it replays from the strip; New game plays it in order).
- SAT: the second TSA agent stands just past the scanner (5,150); an agent with no cart squares up within 420 px and waits for Hammer to stand before shoving; a runaway cart hurts only while closing on him (every level); the bartender wears server-1 unrecolored; thoughts fire once a run on passing a mark going right, within 160 px.
- `&level=sat` plays SAT as the journey does without making it part of Work the whole shift (`SHIFT` stays the hotel's four).
- Music: `musicFor(mode, level, quest)` is the one place that decides what plays; Hammer down's notes are `hammerDown` (the bus's `sting` is the wind-up's cue); the fanfare plays as an act's card comes up, not on Shift over.
- Settings: the home screen's top bar is Service Record, Settings, New game; the quality, the keys and the volumes live in Settings; the HUD's speaker button is the one mute; while Settings is open the game ignores keys. New game keeps the lifetime staff bonked.
- Staff bonked is counted by `bonkedCount`: a run's start counts from where it stands, a level's tally adds its own, Hammer down and Shift over add the rest.

## Deferred minors (none affects fairness; fold the cheap ones into your first plan's first task)

- From Phase 1a's final review: `migrateJourney` keeps an inconsistent next/done pair from a hand-edited save, which can leave a stop locked forever; unknown top-level save fields are dropped on the next write by an older build; `isDesktopGpu` misses Intel Arc on WebGPU (vendor "intel", architecture "xe-hpg"); the gate's ladder redraws nearly every frame while A-LIST PREFERRED pulses; a key first pressed during a story card closed by mouse can land as a press in play on a very slow key repeat; `faceTop` in `floor-face.ts` is an unused export; replaying the story's last stop while it is still next (Phase 3) would overwrite the saved run; the strip's locked stops are disabled buttons, so the keyboard cannot reach them.
- From Phase 1b's final review (its four Important findings were fixed): `&level=sat` (a dev and board route) writes the real journey save when its gate is finished; Settings opened before the game is ready does not tell the game a menu is open; the three dialogs (Settings, New game, Service Record) neither trap Tab nor return focus to their opener; the act's fanfare rides the music bus at the card's quiet level; SAT's card eyebrow reads "World SAT"; "Sound off" (both sliders at 0) and the HUD's speaker (the mute) disagree about whether sound is off; the journey check's `music:title` counts the tune asked for, not heard; New game keeps the lifetime staff bonked while its card says the journey and its bests are erased (the owner's call); sound unlocks on `pointerdown` only, and Safari may want `pointerup` too (needs a phone).
- Carried from the R6 handoff: `BanquetView.load` is all-or-nothing on Hammer's character; the banquet's bonk pushes a dish between his plate and the rim outward into the rim; "Paper incoming" lingers while a missed plane sails past; the top plush shelf (360) is lower than the pig's collider (400); every venue's walls, pieces and paintings stay in memory for the whole run; the per-job idle beats of the R3 design are not built; the silly face ignores recolors; the cart snaps 300 px through the bellhop at a wind-up toward the other side; colliders keep standing height in every posture; the balcony slab blocks planes aimed under it; the spoken caption has no tail; the thought cloud's lobes overhang slightly; the HUD portrait loads late; a double rig solve per frame; `isFares` tells the gate's events by their `fd` prefix.
- Open and optional: the owner's "knocked silly" face edits (`art/incoming/cast/<person>-silly.png`), and `art/incoming/brand/key-art.png`.

## Standing rules

- The face rule, the Affliction shirt, the six recordings as the only spoken lines (spec §2). Nothing under `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3` or `public/voice/*` is modified. The sync records owner files in `art/manifest.json`; a commit stages only the entries for the files it adds.
- The owner is not a developer: plain language, no emojis, decisive on technical matters, never ask them to run commands or check things for you, report in product terms with the images, and list every decision you made for them.
- Version control: commit and push `claude/hammer-pass` after every task (standing permission); `main` only on the owner's explicit yes at the time.

## Environment (Windows 11, this laptop)

- Ports 8080 and 8081 belong to another tool. The dev server runs on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort` with `node_modules\.bin` on PATH). The production preview runs on 8091 after `node scripts/with-app-env.mjs vite build` (`node scripts/with-app-env.mjs vite preview --host 127.0.0.1 --port 8091 --strictPort`); restart the preview after every rebuild. `browser-smoke.mjs` waits one second, too short for the production page to boot (it shows no canvas there); the real checks against 8091 are the proof.
- Browser checks need `BROWSER_SMOKE_CHANNEL=chrome`: `next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `hungry-browser`, `flop-browser`, `fares-browser`, `journey-browser`, `voice-browser`, `sat-browser` (pass each `http://127.0.0.1:8090/`), `look-boards.mjs` (a board list as its third argument), `start-art.mjs` (`key-art`, `starts`, `banquet`, `gate`; `starts` re-renders every stop's picture with fresh random pickups, so put back the ones that did not change). Do not edit any project file while a browser check runs: the dev server reloads the page under it.
- Tests: `npm run test:next` (add new check files to its list in `package.json`), `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts` (two findings in `src/lib/app-data` and `src/lib/auth` are the platform's own). Pixi objects cannot be constructed under `node:test`: node tests touch pure functions only; render changes are verified on boards and in the browser. One file runs with `node --loader ./scripts/game-test-loader.mjs --test scripts/<file>.check.mjs`.
- The headless browser checks run on the laptop's AMD Radeon 780M, which the quality rule counts as a desktop card (ultra at 120 fps at 1920 by 1080).
- Git has no identity. Write the message to `.git/CLAUDE_MSG` with the Write tool and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`. `git add` named paths only. End messages with the attribution line your session is given. Ignore CRLF warnings.
- Many source files use CRLF line endings: an exact-string edit script must normalize them (`artifacts/edit.mjs`, git-ignored, `edit(file, [[from, to], ...])`; recreate it if gone). The Bash tool eats one level of backslashes, in heredocs too: anything with a regex or an escape goes through the Write or Edit tool. Never run Prettier over a whole file.

## How to work

- The owner judges the work by zooming into board images and screenshots on a phone, and play-tests in the browser panel. Render boards and screenshots and look at everything new at full size before showing it; check feet against floors and his face against every bubble and card.
- Each task: the failing test first, run it, the smallest code that passes, the checks the task names, commit, push, the ledger line. A plan step that turns out wrong is a ruling: take the plan's intent, write it down with its cost if wrong, and report it.
