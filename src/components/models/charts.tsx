'use client';

import { nf } from '@/lib/models/fmt';

// ============================ KPI ============================
export function Kpi({
  label, value, hint, tone = 'neutral',
}: {
  label: string; value: string; hint?: string;
  tone?: 'neutral' | 'good' | 'bad' | 'navy';
}) {
  const color =
    tone === 'good' ? 'text-eco-dark' : tone === 'bad' ? 'text-destructive' :
    tone === 'navy' ? 'text-primary' : 'text-foreground';
  return (
    <div className="border border-border rounded-lg bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono">{label}</div>
      <div className={`mt-1.5 text-xl font-mono font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>;
}

// ============================ CUMULATIVE BAR CHART ============================
/** Kümülatif (iskontolu) nakit akışı grafiği — sıfırı geçtiği yıl geri ödemedir. */
export function CumulativeChart({
  points, color = '#18428F', unit = '$', paybackLabel = 'geri ödeme',
}: {
  points: number[]; color?: string; unit?: '$' | '₺'; paybackLabel?: string;
}) {
  const W = 900, H = 260, padL = 74, padR = 16, padT = 16, padB = 30;
  const n = points.length;
  const mn = Math.min(...points, 0), mx = Math.max(...points, 0);
  const x = (i: number) => padL + ((W - padL - padR) * i) / (n - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - mn) / ((mx - mn) || 1));
  const bw = Math.max(3, ((W - padL - padR) / n) * 0.55);
  const axisLabel = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M${unit}` : `${(v / 1e3).toFixed(0)}k${unit}`);

  let payIdx = -1;
  for (let i = 1; i < n; i++) if (points[i - 1] < 0 && points[i] >= 0) { payIdx = i; break; }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Kümülatif nakit akışı" className="text-muted-foreground">
      {Array.from({ length: 5 }).map((_, g) => {
        const v = mn + ((mx - mn) * g) / 4;
        return (
          <g key={g}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="currentColor" strokeOpacity="0.15" />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor" fontFamily="monospace">{axisLabel(v)}</text>
          </g>
        );
      })}
      <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="currentColor" strokeOpacity="0.5" strokeDasharray="4 3" />
      {points.map((v, i) => (
        <g key={i}>
          <rect x={x(i) - bw / 2} y={v >= 0 ? y(v) : y(0)} width={bw} height={Math.max(Math.abs(y(v) - y(0)), 0.5)} fill={v >= 0 ? color : '#C9D3E4'} rx="1.5" />
          {(i % 5 === 0 || i === n - 1) && (
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="monospace">{i}</text>
          )}
        </g>
      ))}
      {payIdx >= 0 && (
        <g>
          <circle cx={x(payIdx)} cy={y(points[payIdx])} r="5" fill="#E8A020" stroke="#fff" strokeWidth="2" />
          <text x={x(payIdx)} y={y(points[payIdx]) - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill="#9A6A0E" fontFamily="monospace">{paybackLabel}: {payIdx}. yıl</text>
        </g>
      )}
      <text x={padL} y={H - 10} fontSize="10" fill="currentColor" fontFamily="monospace">yıl →</text>
    </svg>
  );
}

// ============================ STACKED MONTHLY BARS ============================
export interface StackSeries { label: string; color: string; data: number[]; }

/** Aylık yığılmış bar grafiği (12 ay). */
export function MonthlyStacked({ months, stacks, side }: {
  months: string[]; stacks: StackSeries[]; side?: StackSeries;
}) {
  const W = 900, H = 250, padL = 56, padR = 12, padT = 14, padB = 26;
  const n = months.length;
  const stackTotals = months.map((_, i) => stacks.reduce((s, st) => s + (st.data[i] || 0), 0));
  const sideMax = side ? Math.max(...side.data) : 0;
  const mx = Math.max(...stackTotals, sideMax, 1e-9);
  const x = (i: number) => padL + ((W - padL - padR) * (i + 0.5)) / n;
  const bw = ((W - padL - padR) / n) * 0.22;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / mx);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Aylık dağılım" className="text-muted-foreground">
      {Array.from({ length: 5 }).map((_, g) => {
        const v = (mx * g) / 4;
        return (
          <g key={g}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="currentColor" strokeOpacity="0.15" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor" fontFamily="monospace">{nf(v, 0)}</text>
          </g>
        );
      })}
      {months.map((mLabel, i) => {
        let base = 0;
        return (
          <g key={i}>
            {stacks.map((st, si) => {
              const v = st.data[i] || 0;
              const rect = <rect key={si} x={x(i) - bw * 1.1} y={y(base + v)} width={bw} height={Math.max(y(base) - y(base + v), 0)} fill={st.color} />;
              base += v;
              return rect;
            })}
            {side && (
              <rect x={x(i) + bw * 0.2} y={y(side.data[i] || 0)} width={bw} height={Math.max(H - padB - y(side.data[i] || 0), 0)} fill={side.color} />
            )}
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="monospace">{mLabel}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <i className="inline-block w-3 h-3 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
