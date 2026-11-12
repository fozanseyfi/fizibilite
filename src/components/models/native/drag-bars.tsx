'use client';

import { useMemo, useRef, useState } from 'react';
import { nf } from '@/lib/models/fmt';

/**
 * Sürüklenebilir yüzde çubukları (C&I tüketim dağılımları: ay / gün / saat).
 *
 * Etkileşim (istemsiz değişikliği önlemek için):
 * - Tıklamak yalnızca SEÇER (çubuk turuncu olur), değeri değiştirmez.
 * - Basılı tutup yukarı/aşağı sürüklemek değeri değiştirir; değişim tutulan yerden GÖRELİDİR
 *   (çubuk imlecin olduğu yere zıplamaz). ~4 px'lik hareket eşiğinin altı tıklama sayılır.
 * - Sürükleme boyunca dikey ölçek sabit → grafik zıplamaz.
 * - Seçili çubuk: ortadaki −− − + ++ düğmeleri; klavyede ↑/↓ (Shift: 10×), ←/→ çubuk değiştirir.
 * - Son çubuk otomatik kalandır (100 − diğerleri): değiştirilemez, taralı görünür.
 * - Etiketler: showPct / showAbs ile çubuk üstünde % ve mutlak değer (ör. kWh).
 */
export interface DragBarsProps {
  values: number[];
  labels: string[];
  onSet?: (i: number, v: number) => void;
  color?: (i: number) => string;
  labelEvery?: number;
  step?: number;
  readOnly?: boolean;
  remainderLast?: boolean;
  fmt?: (v: number) => string;
  /** Mutlak karşılık (ör. kWh) — seçili satırda ve showAbs etiketlerinde */
  abs?: (i: number, v: number) => string;
  fullLabel?: (i: number) => string;
  showPct?: boolean;
  showAbs?: boolean;
  /** Çubuk tepelerini birleştiren çizgi */
  showLine?: boolean;
  height?: number;
  ariaLabel?: string;
}

