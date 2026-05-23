'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientLocale, setClientLocale, Locale } from '@/lib/i18n';

export function LocaleToggle() {
  const [locale, setLocaleState] = useState<Locale>('tr');

  useEffect(() => {
    setLocaleState(getClientLocale());
  }, []);

  function switchLocale() {
    const next: Locale = locale === 'tr' ? 'en' : 'tr';
    setClientLocale(next);
    setLocaleState(next);
    // Server component'leri yeniden render için reload (cookie set edildi)
    if (typeof window !== 'undefined') window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      className={cn('inline-flex h-9 items-center gap-1.5 px-2.5 rounded-md border border-border/40 bg-secondary hover:bg-secondary/80 transition-colors text-xs font-medium')}
      aria-label={locale === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
      title={locale === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
    >
      <Globe className="h-3.5 w-3.5" />
      {locale === 'tr' ? 'TR' : 'EN'}
    </button>
  );
}
