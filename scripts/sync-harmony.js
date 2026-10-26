/* 把同一套 www 前端同步进 HarmonyOS 的 rawfile，并同步应用图标。
 * 用法：npm run sync:harmony
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'www');
const harmony = path.join(root, 'harmony');
const rawfile = path.join(harmony, 'entry/src/main/resources/rawfile/www');
const media = path.join(harmony, 'entry/src/main/resources/base/media');
const appMedia = path.join(harmony, 'AppScope/resources/base/media');

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

if (!fs.existsSync(web)) {
  console.error('找不到 www 目录');
  process.exit(1);
}

fs.rmSync(path.join(harmony, 'entry/src/main/resources/rawfile/www'), { recursive: true, force: true });
fs.mkdirSync(rawfile, { recursive: true });
fs.cpSync(web, rawfile, { recursive: true });

copyFile(path.join(web, 'icons/icon-1024.png'), path.join(appMedia, 'app_icon.png'));
copyFile(path.join(web, 'icons/icon-512.png'), path.join(media, 'icon.png'));
copyFile(path.join(web, 'icons/icon-512.png'), path.join(media, 'startIcon.png'));

function countFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    if (entry.isDirectory()) return total + countFiles(path.join(dir, entry.name));
    return total + 1;
  }, 0);
}

console.log('HarmonyOS rawfile 已同步：' + countFiles(rawfile) + ' 个文件');
console.log('输出：' + rawfile);
