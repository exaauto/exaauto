/**
 * Cloudflare Worker - proxy per chiamate GitHub Content API
 * Espone endpoint POST /api/gh che accetta JSON:
 * { action: 'get'|'put', path: 'data/cars.json', content?: object|string, content_base64?: boolean, sha?: string }
 *
 * Usa la variabile d'ambiente GITHUB_TOKEN (deve essere configurata nel dashboard Cloudflare)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Exchange token endpoint (legacy) - keep for compatibility
    if (url.pathname === '/exchange-token' && request.method === 'POST') {
      try {
        const { code } = await request.json();
        if (!code) return jsonResponse({ error: 'Code mancante' }, 400);

        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) return jsonResponse({ error: tokenData.error_description || tokenData.error }, 400);
        return jsonResponse({ access_token: tokenData.access_token });
      } catch (err) {
        return jsonResponse({ error: String(err.message || err) }, 500);
      }
    }

    // GitHub proxy endpoint
    if (url.pathname === '/api/gh' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { action, path, content, content_base64, sha } = body || {};
        if (!action || !path) return jsonResponse({ error: 'action e path sono richiesti' }, 400);

        const token = env.GITHUB_TOKEN;
        if (!token) return jsonResponse({ error: 'GITHUB_TOKEN non configurato nel Worker' }, 500);

        const ownerRepo = 'exaauto/exaauto';
        const apiBase = `https://api.github.com/repos/${ownerRepo}/contents/`;

        if (action === 'get') {
          const apiUrl = apiBase + encodeURIComponent(path) + `?ref=${env.GITHUB_BRANCH || 'main'}`;
          const r = await fetch(apiUrl, { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'ExaAuto-Worker' } });
          const text = await r.text();
          if (!r.ok) return jsonResponse({ error: text || r.statusText }, r.status);
          return new Response(text, { status: 200, headers: corsHeaders() });
        }

        if (action === 'put') {
          // content can be base64 string if content_base64 true, or an object to stringify
          let encoded;
          if (content_base64) {
            encoded = content; // already base64
          } else if (typeof content === 'string') {
            encoded = btoa(unescape(encodeURIComponent(content)));
          } else {
            encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
          }

          const putBody = { message: `CMS: aggiorna ${path}`, content: encoded, branch: env.GITHUB_BRANCH || 'main' };
          if (sha) putBody.sha = sha;

          const apiUrl = apiBase + encodeURIComponent(path);
          const r = await fetch(apiUrl, {
            method: 'PUT',
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'ExaAuto-Worker', 'Content-Type': 'application/json' },
            body: JSON.stringify(putBody)
          });
          const text = await r.text();
          if (!r.ok) return jsonResponse({ error: text || r.statusText }, r.status);
          return new Response(text, { status: 200, headers: corsHeaders() });
        }

        return jsonResponse({ error: 'action non supportata' }, 400);
      } catch (err) {
        return jsonResponse({ error: String(err.message || err) }, 500);
      }
    }

    return jsonResponse({ error: 'Endpoint non trovato' }, 404);
  }
};

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff'
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders() });
}
