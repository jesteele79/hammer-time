# Hammer Time

Personal hospitality platformer.

```powershell
npm install
npm run dev
```

On Windows, `./startup.ps1` starts a background preview. On Linux or macOS,
`sh startup.sh` starts the same preview. Both use the app environment wrapper
and preserve the existing Grok platform integrations.

## Controls

| Action                   | Keyboard                                  |
| ------------------------ | ----------------------------------------- |
| Move                     | Arrows or A / D                           |
| Jump (hold for height)   | Space or Z                                |
| Run                      | Shift                                     |
| Crouch / slide           | Down or S; hold while running to slide    |
| Mallet swing; swat paper | H or X                                    |
| Snot rocket              | F; three charges that refill              |
| Lecture                  | E or L, standing                          |
| Towel off                | T, while standing and warm                |
| Super smash              | Q, at 10 charge                           |
| Staff stash              | Down while standing on its marked cart    |
| Side quest door          | Down on the floor in front of the door    |
| Pause                    | Escape or P                               |

Touch controls support simultaneous movement and actions. Landscape gives a
larger playfield on phones.

## Hammer's moves

Hammer is a cut-out rig built from the approved photography. The face, head and
shirt pixels are never edited, the head stays level when the body leans, and no
drawn frame puts an arm or the mallet over his face (a test sweeps every pose).

- **Mallet.** The arm loads behind and over his head, then the strike cuts
  from overhead to the front between physics steps, so the arm never crosses
  his face. A swoosh traces the full arc and contact follows it too. He leans
  and steps into the blow; hits launch staff off their feet with a comic word
  and a hit-stop. The real shoulder, elbow and wrist each have a joint, and the
  sleeve travels with the shoulder.
- **Super smash.** A hop, a long overhead load, then a slam that fires on
  touchdown with "HAMMER TIME!" He folds forward and sinks into a squat: the
  hips drop and sit back, the pelvis tips, both knees bend while the shoes stay
  flat where they stand, and the mallet head lands on the floor in front of
  his toes. The floor shockwave starts at the mallet head.
- **Snot rocket.** He rears back to load his sinuses, then snaps forward and
  honks; no hand comes up to the face. Snot is always loaded: three charges
  that refill over about a second and a half each. Pepper from a ! crate makes
  it hot: faster, bigger, and it goes through one staffer. Snot that lands on
  the floor leaves a puddle that trips walking staff.
- **Lecture.** He plants his feet and wags the mallet at whoever is in front.
  Students he schools stop throwing paper and sulk; staff stop and take it for
  a moment. Venting also drops his heat.
- **Towel off.** The towel comes out of his back pocket, mops the bald crown
  and back of the head, gets flicked out behind him in a spray of sweat, goes
  back in the pocket and leaves a glint. Heat drains while he wipes; at full
  heat a kettle whistle blows and steam rises off his head.
- **Impatience.** Left standing on the floor with no input and nothing within
  reach (no staffer within 120 px, no paper in the air, no awake pig), he
  checks his watch at 2.5 seconds (the far forearm comes out front, the watch
  at chest height, never above the collar), taps his front toe from 5 seconds,
  and at 8 seconds harrumphs and thinks "Any day now." The cycle repeats. Any
  input, a respawn or a new level resets it.

## Start screen

The full-screen launch menu shows Hammer facing the Pink Menace, using the
approved original cutouts. Four illustrated starting-point buttons select the
full shift, restaurant, campus or pig practice. Clock in launches that choice.
The menu includes signature pickups, a stored personal best, mute and an
expandable How to play section. The game HUD and touch pad appear after launch.
Keyboard activation of menu buttons selects or opens that control without
accidentally starting the game; Enter or Space outside a control starts the
selected run. Small phones can scroll the menu. A Side quests row under the
venues starts a practice round of Hungry Hungry Hammer and shows its stored
best; practice never touches a run.

## Side quests: Hungry Hungry Hammer

Hungry Hungry Hippos at a banquet table. Enter it from the BUFFET door in the
hotel lobby (Down on the floor in front of it; once per run) or practice it
from the start screen.

| Action                          | Keyboard                    |
| ------------------------------- | --------------------------- |
| Dive along the table            | Space, F or Jump; tap       |
| Charged dive (rob a plate)      | Hold up to half a second    |
| Bonk the near end of the table  | H or X                      |
| Duck under paper                | Down                        |
| Continue from the tally         | Enter, Space or Continue    |

- **The round.** Sixty seconds. Food drops from the chute in waves:
  appetizers, then entrees from 20 seconds, then desserts, with the dessert
  cart crashing in at 42 seconds and spilling eight plates. Coke Zero, nuts,
  a Buc-ee's bag, hot sauce, a to-go box and the check each drop once.
- **The dive.** Hammer dives along the front of the table, far hand first,
  and stops at the first food his hand reaches, eating everything within 10 px
  of it. A tap reaches up to 90 px, plus 10 px for every plate he has eaten,
  up to 250. Holding the button stretches the dive to 250 by half a second,
  with a marker on the cloth showing where it will stop; a charged dive with a
  clear path to a rival's plate robs the top item for its value plus a
  100-point YOINK (specials on it pay out as if eaten).
