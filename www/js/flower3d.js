/* 小满花园 · 3D 花房
 * 用本地 Three.js 程序化生成花朵，不依赖外部 CDN。
 * 支持拖动旋转、滚轮/双指缩放；种子→发芽→结蕾→盛开都各有形态。
 */
(function () {
  'use strict';

  const DATA = window.GameData;
  const STAGES = ['seed', 'sprout', 'bud', 'bloom'];
  const STAGE_LABELS = { seed: '种子', sprout: '发芽', bud: '结蕾', bloom: '盛开' };
  const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const TAU = Math.PI * 2;

  let viewer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function rarityInfo(flower) {
    return DATA.rarity[flower.rarity] || { className: 'common', label: flower.rarity };
  }

  function prefersReducedMotion() {
    try {
      return !!(window.Game && (Game.getState().settings.reduceMotion ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)));
    } catch (error) {
      return false;
    }
  }

  function openPlant(slot) {
    if (!window.Game) return;
    const view = Game.getPlantView(Number(slot));
    if (!view || !view.planted) return;
    openViewer({
      kind: 'plant',
      flower: view.flower,
      stage: view.stage,
      progress: view.progressPercent,
      slot: Number(slot)
    });
  }

  function openFlower(flowerId) {
    const flower = DATA.flowerMap[flowerId];
    if (!flower) return;
    openViewer({ kind: 'album', flower: flower, stage: 'bloom', progress: 100, slot: null });
  }

  function openViewer(options) {
    closeViewer();
    const flower = options.flower;
    const stage = STAGES.includes(options.stage) ? options.stage : 'bloom';
    const trigger = document.activeElement;
    const rarity = rarityInfo(flower);
    const overlay = document.createElement('div');
    overlay.className = 'flower3d-overlay';
    overlay.setAttribute('data-flower3d', '1');
    overlay.innerHTML =
      '<div class="flower3d-shell">' +
        '<canvas class="flower3d-canvas" role="img" aria-label="' + esc(flower.name) + '的三维花朵"></canvas>' +
        '<div class="flower3d-glow" aria-hidden="true"></div>' +
        '<div class="flower3d-vignette" aria-hidden="true"></div>' +
        '<header class="flower3d-top">' +
          '<div class="flower3d-heading">' +
            '<p class="flower3d-eyebrow">FLOWER IN 3D</p>' +
            '<div class="flower3d-name-row"><h2 class="flower3d-name"></h2><span class="flower3d-rarity ' + rarity.className + '"></span></div>' +
            '<p class="flower3d-language"></p>' +
          '</div>' +
          '<button class="flower3d-close" type="button" aria-label="关闭 3D 花房">' + CLOSE_ICON + '</button>' +
        '</header>' +
        '<div class="flower3d-loading" role="status" aria-live="polite"><span class="flower3d-spinner" aria-hidden="true"></span><p>正在搭起花房…</p></div>' +
        '<div class="flower3d-fallback" role="status" aria-live="polite" hidden></div>' +
        '<footer class="flower3d-footer">' +
          '<div class="flower3d-stage-head"><span class="flower3d-stage-label"></span><span class="flower3d-progress"></span></div>' +
          '<div class="flower3d-stages" aria-label="生长阶段"></div>' +
          '<p class="flower3d-hint">拖动旋转 · 双指或滚轮缩放</p>' +
        '</footer>' +
      '</div>';

    overlay.querySelector('.flower3d-name').textContent = flower.name;
    const rarityEl = overlay.querySelector('.flower3d-rarity');
    rarityEl.textContent = rarity.label;
    rarityEl.classList.add(rarity.className);
    overlay.querySelector('.flower3d-language').textContent = '「' + flower.language + '」';
    overlay.querySelector('.flower3d-stage-label').textContent = options.kind === 'album'
      ? '花房图鉴 · 盛开'
      : (stage === 'bloom' ? '盛开 · 花期内' : STAGE_LABELS[stage] + ' · ' + Math.max(0, Math.min(100, options.progress || 0)) + '%');
    overlay.querySelector('.flower3d-progress').textContent = options.kind === 'album'
      ? '已收集'
      : (stage === 'bloom' ? '花开好了' : '慢慢来');

    const stageIndex = STAGES.indexOf(stage);
    const stageEl = overlay.querySelector('.flower3d-stages');
    STAGES.forEach(function (item, index) {
      const step = document.createElement('span');
      step.className = 'flower3d-stage' + (index <= stageIndex ? ' is-active' : '') + (index === stageIndex ? ' is-current' : '');
      const dot = document.createElement('i');
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('em');
      label.textContent = STAGE_LABELS[item];
      step.appendChild(dot);
      step.appendChild(label);
      stageEl.appendChild(step);
    });

    document.body.appendChild(overlay);
    document.body.classList.add('flower3d-open');
    const closeButton = overlay.querySelector('.flower3d-close');
    closeButton.focus({ preventScroll: true });

    const state = {
      overlay: overlay,
      trigger: trigger,
      closeButton: closeButton,
      flower: flower,
      stage: stage,
      kind: options.kind,
      raf: 0,
      renderer: null,
      scene: null,
      camera: null,
      cleanup: [],
      keyHandler: null,
      disposed: false
    };
    viewer = state;

    state.keyHandler = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeViewer();
      }
    };
    window.addEventListener('keydown', state.keyHandler);
    closeButton.addEventListener('click', closeViewer);

    try {
      createScene(state);
    } catch (error) {
      showFallback(state);
    }
  }

  function closeViewer() {
    if (!viewer) return;
    const state = viewer;
    viewer = null;
    state.disposed = true;
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.keyHandler) window.removeEventListener('keydown', state.keyHandler);
    state.cleanup.forEach(function (fn) {
      try { fn(); } catch (error) { /* 清理失败不应该阻止关闭 */ }
    });
    if (state.scene) {
      state.scene.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(function (material) {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
    }
    if (state.renderer) {
      try { state.renderer.dispose(); } catch (error) { /* 忽略 WebGL 上下文释放失败 */ }
      try { state.renderer.forceContextLoss(); } catch (error) { /* 忽略 */ }
    }
    if (state.overlay && state.overlay.isConnected) state.overlay.remove();
    document.body.classList.remove('flower3d-open');
    if (state.trigger && typeof state.trigger.focus === 'function' && document.contains(state.trigger)) {
      state.trigger.focus({ preventScroll: true });
    }
  }

  function showFallback(state) {
    const loading = state.overlay.querySelector('.flower3d-loading');
    if (loading) loading.remove();
    const canvas = state.overlay.querySelector('.flower3d-canvas');
    if (canvas) canvas.style.display = 'none';
    const fallback = state.overlay.querySelector('.flower3d-fallback');
    if (!fallback) return;
    const art = window.Art ? Art.flower(state.flower.id, state.stage) : '';
    fallback.innerHTML = '<div class="flower3d-fallback-art">' + art + '</div>' +
      '<p>这个设备暂时没有开启 WebGL。<br>先看看手绘版的花吧。</p>';
    fallback.hidden = false;
  }

  function createScene(state) {
    if (!window.THREE) throw new Error('Three.js 未加载');
    const THREE = window.THREE;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    const canvas = state.overlay.querySelector('.flower3d-canvas');
    const shell = state.overlay.querySelector('.flower3d-shell');
    const loading = state.overlay.querySelector('.flower3d-loading');
    const flower = state.flower;
    const stage = state.stage;
    const reduced = prefersReducedMotion();

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    state.renderer = renderer;

    const scene = new THREE.Scene();
    state.scene = scene;
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 60);
    state.camera = camera;

    scene.add(new THREE.HemisphereLight(0xfffbef, 0x718064, 0.82));
    const key = new THREE.DirectionalLight(0xffefd0, 1.7);
    key.position.set(-4.5, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd6e4ff, 0.45);
    fill.position.set(4.5, 2.5, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffdca4, 0.7);
    rim.position.set(0, 3, -5);
    scene.add(rim);

    const geos = [];
    const mats = [];
    function geo(g) { geos.push(g); return g; }
    function mat(params) { const m = new THREE.MeshStandardMaterial(params); mats.push(m); return m; }
    function basic(params) { const m = new THREE.MeshBasicMaterial(params); mats.push(m); return m; }

    function paint(geometry, colorFrom, colorTo) {
      const position = geometry.attributes.position;
      const colors = new Float32Array(position.count * 3);
      const from = new THREE.Color(colorFrom);
      const to = new THREE.Color(colorTo);
      geometry.computeBoundingBox();
      const minY = geometry.boundingBox.min.y;
      const maxY = geometry.boundingBox.max.y;
      const span = Math.max(0.0001, maxY - minY);
      const currentColor = new THREE.Color();
      for (let i = 0; i < position.count; i += 1) {
        const t = Math.max(0, Math.min(1, (position.getY(i) - minY) / span));
        currentColor.copy(from).lerp(to, t);
        colors[i * 3] = currentColor.r;
        colors[i * 3 + 1] = currentColor.g;
        colors[i * 3 + 2] = currentColor.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geometry;
    }

    function petalGeometry(length, width, kind) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      if (kind === 'round') {
        shape.bezierCurveTo(-width, length * 0.22, -width * 1.02, length * 0.78, 0, length);
        shape.bezierCurveTo(width * 1.02, length * 0.78, width, length * 0.22, 0, 0);
      } else if (kind === 'wide') {
        shape.bezierCurveTo(-width, length * 0.16, -width * 0.9, length * 0.86, 0, length * 0.92);
        shape.bezierCurveTo(width * 0.9, length * 0.86, width, length * 0.16, 0, 0);
      } else {
        shape.bezierCurveTo(-width * 0.72, length * 0.2, -width * 0.48, length * 0.78, 0, length);
        shape.bezierCurveTo(width * 0.48, length * 0.78, width * 0.72, length * 0.2, 0, 0);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.035,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.014,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 14
      });
      geometry.translate(0, 0, -0.0175);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        const y = position.getY(i);
        const edge = Math.min(1, Math.abs(x) / Math.max(0.001, width));
        position.setZ(i, position.getZ(i) + edge * 0.075 + Math.sin(Math.min(1, y / length) * Math.PI) * 0.018);
      }
      geometry.computeVertexNormals();
      return geometry;
    }

    function leafGeometry(length, width) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(-width, length * 0.2, -width * 0.78, length * 0.8, 0, length);
      shape.bezierCurveTo(width * 0.78, length * 0.8, width, length * 0.2, 0, 0);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.025,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 1,
        curveSegments: 12
      });
      geometry.translate(0, 0, -0.0125);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        position.setZ(i, position.getZ(i) + Math.min(1, Math.abs(x) / Math.max(0.001, width)) * 0.06);
      }
      geometry.computeVertexNormals();
      return geometry;
    }

    function addPot(root) {
      const clay = mat({ color: 0xa66f51, roughness: 0.94, metalness: 0 });
      const clayLight = mat({ color: 0xbd8561, roughness: 0.9 });
      const soilMat = mat({ color: 0x4d392a, roughness: 1 });
      const body = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.78, 0.57, 0.64, 48, 1, false)), clay);
      body.position.y = -1.2;
      root.add(body);
      const rim = new THREE.Mesh(geo(new THREE.TorusGeometry(0.78, 0.043, 8, 48)), clayLight);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = -0.89;
      root.add(rim);
      const band = new THREE.Mesh(geo(new THREE.TorusGeometry(0.705, 0.011, 6, 48)), mat({ color: 0xeadcc3, roughness: 0.8 }));
      band.rotation.x = Math.PI / 2;
      band.position.y = -1.24;
      root.add(band);
      const soil = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.725, 0.665, 0.065, 48)), soilMat);
      soil.position.y = -0.85;
      root.add(soil);
      const pebbleGeo = geo(new THREE.SphereGeometry(0.052, 8, 6));
      const pebbleMat = mat({ color: 0x6d5742, roughness: 1 });
      [[-0.36, -0.8, 0.24], [0.33, -0.82, -0.13], [0.11, -0.8, -0.36]].forEach(function (point) {
        const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
        pebble.position.set(point[0], point[1], point[2]);
        pebble.scale.set(1, 0.55, 0.8);
        root.add(pebble);
      });
      const shadowMat = basic({ color: 0x4d3f2d, transparent: true, opacity: 0.13, depthWrite: false });
      const shadow = new THREE.Mesh(geo(new THREE.CircleGeometry(1.38, 48)), shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.535;
      shadow.scale.set(1.16, 0.64, 1);
      root.add(shadow);
    }

    function addSeed(root) {
      const mound = new THREE.Mesh(geo(new THREE.SphereGeometry(0.36, 20, 10, 0, TAU, 0, Math.PI / 2)), mat({ color: 0x5e4937, roughness: 1 }));
      mound.position.y = -0.83;
      mound.scale.y = 0.24;
      root.add(mound);
      const seed = new THREE.Mesh(geo(new THREE.SphereGeometry(0.15, 16, 12)), mat({ color: 0xb18457, roughness: 0.92 }));
      seed.scale.set(0.7, 1.15, 0.5);
      seed.position.set(-0.06, -0.73, 0.1);
      seed.rotation.set(0.2, 0.35, 0.6);
      root.add(seed);
      const glint = new THREE.Mesh(geo(new THREE.SphereGeometry(0.018, 6, 6)), basic({ color: 0xf4d681 }));
      glint.position.set(-0.02, -0.65, 0.13);
      root.add(glint);
    }

    const shape = flower.shape || 'daisy';
    const leafMat = mat({ color: 0xffffff, vertexColors: true, roughness: 0.88, side: THREE.DoubleSide });
    const veinMat = mat({ color: flower.colors.leaf, roughness: 0.9 });
    const petalMat = mat({ color: 0xffffff, vertexColors: true, roughness: 0.66, side: THREE.DoubleSide });
    const greenMat = mat({ color: flower.colors.leaf, roughness: 0.9, side: THREE.DoubleSide });
    const greenDark = mat({ color: flower.colors.stem, roughness: 0.92, side: THREE.DoubleSide });
    const centerMat = mat({ color: flower.colors.center, roughness: 0.76 });
    const centerAltMat = mat({ color: flower.colors.centerAlt, roughness: 0.9 });

    const root = new THREE.Group();
    scene.add(root);
    addPot(root);
    if (stage === 'seed') {
      addSeed(root);
    }

    let plant = null;
    let swayTarget = null;
    if (stage !== 'seed') {
      plant = new THREE.Group();
      plant.position.y = -0.82;
      root.add(plant);
      swayTarget = plant;

      const heights = { daisy: 1.28, tulip: 1.5, hyacinth: 1.3, rose: 1.12, sunflower: 1.68, hydrangea: 1.18, lily: 1.32 };
      const fullTop = heights[shape] || 1.3;
      const stageScale = stage === 'sprout' ? 0.34 : stage === 'bud' ? 0.8 : 1;
      const top = fullTop * stageScale;
      const bendBase = shape === 'lily' ? 0.32 : shape === 'hyacinth' ? 0.14 : 0.08;
      const bend = bendBase * stageScale;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(bend * 0.18, top * 0.28, 0.015),
        new THREE.Vector3(bend * 0.55, top * 0.66, -0.015),
        new THREE.Vector3(bend, top, 0)
      ]);
      const radius = shape === 'sunflower' ? 0.043 : 0.032;
      const stem = new THREE.Mesh(geo(new THREE.TubeGeometry(curve, 36, radius, 6, false)), greenDark);
      plant.add(stem);

      const leafSets = {
        daisy: [
          [0.24, 2.3, -1.05, 0.46, 0.15], [0.4, 0.55, 1.12, 0.5, 0.16], [0.52, 3.7, -1.16, 0.38, 0.12]
        ],
        tulip: [
          [0.02, 2.35, -0.38, 1.02, 0.16], [0.02, 3.8, 0.36, 0.98, 0.15], [0.14, 0.55, -0.75, 0.64, 0.12]
        ],
        hyacinth: [
          [0.02, 2.3, -0.72, 0.8, 0.1], [0.02, 3.8, 0.7, 0.8, 0.1], [0.12, 0.8, -1.05, 0.58, 0.085]
        ],
        rose: [
          [0.23, 2.1, -1.05, 0.52, 0.18], [0.37, 3.65, 1.04, 0.58, 0.2], [0.5, 0.65, -0.95, 0.42, 0.14]
        ],
        sunflower: [
          [0.02, 2.4, -0.46, 0.88, 0.3], [0.02, 3.7, 0.42, 0.84, 0.28], [0.34, 0.6, -1.05, 0.58, 0.2]
        ],
        hydrangea: [
          [0.02, 2.2, -0.5, 0.78, 0.27], [0.02, 3.8, 0.46, 0.74, 0.26], [0.2, 0.7, -1.1, 0.48, 0.17]
        ],
        lily: [
          [0.02, 2.2, -0.72, 1.12, 0.15], [0.02, 3.8, 0.7, 1.12, 0.15], [0.16, 0.8, -1.05, 0.7, 0.12]
        ]
      };
      const leaves = leafSets[shape] || leafSets.daisy;
      const leafLimit = stage === 'sprout' ? 2 : leaves.length;
      for (let i = 0; i < leafLimit; i += 1) {
        const spec = leaves[i];
        const base = curve.getPoint(spec[0]);
        base.y += 0.015;
        const length = spec[3] * (stage === 'sprout' ? 0.62 : 1);
        const width = spec[4] * (stage === 'sprout' ? 0.7 : 1);
        const leafGroup = new THREE.Group();
        leafGroup.position.copy(base);
        leafGroup.rotation.y = spec[1];
        leafGroup.rotation.z = spec[2];
        leafGroup.rotation.x = 0.12;
        const leafMesh = new THREE.Mesh(geo(paint(leafGeometry(length, width), flower.colors.stem, flower.colors.leaf)), leafMat);
        leafGroup.add(leafMesh);
        const vein = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.006, 0.009, length * 0.78, 4)), veinMat);
        vein.position.set(0, length * 0.4, 0.035);
        leafGroup.add(vein);
        plant.add(leafGroup);
      }

      function addCalyx(parent, y, scale) {
        const sepalGeo = geo(paint(petalGeometry(0.33 * scale, 0.09 * scale, 'pointed'), flower.colors.stem, flower.colors.leaf));
        for (let i = 0; i < 5; i += 1) {
          const pivot = new THREE.Group();
          pivot.rotation.y = (i / 5) * TAU;
          const sepal = new THREE.Mesh(sepalGeo, greenMat);
          sepal.rotation.x = 2.45;
          sepal.position.y = y;
          pivot.add(sepal);
          parent.add(pivot);
        }
      }

      function addCenter(parent, radius, dotCount, y) {
        const dome = new THREE.Mesh(geo(new THREE.SphereGeometry(radius, 24, 14)), centerMat);
        dome.scale.y = 0.38;
        dome.position.y = y;
        parent.add(dome);
        const dotGeo = geo(new THREE.SphereGeometry(radius * 0.038, 4, 4));
        for (let i = 0; i < dotCount; i += 1) {
          const angle = i * 2.399963;
          const r = radius * 0.82 * Math.sqrt((i + 0.5) / dotCount);
          const dot = new THREE.Mesh(dotGeo, centerAltMat);
          dot.position.set(Math.cos(angle) * r, y + 0.055 + Math.sqrt(Math.max(0, radius * radius - r * r)) * 0.32, Math.sin(angle) * r);
          parent.add(dot);
        }
        const rim = new THREE.Mesh(geo(new THREE.TorusGeometry(radius * 0.98, radius * 0.035, 6, 28)), centerAltMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = y + 0.02;
        parent.add(rim);
      }

      function addPetalRing(parent, petals, options) {
        const count = options.count;
        for (let i = 0; i < count; i += 1) {
          const pivot = new THREE.Group();
          pivot.rotation.y = (i / count) * TAU + (options.offset || 0);
          const petal = new THREE.Mesh(petals.geometry, petals.material);
          petal.rotation.x = options.tilt + Math.sin(i * 2.7) * 0.035;
          petal.rotation.z = Math.sin(i * 1.9 + (options.offset || 0)) * 0.035;
          const variation = 0.94 + ((i * 7) % 5) * 0.015;
          petal.scale.set(options.scale * variation, options.scale, options.scale);
          petal.position.y = options.y || 0;
          pivot.add(petal);
          parent.add(pivot);
        }
      }

      const headPosition = curve.getPoint(1);
      headPosition.y += 0.015;

      function buildDisc(big) {
        const head = new THREE.Group();
        head.position.copy(headPosition);
        head.rotation.x = big ? 0.4 : 0.34;
        plant.add(head);
        addCalyx(head, -0.035, big ? 1.25 : 1);
        const outerGeo = geo(paint(petalGeometry(big ? 1.1 : 0.8, big ? 0.22 : 0.18, big ? 'pointed' : 'round'), flower.colors.centerAlt, flower.colors.petal));
        const innerGeo = geo(paint(petalGeometry(big ? 0.86 : 0.62, big ? 0.2 : 0.17, 'round'), flower.colors.petalAlt, flower.colors.petal));
        const outer = { geometry: outerGeo, material: petalMat };
        const inner = { geometry: innerGeo, material: petalMat };
        addPetalRing(head, outer, { count: big ? 24 : 20, tilt: 1.34, scale: 1, offset: 0.1 });
        addPetalRing(head, inner, { count: big ? 18 : 15, tilt: 1.16, scale: 0.78, offset: 0.28, y: 0.035 });
        addCenter(head, big ? 0.48 : 0.29, big ? 74 : 28, 0.05);
      }

      function buildRose() {
        const head = new THREE.Group();
        head.position.copy(headPosition);
        head.rotation.x = 0.06;
        plant.add(head);
        addCalyx(head, -0.03, 1.1);
        const layers = [
          { count: 9, len: 0.92, width: 0.52, tilt: 1.08, scale: 1, y: 0, offset: 0.12, colors: [flower.colors.petalAlt, flower.colors.petal] },
          { count: 8, len: 0.78, width: 0.46, tilt: 0.92, scale: 0.96, y: 0.04, offset: 0.48, colors: [flower.colors.petal, flower.colors.center] },
          { count: 7, len: 0.6, width: 0.38, tilt: 0.76, scale: 0.9, y: 0.08, offset: 0.2, colors: [flower.colors.petalAlt, flower.colors.petal] },
          { count: 5, len: 0.4, width: 0.28, tilt: 0.48, scale: 0.82, y: 0.11, offset: 0.6, colors: [flower.colors.petal, flower.colors.center] }
        ];
        layers.forEach(function (layer) {
          const petal = {
            geometry: geo(paint(petalGeometry(layer.len, layer.width, 'wide'), layer.colors[0], layer.colors[1])),
            material: petalMat
          };
          addPetalRing(head, petal, layer);
        });
        const bud = new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 16, 12)), centerAltMat);
        bud.scale.y = 0.84;
        bud.position.y = 0.18;
        head.add(bud);
      }

      function buildTulip() {
        const head = new THREE.Group();
        head.position.copy(headPosition);
        head.rotation.x = 0.02;
        plant.add(head);
        addCalyx(head, -0.025, 0.9);
        const petal = {
          geometry: geo(paint(petalGeometry(0.94, 0.38, 'round'), flower.colors.petalAlt, flower.colors.petal)),
          material: petalMat
        };
        const innerPetal = {
          geometry: geo(paint(petalGeometry(0.8, 0.32, 'round'), flower.colors.center, flower.colors.petal)),
          material: petalMat
        };
        addPetalRing(head, petal, { count: 3, tilt: 0.84, scale: 1, offset: 0.1 });
        addPetalRing(head, petal, { count: 3, tilt: 0.76, scale: 1, offset: 1.15 });
        addPetalRing(head, innerPetal, { count: 3, tilt: 0.55, scale: 0.88, offset: 0.58, y: 0.04 });
        for (let i = 0; i < 6; i += 1) {
          const stamen = new THREE.Mesh(geo(new THREE.SphereGeometry(0.026, 8, 6)), mat({ color: flower.colors.accent, roughness: 0.7 }));
          const angle = (i / 6) * TAU;
          stamen.position.set(Math.cos(angle) * 0.05, 0.11, Math.sin(angle) * 0.05);
          head.add(stamen);
        }
      }

      function makeFloret(size, petalColors) {
        const group = new THREE.Group();
        const fGeo = geo(petalGeometry(size, size * 0.46, 'round'));
        const fMat = mat({ color: petalColors[0], roughness: 0.7, side: THREE.DoubleSide });
        const fMatAlt = mat({ color: petalColors[1], roughness: 0.7, side: THREE.DoubleSide });
        for (let i = 0; i < 4; i += 1) {
          const petal = new THREE.Mesh(fGeo, i % 2 ? fMatAlt : fMat);
          petal.rotation.z = (i / 4) * TAU;
          petal.scale.set(1, 1, 1);
          group.add(petal);
        }
        const center = new THREE.Mesh(geo(new THREE.SphereGeometry(size * 0.2, 8, 6)), basic({ color: flower.colors.center }));
        center.position.z = 0.02;
        group.add(center);
        return group;
      }

      function buildHydrangea() {
        const head = new THREE.Group();
        head.position.copy(headPosition);
        plant.add(head);
        const count = 24;
        const radius = 0.62;
        for (let i = 0; i < count; i += 1) {
          const y = 1 - (i / (count - 1)) * 2;
          const ring = Math.sqrt(Math.max(0, 1 - y * y));
          const angle = i * 2.399963;
          const point = new THREE.Vector3(Math.cos(angle) * ring * radius, y * radius * 0.86, Math.sin(angle) * ring * radius);
          const floret = makeFloret(0.25, i % 3 === 0 ? [flower.colors.center, flower.colors.petal] : [flower.colors.petal, flower.colors.petalAlt]);
          floret.position.copy(point);
          floret.lookAt(point.clone().multiplyScalar(2));
          head.add(floret);
        }
      }

      function buildHyacinth() {
        const cluster = new THREE.Group();
        plant.add(cluster);
        const count = 15;
        for (let i = 0; i < count; i += 1) {
          const t = 0.4 + (i / (count - 1)) * 0.58;
          const center = curve.getPoint(t);
          const angle = i * 2.399963 + 0.4;
          const ring = 0.27 * (1 - t * 0.55);
          const outward = new THREE.Vector3(Math.cos(angle), 0.18, Math.sin(angle)).normalize();
          const floret = makeFloret(0.2, i % 4 === 0 ? [flower.colors.center, flower.colors.petal] : [flower.colors.petal, flower.colors.petalAlt]);
          floret.position.copy(center).addScaledVector(outward, ring);
          floret.lookAt(floret.position.clone().add(outward));
          cluster.add(floret);
        }
        const tip = new THREE.Mesh(geo(new THREE.ConeGeometry(0.055, 0.28, 8)), greenDark);
        tip.position.copy(headPosition);
        tip.position.y += 0.1;
        cluster.add(tip);
      }

      function makeBell(size) {
        const group = new THREE.Group();
        const bellGeo = geo(paint(petalGeometry(size, size * 0.45, 'round'), flower.colors.petalAlt, flower.colors.petal));
        for (let i = 0; i < 5; i += 1) {
          const pivot = new THREE.Group();
          pivot.rotation.y = (i / 5) * TAU;
          const petal = new THREE.Mesh(bellGeo, petalMat);
          petal.rotation.x = 2.45;
          pivot.add(petal);
          group.add(pivot);
        }
        return group;
      }

      function buildLily() {
        for (let i = 0; i < 7; i += 1) {
          const t = 0.4 + i * 0.085;
          const anchor = curve.getPoint(t);
          const side = i % 2 === 0 ? 1 : -1;
          const bell = makeBell(i === 6 ? 0.24 : 0.3);
          bell.position.set(anchor.x + side * 0.2, anchor.y - 0.04, anchor.z + (i % 3 === 0 ? 0.1 : -0.06));
          bell.rotation.z = side * 0.38;
          bell.rotation.y = i * 0.7;
          plant.add(bell);
          const pedicel = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.009, 0.012, 0.22, 4)), greenDark);
          pedicel.position.set(anchor.x + side * 0.09, anchor.y + 0.005, anchor.z);
          pedicel.rotation.z = side * 0.9;
          plant.add(pedicel);
        }
      }

      if (stage === 'sprout') {
        const tipLeaf = new THREE.Mesh(geo(paint(leafGeometry(0.28, 0.1), flower.colors.stem, flower.colors.leaf)), leafMat);
        tipLeaf.position.copy(curve.getPoint(1));
        tipLeaf.rotation.z = 0.55;
        plant.add(tipLeaf);
      } else if (stage === 'bud') {
        const budGroup = new THREE.Group();
        budGroup.position.copy(headPosition);
        budGroup.rotation.x = 0.18;
        plant.add(budGroup);
        const bud = new THREE.Mesh(geo(new THREE.SphereGeometry(0.23, 20, 16)), mat({ color: flower.colors.petalAlt, roughness: 0.68 }));
        bud.scale.set(0.85, 1.55, 0.85);
        bud.position.y = 0.13;
        budGroup.add(bud);
        addCalyx(budGroup, -0.08, 1.05);
      } else if (shape === 'rose') {
        buildRose();
      } else if (shape === 'tulip') {
        buildTulip();
      } else if (shape === 'sunflower') {
        buildDisc(true);
      } else if (shape === 'hydrangea') {
        buildHydrangea();
      } else if (shape === 'hyacinth') {
        buildHyacinth();
      } else if (shape === 'lily') {
        buildLily();
      } else {
        buildDisc(false);
      }
    }

    const cameraTarget = new THREE.Vector3(0, 0.06, 0);
    const shellAspect = Math.max(0.35, shell.clientWidth / Math.max(1, shell.clientHeight));
    const radiusFit = shellAspect < 0.65 ? 1.04 : shellAspect < 0.9 ? 1 : 0.96;
    const orbit = {
      azimuth: 0.35,
      polar: 1.17,
      radius: (shape === 'sunflower' ? 7.9 : shape === 'lily' || shape === 'hyacinth' ? 7.6 : 7.3) * radiusFit
    };
    let autoRotate = !reduced;
    let autoTimer = 0;
    let lastFrame = performance.now();
    let ready = false;

    function applyCamera() {
      const sinPolar = Math.sin(orbit.polar);
      camera.position.set(
        cameraTarget.x + orbit.radius * sinPolar * Math.sin(orbit.azimuth),
        cameraTarget.y + orbit.radius * Math.cos(orbit.polar),
        cameraTarget.z + orbit.radius * sinPolar * Math.cos(orbit.azimuth)
      );
      camera.lookAt(cameraTarget);
    }

    function resize() {
      const rect = shell.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function pauseAutoRotate() {
      autoRotate = false;
      if (autoTimer) window.clearTimeout(autoTimer);
      autoTimer = window.setTimeout(function () {
        if (!state.disposed && !reduced) autoRotate = true;
      }, 2600);
    }

    const pointers = new Map();
    let drag = null;
    let pinchStart = 0;

    function pointerDistance() {
      const values = Array.from(pointers.values());
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    }

    function firstPointer() {
      const entry = pointers.entries().next();
      if (entry.done) return null;
      return { id: entry.value[0], point: entry.value[1] };
    }

    function onPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      pauseAutoRotate();
      if (pointers.size === 1) {
        const first = firstPointer();
        drag = { id: first.id, x: first.point.x, y: first.point.y };
        pinchStart = 0;
      } else if (pointers.size === 2) {
        drag = null;
        pinchStart = pointerDistance();
      }
    }

    function onPointerMove(event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const distance = pointerDistance();
        if (pinchStart > 0 && distance > 0) {
          orbit.radius = Math.max(5.6, Math.min(12, orbit.radius * (pinchStart / distance)));
        }
        pinchStart = distance;
        return;
      }
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      orbit.azimuth -= dx * 0.007;
      orbit.polar = Math.max(0.65, Math.min(1.55, orbit.polar - dy * 0.006));
    }

    function onPointerEnd(event) {
      pointers.delete(event.pointerId);
      if (canvas.releasePointerCapture && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (pointers.size === 0) {
        drag = null;
        pinchStart = 0;
        pauseAutoRotate();
      } else if (pointers.size === 1) {
        const first = firstPointer();
        drag = { id: first.id, x: first.point.x, y: first.point.y };
        pinchStart = 0;
      }
    }

    function onWheel(event) {
      event.preventDefault();
      orbit.radius = Math.max(5.6, Math.min(12, orbit.radius + event.deltaY * 0.0028));
      pauseAutoRotate();
    }

    function animate(now) {
      if (state.disposed) return;
      const delta = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
      lastFrame = now;
      if (autoRotate) orbit.azimuth += delta * 0.16;
      if (!reduced && plant) {
        plant.rotation.z = Math.sin(now * 0.00075) * 0.009;
        plant.rotation.x = Math.sin(now * 0.00058 + 1.2) * 0.004;
      }
      applyCamera();
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        if (loading) {
          loading.classList.add('is-hidden');
          window.setTimeout(function () { if (loading.isConnected) loading.remove(); }, 420);
        }
      }
      state.raf = requestAnimationFrame(animate);
    }

    applyCamera();
    resize();
    window.addEventListener('resize', resize);
    state.cleanup.push(function () { window.removeEventListener('resize', resize); });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    state.cleanup.push(function () {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('wheel', onWheel);
    });
    state.cleanup.push(function () {
      geos.forEach(function (geometry) { geometry.dispose(); });
      mats.forEach(function (material) { material.dispose(); });
    });
    state.raf = requestAnimationFrame(animate);
  }

  document.addEventListener('click', function (event) {
    const plantButton = event.target.closest('[data-open-3d]');
    if (plantButton) {
      event.preventDefault();
      openPlant(plantButton.getAttribute('data-open-3d'));
      return;
    }
    const flowerButton = event.target.closest('[data-open-3d-flower]');
    if (flowerButton) {
      event.preventDefault();
      openFlower(flowerButton.getAttribute('data-open-3d-flower'));
    }
  });

  window.Flower3D = {
    openPlant: openPlant,
    openFlower: openFlower,
    close: closeViewer
  };
})();
