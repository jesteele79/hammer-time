# SDD ledger — plan: docs/superpowers/plans/2026-11-05-story-phase-3.md

Method: superpowers:executing-plans inline, Opus 5.5. Spec: docs/superpowers/specs/2026-11-02-hammer-time-story-design.md. Baseline 2026-11-05: branch at 2a3c254.

## Pre-flight (shared interfaces)
| Tasks | Produced vs consumed | Found |
| 1 -> 3,5,10 | LevelId's three ids | consistent |
| 1 -> 9,14,15 | comingLabel("basel") = "Basel is coming" vs the stop's name "Basel, Tattoo week" | conflict: Ruling P1 |
| 2 -> 3 | Level.hall.set: FLIGHT.hall in the test carries it | consistent; hallway.check's deepEqual of HALLWAY.hall gains set |
| 3 -> 4 | HallState.boss/cart/curtain/sign from World.flight, World.boss | consistent |
| 3 test | x.world.boss.hurtT read on the purser; Purser's listed fields have no hurtT or awake (bossUp reads awake) | Ruling P2 |
| 3 -> 11,12 | Level.seat with "boss down": the conductor's door === 3 | consistent |
| 5 -> 6 | DoorSpec.ends, questCard at the door until the menu exists | consistent |
| 6 -> 8 | questMusic french -> SongId "french" (Task 8 adds the song): Task 6 cannot name an unknown SongId | Ruling P3 |
| 10 -> 11,12,13 | TRAIN's parts, the rooms' walls, Level.board | consistent |
| 11 -> 12 | g.world.boss.door = 3 in Task 11's seat test needs Task 12: the plan says assert with boss null until then | consistent |
| 11 -> 13 | Level.rooms[i].wall read by backdrop and venue | consistent |

