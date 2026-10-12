# R2b-1 The Cast Plays, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The lobby's four roles (bellhop, server, office worker, student) live in the sim with the design's behavior, telegraphed attacks that cost patience pips, knockouts, chain reactions, the lecture's effects, points, lines and recordings; placed in the lobby data; drawn as code-drawn stand-ins on the shared skeleton with every act animated; with effects, sounds, hints, boards and checks; plus R2a's nine deferred minors. R2b-2 paints them.

**Architecture:** The cast is pure sim state (`src/sim/cast.ts`, `cast-behavior.ts`, `missiles.ts`) stepped inside `World.step` after Hammer and the carts, with no rig dependency: the sim needs only colliders, acts and timers. Hits on the cast go through one `strikeNpc` function called from the swing (`hits.ts`), the snot (`snot.ts`), the stomp, the carts and the shield; hits on Hammer go through the existing `world.hits` queue, so the damage rules stay in `damage.ts`. Scoring rides on events with a `points` field that the Game adds. The renderer (`src/render/cast.ts`) solves each cast member's act into a pose on Hammer's skeleton (`src/sim/rig/cast.ts`, pure) and draws an inked stand-in figure from the solved joints; effects, words, speech bubbles and sounds hang off the new events in `look.ts`.

**Tech Stack:** TypeScript, PixiJS 8, React 19, `node:test` through `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-12-r2b-lobby-cast-design.md` (R2b design, all sections; §10 names this half) over `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§2, §5.4, §5.6, §5.7, §7.1, §9, §15). The shipped rules: `src/game/engine.ts` (`stepEnemies`, `stepStudents`, `stepPlanes`, `deliverLecture`, `touchEnemies`, `stun`, `kick`, `shellHits`, `tryHammer`, `hint`), `src/game/lines.ts`, `src/game/taunts.ts`.

## Global Constraints

- "Nothing of the cast covers Hammer's face: the cast, their props and their projectiles always draw behind Hammer; planes, carts and coffee stop at his collider; particles that would reach his face box are dropped (the existing rule); speech bubbles, ! bursts, stars and points go through the face-safe layout." (R2b §8). The head plate is never edited or tinted.
- "The six recordings are the only spoken lines" (spec §2.3): the cast's lines are speech bubbles; Hammer's comebacks are thoughts; `AudioBus.taunt` plays only the five taunts.
- "Only an attack under way costs a patience pip ... Walking into anyone who is not attacking bumps him to a stop with a little push and a line, no pip." (R2b §3.1)
- "Every wind-up lasts at least 0.45 s and shows a ! burst over the attacker's head with a sound; the office worker's march is the one attack without a wind-up, and it is slow and audible." "Two attackers at most." (R2b §4)
- "Knocking out staff does not charge the Super Smash." "When he loses a life, the cast comes back as the run placed it." "The staff stash stays without cast." (R2b §1)
- The numbers of R2b §2 (sizes, speeds, times), §3.3 (points), §3.5 (the chain: `100, 200, 400, 800, 1000, 2000, 4000, 8000`, the eighth a life) and §5 (placement) are the starting values; `src/sim/cast.ts` holds them in one table.
- "Pixi objects cannot be constructed under `node:test`"; every node test touches pure functions only.
- Owner rules: never stage `package-lock.json` or `src/routeTree.gen.ts` (`git hash-object src/routeTree.gen.ts` stays `dceedffd…`; check it after any edit to `src/routes/index.tsx`); commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, named paths only, messages ending with the session's attribution line; push `claude/hammer-pass` after each commit; dev server on 8090, preview on 8091; browser checks with `BROWSER_SMOKE_CHANNEL=chrome`; the owner's files under `art/reference/`, `art/incoming/`, `public/voice/*` and `public/absolute-bullshit.mp3` are never modified.
- Bash heredocs containing apostrophes break in this harness: write files with the Write tool or from the scratchpad.

## Review Focus

1. **A server lands her rush on Hammer in the same step his mallet lands on her**: he loses one pip, she goes down once, and nothing double-counts or deadlocks (the attack ends with her). Pinned in Task 4.
2. **A cart and a sliding bellhop (or two carts) reaching the same staffer in one step**: one knockdown, one chain entry, on whichever got there first in the loop; the second finds him unhittable. Pinned in Task 5.
3. **A plane thrown from the railing at Hammer standing under the balcony**: it dies on the balcony slab or a solid it meets, never passes through one, and never hurts him in grace or mid-tumble. Pinned in Task 6.
4. **The lecture landing on a server mid-rush and a bellhop mid-wind-up**: both freeze where they stand, their attacks end, and the tickets come back so the next attacker can start. Pinned in Task 7.
5. **A lost life or a stash trip mid-fight**: after a respawn every cast member is back at its spawn in idle with no stale ticket, line or missile; after the stash the lobby's cast is exactly as he left it (acts, timers, a downed bellhop still down). Pinned in Task 8.

## Decisions taken for the owner (report these)

1. The cast is stepped as pure sim data; its animation is renderer-only (poses from acts). Nothing in the fight rules depends on the rig.
2. A `?nocast=1` address flag starts a run with no cast; the older browser checks (next, moves, acts, run) use it so they test what they always tested. The new cast check plays the fights.
3. Cast ids start at 1001 so they never collide with cart ids; a swing's `victims` list holds both.
4. The touch pad is not drawn during the start card's 1.6 s (minor 7): the game ignores input then anyway.
5. Carts roll with friction 260 px/s² everywhere (not 900), so a bonked spare cart travels far, into the shaft or into a server. Carts, sliding bellhops and flying bodies faster than 150 px/s bowl; a cart faster than that rolling toward Hammer costs a pip.
6. A stomp bounces him at 900 px/s (1300 with jump held), about half his jump.
7. The office worker's march hits once and then rests 2 s before it can hit again; the server's rush hits once (his grace covers the rest).
8. Stand-in heads use Hammer's 0.26 head scale; builds and heights come from a per-person look table (`src/render/cast.ts` `LOOKS`), the same table R2b-2 keeps for the recolors.
9. Knocked-out cast walk away from Hammer and are gone 1500 px from him; anyone knocked below the level's bounds is gone with OUT OF ORDER and 500 points.
10. New written lines for the new beats live in `src/game/lines.ts` (`CAST_LINES`), beside the shipped tables; `pick` keeps them stable per cast member.

---

## File Structure

- `src/sim/geometry.ts` (create): `sweptHeadHits` (moved from `hits.ts`, which re-exports it), `overlapsRect`, `bodyRect`.
- `src/sim/cast.ts` (create): cast types, the numbers table, `createCast`, `strikeNpc`, `hittable`, `npcRect`, spills, lines.
- `src/sim/cast-behavior.ts` (create): the director's tickets, each role's step, contact with Hammer (hurt, bump, stomp), carts and bodies bowling, puddles, the lecture's effect, the shaft.
- `src/sim/missiles.ts` (create): paper planes and the coffee cup.
- `src/sim/rig/cast.ts` (create): the cast's poses per act (pure), `castGround`.
- `src/sim/events.ts`, `src/sim/types.ts`, `src/sim/world.ts`, `src/sim/hits.ts`, `src/sim/snot.ts`, `src/sim/targets.ts`, `src/sim/level.ts`, `src/sim/levels/lobby.ts`, `src/sim/levels/stash.ts`, `src/sim/game.ts`, `src/sim/crates.ts`, `src/sim/drive.ts`, `src/sim/hero.ts` (modify).
- `src/game/lines.ts` (modify): `CAST_LINES`.
- `src/game/audio.ts` (modify): `sting`, `squeal`, `shatter`, `splash`, `chime`, `paper`.
- `src/render/cast.ts` (create): `LOOKS`, `drawFigure`, the `Cast` view.
- `src/render/cast-fx.ts` (create): flying props (the hat, glasses, the cup), stars.
- `src/render/bubbles.ts` (modify): `Speech`.
- `src/render/props.ts` (modify): missiles drawn; the owner's cart.
- `src/render/particles.ts`, `src/render/sound.ts`, `src/render/interp.ts`, `src/render/hud.ts`, `src/render/look.ts`, `src/render/boards.ts`, `src/render/app.ts` (modify).
- `src/components/next-game.tsx`, `src/routes/index.tsx` (modify).
- Tests: `scripts/cast.check.mjs` (create, added to `test:next` after `scripts/lobby.check.mjs`), `scripts/lobby.check.mjs`, `scripts/render.check.mjs`, `scripts/moves.check.mjs` (modify), `scripts/cast-browser.check.mjs` (create), `scripts/next-browser.check.mjs`, `scripts/moves-browser.check.mjs`, `scripts/acts-browser.check.mjs`, `scripts/run-browser.check.mjs`, `scripts/look-boards.mjs` (modify).
- Docs: `README.md`, the R2b design (§5 as built), `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` §8.3.

Test helpers used throughout `scripts/cast.check.mjs` (write them once at its top):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { createWorld } from "../src/sim/world.ts";
import { createCast, CAST, strikeNpc, hittable, CAST_ID } from "../src/sim/cast.ts";
import { attackers } from "../src/sim/cast-behavior.ts";
import { createCart } from "../src/sim/targets.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = (extra = {}) => ({ floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }], platforms: [], solids: [], passes: [], bounds: { x: -2000, y: -3000, w: 22000, h: 4000 }, ...extra });
/** A level with only what createCast reads: the cast list and, for bellhops, the carts. */
const levelWith = (cast, carts = []) => ({ cast, carts });
/** A world with a cast: `spawns` are CastSpawn records; carts come from `carts` (x values). */
const worldWith = (spawns, hero = { x: 100, y: 0 }, opts = {}, carts = [], stage = flat()) => {
  const targets = carts.map((x, i) => createCart(i + 1, x));
  const w = createWorld(stage, hero, { ...opts, targets });
  w.cast = createCast(levelWith(spawns, carts), targets);
  for (let i = 0; i < 6; i++) w.step(input());
  return w;
};
const steps = (w, seconds, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const press = (w, key, held = {}) => { w.step(input({ ...held, [key]: true }, { [key]: true })); return w.events; };
const until = (w, done, seconds = 10, held = {}) => { const out = []; for (let i = 0; i < Math.round(seconds / STEP) && !done(w); i++) { w.step(input(held)); out.push(...w.events); } return out; };
const of = (evs, type) => evs.filter((e) => e.type === type);
const npc = (w, spawn) => w.cast.find((n) => n.spawn === spawn);
```

---

### Task 1: R2a's deferred minors

**Files:**
- Modify: `src/sim/game.ts`, `src/sim/crates.ts`, `src/sim/level.ts`, `src/sim/levels/lobby.ts`, `src/sim/levels/stash.ts`, `src/render/hud.ts`, `src/render/look.ts`, `src/components/next-game.tsx`, `scripts/lobby.check.mjs`, `scripts/render.check.mjs`

**Interfaces:**
- Produces: `hitCrate(...)` returns `boolean` (true when it acted); `Level.hints?: { early: number }` (the x before which the first hint teaches the snot and the crate); `Game.togglePause()` emits `{ type: "mode" }` into a fresh `game.events`; `rewardAnchors` skips anchors within 150 px of a belt floor's ends.

- [ ] **Step 1: Write the failing tests** (`scripts/lobby.check.mjs`, after the stash test; `scripts/render.check.mjs`, after the hint test)

```js
// lobby.check.mjs
test("a door crossed while crouched leaves him standing-height on the other side", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5);
  play(g);
  Object.assign(g.world.hero, { x: 9700, y: 0 });
  stepsG(g, 0.2, { down: true });
  assert.equal(g.world.hero.h, 200, "crouched at the door");
  g.step(input({ down: true }, { down: false }));
  until(g, (x) => x.level.id === "stash", 2, { down: true });
  assert.equal(g.level.id, "stash");
  assert.equal(g.world.hero.h, 300, "standing in the stash");
});

test("nothing is collected and no clock is punched during the lethal tumble", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5);
  play(g);
  Object.assign(g.world.hero, { x: 2500, y: 0 });
  g.pickups.push({ id: 777, kind: "can", x: 2560, y: -70, taken: false });
  g.world.hero.patience = 1;
  g.world.hit(g.world.hero.x - 100);
  const evs = until(g, (x) => x.mode !== "play", 3);
  assert.equal(g.world.hero.move?.kind === "tumble" || g.mode === "dying", true);
  assert.ok(!g.pickups.find((p) => p.id === 777).taken, "the can stays");
  assert.ok(!g.run.punched.includes("desk"), "the desk clock is not punched while he tumbles past it");
  assert.equal(of(evs, "checkpoint").length, 0);
});

test("a swing during a crate's bump lock is not spent: it lands once the lock ends", () => {
  const level = { ...mini(), crates: [{ id: "k", kind: "case", x: 900, y: -300 }] };
  const [c] = cratesOf(level);
  const o = out();
  assert.equal(hitCrate(c, "bump", ctxOf(), o), true);
  assert.equal(hitCrate(c, "mallet", ctxOf(), o), false, "locked: nothing happened");
  c.lock = 0;
  assert.equal(hitCrate(c, "mallet", ctxOf(), o), true);
});

test("no reward anchor sits on the escalator's lowest steps", () => {
  const esc = LOBBY.floor.find((f) => f.kind === "escalator");
  for (const a of rewardAnchors(LOBBY)) assert.ok(Math.abs(a.x - esc.x1) > 150 && Math.abs(a.x - esc.x0) > 150, `anchor at ${a.x}`);
});

test("dying clears the door he stood at, and a pause sends a mode event", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 5);
  play(g);
  Object.assign(g.world.hero, { x: 9700, y: 0 });
  g.step(input());
  assert.equal(g.door?.id, "staff");
  knockOut(g);
  until(g, (x) => x.mode === "dying", 3);
  assert.equal(g.door, null, "no door glow while dying");
  const h = createGame({ lobby: LOBBY, stash: STASH }, 5);
  play(h);
  h.togglePause();
  assert.deepEqual(h.events, [{ type: "mode", mode: "pause" }]);
  h.togglePause();
  assert.deepEqual(h.events, [{ type: "mode", mode: "play" }]);
});
```

```js
// render.check.mjs
test("the drop hint shows on the balcony, not on the stairs or the landing, and the early hint's edge is level data", () => {
  const g = gameAt(7000, -253);
  assert.equal(hintOf(g), "Up to the mezzanine · keep climbing");
  Object.assign(g.world.hero, { x: 6700, y: -120 });
  assert.equal(hintOf(g), "Up to the mezzanine · keep climbing");
  Object.assign(g.world.hero, { x: 8000, y: -520 });
  assert.equal(hintOf(g), "Up on the mezzanine · ↓ + jump drops you back down");
  Object.assign(g.world.hero, { x: LOBBY.hints.early - 1, y: 0 });
  assert.equal(hintOf(g), "F snot rocket · jump into the ! crate for hot pepper");
});
```

The existing hint test's line `Object.assign(h, { x: 7000, y: -253 }); assert.equal(hintOf(g), "Up to the mezzanine · ↓ + jump drops you back down");` changes to expect `"Up to the mezzanine · keep climbing"`.

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/lobby.check.mjs scripts/render.check.mjs`.

- [ ] **Step 3: Implement**

`src/sim/crates.ts`: `hitCrate` returns `boolean`: `if (c.broken || c.lock > 0) return false;` … the case branch ends `return true;` … `if (c.used) return false;` … the function ends `return true;` (after the pickup push), and the `can` branch `return true;`.

`src/sim/game.ts`:
- `enter()`: after `h.slideT = 0;` add `h.h = HERO_H;` (import `HERO_H` from `./constants`).
- `die()`: add `game.door = null;` before `setMode`.
- `togglePause()`: 
  ```ts
  function togglePause() {
    if (game.mode !== "play" && game.mode !== "pause") return;
    game.events = [];
    setMode(game.mode === "play" ? "pause" : "play", game.events);
  }
  ```
- `strikeCrates`: `if (!swingHit.has(c.id) && near(p, crateRect(c), MALLET_R) && hit(c, "mallet")) swingHit.add(c.id);`.
- `playStep`: wrap the pickups and the checkpoints: `const lethal = h.move?.kind === "tumble";` then `if (!lethal) for (const kind of collectPickups(h, game.pickups, ev)) take(kind, ev);` and `if (!lethal && game.level.id === "lobby") for (const k of ...)`.

`src/sim/level.ts`: `Level` gains `/** The x before which the first hint teaches the snot and the ! crate. */ hints?: { early: number };`. In `rewardAnchors`, inside the floor loop add to `blocked`: `level.floor.some((b) => b.belt && (Math.abs(x - b.x0) < CLEAR.belt || Math.abs(x - b.x1) < CLEAR.belt))` with `CLEAR` gaining `belt: 150`.

`src/sim/levels/lobby.ts`: add `hints: { early: 1500 },`. `stash.ts`: `hints: { early: 0 },`.

`src/render/hud.ts`: delete `MEZZANINE` and `EARLY_X`. In `hintOf`:
```ts
  if (h.x < (game.level.hints?.early ?? 0)) return "F snot rocket · jump into the ! crate for hot pepper";
  const onBalcony = game.level.platforms.some((p) => p.kind === "balcony" && h.x >= p.x0 && h.x <= p.x1 && Math.abs(h.y - p.y) < 2);
  if (onBalcony) return "Up on the mezzanine · ↓ + jump drops you back down";
  const climbing =
    game.level.platforms.some((p) => p.kind === "landing" && h.x >= p.x0 - 40 && h.x <= p.x1 + 40 && h.y <= p.y + 2) ||
    game.level.floor.some((f) => f.kind === "stairs" && h.x >= f.x0 && h.x <= f.x1);
  if (climbing) return "Up to the mezzanine · keep climbing";
```

`src/render/look.ts`:
- `showLevel`: after `snapCamera(x, y)` add `const zone = level.camera.zones.find((z) => x >= z.x0 && x <= z.x1); scene.camera.zoom = zone?.zoom ?? 1;`.
- The door glow line becomes `const door = game.mode === "play" && game.door && (game.door.kind === "stash" || game.door.kind === "return") ? game.door.id : null;`.
- Pausing from the keyboard: replace `game.togglePause();` in `onKey` with `pause();` and add near `forgetPresses`: `const pause = () => { game.togglePause(); for (const e of game.events) feel(e); };`; the returned `togglePause()` calls `pause()` too.

`src/components/next-game.tsx`: the pad renders when `touch && !veiled && mode !== "card" && hud`.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`.

- [ ] **Step 5: Commit** `src/sim src/render/hud.ts src/render/look.ts src/components/next-game.tsx scripts/lobby.check.mjs scripts/render.check.mjs`: "Fix R2a's deferred minors: doors, the lethal tumble, crate locks, the zoom snap, the hints, the pad and pause".

---

### Task 2: The cast in the sim: types, spawns, idle, patrol and the double-take

**Files:**
- Create: `src/sim/geometry.ts`, `src/sim/cast.ts`, `src/sim/cast-behavior.ts`, `scripts/cast.check.mjs`
- Modify: `src/sim/hits.ts`, `src/sim/events.ts`, `src/sim/types.ts`, `src/sim/world.ts`, `src/sim/level.ts`, `src/sim/levels/lobby.ts`, `src/sim/game.ts`, `src/game/lines.ts`, `package.json`

**Interfaces:**
- Produces:

```ts
// src/sim/geometry.ts
export const overlapsRect = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** A body's collider: `x, y` is the feet point, `w` wide and `h` tall above it. */
export const bodyRect = (b: { x: number; y: number; w: number; h: number }): Rect => ({ x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h });
export function sweptHeadHits(a: Point, b: Point, r: number, rect: Rect): boolean; // moved from hits.ts unchanged; hits.ts: `export { sweptHeadHits } from "./geometry";`
```

```ts
// src/sim/level.ts
export type CastPerson = "bellhop-1" | "bellhop-2" | "server-1" | "server-2" | "office-1" | "office-2" | "student-1" | "student-2";
/** Who stands where. `y` is the floor or platform they stand on; `x0, x1` a patrol; `cart` a bellhop's cart (its x in `carts`); `hide` waits behind the screen; `sit` sits on a table; `recolor` a uniform hue (R2b-2). */
export type CastSpawn = { id: string; person: CastPerson; x: number; y: number; facing?: 1 | -1; x0?: number; x1?: number; cart?: number; hide?: boolean; sit?: boolean; recolor?: string };
// Level gains: cast?: CastSpawn[];
```

```ts
// src/sim/cast.ts
export type CastRole = "bellhop" | "server" | "office" | "student";
export type CastAct = "idle" | "walk" | "notice" | "windup" | "attack" | "recover" | "chase" | "return" | "hide" | "bumped" | "fly" | "down" | "getup" | "leave" | "slide" | "slip" | "frozen" | "schooled" | "duck" | "hop" | "flee";
export type CastHitBy = "mallet" | "snot" | "stomp" | "burst" | "shield" | "cart" | "slide" | "body" | "puddle";
export const roleOf = (p: CastPerson): CastRole;
export const CAST = { bellhop: {...}, server: {...}, office: {...}, student: {...} } as const;   // the numbers table below
export const CAST_ID = 1001;
export type Npc = { ... };  // below
export function createCast(level: Pick<Level, "cast" | "carts">, targets: Target[]): Npc[];
export const npcRect = (n: Npc): Rect;
export const setAct = (n: Npc, act: CastAct): void;
export const say = (n: Npc, text: string, events: GameEvent[]): void;
/** Standing acts: on his feet and doing his job (what a lecture freezes and a bump staggers). */
export const standing = (n: Npc): boolean;
/** Can be hit now: alive, not flying, sliding, leaving, fleeing, getting up, slipping or hidden; a downed one only while he will get up again (the bellhop's first hit). */
export const hittable = (n: Npc): boolean;
```

```ts
// src/sim/cast-behavior.ts
export type CastWorld = { stage: Stage; hero: HeroState; cast: Npc[]; targets: Target[]; missiles: Missile[]; puddles: Puddle[]; hits: number[]; swing: Point[]; nextMissile: number; time: number };
export const attackers = (cast: Npc[]): number;
export function stepCast(w: CastWorld, dt: number, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void;
```

```ts
// src/sim/events.ts additions
  | { type: "castNotice"; id: number; x: number; y: number }
  | { type: "castLine"; id: number; text: string; seconds: number }
```

```ts
// src/sim/types.ts: World gains cast and missiles; Snapshot gains cast: Npc[]; missiles: Missile[]
```

`src/game/lines.ts` gains:

```ts
/** The lobby cast's new lines (R2b): speech bubbles, never recordings. */
export const CAST_LINES = {
  bellhop: {
    notice: ["Welcome to the Marriott!", "Let me get that for you, sir.", "Right this way, sir.", "Luggage, sir?"],
    shove: ["Coming through!", "Cart!", "Make way, sir!"],
    bump: ["Sir, check-in is at four.", "Mind the cart, sir."],
    down: ["I'll get my manager.", "That's a resort fee, sir."],
  },
  server: {
    warn: ["Can I start you off with some waters?!", "Order up!", "Be right with you!!"],
    skid: ["Be right with you!", "Still working on that?"],
    bump: ["Behind you!", "Hot plate!"],
    down: ["I'm going on break.", "Is Pepsi okay? No? Okay."],
  },
  office: {
    notice: ["Per my last email...", "Quick sync?", "Let's circle back."],
    march: ["Oh. Were you standing there?"],
    ambush: ["Got a minute?", "Can we take this offline?"],
    frozen: "Per my last em—",
    down: ["I'm putting this in an email.", "Let's circle back."],
    shaft: "Per my last emaaaail",
  },
  student: {
    notice: ["I'm rating your customer service.", "Say hi to the internet.", "This is going in the group chat.", "Sir, this is a hotel."],
    heads: "Heads up!",
    duck: "lol",
    snot: "EW!",
  },
} as const;
```

The numbers table and the record type:

```ts
/** Each role's numbers (the design §2): colliders, how far they notice him, wind-ups, attacks, rests, dazes. World px and seconds. */
export const CAST = {
  bellhop: { w: 100, h: 330, notice: 900, windup: 0.7, windup2: 0.55, shove: 650, walk: 200, rest: 3, daze: 4, hits: 2, hold: 150 },
  server: { w: 90, h: 310, notice: 680, windup: 0.45, rush: 420, rushT: 2, rushPx: 1000, walk: 200, skid: 0.4, rest: 1.5, daze: 2.5, hits: 1 },
  office: { w: 95, h: 320, notice: 500, windup: 0.5, march: 160, chime: 400, leap: 500, leapUp: 600, rest: 2, daze: 2.5, hits: 1 },
  student: { w: 90, h: 310, notice: 1100, windup: 0.65, restMin: 4, restStep: 0.6, melee: 300, hop: 200, hopT: 0.35, duck: 0.5, schooled: 9, flee: 400, planes: 3 },
} as const;
export const TICKETS = 2;
export const CHAIN = [100, 200, 400, 800, 1000, 2000, 4000, 8000] as const;
export const POINTS = { down: 100, slip: 150, schooled: 150, frozen: 50, swat: 50, shield: 200, fled: 100, shaft: 500 } as const;
/** A plain hit's throw, a big one's (the spec's staff knockback), and the bellhop's slide. */
export const KNOCK = { small: { back: 700, up: 650 }, big: { back: 1100, up: 600 }, slide: { speed: 1100, friction: 700 }, bounce: 0.3 } as const;
/** How fast a cart, a sliding bellhop or a flying body must move to bowl or to hurt. */
export const ROLLING = 150;
export const SPILL = { water: { w: 260, life: 8 }, coffee: { w: 150, life: 7 } } as const;
export const T = { notice: 0.6, getup: 0.6, bump: 0.3, bumpGap: 1.5, slip: 0.4, freeze: 1.8, line: 2, leave: 200, gone: 1500 } as const;
export const STOMP = { tolerance: 24, bounce: 900, held: 1300 } as const;
export const CAST_ID = 1001;

export type Npc = {
  id: number;
  spawn: string;
  role: CastRole;
  person: CastPerson;
  recolor: string | null;
  x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean;
  facing: 1 | -1;
  /** His spot, his patrol's ends and the y he lives at. */
  home: number; x0: number; x1: number; level: number;
  act: CastAct;
  /** Seconds in the act. */
  actT: number;
  hits: number;
  /** Knocked out for good: he leaves once he is up. */
  out: boolean;
  /** False once he has walked off or fallen: skipped everywhere, kept for the snapshot's ids. */
  alive: boolean;
  noticed: boolean;
  /** Seconds until his next attack may start. */
  rest: number;
  /** The bellhop's cart (a target id), the hat still on, the tray or cup still held, slimed by snot. */
  cart: number | null; hat: boolean; prop: boolean; slimed: boolean;
  /** Degrees turned while flying or sliding; the way a knock threw him; a slide's chain count. */
  spin: number; dir: 1 | -1; chain: number;
  hide: boolean; sit: boolean;
  /** Seconds since his last bump line; a wall stopped him this step; he bounced once in this flight. */
  bumpT: number; blocked: boolean; bounced: boolean;
  /** A role's own marker: where a rush started, when a student last hopped, whether the coffee is thrown. */
  mark: number;
  /** The phone chime sounded for this approach. */
  cue: boolean;
  /** His index in the cast: stable picks of lines and rests. */
  k: number;
};
```

- [ ] **Step 1: Write the failing tests** (`scripts/cast.check.mjs`, after the helpers)

```js
test("the cast spawns from the level data with the role's size, a bellhop tied to his cart, ids past the carts", () => {
  const w = worldWith(
    [{ id: "b", person: "bellhop-1", x: 1250, y: 0, cart: 1250 }, { id: "s", person: "server-2", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "k", person: "student-1", x: 2000, y: -520, sit: true }],
    { x: -1500, y: 0 }, {}, [1250],
  );
  assert.equal(w.cast.length, 3);
  const b = npc(w, "b");
  assert.deepEqual([b.role, b.w, b.h, b.cart, b.hat, b.act], ["bellhop", 100, 330, 1, true, "idle"]);
  assert.equal(npc(w, "s").x1, 1100);
  assert.ok(npc(w, "k").sit && npc(w, "k").id >= CAST_ID);
  assert.deepEqual(w.snapshot().cast.map((n) => n.spawn), ["b", "s", "k"]);
});

test("a server patrols her stretch at a walk and turns at its ends; a bellhop stands by his cart", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "b", person: "bellhop-1", x: 3000, y: 0, cart: 3000 }], { x: -1500, y: 0 }, {}, [3000]);
  const xs = [];
  for (let i = 0; i < 6; i++) { steps(w, 0.5); xs.push(npc(w, "s").x); }
  assert.ok(xs.every((x) => x >= 700 - 1 && x <= 1100 + 1), `inside the patrol: ${xs}`);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 200, "she walks it");
  assert.ok(Math.abs(npc(w, "s").vx) <= CAST.server.walk + 1e-9);
  assert.equal(npc(w, "b").x, 3000, "the bellhop stays put");
});

