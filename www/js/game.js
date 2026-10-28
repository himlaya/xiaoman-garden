/* 小小花园 · 游戏状态与规则 */
(function () {
  'use strict';

  const DATA = window.GameData;
  const Items = window.GardenItems;
  const SAVE_KEY = DATA.saveKey;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const MAX_GARDEN = DATA.maxPots;
  const FLOWER_IDS = Object.keys(DATA.flowerMap);

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function dateKey(timestamp) {
    const d = new Date(typeof timestamp === 'number' ? timestamp : Date.now());
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function dayDistance(fromKey, toKey) {
    if (!fromKey || !toKey) return null;
    const a = fromKey.split('-').map(Number);
    const b = toKey.split('-').map(Number);
    if (a.length !== 3 || b.length !== 3 || a.some(isNaN) || b.some(isNaN)) return null;
    const aTime = Date.UTC(a[0], a[1] - 1, a[2]);
    const bTime = Date.UTC(b[0], b[1] - 1, b[2]);
    return Math.round((bTime - aTime) / DAY_MS);
  }

  function integer(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function emptyDaily() {
    return {
      date: dateKey(),
      water: 0,
      harvest: 0,
      fertilizer: 0,
      claimed: []
    };
  }

  function createInitialState() {
    const now = Date.now();
    const items = [];
    Object.keys(DATA.starting.seeds).forEach(function (id) {
      const count = Math.max(0, Math.floor(Number(DATA.starting.seeds[id]) || 0));
      for (let i = 0; i < count; i += 1) {
        const seed = Items.createSeed(id, { grower: DATA.starting.name, source: 'start', gradeBoost: 0.02 });
        if (seed) items.push(seed);
      }
    });
    return {
      version: DATA.version,
      createdAt: now,
      updatedAt: now,
      player: {
        name: DATA.starting.name,
        coins: DATA.starting.coins,
        fertilizer: DATA.starting.fertilizer,
        xp: 0
      },
      items: items,
      potCount: DATA.initialPots,
      garden: new Array(MAX_GARDEN).fill(null),
      collection: {},
      checkin: {
        lastDate: null,
        streak: 0,
        total: 0
      },
      daily: emptyDaily(),
      settings: {
        sound: true,
        reduceMotion: false,
        speed: 1,
        seenIntro: false
      },
      meta: {
        hasOpened: false,
        lastSeen: now,
        totalHarvested: 0,
        totalCare: 0
      }
    };
  }

  function normalizePlant(raw) {
    if (!raw || !DATA.flowerMap[raw.flowerId]) return null;
    const flower = DATA.flowerMap[raw.flowerId];
    const progress = Math.max(0, Math.min(1, Number(raw.progress) || 0));
    let bloomedAt = Number(raw.bloomedAt) || null;
    if (progress >= 1 && !bloomedAt) bloomedAt = Date.now();
    const legacySeed = !raw.templateId
      ? Items.createSeed(raw.flowerId, { source: 'start', gradeBoost: 0.02 })
      : null;
    return {
      flowerId: raw.flowerId,
      plantedAt: Number(raw.plantedAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now(),
      progress: progress >= 1 ? 1 : progress,
      bloomedAt: progress >= 1 ? bloomedAt : null,
      boostUntil: Number(raw.boostUntil) || 0,
      waterReadyAt: Number(raw.waterReadyAt) || 0,
      growSeconds: flower.growSeconds,
      seedId: typeof raw.seedId === 'string' ? raw.seedId : null,
      templateId: raw.templateId || (legacySeed ? legacySeed.templateId : null),
      patternSeed: raw.patternSeed || (legacySeed ? legacySeed.patternSeed : null),
      seedGrade: raw.seedGrade || (legacySeed ? legacySeed.grade : null),
      careScore: clamp(Number(raw.careScore) || 0, 0, 100),
      waterCount: Math.max(0, Math.floor(Number(raw.waterCount) || 0)),
      fertilizerCount: Math.max(0, Math.floor(Number(raw.fertilizerCount) || 0))
    };
  }

  function normalizeItems(rawItems) {
    const items = [];
    const seen = new Set();
    (Array.isArray(rawItems) ? rawItems : []).forEach(function (raw) {
      const item = Items.normalizeItem(raw);
      if (!item) return;
      if (seen.has(item.id)) item.id = Items.makeId();
      seen.add(item.id);
      items.push(item);
    });
    return items;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object') return createInitialState();
    const fresh = createInitialState();
    const state = {
      version: DATA.version,
      createdAt: Number(raw.createdAt) || fresh.createdAt,
      updatedAt: Number(raw.updatedAt) || Date.now(),
      player: {
        name: typeof raw.player?.name === 'string' && raw.player.name.trim()
          ? Array.from(raw.player.name.trim()).slice(0, 12).join('')
          : fresh.player.name,
        coins: integer(raw.player?.coins, fresh.player.coins),
        fertilizer: integer(raw.player?.fertilizer, fresh.player.fertilizer),
        xp: integer(raw.player?.xp, 0)
      },
      items: [],
      potCount: Math.max(1, Math.min(MAX_GARDEN, integer(raw.potCount, DATA.initialPots))),
      garden: new Array(MAX_GARDEN).fill(null),
      collection: {},
      checkin: {
        lastDate: typeof raw.checkin?.lastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.checkin.lastDate)
          ? raw.checkin.lastDate
          : null,
        streak: integer(raw.checkin?.streak, 0),
        total: integer(raw.checkin?.total, 0)
      },
      daily: emptyDaily(),
      settings: {
        sound: raw.settings?.sound !== false,
        reduceMotion: raw.settings?.reduceMotion === true,
        speed: DATA.speeds.includes(Number(raw.settings?.speed)) ? Number(raw.settings.speed) : 1,
        seenIntro: raw.settings?.seenIntro === true
      },
      meta: {
        hasOpened: raw.meta?.hasOpened === true,
        lastSeen: Number(raw.meta?.lastSeen) || Date.now(),
        totalHarvested: integer(raw.meta?.totalHarvested, 0),
        totalCare: integer(raw.meta?.totalCare, 0)
      }
    };

    state.items = normalizeItems(raw.items);
    if (!state.items.length && raw.inventory && typeof raw.inventory === 'object') {
      state.items = Items.migrateInventory(raw.inventory, state.player.name);
    }

    if (Array.isArray(raw.garden)) {
      for (let i = 0; i < MAX_GARDEN; i += 1) {
        state.garden[i] = normalizePlant(raw.garden[i]);
      }
    }

    if (raw.collection && typeof raw.collection === 'object') {
      Object.keys(raw.collection).forEach(function (id) {
        if (!DATA.flowerMap[id]) return;
        const entry = raw.collection[id] || {};
        const count = integer(entry.count, 0);
        if (count > 0) {
          state.collection[id] = {
            count: count,
            firstAt: Number(entry.firstAt) || Date.now()
          };
        }
      });
    }

    if (raw.daily && raw.daily.date === dateKey()) {
      state.daily.water = integer(raw.daily.water, 0);
      state.daily.harvest = integer(raw.daily.harvest, 0);
      state.daily.fertilizer = integer(raw.daily.fertilizer, 0);
      const validQuestIds = DATA.dailyQuests.map(function (q) { return q.id; });
      state.daily.claimed = Array.isArray(raw.daily.claimed)
        ? raw.daily.claimed.filter(function (id) { return validQuestIds.includes(id); })
        : [];
    }

    return state;
  }

  function readSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return createInitialState();
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      return createInitialState();
    }
  }

  let state = readSave();
  let modal = null;
  let booted = false;

  function persist() {
    state.updatedAt = Date.now();
    state.meta.lastSeen = Date.now();
    let serialized = null;
    try {
      serialized = JSON.stringify(state);
      window.localStorage.setItem(SAVE_KEY, serialized);
    } catch (error) {
      /* 隐私模式下不能写入时，游戏仍可在本次会话里运行 */
    }
    if (serialized && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
      try {
        window.dispatchEvent(new window.CustomEvent('xiaoman:save', { detail: { serialized: serialized } }));
      } catch (error) {
        /* 同步扩展失败不影响本地存档 */
      }
    }
  }

  function getState() {
    return state;
  }

  function addItem(item) {
    if (item) state.items.push(item);
    return item;
  }

  function addSeedReward(seeds, source, gradeBoost) {
    const created = [];
    if (!seeds) return created;
    Object.keys(seeds).forEach(function (id) {
      if (!DATA.flowerMap[id]) return;
      const count = Math.max(0, Math.floor(Number(seeds[id]) || 0));
      for (let i = 0; i < count; i += 1) {
        const seed = Items.createSeed(id, {
          grower: state.player.name,
          source: source || 'checkin',
          gradeBoost: gradeBoost || 0
        });
        if (seed) created.push(addItem(seed));
      }
    });
    return created;
  }

  function getItems(kind) {
    return state.items.filter(function (item) { return !kind || item.kind === kind; });
  }

  function getSeedItems(flowerId) {
    return state.items.filter(function (item) {
      return item.kind === 'seed' && (!flowerId || item.flowerId === flowerId);
    });
  }

  function getBouquetItems(flowerId) {
    return state.items.filter(function (item) {
      return item.kind === 'bouquet' && (!flowerId || item.flowerId === flowerId);
    });
  }

  function getItem(itemId) {
    return state.items.find(function (item) { return item.id === itemId; }) || null;
  }

  function seedCount(flowerId) {
    return getSeedItems(flowerId).length;
  }

  function stageFor(progress) {
    if (progress >= 1) return 'bloom';
    if (progress < DATA.stages.sprout.min) return 'seed';
    if (progress < DATA.stages.bud.min) return 'sprout';
    return 'bud';
  }

  function stageLabel(stage) {
    return DATA.stages[stage]?.label || '种子';
  }

  function levelInfo(xp) {
    let level = 1;
    let remaining = Math.max(0, Number(xp) || 0);
    let need = DATA.xpPerLevel;
    while (remaining >= need && level < 99) {
      remaining -= need;
      level += 1;
      need = Math.max(40, Math.round((need * 1.32) / 10) * 10);
    }
    let title = DATA.levelTitles[0].title;
    DATA.levelTitles.forEach(function (item) {
      if (level >= item.min) title = item.title;
    });
    return {
      level: level,
      current: remaining,
      need: need,
      percent: Math.min(100, Math.round((remaining / need) * 100)),
      title: title
    };
  }

  function addXp(amount) {
    const before = levelInfo(state.player.xp);
    state.player.xp = Math.max(0, state.player.xp + Math.max(0, Math.round(amount)));
    const after = levelInfo(state.player.xp);
    const levels = Math.max(0, after.level - before.level);
    if (levels > 0) {
      state.player.fertilizer += levels;
    }
    return {
      gained: Math.max(0, Math.round(amount)),
      before: before,
      after: after,
      levelsGained: levels
    };
  }

  function ensureDaily(now) {
    const today = dateKey(now);
    if (state.daily.date === today) return null;
    state.daily = emptyDaily();
    state.daily.date = today;
    return { type: 'newday', date: today };
  }

  function applyGrowth(plant, now) {
    if (!plant) return false;
    if (plant.progress >= 1) {
      plant.updatedAt = now;
      return false;
    }
    const flower = DATA.flowerMap[plant.flowerId];
    const elapsed = Math.max(0, now - (plant.updatedAt || now));
    const boostOverlap = Math.max(0, Math.min(now, plant.boostUntil || 0) - (plant.updatedAt || now));
    const normalOverlap = Math.max(0, elapsed - boostOverlap);
    const speed = state.settings.speed || 1;
    const effectiveMs = (normalOverlap + boostOverlap * DATA.care.water.boostMultiplier) * speed;
    plant.progress = Math.min(1, plant.progress + effectiveMs / 1000 / flower.growSeconds);
    plant.updatedAt = now;
    if (plant.progress >= 1) {
      plant.progress = 1;
      if (!plant.bloomedAt) plant.bloomedAt = now;
      return true;
    }
    return false;
  }

  function tick() {
    const now = Date.now();
    const events = [];
    const dailyEvent = ensureDaily(now);
    if (dailyEvent) events.push(dailyEvent);

    for (let i = 0; i < state.garden.length; i += 1) {
      const plant = state.garden[i];
      if (!plant || plant.progress >= 1) {
        if (plant) plant.updatedAt = now;
        continue;
      }
      const before = stageFor(plant.progress);
      const bloomed = applyGrowth(plant, now);
      const after = stageFor(plant.progress);
      if (after !== before) {
        events.push({
          type: after === 'bloom' ? 'bloom' : 'stage',
          stage: after,
          slot: i,
          flowerId: plant.flowerId
        });
      } else if (bloomed) {
        events.push({ type: 'bloom', stage: 'bloom', slot: i, flowerId: plant.flowerId });
      }
    }
    return events;
  }

  function boot() {
    const firstOpen = !state.meta.hasOpened;
    const events = tick();
    state.meta.hasOpened = true;
    state.meta.lastSeen = Date.now();
    booted = true;
    persist();
    return { firstOpen: firstOpen, events: events };
  }

  function freshness(plant) {
    const flower = DATA.flowerMap[plant.flowerId];
    const now = Date.now();
    const bloomedAt = plant.bloomedAt || now;
    const elapsed = Math.max(0, now - bloomedAt);
    const total = flower.bloomSeconds * 1000;
    const ratio = Math.max(0, Math.min(1.5, elapsed / total));
    let multiplier = 1.2;
    let label = '正值盛花';
    let tone = 'fresh';
    if (ratio >= 1) {
      multiplier = 0.85;
      label = '已过盛花期';
      tone = 'past';
    } else if (ratio >= 0.7) {
      multiplier = 1;
      label = '花期将尽';
      tone = 'late';
    } else if (ratio >= 0.35) {
      multiplier = 1.1;
      label = '花开正好';
      tone = 'good';
    }
    const remainingMs = Math.max(0, total - elapsed);
    return {
      ratio: ratio,
      multiplier: multiplier,
      label: label,
      tone: tone,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      percent: Math.round(Math.min(1, ratio) * 100)
    };
  }

  function plantView(plant, slot, now) {
    if (!plant) return { slot: slot, empty: true, planted: false };
    const flower = DATA.flowerMap[plant.flowerId];
    const stage = stageFor(plant.progress);
    const bloomedAt = plant.bloomedAt || now;
    const buffed = stage !== 'bloom' && (plant.boostUntil || 0) > now;
    const waterWait = Math.max(0, Math.ceil(((plant.waterReadyAt || 0) - now) / 1000));
    const remainingGameSeconds = stage === 'bloom'
      ? 0
      : Math.max(0, (1 - plant.progress) * flower.growSeconds);
    const rate = (state.settings.speed || 1) * (buffed ? DATA.care.water.boostMultiplier : 1);
    const remainingRealSeconds = stage === 'bloom' ? 0 : Math.ceil(remainingGameSeconds / Math.max(0.001, rate));
    const fresh = stage === 'bloom' ? freshness(plant) : null;
    return {
      slot: slot,
      empty: false,
      planted: true,
      plant: plant,
      flower: flower,
      stage: stage,
      stageLabel: stageLabel(stage),
      progress: plant.progress,
      progressPercent: Math.round(plant.progress * 100),
      remainingSeconds: remainingRealSeconds,
      remainingGameSeconds: remainingGameSeconds,
      bloomedAt: bloomedAt,
      bloomingFor: stage === 'bloom' ? Math.max(0, now - bloomedAt) : 0,
      bloomSeconds: flower.bloomSeconds,
      buffed: buffed,
      boostSecondsLeft: buffed ? Math.ceil(((plant.boostUntil || 0) - now) / 1000) : 0,
      waterWait: waterWait,
      canWater: stage !== 'bloom' && waterWait <= 0,
      canFertilize: stage !== 'bloom' && state.player.fertilizer > 0,
      fresh: fresh,
      harvestCoins: fresh ? Math.max(1, Math.round(flower.sellPrice * fresh.multiplier)) : 0,
      seedMeta: {
        templateId: plant.templateId || null,
        patternSeed: plant.patternSeed || null,
        grade: plant.seedGrade || null
      },
      isBloom: stage === 'bloom'
    };
  }

  function getGardenViews() {
    const now = Date.now();
    const views = [];
    for (let i = 0; i < state.potCount; i += 1) {
      views.push(plantView(state.garden[i], i, now));
    }
    return views;
  }

  function getPlantView(slot) {
    return plantView(state.garden[slot] || null, slot, Date.now());
  }

  function checkinView() {
    const now = Date.now();
    const today = dateKey(now);
    const last = state.checkin.lastDate;
    const claimedToday = last === today;
    const contiguous = last && dayDistance(last, today) === 1;
    const displayStreak = claimedToday ? state.checkin.streak : (contiguous ? state.checkin.streak : 0);
    const nextStreak = claimedToday ? state.checkin.streak : (contiguous ? state.checkin.streak + 1 : 1);
    const activeIndex = Math.max(0, ((nextStreak - 1) % DATA.checkinRewards.length));
    const cells = DATA.checkinRewards.map(function (reward, index) {
      let status = 'future';
      if (claimedToday) {
        status = index <= activeIndex ? 'claimed' : 'future';
      } else if (index < activeIndex) {
        status = 'claimed';
      } else if (index === activeIndex) {
        status = 'today';
      }
      return Object.assign({}, reward, { status: status });
    });
    return {
      available: !claimedToday,
      claimedToday: claimedToday,
      streak: displayStreak,
      total: state.checkin.total,
      nextStreak: nextStreak,
      activeIndex: activeIndex,
      dayNumber: activeIndex + 1,
      reward: DATA.checkinRewards[activeIndex],
      cells: cells,
      today: today
    };
  }

  function applyReward(reward) {
    const created = [];
    if (!reward) return created;
    if (reward.coins) state.player.coins += reward.coins;
    if (reward.fertilizer) state.player.fertilizer += reward.fertilizer;
    if (reward.seeds) {
      created.push.apply(created, addSeedReward(reward.seeds, 'checkin', 0.03));
    }
    return created;
  }

  function claimCheckin() {
    const view = checkinView();
    if (!view.available) return { ok: false, reason: 'already_claimed' };
    const items = applyReward(view.reward);
    state.checkin.lastDate = dateKey();
    state.checkin.streak = view.nextStreak;
    state.checkin.total += 1;
    persist();
    return {
      ok: true,
      reward: view.reward,
      items: items,
      dayNumber: view.dayNumber,
      streak: view.nextStreak
    };
  }

  function dailyQuestViews() {
    return DATA.dailyQuests.map(function (quest) {
      const progress = Math.min(quest.target, state.daily[quest.metric] || 0);
      return {
        id: quest.id,
        title: quest.title,
        desc: quest.desc,
        target: quest.target,
        progress: progress,
        done: progress >= quest.target,
        claimed: state.daily.claimed.includes(quest.id),
        reward: quest.reward
      };
    });
  }

  function claimQuest(id) {
    const quest = DATA.dailyQuests.find(function (item) { return item.id === id; });
    if (!quest) return { ok: false, reason: 'unknown_quest' };
    if (state.daily.claimed.includes(id)) return { ok: false, reason: 'already_claimed' };
    if ((state.daily[quest.metric] || 0) < quest.target) return { ok: false, reason: 'not_done' };
    state.daily.claimed.push(id);
    const items = applyReward(quest.reward);
    persist();
    return { ok: true, reward: quest.reward, items: items, title: quest.title };
  }

  function plantSeed(slot, seedRef) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= state.potCount) return { ok: false, reason: 'bad_slot' };
    if (state.garden[slot]) return { ok: false, reason: 'occupied' };
    const seed = state.items.find(function (item) {
      return item.kind === 'seed' && (item.id === seedRef || item.flowerId === seedRef);
    });
    if (!seed) return { ok: false, reason: 'no_seed' };
    const flower = DATA.flowerMap[seed.flowerId];
    if (!flower) return { ok: false, reason: 'unknown_flower' };
    state.items = state.items.filter(function (item) { return item.id !== seed.id; });
    const now = Date.now();
    state.garden[slot] = {
      flowerId: flower.id,
      plantedAt: now,
      updatedAt: now,
      progress: 0,
      bloomedAt: null,
      boostUntil: 0,
      waterReadyAt: 0,
      growSeconds: flower.growSeconds,
      seedId: seed.id,
      templateId: seed.templateId,
      patternSeed: seed.patternSeed,
      seedGrade: seed.grade,
      careScore: 0,
      waterCount: 0,
      fertilizerCount: 0
    };
    persist();
    return { ok: true, slot: slot, flower: flower, seed: seed };
  }

  function careResult(slot, plant, type, bloomed) {
    const view = plantView(plant, slot, Date.now());
    return {
      ok: true,
      type: type,
      bloomed: bloomed,
      view: view,
      message: bloomed ? '花儿开好了' : null
    };
  }

  function waterPlant(slot) {
    const plant = state.garden[slot];
    if (!plant) return { ok: false, reason: 'empty' };
    if (plant.progress >= 1) return { ok: false, reason: 'bloomed' };
    const now = Date.now();
    if ((plant.waterReadyAt || 0) > now) {
      return { ok: false, reason: 'cooldown', seconds: Math.ceil((plant.waterReadyAt - now) / 1000) };
    }
    const speed = state.settings.speed || 1;
    const cooldownMs = Math.max(500, DATA.care.water.cooldownSeconds * 1000 / speed);
    plant.waterReadyAt = now + cooldownMs;
    plant.boostUntil = Math.max(now, plant.boostUntil || 0) + DATA.care.water.boostSeconds * 1000;
    plant.progress = Math.min(1, plant.progress + DATA.care.water.instantProgress);
    plant.updatedAt = now;
    plant.waterCount = (plant.waterCount || 0) + 1;
    plant.careScore = Math.min(100, (plant.careScore || 0) + 12);
    let bloomed = false;
    if (plant.progress >= 1) {
      plant.progress = 1;
      plant.bloomedAt = plant.bloomedAt || now;
      bloomed = true;
    }
    state.daily.water += 1;
    state.meta.totalCare += 1;
    persist();
    return careResult(slot, plant, 'water', bloomed);
  }

  function fertilizePlant(slot) {
    const plant = state.garden[slot];
    if (!plant) return { ok: false, reason: 'empty' };
    if (plant.progress >= 1) return { ok: false, reason: 'bloomed' };
    if (state.player.fertilizer <= 0) return { ok: false, reason: 'no_fertilizer' };
    const now = Date.now();
    state.player.fertilizer -= 1;
    plant.progress = Math.min(1, plant.progress + DATA.care.fertilizer.progressBoost);
    plant.updatedAt = now;
    plant.fertilizerCount = (plant.fertilizerCount || 0) + 1;
    plant.careScore = Math.min(100, (plant.careScore || 0) + 16);
    let bloomed = false;
    if (plant.progress >= 1) {
      plant.progress = 1;
      plant.bloomedAt = plant.bloomedAt || now;
      bloomed = true;
    }
    state.daily.fertilizer += 1;
    state.meta.totalCare += 1;
    persist();
    return careResult(slot, plant, 'fertilizer', bloomed);
  }

  function harvest(slot) {
    const plant = state.garden[slot];
    if (!plant) return { ok: false, reason: 'empty' };
    if (plant.progress < 1) return { ok: false, reason: 'not_bloomed' };
    const flower = DATA.flowerMap[plant.flowerId];
    const fresh = freshness(plant);
    const coins = Math.max(1, Math.round(flower.sellPrice * fresh.multiplier));
    const xpResult = addXp(flower.xp);
    state.player.coins += coins;
    state.meta.totalHarvested += 1;
    state.daily.harvest += 1;
    const collection = state.collection[flower.id] || { count: 0, firstAt: Date.now() };
    collection.count += 1;
    collection.firstAt = collection.firstAt || Date.now();
    state.collection[flower.id] = collection;
    const seedMeta = {
      id: plant.seedId,
      grade: plant.seedGrade || 'common',
      templateId: plant.templateId,
      patternSeed: plant.patternSeed
    };
    const item = addItem(Items.createBouquet(flower, plant, fresh, {
      grower: state.player.name,
      seed: seedMeta
    }));
    let bonusSeed = null;
    if (Math.random() < flower.bonusSeedChance) {
      bonusSeed = addItem(Items.createSeed(flower.id, {
        grower: state.player.name,
        source: 'bonus',
        gradeBoost: 0.04
      }));
    }
    state.garden[slot] = null;
    persist();
    return {
      ok: true,
      flower: flower,
      coins: coins,
      xp: flower.xp,
      item: item,
      bonusSeed: bonusSeed,
      fresh: fresh,
      levelUp: xpResult.levelsGained > 0 ? xpResult.after : null
    };
  }

  function buySeed(flowerId) {
    const flower = DATA.flowerMap[flowerId];
    if (!flower) return { ok: false, reason: 'unknown_flower' };
    if (state.player.coins < flower.seedPrice) return { ok: false, reason: 'coins' };
    state.player.coins -= flower.seedPrice;
    const item = addItem(Items.createSeed(flowerId, {
      grower: state.player.name,
      source: 'shop',
      gradeBoost: 0.015
    }));
    persist();
    return { ok: true, flower: flower, item: item, inventory: seedCount(flowerId) };
  }

  function buyFertilizer(bundle) {
    const item = bundle ? DATA.fertilizerBundle : { price: DATA.fertilizerPrice, quantity: 1 };
    if (state.player.coins < item.price) return { ok: false, reason: 'coins' };
    state.player.coins -= item.price;
    state.player.fertilizer += item.quantity;
    persist();
    return { ok: true, quantity: item.quantity, price: item.price };
  }

  function nextPotPrice() {
    const index = state.potCount - DATA.initialPots;
    return index >= 0 && index < DATA.potPrices.length ? DATA.potPrices[index] : null;
  }

  function buyPot() {
    if (state.potCount >= DATA.maxPots) return { ok: false, reason: 'max_pots' };
    const price = nextPotPrice();
    if (price === null) return { ok: false, reason: 'max_pots' };
    if (state.player.coins < price) return { ok: false, reason: 'coins' };
    state.player.coins -= price;
    state.potCount += 1;
    persist();
    return { ok: true, potCount: state.potCount, price: price };
  }

  function setName(value) {
    const clean = Array.from(String(value || '').trim()).slice(0, 12).join('') || '小园丁';
    state.player.name = clean;
    persist();
    return { ok: true, name: clean };
  }

  function setSetting(key, value) {
    if (!Object.prototype.hasOwnProperty.call(state.settings, key)) return { ok: false };
    state.settings[key] = value;
    persist();
    return { ok: true };
  }

  function setSpeed(speed) {
    const next = Number(speed);
    if (!DATA.speeds.includes(next)) return { ok: false };
    state.settings.speed = next;
    persist();
    return { ok: true, speed: next };
  }

  function reset() {
    state = createInitialState();
    persist();
    return { ok: true };
  }

  function stats() {
    const collected = Object.keys(state.collection).length;
    const days = Math.max(1, Math.floor((Date.now() - state.createdAt) / DAY_MS) + 1);
    const checkin = checkinView();
    return {
      collected: collected,
      totalFlowers: FLOWER_IDS.length,
      totalHarvested: state.meta.totalHarvested,
      streak: checkin.streak,
      days: days,
      totalCare: state.meta.totalCare,
      seeds: getSeedItems().length,
      bouquets: getBouquetItems().length,
      items: state.items.length,
      level: levelInfo(state.player.xp)
    };
  }

  function getCheckinShortcut() {
    const view = checkinView();
    return {
      available: view.available,
      dayNumber: view.dayNumber,
      label: view.available ? '今日签到' : '今日已签'
    };
  }

  window.Game = {
    boot: boot,
    tick: tick,
    save: persist,
    getState: getState,
    getGardenViews: getGardenViews,
    getPlantView: getPlantView,
    checkinView: checkinView,
    claimCheckin: claimCheckin,
    dailyQuestViews: dailyQuestViews,
    claimQuest: claimQuest,
    plantSeed: plantSeed,
    waterPlant: waterPlant,
    fertilizePlant: fertilizePlant,
    harvest: harvest,
    buySeed: buySeed,
    buyFertilizer: buyFertilizer,
    buyPot: buyPot,
    nextPotPrice: nextPotPrice,
    setName: setName,
    setSetting: setSetting,
    setSpeed: setSpeed,
    reset: reset,
    stats: stats,
    levelInfo: levelInfo,
    stageFor: stageFor,
    freshness: freshness,
    dateKey: dateKey,
    getItems: getItems,
    getSeedItems: getSeedItems,
    getBouquetItems: getBouquetItems,
    getItem: getItem,
    seedCount: seedCount,
    getCheckinShortcut: getCheckinShortcut,
    isBooted: function () { return booted; }
  };
})();
