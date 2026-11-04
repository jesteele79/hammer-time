# The 3D spike's verdict (story spec §12.4), 2026-11-04

**Verdict: three.js, with the inked look. The drawn perspective corridor is not needed.** One question stays open until Codex paints his back: whether the back view reads as him. His painted profile already does, unmistakably.

The spike's code is throwaway and stays out of the repo (`artifacts/spike/`, git-ignored): a Blender script that builds a stand-in hallway from boxes, three.js in its own folder so the owner's lockfile was not touched, and a page with a live Pixi canvas underneath, the three.js canvas over it and a DOM panel over that.

## The four questions

| Question | Answer | How it was checked |
| --- | --- | --- |
| Does the cut-out read as him in a lit corridor? | **The profile: yes.** The back view: not yet known. | His real rig's swing frames, flat on a quad in the hall, look like him and sit well in the inked set. The back view in the spike is a rough drawn stand-in; `art/outgoing/batch-hammer-back-codex.txt` asks Codex for the real one. Swap it in with `node artifacts/spike-prepare.mjs` and look again. |
| Does a turn to profile on the swing look right? | **Yes, with one thing to decide.** | The quad squeezes to an edge in 0.07 s and opens as his profile, and back. It reads as a quick turn. The thing to decide: in profile he faces the side wall while what he is hitting is ahead of him down the hall. See "For the plan". |
| Does 60 fps hold at 1080p at the ultra tier? | **Yes at density 1. No at density 2 on the integrated card.** | The headless browser runs on the AMD Radeon 780M: 93 fps inked and 110 fps lit at 1920 by 1080, density 1, with shadows, bloom, 4x antialiasing and Pixi alive underneath. At density 2 (a 4K buffer): 21 fps. The RTX 4070 was not measured. |
| Does A step him left? | **Yes.** | Measured under the chase camera in the browser: from 0.500 of the screen's width, A takes him to 0.421 and D to 0.577. |

## What it found for the plan

1. **The inked look is the one to build.** Standard lit materials make a separate, CG-looking world around a painted man. Toon materials with three steps, plus a screen-space ink pass (black lines where the set's normals or depth break), put the set and the painting in one style, for about 15 percent of the frame rate. Keep the lit look out of the plan.
2. **The pipeline works.** Blender 5.2 run from a Python script in the background exports a draco-compressed glTF (31 KB for this stand-in) that three.js loads; the decoder files must be served beside it. The real sets need real modeling and the baked ambient occlusion of §12.2, neither of which was tried.
3. **A flat cut-out in a 2.4 m hall gets clipped by the walls.** Standing near a wall, his quad passes through it and the wall cuts off his arm and the mallet. Either keep him 0.6 m from the walls (leaving 1.2 m of side-to-side travel, tight for dodging) or widen the hall to about 3 m. Three meters is the recommendation: §8.3's 2.4 m is the one number here that does not survive contact.
4. **The 3D view needs its own density ceiling.** At density 2 the integrated card falls to 21 fps. The tiers should step density first, then the antialiasing, the bloom, and the ink pass last, since the ink is what holds the look together.
5. **Decide what he swings at.** In the profile clip the mallet goes toward the side of the screen while the target is ahead. Three choices: keep the profile and turn him to face whatever is hit, with targets a little to one side (cheapest, keeps his face in the clip, the spec's way); paint three back-view swing frames for the ordinary swing and keep the profile for hits and the super smash; or both. Recommendation: paint the back-view swing, since §12.3 already lists those frames, and keep the profile for when he is hit and for the smash.
6. **The fixed-step sim carries over.** Positions in meters at 120 Hz, the render interpolating, worked without any trouble, and DOM over the canvas is ordinary stacking. The real React HUD was not mounted over it.

## Pitfalls that cost time, for whoever builds `ThreeView`

- `ShaderPass` clones its uniforms and silently drops render-target textures: set `tNormal`, `tDepth` and `tMask` on the pass's material after constructing it.
- The mask that keeps the ink off him must output white wherever he is painted (a small `ShaderMaterial`), not his colors: a `MeshBasicMaterial` leaves his black shirt and grey hair under the threshold, and the ink draws over him.
- Blender's emission strengths are far too bright for the bloom: cap a lamp's `emissiveIntensity` (1.6 here) and keep the bloom near strength 0.22, radius 0.35, threshold 1.05.
- With `NoToneMapping` and a half-float composer target, his painting keeps its own colors. Any filmic tone mapping changes them.
- Mipmaps and anisotropy on his textures keep the painting clean at this size.

## Not answered here

The real back painting and its walk and run frames; a phone (nothing was measured on one); the RTX 4070; memory across a whole run with the Pixi textures alive; the real HUD; a set with the moving props of §8.3.
