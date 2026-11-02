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
    fs: {
      allow: ['.', sharedDir],
    },
  },
});
