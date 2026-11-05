# SDD ledger — plan: docs/superpowers/plans/2026-11-04-story-phase-2.md

Method: superpowers:executing-plans inline, Opus 5.5. Spec: docs/superpowers/specs/2026-11-02-hammer-time-story-design.md. Baseline 2026-11-04: test:next 629/629 at 9a6ba6b.

## Pre-flight (shared interfaces)
| Tasks | Produced vs consumed | Found |
| 1 -> 3,4,5 | LOBBY_NIGHT with doors [] and cast [] filled later | consistent |
| 1 -> look | createGame home: "in wholeShift or venues"; the real game must not put 2-1 in Work the whole shift | conflict: Ruling P1 |
| 3 -> 3 | keycard coordinates vs the lobby's furniture | conflict: Ruling P2 |
| 3,4 tests | night() has cast:false but Task 4 reads g.world.cast; n.id vs n.spawn; the story hold not continued | test defects: Ruling P3 |
| 6 -> 6,7,8,10 | V-shaped flights with one-sided landings vs tests that stand him at x=310 floor 4, x=380 floor 2, x=1500 on flight 11 | conflict: Ruling P4 |
| 6 | checkpoint rule x-only vs a tall level; floor-5 clock at 350 inside the chute 200..420 | conflict: Ruling P5 |
| 7 -> 15 | BossSpec, World.boss, hitBoss | consistent |
| 11 -> 12 -> 13 | HallState | consistent |
| 12 -> 14 | Input.up, Input.strafe | consistent |
| 3 -> 15 | keycards score 200 without Level.status | consistent |

