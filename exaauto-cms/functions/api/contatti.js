export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { nome, telefono, email, messaggio } = body;

    // Validazione base
    if (!nome || !email || !messaggio) {
      return new Response(JSON.stringify({ error: 'Campi obbligatori mancanti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Invia email tramite MailChannels (gratuito su Cloudflare Pages)
    const emailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: 'info@exaauto.it', name: 'ExaAuto' }]
        }],
        from: { email: 'noreply@exaauto.it', name: 'ExaAuto Contatti' },
        reply_to: { email: email, name: nome },
        subject: `Nuovo messaggio da ${nome} - ExaAuto`,
        content: [{
          type: 'text/plain',
          value: `Nuovo messaggio dal sito ExaAuto:\n\nNome: ${nome}\nTelefono: ${telefono || 'non fornito'}\nEmail: ${email}\n\nMessaggio:\n${messaggio}`
        }, {
          type: 'text/html',
          value: `
            <h2 style="color:#e63946">Nuovo messaggio da ExaAuto</h2>
            <table style="border-collapse:collapse;width:100%;max-width:600px">
              <tr><td style="padding:8px;font-weight:bold;width:120px">Nome</td><td style="padding:8px">${nome}</td></tr>
              <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold">Telefono</td><td style="padding:8px">${telefono || 'non fornito'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
              <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold;vertical-align:top">Messaggio</td><td style="padding:8px">${messaggio.replace(/\n/g, '<br>')}</td></tr>
            </table>
          `
        }]
      })
    });

    if (!emailRes.ok && emailRes.status !== 202) {
      const errText = await emailRes.text();
      console.error('MailChannels error:', errText);
      return new Response(JSON.stringify({ error: 'Errore invio email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Worker error:', err);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
