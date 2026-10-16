// Prestanda- och tillgänglighetsfixar i alla sidmallar. Idempotent.
//   node tools/perf.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const PAGES = require('./pages').map((p) => p.file);
require('./build').buildAll(); // utgå från src/sida.html (se tools/build.js)

// De fyra ikonerna som används publikt, som inbyggd SVG (slipper ladda en ikonfont på 129 KB).
const ICONS = {
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',
  clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v4.59l3.2 3.2-1.4 1.42-3.8-3.8V7h2z"/>',
  'calendar-blank': '<path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9z"/>',
  'caret-down': '<path d="M5 8.5h14L12 17z"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" fill="currentColor" focusable="false">${ICONS[name]}</svg>`;

const CSS = `  /* Prestanda/tillgänglighet (tools/perf.js) */
  [data-ico] { display: inline-flex; align-items: center; line-height: 1; }
  [data-ico] svg { width: 1em; height: 1em; display: block; }
  main[style*="padding: 72px 24px 0"] { min-height: 100vh; }
`;

for (const f of PAGES) {
  const file = path.join(root, f);
  let t = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const before = t.length;
  const tplStart = t.indexOf('<x-dc><template>'), tplEnd = t.indexOf('</template></x-dc>');
  let tpl = t.slice(tplStart, tplEnd);

  // Ikoner -> SVG.
  tpl = tpl.replace(/<i class="ph-fill ph-(play|clock|calendar-blank|caret-down)"([^>]*)><\/i>/g, (m, name, attrs) => `<i data-ico="${name}"${attrs}>${svg(name)}</i>`);

  // Lazy-loading för bilder som inte syns direkt (inte porträttet överst eller loggan i menyn).
  tpl = tpl.replace(/<img (?![^>]*\bloading=)([^>]*)>/g, (m, attrs) => {
    if (/data-hero-img|\/assets\/logo-white|\/assets\/logo-64/.test(attrs)) return m;
    return `<img loading="lazy" decoding="async" ${attrs}>`;
  });

  // Inbyggd fade-in: behåll glidningen men aldrig osynlig text (kontrast/LCP).
  tpl = tpl.replace('@keyframes rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; }', '@keyframes rise { from { transform: translateY(26px); } to { transform: none; }');

  // Lila knappar: vit text på #8657FF har kontrast 4.36 (krav 4.5). #7a4af5 ger 5.09.
  tpl = tpl.split('background: #8657FF; color: #fff').join('background: #7a4af5; color: #fff');

  // Stora YouTube-bilden: maxresdefault (~290 KB) -> sddefault (640 px, ~50 KB).
  t = t.split("'/maxresdefault.jpg'").join("'/sddefault.jpg'");

  // Loggan (1552 px bred, visas i 22-30 px) -> 64 px-version.
  tpl = tpl.split('src="/assets/logo-white.png"').join('src="/assets/logo-64.png" width="30" height="30"');

  // Ikonfontens CSS (84 KB, ~3000 regler) behövs inte längre på de publika sidorna.
  tpl = tpl.replace(/<style>\s*@font-face \{\s*font-family: "Phosphor-Fill";[\s\S]*?<\/style>\n?/, '');

  if (!tpl.includes('tools/perf.js')) tpl = tpl.replace('  [data-thumb] { transition:', CSS + '  [data-thumb] { transition:');
  t = t.slice(0, tplStart) + tpl + t.slice(tplEnd);
  fs.writeFileSync(file, t);
  console.log(f.padEnd(30), (t.length - before >= 0 ? '+' : '') + (t.length - before), 'tecken');
}

// Spara den ändrade mallen tillbaka i källan.
require('./build').pullBody();
