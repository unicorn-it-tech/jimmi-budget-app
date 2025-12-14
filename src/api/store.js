import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS Configuration
  // Per supportare le credenziali (cookies, auth headers), l'Origin non può essere '*'
  const origin = req.headers.origin || '*';
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Risposta immediata per le richieste preflight del browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.error("Missing KV Environment Variables");
      // Ritorniamo JSON anche in caso di errore per evitare crash nel frontend
      return res.status(500).json({ 
        error: 'Database configuration missing', 
        details: 'Check KV_REST_API_URL and KV_REST_API_TOKEN in Vercel settings.' 
      });
    }

    const kv = createClient({
      url,
      token,
    });

    const key = 'jimmi-budget-data';

    if (req.method === 'POST') {
      const data = req.body;
      if (!data) {
        return res.status(400).json({ error: 'No data provided' });
      }
      await kv.set(key, data);
      return res.status(200).json({ success: true, timestamp: new Date().toISOString() });
    } 
    
    if (req.method === 'GET') {
      const data = await kv.get(key);
      return res.status(200).json(data || {});
    }

    if (req.method === 'DELETE') {
      await kv.del(key);
      return res.status(200).json({ success: true, message: 'Database cleared' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}