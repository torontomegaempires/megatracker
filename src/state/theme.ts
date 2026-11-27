// The player's light/dark choice. It belongs to the device, not the game, so it is stored on its
// own and survives starting a new game. index.html applies it before the app loads to avoid a flash.
import { useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';

/** Keep in step with the inline script in index.html. */
const STORAGE_KEY = 'megatracker:theme';

/** The browser bar colours from index.html: the table mat in each scheme. */
const BAR_COLORS = { light: '#dcdfe2', dark: '#101113' } as const;

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  // index.html has one theme-color per scheme; a forced theme paints both with its own colour.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const scheme = m.media.includes('dark') ? 'dark' : 'light';
    m.content = BAR_COLORS[theme === 'system' ? scheme : theme];
  });
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState(loadTheme);
  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      if (t === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Private browsing: the choice lasts until the page is closed.
    }
  };
  return [theme, setTheme];
}
