# R5 Fare Darts: design

Design addendum, 2026-10-18, to `2026-10-10-hammer-time-rebuild-design.md` (the binding spec). It fills in §16's R5
("Fare Darts (§12), the AIRPORT SHUTTLE door") and the second card of the start screen's Side quests row. Agreed with the
owner in the R5 brainstorm the same day. Where this file and the main spec's §12 (or the expansion spec's §8 and
appendix C) differ, this file wins for R5. The face rule (main spec §2.1), the cast's rules (R2b design §3, §4, §8), the
shell's rules (main spec §10) and the side-quest pattern of the R4 design (`2026-10-14-r4-hungry-hungry-hammer-design.md`
§7 and §8, and `2026-10-18-banquet-fights-back-design.md` §5) apply unchanged unless this file says otherwise.

## 1. The decisions

Decisions the owner made in the brainstorm:

1. **The prize is boxes of #15 blades, his third weapon.** A round from the AIRPORT SHUTTLE door sends him back to the
   shift with sealed boxes of #15 scalpel blades. The mallet stays his melee and the snot his blaster; once he has the
   boxes he can lob one at a staffer or a student. A box is light: it does no damage and knocks nobody down. It bonks
   them, and they freeze for a moment with cartoon birds circling their head, then carry on. It is Hammer forcing free
   samples on people. **He never throws real blades at people**: the real scalpels only ever go into the map at the gate.
