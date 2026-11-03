# Hammer Time story design: one story, three acts, Basel

Design spec, 2026-11-02, approved by the owner section by section the same day.
Written for the execution sessions (Claude Opus 5.5 at extra-high effort) that
have not seen the planning conversation. It sits on top of the rebuild spec
(`2026-10-10-hammer-time-rebuild-design.md`: its §2 hard limits, §5 rendering,
§6 Hammer, §8 the world, §10 HUD and shell and §15 testing stay binding) and
takes over from it everything about what the game is: the story, its levels,
its progression, its home screen, its music and its finish. The expansion spec
(`2026-10-09-hammer-time-expansion-design.md`) stays the source of the rules it
is cited for below (§7 status, §9 the skills lab, §6 the rival at a table, §10
music themes and staff tricks); where this spec and it differ, this spec wins.
The R4 and R5 designs describe the two side quests as built; this spec reuses
them whole.

## 1. The decisions (the owner's, 2026-11-02)

1. **One story, start to finish, in three acts played in order.** Finishing a
   level opens the next. Anything finished can be replayed. Nothing already
   built is removed; the game gains depth, not replacements.
2. **The ending.** The training video is scrapped. The final blow on his
   replacement lands with the recording "They need to get fired," and the kid
   is gone. The Basel office makes Hammer *Trainer for Life*, and the European
   training calendar is rewritten in his handwriting. At Buc-ee's his phone
   buzzes with the next trip ("Milwaukee. Monday." "Obviously."). The kid turns
   up once more, in the credits, in the front row of a training, holding the
   demo unit wrong.
3. **Three lives per level, and Hammer works for it.** Every level starts on
   its card with three lives and a full clock; Hammer down restarts that level
   from its card with nothing before it lost. The difficulty lives in the
   levels: the clock stays, the cast stays as tough as the owner tuned them
   (2026-10-15), every boss has health and phases, the boss levels 2-4 and 3-6
   have no punch clock, and there is no easy mode.
4. **The game is longer than a sitting.** A player comes back another day, so
   the journey is saved in this browser at every level's card, carries and all.
5. **The home screen is Hammer, live.** The engine draws the start screen as a
   real scene with him in it, animated, insulting the player in thought bubbles
   while they dawdle. One of the insults is "Did you play football without a
   helmet growing up?" The journey runs along the bottom as a strip of stops.
6. **The prologue is a short level at the San Antonio airport that ends in
   Fare Darts at gate B7.** The lobby's AIRPORT SHUTTLE door stays, so Fare
   Darts is still a side quest too.
7. **Act 3 is one straight line, every stop packed:** the flight, Paris, the
   14:02 train, Basel, the office. No London, no grand tour.
8. **Basel is Tattoo week:** the yearly Basel Tattoo, its parade across every
   errand on his list, and his indignation ("Don't these people work?"). Not
   Fasnacht, not the Rhine.
9. **The bosses:** the Pink Menace (Act 1, as built), Lifetime Titanium guy in
   the suite (Act 2), the replacement in the training room (Act 3). The small
   bosses: the housekeeping supervisor, the purser, the waiter, the conductor,
   the drum major. The list is §9 to §11.
10. **Phase 1 is everything that makes Act 1 feel finished**, built in two
    shippable halves (§18), with the awards and the slimmer phone panel left
    for the last phase.
11. **Laptop first.** The design targets 1920 by 1080 at 60 frames on a real
    video card; the phone keeps working but no longer decides the layout. No
    skimping on graphics.
12. **No Unreal.** The game stays a link that plays in the browser: PixiJS 8
    over the fixed-step sim, three.js inside the same page for the 3D levels,
    Blender on the laptop's RTX 4070 for the sets. Unreal would turn the link
    into a download, rebuild everything, and put his face into a 3D model.
13. **No voice cloning.** The six recordings are the only spoken lines; the
    owner asked and was told no (too few samples to pass as him, and a real
    person's voice is his to lend). Every other line is written.
14. **Hammer is here to work.** It is in his DNA; he will shame you with work.
    This is the north star beside the rules of §2.

## 2. Rules that bind every level (all still in force)

- **The face rule.** Nothing is ever drawn over Hammer's face box except his
  left hand for the towel wipe and the snot rocket. His face is never edited,
  tinted, filtered, masked or remade, in 2D or 3D. Head scale 0.26 for him and
  0.22 for every cast member; the mallet held in a fist out in front, never on
  the shoulder. Every new clip runs through the face-clearance check.
- **The Affliction shirt is his outfit.** Costumes only where a venue puts him
  in one: the banquet bib (as built), scrubs at the skills lab (3-5 and 3-6).
- **The six recordings in `public/voice/*` and `public/absolute-bullshit.mp3`
  are the only spoken lines.** Everything else is written: his thoughts,
  others' speech bubbles, cards and scenes. The recordings are spent where they
  land hardest: the taunt pools as built, "absolute bullshit" on every accepted
  hit, and "They need to get fired" forced on the final blow of 3-6.
- The products are the real pictures with their logos; each power-up keeps its
  one job (Coke Zero cools 25, three nuts fill the smash, Buc-ee's is a
  ten-second shield, the pepper is an extra hit and hot snot).
- The cast is painted like Hammer, pose-locked to
  `art/incoming/hammer/body-affliction.png`; stand-ins are placeholders, never
  polished; a missing painting never stops a level.
- Never modify `art/reference/`, `art/incoming/`, `public/absolute-bullshit.mp3`
  or `public/voice/*`. Never stage `package-lock.json` or
  `src/routeTree.gen.ts`.
- The app stays a TanStack Start app under `AGENTS.md`'s rules: no `.env`, no
  auth, no database; the renderer is client-only; the save is `localStorage`.
- The owner is not a developer: plain language, no emojis, decisive on
  technical matters, never asked to run commands, every decision made for them
  listed.

## 3. The story

**North star.** Hammer, mid-sixties, trains surgeons on medical devices and
treats everyone as a trainee. His life is hotels, restaurants, campuses and
Southwest planes, and he is rude to all of it. He is a status snob, a Coke Zero
man, a thief of other people's food, and the hardest-working person in any
room he walks into. It is his world; everyone else is living in it. In every
level the joke lands the same way: by the end, they are on his schedule.

**Prologue, San Antonio, July 11.** An email: "From: Basel office. Subject:
Your transition. Training is moving to video. Please come to Basel on the 14th
to discuss your transition." Thought: "Transition." He has a US training trip
on the books first, and nobody else can do it, obviously. SAT, the TSA line,
the concourse, gate B7, Fare Darts.

**Act 1, The Trip** (the same day; as built). The hotel lobby, the restaurant,
the campus, the gift shop and the Pink Menace. It ends with his phone buzzing:
"Marriott Bonvoy: Your status has been reviewed."

**Act 2, Status Crusade** (the same hotel, that night). The desk has him as
MEMBER ("System error"). Keycards raise him tier by tier; the M CLUB opens; the
elevators are reserved for Titanium members, so he climbs fourteen floors; the
fourteenth-floor hallway to room 1417, where the mobile key fails three times;
and Lifetime Titanium guy in the suite that should have been his. He ends the
night Lifetime Titanium, in the suite.

**Act 3, The Last Tour.** July 12, the flight: no Southwest, no A-List, a middle
seat in row 52, and the aisle to row 1 against the drinks cart. July 13 and
14, Paris: a hotel with a lift built for one, nobody serves him until he says
bonjour, and on the 14th the city closes for Bastille Day, so lunch at the one
open brasserie takes three hours. July 14, 14:02, the train to Basel, with the
station at a dead run and the conductor at every connecting door. Basel in
Tattoo week, the parade across every errand. July 15, the Basel office: the
skills lab in scrubs, then the replacement with the tablet and the ring light.
The video is scrapped, the kid is fired, Trainer for Life.

**Epilogue.** The Basel airport's Swiss side and French side, a complaint on
each. Home. Buc-ee's. The credits, the kid in the front row, the phone:
"Milwaukee. Monday." "Obviously."

## 4. Playing it through

### 4.1 The levels

| Code | Id | Level | Format | Boss |
|---|---|---|---|---|
| SAT | `sat` | San Antonio International (prologue) | left to right, ends in Fare Darts | none |
| 1-1 | `lobby` | Hotel lobby | as built | |
| 1-2 | `restaurant` | Restaurant | as built | |
| 1-3 | `campus` | Campus | as built | |
| 1-4 | `arena` | The Pink Menace | as built | the pig |
| 2-1 | `lobby-night` | The lobby at night | left to right (the lobby relit) | |
| 2-2 | `tower` | The tower | a climb | the housekeeping supervisor |
| 2-3 | `hallway` | The fourteenth floor | third person, 3D | |
| 2-4 | `suite` | The suite | side view, the fight only | Lifetime Titanium guy |
| 3-1 | `flight` | Row 52 | third person, 3D, three lanes | the purser |
| 3-2 | `paris` | Paris | left to right, ends in the French table | the waiter |
| 3-3 | `train` | The 14:02 | left to right in motion | the conductor |
| 3-4 | `basel` | Basel, Tattoo week | left to right | the drum major |
| 3-5 | `lab` | The Basel office | left to right, in scrubs | |
| 3-6 | `replacement` | The replacement | side view, the fight only | the replacement |
| (E) | | Epilogue and credits | shown, not played | |

Fifteen levels; finishing one opens the next; the epilogue plays after 3-6 and
again from the strip once seen. The side quests (`hungry`, `fares`) are never
locked.

### 4.2 A level

- **The card.** Every level starts on its card (the venue card as built: code,
  name, the act's status line in Act 2) with three lives, two patience pips and
  its clock: 420 s for a venue (SAT's clock reads as boarding time, 7:00), the
  pig fight's as built, the fight's own clock for 2-4 and 3-6 (§8.4, §11.1).
- **A lost life** works as built: the last pip's knockdown, a fall, or the
  clock out; he comes back at the last punch clock of the level with two pips,
  the full clock and the level's pickups and crates as laid out.
- **Hammer down** (no lives left): the card "Hammer down" with Try again and
  Journey. Try again restarts *this level* from its card with the run exactly
  as it was at that card: the snapshot of §4.3. Journey returns to the home
  screen.
- **Boss levels 2-4 and 3-6** are the fight only: no punch clock, no pickups
  beyond what the fight itself drops, three lives, the fight restarted whole
  on a lost life.
- **The exit** counts the leftover clock at 50 points a second as built, then
  the next level's card ("Your shift goes on" in Act 1; the act's own words
  elsewhere, §6 to §11).

### 4.3 What carries, and the snapshot

Within an act the run carries as a shift does today: score, cans, the smash
charge, patience pips, the pepper, the boxes of #15 blades, the doggy bag, the
belly-flop, the spent doors. A new act starts him clean (a fresh `Run`), the
status of Act 2 included. At every level's card the game takes a **snapshot**
of the run; Try again after Hammer down restores it, so a level is always
retried with what he carried in, no more and no less.

### 4.4 Scores and bests

- A level's score is what he scored inside it: the run's score at its exit
  minus the run's score at its card, the clock bonus included. The HUD keeps
  showing the running score of the act, as a shift does today.
- The journey keeps **each level's best**, shown on its card in the strip; the
  **act's total** (the sum of its levels' bests) on the act's header; and the
  **journey's total** (the sum of every level's best), which replaces
  "Personal best" on the home screen. It also keeps **lifetime staff bonked**
  (every staffer, student, traveler, nurse, piper and bellhop knocked out,
  ever), the Service Record's one number; the awards of the last phase (§15)
  build on it.