- **The rivals.** A student, a bellhop and a nurse grab food that settles
  near them after a reaction delay, faster the angrier they get. Robbed, the
  student winds up ("Heads up!") and throws paper down the table (duck under
  it or swat it; a hit costs 150), the
  bellhop drops a suitcase that stops food and dives for four seconds, and an
  angry nurse slaps a hand that reaches into her zone.
- **The server** walks behind the table bussing plates ("Are we still working
  on that?"). Bonk him when he is near Hammer's end and his tray spills four
  extra plates and he leaves for fifteen seconds; the same swing stuns a rival
  leaning into range and slams suitcases off the table.
- **Scoring.** The plate total plus combo bonuses (grabs within 1.2 seconds:
  x2 from the fifth, x3 from the tenth). The check costs 400; the to-go box
  doubles the next five grabs. Grades: COMPED 3000, GOOD TIPPER 2000, SPLIT
  THE CHECK 1200, WATER ONLY below.
- **Rewards on return** to the lobby: the score, Coke Zero eaten, smash charge
  from nuts, a Buc-ee's boost, and hot snot from hot sauce or a full belly
  (GOOD TIPPER or better: patience back to three). The door then says THANK
  YOU for the rest of the run.

The food is drawn procedurally (plates with tags) until the requested food
sprite sheet exists; the Coke Zero, nuts and Buc-ee's photos are the approved
pickups. Every Hammer line in the quest is a thought bubble.

## Routes and surroundings

The shift runs through a hotel lobby, restaurant service area and campus dining
commons, then a stuffed-pig boss arena. The visual start menu starts any venue or
boss practice directly. The three regular routes are roughly twice their
previous length, with multiple checkpoints and a 420-second time allowance.

Servers warn before rushing. Hotel staff take an extra hit and can be knocked
along the floor. Office workers remain a smaller part of the cast. Each staffer
opens with a line ("Is Pepsi okay?", "There's a daily resort fee."), and Hammer
answers mallet hits with the supplied recordings, captioned, or a written jab.
Nineteen adult college students across the routes exchange sarcastic dialogue
with Hammer and telegraph paper airplanes. Student bodies stay outside combat;
the planes are hazards you can duck, jump over or swat with the mallet, and a
lecture shuts a student's paper supply off.

Counters and crates use wood grain, steel trim, seams and lighting. Thin
shelves show their exact landing surface. Suspended service ducts have a clear
32-unit passage for the 30-unit crouched body; releasing Down underneath keeps
Hammer low until standing is safe. Stepped shelves reach elevated supplies.
Dark floor gaps and concrete edges make drop hazards easier to see.

Coke Zero, nuts and Buc-ee's positions vary each new run, using safe floor and
shelf anchors. Geometry and essential pepper crates remain fixed. Each regular
route includes all three reward types; deaths preserve that run's layout.

## The Pink Menace

The giant pale pink pig is based on the supplied stuffed-toy photograph:
broad protruding snout, upright pear-shaped body, short limbs and stitched
velour panels. It warns before charging or hopping, locks its attack direction
during the warning, and pauses to recover. Its health bar shows 12 HP and the
required combo: at least three mallet bonks and three snot hits. Extra damage
cannot bypass that combination. Super smash helps but does not erase the boss;
Buc-ee's protects Hammer without instantly defeating it.

The arena supplies pepper on entry and a refill near its left edge after damage
cools the snot back down. The exit stays locked until the pig is defeated. Boss
practice lets you learn the timing without replaying the full shift.

## Character and audio

The original face and Affliction shirt textures are unchanged. Animation moves
limbs around that artwork (`src/game/rig.ts` holds the joints and pose
keyframes, `src/game/hero.ts` draws them). The mallet drawing and collision use
the same joints. The approved photographic Coke Zero, nuts, Buc-ee's and towel
assets are also unchanged. PNG masters and smaller gameplay WebPs are retained.

Coke Zero reduces heat; 100 cans earn a life. Nuts add three smash charge.
Buc-ee's gives ten seconds of invincibility. Running, jumping and attacking
build heat. Toweling off cools Hammer while hazards continue moving. The HUD
shows snot charges and patience (the hits he can take before the next one
costs a life); on his last nerve a vein pops beside his head.

`public/absolute-bullshit.mp3` is untouched. The derived `damage-voice.wav`
removes leading/trailing silence, preloads on the title screen, and decodes
after the first interaction. Accepted damage immediately starts Web Audio
playback, ducks music and suppresses repeats during immunity. Staff, paper and
boss contacts share this path. Pause, mute and teardown stop the voice.

Hammer's lines live in one table (`src/game/lines.ts`), each a `Line` with
text and an optional recording. Only the six recordings are spoken, and a
recording is captioned only when it actually plays: a student greeting, a
lecture payoff, a paper swat or a pig hit that lands a recording shows that
recording's words. Every other Hammer line is a thought bubble: a scalloped
cloud above and behind his head with two puffs trailing toward the back of his
head. A thought waits while a recording's caption is up, and a recording cut
short by damage, pause or mute takes its caption with it. Thoughts, recording
captions and "ABSOLUTE BULLSHIT" all sit above and behind his head; near the
top or the sides of the screen they move behind his face, then below it, and
are never drawn over his face. Staff, students and the pig keep speech bubbles.

Five additional supplied recordings preload alongside it. Staff mallet contacts
(office and hospitality) have a 35% chance of "They need to get fired," "They
can't take feedback" or "They get all butt hurt." Student encounters, lectures
and successful paper swats have a 50% chance of "They got a problem" or "Go grow
some man balls." Accepted pig bonks and snots have a 45% chance of any of the
five. Each pool cycles a shuffled bag before
repeating; cooldown is at least 3.5 seconds, and lines never overlap or queue.
Damage interrupts a taunt immediately with "absolute bullshit." Muting and
pausing stop both kinds of voice. Optional clip failures never block starting.

Original M4As are preserved under `public/voice/source/`. Derived mono WAVs trim
only outside silence and normalize peaks for consistent volume. File mapping,
processing details, durations and hashes are in `public/voice/manifest.json`.

Generation prompts, reference details, crop coordinates and asset hashes are
in `public/scenery-assets.json` and `public/boss-prop-assets.json`.

## The rebuild (`/?next=1`)

The game is being rebuilt as a modern renderer over a fixed-step sim (the
design is `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md`).
Until it replaces the shipped game it lives behind `/?next=1`: a PixiJS 8
scene on WebGPU (WebGL 2 when WebGPU is missing, or with `&gl=1`) showing
the hotel lobby as a playable level under the keyboard (arrows or WASD, Space
or Z to jump, Shift to run, Down to crouch and, at speed, slide, P or Escape
for a break) or the touch pad. `&noart=1` runs the art fallback path;
`&board=1` exposes the look-board renderer; `&dev=1` adds a practice hit on G
and a teleport, a hit and a full smash on `window.__next.dev`, for the checks.

- `src/sim` steps the world at 120 Hz over plain objects: the spec's game-feel
  constants, floors with slopes, one-way platforms, solids and passes,
  Hammer's movement, and the rig (`src/sim/rig`: a skeleton whose rest pose is
  the painted body, clips, blending, forward kinematics, face clearance and
  grounding).
