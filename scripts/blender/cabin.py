# The cabin of 3-1 (story spec 9.1, 12.2): a single aisle 40 m long, 52 rows at 0.77 m, built from boxes and exported as glTF.
# Run with: & "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/cabin.py
# In Blender y runs down the cabin (0 behind row 52, 40 past row 1), x across it (+x the walker's right), z up; in glTF that
# is three.js's -z down the cabin, so the chase camera looking down it has +x on the screen's right, as in the hall.
import bpy, bmesh, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "sets", "cabin.glb")
BLEND = os.path.join(ROOT, "art", "blender", "cabin.blend")
FLOOR_HALF = 1.7
TOP_HALF = 1.2
SHOULDER = 1.0
SHOULDER_HALF = 1.62
WALL_TOP = 2.1
CEIL = 2.2
LEN = 40.0
PITCH = 0.77
ROW_52 = 0.5
ROWS = 52
# How far the rows carry on behind row 52, or the chase camera would stand outside at his first step.
BEHIND = -3.0
SEAT_IN = 0.55
SEAT_OUT = 1.7
CURTAIN = 38.3
LAV = (16.5, 18.0)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0


def carpet_image():
    size = 128
    img = bpy.data.images.new("aisle", size, size, alpha=False)
    px = [0.0] * (size * size * 4)
    base = (0.045, 0.06, 0.13)
    fleck = (0.10, 0.13, 0.26)
    line = (0.20, 0.17, 0.09)
    for y in range(size):
        for x in range(size):
            c = base
            if (x + y * 3) % 32 < 3 or (x * 3 - y) % 32 < 3:
                c = fleck
            if y < 3:
                c = line
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
    "wall": mat("wall", (0.80, 0.77, 0.70)),
    "trim": mat("trim", (0.42, 0.42, 0.44), 0.5),
    "ceiling": mat("ceiling", (0.86, 0.84, 0.78)),
    "bin": mat("bin", (0.84, 0.82, 0.76), 0.5),
    "seam": mat("seam", (0.36, 0.36, 0.38), 0.5),
    "seat": mat("seat", (0.11, 0.17, 0.36), 0.8),
    "head": mat("head", (0.70, 0.72, 0.76), 0.8),
    "arm": mat("arm", (0.18, 0.18, 0.20), 0.5),
    "business": mat("business", (0.58, 0.42, 0.26), 0.6),
    "window": mat("window", (0.75, 0.86, 1.0), 0.3, 0.0, ((0.72, 0.84, 1.0), 2.0)),
    "shade": mat("shade", (0.92, 0.90, 0.84), 0.6),
    "lamp": mat("lamp", (1, 0.95, 0.85), 0.5, 0.0, ((1.0, 0.92, 0.78), 4.0)),
    "lav": mat("lav", (0.74, 0.72, 0.68), 0.5),
    "door": mat("door", (0.56, 0.56, 0.58), 0.45),
    "curtain": mat("curtain", (0.08, 0.11, 0.27), 0.9),
    # Dark until the seatbelt sign is lit: the view raises its glow.
    "sign": mat("sign", (0.22, 0.20, 0.12), 0.5, 0.0, ((1.0, 0.72, 0.18), 1.0)),
    "galley": mat("galley", (0.60, 0.60, 0.62), 0.35, 0.8),
}
carpet = bpy.data.materials.new("aisle")
carpet.use_nodes = True
nt = carpet.node_tree
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = carpet_image()
nt.links.new(tex.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
nt.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
MATS["aisle"] = carpet

parts = {k: [] for k in MATS}
hulls = {k: [] for k in MATS}


def box(kind, x0, x1, y0, y1, z0, z1):
    parts[kind].append((x0, x1, y0, y1, z0, z1))


def hull(kind, section, y0, y1):
    """A prism along y: `section` is its four (x, z) corners, counter-clockwise from the outside."""
    hulls[kind].append((section, y0, y1))


def slab(side, xz0, xz1, y0, y1, thick=0.08):
    """A tilted wall from (x, z) xz0 to xz1 on one side of the cabin, thick toward the outside."""
    x0, z0 = xz0
    x1, z1 = xz1
    hull("wall", [(side * x0, z0), (side * (x0 + thick), z0), (side * (x1 + thick), z1), (side * x1, z1)], y0, y1)


def seats(row, y):
    """A row's seats on both sides of the aisle: three and three, two and two in business."""
    business = row <= 3
    n = 2 if business else 3
    cloth = "business" if business else "seat"
    each = (SEAT_OUT - SEAT_IN) / n
    for side in (-1, 1):
        for i in range(n):
            a = SEAT_IN + each * i + 0.012
            b = SEAT_IN + each * (i + 1) - 0.012
            x0, x1 = sorted((side * a, side * b))
            box(cloth, x0, x1, y, y + 0.46, 0.27, 0.45)
            box(cloth, x0, x1, y - 0.1, y + 0.02, 0.27, 1.02)
            box("head", x0 + 0.02, x1 - 0.02, y - 0.115, y + 0.03, 0.82, 1.1)
            box("arm", min(x0, x1) - 0.012, min(x0, x1) + 0.012, y, y + 0.34, 0.45, 0.62)
        x0, x1 = sorted((side * SEAT_IN, side * (SEAT_IN + 0.03)))
        box("arm", x0, x1, y, y + 0.34, 0.45, 0.62)
        x0, x1 = sorted((side * (SEAT_IN + 0.1), side * (SEAT_OUT - 0.1)))
        box("arm", x0, x1, y + 0.1, y + 0.2, 0, 0.27)


# The floor and the ceiling; the walls, a straight skirt to the shoulder, then tilting in to the ceiling.
box("ceiling", -2.2, 2.2, BEHIND, LEN + 1, CEIL, CEIL + 0.1)
box("trim", -2.2, -TOP_HALF, BEHIND, LEN + 1, WALL_TOP - 0.02, CEIL)
box("trim", TOP_HALF, 2.2, BEHIND, LEN + 1, WALL_TOP - 0.02, CEIL)
for side in (-1, 1):
    slab(side, (FLOOR_HALF, 0), (SHOULDER_HALF, SHOULDER), BEHIND, LEN + 1)
    slab(side, (SHOULDER_HALF, SHOULDER), (TOP_HALF, WALL_TOP), BEHIND, LEN + 1)

# The rows, and on behind row 52 to the back wall.
y = ROW_52
for k in range(ROWS):
    seats(ROWS - k, y)
    y += PITCH
y = ROW_52 - PITCH
while y > BEHIND + 0.2:
    seats(ROWS + 1, y)
    y -= PITCH
box("wall", -2.2, 2.2, BEHIND - 0.1, BEHIND, 0, CEIL)

# A window at every row on both walls, on the tilted wall, a shade half down on every fifth.
for k in range(ROWS + 4):
    wy = ROW_52 - 3 * PITCH + k * PITCH
    for side in (-1, 1):
        at = lambda z: SHOULDER_HALF + (TOP_HALF - SHOULDER_HALF) * (z - SHOULDER) / (WALL_TOP - SHOULDER) - 0.012
        top = 1.5 if k % 5 else 1.28
        hull("window", [(side * at(1.0), 1.0), (side * (at(1.0) + 0.012), 1.0), (side * (at(top) + 0.012), top), (side * at(top), top)], wy + 0.1, wy + 0.4)
        if top < 1.5:
            hull("shade", [(side * at(top), top), (side * (at(top) + 0.012), top), (side * (at(1.5) + 0.012), 1.5), (side * at(1.5), 1.5)], wy + 0.1, wy + 0.4)

# The overhead bins: two long boxes with a seam at every row and a lit strip under them every third row.
for side in (-1, 1):
    x0, x1 = sorted((side * 0.6, side * 1.7))
    box("bin", x0, x1, BEHIND, LEN + 1, 1.6, 2.0)
    fx0, fx1 = sorted((side * 0.585, side * 0.6))
    for k in range(ROWS + 6):
        wy = ROW_52 - 3 * PITCH + k * PITCH
        box("seam", fx0, fx1, wy - 0.012, wy + 0.012, 1.6, 2.0)
        if k % 3 == 0:
            lx0, lx1 = sorted((side * 0.68, side * 1.05))
            box("lamp", lx0, lx1, wy + 0.1, wy + 0.6, 1.585, 1.6)
    box("seam", fx0, fx1, BEHIND, LEN + 1, 1.6, 1.625)

# A long lamp down the middle of the ceiling; the seatbelt sign over the aisle every ten rows.
y = 1.5
while y < LEN:
    box("lamp", -0.14, 0.14, y - 0.6, y + 0.6, CEIL - 0.02, CEIL)
    y += 3.0
for row in range(50, 0, -10):
    wy = ROW_52 + (ROWS - row) * PITCH
    box("sign", -0.16, 0.16, wy - 0.03, wy + 0.03, 2.03, 2.17)

# The lavatory at row 30 on the left wall, with its door to the aisle.
box("lav", -1.75, -1.2, LAV[0], LAV[1], 0, 2.1)
box("door", -1.205, -1.19, LAV[0] + 0.25, LAV[1] - 0.25, 0.02, 1.95)
box("arm", -1.19, -1.17, LAV[1] - 0.45, LAV[1] - 0.33, 0.95, 1.05)

# The curtain to business class, the galley's wall and door past row 1.
box("curtain", -1.7, 1.7, CURTAIN - 0.02, CURTAIN + 0.02, 0, 2.2)
box("galley", -2.2, 2.2, LEN + 0.6, LEN + 0.7, 0, CEIL)
box("door", -0.5, 0.5, LEN + 0.56, LEN + 0.6, 0, 2.0)


def build_boxes(ob_name, kind, boxes, prisms):
    bm = bmesh.new()
    for x0, x1, y0, y1, z0, z1 in boxes:
        vs = [bm.verts.new(v) for v in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
        for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            bm.faces.new([vs[i] for i in f])
    for section, y0, y1 in prisms:
        vs = [bm.verts.new((x, y0, z)) for x, z in section] + [bm.verts.new((x, y1, z)) for x, z in section]
        for f in ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
            bm.faces.new([vs[i] for i in f])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(ob_name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(MATS[kind])
    ob = bpy.data.objects.new(ob_name, me)
    bpy.context.collection.objects.link(ob)
    return ob


for kind in MATS:
    if parts[kind] or hulls[kind]:
        build_boxes(kind, kind, parts[kind], hulls[kind])

# The aisle's carpet: one quad the whole floor's width, a pattern tile every 0.6 m.
me = bpy.data.meshes.new("aisle")
xa, xb, ya, yb = -2.2, 2.2, BEHIND, LEN + 1
me.from_pydata([(xa, ya, 0), (xb, ya, 0), (xb, yb, 0), (xa, yb, 0)], [], [(0, 1, 2, 3)])
me.update()
uv = me.uv_layers.new()
T = 0.6
for loop, (u, v) in zip(uv.data, ((xa / T, ya / T), (xb / T, ya / T), (xb / T, yb / T), (xa / T, yb / T))):
    loop.uv = (u, v)
me.materials.append(MATS["aisle"])
bpy.context.collection.objects.link(bpy.data.objects.new("aisle", me))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, export_draco_mesh_compression_enable=True)
print("WROTE", OUT, os.path.getsize(OUT))
