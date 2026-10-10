# Hammer Time expansion: side quests, status, the Skills Lab

Design spec, 2026-10-09. Written for an implementation session that has not seen
the planning conversation. Everything needed is in this file and the repo.

## 1. Who Hammer is (the north star)

Hammer is a man in his mid-60s who works in medical devices. He runs trainings
with surgical instruments, and he is officious about his position as the
trainer: everyone is a trainee to him. He travels constantly for work, so his
whole life is hotels, restaurants, campuses and Southwest Airlines, and he is
rude to all of it: servers, hotel staff, students, and now nurses. He is an
A-List snob on Southwest (home airport San Antonio, SAT) and a status snob at
Marriott hotels. He steals other people's food. He snot rockets on purpose and
uses it as a weapon. His prime melee weapon is a wooden mallet. When he gets
hurt he says "absolute bullshit." His power-ups are Coke Zero, mixed nuts and
Buc-ee's.

The game is a left-to-right platformer (lobby, restaurant, campus, then a pig
boss) and the brief for this expansion is "completely bonkers and fun." The
owner has given total creative control inside the limits below.

## 2. Hard limits (never break these)

1. **His face never changes.** No edits, tints, overlays, rotations of the face
   alone, or effects drawn over it. The existing test
   `no drawn frame of any hero pose puts the arm or mallet over the face` must
   be extended to every new pose and must pass.
2. **The Affliction shirt is the default outfit.** The only exception is the
   scrubs costume in the Skills Lab venue (section 9), drawn as a runtime overlay
   on the shirt region of a cached copy. The source PNGs are never edited.
3. **The pig (`boss-pig-reference.webp`) and the photo pickups
   (`coke-zero.webp`, `nuts-bag.webp`, `buccees-pickup.webp`) stay as they are.**
4. **The mallet stays his primary weapon** and the Coke Zero, nuts and Buc-ee's
   power-ups keep their current effects.
5. **The six recordings are the only spoken lines.** `absolute-bullshit.mp3`
   (via the derived `damage-voice.wav`) plays on every accepted hit. The five
   taunts are pooled as: staff (office and hospitality): fired, feedback,
   butt-hurt; students: problem, man-balls; pig: all five. No crossover. Every
   other line in this spec is text only (section 5).
6. The byte-for-byte test on the locked files (`gameplay.check.mjs` test 1)
   stays and keeps passing.

## 3. Where the code is today

Branch `claude/hammer-pass` (local, not pushed) in `C:\Users\jeste\Desktop\hammer-time`,
based on `origin/codex/character-gameplay-polish`. `main` on GitHub is older and
lacks the pig, the photo pickups and the voice lines; build on this branch.

- `src/game/engine.ts` (~3,600 lines): the platformer. Modes, physics, enemies
  (`Enemy` with roles server/hotel/office), students, planes, boss, items, FX,
  rendering, HUD payload. Already has: snot charges (`sinus`), hot snot, snot
  puddles that trip staff, the lecture action (E), comic words, shockwave
  rings, tumbling staff, `say()` for Hammer's captions, `__kiln` probe object
  for tests, `__kilnDev` (dev only) with `charge(n)` and `heat(n)`.
- `src/game/rig.ts`: joints on the 456x1371 cut-out canvas, keyframe tracks,
  poses (swing, super, snot, wipe, lecture, walk, air, crouch, hurt, tumble),
  `rigPoint()` and the far-arm IK. All new poses go here as keyframes.
- `src/game/hero.ts`: draws the rig (legs, torso, level head, near arm with
  sleeve, far arm, towel, smear, heat FX). `heroJoints()`, `heroMallet()`,
  `heroNostril()`.
- `src/game/combat.ts`: timing constants and swept-collision helpers.
- `src/game/levels.ts`: `buildLevels(seed)` with helpers `base`, `supply`,
  `cans`, `furniture`, `staff`, `students`, `stashDoor`, `randomRewards`.
  Levels: lobby (hotel), service (restaurant), campus, plush (boss), bonus (stash).
- `src/game/scenery.ts`: props, crates, signs, decor.
- `src/game/audio.ts`: `AudioBus`, procedural music (`tick()` with DAY/CELLAR
  patterns), SFX, recorded voice (`curse()`, `taunt()`).
- `src/game/taunts.ts`: pools and rotation. `src/game/lines.ts`: written lines.
- `src/components/kiln-hop.tsx`: React shell, start screen (4 venue buttons),
  HUD, status bar meters, touch pad (10 buttons incl. Lecture).
- `src/styles.css`: all styling.
- Tests: `npm run test:game` runs `scripts/gameplay.check.mjs` (33 checks,
  node:test, constructs `Game` via `Object.create` and calls private methods).
  Browser checks: `scripts/game-browser-check.mjs`, `surroundings.check.mjs`,
  `start-screen.check.mjs`, `pig-boss.check.mjs`, `voice-browser.check.mjs`
  (all pass with `$env:BROWSER_SMOKE_CHANNEL='chrome'`).

