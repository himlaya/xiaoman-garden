/* 游戏规则自动测试：不依赖浏览器，直接用 Node 的 vm 加载前端逻辑。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(ROOT, 'www/js/data.js'), 'utf8');
const itemsSource = fs.readFileSync(path.join(ROOT, 'www/js/items.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(ROOT, 'www/js/game.js'), 'utf8');

function makeHarness(startTime, savedRaw) {
  let now = startTime || new Date(2026, 9, 26, 10, 0, 0).getTime();
  const store = new Map();
  if (savedRaw) store.set('xiaoman-garden-save-v1', savedRaw);
  const localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
  const window = { localStorage };
  const FakeDate = class extends Date {
    constructor(...args) {
      if (args.length === 0) super(now);
      else super(...args);
    }
    static now() {
      return now;
    }
  };
  const context = vm.createContext({
    window,
    localStorage,
    console,
    Date: FakeDate,
    Math
  });
  vm.runInContext(dataSource, context, { filename: 'data.js' });
  vm.runInContext(itemsSource, context, { filename: 'items.js' });
  vm.runInContext(gameSource, context, { filename: 'game.js' });
  return {
    Game: window.Game,
    Data: window.GameData,
    Items: window.GardenItems,
    window,
    store,
    get now() {
      return now;
    },
    advance(ms) {
      now += ms;
    },
    setNow(value) {
      now = value;
    }
  };
}

test('初始花园：有种子、有花盆，第一次打开还未签到', () => {
  const { Game, Data } = makeHarness();
  const boot = Game.boot();
  assert.equal(boot.events.length, 0);
  const state = Game.getState();
  assert.equal(state.player.coins, Data.starting.coins);
  assert.equal(state.player.fertilizer, Data.starting.fertilizer);
  assert.equal(Game.getSeedItems('daisy').length, 2);
  assert.equal(Game.getSeedItems('tulip').length, 1);
  assert.equal(state.items.length, 3);
  assert.equal(state.potCount, 4);
  assert.equal(state.garden.filter(Boolean).length, 0);
  assert.equal(state.settings.seenIntro, false);
  assert.equal(Game.checkinView().available, true);
  assert.equal(Game.checkinView().dayNumber, 1);
});

test('每日签到：领取花种、同一天不能重复领、连续签到会推进', () => {
  const h = makeHarness();
  h.Game.boot();
  const before = h.Game.getState();
  const daisyBefore = h.Game.getSeedItems('daisy').length;
  const coinsBefore = before.player.coins;
  const first = h.Game.claimCheckin();
  assert.equal(first.ok, true);
  assert.equal(h.Game.getSeedItems('daisy').length, daisyBefore + 1);
  assert.equal(first.items.length, 1);
  assert.equal(h.Game.getState().player.coins, coinsBefore + 20);
  assert.equal(h.Game.getState().checkin.streak, 1);
  assert.equal(h.Game.checkinView().available, false);
  assert.equal(h.Game.claimCheckin().reason, 'already_claimed');

  h.advance(24 * 60 * 60 * 1000);
  const events = h.Game.tick();
  assert.ok(events.some((event) => event.type === 'newday'));
  assert.equal(h.Game.checkinView().available, true);
  assert.equal(h.Game.checkinView().dayNumber, 2);
  const second = h.Game.claimCheckin();
  assert.equal(second.ok, true);
  assert.equal(h.Game.getState().checkin.streak, 2);
  assert.equal(h.Game.getSeedItems('tulip').length, 2);
});

test('漏签会重新开始连续签到，并回到第 1 天奖励', () => {
  const h = makeHarness();
  h.Game.boot();
  h.Game.claimCheckin();
  h.advance(2 * 24 * 60 * 60 * 1000);
  h.advance(2 * 60 * 60 * 1000); // 保持上午，避免跨日边界歧义
  h.Game.tick();
  const view = h.Game.checkinView();
  assert.equal(view.streak, 0);
  assert.equal(view.dayNumber, 1);
  const result = h.Game.claimCheckin();
  assert.equal(result.ok, true);
  assert.equal(h.Game.getState().checkin.streak, 1);
  assert.equal(result.dayNumber, 1);
});

test('种植、浇水、施肥、开花和采摘构成完整循环', () => {
  const h = makeHarness();
  const { Game, Data } = h;
  Game.boot();
  const coinsBefore = Game.getState().player.coins;

  const planted = Game.plantSeed(0, 'daisy');
  assert.equal(planted.ok, true);
  assert.equal(Game.getSeedItems('daisy').length, 1);
  assert.equal(Game.getPlantView(0).stage, 'seed');

  const water = Game.waterPlant(0);
  assert.equal(water.ok, true);
  assert.ok(water.view.progress > 0);
  assert.ok(water.view.buffed);
  assert.equal(Game.waterPlant(0).reason, 'cooldown');
  assert.equal(Game.getState().daily.water, 1);

  const fertilizer = Game.fertilizePlant(0);
  assert.equal(fertilizer.ok, true);
  assert.equal(Game.getState().player.fertilizer, 2);
  assert.ok(fertilizer.view.progress > water.view.progress);
  assert.equal(Game.getPlantView(0).canFertilize, true);

  Game.setSpeed(3600);
  assert.equal(Game.getState().settings.speed, 3600);
  h.advance(Data.flowerMap.daisy.growSeconds * 1000);
  const events = Game.tick();
  assert.ok(events.some((event) => event.type === 'bloom'));
  const bloom = Game.getPlantView(0);
  assert.equal(bloom.isBloom, true);
  assert.equal(bloom.fresh.label, '正值盛花');
  assert.equal(bloom.fresh.multiplier, 1.2);

  const result = Game.harvest(0);
  assert.equal(result.ok, true);
  assert.equal(result.coins, Math.round(result.flower.sellPrice * 1.2));
  assert.ok(Game.getState().player.coins >= coinsBefore + result.coins);
  assert.equal(Game.getPlantView(0).empty, true);
  assert.equal(Game.getState().collection.daisy.count, 1);
  assert.equal(Game.getState().daily.harvest, 1);
  assert.equal(result.item.kind, 'bouquet');
  assert.ok(result.item.id.startsWith('itm_'));
  assert.ok(Data.itemGrades.some(function (grade) { return grade.id === result.item.grade; }));
  assert.ok(Data.itemTemplates.some(function (template) { return template.id === result.item.templateId; }));
  assert.ok(result.item.wear >= 0 && result.item.wear <= 1);
  assert.equal(Game.getBouquetItems('daisy').length, 1);
});

test('花开久了新鲜度会下降，但依然可以采摘', () => {
  const h = makeHarness();
  const { Game, Data } = h;
  Game.boot();
  Game.plantSeed(0, 'daisy');
  h.advance(Data.flowerMap.daisy.growSeconds * 1000);
  Game.tick();
  assert.equal(Game.getPlantView(0).isBloom, true);

  h.advance(Data.flowerMap.daisy.bloomSeconds * 1000);
  const view = Game.getPlantView(0);
  assert.equal(view.fresh.label, '已过盛花期');
  assert.equal(view.fresh.multiplier, 0.85);
  assert.equal(view.harvestCoins, Math.round(Data.flowerMap.daisy.sellPrice * 0.85));
  assert.equal(Game.harvest(0).ok, true);
});

test('每日花事任务可以领取一次，奖励会进入仓库', () => {
  const h = makeHarness();
  const { Game, Data } = h;
  Game.boot();
  Game.plantSeed(0, 'daisy');
  Game.waterPlant(0);
  h.advance(Data.care.water.cooldownSeconds * 1000 + 1000);
  Game.waterPlant(0);
  const views = Game.dailyQuestViews();
  const waterQuest = views.find((quest) => quest.id === 'water');
  assert.equal(waterQuest.done, true);
  assert.equal(Game.getState().daily.water, 2);
  const coinsBefore = Game.getState().player.coins;
  const claimed = Game.claimQuest('water');
  assert.equal(claimed.ok, true);
  assert.equal(Game.getState().player.coins, coinsBefore + 30);
  assert.equal(Game.claimQuest('water').reason, 'already_claimed');
});

test('商店购买种子、肥料和花盆会正确扣款', () => {
  const h = makeHarness();
  const { Game } = h;
  Game.boot();
  Game.getState().player.coins = 700;
  const seed = Game.buySeed('rose');
  assert.equal(seed.ok, true);
  assert.equal(Game.getSeedItems('rose').length, 1);
  assert.equal(seed.item.kind, 'seed');
  assert.equal(Game.getState().player.coins, 600);

  const fertilizer = Game.buyFertilizer(true);
  assert.equal(fertilizer.ok, true);
  assert.equal(fertilizer.quantity, 5);
  assert.equal(Game.getState().player.coins, 500);
  assert.equal(Game.getState().player.fertilizer, 8);

  const pot = Game.buyPot();
  assert.equal(pot.ok, true);
  assert.equal(Game.getState().potCount, 5);
  assert.equal(Game.getState().player.coins, 180);
});

test('金币不足时购买失败，不会改变库存', () => {
  const h = makeHarness();
  const { Game } = h;
  Game.boot();
  Game.getState().player.coins = 10;
  const result = Game.buySeed('rose');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'coins');
  assert.equal(Game.getSeedItems('rose').length, 0);
  assert.equal(Game.getState().player.coins, 10);
});

test('不同花种拥有不同的生长时间和花期', () => {
  const { Data } = makeHarness();
  const daisy = Data.flowerMap.daisy;
  const tulip = Data.flowerMap.tulip;
  const sunflower = Data.flowerMap.sunflower;
  assert.ok(tulip.growSeconds > daisy.growSeconds);
  assert.ok(sunflower.growSeconds > tulip.growSeconds);
  assert.ok(sunflower.bloomSeconds > daisy.bloomSeconds);
  assert.ok(Data.flowers.length >= 7);
});

test('成长与花期按现实参考的五分之一折算', () => {
  const { Data } = makeHarness();
  assert.equal(Data.timeScale, 0.2);
  Data.flowers.forEach(function (flower) {
    assert.equal(flower.growSeconds, Math.round(flower.realGrowDays * Data.realDaySeconds * Data.timeScale));
    assert.equal(flower.bloomSeconds, Math.round(flower.realBloomDays * Data.realDaySeconds * Data.timeScale));
  });
  assert.equal(Data.flowerMap.daisy.growSeconds, 69120);
  assert.equal(Data.flowerMap.daisy.bloomSeconds, 86400);
  assert.equal(Data.care.water.cooldownSeconds, 1800);
  assert.equal(Data.care.water.boostSeconds, 7200);
});

test('更改名字会裁剪空白并限制长度', () => {
  const h = makeHarness();
  const { Game } = h;
  Game.boot();
  assert.equal(Game.setName('  晚风花园  ').name, '晚风花园');
  assert.equal(Game.setName('').name, '小园丁');
  assert.equal(Array.from(Game.setName('一二三四五六七八九十十一十二').name).length, 12);
});

test('存档能写入并在新的游戏实例里恢复', () => {
  const h = makeHarness();
  h.Game.boot();
  h.Game.claimCheckin();
  const raw = h.store.get('xiaoman-garden-save-v1');
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.checkin.streak, 1);
  assert.equal(parsed.settings.seenIntro, false);
  assert.ok(parsed.garden.length >= 4);
  assert.equal(parsed.items.length, 4);

  // 用同一份存档初始化另一个实例，验证恢复与「今日已签」状态
  const h2 = makeHarness(h.now, raw);
  h2.Game.boot();
  assert.equal(h2.Game.getState().checkin.streak, 1);
  assert.equal(h2.Game.checkinView().available, false);
});

test('重置会回到全新的花园', () => {
  const h = makeHarness();
  const { Game } = h;
  Game.boot();
  Game.claimCheckin();
  Game.plantSeed(0, 'daisy');
  Game.reset();
  const state = Game.getState();
  assert.equal(state.player.coins, 120);
  assert.equal(Game.getSeedItems('daisy').length, 2);
  assert.equal(state.items.length, 3);
  assert.equal(state.garden.filter(Boolean).length, 0);
  assert.equal(state.settings.seenIntro, false);
});

test('每一颗种子和成品花束都是唯一物品，品级/模板/品相可复现', () => {
  const h = makeHarness();
  const { Game, Data, Items } = h;
  Game.boot();
  const seeds = Game.getSeedItems();
  assert.equal(new Set(seeds.map((seed) => seed.id)).size, seeds.length);
  seeds.forEach((seed) => {
    assert.ok(seed.id.startsWith('itm_'));
    assert.ok(Data.itemGrades.some((grade) => grade.id === seed.grade));
    assert.ok(Data.itemTemplates.some((template) => template.id === seed.templateId));
    assert.ok(seed.wear >= 0 && seed.wear <= 1);
    const first = Items.variantColors(Data.flowerMap[seed.flowerId], seed);
    const second = Items.variantColors(Data.flowerMap[seed.flowerId], seed);
    assert.deepEqual(first.colors, second.colors);
    assert.equal(first.template.id, seed.templateId);
  });
});

test('种子模板会继承到同一件成品花束', () => {
  const h = makeHarness();
  const { Game, Data } = h;
  Game.boot();
  const seed = Game.getSeedItems('daisy')[0];
  assert.ok(seed);
  const planted = Game.plantSeed(0, seed.id);
  assert.equal(planted.ok, true);
  assert.equal(Game.getSeedItems('daisy').length, 1);
  h.advance(Data.flowerMap.daisy.growSeconds * 1000);
  Game.tick();
  const harvested = Game.harvest(0);
  assert.equal(harvested.ok, true);
  assert.equal(harvested.item.templateId, seed.templateId);
  assert.equal(harvested.item.patternSeed, seed.patternSeed);
  assert.equal(harvested.item.provenance.seedId, seed.id);
});

test('旧版数量库存会自动迁移成独立种子', () => {
  const oldSave = JSON.stringify({
    version: 1,
    player: { name: '旧园丁', coins: 88, fertilizer: 1, xp: 0 },
    inventory: { daisy: 2, tulip: 1 },
    potCount: 4,
    garden: [null, null, null, null],
    collection: {},
    checkin: { lastDate: null, streak: 0, total: 0 },
    settings: { sound: true, reduceMotion: false, speed: 1, seenIntro: true },
    meta: { hasOpened: true, lastSeen: 1, totalHarvested: 0, totalCare: 0 }
  });
  const h = makeHarness(null, oldSave);
  h.Game.boot();
  const state = h.Game.getState();
  assert.equal(state.items.length, 3);
  assert.equal(h.Game.getSeedItems('daisy').length, 2);
  assert.equal(h.Game.getSeedItems('tulip').length, 1);
  assert.equal(state.inventory, undefined);
});
