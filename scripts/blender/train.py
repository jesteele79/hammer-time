# The 14:02's three coaches (story spec 9.3), rendered straight on for the owner to paint over in Codex: a standard coach, the
# bistro car and first class, each 1536 by 1024 with the floor's edge three-quarters down and the ceiling at the top edge. The
# game shows one in a 768 px room, at half: its seats, racks and counter stand where the level's platforms are, by the level's
# own numbers, so he stands on what is painted. Also writes each render's window rectangles for the countryside.
# Run with: & "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/train.py
import bpy, json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "art", "outgoing", "renders")
WIDTH = 4.9
HEIGHT = WIDTH * 1024 / 1536
CEIL = HEIGHT * 0.75
PX = 1536 / WIDTH


def gx(g):
    """Metres across the render of a game px from the coach's start: the room shows it at half."""
    return g * 2 / PX - WIDTH / 2


def gz(g):
    """Metres up of a game px above the floor."""
    return g * 2 / PX


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 1024
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.02, 0.03, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1
    scene.world = world
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = WIDTH
    ob = bpy.data.objects.new("cam", cam)
    ob.location = (0, -12, HEIGHT * 0.25)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    bpy.context.collection.objects.link(ob)
    scene.camera = ob


def mat(color, rough=0.6, metal=0.0, emit=None):
    m = bpy.data.materials.new("m")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit[0], 1)
        b.inputs["Emission Strength"].default_value = emit[1]
    return m


def box(m, x0, x1, y0, y1, z0, z1):
    me = bpy.data.meshes.new("b")
    vs = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    fs = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(vs, [], fs)
    me.update()
    me.materials.append(m)
    bpy.context.collection.objects.link(bpy.data.objects.new("b", me))


def light(x, y, z, power, color=(1, 0.95, 0.85), size=1.0):
    d = bpy.data.lights.new("l", "AREA")
    d.energy = power
    d.color = color
    d.size = size
    o = bpy.data.objects.new("l", d)
    o.location = (x, y, z)
    bpy.context.collection.objects.link(o)


def render(name):
    bpy.context.scene.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)


# Three windows, the same in all three coaches: above the racks, whose height the level sets. Their panes are one flat color,
# which the game draws the countryside over.
WINDOW_CENTERS = (-1.45, 0.0, 1.45)
WINDOW_W = 0.98
WINDOW_Z = (1.28, 2.0)


def windows_px():
    out = []
    for c in WINDOW_CENTERS:
        x = round((c - WINDOW_W / 2 + WIDTH / 2) * PX)
        y = round((CEIL - WINDOW_Z[1]) * PX)
        out.append([x, y, round(WINDOW_W * PX), round((WINDOW_Z[1] - WINDOW_Z[0]) * PX)])
    return out


def shell(wall, dado, carpet):
    """The back wall, its low panel, the ceiling, the windows, the door frames at both ends and the carpet to the frame's foot."""
    frame = mat((0.34, 0.36, 0.38), 0.4, 0.5)
    pane = mat((0, 0, 0), 1.0, 0, ((0.83, 0.88, 0.9), 1.0))
    box(wall, -4, 4, 1.2, 1.4, -1, CEIL + 1)
    box(dado, -4, 4, 1.15, 1.2, 0, 1.2)
    box(mat(carpet, 1.0), -4, 4, -8, 1.2, -0.2, 0)
    box(mat((0, 0, 0), 1.0, 0, (carpet, 0.9)), -4, 4, -8.2, -8, -4, -0.001)
    box(mat((0.86, 0.86, 0.82)), -4, 4, 1.0, 1.2, CEIL - 0.14, CEIL)
    box(frame, -4, 4, 1.1, 1.15, 1.2, 1.24)
    for c in WINDOW_CENTERS:
        x0, x1 = c - WINDOW_W / 2, c + WINDOW_W / 2
        z0, z1 = WINDOW_Z
        box(frame, x0 - 0.05, x1 + 0.05, 1.13, 1.18, z0 - 0.05, z1 + 0.05)
        box(pane, x0, x1, 1.11, 1.13, z0, z1)
    door = mat((0.42, 0.44, 0.47), 0.45, 0.3)
    for s in (-1, 1):
        # Up to the lintel the level has at each seam, 300 game px up.
        box(door, s * WIDTH / 2 - 0.2, s * WIDTH / 2 + 0.2, 1.0, 1.1, 0, CEIL)
        box(frame, s * WIDTH / 2 - 0.24, s * WIDTH / 2 + 0.24, 0.95, 1.0, gz(300), CEIL)
        box(frame, s * WIDTH / 2 - 0.24, s * WIDTH / 2 - 0.17, 0.95, 1.0, 0, gz(300))
        box(frame, s * WIDTH / 2 + 0.17, s * WIDTH / 2 + 0.24, 0.95, 1.0, 0, gz(300))
    # The ceiling's strip of light.
    box(mat((0, 0, 0), 1.0, 0, ((1, 0.97, 0.88), 1.6)), -2.1, 2.1, 0.95, 1.0, CEIL - 0.16, CEIL - 0.12)
    light(0, -3, 1.6, 90, size=7)
    light(0, 0.3, CEIL - 0.3, 26, size=4)


