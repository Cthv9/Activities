import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Base path del deploy. In locale resta '/', su GitHub Pages (progetto
// servito sotto /<repo>/) viene passato dal workflow come '/Activities/'.
// Deve terminare con '/'.
const base = process.env.BASE_PATH || '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest (invece di generateSW): serve un service worker
      // scritto a mano (src/sw.ts) per poter gestire gli eventi push /
      // notificationclick richiesti dalle notifiche Web Push.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        // scope/start_url/id seguono il base path: sotto GitHub Pages l'app
        // vive in /Activities/, non alla radice del dominio.
        id: base,
        name: 'Equilibrio',
        short_name: 'Equilibrio',
        description: "Dashboard familiare per monitorare l'equilibrio delle attività quotidiane.",
        lang: 'it',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#10201a',
        theme_color: '#10201a',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
