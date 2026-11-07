# Basel's Mittlere Bruecke and Marktplatz (story spec 10.1, the 2026-11-06 note), rendered straight on for the owner to
# paint over in Codex, each 1536 by 1024 with the floor's edge three-quarters down. The game shows them at their own size
# (K = 1: 1536 px of render are 1536 px of game) in the street's layout, the bridge three times and the square twice, so the
# bridge's left and right edges continue each other: the parapet, its lamps every third of the wall, the river and the bank.
# Run with: & "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/basel.py
import bpy, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "art", "outgoing", "renders")
WIDTH = 12.8
HEIGHT = WIDTH * 1024 / 1536
TOP = HEIGHT * 0.75
PX = 1536 / WIDTH
K = 1


def gx(g):
    return g / K / PX - WIDTH / 2


def reset(sky):
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
    world.node_tree.nodes["Background"].inputs[0].default_value = (*sky, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1
    scene.world = world
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = WIDTH
    ob = bpy.data.objects.new("cam", cam)
    ob.location = (0, -40, HEIGHT * 0.25)
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


def glow(color, strength=1.0):
    """A flat, self-lit color: the sky, the water and the far bank, which light alone would turn muddy."""
    return mat((0, 0, 0), 1.0, 0, (color, strength))


def box(m, x0, x1, y0, y1, z0, z1):
    me = bpy.data.meshes.new("b")
    vs = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    fs = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(vs, [], fs)
    me.update()
    me.materials.append(m)
    bpy.context.collection.objects.link(bpy.data.objects.new("b", me))


def prism(m, x0, x1, y, z0, z1):
    """A pitched roof seen from the front: a triangle from the eaves at z0 to the ridge at z1."""
    me = bpy.data.meshes.new("p")
    mid = (x0 + x1) / 2
    vs = [(x0, y, z0), (x1, y, z0), (mid, y, z1), (x0, y + 0.3, z0), (x1, y + 0.3, z0), (mid, y + 0.3, z1)]
    fs = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    me.from_pydata(vs, [], fs)
    me.update()
    me.materials.append(m)
    bpy.context.collection.objects.link(bpy.data.objects.new("p", me))


def arch(m, x, y, z0, half, top):
    """A round-headed opening's dark fill: a box, and a disc just behind it whose upper half rounds its head."""
    box(m, x - half, x + half, y, y + 0.02, z0, top)
    bpy.ops.mesh.primitive_cylinder_add(radius=half, depth=0.02, location=(x, y + 0.03, top), rotation=(math.pi / 2, 0, 0), vertices=48)
    bpy.context.active_object.data.materials.append(m)


def light(x, y, z, power, color=(1, 0.95, 0.85), size=1.0):
    d = bpy.data.lights.new("l", "AREA")
    d.energy = power
    d.color = color
    d.size = size
    o = bpy.data.objects.new("l", d)
    o.location = (x, y, z)
    bpy.context.collection.objects.link(o)


def sun(angle, power, color):
    """The low July evening sun from the left."""
    d = bpy.data.lights.new("s", "SUN")
    d.energy = power
    d.color = color
    o = bpy.data.objects.new("s", d)
    o.rotation_euler = (math.radians(70), math.radians(angle), math.radians(-30))
    bpy.context.collection.objects.link(o)


def render(name):
    bpy.context.scene.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)


def floor(color):
    """The deck or the paving to the frame's foot, its front edge three-quarters down."""
    box(mat(color, 1.0), -9, 9, -12, 3, -0.2, 0)
    box(glow(tuple(c * 0.92 for c in color), 0.9), -9, 9, -12.2, -12, -5, -0.001)


