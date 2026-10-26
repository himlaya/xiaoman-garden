/* 使用 Edge 无头模式做一遍真实 UI 流程，并输出截图。
 * 用法：node scripts/browser-check.js
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RAW_BASE = process.env.CHECK_URL || 'http://127.0.0.1:4173/';
const BASE = RAW_BASE.endsWith('/') ? RAW_BASE : RAW_BASE + '/';
const WIDTH = Number(process.env.CHECK_WIDTH || 430);
const HEIGHT = Number(process.env.CHECK_HEIGHT || 900);
const SW_WAIT = Number(process.env.CHECK_SW_TIMEOUT || 8000);
const RELOAD_WAIT = Number(process.env.CHECK_RELOAD_WAIT || 2500);
const OUT = path.resolve(__dirname, '..', 'screenshots', process.env.CHECK_DIR || '');
const PORT = 9333;
const USER_DATA = path.join(os.tmpdir(), 'xiaoman-edge-profile-' + Date.now());

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.errors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP websocket timeout')), 8000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(new Error('CDP websocket error'));
      });
    });
    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data));
      if (data.id) {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        if (data.error) pending.reject(new Error(JSON.stringify(data.error)));
        else pending.resolve(data.result);
        return;
      }
      if (data.method === 'Runtime.exceptionThrown') {
        const detail = data.params.exceptionDetails;
        this.errors.push('EXCEPTION: ' + (detail.exception?.description || detail.text || 'unknown'));
      }
      if (data.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(data.params.type)) {
        const text = data.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ');
        if (!text.includes('favicon')) this.errors.push(data.params.type.toUpperCase() + ': ' + text);
      }
      const callback = this.handlers.get(data.method);
      if (callback) callback(data.params);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  on(method, callback) {
    this.handlers.set(method, callback);
  }
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4173/');
      if (response.ok) return;
    } catch (error) {
      /* retry */
    }
    await sleep(200);
  }
  throw new Error('静态服务器没有启动，请先执行 npm run dev');
}

