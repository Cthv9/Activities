import { useRegisterSW } from 'virtual:pwa-register/react';

/** Registra il service worker generato da vite-plugin-pwa. Aggiornamento
 * automatico: alla prossima apertura dell'app viene attivata l'ultima
 * versione precachata, senza prompt intermedi (scelta adatta a un'app
 * familiare, dove non serve gestire una UI di "nuova versione disponibile"). */
export function useServiceWorker() {
  useRegisterSW({ immediate: true });
}
