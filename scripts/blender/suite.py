# The suite's three rooms (story spec 8.4), rendered straight on for the owner to paint over in Codex: the living room, the
# bedroom and the balcony, each 1536 by 1024 with the floor's edge three-quarters of the way down.
# Run with: & "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/suite.py
import bpy, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "art", "outgoing", "renders")
WIDTH = 8.6
HEIGHT = WIDTH * 1024 / 1536
CEIL = 3.6


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
    # Straight on, the floor's edge at three-quarters of the way down.
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


def ball(m, x, y, z, r):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z), segments=24, ring_count=16)
    o = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)


def light(x, y, z, power, color=(1, 0.85, 0.65), size=0.6):
    d = bpy.data.lights.new("l", "AREA")
    d.energy = power
    d.color = color
    d.size = size
    o = bpy.data.objects.new("l", d)
    o.location = (x, y, z)
    bpy.context.collection.objects.link(o)


def shell(wall, floor_m, trim):
    """The back wall, the floor to the bottom of the frame, the ceiling band, the baseboard and crown."""
    box(wall, -6, 6, 2, 2.2, -1, CEIL + 3)
    box(floor_m, -6, 6, -8, 2, -0.2, 0)
    plain_floor((0.2, 0.17, 0.2))
    box(trim, -6, 6, 1.95, 2, 0, 0.16)
    box(trim, -6, 6, 1.95, 2, CEIL - 0.2, CEIL)
    box(mat((0.82, 0.76, 0.66)), -6, 6, -8, 2, CEIL, CEIL + 0.2)


def plain_floor(c):
    """What the frame sees below the floor's edge: the same color, plain, lit evenly."""
    box(mat(c, 1.0, 0.0, (c, 0.9)), -6, 6, -8.2, -8, -4, -0.001)


def lamp(x, y, shade, brass, power=120):
    box(brass, x - 0.03, x + 0.03, y - 0.03, y + 0.03, 0, 1.55)
    box(brass, x - 0.16, x + 0.16, y - 0.16, y + 0.16, 0, 0.04)
    box(shade, x - 0.24, x + 0.24, y - 0.2, y + 0.2, 1.5, 1.92)
    light(x, y - 0.6, 1.75, power)


def fill():
    light(0, -7, CEIL - 0.3, 520, (1, 0.95, 0.88), 10)
    light(0, -5, 1.2, 120, (1, 0.96, 0.9), 12)


# The room's own colors, the hotel's.
def materials():
    return {
        "wall": mat((0.62, 0.5, 0.34)),
        "panel": mat((0.5, 0.39, 0.25)),
        "carpet": mat((0.2, 0.17, 0.2), 0.95),
        "trim": mat((0.8, 0.72, 0.55)),
        "wood": mat((0.2, 0.09, 0.04), 0.45),
        "brass": mat((0.75, 0.55, 0.2), 0.3, 1.0),
        "shade": mat((1, 0.9, 0.7), 0.5, 0.0, ((1.0, 0.8, 0.5), 3.0)),
        "cloth": mat((0.09, 0.14, 0.26), 0.85),
        "cushion": mat((0.55, 0.42, 0.2), 0.85),
        "white": mat((0.85, 0.83, 0.78), 0.8),
        "steel": mat((0.5, 0.52, 0.55), 0.3, 0.8),
        "glass": mat((0.05, 0.07, 0.12), 0.2),
    }


def frame(M, x0, x1, z0, z1, art):
    box(M["brass"], x0 - 0.06, x1 + 0.06, 1.93, 1.97, z0 - 0.06, z1 + 0.06)
    box(art, x0, x1, 1.9, 1.95, z0, z1)


