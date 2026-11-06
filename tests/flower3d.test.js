const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const web = path.join(__dirname, '../www');
const three = require(path.join(web, 'vendor/three.min.js'));

function preview(kind, options = {}) {
  let frame;
  let now = 0;
  let renderers = 0;
  const rolls = [options.roll ?? 0, (kind + 0.1) / 7, 0];
  const math = Object.assign(Object.create(Math), { random: () => rolls.shift() ?? 0.99 });
  const renderer = class {
    constructor() { renderers++; }
    setPixelRatio() {}
    setClearColor() {}
    setSize() {}
    render() {}
  };
  const Game = { getState: () => ({ settings: { reduceMotion: !!options.reduced } }) };
  const window = {
    THREE: { ...three, WebGLRenderer: renderer }, Game,
    addEventListener() {}, removeEventListener() {}, setTimeout() {}, clearTimeout() {}
  };
  const document = { visibilityState: 'visible', addEventListener() {} };
  const context = vm.createContext({
    window, document, Game, Math: math, performance: { now: () => now },
    requestAnimationFrame: (callback) => { frame = callback; return 1; }
  });
  for (const file of ['data.js', 'items.js', 'flower-forms.js']) {
    vm.runInContext(fs.readFileSync(path.join(web, 'js', file), 'utf8'), context);
  }
  const source = fs.readFileSync(path.join(web, 'js/flower3d.js'), 'utf8')
    .replace('window.Flower3D = {', 'window.Flower3D = { createScene: createScene, buildShelfModels: buildShelfModels,');
  vm.runInContext(source, context);
  const canvas = { addEventListener() {}, removeEventListener() {} };
  const shell = {
    clientWidth: 430, clientHeight: 900,
    getBoundingClientRect: () => ({ width: 430, height: 900 })
  };
  const state = {
    flower: window.GameData.flowerMap[options.flower || 'rose'],
    stage: options.stage || 'bloom', cleanup: [],
    overlay: { querySelector: (selector) => selector.includes('canvas') ? canvas : selector.includes('shell') ? shell : null }
  };
  if (options.patternSeed !== undefined) {
    state.item = window.GardenItems.createBouquet(state.flower, {}, { ratio: 1 }, {
      id: 'porcelain-test', patternSeed: options.patternSeed, grade: options.grade || 'rare', templateId: options.templateId || 'dawn', wear: options.wear ?? 0.03
    });
  }
  if (options.rack) {
    state.shelfItems = options.empty ? [] : window.GameData.flowers.map((flower, index) =>
      window.GardenItems.createBouquet(flower, {}, { ratio: 1 }, { id: 'shelf-' + index, patternSeed: index + 10, grade: 'rare' })
    );
    state.shelfPage = options.page || 0;
    state.scene = new three.Scene();
    state.scene.add(window.Flower3D.buildShelfModels(state, window.THREE));
  } else window.Flower3D.createScene(state);
  return {
    state, document, get renderers() { return renderers; },
    get visitor() { return state.scene.getObjectByName('flower-visitor'); },
    advance(seconds) {
      for (let i = 0; i < Math.round(seconds * 50); i++) {
        now += 20;
        frame(now);
      }
    },
    dispose() {
      state.disposed = true;
      state.cleanup.forEach((cleanup) => cleanup());
    }
  };
}

test('all seven visitors arrive, land on each flower and depart once', () => {
  const names = ['honeybee', 'bumblebee', 'hoverfly', 'butterfly', 'cabbage-white', 'ladybird', 'dragonfly'];
  for (const flower of ['daisy', 'tulip', 'hyacinth', 'rose', 'sunflower', 'hydrangea', 'lily']) {
    for (let kind = 0; kind < names.length; kind++) {
      const scene = preview(kind, { flower });
      assert.equal(scene.visitor.userData.kind, names[kind]);
      assert.equal(scene.visitor.visible, false);
      scene.advance(6);
      assert.equal(scene.visitor.visible, true);
      scene.advance(3);
      assert(scene.visitor.position.distanceTo(new three.Vector3(0, 0.015, 0)) < 0.001);
      scene.document.visibilityState = 'hidden';
      scene.advance(20);
      assert.equal(scene.visitor.visible, true);
      scene.document.visibilityState = 'visible';
      scene.advance(10);
      assert.equal(scene.visitor.visible, false);
      scene.advance(30);
      assert.equal(scene.visitor.visible, false);
      scene.dispose();
    }
  }
});

