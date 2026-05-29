const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  try {
    let body;
    try {
      body = await context.request.json();
    } catch(e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON', detail: e.message }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    const { code, password } = body;

    if (!context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'ENV_MISSING', detail: 'ADMIN_PASSWORD not set' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    if (password !== context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Password errata' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: context.env.GITHUB_CLIENT_ID,
        client_secret: context.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const data = await res.json();

    if (!data.access_token) {
      return new Response(JSON.stringify({ error: 'Token non ottenuto', detail: data }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${data.access_token}`, Accept: 'application/vnd.github.v3+json' }
    });
    const user = await userRes.json();

    const allowedUsers = (context.env.ALLOWED_GITHUB_USERS || '').split(',').map(u => u.trim());
    if (!allowedUsers.includes(user.login)) {
      return new Response(JSON.stringify({ error: 'Utente non autorizzato', login: user.login }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}
