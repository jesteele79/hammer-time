# Hammer Time rebuild: look, feel and world

Design spec, 2026-10-10. Written for implementation sessions that have not seen
the planning conversation. This spec replaces the 2026-10-09 expansion spec for
everything about rendering, Hammer's body and animation, the cast, the pig, the
world, game feel, Hungry Hungry Hammer and Fare Darts. The expansion spec stays
the source for the rules of Marriott status (its §7), the Skills Lab (§9), the
main-run flavor (§10) and the extra banquet tables (§6 "Tables"); those get
built on the foundation described here, in the later phases of §16.

## 1. What this is

Hammer Time is a personal side-scrolling platformer about Hammer: a man in his
mid-sixties who trains surgeons on medical devices, treats everyone as a
trainee, lives in hotels, restaurants, campuses and Southwest planes, and is
rude to all of it. He fights with a wooden mallet and snot rockets, powers up
on Coke Zero, mixed nuts and Buc-ee's, says "absolute bullshit" when hurt, and
wears an Affliction shirt unless the venue puts him in a costume. He steals
food. He is a status snob. The game is bonkers and fun.

The current build (branch `claude/hammer-pass`) has the rules, the recordings,
the story and the venues, drawn in a 384 by 216 virtual space scaled five times
onto the screen with photo cut-outs and a pixel font. The owner has approved
three inked caricature portraits of Hammer (`art/reference/`) as the look, has
an RTX 4070 laptop, and wants the game to look and feel like a modern game
built for that hardware. This spec is that rebuild. Rules survive; the way they
are drawn, animated and controlled does not.

## 2. Hard limits (never break these)

1. **His head is the owner's art and is never edited.** The in-game head is a
   plate cut from `art/reference/hammer-profile.webp` (or the clean plates the
   owner generates from it, `art/incoming/hammer/head-profile*.png`). It may
   be scaled, flipped horizontally, moved and rotated as a whole with the body,
   and swapped whole for another owner-made plate (an expression). Nothing is
   ever drawn over the face, no pixel of it is recolored, tinted, filtered or
   masked, and no limb, prop, particle, word or bubble may cover the face box.
   The existing face-clearance test is rebuilt for the new rig and must cover
   every clip of every pose.
2. **The Affliction shirt is the base outfit.** Costumes (scrubs, suit, banquet
   bib) are drawn body layers swapped per venue; the base is restored outside
   that venue.
3. **The six recordings are the only spoken lines** (`absolute-bullshit.mp3`
   via `damage-voice.wav`, and the five taunts in their pools). Every other
   Hammer line is a thought bubble. NPC lines are speech bubbles.
4. **The pig keeps its design**: a pale pink stuffed toy with stitched velour
   panels, broad snout, upright pear body, short limbs. It is redrawn as a rig
   so it can move; it is not restyled.
5. **Coke Zero, mixed nuts and Buc-ee's keep their identity and effects**
   (cool-off and 100 cans for a life; +3 smash charge; ten seconds
   invincible). They are redrawn in the ink style.
6. **The owner's files are never modified**: everything under `art/reference/`
   and `art/incoming/` (both committed), `public/absolute-bullshit.mp3` and
   `public/voice/*`. `art/manifest.json` records a SHA-256 for each, written
   only by the sync tool when a file is first added, and a check verifies
   every file still matches.
7. The app stays a TanStack Start app deployed to Vercel under the rules in
   `AGENTS.md` (keep `public/__grok/`, `server/`, `PreviewHostBridge`, no
   `.env`, no auth, no database). The renderer is client-only.

## 3. Art direction

**Inked caricature.** Thick clean black outlines, flat cel fills with one
shadow tone and one highlight tone, small white specular glints, saturated but
natural color, no gradients inside shapes, no painterly texture. The portraits
define it; everything drawn in code must sit beside them without looking like
a different artist.

Rules for code-drawn art (characters, props, furniture, UI illustrations):

- Outline weight 4 px at a character height of 340 px (scale with the object:
  0.012 of its height, minimum 2 px). Outlines are pure black `#101010`. Round
  joins and caps.
- Each fill has exactly three tones: base, shadow (base darkened 22 percent
  and shifted slightly toward blue), highlight (base lightened 18 percent).
  Shadow shapes are hard-edged, placed as if lit from the upper left. One or
  two white glints (opacity 0.9) on glossy things.
- Skin tones, cloth colors and the mallet's wood are taken from the portraits
  and stored once in `src/render/palette.ts`.
- No gradients inside a shape. Gradients are allowed only for light (lamps,
  bloom, vignette), reflections and sky.
- Backgrounds are busier and lower-contrast than foregrounds: far planes use
  desaturated fills and thinner lines (2 px); the play plane uses full color
  and full lines; foreground planes are darker and slightly blurred.
- Photos are never shown raw. A photo used as a far plane first goes through
  the ink filter (§14.3).

Scale: Hammer stands 340 world px tall at camera zoom 1. The world is drawn in
pixels at a 1920 by 1080 design resolution; the renderer scales to the real
screen and device pixel ratio (§5.2).

Typography (loaded from Google Fonts, the only allowed stylesheet source):
`Barlow Condensed` 700/800 for display (titles, comic words, signs),
`Inter` 400/600 for HUD and body text. The pixel font is gone.

## 4. Architecture

