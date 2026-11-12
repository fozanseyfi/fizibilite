'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { numLocale } from '@/lib/i18n';
import { createPortal } from 'react-dom';
import { HoverChart, type HoverCol } from '@/components/models/native/chart-hover';
import { usd as usdFmt } from '@/lib/models/fmt';

// ============================ TOOLTIP ============================
/** .tipq etiketi — üzerine gelince #mdl-tipbox açılır (HTML ile birebir). */
export function Tip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="tipq" tabIndex={0} data-tip={tip}>
      {children}
    </span>
  );
}

/** Uygulama genelinde tek yüzen tooltip kutusu + olay dinleyicileri. */
export function Tipbox() {
  useEffect(() => {
    const box = document.createElement('div');
    box.id = 'mdl-tipbox';
    document.body.appendChild(box);
    const show = (el: HTMLElement) => {
      box.textContent = el.dataset.tip || '';
      const w = Math.min(380, window.innerWidth - 24);
      box.style.width = w + 'px';
      box.style.display = 'block';
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(10, r.left), window.innerWidth - w - 10);
      box.style.left = x + 'px';
      box.style.top = '0px';
      const h = box.offsetHeight;
      let y = r.bottom + 9;
      if (y + h > window.innerHeight - 10) y = r.top - h - 9;
      if (y < 10) y = 10;
      box.style.top = y + 'px';
    };
    const hide = () => { box.style.display = 'none'; };
    const over = (e: Event) => { const t = (e.target as HTMLElement).closest('.tipq') as HTMLElement | null; if (t) show(t); };
    const out = (e: Event) => { if ((e.target as HTMLElement).closest('.tipq')) hide(); };
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    document.addEventListener('focusin', over);
    document.addEventListener('focusout', out);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
      document.removeEventListener('focusin', over);
      document.removeEventListener('focusout', out);
      window.removeEventListener('scroll', hide, true);
      box.remove();
    };
  }, []);
  return null;
}

// ============================ FORM CONTROLS ============================
export function NumF({ label, unit, tip, value, onChange, step = 1, min, max, disabled, thousands }: {
  label: string; unit?: string; tip?: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; disabled?: boolean;
  /** Tam sayı, binlik ayırıcıyla gösterilir (1.200.000) — yazarken de ayırıcı korunur */
  thousands?: boolean;
}) {
  return (
    <div className="field">
      <label>{tip ? <Tip tip={tip}>{label} </Tip> : <>{label} </>}{unit && <span className="unit">({unit})</span>}</label>
      {thousands
        ? <ThousandsInput value={value} onChange={onChange} step={step} min={min} max={max} disabled={disabled} />
        : <input type="number" step={step} min={min} max={max} disabled={disabled}
          value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(parseFloat(e.target.value))} />}
    </div>
  );
}

/** Binlik ayırıcılı tam sayı girişi. İmleç, yazılan rakamın yanında kalır; ↑/↓ adım kadar değiştirir. */
function ThousandsInput({ value, onChange, step = 1, min, max, disabled }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null); // imleçten SONRAKİ rakam sayısı (sağdan konum)
  const fmt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString(numLocale(), { maximumFractionDigits: 0 }) : '');
  const text = fmt(value);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current === null || document.activeElement !== el) return;
    // Sağdan aynı sayıda rakamın soluna imleci koy
    let digits = 0, pos = el.value.length;
    while (pos > 0 && digits < caret.current) { pos--; if (/\d/.test(el.value[pos])) digits++; }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  });
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  return (
    <input
      ref={ref} type="text" inputMode="numeric" className="num" disabled={disabled} value={text}
      onChange={(e) => {
        const el = e.target, raw = el.value;
        const after = raw.slice(el.selectionStart ?? raw.length).replace(/\D/g, '').length;
        const digits = raw.replace(/\D/g, '');
        caret.current = after;
        onChange(digits ? clamp(parseInt(digits, 10)) : NaN);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const base = Number.isFinite(value) ? value : 0;
        onChange(clamp(base + (e.key === 'ArrowUp' ? step : -step)));
      }}
    />
  );
}

