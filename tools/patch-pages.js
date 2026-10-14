// Gör samma textersättning i alla sidor (varje sida bär hela sajten, så ändringar måste in överallt).
// Användning: node tools/patch-pages.js <patch.json>
// patch.json: [{ "find": "...", "replace": "..." }, ...]  — varje "find" måste finnas exakt en gång per sida.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const PAGES = ['index.html', 'setup/index.html', 'schema/index.html', 'faq/index.html', 'nedladdningar/index.html', 'shop/index.html', 'spel/index.html', 'samarbeten/index.html'];
const patches = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const updated = {};
for (const p of PAGES) {
  let t = fs.readFileSync(path.join(root, p), 'utf8');
  for (const { find, replace } of patches) {
    const n = t.split(find).length - 1;
    if (n !== 1) throw new Error(p + ': hittade ' + n + ' st av ' + JSON.stringify(find.slice(0, 80)));
    t = t.replace(find, () => replace);
  }
  updated[p] = t;
}
for (const [p, t] of Object.entries(updated)) fs.writeFileSync(path.join(root, p), t);
console.log('uppdaterade', PAGES.length, 'sidor med', patches.length, 'ändringar');
