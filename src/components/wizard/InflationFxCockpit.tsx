'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FxConfig, TariffConfig } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useMemo } from 'react';

/**
 * Geçmiş veri kaynakları (TCMB / TÜİK):
 *   - TR Yıllık TÜFE Enflasyonu (yıl sonu, %):
 *     2020 14.6, 2021 36.1, 2022 64.3, 2023 64.8, 2024 44.4, 2025 35.0 (tahmin), 2026 28-30 (TCMB ortası tahmin)
 *   - USD/TL yıl sonu:
 *     2020 7.43, 2021 13.31, 2022 18.70, 2023 29.49, 2024 35.30, 2025 38.50 (tahmin)
 *   - US Yıllık CPI:
 *     2020 1.4, 2021 7.0, 2022 6.5, 2023 3.4, 2024 2.9, 2025 2.4 (tahmin)
 */

const TR_INFLATION_HISTORY = [
  { year: '2020', value: 14.6 },
  { year: '2021', value: 36.1 },
  { year: '2022', value: 64.3 },
  { year: '2023', value: 64.8 },
  { year: '2024', value: 44.4 },
  { year: '2025', value: 35.0 },
  { year: '2026E', value: 28.0 },
];

const USDTRY_HISTORY = [
  { year: '2020', value: 7.43 },
  { year: '2021', value: 13.31 },
  { year: '2022', value: 18.70 },
  { year: '2023', value: 29.49 },
  { year: '2024', value: 35.30 },
  { year: '2025', value: 41.00 },
  { year: '2026 May', value: 45.55 }, // TCMB 21.05.2026
];

const US_INFLATION_HISTORY = [
  { year: '2020', value: 1.4 },
  { year: '2021', value: 7.0 },
  { year: '2022', value: 6.5 },
  { year: '2023', value: 3.4 },
  { year: '2024', value: 2.9 },
  { year: '2025', value: 2.4 },
];

export function InflationFxCockpit({
  fx,
  tariff,
  onFxChange,
  onTariffChange,
  analysisYears,
}: {
  fx: FxConfig;
  tariff: TariffConfig;
  onFxChange: (next: FxConfig) => void;
  onTariffChange: (next: TariffConfig) => void;
  analysisYears: number;
}) {
  // FX projection grafiği — PPP modeliyle
  const fxProjection = useMemo(() => {
    const drift = (1 + fx.trInflationPct / 100) / (1 + fx.usInflationPct / 100) - 1;
    return Array.from({ length: analysisYears + 1 }, (_, i) => {
      const projected = fx.usdTry * Math.pow(1 + drift, i);
      return { year: 2026 + i, projected };
    });
  }, [fx, analysisYears]);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* TL Enflasyon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            TL Enflasyon Tahmini
            <InfoTooltip title="TL Enflasyon" body="OPEX kalemlerinin yıllık artışını ve PPP-bazlı kur projeksiyonunu etkiler. TCMB Enflasyon Raporu (Ocak 2026): yıl sonu beklentisi %28 (orta noktası)." />
          </CardTitle>
          <CardDescription>Geçmiş 6 yıl TÜFE (TÜİK) + 2026 TCMB beklentisi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Senin tahminin (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={fx.trInflationPct}
                onChange={(e) => onFxChange({ ...fx, trInflationPct: parseFloat(e.target.value) || 0 })}
              />
              <div className="text-[10px] text-muted-foreground">
                TCMB Ocak 2026 raporu: %28 (orta tahmin) · Piyasa konsensüsü: %30-32
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Elektrik Fiyat Artışı (% yıllık)</Label>
              <Input
                type="number"
                step="0.5"
                value={tariff.electricityInflationPct}
                onChange={(e) => onTariffChange({ ...tariff, electricityInflationPct: parseFloat(e.target.value) || 0 })}
              />
              <div className="text-[10px] text-muted-foreground">
                Genelde TÜFE ile paralel; EPDK kararlarına göre kısa vadede sapabilir.
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={TR_INFLATION_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `%${v}`} />
              <Tooltip formatter={(v: number) => `%${v}`} />
              <ReferenceLine y={fx.trInflationPct} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Tahmin', position: 'right', fontSize: 10 }} />
              <Line type="monotone" dataKey="value" name="TR TÜFE %" stroke="#0f172a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-muted-foreground">
            Kaynak: TÜİK Tüketici Fiyat Endeksi (yıl sonu) · TCMB Enflasyon Raporu (Ocak 2026)
          </div>
        </CardContent>
      </Card>

      {/* USD/TL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            USD/TL Kuru ve Projeksiyon
            <InfoTooltip title="USD/TL Projeksiyonu" body="Satın Alma Gücü Paritesi (PPP): kur yıllık (1+TR_enf)/(1+US_enf) faktörü ile çarpılır. Statik analiz için 'sabit kur' seçilebilir." />
          </CardTitle>
          <CardDescription>Geçmiş 6 yıl TCMB döviz alış kuru</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">USD/TL (bugün)</Label>
              <Input
                type="number"
                step="0.5"
                value={fx.usdTry}
                onChange={(e) => onFxChange({ ...fx, usdTry: parseFloat(e.target.value) || 0 })}
              />
              <div className="text-[10px] text-muted-foreground">
                TCMB 21.05.2026: 45.61 TL/USD · Mayıs ortalaması ~45.50
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">USD Enflasyon (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={fx.usInflationPct}
                onChange={(e) => onFxChange({ ...fx, usInflationPct: parseFloat(e.target.value) || 0 })}
              />
              <div className="text-[10px] text-muted-foreground">
                Fed 2026 hedefi: %2.0-2.5
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kur Projeksiyon Modeli</Label>
              <select
                value={fx.fxProjection}
                onChange={(e) => onFxChange({ ...fx, fxProjection: e.target.value as 'static' | 'ppp' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ppp">PPP (TÜFE farkı)</option>
                <option value="static">Sabit kur</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={[...USDTRY_HISTORY, ...fxProjection.slice(1).map(p => ({ year: String(p.year), value: p.projected }))]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => v.toFixed(0)} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <Line type="monotone" dataKey="value" name="USD/TL" stroke="#0f172a" strokeWidth={2} dot={true} />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-muted-foreground">
            Kaynak: TCMB döviz alış kuru, yıl sonu · Projeksiyon: PPP modeli (TR-US enflasyon farkı)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