test("they notice him once per life: a double-take with a line, facing him; office workers only mutter", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 2000, y: 0 }, { id: "o", person: "office-1", x: 2600, y: 0 }], { x: 1000, y: 0 });
  w.hero.facing = 1;
  const evs = steps(w, 0.5);
  assert.equal(of(evs, "castNotice").length, 0, "too far");
  w.hero.x = 1400;
  const seen = steps(w, 0.3);
  const n = of(seen, "castNotice");
  assert.deepEqual(n.map((e) => e.id), [npc(w, "s").id], "the server noticed, the office worker is still out of range");
  assert.equal(npc(w, "s").facing, -1, "facing him");
  assert.ok(of(seen, "castLine").some((e) => e.id === npc(w, "s").id), "with a line");
  assert.equal(npc(w, "s").act, "notice");
  w.hero.x = 2300;
  const again = steps(w, 0.6);
  assert.equal(of(again, "castNotice").filter((e) => e.id === npc(w, "s").id).length, 0, "once");
  assert.ok(of(again, "castLine").some((e) => e.id === npc(w, "o").id), "the office worker mutters");
  assert.equal(of(again, "castNotice").filter((e) => e.id === npc(w, "o").id).length, 0, "without looking up");
});

test("they never notice him from another floor, except students, who see the whole lobby", () => {
  const stage = flat({ platforms: [{ x0: 1500, x1: 3000, y: -520 }] });
  const w = worldWith([{ id: "s", person: "server-1", x: 2000, y: 0 }, { id: "k", person: "student-2", x: 2200, y: -520 }], { x: 2600, y: -520 }, {}, [], stage);
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "castNotice").map((e) => e.id), [npc(w, "k").id]);
});

test("stepping the cast is deterministic", () => {
  const spawns = [{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }, { id: "k", person: "student-1", x: 2000, y: -520 }];
  const a = worldWith(spawns);
  const b = worldWith(spawns);
  steps(a, 3, { right: true });
  steps(b, 3, { right: true });
  assert.deepEqual(a.snapshot().cast, b.snapshot().cast);
});
```

- [ ] **Step 2: Run, expect FAIL**: `node --loader ./scripts/game-test-loader.mjs --test scripts/cast.check.mjs` (`createCast` not found).

- [ ] **Step 3: Implement**

`package.json`: `test:next` adds `scripts/cast.check.mjs` after `scripts/lobby.check.mjs`.

`src/sim/geometry.ts` as in Interfaces (move `sweptHeadHits` there; `hits.ts` keeps `import { sweptHeadHits } from "./geometry"` for its own use and `export { sweptHeadHits } from "./geometry";`).

`src/sim/types.ts`: `Snapshot` gains `cast: Npc[]; missiles: Missile[]` (type imports from `./cast` and `./missiles`; `missiles.ts` is created in this task with only its types, the rest in Task 6):

```ts
// src/sim/missiles.ts (this task: the type only)
export type MissileKind = "plane" | "coffee";
/** Something thrown at him: `phase` seeds a plane's wobble, `from` is the thrower. */
export type Missile = { id: number; kind: MissileKind; x: number; y: number; vx: number; vy: number; spin: number; life: number; phase: number; from: number };
```

`src/sim/world.ts`: `World` gains `cast: Npc[]; missiles: Missile[]; nextMissile: number;` (created empty); `WorldOptions` gains `cast?: Npc[]`. In `step`: capture `const prevY = h.y;` before `stepHero`, and after `stepTargets(...)` add `stepCast(world, STEP, prevY, input.held.jump, events);`. `snapshot()` adds `cast: world.cast.map((n) => ({ ...n }))`, `missiles: world.missiles.map((m) => ({ ...m }))`.

`src/sim/cast.ts`:

```ts
import { CAST_LINES, STAFF_LINES, pick } from "../game/lines";
import type { GameEvent } from "./events";
import { bodyRect } from "./geometry";
import type { CastPerson, CastSpawn, Level } from "./level";
import type { Rect, Target } from "./types";

// ...the types and tables from Interfaces...

export const roleOf = (p: CastPerson): CastRole => p.slice(0, -2) as CastRole;

export function createCast(level: Pick<Level, "cast" | "carts">, targets: Target[]): Npc[] {
  return (level.cast ?? []).map((s, k) => {
    const role = roleOf(s.person);
    const c = CAST[role];
    const cart = s.cart === undefined ? null : (targets.find((t) => Math.abs(t.x - s.cart!) < 1)?.id ?? null);
    return {
      id: CAST_ID + k, spawn: s.id, role, person: s.person, recolor: s.recolor ?? null,
      x: s.x, y: s.y, w: c.w, h: c.h, vx: 0, vy: 0, onGround: true, facing: s.facing ?? -1,
      home: s.x, x0: s.x0 ?? s.x, x1: s.x1 ?? s.x, level: s.y,
      act: s.hide ? "hide" : "idle", actT: 0, hits: 0, out: false, alive: true, noticed: false,
      rest: role === "student" ? CAST.student.restMin + (k % 4) * CAST.student.restStep : 0,
      cart, hat: role === "bellhop", prop: role !== "bellhop", slimed: false,
      spin: 0, dir: -1, chain: 0, hide: !!s.hide, sit: !!s.sit,
      bumpT: T.bumpGap, blocked: false, bounced: false, mark: 0, cue: false, k,
    };
  });
}

export const npcRect = (n: Npc): Rect => bodyRect(n);
export const setAct = (n: Npc, act: CastAct): void => { n.act = act; n.actT = 0; };
export const say = (n: Npc, text: string, events: GameEvent[]): void => { events.push({ type: "castLine", id: n.id, text, seconds: T.line }); };

const STANDING: ReadonlySet<CastAct> = new Set(["idle", "walk", "notice", "windup", "attack", "recover", "chase", "return", "bumped"]);
export const standing = (n: Npc): boolean => n.alive && STANDING.has(n.act);
const UNHITTABLE: ReadonlySet<CastAct> = new Set(["fly", "slide", "leave", "flee", "getup", "slip", "hide"]);
export const hittable = (n: Npc): boolean => n.alive && !UNHITTABLE.has(n.act) && !(n.out && n.act === "down");

/** The line a cast member opens with when he sees Hammer. */
export function noticeLine(n: Npc): string {
  if (n.role === "bellhop") return pick(CAST_LINES.bellhop.notice, n.k);
  if (n.role === "server") return pick(STAFF_LINES.server, n.k);
  if (n.role === "office") return pick(CAST_LINES.office.notice, n.k);
  return pick(CAST_LINES.student.notice, n.k);
}
```

`src/sim/cast-behavior.ts` (this task: idle, patrol, notice, physics; the rest in Tasks 3 to 7):

```ts
import { GRAVITY_DOWN } from "./constants";
import { CAST, T, noticeLine, say, setAct, type CastAct, type Npc } from "./cast";
import type { GameEvent } from "./events";
import type { Missile } from "./missiles";
import { floorAt, moveBody } from "./physics";
import type { Puddle } from "./snot";
import type { HeroState, Point, Stage, Target } from "./types";

export type CastWorld = { stage: Stage; hero: HeroState; cast: Npc[]; targets: Target[]; missiles: Missile[]; puddles: Puddle[]; hits: number[]; swing: Point[]; nextMissile: number; time: number };

/** Who holds an attack ticket: a wind-up, an attack, or a bellhop chasing the cart he shoved. */
const TICKET_ACTS: ReadonlySet<CastAct> = new Set(["windup", "attack", "chase"]);
export const attackers = (cast: Npc[]): number => cast.filter((n) => n.alive && TICKET_ACTS.has(n.act)).length;

const toward = (n: Npc, h: HeroState): 1 | -1 => (h.x < n.x ? -1 : 1);
const sameLevel = (n: Npc, h: HeroState) => Math.abs(h.y - n.level) < 60;
/** Something to stand on at `x` within a step of `y`: a floor or a platform. */
export function supportAt(stage: Stage, x: number, y: number): boolean {
  const f = floorAt(stage, x, y - 24);
  if (f !== null && Math.abs(f - y) <= 24) return true;
  return stage.platforms.some((p) => x >= p.x0 && x <= p.x1 && Math.abs(p.y - y) <= 24);
}

/** The double-take, once per life, when he comes within the role's range on their floor (students see the whole lobby). */
function notice(n: Npc, w: CastWorld, events: GameEvent[]): boolean {
  const h = w.hero;
  if (n.noticed || (n.act !== "idle" && n.act !== "walk")) return false;
  const c = CAST[n.role];
  if (Math.abs(h.x - n.x) > c.notice || (n.role !== "student" && !sameLevel(n, h))) return false;
  n.noticed = true;
  n.facing = toward(n, h);
  say(n, noticeLine(n), events);
  // The office worker never looks up: a mutter, no double-take.
  if (n.role === "office") return false;
  setAct(n, "notice");
  events.push({ type: "castNotice", id: n.id, x: n.x, y: n.y - n.h });
  return true;
}

/** Walks the patrol between x0 and x1 at `speed`, turning at the ends, at walls and at ledges; stands still with no patrol. */
function patrol(n: Npc, w: CastWorld, speed: number): void {
  if (n.x1 - n.x0 < 1) { n.vx = 0; return; }
  if (n.x <= n.x0 || n.blocked || !supportAt(w.stage, n.x + n.facing * (n.w / 2 + 10), n.y)) n.facing = 1;
  if (n.x >= n.x1) n.facing = -1;
  if (n.x > n.x0 && n.x < n.x1 && (n.blocked || !supportAt(w.stage, n.x + n.facing * (n.w / 2 + 10), n.y))) n.facing = n.facing === 1 ? -1 : 1;
  n.vx = n.facing * speed;
  n.act = "walk";
}

function stepAct(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  switch (n.act) {
    case "notice":
      n.vx = 0;
      if (n.actT >= T.notice) setAct(n, "idle");
      return;
    default:
      break;
  }
  if (notice(n, w, events)) return;
  if (n.role === "server") patrol(n, w, CAST.server.walk);
  else if (n.role === "office") patrol(n, w, CAST.office.march);
  else n.vx = 0;
}

function physics(n: Npc, w: CastWorld, dt: number): void {
  if (!n.onGround) n.vy += GRAVITY_DOWN * dt;
  const vx0 = n.vx;
  moveBody(n, w.stage, dt);
  n.blocked = vx0 !== 0 && n.vx === 0;
}

