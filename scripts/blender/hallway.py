# The fourteenth floor's hallway (story spec 8.3, 12.2): 80 m long, 3 m wide, 2.7 m high, built from boxes and exported as glTF.
# Run with: & "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/hallway.py
# In Blender y runs down the hall (0 at the stairwell door, 80 at room 1417), x across it (+x the walker's right), z up;
# in glTF that is three.js's -z down the hall, so the chase camera looking down it has +x on the screen's right.
import bpy, bmesh, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "sets", "hallway.glb")
BLEND = os.path.join(ROOT, "art", "blender", "hallway.blend")
HALF = 1.5
LEN = 80.0
CEIL = 2.7
EVERY_DOOR = 3
EVERY_LAMP = 6
# The ice alcove on the left, its machine in a 2 m niche; the elevator lobby on the right, the wall open 4 m into it.
# The hall runs on behind the stairwell door, or the chase camera would stand outside it at his first step.
BEHIND = -4.0
ALCOVE = (29.0, 31.0)
LOBBY = (48.0, 54.0)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0


def carpet_image():
    size = 256
    img = bpy.data.images.new("carpet", size, size, alpha=False)
    px = [0.0] * (size * size * 4)
    base = (0.20, 0.035, 0.055)
    dark = (0.11, 0.018, 0.03)
    gold = (0.62, 0.40, 0.11)
    for y in range(size):
        for x in range(size):
            u, v = x / size - 0.5, y / size - 0.5
            d = abs(u) + abs(v)
            c = base
            if d < 0.1:
                c = gold
            elif d < 0.24:
                c = dark
            elif 0.42 < d < 0.47:
                c = gold
            i = (y * size + x) * 4
            px[i:i + 4] = [c[0], c[1], c[2], 1.0]
    img.pixels = px
    img.pack()
    return img


def mat(name, color, rough=0.7, metal=0.0, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit[0], 1)
        b.inputs["Emission Strength"].default_value = emit[1]
    return m


