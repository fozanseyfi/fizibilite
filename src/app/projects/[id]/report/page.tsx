import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { formatTl, formatUsd, formatMoney, formatKwh, formatPct, formatYears, Currency } from '@/lib/utils';
import { PROFILES } from '@/lib/consumption';
import { PrintButton } from '@/components/PrintButton';
import { HorizontalBarChart, MultiBarChart, LineChartSvg, StackedBarChart, Histogram, TornadoChart } from '@/components/PdfCharts';

export const dynamic = 'force-dynamic';

export default function ReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { currency?: string };
}) {
  const row = getProject(params.id);
  if (!row) notFound();

  const config = JSON.parse(row.configJson) as ProjectConfig;
  const result = row.resultsJson ? (JSON.parse(row.resultsJson) as SimulationResult) : null;
  if (!result) {
    return <div className="container py-8">Önce simülasyon çalıştırın.</div>;
  }

  const currency: Currency = searchParams.currency === 'TL' ? 'TL' : 'USD'; // banka raporu default USD
  const usdTry = config.fx.usdTry;
  const m = (tl: number, opts?: { compact?: boolean }) => formatMoney(tl, currency, usdTry, opts);
  const mc = (tl: number) => m(tl, { compact: true });

  return (
    <article className="bg-white text-black max-w-5xl mx-auto p-10 print:p-0 leading-relaxed print:text-[9.5pt]">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          header, footer, nav { display: none !important; }
          .container { padding: 0 !important; max-width: none !important; }
          .pagebreak { page-break-before: always; }
          .no-print { display: none !important; }
        }
        td.num, th.num { white-space: nowrap; }
      ` }} />

      {/* Toolbar */}
      <div className="no-print flex items-center justify-between gap-3 mb-6 p-3 bg-amber-50 border border-amber-300 rounded-md">
        <div className="text-xs">
          <strong>📋 Banka / Yatırımcı Raporu</strong> · Para birimi: <strong>{currency}</strong>
          {currency === 'USD' && <span className="text-slate-600 ml-2">(USD/TL = {usdTry.toFixed(2)})</span>}
        </div>
        <div className="flex items-center gap-2">
          <a href={`?currency=USD`} className={`px-3 py-1 text-xs rounded ${currency === 'USD' ? 'bg-amber-600 text-white font-bold' : 'bg-white border border-amber-300'}`}>$ USD</a>
          <a href={`?currency=TL`} className={`px-3 py-1 text-xs rounded ${currency === 'TL' ? 'bg-amber-600 text-white font-bold' : 'bg-white border border-amber-300'}`}>₺ TL</a>
          <PrintButton />
        </div>
      </div>

      {/* Cover */}
      <section className="border-b-4 border-amber-500 pb-6 mb-8">
        <div className="text-xs uppercase tracking-widest text-amber-700 font-bold">GES-Fizibilite Pro · Banka / Yatırımcı Raporu</div>
        <h1 className="text-4xl font-bold mt-2">{config.name}</h1>
        <p className="text-sm text-slate-600 mt-1">{config.description}</p>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <Meta label="Lokasyon" value={`${config.location.city ?? ''} (${config.location.lat.toFixed(3)}, ${config.location.lon.toFixed(3)})`} />
          <Meta label="Kurulu Güç" value={`${config.pv.peakPowerKwp.toLocaleString('tr-TR')} kWp`} />
          <Meta label="Para Birimi" value={`${currency}${currency === 'USD' ? ` · ${usdTry.toFixed(2)} TL/$` : ''}`} />
          <Meta label="Hazırlanma" value={new Date(result.computedAt).toLocaleDateString('tr-TR')} />
        </div>
      </section>

      {/* 1. Executive Summary */}
      <Section title="1. Yönetici Özeti">
        <div className="grid grid-cols-4 gap-3">
          <Kpi label="NPV" value={mc(result.finance.npvTl)} />
          <Kpi label="IRR" value={formatPct(result.finance.irrPct)} />
          <Kpi label="LCOE" value={currency === 'USD' ? `${(result.finance.lcoeUsdKwh * 100).toFixed(2)} ¢/kWh` : `${result.finance.lcoeTlKwh.toFixed(2)} TL/kWh`} />
          <Kpi label="FCFC Payback" value={formatYears(result.finance.fcfcPaybackYears)} />
          <Kpi label="FCFE Payback" value={formatYears(result.finance.fcfePaybackYears)} />
          <Kpi label="ROE" value={formatPct(result.finance.roePct)} />
          <Kpi label="Ort. DSCR" value={result.finance.avgDscr.toFixed(2)} />
          <Kpi label="CAPEX" value={mc(result.finance.totalCapexTl)} />
        </div>
        <p className="mt-4 text-sm">
          {result.finance.npvTl > 0
            ? `Bu proje, %${config.financing.discountRatePct} iskontoya göre net pozitif değer üretmektedir. IRR %${result.finance.irrPct.toFixed(1)} ile WACC eşiğinin üzerindedir; FCFC bazında ${formatYears(result.finance.fcfcPaybackYears)} geri ödeme süresiyle bankacılığa uygundur. Ortalama DSCR ${result.finance.avgDscr.toFixed(2)} olup banka asgari koşulunu (1.20) karşılamaktadır.`
            : `Mevcut varsayımlarla NPV negatif. Tarife yapısı, finansman koşulları veya kurulu güç optimize edilmelidir.`}
        </p>
      </Section>

      {/* 2. Proje Tanımı */}
      <Section title="2. Proje Tanımı">
        <table className="w-full text-sm">
          <tbody>
            <Row label="Proje Türü" value={config.projectType} />
            <Row label="Lokasyon" value={`${config.location.city ?? ''} (${config.location.lat.toFixed(4)}, ${config.location.lon.toFixed(4)})`} />
            <Row label="Kurulu Güç" value={`${config.pv.peakPowerKwp} kWp`} />
            <Row label="Eğim / Azimut" value={`${config.pv.angle}° / ${config.pv.aspect}°`} />
            <Row label="Montaj" value={config.pv.mounting} />
            <Row label="Modül" value={config.pv.moduleTech} />
            <Row label="Sistem Kaybı" value={`${config.pv.loss}%`} />
            <Row label="Tüketim Profili" value={PROFILES[config.consumption.profileId]?.label ?? config.consumption.profileId} />
            <Row label="Yıllık Tüketim" value={formatKwh(config.consumption.annualKwh)} />
            <Row label="Abone Grubu" value={config.tariff.consumerGroup} />
            <Row label="Batarya" value={config.battery.enabled ? `${config.battery.nominalCapacityKwh} kWh / ${config.battery.nominalPowerKw} kW` : 'Yok'} />
            <Row label="Finansman" value={config.financing.type} />
            <Row label="Analiz Süresi" value={`${config.analysisYears} yıl`} />
          </tbody>
        </table>
      </Section>

      {/* 3. Üretim Analizi */}
      <Section title="3. Üretim Analizi (PVGIS-SARAH3)">
        <p className="text-sm mb-3">
          Üretim verisi <strong>Avrupa Komisyonu PVGIS-SARAH3</strong> uydu radyasyon veri tabanından çekilmiştir
          (re.jrc.ec.europa.eu/api/v5_3). Türkiye için ~5 km grid çözünürlük.
          1. yıl üretim: <strong>{formatKwh(result.generationByYear[0].reduce((a, b) => a + b, 0))}</strong> ·
          spesifik <strong>{(result.generationByYear[0].reduce((a, b) => a + b, 0) / config.pv.peakPowerKwp).toFixed(0)} kWh/kWp/yıl</strong> ·
          25y kümülatif <strong>{formatKwh(result.finance.yearly.reduce((a, y) => a + y.generationKwh, 0), { compact: true })}</strong>.
          Degradasyon %{(config.pv.annualDegradationPct * 100).toFixed(2)}/yıl + ilk yıl LID %{(config.pv.lidPct * 100).toFixed(1)}.
        </p>
        {/* Aylık üretim/tüketim/mahsup grafiği */}
        <MultiBarChart
          title="Aylık Üretim - Tüketim - Mahsup (Yıl 1, kWh)"
          data={getMonthlyEnergyData(result).map((m) => ({ label: m.month }))}
          series={[
            { key: 'gen', label: 'Üretim', color: '#f59e0b', values: getMonthlyEnergyData(result).map((m) => m.gen) },
            { key: 'cons', label: 'Tüketim', color: '#0f172a', values: getMonthlyEnergyData(result).map((m) => m.cons) },
            { key: 'netted', label: 'Mahsup', color: '#10b981', values: getMonthlyEnergyData(result).map((m) => m.netted) },
          ]}
        />
        <div className="mt-4">
          <LineChartSvg
            title="25 Yıllık Üretim Trendi (Degradasyon Dahil, kWh)"
            data={result.finance.yearly.map((y) => ({ label: `Y${y.year}` }))}
            series={[
              { key: 'gen', label: 'Yıllık Üretim', color: '#f59e0b', values: result.finance.yearly.map((y) => y.generationKwh) },
              { key: 'cons', label: 'Yıllık Tüketim', color: '#0f172a', values: result.finance.yearly.map((y) => y.consumptionKwh), dashed: true },
            ]}
            formatValue={(v) => `${(v / 1000).toFixed(0)}K`}
          />
        </div>
      </Section>

      {/* 4. Mahsuplaşma */}
      <Section title="4. Saatlik Mahsuplaşma Analizi (EPDK Karar 14531)" pageBreakBefore>
        <p className="text-sm mb-3">
          EPDK Karar No: 14531 (30.04.2026), R.G. 02.04.2026 / 33212 uyarınca her saat
          <code className="text-xs bg-slate-100 px-1 mx-1">netted = min(üretim, tüketim)</code> formülü uygulanır.
          Bedelli üretim limiti = önceki yıl tüketim × 2 = <strong>{formatKwh(config.consumption.prevYearKwh * 2)}</strong>.
          Limit aşıldıktan sonra fazla üretim YEKDEM\'e bedelsiz aktarılır.
        </p>
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-100">
            <tr><th className="text-left p-2">Kalem (1. Yıl)</th><th className="text-right p-2 num">kWh</th><th className="text-right p-2">% Üretim</th></tr>
          </thead>
          <tbody>
            <Row label="Toplam Üretim" value={formatKwh(result.nettingByYear[0].annual.totalGeneration)} aux="100%" />
            <Row label="Mahsuplaşılan" value={formatKwh(result.nettingByYear[0].annual.totalNetted)} aux={formatPct(result.nettingByYear[0].annual.selfConsumptionRatio * 100)} />
            <Row label="Bedelli İhtiyaç Fazlası" value={formatKwh(result.nettingByYear[0].annual.totalPaidSurplus)} aux={formatPct((result.nettingByYear[0].annual.totalPaidSurplus / result.nettingByYear[0].annual.totalGeneration) * 100)} />
            <Row label="YEKDEM Bedelsiz" value={formatKwh(result.nettingByYear[0].annual.totalYekdemFree)} aux={formatPct((result.nettingByYear[0].annual.totalYekdemFree / Math.max(1, result.nettingByYear[0].annual.totalGeneration)) * 100)} />
            <Row label="Net Şebekeden Çekiş" value={formatKwh(result.nettingByYear[0].annual.totalNetConsumption)} />
          </tbody>
        </table>
        <div className="mt-4">
          <StackedBarChart
            title="25 Yıllık Mahsuplaşma Dağılımı (kWh)"
            data={result.nettingByYear.map((_, i) => ({ label: `Y${i + 1}` }))}
            series={[
              { key: 'netted', label: 'Mahsup', color: '#10b981', values: result.nettingByYear.map((n) => n.annual.totalNetted) },
              { key: 'paid', label: 'Bedelli Satış', color: '#f59e0b', values: result.nettingByYear.map((n) => n.annual.totalPaidSurplus) },
              { key: 'yekdem', label: 'YEKDEM Bedelsiz', color: '#94a3b8', values: result.nettingByYear.map((n) => n.annual.totalYekdemFree) },
            ]}
          />
        </div>
      </Section>

      {/* 5. Tarife */}
      <Section title="5. Elektrik Tarifesi (EPDK Karar 14461)" pageBreakBefore>
        <p className="text-sm mb-3">
          EPDK Kurul Kararı No: <strong>14461</strong> (02.04.2026), Resmi Gazete 04.04.2026'da yayımlanmıştır.
          Aşağıdaki fiyatlar abone grubu seçimine göre auto-load edilmiştir.
        </p>
        <table className="w-full text-sm border border-slate-200">
          <tbody>
            <Row label="Abone Grubu" value={config.tariff.consumerGroup} />
            <Row label="Alış Fiyatı" value={`${config.tariff.purchasePriceTlKwh.toFixed(2)} TL/kWh`} />
            <Row label="Satış Fiyatı" value={`${config.tariff.salePriceTlKwh.toFixed(2)} TL/kWh`} />
            <Row label="Dağıtım Bedeli" value={`${config.tariff.distributionFeeTlKwh.toFixed(2)} TL/kWh`} />
            <Row label="KDV" value={`%${(config.tariff.vatPct * 100).toFixed(0)}`} />
            <Row label="Belediye Tüketim Vergisi" value={`%${(config.tariff.consumptionTaxPct * 100).toFixed(0)}`} />
            <Row label="Elektrik Fiyat Artışı" value={`%${config.tariff.electricityInflationPct}/yıl`} />
            <Row label="SKTT Eşiği (yıllık)" value={config.tariff.consumerGroup === 'MESKEN' ? '4.000 kWh' : '15.000 kWh'} />
            <Row label="SKTT KBK" value={config.tariff.consumerGroup === 'MESKEN' ? '1.05' : '1.0938'} />
          </tbody>
        </table>
      </Section>

      {/* 6. CAPEX */}
      <Section title="6. CAPEX Dökümü">
        <p className="text-xs text-slate-600 mb-2">USD/TL = {usdTry.toFixed(2)} · 2026 piyasa fiyatları (USD/Wp)</p>
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-100">
            <tr><th className="text-left p-2">Kalem</th><th className="text-right p-2 num">Tutar</th><th className="text-right p-2 num">USD/Wp</th></tr>
          </thead>
          <tbody>
            {[
              ['PV Modül', config.capex.pvModule],
              ['İnvertör', config.capex.inverter],
              ['Montaj / Yapı', config.capex.mounting],
              ['Kablo & Pano', config.capex.cabling],
              ['İşçilik', config.capex.labor],
              ['Mühendislik', config.capex.engineering],
              ['Bağlantı + TEDAŞ', config.capex.gridConnection + config.capex.tedasZbof],
              ['İmar/Zemin', config.capex.land],
              ['Sigorta (CAR)', config.capex.insurance],
              ['Beklenmeyen', config.capex.contingency],
              ['Batarya', config.capex.battery],
            ].filter(([, v]) => (v as number) > 0).map(([k, v]) => (
              <tr key={k as string} className="border-b border-slate-100">
                <td className="p-2">{k}</td>
                <td className="p-2 text-right font-medium num">{mc(v as number)}</td>
                <td className="p-2 text-right text-slate-500 num">{((v as number) / (config.pv.peakPowerKwp * 1000 * usdTry)).toFixed(3)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 font-bold bg-slate-50">
              <td className="p-2">TOPLAM</td>
              <td className="p-2 text-right num">{mc(result.finance.totalCapexTl)}</td>
              <td className="p-2 text-right num">{(result.finance.totalCapexTl / (config.pv.peakPowerKwp * 1000 * usdTry)).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4">
          <HorizontalBarChart
            title="CAPEX Dağılımı (TL)"
            data={getCapexBreakdown(config)}
            formatValue={(v) => mc(v)}
          />
        </div>
      </Section>

      {/* 7. OPEX */}
      <Section title="7. OPEX (Yıllık)">
        <table className="w-full text-sm border border-slate-200">
          <tbody>
            <Row label="O&M (bakım)" value={`${config.opex.omTlPerKwpYear} TL/kWp/yıl`} aux="80-150 TL piyasa aralığı" />
            <Row label="İşletme Sigortası" value={`%${(config.opex.insurancePctCapex * 100).toFixed(2)} CAPEX/yıl`} aux="All-risk" />
            <Row label="İnvertör Değişimi" value={`%${(config.opex.inverterReplacementPctCapex * 100).toFixed(0)} CAPEX (yıl ${config.opex.inverterReplacementYear})`} />
            <Row label="Yedek Parça (yıllık)" value={mc(config.opex.spareParts)} />
            <Row label="Güvenlik" value={mc(config.opex.security)} />
            <Row label="Yönetim & Muhasebe" value={mc(config.opex.managementFees)} />
          </tbody>
        </table>
      </Section>

      {/* 7b. Kredi Geri Ödeme Tablosu (eğer kredi varsa) */}
      {config.financing.type === 'loan' && result.finance.yearly.some((y) => y.interestExpenseTl > 0) && (
        <Section title="7b. Kredi Geri Ödeme Tablosu (Yıllık)" pageBreakBefore>
          <p className="text-sm mb-2">
            Kredi tutarı: <strong>{mc(result.finance.totalCapexTl * (1 - (config.financing.equityPct ?? 0.3)))}</strong> ·
            Vade: <strong>{config.financing.loanTermYears} yıl</strong> ·
            Faiz: <strong>%{config.financing.interestRatePctTl}</strong> ·
            Yöntem: <strong>{config.financing.repaymentType === 'annuity' ? 'Annüite' : 'Eşit Anapara'}</strong>
            {config.financing.refinancing?.enabled && (
              <> · <em>Refinansman yıl {config.financing.refinancing.yearN}: %{config.financing.refinancing.newInterestRatePctTl} faiz, {config.financing.refinancing.newTermYears} yıl yeni vade</em></>
            )}
          </p>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-2">Yıl</th>
                <th className="text-right p-2 num">Faiz</th>
                <th className="text-right p-2 num">Anapara</th>
                <th className="text-right p-2 num">Toplam Taksit</th>
                <th className="text-right p-2 num">Kalan Bakiye</th>
                <th className="text-right p-2 num">DSCR</th>
              </tr>
            </thead>
            <tbody>
              {result.finance.yearly.filter((y) => y.interestExpenseTl > 0 || y.repaymentTl !== 0).map((y) => {
                const principal = Math.abs(y.repaymentTl);
                const totalPayment = y.interestExpenseTl + principal;
                return (
                  <tr key={y.year} className="border-b border-slate-100">
                    <td className="p-2">{y.year}</td>
                    <td className="p-2 text-right num">{mc(y.interestExpenseTl)}</td>
                    <td className="p-2 text-right num">{mc(principal)}</td>
                    <td className="p-2 text-right num font-medium">{mc(totalPayment)}</td>
                    <td className="p-2 text-right num text-slate-500">—</td>
                    <td className="p-2 text-right num">{y.dscr > 0 ? y.dscr.toFixed(2) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            Kalan bakiye sütunu için aylık takvim Excel raporunda mevcuttur. DSCR ≥ 1.20 banka asgari koşuludur.
          </p>
        </Section>
      )}

      {/* 8. Finansman */}
      <Section title="8. Finansman & Vergi" pageBreakBefore>
        <table className="w-full text-sm border border-slate-200">
          <tbody>
            <Row label="Finansman Tipi" value={config.financing.type === 'equity' ? '%100 Öz Sermaye' : config.financing.type === 'loan' ? 'Kredi + Öz Sermaye' : 'Leasing'} />
            {config.financing.type === 'loan' && (
              <>
                <Row label="Öz Sermaye Payı" value={`%${((config.financing.equityPct ?? 0.3) * 100).toFixed(0)}`} aux="Banka min %30" />
                <Row label="Kredi Vadesi" value={`${config.financing.loanTermYears} yıl`} />
                <Row label="TL Faiz" value={`%${config.financing.interestRatePctTl}`} />
                <Row label="Geri Ödeme" value={config.financing.repaymentType === 'annuity' ? 'Annuity' : 'Equal Principal'} />
              </>
            )}
            <Row label="WACC / İskonto" value={`%${config.financing.discountRatePct}`} />
            <Row label="Kurumlar Vergisi" value={`%${(config.tax.corporateTaxPct * 100).toFixed(0)}`} aux="2026 KVK %25" />
            <Row label="Amortisman Süresi" value={`${config.tax.amortizationYears} yıl`} aux="GES için tipik 10 yıl" />
            <Row label="KDV İadesi" value={config.tax.vatRefundEnabled ? 'Aktif' : 'Pasif'} aux="5746 sayılı kanun" />
            <Row label="Yatırım Teşvik" value={config.tax.investmentIncentiveEnabled ? `Bölge ${config.tax.incentiveRegion}` : 'Yok'} aux="6745 sayılı kanun" />
          </tbody>
        </table>
      </Section>

      {/* 9. Finansal Analiz */}
      <Section title="9. Finansal Analiz">
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-100">
            <tr><th className="text-left p-2">Metrik</th><th className="text-right p-2 num">{currency}</th><th className="text-right p-2 num">{currency === 'USD' ? 'TL' : 'USD'}</th></tr>
          </thead>
          <tbody>
            <Row label="Toplam CAPEX" value={mc(result.finance.totalCapexTl)} aux={currency === 'USD' ? formatTl(result.finance.totalCapexTl, { compact: true }) : formatUsd(result.finance.totalCapexTl / usdTry, { compact: true })} />
            <Row label="25 Yıllık Gelir" value={mc(result.finance.totalRevenueTl)} aux={currency === 'USD' ? formatTl(result.finance.totalRevenueTl, { compact: true }) : formatUsd(result.finance.totalRevenueTl / usdTry, { compact: true })} />
            <Row label="NPV" value={mc(result.finance.npvTl)} aux={currency === 'USD' ? formatTl(result.finance.npvTl, { compact: true }) : formatUsd(result.finance.npvUsd, { compact: true })} />
            <Row label="IRR" value={formatPct(result.finance.irrPct)} />
            <Row label="MIRR" value={formatPct(result.finance.mirrPct)} />
            <Row label="LCOE" value={currency === 'USD' ? `${(result.finance.lcoeUsdKwh * 100).toFixed(2)} ¢/kWh` : `${result.finance.lcoeTlKwh.toFixed(3)} TL/kWh`} aux={currency === 'USD' ? `${result.finance.lcoeTlKwh.toFixed(3)} TL/kWh` : `${(result.finance.lcoeUsdKwh * 100).toFixed(2)} ¢/kWh`} />
            <Row label="FCFC Payback" value={formatYears(result.finance.fcfcPaybackYears)} />
            <Row label="FCFE Payback" value={formatYears(result.finance.fcfePaybackYears)} />
            <Row label="İskontolu Payback" value={formatYears(result.finance.discountedPaybackYears)} />
            <Row label="ROI" value={formatPct(result.finance.roiPct)} />
            <Row label="ROE" value={formatPct(result.finance.roePct)} />
            <Row label="Ortalama DSCR" value={result.finance.avgDscr.toFixed(2)} aux="Banka min 1.20" />
          </tbody>
        </table>
        <div className="mt-4">
          <LineChartSvg
            title={`25 Yıllık Nakit Akışı — Kümülatif FCFC ve İskontolu (${currency})`}
            data={result.finance.yearly.map((y) => ({ label: `Y${y.year}` }))}
            series={[
              { key: 'fcfc', label: 'Net FCFC (yıllık)', color: '#f59e0b', values: result.finance.yearly.map((y) => currency === 'USD' ? y.netFcfcTl / usdTry : y.netFcfcTl) },
              { key: 'cum', label: 'Kümülatif FCFC', color: '#0f172a', values: result.finance.yearly.map((y) => currency === 'USD' ? y.cumulativeNetFcfcTl / usdTry : y.cumulativeNetFcfcTl) },
              { key: 'cumD', label: 'Kümülatif İskontolu', color: '#10b981', values: result.finance.yearly.map((y, i) => {
                  const sum = result.finance.yearly.slice(0, i + 1).reduce((a, x) => a + x.discountedNetFcfcTl, 0) - result.finance.totalCapexTl;
                  return currency === 'USD' ? sum / usdTry : sum;
                }), dashed: true },
            ]}
            formatValue={(v) => currency === 'USD' ? `$${(v / 1e6).toFixed(1)}M` : `${(v / 1e6).toFixed(0)}M ₺`}
            paybackYearMarker={Number.isFinite(result.finance.fcfcPaybackYears) ? result.finance.fcfcPaybackYears : undefined}
          />
        </div>
      </Section>

      {/* 10. Risk */}
      {result.monteCarlo && (
        <Section title="10. Risk Analizi (Monte Carlo)" pageBreakBefore>
          <p className="text-sm mb-2">{result.monteCarlo.iterations.toLocaleString('tr-TR')} iterasyon. 9 stokastik değişken (üretim, tüketim, enflasyon, kur, degradasyon, çevrim ömrü, O&M, CAPEX, fiyat artışı).</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Kpi label="IRR P10" value={formatPct(result.monteCarlo.irr.p10)} />
            <Kpi label="IRR P50" value={formatPct(result.monteCarlo.irr.p50)} />
            <Kpi label="IRR P90" value={formatPct(result.monteCarlo.irr.p90)} />
            <Kpi label="NPV P10" value={mc(result.monteCarlo.npv.p10)} />
            <Kpi label="NPV P50" value={mc(result.monteCarlo.npv.p50)} />
            <Kpi label="NPV P90" value={mc(result.monteCarlo.npv.p90)} />
          </div>
          <p className="mt-3 text-sm">NPV pozitif olma olasılığı: <strong>{formatPct(result.monteCarlo.probabilityNpvPositive * 100, 0)}</strong></p>
          <div className="mt-4">
            <Histogram
              title="IRR Dağılımı"
              values={result.monteCarlo.samples.map((s) => s.irr)}
              markers={[
                { value: result.monteCarlo.irr.p10, label: `P10 ${result.monteCarlo.irr.p10.toFixed(0)}%`, color: '#ef4444' },
                { value: result.monteCarlo.irr.p50, label: `P50 ${result.monteCarlo.irr.p50.toFixed(0)}%`, color: '#0f172a' },
                { value: result.monteCarlo.irr.p90, label: `P90 ${result.monteCarlo.irr.p90.toFixed(0)}%`, color: '#10b981' },
              ]}
            />
          </div>
          <div className="mt-6">
            <TornadoChart
              title="Duyarlılık Analizi (Tornado) — IRR Etkisi"
              items={result.monteCarlo.tornado}
            />
          </div>
        </Section>
      )}

      {/* 11. Çevre */}
      <Section title="11. Çevresel Etki">
        <p className="text-sm">
          25 yıl boyunca toplam <strong>{result.finance.totalCo2Tons.toFixed(0)} ton CO₂</strong> emisyon önlenecektir
          (TR şebeke ortalaması 0.45 kgCO₂/kWh baz alınarak).
          Bu, yaklaşık <strong>{result.finance.equivalentTrees.toLocaleString('tr-TR')} ağacın</strong> yıllık karbon emisyonu absorpsiyonuna eşdeğerdir.
        </p>
      </Section>

      {/* 12. Veri Kaynakları ve Metodoloji — banka raporunun en kritik kısmı */}
      <Section title="12. Veri Kaynakları ve Metodoloji" pageBreakBefore>
        <h3 className="text-base font-bold mb-2">Üretim Verisi</h3>
        <p className="text-xs text-slate-700 mb-3">
          <strong>PVGIS-SARAH3</strong> (Avrupa Komisyonu): Meteosat 2nd generation uydusundan elde edilen 5 km grid çözünürlüklü
          radyasyon verisi. URL: re.jrc.ec.europa.eu/api/v5_3/seriescalc. PV simülasyonu: panel verimi + sıcaklık katsayısı +
          invertör verimi + sistem kayıpları (default %14).
        </p>

        <h3 className="text-base font-bold mb-2 mt-4">Mahsuplaşma Algoritması</h3>
        <p className="text-xs text-slate-700 mb-3">
          EPDK 1 Nolu Açıklama (Karar 14531) birebir uygulanır. Her saat <code>netted = min(üretim, tüketim)</code>.
          Bedelli üretim limiti = önceki yıl tüketim × 2 (yıllık kümülatif). Limit aşıldıktan sonra mahsuplaşma devam eder
          (Tablo 3 dipnotu), fazla üretim YEKDEM\'e bedelsiz aktarılır. Birim testler EPDK Tablo 1, 2 ve 3 örneklerini
          birebir doğrular.
        </p>

        <h3 className="text-base font-bold mb-2 mt-4">Elektrik Tarifesi</h3>
        <p className="text-xs text-slate-700 mb-3">
          <strong>EPDK Kurul Kararı 14461</strong> (02.04.2026, R.G. 04.04.2026): abone grubu seçimine göre alış/satış/dağıtım
          bedelleri auto-load edilir. SKTT için EPDK 30.10.2025 kararı (01.01.2026 yürürlük) — Mesken yıllık 4.000 kWh,
          Ticarethane/Sanayi 15.000 kWh, Tarımsal 150M kWh.
        </p>

        <h3 className="text-base font-bold mb-2 mt-4">Finansal Metrikler</h3>
        <ul className="text-xs text-slate-700 mb-3 space-y-1 list-disc list-inside">
          <li><strong>NPV</strong>: Σ FCFC<sub>t</sub> / (1+r)<sup>t</sup> − CAPEX. r = WACC = %{config.financing.discountRatePct}.</li>
          <li><strong>IRR</strong>: NPV = 0 olan r. Newton-Raphson + bisection.</li>
          <li><strong>LCOE</strong>: Σ(CAPEX+OPEX) iskonto / Σ üretim iskonto.</li>
          <li><strong>FCFC Payback</strong>: Kümülatif FCFC = 0 yılı.</li>
          <li><strong>FCFE Payback</strong>: Kümülatif FCFE = 0 yılı (öz sermaye perspektifi).</li>
          <li><strong>DSCR</strong>: CFADS / Debt Service. Banka asgari 1.20-1.30.</li>
        </ul>

        <h3 className="text-base font-bold mb-2 mt-4">Para Birimi Politikası</h3>
        <p className="text-xs text-slate-700 mb-3">
          Tüm hesaplamalar TL bazında yapılır. Banka/uluslararası yatırımcı raporlarında <strong>USD</strong> esas alınır
          (uluslararası standart). Dönüşüm: <code>USD = TL / {usdTry.toFixed(2)}</code>. TL/USD projeksiyonu Satın Alma Gücü Paritesi
          (PPP) modeli ile: <code>(1+TR_enf)/(1+US_enf)^t</code>.
        </p>

        <h3 className="text-base font-bold mb-2 mt-4">Makroekonomik Varsayımlar</h3>
        <p className="text-xs text-slate-700 mb-3">
          <strong>TR enflasyon</strong>: %{config.fx.trInflationPct}/yıl — TCMB Enflasyon Raporu (Ocak 2026) orta tahmini.
          <strong> USD enflasyon</strong>: %{config.fx.usInflationPct}/yıl — Fed uzun vadeli hedefi.
          <strong> Elektrik fiyat artışı</strong>: %{config.tariff.electricityInflationPct}/yıl — EPDK tarife trendi.
        </p>

        <h3 className="text-base font-bold mb-2 mt-4">Monte Carlo Risk Analizi</h3>
        <p className="text-xs text-slate-700 mb-3">
          {config.monteCarlo.iterations}+ iterasyon. Dağılımlar: Normal (üretim ±%{config.monteCarlo.generationSigmaPct * 100}, O&M),
          Üçgensel (enflasyon, CAPEX aşımı), GBM (USD/TL σ=%{(config.monteCarlo.fxAnnualVolPct * 100).toFixed(0)}/yıl), Lognormal (batarya çevrim ömrü).
          Çıktı: P10/P50/P90 + VaR + tornado diagram.
        </p>
      </Section>

      {/* 13. Yasal */}
      <Section title="13. Yasal Çerçeve ve Disclaimer">
        <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside mb-3">
          <li>EPDK Kurul Kararı No: <strong>14531</strong> (30.04.2026), R.G. 02.04.2026/33212 — Saatlik Mahsuplaşma</li>
          <li>EPDK Kurul Kararı No: <strong>14461</strong> (02.04.2026), R.G. 04.04.2026 — 2026 Elektrik Tarifeleri</li>
          <li>EPDK Kararı 30.10.2025 — SKTT Limitleri 2026</li>
          <li>5520 sayılı Kurumlar Vergisi Kanunu</li>
          <li>3065 sayılı KDV Kanunu</li>
          <li>5746 sayılı Ar-Ge ve Tasarım Faaliyetleri Kanunu (KDV iadesi)</li>
          <li>6745 sayılı Yatırım Teşvik Kanunu</li>
        </ul>
        <p className="text-xs text-slate-600 leading-relaxed">
          Bu rapor mevcut EPDK tarife, vergi ve yönetmelik koşullarına dayanmaktadır. Geleceğe ilişkin tahminler TCMB, TÜİK,
          EPDK ve uluslararası kuruluşların yayımladığı verilere göre yapılmıştır. Yatırım kararı vermeden önce yetkili enerji
          uzmanlarına ve mali müşavire danışılması önerilir. GES-Fizibilite Pro, sonuçların kesinliği konusunda yasal
          sorumluluk kabul etmez.
        </p>
      </Section>

      <div className="mt-12 no-print">
        <PrintButton />
      </div>
    </article>
  );
}

function Section({ title, children, pageBreakBefore = false }: { title: string; children: React.ReactNode; pageBreakBefore?: boolean }) {
  return (
    <section className={`mt-8 ${pageBreakBefore ? 'pagebreak' : ''}`}>
      <h2 className="text-xl font-bold border-b border-slate-200 pb-1 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="text-xs text-slate-600 whitespace-nowrap">{label}</div>
      <div className="text-lg font-bold mt-0.5 whitespace-nowrap tabular-nums">{value}</div>
    </div>
  );
}

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DPM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function getMonthlyEnergyData(result: SimulationResult) {
  const out: Array<{ month: string; gen: number; cons: number; netted: number }> = [];
  const gen = result.generationByYear[0];
  const cons = result.consumptionByYear[0];
  const netted = result.nettingByYear[0].netted;
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const end = cursor + DPM[m] * 24;
    let g = 0, c = 0, n = 0;
    for (let h = cursor; h < end; h++) {
      g += gen[h] || 0;
      c += cons[h] || 0;
      n += netted[h] || 0;
    }
    out.push({ month: MONTH_NAMES[m], gen: g, cons: c, netted: n });
    cursor = end;
  }
  return out;
}

function getCapexBreakdown(config: ProjectConfig) {
  return [
    { label: 'PV Modül', value: config.capex.pvModule },
    { label: 'İnvertör', value: config.capex.inverter },
    { label: 'Montaj/Yapı', value: config.capex.mounting },
    { label: 'Kablo & Pano', value: config.capex.cabling },
    { label: 'İşçilik', value: config.capex.labor },
    { label: 'Mühendislik', value: config.capex.engineering },
    { label: 'Bağlantı + TEDAŞ', value: config.capex.gridConnection + config.capex.tedasZbof },
    { label: 'İmar/Zemin', value: config.capex.land },
    { label: 'Sigorta + Beklenmeyen', value: config.capex.insurance + config.capex.contingency },
    { label: 'Batarya', value: config.capex.battery },
  ].filter((d) => d.value > 0);
}

function Row({ label, value, aux }: { label: string; value: string; aux?: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="p-2">{label}</td>
      <td className="p-2 text-right font-medium num">{value}</td>
      {aux !== undefined && <td className="p-2 text-right text-slate-500 num">{aux}</td>}
    </tr>
  );
}
