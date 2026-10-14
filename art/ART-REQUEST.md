# Hammer Time art request

What to generate with an image tool, in the order it is needed, with the prompt
for each piece and what to check before sending it back. Everything here plugs
into a fixed slot in the game; anything that does not come back gets a
code-drawn stand-in in the same style, so no piece blocks the build.

The three portraits already in `art/reference/` are the style and the face.
Every new image must match them.

**Delivered 2026-10-10:** batch 1 (Hammer) — `head-profile.png` with the five
expression plates, `head-three-quarter.png`, the four bodies, `mallet.png`,
`towel.png` and `wristwatch.png` — all under `art/incoming/hammer/`, hashed
and registered. Batches 2 to 6 are still open.

## 1. Rules that apply to every image

**Consistency recipe.** Use the same tool that made the three portraits. Attach
`art/reference/hammer-profile.webp` and `art/reference/hammer-three-quarter.webp`
as reference images on every Hammer request, and attach the matching reference
listed per item for everything else. Start every prompt with this style block,
word for word:

> Inked caricature illustration. Thick clean black outlines, flat cel shading
> with one shadow tone and one highlight tone, small white specular glints,
> saturated but natural colors, no gradients, no painterly brushwork, no
> photorealism, no 3D render look. Same artist and same style as the reference
> image.

Generate a few, keep the one that matches the reference best, and reject the
rest. Ten minutes picking saves a day of fixing.

**Technical rules.**

- One subject per image. No collages or grids unless an item says "sheet".
- Background: a plain, flat, bright green like a green screen, no texture, no
  gradient, no floor shadow on the background. (If the tool can export real
  transparency, use that instead and say so.)
- Largest size the tool offers; at least 1024 px on the short side. Portrait
  orientation for standing characters, landscape 3:1 or wider for backdrops.
- No text, letters, logos, signatures or watermarks anywhere, except where the
  item asks for them (the Affliction shirt, signs).
- Nothing cropped: the whole subject inside the frame with margin all round,
  feet included for full bodies.
- Return files named exactly as listed, in a folder per section below. WebP
  or PNG, no JPEG.

**What "profile" means.** Facing left, like `hammer-profile.webp`. The game
flips him to face right, so one side is enough. Both arms and both legs must be
visible in full-body profiles (near limbs in front, far limbs showing behind).

## 2. Hammer (needed first)

Canonical face: the clean-shaven mustache look of the two portraits. The
glasses-and-scowl panel in `hammer-expressions.webp` is a different face; if you
would rather he wore that one in the game, say so and generate section 2.2 in
that face instead, in profile.

### 2.1 Clean head plates

These replace cutting the existing portraits out of the wood background.

