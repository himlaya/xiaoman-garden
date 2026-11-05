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
  const rolls = [options.roll ?? 0, (kind + 0.1) / 7, 0];
  const math = Object.assign(Object.create(Math), { random: () => rolls.shift() ?? 0.99 });
  const renderer = class {
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
  for (const file of ['data.js', 'items.js']) {
    vm.runInContext(fs.readFileSync(path.join(web, 'js', file), 'utf8'), context);
  }
  const source = fs.readFileSync(path.join(web, 'js/flower3d.js'), 'utf8')
    .replace('window.Flower3D = {', 'window.Flower3D = { createScene: createScene,');
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
  window.Flower3D.createScene(state);
  return {
    state, document, get visitor() { return state.scene.getObjectByName('flower-visitor'); },
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
