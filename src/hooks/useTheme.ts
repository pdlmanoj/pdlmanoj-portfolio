import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Two-state light/dark theme.
 *
 * - The first value comes from the inline script in index.html, which has
 *   already applied `data-theme` to <html> before the page painted. Reading it
 *   back here keeps React in sync with what the user actually sees.
 * - The choice is saved in localStorage and wins over the OS setting from then
 *   on. Clearing the key returns the site to following the OS.
 */
function readCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const applied = document.documentElement.dataset.theme;
  if (applied === 'light' || applied === 'dark') return applied;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readCurrentTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing or storage disabled: the theme still applies for this
      // page view, it just will not be remembered.
    }
  }, [theme]);

  // Keeps the browser UI (address bar on mobile) in step with the page.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0d0d0d' : '#f7f6f4';
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
