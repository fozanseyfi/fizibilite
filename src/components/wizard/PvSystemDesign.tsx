'use client';

import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { LossBreakdown, computeLosses } from '@/lib/pv-losses';
import { PVSystemConfig } from '@/lib/types';
import { Cable } from 'lucide-react';

/**
 * Yalnızca sistem kayıp kırılımı editörü.
 *
 * Panel + invertör + string konfigürasyonu burada YOK — onlar üst kartlarda (2-6/7) yapılır.
 * Bu komponent sadece 10 multiplicative loss kalemini düzenler ve toplam loss'u
 * otomatik pv.loss'a yazar (useEffect).
 */
export function PvSystemDesign({
  pv,
  onPvChange,
  losses,
  onLossesChange,
}: {
  pv: PVSystemConfig;
  onPvChange: (next: PVSystemConfig) => void;
  losses: LossBreakdown;
  onLossesChange: (next: LossBreakdown) => void;
}) {
  const lossesResult = useMemo(() => computeLosses(losses), [losses]);

  // Kayıp dağılımı her değiştiğinde pv.loss'u otomatik güncelle (PVGIS'a senkron)
  useEffect(() => {
    const newLoss = parseFloat(lossesResult.totalLossPct.toFixed(2));
    if (Math.abs(pv.loss - newLoss) > 0.01) {
      onPvChange({ ...pv, loss: newLoss });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lossesResult.totalLossPct]);

  return (
    <Card className="border-amber-300/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cable className="h-4 w-4 text-amber-600" />
          Kayıp Kırılımı (PVsyst Tarzı)
          <InfoTooltip
            title="Multiplicative Kayıp Zinciri"
            body="Her kayıp ardışık uygulanır: remaining = remaining × (1 - loss/100). Toplam sistem kaybı = 1 - Π remaining. Bu değer PVGIS 'loss' parametresine birebir karşılık gelir ve aşağıdaki tablodan otomatik hesaplanır."
          />
        </CardTitle>
        <CardDescription className="text-xs">
          10 kayıp bileşeni — her değişiklikte toplam sistem kaybı (PVGIS &apos;loss&apos; parametresi) otomatik güncellenir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Kayıp Kalemi</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Değer (%)</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Kümülatif Verim</th>
              </tr>
            </thead>
            <tbody>
              {lossesResult.steps.map((s, i) => (
                <tr key={s.name} className="border-b border-border/30">
                  <td className="px-3 py-1.5 whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-1.5 text-right">
                    <LossInput
                      value={s.pct}
                      onChange={(v) => {
                        const keys: (keyof LossBreakdown)[] = ['soilingPct', 'iamPct', 'spectralPct', 'temperaturePct', 'mismatchPct', 'dcCablingPct', 'inverterPct', 'acCablingPct', 'transformerPct', 'availabilityPct'];
                        onLossesChange({ ...losses, [keys[i]]: v });
                      }}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    %{(s.remaining * 100).toFixed(1)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground/40 bg-amber-50 font-bold">
                <td className="px-3 py-2 whitespace-nowrap">TOPLAM SİSTEM KAYBI</td>
                <td className="px-3 py-2 text-right tabular-nums text-destructive whitespace-nowrap">−%{lossesResult.totalLossPct.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-eco-dark whitespace-nowrap">%{(lossesResult.yieldFactor * 100).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted-foreground">
          PVGIS parametresi otomatik güncellendi: <strong className="text-foreground tabular-nums">{pv.loss}%</strong>
        </div>
        <div className="rounded-md bg-amber-50 border border-amber-300 p-3 text-xs space-y-1">
          <div className="font-semibold text-amber-900">Tipik PVsyst değerleri:</div>
          <ul className="text-amber-800 space-y-0.5">
            <li>• <strong>Soiling</strong>: 2% (kentsel) — 4% (toz çok, çöl)</li>
            <li>• <strong>Temperature</strong>: 4-7% (Türkiye yaz pikleri)</li>
            <li>• <strong>Mismatch</strong>: 1% (yüksek kalite) — 3% (karma kullanım)</li>
            <li>• <strong>İnvertör</strong>: 1.5-2% (datasheet EU efficiency&apos;den)</li>
            <li>• <strong>Availability</strong>: 0.5% (1-2 gün/yıl bakım kesintisi)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function LossInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type="number"
      step="0.1"
      min="0"
      max="20"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="h-7 w-20 text-xs text-right ml-auto"
    />
  );
}
