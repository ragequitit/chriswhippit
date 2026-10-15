# SEO-rutin för chriswhippit.com

Den här lappen ska inte glömmas. Den följs av den schemalagda uppgiften "SEO-koll chriswhippit.com"
(i Claude-appen, varannan vecka) och av alla som jobbar med sajten.

## Var finns vad

- **Google Search Console** finns på ChrisWhippit-kontot (whippitgaming@gmail.com), egendomen
  `https://www.chriswhippit.com/` (webbadressprefix).
  - I Chrome är det konto nummer två: https://search.google.com/u/1/search-console?resource_id=https%3A%2F%2Fwww.chriswhippit.com%2F
  - Konto nummer ett (figgwhipp) har ingen egendom. Det kontot ska inte användas här.
- **Verifieringen** görs med `<meta name="google-site-verification" ...>` i `<head>` på alla sidor.
  **Taggen får inte tas bort.**
- **Sitemap:** `sitemap.xml` (är inskickad). Uppdatera den när en ny sida tillkommer.

## Rutinen

1. **Resultat**, de senaste 28 dagarna: vilka sökningar ger visningar och klick, och vilken genomsnittlig position har de?
2. **Hitta tre sorters möjligheter:**
   - Sökningar med många visningar men få klick: skriv om sidans titel eller beskrivning.
   - Sökningar på position 5–20: förstärk sidan med mer text om ämnet och interna länkar till den.
   - Sökningar som saknar svar på sajten: ny FAQ-fråga, en mening på en befintlig sida eller en ny undersida.
3. **Sidor:** finns det sidor som inte är indexerade eller har fel? Fixa dem.
4. **Nya eller ändrade sidor:** begär indexering via "Granska webbadress" → "Begär indexering".
5. **Skriv en kort rapport** till Chris i chatten:
   - de 10 största sökningarna
   - vad som har ändrats
   - vad som behöver hans svar

## Regler för innehållet

- Chris företag nämns **aldrig**.
- Inga nya personliga uppgifter utan att Chris har godkänt dem. Det som redan är godkänt:
  - född 1984
  - från Strömstad
  - gift, tre barn, två bröder
  - riktiga förnamnet Joakim
- Text om gänget och figgehn (1984–2024) skrivs varsamt. Fråga Chris innan något ändras där.
- Ingen keyword-stuffing. Texten ska låta som Chris.
- Ändringar görs i alla sidmallar med `tools/patch-pages.js`, och därefter körs `node tools/seo.js`.
  Testa lokalt med `node tools/serve.js` innan push. Chris har godkänt att ändringar pushas direkt till `main`.

## Påminn Chris om

- Länka chriswhippit.com från alla kanaler: kanalbeskrivning, bannerlänkar och videobeskrivningar.
  Fråga om det är gjort.

## Logg

- 2026-10-15: Search Console uppsatt och sitemap inskickad (21 sidor). Indexering begärd för
  /videor/, /ganget/ och /om/.
