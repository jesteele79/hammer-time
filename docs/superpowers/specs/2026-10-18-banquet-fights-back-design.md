# The banquet fights back: design

Design addendum, 2026-10-18, to `2026-10-14-r4-hungry-hungry-hammer-design.md`. Where the two differ, this file wins.
The owner asked, in one message: a better way to steer Hammer's hand to grab from each plate; E lectures at the banquet,
with food and server insults, as in the shift; the diners he steals from angrier, slapping his hand, and Hammer saying
"absolute bullshit" when they do; make it hard; and something he wins at the banquet that he can use in the shift, so the
side quest means something. The owner left the choices to me; these are the decisions I took for them.

## 1. Steering: plates you pick, a line you can see

- A tap of ← or → hops his line onto the next diner's plate that way (← toward the far side, → toward the near side, the
  way his line already swung), and locks it there. On screen from his plate the three sit 0 degrees (the nurse), 10 (the
  bellhop) and 22 up (the student): a tap from straight ahead goes to the bellhop, another to the student, → comes back
  through the bellhop to the nurse. Past the last plate a tap lets the lock go and sweeps instead.
- Locked, holding Space charges straight at the plate and goes out the moment its reach gets there (the bellhop's in about
  0.35 s, the nurse's at a nearly full 0.49), stops on the plate and robs its top dish. A tap whose reach covers a locked
  plate (the student's once he has grown past 538) robs it too. Free aim keeps R4's rule (a charge ending on a plate).
- Held, ← and → sweep freely as before; after a hop the sweep starts once 0.2 s have passed, so a tap never drifts.
- His line is always drawn, in amber over a dark edge (white was invisible on the white cloth), to where his hand would
  stop, with the dishes it would sweep ringed; the locked plate is ringed bold and pulses.

## 2. The lecture

- E (the pad's Lecture) at the banquet: a 0.8 s lecture with the shift's wagging pose, landing a fifth of the way in;
  every diner awake and the server freeze 2.2 s (no dives, no slaps, no clearing the rim), each answering in a speech
  bubble, and come out of it a level angrier. Once every 7 s; no dive, bonk or duck meanwhile.
- His line is a thought: a food or table-manners insult, or, with the server at his end of the table, one about the
  service. The lines are in `src/game/lines.ts` (`BANQUET_LECTURES`, `SERVER_LECTURES`); the replies in the sim.
- The panel shows its wait (not on a phone on its side, where it would crowd his head; the pad's lit button says it).

## 3. Guarded plates and slaps

- Every diner guards their plate (R4 had only the angry nurse): his hand out within 300 px of it starts their slap, after
  their reaction times 0.6 (calm, the student 0.27 s, the bellhop 0.20, the nurse 0.14; a fifth quicker each level of
  anger; never under 0.1). If his hand is still within 300 px then, it is slapped: what it holds drops on the cloth, what
  it had already sent home is knocked out of the air, 100 off his plate, a 1.2 s stun; their hand lunges at his.
- Hammer says it every time: the "absolute bullshit" recording with its caption (the bus never overlaps a recording).
- The arithmetic of a rob: a clean in-and-out keeps his hand in a guard about 0.18 s, so a calm student can be robbed
  twice; the line to the bellhop's plate runs through the student's guard, and the nurse is quicker than any rob. The far
  plates want a lecture (or the bonk) first. A guard shows red where his line runs into it, and bright while a slap is
  coming; the old nurse-only red ring and her "I've HAD my shots." thought are gone.

## 4. Hard

- The diners: reactions 0.45 / 0.33 / 0.24 s (from 0.55 / 0.40 / 0.28), bursts of 2 to 5 dives (from 4), food within
  450 px (from 400), anger to four levels calming one every 12 s (from 8), a floor of 0.12 s (from 0.15).
- The grade lines by R4's rule, from the scripted rounds under the new table: steady tapping a median of 16610, the sharp
  player (now robbing only what is safe, lecturing first) 31900; the scale 10.1: COMPED from 30300, GOOD TIPPER 20200,
  SPLIT THE CHECK 12120. The sharp player has perfect aim; a person reaching COMPED has earned it.

## 5. The doggy bag

- COMPED from the BUFFET door packs a doggy bag. In the shift it is a takeout box beside his patience; it rides through
  the venues and a lost life. The hit that would knock him flat eats it instead: "LEFTOVERS!", the thought "Saved it for
  later.", only hurt, back at full patience with the pepper. One bag; practice wins none.
- Why this: the owner made the shift harder on 2026-10-15; a second wind from the banquet speaks to that, needs no new key
  (so it works on the touch pad), and lasts as far as the pig. A new move (the belly-flop as a floor attack) was the
  other candidate; it needs new floor poses and checks, and is offered as a follow-up.
- The card names the prize ("Get COMPED (30,300) to take home a doggy bag"), the score turns gold once it is his, the
  tally says it was packed or what wins it, and the hint on the way back says what the banquet paid (R4's deferred
  minor: nothing announced it).

## 6. Checks

- `scripts/banquet.check.mjs`: the hop and lock, a locked charge arriving and robbing, a locked tap robbing; every diner's
  slap and its timing, anger quickening it, the loot knocked out of the air, a lectured, bonked or sleeping diner never
  slapping; the lecture's freeze, anger, replies and wait; COMPED's doggy bag in the result and from the door through a
  lost life, never from practice; the bag catching the last pip; the new numbers; the grade lines over ten seeds.
- `scripts/render.check.mjs`: the round's HUD with the lecture's wait and COMPED's line.
- `scripts/hungry-browser.check.mjs`: a tap locking a plate, the nurse's slap and the recording played, the lecture
  freezing the table, the prize on the card and the tally, the doggy bag from the door on the HUD and in the hint.
