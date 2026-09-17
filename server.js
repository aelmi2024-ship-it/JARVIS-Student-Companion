const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');

const { createAssistantReply } = require('./src/ai');
const {
  createCanvasAuthUrl,
  exchangeCanvasCode,
  fetchCanvasAssignments,
  isCanvasConfigured
} = require('./src/canvas');
const { loadConfig } = require('./src/config');
const { applySecurityHeaders, readJson, sendEmpty, sendJson, serveStatic } = require('./src/http');

const SESSION_COOKIE = 'jarvis_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function readDemoData(config) {
  const filePath = `${config.publicDir}/data/demo-data.json`;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return ['', ''];
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }).filter(([key]) => key));
}

function sessionCookie(id, config, maxAge = SESSION_TTL_MS / 1000) {
  const secure = config.environment === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function createSessionManager(config, now = () => Date.now()) {
  const sessions = new Map();

  function cleanup() {
    const cutoff = now() - SESSION_TTL_MS;
    for (const [id, session] of sessions) {
      if (session.lastSeen < cutoff) sessions.delete(id);
    }
  }

  function get(request, response) {
    cleanup();
    const id = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    if (id && sessions.has(id)) {
      const session = sessions.get(id);
      session.lastSeen = now();
      return session;
    }

    const newId = crypto.randomBytes(24).toString('hex');
    const session = { id: newId, lastSeen: now(), chatRequests: [] };
    sessions.set(newId, session);
    response.setHeader('Set-Cookie', sessionCookie(newId, config));
    return session;
  }

  function clear(session, response) {
    sessions.delete(session.id);
    response.setHeader('Set-Cookie', sessionCookie('', config, 0));
  }

  return { clear, get, size: () => sessions.size };
}

function checkChatRateLimit(session, now = Date.now()) {
  const windowStart = now - 60_000;
  session.chatRequests = session.chatRequests.filter((timestamp) => timestamp > windowStart);
  if (session.chatRequests.length >= 30) return false;
  session.chatRequests.push(now);
  return true;
}

function createRequestHandler(config, options = {}) {
  const demoData = options.demoData || readDemoData(config);
  const sessionManager = options.sessionManager || createSessionManager(config);

  return async function handleRequest(request, response) {
    applySecurityHeaders(response);
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (request.method === 'GET' && pathname === '/api/health') {
      return sendJson(response, 200, { status: 'ok', service: 'jarvis-student-companion' });
    }

    if (request.method === 'GET' && pathname === '/api/runtime') {
      const session = sessionManager.get(request, response);
      return sendJson(response, 200, {
        mode: 'demo',
        ai: config.aiProvider,
        canvas: {
          configured: isCanvasConfigured(config),
          connected: Boolean(session.canvasAccessToken),
          host: new URL(config.canvasBaseUrl).hostname
        }
      });
    }

    if (request.method === 'POST' && pathname === '/api/chat') {
      const session = sessionManager.get(request, response);
      if (!checkChatRateLimit(session)) {
        return sendJson(response, 429, { error: 'Too many requests. Please wait a minute and try again.' });
      }

      const body = await readJson(request);
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) return sendJson(response, 400, { error: 'A message is required.' });
      if (message.length > 2000) return sendJson(response, 400, { error: 'Message must be 2,000 characters or fewer.' });

      const suppliedAssignments = Array.isArray(body.assignments) ? body.assignments : [];
      const assignments = session.canvasAssignments || suppliedAssignments || demoData.assignments;
      const reply = await createAssistantReply(config, message, assignments, demoData);
      return sendJson(response, 200, { reply, mode: config.aiProvider });
    }

    if (request.method === 'GET' && pathname === '/auth/canvas') {
      const session = sessionManager.get(request, response);
      if (!isCanvasConfigured(config)) {
        return sendJson(response, 503, { error: 'Canvas OAuth is not configured. Demo mode is still available.' });
      }

      session.canvasState = crypto.randomBytes(24).toString('hex');
      return response.writeHead(302, { Location: createCanvasAuthUrl(config, session.canvasState) }).end();
    }

    if (request.method === 'GET' && pathname === '/auth/canvas/callback') {
      const session = sessionManager.get(request, response);
      if (!isCanvasConfigured(config)) {
        return sendJson(response, 503, { error: 'Canvas OAuth is not configured.' });
      }

      const code = requestUrl.searchParams.get('code');
      const state = requestUrl.searchParams.get('state');
      if (!code || !state || state !== session.canvasState) {
        return sendJson(response, 400, { error: 'Canvas authorization state is invalid or expired.' });
      }

      const token = await exchangeCanvasCode(config, code);
      session.canvasAccessToken = token.access_token;
      session.canvasUser = token.user || null;
      delete session.canvasState;
      return response.writeHead(302, { Location: '/?canvas=connected' }).end();
    }

    if (request.method === 'GET' && pathname === '/api/canvas/assignments') {
      const session = sessionManager.get(request, response);
      if (!session.canvasAccessToken) {
        return sendJson(response, 401, { error: 'Canvas is not connected.' });
      }

      session.canvasAssignments = await fetchCanvasAssignments(config, session.canvasAccessToken);
      return sendJson(response, 200, { assignments: session.canvasAssignments });
    }

    if (request.method === 'POST' && pathname === '/api/canvas/logout') {
      const session = sessionManager.get(request, response);
      sessionManager.clear(session, response);
      return sendEmpty(response, 204);
    }

    if (request.method === 'GET' && serveStatic(response, config.publicDir, pathname)) return;
    return sendJson(response, 404, { error: 'Not found.' });
  };
}

function createJarvisServer(config = loadConfig(__dirname), options = {}) {
  const handler = createRequestHandler(config, options);
  return http.createServer((request, response) => {
    handler(request, response).catch((error) => {
      if (response.headersSent) return response.end();
      const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
      if (statusCode >= 500) console.error('[JARVIS]', error.message);
      sendJson(response, statusCode, {
        error: statusCode >= 500 ? 'The server could not complete that request.' : error.message
      });
    });
  });
}

if (require.main === module) {
  const config = loadConfig(__dirname);
  const server = createJarvisServer(config);

  server.listen(config.port, config.host, () => {
    console.log(`JARVIS is running at http://localhost:${config.port}`);
    console.log(`Mode: ${config.aiProvider}; Canvas OAuth: ${isCanvasConfigured(config) ? 'configured' : 'demo only'}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}

module.exports = { checkChatRateLimit, createJarvisServer, createRequestHandler, createSessionManager, parseCookies };
