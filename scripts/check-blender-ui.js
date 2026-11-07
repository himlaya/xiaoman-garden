/* Real browser acceptance check for Blender assets, item pigments and the shelf. */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'screenshots', 'blender');
fs.mkdirSync(output, { recursive: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), '--port', '4174'], { windowsHide: true, stdio: 'ignore' });
const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9336', '--no-first-run', '--no-default-browser-check', '--no-proxy-server',
  '--user-data-dir=' + path.join(os.tmpdir(), 'garden-blender-check-' + Date.now()),
  'http://127.0.0.1:4174/'
], { windowsHide: true, stdio: 'ignore' });
let ws, next = 0;
const pending = new Map();
const errors = [];
function send(method, params = {}) {
  const id = ++next;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    const result = await evaluate(expression);
    if (result) return result;
    await pause(150);
  }
  throw new Error('Timed out: ' + expression);
}
async function main() {
  let tabs;
  for (let i = 0; i < 60; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9336/json/list')).json(); if (tabs.length) break; } catch {}
    await pause(200);
  }
  const tab = tabs?.find(tab => tab.type === 'page');
  if (!tab) throw new Error('Browser did not start');
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve));
  ws.addEventListener('message', event => {
    const data = JSON.parse(String(event.data));
    if (data.id) {
      const request = pending.get(data.id); pending.delete(data.id);
      if (data.error) request.reject(new Error(JSON.stringify(data.error))); else request.resolve(data.result);
    }
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 900, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:4174/' });
  await until('!!window.Flower3D && !!window.FlowerAssets && !!window.Game');
  await evaluate(`window._OriginalRenderer=THREE.WebGLRenderer; THREE.WebGLRenderer=class extends window._OriginalRenderer { constructor(options){super(options); const render=this.render.bind(this);this.render=function(scene,camera){window._flowerScene=scene;return render(scene,camera);};} };`);
  const species = await evaluate('GameData.flowers.map(flower => flower.id)');
  const results = [];
  for (const flower of species) {
    await evaluate(`Flower3D.openItem(GardenItems.createBouquet(GameData.flowerMap[${JSON.stringify(flower)}], {}, {ratio:1}, {id:'check',grade:'legendary',templateId:'gilded',patternSeed:143,wear:.03}));`);
    await until(`window._flowerScene?.getObjectByName('flower-model-${flower}')?.userData.assetSource === 'Blender'`);
    const details = await evaluate(`(()=>{const root=window._flowerScene.getObjectByName('flower-model-${flower}');let petals=0,leaf=0;root.traverse(mesh=>{if(mesh.geometry?.userData.botanical==='petal' && mesh.material?.map)petals++;if(mesh.geometry?.userData.botanical==='leaf' && mesh.material?.bumpMap)leaf++;});return {flower:${JSON.stringify(flower)},modelId:root.userData.modelId,petals,leaf,buttons:document.querySelectorAll('.flower3d-stages button').length};})()`);
    if (!details.petals || !details.leaf || details.buttons) throw new Error('Missing item materials or invalid controls: ' + JSON.stringify(details));
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, flower + '.png'), Buffer.from(screenshot.data, 'base64'));
    results.push(details);
  }
  await evaluate(`Flower3D.openShelf(GameData.flowers.slice(0,6).map((flower,index)=>GardenItems.createBouquet(flower,{}, {ratio:1}, {id:'shelf-'+index,grade:'rare',templateId:'dawn',patternSeed:index+10,wear:.03})),0)`);
  await until(`(()=>{const rack=window._flowerScene?.getObjectByName('bouquet-display-rack');return rack && rack.children.filter(child=>child.userData.assetSource==='Blender').length===6;})()`);
  const shelf = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, 'shelf.png'), Buffer.from(shelf.data, 'base64'));
  await evaluate('Flower3D.close(); Flower3D.openFlower("rose"); Flower3D.close();');
  await pause(800);
  if (errors.length) throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ models: results, shelfModels: 6, errors }, null, 2));
  console.log('Browser passed: 12 species, 6 shelf models, item textures, controls and close-during-load');
}
main().catch(async error => {
  console.error(error);
  if (ws?.readyState === 1) {
    console.error(await evaluate('JSON.stringify({url:location.href,title:document.title,text:document.body?.innerText?.slice(0,1000),scripts:[...document.scripts].map(s=>s.src),errors:'+JSON.stringify(errors)+'})'));
    const shot=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));
  }
  process.exitCode = 1;
}).finally(() => { if(ws)ws.close(); browser.kill(); server.kill(); });