- `src/render` draws it: eight planes with parallax, a spring camera with
  look-ahead and trauma shake, the inked venue plate, drawn floors and
  furniture, bloomed lamps, pooled particles, bitmap fonts, and Hammer: the
  owner's painted body as five skinned meshes bent by the skeleton
  (`src/render/skin.ts`), with the head plate and the mallet on top.
- Art: the owner's files stay untouched under `art/reference/` and
  `art/incoming/` (their hashes are recorded in `art/manifest.json`, and the
  sync refuses to run over a changed one). `npm run art:sync` keys and registers
  them and splits each body into skinned layers under `public/art/` (ignored by
  git, regenerated by `dev` and `build`). The painted joints and the layer
  outlines are in `art/cuts/hammer-body.json`; `node scripts/art-grid.mjs <costume>
  [x y w h scale]` draws them over a body with a pixel grid for measuring, and
  `node scripts/art-sync.mjs --overlay` writes each body's layers side by side
  to `artifacts/body-layers-<costume>.png`. `art/ART-REQUEST.md` lists what to
  generate.
- Quality tiers `ultra`, `high`, `medium` and `low` step down one tier at a
  time when a second's frames average more than 15 ms of work or arrive late
  against the display's own rate, never back up; force one with
  `localStorage.setItem("hammer-time-quality", "medium")`.

### Moves in the rebuild

Hammer's moves keep the shipped keys and rules (`src/sim/moves.ts`) on the
new body. When several move keys land at once one move starts, in the order
towel, snot, smash, swing; nothing starts while he crouches or slides, and a
running move is never restarted.

- **H or X, the swing:** a windmill of the mallet that lands in front of him
  (0.42 s). The strike over his head is skipped on screen and still counted
  for contact, so a cart is hit anywhere along the arc in front, once per
  swing. A bonk freezes the action for 0.06 s, shakes the camera, flashes the
  cart white and rolls it away.
- **Q, the smash:** with a full charge (three bags of nuts) he hops, plunges
  and slams the mallet into the floor as he lands; every cart within reach
  flies, and crates hung over the floor within reach open or break. The
  slam freezes for 0.08 s, then runs at quarter speed for 0.25 s, and punches
  the camera in.
