# Phase 2a: the first half of Act 2 is in

The lobby at night and the tower are playable from 2-1's card to the door on the fourteenth floor. Clock in plays 2-1, then 2-2. The fourteenth-floor hall (2-3) still shows "Coming" on the strip until the second half.

Every automated check passed at the four screen sizes on the dev server. The production build passed the night and journey checks and the smoke check. A fresh reviewer read the whole change and found one problem worth fixing: a wet floor acted as a wall if you walked into it. That is fixed.

I cannot hear sound. The five new songs were only measured for loudness, so you are the first person to hear them.

## What to try

- **The lobby at 11:40 pm.** The card says the front desk has you as MEMBER. Pick up keycards from the furniture: Silver at two, Gold at four (a minute on the clock), Platinum at six.
- **The guard on the mezzanine.** His flashlight stops you for a second and costs nothing.
- **The M CLUB door.** It opens at Platinum and has its own table, room and best score. Lifetime Titanium guy walks the table and splits your plate. A bonk sends him away.
- **The stairs.** Press down at the stairs door to leave. The elevator stays shut below Titanium.
- **The tower.** Fourteen floors. Carts hurt from the side and carry you on top. Chutes drop you a floor for two seconds and no life.
- **The supervisor on floor 12.** She sends three waves of carts down the flight. Bonk her three times between waves. The door on fourteen is chained until she is down.

## Paintings in use

All your Codex paintings from this round are cut in and in the game: the guard, the housekeeper, Lifetime Titanium guy, the lounge room and its sheet, the tower's two walls and its sheet. No stand-ins remain in this half. Nothing new is needed from Codex yet. The suite's prompt comes with its renders in the second half.

## Decisions the plan took for you

1. Hammer's back in the hall is animated from the one back painting you approved. No frame paintings are needed. (Second half.)
2. The hall plays as the same 2D game with a sideways step added, and the 3D only draws it. Without 3D support it plays flat. (Second half.)
3. Leaving 2-1 takes the down key, so walking past the stairs on the way to keycards never ends the level.
4. The lounge reuses the banquet's table painting. Only the room and the food are new.
5. The guard's flashlight is a telegraphed one-second stun that costs no patience.

The plan's full list of sixteen is in the plan file under "Decisions taken for the owner". It is `docs/superpowers/plans/2026-11-04-story-phase-2.md`.

## Decisions I made while building it

Each one is cheap to change if you disagree.

- **Tower layout.** Each landing runs from one wall to the stairwell, and flights rise back to the middle. The plan's layout had floors that could not be walked.
- **Cart size.** Carts are taller than planned, because the painted cart looked like a toy at the planned size. They stop at the height that can still be jumped uphill.
- **Floor plates.** Every floor has a brass plate, placed where no flight runs.
- **Housekeepers.** A knocked-out housekeeper falls flat on her back like a plank, because her painted skirt would go through the floor if she sat.
- **Beating the supervisor.** If you lose a life after beating her, she comes back and the door re-chains. This matches the gift shop's pig.
- **Keycards.** Keycards on the furniture stay taken after a lost life. Gold's minute stays on the clock too.
- **Water and stun.** The servers' ice water lands where you stood when they threw it. Walking into the guard while he shines costs nothing.

## Small things left alone

- A snot rocket as the supervisor's last hit gives no cart to ride up. The stairs are still walkable.
- Bellhops drop their keycards again after a lost life, so a lost life could help you reach a higher tier.
- One internal counter is not reset between runs. Nothing you can see depends on it.
