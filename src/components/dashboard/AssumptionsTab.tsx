'use client';

/**
 * Banka raporu için tam varsayımlar + metodoloji sayfası.
 * Tüm girdileri kaynaklarıyla gösterir; kullanıcı bu sayfayı bankacıya açıklarken referans alır.
 */

import { ProjectConfig } from '@/lib/types';
import type { SlimResult } from '@/lib/slim-result';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatMoney, formatKwh, Currency } from '@/lib/utils';
import { PROFILES } from '@/lib/consumption';

export function AssumptionsTab({
  config,
  result,
  currency,
}: {
  config: ProjectConfig;
  result: SlimResult;
  currency: Currency;
}) {
  const usdTry = config.fx.usdTry;

  return (
    <div className="space-y-6">
      <div className="bg-secondary/40 rounded-xl border border-border/60 p-5">
        <h3 className="font-bold text-base mb-2">📋 Banka / Yatırımcı Raporu — Veri Beyanı</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Aşağıdaki sayfa, finansal modele girilen tüm parametreleri kaynaklarıyla birlikte sunar.
          Her bölüm bir kararı (veri kaynağı + yöntem + sayısal değer) belgeler. Banka due diligence ekiplerinin
          tüm sorularına burada cevap bulunmalıdır.
        </p>
      </div>

      <Section title="1. Lokasyon & Sistem Konfigürasyonu" sourceNote="Kullanıcı girişi · PVGIS-SARAH3 doğrulaması">
        <Row label="Proje Adı" value={config.name} source="Kullanıcı girişi" />
        <Row label="Lokasyon" value={`${config.location.city ?? '—'} (lat ${config.location.lat.toFixed(4)}, lon ${config.location.lon.toFixed(4)})`} source="Kullanıcı girişi" />
        <Row label="Proje Türü" value={config.projectType} source="Kullanıcı seçimi" />
        <Row label="Kurulu Güç" value={`${config.pv.peakPowerKwp.toLocaleString('tr-TR')} kWp`} source="Kullanıcı girişi · Bağlantı anlaşması" />
        <Row label="Panel Eğim Açısı" value={`${config.pv.angle}°`} source="Türkiye için optimum 28-35° (PVGIS analizine göre)" />
        <Row label="Azimut" value={`${config.pv.aspect}° (Güney=0°)`} source="Türkiye için optimum 0° (Güney)" />
        <Row label="Modül Teknolojisi" value={config.pv.moduleTech} source="PVGIS pvtechchoice parametresi" />
        <Row label="Montaj Tipi" value={config.pv.mounting} source="PVGIS mountingplace parametresi" />
        <Row label="Sistem Kaybı" value={`${config.pv.loss}%`} source="PVGIS varsayılan %14 (kablo + invertör + kirlilik + sıcaklık)" />
        <Row label="İlk Yıl LID" value={`%${(config.pv.lidPct * 100).toFixed(1)}`} source="Mono Si tipik %2.0, Poli Si %2.5" />
        <Row label="Yıllık Degradasyon" value={`%${(config.pv.annualDegradationPct * 100).toFixed(2)}/yıl`} source="Üretici garantisi · IEC 61215 standart" />
      </Section>

      <Section title="2. Üretim Verisi (PVGIS-SARAH3)" sourceNote="Avrupa Komisyonu PVGIS API · 5 km uydu radyasyon grid'i">
        <Row label="Veri kaynağı" value="https://re.jrc.ec.europa.eu/api/v5_3/seriescalc" source="PVGIS v5.3, raddatabase=PVGIS-SARAH3" />
        <Row label="Veri yılı" value="2020 (TMY benzeri)" source="Tek yıl üzerinden 8760 saatlik üretim, sonraki yıllar degradasyon ile" />
        <Row label="Yıl 1 üretim" value={formatKwh(result.yearly[0].generation)} source="PVGIS hesaplaması, sistem kayıpları dahil" />
        <Row label="Spesifik üretim" value={`${(result.yearly[0].generation / config.pv.peakPowerKwp).toFixed(0)} kWh/kWp/yıl`} source="Türkiye için tipik 1.400-1.800 kWh/kWp" />
        <Row label="25 yıllık kümülatif" value={formatKwh(result.finance.yearly.reduce((a, y) => a + y.generationKwh, 0), { compact: true })} source="LID + yıllık degradasyon dahil" />
      </Section>

      <Section title="3. Tüketim Profili" sourceNote="Kullanıcı tarafından yapılandırılmış / sektör profili">
        <Row label="Profil" value={PROFILES[config.consumption.profileId]?.label ?? config.consumption.profileId} source={config.consumption.profileId === 'custom_builder' ? 'Custom Builder (saatlik + aylık özelleştirme)' : 'GES-Fizibilite Pro yerleşik 14 sektörel profil'} />
        <Row label="Yıllık tüketim" value={formatKwh(config.consumption.annualKwh)} source="Geçmiş 12 ay faturalar veya bütçe tahmini" />
        <Row label="Yıllık büyüme" value={`%${config.consumption.growthRatePct}/yıl`} source="Kullanıcı tahmini; geçmiş büyüme trendi" />
        <Row label="Önceki yıl tüketim" value={formatKwh(config.consumption.prevYearKwh)} source="EPDK bedelli üretim limiti hesabı için (=× 2)" />
        <Row label="Bedelli limit" value={formatKwh(config.consumption.prevYearKwh * 2)} source="EPDK Karar 14531 — önceki yıl × 2" />
      </Section>

      <Section title="4. Elektrik Tarifesi" sourceNote="EPDK Kurul Kararı No: 14461 (02.04.2026), R.G. 04.04.2026">
        <Row label="Abone Grubu" value={config.tariff.consumerGroup} source="EPDK tarife yapısı" />
        <Row label="Alış fiyatı" value={`${config.tariff.purchasePriceTlKwh.toFixed(2)} TL/kWh`} source="EPDK 14461 — auto-load" />
        <Row label="Satış fiyatı" value={`${config.tariff.salePriceTlKwh.toFixed(2)} TL/kWh`} source="EPDK 14461 — auto-load" />
        <Row label="Dağıtım bedeli" value={`${config.tariff.distributionFeeTlKwh.toFixed(2)} TL/kWh`} source="EPDK 14461 — TEDAŞ ulusal tarife (21 bölge aynı)" />
        <Row label="KDV" value={`%${(config.tariff.vatPct * 100).toFixed(0)}`} source={config.tariff.consumerGroup === 'MESKEN' ? 'Mesken için 2022\'den beri %1' : '3065 sayılı KDV Kanunu — %20'} />
        <Row label="BTV (Belediye Tüketim Vergisi)" value={`%${(config.tariff.consumptionTaxPct * 100).toFixed(0)}`} source={config.tariff.consumerGroup.startsWith('SANAYI') ? 'Sanayi için %1' : 'Mesken/Ticarethane %5'} />
        <Row label="Elektrik fiyat artışı" value={`%${config.tariff.electricityInflationPct}/yıl`} source="Tahmin; TÜFE ile paralel, EPDK kararlarıyla revize" />
        <Row label="Mahsuplaşma" value="EPDK Karar 14531 saatlik mahsup" source="01.05.2026 yürürlük; netted = min(üretim, tüketim) her saat" />
        <Row label="SKTT eşiği" value={config.tariff.consumerGroup === 'MESKEN' ? '4.000 kWh/yıl' : '15.000 kWh/yıl'} source="EPDK 30.10.2025 kararı, 01.01.2026 yürürlük" />
        <Row label="SKTT KBK" value={config.tariff.consumerGroup === 'MESKEN' ? '1.05' : '1.0938'} source="SKTT = (PTF + YEKDEM) × KBK" />
      </Section>

      {config.battery.enabled && (
        <Section title="5. Batarya (BESS)" sourceNote="LFP kimya · 2026 piyasa fiyatları">
          <Row label="Nominal kapasite" value={`${config.battery.nominalCapacityKwh.toLocaleString('tr-TR')} kWh`} source="Sistem boyutlandırma" />
          <Row label="Nominal güç" value={`${config.battery.nominalPowerKw.toLocaleString('tr-TR')} kW`} source="Sistem boyutlandırma" />
          <Row label="Round-trip verim" value={`%${(config.battery.roundTripEfficiency * 100).toFixed(0)}`} source="LFP tipik %90-94" />
          <Row label="Çevrim ömrü" value={`${config.battery.cycleLifeAt80Dod.toLocaleString('tr-TR')} (80% DoD)`} source="LFP üretici garantisi" />
          <Row label="Calendar ömür" value={`${config.battery.calendarLifeYears} yıl`} source="LFP tipik 15 yıl" />
          <Row label="EoL kapasite" value={`%${(config.battery.eolCapacityPct * 100).toFixed(0)}`} source="EoL kabul edilen kapasite oranı" />
          <Row label="Birim CAPEX (enerji)" value={`${config.battery.capexTlPerKwh.toLocaleString('tr-TR')} TL/kWh`} source="2026 LFP piyasa fiyatı" />
          <Row label="Birim CAPEX (güç)" value={`${config.battery.capexTlPerKw.toLocaleString('tr-TR')} TL/kW`} source="PCS + inverter" />
          {config.battery.augmentationEnabled && (
            <Row label="Augmentation" value={`Yıl ${config.battery.augmentationYears.join(', ')} (+${config.battery.augmentationKwhPerEvent} kWh)`} source="Kapasite yenileme planı" />
          )}
        </Section>
      )}

      <Section title="6. CAPEX (Yatırım Maliyeti)" sourceNote="2026 USD/Wp piyasa verileri · USD/TL = " sourceNoteValue={usdTry.toFixed(2)}>
        <Row label="PV Modül" value={formatMoney(config.capex.pvModule, currency, usdTry, { compact: true })} source={`${(config.capex.pvModule / (config.pv.peakPowerKwp * 1000 * usdTry)).toFixed(3)} USD/Wp · 2026 Tier-1 mono PERC`} />
        <Row label="İnvertör" value={formatMoney(config.capex.inverter, currency, usdTry, { compact: true })} source={`${(config.capex.inverter / (config.pv.peakPowerKwp * 1000 * usdTry)).toFixed(3)} USD/Wp · string/central`} />
        <Row label="Montaj/Yapı" value={formatMoney(config.capex.mounting, currency, usdTry, { compact: true })} source={`${(config.capex.mounting / (config.pv.peakPowerKwp * 1000 * usdTry)).toFixed(3)} USD/Wp · ${config.pv.mounting === 'free' ? 'arazi çelik yapı' : 'çatı montaj'}`} />
        <Row label="Kablo & DC/AC pano" value={formatMoney(config.capex.cabling, currency, usdTry, { compact: true })} source="0.04 USD/Wp piyasa ortalaması" />
        <Row label="İşçilik" value={formatMoney(config.capex.labor, currency, usdTry, { compact: true })} source="Türkiye 2026 işçilik 0.05 USD/Wp" />
        <Row label="Mühendislik & Tasarım" value={formatMoney(config.capex.engineering, currency, usdTry, { compact: true })} source="Etüt + proje + danışmanlık 0.03 USD/Wp" />
        <Row label="Bağlantı Bedeli + TEDAŞ" value={formatMoney(config.capex.gridConnection + config.capex.tedasZbof, currency, usdTry, { compact: true })} source="TEDAŞ proje onay + ZBÖF bedeli + dağıtım şirketi bağlantı bedeli" />
        {config.capex.land > 0 && (
          <Row label="İmar/Zemin" value={formatMoney(config.capex.land, currency, usdTry, { compact: true })} source="Arazi GES için zemin/imar maliyeti" />
        )}
        <Row label="Sigorta (CAR)" value={formatMoney(config.capex.insurance, currency, usdTry, { compact: true })} source="%1 CAPEX, inşaat dönemi all-risk" />
        <Row label="Beklenmeyen" value={formatMoney(config.capex.contingency, currency, usdTry, { compact: true })} source="%4 CAPEX contingency reserve" />
        {config.capex.battery > 0 && (
          <Row label="Batarya" value={formatMoney(config.capex.battery, currency, usdTry, { compact: true })} source="LFP kapasite × birim fiyat + PCS + BoS" />
        )}
        <Row label="TOPLAM CAPEX" value={formatMoney(result.finance.totalCapexTl, currency, usdTry, { compact: true })} source={`= ${(result.finance.totalCapexTl / (config.pv.peakPowerKwp * 1000 * usdTry)).toFixed(2)} USD/Wp · ${formatMoney(result.finance.totalCapexTl / config.pv.peakPowerKwp, currency, usdTry, { compact: false })} per kWp`} bold />
      </Section>

      <Section title="7. OPEX (İşletme Gideri)" sourceNote="Yıllık enflasyonla artar (TR TÜFE)">
        <Row label="O&M (bakım)" value={`${config.opex.omTlPerKwpYear} TL/kWp/yıl`} source="Saha tipi ve büyüklüğe göre 80-150 TL/kWp/yıl piyasa ortalaması" />
        <Row label="İşletme Sigortası" value={`%${(config.opex.insurancePctCapex * 100).toFixed(2)} CAPEX/yıl`} source="All-risk + üçüncü şahıs sigortası" />
        <Row label="İnvertör Değişimi" value={`%${(config.opex.inverterReplacementPctCapex * 100).toFixed(0)} CAPEX (yıl ${config.opex.inverterReplacementYear})`} source="Tek seferlik invertör tam değişimi" />
        <Row label="Yedek Parça" value={formatMoney(config.opex.spareParts, currency, usdTry, { compact: true })} source="MC4 konnektör, kablo, sigorta vb." />
        <Row label="Güvenlik" value={formatMoney(config.opex.security, currency, usdTry, { compact: true })} source="Yalnızca arazi projeleri" />
        <Row label="Sistem Kullanım Bedeli" value={`${config.opex.systemUsageTlKwh.toFixed(3)} TL/kWh`} source="EPDK lisanssız sistem kullanım bedeli" />
        <Row label="Yönetim & Muhasebe" value={formatMoney(config.opex.managementFees, currency, usdTry, { compact: true })} source="Asset manager + mali müşavir + danışmanlık" />
      </Section>

      <Section title="8. Finansman" sourceNote="Banka kredi koşulları · Sponsor öz sermayesi">
        <Row label="Finansman tipi" value={config.financing.type === 'equity' ? '%100 Öz Sermaye' : config.financing.type === 'loan' ? 'Banka Kredisi + Öz Sermaye' : 'Leasing'} source="Sponsor kararı" />
        {config.financing.type === 'loan' && (
          <>
            <Row label="Öz sermaye payı" value={`%${((config.financing.equityPct ?? 0.3) * 100).toFixed(0)}`} source="Banka minimum %30 talebi" />
            <Row label="Vade" value={`${config.financing.loanTermYears} yıl`} source="Genelde 7-10 yıl, PPA süresinin %85'i" />
            <Row label="TL Faiz" value={`%${config.financing.interestRatePctTl}`} source="Türk bankalarının yenilenebilir proje finansman faizi (2026 piyasa)" />
            <Row label="Geri ödeme tipi" value={config.financing.repaymentType === 'annuity' ? 'Annuity (eşit taksit)' : 'Equal Principal (eşit anapara)'} source="Sponsor seçimi" />
          </>
        )}
        <Row label="WACC / İskonto Oranı" value={`%${config.financing.discountRatePct}`} source="Sermaye maliyeti — risksiz oran + risk primi + ülke primi" />
        <Row label="Analiz süresi" value={`${config.analysisYears} yıl`} source="Tipik 25 yıl (panel garantisi)" />
      </Section>

      <Section title="9. Vergi" sourceNote="5520 sayılı KVK · 3065 sayılı KDV Kanunu">
        <Row label="Kurumlar vergisi" value={`%${(config.tax.corporateTaxPct * 100).toFixed(0)}`} source="2026 yılı KVK %25" />
        <Row label="Amortisman süresi" value={`${config.tax.amortizationYears} yıl`} source="GES için tipik 10 yıl doğrusal" />
        <Row label="KDV" value={`%${(config.tax.vatPct * 100).toFixed(0)}`} source="3065 KDV Kanunu" />
        <Row label="KDV İadesi" value={config.tax.vatRefundEnabled ? 'Aktif (5746)' : 'Pasif'} source="5746 sayılı Ar-Ge ve Tasarım Faaliyetleri Kanunu kapsamında" />
        <Row label="Yatırım Teşvik" value={config.tax.investmentIncentiveEnabled ? `Bölge ${config.tax.incentiveRegion} (%${(config.tax.incentiveCorpTaxReductionPct * 100).toFixed(0)} vergi indirimi)` : 'Yok'} source="6745 sayılı Yatırım Teşvik Kanunu" />
      </Section>

      <Section title="10. Makroekonomik Varsayımlar" sourceNote="TÜİK · TCMB · Fed">
        <Row label="USD/TL kuru (bugün)" value={usdTry.toFixed(2)} source="TCMB döviz alış kuru" />
        <Row label="TR enflasyon" value={`%${config.fx.trInflationPct}/yıl`} source="TCMB Enflasyon Raporu (Ocak 2026) orta tahmin %28 · Piyasa konsensüsü %30-32" />
        <Row label="US enflasyon" value={`%${config.fx.usInflationPct}/yıl`} source="Fed uzun vadeli hedefi %2.0-2.5" />
        <Row label="Kur projeksiyon modeli" value={config.fx.fxProjection === 'ppp' ? 'PPP (Satın Alma Gücü Paritesi)' : 'Sabit kur'} source="Kur = mevcut × (1+TR_enf)/(1+US_enf)^t" />
      </Section>

      <Section title="11. Monte Carlo Risk Analizi" sourceNote="Belirsiz değişkenlerin stokastik modellemesi">
        <Row label="İterasyon sayısı" value={config.monteCarlo.iterations.toLocaleString('tr-TR')} source="Yakınsama için 1000+ iterasyon" />
        <Row label="Üretim σ" value={`±%${(config.monteCarlo.generationSigmaPct * 100).toFixed(0)}`} source="Yıllık güneşlenmeklik varyasyonu (PVGIS uzun dönem analizi)" />
        <Row label="Tüketim büyüme σ" value={`±%${config.monteCarlo.consumptionGrowthSigmaPct * 100}`} source="Kullanıcı belirsizlik tahmini" />
        <Row label="Elektrik enflasyonu (üçgensel)" value={`min %${(config.monteCarlo.electricityInflationTriangular[0] * 100).toFixed(0)} · mode %${(config.monteCarlo.electricityInflationTriangular[1] * 100).toFixed(0)} · max %${(config.monteCarlo.electricityInflationTriangular[2] * 100).toFixed(0)}`} source="EPDK tarife belirsizliği aralığı" />
        <Row label="USD/TL volatilite" value={`σ = %${(config.monteCarlo.fxAnnualVolPct * 100).toFixed(0)}/yıl`} source="GBM (Geometric Brownian Motion); TCMB yıllık historic vol" />
        <Row label="Panel degradasyon σ" value={`±%${(config.monteCarlo.degradationSigmaPct * 100).toFixed(2)}`} source="Üretici garanti aralığı" />
        <Row label="CAPEX aşımı (üçgensel)" value={`min ${(config.monteCarlo.capexOverrunTriangular[0] * 100).toFixed(0)}% · max +${(config.monteCarlo.capexOverrunTriangular[2] * 100).toFixed(0)}%`} source="İnşaat dönemi maliyet aşımı tahmini" />
      </Section>

      <Section title="12. Hesaplama Metodolojisi" sourceNote="EPDK + uluslararası proje finansmanı standartları">
        <MethodPara title="Saatlik Mahsuplaşma Algoritması (EPDK Karar 14531)">
          Her saat için <code className="bg-secondary px-1.5 py-0.5 rounded">netted[h] = min(üretim[h], tüketim[h])</code>.
          Net şebeke tüketimi: <code className="bg-secondary px-1.5 py-0.5 rounded">max(0, tüketim − üretim)</code>.
          Fazla üretim: <code className="bg-secondary px-1.5 py-0.5 rounded">max(0, üretim − tüketim)</code>.
          Yıllık bedelli limit: önceki yıl tüketimi × 2. Limit aşıldığında fazla üretim YEKDEM\'e bedelsiz aktarılır.
          Mahsuplaşma limit aşımı sonrası devam eder (Tablo 3 dipnotu).
        </MethodPara>

        <MethodPara title="Saatlik Üretim — PVGIS-SARAH3">
          Avrupa Komisyonu açık verisi; uydu radyasyon ölçümü (Meteosat 2nd generation, SARAH-3 v3.3.0).
          Türkiye için ~5 km grid çözünürlüğü. PV sistemi simülasyonu: panel verimi + sıcaklık katsayısı + invertör verimi + sistem kayıpları (default %14).
          Yıl N üretimi: <code className="bg-secondary px-1.5 py-0.5 rounded">gen × (1 − LID) × (1 − degradasyon)^(N−1)</code>.
        </MethodPara>

        <MethodPara title="Finansal Metrikler">
          <strong>NPV</strong>: Σ FCFC<sub>t</sub> / (1+r)<sup>t</sup> − CAPEX. Negatifse proje değer yaratmaz.<br />
          <strong>IRR</strong>: NPV = 0 olan iskonto oranı. WACC&apos;dan büyükse proje değerli.<br />
          <strong>LCOE</strong>: Σ (CAPEX + OPEX) iskontolanmış / Σ üretim iskontolanmış. Tarife alış fiyatından düşükse rekabetçi.<br />
          <strong>FCFC Payback</strong>: Kümülatif FCFC&apos;nin sıfırı geçtiği yıl. Proje düzeyinde geri ödeme.<br />
          <strong>FCFE Payback</strong>: Öz sermaye düzeyinde geri ödeme.<br />
          <strong>DSCR</strong>: CFADS / (Faiz + Anapara). Banka minimum 1.20-1.30 talep eder.
        </MethodPara>

        <MethodPara title="Para Birimi Dönüşümü">
          Tüm hesaplamalar TL bazında yapılır; gösterim USD&apos;ye dönüştürülürken <code className="bg-secondary px-1.5 py-0.5 rounded">USD = TL / {usdTry.toFixed(2)}</code> kullanılır.
          Banka raporlarında USD esas alınır (uluslararası standart). Yerel sponsor için TL toggle\'ı mevcuttur.
        </MethodPara>

        <MethodPara title="Monte Carlo">
          1000+ iterasyon. Her iterasyonda 9 stokastik değişkenden örnek çekilip projeksiyon yeniden hesaplanır.
          Dağılımlar: Normal (üretim, tüketim, O&M), Üçgensel (enflasyon, CAPEX aşımı), GBM (kur), Lognormal (batarya çevrim ömrü).
          Çıktı: IRR/NPV/payback dağılımları + P10/P50/P90 + tornado.
        </MethodPara>
      </Section>

      <Section title="13. Yasal Dayanak" sourceNote="">
        <BulletPoint>EPDK Kurul Kararı No: 14531 (30.04.2026), R.G. 02.04.2026 / 33212 — Lisanssız Elektrik Üretimi 1 Nolu Açıklama (saatlik mahsuplaşma)</BulletPoint>
        <BulletPoint>EPDK Kurul Kararı No: 14461 (02.04.2026), R.G. 04.04.2026 — 2026 elektrik tarifeleri</BulletPoint>
        <BulletPoint>EPDK Kararı 30.10.2025 — Son Kaynak Tedarik Tarifesi (SKTT) limitleri 2026</BulletPoint>
        <BulletPoint>5520 sayılı Kurumlar Vergisi Kanunu</BulletPoint>
        <BulletPoint>3065 sayılı KDV Kanunu</BulletPoint>
        <BulletPoint>5746 sayılı Ar-Ge ve Tasarım Faaliyetleri Kanunu</BulletPoint>
        <BulletPoint>6745 sayılı Yatırım Teşvik Kanunu</BulletPoint>
      </Section>

      <div className="bg-secondary/40 rounded-xl border border-border/60 p-5 text-xs text-muted-foreground leading-relaxed">
        <strong>Disclaimer:</strong> Bu rapor mevcut EPDK tarife, vergi ve yönetmelik koşullarına dayanır. Geleceğe ilişkin tahminler
        Türkiye Cumhuriyet Merkez Bankası, TÜİK, EPDK ve uluslararası kuruluşların yayımladığı verilere göre yapılmıştır.
        Yatırım kararı vermeden önce yetkili enerji uzmanlarına ve mali müşavire danışılması önerilir.
        GES-Fizibilite Pro, sonuçların kesinliği konusunda yasal sorumluluk kabul etmez.
      </div>
    </div>
  );
}

function Section({ title, sourceNote, sourceNoteValue, children }: { title: string; sourceNote?: string; sourceNoteValue?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {sourceNote && (
          <CardDescription className="text-[11px]">
            <em>Kaynak: {sourceNote}{sourceNoteValue && <span className="font-mono ml-1">{sourceNoteValue}</span>}</em>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/40">{children}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, source, bold = false }: { label: string; value: string; source: string; bold?: boolean }) {
  return (
    <div className={`grid grid-cols-12 gap-3 py-2 text-sm ${bold ? 'font-bold' : ''}`}>
      <div className="col-span-3 text-foreground/80">{label}</div>
      <div className="col-span-3 font-mono whitespace-nowrap">{value}</div>
      <div className="col-span-6 text-xs text-muted-foreground italic">{source}</div>
    </div>
  );
}

function MethodPara({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="font-semibold text-sm mb-1.5">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function BulletPoint({ children }: { children: React.ReactNode }) {
  return <div className="py-1.5 text-xs flex gap-2"><span className="text-primary">▸</span><span>{children}</span></div>;
}
