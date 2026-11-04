const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../www/js/updater.js'), 'utf8');

function release(tag, platform, flags = {}) {
  return {
    tag_name: tag,
    assets: [{ name: 'Xiaoxiao-Garden-' + platform, state: 'uploaded', size: 100 }],
    ...flags
  };
}

async function check(platform, releases) {
  const nodes = [];
  const opened = [];
  let onClick;
  let saves = 0;
  const window = {
    XIAOMAN_VERSION: { version: '0.5.7', build: 13 },
    location: new URL(platform === 'ios' ? 'capacitor://localhost/' : 'https://localhost/'),
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => platform,
      Plugins: { Browser: { open: async ({ url }) => opened.push(url) } }
    },
    Game: { save: () => saves++ },
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  const document = {
    addEventListener: (name, handler) => { assert.equal(name, 'click'); onClick = handler; },
    createElement: () => ({ setAttribute() {}, querySelector: () => ({}) }),
    body: { appendChild: (node) => nodes.push(node) }
  };
  vm.runInNewContext(source, {
    window, document, URL, AbortController,
    fetch: async () => ({ ok: true, json: async () => releases })
  });
  window.XiaomanUpdater.checkNow();
  await new Promise(setImmediate);
  return {
    pending: window.XiaomanUpdater.getPending(),
    notice: nodes.at(-1)?.textContent,
    opened,
    get saves() { return saves; },
    apply: () => onClick({
      preventDefault() {},
      target: { closest: (selector) => selector === '[data-apply-update]' }
    })
  };
}

test('iOS selects the highest stable compatible release and saves before opening it', async () => {
  const result = await check('ios', [
    release('v0.6.0', 'Android.apk'),
    release('v0.5.13', 'iOS.ipa', { prerelease: true }),
    release('v0.5.12', 'iOS-unsigned.ipa'),
    release('v0.5.11', 'iOS.ipa', { draft: true }),
    release('v0.5.9', 'iOS.ipa'),
    release('v0.5.10', 'iOS.ipa')
  ]);
  assert.equal(result.pending.version, '0.5.10');
  result.apply();
  assert.equal(result.saves, 1);
  assert.deepEqual(result.opened, ['https://github.com/himlaya/xiaoman-garden/releases/tag/v0.5.10']);
});

test('Android reports no newer package when the release feed is empty or incompatible', async () => {
  for (const releases of [[], [release('v0.5.7', 'Android.apk'), release('v0.6.0', 'iOS.ipa')]]) {
    const result = await check('android', releases);
    assert.equal(result.pending, null);
    assert.equal(result.notice, '暂无适用于此设备的新版安装包。');
  }
});
