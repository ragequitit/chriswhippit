# chriswhippit.com

Statisk sida, inga byggsteg. Repo: `ragequitit/chriswhippit`, publiceras med
GitHub Pages (main / root) på www.chriswhippit.com.

**SEO:** följ [SEO.md](SEO.md) (Google Search Console, rutin och regler för innehållet).

## DNS (one.com)

- `www` → CNAME `ragequitit.github.io`
- `@` (utan www) → A-poster `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153`

## Filer

- `index.html` — startsidan
- `setup/`, `schema/`, `faq/`, `nedladdningar/`, `shop/`, `spel/` — en mapp per sida, egen titel och beskrivning
- `admin/` — redigeringsgränssnittet, noindex
- `content.json` — allt redigerbart innehåll. Skrivs av admin via GitHubs API
- `media/` — bilder som lagts in via admin
- `support.js`, `styles.css`, `assets/` — delas av alla sidor
- `assets/bundle/` — typsnitt och bilder från Claude Design-exporten (hash-namn, delas av alla sidor)
- `assets/vendor/` — React 18.3.1
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `CNAME`

## Spel

- `spel/*.html` är fristående spel. Byt ut filen men behåll namnet, så behåller
  spelarna sina framsteg (localStorage).
- Efter att ett spel bytts ut: kör `node tools/games.js`. Den lägger tillbaka knappen
  "← Spel" (`spel/back.js`), favicons, beskrivning, canonical och delningsbild.
- `node tools/seo.js` uppdaterar sidtitlar för navigering, strukturerad data och interna
  länkar på alla sidor. Kör den efter att en sidas titel/beskrivning ändrats i `<head>`.
- Bilderna på spelsidan är `spel/thumbs/<namn>-board.webp` (300×375). `-board.jpg` (400×500) används som delningsbild.

## Utveckling

- Starta lokalt: `node tools/serve.js . 8080` och öppna http://localhost:8080
  (YouTube-API:t svarar 403 på localhost, sidan faller då tillbaka på sparade videor).
- Ny export från Claude Design? Lägg in den inpackade HTML-filen och kör
  `node tools/unbundle.js .` — den packar upp alla inpackade sidor till vanlig HTML
  och lägger delade filer i `assets/bundle/`.

## Efter uppladdning

- Google Search Console: lägg till egenskapen `https://www.chriswhippit.com`, verifiera
  med DNS-posten, och skicka in `https://www.chriswhippit.com/sitemap.xml`.
- YouTube-API-nyckeln måste tillåta `www.chriswhippit.com/*` i sin referrer-lista.
