const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const THREE = require('../www/vendor/three.min.js');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'www/models/flowers/manifest.json')));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({ THREE, window: {}, ArrayBuffer, TextDecoder, console, URL, setTimeout, clearTimeout });
vm.runInContext(read('www/vendor/GLTFLoader.js'), context);
vm.runInContext(read('www/js/data.js'), context);
vm.runInContext(read('www/js/version.js'), context);
let requests = 0;
context.fetch = async url => {
  requests++;
  const asset = new URL(url, 'https://garden.test/');
  assert.equal(asset.searchParams.get('v'), String(context.window.XIAOMAN_VERSION.build));
  const buffer = fs.readFileSync(path.join(root, 'www', asset.pathname));
  return { ok: true, arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
};
vm.runInContext(read('www/js/flower-assets.js'), context);
const assets = context.window.FlowerAssets;

test('all catalogued Blender exports parse, retain five distinct forms and fit the mobile scene', async () => {
  const flowerIds = new Set(Array.from(context.window.GameData.flowers, flower => flower.id));
  assert.equal(Object.keys(manifest.models).length, flowerIds.size * 5);
  const forms = new Map();
  for (const [key, info] of Object.entries(manifest.models)) {
    const split = key.lastIndexOf('-');
    const species = key.slice(0, split), grade = key.slice(split + 1);
    const materials = Object.fromEntries(['petal', 'leaf', 'stem', 'center', 'pollen'].map(role => [role, new THREE.MeshStandardMaterial({ name: role })]));
    const model = await assets.load(THREE, species, grade, materials);
    assert.equal(model.userData.modelId, info.modelId);
    assert(info.bytes < 2000000, key + ' exceeds the 2 MB per-model budget');
    const roles = new Set();
    const hash = crypto.createHash('sha256');
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      const role = mesh.userData.botanical;
      roles.add(role);
      assert.equal(mesh.material, materials[role], 'item pigments must be reused');
      const pos = mesh.geometry.attributes.position;
      const normal = mesh.geometry.attributes.normal;
      const uv = mesh.geometry.attributes.uv;
      assert(pos.count > 0 && normal && uv, key + ' needs positions, normals and UVs');
      for (const value of pos.array) assert(Number.isFinite(value), key);
      for (const value of normal.array) assert(Number.isFinite(value), key);
      for (const value of uv.array) assert(Number.isFinite(value), key);
      if (role === 'petal' || role === 'leaf') hash.update(Buffer.from(pos.array.buffer, pos.array.byteOffset, pos.array.byteLength));
      const indices = mesh.geometry.index.array;
      for (const index of indices) assert(index >= 0 && index < pos.count, key);
    });
    assert(roles.has('petal') && roles.has('leaf') && roles.has('stem'), key);
    const bounds = new THREE.Box3().setFromObject(model);
    assert(bounds.min.y > -.03 && bounds.max.y < 2.65, key + ' must start at soil and fit the camera');
    if (!forms.has(species)) forms.set(species, new Set());
    forms.get(species).add(hash.digest('hex'));
    assets.dispose(model);
    Object.values(materials).forEach(material => material.dispose());
  }
  assert.deepEqual(new Set(forms.keys()), flowerIds);
  for (const [species, values] of forms) assert.equal(values.size, 5, species);
});

test('cached bytes create independently disposable meshes and materials', async () => {
  const before = requests;
  const a = await assets.load(THREE, 'orchid', 'legendary', {});
  const b = await assets.load(THREE, 'orchid', 'legendary', {});
  assert(requests - before <= 1);
  const meshes = model => { let mesh; model.traverse(node => { if (node.isMesh) mesh = node; }); return mesh; };
  assert.notEqual(meshes(a).geometry, meshes(b).geometry);
  assert.notEqual(meshes(a).material, meshes(b).material);
  assets.dispose(a); assets.dispose(b);
  await assert.rejects(assets.load(THREE, '../unknown', 'rare', {}));
});

test('failed downloads can retry instead of poisoning the asset cache', async () => {
  const previous = context.fetch;
  context.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(assets.load(THREE, 'daisy', 'common', {}));
  context.fetch = previous;
  const model = await assets.load(THREE, 'daisy', 'common', {});
  assert.equal(model.userData.modelId, 'daisy-common-v2');
  assets.dispose(model);
});
