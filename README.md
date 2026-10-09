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
  touchdown with a floor shockwave and "HAMMER TIME!"
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

## Start screen

The full-screen launch menu shows Hammer facing the Pink Menace, using the
approved original cutouts. Four illustrated starting-point buttons select the
full shift, restaurant, campus or pig practice. Clock in launches that choice.
The menu includes signature pickups, a stored personal best, mute and an
expandable How to play section. The game HUD and touch pad appear after launch.
Keyboard activation of menu buttons selects or opens that control without
accidentally starting the game; Enter or Space outside a control starts the
selected run. Small phones can scroll the menu.

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

Five additional supplied recordings preload alongside it. Staff mallet contacts
have a 35% chance of a line: usually "They need to get fired" or "They can't
take feedback," with a 20% crossover chance to the student pool. Student
encounters and successful paper swats have a 50% chance of "They got a problem,"
"Go grow some man balls" or "They get all butt hurt." Accepted pig bonks and
snots have a 45% chance of any of the five. Each pool cycles a shuffled bag before
repeating; cooldown is at least 3.5 seconds, and lines never overlap or queue.
Damage interrupts a taunt immediately with "absolute bullshit." Muting and
pausing stop both kinds of voice. Optional clip failures never block starting.

Original M4As are preserved under `public/voice/source/`. Derived mono WAVs trim
only outside silence and normalize peaks for consistent volume. File mapping,
processing details, durations and hashes are in `public/voice/manifest.json`.

Generation prompts, reference details, crop coordinates and asset hashes are
in `public/scenery-assets.json` and `public/boss-prop-assets.json`.

## Validation

```powershell
npm run typecheck
npm run test:game
npm run build
```

The 33 game checks cover protected files, mallet hits/misses, immediate voice
scheduling and immunity, checkpoint recovery, projectile single-hit behavior,
distinct rewards, seeded pickup placement, all passages and supply routes,
hospitality behavior, paper telegraph/duck/swat/contact, and boss combo rules,
refills and exit lock. Rig checks cover the untouched rest pose, face clearance
for every drawn pose, and the mallet arc; mechanic checks cover snot charges,
hot snot, puddle slips, lectures and the super smash landing. Voice checks cover supplied-file integrity, shuffled
target pools/crossover, chance skips, cooldown/no overlap, actual event triggers,
and damage priority. A physics playthrough clears the extended route geometry
with staff active; paper timing is tested separately. Another playthrough
clears the full boss using movement and attack inputs with three lives intact.

For browser checks, use installed Chrome or Playwright's bundled Chromium:

```powershell
$env:BROWSER_SMOKE_CHANNEL='chrome'
node scripts/browser-smoke.mjs http://127.0.0.1:8080/ artifacts/game-dev.png
node scripts/game-browser-check.mjs http://127.0.0.1:8080/ --poses
node scripts/surroundings.check.mjs http://127.0.0.1:8080/
node scripts/start-screen.check.mjs http://127.0.0.1:8080/
node scripts/pig-boss.check.mjs http://127.0.0.1:8080/
node scripts/voice-browser.check.mjs http://127.0.0.1:8080/
```

These checks capture desktop, portrait and landscape views, character actions,
all venue selectors, paper defense, a complete boss fight, boss phone HUD,
pause and ten touch controls. Repeat against production preview on port 8081,
omitting `--poses`, which imports the development renderer. Captures and verdicts
are saved under `artifacts/`. Voice browser checks use actual Web Audio decoding
and playback during student and pig encounters, and verify damage, pause and mute.
