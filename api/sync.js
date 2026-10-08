/**
 * Vercel Serverless Function — Upstash Redis Sync Proxy
 * 
 * Handles GET (pull from cloud) and POST (push to cloud).
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * from Vercel environment variables (never exposed to browser).
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(200).json({
      configured: false,
      error: 'Upstash environment variables not set on server'
    });
  }

  try {
    // GET — Pull latest state from Redis
    if (req.method === 'GET') {
      const room = req.query.room || 'study-duo-room-1';

      const response = await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', `peertrack:${room}`])
      });

      const data = await response.json();
      return res.status(200).json({ configured: true, result: data.result || null });
    }

    // POST — Push state to Redis
    if (req.method === 'POST') {
      const { room, payload } = req.body;
      const roomId = room || 'study-duo-room-1';

      const response = await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', `peertrack:${roomId}`, JSON.stringify(payload)])
      });

      const data = await response.json();
      return res.status(200).json({ configured: true, ok: true, result: data.result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