Ruling P1: comingLabel uses the stop's name up to its first comma, so "Basel, Tattoo week" reads "Basel is coming" as the plan's test and the spec's note say — cost if wrong: one label.
Ruling P2: the purser carries hurtT and awake like the other bosses: the plan's own test reads hurtT and the HUD's bossUp reads awake — cost if wrong: none.
Ruling P3: Task 6's questMusic stays on the lounge-style theme until Task 8 adds the song id, as Task 3's and 5's level music stays on an existing song ("hallway", "lobby") until Task 8 — cost if wrong: none, Task 8 replaces it.
Task 1: Ruling: the puddle's slip is -1.6 to 0.8 m across, not the plan's -0.4 to 2.0: the plan read "drawn from lx -0.4, 2.4 m wide" as a left edge, but -0.4 is the patch's middle and the alcove leaks from the left; hall-people now draws from the level's numbers so they cannot disagree — cost if wrong: two numbers.
Task 1: Ruling: a bonked bellhop still comes back after a lost life, with no keycard (the plan's test), rather than leaving his spawn out (its prose): the lobby keeps its crew — cost if wrong: one more bellhop to get past.
Task 1: Ruling: run.spots only records a cast member's drop for a keycard: the day shift's carried cans and nuts come back with them after a lost life as they always did — cost if wrong: none.
Task 1: Ruling: a context lost once keeps every hall flat for the session (Phase 2's ruling kept); any other failed load is tried again by the next hall — cost if wrong: a reload brings 3D back.
Task 1: complete (commits 2a3c254..a63b205, tests: npm run test:next → # duration_ms 86632.5858)
Task 2: Ruling: SetName lives in src/sim/types.ts and sets.ts re-exports it: the sim's Level names a set, and the sim imports nothing from the renderer — cost if wrong: an import path.
Task 2: Ruling: SetSpec.behind clamps the chase camera so it never stands outside the set's back wall, the one use the plan's field needed — cost if wrong: none, it never trips in the hall.
Task 2: Ruling: the pools' strength is 2 × the set's lamp strength (the hall's 3.2 as before); the hall's pools hang at 2.6 m (the plan's number), 5 cm higher than before — cost if wrong: invisible.
Task 2: Ruling: `rowX` lives in src/sim/levels/flight.ts from this task on, since the flat cabin draws by it and Task 3's level joins it there — cost if wrong: none.
Task 2: complete (commits a63b205..25fcfce, tests: npm run test:next → # duration_ms 98457.4946)
Task 3: Ruling: the cabin's pace is half the 2D levels' (Level.hall.pace 0.5: 2 m/s, 3.9 m/s at W): at the plan's full speed the 40 m cabin takes 10 s, over before the cart's first 12 s and the turbulence's first 30 s; at half a walking player meets two carts and one turbulence, a sprinter gets through on nerve. The plan's test bounds halve with it — cost if wrong: one number, and the owner can feel it.
Task 3: Ruling: the bags lie in their lane 1.2+ s after they land (a hit until jumped or side-stepped): falling from 2 m at 6 m/s they were gone before a walking man reached them, so no bag could ever hit him — cost if wrong: a little harder.
Task 3: Ruling: the bin hangs at y -360, not -230: as a crate it is solid to the sim, and at -230 it stood across the aisle at his chest in every lane — cost if wrong: none.
Task 3: Ruling: the queue blocks its lane by a rule in stepQueue, not by a solid through restage: a solid has no lane and would wall the rows too — cost if wrong: none.
Task 3: Ruling: the queue's three are office-1, prof-1 and lunch-1: a student cannot be bonked by the mallet (he ducks until lectured), and the spec says bonk through; one hit each sends them off — cost if wrong: a person swapped.
Task 3: Ruling: attendants take the office role (the plan said server) with the wander trick, as the hall's guests do, because only the office fight reads wander; they keep to their stretch and lane, not following him across — cost if wrong: they were following him at 2 m/s and walled the aisle.
Task 3: Ruling: new trick "seated" for the eight in their seats: they do not move, bump or take a hit — cost if wrong: none.
Task 3: Ruling: legs reach 0.4 m each way (obstacle 0.6 m for seats): at walking pace a jump clears 1.8 m, and the window to time it would have been 0.2 s — cost if wrong: one number.
Task 3: Ruling: he is held on this side of the curtain while the purser stands, in every lane; no drinks cart once she has seen him — cost if wrong: none; the spec's "past her".
Task 3: Ruling: the tray's pickup lands 1.2 m ahead of him in his lane rather than under him, so it is seen and run through — cost if wrong: none.
Task 3: Ruling: `bossSay` is a new event, the conductor's and the purser's lines; Level.pickupThoughts carries "No ice. Of course." and "Pretzels. PRETZELS."; the plan's module const FLIGHT in sim/flight.ts is named CABIN, since the level is FLIGHT — cost if wrong: names.
Task 3: Ruling: test repairs keeping the assertions' meaning (P3 of Phase 2's kind): a cast-free CLEAR level for what one stretch does alone, since the plan's coordinates walked into the legs and queue; jump held, or the hop is short; a step before re-using "tray" as a done test; the flyer's loop runs through lost lives. Cost if wrong: none to the game.
Task 3: complete (commits 25fcfce..b78bef2, tests: npm run test:next → # duration_ms 95367.6281)
Task 4: Ruling: the drinks cart is a drawn steel trolley (the game's own texture), not the tower's housekeeping cart picture: a laundry cart would not read as drinks, and nothing painted is asked for it — cost if wrong: one texture; the plan's picture could still go in.
Task 4: Ruling: the reclined seats and the legs are drawn in the set by the game (red tilted seat backs, trousered shins): the plan listed them in the sim and nowhere in the drawing, and a player must see them — cost if wrong: looks only.
Task 4: Ruling: SetSpec gains lift 0.35 for the cabin (his jump drawn at about a third of the sim's height, or he leaves the top of the screen through a 2.2 m ceiling), pool and ambient (the plan's lamps alone burned the ceiling white) — cost if wrong: numbers.
Task 4: Ruling: PAINTING_OF lends the housekeeper's painting to the purser and the server's to the attendants until theirs are cut, or they would be invisible in 3D, where a missing painting stays out of the hall — cost if wrong: the stand-ins read as those people until the paintings land.
Task 4: Ruling: a Buc-ee's sticker on the bin at row 10 shows where to jump; the flat cabin draws the bags' landing shadows in their lanes — cost if wrong: looks only.
Task 4: Ruling: fps check waits 7 s for the governor as the hall's does; 74-77 fps at medium on the integrated card, the RTX 4070 still unmeasured headless — cost if wrong: none.
Task 4: complete (commits b78bef2..b9e7d6f, tests: npm run test:next → # duration_ms 99113.3962)
Task 5: Ruling: no ceiling solid under the first floor (the plan's -560 sat where he stands, and its stairs would have walked him into it): floors are one-way, so the spiral stairs rise through a hole in the floor above; the drawing shows the stairwell — cost if wrong: a look in Task 7.
Task 5: Ruling: the end wall of the ground floor is x 1536, y -470..0 (the plan's -540 stopped him at the back stair's top, his width over it); a back wall at x 0 and a far wall at x 10,760, or he walks off the level's ends — cost if wrong: numbers.
Task 5: Ruling: the terrace moved 400 px right (chairs 2,550 to 2,940, tables 2,600 and 2,800, the waiter's pass 2,520..3,300, the first sign and screen with it): at the plan's x the back stair ran over it. Its piece, the thoughts and the checkpoint follow — cost if wrong: numbers.
Task 5: Ruling: the lift keeps its rider through the spiral stairs' height (m.riding), or the floor under him snapped him off it at the crossing; the lift's floor is flush at its foot — cost if wrong: none.
Task 5: Ruling: the awning is at -380, not -400: a jump reaches 397 — cost if wrong: none.
Task 5: Ruling: the concierge takes no part ("seated" trick, no sit): she cannot be bonked past or bump him, and says "Bonjour, monsieur." every 4 s while he is near and hasn't answered — cost if wrong: one line's cadence.
Task 5: Ruling: Parisians are the office role with the wander trick (the plan said student): a student throws paper planes and says school lines; these amble, say "Oh là là." and bump him — cost if wrong: the street has less to fight; the waiter and scooters carry it.
Task 5: Ruling: a fixed pickup is once a run, like a keycard (the plan said both "once per life" and "recorded in spots") — cost if wrong: a baguette less.
Task 5: Ruling: the waiter is back about 8 s after the bonk, 5 s of it walking off — cost if wrong: one number.
Task 5: Ruling: test repairs: the stairs need the gate open; the jump held; the masher starts on the street, or the gate holds him for the clock's three lives; the walker's loop runs through lost lives — cost if wrong: none to the game.
Task 5: complete (commits b9e7d6f..d28f7e3, tests: npm run test:next → # duration_ms 100193.5185)
Task 6: Ruling: a bonk reaches the waiter whenever his hand or his tray is out, wherever he stands (the plan's "within reach", but its own test bonks him from anywhere, and he has to be bonkable in 0.6 s): he is at Hammer's elbow then — cost if wrong: a little easier.
Task 6: Ruling: the waiter's phases are idle, hand, away (the plan's "clear" is the instant between hand and idle) — cost if wrong: none.
Task 6: Ruling: the products and the to-go box stay on both older tables (the plan had coke on the banquet's alone, which would have taken Coke Zero off the lounge) and none on the French — cost if wrong: none; the older tables are as built.
Task 6: Ruling: a tiny Coke Zero thinks the street's line, "Thirty-three centiliters. That's a sample."; the carafe's and the bill's end the land early, so neither joins a combo; the cheese cart is the to-go box's job; the bill is sc.bill, "L'addition: -100" on the tally; a spill says PARDON! — cost if wrong: words.
Task 6: Ruling: the waiter's hand is a white glove and a ring drawn on the plate — the plan says "his hand on the rim", the scene must show which plate — cost if wrong: looks only.
Task 6: Ruling: the card's eyebrow at the door reads "One open in all of Paris" — cost if wrong: one line.
Task 6: Ruling: test repairs: the plan's q.hammer.x, d.settled, bonk(q, "server") and a pressed ↓ for a held door are the engine's real names; the score test adds a can's 200 for a tiny Coke Zero, which pays through addCans as every can does — cost if wrong: none.
Task 6: complete (commits d28f7e3..3cbae41, tests: npm run test:next → # duration_ms 101468.2095)
Task 7: Ruling: Paris's far plane pans at 1, not 0.25: at 0.25 the layout's walls (out to x 9,216) would never be walked past, and the painted lift and desk would slide off the sim's — cost if wrong: no parallax behind the street; one number.
Task 7: Ruling: the stacked hotel walls keep scale 1; the ground wall is cut at the floor above (540 of its 768), drawn over the first floor's wall, so a width of 1,536 stays one wall as the plan says; the tower's way of scaling would have made it 1,080 wide — cost if wrong: a look; the paintings' tops may lose a band.
Task 7: Ruling: the rope is on the gate's post, the stand-in walls are drawn by the game until paris-far-1 is in; the hints speak Paris's business in place of the lobby's "Up to the mezzanine" — cost if wrong: words.
Task 7: Ruling: the walker's Paris board draws through the shared venue kind; the "cast" board with the three new people waits on their paintings, since they wear lent paintings until then — cost if wrong: none.
Task 7: complete (commits 531f88b..262f910, tests: npm run test:next → # duration_ms 101341.2599)
Task 8: Ruling: no Song.hurryOn flag: hurryFor's forced argument from the seatbelt sign does the whole job, and a flag nothing reads is noise — cost if wrong: none.
Task 8: Ruling: drum rows run on their own length, so a waltz has twelve-step bars (the other songs' sixteen are untouched) — cost if wrong: none.
Task 8: Loudness through the game's bus, rms dBFS against the banquet's -53.8: flight -57.1 (3.3 under), paris -57.1 (3.3), french -56.6 (2.8), train -55.8 (2.0). All within 6 dB; no session has heard them; the owner hears them first.
Task 8: complete (commits 262f910..025c243, tests: npm run test:next → # duration_ms 100650.305)
Task 9: Ruling: the landing card ("Paris. 13 July...") came forward from Task 14: Task 9's own check asserts it, and 3-1 should end as the spec has it from the half's first play — cost if wrong: none.
Task 9: Ruling: Paris's tally line shows on its own card while the clock drains (mode "tally"), since a journey's first clear has no Clocked out card; it also shows on a replay's — cost if wrong: a card of three or four seconds.
Task 9: Ruling: Act 2's end goes straight on to 3-1's card, as Act 1's goes on to 2-1's (the journey's own rule), not home as the plan's list has it; 3-1's "next" on the strip is checked by a fresh page — cost if wrong: a player who wants home clicks home from the card.
Final (3a): fixed the flat cabin never drawing the drinks cart (an invisible cart shoved him under &flat=1, no WebGL2 or a lost context) — render.check "the flat cabin draws the drinks cart too" RED→GREEN, suite green.
Final (3a): minor (deferred): for the middle third of a lane change's 0.18 s he counts in both lanes for a bag or the cart (reach 0.6 m, lanes 0.9 m apart).
Final (3a): minor (deferred): holding A and tapping D steps him a further lane left when D comes up.
Final (3a): minor (deferred): in 3D a drinks cart launched before she woke is undrawn during her 1.5 s push, and still shoves.
Final (3a): minor (deferred): a respawn at row 30's clock lands him inside the first of the queue, who pops him back 105 px; the queue must be bonked again each life.
Final (3a): Ruling: the balance the reviewer declined to judge stands until the owner plays it: riding a scooter's top (the plan's "rideable"), the scooters' cadence (each every 9.2 s, two 4 s apart), the waiter picking by the aim line alone, the cabin's pace, the bags' life, the legs' reach — cost if wrong: numbers.
Task 9: complete (commits 025c243..05b7f58, tests: npm run test:next → # duration_ms 113056.2924)
Task 10: Ruling: boarding itself sets the coach 18 checkpoint (the plan's test reads it at the boarding step, before x 4100); an auto checkpoint has no punch, no clock drawn — cost if wrong: none.
Task 10: Ruling: the crowd's eighth is the nurse, not student-1 (a student cannot be bonked by the mallet); they patrol on either side of the barrier; a shove that would put him through a solid moves him nowhere; a jump clears them — cost if wrong: a person swapped.
Task 10: Ruling: the music hurries with the station's last twenty seconds, with the HUD's own hurry — cost if wrong: none.
Task 10: Ruling: Task 10's "the hint" is added though the plan does not list it: the lobby's hints would otherwise show in Gare de Lyon — cost if wrong: words.
Task 10: complete (commits 05b7f58..4138eb5, tests: npm run test:next → # duration_ms 110256.8216)
Task 11: Ruling: under the coaches' ceiling he tucks: his collider drops to the crouch's as his head would meet it, so a jump reaches a rack or clears the stroller (with the plan's ceiling at -404 and a 300 px man a jump stopped at 84 px, under everything the level asks him to reach); a new Stage.low, off the coaches nothing changes — cost if wrong: one rule in hero.ts.
Task 11: Ruling: the racks run 110 to 620 px of a coach, not the plan's 60 to 708: the door frame's lintel stopped him on the rack's end with no way off — cost if wrong: numbers.
Task 11: Ruling: the fridge is not a solid (at -140 it stood across the aisle at his chest); the mallet opens it — cost if wrong: none.
Task 11: Ruling: kids take the office role with the "rush" trick, not the student's: a student cannot be bonked by the mallet; a bonked kid is back after about 6 s, and a rushing kid may leave the family car's patrol to reach him — cost if wrong: a kid in the next coach for a moment.
Task 11: Ruling: the seated traveler is nothing to walk into until he is up; a bonked one walks off; the quiet car's two sit as "seated" and say "Shh!" through the game's step at most every 1.5 s — cost if wrong: words and a cadence.
Task 12: Ruling: the plan's tests lift him to y -300 to clear the punch, which is inside the coach ceiling (his tucked feet top out near -184) — his punch is a rule, not a band: it meets him when he is in reach, not crouched and under 90 px off the floor, so a duck, a jump or a step back all miss; the tests duck, jump and step away for real — cost if wrong: the punch feels unfair at some height, one number.
Task 12: Ruling: a punch that lands throws him back past the conductor's reach, and the conductor holds his door, so he walks back up; the plan's test expected him still in reach — the test walks — cost if wrong: none.
Task 12: Ruling: the doors won live on `run.bossDoors`, so a lost life keeps them and Try again's fresh run clears them — the plan named no home for it — cost if wrong: none.
Task 12: Ruling: the rider ducks where the plan's rider jumped: at the third door the stagger (0.45 s) ends before a jump lands, and a jump near a door can land on the last seat back, where the ceiling keeps him tucked and he cannot swing — a player steps off it; the driver stands 70 px from the door — cost if wrong: the driver alone.
Task 12: Ruling: the conductor draws in the bellhop's painting recolored navy until his own is cut — no painting landed — cost if wrong: none, the same stand-in rule as the others.
Task 11: complete (commits 4138eb5..efd95bb, tests: npm run test:next → # duration_ms 107383.5019)
Task 12: complete (commits 66a1227..efd95bb, tests: npm run test:next → # duration_ms 107734.3012)
Task 13: Ruling: the plan's test reads `roomWallOf(TRAIN, 12, ...)` as the bistro, whose room is index 10 (hall, platform, then coach 18 at 2) — the test reads 10 — cost if wrong: none.
Task 13: Ruling: the racks are painted at 1.09 m, not the plan's 1.7 m, and the windows above them at 1.28 to 2.0 m, not 1.0 to 1.6 m: the level's rack is 170 px up at 156 px to the meter and must stay there for him to fit crouched under the ceiling, and he has to stand on what is painted — cost if wrong: the rack looks low; it is the render's numbers and the level's.
Task 13: Ruling: seat backs in every coach but the bistro, 68 and not the plan's 60: the family and bike cars show the standard coach's painted seats, and a painted seat he falls through reads as a bug; the racks already went over the stroller and kids, so the route changes little — cost if wrong: those two cars are a little easier.
Task 13: Ruling: the bistro's render has no racks and prompt 5 and batch item 11 now say so: the level has none there — cost if wrong: none.
Task 13: Ruling: the countryside is clipped by hand to each pane, not masked as planned: the same picture, no mask per window — cost if wrong: none.
Task 13: Ruling: the coaches play at zoom 1.3, unplanned: at 1.0 the 404 px coach fills under half the frame — cost if wrong: he sees 25 percent less ahead; one number.
Task 13: Ruling: the train's drawn pieces live in venue-train.ts, not props.ts, with the view that uses them; the check samples a screenshot at `__next.trainWindow()` where the plan had `__next.pixel`, which does not exist — cost if wrong: none.
Task 13: Ruling: the board reads "14:02 Basel SBB" from the start, its platform blank until "Voie 23" lights, closer to the spec's "its platform blank" than the plan's dark row — cost if wrong: none.
Task 13: Ruling: a recolor with no mask in its painting's cut is silently ignored, so 3a's attendants, purser, seated travelers and second Parisian and 3b's stand-ins wore their borrowed paintings' colors; each now has its mask and the art check covers the Flight, Paris and the Train — cost if wrong: none, they go when the paintings land.
Task 13: complete (commits efd95bb..6ae251a, tests: npm run test:next → # duration_ms 112586.6719)
Task 14: Ruling: the journey's Act 3 run starts from home by a fresh page, not from Act 2's Continue, which as built goes on to 3-1's card (Task 9's ruling); 3-1's timed card is read but not resized, since it lifts before the three sizes are through, and the two captions, which wait, are — cost if wrong: none.
Task 14: Ruling: the plan's save at the end of 3-3 has `run: null`, but Basel is not an act's first stop, so the run goes on with him as every other stop's does; the save keeps it — cost if wrong: none, Phase 4 starts Basel with his score.
Task 14: Ruling: found while reading the save: a run saved at the 14:02's card was thrown away on reload, its station clock a number where the parser wanted a string or nothing; and the doors won would have followed him in the run; both fixed with their tests — cost if wrong: none.
Task 14: complete (commits 6ae251a..a50eea7, tests: npm run test:next → # duration_ms 114790.7413)
Task 15: Ruling: the walls that landed mid-build (the station's two and the three coaches) go in as they came, the painted clock's center measured at 470, 229, radius 90 into its cut; the panes and floors matched the renders within a pixel or two — cost if wrong: the hands a few px off the face.
Task 15: Ruling: the camera's bounds are the rooms' own, 0 to the end of coach 1: at -400 the level opened with 400 px of nothing left of the hall — cost if wrong: none.
Final (3b): Ruling: the reviewer's Minor 'he vanishes on screen at the end of a retreat' re-graded Important and fixed: every player sees it three times a fight, 400 px away in plain sight; he fades over his walk's last 0.3 s — cost if wrong: none.
Final (3b): Ruling: a knockdown in the 1.45 s after the ninth hit keeps the win but not its 1,000 points, since the points come with the end of his walk; the only things that can do it near coach 2's door are the level's clock and heat — cost if wrong: 1,000 points in a rare corner.
Final (3b): Ruling: declined to judge, stands as is: partial hits at a door reset on a lost life (the game's rule that a fight restarts at full health); the station pays the spec's 50 a second however early he boards (a driver banks about 5,650); a lecture locks him while the summoned conductor arrives (the spec's own trap); the level's clock refills on each life on board (the standing respawn rule) — cost if wrong: numbers.
Final (3b): fixed Hammer down from the station's clock then Try again or Home showed 'The train left' on the next card — train.check 'Hammer down from the station's clock, then Try again' RED→GREEN, suite green.
Final (3b): fixed the stroller reaching 8 px through the second door, an invisible pip at a boss door — train.check 'the stroller never reaches through the second door's wall' RED→GREEN, suite green.
Final (3b): fixed a knockdown just after the third hit losing the door he saw him leave: the door is won with the third hit — train.check 'a knockdown just after the third hit keeps the door' RED→GREEN, suite green.
Final (3b): fixed he popped off the screen at the end of a retreat — render.check 'the conductor fades out at the end of his retreat' RED→GREEN, suite green.
Final (3b): minor (deferred): a summoned conductor follows him anywhere, through every wall, even back down the platform; cosmetic, only by walking back 4,000 px.
Final (3b): minor (deferred): the countryside's phase keys on where he stands: stepping back left of the tunnel's mouth turns the hills back into fields.
Task 15: Ruling: the browser checks' 55 fps floor takes an FPS_FLOOR from the environment: the laptop went on battery in its Silent plan mid-run and held every screen near 43, the home screen too; the final production runs were on mains at the default floor (cabin 74 to 79 at medium, train 116 to 120, journey and Paris pass) — cost if wrong: none, the default is unchanged.
Final (3b): review by a fresh reviewer on the most capable model over 05b7f58..138b3ba: ready with fixes; three Important and one re-graded, all fixed above; two minors deferred.