export function stepCast(w: CastWorld, dt: number, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void {
  void prevHeroY;
  void jumpHeld;
  for (const n of w.cast) {
    if (!n.alive) continue;
    n.actT += dt;
    n.rest = Math.max(0, n.rest - dt);
    n.bumpT += dt;
    stepAct(n, w, dt, events);
    physics(n, w, dt);
  }
}
```

`src/sim/game.ts`: `createGame(levels, seed, opts: { cast?: boolean } = {})`; in `begin()` after `world.targets = ...` add `world.cast = opts.cast === false ? [] : createCast(lobby, world.targets); world.missiles = []; world.nextMissile = 0;`; in `tryDoors` the stash branch saves `cast: world.cast, missiles: world.missiles` in `lobbySave` (extend its type) and sets `world.cast = []; world.missiles = [];` for the stash; the return branch restores both.

`src/sim/levels/lobby.ts`: add the placement (R2b §5):

```ts
  cast: [
    { id: "bellhop-desk", person: "bellhop-1", x: 1400, y: 0, cart: 1250 },
    { id: "server-buffet", person: "server-1", x: 4900, y: 0, x0: 4400, x1: 5200 },
    { id: "office-elevators", person: "office-1", x: 5550, y: 0, x0: 5000, x1: 5850 },
    { id: "bellhop-floor", person: "bellhop-2", x: 8050, y: 0, cart: 7900 },
    { id: "server-staff", person: "server-2", x: 9300, y: 0, x0: 8600, x1: 9600 },
    { id: "student-rail-1", person: "student-1", x: 7950, y: -520 },
    { id: "student-rail-2", person: "student-2", x: 8500, y: -520 },
    { id: "student-rail-3", person: "student-1", x: 9650, y: -520, recolor: "#c9a227" },
    { id: "server-tables", person: "server-1", x: 13100, y: 0, x0: 12900, x1: 13300, recolor: "#7a1f2b" },
    { id: "student-table", person: "student-2", x: 13900, y: -160, sit: true, recolor: "#2a8c8a" },
    { id: "office-screen", person: "office-2", x: 14450, y: 0, hide: true },
  ],
```

and `carts` becomes `[1250, 3650, 7900]` (the first bellhop's cart at the entrance; the spare between the sofas; the floor-route one). The bellhops stand on the far side of their carts from the start: cart 1250, bellhop 1400, both facing left.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next` (the older checks still pass: an empty cast changes nothing); `npx tsc --noEmit`.

- [ ] **Step 5: Commit** `src/sim src/game/lines.ts package.json scripts/cast.check.mjs`: "Put the cast in the sim: spawns, patrols and the double-take".

---

### Task 3: Hits on the cast: the mallet, snot, the stomp, the burst, the shield, puddles; knockouts and leaving

**Files:**
- Modify: `src/sim/cast.ts`, `src/sim/cast-behavior.ts`, `src/sim/hits.ts`, `src/sim/snot.ts`, `src/sim/game.ts`, `src/sim/events.ts`, `scripts/cast.check.mjs`

**Interfaces:**
- Produces:

```ts
// src/sim/cast.ts
export type StrikeWorld = { puddles: Puddle[]; stage: Stage };
/** A hit on a cast member; true when it landed (students duck the mallet and sidestep a stomp). `chain` > 0 is a bowl's count: its points ride the chain event instead. */
export function strikeNpc(n: Npc, by: CastHitBy, dir: 1 | -1, w: StrikeWorld, events: GameEvent[], chain = 0): boolean;
/** A spill on the floor under him: the server's water, the office worker's coffee. */
export function spill(w: StrikeWorld, n: Npc, kind: "water" | "coffee"): void;
// src/sim/snot.ts: Puddle gains kind: "snot" | "water" | "coffee" (stepSnot writes "snot"); stepSnot's world gains cast: Npc[]
// src/sim/hits.ts: swingContact(h, w: { targets: Target[]; cast: Npc[]; missiles: Missile[]; puddles: Puddle[]; stage: Stage }, events)
// src/sim/events.ts additions (type-only imports: CastRole, CastHitBy from ./cast; MissileKind from ./missiles)
  | { type: "castHit"; id: number; role: CastRole; by: CastHitBy; x: number; y: number; dir: 1 | -1; down: boolean; points: number }
  /** He landed on someone from above; `landed` is false when a student sidestepped. */
  | { type: "stomp"; x: number; y: number; landed: boolean }
  | { type: "castFlee"; id: number; x: number; y: number; points: number }
  | { type: "castFell"; id: number; x: number; y: number; points: number }
```

- [ ] **Step 1: Write the failing tests**

```js
test("the mallet knocks a server down in one: she flies, lands, lies dazed, gets up and walks off, and the tray leaves a wet floor", () => {
  for (const facing of [1, -1]) {
    const w = worldWith([{ id: "s", person: "server-1", x: 300 + facing * 230, y: 0 }], { x: 300, y: 0 });
    w.hero.facing = facing;
    press(w, "hammer");
    const evs = steps(w, 0.4);
    const hit = of(evs, "castHit");
    assert.equal(hit.length, 1, `one hit (facing ${facing})`);
    assert.deepEqual([hit[0].by, hit[0].down, hit[0].points, hit[0].dir], ["mallet", true, 100, facing]);
    assert.ok(of(evs, "hit").some((e) => e.by === "mallet" && e.target === npc(w, "s").id), "the bonk event for the feel");
    const s = npc(w, "s");
    assert.ok(s.act === "fly" && s.vx * facing > 0 && !s.prop && s.out, `flying away without her tray: ${s.act}`);
    until(w, () => npc(w, "s").act === "down", 3);
    assert.equal(s.act, "down");
    assert.ok(w.puddles.some((p) => p.kind === "water" && Math.abs(p.x - s.x) < 60), "a wet floor where she landed");
    until(w, () => npc(w, "s").act === "leave", 5);
    assert.ok(s.act === "leave" && s.vx * facing > 0, "leaving, away from him");
    until(w, () => !npc(w, "s").alive, 12);
    assert.equal(s.alive, false, "gone once far away");
  }
});

test("a swing hits each cast member once, never one behind him, and a knocked-out one cannot be hit again", () => {
  const w = worldWith([{ id: "a", person: "office-1", x: 520, y: 0 }, { id: "b", person: "office-2", x: 80, y: 0 }], { x: 300, y: 0 });
  w.hero.facing = 1;
  press(w, "hammer");
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "castHit").map((e) => e.id), [npc(w, "a").id]);
  until(w, () => npc(w, "a").act === "down", 3);
  npc(w, "a").x = 520;
  press(w, "hammer");
  assert.equal(of(steps(w, 0.5), "castHit").length, 0, "down and out: unhittable");
});

test("snot knocks staff down and slimes them; hot snot goes through one; students run off gagging", () => {
  const w = worldWith([{ id: "a", person: "server-1", x: 700, y: 0 }, { id: "b", person: "office-1", x: 1000, y: 0 }, { id: "k", person: "student-1", x: 1300, y: 0 }], { x: 300, y: 0 }, { hot: true });
  w.hero.facing = 1;
  press(w, "fire");
  const evs = steps(w, 1.2);
  const hits = of(evs, "castHit");
  assert.deepEqual(hits.map((e) => [e.id, e.by]), [[npc(w, "a").id, "snot"], [npc(w, "b").id, "snot"]], "through the first, into the second");
  assert.ok(npc(w, "a").slimed && npc(w, "b").slimed);
  const cold = worldWith([{ id: "k", person: "student-1", x: 700, y: 0 }], { x: 300, y: 0 });
  cold.hero.facing = 1;
  press(cold, "fire");
  const fled = steps(cold, 1);
  assert.ok(of(fled, "castFlee").length === 1 && of(fled, "castFlee")[0].points === 100);
  assert.equal(npc(cold, "k").act, "flee");
  assert.equal(cold.snot.length, 0, "the blob is spent on him");
});

test("landing on a staffer from above stomps him and bounces Hammer; a student sidesteps", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 500, y: 0 }], { x: 500, y: -600 });
  w.hero.onGround = false;
  const evs = until(w, (x) => x.hero.vy < 0 || x.hero.onGround, 2);
  const st = of(evs, "stomp");
  assert.equal(st.length, 1);
  assert.ok(st[0].landed && w.hero.vy < -800 && w.hero.vy > -1000, `bounced: ${w.hero.vy}`);
  assert.equal(of(evs, "castHit")[0].by, "stomp");
  const k = worldWith([{ id: "k", person: "student-2", x: 500, y: 0 }], { x: 500, y: -600 });
  k.hero.onGround = false;
  const ke = until(k, (x) => x.hero.onGround, 2);
  assert.equal(of(ke, "castHit").length, 0);
  assert.ok(of(ke, "stomp").some((e) => !e.landed) && npc(k, "k").act === "hop", "sidestepped");
});

test("students duck the mallet", () => {
  const w = worldWith([{ id: "k", person: "student-1", x: 520, y: 0 }], { x: 300, y: 0 });
  w.hero.facing = 1;
  press(w, "hammer");
  const evs = steps(w, 0.5);
  assert.equal(of(evs, "castHit").length, 0);
  assert.ok(of(evs, "castLine").some((e) => e.text === "lol"));
  assert.ok(["duck", "idle"].includes(npc(w, "k").act));
});

test("the super burst and the Buc-ee's shield send everyone they touch flying, students included", () => {
  const w = worldWith([{ id: "a", person: "server-1", x: 500, y: 0 }, { id: "k", person: "student-1", x: 600, y: 0 }, { id: "far", person: "office-1", x: 1500, y: 0 }], { x: 300, y: 0 }, { charge: 10 });
  w.hero.facing = 1;
  press(w, "super");
  const evs = steps(w, 1);
  assert.deepEqual(of(evs, "castHit").map((e) => [e.id, e.by]).sort(), [[npc(w, "a").id, "burst"], [npc(w, "k").id, "burst"]].sort());
  assert.ok(npc(w, "a").act === "fly" && npc(w, "k").act === "fly" && npc(w, "far").act !== "fly");
});

test("a staffer walking into a puddle slips, feet out, and goes down for 150; students do not slip", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 1200, y: 0, x0: 600, x1: 1400 }, { id: "k", person: "student-1", x: 1000, y: 0, x0: 600, x1: 1400 }], { x: -1500, y: 0 });
  w.puddles.push({ x: 1000, y: 0, w: 120, life: 7, max: 7, kind: "snot" });
  const evs = steps(w, 4);
  const slips = of(evs, "castHit").filter((e) => e.by === "puddle");
  assert.deepEqual(slips.map((e) => [e.id, e.points]), [[npc(w, "s").id, 150]]);
  assert.ok(w.puddles[0].life <= 1.2, "the puddle is used up");
});

test("knocked below the level, a cast member is gone: OUT OF ORDER, 500", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 500, y: 0 }], { x: 300, y: 0 });
  const o = npc(w, "o");
  Object.assign(o, { act: "fly", actT: 0, vx: 0, vy: 900, onGround: false, y: 3000 });
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "castFell").map((e) => [e.id, e.points]), [[o.id, 500]]);
  assert.equal(o.alive, false);
});
```

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement**

`src/sim/snot.ts`: `Puddle` gains `kind: "snot" | "water" | "coffee"`; the floor branch pushes `{ ..., kind: "snot" }`. `stepSnot`'s `w` type gains `cast: Npc[]`; after the carts loop:

```ts
    for (const n of w.cast) {
      if (b.life <= 0 || b.hit.includes(n.id) || !hittable(n)) continue;
      if (!sweptHeadHits(a, b, r, npcRect(n))) continue;
      b.hit.push(n.id);
      if (!strikeNpc(n, "snot", b.vx > 0 ? 1 : -1, w, events)) continue;
      events.push({ type: "hit", by: "snot", x: b.x, y: b.y, target: n.id });
      events.push({ type: "splat", x: b.x, y: b.y, floor: false, hot: b.hot });
      if (b.pierce > 0) b.pierce--;
      else b.life = 0;
    }
```

`src/sim/hits.ts`: `swingContact(h, w, events)` where `w: { targets: Target[]; cast: Npc[]; missiles: Missile[]; puddles: Puddle[]; stage: Stage }` (the world); the carts loop uses `w.targets`; after it:

```ts
  for (const n of w.cast) {
    if (m.victims.includes(n.id) || !hittable(n)) continue;
    const r = npcRect(n);
    for (let k = 1; k < path.length; k++)
      if (ahead(path[k]) && sweptHeadHits(path[k - 1], path[k], MALLET_R, r)) {
        m.victims.push(n.id);
        if (strikeNpc(n, "mallet", h.facing, w, events)) events.push({ type: "hit", by: "mallet", x: path[k].x, y: path[k].y, target: n.id });
        break;
      }
  }
```

`world.ts`: `world.swing = swingContact(h, world, events);`.

`src/sim/cast.ts`:

```ts
export type StrikeWorld = { puddles: Puddle[]; stage: Stage };
const BIG: ReadonlySet<CastHitBy> = new Set(["burst", "shield", "cart", "slide", "body"]);

export function spill(w: StrikeWorld, n: Npc, kind: "water" | "coffee"): void {
  const s = SPILL[kind];
  const y = floorAt(w.stage, n.x, n.y - 24) ?? n.y;
  w.puddles.push({ x: n.x, y, w: s.w, life: s.life, max: s.life, kind });
  if (w.puddles.length > SNOT.puddles) w.puddles.shift();
}

function hitEvent(n: Npc, by: CastHitBy, dir: 1 | -1, down: boolean, points: number, events: GameEvent[]) {
  events.push({ type: "castHit", id: n.id, role: n.role, by, x: n.x, y: n.y - n.h / 2, dir, down, points });
}

/** Thrown: off his feet, flying `dir`, turning over. */
export function throwNpc(n: Npc, dir: 1 | -1, big: boolean): void {
  const k = big ? KNOCK.big : KNOCK.small;
  n.dir = dir;
  n.vx = dir * k.back;
  n.vy = -k.up;
  n.onGround = false;
  n.spin = 0;
  n.bounced = false;
  setAct(n, "fly");
}

export function strikeNpc(n: Npc, by: CastHitBy, dir: 1 | -1, w: StrikeWorld, events: GameEvent[], chain = 0): boolean {
  if (!hittable(n)) return false;
  const big = BIG.has(by);
  if (n.role === "student") {
    if (by === "puddle") return false;
    if (by === "mallet" && n.act !== "schooled") { setAct(n, "duck"); say(n, CAST_LINES.student.duck, events); return false; }
    if (by === "stomp") { setAct(n, "hop"); n.dir = dir; n.mark = -1; return false; }
    n.out = true;
    n.prop = false;
    if (by === "snot") {
      n.slimed = true;
      n.facing = dir;
      setAct(n, "flee");
      say(n, CAST_LINES.student.snot, events);
      hitEvent(n, by, dir, true, 0, events);
      events.push({ type: "castFlee", id: n.id, x: n.x, y: n.y - n.h, points: POINTS.fled });
      return true;
    }
    throwNpc(n, dir, big);
    hitEvent(n, by, dir, true, by === "shield" ? POINTS.shield : chain ? 0 : POINTS.down, events);
    return true;
  }
  if (by === "snot") n.slimed = true;
  n.hits++;
  n.prop = false;
  if (n.role === "bellhop") n.hat = false;
  const again = n.role === "bellhop" && n.hits < CAST.bellhop.hits;
  n.out = !again;
  const points = by === "shield" ? POINTS.shield : by === "puddle" ? POINTS.slip : chain ? 0 : POINTS.down;
  if (n.role === "bellhop" && n.act === "down") {
    // The second hit while he is down: along the marble on his back.
    n.dir = dir;
    n.vx = dir * KNOCK.slide.speed;
    n.vy = 0;
    n.chain = 0;
    n.spin = 0;
    setAct(n, "slide");
  } else if (by === "puddle") {
    n.dir = dir;
    n.vx = 0;
    setAct(n, "slip");
  } else throwNpc(n, dir, big);
  hitEvent(n, by, dir, n.out, points, events);
  return true;
}
```

(`cast.ts` imports `floorAt` from `./physics`, `SNOT` and `type Puddle` from `./snot`, `type Stage` from `./types`.)

`src/sim/cast-behavior.ts`: `stepAct` gains the cases (before `default`):

```ts
    case "fly":
      return;
    case "slide": {
      const f = KNOCK.slide.friction * dt;
      n.vx = Math.abs(n.vx) <= f ? 0 : n.vx - Math.sign(n.vx) * f;
      if (n.onGround && n.vx === 0) setAct(n, "down");
      return;
    }
    case "slip":
      n.vx = 0;
      if (n.actT >= T.slip) setAct(n, "down");
      return;
    case "down":
      n.vx = 0;
      if (n.actT >= CAST[n.role === "student" ? "server" : n.role].daze) {
        setAct(n, "getup");
        if (n.out) say(n, downLine(n), events);
      }
      return;
    case "getup":
      n.vx = 0;
      if (n.actT >= T.getup) {
        if (n.out) { n.facing = toward(n, w.hero) === 1 ? -1 : 1; setAct(n, "leave"); }
        else { setAct(n, "idle"); n.rest = CAST.bellhop.rest; }
      }
      return;
    case "leave":
      n.vx = n.facing * T.leave;
      return;
    case "flee":
      n.vx = n.facing * CAST.student.flee;
      return;
    case "duck":
      n.vx = 0;
      if (n.actT >= CAST.student.duck) setAct(n, "idle");
      return;
    case "hop": {
      // A hop back out of his reach, if there is floor there: the first step picks the way.
      if (n.mark < 0) {
        const dir = n.dir;
        n.mark = supportAt(w.stage, n.x + dir * CAST.student.hop, n.y) ? 1 : 0;
        n.vx = n.mark ? (dir * CAST.student.hop) / CAST.student.hopT : 0;
      }
      if (n.actT >= CAST.student.hopT) { n.vx = 0; setAct(n, "idle"); }
      return;
    }
```

with `const downLine = (n: Npc) => n.role === "bellhop" ? pick(CAST_LINES.bellhop.down, n.k) : n.role === "server" ? pick(CAST_LINES.server.down, n.k) : pick(CAST_LINES.office.down, n.k);` and `physics` extended:

```ts
function physics(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  const was = n.onGround;
  if (!n.onGround) n.vy += GRAVITY_DOWN * dt;
  const vx0 = n.vx;
  const vy0 = n.vy;
  moveBody(n, w.stage, dt);
  n.blocked = vx0 !== 0 && n.vx === 0;
  if (n.act === "fly") {
    n.spin += n.dir * 540 * dt;
    if (!was && n.onGround) {
      if (!n.bounced && vy0 > 400) {
        // One bounce, then he stays down.
        n.bounced = true;
        n.onGround = false;
        n.vy = -vy0 * KNOCK.bounce;
        n.vx *= 0.6;
      } else land(n, w, events);
    }
  }
  const b = w.stage.bounds;
  if (n.y > b.y + b.h - FALL_MARGIN) {
    n.alive = false;
    events.push({ type: "castFell", id: n.id, x: n.x, y: n.y, points: POINTS.shaft });
  } else if ((n.act === "leave" || n.act === "flee") && Math.abs(n.x - w.hero.x) > T.gone) n.alive = false;
}

/** Down on the floor after a flight: dazed, with the spill if the tray or the cup came down with him. */
function land(n: Npc, w: CastWorld, events: GameEvent[]): void {
  n.vx = 0;
  n.spin = 0;
  if (n.role === "student") { n.facing = toward(n, w.hero) === 1 ? -1 : 1; setAct(n, "flee"); return; }
  setAct(n, "down");
  if (n.role === "server") spill(w, n, "water");
  else if (n.role === "office") spill(w, n, "coffee");
  void events;
}
```

(`FALL_MARGIN = 200` as in game.ts; export it from `cast.ts` and have `game.ts` import it from there.)

`stepCast` gains, after `stepAct` and before `physics`: the burst and the contact, and after the loop the puddles:

```ts
  const burst = events.find((e) => e.type === "burst");
  ...inside the loop, before stepAct:
    if (burst && Math.hypot(n.x - burst.x, n.y - n.h / 2 - burst.y) <= BURST_R) strikeNpc(n, "burst", toward(n, w.hero) === 1 ? -1 : 1, w, events);
  ...after physics:
    contact(n, w, prevHeroY, jumpHeld, events);
    puddle(n, w, events);
```

```ts
/** Overlapping him: a stomp from above knocks them down and bounces him (students sidestep). The rest (attacks, bumps) comes in Task 4. */
function contact(n: Npc, w: CastWorld, prevHeroY: number, jumpHeld: boolean, events: GameEvent[]): void {
  const h = w.hero;
  if (!hittable(n) || !overlapsRect(bodyRect(h), npcRect(n))) return;
  const dir = toward(n, h) === 1 ? -1 : 1;
  if (h.vy > 0 && prevHeroY <= n.y - n.h + STOMP.tolerance) {
    const landed = strikeNpc(n, "stomp", dir, w, events);
    h.vy = -(jumpHeld ? STOMP.held : STOMP.bounce);
    h.onGround = false;
    events.push({ type: "stomp", x: n.x, y: n.y - n.h, landed });
  }
}

/** Staff on the move over a puddle slip on it; the puddle is used up. */
function puddle(n: Npc, w: CastWorld, events: GameEvent[]): void {
  if (n.role === "student" || !standing(n) || !n.onGround || Math.abs(n.vx) < 4) return;
  const p = w.puddles.find((q) => Math.abs(q.y - n.y) < 3 && n.x + n.w / 2 > q.x - q.w / 2 && n.x - n.w / 2 < q.x + q.w / 2);
  if (!p) return;
  p.life = Math.min(p.life, 1.2);
  strikeNpc(n, "puddle", n.vx > 0 ? 1 : -1, w, events);
}
```

`src/sim/game.ts`: in `playStep` after `ev.push(...world.events)`: `for (const e of world.events) if ("points" in e && e.points) addScore(run, e.points);`. `shieldBowl` adds, after the carts loop: `for (const n of world.cast) { if (!hittable(n) || !overlapsRect(bodyRect(h), npcRect(n))) continue; const dir: 1 | -1 = n.x >= h.x ? 1 : -1; strikeNpc(n, "shield", dir, world, ev); }` and the carts' skip becomes `if (!touching || (Math.abs(t.vx) > SHIELD.flying && (t.x - h.x) * t.vx > 0)) continue;` (a cart already flying away is left alone; one rolling at him is bowled).

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`.

- [ ] **Step 5: Commit** `src/sim scripts/cast.check.mjs`: "Knock the cast down: the mallet, snot, the stomp, the burst, the shield and puddles".

---

### Task 4: The director and contact damage: the server's rush, the office worker's march, the bump

**Files:**
- Modify: `src/sim/cast-behavior.ts`, `src/sim/events.ts`, `scripts/cast.check.mjs`

**Interfaces:**
- Produces: events `{ type: "castWindup"; id: number; role: CastRole; x: number; y: number }`, `{ type: "castAttack"; id: number; role: CastRole; x: number; y: number }`, `{ type: "castBump"; id: number; x: number; y: number }`, `{ type: "castSplash"; x: number; y: number }` (coffee over Hammer), `{ type: "chime"; x: number; y: number }`; `attackers(cast)`; `attacking(n)`.

- [ ] **Step 1: Write the failing tests**

```js
test("a server warns for 0.45 s, then rushes at 420 for up to 2 s or 1000 px, skids, rests, and only the rush hurts", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 900, y: 0, x0: 700, x1: 1100 }], { x: 300, y: 0 });
  const evs = until(w, () => npc(w, "s").act === "windup", 2);
  const s = npc(w, "s");
  assert.equal(s.act, "windup");
  assert.ok(of(evs, "castWindup").some((e) => e.id === s.id && e.role === "server"), "the ! burst");
  assert.ok(of(evs, "castLine").some((e) => e.text.includes("waters") || e.text === "Order up!" || e.text.includes("Be right")));
  assert.equal(w.hits.length, 0, "nothing hurts during the warning");
  const t0 = s.actT;
  until(w, () => npc(w, "s").act === "attack", 1);
  assert.ok(CAST.server.windup - t0 <= 0.46 && s.act === "attack" && Math.abs(s.vx) === CAST.server.rush && s.facing === -1);
  const start = s.x;
  until(w, () => npc(w, "s").act !== "attack", 3);
  assert.equal(s.act, "recover");
  assert.ok(Math.abs(s.x - start) <= CAST.server.rushPx + 20, `no further than 1000: ${Math.abs(s.x - start)}`);
  until(w, () => npc(w, "s").act !== "recover", 3);
  assert.ok(["idle", "walk"].includes(s.act), "back to work");
});

test("a rushing server who reaches him costs one pip; walking into one who is not attacking only bumps her with a line", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 700, y: 0 }], { x: 300, y: 0 });
  const s = npc(w, "s");
  until(w, () => npc(w, "s").act === "attack", 3);
  const evs = until(w, (x) => x.hero.patience < 3, 2);
  assert.equal(w.hero.patience, 2, "one pip");
  assert.ok(of(evs, "hurt").length === 1);
  const calm = worldWith([{ id: "s", person: "server-1", x: 700, y: 0 }], { x: 300, y: 0 });
  calm.cast[0].noticed = true;
  calm.cast[0].rest = 99;
  const bumped = until(calm, (x) => x.hero.x > 650, 3, { right: true, run: true });
  assert.equal(calm.hero.patience, 3, "no pip");
  assert.ok(of(bumped, "castBump").length >= 1 && of(bumped, "castLine").length >= 1, "a nudge and a line");
  assert.ok(["bumped", "idle", "walk"].includes(calm.cast[0].act));
});

test("at most two attack at once: a third waits for a ticket", () => {
  const w = worldWith(
    [{ id: "a", person: "server-1", x: 600, y: 0 }, { id: "b", person: "server-2", x: 650, y: 0 }, { id: "c", person: "server-1", x: 700, y: 0 }],
    { x: 300, y: 0 },
  );
  let most = 0;
  for (let i = 0; i < Math.round(4 / STEP); i++) { w.step(input()); most = Math.max(most, attackers(w.cast)); }
  assert.equal(most, 2);
  assert.ok(w.cast.some((n) => n.act === "windup" || n.act === "attack" || n.rest > 0), "the third got its turn once a ticket came back");
});

test("an office worker marches head-down at 160, chimes at 400 px, hits once on contact and spills coffee, then rests 2 s", () => {
  const w = worldWith([{ id: "o", person: "office-1", x: 1200, y: 0, x0: 600, x1: 1400 }], { x: 300, y: 0 });
  const o = npc(w, "o");
  assert.ok(Math.abs(o.vx) === CAST.office.march);
  const evs = until(w, (x) => x.hero.patience < 3, 8, { right: true });
  assert.ok(of(evs, "chime").length === 1, "one chime on the approach");
  assert.equal(w.hero.patience, 2);
  assert.ok(of(evs, "castSplash").length === 1 && of(evs, "castLine").some((e) => e.text === "Oh. Were you standing there?"));
  assert.ok(o.rest > 1.5 && o.act === "bumped", "he staggers and rests");
  const more = steps(w, 1.6);
  assert.equal(of(more, "hurt").length, 0, "not twice inside his rest and Hammer's grace");
});

test("her rush landing on him in the step his mallet lands on her: one pip, one knockdown, the attack over", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 760, y: 0 }], { x: 300, y: 0 });
  const s = npc(w, "s");
  until(w, () => npc(w, "s").act === "attack", 3);
  w.hero.facing = 1;
  // Swing as she arrives: the strike window opens 0.14 s in, about when she reaches him.
  until(w, () => Math.abs(npc(w, "s").x - w.hero.x) < 320, 2);
  press(w, "hammer");
  const evs = steps(w, 0.6);
  assert.equal(of(evs, "castHit").length, 1);
  assert.ok(w.hero.patience >= 2, `at most one pip: ${w.hero.patience}`);
  assert.ok(["fly", "down"].includes(s.act));
  assert.equal(attackers(w.cast), 0, "the ticket is back");
});
```

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement** (`src/sim/cast-behavior.ts`)

```ts
const ticketFree = (cast: Npc[]) => attackers(cast) < TICKETS;
/** On the attack now: what costs a pip on contact. */
export const attacking = (n: Npc): boolean => n.act === "attack" || (n.role === "office" && n.act === "walk" && n.rest <= 0);
const windup = (n: Npc, w: CastWorld, events: GameEvent[]) => {
  n.facing = toward(n, w.hero);
  n.vx = 0;
  setAct(n, "windup");
  events.push({ type: "castWindup", id: n.id, role: n.role, x: n.x, y: n.y - n.h });
};
const attack = (n: Npc, events: GameEvent[], x = n.x, y = n.y - n.h / 2) => {
  setAct(n, "attack");
  events.push({ type: "castAttack", id: n.id, role: n.role, x, y });
};

function stepServer(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  const c = CAST.server;
  const h = w.hero;
  if (n.act === "windup") {
    n.vx = 0;
    if (n.actT >= c.windup) { attack(n, events); n.mark = n.x; }
    return;
  }
  if (n.act === "attack") {
    n.vx = n.facing * c.rush;
    const ledge = !supportAt(w.stage, n.x + n.facing * (n.w / 2 + 20), n.y);
    if (n.actT >= c.rushT || Math.abs(n.x - n.mark) >= c.rushPx || n.blocked || ledge) {
      setAct(n, "recover");
      say(n, pick(CAST_LINES.server.skid, n.k + n.hits), events);
    }
    return;
  }
  if (n.act === "recover") {
    n.vx = n.actT < c.skid ? n.facing * c.rush * (1 - n.actT / c.skid) : 0;
    if (n.actT >= c.skid + c.rest) setAct(n, "idle");
    return;
  }
  patrol(n, w, c.walk);
  if (!n.noticed || n.rest > 0 || !sameLevel(n, h) || Math.abs(h.x - n.x) > c.notice || !ticketFree(w.cast)) return;
  windup(n, w, events);
  say(n, pick(CAST_LINES.server.warn, n.k + n.hits), events);
}

function stepOffice(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  const c = CAST.office;
  const h = w.hero;
  patrol(n, w, c.march);
  // The phone chimes once each time he closes in: the march's only warning.
  const near = sameLevel(n, h) && Math.abs(h.x - n.x) < c.chime;
  if (near && !n.cue) { n.cue = true; events.push({ type: "chime", x: n.x, y: n.y - n.h }); }
  if (!near && Math.abs(h.x - n.x) > c.chime * 2) n.cue = false;
}
```

`stepAct`'s tail becomes:

```ts
  if (notice(n, w, events) && n.role !== "office") return;
  if (n.role === "server") stepServer(n, w, dt, events);
  else if (n.role === "office") stepOffice(n, w, dt, events);
  else n.vx = 0;
```

(with the `notice` call removed from `stepServer`/`stepOffice` where it duplicates; keep one call per step: put it only in `stepAct` and drop it from the role steps.) `stepAct` also handles `"bumped"`: `n.vx = n.dir * 300; if (n.actT >= T.bump) { n.vx = 0; setAct(n, "idle"); } return;`.

`contact` gains, after the stomp branch (which `return`s):

```ts
  if (attacking(n)) {
    w.hits.push(n.x);
    if (n.role === "office") {
      events.push({ type: "castSplash", x: h.x, y: h.y - h.h * 0.6 });
      say(n, CAST_LINES.office.march[0], events);
      n.rest = CAST.office.rest;
      n.dir = dir;
      setAct(n, "bumped");
    }
    return;
  }
  if (n.role !== "student" && standing(n) && n.bumpT >= T.bumpGap) {
    n.bumpT = 0;
    n.dir = dir;
    setAct(n, "bumped");
    events.push({ type: "castBump", id: n.id, x: n.x, y: n.y - n.h });
    say(n, n.role === "bellhop" ? pick(CAST_LINES.bellhop.bump, n.k) : n.role === "server" ? pick(CAST_LINES.server.bump, n.k) : pick(CAST_LINES.office.notice, n.k + 1), events);
  }
```

(`dir` in `contact` is the way a knock would throw him, away from Hammer; a bump staggers him the same way.)

- [ ] **Step 4: Run, expect PASS**; tune `windup`/`rush` numbers only if a test shows a rule broken, never to make a test pass by itself.

- [ ] **Step 5: Commit** `src/sim scripts/cast.check.mjs`: "Give the server her rush and the office worker his march, with tickets and the bump".

---

### Task 5: Carts as weapons: the bellhop's shove, runaway carts, the bonk back, the slide and the chain

**Files:**
- Modify: `src/sim/targets.ts`, `src/sim/cast-behavior.ts`, `src/sim/events.ts`, `src/sim/game.ts`, `scripts/cast.check.mjs`, `scripts/moves.check.mjs`

**Interfaces:**
- Produces: `CART.friction = 260`; `Target` gains `chain: number; owner: number | null` (`createCart` sets `chain: 0, owner: null`; `knock` resets `chain = 0`); event `{ type: "chain"; x: number; y: number; count: number; points: number; oneUp: boolean }`; the Game adds a life on `oneUp`.

- [ ] **Step 1: Write the failing tests**

```js
test("a bellhop grips his cart, winds up 0.7 s, shoves it at 650 toward him, follows it, and wheels it home", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1400, y: 0, cart: 1250 }], { x: 600, y: 0 }, {}, [1250]);
  w.hero.invuln = 99;
  const b = npc(w, "b");
  const cart = w.targets[0];
  const evs = until(w, () => npc(w, "b").act === "windup", 3);
  assert.ok(of(evs, "castNotice").length === 1 && b.act === "windup", "the double-take, then the wind-up");
  assert.ok(Math.abs(cart.x - (b.x - CAST.bellhop.hold)) < 2, "the cart in his hands, on Hammer's side");
  const t0 = w.time;
  const shoved = until(w, () => npc(w, "b").act === "chase", 2);
  assert.ok(w.time - t0 >= CAST.bellhop.windup - 2 * STEP && of(shoved, "castAttack").length === 1);
  assert.equal(cart.vx, -CAST.bellhop.shove);
  assert.equal(cart.owner, b.id);
  until(w, () => Math.abs(w.targets[0].vx) < 10, 6);
  assert.ok(cart.x < 1250 - 600, `it rolled a long way: ${cart.x}`);
  until(w, () => npc(w, "b").act === "return", 6);
  assert.equal(b.act, "return");
  until(w, () => npc(w, "b").act === "idle", 10);
  assert.ok(Math.abs(b.x - 1400) < 10 && Math.abs(cart.x - (b.x - CAST.bellhop.hold)) < 2, "home with the cart");
  assert.ok(b.rest > 0, "a rest before the next shove");
});

