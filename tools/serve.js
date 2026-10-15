// Minimal statisk server som beter sig som GitHub Pages (mapp/ -> mapp/index.html,
// gzip på text, 404.html för sidor som saknas, cache-header som Pages: 10 min).
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8080);
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', txt: 'text/plain', xml: 'application/xml', webmanifest: 'application/manifest+json', ico: 'image/x-icon' };
const TEXT = /^(text\/|application\/(json|xml|manifest\+json)|image\/svg)/;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    f = path.join(f, 'index.html');
  }
  let status = 200;
  if (!fs.existsSync(f)) { console.log('404', p); status = 404; f = path.join(root, '404.html'); if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); } }
  const type = TYPES[path.extname(f).slice(1)] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Cache-Control': 'max-age=600' };
  if (TEXT.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    return fs.createReadStream(f).pipe(zlib.createGzip()).pipe(res);
  }
  res.writeHead(status, headers);
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port));
