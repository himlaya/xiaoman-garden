/* 小小花园 · 网页 / PWA 自动更新
 *
 * 机制：
 * 1. 启动 5 秒后、每 5 分钟、以及从后台回到前台时，带时间戳检查 ./version.json。
 * 2. 远端 build 比当前页面里的 build 大时，先保存游戏进度，再自动刷新到新版。
 * 3. 如果用户正在输入、或打开了签到/花朵详情等弹窗，会等操作结束再刷新。
 * 4. 用 sessionStorage 记录一次尝试，避免 CDN 缓存未及时更新时出现刷新循环。
 *
 * 原生 Android / iOS 壳打包的是本地 www，不会通过这个机制更新；
 * HarmonyOS 壳见 window.__XIAOMAN_HARMONY__，直接跳过。
 */
(function () {
  'use strict';

  const LOCAL = window.XIAOMAN_VERSION || { version: '0.0.0', build: 0 };
  const CHECK_INTERVAL = 5 * 60 * 1000;
  const ATTEMPT_KEY = 'xiaoman-update-attempted-build';
  const RELOAD_DELAY = 1300;

  let checking = false;
  let pending = null;
  let pollTimer = 0;
  let lastCheck = 0;
  let noticeEl = null;
  let bannerEl = null;

  function supported() {
    return !window.__XIAOMAN_HARMONY__ && /^https?:$/.test(window.location.protocol);
  }

  function currentBuild() {
    return Number(LOCAL.build) || 0;
  }

  function saveProgress() {
    try {
      if (window.Game && typeof window.Game.save === 'function') window.Game.save();
    } catch (error) {
      /* 自动更新不应该因为存档失败而卡住 */
    }
  }

  function attempted(remoteBuild) {
    try {
      return window.sessionStorage.getItem(ATTEMPT_KEY) === String(remoteBuild);
    } catch (error) {
      return false;
    }
  }

  function markAttempt(remoteBuild) {
    try {
      window.sessionStorage.setItem(ATTEMPT_KEY, String(remoteBuild));
    } catch (error) {
      /* sessionStorage 不可用时，退化成单次页面刷新 */
    }
  }

  function safeToReload() {
    if (document.visibilityState === 'hidden') return true;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return false;
    }
    if (document.querySelector('.modal-layer')) return false;
    return true;
  }

  function removeNotice() {
    if (noticeEl && noticeEl.isConnected) noticeEl.remove();
    noticeEl = null;
  }

  function showNotice(message, tone, duration) {
    removeNotice();
    const node = document.createElement('div');
    node.className = 'update-notice update-notice-' + (tone || 'info');
    node.setAttribute('role', 'status');
    node.textContent = message;
    document.body.appendChild(node);
    noticeEl = node;
    window.setTimeout(function () {
      if (!node.isConnected) return;
      node.classList.add('is-leaving');
      window.setTimeout(function () {
        node.remove();
        if (noticeEl === node) noticeEl = null;
      }, 260);
    }, duration || 2600);
  }

  function removeBanner() {
    if (bannerEl && bannerEl.isConnected) bannerEl.remove();
    bannerEl = null;
  }

  function showBanner(remote) {
    if (bannerEl && bannerEl.isConnected) return;
    removeBanner();
    const node = document.createElement('div');
    node.className = 'update-banner';
    node.setAttribute('role', 'status');
    node.innerHTML =
      '<span class="update-banner-dot" aria-hidden="true"></span>' +
      '<div class="update-banner-copy"><strong></strong><small>点击更新，花种和进度都会保留。</small></div>' +
      '<button type="button" data-apply-update>立即更新</button>';
    node.querySelector('strong').textContent = '发现新版本 v' + remote.version;
    node.querySelector('button').addEventListener('click', function () {
      if (pending) applyUpdate(pending);
    });
    document.body.appendChild(node);
    bannerEl = node;
  }

  function showOverlay(remote) {
    if (document.querySelector('.update-overlay')) return;
    const node = document.createElement('div');
    node.className = 'update-overlay';
    node.innerHTML =
      '<div class="update-card">' +
        '<span class="update-flower" aria-hidden="true">✿</span>' +
        '<span class="update-spinner" aria-hidden="true"></span>' +
        '<p class="eyebrow">GARDEN UPDATE</p>' +
        '<h2>花园换新中</h2>' +
        '<p class="update-copy"></p>' +
      '</div>';
    node.querySelector('.update-copy').textContent = '正在更新到 v' + remote.version + '，花种和进度都会好好保留。';
    document.body.appendChild(node);
  }

  function refreshServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.getRegistration().then(function (registration) {
        if (registration) registration.update().catch(function () {});
      }).catch(function () {});
    } catch (error) {
      /* 忽略 */
    }
  }

  function applyUpdate(remote) {
    if (!remote) return;
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = 0;
    }
    removeBanner();
    markAttempt(remote.build);
    saveProgress();
    refreshServiceWorker();
    showOverlay(remote);
    window.setTimeout(function () {
      window.location.reload();
    }, RELOAD_DELAY);
  }

  function scheduleWhenSafe(remote) {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = 0;
    }
    if (safeToReload()) {
      applyUpdate(remote);
      return;
    }
    pollTimer = window.setInterval(function () {
      if (!pending) {
        window.clearInterval(pollTimer);
        pollTimer = 0;
        return;
      }
      if (safeToReload()) {
        window.clearInterval(pollTimer);
        pollTimer = 0;
        applyUpdate(pending);
      }
    }, 1800);
  }

  function detectUpdate(remote, manual) {
    pending = remote;
    if (attempted(remote.build)) {
      showBanner(remote);
      return;
    }
    if (manual && !safeToReload()) {
      showBanner(remote);
      return;
    }
    scheduleWhenSafe(remote);
  }

  async function fetchRemoteVersion() {
    const controller = new AbortController();
    const timeout = window.setTimeout(function () { controller.abort(); }, 6000);
    try {
      const url = new URL('./version.json', window.location.href);
      url.searchParams.set('_', String(Date.now()));
      const response = await fetch(url.toString(), {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('version status ' + response.status);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function checkNow(manual) {
    if (!supported()) {
      if (manual) showNotice('当前环境无法检查网页更新。', 'info', 2800);
      return;
    }
    if (checking) {
      if (manual) showNotice('正在检查新版本…', 'info', 1600);
      return;
    }
    if (pending) {
      if (manual) showBanner(pending);
      return;
    }
    checking = true;
    lastCheck = Date.now();
    if (manual) showNotice('正在检查新版本…', 'info', 1600);
    try {
      const remote = await fetchRemoteVersion();
      const remoteBuild = Number(remote.build) || 0;
      if (remoteBuild > currentBuild()) {
        detectUpdate({ version: String(remote.version || '新版本'), build: remoteBuild }, manual);
      } else if (manual) {
        showNotice('已是最新版本 · v' + LOCAL.version + '（构建 ' + LOCAL.build + '）', 'success', 3000);
      }
    } catch (error) {
      if (manual) showNotice('暂时无法检查更新，请确认网络后再试。', 'error', 3000);
    } finally {
      checking = false;
    }
  }

  document.addEventListener('click', function (event) {
    const checkButton = event.target.closest('[data-check-update]');
    if (checkButton) {
      event.preventDefault();
      checkNow(true);
      return;
    }
    const applyButton = event.target.closest('[data-apply-update]');
    if (applyButton) {
      event.preventDefault();
      if (pending) applyUpdate(pending);
    }
  });

  if (supported()) {
    window.setTimeout(function () { checkNow(false); }, 5000);
    window.setInterval(function () {
      if (document.visibilityState === 'visible') checkNow(false);
    }, CHECK_INTERVAL);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > 60 * 1000) {
        checkNow(false);
      }
    });
    window.addEventListener('online', function () {
      if (Date.now() - lastCheck > 60 * 1000) checkNow(false);
    });
  }

  window.XiaomanUpdater = {
    checkNow: function () { checkNow(true); },
    getLocalVersion: function () { return Object.assign({}, LOCAL); },
    getPending: function () { return pending ? Object.assign({}, pending) : null; }
  };
})();
