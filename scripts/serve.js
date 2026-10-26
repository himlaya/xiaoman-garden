/* 零依赖静态服务器，方便在电脑上调试。
 * 用法：node scripts/serve.js [--port 4173] [--host 127.0.0.1]
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'www');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const port = Number(getArg('--port', process.env.PORT || 4173));
const host = getArg('--host', process.env.HOST || '127.0.0.1');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root + path.sep) && target !== root) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(target, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('花开在了别处：' + pathname);
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Content-Length': stat.size
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(port, host, () => {
  const shownHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  console.log(`小满花园已开园： http://${shownHost}:${port}`);
  console.log('按 Ctrl+C 收园');
});

server.on('error', (error) => {
  console.error('无法启动调试服务器：', error.message);
  process.exitCode = 1;
});
