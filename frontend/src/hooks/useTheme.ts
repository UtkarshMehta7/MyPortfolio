import { useCallback, useEffect, useState } from 'react';

export type Theme = 'day' | 'night';
const KEY = 'utk_theme';

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'day' || saved === 'night') return saved;
  } catch { /* storage blocked */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

// Day flight / night flight. Applies Tailwind's `dark` class to <html> and remembers the choice per device.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'night');
    document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, theme); } catch { /* storage blocked */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'day' ? 'night' : 'day')), []);
  return { theme, toggle };
}
