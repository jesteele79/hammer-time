# R3b The Gift Shop, the Pig, the Start Screen and the Switch, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The shift runs end to end: lobby, restaurant, campus, then the gift shop (1-4, "The Pink Menace") and the pig fight, to "Shift over"; the pig painted (its velour body cut into seven layers and bent like the cast, four face edits, stuffing tufts) and fought by the shipped rules at the new scale; the gift shop's and the lobby's painted walls and standing pieces; a start screen; then, each with the owner's yes, `/` switching to the new game (the old one kept at `/?classic=1`) and the merge into `main`.

**Architecture:** The pig is a sim object of its own (`src/sim/pig.ts`): the world steps it after the cast (`world.pig`), its hits come from the mallet's path, the snot (which ends on it) and the super smash's burst, and the Game adds what is the run's: the wake's pepper, the refill pepper, the chained exit and the HUD bar. The gift shop is plain level data with `boss: { x, arena }`. The pig's painting goes through the cast's pipeline, which learns to take its layer lists and face edits from the cut (`castRig`), and is drawn by the cast's `PaintedFigure`, which learns to draw a rig in its own order; the pig's states are clips over the cast skeleton (`src/sim/rig/pig.ts`), and `src/render/pig.ts` draws it (painted, or the code-drawn pig when the painting is missing) with its flash, wobble and tufts. The start screen is a shell component over a Game held on a new `title` mode, so the engine loads behind it; its pictures are rendered by the engine ahead of time and committed.

**Tech Stack:** TypeScript, React 19, TanStack Start, PixiJS 8, sharp, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-13-r3-the-run-design.md` (§2 the shift, §3.3 the level format, §5 the gift shop and the pig, §6.1 to §6.3 the walls, the standing pieces and the pig's art, §7 the start screen and the switch, §8 R3b and its checks, and the "As built in R3a" notes) over `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§2 hard limits, §5.4 the camera, §7.2 the pig, §9 feel, §10 HUD and shell, §15 testing). Handoff: `docs/superpowers/handoff-2026-10-13-r3b.md` (environment, owner decisions, deferred minors). The shipped fight being ported: `src/game/engine.ts` (`stepBoss`, `hitBoss`, the boss camera in `followCamera`), `src/game/levels.ts` (`plush`). Art briefs: `art/ART-REQUEST.md` §3, §4, §8; prompts in `art/outgoing/batch-r3-codex.txt`.

## Global Constraints

- "12 HP. The mallet 1 (once a swing), a snot 1 (hot or not), the super smash 2 counted as a bonk (within the burst's reach). At least 3 bonks and 3 snots: a hit that would end it short of either holds it at 1 HP with "MORE BONKS" or "MORE SNOT". 0.38 s between hits that count." (R3 §5.2)
- "Contact: landing on it from above bounces him off (the R2b stomp bounce), no damage either way; touching it otherwise costs a pip (the usual `world.hit`, grace and all). Buc-ee's protects him and does nothing to it. The lecture does nothing to it ("It's a stuffed animal.")." (R3 §5.2)
- "Pattern: wind-up (the first 1.1 s, then 0.9 s, 0.7 s at half HP or below), its direction locked at the wind-up's start (toward him, except within 900 px of the arena's left edge it faces right and within 450 px of the right edge it faces left); then a charge (880 px/s, 1040 at half HP, for 0.85 s, ended early by an arena edge) or, every third attack, a hop (forward 520 px/s, 260 px high, 0.6 s in the air, the state 1.15 s); then a recover (1.35 s, panting: the window)." (R3 §5.2)
- "Pepper refill: while he is not hot and no pepper is out, a pepper appears 150 px inside the arena's left edge every 3 s." "Defeat: 3000 points, "STUFFING SETTLED", time at 0.6 for 0.3 s, the chain falls off the exit." (R3 §5.2)
- "Crossing into the arena wakes the pig ("PIG FIGHT"), moves his checkpoint to the arena's left edge, gives him the pepper (hot, full patience) and 1.2 s of grace, and closes the arena behind him (he is held between its edges)." The arena "held at zoom 0.92 and framing both fighters". (R3 §5.1)
- Feel: "breathing at 0.5 Hz; the wind-up leans back 12 degrees with the squint face; the charge leans forward 18 degrees with the legs cycling at 6 Hz and dust, the charge face; the hop stretches 0.9 by 1.15 in the air and squashes 1.2 by 0.8 on landing with trauma 0.5; a hit flashes it white for 0.08 s, wobbles it, shows the hurt face and pops a stuffing tuft; defeat deflates it to 0.85 of its height over 1.2 s with stuffing at two seams and the X face. It stands 420 px tall." "HUD: a 12-segment health bar in slate and gold under the top bar with the bonk and snot counts ("BONKS 2/3", "SNOTS 3/3")." (R3 §5.2) "1.12 pushes in for 0.4 s on the super smash burst and on boss hits." (main spec §5.4)
- "`pig-body.png` is cut like a cast painting into seven layers (far arm, far leg, near leg, body, near arm, head with the ears, tail) on a skeleton of its own (`art/cuts/pig.json`: its painted joints), skinned by the same code as Hammer and the cast. ... The four face edits are aligned onto the body (`alignOnto`) and swapped whole on the head; the stuffing tufts become particle sprites. Missing art falls back to the code-drawn pig." (R3 §6.3)
- Walls: "A cut file per wall (`art/cuts/wall-<name>.json`, measured with `art-grid.mjs`) records the floor line and the two seam columns"; "A venue whose walls are missing draws its venue photo inked, or a plain wall in its palette". "The lobby's code-drawn columns and palms give way to its painted ones in R3b." (R3 §6.1, §6.2)
- Start screen: "in the shell's slate and gold: the title, the key art (the lobby rendered by the engine with Hammer and the pig until the owner's `brand/key-art.png` exists), three venue cards and a pig-practice card with engine-rendered thumbnails, the best score, mute, the keys, the quality tier, and a Side quests row whose Hungry Hungry Hammer card opens the old game's practice at `/?classic=1`. It fits 1280 by 800, 390 by 844 and 844 by 390." A later start "begins like a fresh shift there: three lives, two pips, no pepper, no charge"; pig practice is "the gift shop alone, scored on its own, no best". (R3 §7, §1, §2)
- The switch and the merge each need the owner's explicit yes at the time; "`/` serves the new game; `/?next=1` still works (the checks use it); `/?classic=1` serves the old game. `src/routeTree.gen.ts` must keep its hash (`dceedffd…`) through the route edit." The old engine and its checks stay until R4. (R3 §7)
- The face rule: nothing is ever drawn over Hammer's face box; the cast, the pig, their props and tufts draw behind him; words and bubbles go through the face-safe layout; cards sit in the half of the screen away from his face. (main spec §2, R2b §8)
- "The six recordings in `public/voice/*` plus `public/absolute-bullshit.mp3` are the only spoken lines"; the pig's taunts are the shipped `taunt("pig")` pool (both pools, 45 percent). (handoff, `src/game/taunts.ts`)
- "Pixi objects cannot be constructed under `node:test`": node tests touch pure functions and the cut pipeline only; drawing is verified on boards and in the browser. The stand-ins are placeholders: never polish them.
- The owner's files under `art/incoming/` and `art/reference/`, `public/voice/*` and `public/absolute-bullshit.mp3` are never modified; `npm run art:sync` records each owner file in `art/manifest.json`; a commit stages only the manifest entries of the paintings it adds (`node artifacts/stage-manifest.mjs <names…>` writes the committed manifest plus those entries to the index; if that git-ignored helper is gone, stage with `git add -p art/manifest.json` and take only those entries). Run `npm run art:sync` after every change to `art/cuts/*` or `scripts/art-cut.mjs`; `public/art/` is git-ignored.
- Owner rules: never stage, revert or touch `package-lock.json` or `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` stays `dceedffdc12c32138e81bb63787cac7ae5d97fcd`, checked after every edit to `src/routes/index.tsx`); write the message to `.git/CLAUDE_MSG` with the Write tool and commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, named paths only, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `claude/hammer-pass` after each commit (`git push origin claude/hammer-pass`), never `main`; dev server on 8090 (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort`, `node_modules\.bin` on PATH), preview on 8091 (restart it after every rebuild); browser checks with `BROWSER_SMOKE_CHANNEL=chrome`.
- Many source files use CRLF line endings: exact-string edit scripts normalize them (`artifacts/edit.mjs`). Bash heredocs containing apostrophes break in this harness: write files with the Write tool.

## Review Focus

1. **A life lost in the fight, or "Try again" at pig practice**: the gift shop comes back as the run laid it out, with a fresh pig asleep at 2600 and him at the arena's punch clock, where it wakes at once with the pepper and grace; no refill pepper, no HUD bar or hits from before, the exit chained again. Pinned in Task 2 (the sim) and Task 4 (the browser: a life lost mid-fight).
2. **The pig beaten in the air or mid-charge**: the last hit lands during a hop or a charge; it comes down to the floor and stops there, harmless, and the camera, the bar and the chain all follow the defeat. Pinned in Task 1 (it falls and does no harm) and Task 4 (the browser defeat).
3. **Two hits close together**: the mallet and a snot in one step, a burst while a snot lands, a swing that meets it inside the gap: only one counts, a swing touching it in the gap can still count later in the same swing, the hold at 1 HP names the bonks before the snot. Pinned in Task 1.
4. **The start screen used before the game is ready, and left**: a card chosen while the art still loads starts it once ready, never twice; the Side quests link clicked while it loads leaves no errors behind (the stopped flag); on a phone either way up nothing runs off the screen and no card is out of reach. Pinned in Task 7.
5. **The art missing or bad**: the pig's painting without its cut, a face edit that does not line up, a wall of the gift shop or the lobby without its cut: the sync warns and goes on, the game draws the code pig (or the plain face) and the inked photo, never a broken row of walls or a crashed sync. Pinned in Task 3 (the tolerant sync, the refused face) and Task 5 (the stand-in when the rig fails).

## Decisions taken for the owner (report these)

1. The pig keeps 540 px off the arena's left edge (the shipped game's 80 px at the new scale) and 50 px off its right: the left corner is safe from its charges, and that is where the pepper refills.
2. The pig is 240 wide and 400 tall to collide with (drawn 420 with its ears): Hammer's jump does not clear it from the floor, as in the shipped game (where it was twice his height); the plush shelves and the cash counter are how he gets above it.
3. A lost life restarts the fight: a fresh pig, him at the arena's punch clock with the pepper and grace.
4. Waking the pig gives him the pepper (hot, full pips) without the pepper's 1000 points.
5. The pig's leans (back 12 degrees, forward 18) tilt the whole pig about its middle, head and all (it is one stuffed piece); its tail is its own layer but rides with its body, so it does not wag.
6. The pig's painted head pivots only a few degrees on its body: its turns and wobbles come from the whole body.
7. The start screen's key art and the four venue pictures are rendered by the game's engine ahead of time and stored with the game, so they show at once; a script redoes them when the art changes, and `art/incoming/brand/key-art.png` replaces the key art when the owner paints it.
8. The start screen keeps the shipped one's words and flow: pick where to start, then "Clock in"; "Personal best"; "Bonk the staff. Dodge the paper. Settle it with the pig."; "Four venues. Zero patience." for "Three venues".
9. The game loads behind the start screen, so clocking in is quick; a start picked before it is ready begins as soon as it is.
10. Hungry Hungry Hammer opens the old game straight into the banquet table (`/?classic=1&quest=hungry`).
11. Pig practice ends on "Practice over" and keeps no best; a shift started at the restaurant or the campus keeps the one best, as R3a decided.
12. After a shift ends, "Start screen" beside "Play again" goes back to the start screen.
13. The quality choices are Auto (the game steps down by itself, as now), High, Medium and Low; a choice is kept on the device.
14. The pig's sounds are the shipped cues: power on waking, bump on its charge and hop and when he bounces off it, thud on a hit and on landing, clear on its defeat.

---

## File Structure

- `src/sim/pig.ts` (create): `PigState`, `Pig`, `PIG`, `PIG_ID`, `createPig`, `pigRect`, `hitPig`, `lockFacing`, `stepPig`.
- `src/sim/level.ts` (modify): `BossSpec`, `Level.boss`, `LevelId` adds `arena`, `DoorSpec.locked`, floor kind `carpet`, platform kinds `plush` and `till`, furniture kind `spotlight`.
- `src/sim/world.ts`, `src/sim/types.ts`, `src/sim/snot.ts`, `src/sim/events.ts`, `src/sim/feel.ts` (modify): `world.pig`, `Snapshot.pig`, the snot ending on it, the pig's events and feel.
- `src/sim/levels/giftshop.ts` (create): `GIFTSHOP`.
- `src/sim/game.ts` (modify): the pig made with the venue, the wake's gifts, the refill, the chained exit, the `title` mode and `toTitle`.
- `src/sim/drive.ts` (modify): the scripted pig fight.
- `src/sim/rig/pig.ts` (create): `PigClipCtx`, `PigFace`, `pigPose`, `pigFace`.
- `src/render/hud.ts` (modify): `HudPayload.boss`, the fight's hints.
- `src/render/frame.ts` (create): `fightFrame`, the camera between the fighters.
- `src/render/pig.ts` (create): `PigView` (painted or drawn), its flash, wobble and tufts; `drawPigStandIn`.
- `src/render/skin.ts`, `src/render/cast-body.ts` (modify): `CAST_Z`, `drawOrder`, `bodyLayersOf`, `RigFile.z`, `CastHead.faces`, `PaintOpts.face`, `loadRigArt`, `loadPigArt`.
- `src/render/venue-giftshop.ts` (create), `src/render/venue.ts` (modify): the carpet, the plush shelves, the till, the spotlight, the chained exit (`setChained`).
- `src/render/look.ts` (modify): the gift shop in the shift, the pig drawn and felt, the camera framing, the title hold, `start`, `toTitle`, `setQuality`, the stopped flag.
- `src/render/particles.ts`, `src/render/sound.ts`, `src/render/boards.ts`, `src/render/app.ts` (modify): the `stuffing` recipe, the pig's cues, the pig and start boards, the probe.
- `src/art/registry.ts` (modify): `Registry.pig`.
- `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `scripts/art-grid.mjs` (modify): a cut's own layer lists, face edits by name, the pig's sync, the `pig` grid target.
- `art/cuts/pig.json`, `art/cuts/wall-arena-far-1.json`, `wall-arena-far-2.json`, `wall-lobby-far-1.json`, `wall-lobby-far-2.json`, `wall-lobby-far-3.json` (create).
- `src/sim/levels/lobby.ts` (modify): the lobby's `backdrop`.
- `src/components/next-start.tsx` (create), `src/components/next-game.tsx`, `src/components/next-hud.tsx`, `src/components/next-veil.tsx`, `src/components/kiln-hop.tsx`, `src/routes/index.tsx`, `src/styles.css` (modify): the start screen, the pig's bar, practice, `title`, `quest`, then the switch.
- `scripts/start-art.mjs` (create), `public/start/*.webp` (create, committed): the start screen's pictures.
- Tests: `scripts/pig.check.mjs` (create, added to `test:next`), `scripts/venues.check.mjs`, `scripts/lobby.check.mjs`, `scripts/art.check.mjs`, `scripts/render.check.mjs` (modify); `scripts/pig-browser.check.mjs`, `scripts/next-start.check.mjs` (create); `scripts/shift-browser.check.mjs`, `scripts/next-browser.check.mjs`, `scripts/look-boards.mjs` (modify).
- Docs: `README.md`, the R3 design (as built), `art/ART-REQUEST.md`, `docs/superpowers/handoff-2026-10-14-r4.md`.

Test helpers already at the top of `scripts/venues.check.mjs`: `NONE`, `input`, `flat`, `steps`, `of`, `levelOf`, `clear`. In `scripts/lobby.check.mjs`: `mini`, `stashOf`, `play`, `stepsG`, `until` (Game form), `knockOut`, `input`. `scripts/pig.check.mjs` defines its own at its top (Task 1, Step 1).

---

### Task 1: The pig's fight

**Files:**
- Create: `src/sim/pig.ts`, `scripts/pig.check.mjs`
- Modify: `src/sim/level.ts` (`BossSpec`, `Level.boss`), `src/sim/world.ts`, `src/sim/types.ts`, `src/sim/snot.ts`, `src/sim/events.ts`, `src/sim/feel.ts`, `package.json` (`test:next` adds `scripts/pig.check.mjs`)

**Interfaces:**
- Produces: `type BossSpec = { x: number; arena: [number, number] }`, `Level.boss?: BossSpec`; `type PigState = "asleep" | "windup" | "charge" | "hop" | "recover" | "defeated"`; `type Pig = { x; y; vx; vy; onGround; floor; w; h; state: PigState; timer; facing: 1 | -1; hp; max; bonks; snots; hurtT; attacks; refill; arena: [number, number] }`; `PIG` (the numbers below); `PIG_ID = 900`; `createPig(b: BossSpec, floor = 0): Pig`; `pigRect(p: Pig): Rect`; `hitPig(p: Pig, by: "bonk" | "snot", amount: number, x: number, y: number, events: GameEvent[]): boolean`; `lockFacing(p: Pig, heroX: number): 1 | -1`; `stepPig(w: PigWorld, dt: number, prevY: number, jumpHeld: boolean, events: GameEvent[]): void`; `World.pig: Pig | null`, `WorldOptions.pig?: Pig | null`; `Snapshot.pig: Pig | null`; the events `pigWake`, `pigWindup { hop }`, `pigCharge { dir }`, `pigHop { dir }`, `pigLand`, `pigHit { by, hp, bonks, snots }`, `pigHold { word }`, `pigDown { points }`, `pigBounce`, `pigShrug`, `pigRefill` (all with `x, y`).

- [ ] **Step 1: Write the failing tests** (create `scripts/pig.check.mjs`; add it to `test:next` in `package.json` after `scripts/venues.check.mjs`)

```js
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { PIG, PIG_ID, createPig, hitPig, stepPig } from "../src/sim/pig.ts";
import { STOMP } from "../src/sim/cast.ts";
import { CHARGE_MAX } from "../src/sim/moves.ts";
import { feelOf } from "../src/sim/feel.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const ARENA = [600, 3900];
const flat = () => ({ floor: [{ x0: -400, x1: 4800, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -400, y: -1600, w: 5200, h: 2200 } });
/** Him at `hero`, the pig asleep at `x` in an arena from 600 to 3900: inside it, the first step wakes it. */
const fight = (hero = 300, x = 2600) => createWorld(flat(), { x: hero, y: 0 }, { pig: createPig({ x, arena: ARENA }) });
/** The pig awake and resting for a long while: a still target. */
const still = (w) => Object.assign(w.pig, { state: "recover", timer: 99 });
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const press = (w, key) => { w.step(input({ [key]: true }, { [key]: true })); return [...w.events]; };
const of = (evs, type) => evs.filter((e) => e.type === type);
/** Every change of the pig's state for `seconds`: the state, when, and where the pig was. */
const record = (w, seconds) => {
  const out = [];
  let t = 0, last = w.pig.state, top = 0, landT = null;
  while (t < seconds) {
    w.step(input());
    t += STEP;
    top = Math.min(top, w.pig.y);
    if (of(w.events, "pigLand").length) landT = t;
    if (w.pig.state !== last) out.push({ s: (last = w.pig.state), t, x: w.pig.x });
  }
  return { states: out, top, landT };
};
const near = (a, b, what) => assert.ok(Math.abs(a - b) <= 2 * STEP + 1e-9, `${what}: ${a} not ${b}`);

test("the pig sleeps until he crosses into the arena, then winds up facing him for 1.1 s", () => {
  const w = fight(300);
  assert.equal(of(steps(w, 1), "pigWake").length, 0);
  assert.equal(w.pig.state, "asleep");
  w.hero.x = 610;
  const evs = steps(w, STEP);
  assert.equal(of(evs, "pigWake").length, 1);
  assert.deepEqual([w.pig.state, w.pig.facing, of(evs, "pigWindup")[0]?.hop], ["windup", -1, false]);
  assert.ok(Math.abs(w.pig.timer - PIG.windupFirst) < 1e-9, `a fresh 1.1 s: ${w.pig.timer}`);
});

test("its pattern: the first wind-up 1.1 s, a charge at 880 for 0.85 s, a 1.35 s rest, wind-ups of 0.9 s, and every third attack a hop", () => {
  // Him far to the right, the pig on his side of the middle: every attack goes his way and none reaches an edge.
  const { states, top, landT } = record(fight(3700, 1500), 10.5);
  assert.deepEqual(states.slice(0, 10).map((s) => s.s), ["windup", "charge", "recover", "windup", "charge", "recover", "windup", "hop", "recover", "windup"]);
  const dur = (i) => states[i + 1].t - states[i].t;
  near(dur(0), PIG.windupFirst, "the first wind-up");
  near(dur(1), PIG.chargeT, "a charge");
  near(dur(2), PIG.recover, "the rest");
  near(dur(3), PIG.windup, "a later wind-up");
  near(dur(7), PIG.hopT, "a hop");
  assert.ok(Math.abs(states[2].x - states[1].x - PIG.charge * PIG.chargeT) < 15, `880 px/s for 0.85 s: ${states[2].x - states[1].x}`);
  assert.ok(Math.abs(states[8].x - states[7].x - PIG.hopVx * PIG.hopAir) < 15, `forward while in the air: ${states[8].x - states[7].x}`);
  assert.ok(Math.abs(-top - PIG.hopHigh) < 8, `260 high: ${-top}`);
  near(landT - states[7].t, PIG.hopAir, "0.6 s in the air");
});

test("at half its HP or below it winds up in 0.7 s and charges at 1040", () => {
  const w = fight(3700, 1500);
  w.pig.hp = 6;
  const { states } = record(w, 6);
  near(states[3].t - states[2].t, PIG.recover, "the rest");
  near(states[4].t - states[3].t, PIG.windupHalf, "the wind-up at half HP");
  assert.ok(Math.abs(states[2].x - states[1].x - PIG.chargeHalf * PIG.chargeT) < 15, `1040 px/s: ${states[2].x - states[1].x}`);
});

test("it locks its direction when the wind-up starts: he can run behind it and it charges the way it faced", () => {
  const w = fight(3000, 2000);
  w.step(input());
  assert.equal(w.pig.facing, 1);
  w.hero.x = 1500;
  while (w.pig.state === "windup") w.step(input());
  assert.deepEqual([w.pig.state, w.pig.facing, Math.sign(w.pig.vx)], ["charge", 1, 1]);
});

test("near the arena's left edge it faces right and near its right edge left, whichever side he is on", () => {
  const left = fight(700, 1400);
  left.step(input());
  assert.equal(left.pig.facing, 1, "800 px from the left edge, him on its left");
  const right = fight(3800, 3500);
  right.step(input());
  assert.equal(right.pig.facing, -1, "400 px from the right edge, him on its right");
});

test("a charge that reaches its limit ends there, 540 px inside the left edge, and it rests: him in the corner, untouched", () => {
  const w = fight(700, 1900);
  while (w.pig.state !== "recover") w.step(input());
  assert.ok(Math.abs(w.pig.x - (ARENA[0] + PIG.keepLeft + PIG.w / 2)) < 1e-6, `stopped at ${w.pig.x}`);
  assert.equal(w.pig.vx, 0);
  assert.equal(w.hero.patience, 2);
});

test("12 HP: a hit takes its amount and counts as a bonk or a snot; another within 0.38 s does not count; asleep it takes none", () => {
  const p = createPig({ x: 2000, arena: ARENA });
  const evs = [];
  assert.equal(hitPig(p, "bonk", 1, 0, 0, evs), false, "asleep");
  Object.assign(p, { state: "recover", timer: 9 });
  assert.equal(hitPig(p, "bonk", 1, 0, 0, evs), true);
  assert.equal(hitPig(p, "snot", 1, 0, 0, evs), false, "inside the gap");
  assert.deepEqual([p.hp, p.bonks, p.snots, p.hurtT], [11, 1, 0, PIG.gap]);
  p.hurtT = 0;
  assert.equal(hitPig(p, "bonk", 2, 0, 0, evs), true, "the super smash's two");
  assert.deepEqual([p.hp, p.bonks], [9, 2]);
  assert.deepEqual(of(evs, "pigHit").map((e) => [e.by, e.hp, e.bonks, e.snots]), [["bonk", 11, 1, 0], ["bonk", 9, 2, 0]]);
});

test("at least 3 bonks and 3 snots: a hit that would end it short holds it at 1 HP, MORE BONKS before MORE SNOT; then it goes down for 3000", () => {
  const p = Object.assign(createPig({ x: 2000, arena: ARENA }), { state: "recover", timer: 9, hp: 1, bonks: 1, snots: 1 });
  const evs = [];
  hitPig(p, "snot", 1, 0, 0, evs);
  assert.deepEqual([p.hp, of(evs, "pigHold").map((e) => e.word)], [1, ["MORE BONKS"]]);
  Object.assign(p, { hurtT: 0, bonks: 3 });
  hitPig(p, "bonk", 1, 0, 0, evs);
  assert.deepEqual([p.hp, p.state, of(evs, "pigHold").map((e) => e.word)], [1, "recover", ["MORE BONKS", "MORE SNOT"]]);
  Object.assign(p, { hurtT: 0, snots: 2 });
  hitPig(p, "snot", 1, 0, 0, evs);
  assert.deepEqual([p.hp, p.state, of(evs, "pigDown").map((e) => e.points)], [0, "defeated", [PIG.points]]);
  p.hurtT = 0;
  assert.equal(hitPig(p, "bonk", 1, 0, 0, evs), false, "nothing counts once it is down");
});

test("the mallet bonks it once a swing", () => {
  const w = fight(1500, 1700);
  still(w);
  w.hero.facing = 1;
  const evs = [...press(w, "hammer"), ...steps(w, 1)];
  assert.deepEqual(of(evs, "pigHit").map((e) => e.by), ["bonk"]);
  assert.equal(w.pig.hp, 11);
  const again = [...press(w, "hammer"), ...steps(w, 1)];
  assert.equal(of(again, "pigHit").length, 1, "the next swing counts again");
  assert.equal(w.pig.hp, 10);
});

test("a swing that meets it inside the gap is not spent: a later sample of that swing counts once the gap is over", () => {
  const pig = Object.assign(createPig({ x: 2000, arena: ARENA }), { state: "recover", timer: 99, hurtT: 0.05 });
  const hero = { x: 1700, y: 0, w: 110, h: 300, vx: 0, vy: 0, invuln: 0, onGround: true, move: { kind: "swing", victims: [] } };
  // The mallet head inside the pig's body this step, as `swingContact` leaves its path in `world.swing`.
  const w = { pig, hero, swing: [{ x: 1900, y: -200 }], hits: [] };
  const evs = [];
  stepPig(w, STEP, 0, false, evs);
  assert.deepEqual([of(evs, "pigHit").length, hero.move.victims], [0, []], "inside the gap: nothing, and the swing not spent");
  pig.hurtT = 0;
  stepPig(w, STEP, 0, false, evs);
  assert.deepEqual([of(evs, "pigHit").length, hero.move.victims], [1, [PIG_ID]]);
  stepPig(w, STEP, 0, false, evs);
  assert.equal(of(evs, "pigHit").length, 1, "then spent: once a swing");
});

test("a snot, hot or not, takes 1 and ends on it: nothing goes through or past", () => {
  for (const hot of [false, true]) {
    const w = fight(1300, 1900);
    still(w);
    Object.assign(w.hero, { facing: 1, hot });
    const evs = [...press(w, "fire"), ...steps(w, 1.5)];
    assert.deepEqual(of(evs, "pigHit").map((e) => e.by), ["snot"], `hot ${hot}`);
    assert.equal(w.pig.hp, 11);
    assert.equal(of(evs, "splat").filter((e) => e.floor).length, 0, `hot ${hot}: no puddle beyond it`);
    assert.equal(w.snot.length, 0);
  }
});

test("the super smash takes 2 and counts as a bonk", () => {
  const w = fight(1500, 1800);
  still(w);
  Object.assign(w.hero, { facing: 1, charge: CHARGE_MAX });
  const evs = [...press(w, "super"), ...steps(w, 2)];
  assert.deepEqual(of(evs, "pigHit").map((e) => [e.by, e.hp, e.bonks]), [["bonk", 10, 1]]);
});

test("landing on it from above bounces him off, no harm either way; walking into it costs a pip, but not in grace or under a Buc-ee's", () => {
  const w = fight(1000, 1600);
  still(w);
  // Falling 1200 px/s from just above its top: this step his feet sink into it.
  Object.assign(w.hero, { x: 1600, y: -402, vx: 0, vy: 1200, onGround: false });
  const evs = steps(w, STEP, { jump: true });
  assert.equal(of(evs, "pigBounce").length, 1);
  assert.ok(Math.abs(w.hero.vy + STOMP.held) < 1, `bounced: ${w.hero.vy}`);
  assert.deepEqual([w.hero.patience, w.pig.hp], [2, 12]);
  Object.assign(w.hero, { x: 1450, y: 0, vx: 0, vy: 0, onGround: true, invuln: 3 });
  steps(w, 0.2);
  assert.deepEqual([w.hero.patience, w.pig.hp], [2, 12], "in grace (a Buc-ee's keeps him in it): nothing either way");
  Object.assign(w.hero, { x: 1450, y: 0, vx: 0, vy: 0, onGround: true, invuln: 0 });
  steps(w, 0.2);
  assert.equal(w.hero.patience, 1, "walking into it");
});

test("the lecture does nothing to it but a shrug", () => {
  const w = fight(1500, 1750);
  still(w);
  w.hero.facing = 1;
  const evs = [...press(w, "lecture"), ...steps(w, 2)];
  assert.equal(of(evs, "pigShrug").length, 1);
  assert.equal(w.pig.hp, 12);
});

test("while the fight is on he is held between the arena's edges; once it is down he may leave", () => {
  const w = fight(700, 2600);
  steps(w, 2, { left: true, run: true });
  assert.ok(Math.abs(w.hero.x - (ARENA[0] + w.hero.w / 2)) < 1e-6, `held at ${w.hero.x}`);
  w.pig.state = "defeated";
  steps(w, 1, { left: true, run: true });
  assert.ok(w.hero.x < ARENA[0], `free to go: ${w.hero.x}`);
});

test("a pig beaten in the air comes down to the floor and stays there, harmless", () => {
  const w = fight(3700, 1500);
  Object.assign(w.pig, { state: "hop", timer: 1, vy: -800, vx: 520, onGround: false, y: -100, hp: 1, bonks: 3, snots: 3 });
  hitPig(w.pig, "bonk", 1, 0, 0, []);
  steps(w, 1);
  assert.deepEqual([w.pig.state, w.pig.y, w.pig.onGround, w.pig.vx], ["defeated", 0, true, 0]);
  Object.assign(w.hero, { x: w.pig.x - 100, y: 0, invuln: 0 });
  steps(w, 0.2);
  assert.equal(w.hero.patience, 2, "a deflated pig does no harm");
});

test("the snapshot carries a copy of the pig", () => {
  const w = fight(700);
  w.step(input());
  const s = w.snapshot();
  s.pig.x = -1;
  assert.notEqual(w.pig.x, -1);
  assert.equal(createWorld(flat(), { x: 0, y: 0 }).snapshot().pig, null);
});

test("the fight's feel: a hit pushes the camera in, the defeat slows time to 0.6 for 0.3 s, a landing shakes it", () => {
  assert.deepEqual(feelOf({ type: "pigHit", by: "snot", x: 0, y: 0, hp: 11, bonks: 0, snots: 1 }).zoom, { amount: 1.12, seconds: 0.4 });
  assert.deepEqual(feelOf({ type: "pigDown", x: 0, y: 0, points: 3000 }).slowmo, { scale: 0.6, seconds: 0.3 });
  assert.equal(feelOf({ type: "pigLand", x: 0, y: 0 }).trauma, 0.5);
});
```

Name the production change each test catches before writing it: the wake rule, the state machine's timers and speeds, the half-HP numbers, the facing lock and the edge rule, the arena limit ending a charge, `hitPig`'s gap and counts, the combo hold, the mallet's victim rule, the snot ending on the pig, the burst's two, the stomp and contact, the shrug, the hold, the fall when beaten in the air, the snapshot, the feel.

- [ ] **Step 2: Run the tests to watch them fail**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/pig.check.mjs`
Expected: FAIL, every test, on the missing `../src/sim/pig.ts` module.

- [ ] **Step 3: The level's boss** (in `src/sim/level.ts`, beside `BackdropSpec`, and the field in `Level` after `backdrop`)

```ts
/** The gift shop's fight: where the pig sleeps and the arena he is held in once it wakes (R3 §3.3, §5.1). */
export type BossSpec = { x: number; arena: [number, number] };
```

```ts
  /** The pig's fight (the gift shop). */
  boss?: BossSpec;
```

- [ ] **Step 4: The pig** (create `src/sim/pig.ts`)

```ts
import { STOMP } from "./cast";
import type { GameEvent } from "./events";
import { bodyRect, overlapsRect, sweptHeadHits } from "./geometry";
import { BURST_R, MALLET_R } from "./hits";
import type { BossSpec } from "./level";
import type { HeroState, Point, Rect } from "./types";

export type PigState = "asleep" | "windup" | "charge" | "hop" | "recover" | "defeated";

/** The pink menace (R3 §5): `x` its middle, `y` its feet, as the cast's. */
export type Pig = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** The floor it stands on. */
  floor: number;
  w: number;
  h: number;
  state: PigState;
  /** Seconds left of a wind-up, charge, hop or rest; seconds since it went down once defeated. */
  timer: number;
  facing: 1 | -1;
  hp: number;
  max: number;
  bonks: number;
  snots: number;
  /** Seconds before another hit counts. */
  hurtT: number;
  attacks: number;
  /** Seconds to the next pepper refill (the Game lays the pepper). */
  refill: number;
  arena: [number, number];
};

