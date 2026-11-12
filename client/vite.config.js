import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawTarget = env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
  // Normalize localhost to 127.0.0.1 to avoid Windows IPv6 resolution latency or refusal
  const backendTarget = rawTarget.replace('://localhost', '://127.0.0.1');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, _req, res) => {
              if (res.writeHead && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    message: `Backend API server is offline at ${options.target}. Please make sure the backend server is running with 'npm run dev:server'.`,
                  })
                );
              }
            });
          },
        },
      },
    },
  };
});
