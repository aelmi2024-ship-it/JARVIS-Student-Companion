const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const publicDir = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
const styles = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');

test('index IDs are unique and all app selectors resolve', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML contains duplicate IDs');
  const idSet = new Set(ids);
  const selectors = [...app.matchAll(/\$\('#([^']+)'\)/g)].map((match) => match[1]);
  const missing = [...new Set(selectors)].filter((id) => !idSet.has(id));
  assert.deepEqual(missing, [], `Missing DOM IDs: ${missing.join(', ')}`);
});

test('the static page is compatible with the strict CSP', () => {
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, 'Inline script found');
  assert.doesNotMatch(html, /\sstyle="/i, 'Inline style found');
  assert.match(html, /<script src="app\.js" defer><\/script>/);
});

test('stylesheets have balanced blocks', () => {
  const openings = (styles.match(/{/g) || []).length;
  const closings = (styles.match(/}/g) || []).length;
  assert.equal(openings, closings);
});
