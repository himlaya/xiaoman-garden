/* 小满花园 · 唯一物品
 * 种子和成品花束都有独立 ID、品级、品相、模板与培育履历。
 * 3D 视图只读取这里存下来的字段，保证同一件物品每次看起来一样。
 */
(function () {
  'use strict';

  const DATA = window.GameData;
  const GRADES = DATA.itemGrades || [];
  const TEMPLATES = DATA.itemTemplates || [];
  const WEAR_BANDS = DATA.wearBands || [];
  const MARKET = DATA.market || { minPrice: 1, maxPrice: 99999 };
  const GRADES_BY_ID = {};
  const TEMPLATES_BY_ID = {};
  GRADES.forEach(function (grade) { GRADES_BY_ID[grade.id] = grade; });
  TEMPLATES.forEach(function (template) { TEMPLATES_BY_ID[template.id] = template; });

  let localSequence = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return 'itm_' + window.crypto.randomUUID();
    }
    localSequence += 1;
    return 'itm_' + Date.now().toString(36) + '_' + localSequence.toString(36) + '_' + randomInt(0xffffff).toString(36);
  }

  function weightedPick(entries, booster) {
    const boost = Math.max(0, Math.min(0.35, Number(booster) || 0));
    let total = 0;
    const weights = entries.map(function (entry, index) {
      const weight = Math.max(0, Number(entry.weight) || 0) * (1 + boost * index);
      total += weight;
      return weight;
    });
    if (!total) return entries[0];
    let roll = Math.random() * total;
    for (let i = 0; i < entries.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return entries[i];
    }
    return entries[entries.length - 1];
  }

  function gradeById(id) {
    return GRADES_BY_ID[id] || GRADES[0] || { id: 'common', label: '普通', multiplier: 1, color: '#8b9a82' };
  }

  function templateById(id) {
    return TEMPLATES_BY_ID[id] || TEMPLATES[0] || { id: 'dawn', label: '晨曦', tint: '#f2d39a' };
  }

  function templateWeight(id) {
    const template = templateById(id);
    return Number(template.weight) || 15;
  }

  function rollGrade(boost) {
    return weightedPick(GRADES, boost).id;
  }

  function rollTemplate() {
    return weightedPick(TEMPLATES, 0).id;
  }

  function seedWear() {
    return Math.round((0.015 + Math.random() * 0.26) * 1000) / 1000;
  }

  function bouquetWear(fresh, careScore) {
    const ratio = Number(fresh && fresh.ratio) || 0;
    const care = clamp(Number(careScore) || 0, 0, 100);
    const value = 0.13 + ratio * 0.34 + (Math.random() - 0.5) * 0.08 - care * 0.0005;
    return Math.round(clamp(value, 0.01, 0.96) * 1000) / 1000;
  }

  function wearBand(wear, kind) {
    const value = Number(wear) || 0;
    const found = WEAR_BANDS.find(function (band) { return value < band.max; }) || WEAR_BANDS[WEAR_BANDS.length - 1] || {};
    return {
      label: kind === 'seed' ? (found.seedLabel || found.label || '完好') : (found.label || '盛放'),
      color: found.color || '#70905f',
      max: found.max || 1
    };
  }

  function normalizeProvenance(raw) {
    const provenance = raw && typeof raw === 'object' ? raw : {};
    return {
      grower: typeof provenance.grower === 'string' ? Array.from(provenance.grower).slice(0, 12).join('') : '小园丁',
      source: ['start', 'shop', 'checkin', 'bonus', 'harvest', 'market'].includes(provenance.source) ? provenance.source : 'harvest',
      acquiredAt: Number(provenance.acquiredAt) || Date.now(),
      grownAt: Number(provenance.grownAt) || null,
      seedId: typeof provenance.seedId === 'string' ? provenance.seedId : null,
      careScore: clamp(Number(provenance.careScore) || 0, 0, 100),
      fresh: typeof provenance.fresh === 'string' ? provenance.fresh : null,
      freshMultiplier: Number(provenance.freshMultiplier) || null
    };
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const kind = raw.kind === 'bouquet' ? 'bouquet' : 'seed';
    const flowerId = typeof raw.flowerId === 'string' ? raw.flowerId : null;
    if (!flowerId || !DATA.flowerMap[flowerId]) return null;
    const grade = gradeById(raw.grade);
    const template = templateById(raw.templateId);
    return {
      id: typeof raw.id === 'string' && raw.id.length >= 5 ? raw.id : makeId(),
      kind: kind,
      flowerId: flowerId,
      grade: grade.id,
      templateId: template.id,
      patternSeed: (Number(raw.patternSeed) >>> 0) || randomInt(0xffffffff),
      wear: Math.round(clamp(Number(raw.wear) || 0, 0, 1) * 1000) / 1000,
      createdAt: Number(raw.createdAt) || Date.now(),
      provenance: normalizeProvenance(raw.provenance)
    };
  }

  function createSeed(flowerId, options) {
    const opts = options || {};
    if (!DATA.flowerMap[flowerId]) return null;
    const grade = opts.grade && GRADES_BY_ID[opts.grade] ? opts.grade : rollGrade(opts.gradeBoost || 0);
    const templateId = opts.templateId && TEMPLATES_BY_ID[opts.templateId] ? opts.templateId : rollTemplate();
    const item = normalizeItem({
      id: opts.id,
      kind: 'seed',
      flowerId: flowerId,
      grade: grade,
      templateId: templateId,
      patternSeed: opts.patternSeed,
      wear: opts.wear,
      createdAt: opts.createdAt,
      provenance: {
        grower: opts.grower || '小园丁',
        source: opts.source || 'shop',
        acquiredAt: opts.acquiredAt || Date.now()
      }
    });
    return item;
  }

  function createBouquet(flower, plant, fresh, options) {
    const opts = options || {};
    const seed = opts.seed || null;
    const careScore = clamp(Number(plant && plant.careScore) || 0, 0, 100);
    const seedGrade = seed ? gradeById(seed.grade) : null;
    const seedIndex = seedGrade ? Math.max(0, GRADES.findIndex(function (grade) { return grade.id === seedGrade.id; })) : 0;
    const boost = clamp(0.04 + careScore / 100 * 0.14 + Math.max(0, 0.25 - (Number(fresh && fresh.ratio) || 0) * 0.1) + seedIndex * 0.025, 0, 0.32);
    const grade = opts.grade && GRADES_BY_ID[opts.grade] ? opts.grade : rollGrade(boost);
    const templateId = seed ? seed.templateId : (opts.templateId || rollTemplate());
    const patternSeed = seed ? seed.patternSeed : (opts.patternSeed || randomInt(0xffffffff));
    const now = Date.now();
    return normalizeItem({
      id: opts.id,
      kind: 'bouquet',
      flowerId: flower.id,
      grade: grade,
      templateId: templateId,
      patternSeed: patternSeed,
      wear: typeof opts.wear === 'number' ? opts.wear : bouquetWear(fresh, careScore),
      createdAt: now,
      provenance: {
        grower: opts.grower || '小园丁',
        source: 'harvest',
        acquiredAt: now,
        grownAt: now,
        seedId: seed ? seed.id : null,
        careScore: careScore,
        fresh: fresh ? fresh.label : null,
        freshMultiplier: fresh ? fresh.multiplier : null
      }
    });
  }

  function migrateInventory(inventory, grower) {
    const items = [];
    if (!inventory || typeof inventory !== 'object') return items;
    Object.keys(inventory).forEach(function (flowerId) {
      const count = Math.max(0, Math.floor(Number(inventory[flowerId]) || 0));
      for (let i = 0; i < count; i += 1) {
        const seed = createSeed(flowerId, { grower: grower, source: 'start', gradeBoost: 0.02 });
        if (seed) items.push(seed);
      }
    });
    return items;
  }

  function clampHex(value) {
    return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  }

  function hexToRgb(hex) {
    const value = String(hex || '').replace('#', '');
    if (value.length !== 6) return { r: 128, g: 130, b: 110 };
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHsl(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h, s: s, l: l };
  }

  function hslToRgb(hsl) {
    const h = ((hsl.h % 1) + 1) % 1;
    const s = clamp(hsl.s, 0, 1);
    const l = clamp(hsl.l, 0, 1);
    if (!s) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    function hue(t) {
      let value = t;
      if (value < 0) value += 1;
      if (value > 1) value -= 1;
      if (value < 1 / 6) return p + (q - p) * 6 * value;
      if (value < 1 / 2) return q;
      if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
      return p;
    }
    return {
      r: Math.round(hue(h + 1 / 3) * 255),
      g: Math.round(hue(h) * 255),
      b: Math.round(hue(h - 1 / 3) * 255)
    };
  }

  function rgbToHex(rgb) {
    return '#' + clampHex(rgb.r) + clampHex(rgb.g) + clampHex(rgb.b);
  }

  function mixRgb(a, b, amount) {
    return {
      r: a.r + (b.r - a.r) * amount,
      g: a.g + (b.g - a.g) * amount,
      b: a.b + (b.b - a.b) * amount
    };
  }

  function variantColors(flower, item) {
    const template = templateById(item.templateId);
    const grade = gradeById(item.grade);
    const wear = clamp(Number(item.wear) || 0, 0, 1);
    const seedDrift = (((Number(item.patternSeed) >>> 0) % 1000) / 1000 - 0.5);
    const tint = hexToRgb(template.tint);
    const wornTint = hexToRgb('#9a8267');
    const colors = {};
    const petalKeys = ['petal', 'petalAlt', 'center', 'centerAlt'];
    Object.keys(flower.colors).forEach(function (key) {
      const source = flower.colors[key];
      const rgb = hexToRgb(source);
      const hsl = rgbToHsl(rgb);
      const isPetal = petalKeys.includes(key);
      const h = hsl.h + (Number(template.hue) || 0) + seedDrift * (isPetal ? 0.012 : 0.005);
      const s = hsl.s * (Number(template.saturation) || 1) * (1 - wear * (isPetal ? 0.36 : 0.18));
      const l = hsl.l + (Number(template.lightness) || 0) + (wear * 0.045);
      let color = hslToRgb({ h: h, s: s, l: l });
      if (isPetal) {
        color = mixRgb(color, tint, 0.08 + Math.max(0, 0.24 - hsl.s) * 0.55);
        color = mixRgb(color, wornTint, wear * 0.18);
      } else {
        color = mixRgb(color, tint, 0.03);
        color = mixRgb(color, wornTint, wear * 0.08);
      }
      colors[key] = rgbToHex(color);
    });
    return {
      colors: colors,
      template: template,
      grade: grade,
      wear: wear,
      wearBand: wearBand(wear, item.kind),
      gradeColor: grade.color,
      patternSeed: item.patternSeed
    };
  }

  function suggestedPrice(item) {
    const flower = DATA.flowerMap[item.flowerId];
    if (!flower) return MARKET.minPrice;
    const grade = gradeById(item.grade);
    const templateFactor = 1 + (24 - templateWeight(item.templateId)) / 100;
    const wearFactor = 1 - (Number(item.wear) || 0) * 0.4;
    const base = item.kind === 'bouquet' ? flower.sellPrice : flower.seedPrice;
    return clamp(Math.round(base * (grade.multiplier || 1) * templateFactor * wearFactor), MARKET.minPrice, MARKET.maxPrice);
  }

  function itemSummary(item) {
    const flower = DATA.flowerMap[item.flowerId];
    const grade = gradeById(item.grade);
    const template = templateById(item.templateId);
    const band = wearBand(item.wear, item.kind);
    return {
      name: flower ? flower.name : '未知的花',
      kindLabel: item.kind === 'bouquet' ? '成品花束' : '种子',
      grade: grade,
      template: template,
      wear: band,
      wearValue: Number(item.wear).toFixed(3),
      suggestedPrice: suggestedPrice(item)
    };
  }

  window.GardenItems = {
    grades: GRADES,
    templates: TEMPLATES,
    wearBands: WEAR_BANDS,
    market: MARKET,
    gradeById: gradeById,
    templateById: templateById,
    wearBand: wearBand,
    createSeed: createSeed,
    createBouquet: createBouquet,
    normalizeItem: normalizeItem,
    migrateInventory: migrateInventory,
    variantColors: variantColors,
    suggestedPrice: suggestedPrice,
    itemSummary: itemSummary,
    makeId: makeId
  };
})();
