export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'equilibrio-theme';
const THEME_COLORS: Record<Theme, string> = {
  light: '#eef4ec',
  dark: '#10201a',
};

export function getStoredTheme(): Theme {
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

/** Applica il tema al documento, lo persiste e aggiorna la meta theme-color
 * (barra di stato su mobile / PWA). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}

/** Da chiamare all'avvio, prima del primo render, per evitare flash di tema. */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
