# R3 The run: design

Design addendum, 2026-10-13, to `2026-10-10-hammer-time-rebuild-design.md` (the binding spec). It fills in
§16's R3 ("Restaurant, campus, the arena and the pig; the full shift end to end; `/` switches to the new
build; the old engine is deleted") and replaces §8.3's restaurant, campus and arena sketches and §7.2's art
plan for the pig. Agreed with the owner in the R3 brainstorm the same day. Where this file and the main spec
differ, this file wins for R3. The lobby's cast rules (`2026-10-12-r2b-lobby-cast-design.md` §3, §4, §8)
apply unchanged to every venue.

## 1. The decisions

Decisions the owner made in the brainstorm:

1. **Two halves.** R3a: the restaurant and the campus, playable, the run going lobby to restaurant to
   campus. R3b: the gift shop and the pig, the whole shift end to end, the start screen, then the switch and
   the merge. The owner play-tests after each half.
2. **All the art now, with Codex.** The back walls for the restaurant, campus, gift shop and lobby, the
   pig, and the new cast are painted while R3a is built (`art/outgoing/batch-r3-codex.txt`). Nothing the
   owner sees in a play-test is a stand-in.
3. **New faces, known fights.** Four new people, painted pose-locked like the lobby's cast, each fighting
   the way a lobby role does: a line cook, a busser, a dining-hall worker, a professor (§4). The lobby's
   servers, students and office workers fill in, recolored.
