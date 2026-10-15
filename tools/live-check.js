// Kollar om Chris sänder live på Twitch eller YouTube och skriver live.json (läses av LIVE NU-bannern).
//   node tools/live-check.js
// Körs av .github/workflows/live.yml var tionde minut. Ingen API-nyckel behövs.
// Skriver bara om filen när läget ändras, så det blir inga onödiga commits.
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'live.json');
const TWITCH = 'chriswhippit';
const YOUTUBE = ['UCm4nLrtw4bSYFNUsvHMaP1Q']; // @chriswhippit (lägg till fler kanal-id:n vid behov)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36', 'Accept-Language': 'sv-SE,sv;q=0.9' };

async function twitch() {
  // decapi.me svarar med "chriswhippit is offline" eller hur länge sändningen pågått.
  const up = (await (await fetch('https://decapi.me/twitch/uptime/' + TWITCH)).text()).trim();
  if (!up || /offline|error|not found/i.test(up)) return null;
  const title = (await (await fetch('https://decapi.me/twitch/title/' + TWITCH)).text()).trim();
  return { live: true, platform: 'twitch', url: 'https://www.twitch.tv/' + TWITCH, title };
}

async function youtube(id) {
  // /live-sidan pekar på pågående (eller planerad) sändning; videoDetails har "isLive":true bara när den är igång.
  const html = await (await fetch('https://www.youtube.com/channel/' + id + '/live', { headers: UA })).text();
  if (!/"isLive":true/.test(html) || /"isUpcoming":true/.test(html)) return null;
  const v = (html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) || [])[1];
  const title = ((html.match(/<meta name="title" content="([^"]*)"/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return { live: true, platform: 'youtube', url: v ? 'https://www.youtube.com/watch?v=' + v : 'https://www.youtube.com/channel/' + id + '/live', title };
}

(async () => {
  let now = { live: false };
  for (const check of [twitch, ...YOUTUBE.map((id) => () => youtube(id))]) {
    try { const r = await check(); if (r) { now = r; break; } } catch (e) { console.error('kunde inte kolla:', e.message); }
  }
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;
  const same = old && old.live === now.live && old.url === now.url && old.title === now.title;
  if (same) return console.log('oförändrat:', now.live ? 'LIVE' : 'offline');
  fs.writeFileSync(FILE, JSON.stringify(now, null, 2) + '\n');
  console.log('uppdaterat:', JSON.stringify(now));
})();
