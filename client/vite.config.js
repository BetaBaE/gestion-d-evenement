import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

// /shared/badge-renderer lives outside this package's root (sibling of
// client/ and server/, imported by relative path, see Addendum 3 §4.1) —
// Vite's dev server otherwise refuses to serve files outside server.fs.allow.
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig(({ mode }) => {
  // VITE_HTTPS can be set in client/.env or in the shell. Phones only allow
  // the camera (scan page) on HTTPS, so testing the scan from a phone on the
  // LAN needs it; the self-signed certificate is accepted once per device.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const useHttps = env.VITE_HTTPS === 'true';

  return {
    plugins: [
      react(),
      ...(useHttps ? [basicSsl()] : []),
      // Installable app (PWA). The service worker only precaches the built
      // front-end files; /api is never cached (scans, stats and data are
      // always live). New deployments are picked up on the next load.
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Gestion des inscriptions',
          short_name: 'Inscriptions',
          description: 'Inscriptions, badges et contrôle d’accès de vos événements.',
          lang: 'fr',
          start_url: '/admin',
          scope: '/',
          display: 'standalone',
          background_color: '#0b2a4a',
          theme_color: '#1864ab',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          // The admin bundle is ~2.6 MB (react-admin + MUI + editor).
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
        },
        // Also active in `npm run dev`, so the install prompt can be tried on
        // the LAN (needs VITE_HTTPS=true: browsers only install HTTPS apps).
        devOptions: { enabled: true, navigateFallbackAllowlist: [/^\/(admin|scan|inscription)/] },
      }),
    ],
    server: {
      host: true,
      port: 5173,
      // Front and API on the same origin in dev (VITE_API_URL=/api): no CORS,
      // cookies always sent, images never blocked by CORP — from localhost
      // or from another machine on the LAN. Production does the same with
      // Nginx serving the front and proxying /api on one domain.
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: false },
      },
      fs: {
        allow: ['.', sharedDir],
      },
    },
  };
});
