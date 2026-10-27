/* 小满花园 · 本地账号同步
 * 只在 Flask 账号版里生效；静态 GitHub Pages 没有 __ACCOUNT__，自动跳过。
 */
(function () {
  'use strict';

  var account = window.__ACCOUNT__;
  if (!account) return;

  var SAVE_KEY = 'xiaoman-garden-save-v1';
  var token = account.csrfToken;
  var timer = 0;
  var syncing = false;
  var lastSynced = null;
  var retryTimer = 0;
  var statusText = '已连接到本地数据库';
  var statusTone = 'ok';

  function currentRaw() {
    try {
      return window.localStorage.getItem(SAVE_KEY);
    } catch (error) {
      return null;
    }
  }

  function currentStatusNode() {
    return document.querySelector('[data-account-status]');
  }

  function paintStatus() {
    var node = currentStatusNode();
    if (!node) return;
    node.textContent = statusText;
    node.dataset.status = statusTone;
  }

  function setStatus(text, tone) {
    statusText = text;
    statusTone = tone || 'ok';
    paintStatus();
  }

  function schedule(delay) {
    window.clearTimeout(timer);
    timer = window.setTimeout(syncNow, delay || 800);
  }

  function syncNow(options) {
    var opts = options || {};
    var raw = currentRaw();
    if (!raw) return Promise.resolve();
    if (!opts.force && raw === lastSynced) return Promise.resolve();
    if (syncing) return Promise.resolve();

    syncing = true;
    setStatus('正在同步…', 'syncing');
    return window.fetch('/api/save', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token
      },
      body: raw,
      keepalive: !!opts.keepalive
    }).then(function (response) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('login-required');
      }
      if (!response.ok) throw new Error('sync-' + response.status);
      return response.json();
    }).then(function (data) {
      if (!data || !data.ok) throw new Error('sync-failed');
      lastSynced = raw;
      window.clearTimeout(retryTimer);
      setStatus('已同步 · ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), 'ok');
    }).catch(function (error) {
      if (String(error && error.message) === 'login-required') return;
      setStatus('同步失败，稍后重试', 'error');
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(function () { syncNow({ force: true }); }, 8000);
    }).finally(function () {
      syncing = false;
    });
  }

  window.addEventListener('xiaoman:save', function () {
    setStatus('有改动待同步', 'pending');
    schedule(700);
  });

  window.addEventListener('pagehide', function () {
    if (currentRaw() !== lastSynced) syncNow({ force: true, keepalive: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && currentRaw() !== lastSynced) {
      syncNow({ force: true, keepalive: true });
    }
  });

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-account-logout]');
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    setStatus('正在保存并退出…', 'syncing');
    syncNow({ force: true }).finally(function () {
      window.fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': token }
      }).finally(function () {
        window.location.href = '/login';
      });
    });
  });

  // app.js 启动时 Game 已经 boot 过，这里补一次首次同步，确保新账号也有存档。
  setStatus('已连接到本地数据库', 'ok');
  schedule(1500);
  window.XiaomanAccount = {
    sync: syncNow,
    get account() { return account; }
  };
})();
