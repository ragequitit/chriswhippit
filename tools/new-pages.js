// Skapar sidfiler som saknas (utifrån faq-sidan) med egen titel, beskrivning och adress.
//   node tools/new-pages.js   (kör sedan node tools/seo.js)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const PAGES = require('./pages');
const SITE = 'https://www.chriswhippit.com/';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const base = fs.readFileSync(path.join(root, 'faq/index.html'), 'utf8').replace(/\r\n/g, '\n');
const bT = base.match(/<title>([^<]*)<\/title>/)[1];
const bD = base.match(/<meta name="description" content="([^"]*)"/)[1];

for (const p of PAGES) {
  const file = path.join(root, p.file);
  if (fs.existsSync(file)) continue;
  if (!p.title || !p.desc) throw new Error(p.file + ': titel/beskrivning saknas i tools/pages.js');
  let t = base;
  // Bara Person + WebSite i den strukturerade datan; seo.js lägger till sidans egna noder.
  t = t.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (m, a, json, b) => {
    const j = JSON.parse(json); j['@graph'] = j['@graph'].filter((n) => n['@type'] === 'Person' || n['@type'] === 'WebSite');
    return a + JSON.stringify(j, null, 2) + b;
  });
  t = t.split(bT).join(esc(p.title)).split(bD).join(esc(p.desc)).split(SITE + 'faq/').join(SITE + p.path);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, t);
  console.log('skapade', p.file);
}
