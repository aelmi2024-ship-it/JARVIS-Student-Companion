const fs = require('node:fs');
const path = require('node:path');

function loadEnvFile(filePath = path.join(process.cwd(), '.env')) {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function normalizeBaseUrl(value) {
  const fallback = 'https://canvas.example.edu';
  try {
    const url = new URL(value || fallback);
    if (!['https:', 'http:'].includes(url.protocol)) return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

function loadConfig(rootDir = process.cwd()) {
  loadEnvFile(path.join(rootDir, '.env'));

  const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536 ? parsedPort : 3000;
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const canvasBaseUrl = normalizeBaseUrl(process.env.CANVAS_BASE_URL);
  const canvasRedirectUri = process.env.CANVAS_REDIRECT_URI || `http://localhost:${port}/auth/canvas/callback`;
  const aiProvider = process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'demo';

  return Object.freeze({
    rootDir,
    publicDir: path.join(rootDir, 'public'),
    port,
    host: process.env.HOST || '0.0.0.0',
    environment,
    canvasBaseUrl,
    canvasClientId: process.env.CANVAS_CLIENT_ID || '',
    canvasClientSecret: process.env.CANVAS_CLIENT_SECRET || '',
    canvasRedirectUri,
    aiProvider,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    aiModel: process.env.AI_MODEL || ''
  });
}

module.exports = { loadConfig, loadEnvFile, normalizeBaseUrl };
