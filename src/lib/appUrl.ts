// Base path dell'app (Vite lo espone come import.meta.env.BASE_URL):
// '/' in locale, '/Activities/' su GitHub Pages. Senza slash finale.
const BASE_NO_SLASH = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Basename per React Router (stringa vuota alla radice). */
export const ROUTER_BASENAME = BASE_NO_SLASH;

/** Costruisce un URL assoluto verso una rotta dell'app, includendo l'origin
 * e il base path del deploy. Usato per i redirect di Supabase Auth (magic
 * link, invito, accesso PIN), che devono puntare al percorso reale su cui
 * l'app è ospitata. */
export function appUrl(path: string): string {
  return `${window.location.origin}${BASE_NO_SLASH}/${path.replace(/^\//, '')}`;
}
