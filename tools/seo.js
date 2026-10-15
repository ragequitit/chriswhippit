// SEO-pass över alla sidor. Kan köras flera gånger (idempotent).
//   node tools/seo.js
// - Absoluta interna länkar (/setup/ i stället för setup/ som från /faq/ blev /faq/setup/)
// - alt-texter på bilder som visar videor, loggor och nedladdningar
// - Sidans titel/beskrivning/canonical uppdateras när man byter sida inne i sajten
// - Per sida: WebPage + BreadcrumbList i den strukturerade datan
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE = 'https://www.chriswhippit.com/';
const PAGES = {
  hem: { file: 'index.html', path: '', crumb: null, type: 'WebPage' },
  setup: { file: 'setup/index.html', path: 'setup/', crumb: 'Setup', type: 'WebPage' },
  schema: { file: 'schema/index.html', path: 'schema/', crumb: 'Schema', type: 'WebPage' },
  faq: { file: 'faq/index.html', path: 'faq/', crumb: 'FAQ', type: 'WebPage' },
  dl: { file: 'nedladdningar/index.html', path: 'nedladdningar/', crumb: 'Nedladdningar', type: 'CollectionPage' },
  shop: { file: 'shop/index.html', path: 'shop/', crumb: 'Shop', type: 'CollectionPage' },
  spel: { file: 'spel/index.html', path: 'spel/', crumb: 'Spel', type: 'CollectionPage' },
  samarbeten: { file: 'samarbeten/index.html', path: 'samarbeten/', crumb: 'Samarbeten', type: 'CollectionPage' },
  om: { file: 'om/index.html', path: 'om/', crumb: 'Om Chris', type: 'ProfilePage' },
  integritet: { file: 'integritetspolicy/index.html', path: 'integritetspolicy/', crumb: 'Integritetspolicy', type: 'WebPage' },
};
const SECTIONS = ['setup', 'schema', 'faq', 'nedladdningar', 'shop', 'spel', 'samarbeten', 'om', 'integritetspolicy', 'admin'];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');

// Titel och beskrivning per sida hämtas från respektive fil (källan för sanningen är <head>).
const meta = {};
for (const [k, p] of Object.entries(PAGES)) {
  const t = read(p.file);
  const title = (t.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (t.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (title && desc) meta[k] = { t: title, d: desc, u: SITE + p.path };
}

for (const [k, p] of Object.entries(PAGES)) {
  let t = read(p.file);

  // 1. Absoluta interna länkar.
  for (const s of SECTIONS) t = t.split(`href="${s}/"`).join(`href="/${s}/"`);
  t = t.split('href=""').join('href="/"');
  t = t.replace('<a href="/admin/" style=', '<a href="/admin/" rel="nofollow" style=');

  // 2. alt-texter.
  const alts = [
    ['<img src="{{ v0thumb }}" alt=""', '<img src="{{ v0thumb }}" alt="{{ v0title }}"'],
    ['<img src="{{ v.thumb }}" alt=""', '<img src="{{ v.thumb }}" alt="{{ v.title }}"'],
    ['<img src="{{ s.logo }}" alt=""', '<img src="{{ s.logo }}" alt="{{ s.name }}"'],
    ['<img src="{{ cLogo }}" alt=""', '<img src="{{ cLogo }}" alt="{{ cName }}"'],
    ['<img src="{{ cThumb }}" alt=""', '<img src="{{ cThumb }}" alt="{{ cTitle }}"'],
    ['<img src="{{ d.image }}" alt=""', '<img src="{{ d.image }}" alt="{{ d.title }}"'],
  ];
  for (const [a, b] of alts) t = t.split(a).join(b);

  // 3. Byt titel/beskrivning/canonical vid navigering inne i sajten.
  if (!t.includes('const ROUTE_META =')) {
    const fn = `const ROUTE_META = ${JSON.stringify(meta)};
const applyRouteMeta = (route) => {
  const m = ROUTE_META[route]; if (!m) return;
  document.title = m.t;
  const set = (sel, attr, v) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, v); };
  set('meta[name="description"]', 'content', m.d); set('meta[property="og:description"]', 'content', m.d); set('meta[name="twitter:description"]', 'content', m.d);
  set('meta[property="og:title"]', 'content', m.t); set('meta[name="twitter:title"]', 'content', m.t);
  set('link[rel="canonical"]', 'href', m.u); set('meta[property="og:url"]', 'content', m.u);
};
const GAMES = [`;
    t = t.replace('const GAMES = [', () => fn);
    t = t.replace('  componentDidUpdate() { this.applyLang();', () => '  componentDidUpdate() { if (this._metaRoute !== this.state.route) { this._metaRoute = this.state.route; applyRouteMeta(this.state.route); } this.applyLang();');
  } else {
    t = t.replace(/const ROUTE_META = .*;\n/, () => `const ROUTE_META = ${JSON.stringify(meta)};\n`);
  }

  // 4. Strukturerad data: WebPage + brödsmulor för just den här sidan.
  if (meta[k] && !t.includes('"@id": "' + meta[k].u + '#webpage"')) {
    const page = {
      '@type': p.type, '@id': meta[k].u + '#webpage', url: meta[k].u, name: meta[k].t, description: meta[k].d,
      inLanguage: 'sv-SE', isPartOf: { '@id': SITE + '#site' }, about: { '@id': SITE + '#chris' },
      primaryImageOfPage: { '@type': 'ImageObject', url: SITE + 'assets/share.jpg' },
    };
    if (p.type === 'ProfilePage') page.mainEntity = { '@id': SITE + '#chris' };
    const nodes = [page];
    if (p.crumb) {
      page.breadcrumb = { '@id': meta[k].u + '#breadcrumb' };
      nodes.push({ '@type': 'BreadcrumbList', '@id': meta[k].u + '#breadcrumb', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Chris Whippit', item: SITE },
        { '@type': 'ListItem', position: 2, name: p.crumb, item: meta[k].u },
      ] });
    }
    const json = nodes.map((n) => JSON.stringify(n, null, 2).replace(/^/gm, '    ')).join(',\n');
    const end = '\n  ]\n}</script>';
    if (t.split(end).length !== 2) throw new Error(p.file + ': hittar inte slutet på den strukturerade datan');
    t = t.replace(end, () => ',\n' + json + end);
  }

  fs.writeFileSync(path.join(root, p.file), t);
  console.log(p.file.padEnd(30), meta[k] ? 'ok' : 'SAKNAR titel/beskrivning');
}
