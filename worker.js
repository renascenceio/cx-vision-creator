export default {
  async fetch(request, env) {

    const ORIGIN = env.ALLOWED_ORIGIN || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ORIGIN,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN };
    const url = new URL(request.url);

    // Health check (GET /)
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'CX Vision Worker is running' }), { headers: cors });
    }

    // POST /generate
    if (request.method === 'POST' && url.pathname === '/generate') {
      try {
        const { prompt } = await request.json();

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || 'Anthropic error' }), { status: 502, headers: cors });
        }

        return new Response(JSON.stringify({ success: true, data }), { headers: cors });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
      }
    }

    // POST /lead
    if (request.method === 'POST' && url.pathname === '/lead') {
      try {
        const { email, source } = await request.json();

        if (env.GOOGLE_SHEET_URL && email) {
          fetch(env.GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, source, timestamp: new Date().toISOString() }),
          }).catch(() => {});
        }

        return new Response(JSON.stringify({ success: true }), { headers: cors });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors });
  }
};