def bridge():
    reset((0.98, 0.78, 0.58))
    floor((0.62, 0.52, 0.44))
    # The sky's evening band, the far bank's houses small against it, the Rhine's green water to the parapet.
    box(glow((0.99, 0.84, 0.62)), -9, 9, 30, 30.1, 2.6, TOP + 2)
    box(glow((0.24, 0.42, 0.38), 0.9), -9, 9, 20, 20.1, -1, 2.7)
    for k in range(12):
        box(glow((0.36, 0.55, 0.5), 0.9), -9, 9, 19.9, 19.95, 0.9 + k * 0.15, 0.93 + k * 0.15)
    houses = [(-5.6, 1.0, 1.1, (0.82, 0.72, 0.58)), (-4.9, 0.9, 1.4, (0.74, 0.52, 0.42)), (-3.4, 1.2, 1.0, (0.86, 0.8, 0.66)), (-1.6, 1.0, 1.3, (0.7, 0.6, 0.5)),
              (0.2, 1.1, 1.2, (0.82, 0.66, 0.5)), (1.9, 0.9, 1.0, (0.78, 0.74, 0.62)), (5.2, 1.0, 1.2, (0.84, 0.7, 0.56))]
    roof = glow((0.52, 0.28, 0.22), 0.85)
    for x, w, h, c in houses:
        box(glow(c, 0.85), x - w / 2, x + w / 2, 18, 18.1, 2.6, 2.6 + h)
        prism(roof, x - w / 2 - 0.08, x + w / 2 + 0.08, 17.9, 2.6 + h, 3.15 + h)
        for wx in (-0.25, 0.25):
            box(glow((0.32, 0.3, 0.3), 0.85), x + wx - 0.08, x + wx + 0.08, 17.95, 18, 2.9 + h * 0.4, 3.05 + h * 0.4)
    # The chapel on the bridge's middle pier, its turret at the right third.
    chapel, slate = mat((0.86, 0.78, 0.64)), mat((0.24, 0.26, 0.3), 0.5)
    cx = 2.4
    box(chapel, cx - 0.7, cx + 0.7, 2.2, 2.6, 1.1, 3.2)
    prism(slate, cx - 0.8, cx + 0.8, 2.15, 3.2, 3.9)
    box(chapel, cx + 0.3, cx + 0.6, 2.1, 2.3, 3.2, 4.5)
    prism(slate, cx + 0.22, cx + 0.68, 2.05, 4.5, 5.6)
    arch(mat((0.16, 0.14, 0.14), 0.8), cx - 0.2, 2.1, 1.3, 0.3, 2.3)
    # The stone parapet along the far edge, 1.1 m, with its coping, and three lamp posts a wall that tile its width.
    stone, coping = mat((0.66, 0.52, 0.44), 0.9), mat((0.74, 0.62, 0.52), 0.8)
    box(stone, -9, 9, 1.4, 1.8, 0, 1.0)
    box(coping, -9, 9, 1.35, 1.85, 1.0, 1.1)
    for k in range(-4, 5):
        box(mat((0.58, 0.45, 0.38), 0.9), k * 1.6 - 0.06, k * 1.6 + 0.06, 1.38, 1.4, 0.05, 0.95)
    iron = mat((0.1, 0.11, 0.12), 0.5, 0.6)
    lamp = mat((0, 0, 0), 1.0, 0, ((1.0, 0.86, 0.6), 1.2))
    step = WIDTH / 3
    for k in range(-2, 3):
        x = k * step
        box(iron, x - 0.06, x + 0.06, 1.5, 1.62, 1.1, 4.4)
        box(iron, x - 0.14, x + 0.14, 1.48, 1.64, 1.1, 1.3)
        box(iron, x - 0.22, x + 0.22, 1.46, 1.66, 4.35, 4.45)
        box(lamp, x - 0.16, x + 0.16, 1.47, 1.65, 4.45, 4.85)
        box(iron, x - 0.2, x + 0.2, 1.46, 1.66, 4.85, 4.92)
    sun(-60, 3.0, (1.0, 0.82, 0.6))
    light(0, -6, 5, 500, (1, 0.9, 0.8), 16)
    render("basel-far-2.png")


