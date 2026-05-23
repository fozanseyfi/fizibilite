'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { Location, PVSystemConfig } from '@/lib/types';

interface OptimizeResult {
  best: { angle: number; aspect: number; annualKwh: number; specificYield: number };
  baseline: { angle: number; aspect: number; annualKwh: number; specificYield: number };
  improvementPct: number;
  searchedCombinations: number;
}

export function OptimalAngleFinder({
  location,
  pv,
  onApply,
}: {
  location: Location;
  pv: PVSystemConfig;
  onApply: (angle: number, aspect: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function findOptimal() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/optimize-angle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, pv }),
      });
      if (!res.ok) throw new Error('PVGIS arama başarısız');
      const data = (await res.json()) as OptimizeResult;
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Optimal Açı/Azimut Bulucu
            </div>
            <div className="text-xs text-muted-foreground">
              Bu lokasyon için 6 açı × 5 azimut = 30 kombinasyon test edilir. ~30-60 saniye.
            </div>
          </div>
          <Button type="button" onClick={findOptimal} disabled={busy} size="sm">
            {busy ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Aranıyor...</>) : 'Optimali Bul'}
          </Button>
        </div>

        {err && <div className="text-xs text-destructive rounded bg-destructive/10 p-2">{err}</div>}

        {result && (
          <div className="space-y-2 text-sm border-t border-border/30 pt-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Optimal</div>
                <div className="font-mono font-bold">{result.best.angle}° / {result.best.aspect}°</div>
                <div className="text-xs">{result.best.specificYield.toFixed(0)} kWh/kWp</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Baseline (30°/0°)</div>
                <div className="font-mono">{result.baseline.angle}° / {result.baseline.aspect}°</div>
                <div className="text-xs">{result.baseline.specificYield.toFixed(0)} kWh/kWp</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">İyileşme</div>
                <div className={`font-mono font-bold ${result.improvementPct > 0 ? 'text-eco-dark' : ''}`}>
                  +%{result.improvementPct.toFixed(2)}
                </div>
                <div className="text-xs">{result.searchedCombinations} kombinasyon</div>
              </div>
            </div>
            {result.best.angle !== pv.angle || result.best.aspect !== pv.aspect ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onApply(result.best.angle, result.best.aspect)} className="w-full">
                Optimali Uygula ({result.best.angle}° / {result.best.aspect}°)
              </Button>
            ) : (
              <div className="text-xs text-eco-dark">✓ Mevcut konfigürasyon zaten optimal</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
