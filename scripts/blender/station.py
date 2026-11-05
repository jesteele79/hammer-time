# Gare de Lyon's hall and platform (story spec 9.3), rendered straight on for the owner to paint over in Codex, each 1536 by
# 1024 with the floor's edge three-quarters down. The game shows one in a 2,000 px room, at 1.3, which is the coaches' scale:
# the clock, the departure board and the train's doors stand where the game draws their hands, its row and its lamps.
# Run with: & "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/station.py
import bpy, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "art", "outgoing", "renders")
WIDTH = 12.8
HEIGHT = WIDTH * 1024 / 1536
TOP = HEIGHT * 0.75
PX = 1536 / WIDTH
# What the game has: the room's game px across the render, the clock [x, y, r] in the render's px, the board's center.
K = 2000 / 1536
CLOCK = (480, 230, 84)
BOARD = (1200, 700)
DOORS = (450, 1050, 1850)


def gx(g):
    return g / K / PX - WIDTH / 2


def gz(g):
    return g / K / PX


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
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.05, 0.06, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1
    scene.world = world
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = WIDTH
    ob = bpy.data.objects.new("cam", cam)
    ob.location = (0, -20, HEIGHT * 0.25)
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


def disc(m, x, y, z, r):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=0.1, location=(x, y, z), rotation=(math.pi / 2, 0, 0), vertices=64)
    bpy.context.active_object.data.materials.append(m)


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


def floor_and_roof(stone):
    """The stone floor to the frame's foot and the iron roof across the top."""
    box(mat(stone, 1.0), -9, 9, -12, 3, -0.2, 0)
    box(mat((0, 0, 0), 1.0, 0, (stone, 0.9)), -9, 9, -12.2, -12, -5, -0.001)
    iron = mat((0.12, 0.17, 0.2), 0.5, 0.6)
    box(iron, -9, 9, 1.2, 1.4, TOP - 0.28, TOP - 0.14)
    box(iron, -9, 9, 1.2, 1.4, TOP - 1.0, TOP - 0.9)
    x = -8.0
    while x < 8:
        box(iron, x - 0.04, x + 0.04, 1.2, 1.4, TOP - 1.0, TOP)
        # The truss's diagonals, in short steps.
        for k in range(8):
            dz = k * 0.1
            box(iron, x + dz * 1.0, x + dz * 1.0 + 0.1, 1.2, 1.4, TOP - 1.0 + dz, TOP - 0.9 + dz)
            box(iron, x + 1.6 - dz - 0.1, x + 1.6 - dz, 1.2, 1.4, TOP - 1.0 + dz, TOP - 0.9 + dz)
        x += 1.6
    return iron