def render(name):
    os.makedirs(OUT, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


# The living room: the sofa, the coffee table with the fruit basket, the minibar, a lamp.
reset()
M = materials()
shell(M["wall"], M["carpet"], M["trim"])
fill()
box(M["cloth"], -3.0, -0.8, 0.9, 1.75, 0.18, 0.55)
box(M["cloth"], -3.0, -0.8, 1.55, 1.8, 0.5, 1.05)
for x0, x1 in ((-3.15, -2.95), (-0.85, -0.65)):
    box(M["cloth"], x0, x1, 0.9, 1.8, 0.18, 0.74)
for x in (-2.55, -1.3):
    box(M["cushion"], x - 0.32, x + 0.32, 1.25, 1.55, 0.55, 1.0)
for x in (-3.05, -0.75):
    box(M["wood"], x - 0.05, x + 0.05, 0.95, 1.75, 0, 0.18)
box(M["wood"], -0.4, 1.1, -0.4, 0.5, 0.52, 0.6)
for x in (-0.3, 1.0):
    box(M["wood"], x - 0.04, x + 0.04, 0, 0.1, 0, 0.52)
box(M["brass"], 0.12, 0.58, 0, 0.3, 0.6, 0.7)
for (x, z, c) in ((0.24, 0.77, (0.7, 0.06, 0.05)), (0.48, 0.77, (0.2, 0.5, 0.1)), (0.36, 0.86, (0.8, 0.5, 0.05))):
    ball(mat(c, 0.35), x, 0.05, z, 0.1)
# The minibar: a low wood cabinet, a glass-doored fridge in it, bottles on top.
box(M["wood"], 1.7, 3.3, 1.2, 1.95, 0, 0.95)
box(M["steel"], 1.85, 2.5, 1.15, 1.25, 0.08, 0.85)
box(M["glass"], 1.92, 2.43, 1.12, 1.16, 0.14, 0.78)
box(M["wood"], 2.62, 3.2, 1.15, 1.2, 0.5, 0.88)
box(M["wood"], 2.62, 3.2, 1.15, 1.2, 0.1, 0.46)
for x, c in ((2.6, (0.15, 0.3, 0.12)), (2.8, (0.35, 0.12, 0.05)), (3.0, (0.75, 0.7, 0.55))):
    box(mat(c, 0.2), x - 0.05, x + 0.05, 1.55, 1.65, 0.95, 1.3)
lamp(-3.8, 1.5, M["shade"], M["brass"])
frame(M, -0.3, 0.9, 1.5, 2.5, mat((0.25, 0.38, 0.45)))
box(M["trim"], -6, 6, 1.94, 1.98, 0.95, 1.0)
render("suite-1.png")

# The bedroom: the king bed with its headboard, the nightstands, the lamp.
reset()
M = materials()
shell(M["wall"], M["carpet"], M["trim"])
fill()
box(M["wood"], -2.9, 2.2, 1.85, 1.95, 0, 1.55)
box(M["cushion"], -2.75, 2.05, 1.8, 1.88, 0.55, 1.42)
box(M["wood"], -2.75, 2.05, -0.7, 1.8, 0.05, 0.3)
box(M["white"], -2.7, 2.0, -0.75, 1.78, 0.3, 0.77)
box(M["cloth"], -2.72, 2.02, -0.8, 0.7, 0.3, 0.8)
for x in (-1.9, -0.7, 0.45, 1.5):
    box(M["white"], x - 0.5, x + 0.5, 1.2, 1.72, 0.76, 1.12)
for x in (-3.65, 2.95):
    box(M["wood"], x - 0.45, x + 0.45, 1.4, 1.92, 0, 0.62)
    box(M["brass"], x - 0.1, x + 0.1, 1.38, 1.4, 0.32, 0.36)
    box(M["brass"], x - 0.05, x + 0.05, 1.6, 1.7, 0.62, 0.95)
    box(M["shade"], x - 0.2, x + 0.2, 1.48, 1.82, 0.95, 1.25)
    light(x, 1.0, 1.15, 45)
frame(M, -1.2, 0.5, 1.95, 2.8, mat((0.42, 0.3, 0.2)))
render("suite-2.png")

# The balcony: the rail, the city's lights at night beyond it, the pool's glint far below.
reset()
M = materials()
random.seed(14)
box(mat((0.015, 0.02, 0.06), 1.0), -6, 6, 6, 6.2, -2, 8)
box(mat((0.36, 0.34, 0.33), 0.5), -6, 6, -8, 2.5, -0.2, 0)
plain_floor((0.32, 0.3, 0.3))
for i in range(-6, 7):
    box(mat((0.2, 0.19, 0.19)), i - 0.012, i + 0.012, -8, 2.5, -0.19, 0.004)
# The city: dark towers, their windows lit.
for b in range(18):
    x = -5 + b * 0.6 + random.uniform(-0.1, 0.1)
    top = random.uniform(1.0, 3.3)
    box(mat((0.02, 0.03, 0.07)), x - 0.26, x + 0.26, 5, 5.3, -2, top)
    z = 0.2
    while z < top - 0.1:
        for wx in (x - 0.15, x, x + 0.15):
            if random.random() < 0.45:
                c = random.choice(((1, 0.8, 0.45), (1, 0.92, 0.7), (0.7, 0.85, 1)))
                box(mat((0, 0, 0), 0.5, 0, (c, random.uniform(2, 6))), wx - 0.035, wx + 0.035, 4.98, 5, z, z + 0.08)
        z += 0.2
# The pool far below, a glint under the rail's line.
box(mat((0.05, 0.3, 0.45), 0.2, 0, ((0.2, 0.6, 0.8), 1.2)), -2.2, 0.6, 4.6, 4.8, 0.1, 0.34)
# The rail, brass and glass.
glass = mat((0.25, 0.32, 0.38), 0.15)
box(M["brass"], -6, 6, 2.4, 2.5, 1.08, 1.16)
box(M["brass"], -6, 6, 2.42, 2.48, 0.05, 0.1)
for x in range(-5, 6):
    box(M["steel"], x - 0.025, x + 0.025, 2.42, 2.48, 0, 1.1)
light(0, -7, 3.2, 260, (0.85, 0.9, 1), 10)
light(-3.6, 1.2, 2.5, 40)
# A wall lamp on the end of the building, by the doors.
box(M["wall"], -6, -3.9, 2.4, 2.6, 0, CEIL + 3)
box(M["brass"], -4.14, -4.0, 2.2, 2.4, 1.7, 2.2)
box(M["shade"], -4.2, -3.96, 2.1, 2.3, 1.76, 2.14)
render("suite-3.png")
