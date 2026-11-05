# Phase 2b: Act 2 is complete

Act 2 plays from 2-1's card to "Act 2 · Status Crusade · complete" on a saved journey. The fourteenth floor is the game's first 3D level, and the suite ends the act with the fight against Lifetime Titanium guy. Act 3 shows as coming on the strip.

All of it is on the working branch, `claude/hammer-pass`. `main` has not moved and waits for your yes.

All 716 automated tests pass. All eighteen browser checks pass on the dev server, at the screen sizes they name. The production build passes the night, journey, hall and suite checks. Its quick smoke check raised one flag, the known one: it looks after one second, too soon for the production page to finish loading at phone size, and reports the game's canvas as missing. The hall and suite checks load that same size and see it. A fresh reviewer read the whole half and found three problems. I found a fourth in their notes that I judged worse than they did. All four are fixed, and each has a test that failed first.

## What I could not check

- **The sound.** I cannot hear. The hall's hum and the suite's drive were measured for loudness only, so you are the first to hear them.
- **Your NVIDIA card.** The checks run on the laptop's built-in graphics, where the hall settles at medium quality and holds over 100 frames a second. It has never been measured on the RTX 4070.
- **How it feels.** Only a scripted player has fought through these levels. The numbers that set how hard they are stand until you play them.

## What to try

- **The fourteenth floor.** W walks forward, S walks back without turning him, A and D step sideways, Space jumps, H swings. On a phone the forward button runs.
- **What is in the way.** Housekeeping carts roll across from their doors: jump them or step out of their lane. Room doors swing out: the handle turns first, then the door stands open like a wall for a moment. The floor is wet at the ice alcove. Two bellhops wait out of sight by the elevators.
- **Room 1417.** Three swings on the reader at the end: "Mobile key failed.", "Mobile key failed AGAIN.", "Elite members don't wait."
- **The living room.** He swings the briefcase and lobs three apples at a time. The mallet bats an apple back for 100 points.
- **The bedroom.** He bounces on the king bed, out of reach at the top. You can bounce on it too, 1.3 times your jump. Bellhops arrive with carts and keycards worth 200 points.
- **The balcony.** Low bottles that leave puddles, and every seven seconds a lunge that takes up to ten cans ("Let's split it evenly."). Each hit gives back up to ten of what he took.
- **Over the rail.** The splash, "...Ambassador.", 5,000 points, "Resort fee THIS." Then the Bonvoy review, "TITANIUM. Lifetime.", and the act's card.

To play a level on its own, the strip on the home screen lists every stop you have reached.

## One painting still wanted

Prompt 5 is the suite's three walls: `art/outgoing/prompt-5-suite.txt`. Paste it into Codex when you like. Until those paintings land, the suite shows the Blender renders, which is why its rooms look plainer than the rest of the game. Nothing waits on it.

## What the reviewer found, now fixed

1. **Things people throw vanished after the hall.** Anything flung stayed invisible for the rest of the session. They now come back with everything else.
2. **Lifetime Titanium guy could leave his room.** His lunge could carry him off the balcony, so "over the rail" could happen at the bed. He now stays in the room he is fighting in.
3. **A lost life kept the cans he took.** The fight restarts, so now your cans come back too. They are not scored a second time.
4. **The hall redrew its whole canvas size every frame, about 114 times a second.** That throws away work and can cost picture quality on real graphics cards. It now resizes only when the window does.

## Decisions I made while building it

Each one is cheap to change if you disagree.

**The hall's picture**

