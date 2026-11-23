"use client";

import { ShieldCheck, Check } from "lucide-react";

/**
 * Login sayfasında formun altındaki "Bilgi Paylaşımı" notu ve sağdaki
 * "Veri Gizliliği" kartı — diğer platformlarla ortak içerik.
 */

/** Geliştirici notu — bütün platformlarda aynı metin (Teklif'teki login-kit ile birebir). */
export function PlatformNoteCard() {
  return (
    <div className="w-full rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 text-[13px] leading-relaxed text-muted-foreground">
      <p className="text-[13.5px] font-bold text-foreground">Merhaba, ben Ozan.</p>
      <p className="mt-2">
        Uzun süre sahada ve masa başında, teklif hazırlarken, keşif çıkarırken, tedarikçi karşılaştırırken hep
        aynı Excel dosyalarıyla uğraştım. Bu platformlar, önce kendi işimi kolaylaştırmak için yazdığım
        araçlardan doğdu.
      </p>
      <p className="mt-2">
        Arkasında bir şirket yok, size satmaya çalıştığım bir şey de yok. İşinize yararsa ne mutlu bana. Eksik
        gördüğünüz ya da canınızı sıkan bir şey olursa{" "}
        <a href="mailto:fozanseyfi@gmail.com" className="font-semibold text-primary hover:underline">yazın</a>; bir sonraki özellik sizin
        &ldquo;şu da olsa&rdquo; demenizle gelebilir.
      </p>
      <p className="mt-2 text-foreground">— Furkan Ozan Seyfi</p>
    </div>
  );
}

export function PrivacyCard() {
  // NOT: Yerel mod (localStorage) için doğru olan maddeler.
  // Supabase geçişinde RLS / hesap izolasyonu maddeleriyle güncellenecek.
  const items = [
    "Hesap ve veriler yalnızca bu tarayıcıda tutulur",
    "Şifreler düz metin saklanmaz (salt + SHA-256)",
    "Üçüncü taraf izleme veya analitik yok",
    "Bulut senkronu yakında (Supabase)",
  ];
  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0B2350] text-white shadow-sm">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-solar-dark dark:text-solar-light">
            VERİ GİZLİLİĞİ
          </p>
          <p className="mt-0.5 text-[13px] font-bold text-foreground">
            Verileriniz size aittir. Geliştirici dahil hiç kimse görüntüleyemez.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[11.5px] text-muted-foreground sm:grid-cols-2">
            {items.map((it) => (
              <li key={it} className="flex items-start gap-1.5">
                <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
