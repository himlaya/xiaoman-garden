"""Build the entire botanical collection with Blender, then export production GLBs.

blender --background --factory-startup --python scripts/build-blender-flowers.py
Pass -- --keep-existing to export only missing assets. Add --rebuild=ID for
each species whose exports should be refreshed.
Coordinates in the helpers are Y-up; mesh creation converts to Blender Z-up.
Petal layers use offset shells and separate angular sectors rather than rotated
planes that cut through the flower centre. Only attachment points overlap.
"""
import bpy
import json
import math
import sys
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art' / 'blender'
OUT = ROOT / 'www' / 'models' / 'flowers'
ART.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
RECIPES = json.loads((ART / 'recipes.json').read_text(encoding='utf-8'))
TAU = math.tau
manifest_path = OUT / 'manifest.json'
manifest = {'version': 2, 'generator': 'Blender ' + bpy.app.version_string, 'models': {}}
rebuild = {arg.partition('=')[2] for arg in sys.argv if arg.startswith('--rebuild=')}
unknown = rebuild - {flower['id'] for flower in RECIPES}
if unknown:
    raise ValueError(f'Unknown flower IDs: {sorted(unknown)}')
keep_existing = '--keep-existing' in sys.argv or bool(rebuild)
if manifest_path.exists() and keep_existing:
    manifest['models'] = json.loads(manifest_path.read_text(encoding='utf-8'))['models']
row_count = len(RECIPES)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def rgb(value):
    # Blender shader inputs are linear, while the palette is sRGB.
    result = []
    for i in (1, 3, 5):
        c = int(value[i:i+2], 16) / 255
        result.append(c / 12.92 if c <= .04045 else ((c+.055)/1.055)**2.4)
    return result

def material(name, colour, roughness=.84):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb(colour), 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = m.diffuse_color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular IOR Level'].default_value = .22
    m.use_backface_culling = False
    return m