```
src/
  sim/        rules, physics, entities, quests: pure TypeScript, no DOM, no Pixi
    world.ts        the Game's stepping loop, modes, state (replaces engine.ts rules)
    physics.ts      bodies, floors, slopes, one-way platforms, sweeps
    hero.ts         Hammer's state machine and moves
    enemies.ts      staff, students, planes, pig
    items.ts        pickups, blocks, doors, checkpoints
    rig/            skeleton, poses, clips, blending, IK (geometry only)
    quests/         quest.ts (interface), hungry/, fares/
    levels/         level data (lobby.ts, restaurant.ts, campus.ts, arena.ts, ...)
    audio-events.ts a queue of named cues the renderer/audio drain
  render/     PixiJS: scene graph, camera, layers, lighting, particles, drawing
    app.ts          Pixi application, resize, DPR, quality tiers
    scene.ts        layer stack, camera, culling
    character.ts    draws a rig instance (sprites per part, head plate, costume)
    pig.ts, cast.ts props.ts, backdrop.ts, lighting.ts, particles.ts, text.ts
    quests/         hungry-scene.ts, fares-scene.ts
    look/           the look-test scenes used for sign-off boards
  art/        asset registry: slots, loaders, the ink filter, cut-and-register
  game/audio.ts (kept), game/taunts.ts (kept), game/lines.ts (kept)
  components/ React shell: start screen, HUD, cards, tally, touch pad
```

- The sim runs at a fixed 120 Hz step (two steps per frame at 60 fps) and
  exposes a read-only snapshot each frame. The renderer interpolates positions
  between the last two snapshots. The sim never imports Pixi or `window`.
- The React shell owns the DOM: menus, HUD, overlays, touch pad. It talks to
  the sim through `GameHooks` (mode, hud payload, records) as today, and to
  the renderer only to mount the canvas and set quality.
- Audio stays the current `AudioBus` (procedural SFX, the recordings, the
  taunt pools). The sim emits cues (`{ kind: "bonk", x, y }`); the renderer
  drains them to the bus and to particles.
- Input: one `Input` object (held and pressed per action, pointer position
  for aim) sampled once per frame by the shell from keyboard, touch pad and
  gamepad (Gamepad API: left stick/d-pad move, A jump, X hammer, B snot, Y
  lecture, RB towel, LB super, Start pause). Keys stay as today.
- Tests construct `World` and rigs directly (node:test, `tsx`-style loader as
  today). The 72 existing checks are the behavior contract: each is ported to
  the sim API or consciously retired in the plan, never silently dropped.

Migration: the new build lives at route `/next` until the full run plays end
to end (phase R3); then `/` serves it and `src/game/engine.ts`, `rig.ts`,
`hero.ts`, `scenery.ts`, `sprites.ts` and the old checks are deleted. Until
then both builds compile.

## 5. Rendering

### 5.1 Stack

PixiJS 8 (`pixi.js`, `pixi-filters`), WebGPU preferred with WebGL 2 fallback,
antialiasing on. One `Application` mounted in the shell's play area; the
canvas is `position: absolute; inset: 0` and the DOM HUD floats above it.

### 5.2 Resolution and quality

