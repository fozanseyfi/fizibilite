import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { computeLosses, DEFAULT_LOSSES } from '@/lib/pv-losses';
import { ArrowLeft, Sun, Zap, ThermometerSun, Cable, Activity, TrendingDown } from 'lucide-react';
import { formatKwh } from '@/lib/utils';
import { PvSimulationCharts } from './charts';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DPM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function PvSimulationPage({ params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) notFound();
  const config = JSON.parse(row.configJson) as ProjectConfig;
  const result = row.resultsJson ? (JSON.parse(row.resultsJson) as SimulationResult) : null;
  if (!result) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <Card><CardContent className="py-12">
          <p className="text-sm text-muted-foreground mb-4">Önce simülasyon çalıştırılmalı.</p>
          <Button asChild><Link href={`/projects/${params.id}`}>Projeye dön</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  // Aylık üretim toplamı (yıl 1)
  const monthlyGen: number[] = new Array(12).fill(0);
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const end = cursor + DPM[m] * 24;
    for (let h = cursor; h < end; h++) monthlyGen[m] += result.generationByYear[0][h] || 0;
    cursor = end;
  }

  // Yıllık üretim (25 yıl, degradasyon dahil)
  const yearlyGen = result.finance.yearly.map((y) => ({ year: y.year, gen: y.generationKwh }));

  // Kayıp analizi
  const losses = computeLosses(config.pv.losses ?? DEFAULT_LOSSES);

  const annualGenY1 = monthlyGen.reduce((a, b) => a + b, 0);
  const specificYield = annualGenY1 / config.pv.peakPowerKwp;
  const pr = losses.yieldFactor; // performance ratio yaklaşımı

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/${params.id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Projeye dön</Link>
        </Button>
        <div className="text-xs text-muted-foreground">PV Simülasyon Önizleme (PVSyst tarzı)</div>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sun className="h-6 w-6 text-solar" />
          PV Üretim Simülasyonu
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {config.name} · {config.pv.peakPowerKwp} kWp · {config.location.city ?? 'lat ' + config.location.lat.toFixed(2)} · PVGIS-SARAH3 (Avrupa Komisyonu)
        </p>
      </div>

      {/* Üst KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox icon={Sun} label="Yıllık Üretim (Yıl 1)" value={formatKwh(annualGenY1, { compact: true })} color="solar" />
        <KpiBox icon={Zap} label="Spesifik Verim" value={`${specificYield.toFixed(0)} kWh/kWp/y`} color="solar" sub="TR ortalama 1400-1800" />
        <KpiBox icon={Activity} label="Performance Ratio" value={`%${(pr * 100).toFixed(1)}`} color="eco" sub="Tipik %75-85" />
        <KpiBox icon={TrendingDown} label="25y Üretim" value={formatKwh(yearlyGen.reduce((a, y) => a + y.gen, 0), { compact: true })} color="navy" sub="Degradasyon dahil" />
      </div>

      {/* Kayıp şelalesi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cable className="h-5 w-5 text-amber-600" /> Kayıp Şelalesi (PVSyst Loss Diagram)</CardTitle>
          <CardDescription>
            Saf güneş enerjisi (Sun energy on POA) → Net AC üretim. Her adım multiplicative kayıp uygular.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <LossWaterfall steps={losses.steps} totalLossPct={losses.totalLossPct} yieldFactor={losses.yieldFactor} annualGenY1={annualGenY1} />
        </CardContent>
      </Card>

      {/* Aylık ve Yıllık grafikler (client component) */}
      <PvSimulationCharts
        monthlyGen={monthlyGen}
        yearlyGen={yearlyGen}
        hourlyY1={result.generationByYear[0]}
      />

      {/* Sıcaklık etkisi açıklama */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ThermometerSun className="h-4 w-4 text-amber-600" /> Sıcaklık Etkisi</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            PV modül performansı sıcaklıkla düşer. Modül sıcaklık katsayısı tipik <strong>-0.28 ~ -0.34 %/°C</strong>.
            25°C STC referansı, panel sıcaklığı 65°C ise verim kaybı <strong>(65−25) × 0.30 = %12</strong>.
          </p>
          <p>
            Türkiye için yıllık ortalama sıcaklık etkisi: <strong>%4-7</strong>. Yaz pikleri (Temmuz/Ağustos)
            o ayın üretimini %15'e kadar düşürebilir.
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs mt-3">
            <div className="rounded-md border border-border/40 p-3"><div className="text-muted-foreground">Modül Stand. Verim (25°C)</div><div className="text-lg font-bold">%22.5</div></div>
            <div className="rounded-md border border-border/40 p-3"><div className="text-muted-foreground">Sıcak Yaz Günü (65°C)</div><div className="text-lg font-bold text-amber-700">%19.8</div></div>
            <div className="rounded-md border border-border/40 p-3"><div className="text-muted-foreground">Yıllık Ort. Etki</div><div className="text-lg font-bold text-destructive">−%{(config.pv.losses?.temperaturePct ?? 5).toFixed(1)}</div></div>
          </div>
        </CardContent>
      </Card>

      {/* Aksiyon */}
      <div className="flex justify-between items-center pt-4 border-t border-border/40">
        <Button asChild variant="outline">
          <Link href={`/projects/${params.id}`}><ArrowLeft className="h-4 w-4 mr-2" /> Tam dashboard&apos;a dön</Link>
        </Button>
        <Button asChild>
          <Link href={`/projects/new?edit=${params.id}`}>Konfigürasyonu Düzenle</Link>
        </Button>
      </div>
    </div>
  );
}

