import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [react(), tailwindcss(), {
    name: 'local-payment-origin',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        const origin = req.headers.origin;
        if (req.url?.startsWith('/webhooks/') || (origin && origin !== `http://${req.headers.host}`)
          || (req.method === 'POST' && !req.headers['content-type']?.startsWith('application/json'))) {
          res.statusCode = 403; res.end(); return;
        }
        next();
      });
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 8443, strictPort: true,
    proxy: { '/api': { target: env.PAYMENTS_API_TARGET || 'http://127.0.0.1:8080',
      headers: { 'X-Machine-Key': env.TOY_MACHINE_KEY || '' },
    } },
  },
  };
})