test("a cart rolling at him costs a pip; one rolling away or standing still does not", () => {
  const w = worldWith([], { x: 300, y: 0 }, {}, [700]);
  w.targets[0].vx = -650;
  const evs = until(w, (x) => x.hero.patience < 3, 2);
  assert.equal(w.hero.patience, 2);
  assert.equal(of(evs, "hurt").length, 1);
  const still = worldWith([], { x: 300, y: 0 }, {}, [320]);
  steps(still, 0.5);
  assert.equal(still.hero.patience, 3, "standing in a parked cart is harmless");
});

test("a bonked cart reverses and bowls over the bellhop behind it, for the chain's first 100", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 1400, y: 0, cart: 1250 }], { x: 300, y: 0 }, {}, [1250]);
  const b = npc(w, "b");
  b.noticed = true;
  b.rest = 99;
  w.hero.x = 1020;
  w.hero.facing = 1;
  press(w, "hammer");
  const evs = steps(w, 1.5);
  assert.ok(of(evs, "hit").some((e) => e.by === "mallet" && e.target === 1), "the cart is bonked");
  const hits = of(evs, "castHit");
  assert.deepEqual(hits.map((e) => [e.id, e.by]), [[b.id, "cart"]]);
  assert.deepEqual(of(evs, "chain").map((e) => [e.count, e.points, e.oneUp]), [[1, 100, false]]);
  assert.ok(b.hat === false && b.hits === 1 && !b.out, "hat off, down but not out");
});

test("a bellhop takes two: dazed four seconds and up again after the first; sliding along the floor after the second, bowling what he meets", () => {
  const w = worldWith([{ id: "b", person: "bellhop-1", x: 530, y: 0 }, { id: "o", person: "office-1", x: 1300, y: 0 }], { x: 300, y: 0 });
  const b = npc(w, "b");
  w.hero.facing = 1;
  press(w, "hammer");
  steps(w, 0.5);
  assert.ok(b.act === "fly" && b.hits === 1 && !b.out);
  until(w, () => npc(w, "b").act === "down", 3);
  const t0 = w.time;
  until(w, () => npc(w, "b").act === "getup", 6);
  assert.ok(w.time - t0 >= CAST.bellhop.daze - STEP, "dazed the full four seconds");
  until(w, () => npc(w, "b").act === "idle", 2);
  assert.ok(b.act === "idle" && hittable(b), "up and back in the fight");
  // Down again, then hit while down: the slide.
  b.x = 530;
  press(w, "hammer");
  until(w, () => npc(w, "b").act === "down", 3);
  b.x = 530;
  press(w, "hammer");
  const evs = steps(w, 2.5);
  assert.ok(of(evs, "castHit").some((e) => e.id === b.id) && b.out, "out after the second");
  const bowled = of(evs, "castHit").find((e) => e.id === npc(w, "o").id);
  assert.ok(bowled && bowled.by === "slide", "the office worker in his path went down");
  assert.ok(of(evs, "chain").some((e) => e.count === 1 && e.points === 100));
});

test("a chain climbs 100, 200, 400 ... and the eighth is a life; two things reaching one staffer in a step count once", () => {
  const spawns = Array.from({ length: 8 }, (_, i) => ({ id: `o${i}`, person: "office-1", x: 900 + i * 120, y: 0 }));
  const w = worldWith(spawns, { x: 300, y: 0 }, {}, [700]);
  w.targets[0].vx = 1100;
  const evs = steps(w, 3);
  const chain = of(evs, "chain");
  assert.deepEqual(chain.map((e) => e.points), [100, 200, 400, 800, 1000, 2000, 4000, 8000]);
  assert.ok(chain[7].oneUp && !chain[6].oneUp);
  const twice = worldWith([{ id: "o", person: "office-1", x: 900, y: 0 }], { x: 300, y: 0 }, {}, [700, 1100]);
  twice.targets[0].vx = 1100;
  twice.targets[1].vx = -1100;
  const both = steps(twice, 1);
  assert.equal(of(both, "castHit").length, 1, "one knockdown");
  assert.equal(of(both, "chain").length, 1, "one chain entry");
});
```

`scripts/moves.check.mjs`: "a knocked cart rolls to a stop on the floor" steps 4 s; with the lower friction change `steps(w, 4)` to `steps(w, 6)` and keep `assert.ok(cart.x > 300)`.

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement**

`src/sim/targets.ts`: `CART.friction` becomes `260` (comment: "a shoved cart rolls far: a runaway, not a bump"); `Target` (in `types.ts`) gains `chain: number; owner: number | null;`; `createCart` sets both; `knock` sets `t.chain = 0`.

`src/sim/cast-behavior.ts`:

```ts
function stepBellhop(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  const c = CAST.bellhop;
  const h = w.hero;
  const cart = w.targets.find((t) => t.id === n.cart);
  if (n.act === "windup") {
    n.vx = 0;
    if (cart) { cart.x = n.x + n.facing * c.hold; cart.vx = 0; }
    if (n.actT >= (n.hits ? c.windup2 : c.windup)) {
      if (cart) { cart.vx = n.facing * c.shove; cart.vy = 0; cart.onGround = true; cart.chain = 0; cart.owner = n.id; }
      attack(n, events, cart?.x, cart ? cart.y - cart.h / 2 : undefined);
      setAct(n, "chase");
      say(n, pick(CAST_LINES.bellhop.shove, n.k + n.hits), events);
    }
    return;
  }
  if (n.act === "chase") {
    if (!cart) { setAct(n, "idle"); return; }
    const stopped = cart.onGround && Math.abs(cart.vx) < 10;
    const want = cart.x - n.facing * c.hold;
    const dx = want - n.x;
    n.vx = Math.abs(dx) < 8 ? 0 : Math.sign(dx) * c.walk;
    if (stopped && Math.abs(dx) < 8) setAct(n, "return");
    return;
  }
  if (n.act === "return") {
    const dx = n.home - n.x;
    if (Math.abs(dx) < 8) {
      n.vx = 0;
      n.facing = toward(n, h);
      if (cart) { cart.x = n.x + n.facing * c.hold; cart.vx = 0; }
      setAct(n, "idle");
      n.rest = c.rest;
      return;
    }
    n.facing = dx > 0 ? 1 : -1;
    n.vx = n.facing * c.walk;
    if (cart) { cart.x = n.x + n.facing * c.hold; cart.vx = 0; cart.vy = 0; cart.y = n.y; cart.onGround = true; }
    return;
  }
  n.vx = 0;
  if (!cart) return;
  // A cart out of his hands (bonked away, or he was staggered chasing it) is fetched first.
  if (Math.abs(cart.x - n.x) > c.hold + 40) { setAct(n, "chase"); return; }
  if (!n.noticed || n.rest > 0 || !sameLevel(n, h) || Math.abs(h.x - n.x) > c.notice || !ticketFree(w.cast)) return;
  // The cart goes between him and Hammer before the shove.
  n.facing = toward(n, h);
  cart.x = n.x + n.facing * c.hold;
  windup(n, w, events);
}
```

`stepAct`'s tail adds `else if (n.role === "bellhop") stepBellhop(n, w, dt, events);`.

After the loop in `stepCast`, the bowling:

```ts
  bowl(w, events);
```

```ts
const chainEvent = (events: GameEvent[], n: Npc, count: number) => {
  const points = CHAIN[Math.min(count, CHAIN.length) - 1];
  events.push({ type: "chain", x: n.x, y: n.y - n.h, count, points, oneUp: count >= CHAIN.length });
};

/** Runaway carts, sliding bellhops and flying bodies bowl over the staff in their way (the chain) and a cart rolling at him costs a pip. */
function bowl(w: CastWorld, events: GameEvent[]): void {
  const h = w.hero;
  const mover = (x: number, vx: number, rect: Rect, holder: { chain: number }, by: "cart" | "slide" | "body", self: Npc | null) => {
    const dir: 1 | -1 = vx > 0 ? 1 : -1;
    for (const n of w.cast) {
      if (n === self || !hittable(n) || (n.x - x) * dir <= 0 || !overlapsRect(rect, npcRect(n))) continue;
      if (!strikeNpc(n, by, dir, w, events, holder.chain + 1)) continue;
      holder.chain++;
      chainEvent(events, n, holder.chain);
      if (holder.chain >= CHAIN.length) holder.chain = 0;
    }
  };
  for (const t of w.targets) {
    if (Math.abs(t.vx) < ROLLING) continue;
    const r = bodyRect(t);
    mover(t.x, t.vx, r, t, "cart", null);
    if ((h.x - t.x) * Math.sign(t.vx) > 0 && overlapsRect(r, bodyRect(h))) w.hits.push(t.x);
  }
  for (const s of w.cast) {
    if (!s.alive || Math.abs(s.vx) < ROLLING) continue;
    if (s.act === "slide") mover(s.x, s.vx, npcRect(s), s, "slide", s);
    else if (s.act === "fly") mover(s.x, s.vx, npcRect(s), s, "body", s);
  }
}
```

A thrown body carries the chain on: in `strikeNpc`, after `throwNpc(n, dir, big)`, set `n.chain = chain;` so a staffer bowled as the third of a cart's chain bowls the next one as its fourth, and the count climbs through the row whoever gets there first (`throwNpc` zeroes it for plain hits).

`src/sim/game.ts` `playStep`: in the points loop add `if (e.type === "chain" && e.oneUp) { run.lives++; ev.push({ type: "oneUp" }); }`.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`.

- [ ] **Step 5: Commit** `src/sim scripts/cast.check.mjs scripts/moves.check.mjs`: "Arm the bellhop: the shove, runaway carts, the bonk back, his slide and the chain".

---

### Task 6: Missiles: paper planes with a glide, the projector ambush's coffee, the swat

**Files:**
- Modify: `src/sim/missiles.ts`, `src/sim/cast-behavior.ts`, `src/sim/hits.ts`, `src/sim/world.ts`, `src/sim/events.ts`, `scripts/cast.check.mjs`

**Interfaces:**
- Produces:

```ts
// src/sim/missiles.ts
export const PLANE = { speed: 520, gravity: 900, lift: 900 / (520 * 520), drag: 0.35, life: 2.4, r: 22, wobble: 40, aimUp: -150, aimDown: 250, hand: 0.75 } as const;
export const COFFEE = { speed: 700, up: -420, gravity: 2200, life: 1.5, r: 16, hand: 0.55 } as const;
export function launchPlane(id: number, from: Npc, target: Point): Missile;
export function launchCoffee(id: number, from: Npc, target: Point): Missile;
export type MissileWorld = { stage: Stage; hero: HeroState; missiles: Missile[]; hits: number[]; puddles: Puddle[] };
/** Flight, the floor and the walls, and him: a hit costs a pip unless he is in grace or down, when it passes through. */
export function stepMissiles(w: MissileWorld, dt: number, events: GameEvent[]): void;
// events
  | { type: "missile"; kind: MissileKind; x: number; y: number }
  /** A missile landed on the floor (`floor`), a wall, or him (`hero`). */
  | { type: "missileHit"; kind: MissileKind; x: number; y: number; floor: boolean; hero: boolean }
  | { type: "swat"; kind: MissileKind; x: number; y: number; points: number }
```

- [ ] **Step 1: Write the failing tests**

```js
import { launchPlane, stepMissiles, PLANE } from "../src/sim/missiles.ts";

test("a student folds a plane for 0.65 s, throws it toward him, rests 4 to 5.8 s, and never has more than three in the air", () => {
  const stage = flat({ platforms: [{ x0: 1500, x1: 3000, y: -520 }] });
  const w = worldWith([{ id: "k", person: "student-1", x: 2000, y: -520 }], { x: 1000, y: 0 }, {}, [], stage);
  const k = npc(w, "k");
  const evs = until(w, () => npc(w, "k").act === "windup", 8);
  assert.equal(k.act, "windup");
  assert.ok(of(evs, "castWindup").some((e) => e.role === "student") && of(evs, "castLine").some((e) => e.text === "Heads up!"));
  const t0 = w.time;
  const thrown = until(w, (x) => x.missiles.length > 0, 2);
  assert.ok(w.time - t0 >= CAST.student.windup - 2 * STEP && of(thrown, "missile").length === 1);
  const p = w.missiles[0];
  assert.ok(p.kind === "plane" && p.vx < 0 && Math.abs(p.vx) === PLANE.speed, "toward him at launch speed");
  assert.ok(k.rest >= CAST.student.restMin && k.rest <= CAST.student.restMin + 3 * CAST.student.restStep + 1e-9);
  const three = worldWith(
    [0, 1, 2, 3, 4].map((i) => ({ id: `k${i}`, person: "student-2", x: 2000 + i * 100, y: -520 })),
    { x: 1000, y: 0 }, {}, [], stage,
  );
  let most = 0;
  for (let i = 0; i < Math.round(12 / STEP); i++) { three.step(input()); most = Math.max(most, three.missiles.length); }
  assert.ok(most <= CAST.student.planes && most >= 2, `at most three planes up: ${most}`);
});

test("a plane glides on a deterministic path: level at first, dipping as it slows, and it dies on the floor", () => {
  const from = { id: 1001, x: 2000, y: -520, h: 310, facing: -1 };
  const a = launchPlane(1, from, { x: 1000, y: -150 });
  const b = launchPlane(1, from, { x: 1000, y: -150 });
  assert.deepEqual(a, b);
  const w = { stage: flat(), hero: { x: -1000, y: 0, w: 110, h: 300, invuln: 0, move: null }, missiles: [a], hits: [], puddles: [] };
  const ys = [];
  for (let i = 0; i < Math.round(2.4 / STEP) && w.missiles.length; i++) { stepMissiles(w, STEP, []); ys.push(a.y); }
  assert.ok(ys[12] - ys[0] < 40, "nearly level over the first tenth of a second");
  assert.ok(ys[ys.length - 1] > ys[0] + 300, `it came down: ${ys[0]} to ${ys[ys.length - 1]}`);
  assert.ok(a.x < 1600, "it travelled");
  const floorWorld = { ...w, missiles: [launchPlane(2, { ...from, y: 0 }, { x: 1000, y: 300 })] };
  const evs = [];
  for (let i = 0; i < 240 && floorWorld.missiles.length; i++) stepMissiles(floorWorld, STEP, evs);
  assert.ok(evs.some((e) => e.type === "missileHit" && e.floor), "down on the floor, gone");
});

test("a plane costs a pip when it reaches him, passes through him in grace, and stops at a balcony slab or a wall", () => {
  const w = worldWith([], { x: 1000, y: 0 });
  w.missiles.push(launchPlane(1, { id: 1001, x: 1500, y: -100, h: 310, facing: -1 }, { x: 1000, y: -150 }));
  const evs = until(w, (x) => x.missiles.length === 0, 3);
  assert.equal(w.hero.patience, 2);
  assert.ok(of(evs, "missileHit").some((e) => e.hero));
  const grace = worldWith([], { x: 1000, y: 0 });
  grace.hero.invuln = 3;
  grace.missiles.push(launchPlane(1, { id: 1001, x: 1500, y: -100, h: 310, facing: -1 }, { x: 1000, y: -150 }));
  steps(grace, 0.6);
  assert.equal(grace.hero.patience, 3);
  assert.ok(grace.missiles[0].x < 1000 - 60, "it flew on past him");
  const walled = worldWith([], { x: -1000, y: 0 }, {}, [], flat({ solids: [{ x: 1200, y: -600, w: 100, h: 600 }] }));
  walled.missiles.push(launchPlane(1, { id: 1001, x: 1500, y: -100, h: 310, facing: -1 }, { x: 800, y: -150 }));
  const hit = until(walled, (x) => x.missiles.length === 0, 2);
  assert.ok(of(hit, "missileHit").some((e) => !e.floor && !e.hero) && walled.missiles.length === 0, "stopped by the wall");
});

test("the mallet swats a plane into confetti for 50", () => {
  const w = worldWith([], { x: 1000, y: 0 });
  w.hero.facing = 1;
  w.missiles.push({ id: 1, kind: "plane", x: 1230, y: -220, vx: -60, vy: 0, spin: 0, life: 3, phase: 0, from: 1001 });
  press(w, "hammer");
  const evs = steps(w, 0.5);
  assert.deepEqual(of(evs, "swat").map((e) => [e.kind, e.points]), [["plane", 50]]);
  assert.equal(w.missiles.length, 0);
  assert.equal(w.hero.patience, 3);
});

test("the office worker behind the screen rears back for half a second, leaps out and flings his coffee, which leaves a puddle", () => {
  const w = worldWith([{ id: "o", person: "office-2", x: 1400, y: 0, hide: true }], { x: 300, y: 0 });
  const o = npc(w, "o");
  assert.equal(o.act, "hide");
  steps(w, 0.5);
  assert.equal(o.act, "hide", "out of range, still hiding");
  w.hero.x = 1000;
  const evs = until(w, () => npc(w, "o").act === "windup", 1);
  assert.ok(of(evs, "castWindup").length === 1 && of(evs, "castLine").some((e) => e.text === "Got a minute?" || e.text === "Can we take this offline?"));
  const leapt = until(w, (x) => x.missiles.length > 0, 2);
  assert.ok(of(leapt, "castAttack").length === 1 && w.missiles[0].kind === "coffee" && w.missiles[0].vx < 0);
  assert.ok(!o.prop, "the cup left his hand");
  until(w, (x) => x.missiles.length === 0, 3);
  assert.ok(w.puddles.some((p) => p.kind === "coffee"), "coffee on the floor");
  until(w, () => npc(w, "o").act === "walk", 2);
  assert.equal(o.act, "walk", "then he marches like the other one");
});
```

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement**

`src/sim/missiles.ts`:

```ts
import { bodyRect, overlapsRect, sweptHeadHits } from "./geometry";
import type { GameEvent } from "./events";
import type { Npc } from "./cast";
import { floorAt } from "./physics";
import { SNOT, type Puddle } from "./snot";
import { SPILL } from "./cast";
import type { HeroState, Point, Stage } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
type Thrower = Pick<Npc, "id" | "x" | "y" | "h" | "facing">;

/** From the hand, aimed where he is now: a plane dips toward a target below and climbs a little to one above. */
export function launchPlane(id: number, from: Thrower, target: Point): Missile {
  const y = from.y - from.h * PLANE.hand;
  const dx = target.x - from.x;
  const dir = Math.sign(dx) || from.facing;
  const vy = clamp((PLANE.speed * (target.y - y)) / Math.max(200, Math.abs(dx)), PLANE.aimUp, PLANE.aimDown);
  return { id, kind: "plane", x: from.x + dir * 40, y, vx: dir * PLANE.speed, vy, spin: 0, life: PLANE.life, phase: id * 1.3, from: from.id };
}

export function launchCoffee(id: number, from: Thrower, target: Point): Missile {
  const dir = Math.sign(target.x - from.x) || from.facing;
  return { id, kind: "coffee", x: from.x + dir * 40, y: from.y - from.h * COFFEE.hand, vx: dir * COFFEE.speed, vy: COFFEE.up, spin: 0, life: COFFEE.life, phase: 0, from: from.id };
}

export function stepMissiles(w: MissileWorld, dt: number, events: GameEvent[]): void {
  const h = w.hero;
  const heroRect = bodyRect(h);
  const open = h.invuln <= 0 && h.move?.kind !== "tumble";
  for (const m of w.missiles) {
    const a = { x: m.x, y: m.y };
    if (m.kind === "plane") {
      // Lift holds it up while it is fast; drag bleeds the speed, so it dips as it goes.
      m.vy += (PLANE.gravity - PLANE.lift * m.vx * m.vx) * dt;
      m.vx *= Math.max(0, 1 - PLANE.drag * dt);
      m.phase += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt + Math.sin(m.phase * 9) * PLANE.wobble * dt;
      m.spin = Math.atan2(m.vy, m.vx);
    } else {
      m.vy += COFFEE.gravity * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.spin += 9 * dt;
    }
    m.life -= dt;
    const r = m.kind === "plane" ? PLANE.r : COFFEE.r;
    const b = w.stage.bounds;
    if (m.x < b.x || m.x > b.x + b.w || m.y > b.y + b.h) { m.life = 0; continue; }
    if (open && sweptHeadHits(a, m, r, heroRect)) {
      m.life = 0;
      w.hits.push(m.x);
      events.push({ type: "missileHit", kind: m.kind, x: m.x, y: m.y, floor: false, hero: true });
      if (m.kind === "coffee") puddleAt(w, h.x, h.y);
      continue;
    }
    const floor = floorAt(w.stage, m.x, a.y);
    const onFloor = floor !== null && m.y >= floor;
    const plat = w.stage.platforms.find((p) => m.x >= p.x0 && m.x <= p.x1 && a.y <= p.y && m.y >= p.y);
    const wall = [...w.stage.solids, ...w.stage.passes].find((s) => overlapsRect({ x: m.x - r, y: m.y - r, w: 2 * r, h: 2 * r }, s));
    if (onFloor || plat || wall) {
      m.life = 0;
      const y = onFloor ? floor! : plat ? plat.y : m.y;
      events.push({ type: "missileHit", kind: m.kind, x: m.x, y, floor: onFloor || !!plat, hero: false });
      if (m.kind === "coffee" && (onFloor || plat)) puddleAt(w, m.x, y);
    }
  }
  w.missiles = w.missiles.filter((m) => m.life > 0);
}

function puddleAt(w: MissileWorld, x: number, y: number) {
  const s = SPILL.coffee;
  w.puddles.push({ x, y, w: s.w, life: s.life, max: s.life, kind: "coffee" });
  if (w.puddles.length > SNOT.puddles) w.puddles.shift();
}
```

(`world.ts` calls `stepMissiles(world, STEP, events)` right before `stepCast`. Balcony slabs: the `platforms` check above makes a plane landing on the balcony from above die there; one flying up into it from below passes, as the platform is one-way.)

`src/sim/hits.ts` `swingContact`: after the cast loop, the swat:

```ts
  for (const m of w.missiles) {
    if (m.life <= 0) continue;
    const r = m.kind === "plane" ? PLANE.r : COFFEE.r;
    const box = { x: m.x - r, y: m.y - r, w: 2 * r, h: 2 * r };
    for (let k = 1; k < path.length; k++)
      if (ahead(path[k]) && sweptHeadHits(path[k - 1], path[k], MALLET_R, box)) {
        m.life = 0;
        events.push({ type: "swat", kind: m.kind, x: m.x, y: m.y, points: m.kind === "plane" ? POINTS.swat : 0 });
        break;
      }
  }
```

`src/sim/cast-behavior.ts`:

```ts
function stepStudent(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  const c = CAST.student;
  const h = w.hero;
  n.vx = 0;
  if (n.act === "windup") {
    if (n.actT >= c.windup) {
      w.missiles.push(launchPlane(++w.nextMissile, n, { x: h.x, y: h.y - h.h * 0.6 }));
      const m = w.missiles[w.missiles.length - 1];
      events.push({ type: "missile", kind: "plane", x: m.x, y: m.y });
      attack(n, events);
    }
    return;
  }
  if (n.act === "attack") { if (n.actT >= 0.3) setAct(n, "idle"); return; }
  // Out of melee: a hop back when he closes in on their floor, once every 1.5 s.
  if (sameLevel(n, h) && Math.abs(h.x - n.x) < c.melee && w.time - n.hopAt > 1.5) {
    n.dir = toward(n, h) === 1 ? -1 : 1;
    n.hopAt = w.time;
    n.mark = -1;
    setAct(n, "hop");
    return;
  }
  const planes = w.missiles.filter((m) => m.kind === "plane").length;
  if (!n.noticed || n.rest > 0 || Math.abs(h.x - n.x) > c.notice || planes >= c.planes || !ticketFree(w.cast)) return;
  windup(n, w, events);
  say(n, CAST_LINES.student.heads, events);
  n.rest = c.restMin + ((n.k + n.hits) % 4) * c.restStep;
}
```

