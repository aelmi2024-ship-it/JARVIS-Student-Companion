const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBaseUrl } = require('../src/config');
const { parseNextLink } = require('../src/canvas');
const { stripHtml } = require('../src/ai');

test('normalizes Canvas URLs to an origin', () => {
  assert.equal(normalizeBaseUrl('https://canvas.example.edu/courses/1'), 'https://canvas.example.edu');
  assert.equal(normalizeBaseUrl('not-a-url'), 'https://canvas.example.edu');
});

test('extracts Canvas pagination links', () => {
  const header = '<https://canvas.example.edu/api/v1/courses?page=1>; rel="current", <https://canvas.example.edu/api/v1/courses?page=2>; rel="next"';
  assert.equal(parseNextLink(header), 'https://canvas.example.edu/api/v1/courses?page=2');
  assert.equal(parseNextLink(null), null);
});

test('removes markup from AI context', () => {
  assert.equal(stripHtml('<p>Hello <strong>student</strong>&nbsp;&amp; welcome</p>'), 'Hello student & welcome');
  assert.equal(stripHtml('<script>alert(1)</script><p>Safe</p>'), 'Safe');
});
