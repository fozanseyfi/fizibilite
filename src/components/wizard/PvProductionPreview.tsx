'use client';

import { useState } from 'react';
import { Zap, Calendar, TrendingUp, Activity, RefreshCw, AlertTriangle, CheckCircle2, Sun } from 'lucide-react';
import { Location, PVSystemConfig } from '@/lib/types';
import { DEFAULT_LOSSES, LossBreakdown } from '@/lib/pv-losses';
import { LossWaterfall } from './LossWaterfall';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface PvProductionPreviewProps {
  location: Location;
  pv: PVSystemConfig;
  losses?: LossBreakdown;
}

interface PvgisResult {
  hourly: number[];
  annualKwh: number;
  specificYieldKwhPerKwp: number;
  source: 'cache' | 'api' | 'fallback';
}

export function PvProductionPreview({ location, pv, losses }: PvProductionPreviewProps) {
  const [result, setResult] = useState<PvgisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchProduction() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pvgis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, pv }),
      });
      if (!res.ok) throw new Error(`PVGIS hatası: HTTP ${res.status}`);
      const data = (await res.json()) as PvgisResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PVGIS çekilemedi');
    } finally {
      setLoading(false);
    }
  }

  if (!result && !loading) {
    return (
      <div className="border border-dashed border-border rounded-md bg-secondary/20 p-8 text-center">
        <Sun className="h-10 w-10 mx-auto text-amber-500/60 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">PVGIS Üretim Hesabı</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          PV konfigürasyonu girildi. Şimdi PVGIS-SARAH3 üzerinden bu lokasyon ve sistem için
          8760 saatlik üretim profilini çekelim.
        </p>
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mb-4 flex-wrap">
          <span className="font-mono">{location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E</span>
          <span>·</span>
          <span className="font-mono tabular-nums">{pv.peakPowerKwp.toLocaleString('tr-TR')} kWp</span>
          <span>·</span>
          <span className="font-mono tabular-nums">{pv.angle}° / {pv.aspect}°</span>
          <span>·</span>
          <span className="font-mono tabular-nums">−{pv.loss}% loss</span>
        </div>
        <button
          type="button"
          onClick={fetchProduction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Zap className="h-4 w-4" />
          Üretimi Hesapla (PVGIS-SARAH3)
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-border rounded-md bg-card p-8 text-center">
        <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">PVGIS-SARAH3 çekiliyor… (8760 saat)</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1 font-mono">re.jrc.ec.europa.eu</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 rounded-md p-5 text-center">
        <AlertTriangle className="h-6 w-6 mx-auto text-destructive mb-2" />
        <p className="text-sm text-destructive font-semibold mb-2">{error}</p>
        <button
          type="button"
          onClick={fetchProduction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-semibold hover:bg-secondary"
        >
          <RefreshCw className="h-3 w-3" /> Tekrar Dene
        </button>
      </div>
    );
  }

  if (!result) return null;

  // ---------- Aylık aggregate ----------
  const monthly: number[] = new Array(12).fill(0);
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const days = DAYS_IN_MONTH[m];
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        monthly[m] += result.hourly[cursor] || 0;
        cursor++;
      }
    }
  }
  const maxMonthly = Math.max(...monthly);
  const minMonthly = Math.min(...monthly);
  const dailyAvgKwh = result.annualKwh / 365;
  const capacityFactorPct = pv.peakPowerKwp > 0 ? (result.annualKwh / (pv.peakPowerKwp * 8760)) * 100 : 0;
  const pr = pv.loss > 0 ? (1 - pv.loss / 100) : 1; // performans oranı approx
  const baselineForWaterfall = pv.loss > 0 ? result.specificYieldKwhPerKwp / pr : result.specificYieldKwhPerKwp;

  return (
    <div className="space-y-4">
      {/* ---------- Source banner ---------- */}
      <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-[11px] ${
        result.source === 'fallback'
          ? 'border-amber-300 bg-amber-50/60 text-amber-900'
          : 'border-eco/30 bg-eco/5 text-eco-dark'
      }`}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="font-semibold">
            {result.source === 'cache' && 'Cache\'ten yüklendi'}
            {result.source === 'api' && 'PVGIS-SARAH3 API\'den çekildi'}
            {result.source === 'fallback' && 'Sentetik fallback kullanıldı (PVGIS erişilemedi)'}
          </span>
        </div>
        <button
          type="button"
          onClick={fetchProduction}
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold hover:underline"
        >
          <RefreshCw className="h-3 w-3" /> Yenile
        </button>
      </div>

      {/* ---------- KPI tiles ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={Zap}
          label="Yıllık Üretim"
          value={(result.annualKwh / 1000).toFixed(1)}
          unit="MWh"
          sub={`${result.annualKwh.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kWh/yıl`}
        />
        <KpiTile
          icon={TrendingUp}
          label="Özgül Üretim"
          value={result.specificYieldKwhPerKwp.toFixed(0)}
          unit="kWh/kWp"
          sub={`Yıllık · ${(result.specificYieldKwhPerKwp / 365).toFixed(2)} kWh/kWp/gün`}
        />
        <KpiTile
          icon={Calendar}
          label="Günlük Ortalama"
          value={(dailyAvgKwh / pv.peakPowerKwp).toFixed(2)}
          unit="kWh/kWp"
          sub={`Tesis toplamı ${(dailyAvgKwh).toFixed(0)} kWh/gün`}
        />
        <KpiTile
          icon={Activity}
          label="Kapasite Faktörü"
          value={capacityFactorPct.toFixed(1)}
          unit="%"
          sub={`PR ~${(pr * 100).toFixed(1)}%`}
        />
      </div>

      {/* ---------- Aylık grafik ---------- */}
      <div className="border border-border rounded-md bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground">
              Monthly Production
            </div>
            <h3 className="text-sm font-semibold text-foreground mt-0.5">Aylık Üretim Profili</h3>
          </div>
          <div className="text-right text-[10.5px] text-muted-foreground">
            <div>Pik ay: <strong className="text-foreground tabular-nums">{(maxMonthly / 1000).toFixed(1)} MWh</strong></div>
            <div>Min ay: <strong className="text-foreground tabular-nums">{(minMonthly / 1000).toFixed(1)} MWh</strong></div>
          </div>
        </div>
        <div className="p-4">
          {/* Bar grafiği */}
          <div className="grid grid-cols-12 gap-1.5 h-44 items-end">
            {monthly.map((kwh, i) => {
              const heightPct = maxMonthly > 0 ? (kwh / maxMonthly) * 100 : 0;
              const isPeak = kwh === maxMonthly;
              const isMin = kwh === minMonthly;
              return (
                <div key={i} className="flex flex-col items-center justify-end h-full group relative">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-[10px] font-mono font-semibold tabular-nums text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-foreground text-background px-1.5 py-0.5 rounded shadow z-10 pointer-events-none">
                    {(kwh / 1000).toFixed(1)} MWh
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${isPeak ? 'bg-amber-500' : isMin ? 'bg-blue-400' : 'bg-primary/70 hover:bg-primary'}`}
                    style={{ height: `${heightPct}%`, minHeight: '4px' }}
                  />
                </div>
              );
            })}
          </div>
          {/* X axis labels */}
          <div className="grid grid-cols-12 gap-1.5 mt-1.5">
            {MONTH_NAMES.map((m, i) => (
              <div key={m} className={`text-[10px] text-center font-mono ${
                monthly[i] === maxMonthly ? 'text-amber-700 font-bold' :
                monthly[i] === minMonthly ? 'text-blue-600 font-bold' :
                'text-muted-foreground'
              }`}>
                {m}
              </div>
            ))}
          </div>
          {/* Numeric row */}
          <div className="grid grid-cols-12 gap-1.5 mt-1">
            {monthly.map((kwh, i) => (
              <div key={i} className="text-[10px] text-center font-mono tabular-nums text-foreground/70">
                {(kwh / 1000).toFixed(1)}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-center font-mono tabular-nums text-muted-foreground mt-1">
            MWh
          </div>
        </div>
      </div>

      {/* ---------- Loss waterfall ---------- */}
      <LossWaterfall
        baselineKwhPerKwp={baselineForWaterfall}
        peakPowerKwp={pv.peakPowerKwp}
        losses={losses ?? DEFAULT_LOSSES}
      />
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, unit, sub }: { icon: typeof Zap; label: string; value: string; unit: string; sub: string }) {
  return (
    <div className="border border-border rounded-md bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground leading-tight">
          {label}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
      </div>
      <div className="mt-1.5 font-bold tabular-nums tracking-tight leading-none text-2xl text-foreground">
        {value}
        <span className="text-sm text-muted-foreground font-normal ml-1">{unit}</span>
      </div>
      <div className="text-[10.5px] text-muted-foreground mt-1.5 leading-tight">{sub}</div>
    </div>
  );
}