(`hopAt` is new on `Npc`: `/** When he last hopped back. */ hopAt: number;`, set to `-9` in `createCast`; `mark` stays the hop's "pick a way" flag.)

```ts
function stepOffice(n: Npc, w: CastWorld, dt: number, events: GameEvent[]): void {
  const c = CAST.office;
  const h = w.hero;
  // The ambush, for the one behind the screen; then the march, for both.
  if (n.act === "hide") {
    n.vx = 0;
    if (!sameLevel(n, h) || Math.abs(h.x - n.x) > c.notice || !ticketFree(w.cast)) return;
    windup(n, w, events);
    say(n, pick(CAST_LINES.office.ambush, n.k), events);
    return;
  }
  if (n.act === "windup") {
    n.vx = 0;
    if (n.actT >= c.windup) {
      n.vx = n.facing * c.leap;
      n.vy = -c.leapUp;
      n.onGround = false;
      n.mark = 0;
      attack(n, events);
    }
    return;
  }
  if (n.act === "attack") {
    // At the top of the leap the coffee flies; he lands and marches like the other one.
    if (n.prop && n.vy >= 0 && !n.mark) {
      n.mark = 1;
      n.prop = false;
      w.missiles.push(launchCoffee(++w.nextMissile, n, { x: h.x, y: h.y - h.h * 0.6 }));
      const m = w.missiles[w.missiles.length - 1];
      events.push({ type: "missile", kind: "coffee", x: m.x, y: m.y });
    }
    if (n.onGround && n.actT > 0.2) { n.hide = false; n.x0 = n.x - 400; n.x1 = n.x + 400; setAct(n, "walk"); }
    return;
  }
  patrol(n, w, c.march);
  // The phone chimes once each time he closes in: the march's only warning.
  const near = sameLevel(n, h) && Math.abs(h.x - n.x) < c.chime;
  if (near && !n.cue) { n.cue = true; events.push({ type: "chime", x: n.x, y: n.y - n.h }); }
  if (!near && Math.abs(h.x - n.x) > c.chime * 2) n.cue = false;
}
```

(This replaces Task 4's `stepOffice` whole.)

`stepAct`'s tail adds `else if (n.role === "student") stepStudent(n, w, dt, events);`.

- [ ] **Step 4: Run, expect PASS**.

- [ ] **Step 5: Commit** `src/sim scripts/cast.check.mjs`: "Throw paper planes and the projector worker's coffee, and let the mallet swat them".

---

### Task 7: The lecture's effect, the retorts, the sighs, and what students do in a crowd

**Files:**
- Modify: `src/sim/cast-behavior.ts`, `src/sim/events.ts`, `scripts/cast.check.mjs`

**Interfaces:**
- Produces: events `{ type: "castFreeze"; id: number; x: number; y: number; points: number }`, `{ type: "castSchooled"; id: number; x: number; y: number; points: number }`, `{ type: "lectureLand"; x: number; y: number; schooled: number; frozen: number }` (once per lecture that lands on anyone).

- [ ] **Step 1: Write the failing tests**

```js
test("a lecture freezes staff in reach for 1.8 s with a sigh (50) and sits students down to sulk for 9 s with a retort (150), no planes", () => {
  const w = worldWith(
    [{ id: "s", person: "server-1", x: 700, y: 0 }, { id: "k", person: "student-1", x: 900, y: 0 }, { id: "far", person: "office-1", x: 1800, y: 0 }],
    { x: 300, y: 0 },
  );
  w.hero.facing = 1;
  press(w, "lecture");
  const evs = steps(w, 0.3);
  const land = of(evs, "lectureLand");
  assert.deepEqual(land.map((e) => [e.schooled, e.frozen]), [[1, 1]]);
  assert.deepEqual(of(evs, "castFreeze").map((e) => [e.id, e.points]), [[npc(w, "s").id, 50]]);
  assert.deepEqual(of(evs, "castSchooled").map((e) => [e.id, e.points]), [[npc(w, "k").id, 150]]);
  assert.ok(npc(w, "s").act === "frozen" && npc(w, "k").act === "schooled" && npc(w, "far").act !== "frozen");
  assert.ok(of(evs, "castLine").some((e) => e.id === npc(w, "s").id) && of(evs, "castLine").some((e) => e.id === npc(w, "k").id));
  const t0 = w.time;
  until(w, () => npc(w, "s").act !== "frozen", 3);
  assert.ok(w.time - t0 >= 1.8 - 2 * STEP, "frozen the full 1.8 s");
  assert.equal(npc(w, "k").act, "schooled");
  assert.ok(npc(w, "k").rest >= 8, "no planes while schooled");
  const lonely = worldWith([], { x: 300, y: 0 });
  press(lonely, "lecture");
  assert.equal(of(steps(lonely, 0.3), "lectureLand").length, 0, "nothing to land on");
});

test("a lecture stops a rush and a wind-up where they stand, and the tickets come back", () => {
  const w = worldWith([{ id: "s", person: "server-1", x: 760, y: 0 }, { id: "b", person: "bellhop-1", x: 1000, y: 0, cart: 850 }], { x: 300, y: 0 }, {}, [850]);
  until(w, () => npc(w, "s").act === "attack" && npc(w, "b").act === "windup", 4);
  assert.ok(npc(w, "s").act === "attack" && npc(w, "b").act === "windup", "both on the attack");
  w.hero.facing = 1;
  w.hero.lectureCd = 0;
  press(w, "lecture");
  const evs = steps(w, 0.3);
  assert.equal(of(evs, "castFreeze").length, 2);
  assert.ok(npc(w, "s").act === "frozen" && npc(w, "b").act === "frozen" && npc(w, "s").vx === 0);
  assert.equal(attackers(w.cast), 0);
  assert.equal(w.targets[0].vx, 0, "the cart was never shoved");
});

test("a student hops back out of his reach when there is floor behind, ducks otherwise", () => {
  const stage = flat({ platforms: [{ x0: 1500, x1: 2300, y: -520 }] });
  const w = worldWith([{ id: "k", person: "student-1", x: 2000, y: -520 }], { x: 1750, y: -520 }, {}, [], stage);
  const k = npc(w, "k");
  steps(w, 0.75);
  assert.equal(k.act, "hop", "after the double-take");
  until(w, () => npc(w, "k").act === "idle", 1);
  assert.ok(k.x > 2150, `hopped back: ${k.x}`);
  const edge = worldWith([{ id: "k", person: "student-1", x: 2250, y: -520 }], { x: 2000, y: -520 }, {}, [], stage);
  steps(edge, 0.5);
  assert.ok(Math.abs(npc(edge, "k").x - 2250) < 30, "no floor behind: stays");
});
```

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement** (`src/sim/cast-behavior.ts`, in `stepCast` before the loop)

```ts
  const lecture = events.find((e) => e.type === "lecture");
  if (lecture) {
    let schooled = 0;
    let frozen = 0;
    for (const n of w.cast) {
      if (!n.alive || !overlapsRect(lecture.reach, npcRect(n))) continue;
      if (n.role === "student") {
        if (n.act === "schooled" || n.out || !["idle", "walk", "notice", "windup", "attack", "duck", "hop"].includes(n.act)) continue;
        n.vx = 0;
        n.facing = toward(n, w.hero);
        setAct(n, "schooled");
        n.rest = Math.max(n.rest, CAST.student.schooled);
        say(n, pick(RETORTS, n.k + schooled), events);
        events.push({ type: "castSchooled", id: n.id, x: n.x, y: n.y - n.h, points: POINTS.schooled });
        schooled++;
      } else if (standing(n)) {
        n.vx = 0;
        n.facing = toward(n, w.hero);
        setAct(n, "frozen");
        say(n, n.role === "office" ? CAST_LINES.office.frozen : pick(STAFF_SIGHS, n.k + frozen), events);
        events.push({ type: "castFreeze", id: n.id, x: n.x, y: n.y - n.h, points: POINTS.frozen });
        frozen++;
      }
    }
    if (schooled || frozen) events.push({ type: "lectureLand", x: w.hero.x, y: w.hero.y - w.hero.h, schooled, frozen });
  }
```

`stepAct` cases: `case "frozen": n.vx = 0; if (n.actT >= T.freeze) setAct(n, "idle"); return;` and `case "schooled": n.vx = 0; if (n.actT >= CAST.student.schooled) setAct(n, "idle"); return;`. A frozen bellhop drops his grip: nothing to do, the cart stays where it is (`windup` placed it; it was never shoved). `RETORTS`, `STAFF_SIGHS` imported from `../game/lines`.

- [ ] **Step 4: Run, expect PASS**.

- [ ] **Step 5: Commit** `src/sim scripts/cast.check.mjs`: "Let the lecture freeze staff and school students".

---

### Task 8: The lobby with its cast: the scripted player, the respawn, the stash trip, the probe

**Files:**
- Modify: `src/sim/drive.ts`, `src/sim/game.ts`, `src/sim/levels/lobby.ts`, `scripts/lobby.check.mjs`, `scripts/cast.check.mjs`

**Interfaces:**
- Produces: `drive(level, h, route, world?)`: with a world it also fights: swings at staff and planes ahead, jumps carts rolling at him, lectures students in reach.

- [ ] **Step 1: Write the failing tests**

`scripts/lobby.check.mjs`: the traversal test passes `g.world` as the fourth argument of `drive` (`g.step(drive(g.level, g.world.hero, route, g.world))`) and adds, after the loop, `assert.ok(g.run.score > 0, \`${route}: scored on the cast\`)`. Then:

```js
// cast.check.mjs
import { createGame } from "../src/sim/game.ts";
import { LOBBY } from "../src/sim/levels/lobby.ts";
import { STASH } from "../src/sim/levels/stash.ts";
const play = (g) => { while (g.mode === "card") g.step(input()); };
const stepsG = (g, seconds, held = {}) => { const evs = []; for (let i = 0; i < Math.round(seconds / STEP); i++) { g.step(input(held)); evs.push(...g.events); } return evs; };
const untilG = (g, done, seconds = 10, held = {}) => { for (let i = 0; i < Math.round(seconds / STEP) && !done(g); i++) g.step(input(held)); };

test("the lobby's cast stands where the design puts them, every bellhop with his cart, nobody in the stash", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  const by = (id) => g.world.cast.find((n) => n.spawn === id);
  assert.equal(g.world.cast.length, 11);
  assert.ok(by("bellhop-desk").cart !== null && by("bellhop-floor").cart !== null);
  assert.deepEqual(LOBBY.cast.filter((s) => s.y === -520).map((s) => s.person.split("-")[0]), ["student", "student", "student"]);
  assert.ok(by("office-screen").hide && by("student-table").sit);
  assert.deepEqual(STASH.cast ?? [], []);
  const off = createGame({ lobby: LOBBY, stash: STASH }, 3, { cast: false });
  assert.equal(off.world.cast.length, 0);
});

test("a lost life brings the cast back as the run placed it, with no missile, ticket or line left over", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  play(g);
  const s = g.world.cast.find((n) => n.spawn === "server-buffet");
  Object.assign(g.world.hero, { x: 4700, y: 0 });
  untilG(g, (x) => x.world.cast.find((n) => n.spawn === "server-buffet").act === "attack", 4);
  assert.equal(s.act, "attack");
  g.world.missiles.push({ id: 9, kind: "plane", x: 4000, y: -200, vx: 100, vy: 0, spin: 0, life: 5, phase: 0, from: 0 });
  g.world.hero.patience = 1;
  g.world.hit(g.world.hero.x + 100);
  untilG(g, (x) => x.mode === "play" && x.run.lives === 2, 6);
  const fresh = g.world.cast.find((n) => n.spawn === "server-buffet");
  assert.notEqual(fresh, s, "a fresh cast");
  assert.deepEqual([fresh.act, fresh.x, fresh.noticed, fresh.hits], ["idle", 4900, false, 0]);
  assert.equal(g.world.missiles.length, 0);
  assert.equal(attackers(g.world.cast), 0);
});

test("the stash has no cast, and the lobby's cast is exactly as he left it when he comes back", () => {
  const g = createGame({ lobby: LOBBY, stash: STASH }, 3);
  play(g);
  Object.assign(g.world.hero, { x: 9700, y: 0 });
  const b = g.world.cast.find((n) => n.spawn === "bellhop-floor");
  Object.assign(b, { act: "down", actT: 1, hits: 1, hat: false });
  const before = JSON.stringify(g.world.cast);
  g.step(input({ down: true }, { down: true }));
  untilG(g, (x) => x.level.id === "stash", 2, { down: true });
  assert.equal(g.level.id, "stash");
  assert.equal(g.world.cast.length, 0);
  stepsG(g, 2);
  Object.assign(g.world.hero, { x: 320, y: 0 });
  g.step(input());
  g.step(input({ down: true }, { down: true }));
  untilG(g, (x) => x.level.id === "lobby", 2, { down: true });
  assert.equal(g.level.id, "lobby");
  assert.equal(JSON.stringify(g.world.cast), before, "untouched while he was away");
});

test("the Game scores the cast: a knockdown 100, a chain's points, and the eighth bowl is a life", () => {
  const one = { ...LOBBY, cast: [{ id: "o", person: "office-1", x: 2930, y: 0 }], carts: [], crates: [], checkpoints: [] };
  const g = createGame({ lobby: one, stash: STASH }, 3);
  play(g);
  Object.assign(g.world.hero, { x: 2700, y: 0, facing: 1 });
  g.step(input({ hammer: true }, { hammer: true }));
  stepsG(g, 0.5);
  assert.equal(g.run.score, 100, "the office worker went down");
  const row = { ...LOBBY, cast: Array.from({ length: 8 }, (_, i) => ({ id: `o${i}`, person: "office-1", x: 3000 + i * 120, y: 0 })), carts: [2700], crates: [], checkpoints: [] };
  const c = createGame({ lobby: row, stash: STASH }, 3);
  play(c);
  Object.assign(c.world.hero, { x: 300, y: 0 });
  c.world.targets[0].vx = 1100;
  const lives = c.run.lives;
  stepsG(c, 3);
  assert.equal(c.run.score, 100 + 200 + 400 + 800 + 1000 + 2000 + 4000 + 8000, "one chain through the row");
  assert.equal(c.run.lives, lives + 1, "the eighth is a life");
});
```

- [ ] **Step 2: Run, expect FAIL** (the traversal test fails first: the scripted player walks into the cast).

- [ ] **Step 3: Implement**

`src/sim/drive.ts`:

```ts
import { attacking } from "./cast-behavior";
import { lectureReach } from "./moves";
import { overlapsRect } from "./geometry";
import type { World } from "./world";

/** How far ahead the scripted player sees trouble: staff to bonk, a cart to jump, a plane to swat, students to lecture. */
const FIGHT = { staff: 420, cart: 520, plane: 300, student: 700 } as const;

export function drive(level: Level, h: HeroState, route: "floor" | "balcony", world?: World): Input {
  const i = emptyInput();
  i.held.right = i.held.run = true;
  const stage = stageOf(level);
  const gap = h.onGround && floorAt(stage, h.x + LOOK.gap, h.y - 60) === null;
  const wall = level.solids.some((s) => s.x - h.x > 0 && s.x - h.x < LOOK.wall && s.y < h.y - 10 && s.y + s.h > h.y - 290);
  const landing =
    route === "balcony" && h.y === 0 && level.platforms.some((p) => p.kind === "landing" && p.x0 - h.x > 0 && p.x0 - h.x < LOOK.landing);
  const pass = level.passes.some((p) => p.x - h.x > -p.w && p.x - h.x < LOOK.pass);
  if (world) fight(world, h, i);
  if (pass) i.held.down = true;
  if ((wall || gap || landing || i.pressed.jump) && h.onGround && !pass) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  return i;
}

/** Fights what is in front of him: a swing at staff or a plane within reach, a jump over a cart rolling at him, a lecture at students. */
function fight(w: World, h: HeroState, i: Input): void {
  if (h.move) return;
  const ahead = (x: number, within: number) => (x - h.x) * h.facing > 0 && Math.abs(x - h.x) < within;
  const level = (y: number) => Math.abs(y - h.y) < 80;
  const staff = w.cast.some((n) => n.alive && n.role !== "student" && hittable(n) && (attacking(n) || n.act === "windup" || standing(n)) && ahead(n.x, FIGHT.staff) && level(n.y));
  const plane = w.missiles.some((m) => ahead(m.x, FIGHT.plane) && Math.abs(m.y - (h.y - h.h * 0.6)) < 200);
  const cart = w.targets.some((t) => ahead(t.x, FIGHT.cart) && Math.abs(t.vx) >= ROLLING && (h.x - t.x) * t.vx > 0 && level(t.y));
  const students = w.cast.filter((n) => n.alive && n.role === "student" && n.act !== "schooled" && overlapsRect(lectureReach(h), npcRect(n)));
  if (cart && h.onGround) { i.pressed.jump = true; return; }
  if (students.length && h.lectureCd <= 0 && h.onGround) { i.held.lecture = i.pressed.lecture = true; return; }
  if (staff || plane) i.held.hammer = i.pressed.hammer = true;
}
```

(`hittable`, `standing`, `npcRect`, `ROLLING` from `./cast`. The jump line in `drive` now also fires on `i.pressed.jump` set by `fight`.)

If the traversal still loses a pip or a life, the fix is in the driver's distances or in a placement number of `lobby.ts` (R2b §5 says the placement is mine to tune), never in the fight rules. Keep `assert.equal(g.run.lives, 3)` as it is.

`src/sim/game.ts`: as Task 2 left it, `begin()` rebuilds the cast and empties the missiles on every respawn; `lobbySave` carries `cast` and `missiles`; the stash gets `[]` of each.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`.

- [ ] **Step 5: Commit** `src/sim scripts/lobby.check.mjs scripts/cast.check.mjs`: "Place the cast in the lobby and teach the scripted player to fight through it".

---

### Task 9: The cast's poses: every act animated on the shared skeleton

**Files:**
- Create: `src/sim/rig/cast.ts`
- Modify: `scripts/cast.check.mjs`

**Interfaces:**
- Produces:

```ts
// src/sim/rig/cast.ts
export type CastPoseCtx = { role: CastRole; act: CastAct; t: number; speed: number; onGround: boolean; sit: boolean; spin: number; hits: number };
/** The pose of a cast member in its act at `t` seconds in, on Hammer's skeleton: rotations away from the painted stance. */
export function castPose(c: CastPoseCtx): Pose;
/** How an act stands on the floor: on the feet, or on whatever is lowest (sitting, lying, sliding). */
export function castGround(act: CastAct, onGround: boolean, sit: boolean): Ground;
/** Seconds each timed act plays for, for the boards and the smoothness check; loops are 0. */
export const ACT_SECONDS: Record<CastAct, number>;
```

- [ ] **Step 1: Write the failing tests**

```js
import { castPose, castGround, ACT_SECONDS } from "../src/sim/rig/cast.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { JOINT_NAMES } from "../src/sim/rig/skeleton.ts";

const ACTS = ["idle", "walk", "notice", "windup", "attack", "recover", "chase", "return", "hide", "bumped", "fly", "down", "getup", "leave", "slide", "slip", "frozen", "schooled", "duck", "hop", "flee"];
const ROLES = ["bellhop", "server", "office", "student"];
const ctx = (role, act, t, extra = {}) => ({ role, act, t, speed: 300, onGround: true, sit: false, spin: 0, hits: 0, ...extra });

test("every act of every role animates without a jump: no joint turns more than 9 degrees in one step", () => {
  for (const role of ROLES)
    for (const act of ACTS) {
      const seconds = ACT_SECONDS[act] || 2;
      let worst = 0;
      let last = castPose(ctx(role, act, 0));
      for (let t = STEP; t <= seconds; t += STEP) {
        const p = castPose(ctx(role, act, t));
        for (const j of JOINT_NAMES) worst = Math.max(worst, Math.abs(p.rot[j] - last.rot[j]));
        worst = Math.max(worst, Math.abs(p.lean - last.lean), Math.abs(p.headTilt - last.headTilt), Math.abs(p.root.y - last.root.y) / 4);
        last = p;
      }
      assert.ok(worst <= 9, `${role} ${act}: a step of ${worst.toFixed(1)}`);
    }
});

test("walking swings the hips and the arms, and the students sit when seated", () => {
  const hips = [];
  for (let t = 0; t < 1; t += 0.05) hips.push(castPose(ctx("server", "walk", t)).rot.hipNear);
  assert.ok(Math.max(...hips) - Math.min(...hips) >= 30, "the hips swing");
  const arms = [];
  for (let t = 0; t < 1; t += 0.05) arms.push(castPose(ctx("server", "walk", t)).rot.shoulderFar);
  assert.ok(Math.max(...arms) - Math.min(...arms) >= 15, "the free arm swings");
  const seated = castPose(ctx("student", "idle", 0, { sit: true }));
  assert.ok(seated.rot.hipNear > 70 && seated.rot.kneeNear < -70, "legs folded");
  assert.equal(castGround("idle", true, true), "body");
});

test("down, sliding, slipping and schooled rest on the body; flying is free; the rest stand on their feet", () => {
  assert.equal(castGround("down", true, false), "body");
  assert.equal(castGround("slide", true, false), "body");
  assert.equal(castGround("schooled", true, false), "body");
  assert.equal(castGround("fly", false, false), "none");
  assert.equal(castGround("walk", true, false), "planted");
  assert.equal(castGround("hop", false, false), "none");
});

test("a flying body turns with its spin and lies flat when down from a slide; a tray hand stays up at shoulder height", () => {
  const p = castPose(ctx("office", "fly", 0.3, { spin: 120 }));
  assert.equal(p.spin, 120);
  const slide = castPose(ctx("bellhop", "slide", 0.2));
  assert.ok(Math.abs(slide.spin) >= 80, "on his back");
  const s = solve(castPose(ctx("server", "idle", 0.4)), 1, 0.26);
  assert.ok(s.joints.wristNear.y < s.joints.shoulderNear.y + 30 && s.joints.wristNear.x > s.joints.shoulderNear.x, `the tray hand up in front: ${JSON.stringify(s.joints.wristNear)}`);
});
```

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement** (`src/sim/rig/cast.ts`)

```ts
import type { CastAct, CastRole } from "../cast";
import { CAST, T } from "../cast";
import { flatFeet } from "./clips";
import type { Ground } from "./ground";
import { armTo } from "./ik";
import { out, pose, smooth, track, type Key, type Pose } from "./pose";
import type { JointName, Point } from "./skeleton";

const TAU = Math.PI * 2;
type K = readonly Key[];
const at = (keys: K, u: number) => track(keys, u);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Both arms hanging at the sides (the painting reaches them forward). */
const HANG = { shoulderNear: -30, shoulderFar: -34 } as const;

export const ACT_SECONDS: Record<CastAct, number> = {
  idle: 0, walk: 0, notice: T.notice, windup: 0.7, attack: 0.6, recover: 0.4, chase: 0, return: 0, hide: 0, bumped: T.bump,
  fly: 0, down: 0, getup: T.getup, leave: 0, slide: 0, slip: T.slip, frozen: 0, schooled: 0, duck: CAST.student.duck, hop: CAST.student.hopT, flee: 0,
};

export function castGround(act: CastAct, onGround: boolean, sit: boolean): Ground {
  if (!onGround || act === "fly" || act === "hop") return "none";
  if (act === "down" || act === "slide" || act === "slip" || act === "schooled" || act === "getup" || sit) return "body";
  return act === "flee" || act === "attack" ? "push" : "planted";
}

/** A walk or run cycle on both legs with the arms swinging against them; `u` is the cycle. */
function stride(u: number, run: boolean, arms = 1): Partial<Record<JointName, number>> {
  const phi = TAU * u;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const hip = run ? 32 : 20;
  const knee = run ? 56 : 34;
  return flatFeet(
    {
      hipNear: hip * s,
      kneeNear: -(run ? 8 : 0) - knee * Math.max(0, c),
      hipFar: -hip * s,
      kneeFar: -(run ? 8 : 0) - knee * Math.max(0, -c),
      shoulderNear: HANG.shoulderNear - 14 * s * arms,
      elbowNear: (run ? 60 : 6) + 10 * Math.max(0, -s) * arms,
      shoulderFar: HANG.shoulderFar + 14 * s * arms,
      elbowFar: (run ? 60 : 6) + 10 * Math.max(0, s) * arms,
    },
    run ? 0.6 : 0.75,
  );
}

/** The role's hands at rest: the tray up, the cup and the phone, the rail lean, or hanging. */
function hands(role: CastRole, t: number): { rot: Partial<Record<JointName, number>>; lean: number; headTilt: number } {
  if (role === "server") {
    const near = armTo("near", { x: 66, y: 262 + 2 * Math.sin(t * TAU * 0.6) }, 0, -1);
    return { rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: HANG.shoulderFar }, lean: 2, headTilt: 0 };
  }
  if (role === "office") {
    const near = armTo("near", { x: 52, y: 212 }, 20, -1);
    const far = armTo("far", { x: 58, y: 248 }, 65, -1);
    return { rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist }, lean: 4, headTilt: 12 };
  }
  if (role === "student") {
    const near = armTo("near", { x: 62, y: 250 }, 70, -1);
    return { rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: HANG.shoulderFar + 6 }, lean: -3, headTilt: 6 };
  }
  // The bellhop: hands at his sides, chest out; every six seconds a polish of the cart's rail.
  const cycle = t % 6;
  const polishing = cycle > 3.5 && cycle < 5.5;
  const rub = polishing ? 8 * Math.sin(cycle * TAU * 1.5) : 0;
  const k = smooth(clamp01(polishing ? Math.min(cycle - 3.5, 5.5 - cycle) / 0.3 : 0));
  return { rot: { shoulderNear: HANG.shoulderNear + 70 * k, elbowNear: (40 + rub) * k, shoulderFar: HANG.shoulderFar }, lean: -3, headTilt: -2 };
}

