export async function onRequestPost(context) {
  try {
    const { code, password } = await context.request.json();

    // Controllo password admin
    if (password !== context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Password errata' }), { status: 401 });
    }

    if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 });

    // Scambio code → access_token
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
      return new Response(JSON.stringify({ error: 'Token non ottenuto' }), { status: 400 });
    }

    // Verifica che l'utente sia il proprietario della repo
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${data.access_token}`, Accept: 'application/vnd.github.v3+json' }
    });
    const user = await userRes.json();

    const allowedUsers = (context.env.ALLOWED_GITHUB_USERS || '').split(',').map(u => u.trim());
    if (!allowedUsers.includes(user.login)) {
      return new Response(JSON.stringify({ error: 'Utente non autorizzato' }), { status: 403 });
    }

    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