async function main() {
  await waitForServer();
  const edge = spawn(EDGE, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-features=Translate,MediaRouter',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + USER_DATA,
    '--window-size=' + WIDTH + ',' + HEIGHT,
    'about:blank'
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      target = list.find((item) => item.type === 'page');
      if (target) break;
    } catch (error) {
      /* browser still starting */
    }
    await sleep(200);
  }
  if (!target) throw new Error('无法连接 Edge CDP');

  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: WIDTH < 760,
    screenWidth: WIDTH,
    screenHeight: HEIGHT
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__testErrors = [];
      window.addEventListener('error', (event) => window.__testErrors.push(String(event.message)));
      window.addEventListener('unhandledrejection', (event) => window.__testErrors.push(String(event.reason && event.reason.stack || event.reason)));
      const originalError = console.error.bind(console);
      console.error = (...args) => { window.__testErrors.push(args.map(String).join(' ')); originalError(...args); };
    `
  });

  const shot = async (name) => {
    const result = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const file = path.join(OUT, name + '.png');
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    console.log('SHOT', file);
  };
  const evaluate = async (expression) => {
    const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
  };
  const click = async (selector, wait = 500) => {
    const found = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
    if (!found) throw new Error('找不到元素: ' + selector);
    await sleep(wait);
  };

  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1800);
  await shot('00-intro');

  console.log('intro visible:', await evaluate(`!!document.querySelector('.sheet-intro')`));
  await click('[data-action="finish-intro"]', 700);
  await shot('01-garden-start');

  const layout = await evaluate(`(() => ({
    viewport: window.innerWidth,
    docWidth: document.documentElement.scrollWidth,
    screenClientWidth: document.getElementById('screen-root').clientWidth,
    screenScrollWidth: document.getElementById('screen-root').scrollWidth,
    tabbarVisible: !!document.querySelector('.tabbar'),
    unlabeledButtons: [...document.querySelectorAll('button')]
      .filter((button) => button.offsetParent !== null)
      .filter((button) => !(button.getAttribute('aria-label') || button.innerText.trim()))
      .map((button) => button.outerHTML.slice(0, 120)),
    serviceWorkerSupported: 'serviceWorker' in navigator
  }))()`);
  console.log('LAYOUT', JSON.stringify(layout));

  const workerReady = await evaluate(`Promise.race([
    navigator.serviceWorker && navigator.serviceWorker.ready.then((registration) => !!registration.active),
    new Promise((resolve) => setTimeout(() => resolve(false), ${SW_WAIT}))
  ])`);
  console.log('SERVICE_WORKER_READY', workerReady);

  await click('.checkin-strip', 550);
  await shot('02-checkin');
  await click('[data-action="claim-checkin"]', 900);
  await shot('03-checkin-claimed');
  await click('.sheet-close', 450);

  await click('.plot-empty [data-action="open-seeds"]', 500);
  await shot('04-seed-picker');
  await click('.pick-seed', 800);
  await shot('05-planted');

  await click('.plot[data-slot="0"] [data-action="water"]', 600);
  await shot('06-watered');
  await click('.plot[data-slot="0"] [data-action="open-plant"]', 550);
  await shot('07-plant-detail');
  await click('.sheet-close', 350);

  await click('.tab-button[data-tab="shop"]', 600);
  await shot('08-shop');
  await click('.tab-button[data-tab="album"]', 600);
  await shot('09-album');
  await click('.tab-button[data-tab="profile"]', 600);
  await shot('10-profile');

  await evaluate(`(() => { const details = document.querySelector('.debug-card'); if (details) details.open = true; return true; })()`);
  await sleep(350);
  await shot('11-profile-debug');
  await click('[data-action="set-speed"][data-speed="300"]', 400);
  await click('.tab-button[data-tab="garden"]', 500);
  await evaluate(`document.getElementById('screen-root').scrollTop = 0; true`);
  await sleep(2800);
  await shot('12-bloom');
  console.log('bloom state:', await evaluate(`Game.getPlantView(0).isBloom`));

  const hasHarvest = await evaluate(`!!document.querySelector('.plot[data-slot="0"] [data-action="harvest"]')`);
  if (hasHarvest) {
    await click('.plot[data-slot="0"] [data-action="harvest"]', 900);
    await shot('13-harvest');
  }

  const savedBeforeReload = await evaluate(`(() => { const raw = localStorage.getItem('xiaoman-garden-save-v1'); if (!raw) return null; const save = JSON.parse(raw); return { coins: save.player.coins, streak: save.checkin.streak, seenIntro: save.settings.seenIntro, pots: save.potCount }; })()`);
  console.log('SAVED', JSON.stringify(savedBeforeReload));

  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(RELOAD_WAIT);
  const afterReload = await evaluate(`(() => { const state = window.Game && Game.getState(); return state ? { coins: state.player.coins, streak: state.checkin.streak, seenIntro: state.settings.seenIntro, checkinAvailable: Game.checkinView().available, introVisible: !!document.querySelector('.sheet-intro') } : null; })()`);
  console.log('AFTER_RELOAD', JSON.stringify(afterReload));
  await shot('14-reloaded');

  let updateCheckOk = true;
  if (process.env.CHECK_UPDATE === '1') {
    await evaluate(`(() => {
      const realFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.includes('version.json')) {
          return Promise.resolve(new Response(JSON.stringify({
            version: '9.9.9',
            build: 999,
            releasedAt: new Date().toISOString()
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return realFetch(input, init);
      };
      window.__autoUpdateTestMarker = true;
      return true;
    })()`);
    await evaluate('XiaomanUpdater.checkNow(); true');
    await sleep(500);
    const overlayVisible = await evaluate(`!!document.querySelector('.update-overlay')`);
    console.log('UPDATE_OVERLAY_VISIBLE', overlayVisible);
    await shot('15-update-overlay');
    await sleep(3200);
    const afterUpdateReload = await evaluate(`(() => ({
      reloaded: window.__autoUpdateTestMarker !== true,
      version: window.XIAOMAN_VERSION ? window.XIAOMAN_VERSION.version : null,
      build: window.XIAOMAN_VERSION ? window.XIAOMAN_VERSION.build : null,
      overlayGone: !document.querySelector('.update-overlay')
    }))()`);
    console.log('AFTER_UPDATE_RELOAD', JSON.stringify(afterUpdateReload));
    await shot('16-update-applied');
    updateCheckOk = overlayVisible && afterUpdateReload.reloaded && afterUpdateReload.overlayGone;
    if (!updateCheckOk) cdp.errors.push('Auto-update flow did not reload as expected');
  }

  const testErrors = await evaluate('window.__testErrors || []');
  const state = await evaluate(`(() => { const s = Game.getState(); return { coins: s.player.coins, seeds: s.inventory, streak: s.checkin.streak, seenIntro: s.settings.seenIntro, planted: s.garden.filter(Boolean).length, speed: s.settings.speed }; })()`);
  console.log('STATE', JSON.stringify(state));
  console.log('PAGE_ERRORS', JSON.stringify(testErrors));
  console.log('CDP_ERRORS', JSON.stringify(cdp.errors));

  await cdp.send('Browser.close').catch(() => {});
  edge.kill();
  await sleep(400);
  try { fs.rmSync(USER_DATA, { recursive: true, force: true }); } catch (error) { /* ignore */ }
  const layoutBroken = layout.docWidth > layout.viewport + 1 || layout.screenScrollWidth > layout.screenClientWidth + 1;
  if (testErrors.length || cdp.errors.length || layout.unlabeledButtons.length || layoutBroken || !workerReady || !updateCheckOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
