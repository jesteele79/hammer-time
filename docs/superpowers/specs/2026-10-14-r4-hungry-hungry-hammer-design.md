# R4 Hungry Hungry Hammer: design

Design addendum, 2026-10-14, to `2026-10-10-hammer-time-rebuild-design.md` (the binding spec). It fills in §16's R4
("Hungry Hungry Hammer (§11), the BUFFET door, the Side quests row") and the old engine's deletion that the R3 design
(`2026-10-13-r3-the-run-design.md` §1.4) moved here. Agreed with the owner in the R4 brainstorm the same day. Where this
file and the main spec's §11 differ, this file wins for R4. The face rule (main spec §2.1), the cast's rules (R2b design
§3, §4, §8) and the shell's rules (main spec §10) apply unchanged.

## 1. The decisions

Decisions the owner made in the brainstorm:

1. **All the art now, with Codex.** The ballroom, the banquet table, the food sheet and the nurse are painted while R4
   is built (§10); nothing the owner sees in the play-test is a stand-in. Exact prompts go in
   `art/outgoing/batch-r4-codex.txt` once this design is approved.
2. **The belly-flop dive.** Hammer throws himself onto the cloth chest-first and slides out along it, far hand ahead,
   head up and level with the chomp face, legs trailing, then scrambles back to his spot. The rivals dive the same way.
3. **The scene, the moves, the table, the door and the card** as presented (§2 to §9), including standing at the table,
   aiming with ← and →, grade lines set by test rounds with a fresh best, and the lobby's clock stopped during the
   round.
4. **The order of work** (§12): one plan; the owner's play-test; then the old game's deletion and the merge into
   `main`, each only on the owner's yes at the time.
5. **Bigger people at the banquet** (after the paintings came in, the same day). Codex drew the room, the table and the
   food from a lower camera than asked (the table's top is 0.37 as deep as it is wide, not 0.47), and the painted
   cloth hangs about 370 px at the table's 1500 width: taller than Hammer at his shift size. Everyone at the banquet is
   drawn at twice their shift size, so the tabletop reaches their belly as painted, rather than the cloth being
   squashed (§2).

Decisions I took for the owner (report these):

1. The banquet is a mode of the new Game with its own sim (`src/sim/quests/hungry/`) and scene
   (`src/render/quests/hungry-scene.ts`), as the main spec's §4 laid out; the shift waits, frozen, behind it. Not a
   platform level and not a wrapper round the old game's banquet.
2. Everyone **stands** at the table (§11.1 said "sits"): every body keeps the poses it has, the dive launches from
   standing, and a scrum round a buffet reads better on its feet. The far side's two stand behind the table, which
   hides them below the waist.
3. **← and → aim** (§11.3 said ↑ and ↓, but ↑ is a jump key and ↓ is duck): ← swings his line toward the far side, →
   toward the near side, the way he would steer from where he stands. The line stays where it is left. The touch
   pad's ← and → do the same, so the pad keeps its ten buttons.
4. The ±30 degrees of the aim are measured on screen (about ±57 degrees on the table top as painted), so every rival's
   plate is inside the swing.
5. The nut bag eaten at the banquet fills the smash (a banquet-size bag; once a shift).
6. The grade lines start at the shipped 1200, 2000 and 3000 and move, in proportion, until scripted rounds land where
   §6 says. The best starts fresh (`hammer-time-best-banquet`); a round from the BUFFET door and a practice round
   both count toward it.
7. Everything at the table draws behind Hammer: the rivals (standing or diving), the server, the food on the cloth and
   in flight, the chute, the dessert cart, the suitcase and the paper.
8. The server is `server-2` recolored, in a black banquet vest.
9. The chute, the dessert cart, the suitcase, the paper planes, the plates and the tray are drawn in code, like the
   luggage carts.
10. The lobby's music plays on through the round (per-venue music stays in R8).
11. The student stands at the far side's left, the bellhop at its right, the nurse at the right end facing Hammer.
12. `/?quest=hungry` opens the banquet's practice straight away, so the shipped game's old link
    (`/?classic=1&quest=hungry`) lands on the new banquet once the old game is gone.

## 2. The scene

- **The room.** Behind the BUFFET door is the hotel ballroom: the owner's painting of the room seen from the camera's
  angle (the back wall across the top with red drapes, gold swags and a buffet against it; the patterned carpet
  filling the rest; the middle empty for the table). Warm ambient, the chandelier's glow on the light layer. The camera
  holds still.
- **The table.** Round, seen from above at an angle: on screen an oval 1500 by about 555 world px (the owner's painted
  table's own proportion, 0.37; §11.1 had 1500 by 700), a white cloth with a gold rim, a lazy Susan of silver chafing
  dishes in the middle. Its top stands about 370 px above the floor, as its painted cloth hangs. The sim works on the
  table top as a circle of radius 750 (x to the right, y toward the far side, the center at 0, 0) and the renderer
  squashes y by 0.37.
- **Everyone is drawn at twice their shift size** (Hammer 680 px tall), so the tabletop reaches their belly (§1, owner
  decision 5). The rules' distances (the reach, the zones) are on the table top and do not change with it.
- **Where everyone is** (table coordinates):

| Who | Stands | Plate | Faces |
|---|---|---|---|
| Hammer (banquet bib) | past the left rim, at (-860, 0) | (-590, 0) | right |
| Student | behind the far rim, left | (-230, 400) | right |
| Bellhop | behind the far rim, right | (230, 400) | left |
| Nurse | past the right rim, at (860, 0) | (570, 0) | left |

  Nobody stands on the near side, so everyone is seen from the side. The nurse's plate is 1160 from Hammer's, just
  inside a full charge (1180); the student's is 538 away (out of a first tap's reach, inside a grown tap's); the
  bellhop's 912.
- **The chute** hangs from above over the middle, its mouth high enough that his head passes under it on a dive.
- **The server** walks behind the far side, outside the rim, from the right end to Hammer's corner and back (about 18 s
  a round trip, the shipped pace), close enough at his corner for the bonk (§3).
- **The dessert cart** rolls in from the right at 42 s and crashes into the rim.
- **Depth:** the far side's eaters stand behind the table; anyone diving lies on the cloth over the food; Hammer draws
  in front of everything at the table (§1, decision 7). Words go through the face-safe layout; the cards sit on the
  right half, away from his face.
- **Fitting the screen:** the whole table, all four eaters and the chute are in view at 1280 by 800, 390 by 844 and 844
  by 390, the far side's heads clear of the top bar (the table sits a little low and the view is pulled back as
  needed).

