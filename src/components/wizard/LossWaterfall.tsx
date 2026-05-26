'use client';

import { computeLosses, LossBreakdown } from '@/lib/pv-losses';

/**
 * PVsyst-style loss diagram — telescoping vertical bars.
 * Üstte teorik (kayıpsız) referans bar, her adımda biraz kısalır,
 * sağda kayıp yüzdesi etiketi ve azalan kWh/kWp.
 *
 * Görsel mantık:
 *   - Bar genişliği = (kalan / 100) % container width
 *   - Her satırda solda label, ortada bar, sağda yeni değer
 *   - Bar renk: yeşil→amber→kırmızı kümülatif kayıp arttıkça
 */

interface LossWaterfallProps {
  /** Teorik üretim (kayıpsız ölçek, kWh/kWp/yıl). Tipik 1700-2000. */
  baselineKwhPerKwp: number;
  /** Toplam kapasite — final kWh hesaplaması için */
  peakPowerKwp: number;
  /** Kayıp dağılımı (config.pv.losses) */
  losses: LossBreakdown;
}

export function LossWaterfall({ baselineKwhPerKwp, peakPowerKwp, losses }: LossWaterfallProps) {
  const result = computeLosses(losses);
  const finalSpec = baselineKwhPerKwp * result.yieldFactor;
  const finalKwh = finalSpec * peakPowerKwp;

  // Renk skalası: kümülatif kayıp arttıkça yeşil → amber → kırmızı (sadece bar dolgu)
  function colorFor(remaining: number): string {
    if (remaining >= 0.92) return '#10b981';        // emerald
    if (remaining >= 0.85) return '#3b82f6';        // blue
    if (remaining >= 0.78) return '#f59e0b';        // amber
    return '#ef4444';                                // red
  }

  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground">
              Loss Diagram (PVsyst Style)
            </div>
            <h3 className="text-sm font-semibold text-foreground mt-0.5">
              Üretim Kayıpları Şelalesi
            </h3>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Toplam Kayıp</div>
            <div className="text-lg font-bold tabular-nums text-destructive leading-none">
              −{result.totalLossPct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall */}
      <div className="p-4 space-y-1">
        {/* Baseline row */}
        <WaterfallRow
          label="Teorik Üretim (kayıpsız)"
          sublabel="Modül kataloğu STC × ışınım"
          bar={1}
          value={`${baselineKwhPerKwp.toFixed(0)} kWh/kWp`}
          subvalue={`${(baselineKwhPerKwp * peakPowerKwp / 1000).toFixed(1)} MWh/yıl`}
          color="#0f172a"
          headerStyle
        />

        <div className="h-1" />

        {/* Loss steps */}
        {result.steps.map((s, i) => {
          const stepKwh = baselineKwhPerKwp * s.remaining;
          const totalAnnualKwh = stepKwh * peakPowerKwp;
          return (
            <WaterfallRow
              key={i}
              label={s.name}
              sublabel={`−${s.pct.toFixed(1)}%`}
              bar={s.remaining}
              value={`${stepKwh.toFixed(0)} kWh/kWp`}
              subvalue={`${(totalAnnualKwh / 1000).toFixed(1)} MWh`}
              color={colorFor(s.remaining)}
              loss={s.pct}
            />
          );
        })}

        <div className="h-1" />

        {/* Final */}
        <WaterfallRow
          label="Net AC Üretim"
          sublabel={`Yield Factor ${(result.yieldFactor * 100).toFixed(1)}%`}
          bar={result.yieldFactor}
          value={`${finalSpec.toFixed(0)} kWh/kWp`}
          subvalue={`${(finalKwh / 1000).toFixed(1)} MWh/yıl`}
          color={colorFor(result.yieldFactor)}
          headerStyle
          footerStyle
        />
      </div>

      {/* Footer mini-summary */}
      <div className="px-4 py-2.5 border-t border-border bg-secondary/20 flex items-center justify-between text-[11px] flex-wrap gap-2">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>Yield Factor <strong className="text-foreground tabular-nums">{(result.yieldFactor * 100).toFixed(1)}%</strong></span>
          <span className="text-muted-foreground/40">|</span>
          <span>Net Specific Yield <strong className="text-foreground tabular-nums">{finalSpec.toFixed(0)} kWh/kWp/yıl</strong></span>
        </div>
        <div className="text-muted-foreground/70 font-mono text-[10px]">
          {result.steps.length} loss step · multiplicative chain
        </div>
      </div>
    </div>
  );
}

function WaterfallRow({
  label,
  sublabel,
  bar,
  value,
  subvalue,
  color,
  loss,
  headerStyle,
  footerStyle,
}: {
  label: string;
  sublabel?: string;
  bar: number;
  value: string;
  subvalue?: string;
  color: string;
  loss?: number;
  headerStyle?: boolean;
  footerStyle?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, bar * 100));
  return (
    <div className={`grid grid-cols-[180px_1fr_140px] gap-3 items-center py-1.5 ${footerStyle ? 'pt-3 mt-1 border-t-2 border-border' : ''}`}>
      <div className="min-w-0">
        <div className={`text-[12px] ${headerStyle ? 'font-bold text-foreground' : 'font-medium text-foreground/90'} leading-tight truncate`}>
          {label}
        </div>
        {sublabel && (
          <div className={`text-[10px] mt-0.5 ${loss !== undefined ? 'text-destructive font-mono' : 'text-muted-foreground'}`}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Bar */}
      <div className="relative h-5 bg-secondary/50 rounded-sm overflow-hidden border border-border/40">
        <div
          className="absolute inset-y-0 left-0 transition-all rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* % label */}
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono font-semibold tabular-nums text-white drop-shadow">
          {pct.toFixed(1)}%
        </div>
      </div>

      {/* Right value */}
      <div className="text-right">
        <div className={`text-[12px] font-mono tabular-nums ${headerStyle ? 'font-bold text-foreground' : 'text-foreground/85'}`}>
          {value}
        </div>
        {subvalue && (
          <div className="text-[10px] text-muted-foreground font-mono tabular-nums mt-0.5">{subvalue}</div>
        )}
      </div>
    </div>
  );
}
