import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function mlOauthDev(clientSecret) {
  return {
    name: 'ml-oauth-dev',
    configureServer(server) {
      server.middlewares.use('/ml-oauth', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          const params = new URLSearchParams(body);
          params.set('client_id', '4268924083857847');
          params.set('client_secret', clientSecret);
          const mlRes = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
          const data = await mlRes.text();
          res.statusCode = mlRes.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(data);
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), mlOauthDev(env.VITE_ML_CLIENT_SECRET || '')],
  };
})
