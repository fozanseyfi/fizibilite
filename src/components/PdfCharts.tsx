/**
 * Inline SVG grafikler — PDF rapor için. Recharts'a gerek yok (server-side render dostu).
 * Tüm grafikler print-friendly, küçük boyutta okunabilir.
 */

interface ChartProps {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
  title?: string;
}

/** Yatay bar grafik — CAPEX dağılımı için */
export function HorizontalBarChart({ data, height = 240, formatValue = (v) => v.toLocaleString('tr-TR'), title }: ChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barH = 18;
  const gap = 6;
  const labelW = 140;
  const valueW = 90;
  const chartW = 700 - labelW - valueW - 20;
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <svg viewBox={`0 0 700 ${data.length * (barH + gap) + 30}`} className="w-full" style={{ maxHeight: height }}>
      {title && <text x="0" y="14" fontSize="12" fontWeight="bold" fill="#0f172a">{title}</text>}
      {data.map((d, i) => {
        const y = 26 + i * (barH + gap);
        const w = (d.value / max) * chartW;
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <g key={i}>
            <text x={labelW - 5} y={y + barH * 0.7} textAnchor="end" fontSize="11" fill="#475569">{d.label}</text>
            <rect x={labelW} y={y} width={chartW} height={barH} fill="#f1f5f9" />
            <rect x={labelW} y={y} width={w} height={barH} fill="#f59e0b" />
            <text x={labelW + w + 5} y={y + barH * 0.7} fontSize="10" fill="#0f172a" fontWeight="bold">{formatValue(d.value)}</text>
            <text x={labelW + chartW + valueW - 5} y={y + barH * 0.7} textAnchor="end" fontSize="10" fill="#94a3b8">%{pct.toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Çoklu seri grup bar — aylık üretim/tüketim/mahsup */
export function MultiBarChart({
  data,
  series,
  height = 260,
  formatValue = (v) => `${(v / 1000).toFixed(0)}K`,
  title,
}: {
  data: { label: string }[];
  series: { key: string; label: string; color: string; values: number[] }[];
  height?: number;
  formatValue?: (v: number) => string;
  title?: string;
}) {
  const margin = { top: 30, right: 10, bottom: 30, left: 50 };
  const width = 700;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const allVals = series.flatMap((s) => s.values);
  const max = Math.max(...allVals, 1);
  const groupW = innerW / data.length;
  const barW = (groupW - 6) / series.length;

  // Y eksen çizgileri (5 grid)
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((p) => ({ y: margin.top + innerH - p * innerH, val: max * p }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 20 }}>
      {title && <text x={margin.left} y="14" fontSize="12" fontWeight="bold" fill="#0f172a">{title}</text>}
      {/* Y grid */}
      {gridYs.map((g, i) => (
        <g key={i}>
          <line x1={margin.left} y1={g.y} x2={margin.left + innerW} y2={g.y} stroke="#e2e8f0" strokeWidth="0.5" />
          <text x={margin.left - 5} y={g.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{formatValue(g.val)}</text>
        </g>
      ))}
      {/* Barlar */}
      {data.map((d, di) => (
        <g key={di}>
          {series.map((s, si) => {
            const v = s.values[di] || 0;
            const h = (v / max) * innerH;
            const x = margin.left + di * groupW + 3 + si * barW;
            const y = margin.top + innerH - h;
            return <rect key={si} x={x} y={y} width={barW - 1} height={h} fill={s.color} />;
          })}
          <text x={margin.left + di * groupW + groupW / 2} y={height - 12} textAnchor="middle" fontSize="9" fill="#475569">{d.label}</text>
        </g>
      ))}
      {/* Legend */}
      <g transform={`translate(${margin.left}, ${height - 4})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(${i * 120}, 0)`}>
            <rect x="0" y="-8" width="8" height="8" fill={s.color} />
            <text x="12" y="-1" fontSize="9" fill="#475569">{s.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Çizgi grafik — kümülatif FCF + payback gösterimi */
export function LineChartSvg({
  data,
  series,
  height = 260,
  formatValue = (v) => `${(v / 1e6).toFixed(0)}M`,
  title,
  paybackYearMarker,
}: {
  data: { label: string }[];
  series: { key: string; label: string; color: string; values: number[]; dashed?: boolean }[];
  height?: number;
  formatValue?: (v: number) => string;
  title?: string;
  paybackYearMarker?: number;
}) {
  const margin = { top: 30, right: 10, bottom: 30, left: 60 };
  const width = 700;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const allVals = series.flatMap((s) => s.values);
  const min = Math.min(...allVals, 0);
  const max = Math.max(...allVals, 0);
  const range = max - min || 1;
  const xStep = innerW / Math.max(1, data.length - 1);
  const yFor = (v: number) => margin.top + innerH - ((v - min) / range) * innerH;
  const zero = yFor(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 20 }}>
      {title && <text x={margin.left} y="14" fontSize="12" fontWeight="bold" fill="#0f172a">{title}</text>}
      {/* Sıfır çizgisi */}
      <line x1={margin.left} y1={zero} x2={margin.left + innerW} y2={zero} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2 2" />
      {/* Y eksen değerleri */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const v = min + range * p;
        const y = yFor(v);
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={margin.left + innerW} y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
            <text x={margin.left - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{formatValue(v)}</text>
          </g>
        );
      })}
      {/* Payback marker */}
      {paybackYearMarker !== undefined && paybackYearMarker > 0 && paybackYearMarker < data.length && (
        <g>
          <line x1={margin.left + paybackYearMarker * xStep} y1={margin.top} x2={margin.left + paybackYearMarker * xStep} y2={margin.top + innerH} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
          <text x={margin.left + paybackYearMarker * xStep + 4} y={margin.top + 10} fontSize="9" fill="#047857" fontWeight="bold">Payback: {paybackYearMarker.toFixed(1)}y</text>
        </g>
      )}
      {/* Seriler */}
      {series.map((s, si) => {
        const path = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${margin.left + i * xStep} ${yFor(v)}`).join(' ');
        return (
          <path
            key={si}
            d={path}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeDasharray={s.dashed ? '4 2' : undefined}
          />
        );
      })}
      {/* X ekseni etiketleri (her 5 yılda bir) */}
      {data.map((d, i) => {
        if (data.length > 12 && i % 5 !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={margin.left + i * xStep} y={height - 14} textAnchor="middle" fontSize="9" fill="#475569">{d.label}</text>
        );
      })}
      {/* Legend */}
      <g transform={`translate(${margin.left}, ${height - 2})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(${i * 160}, 0)`}>
            <line x1="0" y1="-3" x2="14" y2="-3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '3 2' : undefined} />
            <text x="18" y="-1" fontSize="9" fill="#475569">{s.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Stacked bar — yıllık mahsuplaşma dağılımı */
export function StackedBarChart({
  data,
  series,
  height = 240,
  formatValue = (v) => `${(v / 1000).toFixed(0)}K`,
  title,
}: {
  data: { label: string }[];
  series: { key: string; label: string; color: string; values: number[] }[];
  height?: number;
  formatValue?: (v: number) => string;
  title?: string;
}) {
  const margin = { top: 30, right: 10, bottom: 35, left: 50 };
  const width = 700;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const totals = data.map((_, di) => series.reduce((a, s) => a + (s.values[di] || 0), 0));
  const max = Math.max(...totals, 1);
  const groupW = innerW / data.length;
  const barW = groupW * 0.7;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 20 }}>
      {title && <text x={margin.left} y="14" fontSize="12" fontWeight="bold" fill="#0f172a">{title}</text>}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = margin.top + innerH - p * innerH;
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={margin.left + innerW} y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
            <text x={margin.left - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{formatValue(max * p)}</text>
          </g>
        );
      })}
      {data.map((d, di) => {
        let cumY = margin.top + innerH;
        return (
          <g key={di}>
            {series.map((s, si) => {
              const v = s.values[di] || 0;
              const h = (v / max) * innerH;
              const x = margin.left + di * groupW + (groupW - barW) / 2;
              cumY -= h;
              return <rect key={si} x={x} y={cumY} width={barW} height={h} fill={s.color} />;
            })}
            {di % Math.max(1, Math.floor(data.length / 12)) === 0 && (
              <text x={margin.left + di * groupW + groupW / 2} y={height - 18} textAnchor="middle" fontSize="9" fill="#475569">{d.label}</text>
            )}
          </g>
        );
      })}
      <g transform={`translate(${margin.left}, ${height - 4})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(${i * 110}, 0)`}>
            <rect x="0" y="-8" width="8" height="8" fill={s.color} />
            <text x="12" y="-1" fontSize="9" fill="#475569">{s.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Histogram — IRR dağılımı (Monte Carlo) */
export function Histogram({
  values,
  bins = 25,
  height = 200,
  title,
  markers,
}: {
  values: number[];
  bins?: number;
  height?: number;
  title?: string;
  markers?: { value: number; label: string; color: string }[];
}) {
  const filtered = values.filter(Number.isFinite);
  if (filtered.length === 0) return null;
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const w = (max - min) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  for (const v of filtered) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / w)));
    counts[idx]++;
  }
  const maxCount = Math.max(...counts);
  const margin = { top: 30, right: 10, bottom: 35, left: 40 };
  const width = 700;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const barW = innerW / bins;
  const xFor = (v: number) => margin.left + ((v - min) / (max - min)) * innerW;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 20 }}>
      {title && <text x={margin.left} y="14" fontSize="12" fontWeight="bold" fill="#0f172a">{title}</text>}
      {counts.map((c, i) => {
        const h = (c / maxCount) * innerH;
        return <rect key={i} x={margin.left + i * barW} y={margin.top + innerH - h} width={barW - 0.5} height={h} fill="#f59e0b" />;
      })}
      {markers?.map((m, i) => (
        <g key={i}>
          <line x1={xFor(m.value)} y1={margin.top} x2={xFor(m.value)} y2={margin.top + innerH} stroke={m.color} strokeWidth="1.5" strokeDasharray="4 2" />
          <text x={xFor(m.value) + 3} y={margin.top + 10 + i * 12} fontSize="9" fill={m.color} fontWeight="bold">{m.label}</text>
        </g>
      ))}
      {[min, (min + max) / 2, max].map((v, i) => (
        <text key={i} x={margin.left + ((v - min) / (max - min)) * innerW} y={height - 18} textAnchor="middle" fontSize="9" fill="#475569">{v.toFixed(0)}%</text>
      ))}
    </svg>
  );
}

/** Tornado diyagramı — sensitivity */
export function TornadoChart({
  items,
  height = 280,
  title,
}: {
  items: { variable: string; lowImpact: number; highImpact: number }[];
  height?: number;
  title?: string;
}) {
  const sorted = [...items].sort((a, b) => Math.abs(b.highImpact - b.lowImpact) - Math.abs(a.highImpact - a.lowImpact));
  const maxAbs = Math.max(...sorted.flatMap((i) => [Math.abs(i.lowImpact), Math.abs(i.highImpact)]), 1);
  const margin = { top: 30, right: 20, bottom: 30, left: 140 };
  const width = 700;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const barH = Math.min(20, innerH / sorted.length - 4);
  const center = margin.left + innerW / 2;
  const scale = (innerW / 2) / maxAbs;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 20 }}>
      {title && <text x={margin.left} y="14" fontSize="12" fontWeight="bold" fill="#0f172a">{title}</text>}
      <line x1={center} y1={margin.top} x2={center} y2={margin.top + innerH} stroke="#0f172a" strokeWidth="1" />
      {sorted.map((it, i) => {
        const y = margin.top + i * (barH + 4);
        const lowW = Math.abs(it.lowImpact) * scale;
        const highW = Math.abs(it.highImpact) * scale;
        return (
          <g key={i}>
            <text x={margin.left - 5} y={y + barH * 0.7} textAnchor="end" fontSize="10" fill="#475569">{it.variable}</text>
            <rect x={center - lowW} y={y} width={lowW} height={barH} fill="#ef4444" />
            <text x={center - lowW - 4} y={y + barH * 0.7} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="bold">{it.lowImpact >= 0 ? '+' : ''}{it.lowImpact.toFixed(1)}</text>
            <rect x={center} y={y} width={highW} height={barH} fill="#10b981" />
            <text x={center + highW + 4} y={y + barH * 0.7} fontSize="9" fill="#10b981" fontWeight="bold">{it.highImpact >= 0 ? '+' : ''}{it.highImpact.toFixed(1)}</text>
          </g>
        );
      })}
      <text x={center} y={height - 10} textAnchor="middle" fontSize="9" fill="#94a3b8">IRR puan etkisi (P10 ← → P90)</text>
    </svg>
  );
}