class BotanicalMesh:
    def __init__(self, name, role, mat, collection, thin=False):
        self.name, self.role, self.mat, self.collection = name, role, mat, collection
        self.thin = thin
        self.vertices, self.faces, self.uvs, self.colours = [], [], [], []

    def surface(self, fn, rows=12, cols=6, wrap=False):
        start = len(self.vertices)
        for i in range(rows+1):
            t = i/rows
            for j in range(cols+1):
                u = j/cols
                x, y, z = fn(t, u)
                self.vertices.append((x, -z, y))
                self.uvs.append((u, t))
                # Subtle root-to-edge pigment and veins remain in the standalone GLB.
                if self.thin and self.role in ('petal', 'leaf'):
                    pigment = .79 + .19*t + .008*math.cos(u*36+t*9)
                else:
                    pigment = .64 + .33*t + .025*math.cos(u*42 + t*9)
                base = self.mat.diffuse_color
                self.colours.append(tuple(c*pigment for c in base[:3]) + (1,))
        for i in range(rows):
            for j in range(cols):
                a = start+i*(cols+1)+j
                self.faces.append((a, a+1, a+cols+2, a+cols+1))

    def finish(self):
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        mesh.validate(verbose=False)
        uv = mesh.uv_layers.new(name='UVMap')
        for loop in mesh.loops:
            uv.data[loop.index].uv = self.uvs[loop.vertex_index]
        colour = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        for i, c in enumerate(self.colours):
            colour.data[i].color = c
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        obj = bpy.data.objects.new(self.name, mesh)
        self.collection.objects.link(obj)
        obj.data.materials.append(self.mat)
        if not self.mat.node_tree.nodes.get('Petal pigment'):
            pigment = self.mat.node_tree.nodes.new('ShaderNodeVertexColor')
            pigment.name = 'Petal pigment'
            pigment.layer_name = 'Color'
            self.mat.node_tree.links.new(pigment.outputs['Color'], self.mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
        obj['botanical'] = self.role
        if self.role in ('petal', 'leaf'):
            solid = obj.modifiers.new('Botanical edge thickness', 'SOLIDIFY')
            if self.thin:
                solid.thickness = .00038 if self.role == 'petal' else .0011
            else:
                solid.thickness = .0025 if self.role == 'petal' else .0035
            solid.offset = 0
        return obj

def add(a, b): return tuple(a[i]+b[i] for i in range(3))
def mul(a, s): return tuple(v*s for v in a)

def basis(axis):
    n = Vector(axis).normalized()
    a = n.cross(Vector((0, 1, 0)) if abs(n.y)<.95 else Vector((1, 0, 0))).normalized()
    b = n.cross(a).normalized()
    return tuple(a), tuple(b), tuple(n)

def tube(mesh, points, radius=.018, sides=8, tip_scale=1):
    points = [Vector(p) for p in points]
    if not mesh.thin:
        for k,(p,q) in enumerate(zip(points,points[1:])):
            a,b,_ = basis(q-p)
            def segment(t,u):
                width = radius*(1+(tip_scale-1)*(k+t)/(len(points)-1))
                edge = add(mul(a,width*math.cos(u*TAU)),mul(b,width*math.sin(u*TAU)))
                return add(tuple(p.lerp(q,t)),edge)
            mesh.surface(segment,1,sides)
        return
    frames = []
    for i, point in enumerate(points):
        previous = points[max(0, i-1)]
        following = points[min(len(points)-1, i+1)]
        axis = (following-previous).normalized()
        if frames:
            # Project the previous ring onto the new plane to avoid seams at bends.
            across = frames[-1][0] - axis*frames[-1][0].dot(axis)
            across.normalize()
        else:
            across = Vector(basis(axis)[0])
        frames.append((across, axis.cross(across).normalized()))

    def surface(t, u):
        end = len(points)-1
        row = round(t*(end+2))-1
        i = max(0,min(end,row))
        width = radius*(1+(tip_scale-1)*i/end)
        if row < 0 or row > end:
            width *= .001
        a,b = frames[i]
        angle = u*TAU
        return tuple(points[i]+width*(a*math.cos(angle)+b*math.sin(angle)))

    mesh.surface(surface, len(points)+1, sides)

def orb(mesh, center, radius, flatten=1, rows=8, sides=16):
    mesh.surface(lambda t,u: (center[0]+radius*math.sin(.005+t*(math.pi-.01))*math.cos(u*TAU), center[1]+radius*flatten*math.cos(.005+t*(math.pi-.01)), center[2]+radius*math.sin(.005+t*(math.pi-.01))*math.sin(u*TAU)), rows, sides)

def petal(mesh, center, angle, length, span, base, rise=.1, cup=.1, ruffle=0, pointed=False, axes=None, resolution=(12,6), rounded=False, sweep=0):
    """An annular petal wedge with separated, noncrossing left/right edges."""
    def point(t,u):
        across = u*2-1
        outline = max(.012, math.sin(math.pi*t*(.7 if rounded else 1))**(.8 if pointed else .48))
        theta = angle + sweep*t*t + across*span*outline
        radius = base + length*t*(1-.24*abs(across)**4*t**5 if rounded else 1)
        y = rise*t + cup*t*t + .025*across*across*math.sin(math.pi*t)
        y += ruffle*math.sin(across*19+t*17)*abs(across)**4*t**3
        p = (radius*math.cos(theta), y, radius*math.sin(theta))
        if axes:
            a,b,n=axes
            p=add(add(mul(a,p[0]),mul(b,p[2])),mul(n,p[1]))
        return add(center,p)
    mesh.surface(point,*resolution)

def leaves(mesh, stem, flower_id, rank):
    long = flower_id in ('tulip','hyacinth','lily','iris','orchid')
    count = 4 if long else 3
    width = {'cosmos':.045,'carnation':.045,'iris':.07,'tulip':.15,'orchid':.24,'peony':.2,'hydrangea':.22,'true-lily':.065,'gardenia':.17,'camellia':.14,'gypsophila':.022}.get(flower_id,.14)
    length = .85 if flower_id in ('iris','lily','tulip') else .58
    if flower_id == 'true-lily': count = 6
    for k in range(count):
        height = .035+k*.025 if long else .22+k*.23
        if flower_id == 'true-lily': height = .24 + k*.18
        center = stem(height)
        angle = k*2.4 + rank*.11
        def fn(t,u,center=center,angle=angle):
            across = (u*2-1)*width*max(.008,math.sin(math.pi*t)**.7)
            if flower_id == 'camellia': across *= 1 + .055*math.sin(t*TAU*14)
            reach = length*t*(.6 if flower_id=='iris' else .9)
            lift = length*t*(1.15 if flower_id=='iris' else .55)-.16*t*t
            midrib = .035*(1-(u*2-1)**2)*math.sin(math.pi*t)
            return (center[0]+math.cos(angle)*reach-math.sin(angle)*across,center[1]+lift+midrib,center[2]+math.sin(angle)*reach+math.cos(angle)*across)
        mesh.surface(fn,14,6)


REALISTIC_FLOWERS = {'jasmine', 'true-lily', 'gardenia', 'camellia', 'gypsophila', 'peony'}


def local_point(origin, axes, x, y, z):
    a, b, n = axes
    return add(origin, add(add(mul(a, x), mul(b, z)), mul(n, y)))


def blade(mesh, origin, angle, length, width, lift, droop, teeth=0, lobed=False):
    axes = ((math.cos(angle), 0, math.sin(angle)), (-math.sin(angle), 0, math.cos(angle)), (0, 1, 0))

    def surface(t, u):
        v = 2*u - 1
        outline = max(.016, math.sin(math.pi*t)**.83)
        serration = 1 + teeth*math.sin(t*TAU*9)*abs(v)**4
        if lobed:
            serration *= 1 + .21*math.sin(t*TAU*2.65)*abs(v)**3
        return local_point(origin, axes, length*t*(1-.12*v*v*t**3),
                           lift*t-droop*t*t+outline*width*.28*(1-v*v)+width*.46*v*t,
                           width*v*outline*serration)

    mesh.surface(surface, 24 if teeth or lobed else 14, 8)


def realistic_leaves(mesh, branches, stem, fid, rank, height):
    if fid == 'peony':
        for i in range(3):
            angle = i*2.39 + rank*.18
            base = stem(height*(.25+.17*i))
            forward = (math.cos(angle), 0, math.sin(angle))
            sideways = (-forward[2], 0, forward[0])
            fork = add(base, add(mul(forward,.23),(0,.14,0)))
            tube(branches, [base,fork], .011, 6, .60)
            for side in (-1,1):
                joint = add(fork,add(mul(forward,.12),mul(sideways,side*.105)))
                tube(branches,[fork,joint],.007,5,.6)
                for leaflet in (-1,1):
                    blade(mesh,joint,angle+side*.85+leaflet*.46,.26,.075,.13,.052,lobed=True)
            blade(mesh,fork,angle,.43,.107,.23,.10,lobed=True)
        return

    count, length, width, lift, droop = {
        'jasmine': (3,.37,.096,.18,.068),
        'gardenia': (3,.47,.138,.20,.075),
        'camellia': (6,.41,.109,.22,.091),
        'true-lily': (9,.53,.057,.30,.23),
        'gypsophila': (5,.21,.021,.10,.04),
    }[fid]
    for i in range(count):
        base = stem(height*(.18+i*.61/count))
        whorl = 1 if fid in ('camellia','true-lily') else 2
        if fid == 'gardenia' and i == 2:
            whorl = 3
        for j in range(whorl):
            angle = i*(2.39 if whorl==1 else 1.41) + rank*.18 + j*TAU/whorl
            tip = add(base,(.037*math.cos(angle),.022,.037*math.sin(angle)))
            if fid == 'true-lily':
                tip = base
            else:
                tube(branches,[base,tip],.006,5,.7)
            blade(mesh,tip,angle,length*(1-.38*i/count),width*(1-.20*i/count),
                  lift,droop,teeth=.067 if fid=='camellia' else 0)


def corolla(mesh, origin, axes, angle, length, width, rise, recurvature,
            seed, sweep=0, shoulder=.72, edge=.012, throat=0, resolution=(18,10),
            sector=None, layer_gap=None):
    a,b,n = axes
    radial = add(mul(a,math.cos(angle)),mul(b,math.sin(angle)))
    tangent = add(mul(a,-math.sin(angle)),mul(b,math.cos(angle)))
    exponent = math.log(.5)/math.log(shoulder)

    def surface(t,u):
        v = 2*u-1
        profile = max(.014,math.sin(math.pi*(.014+.986*t)**exponent)**.57)
        wrinkle = edge*(math.sin(v*8+seed)+.32*math.sin(v*19+seed*2))*t**6
        reach = length*(t-.13*v*v*t**5)+wrinkle
        across = v*width*profile+sweep*t*t
        height = rise*t + throat*math.sin(math.pi*t*.84)-recurvature*t**4
        height += width*.26*v*v*profile+wrinkle*.64
        if sector:
            base_radius, half_angle = sector
            limit = (base_radius+reach)*math.tan(half_angle)
            ratio = across/max(.0001,limit)
            across = limit*math.tanh(ratio) if length<.20 else across/(1+ratio**6)**(1/6)
        if layer_gap:
            # Every tier follows the same bowl. Its local curvature stays
            # inside its allotted height band even when petals overlap in plan.
            r = math.hypot(sector[0]+reach,across)
            height = .22*r + layer_gap*.39*math.tanh(height/layer_gap)
        return local_point(origin,(radial,tangent,n),reach,height,across)

    mesh.surface(surface,*resolution)


def elliptical_tip(mesh, center, axes, length, width, depth):
    def surface(t,u):
        v = .01+t*(math.pi-.02)
        a = u*TAU
        return local_point(center,axes,length*math.cos(v),depth*math.sin(v)*math.sin(a),
                           width*math.sin(v)*math.cos(a))
    mesh.surface(surface,6,9)


def stamens(filaments, anthers, origin, axes, count, spread, height, size):
    a,b,n = axes
    for i in range(count):
        angle = i*2.399963 if count>8 else i*TAU/count+.21
        radial = add(mul(a,math.cos(angle)),mul(b,math.sin(angle)))
        tangent = add(mul(a,-math.sin(angle)),mul(b,math.cos(angle)))
        radius = spread*(.4+.6*math.sqrt((i+.5)/count)) if count>8 else spread
        points = [add(origin,mul(radial,radius*.27)),
                  add(add(origin,mul(n,height*.60)),mul(radial,radius*.63)),
                  add(add(origin,mul(n,height*(.93+.09*math.sin(i*2.2)))),mul(radial,radius))]
        tube(filaments,points,size*.20,5,.60)
        elliptical_tip(anthers,points[-1],(tangent,radial,n),size,size*.42,size*.34)


def layered_bloom(petals, center, axes, rings, count, radius, fid, rank):
    for ring in range(rings):
        scale = 1-ring*.81/(rings+.3)
        petals_in_ring = max(4,count-ring//2)
        gap = radius*(.071 if fid=='peony' else .061)
        for i in range(petals_in_ring):
            noise = math.sin(i*4.76+ring*2.14+rank)
            irregularity = .025 if fid=='camellia' else .065
            angle = (i+ring*.618)*TAU/petals_in_ring+noise*irregularity
            base = radius*.115*scale
            root = local_point(center,axes,base*math.cos(angle),gap*ring,base*math.sin(angle))
            length = radius*scale*(.78+irregularity*noise)
            width = length*(.37 if fid=='gardenia' else .42)
            rise = radius*(.11+.021*ring)*(1.26 if fid=='peony' else 1)
            sweep = length*(.125 if fid=='gardenia' else .026+.028*noise)
            edge = length*(.010 if fid=='camellia' else .017+.003*rank)
            corolla(petals,root,axes,angle,length,width,rise,length*.072,i+ring*3,
                    sweep,.72,edge,sector=(base,math.pi/petals_in_ring-irregularity-.008),
                    layer_gap=gap)


def small_flower(petals, centers, greens, origin, axis, length, count, rings, twist):
    axes = basis(axis)
    throat = add(origin,mul(axes[2],length*.24))
    tube(greens,[origin,throat],length*.18,6,.73)
    resolution = (5,4) if length < .065 else (8,6)
    for ring in range(rings):
        for i in range(count):
            angle = i*TAU/count+ring*.48
            base = length*.115
            gap = length*.22
            root = local_point(throat,axes,base*math.cos(angle),ring*gap,base*math.sin(angle))
            corolla(petals,root,axes,angle,length*(1-ring*.22),length*.30,
                    length*.16,length*.10,i,length*twist,.70,length*.014,
                    resolution=resolution,sector=(base,math.pi/count-.025),layer_gap=gap)
    elliptical_tip(centers,throat,axes,length*.14,length*.14,length*.11)


def realistic_bloom(fid, form, rank, stem, height, p, s, c, pollen):
    center = stem(height)
    if fid in ('gardenia','camellia','peony'):
        axes = basis((.08,.84,.54) if fid=='peony' else (.07,.68,.74))
        radius = {'gardenia':.55,'camellia':.61,'peony':.68}[fid]*form['width']
        rings = 1 if fid=='peony' and rank==0 else form.get('rings',form.get('layers'))
        calyx = add(center,mul(axes[2],-.065))
        for i in range(5):
            corolla(s,calyx,axes,i*TAU/5,radius*.23,radius*.075,.02,.049,i,
                    shoulder=.47,resolution=(8,5))
        layered_bloom(p,center,axes,rings,form.get('petals',8+rank),radius,fid,rank)
        # The receptacle meets the petal bases from below. The central bud
        # fits inside the innermost ring, away from the visible petal faces.
        elliptical_tip(s,add(center,mul(axes[2],-.028)),axes,
                       radius*.12,radius*.12,.036)
        if fid=='gardenia' or rings>3:
            inner_scale = 1-(rings-1)*.81/(rings+.3)
            core_width = radius*.107*inner_scale
            core_height = radius*(.071 if fid=='peony' else .061)*(rings-1)
            elliptical_tip(p,add(center,mul(axes[2],core_height+.012)),axes,
                           core_width,core_width,.018)
        if rings <= 3:
            core = add(center,mul(axes[2],radius*.095))
            if fid == 'gardenia':
                elliptical_tip(c,core,axes,.034,.035,.022)
            else:
                stamens(c,pollen,core,axes,34 if fid=='peony' else 27,
                        radius*(.28 if fid=='peony' else .21),radius*.29,.017)
                for i in range(3 if fid=='peony' else 1):
                    angle = i*TAU/3
                    base = local_point(core,axes,.033*math.cos(angle),0,.033*math.sin(angle))
                    tip = add(base,mul(axes[2],radius*.29))
                    tube(c,[base,tip],.012,6,.74)
                    elliptical_tip(c,tip,axes,.021,.016,.012)
    elif fid == 'true-lily':
        axis = ((.13,.81,.58),(.10,.45,.88),(.14,-.25,.95),(.18,.66,.73),(.06,.78,.62))[rank]
        axes = basis(axis)
        for ring in range(form['rings']):
            for i in range(6):
                angle = i*TAU/6+ring*.45
                root = local_point(center,axes,.026*math.cos(angle),ring*.062,.026*math.sin(angle))
                length = form['reach']*(.92 if i%2==0 else 1)*(1-ring*.22)
                corolla(p,root,axes,angle,length,length*(.19 if i%2==0 else .25)*form['width'],
                        form['lift']*(1-ring*.42),-form['curl'],i+ring*.42,.028*math.sin(i*1.7),
                        .55,.008,.095 if rank==1 else .046,resolution=(24,10),
                        sector=(.026,math.pi/6-.013),layer_gap=.062 if form['rings']>1 else None)
        elliptical_tip(p,add(center,mul(axes[2],.009)),axes,.024,.024,.015)
        elliptical_tip(s,add(center,mul(axes[2],-.024)),axes,.053,.053,.027)
        if rank != 4:
            stamens(c,pollen,center,axes,6,.15,.38+form['lift']*.23,.045)
        tip = add(center,mul(axes[2],.47+form['lift']*.13))
        tube(c,[center,tip],.009,6,.76)
        for i in range(3):
            angle = i*TAU/3
            lobe = local_point(tip,axes,.014*math.cos(angle),0,.014*math.sin(angle))
            orb(c,lobe,.015,.73,5,7)
    elif fid == 'jasmine':
        for i in range(form['blooms']+2):
            angle = i*2.399963+rank*.15
            direction = (math.cos(angle),0,math.sin(angle))
            joint = stem(height*(.81+.045*(i%3)))
            bend = add(joint,add(mul(direction,.14),(0,.068,0)))
            tip = add(bend,add(mul(direction,.087+.04*(i%3)),(0,.086+.04*(i%2),0)))
            tube(s,[joint,bend,tip],.0075,6,.48)
            if i < form['blooms']:
                axis = add(mul(direction,.43),(0,.89,.42))
                small_flower(p,c,s,tip,axis,.117*form['width'],form['petals'],form['rings'],.21)
            else:
                orb(p,add(tip,(0,.031,0)),.028,1.58,6,10)
        small_flower(p,c,s,center,(.04,.8,.59),.13,form['petals'],form['rings'],.18)
    elif fid == 'gypsophila':
        for i in range(form['sprays']):
            angle = i*2.399963
            direction = (math.cos(angle),0,math.sin(angle))
            sideways = (-direction[2],0,direction[0])
            joint = stem(height*(.35+.083*i))
            fork = add(joint,add(mul(direction,.18),(0,.21,0)))
            tube(s,[joint,fork],.0065,6,.62)
            for side in (-1,1):
                branch = add(fork,add(add(mul(direction,.16),mul(sideways,side*.13)),(0,.16,0)))
                tube(s,[fork,branch],.0043,5,.58)
                for j in range(form['florets']):
                    tip = add(branch,add(add(mul(direction,.063+.025*(j%2)),
                                             mul(sideways,side*.087*(j+1))), (0,.065+.082*(j%3),0)))
                    tube(s,[branch,tip],.0027,5,.52)
                    size = (.032+.004*((j+i)%3))*form['width']
                    if j==0 and i%2==0:
                        orb(p,tip,size*.54,1.12,4,7)
                    else:
                        small_flower(p,c,s,tip,add(mul(direction,.43),(0,.87,side*.30)),
                                     size,5,form['rings'],0)
        small_flower(p,c,s,center,(0,.85,.40),.037,5,form['rings'],0)


def build(flower, form, rank):
    fid = flower['id']
    name = fid+'-'+form['grade']+'-v2'
    collection=bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    palette=flower['colors']
    materials={role: material(fid+'-'+role,palette[key]) for role,key in [('petal','petal'),('leaf','leaf'),('stem','stem'),('center','center'),('pollen','centerAlt')]}
    if fid in REALISTIC_FLOWERS:
        waxy = fid in ('gardenia','camellia')
        for role, roughness in [('petal',.40 if waxy else .51),('leaf',.29 if waxy else .43),('stem',.53)]:
            shader = materials[role].node_tree.nodes.get('Principled BSDF')
            shader.inputs['Roughness'].default_value = roughness
            shader.inputs['Specular IOR Level'].default_value = .34
            if role=='petal':
                shader.inputs['Sheen Weight'].default_value = .09 if waxy else .15
                shader.inputs['Subsurface Weight'].default_value = .08
                shader.inputs['Subsurface Scale'].default_value = .015
    parts={role:BotanicalMesh(name+'-'+role,role,mat,collection,thin=fid in REALISTIC_FLOWERS)
           for role,mat in materials.items()}
    p,l,s,c,pollen=[parts[k] for k in ('petal','leaf','stem','center','pollen')]
    h={'daisy':1.28,'rose':1.25,'tulip':1.45,'sunflower':1.62,'hydrangea':1.36,'hyacinth':1.7,'lily':1.6,'cosmos':1.45,'carnation':1.35,'peony':1.32,'iris':1.55,'orchid':1.5,'jasmine':1.39,'true-lily':1.62,'gardenia':1.37,'camellia':1.44,'gypsophila':1.59}[fid]*form['height']
    def stem(y): return (.065*form['bend']*(y/h)**2, y, .025*math.sin(y*2))
    stemtop=h
    if fid=='hyacinth': stemtop=.65+(math.ceil(form['florets']/(5 if rank<3 else 6))-1)*.18+.06
    if fid=='lily': stemtop=.65+(form['bells']-1)*.1+.1
    if fid=='orchid': stemtop=h+.2
    stem_points = [stem(stemtop*k/18) for k in range(19)]
    center=stem(h)
    if fid in REALISTIC_FLOWERS:
        tube(s,stem_points,.009 if fid=='gypsophila' else .015,tip_scale=.45)
        realistic_leaves(l,s,stem,fid,rank,h)
        realistic_bloom(fid,form,rank,stem,h,p,s,c,pollen)
    else:
        tube(s,stem_points,.027 if fid=='sunflower' else .018)
        leaves(l,stem,fid,rank)
    if fid in ('daisy','sunflower','cosmos'):
        radius={'daisy':.18,'sunflower':.3,'cosmos':.12}[fid]
        length={'daisy':.49,'sunflower':.54,'cosmos':.5}[fid]
        for ring in range(form['rings']):
            count=form['petals']-ring*2
            for k in range(count):
                petal(p,add(center,(0,ring*.045,0)),TAU*(k+.5*(ring%2))/count,length*(1-ring*.12),math.pi/count*.87,radius*.92,-.06,.11,form['ruffle']*.22, fid=='sunflower')
        orb(c,add(center,(0,.025,0)),radius,.42)
        for k in range(64 if fid=='sunflower' else 26):
            a=k*2.399963; r=radius*.9*math.sqrt((k+.5)/(64 if fid=='sunflower' else 26))
            orb(pollen,add(center,(r*math.cos(a),.06+.07*math.sqrt(max(0,1-(r/radius)**2)),r*math.sin(a))),.012,.7,3,5)
    elif fid=='rose':
        # Convex petal bowls wrap around the bud. Straight radial wedges produce
        # exposed triangular undersides when seen from the mobile camera.
        layers=form['layers']
        for ring in range(layers+2):
            radius=.59*(1-ring/(layers+2)*.87)
            count=max(3,7-ring//2)
            for k in range(count):
                angle=TAU*(k+.5*(ring%2))/count+ring*.22
                def fn(t,u,angle=angle,radius=radius,ring=ring,count=count):
                    across=u*2-1
                    phi=angle+across*math.pi/count*.99*(.08+.92*math.sin(t*math.pi/2)**.6)
                    r=.018+radius*math.sin(t*math.pi/2)*(1-.07*across*across*t**8)
                    y=ring*.016+.44*(1-math.cos(t*math.pi/2))-.07*t**8
                    y+=.013*math.sin(across*8+ring)*abs(across)**4*t**5
                    return add(center,(r*math.cos(phi),y,r*math.sin(phi)))
                p.surface(fn,16,8)
        orb(p,add(center,(0,.3,0)),.035,1.1,6,10)
        orb(s,add(center,(0,-.02,0)),.11,.65,6,10)
    elif fid == 'carnation':
        layers=form['layers']
        outer=.58
        for ring in range(layers):
            maxr=outer*(1-ring/(layers+1)*.8)
            minr=max(.025,maxr*.31)
            count=8-ring//3
            for k in range(count):
                petal(p,add(center,(0,ring*.032,0)),TAU*(k+.5*(ring%2))/count+ring*.14,(maxr-minr)*(1+math.sin(k*2.4+ring)*.025),math.pi/count*.97,minr,.17,.06+ring*.008,(.028+rank*.007),rounded=True)
        orb(c,add(center,(0,layers*.03+.03,0)),.075,.7)
    elif fid=='tulip':
        for ring in range(form['rings']):
            # Offset cup shells avoid the old six planes crossing at the base.
            base=.13-ring*.018
            for k in range(3):
                angle=k*TAU/3+ring*math.pi/3
                def fn(t,u,base=base,angle=angle,ring=ring):
                    theta=angle+(u*2-1)*.99*max(.04,math.sin(math.pi*t)**.32)
                    r=base+(.26+form['tilt']*.14)*math.sin(t*math.pi*.74)
                    y=t*(.73-ring*.05)+ring*.035
                    y+=form['ruffle']*.22*math.sin(u*24)*t**9
                    return add(center,(r*math.cos(theta),y,r*math.sin(theta)))
                p.surface(fn,16,10)
        orb(c,add(center,(0,.12,0)),.075,.5)
    elif fid=='hydrangea':
        count=form['florets']
        radius=.43
        # Surface spacing controls each floret's diameter as the cluster densifies.
        size=.16 if form['double'] else .18
        for k in range(count):
            y=1-2*(k+.5)/count; rr=math.sqrt(1-y*y); a=k*2.399963
            n=(rr*math.cos(a),y*form['roundness'],rr*math.sin(a))
            pos=add(center,mul(n,radius)); ax=basis(n)
            for ring in range(2 if form['double'] else 1):
                for j in range(4):
                    petal(p,add(pos,mul(ax[2],ring*.025)),j*TAU/4+ring*math.pi/4,size*(1-ring*.3),.66,.014,.005,.018,.002,axes=ax,resolution=(8,4))
            orb(c,pos,.021,.8,4,6)
            if k%4==0: tube(s,[center,pos],.005,5)
    elif fid=='hyacinth':
        count=form['florets']; per=5 if rank<3 else 6
        tiers=math.ceil(count/per)
        for k in range(count):
            tier=k//per; a=(k%per)*TAU/per+tier*.53
            y=.65+tier*.18
            n=(math.cos(a),.12,math.sin(a)); pos=add(stem(y),mul(n,.12))
            tube(s,[stem(y),pos],.007,5)
            ax=basis(n)
            for j in range(6): petal(p,pos,j*TAU/6,.125,.42,.025,.04,.012,.004,axes=ax,resolution=(8,4))
            orb(c,pos,.023,1,4,6)
    elif fid=='lily':
        for k in range(form['bells']):
            y=.65+k*.1
            sign=-1 if k%2 else 1
            x=sign*(.17+.06*form['spread'])
            pos=add(stem(y),(x,.055,0))
            tube(s,[stem(y),add(pos,(0,.045,0)),pos],.007,5)
            size=.16*form['bellSize']
            def fn(t,u,pos=pos,size=size):
                a=u*TAU
                r=size*(.22+.38*math.sin(t*math.pi*.5)+.12*t**7*form['cup'])
                y=-size*t+.02*math.cos(a*5)*t**10
                return add(pos,(r*math.cos(a),y,r*math.sin(a)))
            p.surface(fn,14,20)
            orb(c,add(pos,(0,-size*.7,0)),.018,1,4,6)
    elif fid=='iris':
        for k in range(3):
            a=k*TAU/3
            petal(p,center,a,.38,.83,.055,.4+form['standard']*.15,.09,form['ruffle']*.16)
            petal(p,add(center,(0,-.02,0)),a+math.pi/3,.58,.73,.08,-.2,-.12,form['ruffle']*.2)
            petal(c,add(center,(0,-.005,0)),a+math.pi/3,.25,.1,.1,-.1,-.03)
        orb(c,add(center,(0,.12,0)),.045,1.4)
    elif fid=='orchid':
        count=form['blooms']
        # A flowering arch spaces complete blossoms instead of stacking petals.
        for k in range(count):
            a=(k-(count-1)/2)*.45
            pos=(a,h+.25-.16*a*a,.18+.05*abs(a))
            tube(s,[stem(min(h,pos[1]-.15)),add(pos,(0,0,-.03)),pos],.01,5)
            ax=((1,0,0),(0,1,0),(0,0,1))
            for j in range(5):
                angle=math.pi/2+j*TAU/5
                petal(p,pos,angle,.25 if j in (1,4) else .22,.58 if j in (1,4) else .38,.025,.015,.035,.004,axes=ax)
            petal(p,add(pos,(0,-.02,.045)),-math.pi/2,.11*form['lip'],.52,.01,.055,.02,.008,axes=ax)
            orb(c,add(pos,(0,0,.075)),.035,.65,5,8)
    if fid in ('daisy','sunflower','cosmos'):
        tilt=.65 if fid=='sunflower' else .32
        # Tilt the complete capitulum toward the viewer, including its seed disc.
        for part in (p,c,pollen):
            for index,(x,zneg,y) in enumerate(part.vertices):
                dy,dz=y-center[1],-zneg-center[2]
                yy=center[1]+dy*math.cos(tilt)-dz*math.sin(tilt)
                zz=center[2]+dy*math.sin(tilt)+dz*math.cos(tilt)
                part.vertices[index]=(x,-zz,yy)
    objects=[part.finish() for part in parts.values() if part.vertices]
    # The GLB's root origin is the soil surface. The web app retains its own pot.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    filepath=OUT/(name+'.glb')
    if fid in rebuild or fid+'-'+form['grade'] not in manifest['models'] or not filepath.exists():
        bpy.ops.export_scene.gltf(filepath=str(filepath),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='EXPORT')
    binary=filepath.read_bytes()
    document=json.loads(binary[20:20+struct.unpack_from('<I',binary,12)[0]])
    triangles=sum(document['accessors'][primitive['indices']]['count']//3 for mesh in document['meshes'] for primitive in mesh['primitives'])
    manifest['models'][fid+'-'+form['grade']]={'url':'./models/flowers/'+name+'.glb','modelId':name,'triangles':triangles,'bytes':filepath.stat().st_size,'label':form['label']}
    print('MODEL_READY',name,filepath.stat().st_size,flush=True)
    # Gallery layout is saved in the editable master project, after local export.
    row=[f['id'] for f in RECIPES].index(fid)
    for obj in objects:
        obj.location=(rank*2.5,0,(row_count-1-row)*2.8)
    return objects

for flower in RECIPES:
    for rank, form in enumerate(flower['forms']): build(flower,form,rank)

manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def label(text,x,z,size=.16):
    curve=bpy.data.curves.new('Label '+text,'FONT')
    curve.body=text; curve.size=size; curve.align_x='CENTER'
    obj=bpy.data.objects.new('Label '+text,curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location=(x,-.18,z); obj.rotation_euler=(math.pi/2,0,0)
    curve.materials.append(material('Ink','#534f49',1))

gallery_height = (row_count-1)*2.8
midpoint = gallery_height/2
for rank,grade in enumerate(('COMMON','FINE','RARE','EPIC','LEGENDARY')): label(grade,rank*2.5,gallery_height+3.25,.2)
for row,flower in enumerate(RECIPES): label(flower['en'],5,(row_count-1-row)*2.8-.3,.22)

scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=16
scene.cycles.use_denoising='--no-denoise' not in sys.argv
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.72,.76,.79,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast' if 'Medium High Contrast' in [i.name for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['look'].enum_items] else 'None'
bpy.ops.object.camera_add(location=(5,-45,midpoint+8.6))
camera=bpy.context.object
direction=Vector((5,0,midpoint+1.2))-camera.location
camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=gallery_height+6
scene.camera=camera
for position,energy,size in [((-5,-10,27),2200,10),((13,-4,15),1800,12),((4,5,29),2600,10)]:
    bpy.ops.object.light_add(type='AREA',location=position)
    lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((5,0,midpoint+1.6))-lamp.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1500;scene.render.resolution_y=3600;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ART/'collection-preview.png')
scene.render.film_transparent=False
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'garden-85-models.blend'), compress=True)
if '--no-render' not in sys.argv: bpy.ops.render.render(write_still=True)
print('COLLECTION_COMPLETE',len(manifest['models']),flush=True)
