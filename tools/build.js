// Bygger alla sidfiler från EN källa.
// Allt från <body> och nedåt (hela sajtens mall + kod) finns bara i src/sida.html.
// Varje sidfil har bara sin egen <head> (titel, beskrivning, delningsbild, strukturerad data).
//   node tools/build.js          skriv om alla sidor: egen <head> + src/sida.html
//   node tools/build.js --check  kontrollera att alla sidor stämmer med källan (ändrar inget)
// Ändra ALDRIG i en sidfils <body> direkt – ändra src/sida.html (eller kör tools/patch-pages.js) och bygg.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SRC = path.join(root, 'src', 'sida.html');
const PAGES = require('./pages');
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// Delar en sidfil i <head>-delen (allt före <body>) och resten.
function split(text, file) {
  const i = text.indexOf('<body>');
  if (i < 0) throw new Error((file || 'sida') + ': hittar inte <body>');
  return { head: text.slice(0, i), body: text.slice(i) };
}
const readBody = () => read(SRC);
const writeBody = (b) => fs.writeFileSync(SRC, b);
const pageFile = (p) => path.join(root, p.file);

// Skriver om alla sidor med sin egen head (ev. ändrad via headFn) och källans body.
function buildAll(headFn) {
  const body = readBody();
  for (const p of PAGES) {
    const f = pageFile(p);
    let { head } = split(read(f), p.file);
    if (headFn) head = headFn(head, p);
    fs.writeFileSync(f, head + body);
  }
}

// För verktyg som jobbar på hela sidfiler (seo.js, perf.js): kör buildAll() först, låt verktyget
// ändra sidorna, och kör sedan pullBody() som sparar den ändrade mallen tillbaka i src/sida.html.
// Kastar om sidorna inte längre är identiska efter <body>.
function pullBody() {
  const bodies = PAGES.map((p) => split(read(pageFile(p)), p.file).body);
  const bad = PAGES.filter((p, i) => bodies[i] !== bodies[0]).map((p) => p.file);
  if (bad.length) throw new Error('Sidorna skiljer sig efter <body> (' + bad.join(', ') + ') – src/sida.html uppdaterades inte');
  writeBody(bodies[0]);
}

module.exports = { split, readBody, writeBody, buildAll, pullBody, PAGES, pageFile, read, SRC };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const body = readBody();
    const bad = PAGES.filter((p) => split(read(pageFile(p)), p.file).body !== body).map((p) => p.file);
    if (bad.length) { console.error('Stämmer inte med src/sida.html:', bad.join(', ')); process.exit(1); }
    console.log('alla', PAGES.length, 'sidor stämmer med src/sida.html');
  } else {
    buildAll();
    console.log('byggde', PAGES.length, 'sidor från src/sida.html');
  }
}
