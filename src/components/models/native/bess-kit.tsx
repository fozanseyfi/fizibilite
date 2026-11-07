'use client';

import type { DayTrace } from '@/lib/models/bess/common';
import { nf } from '@/lib/models/fmt';

/**
 * Tipik gün grafiği — SVG metni olarak üretilir; ekranda ve PDF raporunda aynı çizim kullanılır.
 * Üstte: GES üretimi (açık) + bataryadan deşarj (lacivert); çizgi: tüketim (C&I) veya veriş sınırı (utility).
 * Altta (eksen altı): bataryaya şarj — güneşten (yeşil), şebekeden / arbitrajdan (turuncu).
 */
export function daySvg(t: DayTrace, opts: { unit: string; lineLabel: string; chargeLabel2: string }): string {
  const W = 760, H = 260, padL = 52, padR = 12, padT = 14, padB = 30;
  const up = Math.max(1e-9, ...t.prod.map((v, h) => Math.max(v, t.cons[h], t.dis[h])));
  const down = Math.max(1e-9, ...t.chSolar.map((v, h) => v + t.chGrid[h]));
  const total = up + down;
  const plotH = H - padT - padB;
  const zeroY = padT + (plotH * up) / total;
  const yUp = (v: number) => zeroY - (plotH * v) / total;
  const yDn = (v: number) => zeroY + (plotH * v) / total;
  const bw = (W - padL - padR) / 24;
  const x = (h: number) => padL + h * bw;
  const parts: string[] = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tipik gün">`);
  // ızgara
  [0.5, 1].forEach((f) => {
    const v = up * f;
    parts.push(`<line x1="${padL}" x2="${W - padR}" y1="${yUp(v)}" y2="${yUp(v)}" stroke="#E2E7EF"/>`);
    parts.push(`<text x="${padL - 6}" y="${yUp(v) + 3}" text-anchor="end">${nf(v, v < 10 ? 1 : 0)}</text>`);
  });
  parts.push(`<line x1="${padL}" x2="${W - padR}" y1="${zeroY}" y2="${zeroY}" stroke="#5A6478" stroke-width="1"/>`);
  parts.push(`<text x="${padL - 6}" y="${zeroY + 3}" text-anchor="end">0</text>`);
  for (let h = 0; h < 24; h++) {
    const px = x(h) + bw * 0.12, w = bw * 0.76;
    if (t.prod[h] > 0) parts.push(`<rect x="${px}" y="${yUp(t.prod[h])}" width="${w}" height="${zeroY - yUp(t.prod[h])}" fill="#F4C76B" opacity="0.55" rx="1.5"/>`);
    if (t.dis[h] > 0) parts.push(`<rect x="${px + w * 0.2}" y="${yUp(t.dis[h])}" width="${w * 0.6}" height="${zeroY - yUp(t.dis[h])}" fill="#1E3A6E" rx="1.5"/>`);
    if (t.chSolar[h] > 0) parts.push(`<rect x="${px}" y="${zeroY}" width="${w}" height="${yDn(t.chSolar[h]) - zeroY}" fill="#3D8B5F" rx="1.5"/>`);
    if (t.chGrid[h] > 0) parts.push(`<rect x="${px}" y="${yDn(t.chSolar[h])}" width="${w}" height="${yDn(t.chGrid[h]) - zeroY}" fill="#D9822B" rx="1.5"/>`);
    if (h % 3 === 0) parts.push(`<text x="${x(h) + bw / 2}" y="${H - 10}" text-anchor="middle">${String(h).padStart(2, '0')}</text>`);
  }
  const line = t.cons.map((v, h) => `${h === 0 ? 'M' : 'L'}${x(h) + bw / 2},${yUp(v)}`).join(' ');
  parts.push(`<path d="${line}" fill="none" stroke="#C0392B" stroke-width="2" stroke-dasharray="${opts.lineLabel.startsWith('Veriş') ? '5 4' : '0'}"/>`);
  parts.push(`<text x="${padL}" y="${padT - 3}" font-size="10">${opts.unit}</text>`);
  parts.push('</svg>');
  return parts.join('');
}

export function DayLegend({ lineLabel, chargeLabel2 }: { lineLabel: string; chargeLabel2: string }) {
  const item = (color: string, label: string, line = false) => (
    <span className="inline-flex items-center gap-1.5">
      <i style={{ display: 'inline-block', width: line ? 14 : 10, height: line ? 2 : 10, background: color, borderRadius: 2 }} />
      {label}
    </span>
  );
  return (
    <div className="bess-legend">
      {item('#F4C76B', 'GES üretimi')}
      {item('#1E3A6E', 'Bataryadan deşarj')}
      {item('#3D8B5F', 'Şarj (güneş fazlası / kırpılan)')}
      {item('#D9822B', chargeLabel2)}
      {item('#C0392B', lineLabel, true)}
    </div>
  );
}

/** "Bataryayı nasıl kullanacaksınız?" seçim kartı */
export function UseCard({
  checked, onChange, title, how, when, note, disabled,
}: {
  checked: boolean; onChange: (v: boolean) => void; title: string; how: string; when: string; note?: string; disabled?: boolean;
}) {
  return (
    <label className={`usecard ${checked ? 'on' : ''} ${disabled ? 'off' : ''}`}>
      <span className="uc-head">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <b>{title}</b>
      </span>
      <span className="uc-how">{how}</span>
      <span className="uc-when"><em>Ne zaman anlamlı:</em> {when}</span>
      {note && <span className="uc-note">{note}</span>}
    </label>
  );
}

/** Kazanç kırılımı — çubuklu tablo */
export function BreakdownTable({ rows, unit }: { rows: { label: string; value: number; hint?: string }[]; unit: (v: number) => string }) {
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="tablewrap">
      <table className="bess-break">
        <thead><tr><th>Kullanım şekli</th><th>1. yıl kazanç</th><th style={{ width: '40%' }} /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}{r.hint && <div className="bb-hint">{r.hint}</div>}</td>
              <td className={r.value < 0 ? 'neg' : ''}>{unit(r.value)}</td>
              <td><span className={`bb-bar ${r.value < 0 ? 'neg' : ''}`} style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} /></td>
            </tr>
          ))}
          <tr className="total"><td>Toplam</td><td className={total < 0 ? 'neg' : ''}>{unit(total)}</td><td /></tr>
        </tbody>
      </table>
    </div>
  );
}