- `hammer/head-profile.png`: the exact `hammer-profile.webp` head and neck, same
  framing, on the flat green background, and without the jacket and shirt
  collar (cut the image at the base of the neck; a bare neck is fine, the
  game's shirt covers it).
  Prompt addition: "Head and neck only, in strict left-facing profile, cut off
  cleanly at the base of the neck, no collar, no clothing."
- `hammer/head-three-quarter.png`: the same for `hammer-three-quarter.webp`
  (keep the jacket and shirt in this one; it is the menu portrait).

### 2.2 Expression heads (profile)

Same head, same angle, same framing as `head-profile.png`, one change each.
These are swapped in whole, never edited, so they must line up: same size, same
position of the ear and chin.

- `hammer/head-profile-angry.png`: "brow pulled down, jaw set, eyes narrowed,
  mouth a tight line, furious but contained."
- `hammer/head-profile-hurt.png`: "eyes wide, mouth open mid-shout, eyebrows
  up, caught off guard." (This is the "absolute bullshit" face.)
- `hammer/head-profile-smug.png`: "chin up, one eyebrow raised, small
  satisfied smirk, looking down his nose."
- `hammer/head-profile-bored.png`: "half-lidded eyes, mouth flat, the face of
  a man checking his watch."
- `hammer/head-profile-chomp.png`: "mouth wide open about to bite, eyes locked
  forward." (For the banquet.)

Checks: ears, nose and chin in the same place as the neutral plate when the
images are stacked; same outline weight; nothing else changed.

### 2.3 Full body, A-pose, for the animation rig

The body is cut into parts and jointed, so the pose has to show every part
clearly.

- `hammer/body-affliction.png`: "Full body in strict left-facing profile,
  standing straight, feet flat and slightly apart, near arm held out and down
  at about 30 degrees from the body with the hand open, far arm visible behind
  the body in the same position. Black Affliction t-shirt with the blue rose
  and wing print and the word AFFLICTION across the chest, dark blue athletic
  shorts to the knee, white and navy running shoes, white ankle socks.
  Mid-sixties, stocky, the same man as the reference. No mallet in this one."
  Checks: a clear gap between the near arm and the torso; both shoes fully
  visible; the shirt hem below the waist; no hands behind the back.
- `hammer/body-scrubs.png`: the same body, same pose, "green hospital scrubs
  with a V-neck top, a white badge clip on the chest, the same shoes".
- `hammer/body-suit.png`: the same body, same pose, "black suit jacket open
  over the pink patterned dress shirt from the reference, no tie, dark
  trousers, black shoes".
- `hammer/body-banquet.png`: the Affliction body with "a white cloth napkin
  tucked into the collar like a bib".

Checks: the four bodies share the same height, shoe position and arm angle
when stacked; only the clothes differ.

### 2.4 The mallet and props

- `hammer/mallet.png`: "A heavy wooden croquet-style mallet: a thick cylinder
  head of rough-grained pale wood with dark end grain, a long straight oak
  handle with a worn grip, lying diagonally. Same ink style." Checks: the
  whole head and the full handle in frame.
- `hammer/towel.png`: "A white hotel hand towel with a thin blue stripe,
  hanging loosely from a point at the top, slightly creased."
- `hammer/wristwatch.png`: "A gold wristwatch with a cream dial, side view,
  band open." (Small; any size.)

## 3. The pig

Reference: `public/boss-pig-reference.webp` (the stuffed toy). Attach it to
every pig request. It should still read as the same soft toy: pale pink velour,
visible stitched panels, broad snout, upright pear body, short limbs.

- `pig/idle.png`: "The pink stuffed pig from the reference, standing upright
  in left-facing profile, relaxed, arms at its sides, same ink style as the
  Hammer portraits."
- `pig/windup.png`: "the same pig leaning back on its heels, squinting, about
  to charge."
- `pig/charge.png`: "the same pig leaning far forward mid-run, arms back,
  cheeks puffed."
- `pig/hop.png`: "the same pig in the air, legs tucked, body stretched tall."
- `pig/hurt.png`: "the same pig flinching, eyes squeezed shut, a tuft of white
  stuffing popping from a seam."
- `pig/defeated.png`: "the same pig slumped and half deflated, stuffing
  showing at two seams, eyes as flat X-stitches, still cute."

Checks: all six the same height and the same pink; the snout the same shape in
each; seams in the same places.

Status (2026-10-14, R3b): replaced by one painting and its edits (R3 design §6.3, briefed in
`art/outgoing/batch-r3-codex.txt` section 3): `pig/pig-body.png` in velour, every limb clear of the
body, is cut by `art/cuts/pig.json` into seven layers on a skeleton of its own and bent like the
cast; `pig-squint`, `pig-charge`, `pig-hurt` and `pig-defeated` are face edits swapped whole on
its head; `pig-stuffing.png`'s three tufts fly from its hits. All in and in the game, in the gift
shop. Check a new pig painting with `node scripts/art-grid.mjs pig`.

## 4. Backdrops (one per venue)

Wide scenes, no people, no text, painted in the ink style. These sit at the
back of the world; the game draws the floor, the furniture Hammer stands on and
everything in front. So: **show the walls and what hangs on or stands against
them, and stop at the floor line.** Use the photo listed as the reference for
layout and mood, but the result must be illustration, not a filtered photo.

For each, generate three images: `far` (walls, windows, ceiling, far
furniture, 3:1 landscape), `mid` (things that stand against the wall:
columns, plants, counters, screens, on green, 3:1 landscape, so I can place
them as separate planes) and `fore` (one or two large foreground objects on
green: a plant, a pillar, a luggage cart). Name them `backdrops/<venue>-far.png`,
`-mid.png`, `-fore.png`.

- `lobby`: reference `public/hotel-corridor.webp`. "A grand hotel lobby wall:
  warm wood paneling, brass lamps, a long front desk, framed art, tall windows,
  a brass luggage cart, potted palms."
- `restaurant`: reference `public/hotel-restaurant-bg.jpg`. "A busy hotel
  restaurant and open kitchen pass: tiled wall, hanging copper pans, a heat
  lamp pass window, stacked plates, a bar with bottles."
- `campus`: reference `public/campus-common.webp`. "A college dining commons:
  brick and glass wall, bulletin boards covered in flyers, a long serving
  counter, hanging pendant lights, a quad visible through the windows."
- `arena`: reference `public/boss-pig-reference.webp` for the pig only. "A
  hotel gift shop and plush toy wall at night: shelves of stuffed animals, a
  neon OPEN sign, a glass door, a cash register counter."
- `ballroom`: "A hotel ballroom wall for a banquet: red drapes with gold swags,
  a chandelier, a long buffet table against the wall with chafing dishes, a
  dessert cart."
- `gate`: "An airport gate area: floor-to-ceiling window with a plane at the
  jet bridge, a gate podium with a monitor, rows of seats, a departures board
  with no readable text."
- `hospital`: "A hospital skills-lab corridor: pale green walls, a wood wall
  rail, frosted doors with small windows, fluorescent panels, an IV pole and a
  parked gurney against the wall."
- `lounge`: "A hotel executive lounge: dark wood, a breakfast buffet counter,
  a coffee machine, a wall of windows, leather chairs."
- `buccees`: "A giant travel-center interior: a jerky wall, a brisket counter
  with a heat lamp, a wall of snacks, a bright beaver-mascot mural with no
  text."

Status (2026-10-13, R3a): the venues' walls are now three straight-on walls a venue
(`<venue>-far-1..3.png`, each cut at its edge pilasters) with `-mid` and `-fore` sheets of
standing pieces, briefed in `art/outgoing/batch-2-backdrops.txt` and
`art/outgoing/batch-r3-codex.txt` sections 4 and 5. In and in the game: the restaurant's
three walls, its mid and fore sheets; the campus's three walls, its mid and fore sheets.

Status (2026-10-14, R3b): the gift shop's two walls (`arena-far-1`, `-2`) and its sheets (five mid
pieces, two fore), and the lobby's three walls (`lobby-far-1..3`) and its sheets (five mid, two
fore) are cut and in the game; the lobby's inked photo and drawn columns are now only its
fallback. Every venue of the shift stands on painted walls.