const niceCeil = (x: number) => {
  if (x <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const m = x / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};
const SEL_COL = '#E07B3C';

export function DragBars({
  values, labels, onSet, color, labelEvery = 1, step = 0.1, readOnly = false, remainderLast,
  fmt = (v) => `%${nf(v, 1)}`, abs, fullLabel, showPct = false, showAbs = false, showLine = false, height = 230, ariaLabel,
}: DragBarsProps) {
  const n = values.length;
  const rem = remainderLast ?? !readOnly;
  const svgRef = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Basılı tutma: başlangıç Y'si ve değeri; moved = eşik aşıldı mı
  const press = useRef<{ i: number; y0: number; v0: number; max: number; moved: boolean } | null>(null);
  const [dragI, setDragI] = useState<number | null>(null);
  const [frozenMax, setFrozenMax] = useState<number | null>(null);

  const labelsOn = showPct || showAbs;
  // Sık çubuklarda ya da kWh etiketi varken (geniş metin) etiketler dikey yazılır
  const dense = n > 14 || (showAbs && n > 8);
  const extraTop = labelsOn ? (dense ? (showPct && showAbs ? 78 : showAbs ? 48 : 30) : showPct && showAbs ? 24 : 13) : 0;
  const W = 600, H = height + extraTop;
  const pl = 38, pr = 6, pt = 16 + extraTop, pb = 22;
  const plotH = H - pt - pb, colW = (W - pl - pr) / n, bw = Math.max(2, colW * 0.68);
  const autoMax = useMemo(() => niceCeil(Math.max(...values, 0.0001) * 1.15), [values]);
  const max = frozenMax ?? autoMax;
  const y = (v: number) => pt + plotH * (1 - Math.min(v, max) / max);
  const x = (i: number) => pl + colW * i + (colW - bw) / 2;
  const editable = (i: number) => !readOnly && !!onSet && !(rem && i === n - 1);
  const snap = (v: number) => Math.max(0, Math.round(v / step) * step);

  const onDown = (i: number) => (e: React.PointerEvent) => {
    setSel(i);
    if (!editable(i)) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    press.current = { i, y0: e.clientY, v0: values[i], max, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const dy = e.clientY - p.y0;
    if (!p.moved) {
      if (Math.abs(dy) < 4) return; // tıklama toleransı
      p.moved = true; setDragI(p.i); setFrozenMax(p.max);
    }
    const r = svgRef.current!.getBoundingClientRect();
    const pxPerUnit = (r.height * (plotH / H)) / p.max;
    onSet!(p.i, Math.min(p.max, snap(p.v0 - dy / pxPerUnit)));
  };
  const onUp = () => { press.current = null; setDragI(null); setFrozenMax(null); };

  const bump = (d: number) => {
    if (sel === null || !editable(sel)) return;
    onSet!(sel, snap(values[sel] + d));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (sel === null) { if (/Arrow/.test(e.key)) { setSel(0); e.preventDefault(); } return; }
    const k = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowUp') { bump(step * k); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { bump(-step * k); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { setSel(Math.min(n - 1, sel + 1)); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { setSel(Math.max(0, sel - 1)); e.preventDefault(); }
  };

  const tipI = dragI ?? hover;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const axFmt = (g: number) => nf(g, Number.isInteger(Math.round(g * 1000) / 1000) ? 0 : 1);
  const absTxt = (i: number) => (abs ? abs(i, values[i]) : '');

  return (
    <div className="dbars">
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label={ariaLabel}
        tabIndex={readOnly ? -1 : 0} onKeyDown={readOnly ? undefined : onKey}
        onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ touchAction: readOnly ? 'auto' : 'none', userSelect: 'none' }}
        className={dragI !== null ? 'dragging' : undefined}
      >
        {grid.map((g, k) => (
          <g key={k}>
            <line x1={pl} x2={W - pr} y1={y(g)} y2={y(g)} className="db-grid" />
            <text x={pl - 5} y={y(g) + 3.5} textAnchor="end" className="db-ax">{axFmt(g)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const remBar = rem && i === n - 1;
          const top = y(v), h = pt + plotH - top;
          const on = i === sel;
          const cx = x(i) + bw / 2;
          // Etiketler: % (lacivert) ve mutlak değer (yeşil, birimi küçük punto)
          const absRaw = showAbs ? absTxt(i) : '';
          const absUnit = absRaw.match(/\s?([^\d\s.,−-]+)$/)?.[1] ?? '';
          const absNum = absUnit ? absRaw.slice(0, absRaw.length - absUnit.length).trim() : absRaw;
          const pctEl = showPct ? <tspan className="db-pct">{fmt(v)}</tspan> : null;
          const absEl = showAbs ? <tspan className="db-abs">{absNum}{absUnit && <tspan className="db-unit">{' ' + absUnit}</tspan>}</tspan> : null;
          const nLab = (showPct ? 1 : 0) + (showAbs ? 1 : 0);
          return (
            <g key={i}>
              <rect
                x={x(i)} y={top} width={bw} height={Math.max(h, 0.5)} rx={1.5}
                fill={remBar ? 'url(#dbHatch)' : on ? SEL_COL : color ? color(i) : '#4A86C8'}
                className={`db-bar${on ? ' on' : ''}${remBar ? ' rem' : ''}`}
              />
              {nLab > 0 && (dense
                ? <text x={cx + 3} y={top - 4} transform={`rotate(-90 ${cx + 3} ${top - 4})`} className="db-val">{pctEl}{pctEl && absEl ? <tspan className="db-sep"> · </tspan> : null}{absEl}</text>
                : <>
                  {pctEl && <text x={cx} y={top - 4 - (absEl ? 11 : 0)} textAnchor="middle" className="db-val">{pctEl}</text>}
                  {absEl && <text x={cx} y={top - 4} textAnchor="middle" className="db-val">{absEl}</text>}
                </>)}
              {/* Sütunun tamamı seçme/tutma alanı */}
              <rect
                x={pl + colW * i} y={pt - 8 - extraTop} width={colW} height={plotH + 8 + extraTop}
                fill="transparent" style={{ cursor: editable(i) ? 'ns-resize' : 'pointer' }}
                onPointerDown={onDown(i)}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover((h2) => (h2 === i ? null : h2))}
              />
              {(i % labelEvery === 0 || i === n - 1) && (
                <text x={cx} y={H - 7} textAnchor="middle" className="db-ax">{labels[i]}</text>
              )}
            </g>
          );
        })}
        {showLine && (
          <g className="db-line" pointerEvents="none">
            <polyline points={values.map((v, i) => `${x(i) + bw / 2},${y(v)}`).join(' ')} />
            {values.map((v, i) => <circle key={i} cx={x(i) + bw / 2} cy={y(v)} r={n > 14 ? 1.8 : 2.6} />)}
          </g>
        )}
        {!labelsOn && tipI !== null && values[tipI] !== undefined && (() => {
          const tx = Math.min(Math.max(x(tipI) + bw / 2, pl + 34), W - 40);
          const ty = Math.max(y(values[tipI]) - 8, pt + 2);
          return <text x={tx} y={ty} textAnchor="middle" className="db-tip">{fmt(values[tipI])}</text>;
        })()}
        <defs>
          <pattern id="dbHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="#c9d3e0" /><line x1="0" y1="0" x2="0" y2="5" stroke="#9fb0c8" strokeWidth="2" />
          </pattern>
        </defs>
      </svg>
      {!readOnly && (
        <div className="db-ctrl">
          {sel === null ? (
            <span className="db-hint">Çubuğa tıklayıp seçin; basılı tutup yukarı/aşağı sürükleyerek ya da −/+ ile değiştirin. Son çubuk otomatik kalandır.</span>
          ) : (
            <>
              <span className="db-sel">{fullLabel ? fullLabel(sel) : labels[sel]}: <b>{fmt(values[sel])}</b>{abs ? <span className="db-extra"> · {absTxt(sel)}</span> : null}</span>
              {editable(sel) ? (
                <span className="db-btns">
                  <button type="button" onClick={() => bump(-step * 10)} title={`−${nf(step * 10, 1)}`}>−−</button>
                  <button type="button" onClick={() => bump(-step)} title={`−${nf(step, 1)}`}>−</button>
                  <button type="button" onClick={() => bump(step)} title={`+${nf(step, 1)}`}>+</button>
                  <button type="button" onClick={() => bump(step * 10)} title={`+${nf(step * 10, 1)}`}>++</button>
                </span>
              ) : <span className="db-hint">otomatik kalan (100 − diğerleri)</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
