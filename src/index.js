/**
 * Cloudflare Worker per OAuth GitHub token exchange
 * Scambia il code OAuth con un access token in modo sicuro
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS pre-flight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Endpoint POST /exchange-token
    if (url.pathname === '/exchange-token' && request.method === 'POST') {
      try {
        const { code } = await request.json();

        if (!code) {
          return sendJSON(
            { error: 'Code mancante' },
            400
          );
        }

        // Scambia il code con il token (client_secret rimane protetto in Cloudflare)
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ExaAuto-CMS',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          return sendJSON(
            { error: tokenData.error_description || tokenData.error },
            400
          );
        }

        // Ritorna il token al client
        return sendJSON({
          access_token: tokenData.access_token,
          token_type: tokenData.token_type || 'bearer',
          scope: tokenData.scope,
        });
      } catch (error) {
        console.error('OAuth exchange error:', error);
        return sendJSON(
          { error: 'Errore interno del server: ' + error.message },
          500
        );
      }
    }

    // Tutti gli altri endpoint
    return sendJSON(
      { error: 'Endpoint non trovato' },
      404
    );
  },
};

/**
 * Utility per inviare JSON con CORS headers
 */
function sendJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