export function TxtF({ label, unit, value, onChange, placeholder }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label} {unit && <span className="unit">{unit}</span>}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function SelF<T extends string>({ label, tip, value, options, onChange }: {
  label: string; tip?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <label>{tip ? <Tip tip={tip}>{label}</Tip> : label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function ChkF({ label, tip, checked, onChange }: { label: string; tip?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {tip ? <Tip tip={tip}>{label}</Tip> : label}
    </label>
  );
}

// ============================ MODAL ============================
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div id="mdl-modal" role="dialog" aria-modal>
      <div className="m-ov" onClick={onClose} />
      <div className="m-card">
        <div className="m-h"><h3>{title}</h3><button className="m-x" aria-label="Kapat" onClick={onClose}>✕</button></div>
        <div className="m-b">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ============================ PDF PRINT ============================
/** #mdl-report'u body'ye portal eder ve yazdırma tetiklendiğinde gösterir. */
export function PrintReport({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('mdl-printing');
    const after = () => { document.body.classList.remove('mdl-printing'); onClose(); window.removeEventListener('afterprint', after); };
    window.addEventListener('afterprint', after);
    const t = setTimeout(() => window.print(), 80);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', after); document.body.classList.remove('mdl-printing'); };
  }, [open, onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(<div id="mdl-report">{open ? children : null}</div>, document.body);
}

// ============================ CHART ============================
/** HTML'deki drawSeries ile birebir: kümülatif bar grafiği + geri ödeme işareti. */
export function SeriesChart({ points, color = '#18428F', payback = 'geri ödeme' }: { points: number[]; color?: string; payback?: string }) {
  const W = 900, H = 260, padL = 74, padR = 16, padT = 16, padB = 30;
  const n = points.length;
  const mn = Math.min(...points, 0), mx = Math.max(...points, 0);
  const x = (i: number) => padL + ((W - padL - padR) * i) / (n - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - mn) / ((mx - mn) || 1));
  const bw = Math.max(3, ((W - padL - padR) / n) * 0.55);
  const axl = (v: number) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M$' : (v / 1e3).toFixed(0) + 'k$');
  let payIdx = -1;
  for (let i = 1; i < n; i++) if (points[i - 1] < 0 && points[i] >= 0) { payIdx = i; break; }
  const step = (W - padL - padR) / Math.max(1, n - 1);
  const cols: HoverCol[] = points.map((v, i) => ({
    x0: x(i) - step / 2, x1: x(i) + step / 2,
    title: i === 0 ? '0. yıl (yatırım)' : `${i}. yıl`,
    rows: [
      ...(i > 0 ? [{ label: 'O yılın net nakdi', value: usdFmt(v - points[i - 1]) }] : []),
      { label: 'Kümülatif', value: usdFmt(v), strong: true },
    ],
  }));
  return (
    <HoverChart width={W} height={H} cols={cols} top={padT} bottom={padB}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {Array.from({ length: 5 }).map((_, g) => {
        const v = mn + ((mx - mn) * g) / 4;
        return (<g key={g}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="#E2E7EF" strokeWidth="1" />
          <text x={padL - 8} y={y(v) + 3} textAnchor="end">{axl(v)}</text>
        </g>);
      })}
      <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="#5A6478" strokeWidth="1.5" strokeDasharray="4 3" />
      {points.map((v, i) => (
        <g key={i}>
          <rect x={x(i) - bw / 2} y={v >= 0 ? y(v) : y(0)} width={bw} height={Math.max(Math.abs(y(v) - y(0)), 0.5)} fill={v >= 0 ? color : '#C9D3E4'} rx="1.5" />
          {(i % 5 === 0 || i === n - 1) && <text x={x(i)} y={H - 10} textAnchor="middle">{i}</text>}
        </g>
      ))}
      {payIdx >= 0 && (<g>
        <circle cx={x(payIdx)} cy={y(points[payIdx])} r="5" fill="#E8A020" stroke="#fff" strokeWidth="2" />
        <text x={x(payIdx)} y={y(points[payIdx]) - 10} textAnchor="middle" style={{ fontWeight: 600, fill: '#9A6A0E' }}>{payback}: {payIdx}. yıl</text>
      </g>)}
      <text x={padL} y={H - 10}>yıl →</text>
    </svg>
    </HoverChart>
  );
}
