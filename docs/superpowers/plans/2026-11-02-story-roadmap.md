# Hammer Time story roadmap: five phases to 1.0

Written 2026-11-02 for the owner and for the execution sessions. The design it
carries out is `docs/superpowers/specs/2026-11-02-hammer-time-story-design.md`
(the spec), approved section by section the same day. This document says what
is built in which order, what each phase depends on, what the owner sees at the
end of each, and which phase has its detailed plan.

Every phase is built on Claude Opus 5.5 at extra-high effort from a detailed
plan written with `superpowers:writing-plans`, test-first, playable at every
step, on the branch `claude/hammer-pass`, and ends green on the spec's §19
checks with a report, look boards, a README update, the design's "As built"
notes and a handoff for the next phase. Only Phase 1 is planned in detail now
(`docs/superpowers/plans/2026-11-02-story-phase-1.md`); Phases 2 to 5 get
their plans in a Fable session when their turn comes, because the 3D spike, the
owner's play-tests and the paintings change what they contain (spec §18, §20
decision 18).

## The order, and why

```
Phase 1  Act 1 finished   1a the spine, the home screen, the look pass
                          1b SAT, the music, Settings, the controller
Phase 2  Act 2            the 3D spike first, then 2-1 to 2-4
Phase 3  To Basel         3-1, 3-2 with the French table, 3-3
Phase 4  Basel            3-4, 3-5 in scrubs, 3-6 and the ending
Phase 5  1.0              the epilogue, the awards, the last polish
```

The story is played in order, so it is built in order: each phase ends with
the game playable from the start up to the end of that phase, with the next
act's first stop shown locked on the strip. Nothing a later phase needs is
built early except what every phase shares, which is all in Phase 1a: the
levels that unlock, the save, the snapshot, the journey strip, the home screen,
the story cards and the look pass. A later phase adds its levels to the tables
Phase 1a creates; it never reopens the spine.

## Phase 1: Act 1 as a finished chapter

**What the owner sees at the end:** the game opens on Hammer, live, insulting
you; the journey strip runs along the bottom; the email, SAT and Fare Darts at
gate B7, then the hotel's four venues as built, the Bonvoy phone card and "Act
1 · The Trip · complete"; the journey saved in the browser; music everywhere;
Settings with two volumes, a controller and the keys; the floor's edge where
the dark band was; everything crisp at 1920 by 1080; the Service Record. Work
the whole shift and both side quests exactly as today. 2-1 on the strip,
locked, with "Act 2 is coming" where Clock in would be.

**Two shippable halves** (spec §18):

- **1a, the spine and the look:** the level table and the journey's save
  (`hammer-time-journey`), three lives a level, the snapshot restored by Try
  again, the strip with finished, next and locked stops, the live home screen
  with the idle beats and the twelve insults, the email card, the story cards
  between levels, Act 1's ending, Work the whole shift kept whole, the floor
  band fixed by reframing and drawn floor edges, ultra by default on a desktop
  GPU, every painting crisp at 1080p, the cheap deferred minors.
- **1b, the prologue and the sound:** SAT (the level, its cast, its lines, the
  gate door into Fare Darts, the boarding clock, its paintings), the gate's
  paintings cut in, one song a place and music under every card, the Hammer
  down sting and the act fanfare, Settings (two volumes, the controller, the
  keys, quality), the Service Record.

**Asked of the owner when 1a starts:** the merge of `claude/hammer-pass`
(R5 Fare Darts and the towel) into `main`, and the four gate paintings
(prompts 1 and 2 in `art/outgoing/batch-r5-codex.txt`, unchanged). **Asked
when 1b starts:** the SAT paintings
(`art/outgoing/batch-story-phase1-codex.txt`). Codex runs while the session
builds; a painting that is late never stops a level (stand-ins draw).

**Ends with:** the §19 checks green at 1920 by 1080, 1280 by 800, 390 by 844
and 844 by 390; look boards for SAT at three camera positions, the skycap, the
TSA agent, the home screen; the production build smoked; README; "As built"
notes on the spec's §4 to §7, §13 to §15; the handoff for Phase 2.

**Plan:** `docs/superpowers/plans/2026-11-02-story-phase-1.md` (in full).

## Phase 2: Act 2, Status Crusade

**What the owner sees at the end:** the hotel at night. 2-1 the lobby relit
with the night crew, the keycards and the tiers, the M CLUB open and its
lounge table (a new Side quests card), the stairwell; 2-2 the tower climb with
the carts, the ice machines, the chute and the housekeeping supervisor; 2-3 the
fourteenth-floor hallway in third person with the mobile key failing three
times; 2-4 Lifetime Titanium guy in the suite, twelve hits in three phases,
the night ended Lifetime Titanium. The home screen's scene becomes the lobby
at night once Act 1 is done.

**The spike comes first** (spec §12.4): a throwaway three.js corridor on a
second canvas under the React HUD, Hammer as a flat cut-out with a chase
camera, A stepping him left; its verdict (three.js, or the drawn perspective
corridor as the fallback) is written into Phase 2's plan before 2-3 is
planned. The spike's code is never kept.

**Depends on:** Phase 1 (the spine, the night scene on the home screen, the
tables' side-quest cards); the Phase 2 paintings of spec §16 (`cast/guard`,
`cast/housekeeper`, `cast/titanium`, the lounge, the tower, the suite's
Blender render painted over, Hammer's back view and the cast's back views);
Blender 5.2 on the laptop for the hallway's set and the suite's render.

