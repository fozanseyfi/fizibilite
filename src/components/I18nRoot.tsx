'use client';

import { useEffect } from 'react';
import type { Locale } from '@/lib/i18n';

/** Dil EN ise sayfa çevirisini başlatır (bkz. lib/i18n-dom). TR'de hiçbir şey yüklenmez. */
export function I18nRoot({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (locale !== 'en') return;
    let alive = true;
    import('@/lib/i18n-dom').then((m) => { if (alive) m.startDomTranslation(); });
    return () => { alive = false; };
  }, [locale]);
  return null;
}
