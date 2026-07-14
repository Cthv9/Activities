/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache dell'app shell (JS/CSS/font già bundlati): permette l'avvio
// offline. La lista viene iniettata da vite-plugin-pwa al build (injectManifest).
precacheAndRoute(self.__WB_MANIFEST);

// Dati Supabase già caricati restano disponibili offline: risposta di rete
// se raggiungibile entro il timeout, altrimenti l'ultima copia in cache (i
// nuovi log offline passano invece dalla coda IndexedDB in
// lib/offlineQueue.ts, non da questa cache HTTP).
registerRoute(
  ({ url }) => url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 4,
  }),
);

self.skipWaiting();

// ============================================================
// Web Push (VAPID)
// Limite noto di iOS: Safari consegna le push a una PWA solo dopo che è
// stata installata su Home Screen ("Aggiungi a Home"); una scheda Safari
// normale, anche con permesso concesso, non riceverà mai le notifiche.
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Equilibrio', body: event.data.text() };
  }

  const base = import.meta.env.BASE_URL; // '/' oppure '/Activities/'
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Equilibrio', {
      body: payload.body ?? '',
      icon: `${base}icons/icon-192.png`,
      badge: `${base}icons/icon-192.png`,
      data: { url: payload.url ?? base },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const base = import.meta.env.BASE_URL;
  let targetUrl = (event.notification.data as { url?: string } | undefined)?.url ?? base;
  // Normalizza un eventuale percorso "root-relative" (es. '/') al base path
  // del deploy, cosi il click apre /Activities/... e non la radice del dominio.
  if (targetUrl.startsWith('/') && !targetUrl.startsWith(base)) {
    targetUrl = base.replace(/\/$/, '') + targetUrl;
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = allClients.find((c) => c.url.includes(targetUrl));
      if (existing) {
        await (existing as WindowClient).focus();
      } else {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
