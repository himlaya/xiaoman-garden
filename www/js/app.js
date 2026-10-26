/* 小满花园 · 界面与交互 */
(function () {
  'use strict';

  const DATA = window.GameData;
  const Game = window.Game;
  const Art = window.Art;

  const TABS = [
    { id: 'garden', label: '花园', icon: 'leaf' },
    { id: 'album', label: '花房', icon: 'book' },
    { id: 'shop', label: '花市', icon: 'shop' },
    { id: 'profile', label: '我的', icon: 'user' }
  ];

  const ICONS = {
    coin: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#f1c767"/><circle cx="12" cy="12" r="7.1" fill="none" stroke="#d9a943" stroke-width="1"></circle><path d="M12 7.5v9M12 11c-2.2 0-3.4-1.2-3.7-2.8 2 0 3.3 1 3.7 2.8ZM12 14.1c2.3 0 3.5-1.2 3.8-2.9-2.1 0-3.4 1-3.8 2.9Z" fill="none" stroke="#8d6529" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    fertilizer: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 8.5h9.8l-1 11H8.1l-1-11Z" fill="#c08b62"></path><path d="M8.8 8.5V6.7c0-1.6 1.1-2.7 3.2-2.7s3.2 1.1 3.2 2.7v1.8" fill="none" stroke="#9f6e4a" stroke-width="1.6" stroke-linecap="round"></path><path d="M9.2 12.1h5.6M9.5 14.3h4.9" stroke="#f5e6cf" stroke-width="1.1" stroke-linecap="round" opacity=".65"></path><path d="M12 18.2c-1.5-.5-2.3-1.5-2.4-2.8 1.5.1 2.3.9 2.4 2.8Zm.1 0c1.4-.5 2.2-1.5 2.3-2.8-1.5.1-2.3.9-2.3 2.8Z" fill="#8ba472"></path></svg>',
    drop: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8c2.5 3.6 5.6 6.6 5.6 10.1a5.6 5.6 0 1 1-11.2 0C6.4 10.4 9.5 7.4 12 3.8Z" fill="#8fc8d5"></path><path d="M9.4 14.6c.2 1.5 1.1 2.4 2.5 2.6" fill="none" stroke="#f6fcfc" stroke-width="1.4" stroke-linecap="round" opacity=".8"></path></svg>',
    calendar: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.6" y="5.3" width="16.8" height="15" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"></rect><path d="M3.6 9.5h16.8M8 3.6v3.2M16 3.6v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><path d="M8.3 12.5h2.1M13.7 12.5h2.1M8.3 16.1h2.1M13.7 16.1h2.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><circle cx="17.3" cy="6.2" r="2.6" fill="#df8567" stroke="#f6f0e3" stroke-width="1.2"></circle></svg>',
    leaf: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 4.4C10.2 4.6 5.2 8 5.2 13.2c0 1.5.5 2.8 1.4 3.8 4.4 4.3 12.5.2 13-12.6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path><path d="M5.1 20c1.3-4.3 4-7.2 8.2-9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>',
    book: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.1 5.5c2.7-.7 5.3-.3 7.9 1.4v13c-2.6-1.7-5.2-2.1-7.9-1.4v-13Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path><path d="M19.9 5.5c-2.7-.7-5.3-.3-7.9 1.4v13c2.6-1.7 5.2-2.1 7.9-1.4v-13Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path><path d="M7.2 9.1c1-.1 1.9 0 2.8.4M7.2 12c1-.1 1.9 0 2.8.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".7"></path></svg>',
    shop: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.1h16L18.5 20h-13L4 9.1Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path><path d="M3.2 9.1 5.5 4.2h13l2.3 4.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path><path d="M8.1 9.1c0 2.1 1.7 3.8 3.9 3.8s3.9-1.7 3.9-3.8" fill="none" stroke="currentColor" stroke-width="1.5"></path><path d="M9.4 16.4h5.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path></svg>',
    user: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.3" r="4" fill="none" stroke="currentColor" stroke-width="1.7"></circle><path d="M4.7 20.2c.6-3.9 3.5-6.2 7.3-6.2s6.7 2.3 7.3 6.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>',
    close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6.2 6.2 11.6 11.6M17.8 6.2 6.2 17.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>',
    plus: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.2v13.6M5.2 12h13.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>',
    arrow: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.3 12h13.2M13.2 6.5 18.7 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5.4 12.5 4.2 4.3 9-9.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    clock: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"></circle><path d="M12 7.3V12l3.2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    lock: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"></rect><path d="M8.2 10V7.7a3.8 3.8 0 0 1 7.6 0V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><circle cx="12" cy="15" r="1.2" fill="currentColor"></circle></svg>',
    sun: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.1" fill="#e9b64b"></circle><path d="M12 2.7v2.1M12 19.2v2.1M2.7 12h2.1M19.2 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" stroke="#d7a63e" stroke-width="1.4" stroke-linecap="round"></path></svg>',
    cloud: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 18.2h11.1a3.4 3.4 0 0 0 .4-6.8 5.4 5.4 0 0 0-10.3-1.2 4 4 0 0 0-1.2 8Z" fill="#fffdf8" stroke="#b6c8bd" stroke-width="1.3" stroke-linejoin="round"></path></svg>',
    cloudSun: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.1" cy="7.7" r="3" fill="#e9b64b"></circle><path d="M8.1 2.8v1.4M3.2 7.7h1.4M4.6 4.2l1 1M11.6 4.2l-1 1" stroke="#d7a63e" stroke-width="1.2" stroke-linecap="round"></path><path d="M8.2 19.3h10.3a3.2 3.2 0 0 0 .2-6.4 5.1 5.1 0 0 0-9.5-.9 3.8 3.8 0 0 0-1 7.3Z" fill="#fffdf8" stroke="#b6c8bd" stroke-width="1.3"></path></svg>',
    rain: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.3 15.6h11.5a3.2 3.2 0 0 0 .2-6.4 5.2 5.2 0 0 0-9.6-1 3.7 3.7 0 0 0-2 7.4Z" fill="#fffdf8" stroke="#a9bfc5" stroke-width="1.3"></path><path d="m8.2 18.3-1 2.4M12.2 18.3l-1 2.4M16.2 18.3l-1 2.4" stroke="#82b9cd" stroke-width="1.5" stroke-linecap="round"></path></svg>',
    wind: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.3 9.1h11.5c2.3 0 2.5-3.3.3-3.3-1.2 0-1.9.8-2 1.7M3.3 13h16c2.3 0 2.5 3.3.3 3.3-1.1 0-1.8-.7-2-1.6M3.3 17h7.2" fill="none" stroke="#90b6af" stroke-width="1.6" stroke-linecap="round"></path></svg>',
    bloom: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><g fill="#e8a699"><ellipse cx="12" cy="6.5" rx="3.2" ry="4.3"></ellipse><ellipse cx="17.2" cy="10.5" rx="3.2" ry="4.3" transform="rotate(72 17.2 10.5)"></ellipse><ellipse cx="15.2" cy="16.7" rx="3.2" ry="4.3" transform="rotate(144 15.2 16.7)"></ellipse><ellipse cx="8.8" cy="16.7" rx="3.2" ry="4.3" transform="rotate(216 8.8 16.7)"></ellipse><ellipse cx="6.8" cy="10.5" rx="3.2" ry="4.3" transform="rotate(288 6.8 10.5)"></ellipse></g><circle cx="12" cy="12" r="3" fill="#e7be5b"></circle></svg>',
    sparkle: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4c.6 4.5 2.1 6 6.6 6.6-4.5.6-6 2.1-6.6 6.6-.6-4.5-2.1-6-6.6-6.6 4.5-.6 6-2.1 6.6-6.6Z" fill="currentColor" opacity=".75"></path><path d="M18.1 15.2c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3Z" fill="currentColor" opacity=".45"></path></svg>',
    seed: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.1c4.4 1.3 6.6 4 6.5 8.1-.1 4.2-2.7 7.2-6.5 7.2s-6.4-3-6.5-7.2c-.1-4.1 2.1-6.8 6.5-8.1Z" fill="#cdb18a" opacity=".55"></path><path d="M12 7.2c1.3 2.7 2 4.6 1.9 6.1-.1 1.3-.9 2.2-1.9 2.9-1-.7-1.8-1.6-1.9-2.9-.1-1.5.6-3.4 1.9-6.1Z" fill="#8ba17a"></path></svg>',
    heart: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2C5.9 16.2 3.4 12.7 3.4 9.2A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.6 3.2c0 3.5-2.5 7-8.6 11Z" fill="currentColor" opacity=".85"></path></svg>'
  };

  const els = {
    topbar: document.getElementById('topbar'),
    screen: document.getElementById('screen-root'),
    tabbar: document.getElementById('tabbar'),
    modal: document.getElementById('modal-root'),
    toast: document.getElementById('toast-root'),
    fx: document.getElementById('fx-layer'),
    backdropLeft: document.getElementById('backdrop-left'),
    backdropRight: document.getElementById('backdrop-right')
  };

  let activeTab = 'garden';
  let modalState = null;
  let lastFocused = null;
  let highlightPot = false;
  let tickHandle = null;
  let lastSavedAt = 0;
  let audioContext = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function numberLabel(value) {
    const number = Number(value) || 0;
    try {
      return new Intl.NumberFormat('zh-CN').format(number);
    } catch (error) {
      return String(number);
    }
  }

  function formatSpan(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    if (total < 60) return total + '秒';
    if (total < 3600) {
      const minutes = Math.floor(total / 60);
      const rest = total % 60;
      return rest ? minutes + '分' + rest + '秒' : minutes + '分钟';
    }
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (minutes === 0) return hours + '小时';
    return hours + '小时' + minutes + '分';
  }

  function formatCountdown(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    if (total <= 0) return '马上就好';
    if (total < 60) return total + '秒';
    if (total < 3600) {
      const minutes = Math.floor(total / 60);
      const rest = total % 60;
      return rest ? minutes + '分' + String(rest).padStart(2, '0') + '秒' : minutes + '分钟';
    }
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return hours + '小时' + (minutes ? minutes + '分' : '');
  }

  function prettyDate(date) {
    const d = date || new Date();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 · 周' + weekdays[d.getDay()];
  }

  function greeting(date) {
    const hour = (date || new Date()).getHours();
    if (hour < 5) return '夜深了';
    if (hour < 11) return '早安';
    if (hour < 14) return '午安';
    if (hour < 18) return '下午好';
    return '晚上好';
  }

  function dayOfYear(date) {
    const d = date || new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function currentWeather() {
    return DATA.weather[dayOfYear() % DATA.weather.length];
  }

  function weatherIcon(type) {
    if (type === 'cloud-sun') return ICONS.cloudSun;
    if (type === 'rain') return ICONS.rain;
    if (type === 'wind') return ICONS.wind;
    return ICONS.sun;
  }

  function iconButton(action, label, content, extraClass) {
    return '<button class="icon-btn ' + (extraClass || '') + '" data-action="' + action + '" aria-label="' + esc(label) + '">' + content + '</button>';
  }

  function rarityClass(rarity) {
    return 'rarity-' + ((DATA.rarity[rarity] || DATA.rarity['普通']).className);
  }

  function rarityLabel(rarity) {
    return (DATA.rarity[rarity] || DATA.rarity['普通']).label;
  }

  function seedIdFromReward(reward) {
    if (!reward || !reward.seeds) return null;
    return Object.keys(reward.seeds).find(function (id) { return DATA.flowerMap[id]; }) || null;
  }

  function rewardText(reward) {
    if (!reward) return '';
    const parts = [];
    if (reward.seeds) {
      Object.keys(reward.seeds).forEach(function (id) {
        const flower = DATA.flowerMap[id];
        if (flower) parts.push(flower.name + '种子 ×' + reward.seeds[id]);
      });
    }
    if (reward.coins) parts.push(reward.coins + '金币');
    if (reward.fertilizer) parts.push(reward.fertilizer + '肥料');
    return parts.join(' · ');
  }

  function rewardExtras(reward) {
    if (!reward) return '';
    const parts = [];
    if (reward.coins) parts.push('+' + reward.coins + '币');
    if (reward.fertilizer) parts.push('+' + reward.fertilizer + '肥');
    return parts.join(' · ');
  }

  function rewardChips(reward) {
    if (!reward) return '';
    const chips = [];
    if (reward.seeds) {
      Object.keys(reward.seeds).forEach(function (id) {
        const flower = DATA.flowerMap[id];
        if (flower) chips.push('<span class="reward-chip seed-chip">' + ICONS.seed + '<span>' + esc(flower.name) + '种子 ×' + reward.seeds[id] + '</span></span>');
      });
    }
    if (reward.coins) chips.push('<span class="reward-chip coin-chip">' + ICONS.coin + '<span>+' + reward.coins + ' 金币</span></span>');
    if (reward.fertilizer) chips.push('<span class="reward-chip fert-chip">' + ICONS.fertilizer + '<span>+' + reward.fertilizer + ' 肥料</span></span>');
    return chips.join('');
  }

  function shortReward(reward) {
    if (!reward) return '';
    if (reward.coins) return '+' + reward.coins + ' 金币';
    if (reward.fertilizer) return '+' + reward.fertilizer + ' 肥料';
    return rewardText(reward);
  }

  function valueOrEmpty(value) {
    return value === 0 ? '0' : (value || '');
  }

  function freshnessMeta(fresh) {
    if (!fresh) return '';
    if (fresh.multiplier > 1) return '新鲜加成 +' + Math.round((fresh.multiplier - 1) * 100) + '%';
    if (fresh.multiplier < 1) return '花束价值 ' + Math.round(fresh.multiplier * 100) + '%';
    return '新鲜度刚好';
  }

  function errorMessage(reason) {
    const messages = {
      coins: '金币还差一点，先去采一束花吧。',
      no_fertilizer: '肥料用完了，花市里可以补充。',
      no_seed: '这颗种子已经用完啦。',
      cooldown: '土壤还湿润着，稍等一会儿再浇。',
      bloomed: '它已经盛开了，快去采摘吧。',
      empty: '这里还没有种花。',
      occupied: '这个花盆已经有花了。',
      already_claimed: '今天已经领过啦，明天再来。',
      not_done: '这件事还没完成。',
      max_pots: '花园里的花盆已经全部扩建好了。',
      unknown_flower: '没有找到这颗种子。',
      bad_slot: '这个花盆还不属于你。'
    };
    return messages[reason] || '再试一次吧。';
  }

  /* ---------------- 顶部与导航 ---------------- */

  function renderTopbar() {
    const state = Game.getState();
    const checkin = Game.getCheckinShortcut();
    els.topbar.innerHTML =
      '<button class="brand" data-action="go-home" aria-label="回到花园">' +
        '<span class="brand-mark">' + Art.logo() + '</span>' +
        '<span class="brand-copy"><strong>小满花园</strong><small>XIAOMAN GARDEN</small></span>' +
      '</button>' +
      '<div class="top-actions">' +
        '<button class="resource-pill coin-pill" data-action="go-shop" aria-label="金币 ' + numberLabel(state.player.coins) + '，去花市">' + ICONS.coin + '<b>' + numberLabel(state.player.coins) + '</b></button>' +
        '<button class="resource-pill fert-pill" data-action="go-shop" aria-label="肥料 ' + numberLabel(state.player.fertilizer) + '，去花市">' + ICONS.fertilizer + '<b>' + numberLabel(state.player.fertilizer) + '</b></button>' +
        '<button class="calendar-button ' + (checkin.available ? 'has-reward' : '') + '" data-action="open-checkin" aria-label="' + (checkin.available ? '今日签到可以领取' : '今日已签到，查看签到记录') + '">' +
          ICONS.calendar +
          (checkin.available ? '<span class="checkin-dot" aria-hidden="true"></span>' : '') +
        '</button>' +
      '</div>';
  }

  function renderTabbar() {
    els.tabbar.innerHTML = TABS.map(function (tab) {
      const active = tab.id === activeTab;
      return '<button class="tab-button' + (active ? ' active' : '') + '" data-action="switch-tab" data-tab="' + tab.id + '" aria-current="' + (active ? 'page' : 'false') + '">' +
        '<span class="tab-icon">' + ICONS[tab.icon] + '</span>' +
        '<span class="tab-label">' + tab.label + '</span>' +
        '<span class="tab-dot" aria-hidden="true"></span>' +
      '</button>';
    }).join('');
  }

  /* ---------------- 花园 ---------------- */

  function renderPlot(view, index, totalPotCount) {
    const slot = view.slot;
    const number = String(slot + 1).padStart(2, '0');
    if (view.empty) {
      const guide = highlightPot && slot === 0 ? ' guide-target' : '';
      return '<article class="plot plot-empty' + guide + '" data-slot="' + slot + '">' +
        '<div class="plot-head"><span class="plot-number">' + number + '</span><span class="status-pill status-idle">空闲</span></div>' +
        '<button class="plot-scene scene-empty" data-action="open-seeds" data-slot="' + slot + '" aria-label="在 ' + number + ' 号花盆种花">' +
          '<span class="empty-mark">' + ICONS.plus + '</span>' +
          '<span class="empty-label">种一颗花</span>' +
          '<span class="pot pot-empty" aria-hidden="true"><span class="pot-rim"></span><span class="pot-body"><i></i></span></span>' +
        '</button>' +
        '<div class="plot-info plot-info-empty">' +
          '<p class="plot-name">等一颗种子</p>' +
          '<button class="text-action" data-action="open-seeds" data-slot="' + slot + '">去选种子 ' + ICONS.arrow + '</button>' +
        '</div>' +
      '</article>';
    }

    const flower = view.flower;
    const bloom = view.isBloom;
    const classes = ['plot', bloom ? 'plot-bloom' : 'plot-growing', view.buffed ? 'is-buffed' : '', rarityClass(flower.rarity)].join(' ');
    const careActions = bloom ? '' :
      '<div class="plot-actions">' +
        '<button class="care-button water-button' + (view.waterWait > 0 ? ' is-waiting' : '') + '" data-action="water" data-slot="' + slot + '"' + (view.waterWait > 0 ? ' disabled' : '') + ' aria-label="给' + esc(flower.name) + '浇水">' +
          ICONS.drop + '<span class="js-water-label">' + (view.waterWait > 0 ? view.waterWait + 's' : '浇水') + '</span>' +
        '</button>' +
        '<button class="care-button fert-button" data-action="fertilize" data-slot="' + slot + '" aria-label="给' + esc(flower.name) + '施肥">' +
          ICONS.fertilizer + '<span>施肥</span>' +
        '</button>' +
      '</div>';

    const bloomPanel = bloom
      ? '<div class="bloom-info">' +
          '<span class="freshness-label js-fresh-label fresh-' + view.fresh.tone + '">' + view.fresh.label + ' · ' + freshnessMeta(view.fresh) + '</span>' +
          '<span class="bloom-time js-bloom-time">' + (view.fresh.remainingSeconds > 0 ? '花期还剩 ' + formatCountdown(view.fresh.remainingSeconds) : '已过盛花期') + '</span>' +
        '</div>' +
        '<button class="harvest-button" data-action="harvest" data-slot="' + slot + '">' +
          '<span class="harvest-label">采摘花束</span>' +
          '<span class="harvest-reward">' + ICONS.coin + '<b class="js-harvest-reward">' + view.harvestCoins + '</b></span>' +
        '</button>'
      : '';

    return '<article class="' + classes + '" data-slot="' + slot + '" data-stage="' + view.stage + '">' +
      '<div class="plot-head">' +
        '<span class="plot-number">' + number + '</span>' +
        '<span class="status-pill ' + (bloom ? 'status-bloom' : (view.buffed ? 'status-water' : 'status-growing')) + ' js-status">' +
          (bloom ? '待采摘' : (view.buffed ? '水润中' : '生长中')) +
        '</span>' +
      '</div>' +
      '<button class="plot-scene scene-planted" data-action="open-plant" data-slot="' + slot + '" aria-label="查看' + esc(flower.name) + '的生长情况">' +
        '<span class="scene-glow" aria-hidden="true"></span>' +
        '<span class="plant-holder">' + Art.flower(flower.id, view.stage) + '</span>' +
        (bloom ? '<span class="bloom-sparkles" aria-hidden="true"><i></i><i></i><i></i></span>' : '') +
        '<span class="pot" aria-hidden="true"><span class="pot-rim"></span><span class="pot-body"><i></i></span></span>' +
        (view.buffed ? '<span class="buff-tag" aria-hidden="true">' + ICONS.drop + '水润 1.5×</span>' : '') +
      '</button>' +
      '<div class="plot-info">' +
        '<div class="plot-title-row">' +
          '<span class="plot-name">' + esc(flower.name) + '</span>' +
          '<span class="rarity-text ' + rarityClass(flower.rarity) + '">' + rarityLabel(flower.rarity) + '</span>' +
        '</div>' +
        (bloom
          ? bloomPanel
          : '<div class="growth-track" aria-hidden="true"><span class="js-growth-fill" style="width:' + view.progressPercent + '%"></span></div>' +
            '<div class="plot-meta-row">' +
              '<span class="grow-time js-timer">还需 ' + formatCountdown(view.remainingSeconds) + '</span>' +
              '<span class="stage-text js-stage">' + view.stageLabel + ' · ' + view.progressPercent + '%</span>' +
            '</div>' +
            careActions
        ) +
      '</div>' +
    '</article>';
  }

  function renderLockedPlot() {
    const price = Game.nextPotPrice();
    if (price === null) return '';
    return '<article class="plot plot-locked">' +
      '<div class="plot-head"><span class="plot-number">新</span><span class="status-pill status-idle">未开拓</span></div>' +
      '<div class="locked-scene"><span class="lock-orb">' + ICONS.lock + '</span><span class="locked-grass"></span></div>' +
      '<div class="plot-info locked-info">' +
        '<p class="plot-name">再添一只花盆</p>' +
        '<button class="text-action" data-action="open-pot-shop">' + ICONS.coin + ' ' + price + ' 扩建</button>' +
      '</div>' +
    '</article>';
  }

  function renderQuestRows() {
    const quests = Game.dailyQuestViews();
    return quests.map(function (quest) {
      const icon = quest.id === 'harvest' ? ICONS.bloom : ICONS.drop;
      let control = '';
      if (quest.claimed) {
        control = '<span class="quest-done">' + ICONS.check + ' 已领</span>';
      } else if (quest.done) {
        control = '<button class="quest-claim" data-action="claim-quest" data-quest="' + quest.id + '">领取</button>';
      } else {
        control = '<span class="quest-progress">' + quest.progress + '/' + quest.target + '</span>';
      }
      return '<div class="quest-row">' +
        '<span class="quest-icon ' + (quest.id === 'harvest' ? 'rose' : 'water') + '">' + icon + '</span>' +
        '<div class="quest-copy">' +
          '<div class="quest-title-line"><strong>' + quest.title + '</strong><span class="quest-reward">' + shortReward(quest.reward) + '</span></div>' +
          '<p>' + quest.desc + '</p>' +
          '<div class="quest-mini-track"><span style="width:' + Math.round((quest.progress / quest.target) * 100) + '%"></span></div>' +
        '</div>' +
        '<div class="quest-control">' + control + '</div>' +
      '</div>';
    }).join('');
  }

  function renderGardenScreen() {
    const state = Game.getState();
    const views = Game.getGardenViews();
    const stats = Game.stats();
    const weather = currentWeather();
    const checkin = Game.checkinView();
    const planted = views.filter(function (view) { return view.planted; });
    const blooms = planted.filter(function (view) { return view.isBloom; });
    const featuredView = blooms[0] || planted.slice().sort(function (a, b) { return b.progress - a.progress; })[0];
    const featuredFlower = featuredView ? featuredView.flower : DATA.flowerMap.daisy;
    const summary = blooms.length
      ? '有 ' + blooms.length + ' 朵花正在盛开，去采一束好心情。'
      : (planted.length
        ? planted.length + ' 朵花正在悄悄长大，记得来看看。'
        : '花盆空着，种下今天的第一颗种子吧。');
    const checkinStrip = checkin.available
      ? '<button class="checkin-strip" data-action="open-checkin">' +
          '<span class="strip-icon">' + ICONS.calendar + '</span>' +
          '<span class="strip-copy"><strong>今日花种已备好</strong><small>第 ' + checkin.dayNumber + ' 天 · 领「' + checkin.reward.label + '」种子</small></span>' +
          '<span class="strip-action">去签到 ' + ICONS.arrow + '</span>' +
        '</button>'
      : '';
    const plots = views.map(function (view) { return renderPlot(view, view.slot, state.potCount); }).join('');
    const locked = state.potCount < DATA.maxPots ? renderLockedPlot() : '';
    const tip = DATA.tips[dayOfYear() % DATA.tips.length];

    return '<section class="screen garden-screen">' +
      '<section class="garden-hero">' +
        '<span class="hero-sun" aria-hidden="true"></span>' +
        '<span class="hero-cloud cloud-a" aria-hidden="true"></span>' +
        '<span class="hero-cloud cloud-b" aria-hidden="true"></span>' +
        '<span class="hero-butterfly" aria-hidden="true"><i></i><i></i></span>' +
        '<div class="hero-copy">' +
          '<div class="hero-date"><span>' + prettyDate() + '</span><span class="hero-weather">' + weatherIcon(weather.icon) + weather.label + '</span></div>' +
          '<h1>' + greeting() + '，<em>' + esc(state.player.name) + '</em></h1>' +
          '<p>' + summary + '</p>' +
          '<div class="hero-stats"><span>花园第 ' + stats.days + ' 天</span><span>' + blooms.length + ' 朵盛开</span></div>' +
        '</div>' +
        '<div class="hero-art' + (planted.length ? '' : ' ghost') + '" aria-hidden="true">' + Art.flower(featuredFlower.id, bloomStageForHero(featuredView)) + '</div>' +
        '<svg class="hero-hills" viewBox="0 0 460 130" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 C60 55 110 107 173 80 C232 55 286 112 341 85 C390 62 426 79 460 62V130H0Z" fill="#d7e2c4"></path><path d="M0 107 C76 82 131 119 209 99 C282 81 337 119 392 100 C423 90 443 96 460 88V130H0Z" fill="#c6d7af"></path><path d="M0 119 C84 101 158 127 245 114 C333 101 395 126 460 112V130H0Z" fill="#b6cba0"></path></svg>' +
      '</section>' +
      checkinStrip +
      '<div class="section-heading"><div><h2>我的花圃</h2><p>' + planted.length + ' / ' + state.potCount + ' 盆有花</p></div><button class="section-link" data-action="go-shop">逛花市 ' + ICONS.arrow + '</button></div>' +
      '<div class="plot-grid">' + plots + locked + '</div>' +
      '<div class="section-heading quest-heading"><div><h2>今日花事</h2><p>每天 0 点更新</p></div><span class="quest-count">' + (checkin.available ? '签到待领' : '已签到') + '</span></div>' +
      '<div class="quest-card">' + renderQuestRows() + '</div>' +
      '<aside class="garden-tip"><span class="tip-mark">' + ICONS.sparkle + '</span><p><strong>园丁小贴士</strong>' + tip + '</p></aside>' +
    '</section>';
  }

  function bloomStageForHero(view) {
    if (!view) return 'bloom';
    if (view.isBloom) return 'bloom';
    return 'bud';
  }

  /* ---------------- 花房 ---------------- */

  function renderAlbumScreen() {
    const state = Game.getState();
    const stats = Game.stats();
    const percent = Math.round((stats.collected / stats.totalFlowers) * 100);
    const cards = DATA.flowers.map(function (flower, index) {
      const entry = state.collection[flower.id];
      const owned = !!entry;
      return '<article class="album-card ' + (owned ? 'album-owned ' : 'album-locked ') + rarityClass(flower.rarity) + '">' +
        '<div class="album-art">' +
          (owned ? Art.flower(flower.id, 'bloom') : '<div class="silhouette">' + Art.flower(flower.id, 'bud') + '</div>') +
          '<span class="album-index">NO.' + String(index + 1).padStart(2, '0') + '</span>' +
          '<span class="album-rarity ' + rarityClass(flower.rarity) + '">' + (owned ? rarityLabel(flower.rarity) : '未遇见') + '</span>' +
        '</div>' +
        '<div class="album-info">' +
          '<h3>' + (owned ? esc(flower.name) : '？？？') + '</h3>' +
          '<p class="album-line">' + (owned ? esc(flower.cardLine) : '在花市或签到里，遇见一颗新的种子。') + '</p>' +
          '<div class="album-meta"><span>' + (owned ? '已收获 ' + entry.count + ' 次' : '花期 ' + formatSpan(flower.bloomSeconds)) + '</span><span>' + esc(flower.en) + '</span></div>' +
        '</div>' +
      '</article>';
    }).join('');

    return '<section class="screen album-screen">' +
      '<div class="page-heading">' +
        '<p class="eyebrow">GARDEN JOURNAL</p>' +
        '<h1>花房手记</h1>' +
        '<p>每一次盛开，都会被好好记下来。</p>' +
      '</div>' +
      '<div class="album-summary">' +
        '<div class="collection-ring" style="--ring-progress:' + percent + '%"><span>' + stats.collected + '<small>/' + stats.totalFlowers + '</small></span></div>' +
        '<div class="album-summary-copy"><strong>' + (stats.collected === stats.totalFlowers ? '花园图鉴全部集齐' : '还有花在等你') + '</strong><p>' + (stats.collected === stats.totalFlowers ? '每一种心情，都开过一遍了。' : '种下、等待，然后把它的名字写进这里。') + '</p></div>' +
      '</div>' +
      '<div class="album-stats">' +
        '<div><strong>' + stats.totalHarvested + '</strong><span>累计采摘</span></div>' +
        '<div><strong>' + stats.days + '</strong><span>花园时光</span></div>' +
        '<div><strong>' + stats.totalCare + '</strong><span>照料次数</span></div>' +
      '</div>' +
      '<div class="album-grid">' + cards + '</div>' +
      '<p class="album-note">' + ICONS.leaf + ' 采摘过的花会留在手记里，再次种下也不会消失。</p>' +
    '</section>';
  }

  /* ---------------- 花市 ---------------- */

  function renderShopScreen() {
    const state = Game.getState();
    const seedCards = DATA.flowers.map(function (flower) {
      const owned = state.inventory[flower.id] || 0;
      const poor = state.player.coins < flower.seedPrice;
      return '<article class="seed-card">' +
        '<div class="seed-art ' + rarityClass(flower.rarity) + '">' +
          Art.flower(flower.id, 'bloom') +
          '<span class="rarity-chip ' + rarityClass(flower.rarity) + '">' + rarityLabel(flower.rarity) + '</span>' +
        '</div>' +
        '<div class="seed-body">' +
          '<div class="seed-title-row"><h3>' + esc(flower.name) + '</h3><span class="seed-owned">已有 ' + owned + ' 颗</span></div>' +
          '<p class="seed-blurb">' + esc(flower.blurb) + '</p>' +
          '<div class="seed-facts"><span>' + ICONS.clock + ' 生长 ' + formatSpan(flower.growSeconds) + '</span><span>' + ICONS.bloom + ' 花期 ' + formatSpan(flower.bloomSeconds) + '</span></div>' +
        '</div>' +
        '<button class="seed-buy ' + (poor ? 'is-poor' : '') + '" data-action="buy-seed" data-flower="' + flower.id + '" aria-label="购买' + esc(flower.name) + '种子，' + flower.seedPrice + '金币">' +
          '<span class="price">' + ICONS.coin + flower.seedPrice + '</span>' +
          '<span class="buy-label">买一颗</span>' +
        '</button>' +
      '</article>';
    }).join('');

    const potPrice = Game.nextPotPrice();
    const potCard = potPrice === null
      ? '<div class="item-card pot-item complete"><span class="item-icon">' + ICONS.check + '</span><div class="item-copy"><h3>花圃已满</h3><p>六只花盆都在晒太阳。</p></div></div>'
      : '<div class="item-card pot-item"><span class="item-icon">' + ICONS.leaf + '</span><div class="item-copy"><h3>扩建一只花盆</h3><p>为下一朵花留一个位置。</p></div><button class="small-buy" data-action="buy-pot">' + ICONS.coin + potPrice + '</button></div>';

    return '<section class="screen shop-screen">' +
      '<div class="page-heading">' +
        '<p class="eyebrow">FLOWER MARKET</p>' +
        '<h1>花市</h1>' +
        '<p>挑一颗种子，把春天带回家。</p>' +
      '</div>' +
      '<div class="market-banner">' +
        '<div class="market-banner-copy"><span>今日的花市</span><strong>慢慢挑，不着急</strong><p>种子种下后，会在现实时间里悄悄生长。</p></div>' +
        '<div class="market-banner-art">' + Art.seedPacket('tulip') + '</div>' +
      '</div>' +
      '<div class="section-heading"><div><h2>种子铺</h2><p>每种花都有自己的花期</p></div><span class="wallet-note">' + ICONS.coin + numberLabel(state.player.coins) + '</span></div>' +
      '<div class="seed-list">' + seedCards + '</div>' +
      '<div class="section-heading"><div><h2>园艺小物</h2><p>让等待轻松一点</p></div></div>' +
      '<div class="item-grid">' +
        '<div class="item-card"><span class="item-icon fert">' + ICONS.fertilizer + '</span><div class="item-copy"><h3>一小袋肥料</h3><p>立刻推进一段成长。</p></div><button class="small-buy" data-action="buy-fertilizer" data-bundle="0" aria-label="买一份肥料，' + DATA.fertilizerPrice + '金币">' + ICONS.coin + DATA.fertilizerPrice + '</button></div>' +
        '<div class="item-card"><span class="item-icon fert">' + ICONS.fertilizer + '</span><div class="item-copy"><h3>园艺五连包</h3><p>五小袋，多省一点。</p></div><button class="small-buy" data-action="buy-fertilizer" data-bundle="1" aria-label="买五份肥料，' + DATA.fertilizerBundle.price + '金币">' + ICONS.coin + DATA.fertilizerBundle.price + '</button></div>' +
        potCard +
      '</div>' +
      '<p class="shop-note">' + ICONS.sparkle + ' 金币来自采摘花束与每日签到；花市每天不打烊。</p>' +
    '</section>';
  }

  /* ---------------- 我的 ---------------- */

  function renderProfileScreen() {
    const state = Game.getState();
    const stats = Game.stats();
    const level = Game.levelInfo(state.player.xp);
    const checkin = Game.checkinView();
    const speedOptions = [1, 60, 300];
    const localVersion = (window.XIAOMAN_VERSION && window.XIAOMAN_VERSION.version) || '0.1.0';
    const localBuild = (window.XIAOMAN_VERSION && window.XIAOMAN_VERSION.build) || 1;
    return '<section class="screen profile-screen">' +
      '<div class="page-heading"><p class="eyebrow">THE GARDENER</p><h1>园丁手帐</h1><p>把日子过成一座花园。</p></div>' +
      '<div class="profile-card">' +
        '<div class="avatar">' + Art.flower('rose', 'bloom') + '<span class="avatar-badge">Lv.' + level.level + '</span></div>' +
        '<div class="profile-copy"><span class="profile-kicker">' + level.title + '</span><h2>' + esc(state.player.name) + '</h2><p>花园第 ' + stats.days + ' 天 · 已照料 ' + stats.totalCare + ' 次</p></div>' +
      '</div>' +
      '<div class="level-card">' +
        '<div class="level-top"><span>花艺等级 Lv.' + level.level + '</span><span>' + level.current + ' / ' + level.need + ' 花艺值</span></div>' +
        '<div class="level-track"><span style="width:' + level.percent + '%"></span></div>' +
        '<p>再采几束花，就能长成更厉害的园丁。</p>' +
      '</div>' +
      '<div class="profile-stats">' +
        '<div><strong>' + stats.totalHarvested + '</strong><span>累计采摘</span></div>' +
        '<div><strong>' + stats.collected + '/' + stats.totalFlowers + '</strong><span>花房收集</span></div>' +
        '<div><strong>' + stats.streak + '</strong><span>连续签到</span></div>' +
        '<div><strong>' + stats.days + '</strong><span>花园天数</span></div>' +
      '</div>' +
      '<div class="settings-card">' +
        '<div class="settings-head"><h2>花园设置</h2><span>安静地种花</span></div>' +
        '<div class="setting-row name-row"><div class="setting-copy"><strong>花园名字</strong><p>你的落款与门牌</p></div>' +
          '<div class="name-edit"><input class="name-input" data-name-input maxlength="12" value="' + esc(state.player.name) + '" aria-label="输入花园名字"><button class="name-save" data-action="save-name">改成这个</button></div>' +
        '</div>' +
        '<div class="setting-row"><div class="setting-copy"><strong>签到小花册</strong><p>' + (checkin.available ? '今天的花种还等着你' : '今天已签到 · 第 ' + checkin.dayNumber + ' 天') + '</p></div><button class="text-action simple" data-action="open-checkin">' + (checkin.available ? '去领取' : '查看') + ' ' + ICONS.arrow + '</button></div>' +
        '<div class="setting-row"><div class="setting-copy"><strong>音效</strong><p>花开和浇水的小声音</p></div><button class="switch ' + (state.settings.sound ? 'is-on' : '') + '" data-action="toggle-sound" role="switch" aria-checked="' + (state.settings.sound ? 'true' : 'false') + '" aria-label="开关音效"><span></span></button></div>' +
        '<div class="setting-row"><div class="setting-copy"><strong>减少动效</strong><p>喜欢更安静的画面</p></div><button class="switch ' + (state.settings.reduceMotion ? 'is-on' : '') + '" data-action="toggle-motion" role="switch" aria-checked="' + (state.settings.reduceMotion ? 'true' : 'false') + '" aria-label="开关减少动效"><span></span></button></div>' +
        '<div class="setting-row"><div class="setting-copy"><strong>再看一遍引导</strong><p>重新认识这座小花园</p></div><button class="text-action simple" data-action="replay-intro">看看 ' + ICONS.arrow + '</button></div>' +
      '</div>' +
      '<details class="debug-card">' +
        '<summary><span>原型调试 · 时光沙漏</span><small>仅用于体验测试</small></summary>' +
        '<div class="debug-body">' +
          '<p>加速生长时间，不改变收获价值；只影响这台设备上的当前存档。</p>' +
          '<div class="speed-options">' + speedOptions.map(function (speed) {
            return '<button class="' + (state.settings.speed === speed ? 'active' : '') + '" data-action="set-speed" data-speed="' + speed + '">' + (speed === 1 ? '正常速度' : speed + '×') + '</button>';
          }).join('') + '</div>' +
          '<p class="debug-hint">原型版花期是分钟级的，正常速度下也可以很快看到花开。</p>' +
        '</div>' +
      '</details>' +
      '<div class="danger-zone"><button class="reset-link" data-action="open-reset">重新打理这座花园</button><p>会清空当前存档，重新开始。</p></div>' +
      '<footer class="version-line">小满花园 · 原型 <button class="version-check" type="button" data-check-update title="检查网页版本更新">v' + esc(localVersion) + ' · 检查更新</button> <span>构建 ' + esc(localBuild) + '</span></footer>' +
    '</section>';
  }

  /* ---------------- 整体渲染 ---------------- */

  function renderScreen() {
    if (activeTab === 'album') {
      els.screen.innerHTML = renderAlbumScreen();
    } else if (activeTab === 'shop') {
      els.screen.innerHTML = renderShopScreen();
    } else if (activeTab === 'profile') {
      els.screen.innerHTML = renderProfileScreen();
    } else {
      els.screen.innerHTML = renderGardenScreen();
    }
  }

  function renderAll(options) {
    const opts = options || {};
    const previousScroll = els.screen.scrollTop;
    renderTopbar();
    renderScreen();
    renderTabbar();
    if (opts.resetScroll) {
      els.screen.scrollTop = 0;
    } else {
      els.screen.scrollTop = previousScroll;
    }
    if (modalState) paintModal(false);
  }

  function switchTab(tab) {
    if (!TABS.some(function (item) { return item.id === tab; })) return;
    const changed = activeTab !== tab;
    activeTab = tab;
    closeModal();
    renderAll({ resetScroll: true });
    if (changed) {
      els.screen.classList.remove('tab-enter');
      void els.screen.offsetWidth;
      els.screen.classList.add('tab-enter');
      window.setTimeout(function () { els.screen.classList.remove('tab-enter'); }, 520);
    }
  }

  /* ---------------- 弹窗 ---------------- */

  function openModal(type, payload) {
    if (!modalState) lastFocused = document.activeElement;
    modalState = { type: type, payload: payload || {} };
    document.body.classList.add('modal-open');
    paintModal(true);
  }

  function closeModal() {
    const wasIntro = modalState && modalState.type === 'intro';
    modalState = null;
    els.modal.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (wasIntro) {
      Game.setSetting('seenIntro', true);
      highlightPot = false;
    }
    if (lastFocused && typeof lastFocused.focus === 'function' && document.contains(lastFocused)) {
      try { lastFocused.focus({ preventScroll: true }); } catch (error) { /* ignore */ }
    }
    lastFocused = null;
  }

  function paintModal(focus) {
    if (!modalState) {
      els.modal.innerHTML = '';
      return;
    }
    const content = modalContent(modalState);
    if (!content) {
      els.modal.innerHTML = '';
      return;
    }
    els.modal.innerHTML = '<div class="modal-layer">' +
      '<div class="modal-backdrop" data-action="close-modal"></div>' +
      '<section class="sheet sheet-' + modalState.type + '" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">' +
        '<span class="sheet-grip" aria-hidden="true"></span>' +
        content +
      '</section>' +
    '</div>';
    if (focus) {
      window.requestAnimationFrame(function () {
        const sheet = els.modal.querySelector('.sheet');
        if (!sheet) return;
        const preferred = sheet.querySelector('[data-autofocus]') || sheet.querySelector('.sheet-close') || sheet;
        try { preferred.focus({ preventScroll: true }); } catch (error) { sheet.focus({ preventScroll: true }); }
      });
    }
  }

  function sheetHeader(eyebrow, title) {
    return '<div class="sheet-head"><div><p class="eyebrow">' + eyebrow + '</p><h2 id="modal-title">' + title + '</h2></div>' +
      '<button class="sheet-close" data-action="close-modal" aria-label="关闭">' + ICONS.close + '</button></div>';
  }

  function modalContent(current) {
    if (current.type === 'checkin') return checkinModal();
    if (current.type === 'seeds') return seedPickerModal(current.payload);
    if (current.type === 'plant') return plantModal(current.payload);
    if (current.type === 'harvest') return harvestModal(current.payload);
    if (current.type === 'reset') return resetModal();
    if (current.type === 'intro') return introModal();
    return '';
  }

  function checkinModal() {
    const view = Game.checkinView();
    const seedId = seedIdFromReward(view.reward) || 'daisy';
    const cells = view.cells.map(function (reward) {
      const id = seedIdFromReward(reward) || 'daisy';
      const extra = rewardExtras(reward);
      let statusLabel = '';
      if (reward.status === 'claimed') statusLabel = '<span class="day-state claimed">' + ICONS.check + '</span>';
      if (reward.status === 'today') statusLabel = '<span class="day-state today">今日</span>';
      if (reward.status === 'future') statusLabel = '<span class="day-state future">第 ' + reward.day + ' 天</span>';
      return '<div class="streak-day ' + reward.status + '">' +
        '<span class="streak-day-number">DAY ' + reward.day + '</span>' +
        '<span class="streak-art">' + Art.flower(id, 'bloom') + '</span>' +
        '<strong>' + reward.label + '</strong>' +
        '<small>' + extra + '</small>' +
        statusLabel +
      '</div>';
    }).join('');
    const title = view.claimedToday ? '今天的花种收好了' : '今天也来收一颗花种';
    const subtitle = view.claimedToday
      ? '已连续签到 ' + view.streak + ' 天，明天会有一颗新的花种。'
      : (view.streak > 0
        ? '已经连续签到 ' + view.streak + ' 天，再坚持一下就能见到铃兰。'
        : '从今天开始，每天收下一颗会开花的小种子。');

    return sheetHeader('DAILY SEED', title) +
      '<p class="sheet-sub">' + subtitle + '</p>' +
      '<div class="streak-board">' + cells + '</div>' +
      '<div class="today-reward">' +
        '<div class="today-reward-head"><span>第 ' + view.dayNumber + ' 天 · 今日可领</span><span class="today-seed-name">' + view.reward.label + '</span></div>' +
        '<div class="reward-chips">' + rewardChips(view.reward) + '</div>' +
      '</div>' +
      '<button class="primary-button ' + (view.claimedToday ? 'is-claimed' : '') + '" data-action="claim-checkin"' + (view.claimedToday ? ' disabled' : ' data-autofocus') + '>' +
        (view.claimedToday ? ICONS.check + ' 已收下 · 明天见' : ICONS.seed + ' 领取今日花种') +
      '</button>' +
      '<p class="sheet-foot">' + ICONS.sparkle + ' 每天 0 点更新，连续第 7 天会送出铃兰种子。</p>';
  }

  function seedPickerModal(payload) {
    const state = Game.getState();
    const slot = payload.slot;
    const owned = DATA.flowers.filter(function (flower) {
      return (state.inventory[flower.id] || 0) > 0;
    });
    const body = owned.length
      ? '<div class="seed-picker-list">' + owned.map(function (flower) {
          return '<button class="pick-seed" data-action="plant-seed" data-slot="' + slot + '" data-flower="' + flower.id + '" data-autofocus>' +
            '<span class="pick-seed-art">' + Art.flower(flower.id, 'bloom') + '</span>' +
            '<span class="pick-seed-copy"><strong>' + esc(flower.name) + '</strong><small>种子 ×' + state.inventory[flower.id] + ' · 花期 ' + formatSpan(flower.bloomSeconds) + '</small></span>' +
            '<span class="pick-seed-action">种下 ' + ICONS.arrow + '</span>' +
          '</button>';
        }).join('') + '</div>'
      : '<div class="empty-pouch">' + Art.seedPacket('daisy') + '<h3>种子盒空了</h3><p>去花市买一颗，或者明天来签到。</p><button class="primary-button small" data-action="go-shop" data-autofocus>逛逛花市 ' + ICONS.arrow + '</button></div>';

    return sheetHeader('SEED BOX', '选一颗种子') +
      '<p class="sheet-sub">要种在 <strong>' + String(slot + 1).padStart(2, '0') + ' 号花盆</strong> 里。种下后它会自己慢慢长大。</p>' +
      body +
      (owned.length ? '<button class="ghost-button" data-action="go-shop">种子不够？去花市逛逛 ' + ICONS.arrow + '</button>' : '');
  }

  function plantModal(payload) {
    const view = Game.getPlantView(payload.slot);
    if (!view.planted) {
      return sheetHeader('PLANT NOTE', '这里空空的') +
        '<div class="modal-empty"><span class="big-icon">' + ICONS.seed + '</span><p>不如现在种一颗花？</p><button class="primary-button" data-action="close-modal">回到花园</button></div>';
    }
    const flower = view.flower;
    const speed = Game.getState().settings.speed;
    const isBloom = view.isBloom;
    const actions = isBloom
      ? '<div class="detail-bloom">' +
          '<span class="freshness-label js-fresh-label fresh-' + view.fresh.tone + '">' + view.fresh.label + ' · 花束价值 ×' + view.fresh.multiplier.toFixed(2) + '</span>' +
          '<p>' + (view.fresh.remainingSeconds > 0 ? '花期还剩 ' + formatCountdown(view.fresh.remainingSeconds) : '已经过了最好的花期，但依然可以采摘。') + '</p>' +
        '</div>' +
        '<button class="primary-button harvest-primary" data-action="harvest" data-slot="' + view.slot + '" data-autofocus>' +
          ICONS.bloom + ' 采摘花束 · ' + ICONS.coin + ' <b>' + view.harvestCoins + '</b>' +
        '</button>'
      : '<div class="detail-actions">' +
          '<button class="detail-care water js-detail-water" data-action="water" data-slot="' + view.slot + '"' + (view.waterWait > 0 ? ' disabled' : '') + '>' +
            ICONS.drop + '<span><strong>' + (view.waterWait > 0 ? '等 ' + view.waterWait + ' 秒' : '浇一次水') + '</strong><small>湿润后生长 ×1.5</small></span>' +
          '</button>' +
          '<button class="detail-care fert" data-action="fertilize" data-slot="' + view.slot + '">' +
            ICONS.fertilizer + '<span><strong>施一点肥</strong><small>立刻推进 18% 成长</small></span>' +
          '</button>' +
        '</div>';

    return sheetHeader('PLANT NOTE', '正在生长的花') +
      '<div class="plant-detail-hero">' +
        '<div class="detail-art">' + Art.flower(flower.id, view.stage) + '</div>' +
        '<div class="detail-copy">' +
          '<span class="rarity-chip ' + rarityClass(flower.rarity) + '">' + rarityLabel(flower.rarity) + '</span>' +
          '<h2>' + esc(flower.name) + '</h2>' +
          '<p class="flower-language">「' + esc(flower.language) + '」</p>' +
          '<p class="detail-blurb">' + esc(flower.blurb) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="detail-progress-block">' +
        '<div class="detail-progress-head"><span>' + (isBloom ? '花开好了' : view.stageLabel) + '</span><span class="js-detail-percent">' + view.progressPercent + '%</span></div>' +
        '<div class="detail-track"><span class="js-detail-fill" style="width:' + view.progressPercent + '%"></span></div>' +
        '<div class="detail-facts">' +
          '<span>' + ICONS.clock + ' 生长 ' + formatSpan(flower.growSeconds) + '</span>' +
          '<span>' + ICONS.bloom + ' 花期 ' + formatSpan(flower.bloomSeconds) + '</span>' +
          '<span>' + ICONS.coin + ' 花束 ' + flower.sellPrice + ' 起</span>' +
        '</div>' +
        (isBloom ? '' : '<p class="detail-remaining js-detail-remaining">' + (view.buffed ? '土壤湿润，正在以 1.5 倍速度长大。' : '还在慢慢长大，' + (speed > 1 ? '时光沙漏 ×' + speed + ' 正在加速。' : '大约还需 ' + formatCountdown(view.remainingSeconds) + '。')) + '</p>') +
      '</div>' +
      '<blockquote class="flower-quote">' + esc(flower.cardLine) + '</blockquote>' +
      actions;
  }

  function harvestModal(payload) {
    const result = payload.result;
    if (!result) return '';
    const flower = result.flower;
    const levelNote = result.levelUp
      ? '<div class="level-up-note">' + ICONS.sparkle + '<span>花艺升级到 Lv.' + result.levelUp.level + ' · ' + result.levelUp.title + '，肥料 +1</span></div>'
      : '';
    const bonus = result.bonusSeed
      ? '<span class="reward-chip seed-chip">' + ICONS.seed + '<span>额外掉落「' + esc(flower.name) + '」种子 ×1</span></span>'
      : '';
    return '<div class="harvest-hero">' +
        '<span class="harvest-glow" aria-hidden="true"></span>' +
        '<div class="harvest-art">' + Art.flower(flower.id, 'bloom') + '</div>' +
      '</div>' +
      '<div class="harvest-copy">' +
        '<p class="eyebrow">FRESHLY PICKED</p>' +
        '<h2 id="modal-title">采下一束<br><em>' + esc(flower.name) + '</em></h2>' +
        '<p class="harvest-fresh">' + result.fresh.label + ' · 新鲜度 ×' + result.fresh.multiplier.toFixed(2) + '</p>' +
        '<div class="reward-chips harvest-rewards">' +
          '<span class="reward-chip coin-chip">' + ICONS.coin + '<span>+' + result.coins + ' 金币</span></span>' +
          '<span class="reward-chip xp-chip">' + ICONS.sparkle + '<span>+' + result.xp + ' 花艺值</span></span>' +
          bonus +
        '</div>' +
        levelNote +
      '</div>' +
      '<button class="primary-button" data-action="close-modal" data-autofocus>继续种花</button>' +
      '<button class="ghost-button" data-action="go-shop">再买一颗种子 ' + ICONS.arrow + '</button>';
  }

  function resetModal() {
    return '<div class="confirm-icon">' + ICONS.leaf + '</div>' +
      '<h2 id="modal-title">重新打理花园？</h2>' +
      '<p class="confirm-copy">所有花朵、种子、金币和花房手记都会清空，这件事没办法撤销。慢慢种下的花园，真的舍得吗？</p>' +
      '<div class="confirm-actions">' +
        '<button class="ghost-button" data-action="close-modal" data-autofocus>再想想</button>' +
        '<button class="danger-button" data-action="confirm-reset">清空重来</button>' +
      '</div>';
  }

  function introModal() {
    return '<div class="intro-art" aria-hidden="true">' +
        '<span class="intro-sun"></span><span class="intro-cloud"></span>' +
        Art.flower('daisy', 'bloom', { className: 'intro-flower' }) +
        Art.flower('tulip', 'bud', { className: 'intro-flower-small' }) +
      '</div>' +
      '<div class="intro-copy">' +
        '<p class="eyebrow">WELCOME, GARDENER</p>' +
        '<h2 id="modal-title">小满花园</h2>' +
        '<p class="intro-lead">在这里，不赶时间。<br>收下一颗种子，等它慢慢开花。</p>' +
        '<div class="intro-steps">' +
          '<div><span>01</span><p><strong>每日签到</strong>领取不同的花种</p></div>' +
          '<div><span>02</span><p><strong>浇水施肥</strong>陪它一点一点长大</p></div>' +
          '<div><span>03</span><p><strong>采摘花束</strong>把花开的样子收进手记</p></div>' +
        '</div>' +
      '</div>' +
      '<button class="primary-button" data-action="finish-intro" data-autofocus>去打理花园 ' + ICONS.arrow + '</button>' +
      '<p class="sheet-foot">' + ICONS.leaf + ' 花园会保存在这台设备上</p>';
  }

  /* ---------------- 轻提示与动效 ---------------- */

  function showToast(message, options) {
    const opts = options || {};
    const tone = opts.tone || 'info';
    const icon = tone === 'error' ? ICONS.close : tone === 'flower' ? ICONS.bloom : tone === 'success' ? ICONS.check : ICONS.leaf;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + tone;
    toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + esc(message) + '</span>';
    els.toast.appendChild(toast);
    while (els.toast.children.length > 3) {
      els.toast.removeChild(els.toast.firstChild);
    }
    window.setTimeout(function () {
      toast.classList.add('is-leaving');
      window.setTimeout(function () { toast.remove(); }, 280);
    }, opts.duration || 2600);
  }

  function prefersReducedMotion() {
    return Game.getState().settings.reduceMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function fxColors(tone) {
    if (tone === 'water') return ['#9acbd7', '#c5e5e4', '#f7f3e7', '#7db9c8'];
    if (tone === 'fertilizer') return ['#c79a70', '#e5c99d', '#9eb183', '#e7b95c'];
    if (tone === 'checkin') return ['#e6a89e', '#e9c76b', '#b9cdb2', '#d7a9c2', '#f5e5ce'];
    return ['#df8f7d', '#e8b658', '#b9cdb0', '#e9c4c9', '#f3e3c6'];
  }

  function burstAt(rect, tone, count) {
    if (prefersReducedMotion() || !rect) return;
    const colors = fxColors(tone);
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    for (let i = 0; i < (count || 14); i += 1) {
      const bit = document.createElement('span');
      const angle = Math.random() * Math.PI * 2;
      const distance = 28 + Math.random() * 70;
      bit.className = 'fx-bit';
      bit.style.left = originX + 'px';
      bit.style.top = originY + 'px';
      bit.style.setProperty('--fx-x', Math.cos(angle) * distance + 'px');
      bit.style.setProperty('--fx-y', (Math.sin(angle) * distance - 18) + 'px');
      bit.style.setProperty('--fx-r', (Math.random() * 220 - 110) + 'deg');
      bit.style.setProperty('--fx-color', colors[i % colors.length]);
      bit.style.animationDelay = (Math.random() * 80) + 'ms';
      bit.style.borderRadius = i % 3 === 0 ? '50%' : '70% 20% 60% 30%';
      els.fx.appendChild(bit);
      window.setTimeout(function () { bit.remove(); }, 1150);
    }
  }

  function burstOnElement(element, tone, count) {
    if (!element) return;
    burstAt(element.getBoundingClientRect(), tone, count);
  }

  function celebrate(tone) {
    if (prefersReducedMotion()) return;
    burstAt({ left: window.innerWidth / 2 - 20, top: window.innerHeight * 0.44, width: 40, height: 20 }, tone || 'harvest', 34);
    if (navigator.vibrate) {
      try { navigator.vibrate([12, 26, 12]); } catch (error) { /* ignore */ }
    }
  }

  function playSound(name) {
    if (!Game.getState().settings.sound) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioContext) audioContext = new AudioCtor();
      if (audioContext.state === 'suspended') audioContext.resume();
      const notes = {
        water: [[620, .07], [760, .09]],
        fertilizer: [[280, .08], [380, .08]],
        plant: [[440, .08], [554, .1]],
        harvest: [[523, .1], [659, .1], [784, .12], [1047, .2]],
        checkin: [[659, .08], [784, .08], [988, .1], [1319, .18]],
        error: [[220, .12], [180, .14]],
        click: [[540, .04]]
      }[name] || [[440, .06]];
      let when = audioContext.currentTime + .015;
      notes.forEach(function (note) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = name === 'error' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(note[0], when);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(name === 'water' ? .025 : .035, when + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, when + note[1]);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(when);
        osc.stop(when + note[1] + .02);
        when += note[1] * .72;
      });
    } catch (error) {
      /* 音频不是关键路径 */
    }
  }

  function haptic() {
    if (prefersReducedMotion() || !navigator.vibrate) return;
    try { navigator.vibrate(8); } catch (error) { /* ignore */ }
  }

  /* ---------------- 实际操作 ---------------- */

  function refreshAfterAction(options) {
    renderAll({ resetScroll: false });
    if (options && options.toast) showToast(options.toast, options.toastOptions);
  }

  function handlePlantSeed(element) {
    const slot = Number(element.dataset.slot);
    const flowerId = element.dataset.flower;
    const result = Game.plantSeed(slot, flowerId);
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      return;
    }
    const flower = result.flower;
    closeModal();
    renderAll({ resetScroll: false });
    highlightPot = false;
    playSound('plant');
    haptic();
    showToast('种下了' + flower.name + '，记得给它浇水。', { tone: 'success' });
  }

  function handleCare(type, slot) {
    const result = type === 'water' ? Game.waterPlant(slot) : Game.fertilizePlant(slot);
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      playSound('error');
      return;
    }
    const flower = result.view.flower;
    renderAll({ resetScroll: false });
    const plot = els.screen.querySelector('.plot[data-slot="' + slot + '"]');
    burstOnElement(plot, type, type === 'water' ? 11 : 9);
    playSound(type);
    haptic();
    if (result.bloomed) {
      celebrate('harvest');
      showToast('花开好了！' + flower.name + '正在等你采摘。', { tone: 'flower', duration: 3200 });
    } else if (type === 'water') {
      showToast('土壤湿润了，接下来 90 秒会长得更快。', { tone: 'info' });
    } else {
      showToast('施了肥，' + flower.name + '悄悄长大了一截。', { tone: 'success' });
    }
  }

  function handleHarvest(slot) {
    const result = Game.harvest(slot);
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      return;
    }
    renderAll({ resetScroll: false });
    openModal('harvest', { result: result });
    celebrate('harvest');
    playSound('harvest');
    haptic();
    if (result.levelUp) {
      showToast('花艺升级啦，现在是 Lv.' + result.levelUp.level + '。', { tone: 'success', duration: 3200 });
    }
  }

  function handleBuySeed(element) {
    const result = Game.buySeed(element.dataset.flower);
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      playSound('error');
      return;
    }
    renderAll({ resetScroll: false });
    playSound('plant');
    showToast('买到了' + result.flower.name + '种子，仓库里现在有 ' + result.inventory + ' 颗。', { tone: 'success' });
  }

  function handleBuyFertilizer(element) {
    const result = Game.buyFertilizer(element.dataset.bundle === '1');
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      playSound('error');
      return;
    }
    renderAll({ resetScroll: false });
    playSound('fertilizer');
    showToast('肥料 +' + result.quantity + '，存在园艺柜里了。', { tone: 'success' });
  }

  function handleBuyPot() {
    const result = Game.buyPot();
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      playSound('error');
      return;
    }
    renderAll({ resetScroll: false });
    playSound('checkin');
    showToast('第 ' + result.potCount + ' 只花盆准备好了，回花园种花吧。', { tone: 'success' });
  }

  function handleClaimQuest(element) {
    const result = Game.claimQuest(element.dataset.quest);
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      return;
    }
    renderAll({ resetScroll: false });
    celebrate('harvest');
    playSound('checkin');
    showToast('「' + result.title + '」奖励已收下：' + rewardText(result.reward) + '。', { tone: 'success' });
  }

  function handleClaimCheckin() {
    const result = Game.claimCheckin();
    if (!result.ok) {
      showToast(errorMessage(result.reason), { tone: 'error' });
      return;
    }
    renderAll({ resetScroll: false });
    paintModal(false);
    celebrate('checkin');
    playSound('checkin');
    haptic();
    showToast('收下啦：' + rewardText(result.reward) + '。', { tone: 'success', duration: 3200 });
  }

  function handleSaveName() {
    const input = document.querySelector('[data-name-input]');
    const value = input ? input.value : '';
    const result = Game.setName(value);
    renderAll({ resetScroll: false });
    showToast('花园落款改成了「' + result.name + '」。', { tone: 'success' });
  }

  function handleReset() {
    Game.reset();
    closeModal();
    activeTab = 'garden';
    highlightPot = false;
    renderAll({ resetScroll: true });
    openModal('intro');
  }

  function finishIntro() {
    Game.setSetting('seenIntro', true);
    closeModal();
    highlightPot = true;
    renderAll({ resetScroll: false });
    showToast('先领一份签到礼，再种下第一颗种子吧。', { tone: 'info', duration: 3000 });
    if (highlightPot) {
      window.setTimeout(function () {
        const target = els.screen.querySelector('.guide-target');
        if (target) target.classList.remove('guide-target');
        highlightPot = false;
      }, 6000);
    }
  }

  const ACTIONS = {
    'go-home': function () {
      closeModal();
      if (activeTab === 'garden') {
        els.screen.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      } else {
        switchTab('garden');
      }
    },
    'switch-tab': function (element) { switchTab(element.dataset.tab); },
    'go-shop': function () { closeModal(); switchTab('shop'); },
    'open-checkin': function () {
      if (modalState && modalState.type === 'checkin') return;
      playSound('click');
      openModal('checkin');
    },
    'claim-checkin': handleClaimCheckin,
    'close-modal': function () { closeModal(); },
    'finish-intro': finishIntro,
    'open-seeds': function (element) {
      const slot = Number(element.dataset.slot);
      openModal('seeds', { slot: slot });
    },
    'plant-seed': handlePlantSeed,
    'open-plant': function (element) {
      playSound('click');
      openModal('plant', { slot: Number(element.dataset.slot) });
    },
    water: function (element) { handleCare('water', Number(element.dataset.slot)); },
    fertilize: function (element) { handleCare('fertilizer', Number(element.dataset.slot)); },
    harvest: function (element) { handleHarvest(Number(element.dataset.slot)); },
    'buy-seed': handleBuySeed,
    'buy-fertilizer': handleBuyFertilizer,
    'buy-pot': handleBuyPot,
    'open-pot-shop': function () { closeModal(); switchTab('shop'); },
    'claim-quest': handleClaimQuest,
    'save-name': handleSaveName,
    'toggle-sound': function () {
      const next = !Game.getState().settings.sound;
      Game.setSetting('sound', next);
      renderAll({ resetScroll: false });
      if (next) playSound('click');
      showToast(next ? '声音回来了，花园里又热闹了一点。' : '花园安静下来了。', { tone: 'info' });
    },
    'toggle-motion': function () {
      const next = !Game.getState().settings.reduceMotion;
      Game.setSetting('reduceMotion', next);
      applyMotionPreference();
      renderAll({ resetScroll: false });
      showToast(next ? '已减少画面动效。' : '动效恢复啦。', { tone: 'info' });
    },
    'set-speed': function (element) {
      const speed = Number(element.dataset.speed);
      const result = Game.setSpeed(speed);
      if (!result.ok) return;
      renderAll({ resetScroll: false });
      showToast(speed === 1 ? '时光沙漏调回正常速度。' : '时光沙漏 ×' + speed + '，花儿会很快长大。', { tone: 'info' });
    },
    'replay-intro': function () { openModal('intro'); },
    'open-reset': function () { openModal('reset'); },
    'confirm-reset': handleReset,
    'go-profile': function () { closeModal(); switchTab('profile'); }
  };

  /* ---------------- 每秒更新 ---------------- */

  function updateLiveGarden() {    if (activeTab !== 'garden') return;
    const views = Game.getGardenViews();
    views.forEach(function (view) {
      if (!view.planted) return;
      const plot = els.screen.querySelector('.plot[data-slot="' + view.slot + '"]');
      if (!plot) return;
      const gradientFill = plot.querySelector('.js-growth-fill');
      if (gradientFill) gradientFill.style.width = view.progressPercent + '%';
      const timer = plot.querySelector('.js-timer');
      if (timer) timer.textContent = '还需 ' + formatCountdown(view.remainingSeconds);
      const stage = plot.querySelector('.js-stage');
      if (stage) stage.textContent = view.stageLabel + ' · ' + view.progressPercent + '%';
      const status = plot.querySelector('.js-status');
      if (status && !view.isBloom) {
        status.textContent = view.buffed ? '水润中' : '生长中';
        status.classList.toggle('status-water', view.buffed);
        status.classList.toggle('status-growing', !view.buffed);
      }
      plot.classList.toggle('is-buffed', view.buffed);
      if (!view.buffed) {
        const buffTag = plot.querySelector('.buff-tag');
        if (buffTag) buffTag.remove();
      }
      const waterButton = plot.querySelector('.water-button');
      const waterLabel = plot.querySelector('.js-water-label');
      if (waterButton && waterLabel) {
        const waiting = view.waterWait > 0;
        if (waterButton.disabled !== waiting) waterButton.disabled = waiting;
        waterButton.classList.toggle('is-waiting', waiting);
        waterLabel.textContent = waiting ? view.waterWait + 's' : '浇水';
      }
      if (view.isBloom) {
        const freshLabel = plot.querySelector('.js-fresh-label');
        if (freshLabel) {
          freshLabel.textContent = view.fresh.label + ' · ' + freshnessMeta(view.fresh);
          freshLabel.className = 'freshness-label js-fresh-label fresh-' + view.fresh.tone;
        }
        const bloomTime = plot.querySelector('.js-bloom-time');
        if (bloomTime) {
          bloomTime.textContent = view.fresh.remainingSeconds > 0 ? '花期还剩 ' + formatCountdown(view.fresh.remainingSeconds) : '已过盛花期';
        }
        const reward = plot.querySelector('.js-harvest-reward');
        if (reward) reward.textContent = view.harvestCoins;
      }
    });
  }

  function updateLiveModal() {
    if (!modalState || modalState.type !== 'plant') return;
    const sheet = els.modal.querySelector('.sheet-plant');
    if (!sheet) return;
    const view = Game.getPlantView(modalState.payload.slot);
    if (!view.planted || view.isBloom) return;
    const fill = sheet.querySelector('.js-detail-fill');
    if (fill) fill.style.width = view.progressPercent + '%';
    const percent = sheet.querySelector('.js-detail-percent');
    if (percent) percent.textContent = view.progressPercent + '%';
    const waterButton = sheet.querySelector('.js-detail-water');
    if (waterButton) {
      const waiting = view.waterWait > 0;
      waterButton.disabled = waiting;
      const label = waterButton.querySelector('strong');
      if (label) label.textContent = waiting ? '等 ' + view.waterWait + ' 秒' : '浇一次水';
    }
    const remaining = sheet.querySelector('.js-detail-remaining');
    if (remaining) {
      remaining.textContent = view.buffed
        ? '土壤湿润，正在以 1.5 倍速度长大。'
        : '还在慢慢长大，' + ((Game.getState().settings.speed || 1) > 1
          ? '时光沙漏 ×' + Game.getState().settings.speed + ' 正在加速。'
          : '大约还需 ' + formatCountdown(view.remainingSeconds) + '。');
    }
  }

  function processTickEvents(events, options) {
    if (!events || !events.length) return;
    const blooms = events.filter(function (event) { return event.type === 'bloom'; });
    const hasStage = events.some(function (event) { return event.type === 'stage' || event.type === 'bloom'; });
    const newDay = events.find(function (event) { return event.type === 'newday'; });
    if (hasStage || newDay) {
      renderAll({ resetScroll: false });
    }
    if (blooms.length) {
      const names = blooms.map(function (event) {
        return DATA.flowerMap[event.flowerId] ? DATA.flowerMap[event.flowerId].name : '花';
      });
      const unique = Array.from(new Set(names));
      showToast(unique.join('、') + (blooms.length > 1 ? ' 都开好了' : ' 开好了') + '，去采一束吧。', { tone: 'flower', duration: 3400 });
      if (!prefersReducedMotion()) {
        const target = blooms[0] ? els.screen.querySelector('.plot[data-slot="' + blooms[0].slot + '"] .plot-scene') : null;
        burstOnElement(target, 'harvest', 14);
      }
      playSound('checkin');
    }
    if (newDay) {
      showToast('新的一天，花园里的花事已经更新。', { tone: 'info' });
    }
  }

  function handleTick() {
    const events = Game.tick();
    if (events.length) {
      processTickEvents(events);
    }
    updateLiveGarden();
    updateLiveModal();
    const now = Date.now();
    if (now - lastSavedAt > 15000) {
      lastSavedAt = now;
      Game.save();
    }
  }

  /* ---------------- 初始化 ---------------- */

  function applyMotionPreference() {
    const off = Game.getState().settings.reduceMotion;
    document.body.classList.toggle('motion-off', off);
  }

  function renderBackdrop() {
    if (els.backdropLeft) els.backdropLeft.innerHTML = Art.flower('rose', 'bloom');
    if (els.backdropRight) els.backdropRight.innerHTML = Art.flower('hydrangea', 'bloom');
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      const target = event.target.closest('[data-action]');
      if (!target || target.disabled) return;
      const action = target.dataset.action;
      const handler = ACTIONS[action];
      if (!handler) return;
      event.preventDefault();
      try {
        handler(target, event);
      } catch (error) {
        console.error(error);
        showToast('花园里出了点小状况，再试一次吧。', { tone: 'error' });
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modalState) {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key === 'Enter' && event.target.matches('[data-name-input]')) {
        event.preventDefault();
        handleSaveName();
        return;
      }
      if (event.key === 'Tab' && modalState) {
        const sheet = els.modal.querySelector('.sheet');
        if (!sheet) return;
        const focusable = Array.from(sheet.querySelectorAll('button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])')).filter(function (node) {
          return node.offsetParent !== null;
        });
        if (!focusable.length) {
          event.preventDefault();
          sheet.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        Game.save();
      } else {
        handleTick();
      }
    });

    window.addEventListener('pagehide', function () { Game.save(); });
    window.addEventListener('beforeunload', function () { Game.save(); });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* 开发环境不打断体验 */ });
    });
  }

  function init() {
    applyMotionPreference();
    renderBackdrop();
    const boot = Game.boot();
    if (!Game.getState().settings.seenIntro) {
      activeTab = 'garden';
      renderAll({ resetScroll: true });
      openModal('intro');
    } else {
      renderAll({ resetScroll: true });
      processTickEvents(boot.events);
    }
    bindEvents();
    lastSavedAt = Date.now();
    tickHandle = window.setInterval(handleTick, 1000);
    registerServiceWorker();
    if (boot.events.length && !Game.getState().settings.seenIntro) {
      /* 第一次打开时由引导承担开场，不打断。 */
    }
  }

  init();
})();
