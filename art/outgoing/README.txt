HAMMER TIME ART PACK — how to use

This pack is for an image-generation chat (Grok, GPT, Sora). Each batch file
is written to be pasted straight into the chat. Each batch says which
reference images to attach before you paste it. The references are in the
references/ folder.

Order of batches (do them in this order; batch 1 unblocks the most):
  batch-1-hammer.txt      attach: hammer-profile.png, hammer-three-quarter.png
  batch-2-backdrops.txt   attach: hammer-profile.png plus the venue photo named in each item
  batch-3-cast.txt        attach: art/incoming/hammer/body-affliction.png, hammer-profile.png,
                          plus the NPC photo named in each item (item 1 first, then wait)
  batch-4-pig.txt         attach: hammer-profile.png, pig-toy.jpg
  batch-5-quests.txt      attach: hammer-profile.png plus the pickup photos named
  batch-6-later.txt       attach: hammer-profile.png (and the photo named in each item)

How to work a batch:
  1. Start a new chat. Attach the reference images the batch asks for.
  2. Paste the whole batch file as the first message. It tells the model the
     style, the rules and the list.
  3. Ask for one item at a time ("do item 1"). Generate a few, keep the one
     that looks most like the references, reject the rest.
  4. Save each keeper with the exact file name shown for that item.
  5. Put the files in the game repo under art/incoming/<section>/ (the batch
     says the section), or send them to me any way you like with the names
     kept.

Rules the model must follow (they are repeated in every batch):
  - One subject per image, no collages (except the food sheet).
  - Flat bright green background like a green screen. No texture, no gradient.
  - No text, letters, logos, signatures or watermarks unless the item asks.
  - Whole subject inside the frame with margin all round.
  - Largest size the tool offers, PNG or WebP, never JPEG.

If a piece comes back wrong, tell me what the model would not do and I will
rewrite that prompt. Nothing here blocks the build: anything missing gets a
code-drawn stand-in in the same style.
