/* 小小花园 · 本地账号同步
 * 只在 Flask 账号版里生效；静态 GitHub Pages 没有 __ACCOUNT__，自动跳过。
 */
(function () {
  'use strict';

  var account = window.__ACCOUNT__;
  if (!account) return;

  var SAVE_KEY = 'xiaoman-garden-save-v1';
  var pendingKey = SAVE_KEY + ':pending:' + account.id;
  var pendingRecord = null;
  var sendingRaw = null;
  var token = account.csrfToken;
  var timer = 0;
  var inFlight = null;
  var revision = Number(account.saveRevision || 0);
  var conflict = false;
  var lastSynced = null;
  var retryTimer = 0;
  var statusText = '已连接到' + (account.database || '账号数据库');
  var statusTone = 'ok';
  var suspended = false;
  var latestRaw = currentRaw();

  function currentRaw() {
    try {
      return window.localStorage.getItem(SAVE_KEY);
    } catch (error) {
      return null;
    }
  }

  function rememberPending(raw) {
    try {
      pendingRecord = JSON.stringify({ revision: revision, raw: raw, sent: sendingRaw });
      window.localStorage.setItem(pendingKey, pendingRecord);
    } catch (error) {
      // Cloud sync still works when local recovery storage is unavailable.
    }
  }

  function acknowledgePending(raw) {
    try {
      if (!pendingRecord || window.localStorage.getItem(pendingKey) !== pendingRecord) return;
      var pending = JSON.parse(pendingRecord);
      if (pending.raw === raw) {
        window.localStorage.removeItem(pendingKey);
        pendingRecord = null;
      } else {
        rememberPending(pending.raw);
      }
    } catch (error) {
      // A storage failure must not invalidate a successful cloud save.
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
    if (conflict && !document.querySelector('[data-account-reload]')) {
      var reload = document.createElement('button');
      reload.type = 'button';
      reload.className = 'text-action simple';
      reload.dataset.accountReload = '';
      reload.textContent = '刷新并读取最新存档';
      reload.addEventListener('click', function () { window.location.reload(); });
      node.parentNode.appendChild(reload);
    }
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
    var raw = latestRaw;
    if (conflict) return opts.strict ? Promise.reject(new Error('save_conflict')) : Promise.resolve();
    if (suspended) return Promise.resolve();
    if (!raw) return Promise.resolve();
    if (!opts.force && raw === lastSynced) return Promise.resolve();
    // 市场交易必须等正在进行的存档请求真正完成。
    if (inFlight) return inFlight.then(function () { return syncNow(opts); });

    sendingRaw = raw;
    rememberPending(raw);
    setStatus('正在同步…', 'syncing');
    inFlight = window.fetch('/api/save', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
        'X-Save-Revision': String(revision)
      },
      body: raw,
      keepalive: !!opts.keepalive && raw.length <= 20000
    }).then(function (response) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('login-required');
      }
      if (response.status === 409) {
        conflict = true;
        suspended = true;
        window.clearTimeout(timer);
        window.clearTimeout(retryTimer);
        setStatus('存档已在交易或其他页面中更新，请刷新', 'error');
        throw new Error('save_conflict');
      }
      if (!response.ok) throw new Error('sync-' + response.status);
      return response.json();
    }).then(function (data) {
      if (!data || !data.ok) throw new Error('sync-failed');
      revision = Number(data.revision);
      lastSynced = raw;
      sendingRaw = null;
      acknowledgePending(raw);
      window.clearTimeout(retryTimer);
      setStatus('已同步 · ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), 'ok');
    }).catch(function (error) {
      if (String(error && error.message) === 'login-required') {
        if (opts.strict) throw error;
        return;
      }
      if (conflict) {
        if (opts.strict) throw error;
        return;
      }
      setStatus('同步失败，稍后重试', 'error');
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(function () { syncNow({ force: true }); }, 8000);
      if (opts.strict) throw error;
    }).finally(function () {
      inFlight = null;
    });
    return inFlight;
  }

  window.addEventListener('xiaoman:save', function (event) {
    if (conflict || suspended) return;
    latestRaw = event.detail.serialized;
    rememberPending(latestRaw);
    setStatus('有改动待同步', 'pending');
    syncNow({ keepalive: true });
  });

  window.addEventListener('pagehide', function () {
    if (suspended) return;
    if (latestRaw !== lastSynced) syncNow({ keepalive: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (suspended) return;
    if (document.visibilityState === 'hidden' && latestRaw !== lastSynced) {
      syncNow({ keepalive: true });
    }
  });

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-account-logout]');
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    setStatus('正在保存并退出…', 'syncing');
    syncNow({ force: true, strict: true }).then(function () {
      return window.fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': token }
      }).then(function (response) {
        if (!response.ok) throw new Error('logout-failed');
        window.location.href = '/login';
      });
    }).catch(function () {
      button.disabled = false;
      if (!conflict) setStatus('保存或退出失败，请重试', 'error');
    });
  });

  // app.js 启动时 Game 已经 boot 过，这里补一次首次同步，确保新账号也有存档。
  setStatus('已连接到' + (account.database || '账号数据库'), 'ok');
  schedule(1500);
  window.XiaomanAccount = {
    sync: syncNow,
    suspend: function () {
      suspended = true;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    },
    resume: function () {
      if (conflict) return;
      suspended = false;
      schedule(900);
    },
    get account() { return account; }
  };
})();