## 5. The cast

**The lobby's four roles (R2b, 2026-10-12): the brief is `art/outgoing/batch-3-cast.txt`.**
The design is `docs/superpowers/specs/2026-10-12-r2b-lobby-cast-design.md` §6. Each person
copies Hammer's own body image (`art/incoming/hammer/body-affliction.png`) for pose, framing
and style ("pose-locked": strict left profile, both arms forward and down about 30 degrees
with open empty hands and a gap at the belly, feet flat with the same small stagger), so they
cut and rig like him; each keeps their own face, build, height and clothes. Hands empty, no
props (the game draws the tray, glasses, coffee, phone, planes and cart), the bellhops
bareheaded.

- `cast/bellhop-1.png` first, as a test; then `bellhop-2`, `server-1`, `server-2`,
  `office-1`, `office-2`, `student-1`, `student-2` (two different people per role).
- `cast/bellhop-hat.png`: the red pillbox hat on its own, side view.
- Optional, later: `cast/<person>-silly.png`, each body edited with only the face changed
  (eyes crossed, mouth slack).

The later venues' cast (nurse, gate agent, tech, resident, administrator, Lifetime Titanium
guy) will follow the same pose-locked brief when their phases come:

- `cast/nurse.png` (reference `public/scrubs.png`): "A nurse in teal scrubs with a badge reel,
  clogs, hair in a bun."
- `cast/gate-agent.png`: "A Southwest-style gate agent: dark blue polo, grey trousers,
  lanyard."
- `cast/tech.png`: "A surgical tech in navy scrubs and a scrub cap, mask pulled down under the
  chin."
- `cast/resident.png`: "A young resident doctor in a short white coat over scrubs,
  stethoscope."
- `cast/administrator.png`: "A hospital administrator in a grey suit, ID badge."
- `cast/titanium.png`: "A smug business traveler in a navy suit, mid-sixties, silver hair."

