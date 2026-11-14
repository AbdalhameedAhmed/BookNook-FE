import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

const storageKey = 'rfoof-theme';
const themeColors: Record<Theme, string> = { light: '#F9F9FF', dark: '#10141E' };
const darkQuery = '(prefers-color-scheme: dark)';

type ThemeContextValue = { theme: Theme; toggleTheme: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia(darkQuery).matches ? 'dark' : 'light';
}

/**
 * Light/dark theme. Follows the device setting until the reader picks one with the
 * toggle; their choice is then remembered. index.html applies it before first paint.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Theme | null>(readSavedTheme);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = saved ?? system;

  // Track device changes; they only matter while the reader hasn't chosen.
  useEffect(() => {
    const query = window.matchMedia(darkQuery);
    const update = () => setSystem(query.matches ? 'dark' : 'light');
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    toggleTheme: () => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      setSaved(next);
      try { localStorage.setItem(storageKey, next); } catch { /* Storage may be unavailable in private browsing. */ }
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
