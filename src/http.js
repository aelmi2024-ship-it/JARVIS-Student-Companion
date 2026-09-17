const fs = require('node:fs');
const path = require('node:path');

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

function applySecurityHeaders(response) {
  response.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'"
  ].join('; '));
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

function sendEmpty(response, statusCode, extraHeaders = {}) {
  response.writeHead(statusCode, { 'Cache-Control': 'no-store', ...extraHeaders });
  response.end();
}

function readJson(request, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxBytes) {
        const error = new Error('Request body is too large.');
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        const error = new Error('Request body must be valid JSON.');
        error.statusCode = 400;
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function serveStatic(response, publicDir, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(requestedPath);
  } catch {
    return false;
  }

  const filePath = path.resolve(publicDir, `.${decodedPath}`);
  const relativePath = path.relative(publicDir, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return false;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;

  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES.get(extension) || 'application/octet-stream';
  const cacheControl = extension === '.html' || extension === '.json'
    ? 'no-cache'
    : 'public, max-age=3600';

  response.writeHead(200, {
    'Cache-Control': cacheControl,
    'Content-Length': fs.statSync(filePath).size,
    'Content-Type': contentType
  });
  fs.createReadStream(filePath).pipe(response);
  return true;
}

module.exports = { applySecurityHeaders, readJson, sendEmpty, sendJson, serveStatic };
