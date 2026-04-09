import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: '.',
  plugins: [
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Suppress transient proxy errors during backend restart (nodemon)
            console.log(`[vite-proxy] Backend warmup... (${(err as any).code || err.message})`);
            if (res && 'writeHead' in res && !res.headersSent) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({ error: 'BACKEND_WARMING_UP' }));
            }
          });
        },
      },
    },
  },
});
