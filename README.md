# Hammer Time

Personal hospitality platformer. Not for sale or distribution.

```powershell
npm install
npm run dev
```

Then open http://localhost:8080

On Windows, `./startup.ps1` starts a background preview. On Linux or macOS,
`sh startup.sh` starts the same preview. Both use the existing app environment
wrapper and leave the Grok platform integrations in place.

## Controls

| Action                 | Keyboard                                  |
| ---------------------- | ----------------------------------------- |
| Move                   | Arrows or A / D                           |
| Jump (hold for height) | Space or Z                                |
| Run                    | Shift                                     |
| Crouch / slide         | Down or S; hold while running to slide    |
| Mallet swing           | H or X                                    |
| Snot rocket            | F, after collecting pepper from a ! crate |
| Towel wipe             | T, while standing and warm                |
| Super smash            | Q, at 10 charge                           |
| Staff stash            | Down while standing on its marked cart    |
| Pause                  | Escape or P                               |

Touch controls support simultaneous movement and actions. Landscape gives a
larger playfield on phones.

## Venues and scale

The shift runs through a hotel lobby, restaurant service area and campus dining
commons. The title-screen venue selector also starts either later venue for
practice. Servers warn before rushing; hotel staff take an extra hit and can
be knocked along the floor. Office workers remain a smaller part of the cast.
Adult college students are noncombat passersby: Hammer talks down to them and
they answer back through dialogue bubbles.

Hammer and staff occupy more of the screen. Foreground counters, overhead
service passes and climbable shelves replace the old scattered brick patterns.
The 32-unit passages fit the 30-unit crouched body; releasing Down underneath
one keeps Hammer low until there is room to stand. Shelf routes reach elevated
supplies, and overhead crates leave enough room to walk beneath them.

## Character and game rules

The approved face and Affliction shirt use the original character textures.
Animation clips and transforms the limbs at runtime; it never generates new
faces or expressions. The mallet's rendered head and collision path share the
same joint angles. The towel and pickups have photographic cutouts, with small
WebP versions used during play and PNG masters retained for future work.

Coke Zero reduces heat; 100 cans earn a life. Nuts add three super-smash charge.
Buc-ee's gives ten seconds of invincibility. Running, jumping and attacking
build heat. Wiping cools the character, while enemies continue to move.
Each venue has a checkpoint and the staff stash preserves collected powers
when returning to the lobby. Hero, pickup and towel artwork from the approved
first pass is byte-for-byte unchanged. New cast and backdrop generation notes
are in `public/scenery-assets.json`.

`public/absolute-bullshit.mp3` is untouched. `damage-voice.wav` is a derived copy
with the initial silence and trailing silence trimmed. It is fetched on the
title screen and decoded after the first interaction. Accepted damage starts a
Web Audio source immediately, ducks the music and prevents repeated triggers
during immunity. Pause, mute and teardown stop the voice.

## Validation

```powershell
npm run typecheck
npm run test:game
npm run build
```

`test:game` covers protected source files, mallet contact and misses, damage
voice scheduling and immunity, checkpoint recovery, projectile single-hit
behavior, bonus-room rewards, and completion of all three venues through physics.
It also verifies slide clearance, safe standing, climbable shelf routes, all
overhead supplies, hospitality behavior and noncombat student dialogue.

For browser checks, use the installed Chrome or Playwright's bundled Chromium:

```powershell
$env:BROWSER_SMOKE_CHANNEL='chrome'
node scripts/browser-smoke.mjs http://127.0.0.1:8080/ artifacts/game-dev.png
node scripts/game-browser-check.mjs http://127.0.0.1:8080/ --poses
node scripts/surroundings.check.mjs http://127.0.0.1:8080/
```

The interaction check captures desktop, portrait, landscape, and a large
character pose board under `artifacts/`. It tests quick taps, early pepper
pickup, all character actions, pause and touch layout. Run production preview
with `npm run preview` and repeat the smoke and interaction checks against port
8081 without `--poses` (the pose board imports the development renderer).
The surroundings check exercises all venue choices, crouch/stand and campus
banter, with ready-screen desktop and phone captures.