- **F, C or K, the snot rocket:** his left hand comes up and presses one
  nostril, he rears back and blows, then flicks the hand off forward and
  drops it. Three charges, one back every 1.5 s, half a second between shots
  and three in flight at most. It leaves just ahead of his nose, knocks a cart
  and splats, or lands as a puddle that dries in 7 s. Hot snot (the pepper's)
  burns orange, sheds embers, is faster and bigger and goes through a cart.
- **T, the towel:** with any heat, on the ground, he stands still, lets the
  mallet hang down in his right hand, brings the towel up in his left and
  wipes his face, flicks the sweat off and shines; heat drains fast. That hand
  and the towel, and the same hand at his nose for the snot rocket, are the
  only things ever drawn over his face.
- **Heat is his stamina:** running (Shift) heats him, walking or standing
  cools him, and jumps, swings and snot add to it. From half full he slows
  steadily, running or walking, to two-thirds of his speed when it is full,
  and the heat bar pulses red. From 45 he sweats, from 60 he pants, from 80 he
  steams and sweats twice as fast, and near 100 he boils over: then he cannot
  run at all until he cools below 70. The towel (T) or a Coke Zero cools him.

### His other acts, his body and the HUD

- **E, the lecture:** on the ground he plants his feet, points the mallet at
  whoever is in front and wags it (0.8 s), thinking a lecture line. A fifth of
  the way in it lands on everyone in a reach in front of him (R2's staff and
  students), and it cools him 15. One lecture per 1.4 s.
- **Standing still:** at 2.5 s he lets the mallet hang and checks the gold
  watch on his left wrist, from 5 s his near foot taps, and at 7.5 s he
  harrumphs ("Any day now."), then round again from 8 s. He looks bored from the watch
  check on. Any key or move ends it on the spot.
- **Getting hit:** three patience pips. A hit costs one, turns him to face it,
  throws him 540 back and 500 up, shows the hurt face for 0.6 s, plays the
  "absolute bullshit" recording with its caption, drops hot snot and gives him
  1.45 s of grace. The last pip knocks him flat: he goes over backward, lands
  on his back (holding that frame in the air until he touches down), lies a
  beat, sits up and gets up. In the full game that will be a lost life.
- **His body:** he breathes, leans up to 9 degrees into speeding up and back
  when he brakes, squashes on landing and stretches on take-off, and his belly
  follows through (`src/sim/rig/layers.ts`). On a slope his soles lie along
  the floor and his knees take up the difference (`src/sim/rig/feet.ts`).
- **The feel:** he runs at 780 px/s and crosses a 1920 px screen in 2.55 s,
  stops from a run in 0.14 s, and a jump clears 1.16 times his height.
  Landings shake the camera in proportion to the fall and never freeze it;
  falls harder than a jump thud.
Comic words, thoughts and captions are placed off his face every frame, and
particles that reach his face are dropped. Sound is the shipped game's effects
and music through its `AudioBus`, silent until the first key or tap.

### The lobby (1-1)

The lobby (`src/sim/levels/lobby.ts`) runs 16,400 px in three acts:

- **The entrance and the front desk:** a ! crate over the start with the
  first pepper, the long marble desk to jump (its bell rings under the
  mallet), the time clock behind it, two sofas with Coke Zero crates over
  them, a luggage cart, and the BUFFET door.
- **The elevator bank:** an open shaft, "OUT OF ORDER", the only pit. Then two
  routes. Hop onto the landing and climb the 30-degree grand staircase to the
  mezzanine (the M CLUB door is up there), or run on under it past the AIRPORT
  SHUTTLE doors and the STAFF ONLY door to the stash. His jump never reaches
  the mezzanine from the floor. The escalator carries the balcony route back
  down where the two meet.
- **The conference wing:** the second time clock, a second ! crate, banquet
  tables with their chairs, the projector screen, the service corridor to
  slide under, a delivery case and the CLOCK OUT door.

The camera eases out to 0.88 over the mezzanine and never shows past the
level's edges. The staff stash (`src/sim/levels/stash.ts`) has a shelf whose
jump bumps the Buc-ee's case, a ! crate and the cart back to the lobby; it
is stocked once a run: what he takes stays gone, across visits and lost
lives, and its clock never runs. Walking into it cleaned out, he thinks
"Can't keep one shelf stocked." and then says "They need to get fired."

### The restaurant (1-2)

The restaurant (`src/sim/levels/restaurant.ts`) runs 15,800 px in three
acts, and its enemy is heat as much as the staff:

- **The dining room:** the host's podium, the closed PRIVATE DINING door
  ("Opens later"), two booths and a table to hop, the first punch clock, and
  the bar to jump. A busser pushes his bus cart of dirty dishes at Hammer.
- **The kitchen:** the swinging door. When the kitchen server comes through
  it while he is near, she winds up (the ! burst) and the door bangs open
  toward the dining room: standing in its swing costs a pip; a mallet hit on
  the door during her wind-up slams it back on her. Then the pass, where a
  line cook crouches behind the counter with only his toque showing and
  rears up to fling a hot pan; the heat-lamp gantry to slide under; and the
  line, two routes. Up on the steel counters the flat-tops add 20 heat a
  second (a sizzle, steam off his shoes) and the pot rack overhead holds the
  route's best pickups; down on the floor a second cook marches, and the
  walk-in freezer's open door takes 30 heat a second off (frost, his
  breath). The second punch clock is past the line.