- Today's bests stay: `hammer-time-best-next` is the best of "Work the whole
  shift" (§4.6), `hammer-time-best-banquet` and `hammer-time-best-fares` the
  side quests'.

### 4.5 Saving

One save, in this browser, under `hammer-time-journey`, JSON, version 1:

```ts
type Journey = {
  v: 1;
  next: LevelId;                 // the next open level
  done: LevelId[];               // finished, in order
  best: Partial<Record<LevelId, number>>;
  bonked: number;                // lifetime staff bonked
  run: Run | null;               // the snapshot at `next`'s card (carries), null at an act's first level
  credits: boolean;              // the epilogue has been seen
};
```

Written at every level's card and at every exit, so closing the tab puts him
back on that card tomorrow. No accounts. **New game** sits with the tools and
asks before wiping ("Start over? The journey and its bests are erased."); the
side quests' bests and the whole-shift best survive it. A journey from a later
version is migrated, never thrown away.

### 4.6 Replaying

- A finished level replays from the strip with a fresh three lives and a fresh
  run (no carries, no status) and can set a new best; it never moves `next`
  or touches the snapshot. The pig's "Practice over" wording goes: a replay
  ends on the level's own exit card with its score and best.
- A finished act can be played **straight through** as one run with three
  lives for the whole act, from the act's header. For Act 1 that is **Work the
  whole shift**: today's game, today's rules, today's best, untouched. Acts 2
  and 3 get the same once finished ("Play the night straight through", "Play
  the tour straight through"), under `hammer-time-best-act2` and `-act3`.

### 4.7 For the checks

`/?next=1&level=<id>` starts any level fresh (the old `&venue=` aliases stay);
`&journey=all` opens every stop for the page without saving; `/?quest=hungry`
and `/?quest=fares` stay. The owner never needs these.

### As built (Phase 1a, 2026-11-02)

- The story is a table (`src/sim/story.ts`), the save a pure module
  (`src/sim/journey.ts`): `hammer-time-journey` holds `next`, `done`, `best`,
  `bonked`, the snapshot as `run` and `carry` (the six things on him), and
  `credits`. It is read field by field: a later version, a hand edit or an
  unknown stop keep what makes sense, and a run saved before a newer run field
  existed is kept with that field fresh.
- The prologue flows into Act 1 (the run is fresh at SAT and carries through
  1-4); Acts 2 and 3 start clean. A level starts with three lives or more:
  lives earned carry within an act.
- Phase 1a has no SAT: Clock in plays the first built stop at or after `next`,
  and the stops passed on the way (SAT) are marked finished with no best, so a
  1a journey is not sent back to the airport when SAT arrives.
- Try again restores the level's card exactly, the same layout included: a
  level's pickups are seeded by its place in the whole shift, wherever a run
  began.
- Lifetime staff bonked counts each cast member once a layout, however they
  went (knocked out, run off, down a pit), in journeys and replays; Work the
  whole shift's count joins in Phase 1b with the Service Record.
- `&level=` starts that level of the whole shift as `&venue=` did; `&journey=`
  ("all" or "1") opens every built stop for the page and saves nothing. The
  pig's "Practice over" is gone from the home screen with the four cards; the
  old `&venue=arena` link alone still starts it, for the pig's check.

## 5. The home screen and the journey strip

### 5.1 Hammer, live

The home screen (`src/components/next-start.tsx` over the engine) stops being
a picture. The engine renders a real scene behind the title, with Hammer in it
at idle, and the key art (`public/start/key-art.webp`) stays only as the first
thing painted while the engine wakes, cross-faded away once the scene runs.

- **The scene follows the story.** Before and during Act 1: the lobby by the
  desk, as the key art is now. Act 2: the lobby at night. Act 3: Basel's
  street by the bridge with the parade going by behind him. After the credits:
  a Buc-ee's booth with brisket, nuts and a Coke Zero on the table. The scene
  is the level's own backdrop and lighting, so no new art.
- **He runs his idle beats** (expansion §10, now built): the watch check at
  2.5 s, a foot tap at 5 s, a harrumph and "Any day now." at 8 s, and a snot
  rocket about once a minute, all through the face check.
- **The insults.** Every eight seconds or so while the player has not clocked
  in, a thought bubble from a shuffled pool, each once a visit, written never
  spoken: "Did you play football without a helmet growing up?" · "Any day
  now." · "The button says Clock in. Read it." · "I've trained surgeons faster
  than this." · "I don't have all day. I have a schedule." · "Trainee." ·
  "Is this your first day?" · "Were you going to do something, or just
  stand there?" · "I was here at seven." · "Take notes. You'll need them." ·
  "This is the part where you click." · "Absolute... no. I'll save it."
- **The title sequence stays**: the letterbox bars, HAMMER rising, TIME.
  dropping and landing with the jolt and the brass flash, the strip arriving
  like a filmstrip, Clock in plunging the camera at him. Reduced motion stands
  it finished.
- The camera's lean with the mouse stays; the scene leans with it.

### 5.2 The journey strip

The row of four venue cards becomes the journey: every stop in order, grouped
under headers (Prologue · Act 1 The Trip · Act 2 Status Crusade · Act 3 The
Last Tour · Epilogue), one scrolling strip along the bottom, arrow keys and the
wheel moving it, the open stop centered on arrival.

- A **finished** stop: gold, its picture, its code and name, "best 012345".
- The **next** stop: lit, its picture, marked Next; Clock in starts it.
- A **locked** stop: dim, no picture (its code and a lock only, so nothing is
  spoiled), not clickable.
- An **act header** shows the act's title and total; once the act is finished
  it offers the straight-through run (§4.6).
- The **epilogue's** card appears once seen and replays it.
- Pictures are rendered by the game as today (`scripts/start-art.mjs` writes
  `public/start/<id>.webp`); each new level renders its own when built.
- The **Side quests** row stays under the strip exactly as built.

### 5.3 The tools

"Sound on/off" becomes **Settings** (§14): music volume, effects volume, the
controller, the keys, quality. **New game** beside it (§4.5). The eyebrow,
tagline and edition lines stay but speak for the whole journey ("Three acts.
Zero patience." "Bonk the staff. Dodge the paper. Get to Basel.").

### As built (Phase 1a, 2026-11-02)

- The live scene is the lobby by the desk (`LOBBY.home = { x: 1100, cx: 1600 }`):
  Hammer by the bellhop's luggage cart, the desk behind. The camera frames him
  by the key art's composition, a third of the way across the start screen's
  picture (below its tools) at 0.44 of its height, his feet 83 percent down,
  never looking past `cx`, with no level bounds (an upright phone shows him in
  its top band, the rest of the screen ink). The key art is now that scene's own
  first frame, so the fade is seamless.
- On the home screen the world is still: the cast never moves or notices him,
  and his snot rocket (45 s, then every 60 s) passes people and carts and lands
  on the floor. His thoughts rise on his far side, kept inside the part of the
  picture no piece of the menu covers (beside the title or above it, above the
  strip); his harrumph's "Any day now." is dropped there, so the insults are his
  only thoughts. Where that free part is under 45 percent of the picture's
  height (a phone on its side) he peeks over the strip from the band right of
  Clock in, the strip across his middle.
- The strip lights the stop Clock in will play as next; a stop not built yet
  shows its name and "Coming" when it is finished, next or before the next, and
  stops past the next are locked (code and padlock). A click picks a finished
  stop; a double click starts a stop once. Work the whole shift appears on Act
  1's header once Act 1 is finished, with today's best.
- Settings, New game and the Service Record are Phase 1b's; the 1a tools are
  sound, the keys and the quality (which shows Auto's pick, "Auto · Ultra").

## 6. The prologue: SAT

### 6.1 The email

Before the first level ever, a card in the shell's slate and gold, laid out
like a phone's mail: "From: Basel office · To: Hammer · Subject: Your
transition · Training is moving to video. Please come to Basel on the 14th to
discuss your transition. Safe travels." His thought over it: "Transition."
Continue. It shows once a journey (a New game shows it again) and replays from
the SAT card's picture.

### 6.2 The level

**SAT · San Antonio International · Boarding in 7:00.** Left to right, about
8,000 px (half a lobby, three minutes), the shortest venue, with one punch
clock at the concourse. The clock is the boarding clock: 420 s shown as 7:00.

- **The curb** (0 to 1,400): the Southwest sign, the shuttle van, the skycap
  behind his luggage cart (a bellhop in a red coat; his cart rolls when
  bonked), the first ! crate.
- **The check-in hall** (1,400 to 3,200): kiosks as counters (180 high), the
  bag drop with its belt as a mover, a BAG FEE sign ("Bags used to fly
  FREE."), a delivery case.
- **The TSA line** (3,200 to 5,200): the stanchion zig-zag drawn as rope lines
  he walks through, the bins riding the X-ray belt as a moving platform, the
  body scanner as a low pass to slide under ("Arms up." He does not put his
  arms up: the slide is the only way through), two TSA agents who shove
  ("Sir, step aside."), a sign: "NO LIQUIDS" (his thought: "It's Coke Zero.
  It's not a liquid. It's a lifestyle.").
- **The concourse** (5,200 to 7,600): the moving walkway (a mover, belt 200),
  a bar with a counter and a bartender who throws coasters like paper planes,
  the newsstand (nuts and a Coke Zero up on its shelves), the punch clock.
- **Gate B7** (7,600 to 8,000): the agent at her podium, the travelers in
  their seats seen from behind, the exit: walking into the podium starts the
  round.

**Cast:** the skycap (new painting `cast/skycap.png`: a bellhop's pose in a
red Southwest coat and cap), two TSA agents (new painting `cast/tsa.png`, the
second recolored), the bartender (server-1 in a black apron, recolored), the
travelers (the painted cast as at the gate: office-1, student-2, prof-1, the
nurse). Rules as the lobby's cast: two attackers at a time, the mallet, the
stomp, the lecture, the shield, puddles, the chain. The hint line teaches the
moves here in order: jump, run, slide, swing, snot, the towel, so a new player
learns every move before the hotel.

**Lines.** Hammer (thoughts): "Pre-check. I AM pre-check." · "Take your shoes
off? These are loafers." · "I have a schedule." · "Seven minutes. Plenty." ·
"That's a $400 demo unit." (at the X-ray). TSA (speech): "Sir, step aside." ·
"Laptops out." · "Arms up, sir." · "Is this your bag?" The skycap: "Checking
bags, sir?" Hammer: "I don't check."

### 6.3 The gate

Walking into B7 starts **Fare Darts as the level's set piece**: the round as
built (R5 design, all of it), at shift size, with the gate's paintings cut in.
Its tally pays into the run exactly as the AIRPORT SHUTTLE door does (a box of
#15 blades a booking, three cans a Wanna Get Away, a full smash from B GROUP, a
life at A1), and the agent's call is the exit: "Now boarding... just Mr.
Hammer." Then a card, "Three hours later. The hotel.", and 1-1's card. The
boxes he brings home are what he carries into Act 1.

The lobby's AIRPORT SHUTTLE door is untouched: once a level (per §4.3's spent
doors), it opens the same round as a side quest, and the start screen's Side
quests card plays it as practice.

## 7. Act 1 as a chapter

The lobby, the restaurant, the campus and the gift shop play exactly as built,
with their doors (BUFFET, AIRPORT SHUTTLE, STAFF ONLY, the locked M CLUB
tease), their carries and their punch clocks, and the Pink Menace at the end.
Two things change:

- **The ending.** After the pig lies still and the gift shop's exit counts the
  clock, "Shift over" becomes the act's ending: a phone card, "Marriott
  Bonvoy: Your status has been reviewed.", his thought "Reviewed.", then the
  act card "Act 1 · The Trip · complete" with the act's total and its best, and
  Continue to 2-1's card. In Work the whole shift (§4.6) the "Shift over" card
  stays as built.
- **The cards between venues** read as the story: 1-1's card after the
  prologue is "Three hours later. The hotel." then the venue card; "Your shift
  goes on" stays between 1-1, 1-2, 1-3 and 1-4.

The R8 flavor that belongs here: the bellhop's rolling cart (built), food
plates on counters (expansion §10, "Are you going to finish that?") land in
1-2 and 1-3 as four to six plates a venue in the last phase, not before.

### As built (Phase 1a, 2026-11-02)

- The journey's cards are in the shell's slate and gold, their Continue focused
  so Enter or Space presses it; a key held through any of them is never a press
  in the next level. 1-1 has no card after it, so the game goes straight on to
  1-2's card ("Your shift goes on").
- After the pig: the Marriott Bonvoy notification with "Reviewed." as his
  thought, then "Act 1 · The Trip · complete" with the run's score and the act's
  total (the sum of its stops' bests, read as "its best"). With 2-1 not built
  its Continue goes home, where the strip shows 2-1 coming and Clock in reads
  "Act 2 is coming" (plan decision 5).
- A journey's venue card reads "Your shift starts here" at 1-1 and in a
  replay, "Your shift goes on" elsewhere; Hammer down shows the run's score and
  Try again and Journey. A replay ends on "Clocked out" with the level's score
  and best, Play again and Journey.

## 8. Act 2: Status Crusade

### 8.1 2-1 The lobby at night

The lobby level (`LOBBY`) relit and recast, not redrawn: the same walls, the
same furniture and routes, a night lighting pass (lamps on at full, the windows
black, a cool blue ambient in the shadows, the lights' radius down and
intensity up), and the night crew in place of the day shift. The card: "2-1 ·
The lobby, 11:40 pm · Front desk has you as MEMBER. System error." His first
thought: "TITANIUM. Look again."

**Keycards** (expansion §7, now built): a small gold card with an M and a
stripe, bobbing like a pickup, "+1 keycard" on pickup with a chime. Eight fixed
spots (the desk's counter, both sofas, the landing, the mezzanine rail, the
conference tables, the corridor, one in the stash on its shelf) and one dropped
by each bonked bellhop (the three of the night crew). Tiers at 2, 4, 6, 8 and
10 cards, each 500 points, a comic word with the tier's name, and his thought:

| Cards | Tier | Perk | Thought |
|---|---|---|---|
| 2 | Silver | nothing | "Silver gets you nothing. Everyone knows that." |
| 4 | Gold | late checkout: +60 s on the clock | "Late checkout. Obviously." |
| 6 | Platinum | the M CLUB door opens | "Lounge. Finally." |
| 8 | Titanium | a life | "Finally. A suite." |
| 10 | Ambassador | the checkpoint set where he stands, and a Buc-ee's drops | "Points. Not the water." |

The HUD's venue line reads "2-1 · Lobby · SILVER" and so on; the status shows
on every card of the act and resets with the act. Status is a run value, taken
in the snapshot (§4.3).

**The night crew:** the night auditor at the desk (office-1 recolored, a
cardigan tint, who marches with his phone), three bellhops (the two painted
bellhops and a recolor; each drops a keycard), a security guard on the
mezzanine (new painting `cast/guard.png`: a navy uniform, a flashlight he
shines, which stuns like a slap for 1 s), two servers clearing the conference
wing, and no students. The staff tricks of expansion §10 land here: the
server's ice water (a 50 percent chance to toss it instead of rushing; a hit
costs patience and sets heat to 0, "COLD. But fair."), the office worker's
reply-all (three paper planes 0.4 s apart, "Per my last email").

**The M CLUB door** (mezzanine, 8,800) opens at Platinum: before it, the card
"Platinum members only" as built; after, a drawn door with its light on. Down
in front of it opens **the lounge table**, once a level: a Hungry Hungry
Hammer round (R4 design, the banquet's rules whole) on the lounge's evening
spread. The scene: the M CLUB's bar and its long table under a warm lamp, the
lobby frozen behind it. The rivals: two lounge guests (office-1 and office-2
recolored into a grey suit and a polo) and an intern (student-2 in a lanyard);
the lounge attendant as the server (server-1 in a black vest). **The fourth
figure:** Lifetime Titanium guy (new painting `cast/titanium.png`: a navy suit,
a briefcase, a lanyard with a TITANIUM tag, a smug half-smile, the owner's
pose), who wanders behind the table and, when he reaches Hammer's end unbonked,
takes two items off Hammer's plate ("Let's split it evenly."). His line as he
arrives: "I was here first. Ambassador." Hammer: "Ambassador of WHAT?" A bonk
sends him to the far end for 8 s. The food sheet (`props/lounge-sheet.png`, 16
tiles in this order): cheese cubes 100, crudités 50, meatballs 200, sliders
300, the hot dish 250, hummus 100, crackers 50, cookies 150, brownies 200,
fruit cup 100, yogurt parfait 150, cheesecake 300, pretzels 100, a tiny water
bottle 0 ("Points. Not the water."), the to-go box (the doggy bag's token), a
wine glass −100 ("I drink Coke Zero."). Grades, payout and
the doggy bag as the banquet's; the best under `hammer-time-best-lounge`; the
start screen's Side quests row gains a third card, "The M CLUB", once 2-1 is
finished.

**The exit:** the elevators by the shaft carry a sign, "Reserved for Titanium
members. Thank you." Below Titanium the shaft's doors stay shut and the
stairwell door at the shaft's right (a new door at 6,300, "STAIRS") is the
exit. At Titanium or above the elevator door opens too, and either way the
next card is 2-2's: he climbs regardless ("The elevator stops at every floor.
I don't.").

### 8.2 2-2 The tower, a climb

A new format: the level is tall, not long. Fourteen floors of a hotel
stairwell and its landings, 7,800 px high and 2,400 wide, the camera following
him up (the camera's zones carry a `follow: "up"` flag; the HUD's venue line
reads the floor, "2-2 · Floor 6"). Stair flights at 30 degrees zig-zag between
landings (floor segments of kind `stairs`), each floor's landing a platform
with a door, a housekeeping cart or an ice machine, and the atrium's balconies
as a second route from floor 8 up (one-way platforms, out over the drop).

- **Housekeeping carts** roll along the landings (movers, 140 px/s, reversing
  at the walls; a push from the side is a hit; ride on top).
- **Ice machines** on floors 3, 7 and 11 (a can crate each; bonk for a can).
- **The laundry chute** on floors 5, 9 and 13: a gap in the landing; falling
  in drops him one floor down with no damage and 2 s lost on the chute's slide
  (a trap, not a death; the drop below the lowest floor is the only pit).
- **Wet-floor signs** slip him (vx reversed, 0.5 s without control, no damage).
- **The fire hose cabinets** are ! crates; the vending nooks hold nuts.
- **The cast:** housekeepers on floors 3, 6, 9 and 12 (new painting
  `cast/housekeeper.png`: a grey uniform, a feather duster she swats with;
  two hits), a maintenance man on floor 8 with a toolbox (bellhop-2 recolored
  into coveralls), a drunk guest in a robe on floor 10 who wanders into him
  (office-2 recolored).
- **The small boss, floor 12:** the housekeeping supervisor (the housekeeper
  painting, recolored navy, 1.05 size, a clipboard): she stands at the top of
  the flight and sends her cart down the stairs at him in three waves (a cart
  each 4 s, 300 px/s down the slope; jump it or slide under the landing's
  rail), hittable between waves; three hits put her on the landing ("Do not
  disturb THIS."), and the cart is his to ride up the flight.
- Two punch clocks: floors 5 and 10. Clock 420 s. Pickups by the seeded rule
  on landings and balconies. Exit: the fourteenth-floor door.

**Lines.** Hammer: "Fourteen floors. I've done worse before breakfast." ·
"Reserved. For TITANIUM." · "Housekeeping. HOUSEKEEPING." · "This is a fire
code violation." Housekeepers: "Housekeeping!" · "Did you need towels?" ·
"Sir, that's the service stair." The supervisor: "Guests use the elevator."
Hammer: "Guests wait. I don't."

### 8.3 2-3 The fourteenth floor, third person

The first 3D level (§12), the hallway from the stairwell door to room 1417:
80 m of hotel corridor, 2.4 m wide, doors every 3 m, the carpet's pattern, the
ice alcove at 30 m, the elevator lobby at 50 m (the doors open on bellhops),
room 1417 at the end. The camera sits 3 m behind him and 1.6 m up, looking
down the hall; he walks and runs toward it (W or ↑ forward, S or ↓ back, A and
D step him **left and right in the screen's terms**, the controls skill's rule:
A must turn him left under the chase camera, verified in the browser). Space
jumps; the mallet swings at whatever is in front of him (a box 1.2 m deep); the
snot rocket flies forward; the lecture freezes everyone in front of him; the
towel, the smash and the box work as in 2D.

- **Room-service carts** roll out of doors across the hall (a shove, a hit);
  jump them or wait for the gap.
- **Doors swing open** into the hall ahead of him (telegraphed by the handle's
  turn, 0.5 s), a wall for 1.5 s.
- **Guests in robes** wander (office-2 and the nurse as flat cut-outs facing
  the camera from their own back-view paintings, §12.3); a bonk sends them
  back into their rooms.
- **The ice machine's puddle** slips; the bellhops at the elevator lobby shove
  with carts, two at a time.
- Pickups on the hall's tables (cans), nuts in the vending nook, a Buc-ee's on
  the housekeeping cart.
- Clock 300 s, one punch clock at the elevator lobby.

**The door.** At 1417 the mobile key fails three times, a mallet hit each, with
his thoughts "Mobile key failed." · "Mobile key failed AGAIN." · "Elite members
don't wait."; the third hit opens it, and the card: "The suite. Someone is in
it."

### 8.4 2-4 The suite: Lifetime Titanium guy

Side view, the pig fight's format, the fight only (no punch clock). The arena:
the suite, three rooms the camera pans between as the phases change: the
living room (a sofa and a coffee table as platforms, the welcome gift's fruit
basket on the table, the minibar), the bedroom (the bed as a bouncing
platform, bounce 1.3 times his jump), the balcony (a rail, the city at night,
the minibar's bottles brought out). Clock 300 s. The boss: twelve hits, and he
flinches on each; "absolute bullshit" on Hammer's first hurt, as any hit.

- **Phase 1, the living room (12 to 9).** He swings the briefcase (a melee
  with reach 1.3 times the mallet's, telegraphed 0.4 s) and throws the
  welcome gift's fruit in arcs (apples, 3 at a time, every 3 s; the mallet
  bats them back for 100).
- **Phase 2, the bedroom (8 to 5).** He bounces on the bed, out of reach on
  the way up, and phones the front desk: "This is Ambassador... send someone
  up." Two bellhops arrive with carts every 10 s (the lobby's rules; each
  drops a keycard, which is 200 points here). Hammer hits him on the bounce's
  bottom or from the bed.
- **Phase 3, the balcony (4 to 0).** He throws minibar bottles (fast and
  low) and does "Let's split it evenly": a grab (telegraphed 0.6 s, a lunge)
  that takes ten of Hammer's cans; every hit on him gives ten back until the
  count is right. A towel wipe between phases is the only free moment.
- **The win.** He is bonked off the balcony into the pool below (a splash, a
  bubble "...Ambassador." from below), the card "Your status has been
  reviewed: TITANIUM. Lifetime.", then "Act 2 · Status Crusade · complete"
  with the act's total, and 3-1's card. The straight-through run of the act
  ends on "Night over".

**Lines.** His: "I was here first. Ambassador." · "We're out of suites." · "The
lounge is closed for renovation." · "Let's split it evenly." · "Lifetime.
Look it up." Hammer's: "I've been Platinum since it was Platinum Premier." ·
"I've had status since '98." · "This is a room with a view of a wall." ·
"Where's my welcome gift?" · "Ambassador of WHAT?" · "Resort fee THIS."

## 9. Act 3: the way to Basel

### 9.1 3-1 Row 52, the flight

Third person in 3D (§12): a single-aisle cabin 40 m long seen from behind him,
row 52 at the back to row 1 at the front, the curtain to business class at row
3. **Three lanes:** the aisle, and a step into the row on either side (A and D
move him a lane, in the screen's terms; W runs forward, S backs off). He is
always moving forward unless blocked; the level is a run, not a walk.

- **The drinks cart** comes down the aisle toward him every 20 s (announced by
  the attendant's "Drinks?" and the cart's rattle): caught in the aisle lane,
  he is shoved back ten rows and loses a pip; in a row lane it passes.
- **Turbulence**: the seatbelt chime, then 2 s later bins pop open and bags
  fall into random lanes for 4 s (a hit each); the sign stays lit 6 s.
- **Reclined seats** reach into the row lanes (duck, ↓, or take the aisle);
  **legs** stretch into the aisle (jump); the **lavatory queue** at row 30 is
  three travelers to bonk through; a **kid's tablet** at row 20 plays at full
  volume (walking past it costs nothing but his thought: "Headphones. HEAD
  PHONES.").
- **Pickups** from the cart's trays as it passes in the other lane: Coke Zero
  ("No ice. Of course.") and pretzels in place of nuts (the nut bag's job,
  drawn as a pretzel bag: "Pretzels. PRETZELS."); a Buc-ee's in the overhead
  bin at row 10, opened by a bump.
- **The small boss, the purser,** at the curtain with her cart: she pushes it
  forward three times (each push covers the aisle for 1.5 s; step aside), and
  is hittable between pushes; three hits and she pulls the curtain back:
  "Sir... please." Past her, row 1 is empty and he sits in it: "I AM business
  select."
- Clock 300 s, one punch clock at row 30. The landing card: "Paris. 13 July.
  06:40. No Southwest, no A-List, no ice."

**Cast:** the purser (new painting `cast/purser.png`: a navy uniform with a
scarf), two attendants (recolors), travelers as the gate's. **Lines.** Hammer:
"Row 52. ROW FIFTY-TWO." · "Middle seat. I don't do middle." · "Business
Select. Look it up." Attendants: "Sir, the seatbelt sign is on." · "Sir, you
need to return to your seat." · "Drinks?"

### 9.2 3-2 Paris

Left to right, 12,000 px, two parts and a set piece.

**The hotel** (0 to 5,000): a tiny lobby where the concierge (new painting
`cast/concierge.png`: a grey suit, a key rack behind her) will not hand him
the key until he says bonjour: the lecture button (E) in front of her desk is
"...Bonjour." through his teeth (a thought with the ellipsis), a gate that
opens only then; the lift for one (a mover cabin he fits only crouched, rising
one floor at a time, 800 px/s); the spiral stairs as a 30-degree slope; the
room, a closet with a window that tilts (a platform that tips), a duvet and no
ice ("No ice. Of COURSE."), the breakfast tray on the hall table (bread, 50
points: "That's breakfast? That's a baguette.").

**The street** (5,000 to 11,000), the 14th: shutters down with "Fermé · 14
juillet", the parade on the television in every window, café terraces with
chairs as platforms, a waiter carrying a tray across the terrace (a mover's
pass), scooters along the gutter (fast and low, jump), pigeons that scatter, a
bakery closed, a tabac closed, one brasserie with its awning out. A punch clock
at the terrace. Pickups: Coke Zero in tiny bottles (the can's job; "Thirty-three
centiliters. That's a sample."), nuts as nuts (a bag on the terrace's rail),
a Buc-ee's up on the awning.

**The French table** (11,000 to 12,000): walking into the brasserie starts a
Hungry Hungry Hammer round on the French table, once a level, the banquet's
rules with a new sheet and a new rival: three Parisians (new painting
`cast/parisian.png` in a scarf, two recolors) across the table, and **the
waiter** as the server and the small boss (new painting `cast/garcon.png`:
black vest, long white apron, a tray): every 12 s he clears the plate Hammer
is reaching for (telegraphed 0.6 s by his hand on the rim, "C'est fini?"),
and a bonk on him knocks the tray up and the plate's items onto Hammer's end.
The sheet (`props/french-sheet.png`, 16 tiles): baguette 50, escargots 200,
steak frites 300, moules 250, a croque monsieur 200, camembert 150, comté 200,
roquefort 250, crème brûlée 300, macarons 150, tarte tatin 250, a carafe of
water 0 ("Still? Sparkling? NEITHER."), a tiny Coke Zero bottle (the can's
token), a bread basket 50, the cheese cart's token (the doggy bag's), the bill
−100 ("L'addition." Hammer: "L'ADDITION."). The grades as the banquet's, COMPED
reading "OFFERT". The tally: "Lunch took three hours. It is 13:40. The train
leaves at 14:02." The best under `hammer-time-best-french`; a fourth Side
quests card, "The brasserie", once 3-2 is finished. Clock for the level 420 s.

**Lines.** Hammer: "...Bonjour." · "No ice. Of COURSE." · "Three hours. For
LUNCH." · "Is Pepsi okay? NO." · "Fermé? It's a Tuesday." The concierge:
"Bonjour, monsieur." (until he answers) · "The lift takes one." The waiter:
"C'est fini?" · "Non." · "L'addition." Parisians: "Oh là là." · "Monsieur!"

### 9.3 3-3 The 14:02

Left to right in two parts, 14,000 px.

**The station** (0 to 4,000), at a dead run: Gare de Lyon's hall under the big
clock, the departure board (its platform blank, "Voie 23" lit at 1:00 on the
clock), the ticket barrier (a pass to slide through), the crowd (travelers who
shove), the platform with the doors beeping, and the clock at **2:00 and
counting**: this stretch's clock is 120 s, and at zero the card "The train
left at 14:02. It always does." costs a life and restarts the station. Making
the door with time to spare pays the leftover at 50 a second. No punch clock
here.

**On board** (4,000 to 14,000), coach 18 to coach 1: the carriages as rooms
joined by connecting doors, the countryside flying past the windows in
parallax (Burgundy's fields, then the Jura's hills, a tunnel's dark for 3 s
with only the cabin lights), the floor shaking at the bogies. The **quiet
car** (coach 14: a "Shh" sign; the lecture here summons the conductor at
once), the **bistro car** (coach 10: plates on the counter, Coke Zero in the
fridge), the **family car** (coach 7: kids who run into him, a stroller as a
mover), the **bike car** (coach 4: bikes on hooks as platforms, one swinging),
the **first-class** coaches (3 to 1: his seat). Luggage racks as a high route,
seat backs as platforms, the aisle as the floor; travelers who stand up into
him. A punch clock in the bistro car; a life lost on board before it returns
him to coach 18, never to the station, whose clock is spent. Pickups by the
rule.

**The small boss, the conductor** (new painting `cast/conductor.png`: a navy
uniform, a cap, a ticket punch), at three connecting doors (coaches 14, 8 and
3): "Billet, s'il vous plaît." His mobile ticket fails ("Mobile ticket
failed." It runs in the family.), the conductor blocks the door and punches at
him (a melee, 0.4 s telegraph); three hits send him back a coach, and the door
opens; each round he comes back faster. The end: coach 1, his seat, and the
card "Basel SBB. 17:06. On time. They always are."

**Lines.** Hammer: "Voie 23. VOIE. 23." · "I don't ride second." · "Shh
yourself." · "Mobile ticket failed." · "The train leaves when I'm ON it."
The conductor: "Billet, s'il vous plaît." · "Monsieur. Your seat is in coach
18." · "This is the quiet car." Travelers: "Shh!" · "Pardon."

## 10. Basel

### 10.1 3-4 Basel, Tattoo week

Left to right, 16,000 px, from his hotel by the Kaserne, along the Rhine, over
the Mittlere Brücke into the old town, to the office's door past the Münster.
July 14, evening, the city full for the Basel Tattoo, and **four errands** on
the way (each a counter he walks up to, held for 1.5 s like a punch clock, a
tick on the HUD: "Errands 2/4"), with the parade crossing him at every one.

- **The errands:** francs from the bank at the bridge's end ("Francs. Not
  euros. Not dollars. FRANCS."), the printer in the Freie Strasse for his
  handouts ("Forty copies. Stapled."), the pharmacy on the Marktplatz, the
  courier with the demo units by the Münster ("That's a $400 demo unit.").
  The level's exit (the office door) opens at 4/4.
- **The pipe bands** march as walls of pipers (six abreast in the drawn depth,
  a single rank on the floor, 200 px/s) with one gap in the ranks to slide
  through, telegraphed by the drones rising; caught, he is carried 400 px and
  dropped (a hit).
- **The drum corps** stands and plays: every fourth beat shakes the ground
  (camera trauma, and anything on a barrier or bleacher is knocked off).
- **The drill team** tosses rifles in arcs (paper planes' rules: duck, swat).
- **The motorcycle display team** comes through fast and low in pairs (a
  mover at 900 px/s; jump; a ramp at the Marktplatz they jump).
- **The crowd barriers** are platforms (120 high), the **bleachers** a high
  road (520), the **beer tents** hold Coke Zero, the **bratwurst stands**
  plates (food plates, expansion §10: "YOINK"), **the Rhine ferry** crosses in
  the background on its cable, the **lanterns** of the old town come on as
  the level goes.
- **The cast:** pipers (new painting `cast/piper.png`: a kilt, a glengarry,
  bagpipes; recolors for two bands), drummers (`cast/drummer.png`: a snare,
  sticks he swats with), the drill team (`cast/drill.png`: white gloves, a
  rifle), the motorcyclists (drawn on their bikes, `props/basel-sheet.png`),
  the crowd (the painted cast in summer tints), the bank teller, the printer
  and the pharmacist (office-2, server-2 and the nurse recolored).
- **The small boss, the drum major,** at the Marktplatz in front of the red
  Rathaus (new painting `cast/drum-major.png`: the bearskin, the sash, the
  mace): he throws the mace in a high spin and catches it (a projectile up
  and down, 2 s), and a blast on his whistle calls up a rank of four pipers
  from the wings (a wall, once a phase); three hits, and he hands Hammer the
  mace ("Carry on, sir."). From there to the office door the bands march
  behind him at his walking pace, the pipes playing in time with his steps.
- Two punch clocks (the bridge, the Marktplatz). Clock 420 s.

**Lines.** Hammer: "Don't these people work?" · "It's a TUESDAY." · "Who
approved this?" · "That's not a schedule. That's a parade." · "Francs. FRANCS."
· "Forty copies. Stapled." · "I have four errands and a meeting." Pipers (in
bubbles): "Hoots!"; the drum major: "Stand clear!" · "Carry on, sir."; the
crowd: "Prost!"

### 10.2 3-5 The Basel office: the skills lab

Left to right, 14,000 px, the hospital venue of expansion §9, built now, in
**scrubs** with a TRAINER badge (the costume layer for this level and the
next only; the Affliction shirt is restored at the epilogue). The card: "3-5 ·
The Basel office · Skills lab · Training day."

- **The corridor:** nurse stations as counters, gurney bays as passes, supply
  racks as shelves, two vending machines (a bonk pops three cans), the BREAK
  ROOM stash door (the stash's format), two punch clocks, signs: SKILLS LAB ·
  STERILE CORRIDOR · OR 3 · CODE BLUE · BREAK ROOM.
- **Hazards:** gurneys rolling at 70 px/s that reverse at walls (slide under
  or jump; a side contact is a hit); IV poles (jump); sharps bins on counters
  ("That's a sharps bin, trainee."); the code blue stretch where every
  staffer moves at 1.8 times and the lights strobe (no strobe under reduced
  motion); the autoclave's steam vent (2 s on, 3 s off, +20 heat/s); nurses
  who spray sanitizer when he is within 60 px (telegraphed 0.4 s), leaving a
  puddle that slips him (his own puddles' turnabout).
- **The cast:** nurses (the painted nurse and a new `cast/tech.png` in navy
  scrubs with a cap; two hits), techs (soot's rules), residents (the students
  in white coats, `cast/resident.png`, throwing charts like paper), and
  **the administrator** at the entrance (new painting `cast/admin.png`: a
  grey suit, a lanyard, a folder), who greets him: "Mr. Hammer. We're so glad
  you came to discuss your transition." Hammer: "I'm here to train."
- Food plates on the nurse stations (the cafeteria's): "Are you going to
  finish that?" Pickups by the rule.
- Clock 420 s. Exit: the training room's double doors at the end.

**Lines.** Hammer: "I've trained surgeons better than your surgeons." · "That's
a demo unit. Don't touch it." · "Scalpel. SCALPEL. Are you listening?" ·
"In-service is at 7. Be early." · "I don't need a badge. I'm the trainer." ·
"Grüezi yourself." Nurses: "Sir, this is a sterile field." · "Did you scrub
in?" · "That's not how we hold that here." · "Doctor will be right with you."
Residents: "Is this on the exam?"

## 11. The replacement, and home

### 11.1 3-6 The replacement

Side view, the fight only, in the training room: a lecture hall with a
lectern (the IFU on it), rows of seats as platforms, a catering table at the
back (nuts, Coke Zero), the big screen on the wall, the ring light on its
stand at the front, a drone's charging pad. Clock 360 s. **The kid:** twenties,
a quarter-zip, white sneakers, a tablet in one hand, a selfie stick in the
other, AirPods (new painting `cast/replacement.png`, the owner's pose; his
head 0.22). Fifteen hits over three phases; he staggers on each; "absolute
bullshit" on Hammer's first hurt.

- **Phase 1, the ring light (15 to 11).** The ring light on its stand swings
  its beam across the floor in a slow arc (a lit wedge on the floor and the
  wall); standing in it cooks him: +30 heat a second, nothing drawn over his
  face, ever (the beam is floor light and a glow at the wall). The kid keeps
  to the far edge of the beam and reaches with the selfie stick (a melee with
  the briefcase's reach, telegraphed by its extend, 0.4 s). Hammer swings the
  stand round (a bonk on the stand turns the beam 90 degrees) and gets to him
  in the dark.
- **Phase 2, like and subscribe (10 to 6).** "Like and subscribe." fills the
  seats with residents (four at a time, throwing charts), and a **drone
  camera** circles the hall (a flying hazard that dives; a snot rocket brings
  it down for 300, "FOOTAGE."). Hammer's lecture freezes the whole room (the
  kid too, 2.2 s, the banquet's lecture), and the **IFU** on the lectern is
  his to throw (the box's rules: a lob, a freeze with birds and "READ THE
  IFU."), picked up again where it lands.
- **Phase 3, the video (5 to 0).** The kid runs to the lectern and plays the
  training video on the big screen ("Module 1: Holding the demo unit", a
  looping drawn clip of a hand holding it wrong), hiding behind the lectern
  while it plays; the screen's glow is the beam's heat across the front rows.
  Nuts drop from the catering table every 6 s; a full super smash on the
  screen cracks it (three smashes to break it; the kid staggers out on each
  crack and is hittable for 2 s). The last hit on him, with the screen dark,
  **plays "They need to get fired"** (forced, not rolled), and the kid is
  carried out by two residents.
- **The win.** The administrator walks in with a folder: the card "The Basel
  office would like you to stay on. As Trainer for Life." Thought:
  "Obviously." Behind her, the European training calendar on the wall with
  every date crossed out and rewritten in his handwriting. Then "Act 3 · The
  Last Tour · complete" with the act's total, and the epilogue.

**Lines.** The kid: "So we're going to pivot to async." · "Can we take this
offline?" · "I'll send you the link." · "This is a safe space." · "Skip intro."
· "Like and subscribe." · "Let's circle back." Hammer: "Read the IFU." · "That's
a demo unit. Don't touch it." · "Async THIS." · "In-service is at 7. Be early."
· "Scalpel. SCALPEL. Are you listening?" · "Circle THIS."

### 11.2 The epilogue and the credits

Shown, not played: a sequence of cards in the shell's slate and gold over
rendered backdrops (Blender renders painted over by Codex, §12.5), each with
one line, Continue or a 4 s hold, skippable with Escape after the first
viewing.

1. The Basel airport, the Swiss side: "Nine francs for a Coke Zero. No ice."
2. The French side (the same hall, the other flag): "Bonjour." "No."
3. The flight home (the cabin from 3-1, row 1): "Row 1. As it should be."
4. SAT at dusk, the curb from the prologue: "Home. Where the ice is."
5. The drive: a highway sign, "BUC-EE'S 40 MI": "Forty miles. Worth it."
6. Buc-ee's: the booth, brisket, nuts and a Coke Zero on the table, the
   beaver on the cup, and the **credits** rolling beside him: the owner, the
   voice (the six recordings), the paintings by Codex, the code by Claude
   (Fable for the designs and plans, Opus for the build), the music by the
   game's own synth, "No hotels were harmed."
7. The last picture: a training room, the front row, the kid in a trainee's
   badge holding the demo unit wrong. Hammer's thought: "Wrong."
8. The phone: "Subject: Milwaukee. Monday." Thought: "Obviously." THE END.

The journey's `credits` turns true; the home screen becomes the Buc-ee's
booth with him in it; the epilogue's card joins the strip.

## 12. The 3D levels

### 12.1 The approach

The two third-person levels (2-3 the hallway, 3-1 the flight) run inside the
same page with **three.js** (installed as a dependency, never a second app),
on a second canvas stacked under the React HUD and over the Pixi canvas,
switched in by `src/render/look.ts` the way the banquet's and the gate's views
are: the sim is still the fixed-step sim (a 3D level is a sim module in
`src/sim/levels3d/` stepping positions in meters along a straight corridor
with lanes or free width), the renderer is a `ThreeView` in `src/render/3d/`.
The HUD, the cards, the pad, the sound and the save do not know the
difference.

### 12.2 The sets

The hallway and the cabin are modeled, textured and lit in **Blender 5.2**
(`%LOCALAPPDATA%\Programs\Blender Foundation\Blender 5.2`) on the laptop's RTX
4070 and exported as glTF (`public/sets/hallway.glb`, `public/sets/cabin.glb`,
under 8 MB each, draco-compressed), lit in three.js with one key light and
baked ambient occlusion from Blender, shadows on, bloom on the lamps at the
ultra tier. The props that move (carts, doors, bags, the drone) are separate
glTF nodes. Blender's scenes live in `art/blender/` (committed, the owner's
files once they exist, never modified by a session except to add new ones).

### 12.3 Hammer in 3D

Hammer is a **flat painted cut-out** standing in the lit set: a quad facing the
camera with an unlit material (the painting keeps its own light), a soft blob
shadow under him on the floor, scaled to 1.9 m. Codex paints his **back view**
(`art/incoming/hammer/body-affliction-back.png`, pose-locked to the body
painting's framing and canvas: the Affliction shirt's back print, the mallet in
his right fist at his side, the back of his head; **no face**) and a short set
of back-view frames on green: idle, walk (4), run (4), swing (3), jump, hurt,
cut by the sync into `public/art/hammer-back/*.webp`. When he swings or is
hit, the cut-out turns to his **painted profile** for the clip (the 2D rig
rendered by Pixi to a texture each frame and shown on the quad), so his face
appears only in profile, as painted, and the face check runs on those frames
as it does in 2D. The cast in 3D are cut-outs the same way, from the back
views Codex paints of office-2, the nurse, the bellhops, the purser and the
attendants.

### 12.4 The spike, and the fallback

Before Act 2's build, a **throwaway spike** (half a day, in `artifacts/`,
never merged): the hallway's glTF in three.js with a flat cut-out walking
down it under the chase camera; the questions it answers are whether the
cut-out reads as him in a lit corridor, whether a turn to profile on the swing
looks right, whether 60 fps holds at 1080p at the ultra tier, and that A steps
him left. If the cut-out reads badly, the fallback is a **perspective corridor
drawn by the engine you have**: Pixi, a vanishing point, sprites scaled by
depth, his profile rig walking "into" the screen along a lane, which keeps
every rule and costs no 3D. The spike's verdict is written into Phase 2's
plan before any level depends on it.

### 12.5 Blender for the 2D levels too

The sets of the other new levels are **Blender renders painted over by
Codex**, so every backdrop stays one hand: the station hall and a carriage
(3-3), the Mittlere Brücke and the Marktplatz (3-4), the airport halls (the
epilogue), the suite (2-4). Blender gives the perspective, the lighting and
the straight lines; Codex paints over the render in the game's inked style,
using the render as the input image, by the rules of `art/outgoing/`'s briefs.
Levels that are relit or small (2-1, 2-2, 3-2's hotel) are painted straight.

## 13. Music and sound

All on the game's own synth (`src/game/audio.ts`'s `Song` and `SONGS`, the
two side quests' songs as the pattern), composed in code, rendered for
listening with `artifacts/music-render.tmp.mjs`:

| Where | Song |
|---|---|
| The home screen | the title tune: a brass fanfare on the title's landing, then a slow swagger |
| SAT | "Pre-Check": terminal muzak with a boarding chime every eight bars |
| 1-1 the lobby | muzak: a slow arpeggio, brushed hats |
| 1-2 the restaurant | bossa: a syncopated bass, two-note comping |
| 1-3 the campus | lo-fi: a square lead with a wobble, a soft kick |
| 1-4 the gift shop | the first boss theme: driving bass, two alternating leads |
| The stash | "cellar" as built |
| The banquet, the gate | "Feeding Frenzy", "Now Boarding (Turbulence Mix)" as built |
| 2-1 the lobby at night | a jazz trio: brushes, a walking bass |
| The lounge table | quiet jazz, a piano |
| 2-2 the tower | a climbing figure that rises a step a floor, the elevator chime |
| 2-3 the hallway | the hotel's hum, the ice machine, a muffled trio through the walls |
| 2-4 the suite | the second boss theme |
| 3-1 the flight | the safety video's muzak; the Turbulence Mix's hurry when the sign is on |
| 3-2 Paris | a musette: accordion and a waltz |
| The French table | the musette's quick cousin |
| 3-3 the train | a rail clatter in four, the horn at the tunnel |
| 3-4 Basel | the bands themselves: pipes and drums, louder near a band, the drum corps' beat as the level's beat |
| 3-5 the office | the monitor's beep at 72 and sparse pads |
| 3-6 the replacement | the third boss theme: a lo-fi "content" beat that turns into the boss drive |
| The epilogue | a road song, a country shuffle, to the credits |

Music plays everywhere it is silent today: the home screen's title tune, a
level's theme quietly under its card and at full at play, the tally on the
theme, a four-note sting then silence on Hammer down, a short fanfare on each
act's ending. New cues: the keycard's chime, the tier's fanfare, the chute's
slide, the cart's rattle, the seatbelt chime, the bagpipe's drone, the drum
corps' hit, the mace's whistle, the ring light's hum, the screen's crack, the
drone's buzz. The crowd never speaks aloud.

## 14. Settings and the controller

Settings, from the home screen and the break card: **music volume** and
**effects volume** (two sliders, 0 to 100, kept in `hammer-time-sound`;
"Sound off" is both at 0), **the controller** (the Gamepad API, standard
mapping: the left stick and d-pad move, A jumps, X swings the hammer, B snots,
Y lobs a box, the right bumper runs, the left bumper is the towel, the right
trigger the super smash, the left trigger the lecture, Start pauses; a
connected pad shows its glyphs in the hint line in place of the keys), **the
keys** (the table as built), **quality** (Auto, High, Medium, Low; Auto picks
**ultra** on a desktop GPU, §15), and reduced motion following the system.

## 15. The laptop look pass and the 1.0 polish

- **The top tier by default on a real video card:** Auto picks `ultra` when
  the GPU reports a desktop class (WebGPU's adapter info or WebGL's renderer
  string) and 60 fps holds for the first two seconds; the tiers still step
  down as built.
- **Every painting crisp at 1080p:** the sync publishes Hammer's layers, the
  cast and the props at half the painting's size today; the pass measures
  each at the size the game draws it at 1920 by 1080 and republishes at full
  size where it is soft (the body, the heads, the near props), keeping the
  WebP budget under 20 MB for the first level.
- **The dark band under the floor on 16:9 screens:** the camera frames the
  floor at about 78 percent of the height on 16:9 (as the 16:10 framing does
  today), and each floor gets a drawn front face in its own material (marble,
  tile, carpet, terrazzo, the platform's edge) with a contact shadow, so the
  band is the floor's edge, not darkness. The cards and the hint line keep
  their place (clear of his face).
- **The phone** keeps working: the pad's ten buttons, no horizontal overflow
  at 390 by 844 and 844 by 390; the slimmer stats panel on short screens is
  the last phase's.
- **The Service Record** (§4.4) in Phase 1; **the awards** in the last phase:
  a few in his voice, shown on the home screen's tools, each once: "Titanium
  Elite" (a level without losing a life), "Read the IFU" (twenty frozen with
  boxes), "Lifetime" (every level finished), "Trainer for Life" (the credits),
  "A-List Preferred" (A1 at the gate), "Comped" (the banquet's top grade),
  "Francs" (all four errands under 3:00), "Row 1" (the flight without a pip
  lost).
- **The deferred minors** of `handoff-2026-10-25-r6.md` ("Deferred minors"):
  the cheap ones (the gate's pointers cleared on blur, any mouse button
  throwing, the touch hint reading the keyboard's words, the miss lines once
  a round, the `moves` board's gate throw, the nurse comment's place, a key
  held through a break) land in Phase 1's first task; the per-frame churn
  items (the banquet's rebuilds, the gate's board redraw, the drawn pig's
  Graphics, `skinLayer`'s allocations) land in the laptop look pass; the rest
  stay listed in each handoff until a phase has a reason to take them.
- **The gate's paintings** (Codex prompts 1 and 2 in
  `art/outgoing/batch-r5-codex.txt`) are made in Phase 1 and cut in by the R6
  handoff's steps.

### As built (Phase 1a, 2026-11-02)

- **The tiers** (`TIERS`): ultra a density up to 2, 900 particles, bloom, glows
  and rim; high 1.5 and 600; medium 1 and 400, no bloom; low 300, no glows, no
  rim. Auto starts at high and, after two settled seconds, picks ultra once when
  the browser names a desktop-class card (NVIDIA, GeForce, RTX, Radeon, AMD or
  Arc) that held 58 fps; the new tier settles a second before the governor
  judges it. On this laptop the headless checks run on the AMD Radeon 780M
  (counted as desktop class by that rule) at 120 fps at ultra, 1920 by 1080.
- **Crisp at 1080p:** his body layers and heads and the cast's (head plates and
  their silhouettes included) are published at the painting's size; props,
  hats, layer silhouettes and tufts stay at half. The first level's art is
  7.3 MB of its 20 MB budget.
- **The floor's edge:** standing on a floor the camera settles the walking line
  at 78 percent (in the air the dead zone holds); every floor's face runs 420 px
  in its material, darkening by a quarter toward the bottom, with a 40 px
  contact shadow under the line and 16 px under the slab platforms. The look
  boards frame him the same way.
- **The cheap minors** landed in Task 1 (the miss lines on every miss, only the
  primary button throwing at the gate, the gate's fingers let go on a blur and
  at the round's end, no press on the first step back from a break, the pad's
  own words on the break card, the scalpel on every board's throw, the nurse
  comment's place); the per-frame items in Task 9 (the banquet's plates drawn
  once with pooled stacks and flights, the HUD's insets measured on a resize or
  twice a second, the gate's settled scalpels and ladder drawn on change, the
  drawn pig on a face change, `skinLayer`'s matrices reused). (what each phase asks Codex and Blender for)

Every painting follows `art/outgoing/`'s standing rules: the inked cartoon
style of `art/incoming/cast/bellhop-1.png`, the cast pose-locked to
`body-affliction.png` on flat green, the walls straight-on with level lines
and no people, sheets with their pieces in the brief's order, no text, letters
or logos anywhere (the products excepted), the prompt saved beside the file,
never git, never other files, up to five tries. Each phase's brief
(`art/outgoing/batch-10-story-phase1.txt` and on) lists its items with a
pass/fail checklist, and `art/outgoing/batch-story-phase1-codex.txt` and on
hold the paste-ready prompts.

- **Phase 1:** the gate's four (prompts written); SAT's walls (`backdrops/sat-far-1..3.png`: the curb and check-in, the TSA line, the concourse and gate), its mid pieces (`sat-mid-1..3`: the kiosks, the X-ray belt and scanner, the walkway and bar) and one fore piece (`sat-fore-1`: a column with the departures screen); `cast/skycap.png`, `cast/tsa.png`; `props/sat-sheet.png` (the stanchion, the bin, the kiosk, the shuttle van, the departures sign, the pretzel bag). No home-screen art (the scene is live).
- **Phase 2:** `cast/guard.png`, `cast/housekeeper.png`, `cast/titanium.png`; the lounge (`backdrops/lounge.png`, `props/lounge-sheet.png`); the tower (`backdrops/tower-far-1..2.png`, `props/tower-sheet.png`: the cart, the ice machine, the chute's door, the hose cabinet, the wet-floor sign); the suite (a Blender render painted over, `backdrops/suite-1..3.png`); Hammer's back view and frames, and the back views of office-2, the nurse and the bellhops; the hallway's Blender set.
- **Phase 3:** the cabin's Blender set; `cast/purser.png`, `cast/attendant.png`; Paris (`backdrops/paris-far-1..3.png`, mid and fore pieces, `cast/concierge.png`, `cast/parisian.png`, `cast/garcon.png`, `props/french-sheet.png`, `backdrops/brasserie.png`); the train (the station hall and a carriage from Blender renders painted over, `backdrops/station.png`, `backdrops/train-far-1..3.png`, `cast/conductor.png`, `props/train-sheet.png`).
- **Phase 4:** Basel (the bridge and the Marktplatz from Blender renders painted over, `backdrops/basel-far-1..4.png`, `cast/piper.png`, `cast/drummer.png`, `cast/drill.png`, `cast/drum-major.png`, `props/basel-sheet.png`); the office (`backdrops/lab-far-1..3.png`, `cast/tech.png`, `cast/resident.png`, `cast/admin.png`, `props/lab-sheet.png`, the scrubs costume layer `hammer/body-scrubs.png`); the training room (`backdrops/training-room.png`, `cast/replacement.png`, `props/training-sheet.png`: the ring light, the lectern, the drone, the tablet, the selfie stick, the screen).
- **Phase 5:** the epilogue's backdrops (the airport's hall from a Blender render, SAT at dusk, the highway sign, the Buc-ee's booth, the credits' training room); `art/incoming/brand/key-art.png` if the owner wants a painted first frame.

## 17. How the old plans fold in

- **R6 (Marriott status and the lounge)** is 2-1 whole, with expansion §7's
  rules as written in §8.1; the mobile key door is 2-3's; the Buc-ee's gift
  and Your24 are Ambassador's perk.
- **R7 (the Skills Lab)** is 3-5 whole, with expansion §9's hazards, cast and
  lines, moved from "between the campus and the pig" to Basel; the hospital's
  cafeteria table is not built (the French table and the lounge table are the
  two new tables of 1.0).
- **R8 (flavor):** the venue music is §13; the staff tricks land in 2-1; food
  plates land in 1-2, 1-3, 3-3, 3-4 and 3-5 in the last phase; the Buc-ee's
  rest stop is the epilogue's booth, shown not played; Lifetime Titanium guy
  is 2-1's cameo and 2-4's boss; the dining-hall and brisket-counter tables
  are not built.
- **The side quests** stay as built, and gain two tables (the lounge, the
  brasserie) under their own bests and Side quests cards.
- **The expansion spec's phases (§13)** and **the rebuild spec's R6 to R8
  (§16)** are superseded by §18.

## 18. The roadmap in brief (the full roadmap is its own document)

Each phase is planned with `superpowers:writing-plans`, built test-first on
Opus 5.5 at xhigh effort, playable at every step, and ends green on the checks
(§19) with a report and look boards, a README update and a handoff for the
next phase.

- **Phase 1, Act 1 as a finished chapter.** 1a: the story spine (levels that
  unlock, the save and the snapshot, the journey strip, the live home screen
  with the insults, the email, Act 1's ending, Work the whole shift), the
  floor band, the laptop look pass, the cheap minors. 1b: SAT and the gate's
  paintings, the music everywhere, Settings and the controller, the Service
  Record. The R5 merge into `main` is asked for when 1a starts.
- **Phase 2, Act 2.** The 3D spike first (its verdict written into the plan),
  then 2-1 with the lounge table, 2-2, 2-3, 2-4.
- **Phase 3, the way to Basel.** 3-1, 3-2 with the French table, 3-3.
- **Phase 4, Basel.** 3-4, 3-5 with scrubs, 3-6.
- **Phase 5, 1.0.** The epilogue and credits, the awards, the straight-through
  runs of Acts 2 and 3, food plates, the slimmer phone panel, the last minors,
  the final review.

Phase 1 is planned in full now; Phases 2 to 5 get their detailed plans in a
Fable session when their turn comes, since the 3D spike, the owner's
play-tests and the paintings change what they contain.

## 19. Testing and definition of done

Every phase ends with all of these green, then the commit on the branch:

1. `npm run test:next` with the phase's new checks (a pure-sim check file per
   new level, the journey's save and snapshot, every new boss beaten by a
   scripted driver and lost by a masher), `npx tsc --noEmit`, `npx eslint`.
2. The rig checks for every new clip (face clearance at 400 samples, head tilt
   under 8 degrees, feet within 2 px of the floor, the back-view frames'
   face-free check).
3. The browser checks with installed Chrome at 1920 by 1080 first (60 fps over
   5 s at the ultra tier on the dev box), then 1280 by 800, 390 by 844 and
   844 by 390: the home screen with the live scene and an insult, the strip
   with a locked, a next and a finished stop, a level start to finish, every
   card, Hammer down and Try again with the snapshot, the save surviving a
   reload, and for a 3D level the chase camera with A stepping him left.
4. Look boards (`scripts/look-boards.mjs`) for every new level at three
   camera positions, every new cast member, every boss phase and the home
   screen in every act's scene, looked at full size by the session before
   they are shown.
5. The protected files still hash as recorded; `src/routeTree.gen.ts`
   untouched.
6. The production build served and smoked against the dev verdict.
7. README updated; the design's "As built" notes appended to this file.

## 20. Decisions taken for the owner (mine, to report)

1. The level codes: SAT for the prologue (his home airport's code), 1-1 to
   3-6 for the acts; the epilogue has no code.
2. The prologue's clock is the boarding clock (420 s shown as 7:00); the
   station stretch of 3-3 has its own 120 s clock and a lost life at zero.
3. Hammer down's Try again restores a snapshot of the run taken at the
   level's card, so a retry carries exactly what he carried in.
4. A replayed level starts a fresh run; a straight-through act keeps three
   lives for the whole act; only Act 1's straight-through run keeps today's
   best key.
5. Locked stops show no picture, so later levels are not spoiled.
6. The home screen's scene follows the act (the lobby, the lobby at night,
   Basel's street, the Buc-ee's booth); the insults are a pool of twelve,
   each once a visit, about every eight seconds.
7. The night lobby reuses the lobby's level and art with a lighting pass and
   a new cast; the elevators are "reserved for Titanium" and the stairwell
   door is the exit either way.
8. The lounge table and the French table are Hungry Hungry Hammer rounds with
   new sheets, rivals and a new server behavior each, under their own bests,
   and join the Side quests row once their level is finished.
9. The tower's laundry chute drops a floor, never a life; the tower has two
   punch clocks.
10. The 3D levels keep the sim and the HUD; Hammer is a flat painted cut-out
    with a back view by Codex and his painted profile on the swing; a spike
    decides before Act 2, with a drawn perspective corridor as the fallback.
11. Boss health: twelve hits for Lifetime Titanium guy, fifteen for the
    replacement, three for each small boss; a boss level's clock is 300 s
    (360 s for 3-6).
12. The ring light's beam is heat, never a flash over his face.
13. "They need to get fired" is forced on the final blow of 3-6, the only
    forced recording in the game.
14. The epilogue is cards over painted renders, skippable after the first
    viewing; finishing the game turns the home screen into the Buc-ee's
    booth.
15. The controller mapping of §14; two volume sliders; Auto quality picks
    ultra on a desktop GPU.
16. The floor band is fixed by reframing the camera and drawing each floor's
    front face; no new floor paintings.
17. The dining-hall, brisket-counter and cafeteria tables are not built in
    1.0; the Buc-ee's rest stop is shown in the epilogue, not played.
18. Phases 2 to 5 are planned in detail when their turn comes, in a Fable
    session, because the spike, the play-tests and the paintings change them.
