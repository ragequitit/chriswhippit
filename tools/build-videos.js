// Bygger videos.json: allt sajten annars hämtar från YouTube-API:t i varje besökares webbläsare
// (senaste videorna, antal videor per kanal, spellistornas antal, seriernas senaste videor,
// gänget-kortens profilbilder/prenumeranter och titlar). Besökarna läser bara filen → 0 API-anrop.
//   node tools/build-videos.js
// Körs av .github/workflows/videos.yml var 30:e minut (~16 API-enheter per körning).
// Skriver bara om något faktiskt ändrats, så det blir inga onödiga commits.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FILE = path.join(root, 'videos.json');
const KEY = (fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/AIza[0-9A-Za-z_-]{35}/) || [])[0];
const content = JSON.parse(fs.readFileSync(path.join(root, 'content.json'), 'utf8'));
const HANDLES = ['@chriswhippit', '@whippitsson', '@whippitextra'];
const COUNT_HANDLES = ['chriswhippit', 'whippitsson', 'figgwhipp', 'whippitextra'];

// Nyckeln är begränsad till sajtens adress, så anropen skickar sajten som Referer.
const yt = async (p) => {
  const r = await fetch('https://www.googleapis.com/youtube/v3/' + p + '&key=' + KEY, { headers: { Referer: 'https://www.chriswhippit.com/' } });
  const j = await r.json();
  if (j.error) throw new Error('YouTube: ' + (j.error.message || r.status));
  return j;
};
const secsOf = (d) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };

async function latest() {
  const all = [];
  for (const handle of HANDLES) {
    const ch = await yt('channels?part=contentDetails,snippet&forHandle=' + encodeURIComponent(handle));
    const item = ch.items && ch.items[0]; if (!item) continue;
    const pl = await yt('playlistItems?part=snippet&maxResults=10&playlistId=' + item.contentDetails.relatedPlaylists.uploads);
    (pl.items || []).forEach((v) => all.push({ id: v.snippet.resourceId.videoId, title: v.snippet.title, channel: item.snippet.title, handle, at: v.snippet.publishedAt }));
  }
  all.sort((a, b) => (a.at < b.at ? 1 : -1));
  const secs = {};
  for (let i = 0; i < all.length; i += 50) {
    const det = await yt('videos?part=contentDetails&id=' + all.slice(i, i + 50).map((v) => v.id).join(','));
    (det.items || []).forEach((it) => { secs[it.id] = secsOf(it.contentDetails.duration); });
  }
  // Samma urval som sajten gör själv: inga Shorts (≤ 3 min), störst först, sedan en från varje kanal.
  const long = all.filter((v) => (secs[v.id] || 999) > 180);
  const list = long.length >= 5 ? long : all;
  const used = {};
  const take = (pred) => { const v = list.find((x) => !used[x.id] && (!pred || pred(x))); if (v) used[v.id] = 1; return v || null; };
  const hero = take(null);
  const locked = HANDLES.map((h) => take((v) => v.handle === h));
  return [hero, take(null)].concat(locked).filter(Boolean);
}

async function counts() {
  const out = {}, subs = {};
  for (const hd of COUNT_HANDLES) {
    const r = await yt('channels?part=statistics&forHandle=' + encodeURIComponent('@' + hd));
    const st = r.items && r.items[0] && r.items[0].statistics;
    if (st && st.videoCount) out[hd] = +st.videoCount;
    // Prenumeranter (för följarsiffran och milstolpsräknaren), avrundat till hundratal.
    if (st && st.subscriberCount) subs[hd] = Math.round(+st.subscriberCount / 100) * 100;
  }
  return { out, subs };
}

// Var hittar vi de senaste videorna i varje serie? Spellistor kan vara sorterade äldst först, och nya
// videor hamnar inte alltid i spellistan direkt – därför slås hela första spellistan ihop med de
// senaste uppladdningarna från kanalerna, filtrerat på spelets namn i titeln.
const SERIES_MATCH = {
  minecraft: { handles: ['@chriswhippit', '@whippitextra'], re: /minecraft/i },
  'gta-5': { handles: ['@chriswhippit'], re: /\bgta\b|gta ?5|gta ?v\b/i },
  fortnite: { handles: ['@chriswhippit'], re: /fortnite/i },
  vloggar: { handles: ['@whippitsson'], re: null },
};

async function playlistAll(pid, maxPages = 30) {
  const out = []; let page = '';
  for (let i = 0; i < maxPages; i++) {
    const j = await yt('playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=' + pid + (page ? '&pageToken=' + page : ''));
    (j.items || []).forEach((it) => { if (it.contentDetails.videoPublishedAt) out.push({ id: it.contentDetails.videoId, title: it.snippet.title, at: it.contentDetails.videoPublishedAt, list: pid }); });
    page = j.nextPageToken; if (!page) break;
  }
  return out;
}

async function recentUploads(handle) {
  const ch = await yt('channels?part=contentDetails&forHandle=' + encodeURIComponent(handle));
  const up = ch.items && ch.items[0] && ch.items[0].contentDetails.relatedPlaylists.uploads; if (!up) return [];
  const j = await yt('playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=' + up);
  return (j.items || []).map((it) => ({ id: it.contentDetails.videoId, title: it.snippet.title, at: it.contentDetails.videoPublishedAt || it.snippet.publishedAt, list: '' }));
}

