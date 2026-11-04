# Story Phase 2: Act 2, Status Crusade, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The handoff names the method for this phase: superpowers:executing-plans inline, test-first, with the ledger `.superpowers/sdd/2026-11-04-story-phase-2/progress.md` (git-ignored; every ruling with its cost if wrong, as Phase 1 kept it in `docs/superpowers/plans/2026-11-02-story-phase-1-ledger.md`), and one fresh reviewer on the most capable model at the end of each half (Tasks 10 and 17).

**Goal:** Act 2 plays as a finished chapter of the journey: the lobby at night with the keycards, the five tiers and the M CLUB lounge table; the tower climb with the housekeeping supervisor; the fourteenth-floor hallway behind him in three.js with the mobile key failing three times; the suite where Lifetime Titanium guy goes off the balcony after twelve hits; "Act 2 · Status Crusade · complete"; the home screen as the lobby at night; "Act 3 is coming" on the strip; a song for every new place. Everything Phase 1 built plays exactly as built.

**Architecture:** 2-1 is the lobby's level copied under a night ambient (`Level.ambient`), with keycards as a fixed pickup kind, status as a run value (`Run.keycards`, so the snapshot carries it), and the night crew as spawns with tricks. The lounge is the banquet's engine under a second menu (`FoodSpec.menu`, `createHungry(seed, { menu: "lounge" })`) with a fourth figure who walks behind the table. 2-2 is a tall level of sloped floor segments (stairs) and landings with movers (rolling carts), chutes and slips, its supervisor a small boss module beside the pig (`World.boss`). 2-3 is the ordinary fixed-step sim with a lateral axis (`lx` on him, the cast, the missiles and the pickups; `Level.hall`), so every move, hit, pickup, door, clock and HUD field works unchanged, drawn by `ThreeView` (`src/render/3d/`) on a second canvas in the inked look; without WebGL it draws flat on the Pixi canvas. 2-4 is the pig fight's format with a second boss module (`src/sim/titanium.ts`), three rooms as camera stops, and the act's cards from the story table. Music is five more `Song`s.

