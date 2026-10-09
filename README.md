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
| Snot rocket              | F, after collecting pepper from a ! crate |
| Towel wipe               | T, while standing and warm                |
| Super smash              | Q, at 10 charge                           |
| Staff stash              | Down while standing on its marked cart    |
| Pause                    | Escape or P                               |

Touch controls support simultaneous movement and actions. Landscape gives a
larger playfield on phones.

## Routes and surroundings

The shift runs through a hotel lobby, restaurant service area and campus dining
commons, then a stuffed-pig boss arena. The title selector starts any venue or
boss practice directly. The three regular routes are roughly twice their
previous length, with multiple checkpoints and a 420-second time allowance.

Servers warn before rushing. Hotel staff take an extra hit and can be knocked
along the floor. Office workers remain a smaller part of the cast. Nineteen
adult college students across the routes exchange sarcastic dialogue with
Hammer and telegraph paper airplanes. Student bodies stay outside combat;
the planes are hazards you can duck, jump over or swat with the mallet.

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
removes the snot power. The exit stays locked until the pig is defeated. Boss
practice lets you learn the timing without replaying the full shift.

## Character and audio

The original face and Affliction shirt textures are unchanged. Animation moves
limbs around that artwork. The mallet drawing and collision use the same joints.
The approved photographic Coke Zero, nuts, Buc-ee's and towel assets are also
unchanged. PNG masters and smaller gameplay WebPs are retained.

Coke Zero reduces heat; 100 cans earn a life. Nuts add three smash charge.
Buc-ee's gives ten seconds of invincibility. Running, jumping and attacking
build heat. Wiping cools Hammer while hazards continue moving.

`public/absolute-bullshit.mp3` is untouched. The derived `damage-voice.wav`
removes leading/trailing silence, preloads on the title screen, and decodes
after the first interaction. Accepted damage immediately starts Web Audio
playback, ducks music and suppresses repeats during immunity. Staff, paper and
boss contacts share this path. Pause, mute and teardown stop the voice.

Generation prompts, reference details, crop coordinates and asset hashes are
in `public/scenery-assets.json` and `public/boss-prop-assets.json`.

## Validation

```powershell
npm run typecheck
npm run test:game
npm run build
```

The 22 game checks cover protected files, mallet hits/misses, immediate voice
scheduling and immunity, checkpoint recovery, projectile single-hit behavior,
distinct rewards, seeded pickup placement, all passages and supply routes,
hospitality behavior, paper telegraph/duck/swat/contact, and boss combo rules,
refills and exit lock. A physics playthrough clears the extended route geometry
with staff active; paper timing is tested separately. Another playthrough
clears the full boss using movement and attack inputs with three lives intact.

For browser checks, use installed Chrome or Playwright's bundled Chromium:

```powershell
$env:BROWSER_SMOKE_CHANNEL='chrome'
node scripts/browser-smoke.mjs http://127.0.0.1:8080/ artifacts/game-dev.png
node scripts/game-browser-check.mjs http://127.0.0.1:8080/ --poses
node scripts/surroundings.check.mjs http://127.0.0.1:8080/
node scripts/pig-boss.check.mjs http://127.0.0.1:8080/
```

These checks capture desktop, portrait and landscape views, character actions,
all venue selectors, paper defense, a complete boss fight, boss phone HUD,
pause and nine touch controls. Repeat against production preview on port 8081,
omitting `--poses`, which imports the development renderer. Captures and verdicts
are saved under `artifacts/`.
