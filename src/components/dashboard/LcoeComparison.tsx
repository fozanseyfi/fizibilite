'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InfoTooltip, TOOLTIPS } from '@/components/ui/info-tooltip';
import { ProjectConfig } from '@/lib/types';
import { Currency } from '@/lib/utils';

/**
 * Projenin LCOE'sini Türkiye piyasası referansları ile karşılaştır.
 * Bankaya bankability göstergesi.
 */
export function LcoeComparison({
  config,
  lcoeTlKwh,
  lcoeUsdKwh,
  currency,
}: {
  config: ProjectConfig;
  lcoeTlKwh: number;
  lcoeUsdKwh: number;
  currency: Currency;
}) {
  const usdTry = config.fx.usdTry;

  // Karşılaştırma noktaları (TL/kWh)
  const benchmarks: Array<{ label: string; valueTl: number; source: string; type: 'low' | 'mid' | 'high' }> = [
    {
      label: 'Senin LCOE',
      valueTl: lcoeTlKwh,
      source: 'Bu proje',
      type: 'mid',
    },
    {
      label: 'Tarife Alış',
      valueTl: config.tariff.purchasePriceTlKwh,
      source: `EPDK 14461 · ${config.tariff.consumerGroup}`,
      type: 'high',
    },
    {
      label: 'Tarife Satış',
      valueTl: config.tariff.salePriceTlKwh,
      source: 'EPDK 14461 · ihtiyaç fazlası satış',
      type: 'mid',
    },
    {
      label: 'SKTT (yaklaşık)',
      valueTl: 3.5, // Mayıs 2026 ortalama PTF+YEKDEM × KBK tahmini
      source: 'PTF+YEKDEM × 1.0938 (Mayıs 2026 ortalama)',
      type: 'mid',
    },
    {
      label: 'Tipik C&I PPA',
      valueTl: 4.5,
      source: '2026 kurumsal PPA ortalaması (10y vade)',
      type: 'high',
    },
  ];

  // Eğer kullanıcının PPA'sı varsa ekle
  if (config.ppa?.enabled) {
    benchmarks.push({
      label: 'Senin PPA',
      valueTl: config.ppa.ppaPriceTlKwh,
      source: `${config.ppa.ppaTermYears} yıl · escalation %${config.ppa.ppaEscalationPct}`,
      type: 'mid',
    });
  }

  const max = Math.max(...benchmarks.map((b) => b.valueTl));
  const yourLcoe = lcoeTlKwh;

  const verdict = yourLcoe < config.tariff.purchasePriceTlKwh
    ? { text: `✓ Bankable — LCOE tarife alış fiyatından %${(((config.tariff.purchasePriceTlKwh - yourLcoe) / config.tariff.purchasePriceTlKwh) * 100).toFixed(0)} daha ucuz`, color: 'eco' }
    : { text: '⚠ Tarife alış fiyatından pahalı — sponsorluk gerekebilir', color: 'destructive' };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          LCOE Bankability Karşılaştırması
          <InfoTooltip {...TOOLTIPS.lcoe} />
        </CardTitle>
        <CardDescription>
          Senin LCOE'n piyasa alternatifleriyle karşılaştırması.
          <span className={`ml-2 font-semibold ${verdict.color === 'eco' ? 'text-eco-dark' : 'text-destructive'}`}>
            {verdict.text}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {benchmarks.map((b) => {
          const w = (b.valueTl / max) * 100;
          const isYours = b.label === 'Senin LCOE' || b.label === 'Senin PPA';
          return (
            <div key={b.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isYours ? 'text-primary' : ''}`}>{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.source}</span>
                </div>
                <span className={`tabular-nums whitespace-nowrap font-mono ${isYours ? 'font-bold text-primary' : ''}`}>
                  {currency === 'USD' ? `$${(b.valueTl / usdTry).toFixed(3)}` : `${b.valueTl.toFixed(2)} TL`} /kWh
                </span>
              </div>
              <div className="h-2 bg-secondary rounded overflow-hidden">
                <div
                  className={`h-full ${isYours ? 'gradient-solar' : b.label === 'Tarife Alış' ? 'bg-destructive/60' : 'bg-muted-foreground/30'}`}
                  style={{ width: `${w}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