Environment notes (Windows 11, PowerShell):
- Another tool's dev server owns ports 8080 and 8081; do not kill it. `npm run
  dev` picks a free port; to pin one: put `node_modules\.bin` on PATH and run
  `node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort`.
- `npx tsc --noEmit`, `npx eslint src/game src/components`, `npm run test:game`,
  `node scripts/with-app-env.mjs vite build` (with `.bin` on PATH).
- Git has no global identity on this machine. Commit with
  `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit`.
  Long temp paths break `commit -F`; write the message to `.git/CLAUDE_MSG`.
- Two uncommitted files (`package-lock.json`, `src/routeTree.gen.ts`) belong to
  the owner. Never stage them.

## 4. Architecture: side quests as modules

Each side quest is a self-contained module in `src/game/quests/`, hosted by the
engine through one small interface. `engine.ts` gains one mode, `quest`, and
never learns quest rules.

```ts
// src/game/quests/quest.ts
export type QuestId = "hungry" | "fares";
export type QuestInput = {
  held: Record<TouchAction, boolean>;        // sampled every frame
  pressed: Record<TouchAction, boolean>;     // edges, consumed per step
};
export type QuestHud = {
  title: string;                             // "HUNGRY HUNGRY HAMMER"
  subtitle: string;                          // "Round 1 · The Banquet"
  score: number;
  timer: number | null;                      // seconds left, or null
  meter: { label: string; value: number; max: number; text?: string } | null;
  hint: string;
};
export type QuestResult = {
  score: number;        // added to the run score
  coins: number;        // Coke Zero toward the next life
  charge: number;       // smash charge to add (clamped to 10)
  star: boolean;        // Buc-ee's boost on return
  hot: boolean;         // hot snot (form 2) on return
  lives: number;        // 1UPs earned
  fullBelly: boolean;   // patience back to 3
  grade: string;        // "COMPED"
  lines: string[];      // tally screen bullet list
};
export type QuestContext = {
  audio: AudioBus;
  images: Record<string, HTMLImageElement>;  // engine's loaded art by key
  drawHero: (ctx: CanvasRenderingContext2D, pose: HeroPose, cam?: number) => void;
  rng: () => number;                          // seeded; tests pass a fixed one
  say: (text: string, seconds: number) => void;   // thought bubble on Hammer
  comic: (x: number, y: number, text: string, big: boolean) => void;
  reduced: boolean;                           // prefers-reduced-motion
};
export interface Quest {
  readonly id: QuestId;
  enter(ctx: QuestContext, options: { table?: string; practice: boolean }): void;
  step(dt: number, input: QuestInput): void; // called with STEP = 1/60
  render(ctx: CanvasRenderingContext2D, clock: number): void; // VIEW_W x VIEW_H space
  hud(): QuestHud;
  result(): QuestResult | null;              // null while running
  exit(): void;
}
```

Engine integration:
- `startQuest(id, { table, practice, returnX })` sets `mode = "quest"`, shows a
  title card (reuse the `card` veil: title, subtitle, one line of rules), then
  runs `step` in the fixed-step loop and `render` inside the same stage/grade
  pipeline (`paintStage` with the venue background, then the quest draws in
  VIEW space, then `gradeStage`). Pause (Esc/P) works inside quests.
- When `result()` returns, show a tally veil ("Quest" kicker, grade, bullet
  lines, Continue button or Enter/Space), apply rewards, then either return to
  the level at `returnX` (door entry; the door is spent for the rest of the run)
  or back to the title (practice entry). Quest scores in practice are stored in
  `localStorage` as `hammer-time-best-hungry` / `hammer-time-best-fares`.
- **Doors.** New prop kind `door` in `levels.ts`: `{ x, label, quest, table,
  locked? }`. Drawn like the castle door with the label on the lintel and a
  lit "↓" arrow when Hammer stands in front of it. ↓ while standing on the floor
  in front of an unspent, unlocked door enters the quest. Doors never block
  the route.
- **Start screen.** A "Side quests" row under the venue buttons with two
  buttons (Hungry Hungry Hammer, Southwest Fare Darts), each showing its stored
  best. Clicking one starts that quest in practice mode (no run).
- **HUD.** The React shell renders `hud.quest` when present: title and
  subtitle replace the venue name, timer replaces the clock, the quest meter
  replaces the heat/smash meters, and the hint line shows `quest.hint`.
- **Input.** Touch pad stays; the quest reads the same `TouchAction` set.
  Keyboard: the engine's existing key map. Quest step gets both held and edge
  states and consumes the edges.
- Tests construct quests directly with a fixed `rng` and a stub context, step
  them N times, and assert on state; the engine integration is covered by one
  check that enters a quest through a door, finishes it, and sees rewards
  applied.

## 5. Lines, thought bubbles and the voice model

- `src/game/lines.ts` becomes the single table: `type Line = { text: string;
  clip?: TauntId }`. Only the six recordings have clips (the five taunts via
  `SUBTITLES` plus the damage line). Every other line is text.
- **Thought bubbles.** Any Hammer line without a clip is drawn as a thought
  bubble: a cloud (four overlapping ellipses with a dark outline) with two
  trailing circles toward the back of his head. Anchor: above and behind the
  head (`x = headX - facing * 10`, `y = top - 18`), clamped to the view. It is
  never drawn in front of his face. Recorded lines keep the existing speech
  caption (`drawSpeech`). `say(text, seconds, soft, spoken)` carries the
  distinction; `quip()` passes `spoken = true` only when `audio.taunt()`
  actually played a clip.
- If a WAV for a line is added later to `public/voice/manifest.json` and the
  `Line` gets a `clip`, it becomes spoken with no further code change. A
  recording script of every line, grouped by situation, is in Appendix A.
- NPC lines (staff, nurses, students, rivals, the gate agent) stay speech
  bubbles; they are not Hammer and have no recordings.

## 6. Hungry Hungry Hammer

Hungry Hungry Hippos at a banquet table, side view, entered from a BUFFET door
in each venue or from the start screen.

**Layout (VIEW 384x216).** A long table from x=40 to x=344, tabletop at y=150,
14 px thick, on legs, in front of the venue's background. Hammer stands at the
left end (feet y=192, facing right). Three rivals stand behind the table (drawn
with `drawPerson`, scaled 0.85, facing left) at x=170, 230 and 290; each has a
plate on the table in front of them where their grabbed food stacks. Hammer's
plate is at x=58. The server walks behind the table. A tray chute above the
table center (x=192, y=60) is where food is dumped from.

**Food.** `{ kind, value, x, vx, size, special? }`, 1-D motion along the
tabletop: dumped items fall from the chute, bounce once (vy damped 0.4), then
slide with friction 0.88/s, bouncing off the table ends and off any suitcase
blocker. Drawn 12 px tall from a food sprite sheet (Appendix B) or the
procedural fallback (colored plate shapes with a label).

Waves (60-second round):
- 0–20 s appetizers: shrimp cocktail 80, bread basket 50, deviled eggs 60,
  kolache 70, Beaver Nuggets 90. Dump 5 at start, then 3 every 4 s.
- 20–40 s entrées: ribeye 300, chicken fried steak 220, brisket plate 260,
  shrimp and grits 200, club sandwich 150. Dump 4 at 20 s, then 2 every 4 s.
- 40–60 s desserts: pie slice 180, cheesecake 200, banana pudding 160. At 42 s
  the dessert cart crashes in from the right end and spills 8 items.
- Specials, one each per round at random times, slide in from the chute:
  Coke Zero (+1 coin, 100), nut bag (+3 charge, 100), Buc-ee's bag (star on
  return, 300), hot sauce (hot snot on return, 150), to-go box (next 5 grabs
  double), the check (-400, "YOU picked up the bill?").

**Hammer's lunge.** Space/F/Jump button. Tap = lunge to base reach; hold up to
0.5 s = charged, reach grows linearly to max. Reach starts at 90 px and grows
10 px per item eaten, capped at 250 (the hungrier he gets, the farther he
stretches). The lunge is a whole-body dive along the tabletop: a new rig pose
`lungeJoints(u, reach)` that leans the torso 55° forward over the table, scoots
the figure right by `reach * u`, and leads with the far hand at tabletop
height; it springs back over 0.25 s. The face stays level and nothing crosses
it (add the pose to the face-clearance test). Anything within 10 px of the hand
at full extension is eaten: "NOM" comic word at the hand, crumbs fall onto the
shirt below the chin, the item's value goes on his plate. A fully charged lunge
that reaches a rival's plate steals the top item (its value plus a 100 "YOINK"
bonus) and raises that rival's anger.

**Bonk (H).** Swing at the near end of the table. Hits the server if he is
within 70 px of the left end (tray dumps 4 extra items, he leaves for 15 s),
hits a rival who has leaned into range (stunned 2 s), or clears a suitcase
blocker. Uses the existing swing pose; no new art.

**Duck (↓).** Hammer crouches below the table edge; paper planes pass over.

**Rivals** (`{ art, x, reaction, anger, plate: Item[], stun }`), lunging with a
0.2 s lean when food is within 45 px of them, after a reaction delay:
- Student: 0.55 s reaction. Retaliation when stolen from: throws a paper plane
  down the table at Hammer (y=130); duck or swat (H). Hit = -150 and "ABSOLUTE
  BULLSHIT" is NOT triggered (no patience damage in quests; plates are score).
- Bellhop: 0.40 s. Retaliation: slides a suitcase onto the table in front of
  him for 4 s, blocking sliding food and lunges past it; bonk clears it.
- Nurse (scrubs art): 0.28 s. Retaliation: if Hammer's hand enters her zone
  while she is angry, she slaps it: 1 s stun, "Sanitize!" speech bubble.
- Anger: +1 per theft, decays 1 per 8 s; reaction time shortens 20% per anger
  level (min 0.15 s).
- Hotel table only: the suit-and-briefcase NPC is "Lifetime Titanium guy," a
  fourth rival who wanders behind the table and, when he reaches Hammer's end
  unbonked, takes two items off Hammer's plate ("Let's split it evenly.").
  Lines: "I was here first. Ambassador." Hammer: "Ambassador of WHAT?"

**Score and grade.** Plate total at the end plus combo bonuses: consecutive
grabs within 1.2 s build a combo; x2 at 5, x3 at 10. Grades: COMPED ≥ 3000,
GOOD TIPPER ≥ 2000, SPLIT THE CHECK ≥ 1200, WATER ONLY below. Result: score,
coins/charge/star/hot from specials, `fullBelly = grade >= GOOD TIPPER`.

**Tables.** `table` option selects background, rival roster and food mix:
`banquet` (hotel: student, bellhop, nurse, plus Titanium guy), `dining-hall`
(campus: three students who throw more), `brisket-counter` (Buc-ee's room:
bellhop, student, office worker; brisket-heavy menu), `cafeteria` (Skills Lab:
two nurses and a resident; jello and vending-machine items added). Phase 1
ships `banquet` only; the others are phase 6.

**Audio.** Existing `bonk`, `thud`, `splat`; add `chomp` (short low noise burst
plus a 180 Hz blip), `slide` (soft noise for food), `ding` (service bell, two
sine blips) for the dump, `crash` for the cart (reuse `boom`).

**Hammer's lines (thought bubbles).** "Are you going to finish that?",
"That's MINE now.", "I didn't order this. I'm eating it anyway.", "Room
charge.", "Is Pepsi okay? NO.", "Bring the cart back.", on the check: "YOU
picked up the bill?", on a nurse slap: "I've HAD my shots."

**Tests (`scripts/hungry.check.mjs`).** Deterministic rng; lunge reach grows
with items eaten and caps at 250; a tap lunge cannot reach a plate, a charged
one can; stealing raises anger and shortens reaction; the server clears food
unless bonked; the check subtracts; the to-go box doubles the next five; 60 s
ends the round with a result; grade thresholds; rewards map correctly; the
lunge pose passes face clearance at every u and reach.

## 7. Marriott status (hotel venue)

A run-level `status` tier: Member → Silver → Gold → Platinum → Titanium →
Ambassador, raised by keycards collected in the lobby level. The HUD shows a
"Status" line in the hotel venue and on every tally screen.

- **The downgrade.** The lobby title card says: "Front desk has you as
  MEMBER. System error." Hammer's first thought bubble in the level: "TITANIUM.
  Look again."
- **Keycards.** New tile `ID.keycard` placed by `levels.ts` (8 fixed spots on
  counters, shelves and in the stash) plus one dropped by each bonked bellhop
  (3 in the lobby). Drawn procedurally: a small card with an "M" and a stripe.
  Tiers at 2 / 4 / 6 / 8 / 10 cards. Each tier: 500 points, a comic word with
  the tier name, and a thought bubble.
- **Perks.**
  - Silver: nothing. "Silver gets you nothing. Everyone knows that."
  - Gold: late checkout, +60 s on the clock. "Late checkout. Obviously."
  - Platinum: the M CLUB lounge door unlocks (a `door` prop at tile 150 leading
    to a new bonus level `lounge`, built like the stash: Coke Zero, nuts, a
    breakfast buffet of food plates, one Buc-ee's bag). "Lounge. Finally."
  - Titanium: suite upgrade, +1 life. "Finally. A suite."
  - Ambassador: Your24, the checkpoint is set to his current position, and the
    welcome gift drops a Buc-ee's bag. "Points. Not the water."
- **Mobile key door.** A solid room door ("ROOM 1417") at tile 105 across the
  route. It opens after three mallet hits, each with a thought bubble: "Mobile
  key failed.", "Mobile key failed AGAIN.", "Elite members don't wait."
- **Lines.** Bellhop openers add: "Welcome, Mr. Hammer. I see you're... Silver?",
  "The lounge is closed for renovation.", "We're out of suites." Hammer
  comebacks add: "I've been Platinum since it was Platinum Premier.", "This is
  a room with a view of a wall.", "Where's my welcome gift?"
- Status persists for the run and resets on a new game. Practice quests do
  not touch it.

**Tests.** Keycard count maps to tiers; each perk applies exactly once; the
lounge door stays locked below Platinum and opens at Platinum; the room door
needs three hits; status shows in `hud()` for the hotel and in the tally.

## 8. Southwest Fare Darts

Darts with surgical scalpels at a Southwest route map, entered from the
AIRPORT SHUTTLE door in the lobby or from the start screen. One round = one
sterile tray of 10 scalpels.

**Scene.** Gate B7, SAT. Hammer at x=48 (facing right). The board is the
route map on the wall: a rounded rectangle from (120, 18) to (372, 172). The
podium with the gate agent (server art, relabeled GATE AGENT) sits at the
bottom right. A boarding-pass printer at the bottom left of the board feeds
printed passes along the bottom edge.

**The map.** Cartoon US silhouette (Appendix C has the polygon and city
coordinates, normalized to the board). ~23 Southwest cities as dots with
3-letter codes; SAT marked with a "YOU ARE HERE" sticker. Not a real map; it
only has to read as one.

**Fares.** A tag spawns every 0.9 s on a random untagged city (never SAT),
max 4 live tags, lifetime 2.6 s with a flicker in the last 0.6 s. Fare = $39 +
distance factor, rounded to end in 9, from $49 to $249:
- Wanna Get Away (< $100): tag 18x10 px, 300 + (100 - fare) x 2 points.
- Anytime ($100–199): 24x12, 150 points.
- Business Select (≥ $200): 30x14, 60 points. Bubble: "I don't PAY Business
  Select. I AM business select."
Hammer uses the old fare names on purpose; he refuses the new ones.
Booking the same city twice in a round is a Companion Pass: double.

**Aim and throw.** A crosshair sweeps the board on a Lissajous path
(`x = cx + 118 sin(1.0 w t)`, `y = cy + 66 sin(1.5 w t + 0.7)`, `w` starts at
1.4 rad/s and rises 8% per throw). Any action button throws. The scalpel leaves
his hand on the existing swing keyframes (overhead throw; the mallet is swapped
for a drawn scalpel in the hand for this quest only), flies to the crosshair
point in 0.22 s along a slight arc, and sticks with a thunk; the board shakes
2 px. Scoring is point-in-rect against live tags with a 2 px pad. A booking
prints a boarding pass (city, fare class, boarding position) and the tag
flies to the printer. A miss sticks in the drywall: "That's a $400 demo unit."

**A-List meter.** Boarding position as 0–179 mapped to A1–A60, B1–B60,
C1–C60. Start at C60. Each booking moves up 10; a miss drops a full group (+60,
clamped). Reaching A1 once per round triggers A-LIST PREFERRED: remaining
scalpels score double and the agent says "Now boarding... just Mr. Hammer."
Hammer lines on the way: "A16. Right where I belong.", "I don't do group C.",
"Companion Pass? I fly alone.", "Rapid Rewards. Rapidly."

**Hazards and gags.**
- Weather delay: a cloud drifts over a random third of the board at 3 s and 7 s
  for 3 s; tags under it can't be booked (scalpel sticks, no points, "Denver.
  Of course.").
- Ground stop: once per round a red X sits on a tagged city for 2 s; hitting it
  is -200, agent: "Sir, that flight is cancelled."
- Gate agent crossing: once between throws 4 and 8 she walks across the
  podium with her clipboard for 1.4 s; a scalpel that would land on her
  bounces off the clipboard and is lost: "Sir, you can't do that here."
- ASSIGNED SEATING tag: once per round between throws 5 and 9, 1.6 s, +500,
  Hammer: "BRING BACK OPEN SEATING."
- BAG FEE tag: once per round, +300, Hammer: "Bags used to fly FREE."

**Round end.** After the tenth scalpel resolves: tally with the printed passes,
total, and a grade: A-LIST PREFERRED (A1 reached), A-LIST (≥ 7 bookings),
B GROUP (4–6), C GROUP (≤ 3). Rewards: score; +3 coins per Wanna Get Away
booked; +1 life if A1 was reached.

**Audio.** `whoosh` on throw; add `thunk` (short low noise plus a 90 Hz blip),
`print` (fast ticking noise burst), `ding` for bookings, `boom` for A-List
Preferred. Music: a muzak loop with a gate-chime motif (section 10).

**Tests (`scripts/fares.check.mjs`).** Fixed rng; tag sizes and points by fare
class; crosshair path is deterministic; a throw at a live tag books it and a
throw elsewhere misses; meter math (start C60, -10 per booking, +60 per miss,
A1 triggers double once); companion pass doubles; cloud blocks; ground stop
subtracts; agent crossing eats a scalpel; round ends after 10; grade and
rewards; the throw pose passes face clearance.

## 9. Skills Lab: the hospital venue

New main-run level between campus and the pig: world 1-4 "Skills Lab", theme
`hospital`; the pig becomes 1-5. Training day at a hospital.

- **Costume.** `HeroPose.costume: "affliction" | "scrubs"`. For `scrubs`,
  `hero.ts` draws the torso from a cached copy of `hero-body.png` in which the
  shirt region (below `NECKLINE`, plus the `SLEEVE` polygon) is painted scrub
  green (#3f9a6e, with a darker fold at the side seam and a V-neck line) using
  `source-atop` on an offscreen canvas, exactly like the existing `shade()`
  cache. A badge clip reading TRAINER hangs at the chest. The face, neck, arms
  and everything else are untouched; the overlay never extends above the
  neckline. The costume is on for this venue only and off everywhere else,
  including quests entered from this venue (cafeteria table uses scrubs, since
  it is inside the venue).
- **Cast.** Nurses and surgical techs use `scrubs.png` (unused today), plus two
  hue-shifted variants (ceil blue, navy) made at load time on offscreen
  canvases. Nurses are the `hotel` kind (two hits); techs are `soot`. Residents
  reuse the student art, labeled RESIDENT, and throw paper (charts). The suit
  NPC is the ADMINISTRATOR. New `EnemyRole`s: `nurse`, `tech`.
- **Hazards** (new entity kinds in `engine.ts`, built by `levels.ts` helpers):
  - Gurney: a 48x30 rolling body along the floor at 70 px/s that reverses at
    pits and walls; 32 px clearance underneath like a service pass (slide
    under) or jump it. Contact from the side = accepted damage.
  - IV pole: 1 tile wide, 3 tall, static; contact = damage; jump over.
  - Sharps bin: 1 tile, on counters; contact = damage, bubble "That's a
    sharps bin, trainee."
  - Code blue: an x-range where every staffer moves at 1.8x and the lights
    strobe (skip the strobe under reduced motion).
  - Steam vent: an x-range on the floor with timed bursts (2 s on, 3 s off);
    +20 heat/s inside.
  - Sanitizer: nurses spray when Hammer is within 60 px (telegraphed 0.4 s),
    leaving a puddle that makes Hammer slip (his vx reverses and he loses 0.5 s
    of control; no damage). Turnabout for his snot puddles.
  - Vending machine: a prop; a bonk pops out 3 Coke Zero cans.
- **Layout.** Width 244, pits at 3 spots, props: nurse stations (counters),
  gurney bays (passes), supply racks (shelves), 2 vending machines, BREAK ROOM
  stash door, a BUFFET door for the cafeteria table (phase 6), 2 checkpoints
  (60, 150). Signs: SKILLS LAB, STERILE CORRIDOR, OR 3, CODE BLUE, BREAK ROOM.
  Pickups via `randomRewards` as other levels, plus food plates (section 10).
- **Lines.** Nurses: "Sir, this is a sterile field.", "Did you scrub in?",
  "Visiting hours are over.", "That's not how we hold that here.", "Doctor
  will be right with you." Hammer: "I've trained surgeons better than your
  surgeons.", "That's a demo unit. Don't touch it.", "Scalpel. SCALPEL. Are you
  listening?", "In-service is at 7. Be early.", "I don't need a badge. I'm the
  trainer."
- **Background.** `public/hospital-corridor.webp` (asset request, Appendix B).
  Fallback: a procedural corridor in `scenery.ts` (tile floor, wall rail,
  doors with windows, fluorescent panels), good enough to ship.
- **Music.** Heart-monitor theme (section 10).
- Start screen gets a fifth venue button, "Skills Lab" (scrubs NPC image).
  Inserting the level shifts the pig to course index 4 and world "1-5":
  update the `starts` array and the `hud.world === "1-4"` boss-card check in
  `kiln-hop.tsx`, `bossGame()` in the tests, and every `courses[3]` reference.

**Tests.** Route traversal with staff active (clone of test 13's driver, with
gurney/IV/vent avoidance); costume on only in the hospital; scrubs overlay
never touches pixels above the neckline (sample the cached canvas); gurney
clearance; sanitizer slip reverses vx without damage; vending machine drops.

## 10. Main-run upgrades

- **Music per venue.** `AudioBus.startMusic(theme)` grows themes: `lobby`
  (muzak: slow triangle arpeggio, brushed-noise hats), `restaurant` (bossa:
  syncopated bass, 2-note comping), `campus` (lo-fi: square lead with a
  wobble, soft kick), `hospital` (minimal: a 72 bpm monitor beep on 1, sparse
  pads), `boss` (driving: faster bass, two alternating leads), `gate` (muzak
  with a two-note chime every 8 bars, for the darts), `lounge` (quiet jazz).
  Same `tick()` scheduler; each theme is a pattern object `{ beat, melody,
  bass, hat?, extra? }`.
- **Staff tricks.**
  - Bellhop: when bonked, his luggage cart (a 24x18 body) rolls away at 140
    px/s in the hit direction and flattens the first staffer it meets (200
    points, "VALET!").
  - Server: when alerted, 50% chance to toss ice water instead of rushing: an
    arc projectile (vy -220, vx toward Hammer); duck under it or jump; a hit
    costs patience like any hit but sets heat to 0. Hammer: "COLD. But fair."
  - Office worker: reply-all: when first greeted, throws three paper planes
    0.4 s apart ("Per my last email").
- **Food in the main run.** `levels.ts` helper `plate(level, x, y, food)`
  places food items (same sprite sheet as the quest) on counters and shelves.
  Walking into one: "YOINK" comic word; patience +1 if below 3, else +300.
  Thought bubble on the first plate of each level: "Are you going to finish
  that?" Each venue gets 4–6 plates themed to it.
- **Idle moves.** When grounded, still, no enemy within 120 px and no action
  for 2.5 s: `watchJoints` (far arm raises the wrist to chest height, elbow
  bent, never above the collar); at 5 s a foot tap (front leg knee bounce via
  the existing stride param); at 8 s `harrumph()` and "Any day now." Any input
  cancels. All new poses go through the face-clearance test.
- **Super smash squat.** Add a `squat` value to `Joints` (0–1) that bends both
  knees in `legs()` and lowers the hips; the SUPER keyframes squat to 1 at the
  cut so the mallet head meets the floor on the slam.
- **Buc-ee's rest stop.** Bonus level `buccees` (theme `restaurant` palette
  with yellow trim) reached from a REST STOP door in the campus level at tile
  110 ("REST STOP 40 MI" sign). Jerky wall as a stepped shelf route, a Beaver
  Nugget bin (3 Buc-ee's bags on a counter), a brisket counter with 5 plates,
  12 cans and 3 nut bags; the staff stash's return-cart mechanic. Phase 6 adds
  the brisket-counter table door here.
- **Thought bubbles** everywhere Hammer "says" something unrecorded (section 5).

## 11. Assets

The repo can't generate images. Each item has a prompt for the owner's image
tool and a procedural fallback so no phase blocks.

- `public/hospital-corridor.webp` (1920x1080): "Wide hospital skills-lab
  corridor, side view, clean cinematic photo, pale green walls, wood wall rail,
  frosted doors with small windows, fluorescent panels, IV poles and a gurney
  parked along the wall, no people, no text." Fallback: procedural corridor.
- `public/food-sheet.webp` (sprite sheet, 16 tiles of 64x64, transparent):
  shrimp cocktail, bread basket, deviled eggs, kolache, Beaver Nuggets bowl,
  ribeye, chicken fried steak, brisket plate, shrimp and grits, club sandwich,
  pie slice, cheesecake, banana pudding, hot sauce bottle, to-go box, the
  check (leather folder). "Top-down restaurant food on white plates, isolated
  on transparent, consistent lighting, photographic." Fallback: colored plate
  shapes with a 3-letter label.
- Nurse variants: made at load time by hue-shifting `scrubs.png`; no request.
- Everything else (keycards, scalpel, boarding passes, the map, the lounge,
  doors, carts, gurneys, IV poles, vending machines) is drawn in canvas.

## 12. Testing and definition of done

Every phase ends with all of these green, then a commit on the branch:
1. `npx tsc --noEmit` and `npx eslint src/game src/components scripts`.
2. `npm run test:game` with the phase's new checks added, and the face-clearance
   test extended to every new pose (lunge, throw, watch check, squat).
3. `node scripts/game-browser-check.mjs` (update the touch-button count if it
   changes) plus any phase-specific browser check (entering a door, the Side
   quests row, the Skills Lab start button).
4. The protected-files test untouched and passing.
5. README updated (controls table, new sections, test counts).

## 13. Phases

Each phase is independently shippable and leaves the game playable.

0. **Warm-up (small):** `Line` model and thought bubbles; idle moves; super
   smash squat; the `quest` plumbing types compiled but unused.
1. **Hungry Hungry Hammer (banquet table)** with the quest framework, BUFFET
   door in the lobby, Side quests row, tally and rewards, `hungry.check.mjs`.
2. **Marriott status:** keycards, tiers, perks, lounge level, room door,
   lines, HUD status line, `status.check.mjs`.
3. **Southwest Fare Darts:** board, fares, aim, throw, meter, hazards, tally,
   AIRPORT SHUTTLE door, `fares.check.mjs`.
4. **Skills Lab:** level, cast, hazards, scrubs costume, vending machines,
   hospital music, start-screen button, `skills-lab.check.mjs`.
5. **Main-run flavor:** venue music, staff tricks, food plates, Buc-ee's rest
   stop.
6. **More tables and the nemesis:** dining-hall, brisket-counter and cafeteria
   tables with their doors; Lifetime Titanium guy at the banquet.

## Appendix A: every Hammer line (thought bubbles; a recording script later)

Spoken today (keep): "Absolute bullshit." (hurt), "They need to get fired.",
"They can't take feedback.", "They get all butt hurt." (staff), "They got a
problem.", "Go grow some man balls." (students).

Hotel / Marriott: "TITANIUM. Look again." · "Silver gets you nothing. Everyone
knows that." · "Late checkout. Obviously." · "Lounge. Finally." · "Finally. A
suite." · "Points. Not the water." · "Mobile key failed." · "Mobile key failed
AGAIN." · "Elite members don't wait." · "I've been Platinum since it was
Platinum Premier." · "This is a room with a view of a wall." · "Where's my
welcome gift?" · "I've had status since '98." · "Resort fee THIS."

Food: "Are you going to finish that?" · "That's MINE now." · "I didn't order
this. I'm eating it anyway." · "Room charge." · "Is Pepsi okay? NO." · "Bring
the cart back." · "YOU picked up the bill?" · "I've HAD my shots." ·
"Ambassador of WHAT?"

Southwest: "A16. Right where I belong." · "I don't do group C." · "Companion
Pass? I fly alone." · "Rapid Rewards. Rapidly." · "That's a $400 demo unit." ·
"I don't PAY Business Select. I AM business select." · "Denver. Of course." ·
"BRING BACK OPEN SEATING." · "Bags used to fly FREE."

Hospital: "I've trained surgeons better than your surgeons." · "That's a demo
unit. Don't touch it." · "Scalpel. SCALPEL. Are you listening?" · "In-service
is at 7. Be early." · "I don't need a badge. I'm the trainer." · "That's a
sharps bin, trainee."

Existing written lines stay (lectures, retorts, staff comebacks in `lines.ts`).
Main run extras: "COLD. But fair." · "Any day now." · "HAMMER TIME."

Processing recipe when recordings exist: trim leading/trailing silence,
normalize peaks, mono WAV, add to `public/voice/manifest.json` with hashes,
set `clip` on the `Line`.

## Appendix B: food sheet order (index → item → value)

0 shrimp cocktail 80 · 1 bread basket 50 · 2 deviled eggs 60 · 3 kolache 70 ·
4 Beaver Nuggets 90 · 5 ribeye 300 · 6 chicken fried steak 220 · 7 brisket
plate 260 · 8 shrimp and grits 200 · 9 club sandwich 150 · 10 pie slice 180 ·
11 cheesecake 200 · 12 banana pudding 160 · 13 hot sauce (special) · 14 to-go
box (special) · 15 the check (special).

## Appendix C: the board

Normalized board coordinates (0–1 across the map rectangle; x east, y south).
Cartoon silhouette polygon, in order:

(0.04,0.07) (0.62,0.07) (0.66,0.18) (0.72,0.12) (0.78,0.20) (0.96,0.10)
(0.99,0.20) (0.93,0.33) (0.86,0.40) (0.84,0.50) (0.78,0.62) (0.77,0.75)
(0.79,0.90) (0.76,0.99) (0.72,0.92) (0.70,0.80) (0.62,0.80) (0.56,0.86)
(0.52,0.83) (0.47,0.92) (0.43,0.99) (0.38,0.86) (0.33,0.80) (0.29,0.74)
(0.17,0.68) (0.11,0.68) (0.08,0.62) (0.03,0.50) (0.05,0.30) (0.02,0.18)

Cities (code, x, y): SAT 0.457 0.803 (home) · DAL 0.486 0.669 · HOU 0.511
0.790 · AUS 0.470 0.769 · OKC 0.474 0.561 · DEN 0.345 0.390 · SLC 0.226 0.350 ·
LAS 0.170 0.533 · PHX 0.223 0.642 · LAX 0.117 0.618 · OAK 0.047 0.468 · SMF
0.061 0.437 · SEA 0.046 0.076 · MCI 0.524 0.416 · STL 0.600 0.435 · MDW 0.644
0.305 · BNA 0.659 0.534 · MSY 0.602 0.782 · ATL 0.700 0.630 · MCO 0.752 0.838 ·
FLL 0.773 0.935 · BWI 0.834 0.408 · BOS 0.930 0.286.

Fare distance factor: `fare = 39 + round(dist * 260)` where `dist` is the
normalized distance from SAT (0–1), then rounded up to end in 9 and clamped to
49–249. DAL/HOU/AUS land in Wanna Get Away territory; the coasts are Anytime or
Business Select unless a flash sale (20% of spawns) halves the fare.