**Tech Stack:** TypeScript, React 19, TanStack Start, PixiJS 8, three.js (`three`, draco glTF), Blender 5.2 by script, Web Audio, sharp, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md` §8 with its "As planned (Phase 2)" note, §12 with its note, §13, §16, §19, §20 items 19 to 22; the verdict `docs/superpowers/notes/2026-11-04-3d-spike-verdict.md` (binding for `ThreeView`'s pitfalls). Roadmap: `docs/superpowers/plans/2026-11-02-story-roadmap.md`. Handoff: `docs/superpowers/handoff-2026-11-02-phase-2.md` (the environment, the deferred minors, the Phase 1 rulings). The last plan, for its format: `docs/superpowers/plans/2026-11-02-story-phase-1.md`. Art: `art/outgoing/batch-11-story-phase2.txt` (the brief), `art/outgoing/batch-story-phase2-codex.txt` (the owner's prompts).

## Global Constraints

- **2-1:** "The lobby level (`LOBBY`) relit and recast, not redrawn: the same walls, the same furniture and routes, a night lighting pass (lamps on at full, the windows black, a cool blue ambient in the shadows, the lights' radius down and intensity up), and the night crew in place of the day shift. The card: "2-1 · The lobby, 11:40 pm · Front desk has you as MEMBER. System error." His first thought: "TITANIUM. Look again."" Keycards: "Eight fixed spots (the desk's counter, both sofas, the landing, the mezzanine rail, the conference tables, the corridor, one in the stash on its shelf) and one dropped by each bonked bellhop (the three of the night crew). Tiers at 2, 4, 6, 8 and 10 cards, each 500 points, a comic word with the tier's name, and his thought": Silver nothing "Silver gets you nothing. Everyone knows that."; Gold +60 s "Late checkout. Obviously."; Platinum the M CLUB door "Lounge. Finally."; Titanium a life "Finally. A suite."; Ambassador the checkpoint where he stands and a Buc-ee's drops "Points. Not the water." "The HUD's venue line reads "2-1 · Lobby · SILVER" and so on; the status shows on every card of the act and resets with the act. Status is a run value, taken in the snapshot." The night crew, the tricks, the M CLUB door at 8,800, the lounge's rivals and sheet (16 tiles in order: cheese cubes 100, crudités 50, meatballs 200, sliders 300, the hot dish 250, hummus 100, crackers 50, cookies 150, brownies 200, fruit cup 100, yogurt parfait 150, cheesecake 300, pretzels 100, a tiny water bottle 0, the to-go box, a wine glass −100), `hammer-time-best-lounge`, "The M CLUB" card once 2-1 is finished, the exits ("Reserved for Titanium members. Thank you."; the stairwell door at 6,300 "STAIRS"; at Titanium the elevator too), word for word. (§8.1)
- **2-2:** "Fourteen floors of a hotel stairwell and its landings, 7,800 px high and 2,400 wide, the camera following him up ... the HUD's venue line reads the floor, "2-2 · Floor 6". Stair flights at 30 degrees zig-zag between landings". The carts (140 px/s, reversing at the walls; a push from the side is a hit; ride on top), the ice machines on 3, 7 and 11, the chute on 5, 9 and 13 ("drops him one floor down with no damage and 2 s lost"; "the drop below the lowest floor is the only pit"), the wet-floor signs (vx reversed, 0.5 s without control, no damage), the hose cabinets as ! crates, nuts in the vending nooks, the cast (housekeepers on 3, 6, 9 and 12, two hits; the maintenance man on 8; the drunk guest on 10), the supervisor on 12 (three waves, a cart each 4 s at 300 px/s down the slope; three hits; "Do not disturb THIS."; the cart his to ride up), punch clocks on 5 and 10, clock 420 s, the exit the fourteenth-floor door, the lines, word for word. (§8.2)
- **2-3:** "80 m of hotel corridor, **3 m wide** (the note), doors every 3 m, the carpet's pattern, the ice alcove at 30 m, the elevator lobby at 50 m (the doors open on bellhops), room 1417 at the end. The camera sits 3 m behind him and 1.6 m up ... W or ↑ forward, S or ↓ back, A and D step him left and right in the screen's terms ... A must turn him left under the chase camera, verified in the browser. Space jumps; the mallet swings at whatever is in front of him (a box 1.2 m deep); the snot rocket flies forward; the lecture freezes everyone in front of him; the towel, the smash and the box work as in 2D." The carts, the doors (0.5 s telegraph, a wall 1.5 s), the guests, the puddle, the bellhops two at a time, the pickups, clock 300 s, one punch clock at the elevator lobby, the key ("Mobile key failed." · "Mobile key failed AGAIN." · "Elite members don't wait."; "The suite. Someone is in it."). (§8.3)
- **2-4:** "Side view, the pig fight's format, the fight only (no punch clock) ... three rooms the camera pans between as the phases change ... Clock 300 s. The boss: twelve hits, and he flinches on each". Phase 1 (12 to 9) the briefcase (reach 1.3× the mallet's, telegraphed 0.4 s) and apples (3 at a time, every 3 s; batted back for 100); phase 2 (8 to 5) the bed bounce (1.3× his jump), two bellhops with carts every 10 s each dropping a keycard worth 200; phase 3 (4 to 0) bottles fast and low and the grab (telegraphed 0.6 s) taking ten cans, ten back a hit; the towel wipe between phases; the win into the pool ("...Ambassador."), the cards, the lines, word for word. (§8.4)
- **The 3D view:** the §12 note: three.js with the inked look; the back-view swing with his profile only when hit and for the smash; the cast in 3D face him from their existing paintings; the quality steps density, antialiasing, bloom, then ink; the verdict's pitfalls bind `ThreeView`. §12.3: a flat cut-out scaled to 1.9 m, an unlit material, a blob shadow; "his face appears only in profile, as painted, and the face check runs on those frames as it does in 2D". §12.2: `public/sets/hallway.glb` under 8 MB, draco-compressed, the Blender scene under `art/blender/`.
- **Music:** §13's rows for 2-1 ("a jazz trio: brushes, a walking bass"), the lounge ("quiet jazz, a piano"), 2-2 ("a climbing figure that rises a step a floor, the elevator chime"), 2-3 ("the hotel's hum, the ice machine, a muffled trio through the walls"), 2-4 ("the second boss theme"); the cues "the keycard's chime, the tier's fanfare, the chute's slide, the cart's rattle". As built: `musicFor(mode, level, quest)` decides what plays; every song within 6 dB of the banquet's loudness.
- **The journey, as built in Phase 1:** `Journey { v: 1; next; done; best; bonked; run; carry; credits }`; a level starts with three lives or more; Try again restores the snapshot exactly, the layout included; a replay carries nothing in; a new act starts him clean (2-1 is `firstOfAct`); the cards live in `STORY`; a stop is built when its id is in `STOP_LEVELS`; the home scene is the first built level with a `home`. (§4 and §5 "As built")
- **Done:** §19: `npm run test:next` with a pure-sim check file per new level, the supervisor and Titanium guy beaten by a scripted driver and lost by a masher, the journey's save and snapshot; the rig checks for every new clip (face clearance at 400 samples, head tilt under 8 degrees, feet within 2 px, the back view's face-free check); the browser checks at 1920 by 1080 first (60 fps over 5 s at ultra), then 1280 by 800, 390 by 844 and 844 by 390, "for a 3D level the chase camera with A stepping him left"; boards for every new level at three camera positions, every new cast member, every boss phase and the night home screen; the protected files' hashes; the production build smoked; README and the "As built" notes.
- **The rules of §2 and the owner rules** exactly as the Phase 1 plan's last two constraints state them (the face rule, the shirt, the six recordings, the products, the stand-ins, the protected files and folders, the commit identity and attribution, the ports 8090 and 8091, `BROWSER_SMOKE_CHANNEL=chrome`, pure-function node tests, CRLF, no edits under `src/` while a browser check runs). New this phase: `art/blender/` holds the owner's Blender files once they exist and a session only adds new ones; `public/sets/*.glb` and `public/draco/*` are committed build inputs; `three` is added to `package.json` with `npm install --no-package-lock three@0.172.0 @types/three@0.172.0`, so the owner's `package-lock.json` is never touched (Vercel's `npm install --omit=dev` resolves it).

## Review Focus

1. **Status across Try again, a lost life and the snapshot:** Hammer down at 2-1 after Gold, then Try again: the keycard count, the clock's +60 s and the spent M CLUB door come back exactly as they stood at the card, never granted twice; a keycard dropped by a bellhop in the failed attempt is gone; a replay of 2-1 starts at MEMBER; 2-2's card shows the status 2-1 ended with. Pinned in Task 3 (the sim: a tier's perk once per run, the snapshot's `keycards`) and Task 10 (the browser: Try again after Gold).
2. **The tower's traps against the lives rule:** a chute drop costs 2 s and no life, from any of the three chutes, mid-jump included; a fall off a balcony lands on the landing below, never in a pit; only the drop below floor 1 costs a life, and he comes back at the last punch clock; the vertical follow keeps his feet on the floor line on landings and never shows the dark ground band in landscape. Pinned in Task 6 (the sim) and Task 10 (the browser at four sizes).
3. **The hall without three.js:** no WebGL2 (a context that cannot be created, or lost mid-level), a phone that refuses the second canvas, or `&flat=1`: the hallway still plays start to finish on the Pixi canvas as a flat corridor, the save and the cards unchanged; a context lost mid-level restores the view or falls back without a frame of the HUD missing. Pinned in Task 11 (`ThreeView.load` rejects cleanly) and Task 14 (the browser: `&flat=1` to the suite's card; a forced context loss).
4. **The chase camera's keys:** A steps him to screen left and D to screen right at 1920 by 1080 and 390 by 844, W or ↑ held through 2-3's card does not walk him on the level's first step, S walks him back without turning him, the controller's left stick does the same, and no key of the 2D set (the slide) fires in the hall. Pinned in Task 12 (`hallInput` and the card's press edges) and Task 14 (the browser, `heroScreenX` with A and D, the pad).
5. **The suite's grab and his cans:** the grab never takes cans below zero and never more than ten; the hits give back exactly what was taken, never more; a life earned by cans during the fight counts; Hammer down in phase 3 then Try again restores twelve health, phase 1, the living room and his cans as at the card; the boss going into the pool in the same step Hammer dies ends on the win, not Hammer down. Pinned in Task 15.

## Decisions taken for the owner (report these)

The design's decisions were reported with it (spec §20, items 19 to 22). These are the plan's:

1. **The back view is animated by the game's rig from the one back painting**, cut into the same five layers as the front (`art/cuts/hammer-back.json`) with clips written for a back view (idle, walk, run, swing, jump, hurt). No frame paintings are asked of Codex: the painting you approved is enough, and a swing from behind (the arms rising, the mallet over the head) is a motion the rig can make. This replaces the "three more frames" the brainstorm mentioned.
2. **The hall is the 2D sim with a lateral axis.** Every level rule is reused; the 3D view only draws. Without WebGL2 (or with `&flat=1`) the hall plays flat on the Pixi canvas as a drawn corridor.
3. **2-1's exits need ↓** (the quest-door gesture), so walking past the stairwell door at 6,300 on the way to the keycards never ends the level; the elevator door opens the same way at Titanium.
4. **The lounge reuses the banquet's table painting**; only the room (`backdrops/lounge.png`) and the food sheet are new. The attendant wears server-1 as painted; the rivals fill the three rival slots as office-1 in a grey suit (the bellhop slot: his payback is a briefcase on the table), office-2 in a polo (the nurse slot: "I'm Platinum.") and student-2 as the intern (the student slot: the plane).
5. **The guard is a new role (`guard`)** whose flashlight is a telegraphed stun: one second without control, no pip lost. The stun is a hero field (`stunT`) used by nothing else yet.
6. **The night crew's tricks are flags on the night level's spawns** (`CastSpawn.trick`), so Act 1's staff are unchanged.
7. **The supervisor and Lifetime Titanium guy are their own boss modules** beside the pig (`src/sim/supervisor.ts`, `src/sim/titanium.ts`, `World.boss`), sharing one HUD bar; the pig is untouched.
8. **Keycards in 2-4 are 200 points and no status** (`Level.status` is 2-1's alone).
9. **The straight-through run of Act 2 is Phase 5** (spec §18), so Act 2's header never shows its button in this phase (`STRAIGHT_BUILT`).
10. **The tower's two walls stack upward**, alternating a floor each (`BackdropSpec.stack: "up"`).
11. **The suite's camera stops are the boss's room**: Hammer may walk between rooms; the camera pans to the room of the phase.
12. **No baked ambient occlusion**: the hall's set is boxes with toon materials under one key light, the ink pass and the bloom; AO stays out until a set needs it.
13. **The profile clips and the cast cut-outs are atlases rendered once at load** by Pixi (`extract.canvas`), never a readback per frame.
14. **Ultra's 3D density is 2 only on an NVIDIA card** (`/NVIDIA|GeForce|RTX/i`); every other desktop card starts at 1.5 (the spike's 780M fell to 21 fps at 2). The 3D view keeps its own governor and steps down density, then antialiasing, then bloom, then ink.
15. **W and ↑ become `up`**, a new action that jumps in every 2D level as today and walks forward in the hall; Space is `jump` as built.
16. **The night home screen** is chosen by the shell from the saved journey (`home: "lobby-night"` once `arena` is done), passed to `startLook`.

---

## File Structure

- `src/sim/level.ts` (modify): `LevelId` + `"lobby-night" | "tower" | "hallway" | "suite"`; `CastPerson` + `"guard-1" | "housekeeper-1" | "titanium"`; `CastSpawn.trick?: "water" | "replyAll" | "wander"`; `DoorSpec.tier?`, `DoorSpec.down?`; `CrateSpec.look?: "ice" | "cabinet"`; `PlatformKind` + `"bed" | "rail" | "minibar" | "vending"`; `LevelPlatform.bounce?`; `FloorKind` has `stairs`; `CameraZone.follow?: "up"`; `BossSpec = { kind: "pig" | "supervisor" | "titanium"; x; arena; room? }`; `BackdropSpec.stack?: "up"`; `Level.ambient?: "night"`, `Level.status?: boolean`, `Level.keycards?: Point[]`, `Level.card?: string`, `Level.floors?: { every: number }`, `Level.movers?`, `Level.chutes?`, `Level.slips?`, `Level.hall?`, `Level.rooms?`, `Level.keyDoor?`.
- `src/sim/levels/lobby-night.ts`, `tower.ts`, `hallway.ts`, `suite.ts` (create); `src/sim/levels/index.ts` (`STOP_LEVELS` gains the four).
- `src/sim/run.ts` (`Run.keycards`, `Run.perks: string[]`), `src/sim/status.ts` (create: `STATUS_TIERS`, `tierOf`, `tierWord`), `src/sim/rewards.ts` (`PickupKind "keycard"`, fixed pickups, `lx`), `src/sim/game.ts` (keycards and perks, `down` exits, `tier` doors, the hall's input, `World.boss` wiring, the rooms' camera, the key door, the boss-ended level, `home` option), `src/sim/input.ts` (`Action "up"`), `src/sim/damage.ts` (`stun`), `src/sim/types.ts` (`HeroState.stunT`, `lx`), `src/sim/physics.ts` (the stun, `up` as jump, the bounce), `src/sim/world.ts` (`boss`, movers, chutes, slips), `src/sim/movers.ts` (create), `src/sim/cast.ts` (`CastRole "guard"`, `ROLE_OF` housekeeper/guard, `CAST.guard`, `CAST_HITS`), `src/sim/cast-behavior.ts` (`stepGuard`, the tricks, `lx`), `src/sim/missiles.ts` (`"water" | "apple" | "bottle"`, `lx`), `src/sim/supervisor.ts`, `src/sim/titanium.ts` (create), `src/sim/drive.ts` (`"climb"`, the hall, the two bosses), `src/sim/hits.ts` (the lateral filter), `src/sim/story.ts` (the Act 2 cards, `STRAIGHT_BUILT`), `src/sim/quests/quest.ts` (`QuestId "lounge"`), `src/sim/quests/hungry/food.ts` (`FoodSpec.menu`, the lounge's sixteen), `hungry.ts` (`HungryOptions.menu`, `Hungry.menu`, `Hungry.walker`, the steal), `src/sim/rig/back-clips.ts` (create).
- `src/game/lines.ts` (the night crew's, the tower's, the suite's lines; `JOB_LINES.guard/housekeeper`; `STATUS_THOUGHTS`), `src/game/audio.ts` (`SongId` + five, `SONGS`, `rattle`).
- `src/render/look.ts` (`LEVELS`, `prepare` with the ambient, the home option, the status line, the boss bar, the hall's view switch, the rooms' camera, the lounge), `src/render/lighting.ts` (`setAmbient`, night lamps), `src/render/backdrop.ts` (night tints, `stack`), `src/render/venue.ts`, `src/render/venue-tower.ts`, `venue-suite.ts`, `venue-hall-flat.ts` (create), `src/render/cast.ts` (`LOOKS` + three, the duster, the flashlight, the briefcase), `src/render/props.ts` (keycard, water, apple, bottle), `src/render/hud.ts` (`HudPayload.status`, `boss.name`, the floor line), `src/render/boards.ts` (frames for the four, `cast` + three, `supervisor`, `titanium`, `lounge-thumb`, `home-night`), `src/render/quests/hungry-scene.ts` (the menu's room, persons and sheet; the walker), `src/render/quality.ts` (`TIERS3D`), `src/render/3d/three-view.ts`, `ink-pass.ts`, `cutout.ts`, `atlas.ts` (create), `src/render/sound.ts` (the cues).
- `src/components/next-game.tsx` (the home scene, `hammer-time-best-lounge`, the lounge card, the status on cards), `next-start.tsx` (the third Side quests card), `next-strip.tsx` (`STRAIGHT_BUILT`), `next-veil.tsx` (`Level.card`, the status, the lounge's card and tally), `next-hud.tsx` (the status, the boss bar's name), `next-record.tsx` (the lounge's best), `src/routes/index.tsx` (`LEVELS` + four, `QUESTS` + lounge, `flat`).
- `src/art/registry.ts` (`lounge`, `tower.pieces`, `hammer.bodies.back`, `TOWER_PIECES`), `scripts/art-sync.mjs` (`CAST_PERSONS` + three, `LOUNGE`, `TOWER_SHEET`, the back body), `scripts/art-cut.mjs` (`nameTowerPieces`, `BACK_COSTUME`), `art/cuts/hammer-back.json`, `art/cuts/cast-guard-1.json`, `cast-housekeeper-1.json`, `cast-titanium.json`, `wall-tower-far-1..2.json`, `lounge.json` (create when the paintings are in).
- `scripts/blender/hallway.py`, `scripts/blender/suite.py` (create), `public/sets/hallway.glb`, `public/draco/*` (create, committed), `art/outgoing/renders/suite-1..3.png` (create, committed), `art/outgoing/batch-11-story-phase2.txt`, `batch-story-phase2-codex.txt` (written with this plan).
- `scripts/start-art.mjs`, `scripts/look-boards.mjs` (the four levels, the new boards), `public/start/lobby-night.webp`, `tower.webp`, `hallway.webp`, `suite.webp`, `lounge.webp` (create, committed).
- Tests: `scripts/lobby-night.check.mjs`, `lounge.check.mjs`, `tower.check.mjs`, `hallway.check.mjs`, `suite.check.mjs` (create, in `test:next` after `scripts/sat.check.mjs` in that order), `scripts/night-browser.check.mjs`, `hallway-browser.check.mjs`, `suite-browser.check.mjs` (create); `scripts/journey.check.mjs`, `music.check.mjs`, `rig.check.mjs`, `art.check.mjs`, `render.check.mjs`, `cast.check.mjs`, `next-start.check.mjs`, `journey-browser.check.mjs` (modify).
- Docs: `README.md`, the spec's "As built (Phase 2a)" and "(Phase 2b)" notes, `docs/superpowers/handoff-<date>-phase-3.md`.

Every check file keeps the input boilerplate at its top (`NONE` with `up` and `box`, `input`, `of`, `until`, `play`, `knockOut` as `scripts/sat.check.mjs:15-21` has them); a journey game is `createGame({ lobby: LOBBY, stash: STASH }, seed, { cast: false, title: true })` then `g.newRun(seed, 0, { shift, journey: true })` as `satGame` does.

---

# Part A: the night, in side view (Phase 2a)

Before Task 1: ask the owner for the Codex prompts of `art/outgoing/batch-story-phase2-codex.txt` items 1 to 4 (the three people; the lounge room and food sheet; the tower's two walls and sheet), then carry on. The hallway's set (Task 11) and the suite's renders (Task 15) are the session's own Blender work. Nothing waits.

### Task 1: The lobby at night, as a level, and the cheap minors

**Files:**
- Create: `src/sim/levels/lobby-night.ts`
- Modify: `src/sim/level.ts` (`LevelId`, `Level.ambient`, `Level.card`), `src/sim/levels/index.ts`, `src/sim/game.ts` (`createGame` opts `home`), `src/render/look.ts` (`LEVELS`, the home option), `src/components/next-game.tsx` (the home scene from the save), `src/components/next-veil.tsx` (`Level.card`), `src/routes/index.tsx` (`LEVELS`), `src/sim/journey.ts` (`migrateJourney`), `src/render/quality.ts` (`isDesktopGpu`), `src/render/floor-face.ts` (`faceTop`), `src/components/next-settings.tsx` (open before ready), `src/render/sound.ts` (the fanfare's level)
- Test: `scripts/lobby-night.check.mjs` (create; add to `test:next` after `scripts/sat.check.mjs`), `scripts/journey.check.mjs`

**Interfaces:**
- Consumes: `LOBBY` (`src/sim/levels/lobby.ts`), `createGame(levels, seed, opts)` and `homeLevel()` (`game.ts:125, 298`), `STOP_LEVELS` (`levels/index.ts:9`), `builtStops` (`story.ts:84`).
- Produces: `LOBBY_NIGHT: Level` = `{ ...LOBBY, id: "lobby-night", name: "The lobby, 11:40 pm", world: "2-1", music: "lobby-night", ambient: "night", card: "Front desk has you as MEMBER. System error.", thoughts: [{ x: 1100, text: "TITANIUM. Look again." }], home: LOBBY.home, doors: [], cast: [] }` (the doors and cast come in Tasks 3 and 4; `music` is `"lobby"` until Task 9 adds the id). `Level.ambient?: "night"`; `Level.card?: string` (the venue card's line; SAT's "Boarding in 7:00" moves onto `SAT.card` and `next-veil.tsx` reads `info.card`). `createGame(levels, seed, { home?: LevelId })`: `homeLevel()` returns the level with that id when it is in `wholeShift ∪ venues`, else the first with a `home`. `startLook(render, { home?: LevelId })` passes it; `next-game.tsx` computes `home = journey.done.includes("arena") ? "lobby-night" : undefined` from the parsed save before booting the look. `STOP_LEVELS` lists `LOBBY_NIGHT` after `GIFTSHOP`, so `builtStops` has it and the Clock in button stops reading "Act 2 is coming". `src/routes/index.tsx` `LEVELS` gains `"lobby-night"`.
- The minors (the handoff's list; one line each): `migrateJourney` drops a `done` entry that is at or past `next` and moves `next` to the first stop not in `done` when they disagree; `isDesktopGpu` also matches WebGPU's `vendor === "intel" && /xe-hpg|xe2|arc/i.test(architecture)` through a new `gpuClassOf(info: { name?: string; vendor?: string; architecture?: string })`; `faceTop` is removed; `NextSettings` opened before the look is ready still sends `setMenu(true)` once it is; the fanfare plays at the music bus's level, not the card's quiet level (`Sound.fanfare` passes `quiet: false` to the bus for its 1.4 s).

- [ ] **Step 1: The failing tests**

In `scripts/lobby-night.check.mjs` (new; the boilerplate; import `LOBBY_NIGHT`, `LOBBY`, `STASH`, `createGame`, `STOP_LEVELS`, `builtStops`, `playableNext`, `newJourney`):

```js
test("2-1 is the lobby relit: the same walls, furniture and routes under a night ambient, its own name, code and card", () => {
  assert.deepEqual([LOBBY_NIGHT.id, LOBBY_NIGHT.world, LOBBY_NIGHT.ambient, LOBBY_NIGHT.card], ["lobby-night", "2-1", "night", "Front desk has you as MEMBER. System error."]);
  assert.deepEqual([LOBBY_NIGHT.backdrop, LOBBY_NIGHT.furniture, LOBBY_NIGHT.routes, LOBBY_NIGHT.floor, LOBBY_NIGHT.home], [LOBBY.backdrop, LOBBY.furniture, LOBBY.routes, LOBBY.floor, LOBBY.home]);
  assert.deepEqual(LOBBY_NIGHT.thoughts, [{ x: 1100, text: "TITANIUM. Look again." }]);
  assert.ok(builtStops(STOP_LEVELS).includes("lobby-night"));
});
test("2-1 is the next stop Clock in plays once Act 1 is done, and the home scene is the night lobby then", () => {
  const j = { ...newJourney(), next: "lobby-night", done: ["sat", "lobby", "restaurant", "campus", "arena"] };
  assert.equal(playableNext(j, builtStops(STOP_LEVELS)), "lobby-night");
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [LOBBY_NIGHT] }, 5, { cast: false, title: true, home: "lobby-night" });
  assert.equal(g.level.id, "lobby-night");
  const day = createGame({ lobby: LOBBY, stash: STASH, venues: [LOBBY_NIGHT] }, 5, { cast: false, title: true });
  assert.equal(day.level.id, "lobby");
});
```

In `scripts/journey.check.mjs`:

```js
test("a save whose done and next disagree is put right: next is the first stop not done", () => {
  const j = migrateJourney({ v: 1, next: "lobby", done: ["sat", "lobby", "restaurant"], best: {}, bonked: 0, run: null, carry: null, credits: false });
  assert.deepEqual([j.next, j.done], ["campus", ["sat", "lobby", "restaurant"]]);
});
```

- [ ] **Step 2: Run them** (`node --loader ./scripts/game-test-loader.mjs --test scripts/lobby-night.check.mjs scripts/journey.check.mjs`). Expected: FAIL (no `LOBBY_NIGHT`; `migrateJourney` keeps the pair).

- [ ] **Step 3: Write `lobby-night.ts`**, the type fields, the `home` option through `createGame`, `startLook` and the shell, `STOP_LEVELS`, the route, `Level.card` in the veil, and the five minors.

- [ ] **Step 4: Run it, then `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`.** Expected: PASS. `journey-browser.check.mjs`'s "Act 2 is coming" assertion now fails: change it to expect Clock in enabled with 2-1 next (its screenshots are redone in Task 10).

- [ ] **Step 5: Commit and push** (the files above, `scripts/lobby-night.check.mjs`, `package.json`): "The lobby at night as a stop: 2-1 built, its card and his first thought, the night home scene from the save, five cheap minors".

### Task 2: The night pass

**Files:**
- Modify: `src/render/lighting.ts` (`setAmbient`), `src/render/look.ts` (`prepare`, `showLevel`, `lightsOf`), `src/render/backdrop.ts` (night tints, the sky), `src/render/palette.ts` (`nightAmbient`, `nightWall`, `nightMid`, `nightFore`, `nightSky`), `src/render/character.ts` (ambient per apply, as built), `src/render/boards.ts` (`VENUE_FRAMES["lobby-night"]`, `START_FRAMES["lobby-night"]`, `home-night`), `scripts/look-boards.mjs`, `scripts/start-art.mjs`
- Test: `scripts/render.check.mjs`

**Interfaces:**
- Consumes: `createLighting(scene, quality, lights, ambient)` (`lighting.ts:38`), `multiplyTint`, `lightsOf(level)` (`look.ts:86`), `loadBackdrop` (`backdrop.ts:112`), `Backdrop.setVisible`.
- Produces: `PALETTE.nightAmbient = "#8f9ec4"`, `nightWall = "#6a7694"`, `nightMid = "#5d6880"`, `nightFore = 0x6f7a90`, `nightSky = ["#07090f", "#0d1220", "#141a2c"]`. `ambientOf(level): string` in `lighting.ts` = `level.ambient === "night" ? PALETTE.nightAmbient : PALETTE.lobbyAmbient`. `Lighting.setAmbient(hex)` retints the containers it tinted at creation (kept in a list) and `scene.ambient`; `prepare(level)` multiplies the venue root by `ambientOf(level)`, and `showLevel` calls `lighting.setAmbient(ambientOf(level))` then `cast.setAmbient`, `props.setAmbient`, `flyers.setAmbient` (new one-liners setting `container.tint`). `lightsOf(level)` for a night level: `radius * 0.7`, `intensity * 1.6`, color `PALETTE.lampGlow`, flicker 0.06. `Backdrop.setNight(on)`: the wall sprites' tint `nightWall` (day: `WALL_TINT`), mid `nightMid`, fore `nightFore`, the sky gradient `nightSky`; `showLevel` calls it with `level.ambient === "night"`. The character's `apply` already takes the ambient each frame: pass `scene.ambient`. Boards: `VENUE_FRAMES["lobby-night"]` = the lobby's three frames `[{ x: 1100, cx: 1600 }, { x: 8000, y: -520, cx: 8400, zoom: 0.88 }, { x: 13100, cx: 13500 }]`, `START_FRAMES["lobby-night"] = { x: 1100, cx: 1600 }`, board kind `"home-night"` (the home screen with `&home=night`: the route gains `home` for the boards only). `scripts/start-art.mjs starts` writes `public/start/lobby-night.webp`.

- [ ] **Step 1: The failing test** in `scripts/render.check.mjs` (pure: import `ambientOf`, `lightsOf` from their modules, `PALETTE`):

```js
test("a night level has the cool ambient and tighter, brighter lamps; a day level is unchanged", () => {
  assert.deepEqual([ambientOf(LOBBY), ambientOf(LOBBY_NIGHT)], [PALETTE.lobbyAmbient, PALETTE.nightAmbient]);
  const day = lightsOf(LOBBY)[0], night = lightsOf(LOBBY_NIGHT)[0];
  assert.deepEqual([night.radius, night.intensity, night.flicker], [day.radius * 0.7, day.intensity * 1.6, 0.06]);
});
```

(`lightsOf` moves from `look.ts` to `lighting.ts` so the test can import it without Pixi.)

- [ ] **Step 2: Run it** (FAIL). **Step 3: Write it.** **Step 4: Run it, `test:next`, `tsc`; then** (the dev server up) `$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/look-boards.mjs http://127.0.0.1:8090/ lobby-night,home-night` and look at `artifacts/lobby-night-look-1..3.png` and `home-night.png` at full size: the lamps' pools warm, the shadows blue, the walls dark, his face unchanged (the head plate is never tinted), no banding. Then `node scripts/start-art.mjs http://127.0.0.1:8090/ starts` and put back every unchanged `public/start/*.webp`.

- [ ] **Step 5: Commit and push**: "The night pass: a cool ambient, the lamps up and tighter, the walls and the sky dark, the night lobby's pictures".

### Task 3: Keycards, the tiers and the doors

**Files:**
- Create: `src/sim/status.ts`
- Modify: `src/sim/rewards.ts`, `src/sim/run.ts`, `src/sim/level.ts` (`Level.keycards`, `Level.status`, `DoorSpec.tier`, `DoorSpec.down`), `src/sim/game.ts`, `src/sim/levels/lobby-night.ts` (keycards, doors), `src/sim/journey.ts` (the run check), `src/render/hud.ts` (`HudPayload.status`), `src/render/props.ts` (the keycard), `src/components/next-hud.tsx`, `next-veil.tsx` (the status on the act's cards), `src/game/lines.ts` (`STATUS_THOUGHTS`), `src/sim/events.ts` (`tier`, `keycard`)
- Test: `scripts/lobby-night.check.mjs`, `scripts/journey.check.mjs`

**Interfaces:**
- Consumes: `PickupKind`, `seedRewards`, `collectPickups`, `dropPickup` (`rewards.ts`), `take(kind)` and `tryDoors` (`game.ts:455, 556`), `atCard` (253), `Snapshot`.
- Produces: `PickupKind` + `"keycard"`; `Level.keycards?: Point[]` placed as fixed pickups beside the seeded ones (`seedRewards` appends them, ids `keycard-N`); `Level.status?: boolean`. `Run.keycards: number` (0 in `createRun`), `Run.perks: string[]` (the tiers granted this run). `src/sim/status.ts`: `STATUS_TIERS = [{ at: 2, name: "SILVER", word: "SILVER!", thought: "Silver gets you nothing. Everyone knows that." }, { at: 4, name: "GOLD", word: "GOLD!", thought: "Late checkout. Obviously." }, { at: 6, name: "PLATINUM", word: "PLATINUM!", thought: "Lounge. Finally." }, { at: 8, name: "TITANIUM", word: "TITANIUM!", thought: "Finally. A suite." }, { at: 10, name: "AMBASSADOR", word: "AMBASSADOR!", thought: "Points. Not the water." }]`, `tierOf(n): StatusTier | null` (the highest with `at <= n`), `TIER_POINTS = 500`, `KEYCARD_POINTS = 200`. `take("keycard")`: with `level.status`, `run.keycards++`, a `keycard` event (the chime); when a tier is newly reached and not in `run.perks`: `+500`, `perks.push(name)`, event `tier { name, word }`, a `think` with the thought (3 s), and the perk: GOLD `run.time += 60`; PLATINUM nothing in the run (the door reads the count); TITANIUM `run.lives++` with `oneUp`; AMBASSADOR `run.checkpoint = "ambassador"` at his x (a dynamic checkpoint: `Run.checkpointAt?: Point`) and `dropPickup("bucees", x, y - 200)`. Without `level.status`, a keycard is `+200`. The lobby's three bellhops drop a keycard when knocked out (`castDrop` with kind `keycard`; the night level's spawns carry `drop: "keycard"` as a `CarriedKind` extension: `CarriedKind` + `"keycard"`). `DoorSpec.tier?: number`: a door that needs `run.keycards >= tier`, else it reads closed (`opens` text in the hint: "M CLUB · Platinum members only", "ELEVATORS · Reserved for Titanium members"); `DoorSpec.down?: boolean`: an `exit` that opens on ↓ like a quest door, never by walking in. `LOBBY_NIGHT.doors` = `[{ id: "buffet", kind: "closed", x: 4600, y: 0, label: "BUFFET", opens: "Closed for the night" }, { id: "elevator", kind: "exit", x: 5700, y: 0, label: "ELEVATORS", tier: 8, down: true, opens: "Reserved for Titanium members. Thank you." }, { id: "stairs", kind: "exit", x: 6300, y: 0, label: "STAIRS", down: true }, { id: "mclub", kind: "quest", quest: "lounge", x: 8800, y: -520, label: "M CLUB", tier: 6, opens: "Platinum members only" }, { id: "staff", kind: "stash", x: 9700, y: 0, label: "STAFF ONLY" }]` (the lounge quest arrives in Task 5; until then the door is `closed`). `LOBBY_NIGHT.keycards` = `[{ x: 1500, y: -180 }, { x: 2600, y: -120 }, { x: 5100, y: -120 }, { x: 7200, y: -520 }, { x: 8300, y: -520 }, { x: 13100, y: -160 }, { x: 14800, y: 0 }]` plus one in the stash (`STASH.keycards = [{ x: 1200, y: -200 }]`, counted when 2-1 is the level: `game.ts` counts a stash keycard into `run.keycards` while the venue has `status`). `HudPayload.status: string | null` = `level.status ? (tierOf(run.keycards)?.name ?? "MEMBER") : null`; `next-hud.tsx` shows `World 2-1 · SILVER`; the story and venue cards of Act 2 show the status line under the title (`VeilInfo.status`). The snapshot restores `keycards` and `perks` with the run (they are `Run` fields; `parseJourney`'s run check fills them fresh when missing).

- [ ] **Step 1: The failing tests**

```js
const night = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true }); g.newRun(21, 0, { shift: [LOBBY_NIGHT, STASH], journey: true, ...opts }); return g; };
const give = (g, n) => { for (let i = 0; i < n; i++) { const p = g.pickups.find((p) => p.kind === "keycard" && !p.taken); Object.assign(g.world.hero, { x: p.x, y: p.y, onGround: true }); g.step(input()); } };
test("eight keycards stand at the spec's spots and read as +1 keycard; the tiers come at 2, 4, 6, 8 and 10 with 500 points, a word and a thought", () => {
  const g = night(); play(g);
  assert.equal(g.pickups.filter((p) => p.kind === "keycard").length, 7);
  const before = g.run.score; give(g, 2);
  const tiers = of(g.events, "tier");
  assert.deepEqual([g.run.keycards, tiers.map((e) => e.name), g.run.score - before >= 500], [2, ["SILVER"], true]);
  assert.deepEqual(STATUS_TIERS.map((t) => t.at), [2, 4, 6, 8, 10]);
  assert.deepEqual([tierOf(1), tierOf(5)?.name, tierOf(10)?.name], [null, "GOLD", "AMBASSADOR"]);
});
test("Gold adds 60 s once; Titanium a life; Ambassador a checkpoint where he stands and a Buc-ee's; a tier is never granted twice in a run", () => {
  const g = night(); play(g); const t0 = g.run.time;
  g.run.keycards = 3; give(g, 1); assert.equal(Math.round(g.run.time - t0), 60);
  g.run.keycards = 7; const lives = g.run.lives; give(g, 1); assert.equal(g.run.lives, lives + 1);
  g.run.keycards = 9; give(g, 1); assert.deepEqual([g.run.checkpoint, g.pickups.some((p) => p.kind === "bucees" && !p.taken)], ["ambassador", true]);
  const perks = [...g.run.perks]; g.run.keycards = 3; g.pickups.push({ id: "k9", kind: "keycard", x: 300, y: 0, taken: false }); Object.assign(g.world.hero, { x: 300, y: 0, onGround: true }); g.step(input());
  assert.deepEqual(g.run.perks, perks);
});
test("the stairs are the exit on ↓, never by walking past; the elevator opens on ↓ at Titanium", () => {
  const g = night(); play(g);
  Object.assign(g.world.hero, { x: 6300, y: 0, onGround: true, vx: 0 }); until(g, (x) => x.mode !== "play", 1, { right: true });
  assert.equal(g.mode, "play");
  Object.assign(g.world.hero, { x: 6300, y: 0, onGround: true, vx: 0, move: null }); g.step(input({ down: true })); g.step(input({ down: true }));
  assert.equal(g.mode, "walkoff");
  const h = night(); play(h); Object.assign(h.world.hero, { x: 5700, y: 0, onGround: true, vx: 0, move: null });
  h.step(input({ down: true })); h.step(input({ down: true })); assert.equal(h.mode, "play");
  h.run.keycards = 8; h.step(input({ down: true })); h.step(input({ down: true })); assert.equal(h.mode, "walkoff");
});
test("Try again brings back the keycards, the perks and the clock as they stood at the card; a replay starts at MEMBER", () => {
  const g = night(); play(g); give(g, 4); assert.equal(g.run.keycards, 4);
  Object.assign(g.world.hero, { x: 6300, y: 0, onGround: true, vx: 0, move: null }); g.step(input({ down: true })); g.step(input({ down: true }));
  until(g, (x) => x.mode === "card", 12); // 2-1 done, the stash's card
  const snap = structuredClone(g.snapshot);
  play(g); knockOut(g); knockOut(g); knockOut(g); until(g, (x) => x.mode === "over", 6);
  g.newRun(21, g.venue, { snapshot: g.snapshot }); play(g);
  assert.deepEqual([g.run.keycards, g.run.perks, g.run.time], [snap.run.keycards, snap.run.perks, snap.run.time]);
  const r = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true }); r.newRun(21, 0, { shift: [LOBBY_NIGHT], journey: true }); play(r);
  assert.deepEqual([r.run.keycards, hudOf(r, null, false, null).status], [0, "MEMBER"]);
});
```

In `scripts/journey.check.mjs`: a snapshot saved without `keycards` and `perks` is kept with both fresh (`parseJourney` over a Phase 1 save with a run).

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write it.** (The stash keycard: the shift above is `[LOBBY_NIGHT, STASH]` only so the test sees seven; the stash's one is tested by `g.levels.stash.keycards.length === 1`.)

- [ ] **Step 4: Run it, `test:next`, `tsc`, eslint.** Expected: PASS.

- [ ] **Step 5: Commit and push**: "Keycards and status: eight spots, five tiers with their perks and his thoughts, the doors by tier, the exits on ↓, the status on the HUD and the cards".

### Task 4: The night crew

**Files:**
- Modify: `src/sim/level.ts` (`CastPerson "guard-1"`, `CastSpawn.trick`, `CarriedKind "keycard"`), `src/sim/cast.ts` (`CastRole "guard"`, `ROLE_OF.guard`, `CAST.guard`), `src/sim/cast-behavior.ts` (`stepGuard`, the water, the reply-all), `src/sim/missiles.ts` (`"water"`), `src/sim/types.ts` (`HeroState.stunT`), `src/sim/damage.ts` (`stun`), `src/sim/physics.ts` (no control while stunned), `src/sim/game.ts` (the water's hit, the keycard drop), `src/sim/levels/lobby-night.ts` (the cast), `src/game/lines.ts` (`JOB_LINES.guard`, the auditor's and the night servers' lines), `src/render/cast.ts` (`LOOKS["guard-1"]`, the flashlight beam), `src/render/props.ts` (the water), `src/render/boards.ts` (`PERSONS`), `scripts/art-sync.mjs` (`CAST_PERSONS`), `scripts/art.check.mjs` (`PERSONS`)
- Test: `scripts/lobby-night.check.mjs`, `scripts/cast.check.mjs`

**Interfaces:**
- Consumes: `Npc`, `createCast`, `strikeNpc` (`cast.ts`), `stepServer`, `stepOffice`, `stepBellhop`, `stepAct` (`cast-behavior.ts`), `launchCoffee`, `launchPlane`, `stepMissiles`, `damage(h, stage, fromX, events)`.
- Produces: `CastRole` + `"guard"`; `ROLE_OF.guard = "guard"`; `CAST.guard = { w: 100, h: 330, notice: 900, windup: 0.6, flash: 0.25, reach: 600, rest: 3, daze: 3, hits: 2 }`. `stepGuard(n, w, events)`: patrols `x0..x1`; within `notice` facing him it winds up `windup` (event `castWindup` as the others), then a `flash { x, facing }` event for `flash` seconds: if his body is within `reach` in front and `invuln === 0` and `star === 0`, `stun(h, 1)`; then `rest`. `stun(h, seconds)` in `damage.ts` sets `h.stunT = max(h.stunT, seconds)` and pushes `stunned`; while `stunT > 0` the hero's input reads as `NONE` (held and pressed) in `stepHero`, `vx` decays as when idle, the expression is `hurt`; no pip is lost. `CastSpawn.trick?: "water" | "replyAll" | "wander"`: a server with `water` tosses a `water` missile (`launchCoffee(id, from, target, "water")`: coffee's arc) at the wind-up's end half the time (`n.rng() < 0.5`, the level's seeded rng on the npc) instead of rushing; a `water` hit costs a pip through `damage` and sets `h.heat = 0` with the think "COLD. But fair." (`stepMissiles` reports the kind in the `hit` event: `hit { by: "water" }`). An office worker with `replyAll` answers the notice with three `launchPlane` 0.4 s apart after the wind-up (a `castSay` "Per my last email" on the first), then the march; the leap is skipped. `wander` is Task 7's. `CarriedKind` + `"keycard"`: a bellhop carrying one drops it on his knock-out (`castDrop` → `dropPickup("keycard", ...)`). `LOBBY_NIGHT.cast` = `[{ id: "auditor", person: "office-1", x: 1500, x0: 1200, x1: 2200, recolor: "#6b4f3a", trick: "replyAll" }, { id: "bellhop-night-1", person: "bellhop-1", x: 3300, cart: 3150, carry: "keycard" }, { id: "bellhop-night-2", person: "bellhop-2", x: 8050, cart: 7900, carry: "keycard" }, { id: "bellhop-night-3", person: "bellhop-1", x: 12200, cart: 12050, carry: "keycard", recolor: "#4a2f6b", size: 1.03 }, { id: "guard", person: "guard-1", x: 8600, y: -520, x0: 7000, x1: 9600 }, { id: "server-night-1", person: "server-1", x: 13100, x0: 12800, x1: 13400, trick: "water" }, { id: "server-night-2", person: "server-2", x: 14300, x0: 14000, x1: 14700, trick: "water", recolor: "#7a1f2b" }]`, `carts: [3150, 7900, 12050]`. `JOB_LINES.guard = { notice: ["Sir. Sir.", "Lobby's closed, sir."], ... }` (the ten slots filled in the night's register), the auditor's `notice` "Per my last email"; `LOOKS["guard-1"]`: navy top, black trousers, a cap, a torch in the near hand (stand-in); `PERSONS` and `CAST_PERSONS` gain `guard-1` (the cut `art/cuts/cast-guard-1.json` when the painting lands: until then the stand-in).

- [ ] **Step 1: The failing tests**

```js
test("the night crew: the auditor, three bellhops carrying keycards, the guard on the mezzanine, two servers with ice water, no students", () => {
  const g = night(); play(g);
  const people = LOBBY_NIGHT.cast.map((c) => c.person);
  assert.deepEqual([people.filter((p) => p.startsWith("bellhop")).length, people.includes("guard-1"), people.some((p) => p.startsWith("student"))], [3, true, false]);
  assert.deepEqual(LOBBY_NIGHT.cast.filter((c) => c.carry === "keycard").length, 3);
});
test("the guard's flashlight stuns him for a second within reach and costs no pip; the lecture freezes the guard", () => {
  const w = world({ x: 8600, y: -520 }, [{ id: "guard", person: "guard-1", x: 9000, y: -520 }]); // the cast.check helper
  const h = w.hero; h.x = 8700; h.y = -520;
  const evs = steps(w, 4);
  assert.ok(of(evs, "flash").length >= 1 && of(evs, "stunned").length >= 1);
  assert.deepEqual([h.patience, h.stunT > 0 && h.stunT <= 1], [2, true]);
  const x = h.x; steps(w, 0.5, { right: true }); assert.equal(h.x, x);
});
test("a water toss costs a pip and cools him to zero with the cold thought; the reply-all is three planes 0.4 s apart", () => {
  const g = night(); play(g); g.world.hero.heat = 60;
  const s = g.world.cast.find((n) => n.id === "server-night-1"); // force the toss: the npc's rng
  s.rng = () => 0.1; Object.assign(g.world.hero, { x: 12900, y: 0, onGround: true });
  const evs = until(g, (x) => x.world.hero.heat === 0 && x.world.hero.patience < 2, 8);
  assert.ok(evs.some((e) => e.type === "think" && e.text === "COLD. But fair."));
  const a = night(); play(a); Object.assign(a.world.hero, { x: 1700, y: 0, onGround: true });
  const planes = until(a, (x) => x.world.missiles.length >= 3, 6).filter((e) => e.type === "castThrow");
  assert.equal(planes.length, 3); assert.ok(Math.abs((planes[1].t - planes[0].t) - 0.4) < 0.02);
});
test("a bonked night bellhop drops a keycard", () => {
  const g = night({}); play(g); Object.assign(g.world.hero, { x: 3100, y: 0, onGround: true });
  const n = g.world.cast.find((c) => c.id === "bellhop-night-1"); for (let i = 0; i < 3; i++) strikeNpc(n, "bonk", 1, g.world, g.events);
  g.step(input()); assert.ok(g.pickups.some((p) => p.kind === "keycard" && Math.abs(p.x - n.x) < 200));
});
```

(`castThrow` carries the step's time `t` as the other cast events do; add `t` if it does not.)

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write it.** **Step 4: Run it, `test:next`, `tsc`, eslint; `look-boards.mjs ... cast,lobby-night`** and look at the guard's stand-in and the night crew in place.

- [ ] **Step 5: Commit and push**: "The night crew: the auditor's reply-all, three bellhops with keycards, the guard's flashlight stun, the servers' ice water".

### Task 5: The lounge table

**Files:**
- Modify: `src/sim/quests/quest.ts` (`QuestId "lounge"`, `QUEST_NAMES`), `src/sim/quests/hungry/food.ts` (`FoodSpec.menu`, sixteen lounge kinds, `coursesOf`), `hungry.ts` (`HungryOptions.menu`, `Hungry.menu`, `Hungry.walker`, `stepWalker`, the steal), `src/sim/game.ts` (the lounge door, `payHungry` unchanged), `src/game/lines.ts` (the walker's and the rivals' lines), `src/render/quests/hungry-scene.ts` (the room, persons and sheet by menu; the walker `Diner`), `src/render/hud.ts`, `src/render/look.ts` (`questMusic`, the lounge in every `QuestId` branch), `src/render/sound.ts`, `src/components/next-game.tsx` (`LOUNGE_BEST_KEY = "hammer-time-best-lounge"`), `next-start.tsx` (the third card), `next-veil.tsx` (the lounge's card and tally), `next-hud.tsx`, `next-record.tsx`, `src/routes/index.tsx` (`QUESTS`), `src/art/registry.ts` (`lounge`), `scripts/art-sync.mjs` (`LOUNGE`), `src/render/boards.ts` (`lounge-thumb`), `scripts/start-art.mjs`, `src/sim/levels/lobby-night.ts` (the M CLUB door as `quest: "lounge"`)
- Test: `scripts/lounge.check.mjs` (create; after `lobby-night.check.mjs`), `scripts/next-start.check.mjs`, `scripts/banquet.check.mjs`

**Interfaces:**
- Consumes: `FOODS`, `COURSES`, `SPECIALS` (`food.ts`), `createHungry(seed, opts)`, `stepHungry`, `finish`, `Server`, `stepServer`, `bonkOthers` (`hungry.ts`), `playRound`, `steadyPlayer`, `sharpPlayer` (`hungry/drive.ts`), `BanquetView` (`hungry-scene.ts`: `PERSON`, `loadRoom`, `loadFood`), `Diner`.
- Produces: `FoodKind` + `"cheese" | "crudites" | "meatballs" | "sliders" | "hotdish" | "hummus" | "crackers" | "cookies" | "brownies" | "fruitcup" | "parfait" | "nycheesecake" | "pretzels" | "water" | "wine"`; `FoodSpec.menu: "banquet" | "lounge" | "both"` (`togo`, `coke`, `nuts`, `bucees` are `both`; the thirteen banquet dishes, `hotsauce` and `check` are `banquet`); the lounge's values and sheet cells in the spec's order (cheese 100/0, crudites 50/1, meatballs 200/2, sliders 300/3, hotdish 250/4, hummus 100/5, crackers 50/6, cookies 150/7, brownies 200/8, fruitcup 100/9, parfait 150/10, nycheesecake 300/11, pretzels 100/12, water 0/13, togo 0/14 in the lounge sheet too, wine −100/15), courses: appetizer `cheese, crudites, hummus, crackers, pretzels, water`, entree `meatballs, sliders, hotdish`, dessert `cookies, brownies, fruitcup, parfait, nycheesecake`, special `wine`; `coursesOf(menu)` replaces `COURSES` in the schedule. `createHungry(seed, { menu?: "banquet" | "lounge" })` sets `q.menu` (default banquet) and, for the lounge, `q.walker = { s: 0, dir: 1, wait: 0, away: 0, took: 0 }`; `stepWalker(q, dt)`: the server's arc at half her speed (a trip of 36 s), lingering 2 s at each end; when he reaches `s >= 0.96` (Hammer's end) with `away === 0` and Hammer's plate has two or more, he takes two off `hammer.plate` (`score.plate -= their values`, `score.robbed += 2`, `hhThink` "Let's split it evenly.", then Hammer's "Ambassador of WHAT?" once a round) and turns back; his first arrival says "I was here first. Ambassador."; a bonk (`bonkOthers`' reach, as the server) sets `away = 8` and sends him to `s = 0` for it. `WALKER_ID = 1301` for the view. The rivals' persons by menu live in the view: `PERSON_OF: Record<Menu, Record<EaterId | "server", { person: CastPerson; recolor?: string }>>` with the lounge as decision 4 (`bellhop` slot office-1 `#5a5f6b`, `nurse` slot office-2 `#2d6a4f`, `student` slot student-2, `server` server-1), the walker `titanium` (the stand-in until the painting is cut); their paybacks keep the slot's mechanic (the suit guest's "suitcase" is drawn as a briefcase; the polo guest says "I'm Platinum."). The room: `registry.lounge = { room: { file, table, span }, food: Piece[16] }` from `LOUNGE = { room: "art/incoming/backdrops/lounge.png", food: "art/incoming/props/lounge-sheet.png" }` with `art/cuts/lounge.json` (`table`, `span`, as `ballroom.json`); the table painting is the banquet's; without the room, the banquet's room under the night ambient draws. `QUEST_NAMES.lounge = "The M CLUB"`; `?quest=lounge` practices it; the best under `hammer-time-best-lounge`; `NextStart` shows the third card ("The M CLUB", `/start/lounge.webp`, "Lounge table · best") only when `journey.done.includes("lobby-night")`; `next-record.tsx` lists it; `next-start.check.mjs:59` expects the two cards by default and three with 2-1 done. The lounge's songs come in Task 9 (`questMusic` returns `"lounge"` then; `"banquet"` until).

- [ ] **Step 1: The failing tests**

In `scripts/lounge.check.mjs` (new; the boilerplate; import `createHungry`, `stepHungry`, `FOODS`, `coursesOf`, `playRound`, `steadyPlayer`, `sharpPlayer`, `GRADES`, `LOBBY_NIGHT`, `STASH`, `LOBBY`, `createGame`, `RUN`):

```js
const LOUNGE_ORDER = ["cheese", "crudites", "meatballs", "sliders", "hotdish", "hummus", "crackers", "cookies", "brownies", "fruitcup", "parfait", "nycheesecake", "pretzels", "water", "togo", "wine"];
test("the lounge's sixteen tiles in the spec's order with its values; the banquet's menu is untouched", () => {
  assert.deepEqual(LOUNGE_ORDER.map((k) => FOODS[k].sheet), [...Array(16).keys()]);
  assert.deepEqual(LOUNGE_ORDER.map((k) => FOODS[k].value), [100, 50, 200, 300, 250, 100, 50, 150, 200, 100, 150, 300, 100, 0, 0, -100]);
  assert.deepEqual(coursesOf("banquet").appetizer, coursesOf("banquet").appetizer.filter((k) => FOODS[k].menu !== "lounge"));
  assert.ok(coursesOf("lounge").special.includes("wine") && !coursesOf("lounge").special.includes("check"));
});
test("a lounge round serves only the lounge's dishes and the products, and grades as the banquet", () => {
  const q = createHungry(3, { practice: true, menu: "lounge" });
  for (let i = 0; i < Math.round(60 / STEP); i++) stepHungry(q, input(), STEP);
  const kinds = new Set(q.dishes.map((d) => d.kind));
  for (const k of kinds) assert.ok(FOODS[k].menu !== "banquet", k);
  assert.ok(q.result && GRADES.some(([, g]) => g === q.result.grade));
});
test("Lifetime Titanium guy walks behind the table and splits the plate evenly at his end; a bonk sends him off for 8 s", () => {
  const q = createHungry(4, { practice: true, menu: "lounge", rivals: false, server: false });
  q.hammer.plate = ["sliders", "meatballs", "cheese"]; q.score.plate = 600;
  q.walker.s = 0.95; q.walker.dir = 1;
  for (let i = 0; i < 240; i++) stepHungry(q, input(), STEP);
  assert.deepEqual([q.hammer.plate.length, q.score.plate, q.score.robbed], [1, 100, 2]);
  assert.ok(q.events.some((e) => e.type === "hhThink" && e.text === "Let's split it evenly."));
  q.walker.s = 0.9; q.walker.away = 0; q.hammer.dive = null; // a bonk from his seat
  q.walker.bonked = true; stepHungry(q, input(), STEP); assert.ok(q.walker.away > 7.9);
});
test("the M CLUB door opens the lounge once a level at Platinum, and its tally pays into the run like the buffet's", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 21, { cast: false, title: true }); g.newRun(21, 0, { shift: [LOBBY_NIGHT, STASH], journey: true }); play(g);
  Object.assign(g.world.hero, { x: 8800, y: -520, onGround: true, vx: 0, move: null });
  g.step(input({ down: true })); g.step(input({ down: true })); assert.equal(g.mode, "play");
  g.run.keycards = 6; g.step(input({ down: true })); g.step(input({ down: true }));
  assert.deepEqual([g.mode, g.quest?.id, g.quest?.menu], ["questCard", "hungry", "lounge"]);
  until(g, (x) => x.mode === "quest", RUN.cardT + 0.2); const q = g.quest; q.time = 60 - STEP / 2; g.step(input());
  assert.equal(g.mode, "questTally"); const s = g.run.score; g.finishQuest(); assert.ok(g.run.score >= s + q.result.score);
  Object.assign(g.world.hero, { x: 8800, y: -520, onGround: true, vx: 0, move: null }); g.step(input({ down: true })); g.step(input({ down: true })); assert.equal(g.mode, "play");
});
test("the lounge's scripted players: steady under 20,000, sharp over 12,000 (the banquet's scale)", () => {
  const steady = playRound(7, steadyPlayer(), { menu: "lounge" }).score, sharp = playRound(7, sharpPlayer(), { menu: "lounge" }).score;
  assert.ok(sharp > steady && sharp > 12000, `${steady} ${sharp}`);
});
```

(`playRound(seed, player, opts)` gains the options argument; the quest's `id` stays `"hungry"` with `menu: "lounge"`, so every `q.id === "hungry"` branch keeps working: the `QuestId "lounge"` names the door, the best key, the card and the practice link, and `createHungry` is called with `menu: "lounge"` for it.)

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write it.** **Step 4: Run it, `test:next`, `tsc`, eslint;** `hungry-browser.check.mjs` with `?quest=lounge` added to it (the card reads "The M CLUB", a round plays to its tally, the best is written under `hammer-time-best-lounge`); `look-boards.mjs ... lounge` (a `lounge` board kind: the round's first frame) and look at it; `start-art.mjs ... lounge` writes `public/start/lounge.webp`.

- [ ] **Step 5: Commit and push**: "The M CLUB lounge table: sixteen tiles, the lounge guests and the intern, Lifetime Titanium guy splitting the plate, its best and its card".

### Task 6: The tower, a climb

**Files:**
- Create: `src/sim/levels/tower.ts`, `src/sim/movers.ts`
- Modify: `src/sim/level.ts` (`LevelId "tower"`, `CameraZone.follow`, `Level.floors`, `Level.movers`, `Level.chutes`, `Level.slips`, `CrateSpec.look`, `PlatformKind "vending"`), `src/sim/world.ts` (`movers`, the chute and the slip), `src/sim/physics.ts` (riding a mover; the slip), `src/sim/game.ts` (the chute's 2 s, the floor line, `follow`), `src/sim/drive.ts` (`"climb"`), `src/sim/levels/index.ts`, `src/render/hud.ts` (`venue` reads the floor), `src/render/look.ts` (`LEVELS`, the camera's `follow`), `src/render/scene.ts` (`follow: "up"`: look-ahead 0), `src/routes/index.tsx`, `src/sim/events.ts` (`chute`, `slip`)
- Test: `scripts/tower.check.mjs` (create; after `lounge.check.mjs`)

**Interfaces:**
- Consumes: `FloorSegment` (sloped when `y0 !== y1`), `heightOn`, `floorUnder` (`physics.ts`), `pitsOf` (`level.ts:211`), `Platform` (one-way), `puddles` (`world.ts:36`), `drive(level, h, route, world)`.
- Produces: `TOWER: Level`: `id "tower"`, `name "The tower"`, `world "2-2"`, `length 2400`, `spawn { x: 350, y: 0 }`, `time 420`, `music "tower"` (`"lobby"` until Task 9), `bounds { x: -400, y: -8200, w: 3200, h: 8800 }`, `floors { every: 540 }` (floor k's landing at `y = -540 * (k - 1)`, k 1..14), `hints { early: 900 }`, `camera { zones: [{ x0: -400, x1: 2800, zoom: 0.9, follow: "up" }] }`. Floors: for each k, a left landing `{ x0: -400, x1: 700, y: -540(k-1), kind: "carpet" }` when k is odd and a right landing `{ x0: 1700, x1: 2800 }` when k is even, and the flight between k and k+1 as `kind "stairs"`: odd k `{ x0: 700, x1: 1700, y0: -540(k-1), y1: -540k }`, even k `{ x0: 1700, x1: 700 }` written as `{ x0: 700, x1: 1700, y0: -540k, y1: -540(k-1) }` (the slope's sign from the ys; 28.4 degrees). The chute floors (5, 9, 13) have their landing split with a 220 px gap (`x 200..420` on the left, `1980..2200` on the right) and `Level.chutes = [{ x: 200, y: -2160, w: 220 }, { x: 1980, y: -4320, w: 220 }, { x: 200, y: -6480, w: 220 }]` (the gap's top-left and width; the floor below catches him). Balconies from floor 8: `platforms` `{ x0: 1000, x1: 1400, y: -540(k-1) - 60, kind: "balcony" }` for k 8..13 over the drop (the flight passes under them). Vending nooks: `platforms` kind `"vending"` on 2, 6, 11 (`x0 100..300`, `y` landing −160) with nuts above (`rewards { count: 14, bucees: 1, nuts: 3 }`, `routes [{ id: "landings", x0: -400, x1: 2800, y0: 0, y1: -7020 }]`: `rewardAnchors` treats a route's y range as every landing's y in it). Crates: ice machines `{ id: "ice-3", kind: "can", x: 2300, y: -1080 - 20, look: "ice" }` and the same on 7 (`x 2300`, y of floor 7) and 11 (`x 150`); hose cabinets `{ kind: "case", look: "cabinet" }` on 4 and 12. `Level.slips = [{ x: 500, y: -540 }, { x: 1900, y: -2700 }, { x: 400, y: -5400 }]`: permanent puddles laid at `begin()` (`world.puddles.push({ x, y, w: 140, life: Infinity })`), with the built slip (vx reversed, 0.5 s no control) and a `slip` event. `Level.movers = [{ id: "cart-2", x0: 1700, x1: 2800, y: -540, w: 180, h: 120, speed: 140 }, ... on 4, 7, 9 and 11]`: `src/sim/movers.ts` `Mover = { id, x, y, w, h, dir, speed, x0, x1 }`, `stepMovers(w, dt, events)`: `x += dir * speed * dt`, reversing at `x0`/`x1`; a hero standing on top (`onGround`, feet at `y - h` within the span) is carried `dir * speed * dt`; a side contact while closing (`sign(dir) === sign(hero.x - x)` is false) costs a pip through `damage` with `hit { by: "cart" }`, once per 1.2 s. Checkpoints `[{ id: "floor-5", x: 350, y: -2160 }, { id: "floor-10", x: 2100, y: -4860 }]`; `doors [{ id: "out", kind: "exit", x: 2500, y: -7020, label: "FLOOR 14" }]`; signs: `{ x: 300, y: -500, label: "SERVICE STAIR", note: "Guests use the elevator." }`, `{ x: 2000, y: -2700, label: "FLOOR 6" }`, `{ x: 300, y: -5900, label: "FLOOR 12", note: "Housekeeping" }`. `Level.thoughts`: 400 "Fourteen floors. I've done worse before breakfast.", 2000/-1620 "Reserved. For TITANIUM." (a thought mark gains `y?` and fires on the floor within 160 px), 300/-2700 "Housekeeping. HOUSEKEEPING.", 2100/-4860 "This is a fire code violation." The chute: in `game.ts` when his body crosses a chute's rect falling, `run.time -= 2`, event `chute`, `h.vx = 0`, and the fall continues to the landing below (no `fell`). `pitsOf` ignores gaps that a chute names, and the bounds' bottom is the only pit (`fell` → the last checkpoint as built). `CameraZone.follow?: "up"`: `scene.ts` sets `lookAhead` to 0 and keeps the floor line as built; the HUD's `venue` for a level with `floors` reads `"Floor N"` with `N = 1 + round(-feetY / every)` (`hudOf`; `world` stays "2-2"). `drive(level, h, "climb", world)`: walks toward the current flight's foot (the landing's end), up the flight, across the next landing, jumping a mover in the way and a chute's gap; stops at the exit.

- [ ] **Step 1: The failing tests**

```js
const tower = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 31, { cast: false, title: true }); g.newRun(31, 0, { shift: [TOWER], journey: true, ...opts }); return g; };
const floorY = (k) => -540 * (k - 1);
test("the tower is fourteen floors of landings and 28-degree flights, chutes on 5, 9 and 13, balconies from 8, two punch clocks and the door on 14", () => {
  assert.deepEqual([TOWER.id, TOWER.world, TOWER.time, TOWER.floors, TOWER.camera.zones[0].follow], ["tower", "2-2", 420, { every: 540 }, "up"]);
  const flights = TOWER.floor.filter((f) => f.kind === "stairs");
  assert.equal(flights.length, 13);
  for (const f of flights) assert.ok(Math.abs(Math.atan2(Math.abs(f.y1 - f.y0), f.x1 - f.x0) * 180 / Math.PI - 28.4) < 1);
  assert.deepEqual(TOWER.chutes.map((c) => c.y), [floorY(5), floorY(9), floorY(13)]);
  assert.deepEqual(TOWER.checkpoints.map((c) => c.id), ["floor-5", "floor-10"]);
  assert.deepEqual([TOWER.doors[0].y, pitsOf(TOWER).length], [floorY(14), 0]);
});
test("the scripted climber reaches the fourteenth floor along the flights, never stuck, never a life lost", () => {
  const g = tower(); play(g); let t = 0;
  while (g.mode === "play" && t < 300) { g.step(drive(g.level, g.world.hero, "climb", g.world)); t += STEP; }
  assert.deepEqual([g.mode, g.run.lives, g.run.punched], ["walkoff", 3, ["floor-5", "floor-10"]]);
});
test("a chute drops him a floor for 2 s and no life; the drop below floor 1 is the only pit and brings him back at the last clock", () => {
  const g = tower(); play(g); const t0 = g.run.time;
  Object.assign(g.world.hero, { x: 310, y: floorY(5) - 10, vy: 100, onGround: false });
  const evs = until(g, (x) => x.world.hero.onGround, 3);
  assert.deepEqual([of(evs, "chute").length, Math.round(t0 - g.run.time), Math.round(g.world.hero.y), g.run.lives], [1, 2, floorY(4), 3]);
  Object.assign(g.world.hero, { x: 2100, y: floorY(10), onGround: true }); g.step(input({ right: true }));
  Object.assign(g.world.hero, { x: 1200, y: 400, vy: 600, onGround: false });
  until(g, (x) => x.mode === "card", 4); until(g, (x) => x.mode === "play", 3);
  assert.deepEqual([g.run.lives, Math.round(g.world.hero.y)], [2, floorY(10)]);
});
test("a cart on a landing rolls, reverses at the walls, hurts from the side and carries him on top; a wet-floor sign slips him", () => {
  const g = tower(); play(g); const m = g.world.movers.find((m) => m.id === "cart-2");
  Object.assign(g.world.hero, { x: m.x - 300, y: m.y, onGround: true, patience: 2 });
  until(g, (x) => x.world.hero.patience < 2, 6, { right: true }); assert.equal(g.world.hero.patience, 1);
  Object.assign(g.world.hero, { x: m.x, y: m.y - m.h, vx: 0, onGround: true }); const x = g.world.hero.x; until(g, () => false, 1); assert.ok(Math.abs(g.world.hero.x - x) > 100);
  Object.assign(g.world.hero, { x: 380, y: floorY(2), onGround: true, vx: 300 }); const evs = until(g, (x) => x.world.hero.vx < 0, 1, { right: true });
  assert.ok(of(evs, "slip").length >= 1);
});
test("the HUD line reads the floor he stands on", () => {
  const g = tower(); play(g); assert.equal(hudOf(g, null, false, null).venue, "Floor 1");
  Object.assign(g.world.hero, { x: 2100, y: floorY(6), onGround: true }); g.step(input()); assert.equal(hudOf(g, null, false, null).venue, "Floor 6");
});
```

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write `tower.ts`, `movers.ts`, the fields, the chute, the slip, the climb driver, the floor line, the camera's `follow`.** If the climber stalls on a flight's foot, `drive` jumps a slope rising more than 100 px as it does a wall (the SAT ruling).

- [ ] **Step 4: Run it, `test:next`, `tsc`, eslint.** Expected: PASS.

- [ ] **Step 5: Commit and push**: "The tower: fourteen floors of landings and flights, the carts that roll, the chutes, the wet floors, the ice machines and the cabinets, the climb driver".

### Task 7: The tower's cast and the housekeeping supervisor

**Files:**
- Create: `src/sim/supervisor.ts`
- Modify: `src/sim/level.ts` (`CastPerson "housekeeper-1"`, `BossSpec`), `src/sim/cast.ts` (`ROLE_OF.housekeeper`, `CAST_HITS`), `src/sim/cast-behavior.ts` (`wander`, the duster swat as the handless shove), `src/sim/world.ts` (`World.boss`, `stepBoss`), `src/sim/game.ts` (`createBoss`, the boss's events, the win), `src/sim/hits.ts` (the mallet on `world.boss`), `src/sim/snot.ts`, `src/sim/levels/tower.ts` (the cast, the boss), `src/sim/drive.ts` (`fightSupervisor`), `src/sim/events.ts` (`bossWindup`, `bossWave`, `bossHit`, `bossDown`), `src/game/lines.ts` (`JOB_LINES.housekeeper`, the supervisor's), `src/render/hud.ts` (`boss.name`), `src/render/cast.ts` (`LOOKS["housekeeper-1"]`, the duster), `src/components/next-hud.tsx` (the bar's name), `src/render/boards.ts` (`PERSONS`, `supervisor`), `scripts/art-sync.mjs`, `scripts/art.check.mjs`
- Test: `scripts/tower.check.mjs`, `scripts/cast.check.mjs`

**Interfaces:**
- Consumes: `Pig`, `hitPig`, `stepPig`, `PIG_ID` (`pig.ts`: the shape to follow, not to change), `strikes()` and `swingContact` (`hits.ts`), `HudPayload.boss`, `Mover` (Task 6).
- Produces: `BossSpec = { kind: "pig" | "supervisor" | "titanium"; x: number; arena: [number, number]; y?: number }` (`GIFTSHOP.boss` gains `kind: "pig"`; `createPig` only for `kind === "pig"`). `World.boss: Supervisor | Titanium | null` beside `World.pig`; `stepBoss(w, dt, events)` dispatches by `kind`; `strikes` and the snot test `world.boss` as they test the pig (`BOSS_ID = 901`). `src/sim/supervisor.ts`: `Supervisor = { kind: "supervisor"; x; y; facing; state: "waiting" | "windup" | "wave" | "hurt" | "down"; hp; max: 3; hurtT; wave: number; carts: Mover[]; timer }`, `SUPERVISOR = { hp: 3, gap: 0.5, windup: 0.8, waves: 3, cartEvery: 4, cartSpeed: 300, cartW: 180, cartH: 120, rideSpeed: 140, points: 2500 }`, `createSupervisor(b: BossSpec)`, `stepSupervisor(s, w, dt, events)`: she stands at the top of floor 12's flight (`x 1700, y floorY(12)` facing the flight) and, once he is on floor 11's landing or the flight (`h.y <= floorY(11) + 10`), winds up (`bossWindup`) and sends a cart down the flight (`bossWave { n }`: a `Mover` on the slope, `speed 300` down toward the landing below, removed at the flight's foot after it rolls 400 px onto the landing); three carts a wave 4 s apart, then `waiting` 3 s during which `hitBoss(s, "bonk" | "snot", events)` counts (`hurtT` 0.5, `bossHit { hp }`); a hit during a wave is ignored (she is at the top, out of reach anyway); at 0 hp `state "down"`, `bossDown { points: 2500 }`, "Do not disturb THIS." as a `castSay`, and one cart left on the flight as a mover going up at 140 (`rideSpeed`) that he can stand on. A cart on the flight: jumped, or slid under the landing's rail (a `passes` entry `{ x: 1700, y: floorY(12) - 160, w: 200, h: 100, kind: "service" }` over the flight's top: a slide gets under while the cart passes over the rail's line: the cart's hit box skips a sliding hero). Her lines: "Guests use the elevator." on the first wave; his "Guests wait. I don't." as a think. `drive(..., "climb", world)` with a supervisor: waits at the flight's foot while a cart comes, jumps it, climbs between waves and bonks within 200 px. `TOWER.boss = { kind: "supervisor", x: 1700, y: floorY(12), arena: [700, 1700] }`. `ROLE_OF.housekeeper = "bellhop"` (handless: the duster swat is the hand shove within `reach 420`), `CAST_HITS: Partial<Record<CastJobName, number>> = { housekeeper: 2 }` read by `createCast`; `CastSpawn.trick "wander"`: an office worker who marches toward him always, never leaps or throws, and whose bump pushes him 200 px with no pip (`shove` without `damage`). `TOWER.cast` = housekeepers `housekeeper-1` on 3 (`x 300, x0 -300, x1 600`), 6 (`x 2100`), 9 (`x 300`), 12 (`x 2100`, the supervisor's floor: she stands aside), `maintenance` bellhop-2 on 8 (`x 2000, recolor "#4a5a3a"`, no cart), `drunk` office-2 on 10 (`x 2100, recolor "#d9c7b8", trick: "wander"`). `JOB_LINES.housekeeper`: notice "Housekeeping!", bump "Did you need towels?", warn "Sir, that's the service stair." `LOOKS["housekeeper-1"]`: a grey uniform, a feather duster in the near hand. `HudPayload.boss` gains `name: string` ("The Pink Menace", "Housekeeping", "Lifetime Titanium guy"); `next-hud.tsx` shows it.

- [ ] **Step 1: The failing tests**

```js
test("the housekeepers swat with the duster up close and take two hits; the drunk guest wanders into him without a pip", () => {
  const w = world({ x: 300, y: floorY(3) }, [{ id: "hk", person: "housekeeper-1", x: 500, y: floorY(3) }]);
  w.hero.x = 400; const evs = steps(w, 3); assert.ok(of(evs, "castShove").length >= 1 && w.hero.patience === 1);
  const n = w.cast[0]; strikeNpc(n, "bonk", 1, w, []); strikeNpc(n, "bonk", 1, w, []); assert.equal(n.act, "down");
  const d = world({ x: 2100, y: floorY(10) }, [{ id: "drunk", person: "office-2", x: 2300, y: floorY(10), trick: "wander" }]);
  d.hero.x = 2200; const x = d.hero.x; steps(d, 3); assert.deepEqual([d.hero.patience, Math.abs(d.hero.x - x) > 100, d.missiles.length], [2, true, 0]);
});
test("the supervisor sends three waves of carts down the flight and goes down in three hits between them; the scripted climber beats her", () => {
  const g = tower(); play(g); Object.assign(g.world.hero, { x: 350, y: floorY(11), onGround: true }); g.step(input());
  const evs = until(g, (x) => of(x.events, "bossWave").length > 0, 3);
  assert.ok(of(evs, "bossWindup").length >= 1 && g.world.movers.some((m) => m.speed === 300));
  let t = 0; while (g.mode === "play" && t < 200 && g.world.boss.state !== "down") { g.step(drive(g.level, g.world.hero, "climb", g.world)); t += STEP; }
  assert.deepEqual([g.world.boss.state, g.run.lives >= 1, g.world.movers.some((m) => m.speed === 140 && m.onSlope)], ["down", true, true]);
  assert.ok(g.events.concat(evs).some((e) => e.type === "bossDown") || g.world.boss.state === "down");
});
test("a masher who only swings at the top of the flight loses a life to the carts", () => {
  const g = tower(); play(g); Object.assign(g.world.hero, { x: 1500, y: floorY(11) - 400 * 0.54, onGround: true }); // on the flight
  until(g, (x) => x.run.lives < 3, 30, { hammer: true });
  assert.equal(g.run.lives, 2);
});
test("the boss bar names her, and the pig keeps its own", () => {
  const g = tower(); play(g); Object.assign(g.world.hero, { x: 350, y: floorY(11), onGround: true }); g.step(input()); g.step(input());
  assert.deepEqual([hudOf(g, null, false, null).boss?.name, hudOf(g, null, false, null).boss?.max], ["Housekeeping", 3]);
});
```

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write it.** **Step 4: Run it, `test:next`, `tsc`, eslint; `look-boards.mjs ... cast,tower,supervisor`** (a `supervisor` board: her three states and a cart on the flight).

- [ ] **Step 5: Commit and push**: "The tower's people: housekeepers with dusters, the maintenance man, the drunk guest, and the supervisor's three waves of carts".

### Task 8: The tower drawn, its walls stacked, its sheet and its pictures

**Files:**
- Create: `src/render/venue-tower.ts`, `art/cuts/wall-tower-far-1.json`, `wall-tower-far-2.json` (when the paintings are in)
- Modify: `src/render/venue.ts` (the tower's chain), `src/render/backdrop.ts` (`stack: "up"`), `src/sim/level.ts` (`BackdropSpec.stack`), `src/sim/levels/tower.ts` (`backdrop`), `src/art/registry.ts` (`tower.pieces`, `TOWER_PIECES`), `scripts/art-sync.mjs` (`TOWER_SHEET`), `scripts/art-cut.mjs` (`nameTowerPieces`), `scripts/art-grid.mjs` (`tower/sheet`), `src/render/boards.ts` (`VENUE_FRAMES.tower`, `START_FRAMES.tower`), `scripts/look-boards.mjs`, `scripts/start-art.mjs`, `scripts/art.check.mjs`
- Test: `scripts/art.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Consumes: `drawVenue`'s chain (`venue.ts:84-92`), `drawSatFurniture` as the pattern (`venue-sat.ts:109`), `layWalls` and `wallsFor` (`backdrop.ts:54, 86`), `sheetPieces`, `nameSatPieces` (`art-cut.mjs:1391, 1547`), `registry.sat.pieces`.
- Produces: `TOWER_PIECES = ["cart", "ice", "chute", "cabinet", "sign"]` in `registry.ts` and `art-cut.mjs` (`nameTowerPieces`), `TOWER_SHEET = "art/incoming/props/tower-sheet.png"` → `registry.tower.pieces`. `venue-tower.ts`: `towerFloor(g, f)` (a carpeted landing with a nosing; a flight of fourteen drawn steps under the slope with a rail), `towerPlatform(g, p)` (the balcony's slab and rail; the vending nook), `drawTowerFurniture(g, f, pieces)` (`door`, `railing`, `exitSign`, `hose`), the movers' carts drawn from the sheet's `cart` or a stand-in, the ice machine and the cabinet as the crate's `look`, the chute's door over its gap, the wet-floor sign at each slip. `BackdropSpec.stack?: "up"`: `layWalls` lays the named walls alternating upward from the level's floor 1 (`y` steps by the wall's height × its scale), repeated to the bounds' top; `TOWER.backdrop = { walls: ["tower-far-1", "tower-far-2"], mid: [], fore: [], stack: "up", far: { pan: 0.25, scale: 1 } }`; the far layer's vertical parallax stays 1 (built). `VENUE_FRAMES.tower = [{ x: 350, y: 0, cx: 1200 }, { x: 2100, y: floorY(6), cx: 1200, cy: floorY(6) - 300 }, { x: 1200, y: floorY(12) - 270, cx: 1200, cy: floorY(12) - 200 }]`, `START_FRAMES.tower = { x: 1200, y: floorY(8) - 270, cx: 1200, cy: floorY(8) - 240, zoom: 0.9 }`; `public/start/tower.webp`.

- [ ] **Step 1: The failing tests** in `art.check.mjs` ("the tower's sheet names five pieces in order, the lists agree": `TOWER_PIECES` in both files; when `props/tower-sheet.png` exists, five pieces) and `render.check.mjs` (`stackWalls(level, walls)` pure: for a level 8,800 tall with two 1,024-tall walls at scale 1 returns nine rows alternating `tower-far-1`, `tower-far-2` from the floor up; the lobby's `layWalls` unchanged).

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write it.** **Step 4: Run it, `test:next`, `npm run art:sync`, `tsc`, eslint; `look-boards.mjs ... tower`** and look at the three frames at full size: the steps' nosings under his soles on every flight (feet within 2 px: the rig's `plantFeet` on a 28-degree slope), the rails, the walls' seams on the floor lines, no gap at the stack's joins; `start-art.mjs ... starts` for `tower.webp` (put back the others).

- [ ] **Step 5: Commit and push**: "The tower drawn: landings, flights and rails, the balconies, the chute doors, the carts, the walls stacked a floor at a time, its sheet and its pictures".

### Task 9: Music for the night, and its cues

**Files:**
- Modify: `src/game/audio.ts` (`SongId`, five `SONGS`, `rattle`), `src/render/sound.ts` (`CUES`: `keycard` → `chime`, `tier` → `fanfare`, `chute` → `slide`, `bossWave` and the movers' contact → `rattle`, `flash` → `glint`, `stunned` → `bump`; `questMusic` for the lounge), `src/sim/levels/lobby-night.ts`, `tower.ts`, `hallway.ts`, `suite.ts` (`music`; the last two when they exist), `src/sim/quests/hungry/hungry.ts` (`q.menu` → `questMusic` returns `"lounge"`)
- Test: `scripts/music.check.mjs`

**Interfaces:**
- Consumes: `Song`, `SONGS`, `bars`, `jingle` (`audio.ts`), `musicFor` (`sound.ts:225`), `artifacts/music-render.tmp.mjs` (the loudness print).
- Produces: `SongId` + `"lobby-night" | "lounge" | "tower" | "hallway" | "suite"`; `SONGS["lobby-night"]` a jazz trio (step 0.19, a walking bass every step on a triangle, a sparse lead on a sine, brushes as the hat pattern `x.x.x.x.` with the snare soft), `lounge` (step 0.22, a piano-like lead on a triangle with `double`, no drums), `tower` (step 0.16, a lead that climbs a step a bar over 14 bars and resets, a square bass, the `chime` gag every 16 steps as the elevator), `hallway` (step 0.24, a hum: a low sine bass only, a muffled lead with `leadLen 0.3` every fourth bar, the `jet` gag replaced by an ice-machine `honk` every 64), `suite` (step 0.14, the second boss theme: a driving sawtooth bass, two leads alternating by `double`, a four-on-the-floor kick); each within 6 dB of the banquet's loudness by the render script. `AudioBus.rattle()`: a 0.25 s noise burst band-passed at 900 Hz with three `blip`s at 60 ms steps. `Cue` names as above.

- [ ] **Step 1: The failing tests** in `music.check.mjs`: `IDS` gains the five; `[LOBBY_NIGHT, TOWER].map((l) => l.music)` deepEquals `["lobby-night", "tower"]`; the tower's chime gags at multiples of 16; `questMusic({ id: "hungry", menu: "lounge" })` returns `"lounge"`; `CUES.keycard` includes `chime`, `CUES.tier` includes `fanfare`, `CUES.chute` includes `slide`, `CUES.bossWave` includes `rattle`.

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write the five songs and the cues.** **Step 4: Run it, `test:next`, `tsc`;** `node artifacts/music-render.tmp.mjs lobby-night,lounge,tower,hallway,suite` (the dev server up) and bring any song more than 6 dB from the banquet's rms into range by its gains. Listen in the browser once each (`?next=1&level=lobby-night`, `?quest=lounge`, `?next=1&level=tower`).

- [ ] **Step 5: Commit and push**: "Music for the night: the lobby's trio, the lounge's piano, the tower's climb with the elevator chime, the hall's hum, the suite's drive; the keycard's chime, the tier's fanfare, the chute and the carts".

### Task 10: Part A's verification, the report and the half (Phase 2a ships)

**Files:**
- Create: `scripts/night-browser.check.mjs`
- Modify: `scripts/journey-browser.check.mjs` (2-1 next and playable; the night home scene after Act 1), `README.md` ("The lobby at night (2-1)", "The M CLUB (the lounge table)", "The tower (2-2)" after "The gift shop (1-4)"; "The start screen" for the night scene; "Music"; the validation list), the spec ("As built (Phase 2a)" under §5, §8, §13), `.superpowers/sdd/2026-11-04-story-phase-2/progress.md`

**Interfaces:**
- `scripts/night-browser.check.mjs <url>` (the pattern of `sat-browser.check.mjs`): `?next=1&dev=1&level=lobby-night`: the card reads "2-1", "The lobby, 11:40 pm", "Front desk has you as MEMBER. System error." and fits phones; the HUD's venue line ends "· MEMBER", then "· SILVER" after two keycards (`dev.give("keycard")` twice: `give` gains the kind), "Late checkout" as a think at four; the guard's flash within 8 s standing under him (`dev.teleport(8700, -520)`), `__next.hero.stunT > 0` once; a water toss (`dev.teleport(12900, 0)`, `__next.run.events.hit`); the M CLUB at six (`dev.give` to six, ↓ at 8,800 → `questCard` "The M CLUB"; `questSkip`; the tally; the best under `hammer-time-best-lounge`); ↓ at the stairs ends the level on 2-2's card with "· PLATINUM" on it; Try again after Gold (`patience(1)` + `hit` ×3 at 2-1 after four keycards: "Hammer down", Try again, `__next.run` shows the time and the keycards as at the card); the night pixels (`__next.pixel` at a wall point darker than the day's by 30 percent: the same point on `?level=lobby`); `?level=tower`: the card "2-2", the HUD "Floor 1", a chute drop (`teleport(310, -2170)`: the time −2, lives 3), the supervisor's bar "Housekeeping" at floor 11, the exit after `dev.boss({ state: "down" })` (`dev.boss` added beside `dev.pig`) and `teleport(2500, -7020)` → 2-3's card ("Act 2 is coming" is not shown anywhere: 2-3 is unbuilt in 2a, so the next card is the strip's "Coming" and Clock in reads "Act 2 is coming" for 2-3: assert that text, to be flipped in Task 16); fps ≥ 55 over 5 s at 1920 by 1080 in 2-1 and in the tower; the four sizes' screenshots (`night-card-*.png`, `night-lobby-*.png`, `tower-*.png`); no console errors.

- [ ] **Step 1: Every check:** `npm run test:next`, `npx tsc --noEmit`, eslint; the browser checks (`next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `hungry-browser`, `flop-browser`, `fares-browser`, `journey-browser`, `voice-browser`, `sat-browser`, `night-browser`); `look-boards.mjs` for `lobby-night`, `home-night`, `tower`, `supervisor`, `lounge`, `cast`; `start-art.mjs starts,lounge`; the production build (`vite build`, the preview on 8091, `browser-smoke.mjs` with the dev baseline, then `night-browser` and `journey-browser` against 8091); 60 fps over 5 s at ultra at 1920 by 1080; `git hash-object src/routeTree.gen.ts`.
- [ ] **Step 2: README, the "As built (Phase 2a)" notes, the ledger** (every ruling with its cost).
- [ ] **Step 3: The fresh reviewer** (a subagent on the most capable model) over Part A's diff against the spec's §8.1, §8.2 and the Review Focus items 1 and 2; fix; rerun Step 1.
- [ ] **Step 4: Commit and push**: "Phase 2a ships: the lobby at night with its keycards and the M CLUB, the tower and its supervisor, the night's music (README, as built)". Report to the owner in product terms with the boards, the sixteen decisions above, and the asks for 2b: nothing new from Codex yet (the suite's prompt comes with Task 15's renders). Open the browser panel on `?next=1` for the owner to play.

**What the owner sees after Part A:** the home screen is the lobby at night (Act 1 is done in their save); Clock in plays 2-1 then 2-2; 2-3 shows "Coming" on the strip and Clock in reads "Act 2 is coming" there until Part B; the Side quests row has "The M CLUB" once 2-1 is finished; the guard, the housekeepers and Lifetime Titanium guy draw as stand-ins until their paintings are cut in (Task 10's report says which are in).

---

# Part B: the hall in 3D, the suite, the act's end (Phase 2b)

Before Task 11: no new ask. The suite's three renders and their Codex prompt are Task 15's first step, handed to the owner then.

### Task 11: three.js in, the hallway's set from Blender, and `ThreeView`'s frame

**Files:**
- Create: `src/render/3d/three-view.ts`, `src/render/3d/ink-pass.ts`, `scripts/blender/hallway.py`, `public/sets/hallway.glb`, `public/draco/` (the decoder files copied from `node_modules/three/examples/jsm/libs/draco/gltf/`), `scripts/hallway-browser.check.mjs`
- Modify: `package.json` (`three`, `@types/three` in `dependencies`), `src/render/quality.ts` (`TIERS3D`, `density3dFor`), `src/render/look.ts` (`showHall(on)`, the hall's tick), `src/render/app.ts` (`NextProbe.three`), `src/components/next-game.tsx` (nothing: the host is the same `div`), `src/styles.css` (`.next-stage canvas + canvas`), `src/routes/index.tsx` (`flat`)
- Test: `scripts/render.check.mjs`, `scripts/hallway-browser.check.mjs`

**Interfaces:**
- Consumes: the verdict's pitfalls; `RenderApp` (`app.ts:10`), `TIERS`, `shouldStepDown`, `isDesktopGpu` (`quality.ts`), the view-switch pattern (`showQuestView`, `look.ts:968`), `.next-stage` (`next-game.tsx:493`), the z-order (`styles.css`: HUD 2, touch 3, veil 4, start 5).
- Produces: `npm install --no-package-lock three@0.172.0 @types/three@0.172.0` and the two in `package.json` `dependencies` (the lockfile untouched: Vercel's `npm install --omit=dev` resolves them; a ruling in the ledger). `scripts/blender/hallway.py` (run as `& "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/hallway.py`): builds the corridor from boxes in meters (80 long along +Z, 3 wide, 2.7 high; the floor; the walls; the ceiling; door frames every 3 m on both sides from z 3, each a recessed box with a knob; the ice alcove at z 30 on the left (a 2 m niche with a machine box); the elevator lobby at z 50 (the right wall opens 4 m into a lobby with two door boxes); the end wall at z 80 with 1417's door; a lamp box every 6 m on the ceiling marked emissive; the carpet as a second material) and exports `public/sets/hallway.glb` draco-compressed (`export_draco_mesh_compression_enable=True`), under 8 MB; the scene saved as `art/blender/hallway.blend`. `TIERS3D: Record<Quality, { density: number; aa: number; bloom: boolean; ink: boolean }> = { ultra: { density: 1.5, aa: 4, bloom: true, ink: true }, high: { density: 1.25, aa: 4, bloom: true, ink: true }, medium: { density: 1, aa: 2, bloom: false, ink: true }, low: { density: 0.75, aa: 0, bloom: false, ink: false } }`, `density3dFor(q, gpu: string)`: ultra on `/NVIDIA|GeForce|RTX/i` is 2, else the tier's. `ThreeView` (`three-view.ts`): `constructor(host: HTMLElement, registry: Registry)` makes a `WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" })` whose canvas is appended after Pixi's with `position: absolute; inset: 0; pointer-events: none; display: none`, `NoToneMapping`, a half-float `EffectComposer` (RenderPass, the normal pass to a target, `InkPass` from `ink-pass.ts` with `tNormal`, `tDepth`, `tMask` set on the pass's material after construction, `UnrealBloomPass(strength 0.22, radius 0.35, threshold 1.05)` when the tier says so, `SMAAPass` or the renderer's MSAA by `aa`); `load(): Promise<void>` loads `/sets/hallway.glb` through `GLTFLoader` + `DRACOLoader` (`setDecoderPath("/draco/")`), gives every mesh a `MeshToonMaterial` (a 3-step gradient map) with the glb's colors, caps each lamp's `emissiveIntensity` at 1.6, one `DirectionalLight` (key, shadows on at ultra and high) and a dim `HemisphereLight`; it rejects when `WebGL2RenderingContext` is missing or the context cannot be made, and never throws past its promise; `setVisible(on)`, `setQuality(q)` (density × `devicePixelRatio` capped at 2, `aa`, `bloom`, `ink`), `resize(w, h)`, `sync(state: HallState, alpha)` (the camera at `(hero.lx, 1.6, hero.z - 3)` looking at `(hero.lx, 1.0, hero.z + 6)`, the chase lerp 8/s; Task 13 fills the cut-outs), `frameMs` of its own, `onContextLost` (the look falls back to flat), `destroy()`. `HallState` (`three-view.ts`, pure): `{ hero: { lx, z, y, facing, clip, u, hurt }, cast: { id, person, lx, z, y, clip, u }[], missiles: { kind, lx, z, y }[], pickups: { kind, lx, z, y, taken }[], carts: { lx, z, dir }[], doors: { z, side, open }[], puddle: { z0, z1 } | null }` built by Task 12's level from the world (meters: `z = x / 100`, `y = -hero.y / 100`). `look.ts`: `showHall(on)` hides the shift's views and the character as `showQuestView` does, shows the three canvas, and sets `app.stage.visible = false` while the hall is up (the probe's `drawing` reads `three.drawing`); the hall's tick runs the sim as the shift's, builds `HallState`, calls `three.sync`, and runs the 3D governor (`three.frameMs` over 1 s windows: `shouldStepDown` steps `three.setQuality` down one tier; it never steps up; the Pixi tier is untouched). With `opts.flat` (`&flat=1`) or a rejected `load`, `showHall` is never called and the level draws flat (Task 12's `venue-hall-flat.ts`). `NextProbe.three?: { canvas: boolean; quality: Quality; density: number; fps: number; drawing: boolean }`. `scripts/hallway-browser.check.mjs <url>`: this task's part: `?next=1&dev=1&level=hallway` shows two canvases in `.next-stage` within 15 s, `__next.three.canvas === true`, `__next.three.fps >= 58` over 5 s at 1920 by 1080 (the dev box counts as desktop: density 1.5), the HUD over it (the clock and the hint visible in a screenshot `hallway-first.png`), no console errors; with `&flat=1` one canvas and `__next.three` undefined.

- [ ] **Step 1: The failing tests** in `render.check.mjs` (`TIERS3D` ordered: density, aa, bloom, ink each non-increasing down the tiers; `density3dFor("ultra", "NVIDIA GeForce RTX 4070")` is 2 and `density3dFor("ultra", "AMD Radeon 780M")` is 1.5) and the browser check above (FAIL: no second canvas).

- [ ] **Step 2: Run them** (FAIL). **Step 3: Install, write the Blender script and run it, write `ThreeView` and `InkPass`, wire `showHall` behind a `level.hall` that Task 12 defines (until then a `HALLWAY` stub with `hall: { width: 3 }` and a flat floor of 8,000 px so the page can show the view).** The ink shader: black where the normal's dot with its neighbors falls under 0.6 or the depth steps more than 0.02 at the eight neighbors, scaled by density; the mask texture skips the cut-outs (Task 13 draws them white into `tMask`).

- [ ] **Step 4: Run it, `test:next`, `tsc`, eslint, the browser check; `vite build`** (the glb and the decoder served from `public/`): the production preview on 8091 shows the hall (`hallway-browser` against 8091 for the canvas and the fps only).

- [ ] **Step 5: Commit and push** (`package.json`, `scripts/blender/hallway.py`, `art/blender/hallway.blend`, `public/sets/hallway.glb`, `public/draco/*`, the sources, the checks): "three.js in the page: the hallway's set from Blender, the inked view on a second canvas, its own quality steps".

### Task 12: The hall's sim: a lateral axis on the fixed-step world

**Files:**
- Create: `src/sim/levels/hallway.ts`, `src/render/venue-hall-flat.ts`
- Modify: `src/sim/level.ts` (`LevelId "hallway"`, `Level.hall`, `Level.hallCarts`, `Level.hallDoors`, `Level.keyDoor`, `Level.puddle`), `src/sim/input.ts` (`Action "up"`, `KeyW`/`ArrowUp` → `up`), `src/sim/types.ts` (`HeroState.lx`, `Npc.lx`, `Missile.lx`, `Pickup.lx`), `src/sim/physics.ts` (`up` as jump outside a hall; the lateral step; no slide in a hall), `src/sim/hits.ts` (the lateral filter), `src/sim/snot.ts`, `src/sim/missiles.ts`, `src/sim/samples.ts` (the lateral filter on the targets), `src/sim/cast-behavior.ts` (the cast keep his `lx` within 0.4 m when they attack; the bellhops' carts at the elevator lobby), `src/sim/world.ts` (`hallCarts`, `hallDoors`), `src/sim/game.ts` (`hallInput`, the key door, the end), `src/sim/drive.ts` (the hall: forward, sidestep a cart, jump a cart, hit the key door), `src/sim/levels/index.ts`, `src/render/look.ts` (`LEVELS`, `HallState`), `src/render/venue.ts` (the flat chain), `src/routes/index.tsx`, `src/components/next-keys.ts` (the hall's key words), `src/render/hud.ts` (the hall's hints), `src/sim/events.ts` (`keyFail`, `keyOpen`, `hallDoor`)
- Test: `scripts/hallway.check.mjs` (create; after `tower.check.mjs`), `scripts/sim.check.mjs`

**Interfaces:**
- Consumes: `Input`, `inputFrom` (`input.ts`), `stepHero`, `swingContact` (`hits.ts:54`), `sweptHeadHits`, `stepMissiles`, `collectPickups`, `tryDoors`, `THINK`, `Level.thoughts`.
- Produces: `Action` + `"up"` (`KeyW`, `ArrowUp`; the pad's d-pad up and the stick's up; the touch pad's jump button stays `jump`); outside a hall `pressed.up` jumps like `jump`. `Level.hall?: { width: number; keep: number }` (`{ width: 3, keep: 0.4 }`: `lx` is clamped to `±(width/2 - keep)` = ±1.1). `HeroState.lx` (0 by default), `Npc.lx`, `Missile.lx`, `Pickup.lx`; the sim's x is the hall's length in px (100 px a meter: `length 8000`). `hallInput(input): Input` in `game.ts` for a hall level: `right = held.up`, `left = held.down` (walking back, facing unchanged: `h.facing` is forced to 1 in a hall), `down = false` (no slide), `strafe = (held.right ? 1 : 0) - (held.left ? 1 : 0)` on a new `Input.strafe?: -1 | 0 | 1` read by `stepLateral(h, strafe, dt, hall)`: `lx += strafe * 2.0 * dt`, clamped; the press edges are taken as built (a key held through the card is not a press). The lateral filter: `laterallyNear(a, b, reach = 0.6)` = `|a.lx - b.lx| <= reach` in `hits.ts`; `swingContact`, the super burst, the snot, the box, the lecture's reach and the cast's shoves and planes all apply it when `level.hall` (a plane aimed at him flies at his `lx` when launched); pickups collect only when `laterallyNear(h, p, 0.5)`. `Level.hallCarts: { z: number; side: -1 | 1; every: number; at: number }[]` (`{ z: 12, side: 1, every: 6, at: 2 }`, `{ z: 24, side: -1, every: 7, at: 4 }`, `{ z: 41, side: 1, every: 6, at: 1 }`, `{ z: 63, side: -1, every: 8, at: 3 }`, `{ z: 72, side: 1, every: 6, at: 2 }`): every `every` seconds from `at` a cart rolls out of the door at `z` from `side` across the hall at 2.4 m/s and back in at the far wall; a hit while he is on the ground and `laterallyNear(h, cart, 0.6)` and `|h.x - cart.z*100| < 90` costs a pip (`hit { by: "cart" }`); jumped over as built. `Level.hallDoors: { z: number; side: -1 | 1; at: number; every: number }[]` (at z 9, 21, 36, 57, 69 alternating sides): a handle turn 0.5 s before (`hallDoor { z, side, phase: "handle" }`), then a wall 1.5 s (`phase: "open"`: a solid in the sim at `x = z*100`, lateral range from the wall to the middle, `|lx| >= 0`... the door's leaf covers `side*lx > 0.3`: walking into it stops him as a wall; `phase: "shut"`). `Level.puddle = { z0: 29, z1: 31 }` at the alcove: a permanent puddle (the slip as the tower's). The elevator lobby's bellhops: `cast` `{ id: "bell-14-1", person: "bellhop-1", x: 5000, cart: 4900 }`, `{ id: "bell-14-2", person: "bellhop-2", x: 5300, cart: 5200, recolor: "#4a2f6b" }` ("the doors open on bellhops": they `hide` until he is within 1,200 px, then shove with their carts as built, two at a time); guests `{ id: "guest-1", person: "office-2", x: 1500, x0: 1200, x1: 1900, recolor: "#d9c7b8", trick: "wander" }`, `{ id: "guest-2", person: "nurse", x: 3800, x0: 3500, x1: 4200, trick: "wander" }` (the nurse gains `ROLE_OF.nurse = "office"` and `JOB_LINES.nurse`; `jobOf("nurse")` is `"nurse"` by a `JOBS_WHOLE = ["nurse", "titanium"]` list); a bonked guest walks back into the nearest door (`act "away"` → removed at the door). Pickups: `rewards { count: 10, bucees: 1, nuts: 2 }`, `routes [{ id: "hall", x0: 300, x1: 7600, y0: 0, y1: 0 }]`, each pickup given an `lx` from the seed in `[-0.9, 0.9]` (the Buc-ee's on the housekeeping cart at z 44: `lx 0.8`). `checkpoints [{ id: "elevators", x: 5000, y: 0 }]`, `time 300`, `spawn { x: 100, y: 0 }`, `world "2-3"`, `name "The fourteenth floor"`, `music "hallway"`, `doors []`, `Level.keyDoor = { x: 7900, hits: 3, fails: ["Mobile key failed.", "Mobile key failed AGAIN.", "Elite members don't wait."] }`: within 136 px of it a swing counts a `keyFail { n }` with the think, and the third swing `keyOpen` → `walkoff` → `tally` → `levelDone` (the exit without a door). `Level.thoughts`: 600 "Fourteen. Of course it's fourteen.", 3000 "Ice. At this hour.", 5000 "Bellhops. Of course." `venue-hall-flat.ts`: the flat fallback draws the corridor as a side view (the carpet floor, door frames every 300 px, the alcove and the lobby as furniture kinds `hallDoor`, `ice`, `elevators`), the carts as the lobby's cart drawn at their `z*100` sliding on a lateral line shown as a dotted lane marker, the swinging doors as a drawn leaf; the hero's `lx` shown as a small lane dot under his feet.

- [ ] **Step 1: The failing tests**

```js
const hall = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 41, { cast: false, title: true }); g.newRun(41, 0, { shift: [HALLWAY], journey: true, ...opts }); return g; };
test("the hall is 80 m long and 3 m wide: W walks him forward, S back without turning, A and D step him within 1.1 m of the middle", () => {
  assert.deepEqual([HALLWAY.id, HALLWAY.world, HALLWAY.length, HALLWAY.hall, HALLWAY.time], ["hallway", "2-3", 8000, { width: 3, keep: 0.4 }, 300]);
  const g = hall(); play(g); const h = g.world.hero;
  until(g, () => false, 1, { up: true }); assert.ok(h.x > 150 && h.facing === 1);
  const x = h.x; until(g, () => false, 0.5, { down: true }); assert.ok(h.x < x && h.facing === 1 && h.slideT === 0);
  until(g, () => false, 1, { left: true }); assert.ok(h.lx < -0.5 && h.lx >= -1.1);
  until(g, () => false, 3, { right: true }); assert.equal(h.lx, 1.1);
});
test("W held through the card is not a step on the level's first frame; up jumps in a 2D level", () => {
  const g = hall(); while (g.mode === "card") g.step(input({ up: true })); const x = g.world.hero.x; g.step(input({ up: true })); assert.equal(g.world.hero.x, x);
  const l = createGame({ lobby: LOBBY, stash: STASH }, 1, { cast: false, title: true }); l.newRun(1); play(l); l.step(input({ up: true }, { up: true })); assert.ok(!l.world.hero.onGround || l.world.hero.vy < 0);
});
test("the mallet, the snot and the pickups only count within 0.6 m sideways; a cart across the hall hurts only in his lane", () => {
  const g = hall(); play(g); const h = g.world.hero; Object.assign(h, { x: 1400, lx: 1.0, onGround: true });
  const n = g.world.cast.find((c) => c.id === "guest-1"); Object.assign(n, { x: 1630, lx: -1.0 });
  g.step(input({}, { hammer: true })); until(g, () => false, 0.6); assert.equal(n.act, n.act === "down" ? "x" : n.act);
  n.lx = 0.8; g.step(input({}, { hammer: true })); until(g, (x) => n.act === "down" || n.act === "dazed", 0.8); assert.notEqual(n.act, "walk");
  const p = g.pickups.find((p) => !p.taken); Object.assign(h, { x: p.x, y: p.y, lx: p.lx + 0.9 }); g.step(input()); assert.equal(p.taken, false);
  h.lx = p.lx; g.step(input()); assert.equal(p.taken, true);
  Object.assign(h, { x: 1200, lx: -1.0, onGround: true, patience: 2 }); until(g, (x) => x.world.hallCarts.some((c) => c.live), 4);
  const c = g.world.hallCarts.find((c) => c.live); until(g, () => Math.abs(c.lx - h.lx) < 0.3 && Math.abs(c.z * 100 - h.x) < 60, 4); assert.equal(h.patience, 1);
});
test("a door swings open ahead after its handle turns and stops him for 1.5 s; the key fails twice and opens on the third swing, then the level ends", () => {
  const g = hall(); play(g); const h = g.world.hero; Object.assign(h, { x: 850, lx: 0.8, onGround: true });
  const evs = until(g, (x) => of(x.events, "hallDoor").some((e) => e.phase === "open"), 30);
  assert.ok(evs.some((e) => e.type === "hallDoor" && e.phase === "handle"));
  const x = h.x; until(g, () => false, 0.5, { up: true }); assert.ok(h.x < 900);
  Object.assign(h, { x: 7850, lx: 0, onGround: true, move: null });
  const fails = []; for (let i = 0; i < 3; i++) { g.step(input({}, { hammer: true })); fails.push(...until(g, (x) => x.mode !== "play", 0.8)); }
  assert.deepEqual(of(fails, "keyFail").map((e) => e.n), [1, 2]);
  assert.deepEqual([of(fails, "keyOpen").length, g.mode], [1, "walkoff"]);
  assert.deepEqual(of(fails, "think").map((e) => e.text), ["Mobile key failed.", "Mobile key failed AGAIN.", "Elite members don't wait."]);
});
test("the scripted player walks the hall to 1417, sidestepping and jumping the carts, and opens the door", () => {
  const g = hall(); play(g); let t = 0;
  while (g.mode === "play" && t < 200) { g.step(drive(g.level, g.world.hero, "hall", g.world)); t += STEP; }
  assert.deepEqual([g.mode, g.run.lives >= 2, g.run.punched], ["walkoff", true, ["elevators"]]);
});
```

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write it.** **Step 4: Run it, `test:next`, `tsc`, eslint;** `hallway-browser.check.mjs` gains: `&flat=1` plays with `dev.teleport(7850, 0)` and three H presses to `story` ("The suite. Someone is in it." arrives with Task 16: until then the next card), and in 3D the same; `look-boards.mjs ... hallway-flat`.

- [ ] **Step 5: Commit and push**: "The hall's sim: a lateral axis on the fixed-step world, W forward and A left, the carts across the hall, the doors that swing, the key that fails three times".

### Task 13: Hammer and the cast in the hall: the back rig, the atlases, the cut-outs

**Files:**
- Create: `src/sim/rig/back-clips.ts`, `src/render/3d/atlas.ts`, `src/render/3d/cutout.ts`, `art/cuts/hammer-back.json`
- Modify: `scripts/art-sync.mjs` (`BACK = "body-affliction-back.png"` → `registry.hammer.bodies.back` cut by `hammer-back.json`), `scripts/art-cut.mjs` (`BACK_COSTUME`), `src/art/registry.ts`, `src/render/character.ts` (`createCharacter(registry, "back")`: the same five meshes, no head plate, no face), `src/render/3d/three-view.ts` (the cut-out quads, the mask), `src/render/look.ts` (the atlas build at `prepare(HALLWAY)`), `src/render/boards.ts` (`VENUE_FRAMES.hallway` as three `HallState` camera positions rendered by `ThreeView` into the board, `START_FRAMES.hallway`, `back` board), `scripts/look-boards.mjs`, `scripts/start-art.mjs`, `scripts/art.check.mjs`
- Test: `scripts/rig.check.mjs`, `scripts/art.check.mjs`

**Interfaces:**
- Consumes: `art/cuts/hammer-body.json`'s shape (`rig { sole, rootX, joints, bones, skin }`, `layers`), `separateLayers`, `buildMesh`, `skinWeights` (`art-cut.mjs`), `CLIPS`, `animate`, `solve` (`src/sim/rig/`), `createCharacter` (`character.ts:122`), `faceClear` (`face.ts:45`), `app.renderer.extract.canvas`.
- Produces: `art/cuts/hammer-back.json`: the back painting's joints in its own pixels (the sole, the root, the shoulders, elbows, wrists, hips, knees, ankles measured on `node scripts/art-grid.mjs back`; a new `art-grid` target `back`), its five layers (`armFar` = his left arm, `armNear` = the right arm with the mallet, `legFar`/`legNear`, `torso` with the head: the head is part of the torso layer, there is no head plate); the sync cuts it as the costume `"back"` (`COSTUMES` + `"back"`, read from `body-affliction-back.png`) into `hammer/back-<layer>.png` and `hammer/back-rig.json`. `src/sim/rig/back-clips.ts`: `BACK_CLIPS: Record<"idle" | "walk" | "run" | "swing" | "jump" | "hurt", Clip>` in the rig's clip format on the back rig's skeleton: idle a 0.1 rad shoulder breath; walk the legs alternating ±0.35 rad at the hips over 0.6 s with a 6 px bob and the free arm swinging ±0.3; run ±0.5 rad over 0.42 s, a 10 px bob; swing the mallet arm rising to −2.6 rad over 0.2 s and falling through 0.7 rad by 0.42 s (`MOVE_SECONDS.swing`), the torso turning 0.15 rad; jump the legs tucked 0.6 rad; hurt the torso bent back 0.3 rad. `src/render/3d/atlas.ts`: `buildAtlas(app, character, clips: { name, frames }[], size = 256): Promise<Atlas>` renders each clip's frames (`frames` evenly over the clip: 8 for idle, 12 walk, 12 run, 10 swing, 6 jump, 6 hurt; the profile `hurt` and `super` from the 2D rig at 10 each) with `extract.canvas` into one canvas (a grid, each cell `size` wide by `size * 1.6` tall), returning `{ texture: THREE.CanvasTexture (mipmaps, anisotropy 8), cells: Map<string, { u, v, w, h }[]> }`; the cast's atlases from their front rigs (idle 8 and walk 12 as they face him; the bellhops' cart separately). `cutout.ts`: `Cutout` = a `PlaneGeometry` quad 1.9 m tall facing the camera with `MeshBasicMaterial({ map, transparent, alphaTest 0.5 })`, a blob shadow (`CircleGeometry` with a radial alpha, on the floor), `set(cell, flip)`, and a second material for the mask pass (white where alpha). `ThreeView.sync` picks Hammer's cell: the back clip by `hero.clip` (`idle | walk | run | swing | jump`) and `u`, the profile atlas while `hurt` or `super` (`facing` by the attack's side: the quad flips so the mallet goes toward the camera's left or right as the 2D profile has it); the cast quads from their front atlases facing −Z; the missiles as small quads (the plane, the water); the pickups as the product pictures on quads; the carts as a box with the cart's painting on its side; the door leaves as a box rotating 90 degrees over 0.5 s. The face check for the back: `rig.check.mjs` asserts the back rig has no head plate and `art.check.mjs` asserts `hammer/back-torso` has no pixel of `isSkin` above the collar line in the face band (the back of the head is hair and ear: the check samples the 40 by 40 box where the profile's face would be, mirrored: fewer than 5 percent skin pixels), and that the profile atlas's frames come from clips already under `faceClear` (the 2D `hurt` and `super`: no new 2D clip). Boards: `VENUE_FRAMES.hallway` = three hall positions (`z 2`, `z 30`, `z 78`) rendered through `ThreeView` into the board's texture (`boards.ts` reads the three canvas with `extract` of a `CanvasTexture`: `three.renderer.domElement.toDataURL` composited under the HUD-less Pixi frame); `START_FRAMES.hallway = { z: 10 }`; `public/start/hallway.webp`.

- [ ] **Step 1: The failing tests** in `rig.check.mjs` ("the back rig's clips keep both soles within 2 px of the floor and never show a head plate": every `BACK_CLIPS` frame at 61 samples through `solve` on the back skeleton with `plantFeet`; `registry.hammer.bodies.back.rig` has `head: null`) and `art.check.mjs` ("the back painting shows no face": the skin box rule above; "the back rig is cut into five layers").

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write the cut (measure on the grid), the sync's costume, the clips, the atlas, the cut-outs and the sync.** **Step 4: Run it, `npm run art:sync`, `test:next`, `tsc`, eslint;** `hallway-browser` gains: `__next.hero.clip` is `walk` under W and `swing` on H, `__next.faceScreen` is null while walking and a rect while `hurt` (`dev.hit()`), the rect inside the viewport; `look-boards.mjs ... hallway,back` and look at the three frames and the back clips board at full size: his back reads as him, the mallet rises over his head on the swing, the ink stays off him, the cast face him, feet on the carpet; `start-art.mjs ... starts` for `hallway.webp`.

- [ ] **Step 5: Commit and push**: "Hammer in the hall: his back rigged from the one painting, the swing from behind, his profile when hit and for the smash, the cast facing him as cut-outs".

### Task 14: The hallway in the browser, and the 3D governor

**Files:**
- Modify: `scripts/hallway-browser.check.mjs`, `src/render/look.ts` (the governor, the context loss), `src/render/3d/three-view.ts`, `src/components/next-settings.tsx` (the quality list shows the 3D density beside the tier: "Auto · Ultra (1.5×)"), `src/components/next-keys.ts` (the hall's words: "W forward", "A D sidestep", "S back")

**Interfaces:**
- Consumes: Tasks 11 to 13; `shouldStepDown`; `PAD_GLYPHS`; the pad's stick (`gamepad.ts`).
- Produces: `hallway-browser.check.mjs` complete: at 1920 by 1080 then 1280 by 800, 390 by 844, 844 by 390: the card ("2-3", "The fourteenth floor") fits; `__next.heroScreenX` (the three view's projection of him) is 0.50 at rest, under 0.45 after A for 0.5 s and over 0.55 after D (A is screen left); W held through the card: `__next.hero.x` unchanged on the first step; S walks back, `facing` stays 1; the hint reads "W forward · A D sidestep" then the threats; the pad's left stick (`dev.pad({ axes: [-1, 0] })`: `dev.pad` added to drive `readPad`) steps him left; `__next.three.fps >= 58` over 5 s at 1920 by 1080 at ultra; the governor: `dev.three({ frameMs: 30 })` for 2 s steps `__next.three.quality` down one tier and `density` with it, never up; a forced context loss (`WEBGL_lose_context` through `dev.three({ lose: true })`) falls back to the flat view within a frame (`__next.three.canvas === false`, the HUD still there, the level playable to the key door); `&flat=1` plays to the end; the puddle slips him at z 30; the bellhops shove at the elevators; `faceScreen` null while walking, a rect on `dev.hit()`; no console errors; screenshots `hallway-{w}x{h}.png`, `hallway-swing.png`, `hallway-hurt.png`, `hallway-door.png`, `hallway-flat.png`.

- [ ] **Step 1: Write the check** (it FAILS on the governor and the loss). **Step 2: Run it.** **Step 3: Write the governor's step-down, the context-loss fallback, the Settings' line, the hall's key words.** **Step 4: Run it at the four sizes; `browser-smoke.mjs`** against the hall page (`canvas` count 2 is expected: update its one-canvas assumption to "at least one"). Look at every screenshot at full size.

- [ ] **Step 5: Commit and push**: "The hall in the browser: A steps him left under the chase camera, the view steps down on a weak card and falls back flat on a lost context".

### Task 15: The suite and Lifetime Titanium guy

**Files:**
- Create: `src/sim/levels/suite.ts`, `src/sim/titanium.ts`, `src/render/venue-suite.ts`, `scripts/blender/suite.py`, `art/outgoing/renders/suite-1..3.png`, `art/cuts/cast-titanium.json` (when the painting is in)
- Modify: `src/sim/level.ts` (`LevelId "suite"`, `CastPerson "titanium"`, `Level.rooms`, `PlatformKind "bed" | "rail" | "minibar"`, `LevelPlatform.bounce`, `BossSpec.room`), `src/sim/physics.ts` (the bounce), `src/sim/missiles.ts` (`"apple" | "bottle"`, batting), `src/sim/hits.ts` (a swing that meets an apple reverses it, +100), `src/sim/world.ts`, `src/sim/game.ts` (`createBoss` titanium, the rooms' camera, the bellhops arriving, the boss-ended level), `src/sim/cast.ts` (`JOBS_WHOLE` titanium: no level role), `src/sim/drive.ts` (`fightTitanium`), `src/sim/levels/index.ts`, `src/game/lines.ts` (his and Hammer's lines), `src/render/look.ts` (`LEVELS`, the camera's room bounds), `src/render/cast.ts` (`LOOKS.titanium`: navy suit, a briefcase, the lanyard), `src/render/props.ts` (the apple, the bottle, the briefcase), `src/render/hud.ts`, `src/render/boards.ts` (`VENUE_FRAMES.suite`, `START_FRAMES.suite`, `titanium`), `scripts/look-boards.mjs`, `scripts/start-art.mjs`, `scripts/art-sync.mjs` (`CAST_PERSONS` titanium), `scripts/art.check.mjs`, `src/routes/index.tsx`, `src/sim/events.ts` (`grab`, `giveBack`, `bossPhase`, `pool`)
- Test: `scripts/suite.check.mjs` (create; after `hallway.check.mjs`)

**Interfaces:**
- Consumes: `Supervisor`'s shape (Task 7), `World.boss`, `stepBoss`, `hitBoss`, `BOSS_ID`, `createCast` at runtime (`world.cast.push(...)` as the lobby's cast are made), `launchCoffee` (the bottle: coffee's arc, faster and lower), `launchPlane`'s lift (the apple: a lob with `gravity 1400`), `addCans`, `oneUp`, the camera `bounds` (`showLevel`).
- Produces: First, the renders: `scripts/blender/suite.py` builds the suite in three rooms (a living room with a sofa, a coffee table, a fruit basket and a minibar; a bedroom with a king bed; a balcony with a rail, the city's lights as emissive dots, the pool below) and renders three 1536 by 1024 frames (`artifacts/suite-render-1..3.png`, copied to `art/outgoing/renders/suite-1..3.png`, committed) as the input images for the owner's prompt 5 in `batch-story-phase2-codex.txt` (hand it to the owner now; `backdrops/suite-1..3.png` are cut as walls `suite-far-1..3` by `art/cuts/wall-suite-far-N.json` when they land; a drawn suite stands in). `SUITE: Level`: `id "suite"`, `name "The suite"`, `world "2-4"`, `length 4800`, `spawn { x: 300, y: 0 }`, `time 300`, `music "suite"`, `bounds { x: -400, y: -1600, w: 5600, h: 2200 }`, `rooms: [{ id: "living", x0: 0, x1: 1600 }, { id: "bedroom", x0: 1600, x1: 3200 }, { id: "balcony", x0: 3200, x1: 4800 }]`, floor one carpet segment −400 to 3,200 and a tiled balcony 3,200 to 5,200 (the pool is not a pit: no gap), platforms `{ x0: 300, x1: 800, y: -170, kind: "sofa" }`, `{ x0: 900, x1: 1300, y: -120, kind: "table" }`, `{ x0: 1900, x1: 2900, y: -200, kind: "bed", bounce: 1.3 }` (landing on it with `vy > 200` relaunches him at `1.3 × JUMP_V` with a `bounce` event; the boss uses the same rule), `{ x0: 3300, x1: 3600, y: -120, kind: "minibar" }`, solids: the balcony rail `{ x: 4700, y: -220, w: 40, h: 220 }` is drawn only (`kind "rail"` platform at `y: -220` for the drawn rail; he cannot fall off); crates: `{ id: "minibar", kind: "can", x: 3450, y: -140 }`; checkpoints `[]`; doors `[]`; `boss: { kind: "titanium", x: 1200, arena: [200, 4600], room: 0 }`; no punch clock; `rewards { count: 0, bucees: 0, nuts: 0 }`; `camera.zones []` (the room's bounds frame it). `src/sim/titanium.ts`: `Titanium = { kind: "titanium"; x; y; vx; vy; onGround; facing; state: "idle" | "windup" | "swing" | "throw" | "bounce" | "phone" | "grab" | "hurt" | "pool" | "down"; hp: 12; max: 12; phase: 1 | 2 | 3; room: 0 | 1 | 2; hurtT; timer; thrown: number; took: number; owed: number; bellhopT }`, `TITANIUM = { hp: 12, gap: 0.45, briefcase: { reach: 1.3, windup: 0.4, swing: 0.3, rest: 1.2 }, apples: { every: 3, count: 3, gravity: 1400, speed: 520, points: 100 }, bed: { every: 2.2, bounce: 1.3 }, bellhops: { every: 10, first: 3 }, bottles: { every: 2.4, speed: 760, up: -180 }, grab: { windup: 0.6, lunge: 540, reach: 160, takes: 10, every: 7 }, flinch: 0.25, points: 5000, pool: 1.2 }`; `createTitanium(b)`, `stepTitanium(t, w, dt, events)`: phase 1 in the living room: he walks within `briefcase.reach × the mallet's reach` (the mallet's effective reach is 230 px as the checks use: 300 px) and winds up 0.4 s (`bossWindup`), swings 0.3 s (a hit on Hammer in front costs a pip: `damage`), rests 1.2; every 3 s he lobs three apples (`MissileKind "apple"`, `launchPlane`-style lobs with `gravity 1400` at his position, 0.25 s apart); a mallet swing meeting an apple (`sweptHeadHits` on the missile) reverses its `vx` and gives 100 (`batted`); an apple hit costs a pip. Phase 2 (hp ≤ 8) moves him to the bed (`room 1`, `bossPhase { phase: 2, room: 1 }`, a `castSay` "This is Ambassador... send someone up."): he bounces on the bed every 2.2 s (`bounce` state: up at `1.3 × JUMP_V`, out of reach above `y < -500`; hittable at the bounce's bottom and from the bed), and bellhops arrive from the door at 1,650 every 10 s from 3 s in (two at a time, `person bellhop-1/2` with a cart each, `carry: "keycard"`, the lobby's rules; their keycards are 200 points: `level.status` is off). Phase 3 (hp ≤ 4) moves him to the balcony (`room 2`): bottles every 2.4 s (`MissileKind "bottle"`, `launchCoffee`'s arc with `speed 760, up -180`: fast and low, a pip on a hit, a puddle on the floor), and the grab every 7 s: 0.6 s windup (`grab { phase: "windup" }`), a lunge of 540 px; if it meets him (`reach 160`) `took = min(10, run.cans)`, `run.cans -= took`, `t.owed += took`, "Let's split it evenly." as his say; every hit on him while `owed > 0` gives `min(10, owed)` cans back (`giveBack { n }`, `addCans` so a life can come). The towel wipe between phases: `bossPhase` grants 1.2 s of `invuln`. A hit: `hitBoss(t, by, events)` with `hurtT 0.45` and a `flinch` (`bossHit { hp }`); at 0 hp in phase 3: `state "pool"` for 1.2 s (he goes over the rail: `vx 400, vy -500`, falling past the bounds' bottom edge), `pool { x }` (a splash cue, the bubble "...Ambassador."), then `down` with `bossDown { points: 5000 }`; the level ends when `state === "down"` (`game.ts`: a level with a boss and no exit door goes to `walkoff` 1.5 s after `bossDown`, then `tally` (no clock bonus: `time 300` counts as built) and `levelDone`). If Hammer dies the same step as `bossDown`, the win stands (`bossDown` is handled before `lifeLost`). The camera: `showLevel` for a level with `rooms` sets `camera.bounds` to the boss's room (`x0 - 200 .. x1 + 200`, the level's y) and pans on `bossPhase` (the ease as `ZOOM_EASE`); Hammer may walk out of the frame's room: the bounds follow the boss, not him. `fightTitanium` in `drive.ts`: stands 260 px from him facing him, bonks when his `state` is not `windup`/`swing`/`bounce` and the gap is under 300, jumps apples and bottles (a missile within 400 px and closing), and in phase 2 jumps onto the bed. Lines: his `arrive` "I was here first. Ambassador.", `phase2` "We're out of suites.", `phase3` "The lounge is closed for renovation.", `grab` "Let's split it evenly.", `hurt` "Lifetime. Look it up."; Hammer's thinks at the phases: "I've been Platinum since it was Platinum Premier.", "I've had status since '98.", "This is a room with a view of a wall.", "Where's my welcome gift?", "Ambassador of WHAT?", "Resort fee THIS." (the last on the win). `LOOKS.titanium` (a navy suit, a briefcase in the near hand, a lanyard; the stand-in until `cast/titanium.png` is cut; `CAST_PERSONS` + `titanium`). `venue-suite.ts`: the three rooms drawn (the sofa, the table with the basket, the minibar, the bed with its headboard, the balcony's rail and the city, the pool's glint below the rail) under walls `suite-far-1..3` when cut (`backdrop.walls`), a drawn suite otherwise. Boards: `VENUE_FRAMES.suite` = one frame a room; a `titanium` board of his states; `START_FRAMES.suite = { x: 600, cx: 800 }`; `public/start/suite.webp`.

- [ ] **Step 1: The failing tests**

```js
const suite = (opts = {}) => { const g = createGame({ lobby: LOBBY, stash: STASH }, 51, { cast: false, title: true }); g.newRun(51, 0, { shift: [SUITE], journey: true, ...opts }); return g; };
test("the suite is three rooms with no clock bonus to chase, the bed bounces 1.3 times his jump, and the boss has twelve health in three phases", () => {
  assert.deepEqual([SUITE.id, SUITE.world, SUITE.rooms.length, SUITE.doors.length, SUITE.checkpoints.length, SUITE.boss], ["suite", "2-4", 3, 0, 0, { kind: "titanium", x: 1200, arena: [200, 4600], room: 0 }]);
  const g = suite(); play(g); const h = g.world.hero; Object.assign(h, { x: 2400, y: -600, vy: 400, onGround: false });
  const evs = until(g, (x) => of(x.events, "bounce").length > 0, 2); assert.ok(Math.abs(h.vy) > 1.2 * JUMP_V * 0.9);
  assert.deepEqual([g.world.boss.hp, g.world.boss.phase, g.world.boss.room], [12, 1, 0]);
});
test("phase 1: the briefcase swing is telegraphed and reaches 1.3 times the mallet; apples come three at a time every 3 s and are batted back for 100", () => {
  const g = suite(); play(g); const t = g.world.boss; Object.assign(g.world.hero, { x: t.x - 350, onGround: true, patience: 2 });
  const evs = until(g, (x) => of(x.events, "bossWindup").length > 0, 4); assert.ok(evs.length > 0);
  until(g, (x) => x.world.hero.patience < 2, 1.5); assert.equal(g.world.hero.patience, 1);
  Object.assign(g.world.hero, { x: t.x - 700, patience: 2, invuln: 0 });
  const apples = until(g, (x) => x.world.missiles.filter((m) => m.kind === "apple").length >= 3, 4);
  const a = g.world.missiles.find((m) => m.kind === "apple"); Object.assign(g.world.hero, { x: a.x - 200, y: 0 }); const s = g.run.score;
  until(g, (x) => x.run.score > s, 1, { hammer: true }); assert.equal(g.run.score - s, 100);
});
test("phase 2 on the bed with bellhops every 10 s dropping 200-point keycards; phase 3's grab takes ten cans and each hit gives ten back; the win goes into the pool and ends the level", () => {
  const g = suite(); play(g); const t = g.world.boss; t.hp = 9; hitBoss(t, "bonk", g.events); g.step(input());
  assert.deepEqual([t.phase, t.room, g.world.cast.length], [2, 1, 0]);
  until(g, (x) => x.world.cast.length >= 2, 4); assert.ok(g.world.cast.every((n) => n.carry === "keycard"));
  const n = g.world.cast[0]; for (let i = 0; i < 3; i++) strikeNpc(n, "bonk", 1, g.world, g.events); g.step(input());
  const k = g.pickups.find((p) => p.kind === "keycard"); const s = g.run.score; Object.assign(g.world.hero, { x: k.x, y: k.y, onGround: true }); g.step(input()); assert.equal(g.run.score - s, 200);
  t.hp = 5; hitBoss(t, "bonk", g.events); g.step(input()); assert.deepEqual([t.phase, t.room], [3, 2]);
  g.run.cans = 25; Object.assign(g.world.hero, { x: t.x - 300, y: 0, onGround: true, invuln: 0 });
  until(g, (x) => of(x.events, "grab").some((e) => e.phase === "take"), 9); assert.deepEqual([g.run.cans, t.owed], [15, 10]);
  hitBoss(t, "bonk", g.events); g.step(input()); assert.deepEqual([g.run.cans, t.owed], [25, 0]);
  g.run.cans = 4; t.owed = 0; until(g, (x) => of(x.events, "grab").some((e) => e.phase === "take"), 9); assert.deepEqual([g.run.cans, t.owed], [0, 4]);
  t.hp = 1; hitBoss(t, "bonk", g.events); const evs = until(g, (x) => x.mode !== "play", 4);
  assert.deepEqual([of(evs, "pool").length, of(evs, "bossDown").length, g.mode], [1, 1, "walkoff"]);
});
test("the scripted player beats Lifetime Titanium guy; a masher who never jumps loses to the apples and the bottles", () => {
  const g = suite(); play(g); let t = 0; while (g.mode === "play" && t < 280) { g.step(drive(g.level, g.world.hero, "floor", g.world)); t += STEP; }
  assert.deepEqual([g.world.boss.state, g.mode, g.run.lives >= 1], ["down", g.mode === "walkoff" ? "walkoff" : "tally", true]);
  const m = suite(); play(m); until(m, (x) => x.mode === "over", 300, { hammer: true, right: true }); assert.equal(m.mode, "over");
});
test("Try again after Hammer down in phase 3 brings back twelve health, phase 1, the living room and his cans as at the card", () => {
  const g = suite(); play(g); g.run.cans = 30; const t = g.world.boss; t.hp = 3; hitBoss(t, "bonk", g.events); g.step(input());
  knockOut(g); knockOut(g); knockOut(g); until(g, (x) => x.mode === "over", 6);
  g.newRun(51, g.venue, { snapshot: g.snapshot }); play(g);
  assert.deepEqual([g.world.boss.hp, g.world.boss.phase, g.world.boss.room, g.run.cans], [12, 1, 0, g.snapshot.run.cans]);
});
```

- [ ] **Step 2: Run them** (FAIL). **Step 3: Run the Blender script, hand the owner prompt 5 with the renders, then write the level, the boss, the missiles, the bounce, the rooms' camera, the driver, the stand-in venue, the lines.**

- [ ] **Step 4: Run it, `test:next`, `tsc`, eslint;** `scripts/suite-browser.check.mjs` (create: `?next=1&dev=1&level=suite`: the card "2-4" "The suite" with the status line; the boss bar "Lifetime Titanium guy" 12; the camera's x moves to the bedroom on `dev.boss({ hp: 8 })` and the balcony on `({ hp: 4 })`; the apples on screen; `dev.boss({ state: "down" })` → the splash cue played, "...Ambassador." in a bubble, then `story`; the four sizes' screenshots `suite-{w}x{h}.png`, `suite-phase-{1,2,3}.png`); `look-boards.mjs ... suite,titanium` and look at the rooms and his states.

- [ ] **Step 5: Commit and push**: "The suite: Lifetime Titanium guy's briefcase and apples, the bed and the bellhops, the bottles and the grab, over the rail into the pool".

### Task 16: Act 2's ending, its cards, and the strip after it

**Files:**
- Modify: `src/sim/story.ts` (the cards on `hallway` and `suite`, `STRAIGHT_BUILT`), `src/components/next-strip.tsx` (`STRAIGHT_BUILT`), `src/components/next-veil.tsx` (the status on the act card), `src/components/next-game.tsx` (the home scene stays night after Act 2), `scripts/journey-browser.check.mjs`
- Test: `scripts/journey.check.mjs`

**Interfaces:**
- Produces: `STORY`'s `hallway.after = [{ kind: "caption", text: "The suite. Someone is in it." }]`, `suite.after = [{ kind: "phone", app: "Marriott Bonvoy", text: "Your status has been reviewed: TITANIUM. Lifetime.", thought: "Lifetime." }, { kind: "act", act: "act2" }]`; `lobby-night.before = [{ kind: "caption", text: "11:40 pm. The same lobby." }]` (a one-line bridge after Act 1's card when the player continues; a replay shows it too, as SAT's email rule). `STRAIGHT_BUILT: ActId[] = ["act1"]`: the strip shows an act's straight-through button only for acts in it (Phase 5 adds the rest). The act card shows the status reached ("TITANIUM" under the total) from the run's `keycards` at the suite's end (`levelDone` carries `status` as a string: `LevelDone.status?: string`). `flight` stays unbuilt: after the act card, Continue goes home where 3-1 shows "Coming" and Clock in reads "Act 3 is coming" (as built for Act 2). The home scene stays `lobby-night` after Act 2 (the save's `done` has `arena`); the night insults are the same twelve.

- [ ] **Step 1: The failing tests** in `journey.check.mjs`: "the cards: the night caption before 2-1, the suite caption after 2-3, the phone and the act card after 2-4" (`stopOf("hallway").after`, `stopOf("suite").after` deepEqual the above; `stopOf("lobby-night").before`); "finishing 2-4 ends the act: the next stop is flight, the run cleared, the act's total the sum of the four bests" (`finishLevel` through the four with scores; `actTotal(j, "act2")`); "Act 2's header shows no straight-through button in this phase" (`STRAIGHT_BUILT` deepEquals `["act1"]`).

- [ ] **Step 2: Run them** (FAIL). **Step 3: Write it.** **Step 4: Run it, `test:next`, `tsc`;** `journey-browser.check.mjs` gains Act 2's run: from the Act 1 end, Continue → "11:40 pm. The same lobby." → 2-1's card with "Front desk has you as MEMBER. System error." → `dev.give("keycard")` ×8, ↓ at the stairs → 2-2's card "· TITANIUM" → `dev.boss({ state: "down" })` and `teleport(2500, -7020)` → 2-3's card → `&flat` is not needed: the real hall in 3D, `teleport(7850, 0)`, H ×3 → "The suite. Someone is in it." → 2-4's card → `dev.boss({ state: "down" })` → the phone card "TITANIUM. Lifetime." and "Lifetime." → the act card "Act 2 · Status Crusade · complete" with the total and "TITANIUM" → home: 3-1 "Coming", Clock in "Act 3 is coming", the strip's act2 header total, no straight-through button on it, the Side quests row with three cards; the save `next: "flight"`, `done` the nine, `run: null`; each card `cardFits`.

- [ ] **Step 5: Commit and push**: "Act 2 ends: the suite's door card, the Bonvoy review, the act card with the status, Act 3 coming on the strip".

### Task 17: Part B's verification, the report and the handoff (Phase 2 ships)

**Files:**
- Modify: `README.md` ("The fourteenth floor (2-3)", "The suite (2-4)" after "The tower (2-2)"; "How it is built" gains the 3D view's paragraph; "The journey" for Act 2; the validation list), the spec ("As built (Phase 2b)" under §8, §12, §13, §16), `docs/superpowers/handoff-<date>-phase-3.md` (create), `docs/superpowers/plans/2026-11-04-story-phase-2-ledger.md` (create: the ledger copied from the workspace)

- [ ] **Step 1: Every check** as Task 10's Step 1, plus `hallway.check`, `suite.check`, `hallway-browser`, `suite-browser`, the Act 2 run in `journey-browser`; `look-boards.mjs` for `hallway`, `back`, `suite`, `titanium`, `cast` (the three new people, painted or stand-ins); `start-art.mjs starts`; the production build with the glb and the decoder served, `hallway-browser` and `journey-browser` against 8091; 60 fps over 5 s at ultra at 1920 by 1080 in the hall and the suite; the three other sizes; the protected files' hashes.
- [ ] **Step 2: README, the "As built (Phase 2b)" notes, the ledger file, the handoff for Phase 3** in the style of `docs/superpowers/handoff-2026-11-02-phase-2.md`: what Phase 2 built, what is still unpainted (the three people, the lounge, the tower's walls and sheet, the suite's three, as they stand), the deferred minors still open, the Phase 3 asks (the cabin's Blender set and the flight as the second 3D level on `ThreeView`; the purser and the attendant; Paris and the brasserie with the French table on the lounge's menu pattern; the train from Blender renders painted over), the environment and the rules.
- [ ] **Step 3: The fresh reviewer** over Part B's diff against §8.3, §8.4, §12 and the Review Focus items 3 to 5; fix; rerun Step 1.
- [ ] **Step 4: Commit and push**: "Phase 2 ships: the fourteenth floor in three.js, the suite and Lifetime Titanium guy, Act 2 complete (README, as built, the Phase 3 handoff)". Report to the owner in product terms with the boards and the decisions, and open the browser panel on `?next=1` for them to play the night through.

---

## Self-review (done at writing, 2026-11-04)

1. **Spec coverage.** §8.1 → Tasks 1 to 5 (the night pass 2, keycards and doors 3, the crew 4, the lounge 5); §8.2 → Tasks 6 to 8; §8.3 → Tasks 11 to 14; §8.4 → Task 15; the act's cards and the strip (§7's pattern, §5.2) → Task 16; §12 and its note → Tasks 11, 13, 14 (the inked look, the pitfalls, the back view, the cast facing him, the quality steps, the fallback); §13 (this phase's rows and cues) → Task 9; §16 Phase 2 → the brief and prompts (`art/outgoing/batch-11-story-phase2.txt`, `batch-story-phase2-codex.txt`) and the cut-in steps of Tasks 4, 5, 7, 8, 13, 15; §19 → Tasks 10 and 17; §5.1's night scene → Tasks 1 and 2; §20 items 19 to 22 → Tasks 1, 12, 15, 16. Not in this phase by the spec's own word: the straight-through run of Act 2 and "Night over" (Phase 5, decision 9), the awards and the phone panel (Phase 5), the cast's back views (dropped by the note).
2. **Step scan.** Every code step names its file, its signature and the spec's values; bodies appear only for the tests and for the numbers the spec pins. The Blender scripts are described by what they build, not written. The browser checks are lists of assertions.
3. **Type consistency.** `LevelId` gains the same four ids in Tasks 1, 6, 12, 15 and `STOP_LEVELS` lists them in that order. `BossSpec.kind` (Task 7) is what `GIFTSHOP`, `TOWER` and `SUITE` carry; `World.boss` holds a `Supervisor | Titanium` and `World.pig` the pig; `hitBoss(boss, by, events)` is the one signature in Tasks 7 and 15; `HudPayload.boss.name` is read by `next-hud.tsx`. `Level.hall` is the switch for `hallInput`, `showHall` and the lateral filter (Tasks 11 to 14). `HallState` (Task 11) is what Task 12 builds and Task 13 fills. `QuestId "lounge"` names the door, the key and the card; the quest object stays `id "hungry"` with `menu "lounge"` (Task 5) and `questMusic` reads `menu` (Task 9). `Run.keycards` and `Run.perks` (Task 3) are what the snapshot carries and what Task 15's 200-point rule skips (`level.status` off). `Input.up` (Task 12) is also what Task 14's pad check drives. `CastSpawn.trick` holds `water | replyAll | wander` across Tasks 4, 7 and 12.
4. **Review Focus.** Each of the five has its task named and its test added there (Tasks 3 and 10; 6 and 10; 11 and 14; 12 and 14; 15).
5. **Proportion.** The plan is shorter than the spec's Act 2 and 3D sections plus the code it produces; the test blocks are the bulk.

**What the owner sees between the halves:** after Task 10 the night is playable to the top of the tower; 2-3 shows "Coming" and Clock in reads "Act 2 is coming" at it; the lounge's card is on the Side quests row once 2-1 is finished; the home screen is the lobby at night. A save that finished 2-2 in 2a continues at 2-3 once 2b ships (the stop is `next` and built: `playableNext` returns it). After Task 17, Act 2 ends on its act card and 3-1 is "Coming".