function KpiBox({ icon: Icon, label, value, sub, color }: { icon: typeof Sun; label: string; value: string; sub?: string; color: 'solar' | 'eco' | 'navy' }) {
  const colorClass = color === 'solar' ? 'gradient-solar' : color === 'eco' ? 'gradient-eco' : 'gradient-navy';
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`h-8 w-8 rounded-md ${colorClass} flex items-center justify-center mb-2`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</div>
        <div className="text-lg font-bold tabular-nums whitespace-nowrap">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground whitespace-nowrap">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function LossWaterfall({ steps, totalLossPct, yieldFactor, annualGenY1 }: { steps: ReturnType<typeof computeLosses>['steps']; totalLossPct: number; yieldFactor: number; annualGenY1: number }) {
  // GHI baseline tahmin: annualGenY1 / yieldFactor = gross POA
  const grossPoa = annualGenY1 / yieldFactor;
  return (
    <div className="space-y-1">
      <WaterfallRow label="Saf Güneş Enerjisi (POA)" pct={100} kwh={grossPoa} color="bg-amber-300" />
      {steps.map((s, i) => (
        <WaterfallRow
          key={i}
          label={s.name}
          pct={s.pct}
          kwh={grossPoa * s.remaining}
          isLoss
          color="bg-red-200"
        />
      ))}
      <div className="pt-2 border-t-2 border-foreground/40 mt-2">
        <WaterfallRow label="NET AC ÜRETİM" pct={yieldFactor * 100} kwh={annualGenY1} color="bg-eco" final />
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Toplam kayıp: <strong className="text-destructive">−%{totalLossPct.toFixed(2)}</strong> ·
          Net verim: <strong className="text-eco-dark">%{(yieldFactor * 100).toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}

function WaterfallRow({ label, pct, kwh, color, isLoss, final }: { label: string; pct: number; kwh: number; color: string; isLoss?: boolean; final?: boolean }) {
  const barWidth = Math.min(100, pct);
  return (
    <div className={`grid grid-cols-[200px_1fr_120px_120px] gap-3 items-center text-xs py-1 ${final ? 'font-bold' : ''}`}>
      <div className="whitespace-nowrap text-foreground/80">{label}</div>
      <div className="h-3 bg-secondary rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${barWidth}%` }} />
      </div>
      <div className={`text-right tabular-nums whitespace-nowrap ${isLoss ? 'text-destructive' : 'text-foreground'}`}>
        {isLoss ? `−%${pct.toFixed(1)}` : `%${pct.toFixed(1)}`}
      </div>
      <div className="text-right tabular-nums whitespace-nowrap text-muted-foreground">{formatKwh(kwh, { compact: true })}</div>
    </div>
  );
}