/** The shipped fight's numbers at the new scale (R3 §5.2), its limits in the arena (the shipped 80 and 8 px) and its size. */
export const PIG = {
  hp: 12,
  need: 3,
  gap: 0.38,
  w: 240,
  h: 400,
  windupFirst: 1.1,
  windup: 0.9,
  windupHalf: 0.7,
  charge: 880,
  chargeHalf: 1040,
  chargeT: 0.85,
  hopVx: 520,
  hopHigh: 260,
  hopAir: 0.6,
  hopT: 1.15,
  recover: 1.35,
  /** Within this of the arena's left edge it winds up facing right; within `faceLeft` of the right edge, left. */
  faceRight: 900,
  faceLeft: 450,
  /** Its body keeps this far inside the arena's edges: the left corner, where the pepper refills, is out of its reach. */
  keepLeft: 540,
  keepRight: 50,
  refill: 3,
  refillAt: 150,
  points: 3000,
  /** The grace he gets as it wakes. */
  grace: 1.2,
} as const;

/** The pig's id among the mallet's victims: clear of the carts' and the cast's. */
export const PIG_ID = 900;

const HOP_VY = (4 * PIG.hopHigh) / PIG.hopAir;
const HOP_G = (8 * PIG.hopHigh) / PIG.hopAir ** 2;

export const createPig = (b: BossSpec, floor = 0): Pig => ({
  x: b.x,
  y: floor,
  vx: 0,
  vy: 0,
  onGround: true,
  floor,
  w: PIG.w,
  h: PIG.h,
  state: "asleep",
  timer: 0,
  facing: -1,
  hp: PIG.hp,
  max: PIG.hp,
  bonks: 0,
  snots: 0,
  hurtT: 0,
  attacks: 0,
  refill: 0,
  arena: [b.arena[0], b.arena[1]],
});

export const pigRect = (p: Pig): Rect => bodyRect(p);
const halfHp = (p: Pig) => p.hp <= p.max / 2;
const fighting = (p: Pig) => p.state !== "asleep" && p.state !== "defeated";

/** The way it winds up: toward him, but out of the arena's ends (the shipped rule). */
export function lockFacing(p: Pig, heroX: number): 1 | -1 {
  const [x0, x1] = p.arena;
  if (p.x - x0 < PIG.faceRight) return 1;
  if (x1 - p.x < PIG.faceLeft) return -1;
  return heroX < p.x ? -1 : 1;
}

/**
 * A hit on the pig; true when it counts. One in 0.38 s counts. It ends short of 3 bonks or 3 snots held at 1 HP with
 * the word for what it still needs, the bonks first; otherwise at 0 it goes down for 3000.
 */
export function hitPig(p: Pig, by: "bonk" | "snot", amount: number, x: number, y: number, events: GameEvent[]): boolean {
  if (!fighting(p) || p.hurtT > 0) return false;
  p.hurtT = PIG.gap;
  if (by === "bonk") p.bonks++;
  else p.snots++;
  p.hp = Math.max(0, p.hp - amount);
  events.push({ type: "pigHit", by, x, y, hp: p.hp, bonks: p.bonks, snots: p.snots });
  if (p.hp > 0) return true;
  if (p.bonks < PIG.need || p.snots < PIG.need) {
    p.hp = 1;
    events.push({ type: "pigHold", word: p.bonks < PIG.need ? "MORE BONKS" : "MORE SNOT", x: p.x, y: p.y - p.h });
    return true;
  }
  p.state = "defeated";
  p.timer = 0;
  p.vx = 0;
  events.push({ type: "pigDown", x: p.x, y: p.y, points: PIG.points });
  return true;
}

function windup(p: Pig, heroX: number, seconds: number, events: GameEvent[]) {
  p.state = "windup";
  p.timer = seconds;
  p.vx = 0;
  p.facing = lockFacing(p, heroX);
  events.push({ type: "pigWindup", x: p.x, y: p.y - p.h, hop: (p.attacks + 1) % 3 === 0 });
}

function rest(p: Pig) {
  p.state = "recover";
  p.timer = PIG.recover;
  p.vx = 0;
}

/** Its pattern (the shipped `stepBoss`): wind-up, then a charge or every third attack a hop, then the rest. */
function pattern(p: Pig, heroX: number, dt: number, events: GameEvent[]) {
  p.timer -= dt;
  if (p.state === "windup" && p.timer <= 0) {
    p.attacks++;
    const hop = p.attacks % 3 === 0;
    p.state = hop ? "hop" : "charge";
    p.timer = hop ? PIG.hopT : PIG.chargeT;
    p.vx = p.facing * (hop ? PIG.hopVx : halfHp(p) ? PIG.chargeHalf : PIG.charge);
    if (hop) {
      p.vy = -HOP_VY;
      p.onGround = false;
    }
    events.push({ type: hop ? "pigHop" : "pigCharge", x: p.x, y: p.y, dir: p.facing });
  } else if ((p.state === "charge" || p.state === "hop") && p.timer <= 0) rest(p);
  else if (p.state === "recover" && p.timer <= 0) windup(p, heroX, halfHp(p) ? PIG.windupHalf : PIG.windup, events);
}

/** In the air it falls, and lands with its feet still; along the floor it is held inside its limits, and a charge that meets one ends. */
function move(p: Pig, dt: number, events: GameEvent[]) {
  if (!p.onGround) {
    p.vy += HOP_G * dt;
    p.y += p.vy * dt;
    if (p.y >= p.floor) {
      p.y = p.floor;
      p.vy = 0;
      p.vx = 0;
      p.onGround = true;
      events.push({ type: "pigLand", x: p.x, y: p.y });
    }
  }
  p.x += p.vx * dt;
  const lo = p.arena[0] + PIG.keepLeft + p.w / 2;
  const hi = p.arena[1] - PIG.keepRight - p.w / 2;
  if (p.x < lo || p.x > hi) {
    p.x = Math.min(hi, Math.max(lo, p.x));
    p.vx = 0;
    if (p.state === "charge") rest(p);
  }
}

/** The arena closes behind him: he is held between its edges while the fight is on. */
function holdIn(h: HeroState, [x0, x1]: [number, number]) {
  const lo = x0 + h.w / 2;
  const hi = x1 - h.w / 2;
  if (h.x < lo) {
    h.x = lo;
    h.vx = Math.max(0, h.vx);
  } else if (h.x > hi) {
    h.x = hi;
    h.vx = Math.min(0, h.vx);
  }
}

export type PigWorld = { pig: Pig | null; hero: HeroState; swing: Point[]; hits: number[] };