const idle = (role: CastRole, t: number, sit: boolean): Pose => {
  const breath = Math.sin(TAU * 0.4 * t);
  const h = hands(role, t);
  if (sit)
    return pose({ rot: { ...h.rot, hipNear: 92, kneeNear: -104, hipFar: 88, kneeFar: -100, ankleNear: 10, ankleFar: 10 }, lean: h.lean + 6, headTilt: h.headTilt, root: { x: 0, y: -40 } });
  const rail = role === "student" ? { lean: 14, hipNear: -8, hipFar: -8 } : { lean: 0, hipNear: 0, hipFar: 0 };
  return pose({
    rot: { ...h.rot, chest: 1.2 * breath, hipNear: rail.hipNear, hipFar: rail.hipFar },
    lean: h.lean + rail.lean + 0.8 * breath,
    headTilt: h.headTilt + 0.6 * breath,
  });
};

const walk = (role: CastRole, t: number, speed: number, run: boolean, arms = 1): Pose => {
  const u = ((t * Math.max(120, speed)) / 280) % 1;
  const rot = stride(u, run, arms);
  const h = hands(role, t);
  // A carried tray, cup or phone keeps that arm where it is; the other swings.
  if (role === "server" || role === "office" || role === "student") Object.assign(rot, { shoulderNear: h.rot.shoulderNear, elbowNear: h.rot.elbowNear, wristNear: h.rot.wristNear });
  if (role === "office") Object.assign(rot, { shoulderFar: h.rot.shoulderFar, elbowFar: h.rot.elbowFar, wristFar: h.rot.wristFar });
  return pose({ rot, lean: run ? 12 : 3 + (role === "office" ? 4 : 0), headTilt: role === "office" ? 12 : 0 });
};

// The double-take: a look, back, and a longer look with the shoulders up.
const NOTICE = { headTilt: [[0, 0], [0.12, -8], [0.24, 0], [0.4, -9], [0.6, -4]] as K, lean: [[0, 0], [0.12, -3], [0.24, 0], [0.4, -7], [0.6, -5]] as K, arms: [[0, 0], [0.3, 0], [0.42, 1], [0.6, 0.6]] as K };
const notice = (role: CastRole, t: number): Pose => {
  const u = clamp01(t / T.notice);
  const h = hands(role, t);
  const up = at(NOTICE.arms, u);
  return pose({
    rot: { ...h.rot, shoulderNear: (h.rot.shoulderNear ?? HANG.shoulderNear) + 25 * up, shoulderFar: (h.rot.shoulderFar ?? HANG.shoulderFar) + 25 * up, chest: -3 * up },
    lean: h.lean + at(NOTICE.lean, u),
    headTilt: h.headTilt + at(NOTICE.headTilt, u),
  });
};

// Wind-ups: the bellhop grips and rocks the cart, the server drops into a sprinter's crouch with the
// tray held high, the office worker rears back with the cup, the student cocks the arm.
const windup = (role: CastRole, t: number): Pose => {
  const u = clamp01(t / 0.7);
  const k = smooth(Math.min(1, u * 3));
  if (role === "bellhop") {
    const near = armTo("near", { x: 92, y: 200 }, -10, -1);
    const far = armTo("far", { x: 96, y: 206 }, -10, -1);
    const rock = -8 * Math.max(0, Math.sin(t * TAU * 3)) * k;
    return pose({
      rot: flatFeet({ shoulderNear: near.shoulder * k + HANG.shoulderNear * (1 - k), elbowNear: near.elbow * k, wristNear: near.wrist * k, shoulderFar: far.shoulder * k + HANG.shoulderFar * (1 - k), elbowFar: far.elbow * k, wristFar: far.wrist * k, hipNear: 38 * k, kneeNear: -58 * k, hipFar: 34 * k, kneeFar: -54 * k }, 1),
      lean: 22 * k,
      root: { x: rock, y: 0 },
    });
  }
  if (role === "server") {
    const near = armTo("near", { x: 24, y: 300 }, 0, -1);
    return pose({
      rot: flatFeet({ shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: HANG.shoulderFar - 40 * k, elbowFar: 30 * k, hipNear: 62 * k, kneeNear: -92 * k, hipFar: -26 * k, kneeFar: -16 * k }, 0.7),
      lean: 30 * k,
      root: { x: 0, y: -24 * k },
    });
  }
  if (role === "office") {
    const near = armTo("near", { x: -40 + 90 * (1 - k), y: 230 }, 40, -1);
    const far = armTo("far", { x: 58, y: 248 }, 65, -1);
    return pose({
      rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist, hipNear: 10 * k, kneeNear: -20 * k, hipFar: 10 * k, kneeFar: -20 * k },
      lean: -16 * k,
      headTilt: 4,
    });
  }
  const near = armTo("near", { x: -36, y: 300 }, 120, 1);
  return pose({ rot: { shoulderNear: near.shoulder * k + HANG.shoulderNear * (1 - k), elbowNear: near.elbow * k, wristNear: near.wrist * k, shoulderFar: HANG.shoulderFar + 10 * k, chest: -4 * k }, lean: -6 * k, headTilt: -3 * k });
};

// Attacks: the shove, the rush, the leap, the throw.
const attack = (role: CastRole, t: number, speed: number): Pose => {
  if (role === "bellhop") {
    const k = smooth(clamp01(t / 0.25));
    const near = armTo("near", { x: 110 + 20 * k, y: 215 }, 0, -1);
    const far = armTo("far", { x: 112 + 20 * k, y: 220 }, 0, -1);
    return pose({ rot: flatFeet({ shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist, hipNear: 30, kneeNear: -40, hipFar: -10, kneeFar: -10 }, 0.8), lean: 24 - 6 * k });
  }
  if (role === "server") {
    const p = walk(role, t, speed, true, 0);
    const near = armTo("near", { x: 20, y: 300 }, 0, -1);
    return pose({ rot: { ...p.rot, shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist }, lean: 20, headTilt: -2 });
  }
  if (role === "office") {
    const k = smooth(clamp01(t / 0.2));
    const near = armTo("near", { x: 100, y: 250 }, 30, -1);
    const far = armTo("far", { x: 58, y: 248 }, 65, -1);
    return pose({ rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist, hipNear: 22 * k, kneeNear: -32 * k, hipFar: 12 * k, kneeFar: -38 * k }, lean: 10 * k });
  }
  const k = smooth(clamp01(t / 0.3));
  const near = armTo("near", { x: -36 + 140 * k, y: 300 - 60 * k }, 120 - 130 * k, 1);
  return pose({ rot: { shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: HANG.shoulderFar + 10 * (1 - k), chest: -4 + 10 * k }, lean: -6 + 14 * k });
};

// Knocked flying: limbs loose on a wobble, the whole body turning with its spin.
const fly = (t: number, spin: number): Pose => {
  const w = Math.sin(t * TAU * 5);
  return pose({
    rot: { hipNear: 30 + 8 * w, kneeNear: -40 - 10 * w, hipFar: -12 - 8 * w, kneeFar: -36 + 10 * w, shoulderNear: 70 + 12 * w, elbowNear: 30, shoulderFar: -30 - 12 * w, elbowFar: 24, ankleNear: 20, ankleFar: 20 },
    lean: -8,
    spin,
  });
};

/** Sitting on the floor, legs out, head lolling. */
const SIT = { hip: 100, knee: -8, lean: 10, shoulder: -40 } as const;
const down = (t: number): Pose =>
  pose({ rot: { hipNear: SIT.hip, kneeNear: SIT.knee, hipFar: SIT.hip - 4, kneeFar: SIT.knee, ankleNear: 30, ankleFar: 30, shoulderNear: SIT.shoulder, shoulderFar: SIT.shoulder - 4, elbowNear: 10, elbowFar: 10 }, lean: SIT.lean, headTilt: 6 * Math.sin(t * TAU) });

// Getting up: the knees pulled in under him, then up through a crouch to standing.
const GETUP = {
  hip: [[0, SIT.hip], [0.45, 125], [0.75, 70], [1, 0]] as K,
  knee: [[0, SIT.knee], [0.45, -140], [0.75, -112], [1, 0]] as K,
  lean: [[0, SIT.lean], [0.45, 34], [0.75, 16], [1, 0]] as K,
  drop: [[0, 0], [0.45, -20], [0.75, -60], [1, 0]] as K,
  shoulder: [[0, SIT.shoulder], [1, HANG.shoulderNear]] as K,
};
const getup = (t: number): Pose => {
  const u = clamp01(t / T.getup);
  const hip = at(GETUP.hip, u);
  const knee = at(GETUP.knee, u);
  return pose({
    rot: flatFeet({ hipNear: hip, kneeNear: knee, hipFar: hip * 0.96, kneeFar: knee * 0.96, shoulderNear: at(GETUP.shoulder, u), shoulderFar: at(GETUP.shoulder, u) - 4 }, 1),
    lean: at(GETUP.lean, u),
    root: { x: 0, y: at(GETUP.drop, u) },
  });
};

/** Flat on his back along the marble, legs up, arms up. */
const slide = (t: number): Pose => pose({ rot: { hipNear: 60, kneeNear: -30, hipFar: 50, kneeFar: -26, shoulderNear: 120 + 6 * Math.sin(t * TAU * 4), shoulderFar: 110, elbowNear: 20, elbowFar: 20 }, spin: 90, lean: 0 });

/** Feet out from under him: legs forward, arms thrown up, going over backward. */
const slip = (t: number): Pose => {
  const u = clamp01(t / T.slip);
  const k = smooth(u);
  return pose({ rot: { hipNear: 70 * k, kneeNear: 0, hipFar: 66 * k, kneeFar: 0, ankleNear: 20 * k, ankleFar: 20 * k, shoulderNear: HANG.shoulderNear + 160 * k, shoulderFar: HANG.shoulderFar + 150 * k }, lean: -30 * k, spin: 40 * k, root: { x: 0, y: -10 * Math.sin(u * Math.PI) } });
};

/** Held mid-gesture by the lecture: the hands up a little, no motion at all. */
const frozen = (role: CastRole): Pose => {
  const h = hands(role, 0);
  return pose({ rot: { ...h.rot, shoulderNear: (h.rot.shoulderNear ?? HANG.shoulderNear) + 20, shoulderFar: (h.rot.shoulderFar ?? HANG.shoulderFar) + 15 }, lean: h.lean - 4, headTilt: h.headTilt - 4 });
};

/** Sat down to sulk: knees up, arms crossed, chin down. */
const schooled = (t: number): Pose => pose({ rot: { hipNear: 100, kneeNear: -120, hipFar: 96, kneeFar: -116, shoulderNear: 60, elbowNear: 110, shoulderFar: 50, elbowFar: 110 }, lean: 8, headTilt: 10 + 2 * Math.sin(t * TAU * 0.5) });

const duck = (t: number): Pose => {
  const k = smooth(clamp01(t / 0.2)) * smooth(clamp01((CAST.student.duck - t) / 0.15));
  return pose({ rot: flatFeet({ hipNear: 70 * k, kneeNear: -112 * k, hipFar: 66 * k, kneeFar: -108 * k, shoulderNear: HANG.shoulderNear + 100 * k, elbowNear: 40 * k, shoulderFar: HANG.shoulderFar + 96 * k, elbowFar: 40 * k, chest: -6 * k }, 1), lean: 16 * k, root: { x: 0, y: -60 * k }, headTilt: 6 * k });
};

const hop = (t: number): Pose => {
  const k = Math.sin(clamp01(t / CAST.student.hopT) * Math.PI);
  return pose({ rot: { hipNear: 22 * k, kneeNear: -32 * k, hipFar: 12 * k, kneeFar: -38 * k, ankleNear: 14 * k, ankleFar: 14 * k, shoulderNear: HANG.shoulderNear + 20 * k, shoulderFar: HANG.shoulderFar + 20 * k }, lean: -5 * k });
};

const bumped = (t: number, role: CastRole): Pose => {
  const u = clamp01(t / T.bump);
  const k = Math.sin(u * Math.PI);
  const h = hands(role, t);
  return pose({ rot: { ...h.rot, shoulderNear: (h.rot.shoulderNear ?? HANG.shoulderNear) + 30 * k, shoulderFar: (h.rot.shoulderFar ?? HANG.shoulderFar) + 30 * k, hipNear: -10 * k, hipFar: 15 * k }, lean: h.lean - 12 * k, headTilt: h.headTilt - 4 * k });
};

export function castPose(c: CastPoseCtx): Pose {
  const { role, act, t, speed } = c;
  switch (act) {
    case "idle":
    case "hide":
      return idle(role, t, c.sit);
    case "walk":
      return walk(role, t, speed, false);
    case "chase":
    case "return": {
      const p = walk(role, t, speed, false, 0);
      const near = armTo("near", { x: 92, y: 210 }, -10, -1);
      const far = armTo("far", { x: 96, y: 214 }, -10, -1);
      return pose({ rot: { ...p.rot, shoulderNear: near.shoulder, elbowNear: near.elbow, wristNear: near.wrist, shoulderFar: far.shoulder, elbowFar: far.elbow, wristFar: far.wrist }, lean: 8 });
    }
    case "leave":
      return pose({ ...walk(role, t, speed, false, 0.6), lean: -2 });
    case "flee": {
      const p = walk(role, t, speed, true, 0);
      return pose({ rot: { ...p.rot, shoulderNear: HANG.shoulderNear + 170, shoulderFar: HANG.shoulderFar + 165, elbowNear: 20, elbowFar: 20 }, lean: 14 });
    }
    case "notice":
      return notice(role, t);
    case "windup":
      return windup(role, t);
    case "attack":
      return attack(role, t, speed);
    case "recover":
      return pose({ rot: flatFeet({ hipNear: 30, kneeNear: -20, hipFar: 36, kneeFar: -24, shoulderNear: HANG.shoulderNear - 40, shoulderFar: HANG.shoulderFar - 40 }, 1), lean: -15 * (1 - smooth(clamp01(t / 0.4))) });
    case "bumped":
      return bumped(t, role);
    case "fly":
      return fly(t, c.spin);
    case "down":
      return down(t);
    case "getup":
      return getup(t);
    case "slide":
      return slide(t);
    case "slip":
      return slip(t);
    case "frozen":
      return frozen(role);
    case "schooled":
      return schooled(t);
    case "duck":
      return duck(t);
    case "hop":
      return hop(t);
  }
}
```

The smoothness check is the arbiter: wherever it finds a step over 9 degrees (a key's onset, a `k` that starts at 0 but a rotation that doesn't), soften that key with `smooth`/`out` until the frames flow; the recover's lean and the getup's root are the likely spots. Never widen the 9-degree limit.

- [ ] **Step 4: Run, expect PASS**.

- [ ] **Step 5: Commit** `src/sim/rig/cast.ts scripts/cast.check.mjs`: "Animate every act of the cast on the shared skeleton".

---

### Task 10: The stand-in figures, the cast view, the missiles drawn, and the cast on screen

**Files:**
- Create: `src/render/cast.ts`, `src/render/cast-fx.ts`
- Modify: `src/render/props.ts`, `src/render/interp.ts`, `src/render/look.ts`, `src/render/app.ts`, `src/components/next-game.tsx`, `src/routes/index.tsx`, `scripts/render.check.mjs`

**Interfaces:**
- Produces:

```ts
// src/render/cast.ts
export type HairStyle = "short" | "bun" | "ponytail" | "curly" | "bald" | "bob" | "beanie";
export type CastLook = { height: number; build: number; skin: string; hair: string; hairStyle: HairStyle; top: string; sleeves: "top" | "skin"; vest?: string; apron?: boolean; tie?: string; bottom: string; shoes: string; gloves?: boolean; glasses?: boolean; mustache?: boolean; earbuds?: boolean; backpack?: string; lanyard?: boolean; braid?: boolean };
export const LOOKS: Record<CastPerson, CastLook>;
/** A look with the uniform's top in the recolor's hue. */
export function recolored(look: CastLook, hex: string | null): CastLook;
export type FigureOpts = { role: CastRole; act: CastAct; hat: boolean; prop: boolean; slimed: boolean; silhouette: boolean };
/** Draws an inked stand-in about the feet point from the solved joints: far limbs, torso and uniform, near limbs, props, the head. */
export function drawFigure(g: Graphics, s: Solved, look: CastLook, o: FigureOpts): void;
export class Cast {
  readonly container: Container;
  constructor(layer: Container, ambient: number);
  sync(prev: Snapshot, cur: Snapshot, alpha: number, time: number, screens: Furniture[]): void;
  /** Where a cast member's head is, for his speech bubble; null once he is gone. */
  crownOf(id: number): { x: number; y: number; facing: 1 | -1 } | null;
  destroy(): void;
}
// src/render/interp.ts: between() also interpolates cast (x, y) and missiles (x, y) by id.
// src/render/cast-fx.ts
export class Flyers {
  constructor(layer: Container, particles: Particles);
  hat(x: number, y: number, dir: 1 | -1): void;
  glasses(x: number, y: number, dir: 1 | -1): void;
  cup(x: number, y: number, dir: 1 | -1): void;
  update(dt: number, floorUnder: (x: number, y: number) => number | null): void;
}
// window.__next gains cast?: { acts: Record<string, string>; attackers: number; missiles: number; planes: { kind: string; x: number; y: number }[]; out: number }
// ?nocast=1 → NextGame nocast → startLook({ nocast }) → createGame(LEVELS, seed, { cast: !nocast })
```

- [ ] **Step 1: Write the failing tests** (`scripts/render.check.mjs`; the figure drawing is Pixi and is checked on the boards)

```js
import { between } from "../src/render/interp.ts";
import { LOOKS, recolored } from "../src/render/cast.ts";

test("the cast and the missiles draw between the last two steps, matched by id", () => {
  const npc = (x, y) => ({ id: 1001, spawn: "s", x, y, alive: true });
  const prev = { time: 0, hero: {}, targets: [], snot: [], puddles: [], cast: [npc(100, 0)], missiles: [{ id: 1, x: 0, y: 0 }] };
  const cur = { time: 1, hero: {}, targets: [], snot: [], puddles: [], cast: [npc(200, -40)], missiles: [{ id: 1, x: 100, y: -20 }, { id: 2, x: 500, y: 0 }] };
  const b = between(prev, cur, 0.25);
  assert.deepEqual([b.cast[0].x, b.cast[0].y], [125, -10]);
  assert.deepEqual([b.missiles[0].x, b.missiles[0].y, b.missiles[1].x], [25, -5, 500]);
});

test("every person has a look, taller or shorter than Hammer by the design, and a recolor changes only the top", () => {
  assert.deepEqual(Object.keys(LOOKS).sort(), ["bellhop-1", "bellhop-2", "office-1", "office-2", "server-1", "server-2", "student-1", "student-2"]);
  assert.deepEqual([LOOKS["bellhop-1"].height, LOOKS["server-2"].height, LOOKS["student-1"].height], [355, 360, 315]);
  const r = recolored(LOOKS["server-1"], "#7a1f2b");
  assert.equal(r.vest, "#7a1f2b");
  assert.equal(r.bottom, LOOKS["server-1"].bottom);
  assert.equal(recolored(LOOKS["student-2"], "#2a8c8a").top, "#2a8c8a");
  assert.equal(recolored(LOOKS["student-2"], null), LOOKS["student-2"]);
});
```

(`src/render/cast.ts` must import nothing from Pixi at module top that constructs objects, so the loader can import it: `Container`, `Graphics` as types and classes are fine to import; nothing is built until `new Cast`.)

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement**

`src/render/interp.ts`: add `cast` and `missiles` the way `targets` is done (maps by id; a member missing from `prev` is taken as is).

`src/render/cast.ts`:

```ts
import { Container, Graphics } from "pixi.js";
import { HEAD_PLATE_DEFAULT } from "../art/registry";
import type { CastAct, CastRole, Npc } from "../sim/cast";
import { HEAD_SCALE, STEP } from "../sim/constants";
import type { CastPerson, Furniture } from "../sim/level";
import { solve, type Solved } from "../sim/rig/fk";
import { groundShift } from "../sim/rig/ground";
import { castGround, castPose } from "../sim/rig/cast";
import { HERO_HEIGHT, type JointName } from "../sim/rig/skeleton";
import type { Point, Snapshot } from "../sim/types";
import { between } from "./interp";
import { PALETTE, tones } from "./palette";

const INK = PALETTE.outline;
const LINE = 4;
const SIL = "#14110f";
/** Capsule radii in rest units; `build` scales them. */
const R = { arm: 20, leg: 26, hand: 16, foot: 15, torsoTop: 44, torsoBottom: 40, head: 38 } as const;

export const LOOKS: Record<CastPerson, CastLook> = {
  "bellhop-1": { height: 355, build: 1.05, skin: "#d7a27a", hair: "#9a9a9a", hairStyle: "short", top: "#b8282e", sleeves: "top", bottom: "#1c1d24", shoes: "#141414", gloves: true, mustache: true, braid: true },
  "bellhop-2": { height: 315, build: 0.85, skin: "#ebc9a9", hair: "#3b2a22", hairStyle: "bun", top: "#b8282e", sleeves: "top", bottom: "#1c1d24", shoes: "#141414", gloves: true, braid: true },
  "server-1": { height: 320, build: 0.8, skin: "#e2b48f", hair: "#2a1d16", hairStyle: "ponytail", top: "#f4f3ee", sleeves: "skin", vest: "#1a1a1a", apron: true, bottom: "#1a1a1a", shoes: "#141414" },
  "server-2": { height: 360, build: 0.75, skin: "#c9956a", hair: "#4a2e1a", hairStyle: "curly", top: "#f4f3ee", sleeves: "skin", vest: "#1a1a1a", apron: true, bottom: "#1a1a1a", shoes: "#141414" },
  "office-1": { height: 345, build: 1.1, skin: "#e8bf9c", hair: "#2b2320", hairStyle: "bald", top: "#9cc4ec", sleeves: "skin", tie: "#7a1f2b", bottom: "#c8b58c", shoes: "#5a3a1e", glasses: true, earbuds: true, lanyard: true },
  "office-2": { height: 325, build: 0.85, skin: "#d9a98b", hair: "#1f1a18", hairStyle: "bob", top: "#5a5e68", sleeves: "top", bottom: "#1d1d1f", shoes: "#141414", earbuds: true, lanyard: true },
  "student-1": { height: 315, build: 0.9, skin: "#c88f6a", hair: "#1c1612", hairStyle: "curly", top: "#5d6b3c", sleeves: "top", bottom: "#3f5e8f", shoes: "#f4f3ee", glasses: true, earbuds: true, backpack: "#6b1f2a" },
  "student-2": { height: 335, build: 0.95, skin: "#f0cfae", hair: "#2a2a2e", hairStyle: "beanie", top: "#8a8d93", sleeves: "top", bottom: "#1f2024", shoes: "#f4f3ee", earbuds: true, backpack: "#1a1a1a" },
};

export function recolored(look: CastLook, hex: string | null): CastLook {
  if (!hex) return look;
  return look.vest ? { ...look, vest: hex } : { ...look, top: hex };
}

type Stroke = { width: number; color: string; cap: "round"; join: "round" };
/** An inked tube from a to b: the outline under the fill. In silhouette both are the shadow color. */
function tube(g: Graphics, a: Point, b: Point, r: number, color: string, sil: boolean) {
  const outline: Stroke = { width: 2 * r + 2 * LINE, color: sil ? SIL : INK, cap: "round", join: "round" };
  const fill: Stroke = { width: 2 * r, color: sil ? SIL : color, cap: "round", join: "round" };
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(outline);
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(fill);
}

