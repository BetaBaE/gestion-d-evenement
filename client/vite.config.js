import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const useHttps = process.env.VITE_HTTPS === 'true';

// /shared/badge-renderer lives outside this package's root (sibling of
// client/ and server/, imported by relative path, see Addendum 3 §4.1) —
// Vite's dev server otherwise refuses to serve files outside server.fs.allow.
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173,
    // Front and API on the same origin in dev (VITE_API_URL=/api): no CORS,
    // cookies always sent, images never blocked by CORP — from localhost
    // or from another machine on the LAN. Production does the same with
    // Nginx serving the front and proxying /api on one domain.
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: false },
    },
    fs: {
      allow: ['.', sharedDir],
    },
  },
});
