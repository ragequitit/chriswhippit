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
  // Bara ett svar som ser ut som en sändningstid räknas – felsidor och "Too Many Requests" ger aldrig falsk LIVE.
  const r = await fetch('https://decapi.me/twitch/uptime/' + TWITCH);
  // Kastar = "vet inte" (felsvar), null = bekräftat offline.
  if (!r.ok) throw new Error('decapi svarade ' + r.status);
  const up = (await r.text()).trim();
  if (/offline/i.test(up)) return null;
  if (!/^\d+\s*(day|hour|minute|second)s?\b/i.test(up)) throw new Error('oväntat svar från decapi');
  const tr = await fetch('https://decapi.me/twitch/title/' + TWITCH);
  const title = tr.ok ? (await tr.text()).trim().slice(0, 140) : '';
  return { live: true, platform: 'twitch', url: 'https://www.twitch.tv/' + TWITCH, title };
}

async function youtube(id) {
  // /live-sidan pekar på pågående (eller planerad) sändning; videoDetails har "isLive":true bara när den är igång.
  const r = await fetch('https://www.youtube.com/channel/' + id + '/live', { headers: UA });
  if (!r.ok) throw new Error('YouTube svarade ' + r.status);
  const html = await r.text();
  if (!/"isLive":true/.test(html) || /"isUpcoming":true/.test(html)) return null;
  // Kräv att sidan pekar på en riktig video, annars är det inte en pågående sändning.
  const v = (html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) || [])[1];
  if (!v) return null;
  const title = ((html.match(/<meta name="title" content="([^"]*)"/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").slice(0, 140);
  return { live: true, platform: 'youtube', url: 'https://www.youtube.com/watch?v=' + v, title };
}

(async () => {
  let now = { live: false }, unsure = false;
  for (const check of [twitch, ...YOUTUBE.map((id) => () => youtube(id))]) {
    try { const r = await check(); if (r) { now = r; break; } } catch (e) { unsure = true; console.error('kunde inte kolla:', e.message); }
  }
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;
  // Kunde någon kontroll inte svara och ingen sa LIVE: rör inte bannern (annars blinkar den av mitt i en stream).
  if (!now.live && unsure && old && old.live) return console.log('osäkert – behåller LIVE');
  const same = old && old.live === now.live && old.url === now.url && old.title === now.title;
  if (same) return console.log('oförändrat:', now.live ? 'LIVE' : 'offline');
  fs.writeFileSync(FILE, JSON.stringify(now, null, 2) + '\n');
  console.log('uppdaterat:', JSON.stringify(now));
})();
