# Handoff: Story Phase 1, Act 1 as a finished chapter (for an Opus 5.5 session at extra-high effort)

Branch `claude/hammer-pass`, from the commit that carries this file. Read in full before any edit: this file; the plan `docs/superpowers/plans/2026-11-02-story-phase-1.md` (every task, the Global Constraints, the Review Focus, the decisions); the spec `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md` (§1 to §7, §13 to §20); the roadmap `docs/superpowers/plans/2026-11-02-story-roadmap.md`; `docs/superpowers/handoff-2026-10-25-r6.md` (the R5 rulings, the deferred minors, the gate paintings' steps); `README.md`. Two owner files are never touched: `package-lock.json` and `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` must stay `dceedffdc12c32138e81bb63787cac7ae5d97fcd`; check it after every edit to `src/routes/index.tsx`). The working tree may show both as modified: leave them so.

## What you are doing

Phase 1 of the roadmap, in two shippable halves: **1a** (Tasks 1 to 10: the story spine, the save and the snapshot, the journey strip, Hammer live on the home screen, the email and the story cards, Act 1's ending, the floor band, the laptop look pass, the cheap minors) and **1b** (Tasks 11 to 19: SAT and the gate's paintings, music everywhere, Settings and the controller, the Service Record). Each half ends green on the spec's §19 checks with a report to the owner, look boards, a README update and the spec's "As built" notes; 1b ends with the handoff for Phase 2.

**The method:** `superpowers:executing-plans` inline, test-first, task by task in the plan's order, with the ledger `.superpowers/sdd/2026-11-02-story-phase-1/progress.md` (git-ignored; every ruling with its cost if wrong), and one fresh reviewer on the most capable model at the end of each half (Tasks 10 and 19). Commit and push after every task.

## Ask the owner at the start (then carry on; nothing waits)

1. The merge of `claude/hammer-pass` (R5 Fare Darts, the towel, the side quests' songs, the story design and these plans) into `main`. Never push `main` yourself; the owner says yes and you merge locally and push only then.
2. The two gate prompts in `art/outgoing/batch-r5-codex.txt` (the gate agent; the gate, the plane and the sheet) in Codex, work-on-this-laptop mode. Task 11 cuts them in when the four files exist; if they are not in by then, Task 11 is skipped and listed in the Phase 2 handoff.
3. At the start of 1b: the three SAT prompts in `art/outgoing/batch-story-phase1-codex.txt` (the brief is `art/outgoing/batch-10-story-phase1.txt`). Stand-ins draw until the paintings are cut in (the sync's rules: `art/cuts/wall-sat-far-1..3.json` with `seams` and `floor`; `sat-mid.png` and `sat-fore.png` cut by the green into `sat-mid-1..3` and `sat-fore-1`; `cast/skycap-1.png` and `cast/tsa-1.png` accepted with `art-pose.mjs` and cut by `art/cuts/cast-<person>.json`; `props/sat-sheet.png` into six pieces by Task 14's `nameSatPieces`).

## Standing rules

- The face rule, the Affliction shirt, the six recordings as the only spoken lines (spec §2); nothing under `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3` or `public/voice/*` is modified; the sync records owner files in `art/manifest.json` and a commit stages only the entries for the files it adds.
- The owner is not a developer: plain language, no emojis, decisive on technical matters, never ask them to run commands or check things for you, report in product terms with the images, and list every decision you made for them (the plan's sixteen are already theirs to hear in the 1a report).
- Build nothing the plan does not name; a question the plan does not answer is a ruling in the ledger, with its cost if wrong, and goes into the report.

## Environment (Windows 11, this laptop)

- Ports 8080 and 8081 belong to another tool. The dev server runs on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort` with `node_modules\.bin` on PATH; restart it if it is days old, and after the app is quit). The production preview on 8091 after `node scripts/with-app-env.mjs vite build` (`node scripts/with-app-env.mjs vite preview --host 127.0.0.1 --port 8091 --strictPort`); restart the preview after every rebuild.
- Browser checks need `BROWSER_SMOKE_CHANNEL=chrome`: `next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `hungry-browser`, `flop-browser`, `fares-browser`, and this phase's `journey-browser` and `sat-browser` (pass each `http://127.0.0.1:8090/`), `look-boards.mjs`, `start-art.mjs`, and `browser-smoke.mjs <url> artifacts/smoke-dev.png` then `--baseline artifacts/smoke-dev.json` against the preview. Do not edit files under `src/` while a browser check runs.
- Tests: `npm run test:next` (add the new check files to its list in `package.json`), `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`. Pixi objects cannot be constructed under `node:test`: node tests touch pure functions only; render changes are verified on boards and in the browser. One file runs with `node --loader ./scripts/game-test-loader.mjs --test scripts/<file>.check.mjs`.
- The laptop has an RTX 4070: the 1920 by 1080 checks at the ultra tier are run here (60 fps over 5 s). Blender 5.2 is at `%LOCALAPPDATA%\Programs\Blender Foundation\Blender 5.2`; Phase 1 does not use it.
- `npm run art:sync` re-cuts the art; run it after any change to `art/cuts/*` or `scripts/art-cut.mjs`, and after Task 9's scale change.
- Git has no identity. Write the message to `.git/CLAUDE_MSG` with the Write tool (never PowerShell, which adds a BOM) and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`. `git add` named paths only. End messages with the attribution line your session is given. Ignore CRLF warnings. Push `claude/hammer-pass` after each commit; never `main` without the owner's yes at the time.
- Many source files use CRLF line endings: an exact-string edit script must normalize them (`artifacts/edit.mjs` and `artifacts/append.mjs` are git-ignored scratch, imported by a `file:///` URL; recreate them if gone). In the Bash tool, heredocs that contain apostrophes break, a bare `cat >` waits on input forever, and the tool eats one level of backslashes: write code and scripts to files with the Write tool. Never run Prettier over a whole file.

## How to work

- The owner judges the work by zooming into board images and screenshots on a phone, and play-tests in the browser panel (open it for them at the end of each half). Render boards and screenshots and look at everything new at full size before showing it; step through animations frame by frame; nothing should jump. Check feet against floors, and his face against every bubble and card.
- Each task: the failing test first, run it, the smallest code that passes, the checks the task names, commit, push, the ledger line. A task that turns out wrong in the plan (a signature that cannot be, a spec value that contradicts the code) is a ruling: take the plan's intent, write the ruling down, and say so in the report.
- The deferred minors not taken by Task 1 or Task 9 stay listed (the R6 handoff's "Deferred minors"); carry the rest into the Phase 2 handoff with anything new.

## What ends this phase

Task 19's Step 4: every check green at the four screen sizes, the production build smoked, README and the "As built" notes committed, `docs/superpowers/handoff-<date>-phase-2.md` written (the Phase 2 asks: the three.js spike first with its verdict written for the Fable planning session; the Phase 2 paintings of spec §16; Blender for the hallway's set and the suite's render; what of Phase 1 is still unpainted), and the report to the owner with the boards.
