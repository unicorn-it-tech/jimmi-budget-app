
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const key = 'jimmi-budget-data'; // Chiave unica per i dati dell'app

    if (request.method === 'POST') {
      const data = await request.json();
      // Salva i dati in Redis (Vercel KV)
      await kv.set(key, data);
      return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } 
    
    if (request.method === 'GET') {
      // Recupera i dati da Redis
      const data = await kv.get(key);
      return new Response(JSON.stringify(data || {}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (request.method === 'DELETE') {
      // Cancella i dati da Redis (Reset Totale)
      await kv.del(key);
      return new Response(JSON.stringify({ success: true, message: 'Database cleared' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}