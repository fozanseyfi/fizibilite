'use client';

import { useMemo } from 'react';

/**
 * 8760 → 24 × 365 heatmap. Saat × gün.
 */
export function HourDayHeatmap({
  values,
  title,
  colorScale = 'solar',
}: {
  values: number[];
  title?: string;
  colorScale?: 'solar' | 'eco' | 'cool';
}) {
  const { min, max, grid } = useMemo(() => {
    const days = 365;
    const grid: number[][] = [];
    let min = Infinity;
    let max = -Infinity;
    for (let h = 0; h < 24; h++) {
      const row: number[] = [];
      for (let d = 0; d < days; d++) {
        const idx = d * 24 + h;
        const v = values[idx] ?? 0;
        row.push(v);
        if (v < min) min = v;
        if (v > max) max = v;
      }
      grid.push(row);
    }
    return { min, max, grid };
  }, [values]);

  const colorFor = (v: number) => {
    if (max <= min) return 'rgba(0,0,0,0)';
    const t = (v - min) / (max - min);
    if (colorScale === 'eco') return `rgba(16, 185, 129, ${0.05 + t * 0.95})`;
    if (colorScale === 'cool') return `rgba(59, 130, 246, ${0.05 + t * 0.95})`;
    return `rgba(245, 158, 11, ${0.05 + t * 0.95})`;
  };

  return (
    <div className="space-y-2">
      {title && <div className="text-sm font-medium text-muted-foreground">{title}</div>}
      <div className="rounded-md border border-border/60 overflow-hidden">
        <svg viewBox={`0 0 ${365} ${24}`} preserveAspectRatio="none" className="w-full h-48">
          {grid.map((row, h) =>
            row.map((v, d) => <rect key={`${h}-${d}`} x={d} y={h} width={1} height={1} fill={colorFor(v)} />)
          )}
        </svg>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{min.toFixed(1)}</span>
        <span>← saat × gün → {max.toFixed(1)}</span>
      </div>
    </div>
  );
}
