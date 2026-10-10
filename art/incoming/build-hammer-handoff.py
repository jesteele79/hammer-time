from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "art/incoming/hammer"
FILES = [
    "head-profile.png", "head-three-quarter.png", "body-affliction.png",
    "mallet.png", "head-profile-angry.png", "head-profile-hurt.png",
    "head-profile-smug.png", "head-profile-bored.png", "head-profile-chomp.png",
    "body-scrubs.png", "body-suit.png", "body-banquet.png", "towel.png",
    "wristwatch.png",
]
expected = set(FILES)
actual = {p.name for p in ASSET_DIR.glob("*.png")}
if expected != actual:
    raise RuntimeError(f"Asset filenames differ: missing={sorted(expected-actual)}, extra={sorted(actual-expected)}")

manifest = {
    "project": "Hammer Time",
    "batch": 1,
    "brief": "art/outgoing/batch-1-hammer.txt",
    "generated_with": "built-in image_gen",
    "created_at_utc": datetime.now(timezone.utc).isoformat(),
    "user_authorization": "Approved the first head on green and authorized completion of all remaining renderings without per-image review.",
    "background": "Opaque bright green. Native generated backgrounds have small RGB variations, not a single exact RGB value.",
    "resolution": "Largest native resolution requested in every generation prompt. Actual delivered dimensions are recorded per file; tool maximum was not independently verified.",
    "assets": [],
}
for number, filename in enumerate(FILES, 1):
    path = ASSET_DIR / filename
    with Image.open(path) as img:
        img.verify()
    with Image.open(path) as img:
        img.load()
        if img.format != "PNG":
            raise RuntimeError(f"Expected PNG: {filename}")
        width, height = img.size
        has_alpha = "A" in img.getbands()
        if has_alpha and img.getchannel("A").getextrema() != (255, 255):
            raise RuntimeError(f"Unexpected transparency in green-screen original: {filename}")
        rgb = img.convert("RGB")
        corner = list(rgb.getpixel((0, 0)))
        top_right = list(rgb.getpixel((width-1, 0)))
        if not all(c[1] > 180 and c[1] > c[0] * 2 and c[1] > c[2] * 2 for c in (corner, top_right)):
            raise RuntimeError(f"Top corner not bright green: {filename}")
    prompt_name = filename.replace(".png", ".prompt.txt")
    if not (ASSET_DIR / prompt_name).is_file():
        raise RuntimeError(f"Missing prompt: {prompt_name}")
    final_prompt = prompt_name
    if number == 3:
        final_prompt = "body-affliction-correction.prompt.txt"
    if number == 14:
        final_prompt = "wristwatch-correction.prompt.txt"
    manifest["assets"].append({
        "item": number,
        "filename": filename,
        "path": f"art/incoming/hammer/{filename}",
        "width": width,
        "height": height,
        "format": "PNG",
        "mode": img.mode,
        "opaque": True,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "top_left_rgb": corner,
        "top_right_rgb": top_right,
        "final_prompt": f"art/incoming/hammer/{final_prompt}",
        "status": "rendered and visually inspected",
    })

manifest_path = ASSET_DIR / "manifest.json"
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
brief = ROOT / "art/outgoing/batch-1-hammer.txt"
references = [
    ROOT / "art/outgoing/references/hammer-profile.png",
    ROOT / "art/outgoing/references/hammer-three-quarter.png",
]
handoff = ASSET_DIR / "FABLE-HANDOFF.md"
if not handoff.is_file():
    raise RuntimeError("Missing handoff notes")
archive_path = ROOT / "art/incoming/hammer-batch-1-fable-handoff.zip"
if archive_path.exists():
    raise RuntimeError(f"Refusing to overwrite archive: {archive_path}")
archive_files = (
    [ASSET_DIR / name for name in FILES]
    + sorted(ASSET_DIR.glob("*.prompt.txt"))
    + [manifest_path, handoff, brief]
    + references
)
with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path in archive_files:
        archive.write(path, path.relative_to(ROOT).as_posix())
with zipfile.ZipFile(archive_path) as archive:
    corrupt = archive.testzip()
    if corrupt:
        raise RuntimeError(f"Corrupt ZIP member: {corrupt}")
    archive_pngs = {
        Path(name).name for name in archive.namelist()
        if name.startswith("art/incoming/hammer/") and name.endswith(".png")
    }
    if archive_pngs != expected:
        raise RuntimeError("Archive does not contain exactly the 14 final asset PNGs")
print(json.dumps({
    "assets_verified": len(manifest["assets"]),
    "native_dimensions": sorted({f"{a['width']}x{a['height']}" for a in manifest["assets"]}),
    "archive": str(archive_path),
    "archive_bytes": archive_path.stat().st_size,
    "archive_members": len(archive_files),
    "zip_integrity": "passed",
}, indent=2))
