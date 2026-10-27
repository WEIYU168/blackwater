"""Build the Blackwater cast in Blender, including editable source and web meshes.

Blender 4.5 LTS:
  blender --background --python tools/build_characters.py -- --output-dir models/characters --render-preview

Geometry is intentionally sculpted from tapered cross sections, not cube torsos.
All colours are embedded in mesh corner colours; no external textures are needed.
"""
import argparse
import array
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


PALETTE = {
    'skin': '#d9ac85', 'skinWarm': '#dcaa82', 'skinLight': '#e5bea0',
    'skinDark': '#bd8863', 'ear': '#b77a61', 'lip': '#986a58',
    'eye': '#e9dfca', 'iris': '#49382d', 'pupil': '#282622',
    'hair': '#34332e', 'hairHighlight': '#49473e', 'greyHair': '#736c60',
    'white': '#e8e7db', 'ivory': '#e0d8c4', 'blueWhite': '#cdd8d6',
    'navy': '#3b4c5b', 'pants': '#4a5050', 'shoe': '#3e362e',
    'leather': '#795b3b', 'sole': '#2d2c29', 'brass': '#b69a62',
    'sage': '#7e8c76', 'pink': '#ba929b', 'mint': '#a1c3bc',
    'brick': '#b7604e', 'wood': '#98754d', 'linen': '#d9d5c1',
    'bandage': '#e7e0cc', 'glasses': '#3c3930', 'paper': '#e9dfc5',
}

CAST = [
    dict(id='player', name='調查員 008', height=1.74, skin='skinWarm', hair='hair',
         shirt='#737e68', pants='#57564b', style='investigator', face='square'),
    dict(id='chen', name='陳拱北教授', height=1.76, skin='skinLight', hair='hair',
         shirt='ivory', pants='#484c51', style='professor', face='long', bow=True),
    dict(id='templekeeper', name='廟公', height=1.64, skin='skinWarm', hair='greyHair',
         shirt='#b9a580', pants='#56564b', style='keeper', face='elder'),
    dict(id='saltfarmer', name='鹽農', height=1.70, skin='skinDark', hair='hair',
         shirt='linen', pants='#68737a', style='farmer', face='square'),
    dict(id='labassistant', name='化驗助理', height=1.70, skin='skinLight', hair='hair',
         shirt='blueWhite', pants='#505960', style='assistant', face='long', glasses=True),
    dict(id='wang', name='王金河醫師', height=1.72, skin='skinLight', hair='hair',
         shirt='white', pants='#4c5457', style='doctor', face='long', glasses=True),
    dict(id='sun', name='孫理蓮女士', height=1.66, skin='skinLight', hair='greyHair',
         shirt='#515e72', pants='#515e72', style='sun', face='round', skirt=True),
    dict(id='mao', name='毛碧梅女士', height=1.60, skin='skinLight', hair='hair',
         shirt='#bd96a3', pants='#7f8774', style='mao', face='round', skirt=True),
    dict(id='engineer', name='工程人員', height=1.73, skin='skinWarm', hair='hair',
         shirt='#bfb18c', pants='#626f59', style='engineer', face='square'),
    dict(id='baoyu', name='寶玉', height=1.47, skin='skinLight', hair='hair',
         shirt='mint', pants='#6b7e93', style='girl', face='round', seated=True),
    dict(id='quance', name='泉策', height=1.27, skin='skinLight', hair='hair',
         shirt='brick', pants='#897e6a', style='girlSmall', face='round', seated=True),
    dict(id='clinicPatient', name='看診長者', height=1.67, skin='skinWarm', hair='greyHair',
         shirt='#99adb6', pants='#717f8b', style='patient', face='elder', seated=True),
]

MATERIALS = {}
PARTS = {}


def rgba(value):
    value = PALETTE.get(value, value).lstrip('#')
    rgb = [int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb) + (1.0,)


def material(value):
    key = PALETTE.get(value, value)
    if key not in MATERIALS:
        mat = bpy.data.materials.new(key)
        mat.diffuse_color = rgba(key)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = rgba(key)
        bsdf.inputs['Roughness'].default_value = .88
        MATERIALS[key] = mat
    return MATERIALS[key]