test('3D shelf places six real bouquet models per page without creating extra WebGL renderers', () => {
  for (const [options, count] of [[{ rack: true }, 6], [{ rack: true, page: 1 }, 6], [{ rack: true, empty: true }, 0]]) {
    const scene = preview(0, options);
    const rack = scene.state.scene.getObjectByName('bouquet-display-rack');
    const flowers = rack.children.filter((object) => object.userData.shelfItem);
    assert.equal(flowers.length, count);
    assert.equal(scene.renderers, 0);
    assert.equal(scene.visitor, undefined);
    for (const flower of flowers) {
      assert.equal(flower.scale.x, 0.55);
      assert.equal(flower.userData.quality, flower.userData.shelfItem.grade);
      assert.equal(flower.userData.modelId, flower.userData.shelfItem.flowerId + '-rare-v1');
      let patternedPots = 0;
      flower.traverse((object) => { if (object.material?.map && object.material?.bumpMap) patternedPots++; });
      assert(patternedPots > 0);
    }
    scene.dispose();
  }
});

test('visitor probability is 8% and reduced motion or immature plants suppress it', () => {
  for (const options of [{ roll: 0.08 }, { reduced: true }, { stage: 'seed' }, { stage: 'sprout' }, { stage: 'bud' }]) {
    const scene = preview(0, options);
    assert.equal(scene.visitor, undefined);
    scene.dispose();
  }
  const scene = preview(0, { roll: 0.079 });
  assert(scene.visitor);
  scene.dispose();
});


test('porcelain families are reachable, retain smooth glaze and keep stable pigments', () => {
  for (const [patternSeed, label, channel] of [[2, '青花瓷', 2], [8, '粉彩瓷', 0], [14, '青瓷', 1]]) {
    const scene = preview(0, { flower: 'daisy', patternSeed });
    let material;
    scene.state.scene.traverse((object) => {
      if (object.material?.name === 'pot-' + label) material = object.material;
    });
    assert(material, label + ' must be available');
    assert(material.clearcoat >= 0.65);
    assert(material.bumpScale <= 0.001);
    const pixels = material.map.image.data;
    let painted = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + channel] > pixels[i + (channel + 1) % 3] + 15) painted++;
    }
    assert(painted > 100, label + ' must have its own pigment colour');
    const again = preview(0, { flower: 'daisy', patternSeed });
    let repeated;
    again.state.scene.traverse((object) => {
      if (object.material?.name === material.name) repeated = object.material.map.image.data;
    });
    assert.deepEqual(Buffer.from(pixels), Buffer.from(repeated));
    scene.dispose();
    again.dispose();
  }
});


test('new species have distinct anatomy and finite thin botanical surfaces at all stages', () => {
  const heads = { cosmos: 'cosmos-eight-petal-head', carnation: 'carnation-ruffled-head', peony: 'peony-layered-head', iris: 'iris-standards-and-falls', orchid: 'orchid-flower-2' };
  for (const [flower, head] of Object.entries(heads)) {
    for (const stage of ['seed', 'sprout', 'bud', 'bloom']) {
      const scene = preview(0, { flower, stage, patternSeed: 14, templateId: 'gilded' });
      if (stage === 'bloom') assert(scene.state.scene.getObjectByName(head), flower);
      let petals = 0;
      scene.state.scene.traverse((object) => {
        const geometry = object.geometry;
        if (!geometry || !geometry.userData.botanical) return;
        assert(geometry.attributes.uv, 'botanical surfaces need consistent UVs');
        for (const value of geometry.attributes.position.array) assert(Number.isFinite(value));
        if (geometry.userData.botanical === 'petal' && object.material.name === 'botanical-petal') {
          petals++;
          assert.equal(object.material.metalness, 0);
          assert.equal(object.material.clearcoat, 0);
          assert(object.material.bumpMap);
        }
      });
      if (stage === 'bloom') assert(petals > 0);
      scene.dispose();
    }
  }
});