As built in R4 (2026-10-14): as above. The ballroom is drawn at twice its painted size (a 1500-wide table across
750 of its px, the table's floor on the carpet's middle row of medallions), its edges stretched outward so a phone's
taller or wider view still sees the room; the chandelier glows over the table. The dishes are drawn half again as wide
as their discs on the cloth (the products a little narrower), so beside eaters at twice their size they read as plates,
crowded ones overlapping a little. The chute is a banded steel duct flaring at its mouth, the dessert cart a brass
trolley with linen shelves and cakes; a tray's or the cart's dishes fall onto their own spot, the chute's from its
mouth. The server wears server-2's own painted black vest. Standing diners stand on their soles like the shift's cast.

## 3. Hammer's moves

- **The dive.** Tap Space, F or ↑ (or the pad's Jump): he belly-flops out along his line, the hand travelling 520 px in
  0.14 s, holding 0.04 s, sliding back in 0.10 s. Everything his hand's 110 px wide sweep crosses on the way out is
  chomped: it flies back low over the cloth to his plate (0.25 s) and scores when it lands; nothing past the hand's
  farthest point is touched. A dive can start every 0.3 s; holding the key never repeats one.
- **Reach grows** 10 px for every dish he eats, from 520 to 760 (§11.5).
- **The charge.** A press held past 0.12 s charges, the reach growing linearly from his tap reach to 1180 at 0.5 s,
  with a marker on the cloth where he will stop. A charged dive slides at the tap's speed, so a full-table dive takes
  about a third of a second each way. It chomps the food on its way, and if it ends on a rival's plate it robs the top
  dish: its value plus 100 and "YOINK!" (a robbed special pays out as if eaten; a robbed check still costs 400).
- **Aim.** ← and → swing his line up to 30 degrees either way on screen (§1, decision 3), drawn faintly while a
  direction is held or the dive charges; it stays where it is left.
- **The clash.** His hand and a rival's within 110 px of each other while both are out (within 0.1 s): both bounce
  back empty and the food within 150 px of the meeting point scatters ("CLASH!", sparks).
- **The bonk.** H: the mallet smacks the rim in front of him (the swing, its strike on the rim). Food within 300 px of
  his plate jumps away toward the middle; a rival whose hand is in that zone is stunned 2 s; the server in it drops her
  tray (four dishes from the current course, at his end) and leaves for 15 s; a suitcase in it is slammed off; paper
  in it is swatted.
- **The duck.** ↓: under the table edge; paper sails over. No dive or bonk while ducked or slapped.
- **Pause.** P or Escape: the "On break" card, listing the banquet's keys.
- **His faces:** chomp at the grab, smug on a rob, hurt when slapped or hit by paper.

As built in R4 (2026-10-14): as above, with the plan's head lift: his body tips 40 degrees over the cloth and his head
lifts back as much, level at every stretch; the coil rears him back on bent knees. His shadow shows only while he stands
(over the cloth it fell on the cloth's drop).

## 4. The rivals and the server

- **Reactions:** the student 0.55 s, the bellhop 0.40 s, the nurse 0.28 s. When food comes to rest within 400 px of a
  rival's plate, after the reaction it dives at it (the same belly-flop, the same speeds and sweep), mashing a burst of
  2 to 4 dives, each at the nearest food. A rival dives only along lines within 50 degrees on screen of the way it
  faces (a body diving straight down the screen would read as falling).
- **Anger:** +1 each time Hammer robs that rival, −1 after every 8 s without one; the reaction shortens by a fifth a
  level (`base × 0.8^anger`, never under 0.15 s).
- **Paybacks** when robbed:
  - The student winds up 0.6 s ("Heads up!") and throws a paper plane along the table at Hammer. Ducked, it passes
    over; swatted, it is gone; it hits him only where he is (mid-dive, it misses); a hit costs 150 ("Paper to the
    face").
  - The bellhop slides a suitcase onto the cloth 250 px out along Hammer's line for 4 s ("Your bag, sir."): his dives
    stop at it and food bounces off it.
  - The nurse stays angry: while she is, her zone (300 px round her plate) shows as a faint red ring, and a hand that
    enters it is slapped ("Sanitize!"): nothing eaten, a 1 s stun, his thought "I've HAD my shots."
- Rivals' plates are stacks Hammer can rob; rivals never take from his.
- **The server** clears food that has come to rest within 150 px of the rim beside her ("Are we still working on
  that?", at most every 6 s); bonked at his corner she drops her tray and leaves for 15 s, then comes back from the
  right end.

As built in R4 (2026-10-14): as above, with the plan's decision: a rival dives along lines within 50 degrees of level
on screen either way and turns to face it, so the student can raid the food near Hammer's end.

## 5. The food

- **Discs** of radius 26 to 34 by kind on the table top: velocity, friction 2.4/s, elastic collisions between discs
  (restitution 0.6), a bounce off the rim (0.7) and off a suitcase. A dump drops food from the chute onto the middle
  with a random outward speed of 300 to 700 px/s.
- **Values** as the shipped game (expansion spec Appendix B): shrimp cocktail 80, bread basket 50, deviled eggs 60,
  kolache 70, Beaver Nuggets 90; ribeye 300, chicken fried steak 220, brisket plate 260, shrimp and grits 200, club
  sandwich 150; pie 180, cheesecake 200, banana pudding 160.
- **The schedule** (§11.2): 24 appetizers at 0 s, 12 at 10 s and 12 at 20 s; 16 entrees at 25 s, 10 at 35 s; 14
  desserts at 42 s (the dessert cart's crash spills them from the right rim), 10 at 50 s; the last 8 s a frenzy, three
  dishes a second from all three courses.
- **Specials**, once each, at random times between 5 and 50 s: Coke Zero 100 (a can), nuts 100 (the smash), Buc-ee's
  300 (the shield), hot sauce 150 (the pepper), the to-go box (the next five grabs double) and the check (−400, "YOU
  picked up the bill?"). Coke Zero, the nuts and Buc-ee's are the products' pictures the shift uses; the rest come from
  the food sheet.

As built in R4 (2026-10-14): as above; a wave pours from the chute a dish every 0.03 s; the cart rolls in along the near
side and spills at the rim between the near side and the nurse's end.

## 6. Scoring and grades

- A dish scores its value when it lands on his plate, doubled while the to-go box lasts, plus 100 for a rob. Grabs less
  than 1.2 s apart build a combo: double from the fifth, triple from the tenth (the bonus counted apart, as shipped).
  The check costs 400, a paper hit 150. The HUD counts the chomps.
- **Grades:** COMPED, GOOD TIPPER, SPLIT THE CHECK, WATER ONLY. The lines start at 3000, 2000 and 1200 and are scaled
  together until, over ten seeded rounds each: a player who never presses lands WATER ONLY; a steady player (aims at
  and taps the nearest resting food every 0.5 s, never charges or bonks) has a median between SPLIT THE CHECK and GOOD
  TIPPER; a sharp player (dives into each fresh dump, robs a plate topped by an entree with a charged dive, bonks the
  server at his corner) has a median of COMPED. A full belly is GOOD TIPPER or better.
- **The tally:** the grade, the score and the best, and the lines: plate total and grabs, the combo bonus and the best
  combo, plates robbed, paper to the face, the specials, the check, and "Full belly" when it applies.

As built in R4 (2026-10-14): the scripted rounds set the scale at 8.25 (over ten seeds: standing still 0, steady tapping a
median of 16590, sharp play 26150): COMPED from 24750, GOOD TIPPER from 16500, SPLIT THE CHECK from 9900. A sweep often
takes several dishes and the chain passes ten inside a dive, so most grabs triple: a round scores about eight times the
shipped one, and that score comes home onto the shift's. The owner kept it whole (2026-10-15): a steady round adds about a
sixth of a fast shift's 110,000, a sharp one a quarter.

Since 2026-10-17 (the owner: he looked to grab air), the hand's 110 px sweep is measured on screen, as the hands and the
dishes are drawn, not on the cloth's squashed depth: along a straight dive it had reached only about 30 px either side of
his line on screen while his hand, drawn at twice his size, covered dishes well outside that. The scripted rounds then
scored a fifth more (steady 19890, sharp 31510) and set the scale at 9.95: COMPED from 29850, GOOD TIPPER from 19900,
SPLIT THE CHECK from 11940.

## 7. The BUFFET door

- The lobby's BUFFET door (4600) opens with ↓ on the floor in front of it, as the STAFF ONLY door does: not in the air,
  not mid-move, not knocked down. The card ("Side quest / Hungry Hungry Hammer / The Banquet") then the round.
- The shift waits: the lobby is not stepped, its clock is stopped, the shield, heat and pepper hold.
- Continue on the tally (Enter, Space or the button) puts him on the lobby floor in front of the door, standing, with
  0.6 s of grace; the key that closed the tally does not jump, swing or fire.
- **What he brings back:** the round's score onto the shift's; a can for the Coke Zero; the smash full for the nuts;
  Buc-ee's starts his 10 s shield as he walks out; hot sauce or a full belly gives him the pepper with full patience;
  no lives.
- Once a shift: the door then shows a THANK YOU card and stays shut, through lost lives; a new shift opens it again.
- The restaurant's PRIVATE DINING door stays closed ("Opens later") for R8's tables.

As built in R4 (2026-10-14): as above. Thoughts and speech are cleared going through the door either way, so nothing
said at the table hangs over him in the lobby. The lobby's server patrols in front of the BUFFET door, so coming back
he may meet her straight away, after his 0.6 s of grace.

## 8. Practice from the start screen

- The Side quests card plays the banquet as practice on the new start screen (no page change), from the same card.
  Its picture is rendered by the game (`public/start/banquet.webp`, by `scripts/start-art.mjs`); its words "Hungry
  Hungry Hammer / Banquet table · best 000000".
- A practice round never touches a shift. Its tally offers Play again and Start screen, like pig practice.
- `/?quest=hungry` opens the practice round directly (§1, decision 12).

As built in R4 (2026-10-14): as above; the card's picture sits beside its words, smaller on an upright phone so the
start screen still fits.

## 9. The screen during the round

- **Top bar:** the round's score, its 60 s clock, "Hungry Hungry Hammer · The Banquet" in the venue's place, pause and
  mute.
- **Panel:** his reach (base to 1180, the charge showing as it builds) and his combo (the count and the multiplier) in
  place of patience, heat, snot and smash.
- **Hint line,** as shipped: "Paper incoming · ↓ ducks, H swats", "Suitcase on the table · H clears it", "Slapped ·
  wait a second", "To-go box · next 5 grabs double", "The nurse is angry · keep your hand out of her zone", otherwise
  "Tap Space to dive · hold to reach farther and rob a plate · ← → aim · H bonks the server".
- **Lines:** Hammer's are thoughts ("I didn't order this. I'm eating it anyway." on the first dump, "Are you going to
  finish that?" when a rival takes food, "That's MINE now." on a rob, "Room charge." on a special, "Is Pepsi okay? NO."
  on bonking the server, "Bring the cart back." at the dessert cart, "YOU picked up the bill?", "I've HAD my shots."),
  each once a round; the rivals and the server speak in speech bubbles.
- **Sound:** the shipped cues: `ding` on a dump, `whoosh` on a dive, `chomp` on a chomp, `slide` when a rival or the
  server takes food, `bonk` or `thud` on the bonk, `boom` on the cart, `splat` on a paper hit; a new `clash`.
- The touch pad keeps its ten buttons: ← → aim, Jump dives (hold to charge), H bonks, ↓ ducks. A gamepad's stick
  aims, A dives, X bonks.
- Every card and bar fits 1280 by 800, 390 by 844 and 844 by 390 with no horizontal overflow.

As built in R4 (2026-10-14): as above. The combo row reads in the HUD's light text, gold once it doubles; on the touch
pad the snot, lecture and smash lights stay off at the banquet; the round's best is kept when its tally's result reaches
the HUD.

## 10. The art

Painted by the owner with Codex (prompts in `art/outgoing/batch-r4-codex.txt`):

As painted (2026-10-14): all four are in. The table and the food sheet share one camera (a plate or the tabletop about
0.37 as deep as it is wide); the ballroom's carpet is a little flatter, which a backdrop can carry. The game takes the
table's proportion and its cloth's drop from its painting (§2).

1. `art/incoming/backdrops/ballroom.png`: the ballroom from the camera's raised angle, the back wall across the top
   (red drapes, gold swags, a buffet with chafing dishes against it), the patterned carpet filling the rest, the middle
   empty, no people, no text. Its cut (`art/cuts/ballroom.json`) records where the table's center stands on it.
2. `art/incoming/props/banquet-table.png`: the round table from the same angle, on green: white cloth to the floor,
   gold trim at the rim, a lazy Susan of silver chafing dishes in the middle, the top otherwise empty. Its cut records
   the top's oval (center and radii), which the scene scales to the sim's 1500 by 555.
3. `art/incoming/props/food-sheet.png`: the sixteen dishes of `art/ART-REQUEST.md` §7, from the same angle, on green,
   cut at sync into sixteen sprites.
4. `art/incoming/cast/nurse.png`: pose-locked like the cast (teal scrubs, a badge reel, clogs, hair in a bun), accepted
   with `art-pose.mjs`, cut by `art/cuts/cast-nurse.json` like the others; the hospital (R7) reuses her.

**Drawn in code:** the chute, the dessert cart, the suitcase, the paper planes, the plates and the rivals' stacks, the
server's tray, the THANK YOU card on the door.

**The poses** (rig clips over the existing skeletons): `dive` (the launch, the flat slide with the far hand ahead and
the head level, the scramble back; its angle follows the line on screen), `coil` (the charge), the bonk (the swing's
strike on the rim) and the duck (the crouch) for Hammer; `dive` and a stunned beat for the cast. His head stays within
8 degrees of level and nothing crosses his face box at any reach or line angle.

**Fallbacks** (and `&noart=1`): without the ballroom, a plain warm wall and a drawn carpet; without the table, a drawn
oval table; without the food sheet, drawn plates with three-letter tags (the shipped look); without the nurse, the
cast's drawn stand-in in scrubs colors. The sync warns and goes on; a bad painting never stops it.

As built in R4 (2026-10-14): the food sheet's rows sit off an even grid (its banana pudding and the check reach above
the even line), so the sync finds its dishes by the green between them. The nurse is cut like the cast (five layers and
her head, her joints on her painting); the table's top oval lies on the gold rim (944 by 348 painted px, 0.37 as deep as
wide).

## 11. The old game's deletion (only on the owner's yes at the time)

- **Goes:** the old engine and what only it uses: `src/game/engine.ts`, `rig.ts`, `hero.ts`, `scenery.ts`,
  `sprites.ts`, `thought.ts`, `layout.ts`, `people.ts`, `levels.ts`, `constants.ts`, `combat.ts` and `quests/`;
  `src/components/kiln-hop.tsx` and its styles; the `classic` flag. Its checks (`gameplay.check.mjs` and
  `hungry.check.mjs`, so `test:game`; `game-harness.mjs`, `game-browser-check.mjs`, `start-screen`, `props`,
  `quest-browser`, `pig-boss`, `surroundings`, `voice-browser`) are each ported to the new game or retired by name in
  the plan, never dropped silently (main spec §4).
- **Stays:** `src/game/audio.ts`, `taunts.ts` and `lines.ts` (Appendix A), with anything they import from the deleted
  files moved beside them; every file under `public/` (the owner's photos and pictures; `public/hero-*.png` untouched
  but unused) and the recordings.
- `/?classic=1` then opens the new game's start screen; `src/routeTree.gen.ts` keeps its hash
  (`dceedffdc12c32138e81bb63787cac7ae5d97fcd`).
- `README.md` drops the shipped game's sections; "The rebuild" becomes the game's own description.

As built in R4 (2026-10-15, the owner's yes): as above, every old check ported or retired by name in the plan's ledger.
The voice checks moved to `scripts/voice.check.mjs` (in `test:next`) and `voice-browser.check.mjs` was rewritten for
the game: each of the six recordings heard playing with its caption. The shipped caption rules, which the rebuild had
lost (main spec §13), came back with it: a thought waits while a recording's caption is up, and a break or mute stops
the recording and takes its caption. New checks: every crate in every level opens to a head bump, a lost life keeps
the score, a robbery sets off its payback, the start screen's own controls; the slam's squat now keeps both shoes on
the floor (its legs reach the floor by IK). Not ported: ducking a paper plane, which the shift's planes never allowed
(they are below a crouched head by the time they reach him); left to the owner.

## 12. Order of work and checks

One plan, executed inline with TDD and the ledger, one fresh reviewer on the most capable model at the end:

1. The cheap deferred minors: the start screen's keyboard (the look's key handler skips the title mode, so Space and
   the arrows reach Clock in and the quality list), Auto quality able to step down again after a fixed tier, a bad
   `pig-stuffing.png` losing only the tufts, `next-start.check.mjs` counting runs begun, the canvas idle under the
   opaque start screen.
2. The banquet's rules (`src/sim/quests/hungry/`), test-first.
3. The new poses, with face clearance at every reach and line angle.
4. The paintings cut and synced as they arrive (drawn stand-ins until then).
5. The scene, the HUD and the cards.
6. The BUFFET door and what he brings back.
7. The Side quests card, its picture and `/?quest=hungry`.
8. The browser checks and the boards.
9. The owner's play-test (and the R3b question: should the top plush shelf be a refuge from the pig's charge?).
10. The old game's deletion, on the owner's yes.
11. The merge into `main`, on the owner's yes.

**Checks** (main spec §11.6 and §15, extended):
- **Sim** (`node:test`): discs stay inside the rim; a dump scatters; a tap's sweep chomps what it crosses and nothing
  past the hand; one dive per 0.3 s and a held key never repeats; a charged dive reaches a plate a tap cannot, and robs
  it; the clash; the bonk's scatter, stun, tray, suitcase and swat; reactions, bursts, the facing cone and anger;
  each payback (paper ducked, swatted, missed mid-dive, landing; the suitcase stopping dives and food; the slap); the
  server's busing; the schedule, the cart, the frenzy, the specials once each; scoring (combo, to-go, check, rob,
  paper); the round's end at 60 s with a result; the grade lines and the three scripted players; the payout; the door
  (floor only, once a shift, the shift frozen and its clock stopped, back at the door, spent through a lost life, open
  again on a new shift); practice (its best, never a shift).
- **Rig:** the dive and coil at every reach and line angle pass face clearance; the head within 8 degrees of level;
  the nurse's painting rebuilds at rest.
- **Browser** (installed Chrome): `hungry-browser.check.mjs`: the start screen's card to the round's card, dives, a
  charged rob, a bonk, a duck, pause, the three screen shapes, the tally with Play again and Start screen, the best
  kept; the BUFFET door in a shift (the round skipped to its end by a dev hook, Continue, back at the door, the payout
  on the HUD, the door spent). Every existing check still passes.
- **Boards:** `banquet-look-1..4` (the opening dump, a dive mid-slide, the dessert cart's crash, the frenzy),
  `banquet-dive.png` (the dive frame by frame at three line angles), the nurse in `cast.png`, the food sheet's sixteen;
  each looked at full size and stepped frame by frame.