2. **The rest of the payout:** the round's score, his pockets stuffed with nuts (a full smash), a Coke Zero in his hand
   (cans), and an extra life for reaching A1. One box for each fare booked; the boxes ride with him like the doggy bag;
   they work on every staffer and student, not the pig; the freeze lasts about a second and a half; B throws one, and on
   a phone a button appears on the pad only while he has boxes; practice wins nothing. (Proposed, and approved: "love
   it".)
3. **Travelers at the gate, minding their own business,** and Hammer snapping at them while he throws: they are idiots
   for checking a bag, it is not their seat, that is not how you board. It is his outer monologue that nobody asked
   for: for the laughs only, it changes nothing in the round. **On a streak of bookings he gets insufferable. E fires
   off an extra insult** whenever the player wants one.
4. **A miss makes him pissed:** he steams, his face goes angry, and he doubles down on the insults. **The travelers
   ooh, ahh and laugh** at his throws.
5. **The windows show the airport outside,** with planes parked and planes taking off.
6. **Everyone at their shift size** (the brainstorm's picture A: Hammer, the travelers and the gate agent as tall as in
   the lobby, the route map big on the wall). The owner tried twice size, as at the banquet, and came back to this.
7. **The art:** Codex paints the gate and a new gate agent; the travelers are the painted cast reused (the owner: "reuse
   is fine for this").

Decisions I took for the owner (report these):

1. Fare Darts is a mode of the Game over its own sim (`src/sim/quests/fares/`) and scene (`src/render/quests/`), the
   way the banquet is; the shift waits, frozen, behind it. The Game's quest becomes either the banquet or the darts, one
   at a time; the BUFFET and AIRPORT SHUTTLE doors each open their own.
2. Hammer stands in **profile facing right**, toward the board (§12.1 said three-quarters, which would need new paintings
   of his body). A scalpel is in his fist; the mallet leans on his instrument cart.
3. **The ladder moves 20 places a booking, and 30 on a streak** (§12.4 said 10, which can never reach A1 in ten throws:
   from C60 it takes eighteen). With the streak's 30, seven bookings in a row reach A1; anything less does not. A miss
   still drops a whole group (60).
4. **Anything that does not book is a miss** for the ladder and the streak: the drywall, the bare map, a tag under the
   storm cloud, the cancelled flight, the gate agent's clipboard. The two bonus tags (ASSIGNED SEATING, BAG FEE) are
   bookings: he hates them, and they pay.
5. **The streak** starts at the third booking in a row and ends at the first miss.
6. A fare tag is drawn **centered on its city**, showing the city's code and the fare, and what is drawn is what books
   (2 px pad). Where two tags overlap, the one whose city is nearest the scalpel's point books.
7. The storm cloud comes **with throws 3 and 7** (it drifts in after the second and sixth scalpels land, for 3 s), since
   the round has no clock: §12.5's "at 3 s and 7 s" would put both before most rounds are under way.
8. **No round clock** (as §12): ten throws, taken when he likes; the tags' short lives, the crosshair speeding up and the
   steady hand's small budget are the pressure.
9. **What comes home:** the score whole; one box per booking (up to ten); three cans per Wanna Get Away booked; a full
   smash for B GROUP or better; a life for A-LIST PREFERRED. He walks out with nuts spilling from his pockets and a
   Coke Zero in his free hand for a few seconds (only for what he won).
10. **The box:** B (and the pad's Box button) lobs it underhand from his free hand, the mallet staying in his fist. It
    freezes a staffer or a student for 1.5 s (birds circling, "FREE SAMPLE!"), scores 50 (a lecture freeze's points),
    and rolls the staff or student taunt recordings as a lecture freeze does. One every 0.4 s; standing, walking,
    running or in the air, never crouched, sliding, flopping or knocked down. The pig shrugs it off.
11. **The pad's Box button** appears in the right-hand cluster, lit with the count, only while he has boxes: the one time
    the pad has more than ten buttons.
12. **The travelers' reactions are words and bodies, no voices:** only the six recordings speak (main spec §2.3), so
    their ooh, ahh and laughter are speech bubbles with a lean-in, hands-up or shoulders-shaking beat.
13. The travelers are four of the painted cast as they are (the office worker `office-1`, the student `student-2`, the
    professor `prof-1` and the nurse), seated in a row of gate seats seen from behind, so the seat backs hide their legs
    and only their upper bodies show.
14. On an **upright phone** the board fills the width of the frame and he stands under its left half with his cart; the
    seats are under its right half (the brainstorm's third picture, with the board hung lower: §2).
15. The lobby's music plays on through the round, as at the banquet (per-venue music, the gate's muzak included, stays
    in R8).
16. `/?quest=fares` opens the practice round directly. Door rounds and practice share one best, `hammer-time-best-fares`.
17. **The crosshair's figure never closes** (found by the design's review): §12.2's path is one closed figure that never
    passes over 12 of the 22 cities a tag can land on, Dallas and New Orleans among them. Its up-and-down wave now runs
    at 1.618 times the side-to-side one instead of 1.5, so it reads as the same looping figure slowly turning over and,
    in time, crosses every city (§3). (A drift added to the old figure was tried in the review's numbers and left some
    cities waiting minutes.)
18. **How hard it is** is set by scripted rounds, as the banquet's grade lines were: a player who presses with a person's
    timing books about half the tray (a B GROUP median), a perfect one reaches A1 in most rounds (§3). The crosshair's
    speed, its rise and the steady hand are tuned to that; the tags, the fares and the points stay as §4 says.
19. **No one covers the map but the agent's crossing:** in every layout Hammer, the travelers, the cart, the printer and
    the podium (the agent behind it) stand clear of every city and tag; only her crossing walks over its lower right
    (§2, §6).

## 2. The scene

- **The room.** Gate B7, San Antonio, seen straight on like the shift's walls: the owner's painting of the gate's back
  wall, a band of floor-to-ceiling windows onto the airfield (a taxiway, a distant terminal, Southwest-colored planes
  parked at the jet bridges), a low wall under the windows to the floor line, a terrazzo floor. Planes taking off cross
  the glass behind the window frames now and then (a painted plane the game flies along a climbing path, masked to the
  windows). The camera holds still.
- **The board** (§12.1): a rounded panel 1180 by 720 world px hung on the wall center-right, a navy frame with a header
  ("GATE B7 · SAN ANTONIO"), and inside it a map rectangle 1080 by 600 centered on the panel: the cartoon US of appendix
  C (its polygon in the ink style: a cream fill, a 5 px outline), the 23 cities as dots with their three-letter codes in
  `Barlow Condensed` 26 px (Texas's crowded labels set off to the sides), a "YOU ARE HERE" sticker on SAT. The map is
  drawn by the game, so each city sits exactly where the rules put it.
- **The A-List ladder** stands beside the board on its right: A, B and C, each a third of the board's height, A at the
  top, and his boarding pass on it.
- **The printer** (a boarding-pass kiosk with a tray) stands under the board's bottom-left corner; **the podium** with the
  gate agent behind it under the bottom-right corner; a **stanchion belt** runs in the foreground.
- **Hammer** stands on the floor at the left, in profile facing right, his instrument cart beside him toward the board:
  a sterile tray of ten scalpels in slots (the count visible), the mallet leaning on it.
- **The travelers** sit in a row of gate seats behind him, to his left (§1, decision 13).
- **Everyone is drawn at their shift size** (§1, owner decision 6): Hammer about 330 px tall beside a board 720 tall.
- **Depth, back to front:** the room, the planes behind the glass, the board, the ladder, the printer and the podium (the
  agent behind it), the seated travelers behind their seat backs, the cart, Hammer, a scalpel in flight, the stanchions.
  Words go through the face-safe layout; the cards sit on the right half, away from his face.
- **The board hangs low** in every layout: the map's bottom edge about 150 px above the floor, so the gate agent walking
  across in front of it covers its lowest stretch with her head and shoulders, exactly the band her crossing blocks in
  the rules (§6).
- **Fitting the screen:** the whole board and ladder, Hammer, his cart and the travelers' heads are in view between the
  bars at 1280 by 800, 390 by 844 and 844 by 390. On an upright phone the board fills the width and the people stand
  in front of its bottom edge, the windows above it (§1, decision 14): Hammer's head over the ocean off the southwest,
  the seats kept clear of Florida. The rules do not care where the board is drawn (§3), and nobody but the crossing agent
  covers a city or a tag (§1, decision 19).

**As built in R5 (2026-10-25).** No painting is in yet: the gate, the planes, the pieces and the agent are the drawn stand-ins. On an upright phone the travelers sit in a front row below the board, not under its right half (seated there their heads covered Orlando's and Fort Lauderdale's tags), and the frame keeps under the HUD's panel and above the hint, which both span the screen there. The stanchions stand only on wide screens. The mallet leans against the cart's front, its head on the top shelf. The planes take off left to right, on a schedule kept by the round's clock.

## 3. Aim and throw

- **The rules work on the map rectangle** in its own px (1080 by 600, x east, y south, the origin at its top-left), so
  where the renderer draws the board does not change a throw.
- **The crosshair** sweeps the map on §12.2's Lissajous path with its second wave at the golden ratio (§1, decision
  17): `x = cx + 540 sin(θ)`, `y = cy + 300 sin(1.618 θ + 0.7)` around the map's middle, θ advancing at `w`, which starts
  at 1.4 rad/s and rises 8 percent a throw (compounding). θ accumulates, so the crosshair never jumps when `w` changes.
  Measured for the review at the starting speed: every city's smallest tag (94 by 54 with its pad) is crossed within
  any minute; a fresh tag on any city is crossed during its 2.6 s life at least one time in seven (one in five on
  average), and a crossing lasts about 0.06 s (0.18 s steadied). Those starting values are hard; the scripted rounds
  tune them. It is drawn as a red ring and cross with a small scalpel at its shoulder, with a faint trail of the
  figure it is tracing.
- **The tuning** (§1, decision 18), over ten seeded rounds each: a player who never throws ends C GROUP with nothing; a
  "person" (picks a live tag the crosshair's next pass will cross before it runs out, starts steadying 0.25 s before
  the pass, and presses within 50 ms either side of the moment the crosshair is over the tag's middle) books a median
  of four to six; a sharp player (perfect timing, throws only when the crosshair is on a Wanna Get Away tag, steadies
  there) reaches A1 in at least seven of the ten. What may move: the starting `w`, its 8 percent rise, the steady
  hand's 0.35 and its 2.5 s (and the 1.618, only toward another ratio that never closes, keeping every city within
  reach). What may not: the map, the tags' sizes, lives and spawning, the fares and the points.
- **The steady hand:** holding Run (Shift or J; the pad's Run; a second finger held on the screen) slows `w` to 0.35 of
  itself while the steady meter drains. The meter holds 2.5 s a round and refills 0.2 s per booking (capped at 2.5). The
  crosshair's ring tightens while it is held.
- **The throw:** any action key (Space, W, Z or ↑; F, C or K; H or X; Q) or a tap on the scene. The point the crosshair
  is on at the press is where the scalpel lands and what it is scored against, with the tags live at the press (one
  that runs out while the scalpel flies still books): what the player saw is what counts (§12.2's "the point the reticle
  was on"). The throw clip runs 0.3 s: his near arm cocks the scalpel up behind his head and whips it forward,
  releasing at the whip's end; the scalpel flies 0.22 s on a slight arc with two spins and a motion trail, sticks with
  a thunk, wobbles 0.4 s, and the board shakes 6 px. The camera pushes in 4 percent on the release and back on the stick. A throw can start once the last one has
  stuck; a held key never throws twice.
- **His face** stays clear: the arm passes behind and above his head, never across the face box, at every frame; his
  head within 8 degrees of level.

**As built in R5 (2026-10-25).** The tuning held at the starting numbers: over ten seeds the masher books 0 or 1, the person 4 to 7 (median 6), the sharp hand reaches A1 in 8 of 10. His whip over the top is a cut, as the swing's (0.55 to 0.62 of the clip is never drawn): with his shoulder behind his face no arm path over or in front of his head keeps clear of it; the release ends out ahead below his face, the blade up. The windup plays the clip to the release in 0.3 s and the flight finishes it. On a touch screen a tap throws as the finger lands, and a finger held 0.2 s with no scalpel in the air steadies, in place of "a second finger held": one finger can steady while another taps to throw, and a quick tap never drains the meter. After the play-test (owner, 2026-10-25: "make him be able to towel off to steady himself"): T, or the pad's Towel, towels him off, the shift's 0.95 s wipe, and the steady hand is full again at its end; two a round, not while a scalpel flies or once the tray is empty, and no throw or steadying mid-wipe. The scripted person and sharp hand towel off when spent; the person still books a median of six and the sharp hand reaches A1 in nine of ten. The hint teaches it once the meter is spent ("Steady hand spent · T towels off"), and the default hint reads "Space throws · hold Shift to steady · T towels off · E mouths off".

## 4. Fares and tags

- **Tags** (§12.3): one spawns every 0.9 s on a random untagged city (never SAT), at most four live, each lasting 2.6 s
  and flickering through its last 0.6 s.
- **The fare:** `39 + round(d × 260)`, `d` the distance from SAT in appendix C's normalized map coordinates, rounded up
  to end in 9, clamped 49 to 249; a flash sale (a fifth of spawns) halves it, rounded up to end in 9 and clamped again.
  So Austin, Houston, Dallas and New Orleans are Wanna Get Away, the far cities Anytime or Business Select.
- **Classes and points:** Wanna Get Away (under $100): a 90 by 50 tag in Southwest yellow, `300 + (100 − fare) × 2`
  points; Anytime ($100 to $199): 120 by 60 in red, 150; Business Select ($200 and up): 150 by 70 in blue, 60, and his
  thought "I don't PAY Business Select. I AM business select." Each tag shows its city's code and its fare, centered on
  the city (§1, decision 6).
- **A booking** scores, prints a boarding pass (the city, the class, his boarding position) that slides out of the
  printer into its tray with a tick, sends the tag flying to the printer, and lets the scalpel stick where it landed.
  **Booking a city already booked this round is a Companion Pass:** double (his thought "Companion Pass? I fly alone.").
- **A miss** sticks in the drywall or the bare map: "That's a $400 demo unit." (§7 for what it does to him).

**As built in R5 (2026-10-25).** A flash sale carries a red SALE flag on its tag's corner.

## 5. The A-List ladder and the streak

- Boarding positions 0 to 179 are A1 to A60, B1 to B60, C1 to C60; he starts at C60 (179).
- **A booking moves his pass up 20; on a streak, 30** (§1, decision 3). **A miss drops it a full group** (60, never past
  C60). The pass slides up or down the ladder.
- **The streak** begins at the third booking in a row and lasts until a miss (§1, decision 5). While it lasts he is
  insufferable (§7).
- **A1 once a round: A-LIST PREFERRED.** The ladder flashes gold, his remaining scalpels score double (stacking with a
  Companion Pass), and the agent says "Now boarding... just Mr. Hammer." with a `boom`.
- His lines on the way up (§12.4), thoughts, each once a round: "A16. Right where I belong." (passing A16), "I don't do
  group C." (leaving C), "Rapid Rewards. Rapidly." (a third booking in a row).

## 6. Hazards and gags

- **The storm cloud** (weather delay): a grey cloud with rain and "DELAYED" drifts over a third of the map (the west, the
  middle or the east, at random) after the second and the sixth scalpels have stuck, and stays 3 s. A tag under it
  cannot be booked: the scalpel sticks, no points, a miss, and his thought "Denver. Of course."
- **The ground stop**, once a round: a red X sits on a live tag for 2 s at a random moment between the second and the
  eighth throw. Hitting it costs 200 and is a miss; the agent: "Sir, that flight is cancelled."
- **The gate agent's crossing**, once between the fourth and the eighth throw: she walks across in front of the board's
  lower right with her clipboard for 1.4 s. In the rules she is a box as wide as her drawn body sliding along the map's
  lowest 160 px across its right half; drawn, her head and shoulders fill that band (§2, the board hangs low). A scalpel
  whose point falls on her bounces off the clipboard and is lost, a miss: "Sir, you can't do that here." The rest of
  the round she stands behind her podium, clear of the map.
- **ASSIGNED SEATING**, once a round between the fifth and the ninth throw: a white tag on a random city for 1.6 s, +500,
  his thought "BRING BACK OPEN SEATING." **BAG FEE**, once a round at random: an orange tag, +300, "Bags used to fly
  FREE." Both are bookings (§1, decision 4).
- Hammer's lines are thoughts; the agent's and the travelers' are speech bubbles.

**As built in R5 (2026-10-25).** A ground stop picks a live fare with more than 0.5 s left (one about to vanish would show nothing). The agent walks out from her podium to the map's middle and back, 0.7 s each way, her box her drawn body's width; she is drawn at her podium until her box passes it.

## 7. His mouth and the crowd

- **Insults** (his outer monologue, §1, owner decision 3): thoughts aimed at a traveler, who answers in a bubble. One
  comes on its own every 6 s or so; on a streak every 3 s; **E** fires one at once (no wait beyond the bubble on screen,
  not while a throw is in the air). They change nothing in the score. Lines (in `src/game/lines.ts` beside the
  banquet's lectures): "You CHECKED a bag? Amateur." · "Group C. Enjoy the middle seat." · "That is not a personal item.
  That is a footlocker." · "Shoes ON, sir. This is a gate, not a spa." · "A neck pillow. At the gate. Bold." ·
  "Pre-boarding? For WHAT?" · "You don't line up before your number. That's not how numbers work." · "No assigned seats
  and you still found a way to be wrong." · "Speakerphone. At a gate. Incredible." · "That's a four-dollar water. You
  paid it. I watched." · "Real travelers carry on." · "Fly much? No. Clearly not."
- **On a streak** he is insufferable: his smug face, a gloat on every booking ("Watch and learn, trainees." · "I've flown
  more miles than this airport." · "Write that down. That's a technique." · "Rapid Rewards. Rapidly."), and the insults
  twice as often.
- **A miss** makes him pissed (§1, owner decision 4): his angry face for 2 s, steam puffing from the top of his head (the
  heat steam, for the look only: his heat is the shift's and holds), the miss line, and he doubles down: two insults in
  a row, the first at whoever laughed ("Who moved the board?" · "Somebody coughed." · "STOP. LOOKING. AT ME." · "That
  one doesn't count. Practice throw." · "I'll be writing to the manufacturer.").
- **The crowd** (§1, owner decision 4): on a booking one or two travelers react ("Ooh!", "Ahh!", "Nice!"), leaning in
  with their hands up; on a streak booking all of them, bigger ("OOOOH!"); on a miss they laugh ("HA!", "Ha ha ha!",
  "Nice throw, grandpa."), shoulders shaking; at A-LIST PREFERRED they clap. Answers to his insults: "Okay, boomer." ·
  "Sir, I'm on a call." · "...wow." · "I'm filming this." · "It's a free country." · "Did he just—". The agent: "Sir,
  please." when he insults her.
- Every bubble goes through the face-safe layout; at most two travelers' bubbles at once.

**As built in R5 (2026-10-25).** Each mood's lines come in turn (the insults, the gloats, the pissed ones).

## 8. The round's end, the grades and what it pays

- After the tenth scalpel has stuck or bounced, a beat, then the tally.
- **Grades:** A-LIST PREFERRED (A1 reached), A-LIST (seven or more bookings), B GROUP (four to six), C GROUP (three or
  fewer).
- **The tally:** the grade, the score and the best; the printed passes fanned out (one per booking: city, class,
  boarding position); the lines (bookings by class, Companion Passes, the bonus tags, the cancelled flight, misses, his
  best streak); and the prize, won or what wins it (§1, decision 9).
- **What comes home from the door:** the score onto the shift's; a box of #15 blades per booking; three cans per Wanna
  Get Away booked (the cans' points and cool included, as at the banquet); a full smash for B GROUP or better; a life for
  A-LIST PREFERRED. Walking out he holds a Coke Zero in his free hand for 3 s if cans came, and nuts spill from his
  pockets for 2 s if the smash did.
- **Practice wins nothing;** its tally says what the door would have given.
- The hint on the way back says what the gate paid ("Gate +3,840 · 6 boxes of #15 blades · +9 cans"), as the banquet's
  does.

**As built in R5 (2026-10-25).** The nuts on the way out follow the grade (B GROUP or better, the same rule as four bookings). The tally's printed passes fan out with their words left-aligned; six or more overlap so each shows its stub, its city and its group, the classes counted in the lines.

## 9. The boxes of #15 blades in the shift

- **Carried** like the doggy bag (`HeroState`): through the venues, the stash and a lost life, until thrown; a new shift
  starts with none. The panel shows them as a small box with the count beside the doggy bag and the belly-flop.
- **B lobs one** (the pad's Box button; §1, decisions 10 and 11): underhand from his free hand, an arc forward about a
  screen's third with gravity. The first staffer or student on their feet it touches is bonked: frozen 1.5 s with three
  little birds circling their head and "FREE SAMPLE!", 50 points, the taunt roll of a lecture freeze; frozen, they do not
  move, attack, throw or rush (as the lecture's freeze). The box drops to the floor and fades. A box that meets nothing
  lands and fades; the pig, a cart and a wall stop it with no effect.
- Until he has thrown the first, the hint teaches it ("Boxes of #15 blades · B lobs one · it freezes staff").
- An occasional thought on a bonk: "Free sample." · "Read the IFU." · "You're welcome." · "That's a sterile field,
  trainee." (each at most once a venue).

**As built in R5 (2026-10-25).** "FREE SAMPLE!" pops small 300 px above the hit, so the birds (20 px, circling 66 px round the head) stay in sight; a box a staffer or a wall stopped drops straight down and touches nothing more. Its hint ranks after the pepper's and the threats'. The box is drawn in code, white with a blue band, until the gate sheet's box is wired in when the sheet arrives.

## 10. The AIRPORT SHUTTLE door

- The lobby's AIRPORT SHUTTLE door (9100, on the floor route under the balcony) becomes the second quest door, by the
  BUFFET door's rules (R4 §7): ↓ on the floor in front of it, not in the air, mid-move, mid-slide or knocked down; its
  card ("Side quest / Fare Darts / Gate B7 · SAT", and the prize: "Book fares to bring home boxes of #15 blades"); the
  lobby frozen behind it (its clock, his heat, the shield, the pepper, the cast); Continue on the tally stands him at the
  door with 0.6 s of grace, the key that closed the tally doing nothing; once a shift, a THANK YOU card through the stash
  and lost lives, open again on a new shift. The hint in front of it: "↓ AIRPORT SHUTTLE · Fare Darts".
- The BUFFET door and the AIRPORT SHUTTLE door are spent separately: one shift can play both.

## 11. Practice from the start screen

- A second card in the Side quests row, beside Hungry Hungry Hammer: "Fare Darts / Gate B7 · best 000000", its picture
  rendered by the game (`public/start/gate.webp`, by `scripts/start-art.mjs`). It plays a practice round on the same
  page; its tally offers Play again and Start screen; it never touches a shift. `/?quest=fares` opens it directly (§1,
  decision 16). The row fits both cards at 1280 by 800, 390 by 844 and 844 by 390 without horizontal overflow.

**As built in R5 (2026-10-25).** On a wide screen the start screen's strip holds six equal cards, the four starts and the two side quests; on an upright phone the two side quests sit side by side under their label, their pictures small and their place names dropped so the bests show.

## 12. The screen during the round

- **Top bar:** the round's score, the scalpels left (ten small scalpels, spent ones dim) in the clock's place, "Fare
  Darts · Gate B7" in the venue's place, pause and mute.
- **Panel:** the steady hand's meter, his boarding position ("B13"), the streak when there is one.
- **Hint line:** "Space throws · hold Shift to steady your hand · E mouths off" (on touch: "Tap to throw · hold Run to
  steady · Lecture mouths off"); "Storm over the map · wait it out"; "Cancelled flight · don't hit the X"; "A-LIST
  PREFERRED · every scalpel counts double".
- **The pad** keeps its ten buttons: Jump, Hammer, Snot and Super throw, Run steadies, Lecture mouths off; the arrows,
  ↓ and Towel do nothing at the gate (and are unlit).
- **Pause:** P or Escape, the "On break" card listing the gate's keys.
- Every card and bar fits 1280 by 800, 390 by 844 and 844 by 390 with no horizontal overflow.

**As built in R5 (2026-10-25).** The panel's rows read Steady, Boarding and Streak (×n). Jump and Hammer keep the pad's dark base under their gold tint so they read over the gate's light floor.

## 13. The art

Painted by the owner with Codex (exact prompts go in `art/outgoing/batch-r5-codex.txt` once this design is approved;
the brief in `art/outgoing/batch-9-r5-gate.txt`):

1. `art/incoming/backdrops/gate.png`: gate B7 straight on, the widest landscape size: the back wall with its band of
   floor-to-ceiling windows onto the airfield (a taxiway, a distant terminal, Southwest-colored planes parked at the jet
   bridges, no text or logos), the wall below the windows, the floor line; no seats, podium, board or people. Its cut
   (`art/cuts/gate.json`) records the floor line and the window band.
2. `art/incoming/props/gate-plane.png`: one Southwest-colored airliner in side view on green, no text, for the planes
   taking off behind the glass.
3. `art/incoming/props/gate-sheet.png`: the gate's pieces on green, spaced apart, cut at sync like the venues' sheets:
   the podium with a blank monitor; the boarding-pass kiosk with its tray; a row of four gate seats seen from behind; a
   stainless instrument cart; a stanchion; one scalpel; one small box of #15 blades (white and blue, no text).
4. `art/incoming/cast/gate-agent.png`: pose-locked like the cast (the nurse's brief): a gate agent in a Southwest-style
   uniform (a navy polo, grey trousers, a lanyard with a blank badge), accepted with `art-pose.mjs`, cut by
   `art/cuts/cast-gate-agent.json` like the others.

**Drawn in code:** the route map board and everything on it (the map, the cities, the tags, the crosshair, the cloud,
the X), the ladder and the pass, the printed passes, the sterile tray's scalpels and the scalpel in flight (from the
sheet's scalpel when it is in), the agent's clipboard, the birds, the THANK YOU card on the door.

**Reused:** the travelers (`office-1`, `student-2`, `prof-1`, the nurse), Hammer's body and faces, the mallet.

**The poses** (rig clips over the existing skeletons): Hammer's `throw` (§3) and the box `lob` (his far arm underhand,
0.35 s), each clear of his face at every frame with his head within 8 degrees of level; the travelers' `ooh`
(leaning in, hands up), `laugh` (head back, shoulders shaking) and `clap`, upper body only; the agent's walk and stand
are the cast's.

**Fallbacks** (and `&noart=1`): without the gate, a drawn gate (the brainstorm's mockup: wall, windows, drawn planes,
terrazzo); without the plane, a drawn one; without the sheet, drawn pieces; without the agent, the cast's drawn stand-in
in a navy polo. The sync warns and goes on; a bad painting never stops it.

**As built in R5 (2026-10-25).** None of the four paintings has arrived (the prompts are in `art/outgoing/batch-r5-codex.txt`); each draws its stand-in until it does. The scalpels and the box are drawn in code: drawing them from the sheet's scalpel and box is left for when the sheet arrives (the R6 handoff lists it).

## 14. Sound

`whoosh` on a throw; new `thunk` (a short low noise and a 90 Hz blip) on a stick; new `print` (a fast ticking burst) on a
booking's pass, with `ding`; `boom` on A-LIST PREFERRED; `splat`-free misses (the thunk alone). In the shift the box
lands with the existing `thud`, and a new `tweet` (three quick chirps) plays with the birds. No crowd voices (§1,
decision 12). The lobby's music plays on (§1, decision 15).

## 15. Order of work and checks

One plan, executed inline with TDD and the ledger, one fresh reviewer on the most capable model at the end:

1. The cheap deferred minors from the R5 handoff.
2. The quest generalized: the Game's quest either the banquet or the darts, `DoorSpec.quest` either, the banquet
   unchanged.
3. The round's rules (`src/sim/quests/fares/`), test-first.
4. The poses: the throw, the lob, the travelers' beats; face clearance.
5. The boxes in the shift (carry, lob, freeze, the pad's button, the hint).
6. The paintings cut and synced as they arrive (drawn stand-ins until then).
7. The scene, the crowd, the HUD and the cards.
8. The AIRPORT SHUTTLE door and what comes home.
9. The Side quests card, its picture and `/?quest=fares`.
10. The browser checks and the boards.
11. The owner's play-test; then the merge into `main` on the owner's yes.

**Checks** (main spec §12.6 and §15, extended):
- **Sim** (`scripts/fares.check.mjs`, `node:test`): tag sizes, colors and points by class; the fare formula, the flash
  sale and the clamp for every city; the crosshair path deterministic, continuous when `w` rises, never closing (at
  the round's starting speed every city's smallest tag crossed within any minute, and during a tag's life at least one
  time in seven), slowed by the steady hand within its budget and refilled by bookings; a throw at a live tag books it
  and a throw elsewhere misses; overlapping tags; the Companion Pass; the ladder (20, 30 on a streak, −60, the clamp) and A1 doubling once; the
  streak's start and end; the cloud, the ground stop, the agent's crossing and the two bonus tags with their timing
  windows; the round's end after ten; the grades; the payout from the door (score, boxes, cans, smash, life) and
  nothing from practice; the door (floor only, once a shift, the shift frozen, back at the door, spent through a lost
  life, open again on a new shift, the BUFFET and the shuttle spent apart); the three scripted players of §3 (the idle
  one, the person and the sharp one) landing where §3 says, with a tuning script beside them (as the banquet's
  `banquet-tune.mjs`).
- **The boxes** (in `fares.check.mjs` or `cast.check.mjs`): carried through a venue change, the stash and a lost life,
  gone with a new shift; the lob's arc; a bonk freezing each role 1.5 s and doing no damage; the pig, carts and walls
  unmoved; never from a crouch, slide, flop or knockdown; one every 0.4 s.
- **Rig:** the throw and the lob clear of his face at every frame and blend, his head within 8 degrees of level; the
  gate agent's painting rebuilds at rest.
- **Render:** the HUD's round (scalpels, steady meter, position, streak) and the shift's box badge and hint.
- **Browser** (installed Chrome): `fares-browser.check.mjs`: the start screen's card to the round's card, throws (a
  booking and a miss), the steady hand, an insult on E, pause, the three screen shapes, the tally with Play again and
  Start screen, the best kept; the AIRPORT SHUTTLE door in a shift (the round skipped to its end by a dev hook,
  Continue, back at the door, the boxes on the HUD, a box lobbed at the shuttle bay's staff, the door spent), and
  `/?quest=fares`. Every existing check still passes.
- **Boards:** `gate-look-1..4` (the opening, a throw in flight, a streak with the crowd, a miss with the steam), the
  throw and the lob frame by frame, a box bonk with the birds, the agent in `cast.png`; each looked at full size and
  stepped frame by frame.