Ruling P1: Levels gains `homes?: Level[]`: levels that may be the home scene without being in Work the whole shift; `home` resolves in wholeShift then homes; the plan's own test (venues:[LOBBY_NIGHT]) still holds. The shell also tells the look when the save changes (`setHome`), so finishing Act 1 or New game in the same page changes the scene on the next visit home. Cost if wrong: one option.
Ruling P2: keycards stand on the real furniture (the plan's x 2600, 5100, 7200 are in mid-air or on nothing; spec names desk, both sofas, landing, mezzanine rail, tables, corridor, stash shelf): desk 1700/-250, sofas 3150/-180 and 4150/-180, landing 6680/-190, rail 8300/-590, tables 12500/-230, corridor 15050/-70, stash shelf 1300/-400. Cost if wrong: a spot moves.
Ruling P3: plan test bodies are the intent; where they cannot run as written (a cast:false game reading the cast, string ids, no continueStory, three knockOuts in one step) they are repaired keeping every assertion's meaning. Cost if wrong: none to the game.
Ruling P4: the tower is full-width landings with flights that do not overlap: odd floors walk right from x=100 to the foot at x=1100 and the flight rises right to x=2100; even floors walk left from x=2100 to the foot at x=1100 and the flight rises left to x=100. So every landing is crossed, carts, chutes and wet floors are on the way, no U-turns; a chute's fall lands on the floor below as the spec says; 13 flights at 28.4 degrees as tested. The supervisor stands at the top of flight 11-12 (x=2100, arena [1100, 2100]). Spots moved to the walked part: chute 9 and 13, carts, nooks. Cost if wrong: level layout tweaks, nothing structural.
Ruling P5: in a level with `floors` a punch clock counts when he is on its floor within 120 px of it; floor 5's clock moves to x=650, clear of the chute. Cost if wrong: a clock moves.
Task 1: Ruling: migrateJourney moves next to the first stop not done (the plan's test) rather than dropping done entries (its prose) - the test also covers the locked-forever case - cost if wrong: a hand-edited save replays a stop.
Task 1: Ruling: the fanfare lifts its own notes by 1/quiet instead of raising the bus for 1.4 s, so the song under it stays quiet - cost if wrong: none audible.
Task 1: Ruling: lobby-night.webp is a copy of lobby.webp until Task 2 renders it - cost if wrong: none.
Task 1: Ruling: next-start's journey=all now opens 2-1 too, so 2-2 is next there and "Act 2 is coming" still shows; journey-browser goes on to 2-1's card after Act 1 and returns home by a fresh page - cost if wrong: none to the game.
Task 1: complete (commits 9a6ba6b..dbeb48d, tests: npm run test:next → # duration_ms 86507.2681)
Task 2: Ruling: a night level's backdrop takes its tints when it loads rather than through Backdrop.setNight, since each level has its own backdrop object - cost if wrong: none.
Task 2: Ruling: night lamps use a softer disc (no hot core): at the plan's 1.6 intensity the old disc burned out the FRONT DESK sign like a sun; the plan's radius, intensity and flicker stand - cost if wrong: lamps a little dimmer at their very center.
Task 2: Ruling: added public/start/key-art-night.webp and the start screen uses it once Act 1 is done, so the first paint fades into the night scene rather than from a daytime picture - cost if wrong: one picture.
Task 2: complete (commits dbeb48d..a1cbb60, tests: npm run test:next → # duration_ms 86495.9999)
Task 3: Ruling: keycards are added to the pickups beside seedRewards, not inside it: the stash is shared with Act 1 and must show its keycard only at night - cost if wrong: none.
Task 3: Ruling: a fixed keycard stays taken for the run across a lost life (Run.spots) and Gold's minute stays on the clock when he comes back in 2-1; the plan named only Try again, but re-laid keycards would have paid twice - cost if wrong: a lost life is a little kinder than other levels.
Task 3: Ruling: the status shows on the HUD and every card while the level's world is 2-x (the plan's Task 16 and 15 need it on 2-2 and 2-4), though only 2-1 has Level.status - cost if wrong: none.
Task 3: Ruling: the stairs door stands at 6,400, not 6,300: at 6,300 its frame hung over the open shaft; a man at 6,300 is still in reach of it - cost if wrong: a door 100 px over.
Task 3: Ruling: seeded pickups keep off keycard spots; door cards wrap to lines rather than shrink; the keycard is drawn larger than the plan's "small" with a glow, since the night's tint made it unreadable - cost if wrong: looks only.
Task 3: complete (commits a1cbb60..86b365c, tests: npm run test:next → # duration_ms 81658.6674)
Task 4: Ruling: the auditor stands in front of the desk (x 900..1450), not inside it (the plan's x 1500 to 2200 is the desk's solid); the guard's patrol keeps to the mezzanine (7600..9600), not the stairs - cost if wrong: a spawn moves.
Task 4: Ruling: the ice water is tossed to land where he stands when it leaves her hand, on the coffee's arc, or it would land short at most distances and never be a threat - cost if wrong: a little more accurate than the coffee.
Task 4: Ruling: walking into the guard while he shines costs no pip (spec: flashlight "stuns like a slap" with no pip) - cost if wrong: he is less dangerous up close.
Task 4: Ruling: added three recolor masks to the cuts (office-1 #6b4f3a, server-2 #7a1f2b, bellhop-1 #4a2f6b); a recolor with no mask draws unchanged - cost if wrong: a garment tint.
Task 4: complete (commits 86b365c..5efe025, tests: npm run test:next → # duration_ms 75181.3057)
Task 5: Ruling: what Lifetime Titanium guy takes counts as score.split, not score.robbed (the plan's test asked robbed): the tally's "Robbed other plates" means his own robberies; split has its own tally line - cost if wrong: one line of a tally.
Task 5: Ruling: he takes the two most valuable dishes (the plan's test numbers require it, its prose says "two") and speaks "Let's split it evenly." as a speech bubble, not a thought: only Hammer's lines are thoughts - cost if wrong: a little meaner.
Task 5: Ruling: he can be bonked within 420 px, not the server's 300: at the server's reach he is only reachable after he has already taken the plate - cost if wrong: a little easier.
Task 5: Ruling: the lecture freezes him too, with no line of his own; the lounge has its own written lines for the guests (LECTURED, SLAPS, PAYBACKS by menu) - cost if wrong: lines to reword.
Task 5: Ruling: the lounge is a second BanquetView instance loaded on demand rather than one view swapping its contents - cost if wrong: memory while both are loaded.
Task 5: complete (commits 5efe025..788b24b, tests: npm run test:next → # duration_ms 75246.9988)
Task 6: Ruling (replaces P4): the tower's landings are each one wall to its stairwell (odd floors x 800 to the right wall, even floors the left wall to x 1600, floor 1 whole), a flight's foot by the wall (x 2600 or -200) rising back toward the middle over 1000 px, the top meeting the next landing's open end. He crosses every landing, turns at the wall, and climbs with clear air over him; the plan's V flights had him never touching a landing, and full-width landings put his head through the floor above for half of every flight. Chutes sit where the two sides overlap (800 to 1600), so a fall lands one floor down. All the plan's x's on floors are moved to match; its y's stand. Cost if wrong: level layout, nothing structural.
Task 6: Ruling: balconies are midway between floors (270 up), a hop from each: the plan's 60 px over the landing could not be hopped from to the next floor; none on floor 11, so the supervisor cannot be gone round - cost if wrong: a height to tune.
Task 6: Ruling: ice machines and hose cabinets stand on the floor by the walls: a crate hung the lobby's 435 up collides with the next floor in a 540 tower; hose cabinets are pepper crates (spec: "! crates"), not cases - cost if wrong: a pickup's kind.
Task 6: Ruling: the HUD gives the card the level's name (hud.name) while its panel reads the floor; TOWER.card is the spec's "The elevator stops at every floor. I don't." - cost if wrong: one line.
Task 6: Ruling: a cart's side hurts whichever way it is rolling, once in 1.2 s - cost if wrong: a little harder.
Task 6: complete (commits 788b24b..d7ec02d, tests: npm run test:next → # duration_ms 68049.1418)
Task 7: Ruling: the supervisor stands on floor 12 at x 1480 beside the top of the flight from floor 11 (flight 1600 to 2600), and the fourteenth floor's door is chained until she is down (spec calls her "the small boss"; without a lock the player walks past her) - cost if wrong: a door you can reach sooner.
Task 7: Ruling: "Do not disturb THIS." is Hammer's thought, not her line: it is his "Resort fee THIS." pattern and the spec lists it apart from her one line - cost if wrong: one bubble.
Task 7: Ruling: sliding under her carts is the slide alone (a sliding hero passes the cart on the slope); no rail pass was added to the flight - cost if wrong: looks, in Task 8.
Task 7: Ruling: the scripted climber may lose lives to her and comes back at the last clock, test asserts a life or more left and her beaten; the plan's "never a life lost" belonged to Task 6 before she existed - cost if wrong: none to the game.
Task 7: Ruling: a BossView draws her from the Diner figure class (the housekeeper's painting, navy, 1.05); her board moves to Task 8, which draws the tower behind her - cost if wrong: none.
Task 7: Note: the owner's four Codex batches landed during this task (guard, housekeeper, Titanium, lounge and sheet, tower walls and sheet); cut and committed with their manifest entries. Cuts: rigs are the TSA agent's, pose-locked; the dress and the jacket go with the torso to their hems.
Task 7: complete (commits d7ec02d..f2e82e0, tests: npm run test:next → # duration_ms 86623.2744)
Task 8: Ruling: the plan's "nine rows at scale 1" stack replaced by one row per floor at scale every/wall.floor, alternating, highest first so a lower floor's row covers the carpet painted under the one above — plain stacking would not line the painted floor lines up with the landings — cost if wrong: a re-tune of one pure function.
Task 8: Ruling: the carts' collider is 180 by 150, not 180 by 120 — the painted cart at 120 tall looked like a toy beside him and he must ride on its towels; 190 made the supervisor's carts unjumpable uphill at a run (clearance on the slope at his run speed is 186), so 150 is the most that keeps the jump fair — cost if wrong: carts slightly easier or harder, two numbers.
Task 8: Ruling: every floor gets a brass plate at x 1480 (plan named floors 1, 6 and 12 at x 700) — x 700 ran through the flights on even floors, and the HUD alone was thin as a marker of progress — cost if wrong: thirteen signs to drop.
Task 8: Ruling: a housekeeper knocked down lies flat on her back as a plank instead of sitting — her cut hangs the skirt from the torso to the hem so a sitting pose drove it through the floor — cost if wrong: one pose flag.
Task 8: Ruling: the vending nooks are drawn in code as a small machine tucked under the flight, since the sheet has no vending piece — cost if wrong: an extra sheet piece later.
Task 8: complete (commits f2e82e0..3702b8c, tests: npm run test:next → # duration_ms 87779.1971)
Task 9: Ruling: the trio's walking bass sounds on every second step, a quarter note, not on every step (plan) — at 0.19 s a step every-step is 316 notes a minute, a blur, and the brushes are already on the same grid — cost if wrong: one bars() edit.
Task 9: Ruling: I cannot listen, so "listen in the browser once each" became the loudness print through the game's own bus, all five within 6 dB of the banquet (lobby-night 4.0, lounge 3.3, tower 0.1, hallway 5.0, suite 1.8) and the music check; the owner hears them first — cost if wrong: a song retuned after the owner hears it.
Task 9: complete (commits 3702b8c..8f71c39, tests: npm run test:next → # duration_ms 89344.0273)
Final (2a): fixed a wet floor being a wall on foot — "a wet floor is one stumble, not a wall" RED→GREEN, suite 691/691; TOWER_TRAPS.slipAgain 1.6 s after a stumble.
Final (2a): fixed the tower's opening hint naming the lobby's crate on every even floor — "the hint on any floor says to climb", suite 691/691.
Final (2a): minor (deferred): a snot rocket as the supervisor's third hit gives no ride cart (only the flourish; the flight is walkable).
Final (2a): minor (deferred): the bellhops' keycards drop again after a lost life while the fixed ones stay taken (tiers still pay once; a player could reach a higher tier by losing a life).
Final (2a): minor (deferred): `let carts` in supervisor.ts is module state; only mover ids depend on it, no player-visible effect.
Final (2a): Ruling: losing a life after beating the supervisor brings her back and re-chains the door — the pig's as-built rule; the last clock is before her, so what a player gets is a re-fight, fair if tiring — cost if wrong: one flag on the run.
Final (2a): Ruling: the walker's balance (half the server's speed, the two best dishes) stands untuned until the owner plays it — cost if wrong: two numbers.
Task 10: complete (commits 972d191..3224cf3, tests: npm run test:next → # duration_ms 95037.8932)
Task 11: Ruling: the plan's `npm install --no-package-lock three@0.172.0 @types/three@0.172.0` is a trap and was NOT the way three got in: with the lockfile ignored npm re-resolved the whole tree, moved 161 folders aside, then failed in its own rollback (ERR_INVALID_ARG_TYPE), leaving 146 packages off the lock. Recovered: every retired folder put back, two emptied nested packages re-extracted from their tarballs (integrity checked against the lock), every lock entry verified on disk; only an unused wasm fallback differs. three and @types/three are hand-added to package.json at exact versions; package-lock.json untouched. Vercel's `npm install --omit=dev` resolves them. Cost if wrong: a fresh `npm install` by anyone updates the lockfile with three. Never run that command again here: the handoff says so.
Task 11: Ruling: the set runs along Blender +Y, which is three.js's -Z, so the chase camera has +X on the screen's right with no mirroring (the spike measured A left, D right this way); the plan's "+Z" would have inverted A and D; the sim's z stays positive and ThreeView negates it — cost if wrong: one sign.
Task 11: Ruling: the alcove's opening is z 29 to 31 and the room doors keep clear of it, the lobby's is 48 to 54 — cost if wrong: numbers in one script.
Task 11: Ruling: the 3D canvas goes UNDER the game's canvas, which clears transparent over it and keeps only its fx layer, rather than the plan's second canvas over a hidden stage: his thoughts, the comic words and the speech are Pixi, and hiding the stage would silence "Mobile key failed." and every other line; Pixi's context must be made able to do this, so it is created at background alpha 0.999 and set to 1 at once — cost if wrong: one context attribute on every level, negligible.
Task 11: Ruling: the hall's governor came forward from Task 14, and holds at 55 fps whatever the display's rate rather than the plan's 58: the laptop's headless browser drives a 120 Hz surface on the integrated card, where the display-relative rule would slide straight to low, and a one-frame stutter should not cost the ink — cost if wrong: a slightly lower floor on a weak card.
Task 11: Ruling: the chase camera follows 0.55 of his sidestep and aims 0.3 of it, the spike's values, not the plan's full `hero.lx` which would keep him dead centre and defeat "A steps him left on the screen" — cost if wrong: two numbers.
Task 11: Ruling: the hall runs 4 m on behind his start, or the chase camera stood outside the set at his first step — cost if wrong: none.
Task 11: complete (commits f75f562..25d9d42, tests: npm run test:next → # duration_ms 99774.1016)
Task 12: Ruling: the third cart comes from z 42, not z 41: the set has a door every 3 m, and a cart should come out of a door — cost if wrong: none.
Task 12: Ruling: the plan named no timings for the swinging doors: 9, 21, 36, 57, 69 m at 2 to 6 s, every 8 to 11 s, alternating sides; the nearest opens first — cost if wrong: numbers.
Task 12: Ruling: a bonked guest walks off as any staff member does, not to the nearest door by a new "away" act: the lobby's "leave" reads well down a hall and another act costs a pose — cost if wrong: guests walk off along the hall.
Task 12: Ruling: the left stick counts as up only past 0.6, not the 0.35 of its other ways: up jumps in every 2D level, and a player steering diagonally should not hop — cost if wrong: a slightly stiffer forward on a pad in the hall.
Task 12: Ruling: the keyDoor counts when a swing's active arc lands within 136 px, once a swing, whether or not it reaches a body; a stuck-out 1417 is the only thing there — cost if wrong: none.
Task 12: Ruling: the end wall is a solid at x 7900 so he stops at the door — cost if wrong: none.
Task 12: complete (commits 25d9d42..3851e6e, tests: npm run test:next → # duration_ms 100733.3241)
Task 13: Ruling (replaces plan decision 13): no atlases. His back and the cast are the rigs' own layers skinned on the CPU each frame into flat three.js meshes, at the painting's full size; his profile, when he is hit, smashes, snots or idles, is the real 2D figure on the game's canvas laid over the hall at the hall's size. So nothing is read back, no big atlas textures, every face rule the 2D figure has is kept for free — cost if wrong: a few milliseconds of skinning for four people; an atlas could still be built later.
Task 13: Ruling: the people draw after the ink pass and over the set in order, far to near, rather than in it with a mask: the ink never touches them, no mask pass, and the spike's "a wall clips his arm" cannot happen. A person is therefore never occluded by the set; the only thing in the hall they could stand behind is a door's leaf for a moment — cost if wrong: someone seen through an open door's leaf.
Task 13: Ruling: his back is cut as a cast body with a head layer that is the back of his head and neck, not the plan's head-in-the-torso; the art check proves no face is in it; stored at registry.hammer.back, not bodies.back (Costume-typed, used by the costume loop) — cost if wrong: none visible.
Task 13: Ruling: from behind a walk is legs shortening as they come through, not the plan's ±0.35 rad at the hips, which from behind is a scissor kick — cost if wrong: numbers in one file.
Task 13: Ruling: the test asserts his lowest sole on the floor and the mallet not jumping, not "both soles within 2 px": a walking man has one foot up — cost if wrong: none.
Task 13: Ruling: anyone or anything 0.8 m behind him is out of the picture: they would fill the screen between him and the camera — cost if wrong: a guest pops out of view as he passes.
Task 13: Ruling: an idle beat, the snot, the towel and the lecture show his profile too, not only hurt and super: his back cannot show them, and his face is the joke — cost if wrong: a cut to profile the owner may want fewer of.
Task 13: Ruling: boards and the start picture come from the running game by screenshot, not rendered into a Pixi board — cost if wrong: none.
Task 13: complete (commits 3851e6e..3688496, tests: npm run test:next → # duration_ms 98653.3917)
Task 14: Ruling: on the touch pad the hall's forward runs and there is no Run button: four arrows fit where five buttons wrapped into the hint — cost if wrong: a phone player cannot walk slowly down the hall.
Task 14: Ruling: the fps check asks 55 not 58, the floor the governor holds (Task 11's ruling) — cost if wrong: none.
Task 14: complete (commits 3688496..f1651ec, tests: npm run test:next → # duration_ms 99537.6379)
Task 15: Ruling: the suite's furniture stands where the render has it, one wall a room at 186 px to the meter, not the plan's numbers (it put the minibar on the balcony; the spec has it in the living room, and platforms must meet the painting) — cost if wrong: numbers in one file.
Task 15: Ruling: the renders are the rooms' walls until the owner's paintings land: the sync takes suite-N.png from incoming if it is there and the render otherwise, so the level looks like a place from the start — cost if wrong: a rendered look until the paintings come.
Task 15: Ruling: the camera keeps to the boss's room but is never so strict that Hammer goes off the screen: the plan's bounds would have lost him if he stayed behind — cost if wrong: the next room peeks in.
Task 15: Ruling: he cannot be hit for 2 s after moving rooms; at the plan's 0.45 s gap and no invulnerability a scripted fight ended in 20 s — cost if wrong: one number; the owner should feel the fight's length.
Task 15: Ruling: the minibar's can crate hangs over it at the lobby's height: at the plan's -140 it stopped him walking between rooms — cost if wrong: none.
Task 15: Ruling: the bed's bounce is a platform flag read in the shared body step; the plan's "boss uses the same rule" became his own bounce in his own step, since he is not a body — cost if wrong: none.
Task 15: Ruling: a test's cast:false game cannot bring bellhops, and strikes outside a step lose their events: those tests run a cast-on game and the real swing — cost if wrong: none (plan test bodies are the intent, Ruling P3).
Task 15: complete (commits f1651ec..76ebb6d, tests: npm run test:next → # duration_ms 101016.3571)
Task 16: complete (commits 76ebb6d..044f952, tests: npm run test:next → # duration_ms 100619.477)
Task 17: Ruling: no separate titanium board; the suite boards show his states and the cast board shows his painting — cost if wrong: one more board.
Task 17: Ruling: night-browser's Try again now reads the story caption first, since Task 16 put "11:40 pm. The same lobby." ahead of 2-1 — the check was behind the game, not the game wrong — cost if wrong: none.
Task 17: Ruling: the suite test's second grab stands him out of the bottles; a shove had put him in the bedroom and only the unclamped lunge reached him there, so the test was leaning on the bug — cost if wrong: none.
Task 17: Ruling: the plan's npm install --no-package-lock was not safe: it re-resolved the whole tree and failed in rollback; recovered by hand, three hand-added to package.json at an exact version, the trap written into the Phase 3 handoff — cost if wrong: a fresh npm install writes three into the lockfile, which is what should happen.
Final: fixed flung props stay hidden after the hall — journey-browser "everything the hall hid is drawn again" RED→GREEN, suite 716/716
Final: fixed Lifetime Titanium guy walks and lunges out of his room, so over the rail could happen at the bed — suite.check "he stays in his room" RED→GREEN, suite 716/716
Final: fixed a life lost after the grab keeps the cans he took — suite.check "a life lost while he owes him cans gives them back" RED→GREEN, suite 716/716
Final: fixed (re-graded up from minor) the 3D canvas resized every frame, 114 a second, throwing away its buffer and costing frames on real cards — hallway-browser "its canvas resized" RED→GREEN, suite 716/716
Final: minor (deferred): the game's canvas lays his profile with the 3D camera of the frame before: one frame's lag.
Final: minor (deferred): ThreeView is not destroyed by the game's stop; a rejected loadPeople leaves it alive and the hall flat; a context lost before onContextLost is assigned goes unnoticed.
Final: minor (deferred): the puddle slips him across the whole width of the hall though it is drawn from lx -0.4, 2.4 m wide.
Final: minor (deferred): a door's leaf and the wall it makes disagree by 0.2 m and half a second.
Final: minor (deferred): a dropped keycard in the suite pogoes off the bed.
Final: Ruling: &noart=1 in 3D has Hammer invisible — a dev flag no player can reach, it stands — cost if wrong: a developer sees an empty hall once.
Final: Ruling: balance numbers (key reach, grace, cart speeds, the two-second grace after moving rooms) stand until the owner plays them — they read fair to the scripted player and no one else has played — cost if wrong: numbers to change.
Final: Ruling: his back painting, the boards and the songs are the owner's eyes and ears; no session can judge them — cost if wrong: a repaint or a rewrite of a song.
Final: Ruling: after a lost context the hall stays flat for the session — the spec's fallback, and a player keeps playing — cost if wrong: a reload brings 3D back.
