"""Rebuild the five jasmine grades and render their exact exported geometry."""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
source = ROOT / 'scripts/build-blender-flowers.py'
api = {'__file__': str(source)}
exec(compile(source.read_text().split('\nfor flower in RECIPES:', 1)[0], str(source), 'exec'), api)
original = json.loads(api['manifest_path'].read_text())
api['manifest'].update(original)
jasmine = next(f for f in api['RECIPES'] if f['id'] == 'jasmine')
models = {}
for rank, form in enumerate(jasmine['forms']):
    grade = form['grade']
    api['rebuild'].add('jasmine')
    objects = api['build'](jasmine, form, rank)
    for obj in objects:
        obj.location = (0, 0, 0)
    models[grade] = objects
api['manifest_path'].write_text(json.dumps(api['manifest'], ensure_ascii=False, indent=2)+'\n')

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = False
scene.render.resolution_x = 600
scene.render.resolution_y = 560
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value = (.29, .33, .29, 1)
background.inputs['Strength'].default_value = .7
scene.view_settings.view_transform = 'AgX'
for position, energy, size in [((-3,-4,5),380,4), ((3,-1,3),160,3), ((0,3,4),300,3)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((0,0,1.3))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 1.16
scene.camera = camera
for grade, objects in models.items():
    for other, parts in models.items():
        for obj in parts:
            obj.hide_render = other != grade
    for view, position in [('above', (2.4,-4.7,4.7)), ('side', (2.4,-5,2.1))]:
        camera.location = position
        camera.rotation_euler = (Vector((.02,0,1.22))-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath = str(OUT / (grade+'-'+view+'.png'))
        bpy.ops.render.render(write_still=True)
for index, objects in enumerate(models.values()):
    for obj in objects:
        obj.hide_render = False
        obj.location.x = index*1.4
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'jasmine-five-grades.blend'))
print('JASMINE_READY', flush=True)
