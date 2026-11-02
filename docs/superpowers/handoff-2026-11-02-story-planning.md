You are picking up Hammer Time in a fresh planning session on **Claude Fable 5.1**. The owner has decided the game grows from a set of venues into one story with a beginning, a middle and an end, in three acts with a boss at the end of each, and that it reaches a finished 1.0. Your job is to plan all of it: the story design, the roadmap of phases, the implementation plans, and the art briefs. **You write no product code.** The building is done afterwards in separate sessions on **Claude Opus 5.5 at extra-high effort (xhigh)**, from your plans. That split is the owner's game plan (2026-11-02): "Launch a separate planning session with this guidance for fable 5.1, Then we will execute all the work in opus 5.5 extra."

**Repo:** `C:\Users\jeste\Desktop\hammer-time`, branch `claude/hammer-pass` (at the commit that adds this file, on top of bd983bd). `main` is at c64ee20 (2026-10-18): R5 (Fare Darts, the towel at the gate, the side quests' songs) is on the branch only and its merge into `main` still waits for the owner's yes, asked for at the time. Two uncommitted files, `package-lock.json` and `src/routeTree.gen.ts`, belong to the owner: never stage, revert or touch them (`git hash-object src/routeTree.gen.ts` stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`).

## 1. What the owner said (their words, 2026-11-02)

1. "lets take a status check of hammer time and see where we stand. What can we do to make the game more polished and complete. Im open to anything that can make the game better and more like a professional release that doesnt change who hammer is"
2. (Choosing the 1.0 polish track.) "1.0 polish. I also want to add a level. "Hammer goes to Europe" The confluence of hammers personality with European culture and customs. Everyone has to cater to him and his schedule. Its hammers world and we are just living in it. Eventually I need the game to have a story arch, more bosses and make it start somewhere and finish somewhere. Right now its like we are just playing story vignettes. We have a bunch of good base material now it needs to organize and be a cohesive game"
3. "We can also change the format or use various 3d rendering, blender, unreal engine tools if needed. We dont have to have the left to right mario in every level. we can build other levels in different game formats"
4. (Offered three story backbones: one trip, a status crusade, a last training tour.) "i mean i love all of these. Can each one be a story that has to be accomplished. A series of levels for each story with a final boss? You can explore 3rd person for certain stories, left to right for others, and whatever else you think. I want him to look like him have the snot rockets, hammeres side quests etc. (hungry hungry hammer). Dont get rid of anything we have already done just add depth to the game"
5. (Asked: acts in a fixed order, or stories picked from a menu?) "no one complete arch. You have to finish a level to advance. The Swiss office is in Basel. you can use my laptop to render any 3d you may need"
6. (Shown the arc in §3 below.) "ok this looks right."

## 2. Decided (do not relitigate)

- **One story, start to finish, in three acts played in order.** Each act is a series of levels ending in a boss. **Finishing a level opens the next.** Anything finished can be replayed.
- **Nothing already built is removed.** The lobby, the restaurant, the campus, the gift shop and the pig, the start screen, Hungry Hungry Hammer and Fare Darts all stay and are organized into the story. The game gains depth, not replacements.
- **Every act keeps who he is and what he has:** his painted look (the three portraits in `art/reference/` and the painted body), the mallet in his fist, snot rockets, the lecture, the towel, Coke Zero, nuts, Buc-ee's, the pepper, the boxes of #15 blades, and side quests in the Hungry Hungry Hammer mold.
- **Formats can vary by level:** left to right in some, third person in others, and whatever else serves a level (top-down, a chase, a ride, an aiming or timing game). The banquet and the gate already prove the engine runs non-platformer formats.
- **The Swiss office is in Basel.** The story ends up there.
- **Tools (my recommendation, which the owner accepted):** stay in this browser game (PixiJS 8 over the fixed-step sim, one link that plays on a phone or a laptop, one menu, one save). Where a level needs 3D, run it with a browser 3D library (three.js) inside the same page. **Hammer stays his painted self in 3D**: a third-person camera sits behind him, so Codex paints his back and the Affliction shirt from behind, and his face only shows in profile, as painted. No 3D model of his head (the face rule: his face never changes). **Blender 5.2 is installed** (`%LOCALAPPDATA%\Programs\Blender Foundation\Blender 5.2`) and the laptop has an **RTX 4070**: use it to model and render sets (a train car, a canal, a cathedral) into backdrops, or to export scenes for a 3D level. **No Unreal**: it would mean a PC download instead of a link, a rebuild of everything, and a 3D remake of his face. Codex paintings stay the main look.

## 3. The arc the owner approved (a first draft: §4 lists what is still open)

**Prologue, San Antonio.** An email from the Basel office: training is moving to video; please come to Basel on the 14th "to discuss your transition." Hammer: "Transition." He has a US training trip on the books first, and nobody else can do it, obviously.

**Act 1: The Trip** (what is built today). The hotel lobby, the restaurant, the campus and the gift shop. **Boss: the Pink Menace.** The BUFFET and AIRPORT SHUTTLE doors stay as side quests. It ends with his phone buzzing: "Your Marriott status has been reviewed."

**Act 2: Status Crusade** (the same hotel, that night). He is "MEMBER. System error." Keycards; the M CLUB lounge, whose breakfast buffet is its own Hungry Hungry Hammer; the climb up the tower (a vertical climb); a third-person hallway where room 1417's mobile key keeps failing. **Boss: Lifetime Titanium guy,** in the suite that should have been his. (Expansion spec §7 and §6 hold the status tiers, perks, keycards, the room door and this rival's lines: start there.)

**Act 3: The Last Tour** (Europe). In every level the joke lands the same way: by the end, they are on his schedule.
- The flight over: no Southwest, no A-List, a middle seat in row 52. A third-person run down the aisle against the drinks cart.
- Paris: lunch takes three hours and he has a schedule; the waiters learn to cater to him. A French Hungry Hungry Hammer over the cheese course.
- The train to Basel leaves at 14:02, not when he is ready: a chase through the carriages.
- Basel: either Fasnacht (the carnival at four in the morning, lanterns, masks, piccolos, confetti) or floating down the Rhine with a fish-shaped dry bag like the locals. They are months apart: pick one with the owner.
- The Basel office: the skills lab training day in scrubs (the hospital venue of expansion spec §9, R7 in the rebuild spec), then the **final boss: his replacement**, the young trainer with the tablet and the ring light, and the training video he is selling.

**Epilogue.** Basel's airport sits on French soil with a Swiss side and a French side, and he complains on both. Home to San Antonio, the drive to Buc-ee's, the credits.

Each act ends with a boss; levels between can have a smaller boss (the Paris waiter, the train conductor).

## 4. Still open: settle these with the owner, one question at a time

Use `superpowers:brainstorming` (the architectural path) for the story design. Ask one question per message, multiple choice where possible, with your recommendation first. Candidates, roughly in the order they block other work:

1. **The ending:** what Hammer wins in Basel (keeps his job and the videos are scrapped; a title; Lifetime Ambassador; something else).
2. **Progression in practice:** how today's shift (three lives across four venues, a 420 s clock a venue, punch clocks, the score carried through, the start screen's four starts) maps onto "finish a level to advance": lives per level or per act, what carries between levels and acts, how progress is saved (this browser; no accounts unless the owner asks), and the start screen becoming a map of the journey with locked and finished levels.
3. **The prologue:** a short playable level at the San Antonio airport, a scene, or both; and where Fare Darts sits (a side quest door as now, or also part of the prologue's story).
4. **Act 3's stops:** Paris and Basel only, or more of Europe on the way (the brief is the confluence of his personality with European culture and customs).
5. **Basel:** Fasnacht or the Rhine.
6. **Each boss's fight** and the smaller bosses, in the formats chosen per level.
7. **The 1.0 polish scope** (§5): which items land in the first phase.
8. **The R5 merge into `main`** and the gate's paintings (below): ask when the roadmap reaches them.

## 5. Where the game stands (status check, 2026-11-02)

- Built and working on `claude/hammer-pass`: the shift (lobby 1-1, restaurant 1-2, campus 1-3, gift shop and the Pink Menace 1-4), the cinematic start screen, the stash, Hungry Hungry Hammer (BUFFET door, `/?quest=hungry`) and Fare Darts (AIRPORT SHUTTLE door, `/?quest=fares`). `npm run test:next`: 554 pass. The start screen renders with no console errors on desktop and phone (`scripts/browser-smoke.mjs`).
- The lobby's M CLUB door is a locked tease ("Platinum members only", `src/sim/levels/lobby.ts`): Act 2 gives it its purpose.
- **What still reads as a work in progress** (seen in a full play-through; screenshots in `artifacts/tour/`, git-ignored):
  1. No ending: beating the pig puts up a plain "Shift over" card with the score (`src/components/next-veil.tsx`). In the story this becomes Act 1's ending, and the real ending is the epilogue.
  2. One song for the whole shift: every venue's `music` is `"day"` (the stash `"cellar"`); the start screen, the cards, the tally and Hammer down are silent (`sound.music(...)` only in play and quests, `src/render/look.ts`). The side quests' own songs (`SONGS` in `src/game/audio.ts`) showed how much a theme helps: a theme a venue, a boss theme, a title tune.
  3. On a 16:9 screen the bottom quarter is a dark band under the floor (e.g. `artifacts/tour/restaurant-3.png`): paint each floor's front edge, or reframe the camera. The cards and the hint line sit in that band today (cards stay clear of his face: keep that rule).
  4. On a phone held sideways the stats panel covers a large share of a small view; a slimmer panel on short screens.
  5. Settings are thin: sound is on or off (no music and effects volume); no game controller support (no Gamepad API use in `src/`).
  6. Little to chase between runs: one best score a mode (`hammer-time-best-next`, `-banquet`, `-fares`). Ideas the owner was shown: a Service Record (best per level, lifetime staff bonked) and a few awards in his voice ("Titanium Elite": a full shift without losing a life; "Read the IFU": freeze 20 people with boxes).
  7. The gate is the only unpainted place: the room, the plane and the gate agent are code-drawn stand-ins. Codex prompts 1 and 2 in `art/outgoing/batch-r5-codex.txt` are written and not yet run; the R6 handoff lists the steps when they arrive.
  8. About thirty deferred minors, listed in `docs/superpowers/handoff-2026-10-25-r6.md` ("Deferred minors"); none breaks a round. Fold the cheap ones into the first phase.
- The roadmap before today (rebuild spec §16): R6 Marriott status and the lounge, R7 the Skills Lab, R8 flavor (venue music, staff tricks, food in the main run, the Buc-ee's rest stop, more tables, Lifetime Titanium guy). All of it now has a place in the arc: R6 grows into Act 2, R7 into the Basel office, R8's pieces into whichever level suits them.

## 6. What to produce

1. **The story design** (`docs/superpowers/specs/2026-11-0X-hammer-time-story-design.md`): the arc, the acts, every level with its format, its place, its cast, its boss or smaller boss, its side quest if any, and its lines (written, never spoken: §7); progression and saving; the journey screen; the prologue, act endings and epilogue as played or shown; how the existing venues, side quests and the R6/R7/R8 material fold in; the 3D approach for the levels that use it; the 1.0 polish items. The owner approves it section by section, then reads the written file.
2. **The roadmap:** phases in build order, each independently shippable, the game playable at every step, each ending green on the checks with a report and look boards (rebuild spec §15 and §16 show the pattern). A sensible start, yours to change: Phase 1 makes Act 1 a finished chapter (the progression and journey screen, the prologue and Act 1's ending, the 1.0 polish of what exists: music, settings and controller, the floor band, the phone panel, the cheap deferred minors); then Act 2; then a small throwaway spike of the third-person 3D approach before any Act 3 level depends on it; then Act 3's levels; then the epilogue and credits.
3. **Implementation plans** with `superpowers:writing-plans`, in the format of `docs/superpowers/plans/2026-10-19-r5-fare-darts.md` (tasks, TDD, a Review Focus, exact files and checks). Plan Phase 1 in full; plan further phases in full only where nothing still to be built changes them, and say which later phases get their detailed plan in a Fable session when their turn comes. The owner approves each plan. The plans are written for an executor on Opus 5.5 at xhigh effort: exact, self-contained, with every ruling written down.
4. **Art briefs** for each planned phase in `art/outgoing/`, with **exact paste-ready Codex prompts** (the owner makes the paintings with Codex in its work-on-this-laptop mode; follow `art/outgoing/batch-r5-codex.txt`: the files to read, the item, a pass/fail checklist, up to five retries, the exact file name, the prompt saved beside it, never run git or touch other files). Say where Blender renders replace or support paintings.
5. **A handoff for the first execution session**, `docs/superpowers/handoff-2026-11-0X-<phase>.md`, in the style of `docs/superpowers/handoff-2026-10-25-r6.md`, telling an Opus 5.5 xhigh session exactly what to read, the rules, the environment and how to work.

Commit each document on `claude/hammer-pass` as it is approved and push the branch (standing permission). Never push `main` without the owner's yes at the time.

## 7. Rules that bind every act (all still in force)

Read `docs/superpowers/handoff-2026-10-25-r6.md` in full: its "Owner decisions so far", "Environment (Windows 11)" and "How to work" sections apply unchanged. In short:

- **The face rule:** nothing is ever drawn over Hammer's face, except his left hand for the towel wipe and the snot rocket. His face is never edited, tinted or remade. Head scale 0.26 for him, 0.22 for every cast member; the mallet held in a fist out front.
- **The Affliction shirt is his outfit;** costumes only where a venue puts him in one (the banquet bib, the scrubs at the skills lab).
- **The six recordings in `public/voice/*` and `public/absolute-bullshit.mp3` are the only spoken lines.** Everything else is written: his thoughts, others' speech bubbles, cards and scenes.
- The products are the real pictures with their logos; each power-up keeps its one job.
- The cast is painted like Hammer, pose-locked to `art/incoming/hammer/body-affliction.png`; stand-ins are placeholders.
- Never modify `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3` or `public/voice/*`.
- Ports 8080 and 8081 belong to another tool: the dev server runs on 8090, the preview on 8091. Commit identity, the `.git/CLAUDE_MSG` rule and the files never to stage are in the R6 handoff.
- **Working with the owner:** they are not a developer. They judge by zooming into boards and screenshots on a phone and by play-testing in the browser panel. Plain language, no emojis, decisive on technical matters, never ask them to run commands. One question at a time when designing; list every decision you made for them.
