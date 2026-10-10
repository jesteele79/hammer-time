# Hammer Time — batch 1 handoff for Fable

All 14 renderings from `art/outgoing/batch-1-hammer.txt` are saved under `art/incoming/hammer/` with the exact requested filenames. The user approved the first head on green and then authorized completing the remaining renderings without further individual approval. Game import and integration are the next stage for Fable.

Pull the delivery branch to get these files. If using the downloadable archive instead, extract `art/incoming/hammer-batch-1-fable-handoff.zip` into the Hammer Time repository root. The archive preserves the `art/incoming/hammer/` and `art/outgoing/` paths. It includes the 14 final PNGs, the original brief, both identity/style portraits, all generation prompts, and `manifest.json`. Draft images are excluded.

The final files, in brief order, are:

1. `head-profile.png`
2. `head-three-quarter.png`
3. `body-affliction.png`
4. `mallet.png`
5. `head-profile-angry.png`
6. `head-profile-hurt.png`
7. `head-profile-smug.png`
8. `head-profile-bored.png`
9. `head-profile-chomp.png`
10. `body-scrubs.png`
11. `body-suit.png`
12. `body-banquet.png`
13. `towel.png`
14. `wristwatch.png`

Generation used the built-in image generation tool. Each final was visually inspected for identity, subject, expression or outfit, and requested prop details. The full-body base was corrected to put both arms forward and down in a left-facing stance; all other bodies were derived from that corrected base. The watch was corrected to show clearly separated open band ends. The manifest points to the final correction prompts for those two assets.

These are original opaque PNG renderings on bright green, ready for the incoming art workflow. All PNGs were decoded and verified; names were checked against the 14-item brief; the manifest records native dimensions, file sizes, checksums, and sampled background RGB values. Archive integrity was also checked.

The generated green backgrounds have slight RGB variation, including the already approved first head. They are not perfectly uniform `#00FF00`. When removing the background, use a tolerant mask connected to the image edges rather than exact RGB equality. Preserve the darker green scrubs, black outlines, white highlights, and fine hair edges. No background removal or transparent sprite export has been done in this task.

The largest native resolution was requested in every image generation prompt. The tool returned the native dimensions recorded in the manifest; its maximum supported size was not independently verified. The delivered originals have not been artificially upscaled.

The head expressions use the approved head's canvas and framing. The full-body outfits share the corrected base's canvas and pose. During import, check common ear/head and foot anchors, particularly where an open mouth or lifted chin changes the visible bounds. The three-quarter portrait retains the reference's bust crop.

All prompts are included as `*.prompt.txt`, preserving the STYLE and RULES blocks. For `body-affliction.png` and `wristwatch.png`, the matching `*-correction.prompt.txt` is the final edit prompt; the original prompt is included for context.

Delivery branch: `claude/hammer-pass` in `jesteele79/hammer-time`. Start with this file and the 14 PNGs in `art/incoming/hammer/`; the downloadable archive is `art/incoming/hammer-batch-1-fable-handoff.zip`.

Read section 14 of [the October 10 rebuild design](../../../docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md#14-assets-and-the-art-pack) for the import, cut, registration, and synchronization contract. At this handoff, `scripts/art-cut.mjs` is not yet present in the repository. Implement or use the pipeline from that design as the next stage, then write its processed outputs to `public/art/`.

The delivery manifest at `art/incoming/hammer/manifest.json` describes these renderings. Keep it distinct from the project's `art/manifest.json` used by the planned import pipeline for source protection.

Suggested handoff message to Fable:

> Pull claude/hammer-pass from jesteele79/hammer-time. Read art/incoming/hammer/FABLE-HANDOFF.md, then inspect the 14 PNGs in art/incoming/hammer/. Use the delivery manifest in that folder to verify filenames, sizes and hashes. Follow section 14 of docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md to implement or use the incoming-art processing pipeline and continue integration. The green background varies slightly; preserve the dark green scrubs and check head and foot anchors when exporting the character assets.