export function drawFigure(g: Graphics, s: Solved, look: CastLook, o: FigureOpts): void {
  const j = s.joints;
  const k = s.scale;
  const b = look.build;
  const sil = o.silhouette;
  const f = s.facing;
  const skin = tones(look.skin);
  const top = tones(look.top);
  const bottom = tones(look.bottom);
  const far = (c: string) => (sil ? SIL : tones(c).shadow);
  const sleeve = look.sleeves === "top" ? look.top : look.skin;
  const hand = look.gloves ? "#f4f3ee" : look.skin;

  // Far limbs first, a shade darker.
  tube(g, j.shoulderFar, j.elbowFar, R.arm * b * k, far(look.top), sil);
  tube(g, j.elbowFar, j.wristFar, R.arm * 0.9 * b * k, far(sleeve), sil);
  tube(g, j.wristFar, j.handFar, R.hand * b * k, far(hand), sil);
  tube(g, j.hipFar, j.kneeFar, R.leg * b * k, far(look.bottom), sil);
  tube(g, j.kneeFar, j.ankleFar, R.leg * 0.85 * b * k, far(look.bottom), sil);
  tube(g, j.ankleFar, j.toeFar, R.foot * k, far(look.shoes), sil);
  // The backpack sits on the back, away from where he faces.
  if (look.backpack) {
    const back = { x: j.chest.x - f * 46 * k, y: j.chest.y + 10 * k };
    g.roundRect(back.x - 22 * k, back.y - 60 * k, 44 * k, 120 * k, 14 * k).fill(sil ? SIL : look.backpack).stroke({ width: LINE, color: sil ? SIL : INK });
  }
  // The torso: a tapered slab from the neck to the pelvis.
  const spine = { x: j.neck.x - j.pelvis.x, y: j.neck.y - j.pelvis.y };
  const len = Math.hypot(spine.x, spine.y) || 1;
  const nx = (-spine.y / len) * k;
  const ny = (spine.x / len) * k;
  const wt = R.torsoTop * b;
  const wb = R.torsoBottom * b;
  const torso = [j.neck.x + nx * wt, j.neck.y + ny * wt, j.neck.x - nx * wt, j.neck.y - ny * wt, j.pelvis.x - nx * wb, j.pelvis.y - ny * wb, j.pelvis.x + nx * wb, j.pelvis.y + ny * wb];
  g.poly(torso).fill(sil ? SIL : top.base).stroke({ width: LINE, color: sil ? SIL : INK, join: "round" });
  if (!sil) {
    // The shadow side is the back; the uniform's details on the front.
    g.poly([j.neck.x - f * nx * wt * 0.3, j.neck.y - f * ny * wt * 0.3, j.neck.x - f * nx * wt, j.neck.y - f * ny * wt, j.pelvis.x - f * nx * wb, j.pelvis.y - f * ny * wb, j.pelvis.x - f * nx * wb * 0.3, j.pelvis.y - f * ny * wb * 0.3]).fill(top.shadow);
    if (look.vest) g.poly([j.neck.x + nx * wt * 0.7, j.neck.y + ny * wt * 0.7, j.neck.x - nx * wt * 0.7, j.neck.y - ny * wt * 0.7, j.pelvis.x - nx * wb * 0.9, j.pelvis.y - ny * wb * 0.9, j.pelvis.x + nx * wb * 0.9, j.pelvis.y + ny * wb * 0.9]).fill(look.vest);
    if (look.tie) g.moveTo(j.neck.x + f * nx * 4, j.neck.y + 8 * k).lineTo(j.chest.x + f * 10 * k, j.chest.y + 30 * k).stroke({ width: 7 * k, color: look.tie, cap: "round" });
    if (look.lanyard) g.moveTo(j.neck.x, j.neck.y + 6 * k).lineTo(j.chest.x + f * 8 * k, j.chest.y + 20 * k).stroke({ width: 3, color: "#2f4a74" }).roundRect(j.chest.x + f * 8 * k - 8 * k, j.chest.y + 20 * k, 16 * k, 22 * k, 3).fill("#f4f3ee").stroke({ width: 2, color: INK });
    if (look.braid) for (let i = 0; i < 4; i++) g.circle(j.chest.x + f * 16 * k, j.neck.y + (18 + i * 22) * k, 4 * k).fill(PALETTE.brass).stroke({ width: 2, color: INK });
    if (o.slimed) g.ellipse(j.chest.x, j.chest.y, 26 * k, 18 * k).fill("#8fbf3f").stroke({ width: 3, color: INK });
  }
  // The apron hangs from the waist over the near leg.
  if (look.apron && !sil) g.poly([j.pelvis.x + nx * wb * 0.9, j.pelvis.y + ny * wb * 0.9, j.pelvis.x - nx * wb * 0.9, j.pelvis.y - ny * wb * 0.9, j.kneeNear.x - 30 * k, j.kneeNear.y + 20 * k, j.kneeNear.x + 30 * k, j.kneeNear.y + 20 * k]).fill(look.bottom).stroke({ width: LINE, color: INK, join: "round" });
  // Near limbs.
  tube(g, j.hipNear, j.kneeNear, R.leg * b * k, bottom.base, sil);
  tube(g, j.kneeNear, j.ankleNear, R.leg * 0.85 * b * k, bottom.base, sil);
  tube(g, j.ankleNear, j.toeNear, R.foot * k, look.shoes, sil);
  tube(g, j.shoulderNear, j.elbowNear, R.arm * b * k, look.top, sil);
  tube(g, j.elbowNear, j.wristNear, R.arm * 0.9 * b * k, sleeve, sil);
  tube(g, j.wristNear, j.handNear, R.hand * b * k, hand, sil);
  if (!sil) drawProp(g, j, k, f, look, o);
  drawHead(g, s, look, o);
}

/** The tray on the near hand, the cup and the phone, the student's phone: what the role carries. */
function drawProp(g: Graphics, j: Record<JointName, Point>, k: number, f: 1 | -1, look: CastLook, o: FigureOpts) {
  const h = j.handNear;
  if (o.role === "server" && o.prop) {
    g.ellipse(h.x + f * 10 * k, h.y - 10 * k, 46 * k, 10 * k).fill("#c9ccd1").stroke({ width: 3, color: INK });
    for (const dx of [-24, 0, 24]) g.roundRect(h.x + f * 10 * k + dx * k - 7 * k, h.y - 36 * k, 14 * k, 26 * k, 3).fill({ color: "#dff3ff", alpha: 0.9 }).stroke({ width: 2, color: INK });
  }
  if (o.role === "office") {
    if (o.prop) g.roundRect(h.x - 11 * k, h.y - 30 * k, 22 * k, 28 * k, 4).fill("#f4f3ee").stroke({ width: 3, color: INK }).rect(h.x - 11 * k, h.y - 30 * k, 22 * k, 6 * k).fill("#6b3a1e");
    const p = j.handFar;
    g.roundRect(p.x - 9 * k, p.y - 20 * k, 18 * k, 34 * k, 3).fill("#1a1a1a").stroke({ width: 2, color: INK }).rect(p.x - 7 * k, p.y - 18 * k, 14 * k, 28 * k).fill({ color: "#9fd6ff", alpha: 0.9 });
  }
  if (o.role === "student" && (o.act === "idle" || o.act === "notice" || o.act === "hide")) {
    g.roundRect(h.x - 9 * k, h.y - 22 * k, 18 * k, 34 * k, 3).fill("#1a1a1a").stroke({ width: 2, color: INK });
    g.circle(h.x + 4 * k, h.y - 16 * k, 3 * k).fill("#ff2d2d");
  }
}

/** A caricature head on the neck seat: skull, ear, nose, eye, mouth, hair or hat; the front is the way he faces. */
function drawHead(g: Graphics, s: Solved, look: CastLook, o: FigureOpts) {
  const p = s.parts.head;
  const f = s.facing;
  const sil = o.silhouette;
  const len = p.length;
  const rx = R.head * look.build * s.scale * 0.9;
  const ry = len * 0.46;
  const c = Math.cos(p.rotation);
  const sn = Math.sin(p.rotation);
  // Head-local (x forward, y up) to world.
  const at = (x: number, y: number): Point => ({ x: p.x + (f * x * c - -y * sn), y: p.y + (f * x * sn + -y * c) });
  const cx = at(2 * s.scale, ry * 1.05);
  const ink = sil ? SIL : INK;
  const skin = sil ? SIL : look.skin;
  // Ear behind, then the skull.
  const ear = at(-rx * 0.9, ry * 0.95);
  g.ellipse(ear.x, ear.y, rx * 0.22, ry * 0.26).fill(skin).stroke({ width: 3, color: ink });
  g.ellipse(cx.x, cx.y, rx, ry).fill(skin).stroke({ width: LINE, color: ink });
  if (!sil) {
    const sh = tones(look.skin).shadow;
    g.ellipse(cx.x - f * rx * 0.45, cx.y + ry * 0.25, rx * 0.5, ry * 0.5).fill(sh);
    // The nose, the eye, the brow and the mouth on the front.
    const nose = at(rx * 1.05, ry * 0.95);
    const noseTop = at(rx * 0.7, ry * 1.2);
    const noseBottom = at(rx * 0.6, ry * 0.75);
    g.poly([noseTop.x, noseTop.y, nose.x, nose.y, noseBottom.x, noseBottom.y]).fill(look.skin).stroke({ width: 3, color: INK, join: "round" });
    const eye = at(rx * 0.45, ry * 1.25);
    g.ellipse(eye.x, eye.y, rx * 0.16, ry * 0.12).fill("#ffffff").stroke({ width: 2, color: INK });
    g.circle(eye.x + f * rx * 0.05, eye.y, rx * 0.07).fill(INK);
    const b0 = at(rx * 0.2, ry * 1.48);
    const b1 = at(rx * 0.7, ry * 1.5);
    g.moveTo(b0.x, b0.y).lineTo(b1.x, b1.y).stroke({ width: 4, color: INK, cap: "round" });
    const m0 = at(rx * 0.45, ry * 0.55);
    const m1 = at(rx * 0.8, ry * 0.6);
    g.moveTo(m0.x, m0.y).lineTo(m1.x, m1.y).stroke({ width: 3, color: INK, cap: "round" });
    if (look.mustache) { const u0 = at(rx * 0.5, ry * 0.7); const u1 = at(rx * 0.9, ry * 0.72); g.moveTo(u0.x, u0.y).lineTo(u1.x, u1.y).stroke({ width: 6, color: look.hair, cap: "round" }); }
    if (look.glasses) { g.circle(eye.x, eye.y, rx * 0.26).stroke({ width: 3, color: INK }); const arm = at(-rx * 0.6, ry * 1.25); g.moveTo(eye.x - f * rx * 0.26, eye.y).lineTo(arm.x, arm.y).stroke({ width: 3, color: INK }); }
    if (look.earbuds) g.circle(ear.x + f * rx * 0.06, ear.y + ry * 0.1, rx * 0.09).fill("#ffffff").stroke({ width: 2, color: INK });
    hairOn(g, at, rx, ry, look, o.hat && o.role === "bellhop");
  }
}

function hairOn(g: Graphics, at: (x: number, y: number) => Point, rx: number, ry: number, look: CastLook, hat: boolean) {
  const hair = look.hair;
  const cap = (fromX: number, toX: number, top: number, thick: number) => {
    const pts: number[] = [];
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); const q = at(fromX + ((toX - fromX) * (1 - Math.cos(a))) / 2, top + Math.sin(a) * thick); pts.push(q.x, q.y); }
    g.poly(pts).fill(hair).stroke({ width: 3, color: INK, join: "round" });
  };
  switch (look.hairStyle) {
    case "short": cap(-rx * 1.05, rx * 0.6, ry * 1.55, ry * 0.5); break;
    case "bald": cap(-rx * 1.05, -rx * 0.3, ry * 1.1, ry * 0.5); break;
    case "curly": cap(-rx * 1.1, rx * 0.7, ry * 1.5, ry * 0.75); for (let i = 0; i < 5; i++) { const q = at(-rx * 1.1 + i * rx * 0.45, ry * 1.95); g.circle(q.x, q.y, rx * 0.22).fill(hair).stroke({ width: 2, color: INK }); } break;
    case "bun": cap(-rx * 1.05, rx * 0.55, ry * 1.55, ry * 0.45); { const q = at(-rx * 1.0, ry * 1.5); g.circle(q.x, q.y, rx * 0.32).fill(hair).stroke({ width: 3, color: INK }); } break;
    case "ponytail": cap(-rx * 1.05, rx * 0.55, ry * 1.55, ry * 0.45); { const a = at(-rx * 1.05, ry * 1.5); const b = at(-rx * 1.5, ry * 0.7); g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: rx * 0.4, color: hair, cap: "round" }).moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: rx * 0.4 + 4, color: INK, cap: "round" }).moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: rx * 0.4, color: hair, cap: "round" }); } break;
    case "bob": cap(-rx * 1.15, rx * 0.6, ry * 1.5, ry * 0.5); { const a = at(-rx * 1.1, ry * 1.4); const b = at(-rx * 1.05, ry * 0.6); g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: rx * 0.5 + 4, color: INK, cap: "round" }).moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: rx * 0.5, color: hair, cap: "round" }); } break;
    case "beanie": { const pts: number[] = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); const q = at(-rx * 1.15 + rx * 1.9 * (1 - Math.cos(a)) / 2, ry * 1.35 + Math.sin(a) * ry * 0.85); pts.push(q.x, q.y); } g.poly(pts).fill("#2f3a4a").stroke({ width: 3, color: INK, join: "round" }); const r0 = at(-rx * 1.15, ry * 1.35); const r1 = at(rx * 0.75, ry * 1.35); g.moveTo(r0.x, r0.y).lineTo(r1.x, r1.y).stroke({ width: 8, color: "#3d4a5e" }); break; }
  }
  if (hat) {
    const h0 = at(-rx * 1.0, ry * 1.85);
    const h1 = at(rx * 0.75, ry * 1.85);
    const t0 = at(-rx * 1.0, ry * 2.4);
    const t1 = at(rx * 0.75, ry * 2.4);
    g.poly([h0.x, h0.y, h1.x, h1.y, t1.x, t1.y, t0.x, t0.y]).fill("#b8282e").stroke({ width: 3, color: INK, join: "round" });
    g.moveTo(h0.x, h0.y).lineTo(h1.x, h1.y).stroke({ width: 6, color: PALETTE.brass });
  }
}

type View = { root: Container; body: Graphics; shadow: Graphics; stars: Graphics; look: CastLook; mask: Graphics | null };
const SHADOW_RX = 60;
/** Dazed: three stars circling the head. */
const STARS = { n: 3, r: 40, size: 9, rate: 4 } as const;
const DAZED: ReadonlySet<CastAct> = new Set(["down", "slide", "slip", "getup"]);

export class Cast {
  readonly container = new Container({ label: "cast" });
  private readonly views = new Map<number, View>();
  private readonly crowns = new Map<number, { x: number; y: number; facing: 1 | -1 }>();

  constructor(layer: Container, ambient: number) {
    this.container.sortableChildren = true;
    this.container.tint = ambient;
    layer.addChild(this.container);
  }

  sync(prev: Snapshot, cur: Snapshot, alpha: number, time: number, screens: Furniture[]): void {
    const s = between(prev, cur, alpha);
    const seen = new Set<number>();
    for (const n of s.cast) {
      if (!n.alive) continue;
      seen.add(n.id);
      let v = this.views.get(n.id);
      if (!v) {
        const root = new Container({ label: n.spawn });
        const shadow = new Graphics();
        const body = new Graphics();
        const stars = new Graphics();
        root.addChild(shadow, body, stars);
        this.container.addChild(root);
        v = { root, body, shadow, stars, look: recolored(LOOKS[n.person], n.recolor), mask: null };
        this.views.set(n.id, v);
      }
      const hidden = n.act === "hide" || (n.hide && n.act === "windup");
      const t = n.actT + alpha * STEP;
      const pose = castPose({ role: n.role, act: n.act, t, speed: Math.abs(n.vx), onGround: n.onGround, sit: n.sit, spin: n.spin, hits: n.hits });
      const solved = solve(pose, n.facing, HEAD_SCALE, HEAD_PLATE_DEFAULT);
      const k = v.look.height / HERO_HEIGHT;
      const dy = groundShift(solved, castGround(n.act, n.onGround, n.sit));
      v.body.clear();
      v.shadow.clear();
      v.stars.clear();
      if (hidden) {
        // His shadow thrown on the lit screen: the figure, dark, scaled up and clipped to the sheet.
        const screen = screens.find((f) => f.kind === "screen" && n.x >= f.x && n.x <= f.x + f.w);
        if (!screen) continue;
        const sheet = { x: screen.x, y: screen.y, w: screen.w, h: 300 };
        // His feet a little below the sheet's bottom edge, so his head and shoulders fill it.
        v.root.position.set(n.x, sheet.y + sheet.h + 30);
        v.root.scale.set(k * 0.95);
        v.root.alpha = 0.55;
        if (!v.mask) { v.mask = new Graphics(); this.container.addChild(v.mask); v.root.mask = v.mask; }
        v.mask.clear().rect(sheet.x, sheet.y, sheet.w, sheet.h).fill(0xffffff);
        drawFigure(v.body, solved, v.look, { role: n.role, act: n.act, hat: n.hat, prop: n.prop, slimed: n.slimed, silhouette: true });
        v.root.zIndex = -1e5;
        continue;
      }
      if (v.mask) { v.root.mask = null; v.mask.destroy(); v.mask = null; }
      v.root.alpha = 1;
      v.root.position.set(n.x, n.y + dy * k);
      v.root.scale.set(k);
      v.root.zIndex = n.y;
      v.shadow.ellipse(0, -dy, SHADOW_RX * v.look.build, 14).fill({ color: 0x000000, alpha: 0.3 });
      drawFigure(v.body, solved, v.look, { role: n.role, act: n.act, hat: n.hat, prop: n.prop, slimed: n.slimed, silhouette: false });
      if (DAZED.has(n.act)) {
        const c = solved.crown;
        for (let i = 0; i < STARS.n; i++) {
          const a = time * STARS.rate + (i * Math.PI * 2) / STARS.n;
          star(v.stars, c.x + Math.cos(a) * STARS.r, c.y - 20 + Math.sin(a) * STARS.r * 0.35, STARS.size);
        }
      }
      this.crowns.set(n.id, { x: n.x + solved.crown.x * k, y: n.y + (dy + solved.crown.y) * k, facing: n.facing });
    }
    for (const [id, v] of this.views)
      if (!seen.has(id)) {
        v.mask?.destroy();
        v.root.destroy({ children: true });
        this.views.delete(id);
        this.crowns.delete(id);
      }
  }

  crownOf(id: number) {
    return this.crowns.get(id) ?? null;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}

/** A five-point star about (x, y). */
export function star(g: Graphics, x: number, y: number, r: number) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.poly(pts).fill("#ffe14a").stroke({ width: 2, color: INK, join: "round" });
}
```

(The `between` result carries `cast`, so `s.cast` has the interpolated positions and the rest of each record. Add the landing squash the design asks for: each view keeps `air: boolean`; when a member's `onGround` turns true after being false, `squashT = 0.09`; while it runs, `v.root.scale.set(k * 1.08, k * 0.92)` easing back to `k` as `squashT` runs out.)

`src/render/cast-fx.ts`:

```ts
import { Container, Graphics } from "pixi.js";
import { GRAVITY_DOWN } from "../sim/constants";
import { PALETTE } from "./palette";
import type { Particles } from "./particles";

type Flyer = { g: Graphics; x: number; y: number; vx: number; vy: number; spin: number; rot: number; life: number; landed: boolean; onLand: (f: Flyer) => void };
const INK = PALETTE.outline;

/** Props that fly off the cast when they are hit: the pillbox hat, the tray's glasses, the coffee cup. */
export class Flyers {
  private readonly root = new Container({ label: "flyers" });
  private readonly live: Flyer[] = [];
  constructor(layer: Container, private readonly particles: Particles) {
    layer.addChild(this.root);
  }
  private add(draw: (g: Graphics) => void, x: number, y: number, vx: number, vy: number, spin: number, life: number, onLand: (f: Flyer) => void) {
    const g = new Graphics();
    draw(g);
    g.position.set(x, y);
    this.root.addChild(g);
    this.live.push({ g, x, y, vx, vy, spin, rot: 0, life, landed: false, onLand });
  }
  hat(x: number, y: number, dir: 1 | -1) {
    this.add((g) => g.roundRect(-28, -14, 56, 28, 4).fill("#b8282e").stroke({ width: 3, color: INK }).rect(-28, 8, 56, 6).fill(PALETTE.brass), x, y, dir * 320, -620, dir * 9, 6, (f) => { f.vx = 0; f.spin = 0; f.rot = 0; });
  }
  glasses(x: number, y: number, dir: 1 | -1) {
    for (const [i, up] of [-700, -820, -560].entries())
      this.add((g) => g.roundRect(-7, -14, 14, 28, 3).fill({ color: "#dff3ff", alpha: 0.9 }).stroke({ width: 2, color: INK }), x + i * 12, y, dir * (120 + i * 90) + (i - 1) * 60, up, (i - 1) * 7, 3, (f) => {
        f.life = 0;
        this.particles.emit("glass", f.x, f.y, 8);
        this.particles.emit("ice", f.x, f.y, 4);
      });
  }
  cup(x: number, y: number, dir: 1 | -1) {
    this.add((g) => g.roundRect(-11, -30, 22, 28, 4).fill("#f4f3ee").stroke({ width: 3, color: INK }).rect(-11, -30, 22, 6).fill("#6b3a1e"), x, y, dir * 260, -520, dir * 8, 3, (f) => {
      f.life = 0;
      this.particles.emit("coffee", f.x, f.y, 10);
    });
  }
  update(dt: number, floorUnder: (x: number, y: number) => number | null) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const f = this.live[i];
      if (!f.landed) {
        const y0 = f.y;
        f.vy += GRAVITY_DOWN * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.spin * dt;
        const floor = floorUnder(f.x, y0);
        if (floor !== null && f.y >= floor && f.vy > 0) { f.y = floor; f.landed = true; f.onLand(f); }
      } else f.life -= dt;
      if (f.life <= 0) { f.g.destroy(); this.live.splice(i, 1); continue; }
      f.g.position.set(f.x, f.y);
      f.g.rotation = f.rot;
      f.g.alpha = f.landed ? Math.min(1, f.life) : 1;
    }
  }
}
```

`src/render/particles.ts` recipes: `glass: { speed: [200, 600], angle: [200, 340], gravity: 2200, drag: 0.5, life: [0.4, 0.7], size: [6, 3], colors: ["#ffffff", "#9fd6ff"], additive: false }`, `ice: { speed: [100, 400], angle: [160, 380], gravity: 1600, drag: 1.2, life: [0.5, 0.9], size: [6, 4], colors: ["#e8f8ff", "#bfe6ff"], additive: false }`, `coffee: { speed: [160, 520], angle: [190, 350], gravity: 1900, drag: 0.8, life: [0.3, 0.55], size: [8, 3], colors: ["#7a4a24", "#3d2412"], additive: false }`, `paper: { speed: [80, 320], angle: [0, 360], gravity: 260, drag: 2.4, life: [0.7, 1.2], size: [9, 6], colors: ["#fbf7ee", "#d9d2c4"], additive: false }`, `water: { speed: [200, 520], angle: [200, 340], gravity: 1600, drag: 0.8, life: [0.3, 0.5], size: [7, 3], colors: ["#dff3ff", "#7cc8f0"], additive: false }`.

`src/render/props.ts`: `Props.sync` also draws `s.missiles`: a pool `missiles: Graphics[]` at z 3; `drawMissile(g, m)`: a plane is a folded dart: `g.poly([-34, 0, 30, -4, 12, 6, 30, 8]).fill("#fbf7ee").stroke({ width: 3, color: INK })` plus a crease line, rotated by `m.spin`, scaled by facing (vx sign); a cup as in `Flyers.cup`'s shape rotated by `m.spin` with a short brown trail of `coffee` particles every 0.04 s (emit 1).

`src/render/look.ts`:
- `opts.nocast?: boolean`; `createGame(LEVELS, newSeed(), { cast: !opts.nocast })`.
- After `props`: `const cast = new Cast(scene.layers.play, scene.ambient); const flyers = new Flyers(scene.layers.fx, particles);`.
- In `tick`, after `props.sync(...)`: `cast.container.zIndex = y - 0.6; cast.sync(prev, cur, alpha, time, game.level.furniture); flyers.update(simDt, (fx, fy) => topUnder(fx, fy));`.
- The probe: `window.__next.cast = { acts: Object.fromEntries(cur.cast.filter((n) => n.alive).map((n) => [n.spawn, n.act])), attackers: attackers(world.cast), missiles: cur.missiles.length, planes: cur.missiles.map((m) => ({ kind: m.kind, x: m.x, y: m.y })), out: world.cast.filter((n) => n.out || !n.alive).length };`.
- `stop()`: `cast.destroy()`.

`src/render/app.ts`: the `NextProbe` type gains `cast?: { acts: Record<string, string>; attackers: number; missiles: number; planes: { kind: string; x: number; y: number }[]; out: number }`.

`src/routes/index.tsx`: `validateSearch` gains `nocast: flag(search.nocast)`; `Home` passes `nocast={!!nocast}`; `next-game.tsx` takes `nocast` and passes it to `startLook`. Check `git hash-object src/routeTree.gen.ts` afterwards.

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`. Start the dev server if it is not up (`node scripts/with-app-env.mjs vite dev --host 127.0.0.1 --port 8090 --strictPort`, in the background), open `http://127.0.0.1:8090/?next=1&dev=1`, and screenshot the first bellhop and a server at full size (`scripts/look-boards.mjs` comes in Task 12; for now `node -e` with Playwright, saving under `artifacts/`). Look at the figures: the limbs joined, the head on the neck, the props in the hands, the hat on the bellhop, nothing drawn over Hammer. Fix what looks wrong in `drawFigure` (radii, offsets, hair) before committing.