- **The loading dock:** a ramp up, produce crates, a delivery case, a busser
  with a trash bin on wheels, the truck well (the one pit: a lost life for
  Hammer, 500 and "DELIVERY REFUSED" for staff knocked in), the truck's bed,
  a server on her break, the dumpster and the DELIVERIES gate out.

### The campus (1-3)

The campus (`src/sim/levels/campus.ts`) runs 16,400 px, the busiest venue
before the pig, with paper the main threat:

- **The quad:** stone steps up to a brick plaza, students on the benches
  throwing paper, the fountain (its rim, and its top tier from the rim), a
  professor marching with his nose in his book, steps down to the closed
  SKILLS LAB door ("Opens with the Skills Lab") and the first punch clock.
- **The dining commons:** the serving line with a lunch worker in front of
  it. Then two routes. Hop onto the tray return and ride the conveyor up
  past the trays to the seating deck, out of reach from the floor, with two
  students; or stay on the floor under it, past an office worker and a
  second lunch worker at the salad bar. An open stair brings the deck down
  where the two meet; the second punch clock is past it.
- **The library steps:** three flights and their landings, ledges beside
  them, students firing down the steps and a second professor on the
  stairs, up to the terrace, a delivery case and the LIBRARY doors, the
  shift's end for now.

Both venues stand in front of the owner's painted walls (three each, in
walking order, cropped at their pilasters by `art/cuts/wall-<name>.json`)
with painted pieces standing against them and in front of the play, cut from
the owner's sheets at sync; the walls are scaled to span the venue and rise
with the ground he stands on. A venue whose walls are not all in keeps its
inked photo. `node scripts/art-grid.mjs wall/<name>` draws a wall with its
seams and floor line.

### The lobby's cast

Eleven people work the lobby (`src/sim/cast.ts`, `cast-behavior.ts`,
`missiles.ts`; placed in `levels/lobby.ts`; the design is
`docs/superpowers/specs/2026-10-12-r2b-lobby-cast-design.md`). Each does a
double-take when he comes near, says a line in a speech bubble, and goes about
the job:

- **Two bellhops** (the desk, the floor route under the balcony), each gripping
  a luggage cart. He squares up with a ! burst, the wheels squeal and he shoves
  the cart at Hammer: jump it (the cases are what hurts), or bonk it back,
  which knocks it out of his hands and bowls him over with it. He follows the
  cart where it stops and wheels it home. Two hits put a bellhop out; a second
  bonk while he is down sends him sliding into whoever is next.
- **Three servers** (the BUFFET door, the STAFF ONLY door, between the banquet
  tables) carrying trays of water. A warning crouch, then a two-second rush;
  the mallet meets her and the glasses shatter into a puddle of water.
- **Two office workers.** One marches the elevator bank on his phone (it chimes
  as he closes) and knocks over whoever meets him head-on; walked into from
  behind, he only staggers. The other hides behind
  the projector screen, his silhouette on the sheet, and leaps out when Hammer
  is near, flinging his coffee: a puddle that staff slip on.
- **Four students** (three at the mezzanine rail, one sitting on the far
  table). They keep out of mallet reach, hopping back, and throw paper planes
  at his chest every four to six seconds, three in the air at most; they duck
  the mallet, hop over a stomp and run from the snot.

At most two of them attack at once; the rest hold their ground until a slot
opens. Whatever hurts him (a cart's cases, a rush, a shoulder, a plane, the
coffee) costs a pip, and nothing touches him in grace or down. The mallet and
the stomp knock staff down (the bellhop twice), the lecture freezes staff for a
breath and schools students for nine seconds, a puddle trips staff, a big hit
(the smash, the shield, a thrown body) sends them flying, and a flying body
bowls whoever it lands on: the chain pays 100, 200, 400, 800, 1000, 2000, 4000
and 8000, the eighth a life. Points otherwise: a knockdown 100, a slip 150, a
schooling 150, a freeze 50, a swatted plane 50, a shield bowl 200, a student
run off 100, a fall down the shaft 500. Hammer's six recordings answer the cast
as they did the shipped game's. `/?next=1&nocast=1` plays the lobby without
them (the older checks use it). `scripts/cast-browser.check.mjs` plays the
fights in the browser and the boards `cast.png`, `cast-fx.png` and
`cast-lobby-1..6.png` show every person in every act, the effects and the
six scenes.

