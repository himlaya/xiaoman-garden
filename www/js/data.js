/* 小满花园 · 内容与数值
 * 原型版的花期统一使用「分钟级」时间，方便在电脑和手机上快速体验。
 * 想调整难度，只要改这里的 growSeconds / bloomSeconds / 价格即可。
 */
(function () {
  'use strict';

  const FLOWERS = [
    {
      id: 'daisy',
      name: '白雏菊',
      en: 'Daisy',
      rarity: '普通',
      shape: 'daisy',
      seedPrice: 20,
      sellPrice: 46,
      growSeconds: 120,
      bloomSeconds: 45 * 60,
      xp: 12,
      bonusSeedChance: 0.28,
      colors: {
        petal: '#fffdf6',
        petalAlt: '#efe4cd',
        center: '#f3c84f',
        centerAlt: '#d9a92f',
        stem: '#6f9969',
        leaf: '#86ad79',
        accent: '#f4d681'
      },
      blurb: '清晨最早醒来的小花，像落在草地上的小太阳。',
      language: '纯洁与新的开始',
      cardLine: '给一点阳光，就会笑得很好看。'
    },
    {
      id: 'tulip',
      name: '郁金香',
      en: 'Tulip',
      rarity: '少见',
      shape: 'tulip',
      seedPrice: 35,
      sellPrice: 88,
      growSeconds: 240,
      bloomSeconds: 60 * 60,
      xp: 20,
      bonusSeedChance: 0.24,
      colors: {
        petal: '#f3a6a1',
        petalAlt: '#e97f8b',
        center: '#f8d4cd',
        centerAlt: '#c96070',
        stem: '#6d9664',
        leaf: '#8db483',
        accent: '#f7c56d'
      },
      blurb: '把春天收进一只杯子，风一吹就会轻轻点头。',
      language: '温柔与久别重逢',
      cardLine: '它开得慢，却从不失约。'
    },
    {
      id: 'hyacinth',
      name: '风信子',
      en: 'Hyacinth',
      rarity: '少见',
      shape: 'hyacinth',
      seedPrice: 60,
      sellPrice: 150,
      growSeconds: 360,
      bloomSeconds: 90 * 60,
      xp: 30,
      bonusSeedChance: 0.22,
      colors: {
        petal: '#b9a5dd',
        petalAlt: '#8f77c3',
        center: '#e5daf5',
        centerAlt: '#6d559d',
        stem: '#6c9565',
        leaf: '#89b17b',
        accent: '#f4d681'
      },
      blurb: '一串小小的紫色铃铛，把风里的香气摇得满院都是。',
      language: '重生与安静的欢喜',
      cardLine: '靠近一点闻，是下雨后的味道。'
    },
    {
      id: 'rose',
      name: '花园玫瑰',
      en: 'Rose',
      rarity: '稀有',
      shape: 'rose',
      seedPrice: 100,
      sellPrice: 252,
      growSeconds: 480,
      bloomSeconds: 120 * 60,
      xp: 45,
      bonusSeedChance: 0.18,
      colors: {
        petal: '#e7a0a4',
        petalAlt: '#c96f7f',
        center: '#f5cdca',
        centerAlt: '#a94d62',
        stem: '#5f8a5b',
        leaf: '#7ba674',
        accent: '#e7b85d'
      },
      blurb: '花瓣一层一层地打开，像把心事慢慢说给晚风听。',
      language: '偏爱与勇敢',
      cardLine: '好看的刺，都长在认真生活的人身上。'
    },
    {
      id: 'sunflower',
      name: '向日葵',
      en: 'Sunflower',
      rarity: '稀有',
      shape: 'sunflower',
      seedPrice: 150,
      sellPrice: 390,
      growSeconds: 600,
      bloomSeconds: 180 * 60,
      xp: 65,
      bonusSeedChance: 0.16,
      colors: {
        petal: '#f6c64d',
        petalAlt: '#e7a82d',
        center: '#8c5a3c',
        centerAlt: '#603d2a',
        stem: '#648e58',
        leaf: '#7fa96c',
        accent: '#f9df88'
      },
      blurb: '总是固执地朝着太阳，把圆圆的好心情挂在枝头。',
      language: '忠诚与热烈的生长',
      cardLine: '今天也要向着有光的地方。'
    },
    {
      id: 'hydrangea',
      name: '蓝绣球',
      en: 'Hydrangea',
      rarity: '珍稀',
      shape: 'hydrangea',
      seedPrice: 240,
      sellPrice: 640,
      growSeconds: 720,
      bloomSeconds: 240 * 60,
      xp: 95,
      bonusSeedChance: 0.12,
      colors: {
        petal: '#a9c6e6',
        petalAlt: '#7ea5d1',
        center: '#e8f0f8',
        centerAlt: '#648ab7',
        stem: '#618b62',
        leaf: '#7fa77d',
        accent: '#f4d681'
      },
      blurb: '一朵挨着一朵，把整个夏天的雨都攒成了蓝色的球。',
      language: '团圆与希望',
      cardLine: '小小一团，也能接住很大的天空。'
    },
    {
      id: 'lily',
      name: '铃兰',
      en: 'Lily of the Valley',
      rarity: '珍稀',
      shape: 'lily',
      seedPrice: 380,
      sellPrice: 1020,
      growSeconds: 900,
      bloomSeconds: 360 * 60,
      xp: 140,
      bonusSeedChance: 0.1,
      colors: {
        petal: '#fffef8',
        petalAlt: '#edf1dc',
        center: '#f3d477',
        centerAlt: '#c4a845',
        stem: '#648d5a',
        leaf: '#86ad72',
        accent: '#f4d681'
      },
      blurb: '藏在叶子下的一串小铃铛，安静得只让幸福听见。',
      language: '幸福的归来',
      cardLine: '最安静的花，往往带着最好的消息。'
    }
  ];

  const RARITY = {
    '普通': { className: 'common', label: '常见' },
    '少见': { className: 'uncommon', label: '少见' },
    '稀有': { className: 'rare', label: '稀有' },
    '珍稀': { className: 'legend', label: '珍稀' }
  };

  const STAGES = {
    seed: { label: '种子', min: 0 },
    sprout: { label: '发芽', min: 0.15 },
    bud: { label: '结蕾', min: 0.5 },
    bloom: { label: '盛开', min: 1 }
  };

  const CHECKIN_REWARDS = [
    { day: 1, seeds: { daisy: 1 }, coins: 20, label: '白雏菊' },
    { day: 2, seeds: { tulip: 1 }, coins: 30, label: '郁金香' },
    { day: 3, seeds: { hyacinth: 1 }, fertilizer: 1, label: '风信子' },
    { day: 4, seeds: { rose: 1 }, coins: 60, label: '花园玫瑰' },
    { day: 5, seeds: { sunflower: 1 }, coins: 80, label: '向日葵' },
    { day: 6, seeds: { hydrangea: 1 }, fertilizer: 2, label: '蓝绣球' },
    { day: 7, seeds: { lily: 1 }, coins: 150, fertilizer: 1, label: '铃兰' }
  ];

  const DAILY_QUESTS = [
    {
      id: 'water',
      title: '细心浇灌',
      desc: '给花儿浇水 2 次',
      metric: 'water',
      target: 2,
      reward: { coins: 30 }
    },
    {
      id: 'harvest',
      title: '花开有时',
      desc: '收获 1 朵盛开的花',
      metric: 'harvest',
      target: 1,
      reward: { fertilizer: 1 }
    }
  ];

  const POT_PRICES = [320, 680];
  const MAX_POTS = 6;
  const INITIAL_POTS = 4;
  const FERTILIZER_PRICE = 25;
  const FERTILIZER_BUNDLE = { price: 100, quantity: 5 };

  const CARE = {
    water: {
      cooldownSeconds: 20,
      instantProgress: 0.035,
      boostMultiplier: 1.5,
      boostSeconds: 90
    },
    fertilizer: {
      progressBoost: 0.18
    }
  };

  const XP_PER_LEVEL = 100;
  const LEVEL_TITLES = [
    { min: 1, title: '种子学徒' },
    { min: 3, title: '花园园丁' },
    { min: 5, title: '花间手艺人' },
    { min: 8, title: '草木知己' },
    { min: 12, title: '四季花艺师' }
  ];

  const TIPS = [
    '浇水后的 90 秒内，花儿会以 1.5 倍速度生长。',
    '施肥能立刻推进一截成长，肥料可以从签到、花市和今日任务里获得。',
    '花开后不要着急，花期内采摘还会得到新鲜加成。',
    '每天签到会送你一颗不一样的花种，连续签到第 7 天有铃兰。',
    '不同花的花期不一样，稀有花虽然等得久，但花束也更值钱。',
    '花儿会在离线时继续长大，下次回来记得看看它们。'
  ];

  const WEATHER = [
    { label: '晴', icon: 'sun', note: '适合晒晒太阳' },
    { label: '晴间多云', icon: 'cloud-sun', note: '风很轻' },
    { label: '微风', icon: 'wind', note: '叶子在唱歌' },
    { label: '小雨', icon: 'rain', note: '花儿偷偷喝水' }
  ];

  window.GameData = {
    version: 1,
    saveKey: 'xiaoman-garden-save-v1',
    flowers: FLOWERS,
    flowerMap: Object.fromEntries(FLOWERS.map(function (flower) { return [flower.id, flower]; })),
    rarity: RARITY,
    stages: STAGES,
    checkinRewards: CHECKIN_REWARDS,
    dailyQuests: DAILY_QUESTS,
    potPrices: POT_PRICES,
    maxPots: MAX_POTS,
    initialPots: INITIAL_POTS,
    fertilizerPrice: FERTILIZER_PRICE,
    fertilizerBundle: FERTILIZER_BUNDLE,
    care: CARE,
    xpPerLevel: XP_PER_LEVEL,
    levelTitles: LEVEL_TITLES,
    tips: TIPS,
    weather: WEATHER,
    starting: {
      name: '小园丁',
      coins: 120,
      fertilizer: 3,
      seeds: { daisy: 2, tulip: 1 }
    }
  };
})();
