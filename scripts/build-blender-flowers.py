"""Build the entire botanical collection with Blender, then export production GLBs.

blender --background --factory-startup --python scripts/build-blender-flowers.py
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
manifest = {'version': 2, 'generator': 'Blender ' + bpy.app.version_string, 'models': {}}
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
    def __init__(self, name, role, mat, collection):
        self.name, self.role, self.mat, self.collection = name, role, mat, collection
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

def tube(mesh, points, radius=.018, sides=8):
    points = [Vector(p) for p in points]
    for k in range(len(points)-1):
        a, b, n = basis(points[k+1]-points[k])
        p, q = tuple(points[k]), tuple(points[k+1])
        mesh.surface(lambda t,u: add(add(mul(p,1-t),mul(q,t)),add(mul(a,radius*math.cos(u*TAU)),mul(b,radius*math.sin(u*TAU)))), 1, sides)

def orb(mesh, center, radius, flatten=1, rows=8, sides=16):
    mesh.surface(lambda t,u: (center[0]+radius*math.sin(.005+t*(math.pi-.01))*math.cos(u*TAU), center[1]+radius*flatten*math.cos(.005+t*(math.pi-.01)), center[2]+radius*math.sin(.005+t*(math.pi-.01))*math.sin(u*TAU)), rows, sides)

def petal(mesh, center, angle, length, span, base, rise=.1, cup=.1, ruffle=0, pointed=False, axes=None, resolution=(12,6), rounded=False):
    """An annular petal wedge with separated, noncrossing left/right edges."""
    def point(t,u):
        across = u*2-1
        outline = max(.012, math.sin(math.pi*t*(.7 if rounded else 1))**(.8 if pointed else .48))
        theta = angle + across*span*outline
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
    width = {'cosmos':.045,'carnation':.045,'iris':.07,'tulip':.15,'orchid':.24,'peony':.2,'hydrangea':.22}.get(flower_id,.14)
    length = .85 if flower_id in ('iris','lily','tulip') else .58
    for k in range(count):
        height = .035+k*.025 if long else .22+k*.23
        center = stem(height)
        angle = k*2.4 + rank*.11
        def fn(t,u,center=center,angle=angle):
            across = (u*2-1)*width*max(.008,math.sin(math.pi*t)**.7)
            reach = length*t*(.6 if flower_id=='iris' else .9)
            lift = length*t*(1.15 if flower_id=='iris' else .55)-.16*t*t
            midrib = .035*(1-(u*2-1)**2)*math.sin(math.pi*t)
            return (center[0]+math.cos(angle)*reach-math.sin(angle)*across,center[1]+lift+midrib,center[2]+math.sin(angle)*reach+math.cos(angle)*across)
        mesh.surface(fn,14,6)

def build(flower, form, rank):
    fid = flower['id']
    name = fid+'-'+form['grade']+'-v2'
    collection=bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    palette=flower['colors']
    materials={role: material(fid+'-'+role,palette[key]) for role,key in [('petal','petal'),('leaf','leaf'),('stem','stem'),('center','center'),('pollen','centerAlt')]}
    parts={role:BotanicalMesh(name+'-'+role,role,mat,collection) for role,mat in materials.items()}
    p,l,s,c,pollen=[parts[k] for k in ('petal','leaf','stem','center','pollen')]
    h={'daisy':1.28,'rose':1.25,'tulip':1.45,'sunflower':1.62,'hydrangea':1.36,'hyacinth':1.7,'lily':1.6,'cosmos':1.45,'carnation':1.35,'peony':1.32,'iris':1.55,'orchid':1.5}[fid]*form['height']
    def stem(y): return (.065*form['bend']*(y/h)**2, y, .025*math.sin(y*2))
    stemtop=h
    if fid=='hyacinth': stemtop=.65+(math.ceil(form['florets']/(5 if rank<3 else 6))-1)*.18+.06
    if fid=='lily': stemtop=.65+(form['bells']-1)*.1+.1
    if fid=='orchid': stemtop=h+.2
    tube(s,[stem(stemtop*k/18) for k in range(19)],.027 if fid=='sunflower' else .018)
    leaves(l,stem,fid,rank)
    center=stem(h)
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
    elif fid in ('peony','carnation'):
        layers=form['layers']
        outer={'peony':.76,'carnation':.58}[fid]
        for ring in range(layers):
            maxr=outer*(1-ring/(layers+1)*.8)
            minr=max(.025,maxr*.31)
            count=(9 if fid=='peony' else 8)-int(ring/3)
            for k in range(count):
                petal(p,add(center,(0,ring*.032,0)),TAU*(k+.5*(ring%2))/count+ring*.14,(maxr-minr)*(1+math.sin(k*2.4+ring)*.025),math.pi/count*.97,minr,.17,.06+ring*.008,(.028+rank*.007) if fid=='carnation' else .012+rank*.003,rounded=True)
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
    bpy.ops.export_scene.gltf(filepath=str(filepath),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='EXPORT')
    binary=filepath.read_bytes()
    document=json.loads(binary[20:20+struct.unpack_from('<I',binary,12)[0]])
    triangles=sum(document['accessors'][primitive['indices']]['count']//3 for mesh in document['meshes'] for primitive in mesh['primitives'])
    manifest['models'][fid+'-'+form['grade']]={'url':'./models/flowers/'+name+'.glb','modelId':name,'triangles':triangles,'bytes':filepath.stat().st_size,'label':form['label']}
    print('MODEL_READY',name,filepath.stat().st_size,flush=True)
    # Gallery layout is saved in the editable master project, after local export.
    row=[f['id'] for f in RECIPES].index(fid)
    for obj in objects:
        obj.location=(rank*2.5,0,(11-row)*2.8)
    return objects

for flower in RECIPES:
    for rank, form in enumerate(flower['forms']): build(flower,form,rank)

(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def label(text,x,z,size=.16):
    curve=bpy.data.curves.new('Label '+text,'FONT')
    curve.body=text; curve.size=size; curve.align_x='CENTER'
    obj=bpy.data.objects.new('Label '+text,curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location=(x,-.18,z); obj.rotation_euler=(math.pi/2,0,0)
    curve.materials.append(material('Ink','#534f49',1))

for rank,grade in enumerate(('COMMON','FINE','RARE','EPIC','LEGENDARY')): label(grade,rank*2.5,34.05,.2)
for row,flower in enumerate(RECIPES): label(flower['en'],5,(11-row)*2.8-.3,.22)

scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.72,.76,.79,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast' if 'Medium High Contrast' in [i.name for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['look'].enum_items] else 'None'
bpy.ops.object.camera_add(location=(5,-45,24))
camera=bpy.context.object
direction=Vector((5,0,16.7))-camera.location
camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=36
scene.camera=camera
for position,energy,size in [((-5,-10,27),2200,10),((13,-4,15),1800,12),((4,5,29),2600,10)]:
    bpy.ops.object.light_add(type='AREA',location=position)
    lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((5,0,17))-lamp.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1500;scene.render.resolution_y=3600;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ART/'collection-preview.png')
scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'garden-60-models.blend'))
if '--no-render' not in sys.argv: bpy.ops.render.render(write_still=True)
print('COLLECTION_COMPLETE',len(manifest['models']),flush=True)