async function seriesData() {
  const series = content.series || [];
  const plIds = [...series.flatMap((s) => (s.playlists || []).map((p) => p.id)), ...(content.morePlaylists || []).map((p) => p.id)].slice(0, 50);
  const plCounts = {};
  if (plIds.length) (await yt('playlists?part=contentDetails&maxResults=50&id=' + plIds.join(','))).items.forEach((p) => { plCounts[p.id] = p.contentDetails.itemCount; });
  const uploads = {};
  for (const h of [...new Set(Object.values(SERIES_MATCH).flatMap((m) => m.handles))]) uploads[h] = await recentUploads(h);
  // Shorts (≤ 3 min) ska inte räknas som avsnitt i serien.
  const upIds = [...new Set(Object.values(uploads).flat().map((v) => v.id))];
  const secs = {};
  for (let i = 0; i < upIds.length; i += 50) (await yt('videos?part=contentDetails&id=' + upIds.slice(i, i + 50).join(','))).items.forEach((it) => { secs[it.id] = secsOf(it.contentDetails.duration); });
  const covers = {}, seriesVids = {};
  for (const s of series) {
    const pid = s.playlists && s.playlists[0] && s.playlists[0].id; if (!pid) continue;
    const fromList = await playlistAll(pid);
    const m = SERIES_MATCH[s.slug] || { handles: [], re: /$^/ };
    const fromUploads = m.handles.flatMap((h) => uploads[h] || []).filter((v) => (!m.re || m.re.test(v.title)) && (secs[v.id] || 999) > 180);
    const seen = new Set();
    seriesVids[s.slug] = [...fromList, ...fromUploads].sort((x, y) => (x.at < y.at ? 1 : -1))
      .filter((v) => (seen.has(v.id) ? false : seen.add(v.id))).slice(0, 12);
    if (!s.cover && fromList[0]) covers[s.slug] = fromList[0].id;
  }
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return { plCounts: sorted(plCounts), covers, seriesVids };
}

// Samarbetssidans siffror (visningar, gillamarkeringar, datum) för videorna i content.json → sponsors.
async function collabData() {
  const ids = [...new Set((content.sponsors || []).map((sp) => (/(?:[?&]v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/.exec(sp.url || '') || [])[1]).filter(Boolean))];
  const out = {};
  for (let i = 0; i < ids.length; i += 50) (await yt('videos?part=snippet,statistics&id=' + ids.slice(i, i + 50).join(','))).items.forEach((v) => {
    // Avrundat så att filen inte ändras vid varje ny visning.
    const r = (n) => (n >= 10000 ? Math.round(n / 1000) * 1000 : n >= 100 ? Math.round(n / 100) * 100 : n);
    out[v.id] = { title: v.snippet.title, at: v.snippet.publishedAt, channel: v.snippet.channelTitle, views: r(+v.statistics.viewCount || 0), likes: r(+v.statistics.likeCount || 0) };
  });
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
}

async function crewData() {
  const crew = content.crew || [];
  const ids = crew.flatMap((m) => [m.channelId, ...(m.also || []).map((a) => a.channelId)]);
  const crewInfo = {}, crewVids = {};
  if (ids.length) (await yt('channels?part=snippet,statistics&id=' + ids.join(','))).items.forEach((ch) => {
    // Prenumeranter avrundas till tusental (visas som "230K") så filen inte ändras vid varje ny prenumerant.
    const subs = +ch.statistics.subscriberCount || 0;
    crewInfo[ch.id] = { avatar: ch.snippet.thumbnails && (ch.snippet.thumbnails.medium || ch.snippet.thumbnails.default).url, subs: subs >= 1000 ? Math.round(subs / 1000) * 1000 : subs, title: ch.snippet.title };
  });
  const vids = crew.flatMap((m) => m.videos || []);
  if (vids.length) (await yt('videos?part=snippet&id=' + vids.join(','))).items.forEach((v) => { crewVids[v.id] = { title: v.snippet.title, at: v.snippet.publishedAt }; });
  // Samma ordning varje gång (API:t svarar i olika ordning), annars ser filen ändrad ut fast den inte är det.
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return { crewInfo: sorted(crewInfo), crewVids: sorted(crewVids) };
}

(async () => {
  if (!KEY) throw new Error('Hittar ingen YouTube-nyckel i index.html');
  const cs = await counts();
  const data = { videos: await latest(), counts: cs.out, subs: cs.subs, ...(await seriesData()), ...(await crewData()), collab: await collabData() };
  if (data.videos.length < 3) throw new Error('För få videor från YouTube – skriver inte över videos.json');
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;
  // Försvinner en kanal ur svaret (tillfälligt fel hos YouTube) – skriv inte över med mindre data.
  for (const k of ['counts', 'subs', 'seriesVids', 'crewInfo']) {
    const was = old && old[k] ? Object.keys(old[k]).length : 0, now = data[k] ? Object.keys(data[k]).length : 0;
    if (now < was) throw new Error(k + ' krympte från ' + was + ' till ' + now + ' – skriver inte över videos.json');
  }
  // Oförändrat: skriv inte om – utom en gång per dygn, så att tidsstämpeln aldrig blir för gammal
  // (sajten litar på filen i 3 dygn och hämtar sedan från YouTube själv).
  if (old) { const { t, ...rest } = old; if (JSON.stringify(rest) === JSON.stringify(data) && Date.now() - Date.parse(t) < 86400000) return console.log('oförändrat'); }
  fs.writeFileSync(FILE, JSON.stringify({ t: new Date().toISOString(), ...data }, null, 1) + '\n');
  console.log('uppdaterat:', data.videos.length, 'videor,', Object.keys(data.seriesVids).length, 'serier,', Object.keys(data.crewInfo).length, 'kanaler');
})().catch((e) => { console.error(e.message); process.exit(1); });