def rack():
    """The rack, x 110 to 620 and 170 up in the game, with its brackets: he walks on it, tucked."""
    steel = mat((0.56, 0.58, 0.6), 0.35, 0.8)
    box(steel, gx(110), gx(620), 0.3, 1.15, gz(170) - 0.05, gz(170))
    for g in (130, 365, 600):
        box(steel, gx(g) - 0.02, gx(g) + 0.02, 1.0, 1.15, gz(170) - 0.2, gz(170))


def seat(i, cloth, head, wide=0.0, face=1):
    """One seat, x 120 + 150 i to 210 + 150 i and 110 up in the game: he stands on its back."""
    x0, x1 = gx(120 + 150 * i) - wide, gx(210 + 150 * i) + wide
    top = gz(110)
    box(mat((0.16, 0.16, 0.18), 0.6, 0.3), (x0 + x1) / 2 - 0.05, (x0 + x1) / 2 + 0.05, 0.6, 0.8, 0, 0.26)
    box(cloth, x0 + 0.02, x1 - 0.02, 0.3, 1.0, 0.26, 0.36)
    box(cloth, x0, x1, 0.7, 1.0, 0.3, top - 0.09)
    box(head, x0, x1, 0.7, 1.0, top - 0.1, top)
    # Facing one way or the other: the wing on the side he looks from.
    side = x1 if face > 0 else x0
    box(cloth, side - 0.04, side + 0.04, 0.4, 0.72, 0.3, top - 0.06)


def standard():
    reset()
    shell(mat((0.74, 0.76, 0.76)), mat((0.34, 0.42, 0.56)), (0.17, 0.2, 0.3))
    cloth, head = mat((0.13, 0.26, 0.55), 0.8), mat((0.09, 0.18, 0.4), 0.8)
    for i in range(4):
        seat(i, cloth, head, 0.0, 1 if i < 2 else -1)
    rack()
    render("train-far-1.png")


def bistro():
    reset()
    shell(mat((0.8, 0.72, 0.6)), mat((0.45, 0.2, 0.2)), (0.26, 0.17, 0.15))
    wood, steel = mat((0.4, 0.2, 0.1), 0.45), mat((0.6, 0.62, 0.64), 0.3, 0.8)
    # The counter, x 200 to 500 and 120 up in the game.
    top = gz(120)
    box(wood, gx(200), gx(500), 0.5, 1.1, 0, top - 0.05)
    box(steel, gx(200) - 0.04, gx(500) + 0.04, 0.45, 1.1, top - 0.05, top)
    for k in range(5):
        box(mat((0.5, 0.26, 0.12), 0.45), gx(215 + k * 58), gx(255 + k * 58), 0.48, 0.5, 0.1, top - 0.14)
    # The fridge at 600, its bottles blank.
    x0, x1 = gx(600) - 0.32, gx(600) + 0.32
    box(steel, x0 - 0.04, x1 + 0.04, 0.9, 1.1, 0, 1.2)
    box(mat((0, 0, 0), 1.0, 0, ((0.72, 0.84, 0.9), 0.7)), x0, x1, 0.88, 0.9, 0.08, 1.14)
    glass = mat((0.14, 0.42, 0.2), 0.2)
    for row in range(4):
        z = 0.14 + row * 0.26
        box(steel, x0, x1, 0.84, 0.88, z - 0.02, z)
        for b in range(6):
            bx = x0 + 0.05 + b * 0.1
            box(glass, bx, bx + 0.05, 0.83, 0.86, z, z + 0.14)
            box(glass, bx + 0.016, bx + 0.034, 0.83, 0.86, z + 0.14, z + 0.2)
    # Standing tables at the windows, too slight to stand on.
    for g in (60, 690):
        box(steel, gx(g) - 0.02, gx(g) + 0.02, 0.9, 0.95, 0, 0.72)
        box(mat((0.82, 0.8, 0.76), 0.5), gx(g) - 0.18, gx(g) + 0.18, 0.8, 1.05, 0.72, 0.75)
    render("train-far-2.png")


def first_class():
    reset()
    shell(mat((0.76, 0.74, 0.7)), mat((0.3, 0.3, 0.33)), (0.2, 0.2, 0.24))
    cloth, head = mat((0.3, 0.32, 0.36), 0.8), mat((0.82, 0.8, 0.74), 0.8)
    for i in range(4):
        seat(i, cloth, head, 0.05, 1 if i < 2 else -1)
    rack()
    # A reading lamp over each window.
    brass = mat((0.7, 0.52, 0.22), 0.3, 0.9)
    for c in WINDOW_CENTERS:
        box(brass, c - 0.015, c + 0.015, 1.05, 1.15, 2.08, 2.22)
        box(mat((0, 0, 0), 1.0, 0, ((1, 0.88, 0.62), 2.0)), c - 0.09, c + 0.09, 1.0, 1.1, 2.04, 2.1)
    render("train-far-3.png")


standard()
bistro()
first_class()

# The hall's clock, station.py's CLOCK, goes with them: the sync takes both from here.
with open(os.path.join(OUT, "train-windows.json"), "w", newline="\n") as f:
    rects = windows_px()
    json.dump({"train-far-1": rects, "train-far-2": rects, "train-far-3": rects, "clock": [480, 230, 84]}, f, indent=1)
