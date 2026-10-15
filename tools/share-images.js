// Gör en delningsbild (1200x630) per sida – den som syns när länken delas på Discord, X, Messenger m.fl.
//   node tools/share-images.js            (alla sidor)
//   node tools/share-images.js ganget     (bara en)
// Renderar HTML med Microsoft Edge headless och sparar assets/share/<sida>.jpg.
// Uppdaterar sedan og:image/twitter:image i respektive sidas <head>.
// Startsidan behåller assets/share.jpg.
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const SITE = 'https://www.chriswhippit.com/';
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const fileUrl = (p) => 'file:///' + path.join(root, p).replace(/\\/g, '/');
const yt = (id) => 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';
const content = JSON.parse(fs.readFileSync(path.join(root, 'content.json'), 'utf8'));
const PAGES = require('./pages');

const portrait = { type: 'photo', src: fileUrl('assets/portrait.jpg') };
const grid = (srcs) => ({ type: 'grid', srcs });
const CFG = {
  'videor': { title: 'Videor', sub: 'Serier, kanaler och spellistor sedan 2014', vis: grid(['YtPTdCR1e0Q', 'jWfcD0ZNevU', 'D9mH3nRjhbs', 'GqrUWpeiAdw'].map(yt)) },
  'serie:minecraft': { kicker: 'Videor', title: 'Minecraft', sub: 'Let’s Play med Softis, Lucky Block, Skyblock och Hardcore', vis: { type: 'photo', src: yt('YtPTdCR1e0Q') } },
  'serie:gta-5': { kicker: 'Videor', title: 'GTA 5', sub: 'Nästan 1 000 videor – race, heists och kaos', vis: { type: 'photo', src: yt('jWfcD0ZNevU') } },
  'serie:fortnite': { kicker: 'Videor', title: 'Fortnite', sub: 'Nästan 600 videor från 2017 till 2024', vis: { type: 'photo', src: yt('D9mH3nRjhbs') } },
  'serie:vloggar': { kicker: 'Videor', title: 'Vloggar & Pokémon GO', sub: 'Familjen, discgolf, raids och vardagen', vis: { type: 'photo', src: yt('GqrUWpeiAdw') } },
  'ganget': { title: 'Gänget', sub: (content.crew || []).map((m) => m.name).join(' · '), vis: { type: 'avatars' } },
  'historia': { title: 'Genom åren', sub: 'Från 2013 till nästan 8 000 videor', vis: grid(['qhP9CvQkT90', '_cbWmg8ifds', '9ll7uWVLvoM', 'eoqM7BVA1uw'].map(yt)) },
  'om': { title: 'Om Chris Whippit', sub: 'Svensk YouTuber från Strömstad sedan 2014', vis: portrait },
  'faq': { title: 'Frågor & svar', sub: 'Allt du undrat om Chris Whippit', vis: portrait },
  'setup': { title: 'Setup', sub: 'Datorn, kameran och prylarna jag använder', vis: portrait },
  'schema': { title: 'Schema', sub: 'När nästa video och stream kommer', vis: portrait },
  'dl': { title: 'Nedladdningar', sub: 'Minecraft-kartor från Let’s Play-säsongerna', vis: grid((content.downloads || []).slice(0, 4).map((d) => fileUrl(d.image))) },
  'shop': { title: 'Merch', sub: 'T-shirts, hoodies och kepsar', vis: grid((content.shop || []).slice(0, 4).map((d) => fileUrl(d.image))) },
  'spel': { title: 'Gratis webbspel', sub: 'Spela direkt i webbläsaren – inget att ladda ner', vis: grid(['genesis', 'peg-vault-board', 'break-shot-board', 'sky-burst-board'].map((n) => fileUrl('spel/thumbs/' + n + '.webp'))) },
  'samarbeten': { title: 'Samarbeten', sub: 'Varumärken jag har jobbat med', vis: portrait },
  'integritet': { title: 'Integritetspolicy', sub: 'Så hanteras data på chriswhippit.com', vis: portrait },
};

async function avatars() {
  const key = (fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/AIza[0-9A-Za-z_-]{35}/) || [])[0];
  const ids = (content.crew || []).map((m) => m.channelId).join(',');
  const r = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&id=' + ids + '&key=' + key, { headers: { Referer: SITE } })).json();
  const byId = Object.fromEntries((r.items || []).map((c) => [c.id, (c.snippet.thumbnails.high || c.snippet.thumbnails.medium).url]));
  return (content.crew || []).map((m) => byId[m.channelId]).filter(Boolean);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function html(c, av) {
  const v = c.vis;
  let vis = '';
  if (v.type === 'photo') vis = `<div class="ph" style="background-image:url('${v.src}')"></div>`;
  if (v.type === 'grid') vis = `<div class="grid">${v.srcs.map((s) => `<div style="background-image:url('${s}')"></div>`).join('')}</div>`;
  if (v.type === 'avatars') vis = `<div class="av">${av.map((s) => `<img src="${s}">`).join('')}</div>`;
  const big = c.title.length > 14 ? 72 : 104;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; font-weight: 100 900; src: url('${fileUrl('assets/bundle/3100e775e861.woff2')}') format('woff2'); }
