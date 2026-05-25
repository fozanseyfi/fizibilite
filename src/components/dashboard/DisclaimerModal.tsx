'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, X, Scale } from 'lucide-react';

/** Dashboard karşılama banner'ı içinden açılan yasal bildirim modal'ı. */
export function DisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/85 hover:bg-white/15 hover:text-white transition-colors backdrop-blur"
      >
        <ShieldAlert className="h-3 w-3" />
        Yasal Bildirim
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white text-foreground shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-start gap-4 px-6 py-5 border-b border-border bg-gradient-to-r from-yellow-50 to-white">
              <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-yellow-500 text-white shadow-sm shrink-0">
                <Scale className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-yellow-700">
                  <ShieldAlert className="h-3 w-3" />
                  Yasal Bildirim
                </div>
                <h2 id="disclaimer-title" className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground mt-1 leading-tight">
                  Sorumluluk Reddi · Disclaimer
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  GES-Fizibilite Pro bir karar destek aracıdır. Resmi yatırım/kredi kararı için tek başına bağlayıcı kabul edilemez.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-shrink-0 -mr-2 -mt-1 p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm leading-relaxed text-foreground/85">
              <Section n="1" title="Kullanım Amacı">
                Bu platform; solar PV yatırımlarının teknik üretim tahmini (PVGIS), EPDK Karar 14531 uyumlu
                saatlik mahsuplaşma simülasyonu, BESS dispatch ve project finance modellemesini kolaylaştırmak
                amacıyla geliştirilmiş bir <strong>karar destek aracı</strong>dır. Üretilen NPV, IRR, LCOE, DSCR
                gibi metrikler yönlendirici göstergelerdir; yatırım kararı için ek doğrulama gerektirir.
              </Section>

              <Section n="2" title="Veri Sorumluluğu">
                Sisteme girilen tüm parametrelerin (kurulu güç, tüketim profili, CAPEX, banka koşulları, tarife
                sınıfı) doğruluğundan ve güncelliğinden kullanıcı sorumludur. Eksik veya yanlış girilen veriler
                üzerinden yapılan hesaplamaların sonuçlarından doğacak{' '}
                <strong>hiçbir maddi, manevi veya hukuki zarardan</strong> uygulama sorumlu tutulamaz.
              </Section>

              <Section n="3" title="Hukuki Bağlayıcılık">
                Bu platformdan alınan PDF/Excel çıktıları, fizibilite raporları, mahsuplaşma sonuçları ve PF
                modelleri <strong>hukuki delil, resmi yatırım onay belgesi veya bankacılık kredi kararı yerine
                geçmez.</strong> EPDK başvuruları ve banka kredi onayında imzalı ıslak veya KEP ile gönderilmiş
                orijinal belgeler esas alınır.
              </Section>

              <Section n="4" title="EPDK Tarifeleri & Mevzuat">
                Platform, EPDK&apos;nın 30 Nisan 2026 tarihli <strong>Karar No. 14531</strong> kapsamında 1 Şubat 2026
                itibarıyla yürürlüğe giren saatlik mahsuplaşma rejimine göre çalışır. EPDK&apos;nın sonradan yapacağı
                revizyonlar uygulamaya yansımayabilir. Güncel mevzuat için <strong>epdk.gov.tr</strong> esas alınır.
              </Section>

              <Section n="5" title="PVGIS & Üçüncü Taraf Veriler">
                Üretim tahminleri Avrupa Komisyonu&apos;nun <strong>PVGIS-SARAH3</strong> API&apos;sinden saatlik tipik yıl
                olarak çekilir. Gerçek üretim mevsimsel sapma, soiling, vandalizm, inverter arızası gibi nedenlerle
                ±%5-15 sapabilir. PVGIS, TCMB döviz kuru gibi üçüncü taraf servislerin erişilemezliği uygulamanın
                sorumluluğu altında değildir.
              </Section>

              <Section n="6" title="Yedekleme & Veri Kaybı">
                Verilerin yedeklenmesinden kullanıcı sorumludur. Tarayıcı silinmesi, beklenmedik hatalar veya
                3. parti servis kesintileri sebebiyle oluşabilecek veri kaybından{' '}
                <strong>sorumlu tutulamaz</strong>. Kritik fizibiliteler için PDF/Excel yedek alın.
              </Section>

              <Section n="7" title="Kabul">
                Platformu kullanmaya devam eden her kullanıcı, yukarıdaki maddeleri okuduğunu, anladığını ve
                kabul ettiğini beyan etmiş sayılır. Anlaşmazlık durumunda Ankara mahkemeleri yetkilidir.
              </Section>

              <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/60 flex justify-between">
                <span>Son güncelleme: 2026-05-25</span>
                <span>ges-fizibilite-pro · v0.2.0</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-secondary/30">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-yellow-100 text-yellow-700 text-[11px] font-mono font-bold tabular-nums shrink-0 mt-0.5">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-[13px] font-bold text-foreground tracking-tight">{title}</h3>
        <p className="text-[12.5px] text-foreground/75 leading-relaxed mt-1">{children}</p>
      </div>
    </div>
  );
}
