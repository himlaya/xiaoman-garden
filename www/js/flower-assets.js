/* Blender GLB assets. Cache source bytes; each viewer owns its meshes.
 * A failed request leaves the existing botanical preview in place.
 */
(function () {
  'use strict';
  const cache = new Map();
  const grades = ['common', 'fine', 'rare', 'epic', 'legendary'];
  const species = ['daisy', 'tulip', 'hyacinth', 'rose', 'sunflower', 'hydrangea', 'lily', 'cosmos', 'carnation', 'peony', 'iris', 'orchid'];

  function source(url) {
    if (!cache.has(url)) {
      const pending = fetch(url).then(function (response) {
        if (!response.ok) throw new Error('Flower asset unavailable: ' + response.status);
        return response.arrayBuffer();
      }).catch(function (error) { cache.delete(url); throw error; });
      cache.set(url, pending);
      // Keep browsing the entire album from retaining all sixty binary buffers.
      if (cache.size > 12) cache.delete(cache.keys().next().value);
    }
    return cache.get(url);
  }

  function load(THREE, flowerId, grade, materials) {
    if (!species.includes(flowerId) || !grades.includes(grade)) return Promise.reject(new Error('Unknown flower model'));
    const modelId = flowerId + '-' + grade + '-v2';
    return source('./models/flowers/' + modelId + '.glb').then(function (bytes) {
      return new Promise(function (resolve, reject) {
        new THREE.GLTFLoader().parse(bytes, '', function (gltf) {
          const root = gltf.scene;
          root.name = 'blender-' + modelId;
          root.userData.modelId = modelId;
          const imported = new Set();
          root.traverse(function (mesh) {
            if (!mesh.isMesh) return;
            const role = mesh.userData.botanical;
            const material = materials[role];
            if (!material) return;
            imported.add(mesh.material);
            mesh.material = material;
            mesh.geometry.userData.botanical = role;
            // Blender's glTF exporter flips V for image textures. The existing
            // item maps are DataTextures with the app's base-to-tip UV convention.
            const uv = mesh.geometry.attributes.uv;
            if (uv) { for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); uv.needsUpdate = true; }
          });
          imported.forEach(function (material) { material.dispose(); });
          resolve(root);
        }, reject);
      });
    });
  }

  function dispose(root) {
    root.traverse(function (mesh) { if (mesh.geometry) mesh.geometry.dispose(); });
  }

  window.FlowerAssets = Object.freeze({ load: load, dispose: dispose });
})();