**The cast is painted** like Hammer (R2b-2). Each of the eight people is the
owner's painting under `art/incoming/cast/`, made with Codex from
`art/outgoing/batch-3-codex.txt` and pose-locked to Hammer's body plate, cut by
`art/cuts/cast-<person>.json` (his five layers plus a head) and synced by
`castRig` (`scripts/art-cut.mjs`) into skinned layers, a head plate,
silhouettes and a rig under `public/art/cast/`. In the game
(`src/render/cast-body.ts`, `PaintedFigure`) each person bends on their own
skeleton (`skeletonFrom`: their bone lengths, their arms turned to Hammer's
stance so every pose and reach lands the same way); the head grows to the
share of the height the owner picked (0.22, `LOOKS[...].head`) above a
jaw-to-nape line while the painted neck keeps fitting its collar
(`taperHead`). The bellhops wear the owner's hat (worn without its strap's
loop, whole when it flies off). The three repeats are recolored at sync from
garment masks in their painting's cut (a burgundy vest, a mustard overshirt, a
teal hoodie) and drawn a few percent taller or shorter. The side facing the
nearest lamp gets a thin warm edge (off at the low quality tier). A face edit,
`<person>-silly.png`, swaps in while dazed when the owner makes one. Anyone
whose painting is missing or fails to load draws as the code-drawn stand-in,
and `&noart=1` draws them all that way (`window.__next.castArt` says who is
which). To check a new painting, `node scripts/art-pose.mjs <person>` lays it
over Hammer's; `node scripts/art-grid.mjs cast/<person>` draws its cut over
it; `node scripts/art-sync.mjs --overlay` writes its layers side by side; the
board `cast-heads.png` shows each head size beside Hammer, and
`scripts/cast-art-browser.check.mjs` checks the paintings load and fall back.

**The venues' new people** (R3a): four more paintings, each fighting one of
the lobby's ways (`ROLE_OF` in `src/sim/cast.ts`), with their own lines,
props and way of going down:

