export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { code } = await request.json();

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Scambia il codice con il token di accesso GitHub
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ access_token: tokenData.access_token }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Importante: permette solo al tuo dominio di chiamare questa API
        "Access-Control-Allow-Origin": "https://exaauto.pages.dev",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Gestione CORS per le richieste preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "https://exaauto.pages.dev",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