/** The mallet's arc this step (once a swing, and only a hit that counts spends it), the burst's two, and the lecture's shrug. */
function strikes(p: Pig, w: PigWorld, events: GameEvent[]) {
  const r = pigRect(p);
  const m = w.hero.move;
  if (m?.kind === "swing" && !m.victims.includes(PIG_ID))
    for (let k = 0; k < w.swing.length; k++) {
      const a = w.swing[Math.max(0, k - 1)];
      const b = w.swing[k];
      if (!sweptHeadHits(a, b, MALLET_R, r)) continue;
      if (hitPig(p, "bonk", 1, b.x, b.y, events)) m.victims.push(PIG_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(p.x - burst.x, p.y - p.h / 2 - burst.y) <= BURST_R) hitPig(p, "bonk", 2, p.x, p.y - p.h * 0.6, events);
  const lecture = events.find((e) => e.type === "lecture") as Extract<GameEvent, { type: "lecture" }> | undefined;
  if (lecture && overlapsRect(lecture.reach, r)) events.push({ type: "pigShrug", x: w.hero.x, y: w.hero.y - w.hero.h });
}

/** Landing on it from above bounces him off; walking into it costs a pip, unless he is in grace, down, or it is not fighting. */
function contact(p: Pig, w: PigWorld, prevY: number, jumpHeld: boolean, events: GameEvent[]) {
  const h = w.hero;
  const r = pigRect(p);
  if (!overlapsRect(bodyRect(h), r)) return;
  if (h.vy > 0 && prevY <= r.y + STOMP.tolerance) {
    h.vy = -(jumpHeld ? STOMP.held : STOMP.bounce);
    h.onGround = false;
    events.push({ type: "pigBounce", x: h.x, y: r.y });
    return;
  }
  if (!fighting(p) || h.invuln > 0 || h.move?.kind === "tumble") return;
  w.hits.push(p.x);
}

/** One step of the pig: asleep until he crosses into the arena; then its pattern, him held in, its hits, and touching it. */
export function stepPig(w: PigWorld, dt: number, prevY: number, jumpHeld: boolean, events: GameEvent[]): void {
  const p = w.pig;
  if (!p) return;
  const h = w.hero;
  p.hurtT = Math.max(0, p.hurtT - dt);
  if (p.state === "asleep" && h.x >= p.arena[0]) {
    events.push({ type: "pigWake", x: p.x, y: p.y - p.h });
    windup(p, h.x, PIG.windupFirst, events);
  } else if (p.state === "defeated") p.timer += dt;
  else if (p.state !== "asleep") {
    p.refill = Math.max(0, p.refill - dt);
    pattern(p, h.x, dt, events);
  }
  move(p, dt, events);
  if (fighting(p)) {
    holdIn(h, p.arena);
    strikes(p, w, events);
  }
  contact(p, w, prevY, jumpHeld, events);
}
```

Read `src/sim/geometry.ts` first: if `sweptHeadHits` lives only in `hits.ts`, import it from there (both export it today).

- [ ] **Step 5: The pig's events** (append to the `GameEvent` union in `src/sim/events.ts`, before `mode`)

```ts
  /** He crossed into the arena: the pig wakes ("PIG FIGHT"). */
  | { type: "pigWake"; x: number; y: number }
  /** A wind-up starts; `hop` when the attack it winds up for is a hop (the "BOING!" warning). */
  | { type: "pigWindup"; x: number; y: number; hop: boolean }
  | { type: "pigCharge"; x: number; y: number; dir: 1 | -1 }
  | { type: "pigHop"; x: number; y: number; dir: 1 | -1 }
  | { type: "pigLand"; x: number; y: number }
  /** A hit that counted: what it was, and the pig's HP and counts after it. */
  | { type: "pigHit"; by: "bonk" | "snot"; x: number; y: number; hp: number; bonks: number; snots: number }
  /** A hit that would have ended it short of the rule: held at 1 HP. */
  | { type: "pigHold"; word: "MORE BONKS" | "MORE SNOT"; x: number; y: number }
  | { type: "pigDown"; x: number; y: number; points: number }
  /** He landed on it from above and bounced off. */
  | { type: "pigBounce"; x: number; y: number }
  /** The lecture reached it: "It's a stuffed animal." */
  | { type: "pigShrug"; x: number; y: number }
  /** A refill pepper appeared at the arena's left edge. */
  | { type: "pigRefill"; x: number; y: number }
```

- [ ] **Step 6: The world steps it** (in `src/sim/world.ts`: import `stepPig` and `type Pig` from `./pig`; add `pig?: Pig | null` to `WorldOptions`; add the field, its creation, its step after `stepCast`, and its snapshot)

```ts
  /** The gift shop's pig, or null. */
  pig: Pig | null;
```

```ts
    pig: opts.pig ?? null,
```

```ts
      stepCast(world, STEP, prevY, input.held.jump, events);
      stepPig(world, STEP, prevY, input.held.jump, events);
```

```ts
        doors: world.swingDoors.map((d) => ({ ...d })),
        pig: world.pig && { ...world.pig, arena: [world.pig.arena[0], world.pig.arena[1]] },
```

In `src/sim/types.ts`, `import type { Pig } from "./pig";` and add `pig: Pig | null` to `Snapshot`.

- [ ] **Step 7: The snot ends on it** (in `src/sim/snot.ts`: `import { hitPig, pigRect, type Pig } from "./pig";`, add `pig?: Pig | null` to `stepSnot`'s world type, and in the blob's loop after the cast's)

```ts
    // The pig stops any snot, hot or not: it takes 1 if the hit counts, and nothing goes through or past it.
    const pig = w.pig;
    if (pig && b.life > 0 && pig.state !== "asleep" && sweptHeadHits(a, b, r, pigRect(pig))) {
      b.life = 0;
      hitPig(pig, "snot", 1, b.x, b.y, events);
      events.push({ type: "splat", x: b.x, y: b.y, floor: false, hot: b.hot });
    }
```

- [ ] **Step 8: The feel** (in `src/sim/feel.ts`'s switch)

```ts
    // A boss hit pushes the camera in (spec §5.4); the defeat slows time (spec §9); a hop's landing shakes it (R3 §5.2).
    case "pigHit":
      return { hitstop: 0.04, trauma: 0.3, zoom: { amount: 1.12, seconds: 0.4 } };
    case "pigDown":
      return { hitstop: 0.08, trauma: 0.6, slowmo: { scale: 0.6, seconds: 0.3 } };
    case "pigLand":
      return { hitstop: 0, trauma: 0.5 };
```

- [ ] **Step 9: Run the tests to watch them pass**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/pig.check.mjs`
Expected: PASS, 18 tests. If the swing in "the mallet bonks it once a swing" misses (the arc's reach in front of him is 65 to 218 px plus the 36 px head, measured with `malletAt` over `SWING_ACTIVE`), move him, not the rule, and ledger it.

- [ ] **Step 10: The whole suite, the types and the lint**

Run: `npm run test:next`, `npm run test:game`, `npx tsc --noEmit`, `npx eslint src/sim scripts/pig.check.mjs`
Expected: all pass (the earlier counts plus 18); no type errors (every `Snapshot` built by hand in the tests or the boards gets `pig: null`).

- [ ] **Step 11: Commit**

```bash
git add src/sim/pig.ts src/sim/level.ts src/sim/world.ts src/sim/types.ts src/sim/snot.ts src/sim/events.ts src/sim/feel.ts scripts/pig.check.mjs package.json
```

Message: "The pig's fight: its pattern, its 12 HP and the bonk-and-snot rule, its hits, bouncing off it and running into it" with a body naming the shipped rules ported and the scale. Push.

### Task 2: The gift shop and the fight in the shift

**Files:**
- Create: `src/sim/levels/giftshop.ts`
- Modify: `src/sim/level.ts`, `src/sim/game.ts`, `src/sim/drive.ts`, `src/render/hud.ts`
- Test: `scripts/pig.check.mjs`, `scripts/venues.check.mjs`

**Interfaces:**
- Consumes: Task 1's `Pig`, `PIG`, `createPig`, `BossSpec`, `World.pig`, the pig's events.
- Produces: `LevelId` adds `"arena"`; `FloorKind` adds `"carpet"`; `PlatformKind` adds `"plush"` and `"till"`; `FurnitureKind` adds `"spotlight"`; `DoorSpec.locked?: boolean`; `GIFTSHOP: Level`; the Game makes the pig with its venue and lays the refill pepper (`pigRefill`); `HudPayload.boss: { hp: number; max: number; bonks: number; snots: number; need: number } | null`; `hintOf` names the fight; `drive(level, h, route, world)` fights the pig.

- [ ] **Step 1: Write the failing tests** (append to `scripts/pig.check.mjs`; add `import { createGame } from "../src/sim/game.ts";`, `import { GIFTSHOP } from "../src/sim/levels/giftshop.ts";`, `import { LOBBY } from "../src/sim/levels/lobby.ts";`, `import { STASH } from "../src/sim/levels/stash.ts";`, `import { PATIENCE_MAX } from "../src/sim/damage.ts";`, `import { hudOf } from "../src/render/hud.ts";`, `import { drive } from "../src/sim/drive.ts";` and `import { PICKUP_SIZE } from "../src/sim/level.ts";`)

```js
/** A pig practice: the gift shop alone, after a lobby the run never visits. */
const shop = (seed = 7) => createGame({ lobby: LOBBY, stash: STASH, venues: [GIFTSHOP] }, seed, { start: 1 });
const play = (g) => { while (g.mode === "card") g.step(input()); };
const stepsG = (g, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { g.step(input(held)); out.push(...g.events); } return out; };
/** Into the arena: he crosses its edge and the pig wakes. */
const wake = (g) => { g.world.hero.x = 610; return stepsG(g, STEP); };

test("the gift shop keeps the spec's shape: 4,400 px, 300 s, the arena 600 to 3900 with its clock at the door in, the shelves, the till and the chained exit", () => {
  const L = GIFTSHOP;
  assert.deepEqual([L.id, L.world, L.name, L.length, L.time, L.spawn.x], ["arena", "1-4", "The Pink Menace", 4400, 300, 300]);
  assert.deepEqual(L.boss, { x: 2600, arena: [600, 3900] });
  assert.deepEqual(L.crates.map((c) => [c.kind, c.x]), [["pepper", 500]]);
  assert.deepEqual(L.checkpoints.map((k) => k.x), [600]);
  assert.deepEqual(L.platforms.map((p) => [p.kind, p.x0, p.x1, -p.y]), [["plush", 1100, 1500, 180], ["plush", 1800, 2200, 360], ["till", 2900, 3500, 180]]);
  const exit = L.doors.find((d) => d.kind === "exit");
  assert.deepEqual([exit.x, exit.label, exit.locked], [4100, "CLOCK OUT", true]);
  assert.deepEqual(L.camera.zones, [{ x0: 600, x1: 3900, zoom: 0.92 }]);
  assert.ok(L.floor.every((f) => f.kind === "carpet" && f.y0 === 0 && f.y1 === 0), "one carpeted floor, no pit");
});

test("crossing into the arena wakes the pig, punches the clock there, and gives him the pepper and 1.2 s of grace, not its points", () => {
  const g = shop();
  play(g);
  g.world.hero.patience = 1;
  const score = g.run.score;
  const evs = wake(g);
  assert.equal(of(evs, "pigWake").length, 1);
  assert.deepEqual(of(evs, "checkpoint").map((e) => e.id), ["arena"]);
  const h = g.world.hero;
  assert.deepEqual([h.hot, h.patience, g.run.checkpoint, g.run.score], [true, PATIENCE_MAX, "arena", score]);
  assert.ok(h.invuln >= PIG.grace - STEP, `grace: ${h.invuln}`);
});

test("the exit stays shut while the pig fights and opens once it is down", () => {
  const g = shop();
  play(g);
  wake(g);
  Object.assign(g.world.hero, { x: 4060, vx: 0 });
  stepsG(g, 1, { right: true });
  assert.equal(g.mode, "play");
  assert.ok(g.world.hero.x <= 3900 - g.world.hero.w / 2 + 1e-6, `held in the arena: ${g.world.hero.x}`);
  g.world.pig.state = "defeated";
  Object.assign(g.world.hero, { x: 3990, vx: 0 });
  stepsG(g, 2, { right: true });
  assert.ok(["walkoff", "tally", "clear"].includes(g.mode), `clocked out: ${g.mode}`);
});

test("a pepper appears 150 px inside the arena's left edge every 3 s while he is not hot and none is out", () => {
  const g = shop();
  play(g);
  wake(g);
  const peppers = () => g.pickups.filter((p) => p.kind === "pepper" && !p.taken);
  stepsG(g, 4);
  assert.equal(peppers().length, 0, "he is hot from the wake: none");
  g.world.hero.hot = false;
  g.world.pig.refill = 0.5;
  const evs = stepsG(g, 0.6);
  assert.deepEqual(of(evs, "pigRefill").map((e) => [e.x, e.y]), [[600 + PIG.refillAt, -PICKUP_SIZE]]);
  assert.deepEqual(peppers().map((p) => [p.x, p.y]), [[750, -PICKUP_SIZE]]);
  assert.equal(of(stepsG(g, 4), "pigRefill").length, 0, "not while one is out");
  Object.assign(g.world.hero, { x: 750, y: 0, vx: 0 });
  stepsG(g, 0.2);
  assert.deepEqual([peppers().length, g.world.hero.hot], [0, true]);
  g.world.hero.hot = false;
  const later = stepsG(g, 3.1);
  assert.equal(of(later, "pigRefill").length, 1, "another once he has eaten it and is not hot");
});

test("a life lost in the fight brings back a fresh pig, asleep at its spot, and him at the arena's clock, where it wakes again", () => {
  const g = shop();
  play(g);
  wake(g);
  Object.assign(g.world.pig, { hp: 5, bonks: 3, snots: 4 });
  g.world.hero.invuln = 0;
  g.world.hero.patience = 1;
  g.world.hit(g.world.hero.x + 100);
  while (g.mode !== "card") g.step(input());
  assert.deepEqual([g.world.pig.state, g.world.pig.hp, g.world.pig.x], ["asleep", 12, 2600]);
  play(g);
  g.step(input());
  assert.deepEqual([g.world.pig.state, g.world.hero.x >= 600, g.world.hero.hot], ["windup", true, true]);
  assert.equal(g.pickups.filter((p) => p.kind === "pepper" && !p.taken && p.x === 750).length, 0, "no refill pepper from before");
});

test("the HUD shows the pig's bar and counts while the fight is on, the hint names the rule; after it, the way out", () => {
  const g = shop();
  play(g);
  assert.equal(hudOf(g, null).boss, null, "asleep: no bar");
  wake(g);
  Object.assign(g.world.pig, { hp: 9, bonks: 2, snots: 1 });
  const hud = hudOf(g, null);
  assert.deepEqual(hud.boss, { hp: 9, max: 12, bonks: 2, snots: 1, need: 3 });
  assert.equal(hud.hint, "Pig fight · 3 bonks + 3 snots minimum · pepper refills on the left");
  g.world.pig.state = "defeated";
  assert.deepEqual([hudOf(g, null).boss, hudOf(g, null).hint], [null, "The chain is off · walk into CLOCK OUT"]);
});

test("the pig's defeat scores 3000", () => {
  const g = shop();
  play(g);
  wake(g);
  stepsG(g, 2);
  Object.assign(g.world.pig, { hp: 1, bonks: 3, snots: 3, hurtT: 0 });
  const before = g.run.score;
  Object.assign(g.world.hero, { x: g.world.pig.x - 150, facing: 1, hot: false });
  g.world.pig.state = "recover";
  g.world.pig.timer = 9;
  const evs = [];
  for (let i = 0; i < Math.round(1 / STEP) && !of(evs, "pigDown").length; i++) {
    g.step(input(i === 0 ? { hammer: true } : {}, i === 0 ? { hammer: true } : {}));
    evs.push(...g.events);
  }
  assert.equal(of(evs, "pigDown").length, 1);
  assert.ok(g.run.score - before >= PIG.points, `scored ${g.run.score - before}`);
});

test("a scripted player beats the pig with three lives intact and clocks out", () => {
  const g = shop(11);
  play(g);
  const evs = [];
  let t = 0;
  while (g.mode === "play" && t < 240) {
    g.step(drive(g.level, g.world.hero, "floor", g.world));
    evs.push(...g.events);
    t += STEP;
  }
  const hits = of(evs, "pigHit");
  assert.equal(of(evs, "pigDown").length, 1, `the pig went down (${g.world.pig.hp} HP left, ${t.toFixed(0)} s)`);
  assert.ok(hits.filter((e) => e.by === "bonk").length >= 3 && hits.filter((e) => e.by === "snot").length >= 3, "by the rule");
  assert.equal(g.run.lives, 3, "no life lost");
  assert.ok(["walkoff", "tally", "clear"].includes(g.mode), `clocked out (${g.mode} at ${g.world.hero.x})`);
});
```

And in `scripts/venues.check.mjs`, import `GIFTSHOP` and replace the test "the shift runs lobby, restaurant, campus, then it is over" with:

```js
test("the shift runs lobby, restaurant, campus, the gift shop, then it is over", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH, venues: [RESTAURANT, CAMPUS, GIFTSHOP] }, 7);
  const seen = [g.level.id];
  for (let i = 0; i < 4; i++) {
    while (g.mode === "card") g.step(input());
    // The gift shop's door opens once the pig is down.
    if (g.world.pig) g.world.pig.state = "defeated";
    const exit = g.level.doors.find((d) => d.kind === "exit");
    Object.assign(g.world.hero, { x: exit.x - 120, y: exit.y, vx: 0, vy: 0 });
    for (let k = 0; k < Math.round(20 / STEP) && g.mode !== "card" && g.mode !== "clear"; k++) g.step(input({ right: true }));
    seen.push(g.mode === "clear" ? "clear" : g.level.id);
  }
  assert.deepEqual(seen, ["lobby", "restaurant", "campus", "arena", "clear"]);
});
```

- [ ] **Step 2: Run them to watch them fail**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/pig.check.mjs scripts/venues.check.mjs`
Expected: FAIL on the missing `../src/sim/levels/giftshop.ts`.

- [ ] **Step 3: The level format** (in `src/sim/level.ts`)

Add `| "plush" | "till"` to `PlatformKind`, `| "carpet"` to `FloorKind`, `| "spotlight"` to `FurnitureKind`, `"arena"` to `LevelId`, and to `DoorSpec`:

```ts
/** `closed` doors say what opens them; `x` is the door's middle, `y` the floor in front of it; a `locked` exit is chained until the pig is down. */
export type DoorSpec = { id: string; kind: DoorKind; x: number; y: number; label: string; opens?: string; locked?: boolean };
```

- [ ] **Step 4: The gift shop** (create `src/sim/levels/giftshop.ts`)

```ts
import type { Level } from "../level";

/**
 * 1-4, the gift shop (R3 §5.1): the hotel's gift shop at night on grey carpet, the pig's arena. Spawn at 300 and the ! crate
 * at 500; the arena from 600 to 3900, its punch clock at the way in; two plush shelves (180 and 360 high) and the cash
 * counter (180) to get above the pig; a spotlight pooled in the middle; CLOCK OUT at 4100, chained until the pig is down.
 * The rewards are the shipped boss level's: eight, two of them nuts, one Buc-ee's.
 */
export const GIFTSHOP: Level = {
  id: "arena",
  name: "The Pink Menace",
  world: "1-4",
  length: 4400,
  spawn: { x: 300, y: 0 },
  time: 300,
  floor: [{ x0: -400, x1: 4800, y0: 0, y1: 0, kind: "carpet" }],
  platforms: [
    { x0: 1100, x1: 1500, y: -180, kind: "plush" },
    { x0: 1800, x1: 2200, y: -360, kind: "plush" },
    { x0: 2900, x1: 3500, y: -180, kind: "till" },
  ],
  solids: [],
  passes: [],
  bounds: { x: -400, y: -1600, w: 5200, h: 2200 },
  crates: [{ id: "pepper-door", kind: "pepper", x: 500, y: -435 }],
  doors: [{ id: "out", kind: "exit", x: 4100, y: 0, label: "CLOCK OUT", locked: true }],
  checkpoints: [{ id: "arena", x: 600, y: 0 }],
  signs: [{ x: 200, y: -700, label: "THE PINK MENACE", note: "3 bonks + 3 snots minimum" }],
  furniture: [{ kind: "spotlight", x: 1350, y: 0, w: 1800, h: 900 }],
  carts: [],
  lights: [
    { x: 300, y: -700, radius: 800, intensity: 0.45 },
    { x: 2250, y: -900, radius: 1300, intensity: 0.6 },
    { x: 4000, y: -700, radius: 800, intensity: 0.45 },
  ],
  camera: { zones: [{ x0: 600, x1: 3900, zoom: 0.92 }] },
  rewards: { count: 8, bucees: 1, nuts: 2 },
  routes: [],
  music: "day",
  hints: { early: 560 },
  boss: { x: 2600, arena: [600, 3900] },
};
```

The `backdrop` (its walls and pieces) is Task 4's.

- [ ] **Step 5: The Game** (in `src/sim/game.ts`: `import { PIG, createPig } from "./pig";`, add `PICKUP_SIZE` to the import from `./level`)

In `begin`, after `world.swingDoors = …`:

```ts
    // The gift shop's pig sleeps at its spot, fresh, each time the venue is laid out.
    world.pig = level.boss ? createPig(level.boss, floorAt(world.stage, level.boss.x) ?? 0) : null;
```

In `tryDoors`, the exit only when it is open:

```ts
    // A locked exit is chained until the pig is down.
    const open = (d: DoorSpec) => !d.locked || !world.pig || world.pig.state === "defeated";
    const exit = standing
      ? game.level.doors.find((d) => d.kind === "exit" && open(d) && Math.abs(h.x - d.x) <= EXIT_REACH && Math.abs(h.y - d.y) < 60 && h.onGround)
      : undefined;
```

A new function beside `take`:

```ts
  /** The shipped pepper refill: while he is not hot and none is out, one 150 px inside the arena's left edge every 3 s. */
  function refill(ev: GameEvent[]) {
    const p = world.pig;
    if (!p || p.state === "asleep" || p.state === "defeated" || p.refill > 0 || world.hero.hot) return;
    if (game.pickups.some((k) => k.kind === "pepper" && !k.taken)) return;
    const x = p.arena[0] + PIG.refillAt;
    const y = (floorAt(world.stage, x) ?? 0) - PICKUP_SIZE;
    game.pickups.push({ id: ++nextPickup, kind: "pepper", x, y, taken: false });
    p.refill = PIG.refill;
    ev.push({ type: "pigRefill", x, y });
  }
```

In `playStep`, after `score(world.events);`:

```ts
    // Waking the pig hands him the pepper and a moment's grace (its punch clock stands at the way in).
    if (world.events.some((e) => e.type === "pigWake")) {
      h.hot = true;
      h.patience = PATIENCE_MAX;
      h.invuln = Math.max(h.invuln, PIG.grace);
    }
    refill(ev);
```

`pigDown` carries `points`, so the existing `score()` adds the 3000.

- [ ] **Step 6: The HUD and the hints** (in `src/render/hud.ts`: `import { PIG } from "../sim/pig";`)

Add to `HudPayload`:

```ts
  /** The pig's bar (R3 §5.2) while the fight is on: its HP and the bonks and snots it still needs. */
  boss: { hp: number; max: number; bonks: number; snots: number; need: number } | null;
```

In `hintOf`, after the crouch line:

```ts
  const pig = game.world.pig;
  if (pig?.state === "defeated") return "The chain is off · walk into CLOCK OUT";
  if (pig && pig.state !== "asleep") return "Pig fight · 3 bonks + 3 snots minimum · pepper refills on the left";
```

In `hudOf`:

```ts
  const pig = game.world.pig;
  …
    boss: pig && pig.state !== "asleep" && pig.state !== "defeated" ? { hp: pig.hp, max: pig.max, bonks: pig.bonks, snots: pig.snots, need: PIG.need } : null,
```

And `hudKey` adds `p.boss ? [p.boss.hp, p.boss.bonks, p.boss.snots].join(",") : ""`.

- [ ] **Step 7: The scripted fight** (in `src/sim/drive.ts`: `import { PIG } from "./pig";`)

```ts
/** How far left of the pig's nearest reach he waits (his right edge just clear of it), and the reach of his swing and his snot. */
const PIG_FIGHT = { wait: 110, bonk: 200, snot: 900 } as const;

/**
 * The pig, as the shipped boss check fought it: wait in the corner its charges cannot reach, snot it from there, and
 * bonk it when it stops beside him. True while the fight is on (it steers him; nothing else does).
 */
function fightPig(w: World, h: HeroState, i: Input): boolean {
  const p = w.pig;
  if (!p || p.state === "asleep" || p.state === "defeated") return false;
  i.held.right = i.held.run = false;
  const spot = p.arena[0] + PIG.keepLeft - PIG_FIGHT.wait;
  if (h.x < spot - 20) i.held.right = true;
  else if (h.x > spot + 20) i.held.left = true;
  else if (h.facing < 0) i.held.right = true;
  if (h.move || !h.onGround || h.facing < 0) return true;
  const gap = p.x - p.w / 2 - h.x;
  if (gap < PIG_FIGHT.bonk) i.held.hammer = i.pressed.hammer = true;
  else if (h.sinus >= 1 && gap < PIG_FIGHT.snot) i.held.fire = i.pressed.fire = true;
  return true;
}
```

In `drive`, right after `i.held.right = i.held.run = true;`:

```ts
  if (world && fightPig(world, h, i)) return i;
```

- [ ] **Step 8: Run the tests to watch them pass**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/pig.check.mjs scripts/venues.check.mjs`
Expected: PASS. If the scripted fight stalls (it waits where the pig's charges stop short of him and bonks it when it parks there; its snot reaches about 950 px from his nose), tune `PIG_FIGHT`, never the pig's rules, and ledger it; a life lost there means the spot is inside a charge's reach: widen `wait`.

- [ ] **Step 9: The whole suite, the types and the lint**

Run: `npm run test:next`, `npm run test:game`, `npx tsc --noEmit`, `npx eslint src/sim src/render scripts/pig.check.mjs scripts/venues.check.mjs`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/sim/levels/giftshop.ts src/sim/level.ts src/sim/game.ts src/sim/drive.ts src/render/hud.ts scripts/pig.check.mjs scripts/venues.check.mjs
```

Message: "The gift shop (1-4) and the pig fight in the shift: the wake's pepper, the refill, the chained exit, the bar, and a scripted win". Push.

---

### Task 3: The pig's painting cut

**Files:**
- Create: `art/cuts/pig.json`
- Modify: `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `scripts/art-grid.mjs`, `src/art/registry.ts`
- Test: `scripts/art.check.mjs`
- Commit with: `art/incoming/pig/pig-body.png`, `pig-squint.png`, `pig-charge.png`, `pig-hurt.png`, `pig-defeated.png`, `pig-stuffing.png` and their `.prompt.txt` files, and their `art/manifest.json` entries.

**Interfaces:**
- Consumes: `castRig`, `separateLayers`, `sheetPieces`, `keyOut`, `tolerant` (all in `scripts/art-cut.mjs`).
- Produces: `layerOrder(cuts)` / `layerZ(cuts)` honoring a cut's own `order` / `z`; `bodyLayers(cuts): string[]` (the `z` list without the head); `castRig(person, keyed, cuts, { silly?, faces?: Record<string, Keyed>, strict? })` writing `rig.z` when the cut names one and `rig.head.faces: Record<string, string>` (`cast/<person>-head-<face>.png`); the sync's `public/art/cast/pig-rig.json`, `cast/pig-*.png` (then WebP) and `cast/pig-stuffing-<n>.png` stored at half size; `Registry.pig?: { rig: string; span: number; stuffing: Piece[] }`; `node scripts/art-grid.mjs pig`.

- [ ] **Step 1: Write the failing tests** (in `scripts/art.check.mjs`: add `bodyLayers`, `layerOrder` and `sheetPieces` to the import from `./art-cut.mjs` if not there)

```js
const PIG_IN = "art/incoming/pig";
const PIG_FACES = ["squint", "charge", "hurt", "defeated"];
let pigCache = null;
/** The pig keyed and cut, with its painting's pixels. */
const pigOf = async () => {
  if (!pigCache) {
    const keyed = await keyOut(readFileSync(`${PIG_IN}/pig-body.png`));
    const cuts = JSON.parse(readFileSync("art/cuts/pig.json", "utf8"));
    const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    pigCache = { keyed, cuts, data, ...(await separateLayers(keyed, cuts)) };
  }
  return pigCache;
};

test("a cut may name its own layers: the cast's keep the old lists, the pig's are its own", () => {
  assert.deepEqual(layerZ({ layers: { head: {} } }), ["armFar", "legFar", "legNear", "head", "torso", "armNear"]);
  assert.deepEqual(bodyLayers({ layers: { head: {} } }), ["armFar", "legFar", "legNear", "torso", "armNear"]);
  assert.deepEqual(layerZ({ layers: {}, z: ["a", "head", "b"] }), ["a", "head", "b"]);
  assert.deepEqual(bodyLayers({ layers: {}, z: ["a", "head", "b"] }), ["a", "b"]);
  assert.deepEqual(layerOrder({ layers: {}, order: ["b", "head", "a"] }), ["b", "head", "a"]);
});

test("the pig is cut into seven layers, its head in front of its body, that put its painting back together at rest", async () => {
  const { W, H, layers, owner, data, cuts } = await pigOf();
  const z = layerZ(cuts);
  assert.deepEqual(z, ["armFar", "legFar", "tail", "torso", "legNear", "head", "armNear"]);
  let wrong = 0,
    extra = 0,
    lost = 0;
  for (let i = 0; i < W * H; i++) {
    let top = null;
    for (const name of z) if (layers[name].rgba[i * 4 + 3] > 0) top = name;
    if (owner[i] < 0) {
      if (top) extra++;
      if (data[i * 4 + 3] >= 128) lost++;
      continue;
    }
    const px = layers[top].rgba.subarray(i * 4, i * 4 + 4);
    if (px[0] !== data[i * 4] || px[1] !== data[i * 4 + 1] || px[2] !== data[i * 4 + 2] || px[3] !== data[i * 4 + 3]) wrong++;
  }
  assert.equal(wrong, 0, "the frontmost layer shows the painted pixel");
  assert.equal(extra, 0, "nothing is drawn where the painting is empty");
  assert.ok(lost < 40, `${lost} painted pixels belong to no layer`);
  for (const name of z) assert.ok(layers[name].rgba.some((v, i) => i % 4 === 3 && v > 0), `${name} has paint`);
});

test("the pig's layers are meshed and skinned: every painted pixel in a cell, weights summing to one", async () => {
  const { W, H, layers, cuts } = await pigOf();
  for (const name of bodyLayers(cuts)) {
    const alpha = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = layers[name].rgba[i * 4 + 3] > 0 ? 1 : 0;
    const mesh = buildMesh(alpha, W, H, 14);
    const { weights } = skinWeights(mesh.positions, cuts.rig, name);
    for (let v = 0; v < mesh.positions.length / 2; v++) {
      const sum = weights[v * 4] + weights[v * 4 + 1] + weights[v * 4 + 2] + weights[v * 4 + 3];
      assert.ok(Math.abs(sum - 1) < 1e-6, `pig ${name} vertex ${v} weights sum to ${sum}`);
    }
  }
});

test("the pig's joints lie on its painting, its sole is its near foot's lowest row, and it keeps its own arms", async () => {
  const { W, H, data, cuts } = await pigOf();
  const painted = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] >= 128;
  for (const [name, [x, y]] of Object.entries(cuts.rig.joints)) {
    let on = false;
    for (let dy = -14; dy <= 14 && !on; dy++) for (let dx = -14; dx <= 14 && !on; dx++) on = painted(Math.round(x) + dx, Math.round(y) + dy);
    assert.ok(on, `${name} at ${x},${y} is off the painting`);
  }
  const [tx] = cuts.rig.joints.toeNear,
    [hx] = cuts.rig.joints.heelNear;
  let lowest = -1;
  for (let y = H - 1; y >= 0 && lowest < 0; y--) for (let x = Math.min(tx, hx); x <= Math.max(tx, hx); x++) if (painted(x, y)) lowest = y;
  assert.ok(Math.abs(cuts.rig.sole - lowest) <= 3, `sole ${cuts.rig.sole}, near foot's lowest row ${lowest}`);
  assert.deepEqual(cuts.rig.match, [], "its stubby arms are never turned to Hammer's stance");
});

test("the pig's rig: six skinned layers in its own order, the head plate, four faces framed exactly like it, and three tufts", async () => {
  const { keyed, cuts } = await pigOf();
  const faces = {};
  for (const name of PIG_FACES) faces[name] = await keyOut(readFileSync(`${PIG_IN}/pig-${name}.png`));
  const { rig, images } = await castRig("pig", keyed, cuts, { faces, strict: true });
  assert.deepEqual(rig.z, cuts.z);
  assert.deepEqual(Object.keys(rig.layers), bodyLayers(cuts));
  assert.deepEqual(rig.match, []);
  assert.deepEqual(Object.keys(rig.head.faces).sort(), [...PIG_FACES].sort());
  const plain = await sharp(images.get(rig.head.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [name, file] of Object.entries(rig.head.faces)) {
    const face = await sharp(images.get(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([face.info.width, face.info.height], [plain.info.width, plain.info.height], `${name}: framed like the head`);
    let changed = 0;
    for (let i = 0; i < face.data.length; i += 4) if (Math.abs(face.data[i] - plain.data[i]) + Math.abs(face.data[i + 1] - plain.data[i + 1]) > 60) changed++;
    assert.ok(changed > 50, `${name}: the face is changed (${changed} px)`);
  }
  assert.ok(rig.head.share > 0.28 && rig.head.share < 0.36, `the head ${rig.head.share} of the pig`);
  const tufts = await sheetPieces(await keyOut(readFileSync(`${PIG_IN}/pig-stuffing.png`)));
  assert.equal(tufts.length, 3, "three tufts");
});

test("a pig face from another painting is refused when strict and skipped otherwise", async () => {
  const { keyed, cuts } = await pigOf();
  const other = await keyOut(readFileSync("art/incoming/hammer/body-affliction.png"));
  await assert.rejects(castRig("pig", keyed, cuts, { faces: { hurt: other }, strict: true }), /overlap/);
  const loose = await castRig("pig", keyed, cuts, { faces: { hurt: other }, strict: false });
  assert.equal(loose.rig.head.faces?.hurt, undefined);
});
```

Also in the existing test "every cast painting in art/incoming/cast has its cut", add after it:

```js
test("the pig's painting has its cut", () => {
  assert.ok(!existsSync(`${PIG_IN}/pig-body.png`) || existsSync("art/cuts/pig.json"));
});
```

- [ ] **Step 2: Run them to watch them fail**

Run: `node --loader ./scripts/game-test-loader.mjs --test --test-name-pattern "pig|own layers" scripts/art.check.mjs`
Expected: FAIL: `bodyLayers` is not exported, and `art/cuts/pig.json` is missing.

- [ ] **Step 3: A cut's own layer lists** (in `scripts/art-cut.mjs`, replacing `layerOrder` and `layerZ`)

```js
/**
 * A cast body's cut adds its head: claimed after the torso, so the collar stays with the jacket, and drawn behind it,
 * so the neck runs on down under the collar however the head turns. A cut may name its own lists instead (the pig's):
 * `order` front to back for claiming the painted pixels, `z` back to front for drawing, the head among them.
 */
export const layerOrder = (cuts) => cuts.order ?? (cuts.layers.head ? ["armNear", "torso", "head", "legNear", "legFar", "armFar"] : LAYER_ORDER);
export const layerZ = (cuts) => cuts.z ?? (cuts.layers.head ? ["armFar", "legFar", "legNear", "head", "torso", "armNear"] : LAYER_Z);
/** The skinned layers, back to front: all but the head. */
export const bodyLayers = (cuts) => layerZ(cuts).filter((n) => n !== "head");
```

- [ ] **Step 4: `castRig` takes its layers from the cut, and its face edits by name** (in `scripts/art-cut.mjs`)

Change the signature and both `for (const name of LAYER_Z)` loops in `castRig` (meshing, and the recolors) to `for (const name of bodyLayers(cuts))`; after `layers: {},` in `out`, add `...(cuts.z ? { z: cuts.z } : {}),`. Replace the `if (silly) { … }` block with:

```js
  // The face edits, each aligned back onto the painting, cut the same way and framed exactly like the plain head:
  // the cast's knocked-silly face, and the pig's four. One that does not fit is skipped, or refused when strict.
  const edits = { ...(silly ? { silly } : {}), ...faces };
  for (const [name, edit] of Object.entries(edits)) {
    const a = await alignTo(keyed.png, edit.png);
    const verdict = gateExpression(a.overlap, { strict });
    const why = `${person}-${name}.png: outline overlap ${a.overlap.toFixed(2)}, expected at least ${ALIGN_MIN}; make it again as an edit of ${person}.png`;
    if (verdict === "refuse") throw new Error(why);
    if (verdict === "skip") {
      console.warn(`${why} (skipped; the plain face stands in)`);
      continue;
    }
    const { layers: edited } = await separateLayers(await alignOnto(keyed, edit, a), cuts);
    const plate = await castHeadPlate(edited.head.rgba, W, H, rig.joints.neck, TEXTURE_SCALE, head.box);
    const file = `cast/${person}-head-${name}.png`;
    images.set(file, plate.png);
    if (name === "silly") out.head.silly = file;
    else (out.head.faces ??= {})[name] = file;
  }
```

with the signature `export async function castRig(person, keyed, cuts, { silly = null, faces = {}, strict = false } = {})` and its doc comment naming the faces. The cast's silly file keeps its name (`cast/<person>-head-silly.png`).

- [ ] **Step 5: The pig's cut** (create `art/cuts/pig.json`; coordinates are the keyed crop's, 927 by 1292 at offset 72, 145, measured on `node artifacts/pig-grid.mjs` grids; the near leg is the right-hand one, its cuff over the belly)

```json
{
  "note": "Coordinates are pixels of the keyed crop of art/incoming/pig/pig-body.png (927x1292). Seven layers. The head with both ears is in front of the body (its chin line runs from the mouth to the notch at the back of the neck); the near arm (the lower one) is in front of everything; the near leg (the right-hand one) wears its cuff over the belly; the far arm and the far leg come out from behind the body's outline, and the tail sits behind its right edge. The tail rides the body's bone. Each part hidden behind another is painted in from its own visible fabric so a turn never opens a hole. Check with: node scripts/art-grid.mjs pig.",
  "space": "crop",
  "order": ["armNear", "head", "legNear", "torso", "tail", "legFar", "armFar"],
  "z": ["armFar", "legFar", "tail", "torso", "legNear", "head", "armNear"],
  "rig": {
    "sole": 1283,
    "rootX": 520,
    "match": [],
    "joints": {
      "pelvis": [520, 980],
      "chest": [500, 700],
      "neck": [470, 415],
      "shoulderNear": [395, 528],
      "elbowNear": [290, 640],
      "wristNear": [180, 728],
      "shoulderFar": [300, 520],
      "elbowFar": [170, 568],
      "wristFar": [55, 600],
      "hipNear": [570, 1010],
      "kneeNear": [570, 1120],
      "ankleNear": [565, 1205],
      "toeNear": [425, 1265],
      "heelNear": [668, 1270],
      "hipFar": [365, 1010],
      "kneeFar": [362, 1110],
      "ankleFar": [350, 1190],
      "toeFar": [188, 1245],
      "heelFar": [418, 1245]
    },
    "bones": [["pelvis", "hipNear"], ["pelvis", "chest"], ["chest", "neck"], ["shoulderNear", "elbowNear"], ["elbowNear", "wristNear"], ["shoulderFar", "elbowFar"], ["elbowFar", "wristFar"], ["hipNear", "kneeNear"], ["kneeNear", "ankleNear"], ["ankleNear", "toeNear"], ["hipFar", "kneeFar"], ["kneeFar", "ankleFar"], ["ankleFar", "toeFar"]],
    "skin": {
      "torso": { "chain": ["pelvis", "chest", "neck"], "parent": ["pelvis", "hipNear"], "start": [-30, 30], "blend": [80] },
      "tail": { "chain": ["pelvis", "chest"], "blend": [] },
      "armNear": { "chain": ["shoulderNear", "elbowNear", "wristNear"], "parent": ["chest", "neck"], "start": [0, 50], "blend": [50] },
      "armFar": { "chain": ["shoulderFar", "elbowFar", "wristFar"], "parent": ["chest", "neck"], "start": [0, 50], "blend": [50] },
      "legNear": { "chain": ["hipNear", "kneeNear", "ankleNear", "toeNear"], "parent": ["pelvis", "hipNear"], "start": [0, 60], "blend": [30, 16] },
      "legFar": { "chain": ["hipFar", "kneeFar", "ankleFar", "toeFar"], "parent": ["pelvis", "hipNear"], "start": [0, 60], "blend": [30, 16] }
    }
  },
  "layers": {
    "armNear": { "polygon": [[226, 598], [288, 546], [336, 500], [360, 484], [386, 477], [418, 483], [442, 502], [452, 534], [450, 568], [434, 596], [404, 644], [368, 694], [322, 734], [272, 772], [236, 786], [188, 794], [146, 782], [119, 752], [116, 708], [136, 680], [172, 664], [206, 636]] },
    "head": { "polygon": [[0, 0], [700, 0], [700, 372], [632, 383], [560, 398], [470, 416], [380, 430], [315, 446], [270, 446], [232, 437], [196, 412], [178, 382], [160, 360], [0, 360]] },
    "legNear": { "polygon": [[476, 1078], [498, 1060], [540, 1055], [592, 1055], [640, 1066], [662, 1086], [660, 1150], [674, 1190], [688, 1240], [686, 1292], [398, 1292], [402, 1228], [438, 1178], [488, 1150], [482, 1110]] },
    "torso": {
      "polygon": [[150, 300], [700, 300], [870, 600], [860, 820], [840, 830], [836, 950], [780, 1012], [700, 1072], [650, 1100], [560, 1098], [484, 1108], [436, 1114], [370, 1103], [303, 1080], [248, 1050], [150, 990], [150, 700], [160, 690], [200, 640], [229, 598], [274, 440], [150, 440]],
      "fill": [
        { "polygon": [[240, 330], [640, 330], [640, 420], [560, 420], [470, 436], [380, 450], [300, 462], [240, 452]], "from": [[300, 455], [620, 420], [640, 520], [300, 520]] },
        { "polygon": [[270, 470], [450, 470], [455, 600], [400, 700], [300, 760], [240, 760], [240, 600]], "from": [[460, 470], [640, 470], [645, 600], [590, 700], [490, 760], [430, 760], [430, 600]] },
        { "polygon": [[480, 1060], [670, 1060], [670, 1100], [480, 1100]], "from": [[480, 1000], [670, 1000], [670, 1040], [480, 1040]] }
      ]
    },
    "tail": { "polygon": [[836, 810], [927, 810], [927, 970], [836, 970]] },
    "legFar": {
      "polygon": [[170, 1140], [290, 1040], [450, 1040], [450, 1150], [440, 1200], [440, 1275], [170, 1275]],
      "fill": [{ "polygon": [[300, 990], [425, 990], [425, 1080], [300, 1080]], "from": [[300, 1110], [425, 1110], [425, 1170], [300, 1170]] }]
    },
    "armFar": {
      "polygon": [[0, 540], [40, 532], [120, 498], [200, 462], [250, 440], [290, 434], [290, 610], [232, 604], [200, 616], [150, 634], [100, 656], [60, 656], [0, 640]],
      "fill": [{ "polygon": [[262, 440], [340, 440], [340, 600], [232, 600]], "from": [[150, 470], [228, 470], [228, 600], [150, 610]] }]
    }
  }
}
```

A fill paints a layer only where a layer drawn in front of it covers it, from that layer's own visible paint inside `from` (read `separateLayers`): so the body is painted in under the head, the near arm and the near leg's cuff, and the far arm and far leg at their roots behind the body; the head, the near limbs and the tail need none (nothing is in front of them, or the tail never moves off the body). The near arm may also take `"ink": { "over": ["torso", "armFar"], "px": 6 }` if its outline stays behind on the body when it turns. The polygons are a first cut from the grid: run the sync with `--overlay` (Step 8) and read `artifacts/body-layers-pig.png` at full size; move any edge that takes a neighbor's paint (a part must come away whole, its own outline with it, the body's outline staying with the body) until the rest test passes and every part reads whole. Each moved edge is a ledgered ruling. Read `skinWeights` in `scripts/art-cut.mjs` before changing a `skin` entry: a chain of two joints needs `"blend": []`, and every pair it names must be in `bones`.

- [ ] **Step 6: The pig's sync** (in `scripts/art-sync.mjs`: add `bodyLayers` and `scaled` to the import from `./art-cut.mjs` if missing; call `await pig(registry);` after `await cast(registry);` in the main sequence)

```js
const PIG_IN = "art/incoming/pig";
const PIG_FACES = ["squint", "charge", "hurt", "defeated"];
/** The tufts are painted about 350 px across and drawn under 100: stored at half size. */
const TUFT_SCALE = 0.5;

/** The pig (R3 §6.3): its body cut like a cast painting on its own cut, its four face edits on the head, and its stuffing tufts. */
async function pig(registry) {
  const file = join(PIG_IN, "pig-body.png");
  if (!existsSync(file)) return;
  const cutsFile = "art/cuts/pig.json";
  if (!existsSync(cutsFile)) {
    console.warn(`pig: painted but not cut yet (no ${cutsFile}); the drawn pig stands in`);
    return;
  }
  // A bad cut or face leaves the drawn pig (or its plain face) standing in and the rest of the art going.
  await tolerant("pig", strict, async () => {
    const cuts = JSON.parse(readFileSync(cutsFile, "utf8"));
    const faces = {};
    for (const name of PIG_FACES) {
      const f = join(PIG_IN, `pig-${name}.png`);
      if (existsSync(f)) faces[name] = await keyOut(readFileSync(f));
    }
    const { rig, images, layers, W, H } = await castRig("pig", await keyOut(readFileSync(file)), cuts, { faces, strict });
    for (const [name, png] of images) writeFileSync(join(OUT, name), png);
    const rigFile = "cast/pig-rig.json";
    writeFileSync(join(OUT, rigFile), JSON.stringify(rig));
    const stuffing = [];
    const tufts = join(PIG_IN, "pig-stuffing.png");
    if (existsSync(tufts))
      for (const [i, p] of (await sheetPieces(await keyOut(readFileSync(tufts)))).entries()) {
        const name = `cast/pig-stuffing-${i + 1}.png`;
        writeFileSync(join(OUT, name), await scaled(p.png, p.width, TUFT_SCALE));
        stuffing.push({ file: name, width: Math.round(p.width * TUFT_SCALE), height: Math.round(p.height * TUFT_SCALE), base: { x: Math.round(p.base.x * TUFT_SCALE), y: Math.round(p.base.y * TUFT_SCALE) } });
      }
    registry.pig = { rig: rigFile, span: rig.span, stuffing };
    console.log(`pig: ${bodyLayers(cuts).length} layers and the head, ${Object.keys(rig.head.faces ?? {}).length} faces, ${stuffing.length} tufts`);
    if (overlay) {
      const sheet = await Promise.all(layerZ(cuts).map((name) => sharp(layers[name].rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()));
      await drawLayers("pig", sheet);
    }
  });
}
```

Check `scaled`'s signature in `scripts/art-cut.mjs` before using it (it is `scaled(png, width, scale)` today; it returns a PNG buffer).

- [ ] **Step 7: The registry and the grid** (in `src/art/registry.ts`, add to `Registry`)

```ts
  /** The pig (R3 §6.3): its rig, cut like a cast body's, and its stuffing tufts. */
  pig?: { rig: string; span: number; stuffing: Piece[] };
```

In `scripts/art-grid.mjs`: `const pig = target === "pig";`; the keyed line reads `art/incoming/pig/pig-body.png` when `pig`; `const cutsFile = pig ? "art/cuts/pig.json" : person ? … : …;` and the overrides line spreads `(person || pig ? {} : …)`. Its output is `artifacts/grid-pig.png`. Add `pig` to its usage line.

- [ ] **Step 8: Sync and read the cut by eye**

Run: `npm run art:sync -- --overlay`
Expected: a line `pig: 6 layers and the head, 4 faces, 3 tufts`, no warnings for the pig. Read `artifacts/body-layers-pig.png` and `node scripts/art-grid.mjs pig` at full size: each part whole, its outline with it.

- [ ] **Step 9: Run the tests to watch them pass**

Run: `npm run test:next`
Expected: PASS, the new pig tests included; the cast's tests unchanged (their cuts name no lists, so their order is the old one), and the WebP test finds the pig's rig and tufts through the registry.

- [ ] **Step 10: Types, lint, commit**

Run: `npx tsc --noEmit`, `npx eslint scripts src/art`
Expected: clean.

```bash
git add art/cuts/pig.json scripts/art-cut.mjs scripts/art-sync.mjs scripts/art-grid.mjs src/art/registry.ts scripts/art.check.mjs art/incoming/pig/pig-{body,squint,charge,hurt,defeated,stuffing}.{png,prompt.txt}
node artifacts/stage-manifest.mjs art/incoming/pig/pig-{body,squint,charge,hurt,defeated,stuffing}.{png,prompt.txt}
```

Check `git diff --cached art/manifest.json` adds only those six paintings and their prompts. Message: "Cut the pig's painting: seven layers on its own skeleton, its four faces and its stuffing, with the cut naming its own layers". Push.

### Task 4: The gift shop drawn, and the fight in the browser

**Files:**
- Create: `src/sim/rig/pig.ts`, `src/render/frame.ts`, `src/render/pig.ts`, `src/render/venue-giftshop.ts`, `art/cuts/wall-arena-far-1.json`, `art/cuts/wall-arena-far-2.json`, `scripts/pig-browser.check.mjs`
- Modify: `src/sim/levels/giftshop.ts` (its `backdrop`), `src/render/venue.ts`, `src/render/look.ts`, `src/render/sound.ts`, `src/render/particles.ts`, `src/render/app.ts` (the probe's type), `src/render/boards.ts`, `scripts/look-boards.mjs`, `src/components/next-hud.tsx`, `src/components/next-game.tsx`, `src/routes/index.tsx`, `src/styles.css`
- Test: `scripts/render.check.mjs`, `scripts/pig-browser.check.mjs`
- Commit with: `art/incoming/backdrops/arena-far-1.png`, `arena-far-2.png`, `arena-mid.png`, `arena-fore.png`, their `.prompt.txt` files and their manifest entries.

**Interfaces:**
- Consumes: Tasks 1 and 2 (`Pig`, `PIG`, `PIG_ID`, the events, `GIFTSHOP`, `HudPayload.boss`).
- Produces: `PIG_FEEL`; `type PigClipCtx = { state: PigState; t: number; clock: number; hurtT: number; onGround: boolean; landT: number | null }`; `type PigFace = "squint" | "charge" | "hurt" | "defeated"`; `pigPose(c: PigClipCtx): Pose`; `pigFace(c: Pick<PigClipCtx, "state" | "hurtT" | "onGround">): PigFace | null`; `fightFrame(heroX: number, pigX: number, reach: number): number`; `PIG_HEIGHT = 420`; `class PigView { container; kind: "drawn" | "painted"; sort(z: number): void; sync(prev: Pig | null, cur: Pig | null, alpha: number, dt: number): void; hit(x: number, y: number): void; down(): void; crown(): { x: number; y: number; facing: 1 | -1 } | null; clear(): void; destroy(): void }`; `VenueView.setChained(on: boolean)`; the `venue` link and `NextGame`'s `start` take `"arena"`; `window.__next.pig` and `window.__next.dev.pig(o)`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/render.check.mjs`)

```js
import { PIG_FEEL, pigFace, pigPose } from "../src/sim/rig/pig.ts";
import { fightFrame } from "../src/render/frame.ts";
import { PIG } from "../src/sim/pig.ts";

const pigCtx = (o = {}) => ({ state: "recover", t: 0, clock: 0, hurtT: 0, onGround: true, landT: null, ...o });

test("the pig leans back 12 degrees in its wind-up and forward 18 in its charge, the whole of it about its middle", () => {
  const lean = (p) => {
    const s = solve(p, 1, 0.26);
    return s.joints.neck.x - s.joints.pelvis.x;
  };
  const rest = lean(pigPose(pigCtx()));
  assert.ok(lean(pigPose(pigCtx({ state: "windup", t: 1 }))) < rest - 20, "back, away from the way it faces");
  assert.ok(lean(pigPose(pigCtx({ state: "charge", t: 0.3 }))) > rest + 30, "forward, into the charge");
  assert.equal(pigPose(pigCtx({ state: "windup", t: 1 })).spin, PIG_FEEL.windupLean);
  assert.equal(pigPose(pigCtx({ state: "charge", t: 0.5 })).spin, -PIG_FEEL.chargeLean);
});

test("it breathes at 0.5 Hz, stretches 0.9 by 1.15 in a hop's air, squashes 1.2 by 0.8 as it lands, and deflates to 0.85 over 1.2 s", () => {
  const breath = pigPose(pigCtx({ state: "asleep", clock: 0.5 })).squash.y;
  assert.ok(Math.abs(breath - (1 + PIG_FEEL.breath)) < 1e-6, `a breath's top a quarter of 2 s in: ${breath}`);
  const squash = (o, x, y) => {
    const s = pigPose(pigCtx(o)).squash;
    assert.ok(Math.abs(s.x - x) < 1e-9 && Math.abs(s.y - y) < 1e-9, `${JSON.stringify(o)}: ${s.x} by ${s.y}`);
  };
  squash({ state: "hop", t: 0.3, onGround: false }, 0.9, 1.15);
  squash({ state: "hop", t: 0.7, landT: 0 }, 1.2, 0.8);
  squash({ state: "hop", t: 1, landT: PIG_FEEL.landT }, 1, 1);
  assert.ok(Math.abs(pigPose(pigCtx({ state: "defeated", t: 1.2 })).squash.y - 0.85) < 1e-9);
  assert.ok(pigPose(pigCtx({ state: "defeated", t: 0.6 })).squash.y > 0.85, "still going down halfway");
});

test("a hit wobbles it while the gap runs, and it stills when the gap is over", () => {
  const spins = [];
  for (let k = 1; k <= 40; k++) spins.push(pigPose(pigCtx({ hurtT: PIG.gap - k * (PIG.gap / 40) })).spin);
  assert.ok(Math.max(...spins.map(Math.abs)) > 2, "it wobbles");
  assert.equal(pigPose(pigCtx({ hurtT: 0 })).spin, 0);
});

test("the pig's faces: it squints asleep and winding up, bares its teeth charging and in a hop's air, winces hurt, and wears its X when down", () => {
  const f = (o) => pigFace({ state: "recover", hurtT: 0, onGround: true, ...o });
  assert.deepEqual(
    [f({ state: "asleep" }), f({ state: "windup" }), f({ state: "charge" }), f({ state: "hop", onGround: false }), f({ state: "hop" }), f({}), f({ hurtT: 0.2 }), f({ state: "defeated", hurtT: 0.2 })],
    ["squint", "squint", "charge", "charge", null, null, "hurt", "defeated"],
  );
});

test("inside each state the pig never jumps: no joint, lean or tilt turns more than 9 degrees in a step", () => {
  const step = 1 / 120;
  for (const [state, seconds, extra] of [["asleep", 4], ["windup", 1.1], ["charge", 0.85], ["hop", 0.6, { onGround: false }], ["recover", 1.35], ["defeated", 2]]) {
    let last = null;
    for (let t = 0; t <= seconds; t += step) {
      const p = pigPose(pigCtx({ state, t, clock: t, ...extra }));
      if (last) {
        for (const [j, v] of Object.entries(p.rot)) assert.ok(Math.abs(v - last.rot[j]) <= 9, `${state} t=${t.toFixed(3)}: ${j} jumps`);
        assert.ok(Math.abs(p.spin - last.spin) <= 9 && Math.abs(p.headTilt - last.headTilt) <= 9, `${state} t=${t.toFixed(3)}: the body jumps`);
      }
      last = p;
    }
  }
});

test("the camera frames both fighters: between them while they are close, never letting him leave the middle of the view", () => {
  assert.equal(fightFrame(1000, 1600, 600), 1300);
  assert.equal(fightFrame(1000, 3600, 600), 1600, "the pig far right: he stays 600 px from the middle");
  assert.equal(fightFrame(3000, 800, 600), 2400, "and far left");
});
```

- [ ] **Step 2: Run them to watch them fail**

Run: `node --loader ./scripts/game-test-loader.mjs --test --test-name-pattern "pig|fighters" scripts/render.check.mjs`
Expected: FAIL on the missing `../src/sim/rig/pig.ts`.

- [ ] **Step 3: The pig's clips** (create `src/sim/rig/pig.ts`)

```ts
import { PIG, type PigState } from "../pig";
import { pose, smooth, type Pose } from "./pose";

/** The pig's state, how long it has been in it, the time for breathing, the hit's gap left, and since a hop landed. */
export type PigClipCtx = { state: PigState; t: number; clock: number; hurtT: number; onGround: boolean; landT: number | null };
export type PigFace = "squint" | "charge" | "hurt" | "defeated";

/** Its feel (R3 §5.2, main spec §7.2): degrees, hertz, seconds and squash factors. */
export const PIG_FEEL = {
  breathHz: 0.5,
  breath: 0.02,
  pantHz: 1.6,
  pant: 0.03,
  windupLean: 12,
  chargeLean: 18,
  leanIn: 0.25,
  legHz: 6,
  legSwing: 26,
  hopAir: { x: 0.9, y: 1.15 },
  hopLand: { x: 1.2, y: 0.8 },
  landT: 0.25,
  deflate: 0.85,
  deflateT: 1.2,
  wobble: 5,
  wobbleHz: 9,
} as const;

const wave = (t: number, hz: number) => Math.sin(t * 2 * Math.PI * hz);
const ease = (t: number, over: number) => smooth(Math.min(1, Math.max(0, t / over)));

/**
 * The pig's pose in its state. A lean is a spin of the whole stuffed body about its middle (positive leans back, as the
 * solve turns it), so its head goes with it; its arms and legs move under it. A hit wobbles it while the gap runs.
 */
export function pigPose(c: PigClipCtx): Pose {
  const F = PIG_FEEL;
  const wobble = c.hurtT > 0 ? wave(PIG.gap - c.hurtT, F.wobbleHz) * F.wobble * (c.hurtT / PIG.gap) : 0;
  const breathe = (hz: number, amp: number) => {
    const b = wave(c.clock, hz) * amp;
    return { x: 1 - b / 2, y: 1 + b };
  };
  switch (c.state) {
    case "asleep":
      return pose({ squash: breathe(F.breathHz, F.breath), headTilt: -4, rot: { shoulderNear: -12, shoulderFar: -12 } });
    case "windup": {
      const a = ease(c.t, F.leanIn);
      return pose({ spin: F.windupLean * a + wobble, squash: breathe(F.breathHz, F.breath), rot: { shoulderNear: 30 * a, shoulderFar: 30 * a, hipNear: -8 * a, hipFar: 8 * a } });
    }
    case "charge": {
      const a = ease(c.t, 0.12);
      const s = wave(c.t, F.legHz) * F.legSwing * a;
      return pose({
        spin: -F.chargeLean * a + wobble,
        rot: { hipNear: s, hipFar: -s, kneeNear: -Math.max(0, s) * 0.6, kneeFar: -Math.max(0, -s) * 0.6, shoulderNear: -35 * a, shoulderFar: -35 * a },
      });
    }
    case "hop": {
      if (!c.onGround) {
        const a = ease(c.t, 0.1);
        const tuck = { shoulderNear: 40 * a, shoulderFar: 40 * a, hipNear: 20 * a, hipFar: -12 * a, kneeNear: -25 * a, kneeFar: -25 * a };
        return pose({ spin: -6 * a + wobble, squash: { x: 1 + (F.hopAir.x - 1) * a, y: 1 + (F.hopAir.y - 1) * a }, rot: tuck });
      }
      // Landing: squashed at once, then back over a quarter second.
      const l = ease(c.landT ?? F.landT, F.landT);
      const k = 1 - l;
      return pose({
        spin: -6 * k + wobble,
        squash: { x: F.hopLand.x + (1 - F.hopLand.x) * l, y: F.hopLand.y + (1 - F.hopLand.y) * l },
        rot: { shoulderNear: 40 * k, shoulderFar: 40 * k, hipNear: 20 * k, hipFar: -12 * k, kneeNear: -25 * k, kneeFar: -25 * k },
      });
    }
    case "recover":
      return pose({ spin: wobble, squash: breathe(F.pantHz, F.pant), headTilt: 5, rot: { shoulderNear: -18, shoulderFar: -18 } });
    case "defeated": {
      const a = ease(c.t, F.deflateT);
      return pose({ spin: 6 * a, squash: { x: 1 + 0.08 * a, y: 1 - (1 - F.deflate) * a }, headTilt: 8 * a, rot: { shoulderNear: -30 * a, shoulderFar: -30 * a } });
    }
  }
}

/** The face edit its state wears, or null for the painted one. */
export function pigFace(c: Pick<PigClipCtx, "state" | "hurtT" | "onGround">): PigFace | null {
  if (c.state === "defeated") return "defeated";
  if (c.hurtT > 0) return "hurt";
  if (c.state === "windup" || c.state === "asleep") return "squint";
  if (c.state === "charge" || (c.state === "hop" && !c.onGround)) return "charge";
  return null;
}
```

Read `pose()` in `src/sim/rig/pose.ts` first: it must take `spin`, `squash`, `headTilt` and `rot` as given and fill the rest (it does for the cast's acts). The "deflates to 0.85" test asserts on the `defeated` state at `t = deflateT`; `ease` is 1 there.

- [ ] **Step 4: The camera's framing** (create `src/render/frame.ts`)

```ts
/**
 * Where the camera looks in the pig fight (main spec §5.4, the shipped boss camera): halfway between him and the pig,
 * but never so far from him that he leaves the middle `reach` of the view on either side.
 */
export function fightFrame(heroX: number, pigX: number, reach: number): number {
  const mid = (heroX + pigX) / 2;
  return Math.min(heroX + reach, Math.max(heroX - reach, mid));
}
```

- [ ] **Step 5: Run the tests to watch them pass**

Run: `node --loader ./scripts/game-test-loader.mjs --test --test-name-pattern "pig|fighters" scripts/render.check.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 6: The drawn pig and its view** (create `src/render/pig.ts`; the painting comes in Task 5)

```ts
import { ColorMatrixFilter, Container, Graphics } from "pixi.js";
import type { Pig } from "../sim/pig";
import { pigFace, pigPose, type PigClipCtx, type PigFace } from "../sim/rig/pig";
import { blend, type Pose } from "../sim/rig/pose";
import { PALETTE } from "./palette";
import type { Particles } from "./particles";

/** It stands 420 px tall (R3 §5.2). */
export const PIG_HEIGHT = 420;
/** A change of state blends over this long, so nothing jumps between its clips. */
const BLEND_T = 0.12;
/** The hit's white flash (R3 §5.2). */
const FLASH_T = 0.08;
const DUST_EVERY = 0.06;
const DEG = Math.PI / 180;

/** Every drawn pixel white, its alpha kept: the hit flash. */
function whiteFlash(): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  f.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  return f;
}

/**
 * The code-drawn pig (main spec §7.2), standing in while its painting is missing: a pink pear with its head, snout, ears
 * and button eyes, stubby arms and legs and a curl of tail, drawn facing left as the painting is. A placeholder.
 */
export function drawPigStandIn(g: Graphics, face: PigFace | null): void {
  const H = PIG_HEIGHT;
  const pink = "#f3a6bd";
  const pad = "#e45a8a";
  const line = { width: 6, color: PALETTE.outline };
  g.clear();
  g.ellipse(0.16 * H, -0.12 * H, 0.06 * H, 0.12 * H).fill(pink).stroke(line);
  g.ellipse(-0.02 * H, -0.06 * H, 0.08 * H, 0.06 * H).fill(pink).stroke(line);
  g.circle(0.36 * H, -0.42 * H, 0.04 * H).fill(pink).stroke(line);
  g.ellipse(0.08 * H, -0.36 * H, 0.27 * H, 0.3 * H).fill(pink).stroke(line);
  g.roundRect(-0.28 * H, -0.5 * H, 0.26 * H, 0.08 * H, 0.04 * H).fill(pink).stroke(line);
  g.circle(-0.26 * H, -0.46 * H, 0.04 * H).fill(pad);
  g.circle(-0.02 * H, -0.76 * H, 0.21 * H).fill(pink).stroke(line);
  g.ellipse(0.12 * H, -0.93 * H, 0.06 * H, 0.05 * H).fill(pink).stroke(line);
  g.roundRect(-0.33 * H, -0.8 * H, 0.14 * H, 0.12 * H, 0.04 * H).fill(pink).stroke(line);
  g.ellipse(-0.33 * H, -0.74 * H, 0.025 * H, 0.055 * H).fill(pad).stroke(line);
  const eye = { x: -0.12 * H, y: -0.84 * H };
  if (face === "defeated") g.moveTo(eye.x - 9, eye.y - 9).lineTo(eye.x + 9, eye.y + 9).moveTo(eye.x + 9, eye.y - 9).lineTo(eye.x - 9, eye.y + 9).stroke(line);
  else if (face === "squint" || face === "hurt") g.moveTo(eye.x - 10, eye.y).lineTo(eye.x + 10, eye.y).stroke(line);
  else g.circle(eye.x, eye.y, face === "charge" ? 9 : 6).fill(PALETTE.outline);
}

/**
 * The gift shop's pig as the sim has it: its clips blended across a change of state, its flash, its dust on a charge and
 * its stuffing on a hit. Drawn behind Hammer (the caller sorts it), so nothing of it is ever over his face.
 */
export class PigView {
  readonly container = new Container({ label: "pig" });
  /** The drawn pig until the painting is in (Task 5), and for good if it never is. */
  kind: "drawn" | "painted" = "drawn";
  private readonly body = new Container({ label: "pig-body" });
  private readonly standIn = new Graphics();
  private readonly flash = whiteFlash();
  /** The tufts fly beside it and sort with it (Task 5 throws them). */
  protected readonly tuftLayer = new Container({ label: "pig-tufts" });
  private state: Pig["state"] | null = null;
  private stateT = 0;
  private landT: number | null = null;
  private clock = 0;
  private flashT = 0;
  private dustT = 0;
  private from: Pose | null = null;
  private last: Pose | null = null;
  private blendT = BLEND_T;
  private crownAt: { x: number; y: number; facing: 1 | -1 } | null = null;
  private here: { x: number; y: number; facing: 1 | -1 } = { x: 0, y: 0, facing: -1 };

  constructor(
    parent: Container,
    private readonly particles: Particles,
  ) {
    this.body.addChild(this.standIn);
    this.container.addChild(this.body);
    this.container.visible = false;
    parent.addChild(this.container, this.tuftLayer);
  }

  /** Sorts it and its tufts among the play layer's children: the caller puts them behind him. */
  sort(z: number): void {
    this.container.zIndex = this.tuftLayer.zIndex = z;
  }

  sync(prev: Pig | null, cur: Pig | null, alpha: number, dt: number): void {
    this.container.visible = !!cur;
    if (!cur) {
      this.crownAt = null;
      return;
    }
    this.clock += dt;
    if (cur.state !== this.state) {
      this.from = this.last;
      this.blendT = 0;
      this.state = cur.state;
      this.stateT = 0;
      this.landT = null;
    } else this.stateT += dt;
    this.blendT += dt;
    if (cur.state === "hop" && cur.onGround) this.landT = this.landT === null ? 0 : this.landT + dt;
    const ctx: PigClipCtx = { state: cur.state, t: this.stateT, clock: this.clock, hurtT: cur.hurtT, onGround: cur.onGround, landT: this.landT };
    let pose = pigPose(ctx);
    if (this.from && this.blendT < BLEND_T) pose = blend(this.from, pose, this.blendT / BLEND_T);
    this.last = pose;
    const x = prev ? prev.x + (cur.x - prev.x) * alpha : cur.x;
    const y = prev ? prev.y + (cur.y - prev.y) * alpha : cur.y;
    this.here = { x, y, facing: cur.facing };
    this.container.position.set(x, y);
    this.flashT = Math.max(0, this.flashT - dt);
    this.container.filters = this.flashT > 0 ? [this.flash] : null;
    if (cur.state === "charge") {
      this.dustT += dt;
      if (this.dustT >= DUST_EVERY) {
        this.dustT = 0;
        this.particles.emit("dust", x - cur.facing * 100, y, 2);
      }
    } else this.dustT = 0;
    this.draw(pose, pigFace(ctx), cur.facing);
  }

  /** The drawn pig: turned about its middle, squashed from its feet, mirrored to face right. */
  protected draw(pose: Pose, face: PigFace | null, facing: 1 | -1): void {
    const mid = -PIG_HEIGHT * 0.4;
    drawPigStandIn(this.standIn, face);
    this.body.pivot.set(0, mid);
    this.body.position.set(0, mid * pose.squash.y);
    this.body.rotation = -pose.spin * DEG * facing;
    this.body.scale.set((facing === -1 ? 1 : -1) * pose.squash.x, pose.squash.y);
    this.crownAt = { x: this.here.x, y: this.here.y - PIG_HEIGHT * pose.squash.y, facing };
  }

  /** A hit: the white flash and a puff of stuffing where it landed. */
  hit(x: number, y: number): void {
    this.flashT = FLASH_T;
    this.particles.emit("stuffing", x, y, 10);
  }

  /** Beaten: stuffing out at two seams. */
  down(): void {
    const { x, y } = this.here;
    this.particles.emit("stuffing", x - 70, y - PIG_HEIGHT * 0.55, 16);
    this.particles.emit("stuffing", x + 90, y - PIG_HEIGHT * 0.35, 16);
  }

  /** Where a bubble over it hangs from. */
  crown(): { x: number; y: number; facing: 1 | -1 } | null {
    return this.container.visible ? this.crownAt : null;
  }

  /** A new venue or run: nothing carries over. */
  clear(): void {
    this.state = null;
    this.from = this.last = null;
    this.flashT = 0;
    this.container.filters = null;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

Add the `stuffing` recipe to `RECIPES` in `src/render/particles.ts`:

```ts
  // The pig's white fluff out of a seam (spec §5.6).
  stuffing: { speed: [160, 420], angle: [200, 340], gravity: 1100, drag: 1.4, life: [0.5, 0.9], size: [12, 6], colors: ["#fff7f2", "#f7d4de"], additive: false },
```

- [ ] **Step 7: The gift shop drawn** (create `src/render/venue-giftshop.ts`, in the inked style of `venue-restaurant.ts`: read it and `ink.ts` first and use the same `FLOOR`, `INK` and `THIN` constants and helpers)

```ts
import { Graphics } from "pixi.js";
import type { Furniture, LevelFloor, LevelPlatform } from "../sim/level";
import { FLOOR, INK, THIN } from "./ink";
import { shadowOf, tones } from "./palette";

const CARPET = tones("#5d6470");
const SHELF = tones("#7a5236");
const GLASS = "#a9c7d6";
const PLUSH = ["#d9a066", "#f2f0ea", "#f3a6bd", "#f2d36b", "#a9a9b3"];

/** The grey carpet, with its front edge and a faint weave; false for any other floor. */
export function giftshopFloor(g: Graphics, f: LevelFloor): boolean {
  if (f.kind !== "carpet") return false;
  const w = f.x1 - f.x0;
  g.rect(f.x0, f.y0, w, FLOOR.depth).fill(CARPET.base);
  for (let x = f.x0; x < f.x1; x += 48) g.rect(x, f.y0 + 6, 2, FLOOR.depth - 12).fill({ color: CARPET.shadow, alpha: 0.35 });
  g.rect(f.x0, f.y0, w, 8).fill(CARPET.highlight);
  g.moveTo(f.x0, f.y0).lineTo(f.x1, f.y0).stroke(INK);
  return true;
}

/** A plush shelf (its top a platform, a row of plush on each board) or the till (glass-fronted, the register at one end). */
export function giftshopPlatform(g: Graphics, p: LevelPlatform): boolean {
  const w = p.x1 - p.x0;
  const h = -p.y;
  if (p.kind === "plush") {
    g.rect(p.x0, p.y, w, h).fill(SHELF.shadow).stroke(INK);
    g.rect(p.x0 - 10, p.y - 14, w + 20, 18).fill(SHELF.highlight).stroke(INK);
    for (let board = p.y + h / 2; board < 0; board += h / 2) g.rect(p.x0, board, w, 12).fill(SHELF.base).stroke(THIN);
    // The plush sits on the boards below the top: what stands on the top is him.
    for (let row = 1; row <= 2; row++)
      for (let x = p.x0 + 40, i = 0; x < p.x1 - 30; x += 70, i++) {
        const y = p.y + (h / 2) * row - 4;
        if (y > -20) continue;
        const c = PLUSH[(i + row) % PLUSH.length];
        g.circle(x, y - 26, 24).fill(c).stroke(THIN);
        g.circle(x - 15, y - 48, 9).fill(c).stroke(THIN);
        g.circle(x + 15, y - 48, 9).fill(c).stroke(THIN);
      }
    return true;
  }
  if (p.kind === "till") {
    g.rect(p.x0, p.y, w, h).fill(SHELF.base).stroke(INK);
    g.rect(p.x0 + 20, p.y + 26, w - 40, h - 56).fill({ color: GLASS, alpha: 0.55 }).stroke(THIN);
    g.rect(p.x0 - 12, p.y - 12, w + 24, 16).fill(SHELF.highlight).stroke(INK);
    const rx = p.x1 - 140;
    g.roundRect(rx, p.y - 92, 110, 80, 10).fill("#2b2f36").stroke(INK);
    g.rect(rx + 14, p.y - 82, 82, 26).fill("#7fd1a8").stroke(THIN);
    return true;
  }
  return false;
}

/** The spotlight pooled on the carpet in the middle of the arena; false for any other furniture. */
export function giftshopFurniture(g: Graphics, f: Furniture): boolean {
  if (f.kind !== "spotlight") return false;
  const cx = f.x + f.w / 2;
  for (let i = 0; i < 6; i++) g.ellipse(cx, f.y + 10, (f.w / 2) * (1 - i * 0.14), 70 * (1 - i * 0.12)).fill({ color: "#ffe7f0", alpha: 0.05 });
  g.poly([cx - 160, f.y - f.h, cx + 160, f.y - f.h, cx + f.w / 2, f.y, cx - f.w / 2, f.y]).fill({ color: shadowOf("#ffe7f0"), alpha: 0.04 });
  return true;
}
```

The names `INK` and `THIN` must be the stroke styles `ink.ts` exports; if it names them otherwise, use its names (ledger nothing: it is reading the code). In `src/render/venue.ts`, import the three and extend the three dispatch lines:

```ts
  for (const f of level.furniture) if (!restaurantFurniture(back, f) && !campusFurniture(back, f) && !giftshopFurniture(back, f)) drawFurniture(back, f);
  for (const p of level.platforms) if (!restaurantPlatform(mid, p) && !campusPlatform(mid, p) && !giftshopPlatform(mid, p)) drawPlatform(mid, p);
  for (const f of level.floor) if (!restaurantFloor(front, f) && !campusFloor(front, f, level.floor) && !giftshopFloor(front, f)) drawFloor(front, f, level);
```

- [ ] **Step 8: The chained exit** (in `src/render/venue.ts`: add to `VenueView`, and build it in `drawVenue` for each `locked` door)

```ts
  /** A locked exit's chain: on while the pig fights; switched off, it falls off the door and is gone. */
  setChained(on: boolean): void;
```

```ts
  // A locked exit wears its chain (R3 §5.2) until the pig is down; then it drops off the door and is gone.
  const CHAIN_FALL = 0.6;
  const chains = level.doors
    .filter((d) => d.locked)
    .map((d) => {
      const g = new Graphics();
      for (const a of [-90, 90]) g.moveTo(d.x + a, -380).lineTo(d.x - a, -120).stroke({ width: 14, color: "#8d939c" }).stroke({ width: 4, color: PALETTE.outline, alpha: 0.6 });
      g.roundRect(d.x - 34, -280, 68, 60, 8).fill("#c9a24a").stroke(INK);
      // Turned about the padlock as it falls.
      g.pivot.set(d.x, -250);
      g.position.set(d.x, -250);
      root.addChild(g);
      return { g, home: { x: d.x, y: -250 }, falling: -1 };
    });
  let chained = true;
```

and in the returned view:

```ts
    setChained(on) {
      if (on === chained) return;
      chained = on;
      for (const c of chains) {
        c.falling = on ? -1 : 0;
        c.g.position.set(c.home.x, c.home.y);
        c.g.rotation = 0;
        c.g.alpha = 1;
        c.g.visible = true;
      }
    },
```

with, in its `update(dt)`:

```ts
      for (const c of chains) {
        if (c.falling < 0 || !c.g.visible) continue;
        c.falling += dt;
        c.g.y = c.home.y + 900 * c.falling * c.falling;
        c.g.rotation = 0.8 * c.falling;
        c.g.alpha = Math.max(0, 1 - c.falling / CHAIN_FALL);
        if (c.falling >= CHAIN_FALL) c.g.visible = false;
      }
```

`INK` is `ink.ts`'s stroke style for outlines; use its name if it differs.

- [ ] **Step 9: The gift shop's walls and pieces**

Measure each wall: `node scripts/art-grid.mjs wall/arena-far-1` and `wall/arena-far-2`, then create:

`art/cuts/wall-arena-far-1.json`:

```json
{
  "note": "Coordinates are pixels of art/incoming/backdrops/arena-far-1.png (the plush wall under the neon halo). Each edge holds a whole wooden pilaster, outlined on both sides, so the seams are their middles. floor is the row where the skirting meets the carpet. Check with: node scripts/art-grid.mjs wall/arena-far-1.",
  "floor": 764,
  "seams": [35, 1500]
}
```

`art/cuts/wall-arena-far-2.json` the same for the shirts-and-caps wall (`floor` 764, `seams` [35, 1500] as measured at plan time). Correct either number to what the grid shows (the floor line level across, the seams on the pilasters' middles) and say so in the note. Then add to `GIFTSHOP`:

```ts
  // The plush wall and the shirt wall; at the mid plane the plush shelf, the postcard spinner, the gift boxes, the gumball
  // machine and the crate of plush; in front, the big teddy by the way in and the red-draped table past the exit.
  backdrop: {
    walls: ["arena-far-1", "arena-far-2"],
    mid: [
      { name: "arena-mid-1", x: 350 },
      { name: "arena-mid-2", x: 1000 },
      { name: "arena-mid-3", x: 2450 },
      { name: "arena-mid-4", x: 3250 },
      { name: "arena-mid-5", x: 3800 },
    ],
    fore: [
      { name: "arena-fore-1", x: 150 },
      { name: "arena-fore-2", x: 4300 },
    ],
  },
```

Run `npm run art:sync` and read its log: two walls, `pieces arena-mid: 5`, `pieces arena-fore: 2`. A different count means the sheet's shapes joined or split: read `artifacts/` with the pieces before changing anything, and ledger the ruling.

- [ ] **Step 10: The fight in the look** (in `src/render/look.ts`)

- Import `GIFTSHOP`, `PIG_ID`, `PigView`, `fightFrame`, and `type TauntTarget` from `../game/taunts`; `const SHIFT: Level[] = [LOBBY, RESTAURANT, CAMPUS, GIFTSHOP];`; `opts.start` takes the arena (`LevelId` already does); a constant `const FRAME_REACH = 0.3;` (the share of the view's width he may stand from its middle in the fight).
- Build `const pigView = new PigView(scene.layers.play, particles);` beside the cast; `clearActors()` calls `pigView.clear()`; `stop()` calls `pigView.destroy()`.
- In `tick`, after the cast's sync: `pigView.sort(y - 0.7); pigView.sync(prev.pig, cur.pig, alpha, simDt);`.
- The camera, replacing `cam.target = { x, y };` and `cam.moving = …`:

```ts
    // In the fight the camera holds both fighters (the shipped boss camera); no look-ahead pulls it off them.
    const pig = cur.pig;
    const fighting = !!pig && pig.state !== "asleep" && pig.state !== "defeated";
    cam.target = { x: fighting ? fightFrame(x, pig.x, scene.view().w * FRAME_REACH) : x, y };
    cam.facing = h.facing;
    cam.moving = !fighting && Math.abs(h.vx) > 40;
```

- The chain: `views.get(game.level.id)?.venue.setChained(game.level.doors.some((d) => d.locked) && cur.pig?.state !== "defeated");` each tick.
- `taunt(target: TauntTarget)`.
- The speech bubbles hang from the pig too: `speech.update(simDt, (id) => (id === PIG_ID ? pigView.crown() : cast.crownOf(id)), face, scene.view());`.
- In `show`:

```ts
      case "pigWake":
        words.say("PIG FIGHT", at.crown.x, at.crown.y - 120, true, face, view);
        break;
      case "pigWindup":
        if (e.hop) speech.say(PIG_ID, "BOING!", 0.8);
        break;
      case "pigLand":
        particles.emit("dust", e.x, e.y, 14);
        break;
      case "pigHit":
        words.say(e.by === "bonk" ? "BONK!" : "SNOT!", e.x, e.y - 40, false, face, view);
        pigView.hit(e.x, e.y);
        speech.say(PIG_ID, "SQUEEEE!", 0.6);
        // The sound bus rolls the shipped 45 percent for the pig (TAUNT_CHANCE) and keeps its gap between recordings.
        taunt("pig");
        break;
      case "pigHold":
        words.say(e.word, e.x, e.y - 60, true, face, view);
        break;
      case "pigDown":
        words.say("STUFFING SETTLED", e.x, e.y - PIG_HEIGHT - 60, true, face, view);
        pigView.down();
        flyers.papers(e.x, e.y - 220, 1);
        break;
      case "pigShrug":
        bubbles.say("It's a stuffed animal.", 1.6);
        break;
      case "pigRefill":
        particles.emit("glint", e.x, e.y, 6);
        break;
```

- The probe and the dev hook:

```ts
      window.__next.pig = cur.pig && { state: cur.pig.state, x: cur.pig.x, hp: cur.pig.hp, bonks: cur.pig.bonks, snots: cur.pig.snots, drawn: pigView.kind };
```

```ts
      /** Sets the pig's HP, counts or state, for the checks. */
      pig(o: { hp?: number; bonks?: number; snots?: number; state?: "recover" | "defeated" }) {
        if (world.pig) Object.assign(world.pig, o, o.state === "recover" ? { timer: 30, vx: 0 } : {});
      },
```

  and their types on `NextProbe` in `src/render/app.ts`.

- [ ] **Step 11: The sounds** (in `src/render/sound.ts`'s `CUES`)

```ts
  pigWake: ["power"],
  pigCharge: ["bump"],
  pigHop: ["bump"],
  pigLand: ["thud"],
  pigHit: ["thud"],
  pigBounce: ["bump"],
  pigDown: ["clear"],
```

- [ ] **Step 12: The bar** (in `src/components/next-hud.tsx`, after the top bar's section)

```tsx
      {hud.boss && (
        <section className="next-hud__boss" aria-label="The Pink Menace">
          <span className="next-hud__boss-name">The Pink Menace</span>
          <span className="next-hud__boss-bar" role="meter" aria-label="Its stuffing" aria-valuemin={0} aria-valuemax={hud.boss.max} aria-valuenow={hud.boss.hp}>
            {Array.from({ length: hud.boss.max }, (_, i) => (
              <i key={i} data-on={i < hud.boss!.hp} />
            ))}
          </span>
          <span className="next-hud__boss-count" data-done={hud.boss.bonks >= hud.boss.need}>
            Bonks {Math.min(hud.boss.bonks, hud.boss.need)}/{hud.boss.need}
          </span>
          <span className="next-hud__boss-count" data-done={hud.boss.snots >= hud.boss.need}>
            Snots {Math.min(hud.boss.snots, hud.boss.need)}/{hud.boss.need}
          </span>
        </section>
      )}
```

In `src/styles.css`, after the HUD's top bar rules:

```css
/* The pig's bar (R3 §5.2): twelve gold segments on slate under the top bar, with the bonks and snots it still needs. */
.next-hud__boss {
  position: absolute;
  top: 68px;
  left: 50%;
  transform: translateX(-50%);
  width: min(520px, calc(100% - 32px));
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-template-areas: "name bonks snots" "bar bar bar";
  gap: 6px 12px;
  padding: 8px 12px 10px;
  background: var(--hud-slate);
  border: 1px solid var(--hud-edge);
  border-radius: 10px;
}
.next-hud__boss-name {
  grid-area: name;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--hud-gold);
}
.next-hud__boss-bar {
  grid-area: bar;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
}
.next-hud__boss-bar i {
  height: 10px;
  border-radius: 2px;
  background: var(--hud-well);
}
.next-hud__boss-bar i[data-on="true"] {
  background: var(--hud-gold);
}
.next-hud__boss-count {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hud-dim);
  font-variant-numeric: tabular-nums;
}
.next-hud__boss-count[data-done="true"] {
  color: var(--hud-text);
}
.next-hud--touch .next-hud__boss {
  top: 58px;
}
```

Read the top bar's own rules first and set `top` so the bar sits under it with a gap at 1280 by 800, 390 by 844 and 844 by 390 (the browser check below measures it).

- [ ] **Step 13: The arena from the address** (in `src/routes/index.tsx`, `const VENUES = ["restaurant", "campus", "arena"] as const;`; in `src/components/next-game.tsx`, `start?: "restaurant" | "campus" | "arena"`). Then `git hash-object src/routeTree.gen.ts`.
Expected: `dceedffdc12c32138e81bb63787cac7ae5d97fcd`.

- [ ] **Step 14: The arena's boards** (in `src/render/boards.ts`, add to `VENUE_FRAMES`)

```ts
  arena: [
    { x: 400, y: 0, cx: 800 },
    { x: 1300, y: -180, cx: 2100, cy: -380, zoom: 0.92 },
    { x: 3200, y: -180, cx: 3700, cy: -380, zoom: 0.92 },
  ],
