/* 小小花园 · 账号存档引导
 * Flask 会在 index.html 里注入一个 application/json 的 #account-bootstrap。
 * 这个脚本在游戏脚本之前执行，把账号存档放进 localStorage。
 * 静态 GitHub Pages 没有该节点，脚本会自动跳过。
 */
(function () {
  'use strict';
  var node = document.getElementById('account-bootstrap');
  if (!node) return;

  var SAVE_KEY = 'xiaoman-garden-save-v1';
  try {
    var payload = JSON.parse(node.textContent || 'null');
    if (!payload || !payload.account) return;
    window.__ACCOUNT__ = payload.account;
    var pending = null;
    try {
      pending = JSON.parse(window.localStorage.getItem(SAVE_KEY + ':pending:' + payload.account.id));
    } catch (error) {
      // Ignore unreadable recovery data.
    }
    var cloud = payload.save ? JSON.stringify(payload.save) : null;
    var revision = Number(payload.account.saveRevision || 0);
    if (pending && typeof pending.raw === 'string' &&
        (pending.revision === revision ||
         (pending.revision + 1 === revision && pending.sent === cloud))) {
      window.localStorage.setItem(SAVE_KEY, pending.raw);
    } else if (payload.save) {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload.save));
    } else {
      window.localStorage.removeItem(SAVE_KEY);
    }
  } catch (error) {
    window.__ACCOUNT__ = null;
  }
})();
