// Packar upp Claude Design-exporterade sidor till vanlig HTML + delade filer.
// Gör samma sak som bundlerns laddare i webbläsaren, men en gång, på disk.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const root = process.argv[2];
const OUT_DIR = 'assets/bundle';
const EXT = {
  'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/gif': 'gif',
  'text/javascript': 'js', 'application/javascript': 'js', 'text/css': 'css',
  'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf',
};

function grab(t, type) {
  const open = '<script type="__bundler/' + type + '">';
  const i = t.indexOf(open); if (i < 0) return null;
  return t.slice(i + open.length, t.indexOf('</script>', i)).trim();
}

const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    if (f === '.git') continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) pages.push(p);
  }
})(root);

fs.mkdirSync(path.join(root, OUT_DIR), { recursive: true });
const written = new Map(); // url -> bytes
let before = 0, after = 0;

for (const file of pages) {
  const src = fs.readFileSync(file, 'utf8');
  const man = grab(src, 'manifest');
  if (!man) continue;
  const manifest = JSON.parse(man);
  let tpl = JSON.parse(grab(src, 'template'));
  const ext = JSON.parse(grab(src, 'ext_resources') || '[]');
  const pageOrder = JSON.parse(grab(src, 'page_order') || '[]');
  if (pageOrder.length) throw new Error(file + ': nested pages not supported');

  const urls = {};
  for (const [uuid, e] of Object.entries(manifest)) {
    let bytes = Buffer.from(e.data, 'base64');
    if (e.compressed) bytes = zlib.gunzipSync(bytes);
    const x = EXT[e.mime];
    if (!x) throw new Error(file + ': unknown mime ' + e.mime);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const url = '/' + OUT_DIR + '/' + hash + '.' + x;
    if (!written.has(url)) { fs.writeFileSync(path.join(root, url), bytes); written.set(url, bytes.length); }
    urls[uuid] = url;
  }

  for (const [uuid, url] of Object.entries(urls)) tpl = tpl.split(uuid).join(url);
  tpl = tpl.replace(/\s+integrity="[^"]*"/gi, '').replace(/\s+crossorigin="[^"]*"/gi, '');

  const resourceMap = {};
  for (const e of ext) if (urls[e.uuid]) resourceMap[e.id] = urls[e.uuid];
  const resourceScript = '<script>window.__resources = ' + JSON.stringify(resourceMap).replace(/<\//g, '<\\/') + ';</script>';
  const head = tpl.match(/<head[^>]*>/i);
  if (!head) throw new Error(file + ': no <head>');
  const i = head.index + head[0].length;
  tpl = tpl.slice(0, i) + resourceScript + tpl.slice(i);

  fs.writeFileSync(file, tpl);
  before += Buffer.byteLength(src); after += Buffer.byteLength(tpl);
  console.log(path.relative(root, file).padEnd(26), (Buffer.byteLength(src) / 1e6).toFixed(2), 'MB ->', (Buffer.byteLength(tpl) / 1e3).toFixed(0), 'KB');
}

const shared = [...written.values()].reduce((a, b) => a + b, 0);
console.log('\nsidor:', (before / 1e6).toFixed(1), 'MB ->', (after / 1e6).toFixed(2), 'MB');
console.log('delade filer:', written.size, 'st,', (shared / 1e6).toFixed(2), 'MB (laddas en gång, cachas)');