```

and in `scripts/look-boards.mjs` loop over `["restaurant", "campus", "arena"]`. Render: `node scripts/look-boards.mjs http://127.0.0.1:8090/ arena` and read `artifacts/arena-look-1.png` to `-3.png` at full size: the carpet under the walls' painted floor, the shelves and the till inked like the restaurant's, the spotlight a soft pool, the pig asleep at 2600 (drawn), the punch clock at 600, the chain on CLOCK OUT, each mid piece standing on the floor line and each fore piece clear of the fight.

- [ ] **Step 15: The browser check** (create `scripts/pig-browser.check.mjs`)

```js
// The pig fight in the browser: it wakes as he crosses into the arena, the bar and the hint show (and fit a phone), a lost
// life brings back a fresh pig, its defeat drops the chain and lets him clock out.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/pig-browser.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}?next=1&dev=1&venue=arena`);
  await page.waitForFunction(() => window.__next?.run?.mode === "play" && window.__next.run.level === "arena");
  assert.equal(await page.evaluate(() => window.__next.pig.state), "asleep");
  await page.evaluate(() => window.__next.dev.teleport(700, 0));
  await page.waitForFunction(() => window.__next.pig.state !== "asleep");
  await page.waitForSelector(".next-hud__boss");
  assert.equal(await page.locator(".next-hud__boss-bar i").count(), 12);
  assert.match(await page.locator(".next-hud__hint").innerText(), /Pig fight/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(out, "pig-fight.png") });
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    const box = await page.locator(".next-hud__boss").boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= w && box.y + box.height <= h, `the bar fits ${w}x${h}: ${JSON.stringify(box)}`);
    await page.screenshot({ path: resolve(out, `pig-fight-${w}x${h}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  // A life lost mid-fight: a fresh pig, woken again at the arena's clock.
  await page.evaluate(() => window.__next.dev.pig({ hp: 4, bonks: 3, snots: 3 }));
  await page.evaluate(() => { window.__next.dev.hit(); });
  await page.waitForTimeout(1600);
  await page.evaluate(() => { window.__next.dev.hit(); });
  await page.waitForFunction(() => window.__next.run.mode === "card");
  await page.waitForFunction(() => window.__next.run.mode === "play" && window.__next.pig.state !== "asleep");
  assert.equal(await page.evaluate(() => window.__next.pig.hp), 12);
  // The last hit: a snot at it from the corner, with it held still and short of nothing.
  await page.evaluate(() => window.__next.dev.pig({ hp: 1, bonks: 3, snots: 3, state: "recover" }));
  await page.evaluate(() => {
    const p = window.__next.pig;
    window.__next.dev.teleport(p.x - 500, 0);
  });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__next.pig.state === "defeated", null, { timeout: 5000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(out, "pig-down.png") });
  assert.equal(await page.locator(".next-hud__boss").count(), 0, "the bar is gone");
  await page.evaluate(() => window.__next.dev.teleport(3950, 0));
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => ["walkoff", "tally", "clear"].includes(window.__next.run.mode));
  await page.keyboard.up("ArrowRight");
  await page.waitForFunction(() => window.__next.run.mode === "clear", null, { timeout: 20000 });
  await page.screenshot({ path: resolve(out, "pig-clear.png") });
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: the pig fight wakes, fits a phone, comes back fresh after a lost life, and ends with the chain off and the shift over.");
} finally {
  await browser.close();
}
```

`dev.hit()` lands only outside grace: the 1.6 s wait lets the respawn's or the wake's grace run out; if the first hit lands in grace, wait for `window.__next.run.patience` to drop between the two. Run it against the dev server; read every screenshot at full size (the bar under the top bar and clear of his face, the pig behind him, "BONK!" and "STUFFING SETTLED" where the face-safe layout puts them).

- [ ] **Step 16: Everything**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim scripts`, and with `BROWSER_SMOKE_CHANNEL=chrome`: `node scripts/pig-browser.check.mjs http://127.0.0.1:8090/`, `node scripts/shift-browser.check.mjs http://127.0.0.1:8090/`, `node scripts/next-browser.check.mjs http://127.0.0.1:8090/`, `node scripts/run-browser.check.mjs http://127.0.0.1:8090/`
Expected: all pass. The campus's "Shift over" assertion in `shift-browser` now meets the gift shop's card: that check's last step is Task 8's; if it fails here on that step alone, ledger it and go on.

- [ ] **Step 17: Commit**

```bash
git add src/sim/rig/pig.ts src/render/frame.ts src/render/pig.ts src/render/venue-giftshop.ts src/render/venue.ts src/render/look.ts src/render/sound.ts src/render/particles.ts src/render/app.ts src/render/boards.ts scripts/look-boards.mjs src/components/next-hud.tsx src/components/next-game.tsx src/routes/index.tsx src/styles.css src/sim/levels/giftshop.ts art/cuts/wall-arena-far-1.json art/cuts/wall-arena-far-2.json scripts/render.check.mjs scripts/pig-browser.check.mjs art/incoming/backdrops/arena-{far-1,far-2,mid,fore}.{png,prompt.txt}
node artifacts/stage-manifest.mjs art/incoming/backdrops/arena-{far-1,far-2,mid,fore}.{png,prompt.txt}
git hash-object src/routeTree.gen.ts
```

Message: "The gift shop drawn and in the shift, the pig fight in the browser: its walls and pieces, the camera on both fighters, the bar, the chain, the drawn pig". Push.

---

### Task 5: The pig painted

**Files:**
- Modify: `src/render/skin.ts`, `src/render/cast-body.ts`, `src/render/pig.ts`, `src/render/look.ts`, `src/render/boards.ts`, `scripts/look-boards.mjs`
- Test: `scripts/render.check.mjs`

**Interfaces:**
- Consumes: Task 3's `rig.z`, `rig.head.faces`, `Registry.pig`; Task 4's `PigView`, `pigPose`, `pigFace`, `PIG_HEIGHT`.
- Produces: `CAST_Z`, `drawOrder(rig): readonly string[]`, `bodyLayersOf(rig): string[]` (in `skin.ts`); `RigFile.z?: string[]`; `CastHead.faces?: Record<string, string>`; `PaintOpts.face?: string | null`; `loadRigArt(registry, body, person)`; `loadPigArt(registry)`; `CastArt.person: CastPerson | "pig"`; `PigView.load(registry): Promise<void>`; the board kind `"pig"`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/render.check.mjs`; import `drawOrder` and `bodyLayersOf` from `../src/render/skin.ts`, and `PIG_FEEL` is already imported)

```js
test("a rig draws in its cut's order with its head among its layers; the cast's rigs draw as before", () => {
  assert.deepEqual([...drawOrder({})], ["armFar", "legFar", "legNear", "head", "torso", "armNear"]);
  assert.deepEqual(bodyLayersOf({}), ["armFar", "legFar", "legNear", "torso", "armNear"]);
  const z = ["armFar", "legFar", "tail", "torso", "legNear", "head", "armNear"];
  assert.deepEqual([...drawOrder({ z })], z);
  assert.deepEqual(bodyLayersOf({ z }), ["armFar", "legFar", "tail", "torso", "legNear", "armNear"]);
});

const pigRig = async () => {
  if (!rigs.has("pig")) rigs.set("pig", await castRig("pig", await keyOut(readFileSync("art/incoming/pig/pig-body.png")), JSON.parse(readFileSync("art/cuts/pig.json", "utf8"))));
  return rigs.get("pig").rig;
};
const PIG_STATES = [["asleep", true], ["windup", true], ["charge", true], ["hop", false], ["hop", true], ["recover", true], ["defeated", true]];

test("the pig's painting carries every bone's end onto its solved joint in every state, facing either way", async () => {
  const rig = await pigRig();
  const skel = castSkeleton(rig);
  const ends = { positions: rig.bones.flatMap(([, c]) => rig.joints[c]), bones: rig.bones.flatMap((_, b) => [b, 0, 0, 0]), weights: rig.bones.flatMap(() => [1, 0, 0, 0]) };
  const out = new Float32Array(ends.positions.length);
  for (const [state, onGround] of PIG_STATES)
    for (const t of [0.05, 0.3, 0.9])
      for (const facing of [-1, 1]) {
        const solved = solve(pigPose({ state, t, clock: t, hurtT: 0, onGround, landT: onGround && state === "hop" ? 0.1 : null }), facing, castHeadScale(rig.head.share, rig.head), rig.head, skel);
        skinLayer(out, ends, rig, solved);
        rig.bones.forEach(([, c], b) => {
          const d = Math.hypot(out[b * 2] - solved.joints[c].x, out[b * 2 + 1] - solved.joints[c].y);
          assert.ok(d < 0.5, `pig ${state} t=${t} facing ${facing}: ${c} is ${d.toFixed(2)} px off`);
        });
      }
});

test("the pig stands its near sole on the floor at rest, and its head crowns it at HERO_HEIGHT before the 420 px scale", async () => {
  const rig = await pigRig();
  const s = solve(REST_POSE, -1, castHeadScale(rig.head.share, rig.head), rig.head, castSkeleton(rig));
  const sole = Math.max(s.joints.toeNear.y, s.joints.heelNear.y);
  assert.ok(Math.abs(sole + groundShift(s, "planted")) < 1, `the near sole ${(sole + groundShift(s, "planted")).toFixed(2)} px off the floor`);
  assert.ok(Math.abs(s.crown.y + HERO_HEIGHT) < 0.5, `crown at ${s.crown.y}`);
});
```

- [ ] **Step 2: Run them to watch them fail**

Run: `node --loader ./scripts/game-test-loader.mjs --test --test-name-pattern "rig draws|pig's painting|near sole on the floor at rest, and its head" scripts/render.check.mjs`
Expected: FAIL: `drawOrder` is not exported. (The two painting tests may already pass on Task 3's rig: they pin it.)

- [ ] **Step 3: A rig's own order and faces** (in `src/render/skin.ts`)

```ts
/** A cast body's draw order, back to front, its head among the layers: behind the torso, so the collar covers its neck. */
export const CAST_Z = ["armFar", "legFar", "legNear", "head", "torso", "armNear"] as const;
/** A rig's draw order with its head among its layers: its cut's own (the pig's), or the cast's. */
export const drawOrder = (rig: Pick<RigFile, "z">): readonly string[] => rig.z ?? CAST_Z;
/** A rig's skinned layers, back to front. */
export const bodyLayersOf = (rig: Pick<RigFile, "z">): string[] => drawOrder(rig).filter((n) => n !== "head");
```

`RigFile.layers` becomes `Partial<Record<string, RigLayer>>`; add `z?: string[]` to `RigFile` ("its cut's draw order, back to front, the head among them") and `faces?: Record<string, string>` to `CastHead` ("the face edits by name, each framed exactly like the plate: the pig's").

- [ ] **Step 4: The painted figure draws any rig** (in `src/render/cast-body.ts`)

- `CastArt.person: CastPerson | "pig"`; `PaintOpts` gains `face?: string | null` ("a face edit by name, worn over the plain face"); `Part.name: string`; `FAR_LAYERS: ReadonlySet<string>`.
- `filesOf` adds each `rig.head.faces` value and walks `bodyLayersOf(rig)` instead of `LAYER_Z`.
- Split `loadCastArt` into a loader by body:

```ts
/** A body's rig and textures, or null when it is not registered or does not load: its stand-in draws it. */
export function loadRigArt(registry: Registry, body: { rig: string } | undefined, person: CastPerson | "pig"): Promise<CastArt | null> {
```

  with the old body of `loadCastArt` (its check becomes `bodyLayersOf(rig).every((n) => rig.layers?.[n]?.file)`), and

```ts
export const loadCastArt = (registry: Registry, person: CastPerson) => loadRigArt(registry, registry.cast?.bodies[person], person);
/** The pig's painting, cut like a cast body's (R3 §6.3). */
export const loadPigArt = (registry: Registry) => loadRigArt(registry, registry.pig, "pig");
```

- The constructor walks `drawOrder(art.rig)`: each body layer's mesh at its index as `zIndex`, and the head at the head's index (`HEAD_Z` goes: the cast's head lands at 3, between the near leg at 2 and the torso at 4, the same order as before).
- In `apply`, the face:

```ts
    const face = (o.face && plate.faces?.[o.face]) || (o.dazed && plate.silly) || layerTexture(plate, o.recolor);
```

- Every caller of `PaintOpts` (`src/render/cast.ts`, `src/render/boards.ts`) compiles unchanged: `face` is optional.

- [ ] **Step 5: The pig's view paints it** (in `src/render/pig.ts`)

Import `Assets`, `Sprite`, `Texture` from `pixi.js`; `ART_BASE`, `type Registry` from `../art/registry`; `loadPigArt`, `PaintedFigure`, `type CastArt` from `./cast-body`; `castHeadScale` from `./cast-art`; `solve` from `../sim/rig/fk`; `groundShift` from `../sim/rig/ground`; `HERO_HEIGHT` from `../sim/rig/skeleton`. Add:

```ts
/** A tuft of stuffing out of a hit, flying, turning and fading behind him. */
type Tuft = { s: Sprite; vx: number; vy: number; spin: number; life: number };
const TUFT = { width: 90, life: 1, fade: 0.3, gravity: 1800 } as const;
```

and to `PigView`:

```ts
  private art: CastArt | null = null;
  private figure: PaintedFigure | null = null;
  private tuftTextures: Texture[] = [];
  private readonly tufts: Tuft[] = [];
  private readonly tuftLayer = new Container({ label: "tufts" });

  /** The painting and its tufts, once: the drawn pig stands in until they are in, and for good if they never are. */
  async load(registry: Registry): Promise<void> {
    if (this.art) return;
    const art = await loadPigArt(registry);
    if (!art) return;
    this.art = art;
    this.figure = new PaintedFigure(art);
    this.body.removeChild(this.standIn);
    this.body.addChild(this.figure.container);
    this.kind = "painted";
    try {
      this.tuftTextures = await Promise.all((registry.pig?.stuffing ?? []).map((p) => Assets.load<Texture>(ART_BASE + p.file)));
    } catch (err) {
      console.warn(`pig: its tufts did not load, plain fluff stands in (${(err as Error).message})`);
    }
  }
```

The painted `draw` replaces the stand-in's when `this.figure` is set:

```ts
    if (this.figure && this.art) {
      const head = this.art.head;
      const solved = solve(pose, facing, castHeadScale(head.share, head), head, this.art.skeleton);
      const k = PIG_HEIGHT / HERO_HEIGHT;
      const dy = this.here.y >= this.floorY - 0.5 ? groundShift(solved, "planted") : 0;
      this.body.pivot.set(0, 0);
      this.body.rotation = 0;
      this.body.position.set(0, dy * k);
      this.body.scale.set(k);
      this.figure.apply(solved, { recolor: null, dazed: false, hat: false, silhouette: false, face }, null);
      this.crownAt = { x: this.here.x + solved.crown.x * k, y: this.here.y + (solved.crown.y + dy) * k, facing };
      return;
    }
```

where `floorY` is the pig's `floor` kept from `sync` (`this.floorY = cur.floor`): in a hop's air it is not grounded. The solve turns, squashes and mirrors it, so the body container only scales it to 420 px. The tufts:

```ts
  /** A tuft of stuffing out of the pig, flying, turning and fading behind him; with no tuft pictures, only the fluff puffs. */
  private throwTuft(x: number, y: number): void {
    if (!this.tuftTextures.length) return;
    const tex = this.tuftTextures[Math.floor(Math.random() * this.tuftTextures.length)];
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.scale.set(TUFT.width / tex.width);
    s.position.set(x, y);
    this.tuftLayer.addChild(s);
    const side = Math.random() < 0.5 ? -1 : 1;
    this.tufts.push({ s, vx: side * (80 + Math.random() * 160), vy: -(500 + Math.random() * 300), spin: side * (2 + Math.random() * 3), life: TUFT.life });
  }

  private stepTufts(dt: number): void {
    for (const t of this.tufts) {
      t.vy += TUFT.gravity * dt;
      t.s.x += t.vx * dt;
      t.s.y += t.vy * dt;
      t.s.rotation += t.spin * dt;
      t.life -= dt;
      t.s.alpha = Math.max(0, Math.min(1, t.life / TUFT.fade));
      if (t.life <= 0) t.s.destroy();
    }
    for (let i = this.tufts.length - 1; i >= 0; i--) if (this.tufts[i].life <= 0) this.tufts.splice(i, 1);
  }
```

`sync` calls `this.stepTufts(dt)` first thing (even with no pig, so tufts in flight finish); `hit` adds `this.throwTuft(x, y)`; `down` throws one at each of its two seams (`x - 70, y - PIG_HEIGHT * 0.55` and `x + 90, y - PIG_HEIGHT * 0.35`); `clear` destroys every tuft (`for (const t of this.tufts) t.s.destroy(); this.tufts.length = 0;`), and `destroy` also destroys `tuftLayer` and the figure (`this.figure?.destroy()`).

- [ ] **Step 6: Load it with the gift shop** (in `src/render/look.ts`'s `prepare`, before `views.set`)

```ts
        // The pig's painting loads with its venue; the drawn pig stands in if it fails.
        if (level.boss && !opts.noart) await pigView.load(registry);
```

- [ ] **Step 7: The pig's board** (in `src/render/boards.ts`, the kind `"pig"`; in `scripts/look-boards.mjs`, render it as `pig.png` and `pig-steps.png` from `?next=1&board=1&venue=arena`)

```ts
  /** The pig in every state and face, or (`steps`) its charge and its hop every 1/60 s for half a second: R3 §8's boards. */
  const pigBoard = async (steps: boolean) => {
    const cell = steps ? 300 : 520;
    const k = steps ? 0.6 : 1;
    // The hop's own arc: 1733 px/s up, 5778 px/s² down (Task 1's numbers for 260 px in 0.6 s).
    const arc = (t: number) => Math.max(0, 1733 * t - 2889 * t * t);
    type PigCell = [name: string, state: PigState, t: number, o: Partial<Pig>, lift: number];
    const cells: PigCell[] = steps
      ? [
          ...Array.from({ length: 30 }, (_, i): PigCell => [`charge ${i}`, "charge", i / 60, {}, 0]),
          ...Array.from({ length: 30 }, (_, i): PigCell => [`hop ${i}`, "hop", i / 60, { onGround: false }, arc(i / 60)]),
        ]
      : [
          ["asleep", "asleep", 1, {}, 0],
          ["wind-up", "windup", 0.3, {}, 0],
          ["charge 0.1", "charge", 0.1, {}, 0],
          ["charge 0.2", "charge", 0.2, {}, 0],
          ["hop, air", "hop", 0.2, { onGround: false }, 200],
          ["hop, landed", "hop", 0, {}, 0],
          ["recover", "recover", 0.5, {}, 0],
          ["hit", "recover", 0.02, { hurtT: 0.37 }, 0],
          ["down 0.6", "defeated", 0.6, {}, 0],
          ["down 1.2", "defeated", 1.2, {}, 0],
          ["face: plain", "recover", 0, {}, 0],
          ["face: squint", "windup", 0, {}, 0],
          ["face: charge", "charge", 0, {}, 0],
          ["face: hurt", "recover", 0, { hurtT: 0.3 }, 0],
          ["face: defeated", "defeated", 0, {}, 0],
        ];
    const cols = steps ? 10 : 5;
    const rows = Math.ceil(cells.length / cols);
    const width = cols * cell + 40;
    const height = rows * cell + 40;
    const board = new Container();
    board.addChild(new Graphics().rect(0, 0, width, height).fill("#20242b"));
    const views: PigView[] = [];
    for (const [i, [name, state, t, o, lift]] of cells.entries()) {
      const cx = 20 + (i % cols) * cell + cell / 2;
      const floor = 20 + Math.floor(i / cols) * cell + cell - 30;
      board.addChild(new Graphics().rect(cx - cell / 2 + 10, floor, cell - 20, 2).fill("#5b6270"));
      const caption = label(name, "ui", steps ? 16 : 20);
      caption.position.set(cx - cell / 2 + 12, floor - cell + 40);
      board.addChild(caption);
      // Its own view, held in its state for `t` (its clocks stepped at 60 a second), then scaled about its feet.
      const pig: Pig = { ...createPig({ x: cx, arena: [-1e6, 1e6] }, floor), state, facing: -1, ...o, y: floor - lift * k };
      const v = new PigView(board, particles);
      await v.load(registry);
      v.sync(null, pig, 1, 0);
      for (let n = 0; n < Math.round(t * 60); n++) v.sync(null, pig, 1, 1 / 60);
      if (name === "hit") {
        v.hit(cx, floor - 200 * k);
        v.sync(null, pig, 1, 0);
      }
      v.container.scale.set(k);
      views.push(v);
    }
    const out = await snapshot(board, width, height);
    for (const v of views) v.destroy();
    board.destroy({ children: true });
    return out;
  };
```

with `case "pig": return pigBoard(false);` and `case "pig-steps": return pigBoard(true);`, the `BoardSpec` kinds `"pig" | "pig-steps"`, and the imports (`PigView` from `./pig`, `createPig`, `type Pig`, `type PigState` from `../sim/pig`). In `scripts/look-boards.mjs`, when `want("pig")`: go to `${base}?next=1&board=1&venue=arena`, wait as for the venues, and save `render("pig")` as `pig.png` and `render("pig-steps")` as `pig-steps.png`. The board figures' count must come back to where it was (the script checks it).

- [ ] **Step 8: Run the tests, the boards and the browser**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render scripts`, `node scripts/look-boards.mjs http://127.0.0.1:8090/ pig,arena,cast,cast-lobby`, and with `BROWSER_SMOKE_CHANNEL=chrome`: `node scripts/pig-browser.check.mjs http://127.0.0.1:8090/`, `node scripts/cast-art-browser.check.mjs http://127.0.0.1:8090/`
Expected: all pass, `window.__next.pig.drawn` is `"painted"`. Read `artifacts/pig.png` and `artifacts/pig-steps.png` at full size and step the strip: no part pops from one frame to the next; the leans tip the whole pig; the far arm and far leg never show a hole at their roots; the head never parts from the body by more than its seam; each face sits exactly on the head; the flash is white over the whole pig and nothing else; the feet stand on the floor line at rest and in the charge. The cast's boards look exactly as before (the head behind the torso).

- [ ] **Step 9: Commit**

```bash
git add src/render/skin.ts src/render/cast-body.ts src/render/pig.ts src/render/look.ts src/render/boards.ts scripts/look-boards.mjs scripts/render.check.mjs
```

Message: "The pig painted: its rig drawn in its cut's own order, its faces by state, its flash, wobble and tufts". Push. Send the owner `artifacts/pig.png` and one fight screenshot.

### Task 6: The lobby's painted walls

**Files:**
- Create: `art/cuts/wall-lobby-far-1.json`, `wall-lobby-far-2.json`, `wall-lobby-far-3.json`
- Modify: `src/sim/levels/lobby.ts` (its `backdrop`)
- Test: `scripts/art.check.mjs`
- Commit with: `art/incoming/backdrops/lobby-far-1.png`, `lobby-far-2.png`, `lobby-far-3.png`, `lobby-mid.png`, `lobby-fore.png`, their `.prompt.txt` files and their manifest entries.

**Interfaces:**
- Consumes: R3a's `wallsFor`, `layWalls`, `sheetPieces`, the `backdrop` spec; Task 4's `GIFTSHOP.backdrop`.
- Produces: `LOBBY.backdrop`; the lobby drawn on its painted walls (the inked photo and the code-drawn columns and palms now only its fallback).

- [ ] **Step 1: Write the failing tests** (append to `scripts/art.check.mjs`; import `LOBBY`, `RESTAURANT`, `CAMPUS`, `GIFTSHOP` from `../src/sim/levels/*.ts`)

```js
test("every wall painting has its cut file", () => {
  for (const f of readdirSync("art/incoming/backdrops").filter((n) => /-far-\d+\.png$/.test(n)))
    assert.ok(existsSync(`art/cuts/wall-${f.replace(/\.png$/, "")}.json`), `${f} has no cut`);
});

test("every venue's walls and standing pieces are synced: each one its level names is in the registry", () => {
  const reg = JSON.parse(readFileSync("public/art/registry.json", "utf8"));
  for (const level of [LOBBY, RESTAURANT, CAMPUS, GIFTSHOP]) {
    assert.ok(level.backdrop, `${level.id} names its painted walls`);
    for (const w of level.backdrop.walls) assert.ok(reg.walls?.[w], `${level.id}: wall ${w}`);
    for (const p of [...level.backdrop.mid, ...level.backdrop.fore]) assert.ok(reg.pieces?.[p.name], `${level.id}: piece ${p.name}`);
  }
});
```

(`readdirSync` joins the `node:fs` import.)

- [ ] **Step 2: Run them to watch them fail**

Run: `node --loader ./scripts/game-test-loader.mjs --test --test-name-pattern "wall painting has|walls and standing pieces are synced" scripts/art.check.mjs`
Expected: FAIL: `lobby-far-1.png has no cut`, and `lobby names its painted walls`.

- [ ] **Step 3: The lobby's wall cuts**

Measure each with `node scripts/art-grid.mjs wall/lobby-far-1` (and 2, 3), then create `art/cuts/wall-lobby-far-1.json`:

```json
{
  "note": "Coordinates are pixels of art/incoming/backdrops/lobby-far-1.png (the arched windows and the gold-leaf painting). Each edge holds a whole cream pilaster, outlined on both sides, so the seams are their middles. floor is the row where the wainscot's base meets the floor. Check with: node scripts/art-grid.mjs wall/lobby-far-1.",
  "floor": 742,
  "seams": [31, 1504]
}
```

`wall-lobby-far-2.json` (the chandelier and the two landscapes): `"floor": 741`, `"seams": [31, 1504]`; `wall-lobby-far-3.json` (the red curtains and the mirror): `"floor": 740`, `"seams": [31, 1504]`. These are the plan-time measurements: correct each to the grid (the floor line level across the wall, each seam on a pilaster's middle) and say so in its note.

- [ ] **Step 4: The lobby's backdrop** (in `src/sim/levels/lobby.ts`, the `backdrop` field)

```ts
  // The lobby's three walls in walking order; against them a palm by the doors, a floor lamp by the desk, a lamp on its
  // table under the mezzanine, the lilies in the shuttle bay and the rope line at the conference wing; in front, a potted
  // tree past the desk and a column in the wing. The inked corridor photo and the drawn columns are its fallback.
  backdrop: {
    walls: ["lobby-far-1", "lobby-far-2", "lobby-far-3"],
    mid: [
      { name: "lobby-mid-1", x: 700 },
      { name: "lobby-mid-2", x: 3300 },
      { name: "lobby-mid-3", x: 7600 },
      { name: "lobby-mid-4", x: 10900 },
      { name: "lobby-mid-5", x: 12900 },
    ],
    fore: [
      { name: "lobby-fore-1", x: 2600 },
      { name: "lobby-fore-2", x: 11300 },
    ],
  },
```

The sheets cut left to right: `lobby-mid` is the palm, the floor lamp, the table lamp, the lilies and the rope line; `lobby-fore` the potted tree and the column (`artifacts/r3b-art-sheet.png` shows them). Check the pieces' names against the sync's output before trusting the order.

- [ ] **Step 5: Sync and run the tests**

Run: `npm run art:sync`, then `npm run test:next`
Expected: the sync logs three lobby walls, `pieces lobby-mid: 5`, `pieces lobby-fore: 2`; the tests pass.

- [ ] **Step 6: Look at it**

Run: `node scripts/look-boards.mjs http://127.0.0.1:8090/ lobby,cast-lobby,stash` and read `artifacts/lobby-look-1.png` to `-6.png` at full size: the walls in walking order meeting at their pilasters, their floor lines on the game's floor, the walls scaled into one room (`wallScale` keeps them within 0.9 to 1.4), the code-drawn columns and palms gone, no mid piece standing in front of a door, the shaft or the elevators, no fore piece over the desk, the stairs or the exit, the mezzanine's balcony reading clearly over the walls. Move a piece that blocks a door or a hazard (its `x`, a ruling); the stash keeps its block wall.

- [ ] **Step 7: Commit**

```bash
git add art/cuts/wall-lobby-far-1.json art/cuts/wall-lobby-far-2.json art/cuts/wall-lobby-far-3.json src/sim/levels/lobby.ts scripts/art.check.mjs art/incoming/backdrops/lobby-{far-1,far-2,far-3,mid,fore}.{png,prompt.txt}
node artifacts/stage-manifest.mjs art/incoming/backdrops/lobby-{far-1,far-2,far-3,mid,fore}.{png,prompt.txt}
```

Message: "The lobby on its painted walls: three walls in walking order and its painted palm, lamps, lilies, rope line, tree and column". Push. Send the owner two of the lobby boards.

---

### Task 7: The start screen

**Files:**
- Create: `src/components/next-start.tsx`, `scripts/start-art.mjs`, `public/start/key-art.webp`, `public/start/lobby.webp`, `public/start/restaurant.webp`, `public/start/campus.webp`, `public/start/arena.webp`, `scripts/next-start.check.mjs`
- Modify: `src/sim/game.ts`, `src/render/look.ts`, `src/render/boards.ts`, `src/components/next-game.tsx`, `src/components/next-veil.tsx`, `src/components/kiln-hop.tsx`, `src/routes/index.tsx`, `src/styles.css`
- Test: `scripts/lobby.check.mjs`, `scripts/next-start.check.mjs`

**Interfaces:**
- Consumes: the shift (`createGame`, `newRun(seed, start)`), `RenderApp.setQuality`, `Quality`, the boards' `levelFrames`, Task 5's `PigView`.
- Produces: `GameMode` adds `"title"`; `createGame(levels, seed, { title?: boolean })` starts held on the title; `Game.toTitle(): void`; `startLook(render, { title?: boolean, … })`; `Look.start(at: number): void`, `Look.toTitle(): void`, `Look.setQuality(q: Quality | null): void`; `NextGame`'s `title?: boolean`; `NextStart` (props below); `VeilInfo.practice: boolean`; the route flags `title` and `quest`; `KilnHop`'s `quest?: "hungry"`; the board kinds `"keyart"` and `"thumb"`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/lobby.check.mjs`)

```js
test("a game made for the start screen waits on the title: nothing steps, no clock runs, and a chosen start opens on its card", () => {
  const g = createGame({ lobby: mini(), stash: stashOf(), venues: [{ ...mini(), id: "restaurant", world: "1-2" }] }, 7, { title: true });
  assert.equal(g.mode, "title");
  const x = g.world.hero.x;
  stepsG(g, 2, { right: true });
  assert.deepEqual([g.mode, g.world.hero.x, g.run.time], ["title", x, 420]);
  g.newRun(9, 1);
  assert.deepEqual([g.mode, g.level.id, g.start, g.run.lives], ["card", "restaurant", 1, 3]);
});

test("back to the title from a shift's end, and from there a new shift where it is chosen", () => {
  const g = createGame({ lobby: mini(), stash: stashOf() }, 7);
  play(g);
  g.run.lives = 1;
  knockOut(g);
  until(g, (x) => x.mode === "over", 10);
  assert.equal(g.mode, "over");
  g.toTitle();
  assert.equal(g.mode, "title");
  assert.deepEqual(g.events.map((e) => e.type === "mode" && e.mode), ["title"]);
  g.newRun(3, 0);
  assert.deepEqual([g.mode, g.run.lives, g.run.score], ["card", 3, 0]);
});
```

(The helpers are `scripts/lobby.check.mjs`'s own: `mini`, `stashOf`, `play`, `stepsG`, the Game form of `until`, `knockOut`.)

- [ ] **Step 2: Run them to watch them fail**

Run: `node --loader ./scripts/game-test-loader.mjs --test --test-name-pattern "title" scripts/lobby.check.mjs`
Expected: FAIL: the game starts on `card`, and `toTitle` is not a function.

- [ ] **Step 3: The title hold** (in `src/sim/game.ts`)

`GameMode` adds `"title"`; `createGame`'s options add `title?: boolean`; `Game` adds:

```ts
  /** Back to the start screen: the game holds, nothing steps, until a new run is chosen. */
  toTitle(): void;
```

At the end of `createGame`, after `begin(…)`:

```ts
  // On the start screen the game holds on the title until a start is chosen; the first venue is laid out behind it.
  if (opts.title) game.mode = "title";
```

and

```ts
  function toTitle() {
    game.events = [];
    setMode("title", game.events);
  }
```

`step` already does nothing in a mode it does not name, so the title holds; `newRun` leaves it through `begin`'s card.

- [ ] **Step 4: Run them to watch them pass**

Run: `node --loader ./scripts/game-test-loader.mjs --test scripts/lobby.check.mjs`
Expected: PASS.

- [ ] **Step 5: The look holds on the title, starts where it is told, and stops cleanly** (in `src/render/look.ts`)

- `opts` adds `title?: boolean`, passed to `createGame` as `title: !!opts.title`.
- `Look` adds:

```ts
  /** A shift from the start screen, at the shift's venue `at` (the gift shop is pig practice). */
  start(at: number): void;
  /** Back to the start screen. */
  toTitle(): void;
  /** The start screen's quality choice: a tier kept on this device, or null to let the game choose (and step down). */
  setQuality(q: Quality | null): void;
```

  implemented as:

```ts
    start(at) {
      forgetPresses();
      game.newRun(newSeed(), at);
      prev = cur = world.snapshot();
      clearActors();
    },
    toTitle() {
      forgetPresses();
      game.toTitle();
      for (const e of game.events) feel(e);
    },
    setQuality(q) {
      try {
        if (q) localStorage.setItem("hammer-time-quality", q);
        else localStorage.removeItem("hammer-time-quality");
      } catch {
        // Private windows refuse storage: the choice lasts the session.
      }
      if (q) render.setQuality(q);
    },
```

  (read `src/render/app.ts`: `RenderApp.setQuality` and the `hammer-time-quality` key `readForcedQuality` reads; if `RenderApp` names it otherwise, use its name).
- The stopped flag (R3a's deferred minor): `let stopped = false;` set first thing in `stop()`; `prepare`'s body returns early after each `await` when `stopped` (destroying what it built: `backdrop` and `venue` are not added to `views` then), and the shift's loading chain `SHIFT.reduce((p, l) => p.then(() => (stopped ? undefined : prepare(l))), …)`.

- [ ] **Step 6: The start screen's pictures** (create `scripts/start-art.mjs`, and two board kinds in `src/render/boards.ts`)

The board kinds (in `src/render/boards.ts`; `levelFrames` renders 1920 by 1080, and the script scales down):

```ts
        case "thumb": {
          const lv = currentLevel();
          return levelFrames([START_FRAMES[lv.id]!], lv.id);
        }
        case "keyart": {
          // Hammer and the pig face off in the lobby: the pig in its wind-up behind him in the sort, facing him.
          const view = new PigView(scene.layers.play, particles);
          await view.load(registry);
          const pig: Pig = { ...createPig({ x: 1600, arena: [-1e6, 1e6] }, 0), state: "windup", facing: -1 };
          view.sync(null, pig, 1, 0);
          for (let i = 0; i < 18; i++) view.sync(null, pig, 1, 1 / 60);
          view.sort(-0.7);
          const frame = await levelFrames([{ x: 1150, y: 0, cx: 1380, zoom: 1.15 }], "lobby");
          view.destroy();
          return frame;
        }
```

with `"thumb" | "keyart"` added to `BoardSpec`'s kinds.

```ts
/** Each start's picture on the start screen: where he stands and where the camera looks. */
const START_FRAMES: Partial<Record<LevelId, { x: number; y?: number; cx: number; cy?: number; zoom?: number }>> = {
  lobby: { x: 1100, y: 0, cx: 1600 },
  restaurant: { x: 8500, y: -180, cx: 9000, cy: -380, zoom: 0.88 },
  campus: { x: 7250, y: -120, cx: 8100, cy: -420, zoom: 0.88 },
  arena: { x: 1300, y: -180, cx: 2100, cy: -380, zoom: 0.92 },
};
```

```js
// Renders the start screen's pictures from the game itself and stores them in public/start/ (committed): the key art (the
// lobby with Hammer and the pig) and a picture of each place a shift can start. The owner's art/incoming/brand/key-art.png
// replaces the rendered key art when it exists. Run it after the art changes, against the dev server.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/start-art.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
mkdirSync("public/start", { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const webp = (png, width, file) => sharp(png).resize({ width }).webp({ quality: 85, effort: 5 }).toFile(`public/start/${file}`);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  const shot = async (venue, kind) => {
    await page.goto(`${base}?next=1&board=1${venue === "lobby" ? "" : `&venue=${venue}`}`);
    await page.waitForFunction((v) => window.__nextBoard && window.__next?.run?.level === v, venue);
    await page.waitForTimeout(800);
    const data = await page.evaluate((k) => window.__nextBoard.render({ kind: k, resolution: 1 }), kind);
    return Buffer.from(data.split(",").pop(), "base64");
  };
  const owner = "art/incoming/brand/key-art.png";
  await webp(existsSync(owner) ? readFileSync(owner) : await shot("lobby", "keyart"), 1600, "key-art.webp");
  for (const venue of ["lobby", "restaurant", "campus", "arena"]) await webp(await shot(venue, "thumb"), 640, `${venue}.webp`);
  console.log("PASS: wrote public/start/key-art.webp and four pictures of where a shift starts.");
} finally {
  await browser.close();
}
```

Run it (`BROWSER_SMOKE_CHANNEL=chrome node scripts/start-art.mjs http://127.0.0.1:8090/`) and read every picture at full size: each shows its place at its best; the key art shows Hammer and the pig facing off, nothing cut at the top.

- [ ] **Step 7: The start screen** (create `src/components/next-start.tsx`)

```tsx
import { useState } from "react";
import type { Quality } from "@/render/app";
import { KEYS } from "./next-veil";

/** Where a shift can start: the shift's venue index, its card's picture and words. The gift shop alone is pig practice. */
export const STARTS = [
  { at: 0, id: "lobby", code: "1-1", name: "Hotel lobby", detail: "The whole shift" },
  { at: 1, id: "restaurant", code: "1-2", name: "Restaurant", detail: "Start at the restaurant" },
  { at: 2, id: "campus", code: "1-3", name: "Campus", detail: "Start at the campus" },
  { at: 3, id: "arena", code: "1-4", name: "The Pink Menace", detail: "Pig practice" },
] as const;
export type Start = (typeof STARTS)[number];

const QUALITIES: { value: Quality | null; label: string }[] = [
  { value: null, label: "Auto" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const pad = (n: number) => String(n).padStart(6, "0");

/**
 * The start screen (R3 §7) in the shell's slate and gold: the title over the key art, where to start (the whole shift,
 * the restaurant, the campus, or pig practice), "Clock in", the best, mute, the keys, the quality, and the side quests.
 * The game loads behind it: a start picked before it is ready begins as soon as it is.
 */
export function NextStart({
  ready,
  best,
  hungryBest,
  muted,
  quality,
  onMute,
  onQuality,
  onStart,
}: {
  ready: boolean;
  best: number;
  hungryBest: number;
  muted: boolean;
  quality: Quality | null;
  onMute: () => void;
  onQuality: (q: Quality | null) => void;
  onStart: (s: Start) => void;
}) {
  const [chosen, setChosen] = useState<Start>(STARTS[0]);
  const [keys, setKeys] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const clockIn = () => {
    if (waiting) return;
    setWaiting(!ready);
    onStart(chosen);
  };
  return (
    <div className="next-start" role="dialog" aria-label="Hammer Time">
      <header className="next-start__top">
        <span className="next-start__edition">A very personal hospitality problem</span>
        <span className="next-start__best">
          Personal best <b>{pad(best)}</b>
        </span>
        <button type="button" className="next-start__tool" aria-pressed={muted} onClick={onMute}>
          {muted ? "Sound off" : "Sound on"}
        </button>
        <button type="button" className="next-start__tool" aria-expanded={keys} onClick={() => setKeys((k) => !k)}>
          Keys
        </button>
        <label className="next-start__tool next-start__quality">
          Quality
          <select value={quality ?? "auto"} onChange={(e) => onQuality(e.target.value === "auto" ? null : (e.target.value as Quality))}>
            {QUALITIES.map((q) => (
              <option key={q.label} value={q.value ?? "auto"}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      {keys && (
        <p className="next-start__keys">
          {KEYS.map(([key, what]) => (
            <span key={key} className="next-hud__key">
              <kbd>{key}</kbd>
              {what}
            </span>
          ))}
        </p>
      )}
      <section className="next-start__hero">
        <img className="next-start__art" src="/start/key-art.webp" alt="" draggable={false} />
        <div className="next-start__title">
          <p className="next-start__eyebrow">Four venues. Zero patience.</p>
          <h1>
            Hammer <span>Time.</span>
          </h1>
          <p className="next-start__tagline">Bonk the staff. Dodge the paper. Settle it with the pig.</p>
          <button type="button" className="next-start__go" onClick={clockIn} aria-busy={waiting}>
            {waiting ? "Getting Hammer ready…" : "Clock in"}
          </button>
        </div>
      </section>
      <nav className="next-start__venues" aria-label="Choose where to start">
        {STARTS.map((s) => (
          <button key={s.id} type="button" className="next-start__venue" aria-label={`Start at ${s.name}`} aria-pressed={chosen.id === s.id} onClick={() => setChosen(s)} onDoubleClick={() => onStart(s)}>
            <img src={`/start/${s.id}.webp`} alt="" draggable={false} />
            <span className="next-start__code">{s.code}</span>
            <b>{s.name}</b>
            <small>{s.detail}</small>
          </button>
        ))}
      </nav>
      <section className="next-start__quests" aria-label="Side quests">
        <span className="next-start__quests-k">Side quests</span>
        <a className="next-start__quest" href="/?classic=1&quest=hungry" aria-label="Play Hungry Hungry Hammer">
          <b>Hungry Hungry Hammer</b>
          <small>Banquet table · best {pad(hungryBest)}</small>
        </a>
      </section>
    </div>
  );
}
```

Export `KEYS` from `src/components/next-veil.tsx`. In `src/styles.css`, add `.next-start` to the shell's colour scope (`.next-hud, .next-veil, .next-touch, .next-start { --hud-… }`) and the start screen's rules after the veil's:

```css
/* The start screen (R3 §7): the title over the key art, where to start, and the tools, in the shell's slate and gold. */
.next-start {
  position: fixed;
  inset: 0;
  z-index: 5;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: "top top" "hero venues" "quests venues";
  gap: 16px 24px;
  padding: 16px 24px 20px;
  background: var(--hud-ink);
  color: var(--hud-text);
  font-family: "Inter", system-ui, sans-serif;
}
.next-start__top {
  grid-area: top;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}
.next-start__edition {
  margin-right: auto;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--hud-gold);
}
.next-start__best {
  font-size: 13px;
  color: var(--hud-dim);
}
.next-start__best b {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--hud-text);
}
.next-start__tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--hud-edge);
  border-radius: 8px;
  background: var(--hud-slate);
  color: var(--hud-text);
  font: 600 13px "Inter", system-ui, sans-serif;
}
.next-start__quality select {
  border: 0;
  background: transparent;
  color: var(--hud-text);
  font: inherit;
}
.next-start__keys {
  position: absolute;
  top: 64px;
  right: 24px;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  max-width: min(520px, calc(100% - 48px));
  margin: 0;
  padding: 12px 14px;
  background: var(--hud-slate);
  border: 1px solid var(--hud-edge);
  border-radius: 10px;
}
.next-start__hero {
  grid-area: hero;
  position: relative;
  display: flex;
  align-items: flex-end;
  min-height: 0;
  border-radius: 16px;
  overflow: hidden;
}
.next-start__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.next-start__title {
  position: relative;
  width: 100%;
  padding: 48px 24px 22px;
  background: linear-gradient(to top, rgb(13 17 24 / 0.92) 0%, rgb(13 17 24 / 0.6) 60%, rgb(13 17 24 / 0) 100%);
  text-shadow: 0 2px 12px rgb(0 0 0 / 0.6);
}
.next-start__eyebrow {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--hud-gold);
}
.next-start__title h1 {
  margin: 4px 0 0;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: clamp(40px, 7vw, 92px);
  line-height: 0.92;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.next-start__title h1 span {
  color: var(--hud-gold);
}
.next-start__tagline {
  margin: 8px 0 14px;
  font-size: 16px;
}
.next-start__go {
  min-width: 200px;
  height: 52px;
  padding: 0 24px;
  border: 0;
  border-radius: 10px;
  background: var(--hud-gold);
  color: var(--hud-ink);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.next-start__go:focus-visible,
.next-start__venue:focus-visible,
.next-start__quest:focus-visible {
  outline: 3px solid var(--hud-text);
  outline-offset: 3px;
}
.next-start__venues {
  grid-area: venues;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-content: center;
  min-height: 0;
}
.next-start__venue {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas: "img img" "code name" "code detail";
  gap: 0 8px;
  min-height: 44px;
  padding: 8px 8px 10px;
  text-align: left;
  background: var(--hud-slate);
  border: 1px solid var(--hud-edge);
  border-radius: 12px;
  color: var(--hud-text);
}
.next-start__venue[aria-pressed="true"] {
  border-color: var(--hud-gold);
  box-shadow: inset 0 0 0 2px var(--hud-gold);
}
.next-start__venue img {
  grid-area: img;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin-bottom: 6px;
  object-fit: cover;
  border-radius: 8px;
}
.next-start__code {
  grid-area: code;
  align-self: center;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: var(--hud-gold);
}
.next-start__venue b {
  grid-area: name;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 19px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.next-start__venue small {
  grid-area: detail;
  font-size: 12px;
  color: var(--hud-dim);
}
.next-start__quests {
  grid-area: quests;
  display: flex;
  align-items: center;
  gap: 12px;
}
.next-start__quests-k {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--hud-dim);
}
.next-start__quest {
  display: grid;
  padding: 8px 14px;
  background: var(--hud-slate);
  border: 1px solid var(--hud-edge);
  border-radius: 10px;
  color: var(--hud-text);
  text-decoration: none;
}
.next-start__quest b {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 18px;
  text-transform: uppercase;
}
.next-start__quest small {
  font-size: 12px;
  color: var(--hud-dim);
}
/* A phone upright: one column, the key art a band with the title over its foot, the starts two by two. */
@media (max-width: 899px) and (orientation: portrait) {
  .next-start {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto auto;
    grid-template-areas: "top" "hero" "venues" "quests";
    align-content: start;
    gap: 10px;
    padding: 12px 16px 16px;
  }
  .next-start__edition {
    display: none;
  }
  .next-start__hero {
    min-height: calc((100vw - 32px) * 0.5625 + 40px);
  }
  .next-start__title {
    padding: 36px 14px 12px;
  }
  .next-start__tagline {
    margin: 4px 0 10px;
    font-size: 14px;
  }
  .next-start__venues {
    gap: 8px;
  }
  .next-start__venue b {
    font-size: 16px;
  }
}
/* A phone on its side: the key art behind everything, the title in a row with Clock in, the four starts in one row. */
@media (max-height: 499px) {
  .next-start {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto auto;
    grid-template-areas: "top" "hero" "venues" "quests";
    align-content: start;
    gap: 8px;
    padding: 8px 16px 10px;
  }
  .next-start__edition,
  .next-start__tagline {
    display: none;
  }
  .next-start__hero {
    position: static;
    border-radius: 0;
    overflow: visible;
  }
  .next-start__art {
    position: fixed;
    z-index: -1;
    opacity: 0.35;
  }
  .next-start__title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    padding: 0;
    background: none;
  }
  .next-start__eyebrow {
    width: 100%;
  }
  .next-start__title h1 {
    font-size: 40px;
  }
  .next-start__go {
    height: 44px;
    min-width: 160px;
    font-size: 19px;
  }
  .next-start__venues {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .next-start__venue {
    padding: 6px 6px 8px;
  }
  .next-start__venue b {
    font-size: 15px;
  }
  .next-start__venue small {
    display: none;
  }
}
```

These are the first cut: iterate against the three screenshots the check writes, at full size, until each reads well; every change keeps the fit check passing (nothing scrolls, nothing off the screen). With `.next-start__art` fixed on a phone on its side, `.next-start`'s own background must not cover it: give `.next-start` `isolation: isolate` there so the `z-index: -1` art sits above the page and under the screen's contents.

- [ ] **Step 8: The shell** (in `src/components/next-game.tsx`)

- Props gain `title?: boolean` (on the start screen first).
- State: `const [ready, setReady] = useState(false);`, `const [pending, setPending] = useState<Start | null>(null);`, `const [practice, setPractice] = useState(start === "arena");`, `const [quality, setQualityState] = useState<Quality | null>(null)` (read from `hammer-time-quality` on mount), `const [hungryBest, setHungryBest] = useState(0)` (read from `hammer-time-best-hungry` on mount).
- `startLook(render, { …, title })`; after it resolves, `setReady(true)`.
- `const begin = (s: Start) => { setPractice(s.id === "arena"); if (look.current) look.current.start(s.at); else setPending(s); };` and an effect starting `pending` once `ready`: `if (ready && pending) { look.current?.start(pending.at); setPending(null); }`.
- `onMode`: best is written on `over` and `clear` only when not `practice` (keep `practice` in a ref read by the callback).
- While `mode === "title"` or (`title` and `mode === null`), render `<NextStart ready={ready} best={best} hungryBest={hungryBest} muted={muted} quality={quality} onMute={…the same toggle as the HUD's…} onQuality={(q) => { setQualityState(q); look.current?.setQuality(q); }} onStart={begin} />` and no HUD, touch pad or veil.
- `info` gains `practice`; `NextVeil` gets `onTitle={title ? () => look.current?.toTitle() : undefined}`.

In `src/components/next-veil.tsx`: `VeilInfo.practice: boolean`; `Scores` shows only the score when `practice`; the clear card in practice reads eyebrow "Pig practice", title "Practice over", line "The pig is stuffed. Now try the whole shift."; the over and clear cards show a second, quieter button "Start screen" when `onTitle` is given (class `next-veil__button next-veil__button--quiet`, styled as an outlined gold button).

- [ ] **Step 9: The routes and the old game's side quest** (in `src/routes/index.tsx`)

`validateSearch` adds `title: flag(search.title)`, `classic: flag(search.classic)` and `quest: search.quest === "hungry" ? ("hungry" as const) : undefined` (the router keeps only the flags it knows, so the side quest's address must know `classic` already); `Home` passes `title={!!title}` to `NextGame` and `quest={quest}` to `KilnHop` (`classic` changes nothing until Task 9: without `next`, `/` is still the old game). In `src/components/kiln-hop.tsx`, a prop `quest?: "hungry"`: once `ready`, if `quest` is set and no quest has started yet, `gameRef.current?.newQuest(quest)` (an effect on `[ready, quest]`, run once). Then:

Run: `git hash-object src/routeTree.gen.ts`
Expected: `dceedffdc12c32138e81bb63787cac7ae5d97fcd`.

- [ ] **Step 10: The browser check** (create `scripts/next-start.check.mjs`)

```js
// The start screen at `/?next=1&title=1`: it fits a laptop, a phone upright and a phone on its side without scrolling or
// anything off the screen; each start begins where it says (pig practice at the gift shop), "Start screen" comes back to
// it, the quality choice is kept, a start chosen while the game still loads begins once, and leaving for the side quest
// while it loads leaves no errors.
// Usage: BROWSER_SMOKE_CHANNEL=chrome node scripts/next-start.check.mjs [http://127.0.0.1:8090/]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const url = `${base}?next=1&title=1&dev=1`;
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome", headless: true });
const errors = [];
const fits = async (page, w, h) => {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const boxes = [...document.querySelectorAll(".next-start button, .next-start a, .next-start select, .next-start h1")].map((e) => e.getBoundingClientRect());
    return { sw: doc.scrollWidth, sh: doc.scrollHeight, out: boxes.filter((b) => b.left < 0 || b.top < 0 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5).length };
  });
  assert.ok(r.sw <= w && r.sh <= h, `${w}x${h}: no scrolling (${r.sw}x${r.sh})`);
  assert.equal(r.out, 0, `${w}x${h}: everything on the screen`);
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  // Chosen at once, while the game still loads: it starts once it is ready, and only once.
  await page.goto(url);
  await page.getByRole("button", { name: "Start at Restaurant" }).click();
  await page.getByRole("button", { name: /Clock in|Getting Hammer ready/ }).click();
  await page.waitForFunction(() => window.__next?.run?.mode === "play");
  assert.equal(await page.evaluate(() => window.__next.run.level), "restaurant");
  assert.equal(await page.evaluate(() => window.__next.run.events.venue ?? 0), 0, "started there, not walked there");
  for (const [w, h] of [[1280, 800], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(url);
    await page.waitForSelector(".next-start__venue");
    await page.waitForFunction(() => window.__next?.run?.mode === "title");
    await page.waitForTimeout(300);
    await fits(page, w, h);
    await page.screenshot({ path: resolve(out, `start-${w}x${h}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [name, level] of [["Hotel lobby", "lobby"], ["Campus", "campus"], ["The Pink Menace", "arena"]]) {
    await page.goto(url);
    await page.waitForFunction(() => window.__next?.run?.mode === "title");
    await page.getByRole("button", { name: `Start at ${name}` }).click();
    await page.getByRole("button", { name: "Clock in" }).click();
    await page.waitForFunction(() => window.__next.run.mode === "play");
    assert.equal(await page.evaluate(() => window.__next.run.level), level);
    assert.deepEqual(await page.evaluate(() => [window.__next.run.lives, window.__next.run.patience, window.__next.run.hot]), [3, 2, false], `${name}: a fresh shift`);
  }
  // Pig practice ends on "Practice over", with no best kept, and "Start screen" goes back.
  await page.evaluate(() => localStorage.setItem("hammer-time-best-next", "0"));
  await page.evaluate(() => window.__next.dev.pig({ state: "defeated" }));
  await page.evaluate(() => window.__next.dev.teleport(3950, 0));
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__next.run.mode === "clear", null, { timeout: 20000 });
  await page.keyboard.up("ArrowRight");
  await page.getByRole("heading", { name: "Practice over" }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-best-next")), "0", "no best from practice");
  await page.getByRole("button", { name: "Start screen" }).click();
  await page.waitForFunction(() => window.__next.run.mode === "title");
  // The quality choice is kept on the device.
  await page.locator(".next-start__quality select").selectOption("low");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-quality")), "low");
  await page.locator(".next-start__quality select").selectOption("auto");
  assert.equal(await page.evaluate(() => localStorage.getItem("hammer-time-quality")), null);
  // The side quest, clicked while the game still loads: the old game opens on the banquet table, and nothing errs.
  await page.goto(url);
  await page.getByRole("link", { name: "Play Hungry Hungry Hammer" }).click();
  await page.waitForURL(/classic=1&quest=hungry/);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(out, "start-hungry.png") });
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log("PASS: the start screen fits all three sizes, starts each place fresh, keeps practice out of the best, and leaves cleanly.");
} finally {
  await browser.close();
}
```

`window.__next.run.events` counts events by type (`counts` in the look); `run.hot` and `run.patience` are on the probe. Before Task 9's switch the side quest's address reaches the old game because `/` without `next` still is the old game. Read every screenshot at full size: the title readable over the key art, the four cards with their pictures, nothing cramped or cut.

- [ ] **Step 11: Everything**

Run: `npm run test:next`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim scripts`, and with `BROWSER_SMOKE_CHANNEL=chrome`: `node scripts/next-start.check.mjs http://127.0.0.1:8090/`, `node scripts/next-browser.check.mjs http://127.0.0.1:8090/`, `node scripts/run-browser.check.mjs http://127.0.0.1:8090/`, `node scripts/start-screen.check.mjs http://127.0.0.1:8090/` (the old game's start screen, still at `/`)
Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add src/sim/game.ts src/render/look.ts src/render/boards.ts src/components/next-start.tsx src/components/next-game.tsx src/components/next-veil.tsx src/components/kiln-hop.tsx src/routes/index.tsx src/styles.css scripts/start-art.mjs scripts/next-start.check.mjs scripts/lobby.check.mjs public/start/key-art.webp public/start/lobby.webp public/start/restaurant.webp public/start/campus.webp public/start/arena.webp
git hash-object src/routeTree.gen.ts
```

Message: "The start screen: where to start, Clock in, the best, the keys, the quality and the side quest, the game loading behind it; pictures rendered by the game". Push. Send the owner the three start screenshots.

---

### Task 8: The whole shift, checked, and the owner's play-test

**Files:**
- Modify: `scripts/shift-browser.check.mjs`, `README.md`, `docs/superpowers/specs/2026-10-13-r3-the-run-design.md` (as built), `art/ART-REQUEST.md`
- Create: `docs/superpowers/handoff-2026-10-14-r4.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the browser check of the whole shift to "Shift over"; the docs.

- [ ] **Step 1: The shift's browser check to the end** (in `scripts/shift-browser.check.mjs`, after the campus's exit)

The campus's exit now leads to the gift shop's card: assert "World 1-4", "The Pink Menace" and "Your shift goes on" on it (at the phone's tall shape, as the check reads the other cards), then play, `dev.pig({ state: "defeated" })`, teleport to 3950, walk right into CLOCK OUT, and wait for "Shift over" with the shift's score and the best; screenshot `shift-over.png`. Run it.
Expected: PASS.

- [ ] **Step 2: Every check**

Run: `npm run test:next`, `npm run test:game`, `npx tsc --noEmit`, `npx eslint src/render src/components src/routes src/sim src/art scripts`; with `BROWSER_SMOKE_CHANNEL=chrome` against `http://127.0.0.1:8090/`: `next-browser`, `run-browser`, `moves-browser`, `acts-browser`, `cast-browser`, `cast-art-browser`, `shift-browser`, `pig-browser`, `next-start`, `start-screen`, `node scripts/look-boards.mjs http://127.0.0.1:8090/`; then `node scripts/with-app-env.mjs vite build`, restart the preview on 8091, `node scripts/browser-smoke.mjs http://127.0.0.1:8091/?next=1 artifacts/smoke-preview.png --baseline artifacts/smoke-dev.json` after the dev run, and the phone start through the throttling relay (`node artifacts/throttle-proxy.mjs 8092 8091 12 60`, `node artifacts/boot-relay-log.mjs`).
Expected: all pass; the phone start fetches about 4 MB before play (the pig's painting loads only with the gift shop).

- [ ] **Step 3: The docs**

- `README.md`, "The rebuild": a section "The gift shop (1-4)" (the arena, the fight's rules, the refill, the chained exit, the bar, the scripted check), "The pig's painting" (its cut, its faces, `node scripts/art-grid.mjs pig`), the lobby's walls in "The walls", and "The start screen" (where to start, practice, `?title=1` until the switch, `node scripts/start-art.mjs` after the art changes).
- The R3 design: "As built in R3b (date)" notes under §5, §6.1 to §6.3 and §7, naming the rulings that changed anything the owner sees.
- `art/ART-REQUEST.md`: the pig's and the walls' status lines (cut and in the game).
- `docs/superpowers/handoff-2026-10-14-r4.md` for R4 (the shape of `handoff-2026-10-13-r3b.md`: repo, read-first list, where things stand, owner decisions, the job, environment, how to work, R3b's rulings, deferred minors).

- [ ] **Step 4: Commit and push**

```bash
git add scripts/shift-browser.check.mjs README.md docs/superpowers/specs/2026-10-13-r3-the-run-design.md art/ART-REQUEST.md docs/superpowers/handoff-2026-10-14-r4.md
```

Message: "The whole shift checked to Shift over, and R3b written up". Push.

- [ ] **Step 5: The final review** (the executing-plans skill's Final Review: the review package from `git merge-base main HEAD` to `HEAD`, one fresh reviewer on the most capable model, this plan's Review Focus verbatim, the ledger's rulings; then the one fix pass, each fix test-first)

- [ ] **Step 6: Stop for the owner's play-test**

Open `http://127.0.0.1:8090/?next=1&title=1` in the browser panel for the owner, and report in product terms with the screenshots: what is new, what to try (the whole shift from the start screen; pig practice; the lobby's walls), every decision taken for them (this plan's list and the ledger's rulings that changed what they see), and what comes next: `/` switching to the new game (Task 9) and the merge, each only on their yes. Each change the owner asks for after playing is its own commit, test-first, before Task 9.

---

### Task 9: The switch (only on the owner's explicit yes)

**Files:**
- Modify: `src/routes/index.tsx`, `scripts/next-browser.check.mjs`, `scripts/start-screen.check.mjs`, `scripts/game-browser-check.mjs`, `scripts/props.check.mjs`, `scripts/quest-browser.check.mjs`, `scripts/pig-boss.check.mjs`, `scripts/surroundings.check.mjs`, `scripts/voice-browser.check.mjs`, `README.md`

**Interfaces:**
- Consumes: Task 7's `title`, `quest` flags and `NextGame`'s `title`.
- Produces: `/` serves the new game on its start screen; `/?next=1` the new game straight into play (unchanged, for the checks); `/?classic=1` the old game.

- [ ] **Step 1: Ask the owner** whether `/` should now open the new game (the old one stays at `/?classic=1` until R4). Go on only on a clear yes.

- [ ] **Step 2: The route** (in `src/routes/index.tsx`)

`Home` (Task 7 added the `classic` flag):

```tsx
function Home() {
  const { next, classic, gl, noart, board, dev, nocast, venue, title, quest } = Route.useSearch();
  // `/` is the new game on its start screen; `?next=1` goes straight into play (the checks); `?classic=1` is the shipped game.
  if (classic) return <KilnHop quest={quest} />;
  return <NextGame forceWebgl={!!gl} noart={!!noart} board={!!board} dev={!!dev} nocast={!!nocast} start={venue} title={!next || !!title} />;
}
```

The comment at `validateSearch` changes to say the old game lives behind `?classic=1` until R4. Then:

Run: `git hash-object src/routeTree.gen.ts`
Expected: `dceedffdc12c32138e81bb63787cac7ae5d97fcd`.

- [ ] **Step 3: The checks follow** 

The old game's checks (`start-screen`, `game-browser-check`, `props`, `quest-browser`, `pig-boss`, `surroundings`, `voice-browser`) go to `?classic=1`: each builds its address from the base it is given, so add the flag where each calls `goto(url)` (`new URL(url)` with `searchParams.set("classic", "1")`), leaving the base argument as it was. `next-browser`'s check that the plain address keeps no search string now checks that plain `/` opens the new game's start screen (`.next-start` visible, `window.__next.run.mode === "title"`) with no search string added. Run every browser check listed in Task 8, Step 2.
Expected: all pass (`game-browser-check` still times out at its idle wait for a reason outside the rebuild, as before; note it, as the handoff does).

- [ ] **Step 4: Commit and push**

```bash
git add src/routes/index.tsx scripts/next-browser.check.mjs scripts/start-screen.check.mjs scripts/game-browser-check.mjs scripts/props.check.mjs scripts/quest-browser.check.mjs scripts/pig-boss.check.mjs scripts/surroundings.check.mjs scripts/voice-browser.check.mjs README.md
git hash-object src/routeTree.gen.ts
```

Message: "`/` opens the new game on its start screen; the shipped game moves to /?classic=1". Push. Build and restart the preview; look at `/`, `/?next=1` and `/?classic=1` on it.

---

## Finish: the merge (only on the owner's explicit yes)

Ask the owner whether to merge `claude/hammer-pass` into `main`. On a clear yes, use superpowers:finishing-a-development-branch (the merge, then push `main` with that yes). Never push `main` otherwise. Update the memory files (`hammer-time-rebuild-status.md`: R3 done, next R4 per its handoff).