def marktplatz():
    reset((0.96, 0.8, 0.62))
    floor((0.58, 0.54, 0.5))
    box(glow((0.98, 0.84, 0.64)), -9, 9, 30, 30.1, -1, TOP + 2)
    # The red Rathaus: its facade across the middle, three arches at the ground, a gallery, a stepped gable.
    red, dark, trim, gold = mat((0.62, 0.16, 0.12), 0.7), mat((0.12, 0.08, 0.07), 0.8), mat((0.82, 0.74, 0.58), 0.7), mat((0.82, 0.62, 0.22), 0.4, 0.5)
    box(red, -4.6, 3.2, 2.0, 2.6, 0, 4.7)
    box(trim, -4.7, 3.3, 1.95, 2.0, 2.4, 2.55)
    box(trim, -4.7, 3.3, 1.95, 2.0, 4.6, 4.75)
    for x in (-3.0, -0.7, 1.6):
        arch(dark, x, 1.94, 0, 0.75, 1.6)
        box(trim, x - 0.85, x + 0.85, 1.93, 1.95, 0, 0.12)
    for x in (-3.8, -2.6, -1.4, -0.2, 1.0, 2.2):
        box(dark, x - 0.22, x + 0.22, 1.94, 1.96, 2.9, 4.1)
        box(trim, x - 0.28, x + 0.28, 1.93, 1.94, 4.1, 4.22)
    for k in range(4):
        box(red, -3.4 + k * 0.6, 2.0 - k * 0.6, 2.0, 2.6, 4.7 + k * 0.32, 5.02 + k * 0.32)
    box(gold, -0.9, 0.3, 1.93, 1.95, 5.75, 5.95)
    # The tower at the right, its clock face blank, a slender spire.
    box(red, 3.4, 4.8, 2.0, 2.8, 0, 5.6)
    box(trim, 3.3, 4.9, 1.95, 2.0, 5.5, 5.65)
    prism(mat((0.24, 0.26, 0.3), 0.5), 3.3, 4.9, 1.95, 5.65, 6.25)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.05, location=(4.1, 1.9, 4.3), rotation=(math.pi / 2, 0, 0), vertices=48)
    bpy.context.active_object.data.materials.append(mat((0.94, 0.9, 0.8), 0.5))
    arch(dark, 4.1, 1.94, 0, 0.45, 1.3)
    # The houses either side, plain.
    box(mat((0.84, 0.72, 0.52)), -9, -4.6, 2.6, 2.8, 0, 5.0)
    box(mat((0.72, 0.78, 0.66)), 4.8, 9, 2.6, 2.8, 0, 4.6)
    # Flagpoles with blank banners.
    pole = mat((0.85, 0.85, 0.82), 0.4, 0.6)
    for x, c in ((-5.9, (0.1, 0.1, 0.12)), (-2.0, (0.92, 0.92, 0.9)), (3.0, (0.72, 0.12, 0.12))):
        box(pole, x - 0.04, x + 0.04, 1.6, 1.7, 0, 5.4)
        box(mat(c, 0.8), x + 0.04, x + 0.9, 1.6, 1.62, 4.3, 5.2)
    # Two market stalls with striped awnings, blocks on the square.
    for x, c in ((-5.3, (0.82, 0.24, 0.2)), (5.3, (0.22, 0.42, 0.62))):
        box(mat((0.55, 0.4, 0.28)), x - 0.9, x + 0.9, 1.1, 1.6, 0, 0.95)
        box(mat((0.5, 0.36, 0.24)), x - 0.85, x - 0.75, 1.1, 1.2, 0.95, 2.2)
        box(mat((0.5, 0.36, 0.24)), x + 0.75, x + 0.85, 1.1, 1.2, 0.95, 2.2)
        for k in range(6):
            box(mat(c if k % 2 == 0 else (0.94, 0.92, 0.88), 0.8), x - 1.0 + k * 0.333, x - 1.0 + (k + 1) * 0.333, 1.0, 1.65, 2.2, 2.45)
    sun(-60, 3.0, (1.0, 0.82, 0.6))
    light(0, -6, 5, 500, (1, 0.9, 0.8), 16)
    render("basel-far-3.png")


bridge()
marktplatz()