4. **The old game moves to a side address.** When `/` switches to the new game (end of R3b), the old game
   stays playable at `/?classic=1`, Hungry Hungry Hammer included, and its code is deleted in R4 once the new
   Hungry Hungry Hammer exists. (The main spec's §4 and §16 deleted it at R3; this replaces that.)
5. **One shift with a stop between venues** (§2), the restaurant as drawn (§3.1), the campus as drawn
   (§3.2), the new cast (§4), the pig fight (§5), the halves and their checks (§8), each as presented.

Decisions I took for the owner (report these):

1. The pig is painted once, standing with every limb clear of its body, plus four face edits and stuffing
   tufts; the game cuts it into parts on a skeleton of its own and bends them like Hammer's and the cast's
   bodies (§6.3). The six painted poses of the old batch 4 would have popped from pose to pose.
2. Each venue's back wall is two or three paintings in walking order that join at a shared pilaster
   (§6.1); the batch 2 brief was rewritten for that.
3. Heat numbers: a flat-top adds 20 heat a second while he stands on it, the walk-in freezer takes 30 a
   second off while he is in its doorway (the main spec's numbers). Neither costs a pip by itself.
4. The pig's timings and speeds are the shipped game's, scaled to the new world (§5.2); its wind-ups keep
   the shipped lengths (0.7 s and up) rather than §7.2's 0.5 s, for the R2b fairness rule.
5. A run started at a later venue on the start screen begins like a fresh shift there: three lives, two
   pips, no pepper, no charge.
6. Each new venue gets one closed door with a card for a later phase: PRIVATE DINING in the restaurant
   (a later Hungry Hungry Hammer table) and SKILLS LAB on the campus (R7). No new side rooms.
7. Knocking staff into the restaurant's truck well scores like the lobby's shaft (500, "DELIVERY
   REFUSED").

## 2. The shift

- **Order:** the lobby (1-1, "Hotel lobby"), the restaurant (1-2, "Restaurant"), the campus (1-3,
  "Campus"), the gift shop (1-4, "The Pink Menace").
- **Between venues:** walking into a venue's exit starts the walk-off and the tally (the leftover clock
  into 50 points a second), then the next venue's card ("World 1-2 / Restaurant / Your shift goes on").
  The lobby's "Lobby clear" card becomes this; after the pig, a "Shift over" card shows the shift's score
  and the best (kept as today in `hammer-time-best-next`).
- **What carries to the next venue:** score, lives, cans, the smash charge, patience pips and the pepper
  (`hot`). He arrives with heat 0 and full snot; the Buc-ee's shield ends at the exit.
- **Per venue:** its own clock (420 s; the gift shop 300 s, as shipped), its own punch clocks, its own
  seeded pickups and crates. A lost life returns him to the last punch clock passed in the venue he is in,
  the venue as the run laid it out; venues behind him are done. At no lives, "Hammer down", and "Try
  again" starts a new shift where the last one started.
- **Side rooms:** the staff stash stays the lobby's only side room.
- **Music:** the shipped themes, as the lobby has them. Per-venue music stays in R8.
- **Starting points (R3b):** the start screen (§7) starts the shift at the lobby, the restaurant or the
  campus, or a pig practice (the gift shop alone, scored on its own, no best).
- **Until the start screen exists (R3a):** `/?next=1&venue=restaurant` and `&venue=campus` start the
  shift at that venue, for play-testing.

## 3. The venues

World px, the floor at y 0 and up negative (as in `src/sim/levels/lobby.ts`); heights in the text are
above the floor. Hammer's jump tops out near 398 px, his collider is 110 by 300 (200 crouched), and a pit
is a gap in the floor. Every venue keeps the main spec's §8.2: two punch clocks, three height bands, a set
piece, rewards seeded by the shipped rule on every route (a can, nuts and a Buc-ee's per route), the first
pepper crate early. The maps the owner approved are `2026-10-13-r3-maps/r3-map-restaurant.png` and
`r3-map-campus.png` beside this file; where they and the numbers below differ (the numbers were refined
after the maps), the numbers win.

### 3.1 The restaurant (1-2), 15,800 px

Its enemy is heat as much as the staff: eight people, against the lobby's eleven.

**Act 1, the dining room** (dark wood floor, -400 to 5200).
- Spawn 300; the early ! crate (pepper) at 760, its bottom 435 up.
- The host stand at 1050 to 1250, a podium 150 high (a platform); the PRIVATE DINING door (closed, "Opens
  later") at 1430, behind the host's patrol.
- Booths at 1600 to 2100 and 2900 to 3400 (seats 110 high), a table at 2300 to 2700 (160 high); a can crate
  over the first booth (its bottom 545 up).
- The first punch clock at 3650.
- The bar: a solid 4300 to 5000, 180 high, to jump; a can crate over it (its bottom 615 up).

**Act 2, the kitchen** (red quarry tile, 5200 to 11000).
- **The swinging door** at 5200. When the kitchen server comes through from the kitchen side while
  Hammer is within 600 px on the dining side, a ! burst and "Behind!" warn him 0.6 s ahead, then the door
  bangs open toward the dining room: Hammer inside its swing (240 px on the dining side) takes a pip (it is
  her attack and uses her ticket). A mallet hit on the door during the warning slams it the other way: she
  is knocked down on the kitchen side, and the door carries a chain like a thrown body for anyone else
  within its swing. Walking through it himself just pushes it open.
- **The pass** at 5700 to 6900, a counter 180 high under heat lamps; the first line cook crouches behind
  it (§4.2).
- **The heat-lamp gantry** at 7100 to 7600: a pass to slide under (its bottom 220 up).
- **The line**, two routes:
  - Steel counters 180 high from 7800 to 10400 (platforms), with **flat-tops** at 8300 to 8700 and 9500 to
    9900: standing on one adds 20 heat a second (a sizzle, steam off his shoes). From the counters he
    reaches the **pot rack** at 8000 to 10200, 520 high, out of reach from the floor; the route's Buc-ee's and
    nuts are seeded up there.
  - The floor in front of the counters, where the second cook marches; **the walk-in freezer**'s open door
    at 9000 to 9500 takes 30 heat a second off while he stands in it (frosty breath).
- The second punch clock at 10700.

**Act 3, the loading dock** (grey concrete, 11000 to 16000).
- A ramp from 11000 to 11600 up to the dock, 200 high (18 degrees); the second ! crate over the dock at
  11800 (its bottom 635 up, 435 above the dock).
- The dock from 11600 to 13600: produce crates at 12000 to 12300 (340 up) and 12500 to 12700 (480 up), a
  delivery case at 12850 (its bottom 635 up).
- **The truck well** from 13600 to 13930: the restaurant's one pit. Falling in loses a life; staff knocked
  in score 500 ("DELIVERY REFUSED").
- The truck's bed from 13930 to 15000 at the dock's height; then a step down to the lane.
- The dumpster at 15150 to 15500 (220 high, a platform); the DELIVERIES gate (the exit) at 15750.

**Cast** (spawn ids in brackets):

| Act | Who | Person | Where | Note |
|---|---|---|---|---|
| 1 | Host (`server-host`) | server-2, recolored | 1150, patrols 900 to 1500 | "Do you have a reservation?" |
| 1 | Server (`server-booths`) | server-1 | 2800, patrols 2200 to 3500 | between the booths |
| 1 | Busser (`busser-dining`) and his dish cart | busser-1 | cart 3880, him 150 behind it | jump it or bonk it back |
| 2 | Kitchen server (`server-kitchen`) | server-1, recolored | 5550, patrols 4900 to 6000 | through the swinging door |
| 2 | Line cook (`cook-pass`) | cook-1 | 6300, hidden behind the pass | the ambush, then the line |
| 2 | Second cook (`cook-line`) | cook-1, recolored (black jacket) | 8600, marches 7700 to 10400 | on the floor route |
| 3 | Busser 2 (`busser-dock`) and a trash bin | busser-1, recolored | bin 13080, him behind it, on the dock | the cart again |
| 3 | Server on break (`server-break`) | server-2 | 14650 on the truck bed, patrols 14100 to 14950 | "I'm on my ten." |

As built in R3a (2026-10-13): as above. The steel counters break where the walk-in's door stands (no
counter from 9000 to 9500), so the freezer is reached from the floor. The swinging door's warning is the
kitchen server's own wind-up (the ! burst and her line, 0.45 s, not "Behind!"), so its pip is her attack
and takes her ticket. The cook behind the pass is drawn crouched behind the counter, only his toque over it, and rears
up out of it as he winds up. The far plane is the owner's three walls (dining room, kitchen, dock),
scaled to span the venue; the mid pieces stand against them and the two fore pieces in front of the play.

### 3.2 The campus (1-3), 16,400 px

The busiest venue before the pig: twelve people, paper the main threat (planes stay capped at three).

**Act 1, the quad** (brick paving, outdoors, -400 to 5000).
- Spawn 300; the early ! crate at 760.
- Steps up from 1200 to 1546 to a plaza 200 high (30 degrees), the plaza to 4200, steps down from 4200 to
  4546.
- Benches at 1800 to 2100 and 3400 to 3700 (100 above the plaza). The fountain: its rim at 2300 to 3100
  (110 above the plaza), its top tier at 2600 to 2800 (410 above the plaza), reached from the rim; a
  pickup anchor on the top tier.
- The SKILLS LAB door (closed, "Opens with the Skills Lab") at 4750, a med-school door off the quad; the
  first punch clock at 5150, inside the commons.

**Act 2, the dining commons** (speckled terrazzo, 5000 to 12000).
- The serving line at 5600 to 7000, 180 high (a platform); a can crate over it.
- **The tray-return conveyor**: a belt from 7400 (the floor) up to 8300 (520 high), 30 degrees, carrying him
  up at 220 px/s (the lobby's escalator, the other way).
- **The mezzanine seating deck** from 8300 to 10400, 520 high, out of reach from the floor; stairs down from
  10400 to 11300. Under it, the floor route: a table at 8600 to 9200 and the salad bar at 9600 to 10200
  (160 high).
- The second punch clock at 11500 and the second ! crate at 11800, over the floor past the stairs' foot.

**Act 3, the library steps** (pale limestone, 11000 to 16800).
- Three flights at 30 degrees with landings: 12000 to 12520 up to 300, the landing to 13000, 13000 to 13520
  up to 600, the landing to 14000, 14000 to 14520 up to 900, then the terrace at 900 to the end.
- Ledges over the flights' upper ends (12280 to 12460 at 520 up; 13280 to 13460 at 820 up) with pickup
  anchors, each reached from the landing above it; a reachability check confirms both.
- A delivery case on the terrace at 15300 (its bottom 435 above the terrace); the LIBRARY doors (the exit) at
  16000 on the terrace.

**Cast:**

| Act | Who | Person | Where | Note |
|---|---|---|---|---|
| 1 | Student (`student-bench-1`) | student-1, recolored | sits on the bench at 1950 | planes across the quad |
| 1 | Student (`student-bench-2`) | student-2 | sits on the bench at 3550 | |
| 1 | Professor (`prof-quad`) | prof-1 | 3950, marches 3300 to 4150 on the plaza | head-down in his book |
| 2 | Lunch worker (`lunch-line`) | lunch-1 | 5400, patrols 5200 to 6900 | in front of the serving line |
| 2 | Student (`student-deck-1`) | student-1 | 8700 on the deck | up close on the conveyor route |
| 2 | Student (`student-deck-2`) | student-2, recolored | 9500 on the deck | |
| 2 | Office worker (`office-commons`) | office-1, recolored | 9400, marches 8500 to 10300 | the floor route |
| 2 | Lunch worker 2 (`lunch-salad`) | lunch-1, recolored | 10050, patrols 9600 to 10400 | by the salad bar |
| 3 | Student (`student-steps-1`) | student-2, recolored | 12850 on the first landing | planes down the steps |
| 3 | Professor 2 (`prof-steps`) | prof-1, recolored | 13300, marches 12520 to 13520 | on the second flight |
| 3 | Student (`student-steps-2`) | student-1, recolored | 13850 on the second landing | |
| 3 | Student (`student-terrace`) | student-2 | 14800 on the terrace | |

As built in R3a (2026-10-13): as above, but the conveyor starts 120 up, at the top of the tray-return
counter (7150 to 7400), a hop from the floor. Under the deck the table and the bench stand 110 high, so nothing
under the deck reaches it. The deck's stair is drawn open on its stringer, since the floor route walks on
under it; every other flight and landing stands on the ground. The far plane is the owner's three walls
(the quad, the commons, the library), rising with the ground he stands on up the library steps; the mid
pieces stand against them and its two fore pieces (a shrub, a banner stand) in front of the play.

### 3.3 The level format

`Level` (`src/sim/level.ts`) grows what the venues need, all plain data:
- `id` covers `restaurant`, `campus` and `arena`; floor kinds add `wood`, `tile`, `concrete`, `brick`,
  `terrazzo`, `stone`, `ramp` and `belt` (a belt can rise); platform kinds add `booth`, `host`, `pass`,
  `steel`, `flattop`, `rack`, `crates`, `dumpster`, `truck`, `bench`, `fountain`, `serving`, `deck`,
  `ledge`, `shelf`, `counter`.
- `heat: { x0, x1, y0, y1, rate }[]`: zones that add (flat-top) or take off (freezer) heat a second while
  his feet are in them.
- `swingDoors: { id, x, server }[]`: the kitchen door and the spawn id of whoever bursts through it.
- `exit` stays a door of kind `exit`; the gift shop's is `locked` until the pig is down.
- `backdrop: { bays: string[]; mid: { name, x }[]; fore: { name, x }[]; ambient: string }`: the painted
  walls in walking order and the standing pieces (§6).
- `boss?: { x, arena: [x0, x1] }` for the gift shop.

## 4. The new cast

Painted pose-locked like the lobby's eight (`art/outgoing/batch-7-r3-cast.txt`), cut into the same five
layers and a head, skinned on their own skeletons. Each runs one of the lobby's four behaviors
(`src/sim/cast-behavior.ts`) with their own numbers, lines, props and way of going down. Their props are
drawn in code; the cook's hat is a painting, like the bellhop's.

### 4.1 The busser (the cart; two hits)

**busser-1**: a lanky nineteen-year-old, shaggy blond hair, a long grey bistro apron (340 tall).
- **Idle**: wipes a table with his towel, stacks a dish; **notice**: "Behind you!".
- **Attack**: the bellhop's runaway cart, with a bus cart of dirty dishes (the dock's busser pushes a
  trash bin on wheels). The bellhop's numbers. A bonked cart reverses and bowls him; the dishes shatter
  (shards, a crash) and leave no puddle.
- **Going down**: hit one, dazed on his backside with stars, his towel flying; hit two while he is down,
  the slide. Lines: "Are you still working on that?", "Coming through!", "I just started here."

### 4.2 The line cook (the ambush, then the march; one hit)

**cook-1**: a burly bearded man in his forties in chef's whites (360 tall); the toque (`cook-hat.png`)
worn and flying off like the bellhop's hat.
- **The pass ambush**: hidden behind the pass counter, only his toque showing in the heat lamps' glow
  (the tell, like the projector silhouette). Within 500 px he rears up ("Order up!", 0.5 s) and flings a hot
  pan of food: the office worker's coffee arc, a pip on contact, and a grease slick (150 px, 7 s) that trips
  staff. Then he walks the line.
- **The march** (the second cook from the start): along the floor with a hot pan, never looking up; a
  sizzle is the tell within 400 px (the phone chime's place). Meeting him head-on costs a pip ("Behind!");
  from behind he staggers.
- **Lecture**: frozen, "Yes, chef."
- **Going down**: the toque flies, the pan clatters and spills a grease slick; "Who touched my station?"
  and he walks off.

### 4.3 The lunch worker (warns, then rushes; one hit)

**lunch-1**: a short stout woman in her sixties, hairnet, cat-eye glasses on a chain, a white apron
(300 tall).
- **Idle**: scoops from a tray, wipes the sneeze guard; **notice**: "No cutting!".
- **Attack**: the server's rush with a tray of food held high: the warning crouch ("Keep it moving,
  hon!", the ! burst, the order-up ding), then the rush; the server's numbers.
- **Going down**: the tray flips, mashed potatoes, peas and jello cubes fly, a gravy puddle (260 px, 8 s)
  trips staff; up again, "That's it, I'm on break." and she walks off.

### 4.4 The professor (the head-down march; one hit)

**prof-1**: a man in his late sixties, wild white hair, round glasses, tweed with elbow patches, a bow
tie (330 tall).
- **The march**: reading as he walks at the office worker's pace; a page turning within 400 px is the
  tell. Head-on costs a pip and his papers fly everywhere ("Pardon me. Were you enrolled?"); from behind
  he staggers.
- **Lecture**: frozen mid-thought, "Fascinating. Go on."
- **Going down**: the book flies, papers scatter; "I'm putting this in my memoir." and he walks off.

### 4.5 Everyone

- Roles come from a table (`cook` runs the office worker's behavior with the ambush start, `busser` the
  bellhop's, `lunch` the server's, `prof` the office worker's march), not from the person's name.
- The R2b rules hold in every venue: two attackers at most, the double-take, knocked out and walking off,
  the chain, puddles trip staff and never Hammer, points (R2b §3.3), Hammer's recordings and comebacks
  (the staff pool and comebacks for all four; students keep theirs).
- Recolors and sizes for the repeats as in R2b-2: garment masks in each person's cut, within ±4 percent of
  the painting's height; two repeats of one painting each keep their own colors.

As built in R3a (2026-10-13): the busser, the line cook and the lunch worker are painted and cut; the
professor draws as the code-drawn stand-in until `prof-1.png` is in, and the cook plays bareheaded, with
a code-drawn toque flying when he is hit, until `cook-hat.png` is in (a cut names the hat it seats; the
sync registers each hat painting by name). A recolor mask's region may name the layers it reaches, so the
second cook's jacket painted in behind his arm turns black without touching the tattoo on the arm.

## 5. The pig and the gift shop (R3b)

### 5.1 The gift shop (1-4), 4,400 px

The hotel gift shop at night (grey carpet). Spawn 300; a ! crate at 500; the arena from 600 to 3900, held
at zoom 0.92 and framing both fighters (main spec §5.4). Inside: plush shelves at 1100 to 1500 (180 high)
and 1800 to 2200 (360 high), the cash counter at 2900 to 3500 (180 high, a platform), a spotlight pooled on
the floor. The exit door at 4100, chained shut until the pig is down. Crossing into the arena wakes the pig
("PIG FIGHT"), moves his checkpoint to the arena's left edge, gives him the pepper (hot, full patience) and
1.2 s of grace, and closes the arena behind him (he is held between its edges).

### 5.2 The fight (the shipped rules, scaled)

- **12 HP.** The mallet 1 (once a swing), a snot 1 (hot or not), the super smash 2 counted as a bonk
  (within the burst's reach). At least 3 bonks and 3 snots: a hit that would end it short of either holds
  it at 1 HP with "MORE BONKS" or "MORE SNOT". 0.38 s between hits that count.
- **Contact**: landing on it from above bounces him off (the R2b stomp bounce), no damage either way;
  touching it otherwise costs a pip (the usual `world.hit`, grace and all). Buc-ee's protects him and does
  nothing to it. The lecture does nothing to it ("It's a stuffed animal.").
- **Pattern**: wind-up (the first 1.1 s, then 0.9 s, 0.7 s at half HP or below), its direction locked at
  the wind-up's start (toward him, except within 900 px of the arena's left edge it faces right and within
  450 px of the right edge it faces left); then a charge (880 px/s, 1040 at half HP, for 0.85 s, ended early
  by an arena edge) or, every third attack, a hop (forward 520 px/s, 260 px high, 0.6 s in the air, the
  state 1.15 s); then a recover (1.35 s, panting: the window).
- **Pepper refill**: while he is not hot and no pepper is out, a pepper appears 150 px inside the arena's
  left edge every 3 s.
- **Defeat**: 3000 points, "STUFFING SETTLED", time at 0.6 for 0.3 s (main spec §9), the chain falls off
  the exit.
- **Feel** (main spec §7.2): breathing at 0.5 Hz; the wind-up leans back 12 degrees with the squint face;
  the charge leans forward 18 degrees with the legs cycling at 6 Hz and dust, the charge face; the hop
  stretches 0.9 by 1.15 in the air and squashes 1.2 by 0.8 on landing with trauma 0.5; a hit flashes it
  white for 0.08 s, wobbles it, shows the hurt face and pops a stuffing tuft; defeat deflates it to 0.85 of
  its height over 1.2 s with stuffing at two seams and the X face. It stands 420 px tall.
- **HUD**: a 12-segment health bar in slate and gold under the top bar with the bonk and snot counts
  ("BONKS 2/3", "SNOTS 3/3"), as the shipped game showed; the hint line names the rule.

## 6. The art

### 6.1 The walls (batch 2, rewritten)

Each venue's far plane is its painted walls in walking order (the restaurant's dining room, kitchen and
dock; the campus's quad, commons and library; the gift shop's two; the lobby's three), each a straight-on
painting with its floor line about three-quarters down and its venue's pilaster cut in half at both edges.
A cut file per wall (`art/cuts/wall-<name>.json`, measured with `art-grid.mjs`) records the floor line and
the two seam columns (the edge pilasters' middles); the sync crops each wall between its seams. The far
plane lays a venue's walls side by side in walking order at one scale per venue, each floor line on the
game's floor and tall enough to fill the view at its highest; where the venue's far extent (its length
times the far parallax, plus a view) is longer than its walls, the last wall repeats. The lobby keeps the inked photo until its
walls are cut (R3b). A venue whose walls are missing draws its venue photo inked, or a plain wall in its
palette where it has none.

As built in R3a (2026-10-13): the restaurant's and the campus's walls are cut and in the game. Each
venue's walls are scaled so they span its length in the far plane (between 0.9 and 1.4), so each stands
behind its own stretch in walking order, and they stand on the ground he stands on (the lowest floor at
his x, eased), rising with him on the library steps and the dock. Each wall's painted floor carries on
below it in its bottom row's color, and a painted venue gets solid ground under its floors. The
gift shop's and the lobby's walls come in R3b.

### 6.2 The standing pieces

The `-mid` and `-fore` sheets are cut into separate objects at sync (each a separate shape on the green,
its base found) and placed by level data: the mid pieces against the wall at the mid plane's parallax, the
fore pieces in front (the main spec §5.3: darkened 30 percent, blurred 2 px, fading to 20 percent while
his head is behind one). The lobby's code-drawn columns and palms give way to its painted ones in R3b.

As built in R3a (2026-10-13): a sheet's shapes join when their paint comes within 24 px (boxes alone
joined the restaurant's olive tree to the bar stool beside its trunk). The restaurant's six mid pieces
and two fore pieces and the campus's six mid and two fore pieces are in.

### 6.3 The pig

`pig-body.png` is cut like a cast painting into seven layers (far arm, far leg, near leg, body, near arm,
head with the ears, tail) on a skeleton of its own (`art/cuts/pig.json`: its painted joints), skinned by the
same code as Hammer and the cast. Its states are clips over that skeleton (§5.2's feel). The four face
edits are aligned onto the body (`alignOnto`, as for the cast's face edits) and swapped whole on the head;
the stuffing tufts become particle sprites. Missing art falls back to the code-drawn pig of the main spec
§7.2.

### 6.4 The new cast

Cut, synced and drawn exactly as the lobby's eight (`castRig`, `PaintedFigure`), heads at 0.22 of the
height, the rim light from the nearest lamp; the toque like the bellhop's hat (worn cut at its base if
anything hangs below it, flying whole). Each painting is accepted or refused first with `art-pose.mjs`.

## 7. The start screen and the switch (R3b)

- **The start screen** in the shell's slate and gold: the title, the key art (the lobby rendered by the
  engine with Hammer and the pig until the owner's `brand/key-art.png` exists), three venue cards and a
  pig-practice card with engine-rendered thumbnails, the best score, mute, the keys, the quality tier, and
  a Side quests row whose Hungry Hungry Hammer card opens the old game's practice at `/?classic=1`. It fits
  1280 by 800, 390 by 844 and 844 by 390.
- **The switch**, with the owner's yes at the time: `/` serves the new game; `/?next=1` still works (the
  checks use it); `/?classic=1` serves the old game. `src/routeTree.gen.ts` must keep its hash
  (`dceedffd…`) through the route edit.
- **The merge** into `main`, with the owner's yes at the time.
- The old engine (`src/game/engine.ts`, `rig.ts`, `hero.ts`, `scenery.ts`, `sprites.ts`, `thought.ts`,
  `layout.ts`, `people.ts`) and its checks stay until R4.

## 8. The halves and the checks

- **R3a, the restaurant and the campus**: the cheap deferred minors from R2b-2's review first; the shift
  (venues in order, exits, the tally between venues, the venue cards, what carries, per-venue clocks,
  punch clocks and respawn, `&venue=`); the level format additions; both venues as drawn with their
  hazards; the four new people and their fights; the paintings cut and placed (the people, the toque, the
  restaurant's and campus's walls and pieces). Ends with the owner playing lobby to restaurant to campus.
- **R3b, the pig and the switch**: the gift shop and the pig (art, rig, fight, HUD); the whole shift to
  "Shift over"; the start screen; the lobby's walls; then the switch and the merge, each with the owner's
  yes.

Each half gets its own plan (writing-plans), executed inline with TDD, and one fresh reviewer on the most
capable model at the end.

**Checks** (the main spec's §15 and R2b's §11, extended):
- **Sim** (`node:test`, pure functions): heat zones add and take off heat at their rates and only with his
  feet in them; the swinging door warns, bangs, costs a pip only in its swing and only with a ticket, and
  slams back under the mallet; the rising belt carries him up; the truck well kills and scores; each new
  role's fight (the cook's ambush and march, the busser's cart, the lunch worker's rush, the professor's
  march and the page-turn tell); the shift (an exit tallies and loads the next venue's card; score, lives,
  cans, charge, pips and pepper carry; heat and the shield reset; a lost life returns to the venue's last
  punch clock; game over restarts where the shift began); the pig (the 12 HP, the combo rule and its
  messages, the hit gap, the pattern and its timings, the direction lock at the edges, the half-HP speed-up,
  the stomp bounce, contact damage, the refill, the arena's walls, the locked exit, defeat).
- **The scripted player** (`src/sim/drive.ts`) clears the restaurant and the campus with everyone live,
  and beats the pig with three lives intact (the shipped boss check's bar).
- **Art**: every new painting has its cut; walls crop at their seams with the floor line level; mid and fore
  sheets cut into the listed number of objects; the pig's layers rebuild its painting at rest; the face
  edits align.
- **Browser** (installed Chrome): a shift check that clears the lobby's exit into the restaurant's card and
  the restaurant's into the campus's (dev teleports), the new fights in the browser, the pig fight (R3b),
  the start screen (R3b) at the three sizes, and every existing check.
- **Boards**: each venue at six spots (`restaurant-look-1..6`, `campus-look-1..6`, `arena-look-1..3`), the
  new cast in every clip, the pig in every state and face, each checked at full size and stepped frame by
  frame.