test('quality preserves pigment, while template and pattern change petal colour', () => {
  function petalColors(options) {
    const scene = preview(0, { flower: 'rose', patternSeed: 143, ...options });
    const arrays = [];
    scene.state.scene.traverse((object) => {
      if (object.geometry?.userData.botanical === 'petal' && object.geometry.attributes.color) {
        if (object.material.name === 'botanical-petal' && arrays.length === 0) arrays.push(Buffer.from(object.material.map.image.data));
      }
    });
    scene.dispose();
    return arrays;
  }
  const common = petalColors({ grade: 'common', templateId: 'dawn' });
  assert.deepEqual(common, petalColors({ grade: 'legendary', templateId: 'dawn' }));
  assert.notDeepEqual(common, petalColors({ templateId: 'gilded' }));
  assert.notDeepEqual(common, petalColors({ patternSeed: 845 }));
});

test('all twelve species have five different deterministic botanical models', () => {
  const crypto = require('node:crypto');
  const species = ['daisy', 'tulip', 'hyacinth', 'rose', 'sunflower', 'hydrangea', 'lily', 'cosmos', 'carnation', 'peony', 'iris', 'orchid'];
  function fingerprint(scene) {
    const root = scene.state.scene.getObjectByName('flower-model-' + scene.state.flower.id);
    root.updateMatrixWorld(true);
    const hash = crypto.createHash('sha256');
    root.traverse((mesh) => {
      if (!mesh.geometry || !['botanical-petal', 'botanical-leaf'].includes(mesh.material?.name)) return;
      const positions = mesh.geometry.attributes.position.array;
      for (const position of positions) assert(Number.isFinite(position));
      hash.update(Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength));
      hash.update(JSON.stringify(mesh.matrixWorld.elements));
      if (mesh.isInstancedMesh) hash.update(Buffer.from(mesh.instanceMatrix.array.buffer));
    });
    return hash.digest('hex');
  }
  for (const flower of species) {
    const forms = new Set();
    let pigment;
    for (const grade of ['common', 'fine', 'rare', 'epic', 'legendary']) {
      const options = { flower, grade, patternSeed: 143, templateId: 'gilded', wear: 0.03 };
      const scene = preview(0, options);
      const root = scene.state.scene.getObjectByName('flower-model-' + flower);
      assert.equal(root.userData.quality, grade);
      assert.equal(root.userData.modelId, flower + '-' + grade + '-v1');
      forms.add(fingerprint(scene));
      let map;
      root.traverse((mesh) => { if (mesh.material?.name === 'botanical-petal') map = mesh.material.map; });
      const currentPigment = Buffer.from(map.image.data);
      if (pigment) assert.deepEqual(currentPigment, pigment, 'grade must not erase template pigment');
      pigment = currentPigment;
      if (grade === 'legendary') {
        const repeated = preview(0, options);
        assert.equal(fingerprint(scene), fingerprint(repeated), 'same specimen must keep its form');
        repeated.dispose();
      }
      scene.dispose();
    }
    assert.equal(forms.size, 5, flower + ' must have five actual geometry/pose variants');
  }
});

