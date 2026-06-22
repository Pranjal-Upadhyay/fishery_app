'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

/**
 * Theme management.
 *
 * - Default is 'light' (matches the dashboard's primary visual identity).
 * - Persisted to localStorage so a reload keeps the user's choice.
 * - The class is applied to <html> by a tiny inline script in <head> (see
 *   ThemeScript) BEFORE React hydrates, which prevents a flash of the wrong
 *   theme on first paint.
 */
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'matsyamitra.theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove(theme === 'dark' ? 'light' : 'dark');
  html.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR renders with default 'light'; the pre-hydration script may have
  // already swapped to 'dark' before React mounts. We resync on mount.
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = (typeof window !== 'undefined'
      ? (window.localStorage.getItem(STORAGE_KEY) as Theme | null)
      : null);
    const initial: Theme = stored === 'light' || stored === 'dark' ? stored : 'light';
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/**
 * Inline script that runs BEFORE hydration. Prevents the "white flash" when a
 * user with `light` saved loads the page (HTML starts marked `dark` by default).
 */
export const themeBootstrapScript = `
(function() {
  try {
    var stored = window.localStorage.getItem('${STORAGE_KEY}');
    var theme = (stored === 'light' || stored === 'dark') ? stored : 'light';
    document.documentElement.classList.remove(theme === 'dark' ? 'light' : 'dark');
    document.documentElement.classList.add(theme);
  } catch (e) {
    document.documentElement.classList.add('light');
  }
})();
`;