Checks: the same pose and framing as `hammer/body-affliction.png` (the arm angle, the gap at
the belly, the foot stagger, the soles' height in the frame); nothing in the hands.

Status (2026-10-12): the eight lobby bodies and the hat are in, made with Codex from
`art/outgoing/batch-3-codex.txt`, and in the game. Still open: the optional face edits
(`<person>-silly.png`), and the later venues' cast.

Status (2026-10-13, R3a): the restaurant's and the campus's new people are briefed in
`art/outgoing/batch-7-r3-cast.txt` (Codex prompts in `batch-r3-codex.txt` section 1). In,
cut and in the game: `cook-1`, `busser-1`, `lunch-1`, `prof-1` and `cook-hat`. The pig's
velour body redo is in (`art/incoming/pig/pig-body.png`, accepted, cut in R3b); its four
faces (section 3) are next.

## 6. Pickups and props

Each on green, same ink style, no text unless listed. Small; square images are
fine.

- `props/coke-zero.png` (reference `public/coke-zero.webp`): "A black Coke
  Zero can, slightly beaded with condensation, front label legible as a red
  disc with no readable text."
- `props/nuts.png` (reference `public/nuts-bag.webp`): "A small snack bag of
  mixed nuts, blue and gold packaging, no readable text."
- `props/buccees.png` (reference `public/buccees-pickup.webp`): "A yellow and
  red snack bag with a cartoon beaver face, no readable text."
- `props/pepper-crate.png`: "A small wooden crate stencilled with an
  exclamation mark, a red chili on the label."
- `props/keycard.png`: "A hotel keycard, dark grey with a gold stripe and a
  stylized M."
- `props/suitcase.png`: "A hard-shell brown suitcase on its side."
- `props/luggage-cart.png`: "A brass hotel luggage cart with a red velvet
  base, side view, empty."
- `props/dessert-cart.png`: "A steel dessert trolley with a white cloth,
  loaded with cakes and pies, side view."
- `props/gurney.png`: "A hospital gurney with a white sheet, side view."
- `props/iv-pole.png`: "A steel IV pole with a hanging bag."
- `props/vending.png`: "A soda vending machine, front view, lit, no readable
  text."
- `props/sharps-bin.png`: "A red biohazard sharps container."
- `props/sanitizer.png`: "A wall hand-sanitizer dispenser."
- `props/scalpel.png`: "A surgical scalpel, side view, steel blade, grey
  handle."
- `props/boarding-pass.png`: "A boarding pass card, blue and yellow, with a
  barcode and empty fields, no readable text."
- `props/paper-plane.png`: "A folded paper airplane, side view."
- `props/time-clock.png`: "A wall-mounted punch time clock with a slot and a
  card sticking out, side-on."

## 7. The food sheet (banquet)

One **sheet** is fine here: `props/food-sheet.png`, "a 4 by 4 grid of sixteen
dishes seen from slightly above, each on its own white plate, evenly spaced,
same lighting, on green", in this order left to right, top to bottom:

1. shrimp cocktail, 2. bread basket, 3. deviled eggs, 4. kolache,
5. a bowl of Beaver Nuggets (caramel corn puffs), 6. ribeye steak,
7. chicken fried steak with gravy, 8. brisket plate, 9. shrimp and grits,
10. club sandwich, 11. pie slice, 12. cheesecake slice, 13. banana pudding
cup, 14. a hot sauce bottle (no plate), 15. a white to-go box (no plate),
16. a leather check folder with a receipt (no plate).

Checks: sixteen cells, equal size, nothing touching a neighbor.

## 8. Title art

- `brand/key-art.png`, landscape 16:9: "Hammer (the man from the reference),
  three-quarter view, holding the wooden mallet over his shoulder, facing off
  against the pink stuffed pig from `public/boss-pig-reference.webp` across a
  hotel lobby, dramatic lamp light, ink style." No text.
- `brand/share-card.png`, 1200 by 630: the same scene cropped wide, with empty
  space on the left third for a title the game adds.

## 9. Priority

1. Section 2 (Hammer): 2.1, 2.3 `body-affliction`, 2.4 `mallet`, then 2.2.
2. Section 4 `lobby`, `restaurant`, `campus`, `arena`; section 6
   `coke-zero`, `nuts`, `buccees`, `pepper-crate`, `time-clock`.
3. Section 5: `bellhop-1` (the test), then the other seven lobby bodies and the hat.
4. Section 3 (the pig).
5. Section 4 `ballroom`, `gate`; sections 6 and 7 for the quests.
6. Everything else, in the order the later venues are built: `hospital`,
   `lounge`, `buccees`; the remaining cast and props.

## 10. Hand-back

Put the files under `art/incoming/<section>/` with the names above and tell me
which items you skipped. I will cut, scale and rig them, and report anything
that needs a redo with the exact reason.
