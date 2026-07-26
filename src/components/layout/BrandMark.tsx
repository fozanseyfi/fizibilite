/**
 * Platform logosu — lacivert zemin üzerinde altın güneş + yükselen bar grafiği
 * (güneş enerjisi + fizibilite/finans). Aynı sanat src/app/icon.svg'de favicon
 * olarak kullanılır; ikisini birlikte güncelle.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0E2A5E" />
          <stop offset="1" stopColor="#1E4A9E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#bm-bg)" />
      <g stroke="#E8A020" strokeWidth="3" strokeLinecap="round">
        <line x1="21" y1="6.5" x2="21" y2="10.5" />
        <line x1="8.5" y1="19" x2="12.5" y2="19" />
        <line x1="12" y1="10" x2="14.8" y2="12.8" />
        <line x1="30" y1="10" x2="27.2" y2="12.8" />
      </g>
      <circle cx="21" cy="19" r="7.5" fill="#E8A020" />
      <g fill="#FFFFFF" opacity="0.92">
        <rect x="13" y="40" width="9" height="13" rx="2.5" />
        <rect x="26.5" y="32" width="9" height="21" rx="2.5" />
      </g>
      <rect x="40" y="22" width="9" height="31" rx="2.5" fill="#E8A020" />
    </svg>
  );
}
