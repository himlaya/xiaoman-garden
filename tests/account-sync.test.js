const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../www/js/account.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup() {
  const calls = [];
  const handlers = {};
  const status = { dataset: {}, parentNode: { appendChild() {} } };
  const window = {
    __ACCOUNT__: { csrfToken: 'csrf', saveRevision: 0, database: '云端 PostgreSQL' },
    localStorage: { getItem: () => '{"player":{"coins":20},"garden":[]}' },
    addEventListener() {}, setTimeout: () => 1, clearTimeout() {},
    location: {},
    fetch(url, options) {
      return new Promise((resolve, reject) => calls.push({ url, options, resolve, reject }));
    }
  };
  const document = {
    querySelector: selector => selector === '[data-account-status]' ? status : null,
    addEventListener: (name, handler) => { handlers[name] = handler; },
    createElement: () => ({ dataset: {}, addEventListener() {} })
  };
  vm.runInNewContext(source, { window, document, Promise, Date });
  return { window, calls, handlers, status };
}

function success(call, revision) {
  call.resolve({ ok: true, status: 200, json: async () => ({ ok: true, revision }) });
}

test('交易前的严格同步等待已在进行的请求，并使用最新存档版本', async () => {
  const { window, calls } = setup();
  const first = window.XiaomanAccount.sync();
  const strict = window.XiaomanAccount.sync({ force: true, strict: true });
  assert.equal(calls.length, 1);
  success(calls[0], 1);
  await first;
  await tick();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers['X-Save-Revision'], '1');
  success(calls[1], 2);
  await strict;
});

test('成交后旧版本收到冲突即停止重试，避免覆盖最新存档', async () => {
  const { window, calls, status } = setup();
  const syncing = window.XiaomanAccount.sync({ strict: true });
  calls[0].resolve({ ok: false, status: 409 });
  await assert.rejects(syncing, /save_conflict/);
  await assert.rejects(window.XiaomanAccount.sync({ strict: true }), /save_conflict/);
  window.XiaomanAccount.resume();
  await window.XiaomanAccount.sync();
  assert.equal(calls.length, 1);
  assert.match(status.textContent, /请刷新/);
});

test('保存失败时保留登录状态，不继续发送退出请求', async () => {
  const { calls, handlers } = setup();
  const button = { disabled: false };
  handlers.click({ preventDefault() {}, target: { closest: () => button } });
  assert.equal(calls[0].url, '/api/save');
  calls[0].reject(new Error('offline'));
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(button.disabled, false);
});

test('重新打开时恢复该账号尚未同步的种植进度，保护较新的云存档', () => {
  const boot = fs.readFileSync(path.join(__dirname, '../www/js/account-boot.js'), 'utf8');
  const key = 'xiaoman-garden-save-v1';
  const empty = { player: {}, garden: [] };
  const planted = JSON.stringify({ player: {}, garden: [{ flowerId: 'daisy' }] });
  const sent = JSON.stringify(empty);
  const storage = new Map([[key + ':pending:5', JSON.stringify({ revision: 3, raw: planted, sent })]]);
  function load(id, revision, save) {
    const window = { localStorage: {
      getItem: k => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: k => storage.delete(k)
    } };
    const document = { getElementById: () => ({
      textContent: JSON.stringify({ account: { id, saveRevision: revision }, save })
    }) };
    vm.runInNewContext(boot, { window, document });
    return storage.get(key);
  }
  assert.equal(load(5, 3, empty), planted);
  assert.equal(load(5, 4, empty), planted);
  assert.equal(load(5, 5, empty), sent);
  assert.equal(load(6, 3, empty), sent);
});
