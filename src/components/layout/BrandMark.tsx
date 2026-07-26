/**
 * Platform logosu — düz lacivert zemin üzerinde geometrik "F" monogramı
 * (Fizibilite); orta kol altın vurgulu. Kurumsal, sade, küçük boyutta net.
 * Aynı sanat src/app/icon.svg'de favicon olarak kullanılır; birlikte güncelle.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0E2A5E" />
      <rect x="20" y="16" width="6" height="32" rx="1.5" fill="#FFFFFF" />
      <rect x="20" y="16" width="24" height="6" rx="1.5" fill="#FFFFFF" />
      <rect x="20" y="30" width="17" height="6" rx="1.5" fill="#E8A020" />
    </svg>
  );
}
