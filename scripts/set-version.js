#!/usr/bin/env node
/* 一处修改三端 + PWA 的版本号。
 * 用法：
 *   npm run version:set -- 0.2.0 2
 *   第二个参数是递增的内部构建号（Android versionCode / iOS build / Harmony versionCode）
 * 可选 --dry-run 只预览，不写文件。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes('--dry-run');
const args = rawArgs.filter((arg) => arg !== '--dry-run');
const version = args[0];
const build = Number(args[1]);

if (!version || !/^\d+\.\d+\.\d+$/.test(version) || !Number.isInteger(build) || build <= 0) {
  console.error('用法：npm run version:set -- <版本号，例如 0.2.0> <递增构建号，例如 2> [--dry-run]');
  process.exit(1);
}

const updates = [];
const writes = [];

function plan(file, transform, validate) {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute)) throw new Error('找不到文件：' + file);
  const before = fs.readFileSync(absolute, 'utf8');
  const after = transform(before, file);
  if (validate) validate(before, after, file);
  if (after !== before) {
    updates.push(file);
    writes.push({ absolute, after });
  }
}

plan('package.json', (text) => {
  const data = JSON.parse(text);
  data.version = version;
  return JSON.stringify(data, null, 2) + '\n';
});

plan('package-lock.json', (text) => {
  const data = JSON.parse(text);
  data.version = version;
  if (data.packages && data.packages['']) data.packages[''].version = version;
  return JSON.stringify(data, null, 2) + '\n';
});

plan('android/app/build.gradle', (text) => {
  if (!/versionCode\s+\d+/.test(text) || !/versionName\s+"[^"]*"/.test(text)) {
    throw new Error('Android build.gradle 中没有找到 versionCode / versionName');
  }
  return text
    .replace(/versionCode\s+\d+/, 'versionCode ' + build)
    .replace(/versionName\s+"[^"]*"/, 'versionName "' + version + '"');
});

plan('ios/App/App.xcodeproj/project.pbxproj', (text) => {
  if (!/CURRENT_PROJECT_VERSION = \d+;/.test(text) || !/MARKETING_VERSION = [^;]+;/.test(text)) {
    throw new Error('iOS 工程中没有找到 CURRENT_PROJECT_VERSION / MARKETING_VERSION');
  }
  return text
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, 'CURRENT_PROJECT_VERSION = ' + build + ';')
    .replace(/MARKETING_VERSION = [^;]+;/g, 'MARKETING_VERSION = ' + version + ';');
});

plan('harmony/AppScope/app.json5', (text) => {
  if (!/"versionCode"\s*:\s*\d+/.test(text) || !/"versionName"\s*:\s*"[^"]*"/.test(text)) {
    throw new Error('HarmonyOS app.json5 中没有找到 versionCode / versionName');
  }
  return text
    .replace(/"versionCode"\s*:\s*\d+/, '"versionCode": ' + build)
    .replace(/"versionName"\s*:\s*"[^"]*"/, '"versionName": "' + version + '"');
});

plan('www/js/version.js', (text) => {
  const pattern = /window\.XIAOMAN_VERSION = Object\.freeze\(\{ version: '[^']*', build: \d+ \}\);/;
  if (!pattern.test(text)) throw new Error('version.js 中没有找到本地版本声明');
  return text.replace(
    pattern,
    "window.XIAOMAN_VERSION = Object.freeze({ version: '" + version + "', build: " + build + ' });'
  );
});

plan('www/version.json', (text) => {
  const data = JSON.parse(text);
  data.version = version;
  data.build = build;
  data.releasedAt = new Date().toISOString();
  return JSON.stringify(data, null, 2) + '\n';
});

plan('www/sw.js', (text) => {
  if (!/const CACHE_NAME = '[^']*';/.test(text)) {
    throw new Error('sw.js 中没有找到 CACHE_NAME');
  }
  return text.replace(
    /const CACHE_NAME = '[^']*';/,
    "const CACHE_NAME = 'xiaoman-garden-v" + version + "-" + build + "';"
  );
});

console.log(dryRun ? '预览（未写入）' : '已更新版本');
console.log('应用版本：' + version);
console.log('构建号：' + build);
console.log('PWA 缓存：xiaoman-garden-v' + version + '-' + build);
console.log('修改：' + (updates.length ? updates.join(', ') : '无变化'));

if (!dryRun) {
  for (const item of writes) fs.writeFileSync(item.absolute, item.after, 'utf8');
  console.log('');
  console.log('下一步：');
  console.log('  1. npm test && npm run check:ui');
  console.log('  2. npm run sync:native');
  console.log('  3. 部署 www/，或者用 Android Studio / Xcode / DevEco Studio 重新出包');
}
