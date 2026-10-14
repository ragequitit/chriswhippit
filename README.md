# chriswhippit.com

Statisk sida, inga byggsteg. Repo: `ragequitit/chriswhippit`, publiceras med
GitHub Pages (main / root) på www.chriswhippit.com.

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
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `CNAME`

## Efter uppladdning

- Google Search Console: lägg till egenskapen `https://www.chriswhippit.com`, verifiera
  med DNS-posten, och skicka in `https://www.chriswhippit.com/sitemap.xml`.
- YouTube-API-nyckeln måste tillåta `www.chriswhippit.com/*` i sin referrer-lista.