@font-face { font-family: Mono; src: url('${fileUrl('assets/bundle/83c005d49d8a.woff2')}') format('woff2'); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; background: #141522; color: #fff; font-family: Inter, sans-serif; position: relative; }
.vis { position: absolute; right: 0; top: 0; width: 640px; height: 630px; }
.vis::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #141522 0%, rgba(20,21,34,.55) 22%, rgba(20,21,34,0) 50%); }
.ph { position: absolute; inset: 0; background-size: cover; background-position: center; }
.grid { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 6px; background: #141522; }
.grid div { background-size: cover; background-position: center; }
.av { position: absolute; inset: 0; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 20px; padding: 40px 30px 40px 130px; background: radial-gradient(circle at 60% 50%, #2a1f5c, #141522 70%); }
.av img { width: 132px; height: 132px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 4px #7a4af5; }
.txt { position: absolute; left: 72px; top: 0; bottom: 0; width: 640px; display: flex; flex-direction: column; justify-content: center; z-index: 2; }
.brand { position: absolute; left: 72px; top: 56px; display: flex; align-items: center; gap: 14px; font-weight: 800; font-size: 24px; letter-spacing: .02em; z-index: 2; }
.brand img { width: 40px; height: 40px; }
.k { font-family: Mono, monospace; letter-spacing: .14em; text-transform: uppercase; font-size: 22px; color: #b9a2ff; margin-bottom: 18px; }
h1 { font-weight: 600; font-size: ${big}px; line-height: .98; letter-spacing: -.04em; text-shadow: 0 4px 30px rgba(0,0,0,.5); }
p { margin-top: 22px; font-size: 28px; line-height: 1.35; color: #cfcae6; max-width: 560px; text-shadow: 0 2px 16px rgba(0,0,0,.6); }
.url { position: absolute; left: 72px; bottom: 52px; font-family: Mono, monospace; letter-spacing: .1em; font-size: 20px; color: #8f86b3; z-index: 2; }
.bar { position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: #7a4af5; z-index: 3; }
</style></head><body>
<div class="bar"></div>
<div class="vis">${vis}</div>
<div class="brand"><img src="${fileUrl('assets/logo-64.png')}">CHRISWHIPPIT</div>
<div class="txt"><div class="k">${esc(c.kicker || 'Chris Whippit')}</div><h1>${esc(c.title)}</h1><p>${esc(c.sub)}</p></div>
<div class="url">chriswhippit.com</div>
</body></html>`;
}

function toJpeg(png, jpg) {
  const ps = `Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile('${png}'); $e=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|?{$_.MimeType -eq 'image/jpeg'}; $p=New-Object System.Drawing.Imaging.EncoderParameters 1; $p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[long]86); $i.Save('${jpg}',$e,$p); $i.Dispose()`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', ps]);
}

(async () => {
  if (!EDGE) throw new Error('Hittar varken Edge eller Chrome');
  const only = process.argv[2];
  const av = await avatars();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-share-'));
  fs.mkdirSync(path.join(root, 'assets/share'), { recursive: true });
  for (const p of PAGES) {
    const c = CFG[p.key]; if (!c) continue;
    if (only && p.key !== only && p.key !== 'serie:' + only) continue;
    const slug = p.key.replace(':', '-');
    const h = path.join(tmp, slug + '.html'), png = path.join(tmp, slug + '.png'), jpg = path.join(root, 'assets/share', slug + '.jpg');
    fs.writeFileSync(h, html(c, av));
    execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=8000', '--allow-file-access-from-files', '--screenshot=' + png, 'file:///' + h.replace(/\\/g, '/')], { stdio: 'ignore' });
    toJpeg(png, jpg);

    // <head>: peka sidans delningsbild hit.
    const file = path.join(root, p.file);
    let t = fs.readFileSync(file, 'utf8');
    const url = SITE + 'assets/share/' + slug + '.jpg';
    t = t.replace(/(<meta property="og:image" content=")[^"]*(")/, '$1' + url + '$2')
      .replace(/(<meta name="twitter:image" content=")[^"]*(")/, '$1' + url + '$2')
      .replace(/(<meta property="og:image:alt" content=")[^"]*(")/, '$1' + esc(c.title) + ' – Chris Whippit$2')
      .replace(/("primaryImageOfPage": \{\s*"@type": "ImageObject",\s*"url": ")[^"]*(")/, '$1' + url + '$2');
    fs.writeFileSync(file, t);
    console.log(slug.padEnd(20), Math.round(fs.statSync(jpg).size / 1024) + ' KB');
  }
  fs.rmSync(tmp, { recursive: true, force: true });
})();
