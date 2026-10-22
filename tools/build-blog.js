// Bygger bloggens inläggssidor från content.json → blog. Körs av .github/workflows/blog.yml när content.json ändras.
//   node tools/build-blog.js
// - blogg/<slug>/index.html för varje synligt inlägg: egen <head> (titel, beskrivning, delningsbild,
//   strukturerad data) + src/sida.html, så att Google och delningar ser inlägget direkt
// - tar bort sidor för inlägg som raderats eller dolts
// - uppdaterar bloggens adresser i sitemap.xml
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE = 'https://www.chriswhippit.com/';
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const content = JSON.parse(read('content.json'));
const posts = (content.blog || []).filter((p) => p && p.title && SLUG.test(p.slug || '') && p.slug.length <= 80 && !p.hidden)
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

// Samma utdrag som sajten visar: första vanliga stycket, högst 170 tecken.
const excerpt = (t) => {
  const p = String(t || '').split(/\n\s*\n/).map((x) => x.trim()).find((x) => x && !/^##\s|^\[bild\s*\d+\]$/i.test(x)) || '';
  return (p.length > 170 ? p.slice(0, 170).replace(/\s+\S*$/, '') + ' …' : p).replace(/\s+/g, ' ');
};
const abs = (u) => !u ? '' : /^https?:\/\//.test(u) ? u : SITE + String(u).replace(/^\/+/, '');
const img = (x) => (x && typeof x === 'object' ? x.src : x) || '';

// Grund-head: FAQ-sidans (samma stil, skript och ikoner), med bara Person + WebSite i den strukturerade datan.
const faq = read('faq/index.html');
const base = faq.slice(0, faq.indexOf('<body>'));
const body = read('src/sida.html');

function head(p) {
  const title = p.title + ' | Chris Whippit';
  const desc = excerpt(p.text) || p.title;
  const url = SITE + 'blogg/' + p.slug + '/';
  const share = abs(p.share || img((p.images || [])[0])) || SITE + 'assets/share.jpg';
  let h = base;
  const set = (re, v) => { if (!re.test(h)) throw new Error('faq-head saknar ' + re); h = h.replace(re, (m, a, b) => a + v + b); };
  set(/(<title>)[^<]*(<\/title>)/, esc(title));
  set(/(<meta name="description" content=")[^"]*(")/, esc(desc));
  set(/(<link rel="canonical" href=")[^"]*(")/, url);
  set(/(<meta property="og:type" content=")[^"]*(")/, 'article');
  set(/(<meta property="og:url" content=")[^"]*(")/, url);
  set(/(<meta property="og:title" content=")[^"]*(")/, esc(title));
  set(/(<meta property="og:description" content=")[^"]*(")/, esc(desc));
  set(/(<meta property="og:image" content=")[^"]*(")/, esc(share));
  set(/(<meta property="og:image:alt" content=")[^"]*(")/, esc(p.title));
  set(/(<meta name="twitter:title" content=")[^"]*(")/, esc(title));
  set(/(<meta name="twitter:description" content=")[^"]*(")/, esc(desc));
  set(/(<meta name="twitter:image" content=")[^"]*(")/, esc(share));
  // Delningsbildens storlek: 1200×630 bara när admin gjort en sådan (p.share), annars okänd.
  if (!p.share) h = h.replace(/<meta property="og:image:width"[^>]*>\n/, '').replace(/<meta property="og:image:height"[^>]*>\n/, '');
  if (p.date) h = h.replace('<meta property="og:locale"', `<meta property="article:published_time" content="${esc(p.date)}">\n<meta property="og:locale"`);
  h = h.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (m, a, json, b) => {
    const j = JSON.parse(json);
    j['@graph'] = j['@graph'].filter((n) => n['@type'] === 'Person' || n['@type'] === 'WebSite');
    j['@graph'].push({
      '@type': 'BlogPosting', '@id': url + '#post', url, headline: p.title, description: desc, inLanguage: 'sv-SE',
      ...(p.date ? { datePublished: p.date, dateModified: p.updated || p.date } : {}),
      image: (p.images || []).map((x) => abs(img(x))).filter(Boolean).slice(0, 6),
      author: { '@id': SITE + '#chris' }, publisher: { '@id': SITE + '#chris' }, isPartOf: { '@id': SITE + '#site' },
      mainEntityOfPage: url, breadcrumb: { '@id': url + '#breadcrumb' },
    }, {
      '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Chris Whippit', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Blogg', item: SITE + 'blogg/' },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    });
    return a + JSON.stringify(j, null, 2).replace(/</g, '\\u003c') + b;
  });
  return h;
}

// 1. Skriv inläggens sidor.
const dir = path.join(root, 'blogg');
const keep = new Set(posts.map((p) => p.slug));
for (const p of posts) {
  const f = path.join(dir, p.slug, 'index.html');
  const next = head(p) + body;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') !== next) { fs.writeFileSync(f, next); console.log('skrev', 'blogg/' + p.slug + '/'); }
}

// 2. Ta bort sidor för inlägg som inte längre finns (bara inläggsmappar, aldrig blogg/index.html).
for (const n of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  const d = path.join(dir, n);
  if (!SLUG.test(n) || keep.has(n) || !fs.statSync(d).isDirectory()) continue;
  if (fs.readdirSync(d).every((x) => x === 'index.html')) { fs.rmSync(d, { recursive: true }); console.log('tog bort', 'blogg/' + n + '/'); }
}

// 3. Sitemap: bloggens inlägg (och listans datum) skrivs om varje gång.
let sm = read('sitemap.xml');
sm = sm.replace(/  <url>\n    <loc>https:\/\/www\.chriswhippit\.com\/blogg\/[a-z0-9-]+\/<\/loc>[\s\S]*?<\/url>\n/g, '');
const newest = posts[0] && (posts[0].updated || posts[0].date);
if (newest) sm = sm.replace(/(<loc>https:\/\/www\.chriswhippit\.com\/blogg\/<\/loc>\n    <lastmod>)[^<]*(<\/lastmod>)/, (m, a, b) => a + newest + b);
const urls = posts.map((p) => `  <url>\n    <loc>${SITE}blogg/${p.slug}/</loc>\n${p.date ? `    <lastmod>${p.updated || p.date}</lastmod>\n` : ''}    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`).join('');
sm = sm.replace('</urlset>', () => urls + '</urlset>');
if (sm !== read('sitemap.xml')) { fs.writeFileSync(path.join(root, 'sitemap.xml'), sm); console.log('uppdaterade sitemap.xml'); }
console.log(posts.length, 'inlägg');
