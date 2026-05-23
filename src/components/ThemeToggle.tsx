'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('theme')) as 'light' | 'dark' | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored ?? (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    if (typeof window !== 'undefined') localStorage.setItem('theme', next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/40 bg-secondary hover:bg-secondary/80 transition-colors'
      )}
      title={theme === 'dark' ? 'Aydınlık tema' : 'Karanlık tema'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
    </button>
  );
}
