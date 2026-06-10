## 🔧 GUIDA SETUP CLOUDFLARE WORKER

Hai appena creato un **Cloudflare Worker** per gestire OAuth in modo sicuro!

### ⚙️ Configurazione in 5 Step

#### Step 1: Installa Wrangler localmente
```bash
npm install
```

#### Step 2: Login su Cloudflare
```bash
npx wrangler login
```
Ti aprirà il browser per autorizzare il login.

#### Step 3: Configura le variabili d'ambiente
In Cloudflare Dashboard:
1. Vai a **Workers & Pages** → **Overview**
2. Seleziona **exaauto-worker** (o il nome che darai)
3. Vai a **Settings** → **Environment variables**
4. Aggiungi (Production environment):
   - **GITHUB_CLIENT_ID**: `Ov23liS8zF5MXwZAd0nf`
   - **GITHUB_CLIENT_SECRET**: *(il tuo secret)*

#### Step 4: Deploy il Worker
```bash
npm run deploy
```

Vedrai output come:
```
✨ Successfully published your Worker!
 * https://exaauto-worker.USERNAME.workers.dev/exchange-token
```

#### Step 5: Aggiorna il CMS
Nel file `exaauto-cms/admin/index.html`, riga ~177:

```javascript
const tokenExchangeUrl = 'https://exaauto-worker.USERNAME.workers.dev/exchange-token';
```

### ✅ Test del Worker
```bash
curl -X POST https://exaauto-worker.USERNAME.workers.dev/exchange-token \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code"}'
```

Dovrebbe ritornare un errore OAuth di GitHub (quello è normale, significa il worker funziona!)

### 🔐 Sicurezza
- ✅ Client secret rimane **nascosto** in Cloudflare
- ✅ Token exchange avviene **lato server**
- ✅ CORS headers configurati correttamente
- ✅ Niente credenziali nel repo pubblico
