const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { loadConfig } = require('../src/config');
const { createJarvisServer } = require('../server');

const rootDir = path.join(__dirname, '..');

async function startServer(t) {
  const config = {
    ...loadConfig(rootDir),
    aiProvider: 'demo',
    anthropicApiKey: '',
    aiModel: '',
    canvasClientId: '',
    canvasClientSecret: ''
  };
  const server = createJarvisServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

test('serves health, runtime, and the app with security headers', async (t) => {
  const baseUrl = await startServer(t);
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', service: 'jarvis-student-companion' });

  const runtime = await fetch(`${baseUrl}/api/runtime`);
  assert.equal(runtime.status, 200);
  assert.equal((await runtime.json()).canvas.configured, false);

  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await page.text(), /JARVIS · Student Companion/);
});

test('returns grounded demo chat responses and validates input', async (t) => {
  const baseUrl = await startServer(t);
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What should I work on first?' })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.mode, 'demo');
  assert.match(payload.reply, /Start with CS 310/);

  const invalid = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' })
  });
  assert.equal(invalid.status, 400);
});

test('does not expose files outside the public directory', async (t) => {
  const baseUrl = await startServer(t);
  const missing = await fetch(`${baseUrl}/server.js`);
  assert.equal(missing.status, 404);
  const payload = await missing.json();
  assert.equal(payload.error, 'Not found.');
});
