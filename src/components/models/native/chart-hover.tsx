'use client';

import { useRef, useState } from 'react';

/** Grafikte bir dikey dilim (ör. bir saat, bir yıl, bir kapasite) ve üzerine gelince gösterilecek değerler */
export interface HoverCol {
  /** viewBox koordinatında dilimin sol / sağ kenarı */
  x0: number;
  x1: number;
  title: string;
  rows: { label: string; value: string; color?: string; strong?: boolean }[];
}

/**
 * SVG grafiğin üzerine şeffaf bir katman koyar; fare (veya parmak) hangi dilimdeyse
 * onu vurgular ve değerlerini küçük bir kutuda gösterir. Grafiğin çizimine dokunmaz.
 */
export function HoverChart({
  width, height, cols, svgHtml, children, top = 0, bottom = 0,
}: {
  /** SVG viewBox genişliği / yüksekliği */
  width: number;
  height: number;
  cols: HoverCol[];
  /** Hazır SVG metni (raporla ortak çizimler için) ya da children */
  svgHtml?: string;
  children?: React.ReactNode;
  /** Vurgu bandının üst / alt boşluğu (viewBox birimi) */
  top?: number;
  bottom?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState<number | null>(null);

  const move = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * width;
    const k = cols.findIndex((c) => vx >= c.x0 && vx < c.x1);
    setIdx(k >= 0 ? k : null);
  };

  const c = idx !== null ? cols[idx] : null;
  const pctX = (v: number) => `${(v / width) * 100}%`;
  const mid = c ? (c.x0 + c.x1) / 2 : 0;
  const flip = mid > width * 0.6;

  return (
    <div
      ref={ref}
      className="hc"
      onPointerMove={(e) => move(e.clientX)}
      onPointerDown={(e) => move(e.clientX)}
      onPointerLeave={() => setIdx(null)}
    >
      {svgHtml !== undefined ? <div className="hc-svg" dangerouslySetInnerHTML={{ __html: svgHtml }} /> : <div className="hc-svg">{children}</div>}
      {c && (
        <>
          <div
            className="hc-band"
            style={{ left: pctX(c.x0), width: pctX(c.x1 - c.x0), top: `${(top / height) * 100}%`, bottom: `${(bottom / height) * 100}%` }}
          />
          <div className="hc-tip" style={flip ? { right: `calc(${pctX(width - c.x0)} + 8px)` } : { left: `calc(${pctX(c.x1)} + 8px)` }}>
            <div className="hc-t">{c.title}</div>
            {c.rows.map((r) => (
              <div key={r.label} className={`hc-r ${r.strong ? 'strong' : ''}`}>
                <span>
                  {r.color && <i style={{ background: r.color }} />}
                  {r.label}
                </span>
                <b>{r.value}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
