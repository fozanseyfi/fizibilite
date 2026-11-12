'use client';

import { useMemo, useRef, useState } from 'react';
import { nf } from '@/lib/models/fmt';

/**
 * Sürüklenebilir yüzde çubukları (C&I tüketim dağılımları: ay / gün / saat).
 *
 * - Yalnızca tutulan çubuk değişir (sütunun herhangi bir yerinden tutulabilir); diğerleri yerinde kalır.
 * - Sürükleme boyunca dikey ölçek sabit tutulur → grafik zıplamaz. Ölçek "yuvarlak" adımlarla büyür.
 * - Son çubuk otomatik kalandır (100 − diğerleri): sürüklenemez, taranmış görünür.
 * - Seçili çubuk: −/+ düğmeleri, klavyede ↑/↓ (Shift ile 10×), ←/→ ile çubuk değiştir.
 * - readOnly: yalnız gösterim (ör. aylık MWh).
 */
export interface DragBarsProps {
  values: number[];
  labels: string[];
  /** i. değeri v yap (üst bileşen kalan hesabını yapar) */
  onSet?: (i: number, v: number) => void;
  /** Çubuk rengi */
  color?: (i: number) => string;
  /** Etiket gösterim sıklığı (her n'de bir) */
  labelEvery?: number;
  step?: number;
  readOnly?: boolean;
  /** Son çubuk kalan mı (varsayılan: düzenlenebilirse evet) */
  remainderLast?: boolean;
  /** Değer biçimi (ipucu ve seçili satır) */
  fmt?: (v: number) => string;
  /** İpucunda ek bilgi (ör. kWh karşılığı) */
  extra?: (i: number, v: number) => string;
  /** Seçili satırdaki başlık (ör. "Ocak") */
  fullLabel?: (i: number) => string;
  height?: number;
  ariaLabel?: string;
}

const niceCeil = (x: number) => {
  if (x <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const m = x / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

export function DragBars({
  values, labels, onSet, color, labelEvery = 1, step = 0.1, readOnly = false, remainderLast,
  fmt = (v) => `%${nf(v, 1)}`, extra, fullLabel, height = 230, ariaLabel,
}: DragBarsProps) {
  const n = values.length;
  const rem = remainderLast ?? !readOnly;
  const svgRef = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ i: number; max: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 600, H = height, pl = 38, pr = 6, pt = 16, pb = 22;
  const plotH = H - pt - pb, colW = (W - pl - pr) / n, bw = Math.max(2, colW * 0.68);
  const autoMax = useMemo(() => niceCeil(Math.max(...values, 0.0001) * 1.15), [values]);
  // Sürüklerken ölçek sabit (grafik zıplamaz); bırakınca gerekirse büyür
  const max = drag ? drag.max : autoMax;
  const y = (v: number) => pt + plotH * (1 - Math.min(v, max) / max);
  const x = (i: number) => pl + colW * i + (colW - bw) / 2;
  const editable = (i: number) => !readOnly && !!onSet && !(rem && i === n - 1);

  const valueAt = (clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const vy = ((clientY - r.top) / r.height) * H;
    const v = ((pt + plotH - vy) / plotH) * (drag?.max ?? max);
    return Math.min(drag?.max ?? max, Math.max(0, Math.round(v / step) * step));
  };

  const onDown = (i: number) => (e: React.PointerEvent) => {
    setSel(i);
    if (!editable(i)) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ i, max });
    onSet!(i, valueAt(e.clientY));
  };
  const onMove = (e: React.PointerEvent) => { if (drag) onSet!(drag.i, valueAt(e.clientY)); };
  const onUp = () => setDrag(null);

  const bump = (d: number) => {
    if (sel === null || !editable(sel)) return;
    onSet!(sel, Math.max(0, Math.round((values[sel] + d) / step) * step));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (sel === null) { if (/Arrow/.test(e.key)) { setSel(0); e.preventDefault(); } return; }
    const k = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowUp') { bump(step * k); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { bump(-step * k); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { setSel(Math.min(n - 1, sel + 1)); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { setSel(Math.max(0, sel - 1)); e.preventDefault(); }
  };

  const tipI = drag?.i ?? hover ?? sel;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <div className="dbars">
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label={ariaLabel}
        tabIndex={readOnly ? -1 : 0} onKeyDown={readOnly ? undefined : onKey}
        onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ touchAction: readOnly ? 'auto' : 'none', userSelect: 'none' }}
        className={drag ? 'dragging' : undefined}
      >
        {grid.map((g, k) => (
          <g key={k}>
            <line x1={pl} x2={W - pr} y1={y(g)} y2={y(g)} className="db-grid" />
            <text x={pl - 5} y={y(g) + 3.5} textAnchor="end" className="db-ax">{nf(g, Number.isInteger(Math.round(g * 1000) / 1000) ? 0 : 1)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const remBar = rem && i === n - 1;
          const top = y(v), h = pt + plotH - top;
          const on = i === sel || i === drag?.i;
          return (
            <g key={i}>
              <rect
                x={x(i)} y={top} width={bw} height={Math.max(h, 0.5)} rx={1.5}
                fill={remBar ? 'url(#dbHatch)' : color ? color(i) : '#4A86C8'}
                className={`db-bar${on ? ' on' : ''}${remBar ? ' rem' : ''}`}
              />
              {editable(i) && <rect x={x(i)} y={top - 3} width={bw} height={4} rx={1} className="db-handle" />}
              {/* Sütunun tamamı tutma alanı */}
              <rect
                x={pl + colW * i} y={pt - 8} width={colW} height={plotH + 8}
                fill="transparent" style={{ cursor: editable(i) ? 'ns-resize' : 'pointer' }}
                onPointerDown={onDown(i)}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover((h2) => (h2 === i ? null : h2))}
              />
              {(i % labelEvery === 0 || i === n - 1) && (
                <text x={x(i) + bw / 2} y={H - 7} textAnchor="middle" className="db-ax">{labels[i]}</text>
              )}
            </g>
          );
        })}
        {tipI !== null && tipI !== undefined && values[tipI] !== undefined && (() => {
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
            <span className="db-hint">Bir çubuğu tutup yukarı/aşağı sürükleyin ya da seçip −/+ kullanın. Son çubuk otomatik kalandır.</span>
          ) : (
            <>
              <span className="db-sel">{fullLabel ? fullLabel(sel) : labels[sel]}: <b>{fmt(values[sel])}</b>{extra ? <span className="db-extra"> · {extra(sel, values[sel])}</span> : null}</span>
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
