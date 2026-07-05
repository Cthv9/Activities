import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Equilibrio',
        short_name: 'Equilibrio',
        description: "Dashboard familiare per monitorare l'equilibrio delle attività quotidiane.",
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#10201a',
        theme_color: '#10201a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache dell'app shell (JS/CSS/font già bundlati) per l'avvio offline.
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png}'],
        runtimeCaching: [
          {
            // Dati Supabase già caricati restano disponibili offline: risposta
            // di rete se raggiungibile entro il timeout, altrimenti l'ultima
            // copia in cache (i nuovi log offline passano invece dalla coda
            // IndexedDB in lib/offlineQueue.ts, non da questa cache HTTP).
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
