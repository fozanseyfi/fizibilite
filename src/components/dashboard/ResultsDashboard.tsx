'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KpiCard } from './KpiCard';
import { HourDayHeatmap } from './Heatmap';
import { CurrencyToggle } from './CurrencyToggle';
import { AssumptionsTab } from './AssumptionsTab';
import { HourlyDataTable } from './HourlyDataTable';
import { LcoeComparison } from './LcoeComparison';
import { EsgReport } from './EsgReport';
import { MasterCheckBadge } from './MasterCheckBadge';
import { CoverageTab } from './CoverageTab';
import { ScenarioMatrixTab } from './ScenarioMatrixTab';
import { PnlExplainer, CashFlowExplainer, WaterfallExplainer, CoverageExplainer } from './TabExplainer';
import {
  CashFlowTable, INCOME_STATEMENT_ROWS, CASH_FLOW_STATEMENT_ROWS, CASH_WATERFALL_ROWS,
} from './CashFlowTable';
import { formatKwh, formatPct, formatYears, formatMoney, Currency } from '@/lib/utils';
import { ProjectConfig } from '@/lib/types';
import type { SlimResult } from '@/lib/slim-result';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { FileSpreadsheet, FileText, TrendingUp, Battery as BatteryIcon, AlertTriangle, Edit3, Download } from 'lucide-react';
import Link from 'next/link';
import { InfoTooltip, TOOLTIPS } from '@/components/ui/info-tooltip';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DPM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function ResultsDashboard({
  projectId,
  config,
  result,
}: {
  projectId: string;
  config: ProjectConfig;
  result: SlimResult;
}) {
  const [cfPeriod, setCfPeriod] = useState<'yearly' | 'monthly'>('yearly');
  const [currency, setCurrency] = useState<Currency>('USD'); // banka raporu default
  const usdTry = config.fx.usdTry;

  const monthly1Energy = useMemo(
    () => aggregateMonthlyEnergy(result.year1.generation, result.year1.consumption, result.year1.netting.netted, result.year1.netting.surplusGeneration),
    [result]
  );

  const fcfcByYear = useMemo(() => result.finance.yearly.map((y) => ({
    year: y.year,
    netFcfc: y.netFcfcTl,
    cumFcfc: y.cumulativeNetFcfcTl,
    cumDcfc: result.finance.yearly.slice(0, y.year).reduce((a, x) => a + x.discountedNetFcfcTl, -result.finance.totalCapexTl),
    revenue: y.salesRevenueTl,
  })), [result]);

  const capexData = useMemo(() => [
    { name: 'PV Modül', value: config.capex.pvModule },
    { name: 'İnvertör', value: config.capex.inverter },
    { name: 'Montaj', value: config.capex.mounting },
    { name: 'Kablo & Pano', value: config.capex.cabling },
    { name: 'İşçilik', value: config.capex.labor },
    { name: 'Mühendislik', value: config.capex.engineering },
    { name: 'Bağlantı', value: config.capex.gridConnection + config.capex.tedasZbof },
    { name: 'İmar/Zemin', value: config.capex.land },
    { name: 'Sigorta+Beklenmeyen', value: config.capex.insurance + config.capex.contingency },
    { name: 'Batarya', value: config.capex.battery },
  ].filter((d) => d.value > 0), [config]);

  const isPositiveNpv = result.finance.npvTl > 0;

  // Cash flow tablosu için kullanılacak veri
  const cfPeriods = cfPeriod === 'yearly' ? result.finance.yearly : result.monthlyYear1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{config.name}</h1>
          <p className="text-sm text-muted-foreground">
            {config.location.city ?? ''} · {config.pv.peakPowerKwp.toLocaleString('tr-TR')} kWp ·{' '}
            {config.battery.enabled
              ? `${config.battery.nominalCapacityKwh.toLocaleString('tr-TR')} kWh BESS`
              : 'Bataryasız'}{' '}
            · {config.analysisYears} yıl
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Hesaplama süresi: {(result.durationMs / 1000).toFixed(2)}s · {new Date(result.computedAt).toLocaleString('tr-TR')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <MasterCheckBadge projectId={projectId} />
          <CurrencyToggle value={currency} onChange={setCurrency} usdTry={usdTry} />
          <Button variant="outline" asChild>
            <Link href={`/projects/new?edit=${projectId}`}>
              <Edit3 className="h-4 w-4 mr-2" /> Düzenle & Tekrar Çalıştır
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/api/reports/excel/${projectId}?type=combined`} target="_blank">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel Tam
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/api/reports/excel/${projectId}?type=generation`} target="_blank">
              <Download className="h-4 w-4 mr-2" /> Üretim
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/api/reports/excel/${projectId}?type=consumption`} target="_blank">
              <Download className="h-4 w-4 mr-2" /> Tüketim
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/report`} target="_blank">
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Link>
          </Button>
        </div>
      </div>

      {/* Verdict */}
      <div className={`rounded-xl border-l-4 p-4 ${isPositiveNpv ? 'border-l-eco bg-eco/5' : 'border-l-destructive bg-destructive/5'}`}>
        <div className="flex items-center gap-3">
          {isPositiveNpv ? <TrendingUp className="h-6 w-6 text-eco-dark" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
          <div className="flex-1">
            <div className="font-semibold">
              {isPositiveNpv
                ? `Yatırım değerlidir — IRR %${result.finance.irrPct.toFixed(1)}, FCFC geri ödeme ${formatYears(result.finance.fcfcPaybackYears)}`
                : `Mevcut varsayımlarla NPV negatif — finansman/tarife revize edilmeli`}
            </div>
            <div className="text-xs text-muted-foreground">
              NPV: {formatMoney(result.finance.npvTl, currency, usdTry, { compact: true })} · LCOE: {currency === 'USD' ? `${(result.finance.lcoeUsdKwh * 100).toFixed(2)} ¢/kWh` : `${result.finance.lcoeTlKwh.toFixed(2)} TL/kWh`} ·
              DSCR ort {result.finance.avgDscr.toFixed(2)} · 25y CO₂ {result.finance.totalCo2Tons.toFixed(0)} ton (≈{result.finance.equivalentTrees.toLocaleString('tr-TR')} ağaç)
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="energy">Enerji</TabsTrigger>
          <TabsTrigger value="netting">Mahsuplaşma</TabsTrigger>
          <TabsTrigger value="hourly">Saatlik Veri</TabsTrigger>
          <TabsTrigger value="battery">Batarya</TabsTrigger>
          <TabsTrigger value="pnl">P&amp;L</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          <TabsTrigger value="waterfall">Cash Waterfall</TabsTrigger>
          <TabsTrigger value="coverage">Borç Karşılama</TabsTrigger>
          <TabsTrigger value="scenarios">Senaryo Matrisi</TabsTrigger>
          <TabsTrigger value="risk">Risk (MC)</TabsTrigger>
          <TabsTrigger value="sensitivity">Duyarlılık</TabsTrigger>
          <TabsTrigger value="esg">ESG</TabsTrigger>
          <TabsTrigger value="assumptions">Varsayımlar</TabsTrigger>
        </TabsList>

        {/* === GENEL BAKIŞ === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="IRR" value={formatPct(result.finance.irrPct)} accent="solar" sub={`MIRR ${formatPct(result.finance.mirrPct)}`} />
            <KpiCard
              label="NPV"
              value={formatMoney(result.finance.npvTl, currency, usdTry, { compact: true })}
              accent="navy"
              sub={currency === 'USD' ? `${formatMoney(result.finance.npvTl, 'TL', usdTry, { compact: true })}` : `${formatMoney(result.finance.npvTl, 'USD', usdTry, { compact: true })}`}
            />
            <KpiCard
              label="LCOE"
              value={currency === 'USD' ? `${(result.finance.lcoeUsdKwh * 100).toFixed(2)} ¢/kWh` : `${result.finance.lcoeTlKwh.toFixed(2)} TL/kWh`}
              accent="eco"
              sub={currency === 'USD' ? `${result.finance.lcoeTlKwh.toFixed(2)} TL/kWh` : `${(result.finance.lcoeUsdKwh * 100).toFixed(2)} ¢/kWh`}
            />
            <KpiCard label="FCFC Payback" value={formatYears(result.finance.fcfcPaybackYears)} accent="solar" sub={`FCFE: ${formatYears(result.finance.fcfePaybackYears)}`} />
            <KpiCard label="ROI" value={formatPct(result.finance.roiPct)} accent="navy" />
            <KpiCard label="ROE" value={formatPct(result.finance.roePct)} accent="navy" />
            <KpiCard label="Ortalama DSCR" value={result.finance.avgDscr.toFixed(2)} accent="eco" />
            <KpiCard label="Yıllık Üretim" value={formatKwh(result.yearly[0].generation, { compact: true })} accent="solar" sub={`Spesifik: ${(result.yearly[0].generation / config.pv.peakPowerKwp).toFixed(0)} kWh/kWp`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>FCFC Akışı (25 Yıl)</CardTitle>
              <CardDescription>Yıllık net FCFC + kümülatif + iskontolu kümülatif.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={fcfcByYear}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <Tooltip formatter={(v: number) => formatMoney(v, currency, usdTry, { compact: true })} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="netFcfc" name="Yıllık Net FCFC" fill="#f59e0b" />
                  <Line yAxisId="right" type="monotone" dataKey="cumFcfc" name="Kümülatif FCFC" stroke="#0f172a" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="cumDcfc" name="Kümülatif İskonto." stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <ReferenceLine yAxisId="right" y={0} stroke="#6b7280" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <LcoeComparison
            config={config}
            lcoeTlKwh={result.finance.lcoeTlKwh}
            lcoeUsdKwh={result.finance.lcoeUsdKwh}
            currency={currency}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CAPEX Dağılımı</CardTitle>
                <CardDescription>Toplam: {formatMoney(result.finance.totalCapexTl, currency, usdTry, { compact: true })} ({(result.finance.totalCapexTl / (config.pv.peakPowerKwp * 1000 * usdTry)).toFixed(2)} USD/Wp)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={capexData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                    <YAxis type="category" dataKey="name" width={110} />
                    <Tooltip formatter={(v: number) => formatMoney(v, currency, usdTry, { compact: true })} />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aylık Üretim / Tüketim / Mahsup (Yıl 1)</CardTitle>
                <CardDescription>Üst üste karşılaştırma — fazla üretim ve şebekeden çekiş.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthly1Energy}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
                    <Legend />
                    <Bar dataKey="gen" name="Üretim" fill="#f59e0b" />
                    <Bar dataKey="cons" name="Tüketim" fill="#0f172a" />
                    <Bar dataKey="netted" name="Mahsup" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === ENERJİ === */}
        <TabsContent value="energy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Üretim Heatmap (1. yıl)</CardTitle></CardHeader>
              <CardContent><HourDayHeatmap values={result.year1.generation} colorScale="solar" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Tüketim Heatmap (1. yıl)</CardTitle></CardHeader>
              <CardContent><HourDayHeatmap values={result.year1.consumption} colorScale="cool" /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Üretim + Tüketim Aylık Karşılaştırma (Yıl 1)</CardTitle>
              <CardDescription>Aynı eksende üst üste — mahsuplaşma potansiyeli görsel.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthly1Energy}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
                  <Legend />
                  <Bar dataKey="gen" name="Üretim" fill="#fcd34d" />
                  <Bar dataKey="cons" name="Tüketim" fill="#0f172a" />
                  <Line type="monotone" dataKey="netted" name="Mahsuplaşma" stroke="#10b981" strokeWidth={2.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yıllık Üretim Trendi (degradasyon)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={result.finance.yearly.map((y) => ({ year: y.year, gen: y.generationKwh, cons: y.consumptionKwh }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
                  <Legend />
                  <Area type="monotone" dataKey="gen" name="Üretim" stroke="#f59e0b" fill="#fcd34d" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="cons" name="Tüketim" stroke="#0f172a" fill="#94a3b8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === MAHSUPLAŞMA === */}
        <TabsContent value="netting" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Mahsuplaşılan (Yıl 1)" value={formatKwh(result.year1.netting.annual.totalNetted, { compact: true })} accent="eco" />
            <KpiCard label="Bedelli Satış" value={formatKwh(result.year1.netting.annual.totalPaidSurplus, { compact: true })} accent="solar" />
            <KpiCard label="YEKDEM Bedelsiz" value={formatKwh(result.year1.netting.annual.totalYekdemFree, { compact: true })} accent="navy" />
            <KpiCard label="Öz Tüketim Oranı" value={formatPct(result.year1.netting.annual.selfConsumptionRatio * 100)} accent="eco" sub={`Otonomi: ${formatPct(result.year1.netting.annual.autonomyRatio * 100)}`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Bedelli Üretim Limiti Takibi <InfoTooltip {...TOOLTIPS.paidLimit} /></CardTitle>
              <CardDescription>
                Yıllık limit: {formatKwh(result.year1.netting.paidGenerationLimitKwh, { compact: true })}
                {result.year1.netting.overLimitStartHour !== null ? ` · ~saat ${result.year1.netting.overLimitStartHour} civarı aşıldı` : ' · aşılmadı'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={sampleEvery(result.year1.netting.cumulativeGeneration, 24).map((v, i) => ({ day: i + 1, cum: v }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(v) => `G${v}`} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
                  <Area type="monotone" dataKey="cum" name="Kümülatif Üretim" stroke="#f59e0b" fill="#fcd34d" />
                  <ReferenceLine y={result.year1.netting.paidGenerationLimitKwh} stroke="#ef4444" strokeDasharray="5 5" label="Bedelli Limit" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>25 Yıl Mahsuplaşma Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={result.yearly.map((y) => ({ year: y.year, netted: y.netting.annual.totalNetted, paid: y.netting.annual.totalPaidSurplus, yekdem: y.netting.annual.totalYekdemFree }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
                  <Legend />
                  <Bar dataKey="netted" name="Mahsup" stackId="a" fill="#10b981" />
                  <Bar dataKey="paid" name="Bedelli Satış" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="yekdem" name="YEKDEM Bedelsiz" stackId="a" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SAATLİK VERİ === */}
        <TabsContent value="hourly" className="space-y-6">
          <HourlyDataTable
            projectId={projectId}
            generation={result.year1.generation}
            consumption={result.year1.consumption}
            netting={result.year1.netting}
          />
        </TabsContent>

        {/* === BATARYA === */}
        <TabsContent value="battery" className="space-y-6">
          {!config.battery.enabled ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><BatteryIcon className="h-12 w-12 mx-auto mb-2" /> Bu projede batarya yok.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Nominal Kapasite" value={`${config.battery.nominalCapacityKwh.toLocaleString('tr-TR')} kWh`} accent="eco" />
                <KpiCard label="Güç" value={`${config.battery.nominalPowerKw.toLocaleString('tr-TR')} kW`} accent="eco" />
                <KpiCard label="Yıl 1 Eşdeğer Döngü" value={result.year1.battery.cycles.toFixed(0)} accent="solar" />
                <KpiCard label="Yıl 25 Efektif Kapasite" value={`${result.yearly[result.yearly.length - 1].battery.effectiveCapacityKwh.toFixed(0)} kWh`} accent="navy" />
              </div>
              <Card>
                <CardHeader><CardTitle>SOC Profili (1. yıl - örnek hafta)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={result.year1.battery.soc.slice(168 * 26, 168 * 27).map((v, i) => ({ h: i, soc: v * 100 }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="h" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Area type="monotone" dataKey="soc" stroke="#10b981" fill="#6ee7b7" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Efektif Kapasite ve Augmentation <InfoTooltip {...TOOLTIPS.augmentation} /></CardTitle>
                  <CardDescription>Calendar + cycle dejenerasyon. Augmentation yılları: {config.battery.augmentationYears.join(', ')}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={result.yearly.map((y) => ({ year: y.year, cap: y.battery.effectiveCapacityKwh, cycles: y.battery.cycles }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis yAxisId="l" />
                      <YAxis yAxisId="r" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="l" type="monotone" dataKey="cap" name="Efektif Kapasite (kWh)" stroke="#10b981" strokeWidth={2} />
                      <Line yAxisId="r" type="monotone" dataKey="cycles" name="Yıllık Eşdeğer Döngü" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* === P&L === */}
        <TabsContent value="pnl" className="space-y-3">
          <PnlExplainer />
          <CashFlowPeriodSelector value={cfPeriod} onChange={setCfPeriod} hasMonthly={result.monthlyYear1.length > 0} />
          <CashFlowTable sections={[INCOME_STATEMENT_ROWS]} periods={cfPeriods} totalRowLabel="Net Income (toplam)" currency={currency} usdTry={usdTry} />
        </TabsContent>

        {/* === CASH FLOW STATEMENT === */}
        <TabsContent value="cf" className="space-y-3">
          <CashFlowExplainer />
          <CashFlowPeriodSelector value={cfPeriod} onChange={setCfPeriod} hasMonthly={result.monthlyYear1.length > 0} />
          <CashFlowTable sections={CASH_FLOW_STATEMENT_ROWS} periods={cfPeriods} totalRowLabel="Net Cash Flow (toplam)" currency={currency} usdTry={usdTry} />
        </TabsContent>

        {/* === CASH WATERFALL === */}
        <TabsContent value="waterfall" className="space-y-3">
          <WaterfallExplainer />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <KpiCard label="FCFC Payback" value={formatYears(result.finance.fcfcPaybackYears)} accent="solar" />
            <KpiCard label="FCFE Payback" value={formatYears(result.finance.fcfePaybackYears)} accent="eco" />
            <KpiCard label="İskontolu Payback" value={formatYears(result.finance.discountedPaybackYears)} accent="navy" />
            <KpiCard label="Ortalama DSCR" value={result.finance.avgDscr.toFixed(2)} accent="eco" />
          </div>
          <CashFlowPeriodSelector value={cfPeriod} onChange={setCfPeriod} hasMonthly={result.monthlyYear1.length > 0} />
          <CashFlowTable sections={CASH_WATERFALL_ROWS} periods={cfPeriods} totalRowLabel="CFADS (toplam)" currency={currency} usdTry={usdTry} />
        </TabsContent>

        {/* === RİSK === */}
        <TabsContent value="risk" className="space-y-6">
          {!result.monteCarlo ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Monte Carlo bu projede çalıştırılmadı.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="IRR P10" value={formatPct(result.monteCarlo.irr.p10)} accent="navy" sub="Kötümser" />
                <KpiCard label="IRR P50" value={formatPct(result.monteCarlo.irr.p50)} accent="solar" sub="Medyan" />
                <KpiCard label="IRR P90" value={formatPct(result.monteCarlo.irr.p90)} accent="eco" sub="İyimser" />
                <KpiCard label="NPV>0 Olasılığı" value={formatPct(result.monteCarlo.probabilityNpvPositive * 100, 0)} accent="eco" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>IRR Dağılımı</CardTitle>
                  <CardDescription>{result.monteCarlo.iterations} iterasyon.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={histogram(result.monteCarlo.samples.map((s) => s.irr), 30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="binMid" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                      <YAxis />
                      <Tooltip formatter={(v: number) => v} labelFormatter={(l) => `IRR ${(l as number).toFixed(1)}%`} />
                      <Bar dataKey="count" fill="#f59e0b" />
                      <ReferenceLine x={result.monteCarlo.irr.p10} stroke="#ef4444" label="P10" />
                      <ReferenceLine x={result.monteCarlo.irr.p50} stroke="#0f172a" label="P50" />
                      <ReferenceLine x={result.monteCarlo.irr.p90} stroke="#10b981" label="P90" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* === BORÇ KARŞILAMA === */}
        <TabsContent value="coverage" className="space-y-6">
          <CoverageExplainer />
          <CoverageTab projectId={projectId} />
        </TabsContent>

        {/* === SENARYO MATRİSİ === */}
        <TabsContent value="scenarios" className="space-y-6">
          <ScenarioMatrixTab projectId={projectId} currency={currency} usdTry={usdTry} />
        </TabsContent>

        {/* === ESG === */}
        <TabsContent value="esg" className="space-y-6">
          <EsgReport config={config} result={result} />
        </TabsContent>

        {/* === VARSAYIMLAR & METODOLOJİ === */}
        <TabsContent value="assumptions" className="space-y-6">
          <AssumptionsTab config={config} result={result} currency={currency} />
        </TabsContent>

        {/* === DUYARLILIK === */}
        <TabsContent value="sensitivity" className="space-y-6">
          {!result.monteCarlo ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Tornado için Monte Carlo gerekli.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Tornado — IRR Etkisi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={[...result.monteCarlo.tornado].sort((a, b) => Math.abs(b.highImpact - b.lowImpact) - Math.abs(a.highImpact - a.lowImpact))}
                    layout="vertical"
                    stackOffset="sign"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`} />
                    <YAxis type="category" dataKey="variable" width={150} />
                    <Tooltip formatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} pp`} />
                    <ReferenceLine x={0} stroke="#0f172a" />
                    <Bar dataKey="lowImpact" name="P10" fill="#ef4444">
                      {result.monteCarlo.tornado.map((_, i) => <Cell key={i} fill="#ef4444" />)}
                    </Bar>
                    <Bar dataKey="highImpact" name="P90" fill="#10b981">
                      {result.monteCarlo.tornado.map((_, i) => <Cell key={i} fill="#10b981" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CashFlowPeriodSelector({ value, onChange, hasMonthly }: { value: 'yearly' | 'monthly'; onChange: (v: 'yearly' | 'monthly') => void; hasMonthly: boolean }) {
  return (
    <div className="inline-flex gap-1 p-1 bg-secondary rounded-md">
      <button
        className={`px-3 py-1.5 text-xs font-medium rounded ${value === 'yearly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
        onClick={() => onChange('yearly')}
      >
        Yıllık (25y)
      </button>
      <button
        disabled={!hasMonthly}
        className={`px-3 py-1.5 text-xs font-medium rounded ${value === 'monthly' ? 'bg-background shadow' : 'text-muted-foreground'} ${!hasMonthly ? 'opacity-50' : ''}`}
        onClick={() => hasMonthly && onChange('monthly')}
      >
        Aylık (Yıl 1)
      </button>
    </div>
  );
}

// ---------- Helpers ----------

function aggregateMonthlyEnergy(generation: number[], consumption: number[], netted: number[], surplus: number[]) {
  const out: Array<{ month: string; gen: number; cons: number; netted: number; surplus: number }> = [];
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const start = cursor;
    const end = cursor + DPM[m] * 24;
    cursor = end;
    let g = 0, c = 0, n = 0, s = 0;
    for (let h = start; h < end; h++) {
      g += generation[h];
      c += consumption[h];
      n += netted[h];
      s += surplus[h];
    }
    out.push({ month: MONTH_NAMES[m], gen: g, cons: c, netted: n, surplus: s });
  }
  return out;
}

function sampleEvery<T>(arr: T[], step: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[Math.min(i + step - 1, arr.length - 1)]);
  return out;
}

function histogram(values: number[], bins: number) {
  const filtered = values.filter(Number.isFinite);
  if (filtered.length === 0) return [];
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const w = (max - min) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  for (const v of filtered) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / w)));
    counts[idx]++;
  }
  return counts.map((c, i) => ({ binMid: min + (i + 0.5) * w, count: c }));
}
