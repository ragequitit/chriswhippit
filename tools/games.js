// Lägger in det som varje fristående spel i spel/ behöver. Kör efter att ett spel bytts ut:
//   node tools/games.js
// Idempotent: lägger bara till det som saknas.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE = 'https://www.chriswhippit.com/';
const GAMES = {
  'break-shot': { name: 'Break Shot', desc: 'Break Shot är ett gratis biljardspel i webbläsaren. Sikta, skjut och kedja ihop kombos för poäng. Ingen nedladdning, och spelet sparar hur långt du kommit.' },
  'peg-vault': { name: 'Peg Vault', desc: 'Peg Vault är ett gratis kulspel i webbläsaren. Välj bana, samla Charms och uppgradera valvet. Ingen nedladdning, och spelet sparar hur långt du kommit.' },
  'pop-parade': { name: 'Pop Parade', desc: 'Pop Parade är ett gratis ballongspel i webbläsaren. Sikta med kanonen och spräck paraden. Ingen nedladdning, och spelet sparar hur långt du kommit.' },
  'sky-burst': { name: 'Sky Burst', desc: 'Sky Burst är ett gratis fyrverkerispel i webbläsaren. Sikta mot natthimlen och avfyra. Ingen nedladdning, och spelet sparar hur långt du kommit.' },
  'volt-storm': { name: 'Volt Storm', desc: 'Volt Storm är ett gratis kulspel i ett laboratorium, direkt i webbläsaren. Ladda brädet och jaga gnistor. Ingen nedladdning, och spelet sparar hur långt du kommit.' },
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

for (const [slug, g] of Object.entries(GAMES)) {
  const file = path.join(root, 'spel', slug + '.html');
  let t = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const url = SITE + 'spel/' + slug + '.html';
  const img = SITE + 'spel/thumbs/' + slug + '-board.jpg'; // delningsbild (JPEG för bredast stöd)
  const done = [];

  if (/<html(?![^>]*\blang=)/.test(t)) { t = t.replace(/<html/, '<html lang="en"'); done.push('lang'); }
  if (!t.includes('rel="canonical"')) {
    const title = `${g.name} – gratis spel i webbläsaren | Chris Whippit`;
    const head = [
      `<meta name="description" content="${esc(g.desc)}">`,
      `<link rel="canonical" href="${url}">`,
      `<meta name="robots" content="index, follow, max-image-preview:large">`,
      `<meta name="theme-color" content="#161826">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="Chris Whippit">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(g.desc)}">`,
      `<meta property="og:image" content="${img}">`,
      `<meta property="og:image:width" content="400">`,
      `<meta property="og:image:height" content="500">`,
      `<meta name="twitter:card" content="summary">`,
      `<meta name="twitter:site" content="@chriswhippit">`,
      `<link rel="icon" href="/favicon.ico" sizes="48x48">`,
      `<link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">`,
      `<link rel="apple-touch-icon" href="/assets/favicon-180.png">`,
      `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoGame', name: g.name, url, description: g.desc, image: img, gamePlatform: 'Web browser', applicationCategory: 'Game', offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' }, author: { '@type': 'Person', name: 'Chris Whippit', url: SITE } })}</script>`,
    ].join('\n');
    t = t.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>\n${head}`);
    done.push('head');
  }
  if (!t.includes('/spel/back.js')) {
    if (t.split('</body>').length !== 2) throw new Error(slug + ': </body> finns inte exakt en gång');
    t = t.replace('</body>', '<script src="/spel/back.js" defer></script>\n</body>');
    done.push('back.js');
  }
  fs.writeFileSync(file, t);
  console.log(slug.padEnd(12), done.length ? 'lade till: ' + done.join(', ') : 'redan klar');
}