test('only administrators see quality comparison; real items always keep their own grade', () => {
  class Element {
    constructor(tag) {
      this.tag = tag; this.children = []; this.nodes = new Map(); this.attributes = {};
      this.events = {}; this.style = {}; this.isConnected = true;
      this.classList = { add() {}, remove() {} };
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    appendChild(child) { this.children.push(child); }
    querySelector(selector) {
      if (!this.nodes.has(selector)) this.nodes.set(selector, new Element('div'));
      return this.nodes.get(selector);
    }
    addEventListener(type, handler) { this.events[type] = handler; }
    focus() {}
    remove() { this.isConnected = false; }
  }
  for (const account of [undefined, {}, { isAdmin: false }, { isAdmin: 'true' }, { isAdmin: true }]) {
    const window = { __ACCOUNT__: account, addEventListener() {}, removeEventListener() {} };
    const document = { body: new Element('body'), createElement: tag => new Element(tag), addEventListener() {} };
    const context = vm.createContext({ window, document });
    for (const file of ['data.js', 'items.js', 'flower-forms.js', 'flower3d.js']) {
      vm.runInContext(fs.readFileSync(path.join(web, 'js', file), 'utf8'), context);
    }
    const buttons = () => document.body.children.at(-1).querySelector('.flower3d-stages').children.filter(node => node.tag === 'button');
    window.Flower3D.openFlower('rose');
    assert.equal(buttons().length, account?.isAdmin === true ? 5 : 0);
    if (account?.isAdmin === true) {
      buttons()[4].events.click();
      assert.equal(buttons()[4].attributes['aria-pressed'], 'true');
      assert.equal(document.body.children.at(-1).querySelector('.flower3d-rarity').textContent, '传说');
    }
    const item = window.GardenItems.createSeed('rose', { grade: 'legendary', templateId: 'gilded', patternSeed: 143, wear: 0.03 });
    const before = JSON.stringify(item);
    window.Flower3D.openItem(item);
    assert.equal(buttons().length, 0);
    assert.equal(document.body.children.at(-1).querySelector('.flower3d-rarity').textContent, '传说');
    assert.equal(JSON.stringify(item), before);
    window.Flower3D.close();
  }
});


test('every species uses coloured sRGB diffuse maps, leaf veins and separate surface maps', () => {
  const colours = { rose: [0, 1, 20], sunflower: [0, 2, 50], hydrangea: [2, 0, 15] };
  for (const flower of ['daisy', 'tulip', 'hyacinth', 'rose', 'sunflower', 'hydrangea', 'lily', 'cosmos', 'carnation', 'peony', 'iris', 'orchid']) {
    const scene = preview(0, { flower, patternSeed: 43, templateId: 'dawn', wear: 0.03 });
    let petal, leaf;
    scene.state.scene.traverse((object) => {
      if (object.material?.name === 'botanical-petal') petal = object.material;
      if (object.material?.name === 'botanical-leaf') leaf = object.material;
    });
    for (const material of [petal, leaf]) {
      assert(material, flower);
      assert.equal(material.vertexColors, false, 'pigment must come from the diffuse texture');
      assert.equal(material.map.encoding, three.sRGBEncoding);
      assert.equal(material.bumpMap.encoding, three.LinearEncoding);
      assert.equal(material.roughnessMap.encoding, three.LinearEncoding);
      assert.notEqual(material.map, material.bumpMap);
      const pixels = material.map.image.data;
      const unique = new Set();
      let green = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        unique.add(pixels[i] * 65536 + pixels[i + 1] * 256 + pixels[i + 2]);
        if (pixels[i + 1] > pixels[i] + 5) green++;
      }
      assert(unique.size > 100, flower + ' needs continuous pigment detail');
      if (material === leaf) assert(green > 1000, 'leaves must retain green pigment');
    }
    if (colours[flower]) {
      const [dominant, other, margin] = colours[flower];
      const pixels = petal.map.image.data;
      let coloured = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + dominant] > pixels[i + other] + margin) coloured++;
      assert(coloured > 1000, flower + ' must retain its characteristic colour');
    }
    scene.dispose();
  }
});
