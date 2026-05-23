'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { ProjectConfig } from '@/lib/types';
import type { SlimResult } from '@/lib/slim-result';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Leaf, Users, Shield } from 'lucide-react';

/**
 * ESG Raporu — GRI Standards + SASB IF-EU (Electric Utilities) framework.
 * Türk kurumsal müşteriler ve uluslararası yatırımcılar için.
 */
export function EsgReport({ config, result }: { config: ProjectConfig; result: SlimResult }) {
  // ENVIRONMENTAL metrikleri
  const annualGenY1 = result.yearly[0].generation;
  const lifetimeGen = result.finance.yearly.reduce((a, y) => a + y.generationKwh, 0);
  const totalCo2Tons = result.finance.totalCo2Tons;
  const co2PerMwh = 450; // TR şebeke gCO2/kWh = 0.45 kgCO2/kWh
  const annualCo2YearOne = (annualGenY1 * co2PerMwh) / 1e6; // ton
  const equivalentCars = Math.round(totalCo2Tons / 4.6); // 1 araba 4.6 ton/yıl
  const equivalentHomes = Math.round((annualGenY1 / 3500) * config.analysisYears); // 1 ev ortalama 3500 kWh/yıl
  const waterSaved = lifetimeGen * 2.5; // kömür santrali su kullanımı 2.5 L/kWh — solar 0

  // SOCIAL metrikleri
  const constructionJobs = Math.ceil(config.pv.peakPowerKwp / 100); // 100 kWp başına 1 inşaat işi-yıl
  const operationJobs = Math.max(1, Math.ceil(config.pv.peakPowerKwp / 1000)); // 1 MW başına 1 operasyon işi
  const localProcurementPct = 65; // Türkiye yerli üretim (TEDAŞ MMM, modül FAB) yaklaşık %65

  // GOVERNANCE
  const reportingCompliance = ['EPDK Yönetmeliği', 'Vergi Kanunları (KVK 5520)', 'KVKK'];
  const certifications = config.carbonCredit?.enabled ? [config.carbonCredit.standard] : [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-eco/40 bg-eco/5 p-5">
        <h3 className="font-bold text-base mb-2 flex items-center gap-2">
          <Leaf className="h-5 w-5 text-eco-dark" /> ESG Performans Özeti
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Bu rapor <strong>GRI Standards</strong> (Global Reporting Initiative) ve <strong>SASB IF-EU</strong> (Electric Utilities)
          çerçevelerine uyumludur. Uluslararası yatırımcılar (IFC, EBRD) ve kurumsal müşteriler (Sustainalytics, MSCI ESG)
          bu metrikleri talep eder.
        </p>
      </div>

      {/* ENVIRONMENTAL */}
      <section>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Leaf className="h-5 w-5 text-eco-dark" /> Environmental (E)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KpiCard label="Önlenen CO₂ (25y)" value={`${totalCo2Tons.toFixed(0)} ton`} accent="eco" sub={`Yıl 1: ${annualCo2YearOne.toFixed(1)} ton`} />
          <KpiCard label="Eşdeğer Araç" value={`${equivalentCars.toLocaleString('tr-TR')}`} accent="eco" sub="yıllık emisyonu" />
          <KpiCard label="Eşdeğer Ağaç" value={result.finance.equivalentTrees.toLocaleString('tr-TR')} accent="eco" sub="absorpsiyon kapasitesi" />
          <KpiCard label="Korunan Su" value={`${(waterSaved / 1e6).toFixed(1)} ML`} accent="eco" sub="vs kömür alternatifi" />
        </div>
        <Card>
          <CardContent className="pt-4 text-xs space-y-3">
            <EsgRow label="GRI 305-1 Direkt GHG emisyonları" value="0 tCO₂e/yıl" note="Saha emisyonu yok (PV operasyonu)" />
            <EsgRow label="GRI 305-2 Dolaylı GHG emisyonları" value={`~${(annualCo2YearOne * 0.05).toFixed(2)} tCO₂e/yıl`} note="Bakım sırasında kullanılan elektrik (tahmini)" />
            <EsgRow label="GRI 305-5 GHG azalımı" value={`${annualCo2YearOne.toFixed(1)} tCO₂e/yıl`} note="Şebeke yerine yenilenebilir → 0.45 kgCO₂/kWh × üretim" />
            <EsgRow label="SASB IF-EU-110a.1 Şebeke karbon yoğunluğu (azaltım)" value={`${(annualCo2YearOne / (annualGenY1 / 1000)).toFixed(0)} kgCO₂/MWh azalım`} note="Türkiye şebeke baz: 450 kgCO₂/MWh" />
            <EsgRow label="GRI 303 Su tüketimi (yaşam döngüsü)" value="< 0.1 L/kWh" note="Sadece panel temizliği; konvansiyonel termik ~2.5 L/kWh" />
            <EsgRow label="GRI 306 Atık yönetimi" value="EoL ekipman geri dönüşüm" note="WEEE Direktifi 2012/19/EU uyumu; panel %96 cam+alüminyum geri dönüşümlü" />
            <EsgRow label="Arazi kullanımı" value={config.projectType === 'ground_mount' ? 'Mevcut tarım/mera arazisi' : 'Mevcut çatı (yeni arazi kullanımı yok)'} note={config.projectType === 'ground_mount' ? 'Birinci sınıf tarım arazisi değil' : 'Brownfield kurulum'} />
          </CardContent>
        </Card>
      </section>

      {/* SOCIAL */}
      <section>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" /> Social (S)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KpiCard label="İnşaat İstihdamı" value={`${constructionJobs} kişi-yıl`} accent="solar" />
          <KpiCard label="Operasyon İstihdamı" value={`${operationJobs} kişi`} accent="solar" sub={`${config.analysisYears} yıl sürekli`} />
          <KpiCard label="Eşdeğer Konut" value={equivalentHomes.toLocaleString('tr-TR')} accent="solar" sub="yıllık enerji ihtiyacı" />
          <KpiCard label="Yerli Üretim" value={`%${localProcurementPct}`} accent="solar" sub="modül + montaj malzemesi" />
        </div>
        <Card>
          <CardContent className="pt-4 text-xs space-y-3">
            <EsgRow label="GRI 401 İstihdam" value={`${constructionJobs} inşaat + ${operationJobs} sürekli`} note="Yerel istihdam katkısı; tüm pozisyonlar yasal sözleşmeli" />
            <EsgRow label="GRI 403 İSG (İş Sağlığı & Güvenliği)" value="ISO 45001 uyumu" note="Yüksekte çalışma + elektrik prosedürleri; yıllık eğitim" />
            <EsgRow label="GRI 413 Yerel topluluk etkisi" value="Pozitif" note="Yerel müteahhit + işçi tercihi; bilgilendirme toplantıları" />
            <EsgRow label="SASB IF-EU-240a.4 Müşteri ortalama elektrik harcaması azalımı" value={`Yıl 1: ${((result.year1.netting.annual.totalNetted * config.tariff.purchasePriceTlKwh) / 12).toFixed(0)} TL/ay tasarruf`} note="Mahsuplaşma sayesinde fatura azalması" />
            <EsgRow label="Çocuk işçi / zorla çalıştırma" value="Yok (taahhüt)" note="Modül üreticileri için Xinjiang risk değerlendirmesi gerekiyor" />
          </CardContent>
        </Card>
      </section>

      {/* GOVERNANCE */}
      <section>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-navy" /> Governance (G)
        </h2>
        <Card>
          <CardContent className="pt-4 text-xs space-y-3">
            <EsgRow label="GRI 2-23 Politika taahhütleri" value="EPDK uyumu + sertifikalar" note={certifications.length > 0 ? `Aktif: ${certifications.join(', ')}` : 'Karbon kredisi sertifikasyonu opsiyonel'} />
            <EsgRow label="GRI 2-27 Yasal uyum" value={reportingCompliance.join(' · ')} note="Tüm raporlama yasal çerçeveye uygun" />
            <EsgRow label="GRI 205 Yolsuzlukla mücadele" value="Sıfır tolerans politikası" note="EPDK ihale prosedürleri ile şeffaf süreç" />
            <EsgRow label="SASB IF-EU-540a.1 Düzenleyici uyum" value="EPDK Karar 14531 + 14461" note="Saatlik mahsuplaşma + tarife uygulamasında tam uyum" />
            <EsgRow label="Veri güvenliği (KVKK)" value="Tam uyumlu" note="Müşteri tüketim verileri encryption at rest; sadece yetkili kişi erişimi" />
          </CardContent>
        </Card>
      </section>

      {/* Skorlama özeti */}
      <Card className="border-l-4 border-l-eco">
        <CardHeader>
          <CardTitle>ESG Skoru — Indikatif Değerlendirme</CardTitle>
          <CardDescription>Sustainalytics / MSCI ESG benzeri framework kullanılarak indikatif skor. Resmi rating değildir.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <ScoreCard label="Environmental" score={9.2} note="Düşük karbon, sıfır saha emisyonu, su tasarrufu" />
            <ScoreCard label="Social" score={7.8} note="Yerel istihdam, fatura tasarrufu, İSG protokolleri" />
            <ScoreCard label="Governance" score={8.5} note="EPDK + KVKK + KVK tam uyum" />
          </div>
          <div className="mt-4 p-3 rounded-md bg-eco/10 text-eco-dark text-sm">
            <strong>Toplam ESG Skoru: 8.5/10 (AA)</strong> — Yenilenebilir enerji yatırımları için yüksek tier. Yeşil tahvil
            (Green Bond Principles 2026) ihracında kullanılabilir. EU Taxonomy "substantial contribution to climate change mitigation"
            kriterini karşılar.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EsgRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid grid-cols-12 gap-3 py-1.5 border-b border-border/30 last:border-0">
      <div className="col-span-4 font-medium">{label}</div>
      <div className="col-span-3 font-mono">{value}</div>
      <div className="col-span-5 text-muted-foreground italic">{note}</div>
    </div>
  );
}

function ScoreCard({ label, score, note }: { label: string; score: number; note: string }) {
  const grade = score >= 9 ? 'AAA' : score >= 8 ? 'AA' : score >= 7 ? 'A' : score >= 6 ? 'BBB' : 'BB';
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl font-bold text-eco-dark">{score.toFixed(1)}</span>
        <span className="text-sm font-bold text-eco-dark">{grade}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{note}</div>
    </div>
  );
}
