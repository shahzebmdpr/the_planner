/**
 * PeerTrack — Optional Local / Cloud Node.js Server
 * Zero-dependency HTTP server with Upstash Redis proxy and static asset serving.
 * 
 * Usage:
 *   node server.js
 * 
 * Environment Variables (optional, for backend proxy):
 *   PORT=8080
 *   UPSTASH_REDIS_REST_URL=https://...upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=A...
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Basic .env parser if .env file exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/(^['"]|['"]$)/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const PORT = process.env.PORT || 8080;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers for API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // API Route: Check Server Upstash Status
  if (url.pathname === '/api/upstash/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      serverConfigured: !!(UPSTASH_URL && UPSTASH_TOKEN),
      upstashUrl: UPSTASH_URL ? UPSTASH_URL.replace(/(https?:\/\/)(.*)/, '$1***') : null
    }));
    return;
  }

  // API Route: Upstash Server Proxy (GET)
  if (url.pathname === '/api/upstash/get' && req.method === 'GET') {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'UPSTASH_REDIS_REST_URL or TOKEN not configured on server' }));
      return;
    }

    const roomId = url.searchParams.get('room') || 'study-duo-room-1';
    try {
      const response = await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', `peertrack:${roomId}`])
      });
      const data = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API Route: Upstash Server Proxy (SET)
  if (url.pathname === '/api/upstash/set' && req.method === 'POST') {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'UPSTASH_REDIS_REST_URL or TOKEN not configured on server' }));
      return;
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr);
        const roomId = body.roomId || 'study-duo-room-1';
        const payload = JSON.stringify(body.payload);

        const response = await fetch(UPSTASH_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${UPSTASH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['SET', `peertrack:${roomId}`, payload])
        });
        const data = await response.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n⚡ PeerTrack Server running at http://localhost:${PORT}`);
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    console.log(`☁️  Upstash Redis proxy active with URL: ${UPSTASH_URL}`);
  } else {
    console.log(`ℹ️  Upstash can be configured directly in the app UI or via .env`);
  }
});