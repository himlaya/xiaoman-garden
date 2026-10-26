/* 版本一致性检查：网页、安卓、iOS、鸿蒙和 Service Worker 不能各自为政。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const matchOrFail = (source, pattern, label) => {
  const match = source.match(pattern);
  assert.ok(match, label + ' 中找不到版本号');
  return match[1];
};

test('网页、三端原生工程与 PWA 缓存版本保持一致', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const android = read('android/app/build.gradle');
  const ios = read('ios/App/App.xcodeproj/project.pbxproj');
  const harmony = JSON.parse(read('harmony/AppScope/app.json5'));
  const local = read('www/js/version.js');
  const remote = JSON.parse(read('www/version.json'));
  const sw = read('www/sw.js');

  const androidVersion = matchOrFail(android, /versionName\s+"([^"]+)"/, 'Android versionName');
  const androidBuild = Number(matchOrFail(android, /versionCode\s+(\d+)/, 'Android versionCode'));
  const iosVersion = matchOrFail(ios, /MARKETING_VERSION = ([^;]+);/, 'iOS MARKETING_VERSION');
  const iosBuild = Number(matchOrFail(ios, /CURRENT_PROJECT_VERSION = (\d+);/, 'iOS CURRENT_PROJECT_VERSION'));
  const webVersion = matchOrFail(local, /version:\s*'([^']+)'/, 'version.js');
  const webBuild = Number(matchOrFail(local, /build:\s*(\d+)/, 'version.js build'));
  const swCache = matchOrFail(sw, /const CACHE_NAME = '([^']+)';/, 'sw.js CACHE_NAME');

  assert.equal(pkg.version, webVersion);
  assert.equal(lock.version, webVersion);
  assert.equal(lock.packages[''].version, webVersion);
  assert.equal(androidVersion, webVersion);
  assert.equal(iosVersion, webVersion);
  assert.equal(harmony.app.versionName, webVersion);
  assert.equal(remote.version, webVersion);

  assert.equal(androidBuild, webBuild);
  assert.equal(iosBuild, webBuild);
  assert.equal(Number(harmony.app.versionCode), webBuild);
  assert.equal(Number(remote.build), webBuild);
  assert.equal(swCache, 'xiaoman-garden-v' + webVersion + '-' + webBuild);
});
