/**
 * Platform logosu — "Fizibil Onayı": lacivert zemin üzerinde beyaz onay işareti,
 * ucu altın yükselişe dönüyor (proje fizibil → değer yükseliyor).
 * Aynı sanat src/app/icon.svg'de favicon olarak kullanılır; birlikte güncelle.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B2350" />
          <stop offset="1" stopColor="#1A4A94" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#bm-g)" />
      <path d="M16 34 L27 45 L38 32" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 32 L46 23" fill="none" stroke="#E8A020" strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  );
}