**Ends with:** the §19 checks, with a pure-sim check file for each of the four
levels, the supervisor and Lifetime Titanium guy beaten by a scripted driver
and lost by a masher, the back-view frames' face-free check, the chase camera's
A-left check in the browser; boards for every new level, cast member, boss
phase and the night home screen; README; "As built" on §8 and §12; the handoff
for Phase 3.

**Plan:** written in a Fable session after Phase 1 ships and the spike's
verdict is in.

## Phase 3: the way to Basel

**What the owner sees at the end:** 3-1 row 52 in third person, three lanes up
the aisle against the drinks cart, the seatbelt sign and the purser; 3-2 Paris,
the hotel with the lift built for one, the street, bonjour, and the French
table at the brasserie (a new Side quests card, `hammer-time-best-french`) with
the waiter; 3-3 the 14:02, the station at a dead run on its own 120 s clock,
then the coaches 18 to 1 in motion with the conductor at the connecting doors.

**Depends on:** Phase 2 (the 3D level's way of working, decided by the
spike and built once in 2-3); the Phase 3 paintings of spec §16 (the cabin's
Blender set, the purser and the attendant, Paris's walls and people, the
brasserie, the station and the carriage from Blender renders painted over, the
conductor).

**Ends with:** the §19 checks (three new level checks, the purser, the waiter
and the conductor beaten and lost, the French table's round by its drivers),
boards, README, "As built" on §9, the handoff for Phase 4.

**Plan:** written in a Fable session after Phase 2 ships.

## Phase 4: Basel

**What the owner sees at the end:** 3-4 Basel in Tattoo week, the four errands
with the parade across every one of them, the pipe bands, the drum corps, the
drill team, the motorcycles and the drum major; 3-5 the Basel office's skills
lab in scrubs with its hazards, cast and lines (expansion §9); 3-6 the
replacement in the training room, fifteen hits in three phases, the ring
light as heat, the video on the screen smashed three times, and the final
blow with "They need to get fired." The game can be finished.

**Depends on:** Phase 3; the Phase 4 paintings of spec §16 (Basel's bridge
and Marktplatz from Blender renders painted over, the pipers, drummers, drill
team and drum major, the office's walls and people, the scrubs costume layer,
the training room, the replacement and its sheet).

**Ends with:** the §19 checks (three new level checks, the drum major and the
replacement beaten and lost, the scrubs costume through the rig checks),
boards, README, "As built" on §10 and §11.1, the handoff for Phase 5.

**Plan:** written in a Fable session after Phase 3 ships.

## Phase 5: 1.0

**What the owner sees at the end:** the epilogue's eight cards over painted
renders, ending "Milwaukee. Monday." "Obviously.", the credits with the kid in
the front row, the Buc-ee's booth as the home screen's scene once the credits
have rolled; the awards in his voice on the home screen's tools; "Play the
night straight through" and "Play the tour straight through" on their act
headers; food plates on the counters of 1-2, 1-3, 3-3, 3-4 and 3-5; the
slimmer stats panel on short screens; the last of the deferred minors; the
final review of the whole game.

**Depends on:** Phase 4; the Phase 5 paintings of spec §16 (the epilogue's
backdrops, and the key art if the owner wants a painted first frame).

**Ends with:** the §19 checks for everything at once, the whole journey played
start to finish by the scripted drivers in one run, boards for the epilogue
and the Buc-ee's home screen, README, "As built" on §11.2 and §15, a 1.0
report. No handoff: a 1.1 list of what was left.

**Plan:** written in a Fable session after Phase 4 ships.

## The art schedule

The owner makes the paintings with Codex from paste-ready prompts
(`art/outgoing/batch-story-phase<n>-codex.txt`), each with its brief
(`art/outgoing/batch-<n>-story-phase<n>.txt`). The asks come at the start of a
phase so Codex runs while the session builds, and a level is never held for a
painting: stand-ins draw until the painting is cut in, and the handoff for the
next phase lists what is still unpainted.

| Phase | Asked at its start | Spec |
|---|---|---|
| 1a | the gate's four (`batch-r5-codex.txt`, already written) | §15 |
| 1b | SAT's walls, mid and fore pieces, the skycap, the TSA agent, the SAT sheet | §16 |
| 2 | the guard, the housekeeper, Lifetime Titanium guy, the lounge, the tower, the suite, the back views; Blender: the hallway's set, the suite's render | §16 |
| 3 | the purser, the attendant, Paris, the brasserie, the conductor; Blender: the cabin, the station, the carriage | §16 |
| 4 | Basel's bands and streets, the office, the scrubs layer, the training room; Blender: the bridge, the Marktplatz | §16 |
| 5 | the epilogue's backdrops; the key art if wanted | §16 |

Blender work (spec §12.2, §12.5) is done by the execution session on the
laptop's RTX 4070 (`%LOCALAPPDATA%\Programs\Blender Foundation\Blender 5.2`),
never by the owner: the sets exported as glTF with draco, the renders handed
to Codex as the image to paint over.

## The owner's part

- **At the start of Phase 1a:** say yes to the merge into `main`, and run the
  two gate prompts in Codex.
- **At the start of each phase:** run that phase's Codex prompts (the handoff
  names them).
- **At the end of each phase:** play it in the browser panel the session opens;
  what is not right is fixed before the next phase is planned.
- **Phases 2 to 5:** a Fable planning session before each, short, from the
  spec and the previous phase's report.

## Not built in 1.0

The dining-hall, brisket-counter and cafeteria tables; London and the grand
tour; the training video; Unreal; voice cloning (spec §1, §17, §20). The
Buc-ee's rest stop is shown in the epilogue, not played.
