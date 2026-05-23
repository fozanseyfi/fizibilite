'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InfoTooltipProps {
  title: string;
  body: React.ReactNode;
  className?: string;
}

/**
 * Teknik terimler için soru-işareti ikonu.
 * Tıklayınca popover ile açıklama gösterir.
 */
export function InfoTooltip({ title, body, className }: InfoTooltipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Bilgi: ${title}`}
          className={cn('inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary transition-colors align-middle', className)}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={6}
          className="z-50 max-w-sm rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none"
        >
          <div className="text-sm font-semibold mb-1.5">{title}</div>
          <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Hazır açıklamalar — projedeki teknik terimler için
export const TOOLTIPS: Record<string, { title: string; body: React.ReactNode }> = {
  lid: {
    title: 'LID — Light Induced Degradation',
    body: (
      <>
        İlk yıl ışık kaynaklı kapasite kaybı. Monokristalin paneller için tipik %2, polikristalin için %2.5.
        Sonraki yıllar bunun üzerine yıllık degradasyon eklenir.
      </>
    ),
  },
  degradation: {
    title: 'Yıllık Degradasyon',
    body: (
      <>
        Panellerin yıllık kapasite kaybı. Üretici garantisi tipik %0.5/yıl. Monokristalin %0.4-0.5,
        polikristalin %0.6-0.7. 25 yıl sonunda toplam ≈ %12-15 kayıp.
      </>
    ),
  },
  angle: {
    title: 'Panel Eğim Açısı',
    body: (
      <>
        Panelin yataydan açısı. Türkiye için optimum 28-35° arası. Çatıda mevcut eğim önceliklidir.
        Düşük açı yaz üretimini, yüksek açı kış üretimini öne çıkarır.
      </>
    ),
  },
  aspect: {
    title: 'Azimut (Yön)',
    body: (
      <>
        Panelin baktığı yön. Güney = 0°, Doğu = -90°, Batı = +90°. Türkiye için optimum Güney (0°).
        Doğu/Batı için ~%15 üretim kaybı.
      </>
    ),
  },
  pvgis: {
    title: 'PVGIS-SARAH3',
    body: (
      <>
        Avrupa Komisyonu'nun açık meteorolojik veri tabanı. Türkiye için yaklaşık 5 km grid çözünürlükte
        uydu radyasyon verisi sağlar. Uygulamamız 8760 saatlik üretimi bu veri ile hesaplar.
      </>
    ),
  },
  netting: {
    title: 'Saatlik Mahsuplaşma',
    body: (
      <>
        EPDK Karar 14531 ile 01.05.2026'da yürürlüğe girmiştir. Her saat üretim ile tüketim ayrı ayrı
        karşılaştırılır. <code>netted[h] = min(üretim, tüketim)</code> formülü uygulanır.
      </>
    ),
  },
  paidLimit: {
    title: 'Bedelli Üretim Limiti',
    body: (
      <>
        Önceki yıl tüketim × 2 ile sınırlıdır. Bu limit aşıldıktan sonra fazla üretim YEKDEM'e
        BEDELSİZ aktarılır. Limit aşılsa bile mahsuplaşma devam eder.
      </>
    ),
  },
  sktt: {
    title: 'SKTT — Son Kaynak Tedarik Tarifesi',
    body: (
      <>
        Yıllık tüketim 4.000 kWh'i aşan mesken ve 15.000 kWh'i aşan ticarethane/sanayi için uygulanan
        tarife. Formül: <code>(PTF + YEKDEM) × KBK</code>. KBK: 1.05 (mesken), 1.0938 (diğer).
      </>
    ),
  },
  kbk: {
    title: 'KBK — Kurulca Belirlenen Katsayı',
    body: (
      <>
        SKTT hesaplamasında PTF+YEKDEM toplamına uygulanan çarpan. Mesken: 1.05 (yani %5),
        ticarethane/sanayi: 1.0938 (yani %9.38). Tedarikçi marjını temsil eder.
      </>
    ),
  },
  ptf: {
    title: 'PTF — Piyasa Takas Fiyatı',
    body: (
      <>
        EPİAŞ Şeffaflık Platformu'nda saatlik açıklanır. Gün öncesi piyasada elektriğin saatlik fiyatıdır.
        BESS arbitraj kararlarında kullanılır.
      </>
    ),
  },
  yekdem: {
    title: 'YEKDEM',
    body: (
      <>
        Yenilenebilir Enerji Kaynakları Destekleme Mekanizması. Lisanssız tesislerde bedelli limit
        aşımı sonrası fazla üretim YEKDEM'e bedelsiz aktarılır (gelir yaratmaz).
      </>
    ),
  },
  irr: {
    title: 'IRR — Internal Rate of Return',
    body: (
      <>
        Projenin NPV'sini sıfıra getiren iskonto oranıdır. WACC'den (sermaye maliyeti) yüksekse
        proje değerlidir. Türkiye'deki güneş projelerinde 2026 koşullarında %25-50 tipik.
      </>
    ),
  },
  npv: {
    title: 'NPV — Net Bugünkü Değer',
    body: (
      <>
        Tüm yıllık nakit akışlarının iskonto oranıyla bugüne indirgenmiş toplamı eksi yatırım.
        Pozitif NPV → proje değer üretir.
      </>
    ),
  },
  lcoe: {
    title: 'LCOE — Levelized Cost of Energy',
    body: (
      <>
        Yatırımın ve işletmenin yaşam döngüsündeki toplam maliyetinin, üretilecek toplam enerjiye
        bölünmesidir. Tarife alış fiyatından düşükse proje rekabetçidir.
      </>
    ),
  },
  dscr: {
    title: 'DSCR — Debt Service Coverage Ratio',
    body: (
      <>
        İşletme nakit akışının borç servisine oranı. Bankalar ≥ 1.2 ister. 1.0'ın altı kredi
        ödeme zorluğuna işaret eder.
      </>
    ),
  },
  fcfc: {
    title: 'FCFC — Free Cash Flow to Company',
    body: (
      <>
        Şirket sahiplerine (hem öz sermaye hem kreditörlere) giden serbest nakit akışı.
        Finansman öncesi. Proje değerlemesinde kullanılır.
      </>
    ),
  },
  fcfe: {
    title: 'FCFE — Free Cash Flow to Equity',
    body: (
      <>
        Yalnızca öz sermaye sahiplerine giden nakit akışı. Faiz ve anapara ödemeleri çıkarıldıktan
        sonra. Yatırımcı getirisi için kullanılır.
      </>
    ),
  },
  augmentation: {
    title: 'Batarya Augmentation',
    body: (
      <>
        Bataryanın yıllar içinde kapasitesi düştükçe, ek hücrelerle kapasitenin yenilenmesi.
        Genelde yıl 8 ve 16'da yapılır. Gelecek yıl bataryasının daha ucuz olacağı varsayımıyla.
      </>
    ),
  },
  monteCarlo: {
    title: 'Monte Carlo Risk Analizi',
    body: (
      <>
        Belirsiz değişkenlerden (üretim, fiyat, kur, vs.) binlerce senaryo örnekleyerek
        IRR/NPV dağılımı çıkarır. P10/P50/P90 ile risk profilini gösterir.
      </>
    ),
  },
};
