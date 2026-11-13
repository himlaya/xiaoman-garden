/* 小小花园 · 3D 花房
 * 盛开花朵加载本地 Blender 模型，生长阶段和花盆由 Three.js 生成。
 * 支持拖动旋转、滚轮/双指缩放；种子→发芽→结蕾→盛开都各有形态。
 */
(function () {
  'use strict';

  const DATA = window.GameData;
  const Items = window.GardenItems;
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
    const rawPlant = Game.getState().garden[Number(slot)];
    const item = rawPlant && rawPlant.templateId ? {
      kind: 'bouquet',
      flowerId: rawPlant.flowerId,
      grade: rawPlant.seedGrade || 'common',
      templateId: rawPlant.templateId,
      patternSeed: rawPlant.patternSeed || 1,
      wear: rawPlant.seedWear ?? 0.03
    } : null;
    openViewer({
      kind: 'plant',
      flower: view.flower,
      stage: view.stage,
      progress: view.progressPercent,
      slot: Number(slot),
      item: item
    });
  }

  function openFlower(flowerId, item) {
    const flower = DATA.flowerMap[flowerId];
    if (!flower) return;
    openViewer({ kind: item ? 'item' : 'album', flower: flower, stage: 'bloom', progress: 100, slot: null, item: item || null });
  }

  function openItem(item) {
    if (!item) return;
    openFlower(item.flowerId, item);
  }

  function openShelf(items, page) {
    const bouquets = items.filter(function (item) { return item.kind === 'bouquet' && DATA.flowerMap[item.flowerId]; });
    openViewer({
      kind: 'shelf', flower: DATA.flowerMap[bouquets[0]?.flowerId || 'daisy'], stage: 'bloom',
      shelfItems: bouquets, shelfPage: Math.max(0, Math.min(Number(page) || 0, Math.ceil(bouquets.length / 6) - 1))
    });
  }

  function openViewer(options) {
    closeViewer();
    const flower = options.flower;
    const item = options.item || null;
    const stage = STAGES.includes(options.stage) ? options.stage : 'bloom';
    const trigger = options.trigger || document.activeElement;
    const quality = item && Items ? Items.gradeById(item.grade) : { id: 'common', label: '花种预览', color: '#748773' };
    const canPreviewQuality = options.kind === 'album' && window.FlowerForms.canPreview();
    const previewGrade = item ? quality.id : (canPreviewQuality ? options.previewGrade || 'common' : 'common');
    const form = window.FlowerForms.get(flower.id, previewGrade);
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
            '<div class="flower3d-name-row"><h2 class="flower3d-name"></h2><span class="flower3d-rarity ' + 'grade-' + quality.id + '"></span></div>' +
            '<p class="flower3d-language"></p>' +
            '<div class="flower3d-itemmeta"></div>' +
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
    rarityEl.textContent = quality.label;
    rarityEl.classList.add('grade-' + quality.id);
    overlay.querySelector('.flower3d-language').textContent = '「' + flower.language + '」';
    const metaEl = overlay.querySelector('.flower3d-itemmeta');
    if (item && Items) {
      const grade = Items.gradeById(item.grade);
      const template = Items.templateById(item.templateId);
      const wear = Items.wearBand(item.wear, item.kind);
      metaEl.innerHTML = '<span class="item-grade grade-' + esc(grade.id) + '">' + esc(grade.label) + '</span>' +
        '<span class="flower3d-meta-chip">' + esc(template.label) + '模板 · #' + (Number(item.patternSeed) >>> 0) + '</span>' +
        '<span class="wear-badge ' + esc(wear.className) + '">' + esc(wear.label) + ' ' + Number(item.wear).toFixed(3) + '</span>';
    }
    if (options.kind !== 'shelf') {
      const formLabel = document.createElement('span');
      formLabel.className = 'flower3d-meta-chip';
      formLabel.textContent = '花型 · ' + form.label;
      metaEl.appendChild(formLabel);
    }
    const isItemView = !!item;
    overlay.querySelector('.flower3d-stage-label').textContent = isItemView
      ? (item.kind === 'seed' ? '基因预览 · 种子也独一无二' : '成品花束 · 品相已定格')
      : (options.kind === 'album'
        ? '花房图鉴 · 盛开'
        : (stage === 'bloom' ? '盛开 · 花期内' : STAGE_LABELS[stage] + ' · ' + Math.max(0, Math.min(100, options.progress || 0)) + '%'));
    overlay.querySelector('.flower3d-progress').textContent = isItemView
      ? (item.kind === 'seed' ? '种下后会开出这个模板' : '不会继续枯萎')
      : (options.kind === 'album' ? '已收集' : (stage === 'bloom' ? '花开好了' : '慢慢来'));

    const stageIndex = STAGES.indexOf(stage);
    const stageEl = overlay.querySelector('.flower3d-stages');
    if (canPreviewQuality) {
      stageEl.classList.add('flower3d-quality-picker');
      stageEl.setAttribute('aria-label', '预览同一花种的五种品质花型');
      DATA.itemGrades.forEach(function (grade) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'flower3d-quality grade-' + grade.id;
        button.textContent = grade.label;
        button.setAttribute('aria-pressed', String(previewGrade === grade.id));
        button.addEventListener('click', function () {
          if (previewGrade !== grade.id) openViewer(Object.assign({}, options, { previewGrade: grade.id, trigger: trigger }));
        });
        stageEl.appendChild(button);
      });
      overlay.querySelector('.flower3d-stage-label').textContent = '同种花 · 五种品质花型';
      overlay.querySelector('.flower3d-progress').textContent = '切换欣赏';
      rarityEl.textContent = Items.gradeById(previewGrade).label;
      rarityEl.className = 'flower3d-rarity grade-' + previewGrade;
    } else if (isItemView) {
      stageEl.style.display = 'none';
    } else {
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
    }

    document.body.appendChild(overlay);
    document.body.classList.add('flower3d-open');
    const closeButton = overlay.querySelector('.flower3d-close');
    closeButton.focus({ preventScroll: true });

    const state = {
      overlay: overlay,
      trigger: options.trigger || trigger,
      closeButton: closeButton,
      flower: flower,
      item: item,
      previewGrade: previewGrade,
      stage: stage,
      kind: options.kind,
      shelfItems: options.shelfItems,
      shelfPage: options.shelfPage,
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
    if (options.returnShelf) {
      const back = document.createElement('button');
      back.className = 'flower3d-back';
      back.textContent = '返回花架';
      back.addEventListener('click', function () { openShelf(options.returnShelf.items, options.returnShelf.page); });
      overlay.querySelector('.flower3d-heading').appendChild(back);
    }

    try {
      if (state.kind === 'shelf') createShelfScene(state);
      else createScene(state);
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
            if (material.bumpMap) material.bumpMap.dispose();
        if (material.roughnessMap) material.roughnessMap.dispose();
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
    const art = window.Art && state.kind !== 'shelf' ? Art.flower(state.flower.id, state.stage) : '';
    fallback.innerHTML = '<div class="flower3d-fallback-art">' + art + '</div>' +
      (state.kind === 'shelf'
        ? '<p>当前设备未开启 WebGL，暂时无法显示三维花架。<br>可用下方按钮选择花束。</p>'
        : '<p>这个设备暂时没有开启 WebGL。<br>先看看手绘版的花吧。</p>');
    fallback.hidden = false;
  }

  function buildShelfModels(state, THREE) {
    const rack = new THREE.Group();
    rack.name = 'bouquet-display-rack';
    const wood = new THREE.MeshStandardMaterial({ color: 0xa47b57, roughness: 0.85 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x76583f, roughness: 0.9 });
    const unit = new THREE.BoxGeometry(1, 1, 1);
    state.cleanup.push(function () { unit.dispose(); wood.dispose(); edge.dispose(); });
    function beam(x, y, z, width, height, depth, material) {
      const mesh = new THREE.Mesh(unit, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, height, depth);
      rack.add(mesh);
    }
    for (const y of [-0.88, 1.42]) {
      beam(0, y, 0, 5.6, 0.13, 1.65, wood);
      beam(0, y - 0.09, 0.73, 5.6, 0.12, 0.07, edge);
      for (let slat = 0; slat < 5; slat++) beam(0, y + 0.067, -0.62 + slat * 0.31, 5.5, 0.012, 0.015, edge);
    }
    for (const x of [-2.6, 2.6]) {
      beam(x, 1.3, -0.69, 0.12, 4.65, 0.12, wood);
      beam(x, -0.67, 0.65, 0.12, 0.55, 0.12, wood);
    }
    beam(0, 3.56, -0.69, 5.3, 0.12, 0.12, edge);
    const shown = state.shelfItems.slice(state.shelfPage * 6, state.shelfPage * 6 + 6);
    shown.forEach(function (item, index) {
      const modelState = {
        flower: DATA.flowerMap[item.flowerId], item: item, stage: 'bloom',
        modelOnly: true, overlay: state.overlay, cleanup: []
      };
      state.cleanup.push(function () { modelState.disposed = true; modelState.cleanup.forEach(function (cleanup) { cleanup(); }); });
      const model = createScene(modelState);
      model.name = 'shelf-bouquet-' + item.id;
      model.userData.shelfItem = item;
      model.scale.setScalar(0.55);
      model.position.set((index % 3 - 1) * 1.65, index < 3 ? 0 : 2.3, 0);
      rack.add(model);
    });
    return rack;
  }

  function createShelfScene(state) {
    const THREE = window.THREE;
    const overlay = state.overlay;
    overlay.querySelector('.flower3d-name').textContent = '我的 3D 花架';
    overlay.querySelector('.flower3d-rarity').textContent = state.shelfItems.length + ' 束';
    overlay.querySelector('.flower3d-language').textContent = '把每一次盛开，摆成一处风景。';
    overlay.querySelector('.flower3d-itemmeta').textContent = '';
    overlay.querySelector('.flower3d-stage-label').textContent = state.shelfItems.length ? '点击花束，单独欣赏' : '采摘后的花束会自动摆上花架';
    const pages = Math.max(1, Math.ceil(state.shelfItems.length / 6));
    overlay.querySelector('.flower3d-progress').textContent = (state.shelfPage + 1) + ' / ' + pages + ' 架';
    const controls = overlay.querySelector('.flower3d-stages');
    controls.style.display = 'flex';
    controls.classList.add('shelf3d-controls');
    controls.innerHTML = '';
    const shown = state.shelfItems.slice(state.shelfPage * 6, state.shelfPage * 6 + 6);
    function inspect(item) {
      openViewer({ kind: 'item', flower: DATA.flowerMap[item.flowerId], item: item, stage: 'bloom',
        returnShelf: { items: state.shelfItems, page: state.shelfPage } });
    }
    function button(label, disabled, action) {
      const node = document.createElement('button');
      node.type = 'button';
      node.textContent = label;
      node.disabled = disabled;
      node.addEventListener('click', action);
      controls.appendChild(node);
    }
    button('上一架', state.shelfPage === 0, function () { openShelf(state.shelfItems, state.shelfPage - 1); });
    shown.forEach(function (item) { button(DATA.flowerMap[item.flowerId].name + ' · ' + Items.gradeById(item.grade).label, false, function () { inspect(item); }); });
    button('下一架', state.shelfPage + 1 === pages, function () { openShelf(state.shelfItems, state.shelfPage + 1); });
    if (!THREE) throw new Error('Three.js 未加载');
    const canvas = overlay.querySelector('.flower3d-canvas');
    const shell = overlay.querySelector('.flower3d-shell');
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    state.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    state.scene = scene;
    scene.add(new THREE.HemisphereLight(0xfffaf3, 0x66765b, 0.6));
    const key = new THREE.DirectionalLight(0xfff4e4, 1.35);
    key.position.set(-4, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdce8ff, 0.35);
    fill.position.set(4, 4, -2);
    scene.add(fill);
    const rack = buildShelfModels(state, THREE);
    scene.add(rack);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    state.camera = camera;
    const target = new THREE.Vector3(0, 1.25, 0);
    let azimuth = 0.18;
    let polar = 1.38;
    let zoom = 1;
    let fit = 12;
    function resize() {
      const rect = shell.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
      camera.aspect = Math.max(0.3, rect.width / Math.max(1, rect.height));
      camera.updateProjectionMatrix();
      fit = Math.max(8.5, 3.3 / (Math.tan(19 * Math.PI / 180) * camera.aspect));
    }
    const pointers = new Map();
    let moved = false;
    function down(event) {
      if (event.button !== undefined && event.button !== 0) return;
      if (pointers.size === 0) moved = false;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
      canvas.setPointerCapture?.(event.pointerId);
    }
    function move(event) {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      if (Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) > 6) moved = true;
      if (pointers.size === 2) {
        const other = Array.from(pointers.entries()).find(function (entry) { return entry[0] !== event.pointerId; })[1];
        const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
        const newDistance = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        if (newDistance > 0) zoom = Math.max(0.65, Math.min(1.8, zoom * oldDistance / newDistance));
        moved = true;
      } else {
        azimuth -= (event.clientX - previous.x) * 0.007;
        polar = Math.max(0.9, Math.min(1.55, polar - (event.clientY - previous.y) * 0.005));
      }
      previous.x = event.clientX;
      previous.y = event.clientY;
    }
    function up(event) {
      const select = pointers.has(event.pointerId) && pointers.size === 1 && !moved && event.type !== 'pointercancel';
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!select) return;
      const rect = canvas.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      let object = ray.intersectObject(rack, true)[0]?.object;
      while (object && !object.userData.shelfItem) object = object.parent;
      if (object) inspect(object.userData.shelfItem);
    }
    function wheel(event) {
      event.preventDefault();
      zoom = Math.max(0.65, Math.min(1.8, zoom + event.deltaY * 0.001));
    }
    const events = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, wheel: wheel };
    Object.keys(events).forEach(function (name) { canvas.addEventListener(name, events[name], { passive: false }); });
    window.addEventListener('resize', resize);
    state.cleanup.push(function () {
      window.removeEventListener('resize', resize);
      Object.keys(events).forEach(function (name) { canvas.removeEventListener(name, events[name]); });
    });
    function animate() {
      if (state.disposed) return;
      const radius = fit * zoom;
      camera.position.set(Math.sin(azimuth) * Math.sin(polar) * radius, target.y + Math.cos(polar) * radius, Math.cos(azimuth) * Math.sin(polar) * radius);
      camera.lookAt(target);
      renderer.render(scene, camera);
      const loading = overlay.querySelector('.flower3d-loading');
      if (loading) loading.remove();
      state.raf = requestAnimationFrame(animate);
    }
    resize();
    state.raf = requestAnimationFrame(animate);
  }

  function createScene(state) {
    if (!window.THREE) throw new Error('Three.js 未加载');
    const THREE = window.THREE;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    const canvas = state.overlay.querySelector('.flower3d-canvas');
    const shell = state.overlay.querySelector('.flower3d-shell');
    const loading = state.overlay.querySelector('.flower3d-loading');
    const variant = state.item && Items ? Items.variantColors(state.flower, state.item) : null;
    const flower = variant ? Object.assign({}, state.flower, { colors: variant.colors }) : state.flower;
    const wear = variant ? variant.wear : 0;
    const form = window.FlowerForms.get(flower.id, state.item ? state.item.grade : state.previewGrade);
    const pattern = Number(variant ? variant.patternSeed : flower.id.split('').reduce(function (seed, letter) {
      return (seed * 31 + letter.charCodeAt(0)) >>> 0;
    }, 17)) >>> 0;
    const phase = (pattern % 997) / 997 * TAU;
    const potShapeIndex = Math.floor(pattern / 18) % 4;
    const stage = state.stage;
    const reduced = prefersReducedMotion();

    const renderer = state.modelOnly ? null : new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      state.renderer = renderer;
    }

    const scene = new THREE.Scene();
    state.scene = scene;
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 60);
    state.camera = camera;

    scene.add(new THREE.HemisphereLight(0xfffaf2, 0x657756, 0.52));
    const key = new THREE.DirectionalLight(0xfff3e3, 1.3);
    key.position.set(-4.5, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdce8ff, 0.32);
    fill.position.set(4.5, 2.5, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe7cb, 0.38);
    rim.position.set(0, 3, -5);
    scene.add(rim);

    const geos = [];
    const mats = [];
    state.cleanup.push(function () {
      geos.forEach(function (geometry) { geometry.dispose(); });
      mats.forEach(function (material) {
        if (material.map) material.map.dispose();
        if (material.bumpMap) material.bumpMap.dispose();
        if (material.roughnessMap) material.roughnessMap.dispose();
        material.dispose();
      });
    });
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
      const ivory = new THREE.Color(0xfff8e9);
      for (let i = 0; i < position.count; i += 1) {
        const t = Math.max(0, Math.min(1, (position.getY(i) - minY) / span));
        const edge = Math.min(1, Math.abs(position.getX(i)) / Math.max(0.001, geometry.boundingBox.max.x));
        const vein = Math.pow(Math.max(0, Math.cos(position.getX(i) * 80 + t * 8)), 12);
        currentColor.copy(from).lerp(to, Math.min(1, t * 0.85 + edge * 0.15));
        currentColor.lerp(ivory, vein * t * 0.024);
        if (variant && geometry.userData.botanical === 'petal') {
          const finish = variant.template.id;
          const signedX = position.getX(i) / Math.max(0.001, geometry.boundingBox.max.x);
          const pigment = new THREE.Color(variant.template.tint);
          let amount = 0;
          if (finish === 'gilded') amount = Math.max(0, (edge - 0.72) / 0.28) * 0.74;
          if (finish === 'frost') amount = Math.max(0, edge - 0.35) * 0.8 + vein * 0.15;
          if (finish === 'ember') amount = Math.pow(1 - t, 2) * 0.7;
          if (finish === 'moon') amount = Math.max(0, Math.sin(signedX * 8 + phase) - 0.45) * t * 0.38;
          if (finish === 'mist') amount = Math.pow(Math.max(0, Math.sin(signedX * 37 + t * 29 + phase)), 10) * 0.48;
          if (finish === 'celadon') amount = (0.5 + Math.sin(t * 12 + signedX * 5 + phase) * 0.5) * 0.3;
          currentColor.lerp(pigment, amount);
          currentColor.lerp(new THREE.Color('#987959'), Math.max(0, wear - 0.38) * edge * t * 0.6);
        }
        colors[i * 3] = currentColor.r;
        colors[i * 3 + 1] = currentColor.g;
        colors[i * 3 + 2] = currentColor.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geometry;
    }

    function petalGeometry(length, width, kind) {
      const rows = 20;
      const columns = 10;
      const positions = [];
      const indices = [];
      const uvs = [];
      const wide = kind === 'wide';
      for (let row = 0; row <= rows; row++) {
        const t = row / rows;
        const outline = Math.pow(Math.sin(Math.PI * t), wide ? 0.45 : kind === 'pointed' ? 1.1 : 0.65);
        for (let column = 0; column <= columns; column++) {
          const across = column / columns * 2 - 1;
          const ruffle = Math.sin(t * 23 + across * 9 + phase) * Math.pow(Math.abs(across), 4) * t * (kind === 'ruffled' ? 0.09 + form.ruffle : form.ruffle);
          const tooth = kind === 'ruffled' ? 1 + Math.cos(across * 32) * Math.pow(t, 8) * 0.07 : 1;
          const cup = across * across * Math.sin(Math.PI * t) * (wide ? 0.24 : 0.13) * form.cup;
          const curl = Math.pow(t, 4) * (wide ? -0.12 : 0.1) * form.curl;
          positions.push(across * width * outline * form.width, length * t * tooth, length * (cup + curl + ruffle));
          uvs.push(column / columns, t);
          if (row < rows && column < columns) {
            const a = row * (columns + 1) + column;
            indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.userData.botanical = 'petal';
      geometry.computeVertexNormals();
      return geometry;
    }

    function leafGeometry(length, width) {
      const positions = [], uvs = [], indices = [];
      const rows = 24, columns = 10;
      for (let r = 0; r <= rows; r++) {
        const t = r / rows;
        const outline = Math.pow(Math.sin(Math.PI * t), 0.75);
        for (let c = 0; c <= columns; c++) {
          const across = c / columns * 2 - 1;
          const teeth = ['rose', 'hydrangea'].includes(flower.shape) ? 1 + Math.sin(t * 95) * 0.04 : 1;
          positions.push(across * width * outline * teeth, length * t,
            length * (Math.sin(t * Math.PI) * 0.09 + across * across * outline * 0.07 - t * t * 0.04));
          uvs.push(c / columns, t);
          if (r < rows && c < columns) {
            const a = r * (columns + 1) + c;
            indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.userData.botanical = 'leaf';
      geometry.computeVertexNormals();
      return geometry;
    }

    function addPot(root) {
      const palettes = [
        { body: 0xb97c60, rim: 0x587d73, ink: 0xf4e5c5, accent: 0xe3b36d },
        { body: 0xd8c8a9, rim: 0x577f9b, ink: 0xf8edda, accent: 0xd99c78 },
        { body: 0x93aaa0, rim: 0xf0dfbd, ink: 0x4d726c, accent: 0xc97b68 },
        { body: 0xe8d9ca, rim: 0x526c8b, ink: 0xf5e9cb, accent: 0xcba75c },
        { body: 0xc59a91, rim: 0x677d6e, ink: 0xf5e5cd, accent: 0xd9b76f },
        { body: 0x7e9eac, rim: 0xe6d5b3, ink: 0x476477, accent: 0xbb8065 }
      ];
      const surfaces = [
        { label: '陶土', roughness: 0.96, metalness: 0, clearcoat: 0, bump: 0.006 },
        { label: '釉陶', roughness: 0.32, metalness: 0, clearcoat: 0.55, bump: 0.0015 },
        { label: '瓷器', roughness: 0.2, metalness: 0, clearcoat: 0.8, bump: 0.0006 },
        { label: '砂岩', roughness: 0.98, metalness: 0, clearcoat: 0, bump: 0.009 },
        { label: '木纹', roughness: 0.82, metalness: 0, clearcoat: 0.08, bump: 0.004 },
        { label: '铜器', roughness: 0.38, metalness: 0.55, clearcoat: 0.12, bump: 0.002 }
      ];
      const surfaceIndex = pattern % surfaces.length;
      const surface = Object.assign({}, surfaces[surfaceIndex]);
      // Porcelain family and pot shape are specimen variants, independent of flower species and quality.
      const porcelain = surfaceIndex === 2 ? Math.floor(pattern / surfaces.length) % 3 : -1;
      const china = [
        { label: '青花瓷', body: 0xf0eee5, ink: 0x24528b, accent: 0x557ba0 },
        { label: '粉彩瓷', body: 0xf3eade, ink: 0xbd7784, accent: 0x7a987b },
        { label: '青瓷', body: 0xa9c7b4, ink: 0x7d9e8b, accent: 0x91b09c }
      ][porcelain];
      if (china) {
        surface.label = china.label;
        surface.roughness = porcelain === 2 ? 0.26 : 0.2;
        surface.clearcoat = porcelain === 2 ? 0.65 : 0.8;
      }
      const palette = Object.assign({}, palettes[(potShapeIndex * 2 + pattern % 3) % palettes.length]);
      if (surfaceIndex === 0) palette.body = [0xb77e61, 0xc38b6b, 0xa96f54][pattern % 3];
      if (china) Object.assign(palette, { body: china.body, rim: china.ink, accent: china.accent });
      if (surfaceIndex === 3) palette.body = 0xbcb9a7;
      if (surfaceIndex === 4) palette.body = 0xa5825d;
      if (surfaceIndex === 5) palette.body = 0xb77e5d;
      const rgb = function (color) { return [color >> 16 & 255, color >> 8 & 255, color & 255]; };
      const bodyColor = rgb(palette.body);
      const rimColor = rgb(palette.rim);
      const accentColor = rgb(palette.accent);
      const pixels = new Uint8Array(512 * 256 * 4);
      const relief = new Uint8Array(pixels.length);
      const motif = (potShapeIndex + pattern) % 3;
      for (let y = 0; y < 256; y++) {
        const v = y / 255;
        for (let x = 0; x < 512; x++) {
          const u = x / 512;
          // Pigment sits under the glaze on ceramic only; natural materials keep their own colour.
          const ceramic = surfaceIndex === 1 || surfaceIndex === 2;
          const band = ceramic && v > 0.83 && v < 0.94;
          const dx = ((u * 10) % 1 - 0.5) * 5;
          const dy = (v - 0.885) / 0.032;
          const leaf = dx * dx / 0.36 + (dy + dx * 0.45) ** 2 / 0.18 < 1;
          const blossom = Math.hypot(dx, dy) < 0.42 + Math.cos(Math.atan2(dy, dx) * 5) * 0.09;
          const painted = band && (motif === 0 ? leaf : motif === 1 ? blossom : Math.abs(dy) < 0.16);
          const line = ceramic && (Math.abs(v - 0.825) < 0.003 || Math.abs(v - 0.947) < 0.003);
          let pigment = painted ? rimColor : accentColor;
          let pigmentAmount = painted ? 0.48 : line ? 0.3 : 0;
          if (china) {
            // Continuous scrolling stem with alternating leaves and six-petal floral medallions.
            // All paint is colour only, beneath a smooth glaze, never raised pixel relief.
            const t = u * TAU * 6;
            const stem = 0.47 + Math.sin(t) * 0.065;
            const stemLine = Math.abs(v - stem) < 0.004 && v > 0.31 && v < 0.64;
            const lx = ((u * 12) % 1 - 0.5) * 2;
            const leafCenter = 0.47 + Math.sin(t) * 0.065 + Math.cos(t) * 0.048;
            const ly = (v - leafCenter) / 0.055;
            const leafShape = lx * lx / 0.55 + (ly + lx * 0.65) ** 2 < 1;
            const fx = ((u * 6) % 1 - 0.5) * 2;
            const fy = (v - 0.61) / 0.085;
            const radius = Math.hypot(fx * 1.6, fy);
            const petalEdge = 0.65 + Math.cos(Math.atan2(fy, fx * 1.6) * 6) * 0.18;
            const flowerPaint = radius < petalEdge;
            const outline = flowerPaint && radius > petalEdge - 0.1;
            const rings = [0.13, 0.15, 0.795, 0.815, 0.94].some(function (height) { return Math.abs(v - height) < 0.003; });
            const wave = Math.abs(v - (0.867 + Math.sin(u * TAU * 18) * 0.012)) < 0.003;
            pigmentAmount = 0;
            if (porcelain === 0) {
              pigment = rimColor;
              if (rings || wave || stemLine || leafShape) pigmentAmount = 0.76;
              if (flowerPaint) pigmentAmount = outline ? 0.88 : 0.29 + Math.cos(radius * 22) * 0.07;
            } else if (porcelain === 1) {
              pigment = stemLine || leafShape || rings ? accentColor : rimColor;
              if (rings || wave || stemLine || leafShape) pigmentAmount = 0.58;
              if (flowerPaint) { pigment = rimColor; pigmentAmount = outline ? 0.67 : 0.26 + (1 - radius) * 0.21; }
              if (radius < 0.13) { pigment = [195, 162, 97]; pigmentAmount = 0.7; }
            } else {
              // Restrained carved-flower impression in a single jade-green glaze.
              pigment = rimColor;
              if (rings || stemLine || (leafShape && Math.abs(ly + lx * 0.65) > 0.64) || outline) pigmentAmount = 0.2;
            }
          }
          const color = bodyColor.map(function (channel, i) {
            return channel * (1 - pigmentAmount) + pigment[i] * pigmentAmount;
          });
          // Seamless, low-frequency variation avoids the pixel-noise / embossed-plastic look.
          const cloud = Math.sin(u * TAU * 3 + Math.sin(v * 7 + phase) * 0.6 + phase) * 0.5
            + Math.sin(u * TAU * 7 - v * 9 + phase) * 0.25;
          const fine = Math.sin(u * TAU * 113 + v * 187 + phase)
            * Math.sin(u * TAU * 79 - v * 163 + phase);
          const throwing = Math.sin(v * 285 + Math.sin(u * TAU * 2) * 0.18);
          const grainPhase = u * TAU * 38 + Math.sin(v * 5 + phase) * 0.7
            + Math.sin(u * TAU * 3 + v * 8) * 0.45;
          const grain = Math.sin(grainPhase) * 0.6 + Math.sin(grainPhase * 2) * 0.16;
          let variation = cloud * 0.014;
          let texture = cloud * 0.08 + fine * 0.015;
          if (surfaceIndex === 0) { variation = cloud * 0.035 + fine * 0.009; texture = fine * 0.12 + throwing * 0.12; }
          if (surfaceIndex === 3) { variation = cloud * 0.03 + fine * 0.016; texture = fine * 0.2 + cloud * 0.12; }
          if (surfaceIndex === 4) { variation = cloud * 0.025 + grain * 0.037; texture = grain * 0.18; }
          if (surfaceIndex === 5) { variation = cloud * 0.025 + throwing * 0.004; texture = throwing * 0.06; }
          const shade = 1 + variation;
          const offset = (y * 512 + x) * 4;
          for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = Math.min(255, Math.round(color[channel] * shade));
          pixels[offset + 3] = 255;
          const height = Math.round((0.5 + texture) * 255);
          relief[offset] = relief[offset + 1] = relief[offset + 2] = height;
          relief[offset + 3] = 255;
        }
      }
      const glaze = new THREE.DataTexture(pixels, 512, 256, THREE.RGBAFormat);
      glaze.encoding = THREE.sRGBEncoding;
      glaze.wrapS = THREE.RepeatWrapping;
      glaze.magFilter = THREE.LinearFilter;
      glaze.minFilter = THREE.LinearMipmapLinearFilter;
      glaze.generateMipmaps = true;
      glaze.needsUpdate = true;
      const bumpMap = new THREE.DataTexture(relief, 512, 256, THREE.RGBAFormat);
      bumpMap.wrapS = THREE.RepeatWrapping;
      bumpMap.magFilter = THREE.LinearFilter;
      bumpMap.minFilter = THREE.LinearMipmapLinearFilter;
      bumpMap.generateMipmaps = true;
      bumpMap.needsUpdate = true;
      const clay = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: glaze, bumpMap: bumpMap, bumpScale: surface.bump,
        roughness: surface.roughness, metalness: surface.metalness, clearcoat: surface.clearcoat,
        clearcoatRoughness: 0.25
      });
      clay.name = 'pot-' + surface.label;
      mats.push(clay);
      const materialLabel = !state.modelOnly && document.createElement ? state.overlay.querySelector('.flower3d-itemmeta') : null;
      if (materialLabel) {
        const chip = document.createElement('span');
        chip.className = 'flower3d-meta-chip';
        chip.textContent = surface.label + '花盆';
        materialLabel.appendChild(chip);
      }
      const soilMat = mat({ color: 0x4d392a, roughness: 1 });
      // Cross-sections include the inside wall and base so the rim has real thickness.
      const profiles = [
        [[0, -1.48], [0.55, -1.48], [0.59, -1.43], [0.75, -0.92], [0.8, -0.91], [0.81, -0.8], [0.77, -0.77], [0.72, -0.8], [0.71, -0.92], [0.52, -1.4], [0, -1.4]],
        [[0, -1.48], [0.66, -1.48], [0.72, -1.43], [0.74, -1.3], [0.74, -0.83], [0.72, -0.77], [0.67, -0.77], [0.66, -0.84], [0.65, -1.38], [0, -1.38]],
        [[0, -1.48], [0.57, -1.48], [0.64, -1.42], [0.74, -1.26], [0.77, -0.93], [0.76, -0.8], [0.73, -0.77], [0.69, -0.79], [0.68, -0.94], [0.64, -1.35], [0, -1.38]],
        [[0, -1.48], [0.47, -1.48], [0.49, -1.4], [0.67, -1.34], [0.8, -1.12], [0.79, -0.97], [0.71, -0.85], [0.72, -0.78], [0.68, -0.76], [0.65, -0.8], [0.66, -0.88], [0.73, -1.01], [0.73, -1.13], [0.59, -1.3], [0, -1.38]]
      ];
      const profile = profiles[potShapeIndex].map(function (point) { return new THREE.Vector2(point[0], point[1]); });
      const bodyGeometry = geo(new THREE.LatheGeometry(profile, 64));
      const potPositions = bodyGeometry.attributes.position;
      const potUV = bodyGeometry.attributes.uv;
      for (let i = 0; i < potPositions.count; i++) {
        potUV.setY(i, Math.max(0, Math.min(1, (potPositions.getY(i) + 1.48) / 0.72)));
      }
      if (potShapeIndex === 2) {
        const positions = bodyGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const angle = Math.atan2(positions.getZ(i), positions.getX(i));
          const flute = 1 + Math.cos(angle * 16) * 0.013;
          positions.setX(i, positions.getX(i) * flute);
          positions.setZ(i, positions.getZ(i) * flute);
        }
        bodyGeometry.computeVertexNormals();
      }
      const body = new THREE.Mesh(bodyGeometry, clay);
      root.add(body);
      const saucerProfile = [[0, -1.53], [0.71, -1.53], [0.85, -1.49], [0.86, -1.4], [0.82, -1.4], [0.79, -1.46], [0, -1.47]];
      const saucer = new THREE.Mesh(geo(new THREE.LatheGeometry(saucerProfile.map(function (p) {
        return new THREE.Vector2(p[0], p[1]);
      }), 64)), mat({ color: palette.body, roughness: surface.roughness, metalness: surface.metalness }));
      root.add(saucer);
      const soilRadius = [0.71, 0.65, 0.67, 0.64][potShapeIndex];
      const soil = new THREE.Mesh(geo(new THREE.CylinderGeometry(soilRadius, soilRadius, 0.035, 48)), soilMat);
      soil.position.y = -0.845;
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
    const waxyFoliage = ['gardenia', 'camellia', 'jasmine', 'orchid', 'tulip'].includes(shape);
    const waxyPetals = ['gardenia', 'camellia', 'orchid', 'tulip'].includes(shape);
    const petalRoughness = waxyPetals ? 120 : ['peony', 'carnation', 'rose'].includes(shape) ? 151 : 135;

    function botanicalTexture(leaf) {
      const width = 128, height = 256;
      const colour = new Uint8Array(width * height * 4);
      const relief = new Uint8Array(colour.length);
      const roughness = new Uint8Array(colour.length);
      const rgb = function (hex) {
        const value = parseInt(hex.replace('#', ''), 16);
        return [value >> 16 & 255, value >> 8 & 255, value & 255];
      };
      const base = rgb(leaf ? flower.colors.leaf : flower.colors.petal);
      const deep = rgb(leaf ? flower.colors.stem : flower.colors.petalAlt);
      const tint = variant ? rgb(variant.template.tint) : base;
      const finish = variant ? variant.template.id : '';
      const spotted = ['orchid', 'iris', 'true-lily'].includes(shape);
      const roughnessBase = leaf ? (waxyFoliage ? 81 : 117) : petalRoughness;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u = x / (width - 1), v = y / (height - 1);
          const across = (u - 0.5) * 2;
          const edge = Math.abs(across);
          const central = Math.exp(-edge * (leaf ? 65 : 40));
          const veins = leaf
            ? Math.pow(Math.max(0, Math.cos((v - edge * 0.34) * 86)), 18)
            : Math.pow(Math.max(0, Math.cos((across + Math.sin(v * 6 + phase) * 0.018) * 58 + v * 5)), 10);
          const fine = Math.sin(u * 191 + v * 137 + phase) * Math.sin(u * 71 - v * 257);
          const mottle = Math.sin(across * 17 + Math.sin(v * 12 + phase)) * Math.sin(v * 23 - across * 5 + phase);
          const speckle = Math.pow(Math.max(0, Math.sin(across * 41 + phase) * Math.cos(v * 67 - across * 13)), 12);
          const baseMix = leaf ? 0.19 + edge * 0.17 + (1-v) * 0.24 : 0.14 + Math.pow(1 - v, 1.6) * 0.64;
          const shade = leaf
            ? 0.96 + mottle * 0.025 + veins * 0.034 + central * 0.05 + fine * 0.003
            : 1.00 - veins * (0.011 + (1 - v) * 0.018) + mottle * 0.009 + fine * 0.002;
          let finishMix = 0;
          if (!leaf) {
            if (finish === 'gilded') finishMix = Math.max(0, (edge - 0.76) / 0.24) * 0.78;
            if (finish === 'frost') finishMix = Math.max(0, edge - 0.52) * 0.75 + veins * 0.06;
            if (finish === 'ember') finishMix = Math.pow(1 - v, 3) * 0.68;
            if (finish === 'moon') finishMix = Math.max(0, Math.sin(across * 8 + phase) - 0.45) * v * 0.35;
            if (finish === 'mist') finishMix = speckle * 0.56;
            if (finish === 'celadon') finishMix = (0.5 + Math.sin(v * 12 + across * 5 + phase) * 0.5) * 0.3;
          }
          const spotMix = !leaf && spotted ? speckle * Math.pow(1 - v, 2) * 0.55 : 0;
          const worn = !leaf ? Math.max(0, wear - 0.42) * Math.pow(edge, 4) * v * 0.34 : wear * edge * 0.015;
          const offset = (y * width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            let value = (base[channel] * (1 - baseMix) + deep[channel] * baseMix) * shade;
            value = value * (1 - finishMix) + tint[channel] * finishMix;
            value = value * (1 - spotMix) + deep[channel] * 0.68 * spotMix;
            value = value * (1 - worn) + [144, 108, 67][channel] * worn;
            colour[offset + channel] = Math.max(0, Math.min(255, Math.round(value)));
            relief[offset + channel] = Math.round(128 + central * (leaf ? 18 : 2) + veins * (leaf ? 7 : 3) + fine * 0.5);
            roughness[offset + channel] = Math.round(roughnessBase + mottle * 3 + veins * 2 + worn * 18);
          }
          colour[offset + 3] = relief[offset + 3] = roughness[offset + 3] = 255;
        }
      }
      function texture(pixels, isColour) {
        const map = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
        if (isColour) map.encoding = THREE.sRGBEncoding;
        map.magFilter = THREE.LinearFilter;
        map.minFilter = THREE.LinearMipmapLinearFilter;
        map.generateMipmaps = true;
        map.needsUpdate = true;
        return map;
      }
      return { colour: texture(colour, true), bump: texture(relief, false), roughness: texture(roughness, false) };
    }
    const leafTexture = botanicalTexture(true);
    const petalTexture = botanicalTexture(false);
    const leafMat = new THREE.MeshPhysicalMaterial({
      name: 'botanical-leaf', color: 0xffffff, vertexColors: false, roughness: 1,
      metalness: 0, clearcoat: waxyFoliage ? 0.19 : 0.07, clearcoatRoughness: 0.34,
      specularIntensity: waxyFoliage ? 0.48 : 0.35,
      map: leafTexture.colour, roughnessMap: leafTexture.roughness,
      bumpMap: leafTexture.bump, bumpScale: 0.00065, side: THREE.DoubleSide
    });
    mats.push(leafMat);
    const veinMat = mat({ color: flower.colors.leaf, roughness: 0.82 });
    const petalMat = new THREE.MeshPhysicalMaterial({
      name: 'botanical-petal', color: 0xffffff, vertexColors: false, roughness: 1,
      metalness: 0, clearcoat: 0, sheen: waxyPetals ? 0.12 : 0.25,
      sheenColor: new THREE.Color(flower.colors.petal),
      sheenRoughness: 0.65, specularIntensity: waxyPetals ? 0.38 : 0.30,
      map: petalTexture.colour, roughnessMap: petalTexture.roughness,
      bumpMap: petalTexture.bump, bumpScale: 0.00024, side: THREE.DoubleSide
    });
    mats.push(petalMat);
    const greenMat = mat({ color: flower.colors.leaf, roughness: 0.9, side: THREE.DoubleSide });
    const greenDark = mat({ color: flower.colors.stem, roughness: 0.92, side: THREE.DoubleSide });
    const centerMat = mat({ color: flower.colors.center, roughness: 0.76 });
    const centerAltMat = mat({ color: flower.colors.centerAlt, roughness: 0.9 });

    const root = new THREE.Group();
    root.name = 'flower-model-' + flower.id;
    root.userData.species = flower.id;
    root.userData.modelId = form.modelId;
    root.userData.quality = form.grade;
    root.userData.flowerForm = form.label;
    scene.add(root);
    addPot(root);
    if (stage === 'seed') {
      addSeed(root);
    }

    let plant = null;
    let swayTarget = null;
    let insectPerch = null;
    if (stage !== 'seed') {
      plant = new THREE.Group();
      plant.position.y = -0.82;
      root.add(plant);
      swayTarget = plant;

      const heights = { daisy: 1.28, tulip: 1.5, hyacinth: 1.3, rose: 1.12, sunflower: 1.68, hydrangea: 1.18, lily: 1.32, cosmos: 1.48, carnation: 1.4, peony: 1.22, iris: 1.6, orchid: 1.48 };
      const fullTop = (heights[shape] || 1.3) * (1 + Math.sin(phase) * 0.035) * form.height;
      const stageScale = stage === 'sprout' ? 0.34 : stage === 'bud' ? 0.8 : 1;
      const top = fullTop * stageScale;
      const bendBase = shape === 'lily' ? 0.32 : shape === 'hyacinth' ? 0.14 : 0.08;
      const bend = bendBase * stageScale * form.bend;
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
      leafSets.cosmos = [[0.15, 2.2, -1.1, 0.62, 0.055], [0.32, 0.5, 1.1, 0.58, 0.05], [0.5, 3.6, -1, 0.44, 0.045]];
      leafSets.carnation = [[0.15, 2.1, -0.8, 0.6, 0.045], [0.35, 3.6, 0.85, 0.55, 0.04], [0.6, 0.5, -0.8, 0.42, 0.04]];
      leafSets.peony = [[0.2, 2.1, -0.9, 0.58, 0.23], [0.38, 3.6, 0.9, 0.52, 0.21], [0.5, 0.6, -0.85, 0.46, 0.19]];
      leafSets.iris = [[0.02, 2.3, -0.32, 1.28, 0.075], [0.02, 3.7, 0.32, 1.18, 0.07], [0.1, 0.5, -0.4, 0.92, 0.065]];
      leafSets.orchid = [[0.02, 2.2, -1.1, 0.86, 0.27], [0.02, 3.7, 1.1, 0.82, 0.26], [0.05, 0.55, -1.25, 0.68, 0.23]];
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
        leafGroup.rotation.z = spec[2] + Math.sign(spec[2]) * form.leafLift;
        leafGroup.rotation.x = 0.12 + form.leafLift;
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
          pivot.rotation.y = (i / count) * TAU + (options.offset || 0) + phase * 0.08;
          const petal = new THREE.Mesh(petals.geometry, petals.material);
          petal.rotation.x = options.tilt + form.opening + Math.sin(i * 2.7) * 0.035 + wear * 0.34;
          petal.rotation.z = Math.sin(i * 1.9 + (options.offset || 0)) * 0.035;
          const variation = 0.95 + Math.sin(i * 2.7 + phase) * 0.045;
          petal.scale.set(options.scale * variation * (1 - wear * 0.06), options.scale, options.scale);
          petal.position.y = options.y || 0;
          pivot.add(petal);
          parent.add(pivot);
        }
      }

      const headPosition = curve.getPoint(1);
      headPosition.y += 0.015;

      function setInsectPerch(parent, x, y, z) {
        insectPerch = new THREE.Object3D();
        insectPerch.position.set(x, y, z);
        parent.add(insectPerch);
      }

      function buildDisc(big, geometry) {
        const head = new THREE.Group();
        head.position.copy(headPosition);
        head.rotation.x = big ? 0.4 : 0.34;
        plant.add(head);
        addCalyx(head, -0.035, big ? 1.25 : 1);
        const outerGeo = geo(paint(petalGeometry(big ? 1.1 : 0.8, big ? 0.22 : 0.18, geometry || (big ? 'pointed' : 'round')), flower.colors.centerAlt, flower.colors.petal));
        const innerGeo = geo(paint(petalGeometry(big ? 0.86 : 0.62, big ? 0.2 : 0.17, 'round'), flower.colors.petalAlt, flower.colors.petal));
        const outer = { geometry: outerGeo, material: petalMat };
        const inner = { geometry: innerGeo, material: petalMat };
        for (let ring = 0; ring < (form.rings || 1); ring++) {
          addPetalRing(head, ring === 0 ? outer : inner, {
            count: Math.max(shape === 'true-lily' ? 6 : 8, (form.petals || 6) - ring * 4), tilt: 1.34 - ring * 0.13,
            scale: 1 - ring * 0.12, offset: 0.1 + ring * 0.19, y: ring * 0.038
          });
        }
        addCenter(head, big ? 0.48 : 0.29, big ? 74 : 28, 0.05);
        setInsectPerch(head, 0.08, 0.19, 0.04);
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
        layers.push({ count: 7, len: 0.5, width: 0.33, tilt: 0.62, scale: 0.92, y: 0.14, offset: 0.85, colors: [flower.colors.petalAlt, flower.colors.petal] });
        layers.slice(0, form.layers).forEach(function (layer) {
          const petal = {
            geometry: geo(paint(petalGeometry(layer.len, layer.width, 'wide'), layer.colors[0], layer.colors[1])),
            material: petalMat
          };
          addPetalRing(head, petal, layer);
        });
        const spiralPetal = { geometry: geo(paint(petalGeometry(0.3, 0.19, 'wide'), flower.colors.petalAlt, flower.colors.petal)), material: petalMat };
        for (let i = 0; i < form.core; i++) {
          addPetalRing(head, spiralPetal, { count: 3, tilt: 0.24 + i * 0.06, scale: 0.55 + i * 0.08, y: 0.17 + i * 0.012, offset: i * 0.8 });
        }
        const bud = new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 16, 12)), centerAltMat);
        bud.scale.y = 0.84;
        bud.position.y = 0.18;
        head.add(bud);
        setInsectPerch(head, 0.05, 0.34, 0.02);
      }

      function buildTulip() {
        const head = new THREE.Group();
        head.position.copy(headPosition);
        head.rotation.x = 0.02;
        plant.add(head);
        addCalyx(head, -0.025, 0.9);
        const petal = {
          geometry: geo(paint(petalGeometry(0.94, 0.38, form.kind), flower.colors.petalAlt, flower.colors.petal)),
          material: petalMat
        };
        for (let ring = 0; ring < form.rings; ring++) {
          addPetalRing(head, petal, { count: 3, tilt: form.tilt - ring * 0.07,
            scale: 1 - ring * 0.11, offset: ring * Math.PI / 3 + 0.1, y: ring * 0.025 });
        }

        for (let i = 0; i < 6; i += 1) {
          const stamen = new THREE.Mesh(geo(new THREE.SphereGeometry(0.026, 8, 6)), mat({ color: flower.colors.accent, roughness: 0.7 }));
          const angle = (i / 6) * TAU;
          stamen.position.set(Math.cos(angle) * 0.05, 0.11, Math.sin(angle) * 0.05);
          head.add(stamen);
        }
        setInsectPerch(head, 0.25, 0.82, 0.08);
      }

      const floretCache = new Map();
      function makeFloret(size, petalColors) {
        const group = new THREE.Group();
        const key = size + petalColors.join('');
        if (!floretCache.has(key)) {
          floretCache.set(key, {
            geometry: geo(paint(petalGeometry(size, size * 0.64, 'wide'), flower.colors.petalAlt, flower.colors.petal)),
            materials: petalColors.map(function (color) {
              const material = petalMat.clone();
              // The diffuse map already contains pigment; multiplying it by the petal colour twice makes it muddy.
              material.color.set(0xffffff);
              material.vertexColors = false;
              mats.push(material);
              return material;
            }),
            center: geo(new THREE.SphereGeometry(size * 0.15, 6, 4))
          });
        }
        const cached = floretCache.get(key);
        for (let i = 0; i < (form.double ? 8 : 4); i += 1) {
          const petal = new THREE.Mesh(cached.geometry, cached.materials[i % 2]);
          petal.rotation.z = (i / 4) * TAU + (i >= 4 ? Math.PI / 4 : 0);
          petal.rotation.x = wear * 0.38;
          petal.scale.setScalar(i >= 4 ? 0.72 : 1);
          if (i >= 4) petal.position.z = 0.015;
          group.add(petal);
        }
        const center = new THREE.Mesh(cached.center, centerMat);
        center.position.z = 0.02;
        group.add(center);
        return group;
      }

      function buildHydrangea() {
        const head = new THREE.Group();
        head.position.copy(headPosition);
        plant.add(head);
        const batches = new Map();
        const count = form.florets;
        const radius = 0.62;
        for (let i = 0; i < count; i += 1) {
          const y = 1 - (i / (count - 1)) * 2;
          const ring = Math.sqrt(Math.max(0, 1 - y * y));
          const angle = i * 2.399963;
          const point = new THREE.Vector3(Math.cos(angle) * ring * radius, y * radius * form.roundness, Math.sin(angle) * ring * radius);
          const floret = makeFloret(0.23, i % 3 === 0 ? [flower.colors.center, flower.colors.petal] : [flower.colors.petal, flower.colors.petalAlt]);
          floret.position.copy(point);
          floret.lookAt(point.clone().multiplyScalar(2));
          floret.updateMatrix();
          floret.children.forEach(function (mesh) {
            mesh.updateMatrix();
            const key = mesh.geometry.id + ':' + mesh.material.id;
            if (!batches.has(key)) batches.set(key, { geometry: mesh.geometry, material: mesh.material, matrices: [] });
            batches.get(key).matrices.push(new THREE.Matrix4().multiplyMatrices(floret.matrix, mesh.matrix));
          });
        }
        batches.forEach(function (batch) {
          const blooms = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
          batch.matrices.forEach(function (matrix, index) { blooms.setMatrixAt(index, matrix); });
          head.add(blooms);
        });
        setInsectPerch(head, 0.05, radius * form.roundness + 0.09, 0.04);
      }

      function buildHyacinth() {
        const cluster = new THREE.Group();
        plant.add(cluster);
        const count = form.florets;
        for (let i = 0; i < count; i += 1) {
          const t = 0.4 + (i / (count - 1)) * 0.58;
          const center = curve.getPoint(t);
          const angle = i * 2.399963 + 0.4;
          const ring = 0.27 * (1 - t * 0.55) * form.spread;
          const outward = new THREE.Vector3(Math.cos(angle), 0.18, Math.sin(angle)).normalize();
          const floret = makeBell(0.2);
          floret.position.copy(center).addScaledVector(outward, ring);
          floret.lookAt(floret.position.clone().add(outward));
          floret.rotateX(-Math.PI / 2);
          cluster.add(floret);
        }
        const tip = new THREE.Mesh(geo(new THREE.ConeGeometry(0.055, 0.28, 8)), greenDark);
        tip.position.copy(headPosition);
        tip.position.y += 0.1;
        cluster.add(tip);
        const perch = curve.getPoint(0.86);
        setInsectPerch(cluster, perch.x + 0.15, perch.y, perch.z + 0.05);
      }

      let bellGeometry = null;
      function makeBell(size) {
        const group = new THREE.Group();
        if (!bellGeometry) {
          const points = [];
          for (let i = 0; i <= 16; i++) {
            const t = i / 16;
            points.push(new THREE.Vector2(0.09 + Math.sin(t * Math.PI * 0.68) * 0.4, -t));
          }
          bellGeometry = geo(new THREE.LatheGeometry(points, 24));
          const positions = bellGeometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const t = Math.max(0, -positions.getY(i));
            const angle = Math.atan2(positions.getZ(i), positions.getX(i));
            const scallop = Math.cos(angle * (shape === 'lily' ? 5 : 6));
            const flare = Math.pow(t, 8);
            positions.setXYZ(i,
              positions.getX(i) * (1 + flare * 0.24 * form.cup),
              positions.getY(i) + flare * scallop * 0.1 * form.curl,
              positions.getZ(i) * (1 + flare * 0.24 * form.cup));
          }
          bellGeometry.computeVertexNormals();
          bellGeometry.userData.botanical = 'petal';
          paint(bellGeometry, flower.colors.petal, flower.colors.petalAlt);
        }
        const bell = new THREE.Mesh(bellGeometry, petalMat);
        bell.scale.setScalar(size);
        group.add(bell);
        if (form.double) {
          const inner = new THREE.Mesh(bellGeometry, petalMat);
          inner.scale.setScalar(size * 0.82);
          inner.rotation.y = Math.PI / 6;
          inner.position.y = -size * 0.12;
          group.add(inner);
        }
        return group;
      }

      function buildLily() {
        const count = form.bells;
        for (let i = 0; i < count; i += 1) {
          const t = 0.38 + i / (count - 1) * 0.53;
          const anchor = curve.getPoint(t);
          const side = i % 2 === 0 ? 1 : -1;
          const bell = makeBell((i === count - 1 ? 0.24 : 0.34) * form.bellSize);
          bell.position.set(anchor.x + side * 0.2 * form.spread, anchor.y - 0.04, anchor.z + (i % 3 === 0 ? 0.1 : -0.06));
          bell.rotation.z = side * 0.38;
          bell.rotation.y = i * 0.7;
          plant.add(bell);
          const pedicel = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.009, 0.012, 0.22, 4)), greenDark);
          pedicel.position.set(anchor.x + side * 0.09, anchor.y + 0.005, anchor.z);
          pedicel.rotation.z = side * 0.9;
          plant.add(pedicel);
          if (i === count - 2) setInsectPerch(plant, bell.position.x, bell.position.y - 0.08, bell.position.z);
        }
      }

      function buildLayeredFlower(carnation) {
        const head = new THREE.Group();
        head.name = carnation ? 'carnation-ruffled-head' : 'peony-layered-head';
        head.position.copy(headPosition);
        head.rotation.x = 0.16;
        plant.add(head);
        addCalyx(head, -0.04, carnation ? 0.85 : 1.2);
        const layers = form.layers;
        for (let layer = 0; layer < layers; layer++) {
          const length = (carnation ? 0.66 : 0.94) * (1 - layer * 0.105);
          const petals = {
            geometry: geo(paint(petalGeometry(length, length * (carnation ? 0.54 : 0.64), carnation ? 'ruffled' : 'wide'),
              layer % 2 ? flower.colors.petal : flower.colors.petalAlt, flower.colors.petal)),
            material: petalMat
          };
          addPetalRing(head, petals, { count: carnation ? 11 - layer : 12 - layer,
            tilt: (carnation ? 1.12 : 1.32) - layer * 0.17, scale: 1,
            y: layer * 0.045, offset: layer * 0.43 });
        }
        addCenter(head, carnation ? 0.09 : 0.15, 16, 0.25);
        setInsectPerch(head, 0.1, 0.36, 0.06);
      }

      function buildCosmos() {
        const head = new THREE.Group();
        head.name = 'cosmos-eight-petal-head';
        head.position.copy(headPosition);
        head.rotation.x = 0.3;
        plant.add(head);
        addCalyx(head, -0.04, 0.7);
        const petals = { geometry: geo(paint(petalGeometry(0.85, 0.32, 'wide'), flower.colors.petalAlt, flower.colors.petal)), material: petalMat };
        for (let ring = 0; ring < form.rings; ring++) {
          addPetalRing(head, petals, { count: form.petals, tilt: 1.35 - ring * 0.16,
            scale: 1 - ring * 0.16, offset: 0.12 + ring * 0.3, y: ring * 0.035 });
        }
        addCenter(head, 0.21, 36, 0.025);
        // Divided foliage branches in pairs along the slender stem.
        for (let i = 0; i < 8; i++) {
          const needle = new THREE.Mesh(geo(paint(leafGeometry(0.26, 0.018), flower.colors.stem, flower.colors.leaf)), leafMat);
          needle.position.copy(curve.getPoint(0.16 + Math.floor(i / 2) * 0.09));
          needle.rotation.z = (i % 2 ? 1 : -1) * 1.15;
          needle.rotation.y = i * 0.8;
          plant.add(needle);
        }
        setInsectPerch(head, 0.03, 0.14, 0);
      }

      function buildIris() {
        const head = new THREE.Group();
        head.name = 'iris-standards-and-falls';
        head.position.copy(headPosition);
        plant.add(head);
        const standards = { geometry: geo(paint(petalGeometry(0.86, 0.24, 'wide'), flower.colors.petalAlt, flower.colors.petal)), material: petalMat };
        const falls = { geometry: geo(paint(petalGeometry(0.94, 0.3, 'wide'), flower.colors.centerAlt, flower.colors.petal)), material: petalMat };
        addPetalRing(head, standards, { count: 3, tilt: form.standard, scale: 1, offset: 0.05 });
        addPetalRing(head, falls, { count: 3, tilt: form.fall, scale: 1, offset: Math.PI / 3 + 0.05, y: 0.08 });
        const beard = { geometry: geo(paint(petalGeometry(0.36, 0.04, 'pointed'), flower.colors.centerAlt, flower.colors.center)), material: petalMat };
        addPetalRing(head, beard, { count: 3, tilt: form.fall, scale: 1, offset: Math.PI / 3 + 0.05, y: 0.105 });
        setInsectPerch(head, 0.08, 0.2, 0.15);
      }

      function buildOrchid() {
        const petalGeo = geo(paint(petalGeometry(0.62, 0.36, 'wide'), flower.colors.petalAlt, flower.colors.petal));
        const sepalGeo = geo(paint(petalGeometry(0.67, 0.19, 'pointed'), flower.colors.petalAlt, flower.colors.petal));
        const lipGeo = geo(paint(petalGeometry(0.34, 0.2, 'ruffled'), flower.colors.centerAlt, flower.colors.center));
        for (let i = 0; i < form.blooms; i++) {
          const head = new THREE.Group();
          head.name = 'orchid-flower-' + i;
          head.position.copy(curve.getPoint(0.55 + i / (form.blooms - 1) * 0.43));
          head.position.x += (i % 2 ? -1 : 1) * 0.32;
          head.rotation.set(1.1, 0, (i - 1) * 0.3);
          head.scale.setScalar(0.7 - i * 0.035);
          plant.add(head);
          addPetalRing(head, { geometry: sepalGeo, material: petalMat }, { count: 3, tilt: 1.28, scale: 1, offset: 0.03 });
          for (let side = -1; side <= 1; side += 2) {
            const petal = new THREE.Mesh(petalGeo, petalMat);
            petal.rotation.set(1.32, 0, side * 1.03);
            head.add(petal);
          }
          const lip = new THREE.Mesh(lipGeo, petalMat);
          lip.scale.setScalar(form.lip);
          lip.rotation.set(-0.7, 0, Math.PI);
          lip.position.set(0, 0.04, 0.08);
          head.add(lip);
          const column = new THREE.Mesh(geo(new THREE.SphereGeometry(0.065, 12, 8)), centerMat);
          column.position.y = 0.06;
          head.add(column);
          if (i === Math.min(2, form.blooms - 1)) setInsectPerch(head, 0, 0.14, 0.05);
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
      } else if (shape === 'cosmos') {
        buildCosmos();
      } else if (shape === 'carnation' || shape === 'peony') {
        buildLayeredFlower(shape === 'carnation');
      } else if (shape === 'iris') {
        buildIris();
      } else if (shape === 'orchid') {
        buildOrchid();
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
      } else if (shape === 'true-lily') {
        buildDisc(false, 'pointed');
      } else {
        buildDisc(false);
      }
    }

    if (stage === 'bloom' && plant && window.FlowerAssets && THREE.GLTFLoader) {
      let cancelled = false;
      state.cleanup.push(function () { cancelled = true; });
      state.assetReady = window.FlowerAssets.load(THREE, flower.id, form.grade, {
        petal: petalMat, leaf: leafMat, stem: greenDark, center: centerMat, pollen: centerAltMat
      }).then(function (asset) {
        if (cancelled || state.disposed) { window.FlowerAssets.dispose(asset); return; }
        // Keep visiting insects attached while replacing the botanical geometry.
        if (insectPerch) plant.attach(insectPerch);
        const replaced = new Set();
        plant.children.slice().forEach(function (child) {
          if (child === insectPerch) return;
          child.traverse(function (mesh) { if (mesh.geometry) replaced.add(mesh.geometry); });
          plant.remove(child);
        });
        replaced.forEach(function (geometry) { geometry.dispose(); });
        for (let i = geos.length - 1; i >= 0; i--) { if (replaced.has(geos[i])) geos.splice(i, 1); }
        plant.add(asset);
        asset.traverse(function (mesh) { if (mesh.geometry) geos.push(mesh.geometry); });
        root.userData.modelId = asset.userData.modelId;
        root.userData.assetSource = 'Blender';
      }).catch(function () { /* Keep the current preview if offline or an asset fails. */ });
    }

    if (state.modelOnly) return root;

    // Roll once per preview. Only one visitor can appear, after a quiet delay.
    let visitor = null;
    let visitorTime = 0;
    let visitorDelay = 0;
    let visitorWings = [];
    let approachPath = null;
    let departurePath = null;
    let visitorKind = '';
    if (insectPerch && stage === 'bloom' && !reduced && Math.random() < 0.08) {
      const kinds = ['honeybee', 'bumblebee', 'hoverfly', 'butterfly', 'cabbage-white', 'ladybird', 'dragonfly'];
      visitorKind = kinds[Math.floor(Math.random() * kinds.length)];
      visitorDelay = 4 + Math.random() * 8;
      visitor = new THREE.Group();
      visitor.name = 'flower-visitor';
      visitor.userData.kind = visitorKind;
      visitor.visible = false;
      insectPerch.add(visitor);
      const sphere = geo(new THREE.SphereGeometry(1, 10, 8));
      const dark = mat({ color: 0x292921, roughness: 0.65 });
      const golden = mat({ color: visitorKind === 'bumblebee' ? 0xcda54b : 0xe5b143, roughness: 0.85 });
      const wingMaterial = mat({
        color: 0xe9f4ee, transparent: true, opacity: 0.48,
        roughness: 0.3, side: THREE.DoubleSide, depthWrite: false
      });
      function oval(parent, material, x, y, z, width, height, length) {
        const mesh = new THREE.Mesh(sphere, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(width, height, length);
        parent.add(mesh);
        return mesh;
      }
      const butterfly = visitorKind === 'butterfly' || visitorKind === 'cabbage-white';
      const dragonfly = visitorKind === 'dragonfly';
      const ladybird = visitorKind === 'ladybird';
      const bodyMaterial = dragonfly ? mat({ color: 0x438f9f, metalness: 0.35, roughness: 0.32 }) : dark;
      oval(visitor, bodyMaterial, 0, 0.08, -0.045, dragonfly ? 0.027 : 0.065, dragonfly ? 0.027 : 0.06, dragonfly ? 0.23 : 0.12);
      oval(visitor, dark, 0, 0.085, 0.12, dragonfly ? 0.062 : 0.048, 0.045, 0.047);
      if (!butterfly && !dragonfly && !ladybird) {
        const stripeGeometry = geo(new THREE.TorusGeometry(0.056, visitorKind === 'bumblebee' ? 0.022 : 0.013, 6, 16));
        for (let i = 0; i < 3; i++) {
          const stripe = new THREE.Mesh(stripeGeometry, golden);
          stripe.position.set(0, 0.08, -0.1 + i * 0.065);
          visitor.add(stripe);
        }
        if (visitorKind === 'bumblebee') visitor.scale.setScalar(1.2);
        if (visitorKind === 'hoverfly') visitor.scale.set(0.75, 0.8, 1.15);
      }
      for (let side = -1; side <= 1; side += 2) {
        oval(visitor, dark, side * 0.025, 0.14, 0.17, 0.005, 0.005, 0.043).rotation.x = -0.55;
        for (let leg = 0; leg < 3; leg++) {
          oval(visitor, dark, side * 0.06, 0.035, -0.07 + leg * 0.06, 0.054, 0.006, 0.007).rotation.z = side * 0.45;
        }
        const wing = new THREE.Group();
        wing.position.set(side * 0.035, 0.11, 0.01);
        visitor.add(wing);
        visitorWings.push({ group: wing, side: side });
        if (butterfly) {
          const color = mat({ color: visitorKind === 'cabbage-white' ? 0xf5f1cf : 0xd89045, roughness: 0.65, side: THREE.DoubleSide });
          oval(wing, dark, side * 0.15, 0, 0.04, 0.18, 0.012, 0.145);
          oval(wing, color, side * 0.15, 0.006, 0.04, 0.161, 0.011, 0.13);
          oval(wing, color, side * 0.12, 0, -0.13, 0.12, 0.013, 0.115);
          for (let dot = 0; dot < 3; dot++) {
            oval(wing, dark, side * (0.19 + dot * 0.035), 0.019, 0.04, 0.012, 0.004, 0.019);
          }
        } else if (ladybird) {
          const red = mat({ color: 0xb94b3f, roughness: 0.3 });
          oval(wing, red, side * 0.024, 0, -0.03, 0.045, 0.045, 0.093);
          for (let dot = 0; dot < 3; dot++) {
            oval(wing, dark, side * 0.038, 0.039, -0.08 + dot * 0.05, 0.013, 0.006, 0.014);
          }
        } else {
          oval(wing, wingMaterial, side * (dragonfly ? 0.19 : 0.11), 0, 0.025, dragonfly ? 0.22 : 0.135, 0.006, dragonfly ? 0.045 : 0.075);
          if (dragonfly) oval(wing, wingMaterial, side * 0.18, 0, -0.08, 0.2, 0.006, 0.04);
        }
      }
      approachPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.8, 1.2, 1.1), new THREE.Vector3(-1.1, 0.55, 0.8),
        new THREE.Vector3(0.35, 0.28, 0.4), new THREE.Vector3(0, 0.015, 0)
      ]);
      departurePath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.015, 0), new THREE.Vector3(0.25, 0.38, 0.15),
        new THREE.Vector3(1.4, 0.7, -0.4), new THREE.Vector3(3.1, 1.4, -1.5)
      ]);
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
      if (visitor && document.visibilityState !== 'hidden') {
        visitorTime += delta;
        const elapsed = visitorTime - visitorDelay;
        visitor.visible = elapsed >= 0 && elapsed < 13;
        if (visitor.visible) {
          const landing = elapsed >= 4 && elapsed < 9;
          if (landing) {
            visitor.position.set(0, 0.015, 0);
            visitor.rotation.y += Math.sin((elapsed - 4) * 0.8) * delta * 0.08;
          } else {
            const path = elapsed < 4 ? approachPath : departurePath;
            const progress = elapsed < 4 ? elapsed / 4 : (elapsed - 9) / 4;
            visitor.position.copy(path.getPoint(progress));
            const tangent = path.getTangent(progress);
            const turn = Math.atan2(tangent.x, tangent.z) - visitor.rotation.y;
            visitor.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, delta * 7);
          }
          visitorWings.forEach(function (wing) {
            const slow = visitorKind === 'butterfly' || visitorKind === 'cabbage-white';
            const flutter = Math.sin(elapsed * (slow ? 18 : 110));
            wing.group.rotation.z = wing.side * (landing ? slow ? 0.35 + Math.sin(elapsed * 2) * 0.12 : 0.06 : 0.3 + flutter * 0.75);
          });
        }
      }
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
    openItem: openItem,
    openShelf: openShelf,
    close: closeViewer
  };
})();
