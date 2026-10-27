/* 小满花园 · 账号存档引导
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
    if (payload.save) {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload.save));
    } else {
      window.localStorage.removeItem(SAVE_KEY);
    }
  } catch (error) {
    window.__ACCOUNT__ = null;
  }
})();