MATS = {
    "wall": mat("wall", (0.72, 0.60, 0.42)),
    "wainscot": mat("wainscot", (0.23, 0.11, 0.055), 0.5),
    "trim": mat("trim", (0.80, 0.70, 0.52), 0.5),
    "ceiling": mat("ceiling", (0.78, 0.72, 0.60)),
    "door": mat("door", (0.30, 0.15, 0.07), 0.45),
    "frame": mat("frame", (0.14, 0.07, 0.035), 0.5),
    "brass": mat("brass", (0.78, 0.56, 0.20), 0.3, 1.0),
    "lamp": mat("lamp", (1, 0.9, 0.7), 0.5, 0.0, ((1.0, 0.85, 0.6), 6.0)),
    "sconce": mat("sconce", (1, 0.85, 0.6), 0.5, 0.0, ((1.0, 0.72, 0.38), 8.0)),
    "steel": mat("steel", (0.62, 0.64, 0.66), 0.25, 1.0),
    "ice": mat("ice", (0.55, 0.60, 0.65), 0.4, 0.4),
}
carpet = bpy.data.materials.new("carpet")
carpet.use_nodes = True
nt = carpet.node_tree
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = carpet_image()
nt.links.new(tex.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
nt.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
MATS["carpet"] = carpet

parts = {k: [] for k in MATS}


def box(kind, x0, x1, y0, y1, z0, z1):
    parts[kind].append((x0, x1, y0, y1, z0, z1))


def wall_run(side, y0, y1):
    """One stretch of side wall: upper wall, chair rail, wainscot, baseboard and crown. side is -1 or 1."""
    a, b = (-HALF - 0.1, -HALF) if side < 0 else (HALF, HALF + 0.1)
    inset = 0.012 * side
    box("wall", a, b, y0, y1, 0, CEIL)
    w0, w1 = (a + inset + 0.03, b + inset + 0.03) if side < 0 else (a + inset - 0.03, b + inset - 0.03)
    box("wainscot", w0, w1, y0, y1, 0, 0.95)
    r0, r1 = (w0 + 0.02, w1 + 0.02) if side < 0 else (w0 - 0.02, w1 - 0.02)
    box("trim", r0, r1, y0, y1, 0.95, 1.0)
    box("frame", r0, r1, y0, y1, 0, 0.12)
    box("trim", a + inset, b + inset, y0, y1, CEIL - 0.14, CEIL)


def door(side, y):
    """A door 1 m wide and 2.15 m tall on a side wall, with its frame, handle and a blank number plate."""
    face = HALF if side > 0 else -HALF
    d = 0.06 * side
    x0, x1 = sorted((face, face - d))
    box("frame", x0, x1, y - 0.6, y + 0.6, 0, 2.3)
    x0, x1 = sorted((face - d, face - d * 1.5))
    box("door", x0, x1, y - 0.5, y + 0.5, 0, 2.2)
    x0, x1 = sorted((face - d * 1.5, face - d * 1.9))
    for z0, z1 in ((0.2, 1.0), (1.2, 2.0)):
        box("frame", x0, x1, y - 0.36, y + 0.36, z0, z1)
    x0, x1 = sorted((face - d * 1.5, face - d * 3.0))
    box("brass", x0, x1, y + 0.32, y + 0.44, 1.0, 1.06)
    box("brass", x0, x1, y - 0.1, y + 0.1, 2.02, 2.14)


def sconce(side, y):
    face = HALF if side > 0 else -HALF
    x0, x1 = sorted((face, face - 0.1 * side))
    box("brass", x0, x1, y - 0.05, y + 0.05, 1.55, 1.85)
    x0, x1 = sorted((face - 0.04 * side, face - 0.16 * side))
    box("sconce", x0, x1, y - 0.09, y + 0.09, 1.72, 1.98)


# The ceiling, wide enough for the alcove and the lobby, a lamp every 6 m.
box("ceiling", -4, 6, BEHIND, LEN + 1, CEIL, CEIL + 0.1)
y = 3
while y < LEN:
    box("lamp", -0.35, 0.35, y - 0.35, y + 0.35, CEIL - 0.03, CEIL)
    y += EVERY_LAMP

# The two side walls with their openings: the alcove on the left, the lobby on the right.
wall_run(-1, BEHIND, ALCOVE[0])
wall_run(-1, ALCOVE[1], LEN + 1)
wall_run(1, BEHIND, LOBBY[0])
wall_run(1, LOBBY[1], LEN + 1)

# The ice alcove: a 2 m niche with the machine in it and its own light.
ND = HALF + 2.0
box("wall", -ND - 0.1, -HALF, ALCOVE[0] - 0.1, ALCOVE[0], 0, CEIL)
box("wall", -ND - 0.1, -HALF, ALCOVE[1], ALCOVE[1] + 0.1, 0, CEIL)
box("wall", -ND - 0.1, -ND, ALCOVE[0], ALCOVE[1], 0, CEIL)
box("ice", -ND, -ND + 0.85, ALCOVE[0] + 0.3, ALCOVE[1] - 0.3, 0, 1.8)
box("sconce", -ND, -ND + 0.08, ALCOVE[0] + 0.7, ALCOVE[1] - 0.7, 2.0, 2.3)

# The elevator lobby: the right wall opens 4 m into it, two steel doors on its far side.
FAR = HALF + 4.0
box("wall", FAR, FAR + 0.1, LOBBY[0], LOBBY[1], 0, CEIL)
for y0, y1 in ((LOBBY[0] - 0.1, LOBBY[0]), (LOBBY[1], LOBBY[1] + 0.1)):
    box("wall", HALF, FAR, y0, y1, 0, CEIL)
for y0 in (LOBBY[0] + 0.7, LOBBY[0] + 3.4):
    box("frame", FAR - 0.06, FAR, y0 - 0.1, y0 + 2.0, 0, 2.4)
    box("steel", FAR - 0.1, FAR - 0.06, y0, y0 + 0.93, 0, 2.3)
    box("steel", FAR - 0.1, FAR - 0.06, y0 + 0.97, y0 + 1.9, 0, 2.3)
    box("sconce", FAR - 0.1, FAR - 0.06, y0 + 0.75, y0 + 1.15, 2.42, 2.52)

# The room doors, every 3 m from z 3 on both sides, clear of the alcove and the lobby; a sconce between each pair.
k = 1
while k * EVERY_DOOR < LEN - 1:
    y = k * EVERY_DOOR
    k += 1
    for side in (-1, 1):
        if side > 0 and LOBBY[0] - 1 < y < LOBBY[1] + 1:
            continue
        if side < 0 and ALCOVE[0] - 1 < y < ALCOVE[1] + 1:
            continue
        door(side, y)
        mid = y + EVERY_DOOR / 2
        if side > 0 and LOBBY[0] - 1 < mid < LOBBY[1] + 1:
            continue
        if side < 0 and ALCOVE[0] - 1 < mid < ALCOVE[1] + 1:
            continue
        if mid < LEN - 1:
            sconce(side, mid)

# Room 1417 closes the hall: a wall with a double door. The stairwell's wall behind him.
box("wall", -HALF - 0.1, HALF + 0.1, LEN, LEN + 0.1, 0, CEIL)
box("frame", -0.9, 0.9, LEN - 0.06, LEN, 0, 2.5)
box("door", -0.8, -0.02, LEN - 0.1, LEN - 0.06, 0, 2.4)
box("door", 0.02, 0.8, LEN - 0.1, LEN - 0.06, 0, 2.4)
box("brass", -0.12, -0.03, LEN - 0.14, LEN - 0.1, 1.0, 1.3)
box("brass", 0.03, 0.12, LEN - 0.14, LEN - 0.1, 1.0, 1.3)
box("brass", -0.25, 0.25, LEN - 0.12, LEN - 0.1, 2.05, 2.25)
box("wall", -HALF - 0.1, HALF + 0.1, BEHIND - 0.1, BEHIND, 0, CEIL)


def build(kind, boxes):
    bm = bmesh.new()
    for x0, x1, y0, y1, z0, z1 in boxes:
        vs = [bm.verts.new(v) for v in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
        for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            bm.faces.new([vs[i] for i in f])
    me = bpy.data.meshes.new(kind)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(MATS[kind])
    ob = bpy.data.objects.new(kind, me)
    bpy.context.collection.objects.link(ob)
    return ob


for kind, boxes in parts.items():
    if boxes:
        build(kind, boxes)

# The carpet: one quad, a pattern tile every 1.2 m.
me = bpy.data.meshes.new("carpet")
xa, xb, ya, yb = -4.0, 6.0, BEHIND, LEN + 1
me.from_pydata([(xa, ya, 0), (xb, ya, 0), (xb, yb, 0), (xa, yb, 0)], [], [(0, 1, 2, 3)])
me.update()
uv = me.uv_layers.new()
T = 1.2
for loop, (u, v) in zip(uv.data, ((xa / T, ya / T), (xb / T, ya / T), (xb / T, yb / T), (xa / T, yb / T))):
    loop.uv = (u, v)
me.materials.append(MATS["carpet"])
bpy.context.collection.objects.link(bpy.data.objects.new("carpet", me))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, export_draco_mesh_compression_enable=True)
print("WROTE", OUT, os.path.getsize(OUT))