- **The busser** pushes the bellhop's runaway cart, a grey bus cart of dirty
  dishes (the dock's busser a trash bin): jump it or bonk it back. The
  dishes crash and leave no puddle; his towel flies at the first hit.
- **The line cook** ambushes from behind the pass (only his toque showing,
  then he rears up and flings a hot pan, a grease slick where it lands) and
  marches the line like the office worker, a sizzle his tell. Knocked down,
  his painted toque flies whole and his pan clatters. Hiding, he sinks
  till only the toque shows over the counter.
- **The lunch worker** rushes like a server with a tray of mashed potatoes,
  peas and jello; knocked down, the food flies and leaves a gravy puddle.
- **The professor** marches head-down in his book, a page turning his tell;
  head-on his papers fly everywhere. The second professor, on the library
  stairs, wears grey tweed.

Each new person's painting is cut like the lobby's eight; a cut names the
hat it seats, and the sync registers each hat painting by name. The repeats
in the venues (the host's plum vest, the second cook's black jacket, the
dock busser's maroon shirt, the salad bar's red polo and the rest) are
recolored from masks in each painting's cut; a mask region may name the
layers it reaches, so a garment painted in behind an arm changes color
without touching the arm.

### The shift

- **A shift** runs the venues in order: the lobby (1-1), the restaurant
  (1-2), the campus (1-3); the gift shop and the pig follow in R3b. It
  starts on the lobby's card with three lives, two patience pips and 420
  seconds. Each venue has its own clock (420 seconds), its own punch clocks
  and its own seeded pickups and crates; under 80 seconds the clock turns
  red and the music hurries.
- **Between venues:** walking into a venue's exit counts the leftover clock
  into 50 points a second, then the next venue's card ("Your shift goes
  on"). Score, lives, cans, the smash charge, patience pips and the pepper
  carry on; he arrives cool with full snot, and a Buc-ee's shield ends at
  the exit. After the last venue the card is "Shift over", with the score
  and the best. Until the start screen offers it (R3b),
  `/?next=1&venue=restaurant` and `&venue=campus` start a fresh shift
  there, for play-testing.
- **Pickups** are laid out fresh each run by the shipped seeded rule (anchors
  on floors and platforms, Buc-ee's and nuts first, the rest cans), and each
  route always gets a can, nuts and a Buc-ee's. They are the real products
  (the shipped pictures in `public/`: Coca-Cola Zero Sugar, Mixed Nuts and
  Buc-ee's Beaver Nuggets), about a quarter of his height, and each has one
  job, which the hint line names for two seconds after he takes it:
  - **Coke Zero cools him down:** 25 heat off with a frosty fizz, so he runs
    at full speed again; 200 points, and every hundred cans is a life.
  - **Nuts are smash fuel:** three bags fill the Super Smash; 500 points.
  - **Buc-ee's is a shield:** ten seconds of a gold glow behind him (it
    flickers through its last two), nothing hurts him, and whatever he runs
    into goes flying; 1000 points. The HUD counts it down beside the beaver.
  - **The pepper is a hot head:** an extra hit point and hot snot; 1000 points.
- **Crates** open to a head bump from below or the mallet: the ! crate lets
  out a pepper (nuts if he is already hot) that rises, slides off and turns at
  walls; the Coke Zero crate pops a can; a delivery case pays a can a hit and
  breaks after five, under the mallet or the smash, or at once when he has two
  pips. Carts still roll when bonked but add no smash charge.
- **Punch clocks** save where he comes back: walking past one punches its
  BREAK card gold and the HUD says "Checkpoint saved".
- **Losing a life:** the last pip's knockdown once he lies still, a fall down
  the shaft or the truck well, or the clock running out. He comes back at the
  last punch clock in the venue he is in, with two pips, the full clock and
  the venue's pickups and crates as the shift laid them out. At no lives it
  is "Hammer down", and Try again starts a new shift where the last one
  started.
- **Doors:** Down in front of the staff door goes to the stash and Down at its
  cart comes back, with the lobby just as he left it. The BUFFET, AIRPORT
  SHUTTLE and M CLUB doors carry cards saying what opens them. Walking into
  CLOCK OUT ends the lobby and the shift goes on in the restaurant.
- **The shell:** the HUD's top bar carries the score, the Coke Zero count,
  lives as small portraits, the Buc-ee's boost, the clock, and pause and mute
  buttons; the panel keeps patience, heat, snot and smash; the bottom line is
  the shipped game's contextual hint. The cards (the venue card, "On break"
  with the keys, "Hammer down", "Shift over" with the score and the best,
  kept in this browser) sit in the lower half, clear of his face. On phones
  and touch screens a ten-button pad runs along the bottom.

```powershell
npm run test:next
$env:BROWSER_SMOKE_CHANNEL='chrome'
node scripts/next-browser.check.mjs http://127.0.0.1:8090/
node scripts/run-browser.check.mjs http://127.0.0.1:8090/
node scripts/moves-browser.check.mjs http://127.0.0.1:8090/
node scripts/acts-browser.check.mjs http://127.0.0.1:8090/
node scripts/cast-browser.check.mjs http://127.0.0.1:8090/
node scripts/shift-browser.check.mjs http://127.0.0.1:8090/
node scripts/look-boards.mjs http://127.0.0.1:8090/
```

`test:next` runs the art checks (keying, head registration, the alignment
gate, manifest hashes, the fill, the layers rebuilding each painting exactly
at rest with no painted pixel lost in any costume, mesh coverage, skin
weights), the rig checks (rest height, walk and run cycles with a level head,
blending, face clearance for every sampled frame of every clip and every
blend, mirroring, the skeleton matching the painted joints, grounding), the
render checks (the quality governor, the skinned body matching the painting
at rest and every bone landing on its solved joint, comic words kept off the
face and in view, the towel at his face while his left hand wipes it, the
towel hand drawn over his head only where it covers nothing else), the
sim checks (jump height and cut, run speed and stop, coyote time and the jump
buffer, landing on a platform at speed, crouch and slide under a pass,
determinism, a screen crossed in 2.6 s, landings that never hold him), the
move checks in `moves.check.mjs` (the feel table and the hit-stop clock, move
timing and priority, mashing, moves in the air, crouched or sliding, heat and
the towel, snot charges and puddles, the swept mallet and once-per-swing hits,
the smash's burst, an in-air smash, facing left) and the act checks in
`acts.check.mjs` (the lecture, the idle beats and what ends them, patience,
the hurt, the tumble off a ledge, a hit mid-move) and the lobby checks in
`lobby.check.mjs` (reward anchors and the seeded layout on every route,
crates and what comes out of them, the run's pickups, deaths counted once
whether in grace, in the stash or with the clock out mid-knockdown, respawn,
pause, doors and the stash, the exit's tally, the lobby's shape, and a
scripted player through both routes) and the cast checks in `cast.check.mjs`
(the spawns and patrols, the double-take, every hit and what it does to each
role, the shove and the jump over it, the reversed cart, the rush, the march
and the bump, the planes and the swat, the hop and the duck, the ambush, the
lecture on staff and students, the chain through a thrown body, puddles and
slips, the two-attackers rule, respawn and the stash, the scoring, and the
scripted player fighting through both routes) and the venue checks in
`venues.check.mjs` (the shift's order and what carries, each venue's clock
and punch clocks, the heat zones, the swinging door, carts on their floor
and down pits, footing on stairs, the new people's fights, each venue's
shape and reach, the seeded rewards on every route, and a scripted player
clearing the restaurant by its floor route, its counters and pot rack checked
for reach, and the campus by both routes). The rig checks also sweep
every drawn frame of every move against the face, keep his head within 8
degrees of his body, check every act moves without a jump, stand his feet on
slopes to 30 degrees and land every act without a snap; the render checks
place thoughts off his face, draw props between steps and throw sweat away
from it. The browser check boots the scene, runs, jumps and idles under the
keyboard, confirms Hammer's screen height at two aspect ratios, fits the HUD
at 1280 by 800, 390 by 844 and 844 by 390 with the touch pad on the phones
and the break card clear of his face, forces WebGL and the no-art fallback;
the run check plays the lobby from the start card through the pepper, a punch
clock, a life lost in the shaft, a break, the stash and the exit's tally into
the restaurant, then loses its last lives down the truck well and tries again
from the lobby; the shift check walks the lobby into the restaurant with the
pepper carried, stands on a flat-top and in the walk-in, waits out the
swinging door, rides the campus's conveyor up and walks through the LIBRARY
doors into "Shift over"; the moves browser check
swings, bonks a cart, fires and splats snot, towels off and smashes, and
checks the sounds; the acts browser check waits for the watch check, the tap
and the harrumph, lectures, takes the two pips' hits and the lost life, and
stands on the grand staircase; the cast browser check jumps the first
bellhop's cart and bonks it back into him, knocks a rushing server down with
the shatter, freezes a staffer and schools a student with the lecture, swats a
plane, draws the projector ambush and its coffee, and bowls a bellhop with the
shield. The boards land under `artifacts/`:
`hammer-clips.png` (the clips, then every move and act), `hammer-moves.png`
and `hammer-acts.png` (each in ten frames, half again as large),
`hammer-slopes.png` (standing and walking on five slopes, both ways),
`hammer-heads.png`, `hammer-costumes.png`, `objects.png` (the pickups and the
crates, fresh and spent), `lobby-look-1..6.png` (the desk, the sofas, the
shaft and the stairs, the mezzanine over the floor route, the tables, the
corridor and the exit), `stash.png`, `cast.png` (every person in every act),
`cast-fx.png` (the burst, the stars, the hat, the glass, the cup, the plane,
the puddles and the confetti), `cast-lobby-1..6.png` (the cast in its six
scenes), and `restaurant-look-1..6.png` and `campus-look-1..6.png` (each
venue in six frames: `restaurant` and `campus` in the board list); the checks also save `run-*.png`, `moves-*.png`, `acts-*.png`,
`cast-*.png`, `hud-*.png` and `veil-pause-*.png`. A third
argument to `look-boards.mjs` names the boards to render, comma separated.

## Validation

```powershell
npm run typecheck
npm run test:game
npm run build
```

The 72 game checks (47 in `gameplay.check.mjs`, 25 in `hungry.check.mjs`)
cover protected files, mallet hits/misses, immediate voice
scheduling and immunity, checkpoint recovery, projectile single-hit behavior,
distinct rewards, seeded pickup placement, all passages and supply routes,
hospitality behavior, paper telegraph/duck/swat/contact, and boss combo rules,
refills and exit lock. Rig checks cover the untouched rest pose, face clearance
for every drawn pose (now including snot, towel, watch check with a far-arm
probe and a collar check, foot tap and the squatting slam), the mallet arc,
planted feet through the squat (including every drawn slam frame on the
ground), the mallet meeting the floor at the slam in both directions, and the
banquet dive (face clearance at every extension and reach, the far hand at
tabletop height); mechanic checks cover snot charges, hot snot, puddle slips,
lectures and the super smash landing. Line checks cover the single table (only
the six recordings carry clips), the spoken-or-thought caption switch, student
greetings, captions staying in step with the voice, and placement of thoughts,
recording captions and the damage line across the whole view. Idle checks
cover the watch, tap and harrumph timing, cancellation by input, staff, paper
and the pig, spoken captions surviving the harrumph, and reset on a new level. Voice checks cover supplied-file integrity, shuffled
target pools/crossover, chance skips, cooldown/no overlap, actual event triggers,
and damage priority. A physics playthrough clears the extended route geometry
with staff active; paper timing is tested separately. Another playthrough
clears the full boss using movement and attack inputs with three lives intact.
Hungry Hungry Hammer checks cover the food physics, waves, the cart and the
specials, tap and charged reach, held and mashed buttons, eating, the check,
the to-go box, combos, rivals' reactions and anger, every payback, the server
and the bonk, the 60-second round, grades and rewards, and the engine host:
the door round trip with rewards, door conditions, practice records and
pause.

For browser checks, use installed Chrome or Playwright's bundled Chromium:

```powershell
$env:BROWSER_SMOKE_CHANNEL='chrome'
node scripts/browser-smoke.mjs http://127.0.0.1:8080/ artifacts/game-dev.png
node scripts/game-browser-check.mjs http://127.0.0.1:8080/ --poses
node scripts/surroundings.check.mjs http://127.0.0.1:8080/
node scripts/start-screen.check.mjs http://127.0.0.1:8080/
node scripts/pig-boss.check.mjs http://127.0.0.1:8080/
node scripts/voice-browser.check.mjs http://127.0.0.1:8080/
node scripts/quest-browser.check.mjs http://127.0.0.1:8080/
```

These checks capture desktop, portrait and landscape views, character actions,
the idle watch check, the super slam (development builds), all venue
selectors, paper defense, a complete boss fight, boss phone HUD, pause and ten
touch controls. `--poses` also renders a pose board: every move, the watch
check, the foot tap, the slam frame by frame, the banquet dive and thought
bubbles at the view edges. The quest check plays a practice round (dive,
bonk, duck, pause, phones, tally, stored best) and, in development builds,
the BUFFET door round trip in a real run. Repeat against production preview on port 8081,
omitting `--poses`, which imports the development renderer. Captures and verdicts
are saved under `artifacts/`. Voice browser checks use actual Web Audio decoding
and playback during student and pig encounters, and verify damage, pause and mute.