def node(name, parent, position=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = position
    obj.empty_display_size = .025
    return obj


def register(obj, part, colour, smooth=True):
    obj.parent = part
    obj.data.materials.append(material(colour))
    if smooth:
        for face in obj.data.polygons:
            face.use_smooth = True
    PARTS.setdefault(part, []).append(obj)
    return obj


def mesh(name, vertices, faces, part, colour, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return register(obj, part, colour, smooth)


def loft(name, rings, part, colour, segments=16, smooth=True):
    """rings = (height, half-width, half-depth, x offset, y offset)."""
    if rings[0][0] > rings[-1][0]:
        rings = list(reversed(rings))
    vertices = []
    for z, rx, ry, x, y in rings:
        for i in range(segments):
            a = i * math.tau / segments
            vertices.append((x + rx * math.sin(a), y - ry * math.cos(a), z))
    faces = []
    for j in range(len(rings) - 1):
        for i in range(segments):
            a = j * segments + i
            b = j * segments + (i + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple((len(rings) - 1) * segments + i for i in range(segments)))
    return mesh(name, vertices, faces, part, colour, smooth)


def ellipsoid(name, location, scale, part, colour, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.location = location
    obj.scale = scale
    return register(obj, part, colour)


def tube(name, points, radii, part, colour, segments=8):
    vertices = []
    for i, point in enumerate(points):
        p = Vector(point)
        tangent = Vector(points[min(i + 1, len(points) - 1)]) - Vector(points[max(0, i - 1)])
        tangent.normalize()
        up = Vector((0, 0, 1)) if abs(tangent.z) < .9 else Vector((0, 1, 0))
        u = tangent.cross(up).normalized()
        v = tangent.cross(u).normalized()
        radius = radii[i] if isinstance(radii, (list, tuple)) else radii
        for j in range(segments):
            a = j * math.tau / segments
            vertices.append(tuple(p + radius * (math.cos(a) * u + math.sin(a) * v)))
    faces = []
    for i in range(len(points) - 1):
        for j in range(segments):
            a, b = i * segments + j, i * segments + (j + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    faces += [tuple(reversed(range(segments))), tuple((len(points) - 1) * segments + j for j in range(segments))]
    return mesh(name, vertices, faces, part, colour)


def patch(name, points, part, colour, thickness=.006):
    verts = points + [(x, y + thickness, z) for x, y, z in points]
    n = len(points)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, verts, faces, part, colour, False)


def button(name, x, y, z, part, colour='brass', r=.008):
    return ellipsoid(name, (x, y, z), (r, .004, r), part, colour, 10, 6)


def box(name, location, scale, part, colour, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.location = location
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return register(obj, part, colour, False)


def hair_cap(part, colour, bob=False, bald=False, curled=False, width=1, depth=1):
    segments = 24
    vertices, faces = [], []
    # Follow the skull cross-sections with a visible clearance. A simple radial
    # dome intersects the wider temples and leaves accidental bald patches.
    skull = [(.035, .085, .083, -.010), (.082, .107, .100, -.002),
             (.137, .116, .105, .002), (.190, .111, .102, .005),
             (.235, .099, .093, .008), (.275, .073, .073, .008),
             (.300, .032, .037, .008), (.306, .006, .010, .008)]
    def outline(z):
        z = max(skull[0][0], min(skull[-1][0], z - .008))
        for a, b in zip(skull, skull[1:]):
            if a[0] <= z <= b[0]:
                t = (z - a[0]) / (b[0] - a[0])
                return tuple(a[j] + (b[j] - a[j]) * t for j in (1, 2, 3))
        return skull[-1][1:]
    for ring in range(9):
        t = ring / 8
        for i in range(segments):
            a = i * math.tau / segments
            front = max(0, math.cos(a))
            edge = (.034 if bob else .112) + (.202 if bob else .116) * front ** 3
            edge += .008 * math.sin(a) * front
            z = edge + (.319 - edge) * t
            rx, ry, cy = outline(z)
            clearance = .011 if curled else .007
            if bob and z < .19 and front < .7:
                rx, ry = max(rx, .116), max(ry, .103)
            rx = (rx + clearance) * width
            ry = (ry + clearance) * depth
            if ring == 8:
                rx, ry = .001, .001
            vertices.append((rx * math.sin(a), cy - ry * math.cos(a), z))
    for ring in range(8):
        for i in range(segments):
            a, b = ring * segments + i, ring * segments + (i + 1) % segments
            # Bald heads keep only a restrained horseshoe around ears and back.
            if not bald or (ring <= 2 and math.cos((i + .5) * math.tau / segments) < .25):
                faces.append((a, b, b + segments, a + segments))
    mesh('Sculpted hair cap', vertices, faces, part, colour)
    if bald:
        return
    if curled:
        for i in range(12):
            a = i * math.tau / 12
            cx, cy = .114 * math.sin(a), -.104 * math.cos(a)
            z = .20 + .035 * max(0, math.cos(a))
            pts = [(cx + .016 * math.cos(t), cy - .006, z + .018 * math.sin(t)) for t in [0, .9, 1.8, 2.7, 3.6, 4.5, 5.4]]
            tube('Soft hair wave', pts, .009, part, colour, 6)
    else:
        # Asymmetric side part with distinct swept locks rather than a half-sphere.
        for i in range(5):
            x = .055 - i * .014
            pts = [(x, -.071, .292), (x - .035, -.100, .279 - i * .004),
                   (x - .065, -.112, .250 - i * .005), (x - .092, -.092, .215 - i * .007)]
            tube('Side-swept lock', pts, [.007, .014, .015, .003], part,
                 'hairHighlight' if colour == 'hair' and i % 2 == 0 else colour, 6)
        tube('Part line', [(.055, -.091, .278), (.046, -.03, .308), (.025, .043, .301)], .0035, part, 'hairHighlight', 6)


def face(spec, head):
    shape = spec['face']
    w = 1.08 if shape == 'round' else (.93 if shape == 'long' else 1.0)
    depth = 1.01 if shape == 'round' else .97
    rings = [(-.012, .025, .045, 0, -.007), (.005, .056, .067, 0, -.014),
             (.035, .085, .083, 0, -.010), (.082, .107, .100, 0, -.002),
             (.137, .116, .105, 0, .002), (.190, .111, .102, 0, .005),
             (.235, .099, .093, 0, .008), (.275, .073, .073, 0, .008),
             (.300, .032, .037, 0, .008), (.306, .006, .010, 0, .008)]
    loft('Facial contour', [(z, x * w, y * depth, cx, cy) for z, x, y, cx, cy in rings], head, spec['skin'], 24)
    for side in (-1, 1):
        ellipsoid('Ear', (side * .112 * w, .003, .124), (.023, .019, .037), head, spec['skin'], 12, 8)
        ellipsoid('Ear inner fold', (side * .126 * w, -.012, .124), (.009, .005, .020), head, 'ear', 10, 6)
        x = side * .045 * w
        ellipsoid('Eye white', (x, -.102, .168), (.026, .007, .0105), head, 'eye', 16, 8)
        ellipsoid('Iris', (x, -.109, .168), (.0095, .0038, .010), head, 'iris', 12, 8)
        ellipsoid('Pupil', (x, -.112, .168), (.0044, .002, .0062), head, 'pupil', 10, 6)
        ellipsoid('Eye glint', (x - .0025, -.114, .171), (.0019, .0012, .002), head, 'eye', 8, 4)
        tube('Upper eyelid', [(x - .025, -.106, .167), (x - .012, -.110, .178), (x + .013, -.110, .178), (x + .026, -.104, .167)], .0033, head, 'ear', 6)
        tube('Eyebrow', [(x - .027, -.101, .199), (x - .010, -.108, .205), (x + .014, -.106, .202), (x + .028, -.098, .197)], [.0035, .006, .005, .002], head, spec['hair'], 6)
    loft('Nose bridge', [(.092, .014, .011, 0, -.108), (.104, .025, .020, 0, -.120), (.117, .022, .026, 0, -.120), (.143, .013, .017, 0, -.112), (.178, .009, .004, 0, -.101)], head, spec['skin'], 10)
    for side in (-1, 1):
        ellipsoid('Nostril', (side * .016, -.134, .102), (.005, .003, .0027), head, 'ear', 8, 4)
    tube('Closed relaxed mouth', [(-.030, -.096, .064), (-.015, -.105, .060), (0, -.107, .062), (.015, -.105, .060), (.030, -.096, .064)], [.002, .003, .003, .003, .002], head, 'lip', 6)
    tube('Lower lip', [(-.016, -.101, .054), (0, -.105, .052), (.016, -.101, .054)], .0025, head, 'ear', 6)
    if shape == 'elder':
        for z, width in ((.224, .060), (.241, .047)):
            tube('Forehead crease', [(-width, -.084, z), (0, -.096, z - .003), (width, -.084, z)], .0014, head, 'ear', 5)
        for side in (-1, 1):
            tube('Smile crease', [(side * .031, -.107, .097), (side * .042, -.096, .077), (side * .045, -.087, .052)], .0018, head, 'ear', 5)
    hair_cap(head, spec['hair'], bob=spec['style'] in ('girl', 'girlSmall'),
             bald=spec['style'] == 'patient', curled=spec['style'] in ('sun', 'mao'), width=w, depth=depth)
    if spec.get('glasses'):
        for side in (-1, 1):
            x = side * .048
            pts = [(x - .036, -.118, .194), (x + .032, -.118, .194), (x + .035, -.121, .144),
                   (x - .034, -.121, .144), (x - .036, -.118, .194)]
            tube('Rectangular spectacle frame', pts, .0048, head, 'glasses', 6)
            tube('Spectacle temple', [(side * .084, -.118, .185), (side * .118, -.038, .184), (side * .122, .016, .160)], .0035, head, 'glasses', 6)
        tube('Spectacle bridge', [(-.014, -.119, .183), (0, -.124, .188), (.014, -.119, .183)], .0036, head, 'glasses', 6)
    if spec['style'] == 'girlSmall':
        tube('Red hair ribbon', [(-.115, -.001, .16), (-.099, -.015, .251), (-.045, -.015, .311), (.045, -.015, .311), (.099, -.015, .251), (.115, -.001, .16)], .012, head, 'brick', 8)
        for x in (.098, .124):
            ellipsoid('Ribbon bow', (x, -.024, .263), (.021, .011, .014), head, 'brick', 12, 6)
    if spec['style'] == 'mao':
        ellipsoid('Low gathered bun', (0, .108, .104), (.070, .037, .049), head, spec['hair'], 16, 10)


def hat(spec, head):
    style = spec['style']
    if style not in ('investigator', 'farmer', 'engineer'):
        return
    if style == 'farmer':
        loft('Woven conical hat', [(.275, .245, .230, 0, .005), (.294, .225, .211, 0, .005), (.390, .095, .090, 0, .005), (.435, .010, .010, 0, .005)], head, '#bda779', 24)
        for i in range(12):
            a = i * math.tau / 12
            tube('Hat weave rib', [(.235 * math.sin(a), -.221 * math.cos(a), .282), (.128 * math.sin(a), -.119 * math.cos(a), .370), (.014 * math.sin(a), -.013 * math.cos(a), .433)], .0026, head, '#8f7e58', 5)
        tube('Hat chin cord', [(-.133, .012, .275), (-.091, -.03, .046), (0, -.085, .01), (.091, -.03, .046), (.133, .012, .275)], .0025, head, 'leather', 5)
    elif style == 'investigator':
        loft('Soft field hat brim', [(.267, .197, .183, 0, .0), (.279, .198, .184, 0, 0), (.286, .128, .118, 0, 0)], head, '#b9a478', 24)
        loft('Field hat crown', [(.278, .126, .117, 0, 0), (.340, .119, .109, 0, .01), (.374, .096, .092, 0, .008), (.378, .070, .078, 0, .01)], head, '#c4b18a', 20)
        loft('Hat leather band', [(.290, .128, .118, 0, 0), (.313, .126, .117, 0, 0)], head, 'leather', 20)
    else:
        loft('Canvas work cap', [(.255, .119, .111, 0, .005), (.310, .125, .119, 0, 0), (.351, .086, .086, 0, .005), (.359, .010, .010, 0, .01)], head, '#bca97d', 20)
        ellipsoid('Cap visor', (0, -.123, .261), (.121, .073, .012), head, '#a99970', 20, 6)


def clothing(spec, body, hip, shoulder):
    style = spec['style']
    coat = style in ('professor', 'assistant', 'doctor')
    broad = 1.10 if style == 'sun' else (1.03 if style == 'farmer' else 1)
    blouse_bottom = hip + .015
    rings = [(blouse_bottom, .158 * broad, .105, 0, 0), (hip + .12, .148 * broad, .102, 0, 0),
             (shoulder - .13, .181 * broad, .110, 0, .004), (shoulder - .035, .210 * broad, .106, 0, 0),
             (shoulder + .015, .174 * broad, .090, 0, 0), (shoulder + .055, .067, .060, 0, 0)]
    loft('Shaped shirt', rings, body, spec['shirt'], 20)
    loft('Neck', [(shoulder + .025, .052, .048, 0, .002), (shoulder + .115, .050, .045, 0, .0)], body, spec['skin'], 14)
    if spec.get('skirt'):
        skirt_end = hip - (.44 if style == 'sun' else .40)
        loft('Pleated skirt', [(skirt_end, .250 * broad, .157, 0, .013), (hip - .35, .233 * broad, .144, 0, .008), (hip - .15, .187 * broad, .120, 0, 0), (hip + .035, .187 * broad, .113, 0, 0)], body, spec['pants'], 24)
        for x in (-.16, -.08, .08, .16):
            tube('Skirt fold', [(x * .65, -.108, hip - .09), (x, -.146, skirt_end + .025)], .0025, body, '#6b766d' if style == 'mao' else '#455165', 5)
    if coat:
        # Open lower coat panels reveal the trousers and preserve a human waist.
        for side in (-1, 1):
            patch('Long coat panel', [(side * .016, -.112, hip + .17), (side * .155, -.097, hip + .17), (side * .171, -.090, hip - .19), (side * .026, -.121, hip - .19)], body, spec['shirt'])
            patch('Coat lapel', [(side * .020, -.111, shoulder + .035), (side * .094, -.101, shoulder + .014), (side * .119, -.114, shoulder - .105), (side * .039, -.122, shoulder - .200), (side * .060, -.123, shoulder - .087)], body, 'white')
        patch('Shirt beneath coat', [(-.047, -.113, shoulder + .032), (.047, -.113, shoulder + .032), (.032, -.119, hip + .08), (-.032, -.119, hip + .08)], body, '#c2cfd0')
    else:
        for side in (-1, 1):
            patch('Folded collar', [(side * .010, -.066, shoulder + .048), (side * .063, -.077, shoulder + .041), (side * .098, -.102, shoulder - .035), (side * .037, -.118, shoulder - .078)], body, 'ivory' if style == 'sun' else spec['shirt'])
    if spec.get('bow'):
        for side in (-1, 1):
            patch('Professor bow tie', [(side * .007, -.130, shoulder - .005), (side * .061, -.119, shoulder + .016), (side * .057, -.127, shoulder - .042), (side * .006, -.135, shoulder - .026)], body, 'navy')
        ellipsoid('Bow tie knot', (0, -.137, shoulder - .014), (.014, .010, .019), body, 'navy', 10, 6)
    elif coat:
        patch('Necktie', [(0, -.132, shoulder + .004), (.016, -.134, shoulder - .025), (.012, -.135, shoulder - .212), (0, -.138, shoulder - .236), (-.012, -.135, shoulder - .212), (-.016, -.134, shoulder - .025)], body, 'navy')
    for z in (shoulder - .12, shoulder - .22, shoulder - .32):
        button('Sewn button', .012 if coat else 0, -.116, z, body, 'ivory', .006)
    if style not in ('sun', 'girl', 'girlSmall', 'patient'):
        patch('Breast pocket', [(.083, -.113, shoulder - .095), (.151, -.101, shoulder - .095), (.148, -.103, shoulder - .176), (.086, -.115, shoulder - .176)], body, spec['shirt'])
        tube('Pocket seam', [(.083, -.118, shoulder - .100), (.15, -.106, shoulder - .100)], .002, body, 'ivory', 5)
        if coat:
            tube('Pocket pen', [(.105, -.120, shoulder - .082), (.105, -.120, shoulder - .126)], .004, body, 'navy', 6)
    if not spec.get('skirt'):
        loft('Trouser waistband', [(hip - .023, .157, .104, 0, 0), (hip + .018, .158, .106, 0, 0)], body, spec['pants'], 20)
        if not spec.get('seated'):
            loft('Leather belt', [(hip + .003, .161, .108, 0, 0), (hip + .028, .161, .108, 0, 0)], body, 'leather', 20)
            box('Belt buckle', (0, -.112, hip + .015), (.038, .010, .027), body, 'brass', .003)
    if style in ('farmer', 'patient'):
        for side in (-1, 1):
            patch('Cotton neck towel', [(side * .064, -.061, shoulder + .055), (side * .10, -.086, shoulder + .017), (side * .095, -.125, shoulder - .17), (side * .058, -.128, shoulder - .17)], body, 'ivory', .010)
    if style == 'sun':
        # Restrained tiny embroidery is part of the mesh, not a texture download.
        for x, z in [(-.12, shoulder - .15), (.12, shoulder - .26), (-.07, hip + .10), (.16, hip - .19), (-.17, hip - .32)]:
            for dx, dz in [(-.006, 0), (.006, 0), (0, .006), (0, -.006)]:
                button('Dress floral stitch', x + dx, -.13 if z > hip else -.158, z + dz, body, '#8995a4', .005)
    if style == 'investigator':
        tube('Satchel shoulder strap', [(-.16, -.08, shoulder + .006), (-.03, -.121, shoulder - .18), (.15, -.113, hip + .07), (.21, -.04, hip - .04)], .018, body, 'leather', 6)
        box('Field notebook satchel', (.225, -.022, hip - .056), (.19, .105, .235), body, 'leather', .020)
        box('Satchel flap', (.225, -.080, hip + .010), (.184, .018, .095), body, '#8d6b47', .012)
        button('Satchel clasp', .225, -.094, hip - .005, body, 'brass', .011)
    if style == 'engineer':
        tube('Rolled plan', [(-.20, -.035, hip - .08), (-.20, -.035, hip + .20)], .035, body, 'paper', 12)
        box('Tape measure', (.19, 0, hip), (.07, .07, .08), body, 'brass', .012)


def limbs(spec, root, body, hip, shoulder):
    short = spec['style'] in ('farmer', 'keeper', 'investigator', 'engineer', 'girl', 'girlSmall', 'patient', 'mao')
    skirt = spec.get('skirt')
    for side, suffix in ((-1, 'L'), (1, 'R')):
        arm = node('arm' + suffix, root, (side * .214, 0, shoulder - .016))
        arm.rotation_euler.y = side * -.055
        fore = node('forearm' + suffix, arm, (side * .012, 0, -.275))
        sleeve_end = -.175 if short else -.282
        loft('Sleeve ' + suffix, [(0.005, .065, .073, 0, 0), (-.07, .070, .071, side * .007, 0), (sleeve_end, .048, .057, side * .012, -.004)], arm, spec['shirt'], 14)
        if short:
            loft('Upper arm ' + suffix, [(-.163, .048, .052, side * .012, 0), (-.265, .044, .046, side * .012, -.005), (-.282, .040, .041, side * .012, 0)], arm, spec['skin'], 12)
            loft('Sleeve hem ' + suffix, [(sleeve_end - .002, .050, .059, side * .012, -.004), (sleeve_end + .015, .052, .060, side * .012, -.004)], arm, spec['shirt'], 14)
        fore_colour = spec['skin'] if short else spec['shirt']
        loft('Forearm ' + suffix, [(.015, .042, .044, 0, 0), (-.085, .043, .041, 0, -.008), (-.195, .032, .033, 0, -.012), (-.225, .027, .029, 0, -.013)], fore, fore_colour, 14)
        if not short:
            loft('Cuff ' + suffix, [(-.198, .034, .034, 0, -.012), (-.224, .034, .034, 0, -.012)], fore, 'white', 14)
            button('Cuff button', side * .031, -.024, -.211, fore, 'ivory', .005)
        loft('Palm ' + suffix, [(-.216, .026, .023, 0, -.014), (-.250, .037, .022, 0, -.020), (-.294, .034, .020, side * .003, -.021), (-.310, .023, .016, side * .003, -.018)], fore, spec['skin'], 12)
        tube('Thumb ' + suffix, [(side * -.025, -.025, -.242), (side * -.045, -.035, -.261), (side * -.041, -.040, -.283)], [.014, .013, .009], fore, spec['skin'], 8)
        for finger in (-.016, 0, .016):
            tube('Finger crease ' + suffix, [(finger, -.040, -.282), (finger, -.038, -.301)], .0011, fore, 'ear', 5)
        leg = node('leg' + suffix, root, (side * .091, 0, hip - .02))
        shin = node('shin' + suffix, leg, (0, 0, -.41))
        pants_colour = spec['skin'] if skirt else spec['pants']
        loft('Upper trouser ' + suffix, [(.024, .085, .093, 0, 0), (-.08, .080, .090, 0, .008), (-.26, .067, .074, 0, .008), (-.411, .056, .062, 0, 0)], leg, pants_colour, 16)
        calf_colour = spec['skin'] if (skirt or spec['style'] in ('farmer', 'girlSmall')) else spec['pants']
        loft('Lower leg ' + suffix, [(.018, .057, .062, 0, 0), (-.09, .061, .064, 0, .008), (-.24, .046, .050, 0, .009), (-.365, .034, .038, 0, 0)], shin, calf_colour, 16)
        if calf_colour != spec['skin']:
            loft('Trouser hem ' + suffix, [(-.315, .044, .045, 0, 0), (-.352, .041, .043, 0, 0)], shin, spec['pants'], 16)
        if spec.get('seated') and ((spec['style'] == 'patient' and side == -1) or spec['style'] in ('girl', 'girlSmall')):
            for band in range(6):
                z = -.18 - band * .024
                loft('Clean bandage layer', [(z, .050 - band * .002, .054 - band * .002, 0, .007), (z - .026, .050 - band * .002, .054 - band * .002, 0, .007)], shin, 'bandage' if band % 2 == 0 else '#d8d3c3', 14)
        sandals = spec['style'] in ('farmer', 'patient', 'girl', 'girlSmall', 'mao')
        ellipsoid('Foot ' + suffix, (0, -.042, -.373), (.046, .093, .033), shin, spec['skin'] if sandals else 'shoe', 16, 8)
        ellipsoid('Sole ' + suffix, (0, -.043, -.397), (.050, .096, .012), shin, 'sole', 16, 6)
        if sandals:
            tube('Sandal strap ' + suffix, [(-.044, -.071, -.367), (0, -.080, -.343), (.044, -.071, -.367)], .011, shin, 'leather', 8)
        else:
            for z in (-.009, .010, .029):
                tube('Shoe lace ' + suffix, [(-.026, -.029 + z, -.347), (.026, -.026 + z, -.347)], .0025, shin, 'ivory', 5)
        if spec.get('seated'):
            leg.rotation_euler.x = -math.pi / 2
            shin.rotation_euler.x = math.pi / 2
            arm.rotation_euler.x = -.16
            fore.rotation_euler.x = -1.0
        if spec['style'] == 'patient' and side == -1:
            # The examined foot rests farther forward on a clinic support stool.
            shin.rotation_euler.x = .38


def consolidate(parts, vertex_mat):
    for part, objects in parts.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        obj = bpy.context.object
        # Join preserves the first object's transform. Bake it into vertices so
        # the articulated parent remains the only transform used by the loader.
        local = obj.matrix_basis.copy()
        obj.data.transform(local)
        obj.matrix_basis.identity()
        colors = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
        for face in obj.data.polygons:
            mat = obj.data.materials[face.material_index]
            for corner in face.loop_indices:
                colors.data[corner].color = mat.diffuse_color
            face.material_index = 0
        obj.data.materials.clear()
        obj.data.materials.append(vertex_mat)
        obj.name = part.name + '_mesh'
        obj.data.update()


def build_character(spec, vertex_mat):
    global PARTS
    PARTS = {}
    col = bpy.data.collections.new(spec['id'] + ' | ' + spec['name'])
    bpy.context.scene.collection.children.link(col)
    layer = bpy.context.view_layer.layer_collection.children[col.name]
    bpy.context.view_layer.active_layer_collection = layer
    root = node(spec['id'], None)
    root['character_id'] = spec['id']
    root['display_name'] = spec['name']
    root.scale = (spec['height'] / 1.76,) * 3
    hip = .50 if spec.get('seated') else .90
    shoulder = hip + .425
    body = node('body', root)
    head = node('head', root, (0, 0, shoulder + .105))
    clothing(spec, body, hip, shoulder)
    face(spec, head)
    hat(spec, head)
    limbs(spec, root, body, hip, shoulder)
    consolidate(PARTS, vertex_mat)
    bpy.context.view_layer.update()
    if not spec.get('seated'):
        lowest = min((obj.matrix_world @ Vector(corner)).z
                     for obj in root.children_recursive if obj.type == 'MESH'
                     for corner in obj.bound_box)
        root.location.z -= lowest
    return col, root


def export_character(root, spec, binary):
    # Blender Z-up / -Y forward -> web Y-up / +Z forward.
    basis = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    inv = basis.inverted()
    nodes, total = [], 0
    def append_array(values):
        offset = len(binary)
        values = array.array('f', (round(v, 6) for v in values))
        if sys.byteorder != 'little':
            values.byteswap()
        binary.extend(values.tobytes())
        return dict(byteOffset=offset, length=len(values))
    def walk(obj, parent_name=None):
        nonlocal total
        local = basis @ obj.matrix_local @ inv
        loc, quat, scale = local.decompose()
        item = dict(name=obj.name.split('.')[0], parent=parent_name,
                    position=[round(x, 6) for x in loc],
                    quaternion=[round(quat.x, 7), round(quat.y, 7), round(quat.z, 7), round(quat.w, 7)],
                    scale=[round(x, 6) for x in scale])
        meshes = [child for child in obj.children if child.type == 'MESH']
        if meshes:
            data = meshes[0].data
            data.calc_loop_triangles()
            pos, normals, colours = [], [], []
            attr = data.color_attributes['Color']
            for tri in data.loop_triangles:
                for corner in tri.loops:
                    vertex = data.vertices[data.loops[corner].vertex_index]
                    p = basis.to_3x3() @ vertex.co
                    normal = basis.to_3x3() @ data.corner_normals[corner].vector
                    pos.extend(p)
                    normals.extend(normal)
                    colours.extend(attr.data[corner].color[:3])
            item['mesh'] = dict(positions=append_array(pos), normals=append_array(normals), colors=append_array(colours))
            item['triangles'] = len(data.loop_triangles)
            total += len(data.loop_triangles)
        nodes.append(item)
        for child in obj.children:
            if child.type == 'EMPTY':
                walk(child, item['name'])
    walk(root)
    return dict(name=spec['name'], height=spec['height'], seated=bool(spec.get('seated')), triangles=total, nodes=nodes)


def select_tree(root):
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def render_preview(out_dir, built):
    scene = bpy.context.scene
    # Linked mesh copies preserve the editable hero models at the world origin.
    preview = bpy.data.collections.new('Preview studio')
    scene.collection.children.link(preview)
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children[preview.name]
    for idx, (spec, col, root) in enumerate(built):
        mapping = {}
        for src in [root] + list(root.children_recursive):
            clone = src.copy()
            preview.objects.link(clone)
            mapping[src] = clone
        for src, clone in mapping.items():
            clone.parent = mapping.get(src.parent)
        clone_root = mapping[root]
        clone_root.location = ((idx % 6 - 2.5) * 1.1, (idx // 6) * 1.75, 0)
        clone_root.rotation_euler.z = -.08
        for obj in col.objects:
            obj.hide_render = True
        col.hide_viewport = True
        # Simple display stools make the seated silhouettes readable in the lineup.
        if spec.get('seated'):
            seat_height = .465 * spec['height'] / 1.76
            bpy.ops.mesh.primitive_cube_add(size=1, location=(clone_root.location.x, clone_root.location.y, seat_height - .025))
            stool = bpy.context.object
            stool.scale = (.40, .36, .05)
            stool.data.materials.append(material('#a29278'))
            for dx, dy in [(-.16, -.13), (.16, -.13), (-.16, .13), (.16, .13)]:
                bpy.ops.mesh.primitive_cube_add(size=1, location=(clone_root.location.x + dx, clone_root.location.y + dy, seat_height / 2 - .025))
                leg = bpy.context.object
                leg.scale = (.035, .035, seat_height - .05)
                leg.data.materials.append(material('#a29278'))
        bpy.ops.object.text_add(location=(clone_root.location.x, clone_root.location.y - .34, .012))
        label = bpy.context.object
        label.name = spec['id'] + '_label'
        label.data.body = spec['id']
        label.data.align_x = 'CENTER'
        label.data.size = .075
        label.rotation_euler = (0, 0, 0)
        label.data.extrude = .0005
        label.data.materials.append(material('#5e625d'))
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.02))
    ground = bpy.context.object
    ground.name = 'Warm studio floor'
    ground.data.materials.append(material('#e9e5dc'))
    world = bpy.data.worlds.new('Soft warm studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.72, .76, .80, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .45
    scene.world = world
    def light(name, pos, energy, size, colour):
        data = bpy.data.lights.new(name, 'AREA')
        data.energy, data.shape, data.size, data.color = energy, 'DISK', size, colour
        obj = bpy.data.objects.new(name, data)
        preview.objects.link(obj)
        obj.location = pos
        obj.rotation_euler = (Vector((0, .8, 1)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    light('Large soft key', (-3, -4, 7), 1300, 6, (1, .91, .79))
    light('Cool fill', (4, -1, 4), 700, 5, (.78, .87, 1))
    light('Shoulder rim', (1, 5, 6), 1100, 4, (1, .94, .83))
    data = bpy.data.cameras.new('Cast camera')
    camera = bpy.data.objects.new('Cast camera', data)
    preview.objects.link(camera)
    camera.location = (4.1, -10, 7.0)
    target = Vector((0, .8, .87))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = 8.2
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 2400
    scene.render.resolution_y = 1450
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(out_dir / 'characters-preview.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(out_dir / 'blackwater-characters.blend'))
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--render-preview', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    bpy.context.preferences.filepaths.save_version = 0
    out_dir = Path(args.output_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for col in list(bpy.data.collections):
        if col.name != 'Collection':
            bpy.data.collections.remove(col)
    vertex_mat = bpy.data.materials.new('Illustrated linen / vertex colour')
    vertex_mat.use_nodes = True
    bsdf = vertex_mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = .88
    attr = vertex_mat.node_tree.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Color'
    vertex_mat.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    built, binary, characters = [], bytearray(), {}
    for spec in CAST:
        col, root = build_character(spec, vertex_mat)
        bpy.context.view_layer.update()
        characters[spec['id']] = export_character(root, spec, binary)
        select_tree(root)
        bpy.ops.export_scene.gltf(filepath=str(out_dir / (spec['id'] + '.glb')), export_format='GLB',
                                  use_selection=True, export_yup=True, export_apply=False,
                                  export_animations=False, export_materials='EXPORT')
        built.append((spec, col, root))
        print('BUILT', spec['id'], characters[spec['id']]['triangles'], 'triangles', flush=True)
    (out_dir / 'characters-meshes.bin').write_bytes(binary)
    library = dict(version=1, coordinates='Y-up, +Z forward', colorSpace='linear-sRGB',
                   buffer='characters-meshes.bin', characters=characters)
    (out_dir / 'characters.json').write_text(json.dumps(library, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(out_dir / 'blackwater-characters.blend'))
    if args.render_preview:
        render_preview(out_dir, built)
    print('COMPLETE', len(characters), 'characters', len(binary), 'mesh bytes', flush=True)


if __name__ == '__main__':
    main()