- Design resolution 1920 by 1080 world units at zoom 1. The stage scales to
  fit the play area, letterboxing never: the camera widens or narrows the
  visible world instead, keeping Hammer the same screen height fraction on any
  aspect ratio from 4:3 to 21:9. Phones in portrait show the world at a
  smaller zoom with the HUD stacked (the shell's job).
- Device pixel ratio up to 2 (the owner's 2880 by 1800 screen renders at full
  native resolution).
- Quality tiers: `ultra` (everything), `high` (no floor reflections), `medium`
  (no bloom, half-res light layer, DPR 1), `low` (no lighting layer, no
  particles beyond 200). The renderer starts at `ultra`, measures frame time,
  and steps down one tier when the 1-second average exceeds 15 ms, never
  stepping back up within a session. The tier is shown in the pause screen and
  can be forced in `localStorage` (`hammer-time-quality`).

### 5.3 Layers (back to front)

1. `sky`: a flat color or soft gradient per venue.
2. `far`: the inked venue backdrop (`<venue>-far`), parallax 0.25.
3. `mid`: standing scenery against the wall (columns, plants, counters),
   parallax 0.55, drawn in the venue's muted palette.
4. `play`: floors, furniture Hammer stands on, pickups, doors, checkpoints,
   NPCs, the pig, Hammer, projectiles. Parallax 1. Depth-sorted by a per-object
   `z` (feet y by default) so he walks behind a counter's near edge and in
   front of a wall sign.
5. `light`: lamp glows and spotlights, additive, bloomed (§5.5).
6. `fx`: particles, comic words, thought and speech bubbles, score pops.
7. `fore`: foreground pieces (a pillar, a plant, a cart) at parallax 1.35,
   darkened 30 percent and blurred 2 px, never where they would cover Hammer's
   face for more than 0.3 s (the sim keeps a "fore-free" band around his head:
   fore objects fade to 20 percent opacity while the head box overlaps them).
8. `post`: vignette (radial, 18 percent at the corners), a 2 percent film
   grain that does not animate under reduced motion.

### 5.4 Camera

- Follows Hammer with a damped spring (stiffness 7/s horizontally, 5/s
  vertically), a look-ahead of 260 px in his facing direction that eases in
  over 0.5 s when he moves and out over 0.8 s when he stops, a vertical dead
  zone of ±110 px, and faster vertical follow while falling (vy > 900).
- Zoom: 1.0 default; 0.88 in wide areas (level data marks `camera.zoom`
  zones); 1.12 pushes in for 0.4 s on the super smash burst and on boss hits;
  the pig arena holds 0.92 and frames both fighters.
- Shake: trauma-based (trauma 0..1, shake = trauma squared, decays 2.5/s),
  translation up to 18 px and rotation up to 0.6 degrees. Off under reduced
  motion (replaced by a brief 4 px translation).
- Bounds: the camera never shows outside the level's `bounds` rectangle.

### 5.5 Lighting, shadows, reflections

- Every level lists `lights`: `{ x, y, radius, color, intensity, flicker? }`.
  Lamps draw as radial sprites on the `light` layer with `add` blending, then
  `AdvancedBloomFilter` (threshold 0.55, bloom scale 0.9, brightness 1.0)
  applied to that layer only. The play layer is tinted by a soft ambient
  (`ambient` per venue, for example `#ffe9c9` at 0.92 in the lobby).
- Characters get a blob shadow (an ellipse, 0.55 of their width, alpha 0.35,
  scaled by height above the floor) and, in venues with glossy floors, a
  reflection: the play layer rendered to a texture, mirrored at the floor
  line, alpha 0.22 fading to 0 over 240 px, masked to the floor's `glossy`
  ranges. The lobby's marble and the airport's terrazzo are glossy; carpet is
  not.
- Code blue strobes, the kettle whistle's steam and the super smash burst use
  the light layer (a full-screen flash sprite at 35 percent, 0.08 s).

### 5.6 Particles

A pooled system (`fx/particles.ts`): emitters with position, spread, speed,
gravity, drag, life, size curve, color pair, additive flag. Named recipes:
`dust` (steps, landings, slides), `sweat`, `snot` (trail and splat), `crumbs`,
`stuffing` (the pig's white fluff), `sparks` (mallet on steel), `paper`
(shredded planes), `steam`, `confetti` (tally). Cap 3000 alive; under reduced
motion, 400 and no additive glow.

### 5.7 Text and words

`BitmapText` from the two fonts, generated at startup at 64 px and scaled.
Comic words ("BONK!", "HAMMER TIME!") are `Barlow Condensed` 800 in a burst
shape with a 4 px outline, scaled in with an overshoot (1.25 then 1.0 over
0.14 s) and a ±6 degree tilt, kept off Hammer's face by the same
least-slide rule as today. Thought bubbles are drawn clouds (four lobes, two
puffs toward the back of his head) with `Inter` 600; speech bubbles are
rounded boxes with a tail. All placement goes through one face-safe layout
module and is covered by a sweep test (§15).

### 5.8 Performance budget

60 fps at 2880 by 1800, DPR 2, `ultra`, with the lobby fully populated (12
NPCs, 400 particles, reflections, bloom) on the owner's laptop, and 60 fps at
1080p DPR 1 `medium` on an integrated GPU. Draw calls under 300 per frame:
all characters' part textures live in one atlas; the backdrop planes are at
most 4 textures each; particles are one batched container.

## 6. Hammer

### 6.1 The head

- Plates: `neutral` (required; cut from `hammer-profile.webp`, or the owner's
  `head-profile.png`), and optional `angry`, `hurt`, `smug`, `bored`, `chomp`
  from `art/incoming/hammer/head-profile-<name>.png`. Plates are registered
  once (§14.2): the neck anchor (where the head attaches), the face box (eyes
  to chin, for the clearance test) and the crown point (for thoughts). The
  game uses the plate at head height 0.28 of HERO_HEIGHT (95 px) facing left,
  flipped for right.
- Expression use: `hurt` on accepted damage for 0.6 s, `angry` during the
  lecture and the super smash, `smug` on a steal or a bonk that lands, `bored`
  from the watch check onward, `chomp` during the banquet dive's grab. If a
  plate is missing the neutral plate stays; nothing else changes.
- The head sprite is the last thing drawn in Hammer's container except during
  the towel wipe, when the towel passes behind the head (never in front).
  Thought bubbles, comic words and NPC speech are placed off the face box.

### 6.2 The body rig

The body is the owner's painting, bent like skin over a skeleton (revised
2026-10-10 after the cut-out paper doll read as messy and inorganic). The
skeleton's rest pose is the painted pose, joint for joint: the joints are
measured on the keyed body plate (`art/cuts/hammer-body.json`, `rig.joints`)
and `src/sim/rig/skeleton.ts` holds the same points in rest units, 296 from the
near sole to the neck (a test keeps the two in step). Both arms hang forward
with soft elbows; the far leg stands a step ahead and, by the painting's
perspective, 25 units higher, on a floor line of its own. Every clip rotation
is a turn away from that pose, so standing still shows the painting exactly.

The painting splits into five layers, drawn back to front: far arm, far leg,
near leg, torso (shirt, sleeves, waistband, any towel), near arm. Each takes
the painted pixels inside its polygon that no layer in front of it took (front
to back: near arm, torso, near leg, far leg, far arm; arms keep only skin
unless the sleeve is long). Where a layer runs on behind one drawn over it (the
shirt behind the near arm, the far shoe's heel behind the near shoe, the far
upper arm behind the torso), it is painted in from its own pixels: a push-pull
fill for cloth, the limb's own cross-section carried along the bone for an
arm. Drawn at rest, the layers rebuild the painting pixel for pixel.

Each layer is a grid mesh (14 px cells) over its pixels with up to four bone
weights per vertex: a limb follows its chain of joints with smooth blends a
few dozen pixels wide at the elbow, knee and wrist and a hand-over from the
pelvis or chest at its root; the torso follows the spine, and its short
sleeves hand their weight to the upper arm down the sleeve so the hem and
the bare arm stay together. The renderer moves every vertex with its bones
each frame (`src/render/skin.ts`). The head plate and the mallet stay sprites
on top. Grounding stands the lowest sole on its floor line while planted.

Costumes are four paintings in the same pose with per-costume overrides (the
suit's arms take their long sleeves; the banquet towel hangs forward of the
shirt). The near hand is drawn closed into a fist (a texture variant of the
near-arm layer: the fingers folded away a third of the way down, the new edge
inked and shaded) and holds the mallet out in front, ready to swing: the elbow
at his side, the forearm level, the handle through the fist at 68 degrees to
the hand (the way a power grip crosses the palm), the butt showing below the
fist and the head up ahead of his face. The fist never turns on the handle;
the hold rides with the chest, and the slide points the mallet ahead over his
legs.

Proportions and silhouette: stocky, a slight belly, the shirt hem below the
waist, the shorts to the knee, white-and-navy running shoes. The near forearm
carries the wristwatch.

### 6.3 Animation

- A pose is a map of joint rotations (degrees), a root offset, a lean (pelvis
  rotation), a squash/stretch pair for the whole body and a head tilt. Clips
  are keyframe tracks over `u` in [0, 1] with eases (the existing `track`
  function moves here). Clips: `idle`, `walk`, `run`, `jump`, `fall`, `land`,
  `crouch`, `slide`, `swing`, `super`, `snot`, `wipe`, `lecture`, `dive`
  (banquet), `coil`, `throw` (darts), `hurt`, `tumble`, `watch`, `tap`.
- Blending: a base locomotion clip chosen by state, with an action overlay
  (upper body for `swing`/`snot`/`lecture`/`throw`; whole body for `super`,
  `dive`, `wipe`, `hurt`, `tumble`) blended in over 0.06 s and out over
  0.12 s.
- Procedural layers on top: breathing (chest ±1.5 percent, 0.4 Hz), lean into
  horizontal acceleration (up to 9 degrees), head stabilization (the head
  counter-rotates so its tilt never exceeds 8 degrees from level), foot IK
  (feet stay planted on the floor profile, including slopes, within 2 px),
  landing squash (0.92 by 1.08 over 0.09 s), jump stretch (1.06 by 0.95),
  belly and sleeve follow-through (a critically damped spring on the torso
  part's scale, 0.04 amplitude).
- The mallet's contact path is sampled from the same rig the renderer draws,
  as today; the strike cut between two sim steps stays (the drawn arm never
  crosses the face, the swept collision follows the full arc).

### 6.4 Moves (rules unchanged, feel rebuilt)

Mallet swing (0.42 s, hit-stop 0.06 s, trauma 0.35), super smash (hop, load,
slam on landing with a squat so the mallet head meets the floor, slow motion
`timeScale 0.25` for 0.25 s at the burst, trauma 0.8, zoom punch), snot rocket
(three charges, hot with pepper, puddles trip staff), towel wipe (heat drains,
sweat spray, glint), lecture (cone in front, students schooled, staff frozen),
crouch and slide under passes, the watch check, foot tap and harrumph when
idle. All numbers in `src/sim/constants.ts`; timing constants from
`combat.ts` carry over.

## 7. The cast and the pig

### 7.1 NPC rigs

The same skeleton with proportion presets (`tall`, `stocky`, `slight`) and
costume part sets: server (vest, apron, tray in the near hand), bellhop (red
jacket, pillbox hat), office worker (shirt, tie, lanyard, coffee), student
(hoodie, backpack, earbuds), nurse (scrubs, badge reel, clogs), surgical tech,
resident, administrator, gate agent, Lifetime Titanium guy. Heads: a
code-drawn head generator (`render/parts/head.ts`: skull shape, skin tone,
hair cap or hat, glasses, beard; six variants per role, chosen by spawn seed)
in the ink style, or an owner-painted head plate from
`art/incoming/cast/<role>.png` sliced by the same tool. NPCs walk, rush, carry,
throw, get bonked (a ragdoll tumble: the rig goes limp, rotates, bounces once,
slides) and slip on puddles (feet out, land flat, stars).

Behavior rules carry over from the current engine: servers warn then rush,
hotel staff take two hits and can be knocked along the floor, office workers
are the smaller part of the cast, students stay outside combat and throw paper
after a wind-up, lectures school students and freeze staff. The later phases
add the nurses, techs, the gate agent and Titanium guy per the expansion spec.

### 7.2 The pig

A rig of its own: body (pear, 420 px tall at zoom 1), head with the broad
snout, two ears, two stubby arms, two legs, a curly tail, stitched panel lines
drawn as part of the fills. Face: two button eyes and a snout with nostrils
that can squint, widen and go to X-stitches (its face is drawn, so it can
emote). States and motion: `idle` (breathing, 0.5 Hz, ±2 percent), `windup`
(lean back 12 degrees, squint, 0.5 s), `charge` (lean forward 18 degrees, legs
cycle at 6 Hz, dust), `hop` (stretch 0.9 by 1.15 in the air, squash 1.2 by 0.8
on landing with trauma 0.5), `hurt` (flash white 0.08 s, wobble, a tuft of
stuffing), `recover`, `defeated` (deflate to 0.85 height over 1.2 s, stuffing
at two seams, X eyes). The rules (12 HP, at least 3 bonks and 3 snots, pepper
refill, locked exit) do not change. Owner-painted poses from
`art/incoming/pig/<state>.png` replace the drawn states one by one when
present, with the same squash/stretch applied to the sprite.

## 8. The world

### 8.1 Level format

Levels are TypeScript data in `src/sim/levels/`, in world units:

```ts
type Level = {
  id: string; name: string; world: string; venue: VenueId;
  length: number;                       // world px
  bounds: Rect;                         // camera limits
  spawn: Point; exit: Exit;             // exit: a door, or the boss arena's gate
  floor: FloorSegment[];                // { x0, x1, y0, y1 } straight or sloped; gaps are pits
  platforms: Platform[];                // one-way: { x0, x1, y, kind: "counter" | "shelf" | "balcony" | ... }
  solids: Rect[];                       // walls, counter bodies
  passes: Rect[];                       // low ceilings: slide under
  movers: Mover[];                      // escalators, carts, gurneys: platforms with velocity
  props: PropInstance[];                // visual only, with plane and z
  pickups: Pickup[]; crates: Crate[];   // Coke Zero, nuts, Buc-ee's, pepper crates (seeded placement kept)
  npcs: NpcSpawn[]; students: StudentSpawn[];
  doors: Door[]; checkpoints: Checkpoint[];
  signs: Sign[]; lights: Light[];
  camera: { zoom?: number; zones: CameraZone[] };
  backdrop: { far: string; mid: string[]; fore: string[]; ambient: string; sky: string };
  music: MusicTheme;
  boss?: BossSpawn;
};
```

Physics: AABB bodies against floor segments (with slopes up to 30 degrees),
one-way platforms (drop through with ↓ + jump), solids, passes (the crouch
collider 200 px tall fits a 220 px pass), movers (carry the body), pits (fall
to death below `bounds.bottom`). Seeded reward placement keeps today's rule:
anchors on floors and shelves, every reward type in every route, the first
pepper crate guaranteed early.

### 8.2 Scale and length

Each venue is 14,000 to 18,000 px long (7 to 9 screens at zoom 1), takes 4 to
6 minutes, has two checkpoints, three elevation bands (floor, counters and
tables at 180 px, balconies and mezzanines at 520 px) and at least one set
piece. The time allowance stays 420 s.

### 8.3 Venues

**Hotel lobby (1-1).** Act 1: the entrance and front desk (a long marble desk
to jump, bell to bonk, a bellhop with a luggage cart that rolls when bonked),
seating islands as platforms, a BUFFET door, the time clock behind the desk.
Act 2: the elevator bank and a grand staircase (a 30-degree slope) up to a
mezzanine balcony that runs above the lobby floor (two routes: floor with
staff, balcony with paper), an escalator down (a mover), the AIRPORT SHUTTLE
door at the porte-cochere, the M CLUB door (locked until Platinum). Act 3: the
conference wing (long tables, a projector screen that staff hide behind, a
service corridor pass) to the exit.

**Restaurant (1-2).** Dining room (tables and booths as platforms, a host
stand), the kitchen pass (a counter with heat lamps, the service pass to slide
under, a swinging door that knocks), the line (steel counters, a flat-top that
burns: heat +20/s while standing on it, a walk-in freezer that cools: heat
−30/s), the loading dock (a ramp, stacked crates, a dumpster) to the exit.

**Campus (1-3).** The quad (steps, a fountain rim as a platform, lamp posts,
students on benches throwing paper), the dining commons (serving counters,
tray-return conveyor as a mover, a mezzanine seating deck), the library steps
(a long stair up to the exit with students firing down).

**The pig arena (1-4 for now; 1-5 after the Skills Lab).** A hotel gift shop
at night: a cash counter, plush shelves as platforms, a spotlight on the
floor; the exit stays locked until the pig is beaten; pepper refills on the
left after damage.

**Side rooms.** The staff stash (a stockroom with a shelf route to the
Buc-ee's case, the return cart), the M CLUB lounge and the Buc-ee's rest stop
(expansion spec §7 and §10) use the same format.

### 8.4 Objects

- **Checkpoints** are wall-mounted punch clocks with a "BREAK" card; walking
  past punches the card (a thunk, the card turns gold, the clock glows). The
  label is a real font at 28 px. The HUD shows "Checkpoint saved" for 2 s.
- **Doors** (quests, stash, rooms) are drawn doors with a lintel sign in
  `Barlow Condensed` and a glowing ↓ when Hammer stands in front; a spent door
  shows a THANK YOU card. Entry rules as today.
- **Pickups**: the Coke Zero can, the nut bag and the Buc-ee's bag as inked
  props (owner art if present) with a bob, a glint and a pickup burst.
- **Crates**: wooden `!` crates that split open; the pepper crate steams.
- **Signs**: venue signs are set dressing in the backdrop's palette; hint signs
  ("Run + ↓ to slide") are small floor decals that fade after the first time
  the move is used in a run.
- **Furniture** Hammer stands on is drawn in the play plane with perspective
  (a top face and a front face), materials (marble, wood, steel, cloth) and a
  contact shadow.

## 9. Game feel

Starting values, tuned in R1's feel pass against these targets: a jump clears
1.15 Hammer heights; a run crosses a screen in 2.6 s; he stops within 0.2 s
from a run; landings feel weighty but never sticky.

| Thing | Value |
|---|---|
| Gravity | 3300 px/s² rising, 4600 falling; apex float: 0.5 gravity when abs(vy) < 160 |
| Jump | v0 1520; releasing the button caps vy at −620 |
| Walk / run | 400 / 640 px/s; ground accel 4400, air 2600, friction 5600; run needs the run button or 0.4 s of held direction on a gamepad stick past 0.9 |
| Coyote / buffer | 0.10 s / 0.12 s |
| Slide | 800 px/s decaying to 480, under passes; crouch walk 240 |
| Hero collider | 110 by 300 standing, 110 by 200 crouched |
| Hit-stop | 0.06 s mallet, 0.08 s super, 0.04 s damage |
| Time scale | 0.25 for 0.25 s on the super burst; 0.6 for 0.3 s on the pig's defeat |
| Knockback | staff 1100 px/s plus 600 up, tumbling; Hammer on damage 540 back, 500 up |

Feedback on every action: a sound, a particle burst, a comic word or score
pop, camera trauma scaled to the hit, a white flash on the thing hit (tint to
white for 0.06 s), hit-stop. Heat shows on Hammer as sweat drops, a red tint on
the vein mark only (never on the head plate) and steam at the top.

## 10. HUD and shell

The React shell is restyled in the same language: dark slate panels, gold
accents from the Affliction palette, `Barlow Condensed` display type. The HUD
shows score, Coke Zero count with the can icon, lives as small portrait pips
(the three-quarter portrait), the venue and clock, heat and smash meters, snot
pips and patience pips, the hint line. Cards and tallies carry the
three-quarter portrait. The start screen shows the key art (owner's
`brand/key-art.png`, or the lobby look scene with Hammer and the pig rendered
by the engine into an image at startup), the venue cards with engine-rendered
thumbnails, the Side quests row, bests, mute, help and quality. Touch pad
unchanged in function, restyled. All of it must fit 390 by 844 and 844 by 390
with no horizontal overflow, ten touch buttons.

## 11. Hungry Hungry Hammer

The toy, with Hammer in it: four eaters around one table, food dumped into the
middle, everyone lunging at once, mash to lunge, chomp what you cross back to
your plate.

### 11.1 Scene

A round banquet table seen from above at 35 degrees: an ellipse 1500 by 700
world px centered on screen, a white cloth with a gold rim, a lazy Susan ring
of chafing dishes around the center that the chute dumps onto. Hammer sits at
the left end facing right (profile head); the three rivals sit at the far
side's left and right (facing toward the center, so drawn facing right and
left) and at the right end (facing left). Nobody sits at the near side, where
the camera is, so every character is drawn from the side and no back views are
needed. Plates sit in front of each eater. The chute hangs
over the center. The ballroom backdrop behind, the carpet below, a chandelier
light on the light layer. The server walks the rim. Hammer wears the banquet
bib costume.

### 11.2 Food

Items are discs (radius 26 to 34 by kind) on the table surface with 2D
physics: velocity, friction 2.4/s, elastic collisions between discs
(restitution 0.6), bounce off the rim (restitution 0.7), a dump drops items at
the center with random outward speed 300 to 700 px/s. Values and kinds per
appendix B of the expansion spec (shrimp 80 ... check −400), drawn from the
owner's food sheet or inked code plates. Dumps: 24 appetizers at 0 s, 12 at 10
and 20 s; 16 entrees at 25 s, 10 at 35 s; 14 desserts at 42 s (the dessert cart
crashes in from the right rim and spills them), 10 at 50 s; the last 8 seconds
are a frenzy: the chute pours 3 items per second. Specials (Coke Zero, nuts,
Buc-ee's, hot sauce, to-go box, the check) drop once each at random times
after 5 s. Round 60 s.

### 11.3 The lunge

- Tap (jump, fire or the Jump button): the dive clip; the hand travels along a
  lane from his plate toward the center, 520 px in 0.14 s, holds 0.04 s,
  returns in 0.10 s. Everything the hand's 110 px wide sweep crosses is
  chomped: it flies to his plate (0.25 s arc) and scores on arrival. Lunges
  can be repeated as fast as every 0.3 s; holding the button does not repeat.
- Hold up to 0.5 s: a charged dive, reach growing linearly to 1180 px (the
  far rim), with a marker on the cloth; a charged dive that reaches a rival's
  plate robs its top item (+100 YOINK). Food in the path is chomped on the way.
- Aim: ↑ and ↓ (or the stick) swing the lane up to ±30 degrees from his axis
  before a dive; the lane is drawn faintly while a direction is held.
- Two hands meeting (his and a rival's sweep overlapping in the same 0.1 s)
  bounce both back empty and scatter the food between them (sparks, "CLASH!").
- Bonk (hammer): the mallet smacks the rim in front of him: food within 300 px
  jumps away from him toward the center (so rivals lose their near pile too),
  a rival whose hand is in that zone is stunned 2 s, the server within 70 px
  of his rim dumps his tray (4 items) and leaves for 15 s, suitcases in his
  lane are slammed off.
- Duck (↓): under the table edge; paper planes arc over.

### 11.4 Rivals

Student (reaction 0.55 s), bellhop (0.40), nurse (0.28); each lunges at food
within 400 px of its plate after its reaction, mashing in bursts of 2 to 4
lunges; anger +1 per theft, −1 per 8 s, reaction −20 percent per level (min
0.15 s); paybacks as today: the student winds up and throws paper along the
table at Hammer, the bellhop drops a suitcase in Hammer's lane for 4 s, the
angry nurse slaps a hand entering her zone (1 s stun, "Sanitize!"). Rivals'
plates are stacks Hammer can rob. The server buses settled food on the rim
("Are we still working on that?").

### 11.5 Scoring, grades, rewards, lines, audio, tables

Value totals plus combos (grabs within 1.2 s: x2 from the fifth, x3 from the
tenth), a chomp counter, the check −400, the to-go box doubling the next five
grabs, grades COMPED ≥ 3000, GOOD TIPPER ≥ 2000, SPLIT THE CHECK ≥ 1200, WATER
ONLY, rewards and the full-belly rule, Hammer's thought lines, the audio cues,
the `banquet` table now and `dining-hall`, `brisket-counter`, `cafeteria` and
Lifetime Titanium guy later: all as in the expansion spec §6 unless this
section says otherwise. Hammer's reach growth (+10 px per item, cap) applies
to the tap reach: 520 base, cap 760.

### 11.6 Tests

Disc physics stays inside the ellipse; a dump scatters; a tap sweep chomps
what it crosses and nothing behind the hand; mash cadence is capped at one
dive per 0.3 s and a held button never repeats; charged reach reaches a plate
a tap cannot; clash bounces both hands; the bonk scatters and stuns; rivals'
reactions and anger; paybacks; the server; the frenzy; the round ends at 60 s
with a result; grades and rewards; the dive and chomp poses pass face
clearance at every reach and lane angle.

## 12. Fare Darts

Darts with surgical scalpels at a Southwest route map, from the AIRPORT
SHUTTLE door in the lobby or the start screen. One round is one sterile tray
of ten scalpels.

### 12.1 Scene

Gate B7, SAT. The gate backdrop (window, plane, seats) behind; the board on
the wall center-right: a rounded panel 1180 by 720 world px with a drawn
cartoon US map (appendix C of the expansion spec gives the polygon and the 23
cities), city dots with three-letter codes in `Barlow Condensed` 26 px, a
"YOU ARE HERE" sticker on SAT, a boarding-pass printer at the board's bottom
left with a tray, the podium with the gate agent at the bottom right, a
stanchion belt in the foreground. Hammer stands at the left, three-quarters
toward the board, a scalpel in the near hand and the tray of scalpels on a
cart beside him (the count visible: ten slots). The mallet leans on the cart.

### 12.2 Aim and throw

- A crosshair sweeps the board on a Lissajous path: `x = cx + 540 sin(w t)`,
  `y = cy + 300 sin(1.5 w t + 0.7)`, `w` 1.4 rad/s, rising 8 percent per
  throw. It is drawn as a scalpel-shaped reticle with a faint trail.
- Steady hand: holding run (or a two-finger touch) slows `w` to 0.35 of its
  value while a steady meter drains (2.5 s per round, refilling 0.2 s per
  booking); the reticle tightens visibly.
- Throw: any action button or a tap. The throw clip: the near arm cocks over
  the shoulder and whips forward (0.3 s; the head stays clear); the scalpel
  leaves the hand at the whip's end, flies to the reticle's point in 0.22 s on
  a slight arc with two spins and a motion trail, sticks with a thunk, wobbles
  for 0.4 s, and the board shakes 6 px. The camera pushes in 4 percent on
  release and back on the stick.
- Scoring is point-in-rect against live tags with a 2 px pad, decided at the
  moment of release (the point the reticle was on).

### 12.3 Fares and tags

A tag spawns every 0.9 s on a random untagged city (never SAT), at most 4 live,
lifetime 2.6 s with a flicker in the last 0.6 s. Fare = 39 + round(distance
from SAT, normalized, × 260), rounded up to end in 9, clamped 49 to 249; flash
sales (20 percent of spawns) halve it. Classes: Wanna Get Away (< $100: tag
90 by 50 px, 300 + (100 − fare) × 2 points), Anytime ($100 to 199: 120 by 60,
150 points), Business Select (≥ $200: 150 by 70, 60 points, "I don't PAY
Business Select. I AM business select."). Booking the same city twice in a
round is a Companion Pass: double. A booking prints a boarding pass (city,
class, boarding position) that slides out of the printer into the tray with a
tick; the tag flies to the printer. A miss sticks in the drywall: "That's a
$400 demo unit."

### 12.4 The A-List ladder

Boarding position 0 to 179 mapped to A1–A60, B1–B60, C1–C60, shown as a
vertical ladder beside the board with a pass sliding up it. Start C60; each
booking moves up 10; a miss drops a full group (+60, clamped). Reaching A1
once per round triggers A-LIST PREFERRED: the ladder flashes gold, the
remaining scalpels score double, the agent says "Now boarding... just Mr.
Hammer." Lines on the way: "A16. Right where I belong.", "I don't do group
C.", "Companion Pass? I fly alone.", "Rapid Rewards. Rapidly."

### 12.5 Hazards and gags

- Weather delay: a cloud drifts over a random third of the board at 3 s and
  7 s for 3 s; tags under it can't be booked (the scalpel sticks, no points,
  "Denver. Of course.").
- Ground stop: once per round a red X sits on a tagged city for 2 s; hitting
  it is −200 and the agent says "Sir, that flight is cancelled."
- Gate agent crossing: once between throws 4 and 8 she walks across the
  podium with her clipboard for 1.4 s; a scalpel that would land on her
  bounces off the clipboard and is lost: "Sir, you can't do that here."
- ASSIGNED SEATING tag: once per round between throws 5 and 9, 1.6 s, +500,
  "BRING BACK OPEN SEATING."
- BAG FEE tag: once per round, +300, "Bags used to fly FREE."
- Hammer's thoughts are thought bubbles; the agent's lines are speech.

### 12.6 Round end, grades, rewards, audio, tests

After the tenth scalpel resolves: a tally with the printed passes fanned out,
the total, and a grade: A-LIST PREFERRED (A1 reached), A-LIST (≥ 7 bookings),
B GROUP (4 to 6), C GROUP (≤ 3). Rewards: the score; +3 coins per Wanna Get
Away booked; +1 life if A1 was reached. Practice bests in
`hammer-time-best-fares`. Audio: `whoosh` on throw, `thunk` (low noise plus a
90 Hz blip), `print`, `ding` on bookings, `boom` on A-List Preferred; the gate
muzak theme. Tests (`fares.check`): tag sizes and points by class; the
crosshair path is deterministic and steady-hand slows it within its budget;
a throw at a live tag books and a throw elsewhere misses; ladder math; A1
doubles once; companion pass; cloud, ground stop, agent crossing; the round
ends after 10; grades and rewards; the throw clip passes face clearance.

## 13. Lines and voice

`src/game/lines.ts` stays the single table of Hammer's lines with the six
recordings as the only clips; the spoken-or-thought switch and the caption
rules from phase 0 carry over into the new renderer's bubbles. NPC lines are
speech bubbles.

## 14. Assets and the art pack

### 14.1 Slots

Every drawable has a slot name and a code-drawn default. `src/art/registry.ts`
lists slots; at startup the loader checks `art/incoming/<section>/<name>.png`
(copied to `public/art/` by a build step, `scripts/art-sync.mjs`, which also
cuts, registers and atlases) and uses the owner's art when present. The art
pack request (`art/ART-REQUEST.md`, `art/outgoing/`) lists every slot and
prompt. Nothing blocks on art.

### 14.2 Cut and register

`scripts/art-cut.mjs` turns a green-screen image into a transparent cut-out:
chroma key on the green (hue 90 to 150, saturation > 0.5), a 2 px despill on
the edge, auto-crop with an 8 px margin, and for the head plates a registration
record (`neck` anchor: the lowest point of the neck outline's center; `face`
box: from the brow line to the chin, found as the bounding box of the
non-green pixels between the two horizontal lines the tool marks by the
hairline and the chin; `crown`: the topmost point). Expression plates are
aligned to the neutral plate by maximizing outline overlap (search ±24 px and
±4 percent scale) and rejected with a message if the best overlap is under
0.92. For A-pose bodies it slices at the joint lines (shoulder, elbow, wrist,
hip, knee, ankle) found from the pose's known proportions and writes part
textures and pivot points. For the pig poses it crops and records the feet
line. All outputs go to `public/art/` and are never edited by hand; the tool adds
each new source file's SHA-256 to `art/manifest.json` and refuses to overwrite
an entry whose file has changed, which is how an accidental edit to owner art
is caught.

### 14.3 The ink filter

For photos used as far planes until owner art exists: a build-time Python/Node
step (`scripts/ink.mjs` with `sharp`, or PIL) that quantizes colors to 12
levels per channel after a 5 px median blur, draws Sobel edges as black at 3
px where the edge magnitude exceeds 0.3, desaturates 20 percent and lifts the
blacks 10 percent so the result sits behind full-contrast characters.

### 14.4 Audio

The recordings and `AudioBus` stay. New cues: `thunk`, `print`, `chomp`
(exists), `slide`, `ding`, `clash`, `punch` (the time clock), `stuffing`.
Music themes per venue as in the expansion spec §10 (lobby muzak, bossa,
lo-fi, hospital, boss, gate, lounge) on the same scheduler.

## 15. Testing

1. **Sim checks** (`scripts/sim.check.mjs` and per-feature files): every
   behavior in the current 72 checks that still applies, ported to the sim
   API; physics on slopes, one-way platforms, movers and passes; every venue
   traversable by a scripted driver with staff active; the boss fight; doors,
   checkpoints, rewards; both quests as in §11.6 and §12.6.
2. **Rig checks**: face clearance for every clip at 400 samples each, for the
   near arm, the far arm, the mallet, the towel path and the scalpel; head
   tilt never beyond 8 degrees; foot IK keeps feet within 2 px of the floor
   on every slope in every level; part continuity (no joint gap wider than
   1 px at any sampled pose).
3. **Placement sweeps**: thoughts, speech, comic words, score pops and
   foreground fades keep the face box clear across the whole view.
4. **Protected files**: every file in `art/manifest.json` (the portraits,
   everything the owner dropped into `art/incoming/`, the mp3 and the WAVs)
   still hashes to its recorded SHA-256.
5. **Browser checks** (installed Chrome): the app boots with WebGPU or WebGL,
   renders content (sampled pixels differ across the frame), logs no errors,
   holds 55 fps or better over 5 s in the lobby on the dev box, drops a quality
   tier when forced to; the start screen, HUD, cards, tally and touch pad at
   1280 by 800, 390 by 844 and 844 by 390; a scripted run through the lobby;
   both quests end to end.
6. **Look boards**: `scripts/look-boards.mjs` renders and saves under
   `artifacts/`: Hammer in every clip (6 frames each) in each costume and
   expression; the pig in every state; every NPC; each venue at three camera
   positions; both quests at four moments. Every phase's report includes its
   boards; the owner signs off on R0's board before R1 starts.
7. **Performance**: a frame-time probe (`window.__kiln.frameMs`) and the
   budget in §5.8 checked in the browser check.

## 16. Phases

Each phase is planned with the writing-plans skill, executed with TDD, and
ends green on §15 with a report and look boards. The game stays playable at
every step; the old build serves `/` until R3.

- **R0 Foundation.** The sim/render split with the old rules ported to
  `src/sim`; the PixiJS app, layers, camera, lighting, particles, text; the
  art registry, the cut tool and the ink filter; the Hammer rig with the
  neutral head plate and the code-drawn Affliction body; `idle`, `walk`,
  `run`, `jump`, `fall`, `land`; the lobby's far plane and a flat floor; the
  look scene at `/next`. Ends with the R0 look board for sign-off.
- **R1 Hammer.** Every clip, costumes, expressions, procedural layers, the
  mallet and all moves with their feel; the HUD restyle; the feel pass against
  §9; rig and face tests.
- **R2 The lobby.** The level format, physics, the full lobby with its set
  pieces, the four lobby NPC rigs with behaviors, pickups, crates, checkpoints,
  doors, the stash; the lobby playable start to finish.
- **R3 The run.** Restaurant, campus, the arena and the pig; the full shift
  end to end; `/` switches to the new build; the old engine is deleted.
- **R4 Hungry Hungry Hammer** (§11), the BUFFET door, the Side quests row.
- **R5 Fare Darts** (§12), the AIRPORT SHUTTLE door.
- **R6 Marriott status and the lounge** (expansion spec §7).
- **R7 The Skills Lab** (expansion spec §9) with the scrubs costume and the
  hospital cast.
- **R8 Flavor and tables**: venue music, staff tricks, food in the main run,
  the Buc-ee's rest stop, the dining-hall, brisket-counter and cafeteria
  tables, Lifetime Titanium guy (expansion spec §10 and §6).

## Appendix A: what carries over unchanged

`src/game/audio.ts`, `taunts.ts`, `lines.ts`, the combat timing constants,
the level reward-seeding rule, the six recordings and their pools, the HUD
payload shape (extended), the React shell's structure (restyled), the browser
check pattern, the expansion spec's §7, §9, §10 and the table rules of §6.

## Appendix B: what is removed

`src/game/engine.ts` (its rules move to `src/sim`, its drawing is gone),
`rig.ts`, `hero.ts`, `scenery.ts`, `sprites.ts`, `thought.ts`, `layout.ts`,
`people.ts`, the 384 by 216 view, the pixel font, the photo cut-out rig and
its PNGs (`public/hero-*.png` stay in the repo untouched but unused), the
tile grid, the 1-D banquet table.