def hall():
    reset()
    wall, trim = mat((0.72, 0.62, 0.48)), mat((0.5, 0.42, 0.32))
    box(wall, -9, 9, 2, 2.2, -1, TOP + 1)
    box(mat((0.5, 0.62, 0.68), 0.3), -9, 9, 1.7, 1.75, TOP - 0.9, TOP)
    iron = floor_and_roof((0.46, 0.43, 0.38))
    box(trim, -9, 9, 1.9, 2, 0, 0.5)
    box(trim, -9, 9, 1.9, 2, 3.4, 3.55)
    # Tall arched bays along the wall, plain.
    for c in (-5.4, 4.3):
        box(mat((0.28, 0.33, 0.38), 0.4), c - 0.8, c + 0.8, 1.95, 2, 0.5, 3.0)
        box(trim, c - 0.9, c + 0.9, 1.9, 1.95, 3.0, 3.12)
    # Iron pillars.
    for c in (-6.2, -0.6, 3.4, 6.2):
        box(iron, c - 0.12, c + 0.12, 1.5, 1.7, 0, TOP - 0.9)
        box(iron, c - 0.2, c + 0.2, 1.5, 1.7, 0, 0.3)
    # The big clock: a blank face; the game draws the hands.
    cx, cz = CLOCK[0] / PX - WIDTH / 2, TOP - CLOCK[1] / PX
    r = CLOCK[2] / PX
    disc(iron, cx, 1.6, cz, r + 0.09)
    disc(mat((0, 0, 0), 1.0, 0, ((0.94, 0.92, 0.84), 1.0)), cx, 1.52, cz, r)
    # The departure board: a dark panel with blank rows; the game lights one.
    bx, bz = gx(BOARD[0]), gz(BOARD[1])
    box(iron, bx - 1.9, bx + 1.9, 1.5, 1.7, bz - 0.9, bz + 0.9)
    box(mat((0, 0, 0), 1.0, 0, ((0.04, 0.05, 0.06), 1.0)), bx - 1.8, bx + 1.8, 1.45, 1.5, bz - 0.8, bz + 0.8)
    for row in range(5):
        z = bz + 0.55 - row * 0.28
        box(mat((0, 0, 0), 1.0, 0, ((0.13, 0.12, 0.08), 1.0)), bx - 1.68, bx + 1.68, 1.43, 1.45, z - 0.1, z + 0.1)
    light(0, -6, 5, 700, size=16)
    light(0, 1, 5.6, 120, (1, 0.9, 0.75), 12)
    render("station-1.png")


def platform():
    reset()
    box(mat((0.5, 0.58, 0.62), 0.3), -9, 9, 3, 3.2, -1, TOP + 1)
    iron = floor_and_roof((0.46, 0.43, 0.38))
    # The train's flank from the platform's edge, grey and blue, with no name on it.
    flank, band, dark = mat((0.72, 0.74, 0.76), 0.35, 0.3), mat((0.1, 0.22, 0.46), 0.4), mat((0.16, 0.18, 0.2), 0.5)
    box(flank, -9, 9, 2, 2.4, 0, 3.75)
    box(band, -9, 9, 1.98, 2, 0.75, 1.15)
    box(dark, -9, 9, 1.98, 2, 0, 0.14)
    box(mat((0.56, 0.58, 0.6), 0.3, 0.5), -9, 9, 1.95, 2.4, 3.75, 3.95)
    pane = mat((0.34, 0.44, 0.5), 0.15)
    frame = mat((0.26, 0.28, 0.3), 0.4, 0.5)
    doors = [gx(d) for d in DOORS]
    x = -8.4
    while x < 8.4:
        if all(abs(x - d) > 1.3 for d in doors):
            box(frame, x - 0.56, x + 0.56, 1.96, 1.98, 1.68, 2.82)
            box(pane, x - 0.5, x + 0.5, 1.94, 1.96, 1.74, 2.76)
        x += 1.5
    for d in doors:
        box(frame, d - 0.66, d + 0.66, 1.96, 1.98, 0.14, 2.9)
        box(mat((0.22, 0.34, 0.56), 0.4), d - 0.6, d, 1.94, 1.96, 0.16, 2.84)
        box(mat((0.22, 0.34, 0.56), 0.4), d, d + 0.6, 1.94, 1.96, 0.16, 2.84)
        box(pane, d - 0.46, d - 0.12, 1.92, 1.94, 1.6, 2.6)
        box(pane, d + 0.12, d + 0.46, 1.92, 1.94, 1.6, 2.6)
    # A pillar between the train and the viewer; he walks in front of it.
    box(iron, gx(750) - 0.14, gx(750) + 0.14, 1.2, 1.5, 0, TOP - 0.9)
    box(iron, gx(750) - 0.22, gx(750) + 0.22, 1.2, 1.5, 0, 0.3)
    box(mat((0.9, 0.78, 0.2), 0.6), -9, 9, -0.02, 2.0, -0.02, 0.0)
    light(0, -6, 5, 700, size=16)
    light(0, 1, 5.6, 80, (1, 0.9, 0.75), 12)
    render("station-2.png")


hall()
platform()
