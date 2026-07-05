/**
 * ExaAuto — CMS semplice
 * Un solo endpoint, protetto da password, che legge e scrive
 * data/cars.json e data/news.json usando le API di GitHub.
 *
 * Variabili d'ambiente richieste su Cloudflare Pages (Settings → Environment variables):
 *   ADMIN_PASSWORD   -> la password che usi per accedere al pannello admin
 *   GITHUB_TOKEN      -> un Personal Access Token GitHub con permesso "repo" (Contents: Read and write)
 *                        sul repository exaauto/exaauto
 *
 * Endpoint:
 *   POST /api/cms   con body JSON: { password, action, file, data, sha }
 *     action = "get"   -> restituisce { content, sha } del file richiesto (file = "cars" | "news")
 *     action = "save"  -> salva "data" (array) nel file richiesto, richiede lo "sha" ottenuto dal "get"
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FILES = {
  cars: 'data/cars.json',
  news: 'data/news.json',
};

const REPO = 'exaauto/exaauto';
const BRANCH = 'main';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

  try {
    const { env, request } = context;

    if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD non configurata su Cloudflare Pages' }, 500);
    if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN non configurato su Cloudflare Pages' }, 500);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'JSON non valido nella richiesta' }, 400);
    }

    const { password, action, file, data, sha } = body || {};

    if (password !== env.ADMIN_PASSWORD) {
      return json({ error: 'Password errata' }, 401);
    }

    const path = FILES[file];
    if (!path) return json({ error: 'File non valido. Usa "cars" o "news".' }, 400);

    const apiUrl = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`;
    const ghHeaders = {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'ExaAuto-CMS',
    };

    if (action === 'get') {
      const r = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers: ghHeaders });
      if (!r.ok) {
        const t = await r.text();
        return json({ error: 'Errore GitHub (get)', detail: t }, r.status);
      }
      const fileData = await r.json();
      const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
      return json({ content: JSON.parse(decoded), sha: fileData.sha });
    }

    if (action === 'save') {
      if (!Array.isArray(data)) return json({ error: '"data" deve essere un array' }, 400);
      if (!sha) return json({ error: 'sha mancante — ricarica la pagina e riprova' }, 400);

      const pretty = JSON.stringify(data, null, 2);
      const encoded = btoa(unescape(encodeURIComponent(pretty)));

      const r = await fetch(apiUrl, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `CMS: aggiorna ${path}`,
          content: encoded,
          sha,
          branch: BRANCH,
        }),
      });

      if (!r.ok) {
        const t = await r.text();
        return json({ error: 'Errore GitHub (save)', detail: t }, r.status);
      }
      const result = await r.json();
      return json({ ok: true, sha: result.content.sha });
    }

    return json({ error: 'action non valida. Usa "get" o "save".' }, 400);
  } catch (e) {
    return json({ error: 'Errore interno', detail: String(e.message || e) }, 500);
  }
}
