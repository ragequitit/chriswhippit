// Textersättningar i sajten. Användning: node tools/patch-pages.js <patch.json>
// patch.json: [{ "find": "...", "replace": "..." }, ...]
// Varje "find" måste finnas exakt en gång i src/sida.html (mallen + koden) – eller, om den inte
// finns där, exakt en gång i varje sidas <head>. Sedan byggs alla sidor om (tools/build.js).
const fs = require('fs');
const { split, readBody, writeBody, read, pageFile, PAGES } = require('./build');
const patches = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

let body = readBody();
const heads = PAGES.map((p) => split(read(pageFile(p)), p.file).head);
const count = (s, f) => s.split(f).length - 1;
let inBody = 0, inHead = 0;
for (const { find, replace } of patches) {
  const n = count(body, find);
  if (n === 1) { body = body.replace(find, () => replace); inBody++; continue; }
  if (n > 1) throw new Error('src/sida.html: hittade ' + n + ' st av ' + JSON.stringify(find.slice(0, 80)));
  heads.forEach((h, i) => {
    const m = count(h, find);
    if (m !== 1) throw new Error(PAGES[i].file + ' <head>: hittade ' + m + ' st av ' + JSON.stringify(find.slice(0, 80)));
    heads[i] = h.replace(find, () => replace);
  });
  inHead++;
}
writeBody(body);
PAGES.forEach((p, i) => fs.writeFileSync(pageFile(p), heads[i] + body));
console.log('uppdaterade', PAGES.length, 'sidor:', inBody, 'ändringar i mallen,', inHead, 'i <head>');
