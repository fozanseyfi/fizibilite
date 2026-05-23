'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  STRUCTURE_LABELS, STRUCTURE_VALUES, DC_AC_VALUES, BATTERY_RATIOS,
} from '@/lib/pf/types';
import type { ScenarioMatrixResult } from '@/lib/pf/scenario-matrix';
import { formatMoney, formatPct, formatYears, Currency } from '@/lib/utils';
import { Loader2, Play, Sparkles } from 'lucide-react';

type Metric = 'projectIrr' | 'projectNpv' | 'paybackYears' | 'lcoeTlKwh' | 'minDscr';

const METRIC_OPTIONS: Array<{ key: Metric; label: string; lowerBetter: boolean; fmt: (v: number, currency: Currency, usdTry: number) => string }> = [
  { key: 'projectIrr', label: 'IRR (%)', lowerBetter: false, fmt: (v) => formatPct(v) },
  { key: 'projectNpv', label: 'NPV', lowerBetter: false, fmt: (v, c, u) => formatMoney(v, c, u, { compact: true }) },
  { key: 'paybackYears', label: 'Payback', lowerBetter: true, fmt: (v) => formatYears(v) },
  { key: 'lcoeTlKwh', label: 'LCOE TL/kWh', lowerBetter: true, fmt: (v) => v.toFixed(2) },
  { key: 'minDscr', label: 'Min DSCR', lowerBetter: false, fmt: (v) => v.toFixed(2) },
];

export function ScenarioMatrixTab({ projectId, currency, usdTry }: { projectId: string; currency: Currency; usdTry: number }) {
  const [data, setData] = useState<ScenarioMatrixResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('projectIrr');
  const [fixedBattery, setFixedBattery] = useState<number>(0);

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/scenario-matrix/${projectId}`, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Matris hesaplanamadı');
      }
      const d = await res.json();
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.scenarios.filter((s) => Math.abs(s.batterySizeRatio - fixedBattery) < 0.001);
  }, [data, fixedBattery]);

  const metricCfg = METRIC_OPTIONS.find((m) => m.key === metric)!;
  const values = filtered.map((s) => s[metric]).filter(Number.isFinite);
  const minV = values.length > 0 ? Math.min(...values) : 0;
  const maxV = values.length > 0 ? Math.max(...values) : 1;

  function cellColor(v: number): string {
    if (!Number.isFinite(v)) return 'bg-muted text-muted-foreground';
    const t = (v - minV) / (maxV - minV || 1);
    const score = metricCfg.lowerBetter ? 1 - t : t;
    if (score > 0.75) return 'bg-eco/30 text-eco-dark font-bold';
    if (score > 0.50) return 'bg-eco/15';
    if (score > 0.25) return 'bg-amber-50';
    return 'bg-destructive/10 text-destructive';
  }

  return (
    <div className="space-y-6">
      {!data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Senaryo Matrisi (150 Senaryo)</CardTitle>
            <CardDescription>5 DC/AC × 6 konfigürasyon × 5 batarya boyutu = 150 deterministik senaryo. Optimal yatırım noktasını bulur.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={run} disabled={loading} size="lg" className="w-full">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Hesaplanıyor (150 senaryo)…</>) : (<><Play className="h-4 w-4 mr-2" /> Matrisi Çalıştır</>)}
            </Button>
            {err && <div className="mt-3 text-xs text-destructive rounded bg-destructive/10 p-2">{err}</div>}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Üst bar */}
          <Card>
            <CardContent className="pt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Metrik</Label>
                <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                  <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{METRIC_OPTIONS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Batarya boyutu (sabit)</Label>
                <Select value={String(fixedBattery)} onValueChange={(v) => setFixedBattery(parseFloat(v))}>
                  <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{BATTERY_RATIOS.map((r) => <SelectItem key={r} value={String(r)}>{r === 0 ? 'Yok' : `%${(r * 100).toFixed(0)} günlük üretim`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1" />
              <div className="text-xs text-muted-foreground">
                {data.scenarios.length} senaryo · {(data.durationMs / 1000).toFixed(2)}s · Optimal: <span className="text-foreground font-bold">{STRUCTURE_LABELS[data.optimal.structure]} · DC/AC {data.optimal.dcAcRatio} · Bat {(data.optimal.batterySizeRatio * 100).toFixed(0)}%</span>
              </div>
              <Button size="sm" variant="outline" onClick={run}>Yeniden Çalıştır</Button>
            </CardContent>
          </Card>

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>{metricCfg.label} Heatmap — Batarya {fixedBattery === 0 ? 'Yok' : `%${(fixedBattery * 100).toFixed(0)}`}</CardTitle>
              <CardDescription>Y: Konfigürasyon · X: DC/AC oranı. Yeşil iyi, kırmızı kötü.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-3 py-2 whitespace-nowrap font-semibold">Konfigürasyon</th>
                    {DC_AC_VALUES.map((d) => <th key={d} className="text-center px-3 py-2 whitespace-nowrap font-semibold">DC/AC {d.toFixed(1)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {STRUCTURE_VALUES.map((s) => (
                    <tr key={s} className="border-b border-border/30">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{STRUCTURE_LABELS[s]}</td>
                      {DC_AC_VALUES.map((d) => {
                        const point = filtered.find((p) => p.structure === s && Math.abs(p.dcAcRatio - d) < 0.001);
                        if (!point) return <td key={d} className="text-center px-3 py-2">—</td>;
                        const v = point[metric];
                        const isOptimal = point === data.optimal;
                        return (
                          <td key={d} className={`text-center px-3 py-2 whitespace-nowrap tabular-nums ${cellColor(v)} ${isOptimal ? 'ring-2 ring-primary' : ''}`}>
                            {metricCfg.fmt(v, currency, usdTry)}
                            {isOptimal && <div className="text-[9px] text-primary font-bold">★ OPTIMAL</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* En iyi 5 senaryo */}
          <Card>
            <CardHeader><CardTitle>En İyi 5 Senaryo ({metricCfg.label})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">#</th>
                    <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Konfigürasyon</th>
                    <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">DC/AC</th>
                    <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Batarya</th>
                    <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">IRR</th>
                    <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">NPV</th>
                    <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Payback</th>
                    <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">LCOE</th>
                    <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Min DSCR</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.scenarios]
                    .sort((a, b) => metricCfg.lowerBetter ? a[metric] - b[metric] : b[metric] - a[metric])
                    .slice(0, 5)
                    .map((s, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-3 py-2 font-bold whitespace-nowrap">{i + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{STRUCTURE_LABELS[s.structure]}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{s.dcAcRatio.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{s.batterySizeRatio === 0 ? 'Yok' : `%${(s.batterySizeRatio * 100).toFixed(0)}`}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatPct(s.projectIrr)}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatMoney(s.projectNpv, currency, usdTry, { compact: true })}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatYears(s.paybackYears)}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{s.lcoeTlKwh.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{s.minDscr.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