- The 3D canvas sits under the game's canvas instead of replacing it. Hammer's thoughts, the comic words and the speech stay in the same system as every other level. Without this "Mobile key failed." would have gone silent.
- The hall is built so that A goes left and D goes right with no mirroring. The plan's direction would have swapped them.
- The hall extends 4 meters behind his start, or the camera would stand outside the building at his first step.
- The camera follows a little over half of his sidestep. If it followed all of it, A and D would not move him on the screen.
- People are drawn over the set, far to near. A wall can never cut through anyone. The cost is that nobody can stand behind anything in the hall.
- His back is one painting with its head layer cut to show only the back of his head. His face never appears from behind.
- From behind, a walk is his legs shortening as they come through. The plan's hip rotation looked like a scissor kick.
- Anyone 0.8 meters behind him disappears from the picture, or they fill the screen. A guest may pop out of view as you pass.
- An idle beat, the snot, the towel and the lecture cut to his profile, along with being hit and the smash. His back cannot show them, and his face is the joke. You may want fewer of these cuts.
- The hall lowers its own quality if it falls under 55 frames a second, whatever the screen's rate. On a 120 Hz screen the plan's rule would have dropped straight to the lowest quality over one stutter.
- If the 3D view fails partway through a session, the hall plays flat until you reload. That is the spec's fallback.
- The boards and the start picture come from screenshots of the running game.

**The hall's rules**

- The third cart comes from 42 meters, where there is a door, instead of 41.
- The plan gave no timings for the swinging doors, so I set them: at 9, 21, 36, 57 and 69 meters, every 8 to 11 seconds, alternating sides.
- A bonked guest walks off down the hall like staff do. It costs no new animation.
- On a gamepad the stick counts as forward only past 60 percent, so steering does not make him hop.
- A swing at 1417's reader counts if it lands within reach, whether or not it touches anything else.
- A solid wall at the end stops him at the door.
- On a phone forward runs, and there is no Run button, because four arrows fit where five buttons did not. A phone player cannot walk slowly down the hall.
- The alcove's opening is between 29 and 31 meters and the room doors keep clear of it.

**The suite**

- The furniture stands where the rendered rooms have it, not at the plan's numbers. The plan had the minibar on the balcony and the spec has it in the living room.
- The minibar's can crate hangs above it, because at the planned height it stopped him walking between rooms.
- He cannot be hit for 2 seconds after moving rooms. Without that, a scripted fight ended in 20 seconds. You should judge how long the fight feels.
- The camera keeps to the room he is in, unless you stayed behind. It never loses you, so the next room may peek in.
- The Blender renders stand in as the walls until your paintings land.
- He bounces by his own rule on the bed, since he is not built like Hammer. It looks the same.

**The checks and the install**

- There is no separate board for him: the suite's boards show his states.
- The plan's way of installing the 3D library was not safe, as below.
- Five test or check details: the night check now reads the new "11:40 pm" caption, one suite test keeps him out of the bottles, some tests run with the cast on, the walking test checks his lowest foot rather than both, and the hall's speed check asks for 55 frames a second, the same floor its quality rule holds.

**Things only you can judge**

- His back painting, the boards and the songs are yours to accept.
- The difficulty numbers stand until you play: the key's reach, the grace periods and the cart speeds.

**A developer's setting only**

- With the "no art" test setting the hall shows no Hammer. No player can reach it, so it stays.

The first half's decisions are in `docs/superpowers/report-2026-11-04-phase-2a.md`. The full record of every decision is in `docs/superpowers/plans/2026-11-04-story-phase-2-ledger.md`.

## Small things left alone

- Hammer's profile lags the 3D camera by one frame.
- If the 3D view fails to load at one exact moment, it stays in memory and the hall plays flat. Leaving the game does not free it.
- A 3D view lost in the first instant of loading goes unnoticed.
- The wet floor slips him anywhere across the hall's width, though the puddle is drawn on part of it.
- An open door's picture and the wall it makes disagree by about 20 centimeters and half a second.
- A keycard dropped on the bed bounces like a pogo stick.
- From the first half: a snot rocket as the supervisor's last hit gives no cart to ride up; bellhops drop their keycards again after a lost life; one internal counter is not reset between runs.

## An incident you should know about

The plan said to install the 3D library with a particular command. That command rebuilt the project's whole set of installed packages and failed halfway. I put every package back by hand and checked each one against the project's list. Nothing of yours was affected, and the game has run on the restored set through every check since. The Phase 3 handoff warns the next session.

## What is next

- **Your yes for `main`:** when you have played it and are happy, say so and `main` will move.
- **Phase 3, the way to Basel:** the flight, Paris with the French table, and the train. The handoff is `docs/superpowers/handoff-2026-11-05-phase-3.md`.