- [ ] **Step 5: Commit** `src/render src/components/next-game.tsx src/routes/index.tsx scripts/render.check.mjs`: "Draw the cast as inked stand-ins on the shared skeleton, with planes, coffee and flying props".

---

### Task 11: Effects, words, speech, sounds, the recordings and the hints

**Files:**
- Modify: `src/render/look.ts`, `src/render/bubbles.ts`, `src/render/sound.ts`, `src/render/hud.ts`, `src/game/audio.ts`, `scripts/render.check.mjs`

**Interfaces:**
- Produces:

```ts
// src/render/bubbles.ts
/** The cast's speech bubbles: a rounded box with a tail over each speaker's head, kept off Hammer's face. */
export class Speech {
  constructor(layer: Container);
  say(id: number, text: string, seconds: number): void;
  update(dt: number, crownOf: (id: number) => { x: number; y: number; facing: 1 | -1 } | null, face: Rect, view: Rect): void;
  /** How many bubbles show. */
  get count(): number;
}
export function speechLayout(size: { w: number; h: number }, crown: Point, face: Rect, view: Rect): { box: Rect; tail: Point };
// src/render/sound.ts: Sound gains taunt(target: "staff" | "student"): TauntId | null
// src/game/audio.ts: sting(), squeal(), shatter(), splash(), chime(), paper()
// src/render/hud.ts: hintOf gains the cast's hints
```

- [ ] **Step 1: Write the failing tests** (`scripts/render.check.mjs`)

```js
import { speechLayout } from "../src/render/bubbles.ts";

test("a speech bubble sits over its speaker's head and slides off Hammer's face", () => {
  const view = { x: 0, y: -1000, w: 1920, h: 1400 };
  const clear = speechLayout({ w: 300, h: 60 }, { x: 800, y: -500 }, { x: 100, y: -600, w: 80, h: 100 }, view);
  assert.ok(Math.abs(clear.box.x + 150 - 800) < 1 && clear.box.y + clear.box.h < -500, "centred above the crown");
  assert.ok(clear.tail.y > clear.box.y + clear.box.h - 1, "the tail hangs from the box");
  const near = speechLayout({ w: 300, h: 60 }, { x: 800, y: -500 }, { x: 760, y: -620, w: 80, h: 100 }, view);
  const face = { x: 760, y: -620, w: 80, h: 100 };
  assert.ok(!(near.box.x < face.x + face.w && near.box.x + near.box.w > face.x && near.box.y < face.y + face.h && near.box.y + near.box.h > face.y), "off the face");
});

test("the hints name the cast's threats in the shipped order", () => {
  const g = gameAt(4000);
  const h = g.world.hero;
  h.facing = 1;
  g.world.missiles.push({ id: 1, kind: "plane", x: 4300, y: -200, vx: -300, vy: 0, spin: 0, life: 2, phase: 0, from: 0 });
  assert.equal(hintOf(g), "Paper incoming · duck, jump or swat with H");
  g.world.missiles.length = 0;
  g.world.targets[0] = { ...g.world.targets[0], x: 4500, vx: -650 };
  assert.equal(hintOf(g), "Runaway cart · jump it, or bonk it back");
  g.world.targets[0].vx = 0;
  const k = g.world.cast.find((n) => n.spawn === "student-rail-1");
  Object.assign(k, { x: 4400, y: 0, level: 0 });
  h.lectureCd = 0;
  assert.equal(hintOf(g), "E lectures them · schooled students stop throwing paper");
  k.x = 9000;
  g.world.puddles.push({ x: 4200, y: 0, w: 100, life: 5, max: 5, kind: "snot" });
  const s = g.world.cast.find((n) => n.spawn === "server-buffet");
  assert.equal(hintOf(g), "Staff slip on puddles · stomp or bonk them while they are down");
  g.world.puddles.length = 0;
  s.act = "windup";
  s.x = 4500;
  assert.equal(hintOf(g), "H swings the mallet · hit them with the head");
  s.act = "idle";
  s.x = 9000;
  assert.equal(hintOf(g), "Find a ! crate for hot pepper");
});
```

- [ ] **Step 2: Run, expect FAIL**.

- [ ] **Step 3: Implement**

`src/game/audio.ts` (public methods, after `slip()`; `noise(duration, gain, cutoff, type?, sweepTo?)`, `blip(freq, dur, type, gain, slideTo?, delay?)`):

```ts
  /** The ! burst over an attacker: a short rising sting. */
  sting() {
    this.blip(880, 0.08, "square", 0.12, 1320);
    this.blip(1320, 0.06, "square", 0.08, undefined, 0.07);
  }
  /** Cart wheels squealing on marble. */
  squeal() {
    this.noise(0.25, 0.08, 3200, "bandpass", 2400);
    this.blip(2600, 0.22, "sine", 0.05, 1900);
  }
  /** Glasses on the floor. */
  shatter() {
    this.noise(0.18, 0.14, 6000, "highpass", 3000);
    [3136, 4186, 5274].forEach((f, i) => this.blip(f, 0.05, "sine", 0.06, undefined, i * 0.03));
  }
  splash() {
    this.noise(0.14, 0.12, 900, "lowpass");
    this.blip(240, 0.08, "sine", 0.1, 120);
  }
  /** A phone's two notes. */
  chime() {
    [1760, 2217].forEach((f, i) => this.blip(f, 0.09, "sine", 0.08, undefined, i * 0.1));
  }
  /** A paper plane leaving the hand. */
  paper() {
    this.noise(0.12, 0.08, 1800, "bandpass", 900);
  }
```

`src/render/sound.ts`: `CUES` gains `castWindup: ["sting"], castBump: ["bump"], castFreeze: ["tickSfx"], castSchooled: ["ding"], castFlee: ["slip"], castFell: ["die"], chain: ["kick"], swat: ["thud"], missile: ["paper"], castSplash: ["splash"], stomp: ["stomp"], castNotice: ["glint"], lectureLand: ["harrumph"]`; in `play`, role-aware cases before the table: `castAttack` → bellhop `squeal`, server `ding`, office `whoosh`, student `paper`; `castHit` → by `stomp` → `stomp`, `puddle` → `slip`, `shield`/`cart`/`slide`/`body`/`burst` → `kick`, else `[]` (the mallet and snot ring through their `hit` event); `missileHit` → coffee `splash`, plane `[]`. `Sound` gains `taunt(target) { const id = sound.unlocked ? bus.taunt(target) : null; if (id) played[\`voice:${id}\`] = (played[\`voice:${id}\`] ?? 0) + 1; return id; }`.

`src/render/bubbles.ts`:

```ts
const SPEECH = { size: 22, wrap: 360, padX: 16, padY: 10, above: 24, tail: 14 } as const;

export function speechLayout(size: { w: number; h: number }, crown: Point, face: Rect, view: Rect): { box: Rect; tail: Point } {
  const want: Rect = { x: crown.x - size.w / 2, y: crown.y - SPEECH.above - size.h, ...size };
  const box = placeWord(want, face, view, 4);
  const tail = { x: Math.min(Math.max(crown.x, box.x + 20), box.x + box.w - 20), y: box.y + box.h };
  return { box, tail };
}

export class Speech {
  private readonly root = new Container({ label: "speech" });
  private readonly live = new Map<number, { g: Graphics; t: BitmapText; life: number }>();
  constructor(layer: Container) {
    this.root.zIndex = 49;
    layer.addChild(this.root);
  }
  get count() { return this.live.size; }
  say(id: number, text: string, seconds: number) {
    let b = this.live.get(id);
    if (!b) {
      const g = new Graphics();
      const t = new BitmapText({ text, style: { fontFamily: "ui", fontSize: SPEECH.size, wordWrap: true, wordWrapWidth: SPEECH.wrap, align: "center" } });
      t.tint = THOUGHT;
      this.root.addChild(g, t);
      b = { g, t, life: seconds };
      this.live.set(id, b);
    }
    b.t.text = text;
    b.life = seconds;
  }
  update(dt: number, crownOf: (id: number) => { x: number; y: number; facing: 1 | -1 } | null, face: Rect, view: Rect) {
    for (const [id, b] of this.live) {
      b.life -= dt;
      const crown = crownOf(id);
      if (b.life <= 0 || !crown) { b.g.destroy(); b.t.destroy(); this.live.delete(id); continue; }
      const size = { w: b.t.width + 2 * SPEECH.padX, h: b.t.height + 2 * SPEECH.padY };
      const { box, tail } = speechLayout(size, crown, face, view);
      const onFace = overlaps(box, face);
      b.g.visible = b.t.visible = !onFace;
      b.g.clear().roundRect(box.x, box.y, box.w, box.h, 10).fill(PAPER).stroke({ width: 3, color: INK });
      b.g.poly([tail.x - 8, tail.y - 1, tail.x + 8, tail.y - 1, crown.x, Math.min(crown.y - 4, tail.y + SPEECH.tail)]).fill(PAPER).stroke({ width: 3, color: INK, join: "round" });
      b.g.rect(tail.x - 7, tail.y - 3, 14, 4).fill(PAPER);
      b.t.position.set(box.x + SPEECH.padX, box.y + SPEECH.padY);
      b.g.alpha = b.t.alpha = Math.min(1, b.life / FADE);
    }
  }
}
```

(`placeWord` and `overlaps` imported from `./words`.)

`src/render/hud.ts` `hintOf`, after the stash check and before the boost (the shipped order):

```ts
  const w = game.world;
  const near = (x: number, r: number) => Math.abs(x - h.x) < r;
  if (w.missiles.some((m) => near(m.x, 600))) return "Paper incoming · duck, jump or swat with H";
  if (w.targets.some((t) => near(t.x, 900) && Math.abs(t.vx) >= ROLLING && (h.x - t.x) * t.vx > 0)) return "Runaway cart · jump it, or bonk it back";
  const reach = lectureReach(h);
  if (h.lectureCd <= 0 && w.cast.some((n) => n.alive && n.role === "student" && n.act !== "schooled" && overlapsRect(reach, npcRect(n)))) return "E lectures them · schooled students stop throwing paper";
  if (w.puddles.length && w.cast.some((n) => n.alive && n.role !== "student" && standing(n) && near(n.x, 900))) return "Staff slip on puddles · stomp or bonk them while they are down";
  if (w.cast.some((n) => n.alive && n.role !== "student" && (n.act === "windup" || n.act === "attack") && near(n.x, 900))) return "H swings the mallet · hit them with the head";
```

`src/render/look.ts`:
- `const speech = new Speech(scene.layers.fx);` after `bubbles`; `speech.update(simDt, (id) => cast.crownOf(id), face, scene.view())` after `bubbles.update(...)`.
- `show()` gains cases (`face`, `view`, `facing` from `at`; `rolesOf = (role) => role === "bellhop" ? "hotel" : role`):

```ts
      case "castNotice":
        particles.emit("glint", e.x, e.y - 40, 3);
        break;
      case "castLine":
        speech.say(e.id, e.text, e.seconds);
        break;
      case "castWindup":
        words.say("!", e.x, e.y - 60, true, face, view);
        break;
      case "castBump":
        particles.emit("dust", e.x, e.y + 300, 4);
        break;
      case "stomp":
        particles.emit("dust", e.x, e.y, 8);
        if (e.landed) words.say("STOMP!", e.x, e.y - 60, false, face, view);
        break;
      case "castHit": {
        if (e.by === "stomp" || e.by === "puddle") words.say(e.by === "puddle" ? "WHOA!" : "OOF!", e.x, e.y - 90, false, face, view);
        else if (e.by !== "mallet" && e.by !== "snot") words.say("WHAM!", e.x, e.y - 90, false, face, view);
        if (e.role === "bellhop") { const n = world.cast.find((c) => c.id === e.id); if (n && !n.hat && n.hits === 1) flyers.hat(e.x, e.y - 150, e.dir); }
        if (e.role === "server" && e.down) { flyers.glasses(e.x + e.dir * 20, e.y - 60, e.dir); particles.emit("water", e.x, e.y - 60, 12); }
        if (e.role === "office" && e.down) flyers.cup(e.x, e.y - 40, e.dir);
        if (e.role !== "student" && e.down) comeback(e.role);
        break;
      }
      case "castFreeze":
        words.say("+50", e.x, e.y - 40, false, face, view);
        break;
      case "castSchooled":
        words.say("SCHOOLED", e.x, e.y - 40, false, face, view);
        break;
      case "lectureLand":
        words.say(e.schooled ? "SCHOOLED!" : "LISTEN UP!", e.x + facing * 120, e.y - 20, false, face, view);
        taunt(e.schooled ? "student" : "staff");
        break;
      case "castFlee":
        taunt("student");
        break;
      case "castFell":
        words.say("OUT OF ORDER", e.x, e.y - 400, true, face, view);
        speech.say(e.id, CAST_LINES.office.shaft, 1.2);
        break;
      case "chain":
        words.say(e.oneUp ? "1UP!" : String(e.points), e.x, e.y - 60, e.count >= 4, face, view);
        break;
      case "swat":
        particles.emit("paper", e.x, e.y, 14);
        if (e.kind === "plane") { words.say("SWAT!", e.x, e.y - 50, false, face, view); taunt("student"); }
        break;
      case "missileHit":
        if (e.kind === "coffee") particles.emit("coffee", e.x, e.y, 12);
        else particles.emit("paper", e.x, e.y, 4);
        break;
      case "castSplash":
        particles.emit("coffee", e.x + facing * 40, e.y, 16);
        break;
```

with

```ts
  /** One of the owner's recordings for a besting, when the bus allows one; its caption is spoken. */
  const taunt = (target: "staff" | "student") => {
    const id = sound.taunt(target);
    if (id) bubbles.say(TAUNT_LINES[id].text, 2);
    return !!id;
  };
  /** Knocking out staff: a recording, or sometimes a written comeback as a thought, never over a recording. */
  const comeback = (role: CastRole) => {
    if (taunt("staff") || bubbles.text || Math.random() >= 0.45) return;
    const lines = STAFF_COMEBACKS[role === "bellhop" ? "hotel" : role];
    bubbles.think(lines[Math.floor(Math.random() * lines.length)].text, 1.6);
  };
```

- [ ] **Step 4: Run, expect PASS**: `npm run test:next`; `npx tsc --noEmit`; `npx eslint ...`. In the browser at `?next=1&dev=1`, walk into the first bellhop's shove and bonk a server: see the ! burst, hear the sting and the squeal, see the hat fly, the glasses arc and shatter, the speech bubbles over heads and off Hammer's face, the SCHOOLED! word, and a taunt recording's caption when one plays. Screenshot each at full size under `artifacts/` and look before committing.

- [ ] **Step 5: Commit** `src/render src/game/audio.ts scripts/render.check.mjs`: "Give the cast its effects, speech, sounds, Hammer's recordings and the hints".

---

### Task 12: The cast browser check, the boards, the older checks, the docs and the definition of done

**Files:**
- Create: `scripts/cast-browser.check.mjs`
- Modify: `src/render/boards.ts`, `scripts/look-boards.mjs`, `scripts/next-browser.check.mjs`, `scripts/moves-browser.check.mjs`, `scripts/acts-browser.check.mjs`, `scripts/run-browser.check.mjs`, `README.md`, `docs/superpowers/specs/2026-10-12-r2b-lobby-cast-design.md`, `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md`

- [ ] **Step 1: The older checks keep their ground.** `next-browser.check.mjs`, `moves-browser.check.mjs`, `acts-browser.check.mjs` and `run-browser.check.mjs` add `&nocast=1` to every `?next=1` address they open (the shipped-address assertion in `next-browser` stays as it is). Run all four against `http://127.0.0.1:8090/` and expect PASS.

- [ ] **Step 2: Write the cast browser check** (`scripts/cast-browser.check.mjs`, in the pattern of `run-browser.check.mjs`: the same launch, `waitFor`, `tp`, `hold`, `shot` helpers, `errors` collected, screenshots under `artifacts/`):

```js
// Plays the lobby's cast at /?next=1&dev=1: the first bellhop's shove jumped and bonked back, a server
// knocked down, the lecture on students and staff, a plane swatted, the shield bowling, the projector ambush.
```

1. Boot `?next=1&dev=1`, wait for `play`. `const cast = () => page.evaluate(() => window.__next.cast);`
2. **The runaway cart.** Walk right (`hold(["ArrowRight"], 600)`), wait for `run.events.castWindup >= 1` (8 s) and `castAttack >= 1` (3 s). Poll `window.__next.moves.carts` every 30 ms; when a cart's x is within 320 px of `hero.x` and moving (compare two polls), `hold(["Space"], 350)`. Wait 1.5 s. Assert `run.patience === 2` (no pip) and `shot("cast-cart.png")`.
3. **Bonk it back.** When the cart has stopped (two polls equal), teleport to `cart.x - 230` facing right (`hold(["ArrowRight"], 50)`), press `KeyH`; wait for `run.events.castHit >= 1` and `run.events.chain >= 1` (3 s): the bellhop bowled by his own cart; `shot("cast-bonk-back.png")`.
4. **The server.** `tp(4300)`; wait for `castWindup` to grow (6 s); poll the server's act via `cast().acts["server-buffet"]`; when it is `attack`, wait until she is within 300 px (poll `window.__next.run.x` against her x, which the probe does not carry: instead press `KeyH` 0.25 s after `attack` starts, when she has closed 105 px of her 400 px start, and again 0.45 s later if `castHit` has not grown). Assert `castHit` grew and `sound.played.bonk >= 1` and `sound.played.shatter >= 1` within 2 s; `shot("cast-server.png")` 0.5 s after the hit (glasses in the air).
5. **The lecture on staff.** `tp(8900)` (server 2 patrols 8600–9600), face right; wait for her within 600 px (poll `castWindup`); press `KeyE`; assert `castFreeze >= 1` within 1.5 s; `shot("cast-freeze.png")`.
6. **The lecture on students and a swat.** `tp(8300, -520)`; face right (`hold(["ArrowRight"], 60)`); press `KeyE`; assert `castSchooled >= 1` within 1.5 s and `sound.played["voice:problem"] + sound.played["voice:man-balls"] >= 0` (a recording may or may not play: the chance is 0.5; assert only that `moves.bubble` is one of the retorts or a taunt caption or null). `shot("cast-schooled.png")`. Then wait for `cast().missiles >= 1` (12 s: student 3 at 9650 throws along the balcony); when a plane (`cast().planes`) is within 260 px ahead of `run.x`, press `KeyH`; assert `swat >= 1` within 3 s; `shot("cast-swat.png")`.
7. **The shield.** `dev.give("bucees")`; `tp(7700)`; `hold(["ArrowRight", "ShiftLeft"], 900)`; assert `castHit` grew with `cast().acts["bellhop-floor"]` in `fly|down|getup|leave` or `out` grew; `shot("cast-shield.png")`.
8. **The projector ambush.** `tp(13700)`; `shot("cast-screen.png")` after 300 ms (the silhouette on the sheet); `hold(["ArrowRight"], 500)`; wait for `castWindup` to grow and `cast().missiles >= 1` (3 s); wait 1.5 s; assert `window.__next.moves.puddles >= 1`; `shot("cast-coffee.png")`.
9. Assert `errors` is empty and write `artifacts/cast-check.json` with the event counts.

Run: `BROWSER_SMOKE_CHANNEL=chrome node scripts/cast-browser.check.mjs http://127.0.0.1:8090/`; expect PASS. Timing-dependent steps poll at 30 ms; if a step is flaky, widen its wait, never remove its assertion.

- [ ] **Step 3: The boards** (`src/render/boards.ts`, `scripts/look-boards.mjs`):

`BoardSpec.kind` gains `"cast" | "cast-lobby" | "cast-fx"`.

- `cast`: a sheet of 8 rows (the persons, `LOOKS`) by 10 columns (the acts `idle`, `walk`, `notice`, `windup`, `attack`, `fly`, `down`, `getup`, `slip`, `frozen`; students get `schooled` and `duck` in place of `slip` and `frozen`), each cell a `Graphics` drawn by `drawFigure` from `castPose` at a representative `t` (a third of `ACT_SECONDS`, or 0.4 for loops), solved and grounded as `Cast.sync` does, scaled by the look's height, cell 420 by 420 as the clip boards. The hat on, the props in hand, facing left.
- `cast-lobby`: the lobby frames with the live cast, six camera positions: `{ x: 700, cx: 1300 }` (the bellhop and the cart), `{ x: 4300, cx: 4800 }` (the server at BUFFET), `{ x: 5100, cx: 5600 }` (the office worker by the elevators), `{ x: 8300, y: -520, cx: 8700, cy: -420, zoom: 0.88 }` (the students at the rail over bellhop 2), `{ x: 12500, y: -160, cx: 13200 }` (the tables), `{ x: 13800, cx: 14300 }` (the screen with the silhouette). Reuse `lobby()` with the frame list; the cast draws itself from the game's world as placed (one may have noticed him by the time a frame is taken: fine).
- `cast-fx`: a sheet of the effects at rest: the ! burst (a `Words` instance saying "!"), three stars, the hat, a glass, the cup, a plane, a coffee puddle and a water puddle, a confetti burst (particles stepped 0.2 s), each in a 260 px cell with a caption.

`look-boards.mjs`: add `"cast"`, `"cast-fx"` to the loop (saved as `cast.png`, `cast-fx.png`) and a `cast-lobby` branch saving `cast-lobby-1..6.png`. Render them (`node scripts/look-boards.mjs http://127.0.0.1:8090/ cast,cast-lobby,cast-fx`) and look at every cell at full size: limbs joined, no pose folded through itself, props in hands, the hat on the bellhop's head, the silhouette on the sheet, nothing over Hammer's face in the lobby frames. Step through `fly`, `slip` and `getup` by rendering the `cast` board at three `t` values if a cell looks wrong.

- [ ] **Step 4: Docs.** `README.md`, "The rebuild" section: a new "The lobby's cast" subsection after "The lobby (1-1)": who they are, their attacks and tells, what beats whom, the lecture, the chain, points, the two-attackers rule, the `?nocast=1` flag, the new check and boards; the validation paragraph lists `cast.check.mjs` and `cast-browser.check.mjs`. The R2b design §5 gets "as built" numbers if any placement moved; the main spec §8.3 gains one paragraph: "The cast arrived in R2b-1 (2026-10-12): …" naming the eleven and pointing at the R2b design.

- [ ] **Step 5: Definition of done.** `npx tsc --noEmit`; `npx eslint src/render src/components src/routes src/sim src/art scripts`; `npm run test:game` (72) and `npm run test:next`; dev 8090 with `BROWSER_SMOKE_CHANNEL=chrome`: `next-browser`, `moves-browser`, `acts-browser`, `run-browser`, `cast-browser`, `look-boards` (all boards), `game-browser-check`, `start-screen.check`, `browser-smoke`; `node scripts/with-app-env.mjs vite build`; preview 8091 (`vite preview --port 8091 --strictPort`): `next-browser`, `run-browser`, `cast-browser`, `browser-smoke` against the dev baseline (a "mobile: canvas disappeared" divergence is the 1 s probe racing production's 3 s start, not a regression); `git status` shows only the owner's two files; `git hash-object src/routeTree.gen.ts` is `dceedffd…`. Then one fresh reviewer on the most capable model over the R2b-1 range and its fixes.

- [ ] **Step 6: Commit** `scripts src/render README.md docs/superpowers/specs`: "Check the cast in the browser, board it, and document R2b-1". Push.

- [ ] **Step 7: Report.** Send the owner `cast.png`, `cast-lobby-1..6.png`, `cast-fx.png` and the `cast-*.png` screenshots (phone-sized copies of anything over 8,000 px); describe the cast and what to try; list every decision from this plan's list and the design's.
