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
Hammer in the hotel lobby under the keyboard (arrows or WASD, Space or Z to
jump, Shift to run, Down to crouch and, at speed, slide). `&noart=1` runs the
art fallback path; `&board=1` exposes the look-board renderer.

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
  cart white and adds one smash charge.
- **Q, the smash:** with a full charge (ten bonks) he hops, plunges and slams
  the mallet into the floor as he lands; every cart within reach flies. The
  slam freezes for 0.08 s, runs at quarter speed for 0.25 s and punches the
  camera in.
- **F, C or K, the snot rocket:** three charges, one back every 1.5 s, half a
  second between shots and three in flight at most. It leaves just ahead of
  his nose, knocks a cart and splats, or lands as a puddle that dries in
  7 s. Hot snot (pepper, later) is faster and bigger and goes through a cart.
- **T, the towel:** with any heat, on the ground, he stands still, lets the
  mallet hang down in his right hand, brings the towel up in his left and
  wipes his face, flicks the sweat off and shines; heat drains fast. That hand
  and the towel are the one thing ever drawn over his face.
- **Heat:** running heats him, resting cools him, and jumps, swings and snot
  add to it. From 45 he sweats, from 80 he steams and runs slower, and near
  100 he boils over.

The look scene puts two practice luggage carts in the lobby and shows HEAT,
SNOT and SMASH under the title. It is a practice room: the smash starts full
and refills two seconds after each slam, which the game itself will not do.
Comic words (BONK!, HONK!, SPLAT!, HAMMER TIME!) are placed off his face every
frame, and particles that reach his face are dropped. Sound is the shipped
game's effects through its `AudioBus`, silent until the first key.

```powershell
npm run test:next
$env:BROWSER_SMOKE_CHANNEL='chrome'
node scripts/next-browser.check.mjs http://127.0.0.1:8080/
node scripts/moves-browser.check.mjs http://127.0.0.1:8080/
node scripts/look-boards.mjs http://127.0.0.1:8080/
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
determinism) and the move checks in `moves.check.mjs` (the feel table and the
hit-stop clock, move timing and priority, mashing, moves in the air,
crouched or sliding, heat and the towel, snot charges and puddles, the swept
mallet and once-per-swing hits, the smash's burst, facing left). The rig
checks also sweep every drawn frame of every move against the face. The
browser check boots the scene, runs, jumps and idles under the keyboard,
confirms Hammer's screen height at two aspect ratios, forces WebGL and the
no-art fallback; the moves browser check swings, bonks a cart, fires and
splats snot, towels off and smashes in the lobby, and checks the sounds. The
boards land under `artifacts/`: `hammer-clips.png` (the clips, then the four
moves), `hammer-moves.png` (each move in ten frames, half again as large),
`hammer-heads.png`, `hammer-costumes.png` and `lobby-look-1..3.png`; the moves
check also saves `moves-swing`, `-bonk`, `-snot`, `-wipe` and `-smash.png`.

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
